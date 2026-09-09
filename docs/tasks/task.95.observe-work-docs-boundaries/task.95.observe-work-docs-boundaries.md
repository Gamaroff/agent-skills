---
id: task.95
title: "observe-work: config schema, skill boundaries and the meta-skill family"
type: task
description: "Document the observations: config block, add reciprocal boundary notes to the three neighbouring meta-skills, and declare the meta-skill family so observe-work's sibling check has a registry from day one."
tags: [observe-work, documentation, configuration, skill-boundaries]
category: documentation
status: ready-for-review
priority: High
created: 2026-09-07
updated: 2026-09-09
assignee:
estimated_effort_hours: 4
github_issue: 341
---

# Technical Task: observe-work — config schema, skill boundaries and the meta-skill family

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.95.review.1.observe-work-docs-boundaries.md` implemented 2026-09-09
**GitHub Issue**: [#341](https://github.com/Gamaroff/agent-skills/issues/341)

---

## 1. Overview

Close the documentation gaps that tasks 93 and 94 deliberately left open: the `observations:` block that `resolve-observation-workspace.sh` reads has no schema entry, the three neighbouring meta-skills say nothing about where `observe-work` starts and they stop, and the skill-families registry that `observe-work`'s sibling check depends on is created empty and never seeded.

This is the task that makes four overlapping skills legible as a set rather than a coin toss at invocation time.

**Scope**: `docs/reference/configuration.md`, body-only notes in three existing `SKILL.md` files, a seeded `skill-families.md` template, and the README skill count.

**Key deliverables**:

1. The `observations:` block documented in the config schema and its key reference.
2. Reciprocal boundary notes in `autoskill`, `remember-insight` and `double-check`.
3. A `skill-families.md` template shipped with `observe-work`, seeded with the meta-skill family.

**Expected outcome**: a user reading any one of the four skills can tell which of them they want, and the resolver's config key has a documented schema.

---

## 2. Motivation

### Current Problems

1. **The `observations:` key is read but not documented.** Task 93's resolver consults `skills-config.yaml` → `observations.workspace` as its highest-precedence source. `docs/reference/configuration.md` is the canonical schema and says nothing about it, so the only way to learn the key exists is to read the shell script.
2. **The overlap is stated in one direction only.** Task 94 puts a Related-skills table in `observe-work`. A user who opens `autoskill` — the closest neighbour, and the one most likely to be reached for — sees nothing telling them a continuous-capture alternative exists. One-way disambiguation disambiguates for the person who already found the right skill.
3. **`observe-work`'s sibling check has an empty registry and no template.** The skill requires a `siblings_checked:` verdict on every observation, and `observation-log-contract.md` is where the target is resolved against `skill-observations/skill-families.md` — `SKILL.md` itself never names the file. `init` *does* create the registry, seeded with a bare four-column header, so the state to fix is an **empty** registry rather than an absent one. With nothing in it and no template to seed it from, every early observation falls through to the empty-registry fallback, and the field's value — making the *absence* of a judgement visible — is weakened at exactly the moment the log is being established.
4. **Four skills in the same conceptual space with no map.** `autoskill`, `remember-insight`, `double-check` and `observe-work` all involve the agent reflecting on its own work. Without a stated boundary, activation between them is decided by description-match luck.
5. **The README skill count is stale and hand-maintained.** The badge (`README.md:5`) and the prose (`README.md:7`) both read **115**; `ls -d skills/*/ | wc -l` returns **126**. It is wrong by **eleven**, not by the two that tasks 93–95 add — it had already drifted before this work started.

### Benefits

1. **The config key becomes discoverable** where every other key already is, in the one file the schema lives in.
2. **Disambiguation works from whichever skill the user opens first**, which is the only version of disambiguation that helps.
3. **The family registry exists before the log fills up**, so `siblings_checked:` carries a real verdict from the first observation rather than a fallback.
4. **The template explains the two coherence models**, which is what decides what "fixing drift" even means — edit every member, or edit a core and check the pointers. It is guidance for the human writing an entry, not a parsed field; without it a drift finding has no defined remedy.
5. **No catalog regeneration cascade.** Boundary notes go in the bodies only; `description:` fields are untouched, so the generated catalog does not move.

---

## 3. Technical Background

### Current Architecture

After tasks 93 and 94:

- `shared/resources/resolve-observation-workspace.sh` reads `observations.workspace` from `skills-config.yaml`. Undocumented.
- `skills/observe-work/SKILL.md` carries a Related-skills table naming `autoskill`, `remember-insight`, `double-check` and `loop-supervisor`. None of those four names `observe-work`.
- `skills/observe-work/` ships no `skill-families.md` template, though the skill's rules depend on one. `init` creates the live file with a bare four-column header and nothing else.
- `docs/reference/configuration.md` documents every other consumer-facing key, in a "Full schema" block followed by a "Key reference" section.

The four skills, precisely:

| Skill | Input | Output | Trigger | Durable artefact |
|---|---|---|---|---|
| `observe-work` | the session, continuously | observation files | passive + `/observe-work` | the observation log |
| `autoskill` | the session, on demand | proposed edits to active skills | "learn from this session" | none — edits are presented |
| `remember-insight` | an insight the user states | a memory file | explicit | project memory dir |
| `double-check` | the artifact just produced | a Verification Audit Report | explicit, once per cycle | none |

They are genuinely different. The problem is that nothing says so from three of the four sides.

### Target Architecture

```
docs/reference/configuration.md
  ├── Full schema             ← gains the observations: block
  └── Key reference           ← gains one row: observations.workspace
  └── Environment variables   ← gains OBS_STALE_DAYS (default 14)
  └── (new) ## Observation workspace   ← the prose section, in the shape of the existing per-topic sections

skills/autoskill/SKILL.md           ← body-only "Related skills" note
skills/remember-insight/SKILL.md    ← body-only "Related skills" note
skills/double-check/SKILL.md        ← body-only "Related skills" note

skills/observe-work/assets/skill-families.template.md   ← seeded with the meta-skill family
```

**Config block to document:**

```yaml
observations:
  workspace: ~/.agents/skill-observations    # absolute or ~-relative; highest-precedence source
```

**One key, because one key is what anything reads.** `resolve-observation-workspace.sh` consults
`observations.workspace` and nothing else (line 145). There is no `observations.enabled` and no
`observations.review_interval_days` anywhere in the shipped tree — documenting either would ship a
knob that silently does nothing, which is the same silent-ignore failure §10 Risk 2 already names.

**The review-staleness threshold is an environment variable, not a config key.**
`observe-work-session-start.sh:111` reads `OBS_STALE_DAYS`, **defaulting to 14**. It belongs in
`configuration.md`'s existing `## Environment variables` section alongside the other env knobs, not
in the `observations:` block.

**Family entry to seed**, in the format the engine actually parses — a four-column pipe table:

```markdown
# Skill families

| Family | Members | Shared | Member-specific |
|---|---|---|---|
| meta-skills | observe-work, autoskill, remember-insight, double-check | {SHARED_LITERAL} | trigger; durable artefact; unit observed |
```

**The format is not a style choice.** `parseFamilies()` (`shared/resources/observation-log.js:907`)
skips every line that does not start with `|` and every row with fewer than four cells. A
headings-and-bold-lines registry parses to zero families, so the seeded entry would be invisible to
`families --audit` — the only consumer it exists for. `init` seeds exactly this header
(`observation-log.js:494-497`); the template's job is to fill it, not to replace it.

**There is no `Coherence model` field.** It appears in task 93's *plan* and was dropped from task
93's *implementation*: the parser returns `{ name, members, shared, memberSpecific }`. The two
coherence models stay in the template as **prose guidance for the human writing an entry** — they
are genuinely useful there — but nothing parses them and no test asserts them.

**`{SHARED_LITERAL}` must be a literal substring of all four members.** `families --audit` matches
with `body.includes(rule)` (`observation-log.js:981`). Seeding prose sentences that appear verbatim
in no `SKILL.md` produces a clean-looking table and 8 `rule-absent` gaps on the very first audit —
verified by execution, not inferred. Pick a short sentence, write that exact sentence into each of
the three boundary notes in Phase 2, and let the audit prove it.

### Important Clarifications

- **Body-only edits.** `description:` fields must not change. The catalog generator reads descriptions and is CI drift-checked; touching one forces a regeneration that has nothing to do with this task.
- **`skill-families.md` ships as an asset, not a live file.** The live registry belongs in the user's workspace, seeded from the template on first use. The template *is* a shipped opinion — one seeded family, in a library that has one obvious family — and the guard against that is not shipping it empty but shipping it **provably correct**: the zero-gap audit test in Phase 3 is what earns it a place in the adopter's workspace. An empty template guards nothing and helps nobody.
- **The coherence model is guidance, not a field.** `synced-duplicates` means fixing drift is editing every member; `shared-core` means editing the core and checking the pointers. Knowing which one applies is what tells a human what "fix the drift" means — so the template explains both. It is **not** parsed, **not** a column, and **not** asserted by any test.
- **Absence is not always drift.** The `Member-specific` column is what stops the family audit generating noise instead of signal — but only because the audit checks each `Shared` rule against it before calling an absence drift. That suppression is a substring test, so both columns must hold literal strings, not paraphrase.

---

## 4. Scope

### In Scope

✅ **Config schema**: the `observations:` block in the Full schema listing, rows in the Key reference, and a short prose section explaining the resolver order and why the workspace must not be derived from the cwd.
✅ **Boundary notes**: a short "Related skills" note in the body of `autoskill`, `remember-insight` and `double-check`, each naming `observe-work` and the one distinction that matters for that pair.
✅ **Family template**: `skills/observe-work/assets/skill-families.template.md`, seeded with the meta-skills family, referenced from `observe-work`'s Session Start Protocol.
✅ **README**: correct the hand-maintained skill count and add `observe-work` to the featured list if it belongs there.
✅ **CHANGELOG**.

### Out of Scope

❌ **The engine, resolver or contract** — task 93.
❌ **`observe-work` itself** — task 94. This task adds nothing to its `SKILL.md` except the pointer to the family template.
❌ **Changing any skill's `description:`** — deliberately excluded to avoid a catalog cascade.
❌ **Retiring or merging `autoskill`.** The chosen direction is coexistence with documented boundaries. Consolidation, if it is ever right, needs evidence from real use and a harvest-before-retire pass of its own.
❌ **Wiring observation flush points into `develop-story` / `develop-task` / `finalise`.** Deliberately deferred until there is evidence from real use.
❌ **Adding `observe-work` to `minimal` or `pipeline` install profiles.** `full` is `*`, so it is already reachable.

---

## 5. Breaking Changes

**None — API stable.** Every change is additive documentation.

The one thing worth naming as a non-change: `observations.workspace` is optional and its absence already resolves to the project-identity default, so an existing `skills-config.yaml` with no `observations:` block behaves identically before and after this task. Documenting a key does not activate it — `observe-work` still has to be invoked, and activation is a separate problem the skill's own `environments.md` owns.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.95.plan.observe-work-docs-boundaries.md](task.95.plan.observe-work-docs-boundaries.md)

### Phase 1: Config schema

**Risk Level**: Low

**Files**:
- `docs/reference/configuration.md`

**Changes**:
- [x] Add the `observations:` block to the Full schema listing — **`workspace` only** — with inline comments in the file's established style
- [x] Add one Key reference row: `observations.workspace`
- [x] Add `OBS_STALE_DAYS` (default **14**) to the existing `## Environment variables` section — this, not a config key, is the review-staleness knob `observe-work-session-start.sh` reads
- [x] Do **not** document `observations.enabled` or `observations.review_interval_days`: nothing in the tree reads either, and a documented key with no reader is the silent-ignore failure Risk 2 names
- [x] Add a short `## Observation workspace` prose section: the three-source resolver order, the ephemeral-anchor refusal, and why the workspace must never be derived from the cwd
- [x] State the scope rule: skills installed at user scope are observed from every project, so their log is one user-scope path — a per-project anchor is right only for skills that exist in one project

**Dependencies**: task 93 merged (the resolver defines the precedence being documented)

---

### Phase 2: Boundary notes

**Risk Level**: Low

**Files**:
- `skills/autoskill/SKILL.md`
- `skills/remember-insight/SKILL.md`
- `skills/double-check/SKILL.md`

**Changes**:
- [x] `autoskill`: note that `observe-work` captures continuously into a durable log, while `autoskill` is the explicit on-demand pass that proposes edits now — and that they are complements, not alternatives
- [x] `remember-insight`: note that it persists an insight the **user states** to project memory, while `observe-work` notices signals unprompted and writes them to the observation log, targeting skills rather than memory
- [x] `double-check`: note that it audits the artifact just produced, while `observe-work` observes the behaviour that produced it — and that a `double-check` finding is often worth logging as an observation
- [x] Write the family's shared sentence **verbatim** into all three notes — Phase 3's audit greps for it as a literal substring, so the wording is a contract, not prose
- [x] Body-only in all three: **do not touch any `description:` field**
- [x] Confirm `npm run generate-catalog` produces no diff afterwards — the proof that no description moved

**Dependencies**: task 94 merged (the skill must exist to be pointed at)

---

### Phase 3: Family template

**Risk Level**: Low

**Files**:
- `skills/observe-work/assets/skill-families.template.md`
- `skills/observe-work/SKILL.md` (pointer only)
- `skills/observe-work/tests/observe-work.test.js`

**Changes**:
- [x] Write the template as a **four-column pipe table** (`Family | Members | Shared | Member-specific`) — the only shape `parseFamilies()` reads
- [x] Seed the meta-skills entry, with a `Shared` value that is a literal substring of all four members (the sentence written in Phase 2)
- [x] Explain both coherence models and what fixing drift means under each — as **prose guidance in the preamble**, not as a column and not as a parsed field
- [x] Explain the `Member-specific` column as the thing that stops the audit generating noise, and that its suppression is a substring test so it too must hold literal strings
- [x] Add one line to `observe-work`'s Session Start Protocol: when `skill-families.md` exists but holds **no family rows**, seed it from `assets/skill-families.template.md` — `init` always creates the file, so "missing" is never the state you find
- [x] Extend the `observe-work` suite: the template exists, parses into the engine's actual shape (`name`, `members`, `shared`, `memberSpecific`), every member it names is a real skill directory, **and `families --audit` against the repo returns zero gaps**

**Dependencies**: Phase 2 — and not merely on its completion: the seeded `Shared` value must be the exact sentence Phase 2 wrote into the three boundary notes

---

### Phase 4: README and changelog

**Risk Level**: Low

**Files**:
- `README.md`
- `CHANGELOG.md`

**Changes**:
- [x] Correct the hand-maintained skill count and badge — 115 → the live `ls -d skills/*/ | wc -l`, currently **126**, not 115+2
- [x] Add `observe-work` to the featured list if it belongs there
- [x] `CHANGELOG.md` entry covering tasks 93–95 as one capability
- [x] `npm run format`, `npm test`

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Modify (Documentation)

1. ✅ `docs/reference/configuration.md` — `observations:` schema block, key reference rows, prose section
2. ✅ `skills/autoskill/SKILL.md` — body-only Related-skills note
3. ✅ `skills/remember-insight/SKILL.md` — body-only Related-skills note
4. ✅ `skills/double-check/SKILL.md` — body-only Related-skills note
5. ✅ `README.md` — skill count, badge, featured list
6. ✅ `CHANGELOG.md` — the observe-work capability entry

### Files to Create (Assets)

7. ✅ `skills/observe-work/assets/skill-families.template.md` — seeded family registry template

### Files to Modify (Core Implementation)

8. ✅ `skills/observe-work/SKILL.md` — one pointer line to the template
9. ✅ `skills/observe-work/tests/observe-work.test.js` — family-template assertions + resolver contract tests
10. ✅ `skills/observe-work/tests/observe-work-hook.test.js` — `OBS_STALE_DAYS` contract tests (default 14, asserted by driving the hook)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the family template and the pointer to it.

**Actions**:
- [x] `skill-families.template.md` exists and is referenced from `SKILL.md`
- [x] It parses through the engine into `{ name, members, shared, memberSpecific }` — the shape `parseFamilies()` actually returns
- [x] Every member it names resolves to a real directory under `skills/` (tolerating ENOENT inside a packaged skill, as the existing per-skill suites do)
- [x] **`families --audit` against this repository returns zero gaps** — the assertion that catches a seeded `Shared` value no member literally contains

**Command**: `npm test`

---

### Integration Tests

**Scope**: the repo-level suites that catch documentation drift.

**Actions**:
- [x] `tests/skill-frontmatter.test.js` — catalog still in sync, which is the proof no `description:` moved
- [x] `tests/skill-doc-coverage.test.js` — the three edited skills are still documented
- [x] Bundle-freshness check — three `SKILL.md` files were edited, so the pre-commit hook re-bundles; the second run must produce no diff

---

### Contract Tests

**Scope**: the documented config keys match what the resolver actually reads.

**Actions**:
- [x] `observations.workspace` — the one key documented under `observations:` — is consulted by `resolve-observation-workspace.sh`, and no key is documented that is not
- [x] `OBS_STALE_DAYS` is documented with the default the hook actually applies (14), asserted by driving the hook rather than by reading it
- [x] The documented precedence order matches the resolver's implemented order — assert against the script's behaviour, not against a comment in it

---

### Performance Tests

Not applicable — documentation only. No runtime path changes.

---

### Consumer Tests

**Scope**: the three edited skills must still work.

**Actions**:
- [x] `quick_validate.py` passes on `autoskill`, `remember-insight`, `double-check`
- [x] `double-check`'s own suite, if it has one, still passes
- [x] No edited skill's body grew past the point where its own structure tests fail

---

## 9. Success Criteria

### Functional

- [x] `observations.workspace` documented in both the Full schema block and the Key reference section — and no key documented that nothing reads
- [x] `OBS_STALE_DAYS` documented in the Environment variables section with its real default of 14
- [x] The documented resolver precedence matches the resolver's actual behaviour, asserted rather than assumed
- [x] All three neighbouring skills carry a boundary note naming `observe-work`, each containing the family's shared sentence verbatim
- [x] `skill-families.template.md` ships as a four-column pipe table and is pointed at from the Session Start Protocol
- [x] Every member named in the template resolves to a real skill directory
- [x] `families --audit` returns zero gaps against the seeded family

### Performance

- [x] No runtime path changed; no measurable effect. Stated explicitly rather than left implied

### Code Quality

- [x] `npm run generate-catalog` produces **no diff** — the proof no `description:` field was touched
- [x] `npm run bundle` produces a clean diff on a second run
- [x] `npm test` passes
- [x] `npm run format` clean
- [x] `quick_validate.py` passes on all four affected skills

### Migration

- [x] `CHANGELOG.md` covers tasks 93–95 as one capability, not three unrelated entries
- [x] README skill count and badge correct
- [x] No existing `skills-config.yaml` needs editing — key absence and `enabled: true` behave identically

---

## 10. Risk Assessment

### High Risk Areas

None. Documentation only, no runtime path touched, and the one mechanical hazard (catalog cascade) has a direct check.

### Medium Risk Areas

**1. A `description:` field gets edited and triggers a catalog cascade**

- **Risk**: three `SKILL.md` files are being edited. Touching a `description:` — even to tidy wording — moves the generated catalog, and the drift check then fails on a file this task had no reason to change.
- **Probability**: Medium. The description sits directly above the body being edited.
- **Impact**: Minor to Major — CI failure at best, an unreviewed catalog change slipping through at worst.
- **Mitigation**: `npm run generate-catalog` producing no diff is a Success Criterion, not an afterthought. It is a one-command check that proves the constraint directly.
- **Rollback**: restore the description and regenerate.

**2. The documented precedence and the implemented precedence diverge**

- **Risk**: the schema documents config → env → default while the resolver implements something else, or the resolver changes later and the docs do not. **The same failure one step wider — documenting a key that no code reads at all — is the one that actually bit this task in review**: `observations.enabled` and `observations.review_interval_days` were both specified for documentation and neither exists in the tree.
- **Probability**: Medium over time; low within this task.
- **Impact**: Major — a user pins a workspace that is silently ignored, and the symptom is an empty, clean-looking backlog.
- **Mitigation**: a contract test asserting the order against the resolver's **behaviour**, not against a comment inside it — *and* asserting that every documented key has a reader at all. This repo has been explicit that grepping source text proves the string exists, not that it works.
- **Rollback**: correct whichever side is wrong.

### Low Risk Areas

**1. The seeded family is wrong**

- **Risk**: the meta-skills family names the wrong coherence model or a wrong `Shared` column, and early audits generate noise.
- **Probability**: Low.
- **Impact**: Minor. It ships as a template the adopter edits; a wrong entry is pruned by the first review like any other rule.

**2. The README count drifts again**

- **Risk**: it is hand-maintained and nothing checks it.
- **Probability**: High that it drifts again eventually; Low that it matters.
- **Impact**: Minor, cosmetic.
- **Mitigation**: out of scope to automate here, but worth noting as a candidate follow-up.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The catalog drift check fails and the cause is not an accidental description edit
- A boundary note pushes an edited skill past a structural assertion in its own suite

**Steps**:
1. `git revert` the commit
2. `npm run generate-catalog && npm run bundle`
3. `npm test`

**Verification**: clean diff on all generated files; all four skills validate.

---

### Partial Rollback (1–2 hours)

**When to Use**: one of the three boundary notes is wrong or unwanted; they are independent.

**Steps**:
1. Revert that one `SKILL.md`
2. Re-run `quick_validate.py` on it and `npm test`

---

### Forward Fix (< 4 hours)

**When to Use**: everything else — wording, a wrong key default, a family entry that needs adjusting. There is no data to migrate and no runtime behaviour to restore.

**Approach**: fix forward.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- Catalog or bundle drift that regeneration does not resolve

**Non-Critical (Forward Fix)**:
- Wording in any boundary note
- The seeded family's `Shared` / `Member-specific` split
- README count

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |
| 2026-09-09 | 1.1     | Review: 4 Critical, 5 Important — two config keys nothing reads, a template format the parser cannot read, an invented `Coherence model` field, a seeded family failing its own audit (8 gaps, reproduced). All fixed in-document; no engine change | review-task |
| 2026-09-09 |         | Status → ready-for-development | review-task |
| 2026-09-09 |         | Implemented — 10 files, 8 tests added (4 family-template, 3 resolver contract, 2 OBS_STALE_DAYS; all mutation-proven) | develop |

---

## Progress Tracking

### Phase 1: Config schema
- [x] `observations:` block in the Full schema — `workspace` only
- [x] Key reference row for `observations.workspace`
- [x] `OBS_STALE_DAYS` (default 14) in the Environment variables section
- [x] `## Observation workspace` prose section
- [x] Scope rule stated

### Phase 2: Boundary notes
- [x] `autoskill`
- [x] `remember-insight`
- [x] `double-check`
- [x] Shared sentence written verbatim into all three
- [x] No `description:` touched
- [x] Catalog regen produces no diff

### Phase 3: Family template
- [x] Template written as a four-column pipe table and seeded
- [x] Coherence models explained as prose guidance, not as a field
- [x] `Member-specific` column explained
- [x] Session Start Protocol pointer (seed an empty registry, not a missing one)
- [x] Test assertions, including zero-gap `families --audit`

### Phase 4: README and changelog
- [x] Skill count and badge
- [x] Featured list
- [x] `CHANGELOG.md`
- [x] Format and test

---

## References

- **Upstream methodology**: [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) — CC BY 4.0, Eoghan Henn / rebelytics.com
- **Depends on**: task 93 (resolver defines the precedence), task 94 (the skill must exist to be pointed at)
- **Config schema**: `docs/reference/configuration.md`
- **Skills edited**: `skills/autoskill/`, `skills/remember-insight/`, `skills/double-check/`
- **Source plan**: [task.95.plan.observe-work-docs-boundaries.md](task.95.plan.observe-work-docs-boundaries.md)

---

## Notes

### Important Reminders

- **Do not touch any `description:` field.** Body-only edits. `npm run generate-catalog` producing no diff is how you prove it.
- **Three `SKILL.md` edits fire the pre-commit bundler.** Let it run and commit what it stages; do not hand-edit anything it generates.
- **Assert the resolver's behaviour, not its comments.** A documented precedence that matches a comment but not the code is the failure this task exists partly to prevent.
- **The family template ships as an asset, not as live state.** The adopter's registry belongs in their workspace, seeded from the template on first use.
- **The registry format is the engine's, not yours.** Four-column pipe table. `parseFamilies()` skips anything else, silently, and a template it cannot read looks exactly like a template with nothing in it.
- **`Shared` and `Member-specific` hold literal substrings, not paraphrase.** The audit is `body.includes(rule)`. A seeded family whose rules read well and match nothing produces 8 gaps on first run and teaches the adopter to ignore the check.

### Implementation Notes (added by `/develop`, 2026-09-09)

- **One Success Criterion carries stale wording and was ticked on its substance.** The Migration
  criterion reads "key absence and `enabled: true` behave identically". `observations.enabled` was
  removed during review 1 precisely because nothing reads it, so the criterion names a key that does
  not exist. The substance is satisfied and asserted: an absent `observations:` block resolves to the
  project-identity default, so no existing `skills-config.yaml` needs editing. The clause about
  `enabled: true` is unsatisfiable as written and is recorded here rather than silently ticked.
- **The shared sentence is written into four members, not three.** Phase 2 names three neighbouring
  skills, but Phase 3's zero-gap audit covers every member the family lists — including
  `observe-work` itself. Its `SKILL.md` therefore also carries the sentence verbatim, in the existing
  "Related skills — what this is not" section. Without it the seeded family reports one gap on its
  first run, which is the exact failure Phase 3 was written to prevent.
- **Contract tests were added beyond the Unit Tests scope.** §8's Contract Tests section asks for the
  resolver precedence and the `OBS_STALE_DAYS` default to be "asserted by driving" rather than read.
  Ad-hoc probes in a session log are not assertions, so three resolver tests and two hook tests were
  committed. All are mutation-proven — the config tier, the env tier, the ephemeral refusal and the
  no-reader check each go red when the behaviour they name is reverted.
- **One of those tests was vacuous when first written and was rewritten.** The `resolveIn` helper
  initially returned a single value, collapsing "the resolver refused" and "the resolver returned an
  empty string" into one signal — so the ephemeral-refusal test passed against a warn-and-continue
  mutant. The helper now returns `{ refused, workspace }` and the refusal test reads the status.
  Logged as observation #16.

### Known Issues

**Open** (Non-blocking):
- ⚠️ The README skill count is hand-maintained and nothing checks it. It had already drifted by eleven before this task started. Corrected here; it will drift again — the follow-up test below is now the second occurrence, not a hypothetical.

### Future Improvements

- A test asserting the README skill count against the number of `skills/*/SKILL.md` files — small, and it closes a recurring drift.
- Reconsider `autoskill` after `observe-work` has real usage. Coexistence is the right call now; if the observation log makes `autoskill`'s on-demand pass redundant in practice, retiring it is a harvest-before-retire task of its own, decided on evidence.
- Wire observation flush points into the develop pipelines once there is evidence about where observations actually cluster.

---

**Status:** Ready for Review

**Next Steps**:
1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.95.qa.[number].observe-work-docs-boundaries.md`
   - Bug Reports (if needed): `task.95.bug.[N].[name].md`
   - Quality Gate: `task.95.gate.[number].observe-work-docs-boundaries.yml` (co-located in task directory)
