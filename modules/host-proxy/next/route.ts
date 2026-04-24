/**
 * Live-Dev host proxy — Next.js App Router route handler.
 *
 * An agent copies this file into the host repo at:
 *     app/api/livedev/issues/route.ts
 *
 * Contract:
 *   - Accepts same-origin POST from the overlay with `{ title, body, source }`.
 *   - Authenticates the request using the HOST's existing session (replace
 *     `getSessionUser` below with the host's real auth — NextAuth, Clerk,
 *     custom cookie check, etc.). Never trust a client-sent identity.
 *   - Forwards to the livedev issues-service with a service token and the
 *     resolved user id. Returns the service's JSON response unchanged.
 *
 * Env vars (host):
 *   LIVEDEV_ISSUES_URL      — e.g. https://livedev-issues.internal/issues
 *   LIVEDEV_SERVICE_TOKEN   — shared secret with the issues-service
 */

import { NextRequest, NextResponse } from "next/server";

// ---- Replace this with the host app's real session lookup ---------------
async function getSessionUser(
  _req: NextRequest,
): Promise<{ id: string } | null> {
  // Example (NextAuth):
  //   const session = await getServerSession(authOptions);
  //   return session?.user?.email ? { id: session.user.email } : null;
  throw new Error(
    "Replace getSessionUser with your host app's real session lookup",
  );
}
// -------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const issuesUrl = process.env.LIVEDEV_ISSUES_URL;
  const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
  if (!issuesUrl || !serviceToken) {
    return NextResponse.json(
      { error: "host_misconfigured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const upstream = await fetch(issuesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceToken}`,
      "X-Livedev-User": user.id,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
