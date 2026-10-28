---
id: task.240
title: "Fail-closed reader for the 5c open-coverage check"
type: task
description: "Replace the §5c open-coverage awk with a bundled Node reader that parses the PR review's machine-readable findings block and prints unreadable for any shape it cannot read, so the QA loop stops finding one more shape gap per cycle."
tags: [develop-task, develop-story, qa-loop, review-pr, open-coverage, task.238-follow-up]
category: refactoring
status: planned
priority: High
created: 2026-10-28
updated: 2026-10-28
assignee:
estimated_effort_hours: 8
github_issue: 771
---

# Technical Task: Fail-closed reader for the 5c open-coverage check

**Status:** Planned
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
- All 184 tracked reports read the same before and after.

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
  - It accepts: a block list of maps; plain, single- or double-quoted scalars; one-line flow maps
    (`- {id: PC-1, category: coverage}`); and folded or literal block scalars (`>-`, `|`) for
    long values.
  - Anything else is `unreadable`: anchors, tags, aliases, a duplicate key, a line it cannot place,
    a block with no terminator, a missing or untagged fence, an absent `findings:` key, or a
    non-map entry.
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

- [ ] HALT unless task.238 (PR #770) has merged to `develop`: the §5c block this task replaces
      exists only on that branch until then. Check with
      `git grep -n 'OPEN_COVERAGE=\$(' origin/develop -- shared/resources/develop-pipeline-step-5-6-qa-loop.md`.
      A hit means merged.

### Phase 1: The reader (Risk: Medium)

**Files**: `shared/resources/open-coverage.js` (new),
`shared/resources/tests/open-coverage.test.mjs` (new), `shared/resources/pr-review-current.js`

- [ ] Export the block extractor from `pr-review-current.js`, with no behaviour change. Its own
      tests stay green.
- [ ] `countOpenCoverage(text)`: extract, parse strictly, then count entries with
      `category === "coverage"` and `provenance !== "pre-existing"`.
- [ ] Every refusal returns `{ unreadable: <reason> }` from a fixed reason list. There is no
      skip branch anywhere.
- [ ] The CLI prints `OPEN_COVERAGE=` plus the value, and exits 0. A usage error exits 2.
- [ ] Unit tests: each accepted shape, each refusal reason, and a non-vacuity check (a corpus test
      that reads at least one report with `1` and one with `unreadable`).

### Phase 2: The call site (Risk: Medium)

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
`evals/shared/tests/pr-review-loop-parity.test.mjs`

- [ ] Replace the awk program with the one `command node` call. Keep `REVIEW=`, the no-file and
      no-section branches if the reader does not cover them, and the `case` guard.
- [ ] Replace the shape-table comments with one pointer to `open-coverage.js`.
- [ ] Update `openCoverageOf` so it still finds and runs the block, under bash and zsh.
- [ ] Every existing case keeps its expected value. The failing-awk case becomes a failing-node
      case (a `node` stub that exits 2 on `PATH`) and still expects `unreadable`.
- [ ] Mutation-prove: make the reader return `{ count: 0 }` for any refused shape. The refusal
      fixtures must go red.

### Phase 3: Corpus, probe and docs (Risk: Low)

**Files**: `CHANGELOG.md`, bundled copies

- [ ] Corpus diff: run the old block (from `ded46852`) and the new one over every tracked
      `*.pr-review.*.md`. Expect 0 changes. Record the distribution and the command; do not
      restate the number in prose (obs #117).
- [ ] Probe the phrases `OPEN_COVERAGE`, `open-coverage` and `open coverage finding` over
      `SKILL.md`, `references/*.md` and `shared/resources/*.md`, generated copies removed. List
      every site as updated or unaffected.
- [ ] `npm run bundle`. CHANGELOG `[Unreleased]` names the reader and cites task.240.

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
   `npm run bundle`, never hand-edited

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

- [ ] SC-1: `countOpenCoverage` returns `unreadable` for every refusal shape in
      `RAW_CASES`/`UNREADABLE_CASES`, and the count for every `COVERAGE_CASES` shape. It has no
      skip branch: a mutation that skips an unparsed line turns a test red.
- [ ] SC-2: `pr-review-loop-parity.test.mjs` passes, with every pre-existing case keeping its
      expected value, under bash and zsh.
- [ ] SC-3: a failing reader (a `node` stub that exits 2 on `PATH`) reads `unreadable`.
- [ ] SC-4: every tracked `*.pr-review.*.md` reads the same `OPEN_COVERAGE` before and after. The
      command and its distribution are in the implementation report.

### Performance

- [ ] SC-5: no new CI wait, and no new process beyond one `node` call at 5c.

### Code Quality

- [ ] SC-6: `npm run ci:fast` passes.
- [ ] SC-7: `npm run bundle:check` passes, and nothing under `skills/*/references/` is
      hand-edited.
- [ ] SC-8: `npm run validate -- skills/develop-task/` and `skills/develop-story/` pass.
- [ ] SC-9: every new guard is mutation-proven, and the commit message records it.

### Migration

- [ ] SC-10: the CHANGELOG `[Unreleased]` entry cites task.240 and names the reader.
- [ ] SC-11: the probe over `OPEN_COVERAGE` / `open-coverage` / `open coverage finding` lists
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

<!--
  Change Log — append-only, newest at the bottom. Canonical format:
  references/document-change-log.md.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-28 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Precondition
- [ ] task.238 merged to `develop`

### Phase 1: The reader
- [ ] Extractor exported
- [ ] `countOpenCoverage` and CLI
- [ ] Unit tests and control case

### Phase 2: The call site
- [ ] §5c block replaced
- [ ] Parity harness updated
- [ ] Mutation proof

### Phase 3: Corpus, probe and docs
- [ ] Corpus diff
- [ ] Probe
- [ ] Bundle and CHANGELOG

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
