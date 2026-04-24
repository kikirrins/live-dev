# Live-Dev credentials

Setup docs for the GitHub credential used by `@livedev/issues-service`. The credential **never leaves the server** — browsers and host proxies don't see it.

## Options

### Fine-grained Personal Access Token (recommended for day one)

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → **Generate new token**.
2. Repository access → **Only select repositories** → pick the one repo Live-Dev files issues against.
3. Repository permissions → **Issues: Read and write**. Everything else stays "No access".
4. Expiration → 90 days or less. Rotate via `LIVEDEV_GITHUB_PAT` in the issues-service env.
5. Paste into `modules/issues-service/.env` as `LIVEDEV_GITHUB_PAT`.

If the token ever appears in a browser bundle, a PR, a log, or a chat, treat it as compromised and rotate immediately.

### GitHub App (recommended at scale)

Deferred — see _Out of scope_ in the plan. For multi-tenant or per-repo-install flows, create a GitHub App with Issues: Read & Write, generate a private key, and have the service mint short-lived installation tokens instead of reading a static PAT. Same env var slot, different value lifecycle.

## Service token

`LIVEDEV_SERVICE_TOKEN` is the shared secret between every host-proxy and the issues-service. Generate 32+ bytes of entropy:

```bash
openssl rand -hex 32
```

Rotate per-host in production. The issues-service compares it in constant time.
