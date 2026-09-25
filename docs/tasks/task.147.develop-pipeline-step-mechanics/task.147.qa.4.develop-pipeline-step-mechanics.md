# QA Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Task**: [Link to task document](./task.147.develop-pipeline-step-mechanics.md)
**Gate File**: [task.147.gate.4.develop-pipeline-step-mechanics.yml](./task.147.gate.4.develop-pipeline-step-mechanics.yml)
**Review Date**: 2026-09-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate-3 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (bug.10): the `tee` log files get held | FIXED | Guard-twice test asserts that no `Issues` or `Log` file exists and that the held record is exact |
| CR-3 (bug.11): the pointer to an unrestored hold is deleted | FIXED | The unrestored-hold case fails Step 8 and keeps the pointer |
| CR-4 (bug.12): dot-segment scope | FIXED (sibling spelling found, below) | Cases 24–26 |
| CR-2, CR-5 (low) | FIXED | The mismatched-record warning case; the `.claude` derivation case |

Bugs 10–12 are closed.

---

## Review Methodology

An independent Explore reviewer checked the branch-vs-base diff of the 16 non-generated files changed since gate 3 (2578 lines). It ran the normalisation loops on pathological inputs. The first scoped diff came out empty because a scalar file list was expanded in zsh, which is the obs #76 trap. The non-vacuity check caught this before dispatch, and the diff was rebuilt with an array. Re-review scope: since 2026-09-25T10:14:06Z (default). `TMPDIR=/tmp`: 94/94 node tests and 26/26 shell cases. Route classifier: `continue` (not-a-pass-gate); route 2 was declined because of a product-defect signal.

---

## New Findings This Cycle

- **[medium]** `shared/resources/verify-push-state.sh` — `.//docs` normalises to `/docs` and the check passes vacuously (reproduced) → [bug.13](./task.147.bug.13.dot-slash-slash-scope-vacuous.md)
- **[low, cleanup]** `shared/resources/tests/step-8-completion-checklist.test.mjs` — the record-cleanup test does not seed `step4-hold-dir.txt` (advisory)

---

## NFR Assessment

- **Security**: PASS. Evidence: reasoned. Probes executed: 0.
- **Performance**: PASS.
- **Reliability**: CONCERNS (one pathological spelling of a scope).
- **Maintainability**: PASS.

---

## Final Assessment

**Gate Status**: CONCERNS. **Quality Score**: 90/100. **Next Steps**: `/qa-fix` cycle 4, then QA cycle 5. The loop budget allows 5 cycles in total.
