# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 10)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.10.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.10.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: PASS

---

## Executive Summary

This is the granted cycle that gates the cycle-9 fix (`96026663`). Both fixes hold: the reviewer ran
the new tests against the pre-fix docs and they went red. The three new findings are all low and none
is high-confidence, so the gate has no open entries.

**Overall Assessment**: PASS · **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| CR9-2 the resume probe misspells spaced paths | FIXED — the test is red on the pre-fix docs in bash and zsh |
| CR9-4 zsh echo forges a classify line | FIXED — the test is red on the pre-fix docs under zsh |
| CR9-1, CR9-3, CR8-2, CR7-1, CR6-2 (advisory) | NOT FIXED — still advisory |

---

## Review Methodology

Re-review scope: files changed since gate 9 (head c2d063bad32c; 19 files) — default. Clause 1 is
false: gate 9's security status is PASS. One Explore reviewer ran for 215.8 s (completion notice
`duration_ms`).

The engine probed `isDocsPath` with persisted cases (`task.173.qa.10.security.cases.json`). The record
is `task.173.qa.10.security.run.json`: `totals.executed` 28, 0 reproduced. Step 4b ran
`qa-execute-snippets.mjs` over both changed docs under bash and zsh and found nothing. Outside the
work item, the tree is identical to `96026663`, on which the 5b fast gate passed 5,560 with 0
failures.

---

## New Findings This Cycle

- **[low/medium, advisory]** `shared/resources/develop-pipeline-resume-contract.md:283` — membership
  is by pathspec containment. A directory entry in the eligible list would set aside every staged
  file under it. The classifier can no longer write such an entry, so this needs a hand edit. (CR10-1)
- **[low/low, advisory]** `…resume-contract.md:292` — the review-report arm still matches a C-quoted
  path against a raw glob. (CR10-2)
- **[cleanup]** `shared/resources/tests/acceptance-commit-carries-5c.test.mjs:285` — CI installs no
  zsh: `test.yml` installs only `gawk` and `mawk`, verified. Every zsh-only pin therefore runs only
  locally. (CR10-3)

All are in `recommendations.future`. The anchors are `ok`, `unchecked-text` and `unchecked-text`.

---

## NFR Assessment

Security PASS (measured, 28). Performance PASS. Reliability PASS. Maintainability PASS.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Next Steps**: Step 5c (`/review-pr`).
