import fs from "node:fs";
import path from "node:path";

export type { Whitelist } from "./index";
import type { Whitelist } from "./index";
export { isAllowed } from "./index";

export function loadWhitelist(cwd?: string): Whitelist {
  const explicitPath = process.env.LIVEDEV_WHITELIST_PATH;
  if (explicitPath) {
    return readWhitelistAt(explicitPath);
  }

  let dir = cwd ?? process.cwd();
  const filename = "livedev.whitelist.json";

  while (true) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) {
      return readWhitelistAt(candidate);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return { allowedUsers: [] };
}

function readWhitelistAt(file: string): Whitelist {
  try {
    const raw = fs.readFileSync(file, "utf-8");
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
