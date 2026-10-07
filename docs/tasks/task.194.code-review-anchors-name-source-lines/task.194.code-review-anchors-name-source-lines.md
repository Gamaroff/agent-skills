---
id: task.194
title: "Code-review findings anchor to source lines"
type: task
description: "The shared code-review prompt names its line coordinate unambiguously (the line in the PR-head source file, never the patch) and quotes the line it means, and a shared checker verifies every path:line anchor against the file before any of the four dispatching skills renders, posts or gates on it."
tags: [review-pr, review-code, qa-task, qa-story, code-review-prompt, observation]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-07
completed_date: 2026-10-07
pr_number: 596
updated: 2026-10-07
assignee:
estimated_effort_hours: 16
github_issue: 595
---

# Technical Task: Code-review findings anchor to source lines

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.194.review.1.code-review-anchors-name-source-lines.md` implemented 2026-10-07
**GitHub Issue**: [#595](https://github.com/Gamaroff/agent-skills/issues/595)

---

## 1. Overview

The shared code reviewer (`code-review-prompt.md`) reports each finding at a `file_line`. On
PR #594 it reported patch-file line numbers instead of source line numbers, and nothing downstream
noticed. This task makes the coordinate unambiguous in the prompt, makes the reviewer quote the line
it means, and adds one shared checker that every dispatching skill runs on the findings before it
renders, posts or gates on them.

**Scope**: the two lens prompts (`code-review-prompt.md`, `pr-conformance-prompt.md`), a new
`shared/resources/finding-anchors.js` engine and its tests, and the call into it from the four skills
that dispatch the code reviewer: `/review-pr`, `/review-code`, `/qa-task` and `/qa-story`.

**Key deliverables**:

1. A prompt contract under which `file_line` can mean only one thing.
2. `finding-anchors.js`: a pure checker plus CLI that classifies each anchor.
3. All four dispatchers run it, with a population test that fails when a fifth dispatcher does not.

---

## 2. Motivation

### Current Problems

1. **The coordinate is ambiguous.** `shared/resources/code-review-prompt.md:122` reads
   ``- `finding`/`suggested_action` are single sentences. `file_line` is `path:line` from the diff.``
   The reviewer is handed a patch file (`<DIFF_FILE>`, `code-review-prompt.md:28`). "Line from the
   diff" names the patch and the source file at once.
2. **It has already failed.** On `/review-pr 594` (2026-10-07, observation #290), all six code-lens
   findings carried patch-file line numbers. One example is `scripts/smoke/slugify.js:77` for a file
   that is 11 lines long (`wc -l`); the real line is 8. On the same patch, the conformance lens
   reported correct source lines (`slugify.js:8`).
3. **Nothing downstream checks it.**
   - `/review-pr` copies `file_line` into the machine-readable `ref` verbatim
     (`skills/review-pr/SKILL.md:600`, *"a `CR-*` entry's `ref` is its subagent `file_line`
     verbatim"*), and `/qa-fix`'s ingester reads that block. A fix is sent to a line that does not
     exist.
   - `--inline` anchors on it (`skills/review-pr/SKILL.md:835`, `skills/review-code/SKILL.md:115`).
     The only check is the shape `^.+:[0-9]+$`, which a wrong number passes.
   - `/qa-task` and `/qa-story` render it into the QA report (`skills/qa-task/SKILL.md:1311`,
     `skills/qa-story/SKILL.md:1593`).
4. **The worst case is silent.** On a short file, a patch line number points past the end of the
   file, and GitHub rejects the inline comment. `pr-inline-comment.js` then reports `anchor-failed`
   (`shared/resources/pr-inline-comment.js:704`), which reads as "outside the hunk", not as "the
   reviewer is wrong". On a **long** file, a patch line number can fall inside a real hunk. The
   comment then posts **on the wrong line** and reports `posted`. No check in the tree can see that.

### Benefits of a Named, Verified Coordinate

1. **One meaning.** `file_line` is the line in the PR-head version of the file, the new side of the
   hunk, never a line in the patch.
2. **Identity, not just coordinate.** The reviewer quotes the line (`line_text`), so a wrong number
   on a long file is caught by a content mismatch. This repository already applies this rule to
   prose citations (create-task § Section 3, obs #22: *"Cite by identity, not by coordinate"*).
3. **One checker, four callers.** The verification is code with tests, not a sentence each skill
   restates.
4. **Malformed output is named.** A bad anchor is reported as `out-of-range` or `text-mismatch`, not
   folded into `anchor-failed` or rendered as fact.

---

## 3. Technical Background

### Current Architecture

- **Producer.** `shared/resources/code-review-prompt.md` § Output contract emits
  `code_review.findings[]` with `file_line: "src/x/y.ts:42"` (`:113`) and the rule at `:122`. Four
  skills dispatch it verbatim:
  - `skills/review-pr/SKILL.md` Step 5 (Lens A)
  - `skills/review-code/SKILL.md`
  - `skills/qa-task/SKILL.md:559` (Step 3b, *"Dispatch a read-only Explore subagent with the prompt
    from `references/code-review-prompt.md`"*)
  - `skills/qa-story/SKILL.md:1026` (Phase 1.6, same sentence)

  Enumerated with `git grep -ln "code-review-prompt.md" -- 'skills/*/SKILL.md' 'shared/resources/*.md'`.
  That returns 6 files. The other two cite the prompt without dispatching it:
  `pr-conformance-prompt.md` (the sibling lens) and `develop-pipeline-step-5-6-qa-loop.md:222,270`
  (the blocking-resolution matrix).
- **Sibling producer.** `shared/resources/pr-conformance-prompt.md:140` emits `ref`, which may be a
  criterion id, an artifact path, a frontmatter field, or a `path:line`. The `path:line` form has the
  same ambiguity, although the conformance lens happened to get it right on PR #594.
- **Consumers that anchor.** The `--inline` jq in `skills/review-pr/SKILL.md:835` and
  `skills/review-code/SKILL.md:115` filters on the shape only. `pr-inline-comment.js` degrades a
  rejected anchor to `anchor-failed`; it has no knowledge of file length or content.
- **Existing checks of this kind:** none. `ls shared/resources | grep -i "finding\|anchor"` returns
  only `qa-findings-ingester-prompt.md`, which parses findings and does not verify locations. The new
  engine sits beside `pr-inline-comment.js`. It does not replace that engine's hunk handling: hunk
  rejection is the platform's call, while existence and content are this checker's.

### Target Architecture

- **Prompt contract.** In `code-review-prompt.md`, `file_line` is defined as *the line number in the
  PR-head version of the file (the `+` side of the hunk header), never a line number in the patch
  file*. A new `line_text` field holds the trimmed source text of that line. The schema example and
  the `Rules:` list both change. `pr-conformance-prompt.md` states the same rule for a `ref` of the
  `path:line` form, with `line_text` optional.
- **Checker.** `shared/resources/finding-anchors.js` provides:
  - `checkAnchors(findings, { readFile })`, a pure function. It returns one verdict per finding:

    | Verdict | Meaning |
    |---|---|
    | `ok` | the line exists and `line_text` matches it: both sides have runs of whitespace collapsed to one space and are trimmed, and `line_text` may be a substring of the line |
    | `unchecked-text` | the line exists, but no `line_text` was given (range checked only) |
    | `no-line` | the anchor is not `path:line`, so there is nothing to check: an AC id, a bare path, a range (`x.ts:42-58`), or a compound `ref` such as `AC-3 / x.js:8`. A path never contains whitespace, so the anchor pattern is `^(\S+):(-?\d+)$` |
    | `no-such-file` | the path does not exist at the PR head |
    | `out-of-range` | the line is greater than the file's line count, or less than 1 |
    | `text-mismatch` | the line exists but its text is not `line_text` |

  - A CLI: `--findings-file <json> --root <dir> [--rev <git-rev>] [--annotate <out-file>] --json`.
    With `--rev`, it reads the file with `git cat-file blob <rev>:./<path>` from `--root`, so a merged PR or a different
    checked-out branch is checked against the right tree. With `--annotate`, it writes the input JSON
    back to `<out-file>` with each finding carrying `anchor_check: <verdict>`, so a caller's jq can
    filter on the verdict without joining two files. The exit codes follow the repository
    convention: 0 when every anchor is `ok`, `unchecked-text` or `no-line`; 1 when any is malformed;
    2 on a usage error or a `--rev` that names no commit. `reason` is `ok`, `malformed-anchors`, `usage` or
    `bad-rev`. `--json` lists the verdict for each
    finding.
  - **The verdict key is `anchor_check`, everywhere.** `/review-pr`'s `--inline` jq already uses
    `anchor` as a temporary key holding the `path:line` (`skills/review-pr/SKILL.md:835`). A verdict
    under the same name would be overwritten there, and the filter would drop every finding.
  - The two non-ok families are kept apart on purpose. `no-line` means "nothing to verify", which is
    correct for an AC reference. `out-of-range` and `text-mismatch` mean "the reviewer is wrong".
- **Callers.** Each dispatcher writes the parsed findings to a `mktemp` JSON file and runs the
  checker on it, in the same fenced block, before it renders, posts or maps anything to a gate:
  - A malformed anchor is **not dropped**. It renders with the marker `⚠️ unverified anchor`, is
    removed from the `--inline` set (it goes to the summary comment instead), and is never mapped to
    the gate `top_issues[]` with a location it does not have.
  - `/review-pr` records the verdicts in the report's scope note. Its machine-readable `ref` keeps the
    reviewer's value and gains `anchor_check: <verdict>`, so `/qa-fix` can tell a verified location
    from an unverified one.
  - **Which tree each caller checks** (`--rev`):

    | Caller | `--rev` | Why |
    |---|---|---|
    | `/review-pr` | `origin/$HEAD_BRANCH`; the PR head SHA (`gh pr view --json headRefOid`) on the API-diff route | Step 4 already fetches the head branch; a merged or cross-fork PR has none |
    | `/qa-task`, `/qa-story` | `HEAD` | their diff is `$BASE...HEAD`, so uncommitted edits are not under review |
    | `/review-code` | none for a working-tree target; the PR head for a PR target | a working-tree review reviews the files on disk |

### Important Clarifications

- **Correcting the number is out of scope.** The checker reports. It does not guess the intended line
  (the PR #594 run corrected lines by hand). Re-mapping a patch line to a source line is possible, but
  it would hide the reviewer defect that this task makes visible.
- **`line_text` is additive.** Older outputs without it check as `unchecked-text`, which is not a
  failure. The `top_issues[]` shape (`code-review-prompt.md` § QA use) is unchanged.

---

## 4. Scope

### In Scope

✅ `code-review-prompt.md` and `pr-conformance-prompt.md` contract wording and schema example
✅ New `shared/resources/finding-anchors.js` and `shared/resources/tests/finding-anchors.test.mjs`
✅ The checker call in `review-pr`, `review-code`, `qa-task` and `qa-story` `SKILL.md`
✅ A population test: every `SKILL.md` that dispatches `code-review-prompt.md` runs the checker
✅ `npm run bundle` so each of the four skills carries `references/finding-anchors.js`
✅ CHANGELOG `[Unreleased]` entry

### Out of Scope

❌ Re-mapping a wrong line to the right one (see Clarifications)
❌ Changes to `pr-inline-comment.js` hunk handling. It keeps its own `anchor-failed` contract.
❌ `/qa-fix` behaviour on `anchor:` values beyond reading the field. Its ingester change, if wanted, is a follow-up.
❌ The `seedFromObservations` description defect found while cutting this task (logged separately)

---

## 5. Breaking Changes

**None — API stable.** `line_text` is a new optional field, and `anchor_check` in `/review-pr`'s
machine-readable block is a new optional key. Readers that ignore unknown keys are unaffected.
Existing reports without either field stay valid.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.194.plan.code-review-anchors-name-source-lines.md](task.194.plan.code-review-anchors-name-source-lines.md)

### Phase 1: Prompt contract (Risk: Low)

**Files**: `shared/resources/code-review-prompt.md`, `shared/resources/pr-conformance-prompt.md`

- [x] Define `file_line` as the PR-head source line (the `+` side), never a patch line, at the `Rules:` bullet that currently reads "from the diff"
- [x] Add `line_text` to the schema example and the rules (trimmed source text of that line)
- [x] State the same rule for a `path:line` `ref` in the conformance prompt, with `line_text` optional

**Dependencies**: none.

### Phase 2: Checker engine (Risk: Medium)

**Files**: `shared/resources/finding-anchors.js`, `shared/resources/tests/finding-anchors.test.mjs`

- [x] `checkAnchors(findings, { readFile })`: pure, reads `file_line` or `ref` with the pattern `^(\S+):(-?\d+)$`, returns the six verdicts
- [x] CLI with `--findings-file`, `--root`, `--rev`, `--annotate`, `--json`; exit 0/1/2; `reason` `ok` / `malformed-anchors`
- [x] Unit tests, including the PR #594 shape and the long-file control (Testing Strategy)

**Dependencies**: Phase 1 fixes the field names the checker reads.

### Phase 3: Wire the four dispatchers (Risk: Medium)

**Files**: `skills/review-pr/SKILL.md`, `skills/review-code/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`

- [x] `review-pr` Step 6: run the checker with `--annotate` before rendering; mark malformed anchors; add `anchor_check:` to the machine-readable block; the `--inline` jq reads the annotated file and keeps only `anchor_check` `ok` or `unchecked-text`
- [x] `review-code`: run it before render, `--comment` and `--fix` (a `--fix` must never edit an unverified line); same `--inline` filter
- [x] `qa-task` Step 3b and `qa-story` Phase 1.6: run it with `--rev HEAD` before render and before the `top_issues[]` mapping
- [x] Each call writes the findings JSON with `mktemp` and runs the checker in the same fenced block, with `--rev` per the Callers table
- [x] Extend the jq-run tests in `skills/review-pr/tests/review-pr.test.js` and `skills/review-code/tests/review-code.test.js`: an annotated fixture where `text-mismatch` is excluded and `ok` / `unchecked-text` are kept
- [x] `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phase 2.

### Phase 4: Population guard and release notes (Risk: Low)

**Files**: `evals/shared/tests/finding-anchors-callers.test.mjs`, `CHANGELOG.md`

- [x] Population test: the population is every `skills/*/SKILL.md` that mentions `code-review-prompt.md` (the bare filename, so a dispatcher phrased differently is still caught), minus a cite-only allowlist that is empty today and needs a reason per entry. Each member must invoke `finding-anchors.js`, carry the `⚠️ unverified anchor` marker, and state its rule for `--fix` (review-code) or `top_issues[]` (qa-task, qa-story); non-vacuity floor of 4
- [x] CHANGELOG `[Unreleased]` › Fixed entry

**Dependencies**: Phase 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/code-review-prompt.md`: `file_line` definition, new `line_text`
2. ✅ `shared/resources/pr-conformance-prompt.md`: `path:line` `ref` rule
3. ✅ `skills/review-pr/SKILL.md`: Step 6 check, `anchor:` key, `--inline` filter
4. ✅ `skills/review-code/SKILL.md`: check before render, `--comment` and `--fix`
5. ✅ `skills/qa-task/SKILL.md`: Step 3b check
6. ✅ `skills/qa-story/SKILL.md`: Phase 1.6 check
7. 🆕 `shared/resources/finding-anchors.js`: checker engine and CLI

Dispatcher population: `git grep -ln "code-review-prompt.md" -- 'skills/*/SKILL.md'` returned 4 on
2026-10-07: review-code, review-pr, qa-task and qa-story. All 4 are in scope. The two non-skill hits
(`pr-conformance-prompt.md` and `develop-pipeline-step-5-6-qa-loop.md`) cite the prompt without
dispatching it, so they are excluded.

### Files to Modify (Tests)

8. 🆕 `shared/resources/tests/finding-anchors.test.mjs`: engine unit tests (already reached by the `npm test` glob `'shared/resources/tests/*.test.mjs'`)
9. 🆕 `evals/shared/tests/finding-anchors-callers.test.mjs`: population guard (reached by `'evals/shared/tests/*.test.mjs'`)
10. ✅ `skills/review-pr/tests/review-pr.test.js` and `skills/review-code/tests/review-code.test.js`: extend the existing tests that extract and run the `--inline` jq program (`review-pr.test.js:708`, `review-code.test.js:282`)

### Files to Modify (Dependencies)

None. Node built-ins only (`node:fs`, `node:child_process`).

### Files to Modify (Documentation)

11. ✅ `CHANGELOG.md`
12. Generated: `skills/{review-pr,review-code,qa-task,qa-story}/references/{code-review-prompt.md,finding-anchors.js}`, and `review-pr/references/pr-conformance-prompt.md`, via `npm run bundle`. Never hand-edited.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `checkAnchors` and the CLI, with an injected `readFile`.
- **Cases**:
  - **The PR #594 shape.** `scripts/smoke/slugify.js:77` against an 11-line file gives `out-of-range`.
  - **Control: a long file where a wrong line is in range** (the case the motivating incident does
    not show). A 120-line file, `file_line` 77 with `line_text` taken from line 8 gives
    `text-mismatch`. The same file with the correct line gives `ok`.
  - The other verdicts: `no-such-file`, `no-line` (`AC-3`, a bare path, a range `x.ts:42-58`, and the
    compound `ref` `AC-3 / scripts/smoke/slugify.js:8` the conformance lens emitted on PR #594),
    `unchecked-text` (no `line_text`), and line `0` or a negative line giving `out-of-range`.
  - Whitespace: `line_text` with different indentation or internal spacing still matches (both sides
    collapsed and trimmed); a `line_text` that is a substring of the line matches.
  - **SC-7:** a counting injected `readFile`; three findings on two paths give exactly two reads.
  - CLI: exit 0 when every finding is clean, 1 on any malformed anchor, 2 on a missing
    `--findings-file`; `--json` gives one verdict per finding; `--rev` reads through git, relative to `--root`;
    `--annotate` writes the input back with `anchor_check` on every finding.
- **`--inline` filter (SC-6):** the existing tests that extract and run the `--inline` jq program from
  `skills/review-pr/SKILL.md` and `skills/review-code/SKILL.md` gain an annotated fixture. A
  `text-mismatch` finding is excluded; `ok` and `unchecked-text` findings are posted.
- **Command**: `command node --test shared/resources/tests/finding-anchors.test.mjs`

### Integration Tests

- Re-run `/review-pr 594` (open or closed; its branch must still exist). Every `CR-*` either carries a
  source line that verifies `ok`, or carries `⚠️ unverified anchor`. None renders a patch line as fact.

### Contract Tests

- The population test (Phase 4). It derives the dispatcher set and does not restate it, so a fifth
  dispatcher added later fails until it calls the checker. The non-vacuity floor is 4.

### Performance Tests

Not applicable. One file read per distinct path, over at most 20 findings per lens.

### Consumer Tests

- The existing `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js`
  and `evals/shared/tests/pr-review-loop-parity.test.mjs` (the `ref` ← `file_line` normalisation
  assertions at `:1125-1142`) still pass.

---

## 9. Success Criteria

### Functional

- [x] **SC-1** `code-review-prompt.md` defines `file_line` as the PR-head source line and explicitly excludes a patch-file line
- [x] **SC-2** `code-review-prompt.md`'s schema and rules carry `line_text`
- [x] **SC-3** `checkAnchors` returns each of the six verdicts on the inputs named in Testing Strategy, including `out-of-range` for the PR #594 shape and `text-mismatch` for the long-file control
- [x] **SC-4** The CLI exits 0, 1 and 2 as specified, and `--rev` reads the file at that revision
- [x] **SC-5** (documentation) Each of the four dispatcher `SKILL.md` files runs the checker in a fenced block before rendering, and states that a malformed anchor renders with `⚠️ unverified anchor` and is never dropped. Held by the population test.
- [x] **SC-6a** No malformed anchor reaches `--inline` posting. Held by the extended jq-run tests in `review-pr.test.js` and `review-code.test.js`.
- [x] **SC-6b** (documentation) `review-code/SKILL.md` says `--fix` skips a malformed finding; `qa-task/SKILL.md` and `qa-story/SKILL.md` say a malformed finding's `top_issues[]` entry carries `(location unverified: …)`. Held by the population test.

### Performance

- [x] **SC-7** The checker reads each distinct path once per run. Held by the counting-`readFile` unit test.

### Code Quality

- [x] **SC-8** `npm test` passes, with the two new test files reached by existing globs
- [x] **SC-9** `npm run bundle:check` passes, with no `UNREACHED` copy
- [x] **SC-10** `python skills/create-skill/scripts/quick_validate.py skills/<skill>` passes for each of the four skills
- [x] **SC-11** Mutation proof: removing the checker call from any one dispatcher turns the population test red, and removing the `line_text` comparison turns the long-file control red

### Migration

- [x] **SC-12** CHANGELOG `[Unreleased]` › Fixed entry names the four skills and the new field

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The reviewer ignores the new definition**
   - Risk: a subagent still emits patch lines.
   - Probability: Medium. Impact: Medium.
   - Mitigation: the checker exists for exactly this case and catches it whichever way it happens.
     The prompt fix lowers the rate; the checker makes the remainder visible.
2. **`line_text` normalisation is too strict**
   - Risk: tabs versus spaces, or a reviewer quoting part of a line, give false `text-mismatch`.
   - Probability: Medium. Impact: Low (a false `⚠️`, never a drop).
   - Mitigation: trim both sides and collapse internal whitespace, and accept `line_text` as a
     substring of the line. Covered by a unit test.
3. **The wrong tree is checked**
   - Risk: running against the working tree when it is not the PR head (a merged PR, or a different
     branch checked out) gives false verdicts.
   - Probability: Medium. Impact: Medium.
   - Mitigation: callers pass `--rev origin/$HEAD_BRANCH` (`/review-pr` already fetches it in Step 4),
     and the API-diff fallback passes the PR head SHA.

### Low Risk Areas

1. **Prose drift across four SKILL.md files.** Mitigated by the population test.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the checker marks correct anchors as malformed on more than 1 in 5 findings in a real run, or a dispatcher halts on the checker's exit 1.
- **Steps**: 1) `git revert` the merge commit. 2) `npm run bundle`. 3) `npm test`.
- **Validation**: `git grep -n "finding-anchors" -- 'skills/*/SKILL.md'` returns nothing.

### Partial Rollback (1-2 hours)

- **When to use**: the checker is sound but one dispatcher's wiring misbehaves.
- **Steps**: revert that skill's `SKILL.md` hunk only. The population test will then fail, so mark it `todo` with this task's id until the forward fix lands.

### Forward Fix (< 4 hours)

- **When to use**: false `text-mismatch` caused by normalisation.
- **Approach**: loosen the comparison in `checkAnchors` and add the failing pair as a test case.

### Rollback Triggers

- **Critical**: any finding dropped (absent from both the rendered report and the summary comment).
- **Non-critical**: false `⚠️ unverified anchor` markers. Fix forward.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-07
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.194.qa.3.code-review-anchors-name-source-lines.md](./task.194.qa.3.code-review-anchors-name-source-lines.md)
- **Gate File**: [task.194.gate.3.code-review-anchors-name-source-lines.yml](./task.194.gate.3.code-review-anchors-name-source-lines.yml)

### Test Coverage Summary
- **Tests Executed**: 3238
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (no gated finding; 2 advisory)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
- All cycle 2 fixes verified; bugs 1–5 closed.
- Advisory (reproduced, confidence medium): exit 1 conflates malformed anchors with an unloadable script at the four dispatcher blocks; a `--root` absent from the `--rev` tree passes the preflight. Both are recorded in the gate's `recommendations.future`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.194.qa.3.code-review-anchors-name-source-lines.md`
**Gate File**: `task.194.gate.3.code-review-anchors-name-source-lines.yml`
**Gate Status**: ⚠️ CONCERNS (NFR-level reservation; no open `top_issues`)
**Quality Score**: 90/100 (three cycles: 80 → 70 → 90; bugs 1–5 closed)
**PR Review (Step 5c)**: ⚠️ CONCERNS — `task.194.pr-review.1.code-review-anchors-name-source-lines.md`

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 13/13 (SC-1 – SC-12), each with a code citation and, for behaviour criteria, a per-PR test
✅ **Tests:** `finding-anchors.test.mjs` 23, `finding-anchors-callers.test.mjs` 9, extended jq-run tests; broader suites 3238/3238
✅ **PR:** #596; no reviews required on this host — Step 5c `/review-pr` stands in
✅ **CI:** reading 1 SUCCESS @ `d0eef60c` (test, validate, link-check, shellcheck, branch policy)
✅ **Documentation:** CHANGELOG `[Unreleased]` › Fixed; four dispatcher `SKILL.md` files and both lens prompts
✅ **Security Review:** PASS — no secrets, no shell-interpolated exec; `makeReader` containment probed by the engine, 11 executed, 0 reproduced (`task.194.dod.1.security.run.json`)
⚠️ **Compliance Review:** NOT_APPLICABLE — internal tooling

**Advisory follow-ups (not blocking):** gate 3 `recommendations.future` (exit 1 also meaning "checker did not load"; a `--root` absent from the `--rev` tree; `--inline` block binding; Bitbucket head fetch) and the PR review's CR-1 – CR-4 (dispatcher population scope, `no-line` for a malformed `file_line`, Bitbucket head SHA, `--staged` index reads).

**Task marked as ACCEPTED on:** 2026-10-07

**Detailed Verification Log:** See `task.194.dod.1.code-review-anchors-name-source-lines.md` for complete verification evidence and timestamps.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0     | Initial draft — cut from observation #290 | create-task |
| 2026-10-07 | 1.1     | Review 1 (6/10 → 9/10): anchor pattern `^(\S+):` (compound ref was parsed as a path); `--annotate` + `anchor_check` key; `--rev` per caller; bare-filename population; SC-5/SC-6 re-scoped, SC-7 test named | review-task |
| 2026-10-07 |         | Status → ready-for-development | review-task |
| 2026-10-07 |         | Implemented — 1 engine + 1 test file, 2 prompts, 4 dispatcher skills, 3 test files extended/added (28 new cases); status → ready-for-review | develop |
| 2026-10-07 |         | QA gate CONCERNS (80/100) — 2 findings (CR-1 bad --rev, SEC-1 symlink escape) | qa-task |
| 2026-10-07 |         | QA findings fixed — CR-1 (`--rev` resolved once, exit 2 `bad-rev`) and SEC-1 (real-path containment); 1 iteration | qa-fix |
| 2026-10-07 |         | QA gate CONCERNS (70/100) — 4 findings (CR2-1 --rev ignores --root, CR2-2 bad --root, CR2-3 stale prose, CR2-4 dir anchor); cycle 1 fixes verified | qa-task |
| 2026-10-07 |         | QA findings fixed — CR2-1..CR2-4: one `checkTree()` preflight (bad-root, bad-rev) and root-relative `cat-file blob` reads; stale review-pr prose; 2 iterations | qa-fix |
| 2026-10-07 |         | QA gate CONCERNS (90/100) — 0 gated findings, 2 advisory (reliability NFR); cycle 2 fixes verified, bugs 1–5 closed | qa-task |
| 2026-10-07 | 1.2 | DoD passed — accepted (PR #596) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Prompt contract

- [x] Complete

### Phase 2: Checker engine

- [x] Complete

### Phase 3: Wire the four dispatchers

- [x] Complete

### Phase 4: Population guard and release notes

- [x] Complete

---

## Implementation Summary

**Completion Date**: 2026-10-07 (develop-task run 1, inline implementation from the plan)

**Approach**: four phases from the plan, in order, with review 1's seven fixes applied first. The
engine and its tests came before the wiring, so each dispatcher's block was written against a
checker that already ran.

- **Phase 1**: `code-review-prompt.md` defines `file_line` as the PR-head line (the `+` side of the
  hunk header) and never a patch line, names `<DIFF_FILE>` in the rule, and adds `line_text` to the
  schema and rules. `pr-conformance-prompt.md` states the same rule for a `path:line` `ref`, citing
  its sibling by bare filename.
- **Phase 2**: `shared/resources/finding-anchors.js` (CommonJS, `require.main` guard): pure
  `checkAnchors` with a per-run read cache, the anchor pattern `^(\S+):(-?\d+)$`, collapse-and-substring
  text matching, and a CLI with `--findings-file`, `--root`, `--rev` (`git cat-file blob`, path relative to and confined to
  the root), `--annotate` (writes `anchor_check` on each finding) and `--json`; exit 0/1/2.
- **Phase 3**: `/review-pr` Step 6 runs the checker against the PR head (`origin/<head>`, or
  `FETCH_HEAD` after `git fetch origin pull/<n>/head` on the API route) before rendering, marks
  malformed anchors, adds `anchor_check` to the machine-readable block (five rules now), and filters
  `--inline` on it. `/review-code` gains Step 2b (no `--rev` for working-tree targets, `HEAD` for a
  range or PR), the render marker, the `--inline` filter and the `--fix` skip. `/qa-task` Step 3b and
  `/qa-story` Phase 1.6 write the block to a `mktemp` file through a quoted heredoc (`line_text`
  quotes source, which carries quotes and dollar signs), run the checker with `--rev HEAD`, mark the
  finding in `## Code Review` and the report template, and map a malformed bug into `top_issues[]` as
  `(location unverified: …)` with `file: null` for `no-such-file`. `npm run bundle`: closure +1 for
  each of the four skills (`finding-anchors.js`).
- **Phase 4**: `evals/shared/tests/finding-anchors-callers.test.mjs` (population on the bare
  filename, empty `CITE_ONLY`, floor 4; `FINDING_ANCHORS_ROOT` for mutation proofs) and the
  CHANGELOG `[Unreleased]` › Fixed entry.

**Testing Results**: `finding-anchors.test.mjs` 19/19; `finding-anchors-callers.test.mjs` 9/9;
`review-pr.test.js` 248/248 (600 s at load average 65–80; the slowest cases are the pre-existing
Step 0b shell tests). Mutation proofs: removing the call from `qa-story` (in a copy) turned its
population case red; replacing the `line_text` comparison with `true` turned the long-file control
and the mismatch-detail case red; removing the `anchor_check` select from `review-pr`'s `--inline`
jq turned the jq-run test red; restoring the plan's original `^(.+?):` turned the compound-`ref`
case red. Every original was restored and compared with `cmp`. `bundle:check`: 129 skills, 0
problems. `quick_validate.py`: all four skills valid. Fast gate (`npm run ci:fast`, `.agents/skills`
moved aside): 5474/5477 pass; the 2 failures were the LOAD-SENSITIVE file-budget assertions in
`bundle-missing-source.test.js` and `test-clean-checkout.test.js` (load average 45–80), both green
run alone (`fail 0`); the same `test-clean-checkout.test.js` failed on a clean `develop` worktree
under the same load.

**Deferred Work**: none. The integration run (`/review-pr 594` against the fixture branch) is QA's
to record (Testing Strategy § Integration Tests). The review's two Optional items (a minimum
`line_text` length; pinning the range anchor, which is done) stay as written in the review report.

---

## References

- Observation #290 — code-review-prompt file_line is ambiguous: lens returned patch-file line numbers
- PR #594: the review-pr smoke fixture where the defect was observed (branch `feature/task.900.review-pr-smoke-slugify`, report `task.900.pr-review.1.review-pr-smoke-slugify.md`)
- `shared/resources/pr-inline-comment-contract.md`: the `anchor-failed` contract this task leaves unchanged

---

## Notes

### Important Reminders

- QA report: `task.194.qa.{n}.code-review-anchors-name-source-lines.md`
- Bug reports: `task.194.bug.{N}.{name}.md`
- Quality gate: `task.194.gate.{n}.code-review-anchors-name-source-lines.yml` (co-located)

### Known Issues

- The integration test needs the PR #594 branch, not an open PR: `/review-pr` accepts a closed PR, and the code lens reads the branch's files. Closing #594 is fine; deleting `feature/task.900.review-pr-smoke-slugify` before this task's QA is not.

### Future Improvements

- `/qa-fix` ingester: skip or flag findings whose `anchor_check:` is malformed.
