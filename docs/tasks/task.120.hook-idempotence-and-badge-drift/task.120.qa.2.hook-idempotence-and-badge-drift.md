# QA Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering (cycle 2)

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Gate File**: [task.120.gate.2.hook-idempotence-and-badge-drift.yml](./task.120.gate.2.hook-idempotence-and-badge-drift.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review after qa-fix cycle 1 (`7a04374c`). Both cycle-1 findings are verified fixed. The cycle-2 **refute pass** over the full branch diff — reviewing to find the false claim, starting with the fixes — found two new MEDIUM defects in the mechanisms themselves and one LOW documentation over-claim. Neither MEDIUM is in the cycle-1 fixes; both are in the Phase 1/2 mechanisms and both are the "two correct fixes combine" shape the refute pass exists for: the atomic claim reopens a snapshot window the earlier snapshot-before-removal fix had closed, and the identity healer widens a latent whole-group removal into a path that deletes a consumer's unrelated hook. Fast gate green (3310/3311).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` exit 0 — `.claude/state/t120-qa2-testlog.txt`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#410, OPEN, head `7a04374c`)

### Testing Approach

- [x] Manual Testing (bug.1 verification steps; dry-run reproduction; shared-group fixture for CR-2; line-order check for CR-1)
- [x] Automated Testing (`npm run ci:fast`; generator 7/7; installer 7/7; hook 14/14)
- [x] Regression Testing (full hermetic suite; bundle freshness)
- [x] Security Review (no new boundary; cycle-1 probes stand)
- [x] Code Review (Step 3b — **refute pass**, full branch diff, one read-only Explore reviewer, 327 s)

### Review Methodology

Direct tools plus one Explore reviewer. **Re-review scope: unscoped — cycle 2 full-diff refute pass** (one prior gate; `SAFETY_REPROBE=false` — prior security axis `PASS measured`). Adaptive strategy: re-review → direct tools, with the mandatory cycle-2 exception (full refute pass).

Step 4b: not applicable this cycle — the cycle-1 diff touched no `SKILL.md` or `shared/resources/*.md` prose (the `develop-pipeline-hooks.md` result from cycle 1 stands: `no-executable-blocks`).

---

## Re-Review Context

| Cycle-1 finding | Status | Verification |
| --- | --- | --- |
| QA-1 (MEDIUM) README prose count not generated — bug.1 | **FIXED** | `README.md:7` reads "128 skills covering"; set to 999 → generator restores 128; unrelated numbers untouched; README identical to HEAD. Mutation (prose `subn` removed) reddens the new test → `covered`. bug.1 → Closed. |
| CR-1 (LOW) `--dry-run` self-contradiction | **FIXED** | Non-canonical-only fixture under `--dry-run` prints `removing X` then `adding canonical` for both events, no "already registered"; file untouched. Wizard mirror shows `would remove` → `would add`. Mutation (dry-run skip removed) reddens scenarios 4 and 4b → `covered`. |
| CR-2 (advisory) cross-skill identity | **STANDS** — re-raised as CR-3 (LOW) | Still true; the doc/CHANGELOG claim "one entry per event" is what is false. |
| CR-3 (advisory) mv→snapshot window | **STRENGTHENED** — now CR-1 (MEDIUM) | Line order verified (claim `:99`, snapshot `:119`, sweep `:108`); resume detector reads only the lock and `last-halt.json`; pause.md item 1 still states the old absolute guarantee. |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-on-precompact.sh:99` — a kill between the claiming `mv` and `write_pause_snapshot` leaves neither lock nor snapshot; state survives only as `.pausing.<pid>`, unread by the resume detector and swept by the next winner; pause.md still promises the opposite → promote an orphaned claim to the snapshot in the sweep, reword the guarantee, add a test. **bug.2**
- **[medium]** `shared/resources/develop-pipeline-install-hooks.sh:246` (`unpatch_hook_exact`) — removes the whole matcher group when any hook inside matches; `heal_hook` now sends every non-canonical spelling through it, so a shared group loses the consumer's unrelated hook. Reproduced (`echo consumer-hook-keep-me` deleted). Wizard mirror same → element-level removal, shared-group fixture. **bug.3**
- **[low]** `shared/resources/develop-pipeline-hooks.md:126` + `CHANGELOG.md` — "converges on one entry per event" is false across the three `develop-*` skill spellings of the byte-identical scripts → extend `hook_identity` with a fixture, or qualify the claim.
- Advisory (cleanup): `generate_catalog.py:191` — `n_prose` is a match count, so a stale badge beside an already-current prose count reports "badge + prose count" → compare texts before labelling.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Atomic pause claim and a marked PR comment | CONCERNS | Verified | Mechanism works and is proven; **CR-1** window + stale doc guarantee. |
| Phase 2: Installer dedupes by identity and heals | CONCERNS | Verified | CR-1 (cycle 1) fixed; **CR-2** whole-group removal; CR-3 doc over-claim. |
| Phase 3: The badge is generated | PASS | Verified | QA-1 fixed; prose count generated; 7/7; CR-4 message-label nit advisory. |

**Overall Phase Completion**: 3/3 implemented; 2 with open findings

---

## Success Criteria Verification

Unchanged from cycle 1 except: Functional criterion 2 ("one entry per event … no-op on the second run") now carries the CR-2 caveat (a shared group loses its sibling) and the CR-3 caveat (per skill spelling). All others PASS as recorded in `task.120.qa.1`.

---

## Breaking Changes Validation

None declared, none found. **Overall: PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Claim-to-snapshot kill window** — Reliability — [bug.2](./task.120.bug.2.claim-to-snapshot-kill-window.md) — see New Findings. Priority P2.

**Issue: Heal removes the whole matcher group** — Functional — [bug.3](./task.120.bug.3.heal-removes-whole-matcher-group.md) — see New Findings. Priority P2.

### LOW Severity Issues (1)

**CR-3 — "one entry per event" over-claim** across skill spellings (`develop-pipeline-hooks.md`, `CHANGELOG.md`). Promoted to `top_issues[]` (bug, high confidence, `code_review_blocking=true`).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
CR-1 (documented guarantee no longer holds inside the claim window) and CR-2 (silent deletion of a consumer hook on re-run).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (cycle 1; the cycle-1 fixes introduce no boundary — a dry-run reporting branch and an anchored regex). CR-2 is over-reach in the *removal*, not a wrong *decision* by the identity check.

### Maintainability — PASS
Fixes are small and each carries a red-on-revert test; CR-3 is a doc correction.

---

## Code Review

Step 3b — **REFUTE PASS** over the full `origin/develop...HEAD` diff (16 files, 1455 lines; bundled copies excluded). Directive: find the false claim, starting with the cycle-1 fixes; probe teardown / in-flight / error / reconnect; review the combination.

**Correctness bugs (3):**
- [medium/medium → QA-verified, promoted] `shared/resources/develop-pipeline-on-precompact.sh:98` — claim-to-snapshot window (bug.2). **CR-1, in gate.**
- [low/medium → QA-reproduced, raised to medium] `shared/resources/develop-pipeline-install-hooks.sh:246` — whole-group removal (bug.3). **CR-2, in gate.**
- [low/high] `shared/resources/develop-pipeline-hooks.md:126` — "one entry per event" over-claim. **CR-3, in gate.**

**Cleanups (1):**
- `skills/create-skill/scripts/generate_catalog.py:191` — `n_prose` match count mislabels the message. Advisory (`recommendations.future`).

**Mutation proofs (QA re-execution of the cycle-1 fixes):**
- mutation-proven: `PROSE_COUNT.subn` removed → `the prose skill count beside the badge is generated too` → **covered**
- mutation-proven: dry-run skip in `patch_hook` removed → `dry-run: 'already registered' never names…` + `dry-run (non-canonical only)…` → **covered**

**Platform variance**: not applicable (no environment-derived value reaches a validating consumer).

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Full hermetic suite | `npm run ci:fast` | PASS — 3311 tests, 3310 pass, 1 skipped, 0 fail |
| Hook suite | 14 scenarios | PASS |
| Installer suite | 7 scenarios | PASS |
| Generator suite | 7 tests | PASS |
| Bundle freshness | `bundle_skill.py --check` | PASS (0 problems) |
| Catalog / README no-diff | generator + `git diff --quiet` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast                                                          # exit 0
sed -n '5p;7p' README.md; sed -i '' 's/128 skills covering/999 …/' README.md; python3 skills/create-skill/scripts/generate_catalog.py   # bug.1 verification
bash shared/resources/develop-pipeline-install-hooks.sh --dry-run        # CR-1 (cycle 1) verification, non-canonical-only fixture
bash shared/resources/develop-pipeline-install-hooks.sh                  # CR-2 reproduction, shared-group fixture
node --test tests/generate-catalog-badge.test.js; bash shared/resources/develop-pipeline-install-hooks.test.sh   # 7/7, 7/7 + 2 mutations
```

---

## Recommendations

### Immediate Actions (Blocking)
1. **CR-1 / bug.2** — promote an orphaned `.pausing.*` claim to the snapshot in the sweep; reword pause.md item 1; add the test.
2. **CR-2 / bug.3** — element-level removal in `unpatch_hook_exact` / `_unpatch_hook_exact` (and `unpatch_hook`); shared-group fixture.
3. **CR-3** — make the "one entry per event" claim true across the three `develop-*` spellings (extend `hook_identity` with a fixture) or qualify it in the doc and CHANGELOG.

### Short-term Actions (Non-Blocking)
1. CR-4 — label the generator's message by what actually changed.

---

## Bug Resolution Summary

| Bug | Cycle filed | Status | Verification |
| --- | --- | --- | --- |
| bug.1 README prose count | 1 | **Closed** | Verified fixed this cycle (see Re-Review Context) |
| bug.2 claim-to-snapshot window | 2 | New | — |
| bug.3 whole-group removal | 2 | New | — |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle-1 findings fixed and proven; two new MEDIUM mechanism defects from the refute pass (reliability CONCERNS) and one LOW doc over-claim. Gate rules 2 and 4.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2 fixed and CR-3 resolved; re-review.

---

**QA Report**: co-located at `task.120.qa.2.hook-idempotence-and-badge-drift.md`
**Gate File**: co-located at `task.120.gate.2.hook-idempotence-and-badge-drift.yml`
**Next Steps**: `/qa-fix` on the three open `top_issues[]`; re-review (cycle 3, scoped to files changed since this gate).
