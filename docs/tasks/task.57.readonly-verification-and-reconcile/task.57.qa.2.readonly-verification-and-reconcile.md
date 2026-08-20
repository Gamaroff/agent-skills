# QA Report: Task 57 - Read-only verification, and `/tracker-reconcile` (Re-Review, Cycle 2)

**Task**: [Link to task document](./task.57.readonly-verification-and-reconcile.md)
**Gate File**: [task.57.gate.2.readonly-verification-and-reconcile.yml](./task.57.gate.2.readonly-verification-and-reconcile.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-20
**Gate Status**: FAIL

---

## Re-Review Context

Previous gate: FAIL (40/100), 8 top issues. Scope: files changed since gate 1 (commit `6eb5708`).

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| CR-1 engines not bundled | **FIXED** | `npm run bundle` + `ls` — both engines in develop-story/task/bug `references/` |
| CR-2 satisfied never cleared | **FIXED** (but over-corrected — see CR2-2) | §10 regression test; mutation-proven |
| CR-3 no default confirm | **FIXED** (but the default has an injection — see CR2-3) | §7 tests: no-mechanism skip / declined / consented |
| CR-4 divergent bypasses confirm | **FIXED** | §10 composition test; mutation-proven |
| CR-5 verify no-op | **FIXED** | §10 `--verify` artifact test + live smoke via bundled engine |
| CR-6 formats hardcoded | **FIXED** (two new defects in the block — CR2-1, CR2-5) | step-7 per-mode case |
| CR-7 allowlist gaps | **FIXED** | §1 extended: `--field`/`-F`/`--input`, `-F` mutation scan |
| CR-8 dead clause | **FIXED** | removed |
| CR-9 observed formatting | **FIXED** | `formatObserved` at all 4 sites |
| CR-10 model rebuilt | DEFERRED | advisory — deliberate re-redaction |

## Executive Summary

Every cycle-1 finding is verified fixed. The adversarial pass **over the fixes themselves** (fixes are new code) found what that pass exists to find: **three high-severity defects introduced by cycle-1's fixes** — a wrong-extension artifact write that silently breaks `/tracker-reconcile` discovery (CR2-1), an over-corrected tick-revocation that re-runs already-executed mutations (CR2-2), and a shell-injection vector in the new default confirmation prompt (CR2-3) — plus two low-severity issues in the new step-7 block and `--verify` error handling.

**Overall Assessment**: FAIL — Security NFR FAIL on CR2-3.
**Deployment Recommendation**: BLOCKED

## Issues Found

### HIGH (3)
- **CR2-1** `handover-render.js` — extension substituted only when >1 format: single-format `command`/`read-only` renders write `.sh`/`.json` content into a `.md` filename; reconcile's `*.handover.*.json` glob finds nothing
- **CR2-2** `handover-verify.js` — `satisfied` recomputed unconditionally: an unverifiable or no-recipe re-read revokes a legitimate tick; `--apply` and the script then re-run an executed mutation
- **CR2-3** `tracker-reconcile.js` — `ttyConfirm` interpolates the record's `intent` into `bash -c` script text; `$(…)`/backticks in a committed record execute in the operator's shell

### LOW (2)
- **CR2-4** `--verify`'s `.catch` also catches render failures → misreported + double render
- **CR2-5** step-7 `*)`/`full` fallback commits an `.md` artifact for a mode whose selection has no file format

### Cleanup (1, advisory)
- **CR2-6** effective-formats default computed in two places

## Verification Evidence (cycle 2)

- Full suite fresh at gate time: 1649/1649; engine + reconcile suites re-run: 41/41
- Live end-to-end smoke of the **bundled** engine (`skills/develop-task/references/handover-render.js --verify`): real read-only `gh` read executed, annotation reached the sidecar
- Mutation-prove: CR-2 and CR-4 fixes each reverted → red (3 each), restored → green

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 40/100 (2 high-impact regressions + security FAIL under deterministic rules)
**Next Steps**: `/qa-fix` cycle 2 against gate 2 (CR2-1..CR2-5).
