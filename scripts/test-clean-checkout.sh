#!/usr/bin/env bash
# Run the suite on what CI runs it on: a clone of HEAD — full history and tags,
# tracked files only (including tracked files a .gitignore pattern matches), no
# gitignored paths and so no `.agents/skills` symlink. An in-place `npm test`
# passes on anything the developer's checkout supplies and CI's does not: a
# snippet test that reached `.agents/skills/…` from the repo root passed 71/71
# locally and failed 19 rows on every CI push (obs #149).
#
# Each run clones into a directory of its OWN, made with `mktemp -d` inside the
# base ${CLEAN_CHECKOUT_DIR:-<repo>/.clean-checkout} (gitignored), and deletes
# that directory and nothing else. Ownership is by construction: no other run
# and no other tool can name a directory `mktemp` just created, so there is no
# shared location to lock, mark or take over, and the base itself is never
# deleted. (Task 154 QA cycles 1–3 found, in turn, that deleting a named
# location removed the repository, that a marker did not stop two runs
# clobbering each other, and that a lock's takeover raced; each was a defect in
# protecting a location two parties could name. This design has none.)
#
# The base is never where observation-log.js classifies a path as ephemeral
# (/tmp, /private/tmp, /var/tmp, .claude/worktrees/): observation-log.test.mjs
# refuses a scratch base there, so a clone under it goes red where CI is green.
# The check asks the engine's own ephemeralReason(), on the resolved path and on
# the path as given.
#
# Uncommitted changes are NOT tested; this runs HEAD, as a release cuts from
# committed state. A dirty tree is warned about so the difference is visible.
#
# Test hook: CLEAN_CHECKOUT_CMD replaces `npm test` (tests/test-clean-checkout.test.js
# uses it to run a fixture's check). It is evaluated in the clone.
#
# Exit: the command's own status; 2 for a refused setup (an unusable base, or
# no node_modules to link).
set -euo pipefail

refuse() {
  echo "test-clean-checkout: refusing $1" >&2
  exit 2
}

REPO=$(git rev-parse --show-toplevel)
# The engine is this script's sibling in THIS repository, not a file of the repo
# being tested — tests/test-clean-checkout.test.js runs the script against a
# fixture repo that has no shared/resources/.
ENGINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)/shared/resources/observation-log.js"

# Decide whether the base is usable, in one place. Prints `OK` then the resolved
# base on the next line, or `REFUSE` then the reason. The base must not carry a
# control character (it could not be reported or split safely), must not be
# ephemeral in either spelling (macOS resolves /var/tmp to /private/var/tmp,
# which the engine does not list), and must be an existing writable directory —
# or a path whose parent is one, so the one `mkdir` below creates it and no
# parent this script would never remove.
DECISION=$(command node -e '
  const fs = require("fs");
  const path = require("path");
  const { ephemeralReason } = require(process.argv[1]);
  const raw = process.argv[2];
  const say = (verdict, text) => { process.stdout.write(verdict + "\n" + text); process.exit(0); };
  if (/[\u0000-\u001f\u007f]/.test(raw)) say("REFUSE", JSON.stringify(raw) + " — it contains a control character");
  const given = path.resolve(raw);
  let p = given;
  const tail = [];
  while (!fs.existsSync(p) && path.dirname(p) !== p) { tail.unshift(path.basename(p)); p = path.dirname(p); }
  const abs = path.join(fs.realpathSync.native(p), ...tail);
  const spellings = [abs, given];
  for (const s of [abs, given]) if (s.startsWith("/private/var/")) spellings.push(s.slice("/private".length));
  for (const s of spellings) {
    const why = ephemeralReason(s);
    if (why) say("REFUSE", abs + " — " + why + ", which observation-log.test.mjs refuses as a scratch base; set CLEAN_CHECKOUT_DIR elsewhere");
  }
  const target = tail.length === 0 ? abs : path.dirname(abs);
  if (tail.length > 1) say("REFUSE", abs + " — its parent directory does not exist; create it first");
  let st;
  try { st = fs.statSync(target); } catch (e) { say("REFUSE", target + " — it cannot be read (" + e.code + ")"); }
  if (!st.isDirectory()) say("REFUSE", target + " — it is not a directory");
  try { fs.accessSync(target, fs.constants.W_OK | fs.constants.X_OK); } catch (e) { say("REFUSE", target + " — it is not writable (" + e.code + ")"); }
  say("OK", abs);
' "$ENGINE" "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout}") \
  || refuse "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout} — the base check did not run"
case "$DECISION" in
  OK$'\n'/*) BASE=${DECISION#OK$'\n'} ;;
  REFUSE$'\n'*) refuse "${DECISION#REFUSE$'\n'}" ;;
  *) refuse "${CLEAN_CHECKOUT_DIR:-$REPO/.clean-checkout} — the base check returned no verdict" ;;
esac

if [ ! -d "$REPO/node_modules" ]; then
  echo "test-clean-checkout: $REPO/node_modules is missing — run npm ci first (the clone links it rather than installing)" >&2
  exit 2
fi

if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  echo "⚠️  test-clean-checkout: uncommitted changes are NOT tested — this runs HEAD ($(git -C "$REPO" rev-parse --short HEAD))" >&2
fi

HEAD_SHA=$(git -C "$REPO" rev-parse HEAD)

# `mkdir` without -p: the base check allowed at most the base itself to be
# missing. A concurrent run creating it first is not an error.
[ -d "$BASE" ] || mkdir "$BASE" 2>/dev/null || [ -d "$BASE" ] || refuse "$BASE — it could not be created"
# This run's own directory. The trap is set only once it exists, and removes it
# and nothing else — the one deletion this script makes.
RUN_DIR=$(mktemp -d "$BASE/run.XXXXXX") || refuse "$BASE — could not create a run directory in it"
trap 'rm -rf "$RUN_DIR"' EXIT

# --local --shared: objects are borrowed from $REPO, not copied. A clone (not an
# archive, not a copy) is what keeps tags and history — changelog-entry-drift
# needs a reachable tag — and keeps a tracked file that .gitignore matches.
git clone --quiet --local --shared "$REPO" "$RUN_DIR"
# Detach at the source's exact HEAD: the clone's default checkout is the
# source's current branch, which is wrong when the source is itself detached.
git -C "$RUN_DIR" checkout --quiet --detach "$HEAD_SHA"
ln -s "$REPO/node_modules" "$RUN_DIR/node_modules"

cd "$RUN_DIR"
echo "test-clean-checkout: running in a clean clone of $(git rev-parse --short HEAD) at $RUN_DIR" >&2
# `set +e` so the command's own status is what this script reports, after the
# EXIT trap has removed the clone.
set +e
eval "${CLEAN_CHECKOUT_CMD:-npm test}"
status=$?
set -e
exit "$status"
