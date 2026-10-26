# Task Review Report: Task 232 - Probe path assertions — nested `absent` and a new `removed`

**Reviewed:** 2026-10-24
**reviewed_blob:** b47d105d6142978144772dafc486855d6711b6ec
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well grounded: every line anchor resolves, the pre-pass found nothing already built, and the scope matches the decision made at authoring. Running the plan's helper found one real hole: `removed` is matched case-insensitively, so on a case-sensitive filesystem a `removed` case can pass without the script removing anything. Five Important items follow. One would rebuild an existing function, and one rests on a false claim about tests. One is held by a source-text grep, one is a guard widened without a differential oracle, and one is a planned rule that can never fire.

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-10-24 (C1, I1–I5, O1, O2; I5 was found while checking the C1 fix)

**Critical Issues:** 1 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked at the question points. The one design choice (scope) was settled at authoring: nested paths plus `removed`.
**Implementation Readiness:** 8/10 once the Critical item is fixed
**Recommendation:** NEEDS REVISION. All fixes are mechanical and need no new decision.

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/task.232.probe-expected-path-assertions
  - Base:       develop
  - Epic branch:N/A
  - Auto-skip:  false
```

- Output format: comprehensive report (user choice).
- Pre-pass B (architecture): `alignment: aligned`, `axes_checked: [What this repo produces, Cross-skill resources, File naming, Validation before commit, Do not]`. Axes source: `architecture` (`prepass-axes.js`).
- Pre-pass C (codebase): `implementation_status: not-implemented`. `pathAssertionProblem` and `expected.removed` are absent, and the four `collides` blocks and the `/` refusal are unchanged.

---

## User Decisions & Clarifications

No question point raised a decision the document leaves open. The scope question (nested `absent` only, docs only, or nested paths plus `removed`) was asked during `/create-task`, and the user chose **nested paths plus `removed`**. The document reflects that choice.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present (`countMandatorySections` = 11). Change Log, Progress Tracking, References and Notes present.
- Frontmatter: `type: task`, `description`, `tags`, `status: planned`, `priority`, `estimated_effort_hours: 16`, `github_issue: 747`. No placeholders.
- Tracker: issue #747 is `OPEN`, and the body link matches `github_issue`. Board priority self-heal ran (exit 0).
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve. On the card: Summary (5 sentences omitted), Success Criteria (8 omitted, `+N more` link), Breaking Changes (1 omitted).
- Doc links (`doc-links.js`): the task's 3 and the plan's 1 relative links resolve.
- Sign-off: not enabled in `skills-config.yaml`, so not checked.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Every `security-probe.mjs` anchor the document cites was read with `sed -n` and holds what it names: `:112`, `:1172`, `:1187-1191`, `:2009`, `:2047`, `:2062-2079`, `:2071`, `:2271-2273`, `:2398`, `:2598-2605`, `:2698`, `:2731`, `:2932-2941`, `:3038`, `:3176`, `:3267` and `:3478-3486`. The test anchor `security-probe.test.mjs:943` holds the `a/b` refusal row.

### Critical

- **C1. `removed` membership is case-folded, so a vacuous `removed` passes (check 11, falsified).**
  - **Location:** Target Architecture, `pathAssertionProblem`; plan Phase 2, "The helper".
  - **Evidence:** the plan's helper, run as written:
    `pathAssertionProblem({removed:["foo"]}, ["Foo"])` → `null` (accepted). On a case-sensitive filesystem the fixture writes `Foo`, `foo` never exists, `lstat("foo")` reports it missing, and the case passes with nothing removed. The document's own rule says a `removed` entry the fixture does not create is declined.
  - **Fix:** case-folding is right for the `absent` collision, where a fold can only decline more. It is wrong for `removed` membership, which must match exactly. Compare `removed` entries to the created list after `normalize` only, without folding. Add the test `removed: ["foo"]` against fixture `Foo` → declined.

### Important

- **I1. `casePathState` would rebuild `realpathSafe` (check 6, obs #103).**
  - **Location:** plan Phase 2, `compareExpected`; task § 3 "Existing mechanisms this task touches".
  - **Evidence:** `realpathSafe(p)` (`security-probe.mjs:965`) already returns the realpath of the deepest existing ancestor with the missing segments re-joined. That is the walk the plan describes for `casePathState`, and the engine uses it at `:680`, `:1015`, `:1027`, `:1521`, `:1570` and `:1605`. The inventory says no new path-safety function is written, then plans one.
  - **Fix:** `casePathState` becomes `isWithin(realpathSafe(fixtureDir), realpathSafe(target))` (or equal), followed by `lstatSync(target)`. Name `realpathSafe` in the inventory as reused. Note that `lstatSync` is not in today's `node:fs` import (`:272-286`) and must be added.
- **I2. The plan says no test pins the fence decline wording; one does (check 15).**
  - **Location:** plan Phase 2, the paragraph after "The helper".
  - **Evidence:** `security-probe.test.mjs:5233` ("fence entry: an expected.absent name the case's own fixture writes is declined…") asserts `/fixture writes/` at `:5262`. Converging the fence wording on "which the fixture itself creates" turns that test red. Its five rows (`pwned`, `dir/x` vs `dir`, `./pwned`, `b/../pwned`, `PWNED`) are also the best ready-made matrix for the helper.
  - **Fix:** list `:5233` among the tests to update, and reuse its rows as the helper's normalise/fold matrix.
- **I3. A Code Quality criterion is held by a source-text grep (check 13).**
  - **Location:** § 9 Code Quality, "`grep -n "const collides"` returns nothing".
  - **Evidence:** renaming the variable to anything else passes the grep while a fifth inline copy of the rule survives. It proves a string is gone, not that every runner routes through the helper.
  - **Fix:** hold it by behaviour. Removing the helper's first rule must turn the collision test of **every** form red (`shell:`, `shell-fn:`, `cli:`, `shell-argv:`, `fence:`). A runner that kept its own copy stays green, and that is the failure the criterion exists to catch. Record it as a mutation in the implementation report.
- **I4. A refuse-by-default guard is widened with no differential oracle (Step 7).**
  - **Location:** § 10 Risk Assessment; Phase 1 grammar tests.
  - **Evidence:** `expectedProblem` refuses today, and the task widens what it accepts. The plan lists new refusals (`../a`, `/abs`, `a/../../b`), but nothing compares head against base.
  - **Fix:** add one table-driven test. Every shape base refuses (`""`, `.`, `..`, NUL, non-array, non-string, `5`) is still refused on head. The only class that flips is a `/`-containing path that stays inside the case directory. Every name base accepts is still accepted. Add it under MEDIUM risk 1's mitigation.
- **I5. The "in both lists" rule can never fire (check 10).** Found while running the corrected C1 helper.
  - **Location:** Target Architecture, the fourth `pathAssertionProblem` rule; plan mutation 3.
  - **Evidence:** `{ absent: ["a"], removed: ["a"] }` with `a` created returns `absent-created` (the first `absent` rule). Without `a` created, the `removed` rule fires first. No input reaches the fourth rule, so "drop it → its test goes red" cannot happen.
  - **Fix:** remove the rule and its flowchart node. Keep one unit test asserting both shapes are declined by the other two rules.

### Optional

- **O1. `shell:` and `shell-fn:` gain case-folding.** Today `runShellCase` compares exact names (`:2271-2273`), and the helper folds. Measured on the committed corpus, `allCases()` holds 2 `absent` entries (`PWNED`, `PWNED2`) and 0 that differ from a control or input only by case. State the narrowing and that measurement in § 5, so "scores the same" is a measured claim.
- **O2. Fence fixtures are built inline.** The plan says to copy "the existing `fence:` fixture doc". The fence tests build their docs inline with `fenceRoot({...})` (`security-probe.test.mjs:5234`). Say that.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases, each with a risk level, files and checkboxes, in dependency order (tests → engine → docs). File changes name functions and lines. Effort: the rubric recomputes to about 14h, which snaps to 16, matching the frontmatter (13 criteria, 17 plan tasks, risk medium, more than 5 files, integration keyword present).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (I3)

- Each Functional criterion is a behaviour criterion with a planned test in Phase 1.
- Performance is an explicit not-applicable line.
- The Migration criteria are documentation criteria.
- No criterion can only be met after merge.
- The behavioural evidence has a control case (§ 8, obs #176).
- The task.227 regression is reachable. Run on 2026-10-24 against the real script, both arms exit 0 with empty stderr, the lock arm prints `advance-pipeline-lock: pipeline complete, lock removed`, and no record is left.
- A delete inside the case directory is not an escape: `caseWatchedSpawn` snapshots the work dir with the case directory skipped (`workDirStamps(workDir, caseName)`, `:2815`).
- Test reach: the new tests go in `shared/resources/tests/security-probe.test.mjs`, which `npm test`'s `shared/resources/tests/*.test.mjs` glob already reaches.
- Diagram: the flowchart validated (`valid: true`). It shows decision logic the prose describes but does not restate.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE, with I4 added

The two Medium risks (silently weakening BUG-13, reading through a planted symlink) have tests named as mitigations. The rollback has triggers, steps under an hour and a validation command.

---

## Summary of Recommendations

### Must Fix (Critical) - 1

1. Match `removed` entries exactly after `normalize`, without folding; add the `foo` vs `Foo` test. (C1)

### Should Fix (Important) - 5

1. Reuse `realpathSafe` + `isWithin` for containment; add `lstatSync` to the import. (I1)
2. List `security-probe.test.mjs:5233` as a test to update, and reuse its rows. (I2)
3. Replace the `const collides` grep criterion with the all-forms mutation. (I3)
4. Add the head-vs-base differential grammar test. (I4)
5. Remove the unreachable "in both lists" rule. (I5)

### Consider (Optional) - 2

1. State the `shell:` case-fold narrowing with its corpus measurement. (O1)
2. Point fence fixtures at `fenceRoot`. (O2)

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High once C1 is fixed

**Recommendation:** ⚠️ **NEEDS REVISION**. One Critical item means it is not ready as written. All fixes are edits to the document with no open decision, and after them the task is ready.

---

## Review Metadata

- **Reviewer:** review-task (agent)
- **Review Date:** 2026-10-24
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.232.probe-expected-path-assertions/task.232.probe-expected-path-assertions.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (pre-pass B)
