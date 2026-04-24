# @livedev/whitelist

Shared helpers and JSON Schema for `livedev.whitelist.json` — the file that decides which host-app users may open the overlay and file issues.

## Format

```json
{
  "allowedUsers": ["admin@example.com", "ceo@example.com"]
}
```

- **Host-app identity, not GitHub identity.** The value is whatever the host already uses to mark a user (email, uuid, clerk id).
- **Fail-closed.** Empty or missing array → nobody allowed.
- **Two checks.** Host-proxy enforces it authoritatively server-side; overlay-client performs a UX-only pre-check to avoid injecting the script for non-admin sessions.

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
