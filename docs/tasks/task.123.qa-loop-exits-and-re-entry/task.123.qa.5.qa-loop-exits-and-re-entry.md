# QA Report: Task 123 - The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Gate File**: [task.123.gate.5.qa-loop-exits-and-re-entry.yml](./task.123.gate.5.qa-loop-exits-and-re-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: PASS

---

## Executive Summary

Cycle 5 — the last budgeted cycle — scoped to the 16 files changed since gate 4 (cycle 4's fix `0610f64a`). All cycle-4 findings are FIXED and were re-executed; bugs 11–14 are Closed, making 14 bugs closed across five cycles. No HIGH and no MEDIUM remain: the sequence is HIGH 1, 1, 0, 0, 0 and MEDIUM 3, 3, 2, 4, 0 — the loop converged. Four LOW findings ride on this PASS (gate rule 5), all in one script's refusal-message wording and two path edge cases; none changes what the script writes. The reviewer rated the first of them medium; QA rates it LOW and records why below.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified
- [x] Task document complete; status `ready-for-review`; QA Fix Cycle 4 recorded
- [x] `ci:fast` green on `0610f64a` (3490 node, 8 bash suites)
- [x] No breaking changes · [x] PR #435 OPEN

### Testing Approach
- [x] Automated · [x] Regression (each cycle-4 fix re-executed) · [x] Security (reasoned) · [x] Code Review (Step 3b, scoped) · [x] Runnable prose (4b) · [ ] Manual (future consumer run)

### Review Methodology
Direct tools + one read-only Explore reviewer over the diff scoped to files changed since gate 4's `updated:` (16 files, 2845 lines, non-empty); the reviewer read `grant-qa-cycles.sh` top to bottom as one script and ran 12 probes on bash 3.2 and 5.3. `PRIOR_GATES=4`; `SAFETY_REPROBE=false` (gate 4's security axis `OK reasoned`).

```
Re-review scope: since 2026-09-19T08:43:53Z (default)
```

Step 4b: step doc 1 runnable clean / 18 refused (allow-list); resume contract 2 runnable clean. QA re-executed on the bundled copy: a never-lower refusal from a snapshot leaves no lock; a relative snapshot dir vs an absolute doc-dir restores; and reproduced C5-CR-1 (message clause) and C5-CR-3 (`./` under bash 5.3.9); C5-CR-4 did not trigger with `CDPATH=/tmp` in QA's probe and is kept as the reviewer reported it.

---

## Re-Review Context

| Cycle 4 finding | Status | Verification |
| --- | --- | --- |
| C4-CR-1 — refused grant leaves a restored lock | **FIXED** | snapshot budget 9, base 6, k=2 → exit 1, no lock on disk, message names `k must be at least 4` |
| C4-CR-2 — declined-grant path | **FIXED** | one statement at step 4 ("does not re-enter the loop at all … no lock is restored, no cycle runs"); SKILL.md points at it |
| C4-CR-3 — sub-state precedence | **FIXED** | "Precedence: an Action that begins Escalating — wins" present; `REQUEST CHANGES` row qualified; parity pins both |
| C4-CR-4 — absolute vs relative | **FIXED** — but see C5-CR-3/4 | relative snapshot dir vs absolute doc-dir restored |
| C4-CR-5/6/7 | FIXED | refusal names the accepted k; preamble says "never touches"; absent field accepted; non-integer budget warned |

Bugs 11–14: **Closed**.

---

## New Findings This Cycle

- **[low]** `grant-qa-cycles.sh:138` — on the no-lock path the refusal's "no grant is needed to run cycles up to EXISTING" is false (nothing restores the lock); the same line's "k must be at least N" is the correct remedy. **Reviewer: medium. QA: LOW** — a wrong clause in a diagnostic whose behaviour is correct (refuses, writes nothing) and whose remedy is adjacent; no state, no control flow. (**C5-CR-1**)
- **[low]** `grant-qa-cycles.sh:132` — the never-lower guard reads a foreign snapshot's budget before the ownership check, so the wrong diagnosis is printed (**C5-CR-2**)
- **[low]** `grant-qa-cycles.sh:164` — platform-variance: `./` strips to the empty string; `cd ""` fails on bash 5 (reproduced 5.3.9) and succeeds on 3.2 (**C5-CR-3**)
- **[low]** `grant-qa-cycles.sh:165` — a bare `cd` in a command substitution with an exported `CDPATH` prints the directory to stdout (**C5-CR-4**)
- cleanups: "smallest accepted k" is off by one in the header and a test label (**C5-CR-5**); the post-restore object check exits without `undo_restore` — unreachable today (**C5-CR-6**); "the halt message's own three options" is now four (**C5-CR-7**)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Lock position | PASS | unchanged since cycle 2 |
| Phase 2: Routes 2b/2c | PASS | unchanged since cycle 2 |
| Phase 3: Re-entry | PASS | the grant script's write paths are correct and mutation-proven on every probed shape; residue is diagnostics and two edge cases |

**Overall Phase Completion**: 3/3 passed

---

## Success Criteria Verification

| Criterion | Status |
| --- | --- |
| Routes 2b / 2c / lock position | PASS |
| Re-invocation offers the grant, counts on-disk gates, back-fills | PASS |
| Route 2c cost ≤ half a cycle | PASS |
| Every new route: replay fixture + mutation proof | PASS (17 mutants recorded across five cycles) |
| Accepting-route set stated once | PASS |
| Observations #72, #77, #95, #100, #112 close naming the PR | PASS |

---

## Breaking Changes Validation
None. **Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0) · ### MEDIUM Severity Issues (0)
### LOW Severity Issues (4) + cleanups (3)
C5-CR-1..4 in `top_issues[]` (high-confidence bugs under `code_review_blocking`); C5-CR-5/6/7 cleanups in `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4 (+3 cleanups)

---

## NFR Assessment
### Performance — PASS
### Reliability — PASS
A refused grant writes nothing (mutation-proven); the restore, the base and the budget arithmetic hold on every probed shape.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 · `boundary: false`. `CDPATH` influences a path comparison, not a shell string.
### Maintainability — PASS

---

## Code Review
Step 3b — scoped. `reviewed: full diff (16 files, 2845 lines); grant-qa-cycles.sh read top-to-bottom (207 lines) and exercised with 12 ad-hoc probes on bash 3.2 and 5.3; grant suite 41/41, pr-review-loop-parity 31/31 and 9 other parity suites green; resume contract re-entry steps 1–4, HALT messages and both SKILL.md cross-read`.

**Correctness bugs (4):** C5-CR-1 [reviewer medium/high → QA low] → gate; C5-CR-2 [low/high] → gate; C5-CR-3 [low/high] → gate; C5-CR-4 [low/high] → gate.
**Cleanups (3):** C5-CR-5, C5-CR-6, C5-CR-7.

`probes_executed: 0`, `boundary: false`.

**Mutation-proof spot check (Step 3c)** — re-run on the head: never-lower guard disabled → 2 red (`covered`); string-compare `canon()` → 2 red (`covered`).

---

## Regression Testing
| Area | Result |
| --- | --- |
| `ci:fast` on `0610f64a` | PASS (3490 / 0) |
| `eval:all` (34) on this head (run in 5b cycle 4) | PASS |
| bundle:check, check:generated, lint:shell, format:check | PASS |

---

## Test Artifacts
Files reviewed: the 7 substantive files changed since gate 4. Commands: `npm run ci:fast`; `qa-execute-snippets.mjs` over the two changed prose files; grant script probes (refusal from snapshot, relative-vs-absolute, `./` doc-dir, `CDPATH`).

---

## Recommendations
### Immediate Actions (Blocking)
None.
### Short-term Actions (Non-Blocking)
1. C5-CR-1..4 on `grant-qa-cycles.sh` (all one-line changes); C5-CR-5..7 wording.

---

## Final Assessment
**Gate Status**: PASS · **Quality Score**: 100/100 (gate formula; four LOWs carried)
**Rationale**: no HIGH, no MEDIUM; the residue is message wording and two path edge cases in one script, with correct behaviour on every probed path. HIGH 1, 1, 0, 0, 0.
**Deployment Recommendation**: APPROVED

---

**QA Report**: `task.123.qa.5.qa-loop-exits-and-re-entry.md` · **Gate File**: `task.123.gate.5.qa-loop-exits-and-re-entry.yml`
**Next Steps**: the orchestrator reads this gate per the Outcome branching — a `PASS` with open LOW entries after two HIGH-0 gates is route 2b's shape.
