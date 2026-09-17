---
id: task.126
title: "[Task 126] Citing a hub shared resource bundles its whole transitive closure, and a new generated copy is only a warning at commit time: a non-transitive citation form, a per-skill closure count, and a pre-commit that fails on an untracked references/ file"
type: task
description: "bundle_skill.py follows every shared/resources/X mention recursively with no notion of cite vs depend: a one-line pointer from qa-fix, review-task and review-story to develop-pipeline-autonomous-defaults.md pulled 15–16 files each into skills that read none of them (task.116, ~48 generated files whose only relationship to the change is a sentence). And when a bundle run generates a new untracked references/ copy, the pre-commit hook prints an advisory and lets the commit through; bundle:check then fails in CI a push later (task.99). Give the bundler a citation form that copies one file, print the transitive count per skill on every run so growth is visible when it is caused, and make the pre-commit fail — not warn — on a new untracked generated copy. Observations #83, #114 (mechanism half)."
tags: [create-skill, bundler, pre-commit]
category: refactoring
status: planned
priority: Medium
risk_level: medium
created: 2026-09-17
updated: 2026-09-17
assignee:
estimated_effort_hours: 8
github_issue: 426
---

# Technical Task: Citing a hub shared resource bundles its whole transitive closure

**Status:** Planned
**GitHub Issue**: [#426](https://github.com/Gamaroff/agent-skills/issues/426)

---

## 1. Overview

The bundler's discovery is transitive by design — a skill that depends on `jira-sync.js` needs
`change-log.js` too — but it has one edge type, so a *citation* ("the rule is in §Subagents of that
document") costs the same as a *dependency*. Hub documents (the autonomous-defaults doc, the resume
contract) carry large closures, and every skill that points at them for one paragraph inherits the
lot. Separately, the moment the tree gains a generated copy that is not tracked, the pre-commit says
so and proceeds; CI catches it a push later. This task adds a one-file citation form, makes closure
growth visible per skill at bundle time, and turns the pre-commit advisory into a refusal.

**Scope**: `bundle_skill.py` (discovery + reporting), `package_skill.py` (shares the rules), the
pre-commit bundler hook, `create-skill` SKILL.md and AGENTS.md § Shared Resources (the authoring
rule staged on 2026-09-17 is the prose half; this is the mechanism half).

## 2. Motivation

### Current Problems

1. **A citation costs a closure.** On task.116 a one-line pointer to
   `references/develop-pipeline-autonomous-defaults.md` from `qa-fix`, `review-task` and
   `review-story` copied 15–16 files into each — lite-mode, resume-contract, step-7-finalise,
   `gh-stage.js`, `jira-stage.js`, `handover-*.js`, `tracker-issue.js` — none read by the pointing
   skill. ~48 generated files in the PR whose only relationship to the change was a sentence (#83).
2. **Authors respond by not citing.** The alternative to inheriting a closure is restating the rule
   — the drift the one-source rule exists to prevent — or splitting hub documents file-per-section,
   which is its own drift risk.
3. **Growth is invisible at the moment it is caused.** `bundle_skill.py` prints ✅ per skill; the
   closure size shows up in `git status` after the fact.
4. **A new untracked generated copy is advisory at commit time.** The pre-commit prints
   "pre-existing bundle changes left unstaged" and proceeds; `bundle:check` fails in CI on the next
   push (#114, task.99 — one QA cycle cost a second push).

### Benefits

1. Citing a rule pulls one file; depending on a script pulls its closure. Authors point instead of restating.
2. The per-skill count on every bundle run makes a closure jump a number in the output, not a surprise in the diff.
3. A commit cannot leave the tree in a state `bundle:check` will reject.
4. Two observations close (the prose half of #114 is staged separately).

## 3. Technical Background

### Current Architecture

```
discover_needed: shared/resources/X (everywhere) + references/X (skill files) → pending, transitively
                 every match is a dependency edge
bundle_skill:    prints "✅ <skill>: bundled N" — N is the write count, not the closure delta
pre-commit hook: runs the bundler; new untracked references/ file → advisory line; commit proceeds
```

### Target Architecture

```
citation form:   `shared/resources/X.md#anchor` (a link with a fragment) or a mention inside
                 `<!-- cite: shared/resources/X.md -->` copies X ALONE — X's own outbound refs are not
                 followed from a citation edge. A bare `shared/resources/X` mention remains a dependency edge.
discover_needed: two edge kinds; the closure is computed over dependency edges only; cited files are
                 added as leaves. Reported per skill: "bundled N (+K new since last run, closure M)".
pre-commit hook: after the bundle run, `git ls-files --others --exclude-standard skills/*/references/`
                 non-empty → print the paths and EXIT 1 with the remedy (`git add` them, or remove the
                 citation that produced them). Advisory only under an explicit BUNDLE_PRECOMMIT_WARN=1.
```

### Important Clarifications

- **The citation form must be something authors already write.** A fragment link
  (`shared/resources/X.md#subagents`) is the natural way to point at a section, so it needs no new
  syntax to learn; the HTML comment form is for a bare mention with no anchor. Both are followed
  one level and stop.
- **A cited file's own citations are not followed either.** A citation is a leaf by definition;
  if a cited file *needs* something to be read, that is a dependency and the author of that file
  writes it as one.
- **Refusing the commit is the fail-closed direction** the repo's traps doc already argues for
  (`bundle:check` in CI is the same rule one push later). The escape hatch is an env var, not a flag
  in the hook's default path.
- **This task does not change `source_backed_on_disk` or `--check` classes** — that is task.122,
  independent.

## 4. Scope

### In Scope

✅ Two edge kinds in `discover_needed`, with the citation forms above; `package_skill.py` imports the
   same rules (no second definition).
✅ Per-skill closure reporting on every bundle run.
✅ Pre-commit refusal on a new untracked generated copy, with the env-var escape hatch.
✅ Tests: citation copies one file; dependency still copies the closure; nested citation is a leaf;
   pre-commit refuses (shell test with a fixture repo).
✅ `create-skill` SKILL.md: the citation form beside the 2026-09-17 authoring rule; AGENTS.md § Shared Resources one sentence.
✅ Convert the three task.116 pointers to the citation form and `npm run bundle`; confirm the closure shrinks.

### Out of Scope

❌ Splitting hub documents (option (b) in #83).
❌ Following `references/X` out of shared text (see task.122's rationale).
❌ The `UNREACHED` class — task.122.

## 5. Breaking Changes

None to consumers. Authors: a fragment link now bundles one file rather than a closure — which is
what every existing fragment link in the tree was written to mean; verify by bundling and diffing.

## 6. Implementation Plan

> Detailed implementation guide: [task.126.plan.bundler-citation-form.md](task.126.plan.bundler-citation-form.md)

### Phase 1: Citation edges (#83)

**Risk Level**: Medium

**Files**: `skills/create-skill/scripts/bundle_skill.py`, `package_skill.py`, `tests/bundle-*.test.js`

**Changes**:
- [ ] `collect_shared_refs` returns `(name, kind)` with `kind ∈ {dep, cite}`; fragment links and `<!-- cite: … -->` are `cite`.
- [ ] `discover_needed` follows outbound refs only from `dep`-reached files; `cite` files are leaves.
- [ ] Per-skill line: `bundled N · closure M (+K vs committed)`.
- [ ] Tests for the three edge cases; `git diff --stat` of a full bundle after converting the task.116 pointers, recorded.

**Dependencies**: none.

### Phase 2: Pre-commit refusal (#114)

**Risk Level**: Low

**Files**: the pre-commit hook script (find via `grep -rl "bundle" .husky scripts/*.sh 2>/dev/null`), `docs/contributing/traps.md`

**Changes**:
- [ ] After bundling, list untracked `skills/*/references/` paths; non-empty → print and exit 1 with the two remedies.
- [ ] `BUNDLE_PRECOMMIT_WARN=1` restores the advisory.
- [ ] Shell test: fixture repo, add a citation that generates a new copy, commit → refused; `git add` → allowed.

**Dependencies**: none.

### Phase 3: Authoring surface

**Risk Level**: Low

**Files**: `skills/create-skill/SKILL.md`, `AGENTS.md`, the three task.116 pointer sites

**Changes**:
- [ ] Document the citation form beside the "literal is a bundling instruction" rule.
- [ ] Convert `qa-fix`, `review-task`, `review-story` pointers to fragment links; `npm run bundle`; commit the shrink.

**Dependencies**: Phase 1.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-skill/scripts/bundle_skill.py` — edge kinds, reporting
2. ✅ `skills/create-skill/scripts/package_skill.py` — import the rules
3. ✅ pre-commit hook script

### Files to Modify (Tests)

4. ✅ `tests/bundle-check-mode.test.js` or a new `tests/bundle-citation.test.js`
5. ✅ a shell test for the hook (`tests/*.test.sh` pattern)

### Files to Modify (Documentation)

6. ✅ `skills/create-skill/SKILL.md`, `AGENTS.md`, `docs/contributing/traps.md`
7. ✅ `skills/{qa-fix,review-task,review-story}/SKILL.md` — pointer form; `skills/*/references/` regenerated (shrinks)

### Files to Delete

The generated copies the conversion no longer produces — removed by the bundle run, not by hand.

## 8. Testing Strategy

### Unit Tests
- [ ] Citation → one file; dependency → closure; cited file's own refs not followed; a file reached both ways is bundled once with its closure.
- [ ] Reporting line format.

**Command**: `node --test tests/bundle-*.test.js`

### Integration Tests
- [ ] Full `npm run bundle` on the converted tree: the three skills lose ≥ 12 files each; `bundle:check` green; `bundled-links.test.js` green.
- [ ] Hook shell test.

### Contract Tests
- [ ] No second definition of the ref regexes in `package_skill.py` (import assertion).

### Performance Tests
- [ ] `--all` wall time within noise.

### Consumer Tests
- [ ] `setup-consumer.sh` tarball of `qa-fix` still runs its documented steps (nothing it reads was dropped).

## 9. Success Criteria

### Functional
- [ ] A fragment link bundles exactly one file.
- [ ] The three task.116 pointer sites bundle ≤ 3 files each after conversion.
- [ ] A commit with a new untracked generated copy is refused by default.

### Performance
- [ ] No measurable change to bundle time.

### Code Quality
- [ ] One definition of the edge rules; mutation proofs recorded for each test.

### Migration
- [ ] Observations #83, #114 close naming the PR.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **An existing fragment link was load-bearing as a dependency.** Mitigation: bundle the tree before
   and after Phase 1 and diff; any file that disappears from a skill that reads it is converted back
   to a bare mention, and the list is recorded in the implementation report.

### Low Risk
1. The hook refusal surprises a contributor — the message carries both remedies and the env var.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: a consumer skill lost a file it reads; the hook blocks unrelated commits.
- **Steps**: `git revert`; `npm run bundle`; commit.
- **Validation**: `bundle:check` and `bundled-links` green.

### Partial Rollback (1–2 hours)
- Revert Phase 3's conversions only (edges stay; closures return).

### Forward Fix
- Add a missing citation form; adjust the report line.

### Rollback Triggers
- **Critical**: a skill loses a file it invokes.
- **Non-critical**: message wording.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #83, #114) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: citation edges
- [ ] Phase 2: pre-commit refusal
- [ ] Phase 3: authoring surface + conversions
- [ ] QA: `task.126.qa.[N].bundler-citation-form.md`
- [ ] Gate: `task.126.gate.[N].bundler-citation-form.yml`

## References

- Observations #83, #114; task.122 (`UNREACHED` class — sibling, independent); task.108 (link re-relativiser); task.119 (comment-path rule)
- `docs/reference/anti-patterns.md` — the enumeration class

## Notes

Bugs found during QA land at `task.126.bug.[N].[name].md` in this directory.
