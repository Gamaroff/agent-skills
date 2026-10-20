# Task Review Report: Task 197 - Pipeline entry docs: Phase 0, lite mode and invocation

**Reviewed:** 2026-10-20
**reviewed_blob:** 89ccb0158a5335ccbc5bedd515bb909b78a72673
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-10-20

---

## Executive Summary

The task is well-scoped: 16 audited findings, each with evidence and a fix, and a Phase 0 that re-checks
every finding before editing. One source has changed since the audit: task.201 (merged 2026-10-19) added
`--mode standard|lite|fast`, `develop.defaultMode` and the `--defaults` / `--base` / `--target` answer flags.
As a result, seven of the plan's fixes would write "there is no flag", which is now false. The link-check
criterion also assumes CI covers files it never checks.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked. This was an autonomous pipeline run (develop-next → develop-task Step 2). Every decision below follows the task's own rule that the skill is the reference.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the fixes below, which were applied)

---

## User Decisions & Clarifications

No questions were asked. The run is autonomous, and none of the findings needs a decision about what the
author intended. Each one is settled by the task's own rule, Out of Scope: "where a doc and a skill
disagree, the skill is the reference".

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking, References and Notes are present. There are no placeholders.
- OKF frontmatter: `type: task`, `description` and `tags` are present.
- Tracker: `github_issue: 600` exists (OPEN). The body link `[#600](…/issues/600)` matches. Board priority self-heal: P2.
- Card preflight: 3 blocks resolve (`sync-jira-task.js --check-card`, exit 0). `+N more` counts are Summary 3,
  Success Criteria 3 and Breaking Changes 1, which is information, not a defect.
- Sign-off is disabled in `skills-config.yaml`, so it is not checked. The Change Log is present. Currency is
  fine at `planned`, and this review adds the verdict row.

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment): `aligned`. Axes checked: What this repo produces, SKILL.md authoring, File naming,
Status lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit, Do not
(`prepass-axes.js` source: `architecture`). It raised two low notes: `markdown-link-check` is not in tech-stack.md,
because CI installs it, and SC-7 names `quick_validate.py` directly rather than `npm run validate`.

### Important

- **I-1: Seven plan fixes restate a source that has since changed.** task.201 (merged 2026-10-19, after the
  audit at `a0e135a6`) added speed modes to `shared/resources/develop-pipeline-lite-mode.md` §"Speed Modes and
  Skips": `--mode standard|lite|fast`, `develop.defaultMode`, and the `--skip` allow-list. It also added answer
  resolution to `develop-pipeline-step-0-resolve-and-prepare.md` §0d "Answer resolution", which covers
  `--defaults`, `--base` and `--target`, so Phase 0 asks only what flags and policy leave open. The fixes for
  REFERENCE-7, REFERENCE-8, REFERENCE-9, REFERENCE-15, RUNBOOKS-10, RUNBOOKS-11 and OVERVIEW-24 say "not a flag",
  "there is no flag" or "never prompted". Applied as written, they would ship a new drift that is the exact mirror
  of the one being fixed.
  - **Location:** Plan, those seven findings. Task §3 Target Architecture.
  - **Recommendation:** Say there is no `--lite` flag, and that lite mode is auto-detected. `--mode lite` can request it but is honoured only when the
    three triggers hold. `--mode fast` applies the same QA shortening regardless of the detector, gated by
    `develop.skippable`. Phase 0d asks Q1 and Q2 only where no flag (`--base`, `--target`, `--defaults`) or
    the lock answers them. Cite the two sections above, and do not restate the rule.
- **I-2: The CI link checker never sees two of the files this task changes (Step 3 check 8).** The changed-file
  filter in `.github/workflows/docs-link-check.yml` (`git diff … -- 'docs' 'examples' 'README.md' 'AGENTS.md'
  'CONTRIBUTING.md'`) excludes `skills/develop-task/README.md` and `.agents/plans/doc-drift-audit-2026-10-07.md`.
  `markdown-link-check` is not installed locally either (`node_modules/.bin` has only prettier). SC-6, which
  requires that "the CI link checker passes on every changed doc", would therefore pass vacuously for those two files.
  - **Recommendation:** Run the checker locally on every changed file, with the command and version CI uses:
    `command npx --yes markdown-link-check@3 --quiet --config .github/markdown-link-check.json <file>`. This was run once
    in review on `docs/reference/glossary.md` and exited 0. Do not widen the workflow; that is out of scope.
- **I-3: Two existing tests read docs this task edits, and the plan lists neither (Step 3 check 15).**
  `tests/restricted-access-docs.test.js` reads `docs/reference/glossary.md` and `docs/reference/troubleshooting.md`
  (vocabulary presence plus contradiction checks). `evals/shared/tests/pr-review-loop-parity.test.mjs` reads
  `docs/runbooks/story-development.md` and `docs/runbooks/task-development.md` (the §5c route count and token pairs).
  A literal search for the removed wording (`--lite`, "Optional flag that skips", "epic branch regardless") found
  no test pinning it. One comment in `shared/resources/tests/registry-tick.test.mjs:362` mentions `--lite` and asserts nothing.
  - **Recommendation:** Add both tests to the Testing Strategy and run them after Phases 2 and 3.

### Optional

- **O-1: Line anchors have drifted.** For example, quickstart-story 127 is now 128, task-development 92 is now 97, and the step-0 citations
  :373, :639-642, :666, :684-690 and :693 have all moved because task.201 grew that file. The plan already says to find each passage
  by its quoted text, and the Phase 0 re-check re-cites. No change needed beyond Phase 0.
- **O-2: `docs/runbooks/story-development.md:187` already says "Lite mode is auto-detected, not asked".** RUNBOOKS-10 is
  partly fixed in that file, but its line 249 still carries `--lite`. Phase 0 should record it as open, and the fix
  should make 187 and 249 agree.
- **O-3: SC-7's `quick_validate.py` validates `SKILL.md`, not the README.** It passes whatever the README says.
  It is harmless, so keep it as stated.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are per doc group, each with files, an action and a check. Dependencies are explicit: PR #598 merged
(verified with `gh pr view 598`: MERGED), and task.196 is merged (PR #701). The siblings task.198 and task.199 are still `planned`.
Effort is `estimated_effort_hours: 8`. For 16 one-paragraph edits plus verification that is in range, so there is no divergence finding.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (I-2, I-3 above)

- Every success criterion is a documentation or measured criterion, so finalise has a test-free kind for each.
  SC-1, SC-2 and SC-8 are documentation criteria ("file F says S"). SC-5 and SC-6 are measured by named commands. SC-4 is an explicit N/A.
- No criterion depends on merge. SC-8 edits the audit report in the PR itself.
- Pre-pass C (codebase scan): `not-implemented`. Every finding's "Doc says" wording is still present, apart from O-2.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risks name the two real ones: a fix that restates the source wrongly, which is I-1 in concrete form, and sibling conflicts.
The rollback is a revert of a docs-only merge.

---

## Summary of Recommendations

### Should Fix (Important) - 3 issues

1. Re-word the seven lite-mode and Phase 0 fixes for task.201's flags (I-1).
2. Make SC-6 a local `markdown-link-check@3` run on every changed file, since CI does not reach two of them (I-2).
3. List and run `tests/restricted-access-docs.test.js` and `evals/shared/tests/pr-review-loop-parity.test.mjs` (I-3).

### Consider (Optional) - 3 items

1. Re-cite drifted anchors in Phase 0 (O-1). 2. Make story-development 187 and 249 agree (O-2). 3. SC-7 as is (O-3).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (I-1)
- Implementation Clarity: 9/10
- Consistency: 7/10 (I-2, I-3)
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues. The three important ones were fixed in the task and plan during this review.

---

## Next Steps

Follow the plan phase by phase, starting with Phase 0's re-check, which now has the task.201 sources to re-cite against.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous via develop-task Step 2)
- **Review Date:** 2026-10-20
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.197.pipeline-entry-docs-phase-0-and-lite-mode/task.197.pipeline-entry-docs-phase-0-and-lite-mode.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Pre-pass:** B `aligned` (source `architecture`); C `not-implemented`
