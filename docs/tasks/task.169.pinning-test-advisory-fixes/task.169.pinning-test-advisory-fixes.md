---
id: task.169
title: "[Task 169] Close the four advisory findings on the reference-doc pinning test"
type: task
description: "Follow-up to task.142: tests/reference-doc-skill-pinning.test.js matches flags by substring, never checks activation-table flags, reports an empty SKILL.md as missing, and resolves the corpus twice — fix all four, each pinned by a test."
tags: [testing, guard, reference-docs, follow-up, task-142]
category: testing
status: planned
priority: Low
created: 2026-09-30
updated: 2026-09-30
assignee:
estimated_effort_hours: 2
risk_level: low
github_issue: 535
---

# Technical Task: Close the four advisory findings on the reference-doc pinning test

**Status:** Planned

**GitHub Issue**: [#535](https://github.com/Gamaroff/agent-skills/issues/535)

---

## 1. Overview

task.142 shipped `tests/reference-doc-skill-pinning.test.js`, which pins every command, flag and
skill name in `docs/reference/commands.md` and `docs/reference/activation-phrases.md` to `skills/`.
Its QA gates left four advisory findings open (gate 1 CR-1 and CR-2; gate 3
`recommendations.future`). This task closes all four in the one file.

**Scope**: `tests/reference-doc-skill-pinning.test.js` only, plus a CHANGELOG line.

**Key deliverables**:

1. Flags match on a word boundary, so a flag no skill documents cannot pass on a longer one.
2. Activation-table flags are checked against the named skill, with a floor.
3. An empty `SKILL.md` gets its own failure message, distinct from a missing one.
4. The corpus is resolved once per run, not once per `describe` block.

**Expected outcome**: the guard catches a defect class it misses today (prefix flags, activation
flags), and each fix is held by a test that goes red when the fix is reverted.

---

## 2. Motivation

### Current Problems

1. **A prefix flag passes.** The flag check is `body.includes(flag)`
   (`tests/reference-doc-skill-pinning.test.js`, `undocumentedFlags` in `resolveCorpus`), so a row
   advertising `--read` passes against a `SKILL.md` that documents only `--read-only`. That is the
   defect class the test exists to catch; today no row relies on it (measured below).
2. **Activation flags are unchecked.** `extractActivationSkills` returns a `flags` array that no
   assertion reads, and a flag written as its own span (`` `review-bug` (… picks `--validate`) ``) is
   dropped entirely. The field reads as a check that is not made.
3. **Two states share one message.** `resolveCorpus` tests `!body`, so an empty `SKILL.md` and a
   missing one both report "does not exist" — the wrong fix for the empty case.
4. **The corpus is resolved twice.** Each live-corpus `describe` block calls `resolveCorpus(skillMd)`
   at registration, reading and parsing both pages twice for one result.

### Benefits

1. The flag guard's precision matches its stated purpose.
2. Three more flags (the activation table's) are pinned.
3. A failure message points at the right fix.
4. One corpus read per run.

---

## 3. Technical Background

### Current Architecture

All four sites are in `tests/reference-doc-skill-pinning.test.js` (grep anchors, not line numbers):

- `function resolveCorpus(lookup)` — the one function the live assertions and the cost tests share
  (task.142 QA cycle 2). It collects `missingCommands`, `undocumentedFlags` (via `body.includes`),
  `flagChecks` and `missingNamed`, and treats `!body` as "does not exist".
- `function extractActivationSkills(md)` — returns `{ line, skill, flags }`; `flags` holds only
  `--x` tokens inside the skill's own span.
- `describe("commands.md names commands that exist"` and
  `describe("activation-phrases.md names skills that exist"` — each calls `resolveCorpus(skillMd)`.
- `describe("the guard's cost"` — spies `fs.readFileSync` around `resolveCorpus(makeSkillMd())`.

Measured on `develop` at `bcd37b71` (2026-09-30), by the commands in the plan:

- Command-row flag checks: **19**; with a trailing-boundary match (`(?![a-z0-9-])`), **0** fail.
- Activation-table flags: **3** — `review-story --validate` (in-span, line 29), `review-bug`
  `--validate` (separate span, line 30), `observe-work` `--review` (separate span, line 105). All
  three are documented by their skill under the boundary match.
- Empty `SKILL.md` files under `skills/`: **0** (`[ -s "$f" ]` over `skills/*/SKILL.md`).

### Target Architecture

- `resolveCorpus` matches each flag with `new RegExp(escapeRegExp(flag) + "(?![a-z0-9-])")`.
- `extractActivationSkills` attaches a standalone `--flag` span to the nearest preceding skill span
  in the same cell; `resolveCorpus` checks every activation flag against its skill with the same
  boundary match, counts `activationFlagChecks`, and collects `undocumentedActivationFlags`.
- The lookup returns `null` for a missing file and the text (possibly `""`) otherwise;
  `resolveCorpus` reports `body === null` as missing and `body.trim() === ""` as empty, with two
  messages.
- A memoised `getCorpus()` at module scope returns one result object; both `describe` blocks read it.

### Important Clarifications

- **No criterion here is post-merge or untested** (lesson of obs #222): every success criterion
  names the test that holds it.
- The live corpus changes nothing — no reference-doc edit is expected. A red first run means the
  change is wrong, not the docs.

---

## 4. Scope

### In Scope

✅ The four fixes in `tests/reference-doc-skill-pinning.test.js`, each with a fixture or live test.
✅ A CHANGELOG `[Unreleased]` line.

### Out of Scope

❌ Any change to `docs/reference/*.md` — none is needed (measured above).
❌ The reverse-direction guard `tests/skill-doc-coverage.test.js`.
❌ Generating `commands.md` from frontmatter (task.142 § Future Improvements).

---

## 5. Breaking Changes

None — API stable. One test file changes; it gains assertions and fails only on a reference row that
is already wrong.

---

## 6. Implementation Plan

> Detailed implementation guide:
> [task.169.plan.pinning-test-advisory-fixes.md](task.169.plan.pinning-test-advisory-fixes.md)

### Phase 1: Boundary flag match and empty-vs-missing

**Risk Level**: Low

**Files**: `tests/reference-doc-skill-pinning.test.js`

**Changes**:

- [ ] Add `escapeRegExp` and `documentsFlag(body, flag)` using `(?![a-z0-9-])`; use it in `resolveCorpus`.
- [ ] Fixture: a `SKILL.md` body holding only `--read-only` does not document `--read`.
- [ ] `resolveCorpus` distinguishes `null` (missing) from blank text (empty), with two messages.
- [ ] Fixture: `resolveCorpus` with a fake lookup returning `""` for one skill reports "is empty",
      not "does not exist".

**Dependencies**: none.

### Phase 2: Activation flags checked

**Risk Level**: Low

**Files**: `tests/reference-doc-skill-pinning.test.js`

**Changes**:

- [ ] `extractActivationSkills` attaches a standalone `--flag` span to the preceding skill span.
- [ ] `resolveCorpus` checks each activation flag with `documentsFlag`, returning
      `undocumentedActivationFlags` and `activationFlagChecks`.
- [ ] Live test: `undocumentedActivationFlags` is empty and `activationFlagChecks >= 2` (3 measured).
- [ ] Fixture: `` `review-bug` (picks `--validate`) `` yields skill `review-bug` with flag `--validate`.

**Dependencies**: Phase 1 (`documentsFlag`).

### Phase 3: One corpus resolution per run

**Risk Level**: Low

**Files**: `tests/reference-doc-skill-pinning.test.js`, `CHANGELOG.md`

**Changes**:

- [ ] Memoised `getCorpus()`; both live `describe` blocks read it.
- [ ] Test: `getCorpus()` returns the same object on every call, and a second call reads neither
      reference page (spy on `fs.readFileSync`).
- [ ] CHANGELOG `[Unreleased]` line.
- [ ] Mutation-prove each of the four fixes.

**Dependencies**: Phases 1–2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `tests/reference-doc-skill-pinning.test.js` — all four fixes and their tests.

### Files to Modify (Tests)

Same file.

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

2. ✅ `CHANGELOG.md` — `[Unreleased]`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: fixtures over inline strings and a fake lookup.

**Actions**:

- [ ] Prefix flag not documented by a longer flag.
- [ ] Standalone activation flag span attaches to its skill.
- [ ] Empty vs missing `SKILL.md` produce distinct messages.

**Command**: `command node --test tests/reference-doc-skill-pinning.test.js`

### Integration Tests

**Scope**: the live corpus.

**Actions**:

- [ ] Command-row and activation flags all documented; activation floor holds.
- [ ] `getCorpus()` identity and single-read assertion.

**Command**: `npm test`

### Performance Tests

**Scope**: none beyond the existing cost tests, which must stay green.

### Consumer Tests

**Scope**: none — the test never ships to a consumer.

---

## 9. Success Criteria

### Functional

- [ ] A row flag that a skill documents only as a longer flag fails the flag test — held by the
      prefix fixture and a mutation reverting to `includes`.
- [ ] Every activation-table flag is checked against its skill — held by the live activation-flag
      test (floor ≥ 2) and a mutation removing a documented flag's check.
- [ ] An empty `SKILL.md` reports "is empty", a missing one "does not exist" — held by the fake-lookup
      fixture.
- [ ] The corpus is resolved once per run — held by the `getCorpus()` identity and single-read test.

### Performance

- [ ] The existing cost tests (no spawn/network; one `SKILL.md` read per skill) stay green — held by
      those two tests.

### Code Quality

- [ ] `node:test` + `node:assert` only; Prettier clean; `npm test` green with `.claude/skills` and
      `.agents/skills` moved aside.
- [ ] Each of the four fixes mutation-proven: reverting it turns a named test red.

### Migration

- [ ] `CHANGELOG.md` `[Unreleased]` records the change.
- [ ] No consumer-facing change.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

**1. A boundary regex too strict for a real flag**

- **Risk**: a flag followed by `=` or `.` in `SKILL.md` stops matching.
- **Probability**: Low — `=` and `.` are outside `[a-z0-9-]`, so they still match; measured 0 failures.
- **Mitigation**: the fixture set includes `--flag=value` and `--flag.` forms.

**2. Attaching a standalone flag to the wrong skill**

- **Risk**: a cell naming two skills attaches a flag to the first.
- **Probability**: Low — the rule is "nearest preceding skill span"; no current cell names two skills
  and a flag.
- **Mitigation**: fixture with two skill spans and a trailing flag.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the test is red on `develop` for a reason nobody can localise.

**Steps**: revert the merge commit; `npm test` green.

### Partial Rollback (1-2 hours)

**When to Use**: one fix is wrong (most plausibly activation-flag attachment).

**Steps**: revert that phase's hunk and its test; keep the other three.

### Forward Fix (< 4 hours)

**When to Use**: a regex edge case or a message wording issue.

### Rollback Triggers

**Critical**: flaky or unlocalisable red. **Non-critical**: edge cases, wording.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-30 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Boundary flag match and empty-vs-missing

- [ ] `documentsFlag` + prefix fixture
- [ ] Empty vs missing messages + fixture

### Phase 2: Activation flags checked

- [ ] Standalone flag attachment + fixture
- [ ] Live activation-flag assertion with floor

### Phase 3: One corpus resolution per run

- [ ] `getCorpus()` + identity/single-read test
- [ ] CHANGELOG
- [ ] Four mutation proofs

---

## References

- **Parent task**: task.142 — `docs/tasks/task.142.reference-doc-skill-pinning/`
- **Findings**: `task.142.gate.1` CR-1/CR-2 (via `task.142.qa.1`), `task.142.gate.3` `recommendations.future`
- **Observation**: #222 — criteria written so finalise can pass them before merge

---

## Notes

- `command node`, never bare `node`.
- Move `.claude/skills` and `.agents/skills` aside before trusting a local green.
