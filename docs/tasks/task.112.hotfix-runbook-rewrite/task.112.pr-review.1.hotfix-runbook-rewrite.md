# PR Review Report: PR #414 — docs(task.112): rewrite the hotfix runbook against /develop-bug's hotfix model

**Reviewed:** 2026-09-17
**PR:** [#414](https://github.com/Gamaroff/agent-skills/pull/414) — `feature/task.112.hotfix-runbook-rewrite` → `develop` (OPEN)
**Work item:** [`task.112.hotfix-runbook-rewrite.md`](./task.112.hotfix-runbook-rewrite.md) — resolved via `branch-stem`
**Tracker:** [#413](https://github.com/Gamaroff/agent-skills/issues/413) — OPEN (labels `task`, `priority:medium`; milestone "Technical Tasks (standalone)")
**Verdict:** ✅ APPROVE

Effort: medium. Diff: `origin/develop...origin/feature/task.112.hotfix-runbook-rewrite`, 14 files, 1,410 lines; excluded `*/references/*` (none present). Both lenses dispatched in parallel as read-only Explore subagents (Lens A code 174 s, Lens B conformance 72 s).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.112.implementation.1.hotfix-runbook-rewrite.md` |
| Review report | ✅ | `task.112.review.1.hotfix-runbook-rewrite.md` (READY TO IMPLEMENT 9/10) |
| QA reports | 3 | `task.112.qa.1` / `qa.2` / `qa.3` `.hotfix-runbook-rewrite.md` |
| Gate | PASS | `task.112.gate.3.hotfix-runbook-rewrite.yml` (100) — `top_issues: []`; gates 1 (CONCERNS 90) and 2 (PASS 100) closed in place |
| DoD | ❌ | absent — expected; document is `ready-for-review`, `/finalise` is Step 7 |
| Sprint review | ❌ | absent — expected, same reason |
| Open bugs | 0 | — |
| Handover | ❌ | none — no deferred tracker actions |

The highest gate reached 5c by route 1: the implementation report's `### QA Cycle 3` entry reads `**Action**: Proceeding to 5c (PR conformance review)`.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. `hotfix.md` names `/develop-bug`, the Phase 0d hotfix answer, the actual step order | `docs/runbooks/hotfix.md` §Phase B table (Q1/Q2/Q3), 8-step diff table, diagram | ✅ met |
| 2. Bug filed before the branch; page says which mode | §Pick the bug mode first; §Phase A precedes §Phase B | ✅ met |
| 3. Back-merge is a pipeline-recorded step | §Phase B step 4 row (Issues Log), diagram node K, §Phase C step 2 | ✅ met |
| 4. Tag survives as an explicit human action | §Phase C (human), diagram node J | ✅ met |
| 5. Force-push line unchanged | `hotfix.md` §Pitfalls — byte-identical (`grep -Fx`) | ✅ met |
| 6. Both tracker arms; links resolve; ≤ 150 lines | `ensure-bug-{github,jira}-issue` links; 16 links 0 dead; 141 lines | ✅ met |
| 7. `workflows.md` describes the lead; `faq.md` Step 5c links | `docs/operations/workflows.md` §What the pipelines post; `docs/reference/faq.md:25` | ✅ met |

## Conformance Findings

None.

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — docs/runbooks/hotfix.md:68
  "Phase 0d asks three branch questions once, each with a recommended default" overstates
  develop-bug-step-0-resolve-bug.md §0d, which auto-sets Q3 from Q1 and surfaces Q2 only when
  the repo's integration branch is non-standard — so in the normal case only Q1 is asked, which
  the page's own table two lines later ("auto-set from Q1") already reflects.
  → Reword to "Phase 0d resolves three branch decisions once — Q1 is asked with a recommended
    default, Q2 and Q3 are derived from it" so the sentence and the table agree with §0d.
```

Advisory. `develop-bug/SKILL.md:39` itself summarises 0d as "Q1 branch model, Q2 base branch, Q3 PR target, each with an auto-derived recommended option", which is the wording the page followed; §0d is the more precise source and the table already matches it.

## Machine-Readable Findings

```yaml
findings:
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "docs/runbooks/hotfix.md:68"
    finding: "The sentence says Phase 0d asks three branch questions, but §0d auto-sets Q3 and surfaces Q2 only for a non-standard integration branch, so normally only Q1 is asked — as the page's own table already shows."
    suggested_action: "Reword to say Phase 0d resolves three branch decisions once, with Q1 asked and Q2/Q3 derived from it."
truncated_count: 0
```

## Recommended Actions

1. (Advisory) Tighten `hotfix.md:68` so the sentence matches the table beneath it and §0d — one clause; can ride on any later edit to the page.
