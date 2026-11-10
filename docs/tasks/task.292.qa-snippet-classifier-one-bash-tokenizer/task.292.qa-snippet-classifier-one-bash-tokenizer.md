---
id: task.292
title: "One bash tokenizer for the QA snippet classifier"
type: task
description: "Replace the snippet classifier's separate regex re-implementations of bash's blank, quote, escape and line-join rules with one tokenizer every scan reads, refusing what it cannot read, and close the open T290-QA-3 write gap."
tags: [qa-task, security, follow-up-290]
category: refactoring
status: ready-for-review
priority: High
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 16
github_issue: 868
---

# Task 292: One bash tokenizer for the QA snippet classifier

**Status:** Ready for Review
**GitHub Issue**: [#868](https://github.com/Gamaroff/agent-skills/issues/868)

---

## 1. Overview

The QA snippet classifier decides which fenced shell blocks QA may run, by reading each block the way bash would. It does that reading in several places, each with its own regex copy of bash's rules for blanks, quotes, backslashes and line joins. This task replaces those copies with one tokenizer that every scan reads, and that refuses (`mutating`) any input it cannot read.

**Scope**: the lexical layer of `shared/resources/qa-execute-snippets.mjs` (where a word, a quote, an escape, a comment and a line join start and end), the scans that re-derive it, their tests, and two scripts that are today only scratch files: the random differential against real bash and the docs scan against `develop`.

**Key deliverables**:
1. One tokenizer, with bash's blank set (space, tab, newline) and its escape, quote and line-join rules, consumed by every scan that today re-derives them.
2. T290-QA-3 closed: CR, form feed, vertical tab, NBSP and U+2028 before a `#` no longer start a comment.
3. A committed random differential against real bash and a committed docs scan, with a fixed-seed slice in the normal suite.

**Expected outcome**: the next random probe against bash finds no neighbour, because there is one reading of the lexical rules, not several.

---

## 2. Motivation

### Current Problems

1. **A write classifies runnable (HIGH, open)**: T290-QA-3. `startsComment` tests the character before a `#` with `/[\s;&|(]/` (`shared/resources/qa-execute-snippets.mjs:1523`). JavaScript's `\s` also matches CR, FF, VT, NBSP and U+2028, which bash does not treat as blanks. `echo a`, a CR, then `# ; touch out` classifies `runnable`, and bash creates `out`. Identical on `develop`. The owner waived it to merge task.290 (PR #867); it is not fixed. Bug report: [task.290.bug.3](../task.290.qa-snippet-runner-comment-after-escaped-space/task.290.bug.3.comment-start-treats-cr-ff-vt-and-unicode-spaces-as-blanks.md).
2. **The QA loop could not converge on this file**: task.290's three gates each found one HIGH in `qa-execute-snippets.mjs` (HIGH 1, 1, 1). Each fix held, and each cycle's random differential found the next neighbour: an escaped quote or backslash-newline before `#` (cycle 1), an even backslash run joined as a continuation (cycle 2), the blank class (cycle 3). The third-strike rule forbids another patch to that mechanism.
3. **The copies already disagree with each other**: the continuation join in `commandInvocations` reads a backslash-newline as `/(?<!\\)((?:\\\\)*)\\\n/` (`:2335`), while the prose pass reads it as `/(?<!\\)((?:\\\\)*)\\\r?\n/` (`:2915`), which also accepts a CR. Two readings of one bash rule in one file.
4. **The checks that found the bugs are not in the repository**: the random differential and the docs scan that found every task.290 finding were scratch scripts in a session directory. The suite's differential (`shared/resources/tests/qa-execute-snippets.test.mjs:4681`) runs a fixed list of contexts, which is why it never found the neighbours.

### Benefits of the Fix

1. **One reading of the lexical rules**: a fix to how bash reads a blank or an escape lands once and reaches every scan.
2. **Fail-closed by construction**: the tokenizer refuses input it cannot read, rather than each scan guessing.
3. **The finding instrument is kept**: the random differential and docs scan become committed, reproducible tools, so a regression fails a run instead of a later QA gate.
4. **Open HIGH closed**: T290-QA-3.

---

## 3. Technical Background

### Current Architecture

Each scan below re-derives part of bash's lexical rules on its own (paths in `shared/resources/qa-execute-snippets.mjs`, lines as of `4223cfac`):

| Scan | Where | What it re-derives |
| --- | --- | --- |
| `closingParen` | `:1479` (`function closingParen(text, open)`) | quotes, backslash skip, comments (through `startsComment`) to find a `$(`'s matching `)` |
| `startsComment` | `:1520` | a `#` at a word start; blank class `/[\s;&|(]/` at `:1523`, backslash-run parity |
| `maskSubstitutions` | `:1529` | substitution spans, via `closingParen` |
| `stripCommentQuoteAware` | `:1970` | quote state per line, comment start; throws on an escaped quote outside quotes (task.290 cycle 1) |
| `blankQuotedSpans` | `:2027` | quoted spans |
| `stripProse` | `:2156` | prose vs code lines; throws on an odd backslash run before a `#` line (task.290 cycle 1) |
| `stripNonCode` | `:2236` | comments and heredoc bodies |
| `commandInvocations` | `:2327` | line joins (`:2335`, odd run only since task.290 cycle 2), command boundaries |
| prose pass | `:2915` | line joins again, `\r?\n` |
| `sedScan` | `:1299` | sed's own grammar, **not** bash; out of scope (task.290 left it, the call-site test lists it as a non-shell site) |

The entry points are `classifyBlock` (`:2805`) and `isRunnableBlock` (`:2831`); `classifyFailClosed` (`:2815`) turns any exception into `mutating`.

**Population of whitespace tests.** `grep -c '\\s' shared/resources/qa-execute-snippets.mjs` counted 52 lines at `4223cfac`. Not all of them read bash input (some read Markdown or prose). That count is a figure to re-measure, not a contract: Phase 2 classifies each hit, and a test (success criterion below) holds the result.

**Other readers of the engine.** `git grep -ln qa-execute-snippets.mjs -- 'shared/resources/*'` names `doc-links.js`, `finalise-fix-and-recheck.mjs`, `security-probe.mjs` and several tests. They call the exported API (`classifyBlock`, `isRunnableBlock`, `extractBlocks`, `commandWords`, `unboundVariables`); none reaches the internal scans. The exported signatures do not change.

### Target Architecture

One function, `tokenize(code)`, returns the block as a list of tokens, each with its kind (word, operator, comment, heredoc body, substitution open/close, newline), its source span and its quote context, or throws a refusal. It encodes, once:

- **Blanks**: space, tab, newline. Nothing else separates words. CR, FF, VT and every Unicode space are word characters.
- **Escapes**: outside quotes a backslash quotes the next character; a backslash-newline is a line join only when the run of backslashes before the newline is odd. Inside double quotes a backslash escapes only `$`, `` ` ``, `"`, `\` and newline. Inside single quotes nothing is special.
- **Comments**: a `#` starts a comment only at a word start (after a blank, an operator, or the start of input), never inside a word, never after an escaped blank.
- **Substitutions**: `$(`, `` ` ``, `<(`, `>(` nest iteratively with an explicit stack (the iterative `closingParen` from task.290 moves here).
- **Refusal**: any shape the tokenizer does not model (an unterminated quote, an unsupported heredoc form, a nesting depth over a bound) throws, and `classifyFailClosed` turns it into `mutating`.

The scans in the table consume the token list instead of re-reading characters. Their decisions (what is a command word, what is safe) do not move; only where they get their lexical facts from.

This is a replacement of the struck mechanism, which is the move task.290's third-strike rule permits. It is not another patch.

### Population and witnesses

- Scans re-deriving lexical rules: the table above, from `grep -n '^function \(closingParen\|startsComment\|maskSubstitutions\|stripCommentQuoteAware\|blankQuotedSpans\|stripProse\|stripNonCode\|commandInvocations\)' shared/resources/qa-execute-snippets.mjs`, plus the prose-pass join at `:2915` from `grep -n '(?<!\\\\)((?:\\\\\\\\)\*)' shared/resources/qa-execute-snippets.mjs`. Re-run both before editing.
- Comment-scan call sites: the existing test "every comment scan calls the one rule" in `shared/resources/tests/qa-execute-snippets.test.mjs` already counts them against `grep -n '"#"'`; it moves to counting consumers of the tokenizer.

---

## 4. Scope

**In scope**
- ✅ `tokenize` and the migration of every scan in the table except `sedScan`.
- ✅ T290-QA-3.
- ✅ Committing the random differential (`scripts/qa-snippets-differential.mjs`) and the docs scan (`scripts/qa-snippets-docscan.mjs`), with a fixed-seed slice of the differential in the normal suite.
- ✅ A test that holds the iterative substitution scan (task.290's unheld `closingParen` rewrite).

**Out of scope**
- ❌ Widening what is runnable. Every verdict change goes towards `mutating`, and the docs scan must show 0 blocks newly runnable.
- ❌ The command-level allow-list (`SAFE_COMMANDS`, `SAFE_FLAGS`, `DENY_PATTERNS`): task.289's work, unchanged.
- ❌ `sedScan`, which reads sed's grammar.
- ❌ Full bash parsing (arithmetic, `case` patterns, parameter-expansion operators beyond finding their end). The tokenizer refuses what it does not model.

---

## 5. Breaking Changes

None - API stable. `classifyBlock`, `isRunnableBlock` and the other exports keep their signatures and return shapes. Some blocks that classified `runnable` through a lexical misreading now classify `mutating`, which is the point; the docs scan lists every block whose verdict changes, and none may become newly runnable.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.292.plan.qa-snippet-classifier-one-bash-tokenizer.md](task.292.plan.qa-snippet-classifier-one-bash-tokenizer.md)

### Phase 1: Commit the instruments and reproduce the open bug

**Risk**: Low

**Files**: `scripts/qa-snippets-differential.mjs` (new), `scripts/qa-snippets-docscan.mjs` (new), `shared/resources/tests/qa-execute-snippets.test.mjs`, `package.json`

- [ ] Commit the random differential: seeded generator over atom sets (including CR, FF, VT, NBSP, U+2028, tab, backslash runs, both quotes, `$(`, backticks, heredocs), a writer appended, every `runnable` block run under `bash` in a fresh temp directory removed in a `finally`; reports total, runnable, writes, and the first writing blocks.
- [ ] Commit the docs scan: every fenced block in `git ls-files '*.md'`, classified by `develop`'s engine (from `git show develop:shared/resources/qa-execute-snippets.mjs` into a temp file) and the working tree's; reports newly runnable and newly refused.
- [ ] Calibrate both on a known failure before trusting them: on the current engine the differential must report T290-QA-3's writes; the docs scan run against a deliberately widened copy must report a newly runnable block.
- [ ] Add a fixed-seed slice of the differential to the suite (sized to stay under the time bound in section 9), and T290-QA-3 gap rows (CR, FF, VT, NBSP, U+2028 before `#`) that are red now.

### Phase 2: The tokenizer

**Risk**: Medium

**Files**: `shared/resources/qa-execute-snippets.mjs`, its test

- [ ] Add `tokenize(code)` per Target Architecture, with its own unit tests: blanks, escape parity, quote contexts, comment start, line joins, substitution nesting, refusals.
- [ ] Move the iterative substitution scan into it, with a test that fails if it is made recursive again (a depth that a recursive scan cannot finish within the time bound, or a call-depth assertion).
- [ ] Classify each `\s` hit from section 3's grep as bash-input or not; replace every bash-input one with the tokenizer's blank set.

### Phase 3: Migrate the scans

**Risk**: High

**Files**: `shared/resources/qa-execute-snippets.mjs`, its test

- [ ] Move each scan in the table onto the token list, one commit per scan, running the suite, the fixed-seed differential and the docs scan after each.
- [ ] Delete the per-scan lexical code each migration makes dead, including the two task.290 throws in `stripCommentQuoteAware` and `stripProse` once the tokenizer covers their shapes.
- [ ] Update "every comment scan calls the one rule" to count tokenizer consumers.

### Phase 4: Prove and document

**Risk**: Low

**Files**: `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`, bundled copies

- [ ] Full differential (at least 200000 blocks across the atom sets), docs scan against `develop`, mutation proofs, timing.
- [ ] Rewrite the lexical paragraphs of `qa-runnable-prose-detection.md` to describe the tokenizer; `CHANGELOG.md`; `npm run bundle`.

**Dependencies**: task.290 merged (done, PR #867).

---

## 7. Files Summary

Core implementation:
1. ✅ `shared/resources/qa-execute-snippets.mjs` - `tokenize`, migrated scans

Tests:
2. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` - tokenizer units, T290-QA-3 gap rows, fixed-seed differential slice, the `\s` guard, the iterative-scan test

Tools:
3. ✅ `scripts/qa-snippets-differential.mjs` (new) - random differential against bash
4. ✅ `scripts/qa-snippets-docscan.mjs` (new) - docs scan against `develop`
5. ✅ `package.json` - `qa-snippets:differential` and `qa-snippets:docscan` scripts

Documentation:
6. ✅ `shared/resources/qa-runnable-prose-detection.md`
7. ✅ `CHANGELOG.md`

Bundled copies under `skills/*/references/` are regenerated by `npm run bundle`.

---

## 8. Testing Strategy

**Unit tests (tokenizer)**: each rule in Target Architecture has a positive row and a control: `a\ #` is one word; `a #` starts a comment; `a<CR>#` is one word; `a\\` then newline ends the line; `a\` then newline joins; `"a\#"` keeps the backslash; `'a\'` ends the quote; nesting 20000 deep refuses without throwing past the catch.

**Gap rows (must be `mutating`)**: every task.290 gap row (`T290_GAPS`, test file `:4513`) plus CR, FF, VT, U+00A0 and U+2028 before `# ; touch out`.

**Controls (must stay `runnable`)**: every task.290 control (`T290_CONTROLS`, `:4542`), plus a space and a tab before `#`.

**Differential**: the committed script, at two sizes. A fixed-seed slice runs in the suite on every push; the full run (at least 200000 blocks) is a Phase 4 deliverable recorded in the QA report. Each `runnable` block runs under `bash` in a fresh `mkdtemp` directory, removed in a `finally`, with a timeout; any created file fails it. Its temp prefix must pass `scripts/test-tmpdir.mjs`'s ratchet.

**Control for the instrument**: the differential must find T290-QA-3 on the pre-change engine (Phase 1) before its green counts. The docs scan must report a newly runnable block on a copy with a deliberately widened rule.

**Mutation proof**: revert each migration in turn and name the test that turns red; make the substitution scan recursive and name the test that turns red; put `\s` back in the blank set and name the gap row that turns red.

**Docs scan**: against `develop`'s engine over every fenced block in the tree; newly runnable must be 0; every newly refused block is listed with its file.

---

## 9. Success Criteria

### Functional
- [x] `echo a`, then CR, FF, VT, U+00A0 or U+2028, then `# ; touch out` classifies `mutating` (T290-QA-3).
- [x] Every task.290 gap row stays `mutating` and every control stays `runnable`.
- [x] No input makes `classifyBlock` throw (the existing "never throws" test stays green).
- [x] The full random differential (at least 200000 blocks across the Phase 1 atom sets) reports 0 writes, recorded in the QA report with its seed and command.

### Performance
- [x] The docs scan time against `develop` is recorded in the QA report as the median of five alternating runs with `uptime` beside each, and does not regress by more than 10%; outliers are reported, not dropped.
- [x] The fixed-seed differential slice in the suite runs in under 10 seconds (median of five runs, recorded in the QA report).

### Code Quality
- [ ] Every scan in section 3's table except `sedScan` reads lexical facts from `tokenize`; the call-site test counts its consumers and fails on a scan that re-derives a comment start.
- [ ] A test fails on a `\s` in `qa-execute-snippets.mjs` outside an allowlist whose every entry names why that site does not read bash input.
- [ ] A test fails if the substitution scan is made recursive again.
- [ ] Every change is mutation-proven (section 8), with the red test named in the QA report.
- [x] Lint and prettier pass on the changed `.mjs` files.

### Migration
- [x] `CHANGELOG.md` updated and `npm run bundle:check` reports 0 problems.
- [x] The docs scan reports 0 blocks newly runnable against `develop`, recorded in the QA report.

---

## 10. Risk Assessment

**HIGH**
1. A migrated scan reads a token stream differently from the characters it read before and lets a write through.
   - Probability: Medium. Impact: QA executes a block that writes.
   - Mitigation: one scan per commit; after each, the suite, the fixed-seed differential and the docs scan (0 newly runnable). The full differential runs before QA.
   - Rollback: revert the scan's commit.

**MEDIUM**
1. The tokenizer refuses documentation blocks that classify `runnable` today, so QA stops running them.
   - Probability: Medium (it is stricter by design). Impact: fewer doc blocks executed.
   - Mitigation: the docs scan lists every newly refused block; each is either a real lexical hazard (keep refused) or a tokenizer gap (model it, never by widening a command rule).
2. The differential slice is slow or flaky under load (the engine's tests are known load-sensitive).
   - Mitigation: fixed seed, a per-block timeout, a size chosen against the time bound; the full run stays out of the suite.

**LOW**
1. A scan not in the table also re-derives a lexical rule and is missed. Mitigation: the `\s` guard and the comment-start call-site test.

---

## 11. Rollback Plan

**Immediate (under 1 hour)**: revert the merge commit; the engine returns to task.290's state (T290-QA-3 open again, as on `develop` today).
- Triggers: a write classifies runnable on `develop` after merge; a suite goes red on `develop`.
- Validation: `CI=true npm run ci:fast` exits 0.

**Partial**: revert one scan's migration commit; the tokenizer and the other migrations stay.

**Forward fix**: a block refused by mistake is fixed in the tokenizer, never by an allowlist entry or a widened command rule.

**Triggers**: Critical, a write classifies runnable. Non-critical, a doc block newly refused.

---

## Stakeholder Sign-off

Sign-off is disabled for this repository (`sign-off.enabled` is not set), so no rows are scaffolded.

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-10
**Quality Score**: 80/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.292.qa.1.qa-snippet-classifier-one-bash-tokenizer.md](./task.292.qa.1.qa-snippet-classifier-one-bash-tokenizer.md)
- **Gate File**: [task.292.gate.1.qa-snippet-classifier-one-bash-tokenizer.yml](./task.292.gate.1.qa-snippet-classifier-one-bash-tokenizer.yml)

### Test Coverage Summary
- **Tests Executed**: 350
- **Phases Verified**: 4/4
- **Critical Issues**: 1
- **NFR Status**: Security: FAIL, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
A left shift inside `$[ ]` is read as a heredoc, so a writer after it classifies runnable (bug 1, reproduced by execution). Everything else holds: fast gate green, 0 writes in the differential, 0 newly runnable blocks in the docs scan.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                  | Author      |
| ---------- | ------- | ---------------------------------------------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft, from task.290's not-converging QA loop and waived T290-QA-3   | create-task |
| 2026-11-10 | 1.1     | Review passed (9/10) — no changes required; 3 optional notes in the review report | review-task |
| 2026-11-10 |         | Status → ready-for-development                                               | review-task |
| 2026-11-10 |         | Implemented — 9 files (16 with bundled copies), 23 tests added | develop |
| 2026-11-10 |         | QA gate FAIL (80/100) — 1 finding                                            | qa-task     |
| 2026-11-10 |         | QA findings fixed — T292-QA-1, 1 iteration                                   | qa-fix      |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1
- [ ] Differential and docs scan committed, calibrated on a known failure
- [ ] T290-QA-3 gap rows and the fixed-seed slice in the suite

### Phase 2
- [ ] `tokenize` with unit tests; iterative substitution scan held; `\s` hits classified

### Phase 3
- [ ] Every scan migrated, one commit each; dead lexical code deleted

### Phase 4
- [ ] Full differential, docs scan, mutation proofs, timing; docs and bundle

---

## References

- **Parent**: task.290, PR #867, gate 3 (`task.290.gate.3.*`), bug 3 (`task.290.bug.3.*`), the QA Loop Not Converging entry in `task.290.implementation.1.*`
- **Engine**: `shared/resources/qa-execute-snippets.mjs`; rule doc `shared/resources/qa-runnable-prose-detection.md`

---

## Notes

### Important Reminders

T290-QA-3 is the owner-waived residual from task.290; it is open and identical on `develop`. This task replaces the mechanism task.290's third-strike rule struck, so a fix here is a replacement, not a patch.

QA artifacts will land in this directory: `task.292.qa.{N}.*.md`, `task.292.bug.{N}.*.md`, `task.292.gate.{N}.*.yml`.

---

**Status:** Ready for Review

**Next Steps**: QA the implementation (`/qa-task`).
