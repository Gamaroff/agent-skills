# QA Report: Task 254 - security-probe: a cli: entry can run a fixture setup

**Task**: [Link to task document](./task.254.probe-engine-cli-fixture-setup.md)
**Gate File**: [task.254.gate.1.probe-engine-cli-fixture-setup.yml](./task.254.gate.1.probe-engine-cli-fixture-setup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

The `cli:` form now runs a committed `--fixture-setup`, through one helper shared with the `shell-argv:` form. The behaviour is delivered and three mutations each turn a committed test red. One success criterion (no extra process without a setup, "asserted by a test") is held only by a record field, so the gate is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#818, head 0c9c7f09)

### Review Methodology

Direct tools plus one read-only Explore reviewer for the diff (first review, whole branch diff; no parallel agents).
CI on 0c9c7f094aec: green.
Step 4b: no executable blocks in the changed prose (`probe-boundary-rule.md` and `security-review-prompt.md` each hold one fence, refused as mutating or unrecognised; no fence was changed).
Reviewer dispatched 2026-11-03T12:48Z; returned in 62 s (completion notice `duration_ms` 62459).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Reproduce both causes | PASS | Verified | Two causes of the clean-control failure found (no repository, and an incomplete T252 fixture). |
| 2: One setup helper | PASS | Verified | `runCaseSetup` at `security-probe.mjs:3205`, called at 2954 (`cli:`) and 3365 (`shell-argv:`). |
| 3: Decline wording | PASS | Verified | `cannotMaterialiseDetail` at 2427 names the sink. |
| 4: Docs, bundles, proof | PASS | Verified | `bundle:check` 128 skills, 0 problems. |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| `cli:` runs the setup in each case dir | `security-probe.mjs:2954`; node and python acceptance tests | PASS |
| Failing, timing-out or escaping setup is `errored` | `runCaseSetup` 3205; test "a setup that fails, or writes outside its case directory" (TMPDIR, HOME, sibling dir) | PASS |
| Still refused for `shell:`, `shell-fn:`, `fence:` | `security-probe.mjs:1746`; test "still declined by the forms..." | PASS |
| T252 plan re-run on `cli:` with a git-init setup | See below | PASS |
| `cannot materialise` names the sink | `security-probe.mjs:2427`; wording test on both arms | PASS |
| No extra process without a setup, asserted by a test | Only `fixture_setup: null` in the record (`security-probe.test.mjs:8571`) | **Unverified** (T254-QA-1) |
| One helper, asserted by a test | Structural test plus the escape test, mutation 3 | PASS |
| Security-probe tests pass | 284 pass (develop run); the 58-test subset re-run three times here | PASS |
| `npm test` and `bundle:check` | `ci:fast` 7168/7169; the one failure was a load-sensitive 20 s timing budget, passes alone 7/7. CI green on this head. | PASS |
| Every §8 mutation turns a test red | See Mutation proofs | PASS |
| CHANGELOG cites task 254 | `changelog-cites.sh` → `cites (task 254)` | PASS |
| Docs no longer say repository state is unreachable on `cli:` | `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md` | PASS |

**T252 probe plan re-run.** Command, from the repository root:
`security-probe.mjs --sink url-authority --entry cli:shared/resources/migrate-doc-numbering.mjs --argv '["--check","--root","{input}"]' --fixture-setup shared/resources/tests/fixtures/security-probe/setup-git-repo.sh --cases-file <t252 cases> --name t252`.
With the original fixture: `unverifiable / rejects-every-input`, 5 probes executed, clean control rejected. The cause was two things: no git repository (exit 2, "not inside a git repository"; fixed by the setup) and a fixture that is not a clean corpus (no `prd_number:` frontmatter, no `docs/prd/prd-registry.md`). With the fixture completed: `engages / hostile-rejected-legitimate-accepted`, clean control accepted, four hostile cases rejected. The `filename` sink still declines a path input and now says why.

**Criteria drift:** clean (`criteria-drift.js`, base: review-commit).

---

## Issues Found

### MEDIUM Severity Issues (1)

**T254-QA-1: the "no extra process" criterion is not held by a test**
- **Severity**: MEDIUM
- **Observation**: The criterion says "asserted by a test". The only assertion is that the record's `fixture_setup` is null and the run stays accepted. Nothing counts spawns.
- **Impact**: A change that spawned a setup process without a setup would pass.
- **Recommendation**: Count `bash` spawns (a PATH shim that logs) for a no-setup run (zero) and a setup run (one per case), and mutation-prove it.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
The setup spawns only when a path is given.

### Reliability — PASS
Failing, timed-out and escaping setups are errored with a named detail.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary decision: `boundary: false`. The criteria word "never" (classifier result `["never"]`) is "errored, never rejected": outcome classification of the harness, not an input gate. Predicate-shaped functions added: `runCaseSetup` (returns a setup result) and `cannotMaterialiseDetail` (builds a message); neither accepts or rejects an untrusted input.
- Escapes: 0.

### Maintainability — PASS
One shared helper. One stale comment remains (CR-2).

---

## Code Review

Advisory (this run's `code_review_blocking` resolved to the pipeline default; neither finding below is a high-confidence bug).

**Correctness bugs (1):**
- [low/low] `shared/resources/security-probe.mjs:1778` — a `cli:` setup runs with the host PATH and the `gh` scan is textual, so a helper it executes that calls `gh` goes unnoticed → run it with a gh-free PATH or document the scan as best-effort.

**Cleanups (1):**
- `shared/resources/security-probe.mjs:1581` — the `fixtureSetup` record-field comment still says shell-argv only → name the `cli:` form too. (`finalise-dod-security-prompt.md:48` routes `--fixture-setup` to `shell-argv:`, which is still true; the `cli:` routing is stated elsewhere in that file.)

**Mutation proofs** (tree snapshot with `cp`, restored and compared to HEAD after each):
- mutation-proven: `cli:` arm helper call disabled → node and python acceptance tests, and the failing-setup test → covered
- mutation-proven: `cli:` refusal re-added → node and python acceptance tests, the gh-naming test and the failing-setup test → covered
- mutation-proven: private unwatched setup spawn in the `cli:` arm → the failing/escaping-setup test and the one-helper structural test → covered

---

## Regression Testing

The shell-argv setup tests pass unchanged (inside the 58-test subset and the 284 total). `bundle:check` and the four skill `validate` runs pass.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test --test-name-pattern 'task\.254|cli entry|fixture-setup|fixture setup' shared/resources/tests/security-probe.test.mjs
npm run validate -- skills/finalise/   # also qa-story, qa-task, review-security: all pass
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 818   # CI green
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Delivered and proven, with one criterion unheld by a test.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL on T254-QA-1.

---

**QA Report**: co-located at `task.254.qa.1.probe-engine-cli-fixture-setup.md`
**Gate File**: co-located at `task.254.gate.1.probe-engine-cli-fixture-setup.yml`
**Next Steps**: `/qa-fix` closes T254-QA-1.
