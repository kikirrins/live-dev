/**
 * Live-Dev host proxy — Express / Node handler.
 *
 * An agent copies this file into the host repo and mounts it at POST
 * /api/livedev/issues. Adjust the import paths to the host's framework.
 *
 * Contract:
 *   - Accepts same-origin POST from the overlay as multipart/form-data (with an
 *     optional screenshot part) or plain JSON (backwards-compatible).
 *   - Authenticates via the HOST's existing session middleware (whatever
 *     populates `req.user`). Replace `getSessionUser` with the host's logic.
 *     Never trust a client-sent identity.
 *   - Mount with multer memory storage BEFORE this handler for multipart support:
 *       import multer from "multer";
 *       const upload = multer({ storage: multer.memoryStorage() });
 *       router.post("/api/livedev/issues", upload.single("screenshot"), livedevIssuesHandler);
 *   - If a screenshot is present and store is wired, stores it and appends a
 *     viewer link to the issue body before forwarding.
 *
 * Env vars (host):
 *   LIVEDEV_ISSUES_URL            — e.g. https://livedev-issues.internal/issues
 *   LIVEDEV_SERVICE_TOKEN         — shared secret with the issues-service
 *   LIVEDEV_APP_ORIGIN            — e.g. https://app.acme.com (required for screenshot links)
 *   LIVEDEV_SCREENSHOT_MAX_BYTES  — optional, default 10485760 (10 MB)
 */

import type { Request, Response } from "express";

// ---- Replace with the host app's real session lookup --------------------
function getSessionUser(req: Request): { id: string } | null {
  // Example: return req.user ? { id: req.user.email } : null;
  throw new Error("Replace getSessionUser with your host app's real session lookup");
}
// -------------------------------------------------------------------------

// ---- Import or construct a ScreenshotStore (host-provided) --------------
// import type { ScreenshotStore } from "@livedev/screenshots";
// import { store } from "./screenshot-store"; // host-provided
// -------------------------------------------------------------------------

export async function livedevIssuesHandler(req: Request, res: Response) {
  const user = getSessionUser(req);
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

  const MAX = Number(process.env.LIVEDEV_SCREENSHOT_MAX_BYTES ?? 10_485_760);

  // When mounted with multer, multipart fields land in req.body.meta (JSON string)
  // and the file in req.file. Plain JSON bodies continue to work as before.
  let meta: { title?: string; body?: string; source?: string };
  const file = (req as Request & { file?: { buffer: Buffer; size: number } }).file;

  if (file) {
    if (file.size > MAX) {
      res.status(413).json({ error: "screenshot_too_large" });
      return;
    }
    meta = JSON.parse((req.body as { meta: string }).meta ?? "{}");

    // Uncomment once `store` is imported above:
    //
    // const bytes = new Uint8Array(file.buffer);
    // const { id } = await store.put(bytes, { ownerId: user.id, createdAt: Date.now() });
    // const origin = process.env.LIVEDEV_APP_ORIGIN ?? "";
    // meta.body = meta.body + "\n\n[View screenshot](" + origin + "/dev/screenshots/" + id + ")";
  } else {
    meta = req.body as { title?: string; body?: string; source?: string } ?? {};
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
}
