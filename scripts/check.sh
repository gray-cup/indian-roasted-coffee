#!/usr/bin/env bash
# Run all quality gates locally. Mirrors .github/workflows/ci.yml.
# Usage: bash scripts/check.sh [--skip-build]

set -euo pipefail

SKIP_BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true
done

echo "==> astro check (TypeScript)"
bun run check

if [[ "$SKIP_BUILD" == false ]]; then
  echo "==> Building site"
  bun run build
fi

echo ""
echo "==> HTML validation"
# The dev-only /internal/ component preview intentionally renders components
# out of document context (multiple <h1> Heroes, etc.) and is excluded.
find dist/client -name '*.html' -not -path 'dist/client/internal/*' -print0 | xargs -0 bunx html-validate

echo ""
echo "All local checks passed."
echo ""
echo "Note: Accessibility (axe-core), Lighthouse and link checks need a running"
echo "server and are only run in GitHub Actions. To test locally:"
echo "  npx serve dist/client  then  npx @axe-core/cli http://127.0.0.1:3000/"
