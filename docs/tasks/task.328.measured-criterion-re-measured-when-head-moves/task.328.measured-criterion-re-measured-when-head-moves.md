---
id: task.328
title: "A measured criterion is re-measured when the head moves"
type: task
description: "When the head moves, flag a measured criterion (timing, wall-clock, load) whose recorded figure comes from a commit that is not tree-equivalent to the head."
tags: [qa-task, observation]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-11-26
updated: 2026-11-26
estimated_effort_hours: 8
github_issue: 953
---

# Technical Task: A measured criterion is re-measured when the head moves

**Status:** Planned
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

- [ ] Red tests: task 320's criterion 10, verbatim, is listed; each new phrasing is listed; controls
- [ ] Widen `NUMERIC_BOUND`; add the `measured` field in `classify`
- [ ] Corpus count before and after, over every tracked task document's criteria

### Phase 2: QA grades a measured figure by finalise's rule (Risk: Low)

- [ ] `qa-task` `:50` and `:1089`, `qa-story` `:1624`: cite `finalise-dod-ac-prompt.md` Step 3; carried
  figures included
- [ ] Bundle `finalise-delta.js` into both skills (`npm run bundle`)
- [ ] Parity test: both QA skills cite the rule, and neither restates its reason list

### Phase 3: Verify and close (Risk: Low)

- [ ] Replay task 320: the preflight on its document lists #10 with `measured: true`;
  `finalise-delta.js docs-only --base 7cae65a14 --head 5c9044f38` answers `code-changed`
- [ ] Mutation table: revert each remedy, name the test that goes red
- [ ] CHANGELOG entry citing (task 328)

## 7. Files Summary

**Core implementation:**

1. ✅ `shared/resources/finalise-record-preflight.js` — `NUMERIC_BOUND`, `classify`
2. ✅ `skills/qa-task/SKILL.md` — `:50`, `:1089`
3. ✅ `skills/qa-story/SKILL.md` — `:1624`

**Tests:**

4. ✅ `shared/resources/tests/finalise-record-preflight.test.mjs`
5. ✅ A parity test for the two QA skills, new (no qa-task/qa-story parity test exists today;
   place it in `evals/shared/tests/` beside `transition-protocol-parity.test.mjs`)

**Bundled copies:** `npm run bundle` refreshes `skills/{develop-task,finalise}/references/finalise-record-preflight.js`
and adds `skills/{qa-task,qa-story}/references/finalise-delta.js` (and what it reaches).

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
words equal check 22's). None is overridden; if one goes red, the design has drifted.

## 9. Success Criteria

**Functional:**

- [ ] Task 320's criterion 10, verbatim, is listed by `finalise-record-preflight.js check` with `measured: true`
- [ ] Each of "longer", "shorter", "faster", "slower", "larger", "smaller" and "greater" than a number, with and without a leading "no", makes a criterion a record criterion
- [ ] A comparison with no number is not listed, and a record criterion with no bound reads `measured: false`
- [ ] `qa-task` and `qa-story` each state that a measured figure, carried or new, counts for the head only as `finalise-dod-ac-prompt.md` Step 3 grades it, and is otherwise unverified with "re-measure"; a test fails if either loses the citation or restates the reason list
- [ ] The corpus count of newly listed criteria, with five examples by path, is recorded in the QA report

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

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-26 | 1.0 | Initial draft — cut from observation #186 | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: Detect a measured criterion
- [ ] Phase 2: QA grades a measured figure by finalise's rule
- [ ] Phase 3: Verify and close

## References

- Observation #186 — Measured criterion's evidence goes stale when the head moves; QA and record preflight do not flag it
- [Task 320 DoD run 3](../task.320.task-319-leftover-findings/task.320.dod.3.task-319-leftover-findings.md) — criterion 10 `code-changed`
- [Task 320 QA report 7](../task.320.task-319-leftover-findings/task.320.qa.7.task-319-leftover-findings.md) — the re-measurement

## Notes

- QA report: `task.328.qa.{N}.measured-criterion-re-measured-when-head-moves.md`
- Bug reports: `task.328.bug.{N}.{name}.md`
- Quality gate: `task.328.gate.{N}.measured-criterion-re-measured-when-head-moves.yml`
