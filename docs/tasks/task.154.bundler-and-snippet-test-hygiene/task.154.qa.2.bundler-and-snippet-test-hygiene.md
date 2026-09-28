# QA Report: Task 154 - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Gate File**: [task.154.gate.2.bundler-and-snippet-test-hygiene.yml](./task.154.gate.2.bundler-and-snippet-test-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 was a re-review of PR #513 at `77250a8a`: a whole-branch refute pass plus a safety re-probe.
Both cycle-1 findings are fixed. A by-hand re-probe of the runner with 18 fresh candidates deleted
nothing outside its clone. The refute pass found two MEDIUM defects in the fixed code. First, §2 can
now pass on a scan that resolved no skills. Second, two concurrent runner invocations delete each
other's clone. It also found seven LOW edge cases, all in code this PR adds.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| T154-QA1-1: the runner deletes whatever `CLEAN_CHECKOUT_DIR` names | HIGH | FIXED | 18-candidate by-hand re-probe: every destructive candidate exits 2 with nothing deleted. 3 new fixture tests. QA re-ran mutation F2 → red |
| T154-QA1-2: §2 needs the zero-problem summary line | MEDIUM | FIXED, but see T154-QA2-1 | §1e stale fixture passes. QA re-ran mutation F5 → §1e red. The fix left a vacuous-scan path open |
| CR-2 (cycle 1, LOW): hand copy of the ephemeral patterns | LOW | FIXED | The runner calls `ephemeralReason()`. See QA2-4 for the `/private/var/tmp` spelling |

---

## Testing Scope

### Review Methodology

Direct tools plus one refute-pass reviewer (Explore). `PRIOR_GATES=1`, so `REFUTE_PASS=true` and the
whole branch diff was reviewed (23 files, 2323 lines).

Re-review scope: unscoped (cycle 2 refute pass; safety re-probe set by clause-2 judgement, because
cycle 1's HIGH was a destructive boundary).

- **Step 4b.** No `SKILL.md` or shared `.md` changed since cycle 1, so cycle 1's result stands: no
  fenced block was added.
- **Boundary rule.** The runner's `CLEAN_CHECKOUT_DIR` arm is still a declined sink, so it was
  re-probed by hand under §5.1 with 18 candidates.

---

## New Findings This Cycle

- **[medium]** `tests/bundle-missing-source.test.js:65` — the §2 floor counts skills on disk and
  accepts the `❌` form. With every skill unresolved, the scan checks nothing and §2 still passes.
  → Make the scan report its scanned count on both paths ([bug 3](./task.154.bug.3.missing-source-scan-can-be-vacuous.md)).
- **[medium]** `scripts/test-clean-checkout.sh:75` — the marker proves who created a clone, not that
  the run is finished. Two concurrent runs delete each other's clone. → Use an exclusive PID lock
  ([bug 4](./task.154.bug.4.clean-checkout-concurrent-runs.md)).
- **[low]** `scripts/test-clean-checkout.sh:72` — a case-variant of the repo path skips the
  containment refusal on APFS. The marker check still stops it.
- **[low]** `scripts/test-clean-checkout.sh:59` — `/private/var/tmp/x` is accepted where `/var/tmp/x`
  is refused.
- **[low]** `scripts/test-clean-checkout.sh:103` — a kill during clone or checkout leaves an unmarked
  directory that later runs refuse.
- **[low]** `scripts/test-clean-checkout.sh:75` — an unreadable directory reads as empty.
- **[low]** `tests/test-clean-checkout.test.js:34` — a checkout under `/tmp` or
  `.claude/worktrees/` fails every positive case with no clear message.
- **[low]** `scripts/test-clean-checkout.sh` (by-hand probe) — a tab in the path garbles the refusal
  message. The path is still refused.
- **[low]** `scripts/test-clean-checkout.sh` (by-hand probe) — a non-existent nested path leaves its
  empty parent behind.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1–2, 4, 6 | PASS | Unchanged since cycle 1 |
| 3: CI reader | CONCERNS | T154-QA2-1 |
| 5: Clean-checkout runner | CONCERNS | T154-QA2-2 and the LOWs |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 7. All are new to this PR: they sit in files the PR adds.

---

## NFR Assessment

### Performance — PASS

`ci:fast` ran 4419 tests in 248s.

### Reliability — CONCERNS

Concurrent-run clobber (QA2-2) and lockout after an interrupted clone (QA2-5).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured, from the by-hand safety re-probe (§5.1)
- **Probes executed**: 18
- Every destructive candidate was refused, and nothing outside the clone was deleted.

### Maintainability — CONCERNS

QA2-1, and the LOW nits.

---

## Code Review

This section records Step 3b: the refute pass plus the safety re-probe, blocking.

**Correctness bugs (7 from the reviewer, 2 from the by-hand probe):** see New Findings above.
- CR-1 (medium/high): promoted to T154-QA2-1.
- CR-2 (medium/medium): confirmed by reading the ownership check, promoted to T154-QA2-2.
- CR-3 to CR-7 (low): entered as T154-QA2-3 to QA2-7 so that one fix cycle closes them.
- The two probe LOWs are entered as QA2-8 and QA2-9.

**Cleanups (0).**

**Mutation spot check (QA re-run on the committed state):**

- mutation-proven: marker check disabled → test-clean-checkout "refuses to delete…" → covered
- mutation-proven: §2 reader requires the zero-problem line → bundle-missing-source §1e → covered

**Platform variance.** CR-3 (APFS case) and CR-7 (checkout under `/tmp`) are platform-variance
candidates. Neither is reachable on Linux CI's default checkout path. Both are entered LOW.

---

## Test Artifacts

### Test Commands Executed

```bash
node --test tests/test-clean-checkout.test.js tests/bundle-missing-source.test.js   # 15/15
npm run ci:fast                                   # 4419 / 0 fail / 1 skipped (5b gate at 77250a8a)
# by-hand re-probe: env -i PATH=<node>:/usr/bin:/bin HOME=<scratch> CLEAN_CHECKOUT_DIR=<candidate> CLEAN_CHECKOUT_CMD=true bash scripts/test-clean-checkout.sh
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH remains. Two MEDIUM defects in code this PR adds are open.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T154-QA2-1 and T154-QA2-2 are fixed.

---

**Next Steps**: `/qa-fix` cycle 2, then cycle 3 re-review.
