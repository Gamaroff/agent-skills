# PR Review Report: PR #489 — fix(develop-pipeline): five steps that fail or overreach on correct input (task.147)

**Reviewed:** 2026-09-25
**PR:** [#489](https://github.com/Gamaroff/agent-skills/pull/489) — `feature/task.147.develop-pipeline-step-mechanics` → `develop` (OPEN)
**Work item:** [`task.147.develop-pipeline-step-mechanics.md`](./task.147.develop-pipeline-step-mechanics.md) — resolved via `branch stem`
**Tracker:** [#477](https://github.com/Gamaroff/agent-skills/issues/477) — OPEN
**Verdict:** ✅ APPROVE

Run as develop-task Step 5c (the QA loop's exit gate) after granted cycle 6, `--effort medium`. **Scope:** `origin/develop...origin/feature/task.147.develop-pipeline-step-mechanics`, 49 files and 5908 diff lines. 17 `*/references/*` bundled copies are excluded: the task's Files Summary counts them as `npm run bundle` output, and `bundle:check` reports 0 problems. Both lenses ran as independent Explore subagents. The conformance lens returned in about 75 s and the code lens in about 196 s, both within budget.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.147.implementation.1.develop-pipeline-step-mechanics-initial-run.md` (the working-tree update is committed at Step 8 by design) |
| Review report | ✅ | `task.147.review.1.develop-pipeline-step-mechanics.md` |
| QA reports | 6 | `task.147.qa.1` … `task.147.qa.6` |
| Gate | PASS | `task.147.gate.6.develop-pipeline-step-mechanics.yml` (100) |
| DoD | ❌ (expected) | Step 7 `/finalise` has not run. This review is Step 5c |
| Sprint review | ❌ (expected) | Written by Step 7 |
| Open bugs | 0 | bugs 1–14 are all Closed |
| Handover | — | none |

## Acceptance Criteria Traceability

All 16 Success Criteria are ticked, and each names its evidence test or command. The conformance lens found one criterion whose stated evidence does not hold as written (PC-1). The rest are traced to their named tests: `step-8-*.test.mjs`, `commit-changes-scope-mode.test.mjs`, `verify-push-state.test.sh` (32 cases), the merge-delete and develop-next re-sync tests, and the executed-prose suites. Gate 6's clean-checkout `ci:fast`, `bundle:check` and `lint:shell` runs back the quality criteria.

| Criterion | Evidence in diff | Status |
|---|---|---|
| Step 8 check 3 reads both Completion templates | `step-8` tests | ✅ met |
| Step 4 leak check (multi-line and one-line bodies) | Step 4 leak-check tests | ✅ met |
| §5b gate and QA report tracked before the fast gate | step-5-6 staging tests | ✅ met |
| `/commit-changes --scope` leaves out-of-scope changes unstaged | `commit-changes-scope-mode.test.mjs` | ✅ met |
| `verify-push-state --scope` semantics | `verify-push-state.test.sh` 1–32 | ✅ met |
| Step 8 check 5 scoped to the work-item dir | step-8 checklist fixture | ✅ met |
| Dirty-tree merges drop `--delete-branch` (≥ 2 sites) | merge-delete tests | ✅ met |
| develop-next re-sync is its own step | `merge-de…` / re-sync executed tests | ✅ met |
| Step 3 inline branch with its precondition | Step 3 loop bodies | ✅ met |
| Test time and no network | `spawnBudget()`, stubbed `gh`, local bare origin | ✅ met |
| Every fix mutation-proved | implementation report and QA reports | ✅ met |
| ci:fast / format / bundle clean | gate 6 | ✅ met |
| No hand edit under `skills/*/references/` | six commits touch bundled copies (PC-1) | ⚠️ partial (wording) |
| CHANGELOG cites task 147 and the observations | CHANGELOG `[Unreleased]` (PC-2) | ⚠️ partial (QA-cycle additions not named) |
| Step 8 prose describes the scoped form | `develop-pipeline-step-8-commit.md` | ✅ met |

## Conformance Findings

```
[PC-1] coverage · low · confidence: medium — §9 Code Quality: "No hand edit under skills/*/references/"
  The criterion is ticked, but six commits (bf0e8282 and the qa-fix commits f4dee2d2, c3ad4687,
  0170615d, 411aa92f, a7f93126) change bundled copies, and develop-bug-step-7-close-bug.md is a
  hand-edited source, so the stated evidence does not hold as written.
  → Reword it to what is proven (bundle:check clean; develop-bug's step-7 reference is the only
    hand-edited references/ file), or split the regenerated copies into their own bundle commit.

[PC-2] consistency · low · confidence: high — CHANGELOG.md [Unreleased] task 147 entries (lines 91, 196)
  The entries describe only the originally planned fixes. They leave out the QA-cycle additions:
  Step 8 {extra-scope-paths} (bug-registry for general bugs), the Step 4 Pre-flight Guard hold
  records, Step 8 check 5 failing on unrestored holds, and verify-push-state --scope exit 2 on a
  scope matching no path git knows.
  → Add one bullet naming these, including the two new Step 8 failure modes a caller can hit.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/develop-pipeline-step-4-create-pr.md:119
  The Pre-flight Guard reuses HOLD_DIR on a retry. A path held by the first run that reappears
  before the retry is overwritten (file) or nested (directory: HOLD_DIR/dir/dir) by the second mv,
  and Restore puts it back one level too deep.
  → Check for an existing "$HOLD_DIR/$f" before the mv; halt, or hold under a suffixed name.

[CR-2] cleanup · low · confidence: medium — shared/resources/verify-push-state.sh:140
  The scope gate scans the duplicated ls-files + ls-tree list once per --scope in a bash read
  loop: O(scopes × files) on every Step 8 run.
  → Deduplicate once (sort -zu), or test each scope with a literal pathspec plus the HEAD tree.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "task.147.develop-pipeline-step-mechanics.md §9 Code Quality: No hand edit under skills/*/references/"
    finding: "A ticked criterion's stated evidence (references/ paths changed only in the bundle commit) does not hold: six commits touch bundled copies, and one hand-edited source lives under references/."
    suggested_action: "Reword the criterion to what is proven, or split the regenerated copies into their own bundle commit."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md [Unreleased] task 147 entries (lines 91, 196)"
    finding: "The CHANGELOG entries omit the behaviour the QA cycles added, including two new Step 8 failure modes."
    suggested_action: "Add one bullet naming the QA-cycle additions and the new Step 8 failure modes."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-step-4-create-pr.md:119"
    finding: "On a guard retry that reuses HOLD_DIR, a re-appeared held path is overwritten or nested one level deep, and Restore misplaces it."
    suggested_action: "Check for an existing held copy before the mv; halt or use a suffixed name."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/verify-push-state.sh:140"
    finding: "The scope gate scans a duplicated path list once per scope in a bash loop."
    suggested_action: "Deduplicate once, or use a literal pathspec per scope plus the HEAD tree."
truncated_count: 0
```

## Recommended Actions

1. None blocking. APPROVE: every finding is `severity: low`.
2. Before merge, or as a follow-up: PC-2 (a one-bullet CHANGELOG addition) and PC-1 (reword the criterion). Both are documentation-only.
3. Follow-up task: CR-1 (guard-retry collision on a re-appeared held path) and CR-2 (the scope-gate scan, which agrees with gate 6's advisory CR-1).
