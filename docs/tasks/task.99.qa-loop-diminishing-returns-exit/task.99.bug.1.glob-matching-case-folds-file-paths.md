# Bug Report: Task 99 - Glob matching case-folds `file:` paths, so a correctly-configured consumer never takes the exit

**Task**: [Link](./task.99.qa-loop-diminishing-returns-exit.md)
**Bug ID**: TASK-99-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-09

## Description

`readKeysInto()` in `shared/resources/qa-diminishing-returns.js` lowercases **every** captured value:

```js
entry[key] = v === "" ? null : v.toLowerCase();
```

Three of the four keys it captures — `severity`, `category`, `status` — are enumerations, and
lowercasing them is correct. The fourth is `file:`, **a filesystem path**, and lowercasing it is not.
`qa.testArtifactGlobs` is then matched against the folded path while the operator wrote the glob
against the real one, so any glob containing an uppercase character can never match.

## Steps to Reproduce

```bash
command node -e '
const {readTopIssues, classifyDiminishingReturns} =
  require("./shared/resources/qa-diminishing-returns.js");
const gate = [
 "top_issues:",
 "  - id: X",
 "    severity: medium",
 "    file: src/Components/Button/Button.spec.tsx",
 "    status: open",
 "",
 "nfr_validation:",
 "  security:",
 "    status: PASS",
].join("\n");
console.log("parsed file:", JSON.stringify(readTopIssues(gate)[0].file));
const r = classifyDiminishingReturns({
  cycle: 3, highCounts: [0,0,0], latestGateContent: gate,
  testArtifactGlobs: ["src/Components/**"],
});
console.log("verdict:", r.verdict, "|", r.reason);
'
```

## Expected Behavior

```
parsed file: "src/Components/Button/Button.spec.tsx"
verdict: exit | diminishing-returns
```

## Actual Behavior

```
parsed file: "src/components/button/button.spec.tsx"
verdict: continue | non-test-finding
```

## Impact

The feature is inoperative for any consumer whose test paths carry a capital letter, and it fails
**silently** — the loop simply never takes the exit, which is indistinguishable from a project that
has not configured `qa.testArtifactGlobs` at all. The direction is fail-safe (it never exits when it
should not), so nothing goes wrong except that the task's entire deliverable does not happen, and no
signal says so.

Two aggravating details:

1. **The existing tests cannot catch it.** Every fixture path and every glob in
   `qa-diminishing-returns.test.mjs` is lowercase, so the fold is a no-op across the whole suite —
   including the anti-vacuity fixture written precisely to prove condition 2 is being read. The
   suite passes 32/32 with the defect present.
2. **It also corrupts the report.** `findings[].file` is the folded path, so the `non-test-finding`
   detail names a path that does not exist in the repository, sending a reader who tries to open it
   nowhere.

## Recommendation

Fold only the enumerations. Keep `file:` verbatim:

```js
const CASE_INSENSITIVE = new Set(["severity", "category", "status"]);
entry[key] = v === "" ? null : (CASE_INSENSITIVE.has(key) ? v.toLowerCase() : v);
```

Then add a regression test with a capitalised path and a correctly-cased glob, and **mutation-prove
it** — restore the unconditional `.toLowerCase()` and confirm the new test goes red. A test whose
fixture is all lowercase would pass either way, which is how this got here.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-09
**Developer**: develop-task pipeline (qa-fix cycle 1)

`readKeysInto` captures four keys and applied one rule to all of them. Three — `severity`,
`category`, `status` — are enumerations, where folding case is right and makes comparison robust
against a gate author writing `MEDIUM`. The fourth is a path, where case is information.

**Root cause**: one rule for two kinds of value. The bug is not that folding is wrong; it is that
the code had no notion that the four keys are not the same kind of thing.

**Why nothing caught it**: every fixture path and every glob in the 33-test suite is lowercase, so
the fold is a no-op suite-wide. The suite passed 32/32 with the defect present — including the
anti-vacuity test written specifically to prove condition 2 is being read, because that test's
fixture paths are lowercase too. Mutation-proving would not have caught it either: it asks whether a
test can fail when behaviour is removed, and cannot see a fixture population that never exercises the
behaviour at all. **This is a distinct vacuity shape from the four in `mutation-proving.md`** — not a
test that cannot fail, but a fixture corpus with no instance of the input class.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-09

**Fix Description**: introduced `CASE_INSENSITIVE_KEYS = new Set(["severity", "category", "status"])`
and folded only those. `file:` is stored verbatim. The comment above it states the failure it
prevents and why the suite could not see it, rather than what the line does.

**Files Modified**:

- `shared/resources/qa-diminishing-returns.js` — fold only the enumerations
- `shared/resources/tests/qa-diminishing-returns.test.mjs` — new test
  `a capitalised path is matched as written, not case-folded`
- `skills/{develop-story,develop-task}/references/qa-diminishing-returns.js` — regenerated by
  `npm run bundle`

**Testing**: the new test asserts three things rather than one, because each closes a different way
the fix could be wrong —

1. the path survives verbatim (`src/Components/Button/Button.spec.tsx`);
2. `severity: MEDIUM` still folds to `medium`, so the fix is a narrowing and not a removal;
3. a lowercase glob does **not** match a capitalised path — without this half, folding the *glob*
   instead of the path would also pass.

**Mutation-proved**: restoring the unconditional `.toLowerCase()` turns the new test red (33 → 32
pass, 1 fail) and everything else stays green. Full gate re-run: `npm run ci:fast` → 2937 tests, 0
failures.

**Verification Steps for QA**:

1. `node --test shared/resources/tests/qa-diminishing-returns.test.mjs` → 33/33.
2. Re-run the reproduction in this report — expect
   `parsed file: "src/Components/Button/Button.spec.tsx"` and `verdict: exit`.
3. Revert `CASE_INSENSITIVE_KEYS.has(key) ? v.toLowerCase() : v` to `v.toLowerCase()` and confirm
   the suite goes red.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | New | QA Engineer | Found during QA cycle 1 by executing the module against a capitalised probe path |
| 2026-09-09 | In Progress | qa-fix | Root cause: one case rule applied to two kinds of value |
| 2026-09-09 | Ready for QA | qa-fix | Fold narrowed to the three enumerations; regression test added and mutation-proved |
