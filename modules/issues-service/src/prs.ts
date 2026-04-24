import type { Context } from "hono";
import type { Octokit } from "@octokit/rest";
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";

export interface DashboardPR {
  number: number;
  title: string;
  author: string | null;
  branch: string;
  state: "open";
  draft: boolean;
  updated_at: string;
  html_url: string;
  preview_url: string | null;
}

export interface PRsHandlerDeps {
  octokit: Octokit;
  owner: string;
  repo: string;
}

export function createPRsHandler(
  deps: () => PRsHandlerDeps | null,
  authGuard: (c: Context) => Promise<Response | string>,
) {
  return async (c: Context) => {
    const guard = await authGuard(c);
    if (guard instanceof Response) return guard;
    const userId = guard;

    const wl = loadWhitelist();
    if (!isAllowed(userId, wl)) {
      return c.json({ error: "not_whitelisted" }, 403);
    }

    const d = deps();
    if (!d) return c.json({ error: "service_misconfigured" }, 500);
    const { octokit, owner, repo } = d;

    try {
      const { data: prs } = await octokit.pulls.list({
        owner,
        repo,
        state: "open",
        sort: "updated",
        direction: "desc",
        per_page: 50,
      });

      const results: DashboardPR[] = await Promise.all(
        prs.map(async (pr): Promise<DashboardPR> => {
          const preview_url = await latestPreviewUrl(octokit, owner, repo, pr.head.sha);
          return {
            number: pr.number,
            title: pr.title,
            author: pr.user?.login ?? null,
            branch: pr.head.ref,
            state: "open",
            draft: pr.draft ?? false,
            updated_at: pr.updated_at,
            html_url: pr.html_url,
            preview_url,
          };
        }),
      );

      return c.json({ prs: results });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: "upstream_error", message }, 502);
    }
  };
}

async function latestPreviewUrl(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<string | null> {
  try {
    const { data: deployments } = await octokit.repos.listDeployments({
      owner,
      repo,
      sha,
      per_page: 10,
    });
    if (deployments.length === 0) return null;

    for (const dep of deployments) {
      const { data: statuses } = await octokit.repos.listDeploymentStatuses({
        owner,
        repo,
        deployment_id: dep.id,
        per_page: 10,
      });
      const ready = statuses.find(
        (s) => s.state === "success" && s.environment_url,
      );
      if (ready?.environment_url) return ready.environment_url;
      const anyUrl = statuses.find((s) => s.environment_url);
      if (anyUrl?.environment_url) return anyUrl.environment_url;
    }
    return null;
  } catch {
    return null;
  }
}
