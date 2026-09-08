# Bug Report: Task 94 - environments.md documents the mechanism cycle 3 removed

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 4)
**Date Found**: 2026-09-08

## Description

`references/environments.md` § "The SessionStart hook" describes the hook as it was **before** cycle 3 replaced its counting mechanism. Two of its four "details that decide whether it works" now describe code that does not exist:

- *"Count `status: open` files, never the directory."* The hook no longer counts files. It asks `observation-log.js queue --json`.
- *"`grep -c` exits 1 on zero matches while still printing `0`."* There is no `grep` in the hook any more.

It also omits the two properties that now matter most:

- the count comes from the **engine**, so the queue rule lives in exactly one place;
- the fallback is **silence** — no engine, no `node`, an unparseable payload or an anchor the engine refuses all emit nothing rather than a hand-rolled number.

Separately, the section still points at `shared/resources/observe-work-session-start.sh`. Since cycle 3 the hook is bundled into the skill, so in a skill-only install the correct path is `references/observe-work-session-start.sh`.

## Expected Behavior

The reference describes the shipped mechanism.

## Actual Behavior

It describes a removed one, in the specific voice of hard-won guidance ("each from a recorded failure").

## Impact

**Worse than no documentation.** The stale bullets are not merely out of date — they are *instructions for reimplementing the exact mechanism that produced three defects in three cycles*. A future editor following them would restore the `grep`, and with it the whole class: the undercount, the overcount, and the pair that cancelled.

The stale path is the smaller half, but it is the same shape as TASK-94-003: a reference that resolves in the repo and not in the artifact a consumer installs.

Not HIGH: the shipped code is correct, so nothing is broken today. This is a trap laid for the next change.

## Recommendation

Rewrite the section against the current mechanism. Keep the two bullets that are still true and still earned — the ISO date comparison without `<` inside `[ ]`, and "prove the branches fire, including the one that must stay silent". Replace the two counting bullets with the rule that superseded them, and say why: the queue rule has enough edges that a second implementation is a second thing to keep true, and it was not kept true three times running.

Correct the path to the bundled location.


---

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-08

**Fix**: the SessionStart hook section is rewritten against the mechanism that ships.

- The two stale bullets are gone. In their place, a table of the **three attempts and the defect each produced** — exact-match grep (undercount), unscoped grep (overcount), frontmatter awk (both, cancelling) — and the rule that superseded them: the queue rule has enough edges that a second implementation is a second thing to keep true, and it was not kept true three times running.
- A blockquote states the prohibition directly: **do not reintroduce a shell count, not even as a fallback.** Silence is the fallback, and why.
- The two bullets that were still true and still earned are **kept**, because neither is about counting: the ISO-date comparison without `<` inside `[ ]`, and prove-the-branches-fire including the silent one.
- One line added to the second of those, from this loop's own experience: fixtures must sit on a durable anchor, because under `/tmp` the engine correctly refuses the workspace and the hook falls silent — which looks exactly like a broken hook, and was briefly mistaken for one during cycle 4.
- The path is corrected to `references/observe-work-session-start.sh`, the bundled location.

**Files Modified**: `skills/observe-work/references/environments.md` (an authored reference — its source is the skill, not `shared/resources/`, so this edit is the source and `npm run bundle` reports "in sync").

**Testing**:

| Check | Result |
|---|---|
| Stale bullets remaining | **0** |
| Path resolves in the bundled skill | ✓ |
| `npm run bundle` | "in sync" — an authored reference, not clobbered |
| TOC anchors vs headings | Intact, both directions |
| Length | 207 lines, under the 300-line TOC threshold (has one regardless) |
| Suite | 22/22 |
| `shellcheck` all tracked sources | Clean |

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | Ready for QA | qa-fix | Section rewritten against the shipped mechanism; path corrected |
