# QA Report: Task 158 - QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment (cycle 2)

**Task**: [task.158](./task.158.cycle-file-and-containment-definitions.md)
**Gate File**: [task.158.gate.2.cycle-file-and-containment-definitions.yml](./task.158.gate.2.cycle-file-and-containment-definitions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate.1](./task.158.gate.1.cycle-file-and-containment-definitions.yml), CONCERNS 90, with 1 medium and 3 low findings.

| Previous finding | Status | Evidence |
| --- | --- | --- |
| CR-1 `grant-qa-cycles.sh` second cycle definition (TASK-158-BUG-1) | FIXED | Reproduction re-run: `gate.08` → `QA_CYCLE=8 … qa_max_cycles=10`, rc 0. `grant-qa-cycles.test.sh` 45/45. Shell-helper guard added |
| CR-2 resume rc 1 conflates a missing directory | FIXED (partially — see QA2-CR-1) | `[ -d "{doc-directory}" ]` HALT, executed under bash and zsh. No test runs it (QA2-CR-3) |
| CR-3 step-5-6 prose vs cycle mode | FIXED | prose now says a directory named like a gate can raise the cycle and `--path` refuses it |
| CR-4 fake-gh fixture at the live repo root | FIXED | disposable `repoRoot`. Mutation M5b is red under it |

---

## Executive Summary

Cycle 1's fixes hold. Cycle 2 was a whole-branch **refute** pass, and it found that the resume block
reads rc 1 from the helper as "no gate". That is also what the helper returns for gate files that
carry no usable number. On `develop`, such a directory produced a non-numeric `QA_CYCLE` and failed
loudly. On this branch it resumes silently at cycle 1. This is reproduced and promoted as QA2-CR-1
(medium).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA2-CR-1 fixed)

---

## Testing Scope

### Review Methodology

Re-review scope: whole branch diff (cycle 2 refute pass), 17 files and 1043 lines. The reviewer was
dispatched at 13:52Z and returned at 13:57Z. The prior gate's security axis was PASS/measured, so
`SAFETY_REPROBE=false`. Direct tools were used, plus the Step 3b reviewer.

**Step 4b:** the changed blocks are executed by the `optional-file-lookups` eval, for the same reason
as in cycle 1: `qa-execute-snippets.mjs` refuses them as `unrecognised-command: bash`, fail-closed.

---

## New Findings This Cycle

- **[medium, reproduced]** `shared/resources/develop-pipeline-resume-contract.md:434` — QA2-CR-1.
  The reviewer's confidence was medium. QA raised it to high after executing it:

  - `bash shared/resources/qa-cycle.sh <dir holding task.9.gate.x.yml>` → rc 1, `carry no cycle number`
  - develop's `find | sed | sort -n | tail -1` over the same directory → `QA_CYCLE=[./task.9.gate.x.yml]`

  The resume block now suppresses stderr and sets `QA_CYCLE=${QA_CYCLE:-0}`. The failure is new, and
  attributable to this branch.
- **[medium/medium, advisory]** `skills/develop-next/SKILL.md:144` — QA2-CR-2. The merge gate reads
  "the newest `*.gate.{N}.*.yml`" by its own rule, and the guard's fixed file list cannot see it. The
  text was verified at line 144. It is prose, with no fenced lookup, so it stays advisory.
- **[low]** `evals/shared/tests/optional-file-lookups.test.mjs:311` — QA2-CR-3. The `[ -d ]` HALT is
  never executed by a test.
- **[low]** `tests/qa-cycle.test.js:424` — QA2-CR-4. `shellHelperLines` line numbers drift after a
  continuation.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | unchanged since cycle 1 |
| Phase 2 | CONCERNS | QA2-CR-1 (resume rc 1 semantics) |
| Phase 3 | PASS | fake-gh test now isolated |
| Phase 4 | PASS | bundle, CHANGELOG, `bundle:check` clean |

## Success Criteria Verification

As in cycle 1, except that SC13 (the header's "only definition") now holds: `grant-qa-cycles.sh`
asks the helper, and the shell guard enforces it. SC3 holds for a numbered gate. The empty-directory
case still reads 0, which is correct. The unnumbered case is QA2-CR-1.

## Breaking Changes Validation

None.

---

## Issues Found

**HIGH: 0 · MEDIUM: 1 (+1 advisory) · LOW: 2**

**Issue: resume reads "gates without a number" as a fresh start (QA2-CR-1)**

- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: see New Findings.
- **Recommendation**: on rc 1, check for any `*.gate.*.yml` in the directory (or match the helper's
  `carry no cycle number` stderr line) and HALT. Give `grant-qa-cycles.sh` the same distinction. Add
  a test for each.

This is not a separate bug file. It is a medium finding carried in the gate, and it is a refinement of
the cycle-1 CR-2 fix.

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS

QA2-CR-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 22 (`path` sink, 11 + 11). Records:
  - [`task.158.qa.2.security.entryAccepted.run.json`](./task.158.qa.2.security.entryAccepted.run.json)
  - [`task.158.qa.2.security.cjsWithin.run.json`](./task.158.qa.2.security.cjsWithin.run.json)
- The outcomes are identical to cycle 1, and every mismatch is attributed there. No containment code
  changed in cycle 1.

### Maintainability — PASS

---

## Code Review

Blocking resolved `true`. The reviewer read 17 files (1043-line patch) as a refute pass and returned
4 findings:

- [medium/medium → high after reproduction] QA2-CR-1, resume contract rc 1. **Promoted to `top_issues[]`.**
- [medium/medium] QA2-CR-2, develop-next merge-gate prose lookup (advisory).
- [low/high cleanup] QA2-CR-3, no test executes the `[ -d ]` HALT.
- [low/high cleanup] QA2-CR-4, shell guard line numbers.

**Boundary rule:** fires, and the probes were re-run (22 executions). **Platform variance:** no new
environment-derived value reaches a validator in cycle 1's fix.

**Mutation spot checks:**

```markdown
mutation-proven: grant-qa-cycles.sh reverted to develop → grant-qa-cycles.test.sh "zero-padded gate" + "missing qa-cycle.sh sibling" red → covered
mutation-proven: grant-qa-cycles.sh reverted to develop → tests/qa-cycle.test.js "no shipped shell helper but qa-cycle.sh derives" red → covered
mutation-proven: --fake-gh containment → bare startsWith("..") under the disposable root → security-probe "fake-gh directory named `..name`" red → covered
mutation-proven: resume [ -d "{doc-directory}" ] HALT removed → no test red → no-red-untested (QA2-CR-3)
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| read-back, doc-links, security-probe, qa-cycle, optional-file-lookups suites | PASS (291/291) |
| `grant-qa-cycles.test.sh` | PASS (45/45) |
| `ci:fast` at the cycle-1 fix commit | PASS: 4510 tests, 0 fail |

### Test Commands Executed

```bash
PIPELINE_LOCK=… bash shared/resources/grant-qa-cycles.sh <gate.08 fixture> 2 <report>   # CR-1 re-run: qa_max_cycles 10
bash shared/resources/grant-qa-cycles.test.sh                                           # 45/45
node --test shared/resources/tests/qa-read-back.test.mjs shared/resources/tests/doc-links.test.mjs \
  shared/resources/tests/security-probe.test.mjs tests/qa-cycle.test.js \
  evals/shared/tests/optional-file-lookups.test.mjs                                     # 291/291
npm run validate -- skills/{qa-task,qa-story,develop-task,review-pr}/                    # ✓ ×4
bash shared/resources/qa-cycle.sh <dir holding task.9.gate.x.yml>                       # rc 1 — QA2-CR-1
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` cycle 2 for QA2-CR-1, with the advisory QA2-CR-2/3/4 if cheap, then QA cycle 3.
