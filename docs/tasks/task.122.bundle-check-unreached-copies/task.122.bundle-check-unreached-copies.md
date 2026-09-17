---
id: task.122
title: "[Task 122] Twelve skills carry bundled copies no discovery rule reaches: give --check an UNREACHED class, a discovery rule for the invocations that actually use them, and delete the dead ones"
type: task
description: "bundle_skill.py discovers a skill's shared dependencies transitively, then refreshes any further references/ copy that happens to have a shared/resources counterpart (source_backed_on_disk). Measured 2026-09-17: 12 skills, 15 copies that discovery never reaches — eight are real dependencies invoked only as .agents/skills/{skill}/references/X from inside another bundled file, five are dead (yaml-subset.js ×4, review-story-prepass-prompts.md), two are prose mentions. --check has no class for any of them, so the copies are kept byte-fresh and reported clean. Add an UNREACHED class (not regenerable), a discovery rule for the invocation spelling, and remove the dead copies. Observation #118."
tags: [create-skill, bundler, bundle-check, references]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-09-17
updated: 2026-09-17
assignee:
estimated_effort_hours: 4
github_issue: 422
---

# Technical Task: Twelve skills carry bundled copies no discovery rule reaches

**Status:** Planned
**GitHub Issue**: [#422](https://github.com/Gamaroff/agent-skills/issues/422)

---

## 1. Overview

`bundle_skill.py` has two populations: `needed` (what discovery reaches from the skill's own files,
transitively) and `source_backed_on_disk` (copies already in `references/` that mirror a shared file
but that discovery did not reach). The second population is refreshed on every bundle and compared on
every `--check`, and never reported — its docstring calls its members "stale copies, not orphans in
the risky sense". Measured with those two functions, that population is 15 files across 12 skills, and
it is three different things: real dependencies the discovery regexes cannot see, dead copies nothing
references, and prose mentions. This task makes the population visible as a `--check` class, gives the
real dependencies a discovery path so they leave the population, and deletes the rest.

**Scope**: `bundle_skill.py` discovery and check; its test; the 15 copies.

## 2. Motivation

### Current Problems

1. **A copy that is refreshed but never discovered is a dependency nothing declares.**
   `verify-push-state.sh` in develop-task/-story/-bug and `resolve-paths.sh` plus two step docs in
   qa-task/qa-story are invoked from bundled shared text as `.agents/skills/{skill}/references/X`.
   `discover_needed` deliberately does not follow `references/X` out of shared text (the
   `tracker-card-summary.md` rationale at `bundle_skill.py:409-416`), and no rule reads the
   `.agents/skills/…/references/` spelling at all. A consumer who deletes `references/` and re-bundles
   loses them; a fresh skill that cites the same step doc never gets them.
2. **Five copies are dead.** `yaml-subset.js` in jira-sprint-manager, jira-sprint-retrospective,
   jira-sprint-review-prep and jira-epic-creator; `review-story-prepass-prompts.md` in review-story.
   Nothing in those skills mentions them (last touched in the 2026-08 access-resolver work). They are
   kept byte-identical to a source they no longer need.
3. **Two are prose.** `set-github-project-priority.sh` in create-task and create-story is named in a
   parenthetical ("unlike the GitHub path, which calls …") — a mention, not an invocation, and the
   `REFS_REF_RE` match on the skill's own file is what keeps the copy alive.
4. **`--check` reports all fifteen as clean.** Its eight classes (STALE, MISSING, WRONG MODE,
   ORPHANED, SYMLINK, AMBIGUOUS, MISDECLARED, UNREADABLE) cover files whose source moved or whose
   provenance is unclear; none covers a file whose source is fine and whose *reason to exist* is
   missing. The freshness check is the mechanism that hides them.

### Benefits

1. The real dependencies become discovered: `needed` gains them, `source_backed_on_disk` loses them,
   and a fresh bundle from an empty `references/` produces a working skill.
2. Five dead files and two prose-only copies leave the tree — small, but each is a `references/`
   entry a reader of the skill has to rule out.
3. `--check` gains a class whose remedy is a decision ("add a discovery path or delete the copy"),
   not a regenerate — the same shape as ORPHANED and AMBIGUOUS.
4. The next copy that enters the tree through the back door is reported at the next `--check`,
   which runs in CI.

## 3. Technical Background

### Current Architecture

```
discover_needed(skill)                      # seeds: skill files (not references/)
  follows  shared/resources/X                 everywhere
  follows  references/X                       from skill files only  (REFS_REF_RE)
  follows  require('./X') / source ./X        from shared .js/.sh
  does NOT follow references/X or .agents/skills/*/references/X from shared text
source_backed_on_disk(refs, shared, needed)  # anything else on disk with a shared twin
bundle_skill  → writes needed ∪ reconcilable
check_skill   → compares needed ∪ reconcilable; reports 8 classes; reconcilable-only is invisible
```

### Target Architecture

```
discover_needed(skill)
  + follows  .agents/skills/{this-skill}/references/X   from shared .md/.sh text   (new INVOKE_RE)
    — only when {this-skill} names the skill being bundled, so a step doc that names
      develop-story's path does not vendor into develop-task
source_backed_on_disk  unchanged (membership), but check_skill reports each member:
  UNREACHED  — 'source-backed copy no discovery rule reaches; add a discovery path
                from the skill or delete the copy'   (NOT in REGENERABLE)
bundle_skill  unchanged for the write; prints the UNREACHED count per skill
tree          15 → 0 UNREACHED after the rule lands and 7 copies are deleted
```

### Important Clarifications

- **Why not follow `references/X` out of shared text.** The 2026-08 change that stopped doing so
  removed 38 unwanted vendored files (`tracker-card-summary.md` names `references/jira-sync.js` in
  prose). The new rule keys on the *invocation* spelling, which carries the skill name, so it can be
  scoped to the skill being bundled and cannot over-match the way the bare form did.
- **`UNREACHED` is not regenerable.** `tests/bundle-check-mode.test.js` verifies `REGENERABLE`
  membership by measurement (check → bundle → check); a bundle run refreshes an UNREACHED copy and
  does not clear it, so the class belongs with ORPHANED/AMBIGUOUS, and the test must assert that.
- **Membership vs writability is unchanged.** `source_backed_on_disk` still decides "our concern",
  `writable_copy` still decides "may write" — this task adds a report, not a write path.
- **Deleting a copy is a tree edit, not a bundler action.** The bundler never unlinks; the seven
  deletions are ordinary `git rm` in Phase 3, and the check is what keeps them from returning.

## 4. Scope

### In Scope

✅ **Discovery**: one regex for `.agents/skills/{skill}/references/X` in shared `.md`/`.sh` text,
   scoped to the current skill's name.
✅ **Check**: `UNREACHED` class, remedy text, excluded from `REGENERABLE`; `check_all` summary
   counts it.
✅ **Tests**: fixture with an undiscovered source-backed copy → `classesFound == ["UNREACHED"]`;
   check → bundle → check still reports it; fixture with the invocation spelling → discovered, not
   reported.
✅ **Tree**: delete the five dead and two prose-only copies; confirm `--check --all` reports zero
   UNREACHED afterwards.
✅ `package_skill.py` — shares the discovery regexes; confirm it picks up the new rule or add it.

### Out of Scope

❌ Following bare `references/X` out of shared text (re-opens the 38-file over-match).
❌ A `--fix` that deletes UNREACHED copies (the bundler never unlinks; keep it that way).
❌ Rewriting the `.agents/skills/{skill}/…` invocations into some other spelling.
❌ Observations #83 (transitive closure of a citation) and #114 (literal-as-instruction) — related
   bundler work, separately shippable.

## 5. Breaking Changes

None. `--check` may go red in CI on the merge that adds the class if any copy is missed in Phase 3
— that is the class working; the remedy line names the file.

## 6. Implementation Plan

> Detailed implementation guide: [task.122.plan.bundle-check-unreached-copies.md](task.122.plan.bundle-check-unreached-copies.md)

### Phase 1: `UNREACHED` in `--check`

**Risk Level**: Low

**Files**: `skills/create-skill/scripts/bundle_skill.py`, `tests/bundle-check-mode.test.js`

**Changes**:
- [ ] `check_skill`: after building `expected`, report every `reconcilable` key not in `needed` as
      `UNREACHED` (in addition to the STALE/MISSING comparison it already gets).
- [ ] `REMEDIES['UNREACHED']`; assert it is absent from `REGENERABLE`.
- [ ] Test: fixture skill with `references/foo.md` mirroring `shared/resources/foo.md` and no
      mention of it → `["UNREACHED"]`; bundle; check → still `["UNREACHED"]`.
- [ ] Run `--check --all` on the live tree and record the 15 findings in the implementation report
      (this is the baseline the task document predicts; the test records the number going forward).

**Dependencies**: none.

### Phase 2: discovery rule for the invocation spelling

**Risk Level**: Medium — a discovery regex that over-matches vendors files; under-matches leaves
Phase 1 red.

**Files**: `skills/create-skill/scripts/bundle_skill.py`, `skills/create-skill/scripts/package_skill.py`
(if it does not import the regexes), `tests/bundle-check-mode.test.js`

**Changes**:
- [ ] `INVOKE_REF_RE` matching `.agents/skills/([A-Za-z0-9-]+)/references/([A-Za-z0-9._-]+)`; in the
      shared-text pass, follow only matches whose skill group equals the skill being bundled, or is a
      `{a|b|c}` alternation containing it (the qa-loop doc writes
      `.agents/skills/{develop-story|develop-task|develop-bug}/references/…`).
- [ ] Test: fixture shared doc invoking `.agents/skills/fx/references/tool.sh` → `tool.sh` in
      `needed` for skill `fx`, absent for skill `other`.
- [ ] `npm run bundle`; confirm the eight real dependencies now report nothing.

**Dependencies**: Phase 1 (the class is what shows the rule worked).

### Phase 3: delete the dead copies

**Risk Level**: Low

**Files**: the seven copies listed in §7 Files to Delete.

**Changes**:
- [ ] `git rm` each; `npm run bundle`; confirm none returns.
- [ ] `python3 skills/create-skill/scripts/bundle_skill.py --check` → 0 UNREACHED across the tree.
- [ ] Mutation-prove: restore one deleted copy from git, run `--check`, confirm it is named; delete again.

**Dependencies**: Phase 2.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-skill/scripts/bundle_skill.py` — `UNREACHED` class, `INVOKE_REF_RE`, summary count
2. ✅ `skills/create-skill/scripts/package_skill.py` — same discovery rule, if not shared

### Files to Modify (Tests)

3. ✅ `tests/bundle-check-mode.test.js` — UNREACHED fixture, non-regenerable proof, invocation-rule fixture

### Files to Modify (Documentation)

4. ✅ `skills/create-skill/SKILL.md` or its bundling reference — one paragraph: what UNREACHED means and
   the two remedies
5. ✅ `AGENTS.md` § Shared Resources — one sentence pointing at the class

### Files to Delete

6. ❌ `skills/jira-sprint-manager/references/yaml-subset.js`
7. ❌ `skills/jira-sprint-retrospective/references/yaml-subset.js`
8. ❌ `skills/jira-sprint-review-prep/references/yaml-subset.js`
9. ❌ `skills/jira-epic-creator/references/yaml-subset.js`
10. ❌ `skills/review-story/references/review-story-prepass-prompts.md`
11. ❌ `skills/create-task/references/set-github-project-priority.sh` — after rewording the prose mention
    so `REFS_REF_RE` no longer matches it (or accept the copy and drop this line; decide in review)
12. ❌ `skills/create-story/references/set-github-project-priority.sh` — same

## 8. Testing Strategy

### Unit Tests

**Scope**: `check_skill` classification and `discover_needed` rule.

**Actions**:
- [ ] UNREACHED reported for an undiscovered source-backed copy; not reported once a skill file cites it.
- [ ] Invocation spelling discovered for the named skill only; alternation form handled.
- [ ] Non-UTF-8 and symlinked members still take their existing classes, not UNREACHED.

**Command**: `node --test tests/bundle-check-mode.test.js`

### Integration Tests

- [ ] `--check --all` on the tree: 15 before Phase 2, 7 after Phase 2, 0 after Phase 3.
- [ ] `npm run bundle:check` green on the final tree; `tests/bundled-links.test.js` green.

### Contract Tests

- [ ] `REGENERABLE` membership test (existing, measurement-based) covers UNREACHED as non-regenerable.

### Performance Tests

Not applicable — one additional regex pass over already-read text.

### Consumer Tests

- [ ] `setup-consumer.sh` tarball of `develop-task` from a tree with `references/` deleted and
      re-bundled contains `verify-push-state.sh`.

## 9. Success Criteria

### Functional
- [ ] `--check` reports UNREACHED for every source-backed undiscovered copy and nothing else changes class.
- [ ] The eight real dependencies are in `needed` for their skills.
- [ ] Zero UNREACHED on the merged tree.

### Performance
- [ ] `--check --all` wall time within noise of today's.

### Code Quality
- [ ] Every new test has a mutation proof recorded; the fixture is built with the existing helper
      (not `os.tmpdir()` paths that a validator may reject — see obs #17).
- [ ] No second definition of the discovery rules in `package_skill.py`.

### Migration
- [ ] Seven copies gone; observation #118 `actioned` with the PR number.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **Invocation regex over-matches** — a shared doc that names another skill's path vendors into
   the wrong skill.
   - Probability: Medium · Impact: Medium (bundle bloat, not breakage)
   - Mitigation: scope to the current skill name; test the negative case; run `--check --all` and
     diff `git status` for unexpected new copies before committing.
2. **A "dead" copy is used by a consumer through a path the repo does not exercise.**
   - Probability: Low · Impact: Low (the source still exists; re-adding a citation restores it)
   - Mitigation: grep each deletion across `skills/`, `shared/`, `docs/`, `scripts/` and the
     evals before removing.

### Low Risk
1. **CI goes red on the class before Phase 3 lands** — ship the three phases in one PR.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: `--check` red in CI on a copy the task cannot classify; a consumer install missing a file.
- **Steps**: `git revert` the merge; `npm run bundle`; commit.
- **Validation**: `--check --all` green; the 15 copies present again.

### Partial Rollback (1–2 hours)
- Keep Phase 1 (report only) and revert Phases 2–3: the class shows 15 findings and CI stays red
  until they are addressed — acceptable only briefly; prefer full revert.

### Forward Fix
- A single mis-deleted copy: restore it and add a citation from the skill.

### Rollback Triggers
- **Critical**: a consumer tarball loses a file it invokes.
- **Non-critical**: remedy wording; summary formatting.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: UNREACHED class + test
- [ ] Phase 2: invocation discovery rule
- [ ] Phase 3: delete dead copies, zero UNREACHED
- [ ] QA: `task.122.qa.[N].bundle-check-unreached-copies.md`
- [ ] Gate: `task.122.gate.[N].bundle-check-unreached-copies.yml`

## References

- Observation #118 (this task); related #83, #114, #64 (bundler, separately shippable)
- `bundle_skill.py` `discover_needed` (l.400), `source_backed_on_disk` (l.488), `check_skill` (l.867), `REGENERABLE` (l.760)
- `tests/bundle-check-mode.test.js` — the measurement-based `REGENERABLE` proof to extend
- task.98 (`bundle-freshness-check-mode`) — the check this extends; task.108 — the link re-relativiser

## Notes

Bugs found during QA land at `task.122.bug.[N].[name].md` in this directory.
