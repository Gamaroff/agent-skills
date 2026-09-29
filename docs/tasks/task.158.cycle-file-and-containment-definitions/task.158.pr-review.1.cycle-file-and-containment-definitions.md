# PR Review Report: PR #521 — fix(qa): read-back requires this cycle's links; one definition for the cycle's gate file and for containment (task.158)

**Reviewed:** 2026-09-29
**PR:** [#521](https://github.com/Gamaroff/agent-skills/pull/521) — `feature/task.158.cycle-file-and-containment-definitions` → `develop` (OPEN)
**Work item:** [`task.158.cycle-file-and-containment-definitions.md`](./task.158.cycle-file-and-containment-definitions.md) — resolved via `branch-stem`
**Tracker:** [#494](https://github.com/Gamaroff/agent-skills/issues/494) — OPEN
**Verdict:** ✅ APPROVE

---

## Scope

The diff is `origin/develop...origin/feature/task.158…`, 3916 lines. The 52 bundled `references/*`
files are excluded, but the six new `skills/*/references/qa-cycle.sh` copies are re-included,
because the work item's Files Summary names them.

The effort was `medium` for both lenses. The code lens was dispatched at 14:13Z and returned in
about 2.6 minutes. The conformance lens was dispatched at 14:13Z and returned in about 1 minute.

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.158.implementation.1.cycle-file-and-containment-definitions-initial-run.md` (updates deferred to Step 8 by design) |
| Review report | ✅ | `task.158.review.1.cycle-file-and-containment-definitions.md` |
| QA reports | 3 | `task.158.qa.{1,2,3}.cycle-file-and-containment-definitions.md` |
| Gate | PASS | `task.158.gate.3.cycle-file-and-containment-definitions.yml` (100) |
| DoD | — | not yet (Step 7) |
| Sprint review | — | not yet (Step 7) |
| Open bugs | 0 | `task.158.bug.1…` Closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 cycle-2 stale links → exit 1 (task+story); re-linked → 0 | `shared/resources/qa-read-back.js` membership check; `qa-read-back.test.mjs` cycle-2 tests | ✅ met |
| SC2 Step 13b names gate.02, BLOCKING_COUNT 1 | qa-task/qa-story Step 13b `--path gate`; eval THIS_GATE rows | ✅ met |
| SC3 resume: gate.02 → 2, empty → 0 | resume block; eval "four answers" test | ✅ met |
| SC4 `--entry` accepts `..name`, refuses root/`../x`/outside | `security-probe.mjs` `isWithin` sites; resolveEntry task.158 test | ✅ met |
| SC7 guard zero hits on shipped, ≥1 per old shape | `tests/qa-cycle.test.js` GATE_SELECTION + shell-helper guard | ✅ met |
| SC8 one ESM + one CJS isWithin, parity | `doc-links.js` export; parity test | ✅ met |
| SC10 `npm run ci` clean | — | ⚠️ partial — runs before `/finalise` (PC-1) |

## Conformance Findings

```
[PC-1] trail · low · confidence: high — task.158 Phase 4 / Progress Tracking vs SC10
  Phase 4 and Progress Tracking tick "`npm run ci` clean" while SC10 is unticked and only ci:fast is recorded.
  → Untick that part until the full CI runs, or record a full `npm run ci` run.

[PC-2] trail · low · confidence: medium — task.158.implementation.1…initial-run.md
  The report on the PR head has no QA Cycle entries; they are uncommitted working-tree changes.
  → Commit and push the updated report (the pipeline does so at Step 8 by design).
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/qa-cycle.sh:35
  The header's "only definition" claim is enforced over fenced blocks only; qa-fix SKILL.md prose and qa-findings-ingester-prompt.md still tell an agent to pick "the highest number" itself.
  → Move those readers onto `qa-cycle.sh --path gate` or narrow the header claim to the files the guard scans.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "task.158.cycle-file-and-containment-definitions.md Phase 4 / Progress Tracking vs SC10"
    finding: "Phase 4 and Progress Tracking tick `npm run ci` clean while SC10 is unticked and only ci:fast is recorded."
    suggested_action: "Untick that part until the full CI runs, or record a full `npm run ci` run."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "task.158.implementation.1.cycle-file-and-containment-definitions-initial-run.md"
    finding: "The report on the PR head has no QA Cycle entries; they are uncommitted working-tree changes."
    suggested_action: "Commit and push the updated report (Step 8 does so by design)."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/qa-cycle.sh:35"
    finding: "The header's only-definition claim is enforced over fenced blocks only; qa-fix prose and the findings-ingester prompt still pick the highest-numbered gate themselves."
    suggested_action: "Move those readers onto qa-cycle.sh --path gate or narrow the header claim to the scanned files."
truncated_count: 0
```

## Recommended Actions

1. PC-1: run the full `npm run ci` before `/finalise`, and let SC10 carry the result.
2. CR-1: add qa-fix and the findings-ingester prose readers to the follow-up that already covers develop-next (QA2-CR-2) and the helper's exit code (QA3-CR-1).
