# QA Report: Task 188 - Resume from evidence, not flags (cycle 4)

**Task**: [Link to task document](./task.188.resume-from-evidence-not-flags.md)
**Gate File**: [task.188.gate.4.resume-from-evidence-not-flags.yml](./task.188.gate.4.resume-from-evidence-not-flags.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Gate Status**: PASS

---

## Executive Summary

Cycle 3's fixes hold. A roadmap with uncommitted edits now halts, a reconciled merge runs Step 3's
post-merge items, and a failed run-state write halts. The scoped review found two LOW items, both
advisory: a stale count in a comment, and one could-not-look state whose message is wrong (it still
halts). Every functional criterion is held by a passing executed or shape test, and the fast gate is
green.

**Overall Assessment**: PASS. **Deployment Recommendation**: APPROVED.

---

## Review Methodology

Direct tools, plus one read-only Explore reviewer, dispatched 14:50:29Z (`duration_ms` 71291).
Re-review scope: the 6 files changed since gate 3's head (`853c1d2d`), which is the default.
`SAFETY_REPROBE=false`. Step 4b: `no-executable-blocks`, information only. The guard harness executes
the new blocks.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| CR3-1: an uncommitted Step 4 tick was re-ticked | FIXED | `uncommitted` case; mutation proof red |
| CR3-2: a reconciled merge skipped Step 3's post-merge items | FIXED | routing shape assertion; mutation proof red |
| CR3-3: success line printed over a failed write | FIXED | failed-write case; mutation proof red |

---

## New Findings This Cycle

- **[low]** `skills/develop-next/SKILL.md:126`: a failed `git diff` (exit 128) reads as `uncommitted`, not `unknown`. Both halt, so only the message differs. Advisory, recorded in `recommendations.future`.
- **[low, cleanup]** `skills/develop-next/SKILL.md:112`: the header says "Four answers" but the block lists five. Advisory.

---

## Success Criteria Verification

| Criterion | Status | Held by |
| --------- | ------ | ------- |
| Merge exits 1 with the PR `MERGED` → exit 0, at every site | PASS | `merge-delete-branch-guard.test.mjs`, verdict cases |
| PR not `MERGED` → exit 1 and no delete, including when the merge exits 0 | PASS | same file, the exit-0/`OPEN` control |
| Run-state fields, Step 2 halt write, halt checked first | PASS | `evals/develop-next/protocol/skill-shape.test.mjs` |
| A cleared run that is not accepted → Step 2 with `--defaults` | PASS | same file |
| Both skills reconcile `merged`, and develop-next reconciles `ticked`, before routing | PASS | both shape suites, plus executed reconciliation cases |
| The roadmap-row check, ticked or unticked | PASS | tick cases (ticked, not-ticked, prefix traps, archived, unpushed, uncommitted, unknown) |
| `npm test`, `bundle:check`, prettier, `quick_validate` | PASS | `ci:fast` 5334/5334 at `30046a6c` |
| CHANGELOG entry; "resumes unchanged" | PASS | shape test |

---

## NFR Assessment

- **Performance**: PASS
- **Reliability**: PASS
- **Security**: PASS. Evidence: reasoned. Probes executed: 0. `boundary: true`; finalise needs a DoD override.
- **Maintainability**: PASS

---

## Code Review

**Correctness bugs (1):** [low/medium] `skills/develop-next/SKILL.md:126`: a failed diff and a dirty
roadmap give the same answer. Advisory.
**Cleanups (1):** `skills/develop-next/SKILL.md:112`: stale "Four answers" count. Advisory.

boundary: true. `probes_executed: 0`.

---

## Final Assessment

**Gate Status**: PASS. **Quality Score**: 100/100. **Deployment Recommendation**: APPROVED.
**Next Steps**: 5c PR conformance review.
