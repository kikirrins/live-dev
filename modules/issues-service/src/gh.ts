import type { Octokit } from "@octokit/rest";

export interface PullSummary {
  number: number;
  title: string;
  user_login: string | null;
  head_ref: string;
  head_sha: string;
  draft: boolean;
  updated_at: string;
  html_url: string;
}

export interface DeploymentSummary {
  id: number;
  sha: string;
}

export interface StatusSummary {
  state: string;
  environment_url: string | null | undefined;
}

export interface GitHubClient {
  createIssue(
    owner: string,
    repo: string,
    opts: { title: string; body: string; labels: string[] },
  ): Promise<{ html_url: string; number: number }>;

  createLabel(
    owner: string,
    repo: string,
    opts: { name: string; color: string; description: string },
  ): Promise<void>;

  listOpenPulls(
    owner: string,
    repo: string,
    opts?: { per_page?: number; sort?: string; direction?: string },
  ): Promise<PullSummary[]>;

  listDeployments(
    owner: string,
    repo: string,
    opts: { sha: string; per_page?: number },
  ): Promise<DeploymentSummary[]>;

  listDeploymentStatuses(
    owner: string,
    repo: string,
    deploymentId: number,
  ): Promise<StatusSummary[]>;
}

export function octokitClient(octokit: Octokit): GitHubClient {
  return {
    async createIssue(owner, repo, { title, body, labels }) {
      const { data } = await octokit.issues.create({ owner, repo, title, body, labels });
      return { html_url: data.html_url, number: data.number };
    },

    async createLabel(owner, repo, { name, color, description }) {
      await octokit.issues.createLabel({ owner, repo, name, color, description });
    },

    async listOpenPulls(owner, repo, opts = {}) {
      const { data } = await octokit.pulls.list({
        owner,
        repo,
        state: "open",
        sort: (opts.sort as "created" | "updated" | "popularity" | "long-running") ?? "updated",
        direction: (opts.direction as "asc" | "desc") ?? "desc",
        per_page: opts.per_page ?? 50,
      });
      return data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        user_login: pr.user?.login ?? null,
        head_ref: pr.head.ref,
        head_sha: pr.head.sha,
        draft: pr.draft ?? false,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
      }));
    },

    async listDeployments(owner, repo, { sha, per_page = 10 }) {
      const { data } = await octokit.repos.listDeployments({ owner, repo, sha, per_page });
      return data.map((d) => ({ id: d.id, sha: d.sha }));
    },

    async listDeploymentStatuses(owner, repo, deploymentId) {
      const { data } = await octokit.repos.listDeploymentStatuses({
        owner,
        repo,
        deployment_id: deploymentId,
        per_page: 10,
      });
      return data.map((s) => ({ state: s.state, environment_url: s.environment_url }));
    },
  };
}

export function fetchClient(opts: { token: string; fetchFn?: typeof fetch }): GitHubClient {
  const fetchFn = opts.fetchFn ?? fetch;
  const base = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${opts.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  async function ghFetch(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetchFn(url, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = (await res.json()) as { message?: string };
        if (j.message) msg = j.message;
      } catch {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    async createIssue(owner, repo, { title, body, labels }) {
      const data = (await ghFetch(`${base}/repos/${owner}/${repo}/issues`, {
        method: "POST",
        body: JSON.stringify({ title, body, labels }),
      })) as { html_url: string; number: number };
      return { html_url: data.html_url, number: data.number };
    },

    async createLabel(owner, repo, { name, color, description }) {
      await ghFetch(`${base}/repos/${owner}/${repo}/labels`, {
        method: "POST",
        body: JSON.stringify({ name, color, description }),
      });
    },

    async listOpenPulls(owner, repo, opts = {}) {
      const params = new URLSearchParams({
        state: "open",
        sort: opts.sort ?? "updated",
        direction: opts.direction ?? "desc",
        per_page: String(opts.per_page ?? 50),
      });
      const data = (await ghFetch(
        `${base}/repos/${owner}/${repo}/pulls?${params}`,
      )) as Array<{
        number: number; title: string; user: { login: string } | null;
        head: { ref: string; sha: string }; draft: boolean; updated_at: string; html_url: string;
      }>;
      return data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        user_login: pr.user?.login ?? null,
        head_ref: pr.head.ref,
        head_sha: pr.head.sha,
        draft: pr.draft ?? false,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
      }));
    },

    async listDeployments(owner, repo, { sha, per_page = 10 }) {
      const params = new URLSearchParams({ sha, per_page: String(per_page) });
      const data = (await ghFetch(
        `${base}/repos/${owner}/${repo}/deployments?${params}`,
      )) as Array<{ id: number; sha: string }>;
      return data.map((d) => ({ id: d.id, sha: d.sha }));
    },

    async listDeploymentStatuses(owner, repo, deploymentId) {
      const data = (await ghFetch(
        `${base}/repos/${owner}/${repo}/deployments/${deploymentId}/statuses?per_page=10`,
      )) as Array<{ state: string; environment_url?: string | null }>;
      return data.map((s) => ({ state: s.state, environment_url: s.environment_url ?? null }));
    },
  };
}
