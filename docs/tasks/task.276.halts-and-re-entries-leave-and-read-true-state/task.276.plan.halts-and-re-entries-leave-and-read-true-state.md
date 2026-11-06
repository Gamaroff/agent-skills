---
id: task.276.plan
title: "Implementation Plan: Halts and re-entries leave and read true state"
type: plan
task-ref: task.276.halts-and-re-entries-leave-and-read-true-state.md
---

# Implementation Plan: Halts and re-entries leave and read true state

> Requirements and success criteria: [task.276.halts-and-re-entries-leave-and-read-true-state.md](task.276.halts-and-re-entries-leave-and-read-true-state.md)

## Overview

Edit `shared/resources/` sources with the Edit tool, one hunk per call; never a bundled copy. Run each `.test.sh` before changing its script.

## Phase-by-Phase Implementation Guide

### Phase 1

- `advance-pipeline-lock.sh`: read how the Loop Escalation fence and the DoD-gaps HALT build the snapshot today (`develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-step-7-finalise.md`; `git grep -n "last-halt.json"`), then add `--halt <doc-dir> --reason <r> [--step N]` that writes `.claude/state/develop-pipeline.last-halt.json` then removes the lock, idempotent on a second call. Replace the fences with the call; add the checklist assertion.
- `--restore`: after resolving the candidate snapshot (the `--which` path), `jq -r .halt_reason`; if `finalise-dod-gaps`, print the re-entry script's path and exit 1 without consuming. Audit callers: `git grep -n -- "--restore" -- shared skills ':!docs'`.

### Phase 2

- `reenter-qa-after-finalise.sh:262`–`:266`: test `$UNTRACKED` first; non-empty → `refuse uncommitted-fix` with the commit-then-re-run text only; else the existing `no-code-moved` step-7 route with no appended note. Update the reason table in the header comment (`:29`) and in `develop-pipeline-resume-contract.md`.
- `:271` and `grant-qa-cycles.sh:163`: replace `grep -c '^### QA Cycle'` with the count of distinct N in the QA Iteration History section (awk from the section heading to the next H2, `sort -u` on N). Keep `max(highest gate, count)`.
- `lock-present` at step 7: when the newest DoD reads GAPS and `code-moved-since-gate.sh` prints a positive number, do not route to step 7.

### Phase 3

Add to the resume contract: a received resume instruction names a step and cycle; compare with the run-state file, `qa-cycle.sh`'s highest gate, and the report's QA Cycle heading; if complete, print "already complete: {step} {cycle}" and stop.

### Phase 4

Mutation-prove each refusal with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`, `command npm run lint:shell`.

## Key Patterns and References

- `shared/resources/reenter-qa-after-finalise.sh:138`, `:262`–`:271`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

`.test.sh` suites with scratch work-item directories; every refusal has a non-vacuity control.
