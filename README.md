# Live-Dev

A point-and-prompt dev interface for web apps. Clients click a component in a running app, describe a change in plain language, and a Claude Code agent runs in a tmux pane to produce a branch + PR + Railway preview.

## Packages

- `packages/target-app` — Next.js 15 sample app (the testbed)
- `packages/overlay` — injectable element-picker + prompt panel
- `packages/backend` — orchestrator, dashboard UI, tmux runner (Phase 2+)

## Run

```bash
pnpm install
pnpm dev
```

- target-app: http://localhost:3000
- backend dashboard (Phase 2+): http://localhost:3001

## Whitelist

Access to the livedev overlay is gated by `livedev.whitelist.json` at the consumer app's root:

```json
{
  "allowedUsers": ["admin@example.com", "another-admin@example.com"]
}
```

- **App-user identity, not GitHub identity.** The configured GitHub PAT is the app's shared service credential — it authorises issue creation but doesn't identify the caller. The caller is identified by the consumer app's own session (email, user id, whatever the app already uses to mark an admin).
- **Fail-closed:** an empty or missing `allowedUsers` array means nobody is allowed.
- **Two enforcement layers:** the consumer app passes the current session user to `<OverlayLoader userId={...} />`; the overlay script only loads if that id is whitelisted, and the overlay bundle re-checks before posting to GitHub. The backend `/issues` endpoint reads `X-Livedev-User` from its caller and rejects non-whitelisted ids.
- **Build-time inlining:** the list is inlined into the client bundle as `NEXT_PUBLIC_LIVEDEV_WHITELIST` by the `withLiveDev` Next.js wrapper, so `next.config.js` must use `withLiveDev(...)` for the frontend gate to pick up the file. Restart `next dev` after editing the JSON.
- **Backend consumers** import the loader directly via `@kikirrin/livedev-next/server` (`loadWhitelist`, `isAllowed`).

## Docs

- Overview: `.claude/files/overview.md`
- Backlog: `.claude/files/backlog.md`
- Current sprint: `.claude/files/sprint.md`
