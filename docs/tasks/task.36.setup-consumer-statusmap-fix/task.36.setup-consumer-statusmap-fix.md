---
id: task.36
title: "Stop setup-consumer.sh generating a jira.statusMap that disables status syncing"
type: task
description: "Remove the scalar jira.statusMap block the setup wizard writes into every Jira consumer, which narrows the built-in candidate lists to one name each and silently breaks status syncing on any non-vanilla board."
tags: [jira, configuration, setup, regression]
category: refactoring
status: ready-for-review
priority: High
created: 2026-08-03
updated: 2026-08-03
assignee:
estimated_effort_hours: 4
github_issue: 184
---

# Technical Task: Stop `setup-consumer.sh` generating a `jira.statusMap` that disables status syncing

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.36.review.1.setup-consumer-statusmap-fix.md` implemented 2026-08-03

**GitHub Issue:** [#184](https://github.com/Gamaroff/agent-skills/issues/184)

---

## 1. Overview

`scripts/setup-consumer.sh` writes a literal `jira.statusMap` block into the `skills-config.yaml` of
every Jira consumer it configures. Because a `statusMap` override **replaces** the built-in
candidate list rather than seeding it, that generated block pins all seven of its keys to one
vanilla name apiece, discarding the five 4–6-name candidate lists behind them. Any status whose
column a consumer's board words differently — "Waiting for Review", "Selected for Development",
"Resolved" — then stops syncing, silently.

This task deletes the generated block and the mirrored copy in the configuration reference, and
adds a detector so already-affected consumers can find out.

**Scope**: `scripts/setup-consumer.sh`, `docs/reference/configuration.md`, `CHANGELOG.md`, plus one
new test. No runtime code path changes.

---

## 2. Motivation

### Current Problems

1. **The generated config actively disables a working feature.** `setup-consumer.sh:337` emits
   `statusMap: {draft: To Do, planned: To Do, ready-for-development: To Do, in-progress: In
   Progress, ready-for-review: In Review, accepted: Done, cancelled: Cancelled}`. `loadStatusMap`
   (`shared/resources/jira-sync.js:1659-1681`) treats an override as a replacement, so
   `ready-for-review` stops matching "Waiting for Review", "Code Review", "Peer Review" and
   "Review".
2. **The block was correct when written; its meaning changed underneath it.** It landed in
   `088af2b` (2026-06-30), when a map entry *was* one name and one name was all there was.
   Candidate lists arrived in `2e14043` (2026-07-29). The generated text never changed; what it
   means did.
3. **The documentation asserts the opposite of the truth.** `docs/reference/configuration.md:362`
   labels those values "the built-in defaults". They are the *first entry* of each list, and
   writing them narrows matching. `configuration.md:235` says "Most projects need **no**
   `statusMap` at all" — the wizard contradicts the reference.
4. **The failure is silent and non-local.** The sync logs a skip, reports success overall, and the
   card never moves. Nothing connects that symptom to a config file generated weeks earlier.
5. **Affected consumers cannot discover the problem.** There is no check, no warning, and nobody
   reads a changelog for a file a wizard wrote.

### Benefits

1. **New consumers stop being minted broken.** Every day this ships late, the affected population
   grows.
2. **The zero-config path becomes the default path**, matching the documented guidance and the
   built-in candidate lists that were designed to make configuration unnecessary.
3. **Existing consumers get a route out** via a detector that recognises the wizard's fingerprint.
4. **Documentation stops asserting something false**, which is what let the drift survive review.
5. **Pure deletion of generated text** — no code path touched, revertable in one commit, and it
   unblocks nothing else so it cannot be delayed by the larger workflow-file work.

---

## 3. Technical Background

### Current Architecture

`write_skills_config()` in `scripts/setup-consumer.sh` (~L304-363) builds the config from a
heredoc. For `TRACKER=jira` it appends `tracker_block` (L337), a single-quoted `$'...'` string
containing the live `statusMap:` block.

Resolution at runtime, in `shared/resources/jira-sync.js`:

```
mapStatusCandidates(local, statusMap)
  └─ loadStatusMap(repoRoot, docKind)      # L1659-1681
       └─ parseStatusMapBlock(yaml)         # L1571-1648 — hand-rolled indentation scanner
  └─ falls back to DEFAULT_STATUS_MAP       # L1417-1447 — the candidate lists
```

An override **replaces**; there is no merge and no widening. That is deliberate and correct — an
override must be able to narrow. The bug is that the wizard writes an override nobody asked for.

### Target Architecture

No live `statusMap:` block is generated. The Jira `tracker_block` carries commented-out guidance
only, in the same shape as the already-commented `devEstimateField` / `defaultAssignee` lines
directly above it.

### Important Clarifications

- **Do not "fix" the values.** Widening the generated scalars into lists would still write an
  override, would still go stale against future default changes, and would still be a config
  nobody asked for. The correct generated value is *nothing*.
- `documentStatus:` in the forthcoming `tracker-workflow.yaml` (task.37) is the eventual home for
  this mapping. This task must not wait for it — deletion is correct on its own and task.37 does
  not depend on this one.

---

## 4. Scope

### In Scope

✅ **Generator**: remove the live `statusMap:` block from `scripts/setup-consumer.sh`'s Jira
`tracker_block`; replace with commented guidance and a pointer to `--probe-workflow`.
✅ **Documentation**: fix **both** mirrored examples in `docs/reference/configuration.md` — the
worked example at L360-372 (including the false "Values shown are the built-in defaults" claim at
L362) **and** the annotated skeleton at L42-44, which shows `ready-for-review: In Review` and a
singular "status name" comment — **in the same commit**. (The third example at L253-268, under
*Overriding*, is already correct: it shows list form and states the replace semantics.)
✅ **Migration**: a "Migration" subsection under *Jira status mapping* telling affected consumers
what to delete and how to verify.
✅ **Detector**: a suspicious-`statusMap` check — if every key is a scalar equal to `candidates[0]`
of its default list, that is the wizard's fingerprint. Printed by `--probe-workflow`. Requires a new
exported `loadStatusMapOverrides()` so the detector sees the **raw** override block, not
`loadStatusMap`'s merged output.
✅ **Test**: generate a config non-interactively and assert it carries no active `statusMap:` key
for a Jira consumer, then parse that generated file with every reader.
✅ **CHANGELOG**: a `### Fixed` entry in house style.

### Out of Scope

❌ **Changing `loadStatusMap` replace-semantics** — replacement is correct; only the generated
override is wrong.
❌ **Auto-editing existing consumer configs** — this repo never writes into a consumer's config
outside the wizard. Detection plus documented migration only.
❌ **The `tracker-workflow.yaml` file and `documentStatus:`** — task.37.
❌ **The GitHub half of the wizard** — it writes no status config today.

---

## 5. Breaking Changes

**None for existing repos** — no file is rewritten and no runtime behaviour changes.

### Behavioural change for *newly generated* configs

**What changed**: a freshly generated `skills-config.yaml` no longer contains `jira.statusMap`.

**Before**:

```yaml
jira:
  statusMap:
    ready-for-review: In Review
    accepted: Done
```

**After**:

```yaml
jira:
  # statusMap: local document status -> your Jira workflow status names.
  # Most projects need NONE — the built-in candidate lists already cover the
  # common vocabularies. Check with --probe-workflow before adding one.
  # An override REPLACES the candidate list, so prefer a list to a single name.
```

**Impact**: new consumers get candidate-list matching instead of single-name matching — strictly
more boards work. A consumer that genuinely needs an override is told how to check first.

**Migration path for already-affected consumers**: delete the `statusMap:` block, then run
`node .agents/skills/sync-jira-task/scripts/sync-jira-task.js --probe-workflow` and confirm each
local status resolves. Add back only the specific keys the probe shows being skipped, as ordered
lists. Documented in `configuration.md` and surfaced by the detector.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.36.plan.setup-consumer-statusmap-fix.md](task.36.plan.setup-consumer-statusmap-fix.md)

### Phase 1: Remove the generated block

**Risk Level**: Low

**Files**:

- `scripts/setup-consumer.sh`

**Changes**:

- [x] Replace the live `statusMap:` YAML in `tracker_block` (~L337) with commented guidance
- [x] Keep the existing commented `devEstimateField` / `defaultAssignee` lines and match their style
- [x] Verify the emitted YAML still parses via the wizard's own `_read_config_path` and via
      `resolve-platform.sh`'s `read_config_key`

**Dependencies**: none

---

### Phase 2: Fix the documentation that mirrors it

**Risk Level**: Low

**Files**:

- `docs/reference/configuration.md`

**Changes**:

- [x] Replace the `statusMap` block in the worked example (L360-372) with the same commented form
- [x] Delete the false claim at L362 that the values are "the built-in defaults"; state that they
      are the first entry of each candidate list and that writing them **narrows** matching
- [x] Fix the annotated skeleton at L42-44: show the list form
      (`ready-for-review: [Waiting for Review, In Review]`), pluralise the comment to "status
      name(s)", and note that it is usually unnecessary
- [x] Add a **Migration** subsection under *Jira status mapping* with the delete-and-probe recipe
- [x] Cross-link it from the `jira.statusMap` row in the key reference table (L100) — that cell
      already links to `#jira-status-mapping`, so target the Migration subsection's own anchor or
      replace the existing sentence rather than appending a second link to the same target

**Dependencies**: ship in the same commit as Phase 1 — the generator and its mirrored doc drifted
apart last time precisely because they were edited separately

---

### Phase 3: Detector and test

**Risk Level**: Low

**Files**:

- `shared/resources/jira-sync.js`
- `shared/resources/tests/setup-consumer-config.test.mjs` (new)
- `package.json` (only if a new glob is needed — it is not, `shared/resources/tests/*.test.mjs` is
  already globbed)

**Changes**:

- [x] Add `loadStatusMapOverrides(repoRoot)` beside `loadStatusMap`: reads `skills-config.yaml`,
      returns `parseStatusMapBlock(...).base` **unmerged**, `{}` on any failure. Export it.
- [x] Add `detectNarrowingStatusMap(statusMap)` beside it: returns the keys whose scalar value
      equals `DEFAULT_STATUS_MAP[key][0]`, and whether *every* present key matches. Export it.
- [x] Wire into `--probe-workflow` using `loadStatusMapOverrides()` — **not** the merged map that
      `loadStatusMap()` returns, whose ~27 default keys make the whole-map fingerprint unmatchable
- [x] Print the advice from `--probe-workflow` when the whole-map fingerprint hits
- [x] Test: generate a config non-interactively for `TRACKER=jira` into a temp dir and assert the
      emitted file contains no active `statusMap:` key (a commented `# statusMap:` is fine)
- [x] Test: the same generated file parses correctly under every reader listed in §8
- [x] Test: `detectNarrowingStatusMap` recognises the exact block the wizard used to emit, and does
      **not** flag a deliberate list-valued override

**Dependencies**: Phase 1 (the test asserts Phase 1's output)

---

### Phase 4: CHANGELOG

**Risk Level**: Low

**Files**:

- `CHANGELOG.md`

**Changes**:

- [x] `### Fixed` entry under `[Unreleased]`, house style: bold lead clause naming the user-visible
      consequence, then the story — the block was correct on 2026-06-30, candidate lists landed
      2026-07-29 and changed its meaning without changing its text
- [x] Name the detector and the migration recipe

**Dependencies**: Phases 1-3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `scripts/setup-consumer.sh` — remove the live `statusMap` from the Jira `tracker_block`
2. ✅ `shared/resources/jira-sync.js` — add `loadStatusMapOverrides` + `detectNarrowingStatusMap`,
   export both, wire into `--probe-workflow`

### Files to Modify (Tests)

3. ✅ `shared/resources/tests/setup-consumer-config.test.mjs` — **new**; generator output + detector

### Files to Modify (Documentation)

4. ✅ `docs/reference/configuration.md` — worked example (L360-372), annotated skeleton (L42-44),
   the false "built-in defaults" claim (L362), new Migration subsection, key-table cross-link
5. ✅ `CHANGELOG.md` — `### Fixed` entry

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the detector and the generator's output

**Actions**:

- [x] `detectNarrowingStatusMap` flags the exact historical wizard block
- [x] It does **not** flag a list-valued override, nor a scalar that differs from `candidates[0]`
- [x] It does not flag an empty or absent map
- [x] `loadStatusMapOverrides` returns the raw override block, **not** merged with the defaults —
      guard against the wiring mistake that would make the whole-map fingerprint unmatchable
- [x] Generator output for `TRACKER=jira` contains no active `statusMap:` key
- [x] Generator output for `TRACKER=github` is unchanged

**Approach**: the generator assertions run the wizard's config-writing path non-interactively into a
temp directory and assert on the **emitted file**. A grep of `setup-consumer.sh` source is a useful
extra guard but is not sufficient on its own — it produces no file, so it can substantiate neither
these assertions nor the integration checks below.

**Command**: `node --test 'shared/resources/tests/*.test.mjs'`

---

### Integration Tests

**Scope**: the generated file is still consumed correctly by every reader that touches it

**Actions**:

- [x] `resolve-platform.sh`'s `read_config_key` resolves `tracker:` from the new output
- [x] `resolve-paths.sh`'s `read_nested_config_key` resolves `prd.prdShardedLocation`
- [x] `jira-sync.js`'s `parseJiraScalar` resolves a `jira.` scalar past the new comment block —
      commented lines must not confuse the hand-rolled indentation scanner
- [x] `jira-sync.js`'s `parseStatusMapBlock` returns `{}` for the all-comment `jira:` block
- [x] `setup-consumer.sh`'s own `_read_config_path` resolves `prdShardedLocation` from the new output
- [x] `generate-prd-epic-index.mjs`'s `prdRootFromConfig` resolves `prd.prdShardedLocation`
- [x] `setup-consumer.sh` re-run against an existing config still reports `kept (existing)`

> These six cover every hand-rolled reader of `skills-config.yaml` in the repo. The seventh reader,
> `set-github-project-estimate.sh`, shells out to Python `yaml.safe_load` and reads only the
> `github:` block — a real parser on an untouched section, so it needs no coverage here.

**Command**: `npm test`

---

### Contract Tests

**Scope**: no runtime behaviour change

**Actions**:

- [x] `shared/resources/tests/jira-stage.test.mjs` and `jira-stage-fixtures.test.mjs` pass
      **unchanged** — this task must not alter resolution

---

### Performance Tests

Not applicable — no hot path is touched. No baseline needed.

---

### Consumer Tests

**Scope**: a consumer generated by the new wizard syncs statuses against a non-vanilla board

**Actions**:

- [x] Generate a config in a scratch repo, point it at a board using "Waiting for Review", and
      confirm `--probe-workflow` resolves `ready-for-review` (it would have skipped before)

---

## 9. Success Criteria

### Functional

- [x] A freshly generated Jira `skills-config.yaml` contains no active `statusMap:` key
- [x] `--probe-workflow` prints the migration advice when the narrowing fingerprint is present —
      verified against a config actually carrying the historical block, not only in a unit test
- [x] Re-running the wizard over an existing config still reports `kept (existing)` and edits nothing
- [x] `npm test` passes with the existing Jira suites unchanged

### Performance

- [x] No change to any hot path; no new I/O in `loadStatusMap`
- [x] The detector runs only under `--probe-workflow`, never during a normal sync

### Code Quality

- [x] The new test is under an already-globbed directory (`shared/resources/tests/`)
- [x] Detector follows the file's swallow-everything discipline — never throws, returns empty on
      any parse failure
- [x] Generated YAML comment style matches the adjacent `devEstimateField` lines

### Migration

- [x] `CHANGELOG.md` carries the `### Fixed` entry
- [x] `configuration.md` carries the Migration subsection and no longer claims the values are
      built-in defaults; neither of its two `statusMap` examples teaches the narrowing shape
- [ ] The migration recipe is verified by hand against one real affected config

---

## 10. Risk Assessment

### High Risk Areas

None. This task deletes generated text and adds a read-only detector.

### Medium Risk Areas

**1. A consumer was relying on the narrowing**

- **Risk**: a board with two matching columns (e.g. both "In Review" and "Review") depended on the
  scalar to disambiguate. Removing it from *new* configs is fine, but the migration advice tells
  existing consumers to delete their block — which could change where their cards land.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the migration recipe is delete → **probe** → re-add only what the probe shows
  being skipped. The probe is read-only and shows the destination before anything moves. State
  explicitly that a board with two candidate-matching columns should keep an ordered-list override.
- **Rollback**: re-add the block; it is four lines.

**2. Commented YAML confuses a hand-rolled parser**

- **Risk**: six independent hand-rolled parsers read this file, each with its own comment handling.
  `parseJiraScalar` scans direct children of `jira:` by indentation; a commented child could be
  misread.
- **Probability**: Low — both `jira:` scanners skip `#`-leading lines before any indent logic
  (`parseJiraScalar` at `jira-sync.js:1750`, `parseStatusMapBlock`'s `isSkippable` at L1576), and
  the remaining four readers key off blocks that precede `jira:` in the generated file.
- **Impact**: Major (a misparse silently disables a different setting)
- **Mitigation**: the integration tests above exercise all six hand-rolled readers against the
  generated output. The adjacent `devEstimateField` / `defaultAssignee` lines are already commented
  in the same block, so the shape is proven.
- **Rollback**: revert the generator hunk.

### Low Risk Areas

**1. Detector false positives**

- **Risk**: a project deliberately set every status to the vanilla name.
- **Probability**: Low
- **Impact**: Minor — an informational line under `--probe-workflow` only
- **Mitigation**: word it as a question, not a verdict; require *every* key to match before firing.
- **Rollback**: none needed.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- A generated `skills-config.yaml` fails to parse in any of the five readers
- `npm test` regressions in the Jira suites

**Steps**:

1. `git revert` the commit — it is self-contained
2. Re-run `npm test`
3. Regenerate a scratch config and confirm it parses

**Verification**: `npm test` green; a scratch wizard run produces a parseable config.

---

### Partial Rollback (1-2 hours)

**When to Use**: the detector misfires but the generator fix is sound.

**Steps**: revert only the `jira-sync.js` hunk; keep the generator and documentation changes, which
are the load-bearing part.

---

### Forward Fix (< 4 hours)

**When to Use**: documentation wording problems, detector phrasing, missed cross-links. These do
not warrant a revert.

---

### Rollback Triggers

**Critical (Immediate Rollback)**: generated config unparseable; any existing test fails.

**Non-Critical (Forward Fix)**: detector wording, missing cross-reference, changelog phrasing.

---

## Progress Tracking

### Phase 1: Remove the generated block

- [x] `tracker_block` emits commented guidance only
- [x] Emitted YAML verified against all six hand-rolled readers

### Phase 2: Fix the mirrored documentation

- [x] Worked example (L360-372) updated
- [x] Annotated skeleton (L42-44) updated
- [x] False "built-in defaults" claim removed
- [x] Migration subsection added and cross-linked without duplicating the existing L100 link

### Phase 3: Detector and test

- [x] `loadStatusMapOverrides` implemented and exported
- [x] `detectNarrowingStatusMap` implemented and exported
- [x] Wired into `--probe-workflow` against the **raw** override block
- [x] New test suite passing, including the generate-for-real assertions

### Phase 4: CHANGELOG

- [x] `### Fixed` entry written in house style

---

## References

- **Related Skill**: `.agents/skills/sync-jira-task/`, `.agents/skills/sync-jira-story/`
- **Related Documentation**: [`docs/reference/configuration.md`](../../reference/configuration.md)
- **Related Task**: task.37 — `tracker-workflow.yaml` config engine, whose `documentStatus:` block
  is the eventual home for this mapping. **Not a dependency in either direction.**
- **Source commits**: `088af2b` (2026-06-30, block introduced), `2e14043` (2026-07-29, candidate
  lists introduced — the change that altered this block's meaning)

---

## Notes

### Important Reminders

- Ship Phases 1 and 2 **in the same commit**. The generator and its mirrored documentation drifted
  apart before because they were edited separately.
- Do not widen the generated scalars into lists as a "safer fix". The correct generated value is
  nothing at all.
- This task blocks nothing and is blocked by nothing. Ship it first.

### Known Issues

**Open** (non-blocking):

- ⚠️ Six independent hand-rolled YAML readers of `skills-config.yaml` exist in this repo —
  `setup-consumer.sh:_read_config_path`, `resolve-platform.sh:read_config_key`,
  `resolve-paths.sh:read_nested_config_key`, `jira-sync.js:parseStatusMapBlock`,
  `jira-sync.js:parseJiraScalar`, and `generate-prd-epic-index.mjs:prdRootFromConfig` — plus
  `set-github-project-estimate.sh`, which uses Python `yaml.safe_load`. Consolidating them is out of
  scope here; task.37 promotes `parseYamlSubset` and reduces the count by one.
