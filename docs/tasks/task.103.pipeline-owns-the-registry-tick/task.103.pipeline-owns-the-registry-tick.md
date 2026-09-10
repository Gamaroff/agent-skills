---
id: task.103
title: "[Task 103] Nothing updates the task-registry row after a task is accepted"
type: task
description: "The registry row is written once by /create-task and never updated. finalise sets the document's status and completed_date but touches no registry; develop-next only reads it. The standard claimed finalise owned the write AND told readers not to edit by hand, so the row drifted silently — 17 rows (T67-T96) were stale until a sweep. Give the pipeline ownership of the write, or make the manual step enforceable."
tags: [develop-pipeline, finalise, task-registry, ownership]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: medium
created: 2026-09-09
updated: 2026-09-10
assignee:
estimated_effort_hours: 4
github_issue: 374
---

# Technical Task: give the registry tick an owner

**Status:** Ready for Review
**GitHub Issue**: [#374](https://github.com/Gamaroff/agent-skills/issues/374)
**Review**: ✅ All review recommendations from `task.103.review.1.pipeline-owns-the-registry-tick.md` implemented 2026-09-10

---

## 1. Overview

`docs/tasks/task-registry.md` carries a status column per task. **Nothing writes it after creation.**

| Skill | Relationship to the registry |
| :--- | :--- |
| `create-task` | **Writes** the row at creation, and increments the counter |
| `develop-next` | **Reads** it — selection fallback when no roadmap row is actionable |
| `finalise` | **Nothing.** 1783 lines, zero registry references |
| `develop-task` / `develop-story` / `develop-batch` / `qa-task` | Nothing |

`finalise` does update the **document** — `status: accepted` and `completed_date`, both verified
present on all 17 documents below. It simply never touches the registry.

## 2. Motivation

The registry claimed **22 open tasks**. Five were open. Seventeen — T67, T68, T69, T70, T72, T73,
T74, T75, T76, T78, T83, T84, T89, T90, T91, T92, T96 — were finished, `accepted` in their own
frontmatter, each with a merge commit on `develop`, and never ticked. They were swept by hand on
2026-09-09.

Two things made this persist rather than get caught:

**The standard named an owner that did not exist**, and in the same sentence told readers *"you don't
edit it by hand"* — suppressing the only mechanism that was actually working. Corrected in the same
change that filed this task, which is why the fix here is ownership rather than documentation.

**The drift is invisible to the machinery.** The selector judges eligibility on the **document's**
frontmatter, not the registry row, so a stale row cannot cause a finished task to be re-selected and
nothing ever fails. The cost falls entirely on human readers — and lands on the one question the
registry exists to answer: *how much is left?* A backlog reported at four times its real size is a
release-planning input, and it was wrong for weeks.

> Worth stating plainly: this is **not** a loop-stalling bug, and the task should not be justified as
> one. An unticked roadmap row *does* stall the loop; an unticked registry row does not. Conflating
> them would misprice the fix.

## 3. Technical Background

### Current

Two files carry a task's completion state, and only one of them is ever updated.

| Artefact | Field | Written by | Updated after acceptance |
| :--- | :--- | :--- | :--- |
| Task document | frontmatter `status:`, `completed_date:` | `create-task` (initial), `finalise` (acceptance) | **Yes** — `finalise` |
| `docs/tasks/task-registry.md` | the row's Status column | `create-task` (initial) | **No — nobody** |

`develop-next`'s selector reads the registry only as a *selection fallback*, and even then it judges
eligibility on the **document's** frontmatter (`select-next.mjs`, `registryFrontier.passedOver[].documentStatus`)
rather than on the row. That is why the drift is silent: no machine consumer of the registry can be
made wrong by a stale row, so nothing ever fails.

Verified against the tree at the time of writing: `skills/finalise/SKILL.md` is 1783 lines and contains
zero occurrences of `task-registry`; the only skills that reference the file at all are `create-task`
(writes) and `develop-next` (reads).

### Target

The target state is one of the three below — **§ 3 is where this task's central decision is made**, and
§ 6 Phase 3 is where the reasoning is recorded. All three share a common floor: the drift becomes
*loud* rather than silent.

Three candidate owners, and the choice is genuinely open:

| Owner | For | Against |
| :--- | :--- | :--- |
| **`finalise`** | Already the acceptance moment; already writes `status` and `completed_date` to the document | It is story-and-task shared, and the registry is task-only — the write needs a conditional. It also runs before merge, so "accepted" precedes the merge PR the row wants to cite |
| **`develop-task` / `develop-next`** (post-merge) | The merge PR number is known, which is what the row's note carries | Splits acceptance across two skills; a manually-run `finalise` would not tick |
| **A check, not a write** | Cheapest; keeps the human in the loop and cannot write a wrong row | Leaves the work manual — it only guarantees the omission is *noticed* |

**Do not skip to implementation.** The third option may well be right: the sweep took one scripted
pass, and a check that fails loudly may be worth more than automation that has to reason about lite
mode, cancelled tasks, and pre-merge versus post-merge state.

## 4. Scope

**In scope**

- Decide the owner (§ 3 Target) and implement the write.
- A check that fails when a document is `accepted` and its registry row is not — the backstop that
  makes any future drift loud instead of silent.
- Whatever documentation follows from the chosen owner.

**Out of scope**

- The bug registry and the epic registry. Their standards make no ownership claim and no drift has
  been measured; sweeping them in without evidence would be scope creep. **Measure first** — § 6
  covers the check that would produce that evidence.
- The roadmap tick, which is a separate mechanism with a separate (real) stalling consequence.
- Re-ticking the 17 historical rows. Already done.

## 5. Breaking Changes

None if a check. If `finalise` gains the write, it gains a side effect on a file it has never touched
— see § 9 criterion 6 (the behaviour that must hold) and § 10 (the risk it carries).

## 6. Implementation Plan

- [x] **Phase 1 — the check, first and regardless of § 3.** Add
      `evals/shared/tests/task-registry-drift.test.mjs`: for every task document under `docs/tasks/`,
      compare its frontmatter `status:` against the Status cell of its row in
      `docs/tasks/task-registry.md`, and fail on either direction of divergence
      (`accepted` document with a non-`accepted` row, and the converse). Carry the non-vacuity floor
      and the exclusions from § 8. **Verify the file is actually executed** — `package.json`'s `test`
      script lists per-directory globs by hand; `evals/shared/tests/*.test.mjs` is currently among
      them, but confirm rather than assume, because a suite outside every glob runs nowhere and
      reports nothing. This is the part that makes drift loud; it is worth landing even if § 3
      chooses "no automation".
- [x] **Phase 2 — measure the siblings.** Run the same comparison, as a one-off script (not a
      committed test), over `docs/bugs/bug-registry.md` and `docs/development/epic-registry.md`
      against their documents. **Report the counts in this run's implementation report** under a
      "Sibling registry measurement" heading — the numbers are the deliverable, whether or not they
      change anything. Scope stays as § 4 says unless the numbers say otherwise.
- [x] **Phase 3 — decide § 3 and record the reasoning** in the implementation report, under a
      "Registry-tick ownership decision" heading: the option chosen, the two rejected, and why.
- [x] **Phase 4 — implement the chosen owner**, if it is a write. Files per § 7; edit
      `shared/resources/` sources and re-run `npm run bundle` if the change lands in a bundled file.
- [x] **Phase 5 — update `docs/standards/task-registry.md`** to name the real owner, replacing the
      interim "tick it by hand" instruction and the forward-reference to this task.

## 7. Files Summary

### Add

| File | What it is |
| :--- | :--- |
| `evals/shared/tests/task-registry-drift.test.mjs` | Phase 1 — the drift check. 3 tests. Imports `parseRegistry` / `parseFrontmatterStatus` from `select-next.mjs`; never restates the parser or the vocabulary. `MIN_ROWS = 90` is the non-vacuity floor. Landed in `evals/shared/tests/` because `package.json`'s `test` script already globs that directory — verified, not assumed (§ 8). |
| `shared/resources/registry-tick.js` | Phase 4 — the writer. CLI, `--json`/`reason` contract, peer of `tracker-comment.js`. Exits 0 on every outcome. Carries the story-run guard. |
| `shared/resources/tests/registry-tick.test.mjs` | Phase 4 — 11 behavioural tests, all of which run the CLI against a throwaway registry. Globbed by `shared/resources/tests/*.test.mjs`. |

### Modify

| File | Change |
| :--- | :--- |
| `skills/finalise/SKILL.md` | New acceptance step 4 calling `registry-tick.js`, with the full `reason` table and the lite-mode statement; one new DoD checklist line. |
| `skills/finalise/references/registry-tick.js` | Generated by `npm run bundle` — do not edit. |
| `docs/standards/task-registry.md` | Phase 5 — names `/finalise` as the owner, explains why a pre-merge tick is correct for the Status column, and points at the drift check as the backstop. Replaces the interim "tick it by hand" step. |
| `docs/tasks/task-registry.md` | Row 103's own tick (by `registry-tick.js` at Step 7 — the mechanism's first live use). |
| `docs/development/epic-registry.md` | Epic 3's Status corrected `📋 Planned` → `✅ Accepted`. Found by the Phase 2 measurement; the document and all three of its stories read `accepted`. |
| `CHANGELOG.md` | Unreleased entry covering both halves — the check and the writer. |
| `docs/tasks/task-registry.md` (row 97) | **Added a row that never existed.** Task 97 is `accepted` and merged under PR #350 but was absent from the registry entirely — found by the document-driven check added in QA cycle 1, which is the direction the row-driven walk structurally could not see. |

### Delete

None.

## 8. Testing Strategy

- **The drift check itself, mutation-proven:** revert one swept row to `planned` and confirm the
  check goes red. A check that cannot fail on the exact defect that motivated it is not a check.
- **Non-vacuity floor:** the comparison must assert it examined a plausible number of rows. A scan
  whose parse silently stops matching would otherwise report a clean zero — the failure mode this
  repo has already recorded twice.
- **Cancelled and in-flight rows** must not trip it: `cancelled` is terminal and legitimately not
  `accepted`, and a task mid-pipeline is legitimately neither.
- If `finalise` gains the write: a lite-mode run must tick the row too. Lite mode has previously been
  the path where side effects were skipped.
- A story run must **not** attempt a task-registry write.

## 9. Success Criteria

1. [x] A check fails when a document is `accepted` and its registry row is not, and vice versa —
       **and when it has no row at all** (added in QA cycle 1; found task 97 on its first run).
2. [x] That check is mutation-proven — reverting a row makes it go red.
3. [x] The check carries a non-vacuity floor and cannot pass by matching nothing.
4. [x] `cancelled` and in-flight tasks do not trip it — pinned by a **synthetic-fixture** test
       calling the same predicate the corpus test uses, after `/review-pr` proved the previous
       coverage was incidental corpus state that this run's own Step 7 removes.
5. [x] The § 3 decision is recorded with its reasoning, not just its outcome.
6. [x] If a write is implemented: lite mode ticks the row, and a story run does not attempt one.
7. [x] `docs/standards/task-registry.md` names the real owner and no longer says "by hand" if that
       has stopped being true.
8. [x] The bug and epic registries are **measured** and the result reported, whether or not they are
       changed.
9. [x] The check is wired into a suite `npm test` actually executes — evidenced by the assertion count
       appearing in the run output, not by the file's presence on disk.

## 10. Risk Assessment

**Medium**, and the risk is in the write, not the check.

| Risk | Mitigation |
| :--- | :--- |
| `finalise` writes the row before merge, citing a PR that has not merged | Part of the § 3 decision; the post-merge owner exists precisely for this |
| The write lands on a story run, where the task registry is meaningless | Explicit test (§ 8) |
| Lite mode skips the new side effect, as it has before | Explicit test (§ 8) |
| Automation writes a *wrong* row, which is worse than a stale one | Phase 1 lands the check first, so a wrong write is caught by the same assertion |
| Sibling registries are swept without evidence of drift | Phase 2 measures before § 4 is widened |

## 11. Rollback Plan

Remove the write; keep the check. The check is independently valuable — with it and no automation,
the repository is still strictly better off than before this task, because the omission becomes loud.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-10
**Quality Score**: 95/100
**Gate Decision**: PASS (cycle 2)
**QA Cycles**: 2

### QA Reports

| Cycle | Gate | Score | Report | Gate file |
| :--- | :--- | :--- | :--- | :--- |
| 1 | FAIL | 80/100 | [qa.1](./task.103.qa.1.pipeline-owns-the-registry-tick.md) | [gate.1](./task.103.gate.1.pipeline-owns-the-registry-tick.yml) |
| 2 | **PASS** | 95/100 | [qa.2](./task.103.qa.2.pipeline-owns-the-registry-tick.md) | [gate.2](./task.103.gate.2.pipeline-owns-the-registry-tick.yml) |

### Test Coverage Summary

- **Tests Executed**: full hermetic suite + 19 tests specific to this task
- **Phases Verified**: 5/5
- **Open Issues**: 0
- **NFR Status**: Security: PASS (`reasoned`), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 1 found the check was **row-driven only** — blind to a task document with no registry row,
while three shipped statements promised CI would catch exactly that. Fixing it found **task 97**:
accepted, merged under PR #350, and absent from the registry since creation. 106 directories, 105
rows; nothing in the repository could see it.

Cycle 2's refute pass then found three issues **inside cycle 1's fixes** — including the same
single-sided blindness reintroduced one level down, and a documented rule that nothing checked. All
closed in-cycle. Two mutants survived during the loop and both were closed rather than explained
away.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 0.1 | Filed after a sweep of 17 stale rows (T67–T96). Root cause: no skill owns the write, and the standard named `finalise` as the owner while telling readers not to tick by hand. The standard was corrected in the same change; this task gives the write an owner. | Claude |
| 2026-09-10 | 0.2 | Review passed (9/10, READY TO IMPLEMENT) — 0 critical, 4 important fixed. Added the missing mandatory § 3 Technical Background (current-vs-target, absorbing the former § 4 decision table) and § 7 Files Summary; renumbered to the 11-section template contract and repaired every § cross-reference. Named file paths and report destinations in every Implementation Plan phase, and added success criterion 9 (the check must be in a glob `npm test` executes). Linked GitHub issue #374. | review-task |
| 2026-09-10 |  | Status → ready-for-development | review-task |
| 2026-09-10 |  | Implemented — 6 files, 14 tests (3 drift-check + 11 registry-tick). `finalise` chosen as the § 3 owner; check landed first and retained. Epic registry measured: 1 stale row of 4, corrected. Bug registry measured: 0 of 12. | develop |
| 2026-09-10 |  | QA gate FAIL (80/100) — 1 high, 1 medium, 2 low. The check covers rows but not documents, contradicting three shipped claims | qa-task |
| 2026-09-10 |  | QA findings fixed — 1 iteration. Added the document-driven direction to the drift check (found task 97, accepted and absent from the registry since creation), preserved cell width and line endings in the tick, corrected the guard comment and removed a no-op. Two further tests added after mutations survived. | qa-fix |
| 2026-09-10 |  | QA gate PASS (95/100) — cycle 2 refute pass found 3 issues inside cycle 1's own fixes, all closed in-cycle; 0 open findings | qa-task |
| 2026-09-10 |  | PR conformance review (Step 5c): REQUEST CHANGES — criterion 4 had no committed test, only incidental corpus coverage that Step 7 would have removed. Fixed with a synthetic fixture exercising the shared predicate; Files Summary completed. | qa-fix |

## Progress Tracking

All 5 phases complete. The § 3 decision was **`finalise` owns the write**, with the Phase 1 check
retained as the backstop. Reasoning, the two rejected options, and the Phase 2 measurement are in
`task.103.implementation.1.pipeline-owns-the-registry-tick-initial-run.md`.

## References

- `docs/standards/task-registry.md` — the corrected ownership paragraph and the interim manual step
- `skills/finalise/SKILL.md` — sets document `status` + `completed_date`; no registry reference
- `skills/develop-next/references/roadmap-selection.md` — registry fallback; eligibility comes from
  document frontmatter, which is why the drift never stalled the loop
- PR #357 — the sweep of the 17 rows, with each row's merge PR verified by branch name

## Notes

The seventeen rows were verified against each merge commit's **branch name** rather than a
subject-line grep, because a grep matches a mention while a branch name is the task's own. Any
automation added here should use a comparably specific signal; deriving the PR from a commit-message
search would reintroduce ambiguity that the manual sweep deliberately avoided.
