---
id: task.193
title: "Scripts reach only the skills that run them"
type: task
description: "Classify every script a shared/resources/*.md names by its shared/resources/ literal in prose, switch the unneeded ones to bare filenames and remove their unreached bundled copies, and add a guard that fails on a new prose script literal not in a reasoned allowlist; also pin create-skill's shared-literal rule sentence."
tags: [create-skill, bundler, observation, shared-resources, guard]
category: refactoring
status: in-progress
priority: Medium
created: 2026-10-07
updated: 2026-10-19
assignee:
estimated_effort_hours: 8
github_issue: 592
---

# Technical Task: Scripts reach only the skills that run them

**Status:** In Progress
**Review**: ✅ All review recommendations from `task.193.review.1.scripts-reach-only-skills-that-run-them.md` implemented 2026-10-19
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
3. `tests/shared-script-literals.test.js`: a prose script literal not on the reasoned allowlist
   fails, inside a `<!-- cite: … -->` wrapper or not (a cite of a script is a dependency). A pin on create-skill's rule sentence.

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
  `<!-- cite: … -->` is a citation — of an `.md` only; a cited script is still a dependency.
- **Population** (measured on `b36d7d32`, definition in § 8): 47 script literals (`.sh`, `.js`, `.mjs`)
  in `shared/resources/*.md`. 13 are inside a fence or on an invocation line; **34 are in prose**,
  across 15 documents. The per-member list is in the plan. Re-measured on `eb44b9c3` (review 1) with the
  corrected running-line rule in § 8: 48 literals, 8 fenced, 3 on a command line, **37 in prose**
  (`pipeline-answers.js` is new). The test records the number; this figure is not a criterion.
- **The incident line** is still present: `develop-pipeline-resume-contract.md:614`
  (``Source: `shared/resources/grant-qa-cycles.sh`; suite: `grant-qa-cycles.test.sh`.``) and a
  second prose mention at `develop-pipeline-step-5-6-qa-loop.md:16` (`writer:
  shared/resources/grant-qa-cycles.sh`).
- **create-skill rule sentence**: `skills/create-skill/SKILL.md:304` (heading) and `:306-308`
  ("A literal that puts the shared-resources directory in front of the filename is not a reference; it is
  an …"), reworded by PR #585. The section's last sentence names `references/<file>` **on purpose**, to
  explain obs #175, so a pin cannot forbid that token. A repo grep for the old self-contradicting form (`A literal \`references/<file>\``)
  in `skills/*/SKILL.md` finds nothing on `b36d7d32`, so #289's sweep has no further sites.
- **Existing guards**: `tests/bundle-comment-origin.test.js` (`.js`/`.mjs` comments),
  `tests/bundle-missing-source.test.js` (quotes the rule's heading at `:308`), `bundle:check`
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
  `shared/resources/<name>.(sh|js|mjs)` literals, fenced or not, that no command runs (§ 8's running-line rule), whether or not inside `<!-- cite: … -->`. Each
  must be in `ALLOWED`, a map in the test of `"<doc>:<script>": "<reason>"`, filled from the needed
  half of Phase 1. An unlisted one fails, naming the doc, the line and the two remedies (bare
  filename, or an allowlist entry with a reason). An allowlist entry that no longer matches any line
  also fails, so the list cannot rot. Non-vacuity: the scan reads ≥ 40 `.md` files and finds ≥ 1
  script literal in a fence (the pattern is alive).
- **Pin** (Phase 3): the same test reads the create-skill section (`sectionOf` the heading at `:304`,
  joined — it returns an array of lines) and asserts it contains the rule sentence `A literal that` …
  `puts the shared-resources directory in front of the filename is not a reference` (compared with
  whitespace collapsed) and does **not** contain the old rule form `` A literal `references/<file>` ``.
  It must not forbid the bare token `references/<file>`: the section names it on purpose (review 1, C1).

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

- [x] For each literal: bundling skills, each skill's running line or "none", verdict.
- [x] Record the table in the implementation report with its commands.

### Phase 2: Fix the not-needed literals

**Risk**: Medium (changes what skills ship). **Files**: the citing `shared/resources/*.md`; bundled
copies. **Depends on**: Phase 1.

- [x] Rewrite each not-needed literal to the bare filename.
- [x] Where a running skill would lose its copy, add a `references/<script>` mention to its `SKILL.md`.
- [x] `npm run bundle`; `git rm` each `UNREACHED` copy; `npm run bundle:check` clean.

### Phase 3: Guard and pin

**Risk**: Low. **Files**: `tests/shared-script-literals.test.js` (new). **Depends on**: Phase 2.

- [x] Scan, `ALLOWED` map with reasons, stale-entry check, floors.
- [x] create-skill rule sentence pin.
- [x] Mutation proof: restore the `grant-qa-cycles.sh` literal in a copy of the resume contract → red.

### Phase 4: Changelog

**Risk**: Low. **Files**: `CHANGELOG.md`.

- [x] `[Unreleased]` › Fixed entry citing obs #263 and #289 (#175).

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
- **Population definition** (the test re-measures it): every `shared/resources/*.md`; per line, fenced or not (the bundler reads fences — QA cycle 3, CR-1), every target the bundler's own `SHARED_REF_RE` captures (nested paths included — QA cycle 2,
  CR-1), trimmed as `split_fragment` trims it and ending in `.sh`, `.js` or `.mjs`, that is not **run**, inside
  `<!-- cite: … -->` or not (QA cycle 1, CR-1). A literal is run when a command sits **immediately** before it:
  inside `require(` / `import(`, after `$(`, or at the start of a code span the literal sits in (`bash `, `sh `,
  `source `, `node `, `command node `, with flags, or `import … from `), optionally behind one quote and a `./`.
  A backtick opens a span only when an even number precede it. Anything else is prose: `Engine source:`, English
  "from" and "sourceable" (review 1, I1 — 18 of the 20 lines the looser "anywhere before" rule called running
  were prose), and a parenthetical or line-initial `source`, or a closing backtick (QA cycles 1–2, CR-2).
- **Fenced lines** (QA cycle 3, CR-1): a fenced literal is run also after a shell command at the line start or after `;`, `&&`, `|`, `(`, `!` or a shell keyword, `. ` included; a quoted path or fenced prompt prose is reported.
- **Bundler sets**: each `ALLOWED` entry lists the skills that hold both its document and the script (a cite-only holder receives no script — QA cycle 3, CR-2), checked against the tree, so a
  new bundler fails until it is confirmed to run the script (QA cycle 2, CR-4).
- **Control case**: a fixture document with one prose literal, one ``Engine source: `shared/resources/x.js` ``
  line, one ``wrap it with f from `shared/resources/x.sh` `` line and one in a cite wrapper (all four must
  fail — the bundler cites only an `.md` target, so a cite-wrapped script is still a dependency; QA cycle 1,
  CR-1), and one in a fence and one on a `bash` line (both must pass). This shows the scanner neither over-
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

- [x] Every prose script literal in `shared/resources/*.md` is either a bare filename or in
  `ALLOWED` with a reason (a cite wrapper does not exempt a script) — held by `tests/shared-script-literals.test.js` (Phase 3).
- [x] An `ALLOWED` entry that matches no line fails — held by the same test (Phase 3).
- [x] No bundled copy of `grant-qa-cycles.sh` sits in a skill that does not run it, and
  `npm run bundle:check` reports no `UNREACHED` copy — held by `bundle:check` in CI and the same test's
  population (Phase 2).
- [x] The create-skill rule paragraph reads the unbundled form — held by the same test (Phase 3).

### Performance

- [x] Not applicable: one text scan, no runtime path.

### Code Quality

- [x] `npm test`, `npm run bundle:check`, `prettier --check .` pass.

### Migration

- [x] CHANGELOG entry names the guard and the removed copies.

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

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-19
**Quality Score**: 80/100
**Gate Decision**: FAIL

### QA Report

- **Full Report**: [task.193.qa.3.scripts-reach-only-skills-that-run-them.md](./task.193.qa.3.scripts-reach-only-skills-that-run-them.md)
- **Gate File**: [task.193.gate.3.scripts-reach-only-skills-that-run-them.yml](./task.193.gate.3.scripts-reach-only-skills-that-run-them.yml)

### Test Coverage Summary

- **Tests Executed**: 7 (guard) plus `ci:fast` 5904 on `53f72587`
- **Phases Verified**: 4/4
- **Critical Issues**: 1
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

Cycle 2's fixes hold. CR-1 (HIGH): the guard exempts every fenced literal, but the bundler copies from fences; `probe-boundary-rule.md:66` and `develop-pipeline-step-0-resolve-and-prepare.md:251` are live cases.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #263, #289 | create-task |
| 2026-10-19 | 1.1 | Review passed (8/10) — pin re-specified against the old rule form (it failed on today's text); running-line rule tightened to a command token immediately before the path, with `Engine source:` and prose-`from` control fixtures; removed-literal test search recorded; anchors and population re-measured | review-task |
| 2026-10-19 |  | Status → ready-for-development | review-task |
| 2026-10-19 |  | Implemented — 11 literals switched, 17 bundled copies removed, 1 SKILL.md reference, 1 new test file (6 tests), CHANGELOG | develop |
| 2026-10-19 |  | QA gate CONCERNS (90/100) — 1 finding (CR-1), 2 advisory | qa-task |
| 2026-10-19 |  | QA fix cycle 1 — CR-1: a cite wrapper no longer exempts a script literal; CR-2: the run rule needs the command to open a code span or line; § 8 control spec corrected to match | qa-fix |
| 2026-10-19 |  | QA gate CONCERNS (90/100) — 2 findings (CR-1 nested paths, CR-2 run rule); 2 advisory, 1 pre-existing | qa-task |
| 2026-10-19 |  | QA fix cycle 2 — CR-1: the guard matches what the bundler captures (nested paths, trimmed, script extensions only); CR-2: a command must open the code span or `$(`; CR-4: ALLOWED entries name their bundler sets, checked against the tree; § 8 restated | qa-fix |
| 2026-10-19 |  | QA gate FAIL (80/100) — 1 finding (CR-1 HIGH: fenced literals exempt; 2 live); 3 advisory | qa-task |
| 2026-10-19 |  | Status → in-progress | qa-task |
| 2026-10-19 |  | QA fix cycle 3 — CR-1: fenced literals classified (shell-position run rule); `probe-boundary-rule.md:66` and step-0:251 bare-named, 4 more copies removed (21 total); develop-task and develop-story `SKILL.md` name `references/resolve-paths.sh`; CR-2: a bundler must hold the script too; CR-4: CHANGELOG reworded | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Classify the 34

- [x] Complete — 37 literals classified on `eb44b9c3`; 11 switched (table in the implementation report)

### Phase 2: Fix the not-needed literals

- [x] Complete — 11 literals switched, 17 copies removed (21 after QA cycle 3), develop-bug `SKILL.md` names `references/pipeline-answers.js`; `bundle:check` 0 problems

### Phase 3: Guard and pin

- [x] Complete — `tests/shared-script-literals.test.js`, 6 tests, 23 `ALLOWED` entries; 6 mutations each red

### Phase 4: Changelog

- [x] Complete

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
