# QA Report: Task 278 - QA loop readers read the right thing

**Task**: [Link to task document](./task.278.qa-loop-readers-read-the-right-thing.md)
**Gate File**: [task.278.gate.1.qa-loop-readers-read-the-right-thing.yml](./task.278.gate.1.qa-loop-readers-read-the-right-thing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-16
**Testing Completed**: 2026-11-16
**Gate Status**: CONCERNS

---

## Executive Summary

The three readers now read the right thing, and every fix is held by a test that goes red when the fix is reverted. Four MEDIUM gaps stop a clean PASS: no CHANGELOG entry, one existing consumer fixture was changed against criterion 3, the globs wiring has no committed test, and the `fix_path` boundary has no engine probe.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` on the LAN server: 8528 pass, 0 fail, 3 skipped)
- [x] Breaking changes: none (both new inputs are optional)
- [x] Code on feature branch with open PR (#915)

### Testing Approach

- [x] Automated testing
- [x] Performance testing
- [x] Regression testing
- [x] Code review (adversarial diff review)
- [x] Boundary probe (by hand; see Code Review)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (first review, whole branch diff, `REFUTE_PASS=false`). Adaptive strategy: small task, direct tools. Diff review: code review (the change set holds code).

CI on 25325d21e446: pending (read once with `qa-ci-read.sh`; undecided, so nothing enters the gate).

The reviewer was dispatched at 20:29Z and returned in 32 s (`duration_ms` 32191).

Step 4b: two changed blocks in `develop-pipeline-step-5-6-qa-loop.md`, both refused by the snippet allow-list as `mutating`, so `changed-blocks-not-executed` is reported. Committed tests run the classify block (`acceptance-commit-carries-5c`, bash and zsh). The narrowing call-site block was run by hand in bash and zsh with and without globs (T278-QA-3). `skills/review-pr/SKILL.md`: `no-executable-blocks`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: gate reader | PASS | 11 new tests, 8 fail when reverted | `keyStartPositions` skips quoted spans and nested flow keys |
| Phase 2: residue fold | PASS | rows 17-20, row 17 fails when reverted | fold only when `testArtifactGlobs` is set |
| Phase 3: 5c `fix_path` | CONCERNS | bash and zsh case, 2 fail when reverted | boundary not engine-probed (T278-QA-4) |
| Phase 4: tests, bundle, sweep | PASS | bundle 0 problems; prettier clean | per-entry migration diff recorded below |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Three motivating shapes classify correctly, named tests | yes | `qa-gate-reader-top-level` (11), `qa-narrowing-residue` rows 17-20, `acceptance-commit-carries-5c` fix_path case | PASS | |
| Each control keeps its old result | yes | each case is paired with a control in the same file | PASS | |
| Other `readTopIssues` consumers pass existing fixtures unchanged | unchanged | passes, but one expectation in `accept-qa-residual.test.mjs` moved from refuses to edits | CONCERNS | T278-QA-2 |
| Wall time within 10% of develop | <= 10% | -3.5% (median 743 s vs 770 s) | PASS | below |
| Each change has a mutation proof | yes | three proofs, below | PASS | |
| `bundle --check` 0 problems; `CI=true npm test` passes | yes | 0 problems; 8528 pass | PASS | |
| `qa-narrowing-residue.test.mjs` passes | yes | 26 pass | PASS | |
| Migration: per-entry diff over committed gates | empty or explained | 14 of 1021 gates differ, all explained | PASS | below |

**Performance** (`CI=true npm run test:remote -- --run test`, five alternating runs; seconds, load average 1m at start): develop 1093 (16.3), 770 (11.9), 875 (10.7), 726 (0.2), 728 (0.5); branch 878 (2.7), 1196 (18.8), 743 (1.7), 725 (0.2), 726 (0.8). Median develop 770, branch 743. The server is shared; the two quiet pairs agree within 2 s.

**CHANGELOG citation**: `changelog-cites.sh task.278` answers `missing (task 278)` (T278-QA-1).

**Criteria drift**: `criteria-drift.js` against the review commit reports `clean`; no criterion text changed.

---

## Breaking Changes Validation

None. `testArtifactGlobs` and `fix_path` are optional and default to the old behaviour.

---

## Issues Found

### MEDIUM Severity Issues (4)

- **T278-QA-1** `CHANGELOG.md`: no `[Unreleased]` entry cites (task 278). Fix: add one.
- **T278-QA-2** `accept-qa-residual.test.mjs`: criterion 3 says existing fixtures pass unchanged, but the nested-map case moved lists because the old expectation encoded the defect. Fix: record the deviation and escalate for an approver; do not reword the criterion.
- **T278-QA-3** `develop-pipeline-step-5-6-qa-loop.md`: the globs argv read in the narrowing block has no committed test with globs. Fix: extend `qa-narrowing-offer-wiring.test.mjs`.
- **T278-QA-4** `develop-pipeline-step-5-6-qa-loop.md`: the `fix_path` predicate is a boundary no probe-engine form reaches; `probes_executed` is 0. Fix: extract the classify script and probe it, or record the DoD override.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 0

---

## NFR Assessment

### Performance — PASS

Median -3.5% against develop, inside the 10% bound.

### Reliability — PASS

An unparseable or absent globs value, and an absent `fix_path`, both read as before.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `fix_path` is a boundary (it decides which file the carry may stage). A by-hand probe of 16 hostile shapes cleared nothing unsafe, but by-hand probes never count (T278-QA-4).

### Maintainability — PASS

One reader, one fold helper, one parse of `fix_path`; bundled copies in sync.

---

## Code Review

Reviewed: 1648-line patch, 24 files (sources, not generated copies).

**Correctness bugs (0).**

**Cleanups (1):**
- `shared/resources/qa-diminishing-returns.js:597` — [low/low] production files are keyed by path minus extension, so `a.js` and `a.ts` overwrite each other and a test folds onto whichever came last → key per extension. Advisory: two production files stay two subjects either way, so the verdict is unchanged.

**Boundary:** `boundary: true`, `probes_executed: 0`. By-hand probe of the 5c classify block (scratch harness outside the tree), `fix_path` against a code-anchored `ref`; nothing cleared unsafely:

| Shape | Result |
| --- | --- |
| clean sibling `.md`, `./` inside the directory, single-quoted | `doc-only` (control) |
| `../` out of the directory, absolute path, directory, `:(exclude)`, `:!*.md`, NUL, trailing comment, `:12` suffix, empty, `.MD`, first of two keys is code | `record`, nothing eligible |
| glob `*.md` | passes the shape test, then refused by the literal tracked-file test |
| symlink `link.md` to code | `doc-only` (pre-existing: the base logic for `ref` has no symlink check) |

Provenance of the symlink case was judged by reading the unchanged base logic, not by running it on base; it is recorded under `recommendations.future` as `unverified`.

**Platform variance:** no environment-derived value reaches a validating consumer in this diff.

mutation-proven: `keyStartPositions` gate (`if (false && …)`) → `qa-gate-reader-top-level` went red (my output filter showed the first 4 failures and cut the count; the develop-phase run of the same mutation counted 8 of 11) → covered
mutation-proven: fold disabled (`if (true || …)`) → `qa-narrowing-residue` row 17 → covered
mutation-proven: `fix_path` branch disabled (`if (false && f !== null)`) → `acceptance-commit-carries-5c` fix_path case, bash and zsh (2 fail) → covered

Snapshots restored byte-identical (`cmp` silent) and the three suites read 91 pass, 0 fail afterwards.

**Migration check** (`readTopIssues` over all 1021 committed gates, 2202 entries, develop reader against branch reader): 14 gates differ, all because the old reader took `status` or `category` from text quoted inside a finding. Examples: `task.208.gate.2` `QA-208-4` old `status: "0 ignored"`, new `null`; `task.251.gate.1` `T251-QA-1` old `status: "open kept)."'`, new `open`; `task.238.gate.8` `TASK-238-CR8-1` old `category: "coverage"` from quoted prose, new `null`. No entry lost a correct reading.

---

## Regression Testing

`ci:fast` on the LAN server: formatting clean, `npm test` 8528 pass, 0 fail, 3 skipped. Consumer suites (`accept-qa-residual`, `qa-diminishing-returns`, `qa-narrowing-residue`, `qa-loop-route`, `qa-narrowing-offer-wiring`, `accept-qa-residual-merge-rule`) pass.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true npm run test:remote            # ci:fast on the LAN server
CI=true npm run test:remote -- --run test   # x10, alternating develop and branch
npm run bundle -- --check              # 0 problems
npm run validate -- skills/review-pr/  # ok
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T278-QA-1 to T278-QA-4.

### Short-term Actions (Non-Blocking)
1. CR-1: key the fold map per extension.
2. Symlinked `*.md` in the 5c carry (pre-existing).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the fixes work and are held; four MEDIUM gaps are open.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T278-QA-1 to T278-QA-4 fixed and re-verified

---

**QA Report**: co-located at `task.278.qa.1.qa-loop-readers-read-the-right-thing.md`
**Gate File**: co-located at `task.278.gate.1.qa-loop-readers-read-the-right-thing.yml`
**Next Steps**: qa-fix cycle
