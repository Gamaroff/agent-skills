---
id: task.193
title: "Scripts reach only the skills that run them"
type: task
description: "Classify every script a shared/resources/*.md names by its shared/resources/ literal in prose, switch the unneeded ones to bare filenames and remove their unreached bundled copies, and add a guard that fails on a new prose script literal not in a reasoned allowlist; also pin create-skill's shared-literal rule sentence."
tags: [create-skill, bundler, observation, shared-resources, guard]
category: refactoring
status: planned
priority: Medium
created: 2026-10-07
updated: 2026-10-07
assignee:
estimated_effort_hours: 8
github_issue: 592
---

# Technical Task: Scripts reach only the skills that run them

**Status:** Planned
**GitHub Issue**: [#592](https://github.com/Gamaroff/agent-skills/issues/592)

---

## 1. Overview

Inside `shared/resources/`, a `shared/resources/<file>` literal is an instruction to the bundler, not
a reference (AGENTS.md § Shared Resources; `skills/create-skill/SKILL.md` § "Inside
`shared/resources/`, a `shared/resources/` literal is a bundling instruction"). When a shared
document names a script that way in prose, the script is copied into every skill that bundles the
document, whether or not that skill runs it. `grant-qa-cycles.sh` was copied into `develop-bug`,
`qa-story`, `qa-task` and `review-pr`, none of which calls it (obs #263). No test notices, because
`bundle:check` sees the copies as reached. This task classifies every such literal, fixes the
unneeded ones, and adds a guard so a new one has to be justified. It also pins create-skill's rule
sentence so the bundler cannot rewrite it again (obs #289).

**Scope**: the prose script literals in `shared/resources/*.md`, the bundled copies they create,
two new tests, and a CHANGELOG entry.

**Key deliverables**:

1. A per-literal classification (witness per member) in the plan: **needed** (every skill that
   bundles the citing document runs the script) or **not needed**.
2. Not-needed literals switched to bare filenames, their unreached copies removed with `git rm`.
3. `tests/shared-script-literals.test.js`: a prose script literal outside a `<!-- cite: … -->` wrapper
   and not on the reasoned allowlist fails. A pin on create-skill's rule sentence.

---

## 2. Motivation

### Current Problems

1. **A prose mention vendors a script into skills that never run it** (obs #263).
   `develop-pipeline-resume-contract.md:551` reads ``Source: `shared/resources/grant-qa-cycles.sh` ``.
   Six skills now carry `references/grant-qa-cycles.sh` (`ls skills/*/references/grant-qa-cycles.sh`
   on `b36d7d32`). Only `develop-story` and `develop-task` run it. task.170 copied the line shape for
   `reenter-qa-after-finalise.sh`, and was caught only because `npm run bundle` printed untracked
   copies.
2. **Nothing mechanical checks the rule.** `bundle:check` passes because the copies are committed and
   reached. The only existing guard covers `.js`/`.mjs` comments (`tests/bundle-comment-origin.test.js`).
3. **The rule's own sentence was once rewritten by the bundler** (obs #175, carried in #289). PR #585
   reworded it; nothing stops a future edit restoring a literal the bundler then rewrites.

### Benefits

- A skill carries only the scripts it runs.
- A new prose script literal is either justified in one place or rejected by CI.
- The create-skill rule stays readable in every bundled form.

---

## 3. Technical Background

### Current Architecture

- **Bundler**: `SHARED_REF_RE = re.compile(r'(?<![\w-]/)(?:\.\./)*shared/resources/([^\s`\'")\]*]+)')`
  (`skills/create-skill/scripts/bundle_skill.py:45`) matches any `shared/resources/<file>` literal,
  in prose or code. A match is a dependency; a fragment link to an `.md` is a citation; a mention inside
  `<!-- cite: … -->` is a citation.
- **Population** (measured on `b36d7d32`, definition in § 8): 47 script literals (`.sh`, `.js`, `.mjs`)
  in `shared/resources/*.md`. 13 are inside a fence or on an invocation line; **34 are in prose**,
  across 15 documents. The per-member list is in the plan.
- **The incident line** is still present: `develop-pipeline-resume-contract.md:551`
  (``Source: `shared/resources/grant-qa-cycles.sh`; suite: `grant-qa-cycles.test.sh`.``) and a
  second prose mention at `develop-pipeline-step-5-6-qa-loop.md:16` (`writer:
  shared/resources/grant-qa-cycles.sh`).
- **create-skill rule sentence**: `skills/create-skill/SKILL.md:297` (heading) and `:301`
  ("puts the shared-resources directory in front of the filename is not a reference; it is an …"),
  reworded by PR #585. A repo grep for the old self-contradicting form (`A literal \`references/<file>\``)
  in `skills/*/SKILL.md` finds nothing on `b36d7d32`, so #289's sweep has no further sites.
- **Existing guards**: `tests/bundle-comment-origin.test.js` (`.js`/`.mjs` comments),
  `tests/bundle-missing-source.test.js` (quotes the rule's heading at `:307`), `bundle:check`
  (`UNREACHED` copies only).

### Target Architecture

- **Classification** (Phase 1). For each of the 34 prose literals: list the skills whose
  `references/` contain the citing document (`ls skills/*/references/<doc>`), and for each, find the
  line that runs **that skill's own copy** of the script (in its `SKILL.md` or another bundled document)
  as `path:line`, or record that none exists. A line that runs another skill's copy does not count.
  Every bundled copy of the resume contract runs
  `.agents/skills/{develop-story|develop-task}/references/grant-qa-cycles.sh`; that line is a
  witness for develop-story and develop-task only, and the `qa-task` copy of the same line is not one
  for qa-task. Measured on `b36d7d32`, a path-blind grep scores all six bundling skills as running
  the script, which is the misclassification this rule prevents. **Needed** means every bundling skill has a running line.
  **Not needed** means at least one does not: switch the literal to the bare filename. If a skill
  that does run the script loses the copy, give that skill a direct reference of its own (a
  `references/<script>` mention in its `SKILL.md`, which is a dependency there).
- **Fix** (Phase 2): rewrite not-needed literals, `npm run bundle`, `git rm` every copy `bundle:check`
  then reports `UNREACHED`.
- **Guard** (Phase 3), `tests/shared-script-literals.test.js`. For each `shared/resources/*.md`, find
  `shared/resources/<name>.(sh|js|mjs)` literals outside fences and not on a line that runs the script
  (the same "running line" pattern as the classification), and not inside `<!-- cite: … -->`. Each
  must be in `ALLOWED`, a map in the test of `"<doc>:<script>": "<reason>"`, filled from the needed
  half of Phase 1. An unlisted one fails, naming the doc, the line and the two remedies (bare
  filename, or an allowlist entry with a reason). An allowlist entry that no longer matches any line
  also fails, so the list cannot rot. Non-vacuity: the scan reads ≥ 40 `.md` files and finds ≥ 1
  script literal in a fence (the pattern is alive).
- **Pin** (Phase 3): the same test asserts that the create-skill rule paragraph (`sectionOf` the
  heading at `:297`) does not contain `references/<file>`, and contains `shared-resources directory`.

### Important Clarifications

- This is the "classify, then guard" design (the author's decision, 2026-10-07). A property guard
  that computes "every bundling skill runs it" was measured as too noisy: a "never invoked within its
  skill" scan reported 42 of 572 vendored scripts, including hook scripts installed by path and
  helpers the docs source in prose.
- An `.md` sibling named by literal is out of scope. Documents are cited, and AGENTS.md's cite rule
  already covers them.

---

## 4. Scope

### In Scope

✅ The 34 prose script literals in `shared/resources/*.md`: classification and fixes.
✅ Removing the unreached bundled copies the fixes produce.
✅ `tests/shared-script-literals.test.js` (guard + create-skill pin).
✅ CHANGELOG.

### Out of Scope

❌ Literals for `.md` siblings.
❌ Script literals in `skills/*/SKILL.md` (a skill's own dependency, by design).
❌ Changing `bundle_skill.py`'s matching.

---

## 5. Breaking Changes

None for consumers that run what their skill documents. A skill that silently relied on a script
it never documented running would lose the copy. Phase 1's per-skill running-line search is what
finds such a case, and Phase 2 gives that skill a direct reference.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.193.plan.scripts-reach-only-skills-that-run-them.md](task.193.plan.scripts-reach-only-skills-that-run-them.md)

### Phase 1: Classify the 34

**Risk**: Low (read-only). **Files**: the plan's classification table.

- [ ] For each literal: bundling skills, each skill's running line or "none", verdict.
- [ ] Record the table in the implementation report with its commands.

### Phase 2: Fix the not-needed literals

**Risk**: Medium (changes what skills ship). **Files**: the citing `shared/resources/*.md`; bundled
copies. **Depends on**: Phase 1.

- [ ] Rewrite each not-needed literal to the bare filename.
- [ ] Where a running skill would lose its copy, add a `references/<script>` mention to its `SKILL.md`.
- [ ] `npm run bundle`; `git rm` each `UNREACHED` copy; `npm run bundle:check` clean.

### Phase 3: Guard and pin

**Risk**: Low. **Files**: `tests/shared-script-literals.test.js` (new). **Depends on**: Phase 2.

- [ ] Scan, `ALLOWED` map with reasons, stale-entry check, floors.
- [ ] create-skill rule sentence pin.
- [ ] Mutation proof: restore the `grant-qa-cycles.sh` literal in a copy of the resume contract → red.

### Phase 4: Changelog

**Risk**: Low. **Files**: `CHANGELOG.md`.

- [ ] `[Unreleased]` › Fixed entry citing obs #263 and #289 (#175).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/*.md` — the citing documents with not-needed literals, at least
   `develop-pipeline-resume-contract.md` and `develop-pipeline-step-5-6-qa-loop.md`. Phase 1 lists
   the rest.
2. ✅ `skills/*/SKILL.md` — only where Phase 1 finds a running skill that would lose its copy.

### Files to Modify (Tests)

3. ✅ `tests/shared-script-literals.test.js` — new; reached by `'tests/*.test.js'`.

### Files to Delete

4. ❌ Unreached bundled copies under `skills/*/references/`. At least
   `skills/{develop-bug,qa-story,qa-task,review-pr}/references/grant-qa-cycles.sh`, if Phase 1
   confirms none of them runs it. Phase 2's `bundle:check` output names the rest.

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`

---

## 8. Testing Strategy

### Unit Tests

- **Command**: `command node --test tests/shared-script-literals.test.js`
- **Population definition** (the test re-measures it): every `shared/resources/*.md`; per line, outside
  a fenced block, matches of `(?<![\w-]/)shared/resources/([A-Za-z0-9_.-]+\.(sh|js|mjs))` that are not on
  a running line (`bash|sh|source|node|require(|import|from` before the literal on the same line) and
  not inside `<!-- cite: … -->`.
- **Control case**: a fixture document with one prose literal (must fail), one in a fence, one on a
  `bash` line and one in a cite wrapper (all three must pass). This shows the scanner neither over-
  nor under-fires, before it runs on the real tree.
- **Pin**: the create-skill section text contains `shared-resources directory` and no
  `references/<file>`.

### Integration Tests

- `npm test`, `npm run bundle:check` (zero `UNREACHED`).

### Mutation proofs

- Restore ``Source: `shared/resources/grant-qa-cycles.sh` `` in a copy → red, naming the line.
- Remove an `ALLOWED` entry's matching line → the stale-entry assertion goes red.

### Performance Tests

Not applicable: one text scan over `shared/resources/*.md`.

---

## 9. Success Criteria

### Functional

- [ ] Every prose script literal in `shared/resources/*.md` is either a bare filename, in a cite
  wrapper, or in `ALLOWED` with a reason — held by `tests/shared-script-literals.test.js` (Phase 3).
- [ ] An `ALLOWED` entry that matches no line fails — held by the same test (Phase 3).
- [ ] No bundled copy of `grant-qa-cycles.sh` sits in a skill that does not run it, and
  `npm run bundle:check` reports no `UNREACHED` copy — held by `bundle:check` in CI and the same test's
  population (Phase 2).
- [ ] The create-skill rule paragraph reads the unbundled form — held by the same test (Phase 3).

### Performance

- [ ] Not applicable: one text scan, no runtime path.

### Code Quality

- [ ] `npm test`, `npm run bundle:check`, `prettier --check .` pass.

### Migration

- [ ] CHANGELOG entry names the guard and the removed copies.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A skill loses a script it needs**
   - **Risk**: a literal judged not-needed was the only thing bundling a script a skill does run.
   - **Probability**: Low, given the per-skill running-line search.
   - **Mitigation**: Phase 2 adds a direct `references/<script>` mention for any running skill;
     `npm test` runs the skills' lifted-block tests against the bundled copies.

### Low Risk Areas

1. **An allowlist nobody reads**: each entry carries a reason, and stale entries fail.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a skill test fails on a missing bundled script; `bundle:check` red.
- **Steps**: `git revert` the merge commit; `npm run bundle`; `npm test`.
- **Validation**: `bundle:check` clean; the skill's tests green.

### Partial Rollback (1-2 hours)

- Restore one literal and its copies; add it to `ALLOWED` with the reason that was missed.

### Forward Fix (< 4 hours)

- A skill missing a script: add the direct `references/` mention; re-bundle.

### Rollback Triggers

- **Critical**: a shipped skill invokes a script no longer bundled.
- **Non-critical**: a guard false positive → narrow the running-line pattern, add the fixture.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #263, #289 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Classify the 34

- [ ] Not started

### Phase 2: Fix the not-needed literals

- [ ] Not started

### Phase 3: Guard and pin

- [ ] Not started

### Phase 4: Changelog

- [ ] Not started

---

## References

- Observation #263 — Resume contract cites grant-qa-cycles.sh by its shared/resources/ literal — script fans into 4 skills that never call it; no check catches the pattern
- Observation #289 — create-skill shared-literal rule has no pin test or corpus sweep (carrier for #175)

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.193.qa.{n}.scripts-reach-only-skills-that-run-them.md`,
  `task.193.gate.{n}.scripts-reach-only-skills-that-run-them.yml`, bug reports as
  `task.193.bug.{N}.{name}.md`.
- Edit `shared/resources/` sources, never the bundled `references/` copies; `npm run bundle`
  regenerates them.

### Future Improvements

- Extend the guard to `.md` siblings named by literal where a cite would do.
