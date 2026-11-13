# Sprint Review Summary - Orchestration reads status and time from the instrument

**Story/Task ID:** task.299
**Completed Date:** 2026-11-13
**Completed By:** develop-task pipeline (autonomous, via `/develop-next`)
**Pull Request:** [#899](https://github.com/Gamaroff/agent-skills/pull/899)

---

## Summary

Pipeline prose no longer teaches a wrapped command's exit code as a background step's status, or a hand-typed time of day. A guard test now holds both.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Phase 1 measurement (commands, counts, every hit classed) is recorded in the QA report's Findings table.
- [x] No unclassed hit remains; the allowlist carries a reason per entry and a non-vacuity floor fails on an empty scan.
- [x] The guard flags a fixture hit and passes the fixed form.
- [x] The guard adds 1.09 s (median of five) against a 3 s bound.
- [x] `bundle:check`, `format:check`, `lint:shell` and `ci:fast` pass.
- [x] `CHANGELOG.md` entry.

### Key Features Implemented

- **Status from the instrument**: the step-3 and step-5-6 docs say a background command's notification exit code is the wrapper's, and the real status is read from the file the step writes.
- **Time from the instrument**: 12 typed-time placeholders across shared sources and `nestjs-debug` now name `date -u`.
- **Guard**: `tests/orchestration-instrument-reads.test.js` scans 192 files, with fixtures per shape, a quote-masking step, and named unseen shapes.

---

## Technical Details

### Files Modified/Created

- `tests/orchestration-instrument-reads.test.js` - the guard (new)
- `shared/resources/*.md` (report template, autonomous defaults, prompts, schema, hooks, pause, step docs) and bundled `skills/*/references/` copies - prose fixes
- `skills/nestjs-debug/SKILL.md` - time wording
- `CHANGELOG.md` - entry

### Architecture/Design Decisions

Quoted text is masked once, before the guard parses operators or redirects, so quotes are handled in one place. The guard claims a bounded set and names what it does not see.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Unit Tests:** 4 tests in `tests/orchestration-instrument-reads.test.js`, mutation-proved at each QA fix.
- **Whole suite:** remote `ci:fast` 8461 pass, 0 fail.
- **QA:** 4 gates, 3 fixes; gate 4 PASS 95/100.
- **Code Review:** Step 5c PR review CONCERNS with no open coverage finding. No reviewer decision required on this repository.

---

## Security & Compliance

Security review PASS (no boundary deliverable, no secrets, no unsafe exec). Compliance not applicable.

---

## Known Limitations and Future Work

- T299-QA-7: a single quote glued to the preceding word is not masked.
- CR-2: `&>` and `1>` redirects are not recognised, and a captured `x=$(cmd; echo $?)` is flagged.
- 70 date-only placeholders across 27 files are a named, unguarded shape.
