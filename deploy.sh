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

  # last30days reads YouTube through the yt-dlp binary rather than an API key.
  # Deliberately the standalone build rather than the distro package: apt ships
  # a yt-dlp that lags badly, and a stale yt-dlp fails quietly, which would
  # surface as "YouTube was quiet this run" rather than "the tool is broken".
  # Non-fatal like everything else in this section.
  YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
  YTDLP_DEST="/usr/local/bin/yt-dlp"

  if command -v yt-dlp >/dev/null 2>&1; then
    echo "==> yt-dlp present: $(yt-dlp --version 2>&1 | head -1)"
  elif ! command -v curl >/dev/null 2>&1; then
    echo "==> curl not found, cannot install yt-dlp. YouTube will be skipped by last30days."
  elif [ -w "$(dirname "$YTDLP_DEST")" ]; then
    echo "==> Installing yt-dlp into $YTDLP_DEST"
    { curl -fsSL "$YTDLP_URL" -o "$YTDLP_DEST" && chmod a+rx "$YTDLP_DEST" \
      && echo "==> yt-dlp installed: $("$YTDLP_DEST" --version 2>&1 | head -1)"; } \
      || echo "==> yt-dlp install failed. YouTube will be skipped by last30days."
  elif sudo -n true 2>/dev/null; then
    echo "==> Installing yt-dlp into $YTDLP_DEST (via sudo)"
    { sudo curl -fsSL "$YTDLP_URL" -o "$YTDLP_DEST" && sudo chmod a+rx "$YTDLP_DEST" \
      && echo "==> yt-dlp installed: $("$YTDLP_DEST" --version 2>&1 | head -1)"; } \
      || echo "==> yt-dlp install failed. YouTube will be skipped by last30days."
  else
    # Never prompt for a password from a deploy script: it would hang an
    # otherwise unattended run. Say exactly what to type instead.
    echo "==> yt-dlp is missing and cannot be installed automatically here."
    echo "    YouTube will be skipped by last30days until you run:"
    echo "      sudo curl -fsSL $YTDLP_URL -o $YTDLP_DEST && sudo chmod a+rx $YTDLP_DEST"
  fi
fi

echo "==> Building"
npm run build

echo "==> Restarting pm2 process '$PM2_NAME'"
pm2 restart "$PM2_NAME" --update-env

echo "==> Done. Check https://apps.unitedceres.edu.sg/social_media_os"
echo "==> nginx limits: uploads need client_max_body_size 26m, and a listening"
echo "    search needs proxy_read_timeout 180s. Both in docs/nginx-upload-size.md."
echo "==> Extra social listening sources: see docs/last30days-setup.md for the"
echo "    Python 3.12 requirement and which key unlocks which platform."
