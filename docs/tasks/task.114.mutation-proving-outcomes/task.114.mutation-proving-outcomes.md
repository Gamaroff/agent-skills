---
id: task.114
title: "[Task 114] mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you"
type: task
description: "Twelve observations from three days of QA cycles record outcomes mutation-proving.md has no branch for: a mutation that reds the wrong test (#41), reds nothing on dead vs load-bearing code (#32), survives because the wrong line was mutated (#37), stays green because the edit never applied (#47), reds only because of current corpus data (#45), is absorbed by a downstream fallback (#29), or was reverted with git checkout -- and deleted the uncommitted fix with it (#55). Plus three instrument rules (#16, #26, #19) and one stale count copied into three consumers (#18). One reference doc owns all of it; rewrite it as an outcomes table with a rule per outcome, then point the consumers at it."
tags: [mutation-proving, qa-task, qa-story, testing]
category: documentation
status: ready-for-review
priority: High
risk_level: low
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 6
github_issue: 399
---

# Technical Task: mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.114.review.1.mutation-proving-outcomes.md` implemented 2026-09-12
**GitHub Issue**: [#399](https://github.com/Gamaroff/agent-skills/issues/399)

---

## 1. Overview

`shared/resources/mutation-proving.md` is the repo's instrument-audit doc: revert a behaviour,
confirm a test goes red. It covers the false GREEN (six vacuity shapes) and, since task.100, the
false RED. Between 09-09 and 09-11 twelve observations recorded outcomes it does not name — each
one hit live, several producing a false QA finding or a false "coverage gap". The fix is one
document, rewritten around **what a mutation run can tell you** rather than around the two cases
first noticed, plus the three consumers that point at it.

## 2. Motivation

### Current Problems (one per observation, all measured)

1. **Red the wrong test** — a parity test shipped asserting nothing; a structural test happened to
   go red instead (#41).
2. **No red, and it matters which** — dead code vs a load-bearing branch no fixture reaches; the
   tempting response to both is deletion (#32).
3. **Survivor because the mutation didn't feed the assertion** — an early-exit removed, loop still
   returned the value; read as vacuous (#37).
4. **Green because the edit never applied** — `2>/dev/null ||` on a regex substitution; one step
   from writing a false coverage gap into a QA report (#47).
5. **Restore from HEAD deleted the uncommitted fix** — four proofs measured the fix's absence; two
   were false positives with inflated counts (#55).
6. **Red only because of today's corpus** — protection scheduled to expire inside the same run;
   the fixture test then re-implemented the predicate (#45).
7. **Absorbed by a downstream fallback** — reasoning toward a distinguishing input failed three
   times; brute-force enumeration found eight in a second (#29).
8. **No fixture instantiates the input class** — `.toLowerCase()` on a path; every fixture
   lowercase; no mutation can reveal it (#19).
9. **Probe output is about the instrument** — three probes in one cycle lied (#26).
10. **Helper collapses status and value** — refusal tests pass vacuously (#16).
11. **Check blind to what it doesn't iterate** — the guidance half of #42 (code half landed in task.103).
12. **Three consumers say "four shapes" of a doc that has six** and will have more (#18).

### Benefits

1. QA cycles stop burning fix iterations on false findings and stop recording false coverage.
2. One document, one table; consumers point at it without restating counts.

## 3. Technical Background

- `shared/resources/mutation-proving.md` — "## The six shapes vacuity takes" (≈215); false-RED
  table with a "wrong thing mutated" row (task.100); the closing paragraph of the six-shapes section
  (≈299) already anticipates "a seventh in a shape none of its rules models".
- The "lint" the doc refers to is `tests/relationship-assertion-lint.test.js` — it checks **shape 6
  in test files** and never reads `mutation-proving.md`. **No test or lint greps the doc's headings**
  (verified at review: every `mutation-proving` hit under `tests/`, `evals/`, `shared/resources/tests/`
  is a comment or README prose). Headings can be renamed freely. The one mechanical guard is
  `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (`BUNDLED_REFS`), which asserts each
  bundled copy matches the source byte-for-byte — so `npm run bundle` after every source edit.
- Consumers: `skills/develop/SKILL.md:≈656`, `skills/qa-story/SKILL.md:≈373`, `skills/qa-task/SKILL.md:≈474`
  (each says "the four shapes"); `qa-task` Step 3c (≈470) and `qa-story` Step 3c (≈382) record
  `mutation-proven: yes/no` with no outcome vocabulary.
- Bundled into six skills (`develop`, `double-check`, `finalise`, `qa-story`, `qa-task`,
  `review-security`) — edit the source, `npm run bundle`.

## 4. Scope

### In Scope

✅ Rewrite around an outcomes table; keep the six shapes as a section, add the seventh
✅ Instrument rules: assert-applied, snapshot-restore, baseline-green-between, predict-the-red-test, probe-validity, `{ok, value}` helpers
✅ Consumers: Step 3c in qa-task/qa-story records outcome per proof; pointers drop the count; a parity test that the pointers do not state a count
✅ Memory file `feedback_mutation_prove_every_fix` gets the "confirm the revert landed" clause (user-owned; note in the PR for the user to apply)

### Out of Scope

❌ New tooling (a mutation runner) · ❌ re-auditing past QA reports

## 5. Breaking Changes

None. Documentation; Step 3c's record gains a column.

## 6. Implementation Plan

1. Read the twelve observations in id order; draft the outcomes table with one row per outcome
   and its rule; check each rule against the incident that produced it.
2. Rewrite the doc. No test greps its headings (verified at review — see §3), so headings may be
   renamed; re-run `grep -rn "mutation-proving" tests evals shared/resources/tests skills/*/tests`
   before renaming anyway, in case that has changed. Update the six-shapes section's own
   "a seventh…" sentence so the doc does not describe itself with a stale count.
3. Consumers; pointer-count parity test with a non-vacuity floor.
4. `npm run bundle`; suite; mutation-prove the parity test (reinsert "four shapes" → red).

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/mutation-proving.md` | rewritten around outcomes |
| `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` | Step 3c outcome column; pointer |
| `skills/develop/SKILL.md` | pointer |
| `evals/shared/tests/mutation-proving-pointers-parity.test.mjs` (new) | no count in pointers |
| `skills/{develop,double-check,finalise,qa-story,qa-task,review-security}/references/mutation-proving.md` | regenerated by `npm run bundle` (never hand-edited) |
| `CHANGELOG.md` | Changed |

## 8. Testing Strategy

Parity test (mutation-proved by reinserting "four shapes" in one consumer → red); the bundled-copy
parity guard (`finalise-dod-prompt-contract.test.mjs` `BUNDLED_REFS`) green after `npm run bundle`;
bundle idempotent (`npm run bundle -- --check`); `tests/relationship-assertion-lint.test.js` unaffected.

## 9. Success Criteria

1. The doc names every outcome in §2 with a rule and the discriminating question for each
2. No consumer states a count of the doc's shapes; a test asserts it
3. Step 3c's record distinguishes "reds a committed test" from "development-time only"
4. Observations #16, #18, #19, #26, #29, #32, #37, #41, #42, #45, #47, #55 close naming this PR

## 10. Risk Assessment

**Low.** Prose. The one trap is the bundled-copy parity guard — an edit to the source without
`npm run bundle` goes red in CI, and an edit to a `references/` copy is silently reverted by the next
bundle. No test greps the doc's headings (verified at review).

## 11. Rollback Plan

`git revert` + `npm run bundle`.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |
| 2026-09-12 | 1.1     | Review passed (9/10) — bundle count 5→6, phantom "doc lint" replaced by the bundled-copy parity guard, consumer line refs, bundled copies in Files Summary; GitHub issue #399 linked | review-task |
| 2026-09-12 |         | Status → ready-for-development | review-task |
| 2026-09-12 |         | Implemented — 12 files (1 source doc, 3 skill bodies, 6 bundled copies, 1 new test, CHANGELOG), 2 tests (mutation-proved 4 ways) | develop |
| 2026-09-12 |         | QA gate CONCERNS (80/100) — 2 medium (count guard evadable; applied-check lies on missing snapshot), 2 low | qa-task |
| 2026-09-12 |         | QA findings fixed — CR-1/CR-2/CR-3 (parity guard: joined emphasis-stripped window, dedupe, heading.index) and QA-1 (applied-check reads the diff exit code), 1 iteration | qa-fix |

---

## Progress Tracking

### Phase 1: the outcomes table
- [x] `mutation-proving.md` gains "What a mutation run can tell you" — red-the-predicted-test / red-the-wrong-test / no-red-dead / no-red-load-bearing / survivor-because-wrong-mutation / green-because-mutation-never-applied / red-only-because-of-current-data
### Phase 2: the instrument rules
- [x] Assert the mutation applied; snapshot-restore, never `git checkout --`; baseline-green between mutations; name the expected red test first; probe-validity ("what would this print if broken?"); helper returns `{ok, value}`
### Phase 3: the corpus rules
- [x] Seventh shape (no instance of the input class); absorbed-by-fallback → search, don't reason; a check is blind to what it doesn't iterate; committed test vs development-time proof
### Phase 4: consumers
- [x] `qa-task`/`qa-story` Step 3c point at the table and record outcome per proof; the three "four shapes" pointers drop their count; parity test added and mutation-proved; `npm run bundle` run

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-12
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.114.qa.1.mutation-proving-outcomes.md](./task.114.qa.1.mutation-proving-outcomes.md)
- **Gate File**: [task.114.gate.1.mutation-proving-outcomes.yml](./task.114.gate.1.mutation-proving-outcomes.yml)

### Test Coverage Summary
- **Tests Executed**: 3233 (3232 pass, 1 skipped)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (2 medium)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Two MEDIUM: the parity guard is evadable by an emphasised or hard-wrapped count word (CR-1); the document's own applied-check prints `MUTATION APPLIED` on a missing snapshot (QA-1). Two LOW test-file cleanups.

---

## References

- **Plan**: [`task.114.plan.mutation-proving-outcomes.md`](task.114.plan.mutation-proving-outcomes.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #16, #18, #19, #26, #29, #32, #37, #41, #42 (guidance half), #45, #47, #55
- **Canonical**: `shared/resources/mutation-proving.md` (bundled into develop, double-check, finalise, qa-story, qa-task, review-security)
- **Memory**: `feedback_mutation_prove_every_fix` — gains the "confirm the revert landed" clause

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.114.mutation-proving-outcomes/task.114.mutation-proving-outcomes.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
