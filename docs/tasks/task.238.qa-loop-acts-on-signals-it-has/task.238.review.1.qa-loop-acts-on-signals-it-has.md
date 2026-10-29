# Task Review Report: Task 238 - QA loop acts on the signals it already has

**Reviewed:** 2026-10-28
**reviewed_blob:** 0b795f4a934f9328a8857160099c27e196ebd057
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

> **Implementation Status**: ✅ All 18 recommendations (14 Important, 4 Optional) implemented — 2026-10-28

The task is well-sourced: every line anchor but one resolves, the observations are cited, and each of the four deliverables is scoped to a section that exists. The weak points are where the plan meets code it doesn't change. Three stated outcomes can't be reached as planned: a base-red CI lane is "cleared" by a branch it never reaches, the CI read happens before the slow lanes finish, and the Bitbucket arm sits behind a GitHub-only PR check. The coverage→5b route also misses two consumers, qa-fix's priority ladder and the resume contract.

**Critical Issues:** 0 🚨
**Important Issues:** 14 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 6 questions asked and answered (2 setup, 4 review)
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

No structural questions. The template is compliant, the card preflight is clean and the links resolve.

### Question Point 2: Technical & Implementation

**Q1: How should a CI lane that is red on the PR base be handled?**
- **User Decision**: QA checks base first. Before raising a CI finding, qa-task/qa-story read the same check on the PR base's latest run. If it is red there too, record it as pre-existing (`recommendations.future`), not as a `top_issue`. This mirrors Step 3b item 5b.
- **Impact**: Target Architecture, Phase 2, the § 3 severity clarification and Risk 1 change. The claim that 5b step 0a clears a base-red CI lane is removed.

**Q2: When should the CI read happen?**
- **User Decision**: At gate writing (Step 10), once, with no wait.
- **Impact**: Phase 2 moves the read from the PR Existence Check to Step 10. The step-5-6 CI paragraph names Step 10.

**Q3: What should happen to the Bitbucket arm?**
- **User Decision**: Add Bitbucket fully. That means a VCS-branched PR Existence Check plus the BB pipelines read, with `resolve-platform.sh` and `bitbucket-auth.sh` sourced at that point, and a Bitbucket fixture test.
- **Impact**: Phase 2 grows. Scope, Files Summary, Testing Strategy and the effort estimate change.

**Q4: How should the coverage-route gaps be handled (the qa-fix ladder and the resume contract)?**
- **User Decision**: Add both to scope. qa-fix Step 2 gains a row for pr-review coverage findings at any severity. The resume contract's `CONCERNS` row splits so that an open coverage finding re-enters 5b. "Open" means not marked `provenance: pre-existing`.
- **Impact**: Phase 3 grows to cover `skills/qa-fix/SKILL.md` and `shared/resources/develop-pipeline-resume-contract.md`.

### Question Point 3: Completeness & Safety

Not asked. The remaining items each have one sensible fix, recorded below as recommendations.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, plus Change Log, Progress Tracking and References. There are no placeholders.
- The OKF frontmatter is complete (`type: task`, `description`, `tags`). The filename follows `task.{N}.{name}.md`.
- GitHub #768 is open and the body link matches `github_issue: 768`.
- Card preflight: exit 0, 3 blocks resolve. Informational counts: Summary +4 more, Success Criteria +7 more, Breaking Changes +2 more.
- `doc-links.js`: task and plan, 1 relative link each, both resolve.
- Sign-off is not enabled. The Change Log is present and current for `planned`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0. Two claims about existing code were false (I7, I12).

**Pre-pass B** (architecture): `aligned`, `source: architecture`. Axes checked: What this repo produces, Cross-skill resources, Platform branching, Plan files, Validation before commit, Do not. It raised four low findings: the Bitbucket read precedes the guarded resolver (now I3); gh/jq are not listed in tech-stack.md, but finalise already relies on them; develop-bug's skill-owned reference is hand-edited, which is correct; the new eval-layer tests are not in the tech-stack map.
**Pre-pass C** (codebase): `not-implemented`. Nothing the task delivers exists yet.

### Important

- **I1. A base-red CI lane can't be cleared the way the task says (check 10).** § 3 and Risk 1 say a `medium` CI finding goes to 5b, "where obs #14's pre-existing branch can clear it". But that branch lives in 5b step 0a, and 0a classifies the **local fast gate**, not a CI lane. It is also reached only "when step 0 found changes" (`develop-pipeline-step-5-6-qa-loop.md:1192`). A finding qa-fix can't fix produces no change, so step 0's no-change HALT fires first. *Per Q1:* qa-task/qa-story check the base's run of the same check before raising the finding.
- **I2. A read at the PR Existence Check usually sees the Test lane as pending (check 10).** 5a starts right after 5b's push. Measured on task.237 with `git log --format='%ad %s' 49a69f42^2`: cycle-2 fix at 18:36:55, cycle-3 gate at 18:41:46, about 5 minutes. CI `Test` took 20:30:11→20:35:00 (`gh run list --limit 8`). task.236's red was in Test, so the read as planned would have missed the incident it cites. *Per Q2:* read at Step 10.
- **I3. The Bitbucket arm can't be reached (check 10).** Both PR Existence Checks are an unconditional `gh pr view` (`skills/qa-task/SKILL.md:128`; `skills/qa-story/SKILL.md` § PR Existence Check). On Bitbucket they HALT there, and `BB_WORKSPACE`/`BB_REPO`/auth are resolved only at Step 14 (`qa-task:1673`). *Per Q3:* add a VCS branch to the PR Existence Check and source the resolver and auth there, guarded.
- **I4. "Ingester scope is already right" covers only the ingester (check 21).** The ingester does carry `medium`. But qa-fix Step 2's priority ladder (`skills/qa-fix/SKILL.md:467-478`) has rows only for **High** `top_issues` and for bug reports by severity, and Step 1b says to treat a `high` pr-review finding as a HIGH top_issue (`:405`). A medium or low coverage finding has no row, so qa-fix may change nothing and 5b step 0 HALTs. *Per Q4:* add a row.
- **I5. A resume after a coverage `CONCERNS` goes to Step 7 (check 19).** `develop-pipeline-resume-contract.md:554` maps `**PR Review**` `APPROVE` or `CONCERNS` → "go to Step 7". A run that dies between a coverage `CONCERNS` and 5b's exit skips the fix on resume. The plan lists no reconstruction states for the new route. *Per Q4:* split the row. Then list the states it must hold in: died before 5b started, died inside 5b, and 5b exited with the counter incremented.
- **I6. "Open" coverage finding is undefined (check 21).** review-pr's Machine-Readable Findings carry no status field (`skills/review-pr/SKILL.md:781-795`). The only marker is `provenance: pre-existing` (`:692`). SC-4 says "open"; the plan's row text drops it. Define "open" as an entry without `provenance: pre-existing`, and use the word the same way in both documents.
- **I7. The plan's CI jq does not match finalise's bucketing (check 11).** The plan says to reuse `/finalise`'s rules, but its `select` omits `ACTION_REQUIRED`, which finalise buckets as FAILURE (`skills/finalise/SKILL.md:950-951`). A check finalise would fail on would be missed by QA. Include it, and pin it with a fixture.
- **I12. The plan names the wrong test to extend.** It says `fast-gate-precondition.test.mjs` "already parses the 0a block". That test reads only `develop-pipeline-step-3-develop-loop.md` (`LOOP_DOC`, line 56). Use the existing extractors instead: `shared/resources/tests/lib/executed-prose.mjs` (`blockBy`) or `qa-execute-snippets.mjs` (`extractBlocks`), and put the new assertions in a sibling test.
- **I14. The GitHub arm never compares the PR head to the head being judged.** The plan's jq outputs `headRefOid` but maps the result whatever it is. Only the Bitbucket arm checks for a mismatch. Apply the same rule to both: map a result only when `headRefOid == $(git rev-parse HEAD)`, and record anything else as informational.

### Optional

- **O1.** The anchor `develop-pipeline-step-5-6-qa-loop.md:1106` (Technical Background) points at a blank line. The paragraph starts at `:1107`.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I8. The pre-existing-red check only tests "exit non-zero on base", not "fails the same way".** The block records `BASE_EXIT` only. A fresh `git worktree add` has no `node_modules` (prettier is a devDependency, and `ci:fast` runs `prettier --check`) and no gitignored `.agents/skills` symlink. So a base run fails for environmental reasons, reads as pre-existing, and the step pushes a red tree. Fix: compare the **failing test names/assertions** from the head log with those from the base log. Treat a base failure with no matching failing test (module-not-found, command-not-found) as `BASE_CHECK=unavailable`, which goes to the attributable path.
- **I9. The plan doesn't list the tests that pin the literals it changes (check 15).** `git grep -nF` over `*.test.*`:
  - `evals/shared/tests/pr-review-loop-parity.test.mjs:739`: matches the invocation heading. The new heading keeps that prefix, so it still matches, but the test should pin the new clause.
  - `:763` and `:768` (test "APPROVE and CONCERNS exit the loop, and CONCERNS does not block"): these would still pass, so the test now asserts the opposite of the new rule. Rewrite it to carry the coverage condition. It may be the natural home for SC-4 instead of a new file.
  - `shared/resources/tests/qa-loop-stage-before-gate.test.mjs:58` locates 0a by `<fastGateCommand> > "$FIX_LOG"`. Keep that literal.
  - `evals/shared/tests/qa-re-review-scope-parity.test.mjs:1326` pins 0a's red-retry exit.
- **I10. The gated-cleanup site list has no search behind it (check 20).** Searching for `[A-Z_]+_LOG="?\.claude/state` and `rm -f "\$[A-Z_]*LOG"` in the sources also finds `skills/develop/SKILL.md:624`/`:641` (its own `TEST_LOG` block and prose cleanup) and `shared/resources/test-failure-triage-prompt.md:79` (a restated cleanup rule). Bring each into scope, or state why it is excluded. `RB_LOG` (`qa-loop.md:461`) has no cleanup, so it is out of scope. Record the search.
- **I11. The SC-12 sweep is out of date.** Re-run today, the plan's command also hits `skills/develop-task/SKILL.md:239`, `skills/develop-story/SKILL.md:252` and `skills/review-pr/SKILL.md:1072`. It also matches fixtures under `shared/resources/tests/fixtures/`, because a git pathspec `*` crosses `/`. Add `':!shared/resources/tests/*'`, and check `qa-loop.md:2016` and `skills/finalise/SKILL.md:900` (both say "APPROVE or CONCERNS").

### Optional

- **O2.** The "not measured" outcome should name the foreground exit codes it covers (124 for timeout, 137 for SIGKILL, 143 for SIGTERM). Otherwise a killed foreground gate reads as an attributable red.
- **O4.** `estimated_effort_hours: 8` assumed GitHub-only Phase 2 and a two-file Phase 3. With the Q3 and Q4 additions, about 13h.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I13. SC-6 is a behaviour criterion with no named test (check 4).** "The base-worktree run fires only when the head run was red" needs a test. Add a fourth fake gate (green) to the § 8 integration test and assert that no base run happened.

### Optional

- **O3.** SC-5 measures with `git diff develop -- …`. Restate it as a documentation criterion ("the CI-read block contains no `sleep`, `--watch` or `until`") so finalise can check it without depending on a diff base.

Control cases are present for the coverage route and the CI mapping, so check 2 passes.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

- **I8 (risk side).** Phase 1's pre-existing branch lets a red gate commit and push. That widens what the gate treats as safe, so it is at least **Medium** risk, not Low. The plan needs a **differential oracle**: shapes the branch must still refuse, such as a base failure on a different test, a module-not-found on base, or a missing `.agents/skills`. Each one goes to the attributable path.
- Risk 1 (flaky CI lane) changes its mitigation per Q1. The base check at QA time now does the clearing, not 5b.
- The rollback plan is adequate. The phases stay separately revertible after these changes.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 14

1. Phase 2: read CI at Step 10 and check the base's run of the same check before raising a finding (I1, I2: Q1, Q2)
2. Phase 2: add a VCS-branched PR Existence Check, the BB pipelines read and a BB fixture test (I3: Q3)
3. Phase 3: add a qa-fix Step 2 row and split the resume-contract row, with its reconstruction states (I4, I5: Q4)
4. Define an "open" coverage finding as one without `provenance: pre-existing` (I6)
5. Add `ACTION_REQUIRED` to the jq and give it a fixture (I7)
6. Pre-existing red means the same failing tests; an environmental base failure counts as unavailable; Phase 1 risk becomes Medium with a differential oracle (I8)
7. List the four tests that pin the changed literals (I9)
8. Add the two missed cleanup sites and record the search (I10)
9. Refresh the SC-12 sweep and exclude fixtures (I11)
10. Name the real extractor (I12)
11. Add a green-gate case for SC-6 (I13)
12. Apply the head-equality rule to the GitHub arm (I14)

### Consider (Optional) - 4

1. Fix the `:1106` anchor to `:1107` (O1)
2. Name the exit codes for "not measured" (O2)
3. Restate SC-5 as a documentation criterion (O3)
4. Raise the effort estimate to about 13h (O4)

---

## Implementation Readiness Assessment

**Score:** 7/10

- Template Compliance: 10/10
- Technical Accuracy: 6/10
- Implementation Clarity: 7/10
- Consistency: 7/10
- Risk Management: 6/10

**Confidence Level for Successful Implementation:** Medium. High once the fixes are applied.

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** There are no Critical findings, but three planned outcomes can't be reached as written, and two consumers of the new route are missing. Each fix is a bounded edit to the task and plan, and the user's decisions settle all of them.

---

## Review Metadata

- **Reviewer:** review-task (Claude Opus 5.5)
- **Review Date:** 2026-10-28
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (pre-pass B)
- **Code read:** `develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-step-3-develop-loop.md`, `develop-bug-step-5-6-verify-loop.md`, `develop-pipeline-resume-contract.md`, `qa-findings-ingester-prompt.md`, `skills/{qa-task,qa-story,qa-fix,finalise,review-pr}/SKILL.md`, the listed tests
