# Bug Report: Task 94 - Third counting divergence — the hook must stop reimplementing the queue rule

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-6
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 3)
**Date Found**: 2026-09-08

## Description

The cycle-2 fix scoped the status read to the frontmatter block, which closed the body-quoting overcount. Two divergences from the engine remain, in opposite directions:

| Case | Engine | Hook |
|---|---|---|
| `status: "open"` (quoted value) | parses to `open` → **open** | `status='"open"'` → **not open** (undercount) |
| File with **no frontmatter** at all | excluded from the log entirely | `status=''` → **open** (overcount) |

**They cancelled in the first fixture I tried.** Both present, the hook reported `2 open` and the engine reported `2 open` — apparently agreeing. The tell was `total`: hook 3, engine 2.

## Steps to Reproduce

```
0001-quoted.md → ---\nid: 1\nstatus: "open"\n---\n
0002-nofm.md   → # stray note\nnot an observation\n
```

```
hook   → "2 open observation(s) of 3 in the log."
engine → total 2, open 2      # it never saw 0002 at all
```

Per-file:

```
0001-quoted.md: status='"open"' → not-open     (engine: open)
0002-nofm.md:   status=''       → OPEN         (engine: not a log entry)
```

## Expected Behavior

The hook's count agrees with `observation-log.js queue` on every input.

## Actual Behavior

Two opposite divergences that can mask each other.

## Impact

Individually small, and the hook is opt-in. **The pattern is the finding.** This is the **third** counting defect in three cycles, all from one root cause: the hook re-implements the engine's queue rule in shell.

- cycle 1 — undercount (exact-match `grep`)
- cycle 2 — overcount (unscoped `grep`)
- cycle 3 — both, in one mechanism, cancelling

Gate 2 recorded the rule in advance: *"if a third arises, replace the grep with an engine call rather than correcting it again."* A fourth correction to a mechanism corrected three times is the loop's failure mode, not its progress.

## Recommendation

**Replace the mechanism.** Call the engine — it is the authority, it is already a bundled sibling of the hook, and it answers exactly this question:

```sh
command node "$ENGINE" queue --workspace "$OBS_WORKSPACE" --json
```

Fall back to **silence**, not to a hand-rolled count, when `node` or the engine is unavailable. A hook that cannot compute the number correctly should say nothing rather than say a number that is wrong — the whole justification for this file is an *accurate* count, and a wrong one is worse than none.

That also deletes the `frontmatter_status()` helper, the whitespace handling and the statusless rule from the hook: three pieces of duplicated logic that each have to stay true independently.


---

## Developer Fix Cycle

### Iteration 1 — mechanism replaced, not corrected

**Date**: 2026-09-08

Per gate 2's pre-committed rule and the loop's third-strike logic, this was **not** patched a third time.

**What was deleted**: `frontmatter_status()`, the whitespace handling, the statusless rule, and every `grep` over the log directory — three pieces of duplicated logic that each had to stay true independently, and did not, three cycles running.

**What replaced them**: one call to the authority.

```sh
queue_json=$(command node "$ENGINE" queue --workspace "$WORKSPACE" --json) || exit 0
```

The hook now only *transcribes* `total` and the length of `open` from the engine's payload. It re-derives nothing.

**The fallback is SILENCE, not a hand-rolled count.** Missing engine, missing `node`, unparseable payload, or an anchor the engine refuses — all exit 0 emitting nothing. The whole justification for this file is an accurate number; a wrong one is worse than none, because a wrong one gets acted on.

**One defect found and fixed inside this cycle** (recorded rather than fixed silently): the first transcription had an off-by-one. The segment regex matched from `"open"` through `]`, leaving the key itself inside the captured text, so counting quoted strings counted the key too — hook 6, engine 5. Caught by re-running the nine-case fixture rather than by inspection. Fixed by stripping to the `[` first.

**A second gap the replacement exposed**: the hook was not bundled into the skill, so a skill-only install could neither reach it (`environments.md` pointed at a repo path) nor satisfy its `${script_dir}/observation-log.js` default. `SKILL.md` now references it, so the bundler copies it into `references/` beside the engine — verified working with **no** `OBS_ENGINE` set.

**Files Modified**:
- `shared/resources/observe-work-session-start.sh` — rewritten
- `skills/observe-work/SKILL.md` — step 4 references the hook, which is what makes the bundler pull it in

**Testing**:

| Check | Result |
|---|---|
| Nine-case fixture, all three cycles' inputs | Hook and engine agree exactly — **5 open of 8** |
| Default engine path, no `OBS_ENGINE` | Resolves; agrees with the engine |
| Four date branches | All correct, including the silent one |
| Engine path missing | **Silent** ✓ |
| `node` unavailable | **Silent** ✓ |
| Ephemeral anchor (engine refuses) | **Silent** ✓ — new, and correct: no invented count |
| JSON | Valid |
| `shellcheck --severity=warning` | Clean |

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | Ready for QA | qa-fix | Mechanism replaced with an engine call; fallback is silence |
