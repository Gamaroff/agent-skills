---
id: task.240
title: "Fail-closed reader for the 5c open-coverage check"
type: task
description: "Replace the §5c open-coverage awk with a bundled Node reader that parses the PR review's machine-readable findings block and prints unreadable for any shape it cannot read, so the QA loop stops finding one more shape gap per cycle."
tags: [develop-task, develop-story, qa-loop, review-pr, open-coverage, task.238-follow-up]
category: refactoring
status: ready-for-review
priority: High
created: 2026-10-28
updated: 2026-10-28
assignee:
estimated_effort_hours: 8
github_issue: 771
---

# Technical Task: Fail-closed reader for the 5c open-coverage check

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.240.review.1.open-coverage-fail-closed-reader.md` implemented 2026-10-28
**GitHub Issue**: [#771](https://github.com/Gamaroff/agent-skills/issues/771)

---

## 1. Overview

The QA loop's Step 5c open-coverage check reads a PR review report and prints
`OPEN_COVERAGE=<n>` or `OPEN_COVERAGE=unreadable`. This task replaces the hand-rolled bash and awk
reader behind it with a bundled Node script. The script parses the review's
`## Machine-Readable Findings` block as data and refuses, as `unreadable`, every input it cannot
parse.

**Scope**: the reader, its call site in `develop-pipeline-step-5-6-qa-loop.md` §5c, the parity
test harness that runs that call site, and the bundled copies. The routing on the printed value
does not change.

**Key deliverables**:

- `shared/resources/open-coverage.js`: a pure reader plus CLI, bundled into `develop-task` and
  `develop-story`.
- The §5c block calls it and keeps its shell-level non-count guard.
- `pr-review-loop-parity.test.mjs` passes unchanged in its expectations: 82 cases.
- Every tracked `*.pr-review.*.md` reads the same before and after (SC-4).

**Expected outcome**: a review shape the reader does not know reads `unreadable` by construction,
not by an enumerated refusal. The QA loop stops spending its cycles on reader gaps.

---

## 2. Motivation

### Current Problems

- **Every QA cycle found the next shape the awk did not refuse.** task.238 ran 9 QA cycles and
  escalated at the loop limit (PR #770). Each medium finding on gates 7, 8 and 9 sat in this one
  block, and so did the ones on gates 1 and 4 and DoD 1. Gate 9 `recommendations.future` names
  bug.1, bug.8, a quoted-category gap, and bug.15 to bug.19. A line-shape reader can only list what
  it refuses, so each review finds one more.
- **The block is long, and its reasoning lives in comments.** At PR #770's head (`ded46852`) the
  block runs from `develop-pipeline-step-5-6-qa-loop.md:1529`
  (`REVIEW="{the PR review report this cycle's 5c wrote}"`) to `:1594`
  (`echo "OPEN_COVERAGE=$OPEN_COVERAGE"`). It is a nested `awk` program with an allow-list of line
  shapes, a value allow-list, a terminator flag and a flow-entry flag.
- **A failure on this check either way is expensive.** A false `0` exits a review that holds an
  open coverage finding to Step 7, and `/finalise` then fails it after a full DoD pass. A false
  `unreadable` sends a clean review to the "Review failed" arm.
- **It cannot be unit-tested.** The parity test extracts the fenced block from the doc and runs it
  under `sh`. There is no function to call and no table of shapes to read.

### Benefits of a parsed reader

- **Fail-closed by construction**: the parser either produces a findings list or returns
  `unreadable`. There is no "line it did not recognise, skipped".
- **Testable directly**: `countOpenCoverage(text)` is a pure function, and the fixture corpus
  moves onto it.
- **One extractor**: it reuses the block extraction that `pr-review-current.js` already does (see
  § 3).
- **A shorter §5c**: the call site shrinks to one `command node` call plus the existing guard.

---

## 3. Technical Background

### Current Architecture

Citations are at PR #770's head, `ded46852`. `develop` does not carry the block until task.238
merges (Phase 0).

- **The reader**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1529`–`:1594`.
  - It extracts the block after `## Machine-Readable Findings`.
  - An `awk` program (`:1556`, `OPEN_COVERAGE=$(printf '%s\n' "$BLOCK" \`) walks the
    `findings:` list.
  - It prints `unreadable` on a refused shape (`:1591`).
  - The shell guard maps a non-count to `unreadable` (`:1593`,
    `case "$OPEN_COVERAGE" in ''|*[!0-9]*) OPEN_COVERAGE=unreadable ;; esac`).
- **What counts as open**: a finding with `category: coverage` and no `provenance: pre-existing`
  (task.238 SC-4). `pre-existing` comes from review-pr Step 6's provenance rule.
- **The emitted shape**: review-pr `SKILL.md` Step 7, the `## Machine-Readable Findings` template.
  It holds `reviewed_gate:`, a `findings:` list of maps with scalar values (`id`, `category`,
  `severity`, `confidence`, `ref`, `anchor_check`, `finding`, `suggested_action`, optional
  `provenance`) and `truncated_count:`, in a fence tagged `yaml`.
- **The tests**: `evals/shared/tests/pr-review-loop-parity.test.mjs`.
  - `openCoverageOf(body, env)` (`:837`) finds the block in the doc by
    `b.code.includes("OPEN_COVERAGE=$(")` (`:839`) and runs it under bash, and zsh if present.
  - Fixture tables: `COVERAGE_CASES` (`:874`), `RAW_CASES` (`:941`), `UNREADABLE_CASES`
    (`:1109`), plus the failing-awk test.
  - A section test slices the doc at `loopDoc.indexOf("OPEN_COVERAGE=$(")` (`:1157`).
- **Existing mechanisms for the same job** (obs #103):
  - `shared/resources/pr-review-current.js:59` already extracts the block, with
    `/^## Machine-Readable Findings\s*\n+```yaml\n([\s\S]*?)^```/m`, and reads one key
    (`reviewed_gate`, `:62`).
  - `shared/resources/yaml-subset.js` is a bundled YAML subset parser
    (`parseYamlSubset`, `module.exports` at `:151`). It **fails open**: an unmatched row is skipped
    (`:72` documents the `if (!m) continue` branch). It has no flow collections and no block
    scalars, and it has 9 consumers (`git grep -l yaml-subset -- 'shared/resources/*.js'
    'skills/*/scripts/*'`, tests excluded).

### Target Architecture

- **`shared/resources/open-coverage.js`**: a pure `countOpenCoverage(text)` that returns
  `{ count }` or `{ unreadable: reason }`, plus a CLI
  (`command node open-coverage.js --file <report>`) that prints `OPEN_COVERAGE=<n|unreadable>` and
  exits 0. The `reason` goes to stderr only, so the printed contract is unchanged.
- **A strict reader of review-pr's emitted shape, not a general YAML parser.**
  - It accepts: a block list of maps, indented or at column 0; plain, single- or double-quoted
    scalars (a block-style double-quoted value may carry `\"` and `\\` escapes, as four tracked
    reports do); one-line flow maps (`- {id: PC-1, category: coverage}`); folded or literal block
    scalars (`>-`, `|`) for long values; a key with an empty value followed by strictly deeper
    lines, read as text; blank lines and indented full-line comments, skipped. `category` and
    `provenance` values compare case-blind (`category: Coverage` is coverage).
  - Anything else is `unreadable`: anchors, tags, aliases, a duplicate key, an entry with no
    `category`, a line it cannot place, a column-0 `#` line, a deeper line under `category:` or
    `provenance:`, an escaped quote inside a flow entry, a block with no terminator, a missing or
    untagged fence, an absent `findings:` key, or a non-map entry.
  - Each of these is pinned by an existing `RAW_CASES` / `UNREADABLE_CASES` expectation; the rule
    list follows the suite, not the other way round (review.1 I-1 to I-5).
  - **Decision (author confirm):** a dedicated reader, not a `strict` mode in `yaml-subset.js`.
    Strictness there changes a parser with 9 fail-open consumers, and it needs flow maps and block
    scalars that none of them use. That is a separate decision with its own blast radius.
- **Block extraction is shared with `pr-review-current.js`**: export its extractor and require it.
  Do not write a third regex.
- **The §5c call site** becomes
  `OPEN_COVERAGE=$(command node .agents/skills/{develop-story|develop-task}/references/open-coverage.js --file "$REVIEW" 2>/dev/null)`.
  The existing `case` guard follows it unchanged, so a Node failure still reads `unreadable`.

### Important Clarifications

- **The routing is unchanged.** The resume contract §5c sub-state rows
  (`develop-pipeline-resume-contract.md`, the three `CONCERNS` rows), `develop-task/SKILL.md` and
  `develop-story/SKILL.md` (`5 → 7` "a CONCERNS without an open coverage finding") and
  `develop-pipeline-on-stop.sh:205` all route on the printed value. Phase 3's probe confirms that
  none of them describes the awk.
- **CR9-4** (no test runs the reader under mawk or BWK awk) becomes moot once no awk remains. The
  task records that rather than adding an awk-variant matrix.

---

## 4. Scope

### In Scope

✅ `shared/resources/open-coverage.js` and its unit tests
✅ The §5c call site and its comments in `develop-pipeline-step-5-6-qa-loop.md`
✅ `pr-review-loop-parity.test.mjs`: the harness keeps locating and running the block; every
existing fixture keeps its expected value
✅ Exporting the block extractor from `pr-review-current.js`
✅ Bundled copies (`npm run bundle`)
✅ The CHANGELOG entry

### Out of Scope

❌ **CR7-3** (the CI read marks a head failure pre-existing whenever the same-named base job is
red) and **CR7-4** (key the background-read log removal on the `GATE_EXIT` value read). These are
task.238 gate 7 carries in `qa-ci-read.sh` and the fast-gate blocks. They are independently
shippable, so they get a task of their own (§ 1.2 splitting test).
❌ The structured pre-existing comparison for the fast gate (task.238 Deferred Work): a different
mechanism.
❌ CR9-5 (qualify every consumer of a 5c `CONCERNS` verdict for open coverage): a prose sweep,
not the reader.
❌ A `strict` mode for `yaml-subset.js` (see Target Architecture).
❌ Any change to which findings count as open coverage.

---

## 5. Breaking Changes

None. The API is stable: the block still prints exactly one `OPEN_COVERAGE=<n|unreadable>` line,
and every fixture keeps its expected value. A consumer now needs Node at §5c, which every pipeline
step already requires (`command node` throughout `develop-pipeline-step-5-6-qa-loop.md`).

---

## 6. Implementation Plan

> Detailed implementation guide: [task.240.plan.open-coverage-fail-closed-reader.md](task.240.plan.open-coverage-fail-closed-reader.md)

### Phase 0: Precondition (Risk: Low)

- [x] HALT unless task.238 (PR #770) has merged to `develop`: the §5c block this task replaces
      exists only on that branch until then. Check with
      `git grep -n 'OPEN_COVERAGE=\$(' origin/develop -- shared/resources/develop-pipeline-step-5-6-qa-loop.md`.
      A hit means merged.

### Phase 1: The reader (Risk: Medium)

**Files**: `shared/resources/open-coverage.js` (new),
`shared/resources/tests/open-coverage.test.mjs` (new), `shared/resources/pr-review-current.js`

- [x] Export the block extractor from `pr-review-current.js`, with no behaviour change. Its own
      tests stay green.
- [x] `countOpenCoverage(text)`: extract, parse strictly, then count entries with
      `category === "coverage"` and `provenance !== "pre-existing"`.
- [x] Every refusal returns `{ unreadable: <reason> }` from a fixed reason list, which includes
      `no-category` for an entry with no `category` key (task.238 bug.8). There is no skip branch
      for an unparsed line; only blank lines and indented comments are skipped.
- [x] The CLI prints `OPEN_COVERAGE=` plus the value, and exits 0. A usage error exits 2.
- [x] Unit tests: each accepted shape, each refusal reason, and a non-vacuity check (a corpus test
      that reads at least one report with `1` and one with `unreadable`).

### Phase 2: The call site (Risk: Medium)

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
`evals/shared/tests/pr-review-loop-parity.test.mjs`

- [x] Replace the awk program with the one `command node` call. Keep `REVIEW=`, the no-file and
      no-section branches if the reader does not cover them, and the `case` guard.
- [x] Replace the shape-table comments with one pointer to `open-coverage.js`.
- [x] Update `openCoverageOf` so it still finds and runs the block, under bash and zsh. It
      substitutes `{develop-story|develop-task}` and runs from a temp cwd whose
      `.agents/skills/develop-task` links to the tracked `skills/develop-task`, so it does not
      depend on the gitignored local symlink. Run it once with that symlink moved aside.
- [x] Add a parity assertion that the §5c block holds exactly one `command node` call and no
      `awk` (SC-5).
- [x] Every existing case keeps its expected value. The failing-awk case becomes a failing-node
      case (a `node` stub that exits 2 on `PATH`) and still expects `unreadable`.
- [x] Mutation-prove: make the reader return `{ count: 0 }` for any refused shape. The refusal
      fixtures must go red.

### Phase 3: Corpus, probe and docs (Risk: Low)

**Files**: `CHANGELOG.md`, bundled copies

- [x] Corpus diff: run the old block (from `ded46852`) and the new one over every tracked
      `*.pr-review.*.md`. Expect 0 changes. Record the distribution and the command; do not
      restate the number in prose (obs #117).
- [x] Probe the phrases `OPEN_COVERAGE`, `open-coverage` and `open coverage finding` over
      `SKILL.md`, `references/*.md` and `shared/resources/*.md`, generated copies removed. List
      every site as updated or unaffected.
- [x] `npm run bundle`. CHANGELOG `[Unreleased]` names the reader and cites task.240.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/open-coverage.js` (new): reader plus CLI
2. ✅ `shared/resources/pr-review-current.js`: export the block extractor
3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the §5c call site

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/open-coverage.test.mjs` (new)
5. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs`: harness and the failing-reader case

### Files to Modify (Dependencies)

None. No new npm dependency: `node_modules` holds no `yaml` or `js-yaml`, and consumers receive
only bundled files.

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`
7. ✅ `skills/develop-task/references/*` and `skills/develop-story/references/*`: regenerated by
   `npm run bundle`, never hand-edited. New copies: `open-coverage.js` and `pr-review-current.js`
   (required by the reader) in both; `develop-pipeline-step-5-6-qa-loop.md` refreshed in both.
8. ✅ `skills/qa-fix/references/pr-review-current.js`: regenerated by `npm run bundle` (the
   extractor export)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `countOpenCoverage` over each accepted shape and each refusal reason.
- **Command**: `command node --test shared/resources/tests/open-coverage.test.mjs`
- **Control case** (obs #176): one refusal shape that no task.238 bug names. For example, a
  `category:` key given in a flow entry and again on the next line. Also one valid report the rule
  must accept.

### Integration Tests

- `pr-review-loop-parity.test.mjs` runs the doc's block end to end under bash and zsh, with all
  existing expectations.
- The corpus diff over every tracked report (Phase 3).

### Contract Tests

- The CLI prints exactly one line matching `^OPEN_COVERAGE=(\d+|unreadable)$`, and exits 0 on
  every input, refusals included.

### Performance Tests

Not applicable. The check runs once per 5c on one file.

### Consumer Tests

- The develop pipelines' `5 → 7` lock rule and the resume contract route on the printed value.
  The probe in Phase 3 confirms no prose describes the awk.

---

## 9. Success Criteria

### Functional

- [x] SC-1: `countOpenCoverage` returns `unreadable` for every refusal shape in
      `RAW_CASES`/`UNREADABLE_CASES`, and the count for every `COVERAGE_CASES` shape. It has no
      skip branch: a mutation that skips an unparsed line turns a test red.
- [x] SC-2: `pr-review-loop-parity.test.mjs` passes, with every pre-existing case keeping its
      expected value, under bash and zsh.
- [x] SC-3: a failing reader (a `node` stub that exits 2 on `PATH`) reads `unreadable`.
- [x] SC-4: every tracked `*.pr-review.*.md` reads the same `OPEN_COVERAGE` before and after. The
      command and its distribution are in the implementation report.

### Performance

- [x] SC-5: no new CI wait, and no new process beyond one `node` call at 5c. Held by the parity
      assertion that the §5c block holds exactly one `command node` call and no `awk`.

### Code Quality

- [x] SC-6: `npm run ci:fast` passes.
- [x] SC-7: `npm run bundle:check` passes, and nothing under `skills/*/references/` is
      hand-edited.
- [x] SC-8: `npm run validate -- skills/develop-task/` and `skills/develop-story/` pass.
- [x] SC-9: every new guard is mutation-proven, and the commit message records it.

### Migration

- [x] SC-10: the CHANGELOG `[Unreleased]` entry cites task.240 and names the reader.
- [x] SC-11: the probe over `OPEN_COVERAGE` / `open-coverage` / `open coverage finding` lists
      every site, and none describes the awk.

---

## 10. Risk Assessment

### High Risk Areas

1. **A shape the corpus uses that the new reader refuses**
   - Risk: a valid review now reads `unreadable` and goes to the "Review failed" arm.
   - Probability: Medium. Impact: High (a false halt in every pipeline run that meets the shape).
   - Mitigation: SC-4's corpus diff over every tracked report, plus review-pr's own template
     example as a fixture.
   - Rollback: revert the call site (Phase 2). The reader file can stay.

### Medium Risk Areas

1. **The parity harness stops finding the block**
   - Risk: `openCoverageOf` keys on `OPEN_COVERAGE=$(`. A reshaped block could make it run nothing
     and pass vacuously.
   - Mitigation: keep the key string, and keep the harness's existing assertion that the block was
     found and printed a line.

### Low Risk Areas

1. **The bundle copies drift**: `bundle:check` catches it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: any pipeline 5c that reads `unreadable` on a report that review-pr wrote from its
  own template.
- **Steps**: revert the Phase 2 commit, `npm run bundle`, push.
- **Validation**: the parity suite and the corpus diff are green on the reverted tree.

### Partial Rollback (1-2 hours)

- **When to use**: the reader is right but the harness change is wrong. Revert only the test
  harness change.

### Forward Fix (< 4 hours)

- **When to use**: a single refused shape that review-pr legitimately emits. Add it to the
  reader's accepted set with a fixture.

### Rollback Triggers

- **Critical**: a false `0` on a report that holds an open coverage finding.
- **Non-critical**: a false `unreadable` on a hand-written shape no review emits.

---

## Implementation Notes

**Completion date**: 2026-10-28 (develop-task Step 3, inline — plan file and surface map present).

**Implementation summary**: `shared/resources/open-coverage.js` parses the findings block with a
line-based strict reader that refuses through one `Refusal` path; it requires
`extractFindingsBlock` from `pr-review-current.js`. §5c now holds one `command node` call, the
`case` guard and a six-line pointer comment in place of the 35-line awk program and its 23-line
shape table.

**Approach**: the accepted shapes were taken from the parity suite's pinned expectations, not from
the awk's code: every `RAW_CASES` / `UNREADABLE_CASES` / `COVERAGE_CASES` row now also runs straight
through `countOpenCoverage` in the same test (SC-1), as well as through the doc's block under bash
(and zsh where installed).

**Testing results**:

- Unit: `command node --test shared/resources/tests/open-coverage.test.mjs` — 32 pass (accepted
  shapes, one or more cases per reason in `REASONS` with a reachability assertion, the control case,
  CLI contract, corpus non-vacuity).
- Parity: `command node --test evals/shared/tests/pr-review-loop-parity.test.mjs` — 83 pass (82
  pre-existing with unchanged expectations, plus the SC-5 assertion). zsh is not installed on the
  development machine, so the zsh arm runs in CI only (`.github/workflows/test.yml` installs it).
  Also run once with the local `.agents/skills` symlink moved aside: 83 pass.
- Corpus (SC-4): the old block extracted from `develop` at `83aacf7b` and the new CLI over
  `git ls-files '*pr-review.*.md'` — 0 changes. Distribution: `0` ×128, `1` ×35, `2` ×5,
  `unreadable` ×19 (the 19 have no findings heading).
- `npm run ci:fast`: green on the second run. The first run failed one test,
  `tests/relationship-assertion-lint.test.js` "no file in the live corpus is invisible to the
  scanner": a fence string nested in a template-literal test title blinded the scanner to the rest
  of `open-coverage.test.mjs`. The title now names the row by index.
- `npm run bundle:check`: 0 problems. `npm run validate -- skills/develop-task/` and
  `skills/develop-story/`: pass.
- Mutation proofs (each reverted; the reader restored byte-identical, checked with `cmp`):
  M1 an unplaceable line skipped instead of refused → 2 red; M2 the `pre-existing` filter dropped →
  7 red; M3 every refusal returned as `{ count: 0 }` → 40 red; M4 the §5c `case` guard removed → 1
  red (the failing-node case).

**Phase 3 probe** (`git grep -n -i -E 'OPEN_COVERAGE|open-coverage|open coverage finding' --
'shared/resources/*.md' 'skills/*/SKILL.md' 'shared/resources/*.sh'`, generated copies excluded): 25
sites. Updated: the §5c block and its pointer comment (`develop-pipeline-step-5-6-qa-loop.md`
§5c). Unaffected — each routes on the printed value and none describes the awk: the rest of
`develop-pipeline-step-5-6-qa-loop.md` (the verdict table, the 5b invocation heading, the exit
prose), `develop-pipeline-on-stop.sh:195,205` and its test `:349,353,354`,
`develop-pipeline-resume-contract.md:464,474,555–557`, `implementation-report-template.md:73,171`,
`develop-task/SKILL.md:203`, `develop-story/SKILL.md:214`.

**CR9-4** (no test ran the reader under mawk or BWK awk) is moot: no awk remains in the check.

**Deferred work**: none from this task. CR7-3, CR7-4, CR9-5 and the structured pre-existing
comparison stay out of scope as § 4 states.

**QA fix cycle 1 (TASK-240-QA-1, bug.1).** The reader now accepts a value that wraps onto deeper
lines under any key except `category` and `provenance`. A plain value may wrap unless a wrapped line
reads as `key: `. A quoted value may wrap until its closing quote, which must be on a deeper line.
Each shape was checked against PyYAML 6.0.3. The accepted list in § 3 Target Architecture predates
this fix and is narrower than what ships; the reader's header is now the list. Results:

- Mutation proofs M5–M8 each turned at least one test red.
- The corpus diff shows 0 changes over 187 reports.
- `ci:fast` is green: 6,618 pass, 0 fail.

Details are in the bug report.

**QA fix cycle 2 (TASK-240-QA-2, bug.2).** In a nested value under an empty key, any quoted scalar
or flow collection that opens on a line must now close on that line, or the reader refuses the
report. The pipeline offered the narrowing-residue move, and the change was taken as a consolidate
move (an allow-list), not as a second round of quote tracking. Results:

- Mutation proofs M9–M11 each turned at least one test red.
- The corpus diff shows 0 changes over 187 reports.
- `ci:fast` is green: 6,622 pass, 0 fail.

**QA fix cycle 3 (TASK-240-QA-3, bug.3).** Cycle 2's opener scan looked at one position on the
line, so an opener behind a prefix got past it. Cycle 3 replaced the scan with a rule over
characters: a line nested under an empty key may not contain a double quote, a `[` or `{`, or a
single quote other than an apostrophe. Closed quotes and flow collections are refused as well,
which fails closed. No tracked report has a nested value of this kind.

| Check | Result |
| --- | --- |
| Mutation proofs | M9 and M12–M15 each turned at least one test red |
| Corpus diff | 0 changes |
| `ci:fast` | green: 6,634 pass, 0 fail |

**QA fix cycle 4 (TASK-240-QA-5, bug.4).** `quoted()` skipped over an escape without decoding it.
A `category:` or `provenance:` value with an escape could therefore read differently from YAML.
Those two values now refuse an escape, using the same `strict` rule that flow entries already
used. Results:

- Mutation proofs: M16 and M17 each turned tests red.
- Corpus: 0 changes.
- `ci:fast`: green, 6,639 pass and 0 fail.

---

<!--
  Change Log — append-only, newest at the bottom. Canonical format:
  references/document-change-log.md.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-28
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.240.qa.4.open-coverage-fail-closed-reader.md](./task.240.qa.4.open-coverage-fail-closed-reader.md)
- **Gate File**: [task.240.gate.4.open-coverage-fail-closed-reader.yml](./task.240.gate.4.open-coverage-fail-closed-reader.yml)

### Test Coverage Summary

- **Tests Executed**: 184 (unit, parity, extractor and relationship lint)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

BUG-3 is fixed. One medium finding remains: TASK-240-QA-5, described in
[task.240.bug.4.escape-in-deciding-value-misread.md](./task.240.bug.4.escape-in-deciding-value-misread.md).
The reader takes a backslash escape in a `category:` or `provenance:` value literally, but YAML
decodes it. The two can therefore disagree on whether a finding is open.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-28 | 1.0     | Initial draft | create-task |
| 2026-10-28 | 1.1     | Review passed (8/10) — parser rules aligned with six pinned parity expectations (case-blind values, column-0 entries, nested values and comments, `no-category`, escapes); SC-5 given a test; "184" count dropped | review-task |
| 2026-10-28 |         | Status → ready-for-development | review-task |
| 2026-10-28 |         | Implemented — 5 source files (1 new reader, 1 new unit suite), 32 unit tests + 1 new parity test; status → ready-for-review | develop |
| 2026-10-28 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-28 |         | QA findings fixed — wrapped values under non-deciding keys accepted (bug.1), 1 iteration | qa-fix |
| 2026-10-28 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-28 |         | QA findings fixed — nested openers must close on their line (bug.2), 1 iteration | qa-fix |
| 2026-10-28 |         | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-10-28 |         | QA findings fixed — nested opener scan replaced by a character rule (bug.3), 1 iteration | qa-fix |
| 2026-10-28 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-28 |         | QA findings fixed — escape refused in a deciding value (bug.4), 1 iteration | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Precondition
- [x] task.238 merged to `develop`

### Phase 1: The reader
- [x] Extractor exported
- [x] `countOpenCoverage` and CLI
- [x] Unit tests and control case

### Phase 2: The call site
- [x] §5c block replaced
- [x] Parity harness updated
- [x] Mutation proof

### Phase 3: Corpus, probe and docs
- [x] Corpus diff
- [x] Probe
- [x] Bundle and CHANGELOG

---

## References

- **Origin**: task.238 (PR #770), escalated at the QA loop limit after 9 cycles. See its
  implementation report, the escalation "after 4 granted cycles", and gates 8 and 9
  `recommendations.future`.
- **Related bugs**: task.238 bug.1, bug.8, bug.15, bug.16, bug.17, bug.18, bug.19.
- **Related skills**: `.agents/skills/review-pr/` (the emitted shape), `.agents/skills/develop-task/`,
  `.agents/skills/develop-story/`.

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only. `npm run bundle` regenerates the `references/` copies.
- Use `command node`, never bare `node` (an nvm shell function on the maintainer's machine).
