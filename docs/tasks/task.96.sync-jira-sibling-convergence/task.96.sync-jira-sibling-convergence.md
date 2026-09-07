---
id: task.96
title: "sync-jira-story/task/epic never converge: label diff and post-transition timestamp"
type: task
description: "The two convergence defects fixed on the bug path in PR #338 are present in the three sibling Jira sync scripts: every run re-PUTs because the label diff can never match, and a card that transitions then refuses every subsequent sync on a change the tool made itself."
tags: [sync-jira, convergence, jira, defect, skill-family]
category: infrastructure
status: planned
priority: High
created: 2026-09-07
updated: 2026-09-07
assignee:
estimated_effort_hours: 8
github_issue: 343
---

# Technical Task: sync-jira-story/task/epic never converge — label diff and post-transition timestamp

**Status:** Planned
**GitHub Issue**: [#343](https://github.com/Gamaroff/agent-skills/issues/343)

---

## 1. Overview

`sync-jira-bug` (PR #338) was written against a fake-Jira end-to-end test that reads the payload back. That test found two defects that no unit test had caught, both of which break the property every sync skill claims: **running it twice in a row should change nothing the second time.**

Both defects are present in `sync-jira-story`, `sync-jira-task` and `sync-jira-epic`, which PR #338 deliberately left untouched. This task ports the fixes, with the same end-to-end coverage that found them.

**Scope**: the three sibling sync scripts, their tests, and — if the shape proves genuinely common — a shared helper in `jira-sync.js` so the fourth implementation cannot drift again.

**Key deliverables**:

1. The label diff compares against the payload actually being sent, in all three.
2. The `updated` timestamp is re-read after a transition, on every path that can transition, in all three.
3. An end-to-end "sync twice, assert the second run is a no-op" test per script.

---

## 2. Motivation

### Current Problems

These were measured against the code on `develop` at `f8b01697`, not inferred from the bug path.

1. **The label diff can never match — all three scripts.** Each builds its diff input as `labels: lib.sanitiseLabels(args.labels || frontmatter.labels) || []` (`sync-jira-story.js:898`, `sync-jira-task.js:681`, `sync-jira-epic.js:912`) — rebuilt from frontmatter alone. But the payload that `collectIssueFields` sends adds the `synced-from-*` idempotency label. So the diff compares a set that is missing that label against a Jira issue that has it. They never converge: `labels` is reported changed on **every run**, which fires a PUT on every run and defeats the skip-when-no-diff path entirely.
2. **The post-transition timestamp is stale — story and task on every path, epic on the update path.** A transition is a write and bumps Jira's own `updated`. Persisting the pre-transition value tells the next run that Jira has moved since this sync, which is exactly what `guardConcurrentEdit` aborts on. The card syncs once and then refuses every subsequent run with "Jira issue updated since last local sync" — pointing at a change this tool made moments earlier, recoverable only with `--force`.
3. **The existing re-reads are on different paths and do not cover this.** `sync-jira-story.js:1037` and `sync-jira-task.js:794` re-read only as a *fallback when the PUT response omits `updated`*; `sync-jira-task.js:925` is the create path. None of them fires after a transition.
4. **`sync-jira-epic` is half-fixed, which is worse than not fixed.** It re-reads after a transition at `sync-jira-epic.js:990` — but only on the **skip** path (`skipSyncedAt`). The update path at `:1460` still persists `result?.updated` from before the transition. A defect that is fixed on the path most likely to be tested and live on the other is the hardest kind to notice.
5. **Nothing structural stops the fourth divergence.** Four scripts implement one methodology. Three of them share a defect the fourth fixed, and the only reason anyone knows is that the bug path happened to get an end-to-end test. This is textbook family drift.

### Benefits

1. **"Sync twice, nothing changes" becomes true**, which is the property the skip-when-no-diff path exists to provide and currently never delivers.
2. **No more spurious PUTs.** Every story/task/epic sync currently writes to Jira whether or not anything changed.
3. **Cards stop refusing their own edits.** The `--force` workaround disappears, along with the habit of reaching for it — which is what makes the guard useless when a *real* concurrent edit happens.
4. **The half-fixed epic path stops being a trap** for the next person who greps for `fetchUpdatedTimestampStrict`, finds a hit, and concludes the script is covered.
5. **A shared helper prevents the fifth divergence**, if the shape is common enough to extract.

---

## 3. Technical Background

### Current Architecture

Four sibling scripts, one methodology, three of them wrong in the same place:

| Script | Label diff built from | Re-read after transition |
|---|---|---|
| `sync-jira-story.js` | frontmatter (`:898`) ❌ | none ❌ |
| `sync-jira-task.js` | frontmatter (`:681`) ❌ | none ❌ |
| `sync-jira-epic.js` | frontmatter (`:912`) ❌ | skip path only (`:990`) ⚠️ |
| `sync-jira-bug.js` | **the payload** (`:834`) ✅ | **all paths** (`:915`, `:1027`, `:1102`) ✅ |

The defective shape, identical in all three siblings:

```js
const changedFields = current
  ? lib.diffFields({
      prev: current,
      next: {
        summary,
        priority: lib.normalisePriority(args.priority || frontmatter.priority, livePriorities),
        labels: lib.sanitiseLabels(args.labels || frontmatter.labels) || [],   // ← never matches
      },
      ...
```

### Target Architecture

The corrected shape, already proven on the bug path — build the payload **first**, then diff against it:

```js
const descAdf = buildDescriptionAdf({ ...descArgs, output });
const fields = collectIssueFields({ /* … */ syncLabel, modeLabels /* … */ });

const changedFields = current
  ? lib.diffFields({
      prev: current,
      next: { summary: fields.summary,
              priority: fields.priority ? fields.priority.name : null,
              labels: fields.labels },        // ← the set actually being sent
      ...
```

and, on every path that can transition:

```js
if (statusOutcome?.transitioned && result?.issueKey && !deferred) {
  try { result.updated = await lib.fetchUpdatedTimestampStrict({ /* … */ }); }
  catch (e) { output.warn(/* best-effort: the earlier value is no worse than not refreshing */); }
}
```

**Extraction decision, to be made from evidence during Phase 1, not assumed now.** If the corrected diff block is genuinely identical across all four, it belongs in `jira-sync.js` as a helper the four call. If the scripts differ enough that a shared helper needs three parameters to paper over the differences, keep the fix local and record the family entry instead. A wrong extraction is harder to unpick than a fourth duplication.

### Important Clarifications

- **This is a convergence defect, not a data-loss defect.** Nothing is corrupted; the cards are correct. What fails is idempotency, and its symptoms — a PUT on every run, then a hard refusal — look like flakiness rather than a bug, which is why it survived this long.
- **`--force` is not a workaround to document.** It suppresses the guard that would catch a *real* concurrent edit. Every `--force` habit formed by this defect is a future lost edit.
- **The re-read is best-effort by design.** A failed re-read leaves the earlier value, which is exactly the current behaviour — no worse. It must warn, never throw.
- **Do not "fix" the existing PUT-fallback re-reads.** `story:1037` and `task:794` are correct for what they do. The transition re-read is an *additional* site, not a replacement.

---

## 4. Scope

### In Scope

✅ **Label diff**: build the payload before diffing and diff against it, in all three sibling scripts.
✅ **Transition timestamp**: re-read after any successful transition, on every path that can transition — including `sync-jira-epic`'s update path, which its skip path already handles.
✅ **Tests**: a "sync twice, second run is a no-op" end-to-end test per script, against the fake Jira that found these.
✅ **Extraction, conditionally**: a shared `jira-sync.js` helper if Phase 1 shows the corrected block is genuinely common.
✅ **Family registry entry** recording these four as a family with the shared/member-specific split, so the next audit catches divergence mechanically.

### Out of Scope

❌ **`sync-github-*`** — different mechanism; no ADF, no Jira concurrent-edit guard. If an analogous defect exists there it is a separate finding with separate evidence.
❌ **Refactoring the four scripts toward a common structure.** Only the two defects are in scope; a structural merge is a much larger task and would bury the fix.
❌ **Changing `guardConcurrentEdit` or `diffFields` semantics.** Both are correct; they are being fed wrong inputs.
❌ **Backfilling `jira_last_synced_at` on already-synced documents.** The next successful sync self-heals it.

---

## 5. Breaking Changes

**None to any interface.** No CLI flag, no frontmatter key, no JSON output field changes shape.

The **behaviour** change is the point and should be stated plainly for the changelog: story, task and epic syncs currently issue a PUT on every run and report `Updated: labels`. After this task, an unchanged document reports no field changes and issues no PUT. Anything that scrapes the change summary for the literal string `Updated: labels` will stop seeing it — nothing in this repo does, and a caller depending on a spurious value was already depending on a defect.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.96.plan.sync-jira-sibling-convergence.md](task.96.plan.sync-jira-sibling-convergence.md)

### Phase 1: Reproduce, then decide on extraction

**Risk Level**: Low

**Files**:
- `skills/sync-jira-{story,task,epic}/tests/`

**Changes**:
- [ ] Write the failing test first, per script: sync twice against the fake Jira, assert the second run reports no field changes and issues no PUT. Confirm all three go **red** before any fix
- [ ] Write the failing transition test: transition a card, sync again, assert no concurrent-edit abort. Confirm story and task go red, and that epic goes red on the update path and green on the skip path — the half-fix must be visible in the test output, not just in the prose
- [ ] Diff the four corrected blocks and decide extraction on the evidence: shared helper, or local fix plus a family entry

**Dependencies**: none — PR #338 is merged

---

### Phase 2: The label diff

**Risk Level**: Medium

**Files**:
- `skills/sync-jira-story/scripts/sync-jira-story.js`
- `skills/sync-jira-task/scripts/sync-jira-task.js`
- `skills/sync-jira-epic/scripts/sync-jira-epic.js`

**Changes**:
- [ ] Move payload construction ahead of the diff in each script
- [ ] Diff against `fields.summary` / `fields.priority` / `fields.labels`, not the frontmatter rebuild
- [ ] Confirm the Phase 1 convergence tests go green
- [ ] Confirm no *other* test depended on the spurious `labels` change — a test asserting `Updated: labels` on an unchanged doc was asserting the defect

**Dependencies**: Phase 1

---

### Phase 3: The transition timestamp

**Risk Level**: Medium

**Files**:
- the same three scripts

**Changes**:
- [ ] Add the post-transition re-read to `sync-jira-story` and `sync-jira-task`
- [ ] Add it to `sync-jira-epic`'s **update** path; leave the working skip path alone
- [ ] Best-effort in every case: warn and keep the earlier value, never throw
- [ ] Guard on `transitioned && issueKey && !deferred` — a deferred run performed no transition and must not make a network call
- [ ] Confirm the Phase 1 transition tests go green

**Dependencies**: Phase 2

---

### Phase 4: Extraction and family registry

**Risk Level**: Low

**Files**:
- `shared/resources/jira-sync.js` (conditional)
- the four scripts (conditional)
- the family registry

**Changes**:
- [ ] If Phase 1 decided to extract: add the helper, migrate all four call sites including `sync-jira-bug`, and confirm the bug path's existing tests still pass unchanged
- [ ] If it decided not to: record why in the task's Notes, so the next person does not re-litigate it
- [ ] Add the `jira-sync` family entry — members, coherence model, and the shared/member-specific split
- [ ] `npm run bundle`, `npm test`, `npm run format`

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/sync-jira-story/scripts/sync-jira-story.js` — label diff (`:898`), post-transition re-read
2. ✅ `skills/sync-jira-task/scripts/sync-jira-task.js` — label diff (`:681`), post-transition re-read
3. ✅ `skills/sync-jira-epic/scripts/sync-jira-epic.js` — label diff (`:912`), re-read on the update path (`:1460`)
4. ✅ `shared/resources/jira-sync.js` — shared helper, **only if** Phase 1 justifies it

### Files to Modify (Tests)

5. ✅ `skills/sync-jira-story/tests/` — convergence + transition tests
6. ✅ `skills/sync-jira-task/tests/` — convergence + transition tests
7. ✅ `skills/sync-jira-epic/tests/` — convergence + transition tests, including the update/skip path split

### Files to Modify (Documentation)

8. ✅ `CHANGELOG.md` — the behaviour change stated plainly
9. ✅ Family registry entry for the four `sync-jira-*` scripts

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the corrected diff input.

**Actions**:
- [ ] `diffFields` fed the payload's label set returns no `labels` change when Jira already carries `synced-from-*`
- [ ] The same call fed the frontmatter rebuild **does** report a change — the defect, asserted directly, so the fix has a named counter-example
- [ ] The re-read fires only when `transitioned && issueKey && !deferred`; each of the three conditions gets its own negative case

**Command**: `npm test`

---

### Integration Tests

**Scope**: the property that was actually broken, against the fake Jira from PR #338.

**Actions**:
- [ ] **Sync twice, assert the second run is a no-op** — per script. This is the headline test and the one that should have existed before
- [ ] Transition, then sync: no concurrent-edit abort, no `--force` needed
- [ ] `sync-jira-epic` specifically: assert the fix on **both** the skip and update paths, since only one was previously covered
- [ ] A genuine remote edit still trips the guard — proving the fix did not simply disable it

---

### Contract Tests

**Scope**: the four siblings agreeing.

**Actions**:
- [ ] No `sync-jira-*` script builds a diff label set from frontmatter — asserted over the four scripts, so a fifth sibling inherits the check
- [ ] Every script with a transition path has a post-transition re-read

---

### Performance Tests

**Scope**: the spurious write this removes.

**Metrics**: PUT count for two consecutive syncs of an unchanged document.

**Baseline**: **2 PUTs today** (one per run). **Target: 1** — the first run only.

Assert the count, not the wall-clock. A timing assertion here would be load-flaky, and this repo has been bitten by that twice.

---

### Consumer Tests

**Scope**: everything that invokes these three scripts.

**Actions**:
- [ ] `ensure-{story,task,epic}-jira-issue` sub-routines still return their keys
- [ ] `develop-story`, `develop-task`, `finalise` sync steps unaffected
- [ ] `sync-jira-bug`'s existing tests pass **unchanged** if Phase 4 extracts a helper — the bug path is the reference implementation and must not regress to accommodate a refactor

---

## 9. Success Criteria

### Functional

- [ ] Syncing an unchanged story, task or epic twice reports no field changes on the second run
- [ ] The second run issues no PUT
- [ ] A card that transitions can be synced again without `--force`
- [ ] `sync-jira-epic` is fixed on the update path as well as the skip path
- [ ] A genuine remote edit still trips the concurrent-edit guard

### Performance

- [ ] PUT count for two consecutive unchanged syncs drops from 2 to 1, asserted as a count
- [ ] No new network call on a deferred run

### Code Quality

- [ ] Every fix is mutation-proven: revert it, watch the named test go red, restore
- [ ] The Phase 1 tests were confirmed **red before** the fix — a test written after a fix proves only that the code does what it does
- [ ] `npm test` passes; `npm run bundle`, `generate-catalog`, `generate-skill-deps` produce no drift
- [ ] The extraction decision is recorded with its reasoning, whichever way it went

### Migration

- [ ] `CHANGELOG.md` states the behaviour change
- [ ] Family registry entry added
- [ ] No frontmatter backfill needed — confirmed, not assumed

---

## 10. Risk Assessment

### High Risk Areas

**1. The fix silently disables the concurrent-edit guard**

- **Risk**: the cheapest way to stop spurious aborts is to stop the guard firing. That would pass every convergence test in this task while removing the protection that makes a real concurrent edit safe.
- **Probability**: Low deliberately, Medium accidentally — the tests here all reward the guard staying quiet.
- **Impact**: Critical, and silent. Lost edits with no error.
- **Mitigation**: a test asserting a **genuine** remote edit still aborts, listed under Integration and again under Success Criteria. It is the counterweight to every other test in this task.
- **Rollback**: revert; the defect is preferable to a disabled guard.

### Medium Risk Areas

**1. Extraction is done reflexively because four copies look wrong**

- **Risk**: three near-identical blocks invite a shared helper. If the scripts differ more than they appear to, the helper grows parameters until it is harder to read than the duplication.
- **Probability**: Medium — the pull toward extraction is strong and the repo rewards shared engines.
- **Impact**: Major. A wrong extraction is much harder to unpick than a fourth duplicate, and it touches the one path that currently works.
- **Mitigation**: Phase 1 decides on a real diff of the four corrected blocks, and the decision is recorded either way. Extraction is explicitly conditional in the plan.
- **Rollback**: keep the local fixes, drop the helper.

**2. An existing test asserts the defect**

- **Risk**: a test written against current behaviour may assert `Updated: labels` on an unchanged document. Fixing the defect turns it red, and the tempting move is to "fix" the fix.
- **Probability**: Medium.
- **Impact**: Minor if recognised, Major if it causes the fix to be reverted.
- **Mitigation**: Phase 2 explicitly checks for this. A red test here is evidence the fix worked; update the assertion and note it.

**3. The epic half-fix misleads the implementer**

- **Risk**: grepping for `fetchUpdatedTimestampStrict` returns a hit in every script, which reads as "already handled". The hits are on different paths and only one is post-transition.
- **Probability**: Medium — the grep is the obvious first move.
- **Impact**: Major: epic's update path stays broken and the task closes claiming otherwise.
- **Mitigation**: the call-site table in §3 lists line numbers and which path each covers, and Phase 1 requires the epic test to be red on update and green on skip *before* any fix.

### Low Risk Areas

**1. Bundled `references/` copies go stale** — `npm run bundle` in Phase 4, CI freshness check catches it.

**2. The family registry entry is imprecise** — it is a first draft that the next audit refines; a wrong `Shared` column is pruned like any other rule.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A real concurrent edit no longer aborts
- Any sync path starts writing wrong labels to live cards

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle && npm test`
3. Re-verify against a scratch Jira card: sync, edit remotely, sync again — the guard must abort

**Verification**: guard fires on a genuine remote edit; suite green.

---

### Partial Rollback (1–2 hours)

**When to Use**: one script's fix is wrong. The three are independent — nothing shares state unless Phase 4 extracted a helper.

**Steps**:
1. Revert that script and its tests
2. If a helper was extracted, revert that call site to the local form rather than reverting the helper for all four

---

### Forward Fix (< 4 hours)

**When to Use**: the fixes are right but a test is over-fitted, or the extraction is awkward. Neither touches live data.

**Approach**: fix forward. There is no migration and no persisted state to unwind — `jira_last_synced_at` self-heals on the next successful sync.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- The concurrent-edit guard stops firing on a genuine remote edit
- Labels written to live cards are wrong

**Non-Critical (Forward Fix)**:
- An awkward helper signature
- A missing family registry column
- Epic's skip and update paths converging on different code

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

### Phase 1: Reproduce, then decide on extraction
- [ ] Convergence test red in all three
- [ ] Transition test red in story and task
- [ ] Epic test red on update path, green on skip path
- [ ] Extraction decision recorded

### Phase 2: The label diff
- [ ] `sync-jira-story`
- [ ] `sync-jira-task`
- [ ] `sync-jira-epic`
- [ ] Convergence tests green
- [ ] No test was asserting the defect

### Phase 3: The transition timestamp
- [ ] `sync-jira-story`
- [ ] `sync-jira-task`
- [ ] `sync-jira-epic` update path
- [ ] Best-effort, warn-never-throw
- [ ] Guarded on transitioned && issueKey && !deferred
- [ ] Transition tests green

### Phase 4: Extraction and family registry
- [ ] Helper added and all four migrated, or decision recorded
- [ ] `sync-jira-bug` tests unchanged
- [ ] Family registry entry
- [ ] Bundle, test, format

---

## References

- **Origin**: PR [#338](https://github.com/Gamaroff/agent-skills/pull/338), which fixed both defects on the bug path and explicitly left the siblings untouched
- **Reference implementation**: `skills/sync-jira-bug/scripts/sync-jira-bug.js` — label diff at `:834`, transition re-read at `:1102`
- **Defect sites**: `sync-jira-story.js:898`, `sync-jira-task.js:681`, `sync-jira-epic.js:912` (labels); `sync-jira-epic.js:1460` (update-path timestamp)
- **Not defects**: `sync-jira-story.js:1037`, `sync-jira-task.js:794` (PUT-response fallback), `sync-jira-task.js:925` (create path)
- **Shared engine**: `shared/resources/jira-sync.js` — `diffFields`, `guardConcurrentEdit`, `fetchUpdatedTimestampStrict`, `normalisePriority`
- **Source plan**: [task.96.plan.sync-jira-sibling-convergence.md](task.96.plan.sync-jira-sibling-convergence.md)

---

## Notes

### Important Reminders

- **Write the failing test first.** Both defects survived because the unit tests asserted what the code did rather than what it should do. A test written after the fix proves nothing about the defect.
- **The epic is half-fixed — do not trust a grep.** `fetchUpdatedTimestampStrict` appears in every script; the hits are on different paths and only epic's skip path is post-transition.
- **Never suppress the guard to make a test pass.** The test asserting that a genuine remote edit still aborts is the one that stops this fix becoming a worse bug.
- **Extraction is a decision, not a default.** Record it either way.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Whether `sync-github-{story,task,epic}` carry an analogous defect is unknown. Out of scope here deliberately — it is a different mechanism and deserves its own evidence rather than an assumption inherited from the Jira path.

### Future Improvements

- A contract test asserting all `sync-*` scripts share the convergence property, so a fifth sibling inherits the check by existing rather than by someone remembering.
- The "sync twice, second run is a no-op" test is a good candidate for the eval suite's protocol layer — it is exactly the kind of property that unit tests structurally cannot see.

---

**Status:** Planned

**Next Steps**:
1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.96.qa.[number].sync-jira-sibling-convergence.md`
   - Bug Reports (if needed): `task.96.bug.[N].[name].md`
   - Quality Gate: `task.96.gate.[number].sync-jira-sibling-convergence.yml` (co-located in task directory)
