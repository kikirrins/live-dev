/**
 * Live-Dev host proxy — Express PR dashboard handler reference.
 *
 * Mount at: router.get("/api/livedev/prs", handler)
 * Replace getUser with your host's real session lookup.
 */

import type { Request, Response } from "express";

// Replace with the host app's real session lookup.
const getUser = (_req: Request): { id: string } | null => null as never;

export async function livedevPRsHandler(req: Request, res: Response) {
  const user = await getUser(req);
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
