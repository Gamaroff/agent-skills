# Bug Report: Task 238 - The open-coverage awk misses valid YAML shapes

**Task**: [Link](./task.238.qa-loop-acts-on-signals-it-has.md)
**Bug ID**: TASK-238-BUG-8
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (cycle 4: probe `oc-coverage-trailing-comment` and reviewer CR-4)
**Date Found**: 2026-10-28

## Description

The §5c OPEN_COVERAGE awk (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1548`) still
matches one line shape. Valid YAML coverage entries count as 0, so a CONCERNS exits to Step 7 and
`/finalise` then fails it. The writer's own template shows one of these shapes:
`pr-conformance-prompt.md:137` reads `category: coverage       # coverage | scope | trail | consistency`.

## Steps to Reproduce

The block run verbatim over a scratch report prints `OPEN_COVERAGE=0` for each of:

- `category: coverage   # AC-3` (trailing comment). The engine reproduced this one: probe
  `oc-coverage-trailing-comment`, in `task.238.qa.4.security.run.json`.
- `- category: coverage` as the list item's first key, before `id:`
- the flow form `- {id: PC-1, category: coverage}`
- `category: Coverage`

## Expected Behavior

Each one counts as 1 open coverage finding. A block the awk cannot account for reads `unreadable`.

## Actual Behavior

Each one reads 0.

## Impact

The check fails open to the pre-task behaviour: a coverage gap reaches `/finalise` and costs a HALT.

## Recommendation

Strip trailing comments and match case-insensitively. Split entries on any `- ` list item. Print
`unreadable` when the number of entries differs from the number with a recognised category.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: The awk had three gaps:

- It split entries only on `- id:`.
- It anchored `category:` and `provenance:` at the line start and the line end.
- It matched values case-sensitively.

So any other valid YAML spelling read as no coverage, and nothing reported that an entry had gone
unread.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description** (`shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5c):

- **Entries.** An entry is each list item under `findings:` at the first item's indent, whatever its
  first key. Deeper list items (an `evidence:` list) stay inside their entry. A top-level key ends
  the list.
- **Reading.** Each line is lowercased and stripped of a `# comment`; whole-line comments are
  skipped. `category:`, `provenance:` and their values are matched after the line start, after `{`,
  after `,` or after a space, so block and flow forms both read.
- **Unreadable.** The block prints `unreadable` when:
  - `findings:` holds an inline list
  - the number of entries differs from the number with a readable `category:`
- **Portability.** Checked under gawk, `gawk --posix`, `gawk --traditional` and mawk 1.3.4 (on
  .249): 12 report shapes give identical results in all four.

**Testing**:

- **Red before**: the six new cases fail on `adff39e2`: trailing comment, list-first key, flow form,
  capitalised value, inline list, unreadable entry.
- **Green after**: 26/26 open-coverage tests.
- **Mutations**:
  - Dropping `tolower`, the comment strip and the count check turned 4 red.
  - Splitting only on `- id:` turned the list-first and flow cases red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-28 | New | qa-task | Found in QA cycle 4 |
| 2026-10-28 | In Progress | qa-fix | Investigation started |
| 2026-10-28 | Ready for QA | qa-fix | Fix implemented (QA cycle 4 fix) |
| 2026-10-28 | Closed | qa-task | Verified by task.238.qa.5.qa-loop-acts-on-signals-it-has.md |
