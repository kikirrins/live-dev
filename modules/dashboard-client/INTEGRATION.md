---
module_id: dashboard-client
role: frontend
host_requirements:
  next: ">=13"
  react: ">=18"
dependencies:
  - host-proxy
  - issues-service
  - whitelist
env_vars:
  - name: LIVEDEV_PRS_URL
    scope: host
    required: true
    example: http://localhost:8787/prs
    secret: false
  - name: LIVEDEV_SERVICE_TOKEN
    scope: host
    required: true
    example: dev-token
    secret: true
mount_points:
  - app/dev/page.tsx
routes:
  - method: GET
    path: /api/livedev/prs
host_changes:
  - action: create
    path: app/dev/page.tsx
    source_snippet: modules/target-app/app/dev/page.tsx
    reason: Mounts the <Dashboard /> page and gates access via the host whitelist.
  - action: create
    path: app/api/livedev/prs/route.ts
    source_snippet: modules/host-proxy/next/prs/route.ts
    reason: Same-origin host proxy that authenticates the session and forwards to issues-service /prs.
  - action: modify
    path: .env.local
    source_snippet: modules/target-app/.env.local.example
    reason: Adds LIVEDEV_PRS_URL pointing at the issues-service /prs endpoint.
verification_steps:
  - Visit /dev as a whitelisted user — table of open PRs renders.
  - DevTools Network shows one GET /api/livedev/prs (same-origin); zero requests to api.github.com.
  - "Open sandbox" links match the Railway preview URL from the PR's latest deployment status.
  - Removing the user from livedev.whitelist.json causes /dev to 404 and /api/livedev/prs to return 403.
---

# Dashboard Client

Integration steps (Next.js App Router):

1. Install the module as a workspace dependency (or copy `react/` into your app).
2. Copy `modules/host-proxy/next/prs/route.ts` into your host at
   `app/api/livedev/prs/route.ts`, and replace `getSessionUser` with your
   real auth (same pattern as the `/issues` proxy).
3. Create `app/dev/page.tsx` importing `Dashboard` from `@livedev/dashboard-client`.
   Gate rendering on your whitelist check (see `modules/target-app/app/dev/page.tsx`
   for a reference implementation).
4. Add `LIVEDEV_PRS_URL` and `LIVEDEV_SERVICE_TOKEN` to the host's env.

The sidecar reads GitHub deployments on each PR's head SHA. If your preview
service (Railway, Vercel, Fly, etc.) posts deployment statuses with an
`environment_url`, it will appear as the sandbox link automatically — no
extra configuration is needed.
