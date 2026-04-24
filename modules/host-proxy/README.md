# @livedev/host-proxy

Reference implementations of the same-origin `/api/livedev/issues` route an agent copies into a host application.

Two flavours ship:

- **`next/route.ts`** — Next.js App Router (`app/api/livedev/issues/route.ts`).
- **`express/handler.ts`** — Express/Node handler.

## Security contract

- The host-proxy is where session authentication happens. It **must** consult the host's existing auth (NextAuth, Clerk, a session cookie, etc.) and reject unauthenticated requests with 401. Never trust the client-sent identity.
- After auth, it forwards to `LIVEDEV_ISSUES_URL` with:
  - `Authorization: Bearer $LIVEDEV_SERVICE_TOKEN` (shared with the issues-service)
  - `X-Livedev-User: <server-resolved user id>`
- It returns the upstream response unchanged.

See `INTEGRATION.md` for the agent-facing spec.
