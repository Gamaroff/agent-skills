# Bug Report: Task 141 - The documented `untested` demotion leaves an accepted row with no `Last run`

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Bug ID**: TASK-141-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA (cycle 1, diff code review CR-1, reproduced)
**Date Found**: 2026-09-22

## Description

The kept-accepted predicate in `cmdSet` is

```js
const kept = state !== "fail" && stateKey(row.state) === "accepted";
```

`untested` is not `fail`, so it is **kept** — the state cell keeps `✅ accepted`. But the block below
it is unconditional:

```js
if (state === "untested") {
  row.run = "";
  row.notes = note ?? "";
}
```

so the row's `Last run` link is cleared and its `accepted <date>` note is overwritten anyway. The
result is `✅ accepted` with an empty `Last run`, which `checkRegistry` rejects
(`accepted requires a Last run link`).

This is not a hypothetical path. It is **the migration path this task documents**, in three places:

- `skills/qa-next/README.md` § Registry states — "To demote one deliberately, `--set <id> untested --note "<why>"` first."
- `CHANGELOG.md` `[Unreleased]` — the Migration line of the breaking change.
- `task.141.qa-next-targeted-item.md` § 5, Breaking Change 1 — "**Migration Path**: … run `uat-status.mjs --set <id> untested --note "<why>"` first".

## Steps to Reproduce

```bash
FIX=$(mktemp -d)
# … scaffold a registry with one row D.1 and a run file runs/D.1/r1.md …
node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --set D.1 pass --run runs/D.1/r1.md
node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --accept D.1 --note "signed off"
node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --set D.1 untested --note "reopening"
node skills/qa-next/scripts/uat-status.mjs --root "$FIX" --check; echo $?
```

## Expected Behavior

`--set <id> untested` moves the row to `⬜ untested`, clears `Last run` and writes the note — the
demotion the documentation promises. `--check` exits 0.

## Actual Behavior

```
D.1: ✅ accepted (kept)
| D.1 | … | ✅ accepted |  | reopening |
[ERROR] D.1: accepted requires a Last run link
uat-check: 1 error(s), 0 warning(s)
exit=1
```

## Impact

The registry is left in a state its own integrity gate rejects, and the owner's sign-off provenance
is destroyed in the same call. `/qa-next` Step 0 treats a non-zero `--check` as **HALT
`registry-invalid`** — "never test on top of a registry that is lying" — so the whole UAT loop stops
until someone repairs the row by hand. The only documented way out of an accepted row is the command
that breaks it.

## Recommendation

Exclude `untested` from the kept predicate, so the one verdict whose whole purpose is to move an
accepted row is allowed to:

```js
const kept = !["fail", "untested"].includes(state) && stateKey(row.state) === "accepted";
```

Then add the missing test leg. The existing accepted-row group loops over `blocked` and `na` and
asserts `pass` and `fail` separately — `untested` is the one verdict it never sends, which is why
ten mutations all went red and none of them caught this.

## Notes

`git show origin/develop:skills/qa-next/scripts/uat-status.mjs` has no `kept` predicate at all —
the branch introduces it, so this is **not pre-existing**.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-22

The kept predicate was written as one clause over the verdict set — deliberately, because guarding
`pass` alone leaves the same defect reachable through `blocked` and `na`. That reasoning is right and
stays. What it missed is that `untested` is **not a verdict at all**: `pass`, `fail`, `blocked` and
`na` are all claims about what was observed, and `untested` is the absence of a claim — the
deliberate demotion. The predicate's own comment argues that none of `pass`/`blocked`/`na` is
*evidence against* an owner's judgement, which is true and does not apply to `untested`, whose whole
purpose is to withdraw the judgement.

**Root Cause**: `untested` fell into the "not a fail" bucket of a predicate written to reason about
verdicts, and the `if (state === "untested")` block below it is unconditional, so the row kept `✅`
while its `Last run` was cleared — an inconsistent row rather than either intended outcome.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-22

**Fix Description**: `untested` is excluded alongside `fail`:

```js
const kept =
  !["fail", "untested"].includes(state) && stateKey(row.state) === "accepted";
```

The comment beside it now states *why* `untested` is not in the kept set — it is the demotion, not a
verdict — so the next reader does not re-derive the original mistake.

**Files Modified**:

- `skills/qa-next/scripts/uat-status.mjs` — the kept predicate and its comment
- `evals/qa-next/unit/uat-status.test.mjs` — the `untested` leg the accepted-row group never sent

**Testing**: the new leg asserts the row moves to `⬜`, prints no `(kept)`, clears `Last run`, writes
the note, leaves `--check` at 0 and is back in the selector's queue. **Mutation-proved**: reverting
the fix (`!["fail"]`) turns that test red.

**Verification Steps for QA**:

1. Accept a row, then `--set <id> untested --note "<why>"`.
2. The row reads `⬜ untested`, `Last run` is empty, the note is written, no `(kept)`.
3. `--check` exits 0.

---

## Status History

| Date       | Status       | Changed By | Notes                                        |
| ---------- | ------------ | ---------- | -------------------------------------------- |
| 2026-09-22 | New          | qa-task    | Found in QA cycle 1 (CR-1), reproduced       |
| 2026-09-22 | In Progress  | qa-fix     | Root cause: untested is not a verdict        |
| 2026-09-22 | Ready for QA | qa-fix     | Predicate corrected; test leg added + proved |
