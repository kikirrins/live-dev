import fs from "node:fs";
import path from "node:path";

export type { Whitelist } from "./whitelist";
import type { Whitelist } from "./whitelist";

export function loadWhitelist(cwd?: string): Whitelist {
  let dir = cwd ?? process.cwd();
  const filename = "livedev.whitelist.json";

  while (true) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          "allowedUsers" in parsed &&
          Array.isArray((parsed as { allowedUsers: unknown }).allowedUsers)
        ) {
          return parsed as Whitelist;
        }
      } catch {
        // parse failure → fail-closed
      }
      return { allowedUsers: [] };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return { allowedUsers: [] };
}
