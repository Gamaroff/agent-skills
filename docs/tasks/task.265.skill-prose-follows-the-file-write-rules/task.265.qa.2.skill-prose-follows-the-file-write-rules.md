# QA Report: Task 265 - Skill prose follows the file-write rules

**Task**: [task document](./task.265.skill-prose-follows-the-file-write-rules.md)
**Gate File**: [task.265.gate.2.skill-prose-follows-the-file-write-rules.yml](./task.265.gate.2.skill-prose-follows-the-file-write-rules.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's five findings are fixed. The independent refute pass found two further defects that QA reproduced, both in the new code: the mutation-revert recipe asserts something false, and the ratchet regex misses a spaced heredoc. Neither is a regression of a cycle 1 fix; both were present in the original commit.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| T265-QA-1 follow-up task unfiled | FIXED | task 284 filed, depends on 265; registry row, counter 285 |
| T265-QA-2 other `--body-file` sites | FIXED | cited at qa-task, qa-story, review-pr, qa-fix; the rest excluded and swept in task 284 |
| T265-QA-3 bundled copies cite a file they lack | FIXED | `mutation-proving.md` now names `shared/resources/file-write-rules.md`; develop, double-check, finalise, review-security and review-pr carry it; `bundle --check` 0 problems |
| T265-QA-4 wall time unmeasured | FIXED | `CI=true npm test`: branch 167 s, develop 163 s (+2.5%), same host (load 0.4 and 4.2). The develop run was in a scratch worktree without the `.agents/skills` symlink and exited 1, so its time is indicative |
| T265-QA-5 no CHANGELOG entry | FIXED | `changelog-cites.sh task.265` answers `cites (task 265)` |

## Testing Scope

### Review Methodology

Direct tools plus one independent read-only Explore subagent for the Step 3b diff review. Cycle 2 is the refute pass, so the whole branch diff (`origin/develop...HEAD`, 41 files, 2085 patch lines) was reviewed with the refute directive. The reviewer was dispatched 06:03:43Z and returned 06:04:40Z (duration_ms 31734).

Re-review scope: unscoped, whole branch diff (cycle 2 refute pass).

CI on aea4fed6: validate, link-check, secret-scan and shellcheck pass; test pending at the time of the read.

Step 4b ran on the one changed fenced block (`qa-fix/SKILL.md`, the `{sha}` freshness check). With `sha=aea4fed6`, which the body file carries, the block ran clean under bash and zsh. With a stale `sha=zzzz9999` it failed under both, so the check fails closed. `qa-task/SKILL.md`: 0 changed blocks.

---

## New Findings This Cycle

- **[medium]** `shared/resources/file-write-rules.md:34` — the revert recipe expects an empty `git diff --stat` after editing the line back; false when the file has an uncommitted fix, and it contradicts `mutation-proving.md` rule 1. Restated at `mutation-proving.md:56` and `skills/qa-task/SKILL.md:851`. → compare with the snapshot (T265-QA-6).
- **[medium]** `shared/resources/tests/payload-heredoc-ratchet.test.mjs:29` — `cat > f << EOF` and the quoted and backslash forms are not counted; the unbounded scan is quadratic (80,000 characters of repeated `cat`: 1.7 s). → widen and bound the pattern (T265-QA-7). The reviewer rated it low; QA reproduced both halves and gated it medium because the ratchet is the task's only enforcement.

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1 State the rule once | PASS | cited from the step 3 and step 5-6 docs |
| 2 Mutation revert recipe | CONCERNS | recipe step 4 contradicts the snapshot rule (T265-QA-6) |
| 3 Gate write and fresh-body post | PASS | cited at the four posting sites that carry the rule |
| 4 Ratchet | CONCERNS | spaced heredoc slips through (T265-QA-7) |
| 5 Bundle and sweep | PASS | 129 skills, 0 problems |

## Success Criteria Verification

All criteria PASS except the two above (recipe correctness inside the first criterion; ratchet "fails on an added heredoc" holds only for the unspaced spelling). Wall time: see Re-Review Context.

## Issues Found

### MEDIUM Severity Issues (2)

T265-QA-6 and T265-QA-7 above. **Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

## NFR Assessment

- Performance: PASS (measured)
- Reliability: PASS
- Security: PASS (evidence: reasoned, `boundary: false`; the ratchet counts lines and accepts or rejects no input)
- Maintainability: CONCERNS (T265-QA-6)

## Code Review

Independent reviewer, whole diff. Anchors checked: both resolve (`ok`).

**Correctness bugs (2):**
- [medium/medium] `shared/resources/file-write-rules.md:34` — see T265-QA-6.
- [low/medium] `shared/resources/tests/payload-heredoc-ratchet.test.mjs:29` — see T265-QA-7.

**Cleanups (0).**

Provenance: both files are new in this branch, so there is no base to compare against.

Boundary: false. Candidates considered: `payloadHeredocLines` and `diffAgainstAllowlist` (both count and report; neither accepts or rejects input).

mutation-proven: bundling fix (T265-QA-3, citation changed from fragment to dependency) → no committed test goes red; cycle 1 measured `bundle --check` clean with the gap present → no-red-untested (recommendation filed, `recommendations.future`).

## Test Commands Executed

```bash
CI=true command npm test            # branch 167 s
CI=true command npm run ci:fast     # 7944 tests, 0 failed
command npm run bundle -- --check   # 0 problems
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-fix/SKILL.md --slot sha=aea4fed6 --json
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL (close T265-QA-6 and T265-QA-7)
