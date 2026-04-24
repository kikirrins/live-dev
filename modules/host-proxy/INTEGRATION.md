---
module_id: host-proxy
role: backend
host_requirements:
  framework: "next or express"
dependencies: [credentials, screenshots]
host_changes:
  - action: create
    path: app/api/livedev/issues/route.ts
    source_snippet: modules/host-proxy/next/route.ts
    reason: "Same-origin route that authenticates the session and forwards to the issues-service."
    notes: "For Express hosts, use modules/host-proxy/express/handler.ts and mount at POST /api/livedev/issues with multer memory storage middleware."
  - action: modify
    path: app/api/livedev/issues/route.ts
    source_snippet: null
    reason: "Replace `getSessionUser` with the host's real session lookup (NextAuth getServerSession, Clerk auth(), custom cookie, etc.). Must return { id } or null. Uncomment the store.put block and import your ScreenshotStore implementation."
  - action: create
    path: app/api/livedev/screenshots/[id]/route.ts
    source_snippet: modules/host-proxy/next/screenshots/[id]/route.ts
    reason: "Session-authenticated viewer route that streams PNGs from the ScreenshotStore."
    notes: "For Express hosts, use modules/host-proxy/express/screenshots.ts and mount at GET /dev/screenshots/:id."
env_vars:
  - { name: LIVEDEV_ISSUES_URL, scope: host, required: true, example: "http://localhost:8787/issues", secret: false }
  - { name: LIVEDEV_SERVICE_TOKEN, scope: host, required: true, example: "<matches issues-service>", secret: true }
  - { name: LIVEDEV_APP_ORIGIN, scope: host, required: true, example: "https://app.acme.com", secret: false }
  - { name: LIVEDEV_SCREENSHOT_MAX_BYTES, scope: host, required: false, example: "10485760", secret: false }
routes:
  - { method: POST, path: /api/livedev/issues, multipart: true }
  - { method: GET, path: /dev/screenshots/:id }
mount_points: []
verification_steps:
  - "Unauthenticated: `curl -X POST host/api/livedev/issues -d '{}' -H 'content-type: application/json'` → 401."
  - "Authenticated: submit via overlay → response 201 with `{html_url, number}`."
  - "Missing env: unset LIVEDEV_SERVICE_TOKEN and retry → 500 `host_misconfigured`."
  - "Screenshot upload: multipart POST with a screenshot part returns a viewer URL in the issue body; fetching the viewer URL without a session → 401."
---

# Host-proxy — integration spec

Copy the handler that matches the host's framework, replace `getSessionUser` with the host's real auth, set the env vars, and you're done. The handler is intentionally thin — all GitHub logic lives in the issues-service.

Screenshot storage is host-owned. After copying the route files, implement `ScreenshotStore` from `@livedev/screenshots` against your S3 bucket or database, then uncomment the `store.put` block in the issues route and wire `store.get` in the viewer route.
