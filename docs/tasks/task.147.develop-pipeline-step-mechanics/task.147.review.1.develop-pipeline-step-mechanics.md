# Task Review Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Reviewed:** 2026-09-25
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-09-25

---

## Executive Summary

The task is precise and well evidenced: every line anchor it cites resolves to the code it
names, the defects reproduce as described, and each phase carries a mutation-proved test.
One defect in the plan itself would have shipped a regression worse than the five it fixes.
Phase 4 scopes `/commit-changes`' `git add -u` to `SCOPE_PATHS`, but Step 4 derives
`SCOPE_PATHS` from **committed** changes only. On a normal run nothing is committed before
Step 4, so the scoped staging would have left every code edit out of the PR. Fixed in this
pass by widening the derivation.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 2 ⚠️ (fixed)
**Optional Improvements:** 3 💡 (2 applied, 1 recorded)

**User Clarifications:** 0 asked. Autonomous pipeline run (develop-next → develop-task Step 2); every decision below took the documented or recommended default and is recorded here.
**Implementation Readiness:** 7/10 as reviewed · **9/10** after the fixes applied below
**Recommendation:** ✅ **READY TO IMPLEMENT**

---

## User Decisions & Clarifications

No questions were put to a person. This run was dispatched by `/develop-next` under the
AUTONOMOUS RUN directive, and `develop-task` answers review-task's Step 0, 8.5 and 9 itself.
The decisions a person would otherwise have made:

**D1: How should C1 (scope derivation) be fixed?**
- **Decision**: Widen the Step 4 derivation to the union of the committed diff and the
  uncommitted tracked diff (`git diff --name-only HEAD`), and add root-level files by path.
  The task's own Forward Fix (§ 11) already names this option ("for example from
  `git diff --name-only HEAD`"). The other two options were rejected. Deriving scope from the
  plan or surface map is prose-dependent, so it cannot be tested mechanically. HALTing on
  out-of-scope tracked edits would stop every run that shares a checkout.
- **Impact**: Step 4 still sweeps another session's tracked edit. That limit is stated
  honestly in § 1 and § 10, and the shared-checkout guarantee moves to Step 8 and the merge,
  where attribution is possible.

**D2: Keep as one task, or split three ways (§ 10 Open Question 1)?**
- **Decision**: Keep it as one task. The caller asked for one document, and each phase can be
  reverted on its own.

**D3: obs #162 policy (§ 10 Open Question 3)**
- **Decision**: Keep the recommended default, an explicit inline branch.

**D4: develop-batch merge site (§ 10 Open Question 4)**
- **Decision**: Keep it in scope. It is in the enumerated population, and exempting it would
  make the test's floor a judgement call.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, plus Change Log, Progress Tracking and References.
  OKF `type: task` and `description` are present, and `github_issue: 477` resolves (OPEN).
  The body link `[#477]` matches the frontmatter.
- Card preflight: 3 card blocks resolve, no findings.
- `doc-links.js`: 2 relative links resolve.
- Sign-off: not configured (`sign-off.enabled` absent), so not checked.
- Change Log: present and current (status `planned`, one row), so no finding. This review adds
  its verdict row and a status row.

## 2. Technical Accuracy

**Status:** ACCURATE, with one hallucination-class finding (Optional)
**Hallucinations Detected:** 1 (a helper name)

Every anchor was verified by reading the cited lines, not only the path:
`step-4:117` (`tail -n +3`), `step-4:31-77` (derivation and guard),
`commit-changes/SKILL.md:51` (`git add -u  # tracked modifications (any path) — safe`),
`verify-push-state.sh:100-111` (check 3), `develop-next/SKILL.md:268` and
`develop-batch/SKILL.md:442` (`--delete-branch`), `develop-next/SKILL.md:315` (Step 4 prose
re-sync), `step-3:112,129` (Invoke `/develop`), `step-3:257-269` (the Change Log paragraph),
`step-5-6:733,924,934,972`, `step-8:166-167`, template `:116-117 / :212-213 / :242-243`,
`stall-and-cleanup-protocol.test.mjs:708-718`, and `skills/develop/SKILL.md:700,800`. All resolve.

#### Optional
- **O1: `zshAvailable()` does not exist.** § 8 names it as the zsh-skip helper, but no module
  exports it. The pattern in `probe-base-binding.test.mjs:44` is a local
  `hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0`. **Fixed**: § 8 now names the real
  probe.

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND → fixed

#### Critical
- **C1: Phase 4's scoped `git add -u` drops all uncommitted code from the Step 4 commit.**
  - **Evidence**: `develop-pipeline-step-4-create-pr.md:36-45` derives `SCOPE_PATHS` from
    `git diff --name-only "{Q2_answer}...HEAD"` and skips `dirname == "."`. The
    `task.146.implementation.1.*.md` Step 4 notes record: "nothing was committed before
    Step 4: `git diff develop...HEAD` was empty, and the derived loop drops the root-level
    `CHANGELOG.md`". task.146 named its scope by hand to get around this.
  - **Consequence**: today, the whole-tree `git add -u` in `/commit-changes` stages the code
    anyway. Phase 4 removes that, so on a default run the PR would carry only the work-item
    directory. The task's Risk 1 rated this Low probability. It is the default path.
  - **Fix applied**: Target Architecture, Phase 4, Breaking Changes, Files Summary and Risk 1
    now widen the derivation: the committed diff ∪ `git diff --name-only HEAD`, with root-level
    files kept by path. A derivation test and a matching mutation are added. The replaced
    "Pre-flight Guard reports out-of-scope tracked modifications" item became vacuous after the
    union, so it was dropped. The Expected outcome now says Step 4 still cannot attribute an
    uncommitted edit.

#### Important
- **I1: `$HEAD_BRANCH` is read at both merge sites and bound at neither.** `git push origin
  --delete ""` on an unbound name is exactly the obs #133 class ("a block that reads a name must
  bind it"). **Fixed**: bind it from `gh pr view … --json headRefName` before the merge, HALT on
  empty, and let the test's `gh` stub answer `headRefName`.

#### Optional
- **O2: develop-batch's merge block uses `<PR#>` / `<mergeStrategy>` placeholders, not `{…}`.**
  A binder that only knows `{…}` would leave them unbound, and the command would still "run"
  against the stub. **Fixed**: Phase 5 now requires the binder to fill both spellings and fail
  on either left unbound.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND → fixed

#### Important
- **I2: `develop-pipeline-resume-contract.md:194` is not a whole-tree restatement of scope mode.**
  Its `add -u` sentence is about `/develop` ("Step 3's `/develop` commits with `git add -u`"). It
  already describes Step 8's scope mode accurately ("sweeps the work-item directory"). As
  written, the Migration criterion ("the `git grep -n "add -u"` re-run shows no whole-tree
  description left") could not pass without editing a sentence about `/develop`. The task's own
  § 4 puts that out of scope. **Fixed**: the file is removed from Phase 4 and the Files Summary,
  the criterion's grep is limited to the two files that do restate scope mode, and § 3 records
  why the resume-contract line stays.

#### Optional (recorded, not applied)
- **O3: the leak check and the derivation both match paths by bare prefix.** `case "$f" in
  "${sp}"*` treats `skills/qa-fix` as covering `skills/qa-fix-foo/…`. This is pre-existing, not
  one of the five observations, and harmless for a leak check. Left for a future task.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (after the Risk 1 rewrite)

Risk 1 now says, with evidence, that it is the default case, and it names the Step 4 limit.
Risks 2 and 3 and the rollback plan are sound. Phase 4 can still be reverted on its own, and
reverting it also reverts the derivation widening, which only exists to support it.

Scope: 7 phases and 16h, across 3 SKILL.md files and 5 shared files. The task is large but
cohesive, and it records the three-way split option. Kept as one task (D2).

---

## Summary of Recommendations

### Must Fix (Critical) — 1 (applied)
1. Widen the Step 4 `SCOPE_PATHS` derivation (C1).

### Should Fix (Important) — 2 (applied)
1. Bind `HEAD_BRANCH` at both merge sites (I1).
2. Drop the resume-contract line from the prose sweep and narrow the migration criterion (I2).

### Consider (Optional) — 3
1. Name the real zsh probe (O1, applied).
2. Bind `<…>` placeholders in the merge-site test (O2, applied).
3. Prefix-match precision (O3, recorded only).

---

## Implementation Readiness Assessment

**Score:** 7/10 as reviewed · **9/10** after fixes

- Template Compliance: 10/10
- Technical Accuracy: 9/10 (every anchor resolves; one invented helper name)
- Implementation Clarity: 6/10 → 9/10 (C1 and I1)
- Consistency: 8/10 → 9/10 (I2)
- Risk Management: 6/10 → 9/10 (Risk 1 misrated)

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The one Critical finding and both Important findings are fixed in the
document, each with a test obligation. What remains is a recorded Optional finding outside the
task's observations.

---

## Next Steps

Task is ready for implementation. Implement phase by phase. Phase 4 must land the derivation
widening **in the same commit** as the scoped `git add -u`, so the two cannot be separated.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous pipeline: develop-next → develop-task Step 2)
- **Review Date:** 2026-09-25
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.147.develop-pipeline-step-mechanics/task.147.develop-pipeline-step-mechanics.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md`, `source-tree.md` (always-load set). The task touches pipeline prose and shell, with no app architecture.
- **Pre-pass:** run **inline**, not by the two Explore subagents. The review read every cited
  anchor directly, so the independent architecture and codebase passes did not run
  (independence loss recorded). Codebase status: none of the five fixes exists yet. The
  `tail -n +3` line, the bare `git add -u`, the unscoped check 3, both `--delete-branch` sites
  and the colon-inside regex are all present on `develop` at `d9988e85`.
