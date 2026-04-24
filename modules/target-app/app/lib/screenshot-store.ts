// Dev-only reference adapter. Integrating hosts replace this — see modules/screenshots/INTEGRATION.md.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ScreenshotStore, ScreenshotMeta, ScreenshotBlob } from "@livedev/screenshots";

const UUID_RE = /^[a-f0-9-]{36}$/;

function getDir(): string {
  return process.env.LIVEDEV_SCREENSHOT_DIR ?? "./.livedev-screenshots";
}

let dirReady = false;
async function ensureDir(): Promise<string> {
  const dir = getDir();
  if (!dirReady) {
    await fs.mkdir(dir, { recursive: true });
    dirReady = true;
  }
  return dir;
}

const fsStore: ScreenshotStore = {
  async put(bytes: Uint8Array, meta: ScreenshotMeta): Promise<{ id: string }> {
    const dir = await ensureDir();
    const id = randomUUID();
    await Promise.all([
      fs.writeFile(join(dir, `${id}.png`), bytes),
      fs.writeFile(join(dir, `${id}.json`), JSON.stringify(meta)),
    ]);
    return { id };
  },

  async get(id: string): Promise<ScreenshotBlob | null> {
    if (!UUID_RE.test(id)) return null;
    const dir = getDir();
    try {
      const [png, metaRaw] = await Promise.all([
        fs.readFile(join(dir, `${id}.png`)),
        fs.readFile(join(dir, `${id}.json`), "utf8"),
      ]);
      const meta = JSON.parse(metaRaw) as ScreenshotMeta;
      return { bytes: new Uint8Array(png), contentType: "image/png", meta };
    } catch {
      return null;
    }
  },
};

export const store = fsStore;
