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

- Measured 2026-11-16: a scratch report with `### QA Cycle 2 — qa-fix (5b)` beside `### QA Cycle 2 — {date}` fires `qa-cycle-duplicated` today. Re-run it as the before-state of the new test.
- Add `qa-cycle-heading-suffix` beside `qa-cycle-duplicated` (`report-lint.js:234-246`): an H3 `### QA Cycle N` whose remainder matches `/qa-fix|\(5[abc]\)/i`. No count-mismatch code (redundant with `qa-cycle-duplicated`). Document the H4 rule at the `Invoke qa-fix` step in `develop-pipeline-step-5-6-qa-loop.md`.
- Template: the `### QA Cycle {N}` entry template is the fenced block at `develop-pipeline-step-5-6-qa-loop.md:487`, not `implementation-report-template.md`. Add `**Traceability**: mapped | skipped ({reason})` there, and a line in the prose below it saying the row is written on every cycle (lite and the bypasses write `skipped (…)`).
- Marker: add `**Report format**: 2` to the header block of the task and story variants in `implementation-report-template.md` (the bug variant has frontmatter and no mapper; leave it). In `report-lint.js` apply `traceability-missing` / `traceability-reason-missing` only when the report carries that line. State the marker in the linter's header comment.
- Writers: add `**Traceability**: skipped (run outside the loop)` wherever `accept-qa-residual`, `grant-qa-cycles.sh`, `reenter-qa-after-finalise.sh` or the resume contract's back-fill create an entry, and run each writer's own test. Do not change entries these scripts only read.

### Phase 3

`command node shared/resources/report-lint.js` over every accepted report (loop with `git ls-files 'docs/**/*implementation*.md'`), counts before and after in the QA report. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `shared/resources/report-lint.js:242`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixture reports; mutation-prove each code with the Edit tool and `git diff --stat`.
