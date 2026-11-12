# QA Report: Task 297 - QA loop fast gate and an earlier structural move

**Task**: [Link to task document](./task.297.qa-loop-fast-gate-and-earlier-structural-move.md)
**Gate File**: [task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml](./task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Testing Completed**: 2026-11-13
**Gate Status**: PASS

---

## Executive Summary

First review of PR 895. The change gives the QA loop's two weak rules an executable home: step 0a now asks `fast-gate-outcome.sh --command` whether a gate exists and records a skip, and qa-fix's trigger (b) is the `repeat-subject.mjs` script. Both are held by committed, mutation-proved tests, and the full fast gate is green on the LAN server.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All four implementation phases completed
- [x] Tests passing
- [x] Breaking changes: none (an unset key is still a skip)
- [x] Code on feature branch with open PR 895

### Review Methodology

Direct tools only, in the develop pipeline's inline mode. No subagents were dispatched, so the Step 3b diff review was performed by the same agent that ran the rest of QA. The independence loss is recorded here on purpose; the PR conformance review at Step 5c is the independent read.

Diff review: code review (code paths are in the change set). Step 4b: not run through the engine; the one new fenced bash block (the `--command` call in step 0a) was executed by hand in both outcomes by the committed test.

CI on 0d7415e8afca: pending

---

## New Findings This Cycle

First review: none beyond the two LOW cleanups below.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Diagnose task.295 | PASS | Verified | `## Diagnosis` section present in the task document |
| Phase 2: Fast gate trace | PASS | 34 tests | `--command` mode, step 0a text, per-file note |
| Phase 3: Repeat-subject rule | PASS | 10 tests | script, qa-fix trigger (b), bundled copy |
| Phase 4: Tests and changelog | PASS | Verified | CHANGELOG entry cites (task 297) |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Unset key records `Fast gate: skipped (develop.fastGateCommand unset)`, no gate run | `fast-gate-outcome.sh` `--command` branch; step 0a text; held by `qa-loop-fast-gate-outcomes.test.mjs` | PASS |
| Two consecutive gates naming one file the fix edited trigger the offer; a different file, or an unedited shared file, does not | `repeat-subject.mjs:79-85`; held by `repeat-subject.test.mjs` and its two controls | PASS |
| Diagnosis of task.295 recorded | `## Diagnosis` in the task document | PASS |
| No extra gate runs when configured | `--command` run prints `GATE_OUTCOME=run` and exits 0; the test counts calls | PASS |
| `bundle:check` and `ci:fast` pass | `bundle:check` clean (129 skills); `ci:fast` via `test:remote` 8445 pass, 0 fail | PASS |
| Each fix mutation-proved | see below | PASS |
| CHANGELOG states an unset key is still a skip, now recorded | CHANGELOG Unreleased/Added; `changelog-cites.sh` reports `cites (task 297)` | PASS |

Criteria drift: clean (`criteria-drift.js`: no change since the reviewed text).

---

## Breaking Changes Validation

None. An unset `develop.fastGateCommand` is still a skip; it is now recorded.

---

## Issues Found

No HIGH or MEDIUM issues. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

### LOW Severity Issues (2)

- `skills/qa-fix/SKILL.md:653`: `git log -1 --grep='qa-fix cycle {N-1}'` is not scoped to this work item. If this task's own previous fix commit were missing, the newest matching commit in history, from another task, would be taken. Scope it with the `fix(task.{id}):` prefix. Recorded in the gate's `recommendations.future`.
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` step 0a: the `<fastGateCommand>` value is substituted into a double-quoted argument. A value with double quotes or dollar signs could reshape the arguments. No new exposure (the same value is run as the gate), so this is a cleanup.

---

## NFR Assessment

### Performance: PASS
One extra process per fix cycle, and no gate run.

### Reliability: PASS
A skip is a recorded trace, not a HALT. The script fails closed (exit 1, nothing on stdout) on unreadable input.

### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The criteria's boundary signal is `never`, which describes the unset-key skip, not an input gate. `boundary: false` with the reason in the gate.

### Maintainability: PASS
One definition per rule, bundled by the repo's bundler.

---

## Code Review

Correctness bugs (0).

Cleanups (2):
- `skills/qa-fix/SKILL.md:653`: scope the previous-fix lookup to this work item.
- step 0a of the QA loop document: single-quote the substituted command.

Claim checked: the doc says the previous cycle's commit message contains `qa-fix cycle {N-1}`. The documented format `fix(task.{id}): qa-fix cycle {N} — …` and real history (`fix(task.252): qa-fix cycle 2 — …`) agree.

mutation-proven: dropped the `edited.has(f)` clause in `repeatSubjects` → `control: a shared file the previous fix did not edit is one unfixed finding, not a repeat` and `CLI control: the same gates with a fix that touched another file print an empty list, exit 0` went red (8 pass, 2 fail) → covered. The file was restored from the committed copy and the suite re-ran 10/10.

mutation-proven (recorded at `/finalise`, 2026-11-12, on head `e0a964b3`): changed the `*)` arm of the `--command` case in `shared/resources/fast-gate-outcome.sh` so an unset key printed `GATE_OUTCOME=run` instead of the skip line → `--command: an unset, empty or blank command is skipped, a set one is run — one line each` and `5b step 0a's --command block, as written, skips on an unset key and runs on a set one` went red (28 pass, 2 fail) in `qa-loop-fast-gate-outcomes.test.mjs` → covered. The file was restored from a snapshot (`git diff` clean) and the suite re-ran 30/30. Command: `node --test evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`.

---

## Regression Testing

Adjacent suites ran inside `ci:fast` on the LAN server: 8448 tests, 8445 pass, 0 fail (the earlier `stdout-drain-on-exit` guard failure was fixed before this review).

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test evals/shared/tests/repeat-subject.test.mjs evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs
npm run bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/qa-fix
npm run test:remote
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Both rules are executable, held by committed tests, and mutation-proved. No blocking finding.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.297.qa.1.qa-loop-fast-gate-and-earlier-structural-move.md`
**Gate File**: co-located at `task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml`
**Next Steps**: PR conformance review (Step 5c), then finalise.
