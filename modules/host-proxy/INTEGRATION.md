---
module_id: host-proxy
role: backend
host_requirements:
  framework: "next or express"
dependencies: [credentials]
host_changes:
  - action: create
    path: app/api/livedev/issues/route.ts
    source_snippet: modules/host-proxy/next/route.ts
    reason: "Same-origin route that authenticates the session and forwards to the issues-service."
    notes: "For Express hosts, use modules/host-proxy/express/handler.ts and mount at POST /api/livedev/issues."
  - action: modify
    path: app/api/livedev/issues/route.ts
    source_snippet: null
    reason: "Replace `getSessionUser` with the host's real session lookup (NextAuth getServerSession, Clerk auth(), custom cookie, etc.). Must return { id } or null."
env_vars:
  - { name: LIVEDEV_ISSUES_URL, scope: host, required: true, example: "http://localhost:8787/issues", secret: false }
  - { name: LIVEDEV_SERVICE_TOKEN, scope: host, required: true, example: "<matches issues-service>", secret: true }
routes:
  - { method: POST, path: /api/livedev/issues }
mount_points: []
verification_steps:
  - "Unauthenticated: `curl -X POST host/api/livedev/issues -d '{}' -H 'content-type: application/json'` → 401."
  - "Authenticated: submit via overlay → response 201 with `{html_url, number}`."
  - "Missing env: unset LIVEDEV_SERVICE_TOKEN and retry → 500 `host_misconfigured`."
---

# Host-proxy — integration spec

Copy the handler that matches the host's framework, replace `getSessionUser` with the host's real auth, set the two env vars, and you're done. The handler is intentionally thin — all GitHub logic lives in the issues-service.
