# Task Review Report: Task 255 - security-probe: a cli: fixture setup cannot reach the host gh

**Reviewed:** 2026-11-03
**reviewed_blob:** 280495371898ab8ad8e21d6a6af02f41c35278fd
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development)
**Overall Assessment:** GOOD

## Executive Summary

The task is accurate. Every line anchor in § 3 was read against `shared/resources/security-probe.mjs` and holds (`:1780`, `:1989`, `:2151`, `:2170`, `:2950`, `:3114`, `:3122`, `:3211`). Card preflight and doc-links pass. Four precision gaps were fixed in the document.

**Critical Issues:** 0
**Important Issues:** 2 (fixed)
**Optional Improvements:** 2 (fixed)
**User Clarifications:** 0 (pipeline mode)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

## Findings

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Important | `runCliCase` (`:2868`) receives no `harnessDir`; the plan did not say the call at `:2047` must pass it | Added to § 3 Clarifications |
| 2 | Important | The trip-wire exits 127, so the setup fails and the case records `errored`; the plan did not state that the `needs-fake-gh` decline still wins, nor test it | Added to § 3 and a Phase 3 test |
| 3 | Optional | The setup env must be a copy: `env` is also handed to the entry spawn, and mutating it would change the entry's PATH | Added to § 3 Clarifications |
| 4 | Optional | Two criteria demanded a record without naming where it lives (check 22) | Now name the QA report's Findings / mutation table |

## Checks run

- Technology, paths and line anchors: all resolve (read in the source).
- doc-links.js: 1 link, resolves. Card preflight: 3 blocks resolve.
- Outcome reachability (check 10): the `needs-fake-gh` branch at `:2170` fires when `ghTripped`; extending the `ghTripped` condition to the `cli:` form makes it reachable. Planned phase 2 states it.
- Removed-literal (check 15): the plan removes no literal. Test reach (check 18): `security-probe.test.mjs` already exists and is run.
- Pre-pass subagents (architecture, codebase) were not dispatched; the checks above were done inline, so independent review did not run.

## Implementation Readiness

**Score:** 9/10. Template 9, technical accuracy 10, clarity 9, consistency 9, risk 9.
