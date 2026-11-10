#!/usr/bin/env bash
# container.sh — runs INSIDE the test container, from the synced tree (/work).
#
# Usage: container.sh <npm-script>...
#
# Installs dependencies when the lockfile hash changed (the hash lives in node_modules, so
# anything that removes node_modules also invalidates it), then runs each script in order
# and exits with the first failing script's status.
set -uo pipefail

mkdir -p "$HOME"

HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ ! -d node_modules ] || [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$HASH" ]; then
  echo "phase: npm ci"
  npm ci --no-audit --no-fund
  STATUS=$?
  if [ "$STATUS" -ne 0 ]; then
    echo "✗ npm ci failed (exit $STATUS)" >&2
    exit "$STATUS"
  fi
  printf '%s\n' "$HASH" >node_modules/.lock-hash
else
  echo "phase: npm ci skipped (package-lock.json unchanged)"
fi

for script in "$@"; do
  echo "phase: npm run $script"
  npm run "$script"
  STATUS=$?
  if [ "$STATUS" -ne 0 ]; then
    echo "✗ npm run $script failed (exit $STATUS)" >&2
    exit "$STATUS"
  fi
done
exit 0
