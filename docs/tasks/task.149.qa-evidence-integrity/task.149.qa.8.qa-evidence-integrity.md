# QA Report: Task 149 - QA evidence integrity: qa-task/qa-story claims that no check reads back

**Task**: [Link to task document](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.8.qa-evidence-integrity.yml](./task.149.gate.8.qa-evidence-integrity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Testing Completed**: 2026-09-26
**Gate Status**: PASS

---

## Re-Review Context

This is cycle 8 of 9 granted. It gates cycle 7's fix `2892f50b`.

| Previous issue | Severity | Status | Evidence |
| -------------- | -------- | ------ | -------- |
| [TASK-149-BUG-11](./task.149.bug.11.read-back-picks-dotfile-gate.md): a dotfile is chosen as the gate | MEDIUM | FIXED | The probe `dotfile-gate` reads the real gate. The reviewer confirmed the `--path` claims under `/bin/bash` 3.2 and bash 5.3 against three real task directories. M11–M14 are covered |
| CR-3 (cycle 7, advisory): an ambiguous cycle is chosen silently | low | FIXED | The probe `ambiguous-gate` halts |

---

## Executive Summary

The cycle-7 consolidation holds. `qa-read-back.js` now asks `qa-cycle.sh --path` for the cycle's gate
and report, and has no second grammar of its own. The reviewer confirmed every stated claim and found
no high-confidence bug. All four boundaries engage (84 probes, 0 reproduced), and CI is 5/5 green. The
remaining medium finding sits in code this branch did not write: the QA skills' tracker blocks still
find the gate with `find -name`. That lookup is on `origin/develop` unchanged, so it goes to a named
follow-up.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

The review used direct tools plus one read-only diff reviewer (Explore), which returned after 240 s.
It started from the isolated fix diff and then read the scoped diff of the four changed source files
against `origin/develop`. Its one medium claim (CR-1) was reproduced, and its provenance was checked
against `origin/develop` before routing.

Re-review scope: since 2026-09-26T13:20:00Z (default)

Step 4b: not applicable. No runnable prose changed in scope. `2892f50b` touches a shell helper (a
header comment and a new mode), a `.js` file, tests and task docs only.

---

## New Findings This Cycle

- **[medium/medium, pre-existing]** `skills/qa-task/SKILL.md` THIS_GATE / LATEST_GATE (and the same
  blocks in qa-story and develop-pipeline-step-5-6-qa-loop.md): `find -name "task.*.gate.${QA_CYCLE}.*.yml"`
  misses a zero-padded gate that `qa-cycle.sh` counts. Reproduced: `--path` prints `task.9.gate.02.b.yml`
  and `THIS_GATE=[]`. The same lines are on `origin/develop` (4, 4 and 1 occurrences), so the
  finding goes to `recommendations.future`. The `qa-cycle.sh` header's "the only definition" wording
  overstates the present state until that follow-up lands.
- **[low/low]** `shared/resources/qa-cycle.sh`: `--path` ignores the file-name prefix, so a bug's own
  gate stored in the parent directory would read as ambiguous. That fails closed. Routed to future.
- Cleanups (advisory): CR-3 extra args are ignored, CR-4 the helper's refusal text uses an absolute
  path, CR-5 the `--path` tests use the bash on PATH only.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: `--copy-as` seeding | PASS | 24/24 engage |
| Phase 2: export-and-probe decline | PASS | — |
| Phase 3: standards-named validation | PASS | `npm run validate` passes for qa-task, qa-story and qa-fix |
| Phase 4: post-edit read-back | PASS | 18/18 engage; one definition of the cycle's file |
| Phase 5: tests + docs | PASS | `TMPDIR=/tmp` 90/90 across the three suites |

---

## Success Criteria Verification

| Criterion | Actual | Status |
| --------- | ------ | ------ |
| Full suite | CI `test` passed at `2892f50b`. Local `ci:fast` ran 4238 tests: 4237 pass, 0 fail | PASS |
| Could-not-look is never a pass | Holds; the helper failing to run is exit 2 | PASS |
| The read-back reads the gate `qa-cycle.sh` counted | Holds by construction: the helper names it | PASS |

---

## NFR Assessment

### Security — PASS
- **Evidence**: measured
- **Probes executed**: 84. Run record: [task.149.qa.8.security.run.json](./task.149.qa.8.security.run.json)
- `qa-cycle.sh` was probed as a shell boundary: filename sink, 28/28.

### Performance — PASS · Reliability — PASS · Maintainability — PASS (advisory CR-3/4/5)

---

## Code Review

Blocking was resolved (`code_review_blocking=true`). No finding was promoted, because none is both
`category: bug` and `confidence: high`.

**Correctness bugs (2):**
- [medium/medium] the QA skills' `find -name` gate lookup misses zero-padded gates. This is pre-existing, reproduced, and routed to future (CR-1)
- [low/low] `--path` does not filter by prefix (CR-2), routed to future

**Cleanups (3):** CR-3, CR-4, CR-5 (above)

The cycle-7 fixes were mutation-proven during qa-fix in this session, and the tests still pass at `2892f50b`:

mutation-proven: `[ -f ] && [ ! -L ]` → `[ -e ]` → dotfile/directory/symlink tests (bash, zsh) + read-back directory case → covered
mutation-proven: ambiguity refusal disabled → `--path` ambiguity tests + read-back ambiguity case → covered
mutation-proven: `shopt -s dotglob` → dotfile tests in both suites → covered
mutation-proven: JS fallback bypassing the helper on refusal → read-back directory and ambiguity cases → covered

---

## Test Artifacts

```bash
TMPDIR=/tmp node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-cycle.test.js tests/qa-read-back-block.test.js   # 90/90
node .agents/skills/qa-task/references/security-probe.mjs … --record task.149.qa.8.security.run.json   # ×4, 84 executed, 0 reproduced
npm run validate -- skills/{qa-task,qa-story,qa-fix}/                                                 # ✓ ×3
gh pr view 493 --json statusCheckRollup                                                                # 5/5 SUCCESS at 2892f50b
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c, the PR conformance review.
