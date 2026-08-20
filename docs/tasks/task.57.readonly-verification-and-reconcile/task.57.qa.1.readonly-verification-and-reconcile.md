# QA Report: Task 57 - Read-only verification, and `/tracker-reconcile` so the checklist is a ledger rather than a receipt

**Task**: [Link to task document](./task.57.readonly-verification-and-reconcile.md)
**Gate File**: [task.57.gate.1.readonly-verification-and-reconcile.yml](./task.57.gate.1.readonly-verification-and-reconcile.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-20
**Testing Completed**: 2026-08-20
**Gate Status**: FAIL

---

## Executive Summary

The implementation itself is strong: all 7 phases land, 36 new tests are green inside a 1643-test suite, and six named invariants were watched failing under mutation. The gate fails on the **diff code review**, which found one high-severity integration defect — the Step 7 accept-gap commands invoke `references/handover-{verify,render}.js` inside the develop-* skills where neither engine is bundled (MODULE_NOT_FOUND for every consumer) — plus seven medium/low bugs, several of which weaken exactly the invariants this task exists to hold (a revoked tick that stays ticked; an irreversible action that runs unconfirmed).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (7/7 per Progress Tracking)
- [x] Tests passing (fresh run: 1643/1643)
- [x] Breaking changes: N/A (additive change; schema v unchanged)
- [x] Code on feature branch with open PR (#269, verified OPEN by poller)

### Testing Approach

- [x] Automated Testing (full `npm test` executed fresh: exit 0)
- [x] Regression Testing (adjacent suites: handover-render, stage-access-gate, tracker-reconcile, restricted-access-docs — 110/110)
- [x] Code Review (adversarial diff review via read-only subagent, `code_review_blocking=true`)
- [x] Mutation-proof spot check (fresh mutation, not one from the dev pass)
- [x] Functional smoke of the shipped CLI (check-only + refused --apply, real filesystem)

### Review Methodology

Hybrid: direct tools for phases/criteria/NFR (first review, evidence directly verifiable), one read-only Explore subagent for the adversarial diff review (3,898-line scoped diff excluding auto-bundled `skills/*/references/` copies). Pipeline lite-mode directive absent — standard mode.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1. Verification recipes / read pass / state derivation | CONCERNS | 19 tests green | CR-2 (satisfied never cleared), CR-7 (allowlist gaps) |
| 2. Renderer changes | CONCERNS | four states in all 4 formats | CR-4 (divergent+irreversible guard bypass), CR-9 (observed formatting) |
| 3. skills/tracker-reconcile/ | CONCERNS | 16 tests green incl. refusal matrix | CR-3 (no default tty confirm), CR-8 (dead clause), CR-10 (model rebuilt) |
| 4. approve model | PASS | renderersForMode pinned; non-TTY degrades to command | |
| 5. Accept gap made loud | FAIL | — | CR-1 (engines not bundled — commands cannot run), CR-5 (verify no-op), CR-6 (formats hardcoded) |
| 6. Amend the standing rule | PASS | both-or-red pin green; mutation-proven | |
| 7. Tests, docs, catalog, bundle | PASS | 1643 green; validate:all 116/116; catalog lists skill; docs guard live-branch green | |

**Overall Phase Completion**: 7/7 implemented; 4 phases carry code-review findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `read-only` performs no mutation, throwing stub | proven | §1 suite + in-process gate | PASS | CR-7 narrows the allowlist claim (two gh api shapes admitted); no shipped recipe builds them |
| Four states derived; `unverifiable` never coerced | proven | §3/§4/§5 + mutation red | PASS | |
| Satisfied ticked, not deleted; count identity | proven | §2 + count invariant throws | CONCERNS | CR-2: a *revoked* tick is not cleared on re-reconcile |
| Reconcile ticks back + updates sidecar | proven | §2 + live smoke | PASS | |
| `--apply` refused under every non-full model | proven | §1 refusal matrix (4 modes) + smoke | PASS | |
| Reconcile idempotent | proven | §5 byte-identity | PASS | |
| Change Log rows only for executed actions | proven | §4 (3 tests) + mutation red | PASS | |
| `finalise` accepts locally AND records debt | pinned | docs test, mutation red | CONCERNS | CR-1/CR-5/CR-6: the commands the doc prescribes cannot run as written |
| Anti-patterns + FAQ amended | done | pinned by test | PASS | |
| Invariants watched failing; suites green; catalog; bundle | done | 6 dev mutations + 1 fresh QA mutation red | PASS | |

---

## Breaking Changes Validation

N/A — additive: `verification` is an optional record field, schema `v` stays 1, existing artifacts remain readable. Verified by the pre-existing 47-test renderer suite passing unmodified fixtures.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: Step 7 accept-gap commands reference unbundled engines (CR-1)**
- **Severity**: HIGH — the flagship deliverable of phase 5 fails with MODULE_NOT_FOUND for every consumer
- **Category**: Functional/Integration
- **Observation**: `ls skills/develop-{story,task,bug}/references/ | grep handover` → 0 matches; the bundled step-7 doc at `skills/develop-task/references/develop-pipeline-step-7-finalise.md:294` invokes exactly those paths
- **Impact**: A restricted run following the pipeline doc cannot render its handover artifacts
- **Recommendation**: Reference the engines via `shared/resources/` paths in the pipeline doc so the bundler copies + rewrites them; prove with `npm run bundle` + `ls`

### MEDIUM Severity Issues (5)

- **CR-2** `shared/resources/handover-verify.js` — `verifyRecords` never clears `satisfied`; a regression after a tick renders ticked, swallowing divergence
- **CR-3** `skills/tracker-reconcile/scripts/tracker-reconcile.js` — no default confirm: `--apply` on a tty executes irreversible actions unconfirmed
- **CR-4** `shared/resources/handover-render.js` — divergent+irreversible routes to `divergent_step`, bypassing `confirm_step` under `--all`
- **CR-5** step-7 doc — the verify invocation discards its output; the pass is a guaranteed no-op as written
- **CR-6** step-7 doc — formats hardcoded for every mode, contradicting `renderersForMode` and widening manual/read-only artifacts

### LOW Severity Issues (2)

- **CR-7** `isReadOnlyArgv` misses `--field`/`--input`, and `-F` graphql values are not scanned for `mutation`
- **CR-8** dead `rec.retry_of === ""` clause in `applyRecords`

**Total Issues**: HIGH: 1, MEDIUM: 5, LOW: 2 (all from code review; no separate bug files — the gate `top_issues` list is the authoritative feed for `/qa-fix` in the pipeline loop)

---

## NFR Assessment

### Performance — PASS
Pure renderers over small record lists; CR-10 (model rebuilt per render) is deliberate defence-in-depth re-redaction, advisory only.

### Reliability — CONCERNS
CR-2 and CR-4 weaken the divergence-visibility and never-assume-consent invariants under narrow but real triggers (second reconcile after regression; `--all` on an irreversible divergent record).

### Security — CONCERNS
Redaction re-proven (existing §6/§16 suites); CR-7 leaves two mutating `gh api` shapes admitted by the read-only allowlist — no shipped recipe constructs them, so defence-in-depth gap rather than live path.

### Maintainability — PASS
36 new tests, mutation-prove log in the task doc, schema documented; cleanups advisory.

---

## Code Review

From Step 3b (blocking via pipeline `code_review_blocking=true`; findings CR-1…CR-8 promoted to gate `top_issues`).

**Correctness bugs (8):**
- [high/high] `shared/resources/develop-pipeline-step-7-finalise.md:294` — accept-gap commands reference engines not bundled into develop-* skills → reference via shared/resources so the bundler copies them
- [medium/high] `shared/resources/handover-verify.js:881` — `satisfied` never cleared on regression → derive from fresh verification state
- [medium/high] `skills/tracker-reconcile/scripts/tracker-reconcile.js:283` — no default tty confirm for irreversible actions → supply one; skip when absent
- [medium/high] `shared/resources/handover-render.js:958` — divergent guard replaces (not composes with) the irreversible confirm gate → dispatch through confirm_step
- [medium/medium] step-7 doc — verify output discarded → add `--verify` to the render CLI
- [medium/medium] step-7 doc — formats hardcoded per mode → derive from renderersForMode
- [low/medium] `handover-verify.js:89` — allowlist misses `--field`/`--input`; `-F` graphql unscanned
- [low/medium] `tracker-reconcile.js:262` — dead `retry_of === ""` clause

**Cleanups (2, advisory):**
- `handover-render.js:589` — raw `v.observed` interpolation renders `[object Object]` for structured observations → extract the object-aware formatter already used in the satisfied branch
- `tracker-reconcile.js:197` — model built four times per sidecar → build once, pass to renderers

**Mutation-proven**: yes for the six dev-pass invariants (each red, logged in the task doc) plus one fresh QA-side mutation (divergent guard removal → 3 red). Not every assertion was reverted — the seven named above were.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full suite (fresh run) | 1643/1643 PASS |
| handover-render pre-existing 47 tests | PASS unmodified |
| stage-access-gate (no-mutation proofs) | PASS |
| restricted-access docs guard (live-skill branch now active) | PASS |
| validate:all | 116/116 PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/handover-verify.js`, `shared/resources/handover-render.js`, `skills/tracker-reconcile/scripts/tracker-reconcile.js`, `skills/tracker-reconcile/tests/tracker-reconcile.test.js`, `shared/resources/tests/handover-verify.test.mjs`, `shared/resources/develop-pipeline-step-7-finalise.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `tests/restricted-access-docs.test.js`, six flipped reference/concept docs.

### Test Commands Executed
```bash
npm test                            # 1643 pass / 0 fail (exit 0)
node --test shared/resources/tests/handover-render.test.mjs shared/resources/tests/stage-access-gate.test.mjs \
  skills/tracker-reconcile/tests/tracker-reconcile.test.js tests/restricted-access-docs.test.js   # 110/110
npm run validate:all                # 116/116
ACCESS_TRACKER=manual node skills/tracker-reconcile/scripts/tracker-reconcile.js <smoke-dir> [--apply] --json
```

### Coverage Report
Coverage tooling not configured for this repo's `node --test` runner; coverage asserted behaviourally (36 new tests over the new surface; every invariant in the task's mutation-prove list watched red).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — make the engines bundle into the develop-* skills (P0)
2. CR-2, CR-3, CR-4 — restore the weakened invariants, each with a regression test (P1)
3. CR-5, CR-6 — make the Step 7 commands executable as documented (P1)
4. CR-7, CR-8 — allowlist completeness + dead clause (P2)

### Short-term Actions (Non-Blocking)
1. CR-9 observed-value formatter; CR-10 single model build (advisory)

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high-severity finding (CR-1) under the pipeline's blocking code review; the medium findings weaken the task's own load-bearing invariants.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1 proven fixed via bundle + ls; CR-2/3/4 fixed with tests.

---

**QA Report**: co-located at `task.57.qa.1.readonly-verification-and-reconcile.md`
**Gate File**: co-located at `task.57.gate.1.readonly-verification-and-reconcile.yml`
**Next Steps**: `/qa-fix` cycle 1 against the gate file.
