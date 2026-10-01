# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.3.ci-docs-only-tree-equivalence.yml](./task.172.gate.3.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's eight fixes and the advisory one are verified. A third independent safety re-probe found no further way to read a head as verified through the ancestor walk's decision logic; it found configuration and record robustness gaps, one credential-forwarding gap on the Bitbucket path, and the ancestor partial-rollup window. QA reproduced seven of the eight gated findings by execution. No HIGH finding is open.

**Severity calls QA made and the reviewer did not.** The reviewer rated CR-1 (YAML block scalar), CR-2 (a `ci` block that is not a mapping) and CR-3 (the partial-rollup window) high. QA records them medium: CR-1 and CR-2 need an owner's malformed configuration and are the same class as cycle 2's CR2-4, which was rated medium; CR-3's window exists only in the minutes after a push, and every call site reads an ancestor whose own CI the pipeline already waited on. All three are fixed this cycle regardless; the rating decides only the Convergence check and the third-strike rule, and the record here lets a reader overrule it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
| --- | --- | --- |
| CR2-1 red docs ancestor | FIXED | stops the walk; CANCELLED still walked past |
| CR2-2 success plus skipped | FIXED | any skipped or neutral check disqualifies |
| CR2-3 `--head` vs HEAD | FIXED | refused unless the checked-out HEAD |
| CR2-4 unknown keys | FIXED | usage error (but see CR3-3 for the shapes it did not cover) |
| CR2-5 gitlink | FIXED | mode 160000 is code (but see CR3-8) |
| CR2-6 status pagination | FIXED | both reads paginate |
| CR2-7 checkCommand timeout | FIXED | `checkTimeoutSeconds` |
| CR2-8 unbound inputs | FIXED | guards run under bash and zsh |
| CR2-9 repo root | FIXED | resolved first |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 4/4, PR 543 open and mergeable
- [x] 323 tests across 10 affected files pass under both `TMPDIR` values; `eval:all`, validation and `bundle:check` pass
- [x] The PR conflicted with `develop` after #544 merged (no workflow runs); resolved by merging `develop` into the branch (`1c7a7e68`); hosted CI restarted on it

### Review Methodology

Re-review scope: unscoped (prior gate security FAIL), safety re-probe directive, whole-branch diff of 6,808 lines (generated copies and the work-item directory excluded). One independent read-only Explore reviewer. Not a refute pass (cycle 2 only).

---

## New Findings This Cycle

- **[medium]** an ancestor read while its lanes are still registering reads green (CR3-1), reproduced.
- **[medium]** a YAML block scalar `checkCommand` is read as `>-` and passes vacuously (CR3-2), reproduced.
- **[medium]** a `ci` block that is not a mapping, or a near-miss key, runs the rule with defaults (CR3-3), reproduced.
- **[medium]** the one-shot rollup read became silent in develop-next and develop-batch (CR3-4), confirmed in source.
- **[medium]** the Bitbucket `next` link is followed with credentials to any host (CR3-5), reproduced.
- **[medium]** the configuration is read from the working tree, not the commit judged (CR3-6), reproduced.
- **[medium]** a large `--json` payload is truncated when the process exits unflushed (CR3-7), reproduced.
- **[low]** the gitlink marker is matched by a broad pattern (CR3-8), reproduced.

Advisory (reviewer confidence medium, not gated): a nearer ancestor that is still PENDING is walked past (accepted residual to document); a missing `jq` in the 6c poll never latches; the arm blocks run the engine in the foreground.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | unchanged |
| Phase 2: the engine | CONCERNS | CR3-1 to CR3-3, CR3-5 to CR3-8 |
| Phase 3: call sites | CONCERNS | CR3-4 |
| Phase 4: config and docs | PASS | new rules need documenting |

---

## Issues Found

### MEDIUM Severity Issues (7)

- **CR3-1**: [task.172.bug.12.ancestor-partial-rollup-reads-green.md](./task.172.bug.12.ancestor-partial-rollup-reads-green.md)
- **CR3-2**: [task.172.bug.13.yaml-block-scalar-check-command-runs-nothing.md](./task.172.bug.13.yaml-block-scalar-check-command-runs-nothing.md)
- **CR3-3**: [task.172.bug.14.ci-block-not-a-mapping-falls-back-to-defaults.md](./task.172.bug.14.ci-block-not-a-mapping-falls-back-to-defaults.md)
- **CR3-4**: [task.172.bug.15.one-shot-rollup-read-became-silent.md](./task.172.bug.15.one-shot-rollup-read-became-silent.md)
- **CR3-5**: [task.172.bug.16.bitbucket-next-link-followed-with-credentials.md](./task.172.bug.16.bitbucket-next-link-followed-with-credentials.md)
- **CR3-6**: [task.172.bug.17.config-read-from-dirty-working-tree.md](./task.172.bug.17.config-read-from-dirty-working-tree.md)
- **CR3-7**: [task.172.bug.18.stdout-truncated-by-process-exit.md](./task.172.bug.18.stdout-truncated-by-process-exit.md)

### LOW Severity Issues (1)

- CR3-8: the gitlink marker is matched by a broad pattern.

**Total Issues**: HIGH: 0, MEDIUM: 7, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
The JSON record can be truncated on a large delta (CR3-7).
### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- No HIGH is open. The surface was re-searched unscoped by an independent reviewer and QA reproduced seven findings by execution. No corpus sink models this predicate (cycle 1's `security-probe` run on the path predicate was `unverifiable`), so the verdict rests on reproductions.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (11 returned):** CR3-1 to CR3-8 are in the gate; three advisory (CR-7, CR-10, CR-11 of the review).

Provenance: all in code this branch added.
No mutation proofs this cycle: no fix was made this cycle.

---

## Regression Testing

- 10 affected test files, 323 tests, pass under the default temp dir and `TMPDIR=/tmp`; `eval:all`, `validate` (finalise, develop-next, develop-batch), `bundle:check` pass.
- Cycle 2's fast gate: 4,853 of 4,856 tests; the two failures are the file-time-budget tests that fail on pristine `develop` at this host's load.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR3-1 to CR3-8, each with a test that is red on revert; document the new rules.

### Short-term Actions (Non-Blocking)
1. Document the PENDING-ancestor residual; guard a missing `jq` in the 6c poll; state the `checkCommand` bound against the tool timeout.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH open; seven reproduced MEDIUM findings remain.
**Quality Score**: 65/100

**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: co-located at `task.172.qa.3.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.3.ci-docs-only-tree-equivalence.yml`
**Next Steps**: qa-fix cycle 3
