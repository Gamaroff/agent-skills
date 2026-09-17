# QA Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it (cycle 2 — refute pass)

**Task**: [Link to task document](./task.117.card-preflight-heading-only.md)
**Gate File**: [task.117.gate.2.card-preflight-heading-only.yml](./task.117.gate.2.card-preflight-heading-only.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's three findings are fixed — each reproduced shape now passes from a clean process, the
mutation proofs re-run red on their named tests, and both bug reports are closed. The refute pass
over the whole branch found the cycle-1 fix incomplete in one direction: both the label regex and the
property reject a line on a dot **anywhere**, so a label naming a file (`**Changes to
jira-sync.js**:`) is neither dropped nor reported and the original defect survives through that
shape. One medium, three low, three cleanups; CONCERNS, one more cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review`; 5/5 phases `[x]`
- [x] Tests passing (fast gate 3358/3359 at cycle-1 commit; 490/490 across the card + sync suites here)
- [x] Bug reports 1–2 at Ready for QA on entry
- [x] PR #416 OPEN, head `125ba955` = local HEAD

### Review Methodology

Direct tools plus one independent Explore diff reviewer, **refute directive appended** (cycle 2,
exactly one prior gate). Reviewer dispatched 07:24 → returned 07:29 (budget 10 min). Whole branch
diff (2122 lines, `references/` excluded), not the narrowed changed-since-gate set.

**Re-review scope: unscoped — cycle-2 refute pass (default rule).** Safety re-probe not triggered:
gate 1 security `PASS` / `measured`.

---

## Re-Review Context

| Cycle-1 finding | Status | Evidence |
| :--- | :--- | :--- |
| CR-1 — `isLabelOnly` list-half inert (post-collapse text) | **FIXED** | `The task is done when all of:\n- a\n- b` → `ok`; the line-level `See:\n- a:` fixture; mutation M1 red |
| CR-2 — epic `transform` before the label drop | **FIXED** | `**Existing System Context:**` + list on the epic spec → `ok`, `kind: list`; mid-paragraph bold still flattened; M2 red |
| CR-3 — no terminator taken as a label | **FIXED** | one-line summary, `None`, 200-word paragraph, story "so that" without period → all `ok`; M3 red |
| CR-4 — message ignores `omitted` | FIXED (see CR2-2) | message branches; the count it branches on is imprecise |
| CR-5 — figure stated four ways | FIXED | 29 of 120 (2026-09-17, corpus test) everywhere |

Bug reports `task.117.bug.1` and `task.117.bug.2`: **Closed** (verified this cycle).

---

## New Findings This Cycle

- **[medium]** `shared/resources/jira-sync.js:1710` — `RE_BOLD_LABEL` (`[^*\n.!?]+`) and `isLabelOnly` (`/[.!?]/` anywhere) treat a dot anywhere as a terminator; `**Changes to jira-sync.js**:` + list → `ok: true`, label published, list omitted → test for a **trailing** terminator only. **CR2-1**, [bug.3](./task.117.bug.3.dot-anywhere-disqualifies-label.md)
- **[low]** `shared/resources/jira-sync.js:1808` — `omitted = paras.length - 1` counts blocks above the label and fences beneath; for `**Before** (GitHub):` + fence the "stopped" message promises content that a `###` conversion would not deliver (it yields `empty`) → count only summarisable blocks after the label. **CR2-2**
- **[low]** `skills/create-task/SKILL.md:589` (and create-story, create-epic) — the prose re-derives the remedy ("put a sentence or a list under the label"), wrong for the stopped form and against the contract's own "do not re-derive the fix" → describe the finding, defer to the tool's `Fix:`. **CR2-3**
- **[low]** `shared/resources/jira-sync.js:1145` — colon optional in `RE_BOLD_LABEL`, so `**None**` as a whole Breaking Changes body is dropped and reported `heading-only` while the comment promises `None` is content → a bare bold line is a label when content follows, content when it is the whole section. **CR2-4**
- cleanup `jira-sync.js:1290` — fence parity toggle in `dropHeadingLines` where `makeFenceTracker` exists; a `**Functional**` after an inner ``` inside a ```` block is dropped. **CR2-5**
- cleanup `tracker-card-summary.md:166` — `scope` documented under `sync-jira-* --check-card` but only `card-preflight.js --json` emits it. **CR2-6**
- cleanup `jira-sync.js:1777` — two `heading-only` block shapes, neither with `kind`. **CR2-7**

---

## Implementation Verification

| Phase | Status | Notes |
| :--- | :--- | :--- |
| 1 corpus test | PASS | 0 of 120; floor 100 |
| 2a summariser drops bold labels | CONCERNS | drop misses a label containing a dot (CR2-1); bare bold alone (CR2-4) |
| 2b `heading-only` kind | CONCERNS | property has the same dot rule (CR2-1); message count imprecise (CR2-2) |
| 2c scope statement | PASS | display + `card-preflight --json`; sync scripts' JSON lacks it (CR2-6, cleanup) |
| 3 mutation proofs | PASS | M1–M4 re-run this cycle |

## Success Criteria Verification

| Criterion | Status | Notes |
| :--- | :--- | :--- |
| 1 finding kind + corpus 0 | PASS | |
| 2 list renders under a bold label | CONCERNS | not when the label contains a dot |
| 3 scope in clean output | PASS | |
| 4 one-definition + bundle parity | PASS | `bundle:check` OK after `125ba955` |
| 5 observations #43/#49 closed naming the PR | PENDING | at finalise |

## Breaking Changes Validation

Unchanged from cycle 1 — PASS (body diff on next sync, documented).

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (CR2-1), LOW: 3 (CR2-2, CR2-3, CR2-4) + 3 cleanups + 2 pre-existing carried (CRLF lists; review-story:2321)

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
Corpus 0; four mutations red on their named tests; fast gate green.

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 161
- Same probe re-run against the tightened property; no throw, all < 50 ms. Deviations as cycle 1 plus one stale probe expectation (`**Before** (GitHub):` now reported with its text retained — the intended outcome).

### Maintainability — CONCERNS
CR2-5/6/7 — fence tracking, JSON parity, block shape. Cheap; take with CR2-1.

---

## Code Review

Refute pass over the whole branch. Bugs with `confidence: high` entered the gate (CR2-1 medium; CR2-2, CR2-3 low). CR2-4 is `confidence: medium` — reproduced by QA (`summariseSection("**None**")` → `heading-only`), so it enters at low.

**Correctness bugs (4):** CR2-1 … CR2-4 as above.
**Cleanups (3):** CR2-5 … CR2-7 as above.

**Boundary rule**: `boundary: true`; `probes_executed: 161` (re-run).

**Mutation proofs (re-run this cycle, `cp` snapshot, restored byte-identical):**
- mutation-proven: `isLabelOnly` on collapsed text → `H2 … (CR-1)` → **covered**
- mutation-proven: transform before the drop → `H2 … (CR-2)` → **covered**
- mutation-proven: shape clause removed → `H2 … (CR-3)` + 3 prose fixtures → **covered**
- mutation-proven: bold-label drop reverted → corpus red at 28 → **covered**

**Step 4b**: one prose file changed since gate 1 (`authoring-card-preflight.md`): 1 block, correctly refused (`node`), `no-executable-blocks`. `create-task/SKILL.md` prose changed for CR-5 only; its bash blocks are unchanged.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| card suites + four `sync-jira-*` suites | 490/490 |
| `npm run ci:fast` (at `9f51eb40`) | 3358/3359, exit 0 |
| `bundle:check` (at `125ba955`) | OK |

---

## Recommendations

### Immediate Actions (Blocking)
1. Trailing-terminator-only in `RE_BOLD_LABEL` and `isLabelOnly`; fixtures for `**jira-sync.js changes**:` (label) and `**None.**` (content) (CR2-1).
2. CR2-2, CR2-3, CR2-4 as in the gate.

### Short-term Actions (Non-Blocking)
1. CR2-5, CR2-6, CR2-7.
2. CRLF lists; `review-story:2321` — pre-existing, carried.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 1 closed cleanly; the refute pass found the label test too strict in one direction, which reopens the task's own defect for labels that name a file. Medium, reproduced, one more cycle.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: co-located at `task.117.qa.2.card-preflight-heading-only.md`
**Gate File**: co-located at `task.117.gate.2.card-preflight-heading-only.yml`
**Next Steps**: `/qa-fix` on CR2-1..4 (+ cleanups), then cycle 3 (narrowed scope).
