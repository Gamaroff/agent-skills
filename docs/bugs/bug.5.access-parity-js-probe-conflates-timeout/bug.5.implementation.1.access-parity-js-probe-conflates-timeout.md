---
type: implementation-report
status: in-progress
bug: 'bug.5.access-parity-js-probe-conflates-timeout'
mode: 'general'
started: '2026-09-01T16:23:01Z'
---

# Implementation Report — bug.5.access-parity-js-probe-conflates-timeout

**Started:** 2026-09-01T16:23:01Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 2

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.5.access-parity-js-probe-conflates-timeout` created from `develop` at `b6ddbd7`, pushed with tracking | — |
| 2 | review-bug | ✅ Done | READY TO FIX, 9/10. 1 Critical auto-fixed (missing Developer Fix Cycle + Resolution Summary stubs). duplicate=none, reproduces=likely | `bug.5.review.1.access-parity-js-probe-conflates-timeout.md` |
| 3 | investigate-fix | ✅ Done | Reproduced deterministically; root cause = `probeResolver` flattening never-ran into refused. Fix + 5 regression tests; 3 mutations red. Suite 32→37 pass | — |
| 4 | create-pr | ✅ Done | PR #293 → develop. Two commits: `89d188f` fix, `0d11686` docs | — |
| 5–6 | verify-fix loop | ✅ Done | 2 cycles. Cycle 1 FAIL (9 review findings, 3 high, 2 self-inflicted); cycle 2 PASS. Suite 38/38, ci:fast 2104/0 | — |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-09-01T16:23:01Z — Bug resolved: docs/bugs/bug.5.access-parity-js-probe-conflates-timeout/bug.5.access-parity-js-probe-conflates-timeout.md (mode=general, prefix=bug.5.access-parity-js-probe-conflates-timeout)
- 2026-09-01T16:23:01Z — Invoked from `/develop-next` (roadmap item **B5**) — autonomous run; Phase 0d answers auto-applied.
- 2026-09-01T16:23:01Z — Lite mode: **off** — severity=Major, priority=High (Major never runs lite).
- 2026-09-01T16:23:01Z — Q1 branch model: **bugfix** (auto-answered, recommended default). The bug states explicitly "Not a production defect" — the production reader's fail-closed behaviour is correct; only the test probe is wrong. No hotfix warranted.
- 2026-09-01T16:23:01Z — Q2 base branch: **develop** (auto-derived from Q1).
- 2026-09-01T16:23:01Z — Q3 PR target: **develop** (auto-derived from Q1).
- 2026-09-01T16:23:01Z — Platform: TRACKER=github, VCS=github, ACCESS_TRACKER=full, ACCESS_VCS=full. Bug has no `github_issue` — tracker signalling skipped throughout (expected for a general bug).

- 2026-09-01T16:23:54Z — Branch created: `bugfix/bug.5.access-parity-js-probe-conflates-timeout` (base `develop`, matches the `bugfix/bug.{N}.{name}` convention set by bug.4). Signal Work Started skipped — bug has no linked tracker issue.

- 2026-09-01 — review-bug (validate-and-apply): **READY TO FIX** 9/10. Stale scan confirmed the defect live — `shellAnswer()` (:146) discriminates infra-failure from refusal and throws; `jsAnswer()` (:184) still catches only a throw. Duplicate scan cleared bug.2 (same contention theme, different defect).
- 2026-09-01 — Renamed the implementation report to the parent-slug convention (`bug.5.implementation.1.access-parity-js-probe-conflates-timeout.md`), matching bug.3/bug.4 precedent; lock `report_path` updated.

- 2026-09-01 — **Root cause**: `probeResolver` (defer-mutation.js:703) returned the same `{mode:null, reason}` shape for "the resolver refused" and "the child never ran". `resolveAccessTracker` maps any reason to `manual` — correct, fail-closed, and must not change — leaving no caller able to tell a reading from a non-event. `jsAnswer()` caught only a throw, and the reader does not throw here.
- 2026-09-01 — **Second defect found mid-fix**: `_configAccessMemo` cached the timed-out probe under `[cwd, file, tier]`, making the fail-closed `manual` sticky for the process **and making the retry the bug prescribes a no-op**. Fixed alongside — the prescribed remedy could not work without it.
- 2026-09-01 — **Scope guard honoured**: no change to the reader's return value, its warning, or its fail-closed semantics. `onDiagnostic` is observation-only and absent from every production call site.
- 2026-09-01 — Added `AGENT_SKILLS_ACCESS_PROBE_TIMEOUT_MS` (default 10000, unchanged) so the failure is forceable. Read from ambient env unlike the neighbouring tier hook, because no timeout value can loosen the answer — a short budget only makes the probe fail, and a failed probe fails closed.
- 2026-09-01 — Ran `npm run bundle`: 38 bundled `references/defer-mutation.js` copies regenerated from the source.

## Issues Log

- 2026-09-01 — `prettier --check` flagged `shared/resources/defer-mutation.js` on the first `ci:fast`. Fixed with `prettier --write` and re-bundled. Exactly the class of late failure the develop-next merge-gate note describes from task 67.

## QA Iteration History

### Verify Cycle 1 — 2026-09-01
**Regression test**: pass — parity suite 37/37 (was 32), the five new tests green
**Suite + lint**: pass — `npm run ci:fast` 2103 tests / 0 fail; `prettier --check` clean
**CI on PR #293**: pass — 4/4 (test, validate, link-check, branch guard)
**Head SHA**: `0d11686` matches the PR source commit
**Code review**: **9 findings — 3 high, 3 medium, 3 low.** Two of the high findings were defects introduced by the fix itself (the new knob reading ambient `process.env`, re-opening the `.env` door; and an out-of-range budget reaching `spawnSync` as `Infinity`, breaking the NEVER-THROWS contract).
**Verdict**: **FAIL** → fix cycle 2

### Fix Cycle 2 — 2026-09-01
All nine findings addressed. See the bug file's Developer Fix Cycle for the full record.
**Mutation proof**: range check reverted → red; ambient knob reverted → 2 tests red. (The first attempt at the second mutation reported a false green — prettier had reflowed the call site so the edit never applied. Re-run with an assertion that both halves mutated.)

### Verify Cycle 2 — 2026-09-01
**Regression test**: pass — parity suite 38/38 (a sixth test added for the range check)
**Suite + lint**: pass — `npm run ci:fast` 2104 tests / 0 fail; `prettier --check` clean
**Code review**: cycle-1 findings all closed
**Verdict**: **PASS**

## Completion

**Branch:** `bugfix/bug.5.access-parity-js-probe-conflates-timeout`
**PR:** https://github.com/Gamaroff/agent-skills/pull/293
**DoD Summary:** —
