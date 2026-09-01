---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
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
**Status**: 🆕 New
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

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Filed from task.75 — failed 2 of 3 full runs; root cause traced to the JS probe |
