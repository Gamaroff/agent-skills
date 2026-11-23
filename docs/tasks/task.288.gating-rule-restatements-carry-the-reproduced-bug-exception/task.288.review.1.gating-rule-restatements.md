# Task Review Report: Task 288 - Gating-rule restatements carry the reproduced-bug exception

**Reviewed:** 2026-11-23
**reviewed_blob:** d7ee063f4dacc12adb623540019b536924746331
**Review Depth:** Standard
**Task Status:** planned (promoted to ready-for-development by this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-11-23

---

## Executive Summary

The task is well scoped (five prose lines, one test) and its design is sound: a population derived from `git ls-files`, sentence-level matching outside fences and tables, a non-vacuity floor, reasoned exemptions and a mutation proof. Its coordinates had drifted in the two weeks since it was written, and its plan's one named search would have found two of the four report-template lines. Both are fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (pipeline run; `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. The review ran inside `develop-task` under `develop-next --defaults`, which auto-answers the output format ("Comprehensive report"), Step 8.5 ("apply all critical + important fixes") and Step 9 ("fixes complete").

Pre-pass: Agents B and C were not dispatched; both passes were done in-line against the tree (architecture alignment: the task touches prose and one test under a glob that already runs; implementation status: `evals/shared/tests/gating-rule-restatements.test.mjs` does not exist, so the task is not implemented). Independence loss recorded: the reviewer and the pre-pass are the same context.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections are present. Frontmatter carries `type: task`, `description`, `tags`. `github_issue: 862` is linked. The Change Log section exists with the four canonical columns. No placeholders remain.

### Issues

#### Optional
- The task has three phases and `estimated_effort_hours: 4`; the rubric agrees within 2x. No finding.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (anchors drifted, one phrase mislocated)

### Important

- **I-1 Line anchors no longer resolve** (check 3, line anchors). Re-measured with `git grep -n`:

  | Cited | Actual |
  | --- | --- |
  | `code-review-prompt.md:92` | `:96` |
  | `qa-task/SKILL.md:1622`, `:1936` | `:1633`, `:1953` |
  | `qa-story/SKILL.md:1867`, `:2479` | `:1867`, `:2495` |
  | `qa-task/SKILL.md:1050` (the "eligible under `code_review_blocking` exactly like any other" phrase) | the line holds no such phrase; the phrase is at `shared/resources/qa-runnable-prose-detection.md:683` only |
  | `pr-conformance-prompt.md:191` | the heading is at `:191`, the sentence at `:193` |

  The claims are true; the coordinates moved. Fixed in the document's § 3 table, § 6 phases and § 7. The document already tells the reader to re-measure, so no process change is needed.

- **I-2 The plan's one search finds two of the four lines** (check 20, a site list carries its grep). Phase 1 says to find the four report-template lines with `git grep -n "advisory unless"`. Two of the four (`qa-task:1953`, `qa-story:2495`) open with a capital "Advisory unless", so the case-sensitive grep returns two template lines and a developer following it rewords half of CR-6. Measured: `git grep -n "advisory unless"` over the two files returns `qa-task:51`, `qa-task:1633`, `qa-story:90`, `qa-story:1867`; `git grep -n -i` adds `qa-task:1953` and `qa-story:2495`. The search also returns `qa-task:51` and `qa-story:90`, which already name the run-level argument and the 5d exception and must not be reworded. Fixed in the plan: `-i`, plus the four template lines named by their opening text.

- **I-3 Two unqualified `(it will not gate)` sites are unaccounted for** (check 14/20, population). Key (C) "will not gate" matches `pr-conformance-prompt.md:113` and `qa-docs-only-review-prompt.md:59` as well as the CR-5 line. The task's table listed `qa-docs-only-review-prompt.md:56` as a "false positive: a template line" and did not mention the pr-conformance line, so the new test would have been red on its first run at two sites the task never decided. Both are lens prompts that report claims about a diff and write no gate, so the expected decision is an exemption with that reason. Added to § 3 and Phase 2.

### Optional

- **O-1** The exemption criterion ("every exemption carries a reason and names a sentence that still exists") named no test that holds it. Fixed: it is held by the test's own exemption assertion, with a case that a reasonless or stale exemption must fail.
- **O-2** § 3 "Current Architecture" cites `qa-task/SKILL.md:854` and `qa-story/SKILL.md:1354` for step 5d; both are now at `:855` and `:1354`. One line off, left for the developer's re-measure (the document says coordinates decay).
- **O-3** The test's population excludes the bundled copies under `skills/*/references/` by construction (it keys `skills/*/SKILL.md` and `shared/resources/*.md`). That is correct and is stated in § 3; no change.

### Checks run with no finding

- Test reach (check 18): `package.json` `test:suite` carries `'evals/shared/tests/*.test.mjs'`; the new file is under it. No `package.json` edit is needed, as the task says.
- Shape references exist: `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` and `finding-anchors-callers.test.mjs`.
- Enumerated class (check 25): a new `evals/shared/tests/*.test.mjs` file is a member of a class no hand-kept table lists; the glob reaches it.
- Fixture literals (check 26): the plan prescribes no consumer name; the test's sentences are quoted from this repository's own sources.
- Temp directories (check 28): the mutation proof's scratch worktree is removed "in a `finally`", as the document states.
- Same-class mechanism (check 6): the task adds no function that dedupes or heals; the test is a new guard, and `qa-loop-ends-on-a-gate.test.mjs` is the named sibling shape.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are small, ordered and file-specific. The plan names the exact replacement text for CR-5 and CR-6. After the fixes above, every file and line it names resolves.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Success criteria are measurable. The Performance criterion states a bound (under 2 seconds) with its measuring method (median of five runs, `uptime` beside each).
- Behaviour criteria each name a test: the new test and its three mutations.
- No criterion can only be met after merge. The "gate-6 entries marked done in this task's QA report" criterion names its location (the QA report), which is committed before acceptance.
- A control case is stated for the key's blind spot (a restatement avoiding all three keys); the test does not claim to find it.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risks (a blind or noisy prose-keyed test) carry mitigations. Rollback covers the test alone and the whole merge.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

None.

### Should Fix (Important) - 3 (all applied)

1. Re-measure the drifted anchors (I-1).
2. Make the plan's template-line search case-insensitive and name the four lines (I-2).
3. Decide the two unqualified `(it will not gate)` sites in Phase 2 (I-3).

### Consider (Optional) - 3

1. Tie the exemption criterion to its test (applied).
2. Re-measure the 5d anchors at implementation time (left to the developer).
3. None for the bundled copies.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (anchors drifted; fixed)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three important issues were coordinate and search defects, now corrected in the document.

---

## Next Steps

Developer should: run the task's prototype probe first and compare its count with the test's; re-measure each line coordinate with `git grep` before editing; reword in sources, never the bundled copies, then `npm run bundle`.

---

## Review Metadata

- **Reviewer:** review-task (pipeline run)
- **Review Date:** 2026-11-23
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md
- **Architecture Docs Consulted:** none needed (prose and test-only change)

---

## Erratum (added at develop, 2026-11-23)

Three statements in this review were wrong, found when the plan was executed:

1. **I-1 said `qa-task/SKILL.md:1050` holds no "exactly like any other `category: bug` finding" phrase.** It does: the sentence wraps across lines 1050 and 1051, and the review's per-line `git grep` could not match it. The task and plan are corrected.
2. **I-3 listed `pr-conformance-prompt.md:113` as an unqualified `(it will not gate)` site.** The line reads "it will not drive the verdict"; no key matches it. Only `qa-docs-only-review-prompt.md:59` is such a site.
3. **The review passed the test design without checking where the lines it must hold sit.** The task specified skipping fenced blocks, and all five lines it rewords (CR-5 and the four CR-6 lines) are inside fences, so that test could not have gone red on mutations (a) and (b). Found at develop; the test reads template fences (info string `markdown`, `md`, `text` or none) and skips code fences. A check "does the test's unit of scan reach the lines its success criteria name" would have caught it; it is recorded as an observation.

The review's score of 8/10 stands for the task as it then read; the design change is the developer's decision and is logged in the implementation report.
