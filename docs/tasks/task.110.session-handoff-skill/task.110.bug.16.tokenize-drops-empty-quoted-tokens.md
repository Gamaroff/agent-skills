# Bug Report: Task 110 - `tokenize()` drops an empty quoted token, so the argv that runs is not the command the handoff recorded

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-16
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (reviewer CR-1, confirmed by execution)
**Date Found**: 2026-09-15

## Description

`tokenize()` (`handoff-verify.mjs:1210`) pushes a token only `if (cur)`, so a quote pair that
closes on nothing — `""` or `''` — yields no token at all. The argv the whitelist judges and the
argv that runs are still the same (the safety property holds), but neither is the command the
author wrote:

- `grep -c "" README.md` → `["grep","-c","README.md"]` — the pattern is now `README.md`, the file
  is stdin (`/dev/null` under the runner), and grep prints `0`.
- `jq --arg x "" . f` → `["jq","--arg","x",".","f"]` — `.` becomes the arg value and `f` the filter.
- An unterminated quote is swallowed silently: `grep -c "a b` → `["grep","-c","a b"]`.

**Executed** (QA cycle 9), through the CLI against a one-line `README.md`:

```
- grep empty pattern **0** <!-- cmd: grep -c "" README.md; expect: 0 -->
```

→ verdict **`confirmed`**, measured `0`. The file has one line; `grep -c "" README.md` prints `1`.
The handoff's figure was confirmed against a command it never named.

## Steps to Reproduce

```bash
command node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(JSON.stringify(m.tokenize(`grep -c "" README.md`))))'
# ["grep","-c","README.md"]
```

## Expected Behavior

A closed quote pair is a token even when empty (`["grep","-c","","README.md"]`), and an
unterminated quote is a refusal (`unverifiable: unterminated quote`), never a silent guess.

## Actual Behavior

The empty token vanishes; the command that runs has one fewer argument than the one recorded,
and the verdict is measured against it.

## Impact

Correctness of the verdict, not safety: a `confirmed` that is about the wrong command is the
one outcome read mode exists to prevent. `grep -c ""` is the idiomatic line count and a plausible
handoff figure.

## Recommendation

Track `sawQuote` per token in `tokenize()` and push when either `cur` is non-empty or a quote
pair closed; return a refusal marker (or throw a typed error `isAllowed` maps to
`unterminated quote`) when `q` is still set at end of input. Tests: the three spellings above plus
the CLI line, expecting `["grep","-c","","README.md"]` and `unverifiable` for the unterminated one.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 9)

**Root Cause**: `tokenize()` pushed a token only when its accumulated text was non-empty, so a closed quote pair around nothing (`""`, `''`) produced no token; and an unterminated quote fell off the end of the loop with the partial text pushed as if the quote had closed.

**Fix**: a per-token `quoted` flag records that a quote pair closed inside the current token; the token is pushed when it has text **or** was quoted. An unterminated quote makes `tokenize()` return `null`, which `isAllowed` maps to `{ ok: false, detail: "unterminated quote" }` — the line reads `unverifiable: unterminated quote` rather than running a guess. `grep -c "" README.md` now runs with four arguments and measures the file's line count.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `tokenize()`, `isAllowed()`
- `skills/session-handoff/tests/handoff-verify.test.js` — new test: the three spellings from the report, the argv `isAllowed` returns, a quote pair glued to a word (`"b c"d` → `b cd`), and the unterminated case through both `tokenize` and `isAllowed`
- `skills/session-handoff/SKILL.md` — the operator line notes the empty token and the unterminated refusal

**Testing**: 31/31. Mutation-proved red: the empty token dropped again; the unterminated quote tolerated again. Re-executed through the fixed verifier against a one-line README: `grep -c "" README.md; expect: 0` → `stale: moved: 0` with measured `1`; `expect: 1` → `confirmed`; `grep -c "a b README.md` → `unverifiable: unterminated quote`.

**Verification Steps for QA**:
1. `tokenize('grep -c "" README.md')` → `["grep","-c","","README.md"]`; `tokenize('grep -c "a b')` → `null`.
2. Through the CLI: the empty-pattern line measures the real line count.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 9 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Empty quoted token preserved; unterminated quote refused as `unverifiable: unterminated quote` |
