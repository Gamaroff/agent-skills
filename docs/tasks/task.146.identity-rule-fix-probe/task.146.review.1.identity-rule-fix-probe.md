# Task Review Report: Task 146 - qa-fix: a fix to an identity rule must prove both directions

**Reviewed:** 2026-09-25
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 1 recommendation implemented — 2026-09-25 (Step 8.5, develop-task pipeline auto-answer)

---

## Executive Summary

The task is accurate and small. Every claim it makes about the current tree holds: the two Step 3.5
tables exist, the two `REFUTE PASS.` blocks are byte-identical (20 lines each), no test holds them,
and the worked example's argv exists in `uat-status.mjs`. One Important defect is in the plan: the new
refute entry is specified as a fifth bullet in a list the block introduces as *"probe these **four**
transitions"*, gated on *"emission, subscription, caching or any lifecycle"*. The edit would falsify its
own neighbour, which is the exact defect class qa-fix's documentation probe (obs #21) exists to catch.
The fix is fixed in this review. The entry becomes its own paragraph after the list, and the test
gains an assertion that holds the count.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 1 question, resolved autonomously (develop-task pipeline, no operator)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline, dispatched by `/develop-next` in an autonomous
run. No operator could answer the question points, so each question below was resolved with its
recommended option. The rationale is recorded.

### Question Point 1: Structure & Scope

No questions. The structure is complete, nothing is left as a placeholder and the scope is explicit.

### Question Point 2: Technical & Implementation

**Q1: Where does the Identity rules entry go in the refute directive — a fifth bullet after *Reconnect* (as written), or its own paragraph after the four-transition list?**
- **Decision (autonomous, recommended option)**: its own paragraph between the transition list and
  *Review the COMBINATION*.
- **Impact**: the entry is no longer gated on a lifecycle trigger it does not share, *"these four"*
  stays true, and the test holds that fact.

### Question Point 3: Completeness & Safety

No questions. Pre-pass C found nothing already implemented.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections plus Progress Tracking, References and Notes are present. No placeholders.
- Frontmatter: `type: task`, `description`, `tags`, `status: planned`, `priority: Medium`,
  `estimated_effort_hours: 8`, `github_issue: 474`. OKF-conformant.
- Sign-off: `sign-off` is not configured in `skills-config.yaml`, so the check is skipped.
- Change Log: present, one row. It is current for `status: planned`.
- Tracker: issue #474 is `OPEN`. The body link `[#474](…/issues/474)` matches the frontmatter.
  `set-github-project-priority.sh 474` set the board Priority to P2.
- Card preflight (`sync-jira-task.js --check-card`): exit 0. Three blocks resolve, with `+N more` on
  Summary (4), Success Criteria (4) and Breaking Changes (1). These are information, not defects.
- Relative links (`doc-links.js`): 2 of 2 resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE (one plan defect, below)
**Hallucinations Detected:** 0

Verified against the tree at `7aa72e5e`:

| Claim | Evidence |
| --- | --- |
| qa-fix Step 3.5 has a lifecycle table and a documentation table (obs #21), then *Review the combination* and *Weight by surface* | `skills/qa-fix/SKILL.md:607-655` |
| qa-task and qa-story carry the same 20-line `REFUTE PASS.` block | extracted fence-to-fence from `skills/qa-task/SKILL.md:427` and `skills/qa-story/SKILL.md:935`; `cmp` reports them identical |
| No test references `REFUTE PASS` or the Step 3.5 tables | `grep -rln 'REFUTE PASS' --include='*.js' --include='*.mjs' .` finds only `shared/resources/tests/setup-consumer-skill-profiles.test.mjs`, which is unrelated |
| `tests/*.test.js` is inside the `npm test` glob | `package.json` `test` script |
| The worked example's argv (`--set … --note`, `--accept … --note`) exists | `skills/qa-next/scripts/uat-status.mjs:102-109`, `986-996`, `1079-1080` |
| `code-review-prompt.md` is untouched and out of scope | it restates "the four transitions" at line 236. That is unaffected, because the fix keeps the list at four |

**Check 6 (same-class inventory, obs #103):** present. The task names both existing tables and states
that the new one *sits beside* them, with a justification.

**Check 10 (outcome reachability, obs #168):** no criterion names a function outside the task. The
only stated outcome is *"the test fails when …"*, which the planned test produces. That makes it
reachable by construction.

### Important

- **The new refute entry falsifies its own neighbour.** Target Architecture and Phase 2 place
  `• Identity rules` *after the `• Reconnect` bullet*. The paragraph that introduces that list reads:
  *"For every change that touches emission, subscription, caching or any lifecycle, probe these
  **four** transitions explicitly"* (`skills/qa-task/SKILL.md:432`, `skills/qa-story/SKILL.md:940`).
  A fifth bullet makes "four" false. It also puts the identity-rule probe under a lifecycle trigger:
  a normaliser or equality-predicate change that touches no lifecycle would not reach it, which
  defeats the probe. And the test as planned would not notice, because it checks only presence and
  parity.
  - **Location:** § 3 Target Architecture; § 6 Phase 2; § 8 Unit Tests; § 9 Functional; plan Phase 2.
  - **Recommendation (applied):** make the entry its own paragraph after the transition list and
    before *Review the COMBINATION*. Add a test assertion that the list under *"these four"* still
    holds exactly four `•` bullets in each block. That is the mutation the planned test would miss.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files and checkboxes. The plan gives exact anchors and draft text. It says to
apply Phase 2 with a single split/join script so the two files cannot diverge. It names the three
mutation proofs. Effort is `8h` for a prose, one-test task, which is generous. The difference from
the rubric is under 2×, so it is not flagged.

### Optional

- The prose in Target Architecture (a one-line bullet) and in the plan's Phase 2 snippet (three
  aligned lines) do not match. They agree once the fix above lands, because both now point at the
  plan's paragraph text.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after the fix)

The Files Summary matches the phases, and the testing strategy covers every changed file. The
success criteria are measurable. Four phases in one skill family is well inside one sprint, so
there is no split signal.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The work is advisory prose plus one test, so it has no runtime surface. The rollback is a revert.
The medium risk the task names (a trigger read too widely) is mitigated by *Weight by surface*.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 1 issue

1. Make the refute Identity rules entry its own paragraph outside the four-transition list, and add
   a count assertion to the test. **Applied.**

### Consider (Optional) - 1 item

1. Align the Target Architecture bullet text with the plan's snippet. **Resolved** by the fix above.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** There are no Critical findings. The one Important finding is fixed in the task
and plan by this review, and every current-state claim was verified against the tree.

---

## Next Steps

Task is ready for implementation. Follow the plan phase by phase, with Phase 2 as a single scripted
edit to both files.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task pipeline Step 2)
- **Review Date:** 2026-09-25
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` (via pre-pass B)
- **Pre-pass:** B `alignment: aligned`; C `implementation_status: not-implemented` (both dispatched 08:37, returned within about a minute)
