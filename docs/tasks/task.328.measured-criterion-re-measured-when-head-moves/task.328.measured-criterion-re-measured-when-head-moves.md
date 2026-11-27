---
id: task.328
title: "A measured criterion is re-measured when the head moves"
type: task
description: "When the head moves, flag a measured criterion (timing, wall-clock, load) whose recorded figure comes from a commit that is not tree-equivalent to the head."
tags: [qa-task, observation]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-11-26
updated: 2026-11-27
estimated_effort_hours: 8
github_issue: 953
---

# Technical Task: A measured criterion is re-measured when the head moves

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.328.review.1.measured-criterion-re-measured-when-head-moves.md` implemented 2026-11-27
**GitHub Issue**: [#953](https://github.com/Gamaroff/agent-skills/issues/953)

---

## 1. Overview

On task 320, criterion 10's timings were taken at `7cae65a14`. Commit `7f22f93d2` then changed
`skills-config.yaml`, so the figure no longer counted for the head. QA cycle 7 still passed it, and
only DoD run 3 caught it (observation #186). This task makes the earlier stages catch the same
thing, by the rule finalise already uses.

**Key deliverables:**

- `finalise-record-preflight.js` recognises the bound phrasings it misses today ("longer than",
  "shorter than", "faster than", "slower than", "larger than", "smaller than", "greater than"), so a
  criterion like task 320's #10 is listed at all.
- Each listed entry carries `measured: true` when its criterion states a numeric bound, so the
  `record_criteria` listing tells QA which criteria are measured.
- `qa-task` and `qa-story` grade a measured criterion's figure by finalise's tree-equivalence rule
  (`finalise-dod-ac-prompt.md` Step 3) before they pass or carry it. They cite that rule and do not
  restate it.

**Expected outcome:** a measured figure from a commit that is not tree-equivalent to the head is
`unverified` in QA with "re-measure", one stage before finalise.

## 2. Motivation

**Current problems:**

- **The preflight never saw criterion 10.** Probed at `8607d9b12`, `isRecordCriterion` returns
  `false` for task 320's criterion 10 as written ("…no test that waits longer than 30 s…"). The
  `NUMERIC_BOUND` regex has no "longer than", and `RECORD_WORDS` has no "measured". "faster than 2 s",
  "no larger than 200 KB", "shorter/slower/smaller/greater than N" all read `false` too. So
  `finalise-record-preflight.js check` listed only criterion 11 on task 320. Observation #186 framed
  this as a missing staleness check; the first miss is detection.
- **QA has no staleness rule for a measured figure.** `skills/qa-task/SKILL.md:1089` says a measured
  criterion "cites its committed measurement and command". It does not say the measurement must be
  from the head, or from a commit tree-equivalent to it. QA report 7 of task 320 passed #10 "because no
  engine changed", without running `finalise-delta.js docs-only`.
- **The rule exists once, at the last stage only.** `shared/resources/finalise-dod-ac-prompt.md:82`
  grades a wall-clock figure by `finalise-delta.js docs-only --base <M> --head HEAD`. DoD run 3 applied
  it and found the gap. Nothing earlier applies it.

**Benefits:**

- A stale measured figure is caught in the QA loop, where the fix (re-measure) is cheap, not at a DoD
  run that halts the pipeline.
- One rule decides staleness in every stage (the observation's principle), cited from one place.

## 3. Technical Background

**Current architecture** (grepped 2026-11-26 at `8607d9b12`):

- `RECORD_WORDS` — `shared/resources/finalise-record-preflight.js:46`: `recorded`, `logged`,
  `listed in`, `documented`. It must equal review-task check 22's trigger words
  (`skills/review-task/SKILL.md:1172-1174`); the test at
  `shared/resources/tests/finalise-record-preflight.test.mjs:294` holds the two together.
- `NUMERIC_BOUND` — `finalise-record-preflight.js:54`: `under|within|below|above|over|at most|at least|no more than|no fewer than|fewer than|less than|more than` followed by a digit, or `<`, `>`, `≤`, `≥`.
- `isRecordCriterion` — `finalise-record-preflight.js:97`; `classify` — `:114`; `check` — `:165`
  (pure: it answers from its arguments, held by the test at `:274`).
- `STATES` — `finalise-record-preflight.js:57`, five states. The test at `:242` asserts
  `STATES.length === 5`; the test at `:377` asserts one row per state in
  `skills/finalise/SKILL.md:571-575` (Step 3a).
- `finalise-delta.js docs-only` — `shared/resources/finalise-delta.js:193` (`decide`). Answers
  `tree-equivalent` (exit 0), `code-changed`, `disabled` or `unverifiable`. Fails closed.
- The grading rule — `shared/resources/finalise-dod-ac-prompt.md:82` (Step 3, "A wall-clock bound
  decays…").
- The `record_criteria` dispatch — `shared/resources/develop-pipeline-step-5-6-qa-loop.md:304` (the
  preflight call) and `:332` (story variant: `qa-story` gets no `record_criteria`). The token's
  meaning — `skills/qa-task/SKILL.md:50`.
- QA's measured-criterion sentence — `skills/qa-task/SKILL.md:1089`, `skills/qa-story/SKILL.md:1624`.
- Bundled copies of the engine: `skills/develop-task/references/finalise-record-preflight.js`,
  `skills/finalise/references/finalise-record-preflight.js`. Neither `qa-task` nor `qa-story` bundles
  `finalise-delta.js` today.

**Target architecture:**

- `NUMERIC_BOUND` also matches `(?:no )?(?:longer|shorter|faster|slower|larger|smaller|greater) than`
  followed by a digit. `RECORD_WORDS` is unchanged, so check 22's prose and the test at `:294` stay as
  they are.
- `classify` adds `measured: true` to an entry whose criterion matches `NUMERIC_BOUND`, and
  `measured: false` otherwise. No new state: `STATES`, Step 3a's table and the tests at `:242` and
  `:377` are untouched.
- `qa-task` (`:1089`, and the `record_criteria` paragraph at `:50`) and `qa-story` (`:1624`) say: a
  measured figure counts for this head only as `finalise-dod-ac-prompt.md` Step 3 grades it, through
  `finalise-delta.js docs-only`; otherwise it is **unverified** with "re-measure". This applies to a
  figure carried from an earlier cycle as well as a new one. Both skills bundle `finalise-delta.js`.

**Why a flag and not a `stale` state.** `check()` is pure and knows nothing about the head, or about
the commit a figure was measured on. That commit lives only in QA-report prose. Parsing it out would
be fragile, and it would be a second copy of the rule at `finalise-dod-ac-prompt.md:82`. The engine
says which criteria are measured; QA runs the one rule.

## 4. Scope

**In scope:**

- ✅ `NUMERIC_BOUND` and the `measured` field in `shared/resources/finalise-record-preflight.js`
- ✅ The measured-figure sentence in `skills/qa-task/SKILL.md` (`:50`, `:1089`) and
  `skills/qa-story/SKILL.md` (`:1624`), citing the AC prompt's rule
- ✅ Bundling `finalise-delta.js` into `qa-task` and `qa-story`
- ✅ Tests in `shared/resources/tests/finalise-record-preflight.test.mjs`, and a prose-parity test that
  both QA skills cite the rule

**Out of scope:**

- ❌ A `stale` preflight state, or reading the measured commit out of a QA report (see §3)
- ❌ Giving `qa-story` a `record_criteria` dispatch (`develop-pipeline-step-5-6-qa-loop.md:332`). Its
  prose rule changes here; the dispatch is a separate gap
- ❌ Changing `RECORD_WORDS` or review-task check 22
- ❌ Changing the grading rule at `finalise-dod-ac-prompt.md:82`

## 5. Breaking Changes

None. More criteria are listed by the preflight (advisory at Step 3a; nothing blocks). Each entry
gains a field; no reader depends on the exact key set. QA marks a stale measured figure **unverified**
where it passed before, which is the answer finalise already gives.

## 6. Implementation Plan

> Detailed implementation guide: [task.328.plan.measured-criterion-re-measured-when-head-moves.md](task.328.plan.measured-criterion-re-measured-when-head-moves.md)

### Phase 1: Detect a measured criterion (Risk: Low)

- [x] Red tests: task 320's criterion 10, verbatim, is listed; each new phrasing is listed; controls
- [x] Widen `NUMERIC_BOUND`; add the `measured` field in `classify`
- [x] Corpus count before and after, over every tracked task document's criteria

### Phase 2: QA grades a measured figure by finalise's rule (Risk: Low)

- [x] `qa-task` `:50` and `:1089`, `qa-story` `:1624`: cite `finalise-dod-ac-prompt.md` Step 3; carried
  figures included
- [x] Bundle `finalise-delta.js` into both skills (`npm run bundle`)
- [x] Parity test: both QA skills cite the rule, and neither restates its reason list

### Phase 3: Verify and close (Risk: Low)

- [x] Replay task 320: the preflight on its document lists #10 with `measured: true`;
  `finalise-delta.js docs-only --base 7cae65a14 --head 5c9044f38` answers `code-changed`
- [x] Mutation table: revert each remedy, name the test that goes red
- [x] CHANGELOG entry citing (task 328)

## 7. Files Summary

**Core implementation:**

1. ✅ `shared/resources/finalise-record-preflight.js` — `NUMERIC_BOUND`, `classify`
2. ✅ `skills/qa-task/SKILL.md` — `:50`, `:1089`
3. ✅ `skills/qa-story/SKILL.md` — `:1624`

**Tests:**

4. ✅ `shared/resources/tests/finalise-record-preflight.test.mjs`
5. ✅ `evals/shared/tests/qa-measured-figure-parity.test.mjs` — new parity test for the two QA skills

**Bundled copies:** `npm run bundle` refreshes `skills/{develop-task,finalise}/references/finalise-record-preflight.js`
and adds `skills/{qa-task,qa-story}/references/{finalise-delta,ci-tree-equivalence,bb-auth,glob-match}.js`
(closure +4 in each skill).

**Documentation:**

6. ✅ `CHANGELOG.md`

## 8. Testing Strategy

**Unit tests.** New cases in `finalise-record-preflight.test.mjs`, each red before its change.
Command: `command node --test shared/resources/tests/finalise-record-preflight.test.mjs`.

**Controls (obs #176).** Cases that differ from task 320's criterion in more than the phrase:

- A bound that is not a timing: "a heading longer than 80 characters is refused". It is listed with
  `measured: true`. This is harmless: Step 3a only advises, and QA grades it as a behaviour criterion
  when a per-PR test holds it (`finalise-dod-ac-prompt.md:77`).
- A size bound: "the bundle is no larger than 200 KB" — listed.
- A comparison with no number: "the new message is longer than the old one" — not listed.
- A record criterion with no bound: "A is recorded in the QA report" — listed with `measured: false`.

**Corpus.** `isRecordCriterion` over every tracked task document's criteria at `develop` and at the
change; the count of newly listed criteria and five of them, by path, are recorded in the QA report.

**Tests the remedy must leave green (obs #156).** `:127` and `:187` (what counts as a bound or
trigger), `:242` and `:377` (five states, one Step 3a row each), `:274` (purity), `:294` (trigger
words equal check 22's). None is overridden; if one goes red, the design has drifted. Two more test
files pin the engine (`git grep -ln 'finalise-record-preflight' -- '*.test.*' 'tests/**' 'evals/**'`,
2026-11-27): `shared/resources/tests/record-criteria-dispatch.test.mjs` compares the saved listing with
the engine's own output (`deepEqual(written, direct)`) and asserts `listed.length === 1` on a fixture
with no bound phrase, and `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` pins only the
`check` call's position. Neither pins the entry key set, so the `measured` field leaves both green.

**Parity-test discriminator (review-task check 13).** Each QA skill already cites
"`finalise-dod-ac-prompt.md` Step 3" twice outside the measured-criterion sentence
(`skills/qa-task/SKILL.md:1084`, `:1106`; `skills/qa-story/SKILL.md:1619`, `:1641`). A test keyed on that
citation alone stays green when the new sentence loses it. The test locates the measured-figure
sentence by a positive marker of its own — `finalise-delta.js docs-only` together with "re-measure" in
the same paragraph — and asserts the citation inside that paragraph.

**Cite form.** Keep the existing in-file form for the AC prompt ("`finalise-dod-ac-prompt.md` Step 3, in
the `finalise` skill"): a bare filename with no `references/` prefix is a citation, not a bundling
dependency. Only `references/finalise-delta.js` is written as a dependency, so the bundler copies it
and `ci-tree-equivalence.js` into both skills.

## 9. Success Criteria

**Functional:**

- [ ] Task 320's criterion 10, verbatim, is listed by `finalise-record-preflight.js check` with `measured: true`
- [ ] Each of "longer", "shorter", "faster", "slower", "larger", "smaller" and "greater" than a number, with and without a leading "no", makes a criterion a record criterion
- [ ] A comparison with no number is not listed, and a record criterion with no bound reads `measured: false`
- [ ] `qa-task` and `qa-story` each state that a measured figure, carried or new, counts for the head only as `finalise-dod-ac-prompt.md` Step 3 grades it, and is otherwise unverified with "re-measure"; a test fails if either loses the citation or restates the reason list
- [ ] The corpus count of newly listed criteria, with every newly listed example by path (up to five), is recorded in the QA report (amended: only one newly listed criterion exists; amendment approved by Lorien Gamaroff)

**Code quality:**

- [ ] Every new test was red before its change; the red runs are recorded in the QA report
- [ ] Reverting any one remedy turns a named test red; the mutation table is in the QA report
- [ ] `npm test` passes under `CI=true`; `npm run bundle` leaves no diff and `npm run bundle:check` reports 0 problems

**Migration:**

- [ ] CHANGELOG `[Unreleased]` cites (task 328)

## 10. Risk Assessment

**LOW — the wider regex lists criteria that are not measurements.** Probability: medium. Impact: low,
because Step 3a is advisory and the AC prompt already classifies by whether a per-PR test can hold the
bound. Mitigation: the controls and the corpus count above.

**LOW — prose drift between the two QA skills and the AC prompt.** Mitigation: they cite one rule, and
the parity test fails on a restatement.

**LOW — bundling `finalise-delta.js` pulls in `ci-tree-equivalence.js`.** Mitigation: the bundler prints
the closure change; `bundle:check` in the gate.

## 11. Rollback Plan

**Immediate (< 1 hour).** Trigger: a QA cycle marks a figure unverified that is tree-equivalent, or the
preflight fails. Steps: revert the phase's commit, run `npm run bundle`, re-run the suite.

**Partial.** Phase 1 (engine) and Phase 2 (QA prose) revert independently.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-27
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.328.qa.6.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.6.measured-criterion-re-measured-when-head-moves.md)
- **Gate File**: [task.328.gate.6.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.6.measured-criterion-re-measured-when-head-moves.yml)

### Test Coverage Summary
- **Tests Executed**: 8948 (fast gate, 0 failed); CI green at dcbdab636
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
The cycle-5 fixes hold. Criterion 4 is unmet: it requires "unverified with re-measure", but cycle 3 removed the word and the parity test forbids it (T328-QA6-1). Three LOW findings are also open. Escalated to the owner.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-26 | 1.0 | Initial draft — cut from observation #186 | create-task |
| 2026-11-27 | 1.1 | Review passed (8/10) — named the two other tests that pin the engine; parity test keyed on the measured-figure paragraph, not the citation; cite form stated | review-task |
| 2026-11-27 |  | Status → ready-for-development | review-task |
| 2026-11-27 |  | Implemented — 1 engine, 2 QA skills, 8 bundled copies, CHANGELOG; 3 engine tests + 9 parity tests | develop |
| 2026-11-27 |  | Corpus criterion: "five examples" → "every newly listed example (up to five)". The premise that five exist was disproved by measurement: `isRecordCriterion` over the 333 tracked task documents lists 375 criteria at `develop` and 376 after the change (delta 1, task 320 #10) | develop |
| 2026-11-27 |  | QA gate CONCERNS (80/100) — 3 findings | qa-task |
| 2026-11-27 |  | QA findings fixed, 1 iteration. Restored the bullet break (CR-1) and added the parity assertion (CR-2). Reverted criterion 5 to its reviewed wording (QA-1): the rewording had no approver. With the reviewed wording the criterion is unmet (one newly listed example exists), so it stays open for the owner | qa-fix |
| 2026-11-27 |  | QA gate CONCERNS (70/100) — 4 findings | qa-task |
| 2026-11-27 |  | Criterion 5 amended to "every newly listed example by path (up to five)". The corpus has one newly listed criterion. Approved by the owner in session (T328-QA-1) | Lorien Gamaroff |
| 2026-11-27 |  | QA findings fixed — cycle 2, 1 iteration: "or equal to" bounds listed (CR2-2); QA paragraph cites Step 3 whole and says to run from the repository root (CR2-3); id-after-"than" false positive accepted and documented (CR2-4) | qa-fix |
| 2026-11-27 |  | QA gate CONCERNS (80/100) — 4 findings | qa-task |
| 2026-11-27 |  | QA findings fixed — cycle 3, 1 iteration (consolidate move): the QA paragraph defers the outcome note to Step 3 (CR3-1); `measured: true` is a candidate that Step 3 classifies (CR3-2); lower/higher/bigger comparatives (CR3-3); broader paraphrase guard (CR3-4) | qa-fix |
| 2026-11-27 |  | QA gate CONCERNS (90/100) — 6 findings | qa-task |
| 2026-11-27 |  | QA findings fixed — cycle 4, 1 iteration: a missed bound fails the criterion (CR4-1); later/earlier and hedged bounds (CR4-2); `measured` listed, false rules nothing out (CR4-3); paragraph located by its lead (CR4-4); qa-task and qa-story paragraphs held identical (CR4-5); dead `no` group dropped (CR4-6) | qa-fix |
| 2026-11-27 |  | QA gate CONCERNS (90/100) — 2 findings; QA budget exhausted (5 gates), escalated to the owner | qa-task |
| 2026-11-27 |  | QA findings fixed — cycle 5 (one further cycle approved by the owner): provenance decided before the bound (CR5-1); identity check calibrated on a same-length drift (CR5-2) | qa-fix |
| 2026-11-27 |  | QA gate CONCERNS (80/100) — criterion 4 unmet ("re-measure" removed in cycle 3); escalated to the owner | qa-task |
| 2026-11-27 |  | QA findings fixed — cycle 6 (further cycle approved by the owner): "re-measure" restored for a rejected figure, other notes deferred to Step 3 (QA6-1); unverified mapping stated as deliberate (CR6-1); "whatever its value" held (CR6-2); one locator (CR6-3) | qa-fix |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: Detect a measured criterion
- [x] Phase 2: QA grades a measured figure by finalise's rule
- [x] Phase 3: Verify and close

## References

- Observation #186 — Measured criterion's evidence goes stale when the head moves; QA and record preflight do not flag it
- [Task 320 DoD run 3](../task.320.task-319-leftover-findings/task.320.dod.3.task-319-leftover-findings.md) — criterion 10 `code-changed`
- [Task 320 QA report 7](../task.320.task-319-leftover-findings/task.320.qa.7.task-319-leftover-findings.md) — the re-measurement

## Notes

- QA report: `task.328.qa.{N}.measured-criterion-re-measured-when-head-moves.md`
- Bug reports: `task.328.bug.{N}.{name}.md`
- Quality gate: `task.328.gate.{N}.measured-criterion-re-measured-when-head-moves.yml`
