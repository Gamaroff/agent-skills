---
id: task.22.plan
title: "Implementation Plan: finalise DoD parallel checks"
type: plan
task-ref: task.22.finalise-dod-parallel-checks.md
---

# Implementation Plan — Task 22

> Requirements and success criteria: [task.22.finalise-dod-parallel-checks.md](task.22.finalise-dod-parallel-checks.md)

## Overview

Replace serial DoD checklists in `/finalise` with 4 parallel Explore subagents. Consolidate DoD running summary writes from ~40 to ≤5.

## Phase 1 — Author 4 prompts

Each in `shared/resources/finalise-dod-<area>-prompt.md`:

### `finalise-dod-ac-prompt.md`

```
Read story frontmatter ACs. Read PR diff at <DIFF_FILE>. Read test files in story File List.
For each AC: cite (file:line) showing AC implementation AND (file:line) showing test coverage.
If no citation found: mark fail.
Return YAML: {ac_id, status, code_citation, test_citation}
```

### `finalise-dod-security-prompt.md`

```
Determine story type from frontmatter (api | ui | data | auth | infrastructure).
Run the matching security checklist (see existing finalise SKILL.md checklists).
Each check: cite file:line evidence OR mark fail.
Return YAML list: {check, status, citation}
```

### `finalise-dod-compliance-prompt.md`

Same shape; checklist driven by story tags or repo-level config (GDPR/PCI/WCAG/HIPAA).

### `finalise-dod-docs-prompt.md`

```
Verify CHANGELOG.md updated for this story; verify any README/migration guides referenced in story exist.
Return YAML: {item, status, citation}
```

## Phase 2 — Parallel dispatch

In `skills/finalise/SKILL.md` DoD phase:
- Single message, 4 Explore tool calls (parallel)
- Aggregate 4 YAML responses
- Failure of one → that section in DoD summary marked `manual review required`

## Phase 3 — Consolidated writes

DoD running summary file written in **one** pass per section after aggregation, not per check. Idempotent marker (existing pattern) preserved.

## Phase 4 — Validation

Three real tasks (varying types). Compare DoD output vs baseline serial run. Citations must be present for every pass-bullet.

## Key References

- `skills/finalise/SKILL.md` — current serial checklists
- Idempotent marker pattern (search for "marker" in finalise SKILL.md)

## Testing Approach

1. Golden complete task → DoD identical content vs baseline (modulo ordering)
2. Story missing changelog → docs subagent flags, main writes failure entry
3. Kill one subagent (timeout simulation) → 3 sections complete + 1 manual-review marker
4. Re-run finalise → idempotent (no duplicate sections)
