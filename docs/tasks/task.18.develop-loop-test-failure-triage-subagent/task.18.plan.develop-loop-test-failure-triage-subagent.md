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
# Generic — works with any test runner (jest, pytest, nx, go test, etc.)
TEST_LOG=".claude/state/test-output-${ITER}-$(date +%s).log"
<test-command> > "$TEST_LOG" 2>&1
TEST_EXIT=$?
```

`${ITER}` = current develop-loop iteration number (1..MAX_ITER).

On non-zero exit, dispatch triage instead of streaming log to main.

## Phase 2 — Triage prompt

`shared/resources/test-failure-triage-prompt.md` (new):

```
Read <log_path>. Classify each failing assertion as:
  - real: code-under-test broken
  - flaky: timing/order/network artefact
  - unrelated: pre-existing or environment

Return YAML (matches `shared/resources/subagent-summary-artifact.md` contract):
  counts: {real: N, flaky: N, unrelated: N}
  failures:
    - name: <test name>
      classification: real | flaky | unrelated
      file: <path>
      line: <int>
      reason: <one-line>
  next_file: <single file path most likely to need a fix>
  truncated_count: <int>   # 0 unless >10 failures
  cap: 10                  # bullets capped; remainder counted in truncated_count
```

Bias rule: "If unsure between real and flaky, mark real."

## Phase 3 — Wiring

In `shared/resources/develop-pipeline-step-3-develop-loop.md`:
- After test run, if `$TEST_EXIT != 0`, dispatch the Agent tool with `subagent_type="Explore"` passing `<log_path>` and the prompt from `shared/resources/test-failure-triage-prompt.md`
- Main consumes triage YAML only; never reads `$TEST_LOG`
- Conditional cleanup:
  - On `TEST_EXIT == 0` → `rm -f "$TEST_LOG"`
  - On `TEST_EXIT != 0` → retain `$TEST_LOG` for post-mortem; cleaned by next successful run on same iter or out-of-band rotation

## Key References

- Existing log redirection pattern: none — establish here
- Compact-summary subagent pattern: `skills/qa-fix/SKILL.md` Step 3 "Pre-fix codebase mapping" block
- Subagent output contract: `shared/resources/subagent-summary-artifact.md` (established by task.17)
- Sibling: [task.29](../task.29.develop-task-loop-test-failure-triage-subagent/) — develop-task pipeline-specific validation/integration

## Testing Approach

1. Inject 1 failing test → triage classifies as real, next_file points at source
2. Inject 100+ failures → cap respected, truncated_count surfaced
3. Inject obviously flaky (timing) test → triage classifies as flaky with reason
