/**
 * Live-Dev screenshot viewer — Next.js App Router route handler.
 *
 * An agent copies this file into the host repo at:
 *     app/api/livedev/screenshots/[id]/route.ts
 *
 * Contract:
 *   - Session-authenticates the request using the same getSessionUser stub
 *     the issues route uses. Replace it with the host's real auth.
 *   - Whitelist-checks the user (same list as the issues-service).
 *   - Fetches the PNG from the host-provided ScreenshotStore and streams it.
 *
 * Whitelist is loaded on the host side here (not the sidecar), because the
 * sidecar never sees screenshots.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";

// ---- Replace this with the host app's real session lookup ---------------
async function getSessionUser(
  _req: NextRequest,
): Promise<{ id: string } | null> {
  throw new Error(
    "Replace getSessionUser with your host app's real session lookup",
  );
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(req);
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const wl = loadWhitelist();
  if (!isAllowed(user.id, wl)) {
    return new NextResponse(null, { status: 403 });
  }

  const { id } = await params;
  const blob = await store.get(id);
  if (!blob) {
    return new NextResponse(null, { status: 404 });
  }

  return new Response(blob.bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Length": String(blob.bytes.byteLength),
    },
  });
}
