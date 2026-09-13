# QA Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: [Link to task document](./task.116.qa-loop-routes-and-preconditions.md)
**Gate File**: [task.116.gate.4.qa-loop-routes-and-preconditions.yml](./task.116.gate.4.qa-loop-routes-and-preconditions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3's structural fix holds — every consumer now points at §5c and the two load-bearing ones read the cycle entry's `**Action**` row — but the loop document never tells the Diminishing-returns exit to **write** that row, and its template still offers an unreachable value. So the signal the consumers depend on is unguaranteed on exactly the route (2) that cycle 3 set out to cover (CR-1, HIGH). The remaining findings are local: a runbook snippet whose commands disagree with its new comment (CR-2), and three stale consumer sentences the sweep missed (CR-3, CR-4, CR-5). Suite green (3269/3268/0); cycle-3 fixes verified in source and bundled copies; QA proof `covered`. HIGH sequence `[0, 2, 0, 1]`. Rule 1 → FAIL.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — merge after CR-1, CR-2 close

---

## Re-Review Context

| Cycle-3 issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (c3) resume contract restates 2/3 routes | **FIXED** (as filed) — but see c4 CR-1 | 4 Action-row sites; 0 paraphrase; but the writer of that row is unspecified on route 2 |
| CR-2 (c3) conformance flags route 2 | **FIXED** (as filed) — same caveat | Action-row read + three routes named + no-report fallback |
| CR-3/4/5 (c3) loop doc vs its arms | **FIXED** | route 1 qualified; shapes table; commit-point path 1; arm-5 heading; all pinned |
| CR-6 (c3) six two-route lines | **FIXED** — one snippet only half-fixed (c4 CR-2) | loop doc :18-23/:317/:1002, qa-flow table, snippets' comments |
| CR-7 (c3) stated-once test | **FIXED** | forbids six paraphrase shapes; requires pointer + signal; mutation-proved ×6 |
| CR-8 (c3) site name | **FIXED** | `review-story` Step 1 pre-pass |
| Bugs 2, 3, 4, 5 | verified as filed | bug 6 (new, HIGH) is the unwritten writer; bug 2 reopened for CR-2/3/4 |

**Re-review scope: since 2026-09-13T08:54:10Z (default narrowing)** — 9 source files / 704 diff lines; `SAFETY_REPROBE=false` (gate 3 security `OK reasoned`).

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:257,315,558-568` — the `On exit` list writes only `**Loop exit**`; nothing overwrites `**Action**`/`**PR Review**` after the guards resolve; template offers `Proceeding to finalise` → add the write as an explicit step, drop the dead value, pin it (CR-1, [bug 6](./task.116.bug.6.on-exit-never-writes-the-action-row.md))
- **[MEDIUM]** `docs/runbooks/story-development.md:297`, `task-development.md:179` — comment says "Action row reads Proceeding to 5c"; commands still grep the gate token → make the check match the comment (CR-2, [bug 2 reopened](./task.116.bug.2.consumer-docs-restate-old-route.md))
- **[LOW]** `shared/resources/qa-findings-ingester-prompt.md:172` — "the gate that sent the run to 5c reads `PASS`" contradicts `:28` (CR-3, bug 2)
- **[LOW]** `skills/review-pr/SKILL.md:194,546` — the host skill still states the predicate as the token pair while the prompt it loads forbids reading the token (CR-4, bug 2)
- **[LOW / cleanup]** `docs/runbooks/qa-flow.md:34` — "Clean gate" row omits the inactive-`WAIVED`-no-open cell → "route 1 — see §5c" (CR-5)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: routes | FAIL | Router and consumers correct; the signal's writer is unspecified on route 2 |
| Phases 2–4 | PASS | Unchanged |

## Success Criteria Verification

SC1 FAIL (writer gap) · SC2 PASS (reviewer 09:03:25 → 09:07:01; gate 09:14:25) · SC3–5 PASS · SC6 N/A

## Breaking Changes Validation

Consumer Code Updated: **Partially** — `review-pr/SKILL.md` and the ingester's Rules section still carry the token premise. **Overall:** CONCERNS

## Issues Found

HIGH: 1 (CR-1 → bug 6) · MEDIUM: 1 (CR-2 → bug 2) · LOW: 3 (CR-3, CR-4 → bug 2; CR-5 cleanup)

## NFR Assessment

Performance PASS · Reliability PASS · Security PASS (reasoned, `probes_executed: 0`, no boundary) · Maintainability PASS (advisory CR-5)

---

## Code Review

Reviewer: one read-only Explore subagent over the narrowed diff (9 files, 704 lines). Dispatched 09:03:25, returned 09:07:01 (3 m 36 s; budget 10 m). 5 findings (4 bugs, 1 cleanup); `code_review_blocking=true` promotes bug + high confidence: CR-1, CR-2, CR-3 entered by rule; CR-4 (low/medium) verified by QA and entered on QA's authority.

**Boundary rule:** `boundary: false`, `probes_executed: 0`. **Platform variance:** n/a. **Step 4b:** no fence added, removed or edited in the cycle-3 diff; cycle-1's bound executions stand.

**Mutation proofs (QA, cycle-3 fixes):**
```
mutation-proven: resume contract "not reached" row → "If gate {N} reads `PASS`/`WAIVED`" → "the accepting-route set is stated once…" → covered
```
(first attempt used a different spelling from the original and dodged the regex — `mutation-void`, redone with the original phrasing → `covered`.)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3269 / 3268 / 0 / 1 skipped |
| Bundled copies in sync | PASS |
| `pr-review-loop-parity` 29 / `qa-gate-preconditions-parity` 8 | PASS |

---

## Recommendations

### Immediate (Blocking)
1. CR-1 — `On exit` (and every post-guard hand-off) writes `**Action**`/`**PR Review**`; drop `Proceeding to finalise`; pin.
2. CR-2 — runbook snippet commands match their comment.

### Short-term
CR-3, CR-4 — two consumer sentences; CR-5 — qa-flow row by pointer.

---

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 70/100 · **Rationale**: rule 1 — one HIGH: the mechanism cycle 3 introduced is missing its writer on one route. Findings 7 → 8 → 5 → 5, all local to the last fix.

**Deployment Recommendation**: BLOCKED · **Conditions**: CR-1, CR-2 closed

---

**QA Report**: co-located at `task.116.qa.4.qa-loop-routes-and-preconditions.md`
**Gate File**: co-located at `task.116.gate.4.qa-loop-routes-and-preconditions.yml`
**Next Steps**: `/qa-fix` on gate 4 (cycle 4 of 5) → re-review (cycle 5 — the last)
