# Bug Report: Task 227 - The no-rm guard misses `rm` after a shell keyword or a prefix command

**Task**: [Link](./task.227.step-8-checklist-no-rm.md)
**Bug ID**: TASK-227-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 1; diff review CR-2, measured by QA)
**Date Found**: 2026-10-24

## Description

The guard `no fenced block that calls --complete carries an rm invocation` (`shared/resources/tests/step-8-completion-checklist.test.mjs`) decides a line is an `rm` call with `RM_WORD = /(^|[;&|({]\s*)rm\s/`. That pattern sees `rm` only at the start of a line or after `;`, `&`, `|`, `(` or `{`. The task's own success criterion says the guard fails if an `rm` invocation is added to the block. That holds for the forms in the control test and not for others.

## Expected Behavior

Any line that runs `rm` is a hit, including `rm` after a shell keyword (`then`, `do`, `else`, `!`), after a prefix command (`command`, `xargs`, `sudo`), and `rm` called by path (`/bin/rm`).

## Actual Behavior

Measured with `node -e` against the committed pattern:

| Line | RM_WORD |
| --- | --- |
| `if true; then rm a; fi` | miss |
| `then rm a` | miss |
| `do rm a; done` | miss |
| `! rm a` | miss |
| `command rm -f a` | miss |
| `xargs rm -f` | miss |
| `sudo rm a` | miss |
| `/bin/rm a` | miss |
| `x && rm a`, `rm -- a`, `  rm a` | hit |

`if …; then rm -f x; fi` is the most common removal shape in this repository's step docs. A block written that way passes the guard.

The `RM_WORD` control test lists only the forms the pattern already matches, so it cannot show the gap. `RM_WORD` is also a module-private `const`, so the security probe cannot reach it (`probes_executed: 0`).

## Impact

The guard is what keeps the Completion Checklist block free of removals that a host may refuse (obs #87). With these gaps, a later edit can bring that failure back while the guard still passes.

## Recommendation

1. Match `rm` as a command word after `then`, `do`, `else` and `!`, after `command`, `xargs`, `sudo` and `exec`, and when it is called by a path ending in `/rm`.
2. Add each of those forms to the control test's hit list. Add near-misses (`confirm`, `docker run --rm`, `# rm`) to its miss list.
3. Export the matcher as a function, for example `isRmInvocation(line)`, so `security-probe.mjs` can reach it with the JS entry form. Run it once with the `shell-exec` sink, or record why that sink does not fit.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-24

**Root Cause**: `RM_WORD` approximated "rm in command position" as "rm after a separator or an opener". Command position also follows a shell keyword (`then`, `do`, `else`, `!`) and the argument list of a prefix command (`command`, `sudo`, `xargs`), and `rm` can be named by path (`/bin/rm`) or through quote and escape removal (`r'm'`, `"rm"`, `\rm`). Telling command position from argument position needs a shell parser.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- The matcher moved to `shared/resources/tests/lib/rm-invocation.mjs` as `lineRunsNoRm(line)`, so `security-probe.mjs` can import it.
- The rule is now a word, not a position: `rm`, or a path ending in `/rm`, bounded by whitespace, a separator, an opener or `!`, after quotes and backslashes are removed. It errs toward a false hit (`echo "rm it"` counts), which fails the guard on a line that runs nothing rather than letting a stalled run through.
- A trailing comment is no longer stripped: `echo " # " ; rm a` would have hidden the `rm`. Only a line that is a comment is skipped.
- The guard also asserts it read a `--complete` block in `develop-pipeline-step-8-commit.md` itself, not just in some file.

**Files Modified**:

- `shared/resources/tests/lib/rm-invocation.mjs` (new)
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `CHANGELOG.md`

**Testing**:

- Control test `lineRunsNoRm refuses every way a line runs rm and nothing else`: 19 forms refused (including every form this report lists), 6 accepted.
- Mutation: the old pattern put back → the control test fails on `if true; then rm -f a; fi`; restored (`cmp`).
- `security-probe.mjs --sink shell-exec --entry shared/resources/tests/lib/rm-invocation.mjs#lineRunsNoRm` with an rm-specific case file: first run `present-but-inert` (`r'm'`, `"rm"` and `\rm` accepted), after quote and escape removal `engages` (13 hostile refused, 4 legitimate accepted, 0 over-blocked). The corpus's own shell-exec cases probe command-name allow-lists, not `rm`, and read `absent` for that reason.

**Not covered**: `find … -delete`, `unlink`, and `rm` named through a variable (`$RM`). Stated in the module header.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-24 | New | qa-task | Found by task.227.qa.1.step-8-checklist-no-rm.md |
| 2026-10-24 | In Progress | qa-fix | Investigation started (QA cycle 1 fix) |
| 2026-10-24 | Ready for QA | qa-fix | Fix implemented; mutation-proven |
| 2026-10-24 | Closed | qa-task | Verified by task.227.qa.2.step-8-checklist-no-rm.md |
