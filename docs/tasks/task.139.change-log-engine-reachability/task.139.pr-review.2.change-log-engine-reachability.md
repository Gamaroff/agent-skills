# PR Review Report: PR #465 — fix(change-log): ship change-log.js with every skill whose prose runs it (#463)

**Reviewed:** 2026-09-22 (run 2 — after the obs #154 scope widening and QA cycles 3–5)
**PR:** [#465](https://github.com/Gamaroff/agent-skills/pull/465) — `feature/task.139.change-log-engine-reachability` → `develop` (OPEN)
**Work item:** [`task.139.change-log-engine-reachability.md`](./task.139.change-log-engine-reachability.md) — resolved via `branch-stem`
**Tracker:** [#463](https://github.com/Gamaroff/agent-skills/issues/463) — OPEN (board: In Progress)
**Verdict:** ⚠️ CONCERNS

Scope: whole-branch diff `origin/develop...33ce169a`, 27 files after excluding the byte-identical bundle copies (`skills/*/references/{document-change-log.md,doc-links.js,finalise-fix-and-recheck*}` — their shared sources are in the diff). Run 1 (APPROVE) covered the original deliverable; this run covers everything since. Effort: medium, both lenses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | branch copy stops at the Step 7 halt; working-tree copy carries Steps 5–7 through cycle 5 (committed at Step 8) |
| Review report | ✅ | `task.139.review.1.*` — READY TO IMPLEMENT 9/10 |
| QA reports | 5 | qa.1 CONCERNS 80 · qa.2 PASS 100 · qa.3 CONCERNS 50 · qa.4 CONCERNS 80 · qa.5 CONCERNS 90 (no open entry) |
| Gate | CONCERNS | `task.139.gate.5.*` (90, `top_issues: []`, Maintainability reservation C5-CR-2) |
| DoD | ⚠️ | `task.139.dod.1.*` — run 1 NOT ACCEPTED (CI link-check red → obs #154); a fresh run follows this review |
| Sprint review | ❌ | not yet |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

SC1–SC7 unchanged from run 1 — all ✅ met. **The widened deliverable (doc-links engine, corpus guard, review-* check 2, finalise 8a clause, evaluator `documentPath`) has no criterion of its own** — see PC-7.

## Conformance Findings

```
[PC-6] scope · medium · confidence: high — task.139 § 7 items 6–10 vs the diff
  finalise-fix-and-recheck.mjs, its preconditions JSON and its test (+ bundled finalise copies)
  changed but are not in "Files Added at Finalise" — the widening's file list is incomplete for
  exactly the precondition the evaluator enforces.
  → Add item 11 to § 7 and mention the evaluator in § 4's widening item.

[PC-7] scope · medium · confidence: high — § 6 / § 8 / § 9 vs gate.5
  The widened deliverables have no phase, no § 8 line and no success criterion; the finalise AC
  pass will trace 7/7 and never touch the ~1,200 added lines.
  → Add SC8 and a § 8 line for doc-links.test.mjs, or state in § 9 that the addition is accepted on gate.5 evidence.

[PC-3] consistency · medium · confidence: high — task.139 Change Log
  The owner's widening decision (5022ad02) is in § 4, § 7, CHANGELOG and the observation log but
  has no Change Log row; the history jumps from the DoD halt to "QA cycle 3 on the obs #154 addition".
  → Append a row through change-log.js recording the widening.

[PC-4] consistency · low · confidence: high — § 1 Scope line; Implementation Record summary
  Both still describe only the original deliverable; no Implementation Record paragraph for 5022ad02.
  → One paragraph mirroring the implementation report's Resume entry; a § 1 pointer to § 4.

[PC-2] trail · low · confidence: high — § Definition of Done - Gaps Identified
  Run-1 gap section cites gate.2 and leaves three completed boxes unticked.
  → Tick them, or let the fresh /finalise run replace the section.

[PC-5] consistency · low · confidence: high — obs #152 resolution
  Still reads "PR pending at develop Step 3"; the implementation report claims a Step 4 update that did not happen.
  → Name PR #465 in the resolution.

[PC-1] trail · low · confidence: high — implementation report Pipeline Progress / Completion
  Steps 5–6 row and Completion block are stale beside the Decisions Log.
  → Step 8 updates them.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/finalise/SKILL.md:2365 (8a docs-link clause)
  The clause substitutes {document-path} into documentPath / mutationProof.test / --file, but the
  evaluator accepts only the repo-root-relative form on all three; an absolute or ./ path refuses
  the exception with no hint. The 8a.1 record template has no documentPath slot.
  → Say the path is repo-root-relative (take it from the engine's --json `file`) and add the slot to the template.

[CR-2] bug · low · confidence: medium — skills/review-task/SKILL.md:787
  review-epic, review-prd and review-bug also review documents docs-link-check reads and got no engine.
  → Name the population once and extend, or record why they are excluded.

[CR-3] bug · low · confidence: medium — shared/resources/doc-links.js:272
  "does not exist" and "exists on disk but untracked" print one ✖; a freshly created sibling reads as dead.
  → Annotate the broken entry (untracked: true) and say so on the ✖ line.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-6
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md"
    finding: "The evaluator files changed by the widening are absent from § 7 Files Summary and § 4 Scope."
    suggested_action: "Add § 7 item 11 (finalise-fix-and-recheck.mjs, preconditions JSON, test, bundled copies) and mention the evaluator in § 4."
  - id: PC-7
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md"
    finding: "The widened deliverable has no § 6 phase, § 8 line or § 9 criterion; the finalise AC pass cannot trace it."
    suggested_action: "Add SC8 and a § 8 line for shared/resources/tests/doc-links.test.mjs."
  - id: PC-3
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md"
    finding: "The owner's scope-widening decision has no Change Log row."
    suggested_action: "Append a row through change-log.js recording the widening (5022ad02)."
  - id: PC-4
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md:30"
    finding: "§ 1 Scope line and the Implementation Record summary describe only the original deliverable."
    suggested_action: "Add an Implementation Record paragraph for 5022ad02 and a § 1 pointer to § 4."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md:329"
    finding: "The run-1 gap section is stale (cites gate.2; three completed boxes unticked)."
    suggested_action: "Tick the completed boxes or let the fresh /finalise run replace the section."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "observation log entry 0152 (resolution)"
    finding: "Resolution still reads 'PR pending'; the implementation report claims an update that did not happen."
    suggested_action: "Name PR #465 in obs #152's resolution."
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.implementation.1.change-log-engine-reachability-initial-run.md:38"
    finding: "Pipeline Progress Steps 5–6 row and Completion block are stale beside the Decisions Log."
    suggested_action: "Update both when Step 8 lands the final report."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/finalise/SKILL.md:2365"
    finding: "8a docs-link clause: documentPath / mutationProof.test must be repo-root-relative but the clause says {document-path}; the 8a.1 record template has no documentPath slot."
    suggested_action: "State the repo-root-relative form (from the engine's --json file field) and add the slot to the template."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "skills/review-task/SKILL.md:787"
    finding: "review-epic / review-prd / review-bug review link-checked documents and got no engine; the population is not named."
    suggested_action: "Name the population once and extend, or record the exclusion."
  - id: CR-3
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/doc-links.js:272"
    finding: "A target that exists on disk but is untracked prints the same ✖ as a missing one."
    suggested_action: "Annotate untracked: true and say so on the ✖ line."
truncated_count: 0
```

## Recommended Actions

1. PC-3, PC-6, PC-7, PC-4, PC-2, PC-5 — bring the work item's own record in line with what shipped **before** `/finalise` re-runs (documentation only; the fresh DoD run then verifies against the corrected record).
2. CR-1 — one-sentence clarification + one template line in the finalise 8a clause (prose already reviewed in cycles 3–5).
3. CR-2, CR-3 — follow-up with the cycle-5 advisories (C5-CR-1..4) and the carried cycle-2 / run-1 items.
