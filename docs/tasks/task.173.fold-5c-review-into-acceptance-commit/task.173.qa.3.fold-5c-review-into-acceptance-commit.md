# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 3)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.3.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.3.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: CONCERNS

---

## Executive Summary

All six cycle-2 fixes hold. The scoped review found no HIGH and no high-confidence bug. QA adopted
seven residual findings after reading each one. Two are MEDIUM: the resume probe trusts an eligible
list that nothing ties to the work item or clears, and the "check could not run" HALT leaves the fix
staged.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| CR2-1 resume HALTs on the 5c set | FIXED (residue: CR3-1, CR3-3, CR3-7) |
| CR2-2 doc-links failure restores | FIXED (residue: CR3-2, CR3-6) |
| CR2-3 8a `--hard` hint | FIXED (residue: CR3-4) |
| CR2-4 duplicate path | FIXED |
| CR2-5 re-classify drops edits | FIXED |
| CR2-6 first-backtick cut | FIXED (residue: CR3-5) |

---

## Review Methodology

Re-review scope: files changed since gate 2 (head c8733a5a4202; 5 files) — default. One Explore
reviewer; duration 229.6 s (completion notice `duration_ms`). Clause 1 of `SAFETY_REPROBE` was false,
because gate 2's security status was PASS. Clauses 2–3: no safety-axis finding.

Route classifier: `continue (not-a-pass-gate)` — route 2 declined: product-defect-signal.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:274` — the probe trusts a stale `5c-carry-eligible.txt` that names no work item.
- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1526` — the "could not run" HALT leaves the fix staged, and a resume then carries it.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1540` — "a crash resumes cleanly" overclaims; only the pause path does.
- **[low]** `skills/finalise/SKILL.md:2705` — the 8a hint restore destroys a carried edit when the path overlaps `touched`.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1458` — the close-fence match rejects CRLF and a fence of 4 or more backticks.
- **[low, cleanup]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1505` — the unquoted `|` in the placeholder guard turns it into a pipeline.
- **[low, cleanup]** `shared/resources/tests/acceptance-commit-carries-5c.test.mjs:374` — the probe test does not cover the overlay subtraction or an `MM` carried path.

All seven anchors resolve to the reviewer's quoted text at `HEAD`. Provenance: every finding is in
lines this branch added.

---

## NFR Assessment

Security PASS (reasoned, probes 0, `boundary: false`; the accept/refuse decision delegates to
`isDocsPath`). Performance PASS. Reliability CONCERNS (CR3-1, CR3-2). Maintainability PASS.

---

## Code Review

mutation-proven: six cycle-2 fix proofs (CR2-1 ×2, CR2-2, CR2-4, CR2-5, CR2-6) →
acceptance-commit-carries-5c → covered. The doc-links "exit other than 0/1" HALT branch → no-red-untested.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100 · **Next Steps**: `/qa-fix` cycle 3.
