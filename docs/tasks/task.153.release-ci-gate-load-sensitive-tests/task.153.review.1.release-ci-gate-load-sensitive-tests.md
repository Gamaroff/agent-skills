# Task Review Report: Task 153 - Release gate reads CI's verdict; load-sensitive tests name themselves

**Reviewed:** 2026-09-29
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-09-29

---

## Executive Summary

A precise, well-evidenced task. Every cited file exists, every wall-clock assertion the stated
enumeration finds is listed, the workflow table matches `.github/workflows/*.yml`, and the `gh run
list --commit` query shape returns the documented fields against the live API. The one substantive
drift is that task.154 (merged after this task was written) changed `release.sh`'s local test step
to `npm run test:clean-checkout`, skipped under `--dry-run`; the task and plan now say so.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 — autonomous run (develop-task Step 2 via develop-next); no question
point had an ambiguity that needed a human, so none was asked.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The four Open Questions in the task already carry recorded defaults (keep one task;
keep the local test; refuse on `pending`; mark `access-config-parity` without changing it). The
review accepts all four.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present; no placeholders.
- OKF: `type: task`, `description`, `tags` present.
- Sign-off: not configured (`sign-off` absent from `skills-config.yaml`) — not checked.
- Change Log: present, 1 row; currency fine at `planned`. A review row is added by this run.
- Tracker: `github_issue: 483`, body link `[#483](…/issues/483)` matches.
- Card preflight: `sync-jira-task.js --check-card` → 3 card blocks resolve, no findings.
- Links: `doc-links.js` → 6 links (task) and 1 link (plan) resolve.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Architecture axes (`prepass-axes.js`, source `architecture`): Runtimes, Languages, Package
management, Distribution, Test and eval harness, Infrastructure and CI, Skill-bundled assets —
aligned (Node ESM script under `scripts/`, `node:test`, `gh` already used by the maintainer flow).

Verified:

- `git grep -nE "Date\.now\(\) - [A-Za-z0-9_]+ *<|elapsed *<" -- '*.test.js' '*.test.mjs' ':!skills/*/references/*'`
  → 4 hits, the four listed (one anchor drifted by a line).
- `spawn-budget.mjs` exports `readInt` (:58), `spawnBudget` (:86), `neverRan` (:116); bundled into
  finalise, qa-story, qa-task, review-security.
- Workflow `name:`/`on.push` blocks: `Test`, `ShellCheck` unfiltered on `[main, develop]`;
  `Validate Skills`, `Docs link check` path-filtered; `Branch Policy` PR-only. Matches the task.
- `gh run list --commit 398107e6… --json workflowName,status,conclusion,event,databaseId` (gh 2.94.0)
  → 2× Test, 2× ShellCheck, 1× Release, all `completed/success` — the documented shape.
- CR-6 (`handoff-verify.test.js:1363`) reads the pid file unconditionally at `:1389`; CR-7's bounded
  poll at `:1520-1524` — as described.
- `stdout-drain-on-exit.test.mjs` and `gh-stage.test.mjs:1437` PATH-stub precedent exist.

#### Important

1. **The local test step changed under the task (task.154).** `release.sh:191-197` now runs
   `env -u CLEAN_CHECKOUT_CMD npm run test:clean-checkout` in a clean clone and skips it under
   `--dry-run`; the task cited `:185-191` and `npm test`. The wrapper in the plan wrapped the wrong
   command. **Fixed**: Current Architecture, Current Problems #1 and Target Architecture updated; the
   plan's wrapper now wraps `npm run test:clean-checkout` and keeps the dry-run arm. The obs #149
   symlink divergence is now closed by task.154, which the task records; the CI gate is still
   justified (one machine's verdict vs CI's).
2. **`--retry` passes through the pre-flight block.** The plan's prose said `--retry` does not run
   the CI block, but its snippet had no guard, and `release.sh`'s pre-flight has no `RETRY`
   condition — so as written, `--retry` would have been gated too. **Fixed**: the snippet is wrapped
   in `if [[ "$RETRY" == false ]]`, and the Target Architecture states it.

#### Optional

3. Drifted anchors: `qa-execute-snippets.test.mjs:795` → `:796`; `--retry` guard `:252-261` →
   `:257-268`; sync step `:369-386` → `:374-392`; summary `:389-400` → `:394-421`. **Fixed.**
4. The plan called `scripts/release-ci-verdict.mjs` relative to the cwd; now addressed as
   `$(dirname "$0")/release-ci-verdict.mjs`. **Fixed.**
5. Check 13 (single-statement discriminator): direction B keys on `loadSensitive(`; the only other
   hits in the pathspec are the definition (excluded) and the guard itself (excluded); bundled copies
   are excluded by `:!skills/*/references/*`. No shared key. Recorded, no change.

## 3. Implementation Plan Completeness

**Status:** COMPLETE — five phases, each with files and checkboxes; signatures, the verdict table,
the harness shape and the unit cases are concrete. `estimated_effort_hours: 16` is consistent with
5 phases / 7 functional criteria / medium risk.

## 4. Consistency & Completeness

**Status:** CONSISTENT — Files Summary matches phases; every success criterion names the test that
holds it; M1–M10 mutation proofs map to tests. The harness has no case that is green-CI + green-npm
non-dry-run, so no case reaches the CHANGELOG/commit/tag/push step — as the task states.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE — fails closed with a named escape (`--skip-ci-check`); phases revert
independently; CR-6 retries only a timeout-without-pid (M7).

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 2 (both applied)

1. Reflect task.154's `npm run test:clean-checkout` step in the task, and wrap that command.
2. Guard the CI block with `RETRY == false`.

### Consider (Optional) - 3 (2 applied, 1 recorded)

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (before fixes)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no critical issues; both Important findings fixed in
the document.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, develop-task Step 2)
- **Review Date:** 2026-09-29
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.153.release-ci-gate-load-sensitive-tests/task.153.release-ci-gate-load-sensitive-tests.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{tech-stack,coding-standards,source-tree}.md
- **Pre-pass:** Agents B/C not dispatched — both passes performed inline (architecture axes via
  `prepass-axes.js`; codebase scan: `scripts/release-ci-verdict.mjs` absent, no `loadSensitive` in
  code). Independence loss recorded.
