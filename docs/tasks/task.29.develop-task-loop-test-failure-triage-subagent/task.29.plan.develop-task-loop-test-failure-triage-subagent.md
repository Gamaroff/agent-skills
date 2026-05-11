---
id: task.29.plan
title: "Implementation Plan: develop-task loop test-failure triage subagent"
type: plan
task-ref: task.29.develop-task-loop-test-failure-triage-subagent.md
---

# Implementation Plan — Task 29

> Requirements and success criteria: [task.29.develop-task-loop-test-failure-triage-subagent.md](task.29.develop-task-loop-test-failure-triage-subagent.md)

## Overview

Mirror of [task.18 plan](../task.18.develop-loop-test-failure-triage-subagent/task.18.plan.develop-loop-test-failure-triage-subagent.md). Wire log capture + triage dispatch into develop-task's Step 3.

## Phase 1 — Capture

In `skills/develop-task/SKILL.md`, replace test invocation with:

```bash
TEST_LOG=".claude/state/test-output-task-$(date +%s).log"
<test-cmd> > "$TEST_LOG" 2>&1
TEST_EXIT=$?
```

## Phase 2 — Triage dispatch

On non-zero exit, dispatch Explore using prompt from `shared/resources/test-failure-triage-prompt.md` (added by task.18). Main reads only summary YAML.

## Phase 3 — Cleanup

`rm "$TEST_LOG"` after step completion.

## Testing

Same scenarios as task.18, run against develop-task pipeline.
