# QA Report: Task 231 - Test infrastructure hygiene (cycle 2)

**Task**: [task.231.test-infrastructure-hygiene.md](./task.231.test-infrastructure-hygiene.md)
**Gate File**: [task.231.gate.2.test-infrastructure-hygiene.yml](./task.231.gate.2.test-infrastructure-hygiene.yml)
**Previous Report**: [task.231.qa.1.test-infrastructure-hygiene.md](./task.231.qa.1.test-infrastructure-hygiene.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-231-CR-1: symlinked anchor targets read as `[no-anchor]` | medium | ✅ FIXED | `e1a76d6b`; test "a tracked symlink is read through to its target…"; mutation (symlink branch disabled) → red → covered |
| TASK-231-QA-1: `groupByPrefix` drops `__proto__` | low | ✅ FIXED | `e1a76d6b`; test "groupByPrefix counts a prefix spelled like an Object.prototype key…"; mutation → red → covered |
| CR-3 (cleanup): `blocksOf` per dispatch line | low | ✅ FIXED | `e1a76d6b`, parity test passes |
| CR-2 (advisory): an engine-only PR runs an empty anchor step | low | ⏸ OPEN, advisory | carried in `recommendations.future` |

---

## Executive Summary

Cycle 2 is the full-diff refute pass. Both cycle-1 fixes hold, and each goes red when reverted. The refute pass found one new medium defect in the wrapper. A SIGTERM sent to it reaches only its direct child, so the suite's grandchildren keep running after their TMPDIR has been deleted. CI is green on `e1a76d6b`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR2-1 fixed and covered by a test)

### Review Methodology

Re-review scope: unscoped. Cycle 2 is a full-branch refute pass: the `origin/develop...HEAD` diff, minus generated `references/` copies and `docs/tasks/`, gives 24 files and 2,127 lines. One read-only Explore reviewer ran with the REFUTE directive. It was dispatched at 2026-10-26T06:47:23Z and read at 06:53:08Z (`duration_ms` 307196). `SAFETY_REPROBE=false`: clause 1 read `false`, and neither clause 2 nor clause 3 holds, since gate 1 failed on no safety axis. Direct tools otherwise. Step 4b does not apply because the change set has no `SKILL.md` or `shared/resources/*.md`.

---

## New Findings This Cycle

- **[medium]** `scripts/test-tmpdir.mjs:207`: the signal handler forwards with `child.kill(sig)` only to the direct child. Reproduced: wrapper around `sh -c 'node -e setInterval…'`, then `kill -TERM` on the wrapper. The wrapper exits 143 and prints "per-run directory removed", but the grandchild `node` is still alive. Fix: spawn the suite as its own process group, signal the group, and test with a grandchild. **Promoted: TASK-231-CR2-1.**
- **[low]** `scripts/test-tmpdir.mjs:63`: `INNER_RE` keeps an all-lowercase inner suffix. `prefixOf("eval-repeat-hang-qwerty-Ab12Cd")` returns `eval-repeat-hang-qwerty`, a new prefix, so about 0.55% of runs that leak this directory would trip the ratchet. Fix: strip by producer, not by case. **Promoted: TASK-231-CR2-2** (high confidence, so it is gated, but low severity).
- **[low, advisory]** `scripts/test-tmpdir.mjs:161`: the retry `rmSync` is unguarded, so a second failure escapes `main`'s `finally` (confidence medium).
- **[low, advisory]** `shared/resources/doc-links.js:242` and its sibling matchers grow quadratically on long unclosed emphasis or whitespace runs. The reviewer measured about 1.9 s at 16k characters on a single heading line (confidence medium).
- **[low, advisory]** `shared/resources/qa-read-back.js:227`: `no-anchor` is now a halting state, but the qa-task and qa-story Step 12b prose still names only missing, ignored, outside-repo and unverifiable (confidence medium; the qa-task prose was confirmed at `skills/qa-task/SKILL.md:1637`).
- **[low, advisory]** `shared/resources/doc-links.js:228`: platform-variance. Only GitHub heading slugs are known, so a Bitbucket consumer's `markdown-header-` anchors would read `[no-anchor]` (confidence low).

Provenance: the wrapper and the anchor check are new on this branch, so every finding is new to this change.

---

## Implementation Verification

All 6 phases are still delivered. Phase 1 (the wrapper) carries CR2-1 and CR2-2. The other phases are unchanged since cycle 1, apart from the verified fixes.

## Success Criteria Verification

SC-1 to SC-7 stand as recorded in the cycle-1 report. SC-1 ("pass or fail, no per-run directory remains") still holds: the directory is removed. CR2-1 concerns the processes left running after it is removed, which is an adjacent gap the criterion does not state.

## Breaking Changes Validation

Unchanged from cycle 1: PASS.

---

## Issues Found

**HIGH (0)**

**MEDIUM (1)**: TASK-231-CR2-1, described above (P1).

**LOW (1 gated, 4 advisory)**: TASK-231-CR2-2, plus the advisory findings listed above.

---

## NFR Assessment

### Performance — PASS
CR2-4 is advisory. Real headings are short, and the repo-wide corpus test stays near 3 s.

### Reliability — CONCERNS
CR2-1 leaves orphaned processes after a signal, CR2-2 can cause a ratchet flake, and CR2-3 is an unguarded retry.

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), from `task.231.qa.2.security.run.json` `totals`
- **Boundary**: `true`, `scripts/test-tmpdir.mjs#compareRatchet`, re-probed at `e1a76d6b`. `groupByPrefix` changed this cycle, but it is a counter and not a verdict; its prototype-key cases are held by tests.

### Maintainability — PASS
CR2-5 is a prose gap in two `SKILL.md` files.

---

## Code Review

Code review is blocking for this run. Promoted: CR2-1 → `TASK-231-CR2-1`, CR2-2 → `TASK-231-CR2-2`. Every anchor checks `ok` against `e1a76d6b`.

**Correctness bugs (6):**
- [medium/high] `scripts/test-tmpdir.mjs:207`: the signal reaches only the direct child (promoted).
- [low/high] `scripts/test-tmpdir.mjs:63`: an all-lowercase inner suffix splits the prefix (promoted).
- [low/medium] `scripts/test-tmpdir.mjs:161`: the retry `rmSync` is unguarded.
- [low/medium] `shared/resources/doc-links.js:242`: quadratic heading matchers.
- [low/medium] `shared/resources/qa-read-back.js:227`: the Step 12b prose omits `no-anchor`.
- [low/low] `shared/resources/doc-links.js:228`: Bitbucket heading slugs (platform-variance).

**Cleanups (0)**

**Boundary**: `true`, `probes_executed: 8`, `escaped: 0`.

**Mutation proofs** (Step 3c, the fixes from this cycle's predecessor, run against committed tests at `e1a76d6b`; the tree was unchanged afterwards):

- mutation-proven: `anchorsFor` symlink branch → `if (false)` → `doc-links.test.mjs` "anchors: a tracked symlink is read through to its target…" → covered
- mutation-proven: `groupByPrefix` counter → constant 1 → `tests/test-tmpdir.test.js` "groupByPrefix counts a prefix spelled like an Object.prototype key…" → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite through the wrapper (local, after the cycle-1 fix) | PASS: 6,364 tests, 0 failures, ratchet ok |
| CI @ `e1a76d6b` | PASS: test, link-check, validate, shellcheck, secret-scan |

### Test Commands Executed
```bash
command node scripts/test-tmpdir.mjs --ratchet r.json -- sh -c '<grandchild node>; echo after' & kill -TERM $!   # CR2-1 reproduction
command node -e 'prefixOf("eval-repeat-hang-qwerty-Ab12Cd")'                                                  # CR2-2 reproduction
command node shared/resources/security-probe.mjs --sink path --entry 'scripts/test-tmpdir.mjs#compareRatchet' --args-json '[{"known":2}]' --cases-file docs/tasks/task.231.test-infrastructure-hygiene/task.231.qa.1.ratchet-cases.json --record docs/tasks/task.231.test-infrastructure-hygiene/task.231.qa.2.security.run.json --json
gh pr checks 752
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium reliability defect (CR2-1) and one gated low (CR2-2). No high findings.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` for CR2-1 (and CR2-2), then cycle 3, a scoped re-review.
