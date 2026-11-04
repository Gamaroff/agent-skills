---
type: qa-report
title: "QA report: task 253, cycle 3"
description: "Third QA review (scoped to the cycle 2 fixes) of the migrate-doc-numbering safety nets: gate PASS."
updated: 2026-11-03
---

# QA Report: Task 253 - migrate-doc-numbering safety nets

**Task**: [task.253.migrate-doc-numbering-safety-nets.md](./task.253.migrate-doc-numbering-safety-nets.md)
**Gate File**: [task.253.gate.3.migrate-doc-numbering-safety-nets.yml](./task.253.gate.3.migrate-doc-numbering-safety-nets.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Gate Status**: PASS

---

## Executive Summary

Both cycle 2 findings are fixed, and each fix is held by a committed test that goes red when the fix is reverted. The scoped diff review found nothing new, and a set of edge-case probes by QA turned up one low-severity gap that existed before the fix and stays advisory. Gate is PASS.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T253-QA-2: the gap 3 guard cannot fail for `id`, `epic`, `prd_source` | ✅ FIXED | The test asserts each key's exact value. Writing a constant for the story `prd_source` turns `253 gap 3` red (re-run this cycle). Bug 2 closed. |
| T253-QA-3: `maskedLinks` ignores fence marker type and length | ✅ FIXED | Closes only on the opening character at least as long. Ignoring the character, the length, or the nested-line blanking each turns the new test red (re-run this cycle). Bug 3 closed. |

## New Findings This Cycle

None from the reviewer. Searched: the scoped diff since gate 2 (182 lines: `migrate-doc-numbering.mjs`, its test file, `CHANGELOG.md`), with the reviewer asked to probe fence identity cases, `--prune` side effects and test vacuity. QA then probed `maskedLinks` directly with eight inputs: CRLF, indented fence, info string, closing fence with trailing text, unclosed fence, a backtick opener whose info string holds a backtick, a link spanning lines, and a backtick line inside a tilde fence. Seven behave correctly. The eighth is advisory below.

- **[advisory, low]** `shared/resources/migrate-doc-numbering.mjs` `maskedLinks` — a fence that never closes drops its links without a warning (`blankFences` reports an unterminated fence). Not introduced by the cycle 2 fix; recorded in the gate's `recommendations.future`.

The reviewer returned in 33 seconds with an empty list. That is short for a reviewer asked to probe this much, which is why QA ran its own probes above rather than relying on the empty list.

---

## Testing Scope

### Review Methodology

- Re-review scope: files changed since gate 2 (head `2c366a494b64`; 4 files, of which the generated bundled copy was left out of the reviewed diff) — default.
- Strategy: direct tools plus one read-only Explore reviewer (return time not measured; `duration_ms` 33,299).
- CI on the PR: 6/6 checks green, but on the pushed head `2c366a494b64`. The fix commit `46c2815d8b20` is not pushed, so CI has not run on it (`HEAD_MISMATCH`). `/finalise` reads CI on the final commit.
- Step 4b: not applicable. No `SKILL.md` or step-doc fenced bash in the change set.

### Test Commands Executed

```bash
TMPDIR=/tmp node --test shared/resources/tests/migrate-doc-numbering.test.mjs shared/resources/tests/doc-links.test.mjs   # 136 pass
npm run validate -- skills/review-prd/    # ✓
npm run bundle:check                      # 128 skills, 0 problems
CI=true npm run ci:fast                   # run at this head by qa-fix: 7188 pass, 1 fail (zsh absent locally)
```

The one local failure is the `zsh` guard. `.github/workflows/test.yml:46` runs `apt-get install … zsh`, re-checked against the workflow file this cycle.

---

## Success Criteria Verification

Unchanged and re-checked: all pass. `criteria-drift.js`: clean. `changelog-cites.sh`: `cites (task 253)`. The CHANGELOG and task wording for the fetch rule were updated with the `--prune` change.

---

## Issues Found

None. HIGH: 0, MEDIUM: 0, LOW: 0.

---

## NFR Assessment

- **Performance** PASS.
- **Reliability** PASS. The behind guard reports a failed `rev-list` and a branch deleted on the remote (by anyone) as `upstream-unverified`.
- **Security** PASS. Evidence: reasoned, `probes_executed: 0`. The matched criterion ("refuses") is a repository-state guard, not an input validator.
- **Maintainability** PASS.

---

## Code Review

Reviewer reported 0 findings and read the test hunks.

**Correctness bugs (0).** **Cleanups (0).**

mutation-proven: story `prd_source` written as a constant → `253 gap 3` → covered
mutation-proven: `maskedLinks` ignores the opening fence character → `253 gap 2: maskedLinks closes a fence only on…` → covered
mutation-proven: `maskedLinks` ignores the opening fence length → same test → covered
mutation-proven: nested fence lines no longer blanked in the fence body → same test → covered
mutation-proven: `--prune` removed from the fetch → `253 gap 5 controls` → covered

All five were run this cycle after the reviewer had returned, each from a `cp` snapshot of the file, and the file was compared with the snapshot after each. `git status` under `shared/` and `skills/` was empty before and after. The cycle 1 and earlier mutations were not repeated (their code is unchanged).

Platform variance: `TMPDIR=/tmp` run, 136 pass.

---

## Recommendations

### Immediate (blocking)
None.

### Short-term
1. Warn when a fence never closes in `maskedLinks`.
2. The gate 2 advisories remain open: failed `git status` reads as clean, fetch hardening, `postScan` on blocked runs, applied-mode read-count test, prefilter.
3. `/finalise` reads CI on the final commit, which must include `46c2815d`.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
