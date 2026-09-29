# PR Review Report: PR #499 — fix(task.160): Step 8 check 4 allowlists finished rows (#498)

**Reviewed:** 2026-09-27
**PR:** [#499](https://github.com/Gamaroff/agent-skills/pull/499) — `feature/task.160.step-8-check-4-allowlists-finished-rows` → `develop` (OPEN)
**Work item:** [`task.160.step-8-check-4-allowlists-finished-rows.md`](./task.160.step-8-check-4-allowlists-finished-rows.md) — resolved via `branch-stem`
**Tracker:** [#498](https://github.com/Gamaroff/agent-skills/issues/498) — OPEN
**Verdict:** ✅ APPROVE

Scope: `git diff origin/develop...origin/feature/task.160.step-8-check-4-allowlists-finished-rows -- . ':(exclude)*/references/*'`, 3,200 lines and 37 files. The 16 bundled `references/` copies were excluded. They are auto-generated from `shared/resources/`, and CI's `bundle:check` verifies them. No excluded path is named as an authored change in the Files Summary or the PR body. Effort: medium.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.160.implementation.1.step-8-check-4-allowlists-finished-rows-initial-run.md` |
| Review report | ✅ | `task.160.review.1.step-8-check-4-allowlists-finished-rows.md` |
| QA reports | 6 | `task.160.qa.{1..6}.step-8-check-4-allowlists-finished-rows.md` |
| Gate | PASS | `task.160.gate.6.step-8-check-4-allowlists-finished-rows.yml` (100); the QA Cycle 6 entry reads `Proceeding to 5c` |
| DoD | ❌ (expected) | Step 7 has not run; status is `ready-for-review` |
| Sprint review | ❌ (expected) | Step 7 has not run |
| Open bugs | 0 | — |
| Handover | ❌ (none) | — |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1–SC5: the check-4 allowlist, the header-located Status column, and failing closed | `shared/resources/develop-pipeline-step-8-commit.md` check 4; `step-8-completion-checklist.test.mjs`, executed cases under bash and zsh | ✅ met |
| SC6: Step 8's row is set ✅ before its commit (Phase 3) | step-8 doc § Final Implementation Report Update; prose guard and executed case | ✅ met |
| SC7: existing cases still pass | CI `test` green; `ci:fast` 4322/0 | ✅ met |
| SC9: mutation proofs | implementation report, and qa.1 through qa.6 | ✅ met |
| SC10–SC12: gates, validate, CHANGELOG | CI green; `CHANGELOG.md` `[Unreleased]` | ✅ met |
| QA additions: resume rule for a record at step 8 | resume contract Phase 0b; step-0; 3 SKILL.md exceptions; executed premise test | ✅ met |

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — task.160.implementation.1…-initial-run.md ## Completion
  The Completion block still reads "Final Status: Escalated" and "QA Iterations: 5", while QA Cycle 6 records a PASS and Proceeding to 5c.
  → Step 8's final report update overwrites both fields before its commit (the step-8 doc already requires it).

[PC-2] scope · low · confidence: medium — task.160.step-8-check-4-allowlists-finished-rows.md §4 Out of Scope
  §4 excludes "develop-bug's own Step 8 prose outside the shared step document", but the diff rewrites develop-bug SKILL.md's Step 8 summary (QA cycle 1, CR-1). §1 and §4 never mention the QA-driven growth into the resume contract, step-0 and three SKILL.md files; only §7 records it.
  → Update §1 and §4 to cover the QA-cycle additions, and reword the develop-bug out-of-scope line.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/develop-task/SKILL.md:194
  A generic "After each step: update the Pipeline Progress table" line survives in all three orchestrators (develop-task:194, develop-story:205, develop-bug:175) with no Step 8 exception. The tests check named lines only, so they cannot see this restatement or any other unlisted one.
  → Enumerate every post-step Pipeline Progress instruction, give each the Step 8 exception or point it at action 2, and have the test check the full list.

[CR-2] cleanup · low · confidence: medium — skills/develop-task/SKILL.md:83
  The "Exception — a record at step 8" comes after recovery items 2 and 3. For a record at step 8, the orchestrator first verifies Step 8 and prints "Resuming from recommended step 9" before item 4 overrides both (the same order appears in develop-story and develop-bug).
  → Move the exception ahead of items 2 and 3, or point them at it.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.implementation.1.step-8-check-4-allowlists-finished-rows-initial-run.md ## Completion"
    finding: "The Completion block says the run escalated after 5 QA iterations while the QA Cycle 6 entry records a PASS and Proceeding to 5c."
    suggested_action: "Step 8's final report update overwrites Final Status and QA Iterations before its commit."
  - id: PC-2
    category: scope
    severity: low
    confidence: medium
    ref: "task.160.step-8-check-4-allowlists-finished-rows.md §4 Out of Scope"
    finding: "§4 excludes develop-bug's own Step 8 prose, yet the diff rewrites it, and §1/§4 never record the QA-driven growth into the resume contract, step-0 and three SKILL.md files."
    suggested_action: "Update §1 and §4 to cover the QA-cycle additions and reword the develop-bug out-of-scope line."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/develop-task/SKILL.md:194"
    finding: "A generic after-each-step Pipeline Progress update instruction survives in all three orchestrators with no Step 8 exception, and the tests check only named lines."
    suggested_action: "Enumerate every post-step Pipeline Progress instruction, add the Step 8 exception to each, and test the full list."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/develop-task/SKILL.md:83"
    finding: "The step-8 recovery exception comes after items 2 and 3, so recovery first verifies Step 8 and names step 9 before the exception overrides both."
    suggested_action: "Move the exception ahead of items 2 and 3, or point them at it."
truncated_count: 0
```

## Recommended Actions

1. PC-1: resolved by Step 8's own final report update (Final Status, QA Iterations). No separate action.
2. CR-1 and CR-2: both are about how the orchestrators treat a Step 8 record or row. Fold them into follow-up task.161 (the Step 8 post-commit resume gap).
3. PC-2: bring §1 and §4 of the task document in line with what shipped. `/finalise` should do this before acceptance.
