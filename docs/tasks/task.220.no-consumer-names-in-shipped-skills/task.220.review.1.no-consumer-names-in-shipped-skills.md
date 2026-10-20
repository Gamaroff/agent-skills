# Task Review Report: Task 220 - No consumer names in shipped skills

**Reviewed:** 2026-10-20
**reviewed_blob:** a315b17ff0826ecfff6691085092d96c382e819e
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-10-20

This report spells no consumer name. `<NAME>`, `<KEY>`, `<key>` (the key in lower case), `<BRAND>`
and `<HOST>` are the plan's placeholders.

---

## Executive Summary

The task is well-scoped and its plan is concrete, but the guard it specifies would have gone green on a
tree that still names the consumer. The key pattern was case-sensitive and `\b`-bounded, so it missed
the lower-case key (ten fixture file names, about 35 references to them, one fixture host) and the
`<KEY>_TYPES` / `<KEY>_RECORD` identifiers, and the guard read file contents but not file paths. All
five findings are fixed in the task and plan.

**Critical Issues:** 1 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — every fix follows from the task's own Scope ("every
tracked file under `skills/` and `shared/`"), so none needed a decision.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. Run inside `/develop-task` Step 2, autonomous: output format "Comprehensive report", Step
8.5 "apply all critical + important fixes", Step 9 promote on READY TO IMPLEMENT. Decisions taken by
the reviewer, each in the task's existing scope:

- Rename the fixtures to a `proj-` prefix (matches the `PROJ` key the task already uses; the fixture
  header says the file name encodes issue type and status, which the new prefix keeps).
- Rename `<KEY>_TYPES` / `<KEY>_RECORD` to `BOARD_TYPES` / `BOARD_RECORD`, like the plan's existing
  `<KEY>_COLUMNS` → `BOARD_COLUMNS`.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking and References are present. OKF frontmatter
has `type: task` and `description`. No placeholders. Sign-off is not enabled in `skills-config.yaml`,
so check 4a does not apply. Change Log is present and current. Tracker linkage: `github_issue: 709`
exists and the body link matches. Card preflight: 3 card blocks resolve (Summary, Success Criteria +4
more, Breaking Changes). `doc-links.js`: 2 relative links resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Architecture pre-pass axes: `prepass-axes.js` source `architecture` (7 domains, 10 axes). The pre-pass
Explore agents were not dispatched: Explore subagents have hung in this repository before, so both
passes ran inline. This review is therefore not independent of the orchestrator.

### Critical

- **C1 — The guard's key pattern passes on a tree that still names the consumer (check 11, run).**
  - **Location:** plan § Phase 1 `CONSUMER_NAMES`; plan § Phase 2 regex pass.
  - **Evidence:** ran the planned `/\b<KEY>\b/` and a letter-bounded case-insensitive alternative on
    six real shapes from the tree. Planned: 2 of 6 (`<KEY>-702`, `the <KEY> board`); it missed
    `<key>-story-in-progress.json`, `https://<key>.atlassian.net`, `const <KEY>_RECORD = {` and
    `<KEY>_TYPES`. Alternative `/(?<![a-z])<key>(?![a-z])/i`: 6 of 6, and 0 of 7 look-alikes
    (`wrapper`, `rapport`, `TRAPPED`, `bootstrapped`, `unwrapped`, `TestWrapper`, `WRAPPING`).
    Population measured with `git ls-files skills shared | xargs grep -IoniE '[a-z0-9_]*<key>[a-z0-9_]*'`
    (34 lower-case hits, 9 `<KEY>_` identifiers outside `<KEY>_COLUMNS`) and
    `git ls-files skills shared | grep -i <key>` (10 fixture files).
  - **Also:** the guard scanned contents only, so the ten tracked file names under
    `shared/resources/tests/fixtures/` could never fail it.
  - **Fix applied:** letter-bounded, case-insensitive key and brand patterns; a path scan (test 4);
    calibration samples for the three missed shapes and four more look-alikes; `git mv` of the ten
    fixtures to `proj-*.json` with a count assertion; regex pass widened to
    `<KEY>_(COLUMNS|TYPES|RECORD)`, the lower-case host and the lower-case `<key>-` prefix.

### Checks with no finding

- Check 13 (single-statement discriminator): the guard is a whole-tree population; its key is not
  shared with another rule.
- Check 15 (removed literals): `html-formats`, the profile's file name and `FORMATS_DIR` are pinned only
  by `skills/wireframe/tests/wireframe.test.js` (the two tests the plan removes) and by `CHANGELOG.md`
  history (out of scope). The renamed fixture names are pinned only by `jira-stage-fixtures.test.mjs`,
  which the regex pass rewrites; that suite discovers fixtures by `.json` suffix (floor of 8), so the
  rename keeps it populated.
- Check 18 (test reach): `tests/*.test.js` is a quoted glob in `package.json` `scripts.test`, so the new
  guard runs.
- Check 20 (site list carries its grep): the task now records both commands beside its population.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files, changes and dependencies. The exact-edit table and the count-asserting
edit script are specific enough to follow without guesswork. Effort 4 h is in line with the rubric for
four low-risk phases.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

### Important

- **I1 — Performance criterion had no measuring command (check 6.4).** "The guard adds under 2 s" is a
  wall-clock bound no per-PR test can assert, so finalise passes it only on a committed measurement
  taken on the PR's head commit with its load recorded. **Fix applied:** the criterion and the plan
  name `uptime; time command node --test tests/no-consumer-names.test.js`, recorded in the
  implementation report.
- **I2 — The red evidence would have written the names into the task's documents.** The criterion
  "red shown in the implementation report" and the plan's "paste both" would copy the guard's
  `path:line: text` output, which prints the names, into `docs/tasks/`. **Fix applied:** record the red
  as masked `path: count` lines (task § Important Clarifications, Phase 1, Success Criteria; plan
  Phase 1 and Testing Approach).

### Optional

- **O1 — The task doc spelled the brand in the profile's file name six times.** The plan used
  placeholders; the task did not. **Fix applied:** masked as `<BRAND>-hifi.md`, with a one-line pointer
  to the plan's placeholder definitions.
- **O2 — A stale figure and an orphaned backlog name.** The plan's dry-run figure (21 files, 114 lines)
  predates the widened pass; it is now labelled as such and the guard's list is named as the
  population. The roadmap's open `T38-fixtures` row names a not-yet-captured fixture under the old
  prefix; the task now says whoever captures it uses `proj-`. The roadmap itself is history and out of
  scope.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The fixture-rename risk is covered by the per-file test-count comparison, which now also covers
`jira-stage-fixtures.test.mjs`. The guard is an addition, not an exemption to a refuse-by-default
guard, so no differential oracle is required. Rollback is a revert of the merge commit.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. C1 — letter-bounded case-insensitive patterns, a path scan, ten fixture renames, widened regex pass. ✅

### Should Fix (Important) - 2 issues

1. I1 — performance bound with its measuring command. ✅
2. I2 — masked red evidence. ✅

### Consider (Optional) - 2 items

1. O1 — mask the profile file name in the task doc. ✅
2. O2 — label the stale dry-run figure; note the backlog fixture prefix. ✅

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (C1 fixed in the documents; the fix is unproven until Phase 1 calibrates it)
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** the one critical defect was in the guard's specification, not the task's intent,
and the corrected specification is calibrated by test 1 before any source edit runs.

---

## Next Steps

1. Phase 1: write the guard with the corrected patterns and path scan; show it red, masked.
2. Phase 2: fixture renames, exact edits, regex pass, empty `EXEMPT`.
3. Phase 3: wireframe profile removal.
4. Phase 4: bundle, validate, `ci:fast`, CHANGELOG.

---

## Review Metadata

- **Reviewer:** review-task (inside /develop-task Step 2)
- **Review Date:** 2026-10-20
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.220.no-consumer-names-in-shipped-skills/task.220.no-consumer-names-in-shipped-skills.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{tech-stack,coding-standards}.md` (via `prepass-axes.js`)
- **Review Duration:** ~20 minutes
