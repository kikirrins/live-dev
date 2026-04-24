# @livedev/issues-service

Standalone Hono service that holds the GitHub credential and creates issues on behalf of authenticated host-proxy callers. Deploy as a sidecar next to the host app, behind a private network or CORS allowlist.

## Endpoints

- `POST /issues` — create an issue.
  - Headers: `Authorization: Bearer <service-token>`, `X-Livedev-User: <resolved id>`.
  - Body: `{ "title": string, "body": string, "source"?: ... }`.
  - Returns `{ html_url, number }` on 201. `401` on missing/invalid token or user, `403` on non-whitelisted user, `502` on GitHub error.
- `GET /health` — `{ ok: true }`.

## Guarantees

- GitHub credential comes **only** from `LIVEDEV_GITHUB_PAT` env — never from a request header.
- Target repo comes **only** from `LIVEDEV_GITHUB_REPO` env — browsers cannot retarget the service.
- Service token is compared in constant time.
- CORS is origin-locked via `LIVEDEV_ALLOWED_ORIGINS` (comma-separated).
- Whitelist loaded from the nearest `livedev.whitelist.json` at `process.cwd()` or ancestor, fail-closed.

See `.env.example` for the full env var set and `INTEGRATION.md` for the agent-facing spec.

## Dev

```bash
cp .env.example .env      # fill LIVEDEV_GITHUB_PAT and LIVEDEV_GITHUB_REPO
pnpm --filter @livedev/issues-service dev
```
