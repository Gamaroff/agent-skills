# Bug Report: Task 69 — contract tests cannot see the comment body's expansion semantics

**Task**: [Link](./task.69.qa-bitbucket-pr-comment.md)
**Bug ID**: TASK-69-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-01

## Description

The two new suites (23 tests) assert the *structure* of the PR-comment step — that both arms exist,
that the endpoint is right, that `--body-file` is used, that the branch key is `$VCS`. None of them
assert anything about what the body will actually **contain** once the heredoc runs.

That is the gap TASK-69-BUG-1 went through. The suites are the only guard on a prose file, and they
were green on both sides of a real defect.

## Steps to Reproduce

```bash
# with the BUG-1 defect present (as committed):
node --test 'skills/qa-story/tests/*.test.js'    # 12 passed, 0 failed

# fix it — convert the three vars to {SLOT} placeholders — and re-run:
node --test 'skills/qa-story/tests/*.test.js'    # 12 passed, 0 failed
```

## Expected Behavior

Introducing or removing the defect changes the suite's result. A test guarding a fix must be able
to fail when the behaviour it names is reverted — the repo's standing mutation-proving rule.

## Actual Behavior

Identical output either way. The defect is invisible to the suite in both directions.

## Impact

Not a runtime defect on its own, but it is what let BUG-1 reach a PR with three mutation proofs
recorded and a green gate. The three mutations the task named were all structural, so they proved
the structural assertions and nothing else — the coverage looked complete because every mutation
anyone thought to run was of the kind already covered.

## Recommendation

Add an assertion to **both** suites — the drift risk is symmetric — that the comment body contains
no unescaped `$VAR` reference, since the heredoc that writes it is single-quoted:

```js
test("the quoted heredoc body carries no shell variables", () => {
  const body = bodyHeredoc(SKILL);          // slice between <<'EOF' and ^EOF$
  assert.doesNotMatch(
    body, /\$[A-Za-z_][A-Za-z0-9_]*/,
    "the heredoc is single-quoted, so a $VAR is written literally — use a {SLOT} placeholder",
  );
});
```

Mutation-prove it: re-introduce `$PR_NUMBER` into either body and confirm the test goes red.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-01
**Developer**: qa-fix (develop-task pipeline, Step 6, cycle 1)

**Investigation Notes**

Reproduced QA's finding exactly: with TASK69-001 present the suite reported 12 passed / 0 failed, and
with it fixed, 12 passed / 0 failed. The suite could not see the defect in either direction.

**Root Cause Analysis**

Every assertion in both suites reads the step's *structure* — which arms exist, which endpoint, which
flag, which branch key. The body is only ever checked for the presence of the heredoc opener
(`cat > "$BODY_FILE" <<'EOF'`), never for what the heredoc will actually emit.

The three mutations recorded during development were all structural, so they exercised the structural
assertions and passed. That is why the coverage looked complete: every mutation anyone thought to run
was of the kind already covered. The gap was invisible from inside the same frame that created it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-01

**Fix Description**

Added a `bodyHeredoc(src)` helper to both suites that slices the body between the single-quoted
heredoc opener and its terminator, plus one assertion per suite: the body must contain no
`$VAR` reference, because the heredoc that writes it is single-quoted and would emit any such
reference literally.

Added to **both** skills rather than only the one that failed — the drift risk is symmetric, and a
guard on one copy would not have caught this defect had it landed in the other.

**Files Modified**

- `skills/qa-story/tests/qa-story.test.js` — `bodyHeredoc` helper + `the quoted heredoc body carries no shell variables`
- `skills/qa-task/tests/qa-task.test.js` — same

**Testing**

Suite: 23 → 25 tests, all passing. Mutation-proved in both skills (see TASK-69-BUG-1's table) — the
assertion fails when the defect is injected into either copy, which is the property the original
coverage lacked.

**Verification Steps for QA**

1. `node --test 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js'` → 25/25.
2. Inject `$PR_NUMBER` into either body; confirm that suite goes red on the new test specifically.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-01 | In Progress | qa-fix | Reproduced the vacuity |
| 2026-09-01 | Ready for QA | qa-fix | Assertion added to both suites; mutation-proved |
| 2026-09-01 | Closed | QA Engineer | Verified by QA: guard present in both suites, fails on injected defect in either, and fails loudly (not vacuously) when its anchor is renamed. |
