---
id: task.160
title: "[Task 160] Step 8 check 4 allowlists finished rows instead of denying two unfinished ones"
type: task
description: "Step 8 check 4 refuses only `⏳ Pending` and `⏸ Paused`, so `❌ Failed`, `⚠️ Needs Attention` and `🔄 In Progress` rows pass it, and a header-only table satisfies its no-table guard. Replace the deny-list with an allowlist (a Status cell starting with `✅`, or `⏭️ Skipped`) located by header, and make Step 8's own row update land before its commit so checks 4 and 5 can both hold."
tags: [develop-pipeline, step-8, completion-checklist, follow-up]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-27
updated: 2026-09-27
assignee:
estimated_effort_hours: 16
github_issue: 498
---

# Technical Task: Step 8 check 4 allowlists finished rows instead of denying two unfinished ones

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.160.review.1.step-8-check-4-allowlists-finished-rows.md` implemented 2026-09-27

**GitHub Issue**: [#498](https://github.com/Gamaroff/agent-skills/issues/498)

---

## 1. Overview

Task 159 scoped Step 8 check 4 to the Pipeline Progress table's Status cells. Check 4 still names the unfinished states it refuses (`⏳ Pending`, `⏸ Paused`), so a Status the list does not name passes. This task inverts it: check 4 accepts only a finished Status, and refuses everything else. Finished means a cell starting with `✅` or reading `⏭️ Skipped`. It also makes a header-only table fail, and it fixes Step 8's own ordering so a correct run can satisfy check 4 and check 5 at the same time.

**Scope**: check 4 in `shared/resources/develop-pipeline-step-8-commit.md` (and its three bundled copies), two post-commit report edits in the same document, new cases in `shared/resources/tests/step-8-completion-checklist.test.mjs`, and a CHANGELOG entry. Source: task.159 `gate.1` `recommendations.future` (CR-1, CR-2) and `pr-review.1`.

**Key deliverables**:

1. Check 4 finds the Status column by its header and fails any step row whose Status is not `✅…` or `⏭️ Skipped`
2. Check 4 fails a table with a header and no step rows, and a table with no `Status` column, each with its own message
3. Step 8 sets its own row and the report's final fields **before** `/commit-changes`, and edits nothing after it
4. Executed bash + zsh cases for every refused and accepted shape, each branch mutation-proved

---

## 2. Motivation

### Current Problems

1. **A deny-list passes every state it forgot.** Check 4 refuses a Status cell only when it reads `⏳ Pending` or `⏸ Paused`. The step transition protocol names four row states (`✅ Done / ❌ Failed / ⚠️ Needs Attention / ⏸️ Paused`), and the corpus also carries `🔄 Cycle 3` and `⚠️ HALT`. A run can reach the Step 8 completion banner with a `❌ Failed` row. The same document says to emit that banner only when every step is ✅ ("Ensure the Pipeline Progress table shows ✅ for all steps").
2. **A header-only table passes the no-table guard.** The guard tests that at least one `|` line exists. The header and `| --- |` separator lines satisfy it, so a table with no step rows reads as a table with no unfinished rows: "found nothing" and "had nothing to look at" produce the same pass.
3. **Step 8 cannot be followed as written.** The document tells the orchestrator to set every row ✅ before `/commit-changes` (§ Final Implementation Report Update). It then tells it to write `Committed in {hash}` into Step 8's Notes after the commit (§ Invoke /commit-changes) and to mark `✅ commit-changes` after the push (§ Final Push). Both late edits dirty the report, which check 5 (`verify-push-state.sh`, clean within scope) then refuses. An orchestrator that follows the late edits and skips them in the commit leaves `⏳ Pending` in the committed report. Measured result: 15 of the 123 committed completed reports carry a `⏳ Pending` row, 14 of them Step 8's own (command in § 3).

### Benefits of an allowlist

- Check 4 makes the claim the step document makes: every step is finished. It no longer claims only that two named states are absent
- A Status nobody anticipated fails by default rather than passing by default
- An empty table is a failure with its own message, not a vacuous pass
- A correctly-run Step 8 can pass its own checklist without an improvised reorder

---

## 3. Technical Background

### Current Architecture

- **Check 4** lives in the `## Step 8 Completion Checklist` fenced block of `shared/resources/develop-pipeline-step-8-commit.md`, anchored at `# 4. The Pipeline Progress TABLE has no unfinished row`. It has three parts:
  - awk collects the `|` lines under `## Pipeline Progress` into `PROGRESS_ROWS`.
  - `[ -n "$PROGRESS_ROWS" ]` is the no-table guard.
  - `grep -qE '\|[[:space:]]*(⏳[^|[:alnum:]]*Pending|⏸[^|[:alnum:]]*Paused)[[:space:]]*\|'` refuses a Status cell reading Pending or Paused (task.159, Status-cell match).

  `npm run bundle` copies it into `skills/{develop-story,develop-task,develop-bug}/references/`.
- **The Status column moves between variants.** In the Story and Task variants of `shared/resources/implementation-report-template.md` the header is `| Step | Status | Required Artifacts | Notes | Subagent summary ref |`, with Status in the 2nd cell. In the Bug variant it is `| Step | Skill | Status | Notes | Subagent summary ref |`, with Status in the 3rd. A fixed column index is wrong for one of them; the header row is the only reliable locator.
- **The executed harness** is `shared/resources/tests/step-8-completion-checklist.test.mjs` (tasks 147 and 159). It cuts the whole checklist block out of the shipped document and runs it in a fixture repo under every shell in `SHELLS`, with reports built from the template (`finished(variant)`). It already has `setRow`, `setNotes` and `withoutProgressTable`. Task 160 adds cases to it and builds no new harness.
- **The same-class mechanism** is task.159's Status-cell `grep`, which this task **replaces**; it does not sit beside it. No other skill, document or test restates check 4. To confirm, grep the tracked tree for `PROGRESS_ROWS`.

### What finished Status cells look like, measured

Definition: every tracked `*.implementation.*.md` whose `**Final Status**` reads `Completed` or `Accepted`. For each, read the cell under the header named `Status` in each step row of `## Pipeline Progress`. The command that produced the figures below is the prototype in the plan's Phase 2, run over `git ls-files '*.implementation.*.md'`. The test does not re-measure these figures; they justify the allowlist's shape:

- Finished cells come in more than 20 shapes: `✅ Done` (the large majority), bare `✅`, `✅ Complete`, `✅ Done (PASS 100/100)`, `✅ Done — PR #53`, `✅ Skipped (gate PASS, no fixes needed)`, `⏭️ Skipped`, and more. **An exact-match `✅ Done` allowlist would fail most finished runs.**
- The prototype allowlist and today's check fail **the same 17 reports**; the allowlist fails **no** report today's check passes. 15 of the 17 are leftover `⏳ Pending` rows, which is Problem 3. The other 2 are eval replay fixtures with no table at all (`evals/develop-{story,task}/step-isolation/08-commit-changes/replay/…`). bash and zsh agree on all 123.

### Target Architecture

```bash
# 4. Every step row in the Pipeline Progress TABLE is finished. The Status column is found by
#    its header (Task/Story: 2nd cell, Bug: 3rd), never by index. Finished = a Status cell that
#    starts with ✅ (any trailing detail), or reads ⏭️ Skipped. Everything else fails, including
#    ⚠️ Needs Attention, ❌ Failed, 🔄 …, an empty cell and anything not yet named. A table with
#    no Status column, or with no step rows under its header, fails too.
PROGRESS_ROWS=$(awk '/^## Pipeline Progress[[:space:]]*$/ { f = 1; next } f && /^## / { exit } f && /^\|/' "$REPORT")
[ -n "$PROGRESS_ROWS" ] || { echo "❌ Step 8 incomplete: no Pipeline Progress table found in $REPORT"; exit 1; }
UNFINISHED=$(printf '%s\n' "$PROGRESS_ROWS" | awk -F'|' '
  NR == 1 { for (i = 2; i < NF; i++) { c = $i; gsub(/^[[:space:]]+|[[:space:]]+$/, "", c); if (c == "Status") col = i } ; next }
  /^\|[-:[:space:]|]+$/ { next }
  !col { next }
  { n++; s = $col; gsub(/^[[:space:]]+|[[:space:]]+$/, "", s)
    if (s ~ /^✅/ || s ~ /^⏭[^|[:alnum:]]*Skipped$/) next
    print }
  END { if (!col) print "no Status column in the header row"; else if (!n) print "no step rows under the header" }') \
  || { echo "❌ Step 8 incomplete: could not read the Pipeline Progress table in $REPORT (awk exited non-zero)"; exit 1; }
[ -z "$UNFINISHED" ] || { echo "❌ Step 8 incomplete: Pipeline Progress has a row that is not finished (✅ or ⏭️ Skipped):"; printf '   %s\n' "$UNFINISHED"; exit 1; }
```

The final form is the developer's call, within the constraints in § 9. The awk program must keep its braces spaced (an unspaced `{exit}` reads as a `{placeholder}` to the harness's `bind()` and to an agent). It must stay free of apostrophes and GNU-only escapes, because it runs under zsh and BSD awk.

Two lines in it are load-bearing under BSD awk, and review found the task's first draft without them. **`!col { next }`**: with no `Status` header cell, `col` is unset, and `$col` is then `$""`, which BSD awk rejects as a fatal `illegal field $()`. The `END` block never runs, and the check would print nothing. **The `|| { … exit 1; }` on the assignment**: a command substitution discards its exit status unless something reads it, so any awk runtime error would leave `UNFINISHED` empty and read as "no unfinished rows". The check fails closed instead. Both were reproduced under bash and zsh before the fix (review.1).

### Important Clarifications

- **Why `⏭️ Skipped` and not every `⏭`-prefixed cell.** The corpus carries `⏭️ Skipped` exactly, on four rows (tasks 26 and 46). `⏸️ Skipped` (one row, story.3.2) is **not** admitted. The pause glyph means paused, and a writer that used it for a skip should write `✅ Skipped` or `⏭️ Skipped`.
- **Why `⚠️ Needs Attention` fails.** Decided with the author at authoring time: the step document requires ✅ on every step before the completion banner, and a flagged row is unresolved.
- **Why Step 8 stops editing the report after its commit.** A record of the commit cannot live inside the commit it records without a further commit. This is the same reasoning `/finalise` gives for CI reading 2. The `Committed in {hash}` note moves to the orchestrator's final user-facing output, and `git log` is the record.

---

## 4. Scope

### In Scope

✅ Check 4 in `shared/resources/develop-pipeline-step-8-commit.md`, and its three bundled copies via `npm run bundle`
✅ The post-commit report edits in the same document: remove the `Committed in {hash}` Notes write after `/commit-changes`, and move `Update Pipeline Progress: ✅ commit-changes` to before it
✅ New executed cases in `shared/resources/tests/step-8-completion-checklist.test.mjs`
✅ A CHANGELOG `[Unreleased]` entry citing (task 160)

### Out of Scope

❌ Rewriting the 15 committed reports that carry a leftover `⏳ Pending` row. They are history, and check 4 only runs at a live Step 8
❌ Normalising the 20+ finished Status shapes to one spelling. The allowlist accepts them as they are
❌ The two eval replay fixtures with no Pipeline Progress table. Their eval does not execute the checklist; making it do so is a separate change
❌ develop-bug's own Step 8 prose outside the shared step document

---

## 5. Breaking Changes

**None for a report that was finished.** Four behaviours tighten on purpose:

1. **A row at `❌ Failed`, `⚠️ Needs Attention`, `🔄 …`, `⏸️ Skipped`, or with an empty Status now fails check 4.** Before, only `⏳ Pending` and `⏸ Paused` did. Migration: finish the step and write a `✅` Status (with any detail), or `⏭️ Skipped` for a step that legitimately did not run. The failure message prints the offending row.
2. **A Pipeline Progress table with a header and no step rows now fails.** Migration: none for template-built reports, which always carry the step rows.
3. **A Pipeline Progress table with no `Status` header cell now fails.** Every template variant has one. Migration: a hand-built report must name the column `Status`.
4. **Step 8 no longer writes `Committed in {hash}` into the report.** Migration: none. The hash is in `git log` and in the orchestrator's completion output.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.160.plan.step-8-check-4-allowlists-finished-rows.md](task.160.plan.step-8-check-4-allowlists-finished-rows.md)

### Phase 1: Tests first (red on today's check 4)

**Risk**: Low · **Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`

- [x] `[sh]` a finished report whose Status cells use the corpus's finished shapes passes: bare `✅`, `✅ Complete`, `✅ Done (PASS 100/100)`, `✅ Skipped (gate PASS)` and `⏭️ Skipped`
- [x] `[sh]` a row at each of `❌ Failed`, `⚠️ Needs Attention`, `🔄 Cycle 3`, `⏸️ Skipped` and an empty Status fails check 4, and the message prints that row. Red on today's check 4
- [x] `[sh]` a Bug-variant report (Status in the 3rd cell) with one unfinished row fails, and a finished one passes. This proves the header lookup, not a fixed index. Red on today's check 4
- [x] `[sh]` a table with its header and separator but no step rows fails, naming `no step rows`. Red on today's check 4
- [x] `[sh]` a table whose header has no `Status` cell fails, naming `no Status column`. Red on today's check 4, and red on the § 3 draft without `!col { next }` (awk aborts and the check passes)
- [x] The task.159 cases (paused-and-resumed passes; Pending, Paused and bare-`⏸` rows fail; Notes that mention a state pass; no table fails) stay green, updated only where the failure message changed

**Dependencies**: none

### Phase 2: Allowlist check 4

**Risk**: Low · **Files**: `shared/resources/develop-pipeline-step-8-commit.md`, `skills/{develop-story,develop-task,develop-bug}/references/develop-pipeline-step-8-commit.md` (bundled)

- [x] Replace check 4 with the allowlist form (§ 3 Target Architecture), keeping the `❌ Step 8 incomplete:` message convention and printing each unfinished row
- [x] `npm run bundle`, then `npm run bundle:check` is clean

**Dependencies**: Phase 1

### Phase 3: Step 8 edits nothing after its commit

**Risk**: Low · **Files**: `shared/resources/develop-pipeline-step-8-commit.md` (+ bundled copies)

- [x] In § Final Implementation Report Update, add the Step 8 row itself to what is set ✅ before `/commit-changes`. Write it as `✅ Done`, the value the orchestrators' Step Transition Protocol (action 2) writes after the step returns, so that later edit changes nothing
- [x] Remove the post-commit `Committed in {hash}` Notes write from § Invoke /commit-changes. Point to the orchestrator's completion output and `git log`, with one sentence of why
- [x] Remove the post-push `Update Pipeline Progress: ✅ commit-changes` line from § Final Push
- [x] `[sh]` case: the checklist passes on a report whose Step 8 row was set ✅ before its commit, with a clean tree. This is the ordering the document now states

**Dependencies**: Phase 2 (same file; land in one commit series)

### Phase 4: Proof and gates

**Risk**: Low · **Files**: `CHANGELOG.md`

- [x] Mutation-prove each branch (§ 9 Code Quality), recording each proof in the implementation report
- [x] CHANGELOG `[Unreleased]` → Fixed, citing (task 160) and naming the four tightenings in § 5
- [x] Gates green (§ 9)

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-8-commit.md`: check 4, and the Step 8 ordering (§ Final Implementation Report Update, § Invoke /commit-changes, § Final Push)
2. ✅ `skills/develop-story/references/develop-pipeline-step-8-commit.md`: bundled copy (generated)
3. ✅ `skills/develop-task/references/develop-pipeline-step-8-commit.md`: bundled copy (generated)
4. ✅ `skills/develop-bug/references/develop-pipeline-step-8-commit.md`: bundled copy (generated)

### Files to Modify (Orchestrators — QA cycle 1, CR-1)

7. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`: the Step 8 summary names the Pipeline Progress update before the commit, Step Transition Protocol action 2 is a no-op after Step 8, and Context Compression Recovery re-runs Step 8 for a resume record at step 8 (QA cycle 4)

### Files to Modify (Resume — QA cycles 2–3, CR2-1 / CR3-1)

8. ✅ `shared/resources/develop-pipeline-resume-contract.md`: a resume whose record (lock, halt snapshot or orphaned claim) is at step 8 re-runs Step 8 — neither the row nor git can tell a paused Step 8 from a finished one; an unfinished row 1–7 still wins (QA cycle 5); `develop-pipeline-step-0-resolve-and-prepare.md` points at the rule; bundled into develop-{story,task,bug}, qa-{fix,story,task}, review-{pr,story,task}

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs`: new executed cases (already in the `npm test` glob `shared/resources/tests/*.test.mjs`)

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md`: `[Unreleased]` Fixed entry

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

Not applicable. Check 4 is a shell block in prose, tested by execution below.

### Integration Tests

- **Scope**: the shipped Step 8 checklist block, cut from the step document and executed in a fixture repo under every shell in `SHELLS`
- **Cases**: every Phase 1 and Phase 3 case. Assert the exit status **and** the `❌` line (or `✅ Step 8 post-conditions verified`), never the exit code alone
- **Fixture fidelity**: reports come from the template (`finished(variant)`), including the **Bug** variant, so a change to either variant's table header reaches the test
- **Command**: `command node --test shared/resources/tests/step-8-completion-checklist.test.mjs`

### Contract Tests

The task.147 and task.159 cases must stay green. Only the unfinished-row message may change, and the assertion changes with it.

### Performance Tests

Not applicable. The check is one awk pass over the table rows.

### Consumer Tests

The three orchestrators consume the bundled copy. `npm run bundle:check` asserts the copies match the source.

---

## 9. Success Criteria

### Functional

- [x] A report whose Status cells use each finished shape (`✅`, `✅ Complete`, `✅ Done (…)`, `✅ Skipped (…)`, `⏭️ Skipped`) passes the Step 8 checklist under bash and zsh. The Phase 2 allowlist branch `s ~ /^✅/ || s ~ /^⏭[^|[:alnum:]]*Skipped$/` returns `next`
- [x] A row at `❌ Failed`, `⚠️ Needs Attention`, `🔄 Cycle 3`, `⏸️ Skipped`, or with an empty Status fails check 4 under bash and zsh, and the output names that row. It falls to the Phase 2 `print` branch
- [x] A Bug-variant report with one unfinished row fails and a finished one passes. The Phase 2 header lookup sets `col` from the header cell named `Status`
- [x] A header-only table fails with `no step rows under the header`. Phase 2 `END` branch: `col` set, `n` is 0
- [x] A table with no `Status` header cell fails with `no Status column in the header row`. Phase 2 `!col { next }` skips the rows, and the `END` branch fires with `col` unset
- [x] A report whose Step 8 row is set ✅ before its commit, with a clean tree, passes the checklist (Phase 3)
- [x] Every existing case in `step-8-completion-checklist.test.mjs` still passes

### Performance

- [x] No measurable change. The check is one awk pass over the table rows

### Code Quality

- [x] Each branch is mutation-proved, with reverting it turning its named case red:
  - the allowlist tested by the old deny-list → the `❌ Failed` case goes red
  - the `✅` prefix narrowed to exact `✅ Done` → the finished-shapes case goes red
  - the `⏭` clause removed → the `⏭️ Skipped` case goes red
  - the header lookup replaced by a fixed `col = 2` → the Bug-variant case goes red
  - the `no step rows` branch removed → the header-only case goes red
  - the `!col { next }` guard removed → the no-Status-column case goes red (the message changes to `could not read`)
  - the `|| { … exit 1; }` on the `UNFINISHED` assignment removed, with the guard also removed → the no-Status-column case goes red (the check passes)
- [x] `npm run ci:fast` (with the `.agents/skills` symlink moved aside), `npm run lint:shell`, `npm run bundle:check` and `npm run check:generated` all pass
- [x] `npm run validate -- skills/<skill>/` passes for `develop-story`, `develop-task` and `develop-bug`

### Migration

- [x] CHANGELOG `[Unreleased]` entry cites (task 160) and names the four tightenings in § 5

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The allowlist refuses a finished shape the corpus measurement missed**
   - Probability: Low · Impact: Medium (a correct run cannot pass Step 8)
   - Mitigation: § 3 measured every committed completed report, and the allowlist refused none that today's check passes. The failure message prints the row, so a missed shape is diagnosable in one read
   - Rollback: partial rollback, below
2. **The awk misreads the header under BSD awk or zsh**
   - Probability: Low · Impact: Medium
   - Mitigation: the executed cases run under bash and zsh on macOS's BSD awk, including the Bug variant. The prototype agreed across both shells on 123 reports

### Low Risk Areas

1. **A consumer report ends Step 8 with a `⚠️ Needs Attention` or `⏸️ Skipped` row and now fails.** That report is wrong by the step document, and the message names the row to fix.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: Step 8 fails on a template-built, finished report, or the new cases are flaky
- **Steps**: `git revert` the change commit, then `npm run bundle`. `npm run bundle:check` is clean
- **Validation**: `command node --test shared/resources/tests/step-8-completion-checklist.test.mjs` passes on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: one finished shape is refused in real use
- **Steps**: widen the allowlist by that one shape, and add its case. Keep the header lookup and the empty-table branch

### Forward Fix (< 4 hours)

- **When**: a report variant names its column differently. Fix the header match and add that variant to the executed cases

### Rollback Triggers

- **Critical**: a correctly-run Step 8 cannot pass its checklist
- **Non-critical**: message wording, case naming

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-27
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.160.qa.5.step-8-check-4-allowlists-finished-rows.md](./task.160.qa.5.step-8-check-4-allowlists-finished-rows.md)
- **Gate File**: [task.160.gate.5.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.5.step-8-check-4-allowlists-finished-rows.yml)

### Test Coverage Summary
- **Tests Executed**: 78
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 4's findings are fixed. There are two new medium findings. The step-8 resume rule can skip an unfinished Step 7, because /finalise moves the lock to 8 before Step 7's remaining work is done (CR5-1). The rule does not name a surviving lock (CR5-2). There are also two low wording findings (CR5-3, CR5-4). Check 4 remains measured correct.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-27 | 1.0     | Initial draft | create-task |
| 2026-09-27 | 1.1     | Review passed (9/10): guard the row block on `col` and fail closed on awk's exit status, because the no-Status-column outcome was unreachable under BSD awk; Step 8 row written as `✅ Done` before the commit | review-task |
| 2026-09-27 |         | Status → ready-for-development | review-task |
| 2026-09-27 |         | Implemented — 6 files, 21 new tests (10 executed cases × bash/zsh + 1 prose guard); 8 mutation proofs | develop |
| 2026-09-27 |         | QA gate CONCERNS (90/100) — 1 finding (CR-1, medium) | qa-task |
| 2026-09-27 |         | QA findings fixed — CR-1 (4 Step 8 restatements + action 2 carve-out in 3 orchestrators; 7 new guard tests), 1 iteration | qa-fix |
| 2026-09-27 |         | QA gate CONCERNS (90/100) — 2 findings (CR2-1 medium, CR2-2 low) | qa-task |
| 2026-09-27 |         | QA findings fixed — CR2-1 (a HALT inside Step 8 sets its row ❌ Failed; resume verifies a ✅ Step 8 against git), CR2-2 (action 2 uses check 4's predicate); 7 new tests; 2 iterations total | qa-fix |
| 2026-09-27 |         | QA gate FAIL (70/100) — 2 findings (CR3-1 high, CR3-2 medium); QA loop escalated (convergence: HIGH 0, 0, 1) | qa-task |
| 2026-09-27 |         | Status → in-progress | qa-task |
| 2026-09-27 |         | QA findings fixed — CR3-1 (resume re-runs Step 8 whenever its record is at step 8; git check and ❌ Failed rule dropped), CR3-2 (resume tests rebuilt on the real PreCompact hook and the real Cleanup block); 3 iterations total | qa-fix |
| 2026-09-27 |         | QA gate CONCERNS (90/100) — 3 findings (CR4-1..3, medium); post-commit window pre-existing → follow-up | qa-task |
| 2026-09-27 |         | QA findings fixed — CR4-1 (Step 8 claim scoped: the record ends at the Step 8 commit; the older post-commit gap is named), CR4-2 (recovery exception in 3 orchestrators), CR4-3 (test runs the real lock helper and Cleanup); 4 iterations total | qa-fix |
| 2026-09-27 |         | QA gate CONCERNS (90/100) — 4 findings (CR5-1, CR5-2 medium; CR5-3, CR5-4 low) | qa-task |
| 2026-09-27 |         | QA findings fixed — CR5-1 (the step-8 rule overrides only the Step 8 row; an unfinished Step 7 still wins), CR5-2 (surviving lock named), CR5-3 (lint-failed HALT keeps its record), CR5-4 (step-0 points at the rule); 5 iterations total | qa-fix |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first

- [x] Finished-shape, unfinished-shape, Bug-variant, header-only and no-Status-column cases, bash and zsh

### Phase 2: Allowlist check 4

- [x] Allowlist check 4 in the shared source; re-bundled; bundle:check clean

### Phase 3: Step 8 ordering

- [x] No report edit after the Step 8 commit; the ordering case is green

### Phase 4: Proof and gates

- [x] Seven mutation proofs recorded; CHANGELOG entry; gates green

---

## References

- **Predecessor**: task.159 (PR #497). Its QA `gate.1` `recommendations.future` has CR-1 (pre-existing: `❌ Failed` / `⚠️ Needs Attention` rows not refused) and CR-2 (header-only table passes the guard); `pr-review.1` repeats both
- **Step document**: `shared/resources/develop-pipeline-step-8-commit.md` § Step 8 Completion Checklist, § Final Implementation Report Update, § Invoke /commit-changes, § Final Push
- **Row vocabulary**: develop-task `SKILL.md` § Context Management Rule ("✅ Done / ❌ Failed / ⚠️ Needs Attention / ⏸️ Paused")
- **Template**: `shared/resources/implementation-report-template.md` (Story, Task and Bug variants)

---

## Notes

### Important Reminders

- Edit `shared/resources/`, never the `references/` copies. `npm run bundle` overwrites a fix made only in a copy
- Move the gitignored `.agents/skills` symlink aside before trusting a local green
- Use `command node`, never bare `node`
- Step 8 of this task's own pipeline run exercises the new check on its own report. Set the Step 8 row ✅ before the commit
