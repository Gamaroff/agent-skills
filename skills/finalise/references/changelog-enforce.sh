#!/usr/bin/env bash
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/changelog-enforce.sh. Regenerate via `npm run bundle`.
# changelog-enforce.sh — does this project opt in to /finalise's changelog checks?
#
# Usage (run, not sourced — it exports nothing):
#   bash .agents/skills/finalise/references/changelog-enforce.sh
#
# Prints `on` or `off` on stdout and always exits 0. Reads `changelog.enforce` from
# skills-config.yaml (or $SKILLS_CONFIG_FILE) through read-config.sh, the shared reader.
#
# This is the ONE definition of "do the changelog checks apply here?". /finalise reads it in two
# places — the Step 3 docs-subagent dispatch and Step 7 action 6d — and two checks of one condition
# drift: 6d gained a no-CHANGELOG.md skip the docs subagent never got, and consumer repos were warned
# about a changelog they never adopted (task.241, obs #118).
#
# Off by default. The `(task N)` citation convention is one repository's release practice, so a
# project that has not opted in never has its CHANGELOG.md read, whatever that file contains.
#
# On is a YAML 1.1 boolean true, in every spelling either read-config.sh tier can return. The tiers
# disagree on the raw text — `enforce: yes` reads `true` under python (PyYAML resolves it) and `yes`
# under awk (measured 2026-10-28) — so the answer is taken over the union, which makes it the same
# whichever tier ran. A literal-`true`-only rule cannot hold: under python, `yes` and `on` arrive as
# `true` and are indistinguishable from it. Any other non-empty value that is not a false spelling is
# off, with one line on stderr naming it, so a typo is visible rather than silent.
#
# "Same whichever tier ran" holds for a value written on the key's own line. A block scalar
# (`enforce: |` with `true` on the next line) is the exception: PyYAML reads the body, the awk tier
# sees only `|`. The awk tier says so on stderr and answers off; write the value on one line.
#
# The STRICT reader, never the plain one. The plain reader answers "" both for a key that is not
# set and for a config the awk tier refused to read (an anchor anywhere in the file, on a host
# without PyYAML), so an opted-in repository lost the 6d HALT with nothing printed (task.241,
# BUG-1). Each "could not read" answer is named on stderr. The answer is still off: the checks are
# opt-in, and a config this reader cannot read has not opted in as far as it can tell.

_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=read-config.sh
if ! source "$_dir/read-config.sh"; then
  echo "changelog-enforce: could not load read-config.sh beside $0 — treating changelog checks as off" >&2
  echo off
  exit 0
fi

v=$(read_nested_config_key_strict changelog enforce 2>/dev/null)
case "$v" in
  true | True | TRUE | yes | Yes | YES | on | On | ON) echo on ;;
  "" | false | False | FALSE | no | No | NO | off | Off | OFF) echo off ;;
  __UNSUPPORTED__ | __UNREADABLE__)
    echo "changelog-enforce: could not read ${SKILLS_CONFIG_FILE:-skills-config.yaml} (${v}: it uses YAML this reader cannot follow without PyYAML) — changelog.enforce is unknown; treating changelog checks as off" >&2
    echo off
    ;;
  __MAP__)
    echo "changelog-enforce: changelog.enforce holds a mapping, not a value — write \`enforce: true\`; treating changelog checks as off" >&2
    echo off
    ;;
  '|'* | '>'*)
    echo "changelog-enforce: changelog.enforce is a block scalar ('$v'), which this reader cannot read without PyYAML — write \`enforce: true\` on one line; treating changelog checks as off" >&2
    echo off
    ;;
  *)
    echo "changelog-enforce: changelog.enforce is '$v' — write \`true\` to turn the checks on; treating it as off" >&2
    echo off
    ;;
esac
exit 0
