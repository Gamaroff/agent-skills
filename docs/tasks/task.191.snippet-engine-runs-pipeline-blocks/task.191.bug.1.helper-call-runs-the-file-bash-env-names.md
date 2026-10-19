# Bug Report: Task 191 - A helper call runs the file `BASH_ENV` names, unclassified

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, QA-1)
**Date Found**: 2026-10-19

## Description

A block that calls an admitted helper and sets `BASH_ENV` (inline, `BASH_ENV=x bash h.sh`, or exported first) classifies `runnable`. Non-interactive bash sources `$BASH_ENV` before the script, so a file the classifier never read runs. An exported `SHELLOPTS` + `PS4` reaches the same result through xtrace.

## Steps to Reproduce

Fixture: `h/write.sh` = `echo UNVETTED-RAN; mv a b`, `h/read.sh` = `echo read-ok`; block `BASH_ENV=h/write.sh bash h/read.sh`, run with `--copy` of the fixture. Output: `UNVETTED-RAN` then `read-ok`. The develop engine refuses the same block (`unrecognised-command: bash`) — new to this change.

## Expected Behavior

Refused: a helper call is not recognised in a block (or a sourced helper) that sets, exports or prefixes a variable a shell reads at start-up — at least `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `PS4`.

## Actual Behavior

Classified runnable; the unvetted file executes inside the temp copy.

## Impact

The helper rule's central claim — a helper is only as permissive as its text — fails: the shell runs code the rule never read.

## Recommendation

The plan already named this (`helper call with BASH_ENV`); implement it over the set above, and add each shape as a control test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: The helper rule vetted the helper's text but not the shell's start-up: bash sources `$BASH_ENV` (sh `$ENV`) before the script, and an exported xtrace expands `PS4`. The plan named the refusal; it was never implemented.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: `STARTUP_VARIABLES` (`BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `PS4`). A block with a helper call is refused when its text, a helper it sources, or a `--bind` names one: `helper call with a shell start-up variable set (…)`. Rule doc §2aa condition 5.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 QA-1: a helper call is refused when anything names a shell start-up variable` (6 shapes plus `--bind`) and `… the BASH_ENV file never runs (executed, not only classified)`. Mutation: disabling the refusal turns both red.

**Verification Steps for QA**: Re-run the cycle-1 repro: `BASH_ENV=h/write.sh bash h/read.sh` is skipped as mutating, and `UNVETTED-RAN` never prints.

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: The refusal matched the start-up variables' literal spellings. The scan reads an argument without removing quotes or backslashes, so `export BASH\_ENV=…` set the variable while naming nothing the regex knew.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: An allow-list over the names, not a longer list of spellings: every `export`, `local`, `readonly` and `read` in a block (or a helper it sources) that holds a helper call must name plain identifiers as written; `-n`, `export -f` and `printf -v` are refused outright (`assignmentHazard`). A `--bind` key that is not a plain name is refused with the start-up variables. Rule doc §2aa condition 5.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR2-3: a start-up variable set through a name the scan cannot read is refused` — the three cycle-2 respellings, `read`, `local -n`, a `BASH_FUNC_…%%` bind, and an executed run whose file never runs. Mutation: `assignmentHazard` → null turns it red; dropping the non-plain-key arm turns it red.

**Verification Steps for QA**: `export BASH\_ENV=h/write.sh; bash h/plain.sh`, `export "BASH""_ENV"=…` and `export "$(echo bash_env | tr a-z A-Z)=…"` are each `mutating`, `helper call with export of a non-literal name`.

## QA Verification — cycle 2 (Reopened)

The cycle-1 repros are refused. The refusal matches the **literal spelling** of the variable name, so a respelling passes (CR2-3): `export BASH\_ENV=h/plain.sh; bash h/plain.sh`, `export "BASH""_ENV"=…; bash …` and `export "$(echo bash_env | tr a-z A-Z)=…"; bash …` all classify `runnable`, and bash sources the named file first. Fix by refusing a helper call in any block (or sourced helper) that runs `export`/`declare`/`typeset`/`readonly`/`set -a`/`printf -v`, or assigns through a name that is not a literal identifier, rather than by matching names. Starting the helper shells with these variables forcibly unset is the other route.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 1 |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven |
| 2026-10-19 | Reopened | qa-task | Not fixed by task.191.qa.2.snippet-engine-runs-pipeline-blocks.md — the named repro is refused, a respelling of it is not (cycle 2 CR2-3) |
| 2026-10-19 | In Progress | qa-fix | Investigation started (QA cycle 2) |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven (QA cycle 2) |
