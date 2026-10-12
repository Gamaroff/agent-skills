# Bug Report: Task 180 - A shell syntax error caused by the substitution is scored as a refusal

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Bug ID**: TASK-180-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 1, code review CR-1, reproduced)
**Date Found**: 2026-10-12

## Description

`runFenceCase` scores every non-zero exit as `rejected` when a case carries no `expected`. A hostile
input that breaks the block's shell syntax once substituted — a `"` inside `X="<slot>"` — makes the
shell exit 2 with a parse error before any guard runs, and that is read as the guard refusing the
input. A block with no guard at all then scores `engages`.

## Steps to Reproduce

A doc whose block is `X="<slot>"` then `exit 0` (it admits everything), probed with a hostile case
`a"b` and a legitimate case `ok`:

```
runProbeSpec({ entry: "fence:doc.md#G", slot: "<slot>", cases: [hostile a"b, legitimate ok] })
→ engages  [["h.quote","rejected",2,"exit 2: "],["l.ok","accepted",0,null]]
```

## Expected Behavior

A run that fails because the substituted script does not parse is `errored` ("could not look"),
never `rejected` — the cli: arm makes the same split for a Node crash (`NODE_FATAL_FOOTER`).

## Actual Behavior

Scored `rejected`; the verdict reads `engages` for a block that refuses nothing.

## Impact

A false `engages` — the security engine's worst outcome, and the one it exists to prevent. Any case
set whose hostile inputs carry a quote, backtick or unbalanced `$(` can mask an absent guard.

## Recommendation

Score a run `errored` when its stderr shows a shell parse failure in the generated script (bash:
`<script>: line N: syntax error …` / `unexpected EOF while looking for matching`; zsh: `parse error`),
with a regression test on the reproduction above (an accept-all block must not score `engages`), and
mutation-prove it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-12
**Developer**: qa-fix (develop-task pipeline, QA cycle 1)

**Root cause**: `runFenceCase` mapped every non-zero exit without `expected` to `rejected`. A shell that cannot parse the substituted script exits 2 with its own message about the script, which is not the guard answering.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-12

Added `isShellParseFailure(child, scriptPath)` — keyed on the shell's message about the generated script (bash `<script>: line N: syntax error` / `unexpected EOF`, zsh `<script>:N: parse error` / `unmatched`), never on the exit code alone — and score such a run `errored` ("the guard never answered"). The rejection detail now quotes stderr first (CR-4). The exit-status rule is restated with the new clause at every site that states it for `fence:`.

**Files Modified**:
- `shared/resources/security-probe.mjs` — `isShellParseFailure`, the errored branch, stderr-first detail
- `shared/resources/tests/security-probe.test.mjs` — regression test (accept-all block + `a"b` → errored, verdict not `engages`) with a control case (a guard that refuses with "syntax error" on stderr is still `rejected`)
- `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, qa-task / qa-story `SKILL.md`, `CHANGELOG.md` — the clause

**Testing**: Mutation: the errored branch removed → the regression test red (`outcome "rejected" … exit 2`). zsh message shapes are matched but not exercised on this host (no zsh).

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-10-12 | New          | qa-task    | QA cycle 1 |
| 2026-10-12 | In Progress  | qa-fix     | Investigation started |
| 2026-10-12 | Ready for QA | qa-fix     | Fix implemented, mutation-proven |
