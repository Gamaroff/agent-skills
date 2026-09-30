---
id: task.133
title: "[Task 133] Residue of task.130's seven QA cycles: eleven advisory findings that never gated, grouped by file — a vacuous test scenario, three stale rule mirrors, two silent skips, one unguarded append-only table"
type: task
description: "Close the advisory residue task.130 carried out of its QA loop and Step 5c review: make the no-overwrite lock scenario falsifiable, state the --accept-legacy stamp where the --restore contract is mirrored, replace test D's word-list regex with the exact-label floor, condition the five --restore citation clauses, give the detector prompt the legacy/provenance candidate rule, name the two silent cases in the delete block and every lint rc=2 cause, quote the doc-directory placeholder, silence the bystander-legacy advice on a successful restore, pin the detector's already-find-based candidate listing under zsh, and give change-log.js a cross-revision append-only check."
tags: [pipeline, resume, tests, enumeration, change-log]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-09-20
updated: 2026-09-30
assignee:
estimated_effort_hours: 8
github_issue: 442
risk_level: low
---

# Technical Task: Residue of task.130's seven QA cycles — eleven advisory findings, grouped by file

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.133.review.1.task-130-residue-cleanup.md` implemented 2026-09-30
**GitHub Issue**: [#442](https://github.com/Gamaroff/agent-skills/issues/442)

---

## 1. Overview

Task.130 ([#437](https://github.com/Gamaroff/agent-skills/issues/437), PR #441, merged `a5466374`) ran seven QA cycles and a two-pass Step 5c review. Every HIGH and MEDIUM was fixed inside the loop; what it left behind is eleven advisory items — recorded on the task under § Notes › Deferred Work, in gates 5–7 `code_review.advisory` / `recommendations.future`, and in `task.130.pr-review.1` CR-2/CR-3 — none of which gated, and each of which is small enough that a cycle to fix it alone would have cost more than it bought. This task closes them together, **grouped by the file they touch** so each group ships with one executed test or mutation proof.

**Scope**: `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`), `grant-qa-cycles.sh`, `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-step-8-commit.md`, `develop-pipeline-pause.md`, `change-log.js` (+ tests), `tests/stale-snapshot-delete.test.mjs`, `pr-conformance-prompt.md`, the three `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock paragraphs, and the seven lint `2)` arms.

**Key deliverables**: (1) `advance-pipeline-lock.test.sh`'s "keeps its own directory" scenario goes red on an unconditional overwrite; the `--restore` contract's three prose mirrors state the stamp, and the header bullet that still says an absent directory "matches" is corrected; the bystander-legacy advice prints only when nothing restores. (2) The contract's delete block names an unparsable snapshot, a directory-less object and an unrecognised `stale-snapshot`-prefixed label as three distinct outcomes, and quotes `{doc-directory}`. (3) The detector prompt's Step 1 carries the legacy-refusal and provenance-ranking rules `choose_candidate()` applies; a test pins its (already `find`-based) candidate listing under zsh `nomatch`. (4) Test D's negative regex is replaced by the exact-label floor; the five `--restore` citation sites' main clauses are conditional; every lint `2)` arm names or cites one message. (5) `change-log.js` gains a cross-revision append-only check (`rowsDropped` + `--check-append-only --against <rev>`) that reports the rows a commit removed from a Change Log, and the 5c conformance lens runs it against the previous commit.

**Expected outcome**: the Deferred Work list on task.130 is empty of everything except what task.128 owns (the shell probe sink, obs #138); every rule this task touches has one statement and a test that reads the population, not a sample.

---

## 2. Motivation

### Current Problems

- **A test scenario that pins nothing.** `advance-pipeline-lock.test.sh` "a matched candidate keeps its own directory" seeds the candidate with the exact string it passes as `<doc-dir>`, so the intended `//` fill and an unconditional `.task_or_story_directory = $dir` both satisfy it — 91/91 stays green under the mutation (gate 7 QA-14, mutation-confirmed).
- **The `--accept-legacy` stamp is stated once, in the wrong place.** Only `develop-pipeline-hooks.md`'s troubleshooting row says the rebuilt lock is stamped; the `--restore` header contract (`advance-pipeline-lock.sh:70-87`), `develop-pipeline-pause.md:80` and `grant-qa-cycles.sh:52-54` still describe the rebuild as "halt fields and `waiting_on` stripped" (gate 7 CR-2). Worse, the header's own first bullet (`advance-pipeline-lock.sh:70-72`) still says *"an ABSENT directory is the pre-task.123 shape and matches"* — contradicting the refusal bullet fourteen lines below it and `choose_candidate()` itself (review 1).
- **Two silent skips in the delete block.** Pass 2's `SNAP_DIR=$(jq -r … 2>/dev/null)` reports an unparsable snapshot and a parsed object with no directory with the same `'absent'` HALT text (gate 5 CR / 5c CR-3); a `stale-snapshot`-prefixed concern that is neither the verdict nor a known skip note is skipped with no output at all (gate 5 CR-5).
- **A word-list regex standing in for a rule.** Test D's `/(starts|start with|starting with|prefix|startswith)[^\n]*stale-snapshot/i` misses "begins with" and rejects an accurate "share the prefix `stale-snapshot`" clause; the positive `exactly \`stale-snapshot: PR merged\`` match is the real floor (gate 6 CR-1).
- **A second derivation of `choose_candidate()`.** The detector prompt's Step 1 is silent on a directory-less candidate and ranks by mtime alone, so a newer legacy `last-halt.json` beside an older matched claim makes the detector recommend a step `--restore` will not restore from (gate 5 CR-3). (Its candidate listing was the `ls -t … .pausing.*` glob that never ran under zsh `nomatch`; task.137 — `12def84e` — already replaced it with `find … -exec ls -t {} +`, verified under `zsh -f` in review 1. What is left is a test that pins it.)
- **An append-only table with no append-only check.** At `fdba78d9` a hand repair of a corrupted Change Log block dropped six rows (`git show fdba78d9 -- <task.130 doc> | grep -c '^-| 2026'` → 6); two QA cycles read the document without noticing, and the Step 5c conformance lens found it only by diffing against `git show 3479b14a` (obs #137). **The loss was not made by `upsertChangeLog`**: run on the pre-repair shape (`git show fdba78d9~1:<doc>`), both the current `change-log.js` and the one at `fdba78d9` keep all six rows and append a seventh (review 1, executed). A guard inside the writer would never have fired; the defect lives between two commits, so the check has to compare two commits.
- **Three smaller drifts**: the five `--restore` citation sites (`who-restores-single-statement.test.mjs` `sites()`: the contract's *"Restoring the lock — on either resume path"* paragraph, step-0 § 0b, and the three SKILL.md Step 0-lock paragraphs) put the imperative in the main clause and the who-restores rule in a parenthetical (gate 5 CR-2); `report-lint.js` exit 2 covers six `usage(` causes (a flag missing its value, unknown argument, `--file` missing, bad `--variant`, unreadable file, template load) and the `2)` arm at every lint call site names one (gate 5 CR-6); `{doc-directory}` is unquoted at four substitution sites in the Consume Output fences while the same block quotes it in `canon` (gate 5 CR-7); `advance-pipeline-lock.sh:231` prints the full `--accept-legacy` advice for a bystander legacy snapshot even when the restore succeeds from a matched claim (5c CR-2).

### Benefits of Closing the Residue

- The `--accept-legacy` contract is stated where it is read, so the next reader of the header or the pause doc learns the recovery is needed once.
- Two distinguishable failure states stop sharing one message; a reader of a HALT knows which file is malformed.
- A shrinking Change Log is reported by one command that compares two commits, rather than found by a reviewer who happens to diff.
- The detector and `choose_candidate()` agree on which candidate wins, so the resume prompt and the restore never name different steps.
- Test D and the lock suite assert the property, not a phrasing.

---

## 3. Technical Background

### Current Architecture

- `shared/resources/advance-pipeline-lock.sh` — `choose_candidate()` ranks matched over legacy, refuses legacy without `ACCEPT_LEGACY=1`; the `--restore` rebuild jq (under the comment *"`task_or_story_directory` is stamped when the candidate carries none"*) fills the field from `$doc_dir`. The per-candidate refusal line at the `legacy-snapshot:` echo (`:231`) prints the `--accept-legacy` advice inside the loop, before it is known whether a matched claim will win. The header contract bullets under `#   • a candidate with NO task_or_story_directory` predate the stamp, and the first bullet (`:70-72`) still says an absent directory matches.
- `shared/resources/advance-pipeline-lock.test.sh` — the three cycle-7 scenarios after `--restore --accept-legacy: the legacy snapshot is restored and consumed`; the third seeds `"task_or_story_directory":"$R/doc"` and passes `$R/doc`.
- `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — bind block and delete block; Pass 2 reads `SNAP_DIR=$(jq -r '.task_or_story_directory // ""' "$p" 2>/dev/null)` and HALTs on `[ -n "$SNAP_DIR" ] && canon-equal` with the text *"(task_or_story_directory: '${SNAP_DIR:-absent}') — the detector mislabelled it"*; the selector `select((.concern // "") == "stale-snapshot: PR merged")` drops every other concern with no output.
- `shared/resources/pipeline-resume-detector-prompt.md` — the candidate listing fence (`:81`, already `find .claude/state -maxdepth 1 \( -name … -o -name … \) -exec ls -t {} +` since task.137); Step 1 item 1 *"Drop any whose `task_or_story_directory` is not the directory of the document"*; item 3 *"take the newest by mtime"*.
- The five `--restore` citation sites `who-restores-single-statement.test.mjs` `sites()` derives: `develop-pipeline-resume-contract.md` § *"Restoring the lock — on either resume path"*, `develop-pipeline-step-0-resolve-and-prepare.md` § 0b *"Restore the lock before anything advances it"*, and the three `skills/develop-*/SKILL.md` Step 0-lock paragraphs — imperative main clause, citation in a parenthetical.
- `shared/resources/report-lint.js` `usage()` — six calls: `<flag> needs a value`, `unknown argument`, `--file is required`, `--variant must be one of`, `cannot read <file>`, template load (`e.message`); the `2)` arm text *"the call site is wrong, not the report"* at seven places: the fenced site (1) in each of `skills/develop-{task,story,bug}/SKILL.md`, the one-line warn-only site (2) in each of the same three, and site (4) in `develop-pipeline-step-8-commit.md` (the report-lint contract's numbering; `report-lint-call-sites.test.mjs` A/B read them).
- `shared/resources/change-log.js` — `upsertChangeLog(content, entry)` locates the block (`findChangeLog`), partitions it (`splitCarriedLines`), and regenerates it from the parsed rows **plus every unparsed pipe-row** ("Rows the parser does not recognise are PRESERVED, not dropped"), so the writer does not lose rows; `extractEntries(content)` reads the rows. Nothing compares one revision's rows with another's.
- `shared/resources/tests/stale-snapshot-delete.test.mjs` test D — captures the citation sentence, asserts the negative word-list regex and the positive `exactly \`stale-snapshot: PR merged\`` match.

### Target Architecture

- **Lock script**: header bullets (including the stale `:70-72` "absent … matches" clause, reworded to "absent → refused as `legacy-snapshot`, see below") and the two prose mirrors gain the stamp clause; the `legacy-snapshot:` advice is emitted from the final no-candidate branch only, the per-candidate line downgraded to *"skipped: no task_or_story_directory"*; the no-overwrite scenario seeds `./doc/` (canon-equal to `$R/doc`, textually different) and asserts the lock keeps `./doc/`.
- **Contract delete block**: Pass 2 opens with `jq -e 'type == "object"' "$p" >/dev/null 2>&1 || HALT "not a JSON object"` (the step-8 arm), then the directory read; a second jq pass over `deltas_since_pause` prints *"unrecognised stale-snapshot label — kept: <concern>"* for prefix matches that are neither the verdict nor a known skip note; every `{doc-directory}` substitution is quoted.
- **Detector prompt**: Step 1 states — once, citing `advance-pipeline-lock.sh` `choose_candidate()` as the authority — that a candidate with no `task_or_story_directory` is dropped and filed as `{ "path": …, "concern": "legacy snapshot (no task_or_story_directory) — --restore --accept-legacy or delete" }`, and that a directory-matched candidate outranks a legacy snapshot whatever their mtimes; the listing fence is left as it is (already `find`-based) and gains a test that executes it under `zsh -f`.
- **Citations**: the five `--restore` citation sites read *"run the command below **only when** resume contract § Restore the lock (both resume paths) says it runs here"*; `who-restores-single-statement.test.mjs` (ii) gains an assertion that each site's imperative is inside a conditional clause naming the section.
- **Lint `2)` arm**: one sentence in `develop-pipeline-step-8-commit.md` naming every `usage(` cause — the statement — and a `2)` echo at all seven sites that says *"report-lint refused its inputs (exit 2) — see develop-pipeline-step-8-commit.md § lint exit 2"*; `report-lint-call-sites.test.mjs` asserts every site carries the citation and that the step-8 sentence names each `usage(` cause read from `report-lint.js`.
- **Test D**: the negative regex is replaced by *"the citation names the exact label and no other backticked `stale-snapshot` token that is not `stale-snapshot: PR merged` or a skip-note quotation"*.
- **`change-log.js`**: a pure `rowsDropped(prevContent, nextContent)` returns every row of `prev`'s Change Log (read with `extractEntries`, the reader the writer uses) that `next`'s no longer carries, compared on the whole trimmed row; a CLI mode `change-log.js --check-append-only --file <doc> --against <rev>` reads `git show <rev>:<doc>`, prints each dropped row and exits 1 when any is missing, 0 otherwise (a document absent at `<rev>` is `0`, `reason: new-document`). `upsertChangeLog` is unchanged. The 5c conformance prompt's **C. TRAIL** list gains *"the Change Log lost rows since the base — `change-log.js --check-append-only --file <doc> --against <merge-base>`"*.

### Important Clarifications

- **Task.128 owns the shell probe sink.** Obs #138 (finalise's security probe cannot import a shell boundary) is evidence for task.128, not scope here.
- **The append-only check is a detector, not a repair, and not a writer guard.** It names the dropped rows; recovering them is the caller's job (as it was at 5c PC-2: `git show <prior>:<doc>`). A guard inside `upsertChangeLog` was the original plan and was dropped at review 1: the writer already preserves every row, the observed loss came from a hand edit, and a guard nothing can trip is untestable (its mutation proof has no red to find).
- **`{doc-directory}` quoting is scoped to § Consume Output.** The contract's other unquoted substitutions (the `--restore` command at `:329`, the grant call at `:489`) are outside this task's gate 5 CR-7 finding and stay as they are.
- **Grouping is by file, but the split test is by outcome.** Each phase leaves the tree mergeable alone; none is a prerequisite for another.

---

## 4. Scope

### In Scope

✅ `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`, `grant-qa-cycles.sh` (header prose only)
✅ `shared/resources/develop-pipeline-resume-contract.md` § Consume Output (Pass 2 arms, unrecognised-label pass, quoting)
✅ `shared/resources/pipeline-resume-detector-prompt.md` Step 1 rule (the listing fence is already fixed — test only)
✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-resume-contract.md` (§ Restoring the lock paragraph), `develop-pipeline-pause.md`, `develop-pipeline-step-8-commit.md`, `skills/develop-{task,story,bug}/SKILL.md` — citation clauses, lint `2)` arm
✅ `shared/resources/change-log.js` (`rowsDropped` + `--check-append-only`) + `shared/resources/tests/change-log.test.mjs`; `pr-conformance-prompt.md` TRAIL row
✅ `shared/resources/tests/stale-snapshot-delete.test.mjs` (D), `who-restores-single-statement.test.mjs`, `report-lint-call-sites.test.mjs`
✅ `npm run bundle`; CHANGELOG entry

### Out of Scope

❌ A shell-capable sink for `security-probe.mjs` — task.128
❌ Route 2c's `high-findings-seen` clause — task.134
❌ Gate `updated:` / scoping from a recorded head — task.135
❌ `change-log.js`'s heading-duplication defect — obs #104, task.127

---

## 5. Breaking Changes

None. `upsertChangeLog` is unchanged; the append-only check is a new, read-only function and CLI mode (review 1 dropped the writer-side throw that was Breaking Change 1).

Nothing else is breaking either: the `legacy-snapshot:` advice moves but the exit codes do not; the detector prompt's new rule matches what `--restore` already does; test D's assertion becomes stricter on a phrasing no shipped citation uses.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.133.plan.task-130-residue-cleanup.md](task.133.plan.task-130-residue-cleanup.md)

### Phase 1: Lock script — falsifiable no-overwrite scenario, stamp in the contract mirrors, quiet bystander advice

**Risk**: Low
**Files**: `advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`, `grant-qa-cycles.sh`, `develop-pipeline-pause.md`

- [x] Seed the no-overwrite scenario's candidate with `./doc/` written from `$R`, restore with `$R/doc`, assert the lock keeps `./doc/`; mutation: unconditional assignment → red
- [x] Header bullets (`#   • a candidate with NO task_or_story_directory …`) and `grant-qa-cycles.sh:52-54`, `develop-pipeline-pause.md:80` state: stamped with `<doc-dir>` as spelled; a present value is kept
- [x] Header bullet `:70-72`: drop *"an ABSENT directory is the pre-task.123 shape and matches"*; an absent directory is refused (next bullets), not matched
- [x] Move the `--accept-legacy … or delete it` advice to the final no-candidate branch; per-candidate line → `skipped: no task_or_story_directory`; scenario: matched claim + bystander legacy → exit 0 and stderr carries no `--accept-legacy` advice

### Phase 2: Contract delete block — three named outcomes, quoted placeholder

**Risk**: Low
**Files**: `develop-pipeline-resume-contract.md`, `tests/stale-snapshot-delete.test.mjs`

- [x] Pass 2: `jq -e 'type == "object"'` first → HALT `"$p is not a JSON object"`; keep the directory HALT for a parsed object with no directory; test: unparsable snapshot → the new text, directory-less object → the old text
- [x] Second jq pass: prefix matches that are neither the verdict nor the two skip notes print `unrecognised stale-snapshot label — kept: <concern>`; test: trailing-space label and the pre-task.130 `— PR merged; deleted` label both print and keep
- [x] Quote `{doc-directory}` at the four substitution sites; test: a doc-directory with a space binds and deletes under both shells

### Phase 3: Detector prompt — the candidate rule once, glob-safe listing

**Risk**: Low
**Files**: `pipeline-resume-detector-prompt.md`, a new `tests/detector-candidate-rule.test.mjs`

- [x] Step 1: drop a directory-less candidate and file it as a delta object naming `--accept-legacy`; a directory-matched claim outranks a legacy snapshot regardless of mtime; cite `choose_candidate()` as the authority
- [x] The listing fence is already `find`-based (task.137); pin it — test: block extracted by its anchor and executed under `zsh -f` and `bash --noprofile --norc` with no `.pausing.*` present lists the existing `last-halt.json`; mutation: the old `ls -t … .pausing.*` glob → red under zsh
- [x] Test: the prompt's Step 1 names both rules (marker-anchored, not phrase-matched), and `advance-pipeline-lock.sh` still carries the same two behaviours (scenario references)

### Phase 4: Citations and messages stated once — `--restore` clauses, lint `2)` arm, test D

**Risk**: Low
**Files**: step-0 doc, three SKILL.md, `develop-pipeline-step-8-commit.md`, `tests/who-restores-single-statement.test.mjs`, `tests/report-lint-call-sites.test.mjs`, `tests/stale-snapshot-delete.test.mjs`

- [x] Five `--restore` citation sites (the population `sites()` derives): imperative inside a conditional naming § Restore the lock; test (ii) asserts the conditional form at each site; mutation: main-clause imperative restored at one site → red
- [x] Lint `2)` arm: one sentence in step-8 naming every `usage(` cause (six today); all seven `2)` echoes (site (1) ×3, site (2) ×3, site (4)) cite it; `report-lint-call-sites.test.mjs` asserts the citation at every site and that step-8's sentence names each `usage(` call's cause (read from `report-lint.js`, not restated); mutation: one cause dropped from the sentence → red
- [x] Test D: drop the word-list negative; assert no backticked `stale-snapshot` token other than the exact label or a quoted skip note; mutation: `stale-snapshot*` phrasing → red, accurate "share the prefix" clause → green

### Phase 5: `change-log.js` append-only check + 5c TRAIL row

**Risk**: Low (read-only; `upsertChangeLog` untouched)
**Files**: `change-log.js`, `tests/change-log.test.mjs`, `pr-conformance-prompt.md`

- [x] `rowsDropped(prevContent, nextContent)` — rows of `prev`'s Change Log (`extractEntries`) absent from `next`'s, compared on the trimmed row; exported
- [x] CLI `--check-append-only --file <doc> --against <rev>`: `git show <rev>:<doc>`; prints each dropped row; exit 1 when any, 0 otherwise (`reason`: `ok` / `rows-dropped` / `new-document`); `--json` like the other modes
- [x] Tests: the real pair `fdba78d9~1` → `fdba78d9` of the task.130 document (fixtures copied into the test, not read from git) reports exactly six dropped rows; a normal `upsertChangeLog` append reports none; a legacy-marker migration reports none; a document absent at `<rev>` is `new-document`; mutation: `rowsDropped` returning `[]` → the fixture test red
- [x] `pr-conformance-prompt.md` § C. TRAIL: *"the Change Log lost rows since the base — run `change-log.js --check-append-only --file <doc> --against <merge-base>`; any dropped row is a trail defect"*

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/advance-pipeline-lock.sh` — advice placement; header contract
2. ✅ `shared/resources/grant-qa-cycles.sh` — header prose
3. ✅ `shared/resources/develop-pipeline-resume-contract.md` — Pass 2 arms, unrecognised-label pass, quoting
4. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — Step 1 rule
5. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — conditional clause (the contract's § Restoring the lock paragraph gets the same, under item 3)
6. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — lint `2)` sentence
7. ✅ `shared/resources/develop-pipeline-pause.md` — stamp clause
8. ✅ `shared/resources/change-log.js` — `rowsDropped` + `--check-append-only`
9. ✅ `shared/resources/pr-conformance-prompt.md` — TRAIL row running the append-only check
10. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` — conditional clause; lint arm citation

### Files to Modify (Tests)

11. ✅ `shared/resources/advance-pipeline-lock.test.sh` — falsifiable no-overwrite; quiet-advice scenario
12. ✅ `shared/resources/tests/stale-snapshot-delete.test.mjs` — three-outcome Pass 2; unrecognised label; quoting; test D
13. ✅ `shared/resources/tests/who-restores-single-statement.test.mjs` — conditional-clause assertion
14. ✅ `shared/resources/tests/report-lint-call-sites.test.mjs` — one-message citation; cause list vs `usage(` calls
15. ✅ `shared/resources/tests/change-log.test.mjs` — append-only check (fixture pair from task.130 `fdba78d9~1`/`fdba78d9`)
16. 🆕 `shared/resources/tests/detector-candidate-rule.test.mjs` — Step 1 rule + listing pinned under zsh
16a. 🆕 `shared/resources/tests/fixtures/change-log-append-only.task130-{parent,repair}.txt` — the task.130 Change Log block at `fdba78d9~1` and `fdba78d9`, verbatim (`.txt` so no Markdown tool reformats or link-checks them)

### Files to Modify (Documentation)

17. ✅ `CHANGELOG.md` — [Unreleased] entry (Added: the append-only check; Fixed: the rest)
18. ✅ `skills/*/references/` — regenerated by `npm run bundle`
19. ✅ `docs/tasks/task.130.…/task.130.resume-residue-bug-variant-base-and-who-restores.md` — Deferred Work annotated item by item (Migration criterion)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: every phase's assertion executed under `bash --noprofile --norc` and `zsh -f` where the artefact is shell or a fenced block; node tests for `change-log.js` and the prose readers.
- **Mutation proofs**: one per phase, named in the plan — unconditional overwrite; advice moved back inside the loop; `type == "object"` check dropped; unrecognised-label pass dropped; old `ls` glob restored in the listing; word-list regex restored; conditional clause reverted at one site; a `usage(` cause dropped from the step-8 sentence; `rowsDropped` returning `[]`.
- **Command**: `npm run ci:fast`; `bash shared/resources/advance-pipeline-lock.test.sh`; `bash shared/resources/grant-qa-cycles.test.sh`.

### Integration Tests

- `npm run eval:develop-task` — fixtures 16/17 unchanged in outcome (the delete block's happy path and the HALT are not touched by the three-outcome split).

### Contract Tests

- `who-restores-single-statement`, `report-lint-call-sites`, `stale-snapshot-delete` D — each reads the population (all citing sites), not a sample.
- `bundle:check` 0 problems; `lint:shell` clean.

### Performance Tests

Not applicable — one extra `jq -e` per stale delta; the append-only check is one `git show` per document, run only by the 5c lens.

### Consumer Tests

- None affected: `upsertChangeLog` and every appender are unchanged. The append-only check is additionally run over the tracked corpus as a non-vacuity check before shipping: every tracked document carrying `<!-- change-log-start -->`, against `origin/develop`, reports no dropped rows (a non-zero count is a finding to record, not to hide).

---

## 9. Success Criteria

### Functional

- [x] The no-overwrite scenario is red under an unconditional `.task_or_story_directory = $dir`
- [x] A matched claim beside a bystander legacy snapshot restores with exit 0 and no `--accept-legacy` advice on stderr; a legacy-only candidate set still prints it
- [x] An unparsable snapshot, a directory-less object and an unrecognised `stale-snapshot`-prefixed label each produce their own message; nothing is deleted in any of the three
- [x] The detector prompt's Step 1 states the legacy-refusal and provenance rules; a test executes its listing under `zsh -f` with no `.pausing.*` present and sees the existing `last-halt.json`
- [x] `change-log.js --check-append-only` reports exactly the six rows `fdba78d9` dropped from the task.130 document (fixture pair), reports none for a normal append and a legacy-marker migration, and exits 1 / 0 accordingly
- [x] Every `2)` lint arm cites the one step-8 sentence, and that sentence names every `usage(` cause in `report-lint.js`

### Performance

- [x] Resume cost unchanged beyond one `jq -e` per stale delta

### Code Quality

- [x] `ci:fast`, `eval:develop-task`, both shell suites, `bundle:check`, `lint:shell`, Prettier green
- [x] Every phase's mutation proof recorded in the implementation report

### Migration

- [x] CHANGELOG [Unreleased] entry names the append-only check and the recovery (`git show <good-commit>:<doc>`)
- [x] Task.130's Deferred Work list is annotated: each item → this task, task.134, task.135 or task.128

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None (review 1 removed the writer-side throw, the one change every appender would have run through).

### Low Risk Areas

1. **Detector prompt wording drifts from `choose_candidate()` again** — the new test anchors the prompt's rule on a marker and the script's behaviour on named scenarios; it fails when either moves alone.
2. **The append-only check misreads a reordered or merged log as a loss** — it compares on the trimmed row, so a row whose cells were re-padded or migrated from a legacy marker reads as dropped. Mitigation: compare through `extractEntries` (which normalises the legacy shapes) and cover the legacy-migration case in a test; the corpus run above is the non-vacuity floor.
3. **Test D's stricter assertion rejects a future accurate citation** — the rule is "no backticked `stale-snapshot` token other than the exact label or a quoted skip note"; the plan lists the two accepted forms.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the delete block HALTs on a valid snapshot; `--restore` refuses a candidate it restored before; the 5c lens reports dropped rows on a log that lost none.
- **Steps**: revert the phase's commit (each phase is one commit); `npm run bundle`; push.
- **Validation**: the failing case passes; `ci:fast` green.

### Partial Rollback (1-2 hours)

- **When to use**: one phase regresses, the others are sound.
- **Steps**: revert that phase only — phases share no file except the contract (Phases 2 and 4 touch different sections) and the SKILL.md files (Phase 4 only).

### Forward Fix (< 4 hours)

- **When to use**: a message text or a test assertion is wrong but nothing is unsafe.
- **Approach**: fix in place with the mutation proof re-run.

### Rollback Triggers

- **Critical**: a resume that restored before this task no longer restores.
- **Non-critical**: a HALT message wording; a test assertion tighter than intended.

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-30
**Quality Score**: 70/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.133.qa.1.task-130-residue-cleanup.md](./task.133.qa.1.task-130-residue-cleanup.md)
- **Gate File**: [task.133.gate.1.task-130-residue-cleanup.yml](./task.133.gate.1.task-130-residue-cleanup.yml)

### Test Coverage Summary
- **Tests Executed**: 4629
- **Phases Verified**: 5/5
- **Critical Issues**: 1 (HIGH — [bug 1](./task.133.bug.1.check-append-only-empty-against-reads-index.md))
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Bug Reports

- [Bug 1: `--check-append-only --against ""` reads the index](./task.133.bug.1.check-append-only-empty-against-reads-index.md) - ✅ Ready for QA - Priority: P1 (Fixed 2026-09-30)

### Key Findings
`--check-append-only --against ""` reads the index and reports a clean log (exit 0). An unresolvable merge-base therefore makes the new 5c TRAIL check fail open (TASK-133-QA-1, HIGH). Also one LOW: the bind-block comment claims wider quoting than the change delivers (TASK-133-QA-2).
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — task.130 Deferred Work, gates 5–7 advisories, pr-review.1 CR-2/CR-3, obs #137 | create-task |
| 2026-09-30 | 1.1 | Review 1 (8/10, 1 critical / 4 important, all applied): Phase 5 rescoped from a writer-side shrink throw to a cross-revision append-only check (upsertChangeLog keeps all six rows on the fdba78d9~1 shape — executed; the loss was a hand edit); Phase 3 listing already find-based since task.137 — pinned by a test, not rewritten; Phase 1 adds the stale ":70-72 absent … matches" header bullet; Phase 4 covers five --restore sites and seven lint 2) arms with causes derived from usage(); Breaking Changes → none | review-task |
| 2026-09-30 |  | Status → ready-for-development | review-task |
| 2026-09-30 |  | Implemented — 5 phases, 5 commits; 13 source/doc files + 3 SKILL.md, 1 new suite + 5 extended (+13 tests), 2 fixtures; 15 mutation proofs; task.130 Deferred Work annotated | develop |
| 2026-09-30 |  | QA gate FAIL (70/100) — 1 HIGH (empty --against reads the index and reports a clean log) + 1 LOW | qa-task |
| 2026-09-30 |  | QA findings fixed — cycle 1: TASK-133-QA-1 (empty --against is usage, exit 2; J4 +2 cases, mutation-proven), TASK-133-QA-2 (quoting claim narrowed to § Consume Output, CHANGELOG too); 1 iteration | qa-fix |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: lock script
- [x] Phase 2: contract delete block
- [x] Phase 3: detector prompt
- [x] Phase 4: citations and messages
- [x] Phase 5: change-log append-only check
- [ ] QA: `task.133.qa.[N].task-130-residue-cleanup.md`
- [ ] Gate: `task.133.gate.[N].task-130-residue-cleanup.yml`

## References

- `docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md` § Notes › Deferred Work
- `task.130.gate.5.…yml`, `task.130.gate.6.…yml`, `task.130.gate.7.…yml` — `code_review.advisory`, `recommendations.future`
- `task.130.pr-review.1.…md` — CR-2, CR-3, PC-2
- Observations #136–#139; #104 (change-log heading), #121/#138 → task.128
- `docs/reference/anti-patterns.md` — enumeration class

## Notes

### Implementation Summary (develop, 2026-09-30)

- **Approach**: one commit per phase, each red-first where a test was new, each with a mutation proof. Implemented inline from the plan (the plan named every hunk); `/develop` was not invoked. Phase 5 follows review 1's rescope: a cross-revision `rowsDropped` + `--check-append-only`, not a writer-side throw.
- **Commits**: Phase 1 `0f10e889`, Phase 2 `f23a1a11`, Phase 3 `779b6bef`, Phase 4 `dd195467`, Phase 5 + docs in the commit that carries this note.
- **Testing Results**: `npm run ci:fast` → 4626/4629. The two failures were the load-sensitive timing budgets in `tests/bundle-missing-source.test.js` and `tests/test-clean-checkout.test.js` (10198 ms against a 10000 ms budget, with a history sweep running in parallel); run alone, they pass 7/7 and 13/13. `advance-pipeline-lock.test.sh` 99/99, `grant-qa-cycles.test.sh` 46/46, `eval:develop-task` 17/17 fixtures, `lint:shell` clean, `bundle:check` 0 problems. New or extended suites: stale-snapshot-delete (+R, S, P-with-space; D reworked), detector-candidate-rule (new, 4), who-restores (+iv), report-lint-call-sites (+D), change-log (+J1–J4).
- **Mutation proofs**: 15, all red. The list is in the implementation report § Step 3.
- **Phase 5 non-vacuity**: 128 tracked documents that carry a Change Log, checked against `origin/develop` → 0 flagged. task.130's whole history → only `fdba78d9` (6 rows). A September sweep of 293 commit/parent pairs → 17 commits that drop a row: `fdba78d9`, plus 16 where `qa-fix` rewrote its own row in place. That is evidence for open obs #183, not new scope.
- **Deferred Work**: `qa-fix` rewriting its row across cycles (obs #183 — the check now measures it). The 5c lens compares against the merge-base only, so a row added and then rewritten on the same branch is invisible to it; a per-commit mode would close that. Two unquoted `{doc-directory}` sites outside § Consume Output (`:329`, `:489`). PreCompact hook lint site (3) still has no rc split (exempt in `report-lint-call-sites.test.mjs`).
- **Completion Date**: 2026-09-30

- QA artifacts land beside this file: `task.133.qa.[N].*.md`, `task.133.bug.[N].*.md`, `task.133.gate.[N].*.yml`.
- Independent of tasks 134 and 135; shares `develop-pipeline-resume-contract.md` with neither (134 touches `qa-diminishing-returns.js` and the step-5-6 file; 135 touches the qa-* gate writers and `qa-re-review-scope.md`).
