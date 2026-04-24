---
module_id: issues-service
role: sidecar
host_requirements:
  node: ">=20"
dependencies: [credentials, whitelist]
host_changes:
  - action: create
    path: services/livedev-issues/
    source_snippet: modules/issues-service/
    reason: "Copy the whole directory (src, package.json, tsconfig.json, .env.example) to wherever host sidecars live."
env_vars:
  - { name: LIVEDEV_GITHUB_PAT, scope: service, required: true, example: "github_pat_…", secret: true }
  - { name: LIVEDEV_GITHUB_REPO, scope: service, required: true, example: "acme/webapp", secret: false }
  - { name: LIVEDEV_SERVICE_TOKEN, scope: service, required: true, example: "<matches host-proxy>", secret: true }
  - { name: LIVEDEV_ALLOWED_ORIGINS, scope: service, required: true, example: "https://app.acme.com", secret: false }
  - { name: PORT, scope: service, required: false, example: "8787", secret: false }
credentials:
  type: github_pat
  scopes: ["issues:write"]
  doc: modules/credentials/INTEGRATION.md
routes:
  - { method: POST, path: /issues }
  - { method: GET,  path: /health }
verification_steps:
  - "curl -X POST :8787/issues -H 'Authorization: Bearer wrong' -H 'X-Livedev-User: x' -H 'content-type: application/json' -d '{\"title\":\"t\",\"body\":\"b\"}' → 401 invalid_service_token"
  - "curl -X POST :8787/issues -H \"Authorization: Bearer $LIVEDEV_SERVICE_TOKEN\" -H 'content-type: application/json' -d '{\"title\":\"t\",\"body\":\"b\"}' → 401 missing_user"
  - "curl -X POST :8787/issues -H \"Authorization: Bearer $LIVEDEV_SERVICE_TOKEN\" -H 'X-Livedev-User: someone@not.listed' -H 'content-type: application/json' -d '{\"title\":\"t\",\"body\":\"b\"}' → 403 not_whitelisted"
  - "curl -H 'Origin: https://evil.test' -X OPTIONS :8787/issues → no Access-Control-Allow-Origin echo"
---

# Issues-service — integration spec

Deploy as a standalone sidecar. Only authenticated host-proxies reach it (service-token + CORS allowlist). Never expose it to the public internet without a proxy that terminates the service-token check.
