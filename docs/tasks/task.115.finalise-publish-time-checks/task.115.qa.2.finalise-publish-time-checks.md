# QA Report: Task 115 - finalise publishes before it verifies (cycle 2)

**Task**: [Link to task document](./task.115.finalise-publish-time-checks.md)
**Gate File**: [task.115.gate.2.finalise-publish-time-checks.yml](./task.115.gate.2.finalise-publish-time-checks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: PASS

---

## Executive Summary

Cycle-2 re-review after `/qa-fix` cycle 1 (`d976a244`). Per the cycle-2 rule this was a **refute pass over the whole branch diff**, not a narrowed read of the fixes. Both MEDIUM findings are verified fixed by executing the fixed prose under bash and zsh, and each is now pinned by an assertion in `finalise-publish-boundary.test.mjs` that QA re-mutation-proved. No HIGH or MEDIUM remains; one LOW surfaced by refuting CR-2's fix is documented as a future recommendation.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Re-review scope**: unscoped — whole `origin/develop...HEAD` diff (cycle 2 refute rule); `SAFETY_REPROBE=false` (prior security axis `PASS` / `reasoned`).

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-1 — 6d `BASH_REMATCH` empty under zsh | **FIXED** | Extracted the fixed block and ran it under bash and zsh with `STEM=task.114` (cited → 0 warnings), `task.999` (uncited → 1 warning), `story.3.2` (skipped → 0) — identical in both shells. Assertion `6d derives the task number without BASH_REMATCH` mutation-proved (restored → red). |
| CR-2 — 6c foreground `sleep` loop to 1500s | **FIXED** | Poll is a column-0 heredoc script launched with `nohup … &`; result read from a file on a later turn with a head check. Heredoc write dry-run produces a script that parses. Assertion `6c never sleeps in the foreground` mutation-proved two ways (foreground loop added → red; `nohup` dropped → red). |
| LOW — `; registry ticked` keyed on file existence | FIXED | `REG_SUFFIX=$(git diff --cached --quiet -- … \|\| echo …)` on its own line; the commit line stays suppression-free (the fenced-commit scan still passes). |
| LOW — drift test merge-commit assumption unstated | FIXED | Header now states it and names the switch. |

## New Findings This Cycle

- **[LOW]** `skills/finalise/SKILL.md` 6c poll script — `rollup()` is a documented placeholder (`: …the Step 6 rollup query…`) that an agent must substitute. Left unsubstituted it returns an empty state, so the loop runs the full `MAX_WAIT` before writing a result the later-turn read then HALTs on. Fail-safe (never proceeds to a side-effect) but slow to say so. → emit a sentinel and break on it. Recorded in `recommendations.future`; not gated (LOW).

---

## Testing Scope

### Prerequisites Verified
- [x] Task `ready-for-review`; all phases `[x]`; PR #402 OPEN at `d976a244`; gate 1 + report 1 committed on the branch.

### Testing Approach
- [x] Automated: 99 targeted tests (7 suites incl. both new ones); `npm run ci:fast` on the fix commit (3251 / 3250 pass / 0 fail, prettier clean — developer-logged in the fix cycle)
- [x] Regression: parity/contract suites that read `finalise/SKILL.md`
- [x] Code Review (Step 3b refute pass, in-line — stated); Step 4b executor re-run
- [x] Mutation-proof spot check (Step 3c) on the two new assertions

### Review Methodology
Direct tools; refute pass. Step 3b in-line (no independent subagent — 5c's `/review-pr` is the independent lens). Step 4b: 28 blocks → 0 runnable / 4 placeholder / 25 mutating (the 6c later-turn read is the new placeholder — it reads `$RESULT`, unbound at execution); same structural `zero-blocks-executed` as `develop`; the five fenced blocks in 6a–6d re-extracted and `bash -n` / `zsh -n` clean.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: one status location | PASS | unchanged since cycle 1 |
| Phase 2: verify the head that carries the acceptance | PASS | CR-2 resolved; order and both heads still asserted |
| Phase 3: tracked-and-pushed + no-suppression | PASS | commit line suppression-free after the `REG_SUFFIX` split |
| Phase 4: CHANGELOG mechanism | PASS | CR-1 resolved; 6d fires in both shells |

**Overall Phase Completion**: 4/4.

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | One status location | PASS | |
| 2 | Two CI readings; second on the pushed head; no side-effect before SUCCESS | PASS | wait now backgrounded |
| 3 | Tracked-and-pushed; no suppressed `git commit` | PASS | |
| 4 | Drift test + `/finalise` warn; `(bug N)` documented | PASS | 6d verified under zsh |
| 5 | Observations #40/#48/#57/#59 close naming the PR | DEFERRED (correct) | `parked_until: task.115 merged to develop` |

## Breaking Changes Validation
Unchanged from cycle 1 — PASS.

## Issues Found
HIGH: 0 · MEDIUM: 0 · LOW: 1 (above).

## NFR Assessment
- **Performance — PASS**: cycle-1 CONCERNS resolved (background poll).
- **Reliability — PASS**: later-turn read checks the head; LOW noted.
- **Security — PASS** · Evidence: reasoned · Probes executed: 0.
- **Maintainability — PASS**: 11 assertions, all mutation-proved; new ones scan comment-stripped code.

## Code Review (refute pass)
**Correctness bugs (0).** **Cleanups (0).** Refuted: the fixes' combination — 6a commit → 6b assertions → 6c background poll → later-turn read → 6d → 7 — the later-turn read compares the result's head to `CI_HEAD_2`, so a stale result file from a previous run cannot be mistaken for this one; `rm -f "$RESULT"` before launch covers the same case from the other side. Transitions probed: teardown (result file persists in `.claude/state/`, removed at next 6c — acceptable), error path (poll script failing leaves no result → read reports "still polling" indefinitely — bounded by the operator noticing; LOW-adjacent, folded into the placeholder recommendation).

**Mutation-proof spot check (Step 3c)**:
- mutation-proven: `BASH_REMATCH` restored in 6d code → `6d derives the task number without BASH_REMATCH` → `covered`
- mutation-proven: foreground `while … sleep` added before `nohup` → `6c never sleeps in the foreground` → `covered`
- mutation-proven: `nohup` removed → `6c never sleeps in the foreground` → `covered`
Three of three; source restored byte-identical.

## Regression Testing
99/99 targeted; full `ci:fast` green on the fix commit.

## Final Assessment
**Gate Status**: PASS · **Quality Score**: 95/100 · **Deployment Recommendation**: APPROVED

**QA Report**: `task.115.qa.2.finalise-publish-time-checks.md` · **Gate File**: `task.115.gate.2.finalise-publish-time-checks.yml`
**Next Steps**: 5c `/review-pr`, then `/finalise`.
