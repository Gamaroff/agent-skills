# Task Review Report: Task 270 - finalise bookkeeping is mechanical

**Reviewed:** 2026-11-07
**reviewed_blob:** 765fafc1c4f5b08411b0d27da1eb1791d26ea406
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its three defects check out against the tree. The review found four plan defects and fixed all four in the task and plan files. Two would have failed at develop time (a zsh-unsafe glob and an unbound variable in the 6a block); one would have halted every accepted bug finalise run (the placeholder halt).

**Critical Issues:** 0
**Important Issues:** 4 (all fixed)
**Optional Improvements:** 1 (fixed)

**User Clarifications:** 0 questions (pipeline run, `--defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

**Independence:** the pre-pass Explore subagents (Phase 1.5) were not dispatched. The architecture-alignment and codebase passes were done inline by reading the cited files, so this review has no independent second reader.

---

## 1. Template Structure Compliance

**Status:** PASS. Frontmatter has `type`, `description`, `tags`. Change Log present. No tracker issue is linked (`github_issue` absent); no sync was offered because this is a pipeline run with no tracker.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

- **[Important] 6a staging snippet is zsh-unsafe.** The plan used a bare glob in a `for` loop. With no match, zsh aborts with `no matches found`. The 6a block's own comment records the same trap (cycle-8 CR-5), and `finalise-6a-registry-staging.test.mjs` runs its slice under zsh when installed (`/usr/bin/zsh` is present here). Fix: enumerate with `find -maxdepth 1 -name`.
- **[Important] `DOD_N` is not bound in the 6a block.** The block binds `STEM`, `DOC_KIND`, `DOD_PATH` (`SKILL.md:1888-1900`). The plan's snippet read `$DOD_N`. Fix: derive the number from `DOD_PATH`.
- **[Important] The placeholder halt would stop every accepted bug run.** `SKILL.md:1601` calls the `accepted` fill while `**CI reading 1:** {CI_ROLLUP} @ \`{CI_HEAD_1}\`` is still unfilled, and nothing later fills it by script. An unconditional "halt on any `{…}`" breaks the accepted path. The task's "Breaking Changes: None" was wrong as written. Fix: Phase 1 pins the order first; §5 restated; a test with a control.
- **[Optional] Drifted anchors.** `SKILL.md:1834/:1837` were stale; `ADD_PATHS` is at `:1910/:1913` (`grep -n ADD_PATHS skills/finalise/SKILL.md`). `:173` (`DOD_N`) is correct.

Verified true: `next_numbered` is HIGHEST+1 over the given `-name` patterns (`newest-numbered.sh`), so widening `-name "${STEM}.dod.*.md"` to `"${STEM}.dod.*"` at `:173` reaches a foreign `dod.N.security.*` file; the regex `\.dod\.([0-9]+)\.` matches `.dod.2.security.cases.1.json`. The fill script halts only on the Final Status placeholder, as claimed.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes.

- **[Important] Removed-literal sweep (check 15).** The template text "committed and pushed at 6a" and the `CI reading` lines are rewritten. Tests that read the template: `evals/shared/tests/finalise-bug-mode.test.mjs:1390` and `shared/resources/tests/finalise-gaps-path.test.mjs:636`. The task named only the first. Both now listed, plus a `git grep` the QA report must record.
- Test reach (check 18): `shared/resources/tests/*.test.mjs` is in the `test:suite` glob, so a test added there runs.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes. Success criteria: the functional ones name a test; the performance criterion states a bound (10% of `develop`, median of five alternating runs) and the measuring command with `uptime`, so finalise can grade it as a measured criterion.

---

## 5. Risk & Rollback

**Status:** ADEQUATE. The one real risk (false halts) is now concrete: the accepted-path ordering. Rollback is a revert of one phase.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (before fixes), 9/10 after
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** the three defects are real and small; every plan defect found was fixed in this pass, and the fixes are in the plan file the developer reads.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline run, `--defaults`)
- **Review Date:** 2026-11-07
- **Task File:** docs/tasks/task.270.finalise-bookkeeping-is-mechanical/task.270.finalise-bookkeeping-is-mechanical.md
- **Architecture Docs Consulted:** none read in full; `SKILL.md`, `fill-verification-complete.sh`, `newest-numbered.sh`, the bug DoD template and the 6a test were read directly
