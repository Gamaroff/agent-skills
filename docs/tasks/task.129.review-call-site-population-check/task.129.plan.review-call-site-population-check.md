# Implementation Plan: task.129 — review call-site population check

## Overview

Lift the collector out of the guard test into a shared module (Phase 1), then make the review run it (Phase 2). The lift is a refactor with the guard test as its own before/after oracle.

## Phase-by-Phase Implementation Guide

### Phase 1: `call-sites.js`

1. Copy `collectCallSites()` from `comment-slot-coverage.test.mjs` into `shared/resources/call-sites.js` as `collect({ engine, roots, repoRoot })`; keep the banner exclusion and the continuation-joining from `tests/qa-cycle.test.js` `fencedBlocks()`.
2. Engine shapes as regexes keyed by engine name; `tracker-comment` first, identical to today's.
3. CLI: `command node shared/resources/call-sites.js --engine tracker-comment --json` → `{ reason: "ok", engine, count, sites: [{file,line,stage,form}] }`.
4. Change the test to `import { collect } from "../call-sites.js"`; assert the count before and after in one PR (record it in the implementation report).

### Phase 2: The review check

1. review-task Step 3 check 9 (after check 8): trigger — the document lists N sites, gives a count, or says "all call sites"; command — the CLI; rule — every collector site not in the list is Important ("add it" or "state the exclusion"); a count that disagrees is Important.
2. review-story Step 4: the same text (families audit shared rule).
3. Pre-pass Agent C prompt: one extra instruction and output field `population_diff`.
4. create-task §7: a one-sentence note and the command.

## Key Patterns and References

- `registry-tick.js`, `change-log.js` — pure module + thin CLI + `reason` contract, the shape to copy.
- `comment-slot-coverage.test.mjs` floors — keep them; the lift must not lower them.

## Testing Approach

Fixture tree under `shared/resources/tests/fixtures/call-sites/` with one site per root class and one bannered decoy; mutation proof by removing a root from the collector.
