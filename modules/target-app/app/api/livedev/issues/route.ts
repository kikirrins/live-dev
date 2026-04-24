import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/session";
import { store } from "@/app/lib/screenshot-store";

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const issuesUrl = process.env.LIVEDEV_ISSUES_URL;
  const serviceToken = process.env.LIVEDEV_SERVICE_TOKEN;
  if (!issuesUrl || !serviceToken) {
    return NextResponse.json({ error: "host_misconfigured" }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let meta: { title?: string; body?: string; source?: string };
  let screenshot: File | null = null;

  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData();
    meta = JSON.parse(form.get("meta") as string);
    screenshot = form.get("screenshot") as File | null;
  } else {
    try {
      meta = (await req.json()) as { title?: string; body?: string; source?: string };
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  }

  const MAX = Number(process.env.LIVEDEV_SCREENSHOT_MAX_BYTES ?? 10_485_760);
  if (screenshot && screenshot.size > MAX) {
    return NextResponse.json({ error: "screenshot_too_large" }, { status: 413 });
  }

  if (screenshot) {
    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    const { id } = await store.put(bytes, { ownerId: user.id, createdAt: Date.now() });
    const origin = process.env.LIVEDEV_APP_ORIGIN ?? "";
    meta.body = (meta.body ?? "") + "\n\n[View screenshot](" + origin + "/dev/screenshots/" + id + ")";
  }

  const upstream = await fetch(issuesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceToken}`,
      "X-Livedev-User": user.id,
    },
    body: JSON.stringify({ title: meta.title, body: meta.body, source: meta.source }),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
