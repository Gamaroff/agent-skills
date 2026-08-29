---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-08-29'
updated: '2026-08-29'
related: 'none — cross-cutting (no single owner)'
description: '`npm test` runs `node --test` with no concurrency bound, so spawn-heavy suites inflate past their per-test timeouts and the suite fails for environmental reasons'
---

**Bug ID**: bug.2.unbounded-test-concurrency
**Related**: None — cross-cutting bug (no single owner)
**Status**: ✅ Ready for QA
**Priority**: High
**Severity**: Major
**Created**: 2026-08-29
**Assigned To**: develop-bug
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

### The root-cause fix appears to be free (measured 2026-08-29)

Full `npm test`, same machine, back to back:

| Configuration | Wall clock | Result |
| --- | --- | --- |
| Default (unbounded — 16-way on this box) | **136.97 s** | 1869 pass, 0 fail |
| `--test-concurrency=4` | **135.00 s** | 1869 pass, 0 fail |

**No measurable cost.** The suite is dominated by per-spawn latency rather than by parallelism, so
oversubscribing the box was not buying wall-clock — it was only adding contention. Treat this as
n=1 per configuration and re-measure before committing to a number, but the usual objection to
bounding concurrency (a slower suite) does not appear to apply here.

That materially changes the fix recommendation below: option 1 is not a trade-off against speed.

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

### Verified against the tree at review time (review-bug, 2026-08-29)

Every claim above was re-checked against `develop` at `c5d4573`. All hold. Three numbers are sharper
than the ones filed, and one of them changes the shape of the fix:

| Claim | Verdict | Evidence |
| --- | --- | --- |
| `test` script carries no concurrency bound | CONFIRMED | `package.json:24` — 21 globs, no `--test-concurrency`, no `--test-timeout`, no `NODE_OPTIONS`. No `.npmrc`, no runner config, no `pretest`. CI calls `npm test` bare (`.github/workflows/test.yml:48`, `release.yml:49`). |
| ">10 spawn-heavy suites" | CONFIRMED — **19 of the 73 matched files** | Heaviest by call sites: `tracker-issue.test.mjs` (14), `access-config-parity.test.mjs` (12), `jira-interception.test.mjs` (9), `handover-render.test.mjs` (9), `setup-consumer-config.test.mjs` (8). |
| `jira-interception.test.mjs`: 6 bare timeouts, no retries, no knobs | CONFIRMED | `:829` `30000`, `:927` `20000`, `:1335` `30000`, `:1434` `20000`, `:1713` `20000`, `:1852` `20000`. Every `process.env` reference in the file is spread into the *child's* env; none is read as a tunable. |
| Parity suite holds the remedy | CONFIRMED | `access-config-parity.test.mjs:120-121` (`SPAWN_TIMEOUT_MS`, `SPAWN_RETRIES`), diagnosis comment `:107-119`, retry loop `shellAnswer()` `:145-180`. |
| No shared spawn helper exists | CONFIRMED | Zero repo-wide hits for an exported retrying spawn. `shellAnswer` is a private function in one test file. |

**The one correction to the filed report.** The asymmetry table above implies the parity suite is
fully remediated and its neighbour is not. It is not that clean: **only 1 of that file's 12 `spawnSync`
call sites goes through `shellAnswer()`** (the one at `:151`); the other eleven — `:561`, `:594`,
`:633`, `:634`, `:694`, `:707`, `:742`, `:756`, `:790`, `:791` — still spawn raw. So the remedy is
local to one probe inside the file that invented it. That strengthens the report's own conclusion:
option 2 (generalising a spawn helper) is a larger job than "copy the parity pattern across", while
option 1 (bounding concurrency) is one line and was measured free.

**Adjacent, not part of this bug.** All 21 globs currently match at least one file and no test suite is
orphaned. But 11 of the 21 are one-skill-one-line and hand-maintained, so a new `skills/*/tests/` or
`evals/*/{unit,protocol}/` directory is silently uncovered until someone edits `package.json:24`. That
is a separate defect from this one; note it, do not fix it here.

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

1. **Bound the concurrency**: `node --test --test-concurrency=<n>` in the `test` script. One line, and
   measured at **no wall-clock cost** at `n=4` (see above). Pick `n` against measurement, not
   intuition, and re-measure on the CI box as well as a dev machine.
2. **Generalise the `access-config-parity` remedy** to the other spawn-heavy suites — a shared
   spawn helper with a generous env-tunable timeout and a retry for a probe that never started —
   rather than raising six more magic numbers.
3. Prefer (1) over (2) alone: raising timeouts hides the oversubscription instead of removing it, and
   makes an already slow suite slower to fail.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-29

**Reproduction**: The filed report was candid that a *failure* was never reproduced in isolation.
It does not need to be. What this bug claims is a **collapsed margin**, and the margin reproduces
deterministically. `shared/resources/tests/jira-interception.test.mjs`, run alone on an otherwise
idle 16-core box, against the same file run alone while 24 shell-spawn workers compete for fork
capacity:

| Condition | Suite wall clock | Slowest single test | Margin against its 20 s timeout |
| --- | --- | --- | --- |
| Alone, idle | **3.20 s** | 461 ms | ~43× |
| Alone, under spawn contention | **48.51 s** | **6 741 ms** | **~3×** |

**15.2× on the suite, 14.6× on the worst individual test.** Both runs passed 48/48 — which is the
point. Nothing about the code under test changed; only the process pressure did, and it ate 93% of
the timeout headroom. A further 3× — well within reach of the real suite, which runs 16 spawn-heavy
files at once rather than the 24 cheap workers used here — trips it. That is the coin flip the two
historical failures landed on.

**Root Cause Analysis**: `package.json:24`. `node --test` defaults file-level concurrency to the
machine's CPU count. **19 of the 73 files** the runner matches spawn a child process per assertion,
so the effective process count is (16 files × their own children), far above 16 cores. Per-spawn
latency inflates with the oversubscription, and every timeout in the suite was chosen against an
idle-machine measurement. The tests are not wrong and the code is not wrong — the harness is
oversubscribed. Confirmed unbounded at review time: no `--test-concurrency`, no `--test-timeout`,
no `NODE_OPTIONS`, no runner config, and CI calls `npm test` bare
(`.github/workflows/test.yml:48`, `release.yml:49`).

Root-cause localisation was completed by the Step 2 pre-pass scan (file:line evidence recorded in
the Evidence section above); no second Explore pass was dispatched for a root cause already pinned
to a single line.

**Proposed Fix**: Bound the runner's concurrency in `package.json` — the report's option 1, which
its own measurement showed costs no wall clock — and pin it with a regression test that guards
*every* `node --test` invocation, not just the one being fixed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-29

**Root Cause**: Two causes, not one — and measurement reordered them.

The filed cause (unbounded `node --test` concurrency oversubscribing the box) is real and was
confirmed. But when measured, it turned out **not to be the one that trips the gate**. The cause
that does is per-spawn timeout headroom under load the suite does not control.

##### The measurement that redirected the fix

Full suite, 73 files, 16-core box, back to back. Slowest single test is the number that matters,
because that is what a per-test timeout is compared against:

| Run | Wall clock | Slowest single test |
| --- | --- | --- |
| Unbounded (16-way), quiet box | 37 s | 2 814 ms |
| `--test-concurrency=4`, quiet box | 37 s | 2 638 ms |
| `--test-concurrency=8`, quiet box | 39 s | 2 577 ms |
| Unbounded again, quiet box | 36 s | 2 602 ms |

Two readings, both load-bearing:

1. **Bounding costs nothing** — 36–39 s across every configuration. The report's n=1 claim holds.
2. **Bounding also *buys* nothing on a quiet box.** The worst case is ~2.6–2.8 s at *every*
   concurrency, including unbounded, and the spread between the two **unbounded** runs (2 814 ms
   vs 2 602 ms) is as large as the spread between bounded and unbounded. Against a 20 s timeout
   that is a 7× margin. The suite does not oversubscribe itself badly enough, on its own, to
   threaten any timeout.

So where did the historical failures come from? External load. The same suite with sixteen
unrelated spawn loops competing for fork capacity:

| Run | Wall clock | Slowest single test |
| --- | --- | --- |
| Unbounded, 16 competing spawn loops | 204 s | **16 183 ms** |
| `--test-concurrency=4`, same load | 226 s | **17 110 ms** |

**Bounding does not help here either** — it cannot, because the pressure is not the suite's to
bound. A 16.2 s worst case against a bare `timeout: 20000` is a 1.2× margin: that is the coin
flip, and it is why the failures only ever appeared when agent pipelines were running alongside
the suite, never in isolation and never in CI.

The decisive detail is *which* file absorbed that 16.2 s spike without failing:
`access-config-parity.test.mjs` — the one file that had already given itself a 60 s budget and a
retry. It survived precisely because of the remedy the report described as partial. Meanwhile
`jira-interception.test.mjs`, the historical victim, peaked at only 4.3 s in the same run.

**Conclusion**: bounding concurrency is free but insufficient. The exposure is the eleven bare,
idle-tuned, untunable timeout literals. Shipping option 1 alone would have closed this bug without
changing the failure probability — the worst outcome available, since the flake would have returned
against a bug marked fixed.

**Fix Description**:

1. **Bound the runner** (the report's option 1). Every `node --test` invocation in `package.json`
   now carries `--test-concurrency="${TEST_CONCURRENCY:-4}"`. Kept because it is free, it removes
   self-inflicted contention as a variable so the remaining exposure is unambiguous, and it is what
   the roadmap asked for. Applied to **all five** invocations, not just `test`: the defect class is
   reintroduced by *adding* a runner, not by editing the fixed one.

2. **Extract the spawn budget** (the report's option 2, promoted by the measurement above). New
   `shared/resources/tests/spawn-budget.mjs` exports `spawnBudget(prefix)` — a 60 s default with 2
   retries, resolved specific-then-general (`{PREFIX}_SPAWN_TIMEOUT_MS` → `TEST_SPAWN_TIMEOUT_MS` →
   default) — plus `neverRan()`, the "a child that never ran is not an answer" predicate the parity
   suite had reasoned out privately. All **eleven** bare literals now read from it: six in
   `jira-interception.test.mjs`, five in `access-config-parity.test.mjs` (the raw sites its own
   `shellAnswer()` never covered — the remedy was applied to 1 of its 12 spawn sites).

   This turns a 1.2× margin into a 3.7× margin against the measured loaded worst case, and makes it
   tunable on a slow CI box without a commit.

3. **Deliberately not done**: the retry wrapper was not retrofitted onto all 20 spawn call sites.
   `neverRan()` is exported and the parity suite's `shellAnswer()` continues to use that logic, but
   rewriting twenty call sites of differing shapes is a refactor with its own regression risk and
   no measurement demanding it — the timeout headroom is what was measured to be short. Noted for a
   follow-up if a *timeout* failure is ever observed again rather than a slow run.

**Files Modified**:

- `package.json` — `--test-concurrency="${TEST_CONCURRENCY:-4}"` on all five `node --test`
  invocations (`test`, `eval:develop-task`, `eval:develop-story`, `eval:develop-next`,
  `eval:develop-batch`).
- `shared/resources/tests/spawn-budget.mjs` — **new**; the shared, env-tunable spawn budget.
- `shared/resources/tests/jira-interception.test.mjs` — 6 bare literals → `SPAWN_TIMEOUT_MS`;
  tunable via `JIRA_INTERCEPTION_SPAWN_TIMEOUT_MS`.
- `shared/resources/tests/access-config-parity.test.mjs` — 5 raw-site literals → `SPAWN_TIMEOUT_MS`;
  its local constants now come from the shared budget, preserving `PARITY_SPAWN_TIMEOUT_MS` /
  `PARITY_SPAWN_RETRIES` exactly.
- `tests/test-harness-concurrency.test.js` — **new**; regression test, 7 cases.

**Testing**:

- Full suite green with every change in place: **1883 pass, 0 fail, 1 skipped**, out of 1884
  (1876 passing before; the 7 new cases add to the count rather than replacing any).
- That verification run happened to execute on a **loaded** box, which made it an accidental live
  test of the fix: its slowest test hit **13 028 ms**. Under the pre-fix literals that would have
  been a 1.5× margin against `timeout: 20000`. It is worth naming where it landed —
  `tracker-issue.test.mjs`, which carries 14 spawn sites and **no `timeout:` at all**, so it can run
  arbitrarily slowly but cannot trip. The two files that *could* trip are exactly the two now on the
  60 s budget.
- The two rewritten suites pass in isolation: 80/80.
- **Every guard is mutation-proven in both directions**, not merely asserted:

  | Mutation | Guard that went red |
  | --- | --- |
  | Drop the bound from one `eval:*` script (leaving `test` bounded) | "every `node --test` invocation bounds its concurrency" |
  | Restore one bare `timeout: 20000` in `jira-interception.test.mjs` | "no test file hardcodes a spawn timeout" |
  | Tighten `DEFAULT_TIMEOUT_MS` to 20 s | "the shared spawn budget exists and is generous by default" |

  Each mutation reddened exactly one guard and nothing else; the tree returns to 7/7 on restore.
- The guards are written to catch *reintroduction*, not to pin today's strings: the concurrency
  check splits on each `node --test` so an unbounded runner appended to an already-bounded script
  is still caught; it rejects a bound ≥ 8 (a "bound" of 16 on a 16-core box bounds nothing); and the
  literal scan strips comments first, so the historical `timeout: 20000` quoted in the parity
  suite's own diagnosis is not read as code.
- Shell expansion verified under `sh` (npm's script shell): default `4`, and `TEST_CONCURRENCY=2`
  overrides it.

**Verification Steps for QA**:

1. `npm test` — full suite green; the run carries `--test-concurrency=4`.
2. `node --test tests/test-harness-concurrency.test.js` — 7/7 pass.
3. Mutation check (any one): remove `--test-concurrency` from any of the five invocations, or
   restore a bare `timeout: 20000` in either rewritten suite. The corresponding guard must go red
   and name the offender.
4. Override check: `TEST_CONCURRENCY=2 npm test` bounds at 2; `TEST_SPAWN_TIMEOUT_MS=90000 npm test`
   raises every suite's spawn budget; `PARITY_SPAWN_TIMEOUT_MS` still overrides the parity suite
   alone.
5. Margin check (optional, ~8 min): run the suite with ~16 competing `while true; do bash -c true;
   done` workers. The slowest test should land near 16 s — now against a 60 s budget rather than a
   20 s one.

---

## Status History

| Date       | Status | Changed By  | Notes                                                                 |
| ---------- | ------ | ----------- | --------------------------------------------------------------------- |
| 2026-08-29 | New    | QA Engineer | Filed after task.64. Root cause identified; margin measured; not reproduced in isolation |
| 2026-08-29 | New    | review-bug  | Fix-readiness review: READY TO FIX (10/10). No duplicate; defect still present. All 5 claims re-verified; evidence section added. Severity/priority unchanged (Major/High). |
| 2026-08-29 | In Progress | develop-bug | Reproduced the margin collapse (3.20s → 48.51s, 15.2×; worst test 461ms → 6741ms against a 20s timeout). Investigation started. |
| 2026-08-29 | Ready for QA | develop-bug | Bounded all 5 `node --test` runners; extracted a shared 60s env-tunable spawn budget and moved all 11 bare timeout literals onto it. 7 regression cases, all mutation-proven. Suite 1880 pass / 0 fail. |

---

## Resolution Summary

[Will be completed when bug is closed]
