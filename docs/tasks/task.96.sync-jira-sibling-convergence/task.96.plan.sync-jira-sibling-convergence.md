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

**Prerequisite: generalise the fake Jira first.** `fakeJira()` is a module-local, unexported function inside `skills/sync-jira-bug/tests/end-to-end.test.js:44`, not a reusable harness — and it does not fake `/rest/agile/1.0/backlog/issue` or `/rest/api/3/project/{key}`, which story, task and epic all call. Lift it (with `hrefsIn`, `descriptionOf`) into `tests/lib/fake-jira.js`, parameterised by `{ runner, argv }`, outside `shared/resources/` so `npm run bundle` does not fan it into 23 skills. Re-point the bug suite at it and confirm **its assertions are unchanged**. Add PUT-counting while you are there: `state.requests` is recorded but nothing filters it by method.

**Then write these red before touching any script.**

**Test A — convergence**, one per script:

```
1. sync a fixture doc against the fake Jira    → expect action "create"/"update"
2. sync the same unchanged doc again           → expect NO field changes, NO PUT
```

Today this fails on step 2 in all three, with `Updated: labels`. Assert on **both** the change summary and the PUT count for **story and epic** — the summary alone would pass if someone later suppressed the message without fixing the diff.

**`sync-jira-task` gets the change-summary assertion only.** It has no `changedFields.length === 0` gate anywhere and PUTs unconditionally, so its PUT count is 2 before and after this fix. Asserting 1 there would fail for a reason this task is not fixing, and adding the gate is out of scope.

**Test B — transition**, one per script:

```
1. sync a doc whose frontmatter status differs from the card  → transition fires
2. sync again with no local change                            → expect NO concurrent-edit abort
```

Fails today in story and task. For **epic, write it twice** — once driving the skip path, once the update path.

**Do not expect the skip variant to be "already green" in a meaningful sense.** The epic skip path is gated at `:948` on `current && changedFields.length === 0 && !args.force`, and defect 1 guarantees `changedFields` always contains `labels` — so the gate never opens and the re-read at `:990` is dead code today. A skip-variant test that only checks "no abort occurred" passes **for the wrong reason**: it never reaches the code it is meant to exercise, and it will keep passing after a regression. **Assert that the skip path is actually _entered_** (e.g. on the returned `action === "skip"` / `skipped: true`), not merely on the absence of an abort. The update variant is red for the ordinary reason.

This corrects the earlier framing in this plan, which described epic as half-fixed and told you to read the skip variant's green as evidence of that. The half-fix is real but is about **discoverability** — a grep for `fetchUpdatedTimestampStrict` hits all four scripts and reads as "handled" — not about epic being less broken. It is equally broken.

**Then decide extraction.** Put the four corrected diff blocks side by side and ask whether they are the *same* block. If a shared helper needs more than one or two parameters to absorb their differences, it is not the same block, and four readable local fixes beat one helper nobody can read. Record the decision in the task's Notes either way, with the reasoning — this exact question will be re-asked by the next person otherwise.

---

### Phase 2: The label diff

> **Phases 2 and 3 may be separate commits, but for `sync-jira-epic` neither may _merge_ alone.** Landing epic's label fix without its timestamp fix satisfies the `:948` gate, activating the dormant skip-path re-read while the update path at `:1428` stays stale — turning a consistent failure into an intermittent one that depends on whether an unrelated field drifted. That is materially harder to diagnose than what epic does today.

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

**The ordering constraint is the whole fix — and it is only mechanical for task and epic.**

For **`sync-jira-story` it is circular.** Story computes `includeDescription` *from* the diff result at `:944-946`:

```js
const includeDescription =
  changedFields.includes("description") || changedFields.includes("metadata");
```

and passes it *into* `collectIssueFields` at `:953`. So the payload cannot simply be hoisted above the diff. Build it two-pass: construct with `includeDescription: true` to get the label/priority set the diff needs, then set or strip `description` on the result once `changedFields` is known. Task, epic and bug always send `description` and reorder trivially.

Second trap, story and epic both: their payload build currently sits **inside the skip branch** (story `:948`, in the `else` of `:917`; epic `:1054`, after the early `return` at `:1046`). Hoisting it above the diff also hoists it out of that branch, so it is now built on the skip path too. Confirm that is harmless rather than assuming it.

Check what else reads `descAdf` or `fields` further down and make sure nothing was relying on them being built later.

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

**`sync-jira-epic` is the careful one.** Its skip path at `:990` already does this via `skipSyncedAt` and must be left alone (though note it is unreachable today — see Phase 1). The gap is the update path. **The site to fix is `:1428`** — `lastSyncedAt: result.updated`, the value actually written into frontmatter. `:1460` is the `--json` emit of the same stale value and follows from the fix; it is not itself the fix. Keep the two paths' behaviour identical afterwards.

---

### Phase 4: Extraction and family registry

**If Phase 1 said extract**, add to `shared/resources/jira-sync.js`:

```js
// Diff the payload actually being sent, never a separately-rebuilt field set.
function diffAgainstPayload({ current, fields, frontmatter, newBodyHash, newMetaHash }) { … }
```

Migrate all four call sites, `sync-jira-bug` included. **`sync-jira-bug`'s existing tests must pass unchanged** — it is the reference implementation, and a refactor that requires editing its tests has changed its behaviour.

**If Phase 1 said don't**, write the reason into the task's Notes.

**Family registry entry — deferred, do not create a registry file.** No family registry exists anywhere in this repo; `skill-families.md` is defined only inside task.93's planned `observation-log/` tree, and task.93 owns both its schema and the `families [--audit]` command that reads it. The drafted `## jira-sync` entry is parked in the task document's §Notes for task.93 to lift verbatim. See the task's §4 Out of Scope.

**Doc sweep** over the files listed in the task's §7 — several SKILL.md files already claim the property this task makes true, `sync-jira-task/SKILL.md:418` carries a literal test count that new tests falsify, and `shared/resources/jira-sync.js:4-5` still says only `sync-jira-task` uses the library.

**`CHANGELOG.md`** under `### Fixed` in `[Unreleased]` — house style there is a bolded headline sentence followed by measured evidence, not a one-liner.

Then `npm run bundle` — `jira-sync.js` has **23 bundled `references/` copies**, so a Phase 4 change to it fans out to all 23 and every one must be committed — followed by `npm test` and `npm run format`.

## Key Patterns and References

| Need | Read this |
|---|---|
| Corrected label diff | `skills/sync-jira-bug/scripts/sync-jira-bug.js:809-846` |
| Corrected transition re-read | `skills/sync-jira-bug/scripts/sync-jira-bug.js:1100-1115` |
| The already-correct epic skip path | `skills/sync-jira-epic/scripts/sync-jira-epic.js:984-1003` |
| Fake-Jira end-to-end suite (source to generalise, **not** reusable as-is) | `skills/sync-jira-bug/tests/end-to-end.test.js` — `fakeJira()` at `:44`, convergence assertion at `:369-406` |
| Generalised harness (new, Phase 1) | `tests/lib/fake-jira.js` |
| Shared helpers | `shared/resources/jira-sync.js` |

## Testing Approach

- **Location**: each script's own `tests/` directory. All four are already in the `package.json` glob (`skills/sync-jira-{epic,story,task,bug}/tests/*.test.js`), so no `package.json` edit is needed — verify that rather than assuming it.
- **Harness**: the fake Jira from `sync-jira-bug`'s end-to-end suite is the only thing that caught either defect, because it reads the payload back rather than trusting the caller's model of it. It is **not reusable as-is** — generalise it into `tests/lib/fake-jira.js` first (Phase 1), extend it with the backlog and project endpoints the siblings call, and re-point the bug suite at it with its assertions unchanged.
- **Order**: red first, always. Confirm each new test fails against unmodified code and record that it did.
- **Mutation proof**: for each fix, revert it, confirm the named test goes red, restore. A fix without a recorded proof is not done.
- **The counterweight test**: a genuine remote edit must still abort. Every other test here rewards the guard staying quiet, so this is the one that stops the fix becoming a silent regression.
