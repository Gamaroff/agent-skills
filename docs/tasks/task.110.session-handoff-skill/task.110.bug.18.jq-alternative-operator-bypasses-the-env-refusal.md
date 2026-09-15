# Bug Report: Task 110 - The jq `env` refusal exempts a `/` before the word, and jq's `//` operator is that character: `null//env` prints the environment

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-18
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (reviewer CR-1, confirmed by execution)
**Date Found**: 2026-09-15

## Description

The cycle-9 fix for QA-4 (`jq -n env` echoes the verifier's inherited environment into the
measured figure) refuses a jq positional containing the bare word `env` — unless it is preceded
by `.` (a key: `.env`) or `/` (a path segment: `data/env.json`). jq's alternative operator is
`//`, so the exemption written for file paths admits the builtin again:

```
jq -n null//env      → admitted    jq -n .//env       → admitted
jq -n 1//env         → admitted    jq -n [.//env]     → admitted
```

**Executed** (QA cycle 10), through the CLI under a stripped environment with `CANARY_SECRET`
set:

```
- jq alt env <!-- cmd: jq -n null//env; expect: canary-9-xyz -->
```

→ verdict **`confirmed`**, measured `PATH: … · HOME: … · CANARY_SECRET: canary-9-xyz …` — the
entire environment, tokens included, in the report. The fix closed the spelling it was given and
left the operator that makes the same word reachable in one more character.

## Steps to Reproduce

```bash
printf -- '- x <!-- cmd: jq -n null//env; expect: canary -->\n' > /tmp/h.md
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/h9 CI=1 CANARY_SECRET=canary \
  node skills/session-handoff/scripts/handoff-verify.mjs /tmp/h.md --json     # confirmed; measured carries CANARY_SECRET
```

## Expected Behavior

The word `env` is refused in jq's **filter** with no `/` exemption at all — a filter never needs
a path segment — and the `/` exemption, if kept, applies only to file positionals after it. Or:
the runner spawns every child with a scrubbed environment and no admitted command can read a
token in the first place, which retires this class (CR-6's measured echo of secrets included)
rather than its spellings.

## Actual Behavior

`jq -n null//env` is admitted and prints every environment variable the verifier inherited.

## Impact

Secret disclosure into the read-mode report through a documented builtin, with no path knowledge
needed — the QA-4 finding, reopened by its own fix. The report is printed to the reader's terminal
or `--json` stream; nothing in this repository posts it anywhere, which is why the class has been
held at MEDIUM rather than HIGH, and why it is not LOW: the fix regressed.

## Recommendation

Judge the filter separately from the file positionals: the first positional of `jq` is the filter
(when `-f`/`--from-file` is refused, which it is), held to `/^(?![\s\S]*(?:^|[^A-Za-z0-9_.])env(?![A-Za-z0-9_]))/`
(no `/` exemption); later positionals keep the path rule. Refused-list tests for `null//env`,
`.//env`, `[.//env]`, `1//env`; allowed for `.env`, `. data/env.json`. Consider the scrubbed-child
environment as the mechanism that ends the class.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 10)

**Root Cause**: the cycle-9 `env` refusal exempted the word when preceded by `/` so a file path with an `env` segment stayed admitted; jq's alternative operator is `//`, so the exemption written for paths re-admitted the builtin one character away.

**Fix**: the `/` exemption is gone — the bare word `env` is refused in every jq positional unless preceded by `.` (a key). A file named `env.json` or a directory named `env` is now refused too; that is the documented price, and a filter is not. The first-positional-only variant was considered and not taken: `--arg`/`--argjson` values fall through as positionals, so "the first positional" is not reliably the filter. A scrubbed child environment — the mechanism that would retire the class (CR-6 included) — is recorded as future work, not done here: `gh`, `git` over ssh and `npm` each read the reader's environment legitimately.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `UTIL_SPECS.jq.positionalPattern`
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `null//env`, `.//env`, `[.//env]`, `1//env`, `. data/env.json` (moved from the allowed list); allowed: `.env`, `.environment`
- `skills/session-handoff/SKILL.md` — jq row

**Testing**: 31/31. Mutation-proved red: the `/` exemption restored. Re-executed through the fixed verifier under a stripped env with `CANARY_SECRET`: `jq -n null//env` → `unverifiable: not on whitelist: jq`.

**Verification Steps for QA**:
1. `isAllowed("jq -n null//env").ok === false`; `isAllowed("jq .env x.json").ok === true`.
2. Through the CLI: the line reads `unverifiable`; measured is empty.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 10 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | `/` exemption removed; `env` refused in every jq positional unless a key |
