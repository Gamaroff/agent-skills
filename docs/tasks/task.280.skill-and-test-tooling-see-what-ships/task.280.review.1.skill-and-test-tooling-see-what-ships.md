# Task Review Report: Task 280 - Skill and test tooling see what ships

**Reviewed:** 2026-11-18
**reviewed_blob:** 8b1eb4906842ac586bebe952ae8f0e4684e59a49
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT, fixed in this run (see Implementation Status)

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-11-18

---

## Executive Summary

The task's headline idea holds: three checks look at the wrong thing, and the bundle discovery gap (obs #112) is still open. But its measurements were six days old and several premises were stale or wrong. The plan's fence check would have failed five healthy files, three of the four cited defects were already fixed on `develop`, and the migration population was understated about fivefold. The review ran the claims against `develop` `ce2fed589` and corrected the task and plan in place.

**Critical Issues:** 1 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline mode; every finding resolved by measurement, not by a decision of the user's)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Pipeline mode auto-answered Step 0 (Comprehensive report), Step 8.5 (apply critical + important fixes) and Step 9 (promote). Pre-pass Agents B and C were not dispatched: both passes were done inline by the reviewer, so there is no independent second read of architecture alignment or of the "already implemented" question.

---

## 1. Template Structure Compliance

**Status:** PASS

- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no finding.
- `doc-links.js`: 1 relative link resolves.
- Frontmatter has `type: task` and `description`. No `github_issue`: the task has no linked tracker issue, so tracker steps are skipped.
- Optional: `estimated_effort_hours: 8` diverged from the work found; raised to 12 (Optional finding, applied).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (all fixed)
**Hallucinations Detected:** 0 invented technologies; 1 falsified invariant

### Critical

- **The fence-count invariant is false (check 11).** The task and plan said a check "asserts the reader's bash-block count equals the raw ` ```bash ` line count per file". Run over the 233 tracked `skills/*/SKILL.md` and `shared/resources/*.md` files, with `extractBlocks` imported from `shared/resources/qa-execute-snippets.mjs`, it fails five balanced files, because an example ` ```bash ` fence nested inside a ` ````markdown ` wrapper is a raw line but correctly not a block:
  - `shared/resources/security-review-prompt.md` extract=1 raw=2
  - `skills/create-parallel-stories/SKILL.md` extract=10 raw=14
  - `skills/mermaid-architect/SKILL.md` extract=0 raw=1
  - `skills/qa-story/SKILL.md` extract=24 raw=25
  - `skills/qa-task/SKILL.md` extract=26 raw=27
  - Evidence: a scratch `command node` script over `git ls-files` (output: `233 files; 5 mismatches`).
  - **Fix applied:** the check is a fence-balance check (a file ends with no fence open and no stray closer), implemented as one export beside `extractBlocks` that shares its line walk, with the five files as the control.

### Important

- **Stale premise, obs #47 (check 3).** `skills/create-epic/SKILL.md:109` no longer holds an apostrophe, and no file offends. The lint therefore needs a flagged/control fixture pair to be non-vacuous. Applied.
- **Stale premise, obs #48 (check 3).** The stray four-backtick fence and the hand regex in `tests/epic-numbering-retirement.test.js` were both fixed by `6b33e2985` (task.205 qa-fix cycle 6, 2026-10-15). The cited `:334` anchor no longer points at a fence line. Applied: the task states the instances are fixed and the class is not.
- **Stale premise, obs #102 (check 3).** Fixed before this task: `tests/bundle-comment-origin.test.js:126` lists tracked files only (CHANGELOG, obs #145), and `security-probe.test.mjs` builds every scratch root with `fenceRoot()` under `tmpdir()`, refusing a root inside the repository. Phase 4 and its risk row are dropped; the ten-parallel-runs criterion stays as regression evidence.
- **Population understated (check 20).** The task named one file; `git grep -nE '```(bash|sh)' -- tests ':!tests/fixtures'` returns 43 lines in 20 files, and about a dozen hold a hand-written extractor (`unbound-default-reads`, `key-lookup-single-statement`, `qa-fix-structural-move`, `worktree-root-coverage`, `fenced-bash-optional-file-globs`, plus line-state scanners). `extractBlocks` reads only the `bash` info string, so non-bash readers (`yaml`, `mermaid`, `markdown`) cannot move. A criterion of "git grep count 0" could not be met. Applied: a ratchet with a reasoned allowlist, a migration table in the QA report, and an effort estimate of 12h.
- **Wrong test location (check 3).** There is no `skills/create-skill/tests/`; the bundle tests are `tests/bundle-*.test.js`. Applied in Files Summary, Phase 3 and the plan.
- **A criterion names no record location (check 22).** "No hand-written fence regex remains in `tests/` (`git grep` count 0, recorded)" named no file. Applied: the QA report's migration table.

### Optional

- Anchors drifted: `security-probe.test.mjs:4517`/`:337`/`:1121`/`:1227`/`:1524` no longer point at the cited code (the `t131-mutant-` case is now at `:4729`). Refreshed or removed.
- Estimate raised from 8h to 12h (rubric not run; the Phase 2 population is the driver).

### Checks passed or not applicable

- Check 10 (outcome reachability): no named-function outcome claimed.
- Check 14 (call-site population): not triggered.
- Check 15 (removed literal): Phase 3 removes the `'references' not in` filter; the plan now lists the literal search to run first. The reviewer did not run it.
- Check 16 (other writers in a replaced region), 17, 19, 21, 23, 24, 26–31: not triggered.
- Check 18 (test file reached by the runner): `package.json` `test:suite` carries a `tests/*.test.js` glob; `tests/test-runner-reach.test.js` exists as the backstop.
- Check 25 (new member of an enumerated class): the new tests live in `tests/`, enumerated by `test-runner-reach.test.js`; named in the plan.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes). Phases name files, changes and controls. Phase 3 depends on nothing; Phase 2 depends on Phase 1.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes).

- The old Success Criteria ("no unbalanced fence", "count 0") now match the Phase 1 and Phase 2 designs.
- Performance criterion (within 10% of `develop`, median of five alternating runs, `uptime` beside each) states a bound and the command, recorded in the QA report: a measured criterion.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The medium-risk row for "the new checks find more than the known defects" now records the measurement; the scratch-location risk row was removed with Phase 4.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. Replace the fence-count equality with a fence-balance check. ✅ applied

### Should Fix (Important) - 6 issues

1. Re-scope the quote lint to a fixture pair. ✅
2. Record that obs #48's instances are fixed and the class is not. ✅
3. Drop Phase 4 (obs #102 already fixed). ✅
4. Measure and bound the Phase 2 population with a ratchet. ✅
5. Correct the bundle test location. ✅
6. Give the migration criterion a record location. ✅

### Consider (Optional) - 2 items

1. Refresh drifted line anchors. ✅
2. Raise the effort estimate. ✅

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after fixes)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The one critical defect was a plan that would have failed healthy files, and it is corrected with a measured control. Phase 2's size is the residual risk: the plan names the files and a ratchet to bound it, and the developer should expect to read about twenty test files.

---

## Next Steps

Task is ready for implementation. Developer should follow the plan phase by phase, run `command npm run bundle` after editing sources, and record the migration table in the QA report.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task pipeline Step 2)
- **Review Date:** 2026-11-18
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, concepts/coding-standards.md (axes via `prepass-axes.js`, source `architecture`)
- **Pre-pass:** Agents B and C not dispatched; performed inline (independent review did not run)
