---
id: task.309.plan
title: "Implementation Plan: Pin the 6c head writer position and clear the stale head file"
type: plan
task-ref: task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md
---

# Implementation Plan: Pin the 6c head writer position and clear the stale head file

> Requirements and success criteria: [task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md](task.309.pin-6c-head-writer-position-and-clear-stale-head-file.md)

## Overview

Edit one line of the 6c poll block so it also clears the head file, then extend the existing writer test with an order assertion and add one test that runs the shipped `rm` line. Edit `skills/finalise/SKILL.md` (a source) and re-bundle; never edit a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1: Pin the writer position

**Files to modify:**
- `evals/shared/tests/finalise-publish-boundary.test.mjs` — the writer test at `:620` (`6c poll block records the acceptance head it starts on, for the later turn to read`)

**Exact changes:**

The test already has `codeLines(sixC)` (comment lines stripped). Find the three lines by their own patterns, assert each is found once, then compare indexes:

```js
const lines = codeLines(sixC);
const idx = (re) => lines.findIndex((l) => re.test(l));
const rmAt = idx(/^\s*rm -f "\$RESULT" "\$PIDFILE"/);
const writeAt = idx(/^\s*printf '%s\\n' "\$CI_HEAD_2" > \.claude\/state\/finalise-ci-head-2\.txt\s*$/);
const launchAt = idx(/^\s*nohup bash "\$POLL"/);
assert.ok(rmAt >= 0 && writeAt >= 0 && launchAt >= 0, "…names which line is missing…");
assert.ok(rmAt < writeAt && writeAt < launchAt, "clear, then record the head, then launch the poll");
```

Keep the existing "exactly one writer" assertion. Note `codeLines` strips only whole-line comments and trailing ` # …`, and the `rm` line's trailing text is unchanged in Phase 2, so the pattern matches before and after.

**Mutation proof:** in a scratch copy of the tree (never the working file), move the writer line below `nohup … &`; run the test; expect red with the order message. Restore and re-run green.

### Phase 2: Clear the stale head file

**Files to modify:**
- `skills/finalise/SKILL.md` — `:2269`: `rm -f "$RESULT" "$PIDFILE"` becomes `rm -f "$RESULT" "$PIDFILE" .claude/state/finalise-ci-head-2.txt`. Extend the comment above the writer (`:2270`–`:2273`): the head file is cleared with the result and pid files so a run that aborts before the writer leaves none, and the reader then HALTs "not recorded" rather than reading a previous run's head.
- `evals/shared/tests/finalise-publish-boundary.test.mjs` — a new test beside the writer test.

**Exact changes (test):** extract the `rm` line as the writer test extracts the writer line. In a scratch directory, create `.claude/state/finalise-ci-head-2.txt` containing a stale SHA, plus `RESULT` and `PIDFILE` variables set to the paths in the same directory; run the shipped `rm` line with `bash -c`; assert the head file is absent. Then run the writer line with a new `CI_HEAD_2` and assert the file holds it. Remove the scratch directory in a `finally` (`scripts/test-tmpdir.mjs` rejects a leaking prefix; use the `t309-` prefix the way the existing `t308-writer-` test does).

**Mutation proof:** drop `.claude/state/finalise-ci-head-2.txt` from the `rm` line in a scratch copy; the new test is red (the stale file survives).

### Phase 3: Bundle, docs and gate

- `npm run bundle`, then `npm run bundle:check`; `git status` shows any regenerated copy (carriers: `git grep -l finalise-ci-head-2 -- skills`); commit them with the change.
- `CHANGELOG.md`: under `[Unreleased]` › Fixed, one line citing `(task 309)`.
- `npm run validate -- skills/finalise/`; `command node --test evals/shared/tests/finalise-publish-boundary.test.mjs`; the fast gate via `npm run test:remote`; the touched suite once with `CI=true` before pushing.

## Key Patterns and References

- Task.308's writer test is the pattern: it runs the shipped line in a scratch repository rather than grepping for text (assert behaviour, not source text).
- Mutations are run in a scratch copy of the tree, never the working file.
- `node` is an nvm function on this machine: use `command node`.

## Testing Approach

- Both new assertions live in `evals/shared/tests/finalise-publish-boundary.test.mjs`, which runs per-PR under `npm test`.
- Calibrate each assertion on a case it must catch before trusting its green: the two mutations above are that calibration, and their red output belongs in the QA report.
