# Live-Dev — Current Sprint

**Sprint:** S1 — Scaffold + Overlay proof
**Dates:** 2026-04-14 → 2026-04-18
**Goal:** Have a running Next.js target-app where hovering any component highlights it and clicking logs `{file, line, componentName, screenshot}` to the console. No backend yet.

## In scope (this sprint)

- [~] P0.1 Initialize pnpm workspace
- [ ] P0.2 .gitignore / .editorconfig / .nvmrc
- [ ] P0.3 `packages/target-app` Next.js 15 + Tailwind
- [ ] P0.4 8 sample components populated
- [ ] P0.5 Stub `packages/overlay` + `packages/backend`
- [ ] P0.6 Root `pnpm dev` script
- [ ] P0.7 Root README
- [ ] P1.1 Install `@locator/runtime` + babel/SWC plugin
- [ ] P1.2 Verify `data-source-*` attrs in dev DOM
- [ ] P1.3 Overlay package scaffolded with esbuild
- [ ] P1.4 Floating toggle
- [ ] P1.5 Element picker with hover highlight
- [ ] P1.6 Prompt panel on click
- [ ] P1.7 Element screenshot
- [ ] P1.8 Dev-only injection into target-app
- [ ] P1.9 Smoke test

## Definition of done (sprint)

Running `pnpm dev` at the repo root starts the target-app on :3000. Toggling the overlay on, hovering components shows an outline with the component name. Clicking a component opens the panel, shows a screenshot preview, and on submit logs the full context object to the browser console.

## Out of scope (explicitly)

- Any backend, tmux, or Claude CLI work (that's S2)
- GitHub/Railway integration (S3)
- Code graph (S4)
- Auth (S5)

## Current focus

Starting with P0.1–P0.3. Target-app comes first so the overlay has something real to attach to.

## Notes / blockers

- None yet

## Log

- 2026-04-14 — Sprint created. Plan and backlog finalized.
