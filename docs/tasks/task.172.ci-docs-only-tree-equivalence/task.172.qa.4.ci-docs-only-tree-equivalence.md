# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.4.ci-docs-only-tree-equivalence.yml](./task.172.gate.4.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's eight fixes are verified, including on inputs the fixes were not written for (BOM, CRLF, empty and tab-indented configuration, future-dated and timezone-less timestamps, abbreviated `--head`, a Bitbucket `next` link). The scoped review found no HIGH defect and two MEDIUM ones, both reproduced: the 6c poll latches a `code-changed` answer that the engine also returns after walking past a not-yet-green ancestor, and a configuration blob that parses to nothing (a symlink, for instance) gets the defaults.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 3 finding | Status | Evidence |
| --- | --- | --- |
| CR3-1 ancestor settle window | FIXED | `settle()`; a nearly-complete interaction with the poll's latch is CR4-1 |
| CR3-2 block-scalar `checkCommand` | FIXED | refused with exit 2 |
| CR3-3 `ci` not a mapping, near-miss keys | FIXED | usage errors (but see CR4-2 for text that parses to nothing) |
| CR3-4 silent rollup read | FIXED | both blocks print the value |
| CR3-5 Bitbucket next host | FIXED | followed only on the API base |
| CR3-6 config from the working tree | FIXED | read with `git show <head>:` |
| CR3-7 truncated `--json` | FIXED | `process.exitCode`, capped record |
| CR3-8 gitlink marker | FIXED | rejected before patterns |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 4/4, PR 543 open
- [x] 364 tests across 11 affected files pass under both `TMPDIR` values; `eval:all`, validation and `bundle:check` pass
- [x] Hosted CI on the cycle 3 head: `test` pending, `validate`, `shellcheck`, branch policy pass, **`link-check` red**: bug report 16 quoted the hostile test URL as plain text and the link checker found it dead. Found by QA from the job log, fixed in this cycle (the URL is now in backticks); the only bare external URL in the task's documents

### Review Methodology

Re-review scope: default, files changed since gate 3's head (`1c7a7e68`; recorded as an ancestor of HEAD), no refute pass, no safety re-probe (gate 3: security CONCERNS with `reasoned` evidence, no HIGH open, not FAIL). One independent read-only Explore reviewer on the cumulative patch of those files.

---

## New Findings This Cycle

- **[medium]** the 6c poll latches a `code-changed` that is not final (CR4-1), reproduced.
- **[medium]** a config blob that parses to no mapping, or is a symlink, gets the defaults (CR4-2), reproduced.
- **[low, cleanup]** documentation drift (review CR-3): a section says four things but lists six; the engine header and CHANGELOG omit `changedCount` and two keys; a test title says three keys.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | unchanged |
| Phase 2: the engine | CONCERNS | CR4-2 |
| Phase 3: call sites | CONCERNS | CR4-1 |
| Phase 4: config and docs | CONCERNS | documentation drift (low) |

---

## Issues Found

### MEDIUM Severity Issues (2)

- **CR4-1**: [task.172.bug.19.poll-latches-a-code-changed-that-is-not-final.md](./task.172.bug.19.poll-latches-a-code-changed-that-is-not-final.md)
- **CR4-2**: [task.172.bug.20.config-blob-that-parses-to-nothing-gets-the-defaults.md](./task.172.bug.20.config-blob-that-parses-to-nothing-gets-the-defaults.md)

### LOW Severity Issues (1)

- Documentation drift, in the gate's `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
The poll can permanently lose the rule after a settle window (CR4-1).
### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- No HIGH is open. Scoped re-review; both findings reproduced by execution. No corpus sink models this predicate.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (2):** CR4-1 and CR4-2, both in the gate. **Cleanups (1):** documentation drift, advisory.

Provenance: all in code this branch added.
No mutation proofs this cycle: no fix was made this cycle.

---

## Regression Testing

- 11 affected test files, 364 tests, pass under both temp values; `eval:all`, `validate`, `bundle:check` pass.
- Cycle 3's fast gate: 4,894 of 4,896; the one failure is a file-time-budget test that fails identically on pristine `develop`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR4-1 and CR4-2, each with a test that is red on revert.

### Short-term Actions (Non-Blocking)
1. Fix the documentation drift (counts and field lists).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH open; two reproduced MEDIUM findings remain.
**Quality Score**: 75/100

**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: co-located at `task.172.qa.4.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.4.ci-docs-only-tree-equivalence.yml`
**Next Steps**: qa-fix cycle 4
