# Live-Dev — Project Overview

## What it is

A **WordPress-style dashboard for Claude Code development**. Drops into any web app as an in-app overlay + remote backend. Agency clients and devs share the same UI: clients click on a live component, describe a change in plain language, and the system runs Claude Code in a tmux pane on a new branch, opens a PR, attaches a Railway preview URL, and lets a dev manually merge.

## Goals

1. **Point-and-prompt dev UX.** Hovering a component in the running app surfaces its source location. Clicking opens a prompt panel pre-filled with captured context.
2. **Full Claude Code workflow, automated.** Each request = git worktree + new branch + tmux session running real `claude` CLI (not the SDK). Human devs can `tmux attach` to take over at any time.
3. **Safe release path.** Every change goes through GitHub PR + Railway PR environment + manual merge. No auto-merge.
4. **Reusable service.** Works against any target repo via config, not a bespoke integration.

## Non-goals (v0)

- Multi-framework support beyond React/Next.js
- Auto-merge or one-click deploy to prod without review
- Replacing the dev's terminal — tmux attach is a first-class handoff, not a fallback
- Complex RBAC beyond `client` vs `dev`

## Architecture snapshot

```
target web app (overlay script + source tags)
        │ WS
        ▼
Live-Dev backend (Hono + SQLite + tmux runner + dashboard)
        │
        ├── tmux → claude CLI → git worktree → branch → commit → push
        ├── Octokit → GitHub PR
        └── Railway API → PR preview URL
```

## Monorepo layout

- `packages/target-app` — Next.js 15 sample app (testbed)
- `packages/overlay` — injectable element-picker + prompt panel
- `packages/backend` — orchestrator, dashboard UI, tmux runner, graph service

## Component mapping strategy

Install **both** approaches and evaluate side-by-side:
- **Track A — Build-time annotations**: Vite/SWC plugin injects `data-source-file` / `data-source-line`. Exact file:line, zero relationship context.
- **Track B — Static code graph**: `scip-typescript` or `ast-grep` produces a per-commit graph of components/imports/renders. Rich context, higher infra cost.

Evaluation harness: 5 representative prompts × {A, B, A+B}. Measure success rate, tokens, human intervention. Pick winner in Phase 4.

## Key decisions (locked)

| Decision | Choice |
|---|---|
| Primary users | Agency devs + clients sharing UI |
| Deploy flow | Branch → PR → Railway preview → manual merge |
| Architecture | In-app overlay + remote backend |
| Claude runner | `claude` CLI inside tmux panes (not Agent SDK) |
| Preview envs | Railway PR environments (not Vercel/Netlify) |
| Component mapping | Install both A and B; evaluate empirically |

## Risks to revisit

- **Graph freshness per branch** — index in CI per-commit, key by SHA
- **Cost per prompt** — measure in Phase 2; add "refine request" pre-step if >$0.50 avg
- **Overlay security** — dev/staging builds only, backend-issued short-lived tokens
- **tmux session leaks** — session registry with TTL cleanup

## References

- Full plan: `~/.claude/plans/crystalline-rolling-meadow.md`
- Backlog: `.claude/files/backlog.md`
- Current sprint: `.claude/files/sprint.md`
