#!/usr/bin/env bash
# One-command update for the droplet.
#
# Usage (from /var/www/social_media_os):
#   ./deploy.sh
#
# Pulls the latest main, installs any new dependencies, rebuilds with the
# sub-path baked in, and restarts the pm2 process. Safe to run repeatedly.
# The live site keeps serving the OLD build until the restart at the end,
# so downtime is only the second or two of the pm2 restart.
#
# This runs itself twice on purpose: once to pull, then it re-execs the copy it
# just pulled to do the actual work. That is why the header lines appear twice
# in the output. See the comment above the pull for why.

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PM2_NAME="social_media_os"
BRANCH="main"

cd "$APP_DIR"
echo "==> Deploying from $APP_DIR"

# Make sure the sub-path is set for the build (idempotent).
if ! grep -q '^NEXT_PUBLIC_BASE_PATH=' .env.production 2>/dev/null; then
  echo "NEXT_PUBLIC_BASE_PATH=/social_media_os" >> .env.production
  echo "==> Added NEXT_PUBLIC_BASE_PATH to .env.production"
fi

# The pull below can rewrite this very script, and git replaces a changed file
# by renaming a new one over the old path. The shell running this script keeps
# its open handle on the old, now-unlinked copy, so every step after the pull
# would come from the version that existed BEFORE it. A change to deploy.sh
# would then silently fail to take effect on the very run that fetched it. That
# is not hypothetical: it is exactly how the last30days install step landed on
# the droplet and never ran.
#
# So do the pull, then hand off to the freshly pulled copy and let it do the
# rest. DEPLOY_REEXEC stops that from looping, and "bash $0" rather than plain
# "$0" keeps working even if the executable bit is ever lost in transit.
if [ -z "${DEPLOY_REEXEC:-}" ]; then
  echo "==> Pulling latest $BRANCH"
  git checkout "$BRANCH"
  git pull origin "$BRANCH"

  echo "==> Reloading deploy script so the rest runs the version just pulled"
  export DEPLOY_REEXEC=1
  exec bash "$0" "$@"
fi

echo "==> Installing dependencies"
npm install

# ---- Optional: extra social listening sources (last30days) ----
# Installed beside the app rather than inside it: it is a separate Python
# project with its own release cadence, and keeping it out of the repo keeps
# this one free of a large vendored tree. Every failure below is non-fatal on
# purpose. If the tool is missing or broken, social listening silently falls
# back to the sources it already had, so a bad clone must never block a deploy
# of the app itself. Set SKIP_LAST30DAYS=1 to leave it alone entirely.
LAST30DAYS_DIR="$(dirname "$APP_DIR")/last30days-skill"

if [ -n "${SKIP_LAST30DAYS:-}" ]; then
  echo "==> Skipping last30days (SKIP_LAST30DAYS set)"
elif ! command -v git >/dev/null 2>&1; then
  echo "==> git not found, skipping last30days"
elif [ -d "$LAST30DAYS_DIR/.git" ]; then
  echo "==> Updating last30days"
  git -C "$LAST30DAYS_DIR" pull --ff-only \
    || echo "==> last30days update failed, keeping the existing copy"
else
  echo "==> Installing last30days into $LAST30DAYS_DIR"
  git clone --depth 1 https://github.com/mvanhorn/last30days-skill.git "$LAST30DAYS_DIR" \
    || echo "==> last30days clone failed, listening will use its existing sources"
fi

# The tool needs Python 3.12 or newer. Report what is actually present rather
# than assuming, because a too-old interpreter fails at run time inside the
# route where it is invisible, not here where it is easy to see.
if [ -d "$LAST30DAYS_DIR" ]; then
  L30_PY="$(command -v python3.12 || command -v python3 || true)"

  if [ -z "$L30_PY" ]; then
    echo "==> WARNING: no python3 found. last30days sources will be skipped."
  else
    echo "==> last30days interpreter: $L30_PY ($("$L30_PY" --version 2>&1))"
    "$L30_PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null \
      || echo "==> WARNING: that interpreter is older than 3.12. Install python3.12, or set LAST30DAYS_PYTHON in .env.production to one that is. Until then last30days sources are skipped."
  fi
fi

echo "==> Building"
npm run build

echo "==> Restarting pm2 process '$PM2_NAME'"
pm2 restart "$PM2_NAME" --update-env

echo "==> Done. Check https://apps.unitedceres.edu.sg/social_media_os"
echo "==> Uploads are capped at 25 MB. If a real PDF is rejected with 413,"
echo "    raise nginx client_max_body_size to 26m (see docs/nginx-upload-size.md)."
echo "==> Extra social listening sources: see docs/last30days-setup.md for the"
echo "    Python 3.12 requirement and which key unlocks which platform."
