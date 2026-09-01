# QA Report: Task 75 — Cycle 2 (Refute Pass)

**Task**: [task.75.quality-gate-matches-ci.md](./task.75.quality-gate-matches-ci.md)
**Gate File**: [task.75.gate.2.quality-gate-matches-ci.yml](./task.75.gate.2.quality-gate-matches-ci.yml)
**Review Date**: 2026-09-01
**PR**: [#291](https://github.com/Gamaroff/agent-skills/pull/291)
**Gate Status**: CONCERNS → fixes applied, cycle 3 to verify

---

## Re-Review Context

| Cycle-1 finding | Status |
| --- | --- |
| **TASK-75-001** — fast-gate block numbered `0a.` but placed before step `0.` | **FIXED** — sequence now `0 → 0a → 1`, rationale stated inline |
| LOW — `workflowScripts()` dropped unknown scripts | **FIXED** — `workflowInvocations()` split out, assertion added, mutation-proved (M8) |

Cycle 2 ran as a **full refute pass over the whole branch diff**, not a narrowed re-read of cycle 1's fixes — per the qa-task contract, because the files changed since the last gate are exactly cycle 1's own repairs, and a narrowed pass never re-reads the original change with what cycle 1 learned.

---

## What the refute pass probed

The directive's four transitions, applied to a change set that is scripts + prose + a test:

| Probe | Result |
| --- | --- |
| **Tiering holds at runtime** — does `ci:fast` actually exclude the slow tier? | PASS — expands to `format:check + test`, zero occurrences of `eval:all` |
| **Error path** — does a red fast gate strand the cycle? | **FOUND TASK-75-003** — the retry claimed a bound that does not govern it |
| **Scope drift** — does the parity test read what it says it reads? | **FOUND TASK-75-002** — documented as the `test` job, actually scanned the whole file |
| **Combination** — do the two cycle-1 fixes interact badly? | PASS — independent; one is prose ordering, one is test scoping |

---

## Issues Found

### MEDIUM (1 new)

**TASK-75-002 — the parity test's real scope differs from its documented scope**

- **Location**: `evals/shared/tests/ci-gate-parity.test.mjs`
- **Observation**: both `workflowScripts()` and `workflowInvocations()` documented themselves as covering "the workflow's `test` job", but scanned every `run:` line in `test.yml`. The file defines one job today, so the two coincided *by accident*.
- **Impact**: this is the classic correct-in-steady-state, wrong-on-transition defect. Add a second job — a lint lane, a coverage lane, a matrix build — invoking any npm script, and the parity assertion demands the `ci` composite contain that script too. The test then fails on a workflow CI itself is perfectly happy with, **inverting its entire purpose**: it exists to predict CI, so it must never block a merge CI would pass.
- **Fix applied**: `jobBlock()` extracts the named job's block; scanning is scoped to it. New test asserts the job resolves, so a rename fails loudly rather than producing an empty scan that passes vacuously.

### LOW (1 new)

**TASK-75-003 — step 0a claimed a bound it does not have**

- **Location**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- **Observation**: the block said a red fast gate should "feed the finding back into this cycle's fixes, and re-run", asserting "The MAX_ITER cap still bounds the loop". MAX_ITER bounds QA *cycles*; this retry happens **inside** one cycle and increments no counter, so the named bound never applies to it.
- **Impact**: low in practice — an agent surfaces an unfixable gate — but a stated guarantee that is not real is worse than an unstated one, and this repo has been bitten before by guards that claimed more than they delivered.
- **Fix applied**: replaced with an explicit 2-attempt budget, after which the cycle commits nothing and ends so the next review writes a gate — which *is* what reaches the convergence check and MAX_ITER. The old false claim is named in the text so it is not reintroduced.

---

## Mutation Proofs (cycle 2)

| # | Mutation | Expected | Result |
| --- | --- | --- | --- |
| M8 | Workflow invokes `npm run eval-all-typo` | RED | 🔴 |
| M9 | Second job invoking an unrelated npm script | **GREEN** (CI is happy, so the test must be) | 🟢 |
| M10 | `test` job renamed → scan would go empty | RED (must not pass vacuously) | 🔴 |
| M9-pre | M9 applied with the scoping fix **reverted** | RED (proves the fix changes behaviour) | 🔴 — `validate:all` wrongly demanded of the composite |

M9-pre is the one that matters: it demonstrates the fix removes a real false failure rather than restating existing behaviour.

---

## NFR Assessment

- **Security** — PASS (unchanged; no security surface)
- **Performance** — PASS (tiering verified at runtime this cycle)
- **Reliability** — CONCERNS → addressed by TASK-75-003 fix
- **Maintainability** — CONCERNS → addressed by TASK-75-002 fix

---

## Carried Forward (out of scope, unchanged)

`qa-execute-snippets.mjs` silently no-ops through the symlinked path its own documentation prescribes (exit 0, zero output). Untouched by task 75; `select-next.mjs` already carries the exact fix with a comment describing the defect. Warrants a general bug report — deliberately not folded into this PR.

---

## Suite reliability — a finding this task makes more urgent

`shared/resources/tests/access-config-parity.test.mjs` has now failed **2 of 3** full runs in this
session, every time with the same signature: the JS tier shells out to `resolve-platform.sh` via
`spawnSync`, that call times out under load, and the reader fail-closes to `manual` while the shell
tier reads the real value — so the parity assertion sees `shell=approve js=manual` and goes red.

In isolation on an idle machine it is **32/32 with zero timeouts**, twice. It is a flake, not a
regression, and nothing in task 75 touches access-config resolution.

**But task 75 is why it now matters.** This suite previously ran at `npm test`; from this task on it
runs inside `ci:fast` at every develop-loop iteration and every qa-fix cycle, *and* inside `ci` at
every merge gate. A test that fails ~2-in-3 under load, promoted to a mandatory pre-merge gate, is
how a team learns to re-run the gate until it passes — which is exactly the "gate people route
around" failure this task's own prose warns about.

Recorded here rather than fixed: the fix is to give that `spawnSync` a realistic timeout (or drop the
subprocess entirely), which is a change to a file outside this task's scope. **Recommend a follow-up
task.**

---

**Next Steps**: cycle 3 verifies TASK-75-002 and TASK-75-003.
