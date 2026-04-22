#!/usr/bin/env tsx
/**
 * One-time setup: creates the "Live-Dev Requests" epic in Mission Control
 * and writes packages/bridge/.env with all required values.
 *
 * Usage:
 *   MC_API_KEY=mc_xxx MC_PROJECT_ID=xxx pnpm tsx scripts/setup.ts
 *   -- or --
 *   Copy .env.example to .env, fill in MC_API_KEY + MC_PROJECT_ID, then run:
 *   pnpm tsx scripts/setup.ts
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../packages/bridge/.env");

// Load existing .env if present
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k]) {
      process.env[k] = v.join("=");
    }
  }
}

const MC_API_URL = process.env.MC_API_URL ?? "http://localhost:3051";
const MC_API_KEY = process.env.MC_API_KEY;
const MC_PROJECT_ID = process.env.MC_PROJECT_ID;

if (!MC_API_KEY || !MC_PROJECT_ID) {
  console.error(
    "Missing MC_API_KEY or MC_PROJECT_ID.\n" +
      "Set them in packages/bridge/.env or pass as env vars.",
  );
  process.exit(1);
}

console.log(`Connecting to Mission Control at ${MC_API_URL}...`);

// Check if epic already exists
let epicId = process.env.MC_EPIC_ID;

if (epicId) {
  console.log(`MC_EPIC_ID already set: ${epicId} — skipping epic creation.`);
} else {
  const res = await fetch(`${MC_API_URL}/api/v1/epics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MC_API_KEY}`,
      "x-project-id": MC_PROJECT_ID,
      "x-agent-type": "engineering-manager",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Live-Dev Requests",
      description:
        "Stories created automatically by the Live-Dev overlay. Each story contains component context, file:line, parent chain, and the client's prompt. Assign and dispatch agents from here.",
      priority: "MEDIUM",
      status: "ACTIVE",
      projectId: MC_PROJECT_ID,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to create epic:", res.status, err);
    process.exit(1);
  }

  const data = await res.json() as any;
  epicId = (data.epic ?? data).id;
  console.log(`Created epic: ${epicId} — "Live-Dev Requests"`);
}

// Write .env
const envContent = [
  `MC_API_URL=${MC_API_URL}`,
  `MC_API_KEY=${MC_API_KEY}`,
  `MC_PROJECT_ID=${MC_PROJECT_ID}`,
  `MC_EPIC_ID=${epicId}`,
  `REPO_PATH=/workspace`,
  `BRIDGE_PORT=16001`,
].join("\n") + "\n";

writeFileSync(envPath, envContent);
console.log(`Wrote ${envPath}`);
console.log("\nSetup complete. Run: docker compose up --build");
