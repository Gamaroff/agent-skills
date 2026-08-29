---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-08-29'
related: 'none — cross-cutting (no single owner)'
description: '`npm test` runs `node --test` with no concurrency bound, so spawn-heavy suites inflate past their per-test timeouts and the suite fails for environmental reasons'
---

**Bug ID**: bug.2.unbounded-test-concurrency
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-08-29
**Assigned To**: _unassigned_
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `npm test` invokes `node --test` over ~21 globs with **no `--test-concurrency` bound**.
More than ten of those suites spawn child processes per assertion, so the effective process count is
(test-file concurrency × children per file). Under that pressure, individual tests inflate past their
per-test timeouts and fail for reasons unrelated to the code under test.

**Expected Behavior**: `npm test` on a clean tree gives the same verdict every run. A red suite means
the code is wrong.

**Actual Behavior**: The suite intermittently fails on spawn-heavy tests — most often in
`shared/resources/tests/jira-interception.test.mjs` — while the same tests pass in isolation and in
CI. The failure is a timeout, not an assertion.

**Impact**: This is a defect in the **gate**, not in shipped behaviour, and that is what makes it
expensive. It has already produced two merges over a red local suite "on operator decision"
(task.62, task.63 — both recorded in the roadmap Change Log). A gate that goes red for environmental
reasons teaches everyone to merge over red, which is precisely the habit that lets a *real* red
through. It also costs re-diagnosis: the root cause has now been worked out independently at least
three times.

---

## Reproduction Steps

**Environment**: macOS (Darwin 25.5.0), 16 CPUs, Node v24.13.1, `node --test` with default concurrency.

**Steps to Reproduce**:

1. Check out a clean `develop`.
2. Run `npm test`.
3. Observe an intermittent timeout failure in a spawn-heavy suite (historically `jira-interception.test.mjs`).
4. Re-run the same file alone — `node --test shared/resources/tests/jira-interception.test.mjs` — and observe it passes.

**A sharper reproduction** (from task.63): add two *filler* test files containing ~30 trivial
assertions to a glob already covered by `npm test`, then run the suite. The added files contain no
task code; they add only process pressure. That run failed **five** tests.

**Frequency**: Sometimes — load-dependent
**Reproducible**: Intermittent

---

## Evidence

### Measured margin compression (this investigation, 2026-08-29)

| Condition | Wall clock for `jira-interception.test.mjs` | Result |
| --- | --- | --- |
| Alone, idle machine | **5.42 s** | 48/48 pass |
| Alone, under process-spawn contention | **19.65 s** | 48/48 pass |
| Alone, under 48 pure-CPU busy workers | **15.57 s** | 48/48 pass |

A **2.9–3.6× inflation**, against a file whose individual tests carry **20 s** timeouts. The margin
is effectively gone; only the ordering of the day decides whether it trips.

**Note on what did *not* reproduce.** Pure CPU saturation (48 busy workers on 16 cores) inflated the
run *less* than a messier run that was spawning processes. The aggravator is therefore **process-spawn
contention specifically**, not raw CPU — which is consistent with the failure appearing only under the
full suite and never when the file runs alone. **A failure was not reproduced in isolation during this
investigation**; the evidence here is the margin, plus the two historical failures recorded in the
roadmap.

### The root cause is already documented in the codebase

`shared/resources/tests/access-config-parity.test.mjs:105-121` contains a precise diagnosis:

> _"The old value was a bare `timeout: 20000`, which sounds enormous and is not. One probe sources the
> resolver and costs ~550ms on an idle machine; at only 12-way concurrency that inflates to ~4.6s
> median and ~6.7s worst case, and `npm test` runs the suite alongside far more than 12 children. 20s
> sat about three times the loaded median — close enough to be hit, rare enough to look like a mystery
> when it was."_

**That file was fixed. The root cause was not.** Its remedy was local — `SPAWN_TIMEOUT_MS` (60 s),
`SPAWN_RETRIES` (2), both env-overridable — and it was never generalised.

### The asymmetry that remains

| | `access-config-parity.test.mjs` | `jira-interception.test.mjs` |
| --- | --- | --- |
| Per-spawn timeout | 60 s (env-tunable) | **6 × bare `20000`/`30000`** |
| Retries on a probe that never ran | 2 | **none** |
| Env knobs | `PARITY_SPAWN_TIMEOUT_MS`, `PARITY_SPAWN_RETRIES` | **none** |

`jira-interception.test.mjs` is the file that has actually failed, and it is the one that never
received the fix.

**Related Files**:

- `package.json` — the `test` script; `node --test` over ~21 globs, no `--test-concurrency`
- `shared/resources/tests/jira-interception.test.mjs` — 6 bare timeouts, no retries
- `shared/resources/tests/access-config-parity.test.mjs` — the partial fix and its diagnosis
- ~10 further spawn-heavy suites under `shared/resources/tests/` (`gh-stage`, `tracker-issue`, `handover-render`, `setup-consumer-*`, `credential-file-discovery`, …)
- `docs/development/project-completion-roadmap.md` — Change Log rows for T62 and T63 record both merges over red

---

## Scope & Impact

**Reference**: the repository's test gate — `npm test`, run by every `/develop-*` pipeline at Step 3,
by every QA cycle, and by CI.

**Why it has no single owner**: the cause is the shared test *invocation* in `package.json` and a
property of the suite as a whole. No story or task introduced it, and no single suite can fix it —
`access-config-parity.test.mjs` already tried, locally and successfully, which is exactly why the
problem is still here in its neighbour.

**How It Failed**: `node --test` defaults its concurrency to the machine's CPU count. On a 16-core
box that is 16 test *files* at once, most of which themselves `spawnSync` a child per assertion. The
resulting process count far exceeds core count, every spawn's latency inflates, and any test whose
timeout was chosen against an idle-machine measurement becomes a coin flip. The tests are not wrong
and the code is not wrong; the harness is oversubscribed.

**Suggested fix** (for the developer — not prescriptive):

1. **Bound the concurrency**: `node --test --test-concurrency=<n>` in the `test` script. This is the
   root-cause fix and is one line. Pick `n` against measurement, not intuition.
2. **Generalise the `access-config-parity` remedy** to the other spawn-heavy suites — a shared
   spawn helper with a generous env-tunable timeout and a retry for a probe that never started —
   rather than raising six more magic numbers.
3. Prefer (1) over (2) alone: raising timeouts hides the oversubscription instead of removing it, and
   makes an already slow suite slower to fail.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

---

## Status History

| Date       | Status | Changed By  | Notes                                                                 |
| ---------- | ------ | ----------- | --------------------------------------------------------------------- |
| 2026-08-29 | New    | QA Engineer | Filed after task.64. Root cause identified; margin measured; not reproduced in isolation |

---

## Resolution Summary

[Will be completed when bug is closed]
