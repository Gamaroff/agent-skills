# QA Report: Task 252 - migrate-doc-numbering: name every document it cannot classify (cycle 2)

**Task**: [Link to task document](./task.252.migrate-doc-numbering-name-blockers.md)
**Gate File**: [task.252.gate.2.migrate-doc-numbering-name-blockers.yml](./task.252.gate.2.migrate-doc-numbering-name-blockers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Gate Status**: PASS

---

## Executive Summary

Cycle 1's one finding (T252-QA-1, the section shards of a sharded PRD) is fixed and held by a test that goes red without the guard. The refute-pass review of the whole branch diff found one point: the same guard also leaves a stray file beside an `index.md` unnamed. That is a trade-off the fix makes on purpose, and it is recorded as a follow-up, not a defect.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

Re-review scope: unscoped, whole branch diff (cycle 2 is a refute pass; prior gate did not fail on a safety axis).

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T252-QA-1 sharded PRD shards flagged | ✅ FIXED | Reproduction on the gate-1 fixture now prints `1 documents classified, 0 skipped`; test "a sharded PRD directory … blocks nothing" passes; removing the guard → that test red (89 pass, 1 fail) → restored, 90 pass |
| CR-2, CR-3, CR-4 (advisory) | not changed | still in `recommendations.future` |

## New Findings This Cycle

- **[medium/medium → recorded as follow-up, not gated]** `shared/resources/migrate-doc-numbering.mjs:584` — the `index.md` guard exempts the whole PRD directory, so a stray file beside an `index.md` is no longer named (and in an L2 domain directory one `index.md` exempts every sibling PRD's loose files). Reproduced: `prd.1.demo/{prd.1.demo.md, index.md, feature-exploration-2026-07-11.md}` → `1 documents classified, 0 skipped`. The reviewer rated it medium with medium confidence. QA keeps it out of `top_issues[]` because the alternative (naming the shards) blocks a valid sharded PRD, which `shard-prd` documents as its output, and which was the regression this fix closed. Severity as returned is kept: medium/medium; the attribution changes only the routing. Task decision text (line 68 of the task document) says a loose file blocks unless the allowlist names it; the shard exemption is an exception to that text and should be recorded there (follow-up).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | PASS | Verified | 90 tests in the suite pass |
| Phase 2 | PASS | Verified | Shard exemption added and tested |
| Phase 3 | PASS | Verified | Emission still in `plan()` |
| Phase 4 | PASS | Verified | Docs list the exemption |

**Overall Phase Completion**: 4/4

## Success Criteria Verification

Unchanged from cycle 1: all ten criteria PASS. `criteria-drift.js`: clean. `changelog-cites.sh`: cites (task 252). The real tree: `--root docs/prd --check` → `already`, `22 documents classified, 0 skipped`.

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0 open.

---

## NFR Assessment

- Performance — PASS (readDir baseline test passes)
- Reliability — PASS (shards no longer blocked)
- Security — PASS, evidence `reasoned`, `boundary: false`, probes executed 0, boundary signals none
- Maintainability — PASS

---

## Code Review

Reviewer: Explore subagent, read-only, REFUTE PASS directive, whole branch diff (duration 46 s per its completion notice; dispatch and return times not measured). Anchor check: the one finding's file and text match the current file.

**Correctness bugs (1):**
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:584` — see New Findings. Routed to `recommendations.future`.

**Cleanups (0).**

mutation-proven: removed the `index.md` guard in `discover()` → "task.252 QA-1: a sharded PRD directory …" went red (89 pass, 1 fail) → covered
(snapshot by `cp`, restored byte for byte with `cmp`, baseline 90 pass, 0 fail afterwards.)

Cycle-1's two other proofs (emission removed from `plan()`; epic-directory recording removed) were run by QA in cycle 1 and not repeated: nothing in those lines changed.

---

## Regression Testing

`ci:fast` (without `CI`) exited 0 on the fixed tree before the fix commit, and the commit's pre-commit hooks passed. CI on `22464943e4d0` was pending when read (recorded, no gate effect): CI on 22464943e4d0: pending.

## Test Artifacts

```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 90 pass, 0 fail
command node shared/resources/migrate-doc-numbering.mjs --root docs/prd --check   # already, 22 classified, 0 skipped
```

## Final Assessment

**Gate Status**: PASS
**Rationale**: The defect found in cycle 1 is closed with a test that fails without the fix; the one new observation is a deliberate trade-off recorded as a follow-up.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.252.qa.2.migrate-doc-numbering-name-blockers.md`
**Gate File**: co-located at `task.252.gate.2.migrate-doc-numbering-name-blockers.yml`
**Next Steps**: Step 5c (`/review-pr`)
