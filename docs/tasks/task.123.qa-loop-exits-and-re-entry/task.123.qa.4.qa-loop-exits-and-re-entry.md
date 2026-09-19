# QA Report: Task 123 - The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Gate File**: [task.123.gate.4.qa-loop-exits-and-re-entry.yml](./task.123.gate.4.qa-loop-exits-and-re-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4, scoped to the 18 files changed since gate 3 (cycle 3's fix `d96554cf`). All cycle-3 findings are FIXED and were re-executed (base from the report, never-lower, octal `k`, Action-only write); bugs 9–10 are Closed. No HIGH remains (sequence 1, 1, 0, 0). Four MEDIUMs, all reproduced by QA, cluster in the grant script's **refusal paths** and the re-entry contract: a refused grant leaves a restored lock behind; the declined-grant path is described three different ways, one impossible; two 5c sub-state rows match a loop-limit-via-review entry; and the ownership check refuses the real pipeline's own absolute-vs-relative paths. The engine, hook, routes and the grant's happy path are unchanged and green.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified
- [x] Task document complete; status `ready-for-review`; QA Fix Cycle 3 recorded
- [x] `ci:fast` green on `d96554cf` (3490 node, 8 bash suites)
- [x] No breaking changes · [x] PR #435 OPEN

### Testing Approach
- [x] Automated · [x] Regression (each cycle-3 fix re-executed) · [x] Security (reasoned) · [x] Code Review (Step 3b, scoped) · [x] Runnable prose (4b) · [ ] Manual (future)

### Review Methodology
Direct tools + one read-only Explore reviewer over the diff scoped to files changed since gate 3's `updated:` (18 files, 3127 lines, non-empty). `PRIOR_GATES=3`; `SAFETY_REPROBE=false` (gate 3's security axis `OK reasoned`).

```
Re-review scope: since 2026-09-19T08:27:07Z (default)
```

Step 4b: step doc 1 runnable clean / 18 refused (allow-list); resume contract 2 runnable clean. QA hand-probed the grant script on the bundled copy: base from the report (`QA_CYCLE=5`, budget 7), never-lower refusal (rc 1, lock untouched), `k=010` refused, and reproduced C4-CR-1 (restored lock left after refusal) and C4-CR-4 (absolute vs relative refused).

---

## Re-Review Context

| Cycle 3 finding | Status | Verification |
| --- | --- | --- |
| C3-CR-1 — paired loop-limit write | **FIXED** | "and only that row" present; the Action + `not reached` pair absent; parity forbids it |
| C3-CR-2 — grant base / never-lower | **FIXED** — but see C4-CR-1 | report ahead of disk → base 5, budget 7; existing 7 vs 3+1 → refused, untouched |
| C3-CR-3 — `qa_phase` in the write | FIXED | lock shows `qa_phase: 5a` after a grant |
| C3-CR-4 — octal `k` | FIXED | `010` → rc 1; printed value read from the lock |
| C3-CR-5 — stale snapshot | FIXED — but see C4-CR-4 | other-document snapshot refused; same-document with `./` and `/` noise restored |
| C3-CR-6/7 | FIXED | ASCII-hyphen ordinal; CHANGELOG count gone |

Bugs 9–10: **Closed**.

---

## New Findings This Cycle

- **[medium]** `shared/resources/grant-qa-cycles.sh:151` — never-lower guard after the restore leaves a restored lock (`qa_phase: 5b`, no grant) on refusal (**C4-CR-1**)
- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:233` — declined-grant path: the re-assert cannot run without a lock; three documents, three paths (**C4-CR-2**)
- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:126` — `REQUEST CHANGES` row and the escalation row both match a loop-limit-via-review entry; no precedence (**C4-CR-3**)
- **[medium]** `shared/resources/grant-qa-cycles.sh:127` — absolute `<doc-dir>` vs relative snapshot path refused as another document (**C4-CR-4**)
- **[low]** `develop-pipeline-resume-contract.md:194` — no orchestrator arm for a grant-script exit 1; never-lower message not actionable (**C4-CR-5**, advisory)
- cleanup: preamble "touches PR Review only on…" vs On-continue "never" (**C4-CR-6**); absent `task_or_story_directory` default undocumented, non-integer `qa_max_cycles` swallowed (**C4-CR-7**)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Lock position | PASS | unchanged |
| Phase 2: Routes 2b/2c | PASS | unchanged |
| Phase 3: Re-entry | CONCERNS | happy path correct; refusal paths and the declined-grant wording defective |

**Overall Phase Completion**: 2/3 passed, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Routes 2b / 2c / lock position | PASS | |
| Re-invocation offers the grant, counts on-disk gates, back-fills | CONCERNS | the accepting path works; refusal paths leave state or refuse legitimate input |
| Route 2c cost; fixtures + mutation proofs; set stated once; observations | PASS | |

---

## Breaking Changes Validation
None. **Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (4)
- **C4-CR-1** — [bug 11](./task.123.bug.11.refused-grant-leaves-a-restored-lock.md) · P2
- **C4-CR-2** — [bug 12](./task.123.bug.12.declined-grant-path-claims-a-re-assert-that-cannot-run.md) · P2
- **C4-CR-3** — [bug 13](./task.123.bug.13.substate-table-two-rows-match-a-loop-limit-via-review-entry.md) · P2
- **C4-CR-4** — [bug 14](./task.123.bug.14.snapshot-ownership-check-refuses-absolute-doc-dir.md) · P2
### LOW Severity Issues (1) + cleanups (2)
- C4-CR-5 advisory; C4-CR-6, C4-CR-7 cleanups.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 1 (+2 cleanups)

---

## NFR Assessment
### Performance — PASS
### Reliability — CONCERNS
Refusal paths of the grant script leave state (C4-CR-1) or refuse the pipeline's own inputs (C4-CR-4); the contract's declined path and sub-state precedence are ambiguous (C4-CR-2/3).
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 · `boundary: false`.
### Maintainability — PASS

---

## Code Review
Step 3b — scoped. `reviewed: 9 substantive files of the 3127-line diff …; suite 34/34 + 4 ad-hoc probes; both parity suites 36/36`.

**Correctness bugs (5):** C4-CR-1 [medium/high] → gate; C4-CR-2 [medium/high] → gate; C4-CR-3 [medium/high] → gate; C4-CR-4 [medium/medium, QA-verified] → gate; C4-CR-5 [low/medium] advisory.
**Cleanups (2):** C4-CR-6, C4-CR-7.

`probes_executed: 0`, `boundary: false`.

**Mutation-proof spot check (Step 3c)** — re-run on the head: never-lower guard removed → 1 red (`covered`); paired write restored in the step doc → parity red (`covered`).

---

## Regression Testing
| Area | Result |
| --- | --- |
| `ci:fast` on `d96554cf` | PASS (3490 / 0) |
| `eval:all` (34) on this head (run in 5b cycle 3) | PASS |
| bundle:check, check:generated, lint:shell, format:check | PASS |

---

## Test Artifacts
Files reviewed: the 9 substantive files changed since gate 3. Commands: `npm run ci:fast`; `qa-execute-snippets.mjs` over the two changed prose files; grant script probes (report base, never-lower, `k=010`, refused-after-restore, absolute-vs-relative).

---

## Recommendations
### Immediate Actions
1. C4-CR-1 — guard before restore; remove a restored lock on refusal
2. C4-CR-2 — one declined-grant path; drop the re-assert justification; align SKILL.md
3. C4-CR-3 — precedence above the sub-state table; qualify the `REQUEST CHANGES` row
4. C4-CR-4 — canonicalise both paths
### Short-term
1. C4-CR-5, C4-CR-6, C4-CR-7.

---

## Final Assessment
**Gate Status**: CONCERNS · **Quality Score**: 60/100
**Rationale**: no HIGH; four reproduced MEDIUMs confined to the grant script's refusal paths and the re-entry contract's wording.
**Deployment Recommendation**: CONDITIONAL — C4-CR-1..4 fixed and re-gated.

---

**QA Report**: `task.123.qa.4.qa-loop-exits-and-re-entry.md` · **Gate File**: `task.123.gate.4.qa-loop-exits-and-re-entry.yml`
**Next Steps**: `/qa-fix` on gate 4; QA cycle 5 (the last budgeted cycle) scoped to files changed since gate 4.
