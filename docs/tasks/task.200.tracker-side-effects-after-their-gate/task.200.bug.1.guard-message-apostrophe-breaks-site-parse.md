# Bug Report: Task 200 - The resolver guard's apostrophe stops all eight GitHub sites from parsing

**Task**: [Link](./task.200.tracker-side-effects-after-their-gate.md)
**Bug ID**: TASK-200-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 1, executing the migrated site lines)
**Date Found**: 2026-10-20

## Description

All eight migrated sites guard the resolver's output with this line:

```text
: "${DOC_BRANCH:?doc-link-branch.js resolved no branch — is the skill's bundled copy of it present?}"
```

Bash reads a single quote inside the word of a double-quoted `${VAR:?word}` as opening a quoted
string. The apostrophe in `skill's` opens a quote that never closes, so bash rejects the whole block
before running any of it:

```text
line 8: unexpected EOF while looking for matching `''
```

The wording was introduced during Step 3. The first wording, `is the bundled references/doc-link-branch.js present?`,
had no apostrophe. It tripped `epic-numbering-retirement.test.js` (a bare `references/…` path inside
a root-relative block), and the reword fixed that and broke parsing.

## Steps to Reproduce

1. Copy the `DOC_BRANCH=…` line and the guard line from any of the eight `SKILL.md` files into a
   script, binding the path variable to a real document.
2. Run it: `bash site.sh`. It exits 2 with the EOF error above.

A three-line script with the guard line alone reproduces it.

## Expected Behavior

The block runs: `DOC_BRANCH` is set and the guard passes.

## Actual Behavior

Parse error, exit 2. No link is built, and in an `ensure-*` site no issue is created.

## Impact

Every GitHub issue create and sync that runs these blocks fails. `npm test` stays green because
nothing executes the site lines. `doc-link-branch-population.test.js` only greps them, and
qa-task Step 4b classifies the blocks as mutating (they call `gh`) and skips them.

## Recommendation

Remove the apostrophe from the guard message. Add a committed test that extracts the two site lines
from each of the eight `SKILL.md` files and executes them under bash (and zsh where installed),
asserting each prints a branch. Mutation-prove it by restoring the apostrophe.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-20
**Developer**: qa-fix (develop-task Step 5b, QA cycle 1)

**Root Cause Analysis**: Inside a double-quoted `${VAR:?word}`, bash treats a `'` in `word` as an opening quote, so the guard line `: "${DOC_BRANCH:?… skill's …}"` never closes and every block exits 2 before it runs. The population test reads the lines as text, so it passed.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-20

**Fix Description**: The guard message is now `doc-link-branch.js resolved no branch — check the --doc path and that the bundled resolver is present`, with no apostrophe, in all eight sites.

**Files Modified**:

- `skills/{ensure-bug,ensure-epic,ensure-story,ensure-task}-github-issue/SKILL.md`
- `skills/sync-github-{bug,epic,story,task}/SKILL.md`
- `tests/doc-link-branch-sites-execute.test.js` (new)

**Testing**: The new test lifts the binding, the call and the guard out of each site's fenced block, runs them under bash in a scratch repo with `gh` stubbed, and expects the branch. Its control test proves the runner fails a guard with an apostrophe. Mutation: restoring the apostrophe in `sync-github-bug` turns the test red with `unexpected EOF while looking for matching`. zsh is not installed on this host, so the test runs bash only.

**Verification Steps for QA**:

1. `command node --test tests/doc-link-branch-sites-execute.test.js`: all pass.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-20 | New | qa-task | Filed in QA cycle 1 |
| 2026-10-20 | In Progress | qa-fix | Investigation started |
| 2026-10-20 | Ready for QA | qa-fix | Fix implemented (cycle 1) |
| 2026-10-20 | Closed | qa-task | Verified by task.200.qa.2.tracker-side-effects-after-their-gate.md |
