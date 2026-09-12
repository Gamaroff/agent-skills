# PR Review Report: PR #398 — feat(task.113): develop-next records the acceptance by item.source and merges on finalise's verdict

**Reviewed:** 2026-09-12
**PR:** [#398](https://github.com/Gamaroff/agent-skills/pull/398) — `feature/task.113.develop-next-registry-bookkeeping` → `develop` (OPEN)
**Work item:** [`task.113.develop-next-registry-bookkeeping.md`](./task.113.develop-next-registry-bookkeeping.md) — resolved via `branch-stem`
**Tracker:** [#397](https://github.com/Gamaroff/agent-skills/issues/397) — OPEN
**Verdict:** ⚠️ CONCERNS (one medium consistency finding — the PR description was stale; refreshed during the review. No high-severity finding.)

Diff reviewed: `origin/develop...origin/feature/task.113.develop-next-registry-bookkeeping` with `*/references/*` (bundled copies) excluded — 28 files, +3397/−70. Effort: medium. CI on `c4e7ba4c`: PENDING at review time (finalise checks it).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.113.implementation.1.develop-next-registry-bookkeeping-initial-run.md` (Step-4 snapshot in the diff; working-tree copy newer, committed at Step 8) |
| Review report | ✅ | `task.113.review.1.develop-next-registry-bookkeeping.md` (READY TO IMPLEMENT 8/10) |
| QA reports | 4 | `task.113.qa.1…4.develop-next-registry-bookkeeping.md` |
| Gate | PASS | `task.113.gate.4.develop-next-registry-bookkeeping.yml` (95) — 4 gates, count matches QA reports; 0 open entries |
| DoD | ❌ | absent — correct: status is `ready-for-review`, Step 7 has not run |
| Sprint review | ❌ | absent — same |
| Open bugs | 0 | `task.113.bug.1…6.*.md` all `Closed` |
| Handover | ❌ | none (access `full`; nothing deferred) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — Step 4 `item.source` arms; task-registry arm calls `--annotate`; bug-registry no-cell; re-run `already` | `skills/develop-next/SKILL.md` §Step 4 (three `### item.source` arms); `shared/resources/registry-tick.js` `annotate()`; `evals/develop-next/protocol/skill-shape.test.mjs` "Step 4 registry arm…" | ✅ met |
| SC2 — Step 3 merges accepted + CONCERNS/WAIVED with no open finding; halts on FAIL / open | `skills/develop-next/SKILL.md` §Step 3 matrix + waiver clause; shape test "Step 3: the merge gate is finalise's verdict…" (7 rows asserted) | ✅ met |
| SC3 — Step 2 re-reads the key, updates the lock, re-fires; second run `already` | `shared/resources/develop-pipeline-step-2-review.md` "Re-read the Tracker Key"; `evals/develop-task/protocol/step-contract.test.mjs`; live run: `posted` → `already` | ✅ met |
| SC4 — develop-batch mirror | `skills/develop-batch/SKILL.md` Step 3 lane; `evals/develop-batch/protocol/skill-shape.test.mjs` | ✅ met |
| SC5 — observations close with the PR named | out-of-diff by design (after merge) | — N/A |

## Conformance Findings

```
[PC-2] consistency · medium · confidence: high — PR #398 body
  The PR description was the Step-4 snapshot: stale reason set, "reads —" wording, "9 mutations / 3221 pass", nothing on --issue validation, the header-resolved notes cell, the already commit-and-push branch, the run-state source field, or the six bug reports.
  → Refreshed in place during this review from the document's Implementation Notes (cycles 1–4). Re-read #398.

[PC-1] trail · low · confidence: medium — task.113.implementation.1…md:38
  Pipeline Progress row "5–6. qa-task / qa-fix loop" still reads ⏳ Pending while the Decisions Log and QA Iteration History record four cycles ending PASS.
  → Marked at the Step Transition after 5c (the row is written when the loop exits — this review runs inside it); committed at Step 8.

[PC-3] consistency · low · confidence: high — skills/develop-batch/SKILL.md:473-476 vs the batch[] schema
  The batch lane says "Branch on the item's source" but the batch[] item schema carried no source key.
  → Applied during this review: batch[] items carry "source": "roadmap" at selection; the lane names it as what a resume reads.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — docs/standards/task-registry.md:34
  The standards doc and CHANGELOG still said the Issue cell is filled "only when it reads —" after the engine widened empty to none / n/a / na / tbd.
  → Applied: both reworded to "reads as empty".

[CR-2] cleanup · low · confidence: medium — shared/resources/registry-tick.js:104
  The missing-value guard covered only --pr/--issue; --file and --registry still took the next token blind, so `--registry --json` silently consumed the JSON flag.
  → Applied: one takeValue() helper for all four value flags; fixture over the four shapes.

[CR-3] cleanup · low · confidence: medium — skills/develop-next/SKILL.md:368
  The dirty-registry block pushed and the QA-15 unconditional push followed it, so the dirty path pushed twice (mirrored in develop-batch).
  → Applied: inner push dropped; one unconditional push remains (shape test still asserts the arm ends in a push).
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "PR #398 body"
    finding: "The PR description was the Step-4 snapshot and no longer matched what shipped after four QA cycles."
    suggested_action: "Refreshed from the document's Implementation Notes during this review."
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.113.develop-next-registry-bookkeeping/task.113.implementation.1.develop-next-registry-bookkeeping-initial-run.md:38"
    finding: "Pipeline Progress row 5–6 reads Pending while the log records four cycles ending PASS."
    suggested_action: "Mark Done at the loop-exit transition; committed at Step 8."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "skills/develop-batch/SKILL.md:473"
    finding: "The batch lane branches on source but the batch[] item schema carried no source key."
    suggested_action: "Applied: batch[] items carry source at selection."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "docs/standards/task-registry.md:34"
    finding: "Standards doc and CHANGELOG still say the Issue cell is filled only when it reads —."
    suggested_action: "Applied: reworded to reads as empty."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/registry-tick.js:104"
    finding: "Missing-value guard covered only --pr/--issue; --file/--registry took the next token blind."
    suggested_action: "Applied: takeValue() for all four value flags, with a fixture."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/develop-next/SKILL.md:368"
    finding: "The dirty path pushed twice."
    suggested_action: "Applied: inner push dropped."
truncated_count: 0
```

## Recommended Actions

1. None blocking. All six findings were acted on during the review (PC-1 lands at the Step 8 report commit); re-read the refreshed #398 description before merging.
2. Verdict is advisory — `CONCERNS` records, it does not block; the orchestrator proceeds to `/finalise`.
