---
id: task.217
title: "Finding-anchors advisory follow-ups"
type: task
description: "Close the nine advisory items task.195's QA gates carried to future work: the --inline guards trust any anchor_check string, a non-object finding crashes the checker or is never annotated, the inline selectors split anchors differently from the checker and post untrimmed paths, review-code --staged --fix edits a tree it did not check, review-code's --inline block reads three unbound variables, and two test-hygiene gaps."
tags: [finding-anchors, review-pr, review-code, follow-up, hardening]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-19
updated: 2026-10-24
assignee:
estimated_effort_hours: 16
github_issue: 698
completed_date: 2026-10-24
pr_number: 745
---

# Technical Task: Finding-anchors advisory follow-ups

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.217.review.1.finding-anchors-advisory-follow-ups.md` implemented 2026-10-23

**GitHub Issue**: [#698](https://github.com/Gamaroff/agent-skills/issues/698)

---

## 1. Overview

task.195 (PR #695, merged 2026-10-19) made the finding-anchors checker the one judge of where a review finding points. Its five QA gates routed nine smaller defects to future work. They sit in the same three places: the checker engine, the two `--inline` blocks that post findings beside their lines, and the checker's tests. This task closes all nine.

**Scope**: `shared/resources/finding-anchors.js` (bundled into four skills), the `--inline` blocks of `skills/review-pr/SKILL.md` and `skills/review-code/SKILL.md`, review-code's `--fix` step, `shared/resources/tests/finding-anchors.test.mjs`, `evals/shared/tests/finding-anchors-blocks.test.mjs`, the guard tests in both skills' `tests/`, and `CHANGELOG.md`.

**Key deliverables**:

1. The engine handles every input it can be given: a non-object finding is refused as `usage`, never a crash and never a silent pass. An annotated file carries a stamp that only the checker writes.
2. The `--inline` blocks post exactly the anchor the checker verified: the same grammar, the same trimmed path, and only with the checker's stamp and a known verdict.
3. review-code's `--inline` and `--fix` steps are runnable as written and never edit a file whose working-tree content differs from what was reviewed.

**Expected outcome**: no finding-anchors input or caller shape found by task.195's QA is still open, and each closing fix is held by a test that a mutation turns red.

---

## 2. Motivation

### Current Problems

1. **The guards trust any string** (gate 3 CR-2). Both `--inline` guards check only `(.anchor_check | type) == "string"` (`skills/review-pr/SKILL.md:976`, `skills/review-code/SKILL.md:172`). A reviewer that writes `anchor_check: "ok"` itself, with no checker run, gets its findings posted inline as verified.
2. **A non-object finding crashes the checker or slips past it** (gate 2 CR-2, gate 3 CR-3). `checkAnchors` reads `f.id` first (`shared/resources/finding-anchors.js:145`, `const id = f.id ?? null;`). Measured on `develop` at `7d67f5ad`: `{"code_review":{"findings":[null]}}` throws a TypeError, so the dispatcher reports "checker not runnable". `{"pr_conformance":{"findings":["x"]}}` reads `ok`/`no-line`, but `--annotate` skips it (`finding-anchors.js:450`, `if (f && typeof f === "object")`), so review-pr's guard then HALTs with the "run Step 6 first" message, which names the wrong cause.
3. **The selectors split anchors differently from the checker** (gate 3 CR-4). The checker's grammar is `/^(\S+):(-?\d+)$/` on the trimmed value (`finding-anchors.js:131`), which takes the **last** colon. Both selectors take the **first**, with `split(":")[0]` and `split(":")[1]` (`skills/review-pr/SKILL.md:986`, `skills/review-code/SKILL.md:178`), so a path containing a colon posts to the wrong file.
4. **The selectors post untrimmed paths** (gate 4). The checker trims `file_line` before parsing it, so `"  a.js:1"` verifies (measured: `unchecked-text`). The selector's `test("^.+:[0-9]+$")` accepts the untrimmed value, and the posted path starts with two spaces.
5. **`review-code --staged --fix` edits a tree it did not check** (gate 2 CR-3). With `--staged`, Step 2b checks anchors with `--index` (`skills/review-code/SKILL.md:94`), but Step 5 applies fixes to the working tree (`skills/review-code/SKILL.md:239`). When the two differ for a named file, the edit lands on a line the checker never saw.
6. **review-code's `--inline` block cannot run as written** (gate 1 CR-2, pre-existing). It writes `> "$INLINE_FILE"` and reads `$PR_NUMBER` and `$SUMMARY_FILE` (`skills/review-code/SKILL.md:182-187`), but nothing in the block binds any of the three. review-pr's block binds its own (`skills/review-pr/SKILL.md:945-950`).
7. **Two test-hygiene gaps** (gate 1 CR-4 and CR-5, dropped from the carry chain at gate 3).
   - The `--index outside a git work tree` assertion (`shared/resources/tests/finding-anchors.test.mjs:999`) makes its plain directory under `os.tmpdir()`. When `TMPDIR` sits inside a git checkout, git finds that checkout and the assertion fails.
   - `evals/shared/tests/finding-anchors-blocks.test.mjs:41` hard-codes the four dispatchers. A fifth document that runs the checker would never be tested.

### Benefits of Closing Them

- **An inline anchor is verified, not asserted.** Only a checker run can produce a postable finding.
- **The checker has no crashing input.** A malformed review is refused with a reason the dispatcher already handles (`usage`), never misread as "not runnable".
- **The selectors and the checker agree.** The path the checker verified is the path that gets posted.
- **`--staged --fix` no longer edits a line nobody checked.**
- **The guard tests cover the whole population** and pass wherever `TMPDIR` lives.

---

## 3. Technical Background

### Current Architecture

- **Engine** (`shared/resources/finding-anchors.js`, bundled to `skills/{review-pr,review-code,qa-task,qa-story}/references/`):
  - `findingsOf(doc)` (`:172`) returns the findings of every lens present, or null.
  - `lensesOf(doc)` names each finding's lens.
  - `checkAnchors` (`:142`) returns one verdict per finding: `fieldOf` (`:110`) classifies each field, and `anchorOf` (`:123`) parses the anchor.
  - `run` (`:395`) writes `anchor_check` onto each **object** finding under `--annotate` (`:448-452`).
  - The verdict sets are `MALFORMED` (`:96`, four verdicts) and the three clean ones: `ok`, `unchecked-text`, `no-line`.
- **Dispatchers.** The checker blocks in review-pr Step 6, review-code Step 2b, qa-task and qa-story decide on the JSON `reason`. `usage` HALTs with "refused the call (usage)", and the review-code block's wording is pinned by `task.195.qa.3.step2b-checker-cases.json`.
- **`--inline` blocks.**
  - review-pr's block (`skills/review-pr/SKILL.md:945-997`) binds its inputs. It refuses un-annotated input with `jq -e` (`:974-978`), runs `mktemp` only after the guard (`:980`), then selects `anchor_check ∈ {ok, unchecked-text}` and splits the anchor on `:`.
  - review-code's block (`skills/review-code/SKILL.md:156-188`) has the same guard and selector for the code lens only, and binds `FINDINGS_JSON` alone.
- **review-code targets.** Step 2b maps `staged` to `--index` (`skills/review-code/SKILL.md:91-96`). Step 5 `--fix` skips findings with a malformed `anchor_check` (`:239`) and edits the working tree.

### Target Architecture

- **Engine.**
  - `findingsOf` (or a check in `run` before `checkAnchors`) refuses a findings array that holds a non-object (null, string, number, boolean or array) with `reason: usage`, exit 2. The message names the lens and the index. Nothing is annotated.
  - `--annotate` also writes a top-level stamp beside the wrappers: `anchor_checked: {by: "finding-anchors", findings: <count>}`. Only the engine writes it.
- **`--inline` guards.** Each guard additionally requires:
  - `.anchor_checked.by == "finding-anchors"`;
  - `.anchor_checked.findings` equal to the number of findings across the present lenses;
  - every `anchor_check` to be one of the seven verdicts.
- **Selectors.** Each selector trims the anchor and parses it with `capture("^(?<path>\\S+):(?<line>-?[0-9]+)$")`, the checker's grammar. The posted path is the captured, trimmed path.
- **review-code `--staged --fix`.** Before applying a finding, Step 5 checks `git diff --quiet -- <path>` for the finding's path. When the working tree differs from the index, the finding is skipped and listed as "skipped — working tree differs from the staged content that was reviewed".
- **review-code `--inline`.** The block binds `PR_NUMBER="{pr-number}"` and `SUMMARY_FILE="{summary-file}"` with presence checks, makes `INLINE_FILE` with `mktemp` after the guard, and removes it afterwards, the same shape as review-pr's block.

### Important Clarifications

- **Why `usage` for a non-object finding, not a new verdict.** A new verdict would grow the seven-verdict enumeration that four SKILL.md files, the develop-bug verify loop and the review-pr schema each restate (`skills/review-pr/SKILL.md:790`). That is the enumeration-drift class in `docs/reference/anti-patterns.md`. A non-object finding is a malformed review, not a mislocated finding, and every dispatcher already HALTs on `usage`.
- **What the stamp does and does not stop.** It stops a reviewer that writes `anchor_check` itself without a checker run: the review prompts never produce `anchor_checked`. A deliberate forger who writes the stamp too is out of scope, because reviewers are subagents following a prompt, not adversaries. The count stops a stamp left over from an earlier run on a file that has gained findings since.
- **This is a second mechanism beside an existing one** (obs #103). The guard's type check stays, and the stamp and verdict checks are added to the same `jq -e` expression. No new guard block is added.

---

## 4. Scope

### In Scope

- ✅ The nine items in §2, each with a reproducing test and a mutation proof
- ✅ `shared/resources/finding-anchors.js` and its four bundled copies (via `npm run bundle`)
- ✅ The two `--inline` blocks and review-code Step 5
- ✅ `CHANGELOG.md` `[Unreleased]` › Fixed

### Out of Scope

- ❌ A cryptographic or tamper-proof stamp, because the threat is a careless reviewer, not a hostile one
- ❌ Re-running the checker inside the `--inline` blocks, which would need root and rev bindings these blocks do not carry
- ❌ Changing the seven-verdict set or the dispatchers' `reason` decision (task.195)
- ❌ Inline posting for conformance findings in review-code, which has no conformance lens

---

## 5. Breaking Changes

### Breaking Change 1: a non-object finding is refused

**Before**: a `null` finding crashed the checker (exit 1 with a stack, read as "not runnable"). A string or number finding read `no-line`/`unparseable` and was never annotated.
**After**: `finding-anchors.js` exits 2 with `reason: usage`, naming the lens and the index.
**Impact**: a review whose findings array holds a non-object now HALTs at the dispatcher with "refused the call (usage)". It is no longer misread as "not runnable", and it no longer passes.
**Migration**: none for callers, because every dispatcher already HALTs on `usage`. A reviewer producing such output must fix its output; that is the intent.

### Breaking Change 2: the `--inline` guards require the checker's stamp

**Before**: any string `anchor_check` passed.
**After**: the file must carry `anchor_checked` written by `--annotate`, with a matching count and known verdicts.
**Impact**: a findings file annotated by an older engine (no stamp) HALTs the inline post with the existing "run Step 6's anchor check first" message.
**Migration**: re-run the checker step, which writes the stamp. Bundled copies ship engine and guard together, so a consumer upgrading both at once is unaffected.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.217.plan.finding-anchors-advisory-follow-ups.md](task.217.plan.finding-anchors-advisory-follow-ups.md)

### Phase 1: Engine — refuse non-object findings, stamp annotated files

**Risk**: Medium (the engine is bundled into four skills)
**Files**: `shared/resources/finding-anchors.js`, `shared/resources/tests/finding-anchors.test.mjs`

- [x] A findings array holding a non-object (null, string, number, boolean or array) exits 2 with `reason: usage` and a message naming the lens and the index. Nothing is annotated, and no file is read (items 2 and 5)
- [x] `--annotate` writes `anchor_checked: {by: "finding-anchors", findings: N}` at the top level of a wrapped document. For a bare array, which has no top level to stamp, the guard keeps today's behaviour and the plan states that explicitly (item 1)
- [x] Unit and CLI tests for both, including `[null]` on each lens, and the stamp's count on a two-lens file
- [x] `GIT_CEILING_DIRECTORIES` is set for the outside-a-work-tree call in the `--index` test (item 8)
- [x] `npm run bundle`

### Phase 2: `--inline` blocks — the checker's grammar, its stamp and its verdicts

**Risk**: Medium (outward-facing: these blocks post PR comments)
**Files**: `skills/review-pr/SKILL.md`, `skills/review-code/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js`
**Depends on**: Phase 1 (the stamp)

- [x] Both guards require the stamp, the matching count and the seven-verdict enumeration (item 1)
- [x] Both selectors trim the anchor and parse it with `capture()` in the checker's grammar (items 3 and 4)
- [x] review-code's block binds `PR_NUMBER` and `SUMMARY_FILE`, makes `INLINE_FILE` after the guard, and removes it (item 7)
- [x] Guard tests: a reviewer-written `anchor_check` with no stamp HALTs; a stale count HALTs; `"verified"` HALTs; `"src/a:b.js:3"` posts path `src/a:b.js` line 3; `"  a.js:1"` posts path `a.js`
- [x] **Removed-literal sweep** (`git grep -n 'anchor_check | type' -- '*.test.*'`, run 2026-10-23): `extractInlineGuard` in `skills/review-pr/tests/review-pr.test.js` (`:2495`) and the guard extractor in `skills/review-code/tests/review-code.test.js` (`:379`) both locate the guard by the literal `select((.anchor_check | type) != "string")`, which 2a replaces. Re-key both extractors on a literal the new guard keeps (e.g. `anchor_checked.by`), and add the stamp to each guard test's annotated **control** fixture, which otherwise HALTs
- [x] Probe re-run: write the re-run's cases as a **new** `task.217` cases file. task.195's `dod.2.security.cases.1.json` pins the old HALT message verbatim in its expected `stdout`; it is a historical record and is not edited

### Phase 3: review-code `--staged --fix`, the population guard, and the changelog

**Risk**: Low
**Files**: `skills/review-code/SKILL.md`, `skills/review-code/tests/review-code.test.js`, `evals/shared/tests/finding-anchors-blocks.test.mjs`, `CHANGELOG.md`

- [x] Step 5 skips a finding whose path differs between the working tree and the index under `--staged`, and lists it with its reason (item 6). The check lands as a **fenced `bash` block** in Step 5, and the test extracts that block and runs it against a temp repo, so reverting the block turns the test red (a prose sentence would leave the test green with the fix reverted)
- [x] The blocks test derives the dispatcher population from the tree: every fenced block in `skills/*/SKILL.md` and `shared/resources/*.md` that invokes `finding-anchors.js`. It asserts that the population equals `DISPATCHERS`, with a floor of four (item 9)
- [x] CHANGELOG entry

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finding-anchors.js`: non-object refusal and the `anchor_checked` stamp
2. ✅ `skills/review-pr/SKILL.md`: `--inline` guard and selector
3. ✅ `skills/review-code/SKILL.md`: `--inline` guard, selector and bindings; Step 5 `--staged` skip
4. ✅ `skills/{review-pr,review-code,qa-task,qa-story}/references/finding-anchors.js`: regenerated by `npm run bundle`, never edited by hand

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/finding-anchors.test.mjs`
6. ✅ `skills/review-pr/tests/review-pr.test.js`
7. ✅ `skills/review-code/tests/review-code.test.js`
8. ✅ `evals/shared/tests/finding-anchors-blocks.test.mjs`

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md`

### Files to Delete

None.

The dispatcher population for item 9 is measured, not recalled: `grep -rln 'finding-anchors.js' skills/*/SKILL.md shared/resources/*.md` returned four files on `7d67f5ad` (qa-task, review-pr, review-code, qa-story). The test records the number; this document does not.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `findingsOf`/`run` on non-object findings; the stamp under `--annotate`
- **Command**: `command node --test shared/resources/tests/finding-anchors.test.mjs`
- **Cases**: `[null]`, `["x"]`, `[1]`, `[true]`, `[[]]` on each lens, plus one valid finding beside a non-object (the refusal is not masked); a stamp count over a two-lens file; a bare array (no stamp, as Phase 1 states)

### Integration Tests

- **Scope**: the two `--inline` blocks, executed as the guard tests already do
- **Cases**:
  - **Refused:** reviewer-written `anchor_check` with no stamp; a stamp whose count is one short; `anchor_check: "verified"`.
  - **Accepted:** a stamped, annotated file.
  - **Grammar control:** `src/a:b.js:3` posts `src/a:b.js`; `  a.js:1` posts `a.js`.
- **Control case (obs #176)**: the population test's control is a fenced block that names `finding-anchors.js` in a comment only and must not count.

### Contract Tests

- `evals/shared/tests/finding-anchors-blocks.test.mjs` keeps its per-dispatcher `reason` cases and gains the derived population.

### Performance Tests

Not applicable: no new I/O. The stamp is one key, and the refusal runs before any read.

### Consumer Tests

- `npm run ci:fast` per change; `npm run ci` before the PR
- `TMPDIR=<path inside a git checkout> command node --test shared/resources/tests/finding-anchors.test.mjs` passes (item 8's platform-variance run)

---

## 9. Success Criteria

### Functional

- [x] `{"code_review":{"findings":[null]}}` exits 2 with `reason: usage` naming `code_review.findings[0]` (Phase 1's non-object branch)
- [x] `{"pr_conformance":{"findings":["x"]}}` exits 2 with `reason: usage`, and `--annotate` writes no file (Phase 1's non-object branch)
- [x] An `--annotate` run on a two-lens file writes `anchor_checked.findings` equal to the total finding count (Phase 1's stamp)
- [x] Both `--inline` guards HALT on reviewer-written `anchor_check` with no stamp, on a count mismatch, and on an unknown verdict (Phase 2)
- [x] `file_line: "src/a:b.js:3"` posts path `src/a:b.js` line 3; `"  a.js:1"` posts path `a.js` (Phase 2's selector)
- [x] review-code's `--inline` block runs with only its documented placeholders substituted (Phase 2)
- [x] `--staged --fix` skips a finding whose file differs between the working tree and the index, with the stated reason (Phase 3)
- [x] The blocks test fails when a fifth document runs the checker and is not in `DISPATCHERS` (Phase 3)

### Performance

- [x] The refusal adds no file reads: a non-object input exits `usage` with zero calls to the injected `deps.exec` and no `--annotate` output (asserted by the Phase 1 refusal test with a counting `exec` stub)
- [x] Each distinct path is still read once per run (task.195 SC-8 test stays green)

### Code Quality

- [x] `npm run ci` passes (format, tests, evals, bundle:check, shellcheck)
- [x] `python skills/create-skill/scripts/quick_validate.py skills/<skill>` passes for review-pr, review-code, qa-task and qa-story
- [x] Every fix is mutation-proven: revert it and a named test goes red

### Migration

- [x] CHANGELOG `[Unreleased]` › Fixed cites `(task 217)` and names both breaking changes
- [x] Bundled copies regenerated in the same commit as the source

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The stamp could HALT a legitimate inline post.**
   - Risk: a findings file annotated before this change carries no stamp.
   - Probability: Low, because engine and guard ship together in every bundled skill.
   - Impact: Medium. The inline post HALTs. `/review-pr` has already posted its summary comment; `/review-code` posts nothing until the checker is re-run.
   - Mitigation: the HALT message already says to re-run the checker step. Breaking Change 2 documents it.
2. **The guard's `jq` expression grows.**
   - Risk: task.195's DoD 1 escapes came from exactly this block (`mktemp` before the guard).
   - Mitigation: keep `mktemp` after the guard, and re-run the existing fence probe cases (`task.195.dod.2.security.cases.1.json`) plus new stamp cases.

### Low Risk Areas

1. **Selector grammar.** The new `capture()` matches the checker's regex. A test pins one colon-bearing path and one padded path.
2. **The population test's key is shared** (obs #135). `finding-anchors.js` appears in prose and comments. Match on an invocation (`node … finding-anchors.js`) inside a fenced block, not on the bare name, and keep the comment-only control case.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a dispatcher HALTs on every review with `usage`, or every `--inline` post HALTs on the stamp.

**Steps**:
1. Revert the task's merge commit on `develop`.
2. Run `npm run bundle:check`, because the revert restores the bundled copies with the source.

**Validation**: `npm run ci` green, and a `/review-code` run on any diff completes.

### Partial Rollback (1-2 hours)

**When to use**: only the stamp misfires.

**Steps**: revert Phase 2's guard clause for `anchor_checked`, and keep the enumeration check, the selectors and Phases 1 and 3.

### Forward Fix (< 4 hours)

**When to use**: a selector or `--fix` edge case that does not post to a wrong line. Fix forward with a test.

### Rollback Triggers

- **Critical**: any inline comment posted to a path or line the checker did not verify
- **Non-critical**: an over-strict refusal that HALTs a review with a clear message

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-24
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.217.qa.4.finding-anchors-advisory-follow-ups.md](./task.217.qa.4.finding-anchors-advisory-follow-ups.md)
- **Gate File**: [task.217.gate.4.finding-anchors-advisory-follow-ups.yml](./task.217.gate.4.finding-anchors-advisory-follow-ups.yml)

### Test Coverage Summary
- **Tests Executed**: 255 (targeted suites, 0 fail); 73 security probes, 0 escaped; 3 mutation proofs covered
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. QA3-1 is fixed, and [TASK-217-BUG-5](./task.217.bug.5.step5-relative-checker-path.md) is closed. Three advisory review findings are recorded for follow-up: one pre-existing unbound `$SUMMARY_FILE` in Step 4.3, and two cleanups.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.217.qa.4.finding-anchors-advisory-follow-ups.md`
**Gate File**: `task.217.gate.4.finding-anchors-advisory-follow-ups.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 15/15 met, each with a code citation and a test that runs per PR
✅ **PR Review:** PR #745. The repository requires no reviews; the Step 5c PR review is APPROVE (`task.217.pr-review.1.finding-anchors-advisory-follow-ups.md`)
✅ **CI:** SUCCESS on `11fd2d2e` over 6 checks (CI reading 1)
✅ **Documentation:** CHANGELOG [Unreleased] › Fixed cites (task 217); both SKILL.md bodies updated
✅ **Security Review:** PASS — 3 boundary controls probed, 73 executed, 0 reproduced (`task.217.dod.1.security.run.json`)
⚠️ **Compliance Review:** Not applicable (internal tooling)

**Task marked as ACCEPTED on:** 2026-10-24

**Detailed Verification Log:** See `task.217.dod.1.finding-anchors-advisory-follow-ups.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-19 | 1.0     | Initial draft — the nine advisory items task.195's QA gates 1–5 carried to future work | create-task |
| 2026-10-23 | 1.1     | Review passed (8/10) — added the removed-literal sweep (two guard extractors keyed on the replaced clause, control fixtures need the stamp), a new task.217 probe cases file, a fenced block for the `--staged` skip, and a test-held bound for the performance criterion | review-task |
| 2026-10-23 |         | Status → ready-for-development | review-task |
| 2026-10-23 |         | Implemented — 12 files (engine + 4 bundled copies, 2 SKILL.md, 4 test files, CHANGELOG), 13 new tests; probe re-run 31/31 | develop |
| 2026-10-23 |         | QA gate CONCERNS (80/100) — 6 findings (2 medium, 4 low) | qa-task |
| 2026-10-24 |         | QA findings fixed — 6 of 6 (QA1-1..QA1-6), 1 iteration; gate re-review pending | qa-fix |
| 2026-10-24 |         | QA gate CONCERNS (80/100) — 4 findings (2 medium, 2 low) | qa-task |
| 2026-10-24 |         | QA findings fixed — 4 of 4 (QA2-1..QA2-4), 1 iteration; Step 5's apply list moved into finding-anchors.js --fix-list; gate re-review pending | qa-fix |
| 2026-10-24 |         | QA gate CONCERNS (90/100) — 1 finding (1 medium) | qa-task |
| 2026-10-24 |         | QA findings fixed — 1 of 1 (QA3-1), 1 iteration; the Step 5 cwd claim scoped to the checker, and the block test runs the shipped path; gate re-review pending | qa-fix |
| 2026-10-24 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-24 | 1.2 | DoD passed — accepted (PR #745) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Engine
- [x] Non-object refusal (usage)
- [x] `anchor_checked` stamp
- [x] `GIT_CEILING_DIRECTORIES` in the `--index` test
- [x] Bundle

### Phase 2: `--inline` blocks
- [x] Guards: stamp, count, verdict enumeration
- [x] Selectors: trim + checker grammar
- [x] review-code bindings

### Phase 3: `--staged --fix`, population, changelog
- [x] `--staged --fix` skip
- [x] Derived dispatcher population
- [x] CHANGELOG

---

## References

- **Parent**: [task.195](../task.195.finding-anchors-follow-ups/task.195.finding-anchors-follow-ups.md) (PR #695); [gate 5](../task.195.finding-anchors-follow-ups/task.195.gate.5.finding-anchors-follow-ups.yml) and the carry chain in gates 1–4
- **Related**: task.194 (the checker's origin)
- **Engine**: `shared/resources/finding-anchors.js`
- **Probe cases to re-run**: `task.195.dod.2.security.cases.1.json` (review-pr `--inline` guard), `task.195.qa.3.step2b-checker-cases.json` (review-code Step 2b)

---

## Notes

### Important Reminders

- Edit `shared/resources/finding-anchors.js`, never a bundled `references/` copy: `npm run bundle` reverts hand edits there.
- The `--inline` guards are a security boundary: QA and `/finalise` fence-probe them. Probe escapes count as findings at QA too (obs #73).

### Known Issues

**Open** (non-blocking):
- ⚠️ Items 8 and 9 were dropped from the carry chain at gate 3 and recovered here from gate 1.

### Future Improvements

- If reviewers ever run outside this pipeline's prompts, revisit the stamp's threat model.
