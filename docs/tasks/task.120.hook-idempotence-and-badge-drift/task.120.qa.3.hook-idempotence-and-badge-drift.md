# QA Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering (cycle 3)

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Gate File**: [task.120.gate.3.hook-idempotence-and-badge-drift.yml](./task.120.gate.3.hook-idempotence-and-badge-drift.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Scoped re-review after qa-fix cycle 2 (`65bd420d`). All three cycle-2 findings are verified fixed and bug.2 / bug.3 are closed. The scoped review of the fix commit's files found that the cycle-2 **identity widening over-accepts**: a consumer's own project-root `scripts/on-stop.sh` now shares our identity and is deleted (regression, MEDIUM); the new orphaned-claim resume fallback sits behind a `last-halt.json` that nothing consumes, so a stale snapshot — this repo has one — shadows it (MEDIUM); and the element-level jq rewrite aborts on a matcher group without a `hooks` key (LOW). No HIGH finding in any cycle; fast gate green (3311/3312).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` exit 0 — `.claude/state/t120-qa3-testlog.txt`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#410, OPEN, head `65bd420d`)

### Testing Approach

- [x] Manual Testing (bug.3 reproduction in both installers; identity probes for the three skills and a near-miss; CR-1 and CR-3 reproductions; stale-snapshot check for CR-2)
- [x] Automated Testing (`npm run ci:fast` at `TEST_CONCURRENCY=2`; hook 15/15, installer 9/9, generator 8/8)
- [x] Regression Testing (full hermetic suite; bundle freshness; 9 bundled detector copies)
- [x] Security Review (3 new identity probes; cycle-1's 12 stand)
- [x] Code Review (Step 3b — scoped, one read-only Explore reviewer, 366 s)

### Review Methodology

Direct tools plus one Explore reviewer. **Re-review scope: since 2026-09-16T10:40:00Z (default)** — the 11 files touched by `65bd420d` (bundled copies and task docs excluded). `SAFETY_REPROBE=false` (prior security axis `PASS measured`). Not a refute pass (cycle 3).

Step 4b: **fired** — `pipeline-resume-detector-prompt.md` (5 bash fences) and `develop-pipeline-hooks.md` (2) changed. Detector prompt: 6 blocks, 3 runnable, 3 placeholder (template slots), 0 mutating; the block this diff **added** (line 92, `ls -t … | head -1`) ran clean under bash and zsh; the 4 execution failures are the two pre-existing `cat` blocks at lines 69/74 failing in an empty temp copy — identical on `origin/develop` (verified), and the prose itself is the "if absent, fall back" branch. Not attributable to this diff; recorded as information. hooks.md: `no-executable-blocks` as in cycle 1.

---

## Re-Review Context

| Cycle-2 finding | Status | Verification |
| --- | --- | --- |
| CR-1 (MEDIUM) claim-to-snapshot window — bug.2 | **FIXED** | Detector prompt Step 1 reads `.pausing.*` as the third fallback, `source: orphaned_claim`; bundled into 9 skills; pause.md names the window. Scenario 15 holds; `cp`-for-`mv` mutation red → `covered`. **But see CR-2 below — the fallback is reachable only when no snapshot persists.** bug.2 → Closed (the fix does what it says; the reachability gap is a new finding). |
| CR-2 (MEDIUM) whole-group removal — bug.3 | **FIXED** | Reproduction from the report: `echo consumer-hook-keep-me` survives in both the installer and the wizard mirror; both group-level mutations red → `covered` ×2. bug.3 → Closed. |
| CR-3 (LOW) "one entry per event" over-claim | **FIXED — with a regression** | `develop-task/…` and `develop-bug/…` collapse to `scripts/<hook>.sh`; `develop-storyx/…` does not; scenario 8 holds; strip-removed mutation red → `covered`. hooks.md + CHANGELOG reworded. **The widening also collapses a consumer's own `scripts/<hook>.sh` — new CR-1.** |
| CR-4 (advisory) message label | **FIXED** | Match-count mutation red → `covered`. |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-install-hooks.sh:145` — `hook_identity` strips each prefix independently, so `bash scripts/on-stop.sh` (a consumer's own project-root hook) reduces to `scripts/on-stop.sh` = ours, and `heal_hook` deletes it. Reproduced. Regression from cycle 2. Wizard mirror same → anchored match that requires the `develop-*` segment; consumer fixtures. **bug.4**
- **[medium]** `shared/resources/pipeline-resume-detector-prompt.md:91` — the orphaned-claim fallback is behind `last-halt.json`, which nothing consumes on resume; this repo carries task.110's snapshot now, so the cycle-2 fallback is unreachable and a wrong-task resume would be recommended → choose by document match + mtime. **bug.5**
- **[low]** `shared/resources/develop-pipeline-install-hooks.sh:262` — `map(.hooks |= map(…))` errors on a group with no `hooks` key; reproduced ("Cannot iterate over null"); installer aborts under `set -e` → `.hooks |= ((. // []) | map(…))` in all four mutations; fixture.
- Advisory (cleanup): `scripts/setup-consumer.sh:1641` — `_patch_hook` lacks the `-f` guard `_heal_hook` has; dry-run with no settings file prints a jq error.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Atomic pause claim and a marked PR comment | CONCERNS | Verified | Hook mechanism unchanged and proven; the resume-side fallback (bug.2's fix) is shadowed by a stale snapshot — **CR-2**. |
| Phase 2: Installer dedupes by identity and heals | CONCERNS | Verified | Element-level removal proven; **CR-1** over-accepting identity (regression); **CR-3** null `hooks`. |
| Phase 3: The badge is generated | PASS | Verified | 8/8; CR-4 (cycle 2) fixed. |

**Overall Phase Completion**: 3/3 implemented; 2 with open findings

---

## Success Criteria Verification

As cycle 2, except Functional criterion 2 now carries the CR-1 caveat (a consumer's `scripts/<hook>.sh` is not "unrelated" to the healer) and Migration criterion "pause.md describes the claim" carries CR-2 (the described fallback is not reachable while a snapshot persists).

---

## Breaking Changes Validation

None declared, none found. **Overall: PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Identity collapses a consumer's own `scripts/<hook>.sh`** — Functional — [bug.4](./task.120.bug.4.identity-collapses-consumer-scripts-hook.md) — P2.

**Issue: Stale `last-halt.json` shadows the orphaned claim** — Reliability — [bug.5](./task.120.bug.5.stale-snapshot-shadows-orphaned-claim.md) — P2.

### LOW Severity Issues (1)

**CR-3 — null `hooks` in a matcher group aborts the heal** (`develop-pipeline-install-hooks.sh:224/:262`, wizard `:1674/:1700`). Promoted to `top_issues[]`.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
CR-1 (regression deletes a consumer hook), CR-2 (fallback unreachable in the common case), CR-3 (installer abort).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 15 (12 from cycle 1 + 3 this cycle: `develop-task/…`, `develop-bug/…`, `develop-storyx/…`). CR-1 is an over-acceptance in the widened boundary — a consumer input wrongly classified as ours — found by the reviewer and reproduced; the consequence is a deleted hook, not a privilege bypass. It is gated as a functional MEDIUM.

### Maintainability — PASS
Small, tested fixes; the anchored-match form the CR-1 fix prescribes is less drift-prone than independent strips.

---

## Code Review

Step 3b — scoped to the 11 files of `65bd420d` (1551 diff lines). `code_review_blocking=true`.

**Correctness bugs (3):**
- [medium/high] `develop-pipeline-install-hooks.sh:145` — identity over-accepts project-root `scripts/<hook>.sh` (bug.4). **CR-1, in gate.**
- [medium/medium → QA-verified] `pipeline-resume-detector-prompt.md:91` — stale snapshot shadows the orphaned claim (bug.5). **CR-2, in gate.**
- [low/medium → QA-reproduced] `develop-pipeline-install-hooks.sh:262` — null `hooks` aborts the heal. **CR-3, in gate.**

**Cleanups (1):**
- `scripts/setup-consumer.sh:1641` — `_patch_hook` missing `-f` guard. Advisory.

**Mutation proofs (QA re-execution of the cycle-2 fixes):**
- mutation-proven: exact removal reverted to group-level → `shared group: the consumer's hook … survives` → **covered**
- mutation-proven: `develop-*/` strip removed → `cross-skill: … converge` → **covered**
- mutation-proven: claim by `cp` → `kill in window: the hook had claimed …` (+5) → **covered**
- mutation-proven: label by match count → `a stale badge beside an already-current prose count …` → **covered**

**Platform variance**: not applicable.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Full hermetic suite | `TEST_CONCURRENCY=2 npm run ci:fast` | PASS — 3312 tests, 3311 pass, 1 skipped |
| Hook / installer / generator suites | 15 / 9 / 8 | PASS |
| Bundle freshness | `bundle_skill.py --check` | PASS (0 problems) |
| Detector prompt bundled copies | 9 skills carry `orphaned_claim` | PASS |

---

## Test Artifacts

```bash
TEST_CONCURRENCY=2 npm run ci:fast                                       # exit 0
bash shared/resources/develop-pipeline-install-hooks.sh                  # bug.3 reproduction (installer + wizard fns) — consumer hook survives
bash shared/resources/develop-pipeline-install-hooks.sh                  # CR-1 reproduction — `bash scripts/on-stop.sh` deleted
bash shared/resources/develop-pipeline-install-hooks.sh                  # CR-3 reproduction — jq "Cannot iterate over null"
node references/qa-execute-snippets.mjs --file shared/resources/pipeline-resume-detector-prompt.md --json   # 3 runnable, new block clean
# 4 mutations + 3 identity probes — see Code Review
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 / bug.4 — anchored identity requiring the `develop-*` segment; consumer project-root fixtures.
2. CR-2 / bug.5 — detector chooses by document match + mtime.
3. CR-3 — null-safe `hooks[]` rewrite ×4; hooks-less group fixture.

### Short-term Actions (Non-Blocking)
1. CR-4 — `-f` guard in the wizard's `_patch_hook`.
2. Orchestrator consumes `last-halt.json` on successful resume (separate change).

---

## Bug Resolution Summary

| Bug | Filed | Status |
| --- | --- | --- |
| bug.1 README prose count | c1 | Closed (c2) |
| bug.2 claim-to-snapshot window | c2 | **Closed** (c3 — fix present and proven; reachability is bug.5) |
| bug.3 whole-group removal | c2 | **Closed** (c3) |
| bug.4 identity collapses consumer hook | c3 | New |
| bug.5 stale snapshot shadows claim | c3 | New |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle-2 fixes verified; two new MEDIUM (one a regression from the cycle-2 widening) and one LOW. Gate rules 2 and 4. HIGH count across cycles: 0, 0, 0.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2, CR-3 fixed and re-reviewed.

---

**QA Report**: co-located at `task.120.qa.3.hook-idempotence-and-badge-drift.md`
**Gate File**: co-located at `task.120.gate.3.hook-idempotence-and-badge-drift.yml`
**Next Steps**: `/qa-fix` on the three open `top_issues[]`; re-review (cycle 4).
