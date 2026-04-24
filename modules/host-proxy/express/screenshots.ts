/**
 * Live-Dev screenshot viewer — Express / Node handler.
 *
 * An agent copies this file into the host repo and mounts it at:
 *     GET /dev/screenshots/:id
 *
 * Contract:
 *   - Session-authenticates the request.
 *   - Whitelist-checks the user (same list as the issues-service).
 *   - Fetches the PNG from the host-provided ScreenshotStore and streams it.
 *
 * Whitelist is loaded on the host side here (not the sidecar), because the
 * sidecar never sees screenshots.
 */

import type { Request, Response } from "express";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";

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

// Placeholder so the reference compiles. Remove when store is imported above.
const store = {
  get: async (_id: string) => null as null,
};

export async function livedevScreenshotHandler(req: Request, res: Response) {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).end();
    return;
  }

  const wl = loadWhitelist();
  if (!isAllowed(user.id, wl)) {
    res.status(403).end();
    return;
  }

  const { id } = req.params as { id: string };
  const blob = await store.get(id);
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
}
