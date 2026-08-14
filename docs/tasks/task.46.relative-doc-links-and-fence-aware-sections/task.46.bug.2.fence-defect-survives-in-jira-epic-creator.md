# Bug Report: Task 46 - The fence-truncation defect survives in jira-epic-creator

**Task**: [task.46.relative-doc-links-and-fence-aware-sections.md](./task.46.relative-doc-links-and-fence-aware-sections.md)
**Bug ID**: TASK-46-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-14
**Fixed**: 2026-08-14 (qa-fix cycle 1)

## Description

`skills/jira-epic-creator/scripts/jira-create-epic.js:120-122` extracts an epic's Stories
Breakdown with an inline copy of the same pattern this task just fixed:

```js
const storiesMatch = body.match(
  /(?:^|\n)## (?:\d+[.)]\s*)?Stories Breakdown[ \t]*\n([\s\S]*?)(?=\n## |\n# |$)/,
);
```

The `(?=\n## |\n# |$)` lookahead is the defect verbatim. A `# ` at column 0 inside a fenced code
block within that section ends the match there, and the rows after it are dropped from the Jira
epic with no warning — the same silent truncation, in the same document type.

The copy is deliberate and documented (lines 109–119): the script is standalone and importing
the shared module would pull the whole Jira client into a skill that does not otherwise need it.
That reasoning still holds. What does not hold is the instruction the comment leaves behind:

> The pattern must stay in step with the canonical one; see the comment on `sectionRe` there for
> why each piece is present

This change moves the canonical one to a line-walking `extractSection` and leaves the copy on
the old regex — so the comment now instructs a maintainer to do the opposite of what the code
does, and points at a `sectionRe` that no longer performs extraction anywhere.

## Steps to Reproduce

Author an epic whose `## Stories Breakdown` section contains a fenced block with a `#` comment at
column 0 before the table, then run `/jira-epic-creator`. The table is dropped.

## Expected Behavior

Either the copy tracks the canonical fix, or the task declares it out of scope and the comment
is corrected so it does not mislead.

## Actual Behavior

The defect is fixed in the sync path and left in place here, and the comment binding the two
together is now wrong. The task's **Out of Scope** section names only `dropHeadingLines` /
`firstTableIn` and the GitHub sync equivalents — this file is not mentioned, so the omission
reads as an oversight rather than a decision.

## Impact

Narrower than the original defect: `jira-create-epic.js` cuts the extracted section at the first
`### Story N.M` subsection and keeps only table rows, so the exposure is a fenced `#` sitting
between the heading and the table. Real, but less likely than the Technical Background case that
motivated this task.

The durable cost is the stale instruction — the next maintainer who reads that comment and
"keeps it in step" will reintroduce the old behaviour on purpose.

## Recommendation

1. **Preferred**: port the fix inline — a small line-walking extractor with the same three
   CommonMark rules, kept local to the script as the comment's constraint requires.
2. **Acceptable**: add the file to the task's Out of Scope with a reason, correct the comment to
   say the canonical pattern has moved and why this copy has not, and file a follow-up task.

Either way the comment at lines 109–119 must be updated in the same change — it is the part that
actively misleads.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-14

Root cause is not the regex itself but the absence of any way to test it. The script had **no**
`require.main === module` guard and **no** `module.exports`, so requiring it executes `main()` —
which means nothing in it could ever be unit-tested. An untested copy of a pattern is how the copy
kept the old behaviour after the canonical one was corrected, and no check anywhere would have
noticed.

**Decision** (user, via qa-fix Step 2a): **fix the copy inline**, rather than de-scoping it. The
copy's justification for existing (standalone script, no shared-library import) is sound and was
preserved.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-14

**Root Cause**: An extraction regex whose lookahead cannot distinguish a heading from a shell
comment, in a file structurally impossible to test.

**Fix Description**:

- Added a local `makeFenceTracker()` implementing the same three CommonMark rules as the canonical
  fix — info strings may not contain a backtick, a close needs a run at least as long as the open,
  a close takes no info string.
- Replaced the regex with `extractStoriesBreakdown(body)`, which walks lines and skips fenced ones.
- **Extended the fix past the reported defect**: the `### Story N.M` cut was a second regex with the
  same blind spot, so a `###` inside a fenced block ended the table early too. It now consults the
  same fence tracker. This was not in the bug report — it was found while fixing it.
- Added a `require.main` guard and exports so the helpers are testable at all.
- Rewrote the misleading comment: it no longer instructs anyone to keep the pattern in step with a
  regex that no longer performs extraction, and states why the copy exists and why it walks lines.
- Registered `skills/jira-epic-creator/tests/*.test.js` in `package.json`'s test globs — a new suite
  in an unregistered directory runs nowhere.

**Files Modified**:

- `skills/jira-epic-creator/scripts/jira-create-epic.js` — fence tracker, line-walking extractor,
  main guard, exports, comment
- `skills/jira-epic-creator/tests/stories-breakdown-extraction.test.js` — new, 11 tests
- `package.json` — test glob
- `CHANGELOG.md` — Fixed entry

**Testing**: 11 tests. Three cover the defect directly (fenced `#`, fenced `##`, and the
four-backtick parity trap); five re-assert the behaviours carried over from the regex
(line-anchored heading, numbering tolerated, single newline after heading, the `### Story N.M`
cut, the next `## ` heading ending the section); one covers the newly-found fenced-`###` case; two
cover absent-returns-null and an unterminated fence.

**Verification Steps for QA**:

1. `node --test skills/jira-epic-creator/tests/stories-breakdown-extraction.test.js` — 11 pass.
2. `npm test` includes the new suite (glob registered).
3. The comment at the top of `extractStoriesBreakdown` no longer references keeping a regex in step.
