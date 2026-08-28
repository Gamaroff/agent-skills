# QA Report: Task 63 — Make an unattended run watchable from a second terminal, and audible when it stops

**Task**: [task.63.loop-supervisor-status-views.md](./task.63.loop-supervisor-status-views.md)
**Gate File**: [task.63.gate.1.loop-supervisor-status-views.yml](./task.63.gate.1.loop-supervisor-status-views.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-28
**Gate Status**: CONCERNS

---

## Executive Summary

The implementation delivers all nine success criteria and the full suite is green at 1824/1824. The
renderer is a genuinely pure function with its clock and liveness probe injected, which is what makes
the three states testable rather than merely claimed, and five invariants were mutation-proved rather
than assumed.

One finding blocks a clean PASS. An unparseable `current.json` is indistinguishable from an absent one,
so a torn heartbeat renders as **"no run in flight"** while the supervisor is still running. That is the
same failure class this task exists to prevent, stated in its own Decisions table, and the heartbeat is
written non-atomically every ~5s.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — staging approved; production on TASK-63-BUG-1 being fixed or knowingly accepted

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All five implementation phases completed and checked
- [x] Tests passing (1824/1824)
- [x] Breaking changes documented (none — additive)
- [x] Code on feature branch with open PR ([#277](https://github.com/Gamaroff/agent-skills/pull/277))

### Testing Approach

- [x] Automated testing (unit)
- [x] Manual testing (both views driven against real state files)
- [x] Regression testing
- [x] Code review (diff, adversarial)
- [x] Mutation-proof spot check
- [ ] Performance testing — not applicable; bounded file reads
- [ ] Security review — scoped below under NFR

### Review Methodology

Direct tools. The Adaptive Review Strategy puts this between its "small" and "large" rows — five
phases, single module, low risk — so the default applies: direct tools first, escalate only on gaps.
No gaps arose that parallel agents would have closed. Step 3b's diff review was run as a single
adversarial pass over the branch diff.

**Traceability mapper skipped**: the task's Success Criteria are a checkbox list, not a table
(`HAS_SUCCESS_CRITERIA_TABLE = false`), so the mapper's precondition was not met.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Pure renderer + three-state tests | PASS | Verified | Extracted to `references/render.js`; the open "extract or inline" decision was resolved in the document, not left implicit |
| 2. `status` (+ `--json`) | PASS | Verified | Branches ahead of `resolveBinary("claude")` — correct, and load-bearing for the second-terminal case |
| 3. `watch` | PASS | Verified | 3 frames / 4.6s; 2 in-place repaints; **0** screen or scrollback clears; cursor restored |
| 4. `--notify` / `--webhook` | PASS | Verified | Warn-and-continue proven against a genuinely unreachable endpoint |
| 5. Docs and gates | PASS | Verified | Both stale "no `status`/`watch` yet" retractions landed; README reframed rather than appended to |

**Overall Phase Completion**: 5/5

Phase 1 carries the one finding — the renderer's handling of an unreadable heartbeat — hence
`phases_with_issues: [1]` in the gate.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status |
| --- | --- | --- | --- | --- |
| 1 | Three states + `--json` parity | all three | all three; one snapshot backs both modes | PASS |
| 2 | `watch` ~2s, restores terminal, keeps scrollback | ~2s | 3 frames/4.6s, 0 clears, cursor restored | PASS |
| 3 | Dead pid → crashed, never live | always | pid probe; 3 tests red when reverted | PASS |
| 4 | No run in flight exits 0 plainly | exit 0 | exit 0, plain statement | PASS |
| 5 | Notification once, on terminal stop, names reason | once | once at the summary write; double-SIGINT excluded and documented | PASS |
| 6 | Failed notification leaves exit status unchanged | unchanged | verified against `http://127.0.0.1:1`; sync + async paths | PASS |
| 7 | Views safe concurrently, write nothing | 0 writes | no state dir created by a read; 3 concurrent reads clean | PASS |
| 8 | Both ledger row shapes render | both | `spawned:false` row shows outcome/reason, `—` elsewhere | PASS |
| 9 | `npm test` + `format:check` green | green | 1824/1824; format:check clean | PASS |

All nine met. The gate is CONCERNS on a defect the criteria do not cover — which is the point of
reviewing the diff rather than only the checklist.

---

## Breaking Changes Validation

**None claimed, none found.** Two new subcommands and two new flags. `run` and `dry-run` are byte-for-byte
unchanged in behaviour; the new `parseArgs` entries are additive and the existing `default: throw` on
unknown options still fires (asserted). Migration path: not applicable.

**Assessment**: PASS

---

## Issues Found

### HIGH Severity (0)

None.

### MEDIUM Severity (1)

**Issue: A corrupt heartbeat renders as "no run in flight"**

- **Severity**: MEDIUM
- **Category**: Functional (correctness)
- **Bug Report**: [task.63.bug.1.corrupt-heartbeat-reads-as-no-run.md](./task.63.bug.1.corrupt-heartbeat-reads-as-no-run.md)
- **Observation**: `readCurrent()` returns `null` for both "absent" and "present but unparseable", so
  `runState()` reports `no-run`. Reproduced by truncating `current.json` to 120 bytes: `status` printed
  *"No supervisor is running"* and exited 0.
- **Impact**: `writeCurrent` writes non-atomically every ~5s, so a reader can catch a partial file. The
  resulting message tells the operator the loop has finished when it has not — the same class of error
  the task's own Decisions table calls "the one genuinely misleading thing a view can do", and worse in
  one respect: the crashed state prompts a look, "no run in flight" ends the investigation.
- **Recommendation**: distinguish absent from unparseable in the reader and give it its own state;
  optionally make `writeCurrent` atomic via temp-file + rename. Keep the reader fix regardless — the
  view should not rely on the writer being correct in order to avoid stating a falsehood.
- **Priority**: P2

### LOW Severity (3)

1. `runStatus` calls `process.exit(0)` immediately after `process.stdout.write`, and stdout to a pipe is
   async in Node. **Tested, not merely reasoned about**: against a 4000-row ledger the JSON payload was
   2517 bytes across 3 runs, all valid — `recent[]` is capped at 5 rows, so the output is bounded well
   under a 64KB pipe buffer. Not a defect today; latent if that cap is ever removed.
2. `watch --json` parses successfully and changes nothing. A flag that is accepted and ignored is a
   small trap; either honour it or reject it.
3. A frame taller than the terminal breaks the cursor-up arithmetic, because the top of the frame has
   scrolled away. Inherent to in-place repaint and not worth code — worth a line in the README.

**Total**: HIGH 0, MEDIUM 1, LOW 3

---

## NFR Assessment

### Performance — PASS

Two file reads per frame; the display model caps `recent[]` at 5 rows, so payload size is independent
of ledger length (measured: 2.5KB against 4000 rows). Repaint at 2s against a 5s heartbeat means a
frame is never perceived as frozen, and never busier than it needs to be.

### Reliability — CONCERNS

Strong on the paths that were designed for: notification failure is warn-and-continue and was proven
against a real unreachable endpoint; a torn final ledger line is skipped so the complete rows still
show; concurrent reads are clean; the pid probe correctly avoids the time-based staleness trap.

The concern is the one path that degrades in the wrong direction — an unreadable heartbeat becomes the
reassuring state rather than an honest one. See TASK-63-BUG-1.

### Security — PASS

Both views are read-only and consume nothing from the run beyond two files it wrote. The webhook URL is
operator-supplied and sent verbatim; no credential is read, logged, or forwarded, and nothing from the
ledger is interpolated into a shell. `osascript` is invoked through `spawnSync` with an argv array, and
the script text is `JSON.stringify`-quoted, so a hostile `reason` string cannot escape into a shell.

### Maintainability — PASS

The renderer is genuinely pure with `nowMs` and `isAlive` injected, which is what makes the dead-pid
state testable without arranging a real dead process — the design choice most responsible for this
being reviewable at all. One display model backs both text and `--json`, so the two cannot disagree.
CommonJS placement matches its siblings and the reasoning is recorded in the file.

---

## Code Review

Adversarial pass over the branch diff (Step 3b), `code_review_blocking=true` from the pipeline.

**Correctness bugs (1):**

- [medium/high] `skills/loop-supervisor/scripts/run-loop.mjs:451` — `readCurrent` collapses "absent" and
  "unparseable" into `null`, so `runState` reports `no-run` for a corrupt heartbeat → distinguish the
  two and render an explicit unreadable state. **Promoted to gate `top_issues` as TASK-63-BUG-1** under
  the run-level blocking override.

**Cleanups (3):**

- `run-loop.mjs` (`runStatus`) — `process.exit(0)` after an async stdout write; bounded output makes it
  safe today, but the coupling is invisible → drop the explicit exit, or flush before it.
- `run-loop.mjs` (`main`) — `watch` accepts `--json` and ignores it → honour or reject.
- `references/render.js` (`renderLines`) — frame taller than the terminal defeats cursor-up repaint →
  document the limit.

### Mutation-proof spot check

Five invariants were reverted in source and confirmed red before restoring — verified by re-running,
not taken from the developer's report:

| Invariant | Mutation | Result |
| --- | --- | --- |
| Ledger field is `turns` | read `numTurns` instead | 1 test red |
| Dead pid ⇒ crashed | always return `running` | 3 tests red |
| Absent fields render `—` | emit raw value | 2 tests red |
| Notification warns, never throws | rethrow | 1 test red |
| Recent = last five | take first five | 1 test red |

`mutation-proven: yes` for all five. No test in the new set passes with its behaviour removed.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `run` / `dry-run` unchanged | PASS — untouched code paths; existing suite green |
| `parseArgs` closed allowlists still closed | PASS — unknown subcommand and unknown option both still throw |
| Existing loop-supervisor suite | PASS — 140/140 including 110 pre-existing |
| Repo-wide suite | PASS — 1824/1824 |
| Bundler / catalog | PASS — `bundle` in sync, `generate-catalog` no diff |

One pre-existing test was modified: it used `watch` as its example of an *unknown* subcommand, which
shipping `watch` falsified. Replacing the example preserves the assertion's intent — verified by
confirming it still throws.

---

## Test Artifacts

### Files Reviewed

- `skills/loop-supervisor/references/render.js` (new)
- `skills/loop-supervisor/scripts/run-loop.mjs`
- `evals/loop-supervisor/unit/render.test.mjs` (new), `run-loop.test.mjs`
- `skills/loop-supervisor/README.md`, `SKILL.md`, `docs/reference/commands.md`, `CHANGELOG.md`

### Commands Executed

```bash
npm test                                  # 1824/1824
npx prettier --check .                    # clean
node --test 'evals/loop-supervisor/unit/*.test.mjs'   # 140/140
run-loop.mjs status / status --json / watch           # all three states
```

### Coverage

No coverage instrumentation in this repo's suite. Coverage assessed structurally: 30 tests over 8
exported functions, three display states, both ledger row shapes, and four notification paths — with
five invariants mutation-proved.

---

## Recommendations

### Immediate (Blocking)

1. Fix TASK-63-BUG-1 — distinguish an absent heartbeat from an unreadable one.

### Short-term (Non-Blocking)

1. Drop or flush before `process.exit` in `runStatus`.
2. Honour or reject `watch --json`.
3. Note the tall-frame repaint limit in the README.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Every success criterion is met and the suite is green, but the diff review surfaced one
medium-severity correctness defect in which the view states the opposite of the truth. Deterministic
rule 2 applies (a medium `top_issues` entry) and reliability is CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-63-BUG-1 fixed, or explicitly accepted as a known transient.

---

**Next Steps**: `/qa-fix` addresses TASK-63-BUG-1, then re-review (cycle 2).
