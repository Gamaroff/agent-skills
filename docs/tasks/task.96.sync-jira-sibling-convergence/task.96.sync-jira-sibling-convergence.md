---
id: task.96
title: "sync-jira-story/task/epic never converge: label diff and post-transition timestamp"
type: task
description: "The two convergence defects fixed on the bug path in PR #338 are present in the three sibling Jira sync scripts: every run re-PUTs because the label diff can never match, and a card that transitions then refuses every subsequent sync on a change the tool made itself."
tags: [sync-jira, convergence, jira, defect, skill-family]
category: infrastructure
status: ready-for-review
priority: High
created: 2026-09-07
updated: 2026-09-07
assignee:
estimated_effort_hours: 8
github_issue: 343
---

# Technical Task: sync-jira-story/task/epic never converge — label diff and post-transition timestamp

**Status:** Ready for Review
**GitHub Issue**: [#343](https://github.com/Gamaroff/agent-skills/issues/343)
**Review**: ✅ All review recommendations from `task.96.review.1.sync-jira-sibling-convergence.md` implemented 2026-09-07

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

1. **The label diff can never match — all three scripts.** Each builds its diff input as `labels: lib.sanitiseLabels(args.labels || frontmatter.labels) || []` (`sync-jira-story.js:898`, `sync-jira-task.js:681`, `sync-jira-epic.js:912`) — rebuilt from frontmatter alone. But the payload that `collectIssueFields` sends adds the `synced-from-*` idempotency label. So the diff compares a set that is missing that label against a Jira issue that has it. They never converge: `labels` is reported changed on **every run**.

   The consequence is **not uniform across the three**, and the earlier framing overstated it. `sync-jira-story` (`:915-917`) and `sync-jira-epic` (`:948`) each gate the PUT on `changedFields.length === 0`, so for them the defect defeats that gate entirely and fires a PUT every run. **`sync-jira-task` has no such gate** — verified: `changedFields.length === 0` appears nowhere in the file, and it builds `fields` at `:709` and PUTs unconditionally. There, defect 1 corrupts only the reported change summary, not the write count. `sync-jira-bug`, the reference implementation, also PUTs unconditionally. §8 scopes the PUT-count criterion accordingly.
2. **The post-transition timestamp is stale — story and task on every path, epic on the update path.** A transition is a write and bumps Jira's own `updated`. Persisting the pre-transition value tells the next run that Jira has moved since this sync, which is exactly what `guardConcurrentEdit` aborts on. The card syncs once and then refuses every subsequent run with "Jira issue updated since last local sync" — pointing at a change this tool made moments earlier, recoverable only with `--force`.
3. **The existing re-reads are on different paths and do not cover this.** `sync-jira-story.js:1037` and `sync-jira-task.js:794` re-read only as a *fallback when the PUT response omits `updated`*; `sync-jira-task.js:925` is the create path. None of them fires after a transition.
4. **`sync-jira-epic` is half-fixed, which is worse than not fixed.** It re-reads after a transition at `sync-jira-epic.js:990` — but only on the **skip** path (`skipSyncedAt`). The update path still persists `result?.updated` from before the transition. The site that matters is `:1428` (`lastSyncedAt: result.updated` — the value written into frontmatter); `:1460` is the `--json` emit of that same stale value. **Phase 3 fixes `:1428`**, and `:1460` follows from it. A defect that is fixed on the path most likely to be tested and live on the other is the hardest kind to notice.
5. **Nothing structural stops the fourth divergence.** Four scripts implement one methodology. Three of them share a defect the fourth fixed, and the only reason anyone knows is that the bug path happened to get an end-to-end test. This is textbook family drift.

### Benefits

1. **"Sync twice, nothing changes" becomes true**, which is the property the skip-when-no-diff path exists to provide and currently never delivers.
2. **No more spurious PUTs.** Every story/task/epic sync currently writes to Jira whether or not anything changed.
3. **Cards stop refusing their own edits.** The `--force` workaround disappears, along with the habit of reaching for it — which is what makes the guard useless when a *real* concurrent edit happens.
4. **The half-fixed epic path stops being a trap** for the next person who greps for `fetchUpdatedTimestampStrict`, finds a hit, and concludes the script is covered.
5. **A shared helper prevents the fifth divergence**, if the shape is common enough to extract — Phase 1 decides on evidence, and the comparison is already drafted in §Notes.

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

**Extraction decision, to be made from evidence during Phase 1, not assumed now.** If the corrected diff block is genuinely identical across all four, it belongs in `jira-sync.js` as a helper the four call. If the scripts differ enough that a shared helper needs three parameters to paper over the differences, keep the fix local and park the family entry for task.93 instead (§Notes). A wrong extraction is harder to unpick than a fourth duplication. **The comparison has already been done** — see §Notes, "Extraction evidence"; Phase 1 confirms or overturns it rather than starting cold.

### The two defects interact — this decides the fix order

Traced on `develop` at `3522a934`, after the task was first written.

`sync-jira-epic`'s working post-transition re-read (`:990`) sits inside a block gated on `current && changedFields.length === 0 && !args.force` (`:948`). **Defect 1 guarantees `changedFields` always contains `labels`.** That gate is therefore never satisfied, and the correct code at `:990` never executes.

Two consequences, both of which change how this task should be run:

1. **Epic is not "less broken" than story and task in practice — it is equally broken.** Its fix is dormant. The earlier framing of a half-fix was about *discoverability* (a grep for `fetchUpdatedTimestampStrict` hits all four scripts and reads as "handled"), not about severity. Nothing about epic warrants being fixed ahead of the other two.
2. **Fixing defect 1 alone would make epic worse to diagnose.** It would satisfy the gate, activating the dormant skip-path re-read while the update path (`:1460`) stays stale. Epic would then be correct on syncs with no field changes and wrong on syncs that change something — an intermittent failure, which is materially harder to diagnose than the consistent one it has today.

**So the two fixes must land together per script.** Phase 2 and Phase 3 may be separate commits, but neither epic's label fix nor its timestamp fix may merge alone. The Phase 1 test that drives epic's skip path will pass for the wrong reason until defect 1 is fixed — it never reaches the code it is meant to exercise — so assert that the skip path is actually *entered*, not merely that it produced no abort.

### Important Clarifications

- **This is a convergence defect, not a data-loss defect.** Nothing is corrupted; the cards are correct. What fails is idempotency, and its symptoms — a PUT on every run, then a hard refusal — look like flakiness rather than a bug, which is why it survived this long.
- **`--force` is not a workaround to document.** It suppresses the guard that would catch a *real* concurrent edit. Every `--force` habit formed by this defect is a future lost edit.
- **The re-read is best-effort by design.** A failed re-read leaves the earlier value, which is exactly the current behaviour — no worse. It must warn, never throw.
- **Do not "fix" the existing PUT-fallback re-reads.** `story:1037` and `task:794` are correct for what they do. The transition re-read is an *additional* site, not a replacement.
- **Phase 2 is not a straight reorder for `sync-jira-story`.** Story derives `includeDescription` *from* the diff result (`:944-946`, `changedFields.includes("description") || changedFields.includes("metadata")`) and feeds it *into* `collectIssueFields` (`:953`). Hoisting the payload above the diff is therefore circular and needs a two-pass build — construct with `includeDescription: true` for the diff, then set or strip `description` on the result. Task, epic and bug always send `description` and reorder trivially. Story and epic also build their payload *inside* the skip branch (story `:948`, in the `else` of `:917`; epic `:1054`, after the early `return` at `:1046`), so hoisting changes what runs on the skip path — check that too.
- **The "fake Jira from PR #338" is not a harness yet.** It is a module-local, unexported `fakeJira()` inside `skills/sync-jira-bug/tests/end-to-end.test.js:44`, with bug-specific issuetype and `issueLinkType` stubs, and it does not fake `/rest/agile/1.0/backlog/issue` or `/rest/api/3/project/{key}` — endpoints all three siblings call. Generalising it is prerequisite work, budgeted in Phase 1.
- **No existing test asserts the defect** — verified across all four `tests/` directories. The only `changeSummary` assertions are in the bug e2e suite (`:377`, `:560`) and both assert the *correct* behaviour. So Phase 2's "confirm no other test depended on the spurious `labels` change" comes back clean, and Phase 1's red tests must all be newly written — nothing existing turns red.

---

## 4. Scope

### In Scope

✅ **Label diff**: build the payload before diffing and diff against it, in all three sibling scripts.
✅ **Transition timestamp**: re-read after any successful transition, on every path that can transition — including `sync-jira-epic`'s update path, which its skip path already handles.
✅ **Test-harness generalisation**: lift `fakeJira()` out of `sync-jira-bug`'s test file into a shared, parameterised helper the three siblings can drive, extended to fake the backlog and project endpoints they call. Prerequisite work — see Phase 1.
✅ **Tests**: a "sync twice, second run is a no-op" end-to-end test per script, against that generalised fake Jira.
✅ **Extraction, conditionally**: a shared `jira-sync.js` helper if Phase 1 shows the corrected block is genuinely common.

### Out of Scope

❌ **`sync-github-*`** — different mechanism; no ADF, no Jira concurrent-edit guard. If an analogous defect exists there it is a separate finding with separate evidence.
❌ **Refactoring the four scripts toward a common structure.** Only the two defects are in scope; a structural merge is a much larger task and would bury the fix.
❌ **Changing `guardConcurrentEdit` or `diffFields` semantics.** Both are correct; they are being fed wrong inputs.
❌ **Backfilling `jira_last_synced_at` on already-synced documents.** The next successful sync self-heals it.
❌ **The family registry entry — deferred to [task.93](../task.93.observation-log-engine/task.93.observation-log-engine.md).** No family registry exists in this repo: `skill-families.md` is defined only inside task.93's planned `observation-log/` tree, and task.93 owns both its schema and the `families [--audit]` command that reads it. Seeding the file ahead of its owner would commit a schema task.93 would then have to migrate. The drafted `## jira-sync` entry is parked in §Notes for task.93 to lift verbatim. **Reviewed 2026-09-07** — this was previously listed as an in-scope deliverable with no location in the repo to put it.
❌ **Adding a skip-when-no-diff path to `sync-jira-task`.** It has none today (see §2.1). Giving it one is a behaviour change beyond the two defects this task is scoped to; §8 scopes the PUT-count criterion to story and epic instead.

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
- `shared/resources/fake-jira.js` (new — generalised harness, vendored into each consuming skill)
- `skills/sync-jira-{story,task,epic}/tests/`

**Changes**:
- [x] **Generalise the fake Jira first.** Lift `fakeJira()`, `hrefsIn()` and `descriptionOf()` out of `skills/sync-jira-bug/tests/end-to-end.test.js` (where they are module-local and unexported) into `shared/resources/fake-jira.js`, parameterised by `{ runner, argv }` so any sibling script can drive it. It **must** live under `shared/resources/` — that is the only tree the bundler vendors, and a skill is installed by copying its directory, so a require reaching outside the skill resolves to nothing in a consumer install. (An earlier revision placed it at `tests/lib/`; QA gate 1 caught that.) Extend it to fake `/rest/agile/1.0/backlog/issue`, `/rest/api/3/project/{key}` and `/rest/api/3/project/{key}/statuses` — endpoints story/task/epic call and the bug path never did
- [x] Re-point `sync-jira-bug`'s existing e2e suite at the extracted helper and confirm **its tests pass unchanged** — it is the reference implementation, and a generalisation that requires editing its assertions has changed its behaviour
- [x] Add PUT-count assertion machinery: `state.requests` is already recorded, but nothing counts it. Filter by `method === "PUT"` — this is new code, not a copy
- [x] Write the failing test first, per script: sync twice against the fake Jira, assert the second run reports no field changes. Confirm all three go **red** before any fix
- [x] Write the failing transition test: transition a card, sync again, assert no concurrent-edit abort. Confirm story and task go red
- [x] For epic, assert the skip path is **entered**, not merely that no abort occurred. Its re-read is unreachable while defect 1 stands, so a test that only checks for an abort passes for the wrong reason and will keep passing after a regression
- [x] Diff the four corrected blocks and decide extraction on the evidence: shared helper, or local fix plus the deferred family entry

**Dependencies**: none — PR #338 is merged. Note the harness generalisation above is **prerequisite work inside this phase**, not an external dependency; the task originally assumed a reusable harness that does not exist.

**Note on test placement**: `package.json`'s `test` script globs `skills/sync-jira-{epic,story,task,bug}/tests/*.test.js` by hand, so new `*.test.js` files in those exact directories run automatically — verified, no `package.json` edit needed. A helper under `tests/helpers/` matches no glob, which is correct: it is required by tests, not run as one.

---

### Phase 2: The label diff

**Risk Level**: Medium

**Files**:
- `skills/sync-jira-story/scripts/sync-jira-story.js`
- `skills/sync-jira-task/scripts/sync-jira-task.js`
- `skills/sync-jira-epic/scripts/sync-jira-epic.js`

**Changes**:
- [x] Move payload construction ahead of the diff in **task** and **epic** — a straight reorder there
- [x] **Story needs a two-pass build, not a reorder.** `includeDescription` (`:944-946`) is computed *from* `changedFields` and passed *into* `collectIssueFields` (`:953`). Build with `includeDescription: true` to obtain the label/priority set for the diff, then set or strip `description` on the result once `changedFields` is known
- [x] Check the skip-branch placement: story builds its payload inside the `else` of `:917` and epic after the early `return` at `:1046`. Hoisting means the payload is now built on the skip path too — confirm that is harmless before relying on it
- [x] Diff against `fields.summary` / `fields.priority` / `fields.labels`, not the frontmatter rebuild
- [x] Confirm the Phase 1 convergence tests go green
- [x] Confirm no *other* test depended on the spurious `labels` change — a test asserting `Updated: labels` on an unchanged doc was asserting the defect

**Dependencies**: Phase 1

---

### Phase 3: The transition timestamp

**Risk Level**: Medium

**Files**:
- the same three scripts

**Changes**:
- [x] Add the post-transition re-read to `sync-jira-story` and `sync-jira-task`
- [x] Add it to `sync-jira-epic`'s **update** path — the site is `:1428` (`lastSyncedAt: result.updated`, the value written to frontmatter), not `:1460` (the `--json` emit, which follows from it). Leave the working skip path at `:990` alone
- [x] Best-effort in every case: warn and keep the earlier value, never throw
- [x] Guard on `transitioned && issueKey && !deferred` — a deferred run performed no transition and must not make a network call
- [x] Confirm the Phase 1 transition tests go green

**Dependencies**: Phase 2

---

### Phase 4: Extraction, docs and changelog

**Risk Level**: Low

**Files**:
- `shared/resources/jira-sync.js` (conditional)
- the four scripts (conditional)
- `CHANGELOG.md`
- the doc-sweep targets listed in §7

**Changes**:
- [x] **Decision: EXTRACT.** `lib.diffAgainstPayload` added to `shared/resources/jira-sync.js`; all four call sites migrated, `sync-jira-bug` included. Its 5 e2e assertions pass **unchanged**. Reasoning recorded in §Notes → "Extraction decision"
- [x] ~~If it decided not to: record why in the task's Notes~~ — n/a, it extracted
- [x] Park the drafted `## jira-sync` family entry in §Notes for task.93 — **do not create a registry file**; see §4 Out of Scope
- [x] Doc sweep over the files in §7 that independently restate this behaviour. Most become *true* rather than needing rewriting, but `sync-jira-task/SKILL.md:418` carries a literal test count ("55 tests") that new tests falsify, and `shared/resources/jira-sync.js:4-5` still says only `sync-jira-task` uses the library when all four now do
- [x] `npm run bundle` — note `jira-sync.js` has **23 bundled copies** under `skills/*/references/`, so any Phase 4 change to it fans out to all 23 and every one must be committed
- [x] `npm test`, `npm run format`

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/sync-jira-story/scripts/sync-jira-story.js` — label diff (`:898`, two-pass because of `includeDescription` at `:944-946`), post-transition re-read
2. ✅ `skills/sync-jira-task/scripts/sync-jira-task.js` — label diff (`:681`), post-transition re-read
3. ✅ `skills/sync-jira-epic/scripts/sync-jira-epic.js` — label diff (`:912`), re-read on the update path at `:1428` (**not** `:1460`, which is the `--json` emit)
4. ✅ `shared/resources/jira-sync.js` — shared helper, **only if** Phase 1 justifies it. Changing it fans out to 23 bundled `references/` copies via `npm run bundle`

### Files to Add (Test Infrastructure)

5. ✅ `shared/resources/fake-jira.js` — the generalised harness lifted from `skills/sync-jira-bug/tests/end-to-end.test.js`, parameterised by `{ runner, argv }`, extended with the backlog and project endpoints, and bundled into the four consuming skills' `references/`.

   > It was first placed at `tests/lib/` — the repo's home for shared test helpers — which QA found breaks every consumer install: a skill is installed by copying its directory, so a require reaching outside the skill resolves to nothing. The failure is invisible here because `.agents/skills` is a symlink to `../skills`. `shared/resources/` is the only location the bundler vendors, and vendoring is what makes the require resolve.

### Files to Modify (Tests)

6. ✅ `skills/sync-jira-bug/tests/end-to-end.test.js` — re-pointed at the extracted helper; its assertions must not change
7. ✅ `skills/sync-jira-story/tests/` — convergence + transition tests
8. ✅ `skills/sync-jira-task/tests/` — convergence + transition tests
9. ✅ `skills/sync-jira-epic/tests/` — convergence + transition tests, including the update/skip path split

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md` — the behaviour change stated plainly, under `### Fixed` in `[Unreleased]`
11. ✅ Doc sweep — these restate the idempotency behaviour independently and were verified to reference it: `skills/sync-jira-{story,task,epic,bug}/SKILL.md` (the "a sync that changes nothing writes nothing at all" sentence at story `:273`, task `:255`, epic `:276`, bug `:239`; epic `:367` describes an `action: "skip"` its update path currently never reaches; **task `:418` carries a literal test count that new tests falsify**), `docs/runbooks/jira-publish.md:5`, `docs/reference/troubleshooting.md:292,301`, and the stale library header at `shared/resources/jira-sync.js:4-5`

### Files Actually Changed

- `shared/resources/jira-sync.js` — added `diffAgainstPayload` + export; un-staled the header (it still claimed only `sync-jira-task` used the library)
- `skills/sync-jira-{story,task,epic,bug}/scripts/*.js` — payload-before-diff, migrated to the helper; post-transition re-read added to story, task and epic's **update** path
- `shared/resources/fake-jira.js` — **new**, the generalised harness (+ 4 vendored `references/` copies)
- `skills/sync-jira-bug/tests/end-to-end.test.js` — re-pointed at the harness, assertions unchanged
- `skills/sync-jira-{story,task,epic}/tests/end-to-end.test.js` — **new**, 12 tests
- `skills/sync-jira-task/SKILL.md` — the literal test count replaced with a description
- `CHANGELOG.md` — `### Fixed` under `[Unreleased]`
- 22 bundled `skills/*/references/jira-sync.js` copies, regenerated by `npm run bundle`

> The family registry entry is **not** listed here — it is deferred to task.93; see §4 Out of Scope.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the corrected diff input.

**Actions**:
- [x] `diffFields` fed the payload's label set returns no `labels` change when Jira already carries `synced-from-*`
- [x] The same call fed the frontmatter rebuild **does** report a change — the defect, asserted directly, so the fix has a named counter-example
- [x] The re-read fires only when `transitioned && issueKey && !deferred`; each of the three conditions gets its own negative case

**Command**: `npm test`

---

### Integration Tests

**Scope**: the property that was actually broken, against the fake Jira from PR #338.

**Actions**:
- [x] **Sync twice, assert the second run is a no-op** — per script. This is the headline test and the one that should have existed before
- [x] Transition, then sync: no concurrent-edit abort, no `--force` needed
- [x] `sync-jira-epic` specifically: assert the fix on **both** the skip and update paths, since only one was previously covered
- [x] A genuine remote edit still trips the guard — proving the fix did not simply disable it

---

### Contract Tests

**Scope**: the four siblings agreeing.

**Actions**:
- [x] No `sync-jira-*` script builds a diff label set from frontmatter — asserted over the four scripts, so a fifth sibling inherits the check
- [x] Every script with a transition path has a post-transition re-read

---

### Performance Tests

**Scope**: the spurious write this removes.

**Metrics**: PUT count for two consecutive syncs of an unchanged document.

**Scoped to `sync-jira-story` and `sync-jira-epic`** — the two that gate the PUT on `changedFields.length === 0`. **Baseline: 2 PUTs today** (one per run). **Target: 1** — the first run only.

**`sync-jira-task` is excluded, deliberately.** It has no skip gate and PUTs unconditionally (§2.1), so its PUT count is 2 before and after this fix. Giving it a gate is out of scope. For task, assert instead that the second run's change summary reports **no field changes** — that is the whole of what defect 1 breaks there.

Assert the count, not the wall-clock. A timing assertion here would be load-flaky, and this repo has been bitten by that twice. The counting machinery does not exist yet — `state.requests` is recorded by the fake but never filtered; Phase 1 adds it.

---

### Consumer Tests

**Scope**: everything that invokes these three scripts.

**Actions**:
- [x] `ensure-{story,task,epic}-jira-issue` sub-routines still return their keys
- [x] `develop-story`, `develop-task`, `finalise` sync steps unaffected
- [x] `sync-jira-bug`'s existing tests pass **unchanged** if Phase 4 extracts a helper — the bug path is the reference implementation and must not regress to accommodate a refactor

---

## 9. Success Criteria

### Functional

- [x] Syncing an unchanged story, task or epic twice reports no field changes on the second run
- [x] The second run issues no PUT — **story and epic only**; `sync-jira-task` has no skip gate and is excluded by §8
- [x] A card that transitions can be synced again without `--force`
- [x] `sync-jira-epic` is fixed on the update path as well as the skip path
- [x] A genuine remote edit still trips the concurrent-edit guard

### Performance

- [x] PUT count for two consecutive unchanged syncs drops from 2 to 1, asserted as a count — **`sync-jira-story` and `sync-jira-epic`**
- [x] `sync-jira-task`'s second run reports no field changes (its PUT count is 2 before and after — no skip gate, out of scope)
- [x] No new network call on a deferred run

### Code Quality

- [x] Every fix is mutation-proven: revert it, watch the named test go red, restore
- [x] The Phase 1 tests were confirmed **red before** the fix — a test written after a fix proves only that the code does what it does
- [x] `npm test` passes; `npm run bundle`, `generate-catalog`, `generate-skill-deps` produce no drift
- [x] `sync-jira-bug`'s e2e assertions are unchanged after the harness extraction
- [x] The extraction decision is recorded with its reasoning, whichever way it went

### Migration

- [x] `CHANGELOG.md` states the behaviour change
- [x] Doc sweep complete over the §7 list — including the literal test count at `sync-jira-task/SKILL.md:418` and the stale library header at `shared/resources/jira-sync.js:4-5`
- [x] Drafted family entry parked in §Notes for task.93 (the registry itself is out of scope — §4)
- [x] No frontmatter backfill needed — confirmed, not assumed

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

**2. An existing test asserts the defect** — ⬇️ **downgraded to Low, verified 2026-09-07**

- **Risk**: a test written against current behaviour may assert `Updated: labels` on an unchanged document. Fixing the defect turns it red, and the tempting move is to "fix" the fix.
- **Status**: **no such test exists.** All four `tests/` directories were searched; the only `changeSummary` assertions are `skills/sync-jira-bug/tests/end-to-end.test.js:377` and `:560`, and both assert the *correct* behaviour. The `labels` hits elsewhere are `diffFields` unit tests with hand-built `prev`/`next` and `collectIssueFields` label-merge tests — none couples the two.
- **Consequence**: Phase 2's "confirm no other test depended on the spurious `labels` change" will come back clean, and Phase 1's tests must all be **newly written** — nothing existing turns red. Budget accordingly.
- **Mitigation**: retained as a cheap re-check, not as a live risk.

**3. Epic's label fix is merged without its timestamp fix**

- **Risk**: the two fixes are naturally separate commits (Phases 2 and 3). Landing epic's label fix alone activates its dormant skip-path re-read while the update path stays stale, converting a consistent failure into an intermittent one.
- **Probability**: Medium — the phases invite it, and the label fix alone will make the convergence test go green, which looks like progress.
- **Impact**: Major. An intermittent stale-timestamp bug that depends on whether an unrelated field drifted is far harder to diagnose than the current always-fails behaviour.
- **Mitigation**: neither epic fix merges alone — stated in §3. The epic skip-path test must assert the path is **entered**, not just that no abort occurred, or it passes for the wrong reason.
- **Rollback**: land the second fix, or revert the first.

**4. The epic half-fix misleads the implementer**

- **Risk**: grepping for `fetchUpdatedTimestampStrict` returns a hit in every script, which reads as "already handled". The hits are on different paths and only one is post-transition.
- **Probability**: Medium — the grep is the obvious first move.
- **Impact**: Major: epic's update path stays broken and the task closes claiming otherwise.
- **Mitigation**: the call-site table in §3 lists line numbers and which path each covers. Note the correction above: the epic skip-path test cannot be "green before the fix" in the way originally written, because defect 1 stops that path being reached at all — Phase 1 must assert path entry, not just absence of an abort.

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-07
**Quality Score**: 95/100
**Gate Decision**: PASS (cycle 2 — cycle 1 was FAIL, 50/100)

### QA Reports

- **Cycle 2 (current)**: [task.96.qa.2.sync-jira-sibling-convergence.md](./task.96.qa.2.sync-jira-sibling-convergence.md) · [gate.2](./task.96.gate.2.sync-jira-sibling-convergence.yml)
- **Cycle 1**: [task.96.qa.1.sync-jira-sibling-convergence.md](./task.96.qa.1.sync-jira-sibling-convergence.md) · [gate.1](./task.96.gate.1.sync-jira-sibling-convergence.yml)

### Test Coverage Summary

- **Tests Executed**: 2676 (2675 pass, 0 failures, 1 pre-existing skip)
- **Phases Verified**: 4/4
- **QA Cycles**: 2 — cycle 1 found 8 issues, cycle 2's refute pass found 8 more; all 16 closed
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Both named defects are fixed and mutation-proven, and the concurrent-edit guard is provably still armed. Two QA cycles found and closed 16 issues between them — **five of which the change itself introduced**, each invisible to a green suite:

**Cycle 1 (FAIL, 50/100)** — the new e2e suites could not run in a consumer install (masked locally by the `.agents/skills` symlink); `--force` became a silent no-op on an unchanged story once the label fix made that gate reachable; and two tests passed for the wrong reason.

**Cycle 2 (PASS, 95/100)** — the mandatory refute pass, unscoped over the whole diff. It found that cycle 1's `--force` fix restored the *write* but not the *repair* (the two-pass build stripped `description`, so the forced PUT carried only the fields the diff had proved identical); that epic's skip path wrote a refreshed timestamp to the file but a stale one to `--json`; and that the deferred-run guard test stayed green with the guard deleted. All closed.

Three residuals are recorded as future work rather than fixed — a `--json`-suppressed warning, an inherent read-after-write window, and the task/bug scripts' missing skip gate. None blocks this change.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |
| 2026-09-07 | 1.1     | Traced the defect interaction: epic's skip-path re-read is unreachable while the label diff never converges, so epic is equally broken, not less, and the two fixes must land together per script | create-task |
| 2026-09-07 | 1.2     | Review passed (8/10) — every defect claim verified against HEAD with no line drift. Corrected four inaccuracies and closed two unbudgeted gaps: the PUT-count criterion is scoped to story and epic (task has no skip gate); epic's stale-timestamp site is `:1428`, not `:1460`; story's Phase 2 needs a two-pass build because `includeDescription` derives from the diff; the family registry is deferred to task.93 (no such file exists) with the entry parked in Notes; the fake Jira is budgeted for generalisation in Phase 1 (it is a private function, not a harness); Risk 2 downgraded — no existing test asserts the defect | review-task |
| 2026-09-07 |         | Status → ready-for-development | review-task |
| 2026-09-07 |         | Implemented — 30 files (5 scripts/lib, 5 test files, 2 docs, 22 bundled copies), 17 end-to-end tests, all 6 fixes mutation-proven | develop |
| 2026-09-07 |         | QA gate FAIL (50/100) — 2 HIGH, 1 MEDIUM, 5 LOW: consumer-install require failure, `--force` regression, and two tests that pass for the wrong reason | qa-task |
| 2026-09-07 |         | QA findings fixed — all 4 gate issues plus 4 cleanups and 1 found by the adversarial pass, 1 iteration | qa-fix |
| 2026-09-07 |         | QA gate PASS (95/100) — cycle 2 refute pass found 8 further issues, 3 of them caused by cycle 1's own fixes; all closed | qa-task |

---

## Progress Tracking

### Phase 1: Reproduce, then decide on extraction
- [x] Fake Jira generalised into `shared/resources/fake-jira.js` (backlog + project endpoints added)
- [x] `sync-jira-bug` e2e re-pointed at it, assertions unchanged
- [x] PUT-count assertion machinery added (filter `state.requests` by method)
- [x] Convergence test red in all three
- [x] Transition test red in story and task
- [x] Epic skip-path test asserts path ENTRY, not just absence of an abort
- [x] Extraction decision recorded

### Phase 2: The label diff
- [x] `sync-jira-story` (two-pass build — `includeDescription` circularity)
- [x] `sync-jira-task`
- [x] `sync-jira-epic`
- [x] Skip-branch payload placement checked in story and epic
- [x] Convergence tests green
- [x] No test was asserting the defect — verified 2026-09-07, see §10 Risk 2

### Phase 3: The transition timestamp
- [x] `sync-jira-story`
- [x] `sync-jira-task`
- [x] `sync-jira-epic` update path at `:1428`
- [x] Best-effort, warn-never-throw
- [x] Guarded on transitioned && issueKey && !deferred
- [x] Transition tests green

### Phase 4: Extraction, docs and changelog
- [x] Helper added and all four migrated, or decision recorded
- [x] `sync-jira-bug` tests unchanged
- [x] Doc sweep over the §7 list (incl. the `SKILL.md:418` test count and the stale `jira-sync.js:4-5` header)
- [x] `CHANGELOG.md` under `### Fixed`
- [x] Family entry parked in §Notes for task.93 (registry itself out of scope)
- [x] Bundle (23 `references/` copies), test, format

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

### Parked: drafted family entry for task.93

The family registry is [out of scope](#4-scope) — no such file exists and task.93 owns its schema. The entry is drafted here so task.93 can lift it verbatim rather than re-deriving it:

```markdown
## jira-sync
**Members:** sync-jira-story, sync-jira-task, sync-jira-epic, sync-jira-bug
**Coherence model:** synced-duplicates
**Shared:** diff the outgoing payload, never a rebuilt field set; re-read `updated`
  after any successful transition; best-effort with a warning, never a throw;
  idempotency via the `synced-from-*` label search.
**Member-specific:** parenting (epic link vs standalone vs sibling issue link),
  the document schema each reads, bug's Status History in place of a Change Log,
  and whether a skip-when-no-diff gate exists at all (story and epic have one;
  task and bug PUT unconditionally).
```

### Extraction decision — EXTRACTED, and why the pre-Phase-1 evidence pointed the other way

**Outcome: extracted.** `lib.diffAgainstPayload({ current, fields, frontmatter, newBodyHash, newMetaHash })` now lives in `shared/resources/jira-sync.js` and all four scripts call it. `sync-jira-bug`'s end-to-end assertions pass unchanged, which is the acceptance test for the migration.

The evidence gathered *before* Phase 1 pointed at "keep it local", and it was wrong for an instructive reason: it compared the **payload builders**, which genuinely do differ, rather than the **corrected diff blocks**, which turn out to be byte-identical. Once each script builds `fields` first, the three-line `next` object is the same everywhere, and a helper that accepts the already-built `fields` needs no discriminating parameter at all. Every divergent concern — which builder, which parameter list, story's two-pass `includeDescription` — stays in the caller, where it belongs.

The cut is therefore "diff the payload you already built", not "build and diff". A helper that also built the payload would have needed at least four discriminators plus a two-pass contract for story alone, and that is the version the task's own rule correctly rejects. The builders' divergence is real:

| Script | Builder | Params | Divergence |
|---|---|---|---|
| story | `collectIssueFields` `:276` | 12 | only one with `includeDescription`, `epicKey`, `useEpicLink` |
| task | `collectIssueFields` `:231` | 9 | leanest |
| epic | `collectCommonFields` `:373` + create/update wrappers `:429`/`:431` | 7 | create-only fields split out |
| bug | `collectIssueFields` `:243` | 11 | priority from `bugFields`, extra `modeLabels`, severity custom field |

A helper taking the *already-built* `fields` plus `current` is a ~6-line wrapper over `lib.diffFields` whose only shared logic is `priority: fields.priority ? fields.priority.name : null`. A helper that also *built* the payload would need at least four discriminating parameters (builder fn, type-id key, priority source, extra labels) plus a two-pass `includeDescription` contract for story alone. By the task's own stated rule — "if a shared helper needs three parameters to paper over the differences, keep the fix local" — **the evidence favours local fixes**. Phase 1 should confirm or overturn this, and record which.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Whether `sync-github-{story,task,epic}` carry an analogous defect is unknown. Out of scope here deliberately — it is a different mechanism and deserves its own evidence rather than an assumption inherited from the Jira path.
- ⚠️ `sync-jira-task` and `sync-jira-bug` PUT unconditionally, with no skip-when-no-diff gate. That asymmetry across the four siblings is itself family drift, but it is a *separate* defect from the two in scope here and needs its own evidence and its own task.

### Future Improvements

- A contract test asserting all `sync-*` scripts share the convergence property, so a fifth sibling inherits the check by existing rather than by someone remembering.
- The "sync twice, second run is a no-op" test is a good candidate for the eval suite's protocol layer — it is exactly the kind of property that unit tests structurally cannot see.

---

**Status:** Ready for Review

**Next Steps**:
1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.96.qa.[number].sync-jira-sibling-convergence.md`
   - Bug Reports (if needed): `task.96.bug.[N].[name].md`
   - Quality Gate: `task.96.gate.[number].sync-jira-sibling-convergence.yml` (co-located in task directory)
