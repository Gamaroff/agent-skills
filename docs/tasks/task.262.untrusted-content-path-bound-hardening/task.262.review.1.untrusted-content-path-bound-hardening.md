# Task Review Report: Task 262 - Untrusted-content path bound hardening

**Reviewed:** 2026-11-05
**reviewed_blob:** f64f38a612413566abf4c2c975c4b40f26c3363c
**Review Depth:** Standard
**Task Status:** Planned (before review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-11-05

---

## Executive Summary

The task is well scoped and its four gaps are real. Two of the plan's claims were falsified by running them: the CRLF mechanism was misdescribed, and the proposed CRLF control could not go red. The Phase 4 block sketch also mishandled two empty-path cases. All three were fixed in the task and plan documents.

**Critical Issues:** 0 remaining (2 found, fixed) 🚨
**Important Issues:** 1 (fixed) ⚠️
**Optional Improvements:** 0 💡

**User Clarifications:** 0 questions (pipeline mode, no ambiguity needing a decision)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass: the two Explore pre-pass agents were not dispatched. The review ran the same checks inline, so no independent pre-pass review took place.

---

## User Decisions & Clarifications

None asked. The fixes follow from measurement, not preference.

---

## 1. Template Structure Compliance

**Status:** PASS

- Frontmatter has `type`, `description`, `tags`. Card preflight: 3 card blocks resolve.
- Relative links resolve (`doc-links.js`: 4 in the task, 1 in the plan).
- Change Log present and now current.

## 2. Technical Accuracy

**Status:** ISSUES FOUND, fixed

### Critical

- **Falsified invariant (check 11): the CRLF mechanism.** Section 2 said a CRLF closing fence "is read as a fence with trailing text". Run: `"```\r".match(/^\s*(`{3,}|~{3,})(.*)$/)` is `null`, as is `"```bash\r"`. The old regex never matches a CRLF fence line, so a CRLF document never opens a fence. The real effect is on the forbidding filter, which applies only outside a fence. **Fixed:** Section 2 item 1 rewritten with the measured behaviour.
- **The Phase 1 control could not go red (check 11, behavioural evidence).** The plan put a read marker *after* a closed fence. On the old regex the fence never opens, so that marker is found anyway and the control is green before and after. A mutation proof on it would have shown nothing. **Fixed:** the control now puts a line holding a marker and a forbidding sentence inside a fenced block (the old regex drops it as prose; the fixed one keeps it), plus an LF twin that stays green.

### Important

- **Phase 4 block sketch mishandles empty values (measured).** `"$REAL_DIR/"` is never the empty string, so the `""` case arm never fires: a missing parent directory fell to the HALT arm, contradicting the plan's own note. An empty `REAL_ROOT` (no `docs/` in the cwd) makes the pattern `/*`, which admits `/etc`. **Fixed:** the sketch handles both before the `case`; tests added for a missing parent (kept) and a missing `docs/` (HALT).

### Property checks run

| Check | Result |
|---|---|
| `cd "$(dirname p)" && pwd -P` on a symlinked directory | resolves to the target (`docs/link/f.md` → `.../out`), as the plan assumed |
| `cd docs && pwd -P` | resolves the root |
| Missing parent directory | `cd` fails, value empty |
| Removed-literal sweep (check 15) | the only test pinning `outside docs/` is the one the task already edits (`tests/untrusted-content-rule.test.js:353`) |
| Block population (check 20) | `git grep -l 'Bound the derived path'`: shared source, `review-story`, `review-task` SKILL.md, six bundled copies of the step-0 doc. Files Summary item 4 matches the six |

## 3. Implementation Plan Completeness

**Status:** COMPLETE. Phases are test-first, each with files, risk, dependencies and a mutation step.

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Success criteria name their record: the QA report (mutation proof, runtime) and the DoD (probe plan), so check 22 holds.
- The runtime bound (under 2 seconds) states its command; it is a measured bound.
- The test file is already reached by the runner (check 18).

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Phase 4 is rated Medium with a partial rollback. One note carried to development: the bound is a refuse-by-default guard being widened for `PRD_ROOT`, so the differential oracle should include the shapes the old block refused (the existing hostile table) re-run against the new block.

---

## Summary of Recommendations

### Must Fix (Critical) - 2, all implemented

1. Correct the CRLF mechanism in Section 2.
2. Redesign the CRLF control so it can go red.

### Should Fix (Important) - 1, implemented

1. Specify empty `REAL_DIR` / `REAL_ROOT` handling in Phase 4 and add the two tests.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (before fixes; 9/10 after)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The remaining plan is concrete and test-first. The three defects were in the plan's own evidence, and are corrected.

---

## Review Metadata

- **Reviewer:** review-task (pipeline mode, inline)
- **Review Date:** 2026-11-05
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.262.untrusted-content-path-bound-hardening/task.262.untrusted-content-path-bound-hardening.md
- **Architecture Docs Consulted:** none needed (test and skill-prose change)
