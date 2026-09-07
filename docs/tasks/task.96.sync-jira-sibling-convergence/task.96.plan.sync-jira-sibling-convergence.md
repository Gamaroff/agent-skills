---
id: task.96.plan
title: "Implementation Plan: sync-jira sibling convergence"
type: plan
task-ref: task.96.sync-jira-sibling-convergence.md
---

# Implementation Plan: sync-jira sibling convergence

> Requirements and success criteria: [task.96.sync-jira-sibling-convergence.md](task.96.sync-jira-sibling-convergence.md)

## Overview

Reproduce both defects as failing tests first, port the two fixes from `sync-jira-bug`, then decide on extraction from evidence. Test-first is not stylistic here: both defects survived a full unit-test suite because those tests asserted what the code did. Only an end-to-end run that read the payload back exposed them.

## Phase-by-Phase Implementation Guide

### Phase 1: Reproduce, then decide on extraction

**Write these red before touching any script.**

**Test A — convergence**, one per script:

```
1. sync a fixture doc against the fake Jira    → expect action "create"/"update"
2. sync the same unchanged doc again           → expect NO field changes, NO PUT
```

Today this fails on step 2 in all three, with `Updated: labels`. Assert on **both** the change summary and the PUT count — the summary alone would pass if someone later suppressed the message without fixing the diff.

**Test B — transition**, one per script:

```
1. sync a doc whose frontmatter status differs from the card  → transition fires
2. sync again with no local change                            → expect NO concurrent-edit abort
```

Fails today in story and task. For **epic, write it twice** — once driving the skip path, once the update path — and confirm the skip variant is already green while the update variant is red. That asymmetry is the half-fix, and seeing it in test output is what stops someone concluding epic is covered.

**Then decide extraction.** Put the four corrected diff blocks side by side and ask whether they are the *same* block. If a shared helper needs more than one or two parameters to absorb their differences, it is not the same block, and four readable local fixes beat one helper nobody can read. Record the decision in the task's Notes either way, with the reasoning — this exact question will be re-asked by the next person otherwise.

---

### Phase 2: The label diff

The reference implementation is `sync-jira-bug.js:809-846`. The move is mechanical: **construct the payload, then diff against it.**

Currently each sibling diffs a set rebuilt from frontmatter, which is missing the `synced-from-*` label the payload adds:

```js
labels: lib.sanitiseLabels(args.labels || frontmatter.labels) || [],   // ← never matches
```

Replace with the payload's own values:

```js
const descAdf = buildDescriptionAdf({ /* the script's existing args */ });
const fields  = collectIssueFields({ /* … including syncLabel … */ });

const changedFields = current
  ? lib.diffFields({
      prev: current,
      next: {
        summary:  fields.summary,
        priority: fields.priority ? fields.priority.name : null,
        labels:   fields.labels,
      },
      prevBodyHash: frontmatter.jira_last_body_hash,
      newBodyHash,
      prevMetaHash: frontmatter.jira_last_meta_hash,
      newMetaHash,
    })
  : ["summary", "description", "priority", "labels"];
```

**The ordering constraint is the whole fix.** Payload construction has to move *above* the diff. Check what else reads `descAdf` or `fields` further down and make sure nothing was relying on them being built later — this is the one place a mechanical port can go wrong.

**Watch for a test that asserts the defect.** If something asserts `Updated: labels` on an unchanged document, it was asserting the bug. Update it and note it in the implementation report; do not "fix" the fix to keep it green.

---

### Phase 3: The transition timestamp

Reference: `sync-jira-bug.js:1100-1115`. Add at the point where the result is finalised, after any transition:

```js
if (statusOutcome?.transitioned && result?.issueKey && !deferred) {
  try {
    result.updated = await lib.fetchUpdatedTimestampStrict({
      http, baseUrl: auth.baseUrl, email: auth.email, token: auth.token,
      issueKey: result.issueKey,
    });
  } catch (e) {
    output.warn(
      `⚠️  Could not re-read the issue timestamp after the transition (${e.message}). ` +
      `The next sync may report a concurrent edit; re-run with --force if so.`,
    );
  }
}
```

Three properties, each load-bearing:

- **Best-effort.** A failed re-read leaves the pre-transition value — exactly today's behaviour, so the failure mode is "no worse", never "throws".
- **All three guard conditions.** `transitioned` (nothing moved, nothing to re-read), `issueKey` (nothing to query), `!deferred` (a restricted run performed no transition and must make no network call). Each gets a negative test.
- **Additive.** `story:1037` and `task:794` are the PUT-response fallback and `task:925` is the create path. All three are correct. Do not merge this into them.

**`sync-jira-epic` is the careful one.** Its skip path at `:990` already does this via `skipSyncedAt` and must be left alone. The gap is the update path, which persists `result?.updated` at `:1460` from before the transition. Fix that path only, and keep the two paths' behaviour identical afterwards.

---

### Phase 4: Extraction and family registry

**If Phase 1 said extract**, add to `shared/resources/jira-sync.js`:

```js
// Diff the payload actually being sent, never a separately-rebuilt field set.
function diffAgainstPayload({ current, fields, frontmatter, newBodyHash, newMetaHash }) { … }
```

Migrate all four call sites, `sync-jira-bug` included. **`sync-jira-bug`'s existing tests must pass unchanged** — it is the reference implementation, and a refactor that requires editing its tests has changed its behaviour.

**If Phase 1 said don't**, write the reason into the task's Notes.

**Family registry entry**, either way — this is the mechanism that catches the fifth divergence:

```markdown
## jira-sync
**Members:** sync-jira-story, sync-jira-task, sync-jira-epic, sync-jira-bug
**Coherence model:** synced-duplicates
**Shared:** diff the outgoing payload, never a rebuilt field set; re-read `updated`
  after any successful transition; best-effort with a warning, never a throw;
  idempotency via the `synced-from-*` label search.
**Member-specific:** parenting (epic link vs standalone vs sibling issue link),
  the document schema each reads, and bug's Status History in place of a Change Log.
```

Then `npm run bundle` — these scripts are cited by many skills, so `references/` copies fan out — followed by `npm test` and `npm run format`.

## Key Patterns and References

| Need | Read this |
|---|---|
| Corrected label diff | `skills/sync-jira-bug/scripts/sync-jira-bug.js:809-846` |
| Corrected transition re-read | `skills/sync-jira-bug/scripts/sync-jira-bug.js:1100-1115` |
| The already-correct epic skip path | `skills/sync-jira-epic/scripts/sync-jira-epic.js:984-1003` |
| Fake-Jira end-to-end harness | `skills/sync-jira-bug/tests/end-to-end.test.js` |
| Shared helpers | `shared/resources/jira-sync.js` |

## Testing Approach

- **Location**: each script's own `tests/` directory. All four are already in the `package.json` glob (`skills/sync-jira-{epic,story,task,bug}/tests/*.test.js`), so no `package.json` edit is needed — verify that rather than assuming it.
- **Harness**: reuse the fake Jira from `sync-jira-bug`'s end-to-end suite. It is the only thing that caught either defect, because it reads the payload back rather than trusting the caller's model of it.
- **Order**: red first, always. Confirm each new test fails against unmodified code and record that it did.
- **Mutation proof**: for each fix, revert it, confirm the named test goes red, restore. A fix without a recorded proof is not done.
- **The counterweight test**: a genuine remote edit must still abort. Every other test here rewards the guard staying quiet, so this is the one that stops the fix becoming a silent regression.
