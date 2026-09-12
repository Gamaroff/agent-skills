---
id: task.119
title: "[Task 119] Four authoring rules the corpus already obeys by accident: positional tokens in fenced bash, hardcoded shell matrices, comment paths the bundler follows, and how many task docs a change is"
type: task
description: "The harness substitutes $0–$9 inside a SKILL.md's fenced bash when the skill is invoked with an argument — the delivered copy is corrupted while every test reads the file from disk; 12 files carry such tokens (#23). A hand-written const SHELLS = ['bash','zsh'] passed every local gate and failed CI, while zshAvailable() already existed (#36). bundle_skill.py follows shared/resources paths inside .js comments, so moving four commented constants added +16,000 lines of bundle churn (#39). And create-task decides whether to write a task doc but never how many; three authors hand-wrote the same splitting rule into the registry (#24). One task: a guard test for the first, and the rules for all four where authors read."
tags: [create-skill, create-task, authoring, bundling, testing]
category: documentation
status: planned
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 5
---

# Technical Task: Four authoring rules the corpus already obeys by accident: positional tokens in fenced bash, hardcoded shell matrices, comment paths the bundler follows, and how many task docs a change is

**Status:** Planned

---

## 1. Overview

Four observations about writing skills, each a rule that exists nowhere and was learned by a
failure that every gate passed. Three belong in `create-skill`; one in `create-task`. One of them
also needs a test, because it cannot be seen from disk.

## 2. Motivation

### Current Problems

1. **Fenced bash is a template, not source.** `/qa-task <path>` rendered
   `match($0, /^[[:space:]]*/)` as `match(docs/tasks/task.82…md, …)` — eight substitutions in one
   awk program, silent failure; the warning comment written to prevent it contained `$0` and was
   corrupted too. Tests over the source cannot see it. 12 shipped files carry `$0`–`$9` in runnable
   blocks (#23).
2. **Shell matrices get hand-written.** `const SHELLS = ["bash", "zsh"]` — three QA cycles, 5c and
   four `ci:fast` runs green; CI red on four `[zsh]` cases. `qa-execute-snippets.mjs` exports
   `zshAvailable()` for exactly this (#36).
3. **The bundler cannot tell code from comment.** Four `// see shared/resources/…` comments moved
   into `jira-sync.js` (bundled into 21 skills) pulled a 646-line test and a 172-line doc into twenty
   skills that use neither; the bundler reported ✅ (#39).
4. **`create-task` never asks "one or several?"** The decision tree ends at "use this skill"; the
   registry carries three hand-written dependency-ordering notes (tasks 51–58, 62–64, 93–95) because
   the seam was re-derived each time (#24).

### Benefits

1. Delivery-time corruption becomes an authoring-time test failure.
2. Environment facts are inherited from the probe that exists.
3. Bundle churn from comments is named before commit.
4. Multi-document decompositions follow the house pattern instead of the session's mood.

## 3. Technical Background

- `skills/create-skill/SKILL.md` — §Signal Design Principle (the pattern for a rule with its
  failure), bundling section; `scripts/bundle_skill.py` `SHARED_REF_RE` (matches anywhere in a file).
- `shared/resources/qa-execute-snippets.mjs` `zshAvailable()`; `qa-task` Step 4b (executes
  snippets **from disk** — cannot see #23's class; say so).
- `skills/create-task/SKILL.md` §1 → §1.5; `resources/sections-guide.md` L≈1023 (splits phases,
  not documents).
- `docs/architecture/concepts/coding-standards.md` §Cross-skill resources.

## 4. Scope

### In Scope

✅ `tests/fenced-bash-positional-params.test.js` (new): scan fenced `bash`/`sh` in shipped `.md`; allowlist by path+line with reason; floor ≥ 50 blocks; baseline recorded
✅ create-skill rules (three paragraphs, each with its failure and the alternative)
✅ `bundle_skill.py`: warn (not refuse) when a followed reference originates from a comment-only line in `.js`/`.mjs`
✅ create-task "One task or several?" step
✅ Reduce the 12 files' token uses where an implicit form exists; allowlist the rest with a note

### Out of Scope

❌ Changing the harness's substitution · ❌ rewriting `sections-guide.md`

## 5. Breaking Changes

None. The new test may fail on first run until the 12 files are fixed or allowlisted — do that in
the same PR.

## 6. Implementation Plan

1. Test first; record the baseline; fix or allowlist each hit.
2. create-skill: three rules; qa-task 4b limit sentence.
3. Bundler warning + a unit test with a comment-only fixture.
4. create-task step; point at the three registry notes as the format.
5. Mutation: reintroduce one `$0` → the test names the file.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `tests/fenced-bash-positional-params.test.js` (new), `package.json` | guard |
| `skills/create-skill/SKILL.md`, `scripts/bundle_skill.py` (+ test) | rules, warning |
| `skills/create-task/SKILL.md` | new step |
| `skills/qa-task/SKILL.md` Step 4b | limit sentence |
| up to 12 shipped `.md` files | token removal or allowlist note |
| `docs/architecture/concepts/coding-standards.md`, `CHANGELOG.md` | rule, entry |

## 8. Testing Strategy

The guard with a floor; bundler unit test; `npm run bundle` idempotent; suite green.

## 9. Success Criteria

1. The guard runs under `npm test` and CI, has a floor, and every allowlisted site carries a reason
2. create-skill states the three rules with their failure modes; qa-task 4b states its from-disk limit
3. `bundle_skill.py` warns on a comment-only origin, tested
4. create-task has the "One task or several?" step with the three seams and the dependency-note obligation
5. Observations #23, #24, #36, #39 close naming this PR

## 10. Risk Assessment

**Low.** Removing `$` tokens from shipped awk/shell needs care — each edit is a behaviour change in
runnable prose; verify each block by running it (Step 4b-style) before and after.

## 11. Rollback Plan

`git revert`; the guard can stay with a wider allowlist.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |

---

## Progress Tracking

### Phase 1: the guard
- [ ] Test scans fenced `bash`/`sh` blocks in `skills/*/SKILL.md` + `shared/resources/*.md` for `$0`–`$9`, allowlist with reasons, floor; baseline recorded (12 files on 2026-09-09)
### Phase 2: the rules in create-skill
- [ ] Runnable prose: no positional-parameter tokens; the implicit-form alternatives; qa-task Step 4b's from-disk limit stated
- [ ] Shell matrices derive from `zshAvailable()`; `bash` unconditional; `zsh-unavailable` note
- [ ] In a `.js` under `shared/resources/`, a `shared/resources/` path in a comment is a dependency declaration — refer to siblings by bare filename; bundler warns on comment-only origins
### Phase 3: create-task
- [ ] "One task or several?" step: the three-way splitting test, the three named seams, the dependency-note obligation, the by-file anti-pattern

---

## References

- **Plan**: [`task.119.plan.create-skill-authoring-guards.md`](task.119.plan.create-skill-authoring-guards.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #23, #24, #36, #39
- **Related Skill**: `.agents/skills/create-skill/` (SKILL.md, `scripts/bundle_skill.py`), `.agents/skills/create-task/`
- **Evidence for the seams**: `docs/tasks/task-registry.md` notes on tasks 51–58, 62–64, 93–95

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
