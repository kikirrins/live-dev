import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { Dashboard } from "@livedev/dashboard-client";
import { isAllowed } from "@livedev/whitelist";
import { getCurrentUser } from "@/app/lib/session";

function loadAllowedUsers(): string[] {
  try {
    const file = path.join(process.cwd(), "livedev.whitelist.json");
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw) as { allowedUsers?: unknown };
    return Array.isArray(parsed.allowedUsers)
      ? parsed.allowedUsers.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export default function DevPage() {
  const user = getCurrentUser();
  const allowedUsers = loadAllowedUsers();
  if (!isAllowed(user?.id ?? null, { allowedUsers })) {
    notFound();
  }

  return <Dashboard />;
}
