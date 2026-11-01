# QA Report: Task 249 - /finalise grades every kind of criterion fairly

**Task**: [task.249.finalise-grades-every-criterion-kind.md](./task.249.finalise-grades-every-criterion-kind.md)
**Gate File**: [task.249.gate.4.finalise-grades-every-criterion-kind.yml](./task.249.gate.4.finalise-grades-every-criterion-kind.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: PASS

---

## Re-Review Context

Previous gate: [task.249.gate.3](./task.249.gate.3.finalise-grades-every-criterion-kind.yml), FAIL 60/100. This cycle is scoped to the cycle 3 fix, `fdb1914b..1ed99a9b`: 3 files, excluding the QA evidence.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T249-QA-7 (high): a bug run grades another item's stale merged result | ✅ FIXED | The AC record gates the block, and the merged file's `record.document` and `record.dod_n` must match this run. Six fence tests. Mutations: dropping the ownership check → 3 red; dropping the record-first skip and the dod_n check → 3 red |
| T249-QA-8: no bug-mode STEM | ✅ FIXED | The placeholder matches the sibling blocks. The bug-run test runs as `task.67.bug.3` |
| T249-QA-9: the spec_ref re-dispatch skips item 2's runner | ✅ FIXED | Item 3a sends the corrected plan through the runner, then re-applies 3a. Prose only |

---

## Executive Summary

Every cycle 3 finding is fixed. The scoped review returned 2 findings, both verified and rated low. **Gate: PASS (95/100).**

---

## Testing Scope

- `npm run ci:fast` at the fix tree: 7039 tests, 1 fail. The failure was the artifact link corpus: this report's predecessor linked to a probe record that was not staged yet. Once it was staged, `doc-links.test.mjs` passed 31/31.
- `npm run bundle:check`: 0 problems.
- CI on `1ed99a9b`: link-check, secret-scan and shellcheck pass. `test` and `validate` were pending at the read.
- One read-only Explore reviewer over the 222-line fix diff. It returned 2 findings in 131 s, and both were verified in-line.
- `criteria-drift.js`: clean.
- `ciResolution` probe: 13 executed, 0 reproduced, 0 escaped.

---

## Issues Found

### HIGH (0) · MEDIUM (0)

### LOW (1)

**T249-QA-10.** With no AC record, action 2a skips without looking at the merged file. Two states therefore print the same line:
- Step 3c never merged in this run.
- This run's merged result is present, but its record is not where DOC_DIR points.

The second state needs one of two things to happen:
- a wrong but existing DOC_DIR substitution, or
- re-running action 2a alone after the record HALT, against that HALT's own recovery text.

It fails safe: AC_OVERALL stays at Step 3c's not-PASS fold, and the printed line names the missing record. This is the same class of finding as cycle 1's CR-3, and it gets the same rating. It is recorded as a follow-up.

**Future (low/low): CR-2, platform variance.** `${MERGED_DOC##*/}` splits only on `/`. These blocks run under bash with POSIX paths, so a backslash document path does not arise today.

---

## NFR Assessment

| NFR | Result |
| --- | --- |
| Performance | PASS |
| Reliability | PASS |
| Security | PASS, measured. Record: [task.249.qa.4.security.run.json](./task.249.qa.4.security.run.json) |
| Maintainability | PASS |

---

## Recommendations

Exit the QA loop and run the 5c PR review. T249-QA-10 and CR-2 are follow-ups.
