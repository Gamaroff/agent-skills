# PR Review Report: PR #593 — feat(task.187): review checks for plan shapes

**Reviewed:** 2026-10-07
**PR:** [#593](https://github.com/Gamaroff/agent-skills/pull/593) — `feature/task.187.review-plan-shape-checks` → `develop` (OPEN)
**Work item:** [`task.187.review-plan-shape-checks.md`](./task.187.review-plan-shape-checks.md) — resolved via `branch stem`
**Tracker:** [#586](https://github.com/Gamaroff/agent-skills/issues/586) — OPEN
**Verdict:** ✅ APPROVE

Scope: `origin/develop...origin/feature/task.187.review-plan-shape-checks`, 12 files. `*/references/*` was
excluded except `skills/review-story/references/finalise-dod-ac-prompt.md`: the PR body names it
(review-story now bundles it), so it was reviewed. Run inside `/develop-task` Step 5c, before
finalise, so no DoD is expected yet. Effort: medium. Both lenses ran as general-purpose subagents,
read-only by instruction (project memory records Explore agents hanging).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.187.implementation.1.review-plan-shape-checks-initial-run.md` |
| Review report | ✅ | `task.187.review.1.review-plan-shape-checks.md` |
| QA reports | 1 | `task.187.qa.1.review-plan-shape-checks.md` |
| Gate | PASS | `task.187.gate.1.review-plan-shape-checks.yml` (100) |
| DoD | ❌ (expected — Step 7 writes it) | — |
| Sprint review | ❌ (expected — finalise writes it) | — |
| Open bugs | 0 | — |
| Handover | ❌ (none needed) | — |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| review-task Step 3 checks 15–20, with trigger, worked example, severity | `skills/review-task/SKILL.md`; `tests/review-plan-shape-checks.test.js` per-check cases | ✅ met |
| review-story Step 4 checks 11–16 | `skills/review-story/SKILL.md`; same test | ✅ met |
| Step 6 check 2 / check 4 items; Step 7 guard exemption | `skills/review-task/SKILL.md`; Step 6 and Step 7 test cases | ✅ met |
| review-story Step 5 items, check 10, check 11 | `skills/review-story/SKILL.md`; Step 5 test case | ✅ met |
| Every tracked test file reached by `npm test` | `tests/test-runner-reach.test.js` | ✅ met |
| CHANGELOG entry | `CHANGELOG.md` `[Unreleased]` | ✅ met |

## Conformance Findings

None.

## Code Review Findings

```
[CR-1] bug · low · confidence: high — skills/review-task/SKILL.md:1031
  Check 19 (and review-story check 15) says the reconstruction states live in
  develop-pipeline-resume-contract.md, a bare filename neither skill bundles, so a consumer
  install points at a file that is not there (a second instance of QA's CR-1).
  → Cite it so the bundler ships it, or make the sentence consumer-neutral; fix with QA CR-1.

[CR-2] bug · low · confidence: high — tests/test-runner-reach.test.js:112
  Plan Phase 4 is ticked for "on failure, name each file and the glob that would reach it",
  but the failure message lists only the unreached files plus generic advice.
  → Print a suggested glob or bash entry per unreached file, or reword the plan line.

[CR-3] cleanup · low · confidence: medium — tests/review-plan-shape-checks.test.js:155
  The control-case, prose-in-a-fence and CI-platform bullets are matched anywhere in Step 6 / Step 5,
  not inside review-task check 2 or review-story item 4, so a bullet moved elsewhere still passes.
  → Bound each item as check 4 already is, and assert inside the slice.
```

## Machine-Readable Findings

```yaml
findings:
  - id: CR-1
    category: bug
    severity: low
    confidence: high
    ref: "skills/review-task/SKILL.md:1031"
    finding: "Check 19 and review-story check 15 point at develop-pipeline-resume-contract.md, which neither skill bundles, so a consumer install points at a missing file."
    suggested_action: "Cite the contract so the bundler ships it, or make the sentence consumer-neutral, together with the QA CR-1 fix."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "tests/test-runner-reach.test.js:112"
    finding: "The plan claims the failure names the glob that would reach each file, but the message lists only the files."
    suggested_action: "Add a suggested glob or bash entry per unreached file, or reword the plan line."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "tests/review-plan-shape-checks.test.js:155"
    finding: "Three bullets are matched anywhere in their section, not inside the item they belong to."
    suggested_action: "Bound each item and assert inside the slice, as check 4 is."
truncated_count: 0
```

## Recommended Actions

1. CR-1 together with QA CR-1 and CR-3: one consumer-neutrality pass over the shipped prose (non-blocking follow-up).
2. CR-2: make the reach test's failure message match the plan, or correct the plan line.
3. CR-3: tighten the bullet assertions to their items.
