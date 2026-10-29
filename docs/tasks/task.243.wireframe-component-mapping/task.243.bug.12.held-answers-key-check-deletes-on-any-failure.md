# Bug Report: Task 243 - The held-answers key check deletes the file on any failure

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-12
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

The check at `develop-pipeline-step-1-create-branch.md:125` compares
`$(jq -r '.document // empty' "$HELD")` with `"{document-file}"` and runs `rm -f` whenever the two
differ. Four different states all end in that same silent delete:

- the answers belong to another document;
- the file cannot be parsed;
- `jq` is missing;
- the same document is written as a different path string (`./docs/x.md` against `docs/x.md`).

In the last three, this run's own answers are thrown away, and Step 2 then reports those nodes as
not answered. Separately, `{document-file}` is substituted inside double quotes, so a path holding
`$`, a backtick or `"` is changed by bash before the comparison.

## Expected Behavior

Only another document's answers are discarded. A file that cannot be read stops the run and is kept.

## Actual Behavior

Every failure deletes the file.

## Recommendation

Compare inside `jq -e --arg` on paths with any leading `./` removed. Read its exit status: 1 means
another document (discard), and 2 or more means unreadable (keep the file and HALT). Single-quote the
document path.

## Developer Fix Cycle

### Iteration 1

**Root Cause**: the check folded "not this document" and "could not read it" into one `!=`.

**Fix**: the document path goes into the single-quoted `DOC='{document-file}'` and is compared by
`jq -e --arg d "$DOC"`, with `ltrimstr("./")` applied to both sides. The exit status decides:
- 0 keeps the file;
- 1 discards another document's answers;
- anything else prints `HALT`, exits 1 and keeps the file.

**Testing**:
- "Step 2's key check keeps this document's answers however the path is spelled" covers
  `./docs/story.md` against `docs/story.md`, the reverse, and a path holding `$HOME` and backticks.
- "Step 2's key check halts on an unreadable answers file and keeps it" covers an invalid JSON file
  and the old array format.

Mutation-proven: dropping the normalisation, double-quoting the path, or deleting on exit 2 each
turns its test red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-29 | New | QA Engineer | Found in QA cycle 4 (code review CR-3) |
| 2026-10-29 | In Progress | qa-fix | Root cause identified |
| 2026-10-29 | Ready for QA | qa-fix | Fix implemented with mutation-proven tests (qa-fix cycle 4) |
| 2026-10-29 | Closed | QA Engineer | Verified in QA cycle 5: mutation-proven tests hold at 95e5168d |
