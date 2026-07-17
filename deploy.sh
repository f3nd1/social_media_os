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

echo "==> Pulling latest $BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Installing dependencies"
npm install

echo "==> Building"
npm run build

echo "==> Restarting pm2 process '$PM2_NAME'"
pm2 restart "$PM2_NAME" --update-env

echo "==> Done. Check https://apps.unitedceres.edu.sg/social_media_os"
echo "==> Uploads are capped at 25 MB. If a real PDF is rejected with 413,"
echo "    raise nginx client_max_body_size to 26m (see docs/nginx-upload-size.md)."
