---
module_id: issues-service
role: sidecar
host_requirements:
  node: ">=20"
dependencies: [credentials, whitelist]
host_changes:
  - action: create
    path: services/livedev-issues/
    source_snippet: modules/issues-service/
    reason: "Copy the whole directory (src, package.json, tsconfig.json, .env.example) to wherever host sidecars live."
env_vars:
  - { name: LIVEDEV_GITHUB_PAT, scope: service, required: true, example: "github_pat_…", secret: true }
  - { name: LIVEDEV_GITHUB_REPO, scope: service, required: true, example: "acme/webapp", secret: false }
  - { name: LIVEDEV_SERVICE_TOKEN, scope: service, required: true, example: "<matches host-proxy>", secret: true }
  - { name: LIVEDEV_ALLOWED_ORIGINS, scope: service, required: true, example: "https://app.acme.com", secret: false }
  - { name: PORT, scope: service, required: false, example: "8787", secret: false }
credentials:
  type: github_pat
  scopes: ["issues:write"]
  doc: modules/credentials/INTEGRATION.md
routes:
  - { method: POST, path: /issues }
  - { method: GET,  path: /prs }
  - { method: GET,  path: /health }
verification_steps:
  - "curl -X POST :8787/issues -H 'Authorization: Bearer wrong' -H 'X-Livedev-User: x' -H 'content-type: application/json' -d '{\"title\":\"t\",\"body\":\"b\"}' → 401 invalid_service_token"
  - "curl -X POST :8787/issues -H \"Authorization: Bearer $LIVEDEV_SERVICE_TOKEN\" -H 'content-type: application/json' -d '{\"title\":\"t\",\"body\":\"b\"}' → 401 missing_user"
  - "curl -X POST :8787/issues -H \"Authorization: Bearer $LIVEDEV_SERVICE_TOKEN\" -H 'X-Livedev-User: someone@not.listed' -H 'content-type: application/json' -d '{\"title\":\"t\",\"body\":\"b\"}' → 403 not_whitelisted"
  - "curl -H 'Origin: https://evil.test' -X OPTIONS :8787/issues → no Access-Control-Allow-Origin echo"
---

# Issues-service — integration spec

Two shapes are supported:

### 1. Standalone sidecar (default)

Copy the whole directory, `cp .env.example .env`, `pnpm start`. `src/main.ts` reads env, constructs an Octokit client, and calls `createIssuesApp(...)` → `serve(...)`. This is what the reference target-app wires.

### 2. Co-mounted inside the host's backend

Import the factory — `src/app.ts` has no side effects:

```ts
import { createIssuesApp, octokitClient, fetchClient } from "@livedev/issues-service";
import { loadWhitelist } from "@livedev/whitelist/server";

const app = createIssuesApp({
  serviceToken: process.env.LIVEDEV_SERVICE_TOKEN!,
  repo: process.env.LIVEDEV_GITHUB_REPO!,
  client: fetchClient({ token: process.env.LIVEDEV_GITHUB_PAT! }), // or octokitClient(new Octokit({ auth: ... }))
  loadWhitelist,
  allowedOrigins: [],
  skipCors: true, // host owns origin policy
});

// mount `app.fetch` under your router at /livedev/* (or wherever)
```

`fetchClient` is a lightweight native-fetch implementation of the five GitHub endpoints the service uses. Prefer it for co-mounted deployments where shipping `@octokit/rest` (~400 KB parsed) into the host's API bundle is wasteful. `octokitClient` stays the sidecar default for broader API coverage in case you fork.

## CORS behavior

- `LIVEDEV_ALLOWED_ORIGINS` is a comma-separated allowlist of host-proxy origins.
- Empty or unset → `[]` → Hono cors **hard-denies every origin** (including `null`). `main.ts` logs a startup warning so you notice.
- Wildcards are not accepted. Name each host explicitly.
- When co-mounting (`skipCors: true`), the host owns origin policy. The factory skips registering the cors middleware.

## Trust model

See `modules/host-proxy/INTEGRATION.md#trust-model`. The sidecar pairs a service-token constant-time check with a trusted `X-Livedev-User` header. If `LIVEDEV_SERVICE_TOKEN` leaks, rotate; the sidecar has no other perimeter.
