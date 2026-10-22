# Task Review Report: Task 229 - Secret-scan CI lane over tracked files

**Reviewed:** 2026-10-22
**reviewed_blob:** 9257aa32fa5b0312abd96e39b9db8a1bbf94dfc2
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-10-22

---

## Executive Summary

The task is accurate: every path, line anchor, binary version and release asset it cites checks
out, and its core design (copy the ShellCheck lane, add a planted-token self-check) is sound. Five
Important gaps were found and fixed in the document: the PR text scan had no mechanism, the
behaviour criteria had no per-PR test, the doc sweep missed three files, the pre-commit hook's own
gitleaks pin was unacknowledged, and the deleted-tracked-file choice was left open.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 4 questions, auto-resolved (autonomous `/develop-next` run — no operator present; each took the recommended option)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside `/develop-task --defaults` invoked by `/develop-next`. No one was present to
answer, so each question point took the recommended option, recorded here.

### Question Point 1: Structure & Scope

**Q1: The PR text scan is in scope but has no mechanism. How should it get its range and body?**
- **Decision (recommended, auto):** from step `env:` — `SECRET_SCAN_RANGE` and `SECRET_SCAN_PR_BODY` — never `${{ }}` inside `run:`; `fetch-depth: 0`; push events use `before..after`; local runs default to the merge-base with `origin/develop` or skip loudly.
- **Impact:** Target Architecture steps for the workflow and script step 6 added.

### Question Point 2: Technical & Implementation

**Q2: The script's exit paths are behaviour criteria with only manual probes. How are they held per PR?**
- **Decision (recommended, auto):** a new `evals/shared/tests/lint-secrets.test.mjs` with a stub `gitleaks` on a replaced `PATH`, the pattern `lint-shell-absent-binary.test.mjs` set for the ShellCheck twin.
- **Impact:** Phase 1 test step with seven cases; Success Criteria name the case that holds each.

**Q3: A tracked file deleted in the working tree makes `tar` fail. Filter or fail?**
- **Decision (recommended, auto):** filter it out (`[ -e "$path" ]`); a missing file holds nothing to scan and CI never has one.
- **Impact:** Target Architecture step 4.

### Question Point 3: Completeness & Safety

**Q4: The pre-commit hook pins gitleaks `v8.21.2`. Align it in this task?**
- **Decision (recommended, auto):** no — document it, name CI's pin as the authority, and add the alignment to Out of Scope and Future Improvements.
- **Impact:** Out of Scope, Risk 2 and Notes updated; `SECURITY.md` added to the doc sweep.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven numbered sections, Progress Tracking and References are present. Frontmatter carries
`type: task`, `description`, `tags`, `github_issue: 731` (issue OPEN), and the body link
`[#731](…/issues/731)` matches. No placeholders. Sign-off is not configured (`sign-off.enabled`
absent) — not checked. Change Log is present and current for `planned` (change-log enforcement
defaults to `advisory`).

Card preflight (`sync-jira-task.js --check-card`): exit 0 — Summary, Success Criteria and Breaking
Changes resolve (`+N more` counts: 4, 9, 1 — information only). Doc links: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Verified on 2026-10-22:

- `.github/workflows/` holds the six workflows named (`ls`); none mentions gitleaks.
- `ci-gate-parity.test.mjs`: `GREEN_JOBS` at :94, `LANE_TWINS` at :105, `SETUP_STEPS` at :131 — all three anchors resolve.
- `gitleaks` 8.30.1 locally (`pacman -Q gitleaks`); `dir` and `stdin` subcommands exist (`gitleaks --help`).
- Release asset `gitleaks_8.30.1_linux_x64.tar.gz` returns HTTP 200.
- **Invariant run (check 11):** a 32-character base64url plant in `const api_key = '…';` → `gitleaks dir` exit 1; the `'test-token'` plant → exit 0; the same plant through `gitleaks stdin` → exit 1. The self-check and its mutation behave as the plan claims.
- task.228 is `accepted` and merged (Phase 0 precondition holds).
- Pre-pass B (architecture alignment, axes from `prepass-axes.js`, source `architecture`): `drift` — axes checked: What this repo produces, File naming, Status lifecycle, Plan files, Registries, Validation before commit, Do not. Its findings fed I1 and I3 below.
- Pre-pass C: `not-implemented`; it surfaced the existing pre-commit hook (I4).

### Important

- **I1 — PR text scan has no mechanism.** In Scope and Phase 1 add it, but Target Architecture
  gave no range source, no `fetch-depth`, no body-passing rule and no local behaviour. A PR body
  interpolated into `run:` is script injection. **Fixed** — see Q1.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

### Important

- **I5 — Deleted tracked file left as "decide".** The plan file named the `tar` failure but chose
  nothing. **Fixed** — see Q3.

### Optional

- **O1 — Effort estimate.** `estimated_effort_hours: 4`; the rubric gives 16 (success criteria
  ≈16 → +4, plan checkboxes ≈14 → +4, files > 5 → +1, "integration" → +2, base 2 = 13 → bucket 16).
  More than 2× divergence. Not changed — Optional, and the work is mostly copied shape.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

### Important

- **I2 — Behaviour criteria had no planned per-PR test.** The skip, self-check, empty-list and
  redaction criteria need code to run; a manual probe is what failed task 111 at finalise
  (`lint-shell-absent-binary.test.mjs` exists because of it). **Fixed** — see Q2. The new file is
  reached by `npm test`'s `evals/shared/tests/*.test.mjs` glob (check 18).
- **I3 — Doc sweep incomplete.** `SECURITY.md` § "Secret scanning" documents only the pre-commit
  hook; `tech-stack.md` says "six workflows"; `coding-standards.md` § "Validation before commit"
  lists ShellCheck. **Fixed** — added to In Scope, Phase 3 and Files Summary; the lane-list sweep
  now carries its grep (check 20).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

### Important

- **I4 — Third gitleaks version unacknowledged.** `.pre-commit-config.yaml` pins `v8.21.2`,
  against Benefit 3's "one pinned version". **Fixed** — see Q4.

Rollback is a single revert and keeps the parity test consistent; the partial-rollback warning is
correct.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues (all applied)

1. Specify the PR text scan's inputs, `fetch-depth: 0` and env-only body passing (I1).
2. Add `lint-secrets.test.mjs` and name the case holding each behaviour criterion (I2).
3. Add `SECURITY.md`, `tech-stack.md`, `coding-standards.md` to the doc sweep (I3).
4. Acknowledge the pre-commit hook's pin; keep alignment out of scope (I4).
5. Filter deleted tracked files before `tar` (I5).

### Consider (Optional) - 1 item

1. Revisit `estimated_effort_hours` (O1).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; every claim verified against the tree and the binary, and the
five Important gaps are fixed in the document.

---

## Next Steps

Task is ready for implementation: follow the phases in order, run the test after Phase 1, and record
the real-binary probes and the lane's CI wall time in the implementation report.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous via develop-task Step 2)
- **Review Date:** 2026-10-22
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.229.secret-scan-ci-lane/task.229.secret-scan-ci-lane.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md
