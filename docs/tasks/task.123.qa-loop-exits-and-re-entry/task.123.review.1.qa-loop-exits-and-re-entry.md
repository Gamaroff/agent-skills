---
id: task.123.review.1
title: "Review 1: task.123 — QA loop exits and re-entry"
type: review
task-ref: task.123.qa-loop-exits-and-re-entry.md
reviewed: 2026-09-18
review_depth: standard
---

# Task Review Report: Task 123 — The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Reviewed:** 2026-09-18
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT (pre-fix) — the diagnosis is right and the routes are wanted; the current-state description of Problem 4 is wrong, route 2c contradicts itself, and the plan's file map misses the files the changes actually live in.

---

## Executive Summary

> **Implementation Status**: ✅ All 11 recommendations (2 Critical, 6 Important, 3 Optional) implemented — 2026-09-18. GitHub #423 retitled.

The task correctly names four loop shapes the step-5-6 doc improvises around, and every one traces to a real run (task.108, .110, .117) and an open observation. Two things would have sent the developer to the wrong place: Problem 4 describes a `qa_cycles_completed` snapshot field that does not exist anywhere in the repository — the resume contract already reconstructs the cycle count from `### QA Cycle` entries in the implementation report, and the gap is *report entries vs gates on disk*, not a missing snapshot field — and route 2c's precondition (open MEDIUM entries) contradicts its action ("nothing to fix", re-review the same head). The Diminishing-returns exit that route 2b is a sibling of is already a JS engine (`qa-diminishing-returns.js`) that the task never names, while the plan proposes a second awk counter beside it.

**Critical Issues:** 2 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 6 questions asked and answered
**Implementation Readiness:** 6/10 (pre-fix) → 9/10 once the fixes below land
**Recommendation:** NEEDS REVISION — all revisions are document edits, resolved by the decisions recorded below

**Pre-pass results:** Agent B `alignment: aligned` (no architecture drift). Agent C `implementation_status: not-implemented` — none of the five symbols (2b/2c routes, `--set`/`qa_cycle`, re-entry fields, review-only mode, new Loop-exit values) exists; greenfield.

---

## User Decisions & Clarifications

### Question Point 2: Technical & Implementation

**Q1: Route 2c — when does it fire and what does it review?**
- **User Decision**: At budget exhaustion. Fire only when the 5b fix of the last budgeted cycle has landed with HIGH 0 throughout and MEDIUM strictly falling; grant one review+gate half-cycle (5a only, no 5b) on that fix's head; PASS / CONCERNS-empty → 5c, otherwise escalate with the gate attached.
- **Impact**: 2c moves out of Outcome branching into Loop Escalation as a pre-escalation step. The `review_only` Skill arg the plan proposed for `qa-task`/`qa-story` is no longer needed — the half-cycle is an ordinary 5a invocation — which also removes the contradiction with the Out-of-Scope line about not changing those skills.

**Q2: Lock mechanism A or B?**
- **User Decision**: Option B, decided now. `current_step` stays `5` across 5a/5b/5c; a `qa_phase: 5a|5b|5c` field carries the sub-position; the Stop hook reads it to name `/qa-task` vs `/qa-fix` vs `/review-pr`.
- **Impact**: Phase 1 is no longer a decision but an implementation. `develop-pipeline-on-stop.sh` lines 22–23 (the `5)`/`6)` arms) change to read `qa_phase`; step `6` becomes unused in the story/task lock (develop-bug keeps its own map).

**Q3: Phase 3 — the snapshot fields.**
- **User Decision**: Derive at resume, one lock field. Drop `cycles_outside_loop` as a snapshot field (it is always `0` at halt time); derive it at resume as `max(gate.{N}) − count(### QA Cycle)` and back-fill. Keep only `extra_cycles_granted`, written to the **lock** at resume. Do not reuse `MAX_ITER` (the Step 3 develop-loop bound).
- **Impact**: Problem 4 is rewritten to name the real gap; the halt-snapshot writer is correctly located in `skills/develop-{task,story}/SKILL.md`, not the step doc.

**Q4: Where do the 2b/2c predicates live?**
- **User Decision**: Extend `shared/resources/qa-diminishing-returns.js` into the loop's route classifier — one `classifyLoopRoute()` returning `{route: diminishing-returns | cosmetic-residue | gate-the-last-fix | continue}`, MEDIUM_N computed inside it from gate content, fixture table as the spec.
- **Impact**: No second awk counter; the same-class mechanism inventory reads *extends*; the `**Loop exit**` message for every route comes from a `describe*` function, as route 2's already does.

### Question Point 3: Completeness & Safety

**Q5: Route 2b — PASS only, or CONCERNS with a LOW-only queue too?**
- **User Decision**: PASS only, stated explicitly as an exclusion.
- **Impact**: A `CONCERNS` token means QA holds a reservation the conformance review should see raised, not carried in `recommendations.future`.

**Q6: Frontmatter `title` is 252 characters.**
- **User Decision**: Shorten to the H1 text and retitle GitHub #423 to match.
- **Impact**: The long text already lives in `description`; the card summary and document agree.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (minor)

All eleven mandatory sections present; `type: task`, `description`, `tags` present and well-formed; Change Log present and current for `status: planned`; file name follows `task.123.qa-loop-exits-and-re-entry.md`. Sign-off not enabled in `skills-config.yaml` — not checked. Tracker: `github_issue: 423` exists (OPEN), body link `[#423](…/issues/423)` matches. Card preflight: `3 card blocks resolve` — Summary 569 chars (+1 more), Success Criteria 424 chars (+3 more), Breaking Changes 125 chars.

### Issues

#### Important
- **Frontmatter `title` is a 252-character paragraph.** The H1 ("The QA loop's guards read only the HIGH count and the lock cannot go backwards") is the title; the rest duplicates `description`. GitHub #423 carries the same 252-character title.

### Recommendations (Based on User Decisions)

1. **Set `title` to the H1 text; `gh issue edit 423 --title` to match** — _Per Q6_

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1

### Issues

#### Critical (Hallucination)
- **`qa_cycles_completed` snapshot field does not exist.** Problem 4 says "The snapshot records `qa_cycles_completed: 5`"; the Target Architecture and Phase 3 build on it.
  - **Location:** §2 Problem 4; §3 Target Architecture (resume contract line); §6 Phase 3
  - **Evidence:** `grep -rn qa_cycles_completed shared/resources skills/develop-*/SKILL.md` → no matches. The terminal-HALT snapshot writer (`skills/develop-task/SKILL.md:266-268`) adds only `halted_at`, `halt_reason`, `halt_step` to the lock's fields. The resume contract's **QA Cycle Count Reconstruction** (`develop-pipeline-resume-contract.md:116-160`) counts `^### QA Cycle` entries in the implementation report — a standalone operator-run `qa-task` writes `gate.6`/`qa.6` but no report entry, which is the real gap task.110 hit.
  - **Recommendation:** Rewrite Problem 4 and Phase 3 around the report-vs-disk divergence; derive `cycles_outside_loop` at resume; keep `extra_cycles_granted` as a lock field — _Per Q3_

#### Important
- **Same-class mechanism inventory absent (obs #103).** The Diminishing-returns exit is `shared/resources/qa-diminishing-returns.js` (`classifyDiminishingReturns`, `describeDiminishingReturns`), invoked from the step doc as "ask the engine; do not evaluate them by eye". Route 2b is a HIGH-0-two-cycles + residue-classification predicate — the same class. The task never names the engine; the plan says "Derive `MEDIUM_N` with the same awk as `HIGH_N`", which is the second counter the step doc itself warns "drifts silently".
  - **Recommendation:** Extend the engine into `classifyLoopRoute()`; name it in Files Summary; inventory reads *extends* — _Per Q4_
- **`MAX_ITER` naming collision.** Plan Phase 3 step 3: "`MAX_ITER` becomes `qa_cycles_completed + k`". `MAX_ITER=5` is the Step 3 develop-loop stall bound (`develop-pipeline-resume-contract.md:184`); the QA loop's budget is the "5 complete cycles" in Loop Escalation and `cycle {N} of 5` in the Action row.
  - **Recommendation:** Name the QA budget distinctly (e.g. `QA_MAX_CYCLES`) — _Per Q3_
- **Lock test path wrong.** Files Summary #6 cites `shared/resources/tests/advance-pipeline-lock.test.*`; the test is `shared/resources/advance-pipeline-lock.test.sh` (the helper's own comments reference "scenario 11", "all 30 tests").
- **Halt-snapshot writer and Phase 0b prompt mislocated.** Phase 3 says "the halt-snapshot writer in the step-5-6 doc"; it is `skills/develop-task/SKILL.md:266` and the "Resume from {halt_step}" / "Start fresh" prompt is `:273` (and the develop-story equivalents). Neither SKILL.md is in the Files Summary.

#### Optional
- **"Precondition staged by obs review 2026-09-17" is stale.** §Convergence check step 3 already states `HIGH_N > 0` as a precondition with the `0, 0, 0` worked example. Say *landed*, not *staged*.
- **Verified accurate**: `docs/runbooks/qa-flow.md` mermaid has edges B→D, D→B, B→E (clean), E→D, E→F — no route-2 (diminishing-returns) edge and no escalation edge, exactly as the task claims.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Critical
- **Route 2c contradicts itself.** Precondition: open MEDIUM entries at cycle N, strictly falling. Action: "one half-cycle … in review-only mode (no 5b)" because "there is nothing to fix". Re-running `qa-task` on the same head raises the same MEDIUM; the plan's "scoped to the previous fix's diff" reading exits on a narrower review disagreeing with a wider one, which is the finding-drop the Clarifications say 2c is not.
  - **Impact:** Unimplementable as written; task.117's actual pain — a cycle-5 fix landing with no cycle-6 gate — is a budget-boundary problem.
  - **Recommendation:** Relocate 2c to Loop Escalation as a pre-escalation half-cycle: after the last budgeted 5b lands, if HIGH was 0 throughout and MEDIUM strictly fell, run one ordinary 5a (review + gate) on the fix's head; PASS / CONCERNS-empty → 5c; any open entry → escalate with the gate attached. Drop the `review_only` arg. — _Per Q1_

#### Important
- **Lock decision deferred to Phase 1.** "Decide A or B" leaves the Stop hook's re-prompt derivation open.
  - **Recommendation:** Option B recorded in the task: `current_step: 5` for the whole loop, `qa_phase: 5a|5b|5c`; `develop-pipeline-on-stop.sh:22-23` reads `qa_phase` — _Per Q2_
- **Files Summary omissions.** Missing: `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` (snapshot writer, Phase 0b prompt), `shared/resources/qa-diminishing-returns.js` and its test, `shared/resources/advance-pipeline-lock.test.sh` (correct path), `evals/develop-story/step-isolation/` (see §4).
- **Plan vs Out-of-Scope contradiction.** Out of Scope: "Changing what `qa-task` / `qa-story` put in `top_issues[]`". Plan Phase 2: "The `review_only` arg is a new Skill arg for qa-task / qa-story". Resolved by Q1 — the arg is dropped.

#### Optional
- **Effort estimate.** Rubric: 8 criteria, 11 plan checkboxes, ~12 files, medium risk → 11.5h → bucket **8h**; frontmatter `8`. Within tolerance (the "Migration" heading would trip the `has_integration` keyword and push it to 16h, but that is a heading, not an integration). No change.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important
- **Story-side fixtures unscoped.** The step-5-6 doc is shared by develop-story and develop-task; `evals/develop-story/step-isolation/` exists with the same 01–08 layout as the task side. In Scope names only `evals/develop-task/step-isolation/`. Either add the story fixtures or state why one side pins a shared doc.

#### Optional
- **Route 2b exclusion unstated.** With 2b restricted to `PASS` (Q5), a `CONCERNS` with a LOW-only queue still takes the 5b road. State the exclusion and its reason in the route so a later reader does not widen it.

Testing Strategy, Success Criteria and Rollback are otherwise consistent with the plan: every route has a fixture and a mutation proof; the accepting-route set stays stated once in §5c; `pr-review-loop-parity.test.mjs` tests at lines 226, 351, 409 will need their route enumeration extended, which Files Summary #8 already anticipates. No Mermaid diagram in the task itself; the two ASCII architecture blocks carry the structure and none is recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risks name real failure modes with mitigations that match the decisions above (LOWs travel by id; the hook test covers the re-review state — and option B is the one the mitigation already prefers). Rollback triggers are concrete ("a HIGH finding reaches 5c") and the partial-rollback plan (revert Phase 2 only) is feasible because Phase 2 depends on Phase 1 and nothing depends on Phase 2. No additional risk found.

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues

1. Rewrite Problem 4 / Target Architecture / Phase 3 around the report-entries-vs-gates-on-disk gap; remove `qa_cycles_completed`; derive `cycles_outside_loop` at resume; `extra_cycles_granted` as a lock field; rename the QA budget — _Q3_
2. Relocate route 2c to Loop Escalation as a pre-escalation half-cycle; drop the `review_only` arg — _Q1_

### Should Fix (Important) — 6 issues

1. Record lock option B as the decision; name `on-stop.sh:22-23` as the hook change — _Q2_
2. Add the same-class inventory naming `qa-diminishing-returns.js`; predicates extend the engine as `classifyLoopRoute()` — _Q4_
3. Fix Files Summary: add both develop-* SKILL.md, the engine + its test, the correct lock-test path, story-side fixtures
4. Scope story-side replay fixtures (or state why not)
5. Remove the plan/Out-of-Scope contradiction (falls out of Q1)
6. Shorten `title`; retitle #423 — _Q6_

### Consider (Optional) — 3 items

1. "staged" → "landed" for the Convergence precondition
2. State the 2b `PASS`-only exclusion in the route — _Q5_
3. Effort stays at 8h (informational)

---

## Implementation Readiness Assessment

**Score (pre-fix):** 6/10

**Scoring Breakdown:**

- Template Compliance: 8/10 (title)
- Technical Accuracy: 5/10 (hallucinated field, mislocated writer, inventory absent)
- Implementation Clarity: 5/10 (2c contradiction, lock deferral)
- Consistency: 7/10 (plan vs scope, fixture sides)
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium pre-fix; High once the six decisions above are written into the document — every finding is a document edit with a resolved answer.

**Recommendation:** ⚠️ **NEEDS REVISION** — apply the fixes below, then the task is ready for `/develop-task`.

**Justification:** The problem statement and the routes are sound and every claim about *runs* checked out; the errors are in how the current mechanism is described and in one route's internal logic, both of which the user has now resolved.

---

## Next Steps

1. Apply the Critical and Important fixes to the task document and plan (Step 8.5)
2. Retitle GitHub #423
3. Promote to `ready-for-development`; run `/develop-task docs/tasks/task.123.qa-loop-exits-and-re-entry/task.123.qa-loop-exits-and-re-entry.md`

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-09-18
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.123.qa-loop-exits-and-re-entry/task.123.qa-loop-exits-and-re-entry.md`
- **Sources Consulted:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (§Outcome branching, §Convergence check, §Diminishing-returns exit, §Loop Escalation), `shared/resources/advance-pipeline-lock.sh`, `shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/pipeline-resume-detector-prompt.md`, `skills/develop-task/SKILL.md:260-275`, `docs/runbooks/qa-flow.md`, `evals/shared/tests/pr-review-loop-parity.test.mjs`, `docs/architecture/concepts/*` (via pre-pass B)
- **Pre-pass:** Agent B aligned (27s); Agent C not-implemented (55s) — both returned, neither killed
