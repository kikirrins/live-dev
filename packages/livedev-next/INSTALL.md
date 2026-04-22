# Installing `@kikirrin/livedev-next` in another project (local, unpublished)

This guide is for another agent/developer consuming livedev in a **separate Next.js app** without publishing to npm. It assumes the livedev monorepo lives at `/Users/kikirrin/Documents/sandpalace/apps/live-dev` on the same machine.

## Access model (read this first)

- The configured GitHub PAT is **the app's shared service credential** — it authorises issue creation against your project repo. It does **not** identify the person clicking the overlay.
- The person clicking the overlay is identified by **your app's own session** (email, user id — whatever you already use). Livedev does string equality against a static whitelist; it neither calls your DB nor talks to GitHub for identity.
- Two independent gates:
  1. Your app only renders `<OverlayLoader userId={session.user.email} />` when the session user is an admin.
  2. Livedev rechecks `userId` against `livedev.whitelist.json`. Fail-closed on missing file, empty list, or mismatch.
- **The overlay still talks to GitHub directly from the browser using the shared PAT.** If you can't ship a PAT in the client bundle (e.g. external users, CSP, audit), use the optional `@kikirrin/backend` proxy described at the end of this guide — your server holds the PAT and the browser calls your server with the session cookie.

## 1. Build the package once in the livedev repo

```bash
cd /Users/kikirrin/Documents/sandpalace/apps/live-dev
pnpm install
pnpm --filter @kikirrin/livedev-next build
```

Rerun after any change in `packages/livedev-next/src/`. For active development, use `pnpm --filter @kikirrin/livedev-next dev` (watch mode).

## 2. Install into the consumer app — pick ONE

### Option A — `file:` dep (simplest, no watch)

```json
"dependencies": {
  "@kikirrin/livedev-next": "file:/Users/kikirrin/Documents/sandpalace/apps/live-dev/packages/livedev-next"
}
```

Then `pnpm install`. Re-run `pnpm install` after rebuilding the package.

### Option B — `pnpm link` (true symlink, picks up rebuilds automatically)

```bash
# one-time, in the livedev package dir
cd /Users/kikirrin/Documents/sandpalace/apps/live-dev/packages/livedev-next
pnpm link --global

# in the consumer app dir
pnpm link --global @kikirrin/livedev-next
```

### Option C — local tarball (closest to a real npm install)

```bash
cd /Users/kikirrin/Documents/sandpalace/apps/live-dev/packages/livedev-next
pnpm pack
# in consumer app
pnpm add /absolute/path/to/kikirrin-livedev-next-<version>.tgz
```

## 3. Run the init CLI in the consumer app

From the consumer app directory:

```bash
npx livedev init
```

This copies the overlay bundle to `public/livedev-overlay.js` and appends `NEXT_PUBLIC_GITHUB_TOKEN` / `NEXT_PUBLIC_GITHUB_REPO` placeholders to `.env.local`. Fill them in:

```
NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_app_service_pat   # needs "issues: write"
NEXT_PUBLIC_GITHUB_REPO=owner/repo
```

## 4. Wire `withLiveDev` into `next.config.*`

**Required** — the wrapper both adds source-location injection (dev only) AND inlines the whitelist as `NEXT_PUBLIC_LIVEDEV_WHITELIST`. Without it, the overlay will never load (fail-closed).

### `next.config.js` (CommonJS)

```js
const withLiveDev = require("@kikirrin/livedev-next/webpack");

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = withLiveDev(nextConfig);
```

### `next.config.mjs` (ESM)

```js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const withLiveDev = require("@kikirrin/livedev-next/webpack");

const nextConfig = { reactStrictMode: true };
export default withLiveDev(nextConfig);
```

## 5. Mount `<OverlayLoader />` behind an admin guard

The consumer app must pass the current user's identifier as the `userId` prop. Do this in a server component so non-admins never receive the overlay loader in the first place.

`app/livedev-guard.tsx` (example):

```tsx
import { getSession } from "@/lib/auth";
import { OverlayLoader } from "@kikirrin/livedev-next";

export async function LiveDevGuard() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return null;
  return <OverlayLoader userId={session.user.email} />;
}
```

`app/layout.tsx`:

```tsx
import { LiveDevGuard } from "./livedev-guard";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <LiveDevGuard />
      </body>
    </html>
  );
}
```

Pick whichever identifier you already use as an admin key — email, user id, username — just use the **same** identifier in the whitelist file (next step).

## 6. Create the whitelist at the consumer app root

`livedev.whitelist.json` at the root of the consumer app (same directory as `package.json` / `next.config.*`):

```json
{
  "allowedUsers": ["admin@example.com", "another-admin@example.com"]
}
```

- Populate with the app-user identifiers matching what you pass to `<OverlayLoader userId={...} />`.
- Empty array or missing file ⇒ nobody is allowed (fail-closed).
- `withLiveDev` reads this at `next build` / `next dev` time and inlines it; **restart the dev server after editing**.

## 7. Verify

```bash
pnpm dev
```

- **Admin in whitelist:** overlay loads, floating toggle visible. Clicking a component → prompt panel → submit creates a GitHub issue with the `live-dev` label.
- **Admin not in whitelist** (or non-admin): console shows `[livedev] overlay disabled: user not in whitelist` (or `LiveDevGuard` simply renders nothing for non-admins). No toggle.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No overlay, no console message | `LiveDevGuard` returned `null` (user isn't ADMIN), or `NODE_ENV !== 'development'` in a prod build | Sign in as an admin, or set `NEXT_PUBLIC_LIVEDEV_ENABLED=true` |
| `[livedev] overlay disabled: user not in whitelist` while the session id looks right | Dev server was started before the whitelist file existed / was edited | Restart `pnpm dev` so `withLiveDev` re-reads the JSON |
| Whitelist uses emails but you passed `user.id` (or vice versa) | Identifier mismatch | Make the `userId` prop and the `allowedUsers` entries use the **same** field |
| Issue creation returns 401 from GitHub | PAT missing `issues:write` / `repo` scope | Regenerate with correct scopes |
| `Module not found: @kikirrin/livedev-next/server` | Old build without the `./server` subpath | Rebuild: `pnpm --filter @kikirrin/livedev-next build` |

## Upgrading after livedev changes

1. In the livedev repo: `pnpm --filter @kikirrin/livedev-next build`
2. Refresh the overlay bundle in `public/`:
   ```bash
   npx livedev init
   ```
3. `file:` dep → `pnpm install` again. `pnpm link` → no-op. Tarball → repack + reinstall.
4. Restart `pnpm dev`.

## Optional: backend proxy (when you can't ship the PAT to the client)

The default install puts the GitHub PAT in `NEXT_PUBLIC_GITHUB_TOKEN`, meaning it's embedded in the client bundle. Anyone who can load the app can read the token from DevTools. That's acceptable for a small internal team, but not for anything public.

If you need the token to stay server-side, run `@kikirrin/backend` alongside your app:

1. In the livedev repo: `pnpm --filter @kikirrin/backend build` (or `dev` for watch).
2. The backend listens on `:8787` and exposes `POST /issues`. It reads the PAT from `Authorization: Bearer <pat>` and the caller identity from `X-Livedev-User`.
3. In the consumer app, add a Next.js route handler that forwards from the browser to the backend, injecting the session user:

   ```ts
   // app/api/livedev/issues/route.ts
   import { NextResponse } from "next/server";
   import { getSession } from "@/lib/auth";

   export async function POST(req: Request) {
     const session = await getSession();
     if (session?.user?.role !== "ADMIN") {
       return NextResponse.json({ error: "forbidden" }, { status: 403 });
     }
     const body = await req.text();
     const res = await fetch(`${process.env.LIVEDEV_BACKEND_URL}/issues`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${process.env.GITHUB_PAT}`, // server-only env var
         "X-Livedev-User": session.user.email,
         "X-Github-Repo": process.env.GITHUB_REPO ?? "",
       },
       body,
     });
     return new NextResponse(await res.text(), { status: res.status });
   }
   ```

4. Modify your overlay fork / issue-creation flow to POST to `/api/livedev/issues` instead of GitHub directly. (This customisation lives in the consumer app; the default overlay bundle posts straight to GitHub.)

For a typical agency/internal deployment this isn't needed — the PAT-in-client approach with the session gate + whitelist is usually fine.
