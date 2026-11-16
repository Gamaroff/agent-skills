---
id: task.278
title: "QA loop readers read the right thing"
type: task
description: "Fix three QA-loop readers that classify on the wrong input: the narrowing-residue file count that splits a production file from its test, the 5c carry that keys on the finding's anchor not the file the fix edits, and the gate reader that takes a status from quoted finding text."
tags: [develop-task, qa-fix, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-06
updated: 2026-11-16
estimated_effort_hours: 8
---

# Task 278: QA loop readers read the right thing

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.278.review.1.qa-loop-readers-read-the-right-thing.md` implemented 2026-11-16

---

## 1. Overview

Three readers in the QA loop take a decision from an input that is not the one that matters, and each produced a wrong result with no warning (obs #120, #141, #151).

**Scope**: the narrowing-residue classifier, the 5c carry classifier, and the shared gate-entry reader, each with a control test.

---

## 2. Motivation

### Current Problems

1. **The narrowing-residue offer never fired** (obs #120). task.240's loop ran seven cycles at HIGH 0, ten bugs in one deny-list. `classifyNarrowingResidue` returned `medium-files-differ` at cycles 6 and 7 because each cycle's MEDIUMs named `shared/resources/open-coverage.js` and its differential-test generator `tests/open-coverage-differential.test.mjs`; the structural move came only in the escalation entry, after the budget was spent.
2. **A 5c carry classified on the wrong file** (obs #141). On task.248 the reviewer's PC-1 (scope, low) anchored `ref` at `skills/finalise/SKILL.md:1995`, where the behaviour lives, while its `suggested_action` edited the work item's own document. The classifier reads only the `ref` path, which is not a docs path, so it did not answer `fix`.
3. **Quoted text read as a status** (obs #151). On task.251, text in a finding that quoted a status (a key, a colon and a value) was read by `readKeysInto` as that entry's own status, so an open entry read waived; `qa-read-back` refused the newest QA Change Log row for a related reason.

### Benefits

1. The structural-move offer fires on the shape it was built for.
2. A docs-only fix is carried and fixed instead of halting the loop.
3. A gate's status is the entry's own.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `shared/resources/qa-diminishing-returns.js:810`–`:816` returns `medium-files-differ` when `new Set(all.map((e) => normalisePath(e.file))).size !== 1`; `:805` is the sibling `medium-file-missing`. `qa.testArtifactGlobs` is the key route 2 already reads `(unverified: the plan greps its reader)`.
- `shared/resources/qa-diminishing-returns.js:263` `function readKeysInto(entry, text)` runs `KEY_RE` over free text; the comment at its head says FIRST wins and that `severity`, `category` and `status` fold case (`CASE_INSENSITIVE_KEYS`). `:217` (a dash line's remainder) and `:226` (a key line at the entry's own key indent, `ind === base + 2`) call it. **The indent filter at `:223`–`:227` already keeps deeper lines out, so the defect is inside one line**: `KEY_RE` scans the whole line, so a quoted value holding `status: waived` yields a status. Measured on 2026-11-16 with `readTopIssues` (the reader's export): a block entry `finding: "the writer read status: waived from this text"` followed by a real `status: open` reads `status: 'waived from this text"'` (FIRST wins, so the quoted text beats the real key); a flow entry `{…, finding: "quotes status: waived", status: open}` reads `status: 'waived"'`.
- The 5c carry files are `5c-carry-eligible.txt` and `5c-carry-classified.txt` (`shared/resources/advance-pipeline-lock.sh:18`, `:141`); the classifier fence is at `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1630`–`:1687` (`console.error(... classified — an entry has no id: first or no ref:)`) and reads only `ref`. Tests: `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`.
- `shared/resources/qa-findings-ingester-prompt.md:74` already uses `suggested_fix_path` for a description of the fix approach, not a path; a new field must not reuse that name (the observation's `fix_path` is distinct).

### Target Architecture

- **Residue**: fold a test file (matched by `qa.testArtifactGlobs`) into the production file it tests before counting files. The mapping is stated, not left to the developer: the test's directory is a `tests/` child of the production file's directory (`shared/resources/tests/X-differential.test.mjs` tests `shared/resources/X.js`), so strip the `tests/` segment, drop `.test.<ext>` and any `-<suffix>`, and compare the stem ignoring the extension. Fold only when that production file is itself among the other MEDIUMs. `qa.testArtifactGlobs` is set in this repository (`skills-config.yaml:45`) and `[]` in an unconfigured consumer, where nothing folds, exactly as the exit itself stays off. Fixture row: MEDIUMs on `shared/resources/X.js` and `shared/resources/tests/X-differential.test.mjs` in consecutive cycles must signal (obs #120).
- **Carry**: an optional `fix_path` on a finding; when it names the work item's own document or a co-located `.md` artifact and that file is clean against HEAD, the classifier answers `fix` even when `ref` points at code; absent, today's behaviour (obs #141). The producer of a 5c finding is `/review-pr`, so the field is added where `ref` is emitted (the conformance prompt's findings block and `skills/review-pr/SKILL.md`'s record), and the ingester prompt maps or drops it.
- **Reader**: take `status` only from a real key: for a block line, the key at the start of the line; for a flow entry, a key at the top level of the mapping (the extent `flowSpan` in `accept-qa-residual.js:150` defines); never from text inside a quoted value (obs #151).

### Important Clarifications

- `readKeysInto` is private to `qa-diminishing-returns.js` (`git grep -n readKeysInto -- shared skills ':!skills/*/references'` finds only that file); `review-report-freshness.js` is named in a comment as the source of the FIRST-wins rule, not as a caller. What is shared is the gate reader's export, `readTopIssues`, whose other consumers are `accept-qa-residual.js` (its read-back) and the suites `accept-qa-residual.test.mjs`, `qa-loop-route.test.mjs`, `qa-narrowing-residue.test.mjs`, `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs` and `evals/develop-next/unit/accept-qa-residual-merge-rule.test.mjs`. The change is tested against all of them.
- The ingester's `suggested_fix_path` is a different thing; the plan chooses the new field's name to avoid confusion and updates the ingester prompt's table.

---

## 4. Scope

### In Scope

✅ **The three readers** and their tests.
✅ **The ingester prompt** row for the new field.
✅ **A sweep** of docs that restate the classifier's rule.

### Out of Scope

❌ **Changing any threshold** (cycle counts, MEDIUM count).
❌ **The route 2c removal** (task 244).

---

## 5. Breaking Changes

None - each change only moves a wrong classification to the right one; absent `fix_path`, the carry classifier is unchanged.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.278.plan.qa-loop-readers-read-the-right-thing.md](task.278.plan.qa-loop-readers-read-the-right-thing.md)

### Phase 1: The gate reader

**Risk Level**: Medium

**Files**:
- `shared/resources/qa-diminishing-returns.js` (`readKeysInto`), its tests

**Changes**:
- [ ] Read keys at the key position within a line (the line start for a block line, the top level of the mapping for a flow entry), skipping quoted values; the line-level indent filter at `:223`–`:227` already exists and is not the change. A planted quoted `status` on an open entry reads `open`, in a block entry and in a flow entry.

**Dependencies**: none.

---

### Phase 2: The residue classifier

**Risk Level**: Medium

**Files**:
- `shared/resources/qa-diminishing-returns.js`, `shared/resources/tests/fixtures/qa-diminishing-returns/`

**Changes**:
- [ ] Fold test files into the production file; fixture row for obs #120.

**Dependencies**: none.

---

### Phase 3: The 5c carry

**Risk Level**: Medium

**Files**:
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (classifier fence)
- `shared/resources/pr-conformance-prompt.md` and `skills/review-pr/SKILL.md` (the producer: the findings block that emits `ref`; bundled copies in `review-pr` and `review-code` regenerate)
- `shared/resources/qa-findings-ingester-prompt.md`
- `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`, `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js` (both read the conformance prompt)

**Changes**:
- [ ] Optional `fix_path`; classification rule; producer rows; ingester row.

**Dependencies**: none.

---

### Phase 4: Tests, bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] Mutation proofs; `command npm run bundle`, `command npm run bundle -- --check`.
- [ ] Doc sweep. Population: `git grep -ln 'medium-files-differ\|narrowing-residue\|5c-carry' -- shared skills docs ':!skills/*/references' ':!docs/tasks'`; update any that restate the classifier's rule.
- [ ] Run the suites that pin the step document: `git grep -ln 'develop-pipeline-step-5-6-qa-loop' -- '*.test.*' tests evals`.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-diminishing-returns.js` - reader and classifier
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - carry classifier fence
3. ✅ `shared/resources/qa-findings-ingester-prompt.md` - new field row

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/qa-narrowing-residue.test.mjs` and the fixtures directory
5. ✅ `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`
6. ✅ a gate-reader test beside the existing `qa-diminishing-returns` tests

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each reader and its control.

**Actions**:
- [ ] An open entry whose finding quotes `status: waived` reads `open`; **control**: an entry with a real top-level `status: waived` reads waived, and a flow entry's own status is read through `flowSpan`.
- [ ] MEDIUMs on `X.js` and `tests/X-differential.test.mjs` over two cycles signal; **control**: MEDIUMs on two unrelated production files still read `medium-files-differ`.
- [ ] A finding with `ref` on code and `fix_path` on a clean work-item `.md` classifies `fix`; **control**: the same with `fix_path` dirty against HEAD, or a `fix_path` on code, does not.
- [ ] Mutation proofs for each.

**Command**: `CI=true command node --test` on the named files.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The three motivating shapes classify correctly, shown by named tests in the QA report.
- [ ] Each control keeps its old result, shown by the same tests.
- [ ] Every other consumer of `readTopIssues` (`accept-qa-residual.js` and the five suites named in § 3) passes its existing fixtures unchanged.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each change has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `CI=true command node --test shared/resources/tests/qa-narrowing-residue.test.mjs` passes.

### Migration

- [ ] A gate file written before the change reads the same status for every entry: run `readTopIssues` over every committed `docs/**/*.gate.*.yml` on `develop` and on the branch, and record the per-entry diff (expected empty, or each difference explained) in the QA report's Findings section.

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The reader change flips a real status**
- **Risk**: an entry whose status sits in an unusual position reads differently.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the before/after read over every committed gate file in the Migration criterion.
- **Rollback**: revert Phase 1.

**2. Folding test files hides a real second file**
- **Risk**: the offer fires on two genuinely different subjects.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: fold only a test whose name or glob maps to the named production file; the offer only asks.
- **Rollback**: revert Phase 2.

### Low Risk Areas

**1. `fix_path` misused**
- **Risk**: an author points it at code to force a carry.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: only a work-item document or co-located `.md`, clean against HEAD, counts.
- **Rollback**: remove the field.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- a gate reads a different status than before on a committed gate
- the narrowing or carry suites are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one reader misbehaves.

**Steps**:
1. Revert that phase's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: wording.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- a status misread on a real gate

**Non-Critical (Forward Fix)**:
- fixture or wording

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-16
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.278.qa.3.qa-loop-readers-read-the-right-thing.md](./task.278.qa.3.qa-loop-readers-read-the-right-thing.md)
- **Gate File**: [task.278.gate.3.qa-loop-readers-read-the-right-thing.yml](./task.278.gate.3.qa-loop-readers-read-the-right-thing.yml)

### Test Coverage Summary
- **Tests Executed**: 8533
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Cycle 2's findings QA-5 and QA-6 are closed. One MEDIUM remains: the criterion-3 deviation (T278-QA-2) awaits an approver.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #120, #141, #151   | create-task |
| 2026-11-16 | 1.1     | Review 7/10 → fixes applied (Phase 1 rewritten to the in-line defect, `readKeysInto` consumers corrected, `fix_path` producer added, Phase 2 path mapping stated, migration criterion re-defined) — ready for development | review-task |
| 2026-11-16 |         | Status → ready-for-development                           | review-task |
| 2026-11-16 | 1.2     | Implemented: gate reader keys at key position, residue fold, `fix_path` carry | develop     |
| 2026-11-16 |         | QA gate CONCERNS (90/100) — 4 MEDIUM findings            | qa-task     |
| 2026-11-16 |         | QA findings fixed — 3 of 4 closed, T278-QA-2 escalated (1 iteration) | qa-fix      |
| 2026-11-16 |         | QA gate CONCERNS (90/100) — 3 MEDIUM findings            | qa-task     |
| 2026-11-16 |         | QA findings fixed — QA-5 and QA-6 closed, T278-QA-2 still needs an approver (2 iterations) | qa-fix      |
| 2026-11-16 |         | QA gate CONCERNS (90/100) — 1 MEDIUM finding             | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The gate reader
- [x] Top-level keys only

### Phase 2: The residue classifier
- [x] Test files folded

### Phase 3: The 5c carry
- [x] `fix_path`

### Phase 4: Tests, bundle and sweep
- [x] Mutation proofs, bundle clean

---

## References

- Observation #120 — Narrowing-residue offer never fires when each MEDIUM pairs the code with its own test generator
- Observation #141 — 5c carry classifies on the ref anchor, not the file the fix edits
- Observation #151 — Shared gate reader takes a status from quoted finding text, so an open entry reads waived

---

## Notes

### Important Reminders

Do not reuse the ingester's `suggested_fix_path` name; it holds a description, not a path.

### Deviation from success criterion 3 (QA cycle 1, T278-QA-2)

Criterion 3 says every other consumer of `readTopIssues` passes its existing fixtures unchanged. One
pinned expectation changed: in `shared/resources/tests/accept-qa-residual.test.mjs`, the case
`{id: X, a: {status: open}}` moved from the "refuses a flow entry the extent scanner cannot read" list
to the "edits a flow entry the scanner reads" list. The old expectation encoded the defect this task
fixes: it refused because the shared reader took the nested `status: open` as the entry's own status
(the writer's read-back then disagreed with its edit). With the reader fixed, the writer appends a
top-level `status: waived` and the read-back confirms it. Every other consumer fixture is unchanged.
The criterion text is not edited. **An approver must accept this deviation** (`approved by <name>`);
until then T278-QA-2 stays open.

### Future Improvements

None.

---

**Status:** Ready for Review
