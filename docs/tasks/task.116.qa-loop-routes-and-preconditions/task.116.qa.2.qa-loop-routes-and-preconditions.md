# QA Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: [Link to task document](./task.116.qa-loop-routes-and-preconditions.md)
**Gate File**: [task.116.gate.2.qa-loop-routes-and-preconditions.yml](./task.116.gate.2.qa-loop-routes-and-preconditions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 is the refute pass — the whole branch diff, reviewed by an agent told to find the false claim rather than confirm the fix. It found it: the accepting-route set that route 3 extends is **restated in two more places that still key on the token**, and both are load-bearing. The resume contract keys the 5c sub-state on `PASS`/`WAIVED`, so a run killed inside 5c on a route-3 gate either burns a cycle or leaves the loop without its exit gate (CR-1, HIGH). The PR conformance prompt lists "gate is not PASS or WAIVED" as a TRAIL defect, so every route-3 gate arrives at 5c pre-flagged (CR-2, HIGH). Both cycle-1 MEDIUMs were **partial**: the arms still use two definitions of "no queue" (CR-4), and the runbook rewording is wrong for an active `WAIVED` gate while three further sentences carry the two-route premise (CR-3, CR-5). Rule 1 → FAIL.

Everything else holds: suite green (3268/3267/0), cycle-1 fixes present in source and bundled copies, QA mutation proof `covered`, Step 4b clean, no boundary.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — merge after CR-1..CR-4 close

---

## Re-Review Context

| Cycle-1 issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (c1) unrouted `PASS`+open-LOW / inactive `WAIVED` | **PARTIAL** → reopened as CR-4 | Arm 5 + malformed clause present (`6df79fd7`); but arm 1 "no `top_issues`" ≠ arm 3 "no open entry" — `PASS` with all-closed entries HALTs as malformed; inactive-`WAIVED`-no-open unrouted |
| DOC-1 (c1) runbooks restate `CONCERNS → qa-fix` | **PARTIAL** → reopened as CR-3 + CR-5 | Five lines reworded; new wording wrong for active `WAIVED`; "PASS/WAIVED hands to review-pr" left in the same rows; 3 more stale sentences (`qa-flow.md:167`, `qa-findings-ingester-prompt.md:28`, loop doc `:377`) |
| CR-2 (c1) stale "step 4" refs | **FIXED** | `step 6 (Gate mapping)` in both skills; 0 remaining |
| CR-3 (c1) `subagents.wallClockMinutes` undocumented | **FIXED** (with a note) | Schema block + Key reference row present. No engine reads it — same class as `develop.fastGateCommand` (prose-read); CR-7 asks for a named reader |

**Re-review scope: unscoped — cycle 2 refute pass over the whole branch diff (27 files, 2070 lines)**; `SAFETY_REPROBE=false` (gate 1 security axis `OK reasoned`).

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/develop-pipeline-resume-contract.md:82,92,129-130` — 5c sub-state keyed on `PASS`/`WAIVED`; a route-3 gate's killed-inside-5c resume re-enters 5a or skips 5c → key on the §5c accepting-route set (CR-1, [bug 3](./task.116.bug.3.resume-contract-keys-5c-on-token.md))
- **[HIGH]** `shared/resources/pr-conformance-prompt.md:62-63` — TRAIL bullets flag every route-3 gate → accept `CONCERNS` with no open entry; "non-empty" means open (CR-2, [bug 4](./task.116.bug.4.conformance-prompt-flags-route-3-gate.md))
- **[MEDIUM]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:252` — two definitions of "no queue" across arms; `PASS`+all-closed and inactive-`WAIVED`+no-open unrouted (CR-4, [bug 1 reopened](./task.116.bug.1.unrouted-gate-shapes.md))
- **[MEDIUM]** `docs/runbooks/story-development.md:235,272`, `task-development.md:114,149` — "any open entry → qa-fix" wrong for active `WAIVED`; "PASS/WAIVED → review-pr" stale (CR-3, [bug 2 reopened](./task.116.bug.2.consumer-docs-restate-old-route.md))
- **[LOW]** `docs/runbooks/qa-flow.md:167`, `shared/resources/qa-findings-ingester-prompt.md:28`, loop doc `:377` — two-route premise (CR-5, bug 2)
- **[LOW / cleanup, advisory]** `evals/shared/tests/pr-review-loop-parity.test.mjs:226` — exhaustiveness test asserts bullet presence, stays green on the CR-4 mutant → drive from the 8-cell matrix (CR-6)
- **[LOW / cleanup, advisory]** `docs/reference/configuration.md:121` — `subagents.wallClockMinutes` has no named reader → add `read_nested_config_key subagents wallClockMinutes` at §Subagents (CR-7)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: routes | FAIL | Verified | Route 3 exists in the loop doc; but the accepting-route set is restated (and stale) in the resume contract and the conformance prompt — "stated in one place" is claimed by §5c and not yet true |
| Phase 2: preconditions | PASS | Verified | Unchanged from cycle 1 |
| Phase 3: what QA runs, not reads | PASS | Verified | Unchanged |
| Phase 4: subagents | PASS | Verified | CR-7 advisory: the override key needs a reader |

**Overall Phase Completion**: 4/4 phases complete; 1 with HIGH findings

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | CONCERNS + empty queue reaches 5c; 5b only on an open finding | **FAIL** | True in §5b/§5c; false in the resume contract and the conformance prompt (CR-1, CR-2); arm definitions inconsistent (CR-4) |
| 2 | No gate written/published while a review is outstanding | PASS | Dogfooded again this cycle: reviewer 08:20:32 → 08:26:23; gate 08:32:33 |
| 3 | 3b executes boundary candidates with `probes_executed` | PASS | |
| 4 | Platform-variance check + command in 3b/3c + prompt | PASS | |
| 5 | Subagent rows + liveness sentence at every site | PASS | |
| 6 | Observations close naming this PR | N/A | post-merge |

---

## Breaking Changes Validation

### Breaking Change: CONCERNS / empty-queue gate now reaches 5c
Documented: Yes · Migration Path: N/A · Migration Tested: replay fixture 5/5 · Consumer Code Updated: **No** — two in-repo consumers of the route set (resume contract, conformance prompt) not updated; runbook wording partial.

**Overall Breaking Changes Assessment:** FAIL

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: Resume contract keys the 5c sub-state on PASS/WAIVED** — [bug 3](./task.116.bug.3.resume-contract-keys-5c-on-token.md) · Category: Functional · P0 · see New Findings

**Issue: Conformance prompt flags every route-3 gate as a TRAIL defect** — [bug 4](./task.116.bug.4.conformance-prompt-flags-route-3-gate.md) · Category: Functional · P0 · see New Findings

### MEDIUM Severity Issues (2)

**Issue: Two definitions of "no queue" across the arms** — [bug 1, reopened](./task.116.bug.1.unrouted-gate-shapes.md) · P1
**Issue: Runbook wording wrong for active WAIVED; stale sentences remain** — [bug 2, reopened](./task.116.bug.2.consumer-docs-restate-old-route.md) · P2

### LOW Severity Issues (3)
CR-5 (bug 2), CR-6 (cleanup), CR-7 (cleanup) — see New Findings.

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
Cycle-1 fixes mutation-proven by QA (below); suite green. The exit-invariant hole (CR-1) is carried in `top_issues[]` so rule 1 decides the gate.

### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — no boundary delivered; unchanged from cycle 1.

### Maintainability — PASS
CR-6/CR-7 advisory.

---

## Code Review

Reviewer: one read-only Explore subagent, **refute pass** (cycle 2 directive), whole branch diff excluding bundled copies (2070 lines, 27 files). Dispatched 08:20:32, returned 08:26:23 (5 m 51 s; budget 10 m). 7 findings: 5 bugs, 2 cleanups. `code_review_blocking=true` promotes `bug` + `confidence: high`: CR-1 (high/high), CR-3 (medium/high), CR-5 (low/high) entered `top_issues[]` by rule; **CR-2 (high/medium) and CR-4 (medium/medium) were verified by QA against the tree and entered on QA's own authority** — confidence is the reviewer's, severity is the gate's.

**Correctness bugs (5):**
- [high/high] `develop-pipeline-resume-contract.md:82` — 5c sub-state keyed on the token pair → key on the accepting-route set
- [high/medium] `pr-conformance-prompt.md:62` — route-3 gate is a TRAIL defect by construction → accept CONCERNS-no-open; "non-empty" = open
- [medium/high] `docs/runbooks/story-development.md:235` — "any open entry → qa-fix" wrong for active WAIVED; stale "PASS/WAIVED → review-pr" → match the arms
- [medium/medium] `develop-pipeline-step-5-6-qa-loop.md:252` — arm 1 vs arm 3 definitions; two cells unrouted → one definition; route inactive WAIVED by its queue
- [low/high] `docs/runbooks/qa-flow.md:21` — three more stale sentences → name the set

**Cleanups (2):**
- `evals/shared/tests/pr-review-loop-parity.test.mjs:226` — presence-only exhaustiveness test → matrix-driven
- `docs/reference/configuration.md:121` — no reader for `subagents.wallClockMinutes` → `read_nested_config_key` line

**Boundary rule:** `boundary: false`, `probes_executed: 0`. **Platform variance:** n/a.

**Mutation proofs (QA, cycle-1 fix):**
```
mutation-proven: arm 5 "same road as the `FAIL` arm" → "`PASS` arm" → "the outcome-branching arms are exhaustive" → covered
```
(mutation applied 1→0; predicted test red; baseline 28/28 after restore). Note the reviewer's CR-6: this proof shows the test reads the sentence, not that it covers the matrix — a different mutant (drop arm 3's "every entry reads status: closed") would stay green. Recorded as `covered` for the sentence, `no-red-untested` for the cell.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3268 / 3267 / 0 fail / 1 skipped |
| Bundled copies carry cycle-1 fix | PASS (develop-task, develop-story references) |
| Step 4b (qa-task bound, gate 1 bound) | PASS — 2 runnable, bash+zsh exit 0, no findings |
| `pr-review-loop-parity` / `qa-gate-preconditions-parity` | PASS 28 / 8 |

---

## Test Artifacts

### Files Reviewed
Cycle-1 fix files; `shared/resources/develop-pipeline-resume-contract.md`; `shared/resources/pr-conformance-prompt.md`; `shared/resources/qa-findings-ingester-prompt.md`; `docs/runbooks/qa-flow.md`.

### Test Commands Executed
```bash
npm run ci:fast                                                        # .claude/state/t116-qa2-testlog.txt, TEST_EXIT=0
node --test evals/shared/tests/pr-review-loop-parity.test.mjs          # 28 pass; mutation: arm 5 → 1 fail
node shared/resources/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --bind … --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — resume contract onto the accepting-route set, by reference to §5c.
2. CR-2 — conformance prompt TRAIL bullets.
3. CR-4 + CR-6 — one "no open entry" definition; route inactive WAIVED by its queue; matrix-driven test.
4. CR-3 + CR-5 — runbook rows and three sentences match the arms.

### Short-term Actions (Non-Blocking)
1. CR-7 — a named reader for `subagents.wallClockMinutes`.

**The pattern behind all of it:** the accepting-route set was declared "stated in one place" (§5c) while four other documents restated it. The fix that lasts is a pointer, not a fourth restatement.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: rule 1 — two HIGH entries. The headline change is correct where it was made and contradicted where it was not.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1, CR-2, CR-3, CR-4 closed

---

**QA Report**: co-located at `task.116.qa.2.qa-loop-routes-and-preconditions.md`
**Gate File**: co-located at `task.116.gate.2.qa-loop-routes-and-preconditions.yml`
**Next Steps**: `/qa-fix` on gate 2 (cycle 2 of 5) → re-review (cycle 3, convergence check active)
