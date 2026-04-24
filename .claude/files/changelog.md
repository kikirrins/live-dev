# Changelog

## 2026-04-24 — migration: npm package → open-source template repo

Reshaped Live-Dev from a publishable `@kikirrin/livedev-next` npm package into a **GitHub template repo** that coding agents integrate module-by-module (the way you'd integrate Stripe), and hardened the credential flow in the same pass. Two commits: `20db241` (rename + scaffold), `1110323` (content/security edits).

### Architecture: three tiers, zero browser credentials
```
Browser (overlay-client)  →  Host app (host-proxy)  →  Issues service  →  GitHub
     no credentials         session auth + forward      holds PAT
```
Previously the overlay held a GitHub PAT on `window.__LIVEDEV_GITHUB__` and called `api.github.com` directly — any visitor with DevTools could steal it. Now the overlay POSTs same-origin to a host route; the host authenticates its own session, forwards with a shared service token + resolved user id; only the sidecar sees the PAT.

### Layout: `packages/*` → `modules/*`
Every directory is now a drop-in fullstack slice rather than a publishable package. All module `package.json`s are `private: true`; consumers copy files per the agentic RFP.

- **`modules/overlay-client/`** — browser bundle (`browser/`), React mount (`react/OverlayLoader.tsx`), Next.js webpack wrapper (`webpack/withLiveDev.cjs` + `loader.cjs`), prebuilt `dist/livedev-overlay.js`.
- **`modules/host-proxy/`** — reference Next.js App Router route (`next/route.ts`) + Express handler (`express/handler.ts`) that agents copy into host apps. Replaces its stub `getSessionUser` with the host's real auth.
- **`modules/issues-service/`** — Hono sidecar holding the PAT. Constant-time service-token compare, CORS origin allowlist, `X-Livedev-User` header as the trusted caller id, authoritative whitelist check, `/health` endpoint.
- **`modules/whitelist/`** — shared `isAllowed` + `loadWhitelist`, JSON Schema for `livedev.whitelist.json`, `LIVEDEV_WHITELIST_PATH` override, fail-closed directory walk.
- **`modules/credentials/`** — PAT-vs-GitHub-App setup docs, scope minimization, rotation.
- **`modules/target-app/`** — reference host that wires all four pieces together. Mock session at `app/lib/session.ts`, `/api/livedev/issues` proxy, whitelist JSON, `.env.local.example`.

### Security refactor (applied inline with the moves)
- Overlay: dropped `GitHubConfig`/`__LIVEDEV_GITHUB__`; drops direct `api.github.com` calls; reads `window.__LIVEDEV__ = { endpoint, userId }` instead. No token ever on `window`.
- OverlayLoader: dropped `githubToken`/`githubRepo` props, added `endpoint` prop.
- Issues-service: PAT + repo + service token from env only (no header override); `X-Github-Repo` header support removed so a compromised browser can't retarget the service; label-ensure moved server-side.

### Agentic RFP
Root `README.md` carries a machine-readable `agentic-rfp` YAML block (version, modules, install_order, security_invariants). Each module has an `INTEGRATION.md` with schema: `module_id`, `role`, `host_requirements`, `host_changes[]`, `env_vars[]`, `credentials`, `mount_points`, `routes[]`, `dependencies[]`, `verification_steps[]`. An agent reads the RFP, follows per-module instructions, copies snippets into the host repo, runs verification.

### Package renames
`@kikirrin/livedev-next` → split into `@livedev/overlay-client` + `@livedev/whitelist`; `@kikirrin/backend` → `@livedev/issues-service`. Root `pnpm-workspace.yaml` updated to `modules/*`.

### Deleted
`packages/livedev-next/{src/cli.ts, src/index.ts, src/server.ts, INSTALL.md, INSTALL-VENDOR.md, tsup.config.ts, dist/}` — CLI init + aggregator barrels + npm build pipeline all superseded by the RFP + per-module integration.

### Out of scope (deferred)
Multi-provider backends (Linear / Jira / GitLab); GitHub App install flow (PAT ships first, App documented as forward-compatible); npm publishing (all modules stay private); downstream PR-generation pipeline / agent runtime orchestration (overlay stops at issue creation).

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

## 2026-04-24 — screenshot capture + host-owned storage (`6328bc8`)

Overlay now captures a **real viewport raster** via the Screen Capture API (`navigator.mediaDevices.getDisplayMedia`) when the user submits a change request, so downstream agents have visual context. The PNG is stored by the host (never by the sidecar) and served through a session-authenticated viewer route — no public or signed URLs.

### Flow
```
Browser overlay
  │ getDisplayMedia → canvas (+ highlight rect) → PNG blob
  ▼ multipart POST /api/livedev/issues
Host-proxy
  │ 1. session auth
  │ 2. ScreenshotStore.put(bytes) → id       ← host implements (S3 / DB)
  │ 3. append "[View screenshot](…/dev/screenshots/<id>)" to issue body
  │ 4. forward {title, body, source} JSON to sidecar
  ▼
Issues-service   (unchanged — never sees the PNG)

Viewer:
Browser → GET /dev/screenshots/:id
Host-proxy → session auth + whitelist → ScreenshotStore.get(id) → stream PNG
```

### New
- **`modules/screenshots/`** — contract-only module. `src/storage.ts` exports the `ScreenshotStore` interface. `INTEGRATION.md` ships two recipes: **S3 primary** (`@aws-sdk/client-s3`, `ACL: "private"`, `s3://bucket/<prefix>/<uuid>.png`) and **DB fallback** (`screenshots(id, png blob, owner_id, created_at)` table). Host picks one. Security invariants: unguessable UUID, `get` does not authorize, private backend.
- `modules/overlay-client/browser/src/capture.ts` — `captureViewport(highlight?)` uses `getDisplayMedia({ preferCurrentTab: true })`, grabs one frame via `<video>` + `drawImage`, draws a translucent blue rect at the clicked element's bbox, stops all tracks on every exit path, returns `null` on user-cancel (best-effort; issue still submits without).
- `modules/host-proxy/next/screenshots/[id]/route.ts` + `modules/host-proxy/express/screenshots.ts` — viewer reference handlers. Session auth → `isAllowed` check → `store.get` → `Content-Type: image/png`, `Cache-Control: private, no-store`.
- `modules/target-app/app/lib/screenshot-store.ts` — **dev-only** filesystem `ScreenshotStore` adapter so the reference host runs offline. Writes `<uuid>.png` + `<uuid>.json` to `LIVEDEV_SCREENSHOT_DIR` (default `./.livedev-screenshots`). UUID regex validates the id before touching FS (path-traversal guard).
- `modules/target-app/app/api/livedev/screenshots/[id]/route.ts` — real viewer wired to the fs store.

### Modified
- `modules/overlay-client/browser/src/index.ts` — captures the target rect **before** `closePanel` (so the panel isn't in the frame), calls `captureViewport` inside `requestAnimationFrame`, posts `FormData` with `meta` (JSON) + `screenshot` (blob) parts. Falls back to JSON body when capture returns `null`.
- `modules/overlay-client/browser/src/screenshot.ts` — **deleted**. The old synthetic render is gone.
- `modules/host-proxy/next/route.ts` + `modules/host-proxy/express/handler.ts` — detect `multipart/form-data`, enforce `LIVEDEV_SCREENSHOT_MAX_BYTES` (default 10MB) → 413 on overrun, call `store.put`, append viewer link to `meta.body` before forwarding the JSON (with the link) to the sidecar. The sidecar still only ever receives `{title, body, source}`.
- `modules/host-proxy/INTEGRATION.md` — `dependencies: [credentials, screenshots]`, adds `LIVEDEV_APP_ORIGIN` + `LIVEDEV_SCREENSHOT_MAX_BYTES` env vars, adds `POST /api/livedev/issues (multipart)` + `GET /dev/screenshots/:id` routes, adds the new viewer `host_changes` entry.
- `modules/target-app/app/api/livedev/issues/route.ts` — multipart handling + real `store.put` call.
- `modules/target-app/package.json` — depends on `@livedev/screenshots`.
- `modules/target-app/.env.local.example` — `LIVEDEV_APP_ORIGIN=http://localhost:3000`, `LIVEDEV_SCREENSHOT_DIR=./.livedev-screenshots`.
- `.gitignore` — `.livedev-screenshots/`.
- `modules/issues-service/tsconfig.json` — switched `moduleResolution` to `Bundler` to match how the rest of the workspace (Next, esbuild, tsx) consumes shared packages; `@livedev/whitelist/server` imports drop the `.js` extensions that were only needed for Node16.
- `README.md` — `screenshots` module added to agentic-rfp `modules` list (role: shared) and to `install_order` right after `credentials`. New `security_invariant`: "Screenshots are served only through a session-authenticated host route; no public or signed URLs."

### Security invariants verified end-to-end
- Browser bundle: 0 hits for `api.github.com` / `__LIVEDEV_GITHUB__` / any GitHub token reference.
- Sidecar source: 0 hits for `FormData` / `multer` / multipart handling. PNG bytes never reach it.
- Multipart upload round-trip: PNG stored, viewer returns byte-identical image with `Content-Type: image/png`.
- Unknown id → 404. Path-traversal id (`..%2Fetc%2Fpasswd`) → 404 (UUID regex rejects before FS touch).
- 11MB upload → 413 `screenshot_too_large`.
- Meta file contains only `{ownerId, createdAt}` — no PII beyond the host-app user id.

### Out of scope (deferred)
S3 / DB adapter code (hosts implement against the contract); screenshot retention / GC (host lifecycle rules); inline image rendering in GitHub issue body (would require public or signed URL → breaks invariant); multi-frame / screencast capture; in-overlay editing (crop / blur / annotate); rich `/dev/screenshots/:id` viewer page (MVP streams PNG directly; dashboard integration left to the dashboard-client agent).
