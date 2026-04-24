import { serve } from "@hono/node-server";
import { Octokit } from "@octokit/rest";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { timingSafeEqual, createHash } from "node:crypto";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";
import { createPRsHandler } from "./prs.js";

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

function constantTimeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return ah.length === bh.length && timingSafeEqual(ah, bh);
}

const octokit = new Octokit({ auth: PAT });
const app = new Hono();

app.use(
  "*",
  cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : [],
    allowHeaders: ["Content-Type", "Authorization", "X-Livedev-User"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

/**
 * Verifies service-token + X-Livedev-User headers. Returns the userId string
 * on success, or a Response to return to the caller on failure.
 */
async function requireAuthenticatedUser(c: Context): Promise<Response | string> {
  if (!SERVICE_TOKEN) return c.json({ error: "service_misconfigured" }, 500);
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "missing_service_token" }, 401);
  }
  const token = authHeader.slice(7);
  if (!constantTimeEqual(token, SERVICE_TOKEN)) {
    return c.json({ error: "invalid_service_token" }, 401);
  }
  const userId = c.req.header("X-Livedev-User");
  if (!userId) return c.json({ error: "missing_user" }, 401);
  return userId;
}

function resolveRepo(): { owner: string; repo: string } | null {
  const slashIndex = REPO.indexOf("/");
  if (slashIndex === -1) return null;
  return { owner: REPO.slice(0, slashIndex), repo: REPO.slice(slashIndex + 1) };
}

let labelEnsured = false;
async function ensureLabel(owner: string, repo: string): Promise<void> {
  if (labelEnsured) return;
  labelEnsured = true;
  try {
    await octokit.issues.createLabel({
      owner,
      repo,
      name: "live-dev",
      color: "2563eb",
      description: "Change request from Live-Dev overlay",
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status !== 422) {
      console.warn("[livedev] ensureLabel failed:", err);
    }
  }
}

app.post("/issues", async (c) => {
  if (!PAT || !REPO || !SERVICE_TOKEN) {
    return c.json({ error: "service_misconfigured" }, 500);
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "missing_service_token" }, 401);
  }
  const token = authHeader.slice(7);
  if (!constantTimeEqual(token, SERVICE_TOKEN)) {
    return c.json({ error: "invalid_service_token" }, 401);
  }

  const userId = c.req.header("X-Livedev-User");
  if (!userId) {
    return c.json({ error: "missing_user" }, 401);
  }

  const slashIndex = REPO.indexOf("/");
  if (slashIndex === -1) {
    return c.json({ error: "invalid_repo_config" }, 500);
  }
  const owner = REPO.slice(0, slashIndex);
  const repo = REPO.slice(slashIndex + 1);

  let body: { title?: string; body?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  const issueBody = typeof body.body === "string" ? body.body.slice(0, 10000) : "";
  if (!title || !issueBody) {
    return c.json({ error: "missing_title_or_body" }, 400);
  }

  const wl = loadWhitelist();
  if (!isAllowed(userId, wl)) {
    return c.json({ error: "not_whitelisted" }, 403);
  }

  await ensureLabel(owner, repo);

  try {
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body: issueBody,
      labels: ["live-dev"],
    });
    console.log(
      `[livedev] issue #${data.number} created by userId=${userId} repo=${REPO}`,
    );
    return c.json({ html_url: data.html_url, number: data.number }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

app.get(
  "/prs",
  createPRsHandler(
    () => {
      if (!PAT || !REPO) return null;
      const r = resolveRepo();
      if (!r) return null;
      return { octokit, owner: r.owner, repo: r.repo };
    },
    requireAuthenticatedUser,
  ),
);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`[livedev] issues-service listening on :${port}`);
