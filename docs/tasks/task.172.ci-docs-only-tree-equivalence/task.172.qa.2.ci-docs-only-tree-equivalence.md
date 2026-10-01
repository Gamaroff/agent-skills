# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.2.ci-docs-only-tree-equivalence.yml](./task.172.gate.2.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's three findings and two advisory ones are fixed and verified. The cycle 2 refute pass and unscoped safety re-probe, run by an independent reviewer, found two more HIGH ways around the engine's fail-closed property and six MEDIUM gaps. QA reproduced the HIGH findings and CR2-3 to CR2-5 with real git repositories; CR2-6 to CR2-8 were confirmed in the source.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 config in the delta is docs | FIXED | `skills-config.yaml` at any depth is never docs; 2 tests, mutation-proven |
| CR-2 all-skipped ancestor green | FIXED | all-skipped is NONE (but see CR2-2 for the success-plus-skipped shape) |
| CR-3 Step 7 reading 2 suffix | FIXED | pins require the suffix on both readings (but see CR2-8 for the unbound inputs) |
| CR-4 normalised path names | FIXED | `isDocsPath` rejects non-normal forms |
| CR-5 `--pr` inert | FIXED | echoed in the `--json` record |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4)
- [x] Tests passing: 213/213 across the 7 affected suites under both `TMPDIR` values
- [x] Code on feature branch with open PR 543; hosted CI on `5a1bd840` green

### Testing Approach

- [x] Automated, Regression, Security Review (unscoped re-probe), Code Review (independent, refute directive plus safety re-probe directive)

### Review Methodology

Re-review scope: unscoped (prior gate failed on security), and a refute pass because this is cycle 2. Whole-branch diff of 5,889 lines (generated copies and the work-item directory excluded; bundle:check holds the copies). Direct tools plus one read-only Explore subagent, independent of the author.

Step 4b: `skills/finalise/SKILL.md` carries runnable prose; the harness classifies its blocks as mutating or placeholder. The three call-site arms were run by hand under `bash` and `zsh` in cycle 1 and are unchanged this cycle apart from the Step 7 comment.

---

## New Findings This Cycle

- **[high]** `shared/resources/ci-tree-equivalence.js` — a nearer red docs-only ancestor is walked past (CR2-1), reproduced.
- **[high]** `shared/resources/ci-tree-equivalence.js` — an ancestor with a success plus skipped jobs reads green (CR2-2), reproduced.
- **[medium]** check and config run in the working tree, not at `--head` (CR2-3), reproduced.
- **[medium]** unknown `ci.docsOnly` keys are silently ignored (CR2-4), reproduced.
- **[medium]** a gitlink under a docs pattern is docs (CR2-5), reproduced.
- **[medium]** the status read is not paginated (CR2-6), confirmed in source.
- **[medium]** `checkCommand` has no timeout (CR2-7), confirmed in source.
- **[medium]** the new prose blocks read variables bound elsewhere (CR2-8), confirmed in source.
- **[low]** the config is read from the working directory, not the repository root (CR2-9), advisory.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | unchanged |
| Phase 2: the engine | FAIL | CR2-1 to CR2-7, CR2-9 |
| Phase 3: call sites | CONCERNS | CR2-8 |
| Phase 4: config and docs | PASS | will need the new rules documented |

---

## Issues Found

### HIGH Severity Issues (2)

- **CR2-1**: [task.172.bug.4.red-docs-ancestor-skipped.md](./task.172.bug.4.red-docs-ancestor-skipped.md)
- **CR2-2**: [task.172.bug.5.success-plus-skipped-ancestor-green.md](./task.172.bug.5.success-plus-skipped-ancestor-green.md)

### MEDIUM Severity Issues (6)

- **CR2-3**: [task.172.bug.6.check-and-config-run-at-working-tree.md](./task.172.bug.6.check-and-config-run-at-working-tree.md)
- **CR2-4**: [task.172.bug.7.unknown-config-keys-ignored.md](./task.172.bug.7.unknown-config-keys-ignored.md)
- **CR2-5**: [task.172.bug.8.gitlink-under-docs-reads-docs.md](./task.172.bug.8.gitlink-under-docs-reads-docs.md)
- **CR2-6**: [task.172.bug.9.status-read-not-paginated.md](./task.172.bug.9.status-read-not-paginated.md)
- **CR2-7**: [task.172.bug.10.check-command-has-no-timeout.md](./task.172.bug.10.check-command-has-no-timeout.md)
- **CR2-8**: [task.172.bug.11.unbound-inputs-in-the-new-prose-blocks.md](./task.172.bug.11.unbound-inputs-in-the-new-prose-blocks.md)

### LOW Severity Issues (1)

- CR2-9: the config is read from the working directory.

**Total Issues**: HIGH: 2, MEDIUM: 6, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
`checkCommand` has no timeout (CR2-7); the status read can be truncated (CR2-6).
### Security — FAIL

- **Status**: FAIL
- **Evidence**: reasoned
- **Probes executed**: 0
- The engine is an accept/reject boundary with no matching corpus sink (cycle 1's `security-probe` run on the path predicate was `unverifiable`). The surface was re-searched unscoped by an independent reviewer and QA reproduced the findings by execution, so the verdict rests on reproductions, not on the probe engine.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (9):** CR2-1 to CR2-9 above; CR2-1 to CR2-8 are in the gate (reviewer confidence medium or high, QA reproduced or confirmed each).

**Cleanups (0).**

Provenance: all findings are in code this branch added; none pre-exists on `develop`.
No mutation proofs this cycle: no fix was made this cycle.

---

## Regression Testing

- 7 affected suites, 213/213, under the default temp dir and `TMPDIR=/tmp`.
- `npm run validate` for finalise, develop-next, develop-batch: pass. `bundle:check`: clean.
- Cycle 1's fast gate: format passes, 4,838 of 4,841; the two failures are the file-time-budget tests that fail on pristine `develop` at this host's load.

---

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=/tmp node --test <7 affected suites>
npm run validate -- skills/finalise/
```
Reproduction harness: a node script with real temporary git repositories and an injected `gh`, one scenario per finding.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR2-1 to CR2-8, each with a test that is red on revert; document the new rules in `configuration.md`.

### Short-term Actions (Non-Blocking)
1. CR2-9: resolve the repository root first.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced ways to read a head as verified when it is not.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.172.qa.2.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.2.ci-docs-only-tree-equivalence.yml`
**Next Steps**: qa-fix cycle 2
