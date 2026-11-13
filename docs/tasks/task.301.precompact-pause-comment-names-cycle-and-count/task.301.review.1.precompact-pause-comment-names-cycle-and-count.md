# Task Review Report: Task 301 - PreCompact pause comment names the cycle and the pause count

**Reviewed:** 2026-11-12
**reviewed_blob:** c874a5b566a005b2765acece2cb0a1fbdcd92bb6
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT before fixes; GOOD after the fixes below were applied

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-11-12

---

## Executive Summary

The task is small and well scoped, but two of its Phase 1 premises are false against the code. The lock has no `qa_cycle` field, and the `paused` record the plan stores the count in is deleted by every lock writer. Phase 2 also tests a HALT that is prose, which no test can run. All three were corrected in the task document and plan.

**Critical Issues:** 1 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 asked (autonomous pipeline run; every question took the recommended option, so no question was asked)
**Implementation Readiness:** 6/10 before fixes, 8/10 after
**Recommendation:** READY TO IMPLEMENT (after the fixes recorded here)

**Independence note:** the two pre-pass Explore agents were not dispatched. The architecture and codebase checks were done inline by the reviewer, who read the hook, the fixture, the lock helper and the pause reference directly, so no independent second read of these claims took place.

---

## User Decisions & Clarifications

None. Autonomous run: output format "Comprehensive report", Step 8.5 "apply all critical + important fixes", Step 9 "fixes complete" — each auto-answered per the develop-task defaults.

---

## 1. Template Structure Compliance

**Status:** PASS (one note)

- 11 numbered sections, a Change Log and a References section are present; no placeholders.
- Frontmatter has `type: task`, `description`, `tags`. `risk_level` is absent, which the lite-mode rule reads as `absent` (not an error).
- No `github_issue` is linked, so no tracker comment is posted (Step 10 skips). Optional: link one later with `/sync-github-task`.
- Card preflight: not run as a separate command on this review; sections 1, 9 and 10 carry prose, so no `empty` or `heading-only` risk was seen by reading.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND

#### Critical

- **C1 — the pause count cannot live in the `paused` record.** Section 10 says "store it with the existing `paused` record", and Phase 1 says "increment on a repeat at the same step". Every lock writer clears that record: `clear_pause` in `shared/resources/advance-pipeline-lock.sh:545` runs `jq 'del(.paused)'`, and `--restore` deletes it too (`:456`). A pause, a lock write, then a second pause at the same step is exactly the "repeat at the same step" case, and the count would be reset to nothing between them. The snapshot cannot hold it either: `clear_pause` consumes it (`:551`) and each pause rewrites it from the lock.
  - Evidence: read `advance-pipeline-lock.sh` lines 530-555 and 456.
  - Fix: keep a top-level lock field `pause_counts`, an object keyed by step (`{"6": 2}`). Lock writers rewrite the lock with `jq`, so an unknown top-level field survives advances, and `--restore` deletes only the named fields. Keyed by step, "reset on a new step" needs no rule.

#### Important

- **I1 — there is no `qa_cycle` field to read.** Phase 1 says "read the QA cycle from the lock when present". The lock schema carries `qa_phase`, `qa_max_cycles`, `extra_cycles_granted` and `convergence_from_cycle`, and nothing named `qa_cycle` (`grep -n 'qa_cycle' shared/resources/*.sh` finds no writer). A plan that reads a field nobody writes yields a silently empty value, so the cycle would never appear. The existing sources for the cycle are the gate files on disk (`grant-qa-cycles.sh` takes the highest gate number) and the report's `### QA Cycle {N}` headings.
  - Fix: Phase 1 derives the cycle as the highest `{prefix}.gate.{N}.*` number in `task_or_story_directory` while `current_step` is 5, and omits the cycle otherwise. It must not write a new lock field for it.
- **I2 — Phase 2 asks a test to execute prose.** The "halts with both commands" HALT in `develop-pipeline-step-1-create-branch.md` is a sentence; the fenced block above it only prints the lock and exits nothing. Only the `rm`/`jq` Start-fresh block is executable. A test over a sentence is a source-text grep, and the repository's own rule is behaviour, not text.
  - Fix: Phase 2 lifts the paused-lock-for-another-document HALT into the fenced collision block (it exits 1 and prints both the resume and the abandon command), then tests the blocks by extraction with `extractBlocks` from `qa-execute-snippets.mjs`, the way `halt-snippet-glob-safe.test.mjs` does. The test file goes under `shared/resources/tests/` so the `shared/resources/tests/*.test.mjs` glob in `npm run test:suite` reaches it.
- **I3 — the Step 1 block exists in more than one copy, and the plan names none.** `pause_reason == "precompact"` appears in `shared/resources/develop-pipeline-step-1-create-branch.md` and in bundled copies (`git grep -n 'pause_reason == "precompact"'` also lists `skills/develop-bug/references/...`). Edit only the shared source and run `npm run bundle`. The test must read the source, and `bundle:check` holds the copies.
- **I4 — the new lock field needs a row in the lock schema.** The pause reference's lock-schema table (`develop-pipeline-pause.md`, the `paused` row at line 121) is the one place lock fields are described, and `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` already reads that table for other fields. Phase 4 says only "if the `paused` record changed". Fix: Phase 4 adds a `pause_counts` row there and names the writer (the hook, in `mark_paused`) and the clearers (none). `docs/reference/pipeline-artifacts.md` is updated only if it lists lock fields.
- **I5 — the Performance criterion is not testable as worded.** "The stub's argv log is compared before and after" is a hand comparison against a number nothing records. Fix: the test asserts the exact `gh` call count for one pause (a count taken from the stub log on the unchanged hook, recorded in the test as a constant), so a future added call turns it red.

#### Optional

- **O1 — line anchors drifted.** The task cites `:391` for the marker and `:373` for the lead; the marker is at `:409`, the lead call at `:391`, the body build at `:393`. Step 1 is cited as `:32-36`; the paused-lock section is `:31-41`. The claims are true; the coordinates moved.
- **O2 — state the ordering of the count write.** `--restore` rebuilds a lock from the snapshot, and the snapshot is copied before `mark_paused` runs. If the count is written inside `mark_paused`, a restored lock carries the previous pause's count. Increment the count before the snapshot copy, or accept and state that a restore may under-count by one.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases 1, 3 and 4 name their files. Phase 3's scenario needs a lock write between the two pauses, or the second pause hits the "already paused" repeat path and records nothing (scenario 19 does this with `advance-pipeline-lock.sh <N>`). The task now says so.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes.

- The criteria name where the record lives: the `echo 0` red run is "recorded in the QA report" (a committed location).
- The Phase 3 mutation (`next_n` → `echo 0`) is concrete and reachable: both pauses would then write `pr-1.md`.
- Each behaviour criterion names a test; the pause-comment criterion names the scenario. The new count field also needs a mutation: drop the count text and confirm the Phase 1 test is red (already in section 8).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The one Medium risk (a count stored in a new place) had a mitigation that C1 shows does not work; the corrected mitigation is a top-level field the lock writers already preserve, held by a test that pauses, writes the lock, and pauses again.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. Store the count in a top-level `pause_counts` lock field, not in `paused` (C1).

### Should Fix (Important) — 5

1. Derive the QA cycle from the gate files on disk; there is no lock field (I1).
2. Lift the paused-lock HALT into an executable block and test by extraction (I2).
3. Edit the shared source only and bundle; name the copies (I3).
4. Add a `pause_counts` row to the lock schema (I4).
5. Make the no-extra-network-calls criterion a call-count assertion (I5).

### Consider (Optional) — 2

1. Correct the line anchors (O1).
2. State the count write's order against the snapshot copy (O2).

---

## Implementation Readiness Assessment

**Score:** 8/10 (after fixes; 6/10 as first reviewed)

- Template Compliance: 9/10
- Technical Accuracy: 7/10 → 9/10 after fixes
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ READY TO IMPLEMENT — the Critical and Important findings were fixed in the task document and plan in this run.

**Justification:** The corrected plan stores the count where lock writers preserve it, reads the cycle from a field that exists, and tests only blocks a test can run.

---

## Review Metadata

- **Reviewer:** review-task (autonomous pipeline run, inline pre-pass)
- **Review Date:** 2026-11-12
- **Task File:** docs/tasks/task.301.precompact-pause-comment-names-cycle-and-count/task.301.precompact-pause-comment-names-cycle-and-count.md
- **Architecture Docs Consulted:** none loaded; checks were made against `shared/resources/` sources directly
