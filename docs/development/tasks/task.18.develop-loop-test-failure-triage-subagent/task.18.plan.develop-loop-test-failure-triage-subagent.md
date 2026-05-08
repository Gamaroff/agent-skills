---
id: task.18.plan
title: "Implementation Plan: develop-loop test-failure triage subagent"
type: plan
task-ref: task.18.develop-loop-test-failure-triage-subagent.md
---

# Implementation Plan — Task 18

> Requirements and success criteria: [task.18.develop-loop-test-failure-triage-subagent.md](task.18.develop-loop-test-failure-triage-subagent.md)

## Overview

Capture failed test output to file; dispatch Explore subagent to classify failures; main reads only the summary.

## Phase 1 — Output capture

Update `skills/develop/SKILL.md` test-running guidance:

```bash
# Instead of: npx nx test foo
# Do:
TEST_LOG=".claude/state/test-output-$(date +%s).log"
npx nx test foo > "$TEST_LOG" 2>&1
TEST_EXIT=$?
```

On non-zero exit, dispatch triage instead of streaming log to main.

## Phase 2 — Triage prompt

`shared/resources/test-failure-triage-prompt.md` (new):

```
Read <log_path>. Classify each failing assertion as:
  - real: code-under-test broken
  - flaky: timing/order/network artefact
  - unrelated: pre-existing or environment

Return YAML:
  counts: {real:N, flaky:N, unrelated:N}
  failures:
    - {name, classification, file, line, one-line reason}
  next_file: <single file path most likely to need a fix>
  cap: 10 failures (truncate longer; report truncated_count)
```

Bias rule: "If unsure between real and flaky, mark real."

## Phase 3 — Wiring

In `develop-pipeline-step-3-develop-loop.md`:
- After test run, if `$TEST_EXIT != 0`, dispatch triage with `<log_path>`
- Main reads triage YAML; never reads `$TEST_LOG`
- Cleanup: rm `$TEST_LOG` after step completion

## Key References

- Existing log redirection pattern: none — establish here
- Compact-summary subagent pattern: `qa-fix/SKILL.md:497`

## Testing Approach

1. Inject 1 failing test → triage classifies as real, next_file points at source
2. Inject 100+ failures → cap respected, truncated_count surfaced
3. Inject obviously flaky (timing) test → triage classifies as flaky with reason
