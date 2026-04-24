import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { timingSafeEqual, createHash } from "node:crypto";
import { isAllowed } from "@livedev/whitelist/server";
import type { GitHubClient } from "./gh";
import { createPRsHandler } from "./prs";

export interface IssuesAppOptions {
  serviceToken: string;
  repo: string;
  client: GitHubClient;
  loadWhitelist: () => { allowedUsers: string[] };
  allowedOrigins: string[];
  skipCors?: boolean;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return ah.length === bh.length && timingSafeEqual(ah, bh);
}

function resolveRepo(repo: string): { owner: string; repo: string } | null {
  const slashIndex = repo.indexOf("/");
  if (slashIndex === -1) return null;
  return { owner: repo.slice(0, slashIndex), repo: repo.slice(slashIndex + 1) };
}

export function createIssuesApp(opts: IssuesAppOptions): Hono {
  const app = new Hono();

  if (!opts.skipCors) {
    app.use(
      "*",
      cors({
        origin: opts.allowedOrigins.length > 0 ? opts.allowedOrigins : [],
        allowHeaders: ["Content-Type", "Authorization", "X-Livedev-User"],
        allowMethods: ["GET", "POST", "OPTIONS"],
      }),
    );
  }

  async function requireAuthenticatedUser(c: Context): Promise<Response | string> {
    if (!opts.serviceToken) return c.json({ error: "service_misconfigured" }, 500);
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "missing_service_token" }, 401);
    }
    const token = authHeader.slice(7);
    if (!constantTimeEqual(token, opts.serviceToken)) {
      return c.json({ error: "invalid_service_token" }, 401);
    }
    const userId = c.req.header("X-Livedev-User");
    if (!userId) return c.json({ error: "missing_user" }, 401);
    return userId;
  }

  let labelEnsured = false;
  async function ensureLabel(owner: string, repo: string): Promise<void> {
    if (labelEnsured) return;
    labelEnsured = true;
    try {
      await opts.client.createLabel(owner, repo, {
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
    if (!opts.serviceToken || !opts.repo) {
      return c.json({ error: "service_misconfigured" }, 500);
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "missing_service_token" }, 401);
    }
    const token = authHeader.slice(7);
    if (!constantTimeEqual(token, opts.serviceToken)) {
      return c.json({ error: "invalid_service_token" }, 401);
    }

    const userId = c.req.header("X-Livedev-User");
    if (!userId) {
      return c.json({ error: "missing_user" }, 401);
    }

    const parsed = resolveRepo(opts.repo);
    if (!parsed) {
      return c.json({ error: "invalid_repo_config" }, 500);
    }
    const { owner, repo } = parsed;

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

    const wl = opts.loadWhitelist();
    if (!isAllowed(userId, wl)) {
      return c.json({ error: "not_whitelisted" }, 403);
    }

    await ensureLabel(owner, repo);

    try {
      const result = await opts.client.createIssue(owner, repo, {
        title,
        body: issueBody,
        labels: ["live-dev"],
      });
      console.log(
        `[livedev] issue #${result.number} created by userId=${userId} repo=${opts.repo}`,
      );
      return c.json({ html_url: result.html_url, number: result.number }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: "upstream_error", message }, 502);
    }
  });

  app.get(
    "/prs",
    createPRsHandler(
      () => {
        if (!opts.repo) return null;
        const r = resolveRepo(opts.repo);
        if (!r) return null;
        return { client: opts.client, owner: r.owner, repo: r.repo };
      },
      requireAuthenticatedUser,
    ),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}
