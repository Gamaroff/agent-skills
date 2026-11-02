---
id: task.249.plan
title: "Implementation Plan: /finalise grades every kind of criterion fairly"
type: plan
task-ref: task.249.finalise-grades-every-criterion-kind.md
---

# Implementation Plan: /finalise grades every kind of criterion fairly

> Requirements and success criteria: [task.249.finalise-grades-every-criterion-kind.md](task.249.finalise-grades-every-criterion-kind.md)

## Overview

Phase 1 is the only engine change and the only breaking one: a new AC status. Phases 2–4 are prompt
and skill prose, and are independent of one another.

## Order and dependencies

1. **Phase 1, DEFERRED-CI.** First, because it changes an enumeration that several readers share.
   Before editing, list the readers: `git grep -n "PARTIAL" -- shared/resources skills/finalise`.
   Every hit is a reader that must accept the new value.
2. **Phases 2, 3 and 4.** Any order.

## Phase notes

### Phase 1

- The Step 6 resolution runs after `CI_ROLLUP` is known and before the acceptance decision. It
  rewrites the record entry's status and adds `note: "resolved from CI reading 1 @ {CI_HEAD_1}"`.
- The subcommand returns the re-folded section verdict (`computeOverall` over the resolved
  entries) and the block rebinds `AC_OVERALL` from it: `AC_OVERALL` was bound at Step 3c
  (`skills/finalise/SKILL.md:759`) and is otherwise never re-read (review I-1).
- `recordEntry` coerces every non-PASS status to `FAIL` today (`finalise-rerun-scope.js:482`); it
  must keep `DEFERRED-CI`.
- The resolution must be an executed block (fenced bash calling a small `finalise-rerun-scope.js`
  subcommand, or a pure function with a CLI), so the snippet suite can run it. Prose-only resolution
  is what obs #110 reported.

### Phase 3

- `spec_ref` is a `file:line` into the work item or its cited reference doc. A case without one is
  a plan-shape error that the DoD reports, never a silent pass.
- The disposition text in Step 3b.1 names the route: record the contradiction in the DoD and ask
  the operator whether the spec or the code is wrong. It does not count toward the security verdict.

### Phase 4

- Phrase the trigger as words that demand a record (recorded, logged, listed in, kept in), and give
  one counter-example the check must leave alone: a criterion that names its file.

## Verification

- `npm test` for `finalise-rerun-scope.test.mjs` and `finalise-deferred-ci.test.mjs`; `npm run ci`;
  `npm run test:clean-checkout` (never move the `.agents/skills` symlink aside — it unloads every
  project skill mid-session).
- Mutation proofs listed in the task's Testing Strategy, recorded in the implementation report.
