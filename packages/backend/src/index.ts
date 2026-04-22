import { serve } from "@hono/node-server";
import { Octokit } from "@octokit/rest";
import { Hono } from "hono";
import { isAllowed, loadWhitelist } from "@kikirrin/livedev-next/server";

const app = new Hono();

app.post("/issues", async (c) => {
  // --- Service token (shared app PAT) ---
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "missing_token" }, 401);
  }
  const pat = authHeader.slice(7);

  // --- Caller identity (app user id, provided by the consumer app server) ---
  const userId = c.req.header("X-Livedev-User");
  if (!userId) {
    return c.json({ error: "missing_user" }, 401);
  }

  // --- Repo resolution ---
  const repoHeader =
    c.req.header("X-Github-Repo") ?? process.env.LIVEDEV_GITHUB_REPO;
  if (!repoHeader) {
    return c.json({ error: "missing_repo" }, 400);
  }
  const slashIndex = repoHeader.indexOf("/");
  if (slashIndex === -1) {
    return c.json({ error: "invalid_repo_format" }, 400);
  }
  const owner = repoHeader.slice(0, slashIndex);
  const repo = repoHeader.slice(slashIndex + 1);

  // --- Body parsing ---
  let body: { title: string; body: string; labels?: string[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const { title, body: issueBody, labels } = body;
  if (!title || !issueBody) {
    return c.json({ error: "missing_title_or_body" }, 400);
  }

  // --- Whitelist check ---
  const wl = loadWhitelist();
  if (!isAllowed(userId, wl)) {
    return c.json({ error: "not_whitelisted" }, 403);
  }

  // --- Issue creation ---
  const octokit = new Octokit({ auth: pat });
  try {
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body: issueBody,
      labels: labels ?? ["live-dev"],
    });
    return c.json({ html_url: data.html_url, number: data.number }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "upstream_error", message }, 502);
  }
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`[livedev-backend] listening on :${port}`);
