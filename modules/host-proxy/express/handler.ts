/**
 * Live-Dev host proxy — Express / Node handler.
 *
 * An agent copies this file into the host repo and mounts it at POST
 * /api/livedev/issues. Adjust the import paths to the host's framework.
 *
 * Contract:
 *   - Accepts same-origin POST from the overlay with `{ title, body, source }`.
 *   - Authenticates via the HOST's existing session middleware (whatever
 *     populates `req.user`). Replace `getSessionUser` with the host's logic.
 *     Never trust a client-sent identity.
 *   - Forwards to the livedev issues-service with service-token auth and the
 *     resolved user id. Returns upstream response unchanged.
 *
 * Env vars (host):
 *   LIVEDEV_ISSUES_URL      — e.g. https://livedev-issues.internal/issues
 *   LIVEDEV_SERVICE_TOKEN   — shared secret with the issues-service
 */

import type { Request, Response } from "express";

// ---- Replace with the host app's real session lookup --------------------
function getSessionUser(req: Request): { id: string } | null {
  // Example: return req.user ? { id: req.user.email } : null;
  throw new Error("Replace getSessionUser with your host app's real session lookup");
}
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

  const upstream = await fetch(issuesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceToken}`,
      "X-Livedev-User": user.id,
    },
    body: JSON.stringify(req.body ?? {}),
  });

  const text = await upstream.text();
  res
    .status(upstream.status)
    .type(upstream.headers.get("Content-Type") ?? "application/json")
    .send(text);
}
