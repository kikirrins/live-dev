# @livedev/overlay-client

Frontend slice of Live-Dev. Three pieces that ship together:

- **`browser/`** — element-picker + prompt panel, compiled to a single ES module (`dist/livedev-overlay.js`).
- **`react/OverlayLoader.tsx`** — React component that mounts the bundle and passes the current session user.
- **`webpack/`** — `withLiveDev` Next.js config wrapper + JSX source-attribute loader (enables file:line display in the overlay).

## Security contract

- The browser **never holds a GitHub credential.** `OverlayLoader` only writes `window.__LIVEDEV__ = { endpoint, userId }`.
- All submissions are same-origin `POST` to the host's own route (default `/api/livedev/issues`). The host authenticates the session and forwards to `@livedev/issues-service`.
- The whitelist gate in `OverlayLoader` is a UX-only pre-check; the authoritative check runs server-side in the issues-service.

See `INTEGRATION.md` for the agent-facing integration spec.
