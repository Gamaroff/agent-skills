# Bug Report: Task 209 - a link that could not be made is reported as linked

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-10-14

## Description

`_make_agent_link` runs inside `status=$(...)`, where bash turns `set -e` off. When `mkdir -p` or
`ln -s` fails (`scripts/setup-consumer.sh:1982`), the next line still prints `linked`.

## Steps to Reproduce

```bash
echo x > AGENTS.md && mkdir -p .agents/skills/d && echo "not a dir" > .claude
bash scripts/setup-consumer.sh --links-only --link-agents claude
# mkdir: cannot create directory '.claude': File exists
# ln: failed to create symbolic link '.claude/skills': Not a directory
# ✓ Claude Code: .claude/skills → ../.agents/skills   ← not made
# Agent links  ok   exit 0, and /.claude/skills added to .gitignore
```

## Expected Behavior

A failed `mkdir` or `ln` is reported, counted as a problem, and adds no ignore line.

## Actual Behavior

It reports the link as made, exits 0 and writes an ignore line for a link that does not exist.

## Recommendation

Check `mkdir -p` and `ln -s` explicitly and echo a `failed` status.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-14

**Root Cause**: `_make_agent_link` runs inside `status=$(...)`, where bash disables set -e, so a failed mkdir/ln fell through to `echo linked`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-14

**Fix Description**:

- `mkdir -p … && ln -s …` is checked; on failure it warns "could not be created" and returns
  `failed`, which the caller counts as a problem and does not gitignore.

**Files Modified**: `scripts/setup-consumer.sh`, `shared/resources/tests/setup-consumer-agent-links.test.mjs`

**Testing**: `a link that cannot be made is reported as failed, never as linked`: `.claude` as a regular file;
  the run warns, writes no `/.claude/skills` rule, leaves `.claude` untouched and still links
  `CLAUDE.md`. Ignoring the `ln` status turns it red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 2 refute pass, CR-2; reproduced |
| 2026-10-14 | In Progress | qa-fix | Root cause found |
| 2026-10-14 | Ready for QA | qa-fix | mkdir and ln checked explicitly |
