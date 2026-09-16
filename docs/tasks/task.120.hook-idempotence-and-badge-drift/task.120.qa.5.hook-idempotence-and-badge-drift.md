# QA Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering (cycle 5)

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Gate File**: [task.120.gate.5.hook-idempotence-and-badge-drift.yml](./task.120.gate.5.hook-idempotence-and-badge-drift.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: PASS

---

## Executive Summary

Scoped re-review after qa-fix cycle 4 (`8ba1d076`). All five cycle-4 findings are verified fixed; bug.6 is closed. The scoped review found nothing attributable to the change set: one low, medium-confidence gap that turns out to be **pre-existing** (two byte-identical canonical entries are not collapsed — `origin/develop`'s installer behaves identically, and the installer never creates that shape) and three cleanups. Over five cycles, six bugs were filed and all six closed; no cycle produced a HIGH finding. Fast gate green (3311/3312), shellcheck clean on all source shell files, bundle fresh.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` exit 0 — `.claude/state/t120-qa5-testlog.txt`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#410, OPEN, head `8ba1d076`)

### Testing Approach

- [x] Manual Testing (bug.6 reproduction; CR-2/CR-3 live-filter checks; CR-1 reproduced on this branch **and** on `origin/develop`; `PR_REPO` parse)
- [x] Automated Testing (`npm run ci:fast`; installer 11/11, hook 15/15, generator 8/8)
- [x] Regression Testing (full hermetic suite; bundle freshness; shellcheck on 58 source shell files)
- [x] Security Review (2 identity probes; 27 cumulative)
- [x] Code Review (Step 3b — scoped, one read-only Explore reviewer, 286 s)

### Review Methodology

Direct tools plus one Explore reviewer. **Re-review scope: since 2026-09-16T12:40:00Z (default)** — the 5 files touched by `8ba1d076`. `SAFETY_REPROBE=false`.

Step 4b: **fired** — `pipeline-resume-detector-prompt.md` changed (`|| true`). Result: only the pre-existing `cat` block at line 69 fails in the empty temp copy (identical on `origin/develop`); the `ls -t … || true` block runs clean. QA-1 verified fixed.

---

## Re-Review Context

| Cycle-4 finding | Status | Verification |
| --- | --- | --- |
| CR-1 (MEDIUM) verbatim fallback collides with interpreter-less command — bug.6 | **FIXED** | `hook_identity "scripts/on-stop.sh"` → verbatim; canonical → `develop-pipeline-hook:scripts/on-stop.sh`; reproduction fixture keeps the consumer hook; prefix-removed mutation red → `covered`. bug.6 → Closed. |
| CR-2 (LOW) pre-existing empty group pruned | **FIXED** | Live filter against the cycle-4 fixture → `{"matcher":"Edit","hooks":[]}` survives; prune-on-empty-after mutation red → `covered`. |
| CR-3 (LOW) null `command` aborts regex healer | **FIXED** | Prompt-type element survives, obsolete hook removed beside it (Scenario 10). |
| CR-4 (LOW) wizard `return 1` under `set -e` | **FIXED** | Forced jq failure → `record_warning`, file unchanged, wizard continues (verified in cycle 4's fix pass; code unchanged since). |
| QA-1 (LOW) `ls -t` exit status | **FIXED** | 4b re-run reports only the pre-existing line 69. |
| CR-5 (advisory) `PR_REPO` from URL | **FIXED** | `sed` parse of the PR URL → `Gamaroff/agent-skills`. |

## New Findings This Cycle

None attributable to this change set. Searched: the 5 files of `8ba1d076` (1041 diff lines), the reviewer's regex/jq probes, and QA's own reproductions.

- Pre-existing (advisory, `recommendations.future`): two byte-identical canonical entries under one event are not collapsed — reproduced on this branch **and** on `origin/develop`'s installer (both leave 2). The installer never creates this shape; a hand-edit does.
- Cleanups (advisory): Scenario 14's gh stub cannot distinguish the URL-parsed `PR_REPO` from the fallback; `install_hooks` records `ok` even after a helper warning; the detector's output-field table should name the orphaned claim as a `current_step_in_lock` source.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Atomic pause claim and a marked PR comment | PASS | Verified | Claim, sweep, marker, PATCH-in-place, `PR_REPO` from URL; kill-in-window state preserved; detector reads the claim with document-then-age precedence. |
| Phase 2: Installer dedupes by identity and heals | PASS | Verified | Anchored, namespaced identity across the three develop-* skills; element-level, filter-emptied-only removal; null-safe shapes; dry-run honest; wizard mirrors all of it and survives a helper failure. |
| Phase 3: The badge is generated | PASS | Verified | Badge and prose count generated; label by change; CI diffs and triggers on README. |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional**: all four PASS — concurrency (one of everything), both-spellings → one entry per event (now across roots, quoting, bare-relative and the three skills; consumer hooks of every probed shape untouched), generator + CI wiring, badge 128.
**Performance**: PASS (unchanged).
**Code Quality**: every mechanism and every fix has a committed red-on-revert test (cumulative 20 mutation proofs `covered`); shellcheck / bundle / prettier clean; new suites wired.
**Migration**: CHANGELOG cites `(task 120)`; pause.md describes the claim and the window honestly; the hand fix to the local settings file is reproduced by the healer.

---

## Breaking Changes Validation

None declared, none found. **Overall: PASS**

---

## Issues Found

### HIGH Severity Issues (0)
None.
### MEDIUM Severity Issues (0)
None.
### LOW Severity Issues (0 attributable)
See advisories above.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Every reliability CONCERN raised in cycles 2–4 is verified closed; the one residual (identical canonical duplicates) predates the change set.
### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 27 cumulative (2 this cycle).
### Maintainability — PASS
Cleanups recorded, none blocking.

---

## Code Review

Step 3b — scoped (5 files). `code_review_blocking=true`.

**Correctness bugs (1):**
- [low/medium] `develop-pipeline-install-hooks.sh:304` — identical canonical spelling ×2 not collapsed. **Pre-existing** (reproduced on `origin/develop`); not attributable; advisory.

**Cleanups (3):** Scenario 14 stub distinguishability; `install_hooks` step status after a warning; detector output-field table row. Advisory.

**Mutation proofs (QA re-execution of cycle-4 fixes):**
- mutation-proven: namespace prefix removed → `the interpreter-less scripts/on-stop.sh survives (bug.6)` → **covered**
- mutation-proven: prune on empty-after → `a consumer's pre-existing empty hooks[] group survives` → **covered**

**Platform variance**: not applicable.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Full hermetic suite | `TEST_CONCURRENCY=2 npm run ci:fast` | PASS — 3312 / 3311 / 1 skipped |
| Installer / hook / generator | 11 / 15 / 8 | PASS |
| Bundle freshness | `bundle_skill.py --check` | PASS |
| ShellCheck | 58 source shell files | PASS |

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Collapse identical canonical duplicates (pre-existing).
2. Scenario 14 stub distinguishability; `install_hooks` warn status; detector table row.

---

## Bug Resolution Summary

| Bug | Filed | Status |
| --- | --- | --- |
| bug.1 README prose count | c1 | Closed (c2) |
| bug.2 claim-to-snapshot window | c2 | Closed (c3) |
| bug.3 whole-group removal | c2 | Closed (c3) |
| bug.4 identity collapses consumer hook | c3 | Closed (c4) |
| bug.5 stale snapshot shadows claim | c3 | Closed (c4) |
| bug.6 fallback collision | c4 | **Closed** (c5) |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open finding attributable to the change set; NFRs all PASS; six bugs filed and closed across five cycles, never a HIGH.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.120.qa.5.hook-idempotence-and-badge-drift.md`
**Gate File**: co-located at `task.120.gate.5.hook-idempotence-and-badge-drift.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
