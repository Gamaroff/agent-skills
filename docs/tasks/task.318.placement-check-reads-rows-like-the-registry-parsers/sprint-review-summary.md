# Sprint Review Summary - Placement check reads rows like the registry parsers

**Story/Task ID:** task.318
**Completed Date:** 2026-11-22
**Pull Request:** [#929](https://github.com/Gamaroff/agent-skills/pull/929)

---

## Summary

The task-registry placement test now reads rows the way the registry parsers do: it trims each line and skips fenced blocks. An indented stranded row is now caught, and a sample table inside a fence no longer fails the suite.

---

## What Was Delivered

- [x] An indented row below `## Notes` is reported stranded.
- [x] A sample row inside a fenced block (backtick or tilde) is not reported, and a fenced table cannot become the header.
- [x] The drift test passes on the committed registry (13/13).

### Files Modified

- `evals/shared/tests/task-registry-drift.test.mjs` - `placementOf` trims and skips fences; new test with four cases compared against `parseRegistry`
- `CHANGELOG.md` - one `[Unreleased]` line citing task 318

---

## Testing & Quality Assurance

- **Tests:** 4 new cases, red on the old helper, mutation-proved (no trim turns only `indented` red; no fence skip turns the three fenced cases red).
- **QA:** gate 1 CONCERNS 90 (CHANGELOG line missing, fixed), gate 2 PASS 100.
- **PR review (5c):** APPROVE.

## Impact

Test-only. No consumer reads `placementOf`, and the registry, selector and `registry-tick.js` are unchanged.

## Known Limitations

`placementOf` and `parseRegistry` remain two readers of one grammar. Sharing one parser was out of scope and stays a future option if they drift again.
