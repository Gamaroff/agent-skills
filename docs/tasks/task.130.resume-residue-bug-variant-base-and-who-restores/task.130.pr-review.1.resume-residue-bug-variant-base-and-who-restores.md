# PR Review Report: PR #441 — feat(task.130): resume probe binds its base or HALTs; detector read-only; who-restores stated once; --restore --which / --accept-legacy (#437)

**Reviewed:** 2026-09-20
**PR:** [#441](https://github.com/Gamaroff/agent-skills/pull/441) — `feature/task.130.resume-residue-bug-variant-base-and-who-restores` → `develop` (OPEN; checks 5/5 SUCCESS on `bd3fac0b`)
**Work item:** [`task.130.resume-residue-bug-variant-base-and-who-restores.md`](./task.130.resume-residue-bug-variant-base-and-who-restores.md) — resolved via `branch-stem`
**Tracker:** [#437](https://github.com/Gamaroff/agent-skills/issues/437) — OPEN (task, priority:high)
**Verdict:** ⚠️ CONCERNS

Scope: whole-branch diff `origin/develop...HEAD` with `*/references/*` (56 bundled, auto-generated copies) excluded; the authored `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md` was added back because the PR body and the Files Summary both name it. 67 files, 7,204 diff lines reviewed. Effort: medium. Invoked as develop-task Step 5c (lite mode).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.130.implementation.1.…-initial-run.md` (Pipeline Progress rows 1–4 ✅; 5–6 in progress → cycle 6 `Proceeding to 5c`) |
| Review report | ✅ | `task.130.review.1.…md` (8/10) |
| QA reports | 6 | `task.130.qa.1…6.…md` |
| Gate | CONCERNS, no open entry | `task.130.gate.6.…yml` (90) — gates 1–5: CONCERNS 85 · FAIL 70 · CONCERNS 80 · FAIL 70 · CONCERNS 85; loop limit at 5, 2 cycles granted |
| DoD | ❌ (correct — finalise not yet run) | — |
| Sprint review | ❌ (n/a for a task) | — |
| Open bugs | 0 | 12 bug reports, all Closed |
| Handover | ❌ (none) | — |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Probe base bound on every report variant, else HALT (no silent `develop` default) | `develop-pipeline-resume-contract.md` Phase 1 block; `tests/probe-base-binding.test.mjs` + 3 fixtures; eval fixture 17 | ✅ met |
| develop-bug root-cause dispatch inside the `waiting_on` population | `develop-bug-step-3-investigate-fix.md`; `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (floor 17) | ✅ met |
| Detector read-only; MERGED snapshot deleted by the orchestrator from one stated loop, verified on disk | contract § Consume Output (bind + delete blocks); `pipeline-resume-detector-prompt.md`; `tests/stale-snapshot-delete.test.mjs` (36) | ✅ met |
| Who restores stated once; other sites cite | contract § Restore the lock marker; `tests/who-restores-single-statement.test.mjs` | ✅ met |
| Gate-6 futures: stderr label, `--restore --which`, `--accept-legacy`, step-8 legacy cleanup, lint rc split | `advance-pipeline-lock.sh` (+85 scenarios), `grant-qa-cycles.sh` (+42), `develop-pipeline-step-8-commit.md`, `tests/halt-snippet-glob-safe.test.mjs`, `tests/report-lint-call-sites.test.mjs` | ⚠️ partial — `--accept-legacy` restores but does not stamp the directory (CR-1) |
| CHANGELOG entry; bundled references in sync | `CHANGELOG.md` [Unreleased]; `bundle:check` 0 problems in CI | ✅ met |

## Conformance Findings

```
[PC-2] consistency · medium · confidence: high — task.130.….md:384-394 (Change Log)
  The Change Log began at "QA gate 2 FAIL": the six earlier rows (1.0 draft, 1.1 review, status → ready-for-development, Implemented, gate 1, fix 1) present at 3479b14a were dropped at fdba78d9 when a corrupted block was repaired.
  → Restored in the working tree during this review from `git show 3479b14a:<task doc>` (15 rows now); committed with the finalise commit. Follow-up: check whether change-log.js's upsert should have preserved them.

[PC-3] scope · medium · confidence: high — docs/tasks/task.131.*, docs/tasks/task.132.*, docs/tasks/task-registry.md (commit d2395807)
  PR #441 also lands the task.131 and task.132 planning documents and registry rows from the pre-pipeline create-task commit d2395807, which no criterion or phase of task.130 calls for.
  → Accepted deviation, stated here: they are planning documents for #438/#439 authored in the same sitting; splitting a reviewed six-cycle PR to move 4 doc files is not worth the history rewrite.

[PC-1] coverage · low · confidence: medium — §9 Success Criteria › Migration, second checkbox
  The ticked criterion asks for task.124.pr-review.1 CR-1..CR-5 and the gate-6 futures to be referenced as closed in the implementation report; the report only says "Close PR #436's three medium Step 5c findings and the four gate-6 futures".
  → Add a closure list to the report's Completion section at finalise mapping each item to the phase that closed it.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/advance-pipeline-lock.sh:250
  `--restore --accept-legacy <doc-dir>` rebuilds the lock with the ordinary jq filter and never stamps `task_or_story_directory = <doc-dir>`, so the operator's explicit assertion is discarded: the next PreCompact pause or HALT snapshots a legacy-shaped file again — refused by `--restore`, unmatched by the detector, and eligible for Step 8's sole-legacy delete from any other document's completed run.
  → When ACCEPT_LEGACY=1 and the chosen candidate carries no directory, set `.task_or_story_directory = $doc_dir` in the rebuild jq; add a scenario asserting the field on the restored lock. Confirmed by reading the rebuild at :251.

[CR-2] cleanup · low · confidence: medium — shared/resources/advance-pipeline-lock.sh:202
  Without `--accept-legacy`, a bystander legacy snapshot beside a matched claim prints the full "pass --accept-legacy … or delete it" advice on stderr even though the restore then succeeds from the claim (exit 0).
  → Emit the advice only from the final no-candidate branch; downgrade the per-candidate line to a neutral "skipped: no task_or_story_directory".

[CR-3] cleanup · low · confidence: medium — shared/resources/develop-pipeline-resume-contract.md:118
  Pass 2's `SNAP_DIR=$(jq -r … 2>/dev/null)` reports an unparsable snapshot and a parsed object with no directory with the same `'absent'` HALT text; Step 8 names the unparsable case separately.
  → `jq -e 'type == "object"'` first and HALT with "not a JSON object", mirroring the Step 8 arm. (QA gate 5 observed the same during its re-probe.)
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md:384-394"
    finding: "Six Change Log rows (draft, review, status, implementation, gate 1, fix 1) present at 3479b14a were dropped at fdba78d9 when a corrupted block was repaired."
    suggested_action: "Restore the rows from git show 3479b14a (done in the working tree) and check whether change-log.js should have preserved them."
  - id: PC-3
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.131.markdown-structure-sink-internal-validator-class/, docs/tasks/task.132.unbound-variable-default-review-check/, docs/tasks/task-registry.md"
    finding: "PR #441 also lands the task.131 and task.132 planning documents and registry rows from pre-pipeline commit d2395807, outside task.130's scope."
    suggested_action: "Accept explicitly (done) or split d2395807's task.131/132 hunks into their own docs PR."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "§9 Success Criteria › Migration, second checkbox"
    finding: "The implementation report never lists task.124.pr-review.1 CR-1..CR-5 and the gate-6 futures as closed by name."
    suggested_action: "Add a closure list to the report's Completion section mapping each to the phase that closed it."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/advance-pipeline-lock.sh:250"
    finding: "--restore --accept-legacy never stamps task_or_story_directory on the rebuilt lock, so the next snapshot derived from it is legacy-shaped again and the recovery does not stick."
    suggested_action: "Set .task_or_story_directory = $doc_dir in the rebuild jq when ACCEPT_LEGACY=1 chose a directory-less candidate; assert it in a test scenario."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/advance-pipeline-lock.sh:202"
    finding: "A bystander legacy snapshot prints the --accept-legacy advice even when the restore succeeds from a matched claim."
    suggested_action: "Emit the advice only from the final no-candidate branch."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-resume-contract.md:118"
    finding: "An unparsable snapshot and a parsed object with no directory report the same 'absent' HALT text in the delete block's Pass 2."
    suggested_action: "Check jq -e 'type == \"object\"' first and HALT with a distinct message."
truncated_count: 0
```

## Recommended Actions

1. **CR-1** — stamp `task_or_story_directory` on an `--accept-legacy` restore and assert it; this is the one finding on behaviour the PR introduces.
2. **PC-2** — already restored in the working tree; lands with the finalise commit. Investigate the change-log.js repair path that dropped the rows.
3. **PC-1** — closure list in the implementation report's Completion section at finalise.
4. **PC-3** — accepted as stated; no action.
5. CR-2, CR-3 and the six QA advisories (gate 5/6) → one follow-up task.
