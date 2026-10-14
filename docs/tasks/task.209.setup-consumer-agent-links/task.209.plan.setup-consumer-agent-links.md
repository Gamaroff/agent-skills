# Plan: task.209 setup-consumer.sh links each user's agents

## Overview

Add a checkbox-list step to `scripts/setup-consumer.sh` that makes the local, gitignored links each
picked agent needs. Task:
[`task.209.setup-consumer-agent-links.md`](task.209.setup-consumer-agent-links.md).

## Phase-by-Phase Implementation Guide

### Phase 1: Checkbox list

`checklist "Title" label…` beside the prompt helpers. Keys from `/dev/tty`; draws to `/dev/tty`;
`CHECKLIST_DEFAULT` pre-ticks; result in `CHECKLIST_RESULT`; returns 1 with no terminal. Movement uses
`x=$(( … ))`, never `(( x = … ))`, which returns 1 on a zero result and ends the wizard under `set -e`.

### Phase 2: Agent table and links

`AGENT_TABLE` records `id|Label|link>target …`. `_make_agent_link` never replaces, never dangles, and
resolves the target by text (the link's folder usually does not exist yet). `_ignore_agent_link`
skips a path git already ignores, else appends `/<link>`.

### Phase 3: Wiring

`link_agents` after `write_tracker_workflow` (skills must be installed). `--link-agents`,
`--link-agents=`, `--links-only`. `--update` links only when the flag is given. Links-only summary
omits the install advice.

### Phase 4: Docs and tests

Rewrite getting-started §1a around the ten-agent table; add step 8b. New
`setup-consumer-agent-links.test.mjs`. CHANGELOG `[Unreleased]`.

## Key Patterns and References

- `SETUP_CONSUMER_NO_MAIN=1` sourcing seam, as in the other `setup-consumer-*` tests
- `append_line`: depends on the whole-line fix on `bugfix/setup-consumer-gitignore-exact-line`

## Testing Approach

See the task's Testing Strategy.
