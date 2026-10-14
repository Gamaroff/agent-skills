# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 7)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.7.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.7.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: PASS

---

## Executive Summary

This is the last budgeted cycle of the granted re-entry. The cycle-6 fix holds. The stale-arm HALT no
longer calls a dirty listed path a 5c edit and no longer offers `git checkout`. The reviewer raised one
new wording finding: the HALT says "commit it". QA rates it LOW and advisory, because the list can name
only tracked, clean, doc-only paths. The gate has no open entries.

**Overall Assessment**: PASS · **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| CR6-1 stale-arm HALT offers to discard unattributable work | FIXED — mutation-proved (`covered`, bash + zsh) |
| CR6-2 `git diff` failure read as dirty (advisory) | NOT FIXED — still advisory, carried in `recommendations.future` |

---

## Review Methodology

Re-review scope: files changed since gate 6 (head 0d316038db82; 7 files) — default. The fix delta is
`ed10bc82`. One Explore reviewer; duration 81.3 s (completion notice `duration_ms`). `SAFETY_REPROBE`
clause 1 is false; clauses 2–3 do not hold. Direct tools otherwise (re-review).

Step 4b ran `qa-execute-snippets.mjs` over `shared/resources/develop-pipeline-step-5-6-qa-loop.md`. It
found 1 runnable block, 1 placeholder and 22 mutating, with 0 findings. Outside the work item, the tree
is byte-identical to `ed10bc82`, which the 5b fast gate ran on: `ci:fast` 5,549 pass, 0 fail, 1
skipped.

---

## New Findings This Cycle

- **[low, advisory — reviewer medium/medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1461`
  — the stale-arm HALT tells the operator to "commit it or set it aside yourself". A commit in this
  window moves `HEAD` past the pushed head before `/finalise` 6a (CR7-1).
  → Say "set it aside (stash), or commit it through `/commit-changes` and push", to match the HALT
  exception at lines 1409–1412.

**Re-rating, measured.** The classify block writes a path to the eligible list only when
`isDocsPath` matches it, it is tracked, and it is clean against `HEAD`. Step 8 deletes the list. A
stale list therefore exists only after a 5c pass that did not reach Step 8, and it names
documentation paths only. If the advice is followed, the worst case is a documentation commit at a
HALT. `/finalise` catches that loudly, because its CI reading 1 runs against an unpushed head. No
work is discarded, and nothing goes wrong silently. CR6-1 was different: its remedy could discard work.
The reviewer's original severity and confidence are recorded above. Confidence is unchanged. The
finding is not auto-promoted (confidence medium), and QA does not adopt it into `top_issues`.

The anchor resolves to the quoted text at `HEAD` (`finding-anchors.js`, `ok`). Provenance: the line
was added in `ed10bc82`.

---

## Code Review

**Correctness bugs (1):**
- [medium/medium → QA LOW] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1461` — HALT advice "commit it" sits in the no-commit-before-6a window → advise stash, or `/commit-changes` + push. Advisory; `recommendations.future`.

**Cleanups (0).**

`boundary: false` — unchanged from QA report 1.

mutation-proven: restore the `git checkout` remedy in the stale-arm HALT → `5c classify: a stale list is replaced only when its paths are clean; a dirty one HALTs` red under bash and zsh → covered

---

## NFR Assessment

Security PASS (reasoned, probes 0, `boundary: false`). Performance PASS. Reliability PASS. CR6-1 is
closed, and CR7-1 and CR6-2 are advisory and fail loud. Maintainability PASS.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Next Steps**: Step 5c (`/review-pr`), the
loop's exit gate.
