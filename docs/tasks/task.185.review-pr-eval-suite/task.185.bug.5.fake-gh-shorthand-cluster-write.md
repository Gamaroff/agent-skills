# Bug Report: Task 185 - the fake gh serves a combined shorthand write as a read

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-5
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 5: direct boundary probes and code review CR-1, found independently)
**Date Found**: 2026-10-05

## Description

Commit `9ee9f21a` fixed the `/finalise` DoD gap for a glued short value flag (`-XPOST`, `-fbody=x`).
It splits a token only when its **first** flag character takes a value. pflag, which `gh` uses,
also accepts a cluster of short flags in one token: booleans first, then at most one value flag
that takes the rest of the token or the next argument. `gh api` has the boolean `-i` (`--include`),
so `-iXPOST` means `-i -X POST`. `parseArgs` reads `-iXPOST` as one boolean flag named `-iXPOST`,
so the write is never seen.

## Steps to Reproduce

Serve `repos/eval/widgets/issues/12/comments` from an `api` fixture and call `runFakeGh`:

| argv | Result | Expected |
|---|---|---|
| `api -iXPOST <path>` | served, exit 0 | refused |
| `api -ifb=x <path>` | served, exit 0 | refused |
| `api -iX POST <path>` | exit 1, `notFound` (`POST` taken as the key) | refused |
| `api -if b=x <path>` | exit 1, `notFound` | refused |

27 other forms in the same run behaved correctly (31 executed in all).

## Expected Behavior

Every argv that real `gh` would send as a write is refused and logged `"refused": true`, whatever
the fixtures serve.

## Actual Behavior

None of the four forms is logged `refused` or `unhandled`, so a scenario's "never posts" assertion,
which searches the log for those two flags, passes on a run that tried to post.

## Impact

Latent in the review-pr suite, which serves no `api` fixture: there the first two forms are logged
`unhandled` and the scenario fails. It is live for any future scenario that serves an `api` path.

## Recommendation

Parse a single-dash token longer than two characters the way pflag's shorthand parser does. Walk
its characters, recording each as a short flag. At the first character that is a value flag, take
the rest of the token (dropping a leading `=`) or, when the rest is empty, the next argument, then
stop. Add the four forms above to `fake-gh.test.mjs` and mutation-prove them.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-05

**Root Cause**: `9ee9f21a` special-cased one shape, a token whose first flag character takes a
value. pflag's rule is general: a single-dash token is a cluster of short flags, and the first value
flag in it takes the rest of the token or the next argument. A second special case would leave the
next shape (`-iHx -XPOST`, `-iX=POST`) to the next cycle.

**Narrowing residue**: the write-refusal argv parse (repeat subject: this bug cites the prior fix)
**Move**: consolidate. Replace the special case with pflag's own shorthand rule, one mechanism that
matches real `gh`, rather than patching a second shape.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:

- `parseArgs` walks every single-dash token longer than two characters as a cluster. Each character
  is a short flag. The first value flag takes the rest of the token (minus a leading `=`), or the next
  argument when nothing is left. A boolean followed by `=` (`-i=true`) ends the cluster.
- `fake-gh.test.mjs`: a new test. The reads `-i` and `-iXGET` are served (the floor), and `-iXPOST`,
  `-iX POST`, `-ifb=x` and `-if b=x` are refused.
- `evals/shared/README.md`: the writes bullet names clusters.

**Files Modified**:

- `evals/shared/lib/fake-gh.mjs`
- `evals/shared/tests/fake-gh.test.mjs`
- `evals/shared/README.md`

**Testing**:

- `fake-gh.test.mjs` 10/10; `evals/shared/tests/*.test.mjs` 600/600; `eval:review-pr` replay 4/4.
- Direct probes: the cycle-5 set (31 forms) all correct. A second set of 15 forms checks reads the
  cluster walk could break (`-q.title`, `-L5`, `-L=5`, `-Reval/widgets`, `-HAccept:x`, `-iH x`,
  `-i=true`) and more writes (`-iHAccept:x -XPOST`, `-bhi`, `-iX=POST`, `-iFb=@f`). All correct.
- Mutation-proven:
  - Walk only the first character: the cluster test fails, so it is covered.
  - Remove the cluster branch: both the cluster test and the glued test fail, so both are covered.

**Verification Steps for QA**:

1. `command node --test evals/shared/tests/fake-gh.test.mjs`
2. Serve an `api` path and confirm `gh api -iXPOST <path>` exits 1 with `"refused": true`.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-05 | New | qa-task | QA cycle 5 |
| 2026-10-05 | In Progress | qa-fix | Investigation started |
| 2026-10-05 | Ready for QA | qa-fix | Cluster walk implemented; mutation-proved |
