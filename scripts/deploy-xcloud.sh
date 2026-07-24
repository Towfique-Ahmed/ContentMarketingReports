#!/usr/bin/env bash
#
# OOM-resilient deploy for small xCloud/PM2 hosts. Point the xCloud deploy
# script at this file:
#
#     bash scripts/deploy-xcloud.sh
#
# Why this exists: on low-RAM instances the plain `npm ci && npm run build`
# deploy has repeatedly been OOM-killed mid-way, leaving a missing or
# half-written .next that crash-loops `next start` — the site then serves 502
# until someone intervenes. This script closes each hole:
#
#   1. `npm install` (not `npm ci`) — incremental; unchanged deps aren't
#      re-downloaded and better-sqlite3 isn't recompiled on every deploy.
#      (.npmrc already omits devDependencies.)
#   2. The app is stopped BEFORE install+build so its memory is available.
#   3. The build runs with a capped V8 heap (default 768 MB, override with
#      BUILD_MAX_OLD_SPACE) so Node GCs instead of ballooning into the
#      kernel OOM killer.
#   4. The build writes to a scratch dir (.next-build) and is promoted to
#      .next only on success — a failed build restarts the PREVIOUS working
#      build, so a bad deploy never takes the site down.
#
# Env knobs: PM2_APP_NAME (default: all apps of this site user),
#            BUILD_MAX_OLD_SPACE (MB, default 768), PORT (read by `next start`).

set -uo pipefail
cd "$(dirname "$0")/.."

PM2_TARGET="${PM2_APP_NAME:-all}"
HEAP_MB="${BUILD_MAX_OLD_SPACE:-768}"

pm2_do() { command -v pm2 >/dev/null 2>&1 && pm2 "$@"; }

echo "==> Stopping app ($PM2_TARGET) to free memory for install + build"
pm2_do stop "$PM2_TARGET" || true

echo "==> Installing production dependencies (incremental)"
if ! npm install --no-audit --no-fund; then
  echo "!! npm install failed — restarting the previous build"
  pm2_do restart "$PM2_TARGET" || true
  exit 1
fi

echo "==> Building with a ${HEAP_MB}MB heap cap into .next-build"
rm -rf .next-build
if NEXT_DIST_DIR=.next-build NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" npm run build; then
  echo "==> Build succeeded — promoting to .next"
  rm -rf .next
  mv .next-build .next
  BUILD_OK=1
else
  echo "!! Build failed — keeping the previous .next so the site stays up"
  rm -rf .next-build
  BUILD_OK=0
fi

echo "==> Starting app"
if ! pm2_do restart "$PM2_TARGET" --update-env; then
  # First deploy (no PM2 process yet): start one.
  pm2_do start npm --name "${PM2_APP_NAME:-marketing-reports}" -- start || true
fi
pm2_do save || true

if [ "$BUILD_OK" = "1" ]; then
  echo "==> Deploy complete (new build live)"
  exit 0
fi
echo "==> Deploy FAILED (previous build restarted; site should still be up)"
exit 1
