# QA Report: Task 157 - Context-pressure trigger: recommend a continuation handoff before the context fills

**Task**: [Link to task document](./task.157.context-pressure-handoff-trigger.md)
**Gate File**: [task.157.gate.5.context-pressure-handoff-trigger.yml](./task.157.gate.5.context-pressure-handoff-trigger.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: PASS

---

## Executive Summary

Cycle 5 re-review after qa-fix cycle 4 (`642c62e5`). Gate 4's three gated findings are fixed and
mutation-proven. The reviewer fuzzed 200,000 `shq` round-trips (all of Unicode, `#`, `$`, backslash,
newline, empty) and ran a differential fuzz against bash 5.3; neither found a failure. It raised one
low, medium-confidence advisory and one test cleanup, neither of which gates. Every NFR passes.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Gate 4 finding | Status | Evidence |
| --- | --- | --- |
| QA4-CR-1 (medium) `#` comments / `$'…'` not tokenized | FIXED | shellWords and hand-written-forms tests; comment and `$'…'` mutations red them |
| QA4-CR-2 (low) commented status line read as a wrap | FIXED | same tests |
| QA4-CR-3 (low) directory `.bak` swallowed the backup | FIXED | `.bak`-not-a-file test; mutation reds it |

Advisory QA4-CR-4 (`unshq` removed) and QA4-CR-5 (POSIX separators, continuation) were also fixed,
each with a mutation-proven test.

---

## New Findings This Cycle

- **[low/medium, advisory]** `shared/resources/context-pressure.mjs:358` — QA5-CR-1: `$'…'` `\xHH`
  and octal escapes decode as code points rather than UTF-8 bytes, and `\u` / `\U` / `\c` pass
  through, so a hand-written wrap using them would be restored with the wrong text on uninstall. Not
  a form the installer writes; recorded as a future recommendation.
- **[cleanup]** `shared/resources/tests/context-pressure-install.test.mjs:576` — QA5-CR-2: the `$'…'`
  hook case passes without the decoding fix.

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 4 (head e5adecc7dcf8; 3 non-doc files) — default.
One read-only Explore subagent; `duration_ms` 784922 (it ran fuzzers). `SAFETY_REPROBE=false`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Engine `record` / `check` | PASS | |
| Phase 2: Status line wrapper | PASS | |
| Phase 3: User-level installer | PASS | outcomes consolidated; identity is a shell-word parse |
| Phase 4: Docs, bundle, changelog | PASS | `bundle:check` 0 problems |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Status |
| --- | --- |
| Soft once on entering SOFT; firm on FIRM, repeat every REPEAT | PASS |
| Nothing for stale / missing / corrupt; exit 0 on every input | PASS |
| Wrapper stdout and exit code equal the original's | PASS |
| Install then uninstall equal as parsed JSON; second install changes nothing | PASS (residual: an explicitly empty container present before install is dropped — equivalent settings, documented and tested) |
| Invalid `session_id` never writes outside the state dir | PASS (probe: engages, 20) |
| `check` p95 < 150 ms; wrapper overhead < 50 ms | PASS (113 ms; +16–21 ms) |
| `npm test` with new suites; `bundle:check`; `lint-shell.sh` | PASS |
| Guards mutation-proven | PASS |

---

## Breaking Changes Validation

None. **PASS**

---

## NFR Assessment

### Performance — PASS
No hot-path change since the cycle-1 measurement.

### Reliability — PASS
Every form the installer writes round-trips (200k-case fuzz); hand-written forms parse as POSIX sh
reads them or are refused as needs-manual — never guessed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20
- `validSessionId` re-probed (`task.157.qa.5.security.run.json`): engages, 0 reproduced.

### Maintainability — PASS
51 tests; every QA fix across five cycles carries a test its mutation reds.

---

## Code Review

**Boundary rule**: `validSessionId` probed (`probes_executed: 20`); `shellWords` `boundary: internal`
(cycle 4 reasoning).

**Correctness bugs (1, advisory):** QA5-CR-1 [low/medium].
**Cleanups (1):** QA5-CR-2.

Nothing promoted to `top_issues` — the one bug is medium confidence.

**Mutation proofs (cycle 4 fixes):**
- mutation-proven: `#` comment branch → shellWords and hand-written-forms tests → covered
- mutation-proven: `$'…'` branch → shellWords test → covered
- mutation-proven: POSIX separators → shellWords test → covered
- mutation-proven: line continuation → shellWords test → covered
- mutation-proven: `.bak` regular-file check → `.bak`-not-a-file test → covered

**Platform variance**: `TMPDIR=/tmp` → 51/51.

---

## Regression Testing

`npm run ci:fast` on the cycle-4 tree: 4988/4989 pass, 1 skipped, 0 fail. **PASS**

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no gating finding; every NFR PASS; every success criterion met.
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

**Next Steps**: 5c PR conformance review (`/review-pr`).
