# QA Report: Task 63 — cycle 2 (re-review after fixes)

**Task**: [task.63.loop-supervisor-status-views.md](./task.63.loop-supervisor-status-views.md)
**Gate File**: [task.63.gate.2.loop-supervisor-status-views.yml](./task.63.gate.2.loop-supervisor-status-views.yml)
**Previous Gate**: [task.63.gate.1.loop-supervisor-status-views.yml](./task.63.gate.1.loop-supervisor-status-views.yml) — CONCERNS (90/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-28
**Gate Status**: PASS

---

## Re-Review Context

| Cycle-1 issue | Status | Evidence |
| --- | --- | --- |
| **TASK-63-BUG-1** — a corrupt heartbeat renders as "no run in flight" (MEDIUM) | ✅ **FIXED** | Re-tested independently across all four states and four lifecycle transitions; both halves mutation-proved |
| LOW-1 `process.exit` after async write | Open — accepted | Re-confirmed bounded (~2.5KB); carried to `future` |
| LOW-2 `watch --json` is a no-op | Open — accepted | Carried to `future` |
| LOW-3 tall-frame repaint | Open — accepted | Carried to `future` |

Scope: files changed since gate 1 — `run-loop.mjs`, `render.js`, both test files, README, SKILL.md,
CHANGELOG.

---

## Executive Summary

The fix is correct and, unusually, was verified rather than accepted: every state and every transition
was re-driven against real files, and both halves of the change were mutation-proved by QA rather than
taken from the fix report.

The re-review also found — and the cycle then fixed — a fragility **introduced by the fix itself**: the
new sentinel was duck-typed across a module boundary, so a valid heartbeat carrying that key rendered as
unreadable. That is the same "state the opposite of the truth" failure the new state exists to prevent,
pointed the other way. Demonstrated first, fixed second, pinned by a test third.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Verification of the Fix

Driven against real state files, not inferred from the diff:

| Case | Expected | Observed |
| --- | --- | --- |
| Torn heartbeat (120-byte prefix) | `HEARTBEAT UNREADABLE` | ✅ and does **not** contain "No supervisor is running" |
| Same case, `--json` | `state: unreadable`, `run: null` | ✅ honest and machine-readable |
| Heartbeat removed (clean exit) | still `no run in flight` | ✅ **not** over-corrected into the new state |
| Empty file | unreadable | ✅ |
| Directory in place of the file | unreadable | ✅ |
| Stray `current.json.tmp` | ignored | ✅ |
| Whole state dir absent | `no run in flight`, exit 0 | ✅ |
| Valid heartbeat | unchanged | ✅ |

The third row is the one that mattered most. The obvious way to fix this bug is to widen the unreadable
branch until it swallows the normal case, which trades a rare wrong answer for a constant one. It does
not.

### Mutation-proof spot check

Both halves reverted in source by QA and confirmed red before restoring:

| Mutation | Result |
| --- | --- |
| `readCurrent` collapses unreadable back to `null` (the original bug) | **3 tests red** |
| `runState` loses its `unreadable` branch | **3 tests red** |

`mutation-proven: yes` for both. Neither test passes with its behaviour removed.

---

## New Finding This Cycle — Found, Fixed, and Pinned

**The sentinel was forgeable by the file it describes.**

`UNREADABLE` was defined in `run-loop.mjs` and recognised in `render.js` by a `__unreadable` property.
Because the check was duck-typed, a **valid** heartbeat containing that key rendered as
`HEARTBEAT UNREADABLE`. Demonstrated by writing the key into a good heartbeat and running `status`.

Severity LOW — unreachable through the writer, which never emits it — so it did not gate. It was fixed
anyway: six lines, and the failure mode is precisely the one this task is about.

The sentinel now lives in `render.js` beside the state machine that interprets it and is compared by
**identity**. A test asserts that a heartbeat carrying both key spellings still renders as the run it
describes, and that a structural copy of the sentinel is not the sentinel.

This is the qa-fix Step 3.5 pass earning its place: *the fix is new code, not the closure of a finding.*

---

## Regression Testing

| Area | Result |
| --- | --- |
| The other three render states | PASS — re-driven individually |
| `run` / `dry-run` | PASS — untouched |
| Atomic write vs `cleanup()` | PASS — no `.tmp` survives; a stray one is ignored |
| Skill suite | PASS — 150/150 (was 140 at cycle 1) |
| Format / bundle / catalog | PASS — `format:check` clean, bundle in sync, catalog no diff |

---

## NFR Assessment (delta from cycle 1)

**Reliability: CONCERNS → PASS.** The single reason for the cycle-1 downgrade is closed at both ends —
the reader no longer collapses two states, and the writer no longer creates the window. The reader fix
is retained despite the writer fix, which is the right call: a view should not depend on the writer
being careful in order to avoid stating a falsehood.

**Maintainability: PASS, improved.** The sentinel move removed a magic key crossing a module boundary.

Security and Performance unchanged from cycle 1.

---

## A flaky test in the suite — unrelated to this task, but not dismissed

`shared/resources/tests/jira-interception.test.mjs` §8b failed in **4 of 6** full-suite runs on this
branch, always as a 30s wall-clock kill (`exitCode null`), never an assertion.

Investigated rather than waved away, because a clean-`develop` control run was green and "pre-existing"
therefore could not simply be asserted:

| Probe | Result |
| --- | --- |
| The file in isolation | 48/48, three times |
| `move-sprint-issues.sh` run exactly as the test runs it | **795ms, status 0** — against a 30s budget |
| The file under 8 CPU spinners | 48/48 — plain CPU load does not reproduce it |
| Clean `develop`, full suite | green |

So the script is fine and the test is fine alone; it fails only inside the full suite. The only causal
link to this branch is that it adds test files to `node --test`'s parallel pool.

**The controlled experiment settles it.** Clean `origin/develop`, with nothing added but **two filler
test files containing 30 trivial assertions** — no code from this task at all — was run through the same
suite:

| Run | Result |
| --- | --- |
| Clean `develop` | 1794/1794 green |
| Clean `develop` **+ 2 filler test files** | **5 failures**, including `§8b move-sprint-issues.sh` |
| This branch (2 real test files) | 1 failure |

The filler files contain `assert.equal(1, 1)` and nothing else, so the only variable is the number of
files in `node --test`'s parallel pool. Clean `develop` under equivalent pressure fails **worse** than
this branch does.

**Conclusion: this task's code is not implicated.** The suite has a pre-existing fragility — several
spawn-heavy shell-integration tests in `shared/resources/tests/` carry 20–30s wall-clock budgets and
time out when more test files run concurrently. All five control failures are that shape:

```
§8b move-sprint-issues.sh …                          30371ms
§8b manage-sprint-state.sh …                         30352ms
§13 CR-2 the sprint gate honours AGENT_SKILLS_… …    30765ms
§15 C3-CR6 the mode is resolved once …               20157ms
§9  jira-create-epic.js records and makes no … …     20721ms
```

**Not fixed here.** Widening someone else's timeouts under cover of an unrelated task is how a suite
stops meaning anything, and the real fix is probably to bound `node --test` concurrency rather than to
raise five budgets. Carried to the gate's `future` list and surfaced for its own bug report.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The cycle-1 finding is fixed and independently verified; the fragility the fix introduced
was caught in the same cycle, fixed and pinned; no open issues remain against this task.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: `/finalise` — DoD verification and acceptance.
