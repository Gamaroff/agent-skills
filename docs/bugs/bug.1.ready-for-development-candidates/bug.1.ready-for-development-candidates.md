---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Medium'
created: 2026-08-04
related: 'none — cross-cutting (no single owner)'
description: 'The canonical local status ready-for-development resolves to NEW_CANDIDATES, which omits the literal string "Ready for Development" — so a board with that column silently skips.'
tags: [jira, status-mapping, jira-sync, defaults]
github_issue: 191
---

**Bug ID**: bug.1
**GitHub Issue**: [#191](https://github.com/Gamaroff/agent-skills/issues/191)
**Related**: none — cross-cutting (no single owner)
**Status**: 🆕 New
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-08-04
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: The canonical lifecycle status `ready-for-development` maps to `NEW_CANDIDATES`, which
does not contain the literal string `"Ready for Development"`. The candidate list that *does* contain
it — `READY_CANDIDATES` — is only reachable via the alias key `ready`, which is not a canonical
lifecycle status. A Jira board whose column is named exactly "Ready for Development" therefore never
matches, and the status change is silently skipped.

**Expected Behavior**: A document at `status: ready-for-development` syncs to a Jira column named
"Ready for Development" with no configuration. That is the most literal possible spelling of the
status, and the built-in candidate lists exist precisely so that the common vocabularies work
without a `statusMap`.

**Actual Behavior**: The candidates tried are `To Do`, `Backlog`, `Open`, `New`,
`Selected for Development`. "Ready for Development" is not among them, so the transition is skipped.

```
local ready-for-development → ["To Do","Backlog","Open","New","Selected for Development"]
alias  ready                → ["Ready","Ready for Development","Selected for Development"]
```

**Impact**: Silent, and easy to misread as correct behaviour. The sync reports success overall and
logs a skip, so a team whose board uses this wording concludes the card simply doesn't move at that
stage. Severity is Minor rather than Major because a one-line `statusMap` override fixes it in any
affected project, and because `ready-for-development` is a short-lived stage — but it is exactly the
class of silent-default failure that `2e14043` introduced candidate lists to eliminate.

Sharpened by task.36 (#184), which removed the generated `statusMap` and now tells consumers
**"MOST PROJECTS NEED NONE"**. That guidance is right in general and wrong for this column name, so
the change makes it likelier someone trusts the defaults here and is bitten.

---

## Reproduction Steps

**Environment**: any consumer with `tracker: jira`, `shared/resources/jira-sync.js` at `54e754e` or
earlier. No `jira.statusMap` in `skills-config.yaml`.

**Steps to Reproduce**:

1. On a Jira board with a workflow column named exactly `Ready for Development`, ensure the project
   has no `jira.statusMap` override.
2. Set a task or story document's frontmatter to `status: ready-for-development`.
3. Run `node .agents/skills/sync-jira-task/scripts/sync-jira-task.js --file <doc>`.
4. Observe the status is not transitioned; the run still reports success.

Reproducible without a board, directly against the library:

```bash
node -e 'console.log(require("./shared/resources/jira-sync.js").mapStatusCandidates("ready-for-development"))'
# → [ 'To Do', 'Backlog', 'Open', 'New', 'Selected for Development' ]
```

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Screenshots/Videos/Test Output**:

```
$ node -e '
const j = require("./shared/resources/jira-sync.js");
console.log("ready-for-development →", j.mapStatusCandidates("ready-for-development"));
console.log("ready                 →", j.mapStatusCandidates("ready"));
'
ready-for-development → [ 'To Do', 'Backlog', 'Open', 'New', 'Selected for Development' ]
ready                 → [ 'Ready', 'Ready for Development', 'Selected for Development' ]
```

**Related Files**:

- `shared/resources/jira-sync.js` — `NEW_CANDIDATES` (L1278), `READY_CANDIDATES` (L1322),
  `DEFAULT_STATUS_MAP` (L1417)
- `docs/reference/configuration.md` — the "Built-in defaults" table under *Jira status mapping*,
  which documents the current (incorrect) grouping and must be updated with the fix

---

## Scope & Impact

**Reference**: `DEFAULT_STATUS_MAP` — the shared default consumed by every `sync-jira-*` skill.

**How It Failed**: `DEFAULT_STATUS_MAP` assigns `"ready-for-development": NEW_CANDIDATES` while the
purpose-built `READY_CANDIDATES` list is bound only to the `ready` alias. The two were plausibly
intended the other way round, or intended to be merged.

**Why it has no single owner**: `DEFAULT_STATUS_MAP` is shared infrastructure read by
`sync-jira-story`, `sync-jira-task` and `sync-jira-epic`, and mirrored into eleven bundled skill
copies. No one story or task owns it.

**Deliberately excluded from task.36** (#184): that task's scope forbade altering resolution
behaviour, and its contract test asserts the existing Jira suites pass **unchanged**. This fix
changes what a given local status resolves to, so it needs its own change with its own verification.

---

## Suggested Fix

Not prescriptive — the choice between these is a judgment call for whoever picks it up.

1. **Widen `NEW_CANDIDATES` for this key**: bind `"ready-for-development"` to a list that includes
   both the vanilla backlog names and `Ready for Development`. Lowest-risk, but leaves two lists
   that overlap confusingly.
2. **Rebind the key to `READY_CANDIDATES`**: most literal reading of the status name. Riskier —
   a board with both a `To Do` and a `Ready` column would change destination, and `To Do` would no
   longer be tried at all for this status.
3. **Concatenate**: `"ready-for-development": [...READY_CANDIDATES, ...NEW_CANDIDATES]` deduped, so
   the literal name wins but existing boards keep their current destination via the later entries.
   Probably the right answer: it is additive, and no board that works today stops working.

Whichever is chosen:

- The ordered nature of candidate matching means **appending is safe, prepending is not** — anything
  placed before `To Do` changes where existing boards land. Option 3 prepends deliberately, so it
  needs a test proving a `To Do`-only board is unaffected.
- Update the "Built-in defaults" table in `docs/reference/configuration.md` in the same commit.
- Add a regression test asserting `mapStatusCandidates("ready-for-development")` contains
  `"Ready for Development"`.
- Re-run `jira-stage.test.mjs` / `jira-stage-fixtures.test.mjs` and expect **deliberate** diffs;
  unlike task.36 this change is *supposed* to move resolution.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file1.js]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By | Notes                                            |
| ---------- | ------ | ---------- | ------------------------------------------------ |
| 2026-08-04 | New    | Claude     | Found while verifying task.36 (#184); filed after |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
