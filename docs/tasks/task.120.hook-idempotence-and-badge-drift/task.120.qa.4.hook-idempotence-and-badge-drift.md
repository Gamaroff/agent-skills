# QA Report: Task 120 - The pause hook, the hook installer and the README badge each rely on a human remembering (cycle 4)

**Task**: [task.120.hook-idempotence-and-badge-drift.md](./task.120.hook-idempotence-and-badge-drift.md)
**Gate File**: [task.120.gate.4.hook-idempotence-and-badge-drift.yml](./task.120.gate.4.hook-idempotence-and-badge-drift.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Scoped re-review after qa-fix cycle 3 (`d067e600`). All three cycle-3 findings are verified fixed; bug.4 and bug.5 are closed. Ten further identity probes confirm the anchored match is conservative in the safe direction. The scoped review found one MEDIUM completeness gap in the bug.4 fix — the identity's verbatim fallback still collides with an interpreter-less `scripts/<hook>.sh` consumer command — and four LOW shape/robustness defects in the jq helpers, the wizard's error handling, and the exit status of the detector's new `ls` block. No HIGH in any cycle; fast gate green.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` exit 0 — `.claude/state/t120-qa4-testlog.txt`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#410, OPEN, head `d067e600`)

### Testing Approach

- [x] Manual Testing (bug.4 reproduction; CR-3 hooks-less group; bug.5 Step-1 walk against the real stale snapshot; 10 identity probes; CR-1/2/3 reproductions with jq)
- [x] Automated Testing (`npm run ci:fast`; installer 11/11, hook 15/15, generator 8/8)
- [x] Regression Testing (full hermetic suite; bundle freshness)
- [x] Security Review (10 new identity probes)
- [x] Code Review (Step 3b — scoped, one read-only Explore reviewer, 305 s)

### Review Methodology

Direct tools plus one Explore reviewer. **Re-review scope: since 2026-09-16T11:40:00Z (default)** — the 9 files touched by `d067e600`. `SAFETY_REPROBE=false`.

Step 4b: **fired** — `pipeline-resume-detector-prompt.md` changed. 5 blocks: 2 runnable, 3 placeholder, 0 mutating. **The block this change set added (line 80, `ls -t … 2>/dev/null`) exits 1 under both shells when no candidate exists** — attributable → **QA-1** (LOW by impact). Lines 69/74 are the pre-existing `cat` cases (identical on `origin/develop`). `develop-pipeline-hooks.md` unchanged this cycle.

---

## Re-Review Context

| Cycle-3 finding | Status | Verification |
| --- | --- | --- |
| CR-1 (MEDIUM) identity over-accepts consumer `scripts/<hook>.sh` — bug.4 | **FIXED** (with a residual, see CR-1 below) | `bash scripts/on-stop.sh` and `"${CLAUDE_PROJECT_DIR}/scripts/on-stop.sh"` survive; our spelling heals; segment-optional mutation red → `covered`. bug.4 → Closed. |
| CR-2 (MEDIUM) stale snapshot shadows orphaned claim — bug.5 | **FIXED** | Step 1 walked against this repo's task.110 snapshot + a synthetic task.120 claim: snapshot dropped as other-document, claim wins. Wording aligned in pause.md, hook, CHANGELOG. bug.5 → Closed. |
| CR-3 (LOW) null `hooks` aborts heal | **FIXED** | Reproduction: rc 0, group left as-is; both null-guard mutations red → `covered` ×2. |
| CR-4 (advisory) wizard dry-run `-f` guard | **FIXED** | Guard present around the jq read. |

## New Findings This Cycle

- **[medium]** `develop-pipeline-install-hooks.sh:145` — non-match fallback returns the command verbatim, so a consumer hook literally `scripts/on-stop.sh` (no interpreter) equals our identity and is deleted (reproduced). Wizard same. → namespace-prefix the match result; interpreter-less fixture. **bug.6**
- **[low]** `develop-pipeline-install-hooks.sh:228` — `select(.hooks == null or (.hooks|length) > 0)` prunes a consumer's *pre-existing* empty group when a sibling matches (reproduced → `{"hooks":{}}`) → prune only filter-emptied groups.
- **[low]** `develop-pipeline-install-hooks.sh:215` — `.command | test($pat)` errors on an element without `command` (`type: prompt`); present-check swallows to 0; obsolete hook silently kept (reproduced) → `(.command // "")`.
- **[low]** `scripts/setup-consumer.sh:1710` — `return 1` inside `_heal_hook`'s while body under `set -e` ends the wizard with no summary → catch at call sites.
- **[low]** `pipeline-resume-detector-prompt.md:80` — new `ls -t` block exits 1 in the empty case (Step 4b) → `|| true`.
- Advisory (cleanup): `develop-pipeline-on-precompact.sh:266` — PATCH arm resolves the repo via `gh repo view` instead of parsing `PR_URL`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Atomic pause claim and a marked PR comment | CONCERNS | Verified | Mechanism proven; QA-1 (detector snippet exit status) and CR-5 cleanup. |
| Phase 2: Installer dedupes by identity and heals | CONCERNS | Verified | CR-1 residual collision; CR-2/CR-3 jq shapes; CR-4 wizard error path. |
| Phase 3: The badge is generated | PASS | Verified | Unchanged since cycle 2. |

**Overall Phase Completion**: 3/3 implemented; 2 with open findings

---

## Success Criteria Verification

As cycle 3; Functional criterion 2 carries the CR-1/CR-2 caveats.

---

## Breaking Changes Validation

None declared, none found. **Overall: PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Identity fallback collides with an interpreter-less `scripts/<hook>.sh`** — Functional — [bug.6](./task.120.bug.6.identity-fallback-collides-with-interpreterless-command.md) — P2.

### LOW Severity Issues (4)

CR-2 empty-group prune; CR-3 null `command`; CR-4 wizard `set -e` abort; QA-1 `ls` exit status. All promoted to `top_issues[]` (verified; QA-1 from Step 4b).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
CR-1..CR-4 as above.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 25 cumulative (10 this cycle: trailing space, double space, `sh`, trailing flag, `&& rm -rf /`, unquoted `${CLAUDE_PROJECT_DIR}`, hyphenated name, subdirectory, absolute path, space in name). Every unrecognised spelling is left alone — the conservative direction; CR-1 is the one remaining collision, closed by a namespace prefix on the match result.

### Maintainability — PASS
One-expression fixes each with a fixture.

---

## Code Review

Step 3b — scoped (9 files, 1411 diff lines). `code_review_blocking=true`.

**Correctness bugs (4):**
- [medium/high] `develop-pipeline-install-hooks.sh:145` — verbatim fallback collision (bug.6). **CR-1, in gate.**
- [low/medium → QA-reproduced] `:228` — pre-existing empty group pruned. **CR-2, in gate.**
- [low/medium → QA-reproduced] `:215` — null `command` aborts regex healer. **CR-3, in gate.**
- [low/medium → QA-verified by reading] `setup-consumer.sh:1710` — `return 1` under `set -e`. **CR-4, in gate.**

**Cleanups (1):**
- `develop-pipeline-on-precompact.sh:266` — parse `PR_REPO` from `PR_URL`. Advisory.

**Step 4b finding (1):** `pipeline-resume-detector-prompt.md:80` — execution-failure (exit 1 in the empty case), rated LOW. **QA-1, in gate.**

**Mutation proofs (QA re-execution of cycle-3 fixes):**
- mutation-proven: develop-* segment made optional → `consumer scripts/: both project-root on-stop.sh hooks survive` → **covered**
- mutation-proven: null guard removed (exact removal) → `hooks-less group: installer completes` → **covered**

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Full hermetic suite | `TEST_CONCURRENCY=2 npm run ci:fast` | PASS — 3312 / 3311 / 1 skipped |
| Installer / hook / generator | 11 / 15 / 8 | PASS |
| Bundle freshness | `bundle_skill.py --check` | PASS |

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 / bug.6 — namespace-prefix the identity match; interpreter-less fixture (installer + wizard).
2. CR-2, CR-3 — filter-emptied-only prune; `(.command // "")`; fixtures (installer + wizard).
3. CR-4 — wizard call sites catch the helper failure and record it.
4. QA-1 — `|| true` on the detector's `ls -t` block.

### Short-term Actions (Non-Blocking)
1. CR-5 — parse `PR_REPO` from `PR_URL`.

---

## Bug Resolution Summary

| Bug | Filed | Status |
| --- | --- | --- |
| bug.1 | c1 | Closed (c2) |
| bug.2 | c2 | Closed (c3) |
| bug.3 | c2 | Closed (c3) |
| bug.4 | c3 | **Closed** (c4) |
| bug.5 | c3 | **Closed** (c4) |
| bug.6 | c4 | New |

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle-3 fixes verified; one MEDIUM residual in the identity fallback plus four LOW. Gate rules 2 and 4. HIGH across cycles: 0, 0, 0, 0.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1..CR-4 and QA-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.120.qa.4.hook-idempotence-and-badge-drift.md`
**Gate File**: co-located at `task.120.gate.4.hook-idempotence-and-badge-drift.yml`
**Next Steps**: `/qa-fix` on the five open `top_issues[]`; re-review (cycle 5 — the last within budget).
