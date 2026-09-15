# Bug Report: Task 110 - `observation-log.js next-id` is admitted as a read verb but archives entries and writes the id floor

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

The bug.8 fix admits `observation-log.js` under its "read verbs only" spec:
`positionalPattern: /^(doctor|scan|queue|next-id|families)$/`, and SKILL.md's `node` row lists the
same five as reads. Four of them are — `cmdDoctor`, `cmdScan`, `cmdQueue` and `cmdFamilies` touch
no `fs` writer. **`next-id` is not.** `nextId()` runs `sweepResolved()` first, which
`renameSync`s every resolved observation into `archive/`, and then `writeIdFloor()`, which
`mkdirSync`s and writes `archive/.id-floor`. The engine's own contract says as much — "`write` folds
the archival sweep … into the same call", and `next-id` is the read half of that fold only in the
sense that it does not create an observation. The spec admits an absolute `--workspace` (the log
lives outside the repo) and does **not** admit `--dry-run`, so every admitted `next-id` runs live.

**Executed** (QA cycle 8), directly with the engine and then through `isAllowed`:

- Fresh, empty `--workspace $HOME/.cache/probe`: `next-id` returned `{ reason: "ok", id: 1 }` and
  left `skill-observations/observation-log/archive/.id-floor` behind — three directories and a
  file created at a path the handoff chose.
- Same workspace after `init`, with one `status: actioned` entry `0001-x.md` in the log: `next-id`
  returned `archived: ["0001-x.md"]` and the file had **moved** to `archive/`; `.id-floor` now reads
  `2`.
- `isAllowed("node skills/observe-work/references/observation-log.js next-id --workspace /Users/x/anywhere --json").ok === true`;
  the `--dry-run` spelling is refused (`--dry-run` is not in the spec's flags).

## Steps to Reproduce

```bash
WS=$HOME/.cache/probe-ws && rm -rf "$WS" && mkdir -p "$WS"
command node shared/resources/observation-log.js next-id --workspace "$WS" --json     # ok, id 1
find "$WS" -type f                                                                     # …/archive/.id-floor
command node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(m.isAllowed("node shared/resources/observation-log.js next-id --workspace '"$WS"' --json").ok))'   # true
rm -rf "$WS"
```

## Expected Behavior

Read mode never writes. `next-id` is either dropped from the admitted verbs (nothing in a handoff
needs the next id — `scan` and `queue` carry the counts a handoff records) or admitted only with
`--dry-run` required, the way `tsc` requires `--noEmit`.

## Actual Behavior

An admitted "read" moves files in the reader's observation log and creates a directory tree plus
an id-floor file at any absolute, non-ephemeral path the handoff names.

## Impact

Bounded and non-destructive — the sweep is a move that refuses to clobber, and the id floor is the
value `write` would have set — but it is a write through read mode, into the one store this skill
family maintains, at a path the document controls. The invariant SKILL.md opens with ("a read-only
whitelist") is the thing at stake, not the bytes.

## Recommendation

Remove `next-id` from `positionalPattern` (or gate it on a required `--dry-run`); refused-list test
for `node …/observation-log.js next-id --workspace /x --json`; correct the SKILL.md `node` row's
verb list. While there, note in the row that `families` is admitted with or without `--audit` and
that both forms are reads (verified: `cmdFamilies` has no writer).

## Status History

| Date       | Status | Changed By  | Notes                                                                                                                                |
| ---------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-15 | New    | QA Engineer | QA cycle 8 — executed against a scratch workspace: a fresh tree and an id-floor file created; a resolved entry moved to `archive/` |
