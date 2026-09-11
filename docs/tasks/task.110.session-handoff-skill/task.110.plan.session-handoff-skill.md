---
id: task.110.plan
title: "Implementation Plan: a handoff that re-measures itself"
type: plan
task-ref: task.110.session-handoff-skill.md
---

# Implementation Plan: a handoff that re-measures itself

> Requirements and success criteria: [task.110.session-handoff-skill.md](task.110.session-handoff-skill.md)

## Overview

Start from the staged proposal's contract; the work is the verifier and its tests.

## Phase-by-Phase Implementation Guide

### Phase 1: contract → SKILL.md

Read `skill-updates/PROPOSED-session-handoff/session-handoff/SKILL.md`. Keep: the section/half-life
table, the verdict table, "never carry a figure forward". Drop: its TODO list (that is this plan).
Add: the command-cell syntax and the read-only command whitelist.

### Phase 2: `handoff-verify.mjs`

- Input: path (default `.agents/handoff.md`). Parse the header `| Check | Command | Result |` table
  and any `<!-- cmd: … -->` comments.
- For each: check the command's first token against the whitelist; run via `spawnSync("bash",
  ["-lc", "command " + cmd])` with a 60 s timeout; normalise whitespace; compare to the recorded
  `Result` cell (substring match on the recorded figure, not equality on the full output).
- Output: table to stdout; `--json` → `{ reason, lines: [{check, verdict, recorded, measured}] }`.
- Exit 0 on `ok`/`stale` (stale is information, not failure), 2 on usage.

### Phase 3: write mode, wiring, proof

- Template with the seven sections and half-life labels; traps = pointer paragraph.
- AGENTS.md line 5: "…run `/session-handoff --read` rather than trusting the date at the top".
- Prove against `git show 6ce3280e:.agents/handoff.md`.

## Key Patterns and References

- `shared/resources/observation-log.js` — `--json` + `reason` contract to mirror.
- `docs/contributing/traps.md` — the whitelist must prefix `node`/`npm`/`npx` with `command`.

## Testing Approach

Fixture handoffs under `skills/session-handoff/tests/fixtures/`; one historical handoff copied in
for the regression case.
