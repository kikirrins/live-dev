/**
 * Live-Dev host proxy — Next.js issues route reference.
 *
 * Copy to: app/api/livedev/issues/route.ts
 * Replace getUser with your host's real session lookup.
 */

import { createIssuesRoute } from "./create";
import type { NextRequest } from "next/server";

// Replace with the host app's real session lookup.
const getUser = async (_req: NextRequest): Promise<{ id: string } | null> => null as never;

export const { POST } = createIssuesRoute({
  getUser,
  // store: import from your screenshot-store module
});
