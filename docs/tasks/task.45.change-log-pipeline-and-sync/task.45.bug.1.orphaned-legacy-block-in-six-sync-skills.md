# Bug Report: Task 45 - Orphaned legacy Change Log block left in all six sync SKILL.md files

**Task**: [Link](./task.45.change-log-pipeline-and-sync.md)
**Bug ID**: TASK-45-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-13

## Description

The Phase 4 replacement of each sync skill's `## Change Log Format` section terminated early, leaving the tail of the old block in the file. All six sync skills are affected — `sync-jira-{task,story,epic}` and `sync-github-{task,story,epic}`.

**Root cause.** The replacement used a non-greedy match bounded by a next-H2 lookahead:

```js
const re = /## Change Log Format\n[\s\S]*?(?=\n## )/;
```

The old section contained a fenced ` ```markdown ` sample, and that sample itself contained a `## Change Log` heading. The lookahead matched **inside the code fence**, so the replacement consumed only up to the sample's heading and stopped. Everything after it survived.

This is the same class of defect the Change Log engine itself guards against — `change-log.js` has `fencedRanges` / `insideProtected` precisely because a `##` inside a fence is not a heading. The one-off regex used to edit these files had no such guard.

## Steps to Reproduce

```bash
sed -n '259,268p' skills/sync-jira-task/SKILL.md
```

## Expected Behavior

Each sync skill has exactly one `## Change Log` section, containing the narrowed rules and a link to the canonical spec. No legacy markers, no 2-column table, balanced code fences.

## Actual Behavior

Each of the six files carries, immediately after the new section:

- a **second** `## Change Log` heading (duplicate — 2 per file)
- the old 2-column `| Date (UTC) | Change |` table
- an orphaned `<!-- jira-sync-changelog-end -->` / `<!-- github-sync-changelog-end -->` marker
- a **stray closing ` ``` ` fence** with no opener
- the trailing "Entry rows are matched by a strict regex…" sentence describing the removed format

Measured, current branch vs `origin/develop`:

| File | legacy `-end` | duplicate `## Change Log` | fence parity (was → now) |
| --- | --- | --- | --- |
| `sync-jira-task/SKILL.md` | 1 | 2 | 28 even → 27 **odd** |
| `sync-github-task/SKILL.md` | 1 | 2 | 24 even → 23 **odd** |
| `sync-jira-story/SKILL.md` | 1 | 2 | 24 even → 23 **odd** |
| `sync-github-story/SKILL.md` | 1 | 2 | 26 even → 25 **odd** |
| `sync-jira-epic/SKILL.md` | 1 | 2 | 24 even → 23 **odd** |
| `sync-github-epic/SKILL.md` | 1 | 2 | 26 even → 25 **odd** |

## Impact

**This is a regression introduced by this PR, and it is not cosmetic.**

1. **Unbalanced code fences.** Every file went from even to odd fence parity. A markdown renderer opens a code block at the stray fence and never closes it, so **the entire remainder of each SKILL.md renders as code** — including `## Task File Format`, the frontmatter reference, and every subsequent instruction. These files are read by agents as instructions; a document whose second half is one code block is materially degraded.

2. **Two success criteria are falsified.** The task claims:
   - *"All six sync skills use `<!-- change-log-start -->` only"* — false; the legacy `-end` marker is still present in all six.
   - *"No sync SKILL.md embeds a column list"* — false; the 2-column table survives in all six.

3. **Contradictory instructions.** Each file now states the narrowed rules and then immediately shows the superseded 2-column format under a duplicate heading. An agent reading the file has no basis for preferring one over the other, and the stale block is the more concrete of the two.

Note that the initial verification grep missed this because it searched only for `changelog-start`; the surviving marker is `changelog-end`. A check narrower than the invariant it claims to enforce is how this reached the gate.

## Recommendation

For each of the six files, delete from the duplicate `## Change Log` heading through the trailing "Entry rows are matched by a strict regex…" sentence inclusive — i.e. the entire surviving tail, including the stray fence.

Then re-verify with checks that would have caught it:

```bash
for n in task story epic; do for p in jira github; do
  f="skills/sync-$p-$n/SKILL.md"
  echo "$f: legacy=$(grep -c 'changelog-start\|changelog-end' "$f") \
dup=$(grep -c '^## Change Log$' "$f") \
fence-parity=$(( $(grep -c '^```' "$f") % 2 ))"
done; done
```

All three must read `legacy=0 dup=1 fence-parity=0`.

**Do not repeat the fence-blind regex.** Anchor the deletion on the literal end of the old block, or operate line-range-wise after locating the fence boundaries.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-08-13 | New | QA Engineer | Filed at gate 1 (FAIL) |
| 2026-08-13 | Ready for QA | qa-fix | Fixed in cycle 1 |
