---
module_id: overlay-client
role: frontend
host_requirements:
  framework: next
  next: ">=13"
  react: ">=18"
dependencies: [whitelist, host-proxy]
host_changes:
  - action: create
    path: public/livedev-overlay.js
    source_snippet: modules/overlay-client/dist/livedev-overlay.js
    reason: "Browser bundle the overlay loader injects via <script src>. Copy verbatim. Regenerate from modules/overlay-client when upgrading."
  - action: modify
    path: app/layout.tsx
    source_snippet: modules/target-app/app/layout.tsx
    reason: "Mount <OverlayLoader userId={...} /> inside <body> and pass the host's current session user."
  - action: modify
    path: next.config.mjs
    source_snippet: modules/target-app/next.config.mjs
    reason: "Wrap the exported config with withLiveDev so JSX source attributes are injected and the whitelist is inlined as NEXT_PUBLIC_LIVEDEV_WHITELIST."
  - action: create
    path: livedev.whitelist.json
    source_snippet: modules/target-app/livedev.whitelist.json
    reason: "Host-app user allowlist. Empty array = nobody."
env_vars:
  - { name: NEXT_PUBLIC_LIVEDEV_ENABLED, scope: host, required: false, example: "true", secret: false }
mount_points:
  - "Root layout, inside <body>, after {children}."
routes: []
verification_steps:
  - "Open host app in a browser. DevTools console: `window.__LIVEDEV__` returns `{ endpoint, userId }` only — no token property."
  - "DevTools → Sources → search all loaded JS for `api.github.com`. Zero hits."
  - "Click the Live-Dev toggle, click any element, submit a prompt. Network tab shows one same-origin POST to `/api/livedev/issues`."
---

# Overlay-client — integration spec

Copy the three pieces above, wire the React component into your root layout with the current session user, and wrap `next.config` with `withLiveDev`. No credentials are passed through the browser — submissions go to the host's own route, which is added via the `host-proxy` module.
