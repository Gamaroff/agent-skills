---
id: task.83
title: "Platform-aware skill exclusion in setup-consumer.sh"
type: task
description: "Skip installing tracker-specific skills that can never fire on the consumer's configured platform — 11 Jira skills on a GitHub repo, 6 GitHub skills on a Jira repo."
tags: [setup-consumer, install, platform-detection]
category: infrastructure
status: accepted
priority: Medium
created: 2026-09-02
updated: 2026-09-04
completed_date: 2026-09-04
pr_number: 315
github_issue: 316
assignee:
estimated_effort_hours: 4
---

# Technical Task: Platform-aware skill exclusion in setup-consumer.sh

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.83.review.1.platform-aware-skill-exclusion.md` implemented 2026-09-04

---

## 1. Overview

`scripts/setup-consumer.sh` installs every skill in the release tarball unconditionally. Of the skills shipped, 17 are tracker-specific and mutually exclusive by platform: 11 exist only for Jira, 6 only for GitHub Issues. A consumer on GitHub receives all 11 Jira skills; a consumer on Jira receives all 6 GitHub-sync skills. Neither set can ever fire.

This task teaches `install_skills()` to resolve the consumer's tracker and skip the set that cannot apply.

**Scope**: The install-time filter, its resolution on both the wizard and `--update` code paths, and the tests that hold it. No user-facing selection UI — that is [task 84](../task.84.skill-install-profiles/task.84.skill-install-profiles.md).

**Key deliverables**:

1. A skill→tracker classification, declared in one place and consumed by the installer.
2. `install_skills()` filters by resolved tracker, on both call sites in `main()`.
3. A grandfather rule so no existing install loses a skill on `--update`.

**Expected outcome**: A fresh GitHub consumer installs every skill **except** the 11 Jira-only ones; a fresh Jira consumer installs every skill except the 6 GitHub-only ones. Existing installs are untouched until they opt in.

> **Counts are expressed relatively on purpose.** At the time of writing the tree holds 120 installable
> skills, so the numbers today are 109 and 114 — but an earlier draft of this task hard-coded 119/108/113
> and was already wrong by one before development started. A success criterion that goes false because
> somebody added an unrelated skill is one a developer learns to ignore. Assert `total − 11` and
> `total − 6`, never a literal.

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

`_resolve_install_tracker` **mirrors `shared/resources/resolve-platform.sh`** — the canonical resolver
every skill already sources at runtime — with config first, because `--update` has no wizard answer:

1. `tracker:` in `skills-config.yaml` (scalar form: `jira` | `github` | `auto`)
2. `$TRACKER` if already set by `select_platform` in this run
3. `JIRA_URL` present in `.env` (or the environment) → `jira`
4. Otherwise → **`github`** (the same default `resolve-platform.sh:438` applies)

> **Why the default is `github` and not "exclude nothing", which an earlier draft specified.**
>
> The draft's fourth branch returned `""` and excluded nothing, reasoning that guessing wrong prunes
> skills a consumer needs. That is the right instinct applied to the wrong branch — and as specified it
> made the whole task inert for the majority case.
>
> `write_skills_config` (`setup-consumer.sh:470-473`) writes a `tracker:` key **only when the answer was
> Jira**; GitHub is the implicit default and is written as nothing at all. So a GitHub consumer running
> `--update` misses step 1 (no key), misses step 2 (`select_platform` never runs on that path), misses
> step 3 (no `JIRA_URL`) — and fell straight to `""`. The 11 Jira skills were never pruned on the one
> path §2 problem 4 exists to fix.
>
> Defaulting to `github` cannot disagree with runtime, because **runtime defaults to `github` too**. A
> repo where this resolver would guess `github` is a repo where every Jira skill already fails when it is
> invoked. The real hazard is install time and run time disagreeing, and mirroring one resolver removes
> it. The grandfather rule and `--all-skills` remain the safety net for anything unforeseen.

**Companion change**: `write_skills_config` must also emit `tracker: github` for a GitHub consumer, so a
freshly generated config states its platform rather than relying on a default two layers away. Note this
changes that function's output — `setup-consumer-config.test.mjs` asserts on it and must be updated in
the same commit.

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
| Fresh install, tracker resolves `github` | all skills | all **− 11** Jira-only |
| Fresh install, tracker resolves `jira` | all skills | all **− 6** GitHub-only |
| **`--update` over an existing install** | **all skills** | **all skills (unchanged — grandfathered)** |

(With today's tree of 120 installable skills that is 109 and 114 respectively.)

**Migration path — none required.** An existing consumer running `--update` after this ships keeps every skill they already have, on either tracker: the grandfather branch fires before any delete, so a resolved tracker prunes nothing that is already on disk. The `kept ... (already installed; not pruned)` line tells them a skill is now considered inapplicable, and `print_summary` points at `--all-skills` and at task 84's config keys as the two ways to make the choice explicit. Nobody has to act.

**For a consumer who wants the pruning**: delete `.agents/skills/` and re-run the wizard. Documented in `getting-started.md`; deliberately manual, because deleting a skill someone's custom workflow calls is not something to do on their behalf.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.83.plan.platform-aware-skill-exclusion.md](task.83.plan.platform-aware-skill-exclusion.md)

### Phase 1 — Classification and resolver (Risk: Low)

**Files**: `scripts/setup-consumer.sh`

- [x] Add `SKILLS_JIRA_ONLY` and `SKILLS_GITHUB_ONLY` as newline-delimited string constants near `SKILLS_REPO` (line 729)
- [x] Implement `_resolve_install_tracker()` with the 4-step order from §3, **including the `github`
      default** — mirror `shared/resources/resolve-platform.sh`, do not re-derive it
- [x] Make `write_skills_config` emit `tracker: github` for a GitHub consumer (it currently writes the
      key only for Jira), and update `setup-consumer-config.test.mjs` in the same commit
- [x] Implement `_skill_excluded_for_tracker(name, tracker)` returning 0 when excluded
- [x] Both functions defined above `install_skills()` so the `SETUP_CONSUMER_NO_MAIN=1` sourcing hook exposes them

**Dependencies**: none.

### Phase 2 — Wire the filter into the copy loop (Risk: Medium)

**Files**: `scripts/setup-consumer.sh`

- [x] Resolve the tracker once before the loop
- [x] Add the exclusion branch with the grandfather check on `.agents/skills/${_name}`
- [x] Track `_skipped` and `_kept` counters alongside `_installed` / `_updated`
- [x] Extend the `ok` line and `record_step` detail with the skipped count
- [x] Add `--all-skills` to the flag parser (line 41) and short-circuit `_skill_excluded_for_tracker` when set
- [x] Honour `DRY_RUN` — the dry-run branch reports the **resolved tracker** and **which exclusion set
      would apply**, and writes nothing. It deliberately does **not** report per-skill counts: that
      branch returns before the tarball is downloaded (`setup-consumer.sh:777-779`), so it has no skill
      list to count, and making it download one would put a network request in a dry run and contradict
      §9's "tarball download unchanged"

**Dependencies**: Phase 1.

**Risk note**: this is the phase that can break a working install. The grandfather branch must be reached *before* any `rm -rf`, so an excluded-but-present skill is never deleted.

### Phase 3 — Tests (Risk: Low)

**Files**: `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`

- [x] Source the script with `SETUP_CONSUMER_NO_MAIN=1` and assert `_skill_excluded_for_tracker` on all 17 named skills, both trackers
- [x] Assert the resolver prefers `skills-config.yaml` over `$TRACKER` (the `--update` case)
- [x] Assert an unresolvable tracker excludes nothing
- [x] Assert a `create-pr` / `create-branch` / `create-issue` are never excluded under either tracker
- [x] End-to-end over a fixture tarball: fresh install prunes; install with the skill already present keeps it
- [x] **Classification-parity test** (§10 Risk 3's mitigation — mandatory, not optional): assert every
      `skills/*jira*` and `skills/*github*` directory appears in exactly one of the two lists, so a newly
      added tracker skill fails CI until it is classified
- [x] **Mutation-prove**: revert the grandfather branch and confirm the keep test goes red
- [x] Verify the new suite actually runs — `package.json:26` already globs
      `shared/resources/tests/*.test.mjs`, so **no registration is needed**; confirm by observing the
      reported test count rise. (The hand-listed-glob hazard in this repo applies to `skills/*/tests/`,
      which are enumerated one by one, not to this directory.)

**Dependencies**: Phases 1-2.

### Phase 4 — Documentation (Risk: Low)

**Files**: `docs/concepts/getting-started.md`, `CHANGELOG.md`

- [x] Update "What the wizard does" step 8 to state the platform filter and the grandfather rule
- [x] Document `--all-skills` in the usage block at the top of `setup-consumer.sh` and in `getting-started.md`
- [x] CHANGELOG `[Unreleased]` → `### Changed`

**Dependencies**: Phases 1-3.

---

## 7. Files Summary

**Core Implementation**

1. ✅ `scripts/setup-consumer.sh` — constants, resolver, predicate, filter, `--all-skills` flag

**Tests**

2. ✅ `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — new suite
3. ✅ `shared/resources/tests/setup-consumer-config.test.mjs` — updated for the new `tracker: github` line

**Documentation**

4. ✅ `docs/concepts/getting-started.md` — wizard step 8, `--all-skills`
5. ✅ `CHANGELOG.md` — `[Unreleased]` entry

**Unchanged by design**

- ❌ `package.json` — `:26` already globs `shared/resources/tests/*.test.mjs`; the new suite is picked up
  with no edit. Adding a redundant entry would imply the directory needs per-file registration, which it
  does not.
- ❌ `shared/resources/resolve-platform.sh` — the runtime guard stays as the backstop. This task *mirrors*
  its resolution order in the installer; it does not change the file.
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
  4. No config key, no `JIRA_URL` → resolves `github` (the `--update` case that motivated this task), the
     11 Jira skills absent
  5. `--dry-run` → writes nothing; reports the resolved tracker and the exclusion set that would apply

### Regression Tests

- `setup-consumer-config.test.mjs` and `setup-consumer-credentials.test.mjs` must stay green — this task touches a function they source

### Mutation Proving

Per `shared/resources/mutation-proving.md`, each of these must turn a test red when reverted:

- Remove the grandfather branch → case 3 fails
- Reverse the resolver order (`$TRACKER` before config) → the `--update` case fails
- Change the final fallback from `github` back to `""` → integration case 4 fails
- Return "not excluded" unconditionally → cases 1 and 2 fail
- Add `create-pr` to an exclusion list → the never-exclude test fails
- Delete a skill from both classification lists → the parity test fails

### No Performance Testing

The filter is a substring match over a 17-line constant per skill. No baseline needed.

---

## 9. Success Criteria

### Functional

- [x] Fresh install resolving `github` installs `total − 11`; none of the 11 Jira-only skills is on disk
- [x] Fresh install resolving `jira` installs `total − 6`; none of the 6 GitHub-only skills is on disk
- [x] An already-installed excluded skill survives `--update` and is reported as `kept`
- [x] A repo with no `tracker:` key and no `JIRA_URL` resolves `github` — **not** "exclude nothing"
- [x] `--all-skills` installs every skill regardless of tracker
- [x] `--update` resolves the tracker with no wizard run, on both a Jira config and a GitHub one
- [x] `--dry-run` writes nothing and names the resolved tracker and the exclusion set that would apply
- [x] `create-pr`, `create-branch`, `create-issue` install under both trackers

### Performance

- [x] No measurable change in wizard wall-clock time (filter is O(skills × 17) string matching)
- [x] Tarball download unchanged — one request, whole archive

### Code Quality

- [x] `npm test` green, including the new suite and the updated `setup-consumer-config.test.mjs` — `npm run ci:fast`: 2343 tests, 0 failures
- [x] New suite observed to run under the existing `shared/resources/tests/*.test.mjs` glob — its 35
      tests appear in the full-run output and `package.json` is unmodified (22 at first implementation; QA cycle 1
      added the 12-case install/run-time parity block, QA cycle 2 the SKILLS_CONFIG_FILE decoy case)
- [x] The classification-parity test exists and fails when a tracker skill is unclassified
- [x] Every fix mutation-proven per §8
- [x] `shellcheck scripts/setup-consumer.sh` no new warnings — **VERIFIED at Step 7** via the official
      `koalaman/shellcheck:stable` container (the binary is not installed on this host and no CI
      workflow runs it). Baseline `origin/develop`: 1 warning. This branch: 1 warning. Same warning,
      `SC2209` at `:223` (`ACCESS_TRACKER=command` — a false positive on a literal access-mode value),
      in code this task never touches: line 223 falls inside no hunk of the diff. **0 new warnings.**
- [x] New functions defined above the `SETUP_CONSUMER_NO_MAIN` hook so tests can reach them

### Migration

- [x] `getting-started.md` step 8 describes the filter and the grandfather rule
- [x] `--all-skills` documented in both the script header and `getting-started.md`
- [x] CHANGELOG `[Unreleased]` entry naming both counts and the grandfather guarantee
- [x] A real `--update` run against a full existing install verified to remove nothing — 20 skills before, 20 after, all 11 excluded-but-installed directories left byte-identical (local marker files survived)

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

- **Risk**: `--update` runs without the wizard. If `.env` is read before config, a stale `JIRA_URL` in a GitHub repo excludes the six GitHub-sync skills the consumer actually needs. The inverse also bit the first draft of this task: with a `""` final fallback, a GitHub consumer resolved *nothing* and the filter never fired at all — silently reverting the task to today's behaviour on its own headline path.
- **Probability**: Medium — `.env` files outlive the setup they were written for.
- **Impact**: High — removes working skills.
- **Mitigation**: `skills-config.yaml` is first in the resolution order and the `.env` probe is second-to-last; the order is asserted directly, including the `github` default (integration case 4). Grandfather means an existing install is unaffected regardless.
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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-04
**Quality Score**: 95/100
**Gate Decision**: PASS
**QA Cycles**: 3

### QA Reports

- **Cycle 3 (current)**: [task.83.qa.3.platform-aware-skill-exclusion.md](./task.83.qa.3.platform-aware-skill-exclusion.md) — PASS, 95/100
- **Cycle 2**: [task.83.qa.2.platform-aware-skill-exclusion.md](./task.83.qa.2.platform-aware-skill-exclusion.md) — CONCERNS, 80/100
- **Cycle 1**: [task.83.qa.1.platform-aware-skill-exclusion.md](./task.83.qa.1.platform-aware-skill-exclusion.md) — FAIL, 70/100
- **Gate File**: [task.83.gate.3.platform-aware-skill-exclusion.yml](./task.83.gate.3.platform-aware-skill-exclusion.yml)
- **Bug Reports**: [bug.1 — tracker resolution divergence](./task.83.bug.1.tracker-resolution-divergence.md), [bug.2 — .env probe asymmetry](./task.83.bug.2.env-probe-asymmetry.md), [bug.3 — test env scrub](./task.83.bug.3.test-env-scrub-incomplete.md) — all Ready for QA, all verified closed

### Test Coverage Summary

- **Tests Executed**: 2356 (`npm run ci:fast`, exit 0 — 0 failures, 1 skipped, prettier clean)
- **Phases Verified**: 4/4, all PASS
- **Open Issues**: none
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS
- **Mutation proofs**: 8 by QA across three cycles (M1–M8), plus the developer's 7

### Key Findings

Cycle 1 (FAIL) found the install-time resolver re-deriving the config parse instead of mirroring
`resolve-platform.sh` — a quoted or CRLF `tracker:` resolved the wrong platform, and a Jira repo
installed with none of its 11 Jira skills. Cycle 2's refute pass found the follow-on defect in cycle
1's own fix: an incomplete environment scrub in the new test helper. Cycle 3 confirmed all three
findings closed, each re-verified by re-running the check that produced it.

### The gap QA carried to Step 7 — closed there

The `shellcheck` criterion could not be closed by the QA loop (binary absent, no CI lane). Step 7
resolved it with the official `koalaman/shellcheck:stable` container: baseline 1 warning, this branch
1 warning, the same pre-existing `SC2209` in code the diff never touches. **0 new warnings** — met,
not waived. See `task.83.dod.1.*.md` § Step 4b.

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**Gate File:** `task.83.gate.3.platform-aware-skill-exclusion.yml`
**Gate Status:** ✅ PASS · **Quality Score:** 95/100 · **QA Cycles:** 3 (FAIL 70 → CONCERNS 80 → PASS 95)

All Definition of Done criteria verified:

✅ **Acceptance Criteria:** 20/20 §9 success criteria met, each evidenced by a named test rather than a claim
✅ **Tests:** `npm run ci:fast` — 2356 tests, 0 failures, 1 skipped, prettier clean
✅ **CI:** SUCCESS on head `6d2e644` (= local HEAD); all remaining changes are documentation only
✅ **PR Review:** Step 5c `/review-pr` — CONCERNS, no high-severity finding, all 3 findings actioned
✅ **Documentation:** CHANGELOG, `getting-started.md` step 8 and the script header all current; the CHANGELOG's token claim independently recomputed (1,505/11,702 = 12.9% vs the documented ~13%)
✅ **Security:** boundary probe mode fired on the install classifier — **14 candidates executed, 0 reproduced**. Probes covered substrings, superstrings, case, whitespace, regex and glob metacharacters, the empty name and both tracker sides
✅ **Code quality:** `shellcheck` **0 new warnings** vs the `origin/develop` baseline, run via the official container
⚠️ **Compliance:** NOT_APPLICABLE — a local install-time filter processes no regulated data
✅ **Bug reports:** 3 filed, 3 closed
✅ **Mutation proving:** 8 QA proofs (M1–M8) plus the developer's 7 — including the two properties this task named as its highest risks (the grandfather rule and the classification drift guard)

**Residual, recorded rather than hidden:** a repo with no `tracker:` key whose `JIRA_URL` is in `.env`
and never exported still resolves differently at install and run time. Bounded, grandfathered,
escapable via `--all-skills`, documented in the code and pinned by a test that names the follow-up.
Closing it properly means teaching `resolve-platform.sh` to read `.env` — its own task, un-filed.

**Tracker:** N/A *at the time of this run* — the task carried no `github_issue`, so every tracker
signal in the pipeline was skipped. **Linked retrospectively on 2026-09-04**: issue
[#316](https://github.com/Gamaroff/agent-skills/issues/316), closed, on the board at Done. The
record above is left as it stood at finalise rather than rewritten.

**Detailed Verification Log:** See `task.83.dod.1.platform-aware-skill-exclusion.md` for the full
evidence, including the executed probe set and the shellcheck baseline comparison.

**Task marked as ACCEPTED on:** 2026-09-04

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-02 | 1.0     | Initial draft | create-task |
| 2026-09-04 | 1.1     | Review 9/10 — fixed a Critical resolver defect (the order could never yield `github`, so the filter was inert for GitHub consumers on `--update`); corrected a false `package.json` glob claim; added the mandatory classification-parity test to Phase 3; relaxed the unachievable `--dry-run` parity criterion; restated skill counts relatively | review-task |
| 2026-09-04 |         | Status → ready-for-development | review-task |
| 2026-09-04 |         | Implemented — 6 files, 22 new tests (7 mutations proven) | develop |
| 2026-09-04 |         | Status → ready-for-review | develop |
| 2026-09-04 |         | QA gate FAIL (70/100) — 4 findings (1 HIGH, 1 MEDIUM, 2 LOW); install/runtime tracker resolution diverges on quoted and CRLF values | qa-task |
| 2026-09-04 |         | Status → in-progress (QA FAIL, fixes required) | qa-task |
| 2026-09-04 |         | QA findings fixed — CR-001 (resolver value parsing) and CR-002 (.env asymmetry documented + pinned), 1 iteration, 3 mutations proven; suite 22 → 34 tests | qa-fix |
| 2026-09-04 |         | Status → ready-for-review (awaiting QA re-review) | qa-fix |
| 2026-09-04 |         | QA cycle 2 gate CONCERNS (80/100) — both cycle-1 findings closed; refute pass found 1 new MEDIUM (test env scrub) | qa-task |
| 2026-09-04 |         | QA cycle 2 findings fixed — three copies of the test env-scrub list consolidated to hermeticEnv(); 2 mutations proven | qa-fix |
| 2026-09-04 |         | QA cycle 3 gate PASS (95/100) — all findings closed and re-verified; shellcheck criterion escalated to Step 7 | qa-task |
| 2026-09-04 | 1.2     | DoD verified — accepted (PR #315); shellcheck closed at 0 new warnings | finalise |
| 2026-09-04 |         | GitHub issue created (#316) | sync-github-task |
| 2026-09-04 |         | Status → accepted (issue closed) | sync-github-task |

---

## Progress Tracking

- [x] Phase 1 — Classification and resolver
- [x] Phase 2 — Wire the filter into the copy loop
- [x] Phase 3 — Tests
- [x] Phase 4 — Documentation
- [x] QA review complete — 3 cycles (FAIL 70 → CONCERNS 80 → PASS 95)
- [x] Quality gate PASS

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
