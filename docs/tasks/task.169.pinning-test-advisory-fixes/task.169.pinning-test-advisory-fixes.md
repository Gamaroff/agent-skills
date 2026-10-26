---
id: task.169
title: "[Task 169] Close the four advisory findings on the reference-doc pinning test"
type: task
description: "Follow-up to task.142: tests/reference-doc-skill-pinning.test.js matches flags by substring, never checks activation-table flags, reports an empty SKILL.md as missing, and resolves the corpus twice — fix all four, each pinned by a test."
tags: [testing, guard, reference-docs, follow-up, task-142]
category: testing
status: accepted
priority: Low
created: 2026-09-30
updated: 2026-10-26
completed_date: 2026-10-26
pr_number: 758
assignee:
estimated_effort_hours: 2
risk_level: low
github_issue: 535
---

# Technical Task: Close the four advisory findings on the reference-doc pinning test

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.169.review.1.pinning-test-advisory-fixes.md` implemented 2026-10-26

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

- Command-row flag checks — every `--flag` in a `commands.md` row's first cell, deduped per row,
  whose skill resolves: **19** at `bcd37b71`, **24** at `81ea2550` (2026-10-26, review re-measure). With
  a trailing-boundary match (`(?![a-z0-9-])`), **0** fail at both. The count drifts; the test's floor
  (`>= 16`) is what holds it, not this figure.
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

- [x] Add `escapeRegExp` and `documentsFlag(body, flag)` using `(?![a-z0-9-])`; use it in `resolveCorpus`.
- [x] Fixture: a `SKILL.md` body holding only `--read-only` does not document `--read`.
- [x] `resolveCorpus` distinguishes `null` (missing) from blank text (empty), with two messages — on
      **both** sides: command rows (`missingCommands` / `emptySkills`) and activation mentions
      (`missingNamed` / `emptySkills`, replacing today's `!lookup(n.skill)`).
- [x] Fixture: `resolveCorpus` with a fake lookup returning `""` for `develop-next` (named on both
      pages — `commands.md` and `activation-phrases.md:43`) reports "is empty" in `emptySkills` and
      names `develop-next` in neither `missingCommands` nor `missingNamed`.
- [x] Call-site prefix fixture: `resolveCorpus` with a lookup that lengthens every `--flag` in each
      `SKILL.md` (`--x` → `--x-z`) reports every flag check as undocumented
      (`undocumentedFlags.length === flagChecks > 0`). Holds the call site, not only `documentsFlag`.

**Dependencies**: none.

### Phase 2: Activation flags checked

**Risk Level**: Low

**Files**: `tests/reference-doc-skill-pinning.test.js`

**Changes**:

- [x] `extractActivationSkills` attaches a standalone `--flag` span to the preceding skill span.
- [x] Keep today's per-row dedupe of skill spans (order-preserving): a skill named twice in one cell
      yields one mention; a flag span still attaches.
- [x] `resolveCorpus` checks each activation flag with `documentsFlag`, returning
      `undocumentedActivationFlags` and `activationFlagChecks`.
- [x] Live test: `undocumentedActivationFlags` is empty and `activationFlagChecks >= 2` (3 measured).
- [x] Fixture: `` `review-bug` (picks `--validate`) `` yields skill `review-bug` with flag `--validate`.
- [x] The call-site prefix fixture also asserts
      `undocumentedActivationFlags.length === activationFlagChecks > 0`.

**Dependencies**: Phase 1 (`documentsFlag`).

### Phase 3: One corpus resolution per run

**Risk Level**: Low

**Files**: `tests/reference-doc-skill-pinning.test.js`, `CHANGELOG.md`

**Changes**:

- [x] Memoised `getCorpus()`; both live `describe` blocks read it.
- [x] Test: `getCorpus()` returns the same object on every call, and a second call reads neither
      reference page (spy on `fs.readFileSync`).
- [x] CHANGELOG `[Unreleased]` line.
- [x] Mutation-prove each of the four fixes (six mutations, both reverts of the flag fix and both sides of empty-vs-missing).

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

- [x] Prefix flag not documented by a longer flag — at `documentsFlag` and at `resolveCorpus`.
- [x] Standalone activation flag span attaches to its skill.
- [x] Empty vs missing `SKILL.md` produce distinct messages, on both pages.

**Command**: `command node --test tests/reference-doc-skill-pinning.test.js`

### Integration Tests

**Scope**: the live corpus.

**Actions**:

- [x] Command-row and activation flags all documented; activation floor holds.
- [x] `getCorpus()` identity and single-read assertion.

**Command**: `npm test`

### Performance Tests

**Scope**: none beyond the existing cost tests, which must stay green.

### Consumer Tests

**Scope**: none — the test never ships to a consumer.

---

## 9. Success Criteria

### Functional

- [x] A row flag that a skill documents only as a longer flag fails the flag test — held by the
      prefix fixture and the call-site prefix fixture, and by two mutations: `documentsFlag` reverted
      to `includes`, and `resolveCorpus` reverted to `body.includes(flag)` with the helper kept.
- [x] Every activation-table flag is checked against its skill — held by the live activation-flag
      test (floor ≥ 2) and a mutation removing a documented flag's check.
- [x] An empty `SKILL.md` reports "is empty", a missing one "does not exist", on both pages — held by
      the fake-lookup fixture, which asserts the command and the activation side.
- [x] The corpus is resolved once per run — held by the `getCorpus()` identity and single-read test.

### Performance

- [x] The existing cost tests (no spawn/network; one `SKILL.md` read per skill) stay green — held by
      those two tests.

### Code Quality

- [x] `node:test` + `node:assert` only; Prettier clean; `npm test` green with `.claude/skills` and
      `.agents/skills` moved aside.
- [x] Each of the four fixes mutation-proven: reverting it turns a named test red.

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` records the change.
- [x] No consumer-facing change.

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

## Implementation Summary

**Completion Date**: 2026-10-26

**Approach**: Inline from the co-located plan (develop-task Step 3), one file. `documentsFlag(body, flag)`
matches `escapeRegExp(flag) + "(?![a-z0-9-])"` and replaces both `body.includes(flag)` call sites in
`resolveCorpus`. `extractActivationSkills` walks the cell's spans in order: a skill span becomes a
mention (one per skill per row — a repeated skill re-points to its first mention), a `--flag` span
attaches to the last skill seen, and one with no skill before it is dropped. `resolveCorpus` now treats
`lookup() === null` as missing and a blank body as empty on both pages, returns `emptySkills`,
`undocumentedActivationFlags` and `activationFlagChecks`, and both live groups read a memoised
`getCorpus()`. `withSpies` moved to module scope so the resolved-once test can use it. No reference
page changed: the live corpus passes the stricter checks as measured.

**Testing Results**:

- `command node --test tests/reference-doc-skill-pinning.test.js`: 29 tests, 0 failures (was 18).
  New: four extractor fixtures (standalone flag, two skills + trailing flag, repeated skill, orphan
  flag), `resolution rules` (whole-token match; call-site prefix fixture; empty vs missing on both
  pages; missing vs empty), three live tests (empty on each page, activation flags with floor 2 —
  3 checked), and `the corpus is resolved once per run`.
- Mutation proofs (each reverted one fix; the named tests went red, then the file was restored):
  M1 `documentsFlag` → `body.includes(flag)` → whole-token fixture + call-site prefix fixture red;
  M2 both `resolveCorpus` call sites → `body.includes(flag)` with the helper kept → call-site prefix
  fixture red; M3 standalone-flag attachment removed → three extractor fixtures + live activation-flag
  test red (1 check < floor 2); M4 `body === null` → `!body` on the command side → empty-vs-missing
  fixture red; M4b the same on the activation side → empty-vs-missing fixture red; M5 `getCorpus`
  without the memo → resolved-once test red.
- `npm run ci:fast` (format check + full hermetic suite) with `.agents/skills` and `.claude/skills`
  moved aside: 6,406 tests, 6,392 pass, 0 fail.

**Deferred Work**: none.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-26
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.169.qa.1.pinning-test-advisory-fixes.md](./task.169.qa.1.pinning-test-advisory-fixes.md)
- **Gate File**: [task.169.gate.1.pinning-test-advisory-fixes.yml](./task.169.gate.1.pinning-test-advisory-fixes.yml)

### Test Coverage Summary

- **Tests Executed**: 29 in the target file; 6,406 in `npm run ci:fast` (6,392 pass, 0 fail)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No critical issues identified. 8/8 QA mutation proofs are covered by committed tests. Two low
diff-review points (CR-1, CR-2) are advisory follow-ups in the gate's `recommendations.future`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.169.qa.1.pinning-test-advisory-fixes.md`
**Gate File**: `task.169.gate.1.pinning-test-advisory-fixes.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 9/9 met, each with a committed per-PR test or a cited document line
✅ **Unit Tests:** 29 tests in `tests/reference-doc-skill-pinning.test.js` (was 18); 8/8 QA mutation proofs covered
✅ **PR Review:** PR #758; Step 5c review APPROVE (`task.169.pr-review.1.pinning-test-advisory-fixes.md`); CI SUCCESS on `9ac0f7a0`
✅ **Documentation:** `CHANGELOG.md` `[Unreleased]` entry (task 169)
✅ **Security Review:** PASS — test-only change, no secrets or unsafe patterns, `boundary: false`
— **Compliance Review:** NOT_APPLICABLE — no data, payment, UI or health scope

**Task marked as ACCEPTED on:** 2026-10-26

**Detailed Verification Log:** See `task.169.dod.1.pinning-test-advisory-fixes.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-30 | 1.0     | Initial draft | create-task |
| 2026-10-26 | 1.1     | Review passed (9/10) — empty-vs-missing split on both pages; call-site prefix fixture added; flag figure re-measured (24); skill-span dedupe made explicit | review-task |
| 2026-10-26 |         | Status → ready-for-development | review-task |
| 2026-10-26 |         | Implemented — 2 files (test + CHANGELOG), 11 tests added, 6 mutation proofs | develop |
| 2026-10-26 |         | QA gate PASS (100/100) — 0 findings in queue, 2 advisory | qa-task |
| 2026-10-26 | 1.2 | DoD passed — accepted (PR #758) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Boundary flag match and empty-vs-missing

- [x] `documentsFlag` + prefix fixture
- [x] Empty vs missing messages + fixture

### Phase 2: Activation flags checked

- [x] Standalone flag attachment + fixture
- [x] Live activation-flag assertion with floor

### Phase 3: One corpus resolution per run

- [x] `getCorpus()` + identity/single-read test
- [x] CHANGELOG
- [x] Mutation proofs (six — see Implementation Summary)

---

## References

- **Parent task**: task.142 — `docs/tasks/task.142.reference-doc-skill-pinning/`
- **Findings**: `task.142.gate.1` CR-1/CR-2 (via `task.142.qa.1`), `task.142.gate.3` `recommendations.future`
- **Observation**: #222 — criteria written so finalise can pass them before merge

---

## Notes

- `command node`, never bare `node`.
- Move `.claude/skills` and `.agents/skills` aside before trusting a local green.
