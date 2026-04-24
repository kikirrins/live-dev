import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/session";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";
import { store } from "@/app/lib/screenshot-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getCurrentUser();
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

  return new Response(blob.bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Length": String(blob.bytes.byteLength),
    },
  });
}
