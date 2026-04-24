#!/usr/bin/env bash
# Fail if any reference TS/TSX file uses a `.js` extension in a RELATIVE import.
#
# Why: integrating agents copy these files into Next.js / Vite / tsup hosts
# whose webpack does not rewrite ".js" → ".ts". A regression here means every
# downstream agent burns cycles stripping extensions.
#
# Package-scoped imports (`from "@livedev/whitelist/server"`) are exempt —
# those resolve via package.json `exports` and never need the extension.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Match: from "./foo.js"  or  from "../bar/baz.js"
PATTERN='from[[:space:]]+"\.\.?\/[^"]*\.js"'

# Search inside modules/, exclude node_modules, dist, .next.
HITS=$(
  find modules -type f \( -name '*.ts' -o -name '*.tsx' \) \
    -not -path '*/node_modules/*' \
    -not -path '*/dist/*' \
    -not -path '*/.next/*' \
  | xargs grep -nE "$PATTERN" 2>/dev/null || true
)

if [ -n "$HITS" ]; then
  echo "FAIL: relative imports with .js extension found (will break Next.js webpack consumers):"
  echo "$HITS"
  echo
  echo "Strip the .js — workspace packages and reference files use extensionless relative imports."
  exit 1
fi

echo "OK: no relative .js extensions in modules/*.ts(x)"
