#!/usr/bin/env bash
# Run the suite on what CI runs it on: a clone of HEAD — full history and tags,
# tracked files only (including tracked files a .gitignore pattern matches), no
# gitignored paths and so no `.agents/skills` symlink. An in-place `npm test`
# passes on anything the developer's checkout supplies and CI's does not: a
# snippet test that reached `.agents/skills/…` from the repo root passed 71/71
# locally and failed 19 rows on every CI push (obs #149).
#
# The clone goes in ${CLEAN_CHECKOUT_DIR:-<repo>/.clean-checkout} (gitignored),
# never where observation-log.js classifies a path as ephemeral (/tmp,
# /private/tmp, /var/tmp, .claude/worktrees/): observation-log.test.mjs refuses a
# scratch base there, so `mktemp -d` would make the clone red where CI is green.
# The check asks the engine's own ephemeralReason() on the RESOLVED path, so the
# two lists cannot drift and a symlink or relative path into /tmp is caught.
#
# This script deletes its clone directory, at start and on exit, so it deletes
# only what it created: a CLEAN_CHECKOUT_DIR that is the repository, contains
# it, or already exists (non-empty) without the marker this script writes into
# the clone's .git/ is refused, never removed (task 154 QA cycle 1: the first
# version rm -rf'd whatever the variable named, the repository included).
#
# Uncommitted changes are NOT tested; this runs HEAD, as a release cuts from
# committed state. A dirty tree is warned about so the difference is visible.
#
# Test hook: CLEAN_CHECKOUT_CMD replaces `npm test` (tests/test-clean-checkout.test.js
# uses it to run a fixture's check). It is evaluated in the clone.
#
# Exit: the command's own status; 2 for a refused setup (an ephemeral, repo or
# foreign location, or no node_modules to link).
set -euo pipefail

refuse() {
  echo "test-clean-checkout: refusing $1" >&2
  exit 2
}

REPO=$(git rev-parse --show-toplevel)
MARKER_NAME=test-clean-checkout.marker
# The engine is this script's sibling in THIS repository, not a file of the repo
# being tested — tests/test-clean-checkout.test.js runs the script against a
# fixture repo that has no shared/resources/.
ENGINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)/shared/resources/observation-log.js"

# Resolve the location to an absolute, symlink-free path before anything reads
# or deletes it. A path that does not exist yet is resolved through its nearest
# existing ancestor. Prints "<resolved>\t<ephemeral reason or empty>", the reason
# taken from the resolved path or, failing that, the path as given.
RESOLVED=$(command node -e '
  const fs = require("fs");
  const path = require("path");
  const { ephemeralReason } = require(process.argv[1]);
  let p = path.resolve(process.argv[2]);
  const tail = [];
  while (!fs.existsSync(p) && path.dirname(p) !== p) { tail.unshift(path.basename(p)); p = path.dirname(p); }
  const abs = path.join(fs.realpathSync(p), ...tail);
  // Both spellings: the engine lists /var/tmp but not /private/var/tmp, which is
  // what macOS resolves /var/tmp to — refusing on either keeps the answer the
  // same on every platform.
  const why = ephemeralReason(abs) || ephemeralReason(path.resolve(process.argv[2]));
  process.stdout.write(abs + "\t" + (why || ""));
' "$ENGINE" "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout}") \
  || refuse "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout} — could not resolve it"
DIR=${RESOLVED%%$'\t'*}
WHY=${RESOLVED#*$'\t'}
REPO_REAL=$(cd "$REPO" && pwd -P)

[ -n "$WHY" ] && refuse "$DIR — $WHY, which observation-log.test.mjs refuses as a scratch base; set CLEAN_CHECKOUT_DIR elsewhere"
# `/` contains everything; the case below cannot express it (its pattern would be `//*`).
if [ "$DIR" = / ]; then
  refuse "$DIR — it contains the repository, and this script deletes its clone directory"
fi
case "$REPO_REAL/" in
  "$DIR"/*) refuse "$DIR — it is the repository or contains it, and this script deletes its clone directory" ;;
esac
if [ -e "$DIR" ] && [ ! -f "$DIR/.git/$MARKER_NAME" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ]; then
  refuse "$DIR — it exists and was not created by this script (no .git/$MARKER_NAME), and this script deletes its clone directory"
fi

if [ ! -d "$REPO/node_modules" ]; then
  echo "test-clean-checkout: $REPO/node_modules is missing — run npm ci first (the clone links it rather than installing)" >&2
  exit 2
fi

if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  echo "⚠️  test-clean-checkout: uncommitted changes are NOT tested — this runs HEAD ($(git -C "$REPO" rev-parse --short HEAD))" >&2
fi

HEAD_SHA=$(git -C "$REPO" rev-parse HEAD)
# Every deletion below is of a path that passed the checks above: absent, empty,
# or carrying this script's own marker. DIR is absolute, so the trap removes the
# same directory after the `cd` below as before it.
rm -rf "$DIR"
trap 'rm -rf "$DIR"' EXIT

# --local --shared: objects are borrowed from $REPO, not copied. A clone (not an
# archive, not a copy) is what keeps tags and history — changelog-entry-drift
# needs a reachable tag — and keeps a tracked file that .gitignore matches.
git clone --quiet --local --shared "$REPO" "$DIR"
# Detach at the source's exact HEAD: the clone's default checkout is the
# source's current branch, which is wrong when the source is itself detached.
git -C "$DIR" checkout --quiet --detach "$HEAD_SHA"
# Inside .git/, so no test that reads `git status` in the clone sees it.
: > "$DIR/.git/$MARKER_NAME"
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
