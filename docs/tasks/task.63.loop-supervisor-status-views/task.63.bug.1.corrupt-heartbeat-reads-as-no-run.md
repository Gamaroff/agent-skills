# Bug Report: Task 63 — A corrupt heartbeat renders as "no run in flight"

**Task**: [task.63.loop-supervisor-status-views.md](./task.63.loop-supervisor-status-views.md)
**Bug ID**: TASK-63-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA (diff code review, Step 3b)
**Date Found**: 2026-08-28

## Description

`readCurrent()` returns `null` both when `current.json` is **absent** and when it is **present but
unparseable** — `readJson` swallows the `JSON.parse` failure and returns `null` for either. `runState()`
maps `null` to `no-run`, so a torn or corrupt heartbeat renders as:

```
loop-supervisor — no run in flight

  No supervisor is running. This is the normal state after a clean exit —
  current.json is removed when the loop ends.
```

…while the supervisor may be running perfectly well.

This is not theoretical. `writeCurrent()` (`run-loop.mjs:846`) writes the heartbeat with a plain
`fs.writeFileSync` — **not atomically** — every ~5s for the life of the run. A reader that opens the
file inside that window sees a partial object.

## Steps to Reproduce

```bash
# With a valid heartbeat in place:
run-loop.mjs status          # -> "running" (or CRASHED SUPERVISOR)

# Simulate catching a non-atomic write mid-flight:
FULL=$(cat .claude/state/loop-supervisor/current.json)
printf '%s' "${FULL:0:120}" > .claude/state/loop-supervisor/current.json

run-loop.mjs status          # -> "no run in flight"   ← wrong
```

Observed exactly this during QA.

## Expected Behavior

An unreadable heartbeat is reported **as unreadable**. "No run in flight" is a claim about the world
and must only be made when the file is genuinely absent.

## Actual Behavior

An unreadable heartbeat is reported as "no run in flight", exit 0 — the most reassuring of the three
states.

## Impact

This is the same class of error the task was written to prevent. Its own Decisions table says:

> Reporting hours-old data as live is the one genuinely misleading thing a view can do.

Telling an operator the loop has finished when it has not is the same failure wearing different
clothes, and it is worse in one respect: the crashed-supervisor state at least prompts someone to look.
"No run in flight" ends the investigation.

Probability is low — the write window is sub-millisecond against a 5s period, and a small
`writeFileSync` is effectively atomic in the page cache on macOS and Linux — so this is MEDIUM rather
than HIGH. `watch` self-corrects on the next repaint; a one-shot `status` does not.

## Recommendation

Two changes, either of which closes it; both together are better:

1. **Reader (sufficient).** Have `readCurrent` distinguish the two cases — return a sentinel for
   "present but unparseable" — and give `runState` a fourth state that says so. This also covers a
   heartbeat corrupted by anything other than a torn write.
2. **Writer (closes it at source).** Make `writeCurrent` atomic: write to a temp file in the same
   directory, then `fs.renameSync` over the target. Rename within a filesystem is atomic, so no reader
   can observe a partial file.

Keep the reader change even if the writer is fixed: the view should not depend on the writer being
correct to avoid stating a falsehood.

## Notes

The same `readJson`-returns-null-for-two-reasons shape exists at the pre-existing call sites for the
pipeline lock and the halt file (`run-loop.mjs:846`, `:1006`, `:1008`). Those are outside this task's
scope and behave acceptably today — the classifier treats a missing lock and an unreadable one alike,
which is the safe direction there. Worth a look, not worth widening this task.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-28

**Root cause.** `readCurrent` delegated to the shared `readJson` helper, which returns `null` on any
failure — a missing file and a malformed one are indistinguishable at its boundary. `runState` then maps
`null` to `no-run`. The information needed to tell the two apart was discarded one layer below the
decision that needed it.

The window is real rather than theoretical: `writeCurrent` rewrote the file in place with
`fs.writeFileSync` every ~5s for the life of the run.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-28

Both halves of the recommendation were taken, and the reader half is the one that matters:

1. **Reader — `readCurrent` now distinguishes the two.** It returns the parsed object, `null` when the
   file is genuinely absent, or the exported `UNREADABLE` sentinel when the file exists but cannot be
   parsed. It decides with **one** `readFileSync` and the error's `code`, rather than an `exists()`
   probe followed by a read: the runner deletes this file on clean exit, so a probe-then-read would
   race and report a normal shutdown as a corrupt heartbeat.
2. **Renderer — a fourth state.** `runState` returns `unreadable`, rendered as
   `HEARTBEAT UNREADABLE (state unknown)` with body text that says plainly it is **not** the same as no
   run in flight. `statusView` exposes no `run` fields for it, because there are none to trust.
3. **Writer — `writeCurrent` is now atomic.** It writes `current.json.tmp` and `renameSync`s it over
   the target; rename within a filesystem is atomic, so no reader can observe a partial file.
   `cleanup()` removes the temp file too.

The reader fix is kept even though the writer fix closes the window at source. A view should not depend
on the writer being careful in order to avoid stating a falsehood, and the reader change also covers a
heartbeat corrupted by anything other than a torn write.

**Files Modified**

- `skills/loop-supervisor/scripts/run-loop.mjs` — `UNREADABLE` sentinel, rewritten `readCurrent`,
  atomic `writeCurrent`, temp cleanup
- `skills/loop-supervisor/references/render.js` — fourth state in `runState`, `HEAD`, `renderLines`,
  and `statusView`
- `evals/loop-supervisor/unit/render.test.mjs` — 4 tests
- `evals/loop-supervisor/unit/run-loop.test.mjs` — 5 tests
- `skills/loop-supervisor/README.md`, `SKILL.md`, `CHANGELOG.md` — the fourth state documented

**Testing**

- **9 new tests**; skill suite 140 → 149, all green.
- **Mutation-proved, both halves.** Collapsing `readCurrent` back to `null` turns 3 tests red;
  removing the `unreadable` branch from `runState` turns 3 tests red. Restored: green.
- **Adversarial transition pass** (qa-fix Step 3.5) — the over-correction risk here is sweeping the
  *normal* case into the new state, so each transition was probed directly:

  | Transition | Result |
  | --- | --- |
  | Torn heartbeat (the bug) | `HEARTBEAT UNREADABLE`, exit 0 |
  | Teardown — file removed on clean exit | still `no run in flight` ✅ **not** over-corrected |
  | Error path — stray `.tmp` left behind | ignored, not mistaken for the heartbeat |
  | Never started — whole state dir absent | `no run in flight`, exit 0 |
  | Valid heartbeat | unchanged |

**Verification Steps for QA**

1. `printf '%s' "$(head -c 120 current.json)" > current.json` then `run-loop.mjs status` →
   must print `HEARTBEAT UNREADABLE`, never `No supervisor is running`.
2. `rm current.json` then `run-loop.mjs status` → must still print `no run in flight` (the fix must
   not swallow the normal case).
3. Confirm no `current.json.tmp` survives a completed run.

---

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-08-28 | New | QA | Found in diff code review (qa-task Step 3b), cycle 1 |
| 2026-08-28 | In Progress | qa-fix | Root cause identified in `readCurrent`/`readJson` |
| 2026-08-28 | Ready for QA | qa-fix | Reader + renderer + atomic writer; 9 tests, both halves mutation-proved |
