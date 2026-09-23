# Bug Report: Task 141 - The frontmatter description contains angle brackets and CI `validate` refuses it

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Bug ID**: TASK-141-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA cycle 2 (CI `validate` job, reproduced locally)
**Date Found**: 2026-09-22

## Description

`skills/create-skill/scripts/quick_validate.py` refuses a `description` containing `<` or `>`. The
`qa-next` description gained `/qa-next <id>` when the positional argument was documented, so the
`validate` CI job is red:

```
✗ qa-next — Description cannot contain angle brackets (< or >)
```

## Steps to Reproduce

```bash
python3 skills/create-skill/scripts/quick_validate.py skills/qa-next/
```

## Expected Behavior

`validate` passes. The description still advertises the positional form, since that is what makes the
new capability discoverable.

## Actual Behavior

The job exits 1 and the PR check is red.

## Impact

The build is red. Nothing is functionally wrong, but the branch cannot merge behind a required check.

## Recommendation

Use a concrete example id instead of a placeholder — `/qa-next D.2` — which is both legal and
clearer than a metavariable in a sentence read by a matching agent.

## Notes

**Why no local gate caught it.** `docs/architecture/concepts/coding-standards.md` § "Validation
before commit" lists four commands; `npm run validate` is the only one `npm test` does not subsume,
and nothing in the pipeline executes it — not `qa-task` Step 4, and not the task's own Code Quality
criteria, which name the other three. Logged as an observation against `qa-task` and `create-task`.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-22 | New          | qa-task    | Found in QA cycle 2 |
| 2026-09-22 | In Progress  | qa-fix     | Fixed in QA cycle 2 |
| 2026-09-22 | Ready for QA | qa-fix     | Cycle-2 fix committed; verification pending |
| 2026-09-23 | Closed       | qa-task    | Verified FIXED in QA cycle 3 ([qa.3](./task.141.qa.3.qa-next-targeted-item.md)); closure recorded late, prompted by PR review 1 PC-1 |
