# Task Review Report: Task 269 - finalise never hand-copies agent output

**Reviewed:** 2026-11-07
**reviewed_blob:** a821422e34e890c2c2faf68f0cb284bad73c2f48
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-11-07

---

## Executive Summary

The task is well scoped and its three observations are real. The review found no invented technology and every cited path and line anchor resolved. It found design and hygiene gaps, all fixed in the document: it named generated copies as files to edit, it claimed a hash that cannot check a retyped copy, and it left `cases_file:` looking broader than it is. It also carried a whole-suite wall-clock criterion that task 285 showed cannot be held per PR.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️ (all fixed)
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions (autonomous run, `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The run is autonomous (develop-next, `--defaults`); Step 8.5 and Step 9 were auto-answered per the pipeline note. Pre-pass Explore agents were not dispatched; the architecture and codebase checks were done inline, so independent review did not run.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; OKF `type: task` and `description` present; no placeholders.
- Card preflight: 3 card blocks resolve, no findings.
- Change Log present and now current (rows added for this review).
- Sign-off: not enabled for this repository.
- No `github_issue`, so tracker linkage was not offered (autonomous run); recorded as an Optional gap below.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

### Important

- **Generated copies named as edit targets.** Files Summary and Phase 2/3 named `skills/finalise/references/security-probe.mjs` and `finalise-rerun-scope.js`. Both carry `AUTO-GENERATED — DO NOT EDIT` and differ from their sources; a bundle run would revert the edit (the failure in memory `project_bundle_drift_step_docs`). The sources are `shared/resources/security-probe.mjs`, `shared/resources/security-probe-plan.mjs` (entity refusal at `:256`, numbered cases file written at `:289`) and `shared/resources/finalise-rerun-scope.js`.
  - **Fixed:** Phases 2 and 3, Files Summary and Important Clarifications now name the sources.
- **Plan reader was not named.** The task said "its plan reader" without a file; it is `security-probe-plan.mjs`. **Fixed** as above.
- **The hash over retyped text.** Where Phase 1 finds no output file, the orchestrator retypes the block into the extractor, so a hash taken over that copy only proves the copy is self-consistent. **Fixed:** Important Clarifications now says so, and the DoD may not call it a transcription check unless a file route exists.
- **`cases_file:` scope.** The read-only security agent cannot create a file, so the field removes transcription only on a re-run or the reuse path; a first-run plan's inline cases still travel as reply text. **Fixed:** stated in Important Clarifications; control-character loss on a first run is not claimed to be closed.

### Optional

- Line anchors `skills/finalise/SKILL.md:619` and `:809` resolve to the sentences the task quotes. The `:661` and `:719` anchors in Current Architecture were not re-checked against the moved file.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- Phases are sequenced with a measured first phase (Phase 1) and a stated narrowing path if it finds no file route.
- **Removed-literal sweep (check 15).** The plan rewrites the Step 3b.1 and 3c sentences and listed no test updates. A search found pins in `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `shared/resources/tests/read-only-agent-writes.test.mjs`, `shared/resources/tests/finalise-dod-ac-kinds.test.mjs` and `shared/resources/tests/security-input-corpus.test.mjs`. **Fixed:** listed in Phase 4 with the grep to re-run.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

- **Performance criterion (check 4).** "Whole-suite wall time within 10% of `develop`" is the shape task 285 had to amend at Step 5c. **Fixed:** replaced by a per-case bound with the command, five runs, load and head commit recorded in the QA report.
- **Behaviour criteria with no test (check 4).** The reuse path (Phase 2) and the work-item-directory confinement of `cases_file:` had no success criterion or planned test. **Fixed:** two Functional criteria added, each naming a new test.
- Tests are reached by the runner: `shared/resources/tests/` and `evals/shared/tests/` are already globbed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- The two High/Medium risks have mitigations; the Medium one has an explicit narrowing path.
- Rollback covers the full and partial cases.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues, all implemented

1. Edit sources, not generated copies.
2. State the limits of the hash and of `cases_file:`.
3. Replace the wall-clock criterion with a per-case bound.
4. Add criteria and tests for the reuse path and path confinement.
5. List the tests that pin the removed sentences.

### Consider (Optional) - 1 item

1. Link a tracker issue when the project next syncs tasks (`/sync-github-task`).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium. Phase 1 decides how much of the AC half survives.

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; the important ones were fixed in the document in this review.

---

## Review Metadata

- **Reviewer:** review-task (inline, autonomous)
- **Review Date:** 2026-11-07
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.269.finalise-never-hand-copies-agent-output/task.269.finalise-never-hand-copies-agent-output.md`
- **Checks run:** doc-links (ok), card preflight (ok), source-versus-generated diff, removed-literal grep, SKILL.md anchor reads
- **Pre-pass agents:** not dispatched (inline)
