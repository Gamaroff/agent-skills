# QA Report: Task 212 - qa-next: a note finding can be resolved, with evidence

**Task**: [Link to task document](./task.212.qa-next-resolvable-note-findings.md)
**Gate File**: [task.212.gate.4.qa-next-resolvable-note-findings.yml](./task.212.gate.4.qa-next-resolvable-note-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| T212-QA3-CR1 — Step 5 staging ignored `qaNext.registryPath` | ✅ FIXED | `--changed-runs` resolves the directory from `--registry`; the Step 5 block is executed against the tool; a non-default `--registry` test; a no-repo refusal test. Mutating the directory to hardcoded `docs/qa` turns the test red |
| QA3 CR-2 (advisory) — timeout read as refusal | Deferred | `recommendations.future` |

## Executive Summary

The cycle-3 HIGH is fixed and held by tests that fail when the fix is reverted. The scoped cycle-4 review raised two low findings and one cleanup, all advisory. The `--by` boundary engages on 17 probes at this head. The criteria are met, so the gate passes and the work goes to the PR conformance review.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (85 qa-next unit; `ci:fast` 5773/0 at `2f44919f`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#680, head `2f44919f`)

### Review Methodology

Direct tools plus the Step 3b reviewer subagent, dispatched at 15:34Z, with `duration_ms` 115452 (≈1.9 min). It read the cycle-3 delta first, then the full branch diff of the scoped files.

Re-review scope: files changed since gate 3 (head `428fcbcfef23`; 4 files) — default. `SAFETY_REPROBE=false`: clause 1 is false (security PASS at gate 3), and no judgement clause applies.

Step 4b: `SKILL.md`'s new Step 5 block is a single tool call, executed by the unit test. The engine classifies the file's blocks as `no-executable-blocks` (information).

---

## New Findings This Cycle

- **[low/medium]** `skills/qa-next/scripts/uat-status.mjs:1068` — `--changed-runs` lists every diff status, not only modifications. Advisory: qa-next's preflight requires a clean tree, and re-staging this run's own file is harmless.
- **[low/low]** `skills/qa-next/scripts/uat-status.mjs:1069` — a registry outside `--root` yields an empty list (advisory).
- **[cleanup]** `evals/qa-next/unit/uat-status.test.mjs:3683` — no test exercises `--root` set to a subdirectory (advisory).

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: Parse, verify, count | PASS | |
| Phase 2: The writer | PASS | |
| Phase 3: Docs | PASS | Step 5 calls `--changed-runs` |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1–SC4 | `parseFindings…`, `verifyResolution names every reason`, `isOpenFinding is pure…`, `CLI: a validly resolved note is closed…` | PASS |
| SC5 writer | `--resolve-finding writes one cell…`, `replaces a marker…`, `refuses a finding number…`, `reads its row back…`, CRLF | PASS |
| SC6 no-marker output identical | `a run file with no markers yields the same…` | PASS |
| SC7 `isOpenFinding` pure | plain-object test | PASS |
| SC8 `ci:fast` with `.agents/skills` aside | 5773/0 at `2f44919f` | PASS |
| SC9 per-PR tests | `evals/qa-next/unit/*.test.mjs` in `npm test` | PASS |
| SC10 grammar identical in three docs, one writer | `the run template, SKILL.md and README define the resolution marker identically…` | PASS |
| SC11 Step 5 stages earlier resolved run files | `SKILL.md Step 5's staging block … executed`, `--changed-runs lists … under the registry it is given` | PASS |
| SC12 the "never does" exception | doc-agreement test | PASS |

---

## Breaking Changes Validation

None declared. **Overall:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (advisory), cleanup: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Markers are staged from the tree under the configured registry, and a marker that stops holding can be replaced.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17 (from `task.212.qa.4.security.run.json` `totals.executed`)
- **Probe**: `cli:` form, `--resolve-finding … --by {input}`, against a real fixture root. Verdict `engages`: 16 hostile inputs refused, 1 legitimate input accepted.

### Maintainability — PASS

---

## Code Review

Anchors: CR-1 and CR-2 are `ok`; CR-3 is `unchecked-text`.

**Correctness bugs (2):**
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:1068` — no `--diff-filter=M` → add it (advisory, `recommendations.future`)
- [low/low] `skills/qa-next/scripts/uat-status.mjs:1069` — a registry outside `--root` prints an empty list → refuse it (advisory)

**Cleanups (1):**
- `evals/qa-next/unit/uat-status.test.mjs:3683` — add a `--root` subdirectory case

No finding is promoted: none is a high-confidence bug.

**Boundary**: `boundary: true` for `--resolve-finding --by`, with `probes_executed: 17`. `--changed-runs` is read-only and takes no caller input beyond `--registry`, so it is `boundary: false`.

**Mutation spot-check** (cycle-3 fix):
- mutation-proven: `--changed-runs` registry directory hardcoded to `docs/qa/runs` → `--changed-runs lists the edited run files under the registry it is given…` → covered

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| qa-next unit suite (85) | PASS |
| `npm run ci:fast` at `2f44919f` | PASS (5773/0) |

---

## Test Artifacts

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'cli:skills/qa-next/scripts/uat-status.mjs' --argv '[...,"--by","{input}",...]' --cases-file task.212.qa.4.security.cases.json --record task.212.qa.4.security.run.json --json
node --test --test-name-pattern='lists the edited run files under the registry' evals/qa-next/unit/uat-status.test.mjs   # mutation proof
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open finding, every NFR passes, and each cycle's fix is held by a test.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.212.qa.4.qa-next-resolvable-note-findings.md`
**Gate File**: co-located at `task.212.gate.4.qa-next-resolvable-note-findings.yml`
**Next Steps**: Step 5c PR conformance review
