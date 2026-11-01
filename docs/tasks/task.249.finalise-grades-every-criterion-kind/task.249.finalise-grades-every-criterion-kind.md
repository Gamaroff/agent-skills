---
id: task.249
title: "/finalise grades every kind of criterion fairly"
type: task
description: "Give /finalise's AC and security agents a defined path for the criteria they currently mis-grade — process criteria, CI-state criteria, records in the implementation report, and probe cases stricter than the spec — and make review-task require a criterion that demands a record to name where the record lives."
tags: [finalise, review-task, create-task, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-01
updated: 2026-11-01
assignee:
estimated_effort_hours: 14
github_issue: 802
---

# Technical Task: /finalise grades every kind of criterion fairly

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.249.review.1.finalise-grades-every-criterion-kind.md` implemented 2026-11-01
**GitHub Issue**: [#802](https://github.com/Gamaroff/agent-skills/issues/802)

---

## 1. Overview

**Description.** `finalise-dod-ac-prompt.md` Step 3 defines a behaviour criterion and three test-free
kinds: "no unit tests applicable", documentation and measured. Real work items carry criteria that
fit none of these. Their only evidence is a CI state, a verification process, or a record in the
implementation report. The agent forces each one into the nearest kind and fails it, or grades it
before its evidence can exist. The security agent has a similar problem: it can expect a stricter
verdict than the work item's own rule. Each mis-grade ends in an operator override at the last step.

**Scope.** The finalise DoD prompts (`finalise-dod-ac-prompt.md`, `finalise-dod-security-prompt.md`),
`finalise` Steps 3b.1 and 6, `review-task` / `review-story`, and the `create-task` criterion guidance.

**Key deliverables.**

1. A **process criterion** kind in the AC prompt.
2. A **CI-state** classification (`DEFERRED-CI`) that `/finalise` resolves from CI reading 1.
3. A rule for where a recorded measurement may live, followed by both `create-task` and the AC prompt.
4. A spec-tied `correct` verdict for each probe case, plus an advisory `spec_challenges[]` list.
5. A `review-task` / `review-story` check: a criterion that demands a record must name where the
   record lives.

**Expected outcome.** No criterion fails at finalise only because its kind had no defined path.

## 2. Motivation

### Current Problems

- **A process criterion has no path** (obs #82). A criterion such as "each fix is mutation-proven"
  is about how the work was verified. It is neither behaviour nor measured.
  `finalise-dod-ac-prompt.md` Step 3 (`**Three kinds of criterion may carry
  \`test_citation: "NOT_APPLICABLE: …"\`, and only these three:**`) gives it no `NOT_APPLICABLE`
  route, so it FAILs for having no test.
- **A CI-green criterion is graded too early** (obs #110). The AC agent runs at Step 3b. CI reading 1
  is taken later (`skills/finalise/SKILL.md:1244`). A criterion whose only evidence is CI state comes
  back PARTIAL or FAIL from an agent that cannot see the reading that will decide acceptance.
- **The implementation report is not committed evidence at finalise** (obs #105). The measured kind
  says its `code_citation` is a line in "a committed artifact … (typically the implementation report
  or a QA report)". The implementation report is committed by the pipeline's last step, after
  finalise, so a criterion that cites it is FAIL "uncommitted" on every run.
- **Probe cases can be stricter than the spec** (obs #81). When the shared corpus does not fit the
  control, the security agent writes inline `cases:` (`finalise-dod-security-prompt.md` Step 4.2), and
  each case's verdict — its `direction` (`hostile` | `legitimate`) and `correct` prose — comes from the
  agent's own judgement. Code that does exactly what the work item specifies can FAIL security, and
  `finalise` Step 3b.1 (`skills/finalise/SKILL.md:566`) has no disposition for "the case contradicts
  the spec". Corpus cases are not affected: their verdict is the shared corpus's.
- **A criterion can demand a record without naming where it lives** (obs #77). "Each finding is
  recorded" passes `review-task`. At finalise the agent searches for the record and fails when it
  guesses the wrong file.

### Benefits of Solution

- Each criterion kind has one defined grading path, so overrides at finalise stop being routine.
- CI-state criteria are graded from the reading that already decides acceptance.
- A spec that is too loose becomes a recommendation to the owner, not a FAIL against code that
  follows the spec.
- Record locations are fixed at authoring, when changing a criterion costs nothing.

## 3. Technical Background

### Current Architecture

- **AC prompt Step 3** (`shared/resources/finalise-dod-ac-prompt.md`) holds the rules: the citation
  rule, the execution rule, the quantifier rule (rule 6, `:51`), and the three test-free kinds. The
  output is YAML: `status` PASS/FAIL/PARTIAL, `code_citation`, `test_citation`, `test_runs_per_pr`,
  `members`.
- **The AC record and re-run scope** (`shared/resources/finalise-rerun-scope.js`) merge the
  agent's YAML. `computeOverall` (`:467`) folds statuses into the section verdict, and it knows no
  `DEFERRED-CI`. `recordEntry` (`:478`) coerces every non-PASS status to `FAIL`.
- **`AC_OVERALL`** is bound once, at Step 3c, from the merged record (`skills/finalise/SKILL.md:759`),
  and Step 6 decides on it as-is (`:1243`).
- **CI reading 1** is taken in finalise Step 6 (`skills/finalise/SKILL.md:1244`), after the agents
  return.
- **Probe plan.** The security agent emits a `probe_plan`; its cases come from the corpus or, when
  the corpus does not fit, inline `cases:` the agent writes, which `/finalise` saves as
  `<stem>.dod.<N>.security.cases.json`. A case's verdict is `direction` plus `correct` (prose) and an
  optional machine `expected` (`security-input-corpus.mjs:39-57`). Step 3b.1 runs the plan with
  `security-probe.mjs`; the run record's `reproduced[]` holds case **ids** (`security-probe.mjs:2221`),
  and every reproduced case counts against security.

### Target Architecture

- AC prompt Step 3 lists **five** test-free kinds. The two new ones:
  - **Process criterion.** The agent reads where the document defines the process (for example the
    Testing Strategy), applies the quantifier rule to that unit, and cites the committed record per
    unit. PASS when every unit is covered; FAIL naming the uncovered units.
  - **CI-state criterion.** The agent returns `status: DEFERRED-CI` and does not grade it.
    `finalise` Step 6 resolves it from CI reading 1: SUCCESS → PASS (a `SUCCESS (tree-equivalent to
    {sha})` reading included, with the sha in the note), FAILURE → FAIL, anything else → the existing
    CI HALT path. `computeOverall` treats an unresolved `DEFERRED-CI` as not PASS. The resolution
    **returns the re-folded section verdict** (`computeOverall` over the resolved entries), and Step 6
    rebinds `AC_OVERALL` from it before the acceptance decision — rewriting the entry alone would leave
    `AC_OVERALL` at the `PARTIAL`/`FAIL` Step 3c folded.
- **Measured criteria cite only artefacts committed at acceptance**: the QA report, the gate, or the
  DoD file. `create-task`'s performance-criterion guidance says the same. A citation of the
  implementation report reads `note: "cite the QA report or DoD"` instead of a bare FAIL.
- **Agent-authored inline probe cases** each carry a `spec_ref`: the work-item line (or cited
  reference-doc line) the case's `direction` and `correct` verdict come from. Corpus cases need none —
  their verdict is the corpus's. An inline case without `spec_ref` is a plan-shape error the DoD
  reports. A case the agent thinks the spec should forbid, but that the spec allows, goes in
  `spec_challenges[]`, not in `cases:`. The DoD renders that list as an owner recommendation, outside
  `checks[]`. Step 3b.1 maps each reproduced case id to its entry in
  `<stem>.dod.<N>.security.cases.json`, reads its `spec_ref`, and routes a reproduced case whose verdict
  contradicts its `spec_ref` to the operator as a spec question, not a security FAIL.
- **review-task / review-story** gain a check: a criterion that demands a record ("recorded",
  "logged", "listed in") must name the record's location. A criterion that does not is an
  Important finding.

## 4. Scope

### In Scope

✅ Process and CI-state kinds in `finalise-dod-ac-prompt.md`, and `DEFERRED-CI` in `finalise-rerun-scope.js`
✅ Finalise Step 6 resolving `DEFERRED-CI` from CI reading 1
✅ The rule for where a measured criterion's record lives, in the AC prompt and in `create-task`
✅ `spec_ref` and `spec_challenges[]` in the security prompt, and the Step 3b.1 disposition
✅ The record-location check in `review-task` and `review-story`

### Out of Scope

❌ QA-side mirrors of these rules. task.248 covers the QA side. Once this task lands, QA's
"classify the way finalise will" cite picks up the new kinds without restating them.
❌ PR-head measurement by `/finalise` (obs #43 part b; the measured-criteria card).
❌ A probe engine form that stages filesystem state (obs #140, second bullet).

## 5. Breaking Changes

**AC YAML: one new status value.** `DEFERRED-CI` is new. Every reader of the AC YAML must accept it:
`finalise-rerun-scope.js` (`merge`, `computeOverall`, the record writer) and the DoD renderer. A
reader that does not accept it would treat it as FAIL or crash. A test runs each reader on a
`DEFERRED-CI` entry.

**Security YAML: two additive fields.** `spec_ref` per case and a top-level `spec_challenges[]`. Both
are optional to readers; old plans stay valid.

**Migration path:** none for existing DoD files. They are records of past runs.

## 6. Implementation Plan

> Detailed implementation guide: [task.249.plan.finalise-grades-every-criterion-kind.md](task.249.plan.finalise-grades-every-criterion-kind.md)

### Phase 1: DEFERRED-CI end to end (Risk: Medium)

**Files:** `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-rerun-scope.js`,
`shared/resources/tests/finalise-rerun-scope.test.mjs`, `skills/finalise/SKILL.md`

- [x] AC prompt: define the CI-state kind and the `DEFERRED-CI` status.
- [x] `finalise-rerun-scope.js`: accept `DEFERRED-CI` in `merge` and the record (`recordEntry` keeps
      it rather than coercing it to `FAIL`). `computeOverall` never folds it to PASS.
- [x] Finalise Step 6: after CI reading 1, one fenced block calls a `finalise-rerun-scope.js`
      subcommand that resolves each `DEFERRED-CI` criterion, rewrites its record entry, and returns
      the re-folded section verdict; the block rebinds `AC_OVERALL` from it.
- [x] Tests: each reader on a `DEFERRED-CI` entry; the three resolutions (SUCCESS, FAILURE, other);
      one `DEFERRED-CI` + one PASS under SUCCESS re-folds to `PASS`.

### Phase 2: Process criteria and record location (Risk: Low)

**Files:** `shared/resources/finalise-dod-ac-prompt.md`, `skills/create-task/SKILL.md`, `skills/create-story/SKILL.md`

- [x] AC prompt: the process kind, citing rule 6 for its per-unit check.
- [x] Measured kind: allowed record locations are the QA report, gate and DoD; an implementation-report
      citation gets the named note.
- [x] create-task / create-story criterion guidance: name the committed-at-acceptance artefact a
      measurement goes in.

### Phase 3: Spec-tied probe verdicts (Risk: Medium)

**Files:** `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md` (Step 3b.1 and the DoD render)

- [x] Security prompt Step 4: each agent-authored inline case carries `spec_ref`; a
      stricter-than-spec case goes in `spec_challenges[]`.
- [x] Step 3b.1: a reproduced inline case (looked up by id in the cases file) whose verdict
      contradicts its `spec_ref` is routed as a spec question; an inline case without `spec_ref` is
      reported as a plan-shape error. `spec_challenges[]` renders under a "Recommendations for the
      owner" heading.

### Phase 4: Record-location check at review (Risk: Low)

**Files:** `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`

- [x] A new numbered Step 3 check after check 21 (`skills/review-task/SKILL.md:1076`), with its obs
      reference, mirrored in review-story.
- [x] `npm run bundle`, and commit the regenerated `references/` copies.

## 7. Files Summary

**Core implementation**

1. `shared/resources/finalise-rerun-scope.js`: `DEFERRED-CI`

**Prose**

2. `shared/resources/finalise-dod-ac-prompt.md`: process and CI-state kinds, record location
3. `shared/resources/finalise-dod-security-prompt.md`: `spec_ref`, `spec_challenges[]`
4. `skills/finalise/SKILL.md`: Step 3b.1 disposition, Step 6 resolution, DoD render
5. `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`: record-location check
6. `skills/create-task/SKILL.md`, `skills/create-story/SKILL.md`: measurement-location guidance

**Tests**

7. `shared/resources/tests/finalise-rerun-scope.test.mjs`
8. `shared/resources/tests/finalise-deferred-ci.test.mjs` (new; reached by `test:suite`'s
   `shared/resources/tests/*.test.mjs` glob): extracts the Step 6 resolution fence from
   `skills/finalise/SKILL.md` and runs it

**Generated:** `skills/*/references/` copies from `npm run bundle`.

**Documentation:** `CHANGELOG.md` (`[Unreleased]`, citing task 249).

## 8. Testing Strategy

**Unit tests (per PR).** `finalise-rerun-scope.test.mjs` covers `DEFERRED-CI` through `merge`,
`computeOverall` and the record. `finalise-deferred-ci.test.mjs` runs the Step 6 resolution block as
an executed snippet, with SUCCESS, FAILURE and PENDING rollups, and asserts the rebound `AC_OVERALL`.

**Removed literals (searched).** The AC prompt's "Three kinds … only these three" and "typically the
implementation report or a QA report" are rewritten. `git grep -n "Three kinds\|only these three\|implementation report or a QA report" -- '*.test.*' 'evals/**'`
found no test pinning either (2026-11-01).

**Controls (obs #176).** A CI-state criterion beside an ordinary behaviour criterion, which must
still need its test. Also a measured criterion that cites the QA report, which must still PASS.

**Mutation proofs.** Make `computeOverall` treat `DEFERRED-CI` as PASS; make the Step 6 block map
PENDING to PASS. A named test goes red for each.

**Prompt changes** (process kind, `spec_ref`, record location) carry no executable assertion. They
are checked by the prompt-fixture eval layer where one exists for the prompt. Otherwise they are
recorded as reviewed-only in the implementation report, with the reason.

## 9. Success Criteria

### Functional

- [ ] `computeOverall` never returns PASS while any criterion is `DEFERRED-CI`. A test holds this,
      and the mutation that breaks it turns the test red.
- [ ] Finalise Step 6 resolves `DEFERRED-CI` from CI reading 1: SUCCESS → PASS, FAILURE → FAIL,
      anything else → the existing CI HALT, and rebinds `AC_OVERALL` from the re-folded verdict.
      `finalise-deferred-ci.test.mjs` covers all three, and the re-fold.
- [ ] The AC prompt defines the process and CI-state kinds. Its list of test-free kinds names five,
      and the measured kind names the QA report, gate and DoD as record locations.
- [ ] The security prompt requires `spec_ref` on each agent-authored inline case and defines
      `spec_challenges[]`. Step 3b.1 states the disposition for a case that contradicts its `spec_ref`.
- [ ] `review-task` and `review-story` carry the record-location check as an Important finding.

### Code Quality

- [ ] `npm run ci` passes, and `npm run test:clean-checkout` passes.
- [ ] `npm run bundle:check` reports 0 problems.

### Migration

- [ ] CHANGELOG `[Unreleased]` cites task 249.

## 10. Risk Assessment

### MEDIUM

1. **A `DEFERRED-CI` entry is left unresolved.**
   - Risk: a Step 6 path skips the resolution, and the criterion is never graded.
   - Mitigation: `computeOverall` treats unresolved as not PASS, so the failure is loud, never a
     silent pass.
2. **The agent over-uses the new kinds.**
   - Risk: it classifies a behaviour criterion as process or CI-state to avoid needing a test.
   - Mitigation: the prompt keeps "a behaviour criterion never takes any of these paths". The
     CI-state kind applies only when **all** of the criterion's evidence is CI state.

### LOW

3. **`spec_challenges[]` is ignored by owners.**
   - Mitigation: it renders in the DoD and the PR comment, where the owner reads acceptance.

## 11. Rollback Plan

**Immediate (< 1 hour).**
- Triggers: finalise HALTs on a valid run, or the AC section reads PASS with an ungraded criterion.
- Steps: revert the merge commit on `develop`.
- Validation: `npm run ci` is green on the revert.

**Partial.** Phases 2–4 are prose and revert alone. Phase 1 reverts as one unit (prompt, engine and
Step 6 together).

**Forward fix.** Prompt wording issues: fix forward.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-01
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.249.qa.1.finalise-grades-every-criterion-kind.md](./task.249.qa.1.finalise-grades-every-criterion-kind.md)
- **Gate File**: [task.249.gate.1.finalise-grades-every-criterion-kind.yml](./task.249.gate.1.finalise-grades-every-criterion-kind.yml)

### Test Coverage Summary
- **Tests Executed**: 7026
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Two MEDIUM: a resolved CI-state PASS is carried to a later DoD run without re-grading (T249-QA-1); Step 3b.1 item 3a looks inline probe cases up by id alone (T249-QA-2).

## Change Log

<!-- change-log-start -->
| Date       | Version | Description | Author      |
| ---------- | ------- | ----------- | ----------- |
| 2026-11-01 | 1.0     | Initial draft — cut from observations #77, #81, #82, #105, #110 | create-task |
| 2026-11-01 | 1.1     | Review passed (8/10) — Step 6 re-folds `AC_OVERALL`; `spec_ref` scoped to inline cases (`direction`/`correct`); clean-checkout criterion; Step 6 test named; anchors refreshed | review-task |
| 2026-11-01 |         | Status → ready-for-development | review-task |
| 2026-11-01 |         | Implemented — 18 files, 21 tests | develop |
| 2026-11-01 |         | QA gate CONCERNS (80/100) — 2 findings | qa-task |
| 2026-11-01 |         | QA findings fixed — T249-QA-1, T249-QA-2, CR-3, CR-4; 1 iteration | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: DEFERRED-CI
- [x] Prompt, engine, Step 6, tests

### Phase 2: Process criteria and record location
- [x] AC prompt, create-task, create-story

### Phase 3: Spec-tied probe verdicts
- [x] Security prompt, Step 3b.1, DoD render

### Phase 4: Review check
- [x] review-task, review-story, bundle

---

## References

- Observation #77: Criteria demanding a recorded artifact pass review without naming where the record lives
- Observation #81: Finalise probe cases expect stricter verdicts than the work item's spec, so spec-faithful code FAILs security
- Observation #82: finalise AC prompt has no path for a process criterion such as 'mutation-proven'
- Observation #105: A success criterion that needs the implementation report cannot be evidenced at finalise
- Observation #110: finalise AC agent grades a CI-green criterion before CI reading 1 exists
- Sibling: task.248 (QA applies the finalise DoD's rules). It is independent; the registry Notes give the order.

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, then run `npm run bundle`.
- `DEFERRED-CI` is a new enumeration value. Grep every reader of the AC status before calling Phase 1 done: `git grep -n "PARTIAL" -- shared/resources skills/finalise`.
