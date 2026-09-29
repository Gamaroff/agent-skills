---
id: task.158
title: "[Task 158] QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment"
type: task
description: "Three residues carried out of task.149. From cycle 2 on, qa-read-back.js passes a document whose links still point at the previous cycle. The QA skills and pipeline step docs find the current gate with a second `find -name` grammar that disagrees with qa-cycle.sh. And security-probe.mjs refuses a legitimate `..name` path with a bare `startsWith(\"..\")` containment test."
tags: [qa-task, qa-story, qa-read-back, qa-cycle, security-probe, doc-links, follow-up]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-09-26
updated: 2026-09-29
assignee:
estimated_effort_hours: 8
github_issue: 494
---

# Technical Task: QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.158.review.1.cycle-file-and-containment-definitions.md` implemented 2026-09-29

**GitHub Issue**: [#494](https://github.com/Gamaroff/agent-skills/issues/494)

---

## 1. Overview

task.149 (PR #493, merged `458bcec0`) gave the QA skills a post-edit read-back and gave
`qa-cycle.sh` a `--path` mode, but it left three residues on the record: 5c CR-1, gate 8
`recommendations.future` and gate 7/8 future. This task closes all three:

- the read-back must check that the document links **this** cycle's gate and QA report
- every "which file is this cycle's gate" lookup must use `qa-cycle.sh`
- every "is this path inside that root" test must use the corrected predicate

**Scope**: `shared/resources/qa-read-back.js`, the gate lookups in `skills/qa-task/SKILL.md`,
`skills/qa-story/SKILL.md` and three shared pipeline step docs, the two containment sites in
`shared/resources/security-probe.mjs`, the `isWithin` definitions in `doc-links.js` /
`qa-execute-snippets.mjs`, the `qa-cycle.sh` header, tests, CHANGELOG.

**Key deliverables**:

1. `qa-read-back.js` halts when the document does not link the gate and QA report that
   `qa-cycle.sh --path` names for the current cycle. A cycle-2 document left unedited is a HALT, not
   `clean`.
2. Every site that selects the current cycle's gate asks `qa-cycle.sh`, and a guard test fails on a
   `find`/`sed` gate-selection lookup left in the named files.
3. `security-probe.mjs` uses the shared `isWithin`. A parity test holds the one ESM and one CJS
   definition to the same case table.

**Expected outcome**: none of the three reproductions recorded in task.149's artefacts still
reproduces, and each one turns a named test red when its fix is reverted.

---

## 2. Motivation

### Current Problems

1. **The read-back passes a document that was never re-edited (task.149 5c CR-1, medium, reproduced).**
   `qa-read-back.js` confirms that this cycle's gate and QA report **exist** (through
   `qa-cycle.sh --path`). It also confirms that the document has *a* Change Log row and that every
   link it contains resolves. It never confirms that the document links **this** cycle's gate and
   report. Reproduction from task.149 Step 5c: commit `gate.1` and `qa.1` with a document linking
   them, then add untracked `gate.2` and `qa.2` and leave the document untouched. The result is
   `rc=0` and `ok qa-read-back: … gate, report and Change Log row present`. That is exactly the
   stale-claim shape obs #164 exists to catch, reopened for every cycle after the first.
2. **Two grammars decide "the current gate" (task.149 gate 8, pre-existing on `develop`).** Several
   blocks still select the file with `find … -name "task.*.gate.${QA_CYCLE}.*.yml" | head -1`:
   - `skills/qa-task/SKILL.md` Phase 0 (`LATEST_GATE`) and Step 13b (`THIS_GATE`);
   - the same two blocks in `skills/qa-story/SKILL.md`;
   - `shared/resources/develop-pipeline-step-5-6-qa-loop.md` § "Finding the Latest Gate File";
   - `shared/resources/develop-pipeline-resume-contract.md`, the cycle reconstruction (`QA_CYCLE=`);
   - `shared/resources/develop-pipeline-step-7-finalise.md`, the completion comment's `FINAL_GATE`.

   `qa-cycle.sh` counts `task.9.gate.02.x.yml` as cycle 2. The literal `gate.2.` pattern does not
   match that file, so `THIS_GATE` is empty and Step 13b's `BLOCKING_COUNT` reads 0 on a gate with
   a HIGH entry (reproduced at task.149 QA cycle 8). The `find` form also accepts a directory and
   silently takes the first of two matches.
3. **`security-probe.mjs` refuses a legitimate path (task.149 gate 7 CR-2, pre-existing).** Both
   containment tests use a bare `rel.startsWith("..")`: the `--entry` check (`const escapes = rel
   === "" || rel.startsWith("..") || isAbsolute(rel);`) and the `--fake-gh` check (`if (rel === "" ||
   rel.startsWith("..") || isAbsolute(rel))`). An entry or fake-gh directory whose name begins with
   two dots, such as `..fixtures`, is inside the repository and is refused as outside it. This fails
   closed, but it is the defect task.149 fixed in `qa-execute-snippets.mjs` (CR6-4).
4. **The corrected containment test exists as three hand copies.** They are `isWithin` in
   `qa-execute-snippets.mjs` (ESM, exported), `isWithin` in `qa-read-back.js` (CJS, private) and an
   inline test in `doc-links.js` `linkState`. `qa-read-back.js` says in a comment that its test is
   "the same test". Nothing holds it to that, and a fourth copy has already drifted (item 3).

### Benefits

1. **The read-back's claim becomes true on every cycle.** Today it holds only on the first cycle.
2. **One grammar for "the current gate"**, so a zero-padded, dotfile, directory or ambiguous name is
   handled by one tested script. It is no longer handled by five `find` lines that each behave
   differently.
3. **`qa-cycle.sh`'s header can say "the only definition" and mean it.** task.149 had to weaken the
   sentence to "NOT yet the only definition".
4. **One containment predicate per module system, held equal by a test**, so the next copy cannot
   drift silently.

---

## 3. Technical Background

### Current Architecture

- **`qa-read-back.js` `readBackUnguarded`** finds the cycle with `qaCycle(dir)`, then the gate and
  report with `artifact(dir, "gate")` and `artifact(dir, "qa")`. `artifact` calls `qa-cycle.sh --path`.
  The function stages the document, gate and report, reads links twice with
  `docLinks.checkDocument`, and checks `changeLog.checkUpdatedCoherence`. **What is missing:** no
  check that the document links the gate's and the report's paths. `checkDocument` cannot answer
  this today. It returns `links` as a **count**, plus the `broken[]` entries, which carry
  `resolved`. The resolved paths of the links that *do* resolve are computed inside its loop and then
  discarded.
- **Current-cycle gate lookups (the second grammar):**
  - `skills/qa-task/SKILL.md` Phase 0 step 1: `LATEST_GATE=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.${PRIOR_CYCLE}.*.yml" … | head -1)`
  - `skills/qa-task/SKILL.md` Step 13b: `THIS_GATE=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.${QA_CYCLE:-none}.*.yml" … | head -1)`
  - `skills/qa-story/SKILL.md`: the same two, with `story.*` and `$STORY_DIR`
  - `develop-pipeline-step-5-6-qa-loop.md` § "Finding the Latest Gate File": `find … -name "{task|story}….gate.*.yml" | awk -F'gate\\.' … | sort -n | tail -1`
  - `develop-pipeline-resume-contract.md` § "QA Cycle Count Reconstruction": `QA_CYCLE=$(find … -name "*.gate.*.yml" | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/' | sort -n | tail -1)`
  - `develop-pipeline-step-7-finalise.md` item 1 (completion comment): `FINAL_GATE=$(find … -name "*.gate.*.yml" | sed … | sort -n | tail -1 | …)`
  - Population command, run to find these sites:
    `git grep -n -E 'find [^|]*gate' -- ':(glob)skills/*/SKILL.md' ':(glob)shared/resources/*.md'`,
    then exclude the `PRIOR_GATES` counts, which Scope below leaves out. The test records the count;
    this document does not restate it.
- **The existing guard:** `tests/qa-cycle.test.js` "no shipped skill carries an inline gate-number
  derivation any more" scans the fenced blocks of `qa-task`, `qa-story` and `qa-fix` `SKILL.md`
  against `INLINE_DERIVATION`. That pattern catches a `$( … .gate. … [0-9] | awk | cut -d …)`
  derivation that does not call `qa-cycle.sh`. It does not catch a `find -name "*.gate.${VAR}.*"`
  selection, and it does not scan the shared step docs.
- **Containment predicates:**
  - `qa-execute-snippets.mjs` `export function isWithin(parent, child)`: corrected (`rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)` is outside)
  - `qa-read-back.js` `function isWithin`: corrected, private
  - `doc-links.js` `linkState`: corrected, inline (`rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)`)
  - `security-probe.mjs` `--entry` and `--fake-gh`: **bare** `rel.startsWith("..")`.
    `security-probe.mjs` already imports `sandboxEnv` and `snapshotTree` from `./qa-execute-snippets.mjs`.

### Target Architecture

- **Read-back**: `checkDocument` gains an additive `resolved: [...]` field. It holds every link's
  repository-relative resolved path, from the same `path.posix.normalize(join(dirname, target))` its
  loop already computes, so there is still one resolution rule. After the second `readLinks()`, the
  read-back requires that `resolved` contains the `--path` gate and the `--path` report, both made
  repository-relative. Each missing
  link is a named problem ("the document does not link this cycle's gate {basename} — the Step 12
  edit did not land") and halts with exit 1. The run itself completed, so this is a HALT, not exit 2.
- **One cycle-file definition**: each site above calls `bash <skill>/references/qa-cycle.sh "$DIR"`
  for the cycle, or `… --path gate|qa` for the file, from the repository root, checked by `rc`. The
  rules are the ones `qa-cycle.sh` already enforces: rc 1 is the helper's refusal, anything else is
  "not runnable". The existing guard in `tests/qa-cycle.test.js` is **extended, not duplicated**. Its
  file list gains the three shared step docs, and its pattern also catches a `find … gate` selection
  that is not a count. Its fixtures carry each old shape as a positive case, so it cannot pass
  vacuously. `qa-cycle.sh`'s header then says "the only definition".
- **Ambiguity is a stop, not an empty file.** Two files can claim the current cycle. Cycle mode then
  exits 0 and `--path gate` exits 1 (run: `task.9.gate.2.x.yml` + `task.9.gate.2.y.yml` → cycle `2`,
  `--path` refuses). Each block therefore reads the cycle first. When the cycle is non-empty and
  `--path` refuses, the block stops with the helper's stderr line. It never proceeds with an empty
  `LATEST_GATE`, which would take the first-review branch, or an empty `THIS_GATE`, which would post
  `BLOCKING_COUNT=0`. Only an empty cycle (rc 1 from cycle mode) means "no gate yet".
- **The helper must be bundled where it is called.** `qa-cycle.sh` is bundled today into `qa-task`,
  `qa-story` and `qa-fix` only. `develop-pipeline-step-5-6-qa-loop.md` ships in `develop-story` and
  `develop-task`; the resume contract and `develop-pipeline-step-7-finalise.md` ship in nine skills. Each
  call is addressed as `.agents/skills/{develop-story|develop-task|develop-bug}/references/qa-cycle.sh`
  (`{develop-story|develop-task}` in the step-5-6 doc) — the placeholder these docs already use for
  every helper they call — and the bundler follows that invocation path into each named skill that
  bundles the doc, so `develop-story`, `develop-task` and `develop-bug` gain a copy. No
  `shared/resources/qa-cycle.sh` literal is added to the step docs. `grant-qa-cycles.sh`, which the
  resume contract's re-entry calls, now takes its base cycle from the same helper (QA cycle 1,
  CR-1) and declares it as a `bundle-dependency`, so every skill that bundles the grant script —
  `review-pr`/`review-story`/`review-task` included — carries it too. The existing "helper is bundled into every skill whose prose calls it" test widens to every
  bundled copy of the three docs whose invocation names its own skill. The one non-blocking site,
  Step 7's post-finalise completion comment, reports the refusal and renders `N/A` rather than
  dropping the comment.

### Same-class mechanism inventory (obs #103)

- `qa-cycle.sh` is the one cycle/file helper. This task **extends its reach** by moving sites onto
  it. It does not add a mode. `--path` exists since task.149.
- `tests/qa-cycle.test.js`'s inline-derivation guard is the one guard for this class, and it is
  **extended**. A second test file for the same rule would be a second definition of "what counts as
  a derivation".
- **`finalise` SKILL.md's `newest_numbered … gate -name "${STEM}.gate.*.yml"` sits beside
  `qa-cycle.sh`, deliberately.** It is keyed on the work item's own stem so that a co-located bug's
  gate is excluded, which `qa-cycle.sh`'s `*.gate.*.yml` glob cannot do (task.149 gate 8, CR-2,
  out of scope here). The guard's file list does not include `skills/finalise/SKILL.md`, and the
  `qa-cycle.sh` header names this one exception.
- `isWithin` gains **no new implementation**. The ESM export stays in `qa-execute-snippets.mjs`, the
  CJS export moves into `doc-links.js`, and the private copy in `qa-read-back.js` and the inline copy
  in `linkState` are deleted.

---

## 4. Scope

### In Scope

✅ `qa-read-back.js`: require links to this cycle's `--path` gate and report; tests for task and story shapes
✅ The six current-cycle gate lookups named in § 3 move onto `qa-cycle.sh` (bundled copies regenerated)
✅ Extend the `tests/qa-cycle.test.js` inline-derivation guard (files and pattern), with non-vacuity fixtures
✅ `qa-cycle.sh` header: "the only definition", naming the finalise stem-keyed exception
✅ `security-probe.mjs` `--entry` / `--fake-gh` use `isWithin`, keeping the `entry === root` refusal
✅ `doc-links.js` exports `isWithin`; `qa-read-back.js` and `linkState` use it; parity test ESM ↔ CJS
✅ CHANGELOG `[Unreleased]` entry

### Out of Scope

❌ `PRIOR_GATES` counts (`qa-task` Step 3b, `qa-story` Phase 1.6) — they **count** gates to detect cycle 2, they do not select one
❌ A stem/prefix filter for `qa-cycle.sh --path` (task.149 gate 8 CR-2) — a co-located bug's gate in the parent directory still counts; separate follow-up
❌ `finalise`'s `newest_numbered` gate lookup — deliberately stem-keyed (see § 3 inventory)
❌ obs #196 (5c waves LOW doc findings to Step 7) — a pipeline-routing change, separate task

---

## 5. Breaking Changes

**None — API stable.**

- The `qa-read-back.js` exit contract is unchanged (0 clean, 1 HALT, 2 could not look). A document
  that does not link this cycle's gate or report goes from exit 0 to exit 1. That is the intended fix,
  and every `/qa-task` or `/qa-story` run already writes those links in Step 12.
- The `security-probe.mjs` CLI is unchanged. An `..name` entry that was refused is now accepted, and
  `entry === root` is still refused.
- `doc-links.js` gains an export; existing exports are unchanged.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.158.plan.cycle-file-and-containment-definitions.md](task.158.plan.cycle-file-and-containment-definitions.md)

### Phase 1: Read-back requires this cycle's links (Risk: Medium)

**Files**: `shared/resources/doc-links.js`, `shared/resources/qa-read-back.js`,
`shared/resources/tests/doc-links.test.mjs`, `shared/resources/tests/qa-read-back.test.mjs`

- [x] `doc-links.js` `checkDocument` returns an additive `resolved[]`: every link's resolved path, fragment stripped, computed by the existing loop; a doc-links test pins it (resolved and broken links both listed)
- [x] After the second `readLinks()`, check that the resolved link set contains the `--path` gate and the `--path` report; each absent link is a named problem, exit 1
- [x] Test: cycle-2 fixture (gate.1/qa.1 linked and committed, gate.2/qa.2 on disk, document not re-edited) HALTs naming both, for the task and the story shape
- [x] Test: the same fixture with the document re-linked to gate.2/qa.2 reads clean
- [x] Mutation: remove the check → the cycle-2 test goes red
- [x] qa-task Step 12b and qa-story item 3e text names the new check (one clause each; no restated list)

### Phase 2: One definition for the cycle's gate file (Risk: Medium)

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-resume-contract.md`,
`shared/resources/develop-pipeline-step-7-finalise.md`, `shared/resources/qa-cycle.sh` (header), `tests/qa-cycle.test.js`

- [x] Each site in § 3's list calls `qa-cycle.sh` (cycle) or `qa-cycle.sh --path gate` (file), rc-checked, repository-root addressed
- [x] Resume contract: `QA_CYCLE` from `qa-cycle.sh`, rc 1 → 0 (no gate yet), other rc → HALT
- [x] Every `--path gate` site: cycle non-empty + `--path` rc 1 (ambiguous) → stop with the helper's message; never an empty file (review I-2)
- [x] The step docs call the helper at `.agents/skills/{develop-story|develop-task|develop-bug}/references/qa-cycle.sh`, which the bundler follows into those skills; the bundled-helper test covers every bundled copy of the three docs (review I-1)
- [x] `step-5-6` § Finding the Latest Gate File: note that the stem-keyed (`story.{epic}.{story}.gate.*`) form becomes the directory-wide helper; the stem filter is the recorded follow-up (review O-1)
- [x] Extend the `tests/qa-cycle.test.js` guard to the three shared step docs and to `find … gate` selections; fixtures prove each old shape is caught
- [x] `qa-cycle.sh` header: "the only definition", naming finalise's stem-keyed lookup as the one deliberate exception
- [x] Executed-prose check: each changed block runs under bash and zsh against a fixture holding a zero-padded gate (qa-task / qa-story Step 4b rules apply to this change set)
- [x] `npm run bundle`

### Phase 3: One containment predicate per module system (Risk: Low)

**Files**: `shared/resources/security-probe.mjs`, `shared/resources/doc-links.js`, `shared/resources/qa-read-back.js`,
`shared/resources/tests/security-probe.test.mjs`, `shared/resources/tests/doc-links.test.mjs`

- [x] `security-probe.mjs` imports `isWithin` from `./qa-execute-snippets.mjs`; `--entry` and `--fake-gh` use `x === root || !isWithin(root, x)`
- [x] Test: an `--entry` under a `..name` directory inside the repo is probed; `entry === root` and `../x` are still refused
- [x] `doc-links.js` exports `isWithin`; `linkState` and `qa-read-back.js` use it; the private copy is deleted
- [x] Parity test: one case table through the ESM and the CJS `isWithin`, deep-equal
- [x] Mutation: revert either `security-probe` site to `startsWith("..")` → its test goes red

### Phase 4: Docs and bundle (Risk: Low)

**Files**: `CHANGELOG.md`, bundled `references/` (generated)

- [x] CHANGELOG `[Unreleased]` cites `(task 158)`
- [x] `npm run bundle`; `npm run ci` clean

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. `shared/resources/qa-read-back.js` — this cycle's links required; `isWithin` from `doc-links.js`
2. `shared/resources/doc-links.js` — `checkDocument` returns `resolved[]`; export `isWithin`; `linkState` uses it
3. `shared/resources/security-probe.mjs` — `--entry` / `--fake-gh` containment via `isWithin`
4. `shared/resources/qa-cycle.sh` — header wording only
5. `skills/qa-task/SKILL.md` — Phase 0 `LATEST_GATE`, Step 13b `THIS_GATE`, Step 12b clause
6. `skills/qa-story/SKILL.md` — the same three sites
7. `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — § Finding the Latest Gate File
8. `shared/resources/develop-pipeline-resume-contract.md` — § QA Cycle Count Reconstruction
9. `shared/resources/develop-pipeline-step-7-finalise.md` — completion-comment `FINAL_GATE`

### Files to Modify (Tests)

10. `shared/resources/tests/qa-read-back.test.mjs`
11. `tests/qa-cycle.test.js` — extended guard
12. `shared/resources/tests/security-probe.test.mjs`
13. `shared/resources/tests/doc-links.test.mjs` — `resolved[]`; parity case table
14a. `evals/shared/tests/optional-file-lookups.test.mjs` — the rows that execute the moved lookups, re-pointed at the `qa-cycle.sh` blocks (found by the fast gate: the rows slice the live text)

### Files to Modify (Documentation / Generated)

14. `CHANGELOG.md`
15. `skills/*/references/*` — regenerated by `npm run bundle`, never hand-edited. New: `qa-cycle.sh` in `develop-story`, `develop-task` and `develop-bug` (review I-1) and, through `grant-qa-cycles.sh`'s `bundle-dependency`, in `review-pr`, `review-story` and `review-task` (QA cycle 1, CR-1)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `qa-read-back.js` (cycle-2 stale-link HALT, re-linked clean, task and story shapes),
  `isWithin` parity (ESM ↔ CJS), `security-probe` containment (`..name` accepted, root and `../x` refused)
- **Command**: `node --test shared/resources/tests/qa-read-back.test.mjs shared/resources/tests/doc-links.test.mjs shared/resources/tests/security-probe.test.mjs tests/qa-cycle.test.js`
- **Mutation**: every new assertion is proved red on revert (`references/mutation-proving.md`), recorded in the implementation report

### Integration Tests

- **Executed prose**: each changed fenced block is run under bash and zsh against a fixture holding
  `task.9.gate.02.x.yml` with a HIGH entry. Step 13b's `BLOCKING_COUNT` must read 1, not 0. The
  resume-contract block must reconstruct 2.
- **Guard**: the extended `tests/qa-cycle.test.js` guard reports zero hits on the shipped files and
  a hit for each old shape in its fixtures.

### Performance Tests

Not applicable. The read-back gains one set lookup, and each changed block trades a `find` for one
`bash qa-cycle.sh` call.

### Consumer Tests

- **Scope**: `/qa-task` and `/qa-story` runs inside `/develop-task` and `/develop-story`, and the
  develop-pipeline resume path.
- **Risk areas**: Step 13b's tracker comment (`BLOCKING_COUNT`), and resume after a loop-limit halt
  (`QA_CYCLE` reconstruction).

---

## 9. Success Criteria

### Functional

- [x] A cycle-2 document that still links `gate.1` / `qa.1` makes `qa-read-back.js` exit 1, naming both missing links (task and story shapes). The same document re-linked to `gate.2` / `qa.2` exits 0 (Phase 1 adds the branch)
- [x] With `task.9.gate.02.x.yml` carrying one HIGH entry, qa-task Step 13b's `THIS_GATE` names that file and `BLOCKING_COUNT` reads 1. The same holds for qa-story
- [x] The resume-contract block reconstructs `QA_CYCLE=2` from a zero-padded `gate.02`, and reconstructs 0 from an empty directory
- [x] `security-probe.mjs --entry` accepts an entry under a `..name` directory inside the repository, and still refuses `entry === root`, `../x` and an absolute path outside it

### Performance

- [x] The `tests/qa-cycle.test.js` guard and the parity test each run in under one second, with file reads only
- [x] No new process spawn per QA cycle beyond one `qa-cycle.sh` call per changed block

### Code Quality

- [x] The extended guard reports zero hits on the shipped files and at least one hit per old shape in its fixtures
- [x] One ESM `isWithin` and one CJS `isWithin`, held deep-equal by the parity test over one case table. The copies in `qa-read-back.js` and `linkState` are removed
- [x] Every new assertion is mutation-proved, with the runs recorded in the implementation report
- [ ] `npm run ci` is clean. That covers ci:fast, eval:all, validate:all, check:generated, bundle:check and lint:shell
- [x] `npm run validate -- skills/qa-task/` and `npm run validate -- skills/qa-story/` are clean

### Migration

- [x] CHANGELOG `[Unreleased]` cites `(task 158)`
- [x] The `qa-cycle.sh` header says "the only definition" and names finalise's stem-keyed exception

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The read-back's link check rejects a legitimate document shape.**
   - **Risk**: some document links the gate or report through a path the resolver normalises
     differently, such as a `./` prefix or a different directory spelling, so the membership test misses it.
   - **Probability**: Low. **Impact**: Medium, because every QA cycle would halt.
   - **Mitigation**: compare resolved, repository-relative paths, the same ones `checkDocument`
     returns. Add a test for `./task.9.gate.2.x.yml` and one for a bare `task.9.gate.2.x.yml`.
   - **Rollback**: revert Phase 1 alone. Phases 2 and 3 are independent of it.
2. **Changed prose blocks break under zsh.**
   - **Risk**: a `$(bash …/qa-cycle.sh …)` with rc capture is re-typed inconsistently across the six
     sites. This is the BUG-4/BUG-6 shape from task.121.
   - **Probability**: Medium. **Impact**: Medium.
   - **Mitigation**: copy the exact rc-checked form Step 13 already uses, and run every changed
     block under bash and zsh (Phase 2).

### Low Risk Areas

1. **The `security-probe` root-equality semantics.** `isWithin(root, root)` is true, so a naïve
   substitution would accept `entry === root`. The target form and its test are stated in § 3 and
   Phase 3.
2. **Bundle drift.** The shared sources change, so a skipped `npm run bundle` fails `bundle:check`
   in CI. Phase 4 runs it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: every `/qa-task` or `/qa-story` run HALTs at Step 12b on a document that does link
  this cycle's gate and report; or `develop-*` resume reconstructs the wrong cycle.
- **Steps**: `git revert` the merge commit. The three phases touch disjoint mechanisms, so reverting
  one phase's commits restores the prior behaviour of that mechanism only.
- **Validation**: `node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-cycle.test.js` is green on the reverted tree.

### Partial Rollback (1-2 hours)

- **When to use**: only one mechanism misbehaves.
- **Steps**: revert that phase's commits:
  - Phase 1 is the read-back link check;
  - Phase 2 is the cycle-file lookups and the guard;
  - Phase 3 is containment.

### Forward Fix (< 4 hours)

- **When to use**: a missed site or document shape that one test can reproduce.
- **Approach**: add the case to the relevant fixture table, then fix the site.

### Rollback Triggers

- **Critical**:
  - Step 12b HALTs on a correctly edited document.
  - A security-probe `--entry` inside the repository is refused, or one outside it is accepted.
- **Non-critical**: a guard false positive on a prose example. Fix it forward by narrowing the
  pattern and adding a fixture.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-29
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.158.qa.1.cycle-file-and-containment-definitions.md](./task.158.qa.1.cycle-file-and-containment-definitions.md)
- **Gate File**: [task.158.gate.1.cycle-file-and-containment-definitions.yml](./task.158.gate.1.cycle-file-and-containment-definitions.yml)

### Test Coverage Summary
- **Tests Executed**: 289
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
- CR-1 (medium): `grant-qa-cycles.sh` keeps a second cycle definition and crashes on a zero-padded gate — [bug report](./task.158.bug.1.grant-qa-cycles-second-cycle-definition.md)
- Advisory: CR-2 (resume rc 1 conflation), CR-3 (cycle-mode prose), CR-4 (fake-gh fixture at repo root)

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-26 | 1.0     | Initial draft — cut from task.149's carried follow-ups (5c CR-1; gate 8 and gate 7 `recommendations.future`) | create-task |
| 2026-09-29 | 1.1     | Review passed (8/10) — added the ambiguous-cycle stop and the `qa-cycle.sh` bundling requirement for the step docs | review-task |
| 2026-09-29 |         | Status → ready-for-development | review-task |
| 2026-09-29 |         | Implemented — 16 files (+3 bundled `qa-cycle.sh` copies), 12 new tests; status → ready-for-review | develop |
| 2026-09-29 |         | QA gate CONCERNS (90/100) — 1 medium finding (CR-1), 3 low | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Read-back requires this cycle's links
- [x] Link-membership check
- [x] Cycle-2 tests (task, story), re-linked clean test
- [x] Mutation proof

### Phase 2: One definition for the cycle's gate file
- [x] Six sites moved onto `qa-cycle.sh`
- [x] Guard extended, non-vacuity fixtures
- [x] Header wording; executed-prose runs under bash and zsh

### Phase 3: One containment predicate per module system
- [x] `security-probe` sites
- [x] `doc-links` export; copies removed
- [x] Parity test; mutation proofs

### Phase 4: Docs and bundle
- [x] CHANGELOG; bundle; `npm run ci`

---

## References

- **Source task**: `docs/tasks/task.149.qa-evidence-integrity/`. The inputs are
  `task.149.pr-review.1.qa-evidence-integrity.md` (CR-1, CR-2),
  `task.149.gate.7.qa-evidence-integrity.yml` and `task.149.gate.8.qa-evidence-integrity.yml`
  (`recommendations.future`), and `sprint-review-summary.md` (Suggested Follow-Up Stories).
- **Related skills**: `.agents/skills/qa-task/`, `.agents/skills/qa-story/`, `.agents/skills/develop-task/`
- **Engines**: `shared/resources/qa-read-back.js`, `shared/resources/qa-cycle.sh`, `shared/resources/security-probe.mjs`, `shared/resources/doc-links.js`

---

## Notes

### Important Reminders

- `security-probe` refuses `entry === root` by design. `isWithin` alone does not.
- Extend the existing guard in `tests/qa-cycle.test.js`; do not add a second guard file.
- Every changed fenced block is runnable prose, so the qa-task Step 4b / qa-story Phase 1.7 execution
  rules apply to this change set.

### Implementation Summary

**Completed**: 2026-09-29 (develop-task pipeline, Step 3, inline from the plan).

**Approach.** Phase 1 added `resolved[]` to `checkDocument` (collected in the loop that already
computed it) and a membership check after the read-back's second link pass. Phase 2 moved six gate
lookups onto `qa-cycle.sh` (cycle first, then `--path gate`; a refusal with a cycle present stops
the block, except Step 7's non-blocking comment, which renders `N/A`) and extended the guard with a
`GATE_SELECTION` pattern over the QA skills and a `STEP_DOCS` list. The helper reaches
`develop-story`, `develop-task` and `develop-bug` through the `{develop-…}` invocation path the
bundler already follows. After QA cycle 1 (CR-1) `grant-qa-cycles.sh` asks the same helper and
declares it as a `bundle-dependency`, so the `review-*` skills that bundle the grant script carry it
too; a shell-helper guard now fails on a gate-number derivation in any other `.sh`. Phase 3 moved `security-probe.mjs` onto the ESM `isWithin` with an explicit
`=== root` refusal, and made `doc-links.js` the one CommonJS definition.

**Testing results.** 12 new tests: 6 in `qa-read-back.test.mjs`, 2 in `doc-links.test.mjs`, 2 in
`security-probe.test.mjs`, 2 in `tests/qa-cycle.test.js`. The existing bundled-helper and
inline-derivation tests are extended. Eleven mutations, each reverted and each red, are recorded in
the implementation report. Every changed prose block was run under bash and zsh against
`task.9.gate.02.x.yml` with a HIGH entry: cycle 2, `BLOCKING_COUNT` 1. An ambiguous pair stops the
block, and an empty directory reads as the first review, with resume reconstructing 0.

**Deferred work.** None added. The two Known Issues below are unchanged.

### Known Issues

**Open** (non-blocking, out of scope):
- ⚠️ `qa-cycle.sh --path` counts a co-located bug's gate in the parent directory (task.149 gate 8 CR-2)
- ⚠️ obs #196: 5c routes LOW documentation findings to Step 7, where finalise's Docs section blocks on the same items
