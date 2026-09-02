---
id: task.84
title: "Skill install profiles with dependency closure"
type: task
description: "Let a consumer pick an install profile (minimal/pipeline/full) plus per-skill add-ons, resolve the dependency closure so a chosen skill's callees come with it, and persist the choice in skills-config.yaml."
tags: [setup-consumer, install, configuration, context-budget]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-02
updated: 2026-09-02
assignee:
estimated_effort_hours: 8
---

# Technical Task: Skill install profiles with dependency closure

**Status:** Planned

---

## 1. Overview

`setup-consumer.sh` installs all 119 skills. Their `description` fields total 46,408 bytes — roughly **11,602 tokens permanently in the agent's context**, before it reads a single instruction. Most consumers use a fraction of the library.

This task adds a profile choice to the wizard (`minimal` / `pipeline` / `full`), optional per-skill add-ons on top, a dependency-closure pass so choosing `develop-story` also brings the eight skills it invokes, and persistence of the decision in `skills-config.yaml` so `--update` is reproducible.

**Scope**: Profile definitions, the wizard prompt, closure resolution, config persistence, and the `--update` path. Builds on the exclusion filter from [task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md).

**Key deliverables**:

1. Three profile definitions with a declared membership list each.
2. A dependency-closure resolver that expands a selection to its transitive callees and reports what it added.
3. `skills.profile` / `skills.include` / `skills.exclude` in `skills-config.yaml`, read on every `--update`.

**Expected outcome**: A consumer choosing `pipeline` installs roughly 45 skills instead of 119, recovering an estimated ~7k tokens of context budget, with no possibility of a half-installed pipeline.

---

## 2. Motivation

### Current Problems

1. **The metadata tier is the real cost and it is paid on every single request.** 119 descriptions × ~100 words is ~11.6k tokens that never leave context. Disk (25MB) is irrelevant. Task 83 recovers ~1.5k of it; the rest is only reachable by not installing skills the consumer does not use.

2. **A flat per-skill list is a footgun, because the skills form a call graph.** `develop-story` invokes eight others by slash command — `create-branch`, `review-story`, `develop`, `create-pr`, `qa-story`, `qa-fix`, `finalise`, `commit-changes`. `review-story` invokes ten more. Unchecking `create-pr` does not produce an install error; it produces a **Step 4 failure in the middle of a real story**, hours later, with the cause buried in the install. Any selection UI that lets a user break this graph without telling them is worse than no selection at all.

3. **A 119-item checkbox list is not a usable control.** Descriptions average ~390 bytes; the list does not fit on a screen, cannot be read in one pass, and forces 119 decisions to express what is really one decision ("I want the pipeline").

4. **A selection that is not persisted is undone by the next `--update`.** `install_skills()` loops the tarball unconditionally, and `main()` reuses it verbatim on the `--update` path. Without persistence, the first `--update` silently reinstalls everything and the consumer's choice evaporates with no message.

### Benefits

1. **~7k tokens of context budget returned** on a `pipeline` install — the large share of the ~11.6k total, and the reason this task exists rather than task 83 alone.
2. **A broken selection becomes unrepresentable** — closure runs before install, so a chosen skill's callees are always present.
3. **One decision instead of 119** — the profile is the unit people actually think in.
4. **Reproducible installs** — the config is committed, so every developer and CI resolve the same set.
5. **Add-ons keep the long tail reachable** — a team wanting `jira-sprint-retrospective` on a `minimal` install adds one line, without dropping to `full`.

---

## 3. Technical Background

### Current Architecture

After task 83, `install_skills()` filters on one axis only:

```bash
local _tracker; _tracker=$(_resolve_install_tracker)
for _skill_dir in "$_tmpdir"/skills/*/; do
  [[ -f "${_skill_dir}SKILL.md" ]] || continue
  local _name; _name=$(basename "$_skill_dir")
  if _skill_excluded_for_tracker "$_name" "$_tracker"; then ... continue; fi
  # copy
done
```

The wizard's step sequence in `main()`:

```
check_prereqs → select_platform → collect_env_vars → write_env_files
  → write_skills_config → create_registries → scaffold_docs
  → install_skills → write_tracker_workflow → install_hooks → print_summary
```

Two constraints this task inherits:

- **`write_skills_config` runs before `install_skills`.** The profile answer must be collected early enough to be written into the config in the same pass, or the config write needs a second visit.
- **`--update` returns at line 1115, before `select_platform`.** It must resolve the profile from the config file alone — same constraint task 83's resolver solves for `tracker`.

### The dependency graph

Measured on v0.45.0 by extracting `/slash-command` references from each `SKILL.md` where a matching `skills/` directory exists:

| Skill | Invokes |
|---|---|
| `develop-story` | `create-branch`, `review-story`, `develop`, `create-pr`, `qa-story`, `qa-fix`, `finalise`, `commit-changes` |
| `review-story` | `create-branch`, `create-epic`, `create-story`, `create-task`, `develop`, `develop-story`, `develop-task`, `finalise`, `review-task`, `sync-github-story`, `sync-jira-story` |

Highest fan-in (count of other `SKILL.md` files naming them): `create-pr` 25, `finalise` 22, `develop-story` 22, `review-story` 20, `develop-task` 20, `create-story` 19, `qa-fix` 16.

Two properties matter:

- **The graph has cycles.** `develop-story` → `review-story` → `develop-story`. The closure must be a visited-set traversal, not naive recursion.
- **Not every reference is a dependency.** `review-story` names `sync-github-story` *and* `sync-jira-story`; only one can apply. Closure must run the task-83 tracker predicate over its output and drop the inapplicable sibling, or a GitHub consumer's closure drags a Jira skill back in — silently defeating task 83.

### Target Architecture

```
select_platform
   ↓  TRACKER
select_skill_profile          ← new: profile + optional add-ons
   ↓  SKILLS_PROFILE, SKILLS_INCLUDE
write_skills_config           ← writes skills.* block
   ↓
install_skills
   ↓  _resolve_skill_set()
      1. profile membership (or config skills.profile on --update)
      2. + skills.include
      3. − skills.exclude
      4. closure: expand transitively over the call graph
      5. filter: drop anything task 83 excludes for this tracker
      6. report what closure added
```

**Where the graph comes from.** Generated at package time into `shared/resources/skill-dependencies.json`, not computed by grepping at install time. Grepping in bash at install is slow, fragile against prose that merely mentions a skill, and untestable in isolation. A generated manifest is diffable in review and can be regenerated by `npm run generate-catalog`'s sibling.

### Profile definitions

| Profile | Contents | Rough size |
|---|---|---|
| `minimal` | `commit-changes`, `create-branch`, `create-pr`, `create-issue`, `review-code` + closure | ~8 |
| `pipeline` | the story/task/bug lifecycle: `create-*`, `review-*`, `develop*`, `qa-*`, `finalise`, `sync-*`, `ensure-*` + closure | ~45 |
| `full` | everything (today's behaviour) | 119 |

Sizes are estimates to be fixed during Phase 1 once closure is computed; the success criteria assert the *computed* size is reported, not a hardcoded number.

---

## 4. Scope

### In Scope

✅ `shared/resources/skill-profiles.json` — profile membership
✅ `shared/resources/skill-dependencies.json` — generated call graph
✅ A generator script for the graph, wired into an npm script
✅ `select_skill_profile()` — the wizard prompt (profile, then optional add-ons)
✅ `_resolve_skill_set()` — closure + include/exclude + tracker filter
✅ `skills.profile` / `skills.include` / `skills.exclude` in `skills-config.yaml` and in `write_skills_config`
✅ `--update` reading the profile from config
✅ Closure reporting — naming what was added and why
✅ Grandfather: `--update` never prunes an installed skill
✅ Tests and documentation

### Out of Scope

❌ The platform exclusion filter — delivered by task 83, consumed here
❌ A lockfile recording the resolved set (decided against: config is the single source of truth)
❌ An arrow-key TUI — the wizard is run via `bash <(curl …)` and uses numbered `read -r` prompts throughout; a raw-mode TUI is not reliable there
❌ Per-skill download granularity — the tarball stays whole
❌ Pruning existing installs (grandfathered)
❌ Profile selection for `~/.agents/skills/` global installs — project-local only

---

## 5. Breaking Changes

**None for existing installs.** Grandfather is the same guarantee as task 83: `--update` over an existing install never removes a skill.

| | Before | After |
|---|---|---|
| Fresh install, no answer given | 119 | 119 (`full` is the default) |
| Fresh install, `pipeline` chosen | 119 | ~45 |
| `--update`, no `skills:` block in config | 119 | 119 (absent block ≡ `full`) |
| `--update`, `skills.profile: pipeline` | 119 | ~45 installed, **nothing pruned** |

**New config keys are additive and optional.** An absent `skills:` block means `full`, which is exactly today's behaviour. No existing `skills-config.yaml` becomes invalid.

**Migration path**: none required. A consumer wanting the smaller install adds `skills.profile` to their config and re-runs `--update`; the extra skills stay on disk until they delete `.agents/skills/` and re-run. That manual step is deliberate — see task 83 §5 for why pruning is not done on the consumer's behalf.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.84.plan.skill-install-profiles.md](task.84.plan.skill-install-profiles.md)

### Phase 1 — Dependency graph generation (Risk: Low)

**Files**: `scripts/generate-skill-dependencies.mjs`, `shared/resources/skill-dependencies.json`, `package.json`

- [ ] Extract `/slash-command` tokens from each `SKILL.md`, keep those matching a `skills/` directory, drop self-references
- [ ] Emit `{ "skill": ["callee", ...] }`, keys sorted, committed
- [ ] Add `npm run generate-skill-deps`
- [ ] Add a CI check that the committed file matches a fresh generation (same pattern as the catalog check in `release.yml`)

**Dependencies**: none.

### Phase 2 — Profile definitions and closure resolver (Risk: Medium)

**Files**: `shared/resources/skill-profiles.json`, `scripts/setup-consumer.sh`

- [ ] Author the three profiles as explicit membership lists (pre-closure seeds)
- [ ] `_resolve_skill_set()`: seed → +include → −exclude → closure → tracker filter
- [ ] Closure is a visited-set worklist — the graph has cycles (`develop-story` ↔ `review-story`)
- [ ] Run the task-83 tracker predicate **over the closure output**, so an inapplicable sibling pulled in by a dependency is dropped
- [ ] `skills.exclude` is applied to the seed, then re-applied after closure, and a skill removed by `exclude` but required by closure is **reported as a conflict**, not silently re-added
- [ ] Implemented in a Node helper invoked from bash, not in bash — JSON traversal in pure bash is the wrong tool

**Dependencies**: Phase 1, task 83.

### Phase 3 — Wizard prompt (Risk: Low)

**Files**: `scripts/setup-consumer.sh`

- [ ] `select_skill_profile()` — numbered prompt matching `select_platform`'s existing idiom, default `full`
- [ ] Optional add-on prompt: numbered, comma-separated answer, skippable with Enter
- [ ] Call from `main()` after `select_platform`, before `write_skills_config`
- [ ] Print the resolved count and the closure additions before installing

**Dependencies**: Phase 2.

### Phase 4 — Persistence and `--update` (Risk: Medium)

**Files**: `scripts/setup-consumer.sh`, `docs/reference/configuration.md`

- [ ] `write_skills_config` emits the `skills:` block when a non-`full` profile is chosen
- [ ] `_resolve_skill_set` reads profile/include/exclude from config when the wizard has not run
- [ ] Grandfather branch: an installed skill outside the resolved set is kept and reported
- [ ] Document the three keys in `configuration.md` "Full schema" and "Key reference"

**Dependencies**: Phases 2-3.

### Phase 5 — Tests and documentation (Risk: Low)

**Files**: `shared/resources/tests/setup-consumer-skill-profiles.test.mjs`, `package.json`, `docs/concepts/getting-started.md`, `CHANGELOG.md`

- [ ] Closure, cycle, conflict, tracker-interaction and `--update` cases (§8)
- [ ] Register the suite in `package.json` and confirm the count rises
- [ ] Mutation-prove each guarantee
- [ ] Document profiles in `getting-started.md`; CHANGELOG entry

**Dependencies**: Phases 1-4.

---

## 7. Files Summary

**Core Implementation**

1. ✅ `scripts/generate-skill-dependencies.mjs` — new generator
2. ✅ `shared/resources/skill-dependencies.json` — new, generated, committed
3. ✅ `shared/resources/skill-profiles.json` — new, hand-authored
4. ✅ `shared/resources/resolve-skill-set.mjs` — new, closure resolver
5. ✅ `scripts/setup-consumer.sh` — `select_skill_profile`, `_resolve_skill_set` call, config write, grandfather
6. ✅ `package.json` — `generate-skill-deps` script, test glob registration

**Tests**

7. ✅ `shared/resources/tests/setup-consumer-skill-profiles.test.mjs`
8. ✅ `shared/resources/tests/skill-dependencies-drift.test.mjs`

**Documentation**

9. ✅ `docs/reference/configuration.md` — `skills:` keys
10. ✅ `docs/concepts/getting-started.md` — wizard step 8
11. ✅ `CHANGELOG.md`

**Depends on, unchanged**

- `scripts/setup-consumer.sh` `_skill_excluded_for_tracker` — from task 83

---

## 8. Testing Strategy

### Unit Tests — closure resolver

- **Scope**: `resolve-skill-set.mjs` as a pure function over injected graph + profile fixtures, not the real files
- **Cases**:
  - `develop-story` seed → all eight callees present
  - Cycle `develop-story` ↔ `review-story` terminates and does not duplicate
  - Transitive depth ≥ 3 resolves fully
  - `exclude` of a closure-required skill → reported conflict, not silent re-add
  - `include` of a skill outside every profile → present with its own closure
  - Empty seed → empty result, no crash

### Integration Tests — installer

- `pipeline` profile → resolved set installed, `develop-story` and all eight callees present
- `minimal` → `create-pr` present (fan-in 25), `jira-sprint-retrospective` absent
- `full` → 119 minus task-83 exclusions
- `minimal` + `include: [jira-sprint-manager]` under `tracker: jira` → present
- **Tracker interaction**: `pipeline` + `tracker: github` → `sync-jira-story` absent *even though `review-story` names it*. This is the case that catches closure defeating task 83.
- `--update` with `skills.profile: pipeline` in config, no wizard → same set
- `--update` over a full install → nothing pruned, extras reported as kept
- `--dry-run` → writes nothing, reports the counts the real run would produce

### Drift Tests

- Committed `skill-dependencies.json` matches a fresh generation (CI)
- Every skill named in a profile exists in `skills/`
- Every profile's closure is non-empty and self-consistent

### Mutation Proving

Per `shared/resources/mutation-proving.md` — revert each, confirm red:

| Mutation | Must fail |
|---|---|
| Drop the visited-set from closure | cycle test (hangs or overflows) |
| Skip the tracker filter after closure | the `sync-jira-story` interaction test |
| Silently re-add an excluded-but-required skill | the conflict test |
| Read profile from `$SKILLS_PROFILE` before config | the `--update` test |
| Remove the grandfather branch | the no-prune test |

### Performance

Closure over 119 nodes is trivial. The measurable claim is the **context saving**, asserted directly: a test sums `description` bytes for the resolved set and requires `pipeline` to be materially below `full`. Baseline recorded now: 46,408 bytes / ~11,602 tokens for all 119.

---

## 9. Success Criteria

### Functional

- [ ] `minimal`, `pipeline`, `full` each resolve to a set containing every transitive callee of every seed
- [ ] Choosing `develop-story` by any route installs all eight skills it invokes
- [ ] The cyclic pair `develop-story` ↔ `review-story` resolves without hanging or duplicating
- [ ] `pipeline` + `tracker: github` does not install `sync-jira-story`, despite `review-story` naming it
- [ ] `skills.exclude` of a closure-required skill reports a conflict rather than silently re-adding or silently breaking
- [ ] `--update` with no wizard resolves the profile from `skills-config.yaml`
- [ ] `--update` over an existing install prunes nothing
- [ ] Absent `skills:` block behaves exactly as today (119 minus task-83 exclusions)
- [ ] The wizard prints the resolved count and names each closure addition before installing

### Performance

- [ ] `pipeline` resolves to a set whose total `description` bytes are materially below the 46,408-byte baseline, asserted by test against the computed value
- [ ] Closure resolution adds < 1s to the wizard
- [ ] Tarball download unchanged — one request

### Code Quality

- [ ] `npm test` green, both new suites registered in `package.json` and observed to run
- [ ] Every guarantee in §8 mutation-proven
- [ ] `shellcheck scripts/setup-consumer.sh` no new warnings
- [ ] `skill-dependencies.json` regenerable and CI-checked for drift
- [ ] Closure logic lives in Node with unit tests over injected fixtures, not in untestable inline bash

### Migration

- [ ] `configuration.md` documents all three keys in "Full schema" and "Key reference"
- [ ] `getting-started.md` documents the profiles, add-ons, and how to change profile later
- [ ] CHANGELOG entry states the measured context saving, not an estimate
- [ ] A real `--update` against a full existing install verified to remove nothing

---

## 10. Risk Assessment

### HIGH RISK

**1. Closure is incomplete and a pipeline breaks mid-run**

- **Risk**: A skill invokes another by a form the generator misses — a bare name in prose, a `Skill` tool call, a reference inside `references/`. The install looks fine; `/develop-story` fails at Step 4.
- **Probability**: Medium — the generator only sees `/slash-command` tokens in `SKILL.md`.
- **Impact**: Critical — failure is far from the cause, in the consumer's repo, mid-story.
- **Mitigation**: Scan `references/` as well as `SKILL.md`; assert the known-good edge list for `develop-story` (8) and `review-story` (10) as a fixture, so a generator regression fails CI. **Additionally: the runtime error must name the missing skill and the `--all-skills` remedy** — closure cannot be proven complete, so the failure mode must be legible.
- **Rollback**: `--all-skills`, or set `skills.profile: full` and `--update`.

**2. Closure defeats task 83 and drags the wrong tracker's skills back in**

- **Risk**: `review-story` names both `sync-github-story` and `sync-jira-story`; unfiltered closure installs both, silently undoing task 83 for every profile user.
- **Probability**: High if the ordering is wrong — this is the default outcome of a naive implementation.
- **Impact**: High — silently reverts the prior task with no error.
- **Mitigation**: The tracker filter runs **after** closure, asserted by a named integration test and mutation-proven by removing the filter.
- **Rollback**: Fix the ordering; one-line change.

### MEDIUM RISK

**3. Profile membership goes stale as skills are added**

- **Risk**: A new pipeline skill ships and is in no profile, so `pipeline` users never receive it. Silent under-install.
- **Probability**: Medium — this repo has the pattern: `package.json`'s hand-maintained test globs orphaned a whole suite once.
- **Impact**: Medium — a missing skill, not a broken one.
- **Mitigation**: A test listing every skill in no profile, printed as a report. It cannot fail on principle (`full` is everything and the long tail is legitimately unprofiled), so it must be a **visible report in CI output** rather than a silent pass.
- **Rollback**: Add to the profile; patch release.

**4. Config and installed state diverge**

- **Risk**: Config says `pipeline`, disk holds 119 because of grandfather. A later reader trusts the config and assumes the extras are absent.
- **Probability**: High — this is the *expected* state for every existing consumer who adopts a profile.
- **Impact**: Medium — confusing, not breaking.
- **Mitigation**: `print_summary` states the divergence explicitly and gives the prune recipe. Documented in `getting-started.md` as normal, not as an error.
- **Rollback**: n/a — accepted consequence of grandfathering.

### LOW RISK

**5. Estimated profile sizes are wrong**

- **Probability**: High (they are estimates). **Impact**: Low.
- **Mitigation**: Success criteria assert the *computed* size is reported; no number is hardcoded.

**6. The add-on prompt is awkward over `curl`-piped stdin**

- **Probability**: Low. **Impact**: Low.
- **Mitigation**: Numbered `read -r`, identical to `select_platform`, which already works on that path. Enter skips.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a pipeline failing on a missing skill after a profile install; `--update` pruning anything; `npm test` red on `develop` after merge.
- **Steps**:
  1. `git revert <merge-commit>`
  2. `npm test`
  3. Patch release — consumers pin to a tag
  4. Affected consumers: `--update` restores all 119 (task 83's filter still applies)
- **Validation**: a scratch consumer `--update` installs the full task-83 set.

### Partial Rollback (1-2 hours)

- **When**: closure is wrong but profiles and persistence are sound.
- **Steps**: force `_resolve_skill_set` to return `full` regardless of input. Keeps the config keys, the prompt and the tests; disables the behaviour. No revert conflict, and consumers' committed `skills:` blocks stay valid for when it is re-enabled.

### Forward Fix

- **When**: one missing edge, one skill in the wrong profile, a wrong count in the summary.
- **Approach**: fix the data, add the fixture case, patch release. The mechanism is sound; the data is wrong.

### Rollback Triggers

- **Critical (revert now)**: any pipeline breaking on a missing skill; any prune of an existing install.
- **Non-critical (fix forward)**: a missing graph edge with no reported breakage; profile membership; summary wording; docs.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-02 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

- [ ] Phase 1 — Dependency graph generation
- [ ] Phase 2 — Profile definitions and closure resolver
- [ ] Phase 3 — Wizard prompt
- [ ] Phase 4 — Persistence and `--update`
- [ ] Phase 5 — Tests and documentation
- [ ] QA review complete
- [ ] Quality gate PASS

---

## References

- [Task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md) — platform exclusion; **must land first**
- `scripts/setup-consumer.sh:755` — `install_skills()`
- `scripts/setup-consumer.sh:1100-1130` — `main()` step order
- `scripts/setup-consumer.sh:169` — `select_platform()`, the prompt idiom to match
- [`docs/reference/configuration.md`](../../reference/configuration.md) — schema to extend
- [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)

---

## Notes

**QA artifacts will be created at**:

- QA report: `task.84.qa.1.skill-install-profiles.md`
- Bug reports: `task.84.bug.[N].[name].md`
- Quality gate: `task.84.gate.1.skill-install-profiles.yml`

**Sequencing**: task 83 must merge first. This task calls `_skill_excluded_for_tracker` and relies on the config-first resolver order that task 83 establishes; building both at once would mean writing that resolver twice.

**On the decision not to ship a lockfile**: considered and rejected. The config is the single source of truth; a lockfile would be a second one to keep in sync, and the resolution is deterministic from `skill-dependencies.json`, which is itself committed and CI-checked for drift. If reproducibility ever proves insufficient in practice, a lockfile can be added without changing the config contract.
