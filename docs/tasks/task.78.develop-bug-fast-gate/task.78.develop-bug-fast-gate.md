---
id: task.78
title: "[Task 78] Give develop-bug's fix cycle the same fast gate as the other pipelines"
type: task
description: "Task 75 put a fast gate before the commit in the develop loop and in each qa-fix cycle. develop-bug shares the develop loop, so it picked that half up for free — but its per-cycle fix loop lives in its own document and got nothing. A bug fix cycle can still commit an unformatted tree where a task fix cycle now cannot."
tags: [ci, quality-gate, develop-bug, pipeline, tooling]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-01
updated: 2026-09-04
assignee:
estimated_effort_hours: 2
---

# Technical Task: Give develop-bug's fix cycle the same fast gate as the other pipelines

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.78.review.1.develop-bug-fast-gate.md` implemented 2026-09-04

---

## 1. Overview

Task 75 introduced `develop.fastGateCommand` (default `npm run ci:fast`) and placed it at two points:

- the **develop loop** — `shared/resources/develop-pipeline-step-3-develop-loop.md`
- **each qa-fix cycle**, before the commit — `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

`develop-bug` shares the first document, so its develop loop already runs the fast gate. Its
**per-cycle fix loop is a different document** — `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`
— and task 75's file list did not include it.

That path is the whole reason it was missed. The other two loop documents live in
`shared/resources/` and are bundled into each skill; this one is **skill-native**, authored
directly in `skills/develop-bug/references/` with no shared source. A file list drawn from
`shared/resources/` cannot see it.

The result is an asymmetry with a concrete consequence: **a bug fix cycle can commit an unformatted
tree where a task fix cycle now cannot.**

---

## 2. Motivation

### Current Problems

1. **The gap is invisible from either side.** `develop-bug` looks covered, because the shared step-3
   document it inherits does carry `<fastGateCommand>`. Nothing in either file says the verify loop is
   the odd one out.
2. **It reopens exactly the hole task 75 closed, on one pipeline.** `npm test` does not run
   `format:check`; a verify cycle can therefore close green, push, and fail CI on a file it had just
   rewritten — the task-67 failure, still live for bug fixes.
3. **Bug fixes are where this matters most.** A hotfix cycle is the run least likely to tolerate a
   round trip through red CI.

### Benefits

1. All three pipelines gate a commit the same way.
2. The parity test can assert it, so the next loop document cannot be added without one.

---

## 3. Technical Background

### Current architecture

| Document | Location | Used by | Fast gate |
| --- | --- | --- | --- |
| `develop-pipeline-step-3-develop-loop.md` | `shared/resources/` | story, task, **bug** | ✅ |
| `develop-pipeline-step-5-6-qa-loop.md` | `shared/resources/` | story, task | ✅ |
| `develop-bug-step-5-6-verify-loop.md` | **`skills/develop-bug/references/`** | **bug** | ❌ |

The Location column is the point. Two of the three are shared resources; the third is
skill-native and has no `shared/resources/` counterpart, which is exactly why a
`shared/resources/`-shaped file list skipped it.

### Target architecture

The verify loop gains the step-0a equivalent, adapted to its own cycle structure, and
`ci-gate-parity.test.mjs` asserts all three documents name `<fastGateCommand>` — reading each
one at its own authoritative source, whether that is `shared/resources/` or a skill's
`references/`.

### Important clarifications

- **This is not a copy-paste.** The verify loop's cycle shape differs from the qa-fix loop's; the gate
  has to sit at that file's own pre-commit seam, wherever it is, and after its own no-change check if
  it has one.
- **Carry the 2-attempt retry budget with it.** Task 75's cycle-2 QA found that the original prose
  claimed `MAX_ITER` bounded the inner retry when it does not. Do not port the earlier wording.

---

## 4. Scope

### In Scope

✅ **The fast gate** in `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, at that file's pre-commit seam
✅ **The retry budget** stated correctly, matching the corrected qa-loop wording
✅ **A parity assertion** covering all three loop documents
✅ **Bundle regeneration**

### Out of Scope

❌ **Changing `develop-bug`'s cycle structure** — the gate adapts to the file, not the reverse
❌ **The merge gate** — `develop-bug` PRs merge through the same `develop-next` Step 3 already covered
❌ **Adding checks** — same tier, same command

---

## 5. Breaking Changes

None. A verify cycle that would have committed a red tree now does not; that is the intended change
and it makes no previously-passing run fail.

---

## 6. Implementation Plan

### Phase 1: Locate the seam

**Risk Level**: Low
**Files**: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` (read only)

- [x] Find the point where a verify cycle commits, and whether it has a no-change check to sit after
- [x] Establish how that file refers to its cycle counter. It declares **no shell variable** — unlike
      the qa-loop's `${QA_CYCLE}`, it tracks the counter in prose as `{N}`. Use `{N}`; do not
      introduce a variable the document does not otherwise have

**Dependencies**: none

---

### Phase 2: Add the gate

**Risk Level**: Low
**Files**: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`

- [x] Add the fast-gate block at the seam from Phase 1, capturing to a log rather than streaming;
      name the log with this document's own `{N}` placeholder, per Phase 1
- [x] Reference `develop.fastGateCommand` as `<fastGateCommand>` — **a config key, not a literal**;
      this document ships verbatim into consumer repos with no `ci:fast` script of their own
- [x] State the **2-attempt retry budget** and what happens after it, matching the corrected wording in
      the qa-loop document — do not restate the `MAX_ITER` claim task 75 removed
- [x] State why the gate sits where it does, so the next edit does not undo it

**Dependencies**: Phase 1

---

### Phase 3: Hold it with the parity test

**Risk Level**: Low
**Files**: `evals/shared/tests/ci-gate-parity.test.mjs`

- [x] Extend the existing "develop loop and qa-fix cycle name the fast gate" test to cover all three
      loop documents from a single list
- [x] Assert each names both `<fastGateCommand>` and the `develop.fastGateCommand` config key
- [x] Comment the list: one entry is a `skills/…/references/` path and two are `shared/resources/`
      paths, because each document is read at its own authoritative source. Without the comment the
      mixed list reads like an oversight

**Dependencies**: Phase 2

---

### Phase 4: Bundle drift check

**Risk Level**: Low
**Files**: none expected

- [x] `npm run bundle`, then confirm `git status --porcelain` is empty — confirmed, no diff produced

**This is a check, not a regeneration step.** Neither file this task touches is bundled: the verify
loop is already *in* a skill's `references/` and has no `shared/resources/` source, and
`evals/shared/tests/ci-gate-parity.test.mjs` is not bundled at all. So the expected outcome is **no
diff**. If bundle does produce one, it is drift from some other change — inspect it and commit it
deliberately rather than sweeping it in.

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Modify

1. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` — the fast gate
2. ✅ `evals/shared/tests/ci-gate-parity.test.mjs` — cover all three loop documents
3. ✅ `CHANGELOG.md` — observable for `develop-bug` runs
4. ✅ `docs/reference/configuration.md` — the two descriptions of where the fast gate runs
5. ✅ `skills/develop-next/SKILL.md` — the same description, one site

Files 4 and 5 were **not** in the original plan. They came from QA finding **TASK-78-003**: all three
sites described the gate as running in two places, which this change makes wrong. Recorded here
rather than only in the QA trail, because this section is the file inventory a reviewer diffs
against.

### Files Regenerated

None expected — see Phase 4. `npm run bundle` is run as a drift check and should produce no diff.
**Confirmed on implementation:** bundle produced no diff.

---

## Implementation Record

**Started**: 2026-09-04 · **Completed**: 2026-09-04

### Summary

`develop-bug`'s verify loop now gates its per-cycle commit on `<fastGateCommand>`, closing the one
pipeline where a fix cycle could still commit an unformatted tree. A parity test holds all three
loop documents to it.

### Approach

**Phase 1 — the seam.** `## 5b. Fix (on FAIL — reopen + qa-fix)` runs: step 3 `git diff --stat HEAD`
(no-change → **HALT**), step 4 `git reset` + `/commit-changes` + `git push`. The gate belongs
between them, which is structurally identical to where the qa-fix loop's `0a` sits relative to its
own steps 0 and 1 — so TASK-75-001 (gate placed *before* the no-change check) is avoided by
construction rather than by care.

The document declares **no shell variable** for its cycle counter — it tracks it in prose as `{N}`,
unlike the qa-loop's `${QA_CYCLE}`. The log filename uses `{N}` accordingly; introducing a variable
purely to name a log file would have been a change to the document's conventions, not to its gate.

**Phase 2 — the gate.** Added as step `3a`, capturing to `.claude/state/bug-fix-gate-{N}-*.log`
rather than streaming. The retry budget is stated as **2 attempts**, with `MAX_ITER` described as
bounding *cycles* and explicitly not this inner retry — the wording task 75's QA corrected, not the
wording it replaced. A trailing note records why the gate sits between 3 and 4, and why this
document was the one that missed the gate.

**Phase 3 — the parity test.** The two-element list became a named `LOOP_DOCUMENTS` constant of
three, each read at its own authoritative source. A `length === 3` assertion sits above the loop so
that silently dropping an entry fails rather than shrinking the test's coverage. The mixed shape of
the list (two `shared/resources/` paths, one `skills/…/references/`) carries a comment explaining
that the asymmetry *is* the finding.

**Phase 4 — bundle.** Run as a drift check; produced no diff, as predicted. Neither changed file is
bundled: the verify loop already lives in a skill's `references/` with no shared source, and the
eval test is not bundled at all.

### Testing Results

`node --test evals/shared/tests/ci-gate-parity.test.mjs` — **10/10 pass**.

Mutation proving — each loop document had `<fastGateCommand>` and `develop.fastGateCommand`
stripped in turn, the test re-run, and the file restored:

| Mutated document | Result |
| --- | --- |
| `shared/resources/develop-pipeline-step-3-develop-loop.md` | ✅ red |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | ✅ red |
| `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` | ✅ red |

All three go red under mutation and green on restore, which is what distinguishes a genuinely
iterated list from one that happens to pass on its first element.

### QA Fix Cycle 1 — 2026-09-04

All three MEDIUM findings from gate 1 closed.

- **TASK-78-001** — replaced the numbered "step-3" reference with a named one (the develop loop's
  Test Failure Triage, linked), plus a note recording *why* it is named rather than numbered: the
  qa-fix loop can say "step-3" unambiguously because it has no local step 3, and this file does.
- **TASK-78-002** — added a `**Fast gate**` field to the Verify Cycle report entry, stating that 5b
  step 3a fills it, that it reads `n/a` on a cycle that passed at 5a, and that it is recorded on a
  pass as well as a failure — a result that appears only on failure is indistinguishable from a gate
  that never ran.
- **TASK-78-003** — swept the three live sites that still described the gate as running in two
  places: `docs/reference/configuration.md` (×2) and `skills/develop-next/SKILL.md`. Historical
  records left untouched.

**Found by the Step 3.5 adversarial pass, in this cycle's own fix.** The first version of the
TASK-78-002 fix added the `**Fast gate**` field to *both* the report entry and the tracker-comment
template. The report entry is a document the cycle keeps writing to, so it can be completed later;
the tracker comment is a single POST made at the end of **5a**, before 5b runs the gate — so on a
FAIL cycle that field could never be filled at post time. That is the same defect TASK-78-002
described, inverted: a slot with no value rather than a value with no slot. The comment-template
half was reverted and the asymmetry is now documented in the file so the next editor does not
"restore" it.

### Deferred Work

None. One Important review finding stays open and is **not** deferred implementation work: the task
carries no `github_issue`, so this run posted no tracker signals. Run `/sync-github-task` on the
task file to link it.

---

## 8. Testing Strategy

### Contract Tests

- [x] All three loop documents name `<fastGateCommand>` and the config key
- [x] Removing it from any one of the three fails the test

**Command**: `node --test evals/shared/tests/ci-gate-parity.test.mjs`

### Mutation Proving

- [x] Remove the gate from the verify loop → the parity test goes red — **verified**
- [x] Remove it from the qa-fix loop → red (proves the list is genuinely iterated, not hardcoded to one file) — **verified**, and the develop loop too: all three mutate red

---

## 9. Success Criteria

### Functional

- [x] `develop-bug`'s per-cycle fix loop runs `<fastGateCommand>` before committing
- [x] The gate sits at that file's own pre-commit seam, after any no-change check — step `3a`, between the step-3 no-change HALT and the step-4 commit
- [x] The retry budget is stated as 2 attempts, without the removed `MAX_ITER` claim

### Regression

- [x] The other two loop documents are unchanged — `git diff --stat` touches neither
- [x] No new check is added — same tier, same command (`develop.fastGateCommand`)

### Safety

- [x] The parity test fails if any one of the three documents loses the gate — mutation-proved on all three

---

## 10. Risk Assessment

### High Risk Areas

None. One document gains a step that two others already have.

### Medium Risk Areas

**1. The gate lands at the wrong seam**

- **Risk**: `develop-bug`'s cycle differs from `qa-fix`'s; a mechanical copy could place the gate
  before a no-change check, which is the defect task 75's own QA cycle 1 raised as TASK-75-001.
- **Probability**: Moderate — it is the obvious mistake.
- **Impact**: Low — wasted gate runs, not incorrect results.
- **Mitigation**: Phase 1 exists specifically to locate the seam before writing anything.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the verify loop becomes unworkable.

**Steps**: remove the block and the third entry from the parity test's list.

**Verification**: `develop-bug` verify cycles commit as before; the other two pipelines unaffected.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-04
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 2; cycle 1 was CONCERNS 80/100)

### QA Reports

- **Cycle 2 (latest)**: [task.78.qa.2.develop-bug-fast-gate.md](./task.78.qa.2.develop-bug-fast-gate.md) · [gate](./task.78.gate.2.develop-bug-fast-gate.yml)
- **Cycle 1**: [task.78.qa.1.develop-bug-fast-gate.md](./task.78.qa.1.develop-bug-fast-gate.md) · [gate](./task.78.gate.1.develop-bug-fast-gate.yml)

### Test Coverage Summary

- **Tests Executed**: 2320 (2319 pass, 0 fail)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

Cycle 1 raised three MEDIUM findings, none in the gate's behaviour: **TASK-78-001** — "step-3"
collided with 5b's own step 3; **TASK-78-002** — the failure output was directed at a template with
no field for it; **TASK-78-003** — three live docs still described the gate as running in two places.

All three verified closed in cycle 2 by reading the current files. The cycle-2 refute pass over the
whole branch diff found nothing false. The fix cycle had itself already caught and reverted one
defect of the shape that pass looks for — a change correct in the steady state and wrong in a
transition.

---

## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.75 QA trail               | create-task |
| 2026-09-04 | 1.1     | Review passed (9/10) — corrected the target document's path throughout (it is skill-native, not a shared resource), rewrote Phase 4 as a bundle drift check, and pinned the `{N}` cycle-counter convention | review-task |
| 2026-09-04 |         | Implemented — 4 files, parity test extended to 3 loop documents and mutation-proved on each | develop |
| 2026-09-04 |         | QA gate CONCERNS (80/100) — 3 MEDIUM findings, none in the gate's behaviour | qa-task |
| 2026-09-04 |         | QA findings fixed — all 3 closed, 1 iteration; a fourth defect found by the adversarial pass over the fixes themselves | qa-fix |
| 2026-09-04 |         | QA cycle 2 — gate PASS (100/100), all three findings verified closed, refute pass found nothing new | qa-task |
| 2026-09-04 |         | Step 5c review-pr — CONCERNS; PC-1 closed (§7 Files Summary now lists all five modified files) | review-pr |

---

## Progress Tracking

### Phase 1: Locate the seam
- [x] Commit point and no-change check identified

### Phase 2: Add the gate
- [x] Block added at the seam, config key not literal, retry budget stated

### Phase 3: Parity test
- [x] All three loop documents covered

### Phase 4: Bundle drift check
- [x] `npm run bundle` run; no diff produced

---

## References

- **The gate this extends**: task 75 — [`task.75.quality-gate-matches-ci.md`](../task.75.quality-gate-matches-ci/task.75.quality-gate-matches-ci.md)
- **The seam to mirror**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` step 0a
- **Where it was found**: [`task.75.qa.1.quality-gate-matches-ci.md`](../task.75.quality-gate-matches-ci/task.75.qa.1.quality-gate-matches-ci.md)
- **The ordering mistake to avoid**: TASK-75-001 in [`task.75.gate.1.quality-gate-matches-ci.yml`](../task.75.quality-gate-matches-ci/task.75.gate.1.quality-gate-matches-ci.yml)

---

## Notes

### Important Reminders

- **Config key, not literal.** The step docs ship verbatim to consumers with no `ci:fast` script.
- **Do not port the `MAX_ITER` wording.** Task 75 removed it as a claim the machinery does not support.
