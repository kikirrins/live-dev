/**
 * Live-Dev host proxy — Next.js App Router route handler for the PR dashboard.
 *
 * An agent copies this file into the host repo at:
 *     app/api/livedev/prs/route.ts
 *
 * Contract:
 *   - Accepts same-origin GET from the dashboard UI.
 *   - Authenticates via the host's existing session (replace `getSessionUser`
 *     with the host's real auth). Never trust a client-sent identity.
 *   - Forwards to the livedev issues-service /prs with service-token auth and
 *     the resolved user id. Returns upstream JSON unchanged.
 *
 * Env vars (host):
 *   LIVEDEV_PRS_URL         — e.g. https://livedev-issues.internal/prs
 *   LIVEDEV_SERVICE_TOKEN   — shared secret with the issues-service
 */

import { NextRequest, NextResponse } from "next/server";

// ---- Replace this with the host app's real session lookup ---------------
async function getSessionUser(
  _req: NextRequest,
): Promise<{ id: string } | null> {
  throw new Error(
    "Replace getSessionUser with your host app's real session lookup",
  );
}
// -------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const prsUrl = process.env.LIVEDEV_PRS_URL;
  const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
  if (!prsUrl || !serviceToken) {
    return NextResponse.json({ error: "host_misconfigured" }, { status: 500 });
  }

  const upstream = await fetch(prsUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${serviceToken}`,
      "X-Livedev-User": user.id,
    },
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
