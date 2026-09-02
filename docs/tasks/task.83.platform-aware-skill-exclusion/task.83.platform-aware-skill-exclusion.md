---
id: task.83
title: "Platform-aware skill exclusion in setup-consumer.sh"
type: task
description: "Skip installing tracker-specific skills that can never fire on the consumer's configured platform — 11 Jira skills on a GitHub repo, 6 GitHub skills on a Jira repo."
tags: [setup-consumer, install, platform-detection]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-02
updated: 2026-09-02
assignee:
estimated_effort_hours: 4
---

# Technical Task: Platform-aware skill exclusion in setup-consumer.sh

**Status:** Planned

---

## 1. Overview

`scripts/setup-consumer.sh` installs every skill in the release tarball unconditionally. Of the 119 skills shipped, 17 are tracker-specific and mutually exclusive by platform: 11 exist only for Jira, 6 only for GitHub Issues. A consumer on GitHub receives all 11 Jira skills; a consumer on Jira receives all 6 GitHub-sync skills. Neither set can ever fire.

This task teaches `install_skills()` to resolve the consumer's tracker and skip the set that cannot apply.

**Scope**: The install-time filter, its resolution on both the wizard and `--update` code paths, and the tests that hold it. No user-facing selection UI — that is [task 84](../task.84.skill-install-profiles/task.84.skill-install-profiles.md).

**Key deliverables**:

1. A skill→tracker classification, declared in one place and consumed by the installer.
2. `install_skills()` filters by resolved tracker, on both call sites in `main()`.
3. A grandfather rule so no existing install loses a skill on `--update`.

**Expected outcome**: A fresh GitHub consumer installs 108 skills instead of 119; a fresh Jira consumer installs 113. Existing installs are untouched until they opt in.

---

## 2. Motivation

### Current Problems

1. **Skills that cannot fire are offered to the agent as if they could.** `install_skills()` (`scripts/setup-consumer.sh:755`) loops `for _skill_dir in "$_tmpdir"/skills/*/` and copies every directory containing a `SKILL.md`. There is no platform predicate anywhere in the function. A GitHub-only consumer ends up with `sync-jira-story`, `jira-sprint-manager` and nine others on disk and in the agent's metadata tier.

2. **Mis-selection risk is the real cost, not disk space.** Skill auto-activation matches on the `description` field. With both `sync-jira-story` and `sync-github-story` present and descriptions that differ only in the platform noun, an agent asked to "sync this story to the tracker" can select the wrong one. The failure is not a clean "not configured" error at the top — `resolve-platform.sh` is sourced *inside* the skill, so the run gets some distance in before it reports the mismatch.

3. **The metadata tier carries dead weight.** Measured on this repo: all 119 descriptions total 46,408 bytes (~11.6k tokens) permanently in context. The Jira-only set is 5,975 bytes (~1,493 tokens); the GitHub-only set is 3,855 bytes (~963 tokens). **This is a modest share of the total — about 13% for a GitHub consumer — and is deliberately stated as a secondary benefit.** The bulk of any context saving comes from profiles in task 84; overstating it here would misrepresent what this task buys.

4. **`--update` cannot see the wizard's answer.** `main()` calls `install_skills` at line 1115 on the `--update` path, which returns before `select_platform` is ever reached (line 1119). Any filter that reads a shell variable set by the wizard is silently inert on the code path consumers use most.

### Benefits

1. **Removes a whole class of wrong-skill selection** — the wrong-platform sibling is not on disk to be selected.
2. **~1,493 tokens returned to the context budget** on a GitHub consumer, ~963 on Jira.
3. **Zero user decisions** — the wizard already asks the platform question at step 2; this reuses the answer.
4. **No new UI, no new prompts, no new failure mode** — the smallest change that produces a correct install.
5. **Establishes the classification and the filter hook** that task 84's profiles build on, so the larger change lands against a tested seam.

---

## 3. Technical Background

### Current Architecture

`install_skills()` — `scripts/setup-consumer.sh:755`:

```bash
tar -xzf "$_archive" -C "$_tmpdir" --strip-components=1
mkdir -p .agents/skills
local _installed=0 _updated=0
for _skill_dir in "$_tmpdir"/skills/*/; do
  [[ -f "${_skill_dir}SKILL.md" ]] || continue     # ← the only filter today
  local _name; _name=$(basename "$_skill_dir")
  if [[ -d ".agents/skills/${_name}" ]]; then
    rm -rf ".agents/skills/${_name}"
    cp -r "$_skill_dir" ".agents/skills/${_name}"
  else
    cp -r "$_skill_dir" ".agents/skills/${_name}"
  fi
done
```

The tarball is downloaded whole and extracted whole. Filtering happens at the copy step, not the download step — the release tarball has no per-skill granularity and this task does not add one.

Call sites in `main()`:

| Line | Path | `TRACKER` state at call time |
|------|------|------------------------------|
| 1115 | `--update` | **unset** — `select_platform` has not run and never will on this path |
| 1126 | full wizard | set by `select_platform` (line 1120) |

### The two exclusion sets

Derived from `skills/` on v0.45.0:

**Jira-only (11)** — skip when `TRACKER=github`:
`ensure-epic-jira-issue`, `ensure-story-jira-issue`, `ensure-task-jira-issue`, `sync-jira-epic`, `sync-jira-story`, `sync-jira-task`, `jira-epic-creator`, `jira-sprint-manager`, `jira-sprint-retrospective`, `jira-sprint-review-prep`, `jira-standup-auditor`

**GitHub-only (6)** — skip when `TRACKER=jira`:
`ensure-epic-github-issue`, `ensure-story-github-issue`, `ensure-task-github-issue`, `sync-github-epic`, `sync-github-story`, `sync-github-task`

### What is deliberately NOT excluded

The `vcs:` axis is orthogonal to `tracker:` and drives **no** exclusion. `create-pr`, `create-branch` and `create-issue` each branch on platform internally by sourcing `resolve-platform.sh`; they are single skills serving both GitHub and Bitbucket. There is no `create-pr-bitbucket` to exclude. Excluding on `vcs` would remove a skill the consumer needs.

### Target Architecture

```bash
# New: resolved once, before the copy loop
local _tracker; _tracker=$(_resolve_install_tracker)   # jira | github | ""

for _skill_dir in "$_tmpdir"/skills/*/; do
  [[ -f "${_skill_dir}SKILL.md" ]] || continue
  local _name; _name=$(basename "$_skill_dir")
  if _skill_excluded_for_tracker "$_name" "$_tracker"; then
    if [[ -d ".agents/skills/${_name}" ]]; then
      info "  kept     ${_name} (already installed; not pruned)"   # grandfather
    else
      (( _skipped++ )) || true
      continue
    fi
  fi
  # ... existing copy logic unchanged
done
```

`_resolve_install_tracker` resolution order — **config first, because `--update` has no wizard answer**:

1. `tracker:` in `skills-config.yaml` (scalar form)
2. `$TRACKER` if already set by `select_platform` in this run
3. `JIRA_URL` present in `.env` → `jira`
4. Otherwise `""` → **exclude nothing**

An unresolvable tracker installs everything. This is the safe direction: a consumer who gets 119 skills has a working setup; one who gets 108 of the wrong 108 does not.

---

## 4. Scope

### In Scope

✅ `_resolve_install_tracker()` and `_skill_excluded_for_tracker()` in `scripts/setup-consumer.sh`
✅ The exclusion filter inside `install_skills()`'s copy loop
✅ The grandfather rule for already-installed skills
✅ A `--all-skills` escape hatch that disables exclusion entirely
✅ Summary reporting — the skipped count in `record_step` and `print_summary`
✅ Tests in `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`
✅ `docs/concepts/getting-started.md` — the wizard's documented behaviour

### Out of Scope

❌ Any interactive selection UI — that is task 84
❌ `skills.profile` / `skills.include` / `skills.exclude` config keys — task 84 introduces them; this task reads only the existing `tracker:` key
❌ Pruning already-installed skills (grandfathered by decision; see §5)
❌ Per-skill download granularity — the tarball stays whole
❌ Excluding on the `vcs:` axis (see §3, "What is deliberately NOT excluded")
❌ Changing any skill's own `resolve-platform.sh` guard — those stay as the runtime backstop

---

## 5. Breaking Changes

**None for existing installs — this is guaranteed by the grandfather rule, not by luck.**

The one behaviour change is scoped to fresh installs:

| | Before | After |
|---|---|---|
| Fresh install, `tracker: github` | 119 skills | 108 skills |
| Fresh install, `tracker: jira` | 119 skills | 113 skills |
| Fresh install, tracker unresolvable | 119 skills | 119 skills (unchanged) |
| **`--update` over an existing install** | **119 skills** | **119 skills (unchanged)** |

**Migration path — none required.** An existing consumer running `--update` after this ships keeps every skill they already have. The `kept ... (already installed; not pruned)` line tells them a skill is now considered inapplicable, and `print_summary` points at `--all-skills` and at task 84's config keys as the two ways to make the choice explicit. Nobody has to act.

**For a consumer who wants the pruning**: delete `.agents/skills/` and re-run the wizard. Documented in `getting-started.md`; deliberately manual, because deleting a skill someone's custom workflow calls is not something to do on their behalf.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.83.plan.platform-aware-skill-exclusion.md](task.83.plan.platform-aware-skill-exclusion.md)

### Phase 1 — Classification and resolver (Risk: Low)

**Files**: `scripts/setup-consumer.sh`

- [ ] Add `SKILLS_JIRA_ONLY` and `SKILLS_GITHUB_ONLY` as newline-delimited string constants near `SKILLS_REPO` (line 729)
- [ ] Implement `_resolve_install_tracker()` with the 4-step order from §3
- [ ] Implement `_skill_excluded_for_tracker(name, tracker)` returning 0 when excluded
- [ ] Both functions defined above `install_skills()` so the `SETUP_CONSUMER_NO_MAIN=1` sourcing hook exposes them

**Dependencies**: none.

### Phase 2 — Wire the filter into the copy loop (Risk: Medium)

**Files**: `scripts/setup-consumer.sh`

- [ ] Resolve the tracker once before the loop
- [ ] Add the exclusion branch with the grandfather check on `.agents/skills/${_name}`
- [ ] Track `_skipped` and `_kept` counters alongside `_installed` / `_updated`
- [ ] Extend the `ok` line and `record_step` detail with the skipped count
- [ ] Add `--all-skills` to the flag parser (line 41) and short-circuit `_skill_excluded_for_tracker` when set
- [ ] Honour `DRY_RUN` — the dry-run branch must report the same counts it would write

**Dependencies**: Phase 1.

**Risk note**: this is the phase that can break a working install. The grandfather branch must be reached *before* any `rm -rf`, so an excluded-but-present skill is never deleted.

### Phase 3 — Tests (Risk: Low)

**Files**: `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`, `package.json`

- [ ] Source the script with `SETUP_CONSUMER_NO_MAIN=1` and assert `_skill_excluded_for_tracker` on all 17 named skills, both trackers
- [ ] Assert the resolver prefers `skills-config.yaml` over `$TRACKER` (the `--update` case)
- [ ] Assert an unresolvable tracker excludes nothing
- [ ] Assert a `create-pr` / `create-branch` / `create-issue` are never excluded under either tracker
- [ ] End-to-end over a fixture tarball: fresh install prunes; install with the skill already present keeps it
- [ ] **Mutation-prove**: revert the grandfather branch and confirm the keep test goes red
- [ ] Register the new suite in `package.json`'s test glob — a new file under `shared/resources/tests/` runs nowhere until it is listed

**Dependencies**: Phases 1-2.

### Phase 4 — Documentation (Risk: Low)

**Files**: `docs/concepts/getting-started.md`, `CHANGELOG.md`

- [ ] Update "What the wizard does" step 8 to state the platform filter and the grandfather rule
- [ ] Document `--all-skills` in the usage block at the top of `setup-consumer.sh` and in `getting-started.md`
- [ ] CHANGELOG `[Unreleased]` → `### Changed`

**Dependencies**: Phases 1-3.

---

## 7. Files Summary

**Core Implementation**

1. ✅ `scripts/setup-consumer.sh` — constants, resolver, predicate, filter, `--all-skills` flag

**Tests**

2. ✅ `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — new suite
3. ✅ `package.json` — register the suite in the test glob

**Documentation**

4. ✅ `docs/concepts/getting-started.md` — wizard step 8, `--all-skills`
5. ✅ `CHANGELOG.md` — `[Unreleased]` entry

**Unchanged by design**

- ❌ `shared/resources/resolve-platform.sh` — the runtime guard stays as the backstop
- ❌ Any `skills/*/SKILL.md` — no skill changes behaviour

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `_resolve_install_tracker` and `_skill_excluded_for_tracker` in isolation
- **Approach**: source with `SETUP_CONSUMER_NO_MAIN=1` (the hook at `setup-consumer.sh:1135`), call the functions from `bash -c`, assert exit codes
- **Cases**: 17 named skills × 2 trackers; the 4 resolution-order branches; empty tracker; `--all-skills`
- **Command**: `npm test`

### Integration Tests

- **Scope**: `install_skills()` against a fixture tarball in a temp dir
- **Flows**:
  1. Fresh + `tracker: github` → the 11 Jira skills absent, `create-pr` present
  2. Fresh + `tracker: jira` → the 6 GitHub-sync skills absent
  3. `sync-jira-story` pre-existing + `tracker: github` → **still present** after run (grandfather)
  4. No resolvable tracker → all 119 present
  5. `--dry-run` → writes nothing, reports the same counts as the real run

### Regression Tests

- `setup-consumer-config.test.mjs` and `setup-consumer-credentials.test.mjs` must stay green — this task touches a function they source

### Mutation Proving

Per `shared/resources/mutation-proving.md`, each of these must turn a test red when reverted:

- Remove the grandfather branch → case 3 fails
- Reverse the resolver order (`$TRACKER` before config) → the `--update` case fails
- Return "not excluded" unconditionally → cases 1 and 2 fail
- Add `create-pr` to an exclusion list → the never-exclude test fails

### No Performance Testing

The filter is a substring match over a 17-line constant per skill. No baseline needed.

---

## 9. Success Criteria

### Functional

- [ ] Fresh install with `tracker: github` installs 108 skills; none of the 11 Jira-only skills is on disk
- [ ] Fresh install with `tracker: jira` installs 113 skills; none of the 6 GitHub-only skills is on disk
- [ ] An already-installed excluded skill survives `--update` and is reported as `kept`
- [ ] An unresolvable tracker installs all 119
- [ ] `--all-skills` installs all 119 regardless of tracker
- [ ] `--update` resolves the tracker from `skills-config.yaml` with no wizard run
- [ ] `--dry-run` writes nothing and reports the counts the real run would produce
- [ ] `create-pr`, `create-branch`, `create-issue` install under both trackers

### Performance

- [ ] No measurable change in wizard wall-clock time (filter is O(skills × 17) string matching)
- [ ] Tarball download unchanged — one request, whole archive

### Code Quality

- [ ] `npm test` green, including the new suite
- [ ] New suite registered in `package.json` and observed to run (assert the count rises)
- [ ] Every fix mutation-proven per §8
- [ ] `shellcheck scripts/setup-consumer.sh` no new warnings
- [ ] New functions defined above the `SETUP_CONSUMER_NO_MAIN` hook so tests can reach them

### Migration

- [ ] `getting-started.md` step 8 describes the filter and the grandfather rule
- [ ] `--all-skills` documented in both the script header and `getting-started.md`
- [ ] CHANGELOG `[Unreleased]` entry naming both counts and the grandfather guarantee
- [ ] A real `--update` run against a full existing install verified to remove nothing

---

## 10. Risk Assessment

### HIGH RISK

**1. An `--update` prunes a skill a consumer's workflow depends on**

- **Risk**: The filter deletes an installed skill; a custom workflow or a pipeline step breaks at runtime, far from the install.
- **Probability**: Low — the grandfather rule exists precisely to prevent it.
- **Impact**: Critical — a broken pipeline in someone else's repo, with the cause several days upstream.
- **Mitigation**: Grandfather branch evaluated **before** any `rm -rf`; integration case 3 holds it; mutation-proven by reverting the branch.
- **Rollback**: Revert the commit; `--update` restores everything on the next run.

### MEDIUM RISK

**2. The tracker resolves wrong on the `--update` path**

- **Risk**: `--update` runs without the wizard. If the resolver prefers an unset `$TRACKER` over the config file, it silently excludes nothing (benign) — or, if `.env` is read before config, a stale `JIRA_URL` in a GitHub repo excludes the six GitHub-sync skills the consumer actually needs (not benign).
- **Probability**: Medium — `.env` files outlive the setup they were written for.
- **Impact**: High — removes working skills.
- **Mitigation**: `skills-config.yaml` is first in the resolution order and the `.env` probe is last; the order is asserted directly. Grandfather means an existing install is unaffected regardless.
- **Rollback**: `--all-skills`, then re-run.

**3. The classification goes stale as skills are added**

- **Risk**: A new `sync-jira-*` skill ships and is not added to `SKILLS_JIRA_ONLY`, so it installs on GitHub consumers — silently reintroducing the problem.
- **Probability**: Medium — hand-maintained lists drift. This repo has the pattern already: `package.json`'s per-skill test globs orphaned a new suite once.
- **Impact**: Medium — degradation back to today's behaviour, not a break.
- **Mitigation**: A test asserting every `skills/*jira*` and `skills/*github*` directory appears in exactly one list, so a new tracker skill fails CI until it is classified. **This is the check that makes the list maintainable and must not be dropped for expedience.**
- **Rollback**: Add the skill to the list.

### LOW RISK

**4. Consumers are confused by a smaller install**

- **Probability**: Low. **Impact**: Low.
- **Mitigation**: `print_summary` names the count and the reason; `--all-skills` is documented.

**5. `--dry-run` and the real run disagree**

- **Probability**: Low. **Impact**: Low — cosmetic.
- **Mitigation**: The dry-run branch calls the same predicate; asserted by integration case 5.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: any report of a skill missing after `--update`; the wizard exiting non-zero at step 8; `npm test` red on `develop` after merge.
- **Steps**:
  1. `git revert <merge-commit>` on `develop`
  2. `npm test` to confirm green
  3. Cut a patch release — consumers pin to a tag, so the tag is what reaches them
  4. Tell any affected consumer to re-run `--update`, which restores every skill
- **Validation**: a `--update` in a scratch consumer repo installs 119 skills again.

### Partial Rollback (1-2 hours)

- **When**: the filter is correct but the resolver is wrong on one path.
- **Steps**: keep Phases 1 and 3, make `_skill_excluded_for_tracker` return "not excluded" unconditionally. Ships the classification and tests, disables the behaviour. One-line change, no revert conflict.

### Forward Fix

- **When**: a single skill is misclassified, or a new one is missing from a list.
- **Approach**: fix the constant, add the case to the parity test, patch release. Do not revert — the mechanism is sound, the data is wrong.

### Rollback Triggers

- **Critical (revert now)**: any skill deleted from an existing install; the wizard failing to complete.
- **Non-critical (fix forward)**: a misclassified skill; a wrong count in the summary; a docs omission.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-02 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

- [ ] Phase 1 — Classification and resolver
- [ ] Phase 2 — Wire the filter into the copy loop
- [ ] Phase 3 — Tests
- [ ] Phase 4 — Documentation
- [ ] QA review complete
- [ ] Quality gate PASS

---

## References

- `scripts/setup-consumer.sh:755` — `install_skills()`
- `scripts/setup-consumer.sh:1115,1126` — the two call sites in `main()`
- `scripts/setup-consumer.sh:1135` — the `SETUP_CONSUMER_NO_MAIN=1` sourcing hook
- [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) — resolver order
- [`docs/reference/configuration.md`](../../reference/configuration.md) — `tracker:` key
- [Task 84](../task.84.skill-install-profiles/task.84.skill-install-profiles.md) — install profiles, builds on this filter

---

## Notes

**QA artifacts will be created at**:

- QA report: `task.83.qa.1.platform-aware-skill-exclusion.md`
- Bug reports: `task.83.bug.[N].[name].md`
- Quality gate: `task.83.gate.1.platform-aware-skill-exclusion.yml`

**On the honest size of the win**: the context saving is ~1,493 tokens for a GitHub consumer out of a ~11,602-token metadata budget — about 13%. The stronger argument for this task is correctness: removing the wrong-platform sibling removes a mis-selection mode. The large context saving belongs to task 84.
