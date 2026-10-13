# QA Report: Task 181 - security-probe: a shell-argv: entry form (cycle 3)

**Task**: [task.181.probe-engine-shell-argv-entry-form.md](./task.181.probe-engine-shell-argv-entry-form.md)
**Gate File**: [task.181.gate.3.probe-engine-shell-argv-entry-form.yml](./task.181.gate.3.probe-engine-shell-argv-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-181-002 — setup writes charged to the entry | ✅ FIXED | `5210dbd6`: setup writes in their own list; a write outside the case directory errors the run, named. Test "a setup that writes outside its case directory errors the run…" green; setup-writes-into-entry mutation red at the fix. Bug report closed. |
| TASK-181-003 — writes beside the case directory unseen | ✅ FIXED | `5210dbd6`: `caseWatchedSpawn` (work-dir snapshot) on every shell-argv: run, shared with fence:. Test "a write beside the case directory, or a deletion in the harness, is an escape" green; emptying the snapshot reds it and both fence: work-dir tests. Bug report closed. |
| CR-4 — killed setup reported as a timeout | ✅ FIXED | `neverRanDetail`; test "a setup that is killed reports why…" green. |

## New Findings This Cycle

- **[low]** `shared/resources/security-probe.mjs:2519` — a setup that calls `gh` in a spelling `namesGh` misses trips the shared trip-wire; the run-level `needs-fake-gh` decline then names the entry, not the setup. Nothing is scored either way. → future.
- **[low]** `shared/resources/security-probe.mjs:2537` — a run whose setup fails on every case reads `entry-not-probeable` at the top level; each case's detail names the setup. → future.
- **[low, cleanup]** `shared/resources/security-probe.mjs:1384` — the fixture-string `gh` check is written twice, once per arm. → future.

---

## Executive Summary

Cycle 3 reviewed the five files changed since gate 2 (scoped; no safety re-probe trigger). The consolidation holds: `fence:` and `shell-argv:` share one per-case isolation, every `fence:` test is unchanged and green, and both cycle-2 findings are closed with mutation-proven tests. The review raised only LOW attribution and wording findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head 86667d713216; 5 files) — default. `SAFETY_REPROBE=false`: clause 1 (gate 2 security CONCERNS, evidence `measured`) false; no HIGH entry (clause 2); gate not FAIL (clause 3). Independent Explore reviewer dispatched 04:35:48Z, `duration_ms` 145602. Step 4b: changed docs carry one bash block each, already executed in cycle 1 and still refused as side-effecting; not re-run.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | PASS | Verified | 18 shell-argv tests |
| Phase 2 | PASS | Verified | Escape accounting closed |
| Phase 3 | PASS | Verified | Routing test + proof run |

---

## Success Criteria Verification

Every criterion as cycle 1, now including: case `fixture` honoured as `fence:` honours it — `gh` (TASK-181-001) and escape accounting (TASK-181-003) both shared; a failing setup is `errored`, never `rejected`, and never charged to the entry (TASK-181-002).

---

## Breaking Changes Validation

None. PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3 (advisory, `recommendations.future`)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 19 (`task.181.qa.3.security.run.json`)
- Both controls engage, 0 reproduced, 0 escapes; TASK-181-001..003 closed.

### Maintainability — PASS

---

## Code Review

Reviewer: independent Explore subagent, scoped to files changed since gate 2. All three anchors verified (`finding-anchors.js`).

**Correctness bugs (2):**
- [low/medium] `shared/resources/security-probe.mjs:2519` — setup `gh` call attributed to the entry in the run-level decline → future.
- [low/medium] `shared/resources/security-probe.mjs:2537` — all-setup-failed reads `entry-not-probeable` → future.

**Cleanups (1):**
- `shared/resources/security-probe.mjs:1384` — duplicated fixture-string collection → future.

None qualifies for the gate (code_review_blocking promotes only `bug` + `high` confidence). Provenance: new to this change; LOW.

Mutation spot check: the three cycle-2 fixes were each mutation-proven at the fix commit (`covered`): setup writes into the entry list → TASK-181-002 test red; snapshot emptied → TASK-181-003 test and both fence: work-dir tests red; every signal as timeout → CR-4 test red. Tests re-run green here.

---

## Regression Testing

`ci:fast` at `5210dbd6`: 5420 pass, 0 fail.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open finding; NFRs PASS; security measured (19 probes).
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c — PR conformance review (`/review-pr`).
