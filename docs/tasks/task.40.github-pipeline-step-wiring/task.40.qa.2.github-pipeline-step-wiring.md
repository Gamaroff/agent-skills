# QA Report: Task 40 — Re-review (cycle 2)

**Task**: [task.40.github-pipeline-step-wiring.md](./task.40.github-pipeline-step-wiring.md)
**Gate File**: [task.40.gate.2.github-pipeline-step-wiring.yml](./task.40.gate.2.github-pipeline-step-wiring.yml)
**Previous Gate**: [task.40.gate.1.github-pipeline-step-wiring.yml](./task.40.gate.1.github-pipeline-step-wiring.yml) — CONCERNS, 90/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**PR**: [#207](https://github.com/Gamaroff/agent-skills/pull/207) (OPEN)
**Gate Status**: PASS

---

## Executive Summary

Re-review scoped to the qa-fix cycle-1 changes (commit `5159517`, 9 files). The MEDIUM issue is closed, and closed more thoroughly than the gate asked for: rather than adding only the six missing rows, the fix also added a catch-all and explicitly named the four reasons that *cannot* occur at this call site — turning an incomplete table into one that is complete by construction.

Both LOW items were addressed. The guard rescoping was re-verified in both directions on a different file than the one it was developed against, which is the check that actually distinguishes a working guard from a coincidentally-passing one.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Verification |
|---|---|---|---|
| TASK-40-QA1-01 — reason table omits 6 reachable reasons | MEDIUM | **FIXED** | All 13 reachable reasons individually confirmed present; catch-all row added; out-of-scope reasons explicitly named as impossible; exactly one table header (the first patch left a duplicate — caught and removed before commit) |
| LOW-1 — inline-Status guard is file-scoped | LOW | **FIXED** | Rescoped to the fenced block. Re-verified both directions on step-4 (a different file from the one it was developed against): code-block mutation → 1 fail; prose `"Status"` → 0 fail |
| LOW-2 — Priority query lost propagation retry | LOW | **FIXED** | Ordering requirement documented, with the silent-no-op failure mode named |
| LOW-3 — `not-on-board` escalation untested | LOW | **ACCEPTED** | Deliberately not fixed. Every other escalation in `finalise` is a documented branch with no executable assertion; testing only this one would be inconsistent rather than safer |

---

## Verification Detail

### TASK-40-QA1-01 — the fix exceeds the ask

The gate asked for the 6 missing rows *or* a catch-all. The fix delivered both, plus a third thing not requested: an explicit statement that `probe`, `write-failed`, `exists` and `dry-run` cannot occur here because this call passes none of the flags that produce them.

That last part matters more than it looks. Without it, a future reader comparing the table against `gh-stage.js` finds 4 reasons in the CLI and not in the table, and cannot tell whether that is an omission or a deliberate exclusion — which is precisely the ambiguity that produced this finding in the first place. Naming them closes the loop.

The `ambiguous-board` row is the one an operator is most likely to hit, and it is the best-written: it states that a multi-board setup is ordinary rather than an error, and names both config keys that resolve it (`github.projectBoard`, `project_board_number`).

**Checked individually** — all 13 present: `transitioned`, `already`, `stage-disabled`, `would-regress`, `no-option`, `no-options`, `no-status-field`, `ambiguous-board`, `board-unreadable`, `no-repo-context`, `no-credentials`, `not-on-board`, `mutation-failed`, plus `_any other value_`.

### LOW-1 — the guard rescoping is genuinely verified

The cycle-1 guard passed only because step-0 happened to contain no bare `"Status"` literal alongside the Priority mutation it legitimately retains. That is a guard passing by luck, not by construction.

Re-verified on **step-4** rather than step-0 — deliberately a different file from the one the fix was developed against, so the test is not just re-confirming the developer's own setup:

| Injected into `develop-pipeline-step-4-create-pr.md` | Result | Correct? |
|---|---|---|
| `updateProjectV2ItemFieldValue` with `"Status"` inside a ```bash block | 1 fail | ✅ bites |
| Prose sentence containing `` `"Status"` `` | 0 fail | ✅ ignores |
| Baseline (file restored) | 0 fail | ✅ |

Working tree confirmed clean afterwards — no leftover mutation damage.

### LOW-2 — ordering documented rather than retried

The fix documents the dependency instead of adding a retry. That is the right call: `ensureOnBoard` must already have added the item *and* read it back (it could not have set the status otherwise), so a retry here would be dead code guarding a condition that cannot occur in the documented order. Documenting the order — and naming the silent-no-op that results from violating it — protects the actual risk, which is someone reordering the blocks later.

---

## Regression Check

| Area | Result |
|---|---|
| Full test suite | PASS — 1070/1070 |
| Bundle idempotency | PASS — re-running `--all` produces no further change |
| Working tree after mutation testing | PASS — clean |
| Guards 2–5 (unchanged by this cycle) | PASS — all still green |
| Jira path | PASS — untouched; parity tests green |

No regressions.

---

## NFR Assessment

| NFR | Cycle 1 | Cycle 2 | Change |
|---|---|---|---|
| Security | PASS | PASS | — |
| Performance | PASS | PASS | — |
| Reliability | CONCERNS | **PASS** | The escalation path is now specified for every reachable reason, and the catch-all means an unrecognised value is handled as a warning rather than mistaken for success |
| Maintainability | PASS | PASS | Slightly improved — the rescoped guard removes a latent false positive that would have surfaced as a confusing CI failure on an unrelated future edit |

---

## Accepted Deferrals

Recorded so the PASS is not read as "everything was verified live":

1. **F5 — backward move refused, proven live.** Needs a board with a rung above the review column. Board #1 has three columns and `in-review` is disabled, so the scenario cannot be constructed here. The absence of `--allow-regress` is guarded and mutation-tested, and the rank logic is covered by task.39's own suite — but no card was actually refused on a real board.
2. **Full `/develop-task` run against a scratch board with bespoke column names.** No such board exists.

Both remain **unchecked** in the task document §8 rather than ticked.

---

## Observation for future work

Two of the five guards in `transition-protocol-parity.test.mjs` needed rescoping from proximity/file-wide matching to block-scoped matching, and both failures were of the same kind: the guard matched the prose that *documents* the correct behaviour. For guards over documents that mix prose and code, block-scoping looks like the correct default rather than the fix applied after the first false positive. Recorded as a `future` recommendation, not a finding against this task.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Rationale**: Zero outstanding issues. The single MEDIUM is closed more completely than required, both LOW items are addressed, and the guard fix was verified against a file other than the one it was written for. The two deferrals are documented board-topology limitations, recorded honestly and unchecked.

**Deployment Recommendation**: APPROVED
**Conditions**: None

**Next Steps**: `/finalise` — verify Definition of Done and accept.
