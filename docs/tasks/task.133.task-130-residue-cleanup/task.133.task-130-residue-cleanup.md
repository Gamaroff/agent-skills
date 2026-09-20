---
id: task.133
title: "[Task 133] Residue of task.130's seven QA cycles: eleven advisory findings that never gated, grouped by file — a vacuous test scenario, three stale rule mirrors, two silent skips, one unguarded append-only table"
type: task
description: "Close the advisory residue task.130 carried out of its QA loop and Step 5c review: make the no-overwrite lock scenario falsifiable, state the --accept-legacy stamp where the --restore contract is mirrored, replace test D's word-list regex with the exact-label floor, condition the four --restore citation clauses, give the detector prompt the legacy/provenance candidate rule, name the two silent cases in the delete block and the four lint rc=2 causes, quote the doc-directory placeholder, silence the bystander-legacy advice on a successful restore, make the detector's candidate listing glob-safe under zsh, and give change-log.js a shrink guard."
tags: [pipeline, resume, tests, enumeration, change-log]
category: refactoring
status: planned
priority: Medium
created: 2026-09-20
updated: 2026-09-20
assignee:
estimated_effort_hours: 8
github_issue: 442
risk_level: low
---

# Technical Task: Residue of task.130's seven QA cycles — eleven advisory findings, grouped by file

**Status:** Planned
**GitHub Issue**: [#442](https://github.com/Gamaroff/agent-skills/issues/442)

---

## 1. Overview

Task.130 ([#437](https://github.com/Gamaroff/agent-skills/issues/437), PR #441, merged `a5466374`) ran seven QA cycles and a two-pass Step 5c review. Every HIGH and MEDIUM was fixed inside the loop; what it left behind is eleven advisory items — recorded on the task under § Notes › Deferred Work, in gates 5–7 `code_review.advisory` / `recommendations.future`, and in `task.130.pr-review.1` CR-2/CR-3 — none of which gated, and each of which is small enough that a cycle to fix it alone would have cost more than it bought. This task closes them together, **grouped by the file they touch** so each group ships with one executed test or mutation proof.

**Scope**: `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`), `grant-qa-cycles.sh`, `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-step-8-commit.md`, `develop-pipeline-pause.md`, `change-log.js` (+ tests), `tests/stale-snapshot-delete.test.mjs`, the three `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock paragraphs, and the four lint `2)` call sites.

**Key deliverables**: (1) `advance-pipeline-lock.test.sh`'s "keeps its own directory" scenario goes red on an unconditional overwrite; the `--restore` contract's three prose mirrors state the stamp; the bystander-legacy advice prints only when nothing restores. (2) The contract's delete block names an unparsable snapshot, a directory-less object and an unrecognised `stale-snapshot`-prefixed label as three distinct outcomes, and quotes `{doc-directory}`. (3) The detector prompt's Step 1 carries the legacy-refusal and provenance-ranking rules `choose_candidate()` applies, and its candidate listing runs under zsh `nomatch`. (4) Test D's negative regex is replaced by the exact-label floor; the four `--restore` citation main clauses are conditional; the four lint `2)` arms cite one message. (5) `change-log.js` refuses a write whose row count would fall, and the 5c conformance lens compares row counts against the previous commit.

**Expected outcome**: the Deferred Work list on task.130 is empty of everything except what task.128 owns (the shell probe sink, obs #138); every rule this task touches has one statement and a test that reads the population, not a sample.

---

## 2. Motivation

### Current Problems

- **A test scenario that pins nothing.** `advance-pipeline-lock.test.sh` "a matched candidate keeps its own directory" seeds the candidate with the exact string it passes as `<doc-dir>`, so the intended `//` fill and an unconditional `.task_or_story_directory = $dir` both satisfy it — 91/91 stays green under the mutation (gate 7 QA-14, mutation-confirmed).
- **The `--accept-legacy` stamp is stated once, in the wrong place.** Only `develop-pipeline-hooks.md`'s troubleshooting row says the rebuilt lock is stamped; the `--restore` header contract (`advance-pipeline-lock.sh:71-85`), `develop-pipeline-pause.md:80` and `grant-qa-cycles.sh:52-54` still describe the rebuild as "halt fields and `waiting_on` stripped" (gate 7 CR-2).
- **Two silent skips in the delete block.** Pass 2's `SNAP_DIR=$(jq -r … 2>/dev/null)` reports an unparsable snapshot and a parsed object with no directory with the same `'absent'` HALT text (gate 5 CR / 5c CR-3); a `stale-snapshot`-prefixed concern that is neither the verdict nor a known skip note is skipped with no output at all (gate 5 CR-5).
- **A word-list regex standing in for a rule.** Test D's `/(starts|start with|starting with|prefix|startswith)[^\n]*stale-snapshot/i` misses "begins with" and rejects an accurate "share the prefix `stale-snapshot`" clause; the positive `exactly \`stale-snapshot: PR merged\`` match is the real floor (gate 6 CR-1).
- **A second derivation of `choose_candidate()`.** The detector prompt's Step 1 is silent on a directory-less candidate and ranks by mtime alone, so a newer legacy `last-halt.json` beside an older matched claim makes the detector recommend a step `--restore` will not restore from (gate 5 CR-3). Its candidate listing `ls -t … .pausing.*` never runs under zsh `nomatch` — pre-existing, the same class Phase 5 of task.130 fixed in step-8.
- **An append-only table with no shrink guard.** At `fdba78d9` a repair of a corrupted Change Log block dropped six rows; two QA cycles read the document without noticing, and the Step 5c conformance lens found it only by diffing against `git show 3479b14a` (obs #137).
- **Three smaller drifts**: the four `--restore` citation paragraphs put the imperative in the main clause and the who-restores rule in a parenthetical (gate 5 CR-2); `report-lint.js` exit 2 covers four causes and the `2)` arm at four call sites names one (gate 5 CR-6); `{doc-directory}` is unquoted at four substitution sites in the contract's fences while the same block quotes it in `canon` (gate 5 CR-7); `advance-pipeline-lock.sh:202` prints the full `--accept-legacy` advice for a bystander legacy snapshot even when the restore succeeds from a matched claim (5c CR-2).

### Benefits of Closing the Residue

- The `--accept-legacy` contract is stated where it is read, so the next reader of the header or the pause doc learns the recovery is needed once.
- Two distinguishable failure states stop sharing one message; a reader of a HALT knows which file is malformed.
- A shrinking Change Log becomes impossible at its single writer rather than detectable by a reviewer who happens to diff.
- The detector and `choose_candidate()` agree on which candidate wins, so the resume prompt and the restore never name different steps.
- Test D and the lock suite assert the property, not a phrasing.

---

## 3. Technical Background

### Current Architecture

- `shared/resources/advance-pipeline-lock.sh` — `choose_candidate()` ranks matched over legacy, refuses legacy without `ACCEPT_LEGACY=1`; the `--restore` rebuild jq (under the comment *"`task_or_story_directory` is stamped when the candidate carries none"*) fills the field from `$doc_dir`. The per-candidate refusal line at the `legacy-snapshot:` echo prints the `--accept-legacy` advice inside the loop, before it is known whether a matched claim will win. The header contract bullets under `#   • a candidate with NO task_or_story_directory` predate the stamp.
- `shared/resources/advance-pipeline-lock.test.sh` — the three cycle-7 scenarios after `--restore --accept-legacy: the legacy snapshot is restored and consumed`; the third seeds `"task_or_story_directory":"$R/doc"` and passes `$R/doc`.
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — bind block and delete block; Pass 2 reads `SNAP_DIR=$(jq -r '.task_or_story_directory // ""' "$p" 2>/dev/null)` and HALTs on `[ -n "$SNAP_DIR" ] && canon-equal` with the text *"(task_or_story_directory: '${SNAP_DIR:-absent}') — the detector mislabelled it"*; the selector `select((.concern // "") == "stale-snapshot: PR merged")` drops every other concern with no output.
- `shared/resources/pipeline-resume-detector-prompt.md` — the candidate listing fence `ls -t .claude/state/develop-pipeline.last-halt.json .claude/state/develop-pipeline.lock.pausing.* 2>/dev/null || true`; Step 1 item 1 *"Drop any whose `task_or_story_directory` is not the directory of the document"*; item 3 *"take the newest by mtime"*.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § 0b paragraph *"Restore the lock before anything advances it"* and the three `skills/develop-*/SKILL.md` Step 0-lock paragraphs — imperative main clause, citation in a parenthetical.
- `shared/resources/report-lint.js` `usage()` — exit 2 from `unknown argument`, `--file is required`, `--variant must be one of`, `cannot read <file>`, template load; the `2)` arm text *"the call site is wrong, not the report"* at `develop-pipeline-step-8-commit.md` and `skills/develop-{task,story,bug}/SKILL.md` (lint call sites 1/2).
- `shared/resources/change-log.js` `upsertChangeLog(text, row)` — locates `<!-- change-log-start/end -->` (migrating the legacy `jira-sync-`/`github-sync-` pairs), appends one row; it does not read the row count of the block it replaces.
- `shared/resources/tests/stale-snapshot-delete.test.mjs` test D — captures the citation sentence, asserts the negative word-list regex and the positive `exactly \`stale-snapshot: PR merged\`` match.

### Target Architecture

- **Lock script**: header bullets and the two prose mirrors gain the stamp clause; the `legacy-snapshot:` advice is emitted from the final no-candidate branch only, the per-candidate line downgraded to *"skipped: no task_or_story_directory"*; the no-overwrite scenario seeds `./doc/` (canon-equal to `$R/doc`, textually different) and asserts the lock keeps `./doc/`.
- **Contract delete block**: Pass 2 opens with `jq -e 'type == "object"' "$p" >/dev/null 2>&1 || HALT "not a JSON object"` (the step-8 arm), then the directory read; a second jq pass over `deltas_since_pause` prints *"unrecognised stale-snapshot label — kept: <concern>"* for prefix matches that are neither the verdict nor a known skip note; every `{doc-directory}` substitution is quoted.
- **Detector prompt**: Step 1 states — once, citing `advance-pipeline-lock.sh` `choose_candidate()` as the authority — that a candidate with no `task_or_story_directory` is dropped and filed as `{ "path": …, "concern": "legacy snapshot (no task_or_story_directory) — --restore --accept-legacy or delete" }`, and that a directory-matched claim outranks a legacy snapshot whatever their mtimes; the listing fence uses `find .claude/state -maxdepth 1 \( -name develop-pipeline.last-halt.json -o -name 'develop-pipeline.lock.pausing.*' \) -newer … ` or `ls -t` with `setopt +o nomatch`-free spelling (`find … -print0 | xargs -0 ls -t`).
- **Citations**: the four `--restore` paragraphs read *"run the command below **only when** resume contract § Restore the lock (both resume paths) says it runs here"*; `who-restores-single-statement.test.mjs` (ii) gains an assertion that each site's imperative is inside a conditional clause naming the section.
- **Lint `2)` arm**: one sentence in `develop-pipeline-step-8-commit.md` — *"report-lint refused its inputs — read the `report-lint:` line above; the four causes are …"* — cited by the three SKILL.md sites; `report-lint-call-sites.test.mjs` asserts the citation.
- **Test D**: the negative regex is replaced by *"the citation names the exact label and no other backticked `stale-snapshot` token that is not `stale-snapshot: PR merged` or a skip-note quotation"*.
- **`change-log.js`**: `upsertChangeLog` counts data rows inside the markers before and after; a result with fewer rows than the input throws `ChangeLogShrinkError` naming both counts, and `bumpUpdated` is unaffected. The 5c conformance prompt's consistency section gains *"the Change Log row count is ≥ the previous commit's"* with `git show HEAD~1:<doc>` as the read.

### Important Clarifications

- **Task.128 owns the shell probe sink.** Obs #138 (finalise's security probe cannot import a shell boundary) is evidence for task.128, not scope here.
- **The shrink guard is a guard, not a repair.** It refuses the write and names the counts; recovering the rows is the caller's job (as it was at 5c PC-2: `git show <prior>:<doc>`).
- **Grouping is by file, but the split test is by outcome.** Each phase leaves the tree mergeable alone; none is a prerequisite for another.

---

## 4. Scope

### In Scope

✅ `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`, `grant-qa-cycles.sh` (header prose only)
✅ `shared/resources/develop-pipeline-resume-contract.md` § Consume Output (Pass 2 arms, unrecognised-label pass, quoting)
✅ `shared/resources/pipeline-resume-detector-prompt.md` Step 1 rule + listing fence
✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-pause.md`, `develop-pipeline-step-8-commit.md`, `skills/develop-{task,story,bug}/SKILL.md` — citation clauses, lint `2)` arm
✅ `shared/resources/change-log.js` + `shared/resources/tests/change-log*.test.mjs`; `pr-conformance-prompt.md` consistency row
✅ `shared/resources/tests/stale-snapshot-delete.test.mjs` (D), `who-restores-single-statement.test.mjs`, `report-lint-call-sites.test.mjs`
✅ `npm run bundle`; CHANGELOG entry

### Out of Scope

❌ A shell-capable sink for `security-probe.mjs` — task.128
❌ Route 2c's `high-findings-seen` clause — task.134
❌ Gate `updated:` / scoping from a recorded head — task.135
❌ `change-log.js`'s heading-duplication defect — obs #104, task.127

---

## 5. Breaking Changes

### Breaking Change 1: `upsertChangeLog` throws on a shrinking block

**What Changed**: a call whose output would carry fewer data rows than its input throws `ChangeLogShrinkError` instead of writing.

**Before**: any input was rewritten; a caller that passed a corrupted block got a repaired block with whatever rows the parser kept.

**After**: the same call throws with `{ before, after }`; the caller keeps the original text and must recover the rows deliberately.

**Impact on consumers**: every skill that appends a row (`create-*`, `review-*`, `edit-*`, `qa-*`, `finalise`, the syncs, `develop`) — a throw surfaces as a failed one-liner with a named cause. No consumer passes a shrinking block on purpose.

**Migration Path**: none required for a well-formed document. For a document whose block is already corrupted (the `3479b14a` shape), run the repair by hand — `git show <good-commit>:<doc>` — before appending.

No other change is breaking: the `legacy-snapshot:` advice moves but the exit codes do not; the detector prompt's new rule matches what `--restore` already does; test D's assertion becomes stricter on a phrasing no shipped citation uses.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.133.plan.task-130-residue-cleanup.md](task.133.plan.task-130-residue-cleanup.md)

### Phase 1: Lock script — falsifiable no-overwrite scenario, stamp in the contract mirrors, quiet bystander advice

**Risk**: Low
**Files**: `advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`, `grant-qa-cycles.sh`, `develop-pipeline-pause.md`

- [ ] Seed the no-overwrite scenario's candidate with `./doc/` written from `$R`, restore with `$R/doc`, assert the lock keeps `./doc/`; mutation: unconditional assignment → red
- [ ] Header bullets (`#   • a candidate with NO task_or_story_directory …`) and `grant-qa-cycles.sh:52-54`, `develop-pipeline-pause.md:80` state: stamped with `<doc-dir>` as spelled; a present value is kept
- [ ] Move the `--accept-legacy … or delete it` advice to the final no-candidate branch; per-candidate line → `skipped: no task_or_story_directory`; scenario: matched claim + bystander legacy → exit 0 and stderr carries no `--accept-legacy` advice

### Phase 2: Contract delete block — three named outcomes, quoted placeholder

**Risk**: Low
**Files**: `develop-pipeline-resume-contract.md`, `tests/stale-snapshot-delete.test.mjs`

- [ ] Pass 2: `jq -e 'type == "object"'` first → HALT `"$p is not a JSON object"`; keep the directory HALT for a parsed object with no directory; test: unparsable snapshot → the new text, directory-less object → the old text
- [ ] Second jq pass: prefix matches that are neither the verdict nor the two skip notes print `unrecognised stale-snapshot label — kept: <concern>`; test: trailing-space label and the pre-task.130 `— PR merged; deleted` label both print and keep
- [ ] Quote `{doc-directory}` at the four substitution sites; test: a doc-directory with a space binds and deletes under both shells

### Phase 3: Detector prompt — the candidate rule once, glob-safe listing

**Risk**: Low
**Files**: `pipeline-resume-detector-prompt.md`, a new `tests/detector-candidate-rule.test.mjs`

- [ ] Step 1: drop a directory-less candidate and file it as a delta object naming `--accept-legacy`; a directory-matched claim outranks a legacy snapshot regardless of mtime; cite `choose_candidate()` as the authority
- [ ] Replace the `ls -t … .pausing.*` fence with a `find`-based listing; test: block executed under `zsh -f` with no `.pausing.*` present lists the existing `last-halt.json`
- [ ] Test: the prompt's Step 1 names both rules (marker-anchored, not phrase-matched), and `advance-pipeline-lock.sh` still carries the same two behaviours (scenario references)

### Phase 4: Citations and messages stated once — `--restore` clauses, lint `2)` arm, test D

**Risk**: Low
**Files**: step-0 doc, three SKILL.md, `develop-pipeline-step-8-commit.md`, `tests/who-restores-single-statement.test.mjs`, `tests/report-lint-call-sites.test.mjs`, `tests/stale-snapshot-delete.test.mjs`

- [ ] Four `--restore` paragraphs: imperative inside a conditional naming § Restore the lock; test (ii) asserts the conditional form at each site; mutation: main-clause imperative restored → red
- [ ] Lint `2)` arm: one sentence in step-8 naming the four causes; SKILL.md sites cite it; `report-lint-call-sites.test.mjs` asserts the citation and that step-8's sentence lists every `usage(` call's cause (read from `report-lint.js`)
- [ ] Test D: drop the word-list negative; assert no backticked `stale-snapshot` token other than the exact label or a quoted skip note; mutation: `stale-snapshot*` phrasing → red, accurate "share the prefix" clause → green

### Phase 5: `change-log.js` shrink guard + 5c row-count check

**Risk**: Medium (every appender calls it)
**Files**: `change-log.js`, `tests/change-log*.test.mjs`, `pr-conformance-prompt.md`

- [ ] `upsertChangeLog` counts rows inside the markers before/after; fewer → throw `ChangeLogShrinkError({before, after})`; equal-or-more → unchanged behaviour
- [ ] Tests: the `3479b14a` corrupted shape (sections spliced inside the markers) throws rather than dropping rows; a normal append passes; the legacy-marker migration passes; mutation: guard removed → the corrupted-shape test goes green-by-loss
- [ ] `pr-conformance-prompt.md` § D consistency: *"Change Log row count ≥ the previous commit's copy"* with the `git show HEAD~1:<doc>` read

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/advance-pipeline-lock.sh` — advice placement; header contract
2. ✅ `shared/resources/grant-qa-cycles.sh` — header prose
3. ✅ `shared/resources/develop-pipeline-resume-contract.md` — Pass 2 arms, unrecognised-label pass, quoting
4. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — Step 1 rule, listing fence
5. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — conditional clause
6. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — lint `2)` sentence
7. ✅ `shared/resources/develop-pipeline-pause.md` — stamp clause
8. ✅ `shared/resources/change-log.js` — shrink guard
9. ✅ `shared/resources/pr-conformance-prompt.md` — row-count consistency check
10. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` — conditional clause; lint arm citation

### Files to Modify (Tests)

11. ✅ `shared/resources/advance-pipeline-lock.test.sh` — falsifiable no-overwrite; quiet-advice scenario
12. ✅ `shared/resources/tests/stale-snapshot-delete.test.mjs` — three-outcome Pass 2; unrecognised label; quoting; test D
13. ✅ `shared/resources/tests/who-restores-single-statement.test.mjs` — conditional-clause assertion
14. ✅ `shared/resources/tests/report-lint-call-sites.test.mjs` — one-message citation; cause list vs `usage(` calls
15. ✅ `shared/resources/tests/change-log*.test.mjs` — shrink guard
16. 🆕 `shared/resources/tests/detector-candidate-rule.test.mjs` — Step 1 rule + zsh listing

### Files to Modify (Documentation)

17. ✅ `CHANGELOG.md` — [Unreleased] entry (the shrink guard is Breaking)
18. ✅ `skills/*/references/` — regenerated by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: every phase's assertion executed under `bash --noprofile --norc` and `zsh -f` where the artefact is shell or a fenced block; node tests for `change-log.js` and the prose readers.
- **Mutation proofs**: one per phase, named in the plan — unconditional overwrite; advice moved back inside the loop; `type == "object"` check dropped; unrecognised-label pass dropped; word-list regex restored; conditional clause reverted; shrink guard removed.
- **Command**: `npm run ci:fast`; `bash shared/resources/advance-pipeline-lock.test.sh`; `bash shared/resources/grant-qa-cycles.test.sh`.

### Integration Tests

- `npm run eval:develop-task` — fixtures 16/17 unchanged in outcome (the delete block's happy path and the HALT are not touched by the three-outcome split).

### Contract Tests

- `who-restores-single-statement`, `report-lint-call-sites`, `stale-snapshot-delete` D — each reads the population (all citing sites), not a sample.
- `bundle:check` 0 problems; `lint:shell` clean.

### Performance Tests

Not applicable — one extra `jq -e` per stale delta.

### Consumer Tests

- Every appender of the Change Log (grep `upsertChangeLog(` across `skills/*/SKILL.md` one-liners and `shared/resources/*.js`) still succeeds on a well-formed document — the existing per-skill suites cover it; the throw is exercised only by the corrupted-shape fixture.

---

## 9. Success Criteria

### Functional

- [ ] The no-overwrite scenario is red under an unconditional `.task_or_story_directory = $dir`
- [ ] A matched claim beside a bystander legacy snapshot restores with exit 0 and no `--accept-legacy` advice on stderr; a legacy-only candidate set still prints it
- [ ] An unparsable snapshot, a directory-less object and an unrecognised `stale-snapshot`-prefixed label each produce their own message; nothing is deleted in any of the three
- [ ] The detector prompt's Step 1 states the legacy-refusal and provenance rules; its listing lists an existing `last-halt.json` under `zsh -f` with no `.pausing.*` present
- [ ] `upsertChangeLog` throws on the `3479b14a` shape and passes on every existing fixture

### Performance

- [ ] Resume cost unchanged beyond one `jq -e` per stale delta

### Code Quality

- [ ] `ci:fast`, `eval:develop-task`, both shell suites, `bundle:check`, `lint:shell`, Prettier green
- [ ] Every phase's mutation proof recorded in the implementation report

### Migration

- [ ] CHANGELOG [Unreleased] names the shrink guard as Breaking with the by-hand recovery
- [ ] Task.130's Deferred Work list is annotated: each item → this task, task.134, task.135 or task.128

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The shrink guard trips a legitimate caller**
   - **Risk**: a document whose block is already malformed in a way the parser reads as "fewer rows" (a row wrapped by Prettier, a nested table) throws on every append.
   - **Probability**: Low · **Impact**: Medium (one skill's one-liner fails loudly)
   - **Mitigation**: count rows with the same reader `upsertChangeLog` uses to rewrite them, so the two agree by construction; run the guard over every tracked document's block in a corpus test before shipping.
   - **Rollback**: the throw is one `if`; removing it restores the prior behaviour.

### Low Risk Areas

1. **Detector prompt wording drifts from `choose_candidate()` again** — the new test anchors the prompt's rule on a marker and the script's behaviour on named scenarios; it fails when either moves alone.
2. **Test D's stricter assertion rejects a future accurate citation** — the rule is "no backticked `stale-snapshot` token other than the exact label or a quoted skip note"; the plan lists the two accepted forms.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a shipped skill's Change Log append throws on a well-formed document; the delete block HALTs on a valid snapshot.
- **Steps**: revert the phase's commit (each phase is one commit); `npm run bundle`; push.
- **Validation**: the failing append succeeds; `ci:fast` green.

### Partial Rollback (1-2 hours)

- **When to use**: one phase regresses, the others are sound.
- **Steps**: revert that phase only — phases share no file except the contract (Phases 2 and 4 touch different sections) and the SKILL.md files (Phase 4 only).

### Forward Fix (< 4 hours)

- **When to use**: a message text or a test assertion is wrong but nothing is unsafe.
- **Approach**: fix in place with the mutation proof re-run.

### Rollback Triggers

- **Critical**: any consumer's Change Log append fails on a document that was well-formed before this task.
- **Non-critical**: a HALT message wording; a test assertion tighter than intended.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — task.130 Deferred Work, gates 5–7 advisories, pr-review.1 CR-2/CR-3, obs #137 | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: lock script
- [ ] Phase 2: contract delete block
- [ ] Phase 3: detector prompt
- [ ] Phase 4: citations and messages
- [ ] Phase 5: change-log shrink guard
- [ ] QA: `task.133.qa.[N].task-130-residue-cleanup.md`
- [ ] Gate: `task.133.gate.[N].task-130-residue-cleanup.yml`

## References

- `docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md` § Notes › Deferred Work
- `task.130.gate.5.…yml`, `task.130.gate.6.…yml`, `task.130.gate.7.…yml` — `code_review.advisory`, `recommendations.future`
- `task.130.pr-review.1.…md` — CR-2, CR-3, PC-2
- Observations #136–#139; #104 (change-log heading), #121/#138 → task.128
- `docs/reference/anti-patterns.md` — enumeration class

## Notes

- QA artifacts land beside this file: `task.133.qa.[N].*.md`, `task.133.bug.[N].*.md`, `task.133.gate.[N].*.yml`.
- Independent of tasks 134 and 135; shares `develop-pipeline-resume-contract.md` with neither (134 touches `qa-diminishing-returns.js` and the step-5-6 file; 135 touches the qa-* gate writers and `qa-re-review-scope.md`).
