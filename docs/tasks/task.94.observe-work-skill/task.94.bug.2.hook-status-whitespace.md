# Bug Report: Task 94 - SessionStart hook disagrees with the engine on the open count

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-08

## Description

`shared/resources/observe-work-session-start.sh` counts open observations with an anchored exact match:

```sh
grep -l '^status: open$' "$LOG_DIR"/*.md
```

A file whose header reads `status: open ` (one trailing space) matches **neither** that pattern **nor** the statusless fallback (which tests `^status:`), so it is counted as neither open nor statusless. The engine, by contrast, counts it as open.

## Steps to Reproduce

Two observations, one with a trailing space after `open`:

```
0001-a.md → status: open␠
0002-b.md → status: open
```

```
hook   → "1 open observation(s) of 2 in the log."
engine → queue: total 2, open 2, statusless []
```

## Expected Behavior

The hook's open count agrees with `observation-log.js queue`, which is the authority.

## Actual Behavior

The hook **undercounts**. With a single such file and nothing else outstanding, `open` reaches 0 and — on a recently-reviewed log — the hook exits silently.

## Impact

The hook's entire justification is producing an accurate count so that a skipped review becomes visible. Its own comments warn at length against **over**stating the backlog; this **under**states it, which is the worse direction: an overstated backlog is noticed and corrected, an understated one is indistinguishable from a clean log. In the worst case the hook goes fully silent on a log that has outstanding work — reproducing precisely the self-concealing failure the file was written to eliminate.

Not HIGH: it requires malformed frontmatter, and the engine (which writes the files) emits the exact form. The exposure is hand-edited entries and third-party writers.

## Recommendation

Tolerate surrounding whitespace and treat any non-resolved status as open, mirroring the engine's rule (`queue = files − resolved − parked`) rather than pattern-matching the one value:

```sh
grep -lE '^status:[[:space:]]*open[[:space:]]*$' "$LOG_DIR"/*.md
```

Better still, count via the engine when node is available and keep the grep as the fallback — a second implementation of the queue rule is a second thing to keep true.


---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-08

**Fix**: both probes now tolerate surrounding whitespace —

```sh
grep -lE '^status:[[:space:]]*open[[:space:]]*$'      # explicit open
grep -qE '^status:[[:space:]]*[^[:space:]]'           # statusless fallback
```

The second change matters as much as the first: the fallback previously matched a bare `status:` with an empty value and so classified it as *having* a status, dropping it from both counts. Now an empty value falls through to statusless, which the contract reads as open.

A comment records the direction of the error, because it is the non-obvious part: undercounting is worse than overcounting here. An overstated backlog gets noticed and corrected; an understated one is indistinguishable from a clean log — the silent failure the hook exists to prevent.

**Files Modified**: `shared/resources/observe-work-session-start.sh`

**Testing**: Verified against a five-file fixture covering trailing-space, exact, statusless, actioned and parked. Hook and engine now agree exactly: **3 open of 5**, parked and actioned excluded, statusless counted as open. `shellcheck --severity=warning` clean; all four date branches re-proved; JSON re-validated.

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | Ready for QA | qa-fix | Fixed; hook/engine agreement verified on 5 cases |
