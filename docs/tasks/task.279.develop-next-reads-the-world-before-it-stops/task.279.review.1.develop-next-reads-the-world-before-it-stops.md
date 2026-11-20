# Task Review Report: Task 279 - develop-next reads the world before it stops

**Reviewed:** 2026-11-17
**reviewed_blob:** 867cc47cb05c10cd8dfde1485751aebf90470e0f
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is sound and its citations hold (`SKILL.md:69`, `:71`, `:28`, `:262` all match the tree). The review found plan gaps, not factual errors, and fixed them in the document. Pipeline run: pre-pass checks done inline rather than by Explore subagents, so independent review did not run.

**Critical Issues:** 0
**Important Issues:** 5, all fixed
**Optional Improvements:** 1

**User Clarifications:** 0 (autonomous pipeline run, `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## 1. Template Structure Compliance

PASS. Frontmatter has `type: task`, `description`, `status`. Change Log present and current after this review. Tracker card preflight: 3 card blocks resolve. No sign-off section (disabled).

## 2. Technical Accuracy

### Important (all fixed in the document)

- **The 0.1a wording is pinned by an existing test (check 15).** `evals/develop-next/protocol/skill-shape.test.mjs:515-528` asserts `never route a halted run, and never to Step 3`, `develop-pipeline.last-halt.json` and `set \`halted: false\`` inside the text between the `a.` and `b.` markers. The plan did not name it. Fix: § 3 and Phase 1 now require those phrases to stay in that slice, or the test to be updated in the same edit.
- **Test location undecided (check 18).** The plan said the reader and its test lived "under `skills/develop-next/scripts/` or `shared/resources/`" and "if the prose needs one". The test runner reaches `evals/develop-next/unit/*.test.mjs` through `eval:develop-next`; there is no `skills/develop-next/tests/`. Fix: the reader is `skills/develop-next/scripts/halt-evidence.mjs`, required, with its test at `evals/develop-next/unit/halt-evidence.test.mjs`.
- **Reconstruction states not listed (check 19).** Fix: § 3 lists seven states the 0.1a decision must hold in (resolved, PR open, document not accepted, no `prNumber`, query failure, bug `closed`, `halted: false`).
- **Fourth orchestrator missing (check 20).** `grep -n "observe-work\|Session Start"` over `skills/develop-{task,story,bug}/SKILL.md` finds nothing in any of them; `develop-bug` has the same Phase 0 shape but was not listed. Fix: `develop-bug` added; `develop-batch` excluded with a stated reason.
- **Success criterion for the Step 0 line had no holding test (check 4).** "Greps in the QA report" holds nothing per PR. Fix: one test, `evals/shared/tests/observe-work-start-line.test.mjs`, reached by the `evals/shared/tests/*.test.mjs` glob in `package.json`, reads the four `SKILL.md` files.

### Verified by running (checks 11, 31)

`git worktree add --detach ../.qg-probe HEAD`, then `ephemeralReason` (`shared/resources/observation-log.js:584`) on its real path returned `null`; the same call on `/tmp/x/y` returned "inside a temporary directory". So the planned sibling worktree is not refused by the two tests. The refused set is `/tmp`, `/var/tmp` and `.claude/worktrees/`. The probe worktree was removed.

## 3. Implementation Plan Completeness

Phases are specific, with files and a rollback. Phase 1's "if the prose needs one" hedge is resolved above.

## 4. Consistency & Completeness

Migration criterion ("an existing fixture passes unchanged") named no fixture; it now names the pinned test and the new unit case.

## 5. Risk & Rollback Assessment

Adequate. The High-risk item (routing past a real halt) has both-conditions-required mitigation and PR-open / not-accepted controls, and now a mutation proof requirement.

### Optional

- `estimated_effort_hours: 8` is within the rubric's range; no change.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ READY TO IMPLEMENT

## Review Metadata

- **Reviewer:** develop-task pipeline (inline)
- **Task File:** docs/tasks/task.279.develop-next-reads-the-world-before-it-stops/task.279.develop-next-reads-the-world-before-it-stops.md
- **Architecture Docs Consulted:** none needed (skill-prose and test-harness task); pre-pass Agents B and C run inline, not as subagents
