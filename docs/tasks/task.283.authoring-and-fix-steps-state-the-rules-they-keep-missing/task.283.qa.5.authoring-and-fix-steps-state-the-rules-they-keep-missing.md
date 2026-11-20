# QA Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Task**: [Link to task document](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Gate File**: [task.283.gate.5.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.5.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Gate Status**: CONCERNS (88/100)

---

## Executive Summary

The wall-time criterion is measured and met, the cycle 4 fix holds, and the full CI-parity run is green. One reproduced medium remains in the CHANGELOG block. This is the fifth and last gate in the budget.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 4 finding | Status | Evidence |
| -------------- | ------ | -------- |
| T283-QA-11 failed mktemp reads as a pass | ✅ FIXED | No temp files; bad-TMPDIR test passes under both shells |
| T283-QA-3 wall time unrecorded | ✅ FIXED | Table below; median within 10% |

## New Findings This Cycle

- **[medium]** `develop-pipeline-step-3-develop-loop.md:417` — `grep -c .` exits 1 on an empty region, so a valid edit aborts silently under `set -e` → T283-QA-12. Reproduced in bash and zsh.
- **[low]** a failed `git show` in a pipe is not detected (`git cat-file -e` already confirmed the object); `awk -v` escapes garble the HALT message's list only; the release-cut test asserts only the exit code. All folded into T283-QA-12.

---

## Performance Criterion (T283-QA-3)

Five alternating pairs of `CI=true` full test runs on the LAN server, timed by a script on the laptop, each with `uptime` before it. Two warm-ups ran first.

| Run | develop (s) | load before | branch (s) | load before |
| --- | --- | --- | --- | --- |
| warm-up | 750 | 0.85 2.30 2.54 | 770 | 0.21 1.02 1.92 |
| 1 | 726 | 0.19 1.18 1.84 | 732 | 0.34 1.18 1.77 |
| 2 | 731 | 8.05 3.71 2.66 | 730 | 0.12 0.98 1.64 |
| 3 | 750 | 0.26 1.27 2.04 | 1088 | 18.91 7.87 4.29 |
| 4 | 873 | 2.82 5.06 7.04 | 763 | 3.06 6.80 8.91 |
| 5 | 966 | 2.03 4.31 6.27 | 1111 | 16.89 18.14 13.67 |

**Median: develop 750 s, branch 763 s, +1.7%** (the criterion allows 10%). Other tenants (Playwright jobs from another project) loaded the shared server during pairs 3 to 5, and the laptop slept during the last pair, which could inflate a client-timed run. The median uses the third of five values on each side, so neither disturbance moves it; the two clean pairs (1 and 2) agree within 1%.

---

## Review Methodology

Re-review scope: files changed since gate 4's head (`c55855096…`; 2 files, generated copies excluded) — default.
Diff review: code review. One read-only Explore subagent, returned in 454 s.
CI-parity run on the server at `5584edb75`: 8658 pass, 0 fail, 3 skipped (exit 0).
Step 4b: the block is refused by the engine as `mutating`; committed tests execute it under bash and zsh.
`criteria-drift.js`: clean.

boundary: true. `probes_executed: 0`; the DoD will need an override.

mutation-proven: scratch-repo reproduction of T283-QA-12; the working tree was not mutated.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 88/100
**Deployment Recommendation**: CONDITIONAL — T283-QA-12 fixed (needs an owner decision, the budget is spent) or accepted as a documented limit.
