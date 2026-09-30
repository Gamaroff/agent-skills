# QA Report: Task 135 - Gate scoping from a recorded head, not a typed timestamp — cycle 4 (safety re-probe)

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Gate File**: [task.135.gate.4.gate-scoping-from-recorded-head.yml](./task.135.gate.4.gate-scoping-from-recorded-head.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 at head `bbd7d2ba`. Cycle 3's five fixes hold. A fresh safety re-probe of the whole branch — run against the real repository under `/bin/bash` 3.2, bash 5.3 and zsh — found no HIGH and nothing at high confidence. Two advisory findings remain: the Phase 0 trigger trusts a malformed `head:` (for example a hand-typed `HEAD`), and a changed file whose name begins with `:` would be read as pathspec magic. Neither is promoted; both are carried to `recommendations.future`. The gate hands to 5c.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — 5c PR review

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (118/118 on the three suites; ci:fast 4690/4692, the one failure the load-sensitive test, 13/13 alone)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#531)

### Review Methodology

Cycle 4. `SAFETY_REPROBE=true` by clause 3 (gate 3 FAIL; the Success Criteria contain "never"); clause 1 did not fire (gate 3 security `CONCERNS reasoned`). Whole branch (1853 lines, generated copies and `docs/tasks/*` excluded) reviewed by a fresh Explore subagent with the SAFETY RE-PROBE directive and the repository's input/computed-value convention stated; known advisories and the pre-existing `mktemp` defect excluded from its brief.

```
Re-review scope: unscoped (prior gate FAIL with a "never" success criterion — clause 3)
```

---

## Re-Review Context

| Cycle-3 finding | Status | Evidence |
| --- | --- | --- |
| CR3-1 unchecked work-item path → `SAFETY_REPROBE=false` | FIXED | J1, J3 (both skills, bash + zsh); M17 red |
| CR3-2 repo-root task dir | FIXED | J2; M18 red |
| CR3-3 Step 3b unchecked dir | FIXED | J4 executes the whole fence; M19 red |
| CR3-5 zone-less `updated:` | FIXED | zone-less fixtures; M21 red |
| CR3-6 C-quoted paths | FIXED | K (`skills/é.sh`); M20 red |

---

## New Findings This Cycle

Searched unscoped (clause 3): full `origin/develop...HEAD` diff, 14 files. The reviewer ran the trigger and the scope block against the real repository under three shells and both new test files (60/60).

- **[medium, advisory — medium confidence]** `skills/qa-task/SKILL.md:213` — the trigger passes `head:` to `git rev-list` unchecked; `head: HEAD` yields `CODE_MOVED=0` forever (CR4-1). Requires a hand-typed head; the write block binds it from `git rev-parse`.
- **[low, advisory]** `shared/resources/qa-re-review-scope.md:257` — `FILES` entries are pathspecs; a name with a leading `:` is magic (CR4-2).

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Gate carries schema 2, a 40-hex head, a clock-written updated | PASS | gates 1–4 |
| Cycle N+1 file list from `git diff --name-only <head>..HEAD`, whatever `updated:` says | PASS | tests B, K; dogfood in cycle 3 (30 files from gate 2's head) |
| Trigger re-reviews after a commit a future-dated gate would hide | PASS | F1, F4, F6, F7, F8 |
| Schema-1 prior gate → unscoped with the reason, never `--since` | PASS | test C |
| Freshness test green; mutation proofs; no `--since=` in scope paths | PASS | 21 mutations across cycles 1–3; criterion 3 amended in cycle 2 (rewrite-proof rules) |
| CHANGELOG names schema 2 as Breaking | PASS | |

---

## Breaking Changes Validation

`schema: 2` — documented, migration path given, schema-1 gates stay valid (replay fixtures green). PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (advisory), LOW: 1 (advisory). No bug reports — nothing promoted. Bugs 9–13 closed.

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS
CR4-1 (advisory): a malformed `head:` defeats the trigger. Fails closed only for a well-formed head.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` — no function taking external input; the reviewer's input probes were read-only. The safety carve-out's three guards (bound `SAFETY_REPROBE`, validated inputs, step-5 binding) hold.

### Maintainability — PASS

---

## Code Review

Fresh Explore reviewer, SAFETY RE-PROBE directive. `code_review_blocking=true`: nothing promoted (no finding at high confidence).

**Correctness bugs (2):**
- [medium/medium] `skills/qa-task/SKILL.md:213` — trigger trusts a malformed `head:` → validate before counting (CR4-1)
- [low/medium] `shared/resources/qa-re-review-scope.md:257` — pathspec magic in `FILES` → `--literal-pathspecs` (CR4-2)

**Cleanups (0).**

---

## Regression Testing

| Area | Result |
| --- | --- |
| three suites | 118/118 |
| ci:fast at bbd7d2ba | 4690/4692 (load-sensitive test only; 13/13 alone) |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: gate rule 4 — reliability CONCERNS on an advisory finding; `top_issues[]` is empty.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — 5c PR review

---

**QA Report**: co-located at `task.135.qa.4.gate-scoping-from-recorded-head.md`
**Gate File**: co-located at `task.135.gate.4.gate-scoping-from-recorded-head.yml`
**Next Steps**: 5c `/review-pr`; CR4-1 and CR4-2 in `recommendations.future`.
