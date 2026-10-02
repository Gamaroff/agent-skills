---
id: task.178
title: "review-task and review-story cite the §0a key lookup"
type: task
description: "Replace the three restated, unanchored jira_key / github_issue lookups in review-task and review-story with citations of the shared §0a Key → document lookup that task.176 corrected."
tags: [review-task, review-story, input-resolution, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-10-02
updated: 2026-10-02
assignee:
estimated_effort_hours: 8
github_issue: 556
---

# Technical Task: review-task and review-story cite the §0a key lookup

**Status:** Planned
**GitHub Issue**: [#556](https://github.com/Gamaroff/agent-skills/issues/556)

---

## 1. Overview

Task.176 replaced the develop pipelines' key → document lookup with one anchored, quote-tolerant
lookup in the shared step-0 §0a, which halts on several matches. `/review-pr` already cites it.
`review-task` and `review-story` still carry their own copies of the old lookup, with all the defects
§0a fixed. This task makes all three sites cite §0a and adds a test that stops a fourth copy from
appearing.

**Scope**: `skills/review-task/SKILL.md` (two sites), `skills/review-story/SKILL.md` (one site), their
bundled `references/` (the step-0 document, newly cited), a guard test, and CHANGELOG.

---

## 2. Motivation

### Current Problems

1. **Prefix matches.** `review-task/SKILL.md:99` runs `grep -rl "jira_key: ${JIRA_KEY}" docs/`, so a
   review of `RAPP-70` can resolve `RAPP-702`'s document.
2. **Quoted keys are missed.** Consumer documents write `jira_key: 'RAPP-702'`, which the unanchored,
   unquoted pattern does not match. task.176 measured 802 quoted keys and 0 unquoted ones in
   rebirth-wallet.
3. **Artifacts compete with the work item.** Line 99 excludes only `.qa.`, `.gate.`, `.bug.` and
   `.implementation.`. A `.request.` file, a review or a sprint-review summary that carries the same
   key can win.
4. **`head -1` hides ambiguity.** Two matching documents are resolved by whichever `grep` lists first.
5. **The fallbacks repeat it.** `review-task/SKILL.md:134` and `review-story/SKILL.md:189` give the same
   `grep -rl "github_issue: {N}"` / `"jira_key: {KEY}"` as prose fallbacks.

### Benefits

1. One lookup, one set of fixes, for every skill that resolves a key to a document.
2. A test keeps it that way.

---

## 3. Technical Background

### Current Architecture

Population measured with:

```bash
comm -23 \
  <(git grep --full-name -l -E 'grep -rl "(jira_key|github_issue): ' -- ':(top,glob)skills/*/SKILL.md' ':(top,glob)skills/*/references/*.md' ':(top,glob)shared/resources/*.md' | sort) \
  <(git grep --full-name -l -e '^<!-- AUTO-GENERATED — DO NOT EDIT' -- ':(top,glob)skills/*/references/*.md' | sort)
```

It returned 3 files on 2026-10-02:

| File | Hit | Class |
| --- | --- | --- |
| `skills/review-task/SKILL.md:99` | `LOCAL_PATH=$(grep -rl "jira_key: ${JIRA_KEY}" docs/ …` | executed lookup — **in scope** |
| `skills/review-task/SKILL.md:134` | `` fall back to `grep -rl "github_issue: {N}" docs/` `` | prose fallback — **in scope** |
| `skills/review-story/SKILL.md:189` | `` fall back to `grep -rl "github_issue: {N}" docs/` `` | prose fallback — **in scope** |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:143` | `` a bare `grep -rl "jira_key: ${JIRA_KEY}"` `` | the §0a note describing the old form — **excluded**, history |

Neither `skills/review-task/references/` nor `skills/review-story/references/` carries the step-0
document today (`ls … | grep -c develop-pipeline-step-0` → 0).

### Target Architecture

- Each of the three sites links to
  `references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup`, with the
  `KEY_FIELD` / `KEY_VALUE` to bind, and keeps its own surrounding flow: the Jira-key branch in
  review-task Step 2, and the "no Document link" fallbacks. A fragment link is a **citation**, so the
  bundler copies the step-0 document alone into each skill, not its closure (AGENTS.md "Cite or depend").
- review-task's line-99 block keeps its task-only constraint (a `task.{N}` document) as a check on the
  lookup's result, never as a second grep.
- A guard test fails on any `grep -rl "jira_key: ` / `"github_issue: ` in a canonical source outside the
  allowlisted §0a history note. It carries a non-vacuity floor: the §0a block must still match its own
  anchored pattern.

### Important Clarifications

- The §0a lookup halts on a missing `docs/` and on several matches. Both are right for review-task and
  review-story, which need the document.

---

## 4. Scope

### In Scope

✅ The three sites above.
✅ Bundling the step-0 document into review-task and review-story (`npm run bundle`).
✅ A guard test against restating the lookup.
✅ CHANGELOG.

### Out of Scope

❌ `/review-pr` — it already cites §0a, and its edge cases are task.177.
❌ Any change to the §0a lookup itself.

---

## 5. Breaking Changes

None — API stable. As with task.176's §0a change, a review that resolved a document only by prefix
match now reports "no local document". CHANGELOG says so.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.178.plan.review-skills-cite-key-lookup.md](task.178.plan.review-skills-cite-key-lookup.md)

### Phase 1: Cite §0a at the three sites

**Risk Level**: Low

**Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`

- [ ] review-task Step 2's Jira-key branch runs the §0a lookup (cited) with `KEY_FIELD=jira_key`, then
      checks the result is a `task.{N}` document.
- [ ] review-task:134 and review-story:189 fallbacks cite §0a with `KEY_FIELD=github_issue` (or
      `jira_key`).
- [ ] `npm run bundle` — the step-0 document is added to both skills' `references/`.

**Dependencies**: none.

### Phase 2: Guard test

**Risk Level**: Low

**Files**: `tests/key-lookup-single-statement.test.js` (new)

- [ ] Fail on a `grep -rl "(jira_key|github_issue): ` in any canonical source except the allowlisted
      §0a history note; assert the §0a block still holds its anchored pattern (non-vacuity).
- [ ] Mutation check: re-insert one old grep and confirm the test goes red.

**Dependencies**: Phase 1.

### Phase 3: CHANGELOG

**Risk Level**: Low

- [ ] `[Unreleased]` entry citing (task 178).

**Dependencies**: Phase 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `skills/review-task/SKILL.md` — lines 99 and 134
- `skills/review-story/SKILL.md` — line 189

### Files to Create

- `tests/key-lookup-single-statement.test.js`

### Generated (do not hand-edit)

- `skills/review-task/references/develop-pipeline-step-0-resolve-and-prepare.md`
- `skills/review-story/references/develop-pipeline-step-0-resolve-and-prepare.md`

### Files to Modify (Documentation)

- `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- The guard test (Phase 2), with its non-vacuity floor and an allowlist of exactly one entry.

### Integration Tests

- Existing review-task / review-story suites stay green.
- Each cited site's binding is executed under bash and zsh against a fixture: a quoted key, a
  `.request.` sibling and a longer neighbour key resolve to one document.
- **Mutation check**: restore the old grep at review-task:99 and confirm the guard goes red.

### Performance Tests

None.

### Consumer Tests

None.

---

## 9. Success Criteria

### Functional

- [ ] No canonical source restates `grep -rl "jira_key: ` or `grep -rl "github_issue: ` outside the
      allowlisted §0a history note (guard test).
- [ ] review-task's Jira-key branch resolves a quoted key to its one task document and not to a
      `.request.` sibling or a prefix neighbour (executed fixture test, bash and zsh).

### Performance

- [ ] None — one lookup replaces one lookup.

### Code Quality

- [ ] Guard test green, with a red-on-revert mutation; `npm run bundle:check` and the full suite green.
- [ ] `npm run validate -- skills/review-task/` and `npm run validate -- skills/review-story/` pass.

### Migration

- [ ] None — no consumer action beyond `setup-consumer.sh --update`.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

- **A review that relied on a prefix match now halts.** Mitigation: correct by construction; CHANGELOG.

### Low Risk Areas

- Bundle closure grows by one file in each skill. Mitigation: a citation bundles the file alone.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: review-task or review-story cannot resolve a document it resolved before.
**Steps**: revert the merge commit; `npm test` and `npm run bundle:check` green.

### Partial Rollback (1-2 hours)

**When to Use**: one site misbehaves. **Steps**: revert that site's hunk; keep the guard's allowlist
accurate.

### Forward Fix (< 4 hours)

**When to Use**: wording or binding issues at a site.

### Rollback Triggers

**Critical**: a review anchored on the wrong document. **Non-critical**: prose wording.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                       | Author      |
| ---------- | ------- | ------------------------------------------------- | ----------- |
| 2026-10-02 | 1.0     | Initial draft — task.176 Deferred Work item 5     | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Cite §0a

- [ ] review-task:99
- [ ] review-task:134
- [ ] review-story:189
- [ ] Bundle

### Phase 2: Guard test

- [ ] Test
- [ ] Mutation check

### Phase 3: CHANGELOG

- [ ] Entry

---

## References

- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § Key → document lookup
- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.review-pr-tracker-issue-input.md` § Deferred Work

---

## Notes

- QA artifacts will be co-located here: `task.178.qa.{N}.*.md`, `task.178.gate.{N}.*.yml`, bug reports
  `task.178.bug.{N}.*.md`.
