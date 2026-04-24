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
    notes: "For Express hosts, use modules/host-proxy/express/screenshots.ts and mount at GET /api/livedev/screenshots/:id."
env_vars:
  - { name: LIVEDEV_ISSUES_URL, scope: host, required: true, example: "http://localhost:8787/issues", secret: false }
  - { name: LIVEDEV_SERVICE_TOKEN, scope: host, required: true, example: "<matches issues-service>", secret: true }
  - { name: LIVEDEV_APP_ORIGIN, scope: host, required: true, example: "https://app.acme.com", secret: false }
  - { name: LIVEDEV_SCREENSHOT_MAX_BYTES, scope: host, required: false, example: "10485760", secret: false }
routes:
  - { method: POST, path: /api/livedev/issues, multipart: true }
  - { method: GET, path: /api/livedev/screenshots/:id }
  - { method: GET, path: /api/livedev/diagnostic }
mount_points: []
verification_steps:
  - "Unauthenticated: `curl -X POST host/api/livedev/issues -d '{}' -H 'content-type: application/json'` → 401."
  - "Authenticated: submit via overlay → response 201 with `{html_url, number}`."
  - "Missing env: unset LIVEDEV_SERVICE_TOKEN and retry → 500 `host_misconfigured`."
  - "Screenshot upload: multipart POST with a screenshot part returns a viewer URL in the issue body; fetching the viewer URL without a session → 401."
  - "Compile-time safety: omitting `getUser` from createIssuesRoute fails TypeScript — no runtime throw."
---

# Host-proxy — integration spec

Use the factories from `@livedev/host-proxy/create` (Next) or `@livedev/host-proxy/express` (Express). Each factory takes your session lookup and (for screenshot routes) your `ScreenshotStore` as typed, **required** arguments — forgetting to wire them is a compile error, not a runtime throw.

```ts
// app/api/livedev/issues/route.ts
import { createIssuesRoute } from "@livedev/host-proxy/create";
import { getSession } from "@/app/lib/session";
import { store } from "@/app/lib/screenshot-store"; // implements @livedev/screenshots

export const { POST } = createIssuesRoute({
  getUser: async (req) => getSession(req),
  store,
  // buildViewerUrl?: (id) => `${origin}/api/livedev/screenshots/${id}` (default)
  // maxBytes?: 10_485_760 (default)
});
```

The host-proxy is intentionally thin — all GitHub logic lives in the issues-service.

## Viewer URL

The canonical viewer path is `/api/livedev/screenshots/:id`. When the factory appends a "View screenshot" link to an issue body, it uses `buildViewerUrl(id)` — defaults to `` `${LIVEDEV_APP_ORIGIN}/api/livedev/screenshots/${id}` ``. Override the option when your host mounts the viewer elsewhere.

## Trust model

`X-Livedev-User` is set server-side by the host-proxy **after** session authentication and forwarded to the sidecar. The sidecar trusts it because it also verifies `LIVEDEV_SERVICE_TOKEN` (constant-time compare). Only authorized host-proxies hold the service token — assumption: the sidecar is reachable only from host-proxy origins (see `LIVEDEV_ALLOWED_ORIGINS` on the sidecar, and your network boundary).

This is audit-quality, not cryptographic. A compromised host-proxy could already impersonate users against GitHub directly; HMAC-signing `X-Livedev-User` would not close a new gap. If your threat model needs to include a compromised host-proxy process, rotate the service token on detection and consider per-user signed tokens (follow-up design).

## Multipart forwarding

When the overlay posts `multipart/form-data`, the host-proxy:

1. Reads the `meta` JSON part and the `screenshot` PNG part.
2. Stores the PNG via `store.put(bytes, { ownerId, createdAt })`.
3. Appends `[View screenshot](<buildViewerUrl(id)>)` to `meta.body`.
4. Forwards **only** `JSON.stringify({ title, body, source })` to the sidecar — no binary, no multipart boundary, no file reference.

The sidecar never sees image bytes. Only the host (and whatever storage backend you wire) ever holds them.

## Diagnostic endpoint

`GET /api/livedev/diagnostic` is admin-gated (whitelisted session required) and returns `{ session, whitelist, sidecar, store, env }` with all secrets collapsed to booleans. Mount it in staging / dev to save "is my LIVEDEV_ISSUES_URL right?" debugging across rollouts. Unauthenticated → 401; authenticated but not whitelisted → 403.
