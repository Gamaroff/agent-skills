# QA Report: Task 140 - Harden the shell-fn: sentinels and the fake-gh coverage (cycle 2)

**Task**: [Link to task document](./task.140.shell-fn-sentinel-hardening.md)
**Gate File**: [task.140.gate.2.shell-fn-sentinel-hardening.yml](./task.140.gate.2.shell-fn-sentinel-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 / [TASK-140-BUG-1](./task.140.bug.1.library-trap-plus-errexit-scored.md) — own EXIT trap + errexit scored | FIXED (Closed) for the shapes named | row "replaces the EXIT trap and then fails under set -e … both orderings" green; mutant F1 reds it |
| CR-2 / [TASK-140-BUG-2](./task.140.bug.2.fake-gh-containment-still-lexical.md) — fake-gh containment lexical | FIXED (Closed) | row "--fake-gh containment is decided on real paths" green; F2, F5 red it |
| CR-3 — quoted/backslashed gh, non-line-initial source | FIXED for the shapes named | namesGh row green; F3, F4 red it |

The fixes are correct for the shapes cycle 1 named. The refute pass shows each is one entry in an open-ended list — see New Findings.

---

## Executive Summary

Re-review of `9023813b` (qa-fix cycle 1). Every cycle-1 finding is fixed and mutation-proved. The cycle-2 refute pass over the whole branch diff found that both mechanisms cycle 1 patched are enumerations over shell syntax with more entries: four ways to install an EXIT trap the shadow does not intercept, and six ways to reach `gh` the detector does not read. Another widening would be the third patch to the same two mechanisms; the recommendation is to replace them.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — BUG-3 and BUG-4 fixed by replacing the mechanisms

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#527)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (boundary re-probe)
- [x] Code Review (refute pass + safety re-probe)

### Review Methodology

Direct tools plus one read-only Explore reviewer. Cycle 2 (one prior gate) → **refute pass over the whole `origin/develop...HEAD` diff** (18 files, 1,891 lines, bundled copies excluded), with the **safety re-probe** directive appended as well: gate 1's security axis read `CONCERNS measured` (clause 1 does not fire), but its CR-2 was a containment bypass, which I judged enough for clause 2. Step 4b: the changed prose still holds one fenced block (`probe-boundary-rule.md`), refused `mutating` → `no-executable-blocks`.

Re-review scope: unscoped (cycle 2 refute pass; safety re-probe by judgement on gate 1 CR-2)

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:670` — the trap shadow is bypassed by `trap true exit` (lowercase; bash 5, 3.2), `builtin trap true EXIT` (bash, zsh), `command trap true EXIT` (bash) and a zsh `TRAPEXIT()` function; after `set -e; false` each is scored → [TASK-140-BUG-3](./task.140.bug.3.trap-shadow-bypassed.md): replace with a positive source-completed marker.
- **[medium]** `shared/resources/security-probe.mjs:548` — `namesGh` misses `/usr/local/bin/gh api`, `"${GH_BIN:-gh}" api`, `GH_CLI=gh` / `"$GH_CLI" api` and `gh<in` → [TASK-140-BUG-4](./task.140.bug.4.gh-detector-open-ended.md): a run-time trip-wire `gh` on `PATH`.
- **[medium]** `shared/resources/security-probe.mjs:560` — `SOURCE_LINE` does not follow a `source` after `if`, `elif`, `else`, `{`, `!`, `(`, or `source -- x` → BUG-4 (the trip-wire covers it at run time).
- **[low/medium conf]** `shared/resources/security-probe.mjs:1042` — the four prompts that give the `shell:` recipe do not say `--fake-gh` applies to it (advisory; the decline names the flag).
- **[low/medium conf]** `shared/resources/security-probe.mjs:442` — a missing path under a symlinked root is refused `outside-repo-root` instead of "not readable"; realpath the deepest existing ancestor (advisory).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the red rows | PASS | Verified | 8 task.140 rows, all green |
| Phase 2: the body and the gates | CONCERNS | Partial | BUG-3, BUG-4 |
| Phase 3: the lint lanes | PASS | Verified | unchanged since cycle 1 |
| Phase 4: rule, bundle, CHANGELOG | PASS | Verified | §5 updated for cycle 1; bundle in sync |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Own EXIT trap / `set -e` declines on bash + zsh | PASS for the named shapes | BUG-3 shows further shapes |
| `shell:` names gh → needs-fake-gh; named spellings detected | PASS for the named spellings | BUG-4 shows further spellings |
| Symlink refused | PASS | re-probe: symlink-escape refused |
| task.136 green path; pre-existing rows | PASS | 108/108 |
| Wall-clock within noise | PASS | unchanged shape |
| Mutation proofs; gates green | PASS | cycle-1 mutants F1–F5 covered |
| Lanes byte-identical; rule once; CHANGELOG | PASS | |

---

## Breaking Changes Validation

Unchanged from cycle 1 — PASS.

---

## Issues Found

### MEDIUM Severity Issues (3)

- **CR-1** → [TASK-140-BUG-3](./task.140.bug.3.trap-shadow-bypassed.md) (Reliability, P1)
- **CR-2**, **CR-3** → [TASK-140-BUG-4](./task.140.bug.4.gh-detector-open-ended.md) (Security, P1)

**Provenance (Step 3b.5b).** Each shape yields the same verdict at `origin/develop` (scored), so by the letter each is pre-existing. They are attributed to this change as a judgement, recorded in both bug reports: the diff and rule §5 claim the whole class, and the task's own §2 rules out carrying another `future` line. A reader who disagrees can move them to `recommendations.future` with that reason.

### LOW Severity Issues (2, advisory — medium confidence)

- CR-4 prompt recipes; CR-5 missing path under a symlinked root. Both in `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS
No change in shape.

### Reliability — CONCERNS
BUG-3.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 21 (copied from `task.140.qa.2.security.run.json` `totals.executed`)
- `resolveEntry` re-probed with the same wrapper and a real `uploads/link-to-etc → /etc` present for the run: `present-but-inert`, reproduced only `shellfn.encoded-traversal` (pre-existing, identical at base). CONCERNS for BUG-4.

### Maintainability — CONCERNS
Both cycle-1 fixes widen an enumeration; a third widening is the narrowing-residue shape `/qa-fix` Step 2.6 exists for.

---

## Code Review

Refute pass + safety re-probe; `code_review_blocking=true`.

**Correctness bugs (5):**
- [medium/high] `shared/resources/security-probe.mjs:670` — trap shadow bypassed (**CR-1**, gate)
- [medium/high] `shared/resources/security-probe.mjs:548` — gh spellings not read (**CR-2**, gate)
- [medium/high] `shared/resources/security-probe.mjs:560` — source not followed after reserved words / grouping (**CR-3**, gate)
- [low/medium] `shared/resources/security-probe.mjs:1042` — prompt recipes silent on `--fake-gh` for `shell:` (CR-4, future)
- [low/medium] `shared/resources/security-probe.mjs:442` — missing path under symlinked root reads as escape (CR-5, future)

**Cleanups (0).**

mutation-proven: F1 (drop the trap shadow) → "replaces the EXIT trap … both orderings" → covered
mutation-proven: F2 (fake-gh lexical) → "--fake-gh containment is decided on real paths" → covered
mutation-proven: F3 (drop the quote prefix) → namesGh row (`dq.sh`) → covered
mutation-proven: F4 (line-initial SOURCE_LINE) → namesGh row (`and.sh`) → covered
mutation-proven: F5 (namesGh root not realpath'd) → namesGh row ("root via symlink") → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` | PASS 108/108 (committed state, via the cycle-1 fast gate) |
| `TMPDIR=/tmp` — shell-fn / symlink / fake-gh rows | PASS 30/30 |
| `npm run ci:fast` at `9023813b` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
TMPDIR=/tmp command node --test --test-name-pattern='task\.140|symlink|fake-gh|shell-fn' shared/resources/tests/security-probe.test.mjs   # 30/30
command node shared/resources/security-probe.mjs --sink path --entry '.claude/state/t140-probe-wrapper.mjs#containsShellFnEntry' --cases-file .claude/state/t136-probe-cases.json --repo-root "$(pwd)" --record docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.qa.2.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. BUG-3 — source-completed marker; remove the trap shadow
2. BUG-4 — run-time `gh` trip-wire; state and pin the absolute-path residual

### Short-term Actions (Non-Blocking)
1. CR-5 — deepest-existing-ancestor realpath (cheap; closes the missing-leaf residual too)
2. CR-4 — prompt recipes

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: three medium, high-confidence findings; no HIGH.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: BUG-3 and BUG-4 fixed by replacing the mechanisms, and re-reviewed

---

**QA Report**: co-located at `task.140.qa.2.shell-fn-sentinel-hardening.md`
**Gate File**: co-located at `task.140.gate.2.shell-fn-sentinel-hardening.yml`
**Next Steps**: `/qa-fix` cycle 2 — structural move (qa-fix Step 2.6, trigger b: repeat subject)
