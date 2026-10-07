# PR Review Report: PR #525 — feat(task.129): review measures a document's call-site list with a shared collector

**Reviewed:** 2026-09-29
**PR:** [#525](https://github.com/Gamaroff/agent-skills/pull/525) — `feature/task.129.review-call-site-population-check` → `develop` (OPEN)
**Work item:** [`task.129.review-call-site-population-check.md`](./task.129.review-call-site-population-check.md) — resolved via `branch-stem`
**Tracker:** [#432](https://github.com/Gamaroff/agent-skills/issues/432) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: the whole PR diff (3,116 lines), excluding the generated `skills/*/references/*` copies (6 files — bundled `call-sites.js` and prepass prompts, byte-identical to their `shared/resources/` sources and named in the Files Summary only as "regenerated"). Effort: medium. Invoked by the develop-task pipeline at Step 5c.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.129.implementation.1.review-call-site-population-check-initial-run.md |
| Review report | ✅ | task.129.review.1.review-call-site-population-check.md |
| QA reports | 4 | qa.1 – qa.4 |
| Gate | PASS | task.129.gate.4.review-call-site-population-check.yml (100) |
| DoD | ❌ (expected — Step 7 follows) | — |
| Sprint review | ❌ (expected — Step 7 follows) | — |
| Open bugs | 0 | — |
| Handover | ❌ (none needed) | — |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| CLI returns the sites the guard scans | `call-sites.test.mjs` live-tree test; guard imports `collect()` | ✅ met |
| review-task/review-story flag an unnamed in-scope site on the task.121 fixture | hand run recorded in the implementation report; no committed test (PC-1) | ⚠️ partial |
| Guard floors and proofs unchanged | `comment-slot-coverage.test.mjs` 14/14; populations 24 / 12 | ✅ met |
| CLI ≤ 2 s | 0.17 s | ✅ met |
| One collector, no restated shape | guard defines no regex | ✅ met |
| Mutation proof: remove a root → fixture test names it | `call-sites.test.mjs` root-class tests; mutations recorded in QA reports | ✅ met |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: high — task.129 §8 Integration Tests
  The document ticks the c69f5115^ fixture as an automated test; no committed test references
  c69f5115 — it was a scripted hand run, and qa.2 marks CR-7 FIXED although only its comment half
  was done.
  → Commit the export as a test, or relabel §8 as a scripted hand run and correct qa.2's CR-7 row.

[PC-2] consistency · low · confidence: high — CHANGELOG.md task 129 entry
  Lists five REASONS rows; the shipped table has six (output-closed, exit 5).
  → Add output-closed (5, EPIPE) to the entry.

[PC-3] consistency · low · confidence: medium — task.129 Progress Tracking
  QA and Gate items unticked though four QA reports and gates exist.
  → Tick them against qa.4 / gate.4 (or leave to /finalise).
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/call-sites.js:106
  Callers are told exit 1 means only no-roots, but Node also exits 1 with no JSON when the
  bundled call-sites.js cannot be loaded (MODULE_NOT_FOUND — wrong cwd, partial install).
  → Tell every prose site to branch on the JSON `reason` and treat missing/unparseable JSON as
    "population unknown"; drop the "exit 1 is ONLY no-roots" claim, or move no-roots off 1.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "task.129 §8 Integration Tests"
    finding: "The c69f5115^ fixture is ticked as an automated test but is a scripted hand run with no committed test."
    suggested_action: "Commit the export as a test, or relabel it as a hand run and correct qa.2's CR-7 row."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md task 129 entry"
    finding: "The CHANGELOG lists five REASONS rows; the shipped table has six."
    suggested_action: "Add output-closed (5, EPIPE) to the entry."
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "task.129 Progress Tracking"
    finding: "QA and Gate progress items are unticked though four QA reports and gates exist."
    suggested_action: "Tick them against qa.4 / gate.4."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/call-sites.js:106"
    finding: "Exit 1 also means the collector could not be loaded (MODULE_NOT_FOUND), not only no-roots."
    suggested_action: "Branch on the JSON reason at every prose site; drop the exit-1-only claim or move no-roots off exit 1."
truncated_count: 0
```

## Recommended Actions

1. PC-1 — make the §8 claim true: commit the `c69f5115^` fixture as a test, or say it was a hand run.
2. CR-1 — prose sites branch on the JSON `reason`, not on exit 1.
3. PC-2, PC-3 — CHANGELOG row and progress ticks.
