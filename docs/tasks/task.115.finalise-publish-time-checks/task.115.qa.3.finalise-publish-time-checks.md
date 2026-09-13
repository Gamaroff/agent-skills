# QA Report: Task 115 - finalise publishes before it verifies (cycle 3)

**Task**: [Link to task document](./task.115.finalise-publish-time-checks.md)
**Gate File**: [task.115.gate.3.finalise-publish-time-checks.yml](./task.115.gate.3.finalise-publish-time-checks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: PASS

---

## Executive Summary

Cycle-3 re-review after the review-driven fix cycle (`88c372dc`), which addressed the six findings from the 5c PR review (`task.115.pr-review.1.*`). Scope: files changed since gate 2 (default narrowing; `SAFETY_REPROBE=false`). All six are verified fixed and three are now pinned by mutation-proved assertions. No new findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Re-review scope**: since 2026-09-13T04:17:22Z (default) — `skills/finalise/SKILL.md`, `shared/resources/develop-pipeline-step-{7,8}*.md`, `evals/shared/tests/finalise-publish-boundary.test.mjs`, task doc.

| Prior finding (5c) | Status | Verification |
| --- | --- | --- |
| CR-1 dirty-document HALT false-fires on Jira | **FIXED** | Step-7 and step-8 docs exempt exactly `jira_last_{synced_at,body_hash,meta_hash}`; the mechanical check was exercised in a scratch repo: residue-only → clean, `status:` change → HALT, stray DoD file → HALT. Assertion `the orchestrator's dirty-document rule exempts the Jira sync's frontmatter residue` mutation-proved. |
| CR-2 unconditional 6a commit | **FIXED** | `if git diff --cached --quiet; then … else git commit …` inside the block; guard precedes the commit (asserted by line order); mutation-proved. |
| CR-3 6c without `mkdir -p`, dead poll reads as progress | **FIXED** | `mkdir -p .claude/state`; pid file written; later-turn read HALTs when `kill -0` fails and no result exists. Both halves mutation-proved. |
| CR-4 regex misses `\|\| :` | **FIXED** | `(true\b|:(?=[\s;)&|]|$))` — probed on `\|\| :`, `\|\| :; echo`, `\|\| :)`; a quoted `a:b` and `:foo` still excluded. Injected `git commit … \|\| :` → red. |
| CR-5 redundant alternative / case | **FIXED** | `grep -qiE "\btask[ .]${N}\b"`; verified under bash and zsh (114 cited, 999 warns). |
| PC-1 Files Summary stale | **FIXED** | Row reads 11 assertions / 9 proofs (now 14 / 14 after this cycle — the row describes the test as of the fix commit it landed in; QA notes the count moved again). |

## New Findings This Cycle

None. Searched: the three changed prose files' fenced blocks re-extracted and parsed under `bash -n` and `zsh -n`; 6d executed in both shells; 4b executor on `finalise/SKILL.md` (28 blocks → 0/3/26, structural `zero-blocks-executed` as on `develop`) and on the step-7 doc (11 blocks → 0/2/9, 0 non-ok); the combination of 6a guard + 6c pid/liveness read re-read as one change (the skip path still sets `CI_HEAD_2`; `rm -f "$RESULT" "$PIDFILE"` precedes the launch so a stale pid cannot satisfy `kill -0`).

---

## Testing Scope
- [x] Automated: 102 targeted (7 suites); `ci:fast` 3254 / 3253 / 0 on the fix tree
- [x] Regression: parity/contract suites reading `finalise/SKILL.md` and the step docs
- [x] Code Review (Step 3b, narrowed, in-line — stated); Step 4b executor
- [x] Mutation-proof spot check (Step 3c) on the three new assertions — `covered` ×3, plus CR-4's regex mutant `covered`

## Implementation Verification
| Phase | Status |
| --- | --- |
| 1 one status location | PASS |
| 2 verify the head that carries the acceptance | PASS |
| 3 tracked-and-pushed + no-suppression | PASS |
| 4 CHANGELOG mechanism | PASS |

## Success Criteria
SC1–SC4 PASS; SC5 deferred by design (`parked_until: task.115 merged to develop`).

## Issues Found
HIGH: 0 · MEDIUM: 0 · LOW: 1 carried (unsubstituted `rollup()` placeholder waits `MAX_WAIT`).

## NFR Assessment
Performance PASS · Reliability PASS · Security PASS (reasoned, 0 probes) · Maintainability PASS.

## Code Review (Step 3b, narrowed)
**Correctness bugs (0).** **Cleanups (0).**
Mutation-proof spot check: `jira_last_(…)` exemption dropped → red; 6a guard removed → red; `mkdir -p` dropped → red; `kill -0` dropped → red; `git commit … || :` injected → red — five of five, sources restored byte-identical.

## Final Assessment
**Gate Status**: PASS · **Quality Score**: 95/100 · **Deployment Recommendation**: APPROVED

**Next Steps**: 5c `/review-pr` on the fixed tree, then `/finalise`.
