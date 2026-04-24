import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/session";

export async function GET(_req: NextRequest) {
  const user = getCurrentUser();
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
