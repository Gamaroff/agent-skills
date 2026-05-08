---
id: task.21.plan
title: "Implementation Plan: qa-fix findings ingester subagent"
type: plan
task-ref: task.21.qa-fix-findings-ingester-subagent.md
---

# Implementation Plan — Task 21

> Requirements and success criteria: [task.21.qa-fix-findings-ingester-subagent.md](task.21.qa-fix-findings-ingester-subagent.md)

## Overview

Pre-`/qa-fix` Explore agent reads gate YAML + qa report + bug reports; returns Findings Summary. Main starts triage from summary.

## Phase 1 — Findings Summary schema

```yaml
findings:
  - id: F1
    severity: high | medium | low
    source: gate | report | bug.<N>
    file: path/to/file.ts
    description: <one line>
    suggested_fix_path: <one line>
truncated_count: 0
```

Cap 20; if exceeded → `truncated_count > 0` and `/qa-fix` HALTS until user confirms.

## Phase 2 — Ingester prompt

`shared/resources/qa-findings-ingester-prompt.md`:

```
Discover artifacts under <task_dir>:
  - gate.*.yml
  - qa.*.md
  - bug.*.md

Read each. Extract findings. Sort by severity (high first), then source (gate > report > bug).
Return YAML matching schema. Cap 20.
If >20 raw findings: include `truncated_count` and stop processing further bug reports.
```

## Phase 3 — Wire into qa-fix Step 1

In `skills/qa-fix/SKILL.md` Step 1:
- Replace inline gate/report/bug-report reads with single ingester dispatch
- Step 2 (triage) consumes Findings Summary directly
- If `truncated_count > 0`: print warning, halt for user decision (acknowledge or process further)

Existing Step 3 codebase Explore stays — operates on Findings Summary file paths.

## Key References

- `skills/qa-fix/SKILL.md` Step 1 (current inline reads)
- Compact summary pattern: `skills/qa-fix/SKILL.md:497` (Step 3 Explore)

## Testing Approach

1. QA cycle with 5 findings: priority order matches manual
2. QA cycle with 25 findings: `truncated_count = 5`, halt fires
3. Empty bug-reports scenario: ingester returns empty findings cleanly
