# Changelog

## 2026-04-24 — dashboard-client module (MVP)

Added a read-only `/dev` dashboard as a fifth module, following the same three-tier pattern as the overlay (browser → host-proxy → issues-service → GitHub). Whitelisted host users see open PRs with links to their Railway preview sandboxes.

### New
- `modules/dashboard-client/` — React component package. `react/Dashboard.tsx`, `react/usePRs.ts`, `react/types.ts`, plus `package.json`, `tsconfig.json`, `README.md`, `INTEGRATION.md`.
- `modules/issues-service/src/prs.ts` — `GET /prs` handler. Lists open PRs via Octokit and resolves each PR's Railway preview URL from GitHub's deployment statuses (latest status with an `environment_url`). Same service-token + `X-Livedev-User` + whitelist gate as `/issues`.
- `modules/host-proxy/next/prs/route.ts` and `modules/host-proxy/express/prs.ts` — reference host-proxy GET handlers that forward session-authenticated requests to the sidecar.
- `modules/target-app/app/dev/page.tsx` — reference `/dev` page. Server-side whitelist gate (`notFound()` if not allowed), renders `<Dashboard />`.
- `modules/target-app/app/api/livedev/prs/route.ts` — reference wiring of the host-proxy.

### Modified
- `modules/issues-service/src/index.ts` — extracted `requireAuthenticatedUser` + `resolveRepo` helpers, registered `GET /prs`, added `GET` to CORS `allowMethods`.
- `modules/target-app/package.json` — depends on `@livedev/dashboard-client`.
- `modules/target-app/.env.local.example` — adds `LIVEDEV_PRS_URL=http://localhost:8787/prs`.
- `README.md` — `dashboard-client` added to agentic-rfp `modules`, `install_order`, and modules table.

### Railway mapping
No Railway token needed. Preview URLs are read from GitHub's deployments API (Railway posts deployment statuses with `environment_url` on the PR head SHA).

### Scope
MVP is read-only. Explicitly deferred: merge button, release-branch workflow, live polling/WebSocket, Railway GraphQL integration (logs/redeploy), A/B testing.

### Verification
`pnpm --filter target-app build` compiles clean; `/dev` and `/api/livedev/prs` both appear in the Next.js route manifest. `pnpm --filter @livedev/issues-service build` clean. End-to-end browser verification (per plan): visit `/dev`, expect the PR table, confirm zero requests to `api.github.com` from the browser, confirm whitelist removal produces a 404 on the page and 403 on the API.
