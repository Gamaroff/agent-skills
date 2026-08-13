# Sprint Review Summary — Task 45

**Task**: Pipeline, QA, finalise, and tracker sync write the Change Log
**Status**: ✅ Accepted · **PR**: [#213](https://github.com/Gamaroff/agent-skills/pull/213) · **Issue**: [#204](https://github.com/Gamaroff/agent-skills/issues/204)
**Accepted**: 2026-08-13 · **Gate**: PASS 95/100

## Summary

The development pipeline is where a document changes most and recorded least. `develop` was told to update a Change Log that, for tasks, had no section to write into. `qa-story`, `qa-task` and `finalise` wrote whole new sections and set `status: accepted` without a single row. Meanwhile the six sync skills wrote a row on *every* body-hash refresh, in two incompatible marker pairs.

This closes both ends: the pipeline logs milestones, and the sync stops logging noise. It completes the task.42 → 43 → 44 → 45 series.

## The demo

This task's own Change Log is the deliverable, produced by the code it ships:

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-12 | 1.0 | Initial draft | create-task |
| 2026-08-13 | 1.1 | Review passed (8/10) — 7 fixes applied | review-task |
| 2026-08-13 |  | Status → ready-for-development | review-task |
| 2026-08-13 |  | Implemented — all 5 phases | develop |
| 2026-08-13 |  | QA gate FAIL (70/100) — 1 high, 1 medium | qa-task |
| 2026-08-13 |  | QA findings fixed — 3 bugs closed | qa-fix |
| 2026-08-13 |  | QA gate PASS (95/100) | qa-task |
| 2026-08-13 | 1.2 | DoD verified — accepted (PR #213) | finalise |

Eight rows, not eighty. `Version` moves only at creation, review and acceptance.

## What shipped

- **Pipeline writes** — `develop` (one row per run, not per task), `qa-story`/`qa-task` (verdict per cycle), `qa-fix` (one per loop exit), `finalise` (acceptance, sole `Version` bumper).
- **Sync narrowed** — a row for exactly two events: issue created, status transition. Body updates write nothing; both trackers keep richer history.
- **One marker pair** — `<!-- change-log-start -->` supersedes two legacy pairs; documents migrate in place, once.
- **Wrappers removed** — the task.42 compatibility shim replaced by `buildChangeLogEntries`; five consumer surfaces migrated, no shim left behind.

## Bugs found and fixed in-flight

| Bug | Severity | What it was |
|---|---|---|
| BUG-1 | HIGH | A bulk edit's regex terminated inside a code fence, leaving an orphaned legacy block and **unbalanced fences in all six sync skills** |
| BUG-2 | MEDIUM | "Zero file writes" overstated the guarantee — `writeFileSync` is unconditional |
| BUG-3 | HIGH | **The engine silently deleted every Change Log row it could not parse.** The roadmap template shipped with the triggering column order, so any consumer would have lost its history on first write |

BUG-3 is the one worth the room's attention: pre-existing in task.42, surfaced by the diff code review *after* the first gate, and fixed here because this task routes five more writers into that path — and because "never drops a row" was the mitigation the task claimed for its own Critical risk. True, and hollow.

## Verification

`npm test` 1185/1185 · both eval suites 8/8 · bundle idempotent · CI green on the exact PR head.

## Known condition

**Live Jira verification not run** — no credentials here; the repo is GitHub-tracked. Carried openly through review, both QA cycles and the gate rather than quietly ticked. Behaviour pinned by tests. A Jira-tracked consumer should run the three-step check before relying on the narrowing.

## Follow-ups

Two pre-existing engine defects recorded in `task.45.bug.3`, not fixed here: content loss on the hand-written-heading path (MEDIUM), and the same-pair collapse skip (LOW).
