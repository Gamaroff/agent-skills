# Bug Report: Task 125 - A priority/severity value containing a newline passes the label existence check — `grep -F` reads a multi-line pattern as several patterns — and the newline reaches `--label`

**Task**: [Link](./task.125.develop-bug-finalise-mode-and-issue-create.md)
**Bug ID**: TASK-125-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-21
**Source**: QA Step 3b boundary probe by hand (minimal env, bash + zsh): case 2 of 10, reproduced in both shells
**File**: `skills/ensure-bug-github-issue/SKILL.md:156`

## Description
`printf '%s\n' "$REPO_LABELS" | grep -qxF "$l"` with `l=priority:high<LF>foo` matches, because `grep -F` treats each line of the pattern as a separate fixed string and `priority:high` is a real label. The un-normalised `priority:high<LF>foo` is then passed to `gh issue create --label`, which rejects it — failing the whole create, the exact class obs #65 closed. Every other hostile shape probed (glob, leading `-`, `$(…)`, backticks, quotes, `../`, empty) was refused or inert.

## Steps to Reproduce
`PRIORITY=$'high\nfoo' SEVERITY=Major bash label-block.sh` → `LABEL_ARGS=--label bug --label priority:high<LF>foo --label severity:major` (same under zsh).

## Expected Behavior
A value the repository's label set cannot contain is skipped with a warning naming it; the create runs.

## Actual Behavior
The multi-line value is accepted as present and forwarded.

## Impact
A malformed frontmatter value (a folded YAML scalar, a paste) reproduces the failure the block was written to end. Present-but-inert for this one input class.

## Recommendation
Reject a candidate that is not a single line before the existence check — e.g. `[ "$(printf '%s' "$l" | wc -l)" -eq 0 ] || { warn; continue; }` — or compare with `grep -qxF -e "$l"` on a single-line-guaranteed value; add the newline case to `tests/ensure-bug-label-tolerance.test.js` (mutation: remove the guard → red).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: `grep -qxF "$l"` reads a multi-line pattern as several patterns; `priority:high<LF>foo` matched the real `priority:high` and the multi-line value was forwarded to `--label`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: `gh_labels_filter` refuses any candidate that is not a single line before the existence check (`case "$candidate" in *"$nl"*)`), warning with the value's newlines shown as `|`. Every site inherits the guard by sourcing the helper.

**Files Modified**:
- `shared/resources/gh-labels.sh`
- `tests/gh-labels.test.js` — newline case (bash + zsh); hostile-shape case (glob, `-e`, `$(…)`, quote injection, traversal) asserting stdout empty and every stderr line a quoting warning
- `tests/ensure-bug-label-tolerance.test.js` — the B5 block wired: `PRIORITY=$'high\nfoo'` → only `bug` reaches the create

**Testing**: Green; mutation: the newline guard neutralised → 2 red.

**Verification Steps for QA**:
1. Run the named test file(s); revert the named mechanism and confirm the named tests go red.
2. `npm run ci:fast` green; `npm run bundle:check` 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-21
**QA Engineer**: QA Engineer
**Verified in**: QA cycle 2 (Re-Review Context table of `task.125.qa.2.develop-bug-finalise-mode-and-issue-create.md`)

**Verification Result**: ✅ Fixed
**Verification Notes**: multiline label value refused by the helper; boundary probe 20/20.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Filed at QA cycle 1 |
| 2026-09-21 | In Progress | qa-fix | Investigation started |
| 2026-09-21 | Ready for QA | qa-fix | Fix implemented, mutation-proved |
| 2026-09-21 | Closed | QA Engineer | Fix verified in QA cycle 2 — multiline label value refused by the helper; boundary probe … |
