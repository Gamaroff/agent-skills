# Sprint Review Summary - qa-results carried-block and log residuals

**Story/Task ID:** task.184
**Completed Date:** 2026-10-13
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#644](https://github.com/Gamaroff/agent-skills/pull/644)

---

## Summary

`qa-results.js` no longer loses content in three document shapes that predate task 183. It keeps a nested Bug Reports tail it used to delete. It refuses, rather than corrupts, a section under an ambiguous marker-less change log and a carried list that continues past a label and a paragraph. It also never writes a section that its own next write would refuse.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] CR-1: a nested Bug Reports block keeps `[a]` and `[b]` exactly once across three writes, `replaced` each time
- [x] CR-2: both ambiguous marker-less log variants are refused `unbounded` with a `structural-line:` detail, document byte-identical
- [x] CR3-2: the `| Reviewer | Date |` shape is refused with the exact detail; G1 (REL-004) is still `replaced`
- [x] CR6-1: a carried list behind a label and a paragraph is refused with `carried-tail:- [b](./b.md)`, byte-identical
- [x] Suites under 2 s — by recorded operator override (host CPU throttled at finalise; identical code ran 1.08–1.62 s, median 1.14 s, before the throttling)
- [x] No network access — one `require(`, of `./change-log.js`
- [x] Corpus write survey 0 / 0 / 0
- [x] R5, R6, R7 each mutation-proved
- [x] `ci:fast`, `bundle:check`, `validate` clean
- [x] CHANGELOG `[Unreleased]` › Fixed cites task 184; task 183's entry narrowed
- [x] Seven task.183 passages amended, with one task.183 Change Log row

### Key Features Implemented

- **Nested tail kept**: a kept outer block extends to the end of a nested block that runs past it
- **Ambiguous log refused**: a section directly under a marker-less log whose last Date table is not Date-first is refused, never relocated with quoted rows left behind
- **`carried-tail:` refusal**: a carried list cut by a label and a paragraph is refused, unless another carried block already carries the list
- **One section guard**: `sectionGuard()` judges both the section being replaced (`unbounded`) and the section being written (`unplaceable`)

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-results.js` - the engine (bundled into `skills/qa-task` and `skills/qa-story` `references/`)
- `shared/resources/tests/qa-results.test.mjs` - R3–R10
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` - Step 12 `unbounded` hint and prose name `carried-tail:`
- `CHANGELOG.md` - task 184 entry; task 183 entry narrowed
- `docs/tasks/task.183…` - seven passages amended

### Architecture/Design Decisions

Two refusal rules, each correct alone, let the engine write documents its own next write refused. QA cycles 1–2 closed that class by applying one guard to both sides of a write instead of patching each shape.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None to a public contract — `upsertQaResults` keeps its signature and reason set; two shapes that were silently damaged are now refused, with a migration in the CHANGELOG

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** engine suite 91 tests (R3–R10); engine + corpus + wiring 104/104
- **Test Coverage:** a property test (R8) over 343 shapes; reviewer fuzzes of 450k and 2,831 documents clean

### Code Review

- **Reviewers:** QA code reviewer each cycle (5 cycles); Step 5c `/review-pr` twice
- **Approval Status:** ✅ QA gate 5 PASS 100/100; PR review APPROVE
- **Review Comments Addressed:** all; four cosmetic cleanups carried to future work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets, no shell or eval; pure string-in, string-out writer
- [x] `boundary: internal` — the inputs are artefacts this pipeline writes, and no corpus sink models them (reason recorded)

### Compliance Review

✅ **Not applicable** — internal developer tooling; no personal, payment or health data; no UI

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` › Fixed
- [x] `qa-task` and `qa-story` Step 12 hint and `unbounded` paragraph
- [x] task.183 document wording

---

## Demo Notes

### How to Verify

1. `command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js` → 104 pass
2. Expected outcome: R5 keeps the nested tail; R6 and R7 print the `structural-line:` and `carried-tail:` refusals with the document unchanged

---

## Known Limitations and Future Work

- Four cosmetic cleanups from QA gate 4 (`recommendations.future`)
- `changelog-entry-drift.test.mjs` holds CHANGELOG placement only after merge
- The measured-criterion rule cannot be met literally by a committed record, because committing it moves the head (DoD run 2, AC5)
