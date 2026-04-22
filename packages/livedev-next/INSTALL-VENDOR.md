# Vendoring `@kikirrin/livedev-next` into a target monorepo

Use this guide when you need the livedev package to **build as part of the target monorepo** — typically because the target deploys to Railway (or similar) and can't resolve a `file:` dep, a global `pnpm link`, or an unpublished npm name at build time.

**Trade-off:** the livedev source now lives in two places. You maintain the canonical copy in this repo (`/Users/kikirrin/Documents/sandpalace/apps/live-dev/packages/livedev-next`) and sync updates into the target monorepo's copy by hand. Keep diffs small.

The example target monorepo below is `sandlabs`. Substitute your own path.

## 1. Copy the package source

Copy **only the two packages livedev needs at runtime/build**: `livedev-next` (the Next.js integration) and `overlay` (the browser bundle whose prebuilt output `livedev-next` ships in `assets/`).

```bash
LIVEDEV_SRC=/Users/kikirrin/Documents/sandpalace/apps/live-dev
TARGET=/path/to/sandlabs

mkdir -p $TARGET/packages/livedev-next $TARGET/packages/livedev-overlay

# livedev-next — copy source, config, and the prebuilt overlay asset.
# Do NOT copy node_modules or dist; the target monorepo will build dist itself.
rsync -av --delete \
  --exclude node_modules --exclude dist \
  $LIVEDEV_SRC/packages/livedev-next/ $TARGET/packages/livedev-next/

# overlay — copy source only; livedev-next/assets already has the built bundle,
# so overlay is optional unless you plan to edit overlay UI inside the target.
rsync -av --delete \
  --exclude node_modules --exclude dist \
  $LIVEDEV_SRC/packages/overlay/ $TARGET/packages/livedev-overlay/
```

If you don't plan to edit the overlay UI from inside the target monorepo, skip the overlay copy — `packages/livedev-next/assets/livedev-overlay.js` is already bundled and gets copied to `public/` by `livedev init`.

## 2. Register the package(s) in pnpm-workspace.yaml

In `$TARGET/pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"   # make sure this glob covers the new packages/livedev-next
```

Most pnpm monorepos already glob `packages/*`, so this is usually a no-op.

## 3. Depend on it from the consumer app

In the consumer app's `package.json` (e.g. `$TARGET/apps/<your-next-app>/package.json`):

```json
"dependencies": {
  "@kikirrin/livedev-next": "workspace:*"
}
```

Then from the target monorepo root:

```bash
pnpm install
pnpm --filter @kikirrin/livedev-next build
```

## 4. Integrate in the consumer app

Identical to the non-vendored install — these steps are summarised here; see [INSTALL.md](./INSTALL.md) for details and rationale.

### 4a. Run `livedev init`

```bash
cd $TARGET/apps/<your-next-app>
pnpm exec livedev init
```

Copies `public/livedev-overlay.js` and appends env var placeholders to `.env.local`.

### 4b. Wire `withLiveDev` into `next.config.*`

```js
// next.config.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const withLiveDev = require("@kikirrin/livedev-next/webpack");

const nextConfig = { reactStrictMode: true };
export default withLiveDev(nextConfig);
```

### 4c. Mount behind an admin guard

```tsx
// app/livedev-guard.tsx
import { getSession } from "@/lib/auth";
import { OverlayLoader } from "@kikirrin/livedev-next";

export async function LiveDevGuard() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return null;
  return <OverlayLoader userId={session.user.email} />;
}
```

```tsx
// app/layout.tsx
<body>
  {children}
  <LiveDevGuard />
</body>
```

### 4d. Create `livedev.whitelist.json` at the consumer app root

```json
{
  "allowedUsers": ["admin@example.com"]
}
```

`withLiveDev` reads this at `next build` / `next dev` time and inlines it as `NEXT_PUBLIC_LIVEDEV_WHITELIST`. Restart the dev server after editing.

## 5. Railway / CI build notes

- `pnpm --filter @kikirrin/livedev-next build` **must run before** the consumer app builds. In a standard pnpm monorepo with `"build": "tsup"` in `livedev-next`, `pnpm install && pnpm -r build` (or `pnpm --filter <consumer-app>... build` to build only the graph leading to the consumer) handles this automatically.
- Railway's Nixpacks / pnpm buildpack will include `packages/livedev-next` in the workspace install and the `build` script runs as part of `pnpm -r build`. No extra config needed if your existing Railway build command already runs the full workspace build.
- `next.config.mjs` uses `createRequire` to load `webpack.cjs` — this works in Railway's Node runtime.
- The overlay asset (`packages/livedev-next/assets/livedev-overlay.js`) is copied to the consumer app's `public/` by `livedev init`. **Commit the copied `public/livedev-overlay.js` into the target repo** so Railway builds don't need to run the init CLI.

## 6. Staying in sync with upstream livedev

The vendored copy will drift. Keep a short process:

```bash
# Diff upstream vs vendored
diff -r \
  --exclude node_modules --exclude dist \
  /Users/kikirrin/Documents/sandpalace/apps/live-dev/packages/livedev-next \
  $TARGET/packages/livedev-next
```

**Suggested cadence:** re-sync with `rsync` (step 1) whenever you ship a livedev feature upstream. Commit the resync as one commit in the target repo so it's easy to revert.

**Do NOT fork** the vendored copy unless absolutely necessary. If you must patch, leave a `// LIVEDEV-FORK:` comment at the top of the changed file so the next rsync reviewer sees it.

## 7. Verify

```bash
cd $TARGET
pnpm install
pnpm --filter @kikirrin/livedev-next build
pnpm --filter <your-next-app> dev
```

- Sign in as a whitelisted admin → overlay loads.
- Sign in as a non-admin → `LiveDevGuard` returns null, overlay never loads.
- Admin whose email isn't in `allowedUsers` → console: `[livedev] overlay disabled: user not in whitelist`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '@kikirrin/livedev-next'` at build | Package not in workspace OR `build` not run yet | Check `pnpm-workspace.yaml` glob; run `pnpm --filter @kikirrin/livedev-next build` before the consumer builds |
| `Cannot find module '@kikirrin/livedev-next/webpack'` | Package name mismatch between vendored copy and the `require(...)` call | Open `packages/livedev-next/package.json`; the `"name"` field must match your `require` path |
| Railway deploy succeeds but overlay 404s at `/livedev-overlay.js` | `public/livedev-overlay.js` wasn't committed | Commit the file, or add a postinstall that copies `node_modules/@kikirrin/livedev-next/assets/livedev-overlay.js` to `public/` |
| Whitelist edit doesn't take effect in Railway | `withLiveDev` reads the file at config-load time | Trigger a new deploy; no amount of client-side reload helps |
| Duplicate React errors | Consumer has a different React major than `livedev-next`'s peerDep | Align React versions; `livedev-next` declares `"react": ">=18"` as a peer |
