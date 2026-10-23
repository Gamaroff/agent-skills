---
id: task.223
title: "Gap body: refuse an empty section; correct task.222's Deferred Work line"
type: task
description: "Fix the two low findings task.222 carried: dod-gap-count.sh --body prints its internal marker S for an empty gaps section instead of refusing it, and task.222's Implementation Summary says Deferred Work is none beside a Deferred Work section that lists QA-222-13."
tags: [finalise, dod-gaps, follow-up, task.222]
category: refactoring
status: accepted
priority: Low
created: 2026-10-21
updated: 2026-10-21
assignee:
estimated_effort_hours: 2
depends_on: task.222
github_issue: 719
completed_date: 2026-10-21
pr_number: 720
---

# Technical Task: Gap body: refuse an empty section; correct task.222's Deferred Work line

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.223.review.1.gap-body-empty-section-and-deferred-line.md` implemented 2026-10-21

**GitHub Issue**: [#719](https://github.com/Gamaroff/agent-skills/issues/719)

---

## 1. Overview

task.222 left two low findings recorded but not fixed. **QA-222-13**: `dod-gap-count.sh --body`
prints the internal marker `S` as the body of a `## Definition of Done - Gaps Identified` section
that has no non-blank line. It should refuse that section the way count mode refuses a gaps report
with no gap. **PC-1** (task.222's Step 5c review): task.222's Implementation Summary says
"**Deferred Work:** none", while the same document's `## Deferred Work` section lists QA-222-13.

**Scope**: one guard in `shared/resources/dod-gap-count.sh` `--body` mode, its tests, its bundled
copy, one line in task.222's document, and a CHANGELOG entry.

**Key deliverables**:

1. `--body` exits 1 with a `HALT:` reason on stderr and nothing on stdout when the current gaps
   section has no non-blank line.
2. A test for both empty shapes (no lines, blank lines only), mutation-proven.
3. task.222's Deferred Work line points at its `## Deferred Work` section.

---

## 2. Motivation

### Current Problems

1. **The helper prints its own marker as content.** On a section with no lines, awk's `END` prints
   `S` and an empty body (`shared/resources/dod-gap-count.sh:96-97`, `if (sec) print "S"` /
   `printf "%s", body`). The command substitution strips the trailing newline, so `OUT` is `S` and
   the strip at `:110` (`printf '%s\n' "${OUT#S$'\n'}"`) matches nothing. The output is `S`, exit 0.
   Reproduced on 2026-10-21 against `develop` at `8b5415c7`, both with no lines and with blank lines
   only. The output was `S\n`, rc 0.
2. **Step 8.5's empty-body guard cannot see it.** `skills/finalise/SKILL.md:2683`
   (`[ -n "$GAP_REPORT_BODY" ] || { echo "gap report body is empty — not posting"; exit 1; }`) tests
   for an empty string, and `S` is not empty. Today the defect is masked only because the count call
   (`:2666`, `GAP_COUNT=$(bash …/dod-gap-count.sh "$DOC_FILE") || exit 1`) runs between the body
   read (`:2655`) and the post, and HALTs on the same document. A future reorder, or a second
   caller of `--body`, would post `S` as a gaps report.
3. **The helper's own contract says the opposite.** Its header (`dod-gap-count.sh:20-22`) says
   "Every HALT goes to stderr with exit 1" and "A gaps report with no gap in it is a defect, not a
   zero". Count mode follows this. `--body` does not.
4. **task.222's record contradicts itself.**
   `task.222.finalise-gaps-path-fixes.md:493`
   (`**Deferred Work:** none. Step 8.3's Change Log gap count stays out of scope (§ 4).`) sits above a
   `## Deferred Work` section (`:518`) that lists QA-222-13.

### Benefits of the Fix

- One posture for both modes: an empty gaps section is a HALT, whichever mode reads it.
- Step 8.5 no longer depends on the order of its two helper calls to avoid posting `S`.
- task.222's document says one thing about its deferred work.

---

## 3. Technical Background

### Current Architecture

`dod-gap-count.sh` runs one awk pass. In `--body` mode, `END` prints `S` when the current section
exists (`sec`), then the accumulated `body` with no trailing newline (`:96-97`). The shell checks
`OUT` starts with `S` (`:102-108`, otherwise HALT "no current … section"). It then prints
`${OUT#S$'\n'}` (`:109-112`). That strip assumes a newline follows `S`. On an empty or blank-only
section, `$(…)` has removed every trailing newline, so none follows.

Callers (`git grep -n dod-gap-count -- ':!docs/tasks'`, 2026-10-21): `skills/finalise/SKILL.md`
`:2655` (`--body`) and `:2666` (count). The rest are the helper itself, its bundled copy
`skills/finalise/references/dod-gap-count.sh`, its tests, and two prose mentions: Step 8.4's
`skills/finalise/SKILL.md:2555` and `CHANGELOG.md:98`.
Bug mode reads its body with its own awk (`SKILL.md:2651`), not this helper, so it is untouched.

The existing `--body` test (`shared/resources/tests/finalise-gaps-path.test.mjs:445`,
`dod-gap-count.sh --body prints only the current section, fences included`) covers a populated
section and a document with no section. It has no empty-section case.

### Target Architecture

After the `S*` check in `--body` mode, strip the marker and its newline (if any). If what is left
has no non-whitespace character, print
`HALT: '## Definition of Done - Gaps Identified' in $DOC_FILE is empty — Step 8.4 writes the gap report there`
to stderr and exit 1. Otherwise print it as today. Count mode is unchanged.

The decision is **refuse, not print nothing**. Printing nothing would also let Step 8.5's `[ -n ]`
guard fire. But it would leave `--body` the one path in the helper that turns a defect into a
success exit, against the header contract (`:20-22`). It would also make every other caller
re-implement the guard.

### Important Clarifications

- A section that holds only `### Missing Criteria` (no item) is **not** empty for `--body`: it has
  a non-blank line. Count mode already HALTs on it ("lists no gap"). The two modes keep their own
  definitions of "nothing to report", each matching what that mode reads.
- The marker `S` is internal. It must never reach stdout in any mode.

---

## 4. Scope

### In Scope

- ✅ The empty-section guard in `shared/resources/dod-gap-count.sh` `--body` mode, and the header
  comment that describes `--body`'s output.
- ✅ `npm run bundle` to regenerate `skills/finalise/references/dod-gap-count.sh`.
- ✅ Tests in `shared/resources/tests/finalise-gaps-path.test.mjs`.
- ✅ The one line at `task.222.finalise-gaps-path-fixes.md:493`, with a Change Log row.
- ✅ A `CHANGELOG.md` `[Unreleased]` → `Fixed` entry.

### Out of Scope

- ❌ Step 8.5's call order and its `[ -n ]` guard. Both stay correct, and the guard remains the
  backstop for bug mode, whose body is not read by this helper.
- ❌ Bug mode's gap body and count (`fill-verification-complete.sh`). It has a separate definition,
  per the helper's header (`:14`).
- ❌ Step 8.3's Change Log gap count (out of scope in task.222 § 4 too).

---

## 5. Breaking Changes

None in practice. `dod-gap-count.sh <doc> --body` now exits 1 on an empty gaps section, where it
used to exit 0 and print `S`. The only caller, finalise Step 8.5, already halts on that document at
its next call, so its outcome does not change. `|| exit 1` is already on the `--body` call
(`SKILL.md:2655`).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.223.plan.gap-body-empty-section-and-deferred-line.md](task.223.plan.gap-body-empty-section-and-deferred-line.md)

### Phase 1: Test first (Low risk)

- [x] Add a `--body` test for a section with no lines and one with blank lines only. Each must give
  exit 1, empty stdout, and `HALT` plus "empty" on stderr. Confirm both are red on today's code.
- [x] Add a control case: a section holding only `### Missing Criteria` prints that heading, exit 0.

### Phase 2: Fix (Low risk)

- [x] Add the guard to `--body` mode in `shared/resources/dod-gap-count.sh` (Phase 1 goes green).
- [x] Update the header comment at `:52-53` to say `--body` refuses an empty section.
- [x] `npm run bundle`, then mutation-prove the guard: restore `printf '%s\n' "${OUT#S$'\n'}"` and
  confirm the Phase 1 test goes red. Record the result in the implementation report.

### Phase 3: Records (Low risk)

- [x] Correct `task.222.finalise-gaps-path-fixes.md:493` to point at its `## Deferred Work` section,
  and add a Change Log row (bump `updated:`).
- [x] Add the `CHANGELOG.md` entry citing (task 223).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/dod-gap-count.sh`: the `--body` guard and the header comment.
2. ✅ `skills/finalise/references/dod-gap-count.sh`: regenerated by `npm run bundle`, never
   hand-edited.

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/finalise-gaps-path.test.mjs`: the empty-section cases, the control,
   and the mutation note in the header comment (`:21-23`).

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

4. ✅ `docs/tasks/task.222.finalise-gaps-path-fixes/task.222.finalise-gaps-path-fixes.md`: the
   Deferred Work line and a Change Log row.
5. ✅ `CHANGELOG.md`: `[Unreleased]` → `Fixed`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `dod-gap-count.sh --body` on four shapes. A section with no lines and one with blank
  lines only must refuse. The control (`### Missing Criteria` alone) and the existing populated
  fixture must print.
- **Command**: `command node --test shared/resources/tests/finalise-gaps-path.test.mjs`. The suite
  already runs each case under bash and zsh.
- **Control case** (obs #176): the motivating example is "no lines". Blank-lines-only is the
  variant the change's text does not quote, and the heading-only section is a correct input the
  guard must leave alone.

### Integration Tests

- `evals/shared/tests/finalise-bug-mode.test.mjs`, the Step 8.5 tests (`8.5 on a re-run posts only
  the current gaps section…`), must stay green unchanged.

### Contract Tests

None. No interface changes beyond the exit code for an input that is already a defect.

### Performance Tests

None needed. One shell `case` on the already-captured output.

### Consumer Tests

Step 8.5 is the only consumer. The integration tests above cover it.

---

## 9. Success Criteria

### Functional

- [x] `dod-gap-count.sh <doc> --body` on a current gaps section with no lines exits 1, prints
  nothing on stdout, and prints a `HALT:` line containing "empty" on stderr (Phase 2 adds the guard
  that decides this).
- [x] The same holds for a section that holds only blank lines (Phase 2).
- [x] A section holding only `### Missing Criteria` still prints that line with exit 0. Count mode
  still HALTs on it with "lists no gap".
- [x] The existing `--body` test at `finalise-gaps-path.test.mjs:445` passes unchanged.
- [x] `task.222.finalise-gaps-path-fixes.md` no longer says "Deferred Work: none". Its line names
  QA-222-13 and points at `## Deferred Work`.

### Performance

- [x] Not applicable — no per-PR test applies: the change adds one shell `case` on output already
  captured, with no new pass over the input and no bound to measure.

### Code Quality

- [x] The guard is mutation-proven: reverted alone, the Phase 1 test fails; restored, it passes.
  Recorded in the implementation report.
- [x] `npm run bundle:check` reports 0 problems, and shellcheck is clean on the helper.
- [x] `npm test` passes (one load-sensitive timing test over budget under load; passes alone — see Testing Results).

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` has one `Fixed` entry citing (task 223).

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

1. **A legitimate empty section treated as a defect**
   - **Risk**: some caller relies on `--body` exiting 0 for an empty section.
   - **Probability**: Low. The caller search in § 3 finds one caller, and it halts on that document
     anyway.
   - **Impact**: Low. The caller would see a HALT with a reason, not a silent wrong post.
   - **Mitigation**: the § 3 caller search is re-run during development.
2. **zsh-only behaviour of the strip**
   - **Risk**: `${OUT#S}` / `$'\n'` behave differently under zsh.
   - **Probability**: Low. The helper always runs under `bash` (`bash …/dod-gap-count.sh`). The test
     wraps it in each shell, but the helper itself runs in bash either way.
   - **Mitigation**: the suite's zsh variants run in CI.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a finalise run halts on `--body` on a gaps section that has content.
- **Steps**: revert the task's commit(s) on `develop`, then run `npm run bundle`.
- **Validation**: `finalise-gaps-path.test.mjs` and `finalise-bug-mode.test.mjs` are green.

### Partial Rollback (1-2 hours)

- The guard (Phase 2) and the record fixes (Phase 3) are independent. Revert the guard alone if
  needed. The task.222 line fix stands.

### Forward Fix (< 4 hours)

- A misclassified section shape → widen the non-blank test, and add the shape as a test case.

### Rollback Triggers

- **Critical**: a populated gaps section refused.
- **Non-critical**: wording of the HALT message.

---
## Implementation Summary

**Completion Date:** 2026-10-21

**Approach:** Test-first, as planned. The new test in `finalise-gaps-path.test.mjs` (three empty
shapes — no lines, blank lines only, the heading at end of file — plus the heading-only control)
went red on today's code: `--body` printed `S`, exit 0. The guard in
`shared/resources/dod-gap-count.sh` strips the marker, then its newline if there is one, and
refuses a body with no non-whitespace character. A populated section's output is byte-identical to
before. The header comment says `--body` refuses an empty section. `npm run bundle` regenerated
`skills/finalise/references/dod-gap-count.sh`. task.222's Deferred Work line now names QA-222-13
and points at its `## Deferred Work` section, with a Change Log row. The § 3 caller search, re-run,
finds the same two calls (`SKILL.md:2655` `--body`, `:2666` count).

**Testing Results:** `finalise-gaps-path.test.mjs` + `finalise-bug-mode.test.mjs` 72/72 (bash; zsh variants run in CI only, no zsh on this host). `npm run ci:fast` with `.agents/skills` moved aside: format clean, 6158 tests, 6143 pass, 1 fail — `tests/bundle-missing-source.test.js` over its 20 s timing budget (22.2 s, flagged LOAD-SENSITIVE by the test itself); re-run alone it passed 7/7 in 17.4 s at load average 11.3. `npm run bundle:check`: 128 skills, 0 problems. `shellcheck` clean on the helper. Mutation proof: the one-line `printf '%s\n' "${OUT#S$'\n'}"` restored and bundled → the new empty-section test red, the populated `--body` test still green; guard restored → 18/18.

**Deferred Work:** none.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-21
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.223.qa.1.gap-body-empty-section-and-deferred-line.md](./task.223.qa.1.gap-body-empty-section-and-deferred-line.md)
- **Gate File**: [task.223.gate.1.gap-body-empty-section-and-deferred-line.yml](./task.223.gate.1.gap-body-empty-section-and-deferred-line.yml)

### Test Coverage Summary

- **Tests Executed**: 18
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. The diff reviewer found nothing. The `--body` refusal was probed
(11 cases, 0 escapes, calibrated against the reverted guard) and mutation-proven.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.223.qa.1.gap-body-empty-section-and-deferred-line.md`
**Gate File**: `task.223.gate.1.gap-body-empty-section-and-deferred-line.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR Review (5c)**: `task.223.pr-review.1.gap-body-empty-section-and-deferred-line.md` gave ✅ APPROVE with 0 findings

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 10/10 met. These cover the empty, blank-only and heading-only `--body` shapes, the unchanged populated test, the task.222 line, mutation proof, bundle and shellcheck, `npm test`, and CHANGELOG.
✅ **Tests & PR:** PR #720. `finalise-gaps-path.test.mjs` 18/18 locally. CI reading 1 was SUCCESS across 5 checks @ `b4431205`.
✅ **Documentation:** CHANGELOG `[Unreleased]` Fixed entry, helper header comment, and the regenerated bundled copy.
✅ **Security Review:** ✅ PASS. The boundary was probed (`shell-argv:` `dod-gap-count.sh --body`): 11 executed, 0 reproduced, 0 escaped.
✅ **Compliance Review:** Not applicable, since this is internal tooling with no PII, payment, UI or PHI.

**Task marked as ACCEPTED on:** 2026-10-21

**Detailed Verification Log:** See `task.223.dod.1.gap-body-empty-section-and-deferred-line.md` for the full verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-21 | 1.0     | Initial draft — from task.222's QA-222-13 and PC-1 (5c review) | create-task |
| 2026-10-21 | 1.1 | Review passed (9/10) — Performance criterion re-scoped as not applicable; § 3 caller list names SKILL.md:2555 | review-task |
| 2026-10-21 |  | Status → ready-for-development | review-task |
| 2026-10-21 |  | Implemented — 4 files (+1 bundled copy), 1 test (3 empty shapes + control); mutation-proven | develop |
| 2026-10-21 |  | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-21 | 1.2 | DoD passed — accepted (PR #720) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Test first

- [x] Empty-section tests red on today's code
- [x] Control case added

### Phase 2: Fix

- [x] Guard added; tests green
- [x] Header comment updated
- [x] Bundled; mutation-proven

### Phase 3: Records

- [x] task.222 Deferred Work line corrected
- [x] CHANGELOG entry

---

## References

- **Origin**: task.222 gate 4 `recommendations.future` (QA-222-13), and task.222's
  `task.222.pr-review.1.finalise-gaps-path-fixes.md` finding PC-1
- **Related Skill**: `.agents/skills/finalise/` (Step 8.5)
- **Helper**: `shared/resources/dod-gap-count.sh`

---

## Notes

### Important Reminders

- Edit `shared/resources/dod-gap-count.sh`, never the bundled copy. `npm run bundle` regenerates
  it, and a hand edit is reverted.
- Run the helper with `bash`, as Step 8.5 does.

### Known Issues

**Open** (Non-blocking):

- ⚠️ Step 8.3's Change Log gap count is still composed by the agent (task.222 § 4, out of scope).

### Future Improvements

None.

---

**Status:** Accepted

**Next Steps**:

1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.223.qa.{N}.gap-body-empty-section-and-deferred-line.md`
   - Bug Reports (if needed): `task.223.bug.{N}.{name}.md`
   - Quality Gate: `task.223.gate.{N}.gap-body-empty-section-and-deferred-line.yml`
