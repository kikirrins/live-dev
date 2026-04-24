import { serve } from "@hono/node-server";
import { Octokit } from "@octokit/rest";
import { loadWhitelist } from "@livedev/whitelist/server";
import { octokitClient } from "./gh";
import { createIssuesApp } from "./app";

const PAT = process.env.LIVEDEV_GITHUB_PAT ?? "";
const REPO = process.env.LIVEDEV_GITHUB_REPO ?? "";
const SERVICE_TOKEN = process.env.LIVEDEV_SERVICE_TOKEN ?? "";
const ALLOWED_ORIGINS = (process.env.LIVEDEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!PAT) console.warn("[livedev] LIVEDEV_GITHUB_PAT not set — requests will 500");
if (!REPO) console.warn("[livedev] LIVEDEV_GITHUB_REPO not set — requests will 500");
if (!SERVICE_TOKEN) console.warn("[livedev] LIVEDEV_SERVICE_TOKEN not set — requests will 500");
if (ALLOWED_ORIGINS.length === 0) {
  console.warn(
    "[livedev] CORS allowlist empty — no origin can reach this service. Set LIVEDEV_ALLOWED_ORIGINS.",
  );
}

const client = octokitClient(new Octokit({ auth: PAT }));

const app = createIssuesApp({
  serviceToken: SERVICE_TOKEN,
  repo: REPO,
  client,
  loadWhitelist,
  allowedOrigins: ALLOWED_ORIGINS,
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`[livedev] issues-service listening on :${port}`);
