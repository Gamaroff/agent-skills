# QA Report: Task 113 - develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Task**: [Link to task document](./task.113.develop-next-registry-bookkeeping.md)
**Gate File**: [task.113.gate.2.develop-next-registry-bookkeeping.yml](./task.113.gate.2.develop-next-registry-bookkeeping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 — a full refute pass over the whole branch diff, not a narrowed re-read of the fixes. All six cycle-1 findings are **FIXED**, each re-verified by executing its reproduction rather than reading the diff. The refute pass found one new MEDIUM (QA-7): the registry arm's `already` branch skips the commit, so a crash between the annotate write and `git commit` strands the edited registry and the *next* run halts on a dirty tree. Four LOW findings and three cleanups ride along; one of the LOWs (QA-8) exposed a pre-existing hazard in the registry's notes convention — the selector's dependency parser reads `PR #381 merged` as a dependency on task 381 — which is inert today only because accepted rows are skipped before dependency evaluation.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix QA-7 (and take QA-8…QA-11 + cleanups in the same cycle)

---

## Re-Review Context

Re-review scope: **unscoped — cycle 2 refute pass** over `origin/develop...HEAD` (10 files), per the loop's "two deep cycles instead of five shallow ones" rule. `SAFETY_REPROBE=false` (prior security axis: `CONCERNS measured`, not FAIL).

| Cycle-1 finding | Status | Verification |
| --- | --- | --- |
| QA-1 zsh `:+` word-split | **FIXED** | Step 4 invocation executed under zsh with `ISSUE_REF` set → `dry-run / issue written`; `:+` form absent (0 matches); shape assertion forbids it |
| QA-2 `--issue` unvalidated | **FIXED** | Re-probed: `'x \| y'`, LF, empty, `--json`, missing value → all exit 2, registry byte-identical |
| QA-3 `no-cell` guard unreachable | **FIXED** | 6-column registry (last `Created`) → `no-cell`, `lastColumn: created`; 7-column bug-shaped (last `Area`) → `no-cell`; nothing written |
| QA-4 `WAIVED → merge` unreachable | **FIXED** | Waiver clause present in both orchestrators (`waiver.active: true`), asserted in both suites |
| QA-5 `GITHUB_ISSUE` null order | **FIXED** | Step-2 block executed bash + zsh with `github_issue: null` → `T=[] G=[]`; with `397` → both `397`, lock updated |
| QA-6 header walk unbounded | **FIXED** | Headerless registry under a legend table → `no-cell` ("no table header"); legend-above-registry with own header → Issue fill lands on column 7 |

Bugs 1–4: verified → **Closed** (status updated in each report).

---

## New Findings This Cycle

- **[medium]** `skills/develop-next/SKILL.md:353` — the registry arm's `already` branch skips the commit and marks `ticked: true`; a crash between the annotate write and `git commit` leaves the registry edited and uncommitted, the resume path skips Step 0's dirty-tree check, and the next run HALTs on the dirty tree with nothing pointing at the cause (mirrored in develop-batch) → on `already`, `git diff --quiet -- <registry>` and commit/push when dirty before `ticked: true`. **QA-7**, [bug 5](./task.113.bug.5.already-strands-dirty-registry.md).
- **[low]** `shared/resources/registry-tick.js:251` — the notes cell *is* the `Depends on` cell the selector parses; `parseDepCell` on row 106 already yields deps on tasks 381, 3, 80, 95, 90, 4 (from `PR #381` and "3 QA cycles (80 → 95 → 90), 4 defects"). Inert for accepted rows (eligibility skips them first), but an annotate on a non-accepted row injects a phantom dependency → refuse annotate unless the **row** reads `accepted` (`not-accepted`). **QA-8.** The pre-existing convention hazard is recorded as an observation, not fixed here.
- **[low]** `skills/develop-next/SKILL.md:312` — the run-state schema has no `source` field, so a resume into Step 4 cannot branch on `item.source` → add `source` to the run state written at selection. **QA-9.**
- **[low]** `shared/resources/registry-tick.js:459` — `findHeader` requires `-{3,}` while the selector accepts any GFM delimiter (`| - |`, `|:--|`) → accept hyphens with optional colons, any count. **QA-10.**
- **[low]** `skills/develop-next/SKILL.md:354` — `engine-unavailable`, `not-accepted` and `not-a-task` are exit-0 reasons the registry arm does not name → "every other exit-0 reason: log, no commit, `ticked: true`". **QA-11.**
- Cleanups (advisory): CR-6 dead `undefined` branch in `--issue` validation after the parseArgs fix; CR-7 the tick path duplicates `setCell()`'s width rule; CR-8 CHANGELOG says "11 fixture tests", the suite has 14.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1a: `--annotate` | CONCERNS | 29/29 fixtures; 10 mutations red | QA-8 (row-status gate), QA-10 (separator shape), CR-6/7 cleanups |
| Phase 1: Step 4 arms (develop-next) | CONCERNS | shape 7/7 | QA-7 crash window on `already`; QA-9 run-state `source`; QA-11 reason enumeration |
| Phase 1: develop-batch mirror | CONCERNS | shape 2/2 | QA-7 mirror |
| Phase 2: Step 3 matrix | PASS | rows asserted; waiver clause asserted | — |
| Phase 3: Step 2 re-read | PASS | contract 6/6; executed bash+zsh | — |

**Overall Phase Completion**: 5/5 implemented; 3 with concerns (all in the registry arm's edges)

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | Step 4 `item.source` arms; annotate call; bug-registry no-cell; re-run `already` | CONCERNS | `already` is row-idempotent but not commit-idempotent (QA-7) |
| 2 | Step 3 matrix incl. WAIVED | PASS | reachable since cycle 1 |
| 3 | Step 2 re-read + re-fire | PASS | |
| 4 | develop-batch mirror | CONCERNS | QA-7 mirror |
| 5 | Observations close | N/A | after merge |

---

## Breaking Changes Validation

Unchanged from cycle 1 — PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: `already` branch strands an uncommitted registry edit** — QA-7, [bug 5](./task.113.bug.5.already-strands-dirty-registry.md). See New Findings.

### LOW Severity Issues (4)

QA-8, QA-9, QA-10, QA-11 — see New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4 (+3 cleanups)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
QA-7: the crash window between the annotate write and its commit is uncovered by the resume path.
### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 6 (QA-2 re-probe: missing, empty, flag-shaped, `|`, LF, CR — all refused, registry byte-identical)
### Maintainability — PASS
Three cleanups recorded (CR-6/7/8), none structural.

---

## Code Review

Refute pass — one Explore subagent, whole-branch diff (10 files; it ran 29 + 62 tests green and dry-ran annotate against the live registry). `code_review_blocking=true`.

**Correctness bugs (5):**
- [medium/high] `skills/develop-next/SKILL.md:353` — `already` → skip commit strands a pre-crash edit → dirty check + commit. **QA-7.**
- [low/medium] `shared/resources/registry-tick.js:251` — annotate on a non-accepted row injects a phantom `task.<PR#>` dependency via `parseDepCell` → refuse unless row `accepted`. **QA-8.**
- [low/medium] `skills/develop-next/SKILL.md:312` — run-state has no `source` → add it. **QA-9.**
- [low/medium] `shared/resources/registry-tick.js:459` — separator must match the selector's GFM shape. **QA-10.**
- [low/low] `skills/develop-next/SKILL.md:354` — unenumerated exit-0 reasons. **QA-11.**

**Cleanups (3):**
- `shared/resources/registry-tick.js:205` — `opts.issue === undefined` branch is dead after the parseArgs fix; reword the comment.
- `shared/resources/registry-tick.js:369` — tick path should call `setCell()` so one implementation owns the width rule.
- `CHANGELOG.md:64` — "11 fixture tests" is stale (14).

**mutation-proven**: cycle-1 fixes — yes, 6/6 (recorded in the fix cycle); nothing new fixed this cycle yet.

---

## Regression Testing

| Area | Result |
| --- | --- |
| registry-tick default (tick) mode | PASS (15 pre-existing fixtures) |
| task-registry drift test | PASS |
| shape suites (develop-next 25, develop-batch 32, develop-task step-contract 6) | PASS |
| Full `npm run ci:fast` after fix cycle 1 | PASS (3224 / 0) |

---

## Test Artifacts

### Test Commands Executed
```bash
# every cycle-1 reproduction re-run post-fix (bash + zsh; sandbox registries) — see Re-Review Context
command node -e '…parseRegistry(task-registry.md)…'   # rows 100 & 106 deps → phantom task.369 / task.381 (QA-8)
command node --test … registry-tick + shape + contract suites   # 90/90 (reviewer: 29 + 62)
```

---

## Recommendations

### Immediate Actions (Blocking for a clean gate)
1. QA-7 — dirty-registry check on `already` (both orchestrators), shape-asserted.

### Short-term Actions (take in the same cycle — all one-clause)
1. QA-8 row-status gate on annotate; QA-9 `source` in run state; QA-10 GFM separator; QA-11 reason enumeration; CR-6/7/8 cleanups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: every cycle-1 defect is gone, verified by execution. The refute pass earned its cost: QA-7 is a real crash-window defect in the fix's own resume story, and QA-8 is a hazard nobody had seen in the notes convention. Both are small.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-7 fixed and re-verified.

---

**QA Report**: co-located at `task.113.qa.2.develop-next-registry-bookkeeping.md`
**Gate File**: co-located at `task.113.gate.2.develop-next-registry-bookkeeping.yml`
**Next Steps**: `/qa-fix` on QA-7…QA-11 + cleanups → cycle 3 (scoped to files changed since gate 2)
