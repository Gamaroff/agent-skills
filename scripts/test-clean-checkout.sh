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
# version rm -rf'd whatever the variable named, the repository included). The
# location is held by a `<dir>.lock` for the whole run, so two runs never
# share it (QA cycle 2).
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

# Decide whether the clone location is safe to own, in ONE place, before anything
# reads or deletes it (task 154 QA cycles 1-2). Prints `OK` then the resolved
# location on the next line, or `REFUSE` then the reason. Refuses:
#   - a location with a control character (it cannot be reported or split safely)
#   - an ephemeral location, by the engine's own ephemeralReason(), checked on the
#     resolved path, the path as given, and the /var spelling of a macOS
#     /private/var path (the engine lists /var/tmp but not /private/var/tmp)
#   - `/`, the repository, or any directory containing it — compared on
#     realpathSync.native, which returns the on-disk case, so a case variant on a
#     case-insensitive filesystem is still the repository
#   - a location whose parent does not exist (git clone would create parents the
#     EXIT trap never removes)
#   - an existing directory that is non-empty and carries no .git/<marker>, or
#     that cannot be listed ("could not look" is not "empty")
DECISION=$(command node -e '
  const fs = require("fs");
  const path = require("path");
  const { ephemeralReason } = require(process.argv[1]);
  const [repoArg, raw, marker] = process.argv.slice(2);
  const say = (verdict, text) => { process.stdout.write(verdict + "\n" + text); process.exit(0); };
  if (/[\u0000-\u001f\u007f]/.test(raw)) say("REFUSE", JSON.stringify(raw) + " — it contains a control character");
  const given = path.resolve(raw);
  let p = given;
  const tail = [];
  while (!fs.existsSync(p) && path.dirname(p) !== p) { tail.unshift(path.basename(p)); p = path.dirname(p); }
  const abs = path.join(fs.realpathSync.native(p), ...tail);
  const repo = fs.realpathSync.native(repoArg);
  const spellings = [abs, given];
  for (const s of [abs, given]) if (s.startsWith("/private/var/")) spellings.push(s.slice("/private".length));
  for (const s of spellings) {
    const why = ephemeralReason(s);
    if (why) say("REFUSE", abs + " — " + why + ", which observation-log.test.mjs refuses as a scratch base; set CLEAN_CHECKOUT_DIR elsewhere");
  }
  if (abs === path.parse(abs).root || repo === abs || repo.startsWith(abs + path.sep))
    say("REFUSE", abs + " — it is the repository or contains it, and this script deletes its clone directory");
  let parent;
  try { parent = fs.statSync(path.dirname(abs)); } catch { parent = null; }
  if (!parent || !parent.isDirectory())
    say("REFUSE", abs + " — its parent directory does not exist; create it first");
  if (fs.existsSync(abs)) {
    let entries;
    try { entries = fs.readdirSync(abs); } catch (e) { say("REFUSE", abs + " — it cannot be listed (" + e.code + "), so it cannot be shown to belong to this script"); }
    if (entries.length > 0 && !fs.existsSync(path.join(abs, ".git", marker)))
      say("REFUSE", abs + " — it exists and was not created by this script (no .git/" + marker + "); if an interrupted run left it, remove it by hand");
  }
  say("OK", abs);
' "$ENGINE" "$REPO" "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout}" "$MARKER_NAME") \
  || refuse "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout} — the location check did not run"
case "$DECISION" in
  OK$'\n'/*) DIR=${DECISION#OK$'\n'} ;;
  REFUSE$'\n'*) refuse "${DECISION#REFUSE$'\n'}" ;;
  *) refuse "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout} — the location check returned no verdict" ;;
esac

if [ ! -d "$REPO/node_modules" ]; then
  echo "test-clean-checkout: $REPO/node_modules is missing — run npm ci first (the clone links it rather than installing)" >&2
  exit 2
fi

if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  echo "⚠️  test-clean-checkout: uncommitted changes are NOT tested — this runs HEAD ($(git -C "$REPO" rev-parse --short HEAD))" >&2
fi

HEAD_SHA=$(git -C "$REPO" rev-parse HEAD)

# Hold the location for the whole run. The marker proves a run of this script
# CREATED the clone, not that the run has FINISHED, so without a lock a second
# run on the same location would delete the first run's clone mid-test, and the
# first run's EXIT trap would later delete the second's (task 154 QA cycle 2).
# `mkdir` is atomic; the lock records its owner, and a lock whose owner is dead
# is taken over. A lock directory with no numeric pid is not this script's.
LOCK="$DIR.lock"
take_lock() { mkdir "$LOCK" 2>/dev/null && echo "$$" > "$LOCK/pid"; }
if ! take_lock; then
  OWNER=$(cat "$LOCK/pid" 2>/dev/null || true)
  case "$OWNER" in
    '' | *[!0-9]*) refuse "$DIR — $LOCK exists and is not this script's lock (no pid); remove it by hand if no run is active" ;;
  esac
  if kill -0 "$OWNER" 2>/dev/null; then
    refuse "$DIR — another run (PID $OWNER) is using it"
  fi
  rm -rf "$LOCK"
  take_lock || refuse "$DIR — another run took $LOCK first"
fi

# Every deletion below is of a path that passed the checks above — absent, empty,
# or carrying this script's own marker — and is held by this run's lock. DIR is
# absolute, so the trap removes the same directory after the `cd` below as before.
trap 'rm -rf "$DIR"; rm -rf "$LOCK"' EXIT
rm -rf "$DIR"

# --local --shared: objects are borrowed from $REPO, not copied. A clone (not an
# archive, not a copy) is what keeps tags and history — changelog-entry-drift
# needs a reachable tag — and keeps a tracked file that .gitignore matches.
git clone --quiet --local --shared "$REPO" "$DIR"
# Marked the moment the clone exists, before checkout, so a run killed during
# checkout leaves a directory the next run recognises and replaces. Inside
# .git/, so no test that reads `git status` in the clone sees it.
: > "$DIR/.git/$MARKER_NAME"
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
