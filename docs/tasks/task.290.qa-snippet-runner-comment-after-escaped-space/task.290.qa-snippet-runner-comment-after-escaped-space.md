---
id: task.290
title: "QA snippet runner reads a # after an escaped space as a comment"
type: task
description: "Make every comment scan in the snippet classifier agree with bash on where a comment starts, and make closingParen fail closed on deep nesting instead of throwing."
tags: [qa-task, security, follow-up-289]
category: refactoring
status: in-progress
priority: Medium
created: 2026-11-09
updated: 2026-11-09
estimated_effort_hours: 4
---

# Task 290: QA snippet runner reads a # after an escaped space as a comment

**Status:** In Progress

---

## 1. Overview

Two findings from task.289 QA gate 6, both reproduced and both identical on `develop`. The snippet classifier reads a `#` that follows a backslash-escaped space as the start of a comment, so bash runs what the classifier thinks is commented out. And `closingParen` recurses once per nested double-quoted `$(`, so deep nesting throws instead of failing closed.

**Scope**: the comment scans and `closingParen` in `shared/resources/qa-execute-snippets.mjs`, their tests, and a differential test that runs what the classifier calls runnable under real bash.

**Key deliverables**: one shared "is this `#` at a word start" rule used by every scanner that skips comments; an iterative or depth-bounded `closingParen` with a fail-closed catch; a differential test.

---

## 2. Motivation

### Current Problems

1. **A write classifies runnable (HIGH)**: `echo a\ # ; touch out` classifies `runnable` and created `out` under real bash (measured on the task.289 branch and on `develop`). In bash `a\ #` is one word, so `; touch out` runs. A nested form, `echo $(echo a\ #) ; touch out`, a newline and `)`, does the same through `closingParen`.
2. **A crash instead of a refusal (MEDIUM)**: `echo ` followed by `"$(` repeated 20000 times and `")` repeated 20000 times makes `classifyBlock` throw `RangeError`. The classifier must fail closed. `develop` throws on the same input.
3. **No test runs what the classifier trusts**: every bypass found across task.289 gates 1 to 6 was a place where the scanner read a construct differently from bash, and each was found by a reviewer running generated blocks under bash, never by the suite.

### Benefits of the Fix

1. **One reading of `#`**: a comment starts only at a word start, in every scanner.
2. **No exception path**: any input the classifier cannot read is refused.
3. **A standing differential check**: a regression that lets a write through fails the suite, not a later QA gate.

---

## 3. Technical Background

### Current Architecture

Three scanners skip comments, each with its own test for "`#` starts a comment":

- The line comment stripper in `stripNonCode` (`shared/resources/qa-execute-snippets.mjs:1965`, `c === "#" && !single && !double && (i === 0 || /\s/.test(line[i - 1]))`). It handles a backslash only inside double quotes (`:1951`, `c === "\\" && double`), so `a\ #` reads the escaped space as plain whitespace.
- `closingParen` (`:1498`, `c === "#" && (i === 0 || /[\s;&|(]/.test(text[i - 1]))`). It skips the character after a backslash (`:1483`) but tests the previous character, which is the escaped space.
- `sedScan`'s `#` case (`:1405`, `cmd === "#"`), which reads a sed script and is a different grammar. Check it and leave it if it is already right.

Bash starts a comment at a `#` that begins a word: after unquoted whitespace, `;`, `&`, `|`, `(` or a newline, and not when the preceding space was escaped, and not mid-word (`a#b`) or after `$` (`$#`).

### Target Architecture

One helper, `startsComment(text, i)`, that answers "is the `#` at `i` at a word start", which knows whether the previous character was consumed by a backslash. Every comment skip calls it.

### Population and witnesses

The comment scans are found with `grep -n '"#"' shared/resources/qa-execute-snippets.mjs`; at the time of writing the hits are `:1405`, `:1498`, `:1909` (a command-word list, not a scan) and `:1965`. Re-run the command before editing.

---

## 4. Scope

**In scope**
- ✅ The three comment scans above and `closingParen`'s recursion.
- ✅ A try/catch that turns any exception in the classifier into a `mutating` verdict.
- ✅ A differential test (see section 8).

**Out of scope**
- ❌ Widening what is runnable.
- ❌ The Phase 5 `ctx-wrap-` temp-directory leak from task.289.

---

## 5. Breaking Changes

None - API stable. Some blocks that classified `runnable` through the bug now classify `mutating`, which is the point; the docs scan shows whether any real documentation block changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.290.plan.qa-snippet-runner-comment-after-escaped-space.md](task.290.plan.qa-snippet-runner-comment-after-escaped-space.md)

### Phase 1: One comment rule, an iterative `closingParen`, a differential test

**Risk**: Low

**Files**: `shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`, `shared/resources/qa-runnable-prose-detection.md`

- [x] Add `startsComment` and use it in `stripNonCode` and `closingParen` (and `sedScan` if it disagrees with bash). `sedScan` reads sed's grammar and was left alone.
- [x] Handle a backslash outside quotes in `stripNonCode`. Done through `startsComment`'s escape count, not a skip of the next character: the skip made one documentation block newly runnable (docs scan), which the criteria rule out.
- [x] Make `closingParen` iterative with an explicit stack, or bound its depth, and wrap the classifier entry in a fail-closed catch.
- [x] Add the gap rows and controls, and the differential test.
- [x] Mutation-prove each change, run the docs scan against `develop`, run `npm run bundle`. The iterative `closingParen` is not held by a test (see the implementation report).

**Dependencies**: task.289 merged.

---

## 7. Files Summary

Core implementation:
1. ✅ `shared/resources/qa-execute-snippets.mjs` - the comment rule and `closingParen`

Tests:
2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` - gap rows, controls, differential test

Documentation:
3. ✅ `shared/resources/qa-runnable-prose-detection.md` - one sentence on where a comment starts
4. ✅ `CHANGELOG.md`

Bundled copies under `skills/*/references/` are regenerated by `npm run bundle`.

---

## 8. Testing Strategy

**Unit tests**
- Gap rows (must be `mutating`): `echo a\ # ; touch out`; `echo $(echo a\ #) ; touch out` plus a newline and `)`; the `case` variant from the gate 6 report.
- Controls (must stay `runnable`): `echo a # ; touch out` (a real comment), `echo a#b`, `echo $#`.
- A 20000-deep `"$(` input returns `mutating`, no exception. Control: the same shape at depth 1000.

**Differential test**: generate blocks from writers (`touch`, `tee`, `cp`, `rm`, `sort -o`, `uniq` with an output operand) crossed with contexts (comment spellings, escapes, substitutions, prefix assignments). For each block the classifier calls `runnable`, run it under real bash in a fresh `mktemp -d` directory with an input file, and fail if any file outside the inputs appears. Remove the directory in a `finally`.

**Mutation proof**: revert each change and name the test that turns red.

**Docs scan**: compare against `develop`'s engine over every fenced block in the tree; the number newly runnable must be 0.

---

## 9. Success Criteria

### Functional
- [ ] `echo a\ # ; touch out` and its nested forms classify `mutating`.
- [ ] `echo a # ; touch out`, `echo a#b` and `echo $#` classify as they do today.
- [ ] No input makes `classifyBlock` throw.

### Performance
- [ ] The docs scan time against `develop` is recorded in the QA report as the median of five alternating runs with the load noted, and does not regress by more than 10%.
- [ ] The scan makes no extra pass over a block that holds no `#` and no `$(`. A documentation criterion: `startsComment` is a constant-time test called from the loops that already exist, and `closingParen` is reached only from `maskSubstitutions` on a `$(`, `<(` or `>(` in `shared/resources/qa-execute-snippets.mjs`. (Changed at develop: no call counter exists, and adding one to production code only to test it was not worth the surface.)

### Code Quality
- [ ] Every scanner that skips a comment calls the one rule (a test counts the call sites against `grep -n '"#"'`).
- [ ] The differential test generates at least 200 blocks and executes at least one runnable block, so it cannot pass empty.
- [ ] Lint and prettier pass on the changed files.

### Migration
- [ ] `CHANGELOG.md` updated and `npm run bundle:check` reports 0 problems.
- [ ] The docs scan reports 0 blocks newly runnable against `develop`, recorded in the QA report.

---

## 10. Risk Assessment

**HIGH**: none.

**MEDIUM**
1. A stricter comment rule refuses a documentation block that used `a\ #` on purpose.
   - Probability: Low. Impact: a doc block stops being run by QA.
   - Mitigation: the docs scan lists every block whose verdict changes.
   - Rollback: revert the commit.

**LOW**
1. The differential test is slow. Mitigation: cap the generated population and run it in the normal suite only if it stays under a second.

---

## 11. Rollback Plan

**Immediate (under 1 hour)**: revert the commit; no data or consumer state changes.
- Triggers: the docs scan shows an unexpected block newly refused, or a suite goes red on `develop`.
- Validation: `CI=true npm run ci:fast` exits 0.

**Partial**: revert the differential test alone if it proves flaky; keep the fixes.

**Forward fix**: a block refused by mistake is fixed in the rule, not by an allowlist entry.

**Triggers**: Critical, a write classifies runnable after the change. Non-critical, a doc block newly refused.

---

## Stakeholder Sign-off

Sign-off is disabled for this repository (`sign-off.enabled` is not set), so no rows are scaffolded.

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-09
**Quality Score**: 80/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.290.qa.3.qa-snippet-runner-comment-after-escaped-space.md](./task.290.qa.3.qa-snippet-runner-comment-after-escaped-space.md)
- **Gate File**: [task.290.gate.3.qa-snippet-runner-comment-after-escaped-space.yml](./task.290.gate.3.qa-snippet-runner-comment-after-escaped-space.yml)

### Test Coverage Summary
- **Tests Executed**: 327
- **Phases Verified**: 0/1 clean
- **Critical Issues**: 1
- **NFR Status**: Security: FAIL, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
One HIGH finding: the comment-start rule treats CR, form feed, vertical tab and Unicode spaces as blanks, which bash does not, so a write after one classifies runnable (bug 3). The cycle 2 finding is fixed.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                      | Author      |
| ---------- | ------- | ---------------------------------------------------------------- | ----------- |
| 2026-11-09 | 1.0     | Initial draft, from task.289 QA gate 6 (owner-accepted residual) | create-task |
| 2026-11-09 | 1.1     | Review passed (8/10) — one criterion given a named test; both defects reproduced | review-task |
| 2026-11-09 |         | Status → ready-for-development                                   | review-task |
| 2026-11-09 |         | Implemented; status → ready-for-review                           | develop-task |
| 2026-11-09 |         | QA gate FAIL (80/100) — 1 finding                                | qa-task     |
| 2026-11-09 |         | QA findings fixed — cycle 1, 1 finding                           | qa-fix      |
| 2026-11-09 |         | QA gate FAIL (80/100) — 1 finding                                | qa-task     |
| 2026-11-09 |         | QA findings fixed — cycle 2, 1 finding                           | qa-fix      |
| 2026-11-09 |         | QA gate FAIL (80/100) — 1 finding                                | qa-task     |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1
- [x] Shared comment rule in every scanner
- [x] Iterative `closingParen` and fail-closed catch
- [x] Tests, differential test, mutation proof, docs scan, bundle

---

## References

- **Parent**: task.289, PR #864, QA gate 6 (`task.289.qa.6.*`)
- **Skill**: `.agents/skills/qa-task/`

---

## Notes

### Important Reminders

Both findings are identical on `develop`; task.289 neither introduced nor fixed them. The owner accepted them as a follow-up rather than a seventh QA cycle.

---

**Status:** In Progress

**Next Steps**: run `/develop-task` on this task.
