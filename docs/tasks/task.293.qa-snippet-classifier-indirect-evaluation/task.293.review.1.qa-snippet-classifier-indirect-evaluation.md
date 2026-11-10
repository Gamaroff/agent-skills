# Task Review Report: Task 293 - QA snippet classifier refuses indirect evaluation

**Reviewed:** 2026-11-10
**reviewed_blob:** eb593d77cddcd5d3a73e8df9bb9302ccce693fc5
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-11-10

---

## Executive Summary

The task is well scoped and its tests are well specified (real-bash behavioural tests, an unnamed control, a safe control, a differential run, mutation proofs). One description in Section 3 was wrong and would have misled the developer: it said `assignmentHazard` refuses `printf -v` outright, but its reasons only become a verdict through `startupHazard`, which fires only for a helper-function call. That is the actual cause of CR-1 and it is now stated. Three of the spelled-out hazards also needed state to reproduce; that is now recorded.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run; no Question Point had an open ambiguity)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None. Pipeline run (`/develop-next`, `--defaults`): output format, Step 8.5 and Step 9 were auto-answered per the pipeline defaults. The two pre-pass Explore agents were not dispatched; the architecture alignment and codebase scans were done inline (independence from a second reader was lost).

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter has `type: task`, `description`, tags.
- Tracker card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve.
- Change Log present; it was current for `planned` and now carries the review rows.
- `github_issue` is empty. **Optional:** the task has no linked tracker issue; the pipeline skips tracker steps. Not raised as a gap here, because the owner has treated issue creation as a separate step.
- `doc-links.js`: 4 relative links resolve.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

Architecture alignment (inline, against `concepts/tech-stack.md` and `coding-standards.md`): aligned; Node ESM, `node:test`, no new dependency.

#### Important

- **`assignmentHazard` described as refusing `printf -v` outright (Section 3).** `shared/resources/qa-execute-snippets.mjs:2818` returns the reason `"printf -v"`, but the reason reaches a verdict only via `startupHazard` (`:3247`), consumed at `:3391` as `calls.length > 0 && startupHazard`. A direct `printf -v 'a[$(touch W)]' x` has no helper call, so it stays `runnable`. Check 10 (outcome reachability) found this by walking the input through the branches. **Fixed:** Section 3 rewritten; Phase 2 gains an explicit item to make a direct use refuse.
- **Unverified spellings (check 11, invariant verification).** Ran every spelling under bash 5.3.20 in a scratch directory. `printf -v`, `PS4`+`set -x`, `${x@P}`, `$((x))`, `[[ $x -eq 1 ]]`, `read -r "$x"`, `test -v "$x"` reproduce. `${y:0:$x}`, `unset "$x"` and `${!x}` reproduce only when `y` is set / the array is declared (`y=abcdef`, `a=(1)`); bare, they do not. `unset -v "$x"` also reproduces. **Fixed:** recorded in Section 3 so Phase 1 tests declare the state.

#### Optional

- **Removed-literal sweep (check 15).** The plan removes no literal. The new direct-use refusal could collide with tests that pin `helper call with …` reasons (`qa-execute-snippets.test.mjs:3412, 3682, 3697, 3736, 3800`). **Fixed:** the new reason takes its own prefix; the pinned strings stay.

Other checks: file paths, line anchors (`:2818`, `:3142`, `:3391`, `:1507` area) resolve; `scripts/qa-snippets-docscan.mjs --time` exists; `CHANGELOG.md`, `qa-runnable-prose-detection.md` exist. Test file already sits in the test-runner glob (check 18). Planned temp directories are removed in `t.after` (check 28). `no-consumer-names` literals: the plan's fixtures (`W`, `a[...]`) are not consumer names (check 26).

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases are specific, risk-rated and ordered.

#### Important

- **No command for the differential slice (Success Criteria, Performance).** The criterion bounds a wall-clock time but named no command. **Fixed:** `node scripts/qa-snippets-differential.mjs --count <N> --seed <S> --atoms <set>`, values recorded in the QA report, `uptime` beside each run.

## 4. Consistency & Completeness

**Status:** CONSISTENT. Criteria name where they are recorded (the QA report); the bound criteria are measured with named commands; the control case requirement (an unnamed instance plus a safe block) satisfies the behavioural-evidence rule.

## 5. Risk & Rollback

**Status:** ADEQUATE. Over-refusal is rated High with a docs-scan comparison and a safe control. The exemption-widening rule does not apply: the task only adds refusals.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 3 (all applied)

1. Correct the `assignmentHazard`/`startupHazard` description and add the verdict-path item to Phase 2.
2. Record which spellings reproduce, with their preconditions.
3. Name the differential command in Phase 3 and the performance criterion.

### Consider (Optional) - 1 (applied)

1. Give the new refusal its own reason prefix, leaving pinned `helper call with …` strings alone.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10 (after fixes)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the misdescribed mechanism that would have sent the developer to the wrong place is corrected and the reproduction state is pinned.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; Phase 1 re-runs each spelling and drops any that does not reproduce.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline run)
- **Review Date:** 2026-11-10
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.293.qa-snippet-classifier-indirect-evaluation/task.293.qa-snippet-classifier-indirect-evaluation.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md
