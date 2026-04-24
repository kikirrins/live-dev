/**
 * Shape returned by GET /api/livedev/prs (host-proxy) and GET /prs (issues-service).
 * Keep in sync with modules/issues-service/src/prs.ts::DashboardPR.
 */
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

export interface PRsResponse {
  prs: DashboardPR[];
}
