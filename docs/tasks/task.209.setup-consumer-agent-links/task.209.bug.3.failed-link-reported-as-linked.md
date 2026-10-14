# Bug Report: Task 209 - a link that could not be made is reported as linked

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
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

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Cycle 2 refute pass, CR-2; reproduced |
