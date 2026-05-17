# target-app

Reference Next.js 15 host that demonstrates all four Live-Dev pieces wired together. The mock session at `app/lib/session.ts` stands in for real auth.

## Local development

```bash
# from the repo root
pnpm install
cp modules/target-app/.env.local.example modules/target-app/.env.local
cp modules/issues-service/.env.example   modules/issues-service/.env
# fill LIVEDEV_GITHUB_PAT and LIVEDEV_GITHUB_REPO in modules/issues-service/.env
pnpm dev
# target-app  :3000
# issues-svc  :8787
```

Open `http://localhost:3000`, click the `● Live-Dev` toggle, pick an element, describe a change, and submit. The issue appears in the configured repo with label `live-dev`.

### Run the overlay locally without auth

Set `LIVEDEV_LOCAL_BYPASS=true` and `NEXT_PUBLIC_LIVEDEV_LOCAL_BYPASS=true` in your `.env.local` to skip the session gate and whitelist checks entirely. This lets the overlay load and submit issues without a logged-in user, which is useful for local smoke-testing against a fresh clone. Both variables are dev-only: they are ignored whenever `NODE_ENV` is `production`, so there is no risk of accidentally shipping an open endpoint.

## Verification checklist

- [ ] Overlay toggle appears on `http://localhost:3000`.
- [ ] Clicking an element opens the issue-creation modal with file + line context pre-filled.
- [ ] Submitting creates a GitHub issue in the configured repo with label `live-dev`.
- [ ] Screenshot thumbnail is present in the issue body and loads through the host screenshot route.
- [ ] With `LIVEDEV_LOCAL_BYPASS=true` the overlay works even without a mock session cookie.
