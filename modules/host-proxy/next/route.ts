/**
 * Live-Dev host proxy — Next.js App Router route handler.
 *
 * An agent copies this file into the host repo at:
 *     app/api/livedev/issues/route.ts
 *
 * Contract:
 *   - Accepts same-origin POST from the overlay as multipart/form-data (with an
 *     optional screenshot part) or plain JSON (backwards-compatible with hosts
 *     that have not wired a ScreenshotStore).
 *   - Authenticates the request using the HOST's existing session (replace
 *     `getSessionUser` below with the host's real auth — NextAuth, Clerk,
 *     custom cookie check, etc.). Never trust a client-sent identity.
 *   - If a screenshot is present, stores it via `store.put` and appends a
 *     viewer link to the issue body before forwarding to the issues-service.
 *   - Forwards to the livedev issues-service with a service token and the
 *     resolved user id. Returns the service's JSON response unchanged.
 *
 * Env vars (host):
 *   LIVEDEV_ISSUES_URL            — e.g. https://livedev-issues.internal/issues
 *   LIVEDEV_SERVICE_TOKEN         — shared secret with the issues-service
 *   LIVEDEV_APP_ORIGIN            — e.g. https://app.acme.com (required for screenshot links)
 *   LIVEDEV_SCREENSHOT_MAX_BYTES  — optional, default 10485760 (10 MB)
 */

import { NextRequest, NextResponse } from "next/server";

// ---- Replace this with the host app's real session lookup ---------------
async function getSessionUser(
  _req: NextRequest,
): Promise<{ id: string } | null> {
  // Example (NextAuth):
  //   const session = await getServerSession(authOptions);
  //   return session?.user?.email ? { id: session.user.email } : null;
  throw new Error(
    "Replace getSessionUser with your host app's real session lookup",
  );
}
// -------------------------------------------------------------------------

// ---- Import or construct a ScreenshotStore (host-provided) --------------
// import type { ScreenshotStore } from "@livedev/screenshots";
// import { store } from "./screenshot-store"; // host-provided
// -------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const issuesUrl = process.env.LIVEDEV_ISSUES_URL;
  const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
  if (!issuesUrl || !serviceToken) {
    return NextResponse.json(
      { error: "host_misconfigured" },
      { status: 500 },
    );
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

  const MAX = Number(process.env.LIVEDEV_SCREENSHOT_MAX_BYTES ?? 10_485_760);
  if (screenshot && screenshot.size > MAX) {
    return NextResponse.json({ error: "screenshot_too_large" }, { status: 413 });
  }

  // If store is wired and a screenshot was sent, persist it and append a link.
  // Uncomment the block below once `store` is imported above:
  //
  // if (screenshot) {
  //   const bytes = new Uint8Array(await screenshot.arrayBuffer());
  //   const { id } = await store.put(bytes, { ownerId: user.id, createdAt: Date.now() });
  //   const origin = process.env.LIVEDEV_APP_ORIGIN ?? "";
  //   meta.body = meta.body + "\n\n[View screenshot](" + origin + "/dev/screenshots/" + id + ")";
  // }

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
}
