---
id: task.291.plan
title: "Implementation Plan: The context-pressure statusline test leaks a ctx-wrap- temp directory"
type: plan
task-ref: task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md
---

# Implementation Plan: The context-pressure statusline test leaks a ctx-wrap- temp directory

> Requirements and success criteria: [task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md](task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md)

## Overview

Measure the leak first, prove which test and which ordering causes it, then make the test (or the wrapper) leave nothing behind and add a test that keeps it that way.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce, prove the cause, fix it

**Files to modify:**
- `shared/resources/tests/context-pressure-statusline.test.mjs` — the leaking test and its `after` hook
- `shared/resources/context-pressure-statusline.sh` — only if the proof points at the wrapper

**Exact changes:**

1. **Reproduce.** Run the command in the task's Testing Strategy. Record the count before any edit. If it is 0 over 100 runs, raise the load (run it beside a CPU-bound loop) before concluding the leak does not reproduce; the CI sighting was on a loaded host.
2. **Prove the cause.** The hypothesis is that the test at `:85` ("an original holding shell metacharacters runs as one command") ends before its background recorder, so the recorder's `mkdirSync(..., { recursive: true })` (`context-pressure.mjs:229`) recreates `ctx-wrap-X` after the `after` hook removed it. Point `CONTEXT_PRESSURE_ENGINE` at a stub that sleeps 500 ms and then writes into `$CONTEXT_PRESSURE_STATE_DIR`, run only that test, and check that a `ctx-wrap-*` directory is left in the private `TMPDIR`. If it is not left, the hypothesis is wrong: look at the other tests (`:59`, `:68`) before touching anything.
3. **Fix.** Choose the smallest change the proof supports:
   - Preferred: have every test that passes a state directory wait for the recorder's file with the existing `waitFor`, and have the `after` hook wait for any state directory whose file has not appeared yet (bounded by the same 3000 ms) before it removes the parent.
   - Only if the test cannot know where the recorder writes: make the hook retry the removal once after a short wait and fail the test run loudly if a directory reappears.
   - Not acceptable: listing `ctx-wrap-` in `tests/tmp-leak-ratchet.json`, or `force: true` alone (it is already there and does not stop a later recreate).
4. **Regression test.** Add a test that runs the slow-recorder case from step 2 against the fixed helper and asserts no `ctx-wrap-*` entry remains once the hook's logic has run. Put the hook logic in a function the test can call, so it can be exercised without ending the file.
5. **Mutation proof.** Revert the fix, run the regression test, name the red test, restore from a `cp` snapshot, `cmp` clean.

## Key Patterns and References

- `scripts/test-tmpdir.mjs` is the ratchet: it runs the whole suite and compares the top-level entries of a private `TMPDIR` with `tests/tmp-leak-ratchet.json`. Run `CI=true npm test`, not the file alone, to see it.
- The existing `waitFor(file, ms)` helper (`:38`) polls every 50 ms and is the bound to reuse.

## Testing Approach

The reproduction count, the slow-recorder regression test, the mutation proof and `CI=true npm test` with the ratchet unchanged. Record the before and after counts in the QA report (not only the implementation report).
