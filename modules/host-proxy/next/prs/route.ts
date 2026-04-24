/**
 * Live-Dev host proxy — Next.js PR dashboard route reference.
 *
 * Copy to: app/api/livedev/prs/route.ts
 * Replace getUser with your host's real session lookup.
 */

import { createPRsRoute } from "../create";
import type { NextRequest } from "next/server";

// Replace with the host app's real session lookup.
const getUser = async (_req: NextRequest): Promise<{ id: string } | null> => null as never;

export const { GET } = createPRsRoute({ getUser });
