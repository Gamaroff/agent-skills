---
type: bug
title: "task.253 bug 2: the gap 3 regression guard cannot fail for three of its four keys"
description: "The guard asserts frontmatterField is not null, but frontmatterField returns an empty string for a missing key, so id, epic and prd_source are never really checked."
status: closed
severity: medium
priority: P2
updated: 2026-11-03
---

# Bug Report: Task 253 - the gap 3 regression guard cannot fail for three of its four keys

**Task**: [task.253.migrate-doc-numbering-safety-nets.md](./task.253.migrate-doc-numbering-safety-nets.md)
**Bug ID**: TASK-253-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (diff code review CR-1, cycle 2, reproduced)
**Date Found**: 2026-11-03

## Description

Gap 3 (frontmatter validation) did not reproduce, so the task replaced it with a regression guard. The guard, in `shared/resources/tests/migrate-doc-numbering.test.mjs` near line 2424, loops over `id`, `prd_number`, `epic` and `prd_source` and asserts `docId.frontmatterField(text, key)` is not `null`:

```js
assert.notEqual(docId.frontmatterField(text, key), null, `${f} lacks ${key}`);
```

`frontmatterField` returns an empty string for a missing key. It never returns `null`. The assertion passes whether the key is present or absent.

## Steps to Reproduce

1. Run `frontmatterField("---\nid: x\n---\nbody", "epic")` from `doc-id.js`.
2. It returns `""`, not `null`.

Measured on 2026-11-03. Only `prd_number` is genuinely checked, by the separate `assert.equal(..., "1")` line below the loop.

## Expected Behavior

The guard fails when a moved sub-story loses `id`, `epic` or `prd_source`.

## Actual Behavior

It passes. If the tool stopped writing those three keys, this test would stay green.

## Impact

The only thing standing in for gap 3 is mostly vacuous. The criterion it holds ("frontmatter of moved documents is valid") is held by `prd_number` alone and by the post-apply `checkCorpus`, which is not tied to this test.

## Recommendation

Assert a non-empty value and the expected value for each key. Mutation-prove it: make the tool skip writing `epic` (or blank the key in the fixture) and confirm the test goes red.

## Status History

| Date | Status | Changed by | Notes |
| --- | --- | --- | --- |
| 2026-11-03 | new | qa-task | Found in QA cycle 2 |
| 2026-11-03 | ready-for-qa | qa-fix | Fixed: the guard asserts each key's expected value. Mutation-proven. |
| 2026-11-03 | Closed | qa-task | Verified by task.253.qa.3.migrate-doc-numbering-safety-nets.md |

## Developer Fix Cycle

### Iteration 1

**Root cause**: `frontmatterField` returns an empty string for a missing key, so a not-null assertion could not fail.

**Fix**: the test asserts the exact value of `id`, `prd_number`, `epic` and `prd_source` for each moved sub-story.

**Files modified**: `shared/resources/tests/migrate-doc-numbering.test.mjs` (`253 gap 3`), `task.253.review.2.mutation-proof.md`.

**Verification for QA**: writing a constant for the story `prd_source` (line 1425 of the tool) turns `253 gap 3` red. Under the old assertion it stayed green.
