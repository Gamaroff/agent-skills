# Sprint Review Summary - Gating-rule restatements carry the reproduced-bug exception

**Story/Task ID:** task.288
**Completed Date:** 2026-11-23
**Completed By:** Lorien Gamaroff (with Claude)
**Pull Request:** [#934](https://github.com/Gamaroff/agent-skills/pull/934)

---

## Summary

The code-review gating rule was restated in about a dozen places, and some of them left out the exception that a bug QA reproduces by execution gates at any confidence. Every restatement now carries the exception, and a guard test stops it being dropped again.

---

## What Was Delivered

### Success Criteria Met

- [x] `code-review-prompt.md` no longer says "it will not gate" unqualified.
- [x] The four report-template lines name the run-level argument and the reproduced-bug exception.
- [x] The guard test passes on the tree and goes red on each of the three mutations, each recorded with the test that went red.
- [x] The guard test runs in about 0.45 s (median of five), well under 2 s.
- [x] The full suite and the bundle check pass (8745 pass, 0 fail).
- [x] Every exemption in the guard test carries a reason and names a live sentence.
- [x] `CHANGELOG.md` cites `(task 288)`.
- [x] The task 273 gate-6 carry-overs (CR-5, CR-6, the guard test) are marked done.

### Key Features Implemented

- **Reworded restatements**: CR-5, CR-6 (four lines) and nine more sentences across seven files.
- **Guard test** `evals/shared/tests/gating-rule-restatements.test.mjs`: reads git-tracked prose and template fences, keys four patterns, 6 reasoned exemptions, a floor of 24 sentences (29 measured), and a check that every "advisory unless" sentence says how blocking is resolved.

---

## Technical Details

### Files Modified/Created

- `shared/resources/code-review-prompt.md`, `qa-docs-only-review-prompt.md`, `pr-conformance-prompt.md`, `qa-runnable-prose-detection.md`, `develop-pipeline-step-5-6-qa-loop.md` - restatements reworded.
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/review-code/SKILL.md` - restatements reworded.
- `evals/shared/tests/gating-rule-restatements.test.mjs` - new guard test.
- `CHANGELOG.md` - entry under Unreleased.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit Tests:** 7 tests in `evals/shared/tests/gating-rule-restatements.test.mjs`
- **QA:** three cycles: FAIL 80, CONCERNS 90, PASS 95; each fix mutation-proved.
- **PR review (Step 5c):** CONCERNS, two documentation findings, both fixed.

## Security & Compliance

Security review: pass, not a boundary deliverable. Compliance: not applicable.

## Known Limitations & Future Work

Five advisory items stay open in gate 3: C3-1 (the prefix skip is too broad), C3-2 (duplicate floor), C2-3 (per-file floors), CR-3 (follower rule ignores block boundaries) and CR-4 (splitter edge cases).

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
