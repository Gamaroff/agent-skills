---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-01'
updated: '2026-09-01'
related: 'none — cross-cutting (no single owner)'
description: "access-config-parity.test.mjs already separates 'the resolver refused' from 'the probe never ran' on the shell side, and its own docstring documents that fix. The JS side still conflates them: the production reader fail-closes to manual on a spawnSync timeout, jsAnswer() records that as a legitimate reading, and the suite reports a reader divergence that did not happen. Failed 2 of 3 full runs under load; task 75 put this suite on the mandatory merge path."
---

# Bug Report: access-config parity JS probe records a timeout as a real answer

**Bug ID**: bug.5.access-parity-js-probe-conflates-timeout
**Related**: None — cross-cutting bug (no single owner)
**Status**: ✅ Ready for QA
**Priority**: High
**Severity**: Major
**Created**: 2026-09-01
**Assigned To**: Unassigned
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `shared/resources/tests/access-config-parity.test.mjs` compares two readers of
`skills-config.yaml` — a shell tier and a JS tier. Under parallel load the JS reader's internal
`spawnSync` of `resolve-platform.sh` times out. The reader then does the **correct production thing**:
it fail-closes to `manual` and prints a warning, refusing rather than escalating a declared
restriction. But it does not throw, so `jsAnswer()` records `manual` as a genuine reading and the
parity assertion reports:

```
the two readers disagree:
  mode-approve [tier=awk]: shell=approve js=manual
```

The readers did not disagree. One of them never ran.

**Expected Behavior**: A probe that did not execute is an infrastructure failure — retried, then
surfaced as itself — never compared as though it were an answer.

**Actual Behavior**: A timeout is recorded as the refusal value and asserted against the shell tier's
correct reading, producing an intermittent failure that names the wrong cause.

**Impact**: Intermittent red on a suite that **task 75 promoted onto the mandatory pre-merge gate**.
A gate that fails two-in-three under load teaches people to re-run until green, which is precisely the
erosion task 75 exists to prevent. The diagnostic also points the reader at reader semantics rather
than at contention, which is where the time gets lost.

---

## Reproduction Steps

**Environment**: macOS (Darwin 25.5.0), Node v24.13.1. Load-dependent.

**Steps to Reproduce**:

```bash
# Under load — e.g. npm run ci alongside other work, or a busy CI box
npm test
# → ✖ every fixture resolves identically through both readers, on every tier
#   'mode-approve [tier=awk]: shell=approve js=manual'
# → grep ETIMEDOUT over the log shows the spawnSync timeouts behind it

# On an idle machine, in isolation
node --test shared/resources/tests/access-config-parity.test.mjs
# → 32/32 pass, 0 timeouts
```

**Frequency**: 2 of 3 full runs observed during task.75 development; 0 of 2 in isolation
**Reproducible**: Yes, under contention — not deterministic

---

## Evidence

### The same defect was already found and fixed — on the other side

The file's own docstring at `:131` describes this failure exactly, and fixes it for `shellAnswer()`:

> *"A CHILD THAT NEVER RAN IS NOT AN ANSWER. This used to be `if (r.status !== 0) return REFUSAL_AS`,
> which is true of a resolver that deliberately exited non-zero AND of one that was killed on timeout
> … That is the whole of the intermittent failure this replaced: under parallel load a probe timed
> out, `absent-key` … was recorded as `manual`, and the suite reported a reader divergence that had
> not happened."*

`shellAnswer()` (`:147`) now retries on infrastructure failure and throws rather than returning a
value. **`jsAnswer()` (`:184`) received no equivalent treatment:**

```js
function jsAnswer(dir, tier) {
  try {
    return dm.resolveAccessTracker(env, { cwd: dir });
  } catch {
    return "THREW";
  }
}
```

It catches only a *throw*. The production reader does not throw on a timeout — it warns and returns
`manual`. From outside, that is indistinguishable from a real reading.

### Observed signature

```
⚠️  could not run resolve-platform.sh to read …/skills-config.yaml (spawnSync bash ETIMEDOUT).
    Resolving tracker access to "manual" — refusing rather than defaulting to "full" …
```

Every observed failure was `js=manual` with `ETIMEDOUT` in the log; the shell tier answered correctly
each time.

### Why now

`SPAWN_TIMEOUT_MS` / `SPAWN_RETRIES` are already tuned and documented (`:109`) — this is **not** an
untuned timeout. Task 75 raised the load: the suite now runs inside `ci:fast` on every develop-loop
iteration and qa-fix cycle, and inside `ci` at every merge gate.

---

## Scope & Impact

**Reference**: `shared/resources/tests/access-config-parity.test.mjs:184` (`jsAnswer`)

**Why it has no single owner**: shared test infrastructure for the config reader; belongs to no story
or task.

**Not a production defect.** The reader's fail-closed-to-`manual` behaviour is correct and
safety-critical — it must not change. This is a test that cannot see behind that default.

---

## Suggested Fix

**Do not raise the timeout, and do not change the production reader's fail-closed default.** Mirror
on the JS side what `shellAnswer()` already does on the shell side:

1. Give `jsAnswer()` the ability to distinguish *refused* from *never ran*. Options, cheapest first:
   - Capture the reader's warning output during the probe and treat the `could not run
     resolve-platform.sh … ETIMEDOUT` marker as an infrastructure failure; **or**
   - Have `resolveAccessTracker` expose *why* it resolved as it did through an internal diagnostic
     channel the test can read, leaving its return value and fail-closed semantics untouched.
2. On infrastructure failure: retry with the existing `SPAWN_RETRIES` budget, then **throw** — the
   same shape and the same budget as `shellAnswer()`.
3. Assert the diagnostic names contention, not divergence, so the next reader is not sent to the wrong
   place.

**Mutation proof**: force the reader's subprocess to time out (a 1 ms timeout, or a stub resolver that
sleeps) and confirm the suite reports an infrastructure failure rather than a reader disagreement.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-01
**Developer**: develop-bug pipeline

**Reproduction**: Deterministic, by forcing the reader's own probe budget. The internal
`spawnSync` in `probeResolver` was temporarily set to `timeout: 1`, then:

```
node --test shared/resources/tests/access-config-parity.test.mjs
  AssertionError: the two readers disagree:
    mode-approve [tier=awk]: shell=approve js=manual
    mode-read-only [tier=awk]: shell=read-only js=manual
    ... 15 rows, every one js=manual
```

That is the reported symptom exactly, including the report's own `mode-approve` line. The shell
tier answered correctly on every row; the JS probe never ran on any of them.

**Root Cause Analysis**: The defect is a **loss of information at the source**, not in the test.

`probeResolver` (`shared/resources/defer-mutation.js:703`) flattened three genuinely different
outcomes into one `{ mode: null, reason }` shape:

| Outcome | What it means |
| --- | --- |
| child killed / never started | infrastructure — says *nothing* about the file |
| resolver ran, exited non-zero | data — a determination about the file |
| resolver ran, unusable stdout | data |

`resolveAccessTracker` (`:835`) then maps *any* non-null `reason` to `manual`. That is correct
and safety-critical production behaviour — it refuses rather than escalating a declared
restriction — but it leaves **no caller, including this suite, able to tell a reading from a
non-event**. `jsAnswer()` caught only a `throw`, and the reader does not throw here: it warns and
returns. So `manual` came back looking exactly like a legitimately-declared `manual`.

`shellAnswer()` (`access-config-parity.test.mjs:147`) had already been given this distinction, and
its docstring at `:131` describes the identical failure. The JS side never received the
equivalent treatment — which is precisely what the bug report says.

**A second defect found while fixing this, which blocked the prescribed remedy.**
`readConfiguredAccessTracker` memoises the probe answer in `_configAccessMemo`, keyed on
`[cwd, file, tier]`. A timed-out probe was cached under the *file path* — so "the box was busy for
ten seconds" became a sticky property of that config for the rest of the process, and the retry
the bug report asks for would have been served from the cache without re-spawning. The retry
could not have worked without also fixing this.

**Proposed Fix**: classify the failure where it happens, expose the classification through an
observation-only channel, stop memoising non-events, and let the suite retry-then-throw exactly as
`shellAnswer` does.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-01

**Root Cause**: `probeResolver` conflated "the resolver refused" with "the probe never ran"; both
became a bare `reason`, both fail-closed to `manual`, and nothing downstream could tell them
apart.

**Fix Description**:

- **`probeResolver` now classifies.** Every return carries a `kind`: `"never-ran"` for a child
  killed on timeout or never started, `"refused"` for a resolver that ran and refused (or produced
  an unusable answer), `null` on success. Pure addition — no existing field changed.
- **The probe timeout is tunable.** The bare `timeout: 10000` became
  `accessProbeTimeoutMs()`, reading `AGENT_SKILLS_ACCESS_PROBE_TIMEOUT_MS` and defaulting to the
  same 10000. This is bug.2's remedy applied to the one spawn site that was out of its reach
  because it is production rather than test code. It is read from the *ambient* environment,
  unlike the neighbouring `AGENT_SKILLS_CONFIG_TIER` hook — deliberately, and the asymmetry is
  documented at the function: the tier hook can loosen the answer, whereas no value of a timeout
  can. A short budget only makes the probe fail, and a failed probe fails **closed**.
- **A probe that never ran is no longer memoised.** Caching a transient contention event under a
  path made the fail-closed `manual` sticky for the process and made retrying a no-op.
- **`resolveAccessTracker` gained `opts.onDiagnostic`** — an observation channel, called with
  `{ kind, reason }` when the config tier produces a reason. It fires **every** time (unlike
  `warnOnce`, which deduplicates per process — a deduplicated diagnostic would make a retry loop
  go blind on its second failure) and it cannot change the answer. Absent the option, every
  production call site runs an identical code path.
- **`jsAnswer()` now mirrors `shellAnswer()`**: on a `never-ran` diagnostic it retries on the
  shared `SPAWN_RETRIES` budget, then throws an infrastructure-failure message naming contention
  rather than divergence.

**Nothing about the production reader's return value, its warning, or its fail-closed semantics
changed** — the constraint the bug report states twice.

**Files Modified**:

- `shared/resources/defer-mutation.js` — `kind` classification, `accessProbeTimeoutMs()`, memo
  guard, `onDiagnostic` channel
- `shared/resources/tests/access-config-parity.test.mjs` — `jsAnswer()` retry/throw; five new
  regression tests
- `skills/*/references/defer-mutation.js` (38 bundled copies) — regenerated via `npm run bundle`

**Testing**:

Five regression tests added to the existing `the probe cannot fabricate an answer` block, which
already held the shell-side equivalents:

1. `a JS probe that never completes throws instead of reading as \`manual\`` — the mutation proof
2. `the same JS probe, given time, does answer` — vacuity control
3. `a probe that never ran is not memoised as a property of the file` — the memo fix
4. `the diagnostic fires on every failure, not once per process` — the warnOnce-bypass property
5. `a genuine refusal is NOT reported as an infrastructure failure` — the other direction, so the
   fix cannot cry wolf by classifying everything as contention

**Mutation proof** — each half of the fix reverted independently, all confirmed red:

| Reverted | Result |
| --- | --- |
| `kind: "never-ran"` → `"refused"` | 3 tests red |
| memo guard removed | 1 test red |
| `jsAnswer` back to catch-only | red: `Missing expected exception` — it returned `manual`, the original defect |

Suite: **37 pass / 0 fail** (was 32 before this change).

**Verification Steps for QA**:

1. `node --test shared/resources/tests/access-config-parity.test.mjs` → 37/37, no timeouts.
2. Force the failure: `AGENT_SKILLS_ACCESS_PROBE_TIMEOUT_MS=1 node --test --test-name-pattern "JS probe that never completes" …` → the test passes *because* the probe is killed and the suite throws an infrastructure error, not a divergence.
3. Confirm the diagnostic names contention: the thrown message must contain `never ran` and `NOT a refusal`, and must not report a reader disagreement.
4. Confirm production semantics are untouched: `resolveAccessTracker` with no `onDiagnostic` still returns `manual` on a refusal and `full` on a repo declaring nothing.

---

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Filed from task.75 — failed 2 of 3 full runs; root cause traced to the JS probe |
| 2026-09-01 | In Progress | develop-bug | Reproduced deterministically by forcing the probe budget; root cause localised to `probeResolver` flattening never-ran into refused |
| 2026-09-01 | Ready for QA | develop-bug | Fix implemented + 5 regression tests; 3 independent mutations confirmed red |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
