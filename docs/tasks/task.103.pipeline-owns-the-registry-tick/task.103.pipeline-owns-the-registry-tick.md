---
id: task.103
title: "[Task 103] Nothing updates the task-registry row after a task is accepted"
type: task
description: "The registry row is written once by /create-task and never updated. finalise sets the document's status and completed_date but touches no registry; develop-next only reads it. The standard claimed finalise owned the write AND told readers not to edit by hand, so the row drifted silently — 17 rows (T67-T96) were stale until a sweep. Give the pipeline ownership of the write, or make the manual step enforceable."
tags: [develop-pipeline, finalise, task-registry, ownership]
category: infrastructure
status: draft
priority: Medium
risk_level: medium
created: 2026-09-09
updated: 2026-09-09
assignee:
estimated_effort_hours: 4
---

# Technical Task: give the registry tick an owner

**Status:** Draft

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

## 3. Scope

**In scope**

- Decide the owner (§ 4) and implement the write.
- A check that fails when a document is `accepted` and its registry row is not — the backstop that
  makes any future drift loud instead of silent.
- Whatever documentation follows from the chosen owner.

**Out of scope**

- The bug registry and the epic registry. Their standards make no ownership claim and no drift has
  been measured; sweeping them in without evidence would be scope creep. **Measure first** — § 6
  covers the check that would produce that evidence.
- The roadmap tick, which is a separate mechanism with a separate (real) stalling consequence.
- Re-ticking the 17 historical rows. Already done.

## 4. The decision this task must make

Three candidate owners, and the choice is genuinely open:

| Owner | For | Against |
| :--- | :--- | :--- |
| **`finalise`** | Already the acceptance moment; already writes `status` and `completed_date` to the document | It is story-and-task shared, and the registry is task-only — the write needs a conditional. It also runs before merge, so "accepted" precedes the merge PR the row wants to cite |
| **`develop-task` / `develop-next`** (post-merge) | The merge PR number is known, which is what the row's note carries | Splits acceptance across two skills; a manually-run `finalise` would not tick |
| **A check, not a write** | Cheapest; keeps the human in the loop and cannot write a wrong row | Leaves the work manual — it only guarantees the omission is *noticed* |

**Do not skip to implementation.** The third option may well be right: the sweep took one scripted
pass, and a check that fails loudly may be worth more than automation that has to reason about lite
mode, cancelled tasks, and pre-merge versus post-merge state.

## 5. Breaking Changes

None if a check. If `finalise` gains the write, it gains a side effect on a file it has never touched
— see § 8.

## 6. Implementation Plan

- [ ] **Phase 1 — the check, first and regardless of § 4.** A test asserting that every task document
      with `status: accepted` has a registry row reading `accepted`, and the converse. This is the
      part that makes drift loud; it is worth landing even if § 4 chooses "no automation".
- [ ] **Phase 2 — measure the siblings.** Run the same comparison over the bug and epic registries
      and report. Scope stays as § 3 says unless the numbers say otherwise.
- [ ] **Phase 3 — decide § 4 and record the reasoning** in the implementation report.
- [ ] **Phase 4 — implement the chosen owner**, if it is a write.
- [ ] **Phase 5 — update `docs/standards/task-registry.md`** to name the real owner, replacing the
      interim "tick it by hand" instruction.

## 7. Testing Strategy

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

## 8. Success Criteria

1. [ ] A check fails when a document is `accepted` and its registry row is not, and vice versa.
2. [ ] That check is mutation-proven — reverting a row makes it go red.
3. [ ] The check carries a non-vacuity floor and cannot pass by matching nothing.
4. [ ] `cancelled` and in-flight tasks do not trip it.
5. [ ] The § 4 decision is recorded with its reasoning, not just its outcome.
6. [ ] If a write is implemented: lite mode ticks the row, and a story run does not attempt one.
7. [ ] `docs/standards/task-registry.md` names the real owner and no longer says "by hand" if that
       has stopped being true.
8. [ ] The bug and epic registries are **measured** and the result reported, whether or not they are
       changed.

## 9. Risk Assessment

**Medium**, and the risk is in the write, not the check.

| Risk | Mitigation |
| :--- | :--- |
| `finalise` writes the row before merge, citing a PR that has not merged | Part of the § 4 decision; the post-merge owner exists precisely for this |
| The write lands on a story run, where the task registry is meaningless | Explicit test (§ 7) |
| Lite mode skips the new side effect, as it has before | Explicit test (§ 7) |
| Automation writes a *wrong* row, which is worse than a stale one | Phase 1 lands the check first, so a wrong write is caught by the same assertion |
| Sibling registries are swept without evidence of drift | Phase 2 measures before § 3 is widened |

## 10. Rollback Plan

Remove the write; keep the check. The check is independently valuable — with it and no automation,
the repository is still strictly better off than before this task, because the omission becomes loud.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-09 | 0.1 | Filed after a sweep of 17 stale rows (T67–T96). Root cause: no skill owns the write, and the standard named `finalise` as the owner while telling readers not to tick by hand. The standard was corrected in the same change; this task gives the write an owner. | Claude |

## Progress Tracking

Not started.

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
