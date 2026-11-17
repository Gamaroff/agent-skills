# Task Review Report: Task 311 - Develop pipelines check the skill they loaded and the records criteria name

**Reviewed:** 2026-11-17
**reviewed_blob:** 1dbbbfaec3c75f6004b7f2e948fe8acceb6f892a
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 Important recommendations implemented — 2026-11-17

---

## Executive Summary

The task is well-grounded: every path, line anchor and count it cites was re-measured and holds, the card preflight passes (3 blocks resolve) and its one relative link resolves. Five plan gaps would have cost a QA cycle each; all are fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️ (all fixed), plus 1 gap left open (no tracker issue linked)
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions (pipeline mode; none needed)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

**Independence note:** the architecture and codebase pre-pass subagents were not dispatched; the review ran inline, so no independent read took place.

---

## Verified (commands run)

- Anchors: `skills/develop-task/SKILL.md:181`, `develop-story/SKILL.md:188`, `develop-bug/SKILL.md:176` each read `4. **Invoke the next sub-skill**`; `git grep -n "Invoke the next sub-skill" -- 'skills/*/SKILL.md'` returns exactly these three.
- `git grep -n -i "base directory for this skill"` returns only this task's own files.
- `shared/resources/finalise-record-preflight.js` exists; `check --doc <task> --json` lists criteria 4 and 5 with `location: qa-report`, `state: location-absent`; entries carry `index`, `criterion`, `location(s)`, `state`, so the fields the plan consumes (check 21) exist.
- `readlink -f .claude/skills/<name>` resolves to `<root>/skills/<name>` for finalise, qa-task, review-pr, create-pr, create-branch, review-task, so the `realpath` classification holds.
- `sync-jira-task.js --check-card`: no problems; `doc-links.js`: 1 link resolves.
- `package.json` `test:suite` carries the glob `shared/resources/tests/*.test.mjs`: the new test files are reached (check 18).

## Issues

### Important (fixed)

1. **Shared QA-loop doc served to `develop-story`.** `develop-pipeline-step-5-6-qa-loop.md` is shared; the plan said "before the dispatch" and named neither the task-only scope nor the two dispatch forms (with / without the matrix). Fixed: Phase 2 now says task variant only, both forms, with the locating `git grep`.
2. **Criterion 4 (`qa-task` writes each record) had no planned test** (obs #222). Fixed: it is now held by the dispatch-argument test (token in `qa-task`'s args list and both task dispatches, absent from story), with a named mutation.
3. **A behaviour fix landing in prose** (obs #258): the dispatch is a `Skill(...)` line no test can run. Fixed: the preflight call is a fenced bash block the test extracts, and the plan's block now binds `TASK_FILE` and `TASK_DIR`.
4. **Tests that enumerate the classes were unnamed** (check 25): `tests/unbound-default-reads.test.js` scans `shared/resources/develop-pipeline-*.md` fences and would have failed on the plan's unbound `$TASK_DIR`; `fenced-bash-optional-file-globs`, the bundle tests and `test-runner-reach` also react. Fixed: named in Files Summary.
5. **Bundle dependency.** `finalise-record-preflight.js` has no copy in `develop-task` (`git ls-files skills/develop-task/references | grep -c finalise-record-preflight` → 0). The new call makes it a dependency; stated in Files Summary.

### Important (left open)

- **No tracker issue linked** (`github_issue` absent). Tracker sync is outward-facing and the pipeline runs without questions, so it was skipped; `/sync-github-task` can link it later.

### Optional

- At QA time a criterion naming the QA report reads `location-absent`; now stated in Phase 2 so QA does not treat it as a finding.

## Scores

Template 9, Technical accuracy 9, Plan clarity 8, Consistency 8, Risk 8 → **8/10**.

## Next Steps

Proceed to `/develop` (Step 3). Phase 1 begins with the measurement of real base directories.

---

## Review Metadata

- **Reviewer:** review-task (pipeline mode)
- **Task File:** `task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md`
