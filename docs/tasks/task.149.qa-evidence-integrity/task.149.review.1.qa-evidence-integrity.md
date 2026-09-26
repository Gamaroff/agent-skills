# Task Review Report: Task 149 - QA evidence integrity: qa-task/qa-story claims that no check reads back

**Reviewed:** 2026-09-26
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-09-26

---

## Executive Summary

The task is well-specified: four independent defects, each with a reproduction, a named engine or prose
change, and a test that goes red without it. Every current-state claim still holds on `develop`
(`982cf071`, 58 commits after the task's `e04de749` baseline); two claims are stale and several line
anchors drifted by 1–5 lines. Nothing blocks implementation.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (develop-next → develop-task); decisions recorded below
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside the `develop-task` pipeline under the develop-next AUTONOMOUS RUN directive, so no
`AskUserQuestion` was issued. Each question point was resolved by the documented default:

### Question Point 1: Structure & Scope

**Q1: Should the four observations be split into four tasks (Open Question 3)?**
- **Autonomous decision**: Keep as one task — the document already records that the caller directed the grouping and that phases 1–4 are independently revertible.
- **Impact**: No split recommendation.

### Question Point 2: Technical & Implementation

**Q2: Stale claims (doc-links bundling, task.146 status) — fix in place?**
- **Autonomous decision**: Yes — both are factual corrections with one right answer, measured below.
- **Impact**: Important fixes I1, I2 applied.

### Question Point 3: Completeness & Safety

- Pre-pass C reported `not-implemented`; no scope-down question needed.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes.
- Frontmatter: `type: task`, `description`, `tags` present (OKF conformant). `github_issue: 479` resolves; body link `[#479]` matches.
- Sign-off: `sign-off` absent from `skills-config.yaml` → check skipped.
- Change Log (4b): present, one row, status `planned` → current.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — Summary, Success Criteria, Breaking Changes resolve (4 / 8 / 2 omitted → `+N more`).
- `doc-links.js --file <task>`: exit 0, 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (2 stale claims, anchor drift)
**Hallucinations Detected:** 0

Verified on `982cf071`: `qa-execute-snippets.mjs:1617` `cpSync(copyFrom, tmp, …)` and `:1757` `case "--copy":`;
`security-probe.mjs:247–251` single `is not a function` message; `probe-boundary-rule.md:139`
`entry-not-probeable` row; `doc-links.js:271–273` tracked-tree resolution, `:365` `require.main`;
`change-log.js:786` `bumpUpdated`, no `require.main`; `work-item-artifact-naming.test.js:274`
`changeLogRowDates`, `:291` §5; `coding-standards.md:69` `npm run validate`; `package.json` `"validate"`
absent from `"test"`; `finalise-fix-and-recheck.mjs:81` `RED_MARKER` matches a leading `✖`.

#### Important

- **I1 — `doc-links.js` bundling claim is stale.** §3 says it "is bundled into `finalise` only". It is
  bundled into `finalise`, `review-story` and `review-task` (`ls skills/*/references/doc-links.js`).
  - **Location:** §3 Current Architecture, *Link and timestamp checks*
  - **Recommendation:** name all three and note it reaches neither QA skill yet.
- **I2 — task.146 is no longer a planned sibling.** §10 Risk 3 and References treat task.146 as planned;
  its document reads `status: accepted` and its edits (`b6bf41d5`, `6090aea6`) are on `develop`.
  - **Location:** §10 Medium Risk 3; References
  - **Recommendation:** record task.146 as merged — its Step 3b step 2 edits are already in the base, so
    there is nothing to rebase against. task.152 and task.153 remain `planned`.

#### Optional

- **O1 — line anchors drifted 1–5 lines** (task.146/task.148 prose edits). Corrected:
  qa-task `:469`→`:474`, `:469–491`→`:474–496`, `:502`→`:506`, `:612`→`:622` (Step 4 `nx test`),
  `:661`→`:665`, `:1153`→`:1157`, `:1485`→`:1489`; qa-story `:978`→`:982`, `:1010`→`:1014`,
  `:1096`→`:1100`, `:1234`→`:1238`, `:1236`→`:1240`, `:2048`→`:2052`; create-task `:816`→`:817`.
- **O2 — state the non-git input for `doc-links.js` `state` (check 10).** When no tracked tree is
  available the engine falls back to `fs.existsSync`, so every broken link is `missing` — `untracked`
  is only reachable when `tracked` is non-null. The plan should say so, so the test pins it.
- **O3 — Step 12b's `untracked` remedy assumes staging.** Fine as written (task.152 convention); no change.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with files, checkboxes and a risk level; phases 1–4 independent, 5 depends on all.
Effort: frontmatter 16h vs rubric 13 → within 2×, no finding.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Files Summary matches the phases; every functional success criterion names its test; mutation-proving
and the §5 before/after `checked` count are Code Quality / Migration criteria. Scope: five phases, four
concerns — acknowledged by Open Question 3; kept as one task.

Check 10 (outcome reachability): `--copy-as` pass, `not exported` detail, `state` labels and
`--check-updated` exit codes are all produced by branches a named phase states — reachable.

Check 8 (path-filtered triggers): the new `tests/qa-evidence-integrity.test.js` falls inside the
`tests/*.test.js` glob in `package.json` `"test"`, which the unfiltered CI job runs. No finding.

Mermaid (6.5): no diagrams; prose is sufficient — none recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risks (§5 reader switch, Step 12b halting) each carry a measured mitigation; rollback is
per-phase revert plus `npm run bundle`. `--copy-as` containment is named as a boundary and tested.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. I1 — correct the `doc-links.js` bundling claim.
2. I2 — record task.146 as merged in Risk 3 and References.

### Consider (Optional) - 3 items

1. O1 — correct the drifted line anchors.
2. O2 — state the no-tracked-tree fallback for `state`.
3. O3 — no change.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; the two Important findings are factual corrections applied in
this review, and every current-state claim was re-measured.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; run `npm run ci:fast` after each.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2, autonomous)
- **Review Date:** 2026-09-26
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.149.qa-evidence-integrity/task.149.qa-evidence-integrity.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md` (pre-pass B: aligned)
- **Pre-pass:** B `aligned` (1 low: engine tests live in `shared/resources/tests/`, existing convention); C `not-implemented`
