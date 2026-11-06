---
id: task.277.plan
title: "Implementation Plan: The implementation report and triage say what happened"
type: plan
task-ref: task.277.the-implementation-report-and-triage-say-what-happened.md
---

# Implementation Plan: The implementation report and triage say what happened

> Requirements and success criteria: [task.277.the-implementation-report-and-triage-say-what-happened.md](task.277.the-implementation-report-and-triage-say-what-happened.md)

## Overview

Edit `shared/resources/` sources with the Edit tool, one hunk per call; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

- `develop-pipeline-step-3-develop-loop.md:202` Test Failure Triage: add "A triage result whose fix is 'add an allow-list entry' is a design question about the new code. Fix the code. Extend a guard's allow-list only when the entry's justification names the line or `{placeholder}` that binds the value in that same block; if such a binder exists the guard would not have fired." (obs #5)
- `develop-pipeline-autonomous-defaults.md:69`: extend "Every time in that record is measured" to "every time written into the report, including Notes cells and the Decisions Log, comes from `date -u` at the moment or a completion notice's `duration_ms`, else `(not measured)`". Add the same sentence to the Step Transition Protocol wording the plan finds with `git grep -n "Step Transition Protocol" -- skills/develop-task/SKILL.md`.

### Phase 2

- Run the task.230 shape through `report-lint.js` first (a scratch report with `### QA Cycle 2 — qa-fix (5b)` beside `### QA Cycle 2 — {date}`) and record which code fires today.
- Add codes `qa-cycle-heading-suffix` and `qa-cycle-count-mismatch` beside `qa-cycle-duplicated` (`:242`); document the H4 rule at the qa-fix record step in `develop-pipeline-step-5-6-qa-loop.md`.
- Template: add `**Traceability**: mapped | skipped ({reason})` to the `### QA Cycle {N}` block in `implementation-report-template.md`; add `traceability-missing` for standard-mode reports; exempt older reports by a template marker the plan names (for example a `report_format:` frontmatter value).

### Phase 3

`command node shared/resources/report-lint.js` over every accepted report (loop with `git ls-files 'docs/**/*implementation*.md'`), counts before and after in the QA report. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `shared/resources/report-lint.js:242`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixture reports; mutation-prove each code with the Edit tool and `git diff --stat`.
