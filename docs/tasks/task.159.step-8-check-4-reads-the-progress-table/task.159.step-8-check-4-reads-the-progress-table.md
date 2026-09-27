---
id: task.159
title: "[Task 159] Step 8 check 4 reads the Pipeline Progress table, not the whole report"
type: task
description: "develop-pipeline Step 8 check 4 greps the whole implementation report for `⏳ Pending`, and the PreCompact hook's pause section names that token in prose, so every paused-and-resumed run fails a clean checklist. Scope the check to the table rows, count `⏸️ Paused` rows as unfinished too, and hold it with an executed bash + zsh test on a paused-and-resumed report."
tags: [develop-pipeline, step-8, completion-checklist, precompact, follow-up]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-27
updated: 2026-09-27
assignee:
estimated_effort_hours: 2
github_issue: 496
---

# Technical Task: Step 8 check 4 reads the Pipeline Progress table, not the whole report

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.159.review.1.step-8-check-4-reads-the-progress-table.md` implemented 2026-09-27 (0 critical, 0 important; 3 optional carried to development)

**GitHub Issue**: [#496](https://github.com/Gamaroff/agent-skills/issues/496)

---

## 1. Overview

Step 8's Completion Checklist is BLOCKING. Its check 4 is meant to assert that the Pipeline Progress
table has no unfinished row, but it greps the whole implementation report. The PreCompact hook
appends a `## Pipeline Paused` section whose prose contains the same token, so any run that was paused
and then resumed fails check 4 even when every table row reads `✅ Done`. This task scopes check 4 to
the table rows and holds the change with an executed test built from a paused-and-resumed report.

**Scope**: one fenced block in `shared/resources/develop-pipeline-step-8-commit.md` (check 4), its
three bundled copies, and new cases in the existing executed test
`shared/resources/tests/step-8-completion-checklist.test.mjs`. Source: observation #200.

**Key deliverables**:

1. Check 4 reads only the `|` rows under `## Pipeline Progress`, and fails on a `⏳ Pending` or `⏸️ Paused` row
2. Check 4 fails loudly when the report has no Pipeline Progress table, instead of passing on nothing
3. Executed bash + zsh cases: a paused-and-resumed report passes, a report with a real unfinished row fails, and a report with no table fails. Each case is mutation-proved

---

## 2. Motivation

### Current Problems

1. **A correct run cannot pass Step 8 after a pause.** Check 4 is
   `grep -q "⏳ Pending" "$REPORT" && { echo "❌ … still has ⏳ Pending rows"; exit 1; }`.
   The hook (`develop-pipeline-on-precompact.sh`, the `# Append pause entry to report` block) writes
   `**Pipeline Progress** for this step is now \`⏸️ Paused\` — equivalent to \`⏳ Pending\` for resume
   purposes …`. Observed on task.152 (2026-09-26): the table had zero unfinished rows, and check 4
   still tripped on the hook's line.
2. **The failure trains the reader to bypass a BLOCKING check.** The step document says "fix the gap
   and re-check", but the only gaps on offer are the hook's text or the checklist itself. An operator
   who meets this twice learns to discount check 4, and that includes its true positives.
3. **A `⏸️ Paused` row is not caught.** The resume contract
   (`develop-pipeline-resume-contract.md`: "A step marked `⏸️ Paused` … is treated identically to
   `⏳ Pending`") and develop-bug's row vocabulary (`✅ Done / ❌ Failed / ⚠️ Needs Attention / ⏸️ Paused`)
   both treat Paused as unfinished. Check 4 looks only for `⏳ Pending`, so a table row left at
   `⏸️ Paused` passes Step 8.

### Benefits of scoping the check to the table

- The check reads the thing it makes a claim about, so no other writer's prose can trip it
- A paused-and-resumed run passes Step 8 with nothing reworded
- Both unfinished states the resume contract recognises are refused
- The fix is held by an executed test of the shipped block, not by a grep of its text

---

## 3. Technical Background

### Current Architecture

- **Check 4** lives in the `## Step 8 Completion Checklist` fenced block of
  `shared/resources/develop-pipeline-step-8-commit.md` (anchor: `# 4. Pipeline Progress table has no ⏳ Pending rows`).
  `npm run bundle` copies it into `skills/{develop-story,develop-task,develop-bug}/references/`.
  These are the only copies. No other skill, doc or test restates check 4. To confirm, grep the
  tracked tree for the literal `⏳ Pending" "$REPORT"`.
- **The report's table** is `## Pipeline Progress` in all three variants of
  `shared/resources/implementation-report-template.md` (Story, Task and Bug). Rows are Markdown
  table lines beginning `|`. The section ends at the next `## ` heading.
- **The hook** appends its `## Pipeline Paused — <time>` section after `## Completion`. Its prose
  names the token, and it bolds `**Pipeline Progress**` but never writes a heading. The hook does not
  rewrite any table row, even though its prose says the step "is now `⏸️ Paused`". That mismatch is
  out of scope here (§ 4).
- **The existing test** `shared/resources/tests/step-8-completion-checklist.test.mjs` (task.147)
  already cuts the whole checklist block from the shipped step document (`blockBy(…, "✅ Step 8
  post-conditions verified")`) and runs it in a fixture repo with a pushed branch and a `gh` stub,
  under every shell in `SHELLS`. It builds reports from the template's variants (`finished(variant)`).
  This task adds cases to that harness. It builds no new harness.

### Target Architecture

```bash
# 4. The Pipeline Progress TABLE has no unfinished row — its `|` rows only. The whole report is
#    not read: the PreCompact hook's pause section names `⏳ Pending` in prose (obs #200).
#    `⏸️ Paused` is unfinished too (resume contract). No table at all is a failure, not a pass:
#    a check that could not look must not report that it found nothing.
PROGRESS_ROWS=$(awk '/^## Pipeline Progress[[:space:]]*$/ {f=1; next} f && /^## / {exit} f && /^\|/' "$REPORT")
[ -n "$PROGRESS_ROWS" ] || { echo "❌ Step 8 incomplete: no Pipeline Progress table found in $REPORT"; exit 1; }
printf '%s\n' "$PROGRESS_ROWS" | grep -qE '⏳ Pending|⏸️ Paused' \
  && { echo "❌ Step 8 incomplete: Pipeline Progress still has an unfinished (⏳ Pending / ⏸️ Paused) row"; exit 1; } || true
```

The final form is the developer's call, within the constraints in § 9. The awk program must stay
free of apostrophes and GNU-only escapes, because the block runs under zsh and BSD awk.

### Important Clarifications

- **Why not reword the hook?** Rewording removes one writer of the token, not the class. The
  Decisions Log and other prose name `⏳ Pending` too (develop-bug SKILL.md Phase 0b does). The check
  makes a claim about table rows, so it must read table rows.
- **Why a missing table fails.** An empty `PROGRESS_ROWS` can mean "no unfinished rows" or "the
  reader matched nothing", and from the caller's side those two are identical (AGENTS.md § Observation
  Log: "An empty result is a claim about the instrument"). Every template variant carries the table,
  so its absence is a defect in the report.

---

## 4. Scope

### In Scope

✅ Check 4 in `shared/resources/develop-pipeline-step-8-commit.md`, and its three bundled copies via `npm run bundle`
✅ New executed cases in `shared/resources/tests/step-8-completion-checklist.test.mjs`
✅ A CHANGELOG `[Unreleased]` entry citing (task 159)

### Out of Scope

❌ Rewording the hook's pause prose. It is not the defect (§ 3, Clarifications)
❌ Making the hook actually set the paused step's row to `⏸️ Paused`. Its prose claims this and it does not happen. That is a separate follow-up (it changes resume behaviour, not a checklist)
❌ Checks 1–3, 2b and 5 of the checklist
❌ develop-bug's own Step 8 prose outside the shared step document

---

## 5. Breaking Changes

**None for a correct report.** Two behaviours tighten deliberately:

1. **A `⏸️ Paused` table row now fails check 4.** Before, only `⏳ Pending` did. The resume contract
   already treats Paused as unfinished, so a report that ends Step 8 with a Paused row is itself
   wrong. Migration: finish the step and mark its row `✅ Done`, as the step document already requires.
2. **A report with no `## Pipeline Progress` table now fails check 4.** Before, it passed vacuously.
   Every template variant has the table. Migration: none for template-built reports. A hand-built
   report must carry the table.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.159.plan.step-8-check-4-reads-the-progress-table.md](task.159.plan.step-8-check-4-reads-the-progress-table.md)

### Phase 1: Tests first (red on today's check 4)

**Risk**: Low · **Files**: `shared/resources/tests/step-8-completion-checklist.test.mjs`

- [x] Build a **paused-and-resumed** report: `finished("Task")`, plus the hook's pause section generated by executing the hook's own append block (cut from `develop-pipeline-on-precompact.sh` between `# Append pause entry to report` and `>> "$REPORT"`, with its variables bound), plus a Decisions Log line quoting `⏳ Pending`
- [x] Non-vacuity: assert that the built report contains `⏳ Pending` outside the Pipeline Progress table, and no unfinished row inside it
- [x] `[sh]` paused-and-resumed report **passes** the full checklist, for every shell in `SHELLS`. Red on today's check 4
- [x] `[sh]` a finished report with one table row set back to `⏳ Pending` **fails**, naming check 4
- [x] `[sh]` a finished report with one table row set to `⏸️ Paused` **fails**, naming check 4. Red on today's check 4
- [x] `[sh]` a finished report with the `## Pipeline Progress` section removed **fails**, naming the missing table. Red on today's check 4

**Dependencies**: none

### Phase 2: Scope check 4 to the table rows

**Risk**: Low · **Files**: `shared/resources/develop-pipeline-step-8-commit.md`, `skills/{develop-story,develop-task,develop-bug}/references/develop-pipeline-step-8-commit.md` (bundled)

- [x] Replace check 4 with the table-scoped form (§ 3 Target Architecture), keeping the checklist's `❌ Step 8 incomplete:` message convention
- [x] Update the prose under the block, which describes checks 1–4, only if it restates check 4's mechanism
- [x] `npm run bundle`. Then `npm run bundle:check` is clean
- [x] Phase 1 cases go green under bash and zsh. The existing task.147 cases stay green

**Dependencies**: Phase 1

### Phase 3: Mutation proof, docs, gates

**Risk**: Low · **Files**: `CHANGELOG.md`

- [x] Mutation-prove each branch: (a) restore the whole-file grep and the paused-and-resumed case goes red; (b) drop `⏸️ Paused` from the pattern and the Paused-row case goes red; (c) drop the empty-table guard and the no-table case goes red. Record each proof in the implementation report
- [x] CHANGELOG `[Unreleased]` → Fixed, citing (task 159) and obs #200. Also note the two deliberate tightenings from § 5
- [x] `npm run ci:fast` (with the `.agents/skills` symlink moved aside), `npm run lint:shell`, `npm run bundle:check`, `npm run check:generated`, and `quick_validate.py` on develop-story, develop-task and develop-bug

**Dependencies**: Phase 2

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-8-commit.md`: check 4 in the Step 8 Completion Checklist block
2. ✅ `skills/develop-story/references/develop-pipeline-step-8-commit.md`: bundled copy (generated)
3. ✅ `skills/develop-task/references/develop-pipeline-step-8-commit.md`: bundled copy (generated)
4. ✅ `skills/develop-bug/references/develop-pipeline-step-8-commit.md`: bundled copy (generated)

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

Not applicable. Check 4 is shell prose, and it is tested by execution, not by unit.

### Integration Tests

- **Scope**: the shipped Step 8 checklist block, cut from the step document and run end to end in the existing fixture repo (`setup()` / `runChecklist()`), under every shell in `SHELLS` (bash and zsh)
- **Cases**: paused-and-resumed passes; `⏳ Pending` row fails; `⏸️ Paused` row fails; no table fails. Assert the exit status and the `❌` line, never only the exit code
- **Fixture fidelity**: the pause section comes from executing the hook's own append block, and the report comes from the template (`finished()`), so a reword of either reaches the test
- **Command**: `command node --test shared/resources/tests/step-8-completion-checklist.test.mjs`

### Contract Tests

The existing task.147 cases (every variant finished passes; check 3 and check 5 cases) must stay
green unchanged. They are the regression contract for the rest of the checklist.

### Performance Tests

Not applicable.

### Consumer Tests

The three orchestrators consume the bundled copy. `npm run bundle:check` asserts that the copies
match the source.

---

## 9. Success Criteria

### Functional

- [x] A paused-and-resumed report (hook section present, every table row `✅ Done`) passes the Step 8 checklist under bash and zsh
- [x] A report whose Pipeline Progress table holds a `⏳ Pending` row fails check 4 under bash and zsh
- [x] A report whose Pipeline Progress table holds a `⏸️ Paused` row fails check 4 under bash and zsh
- [x] A report with no `## Pipeline Progress` table fails check 4 with a message naming the missing table
- [x] Every existing case in `step-8-completion-checklist.test.mjs` still passes

### Performance

- [x] No measurable change. Check 4 is one awk pass over one file

### Code Quality

- [x] Each of the three branches is mutation-proved: reverting it turns its named case red
- [x] `npm run ci:fast` (symlink moved aside), `npm run lint:shell`, `npm run bundle:check` and `npm run check:generated` all pass
- [x] `python skills/create-skill/scripts/quick_validate.py` passes for `skills/develop-story`, `skills/develop-task` and `skills/develop-bug`

### Migration

- [x] CHANGELOG `[Unreleased]` entry cites (task 159), and names the two tightenings in § 5
- [ ] Observation #200 set to `actioned` after merge

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The awk program misbehaves under zsh or BSD awk**
   - Probability: Low · Impact: Medium (check 4 would fail open or closed on every run)
   - Mitigation: the executed cases run under bash and zsh on macOS's BSD awk. Keep to POSIX classes. Keep apostrophes and `\s` out of the program
   - Rollback: revert the check-4 edit and re-bundle

### Low Risk Areas

1. **A consumer report already ends Step 8 with a `⏸️ Paused` row, and now fails**
   - Mitigation: that report is wrong by the resume contract. The failure message names the row state to fix

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: Step 8 fails on a template-built, fully `✅ Done` report, or the new cases are flaky
- **Steps**: `git revert` the change commit, then `npm run bundle`. `npm run bundle:check` is clean
- **Validation**: `command node --test shared/resources/tests/step-8-completion-checklist.test.mjs` passes on the reverted tree

### Partial Rollback (1-2 hours)

- **When**: the `⏸️ Paused` or missing-table tightening proves too strict for a real consumer
- **Steps**: drop that one clause from check 4 and its case. Keep the table scoping

### Forward Fix (< 4 hours)

- **When**: a report variant uses a different table heading. Fix the anchor, and add that variant to the executed cases

### Rollback Triggers

- **Critical**: a correct run cannot pass Step 8
- **Non-critical**: message wording, test naming

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-27 | 1.0     | Initial draft | create-task |
| 2026-09-27 | 1.1     | Review passed (9/10) — no changes required; 3 optional test-tightening notes in review.1 | review-task |
| 2026-09-27 |         | Status → ready-for-development | review-task |
| 2026-09-27 |         | Implemented — 6 files, 9 tests (1 non-vacuity + 4 cases × bash/zsh); 3 mutation proofs | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first

- [x] Paused-and-resumed fixture (hook-generated section) plus non-vacuity assertion
- [x] Four executed cases, bash and zsh

### Phase 2: Scope check 4

- [x] Table-scoped check 4 in the shared source
- [x] Re-bundled; bundle:check clean

### Phase 3: Proof and gates

- [x] Three mutation proofs recorded
- [x] CHANGELOG entry; gates green

---

## References

- **Observation**: #200, "Step 8 check 4 greps the whole report; the PreCompact pause prose trips it"
- **Step document**: `shared/resources/develop-pipeline-step-8-commit.md` § Step 8 Completion Checklist
- **Hook**: `shared/resources/develop-pipeline-on-precompact.sh` (`# Append pause entry to report`)
- **Resume contract**: `shared/resources/develop-pipeline-resume-contract.md` (`⏸️ Paused` ≡ `⏳ Pending`)
- **Predecessor**: task.147 (check 3 and check 5 fixes; the executed harness this task extends)

---

## Notes

### Important Reminders

- Edit `shared/resources/`, never the `references/` copies. `npm run bundle` overwrites a fix made only in a copy
- Move the gitignored `.agents/skills` symlink aside before trusting a local green
- Use `command node`, never bare `node`
