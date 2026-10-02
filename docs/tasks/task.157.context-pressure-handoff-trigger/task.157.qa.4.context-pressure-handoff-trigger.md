# QA Report: Task 157 - Context-pressure trigger: recommend a continuation handoff before the context fills

**Task**: [Link to task document](./task.157.context-pressure-handoff-trigger.md)
**Gate File**: [task.157.gate.4.context-pressure-handoff-trigger.yml](./task.157.gate.4.context-pressure-handoff-trigger.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 re-review after qa-fix cycle 3 (`e5adecc7`), which replaced the identity regexes with a
shell-word parse. The reviewer probed the round trip for every awkward string it could construct —
empty, newline, tab, CR, NBSP, U+2028, non-ASCII, backslash, apostrophe, `--`, `$(x)` — and all held.
The gated findings that remain are **hand-written** forms the tokenizer does not model: a `#` comment
or a bash `$'…'` string containing an apostrophe (medium), and a `.bak` path that is a directory
(low). Gate stays CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — TASK-157-QA4-CR-1 fixed

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| --- | --- | --- |
| QA3-CR-1 (medium) apostrophe wrapper path | FIXED | pure and real-installer round-trip tests; mutation reds them |
| QA3-CR-3 (low) .bak removed before replacement | FIXED | cp-shim test; mutation reds it (the first version of the test was vacuous and was rewritten) |

---

## New Findings This Cycle

- **[medium]** `shared/resources/context-pressure.mjs:376` — QA4-CR-1: `#` comments and `$'…'` strings
  are not modelled, so `node /x/context-pressure.mjs check # don't remove` reads as not ours.
- **[low]** `shared/resources/context-pressure.mjs:425` — QA4-CR-2: a status line with an apostrophe
  in a comment that mentions the wrapper name is reported as an unparseable wrap.
- **[low]** `shared/resources/context-pressure-install.sh:122` — QA4-CR-3: a `.bak` that is a
  directory swallows the temp backup and the installer reports success.
- Advisory: QA4-CR-4 (`unshq` is test-only now), QA4-CR-5 (Unicode whitespace and backslash-newline).

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 3 (head 6c051d54a3f2; 3 non-doc files) — default. One
read-only Explore subagent; `duration_ms` 120695. `SAFETY_REPROBE=false`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1–2 | PASS | unchanged |
| Phase 3: Installer | CONCERNS | QA4-CR-1, CR-2, CR-3 |
| Phase 4 | PASS | `bundle:check` 0 problems |

---

## NFR Assessment

### Performance — PASS
No hot-path change.

### Reliability — PASS
Every form the installer writes round-trips; the open findings are hand-written edge forms.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20
- `validSessionId` re-probed (`task.157.qa.4.security.run.json`): engages, 0 reproduced.

### Maintainability — PASS
QA4-CR-4, QA4-CR-5 are cleanups.

---

## Code Review

**Boundary rule**: `validSessionId` probed (`probes_executed: 20`). `shellWords` — `boundary: internal`:
a tokenizer whose inputs are settings.json command strings, mostly written by this installer; no
corpus sink models a shell command line; covered by round-trip and identity-pair tests.

**Correctness bugs (3, gated):** QA4-CR-1 [medium/high], QA4-CR-2 [low/high], QA4-CR-3 [low/high].
**Cleanups (2):** QA4-CR-4, QA4-CR-5.

**Mutation proofs (cycle 3 fixes):**
- mutation-proven: backslash escape joining shq's apostrophe → shellWords round-trip, apostrophe-path and three installer tests → covered
- mutation-proven: SHELLS set → "identity pairs…" → covered
- mutation-proven: backslash separator in basename → "identity pairs…" → covered
- mutation-proven: .bak temp + mv → "a failed .bak copy leaves the previous .bak intact" → covered

**Platform variance**: `TMPDIR=/tmp` → 48/48.

---

## Regression Testing

`npm run ci:fast`: 4985/4988; the two failures are the pre-existing LOAD-SENSITIVE file budgets
(identical on `origin/develop`, shown in cycle 2). **PASS**

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — QA4-CR-1 fixed
**Next Steps**: `/qa-fix` cycle 4 (budget: cycle 4 of 5).
