import { NextRequest, NextResponse } from "next/server";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";
import type { ScreenshotStore } from "@livedev/screenshots";

export function createIssuesRoute(opts: {
  getUser: (req: NextRequest) => Promise<{ id: string } | null>;
  store?: ScreenshotStore;
  buildViewerUrl?: (id: string) => string;
  maxBytes?: number;
}): { POST: (req: NextRequest) => Promise<NextResponse> } {
  const maxBytes = opts.maxBytes ?? 10_485_760;
  const buildViewerUrl =
    opts.buildViewerUrl ??
    ((id: string) =>
      `${process.env.LIVEDEV_APP_ORIGIN ?? ""}/api/livedev/screenshots/${id}`);

  return {
    async POST(req) {
      const user = await opts.getUser(req);
      if (!user) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }

      const issuesUrl = process.env.LIVEDEV_ISSUES_URL;
      const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
      if (!issuesUrl || !serviceToken) {
        return NextResponse.json({ error: "host_misconfigured" }, { status: 500 });
      }

      const contentType = req.headers.get("content-type") ?? "";
      let meta: { title?: string; body?: string; source?: string };
      let screenshot: File | null = null;

      if (contentType.startsWith("multipart/form-data")) {
        const form = await req.formData();
        meta = JSON.parse(form.get("meta") as string);
        screenshot = form.get("screenshot") as File | null;
      } else {
        try {
          meta = (await req.json()) as { title?: string; body?: string; source?: string };
        } catch {
          return NextResponse.json({ error: "invalid_json" }, { status: 400 });
        }
      }

      if (screenshot && screenshot.size > maxBytes) {
        return NextResponse.json({ error: "screenshot_too_large" }, { status: 413 });
      }

      if (screenshot && opts.store) {
        const bytes = new Uint8Array(await screenshot.arrayBuffer());
        const { id } = await opts.store.put(bytes, { ownerId: user.id, createdAt: Date.now() });
        meta.body = (meta.body ?? "") + "\n\n[View screenshot](" + buildViewerUrl(id) + ")";
      }

      const upstream = await fetch(issuesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceToken}`,
          "X-Livedev-User": user.id,
        },
        body: JSON.stringify({ title: meta.title, body: meta.body, source: meta.source }),
      });

      const text = await upstream.text();
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
      });
    },
  };
}

export function createScreenshotsViewerRoute(opts: {
  getUser: (req: NextRequest) => Promise<{ id: string } | null>;
  store: ScreenshotStore;
  loadWhitelist?: () => { allowedUsers: string[] };
}): { GET: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response> } {
  const wlLoader = opts.loadWhitelist ?? loadWhitelist;

  return {
    async GET(req, { params }) {
      const user = await opts.getUser(req);
      if (!user) {
        return new NextResponse(null, { status: 401 });
      }

      const wl = wlLoader();
      if (!isAllowed(user.id, wl)) {
        return new NextResponse(null, { status: 403 });
      }

      const { id } = await params;
      const blob = await opts.store.get(id);
      if (!blob) {
        return new NextResponse(null, { status: 404 });
      }

      return new Response(blob.bytes.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, no-store",
          "Content-Length": String(blob.bytes.byteLength),
        },
      });
    },
  };
}

export function createPRsRoute(opts: {
  getUser: (req: NextRequest) => Promise<{ id: string } | null>;
}): { GET: (req: NextRequest) => Promise<NextResponse> } {
  return {
    async GET(req) {
      const user = await opts.getUser(req);
      if (!user) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }

      const prsUrl = process.env.LIVEDEV_PRS_URL;
      const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
      if (!prsUrl || !serviceToken) {
        return NextResponse.json({ error: "host_misconfigured" }, { status: 500 });
      }

      const upstream = await fetch(prsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${serviceToken}`,
          "X-Livedev-User": user.id,
        },
        cache: "no-store",
      });

      const text = await upstream.text();
      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        },
      });
    },
  };
}

export function createDiagnosticRoute(opts: {
  getUser: (req: NextRequest) => Promise<{ id: string } | null>;
  loadWhitelist?: () => { allowedUsers: string[] };
  issuesUrl?: string;
  serviceToken?: string;
  storeKind?: "s3" | "db" | "fs" | "unknown";
}): { GET: (req: NextRequest) => Promise<NextResponse> } {
  const wlLoader = opts.loadWhitelist ?? loadWhitelist;

  return {
    async GET(req) {
      const user = await opts.getUser(req);
      if (!user) {
        return NextResponse.json({ session: { ok: false, reason: "no_session" } }, { status: 401 });
      }

      const wl = wlLoader();
      if (!isAllowed(user.id, wl)) {
        return NextResponse.json(
          { session: { ok: false, reason: "not_whitelisted" } },
          { status: 403 },
        );
      }

      const resolvedIssuesUrl =
        opts.issuesUrl ?? process.env.LIVEDEV_ISSUES_URL ?? "";
      const healthUrl = resolvedIssuesUrl
        ? resolvedIssuesUrl.replace(/\/issues$/, "") + "/health"
        : "";

      let sidecar: { reachable: boolean; rtt_ms: number | null; status: number | null; error: string | null };
      if (!healthUrl) {
        sidecar = { reachable: false, rtt_ms: null, status: null, error: "LIVEDEV_ISSUES_URL not set" };
      } else {
        const t0 = Date.now();
        try {
          const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
          sidecar = { reachable: res.ok, rtt_ms: Date.now() - t0, status: res.status, error: null };
        } catch (err) {
          sidecar = {
            reachable: false,
            rtt_ms: null,
            status: null,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      const whitelist = {
        found: wl.allowedUsers.length > 0,
        count: wl.allowedUsers.length,
        path: process.env.LIVEDEV_WHITELIST_PATH ?? null,
      };

      const resolvedServiceToken = opts.serviceToken ?? process.env.LIVEDEV_SERVICE_TOKEN ?? "";

      return NextResponse.json({
        session: { ok: true, userId: user.id },
        whitelist,
        sidecar,
        store: {
          kind: opts.storeKind ?? "unknown",
          configured: true,
        },
        env: {
          LIVEDEV_ISSUES_URL: Boolean(process.env.LIVEDEV_ISSUES_URL),
          LIVEDEV_SERVICE_TOKEN: Boolean(resolvedServiceToken),
          LIVEDEV_APP_ORIGIN: Boolean(process.env.LIVEDEV_APP_ORIGIN),
        },
      });
    },
  };
}
