# QA Report: Task 119 - Four authoring rules the corpus already obeys by accident (cycle 3)

**Task**: [task.119.create-skill-authoring-guards.md](./task.119.create-skill-authoring-guards.md)
**Gate File**: [task.119.gate.3.create-skill-authoring-guards.yml](./task.119.gate.3.create-skill-authoring-guards.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: PASS

---

## Executive Summary

Cycle-3 re-review of PR #420 after qa-fix cycle 2 (commit `3159b44b`), narrowed to the files changed since gate 2. All three cycle-2 findings are FIXED and independently verified — in particular §5 now goes red on the original CommonMark-style reader, naming the lines it fails to scan. The narrowed diff review returned no high-confidence bug: one latent regex-divergence edge with no live instance and two documentation staleness items, all advisory. Gate PASS.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Re-review scope**: since 2026-09-17T14:20:46Z (default) — `tests/fenced-bash-positional-params.test.js`, deletion of `skills/develop-next/references/document-status-lifecycle.md`, task document. `SAFETY_REPROBE=false` (prior gate security `OK reasoned`).

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-4 §5 tautological (counted pushes, not scanned lines) | **FIXED** | §5 now asserts per-opener line-level coverage; QA reinstated the original CommonMark reader as a mutant → §5 red naming `create-epics-from-shards/SKILL.md:357, :364`. A pop-rule-removed mutant over-scans and is caught by §2/§4 — §5 is the under-scan detector, which is the loss CR-1 named |
| CR-5 fence-shaped line inside a runnable heredoc | **FIXED** | ````bash + heredoc fixture in §4; QA probe: `$1` inside the heredoc and `$2` in the following block both found; restoring the push turns §4 red |
| CR-6 orphaned `develop-next/references/document-status-lifecycle.md` | **FIXED** | removed; nothing in develop-next reads it; `bundle_skill.py --check skills/develop-next` → 0 problems; bundled-links test green |

---

## New Findings This Cycle

- **[low/medium]** `tests/fenced-bash-positional-params.test.js` §5 — `OPENER` ends in `\b`, so an info string such as ```` ```shell-session ```` or ```` ```bash-x ```` would count as a runnable opener while `runnableLines()` (which captures the whole `[\w+.-]*` token) treats it as non-runnable — a spurious "fence-state loss" miss rather than a missed token. No such info string exists in the live tree (reviewer and QA both checked). Latent; advisory. → derive both readers from one tokeniser.
- **[cleanup]** task document — Files Summary still says "§5 asserts opener parity" and Progress Tracking still records 478 blocks; the scan reports 485 and §5 is line-level. Advisory.
- **[cleanup]** guard header — says "100 `SKILL.md` files"; `skillFiles()` returns 128. Advisory.

None enters `top_issues[]`: the one bug is `confidence: medium` (only `bug` + `high` gates under `code_review_blocking`), and the other two are cleanups. All three are in the gate's `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0–3, Close-out | PASS | Verified | unchanged since cycle 2 apart from the Phase 1 guard, whose cycle-2 fixes are verified above |

**Overall Phase Completion**: 5/5.

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | Guard runs under CI, has a floor, reasoned allowlist | PASS | 485 blocks; floor 50; allowlist empty with reason check; §5 line-level and mutation-proven |
| 2 | create-skill three rules; qa-task 4b limit | PASS | |
| 3 | bundler warning + comment-origin guard | PASS | |
| 4 | create-task §1.2 | PASS | |
| 5 | observations closed naming the PR | PASS | |

---

## Breaking Changes Validation

None. **PASS**.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3 (advisory — see *New Findings This Cycle*).

---

## NFR Assessment

### Performance — PASS
No runtime path changed this cycle.

### Reliability — PASS
`ci:fast` 3410 pass / 0 fail / 1 skipped. Both cycle-2 mutations re-run by QA. `bundle --check` clean.

### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
- `boundary: false`, unchanged across three cycles.

### Maintainability — PASS
Advisory residue recorded in the gate's `recommendations.future`.

---

## Code Review

Dispatched read-only reviewer, narrowed scope (cycle 3); `dispatched 18:28 → returned 18:31` (budget 10 min). `CR_BLOCKING=true`; nothing qualified.

**Correctness bugs (1, advisory):**
- [low/medium] `tests/fenced-bash-positional-params.test.js:304` — §5 opener regex `\b` vs `runnableLines()` token capture can disagree on `bash-x`-style info strings → one tokeniser.

**Cleanups (2):**
- task document Files Summary / Progress Tracking stale ("opener parity", 478).
- guard header file count (100 → 128).

**Mutation proofs (Step 3c, QA-run):**
- mutation-proven: original CommonMark reader reinstated → `§5` red naming `create-epics-from-shards/SKILL.md:357` → `covered`
- mutation-proven: nested push restored inside a runnable block → `§4` red → `covered`

---

## Step 4b: Documented Commands

Not applicable this cycle — no runnable prose changed since gate 2 (a test file, a deletion, and the task document). Cycle 1's results stand.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3410/0/1 |
| `bundle_skill.py --check skills/develop-next` | PASS — 0 problems |
| Guard self-checks §1–§5 | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
node --test tests/fenced-bash-positional-params.test.js   # + original-reader and nested-push mutations
python3 skills/create-skill/scripts/bundle_skill.py --check skills/develop-next
node -e '…runnableLines over the heredoc shape…'
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Derive §5's opener detection from the same tokeniser as `runnableLines()`.
2. Reconcile the task document's §5 wording and block count, and the guard header's file count, with what the scan reports.
3. File an observation for the 12 skills carrying unreached bundled copies.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: all findings from cycles 1 and 2 verified fixed; no high-confidence bug remains; NFRs PASS; residue is advisory and recorded.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.119.qa.3.create-skill-authoring-guards.md`
**Gate File**: co-located at `task.119.gate.3.create-skill-authoring-guards.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
