/**
 * Live-Dev host proxy — Express / Node handler for the PR dashboard.
 *
 * Mount at GET /api/livedev/prs in the host app. Replace `getSessionUser`
 * with the host's real auth.
 *
 * Env vars (host):
 *   LIVEDEV_PRS_URL         — e.g. https://livedev-issues.internal/prs
 *   LIVEDEV_SERVICE_TOKEN   — shared secret with the issues-service
 */

import type { Request, Response } from "express";

function getSessionUser(req: Request): { id: string } | null {
  throw new Error("Replace getSessionUser with your host app's real session lookup");
}

export async function livedevPRsHandler(req: Request, res: Response) {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const prsUrl = process.env.LIVEDEV_PRS_URL;
  const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
  if (!prsUrl || !serviceToken) {
    res.status(500).json({ error: "host_misconfigured" });
    return;
  }

  const upstream = await fetch(prsUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${serviceToken}`,
      "X-Livedev-User": user.id,
    },
  });

  const text = await upstream.text();
  res
    .status(upstream.status)
    .type(upstream.headers.get("Content-Type") ?? "application/json")
    .send(text);
}
