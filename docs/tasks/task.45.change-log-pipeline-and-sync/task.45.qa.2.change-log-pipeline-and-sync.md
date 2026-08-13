# QA Report: Task 45 - Pipeline, QA, finalise, and tracker sync write the Change Log (Cycle 2)

**Task**: [Link to task document](./task.45.change-log-pipeline-and-sync.md)
**Gate File**: [task.45.gate.2.change-log-pipeline-and-sync.yml](./task.45.gate.2.change-log-pipeline-and-sync.yml)
**Previous Cycle**: [task.45.qa.1.change-log-pipeline-and-sync.md](./task.45.qa.1.change-log-pipeline-and-sync.md) — FAIL, 70/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-13
**Gate Status**: PASS

---

## Re-Review Context

Scoped to what changed since gate 1. Each cycle-1 issue re-tested by direct reproduction rather than by reading the diff.

| Issue | Severity | Status | Verification |
| --- | --- | --- | --- |
| TASK-45-BUG-1 — orphaned legacy block in six sync skills | HIGH | **FIXED** | All six verify `legacy=0 dup=1 fence-parity=0` |
| TASK-45-BUG-2 — "zero file writes" overstated | MEDIUM | **FIXED** | No occurrence remains anywhere; reworded to the verified guarantee |
| TASK-45-BUG-3 — engine dropped unparsed rows | HIGH | **FIXED** | Reproduction now preserves both historical rows |
| Epic fast path — stale `lastSyncedAt` after transition | — | **FIXED** | Timestamp re-read when `transitioned`, with a warning fallback |
| Epic fast path — silent transition failure | — | **FIXED** | Now calls `summariseStatusOutcome` and returns `statusOutcome` |

---

## Executive Summary

All three bugs are closed in one iteration. The most consequential is BUG-3, which the Step 3b code review surfaced after gate 1 had already been written.

`upsertChangeLog` regenerated a Change Log from rows passing `isEntryRow` — which requires a date in the first cell — so any log ordered `| Version | Date | Change | Author |` lost **every historical row**, silently. This repo's own roadmap template shipped with exactly that ordering, so any consumer scaffolding from it would have had its history erased on first write.

That defect is pre-existing in task.42's engine and is not a regression from this PR. Fixing it here was the right call on two grounds: task.45 routes five more writers into the same function, and *"`upsertChangeLog` never drops a row it parsed"* is the mitigation this task claims for its own Critical risk #1. The claim was true and hollow — the rows it drops are the ones it fails to parse. The mitigation is now real.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED for staging; CONDITIONAL for production pending the live-Jira check.

---

## Verification Detail

### BUG-1 — orphaned legacy block (HIGH) → FIXED

```
skills/sync-jira-task/SKILL.md:   legacy=0 dup=1 parity=0
skills/sync-github-task/SKILL.md: legacy=0 dup=1 parity=0
skills/sync-jira-story/SKILL.md:  legacy=0 dup=1 parity=0
skills/sync-github-story/SKILL.md:legacy=0 dup=1 parity=0
skills/sync-jira-epic/SKILL.md:   legacy=0 dup=1 parity=0
skills/sync-github-epic/SKILL.md: legacy=0 dup=1 parity=0
```

The fix used explicit line ranges with both boundary lines asserted before cutting, rather than a second regex — appropriate, given the original defect was a fence-blind regex. Fence counts sit two below the `develop` baseline in each file, which is correct: the removed section wrapped its sample in a ` ```markdown ` pair and the replacement uses a table.

Both previously-false success criteria are now true.

### BUG-2 — overstated guarantee (MEDIUM) → FIXED

No occurrence of "zero file writes" / "zero writes" remains in any script, shared resource, or the task document. Each site now states the guarantee that is actually delivered and tested: no row, no marker migration, byte-identical content, empty `git diff`. Behaviour was correctly left alone — changing the write path would have touched `jira_last_synced_at` refresh semantics for no gain.

### BUG-3 — row loss (HIGH) → FIXED

Reproduction from the bug report:

```
rows preserved: true
headings: 1
```

Both historical rows survive and the new row is appended, under a single heading.

Checked for collateral damage, since this touches shared engine code on the write path of every writer:

- **Canonical documents unaffected** — a normal `<!-- change-log-start -->` block appends without duplication; row count correct.
- **No-op path unaffected** — still byte-identical, legacy markers intact.
- **Dual-legacy-pair collapse unaffected** — still one heading, all rows preserved in date order.
- **Full suite green** — 1185/1185, including 2 new regression tests pinning both preservation and ordering.

The roadmap template's column order is corrected, removing the only live exposure in this repo.

### Epic fast-path fixes

Both were consequences of cycle 1's change making that path transition, and both were caught by the code review rather than by tests:

- **Stale timestamp** — the path persisted `current.updated`, read *before* the transition that bumps Jira's own `updated`. The next sync's concurrent-edit guard would have thrown and demanded `--force`. Now re-reads via `fetchUpdatedTimestampStrict` when a transition actually occurred, with a warning on failure rather than a hard fail.
- **Silent transition failure** — the path returned a bare `exitCode: 0`, so a failed or skipped transition produced no warning, ignored `--fail-on-status-skip`, and returned a shape missing `statusOutcome`. Now reports exactly as the main path does.

---

## Success Criteria — Re-Verified

| Criterion | Cycle 1 | Cycle 2 |
| --- | --- | --- |
| All six sync skills use `<!-- change-log-start -->` only | **FAIL** | **PASS** |
| No sync SKILL.md embeds a column list | **FAIL** | **PASS** |
| No-op sync writes no row, file byte-identical | CONCERNS | **PASS** (reworded to the tested guarantee) |
| Legacy pair migrates in place, once | PASS | PASS |
| Body-only sync writes no row; transition writes one | PASS | PASS |
| `develop-bug` still uses Status History | PASS | PASS |
| `npm test` green | PASS (1183) | **PASS (1185)** |
| Eval suites green | PASS | PASS |
| Wrappers deleted, not orphaned | PASS | PASS |
| Live Jira verification | DEFERRED | **DEFERRED** — unchanged, still correctly disclosed |

---

## NFR Assessment

- **Security — PASS.** One added authenticated timestamp re-read, same helper and credentials as the main path.
- **Performance — PASS.** Unchanged. The preservation fix adds a linear scan of an already-loaded block, only on the write path.
- **Reliability — PASS.** Stronger than cycle 1: the Critical row-loss risk is genuinely closed rather than asserted, and two epic fast-path defects are fixed.
- **Maintainability — PASS.** Cycle-1 CONCERNS resolved; six skills consistent, stale comments refreshed, out-of-scope defects explicitly recorded rather than silently carried.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full unit suite | PASS — 1185/1185 |
| `eval:develop-task` / `eval:develop-story` | PASS — 8/8 each |
| Bundle idempotency | PASS — second run clean |
| Canonical Change Log append | PASS — no duplication |
| No-op byte-identity | PASS |
| Dual-legacy-pair collapse | PASS — one heading, all rows, date-ordered |

---

## Carried Forward (not blocking)

Two pre-existing engine defects the code review raised, deliberately **not** fixed here. Neither is introduced or amplified by this task, and fixing them mid-QA-cycle would have expanded the PR into engine surgery:

1. **Content loss on the hand-written-heading path** (MEDIUM) — a `## Change Log` without markers has its whole span to the next heading replaced, destroying prose and nested `###` subsections.
2. **`collapseOtherLegacyBlocks` skips the chosen block's own pair** (LOW) — two blocks of the same legacy pair survive one write; self-healing.

Both are recorded in `task.45.bug.3` and in the gate's `future` recommendations. They deserve their own change with tests.

Also carried: the deferred live-Jira verification, and the absence of `run()`-level tests for the two behaviours this task changed but tested only at the unit level.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All three cycle-1 issues closed and independently re-verified by reproduction. Both success criteria that were false are now true. The engine's row-preservation fix makes the task's own Critical-risk mitigation real rather than nominal, and was validated against the canonical, no-op and dual-pair paths for collateral damage.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED (staging) / CONDITIONAL (production)
**Conditions**: run the live-Jira three-step check before relying on the narrowing in a Jira-tracked repo.

---

**Next Steps**: proceed to `/finalise`.
