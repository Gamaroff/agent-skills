# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.8.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.8.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 8 is a re-review of the cycle 7 fix `d51a9dca` (plus the docs-only `a2a41ca1`). All three
gate 7 entries are fixed: bug.15, bug.16 and PRB7-1. Each fix is held by a committed test that QA
mutation-proved. The fast gate and PR CI are green. The reviewer and the probe engine independently
found one new MEDIUM in the same §5c open-coverage check (CR8-1, bug.17). Its new allow-list checks
the shape of each **line** but not of each **value**.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 7 entry | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-238-CR7-1 (medium): provenance matched in free text | bug.15 | ✅ FIXED | Probe `oc-provenance-in-free-text` now rejected (`OPEN_COVERAGE=1`). 4 committed cases in `pr-review-loop-parity.test.mjs`. Mutation (deeper lines read for keys) turned "provenance: pre-existing in a block scalar does not exempt it" red |
| TASK-238-CR7-2 (medium): bare-dash item and next-line flow sequence read 0 | bug.16 | ✅ FIXED | Both probe cases now print `unreadable`, the outcome bug.16 accepts ("counted or unreadable"). The probe still scores them `reproduced` only because their cases expect `1`. 4 committed `unreadable` cases |
| TASK-238-PRB7-1 (low): a test printing the wrapper's signal sentence reads not-measured | — | ✅ FIXED | `log-test-paths` 25/25 (its `log-signal-printed-by-a-test` case is now attributable). New control `log-signal-8` 7/7. Mutation (`END { exit !s }`) turned both PRB7-1 tests red |
| CR7-5 (cleanup): develop-bug's not-measured wording omitted the signal report | — | ✅ FIXED | `develop-bug-step-5-6-verify-loop.md` now names the wrapper's signal report |

bug.15 and bug.16 are moved to Closed (Step 9b).

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551`: the open-coverage
  check allow-lists line shapes but not values. Each of these prints `OPEN_COVERAGE=0` for an entry
  that holds a coverage finding:
  - a block-scalar category (`category: >-` with `coverage` on the next line);
  - a tagged category (`!!str coverage`);
  - an anchored category (`&c coverage`);
  - a `provenance: pre-existing` value continued on a deeper line;
  - a flow value carrying ` #`.

  → Allow-list values too: an unknown category token, a continuation line or a ` #` inside a flow
  value prints `unreadable` (TASK-238-CR8-1, bug.17).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#770, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (`npm run ci:fast`, targeted suites)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine, 81 cases)
- [x] Code Review (Step 3b, one Explore reviewer)

### Review Methodology

Direct tools, with one read-only Explore reviewer for Step 3b. This is a focused re-review of one
fix commit. The traceability mapper was not used: § 9 Success Criteria is a checklist, not a table.

Re-review scope: files changed since gate 7 (head ad6fef33f68f; 27 files) — default

`SAFETY_REPROBE=false`. Clause 1 is false because gate 7's security is `CONCERNS` with
`evidence: measured`. Clause 2 is false: gate 7 has no HIGH entry. Clause 3 is false: gate 7 is not
`FAIL`.

The reviewer was dispatched at 2026-10-28T07:22:31Z and returned after 270 s (`duration_ms`
270165).

CI_SUMMARY=CI on a2a41ca15e69: green

Step 4b ran `qa-execute-snippets.mjs` over the two runnable-prose files the fix changed:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 4 changed blocks, all `mutating` (two
  `rm -rf`, one helper with no literal path, and the open-coverage block as `unrecognised-command:
  awk`), so `changed-blocks-not-executed`.
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: 3 changed blocks, all
  `mutating`.

The open-coverage block is executed by the probe engine's `fence:` form (39 cases) and by
`pr-review-loop-parity.test.mjs`. The fast-gate call is executed by
`qa-loop-fast-gate-outcomes.test.mjs` § 3. zsh is not installed on this host (`zsh-unavailable`),
so the engine ran bash only.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: fast-gate log kept on red | PASS | Verified | Unchanged since gate 7 |
| Phase 2: fast-gate outcomes | PASS | Verified | PRB7-1 fix verified by probe and mutation |
| Phase 3: CI read and 5c coverage routing | CONCERNS | Partial | CR8-1 in the open-coverage check |
| Phase 4: docs, CHANGELOG, restatements | PASS | Verified | The CHANGELOG's "every YAML spelling" claim is false for the CR8-1 shapes (bug.17) |

**Overall Phase Completion**: 4/4 phases complete. One carries a MEDIUM.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 | PASS | `qa-loop-fast-gate-outcomes.test.mjs` § 1 (in `ci:fast`) |
| SC-2 | PASS | `qa-loop-fast-gate-outcomes.test.mjs`. Probes `log-test-paths` 25/25 and `log-signal-8` 7/7 |
| SC-3, SC-3a | PASS | `shared/resources/tests/qa-ci-read.test.mjs` (in `ci:fast`). No change since gate 7 |
| SC-4 | CONCERNS | `pr-review-loop-parity.test.mjs` is green, but the probe shows coverage findings in five value shapes routed as "none" (CR8-1) |
| SC-4a, SC-4b | PASS | `pr-review-loop-parity.test.mjs` |
| SC-5, SC-6 | PASS | Unchanged since gate 7 |
| SC-7 | PASS | `npm run ci:fast`: 6521 tests, 6507 pass, 0 fail, 14 skipped |
| SC-8 | PASS | `npm run bundle:check`: 128 skills, 0 problems |
| SC-9 | PASS | `validate`: develop-bug, develop-task and develop-story pass. qa-task, qa-story, qa-fix and develop are unchanged since gate 7 |
| SC-10 | PASS (this cycle's guards) | The 2 QA mutations below are `covered`. qa-fix 7 records each new test as red against `ad6fef33` |
| SC-11, SC-12 | PASS | Unchanged. The CHANGELOG claim is corrected under bug.17 |

---

## Breaking Changes Validation

### Breaking Change: a 5c `CONCERNS` with an open coverage finding uses one more QA cycle
Documented: Yes
Migration Path Provided: Yes (none needed)
Migration Tested: N/A
Consumer Code Updated: N/A
Notes: unchanged since gate 7.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the open-coverage check reads 0 for value shapes it did not read**
- **Severity**: MEDIUM
- **Category**: Functional (boundary)
- **Bug Report**: [task.238.bug.17.open-coverage-reads-zero-for-unread-value-shapes.md](./task.238.bug.17.open-coverage-reads-zero-for-unread-value-shapes.md)
- **Observation**: five probe cases print `OPEN_COVERAGE=0` for a block holding a coverage finding.
  The reviewer reproduced the category variants independently.
- **Impact**: a `CONCERNS` review with an open coverage gap exits to Step 7, and `/finalise` fails it
  later. Plausibility, measured: 0 of 183 tracked PR review reports use such a value, and review-pr
  emits plain scalars. The severity stays at the reviewer's `medium` for consistency with bug.16, the
  same class, because the check's documented claim is false either way.
- **Recommendation**: allow-list values (category tokens, no continuation line, no ` #` in a flow
  value). Anything else prints `unreadable`.
- **Priority**: P2

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged since gate 7.

### Reliability — CONCERNS
CR7-4 is carried as advisory and not fixed. The background read keys on the last `GATE_EXIT` line,
but the removal keys on any `GATE_EXIT=0` line.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 81 (escaped 0), record `task.238.qa.8.security.run.json`
- Controls:
  - `open-coverage-check`: 24/24.
  - `open-coverage-shapes-7`: 2 of 4 match. The other two print `unreadable`, which bug.16 accepts.
  - `open-coverage-shapes-8`: 5 of 7 hostile cases reproduced (CR8-1). Both template controls pass.
  - `log-test-paths`: 25/25.
  - `log-signal-8`: 7/7.
  - `exit-argument`: 13/13.
- `qa-ci-read.sh` is unchanged since gate 7, so its `pr-argument` control was not re-run.

### Maintainability — PASS
Both cycle 7 guards are mutation-proved (below).

---

## Code Review

Advisory except where promoted. `code_review_blocking=true` was passed by the pipeline.

**Boundary: true.** The §5c open-coverage block (`fence:` form) and `fast-gate-outcome.sh`
(`shell-argv:` form) were both probed. `probes_executed: 81`, `escaped: 0`.

**Correctness bugs (1):**
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551`: the allow-list checks
  line shapes, not category values. A block-scalar, tagged or anchored `category: coverage` prints
  `OPEN_COVERAGE=0`. → Treat an indicator-led or out-of-enum category value as unreadable.

Medium confidence would not gate on its own. The probe engine reproduced it (5 cases), so QA entered
it in `top_issues[]` as **TASK-238-CR8-1**, together with the two probe-only variants of the same
defect.

**Cleanups (0).**

finding-anchors: `ok` (`--rev HEAD`).

Mutation proofs (scratch worktree at `a2a41ca1`, since removed):

```text
mutation-proven: deeper lines read for keys (undo key-position reading) → pr-review-loop-parity "provenance: pre-existing in a block scalar does not exempt it → 1" → covered
mutation-proven: signal sentence counted wherever it appears (END { exit !s }) → qa-loop-fast-gate-outcomes "attributable: … before node's spec summary (PRB7-1)" and "… tap summary (PRB7-1)" → covered
```

Two of the ten new tests were mutation-proved here. qa-fix 7 records all ten as red against
`ad6fef33`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`ci:fast`) | PASS: 6521 tests, 0 fail |
| Prior open-coverage cases (cycle 5, 24 cases) | PASS: 24/24 |
| Prior log-path cases (cycle 7, 25 cases) | PASS: 25/25 |
| `--exit` argument (13 cases) | PASS: 13/13 |
| Generated copies (`bundle:check`) | PASS |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (§5c open-coverage check)
- `shared/resources/fast-gate-outcome.sh`
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
- `evals/shared/tests/pr-review-loop-parity.test.mjs`, `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`
- `skills/review-pr/SKILL.md` (the Machine-Readable Findings template)

### Test Commands Executed

```bash
npm run ci:fast
npm run validate -- skills/{develop-bug,develop-task,develop-story}/
npm run bundle:check
command node .agents/skills/qa-task/references/security-probe.mjs … (6 controls, record task.238.qa.8.security.run.json)
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file {2 changed docs} --diff-base {merge base} --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs  # baseline and under 2 mutations, scratch worktree
```

### Coverage Report
Not measured. The repository records no coverage target for shell scripts or for awk embedded in
prose. The coverage evidence is the probe record and the mutation proofs.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR8-1 (bug.17): allow-list the open-coverage check's values.

### Short-term Actions (Non-Blocking)
1. The open-coverage awk has drawn findings in gates 1, 4, 7 and 8 and in DoD 1, each a further YAML
   shape. Rather than patch it again, consider a structural move: parse the block with a real YAML
   parser in a bundled script, or narrow the check to review-pr's emitted shape.
2. Carried: CR7-3, CR7-4, CR7-6, CR6-3, CR6-5 and CR6-7, plus the structured pre-existing comparison
   (Deferred Work).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: every gate 7 entry is fixed and held, and nothing is HIGH. One MEDIUM remains: a
documented guarantee of the open-coverage check that its allow-list does not yet keep.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bug.17 fixed, or accepted as deferred work.

---

**QA Report**: co-located at `task.238.qa.8.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.8.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: `/qa-fix` cycle 8 on CR8-1
