---
id: task.84
title: "Skill install profiles with dependency closure"
type: task
description: "Let a consumer pick an install profile (minimal/pipeline/full) plus per-skill add-ons, resolve the dependency closure so a chosen skill's callees come with it, and persist the choice in skills-config.yaml."
tags: [setup-consumer, install, configuration, context-budget]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-02
updated: 2026-09-05
assignee:
estimated_effort_hours: 8
github_issue: 317
---

# Technical Task: Skill install profiles with dependency closure

**Status:** Ready for Review
**GitHub Issue**: [#317](https://github.com/Gamaroff/agent-skills/issues/317)
**Review**: ✅ All review recommendations from `task.84.review.1.skill-install-profiles.md` implemented 2026-09-04

---

## 1. Overview

`setup-consumer.sh` installs every skill in the library — **120** as of 2026-09-04. Their `description` fields total **41,246 bytes**, roughly **10,300 tokens permanently in the agent's context**, before it reads a single instruction. Most consumers use a fraction of the library.

> **The baseline is measured, dated, and its method is stated — because two methods disagree.** Summing the `description:` frontmatter value across the 120 skills that have one gives 41,246 bytes; counting the whole frontmatter block, or a different multi-line-scalar rule, gives ~45k. The figure above is the first method. No test may hardcode it — see §8.

This task adds a profile choice to the wizard (`minimal` / `pipeline` / `full`), optional per-skill add-ons on top, a dependency-closure pass so choosing `develop-story` also brings the eight skills it invokes, and persistence of the decision in `skills-config.yaml` so `--update` is reproducible.

**Scope**: Profile definitions, the wizard prompt, closure resolution, config persistence, and the `--update` path. Builds on the exclusion filter from [task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md).

**Key deliverables**:

1. Three profile definitions with a declared membership list each.
2. A dependency-closure resolver that expands a selection to its transitive callees and reports what it added.
3. `skills.profile` / `skills.include` / `skills.exclude` in `skills-config.yaml`, read on every `--update`.

**Expected outcome**: A consumer choosing `pipeline` installs roughly 45 skills instead of all 120, recovering an estimated ~6k tokens of context budget, with no possibility of a half-installed pipeline. The estimate is replaced by a measured figure in the CHANGELOG once Phase 1 computes the closure — see §9.

---

## 2. Motivation

### Current Problems

1. **The metadata tier is the real cost and it is paid on every single request.** 120 descriptions total ~41.2k bytes / ~10.3k tokens that never leave context. Disk (25MB) is irrelevant. Task 83 recovers a slice of it (11 Jira-only or 6 GitHub-only skills, depending on tracker); the rest is only reachable by not installing skills the consumer does not use.

2. **A flat per-skill list is a footgun, because the skills form a call graph.** `develop-story` invokes eight others by slash command — `create-branch`, `review-story`, `develop`, `create-pr`, `qa-story`, `qa-fix`, `finalise`, `commit-changes`. `review-story` invokes ten more. Unchecking `create-pr` does not produce an install error; it produces a **Step 4 failure in the middle of a real story**, hours later, with the cause buried in the install. Any selection UI that lets a user break this graph without telling them is worse than no selection at all.

3. **A 120-item checkbox list is not a usable control.** Descriptions average ~340 bytes; the list does not fit on a screen, cannot be read in one pass, and forces 120 decisions to express what is really one decision ("I want the pipeline").

4. **A selection that is not persisted is undone by the next `--update`.** `install_skills()` loops the tarball unconditionally, and `main()` reuses it verbatim on the `--update` path. Without persistence, the first `--update` silently reinstalls everything and the consumer's choice evaporates with no message.

### Benefits

1. **~6k tokens of context budget returned** on a `pipeline` install — the large share of the ~10.3k total, and the reason this task exists rather than task 83 alone. Estimated here; measured and recorded by the Phase 5 test and the CHANGELOG entry.
2. **A broken selection becomes unrepresentable** — closure runs before install, so a chosen skill's callees are always present.
3. **One decision instead of 120** — the profile is the unit people actually think in.
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
- **The `--update` short-circuit (`setup-consumer.sh:1312-1316`) calls `install_skills` and returns before `select_platform` (:1318).** It must therefore resolve the profile from the config file alone — the same constraint task 83's resolver solves for `tracker`.

### The dependency graph

Measured by extracting `/slash-command` references from each `SKILL.md` where a matching `skills/` directory exists. The two edge sets below are the known-good fixture §8 asserts; re-verify them against the tree when implementing, and update both here and in the fixture together:

| Skill | Invokes |
|---|---|
| `develop-story` | `create-branch`, `review-story`, `develop`, `create-pr`, `qa-story`, `qa-fix`, `finalise`, `commit-changes` |
| `review-story` | `create-branch`, `create-epic`, `create-story`, `create-task`, `develop`, `develop-story`, `develop-task`, `finalise`, `review-task`, `sync-github-story`, `sync-jira-story` |

Highest fan-in (count of other `SKILL.md` files naming them): `create-pr` 25, `finalise` 22, `develop-story` 22, `review-story` 20, `develop-task` 20, `create-story` 19, `qa-fix` 16. (Those counts are *prose mentions*, which is precisely why they cannot be used as edges — see the design note above.)

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

> **⚠️ DESIGN CHANGED DURING IMPLEMENTATION — the edges are declared, not scraped from prose.**
> This section originally specified extracting `/slash-command` tokens from each `SKILL.md` (and its
> `references/`). That was built first and **measured**, and it does not work. Every variant fails in
> one of two directions:
>
> | Extractor | `develop-story` edges | `minimal` closure | `pipeline` closure |
> |---|---|---|---|
> | `SKILL.md` + `references/` | 22 (real: 9) | 35 | 36 |
> | `SKILL.md` only | 9 ✓ | 33 | 35 |
> | …minus `## Related Skills` | 8 ✓ | 33 | 35 |
> | …minus called-by phrasing | 8 ✓ | 33 | 35 |
> | …invocation verbs only | **3** (loses 6 real steps) | 28 | 34 |
>
> The middle variants reproduce this task's own known-good fixtures exactly, and **still** collapse
> `minimal` (5 seeds) and `pipeline` (26 seeds) to the same ~34 of 120 skills. The profiles become
> indistinguishable — the feature ships worthless while reporting success, which is §10 Risk 3's
> silent-under-install failure arriving from the opposite direction.
>
> The cause is **direction**. A `/slash-command` token carries none, and prose is full of reverse
> references: a leaf naming its callers, cross-references, and — decisively — negations.
> `skills/review-code/SKILL.md:180` reads "`/develop-story` and `/develop-task` do **not** call
> `/review-code`", and the scrape turns that sentence into two edges. From any leaf you then reach
> the orchestrators, and from an orchestrator you reach everything. Tightening the pattern trades one
> failure for the other, and a *missing* edge is the worse one — a mid-pipeline failure in a
> consumer's repo, hours from the install.
>
> **So each `SKILL.md` declares its own edges** in frontmatter: `invokes: [create-branch, develop, …]`.
> Absent key ⇒ no outgoing edges, the safe default (a profile then resolves to exactly its seeds).
> Everything this task wanted from a generated manifest is preserved — diffable in review,
> regenerated by `npm run generate-skill-deps`, CI-checked for drift — and strengthened, because the
> declaration lives beside the skill whose behaviour it describes. 20 skills declare edges today.
>
> The prose scrape survives as **§10 Risk 1's mitigation**, demoted to a report:
> `npm run skill-deps:candidates` lists prose mentions not declared in `invokes:`. Advisory by
> design — most candidates are legitimate prose, and a check that cries wolf is one people learn to
> ignore.

### Profile definitions

| Profile | Contents | Rough size |
|---|---|---|
| `minimal` | `commit-changes`, `create-branch`, `create-pr`, `create-issue`, `review-code` + closure | ~8 |
| `pipeline` | the story/task/bug lifecycle: `create-*`, `review-*`, `develop*`, `qa-*`, `finalise`, `sync-*`, `ensure-*` + closure | ~45 |
| `full` | everything (today's behaviour) | 120 (all) |

Sizes are estimates to be fixed during Phase 1 once closure is computed; the success criteria assert the *computed* size is reported, not a hardcoded number. `full` is written as "all" rather than a literal for the same reason — the count moves every time a skill is added.

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
| Fresh install, no answer given | all | all (`full` is the default) |
| Fresh install, `pipeline` chosen | all | ~45 |
| `--update`, no `skills:` block in config | all | all (absent block ≡ `full`) |
| `--update`, `skills.profile: pipeline` | all | ~45 installed, **nothing pruned** |

("all" = every skill in the tarball minus task 83's tracker exclusions — 120 skills at time of writing. Deliberately not a literal: the count changes whenever a skill is added.)

**New config keys are additive and optional.** An absent `skills:` block means `full`, which is exactly today's behaviour. No existing `skills-config.yaml` becomes invalid.

**Migration path**: none required. A consumer wanting the smaller install adds `skills.profile` to their config and re-runs `--update`; the extra skills stay on disk until they delete `.agents/skills/` and re-run. That manual step is deliberate — see task 83 §5 for why pruning is not done on the consumer's behalf.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.84.plan.skill-install-profiles.md](task.84.plan.skill-install-profiles.md)

### Phase 1 — Dependency graph generation (Risk: Low)

**Files**: `scripts/generate-skill-dependencies.mjs`, `shared/resources/skill-dependencies.json`, `package.json`

- [x] Read the `invokes:` frontmatter key from each `SKILL.md`, validate every name against `skills/`, and reject the YAML block form loudly (**superseded the original prose-scrape bullet — see the §3 design note**)
- [x] Emit `{ "skill": ["callee", ...] }`, keys sorted, committed
- [x] Add `npm run generate-skill-deps`
- [x] Add a CI check that the committed file matches a fresh generation — **in `validate.yml`, not only `release.yml`**. The catalog check exists in both: `release.yml` runs at tag time (too late to stop a bad merge) and `validate.yml` is the PR gate. Two things must be handled for the PR gate to actually fire: `validate.yml`'s job has `setup-python` only, so a Node generator needs `actions/setup-node` added; and its `paths:` filter does not include `shared/resources/**`, so the job would not even trigger on a change to the generated JSON. Fix both, or the check silently never runs.

**Dependencies**: none.

### Phase 2 — Profile definitions and closure resolver (Risk: Medium)

**Files**: `shared/resources/skill-profiles.json`, `scripts/setup-consumer.sh`

- [x] Author the three profiles as explicit membership lists (pre-closure seeds)
- [x] `_resolve_skill_set()`: seed → +include → −exclude → closure → tracker filter
- [x] Closure is a visited-set worklist — the graph has cycles (`develop-story` ↔ `review-story`)
- [x] Run the task-83 tracker predicate **over the closure output**, so an inapplicable sibling pulled in by a dependency is dropped
- [x] `skills.exclude` is applied to the seed, then re-applied after closure, and a skill removed by `exclude` but required by closure is **reported as a conflict**, not silently re-added
- [x] Implemented in a Node helper invoked from bash, not in bash — JSON traversal in pure bash is the wrong tool

**Dependencies**: Phase 1, task 83.

### Phase 3 — Wizard prompt (Risk: Low)

**Files**: `scripts/setup-consumer.sh`

- [x] `select_skill_profile()` — numbered prompt matching `select_platform`'s existing idiom, default `full`
- [x] Optional add-on prompt: numbered, comma-separated answer, skippable with Enter
- [x] Call from `main()` after `select_platform`, before `write_skills_config`
- [x] Print the resolved count and the closure additions before installing

**Dependencies**: Phase 2.

### Phase 4 — Persistence and `--update` (Risk: Medium)

**Files**: `scripts/setup-consumer.sh`, `docs/reference/configuration.md`

- [x] `write_skills_config` emits the `skills:` block when a non-`full` profile is chosen
- [x] `_resolve_skill_set` reads profile/include/exclude from config when the wizard has not run
- [x] Grandfather branch: an installed skill outside the resolved set is kept and reported
- [x] Document the three keys in `configuration.md` "Full schema" and "Key reference"

**Dependencies**: Phases 2-3.

### Phase 5 — Tests and documentation (Risk: Low)

**Files**: `shared/resources/tests/setup-consumer-skill-profiles.test.mjs`, `package.json`, `docs/concepts/getting-started.md`, `CHANGELOG.md`

- [x] Closure, cycle, conflict, tracker-interaction and `--update` cases (§8)
- [x] Confirm both suites are collected. **No `package.json` edit is required for these two**: the `test` script already globs `shared/resources/tests/*.test.mjs`, which is where both land. Verify by running `npm test` and observing the reported test count rise — that is the actual check. (Hand-registration is only needed for a new `*.test.sh`, which is listed individually.)
- [x] Mutation-prove each guarantee
- [x] Document profiles in `getting-started.md`; CHANGELOG entry

**Dependencies**: Phases 1-4.

---

## 7. Files Summary

**Core Implementation**

1. ✅ `scripts/generate-skill-dependencies.mjs` — new generator
2. ✅ `shared/resources/skill-dependencies.json` — new, generated, committed
3. ✅ `shared/resources/skill-profiles.json` — new, hand-authored
4. ✅ `shared/resources/resolve-skill-set.mjs` — new, closure resolver (pure `export function`, no side effects — unit-tested against injected fixtures)
4a. ✅ `shared/resources/resolve-skill-set-cli.mjs` — new, the thin CLI the installer shells out to: parses `--profile/--include/--exclude/--tracker`, loads the two JSON files, prints resolved names one-per-line on **stdout** and the closure/conflict report on **stderr** so `$( )` capture yields only names. Split from the resolver so the resolver stays pure and testable
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
- `full` → every skill in the tarball minus task-83 exclusions (assert against a computed count, never a literal)
- `minimal` + `include: [jira-sprint-manager]` under `tracker: jira` → present
- **Tracker interaction**: `pipeline` + `tracker: github` → `sync-jira-story` absent *even though `review-story` names it*. This is the case that catches closure defeating task 83.
- `--update` with `skills.profile: pipeline` in config, no wizard → same set
- `--update` over a full install → nothing pruned, extras reported as kept
- `--dry-run` → writes nothing, and reports **the resolved-set count computed offline** from the committed `skill-profiles.json` + `skill-dependencies.json`.
  > **This is narrower than "the counts the real run would produce", deliberately.** `install_skills`' dry-run branch never downloads the tarball — that is an explicit design rule there, so a dry run makes no network request and has no tarball skill list to count against. The profile, closure and tracker-filter counts *are* computable without the network, because both JSON files are committed; a count of "what is actually in the tarball" is not. Report the former and say so; do not add a download to the dry-run path to satisfy this.

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

Closure over ~120 nodes is trivial. The measurable claim is the **context saving**, asserted directly: a test sums `description` bytes for the resolved set and requires `pipeline` to be materially below `full`.

> **Measure both sides in the same run; never hardcode the baseline.** The assertion is `pipelineBytes < fullBytes * 0.55`, where *both* operands are computed from the same tree in the same test. Pinning a literal (`46408 * 0.55`) makes the test assert a fact about a past release rather than about the resolver, and it goes stale the moment a skill is added or a description is reworded — which has already happened once: the 46,408/119 figures in the original draft no longer match the tree. Record the measured numbers in the CHANGELOG, where staleness is harmless; keep them out of assertions, where it is not.

---

## 9. Success Criteria

> **Status of this section, stated plainly.** **One** criterion below is unticked: the real
> `--update` (partial — only a dry run was performed, which by construction cannot exercise the path
> that deletes files). Every other criterion is met with evidence named in the QA reports. All three
> QA gates read **CONCERNS**, not PASS.
>
> shellcheck was previously recorded here as unverifiable. It was not — it ran via the official
> container and found a new SC2155 warning in this change, now fixed. Recording a check as
> impossible is a claim that deserves the same scrutiny as recording it as passed.
>
> An earlier revision of this document had all 21 criteria ticked, including those two. That was a
> blanket checkbox pass, not an assessment, and it asserted completion the gates and the
> implementation report both contradict. Corrected here — a criteria table that disagrees with its
> own trail is worse than one with unticked boxes.


### Functional

- [x] `minimal`, `pipeline`, `full` each resolve to a set containing every transitive callee of every seed
- [x] Choosing `develop-story` by any route installs all eight skills it invokes
- [x] The cyclic pair `develop-story` ↔ `review-story` resolves without hanging or duplicating
- [x] `pipeline` + `tracker: github` does not install `sync-jira-story`, despite `review-story` naming it
- [x] `skills.exclude` of a closure-required skill reports a conflict rather than silently re-adding or silently breaking
- [x] `--update` with no wizard resolves the profile from `skills-config.yaml`
- [x] `--update` over an existing install prunes nothing
- [x] Absent `skills:` block behaves exactly as today (every skill minus task-83 exclusions)
- [x] The wizard prints the resolved count and names each closure addition before installing

### Performance

- [x] `pipeline` resolves to a set whose total `description` bytes are materially below `full`'s — asserted by **measuring both in the same test run** and comparing them. No baseline literal appears in the assertion
- [x] Closure resolution adds < 1s to the wizard
- [x] Tarball download unchanged — one request

### Code Quality

- [x] `npm test` green, and both new suites **observed to run** (the reported test count rises). They land in `shared/resources/tests/`, which the `test` script already globs — so "registered in `package.json`" is not the check and must not be treated as one
- [x] Every guarantee in §8 mutation-proven
- [x] `shellcheck scripts/setup-consumer.sh` no new warnings — **MET, and it caught one.** Run via the official container (`docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable`), the same way task 83 ran it. Baseline `origin/develop`: 1 finding (SC2209, line 269, pre-existing, untouched by this diff). Branch before the fix: **2** — the pre-existing one plus a **new SC2155** at the `local _dry_cli="$(dirname …)"` line, "declare and assign separately to avoid masking return values". That is the same class this change already guards against in `_resolve_skill_set`, introduced two functions away. Split and re-run: **1 finding, 0 new**.

  > This criterion had been recorded across three gates and the DoD as "unverified — shellcheck is not installed and there is no lane". That was **wrong**: docker is available, and the roadmap's own T83 entry says it was run exactly this way. The check I claimed could not run found a real defect on the first attempt.
- [x] `skill-dependencies.json` regenerable and CI-checked for drift
- [x] Closure logic lives in Node with unit tests over injected fixtures, not in untestable inline bash

### Migration

- [x] `configuration.md` documents all three keys in "Full schema" and "Key reference"
- [x] `getting-started.md` documents the profiles, add-ons, and how to change profile later. **Note the step number**: `#### Step 8 — the platform skill filter` is already taken by task 83, so this is Step 9 (or a sibling subsection under Step 8) — do not overwrite the existing Step 8
- [x] CHANGELOG entry states the measured context saving (bytes and skill counts for `full` vs `pipeline`, with the measurement method named), not an estimate
- [ ] A real `--update` against a full existing install verified to remove nothing — **PARTIAL.** What was run is `--update --dry-run` against a scratch repo holding **6** skills. A dry run writes nothing by construction, so it cannot exercise the destructive path at all, and 6 skills is not a full install. In-repo the guarantee is asserted only structurally (the grandfather test regex-matches the wizard source for the `continue` and for `keepIdx < rmIdx`; it never runs the loop). This is the weakest evidence in the change, and it sits on the only code path that deletes user files.

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

- **Risk**: Config says `pipeline`, disk still holds every skill because of grandfather. A later reader trusts the config and assumes the extras are absent.
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
  4. Affected consumers: `--update` restores the full set (task 83's filter still applies)
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

## QA Testing Results

**QA Status**: CONCERNS (3 cycles)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-04
**Quality Score**: 80/100
**Gate Decision**: CONCERNS — cycle 3 confirmation pass recommended

### QA Report

- **Cycle 1**: [task.84.qa.1.skill-install-profiles.md](./task.84.qa.1.skill-install-profiles.md) · [gate.1](./task.84.gate.1.skill-install-profiles.yml)
- **Cycle 2 (refute)**: [task.84.qa.2.skill-install-profiles.md](./task.84.qa.2.skill-install-profiles.md) · [gate.2](./task.84.gate.2.skill-install-profiles.yml)
- **Cycle 3 (confirmation)**: [task.84.qa.3.skill-install-profiles.md](./task.84.qa.3.skill-install-profiles.md) · [gate.3](./task.84.gate.3.skill-install-profiles.yml)

### Test Coverage Summary

- **Tests Executed**: 2398 (42 new)
- **Phases Verified**: 5/5 implemented, 4 with concerns
- **Critical Issues**: 0 HIGH, 7 MEDIUM, 3 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

The core mechanism is correct and mutation-proven, and the graph design change is well evidenced. Eleven defects sat in the input handling and reporting around it — **all now fixed**, each with a regression test, six mutation-proven.

Four had silently installed **every** skill in reachable configurations: a typo'd `include`, an `exclude` list that empties the profile, a trailing comment on the `skills:` line, and a `$`-prefixed profile name. One broke both CI drift checks on a legal YAML comment. Two misreported what the installer had done.

Worth recording how they were found, because the three lenses were disjoint: the self-review (same pipeline that wrote the code) found **1**; an independent adversarial reviewer found **10**; the repo's own pre-existing `stdout-drain-on-exit` guard found the **11th**, a class neither reviewer probed.

---

## Definition of Done — Gaps Identified

**Status:** IN PROGRESS (`ready-for-review`) — **NOT accepted**

**Full report:** [`task.84.dod.1.skill-install-profiles.md`](./task.84.dod.1.skill-install-profiles.md)

Blocked five independent ways; any one alone is disqualifying:

1. **CI PENDING** — the `test` job had not finished on the final head
2. **No approving review** on PR #318
3. **Three QA gates read CONCERNS**, none PASS
4. **One success criterion unmet** — the real `--update` (dry-run evidence only, on the path that deletes files). *(shellcheck has since been run and now passes with 0 new warnings.)*
5. **Step 5c returned REQUEST CHANGES**, six documentation findings still open

### Next Steps

- [ ] Perform a genuine non-dry `--update` against a full install, or extract the per-skill decision into a testable helper
- [ ] Obtain human review of PR #318 — see below
- [ ] Wait for CI to finish green
- [ ] Clear PC-5…PC-9, PC-11 (documentation consistency)

**Estimated effort:** Medium (2–4 hours) plus the review.

**Why human review is a gap rather than a formality:** four independent passes found 27 defects, and
every pass found the previous pass's fixes defective — same author throughout. The most severe was
introduced in the same commit as a comment warning against it, and was invisible to its own test
because that test ran under `set +e`. The implementation is good; self-certification on it has been
demonstrably unreliable, in a file that can delete a consumer's installed skills.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-02 | 1.0     | Initial draft | create-task |
| 2026-09-04 | 1.1     | Review passed (9/10) — 0 critical, 8 important, 3 optional. Corrected six stale `setup-consumer.sh` line citations; replaced the 119-skill / 46,408-byte baseline with a measured, dated 120 / 41,246 and moved the context-saving assertion off a hardcoded literal onto a both-sides-measured comparison; declared `resolve-skill-set-cli.mjs` as its own deliverable; corrected the package.json-registration criterion (the `shared/resources/tests/` glob already collects it); routed the drift check to `validate.yml` (the PR gate) as well as `release.yml`, naming its missing `setup-node` and `paths:` filter; corrected the bundler warning (`.json` is not bundled); resolved the `--dry-run` count conflict against the no-download rule; noted `getting-started.md` Step 8 is already taken | review-task |
| 2026-09-04 |         | Status → ready-for-development | review-task |
| 2026-09-04 |         | Implemented — 5 phases, 12 files (4 new in `shared/resources/`, 1 new generator, 20 SKILL.md `invokes:` declarations), 42 new/updated tests, all 6 guarantees mutation-proven. Graph design changed from prose-scrape to declared `invokes:` frontmatter after measurement showed the scrape collapses every profile to the same ~34 skills — see §3 | develop |

| 2026-09-04 |         | QA gate CONCERNS (80/100) — 0 HIGH, 7 MEDIUM, 3 LOW; four reachable configs silently install every skill | qa-task |
| 2026-09-04 |         | qa-fix cycle 1 — all 11 defects fixed (10 from adversarial review, 1 from the repo stdout-drain guard); 16 regression tests added, 6 mutation-proven | qa-fix |
| 2026-09-04 |         | QA gate 2 CONCERNS (80/100) — refute pass found 5 more, 2 HIGH, both introduced by cycle 1's own fixes; 4 cycle-1 tests found vacuous | qa-task |
| 2026-09-04 |         | qa-fix cycle 2 — all 5 fixed with behavioural tests; vacuous drift guard replaced and mutation-proven | qa-fix |
| 2026-09-04 |         | QA gate 3 CONCERNS (80/100) — confirmation pass found 5 more, 2 HIGH, 3 introduced by cycle 2's fixes; worst was a bare assignment aborting the wizard under errexit | qa-task |
| 2026-09-04 |         | qa-fix cycle 3 — all 5 fixed; comment-asserting vacuous test replaced; mutation proofs now assert the mutation applied | qa-fix |
| 2026-09-05 |         | review-pr (Step 5c) — REQUEST CHANGES: two success criteria were ticked without evidence, and the implementation report undercounted cycle 3. Corrected | review-pr |
| 2026-09-05 |         | DoD incomplete — 5 blocking gaps (CI pending, no approving review, 3 CONCERNS gates, 2 criteria unmet, 5c REQUEST CHANGES). Status NOT advanced to accepted | finalise |
| 2026-09-05 |         | shellcheck run via container after all — found and fixed a new SC2155 (`local` masking a return value). 0 new warnings vs baseline; that criterion now met, 1 gap remains | finalise |
---

## Progress Tracking

- [x] Phase 1 — Dependency graph generation
- [x] Phase 2 — Profile definitions and closure resolver
- [x] Phase 3 — Wizard prompt
- [x] Phase 4 — Persistence and `--update`
- [x] Phase 5 — Tests and documentation
- [ ] QA review complete
- [ ] Quality gate PASS

---

## References

- [Task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md) — platform exclusion; **must land first**
- `scripts/setup-consumer.sh:908` — `install_skills()`
- `scripts/setup-consumer.sh:1298-1329` — `main()` step order; the `--update` short-circuit (`install_skills`; `print_summary`; `return`) is at **1312-1316**, before `select_platform` at 1318
- `scripts/setup-consumer.sh:173` — `select_platform()`, the prompt idiom to match
- `scripts/setup-consumer.sh:820` — `_resolve_install_tracker()` (task 83); `:875` — `_skill_excluded_for_tracker()`; `:754-771` — the two exclusion lists; `:971-993` — the grandfather branch to copy
- `scripts/setup-consumer.sh:435` — `write_skills_config()`; `:149` — `check_prereqs()` (node ≥ 22 already required)
- `scripts/setup-consumer.sh:1014-1017` — the existing precedent for shipping a `shared/resources/*.mjs` file to consumers out of the extracted tarball
- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — task 83's suite; sources the wizard with `SETUP_CONSUMER_NO_MAIN=1`, the idiom the new suites must use

> **Line numbers go stale.** Every citation above was re-verified on 2026-09-04 against `develop` at `a0ac4b8`; the originals (`:755`, `:1100-1130`, `:169`, `:1115`) were 4 to ~200 lines out. Grep for the function name rather than trusting the number.
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
