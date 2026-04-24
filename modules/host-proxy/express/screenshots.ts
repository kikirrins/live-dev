/**
 * Live-Dev screenshot viewer — Express handler reference.
 *
 * Mount at: router.get("/api/livedev/screenshots/:id", handler)
 * Replace getUser and store with real implementations.
 */

import { createScreenshotsViewerHandler } from "./create";
import type { Request } from "express";
import type { ScreenshotStore } from "@livedev/screenshots";

// Replace with the host app's real session lookup.
const getUser = (_req: Request): { id: string } | null => null as never;

// Replace with the host app's real screenshot store.
const store = null as unknown as ScreenshotStore;

export const livedevScreenshotHandler = createScreenshotsViewerHandler({ getUser, store });
