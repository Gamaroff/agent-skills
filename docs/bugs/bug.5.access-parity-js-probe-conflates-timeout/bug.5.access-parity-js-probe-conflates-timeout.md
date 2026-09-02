---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
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
**Status**: ✅ Closed
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

1. `node --test shared/resources/tests/access-config-parity.test.mjs` → 38/38, no timeouts.
2. Force the failure: `jsAnswer(dir, tier, { timeoutMs: 1, retries: 0 })` → the suite throws an infrastructure error naming contention, not a divergence.
3. Confirm production semantics are untouched: `resolveAccessTracker` with no `onDiagnostic` still returns `manual` on a refusal and `full` on a repo declaring nothing.
4. Confirm the knob is not ambient: `AGENT_SKILLS_ACCESS_PROBE_TIMEOUT_MS=1` in the real environment must have **no** effect on the reader.

### Iteration 1 — Fix Cycle 2 (from the Step 5 diff review)

**Date**: 2026-09-01

The Step 5 adversarial diff review returned nine findings, three of them high. Two were genuine
defects introduced by the Iteration 1 fix itself; the verdict was FAIL and the fixes below were
applied before finalise.

**F1 (high) — the new knob re-opened the `.env` door the design closes.** `accessProbeTimeoutMs()`
was called with no argument, so it read `process.env` at probe time — *after* `loadDotEnv()` copies
a repo-local `.env` into it. Every gate snapshots the access env *before* that call precisely so a
committed `.env` cannot reach the reader. The original reasoning for allowing this ("no timeout
value can loosen the answer") was wrong: the invariant is not only "nothing may escalate". As
`gh-stage.js:726-731` states, the dot-env file must not be able to **restrict**, or via a typo
hard-fail, every pipeline step behind the resolver's back — and `AGENT_SKILLS_ACCESS_PROBE_TIMEOUT_MS=1`
in a committed `.env` would do exactly that to every repo declaring `access`. The `env` parameter
existed but was dead, which made it read as if it were already honoured.
**Fixed**: threaded the caller's env through `readConfiguredAccessTracker → probeResolver →
accessProbeTimeoutMs`, with no `process.env` default — the same treatment `AGENT_SKILLS_CONFIG_TIER`
gets under T61-M4.

**F2 (high) — an out-of-range budget threw, breaking the NEVER-THROWS contract.** `/^\d+$/` accepts
a 400-digit string; `Number()` makes it `Infinity`; `spawnSync({timeout: Infinity})` throws
`ERR_OUT_OF_RANGE`. Nothing catches it, so `readConfiguredAccessTracker` — documented "NEVER
THROWS", carrying the cycle-4 incident in its own docstring — would have thrown for a config-tier
reason. A merely huge finite value was quieter and no better: it does not lengthen the budget, it
removes it. **Fixed**: `Number.isSafeInteger` plus a 300000 ms cap; anything else falls back to the
default.

**F3 (medium) — a return path omitted `kind`.** `probeResolver`'s missing-resolver arm returned no
`kind`, and the `kind || null` coercion at the sink laundered that `undefined` into `null`, which
the contract defines as "there is no reason". **Fixed**: explicit `kind: "refused"` on that arm
(permanent condition — retrying it would waste the budget and answer with a "raise the timeout"
message pointing at the wrong thing), and dropped the `|| null` so a future omission surfaces.

**F4 (medium) — intra-process non-determinism.** Not memoising a never-ran probe means one process
can answer `manual` at T1 and `read-only` at T2. Not exploitable — every caller resolves once —
**accepted and documented at the call site** rather than left to be rediscovered.

**F5 (medium) — the retry was on the shared budget but the thing retried was not.** `jsAnswer` took
`SPAWN_RETRIES` from the shared budget while the reader's own probe stayed on its hardcoded 10s
default, leaving the JS side ~6x tighter than `shellAnswer`'s 60s under exactly the load this bug is
about — so it would have gone on being the side that failed. Its error message also named
`PARITY_SPAWN_TIMEOUT_MS`, which had no effect on that path. **Fixed**: `jsAnswer` passes
`SPAWN_TIMEOUT_MS` into the reader through the env snapshot, and the message names only the knob
that applies.

**F6 (medium) — the "genuine refusal" test was itself flaky under load.** It called the reader
directly with no retry, so a killed probe would have made a test about *not* misreporting contention
misreport contention. **Fixed**: routed through the shared budget with a retry and a message that
names contention.

**F7 (low)** bare `assert.throws` in the memo test now matches `/never ran/`.
**F8 (low)** `warnOnce` now runs *before* `onDiagnostic`, so a caller's throwing sink cannot swallow
the one operator-visible line explaining the fallback.
**F9 (low)** the knob is documented in `platform-detection.md` under a "Not ambient" heading
alongside `AGENT_SKILLS_CONFIG_TIER`.

**Added test**: `an out-of-range probe budget falls back rather than throwing`, covering
`Infinity`, a huge finite value, and `0`.

**Mutation proof (cycle 2)**:

| Reverted | Result |
| --- | --- |
| range check → bare `n >= 1` | red — `ERR_OUT_OF_RANGE` reaches `spawnSync` |
| knob back to ambient `process.env` | 2 tests red |

> A first attempt at the second mutation reported green. Prettier had reflowed the call site, so the
> mutation string never matched and nothing was actually reverted. Re-run with an assertion that both
> halves of the edit applied, it goes red as expected. A mutation test that cannot prove it mutated
> is not evidence.

Suite: **38 pass / 0 fail**. `npm run ci:fast`: 2104 tests, 0 fail.

---

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Filed from task.75 — failed 2 of 3 full runs; root cause traced to the JS probe |
| 2026-09-01 | In Progress | develop-bug | Reproduced deterministically by forcing the probe budget; root cause localised to `probeResolver` flattening never-ran into refused |
| 2026-09-01 | Ready for QA | develop-bug | Fix implemented + 5 regression tests; 3 independent mutations confirmed red |
| 2026-09-01 | Ready for QA | develop-bug | Verify cycle 1 FAIL — diff review found 9 issues (3 high, 2 self-inflicted); all fixed, 6th regression test added, re-proved |
| 2026-09-01 | Closed | develop-bug | Verify cycle 2 PASS; DoD accepted; CI 4/4 green on the final head (PR #293) |

---

## Resolution Summary

**Final Status**: ✅ Closed
**Total Iterations**: 2 fix cycles (1 verify FAIL → 1 verify PASS)
**Time to Resolution**: same day (filed and closed 2026-09-01)

**Final Fix Details**:

The parity suite reported a reader divergence that had not happened, because `probeResolver`
returned the same `{ mode: null, reason }` shape whether the resolver **ran and refused** or the
child **never ran at all**. Both fail closed to `manual` — correct, and unchanged — but no caller
could tell a reading of the config from a non-event, and `jsAnswer()` caught only a throw while the
reader warns and returns.

The fix classifies at the source (`kind`: `"never-ran"` | `"refused"` | `null`, now total across all
five return paths), exposes it through an observation-only `onDiagnostic` channel that fires outside
`warnOnce`'s dedupe, stops memoising a probe that never ran — without which the prescribed retry was
a no-op served from cache — and makes `jsAnswer` retry on the shared budget then throw, mirroring
`shellAnswer`. The probe budget became tunable, caller-passed and range-capped.

Nothing about the production reader's return value, its warning, or its fail-closed semantics
changed. All six production call sites pass no `onDiagnostic` and take a byte-identical path.

**Lessons Learned**:

1. **Fixing one side of a symmetry does not fix the symmetry.** `shellAnswer` had this exact fix,
   with a docstring describing this exact failure, for a whole release. The JS side sat three
   functions away and went untouched because nothing tied the two together. When a defect is
   repaired on one of two parallel implementations, the second one is not a separate bug to be
   filed later — it is the same bug, half-closed.

2. **A fail-closed default is invisible from outside, and that is the hazard.** The reader doing the
   *correct* production thing is what made the bug hard to see: `manual` is a legitimate answer, so
   a non-answer wearing it is undetectable. Any caller that needs to distinguish a determination
   from a non-event needs an explicit channel; it cannot be inferred from the value.

3. **A cache keyed on the input must only hold properties of the input.** `_configAccessMemo` stored
   "the box was busy for ten seconds" under a file path. That is not a fact about the file, and
   caching it made the fail-closed answer sticky *and* silently defeated the retry that was supposed
   to recover from it.

4. **"It cannot escalate" is not the same as "it is safe".** The first version of the new timeout
   knob read ambient `process.env`, justified on the grounds that no timeout value can loosen
   access. The invariant it broke was the other one: a repo-local `.env` must not be able to
   restrict — or via a typo hard-fail — every pipeline step behind the resolver's back. Two of the
   three high findings in this bug's own review were defects introduced while fixing it.

5. **A mutation test that cannot prove it mutated is not evidence.** One revert here reported green
   because prettier had reflowed the target line and the mutation string never matched. Assert that
   the edit applied before trusting the result.
