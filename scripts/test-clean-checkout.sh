#!/usr/bin/env bash
# Run the suite on what CI runs it on: a clone of HEAD — full history and tags,
# tracked files only (including tracked files a .gitignore pattern matches), no
# gitignored paths and so no `.agents/skills` symlink. An in-place `npm test`
# passes on anything the developer's checkout supplies and CI's does not: a
# snippet test that reached `.agents/skills/…` from the repo root passed 71/71
# locally and failed 19 rows on every CI push (obs #149).
#
# The clone goes in ${CLEAN_CHECKOUT_DIR:-<repo>/.clean-checkout} (gitignored),
# never under a temporary directory: observation-log.js classifies /tmp,
# /private/tmp and /var/tmp as ephemeral, and observation-log.test.mjs refuses a
# scratch base there — `mktemp -d` would make the clone red where CI is green.
#
# Uncommitted changes are NOT tested; this runs HEAD, as a release cuts from
# committed state. A dirty tree is warned about so the difference is visible.
#
# Test hook: CLEAN_CHECKOUT_CMD replaces `npm test` (tests/test-clean-checkout.test.js
# uses it to run a fixture's check). It is evaluated in the clone.
#
# Exit: the command's own status; 2 for a refused setup (a temporary-directory
# location, or no node_modules to link).
set -euo pipefail

REPO=$(git rev-parse --show-toplevel)
DIR=${CLEAN_CHECKOUT_DIR:-"$REPO/.clean-checkout"}

case "$DIR" in
  /tmp | /tmp/* | /private/tmp | /private/tmp/* | /var/tmp | /var/tmp/*)
    echo "test-clean-checkout: refusing $DIR — a temporary directory is classified ephemeral, and observation-log.test.mjs refuses a scratch base there; set CLEAN_CHECKOUT_DIR elsewhere" >&2
    exit 2
    ;;
esac

if [ ! -d "$REPO/node_modules" ]; then
  echo "test-clean-checkout: $REPO/node_modules is missing — run npm ci first (the clone links it rather than installing)" >&2
  exit 2
fi

if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  echo "⚠️  test-clean-checkout: uncommitted changes are NOT tested — this runs HEAD ($(git -C "$REPO" rev-parse --short HEAD))" >&2
fi

HEAD_SHA=$(git -C "$REPO" rev-parse HEAD)
rm -rf "$DIR"
trap 'rm -rf "$DIR"' EXIT

# --local --shared: objects are borrowed from $REPO, not copied. A clone (not an
# archive, not a copy) is what keeps tags and history — changelog-entry-drift
# needs a reachable tag — and keeps a tracked file that .gitignore matches.
git clone --quiet --local --shared "$REPO" "$DIR"
# Detach at the source's exact HEAD: the clone's default checkout is the
# source's current branch, which is wrong when the source is itself detached.
git -C "$DIR" checkout --quiet --detach "$HEAD_SHA"
ln -s "$REPO/node_modules" "$DIR/node_modules"

cd "$DIR"
echo "test-clean-checkout: running in a clean clone of $(git rev-parse --short HEAD) at $DIR" >&2
# `set +e` so the command's own status is what this script reports, after the
# EXIT trap has removed the clone.
set +e
eval "${CLEAN_CHECKOUT_CMD:-npm test}"
status=$?
set -e
exit "$status"
