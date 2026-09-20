---
id: task.130
title: "[Task 130] Resume residue from task.124: the probe base fallback reads a row the bug-variant report never carries, develop-bug's root-cause dispatch is outside the waiting_on population, the detector self-reports a delete it may not perform, and one rule is still stated at five sites"
type: task
description: "Close the medium findings PR #436's Step 5c review carried past merge and collapse the who-restores enumeration that produced bugs 9→11→12→13: bind the probe base from the bug-variant report's Branch-model line, mark develop-bug's Step 3 dispatch and widen the population pattern, move the stale-snapshot rm -f into the orchestrator, state the restore rule once with citations and a test, and the four gate-6 futures."
tags: [pipeline, resume, develop-bug, enumeration]
category: refactoring
status: accepted
priority: High
created: 2026-09-20
updated: 2026-09-20
assignee:
estimated_effort_hours: 16
risk_level: medium
github_issue: 437
completed_date: 2026-09-20
pr_number: 441
---

# Technical Task: Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.130.review.1.resume-residue-bug-variant-base-and-who-restores.md` implemented 2026-09-20
**GitHub Issue**: [#437](https://github.com/Gamaroff/agent-skills/issues/437)

---

## 1. Overview

Task.124 shipped the working-tree probe, `--restore`, `waiting_on` and the report linter, and its Step 5c review (`task.124.pr-review.1`) left three medium findings and four gate-6 futures on the merged head. Each is small; together they are the residue of one pattern the QA loop kept finding — a rule stated at one site was fixed at that site while its restatements elsewhere stayed wrong. This task closes the findings and removes the enumeration that produced them.

**Scope**: `shared/resources/develop-pipeline-resume-contract.md` (probe base binding, who-restores rule), `pipeline-resume-detector-prompt.md` + the three orchestrators' Phase 0a handling (stale-snapshot delete), `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` (dispatch mark), `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (population pattern), `grant-qa-cycles.sh` (guard reads the chosen candidate), `develop-pipeline-step-8-commit.md` + `advance-pipeline-lock.sh` (snapshot with no directory), the orchestrators' Step 0-lock paragraphs and step-0 §0b (citations instead of restatements) and one new test.

**Key deliverables**: (1) probe base bound on every report variant, else HALT — never a silent `develop` default, with an executed test that goes red when either arm or the HALT is reverted; (2) every `Explore subagent` dispatch under a lock marked, with the population test's pattern widened so an unmarked one is red; (3) the detector reports `stale-snapshot`, the orchestrator deletes; (4) the who-restores rule stated once, cited five times, guarded by a test keyed on a marker rather than on a token another rule shares; (5) gate-6 futures closed.

**Expected outcome**: a develop-bug hotfix resumed before Step 4 probes against `main`; a develop-bug Step 3 wait is not re-prompted; a merged run's snapshot cannot be "deleted" in a report and survive on disk; a future edit to the restore rule has one place to land.

---

## 2. Motivation

### Current Problems

- **The probe's base fallback is variant-specific.** `develop-pipeline-resume-contract.md` binds `BASE_BRANCH` from `gh pr view` else a `| Feature branch base | … |` row. The bug-variant report (`implementation-report-template.md` § bug variant) records the base as `**Branch model:** {model} (base: X, PR target: Y)`, so a develop-bug hotfix off `main` resumed before Step 4 falls to `develop` — the one pipeline where the base is routinely not develop, and the (a) discard is the destructive outcome (PR #436 review CR-1, medium/high).
- **A real dispatch sits outside the `waiting_on` population.** `develop-bug-step-3-investigate-fix.md` step 3 "Localise the root cause via a read-only Explore subagent" runs with the lock present and carries no `set-waiting-on.sh` mark; the population test's pattern (`subagent_type=`, `dispatch an Explore subagent`, `run_in_background`, `gh pr checks --watch`) does not match its wording, so the test is green over a gap (CR-2, medium/high; the same class as task.124 bug 3).
- **The detector is told to `rm -f` and the orchestrator trusts the report.** `pipeline-resume-detector-prompt.md` § stale snapshot after merge has the read-only Explore subagent delete `last-halt.json`; whether the harness permits it is a property of the session, and `"deleted"` in `deltas_since_pause` is a self-reported verdict nothing re-reads (CR-3, medium/medium — an obs #77-class self-report).
- **One rule, five statements.** Who restores the lock, and when, is stated in the resume contract's Phase 0a section, its Phase 0b paragraph, step-0 §0b and each of three orchestrators' Step 0-lock paragraphs. Bugs 9 → 11 → 12 → 13 on task.124 are a single contradiction walking across four of them, one site-local fix at a time (obs #132).
- **Four gate-6 futures**: the probe's fallback stderr line says "no PR on this branch" when `gh` may simply have failed; `grant-qa-cycles.sh`'s never-lower guard reads `qa_max_cycles` from `$SNAPSHOT` while `--restore` may choose a newer `.pausing.*` claim (task.124 cycle-1 CR-5, carried in every gate since); inline lint call sites collapse exit 1/2/127 into one `||` branch (cycle-1 CR-7); Step 8 deletes only a snapshot with a matching non-empty `task_or_story_directory` while `--restore` accepts one with none for any document.

### Benefits of Closing the Residue

- The destructive probe outcome keys on the real base for every branch model (hotfix, epic-integration, feature).
- The population test catches the next unmarked dispatch instead of passing over it.
- A stale snapshot is deleted by an agent that can delete, and the deletion is verified on disk.
- The restore rule has one author-facing location; the other five sites become citations a test can check for restatement.
- Fewer places for the next QA loop to circle.

---

## 3. Technical Background

### Current Architecture

**Components** (merged at `62945d68`, PR #436):

- `shared/resources/develop-pipeline-resume-contract.md` § Working-tree probe — binds `BASE_BRANCH` in order `gh pr view --json baseRefName` → `sed` over `{implementation-report-path}` for `| Feature branch base |` → `develop` with a stderr line. Phase 0a § "Restore the lock (both resume paths)" states the who-restores rule; Phase 0b § "Restoring the lock — on either resume path" restates it with a deferral sentence.
- `shared/resources/implementation-report-template.md` — story/task variants carry the `Feature branch base` table row; the bug variant carries `**Branch model:** {BRANCH_MODEL} (base: {BASE_BRANCH}, PR target: {PR_TARGET})`.
- `shared/resources/pipeline-resume-detector-prompt.md` § Step 1 item 2 — the read-only detector's one sanctioned write (`rm -f` of a MERGED snapshot).
- `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` step 3 — root-cause Explore dispatch, unmarked; step 51 (test triage) is marked.
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` — derives the dispatch population from directories with a case-insensitive pattern and an `EXEMPT` regex; ≥12-site floor.
- `shared/resources/grant-qa-cycles.sh` — `read_budget "$SNAPSHOT"` for the never-lower guard, then `bash "$ADVANCE" --restore "$DOC_DIR"` which selects its own candidate.
- `shared/resources/advance-pipeline-lock.sh --restore` — candidate match treats an absent `task_or_story_directory` as matching any document; `develop-pipeline-step-8-commit.md` § Cleanup deletes only a non-empty matching one.
- `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock paragraphs and `develop-pipeline-step-0-resolve-and-prepare.md` §0b — each restates the who-restores rule with pipeline qualifiers (after task.124 cycle 5).

### Target Architecture

**Components**:

- Probe base binding: `gh pr view` → report row (`| Feature branch base |`) → report line (`**Branch model:** … (base: X`) → **HALT** naming the report path and both shapes tried. No `develop` default: a base the probe cannot establish is class (c) for the whole tree, because the comparison that discards is meaningless without it. The stderr line distinguishes "gh returned no PR" from "gh failed: <first stderr line>".
- `develop-bug-step-3-investigate-fix.md` step 3 marked (`set-waiting-on.sh "step-3 root-cause localisation"` / `--clear`). The file is **not** bundled — its source is `skills/develop-bug/references/` itself — and it is **already in the population**: `qa-loop-lock-fields-parity.test.mjs` derives `skills/develop-bug/references/develop-bug-step-[1-9]*.md` from the directory (line 214). Only the `DISPATCH` regex (line 190) misses its wording, so the change is regex-only: it gains `via a read-only Explore subagent|Explore subagent \(|Agent\(subagent_type`, plus a non-vacuity assertion that the widened regex matches at least one line of that file (so a future re-narrowing is red) and a floor raised to the measured count. No site is hand-listed — the plan's own rule.
- Detector reports the stale snapshot as a `deltas_since_pause` object `{path: <snapshot path>, concern: "stale-snapshot: PR merged"}` — the schema's existing four fields, so the orchestrator's `jq` can select on `concern` and read `path` — and does **not** delete. The delete is stated **once**, in the resume contract § Consume Output: for every such object, `rm -f "$path"` (one path per call) then `[ ! -f "$path" ]`, HALT if it survives, before Phase 0b. The three orchestrators' Step 0a cite that section in one sentence and carry no copy of the loop — the write is done by the agent that can write, verified on disk, and stated at one site.
- One statement of the who-restores rule: the resume contract's Phase 0a section, carrying an HTML marker `<!-- who-restores: statement -->`. Phase 0b, step-0 §0b and the three Step 0-lock paragraphs cite it in one sentence ("who restores, and when: resume contract § Restore the lock (both resume paths)") and carry no rule text of their own. `shared/resources/tests/who-restores-single-statement.test.mjs` asserts (i) exactly one marker across `shared/resources/**/*.md` and `skills/develop-*/SKILL.md`; (ii) in each of the five citation sites no line pairs a restore verb (`restore|restores|restoring|runs the command`) with `loop-limit\|not-converging` or with `no re-entry grant`; (iii) each citation site contains `Restore the lock (both resume paths)` — the `mutation-call-site-coverage.test.js` shape. **The key is the marker, not the token**: `loop-limit|not-converging` is also the grant-offer rule's signature (contract § Re-entry step 3; the SKILL.md Re-entry paragraphs), which stays where it is, and develop-bug's Step 0-lock restates who-restores with no token at all — a token test is red on the first and blind to the second.
- `grant-qa-cycles.sh` asks `advance-pipeline-lock.sh --restore --which "$DOC_DIR"` (new read-only flag: prints the winning candidate path, exit 1 when none) and runs `read_budget` on that file.
- Inline lint call sites (Step Transition action 2 = site (1), step-8 = site (4), the HALT rule = site (2)) split `|| { … }` into `rc=$?; case $rc in` 0 / 1 / 2 / `*` with a distinct message each (ok / problems / usage / linter not runnable). Sites (1) and (4) are fenced blocks and HALT on non-zero; site (2) is a **one-line** call inside a bullet that **warns and continues** (the snapshot and lock removal must still run), so it takes the same `case` on one line with `echo` arms and no `exit`.
- `--restore` refuses a snapshot with no `task_or_story_directory` unless `--accept-legacy` is passed; Step 8's cleanup deletes such a snapshot when it is the only candidate on disk (it can belong to no run that will resume it). The "only one" count is a nullglob-guarded loop over the two candidate shapes, never `ls <path> <glob> | wc -l` — under zsh an unmatched glob aborts the whole `ls` and the count reads 0 (`docs/reference/anti-patterns.md` § "Never put a must-succeed path and a glob in one `rm` argv"; `halt-snippet-glob-safe.test.mjs`).

### Important Clarifications

- **A HALT replaces the `develop` default deliberately.** Task.124 cycle 5 bound the base and kept a default "said aloud"; the 5c review showed the default is wrong on exactly the pipeline whose report the fallback cannot read. A probe that cannot name its base must not discard.
- **The detector stays read-only by construction, not by permission.** Whether an Explore subagent can `rm` is a harness property; the contract must not depend on it.
- **Collapsing to a citation is the fix for obs #132; the pipeline qualifiers task.124 cycle 5 added are kept in the one statement**, not dropped.
- Task.128 (shell entry for the probe engine) and task.129 (call-site population collector) are independent of this task; the population-pattern widening here is a one-line test change, not the collector 129 builds.

---

## 4. Scope

### In Scope

✅ Probe base binding: bug-variant line, HALT instead of default, stderr label by cause (CR-1 + gate-6 future 1).
✅ develop-bug Step 3 dispatch marked; population pattern widened; fixture for the site (CR-2).
✅ Stale-snapshot delete moved to the orchestrators' Phase 0a handling with an on-disk re-read (CR-3).
✅ Who-restores rule stated once (marked); five citations; `who-restores-single-statement.test.mjs` (obs #132).
✅ `--restore --which`; grant guard reads the chosen candidate (cycle-1 CR-5).
✅ Lint call sites split exit 0/1/2/other (cycle-1 CR-7).
✅ Snapshot with no directory: `--accept-legacy` on `--restore`; Step 8 deletes a sole legacy snapshot (PR #436 review CR-5).
✅ Executed unit test of the probe's base binding (three report fixtures, bash and zsh); replay fixture 17: a develop-task resume whose report has no base row and no PR → HALT, nothing discarded.
✅ `npm run bundle`; CHANGELOG `[Unreleased]`.

### Out of Scope

❌ A `base_branch` lock field written at Step 1 — the report already records the answer; adding a second writer is the enumeration class again.
❌ Task.129's call-site collector; task.128's shell probe entry.
❌ Any change to what the probe classifies as (a)/(b)/(c) beyond the base it compares against.
❌ Gate 6's third `future` entry — Step 4b reporting zero blocks executed on `develop-pipeline-step-0-resolve-and-prepare.md` (three template-slot blocks; pre-existing, identical on `develop`).
❌ Rewording the grant-offer rule (contract § Re-entry step 3; the SKILL.md Re-entry paragraphs) — it legitimately carries `loop-limit|not-converging` and is not a who-restores restatement.

---

## 5. Breaking Changes

### Breaking Change 1: the probe HALTs when it cannot bind a base

**What Changed**: `BASE_REF` no longer defaults to `origin/develop`.

**Before**: no PR, no report row → `develop`, stderr line, classification proceeds.

**After**: no PR, no report row, no Branch-model line → HALT naming the report path and the shapes tried; nothing discarded.

**Impact**: a resume on a run whose report predates task.124's template (no `Feature branch base` row) and has no PR halts where it previously guessed. The row was added to `implementation-report-template.md` by task.124 (`86ebcade`, 2026-09-19); **none of the five implementation reports under `docs/tasks/` carries it**, so every report written before PR #436 is in this class. No such run is in flight — `.claude/state/` holds neither a lock nor a halt snapshot — which is why the risk below is Low rather than why the HALT is safe.

**Migration Path**: add the `| Feature branch base | <branch> |` row to the report's Pipeline Configuration table by hand and re-invoke; the HALT message says so.

### Breaking Change 2: `--restore` refuses a snapshot with no `task_or_story_directory`

**What Changed**: a pre-task.123 snapshot (no directory field) is refused with a named reason unless `--accept-legacy` is passed.

**Impact**: none on runs since task.123; a legacy snapshot on disk surfaces once and is either accepted explicitly or deleted by the next completed run's Step 8.

**Migration Path**: `advance-pipeline-lock.sh --restore --accept-legacy <dir>` once, or delete the file.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.130.plan.resume-residue-bug-variant-base-and-who-restores.md](task.130.plan.resume-residue-bug-variant-base-and-who-restores.md)

### Phase 1: Probe base — bug variant, HALT, label by cause

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-resume-contract.md`; new `shared/resources/tests/probe-base-binding.test.mjs` (+ three report fixtures under `shared/resources/tests/fixtures/probe-base/`); `evals/develop-task/step-isolation/17-resume-no-base-row-halts/`.

**Changes**:
- [x] Add the `**Branch model:** … (base: X` sed arm after the table-row arm
- [x] Replace the `develop` default with a HALT naming `{implementation-report-path}` and both shapes
- [x] Capture `gh pr view`'s exit status and first stderr line; two stderr labels ("no PR on this branch" / "gh pr view failed: …")
- [x] Update the Cost sentence and the (a)/(c) table note
- [x] `probe-base-binding.test.mjs`: extract the `BASE_BRANCH=` block from the contract (keyed on the `The base is RECORDED STATE` anchor), run it under `bash` and `zsh` with `gh` stubbed (exit 1 / empty output) against three fixture reports — story/task table row → `develop`; bug `**Branch model:** hotfix (base: main, PR target: main)` → `main`; neither → exit 1 with the HALT text naming both shapes and no `git checkout` in the transcript
- [x] Replay fixture 17: a **develop-task** resume whose report has no `Feature branch base` row and no PR → HALT, nothing discarded (Breaking Change 1, end to end)
- [x] Mutation-prove: revert the bug-variant arm → the `main` case red; restore the `develop` default → the HALT case red

**Dependencies**: none

> A replay fixture is a recording — fixture 13 asserts strings in a recorded implementation report — so it cannot go red when the sed arm is reverted. The executed test is what proves this phase; the fixture documents the HALT in the runner that exists (there is no `evals/develop-bug`).

### Phase 2: develop-bug dispatch mark + population pattern

**Risk Level**: Low

**Files**: `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.

**Changes**:
- [x] Mark step 3's root-cause dispatch (`set-waiting-on.sh "step-3 root-cause localisation"` / `--clear` after the summary is read) — the file is not bundled; edit it in place
- [x] Widen the `DISPATCH` regex (line 190) to the three wordings the corpus uses; add a non-vacuity assertion that it matches ≥1 line of `develop-bug-step-3-investigate-fix.md` (the file is already in the directory-derived population — do **not** hand-list it); raise the `sites >= 12` floor (line 242) to the measured count
- [x] Mutation-prove: remove the mark → test names the develop-bug file as unmarked; narrow the regex back → the non-vacuity assertion red

**Dependencies**: none

### Phase 3: stale-snapshot delete in the orchestrator

**Risk Level**: Medium

**Files**: `shared/resources/pipeline-resume-detector-prompt.md`; `shared/resources/develop-pipeline-resume-contract.md` § Consume Output; `skills/develop-{task,story,bug}/SKILL.md` Step 0a (one citing sentence each — no copy of the loop); `evals/develop-task/step-isolation/16-resume-stale-snapshot-after-merge-deleted/`.

**Changes**:
- [x] Detector: emit the stale snapshot as a `deltas_since_pause` object `{path: <snapshot path>, concern: "stale-snapshot: PR merged"}` (the schema's existing fields) and keep the file; remove the "one sanctioned write" clause and the decision-table row's "deleted"
- [x] Contract § Consume Output — the **one** statement of the delete: `jq -r '.deltas_since_pause[] | select(.concern | startswith("stale-snapshot")) | .path'` piped to `while IFS= read -r p; do rm -f "$p"; [ ! -f "$p" ] || { echo "HALT: stale snapshot $p survived deletion"; exit 1; }; done`, before Phase 0b
- [x] Each orchestrator's Step 0a cites that section in one sentence ("stale snapshots the detector reports are deleted and verified per the resume contract § Consume Output") — three copies of the loop would be the enumeration this task removes
- [x] Fixture 16: re-record `detector-output.json` with the object shape (the current recording says `PR merged; deleted`); assertions: `fileAbsent` on the snapshot, `fileMatches` on `"concern": "stale-snapshot: PR merged"`, `fileDoesNotMatch` on `deleted`, and the orchestrator's delete placed after the `resume-detector` event in `pipeline-events.json`

**Dependencies**: none

### Phase 4: one statement of who restores

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-resume-contract.md` (Phase 0b paragraph), `develop-pipeline-step-0-resolve-and-prepare.md` §0b, `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock; new `shared/resources/tests/who-restores-single-statement.test.mjs`.

**Changes**:
- [x] Put `<!-- who-restores: statement -->` on the Phase 0a section; reduce the five restatements (contract Phase 0b paragraph, step-0 §0b, three Step 0-lock paragraphs — develop-bug's "no re-entry grant" sentence included) to one-sentence citations; keep every pipeline qualifier in the one statement
- [x] Test: exactly one marker across `shared/resources/**/*.md` + `skills/develop-*/SKILL.md` (non-vacuity: `=== 1`); in each of the five citation sites, no line pairs `restore|restores|restoring|runs the command` with `loop-limit\|not-converging` or `no re-entry grant`; each site contains `Restore the lock (both resume paths)`. The grant-offer rule (contract § Re-entry step 3, SKILL.md Re-entry paragraphs) keeps its token and is not in the checked sites
- [x] Mutation-prove: remove the marker → red; paste the old Phase 0b sentence back → red; paste develop-bug's "no re-entry grant — …" sentence back → red

**Dependencies**: Phase 1 (the contract file is edited by both — land 1 first)

### Phase 5: gate-6 futures

**Risk Level**: Low

**Files**: `shared/resources/advance-pipeline-lock.sh` (+ test), `grant-qa-cycles.sh` (+ test), `develop-pipeline-step-8-commit.md`, `skills/develop-{task,story,bug}/SKILL.md` (lint call sites), `develop-pipeline-hooks.md`.

**Changes**:
- [x] `--restore --which`: print the winning candidate, exit 1 on none; no writes
- [x] `grant-qa-cycles.sh`: guard reads the budget from the `--which` result
- [x] `--restore` refuses a directory-less snapshot without `--accept-legacy`; Step 8 deletes a sole legacy snapshot — the "sole" count is a nullglob-guarded `for f in <snapshot> <claim-glob>; do [ -e "$f" ] && n=$((n+1)); done`, never `ls <path> <glob> | wc -l`; add the fence to `halt-snippet-glob-safe.test.mjs`'s population if step-8 is not already in it
- [x] Lint call sites: `rc=$?; case $rc in 0) ;; 1) …;; 2) …;; *) …;; esac` at the three inline sites — fenced and HALTing at (1) Step Transition action 2 and (4) step-8; **one-line and warn-only** at (2) the HALT rule (`SKILL.md` "Commit the report before any halt"), which must keep proceeding to the snapshot and lock removal
- [x] Tests for each; `npm run bundle`; CHANGELOG

**Dependencies**: Phase 4 (SKILL.md edits)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-resume-contract.md` — base binding, HALT, stderr labels, Consume Output delete, Phase 0b citation
2. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — report-only stale snapshot
3. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — §0b citation
4. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` — Step 0-lock citation; Step 0a citation of the contract's delete (no loop copy); lint call-site exit split at sites (1) and (2)
5. ✅ `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` — dispatch mark
6. ✅ `shared/resources/advance-pipeline-lock.sh` — `--which`, `--accept-legacy`
7. ✅ `shared/resources/grant-qa-cycles.sh` — guard on the chosen candidate
8. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — legacy snapshot deletion; lint exit split

### Files to Modify (Tests)

9. ✅ `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` — `DISPATCH` regex + non-vacuity assertion + floor (population unchanged)
10. ✅ `shared/resources/tests/who-restores-single-statement.test.mjs` — new
11. ✅ `shared/resources/tests/probe-base-binding.test.mjs` + `tests/fixtures/probe-base/{table-row,branch-model-line,neither}.md` — new
12. ✅ `shared/resources/advance-pipeline-lock.test.sh`, `grant-qa-cycles.test.sh` — `--which`, legacy refusal, guard source
13. ✅ `evals/develop-task/step-isolation/17-resume-no-base-row-halts/` — new fixture; `16-…` re-recorded
14. ✅ `shared/resources/tests/halt-snippet-glob-safe.test.mjs` — step-8's legacy-snapshot fence in the population, if not already
15. `package.json` — **no change**: `shared/resources/tests/*.test.mjs` is already globbed by `npm test`

### Files to Modify (Documentation)

16. ✅ `shared/resources/develop-pipeline-hooks.md`, `develop-pipeline-pause.md` — `--which`, `--accept-legacy`, delete ownership
17. ✅ `CHANGELOG.md` — `[Unreleased]` entry
18. ✅ `skills/*/references/` — regenerated by `npm run bundle`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: probe base binding (executed); `advance-pipeline-lock.sh --which` / `--accept-legacy`; `grant-qa-cycles.sh` guard source; who-restores single-statement; population pattern.

**Actions**:
- probe base: the contract's `BASE_BRANCH=` block, extracted and executed under bash and zsh with `gh` stubbed, binds `develop` from a table row, `main` from a `**Branch model:**` line, and exits 1 with the HALT text on neither — no `git checkout` in any case
- `--which` prints the same path `--restore` would consume (assert by running both on one fixture); exit 1 on none; leaves the tree untouched
- guard reads the newer `.pausing.*` claim's budget when it wins over the snapshot
- legacy snapshot refused / accepted with the flag
- who-restores: exactly one marker; a re-added restatement (token-bearing or develop-bug's token-free one) is red; the grant-offer prose is not in the checked sites
- population: the widened `DISPATCH` regex matches the develop-bug step-3 line (non-vacuity); removing its mark is red

**Command**: `npm test` (the per-suite globs) and `npm run ci:fast`

**Target**: every new branch mutation-proven (revert → red), recorded per the mutation-proving reference.

### Integration Tests

**Scope**: replay fixtures 16 (orchestrator-owned delete, verified after the detector event) and 17 (develop-task resume, report without the base row, no PR → HALT).

**Actions**: `npm run eval:develop-task`; fixture 17 asserts the HALT text naming both shapes and no `git checkout HEAD` in the transcript. Replay fixtures are recordings and prove nothing on a revert — the executed unit tests above are the mutation proofs; the fixtures are the end-to-end record.

### Contract Tests

**Scope**: bundle parity (`npm run bundle:check`), `qa-loop-lock-fields-parity`, `mutation-call-site-coverage`.

### Performance Tests

Not applicable — one additional `sed` per resume.

### Consumer Tests

**Scope**: there is no `evals/develop-bug`, so the consumer check is Step 4b (`qa-execute-snippets.mjs`) over the contract, the detector prompt, develop-bug step 3 and step-8 under bash and zsh.

---

## 9. Success Criteria

### Functional

- [x] A bug-variant report with base `main` binds `BASE_REF=origin/main`; no report shape → HALT, nothing discarded — proven by an executed test, not a recording
- [x] `gh` failure and "no PR" produce different stderr lines
- [x] develop-bug Step 3's dispatch is marked and matched by the tested regex
- [x] A MERGED snapshot is deleted by the orchestrator, from one stated loop, and asserted absent before Phase 0b
- [x] The who-restores rule carries one marker; the five citation sites carry no restore-verb rule text (token-bearing or not); the grant-offer prose is untouched
- [x] The grant's guard reads the candidate `--restore` will choose
- [x] A directory-less snapshot is refused without `--accept-legacy` and deleted by Step 8 when sole

### Performance

- [x] Resume cost unchanged beyond one `sed` and one `--which` read

### Code Quality

- [x] Every new branch mutation-proven; `npm run ci:fast` and `eval:develop-task` green; `bundle:check` 0 problems; shellcheck clean

### Migration

- [x] CHANGELOG `[Unreleased]` names the HALT and the legacy-snapshot refusal
- [x] `task.124.pr-review.1` CR-1..CR-5 and gate-6 futures referenced as closed in this task's implementation report

---

## 10. Risk Assessment

### High Risk Areas

**1. The base HALT fires on legitimate old reports**
- Risk: every report written before task.124 (`86ebcade`, 2026-09-19) lacks the row — all five under `docs/tasks/` today; a resume on one with no PR now halts
- Probability: Low (no lock or halt snapshot is on disk — no such run is in flight)
- Impact: Medium — a one-line manual edit
- Mitigation: the HALT message names the row to add
- Rollback: Phase 1 revert restores the default

### Medium Risk Areas

**1. Collapsing restatements loses a qualifier**
- Risk: a citation drops a pipeline-specific detail (develop-bug has no grant)
- Mitigation: the one statement keeps every qualifier task.124 cycle 5 added; the test is non-vacuous
- Rollback: Phase 4 revert

**2. Three edits to the resume contract in one task**
- Risk: Phases 1, 3 and 4 all edit the file; a merge of one without the others
- Mitigation: land Phase 1 first; one PR

### Low Risk Areas

**1. `--which` and `--restore` disagree** — both call the same candidate function; the test asserts equality on a shared fixture.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a resume HALTs on a report the pipeline itself wrote; the population test goes red on `develop` for a site that is marked.

**Steps**:
1. `git revert` the task's merge commit
2. `npm run bundle && npm run ci:fast`

**Verification**: `eval:develop-task` fixtures 13–16 green; `--restore` behaviour as at `62945d68`.

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves (e.g. the HALT) while the others are sound.

**Steps**: revert that phase's hunks in the contract; re-bundle; keep the tests that still pass.

### Forward Fix (< 4 hours)

**When to Use**: a label wording or a fixture expectation.

**Approach**: fix forward with a mutation proof.

### Rollback Triggers

**Critical (Immediate Rollback)**: a probe discard on a file that is not an overlay.

**Non-Critical (Forward Fix)**: message wording; a citation the test misreads.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-20 | 1.0 | Initial draft — follow-ups from task.124 / PR #436 (5c review CR-1..CR-5, gate-6 futures, obs #132) | create-task |
| 2026-09-20 | 1.1 | Review 1 (8/10, 0 critical / 7 important): who-restores test re-keyed on a marker (token shared with the grant-offer rule; develop-bug restates without it); Phase 1 gains an executed base-binding test, fixture 17 re-scoped to the develop-task HALT case; base-row date corrected to task.124 (no existing report carries it); Phase 2 regex-only (site already in the derived population); step-8 legacy count made glob-safe; lint site (2) one-line warn-only; delete loop stated once in the contract; effort 8h → 16h | review-task |
| 2026-09-20 |  | Status → ready-for-development | review-task |
| 2026-09-20 |  | Implemented — 26 source/doc files, 4 new + 4 extended test suites (+46 tests), fixtures 16 re-recorded and 17 added; 3 plan snippets corrected by execution | develop |
| 2026-09-20 |  | QA gate CONCERNS (85/100) — 2 medium findings (bugs 1–2), 3 low advisory | qa-task |
| 2026-09-20 |  | QA findings fixed — bugs 1–2 (trailing --which; fail-closed delete loop) + CR-3..CR-7 advisories, 1 iteration; +9 tests, all mutation-proven | qa-fix |
| 2026-09-20 |  | QA gate 2 FAIL (70/100) — bugs 1–2 verified fixed; refute pass: 1 HIGH (delete selector matches skip notes), 2 MEDIUM (path containment; DETECTOR_JSON binding/order); bugs 3–5 | qa-task |
| 2026-09-20 |  | QA findings fixed — bugs 3–5 (exact-label selector; path containment; single DETECTOR_JSON binding + validation-gated delete) + CR-5..CR-8, 2 iterations; +10 tests, all mutation-proven | qa-fix |
| 2026-09-20 |  | QA gate 3 CONCERNS (80/100) — bugs 3–5 verified fixed; safety re-probe: 0 HIGH, 3 MEDIUM (string note HALTs; output file unwritten; label trusted without re-read), 3 LOW; bugs 6–8 | qa-task |
| 2026-09-20 |  | QA findings fixed — bugs 6–8 (object-shaped notes; persisted detector JSON; on-disk evidence re-read before rm) + CR-4..CR-7, 3 iterations; +8 tests, all mutation-proven | qa-fix |
| 2026-09-20 |  | QA gate 4 FAIL (70/100) — bugs 6–8 verified fixed; scoped review: 1 HIGH (delete block reads the previous fence's variable — fresh shell HALTs), 2 MEDIUM (four string-note sites; empty pr_url reads the current branch); bugs 9–11 | qa-task |
| 2026-09-20 |  | QA findings fixed — bugs 9–11 (delete block re-binds from the persisted file; empty pr_url kept before gh; note-object shape stated once, every site an object) + CR-4..CR-5, 4 iterations; +5 tests, all mutation-proven | qa-fix |
| 2026-09-20 |  | QA gate 5 CONCERNS (85/100) — bugs 9–11 verified fixed; safety re-probe: 0 HIGH, 1 MEDIUM (three orchestrator citations describe a prefix delete), 6 advisory; bug 12 | qa-task |
| 2026-09-20 |  | QA findings fixed — bug 12 (three orchestrator citations name the exact delete label; test D reads the citation content), 5 iterations; +2 assertions, mutation-proven | qa-fix |
| 2026-09-20 |  | QA gate 6 CONCERNS, no open entry (90/100) — granted cycle; bug 12 verified fixed; 0 HIGH, 0 MEDIUM, 1 cleanup; advisory residue carried to a follow-up; handed to 5c | qa-task |
| 2026-09-20 |  | Step 5c review-pr CONCERNS (PC-2 six Change Log rows restored; PC-3 task.131/132 docs accepted; CR-1 --accept-legacy stamp → bug 13); QA findings fixed — bug 13, cycle 7; +3 scenarios, mutation-proven | qa-fix |
| 2026-09-20 |  | QA gate 7 PASS (92/100) — last granted cycle; bug 13 verified fixed; 0 HIGH, 0 MEDIUM, 1 LOW carried (route 2b); Deferred Work recorded; handed to 5c | qa-task |
| 2026-09-20 | 1.2 | DoD passed — accepted (PR #441); security probe recorded as unverified-by-engine (shell boundary), accepted on QA-executed evidence | finalise |
<!-- change-log-end -->

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.130.qa.7.resume-residue-bug-variant-base-and-who-restores.md` (7 cycles; loop limit at 5, two granted)
**Gate File**: `task.130.gate.7.resume-residue-bug-variant-base-and-who-restores.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 92/100
**Step 5c**: `task.130.pr-review.1.…md` — APPROVE on re-check

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 11/11 met, each with code and per-PR-lane test citations
✅ **Tests:** 3574 node tests + shell suites (91/42) + 13 eval replays; five new/extended suites; every fix mutation-proven
✅ **PR Review:** PR #441 — 5c conformance + code lenses, APPROVE on re-check; CI 5/5 SUCCESS on `d4d29bb4`
✅ **Documentation:** CHANGELOG entry with both Breaking markers; contract, detector prompt, step-0/8, hooks, pause and three orchestrator SKILL.md updated; bundle in sync
⚠️ **Security Review:** checks PASS (no secrets, no unsafe patterns, gated single-path deletes); probe mode **unverified by the engine** — both boundaries are shell and `security-probe.mjs` imports only ES modules (`totals.executed: 0`). Accepted by the operator on the recorded executed evidence: QA gates 3/5/7 ran the delete block and `--restore` under bash and zsh against 74 enumerated inputs, no hostile input accepted, no legitimate input refused. Follow-up: a shell-capable probe sink.
✅ **Compliance Review:** NOT_APPLICABLE — internal refactor
✅ **Bugs:** 13 filed across the loop, all Closed

**Deferred Work:** see § Notes › Deferred Work (one follow-up task).

**Task marked as ACCEPTED on:** 2026-09-20

**Detailed Verification Log:** See `task.130.dod.1.resume-residue-bug-variant-base-and-who-restores.md` for complete verification evidence and timestamps.

## Bug Reports

### Open Bugs

None.

### Closed Bugs

- [Bug 1](./task.130.bug.1.restore-trailing-which-flag-consumes.md) - ✅ Closed (QA cycle 2)
- [Bug 2](./task.130.bug.2.stale-snapshot-delete-loop-silent-on-broken-input.md) - ✅ Closed (QA cycle 2)
- [Bug 3: delete selector matched the skip notes](./task.130.bug.3.delete-selector-matches-skip-notes.md) - ✅ Closed (verified QA cycle 3)
- [Bug 4: no path containment](./task.130.bug.4.delete-loop-no-path-containment.md) - ✅ Closed (verified QA cycle 3)
- [Bug 5: `DETECTOR_JSON` binding / validation order](./task.130.bug.5.detector-json-never-bound-and-validation-order.md) - ✅ Closed (verified QA cycle 3)
- [Bug 6: bare-string note HALTs a healthy resume](./task.130.bug.6.bare-string-delta-halts-healthy-resume.md) - ✅ Closed (verified QA cycle 4)
- [Bug 7: detector output file had no writer](./task.130.bug.7.detector-output-file-has-no-writer.md) - ✅ Closed (verified QA cycle 4)
- [Bug 8: delete trusted the label without re-reading evidence](./task.130.bug.8.delete-trusts-detector-label-without-rereading-evidence.md) - ✅ Closed (verified QA cycle 4)
- [Bug 9: delete block read the previous fence's variable](./task.130.bug.9.delete-block-reads-variable-from-previous-fence.md) - ✅ Closed (verified QA cycle 5)
- [Bug 10: four bare-string note sites](./task.130.bug.10.remaining-bare-string-note-sites.md) - ✅ Closed (verified QA cycle 5)
- [Bug 11: empty `pr_url` read the current branch](./task.130.bug.11.empty-pr-url-reads-current-branch.md) - ✅ Closed (verified QA cycle 5)
- [Bug 12: three orchestrator citations described a prefix delete](./task.130.bug.12.orchestrator-citations-describe-prefix-delete.md) - ✅ Closed (verified QA cycle 6)
- [Bug 13: `--restore --accept-legacy` did not stamp the directory](./task.130.bug.13.accept-legacy-restore-does-not-stamp-directory.md) - ✅ Closed (verified QA cycle 7)

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-20
**Quality Score**: 92/100
**Gate Decision**: PASS (one LOW carried — Cosmetic-residue exit, route 2b)

### QA Report
- **Full Report**: [task.130.qa.7.resume-residue-bug-variant-base-and-who-restores.md](./task.130.qa.7.resume-residue-bug-variant-base-and-who-restores.md)
- **Gate File**: [task.130.gate.7.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.7.resume-residue-bug-variant-base-and-who-restores.yml)

### Test Coverage Summary
- **Tests Executed**: 3574 node tests + shell suites (91, 42); eval:develop-task 13/13
- **Phases Verified**: 5/5
- **Critical Issues**: 0 HIGH, 0 MEDIUM; bug 13 verified fixed (all 13 bugs closed)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 7 (last granted; scoped to the Step 5c fix): bug 13 FIXED — an `--accept-legacy` restore stamps `task_or_story_directory` and the recovery survives the next pause (executed end to end under both shells; stamp mutation → 4 red). One LOW (QA-14: the no-overwrite scenario is vacuous) carried to the gate's `recommendations.future`; CR-2 header-contract cleanup for the follow-up. Step 5c had returned CONCERNS (PC-2 six Change Log rows restored; PC-3 task.131/132 docs accepted; CR-1 → bug 13). HIGH sequence 0, 1, 0, 1, 0, 0, 0. Gates: 1 CONCERNS 85 · 2 FAIL 70 · 3 CONCERNS 80 · 4 FAIL 70 · 5 CONCERNS 85 · 6 CONCERNS 90 (no open entry) · 7 PASS 92.

## Progress Tracking

- [x] Phase 1: probe base
- [x] Phase 2: dispatch mark + population
- [x] Phase 3: orchestrator-owned delete
- [x] Phase 4: one statement of who restores
- [x] Phase 5: gate-6 futures
- [ ] QA: `task.130.qa.[N].resume-residue-bug-variant-base-and-who-restores.md`
- [ ] Gate: `task.130.gate.[N].resume-residue-bug-variant-base-and-who-restores.yml`

## References

- `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.pr-review.1.pipeline-resume-lifecycle-hygiene.md` — CR-1..CR-5
- `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.gate.6.pipeline-resume-lifecycle-hygiene.yml` — `recommendations.future`
- Observation #132 (who-restores enumeration); task.124 bugs 9, 11, 12, 13
- `docs/reference/anti-patterns.md` — enumeration class

## Notes

### Deferred Work

Carried out of the QA loop by the Cosmetic-residue exit (route 2b, gate 7) and the Step 5c review — none gates; one follow-up task should take them together:

- **TASK-130-QA-14** (LOW, gate 7) — `advance-pipeline-lock.test.sh` "keeps its own directory" scenario is vacuous; seed a canon-equal, textually different spelling.
- Gate-7 CR-2 — `--restore` header contract, `develop-pipeline-pause.md:80`, `grant-qa-cycles.sh:52-54` do not mention the directory stamp.
- Gate-6 CR-1 — test D's negative regex is a word-list heuristic; the exact-label match is the floor.
- Gate-5 CR-2 (conditional main clause at the four `--restore` citation sites), CR-3 (detector prompt Step 1 candidate selection vs `choose_candidate()`), CR-5 (silent skip of an unrecognised `stale-snapshot`-prefixed label), CR-6 (one rc=2 message for the four lint sites), CR-7 (quote `{doc-directory}`).
- Detector prompt `:80` — `ls … .pausing.*` never runs under zsh `nomatch` (pre-existing on develop).
- 5c CR-2 — `advance-pipeline-lock.sh:202` prints the `--accept-legacy` advice for a bystander legacy snapshot even when the restore succeeds from a matched claim; 5c CR-3 — the contract delete block's Pass 2 reports an unparsable snapshot and a directory-less object with the same `'absent'` HALT text.
- 5c PC-2 root cause — the `change-log.js` repair at `fdba78d9` dropped six rows; check the upsert's handling of a corrupted block.
- 5c PC-3 — task.131/132 planning documents ride in PR #441 (accepted).

- QA artifacts land beside this file: `task.130.qa.[N].*.md`, `task.130.bug.[N].*.md`, `task.130.gate.[N].*.yml`.
- Independent of tasks 128 and 129 (both `planned`); shares no file with 129, and touches `probe-boundary-rule.md` not at all.

### Implementation notes (develop, 2026-09-20)

**Implementation summary.** All five phases landed as planned, in one PR, each with an executed test mutation-proven red on revert (proofs recorded in the implementation report's Step 3 entry). Three plan snippets were found wrong *by executing them* and corrected before commit:

1. **Phase 3 — the piped `while` swallowed the HALT.** The plan's `printf | jq | while … exit 1; done` runs the loop body in a subshell under bash, so `exit 1` ended the subshell and the block carried on past the HALT (zsh runs the last pipeline stage in the current shell, which is why it passed there). The one statement now reads from a process substitution; `stale-snapshot-delete.test.mjs` case C is what found it. *(QA cycle 1, bug 2: the list is now materialised first with jq's exit checked and read from a here-string; an unbound `DETECTOR_JSON`, a non-array `deltas_since_pause` or a jq failure HALTs — cases E/F/G. QA cycle 2, bugs 3–5: the selector is now the exact label `.concern == "stale-snapshot: PR merged"` — the task's Phase 3 checklist text above still shows the original `startswith` form as written; the detector's two skip notes share that prefix and must never be acted on — the path is contained to the canonical snapshot, and the schema-check block binds `DETECTOR_JSON` and owns the array check; cases H–K. QA cycle 3, bugs 6–8: the orchestrator persists the returned detector JSON to `.summaries/step-0a-resume-detector.json` and binds from it; every detector note is an object; the delete re-reads the snapshot's directory and its PR's MERGED state from disk before `rm`, in a validate-all-then-delete shape; cases K–O. QA cycle 4, bugs 9–11: the delete block re-binds from the persisted file itself — every orchestrator Bash call is a fresh shell, so a variable set by the bind fence does not exist in the delete fence — and HALTs only when the file is absent; an empty `pr_url` keeps the snapshot before any `gh` call (`gh pr view ""` reads the current branch); the note-object shape is stated once in the detector prompt's field table and every site is an object; the test suite carries the JSON by file only and runs the two blocks in two processes; cases E/N2/P/Q. QA cycle 5, bug 12: the three orchestrator citations name the exact label the selector acts on, and test D reads the citation's content rather than only its presence. Step 5c review CR-1, bug 13: an `--accept-legacy` restore stamps `task_or_story_directory` on the rebuilt lock so the recovery sticks; the PR review also restored six Change Log rows dropped at `fdba78d9`.)*
2. **Phase 5 — the "nullglob-guarded" loop had no nullglob guard.** `for f in <path> <glob>` aborts under zsh's `nomatch` exactly as `ls <path> <glob> | wc -l` does; `halt-snippet-glob-safe.test.mjs` F1 caught it with `no matches found`. Step 8 counts claims with `find`, the form `advance-pipeline-lock.sh` already uses.
3. **Phase 1 — the stderr label could not split on exit status alone.** `gh pr view` exits 1 both for a failing `gh` and for a branch with no PR (`no pull requests found`), so the plan's `if [ "$GH_RC" -ne 0 ]` would have labelled every PR-less branch a `gh` failure. The split reads gh's stderr text as well.

Two test-design corrections: Phase 2's "≥1 line of the file matches" non-vacuity was vacuous (the file's triage dispatch already matched `subagent_type=`), so the assertion is anchored to the root-cause line itself; and the stale-snapshot test's extractor was first keyed on the `rm`/`select` tokens under proof, which made every mutation red for the wrong reason (a missing block), so it keys on the block's comment line. Phase 2's site floor is 17 (measured), not 12.

**Testing.** `npm run ci:fast` 3542/3542 node tests + every shell suite (advance-pipeline-lock 75, grant-qa-cycles 42); `npm run eval:develop-task` 17/17 fixtures including new 17 and re-recorded 16; `bundle:check` 0 problems; `lint:shell` clean; Step 4b classifier over the four edited documents — the one finding (detector prompt line 69, `cat` of an absent lock) is identical on `develop` and out of scope. New suites: `probe-base-binding` (11), `stale-snapshot-delete` (7), `who-restores-single-statement` (4), `report-lint-call-sites` (3); extended: `halt-snippet-glob-safe` (+6), `qa-loop-lock-fields-parity`, `advance-pipeline-lock.test.sh` (+10), `grant-qa-cycles.test.sh` (+5).

**Deferred.** None. Out of scope (unchanged): gate-6's third future (step-0's zero executed blocks), the grant-offer prose, tasks 128/129.
