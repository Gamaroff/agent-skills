# QA Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: [Link to task document](./task.116.qa-loop-routes-and-preconditions.md)
**Gate File**: [task.116.gate.3.qa-loop-routes-and-preconditions.yml](./task.116.gate.3.qa-loop-routes-and-preconditions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's two HIGHs are closed: no consumer keys 5c on the `PASS`/`WAIVED` token pair any more, the arms share one definition of *open*, the exhaustiveness test is matrix-driven, and the suite is green (3269/3268/0). But the restatement every cycle-2 fix used — *a non-`FAIL` gate with no open entry, or an active `WAIVED`* — is **two of §5c's three routes**: it omits route 2, the Diminishing-returns exit, which hands a `CONCERNS` gate with *open* test-machinery entries to 5c. So the resume contract and the conformance prompt now mis-handle a route-2 gate (CR-1, CR-2), and the loop document disagrees with its own arms in §5c route 1, the shapes table, the commit-point section and arm 5's heading (CR-3/4/5). A further sweep finds six more two-route lines in unchanged parts of changed files (CR-6). Four MEDIUM, no HIGH → CONCERNS. HIGH sequence `[0, 2, 0]`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after CR-1, CR-2, CR-3, CR-6 close

---

## Re-Review Context

| Cycle-2 issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (c2, HIGH) resume contract keys 5c on token | **FIXED as filed; PARTIAL as a rule** → reopened MEDIUM | 0 `reads PASS/WAIVED`; 4 "reached 5c" sites (source + bundled). But the parenthetical restatement omits route 2 |
| CR-2 (c2, HIGH) conformance prompt flags route-3 gates | **FIXED as filed; PARTIAL as a rule** → reopened MEDIUM | "did not reach 5c" + "non-empty means open" present. But the bullet still flags route 2's open machinery residue |
| CR-4 (c2) two definitions of open | **FIXED** | one definition stated above the arms; arm 1 uses it; inactive WAIVED read by its queue. Matrix test 8 cells |
| CR-3 (c2) runbook rows | **FIXED** | rows match arms; but see CR-6 for six more lines elsewhere in the same files |
| CR-5 (c2) three stale sentences | **FIXED** | `qa-flow.md:167`, ingester `:28`, Convergence preamble |
| CR-6 (c2, cleanup) matrix test | **FIXED** | `exactly-one-claimant` over 8 cells; mutation-proved ×3 |
| CR-7 (c2, cleanup) wallClockMinutes reader | **FIXED** | `read_nested_config_key subagents wallClockMinutes` named |

**Re-review scope: since 2026-09-13T08:32:33Z (default narrowing)** — 8 source files / 585 diff lines; `SAFETY_REPROBE=false` (gate 2 security `OK reasoned`).

---

## New Findings This Cycle

- **[MEDIUM]** `shared/resources/develop-pipeline-resume-contract.md:82,92,129,130` — "reached 5c" restated as two of three routes; route 2 (Diminishing-returns exit, open machinery entries) re-enters at 5a → define "reached 5c" from the implementation report's `**Action**: Proceeding to 5c` row and point at §5c (CR-1, [bug 3 reopened](./task.116.bug.3.resume-contract-keys-5c-on-token.md))
- **[MEDIUM]** `shared/resources/pr-conformance-prompt.md:62,66` — route-2 gate flagged as a trail defect → exempt the cycle whose `**Loop exit**` row records the exit (CR-2, [bug 4 reopened](./task.116.bug.4.conformance-prompt-flags-route-3-gate.md))
- **[MEDIUM]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:889,1039,712,692,267` — §5c route 1 unqualified; shapes-table `PASS` "empty"; commit-point path 1 "PASS / WAIVED → 5c"; arm-5 heading narrower than its body → one rule per file (CR-3/4/5, [bug 5](./task.116.bug.5.loop-doc-disagrees-with-its-own-arms.md))
- **[MEDIUM]** `docs/runbooks/qa-flow.md:70-80`, loop doc `:18-23,:317-318,:1002`, `story-development.md:297`, `task-development.md:179` — two-route set in unchanged lines of changed files (CR-6, [bug 2 reopened](./task.116.bug.2.consumer-docs-restate-old-route.md))
- **[LOW / cleanup]** `pr-review-loop-parity.test.mjs:281` — "stated once" test asserts absence of the old phrase, not presence of a pointer; a two-of-three restatement stays green (CR-7)
- **[LOW / cleanup]** `develop-pipeline-autonomous-defaults.md:44` — "review-story Phase 1.5" → review-story's pre-pass is Step 1 (CR-8)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: routes | CONCERNS | Verified | Router correct; the *set* is restated in four consumers and one of three routes is missing from every restatement |
| Phase 2–4 | PASS | Verified | Unchanged; CR-8 is a site-name typo |

**Overall Phase Completion**: 4/4; 1 with MEDIUM findings

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | Route 3 + 5b on open finding | CONCERNS | Correct in the arms; consumers restate 2/3 routes |
| 2 | Gate not written/published while review outstanding | PASS | Reviewer 08:42:53 → 08:47:16; gate 08:54:10 |
| 3–5 | | PASS | Unchanged |
| 6 | Observations close | N/A | post-merge |

---

## Breaking Changes Validation

Consumer Code Updated: **Partially** — the token-pair premise is gone everywhere, but the replacement phrase drops route 2. **Overall:** CONCERNS

---

## Issues Found

HIGH: 0 · MEDIUM: 4 (CR-1 → bug 3, CR-2 → bug 4, CR-3 group → bug 5, CR-6 → bug 2) · LOW: 2 (CR-7, CR-8 cleanups)

---

## NFR Assessment

Performance PASS · Reliability PASS · Security PASS (reasoned, `probes_executed: 0`, no boundary) · Maintainability PASS (advisory: after three cycles of restating the set, the durable fix is a **pointer plus a mechanical signal** — the implementation report's `Action` / `Loop exit` rows — not a fourth paraphrase).

---

## Code Review

Reviewer: one read-only Explore subagent over the narrowed diff (files changed since gate 2; 585 lines, 8 files). Dispatched 08:42:53, returned 08:47:16 (4 m 23 s; budget 10 m). 8 findings (6 bugs, 2 cleanups); `code_review_blocking=true` promotes bug + high confidence: CR-1, CR-2, CR-3, CR-5 (all medium/high or low/high) entered by rule; CR-4 (medium/medium) and CR-6 (low/medium) verified by QA against the tree and folded into the CR-3 / CR-6 gate entries on QA's authority.

**Boundary rule:** `boundary: false`, `probes_executed: 0`. **Platform variance:** n/a.
**Step 4b:** no fence added, removed or edited in the cycle-2 diff (0 `+/-` fence or `$(` lines); cycle-1's bound executions stand (2+2 runnable, bash+zsh exit 0).

**Mutation proofs (QA, cycle-2 fixes):**
```
mutation-proven: conformance "non-empty means open" sentence → "present entries count" → "the accepting-route set is stated once" → covered
```
(mutation applied 1→0; predicted test red; 29/29 after restore.) Developer's six-revert proof of the matrix and stated-once tests recorded in the implementation report.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3269 / 3268 / 0 / 1 skipped |
| Bundled copies in sync | PASS (`git status` 0 drift after `npm run bundle`) |
| `pr-review-loop-parity` 29 / `qa-gate-preconditions-parity` 8 | PASS |

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 / CR-2 — "reached 5c" from the implementation report (`**Action**: Proceeding to 5c` / `**Loop exit**`), route 2 named, consumers point at §5c.
2. CR-3 group — the loop doc agrees with its own arms.
3. CR-6 — sweep the six lines; route 3 in the How-the-loop-ends table; `pending` placeholder on any gate that routes to 5c.

### Short-term (Non-Blocking)
1. CR-7 — stated-once test requires a pointer. 2. CR-8 — site name.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 60/100 · **Rationale**: rule 2 — four MEDIUM entries, no HIGH. Converging: HIGH `[0, 2, 0]`, each cycle's findings smaller and more local than the last.

**Deployment Recommendation**: CONDITIONAL · **Conditions**: CR-1, CR-2, CR-3, CR-6 closed

---

**QA Report**: co-located at `task.116.qa.3.qa-loop-routes-and-preconditions.md`
**Gate File**: co-located at `task.116.gate.3.qa-loop-routes-and-preconditions.yml`
**Next Steps**: `/qa-fix` on gate 3 (cycle 3 of 5) → re-review (cycle 4)
