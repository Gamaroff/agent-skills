# Bug Report: Task 52 - Redaction corrupts legitimate body content

**Task**: [Link](./task.52.deferred-mutation-record-and-renderers.md)
**Bug ID**: TASK-52-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-18

## Description

The last entry in `SECRET_SHAPES` is a generic high-entropy rule:

```js
/\b[A-Za-z0-9+/=_-]{32,}\b/g
```

It is applied by `redactString` to **every string in the record**, including free text that is not a
credential-bearing position: `command.stdin`, `intent`, and `manual.fields[].value`. Any unbroken
32+ character run in those fields is silently replaced with `«redacted»`.

## Steps to Reproduce

```bash
node -e '
const dm=require("./shared/resources/defer-mutation.js");
const t=dm.buildEnvTable({});
const body="See commit 9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c and the base64 logo:\niVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";
console.log(dm.redactString(body,t));
'
```

## Expected Behavior

A comment body containing a commit SHA or an embedded base64 asset round-trips **unchanged** — the
task states bodies must "round-trip unchanged", and the whole point of the `manual` renderer is that
a human pastes the body verbatim.

## Actual Behavior

```
See commit «redacted» and the base64 logo:
«redacted»
```

Also affected (all verified):

| Input | Result |
| ----- | ------ |
| 40-char commit SHA | `«redacted»` |
| base64 image/attachment blob | `«redacted»` |
| URL with a long path segment | `«redacted»` |

## Impact

Silent data corruption in the artifact a human is instructed to paste into the tracker. The operator
has no signal that the content was altered — they paste `«redacted»` into a real comment. Commit
SHAs, base64 assets, UUIDs without dashes and long URLs are all common in the DoD summaries and QA
results these records carry, so this is a likely occurrence rather than an exotic one.

It also makes the stated invariant "a body round-trips unchanged" false in the general case.

## Why the existing tests missed it

§9's `handover-hostile-body.jsonl` fixture exercises backticks, `$(…)`, heredoc terminators and CRLF
— but contains **no unbroken 32+ character run**, so the generic rule never fired on it.

## Recommendation

Scope the generic high-entropy rule to **credential-bearing positions only** — argv values following
a secret flag, and auth header values — and never apply it to free text (`stdin`, `intent`,
`manual.fields[].value`).

The primary defence is unaffected: the **environment sweep** catches any actually-configured secret
value wherever it appears, and the **prefixed shapes** (`ghp_`, `github_pat_`, `ATATT`, `Bearer`,
`Basic`, `xox…`) are unambiguous and remain safe to apply everywhere. Only the blunt "32+ chars of
base64 alphabet" heuristic needs narrowing.

Add a fixture whose body contains a commit SHA and a base64 blob, asserting byte-exact round-trip,
alongside the existing credential test asserting real secrets still never survive.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-18

Root cause confirmed by reproducing the failure exactly as described in the report above, before any
change was made.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-18

**Fix**: The generic 32+ character high-entropy rule was removed from the global shape list and now applies only inside `maskOrName`, i.e. in credential-bearing positions. The environment sweep and the unambiguous prefixed shapes still apply to every string.

**Files Modified**: `shared/resources/defer-mutation.js`, `shared/resources/tests/handover-render.test.mjs`

**Testing**: §16 BUG-2 asserts a commit SHA, a base64 blob, a long URL and a branch name all round-trip unchanged, and that a body containing them survives byte-exactly into the script. Mutation-proven: re-adding the rule to the global list turns it red.

**Verification for QA**: run the reproduction command in this report — it now produces the expected
behaviour — then `npm test` (1351 node + 394 shell, all green).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-18 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-18 | In Progress | qa-fix | Reproduced and root-caused |
| 2026-08-18 | Ready for QA | qa-fix | Fixed with a mutation-proven regression test |
