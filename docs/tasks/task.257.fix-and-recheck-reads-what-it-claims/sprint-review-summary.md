# Sprint Review Summary - finalise fix-and-recheck reads severity, scope and the named test

**Story/Task ID:** task.257
**Completed Date:** 2026-11-04
**Pull Request:** [#829](https://github.com/Gamaroff/agent-skills/pull/829)

---

## Summary

`/finalise` can now fix one small problem and carry on, instead of stopping the whole run for a person. The check that the fix is proven, the check that it stays in scope, and the severity grade it needs all now read what they claim to read.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A mutation proof counts only when the named test itself went red (not a green neighbour, not a test file, not a TODO or SKIP line).
- [x] A Files Summary is read as pathspecs (exact paths, directory prefixes, globs, `{a,b}`), with traversal, backslash and whitespace paths refused.
- [x] Every DoD agent grades its FAILs with a severity, kept on every merge path; an ungraded FAIL still halts.
- [x] Docs, CHANGELOG and bundled copies updated; the six task mutations recorded in the QA report.

### Key Features Implemented

- **Proof rule**: a red line must start with the test title and end at a boundary.
- **Scope pathspecs**: `pathInScope` is exported and probed.
- **Severity**: a `severity` field and a fail-closed rule in all four DoD prompts.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-fix-and-recheck.mjs` - proof rule, scope pathspecs, path guard
- `shared/resources/finalise-rerun-scope.js` - severity kept through the merge
- `shared/resources/finalise-dod-{ac,docs,compliance,fix-evidence}-prompt.md` - severity field
- `shared/resources/tests/` and `evals/shared/tests/` - tests for each

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** `mutationProof.test` must name a test title, not a test file.

---

## Testing & Quality Assurance

- **Tests:** 187 pass across the five touched suites; CI green on PR #829.
- **QA:** two cycles, CONCERNS 70 then PASS 90.
- **Security:** 25 probes against `pathInScope`, none reproduced.

## Known Limitations and Future Work

Advisories left open in the QA gate: case-insensitive and extra test-file shapes, normalising Files Summary entries, CRLF run logs, the `:digit` boundary for titles containing `/`, merged severity over two failing members, and runner-format fixtures.
