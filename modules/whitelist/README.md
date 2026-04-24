# @livedev/whitelist

Shared helpers and JSON Schema for `livedev.whitelist.json` — the file that decides which host-app users may open the overlay and file issues.

## Format

```json
{
  "allowedUsers": ["admin@example.com", "ceo@example.com"]
}
```

- **Host-app identity, not GitHub identity.** The value is whatever the host already uses as the user's canonical id (email, uuid, clerk id). Throughout the integration APIs this value is passed as `{ id: string }` — the literal shape `email` is just one valid example, not the required key.
- **Fail-closed.** Empty or missing array → nobody allowed.
- **Server-authoritative.** The host-proxy enforces the whitelist on every request; the overlay-client performs an **opt-in** UX-only pre-check gated by `LIVEDEV_EXPOSE_WHITELIST=true` (see `modules/overlay-client/INTEGRATION.md`). When the env is not set, the whitelist is never shipped to the browser.

## API

```ts
import { isAllowed, loadWhitelist } from "@livedev/whitelist/server";

const wl = loadWhitelist();             // reads LIVEDEV_WHITELIST_PATH if set;
                                        // otherwise walks up from process.cwd()
if (!isAllowed(userId, wl)) return 403;
```

Pure client form:

```ts
import { isAllowed } from "@livedev/whitelist";
isAllowed(userId, { allowedUsers: [...] });
```

## Schema

`@livedev/whitelist/schema` resolves to `src/schema.json` (JSON Schema 2020-12). Useful for validating the file in CI.
