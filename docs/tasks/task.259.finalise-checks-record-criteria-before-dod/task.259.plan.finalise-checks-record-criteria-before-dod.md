---
id: task.259.plan
title: "Implementation Plan: finalise checks record criteria before the DoD run"
type: plan
task-ref: task.259.finalise-checks-record-criteria-before-dod.md
---

# Implementation Plan: finalise checks record criteria before the DoD run

> Requirements and success criteria: [task.259.finalise-checks-record-criteria-before-dod.md](task.259.finalise-checks-record-criteria-before-dod.md)

## Overview

A pure engine, `shared/resources/finalise-record-preflight.js`, answers "is there a committed place the AC agent can read for each record criterion". Step 3a of `/finalise` runs it before the dispatch. Model the engine on `finalise-rerun-scope.js` (same exit codes, `--json` `reason` contract); read that file first for the CLI shape.

## Phase-by-Phase Implementation Guide

### Phase 1: The engine

**Files to modify:**
- `shared/resources/finalise-record-preflight.js` (new) — export `RECORD_TRIGGER` (the words), `classify(criteria, files)`, and the CLI.
- `shared/resources/tests/finalise-record-preflight.test.mjs` (new).

**Shape** (not final text):

```js
export const RECORD_TRIGGER = /\b(recorded|logged|listed in|documented)\b/i;
const LOCATIONS = { "qa-report": /\bQA report\b/i, gate: /\bgate\b/i, dod: /\bDoD\b/i,
  "implementation-report": /\bimplementation report\b/i };
// state: ok | no-location | implementation-report-only | location-uncommitted | location-absent
```

A numeric-bound criterion (check 22's second trigger) needs a second pattern; derive both from one exported constant.

**Reproduce first:** build the test's file list from a real `git ls-files` over a scratch repository holding a task directory with only an implementation report, and assert `implementation-report-only`.

### Phase 2: Wire into Step 3a

**Files to modify:** `skills/finalise/SKILL.md` — Step 3a (`#### Step 3a: Prepare Shared Context`). Add the call, print the findings, and state the per-state action once. Keep the wording in one place and cite it from Step 2.

### Phase 3: One definition, docs and bundle

Parity test: read `skills/review-task/SKILL.md` check 22 and assert every word in `RECORD_TRIGGER` appears in its trigger line, and the reverse. Then `npm run bundle`, CHANGELOG, reword the trap.

## Key Patterns and References

- `shared/resources/finalise-rerun-scope.js` for the CLI and `reason` contract.
- `shared/resources/finalise-dod-ac-prompt.md` "A process criterion" for what the agent then does with the location.
- An empty result is a claim about the instrument: return `empty` and `scan-broken` as separate reasons.

## Testing Approach

One failing-first test per state, the controls in the task's § 8, then three mutations reverted with snapshot restore. Run with `CI=true`.
