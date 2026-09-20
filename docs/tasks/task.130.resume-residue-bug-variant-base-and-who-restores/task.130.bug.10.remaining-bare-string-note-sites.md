# Bug Report: Task 130 - four detector-prompt sites still instruct bare-string notes in `deltas_since_pause`

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Bug ID**: TASK-130-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 4 scoped review CR-2)
**Date Found**: 2026-09-20

## Description

Cycle 3's "every note this step files is a delta OBJECT" sentence is scoped to Step 1 of the detector prompt. The prompt still instructs string notes at four other sites — `:108` (`halt_reason`/`pause_reason` "include in deltas_since_pause"), `:112` (`"lock qa_phase: 5b"`), `:113` (the grant note), `:167` (`"report has no Subagent summary ref column; summary-gap check skipped"`). Any one followed literally makes the schema check's `all(type == "object")` fail and a healthy resume fall back to full Phase 0b verification — bug 6 re-introduced at the sites nobody enumerated.

## Expected Behavior

The object-shape rule lives once in the § Output Schema field table, so it governs every step; each note site is written as `{ "path": …, "concern": … }`; a test enumerates `deltas_since_pause` lines in the prompt and fails on a quoted bare-string note.

## Actual Behavior

Four string-note sites remain.

## Impact

Medium. The fallback is loud (a logged "Detector output invalid") and safe (full verification), but it disables the delete on exactly the resumes that carry a qa_phase or a grant note — most QA-loop resumes.

## Recommendation

Move the rule into the field table; rewrite the four sites; add the enumerating test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-20
**Developer**: qa-fix (develop-task Step 5b, cycle 4)

**Root Cause Analysis**: the object-shape rule lived in one Step 1 sentence; the four note sites elsewhere in the prompt (halt/pause cause, `qa_phase`, grant budget, missing column) predate it and still quoted bare strings.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-20

**Fix Description**: § Output Schema's `deltas_since_pause` row and object-fields table are the one statement of the shape (`path` string|null, `concern` required; `old_mtime`/`new_mtime` mtime deltas only — CR-5); Step 1 cites the table; all four sites and the mtime delta line are written as `{ "path": …, "concern": … }` objects.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — delete block re-binds from `{doc-directory}/.summaries/step-0a-resume-detector.json` (rule 6: the file is the carrier); empty `pr_url` → KEPT before any `gh` call; prose names the fresh-shell rule
- `shared/resources/pipeline-resume-detector-prompt.md` — § Output Schema field table is the one statement of the note-object shape; sites :108, :112, :113, :167 and the mtime delta rewritten as objects; CR-5 mtime fields conditional
- `shared/resources/tests/stale-snapshot-delete.test.mjs` — file-only carrier (no variable injection); E asserts the HALT on an absent file; P runs bind and delete in two separate processes; N2 no-`pr_url` + MERGED stub → KEPT; Q enumerates the prompt's `deltas_since_pause` sites (same-line object or continuation of an object opened above — a ±1 window let neighbours vouch for each other); 36/36 under bash and `zsh -f`
- `shared/resources/advance-pipeline-lock.test.sh` — CR-4: provenance scenario comment corrected, consume asserted (85/85)
- bundled `skills/*/references/` regenerated

**Testing**: Q enumerates every prose line naming `deltas_since_pause` with a quoted literal and requires the literal inside an object on that line or as the continuation of an object the previous line opened; ≥5 object sites as a non-vacuity floor. Mutation: bare string restored at :108, :112, :113 and the wrapped :166–167 → Q red each time (the first draft used a ±1-line window and stayed green at :112 because :113 vouched for it — replaced).

**Verification Steps for QA**: re-run the bug's reproduction against the committed tree; the listed test cases are the executed form.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | New | QA Engineer | Found in QA cycle 4 (cycle 4 scoped review CR-2) |
| 2026-09-20 | In Progress | qa-fix | Investigation started |
| 2026-09-20 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-09-20 | Closed | QA Engineer | Verified fixed in QA cycle 5 (reproductions re-run from two processes under bash and zsh -f; mutation covered) |
