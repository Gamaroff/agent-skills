---
id: task.232.plan
title: "Implementation Plan: Probe path assertions — nested absent and a new removed"
type: plan
task-ref: task.232.probe-expected-path-assertions.md
---

# Implementation Plan: Probe path assertions — nested `absent` and a new `removed`

> Requirements and success criteria: [task.232.probe-expected-path-assertions.md](task.232.probe-expected-path-assertions.md)

## Overview

Widen the path grammar in `expectedProblem`, add `removed`, move the four inline collision checks into one exported helper that compares full normalised paths, and make `compareExpected` resolve paths without following a symlink out. Tests come first, on every form that reads `expected`.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**Files to modify:**

- `shared/resources/tests/security-probe.test.mjs`: new tests; the `:943` row changes.
- `shared/resources/tests/fixtures/security-probe/`: new fixture scripts.

**New fixtures** (bash, each taking the case directory as `$1` like the existing `shell:` fixtures, and `cd "$1"` first):

- `nested-write.sh`: `mkdir -p sub && : > sub/marker`, then prints the expected stdout. The side-effect case for `absent: ["sub/marker"]`.
- `remover.sh`: `rm -f sub/target` and prints. The `removed` pass case.
- `non-remover.sh`: prints and removes nothing. The `removed` mismatch case.
- `symlink-out.sh`: `ln -s "$OUTSIDE" out` where `OUTSIDE` comes from the case's `fixture.env`. The containment case with `absent: ["out/x"]`.

For `shell-argv:`, `cli:` and `fence:` reuse the same behaviour in the form each needs (an `--argv` template; a `.mjs` CLI; a fenced block in a fixture doc). Copy the shape of the nearest existing fixture of that form rather than inventing one: `cli-echo.mjs` for `cli:`, and the existing `fence:` fixture doc used by the fence tests.

**The `:943` row.** Today:

```js
[{ exit: 0, absent: ["a/b"] }, /expected\.absent.*must be an array/],
```

After: `a/b` moves to the valid list, and the refusal rows become `["../a"]`, `["/abs"]`, `["a/../../b"]`, the same for `removed`, and `{ exit: 0, removed: 5 }`.

**The task.227 regression.** Load `docs/tasks/task.227.step-8-checklist-no-rm/task.227.dod.1.security.cases.3.json`, take the two `complete.ok-clear-*` cases, move each `expected.absent` to `expected.removed`, and run them through `runProbeSpec` with `entry: "shell-argv:shared/resources/advance-pipeline-lock.sh"` and `argv: ["{input}"]`, the shape the DoD run used (check `controls[2]` in the run record for the exact `--argv`). Assert both ids appear among the accepted legitimate results for every shell in `probeShells()`, and none among `declined`. Expected outputs were measured on 2026-10-24 (see the task's § 8).

**Prove the tests bite** before Phase 2: run the file and confirm every new test fails on the unchanged engine, and record that in the implementation report.

### Phase 2: Engine

**File:** `shared/resources/security-probe.mjs`.

**Path grammar.** One predicate near `expectedProblem` (`:2047`):

```js
/** A relative path inside the case directory: the grammar of `absent` and `removed`. */
function isCasePath(p) {
  if (typeof p !== "string" || p === "" || p.includes("\0") || isAbsolute(p)) return false;
  const n = normalize(p);
  return n !== "." && !n.split(sep).includes("..");
}
```

`isAbsolute`, `normalize` and `sep` are already imported (`:291` area). In `expectedProblem`, replace the `absent` block (`:2062-2079`) with a loop over `["absent", "removed"]`:

```js
for (const k of ["absent", "removed"]) {
  if (expected[k] === undefined) continue;
  if (!Array.isArray(expected[k]) || !expected[k].every(isCasePath)) {
    return `\`expected.${k}\` must be an array of relative paths inside the case directory (no "..", no absolute path, not ".")`;
  }
}
```

Keep the BUG-13 comment about `.` and `..`; it still explains why those two are refused. `COMPARABLE_KEYS` stays as it is.

**The helper.**

```js
/**
 * Whether a case's path assertions can be scored, given the relative paths its
 * own fixture writes. Null, or the reason to decline. One definition for every
 * runner (task.232); they differ only in what they pass as `created`.
 */
export function pathAssertionProblem(expected, created) {
  const fold = (p) => normalize(p).toLowerCase();
  const made = created.map(fold);             // every created path is a file
  const absent = (expected?.absent ?? []).map((p) => [p, fold(p)]);
  const removed = (expected?.removed ?? []).map((p) => [p, fold(p)]);
  for (const [p, f] of absent) {
    if (made.some((m) => m === f || m.startsWith(f + sep))) return `\`expected.absent\` names "${p}", which the fixture itself creates`;
    if (made.some((m) => f.startsWith(m + sep))) return `\`expected.absent\` names "${p}", beneath a file the fixture creates — it can never exist`;
  }
  for (const [p, f] of removed) {
    if (!made.includes(f)) return `\`expected.removed\` names "${p}", which the fixture does not create — it would pass with nothing removed`;
    if (absent.some(([, a]) => a === f)) return `"${p}" is in both \`expected.absent\` and \`expected.removed\``;
  }
  return null;
}
```

Keep the existing decline wording "which the fixture itself creates" for the first rule. Existing tests match on it (`security-probe.test.mjs:2370` and `:4090`; the BUG-13 test that starts at `:800` asserts on the count). The fence arm's variant "which the case's own fixture writes" has no test matching it (`grep` returns none), so it can converge on the shared wording.

**The four runners.** Replace each `collides` block with:

```js
const why = pathAssertionProblem(c.expected, created);
if (why !== null) { decline(`case's ${why}`); return; }
```

What each passes as `created` (today's sources, as full paths):

| Runner | Line | `created` |
| --- | --- | --- |
| `runShellCase` | `:2271` | `fixture.controls`, plus `c.input` when `fnName === null` |
| `runCliCase` | `:2601` | when `fixture !== null`: `fixture.controls` and `c.input`; plus every `fixture.files` key |
| `runShellArgvCase` | `:2936` | when `sinkFixture !== null`: `sinkFixture.controls` and `c.input`; plus every `fixture.files` key |
| `runFenceCase` | `:3483` | every `fixture.files` key |

Pass the **keys themselves**, not `firstSegment(rel)`. The helper's ancestor rule covers what the first-segment comparison was approximating, and does it for nested entries too. Delete the now-unused `firstSegment` lambdas.

**`compareExpected`** (`:1172`). Replace the `absent` loop (`:1187-1191`):

```js
for (const [k, wantGone] of [["absent", "was created"], ["removed", "was not removed"]]) {
  for (const rel of expected[k] ?? []) {
    const where = casePathState(fixtureDir, rel);
    if (where === "outside") mismatches.push(`${rel}: an ancestor resolves outside the case directory`);
    else if (where === "present") mismatches.push(`${rel} ${wantGone}`);
  }
}
```

`casePathState(dir, rel)` returns `"outside"`, `"present"` or `"missing"`. Walk from `resolve(dir, rel)` up to the deepest ancestor that `lstatSync` finds, take its `realpathSync`, and return `"outside"` unless `isWithin(realpathSync(dir), thatRealpath)` holds or it equals the dir. Otherwise `lstatSync(target)` decides present or missing, catching `ENOENT` and `ENOTDIR` as missing. `lstat` at the leaf means a symlink named by the assertion counts as present without being followed.

**Mutation proofs** (record each in the implementation report: the edit, the red test, the `cmp`-checked revert):

1. Drop the `made.some(m === f || …)` rule → the per-form "fixture creates it" tests go red.
2. Drop the `removed`-not-created rule → the vacuous-`removed` test goes red.
3. Drop the both-lists rule → its unit test goes red.
4. Make `casePathState` skip the realpath check → the containment test goes red.
5. Pass `firstSegment(rel)` instead of `rel` in one runner → that form's nested-collision test goes red.

### Phase 3: Docs, bundle, changelog

- `shared/resources/probe-boundary-rule.md` § 5, the sentence at `:242` (*`stdout, exit, stderr, paths that must be absent`*): name `removed`, and add one short paragraph with the grammar (relative, inside the case directory, no `..`) and the three collision rules in plain words.
- `shared/resources/security-input-corpus.md:117`: the shape becomes `{stdout, exit, stderr, absent, removed}`, with one sentence on each path field.
- `shared/resources/finalise-dod-security-prompt.md`: after the `shell-argv:` block (the `# A MULTI-ARGUMENT SHELL SCRIPT boundary` comment), add two lines: a side effect is `absent: ["dir/file"]`, a cleanup is `removed: [...]` naming files the case's `fixture.files` creates. The `cli:` and `fence:` blocks point to it rather than repeating it.
- `shared/resources/security-review-prompt.md`: the same two lines at its `shell-argv:` guidance (`:102-104`).
- `security-probe.mjs` header (`:112`): add `removed` to the description of `expected`.
- Inside `shared/resources/`, cite siblings by bare filename, never by a `shared/resources/` literal (AGENTS.md § Shared Resources).
- `npm run bundle`; `npm run bundle:check`.
- CHANGELOG `[Unreleased] > Added`: `expected.removed`; `> Changed`: `absent` takes nested paths. Name task 232.

## Key Patterns and References

- `writeFixtureFiles` (`security-probe.mjs:2731`): the containment pattern (`resolve` + `isWithin`) to copy.
- `fixtureProblem` (`:3176`): the style for a validator that returns a reason string or `null`.
- Case-folding: TASK-180-010's comment above the fence arm's `firstSegment` (`:3478`).
- The decline wording tests match on: grep `which the fixture itself creates` and `which the case's own fixture writes` in the test file before renaming either.

## Testing Approach

- `command node --test shared/resources/tests/security-probe.test.mjs` per edit.
- `npm run ci` before the PR, through the session's quality-gate script, with `.agents/skills` moved aside and restored by a trap.
- `timeout` cannot run `command node`: use `timeout N "$(type -P node)" …`.
