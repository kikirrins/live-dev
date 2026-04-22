# @kikirrin/livedev-next

Point-and-prompt development overlay for Next.js. Click any element, describe a change in plain language, and livedev creates a labelled GitHub issue against your project repo.

## What's new in 0.8.0

**Breaking change — whitelist gating.** The overlay now requires:

1. An `OverlayLoader userId={...}` prop (the consumer app's session identifier — email, user id, whatever you already use).
2. A `livedev.whitelist.json` file at your app root listing allowed user identifiers.

Without both, the overlay will not render (fail-closed). See [Migration from 0.7.x](#migration-from-07x) below.

## Quick start

```bash
pnpm add @kikirrin/livedev-next
npx livedev init
```

1. **`next.config.*`** — wrap with `withLiveDev`:

   ```js
   const withLiveDev = require("@kikirrin/livedev-next/webpack");
   module.exports = withLiveDev({ reactStrictMode: true });
   ```

2. **`app/layout.tsx`** — mount behind your admin guard:

   ```tsx
   import { getSession } from "@/lib/auth";
   import { OverlayLoader } from "@kikirrin/livedev-next";

   export default async function RootLayout({ children }) {
     const session = await getSession();
     const isAdmin = session?.user?.role === "ADMIN";
     return (
       <html><body>
         {children}
         {isAdmin && <OverlayLoader userId={session.user.email} />}
       </body></html>
     );
   }
   ```

3. **`livedev.whitelist.json`** at your app root:

   ```json
   { "allowedUsers": ["admin@example.com"] }
   ```

4. **`.env.local`** — `NEXT_PUBLIC_GITHUB_TOKEN` (PAT with `issues:write`) and `NEXT_PUBLIC_GITHUB_REPO=owner/repo`.

5. `pnpm dev` → sign in as an admin whose email is in the whitelist → click any component.

## Access model

- The GitHub PAT is the **app's shared service credential**. It authorises issue creation; it does not identify the caller.
- The caller is identified by your app's session, passed via `userId`.
- Two independent gates: your admin guard decides whether to render `<OverlayLoader>` at all, and livedev re-checks `userId` against the whitelist.

## Migration from 0.7.x

| 0.7.x | 0.8.0 |
|---|---|
| `<OverlayLoader />` (no props required) | `<OverlayLoader userId={...} />` required to load |
| No whitelist; anyone with the app could create issues | `livedev.whitelist.json` with `allowedUsers` required; fail-closed if missing/empty |
| `withLiveDev` only injected source-location loader | Also inlines the whitelist as `NEXT_PUBLIC_LIVEDEV_WHITELIST` (so `withLiveDev` is now required, not just recommended) |

To upgrade: add a `livedev.whitelist.json`, pass `userId` from your session to `OverlayLoader`, and make sure `next.config.*` uses `withLiveDev`.

## Subpath exports

- `@kikirrin/livedev-next` — client-safe: `OverlayLoader`, `isAllowed`, `Whitelist` type.
- `@kikirrin/livedev-next/server` — Node-only: `loadWhitelist`, `isAllowed` (for server-side gates / proxy backends).
- `@kikirrin/livedev-next/webpack` — the `withLiveDev` Next.js config wrapper.

## Further reading

- [INSTALL.md](./INSTALL.md) — step-by-step setup with troubleshooting.
- [INSTALL-VENDOR.md](./INSTALL-VENDOR.md) — vendoring into a target monorepo (Railway, etc.).

## License

MIT
