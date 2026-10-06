# QA Report: Task 186 - Eval harness hardening and task.185 leftovers (cycle 2)

**Task**: [Link to task document](./task.186.eval-harness-hardening-and-leftovers.md)
**Gate File**: [task.186.gate.2.eval-harness-hardening-and-leftovers.yml](./task.186.gate.2.eval-harness-hardening-and-leftovers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-06
**Testing Completed**: 2026-10-06
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (medium) — `repeat.mjs` floor counted `liveAssertions` under replay | FIXED | `3c7b6b8`; `assertionsFor` / `driverNameFrom` shared; repeat test expects exit 2 under replay and 3 under a live driver; 3/3 mutations killed |
| CR-3 (low) — jq probe errored fake-gh unit tests without jq | FIXED | `jqTest` gate; no-jq meta-test runs the suite on a PATH with only `node` (0 fail, ≥1 skipped); 1/1 mutation killed |

---

## Executive Summary

Both cycle-1 findings are fixed and hold under mutation. The cycle-2 refute pass, run over the whole
branch, found that the A5 fix itself has a wrong scope: `installFakeGh` refuses without `jq` under
every driver, so a replay run — which never calls `gh` — is now skipped (exit 0) on a jq-less host,
where `develop` judged it. Reproduced; promoted to the gate.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (C2-CR-1 fixed)

---

## Testing Scope

### Review Methodology

Cycle 2 — **refute pass** over the whole `origin/develop...HEAD` diff (22 files, 2235 lines), one
independent Explore reviewer with the refute directive (dispatched 06:01:03 UTC, `duration_ms`
383478). `SAFETY_REPROBE=false` (gate 1 security PASS, clause 1 false). Uncommitted tracked changes
outside the work item: none.

Re-review scope: whole branch diff — cycle 2 refute pass (prior gate: 1)

Step 4b: no SKILL.md changed since gate 1; the cycle-1 record stands (numbering blocks refused
fail-closed by the engine; covered by `next-numbered.test.mjs`).

---

## New Findings This Cycle

- **[medium]** `evals/shared/lib/fake-gh.mjs:126` — C2-CR-1: the jq refusal fires under replay too;
  reproduced with `PATH` = {`node`, `git`}: `DRIVER=replay node evals/shared/runner.mjs
  evals/review-pr/scenarios/01-happy` → `skipped: jq not available on PATH`, exit 0 → refuse only
  under a live driver. **Promoted** (reviewer confidence medium; reproduction removes the doubt).
- **[medium/medium]** `evals/shared/runner.mjs:340` — C2-CR-2: the runner still passes a 0/0 run;
  only `repeat.mjs` refuses it, but the `assertionsFor` docstring says both do → correct the
  docstring, or add the floor to the runner. Advisory.
- **[low/medium]** `evals/shared/repeat.mjs:136` — C2-CR-3: a `requiresLiveDriver` scenario with
  only `liveAssertions` under replay reads usage (2), not could-not-run (3); the README's exit-2 row
  is narrower than the code. Advisory.
- **[low/low]** `evals/shared/repeat.mjs:131` — C2-CR-4: `env.json` values are `String()`-coerced by
  the runner and not by `repeat.mjs`. Advisory.
- **[cleanup]** C2-CR-5 the with-jq half of the A5 test returns (passes) rather than skips without
  jq; C2-CR-6 the tests and the installer test for jq differently; C2-CR-7 the no-jq meta-test leaks
  its temp dir and uses `URL.pathname`. Advisory.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 (A1–A6) | CONCERNS | C2-CR-1: A5's refusal scope |
| Phase 2 (B) | PASS | 33-form probe, 0 mismatches |
| Phase 3 (C) | PASS | unchanged since gate 1 |
| Phase 4 (D) | PASS | probe re-run on this head: engages 30/30 |

---

## Success Criteria Verification

All functional, code-quality and migration criteria as in gate 1 — PASS. The A5 criterion ("a
missing jq becomes could-not-run, not a failed run") holds for live runs; C2-CR-1 shows it is
over-applied to replay runs, where jq is not needed.

---

## Breaking Changes Validation

Unchanged since gate 1 — PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the jq refusal applies to replay runs (C2-CR-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: reproduced above.
- **Impact**: on a host without `jq`, `eval:all` reports the four review-pr replay scenarios as
  passing without judging them. CI has `jq`, so CI is unaffected today.
- **Recommendation**: decide from the resolved driver; install without the probe under replay.
- **Priority**: P1

### LOW Severity Issues (0 in gate)

**Total Issues (gate)**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
C2-CR-1; C2-CR-2 advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30 (copied from `task.186.qa.2.security.run.json` `totals.executed`)
- `next_numbered` re-probed on head `3c7b6b8`: engages, 30/30. Fake gh classifier: 33/33.

### Maintainability — PASS

---

## Code Review

Independent refute reviewer; `code_review_blocking=true`. Findings are listed under New Findings
This Cycle. Promoted: C2-CR-1 (by reproduction). Provenance (5b): C2-CR-1 is new to this change —
`origin/develop`'s `fake-gh.mjs` has no jq probe, so the replay run was judged there.

**Boundary record:** unchanged — `next_numbered` and the fake `gh` classifier probed (above);
`assertionListProblems` and the new `assertionsFor` / `driverNameFrom` — `boundary: false`: they
read repository-authored `scenario.json` / `env.json`, not untrusted input.

**Mutation proofs (cycle 1 fixes, re-run on the committed head):**
- mutation-proven: `assertionsFor` counts `liveAssertions` under replay → repeat "no assertions is a usage error" → covered
- mutation-proven: same mutation → runner-setup "liveAssertions are skipped under replay" → covered
- mutation-proven: `repeat.mjs` ignores `env.json` → repeat "no assertions is a usage error" → covered
- mutation-proven: `jqTest` never skips → fake-gh "the suite skips, never fails, on a host without jq" → covered
- mutation-proven: drop the A5 "1/1 assertions passed" assertion → nothing red → absorbed (the `doesNotMatch(/skipped/)` assertion still holds the half)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Targeted suites (6 files) | 393/393 |
| `TMPDIR=/tmp` run of fake-gh + runner-setup | 33/33 |
| `npm run ci:fast` at the fix commit | exit 0, 5396 pass |
| PR CI at `3c7b6b8` | test pending; link-check, shellcheck, validate pass |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test evals/shared/tests/{runner-setup,repeat,fake-gh}.test.mjs \
  shared/resources/tests/{pr-inline-comment,next-numbered}.test.mjs skills/review-pr/tests/review-pr.test.js   # 393/393
TMPDIR=/tmp command node --test evals/shared/tests/fake-gh.test.mjs evals/shared/tests/runner-setup.test.mjs  # 33/33
PATH=<node+git only> DRIVER=replay node evals/shared/runner.mjs evals/review-pr/scenarios/01-happy             # C2-CR-1 repro: skipped, exit 0
```

---

## Recommendations

### Immediate Actions (Blocking)
1. C2-CR-1 — the jq refusal applies only under a live driver.

### Short-term Actions (Non-Blocking)
1. C2-CR-2 docstring; C2-CR-3 README exit-2 wording; C2-CR-4 env.json coercion; C2-CR-5..7 test tidy-ups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium regression introduced by A5's scope; no high findings.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — C2-CR-1 fixed

---

**QA Report**: co-located at `task.186.qa.2.eval-harness-hardening-and-leftovers.md`
**Gate File**: co-located at `task.186.gate.2.eval-harness-hardening-and-leftovers.yml`
**Next Steps**: `/qa-fix` C2-CR-1, then QA cycle 3.
