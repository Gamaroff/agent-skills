# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 4)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.4.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.4.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: CONCERNS

---

## Executive Summary

All seven cycle-3 fixes hold, and the reviewer re-checked the header strip and the case match under
bash, zsh, zsh with `extendedglob`, and sh. One MEDIUM remains: the 8a overlap recovery hint written
in cycle 3 would restore the rejected fix. There are also two LOW bugs and one test that cannot fail.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| CR3-1 stale eligible list trusted on resume | FIXED (residue: CR4-2) |
| CR3-2 could-not-run HALT left the fix staged | FIXED (residue: CR4-3) |
| CR3-3 crash-resume overclaim | FIXED |
| CR3-4 8a overlap | FIX INCORRECT → CR4-1 |
| CR3-5 CRLF / long fence | FIXED |
| CR3-6 unquoted pipe in guard | FIXED |
| CR3-7 probe coverage | FIXED (residue: CR4-4) |

---

## Review Methodology

Re-review scope: files changed since gate 3 (head aba301e5008d; 5 files) — default. One Explore
reviewer; duration 196.7 s (completion notice `duration_ms`). `SAFETY_REPROBE` clause 1 is false
(gate 3 security PASS). Route classifier: `continue (not-a-pass-gate)`.

---

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:2710` — the overlap recovery's save-and-restore brings back the rejected 8a fix.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1450` — the re-classify guard ignores the header and gives the wrong remedy for a stale list.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1546` — the `git restore --staged` result is unchecked.
- **[low, cleanup]** `shared/resources/tests/acceptance-commit-carries-5c.test.mjs:472` — the `review-unstaged` shape cannot fail on its own defect.

All anchors resolve to the quoted text at `HEAD`. Provenance: every finding is in lines this branch
added.

---

## NFR Assessment

Security PASS (reasoned, probes 0, `boundary: false`). Performance PASS. Reliability PASS.
Maintainability CONCERNS (CR4-1 recovery prose, CR4-4).

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Next Steps**: `/qa-fix` cycle 4.
