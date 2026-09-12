# Task Review Report: Task 113 - develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Reviewed:** 2026-09-12
**Review Depth:** Standard
**Task Status:** Planned (at review start) → Ready for Development (after fixes)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 Important recommendations implemented — 2026-09-12 (Optional items 1–3 also applied; Optional 4 is a develop-time sweep item)

---

## Executive Summary

The diagnosis is sound and every cited file, engine and observation exists; the task's own §3 was verified line-by-line against `skills/develop-next/SKILL.md` (Step 1 `item.source` at 99–104, Step 3 `PASS` clause at 134, Step 4 at 284), `skills/develop-batch/SKILL.md` Step 3 (358–471), `shared/resources/registry-tick.js`, both protocol shape tests, and observations #13/#30/#31/#34/#35/#46/#52/#53 in the observation log. What the draft got wrong was the **shape of the thing it proposes to write**: it names a "notes/PR cell" the task registry does not have, treats the bug registry as if it had the same columns, attributes issue creation to the wrong document, and promises a "fixture run" of a branch that as scoped would be prose. All four are fixed in the document; the fix that matters most moves the registry write onto a tested `registry-tick.js --annotate` mode so Step 4 calls a command instead of describing a sed.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-next` directive); every decision below took the option the review recommends and is recorded here
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous run — no `AskUserQuestion` was issued. Decisions the review would have asked about, with the option taken:

**D1: Mechanism for the registry write (prose sed vs engine mode)**
- **Decision**: Engine — extend `shared/resources/registry-tick.js` with `--annotate --pr <n> [--issue <ref>]`.
- **Rationale**: the task's Testing Strategy already demanded a fixture run, which only an engine can have; the repo's own precedent (task.103's header comment: "written as prose … the only available test would grep the prose") argues the same; and it keeps one file as the row's owner (finalise → Status, develop-next → annotate) rather than two writers with two locators.

**D2: Tracker linkage (task has no `github_issue`)**
- **Decision**: Sync to GitHub (the recommended option) — issue created in this review's Step 2 check 5 via `ensure-task-github-issue`.
- **Impact**: this run is now the live case for the task's own Phase 3 — `TRACKER_ISSUE` was empty at Step 1, is set after Step 2, and the orchestrator must re-fire 0c-reg. Recorded in the implementation report as the Phase-3 verification.

**D3: Verification target (plan step 5 named B13)**
- **Decision**: replace with this task's own run — T113 is registry-sourced, so the `/develop-next` that develops it exercises the new Step 4 on row 113.

---

## 1. Template Structure Compliance

**Status:** PASS (one Important finding, resolved)

All 11 numbered sections present and filled; no placeholders; frontmatter carries `type: task`, `description`, `tags`, `risk_level`, `estimated_effort_hours`. Change Log present and current. Card preflight (`sync-jira-task.js --check-card`): `ok: true`, Summary block omits 1 sentence (`+1 more` — information, not a defect). Sign-off: not configured (skipped). Change Log enforcement: default advisory — present and current.

### Issues

#### Important
- **No tracker issue linked** — `github_issue:` absent. → Resolved: issue created and written back (see Step 10 comment and implementation report).

#### Optional
- None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (resolved)
**Hallucinations Detected:** 1 (a column that does not exist)

### Issues

#### Important
- **"notes/PR cell" — the task registry has no Notes column.** `docs/tasks/task-registry.md` columns are `# | Title | Status | Category | Priority | Created | Issue | Depends on`. The de-facto notes cell is the 8th (`Depends on`), which rows 100–106 use as `… · PR #M merged`; the 7th is the tracker link. The bug registry (`# | Title | Status | Severity | Priority | Created | Area`) has **neither** — `develop-bug` flips Status and there is nothing for the orchestrator to add.
  - **Location:** §2 problem 1, §4 In Scope, SC1, plan Phase 1.
  - **Fix applied:** §3 now names both column shapes; In Scope/SC1/plan state the 8th-cell append + `Issue` fill for tasks and the explicit no-cell case for bugs.
- **"Step 2's linkage check creates the issue" attributes the creation to the wrong document.** The issue is created inside `/review-task` (Step 2 check 5 → `ensure-task-github-issue`), not by `develop-pipeline-step-2-review.md`. That step doc's `TRACKER_ISSUE` was captured at Phase 0c and never re-read, and the lock's `tracker_issue` (read by the PreCompact/Stop hooks) is stale the same way — so a re-fire that only "runs 0c-reg" without re-reading the key would fire with an empty key.
  - **Location:** §2 problem 3, §3, Phase 3.
  - **Fix applied:** §3 and Phase 3 now say: re-read `github_issue:`/`jira_key:` after `/review-*` returns, update the lock, then run 0c-reg once.

#### Optional
- **Citation precision:** the "no roadmap row" rule lives in the roadmap's Change Log row dated 2026-09-12 (line 157, Housekeeping item 1), not a `§Housekeeping` heading; Step 3's `PASS` clause is line 134, not ≈133. Fixed the former; the latter is within the stated tolerance.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved)

### Issues

#### Important
- **No mechanism for a testable registry write.** Testing Strategy promises "a fixture run of the registry branch against a scratch registry file" but the branch was scoped as SKILL.md prose, and prose has no fixture run. → Fixed per D1: `registry-tick.js --annotate` mode with reasons `annotated | already | no-cell | no-row | no-registry | not-a-task`; Files Summary, Phase 1, plan and Testing Strategy updated; `docs/standards/task-registry.md` added to Files Summary (it must name the second, additive writer).
- **Step 3 matrix promised, not specified.** Phase 2 says "enumerate the gate/document combinations in a small table" — without the rows, SC2 cannot be asserted row-by-row and the developer chooses them. → Fixed: the 7-row matrix (status × gate × open finding → merge/HALT) is now in §4 In Scope verbatim, including the missing/unparseable-gate row.

#### Optional
- **Plan step 5 named B13 as the verification run**, but bug.13 closed on 2026-09-12. → Replaced with this task's own registry-sourced run.
- **Doc sweep for the Step 4 rename:** only two canonical sources carry the old title — `skills/develop-next/SKILL.md:284` and `skills/develop-batch/SKILL.md:452` ("Tick the roadmap immediately"). `evals/develop-next/protocol/skill-shape.test.mjs` asserts only the `## Step 4` prefix, so the rename is test-safe. Noted in Files Summary; the develop step should also grep `docs/runbooks/` and `skills/develop-next/README.md` before finishing.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Overview ↔ Implementation Plan ↔ Files Summary now agree on the annotate mode and the three arms (roadmap / task-registry / bug-registry).
- SC5 (observations close) is an observation-log action outside the PR diff — now labelled as such so QA does not look for it in the diff.
- Scope: 3 phases, one engine mode, two SKILL edits, one shared step doc, tests. Not a split candidate.
- Effort: `estimated_effort_hours: 5`; rubric (5 SCs, ~7 plan items incl. the engine mode, medium risk) lands at ~6h — within tolerance, not flagged.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risk is correctly placed on Step 3 (the merge gate). The loosening is from a token to finalise's verdict **plus** an open-finding check, and the matrix keeps `FAIL`, open findings, non-`accepted` and a missing gate on HALT. Rollback is `git revert` with no state — the annotate mode is additive and its absence returns Step 4 to the current prose. One residual worth naming: the annotate mode's `--issue` fill must never overwrite a non-`—` `Issue` cell (a human may have linked a different issue); the fixture list includes that case.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues — all applied

1. Link a tracker issue — done (created this review).
2. Name the real registry column shapes; state the bug-registry no-cell case — done.
3. Put the registry write on `registry-tick.js --annotate` with fixture tests — done in the task text; the engine work is Phase 1.
4. Specify the Step 3 matrix rows in the task — done.
5. Phase 3 re-reads the key and updates the lock before re-firing — done.

### Consider (Optional) - 4 items

1. Citation precision (roadmap Change Log row) — done.
2. Replace B13 as the verification target — done.
3. Label SC5 as an out-of-diff action — done.
4. Sweep runbooks/README for the old Step 4 title during develop.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after fixes; 6 before)
- Implementation Clarity: 8/10 (after fixes; 6 before)
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every claim in the task now points at a file, a line or a column that exists, and the one write it introduces is a tested command rather than a described edit. The remaining judgement is in the develop step's wording of two SKILL.md steps, which the shape tests pin.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Land the `--annotate` mode and its fixtures first (Phase 1a), then Step 4, then the batch mirror.
2. Write the Step 3 matrix into both orchestrators verbatim from §4.
3. Add the Step 2 re-read + re-fire to `shared/resources/develop-pipeline-step-2-review.md`, then `npm run bundle`.
4. Mutation-prove: drop the registry arm → shape test reds; drop a matrix row → its assertion reds by name; skip `--annotate` on a `—` cell → fixture reds.

---

## Review Metadata

- **Reviewer:** Claude (review-task, invoked by develop-task Step 2 under `/develop-next`)
- **Review Date:** 2026-09-12
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.113.develop-next-registry-bookkeeping/task.113.develop-next-registry-bookkeeping.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md; docs/standards/task-registry.md; shared/resources/registry-tick.js; skills/develop-next/SKILL.md; skills/develop-batch/SKILL.md; evals/{develop-next,develop-batch}/protocol/skill-shape.test.mjs
- **Pre-pass subagents:** not dispatched — both axes (architecture alignment, already-implemented scan) verified inline against the files above; `registry-tick.js` confirmed to have no annotate mode and Step 4 confirmed roadmap-only, so `implementation_status: not-started`.
- **Review Duration:** ~15 minutes
