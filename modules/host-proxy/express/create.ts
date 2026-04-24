import type { Request, Response } from "express";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";
import type { ScreenshotStore } from "@livedev/screenshots";

type ExpressUser = { id: string } | null;

export function createIssuesHandler(opts: {
  getUser: (req: Request) => ExpressUser | Promise<ExpressUser>;
  store?: ScreenshotStore;
  buildViewerUrl?: (id: string) => string;
  maxBytes?: number;
}): (req: Request, res: Response) => Promise<void> {
  const maxBytes = opts.maxBytes ?? 10_485_760;
  const buildViewerUrl =
    opts.buildViewerUrl ??
    ((id: string) =>
      `${process.env.LIVEDEV_APP_ORIGIN ?? ""}/api/livedev/screenshots/${id}`);

  return async (req, res) => {
    const user = await opts.getUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }

    const issuesUrl = process.env.LIVEDEV_ISSUES_URL;
    const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
    if (!issuesUrl || !serviceToken) {
      res.status(500).json({ error: "host_misconfigured" });
      return;
    }

    const MAX = maxBytes;
    let meta: { title?: string; body?: string; source?: string };
    const file = (req as Request & { file?: { buffer: Buffer; size: number } }).file;

    if (file) {
      if (file.size > MAX) {
        res.status(413).json({ error: "screenshot_too_large" });
        return;
      }
      meta = JSON.parse((req.body as { meta: string }).meta ?? "{}");

      if (opts.store) {
        const bytes = new Uint8Array(file.buffer);
        const { id } = await opts.store.put(bytes, { ownerId: user.id, createdAt: Date.now() });
        meta.body = (meta.body ?? "") + "\n\n[View screenshot](" + buildViewerUrl(id) + ")";
      }
    } else {
      meta = (req.body as { title?: string; body?: string; source?: string }) ?? {};
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
    res
      .status(upstream.status)
      .type(upstream.headers.get("Content-Type") ?? "application/json")
      .send(text);
  };
}

export function createScreenshotsViewerHandler(opts: {
  getUser: (req: Request) => ExpressUser | Promise<ExpressUser>;
  store: ScreenshotStore;
  loadWhitelist?: () => { allowedUsers: string[] };
}): (req: Request, res: Response) => Promise<void> {
  const wlLoader = opts.loadWhitelist ?? loadWhitelist;

  return async (req, res) => {
    const user = await opts.getUser(req);
    if (!user) {
      res.status(401).end();
      return;
    }

    const wl = wlLoader();
    if (!isAllowed(user.id, wl)) {
      res.status(403).end();
      return;
    }

    const { id } = req.params as { id: string };
    const blob = await opts.store.get(id);
    if (!blob) {
      res.status(404).end();
      return;
    }

    res
      .status(200)
      .set("Content-Type", "image/png")
      .set("Cache-Control", "private, no-store")
      .set("Content-Length", String(blob.bytes.byteLength))
      .end(Buffer.from(blob.bytes));
  };
}

export function createDiagnosticHandler(opts: {
  getUser: (req: Request) => ExpressUser | Promise<ExpressUser>;
  loadWhitelist?: () => { allowedUsers: string[] };
  issuesUrl?: string;
  serviceToken?: string;
  storeKind?: "s3" | "db" | "fs" | "unknown";
}): (req: Request, res: Response) => Promise<void> {
  const wlLoader = opts.loadWhitelist ?? loadWhitelist;

  return async (_req, res) => {
    const user = await opts.getUser(_req);
    if (!user) {
      res.status(401).json({ session: { ok: false, reason: "no_session" } });
      return;
    }

    const wl = wlLoader();
    if (!isAllowed(user.id, wl)) {
      res.status(403).json({ session: { ok: false, reason: "not_whitelisted" } });
      return;
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
        const r = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
        sidecar = { reachable: r.ok, rtt_ms: Date.now() - t0, status: r.status, error: null };
      } catch (err) {
        sidecar = {
          reachable: false,
          rtt_ms: null,
          status: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const resolvedServiceToken = opts.serviceToken ?? process.env.LIVEDEV_SERVICE_TOKEN ?? "";

    res.json({
      session: { ok: true, userId: user.id },
      whitelist: {
        found: wl.allowedUsers.length > 0,
        count: wl.allowedUsers.length,
        path: process.env.LIVEDEV_WHITELIST_PATH ?? null,
      },
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
  };
}
