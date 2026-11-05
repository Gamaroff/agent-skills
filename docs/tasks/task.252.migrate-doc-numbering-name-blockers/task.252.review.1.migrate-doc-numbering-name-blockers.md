# Task Review Report: Task 252 - migrate-doc-numbering: name every document it cannot classify

**Reviewed:** 2026-11-03
**reviewed_blob:** 3c03befe11ef96d64699b9ccf5c0e15252a9cf34
**Review Depth:** Standard
**Task Status:** planned (before review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its line references were all correct. One planned behaviour could not have worked as written: the blocker was to be raised in `verify()`, but the `already` / `post-check-failed` branch returns before `verify()` runs. The fixes below are applied.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 (pipeline run, `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the fixes applied in Step 8.5)

Pre-pass Agents B and C were not dispatched; the checks were run inline by the orchestrating session, so the independence a subagent gives is lost for this review.

---

## User Decisions & Clarifications

None asked. The pipeline auto-answers (Step 0 "Comprehensive report", Step 8.5 "apply all critical + important fixes", Step 9 "fixes complete").

---

## 1. Template Structure Compliance

**Status:** PASS

- All eleven numbered sections present, Change Log present, OKF `type: task` and `description` present.
- Tracker card preflight (`--check-card`): 3 card blocks resolve.
- Relative links: 1 link, resolves.
- Optional: no tracker issue is linked (`github_issue` absent). Not raised: sync is opt-in and this run is non-interactive.

---

## 2. Technical Accuracy

**Status:** ACCURATE, with one reachability defect (below)
**Hallucinations Detected:** 0

Verified against `shared/resources/migrate-doc-numbering.mjs`: `classify` `:211`, `discover` `:357`, the epic `continue` `:441`, the story `continue` `:459`, the `discover` return `:474`, `verify` `:1474`. The blocker array and header comment are at `:55-100`. `memIo` records `calls.readDir` as an array of paths (not a counter). `shared/resources/tests/*.test.mjs` is in the `test:suite` glob, so the test file is reached by the runner.

### Important

- **I1 — Outcome reachability (check 10): `--check` could still answer `already`.** Phase 3 had `verify()` emit the blocker and said `--check` cannot answer `already` while `M > 0`. The run function returns `already` or `post-check-failed` when `planned.fileMap.size === 0 && !planned.blockers.length` (`:2085`), before `verify()` is called (`:2154`). On a fully migrated tree whose only defect is a bad name, a `verify()`-only blocker never fires. The plan file said a blocker "already prevents" `already`, which is true only for blockers in `planned.blockers`.
  - **Fix applied:** the blocker is raised from `plan()`'s `planned.blockers`; a Phase 1 control test (nothing left to move, one bad name → `blocked`) holds it.
- **I2 — Phase 4 doc list named the wrong files.** `docs/standards/file-naming.md` and `docs/contributing/traps.md` do not contain `displaced-frontmatter` (`grep -rln "displaced-frontmatter" docs shared skills CHANGELOG.md`). The real lists are `skills/review-prd/SKILL.md:464`, `CHANGELOG.md` and the script header.
  - **Fix applied:** Phase 4 and the Files Summary name those files.
- **I3 — Phase 1 measurement could not run as written.** It asked to run the new tool on `docs/prd` "before any code lands"; the tool has no such output until Phase 3.
  - **Fix applied:** a throwaway read-only walk before code; the real tool re-run after Phase 3.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

### Important

- **I4 — False-positive surface not fully covered.** The directory-position rule was "always a blocker" with an allowlist for files only, and the existing test fixtures (`README.md`, `index.md`, `goals.md`) were not swept for a flip from exit 0 to `blocked`.
  - **Fix applied:** the allowlist covers directories; Phase 2 sweeps the existing fixtures.

### Optional

- **O1** — `N` and `M` were undefined. Fixed: `N = counts.prds + counts.epics + counts.stories`, `M = unclassified.length`.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

- The Performance criterion named a walk counter but no test, and `calls.readDir` is an array. **Fix applied (Important, check 4):** a planned unit test asserts `calls.readDir.length` equals a baseline recorded in Phase 1.
- Criteria that demand a record name their location (the QA report). OK (check 22).
- **O2** — Effort estimate 8h against the rubric: no divergence worth raising.
- Checks 11–21: not applicable (no property claimed of an existing function under new inputs; no compatibility handling; no engine call-site list; no literal removed; no replaced region; no shell-string identity key; the new test file is reached by the runner; no resume rule; no hand-written site list; no cross-skill field names).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. False positives are the named high risk, with a measured mitigation (now ordered correctly) and a clean rollback.

---

## Summary of Recommendations

### Must Fix (Critical) - 0
### Should Fix (Important) - 4 — all applied (I1–I4, plus the Performance-criterion test)
### Consider (Optional) - 2 — O1 applied; O2 no action

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (one reachability defect, fixed)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the reachability defect that would have made the main fix ineffective is corrected in the task and its plan.

---

## Review Metadata

- **Reviewer:** Claude (develop-task pipeline, Step 2)
- **Review Date:** 2026-11-03
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.252.migrate-doc-numbering-name-blockers/task.252.migrate-doc-numbering-name-blockers.md
- **Architecture Docs Consulted:** none (script-level task; checks run against the source file)
