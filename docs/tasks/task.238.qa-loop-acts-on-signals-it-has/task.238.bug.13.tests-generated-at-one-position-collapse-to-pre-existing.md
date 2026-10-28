# Bug Report: Task 238 - Tests generated at one position collapse to pre-existing

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-13
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 6 probe engine, PRB6-1)
**Date Found**: 2026-10-28

## Description

`fast-gate-outcome.sh` keys each failing test on `file<TAB>line:column<TAB>name` and then runs
`sort -u` on both sides (`:169` for the head, `:245` for the base). Tests generated in a loop share
a file, a line, a column and a leaf name, such as `for (const m of ["GET", "POST"]) describe(m, () =>
it("returns 200", …))`. Node's spec summary omits the describe, so every such failure prints the same
key. `sort -u` folds them into one line. One base failure at that key then matches any number of
head failures there, and a head-only failure is classed `pre-existing`.

The TAP reporter is not affected. It lists the failing describe (`POST`) with its own location, so
the comparison finds a head-only line.

## Steps to Reproduce

On node 26.8.2, in a scratch repository:

1. Commit `api.test.mjs` on `develop`. It holds
   `const broken = new Set(["GET"]);` and
   `for (const m of ["GET", "POST"]) describe(m, () => { it("returns 200", () => assert.ok(!broken.has(m))); });`.
   At the base, GET fails and POST passes.
2. On a feature branch, change the set to `new Set(["GET", "POST"])`. No line moves.
3. `node --test > gate.log`, which exits 1 with two `test at api.test.mjs:4:54` / `✖ returns 200` entries.
4. `fast-gate-outcome.sh --log gate.log --exit 1 --base develop`.

The probe case `log-same-key-twice` (`task.238.qa.6.security.cases.2.json`, record
`task.238.qa.6.security.run.json`) reproduces the same result against the cycle 5 fixture: a log
naming `t.test.mjs:3:1` / `a` twice, with `a` failing once at the base.

## Expected Behavior

`BASE_CHECK=unavailable (fails only on the head: …)`, `GATE_OUTCOME=attributable`.

## Actual Behavior

`GATE_OUTCOME=pre-existing (returns 200;)` in spec mode. In TAP mode the same change reads
`attributable (fails only on the head: api.test.mjs 4:34 POST)`.

## Impact

A head-only test failure is committed and pushed as pre-existing, with no triage and no retry spent.
Spec is node's default reporter. Parametrised `describe` and `it` blocks are a common test shape.
This is the bug.10 class (identity across describes) at the one position bug.10's fix cannot tell
apart.

## Recommendation

Two parts, both needed:

- Compare multiplicities rather than sets. Drop `-u`, so that `comm -23` pairs duplicate lines one
  for one: two head failures against one base failure leave one head-only line.
- Treat a key that names more than one test as ambiguous, and so attributable. Multiplicity alone
  does not catch a head that fixes GET and breaks POST, which is one failure at the key on each side.
  The base can be run with TAP, where passing tests carry a `location:` too, to count the tests at
  each head key.

`fast-gate-outcome.sh` now carries HIGH findings in gates 4, 5 and 6. Gate 5's recommendation stands:
accept only the log shape the comparison can read unambiguously, rather than add another deny rule.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: the comparison keyed a failure on what the gate log prints. A spec log does not
print enough to tell tests generated at one position apart, so no key built from it can.

**Third strike**: `fast-gate-outcome.sh` had HIGH findings in gates 4, 5 and 6. The owner chose to
delete the mechanism rather than patch it again.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/fast-gate-outcome.sh`): the `pre-existing` outcome and the
whole base-worktree comparison are deleted. Any red that is not "not measured" is attributable. The
key this bug collapsed no longer exists. A structured comparison is recorded as Deferred Work on the
task.

**Testing**:

- **Red before**: "attributable: two failures at one position, as a loop-generated describe prints
  them (bug.13)" reads `pre-existing` against a base whose test is red.
- **Green after**: it passes, and the base is never touched.
- **Mutations**: re-adding a base worktree, and printing `pre-existing` for a red, each turn it red.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found by QA cycle 6 (`task.238.qa.6.qa-loop-acts-on-signals-it-has.md`) |
| 2026-10-28 | In Progress | qa-fix | Investigation started; third strike on `fast-gate-outcome.sh` |
| 2026-10-28 | Ready for QA | qa-fix | Fixed by deleting `pre-existing` (QA cycle 6 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.7.qa-loop-acts-on-signals-it-has.md |
