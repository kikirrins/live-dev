# Live-Dev

Point-and-prompt change requests for web apps. A user clicks any element in a running app, describes the change they want, and a GitHub issue is created with file + line context. An agent can later pick that issue up and produce a PR.

This repo is **not an npm package.** It is a template + specification. Copy the modules you need into your host app (the way you'd integrate Stripe), wire up the credentials, and ship.

## Integration (for humans)

Four components, three tiers:

```
Browser (overlay-client)  ──►  Host app (host-proxy)  ──►  Issues service  ──►  GitHub
       no credentials          session-auth, forwards         holds PAT
```

- **`modules/overlay-client`** — the browser UI + React mount. Zero credentials in the browser. Posts same-origin.
- **`modules/host-proxy`** — copy the Next.js or Express handler into your host app. Uses your existing auth.
- **`modules/issues-service`** — standalone sidecar holding the GitHub credential. Service-token auth + CORS allowlist.
- **`modules/whitelist`** — shared `livedev.whitelist.json` format + helpers.
- **`modules/credentials`** — setup docs for the PAT (and forward-compatible path to a GitHub App).

A working reference host lives in `modules/target-app`.

## Agentic RFP

The block below tells an AI agent what to copy and in what order. Each module carries a more detailed `INTEGRATION.md` with machine-readable host_changes, env_vars, and verification steps.

```agentic-rfp
version: 1
product: livedev
summary: >
  Click-to-file GitHub issues from any page in a web app. Integrate as a
  fullstack package: browser bundle, host-side proxy route, and an issues
  service that holds the GitHub credential. The browser never holds a secret.
modules:
  - id: overlay-client
    role: frontend
    source_path: modules/overlay-client
    integration_doc: modules/overlay-client/INTEGRATION.md
  - id: host-proxy
    role: backend
    source_path: modules/host-proxy
    integration_doc: modules/host-proxy/INTEGRATION.md
  - id: issues-service
    role: sidecar
    source_path: modules/issues-service
    integration_doc: modules/issues-service/INTEGRATION.md
  - id: whitelist
    role: shared
    source_path: modules/whitelist
  - id: credentials
    role: setup
    source_path: modules/credentials
    integration_doc: modules/credentials/INTEGRATION.md
install_order:
  - credentials
  - issues-service
  - host-proxy
  - overlay-client
security_invariants:
  - "No GitHub credential in the browser or in any bundle reachable by the browser."
  - "Host-proxy authenticates the session using the host's existing auth, not a client-sent id."
  - "Issues-service verifies a shared service token in constant time before doing anything else."
  - "Whitelist checks are authoritative on the server; any client-side check is UX only."
verification: modules/target-app/README.md
```

## Modules

| Module | Role | Doc |
|---|---|---|
| `modules/overlay-client` | frontend | [`INTEGRATION.md`](modules/overlay-client/INTEGRATION.md) |
| `modules/host-proxy` | backend | [`INTEGRATION.md`](modules/host-proxy/INTEGRATION.md) |
| `modules/issues-service` | sidecar | [`INTEGRATION.md`](modules/issues-service/INTEGRATION.md) |
| `modules/whitelist` | shared | [`README.md`](modules/whitelist/README.md) |
| `modules/credentials` | setup | [`INTEGRATION.md`](modules/credentials/INTEGRATION.md) |

## Reference host

`modules/target-app` is a small Next.js 15 app that demonstrates all four pieces wired together. Its mock session at `app/lib/session.ts` stands in for real auth.

```bash
pnpm install
cp modules/target-app/.env.local.example modules/target-app/.env.local
cp modules/issues-service/.env.example   modules/issues-service/.env
# fill LIVEDEV_GITHUB_PAT and LIVEDEV_GITHUB_REPO in modules/issues-service/.env
pnpm dev
# target-app  :3000
# issues-svc  :8787
```

Then click the `● Live-Dev` toggle on `http://localhost:3000`, pick an element, describe a change, submit. The issue appears in the configured repo with label `live-dev`.
