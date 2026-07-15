#!/bin/bash
# Fixture-replay test for the agenda and release-notes formatters.
# No live Jira — feeds a canned compile-sprint-review-data.sh output JSON
# through each formatter and asserts key invariants on the markdown output.
#
# Run: bash skills/jira-sprint-review-prep/tests/fixture.test.sh
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SKILL=$(cd "$HERE/.." && pwd)
FIXTURE="$HERE/fixtures/sprint-data.json"

fail=0
assert_contains() {
  local label=$1 needle=$2 hay=$3
  if ! grep -qF -- "$needle" <<<"$hay"; then
    echo "FAIL [$label]: missing '$needle'" >&2
    fail=$((fail + 1))
  fi
}
assert_not_contains() {
  local label=$1 needle=$2 hay=$3
  if grep -qF -- "$needle" <<<"$hay"; then
    echo "FAIL [$label]: unexpected '$needle' present" >&2
    fail=$((fail + 1))
  fi
}

# --- Agenda ---
AGENDA=$(bash "$SKILL/scripts/compile-sprint-review-agenda.sh" "$FIXTURE")

assert_contains "agenda.title"          "# 🚀 Sprint Review Presentation Agenda" "$AGENDA"
assert_contains "agenda.sprint-name"    "Sprint 7 — Checkout refactor"           "$AGENDA"
assert_contains "agenda.goal"           "Ship the new checkout flow behind a flag" "$AGENDA"
# Velocity split: committed = 8/10, creep = 2/2, total = 10/12
assert_contains "agenda.velocity.committed" "**Velocity (committed):** 8 / 10 pts delivered" "$AGENDA"
assert_contains "agenda.velocity.creep"     "**Mid-sprint creep:** 2 / 2 pts delivered"      "$AGENDA"
assert_contains "agenda.velocity.total"     "**Total delivered:** 10 / 12 pts"               "$AGENDA"
# Shipped section
assert_contains "agenda.shipped.101" "[PROJ-101] Wire up new checkout endpoint" "$AGENDA"
assert_contains "agenda.shipped.102" "[PROJ-102] Migrate legacy tax calculator" "$AGENDA"
assert_contains "agenda.shipped.104" "[PROJ-104] Hotfix — payment gateway timeout" "$AGENDA"
assert_contains "agenda.shipped.104.creepFlag" "_added mid-sprint_" "$AGENDA"
# DoD verdicts
assert_contains "agenda.dod.101.pass" "🟢 Definition of Done Met"                          "$AGENDA"
assert_contains "agenda.dod.102.fail" "⚠️ DoD Audit Warned (missing: resolution, QA approval)" "$AGENDA"
# Uncompleted
assert_contains "agenda.open.103" "[PROJ-103] Add feature flag UI toggle"           "$AGENDA"
assert_contains "agenda.open.103.status" "*Current Status: In Progress*"            "$AGENDA"
# Scope creep
assert_contains "agenda.creep.104" "[PROJ-104] Hotfix — payment gateway timeout"    "$AGENDA"
assert_contains "agenda.creep.104.date" "Added to sprint on: 2026-05-08"            "$AGENDA"
assert_not_contains "agenda.creep.101.absent" "[PROJ-101] Wire up new checkout endpoint** (Added to sprint on" "$AGENDA"

# --- Release notes ---
NOTES=$(bash "$SKILL/scripts/compile-release-notes.sh" "$FIXTURE")

assert_contains "notes.title"           "# Release Notes — Sprint 7 — Checkout refactor" "$NOTES"
assert_contains "notes.delivered.count" "_Delivered: 3 items, 10 pts_"                  "$NOTES"
assert_contains "notes.goal"            "**Sprint Goal:** Ship the new checkout flow behind a flag" "$NOTES"
assert_contains "notes.shipped.101"     "**[PROJ-101]** Wire up new checkout endpoint"  "$NOTES"
assert_contains "notes.shipped.104.creep" "_(added mid-sprint)_"                        "$NOTES"
# PROJ-102 fails DoD → must be flagged
assert_contains "notes.dod.102.warn"    "**[PROJ-102]** Migrate legacy tax calculator ⚠️" "$NOTES"
# Open items must NOT be in release notes
assert_not_contains "notes.open.103.absent" "PROJ-103" "$NOTES"

if [ "$fail" -gt 0 ]; then
  echo "❌ $fail assertion(s) failed" >&2
  exit 1
fi
echo "✅ all assertions passed"
