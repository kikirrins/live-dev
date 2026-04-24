---
module_id: credentials
role: setup
dependencies: []
---

# Credentials — integration spec

No code to copy. This module documents the credentials that the other modules consume.

## Env vars produced

| Name | Scope | Required | Example | Secret |
|---|---|---|---|---|
| `LIVEDEV_GITHUB_PAT` | service | yes | `github_pat_…` | yes |
| `LIVEDEV_GITHUB_REPO` | service | yes | `acme/webapp` | no |
| `LIVEDEV_SERVICE_TOKEN` | host + service | yes | `<32-byte hex>` | yes |
| `LIVEDEV_ALLOWED_ORIGINS` | service | yes | `https://app.acme.com` | no |
| `LIVEDEV_ISSUES_URL` | host | yes | `https://livedev.internal/issues` | no |

## Verification

```bash
test -n "$LIVEDEV_GITHUB_PAT" && echo "PAT set"
test -n "$LIVEDEV_SERVICE_TOKEN" && echo "service token set"
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $LIVEDEV_GITHUB_PAT" \
  "https://api.github.com/repos/$LIVEDEV_GITHUB_REPO"   # expect 200
```
