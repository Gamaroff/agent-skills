# Bug Report: Task 94 - Hook counts a body line as a status, overcounting open observations

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-09-08

## Description

The hook's status probes match **anywhere in the file**, not just the YAML frontmatter:

```sh
grep -lE '^status:[[:space:]]*open[[:space:]]*$' "$LOG_DIR"/*.md
```

A resolved observation whose **body** contains a line reading `status: open` is counted as open.

The cycle-1 fix (TASK-94-002) closed the *undercount* and left this *overcount* — both are the same root cause: the hook re-implements the queue rule with `grep` instead of scoping to frontmatter.

## Steps to Reproduce

One observation, `status: actioned` in its frontmatter, with a body that quotes the string:

```
---
id: 1
status: actioned
resolved: 2026-09-01
---

## Issue
The hook matched a line reading:
status: open
anywhere in the file.
```

```
hook   → "1 open observation(s) of 1 in the log."
engine → total 1, open 0
```

## Expected Behavior

The hook's count agrees with `observation-log.js queue`.

## Actual Behavior

The hook reports 1 open where the engine reports 0, and nags on a fully resolved log.

## Impact

Overcounting rather than undercounting, so it is the less dangerous direction — a phantom nag is noticed, unlike a silent one. But it is **not hypothetical for this skill**: `observe-work`'s observations are *about* skills and their status fields, and the three bug reports written in cycle 1 each quote `status: open` at the start of a line. An observation written about this very hook would trip it.

## Recommendation

Scope both probes to the frontmatter block — everything between the first `---` and the next `---`:

```sh
awk '/^---[[:space:]]*$/{n++; next} n==1' "$f"
```

and run the status match over that. Or count through the engine when `node` is available, keeping the grep as a fallback — a second implementation of the queue rule is a second thing to keep true, and this is now the second bug arising from that duplication.


---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-08

**Fix**: both `grep` probes are replaced by a `frontmatter_status()` helper that reads `status:` from between the first two `---` fences only, trimming surrounding whitespace. The count then follows the contract's rule directly — a missing or empty status is read as **open**, which is the only default that cannot make a malformed file vanish from the work queue.

The comment records **both** defects and their shared root cause, because the pair is the point: an unscoped match with an over-tight pattern produced an undercount on one side and an overcount on the other.

**Files Modified**: `shared/resources/observe-work-session-start.sh`

**Testing**: verified against a **seven**-case fixture — trailing-space, exact, statusless, actioned, parked, body-quotes-the-string, and empty-value. Hook and engine agree exactly: **4 open of 7**, with the engine independently reporting the same two files as statusless. All four date branches re-proved; JSON re-validated; `shellcheck --severity=warning` clean.

**Note for QA**: this is the **second** correction to the same mechanism. The gate records that a third instance should replace the grep with an engine call rather than correct it again.

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | Ready for QA | qa-fix | Frontmatter-scoped; hook/engine agreement verified on 7 cases |
