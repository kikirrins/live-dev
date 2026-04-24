/**
 * Live-Dev host proxy — Express issues handler reference.
 *
 * Mount at: router.post("/api/livedev/issues", upload.single("screenshot"), handler)
 * Replace getUser with your host's real session lookup.
 */

import { createIssuesHandler } from "./create";
import type { Request } from "express";

// Replace with the host app's real session lookup.
const getUser = (_req: Request): { id: string } | null => null as never;

export const livedevIssuesHandler = createIssuesHandler({
  getUser,
  // store: import from your screenshot-store module
});
