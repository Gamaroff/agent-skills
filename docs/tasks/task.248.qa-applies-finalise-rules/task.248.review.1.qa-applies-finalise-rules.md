# Task Review Report: Task 248 - QA applies the finalise DoD's rules before finalise does

**Reviewed:** 2026-11-01
**reviewed_blob:** fa68e23c1200eda700eaea2b4a388a2168b39378
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 critical + important recommendations implemented — 2026-11-01

---

## Executive Summary

A well-anchored task: every file:line citation resolves, and the two properties it asserts of
existing code were run and hold. The main gap was a drift rule that would have flagged every
evidence note develop and QA append under a criterion; the owner chose to split `reworded` from
`appended`. The CHANGELOG script lacked an exit for 6d's `changelog-unknown` path and for non-task
stems, and the integration criteria named no per-PR test.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 1 question asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

### Question Point 2: Technical & Implementation

**Q1: The drift engine reads continuation lines, but develop and QA append evidence notes there
(task.234 #1, #2, #4), and the task.234 amendment sat inside one. How should appended text be treated?**
- **User Decision**: Split reworded/appended. Reworded + unapproved → MEDIUM. Appended → the gate
  records per criterion whether the note relaxes the bound; relaxes without an approver → MEDIUM.
- **Impact**: Target Architecture, Phase 2, Phase 4, Success Criteria and Risk 1 updated.

Question points 1 and 3 raised nothing that needed the owner.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References present. No placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Tracker: `github_issue: 801` exists (OPEN); body link matches; board Priority self-heal ran (P2).
- Card preflight: 3 blocks resolve (Summary +4 more, Success Criteria +5 more, Breaking Changes +3 more).
- doc-links: 1 relative link resolves.
- Sign-off: not enabled. Change Log: present and current after this review.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Anchors checked (`sed -n Np`), all resolve to the thing named: `probe-boundary-signals.mjs:82`,
`security-probe.mjs:321`, `finalise-rerun-scope.js:92`, `qa-task/SKILL.md:709` and `:1037`,
`qa-story/SKILL.md:1211` and `:1576`, `qa-fix/SKILL.md:825`, `finalise/SKILL.md:1947`,
`develop/SKILL.md:813`, `finalise-dod-ac-prompt.md:51`, `finalise-dod-security-prompt.md:50`,
`review-task/SKILL.md:1243`.

Invariants run (check 11):

- `classifyBoundaryText(<task.234 § 9>, {scope:"criteria"})` → `{"boundary":true,"matched":[{"signal":"criteria-vocabulary","phrase":"never"}]}`.
- A section with no signal word → `{"boundary":false,"matched":[]}`.
- `"must not"` control → `boundary: true`, phrase `must not`.
- The plan's approver regex `/\bapproved by\s+[^,.;\n]+/i` matches task.234's real wording
  ("amendment approved by Lorien Gamaroff at `/finalise`").

Test reach (check 18): `shared/resources/tests/*.test.mjs` is in `package.json` `test:suite`. zsh is
installed in CI (`.github/workflows/test.yml`), so the bash+zsh criterion is CI-holdable.

Call-site population (check 14): not applicable; the task enumerates no engine call sites.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important
- **I2 — `changelog-cites.sh` has no exit for 6d's `changelog-unknown` path.** 6d HALTs when
  `changelog-enforce.sh` answers neither `on` nor `off`; the script's 0/1/2/3 had no slot for it, so
  "HALT messages unchanged" could not hold. Fixed: exit 4 = unknown, mapped to the same HALT.
- **I3 — non-task stems.** 6d checks tasks only (`N` is set for `task.*`), so a story stem passes
  through today. The plan validated story/bug stems but did not say what they return. Fixed: a
  valid non-task stem exits 3.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important
- **I1 — drift over-reports evidence notes** (owner decision above).
- **I4 — integration criteria named no per-PR test.** The task said `qa-execute-snippets` holds the
  prose wiring, but that is QA's run-time snippet executor (`extractBlocks`), not a per-PR test of
  `qa-task`'s blocks. Fixed: new `qa-finalise-rules-wiring.test.mjs` runs the new fenced blocks on
  fixtures and holds the quantifier rule's single home.
- **I5 — the `boundary_reason` read-back had no mechanism.** Fixed: a fenced read-back block in each
  QA skill, exercised by the wiring test.

#### Optional
- **O1 — prefix control direction.** `(task 24)` vs `task.248` cannot false-pass anyway (`\b` between
  4 and 8 fails); the risky direction is `(task 248)` vs `task.24`. Both now tested.
- **O2 — drift fixture source.** "as it stood before the owner approved it" now names committed
  fixtures, not git history.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Risk 1 mitigation extended for appended notes. Rollback is per-phase and sound.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 7/10 (before fixes)
- Consistency: 7/10 (before fixes)
- Risk Management: 8/10

**Recommendation:** ✅ READY TO IMPLEMENT — no critical issues; all important issues fixed in the document.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2)
- **Review Date:** 2026-11-01
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.248.qa-applies-finalise-rules/task.248.qa-applies-finalise-rules.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md (always-load)
- **Pre-pass:** run inline, not as Explore subagents (they have hung in past sessions). Independence
  loss recorded: the architecture and already-implemented scans were done by the reviewer, not by an
  independent agent. Codebase scan found no existing CLI entry, `criteria-drift.js` or `changelog-cites.sh`.
