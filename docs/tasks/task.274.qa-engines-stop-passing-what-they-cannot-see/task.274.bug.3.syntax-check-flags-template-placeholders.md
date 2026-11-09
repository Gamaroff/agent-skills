# Bug Report: Task 274 - The syntax check flags documented template placeholders

**Task**: [Link](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Bug ID**: TASK-274-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-11-09

## Description

The new `bash -n` / `zsh -n` check on blocks that are not run (`syntaxFindings` in
`shared/resources/qa-execute-snippets.mjs`) reports a `high` `execution-failure` for a documented
template whose angle-bracket slots are not valid shell. It cannot tell a placeholder from a typo.

## Steps to Reproduce

`command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/probe-boundary-rule.md --copy-as skills:.agents/skills --json`

## Expected Behavior

The block at line 748 (`env -i ... <command> <candidate>`) is a template; it is not a syntax finding.
A real syntax error in a runnable-looking block still is.

## Actual Behavior

Two findings (bash and zsh): `syntax error near unexpected token '<'`. The block is not in this
change's diff, so Step 4b now fails an unchanged document.

## Impact

Noise at `high` severity enters the fix loop on every run over documents with such templates. The
task's real-docs diff covered classification only, not this check, so the rate across the corpus is
unmeasured.

## Recommendation

Skip the syntax check for a block with an unfilled template slot (the same slot test the runner uses
for `placeholder`), and run the check over the tracked docs to count remaining false positives. Add a
control (a template block is not flagged) and keep the broken-block test as the positive case.

## Developer Fix Cycle

### Iteration 1

**Root cause**: a `mutating` block was always syntax-checked, and a documented slot (`<command>`, `<path/to/x>`) is not valid shell. A second cause: a code string starting with `--` was read by `bash -n -c` as an option.

**Fix**: `isSyntaxCheckable` skips a `mutating` block with an unfilled slot (the runner's slot test plus a wider angle shape that allows `/` and `.`), and the check passes `--` before the code. Measured over 192 executed documents (`shared/resources/*.md`, `skills/*/SKILL.md`): five files reported findings before; after the fixes one real one remained, pseudo-code in a bash fence in `skills/response-envelope-enforcer/SKILL.md`, now marked `text`.

**Tests**: template and `--`-led controls beside the broken-block positive case. Mutation proof: dropping the slot test, and dropping the `--`, each turn the syntax-controls test red.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-09 | Ready for QA | qa-fix | Fixed in QA cycle 1 fix; regression tests and mutation proofs added |
| 2026-11-09 | Closed | qa-task | Verified by task.274.qa.2.qa-engines-stop-passing-what-they-cannot-see.md |
