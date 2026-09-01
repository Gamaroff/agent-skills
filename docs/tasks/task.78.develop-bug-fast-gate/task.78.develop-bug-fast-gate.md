---
id: task.78
title: "[Task 78] Give develop-bug's fix cycle the same fast gate as the other pipelines"
type: task
description: "Task 75 put a fast gate before the commit in the develop loop and in each qa-fix cycle. develop-bug shares the develop loop, so it picked that half up for free — but its per-cycle fix loop lives in its own document and got nothing. A bug fix cycle can still commit an unformatted tree where a task fix cycle now cannot."
tags: [ci, quality-gate, develop-bug, pipeline, tooling]
category: infrastructure
status: ready-for-development
priority: Medium
risk_level: low
created: 2026-09-01
updated: 2026-09-01
assignee:
estimated_effort_hours: 2
---

# Technical Task: Give develop-bug's fix cycle the same fast gate as the other pipelines

**Status:** Ready for Development

---

## 1. Overview

Task 75 introduced `develop.fastGateCommand` (default `npm run ci:fast`) and placed it at two points:

- the **develop loop** — `shared/resources/develop-pipeline-step-3-develop-loop.md`
- **each qa-fix cycle**, before the commit — `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

`develop-bug` shares the first document, so its develop loop already runs the fast gate. Its
**per-cycle fix loop is a different document** — `shared/resources/develop-bug-step-5-6-verify-loop.md`
— and task 75's file list did not include it.

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

| Document | Used by | Fast gate |
| --- | --- | --- |
| `develop-pipeline-step-3-develop-loop.md` | story, task, **bug** | ✅ |
| `develop-pipeline-step-5-6-qa-loop.md` | story, task | ✅ |
| `develop-bug-step-5-6-verify-loop.md` | **bug** | ❌ |

### Target architecture

The verify loop gains the step-0a equivalent, adapted to its own cycle structure, and
`ci-gate-parity.test.mjs` asserts all three documents name `<fastGateCommand>`.

### Important clarifications

- **This is not a copy-paste.** The verify loop's cycle shape differs from the qa-fix loop's; the gate
  has to sit at that file's own pre-commit seam, wherever it is, and after its own no-change check if
  it has one.
- **Carry the 2-attempt retry budget with it.** Task 75's cycle-2 QA found that the original prose
  claimed `MAX_ITER` bounded the inner retry when it does not. Do not port the earlier wording.

---

## 4. Scope

### In Scope

✅ **The fast gate** in `develop-bug-step-5-6-verify-loop.md`, at that file's pre-commit seam
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
**Files**: `shared/resources/develop-bug-step-5-6-verify-loop.md` (read only)

- [ ] Find the point where a verify cycle commits, and whether it has a no-change check to sit after
- [ ] Note the cycle-counter variable name that file uses, for the log filename

**Dependencies**: none

---

### Phase 2: Add the gate

**Risk Level**: Low
**Files**: `shared/resources/develop-bug-step-5-6-verify-loop.md`

- [ ] Add the fast-gate block at the seam from Phase 1, capturing to a log rather than streaming
- [ ] Reference `develop.fastGateCommand` as `<fastGateCommand>` — **a config key, not a literal**;
      this document ships verbatim into consumer repos with no `ci:fast` script of their own
- [ ] State the **2-attempt retry budget** and what happens after it, matching the corrected wording in
      the qa-loop document — do not restate the `MAX_ITER` claim task 75 removed
- [ ] State why the gate sits where it does, so the next edit does not undo it

**Dependencies**: Phase 1

---

### Phase 3: Hold it with the parity test

**Risk Level**: Low
**Files**: `evals/shared/tests/ci-gate-parity.test.mjs`

- [ ] Extend the existing "develop loop and qa-fix cycle name the fast gate" test to cover all three
      loop documents from a single list
- [ ] Assert each names both `<fastGateCommand>` and the `develop.fastGateCommand` config key

**Dependencies**: Phase 2

---

### Phase 4: Bundle

**Risk Level**: Low
**Files**: `skills/*/references/*`

- [ ] `npm run bundle`; commit the regenerated copies

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Modify

1. ✅ `shared/resources/develop-bug-step-5-6-verify-loop.md` — the fast gate
2. ✅ `evals/shared/tests/ci-gate-parity.test.mjs` — cover all three loop documents
3. ✅ `CHANGELOG.md` — observable for `develop-bug` runs

### Files Regenerated

4. ✅ `skills/*/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] All three loop documents name `<fastGateCommand>` and the config key
- [ ] Removing it from any one of the three fails the test

**Command**: `node --test evals/shared/tests/ci-gate-parity.test.mjs`

### Mutation Proving

- [ ] Remove the gate from the verify loop → the parity test goes red
- [ ] Remove it from the qa-fix loop → red (proves the list is genuinely iterated, not hardcoded to one file)

---

## 9. Success Criteria

### Functional

- [ ] `develop-bug`'s per-cycle fix loop runs `<fastGateCommand>` before committing
- [ ] The gate sits at that file's own pre-commit seam, after any no-change check
- [ ] The retry budget is stated as 2 attempts, without the removed `MAX_ITER` claim

### Regression

- [ ] The other two loop documents are unchanged
- [ ] No new check is added — same tier, same command

### Safety

- [ ] The parity test fails if any one of the three documents loses the gate

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

## Change Log

| Date       | Version | Description                                                  | Author      |
| ---------- | ------- | ------------------------------------------------------------ | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.75 QA trail               | create-task |

---

## Progress Tracking

### Phase 1: Locate the seam
- [ ] Commit point and no-change check identified

### Phase 2: Add the gate
- [ ] Block added at the seam, config key not literal, retry budget stated

### Phase 3: Parity test
- [ ] All three loop documents covered

### Phase 4: Bundle
- [ ] `npm run bundle` committed

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
