# Task Review Report: Task 187 - Review checks for plan shapes

**Reviewed:** 2026-10-07
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development after fixes)
**Overall Assessment:** GOOD — two Critical and six Important findings, all fixed in the document

> **Implementation Status**: ✅ All 16 recommendations implemented — 2026-10-07

---

## Executive Summary

The task's measured figures held up: every line anchor, check count, test-runner count and the
reach-guard population (231 tracked, 4 unreached bundled copies) re-measured exactly. The defects were
in what the new checks would *say*: checks 15, 16 and 18 named this repository's layout although
review-task ships to consumer projects, and two new check-4 items would have falsified that check's
"Three shapes" intro. Both are fixed, along with grep scopes, a hub-document dependency risk, and
criteria that claimed more than the planned test asserts.

**Critical Issues:** 2 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 8 💡

**User Clarifications:** 0 questions asked — pipeline mode (develop-task Step 2); every finding had a
fix that needed no author decision
**Implementation Readiness:** 9/10 after fixes (6/10 before)
**Recommendation:** READY TO IMPLEMENT (after the fixes applied in Step 8.5; NEEDS REVISION before them)

---

## User Decisions & Clarifications

No questions were asked. The review ran inside `/develop-task` Step 2 with the pipeline's autonomous
defaults (comprehensive report; apply all critical + important fixes; promote on READY). Each finding
below has a single fix that changes wording or test scope, not the task's intent.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; unnumbered Change Log, Progress Tracking, References, Notes.
- No placeholders. Frontmatter carries `type: task`, `description`, `tags`, `github_issue: 586`.
- Sign-off: not configured (`skills-config.yaml` has no `sign-off` key) — not checked.
- Change Log: present, one row, consistent with `status: planned` — current.
- Tracker: issue #586 exists (OPEN); body link `[#586](…/issues/586)` matches frontmatter.
- Card preflight: 3 card blocks resolve.
- Relative links: `doc-links.js` — 1 link resolves in the task doc, 1 in the plan.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Pre-pass: one independent general-purpose reviewer (not the author) re-measured § 3 against `HEAD`
`5b617f00`. Architecture axes from `prepass-axes.js` (`source: architecture`). Confirmed: every
`file:line` anchor; 8 Detection Rules; 4 bullets each in Step 6 check 2 and Step 7 Risk
Identification; review-story has no risk step; 14 `bash` entries and 31 globs in `scripts.test`, none
using `**`, braces or `?`; `eval:all` runs scenario directories, not `*.test.*`; the
`#step-3-check-each-acceptance-criterion` anchor exists (`shared/resources/finalise-dod-ac-prompt.md:31`);
task.178 edits only the input-resolution blocks (review-task `:99`, `:134`; review-story `:189`).

### Critical

- **C1 — Check 4's intro would become false.** `skills/review-task/SKILL.md:1121` says "Three shapes
  reach that point". Adding the #258 / #279 items under it falsifies the count, and § 4 forbade
  rewording. **Fix applied:** the two items go after the post-merge item under their own lead-in; no
  "N kinds" phrase anywhere in check 4 (`tests/lib/count-of-kinds.js` scans all of it).
- **C2 — Checks 15, 16, 18 assumed this repository's layout.** review-task ships to consumers; naming
  `skills/*/SKILL.md`, `shared/resources/*.md`, `package.json scripts.test` would raise false findings
  there. **Fix applied:** consumer-neutral wording, this repository's paths only in the worked example,
  and a "not applicable" line per check in the shape of check 14's `no-roots` rule.

### Important

- **I3 — Check 19 could bundle a hub document.** A bare `shared/resources/develop-pipeline-resume-contract.md`
  literal is a dependency on its whole closure. **Fix applied:** bare filename or `#fragment` only;
  Phase 3 now confirms closure ±0 (review-task) and +1 (review-story).
- **I4 — Check 15's grep missed the `*.test.sh` suites.** **Fix applied:** "every tracked test file"
  (`git grep -n '<literal>' -- '*.test.*'` plus fixture directories).
- **I5 — Check 16 searched `.md` only.** Code also writes into regions. **Fix applied:** every file
  type in the project's skill and resource sources.
- **I8 — "review-task check 4" had no link anchor.** **Fix applied:**
  `../review-task/SKILL.md#step-6-consistency-and-completeness-review`, as `sync-jira-story/SKILL.md:360`
  does; the no-count property reuses `tests/lib/count-of-kinds.js`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- Phases are explicit with checkboxes and files; dependencies stated (Phase 3 on 1–2, Phase 5 on 1–3).
- Optional 12: the plan's "fragment link is a citation" wording corrected — `finalise-dod-ac-prompt.md`
  reaches no other file, so it bundles alone either way; non-path link text now specified.
- Optional 14: Phase 2 restated create-task's control-case rule while saying it cited it — now cites
  `skills/create-task/SKILL.md:894` and adds only the review action.
- Effort: `estimated_effort_hours: 16`; rubric recomputed at 13h → 16 bucket. No divergence finding.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

- **I6 — Criteria claimed more than the test asserts** ("trigger, worked example"). **Fix applied:**
  the presence test now asserts `Trigger:` and `Worked example:` lines per check.
- **I7 — Deliverables with no criterion:** review-story Step 5 Testing Coverage items, the review-story
  guard-exemption item, Detection Rules lines, Questions to Collect lines. **Fix applied:** criteria
  added, each held by `tests/review-plan-shape-checks.test.js`.
- Check 4 classification of every criterion: all are behaviour criteria naming the planned test that
  holds them, or the Code Quality commands; none is post-merge; the Performance criterion is an
  explicit "not applicable" line.
- Optional 13: the reach-guard criterion was worded as a report entry — now the in-file `reach()` case.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Medium risks (review-story shape differences; overlap with task.178) have mitigations; the task.178
  overlap is confirmed absent.
- Rollback: revert + bundle + test, partial per-check removal, forward-fix triggers — actionable.

---

## Optional findings applied

9. § 3 now says only checks 11–14 have `❌ … (check N)` lines. 10. § 3 now says the siblings pin item
text and severity, pattern lines for 11 and 14. 11. Check 16's worked example now names task.155 (the
incident). 15. review-story's check is "Acceptance Criteria Classification". 16. The Step 3/4/5 Issues
to Flag lines gain the new checks (allowed by § 4 as an addition).

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes)

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every figure re-measured; both Critical findings were wording-level and are fixed;
the remaining risk is implementation detail the presence test pins.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2), with one independent general-purpose pre-pass agent
- **Review Date:** 2026-10-07
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.187.review-plan-shape-checks/task.187.review-plan-shape-checks.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md (via prepass-axes.js)
