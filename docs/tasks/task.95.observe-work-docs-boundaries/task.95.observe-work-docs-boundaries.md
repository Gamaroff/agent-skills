---
id: task.95
title: "observe-work: config schema, skill boundaries and the meta-skill family"
type: task
description: "Document the observations: config block, add reciprocal boundary notes to the three neighbouring meta-skills, and declare the meta-skill family so observe-work's sibling check has a registry from day one."
tags: [observe-work, documentation, configuration, skill-boundaries]
category: documentation
status: planned
priority: High
created: 2026-09-07
updated: 2026-09-07
assignee:
estimated_effort_hours: 4
github_issue: 341
---

# Technical Task: observe-work — config schema, skill boundaries and the meta-skill family

**Status:** Planned
**GitHub Issue**: [#341](https://github.com/Gamaroff/agent-skills/issues/341)

---

## 1. Overview

Close the documentation gaps that tasks 93 and 94 deliberately left open: the `observations:` block that `resolve-observation-workspace.sh` reads has no schema entry, the three neighbouring meta-skills say nothing about where `observe-work` starts and they stop, and the skill-families registry that `observe-work`'s sibling check depends on does not exist.

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
3. **`observe-work`'s sibling check has no registry.** The skill requires a `siblings_checked:` verdict on every observation and resolves the target against `skill-observations/skill-families.md`. With no registry and no template, every early observation falls through to the no-registry fallback, and the field's value — making the *absence* of a judgement visible — is weakened at exactly the moment the log is being established.
4. **Four skills in the same conceptual space with no map.** `autoskill`, `remember-insight`, `double-check` and `observe-work` all involve the agent reflecting on its own work. Without a stated boundary, activation between them is decided by description-match luck.
5. **The README skill count is stale and hand-maintained.** It will be wrong by two after task 94.

### Benefits

1. **The config key becomes discoverable** where every other key already is, in the one file the schema lives in.
2. **Disambiguation works from whichever skill the user opens first**, which is the only version of disambiguation that helps.
3. **The family registry exists before the log fills up**, so `siblings_checked:` carries a real verdict from the first observation rather than a fallback.
4. **The family declares its coherence model**, which decides what "fixing drift" even means — edit every member, or edit a core and check the pointers. Without it, a drift finding has no defined remedy.
5. **No catalog regeneration cascade.** Boundary notes go in the bodies only; `description:` fields are untouched, so the generated catalog does not move.

---

## 3. Technical Background

### Current Architecture

After tasks 93 and 94:

- `shared/resources/resolve-observation-workspace.sh` reads `observations.workspace` from `skills-config.yaml`. Undocumented.
- `skills/observe-work/SKILL.md` carries a Related-skills table naming `autoskill`, `remember-insight`, `double-check` and `loop-supervisor`. None of those four names `observe-work`.
- `skills/observe-work/` ships no `skill-families.md` template, though the skill's rules depend on one.
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
  └── Key reference           ← gains rows for observations.{enabled,workspace,review_interval_days}
  └── (new) ## Observation workspace   ← the prose section, in the shape of the existing per-topic sections

skills/autoskill/SKILL.md           ← body-only "Related skills" note
skills/remember-insight/SKILL.md    ← body-only "Related skills" note
skills/double-check/SKILL.md        ← body-only "Related skills" note

skills/observe-work/assets/skill-families.template.md   ← seeded with the meta-skill family
```

**Config block to document:**

```yaml
observations:
  enabled: true                              # default true; false disables observe-work's writes
  workspace: ~/.agents/skill-observations    # absolute or ~-relative; highest-precedence source
  review_interval_days: 7                    # default 7; drives the session-start review offer
```

**Family entry to seed**, in the format `observe-work` expects:

```markdown
## meta-skills
**Members:** observe-work, autoskill, remember-insight, double-check
**Coherence model:** shared-core
**Shared:** the rule that self-observation output is presented for review and never applied silently;
  the "assert behaviour, not source text" standard for any check they recommend.
**Member-specific:** the trigger (passive vs explicit), the durable artefact (log / none / memory dir),
  and the unit observed (session / session / stated insight / artifact).
```

### Important Clarifications

- **Body-only edits.** `description:` fields must not change. The catalog generator reads descriptions and is CI drift-checked; touching one forces a regeneration that has nothing to do with this task.
- **`skill-families.md` ships as an asset, not a live file.** The live registry belongs in the user's workspace, written on first use. Committing a populated registry into the skill would make it a shipped opinion rather than the adopter's own evidence trail — the same reason `starter-principles.md` marks its entries as imported.
- **`coherence model` is load-bearing.** `synced-duplicates` means fixing drift is editing every member; `shared-core` means editing the core and checking the pointers. A family without one produces findings with no defined remedy.
- **Absence is not always drift.** The `Member-specific` column is what stops the family audit generating noise instead of signal.

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

The one thing worth naming as a non-change: `observations.enabled` defaults to `true`, but the key's absence is also `true`, so an existing `skills-config.yaml` with no `observations:` block behaves identically before and after this task. Documenting a key does not activate it — `observe-work` still has to be invoked, and activation is a separate problem the skill's own `environments.md` owns.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.95.plan.observe-work-docs-boundaries.md](task.95.plan.observe-work-docs-boundaries.md)

### Phase 1: Config schema

**Risk Level**: Low

**Files**:
- `docs/reference/configuration.md`

**Changes**:
- [ ] Add the `observations:` block to the Full schema listing, with inline comments in the file's established style
- [ ] Add one Key reference row per key: `observations.enabled`, `observations.workspace`, `observations.review_interval_days`
- [ ] Add a short `## Observation workspace` prose section: the three-source resolver order, the ephemeral-anchor refusal, and why the workspace must never be derived from the cwd
- [ ] State the scope rule: skills installed at user scope are observed from every project, so their log is one user-scope path — a per-project anchor is right only for skills that exist in one project

**Dependencies**: task 93 merged (the resolver defines the precedence being documented)

---

### Phase 2: Boundary notes

**Risk Level**: Low

**Files**:
- `skills/autoskill/SKILL.md`
- `skills/remember-insight/SKILL.md`
- `skills/double-check/SKILL.md`

**Changes**:
- [ ] `autoskill`: note that `observe-work` captures continuously into a durable log, while `autoskill` is the explicit on-demand pass that proposes edits now — and that they are complements, not alternatives
- [ ] `remember-insight`: note that it persists an insight the **user states** to project memory, while `observe-work` notices signals unprompted and writes them to the observation log, targeting skills rather than memory
- [ ] `double-check`: note that it audits the artifact just produced, while `observe-work` observes the behaviour that produced it — and that a `double-check` finding is often worth logging as an observation
- [ ] Body-only in all three: **do not touch any `description:` field**
- [ ] Confirm `npm run generate-catalog` produces no diff afterwards — the proof that no description moved

**Dependencies**: task 94 merged (the skill must exist to be pointed at)

---

### Phase 3: Family template

**Risk Level**: Low

**Files**:
- `skills/observe-work/assets/skill-families.template.md`
- `skills/observe-work/SKILL.md` (pointer only)
- `skills/observe-work/tests/observe-work.test.js`

**Changes**:
- [ ] Write the template: the per-family format, and the seeded meta-skills entry
- [ ] Explain both coherence models and what fixing drift means under each
- [ ] Explain the `Member-specific` column as the thing that stops the audit generating noise
- [ ] Add one line to `observe-work`'s Session Start Protocol: when the workspace has no `skill-families.md`, copy the template rather than starting empty
- [ ] Extend the `observe-work` suite: the template exists, parses into the expected fields, and every member it names is a real skill directory

**Dependencies**: Phase 2

---

### Phase 4: README and changelog

**Risk Level**: Low

**Files**:
- `README.md`
- `CHANGELOG.md`

**Changes**:
- [ ] Correct the hand-maintained skill count and badge
- [ ] Add `observe-work` to the featured list if it belongs there
- [ ] `CHANGELOG.md` entry covering tasks 93–95 as one capability
- [ ] `npm run format`, `npm test`

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
9. ✅ `skills/observe-work/tests/observe-work.test.js` — template assertions

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the family template and the pointer to it.

**Actions**:
- [ ] `skill-families.template.md` exists and is referenced from `SKILL.md`
- [ ] It parses into the expected fields: `Members`, `Coherence model`, `Shared`, `Member-specific`
- [ ] `Coherence model` is one of the two defined values
- [ ] Every member it names resolves to a real directory under `skills/`

**Command**: `npm test`

---

### Integration Tests

**Scope**: the repo-level suites that catch documentation drift.

**Actions**:
- [ ] `tests/skill-frontmatter.test.js` — catalog still in sync, which is the proof no `description:` moved
- [ ] `tests/skill-doc-coverage.test.js` — the three edited skills are still documented
- [ ] Bundle-freshness check — three `SKILL.md` files were edited, so the pre-commit hook re-bundles; the second run must produce no diff

---

### Contract Tests

**Scope**: the documented config keys match what the resolver actually reads.

**Actions**:
- [ ] Every key documented in `configuration.md` under `observations:` is consulted somewhere in `resolve-observation-workspace.sh`
- [ ] The documented precedence order matches the resolver's implemented order — assert against the script's behaviour, not against a comment in it

---

### Performance Tests

Not applicable — documentation only. No runtime path changes.

---

### Consumer Tests

**Scope**: the three edited skills must still work.

**Actions**:
- [ ] `quick_validate.py` passes on `autoskill`, `remember-insight`, `double-check`
- [ ] `double-check`'s own suite, if it has one, still passes
- [ ] No edited skill's body grew past the point where its own structure tests fail

---

## 9. Success Criteria

### Functional

- [ ] `observations:` documented in both the Full schema block and the Key reference section
- [ ] The documented resolver precedence matches the resolver's actual behaviour, asserted rather than assumed
- [ ] All three neighbouring skills carry a boundary note naming `observe-work`
- [ ] `skill-families.template.md` ships and is pointed at from the Session Start Protocol
- [ ] Every member named in the template resolves to a real skill directory

### Performance

- [ ] No runtime path changed; no measurable effect. Stated explicitly rather than left implied

### Code Quality

- [ ] `npm run generate-catalog` produces **no diff** — the proof no `description:` field was touched
- [ ] `npm run bundle` produces a clean diff on a second run
- [ ] `npm test` passes
- [ ] `npm run format` clean
- [ ] `quick_validate.py` passes on all four affected skills

### Migration

- [ ] `CHANGELOG.md` covers tasks 93–95 as one capability, not three unrelated entries
- [ ] README skill count and badge correct
- [ ] No existing `skills-config.yaml` needs editing — key absence and `enabled: true` behave identically

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

- **Risk**: the schema documents config → env → default while the resolver implements something else, or the resolver changes later and the docs do not.
- **Probability**: Medium over time; low within this task.
- **Impact**: Major — a user pins a workspace that is silently ignored, and the symptom is an empty, clean-looking backlog.
- **Mitigation**: a contract test asserting the order against the resolver's **behaviour**, not against a comment inside it. This repo has been explicit that grepping source text proves the string exists, not that it works.
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

---

## Progress Tracking

### Phase 1: Config schema
- [ ] `observations:` block in the Full schema
- [ ] Key reference rows
- [ ] `## Observation workspace` prose section
- [ ] Scope rule stated

### Phase 2: Boundary notes
- [ ] `autoskill`
- [ ] `remember-insight`
- [ ] `double-check`
- [ ] No `description:` touched
- [ ] Catalog regen produces no diff

### Phase 3: Family template
- [ ] Template written and seeded
- [ ] Coherence models explained
- [ ] `Member-specific` column explained
- [ ] Session Start Protocol pointer
- [ ] Test assertions

### Phase 4: README and changelog
- [ ] Skill count and badge
- [ ] Featured list
- [ ] `CHANGELOG.md`
- [ ] Format and test

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
- **The family template ships as an asset, not as live state.** The adopter's registry belongs in their workspace, and its authority comes from their own evidence trail.

### Known Issues

**Open** (Non-blocking):
- ⚠️ The README skill count is hand-maintained and nothing checks it. Corrected here; it will drift again.

### Future Improvements

- A test asserting the README skill count against the number of `skills/*/SKILL.md` files — small, and it closes a recurring drift.
- Reconsider `autoskill` after `observe-work` has real usage. Coexistence is the right call now; if the observation log makes `autoskill`'s on-demand pass redundant in practice, retiring it is a harvest-before-retire task of its own, decided on evidence.
- Wire observation flush points into the develop pipelines once there is evidence about where observations actually cluster.

---

**Status:** Planned

**Next Steps**:
1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.95.qa.[number].observe-work-docs-boundaries.md`
   - Bug Reports (if needed): `task.95.bug.[N].[name].md`
   - Quality Gate: `task.95.gate.[number].observe-work-docs-boundaries.yml` (co-located in task directory)
