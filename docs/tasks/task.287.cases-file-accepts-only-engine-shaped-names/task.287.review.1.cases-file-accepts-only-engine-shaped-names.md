# Task Review Report: Task 287 - cases_file accepts only engine-shaped names

**Reviewed:** 2026-11-23
**reviewed_blob:** f4916fe00c523cd4ba18c6877e263c495a0d1ac5
**Review Depth:** Standard
**Task Status:** Planned (before review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-11-23

---

## Executive Summary

The change itself is small and sound: one basename check in `resolveCasesFile`, placed after the confinement checks and before `lstat`. The draft's measured population had gone stale between 2026-11-07 and review: 31 plans are committed, not two, and one of them names a non-engine file. Nothing in the design changes. The test plan missed a second test that would have kept passing for the wrong reason.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run, `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. The run is unattended (`develop-next` → `develop-task --defaults`), so Step 8.5 auto-answered "Yes, apply all critical + important fixes". Pre-pass Agents B and C were **not dispatched**: the review ran inline, so independent review did not run for architecture alignment or the already-implemented scan. The already-implemented question was answered by reading `resolveCasesFile` directly (no shape check exists).

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter carries `type: task`, `description`, `tags`; Change Log present.
- Tracker card preflight (`--check-card`): no findings, 3 card blocks resolve.
- No `github_issue:` or `jira_key:` — a standalone registry task; tracker sync not offered in the autonomous run.
- Relative links: `doc-links.js` — 4 links resolve.

### Optional

- Frontmatter has no `github_issue`. Not a defect for a registry-sourced task.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (stale measurements, not invented detail)
**Hallucinations Detected:** 0

### Important

- **I1 — The measured population was stale.** The task says 284 files, 5 non-matching, two committed plans, "no committed plan affected". Re-measured (`git ls-files 'docs/**/*security*cases*.json'` → 355 files, 11 non-matching; `git ls-files 'docs/**/*.security.plan.json'` → 31 plans, 54 `cases_file` entries). 53 entries match the pattern. One does not: `task.304.dod.1.security.plan.json` names `task.304.dod.1.security.cases.new.json`. That file is not tracked, so the plan is already `not-reusable` as `cases-file-missing`; after this task it answers `cases-file-bad-name-shape`. **Outcome unchanged, reason changes.** The "Breaking Changes" claim "None is committed" was wrong as written.
  - **Fixed:** § Measured population, § Breaking Changes, § Testing Strategy control case and a new success criterion.
- **I2 — A second test would have kept passing for the wrong reason.** The Phase 2 list names the plan-entry fixtures (about lines 95-195) but not `casesFileAccepted: the probe engine executes hostile and legitimate names` (lines 282-310), which uses `ok.json`, `link.json` and `sub`. After the change `link.json` and `sub` are refused as `bad-name-shape`: the hostile cases stay green while no longer testing the symlink and not-a-file refusals. Its legitimate case `ok.json` would go red.
  - **Fixed:** Phase 2 bullet and the plan file's Phase 2.
- **I3 — "The check adds no filesystem call" had no planned test, and was not literally true.** `realpathSync(workDir)` runs before the check by design (an escaping name must keep answering `outside-work-dir`). The property the author means is "a bad-shape name never reaches `lstat`".
  - **Fixed:** the criterion now names that property and the test that holds it; the test is added to Phase 2.

### Optional

- **O1 — Line anchors drifted.** Measured against the tree at `6c867b9a6`: `resolveCasesFile` 179 (was 175), `casesFileAccepted` 229 (was 225), callers 407 and 625 (were 395 and 611), engine names 467-468 (were 455-456), prompt 430 (was 428), `SKILL.md` description of `cases_file` 797 (was 741; the `--cases-base` flag is at 763, not 707). The claim at each was true; the coordinate moved. **Fixed.**

### Verified, no finding

- Check 11 (invariant run): `/\.security\.cases(\.[0-9]+)?\.json$/` run over ten names: accepts `x.dod.1.security.cases.json`, `…cases.2.json`, the dotted stem `task.9.dod.2.security.cases.json`; refuses `x.json`, `x.security.cases.json.bak`, `x.security.cases.a.json`, `security.cases.json`, and a trailing-newline name (JS `$` has no newline allowance). It also accepts the hidden `.security.cases.json` and a zero-padded `…cases.02.json`; neither is an engine name, and neither widens what the engine writes. Left as is: the task's own pattern is the stated contract.
- Check 3 placement of the CHANGELOG entry: `## [Unreleased]` is line 5, the first release heading line 40; the plan's "under `[Unreleased]`" holds.
- Check 15 (removed-literal sweep): searched `cases_file` and the fixture names across tests and evals. Hits: `security-probe-plan-cases-file.test.mjs` (both groups, I2) and `read-only-agent-writes.test.mjs:676` (an assertion on an empty output, names no file). No other test pins a non-engine name.
- Check 18: the test file already exists and is reached by the runner.
- Check 25: no new member of an enumerated class.
- Check 4 (criteria): performance criterion is held by a per-run measurement recorded in the QA report (named location); mutation-proof criterion names the QA report.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases are small, risk-labelled, and name files and the check's position (after confinement, before `lstat`). The plan file gives the code and the order test.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes. Scope is one check, three phases; no split needed.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Rollback is a one-commit revert. Risk 2 (pattern narrower than a real engine name) is held by the dotted-stem test.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 4 (all applied)

1. Re-measure the population and state the task.304 plan (I1).
2. Re-point the probe-engine test's fixtures as well as the plan-entry fixtures (I2).
3. Replace "adds no filesystem call" with the testable property and its test (I3).
4. Add the corpus control (`task.304` answers `cases-file-bad-name-shape`; task 269's plans still reuse).

### Consider (Optional) - 2 (applied)

1. Refresh the line anchors (O1).
2. Note the tracker link is absent by design.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (stale population, now re-measured)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue; the four important findings were corrections to measurements and a missed test, not to the design, and all are applied.

---

## Review Metadata

- **Reviewer:** Claude (review-task, inline within develop-task pipeline)
- **Review Date:** 2026-11-23
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.287.cases-file-accepts-only-engine-shaped-names/task.287.cases-file-accepts-only-engine-shaped-names.md
- **Architecture Docs Consulted:** none (no architecture axis touched; Agent B not dispatched)
