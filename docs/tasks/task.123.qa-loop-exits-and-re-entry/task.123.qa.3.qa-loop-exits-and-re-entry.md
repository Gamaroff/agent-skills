# QA Report: Task 123 - The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Gate File**: [task.123.gate.3.qa-loop-exits-and-re-entry.yml](./task.123.gate.3.qa-loop-exits-and-re-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3, scoped to the 27 files changed since gate 2 (cycle 2's fix commit `18b5328f`). All five cycle-2 findings are FIXED and were re-executed — the grant script restores the lock from a snapshot on the bundled copy, the stale-count guard catches "three" at "six", the escalation writes its Action, the CHANGELOG and the hook sentence read right — and bugs 5–8 are Closed. No HIGH remains (sequence 1, 1, 0). Two MEDIUMs are refinements of cycle 2's fixes: the escalation write blanks a real `REQUEST CHANGES` verdict on one path, and the grant's base disagrees with the contract's negative-count rule and can lower an existing budget. Three LOWs and two cleanups round out the grant script.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document complete; status `ready-for-review`; QA Fix Cycle 2 recorded
- [x] Tests passing (`ci:fast` on `18b5328f`: 3490 node, 8 bash suites)
- [x] Breaking changes: none
- [x] PR #435 → develop, OPEN

### Testing Approach

- [x] Automated Testing · [x] Regression (each cycle-2 fix re-executed) · [x] Security Review (reasoned) · [x] Code Review (Step 3b, scoped) · [x] Runnable-prose (Step 4b) · [ ] Manual (future consumer run)

### Review Methodology

Direct tools + one read-only Explore reviewer over the diff scoped to files changed since gate 2's `updated:` (`git log --since` → 27 files, bundled copies excluded, 3791 lines; non-vacuity: the scoped patch is non-empty). `PRIOR_GATES=2` → no refute directive; `SAFETY_REPROBE=false` (gate 2's security axis `OK reasoned`).

```
Re-review scope: since 2026-09-19T08:08:20Z (default)
```

Step 4b: the five changed prose files — step doc 1 runnable / 18 refused (allow-list) / 1 pre-existing slot, clean; resume contract 2 runnable clean; pause doc no blocks; both SKILL.md fail only on the pre-existing line-48/51 block. The reviewer ran the grant suite (23), set-qa-phase (19), on-stop (27), both parity suites (36), fixture 12 replays (17×2), shellcheck, and 15 hand probes of the grant script; QA independently reproduced C3-CR-1, CR-2, CR-4 and CR-5.

---

## Re-Review Context

| Cycle 2 finding | Status | Verification |
| --- | --- | --- |
| C2-CR-1 — grant's lock absent | **FIXED** | bundled `grant-qa-cycles.sh` run from a temp cwd with no lock + a snapshot → lock restored (halt fields dropped, `qa_max_cycles: 8`), snapshot untouched; `grep 'recreates the lock from the'` → 0 |
| C2-CR-2 — cross-fence `$QA_CYCLE` | **FIXED** | `grep -- '--argjson c "$QA_CYCLE"'` → 0; call sites are one line; parity forbids inline jq |
| C2-CR-3 — self-disabling guard | **FIXED** | `staleRouteCountPatterns("six")` catches "three routes"; "five routes" not caught at five |
| C2-CR-4 — unreachable escalation row | **FIXED** — but see C3-CR-1 | fixture 12 cycle 5 Action = `Escalating — loop limit reached`; step doc states every-path write |
| C2-CR-5 — CHANGELOG `5 + k` | **FIXED** | 0 hits; parity pin covers CHANGELOG |
| C2-CR-6 — hook 5a sentence | FIXED | both `set-qa-phase.sh 5b` / `5c` spelled |

Bugs 5–8: **Closed**.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1366` — the loop-limit write also blanks `**PR Review**`, destroying a real `REQUEST CHANGES` verdict on the loop-limit-via-review path → write Action only (**C3-CR-1**)
- **[medium]** `shared/resources/grant-qa-cycles.sh:74` — base is the highest gate; the contract's negative-count rule resumes from the report count; an existing budget can be lowered (reproduced: 7 → 5) → base = max(gate, report entries); never lower (**C3-CR-2**)
- **[low]** `shared/resources/grant-qa-cycles.sh:91` — restore copies `qa_phase: 5b`; the 5a re-entry is a separate later call → set 5a in the same write (**C3-CR-3**, advisory)
- **[low]** `shared/resources/grant-qa-cycles.sh:115` — leading-zero `k`: octal in shell, decimal in jq (reproduced: `010` → prints 11, writes 13) → reject; print from the lock (**C3-CR-4**)
- **[low]** `shared/resources/grant-qa-cycles.sh:85` — a stale snapshot for another document is restored as this task's lock (reproduced) → compare `task_or_story_directory` (**C3-CR-5**, advisory)
- cleanup: second stale-count regex subsumed by the first (**C3-CR-6**); CHANGELOG says "eight files" for an eleven-file test (**C3-CR-7**)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Lock position | PASS | Verified | unchanged this cycle |
| Phase 2: Routes 2b/2c | PASS | Verified | unchanged this cycle |
| Phase 3: Re-entry | CONCERNS | Verified | the grant now lands (C2-CR-1 closed); two refinements remain (C3-CR-1/2) |

**Overall Phase Completion**: 2/3 passed, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Route 2b / 2c / lock position | PASS | unchanged |
| Re-invocation offers the grant, counts on-disk gates, back-fills | CONCERNS | the grant lands and restores the lock; base disagrees with the negative-count rule (C3-CR-2) |
| Route 2c cost ≤ half a cycle | PASS | |
| Replay fixture + mutation proof per route | PASS | 14 mutants across three cycles |
| Accepting-route set stated once | PASS | guard survives growth (C2-CR-3 closed) |
| Observations close naming the PR | PASS | |

---

## Breaking Changes Validation

None; absent-field defaults re-verified. **Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

- **C3-CR-1** — [bug 9](./task.123.bug.9.loop-limit-write-clobbers-request-changes-verdict.md) · P2
- **C3-CR-2** — [bug 10](./task.123.bug.10.grant-base-disagrees-with-the-contract-negative-count-rule.md) · P2

### LOW Severity Issues (3) + cleanups (2)

- C3-CR-4 (in `top_issues[]`, high confidence): octal `k`. C3-CR-3, C3-CR-5 advisory. C3-CR-6, C3-CR-7 cleanups.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3 (+2 cleanups)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
C3-CR-1 loses a recorded verdict on one escalation path; C3-CR-2 can grant nothing or lower a budget on the negative-count path. Both bounded and reproducible.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 · `boundary: false`. Arguments reach `jq` only through `--argjson`/`--arg`.
### Maintainability — PASS

---

## Code Review

Step 3b — scoped. `reviewed: 14 substantive files of the 3791-line diff …; ran grant suite (23/23), set-qa-phase (19/19), on-stop (27/27), both parity suites (36/36), fixture 12 replays (17/17 ×2), shellcheck clean, plus 15 hand probes of the grant script`.

**Correctness bugs (5):** C3-CR-1 [medium/high] → gate; C3-CR-2 [medium/medium, QA-verified] → gate; C3-CR-3 [low/medium] advisory; C3-CR-4 [low/high] → gate; C3-CR-5 [low/medium] advisory.
**Cleanups (2):** C3-CR-6, C3-CR-7.

`probes_executed: 0`, `boundary: false`.

**Mutation-proof spot check (Step 3c)** — re-run by QA on the head:
- mutation-proven: restore branch disabled in `grant-qa-cycles.sh` → `no lock → restored from snapshot…` (+1) → `covered`
- mutation-proven: `qa_max_cycles = (5 + $k)` in the script → 6 grant rows + lock-fields parity → `covered`

---

## Regression Testing

| Area | Result |
| --- | --- |
| `ci:fast` on `18b5328f` | PASS (3490 / 0) |
| `eval:all` (34) on this head (run in 5b cycle 2) | PASS |
| `bundle:check`, `check:generated`, `lint:shell`, `format:check` | PASS |

---

## Test Artifacts

Files reviewed: the 14 substantive files changed since gate 2. Commands: `npm run ci:fast`; `qa-execute-snippets.mjs` over the five changed prose files; grant script hand probes (restore, `k=010`, stale snapshot, existing budget 7 with gate.3).

---

## Recommendations

### Immediate Actions (Blocking for a clean gate)
1. C3-CR-1 — Action-only write on the loop-limit paths (P2)
2. C3-CR-2 — base = max(highest gate, report entries); never lower an existing budget (P2)
3. C3-CR-4 — reject leading-zero `k`; print from the lock

### Short-term Actions (Non-Blocking)
1. C3-CR-3, C3-CR-5 on the grant script; C3-CR-6, C3-CR-7 cleanups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; two verified MEDIUMs refining cycle 2's fixes. HIGH 1, 1, 0 and MEDIUM 3, 3, 2 — converging.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: C3-CR-1, C3-CR-2, C3-CR-4 fixed and re-gated.

---

**QA Report**: co-located at `task.123.qa.3.qa-loop-exits-and-re-entry.md`
**Gate File**: co-located at `task.123.gate.3.qa-loop-exits-and-re-entry.yml`
**Next Steps**: `/qa-fix` on gate 3; QA cycle 4 scoped to files changed since gate 3.
