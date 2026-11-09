# Sprint Review Summary - qa-task steps state the routes they lack

**Story/Task ID:** task.273
**Completed Date:** 2026-11-09
**Pull Request:** [#861](https://github.com/Gamaroff/agent-skills/pull/861)

---

## Summary

`qa-task` and `qa-story` now state five routes that each QA cycle used to improvise: a docs-only review, a reproduced medium finding that gates, a scratch directory for reviewers that execute, no mutation beside a running suite, and a probe for criteria that a tool would pass vacuously.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Each of the five routes is present in `qa-task` and `qa-story` (where it applies), citing its observation.
- [x] Each route fires on its fixture and not on its control, recorded per route in QA report 1.
- [x] The docs-only prompt returns the same findings shape as `code-review-prompt.md`, shown by a recorded run.
- [x] `npm test` wall time is within 10% of `develop` on the head (median develop 193 s, head 167 s, QA report 6).
- [x] `bundle --check` is clean and `npm test` passes; `quick_validate.py` passes for the four skills (CI on 6b7d9f65).
- [x] Migration criterion re-scoped to a follow-up with the owner's approval.

### Key Features Implemented

- **Docs-only route**: a Markdown-only change set takes a claim-check review instead of the code reviewer (`shared/resources/qa-docs-only-review-prompt.md`).
- **Step 5d**: a code-review bug that QA reproduces by execution gates at any reviewer confidence, unless the doc sets `code_review_blocking: false`.
- **Reviewer scratch rule and mutation overlap rule** in Step 3b and Step 3c.
- **Vacuous-criterion probe** in `qa-task`, `qa-story`, `review-task` and `create-task`.

---

## Technical Details

### Files Modified/Created

- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` - the routes, and the 5d exception at every restatement of the gating rule
- `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md` - the criterion probe
- `shared/resources/code-review-prompt.md`, `shared/resources/mutation-proving.md` - supporting rules
- `shared/resources/qa-docs-only-review-prompt.md` - new docs-only prompt
- `evals/shared/tests/finding-anchors-callers.test.mjs` - the new prompt registered as a consumer

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **QA:** six gates; the last PASS (100/100). Cycles 1 to 5 each found one MEDIUM gating-rule restatement that earlier probes missed; the loop reached its limit and two extra cycles were granted.
- **PR review:** conformance lens CONCERNS, both findings fixed.
- **Open, non-blocking:** two LOW wording residues (T273-CR-5, T273-CR-6) and the follow-up migration check, all in gate 6 `recommendations.future`.

---

## Known Limitations and Future Work

- Confirm on the next docs-only task's QA report that it uses the docs-only route.
- Add a guard test that every file mentioning `code_review_blocking` also mentions the reproduced-bug exception.
