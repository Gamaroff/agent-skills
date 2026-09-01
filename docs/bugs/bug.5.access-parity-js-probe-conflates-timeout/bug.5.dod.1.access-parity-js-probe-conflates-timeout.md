---
type: dod-summary
status: complete
bug: 'bug.5.access-parity-js-probe-conflates-timeout'
created: '2026-09-01'
updated: '2026-09-01'
description: 'Definition of Done verification for bug.5 (access-config parity JS probe records a timeout as a real answer). Bug-shaped DoD: fix evidence, regression tests with the fails-without/passes-with property, suite + lint green, CI green on the final head, no new security surface, production semantics provably unchanged.'
---

# Definition of Done Verification

**Bug:** bug.5.access-parity-js-probe-conflates-timeout (general, Major/High)
**PR:** [#293](https://github.com/Gamaroff/agent-skills/pull/293) → `develop`
**Verification Started:** 2026-09-01
**Status:** COMPLETED — ACCEPTED

> **Bug-shaped DoD.** This document is a bug report, not a story or task, so there are no acceptance
> criteria and no `*.gate.*.yml`. The evidence bar is the one `develop-bug` Step 7 names: fix
> present, regression tests with the fails-without/passes-with property established, suite and lint
> green, and no new security surface. The QA report's role is played by the two verify cycles in the
> implementation report and the adversarial review pass over the diff.

---

## Step 1: Prior-Run and QA Artifact Review

**Prior DoD/ACCEPTED blocks in the bug body:** 0 — first finalise run for this bug, nothing to
supersede.

**QA report / gate files:** none, and none expected. Evidence used instead:

| Artifact | Role |
| --- | --- |
| `bug.5.review.1.access-parity-js-probe-conflates-timeout.md` | Pre-fix readiness gate — READY TO FIX 9/10, duplicate scan clean, defect confirmed live |
| `bug.5.implementation.1.access-parity-js-probe-conflates-timeout.md` | Pipeline audit trail incl. both verify cycles |
| Bug body `## Developer Fix Cycle` | Iteration 1 + Fix Cycle 2 with Investigation / Fix Implementation |

**Verify cycle outcomes:** cycle 1 **FAIL** — the adversarial diff review returned nine findings,
three high, **two of them defects the fix itself introduced**; cycle 2 **PASS** after all nine were
closed.

---

## Step 2: Fix Evidence

**Overall: ✅ PASS**

| Criterion | Status | Evidence |
| --- | --- | --- |
| The reported defect is fixed at its root cause | ✅ | `probeResolver` classifies every outcome — `defer-mutation.js:802, 866, 878, 888, 892`. All **5** return paths carry an explicit `kind`; none can yield `undefined`. |
| The distinction is reachable by a caller | ✅ | `resolveAccessTracker` `opts.onDiagnostic` — `defer-mutation.js:1008`, documented `:946-963` |
| The blocking second defect is fixed | ✅ | never-ran is not memoised — `defer-mutation.js:673` |
| The consuming probe acts on it | ✅ | `jsAnswer` retries on the shared budget then throws — `access-config-parity.test.mjs:207-247` |
| The original symptom no longer occurs | ✅ | Reproduced pre-fix as `mode-approve [tier=awk]: shell=approve js=manual` (the report's own line); post-fix the same forcing yields an infrastructure error naming contention |

---

## Step 3: Regression Tests — fails-without / passes-with

**Overall: ✅ PASS**

Six tests added to the existing `the probe cannot fabricate an answer` block, which already held
the shell-side equivalents:

| # | Test | Pins |
| --- | --- | --- |
| 1 | a JS probe that never completes throws instead of reading as `manual` | the headline defect |
| 2 | the same JS probe, given time, does answer | vacuity control for #1 |
| 3 | a probe that never ran is not memoised as a property of the file | the memo defect |
| 4 | the diagnostic fires on every failure, not once per process | the warnOnce-bypass property |
| 5 | a genuine refusal is NOT reported as an infrastructure failure | the reverse direction — the fix cannot cry wolf |
| 6 | an out-of-range probe budget falls back rather than throwing | the NEVER-THROWS contract (cycle 2) |

**Mutation proof — five independent reverts, all confirmed red:**

| Cycle | Reverted | Result |
| --- | --- | --- |
| 1 | `kind: "never-ran"` → `"refused"` | 3 tests red |
| 1 | memo guard removed | 1 test red |
| 1 | `jsAnswer` back to catch-only | red — `Missing expected exception`; returned `manual`, the original defect |
| 2 | range check → bare `n >= 1` | red — `ERR_OUT_OF_RANGE` reaches `spawnSync` |
| 2 | knob back to ambient `process.env` | 2 tests red |

> One mutation attempt initially reported a **false green**: prettier had reflowed the call site, so
> the mutation string never matched and nothing was reverted. Re-run with an assertion that both
> halves of the edit applied, it goes red. Recorded because a mutation test that cannot prove it
> mutated is not evidence — it is the same class of "passes on the exact regression it names" the
> repo has been bitten by before.

---

## Step 4: Suite, Lint and CI

**Overall: ✅ PASS**

| Check | Result |
| --- | --- |
| Parity suite | **38 pass / 0 fail** (32 before this change) |
| `npm run ci:fast` | **2104 tests, 0 fail** |
| `prettier --check .` | clean |
| `npm run bundle` | all 38 bundled `defer-mutation.js` copies in sync with the source |
| **CI on PR #293** | **`CI_ROLLUP=SUCCESS`** — test ✅ 1m38s, validate ✅, link-check ✅, branch guard ✅ |
| CI head | `a8b972c86831e9baf5c9bc46720011ade414436b` — the final commit, not an ancestor |

---

## Step 5: Security Review

**Overall: ✅ PASS**

| Check | Status | Note |
| --- | --- | --- |
| No new `exec`/`eval`/network/`child_process` surface | ✅ | diff scanned; the only `spawnSync` is the pre-existing one, with its argv unchanged |
| Fail-closed semantics preserved | ✅ | every failure path still resolves `manual`; `onDiagnostic` cannot influence the return value and is passed no means to |
| No production call site behaviour change | ✅ | all six sites (`gh-stage`, `jira-stage`, `jira-sync`, `tracker-comment`, `tracker-issue`, and the internal one) pass no `onDiagnostic` → identical path |
| The new env knob cannot escalate access | ✅ | caller-passed only, never ambient — a repo-local `.env` cannot reach it |
| The new env knob cannot restrict behind the resolver's back | ✅ | **this was cycle 1's F1** — the knob originally read `process.env` after `loadDotEnv()`, re-opening the door the gates' pre-`loadDotEnv` snapshot exists to shut. Now threaded through the caller's env. |
| The reader cannot be made to throw from the config tier | ✅ | **cycle 1's F2** — `Infinity` reached `spawnSync` and threw `ERR_OUT_OF_RANGE` from inside a function documented NEVER THROWS. Now `Number.isSafeInteger` + 300000 ms cap. |
| The probe cannot be left unbounded | ✅ | a huge finite budget used to remove the timeout rather than lengthen it; the cap closes that |

---

## Step 6: Documentation & Compliance

**Overall: ✅ PASS**

| Check | Status | Evidence |
| --- | --- | --- |
| New operator-facing knob documented | ✅ | `shared/resources/platform-detection.md` — "Not ambient — passed by a caller only", alongside `AGENT_SKILLS_CONFIG_TIER` |
| Bug report carries the full fix record | ✅ | `## Developer Fix Cycle` — Investigation, Fix Implementation, Fix Cycle 2 with all nine findings |
| Status History complete | ✅ | 4 rows: New → In Progress → Ready for QA → verify-cycle outcome |
| Change Log | ⚠️ N/A | Bug reports use `## Status History` by design — [document-change-log.md](../../../shared/resources/document-change-log.md) §Exclusions |
| Bug registry consistent | ✅ | `docs/bugs/bug-registry.md` row 5 (flipped to `closed` in this step) |
| Accepted-row conventions | ✅ | matches bug.3 / bug.4 precedent |

---

## Step 7: Acceptance Decision

**Decision: ✅ ACCEPTED**

| Category | Result |
| --- | --- |
| Fix evidence | ✅ PASS |
| Regression tests (mutation-proved ×5) | ✅ PASS |
| Suite + lint | ✅ PASS |
| CI on final head | ✅ SUCCESS |
| Security | ✅ PASS |
| Documentation | ✅ PASS |

**Outcome:** bug.5 meets the Definition of Done. The JS probe can no longer record a timeout as a
reading, the retry the report prescribed now actually retries, and both defects introduced while
fixing it were caught by the pipeline's own review gate and closed before acceptance.

**Verification Complete:** 2026-09-01
**Detailed log:** `bug.5.implementation.1.access-parity-js-probe-conflates-timeout.md`
