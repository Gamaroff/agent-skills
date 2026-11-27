# QA Report: Task 331 - The AC merge refuses another document's result (cycle 3)

**Task**: [task.331.ac-merge-refuses-another-documents-result.md](./task.331.ac-merge-refuses-another-documents-result.md)
**Gate File**: [task.331.gate.3.ac-merge-refuses-another-documents-result.yml](./task.331.gate.3.ac-merge-refuses-another-documents-result.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Gate Status**: PASS

---

## Executive Summary

Re-review at head `f35403b82a8d`. All three gate-2 findings are fixed and verified. The cycle-3 refute pass found four findings, all medium confidence and none reproduced, so they are advisory. They are recorded as one follow-up. The fast gate on the head is green.

**Overall Assessment**: PASS
**Deployment Recommendation**: CONDITIONAL (CI green on the pushed head)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T331-CR-1: stale scope read as another document's answer | ✅ FIXED | `merge --doc` → `scope-document-mismatch`; Step 3c HALT arm; 5 engine CLI tests and the eval Step 3c test (bash, zsh). Mutation: with the check disabled, 5 named tests go red |
| T331-CR-2: CHANGELOG resume sentence | ✅ FIXED | names the pre-3c and post-3c resume points |
| T331-CR-3: Step 6 action 2a prose | ✅ FIXED | says the file is keyed by the stem and `DOD_N`; population probe 1 (`skills/finalise/SKILL.md`) |

### Review Methodology

Re-review scope: unscoped, cycle 3. An independent Explore subagent, given the refute directive, reviewed the whole `origin/develop...HEAD` diff. Dispatched 16:03:44Z, returned 16:09:41Z (`duration_ms` 318026). Diff review: code review.

Fast gate on the head: `npm run test:remote` (ci:fast on the CI-parity server): 8966 tests, 8963 pass, 0 fail.

CI on f35403b82a8d: head mismatch (PR head b4a0158c4130). The two fix commits are not pushed yet. The pre-5c push carries them.

Step 4b: the Step 3c merge block changed, and the eval suite runs it as substituted under bash and zsh. That covers the stale-scope HALT, both result shapes, and the unsubstituted `DOC_PATH` HALT.

Convergence check (cycle 3): HIGH was 0, 0, 0 across gates 1–3, so the loop is converging, not stalled.

---

## Code Review

Anchors checked with `finding-anchors.js`: `ok` (CR-1 and CR-3 `unchecked-text`, CR-2 and CR-4 `ok`).

**Correctness bugs (3), all advisory: medium confidence, not reproduced:**
- [medium/medium] `skills/finalise/SKILL.md:1073` — with two items finalising at one `DOD_N` in one checkout, each item's remedy re-runs its Step 3a and overwrites the other's scope. On develop that case merges silently into the wrong record, so this branch fails safer. → follow-up: key the scope and extract files by stem
- [low/medium] `shared/resources/finalise-rerun-scope.js:1219` — `scope-document-mismatch` covers three states (overwritten scope, scope with no document, `--doc` not resolving to Step 3a's document). → follow-up: split the reasons
- [low/medium] `CHANGELOG.md:31` — the resume sentence does not cover a pre-upgrade `result-unparseable` answer, or a resume between Step 3c and 3d. Not verified by reading. → follow-up

**Cleanups (1):**
- `shared/resources/finalise-rerun-scope.js:1219` — `--doc` is optional on `merge`, so a future CLI caller could skip the check by leaving it out. Step 3c is the only CLI caller today.

mutation-proven: scope check disabled (`if (false && …)`), re-bundled → `merge --doc: another document's scope is refused although the result names no document — nothing is recorded (CLI, T331-CR-1)` and 4 more named tests red → covered

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Next Steps**: push (pre-5c), then 5c `/review-pr`.
