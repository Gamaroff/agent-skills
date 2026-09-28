# Sprint Review Summary - create-task: anchored claims, a bounded title, and a --from-observation entry

**Story/Task ID:** task.150
**Completed Date:** 2026-09-28
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#512](https://github.com/Gamaroff/agent-skills/pull/512)

---

## Summary

`/create-task` now makes each claim in a task document point at evidence (obs #127, #124, #135).
The authoring preflight bounds the card title (obs #128). A new `--from-observation` entry turns
open observations into a task draft and parks them safely (obs #147). While building the park step,
we found and fixed a defect in `observation-log.js` itself: `set-status` silently rewrote the first
file whose name shared an id prefix. It now refuses an ambiguous `--id`, and it takes
`--expect-status`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The card preflight reports `title-too-long` over `CARD_TITLE_MAX` (100), with a fix that names the H1 when the H1 fits. It exits 0, or 1 under `--strict`
- [x] A corpus ratchet freezes the 43 legacy long titles. A new long title fails, and so does a listed title that has since been shortened
- [x] create-task § 3.5 and Section 3, and review-task check 13, carry the section-scoped evidence rules for obs #127, #124 and #135
- [x] `seedFromObservations` refuses non-open or ambiguous entries and drops an over-bound title. Its park vectors carry `--expect-status open`
- [x] The four test files run offline. The corpus is walked once and each document read once
- [x] `CARD_TITLE_MAX` is defined once, and a tracked-tree test pins that
- [x] Every mutation row is recorded red then green. The CHANGELOG cites task 150 and all five observations

### Key Features Implemented

- **Title reader on the raw header**: a card title is one column-0 `title:` line with a single-line value. Any other shape is reported as `title-not-inline`, not measured. The header edges are the sync's own
- **`/create-task --from-observation`**: selection is keyed on the file prefix, not the parsed id
- **`observation-log.js set-status`**: new `ambiguous-id` and `status-changed` refusals (the `--expect-status` guard)

---

## Technical Details

### Files Modified/Created

- `shared/resources/jira-sync.js`: `CARD_TITLE_MAX`, `readCardTitle`, `checkCardTitle`
- `shared/resources/card-preflight.js`: the title finding
- `shared/resources/observation-log.js` and `observation-log-contract.md`: `ambiguous-id` and `--expect-status`
- `skills/create-task/SKILL.md` and `skills/create-task/scripts/lib.js`: § 1.1 `--from-observation`, § 3.5, § 4 and § 5
- `skills/review-task/SKILL.md`: check 13
- `skills/observe-work/SKILL.md` and `references/review-cycle.md`: `--expect-status`
- Tests: `card-preflight.test.mjs`, `card-preflight-corpus.test.mjs`, `observation-log.test.mjs`, `skills/create-task/tests/from-observation.test.js` and `tests/create-task-authoring-evidence.test.js`

### Architecture/Design Decisions

- Three QA cycles found the same identity defect, so it was fixed at the engine root: `set-status` refuses an ambiguous id, and create-task keys selection on the file. The alternative, patching each caller, was rejected.
- The title check is scoped rather than taught more YAML. Three DoD runs each found shapes the parser misread, so any shape that is not canonical is refused, never measured.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. `set-status` without `--expect-status`, and with a unique id, behaves exactly as before.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** full suite 4402 (4401 pass, 0 fail). CI is green on the PR.
- **Boundary probes:** DoD run 3 ran 141 candidates, and 20 low-severity title shapes reproduced. After the Step 8a fix, the recheck record shows 112 executed and 0 reproduced, with all 4 controls engaging.
- **QA:** 5 cycles; the final gate is PASS (100/100). Bugs 1–4 are closed.

### Code Review

- **Reviewers:** Step 5c `/review-pr` (code and conformance lenses). This is a solo-maintained repository with no formal GitHub review.
- **Approval Status:** ⚠️ CONCERNS (advisory). No finding is both high severity and high confidence.

---

## Security & Compliance

- **Security:** ✅ PASS after the fix-and-recheck. The seed and `set-status` guards engage, and so do the title check and the ratchet.
- **Compliance:** Not applicable: internal tooling, with no personal, payment or health data and no UI.

---

## Known Limitations and Future Work

- The sync paths' `--check-card` does not read the title yet, so at review the title is advisory, not gated (Open Question 2).
- The observe-work Step 6 template passes a literal `--expect-status open` (5c CR-1).
- The § 1.1 padded-prefix match is a follow-up (CR5-2).
- 43 legacy long titles are frozen, not renamed. Renaming them is the owner's decision.

**Detailed Verification Log:** `task.150.dod.3.create-task-authoring-evidence.md`
