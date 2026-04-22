# Live-Dev — Backlog

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

## Phase 0 — Scaffold

- [ ] P0.1 Initialize pnpm workspace at repo root (`package.json`, `pnpm-workspace.yaml`, shared `tsconfig.base.json`)
- [ ] P0.2 Add `.gitignore`, `.editorconfig`, `.nvmrc`
- [ ] P0.3 Create `packages/target-app` — Next.js 15 App Router, TS, Tailwind
- [ ] P0.4 Populate target-app with ~8 components: Header, Nav, ProductCard, ProductGrid, CheckoutForm, CartSummary, SettingsPage, Footer
- [ ] P0.5 Create empty `packages/overlay` and `packages/backend` with stub `package.json`
- [ ] P0.6 Root scripts: `pnpm dev` runs target-app + backend in parallel
- [ ] P0.7 README at root explaining how to run

## Phase 1 — Overlay + build-time tagging

- [ ] P1.1 Install `@locator/runtime` + `@locator/babel-jsx` (or Next.js SWC equivalent) in target-app
- [ ] P1.2 Verify `data-source-file` / `data-source-line` attributes appear in dev DOM
- [ ] P1.3 Scaffold `packages/overlay` as a small vanilla-TS bundle (esbuild)
- [ ] P1.4 Overlay: floating toggle button ("Prompt mode on/off")
- [ ] P1.5 Overlay: element picker — hover highlight + outline + component-name tooltip
- [ ] P1.6 Overlay: click → panel with prompt textarea + captured context preview
- [ ] P1.7 Overlay: screenshot capture of the clicked element (`html-to-image`)
- [ ] P1.8 Overlay: inject into target-app dev build via Next.js layout (dev-only guard)
- [ ] P1.9 Smoke test: hover/click produces correct `{file, line, componentName}` — console only

## Phase 2 — Backend + tmux runner

- [ ] P2.1 Scaffold `packages/backend` as Hono + TypeScript + SQLite (`better-sqlite3`)
- [ ] P2.2 DB schema: `requests`, `sessions`, `logs`, `users`
- [ ] P2.3 WebSocket endpoint `/ws` for overlay → backend
- [ ] P2.4 `tmux-runner.ts`: create worktree → new branch → `tmux new-session -d` → launch `claude` CLI
- [ ] P2.5 `tmux pipe-pane -o 'cat >> logs/<id>.log'` → tail into WS stream
- [ ] P2.6 `session-registry.ts`: track active sessions, expose "how to attach" string
- [ ] P2.7 Permission config for headless Claude runs (settings.json in worktree)
- [ ] P2.8 Dashboard UI (Next.js under backend): Requests list + Request detail + live log tail
- [ ] P2.9 End-to-end: overlay prompt → backend job → Claude edits file → diff viewable in dashboard

## Phase 3 — GitHub + Railway PR flow

- [ ] P3.1 Octokit integration, GitHub App or PAT config
- [ ] P3.2 On Claude success: `git push` branch, `gh pr create` with prompt + screenshot in body
- [ ] P3.3 Railway project config: enable PR environments
- [ ] P3.4 Listen to Railway deployment webhook (or poll API) → store preview URL on request
- [ ] P3.5 Dashboard: show PR link, Railway preview URL, checks status
- [ ] P3.6 Merge button → Octokit merge → Railway prod deploy
- [ ] P3.7 Basic role gate: only `dev` role can click Merge

## Phase 4 — Code graph spike

- [ ] P4.1 Indexer A: `scip-typescript` wrapper, output normalized JSON per commit SHA
- [ ] P4.2 Indexer B: `ast-grep` custom rules, output normalized JSON per commit SHA
- [ ] P4.3 Graph store in backend, keyed by SHA
- [ ] P4.4 Graph lookup API: `GET /graph/:sha/component/:id`
- [ ] P4.5 Context assembler: merges build-time tags + graph lookup into Claude prompt
- [ ] P4.6 Eval harness: 5 fixed prompts × {A, B, A+B}
- [ ] P4.7 Record tokens, success, human-intervention count in `eval/results.json`
- [ ] P4.8 Write-up and decision

## Phase 5 — Client UX polish

- [ ] P5.1 Context-preview step: overlay shows "this is what we'll send" before submitting
- [ ] P5.2 GitHub OAuth + role assignment
- [ ] P5.3 Per-user rate limits on prompt submission
- [ ] P5.4 Request comments / revision thread
- [ ] P5.5 Dashboard polish: empty states, errors, filtering
- [ ] P5.6 Docs: "how to add Live-Dev to your repo"

## Later / parking lot

- [ ] Vue and Svelte support (relies more on graph track)
- [ ] Self-hosted runner option (no central backend)
- [ ] Multi-repo dashboard
- [ ] Auto-generated test harness per prompt
- [ ] Claude cost dashboard per client / per repo
