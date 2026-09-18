---
id: task.122
title: "[Task 122] Twelve skills carry bundled copies no discovery rule reaches: give --check an UNREACHED class, a discovery rule for the invocations that actually use them, and delete the dead ones"
type: task
description: "bundle_skill.py discovers a skill's shared dependencies transitively, then refreshes any further references/ copy that happens to have a shared/resources counterpart (source_backed_on_disk). Measured 2026-09-17: 12 skills, 15 copies that discovery never reaches — three are real dependencies (verify-push-state.sh in develop-story/-task/-bug) invoked from a bundled step doc as .agents/skills/{skill}/references/X with a bare placeholder, and twelve are dead (yaml-subset.js ×4, review-story-prepass-prompts.md, qa-task/qa-story step-0/step-1 docs ×4, qa-task resolve-paths.sh, set-github-project-priority.sh ×2). --check has no class for any of them, so the copies are kept byte-fresh and reported clean. Add an UNREACHED class (not regenerable), respell the one invocation to the {a|b|c} alternation form and add a discovery rule for it, and remove the dead copies. Observation #118; re-traced in review 1."
tags: [create-skill, bundler, bundle-check, references]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-17
updated: 2026-09-18
assignee:
estimated_effort_hours: 4
github_issue: 422
---

# Technical Task: Twelve skills carry bundled copies no discovery rule reaches

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.122.review.1.bundle-check-unreached-copies.md` implemented 2026-09-18
**GitHub Issue**: [#422](https://github.com/Gamaroff/agent-skills/issues/422)

---

## 1. Overview

`bundle_skill.py` has two populations: `needed` (what discovery reaches from the skill's own files,
transitively) and `source_backed_on_disk` (copies already in `references/` that mirror a shared file
but that discovery did not reach). The second population is refreshed on every bundle and compared on
every `--check`, and never reported — its docstring calls its members "stale copies, not orphans in
the risky sense". Measured with those two functions, that population is 15 files across 12 skills, and
it is two different things: three real dependencies the discovery regexes cannot see, and twelve dead
copies nothing references. (The task as drafted called eight "real" and two "prose"; review 1 traced
every copy to its invocation and found three and none — see the per-member evidence below.) This
task makes the population visible as a `--check` class, gives the real dependencies a discovery path
so they leave the population, and deletes the rest.

**Scope**: `bundle_skill.py` discovery and check; its test; the 15 copies.

## 2. Motivation

### Current Problems

1. **A copy that is refreshed but never discovered is a dependency nothing declares.**
   `verify-push-state.sh` in develop-story/-task/-bug is invoked from bundled shared text — exactly
   one site, `develop-pipeline-step-8-commit.md:108`:
   `bash .agents/skills/{skill}/references/verify-push-state.sh`. `discover_needed` deliberately does
   not follow `references/X` out of shared text (the `tracker-card-summary.md` rationale at
   `bundle_skill.py:409-416`), and no rule reads the `.agents/skills/…/references/` spelling at all.
   A consumer who deletes `references/` and re-bundles loses it; a fresh skill that cites the same
   step doc never gets it. Note the spelling: a bare `{skill}` **placeholder**, not a skill name and
   not the `{develop-story|develop-task|develop-bug}` alternation the step-0/2/3/4 docs use. That
   matters for the discovery rule (§3 Important Clarifications).
2. **Twelve copies are dead.** Per-member evidence (review 1, 2026-09-18):
   - `yaml-subset.js` ×4 in jira-sprint-manager, jira-sprint-retrospective, jira-sprint-review-prep,
     jira-epic-creator — zero mentions anywhere in those skills (last touched in the 2026-08
     access-resolver work).
   - `review-story-prepass-prompts.md` in review-story — zero mentions in the skill.
   - `develop-pipeline-step-0-resolve-and-prepare.md` and `develop-pipeline-step-1-create-branch.md`
     in **both** qa-task and qa-story, and `resolve-paths.sh` in qa-task — named only as bare
     filenames inside comments (`read-config.sh:710,727,787`, `resolve-platform.sh:588`,
     `gh-stage.js:521`), never invoked, never cited from `SKILL.md`. (`qa-story/SKILL.md:2906` cites
     `references/resolve-paths.sh`, which is why qa-story's copy of *that* file is discovered and
     qa-task's is not.)
   - `set-github-project-priority.sh` in create-task and create-story — `REFS_REF_RE` does **not**
     match either skill file: `create-task/SKILL.md:580` names it as a bare backticked filename and
     create-story has zero mentions. Had the regex matched, the copy would be in `needed` and could
     not be in this list. They are dead copies, not prose-kept ones; no reword is needed.
   All twelve are kept byte-identical to a source they no longer need.
3. **`--check` reports all fifteen as clean.** Its eight classes (STALE, MISSING, WRONG MODE,
   ORPHANED, SYMLINK, AMBIGUOUS, MISDECLARED, UNREADABLE) cover files whose source moved or whose
   provenance is unclear; none covers a file whose source is fine and whose *reason to exist* is
   missing. The freshness check is the mechanism that hides them.

### Benefits

1. The three real dependencies become discovered: `needed` gains them, `source_backed_on_disk`
   loses them, and a fresh bundle from an empty `references/` produces a working skill.
2. Twelve dead copies leave the tree — small, but each is a `references/` entry a reader of the
   skill has to rule out.
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
  + follows  .agents/skills/{this-skill}/references/X   from shared .md/.sh text   (new INVOKE_REF_RE)
    — only when {this-skill} is a literal skill name equal to the one being bundled, or a
      {a|b|c} alternation containing it; a bare {placeholder} group is NEVER followed
    — so a step doc that names develop-story's path does not vendor into develop-task
shared/resources/develop-pipeline-step-8-commit.md:108
  {skill}  →  {develop-story|develop-task|develop-bug}     (one-line respell; the form step-0/2/3/4 use)
source_backed_on_disk  unchanged (membership), but check_skill reports each member:
  UNREACHED  — 'source-backed copy no discovery rule reaches; add a discovery path
                from the skill or delete the copy'   (NOT in REGENERABLE)
bundle_skill  unchanged for the write; prints the UNREACHED count per skill
tree          15 → 12 (the dead ones) after the respell + rule land → 0 after the 12 are deleted
```

### Important Clarifications

- **Why not follow `references/X` out of shared text.** The 2026-08 change that stopped doing so
  removed 38 unwanted vendored files (`tracker-card-summary.md` names `references/jira-sync.js` in
  prose). The new rule keys on the *invocation* spelling, which carries the skill name, so it can be
  scoped to the skill being bundled and cannot over-match the way the bare form did.
- **A bare `{placeholder}` group is never followed, and this is measured, not cautious.** Four shared
  docs write `.agents/skills/{skill}/references/X` with a bare placeholder (`document-change-log.md:184`
  → `change-log.js`, `tracker-comment-contract.md` → `tracker-comment.js`,
  `pr-inline-comment-contract.md` → `pr-inline-comment.js`, `develop-pipeline-step-8-commit.md:108`
  → `verify-push-state.sh`). Reading `{skill}` as "whichever skill bundles this doc" would vendor
  `change-log.js` into the 24 skills that bundle `document-change-log.md` and do not carry it — the
  38-file over-match again. So the rule follows a literal skill name or a `{a|b|c}` alternation only,
  and the one placeholder site that is a real invocation (`step-8-commit.md:108`) is respelled to the
  alternation in Phase 2. The other three placeholder sites are already discovered by other rules and
  need no change.
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
   followed only for a literal skill name equal to the current skill or a `{a|b|c}` alternation
   containing it — never a bare `{placeholder}`.
✅ **Respell**: `develop-pipeline-step-8-commit.md:108` `{skill}` → `{develop-story|develop-task|develop-bug}`
   (the spelling its sibling step docs already use), so the rule reaches the three real copies.
✅ **Check**: `UNREACHED` class, remedy text, excluded from `REGENERABLE`; `check_all` summary
   counts it.
✅ **Tests**: fixture with an undiscovered source-backed copy → `classesFound == ["UNREACHED"]`;
   check → bundle → check still reports it; fixture with the invocation spelling → discovered, not
   reported.
✅ **Tree**: delete the twelve dead copies; confirm `--check --all` reports zero UNREACHED afterwards.
✅ `package_skill.py` — shares the discovery regexes; confirm it picks up the new rule or add it.

### Out of Scope

❌ Following bare `references/X` out of shared text (re-opens the 38-file over-match).
❌ A `--fix` that deletes UNREACHED copies (the bundler never unlinks; keep it that way).
❌ Rewriting `.agents/skills/…/references/X` invocations into a non-`.agents/skills` spelling. (The
   `{skill}` → `{a|b|c}` respell of one line in step-8-commit.md is in scope; it keeps the spelling.)
❌ Following a bare `{placeholder}` group as a wildcard (measured: +24 `change-log.js` copies).
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
- [x] `check_skill`: after building `expected`, report every `reconcilable` key not in `needed` as
      `UNREACHED` (in addition to the STALE/MISSING comparison it already gets).
- [x] `REMEDIES['UNREACHED']`; assert it is absent from `REGENERABLE`.
- [x] Test: fixture skill with `references/foo.md` mirroring `shared/resources/foo.md` and no
      mention of it → `["UNREACHED"]`; bundle; check → still `["UNREACHED"]`.
- [x] Run `--check --all` on the live tree and record the 15 findings in the implementation report
      (this is the baseline the task document predicts; the test records the number going forward).

**Dependencies**: none.

### Phase 2: discovery rule for the invocation spelling

**Risk Level**: Medium — a discovery regex that over-matches vendors files; under-matches leaves
Phase 1 red.

**Files**: `skills/create-skill/scripts/bundle_skill.py`, `skills/create-skill/scripts/package_skill.py`
(if it does not import the regexes), `tests/bundle-check-mode.test.js`

**Changes**:
- [x] `INVOKE_REF_RE` matching `.agents/skills/(\{[A-Za-z0-9|-]+\}|[A-Za-z0-9-]+)/references/([A-Za-z0-9._-]+)`;
      in the shared-text pass, follow only matches whose skill group equals the skill being bundled,
      or is a `{a|b|c}` alternation containing it (the step-0/2/3/4 docs write
      `.agents/skills/{develop-story|develop-task|develop-bug}/references/…`). A brace group with no
      `|` — a bare placeholder such as `{skill}` — yields `names == ['skill']`, matches no skill, and
      is thereby not followed; assert that in the test, do not special-case it.
- [x] Respell `shared/resources/develop-pipeline-step-8-commit.md:108` from
      `.agents/skills/{skill}/references/verify-push-state.sh` to
      `.agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh`.
- [x] Test: fixture shared doc invoking `.agents/skills/fx/references/tool.sh` → `tool.sh` in
      `needed` for skill `fx`, absent for skill `other`; alternation `{fx|other}` → present for both;
      bare `{skill}` → absent for both.
- [x] `npm run bundle`; confirm the three `verify-push-state.sh` copies now report nothing and
      `git status` shows no *new* `references/` files anywhere (the over-match check).

**Dependencies**: Phase 1 (the class is what shows the rule worked).

### Phase 3: delete the dead copies

**Risk Level**: Low

**Files**: the twelve copies listed in §7 Files to Delete.

**Changes**:
- [x] `git rm` each; `npm run bundle`; confirm none returns.
- [x] `python3 skills/create-skill/scripts/bundle_skill.py --check` → 0 UNREACHED across the tree.
- [x] Mutation-prove: restore one deleted copy from git, run `--check`, confirm it is named; delete again.

**Dependencies**: Phase 2.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-skill/scripts/bundle_skill.py` — `UNREACHED` class, `INVOKE_REF_RE`, summary count
2. ✅ `skills/create-skill/scripts/package_skill.py` — same discovery rule, if not shared

### Files to Modify (Tests)

3. ✅ `tests/bundle-check-mode.test.js` — UNREACHED fixture, non-regenerable proof, invocation-rule fixture

   **Two bundler defects the class exposed on first run, fixed in the same file (`bundle_skill.py`):**
   `_within()` used `Path.resolve()`, which follows a symlink sitting at `references/X` out of the
   tree and made discovery refuse a name the skill cites (the copy then read UNREACHED beside
   SYMLINK) — first made lexical, then corrected in QA cycle 1 to resolve the parent and judge the
   leaf (see below); and `REFS_REF_RE` could not capture a nested name
   (`references/sub/inner.md`), so a nested reference pass 3 had rewritten in place was never
   rediscovered and survived only by reconciliation (`tests/bundle-link-rewrite.test.js` went red
   the moment UNREACHED existed) — the class now admits `/`. Neither is a new rule; each is a
   discovery path that was silently failing.

   **QA cycle 1 fix (TASK-122-BUG-1):** `_within` now resolves the *parent* and judges the *leaf*
   lexically — a symlinked intermediate directory is refused (as on `develop`), a symlink at the leaf
   still passes and reports `SYMLINK`, a `..`/empty leaf is refused; `writable_copy` additionally
   refuses a symlinked component between the references root and the copy (`_symlinked_component`,
   `_skip_reason`); `discover_needed` admits sources on `is_file()` so a directory citation is skipped
   rather than crashing. Five fixtures added (test file 37 → 42). CR-2/3/4 cleanups applied.

   **QA cycle 2 fix (TASK-122-CR2-1/2):** `check_skill` reports a name under a symlinked
   *intermediate* directory as `SYMLINK` (component named) before the `exists()` test, so the
   check's population and remedy match the writer's for an in-tree link; `_symlinked_component`'s
   docstring and the CHANGELOG now describe the shipped rule (parent resolved, leaf lexical; `rglob`
   behaviour differs by Python version). `_within` simplified (CR-3). One fixture added (42 → 43).

### Files to Modify (Documentation)

4. ✅ `skills/create-skill/SKILL.md` or its bundling reference — one paragraph: what UNREACHED means,
   the two remedies, and that a bare `{placeholder}` invocation is invisible to discovery
5. ✅ `AGENTS.md` § Shared Resources — one sentence pointing at the class
5a. ✅ `.github/workflows/validate.yml` — the `--check` comment names five invisible classes, not four
5b. ✅ `CHANGELOG.md` — Unreleased entry
6. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — line 108 respell (`{skill}` →
   `{develop-story|develop-task|develop-bug}`); its three bundled copies refresh via `npm run bundle`

### Files to Delete

7. ❌ `skills/jira-sprint-manager/references/yaml-subset.js`
8. ❌ `skills/jira-sprint-retrospective/references/yaml-subset.js`
9. ❌ `skills/jira-sprint-review-prep/references/yaml-subset.js`
10. ❌ `skills/jira-epic-creator/references/yaml-subset.js`
11. ❌ `skills/review-story/references/review-story-prepass-prompts.md`
12. ❌ `skills/qa-task/references/develop-pipeline-step-0-resolve-and-prepare.md`
13. ❌ `skills/qa-task/references/develop-pipeline-step-1-create-branch.md`
14. ❌ `skills/qa-task/references/resolve-paths.sh`
15. ❌ `skills/qa-story/references/develop-pipeline-step-0-resolve-and-prepare.md`
16. ❌ `skills/qa-story/references/develop-pipeline-step-1-create-branch.md`
17. ❌ `skills/create-task/references/set-github-project-priority.sh` — a dead copy; `REFS_REF_RE`
    does not match the bare-name mention at `SKILL.md:580`, so no reword is needed
18. ❌ `skills/create-story/references/set-github-project-priority.sh` — same (zero mentions)

## 8. Testing Strategy

### Unit Tests

**Scope**: `check_skill` classification and `discover_needed` rule.

**Actions**:
- [x] UNREACHED reported for an undiscovered source-backed copy; not reported once a skill file cites it.
- [x] Invocation spelling discovered for the named skill only; alternation form handled; bare
      `{placeholder}` form not followed.
- [x] Non-UTF-8 and symlinked members still take their existing classes, not UNREACHED.

**Command**: `node --test tests/bundle-check-mode.test.js`

### Integration Tests

- [x] `--check --all` on the tree: 15 before Phase 2, 12 after Phase 2, 0 after Phase 3.
- [x] `npm run bundle:check` green on the final tree; `tests/bundled-links.test.js` green.

### Contract Tests

- [x] `REGENERABLE` membership test (existing, measurement-based) covers UNREACHED as non-regenerable.

### Performance Tests

Not applicable — one additional regex pass over already-read text.

### Consumer Tests

- [x] `setup-consumer.sh` tarball of `develop-task` from a tree with `references/` deleted and
      re-bundled contains `verify-push-state.sh`.

## 9. Success Criteria

### Functional
- [x] `--check` reports UNREACHED for every source-backed undiscovered copy and nothing else changes class.
- [x] `verify-push-state.sh` is in `needed` for develop-story, develop-task and develop-bug, and in
      `needed` for no other skill that did not already have it (`git status` clean of new copies).
- [x] Zero UNREACHED on the merged tree.

### Performance
- [x] `--check --all` wall time within noise of today's.

### Code Quality
- [x] Every new test has a mutation proof recorded; the fixture is built with the existing helper
      (not `os.tmpdir()` paths that a validator may reject — see obs #17).
- [x] No second definition of the discovery rules in `package_skill.py`.

### Migration
- [x] Twelve copies gone; observation #118 `actioned` with the PR number.

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
- **Validation**: `--check --all` green; the 15 copies present again (12 deleted + 3 refreshed).

### Partial Rollback (1–2 hours)
- Keep Phase 1 (report only) and revert Phases 2–3: the class shows 15 findings and CI stays red
  until they are addressed — acceptable only briefly; prefer full revert.

### Forward Fix
- A single mis-deleted copy: restore it and add a citation from the skill.

### Rollback Triggers
- **Critical**: a consumer tarball loses a file it invokes.
- **Non-critical**: remedy wording; summary formatting.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-18
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.122.qa.2.bundle-check-unreached-copies.md](./task.122.qa.2.bundle-check-unreached-copies.md) (cycle 1: [task.122.qa.1.bundle-check-unreached-copies.md](./task.122.qa.1.bundle-check-unreached-copies.md))
- **Gate File**: [task.122.gate.2.bundle-check-unreached-copies.yml](./task.122.gate.2.bundle-check-unreached-copies.yml)

### Test Coverage Summary
- **Tests Executed**: 3453 (`ci:fast`) + 78 bundler-suite + 42 under `TMPDIR=/tmp`
- **Phases Verified**: 3/3
- **Critical Issues**: 0 HIGH, 0 MEDIUM, 2 LOW open (TASK-122-CR2-1, CR2-2); TASK-122-BUG-1 closed
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
BUG-1 verified fixed (repro refused, 13-shape probe clean, mutants red) — [bug 1 closed](./task.122.bug.1.within-lexical-symlinked-parent-escape.md). Cycle-2 refute pass: for an in-tree symlinked intermediate the writer refuses the copy while `--check` reports it `MISSING` under the regenerate remedy (CR2-1); docstring and CHANGELOG describe the superseded lexical rule (CR2-2). Both low; one more fix cycle.
## Change Log
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-17 | 1.0 | Initial draft | create-task |
| 2026-09-18 | 1.1 | Review 1 (7/10 → 9/10 after fixes): population re-traced per member — 3 real deps (not 8), 12 dead (not 5), 0 prose; Phase 2 redesigned around the `{a\|b\|c}` alternation (bare `{skill}` placeholder never followed, wildcard measured at +24 copies); step-8-commit.md:108 respell added; Files to Delete 7 → 12; progression 15 → 12 → 0 | review-task |
| 2026-09-18 |  | Status → ready-for-development | review-task |
| 2026-09-18 |  | Implemented — 9 files modified, 12 deleted, 8 new tests (bundle-check-mode 29 → 37); 15 → 12 → 0 UNREACHED measured; 6 mutants caught | develop |
| 2026-09-18 |  | QA gate CONCERNS (90/100) — 1 medium finding (TASK-122-BUG-1), 3 advisory cleanups | qa-task |
| 2026-09-18 |  | QA findings fixed — TASK-122-BUG-1 (parent-resolving _within, write-gate symlink component, is_file), CR-2/3/4; 5 fixtures, 5 mutants covered; 1 iteration | qa-fix |
| 2026-09-18 |  | QA gate CONCERNS (90/100) — BUG-1 closed; 2 low findings from the refute pass (CR2-1 check/writer divergence on an in-tree symlinked intermediate, CR2-2 docstring/CHANGELOG wording) | qa-task |
| 2026-09-18 |  | QA findings fixed — TASK-122-CR2-1 (check_skill SYMLINK branch for a symlinked intermediate), CR2-2 (docstring/CHANGELOG wording), CR-3; 1 fixture, 3 mutants covered; 1 iteration | qa-fix |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: UNREACHED class + test
- [x] Phase 2: invocation discovery rule + step-8 respell
- [x] Phase 3: delete dead copies, zero UNREACHED
- [ ] QA: `task.122.qa.[N].bundle-check-unreached-copies.md`
- [ ] Gate: `task.122.gate.[N].bundle-check-unreached-copies.yml`

## References

- Observation #118 (this task); related #83, #114, #64 (bundler, separately shippable)
- `bundle_skill.py` `discover_needed` (l.400), `source_backed_on_disk` (l.488), `check_skill` (l.867), `REGENERABLE` (l.760)
- `tests/bundle-check-mode.test.js` — the measurement-based `REGENERABLE` proof to extend
- task.98 (`bundle-freshness-check-mode`) — the check this extends; task.108 — the link re-relativiser
- [task.122.review.1.bundle-check-unreached-copies.md](task.122.review.1.bundle-check-unreached-copies.md) —
  the per-member trace behind the 3/12 split and the `{skill}`-wildcard measurement

## Notes

Bugs found during QA land at `task.122.bug.[N].[name].md` in this directory.
