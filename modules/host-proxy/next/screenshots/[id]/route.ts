/**
 * Live-Dev screenshot viewer — Next.js route reference.
 *
 * Copy to: app/api/livedev/screenshots/[id]/route.ts
 * Replace getUser and store with real implementations.
 */

import { createScreenshotsViewerRoute } from "../../create";
import type { NextRequest } from "next/server";
import type { ScreenshotStore } from "@livedev/screenshots";

// Replace with the host app's real session lookup.
const getUser = async (_req: NextRequest): Promise<{ id: string } | null> => null as never;

// Replace with the host app's real screenshot store.
const store = null as unknown as ScreenshotStore;

export const { GET } = createScreenshotsViewerRoute({ getUser, store });
