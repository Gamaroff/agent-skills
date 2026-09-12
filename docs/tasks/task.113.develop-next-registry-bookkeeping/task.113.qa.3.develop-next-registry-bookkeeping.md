# QA Report: Task 113 - develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Task**: [Link to task document](./task.113.develop-next-registry-bookkeeping.md)
**Gate File**: [task.113.gate.3.develop-next-registry-bookkeeping.yml](./task.113.gate.3.develop-next-registry-bookkeeping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3, scoped to the six files fix cycle 2 touched. All five cycle-2 findings are **FIXED**, verified by execution; bug 5 closed. The scoped review found that the QA-7 fix closes only half of its crash window: `git diff --quiet -- <file>` compares the working tree to the index, so an edit that was `git add`ed before the crash reads clean and is never committed (QA-12, medium, verified in a scratch clone). Two engine consistency cleanups ride along (QA-13 payload shape, QA-14 empty-cell spellings).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix QA-12 (one token: `HEAD`) and take QA-13/14

---

## Re-Review Context

Re-review scope: **since 2026-09-12T18:10:41Z (default)** — six files changed by fix cycle 2 (`registry-tick.js` + tests, both orchestrator SKILLs, both shape suites, CHANGELOG). `SAFETY_REPROBE=false` (prior security axis `PASS measured`).

| Cycle-2 finding | Status | Verification |
| --- | --- | --- |
| QA-7 `already` strands a pre-crash registry edit | **FIXED** | The dirty-check snippet executed under bash and zsh in a scratch clone with an edited registry → a second commit lands, tree clean; shape-asserted in both orchestrators |
| QA-8 phantom dependency on a non-accepted row | **FIXED** | Row `in-progress` → `not-accepted`, nothing written; row `accepted` → `annotated` |
| QA-9 run-state `source` | **FIXED** | Schema example carries `"source": "roadmap"`; prose names it as what Step 4 reads on resume; shape-asserted |
| QA-10 GFM separator | **FIXED** | `\| - \|` delimiter row → `annotated`, Issue written; fixture covers `\|:--\|` too |
| QA-11 unenumerated exit-0 reasons | **FIXED** | `not-accepted`, `not-a-task`, `engine-unavailable` named; shape-asserted |
| CR-6/7/8 cleanups | **DONE** | dead branch gone; tick path calls `setCell()` (width tests + mutation still guard it); CHANGELOG reworded |

Bug 5: verified → **Closed**.

---

## New Findings This Cycle

- **[medium]** `skills/develop-next/SKILL.md:363` — QA-7's `git diff --quiet -- docs/tasks/task-registry.md` is worktree-vs-index; a crash after `git add`, before `git commit`, reads clean → use `git diff --quiet HEAD -- …` in both skills and re-pin the two shape regexes. **QA-12**, [bug 6](./task.113.bug.6.staged-edit-reads-clean.md).
- **[low]** `shared/resources/registry-tick.js:242` — annotate mode's shared early exits emit `ticked: false` with no `annotated` field → emit the mode key uniformly. **QA-13.**
- **[low]** `shared/resources/registry-tick.js:406` — `isEmptyCell` disagrees with the selector's `DEP_EMPTY_RE` (`none`, `n/a`, `na`, `tbd`) → mirror the spellings. **QA-14.**

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1a: `--annotate` | PASS | 31/31 fixtures; 17 engine mutations proven across three cycles |
| Phase 1: Step 4 arms (develop-next) | CONCERNS | 8/8 shape tests; QA-12 — the dirty check misses a staged edit |
| Phase 1: develop-batch mirror | CONCERNS | QA-12 mirror |
| Phase 2: Step 3 matrix | PASS | unchanged since cycle 1 |
| Phase 3: Step 2 re-read | PASS | unchanged since cycle 1 |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Step 4 arms; annotate call; bug-registry no-cell; re-run `already` | CONCERNS (QA-12) |
| 2 | Step 3 matrix incl. reachable WAIVED row | PASS |
| 3 | Step 2 re-read + re-fire | PASS |
| 4 | develop-batch mirror | PASS |
| 5 | Observations close | N/A (after merge) |

---

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

QA-12 — [bug 6](./task.113.bug.6.staged-edit-reads-clean.md). See New Findings.

### LOW Severity Issues (2)

QA-13, QA-14.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
QA-7 closed the unstaged half of the crash window; QA-12 is the staged half.
### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 2 this cycle (non-accepted row → refused; `| - |` separator + `--issue` → written where intended) on top of cycle 2's 6.
### Maintainability — PASS
One width implementation (`setCell`); every engine reason enumerated in the caller.

---

## Code Review

Scoped pass — one Explore subagent over the six files changed since gate 2 (1462 diff lines; it ran the 88 affected tests and dry-ran annotate on the live registry). `code_review_blocking=true`.

**Correctness bugs (1):**
- [medium/high] `skills/develop-next/SKILL.md:363` — worktree-vs-index diff misses a staged edit → `HEAD` form. **QA-12.**

**Cleanups (2):**
- `shared/resources/registry-tick.js:242` — `annotated` key absent on shared early exits in annotate mode. **QA-13.**
- `shared/resources/registry-tick.js:406` — `isEmptyCell` vs `DEP_EMPTY_RE`. **QA-14.**

**mutation-proven**: cycle-2 fixes — yes, 7/7 (recorded in fix cycle 2).

---

## Regression Testing

| Area | Result |
| --- | --- |
| registry-tick default (tick) mode incl. width tests | PASS (via `setCell`) |
| task-registry drift test | PASS |
| four affected suites | 94/94 |
| Full `npm run ci:fast` after fix cycle 2 | PASS (3227 / 0) |

---

## Test Artifacts

### Test Commands Executed
```bash
# cycle-2 reproductions re-run post-fix — see Re-Review Context
# QA-7 snippet in a scratch git clone under bash and zsh
command node --test … four suites   # 94/94
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the fix loop is converging — each cycle's residue is smaller and more local than the last (six → five → one medium), and this cycle's medium is a single-token correction to the previous fix. It is still a correctness defect in the crash path the fix exists for, so it does not pass on its own.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-12 fixed and mutation-proven.

---

**QA Report**: co-located at `task.113.qa.3.develop-next-registry-bookkeeping.md`
**Gate File**: co-located at `task.113.gate.3.develop-next-registry-bookkeeping.yml`
**Next Steps**: `/qa-fix` on QA-12 (+ QA-13/14) → cycle 4
