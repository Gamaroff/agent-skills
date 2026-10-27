---
id: task.235
title: "select-next registry fallback selects an item blocked on another repository"
type: task
description: "Give an external precondition a form the selector reads, and have the fallback pass over it with a stated reason instead of selecting it."
tags: [develop-next, observation]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-26
updated: 2026-10-26
assignee:
estimated_effort_hours: 16
github_issue: 759
---

# Technical Task: select-next registry fallback selects an item blocked on another repository

**Status:** Planned

**GitHub Issue**: [#759](https://github.com/Gamaroff/agent-skills/issues/759)

---

## 1. Overview

`select-next.mjs`'s registry fallback selects a task whose only blocker lives in another repository,
because that blocker is written as free text the selector never reads. This task adds one optional
frontmatter field, `blocked_on_external:`, that the fallback reads. A document carrying it is passed
over with the condition named in the payload, and is never selected.

**Scope**: the registry fallback in `skills/develop-next/scripts/select-next.mjs`, its unit tests,
the selection reference, the authoring rule that tells a task author how to write a cross-repository
blocker, the task frontmatter schema, and task.174 (the one live instance).

**Key deliverables**:

1. `registryFrontier` reads `blocked_on_external:` and passes over any document that carries a
   non-empty value, with reason `blocked on an external precondition: <value>`.
2. A held row is never silent: the selected rationale and the `roadmap-complete` detail both name
   every held row and its condition.
3. The authoring rule (`create-task` § 1.2, the task registry's rule list) says to write the field,
   and task.174 carries it.

**Expected outcome**: `/develop-next` on today's tree no longer selects T174. It selects the next
eligible item, or stops `roadmap-complete` with T174 named as held on tinker-city task.127.

---

## 2. Motivation

### Current Problems

1. **A known-blocked task is selected.** On 2026-10-26, after T169 merged, the selector returned
   `status: selected`, item T174, `phase: (registry fallback — task-registry)`. T174's registry
   notes cell says "blocked on tinker-city task.127 (#982, another repository) merging and running
   on real CI; Phase 0 halts until then" (`docs/tasks/task-registry.md:218`).
2. **The block is invisible by construction.** `parseDepCell` reads only the text before the first
   ` · ` / ` — ` separator (`DEP_NOTE_SEP_RE`, `select-next.mjs:1161`), and a cross-repository
   blocker must be written after ` — ` as free text so it does not bind to this registry's own
   `task.127` (`docs/tasks/task-registry.md:24`; `skills/create-task/SKILL.md:265`).
3. **The only stop is the expensive one.** The authoring rule's backstop is the task's own Phase 0
   HALT. An unattended `/develop-next` (or `/loop /develop-next`) pays a full pipeline setup to
   reach it: branch, run-state file, lock, then a HALT. The run-state survives a HALT, so the next
   invocation resumes at the same item and halts again.
4. **The rule text concedes the gap.** Both restatements say "the selector cannot see free text, so
   the HALT is what stops it" (`docs/tasks/task-registry.md:24`, `skills/create-task/SKILL.md:265`).
   This states the defect as policy.

### Benefits of a machine-readable external precondition

1. **No wasted run**: a held item costs one line in the selection payload instead of a Phase 0
   setup and HALT on every loop iteration.
2. **The loop keeps moving**: the fallback selects the next eligible row past the held one, so
   one external blocker does not stall the whole frontier.
3. **Never silent**: every held row and its condition are named in the rationale and in the
   `roadmap-complete` detail, so a field nobody clears is seen on every run.
4. **Frontmatter decides, as it already does**: the field sits beside `status:`, which the fallback
   already reads from the document (`roadmap-selection.md` §"Frontmatter decides; the registry row
   only nominates"). There is no new source of truth.

---

## 3. Technical Background

### Current Architecture

Every name below was grepped on 2026-10-26 at `develop` `2bc2a223`.

- **Fallback call site.** `selectNext` consults the registries only at the terminal
  `roadmap-complete` return, through an injected lazy `opts.loadRegistries`
  (`select-next.mjs:861`, `const frontier = registryFrontier(opts.loadRegistries())`).
- **`registryFrontier(registries, opts)`** (`select-next.mjs:1518`) ranks bug and task rows, then
  for each row: reads the document status through `readStatus(row.path)`, rejects a missing
  document, an off-lifecycle status, and a status outside the eligibility floor
  (`if (!ELIGIBLE_FOR[row.kind].has(docStatus))`, `select-next.mjs:1601`), then dependency
  blockers (`const depBlockers = registryDepBlockers(`, `select-next.mjs:1615`). The first row that
  passes is `selected`. Each rejection is pushed to `passedOver` with `eligible: false` and a
  `reason`.
- **`readStatus`** is injected by `main` (`readStatus: (docPath) =>`, `select-next.mjs:2080`): it
  reads the file and returns `parseFrontmatterStatus(text)`. It returns a string, so the frontier
  sees no other frontmatter key.
- **`frontmatterScalar(text, key)`** (`select-next.mjs:998`) already reads any top-level scalar,
  strips a trailing comment and quotes, and returns `null` for an absent or empty value. It is the
  reader to reuse; no second frontmatter parser is needed.
- **`DEP_EMPTY_RE`** (`select-next.mjs:1165`, `/^(?:[—–-]|none|n\/a|na|tbd)$/i`) is the existing
  "means no dependency" spelling set.
- **`buildRegistryRationale`** (`select-next.mjs:911`) reports every `eligible === false` row as
  "rejected on document status". That is already inaccurate for dependency-blocked rows, and would
  be for held rows.
- **`roadmap-complete` detail** (`select-next.mjs:886`) names off-lifecycle rows as a `WARNING`
  when the fallback selects nothing. That is the pattern to follow for held rows.
- **`--batch` is registry-free** (`select-next.mjs:2114`, "`--batch` is deliberately
  registry-free"). `selectBatch` never calls `registryFrontier`, so `/develop-batch` is **not**
  affected. Observation #103's `siblings_checked` says it inherits the gap. That is wrong, and this
  task corrects it here.
- **The roadmap path already handles a free-text block.** A `⛔` annotation that names no item ids is
  "treated as blocked" (`select-next.mjs:543`). Only the registry fallback lacks a form.

**The population, measured.** `grep -nE "another repo|blocked on [a-z-]+ task" docs/tasks/task-registry.md`
returns line 24 (the rule), line 218 (T174, `planned`), line 257 (task.213, `accepted`, so already off
the frontier) and line 300 (a note). **T174 is the only live instance.** The bug registry has none
(`grep -nE "another repo" docs/bugs/bug-registry.md`: no hits).

### Target Architecture

- `main`'s injected reader also exposes `readExternalBlock(path)`: it reads the document once and
  returns `frontmatterScalar(text, "blocked_on_external")`, or `null`. A value matching
  `DEP_EMPTY_RE` (`—`, `none`, `n/a`, `tbd`) counts as **not** blocked, so a placeholder never
  hides a row.
- `registryFrontier` checks it **after** the eligibility floor and **before** the dependency check.
  The floor goes first so that a cancelled or accepted document still reports its nearer cause.
  The external check goes before the dependency check because it is the condition no in-repo action
  can clear. A held row is pushed to `passedOver` with `eligible: false`, `externalBlock: <value>`
  and reason
  `blocked on an external precondition: <value> — clear blocked_on_external in <path> when it is met`.
- A frontier with no `readExternalBlock` function behaves exactly as today: the default is
  `() => null`, as `readStatus` defaults today (`select-next.mjs:1521`).
- `buildRegistryRationale` counts rows by cause: rejected on document status, blocked on
  dependencies, held on an external precondition. Held rows are named with their condition.
- When nothing is selected, the `roadmap-complete` detail appends
  `— N row(s) held on an external precondition: <path> (<value>), …`. The stop reason is unchanged.

### Important Clarifications

- **This is not the park value task.71 rejected.** `roadmap-selection.md:87` records the decision
  that there is no opt-out: a parked filing "cost indefinite silence". This field differs on both
  counts. It names a condition outside this repository, checkable yes or no. It is also never
  silent: every run names the held row in its rationale or stop detail. The section must say so,
  and amend line 87 so a reader does not see a contradiction.
- **No new stop reason.** The observation proposed `stopReason: external-blocked`. `roadmap-complete`
  is read by `skills/develop-next/SKILL.md:244`, `skills/loop-supervisor/README.md:239` and
  `skills/session-handoff/tests/handoff-verify.test.js:1249`. A new reason would need each of them.
  The existing off-lifecycle `WARNING` shows that a detail line carries this kind of fact well
  enough.
- **The selector cannot check the other repository**, and must not try: no network in a
  deterministic selector. A human clears the field when the condition is met. The every-run
  naming is what keeps that step from being forgotten.
- **The Phase 0 HALT stays.** A task with an external blocker still keeps its own Phase 0 check,
  for a direct `/develop-task` invocation that does not go through the selector.

---

## 4. Scope

### In Scope

✅ **Selector**: `readExternalBlock` in `main`'s registry loader, the check in `registryFrontier`,
the rationale counts and the `roadmap-complete` detail.
✅ **Tests**: unit tests in `evals/develop-next/unit/select-next.test.mjs` for every outcome below.
✅ **Docs**: `roadmap-selection.md` (new subsection, line 87 amended); the frontmatter table in
`docs/standards/task-documents.md`; the rule at `docs/tasks/task-registry.md:24` and
`skills/create-task/SKILL.md:265`.
✅ **Migration**: task.174's frontmatter gains `blocked_on_external:`.
✅ **CHANGELOG**: `[Unreleased]` entry.

### Out of Scope

❌ **The roadmap path**: its `⛔` annotation already blocks on free text. A frontmatter read for
roadmap rows would be a second mechanism for a job the roadmap already does.
❌ **`--batch`**: registry-free by design (`select-next.mjs:2114`).
❌ **`develop-task` Phase 0c refusing the field on a direct invocation**: a separate consumer. The
task's own Phase 0 HALT already covers it. Recorded as a follow-up.
❌ **Bug reports with no frontmatter** (the `**Bug ID**:` header-block shape): `frontmatterScalar`
cannot read them. No bug carries an external blocker today. If one ever does, it uses frontmatter.
❌ **Heuristic detection of free-text blockers** in registry notes ("another repository"): a
shared-token match, the anti-pattern obs #135 names. The authoring rule asks for the field instead.

---

## 5. Breaking Changes

None. The field is optional and additive. A document without it, and a loader without
`readExternalBlock`, select exactly as today. The `passedOver` entries gain one optional key
(`externalBlock`). The rationale's wording changes, and nothing parses it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.235.plan.select-next-external-precondition.md](task.235.plan.select-next-external-precondition.md)

### Phase 1: Failing tests first (Risk: Low)

**Files**: `evals/develop-next/unit/select-next.test.mjs`

- [ ] Add a `registryFrontier` test: a `planned` task with `blocked_on_external: other-repo task.9 merged`
      and no other blocker is **not** selected; the next eligible row is.
- [ ] Assert the held row's `passedOver` entry: `eligible: false`, `externalBlock` equal to the
      value, reason naming the value and the path.
- [ ] Run the file and record it red for the new tests, before any selector edit.

### Phase 2: Read and honour the field (Risk: Medium)

**Files**: `skills/develop-next/scripts/select-next.mjs`

- [ ] `main`'s loader exposes `readExternalBlock(docPath)` via `frontmatterScalar(text, "blocked_on_external")`;
      a `DEP_EMPTY_RE` value returns `null`.
- [ ] `registryFrontier` defaults it to `() => null`, and checks it after the eligibility floor and
      before `registryDepBlockers`.
- [ ] `buildRegistryRationale` reports the three rejection causes separately and names held rows.
- [ ] The `roadmap-complete` detail names held rows and their conditions.

### Phase 3: Control and edge cases (Risk: Low)

**Files**: `evals/develop-next/unit/select-next.test.mjs`

- [ ] Placeholder values (`—`, `none`, `n/a`, `tbd`, empty) do not hold a row.
- [ ] An `accepted` or `cancelled` document carrying the field reports its status cause, not the hold.
- [ ] A held row that also has an unaccepted dependency reports the hold.
- [ ] Every row held → `stop` / `roadmap-complete`, detail names each held row.
- [ ] A loader without `readExternalBlock` selects exactly as before (the existing suite passes untouched).
- [ ] `--batch` output is unchanged (the existing 15/SC10 test still passes).

### Phase 4: Docs, rule and migration (Risk: Low)

**Files**: `skills/develop-next/references/roadmap-selection.md`, `docs/standards/task-documents.md`,
`docs/tasks/task-registry.md`, `skills/create-task/SKILL.md`,
`docs/tasks/task.174.ci-docs-only-classifier-template/task.174.ci-docs-only-classifier-template.md`, `CHANGELOG.md`

- [ ] `roadmap-selection.md`: a subsection "External preconditions" under §"Registry fallback frontier";
      amend line 87 to say why this is not a park value.
- [ ] `task-documents.md`: a frontmatter row for `blocked_on_external`.
- [ ] `task-registry.md:24` and `create-task/SKILL.md:265`: write the field as well as the free
      text; drop "the selector cannot see free text".
- [ ] task.174: add `blocked_on_external: "tinker-city task.127 (#982) merged and run on a real PR"`.
- [ ] Run `command node skills/develop-next/scripts/select-next.mjs` on the tree: T174 is not selected.
- [ ] `npm run bundle`, then `npm run ci` with the skills symlinks moved aside.
- [ ] CHANGELOG `[Unreleased]`.

---

## 7. Files Summary

**Core implementation**

1. ✅ `skills/develop-next/scripts/select-next.mjs`: loader, frontier check, rationale, stop detail

**Tests**

2. ✅ `evals/develop-next/unit/select-next.test.mjs`: new registry-frontier tests

**Documentation**

3. ✅ `skills/develop-next/references/roadmap-selection.md`: new subsection; line 87 amended
4. ✅ `docs/standards/task-documents.md`: frontmatter row
5. ✅ `docs/tasks/task-registry.md`: rule at line 24
6. ✅ `skills/create-task/SKILL.md`: § 1.2 rule at line 265
7. ✅ `CHANGELOG.md`: `[Unreleased]`

**Migration**

8. ✅ `docs/tasks/task.174.ci-docs-only-classifier-template/task.174.ci-docs-only-classifier-template.md`: frontmatter field

The rule's restatements were measured, not recalled:
`grep -rn "selector cannot see free text\|selector does not parse free text" skills shared docs --include=*.md`
returns the two sites above (items 5 and 6). Re-run it in Phase 4 and update every hit.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `registryFrontier` and `selectNext` with an injected loader, the pattern the existing
  `15/SC*` and `deps:` tests use.
- **Command**: `command node --test evals/develop-next/unit/select-next.test.mjs`
- **Target**: every outcome in § 9 Functional has a test; each new test is seen red before Phase 2.

### Control case

The motivating example is T174 itself, so a test keyed on its wording would pass on recognition. The
fixtures use a different repository name, a different condition phrasing and a **bug** row as well as
a task row. A correct instance (a `planned` row with `blocked_on_external: none`) must still be
selected.

### Integration

- Run the real selector on the tree after Phase 4: T174 must appear in `passedOver` with its
  condition and must not be `selected`.
- `--lint` lists T174 held.

### Regression

- The whole `select-next.test.mjs` suite, `evals/develop-batch/protocol/skill-shape.test.mjs`,
  `skills/session-handoff/tests/handoff-verify.test.js`, and `npm run ci` with symlinks aside.

---

## 9. Success Criteria

### Functional

- [ ] A `planned` task with a non-empty `blocked_on_external:` and no other blocker is not selected,
      and the next eligible row is (Phase 2's frontier check).
- [ ] The held row's `passedOver` entry has `eligible: false`, `externalBlock: <value>` and a reason
      naming the value and the document path.
- [ ] `—`, `none`, `n/a`, `tbd` and an empty value do not hold a row.
- [ ] An `accepted` or `cancelled` document with the field reports its status cause, not the hold
      (the floor runs first, Phase 2).
- [ ] When every candidate is held, `selectNext` returns `stop` / `roadmap-complete` and the detail
      names each held row and its condition.
- [ ] On the real tree after Phase 4, the selector does not select T174.

### Performance

- [ ] Each candidate document is read at most once per run for both status and the field.
- [ ] No measurable change to the existing suite's runtime (report before/after wall time).

### Code Quality

- [ ] `node:test` + `node:assert` only; Prettier clean.
- [ ] Each new behaviour is mutation-proven: remove the check and a named test goes red.
- [ ] `npm run bundle:check` clean; `npm run ci` green with `.agents/skills` and `.claude/skills` moved aside.

### Migration

- [ ] task.174 carries the field, and its Phase 0 HALT is unchanged.
- [ ] Both rule restatements say to write the field; the grep in § 7 returns no "cannot see free text" hit.
- [ ] `roadmap-selection.md` explains why the field is not a park value.
- [ ] CHANGELOG `[Unreleased]` records the change.

---

## 10. Risk Assessment

### HIGH RISK

None identified.

### MEDIUM RISK

1. **A forgotten field hides a ready task**
   - Risk: the other repository's blocker lands, nobody clears the field, and the task stays out of
     the frontier.
   - Probability: Medium. Impact: Medium (work delayed, not lost).
   - Mitigation: the held row and its condition appear in every selected rationale and every
     `roadmap-complete` detail, so the field is read on every run.
   - Rollback: delete the field from the document.

2. **Check order changes a reported cause**
   - Risk: placing the check before the floor would report a cancelled task as "held".
   - Probability: Low. Impact: Low.
   - Mitigation: the `accepted`/`cancelled` criterion pins the order.

### LOW RISK

1. **Rationale wording change**: nothing parses it. The handoff-verify test reads `stopReason`, not
   the detail. Mitigation: run that test.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the selector selects nothing it selected before (other than held rows), or throws on
  a document without the field.
- **Steps**: revert the merge commit on `develop`; the field in task.174 is inert without the reader.
- **Validation**: `command node --test evals/develop-next/unit/select-next.test.mjs` green; the
  selector on the tree returns the pre-change selection.

### Partial Rollback

- **When**: the rationale or detail wording misleads, but the hold is right.
- **Steps**: revert the Phase 2 rationale and detail edits only.

### Forward Fix

- **When**: an edge spelling of the field is misread (for example a quoted placeholder).
- **Approach**: add the spelling to the test set and fix the reader.

### Rollback Triggers

- **Critical**: a row with no `blocked_on_external:` is passed over.
- **Non-critical**: wording, counts.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                               | Author      |
| ---------- | ------- | ----------------------------------------- | ----------- |
| 2026-10-26 | 1.0     | Initial draft — cut from observation #103 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Failing tests first
- [ ] Held-row test and `passedOver` assertions written and seen red

### Phase 2: Read and honour the field
- [ ] Loader, frontier check, rationale, stop detail

### Phase 3: Control and edge cases
- [ ] Placeholders, floor order, dependency overlap, all-held stop, no-loader parity, batch parity

### Phase 4: Docs, rule and migration
- [ ] Reference, standard, both rule sites, task.174, CHANGELOG, bundle, CI

---

## References

- Observation #103 — select-next registry fallback selects an item blocked on another repository
- `skills/develop-next/references/roadmap-selection.md` §"Registry fallback frontier"
- [task.71](../task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md): the no-park-value decision this task must reconcile with
- [task.174](../task.174.ci-docs-only-classifier-template/task.174.ci-docs-only-classifier-template.md): the live instance

---

## Notes

### Important Reminders

- Reuse `frontmatterScalar` and `DEP_EMPTY_RE`; do not add a second frontmatter reader.
- The rule's two restatements are found by the grep in § 7, not by memory.

### Known Issues

**Open** (Non-blocking):

- ⚠️ Observation #103's `siblings_checked` claims `/develop-batch` inherits the gap. It does not
  (`select-next.mjs:2114`). The observation engine has no edit command for that field, so the
  correction lives here.

### Future Improvements

- `develop-task` Phase 0c could refuse a document carrying `blocked_on_external:` on a direct
  invocation, which would replace each task's hand-written Phase 0 check.

---

**Status:** Planned

**Next Steps**:

1. `/develop-task docs/tasks/task.235.select-next-external-precondition/task.235.select-next-external-precondition.md`
2. QA will create:
   - QA Report: `task.235.qa.[number].select-next-external-precondition.md`
   - Bug Reports (if needed): `task.235.bug.[N].[name].md`
   - Quality Gate: `task.235.gate.[number].select-next-external-precondition.yml`
