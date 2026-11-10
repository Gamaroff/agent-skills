---
id: task.293.plan
title: "Implementation Plan: QA snippet classifier refuses indirect evaluation"
type: plan
task-ref: task.293.qa-snippet-classifier-indirect-evaluation.md
---

# Implementation Plan: QA snippet classifier refuses indirect evaluation

> Requirements and success criteria: [task.293.qa-snippet-classifier-indirect-evaluation.md](task.293.qa-snippet-classifier-indirect-evaluation.md)

## Overview

Reproduce each spelling under real bash first, then add refusals to the existing hazard path in `qa-execute-snippets.mjs`, then prove them with a differential run and mutations.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce and size the class

**Files to modify:**

- `shared/resources/tests/qa-execute-snippets.test.mjs`: one test per spelling.

**Exact changes:** each test writes the block to a scratch directory, runs it under `bash`, and asserts the marker file exists (proving the hole) before the fix, then asserts the classifier returns `mutating` after. Start from these blocks (from gate 4):

```bash
printf -v 'a[$(touch W)]' x          # CR-1
PS4='$(touch W)'; set -x; true        # CR-2
x='$(touch W)'; echo ${x@P}           # CR-2
x='a[$(touch W)]'; echo $((x))        # CR-3
```

Record the docs-scan baseline with `node scripts/qa-snippets-docscan.mjs --time` five times, `uptime` beside each.

### Phase 2: Refuse the class

**Files to modify:**

- `shared/resources/qa-execute-snippets.mjs`: extend `assignmentHazard` (`:2818`) and the `startupHazard` path (`:3142`, `:3246`, `:3391`).

**Exact changes:** the refusal for a direct use must not depend on a helper-function call, because `startupHazard` currently only fires with `calls.length > 0` (`:3391`). Add the refusal where the verdict is built, not only inside that branch.

## Key Patterns and References

- Allow-list style: `assignmentHazard`'s header says it is an allow-list over what the scan sees, not a list of bad spellings. Follow it.
- Blank, quote and line-join facts come from `tokenize` (`:1507`); do not add regexes for them.
- Mutation proofs: snapshot the engine, mutate, run, restore, as in task 292's QA 4 report.

## Testing Approach

Real-bash behavioural tests, one unnamed-class control, one safe control, the differential generator extended with the new shapes, and the docs-scan comparison. Temp directories are removed in `t.after`.
