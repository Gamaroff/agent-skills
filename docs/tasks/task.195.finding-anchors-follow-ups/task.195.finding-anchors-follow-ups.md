---
id: task.195
title: "Finding-anchors follow-ups"
type: task
description: "Close the seven advisory items task.194 left in its gate 3 and PR review: an unparseable code file_line gets its own malformed verdict, a --root missing from the --rev tree is bad-root, a new --index read for staged reviews, dispatchers read the checker's reason instead of its exit code, the --inline blocks refuse un-annotated input, /review-pr binds the head SHA on both platforms, and the population guard covers every consumer of findings."
tags: [review-pr, review-code, qa-task, qa-story, develop-bug, finding-anchors, follow-up]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-07
updated: 2026-10-19
assignee:
estimated_effort_hours: 8
github_issue: 597
completed_date: 2026-10-19
pr_number: 695
---

# Technical Task: Finding-anchors follow-ups

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.195.review.1.finding-anchors-follow-ups.md` implemented 2026-10-19
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
   `# exit 1 = malformed anchors exist. NOT a halt` (`skills/qa-task/SKILL.md:645`,
   `skills/qa-story/SKILL.md:1135`, `skills/review-code/SKILL.md:93`, `skills/review-pr/SKILL.md:617`).
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
5. **`/review-pr`'s head recovery was GitHub-only — closed before this task started.** Commit
   `319bf779` (2026-10-07, after this task was written) added `skills/review-pr/scripts/resolve-head-rev.sh`,
   which Step 6 now runs (`skills/review-pr/SKILL.md:601-616`): `origin/<head-branch>`, GitHub
   `pull/<n>/head`, a Bitbucket fork's branch, the Bitbucket source commit and, for a squash merge,
   the merge commit, tested by `skills/review-pr/tests/resolve-head-rev.test.js` under bash and zsh.
   No work remains here; Phase 2's `reason` decision still applies to that block (review 1, I1).
6. **The `--inline` jq silently drops un-annotated findings.** Both blocks read `"$FINDINGS_JSON"`
   (`skills/review-pr/SKILL.md:936`, `skills/review-code/SKILL.md:156`) and keep only `anchor_check`
   `ok` or `unchecked-text`. A findings file that was never annotated yields `[]`, which looks the same
   as "no anchorable findings".
7. **The population guard counts dispatchers, not consumers.**
   `evals/shared/tests/finding-anchors-callers.test.mjs` takes every `SKILL.md` that mentions
   `code-review-prompt.md`. The develop-bug verify loop
   (`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:50`) runs `/review-code` and
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
- **`/review-pr` head.** Step 6 binds `HEAD_REV` from `scripts/resolve-head-rev.sh` (five routes,
  both platforms; commit `319bf779`).
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
- **`/review-pr` head binding is unchanged.** `resolve-head-rev.sh` already hands the checker a local
  commit on both platforms; only the block's exit-code comment is replaced by the `reason` decision.
- **Every prose enumeration of the malformed set gains `unparseable`.** The dispatchers do not key on
  the set: each names the verdicts. Search: `git grep -n 'text-mismatch' -- 'skills/*/SKILL.md'` →
  `qa-task/SKILL.md:652,786`, `qa-story/SKILL.md:1142,1272`, `review-code/SKILL.md:100,120,213`,
  `review-pr/SKILL.md:624,781` (2026-10-19). qa-task / qa-story's `file: null` rule (today
  `no-such-file` only) also covers `unparseable`, which has no path.
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
- **`unparseable` joins the malformed set**, beside `no-such-file`, `out-of-range` and
  `text-mismatch`. The engine's `MALFORMED` set changes in one place, but the dispatcher prose names
  the verdicts, so each enumeration site is updated (Target Architecture; review 1, I2).

---

## 4. Scope

### In Scope

✅ `shared/resources/finding-anchors.js`: `unparseable`, root-in-rev, `--index`
✅ `shared/resources/tests/finding-anchors.test.mjs`
✅ The checker block and `--inline` block in `skills/{review-pr,review-code,qa-task,qa-story}/SKILL.md`
✅ Every prose enumeration of the malformed verdicts in the four dispatcher `SKILL.md` files
✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
✅ `evals/shared/tests/finding-anchors-callers.test.mjs` population widening
✅ `npm run bundle`; CHANGELOG `[Unreleased]` entry

### Out of Scope

❌ Re-mapping a wrong line to the right one
❌ `/qa-fix` ingester behaviour on `anchor_check` (task.194's recorded future improvement)
❌ A Bitbucket CI lane: the Bitbucket arm is verified by inspection, as task.70 did for inline comments
❌ `/review-pr` head binding: shipped by `319bf779` (`resolve-head-rev.sh`) before this task started

---

## 5. Breaking Changes

**`unparseable` is a new verdict in the malformed set.** A code finding whose `file_line` does not
parse used to exit 0 as `no-line`; it now exits 1 as `unparseable`.

- **Who is affected**: the four dispatchers, whose prose names the malformed verdicts (nine sites,
  listed in §3 Target Architecture — each gains `unparseable`), the unit test that pins a range
  `file_line` to `no-line` (`shared/resources/tests/finding-anchors.test.mjs:145`), and any external
  caller that branched on `no-line` for code findings. No such caller exists in the tree
  (`git grep -n '"no-line"' -- 'skills/*/SKILL.md'` returns nothing).
- **Migration**: in the tree, the enumeration sweep and the test update above. An external caller
  treats `unparseable` like `out-of-range`.

`--index` and the root-in-rev check are additive.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.195.plan.finding-anchors-follow-ups.md](task.195.plan.finding-anchors-follow-ups.md)

### Phase 1: Engine (Risk: Medium)

**Files**: `shared/resources/finding-anchors.js`, `shared/resources/tests/finding-anchors.test.mjs`

- [x] `anchorOf` lens by key; `checkAnchors` returns `unparseable` for a code `file_line` that does not parse; `MALFORMED` gains it
- [x] `checkTree` with `--rev` requires `git cat-file -t <sha>:./` = `tree` from the root, else `bad-root`
- [x] `--index` CLI flag and reader (`git cat-file blob :./<rel>`); usage error with `--rev`; `checkTree` requires a git work tree
- [x] Unit tests for each, both directions (an AC-id `ref` stays `no-line`; an in-tree sub-root still reads)
- [x] Update the existing `no-line` test (`finding-anchors.test.mjs:142-150`): its range `file_line` case (`:145`) now reads `unparseable`

**Dependencies**: none.

### Phase 2: Dispatcher blocks (Risk: Medium)

**Files**: the four dispatcher `SKILL.md` files, their tests

- [x] Each checker block captures `--json` stdout and decides on `.reason`; no parseable JSON → HALT "checker not runnable"
- [x] Both `--inline` blocks bind `FINDINGS_JSON` and refuse a finding with no `anchor_check`
- [x] `/review-code`: `--staged` passes `--index`
- [x] Add `unparseable` to every prose enumeration of the malformed verdicts (the nine sites in §3); qa-task / qa-story `file: null` covers it
- [x] New `evals/shared/tests/finding-anchors-blocks.test.mjs`: extracts each dispatcher's checker block and runs it (checker missing → HALT; findings present → continues)

**Dependencies**: Phase 1 (`--index`, `unparseable`).

### Phase 3: `/review-pr` head SHA — superseded (no work)

Shipped by commit `319bf779` (`skills/review-pr/scripts/resolve-head-rev.sh`, tested by
`skills/review-pr/tests/resolve-head-rev.test.js`) before this task started. Phase 2 replaces the
block's exit-code comment with the `reason` decision; the `HEAD_REV` binding is left as it is
(review 1, I1).

### Phase 4: Consumers, population, release notes (Risk: Low)

**Files**: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `evals/shared/tests/finding-anchors-callers.test.mjs`, `CHANGELOG.md`

- [x] develop-bug verify loop: `(location unverified: {file_line})` for a blocking finding with a malformed `anchor_check`
- [x] Population widened to executed documents mentioning `/review-code` or `code-review-prompt.md`; `CITE_ONLY` with reasons; floor 5
- [x] `npm run bundle`, `npm run bundle:check`; CHANGELOG `[Unreleased]` › Fixed

**Dependencies**: Phases 1–2.

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
10. ✅ `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js` (globs `skills/review-pr/tests/*.test.js`, `skills/review-code/tests/*.test.js`) — the `--inline` refusal

### Files to Modify (Dependencies)

None. Node built-ins only.

### Files to Modify (Documentation)

11. ✅ `CHANGELOG.md`
12. Generated: the four skills' `references/finding-anchors.js`, via `npm run bundle`. Never hand-edited.
13. Task artefacts: `task.195.review.1.finding-anchors-follow-ups.md`, `task.195.implementation.1.finding-anchors-follow-ups-initial-run.md`; `task.195.plan.finding-anchors-follow-ups.md` (Phase 3 rescoped by review 1)

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
- [ ] **SC-6** `/review-pr` Step 6 calls the checker with `--rev` set to a PR head commit that exists locally, on both platforms. Already held by `skills/review-pr/tests/resolve-head-rev.test.js` (commit `319bf779`); this task adds only the `reason` decision to that block, held by `finding-anchors-blocks.test.mjs` (SC-4).
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

- **When to use**: one phase misbehaves (most likely Phase 2's dispatcher blocks).
- **Steps**: revert that phase's hunks; the other phases stand alone.

### Forward Fix (< 4 hours)

- **When to use**: a false `unparseable` on a legitimate shape.
- **Approach**: widen the parse in `anchorOf` and add the shape as a test case.

### Rollback Triggers

- **Critical**: a finding dropped, or a block that continues after the checker failed to load.
- **Non-critical**: noisy `unparseable` markers.

## Deferred Work

- **Release and re-vendor.** The fix reaches consumers only after a tagged release and `setup-consumer.sh --update`;
  `/finalise` runs before merge, so this is not a success criterion here.
- **`/qa-fix` reading `anchor_check`** stays out of scope, as task.194 recorded: the `(location unverified: …)` wording
  is what the fixer sees.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-19
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.195.qa.5.finding-anchors-follow-ups.md](./task.195.qa.5.finding-anchors-follow-ups.md)
- **Gate File**: [task.195.gate.5.finding-anchors-follow-ups.yml](./task.195.gate.5.finding-anchors-follow-ups.yml)

### Test Coverage Summary

- **Tests Executed**: 5968
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

TASK-195-QA4-1 is fixed. One field reader, `fieldOf`, now decides `file_line`, `ref` and `line_text`. A non-string `line_text` reads `text-mismatch`, and only an absent or blank one is unchecked. The cycle 5 review found nothing. The security probe measured 43 cases with 0 reproduced and 0 escapes. Advisory items are carried to future work in the gate.

## Definition of Done - Gaps Identified — run 1 (historical, superseded by run 2)

**Status:** SUPERSEDED — every gap below was closed in QA cycles 3–5; see the run 2 section that follows

### QA Gate Status

**QA Report**: `task.195.qa.2.finding-anchors-follow-ups.md`
**Gate File**: `task.195.gate.2.finding-anchors-follow-ups.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

### Missing Criteria:

1. **Security Review** (the /finalise probe of the review-pr `--inline` guard ran 43 cases: 2 reproduced and 13 escaped):
   - [ ] **Medium.** `skills/review-pr/SKILL.md:971-975`: the guard must require an array for every wrapper key present. `{"code_review":{"findings":"oops"},"pr_conformance":{"findings":[annotated]}}` passes, and the code findings are dropped silently. This is QA 2's CR-1, now reproduced. `findingsOf` has the same leniency.
   - [ ] **Low.** The same guard must treat `anchor_check: null` as absent (`.anchor_check | type == "string"`).
   - [ ] **Escape.** `skills/review-pr/SKILL.md:951` runs `mktemp -t review-pr-inline.XXXXXX.json` before the guard and never removes it on HALT. 13 refused inputs leave a scratch file in `$TMPDIR`.

2. **CI:**
   - [ ] Reading 1 is PENDING on `faec9ea4`. Acceptance needs a green run on the head carrying the final code.

### Next Steps:

- [ ] **BLOCKING**: fix the three review-pr `--inline` gaps and add the reproducing cases to `skills/review-pr/tests/review-pr.test.js`, with a mutation proof for each
- [ ] Re-enter QA at 5a (this is a code change), then re-run `/finalise`

**Estimated Effort:** Small (≈1 hour)

**Gap Report Generated:** 2026-10-19
**QA Gate Reference**: See `task.195.gate.2.finding-anchors-follow-ups.yml`

**Detailed Verification Log:** See `task.195.dod.1.finding-anchors-follow-ups.md` for the complete verification evidence and the probe record `task.195.dod.1.security.run.json`.
## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.195.qa.5.finding-anchors-follow-ups.md`
**Gate File**: `task.195.gate.5.finding-anchors-follow-ups.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100. Five QA cycles: CONCERNS 90, PASS 100, CONCERNS 90, CONCERNS 90, PASS 100.

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 11 of 11 met. Each has a code citation and a test that runs on every PR.
✅ **PR Review:** PR #695. The 5c `/review-pr` gave APPROVE with 0 findings. The repository requires no reviews.
✅ **CI:** SUCCESS on `05f97433` across 5 checks (test, validate, link-check, shellcheck, branch policy).
✅ **Documentation:** The CHANGELOG `[Unreleased]` › Fixed entry covers the new verdict, `--index` and the reason-deciding dispatchers. Four dispatcher SKILL.md files and the develop-bug verify loop document the behaviour.
✅ **Security Review:** PASS. A probe of 57 candidates against two boundary controls (the review-pr `--inline` guard and the review-code Step 2b checker) reproduced 0 with 0 escapes. All of run 1's gaps are closed.
⚠️ **Compliance Review:** Not applicable. This is internal tooling, with no personal, payment or health data and no UI.

**Task marked as ACCEPTED on:** 2026-10-19

**Detailed Verification Log:** See `task.195.dod.2.finding-anchors-follow-ups.md` for the complete verification evidence and the probe record `task.195.dod.2.security.run.json`.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0     | Initial draft — cut from task.194's gate 3 and PR review advisory findings | create-task |
| 2026-10-19 | 1.1     | Review passed (8/10) — Phase 3 rescoped (superseded by `319bf779`), malformed-set enumeration sweep and the pinned `no-line` test added, anchors corrected | review-task |
| 2026-10-19 |         | Status → ready-for-development | review-task |
| 2026-10-19 |         | Implemented — 12 files (engine, 4 dispatcher blocks, develop-bug loop, 5 test files, CHANGELOG), 29 engine + 14 block + 16 guard tests | develop |
| 2026-10-19 |         | Status → ready-for-review | develop |
| 2026-10-19 |         | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-10-19 |         | QA findings fixed — 2 of 2 (TASK-195-QA1-1, -2), 1 iteration | qa-fix |
| 2026-10-19 |         | QA gate PASS (100/100) — 0 findings (3 advisory) | qa-task |
| 2026-10-19 |  | DoD incomplete — 4 gaps identified (3 security on the review-pr --inline guard, CI pending) | finalise |
| 2026-10-19 |  | QA gate CONCERNS (90/100) — 1 finding (TASK-195-QA3-1; 3 advisory) | qa-task |
| 2026-10-19 |  | QA findings fixed — 1 of 1 (TASK-195-QA3-1: a non-string anchor reads unparseable / no-line), 1 iteration | qa-fix |
| 2026-10-19 |  | QA gate CONCERNS (90/100) — 1 finding (TASK-195-QA4-1) | qa-task |
| 2026-10-19 |  | QA findings fixed — 1 of 1 (TASK-195-QA4-1: a non-string line_text is a text-mismatch; one field reader for file_line, ref and line_text), 1 iteration | qa-fix |
| 2026-10-19 |  | QA gate PASS (100/100) | qa-task |
| 2026-10-19 | 1.2 | DoD passed — accepted (PR #695) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Engine

- [x] Complete

### Phase 2: Dispatcher blocks

- [x] Complete

### Phase 3: `/review-pr` head SHA

- [x] Superseded by `319bf779` — no work

### Phase 4: Consumers, population, release notes

- [x] Complete

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

### Implementation Summary (2026-10-19)

- **Engine** (`shared/resources/finding-anchors.js`): `anchorOf` returns `{lens, path, line}` with the lens decided by the
  key (`file_line` → code, `ref` alone → conformance); a code value that does not parse is `unparseable`, which joins
  `MALFORMED`. `checkTree` gained the root-in-rev check (`git cat-file -t <sha>:./` must read `tree`) and the `--index`
  work-tree check; `makeReader` gained the `:./<rel>` index route. `--index` with `--rev` is `usage`. The text output
  prints a malformed `unparseable` finding by its raw `file_line`.
- **Dispatchers**: each checker block captures `--json` stdout and branches on `.reason` (`ok`/`malformed-anchors`
  continue; `bad-root`/`bad-rev`/`usage` HALT with the message; nothing parseable → HALT "checker not runnable").
  `/review-code` maps its target to the route through `set --` (worktree → none, staged → `--index`, range → `--rev HEAD`)
  so the arguments survive zsh. Both `--inline` blocks run a `jq -e` guard that refuses an un-annotated finding before the
  existing select, which is unchanged byte-for-byte. `unparseable` added at the nine enumeration sites; qa-task/qa-story
  `file: null` covers it.
- **develop-bug verify loop**: a blocking finding with a malformed `anchor_check` still blocks and is carried as
  `(location unverified: {file_line})`.
- **Population guard**: a second population over executed documents (`/review-code` or `code-review-prompt.md`; generated
  copies excluded by marker): 11 members, 6 `CONSUMER_CITE_ONLY` with reasons, floor 5 acting.
- **Phase 3**: no work — superseded by `319bf779` (review 1, I1).
- **Mutation proofs** (each red, restored with `cmp`): lens-by-key; root-in-rev; the `--index` reader; the qa-task `reason`
  decision; review-code staged → `--index`; the develop-bug `anchor_check` mention (full removal; removing one of its two
  mentions stays green by design); the review-pr `--inline` guard.

### QA Fix — cycle 1 (2026-10-19)

- **TASK-195-QA1-1** (MEDIUM): the lens now comes from the wrapper when the input has one (`lensesOf(doc)`,
  passed to `checkAnchors` by `run`), and from the key only for a bare array. A `code_review` finding that has
  lost its `file_line` reads `unparseable`, not `no-line`. **Deviation from §3 Target Architecture, recorded:**
  §3 says the lens is decided by the key alone; that rule produced this finding, so the wrapper now wins. Tests:
  the wrapped keyless unit case with a bare-array control, and a CLI case annotating both lenses.
- **TASK-195-QA1-2** (LOW): both `--inline` guards require a findings array (review-pr: at least one of the two)
  before testing `anchor_check`; `{}`, `{code_review:{}}` and `[]` HALT, and an empty array still passes.
- Mutation proofs, each red and restored with `cmp`: `run` passing no lenses; `anchorOf` ignoring its lens;
  each guard without its array check. The review-code proof first stayed green, because the guard iterated
  with `[]` and jq's error refused `{}` before the type check could; it now iterates with `[]?`, so the type
  check is the one mechanism and the proof goes red.
- Probe (Step 3.5): the population command from qa-fix Step 3.5, phrase ``path:line` at all`` (the old
  observable), over `skills/*/SKILL.md`, hand-authored `skills/*/references/*.md` and `shared/resources/*`
  — qa-task, qa-story, review-code, review-pr: updated ("a code finding whose `file_line` is absent or is not
  `path:line`"); `CHANGELOG.md`: updated; §3 of this document: left as written, deviation recorded above.
  Population 4 + 2; the restatement is the nine-site enumeration task.195 already swept, so the move is patch,
  not consolidate: each site names the verdict for its own reader.

