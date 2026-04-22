# @kikirrin/backend

Minimal Hono server that gates GitHub issue creation behind the livedev whitelist.

## Install & run

```bash
# from repo root
pnpm install

# development (hot-reload via tsx)
pnpm --filter @kikirrin/backend dev

# production build
pnpm --filter @kikirrin/backend build
node dist/index.js
```

Default port is **8787**. Override with `PORT=<n>`.

## Endpoint

### `POST /issues`

Creates a GitHub issue on behalf of the caller after verifying that the **app user id** passed in `X-Livedev-User` is listed in `livedev.whitelist.json`.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | yes | `Bearer <github-pat>` — the app's shared service PAT used to author the issue |
| `X-Livedev-User` | yes | App user id of the caller (email, user id, whatever the consumer app uses) |
| `X-Github-Repo`  | no*  | `owner/repo` — falls back to env `LIVEDEV_GITHUB_REPO` |

`X-Livedev-User` is trusted — this endpoint is intended to be called **server-to-server** by the consumer app (which has already authenticated the user and confirmed their admin role). Do not expose `/issues` directly to end users.

**Body** (JSON)

```json
{
  "title": "Issue title",
  "body": "Issue body markdown",
  "labels": ["optional", "label-array"]
}
```

`labels` defaults to `["live-dev"]` when omitted.

**Responses**

| Status | Meaning |
|---|---|
| 201 | Issue created — `{ html_url, number }` |
| 400 | Missing/malformed body or repo |
| 401 | Missing PAT or `X-Livedev-User` |
| 403 | User not in whitelist |
| 502 | GitHub API error |

## Whitelist behaviour

The server loads `livedev.whitelist.json` from the working directory (walking up the tree). If the file is absent or `allowedUsers` is empty, **all requests are denied** (fail-closed).

```json
{
  "allowedUsers": ["admin@example.com"]
}
```

## Example curls

**Success (whitelisted user)**

```bash
curl -s -X POST http://localhost:8787/issues \
  -H "Authorization: Bearer ghp_APP_SERVICE_PAT" \
  -H "X-Livedev-User: admin@example.com" \
  -H "X-Github-Repo: kikirrin/my-app" \
  -H "Content-Type: application/json" \
  -d '{"title":"Bug: button broken","body":"Steps to reproduce..."}' | jq .
# { "html_url": "https://github.com/kikirrin/my-app/issues/42", "number": 42 }
```

**Rejected (not whitelisted)**

```bash
curl -s -X POST http://localhost:8787/issues \
  -H "Authorization: Bearer ghp_APP_SERVICE_PAT" \
  -H "X-Livedev-User: someone-else@example.com" \
  -H "X-Github-Repo: kikirrin/my-app" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"..."}' | jq .
# { "error": "not_whitelisted" }
# HTTP 403
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8787` | Port the server listens on |
| `LIVEDEV_GITHUB_REPO` | — | Fallback `owner/repo` when `X-Github-Repo` header is absent |
