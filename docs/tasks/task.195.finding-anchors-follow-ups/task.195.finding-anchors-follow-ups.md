---
id: task.195
title: "Finding-anchors follow-ups"
type: task
description: "Close the seven advisory items task.194 left in its gate 3 and PR review: an unparseable code file_line gets its own malformed verdict, a --root missing from the --rev tree is bad-root, a new --index read for staged reviews, dispatchers read the checker's reason instead of its exit code, the --inline blocks refuse un-annotated input, /review-pr binds the head SHA on both platforms, and the population guard covers every consumer of findings."
tags: [review-pr, review-code, qa-task, qa-story, develop-bug, finding-anchors, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-10-07
updated: 2026-10-07
assignee:
estimated_effort_hours: 8
github_issue: 597
---

# Technical Task: Finding-anchors follow-ups

**Status:** Planned
**GitHub Issue**: [#597](https://github.com/Gamaroff/agent-skills/issues/597)

---

## 1. Overview

task.194 (PR #596) shipped `shared/resources/finding-anchors.js` and wired it into the four skills
that dispatch the shared code reviewer. Its QA loop and PR review recorded eight advisory findings,
seven of them distinct, none blocking because each was rated medium or low confidence. This task
closes all seven.

**Scope**: the engine (`finding-anchors.js` and its tests), the checker block in the four dispatcher
`SKILL.md` files, `/review-pr` Step 6's head resolution, the develop-bug verify loop, and the
population guard.

**Key deliverables**:

1. Engine: an `unparseable` verdict, a root-in-rev check, and an `--index` read.
2. Dispatchers: decide on the checker's `reason`, refuse un-annotated `--inline` input, bind the head SHA.
3. A population guard that covers every executed document that acts on code-review findings.

---

## 2. Motivation

### Current Problems

Sources: `task.194.gate.3.code-review-anchors-name-source-lines.yml` `recommendations.future`
(cycle 1 CR-2 and CR-3, cycle 3 CR-1 and CR-2) and `task.194.pr-review.1.code-review-anchors-name-source-lines.md`
CR-1 to CR-4. Cycle 1 CR-3 and PR review CR-3 are the same defect, so seven are distinct.

1. **Exit 1 has two meanings at every dispatcher.** The four blocks say
   `# exit 1 = malformed anchors exist. NOT a halt` (`skills/qa-task/SKILL.md:637`,
   `skills/qa-story/SKILL.md:1104`, `skills/review-code/SKILL.md:93`, `skills/review-pr/SKILL.md:598`).
   `node` also exits 1 when the script cannot load. Reproduced in task.194 QA cycle 3: run from a
   non-root cwd, the call exits 1 and annotates nothing, and the caller is told to mark and continue.
2. **A `--root` missing from the `--rev` tree passes the preflight.** `checkTree()`
   (`shared/resources/finding-anchors.js:164`, `isDirectory`) checks the root on disk only, then
   resolves the rev. A root that exists on disk but not in that commit reads every finding as
   `no-such-file`. Reproduced in a scratch repository in cycle 3.
3. **A code `file_line` that is not `path:line` reads as clean.** `anchorOf()`
   (`shared/resources/finding-anchors.js:83`) reads `finding.file_line ?? finding.ref`, and a value
   that does not parse returns `no-line` (`:100`). That verdict is right for a conformance `ref` of
   `AC-3`. For a code finding it means the reviewer broke its contract, and a high-confidence bug with
   no usable location reaches `top_issues[]` with no marker.
4. **`--staged` reviews are checked against the wrong tree.** `/review-code --staged` diffs the index
   (`skills/review-code/SKILL.md:59`, `git diff --staged`), and its checker block tells the reader to
   omit `--rev` for that target (`:88`), so the checker reads the files on disk. An unstaged edit on top
   shifts lines and gives false `out-of-range` or `text-mismatch` verdicts.
5. **`/review-pr`'s head recovery is GitHub-only.** Step 6 recovers the head on the API-diff route with
   `pull/<n>/head` (`skills/review-pr/SKILL.md:593`). Bitbucket has no such ref, so on a merged or
   cross-fork Bitbucket PR the checker exits `bad-rev` every time. Step 1b's `gh pr view` field list
   (`:390`) does not request `headRefOid`.
6. **The `--inline` jq silently drops un-annotated findings.** Both blocks read `"$FINDINGS_JSON"`
   (`skills/review-pr/SKILL.md:890`, `skills/review-code/SKILL.md:156`) and keep only `anchor_check`
   `ok` or `unchecked-text`. A findings file that was never annotated yields `[]`, which looks the same
   as "no anchorable findings".
7. **The population guard counts dispatchers, not consumers.**
   `evals/shared/tests/finding-anchors-callers.test.mjs` takes every `SKILL.md` that mentions
   `code-review-prompt.md`. The develop-bug verify loop
   (`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:48`) runs `/review-code` and
   blocks on `category: bug` and `confidence: high`, with no word on `anchor_check`. A mislocated
   high-confidence bug there is reported as located.

### Benefits

1. Every "could not look" state exits 2 with its own reason, and no caller reads it as "the reviewer is wrong".
2. A reviewer that breaks the `path:line` contract is marked, not trusted.
3. Every target `/review-code` supports is checked against the tree it reviewed.
4. The guard fails when a new consumer of findings ignores `anchor_check`.

---

## 3. Technical Background

### Current Architecture

- **Engine.** `checkTree({ root, rev })` (`shared/resources/finding-anchors.js:164`) returns `bad-root`
  for a non-directory root and `bad-rev` for an unresolvable rev. `makeReader` reads
  `git cat-file blob <sha>:./<rel>` with `--rev`, else the real path under the root. `anchorOf`
  (`:83`) does not know which lens a finding came from.
- **Dispatchers.** The four checker blocks run the CLI with `--json` and branch on the exit code in a
  comment, not in code.
- **`/review-pr` head.** Step 6 binds `HEAD_REV` as a placeholder:
  `origin/<head-branch>`, or `FETCH_HEAD` after `git fetch origin pull/{pr-number}/head`.
- **Population guard.** Keyed on the bare filename `code-review-prompt.md` in `skills/*/SKILL.md`
  (4 members), empty `CITE_ONLY`, floor 4.

**Verified git behaviour (2026-10-07, scratch repository):** `git cat-file blob :./a.js` from a
subdirectory returns the **staged** content when the working tree differs. `git cat-file -t HEAD:./`
returns `tree` when the cwd exists in `HEAD`, and fails with
`path 'newdir/' exists on disk, but not in 'HEAD'` (rc 128) when it does not.

**Same-class mechanisms (obs #103).** `checkTree()` is the one "could not look" preflight. The
root-in-rev check extends it rather than adding a second preflight. `--index` adds a third read route
to `makeReader` beside `--rev` and the working tree, using the same root-relative rule.

### Target Architecture

- **`anchorOf` is lens-aware by key.** A finding that carries `file_line` is a code-lens finding; one
  that carries only `ref` is a conformance finding. This is decided by the key present, so it holds for
  a bare array as well as for the wrapped shapes.

  | Finding | Value | Verdict |
  |---|---|---|
  | carries `file_line` | parses as `path:line` | checked as today |
  | carries `file_line` | does not parse (a bare path, a range, empty) | **`unparseable`** (malformed, exit 1) |
  | carries only `ref` | does not parse (`AC-3`, a field, a compound ref) | `no-line` (clean) |

- **`checkTree` with `--rev` also requires the root in that commit**
  (`git cat-file -t <sha>:./` from the root reads `tree`), else `bad-root`.
- **`--index`** reads `git cat-file blob :./<rel>` from the root. It is a usage error together with
  `--rev` (exit 2). `checkTree` with `--index` requires the root to be inside a git work tree.
- **Dispatcher blocks decide on `reason`.** Each block captures `--json` stdout and reads `.reason`:
  `ok` or `malformed-anchors` continue; `bad-root`, `bad-rev` and `usage` HALT naming the reason; no
  parseable JSON at all HALTs as **checker not runnable**. The exit code alone is never the decision.
- **`--inline` refuses un-annotated input.** Before the jq, the block checks that every finding carries
  `anchor_check` and HALTs with "run Step 6's anchor check first" when one does not. It binds
  `FINDINGS_JSON` to the same `{findings-json}` placeholder as Step 6.
- **`/review-pr` binds `HEAD_REV` from the PR's own head SHA** on both routes: GitHub `headRefOid`
  (added to Step 1b's field list), Bitbucket `source.commit.hash`. When the commit is not local, the
  block fetches it (GitHub `pull/<n>/head`, Bitbucket the source branch by name), and verifies the SHA
  resolves before calling the checker.
- **develop-bug verify loop** keeps its blocking predicate unchanged. A blocking finding whose
  `anchor_check` is malformed is reported with `(location unverified: {file_line})` in the
  Re-Investigation note and the `/qa-fix` input, the same wording `/qa-task` uses for `top_issues[]`.
- **Population guard.** Population: every executed document (each `skills/*/SKILL.md`, each
  hand-authored `skills/*/references/*.md`, each `shared/resources/*.md`; generated copies excluded by
  their marker) that mentions `/review-code` or `code-review-prompt.md`. `CITE_ONLY` carries a reason
  for each member that only cites. Every other member must mention `anchor_check`. Floor 5.

  Measured 2026-10-07 with
  `comm -23 <(git grep --full-name -l -E '/review-code|code-review-prompt\.md' -- ':(top,glob)skills/*/SKILL.md' ':(top,glob)skills/*/references/*.md' ':(top,glob)shared/resources/*.md' | sort) <(git grep --full-name -l -e '^<!-- AUTO-GENERATED — DO NOT EDIT' -- ':(top,glob)skills/*/references/*.md' | sort)`:
  11 files. Witnesses:

  | File | Class | Witness |
  |---|---|---|
  | `skills/review-pr/SKILL.md` | acts | runs the checker (`:595`) |
  | `skills/review-code/SKILL.md` | acts | runs the checker (`:90`) |
  | `skills/qa-task/SKILL.md` | acts | runs the checker (`:634`) |
  | `skills/qa-story/SKILL.md` | acts | runs the checker (`:1101`) |
  | `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` | acts | blocks on `/review-code` findings (`:48`) |
  | `shared/resources/code-review-prompt.md` | cites | the producer (`:106` `code_review:`) |
  | `shared/resources/pr-conformance-prompt.md` | cites | the sibling lens (`:14`) |
  | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | cites | the blocking-resolution matrix (`:222`, `:270`) |
  | `skills/double-check/SKILL.md` | cites | disambiguation (`:28`) |
  | `skills/review-security/SKILL.md` | cites | disambiguation (`:43`, `:172`) |
  | `skills/loop-supervisor/SKILL.md` | cites | an example command (`:51`) |

  The test derives this population with its own scan and records the count. The table is the
  2026-10-07 reading, not a constant.

### Important Clarifications

- **Not repairing anchors.** As in task.194, the checker reports and never guesses the intended line.
- **`unparseable` is new and additive.** It joins `no-such-file`, `out-of-range` and `text-mismatch`
  in the malformed set, so every caller that already marks malformed anchors marks it with no further
  change.

---

## 4. Scope

### In Scope

✅ `shared/resources/finding-anchors.js`: `unparseable`, root-in-rev, `--index`
✅ `shared/resources/tests/finding-anchors.test.mjs`
✅ The checker block and `--inline` block in `skills/{review-pr,review-code,qa-task,qa-story}/SKILL.md`
✅ `/review-pr` Step 1b field list and Step 6 `HEAD_REV` binding
✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
✅ `evals/shared/tests/finding-anchors-callers.test.mjs` population widening
✅ `npm run bundle`; CHANGELOG `[Unreleased]` entry

### Out of Scope

❌ Re-mapping a wrong line to the right one
❌ `/qa-fix` ingester behaviour on `anchor_check` (task.194's recorded future improvement)
❌ A Bitbucket CI lane: the Bitbucket arm is verified by inspection, as task.70 did for inline comments

---

## 5. Breaking Changes

**`unparseable` is a new verdict in the malformed set.** A code finding whose `file_line` does not
parse used to exit 0 as `no-line`; it now exits 1 as `unparseable`.

- **Who is affected**: the four dispatchers, which already mark any malformed verdict (they key on the
  set, not on the names), and any external caller that branched on `no-line` for code findings. No
  such caller exists in the tree (`git grep -n '"no-line"' -- 'skills/*/SKILL.md'` returns nothing).
- **Migration**: none needed in the tree. An external caller treats `unparseable` like `out-of-range`.

`--index` and the root-in-rev check are additive.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.195.plan.finding-anchors-follow-ups.md](task.195.plan.finding-anchors-follow-ups.md)

### Phase 1: Engine (Risk: Medium)

**Files**: `shared/resources/finding-anchors.js`, `shared/resources/tests/finding-anchors.test.mjs`

- [ ] `anchorOf` lens by key; `checkAnchors` returns `unparseable` for a code `file_line` that does not parse; `MALFORMED` gains it
- [ ] `checkTree` with `--rev` requires `git cat-file -t <sha>:./` = `tree` from the root, else `bad-root`
- [ ] `--index` CLI flag and reader (`git cat-file blob :./<rel>`); usage error with `--rev`; `checkTree` requires a git work tree
- [ ] Unit tests for each, both directions (an AC-id `ref` stays `no-line`; an in-tree sub-root still reads)

**Dependencies**: none.

### Phase 2: Dispatcher blocks (Risk: Medium)

**Files**: the four dispatcher `SKILL.md` files, their tests

- [ ] Each checker block captures `--json` stdout and decides on `.reason`; no parseable JSON → HALT "checker not runnable"
- [ ] Both `--inline` blocks bind `FINDINGS_JSON` and refuse a finding with no `anchor_check`
- [ ] `/review-code`: `--staged` passes `--index`
- [ ] New `evals/shared/tests/finding-anchors-blocks.test.mjs`: extracts each dispatcher's checker block and runs it (checker missing → HALT; findings present → continues)

**Dependencies**: Phase 1 (`--index`, `unparseable`).

### Phase 3: `/review-pr` head SHA (Risk: Medium)

**Files**: `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`

- [ ] Step 1b requests `headRefOid` (GitHub); the Bitbucket call already returns `source.commit.hash`
- [ ] Step 6 binds `HEAD_REV` to the head SHA, fetches it when absent, and verifies it resolves
- [ ] Test: the Step 6 block, run with a stub `gh` and a repository holding the SHA, calls the checker with `--rev <sha>`

**Dependencies**: Phase 2 (the block's `reason` handling).

### Phase 4: Consumers, population, release notes (Risk: Low)

**Files**: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `evals/shared/tests/finding-anchors-callers.test.mjs`, `CHANGELOG.md`

- [ ] develop-bug verify loop: `(location unverified: {file_line})` for a blocking finding with a malformed `anchor_check`
- [ ] Population widened to executed documents mentioning `/review-code` or `code-review-prompt.md`; `CITE_ONLY` with reasons; floor 5
- [ ] `npm run bundle`, `npm run bundle:check`; CHANGELOG `[Unreleased]` › Fixed

**Dependencies**: Phases 1–3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finding-anchors.js`
2. ✅ `skills/review-pr/SKILL.md`
3. ✅ `skills/review-code/SKILL.md`
4. ✅ `skills/qa-task/SKILL.md`
5. ✅ `skills/qa-story/SKILL.md`
6. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` (hand-authored, not generated)

### Files to Modify (Tests)

7. ✅ `shared/resources/tests/finding-anchors.test.mjs` (glob `shared/resources/tests/*.test.mjs`)
8. ✅ `evals/shared/tests/finding-anchors-callers.test.mjs` (glob `evals/shared/tests/*.test.mjs`)
9. 🆕 `evals/shared/tests/finding-anchors-blocks.test.mjs` (same glob)
10. ✅ `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js` (globs `skills/review-pr/tests/*.test.js`, `skills/review-code/tests/*.test.js`)

### Files to Modify (Dependencies)

None. Node built-ins only.

### Files to Modify (Documentation)

11. ✅ `CHANGELOG.md`
12. Generated: the four skills' `references/finding-anchors.js`, via `npm run bundle`. Never hand-edited.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `finding-anchors.js`, with an injected `readFile` and spawned CLI runs.
- **Cases**:
  - A code finding with `file_line: "src/x.ts"`, `"src/x.ts:10-20"` or `""` → `unparseable`; a conformance
    finding with `ref: "AC-3"` or `"AC-3 / x.js:8"` → `no-line`. The same pair in a bare array, decided by key.
  - `--rev HEAD` with a `--root` that exists on disk but not in `HEAD` → exit 2 `bad-root`; a sub-root
    that is in `HEAD` still reads.
  - `--index`: staged content `staged`, working tree `worktree` → the anchor quoting `staged` reads `ok`,
    the one quoting `worktree` reads `text-mismatch`. `--index` with `--rev` → exit 2 `usage`.
- **Command**: `command node --test shared/resources/tests/finding-anchors.test.mjs`

### Integration Tests

- `finding-anchors-blocks.test.mjs`: each dispatcher's checker block is extracted and run in a scratch
  repository twice — with the bundled checker path absent (HALT, "not runnable") and present with a
  malformed finding (continues, finding annotated).
- review-pr Step 6 block with a stub `gh` (`headRefOid` set) and the commit present → the checker is
  called with `--rev <sha>`.
- **Control case** (create-task § 8): the blocks test also feeds a finding set with no malformed anchor
  (must continue, exit path `ok`) so a block that HALTs on every run fails.

### Contract Tests

- The widened population test. Its key (`/review-code` or `code-review-prompt.md`) is a superset; a
  token-free restatement is caught by the `anchor_check` requirement on every non-`CITE_ONLY` member.

### Performance Tests

Not applicable: one extra `git cat-file -t` per run.

### Consumer Tests

- `review-pr.test.js`, `review-code.test.js` (jq-run tests) and `pr-review-loop-parity.test.mjs` still pass.

---

## 9. Success Criteria

### Functional

- [ ] **SC-1** A code finding whose `file_line` does not parse reads `unparseable` (exit 1); a conformance `ref` that does not parse reads `no-line`. Held by `finding-anchors.test.mjs`.
- [ ] **SC-2** With `--rev`, a `--root` absent from that commit exits 2 `bad-root`. Held by `finding-anchors.test.mjs`.
- [ ] **SC-3** `--index` reads the staged content relative to `--root`; `--index` with `--rev` exits 2. Held by `finding-anchors.test.mjs`.
- [ ] **SC-4** Each dispatcher's checker block HALTs as "checker not runnable" when the checker cannot load, and continues on `malformed-anchors`. Held by `finding-anchors-blocks.test.mjs`.
- [ ] **SC-5** Both `--inline` blocks refuse a findings file with an un-annotated finding instead of posting `[]`. Held by the extended jq-run tests in `review-pr.test.js` and `review-code.test.js`.
- [ ] **SC-6** `/review-pr` Step 6 calls the checker with `--rev` set to the PR's head SHA. Held by `review-pr.test.js` (stub `gh`). The Bitbucket arm (`source.commit.hash`) is verified by inspection; no Bitbucket lane exists in CI.
- [ ] **SC-7** (documentation) The develop-bug verify loop states the `(location unverified: …)` rule for a blocking finding with a malformed `anchor_check`. Held by `finding-anchors-callers.test.mjs`.

### Performance

- [ ] **SC-8** The engine still reads each distinct path once per run. Held by the existing counting-`readFile` test.

### Code Quality

- [ ] **SC-9** `npm test`, `npm run bundle:check`, and `npm run validate -- skills/<skill>/` for review-pr, review-code, qa-task, qa-story and develop-bug pass.
- [ ] **SC-10** Mutation proof: dropping the lens-by-key rule, the root-in-rev check, the `reason` decision in one dispatcher block, or the `anchor_check` mention in the develop-bug loop each turns its test red.

### Migration

- [ ] **SC-11** CHANGELOG `[Unreleased]` › Fixed names the new verdict, `--index` and the dispatcher change.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A block that HALTs on a correct run.** The `reason` decision could misread a real `ok`. Mitigation:
   the blocks test runs each block on a clean finding set as well as the two failure shapes.
2. **`unparseable` raises noise.** A reviewer that writes ranges for multi-line findings would now be
   marked. Mitigation: the prompt already defines `file_line` as one line; the marker is the intended
   signal, and the finding is never dropped.
3. **Fetching a head SHA that the remote no longer serves.** Mitigation: the block verifies the SHA
   resolves, and an unresolvable one exits 2 `bad-rev` with the findings rendered as unchecked.

### Low Risk Areas

1. **Population drift.** Mitigated by the derived population and the `CITE_ONLY` reasons.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a dispatcher block HALTs on a run whose checker exited 0, or `unparseable` fires on more than 1 in 5 code findings in a real run.
- **Steps**: 1) `git revert` the merge commit. 2) `npm run bundle`. 3) `npm test`.
- **Validation**: `git grep -n 'unparseable' -- shared/resources/finding-anchors.js` returns nothing.

### Partial Rollback (1-2 hours)

- **When to use**: one phase misbehaves (most likely Phase 3's head binding).
- **Steps**: revert that phase's hunks; the other phases stand alone.

### Forward Fix (< 4 hours)

- **When to use**: a false `unparseable` on a legitimate shape.
- **Approach**: widen the parse in `anchorOf` and add the shape as a test case.

### Rollback Triggers

- **Critical**: a finding dropped, or a block that continues after the checker failed to load.
- **Non-critical**: noisy `unparseable` markers.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                 | Author      |
| ---------- | ------- | --------------------------------------------------------------------------- | ----------- |
| 2026-10-07 | 1.0     | Initial draft — cut from task.194's gate 3 and PR review advisory findings | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Engine

- [ ] Complete

### Phase 2: Dispatcher blocks

- [ ] Complete

### Phase 3: `/review-pr` head SHA

- [ ] Complete

### Phase 4: Consumers, population, release notes

- [ ] Complete

---

## References

- task.194 — `docs/tasks/task.194.code-review-anchors-name-source-lines/` (PR #596): gate 3 `recommendations.future`, PR review CR-1 to CR-4
- `shared/resources/finding-anchors.js` header: verdicts and exit codes
- Observation #293 — the documentation probe searches for the old behaviour, not the edited text

---

## Notes

### Important Reminders

- QA report: `task.195.qa.{n}.finding-anchors-follow-ups.md`
- Bug reports: `task.195.bug.{N}.{name}.md`
- Quality gate: `task.195.gate.{n}.finding-anchors-follow-ups.yml` (co-located)

### Dependencies

- Lands after PR #596 merges: every file this task changes is new or rewritten there.
