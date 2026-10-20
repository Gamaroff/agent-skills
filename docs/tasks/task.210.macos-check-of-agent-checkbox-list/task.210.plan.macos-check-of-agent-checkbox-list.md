---
id: task.210.plan
title: "Implementation Plan: macOS check of the setup-consumer agent checkbox list"
type: plan
task-ref: task.210.macos-check-of-agent-checkbox-list.md
---

# Implementation Plan: macOS check of the setup-consumer agent checkbox list

> Requirements and success criteria: [task.210.macos-check-of-agent-checkbox-list.md](task.210.macos-check-of-agent-checkbox-list.md)

## Overview

A manual run in real macOS terminals, then fixes through the pipeline for anything found.

## Phase-by-Phase Implementation Guide

### Phase 1: Prepare

```bash
mkdir -p /tmp/t210 && cd /tmp/t210 && git init -q && echo '# x' > AGENTS.md && mkdir -p .agents/skills/demo
/bin/bash --version | head -1     # GNU bash, version 3.2.x
```

### Phase 2: Run the checks

From zsh (the default macOS shell):

```bash
/bin/bash <agent-skills>/scripts/setup-consumer.sh --links-only --dry-run
```

Resize to about 60 columns and repeat. After Ctrl-C, type a line longer than the window: it must wrap
(autowrap restored), echo, and show the cursor. Then run without `--dry-run`, tick Claude Code and
Cline, and check `ls -la CLAUDE.md .claude/skills .cline/skills` and `.gitignore`.

### Phase 3: Record and fix

Write the result as `task.210.qa.1.*`. For a defect: `/create-bug-report` against task 210, then fix
through `/develop-task`. Prefer a regression test in `setup-consumer-agent-links.test.mjs` that
reproduces on Linux CI (the `drive()` pty helper can set the window width).

## Key Patterns and References

- `checklist()` / `_checklist_restore()` in `scripts/setup-consumer.sh`
- `drive()` and `screen()` in `shared/resources/tests/setup-consumer-agent-links.test.mjs`

## Testing Approach

Manual per Phase 2; automated regression test per defect where CI can reproduce it.
