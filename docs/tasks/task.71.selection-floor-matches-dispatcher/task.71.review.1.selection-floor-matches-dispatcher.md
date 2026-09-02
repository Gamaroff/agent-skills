# Task Review Report: Task 71 — Make the selection floor equal what the dispatching pipeline accepts

**Reviewed:** 2026-08-31
**Review Depth:** Thorough
**Task Status:** Ready for Development
**Overall Assessment:** NEEDS IMPROVEMENT

> **Implementation Status**: ✅ All 9 recommendations (3 critical, 6 important) implemented — 2026-08-31. The optional synthetic-fixture rewrite was applied too, per Q3.

---

## Executive Summary

The task's *destination* is correct and was verified against the source: `develop-task` does proceed on `Draft`, `Planned`, `Ready for Development` and `In Progress`, so `TASK_ELIGIBLE_STATUSES` as proposed genuinely equals the dispatcher's accepted set. What does not hold is the argument used to get there and the shape of the work described.

Three claims fail verification. The motivating premise misstates what `/create-task` emits. The task never engages the deliberate, shipped rationale for the current floor — written in the very file it edits. And Phase 3's open question is already answered, in the direction the task does not plan for.

**Critical Issues:** 3 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Q1 — What replaces the floor as the opt-out?

**Question**: `select-next.mjs:71-78`, `roadmap-selection.md:73/83` and `CHANGELOG.md:73-76` state a deliberate shipped decision — *"The eligibility floor IS the opt-out… a `draft` task is out of the frontier BY CONSTRUCTION rather than by someone remembering to mark it — strictly stronger than an opt-out marker… No `deferred` value is added to either lifecycle."* Widening removes the only opt-out.

- **User Decision**: **Nothing — accept no opt-out.** Every filed task becomes immediately selectable.
- **Impact**: The task must now *argue the reversal explicitly*. A new Motivation subsection has to quote the existing rationale and say why it no longer holds. Silent reversal of a documented decision is the defect; the reversal itself is sanctioned.

### Q2 — The bug axis

**Question**: Phase 3 treats the bug axis as an open question. It is not: `develop-bug` proceeds on `{new, reopened, in-progress, ready-for-qa}` while `BUG_ELIGIBLE_STATUSES = {new, reopened}`. An equality test would *force* widening the bug floor by two statuses.

- **User Decision**: **Scope equality to tasks only.** The bug axis keeps its subset assertion; Phase 3 is rewritten to record the measured divergence and why bugs deliberately stay stricter.
- **Impact**: Phase 3 changes from "check and maybe align" to "record a measured fact and deliberately decline to act on it". The equality test is task-axis-only; the bug test stays `⊆`. §5 Breaking Changes stays task-only and is now *correct* rather than incomplete.

### Q3 — The integration fixture

**Question**: "`--lint` reports the four filed tasks (67-70) as eligible" is vacuous — all four are already `ready-for-development` and already eligible.

- **User Decision**: **Replace with a synthetic fixture.** Drop the 67-70 assertion; add an inline registry fixture carrying a `draft` and a `planned` row, plus the mutation proof.
- **Impact**: Testing Strategy §8 is rewritten. The change acquires an assertion that can actually go red.

---

## 1. Template Structure Compliance

**Status:** PASS (one gap)

All 11 mandatory sections present and filled. No placeholders. Filename follows `task.{n}.{descriptive-name}.md`. OKF frontmatter conformant — `type: task` present, `description` present, `tags` a YAML list. Change Log present and current (newest row 1.1 records the prior review; consistent with `status: ready-for-development`).

Tracker card preflight (`sync-jira-task.js --check-card`) exits **0** — every card block resolves. Informational: the card omits 2 sentences of Overview, 5 success criteria and 4 breaking-changes lines behind `+N more` links.

### Issues

#### Important
- **No tracker linkage.** `TRACKER=github` (git remote `Gamaroff/agent-skills`, no `JIRA_URL`), but frontmatter carries no `github_issue`. Siblings 67-70 are identically unlinked and the registry tracker column reads `—` for all five, so this reads as a house convention for this batch rather than an oversight — flagged per contract, not treated as a defect.

**Score: 9/10**

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1

### Verified correct

- `select-next.mjs:84-88` matches the quoted "Current architecture" block exactly.
- **The target set is right.** `develop-pipeline-step-0-resolve-and-prepare.md` § *develop-task* proceeds on `Draft`, `Planned`, `Ready for Development`, `In Progress`; HALTs on `Ready for Review` / `accepted`, `Cancelled`, and any other. The proposed `TASK_ELIGIBLE_STATUSES` equals that set.
- The `--lint` exclusion message is quoted accurately.
- The CHANGELOG:78 subset rule is quoted accurately.

### Issues

#### Critical

- **[C1] False premise — `/create-task` produces `planned`, not `draft`.**
  - **Location:** §2 Motivation #1; repeated in §"Why High priority"
  - **Claim:** *"`/create-task` produces `status: draft`. The floor excludes `draft`. So every task enters the world outside the frontier."*
  - **Evidence:** `skills/create-task/SKILL.md:422` — *"Set frontmatter `status: planned` (body `**Status:** Planned`)"*. `skills/create-task/resources/task-template.md:8` — `status: planned`.
  - **Why it matters:** the conclusion survives (`planned` is excluded too, so filed tasks *are* outside the frontier), but the stated mechanism is wrong. The argument leans on `draft` as "the default path for all new work" when `draft` is not produced by the authoring skill at all. Corroborating: this repo's task registry contains **66 `accepted` and 5 `ready-for-development` rows — zero `draft`, zero `planned`.**
  - **Fix:** rewrite Motivation #1 around `planned`. Keep `draft` in the widening (the dispatcher accepts it) but stop citing it as the default path.

- **[C2] The task does not engage the opposing rationale written in the file it edits.**
  - **Location:** §2 Motivation, §3 "Important clarifications", §References
  - **Evidence:** `skills/develop-next/scripts/select-next.mjs:71-78` — *"The eligibility floor IS the opt-out. Neither lifecycle has a park value (`deferred`, `wont-fix`)… a `draft` task is a speculative filing and is out of the frontier BY CONSTRUCTION rather than by someone remembering to mark it — strictly stronger than an opt-out marker, because there is nothing new to remember and nothing new to write."* Restated at `skills/develop-next/references/roadmap-selection.md:73` (as a section heading: `### Eligibility — the floor *is* the opt-out`) and `:83`, and in `CHANGELOG.md:73-76`.
  - **Why it matters:** the task cites `CHANGELOG.md:78` for the subset rule but not the three sentences immediately above it stating the opposite design intent. Widening the floor **deletes the only opt-out mechanism** for a speculative filing, and the task nowhere says what replaces it. Its sole answer is buried in §11 Rollback — *"set that task to `cancelled`"* — and `cancelled` is semantically wrong for "real work, just not yet".
  - **Fix (per Q1):** add a Motivation subsection that quotes the existing rationale verbatim and argues why it no longer holds — that a wasted, visible pipeline cycle is preferable to an invisible filing, and that no park value is being added because none is wanted. The reversal is sanctioned; leaving it unstated is not.

- **[C3] Phase 3's open question is already answered, in the unplanned direction.**
  - **Location:** §3 "Important clarifications" (*"may or may not match"*), §6 Phase 3
  - **Evidence:** running the existing test's own `proceedStatuses()` parser over `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:58-64` yields `{new, reopened, in-progress, ready-for-qa}`. `BUG_ELIGIBLE_STATUSES = {new, reopened}`. **They diverge by two statuses.**
  - **Why it matters:** Phase 3 as written says *"If they diverge, align and extend the equality test to cover bugs too"* — so the plan's own rule commits to adding `in-progress` and `ready-for-qa` to the bug floor. §5 Breaking Changes, §10 Risk Assessment and §11 Rollback all speak only of tasks. Selecting a `ready-for-qa` bug (fix written, awaiting verification) into an unattended loop is a materially larger behaviour change than the one the task assesses.
  - **Fix (per Q2):** rewrite Phase 3 to record the measured divergence as a **finding**, scope the equality assertion to the task axis, and keep `⊆` for bugs with a stated reason.

**Score: 4/10**

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important

- **[I1] Phase 2 describes as greenfield work that already exists.**
  - **Location:** §6 Phase 2, all four bullets
  - **Evidence:** `evals/develop-next/unit/select-next.test.mjs:1786` already defines `proceedStatuses(markdown, sectionHeading)` — it already parses the dispatcher's table, already excludes HALT rows, and already splits slash-separated status cells. Test `16/H1` at :1808 already calls it against `develop-task`'s section.
  - **Consequence:** Phase 2's real content is a **one-line change from `⊆` to `===`** plus a divergence-naming failure message. Written as "parse the table / derive the set / assert", a developer would build a parser that exists.
  - **Fix:** rewrite Phase 2 as *"convert test 16/H1's subset assertion to a two-way equality assertion; `proceedStatuses()` is reused unchanged."*

- **[I2] A second test must change, and the plan does not name it.**
  - **Evidence:** `select-next.test.mjs:1475` — `test("15/SC5: the eligibility floor excludes draft and planned by construction", …)` asserts `r.status === "stop"` for `draft` and `planned`. This is a direct assertion of the behaviour being reversed.
  - **Consequence:** Phase 2 names only "the existing subset test" as superseded. A developer following the plan hits an unexpected red test outside the plan's scope. Files Summary is correct on file *count*; the plan under-describes the work inside that file.
  - **Fix:** Phase 2 gains a bullet: *"Test 15/SC5 asserts the old behaviour by name — invert it: `draft`/`planned` move from the not-selectable list to the selectable list; `ready-for-review`, `accepted`, `cancelled` stay. Rename the test, since its title states the rule."*

- **[I3] §10 Risk 3's mitigation is already implemented, so the risk is overstated.**
  - **Evidence:** Risk 3 asks to *"assert the parsed set is non-empty and contains a known anchor (`ready-for-development`) before comparing."* Both already exist: `assert.ok(sawRow, "no status-table rows parsed — the table shape changed")` at :1810, and the anchor assertion `proceed.has("ready-for-development") && proceed.has("in-progress")` at :1813.
  - **Fix:** restate Risk 3 as *"already mitigated by the existing guards; the equality conversion must preserve them"* rather than as work to do.

- **[I4] Phase 4's prose sweep is under-specified, and one target is a heading.**
  - `roadmap-selection.md:73` — the section **heading** is `### Eligibility — the floor *is* the opt-out`. After this change that title is false. Not mentioned.
  - `roadmap-selection.md:77-79` — a **Kind / Lifecycle / Eligible table** stating the current values. Not mentioned; it is the summary a reader trusts.
  - `roadmap-selection.md:153` — the test-index entry describing test 15's sweep. Not mentioned.
  - `select-next.mjs` has **two** rationale blocks (:56-58 and :71-78), not one "header comment".
  - **Fix:** enumerate all six sites in Phase 4.

- **[I5] `estimated_effort_hours: 8` is roughly 3× the real work.** Given I1 (parser exists) and the corrected Phase 3 (record, don't align), the work is: one constant, two comment blocks, two test edits, one prose section, one CHANGELOG entry. Rubric against the corrected plan lands near **3h**. The 1.1 Change Log row raised 4h→8h against a plan that overstated Phase 2.

- **[I6] §4 Scope is silent on bugs.** Neither In Scope nor Out of Scope says what happens to `BUG_ELIGIBLE_STATUSES`, yet Phase 3 can change it. After Q2 this becomes an explicit Out of Scope line.

**Score: 5/10**

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

- **§5 Breaking Changes vs Phase 3** — §5 names only "`draft` and `planned` tasks"; Phase 3's own rule could add two bug statuses. Resolved by Q2 (bugs out of scope), which makes §5 correct as written once Phase 3 is rewritten.
- **§8 Testing Strategy → Integration** — *"`--lint` reports the four filed tasks (67-70) as eligible"* is **vacuous**. Verified: tasks 67-70 all carry `status: ready-for-development` and are already eligible; `--lint` currently selects **T67** as the frontier item. The assertion passes identically before and after. Compounding this, the repo has zero `draft`/`planned` rows in either registry, so nothing exercises the change end-to-end. Resolved by Q3 (synthetic fixture).
- **§8 Mutation Proving is otherwise strong** — the three proofs (remove `draft`, add `accepted`, flip the dispatcher table) are exactly right and cover both directions.
- No Mermaid diagrams present; none needed — the change is one set literal, and the prose carries it.

**Score: 5/10**

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Rollback is genuinely sound: reverting `TASK_ELIGIBLE_STATUSES` is one line, the trigger is concrete, and the verification step (`--lint` reports drafts ineligible again) is real. The Forward Fix distinguishing "noisy task" from "bad policy" is a good instinct.

Gaps: Risk 3 is already mitigated (I3), and there is no risk entry for the bug axis (moot after Q2, but Phase 3 should say so).

**Score: 6/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 3

1. **[C1]** Rewrite Motivation #1 and "Why High priority" around `status: planned`. `/create-task` emits `planned` (`skills/create-task/SKILL.md:422`), not `draft`.
2. **[C2]** Add a Motivation subsection quoting the "the floor IS the opt-out" rationale from `select-next.mjs:71-78` / `roadmap-selection.md:83` / `CHANGELOG.md:73-76`, and argue why it no longer holds. *Per Q1 — reversal accepted, silence not.*
3. **[C3]** Rewrite Phase 3: the bug axis **diverges** (`develop-bug` proceeds on `{new, reopened, in-progress, ready-for-qa}`). Record the fact, scope equality to tasks, keep `⊆` for bugs. *Per Q2.*

### Should Fix (Important) — 6

4. **[I1]** Rewrite Phase 2 — `proceedStatuses()` exists at `select-next.test.mjs:1786`; the work is `⊆` → `===`.
5. **[I2]** Name test `15/SC5` (`:1475`) in Phase 2 as requiring inversion and rename.
6. **[I3]** Restate Risk 3 as already-mitigated; require the equality conversion to preserve both guards.
7. **[I4]** Enumerate all six prose sites in Phase 4, including the now-false section heading at `roadmap-selection.md:73` and the eligibility table at `:77-79`.
8. **[I5]** Reduce `estimated_effort_hours` 8 → 3.
9. **[I6]** Add an explicit Out of Scope line for `BUG_ELIGIBLE_STATUSES`.

### Consider (Optional) — 2

10. Replace the vacuous 67-70 integration check with a synthetic `draft`+`planned` registry fixture. *Per Q3.*
11. Note in §2 that the repo's own registry currently holds zero `draft`/`planned` rows — the change is preventive, which is a fair argument and stronger than an overstated one.

---

## Implementation Readiness Assessment

**Score:** 6/10

| Dimension | Score | Note |
|---|---|---|
| Template Compliance | 9/10 | All 11 sections, card preflight clean; tracker linkage absent (batch convention) |
| Technical Accuracy | 4/10 | Target set verified correct; premise false, counter-argument unengaged, Phase 3 falsified |
| Implementation Clarity | 5/10 | Phase 2 rebuilds what exists; a second test unnamed; Phase 4 under-specified |
| Consistency | 5/10 | §5 vs Phase 3; vacuous integration assertion |
| Risk Management | 6/10 | Rollback genuinely sound; Risk 3 already mitigated |

**Confidence Level for Successful Implementation:** Medium

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** The destination is verified correct and the change is small and reversible, but three load-bearing claims fail against the source — and one of them (C3) commits the plan to an unassessed behaviour change on the bug axis. With the Q1-Q3 decisions applied these are all editorial fixes to the document, not rework of the idea.

---

## Next Steps

Address in order:

1. C1 — correct the `/create-task` premise (`planned`, not `draft`)
2. C2 — engage and explicitly reverse the "floor is the opt-out" rationale
3. C3 — rewrite Phase 3 around the measured bug-axis divergence, scoped out
4. I1-I2 — rescope Phase 2 to the real work and name test 15/SC5
5. I4-I6 — prose sites, effort, explicit bug Out-of-Scope
6. Optional 10 — synthetic fixture replacing the 67-70 check

Then `/develop-task docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md`.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-08-31
- **Review Depth:** Thorough
- **Task File:** `docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.selection-floor-matches-dispatcher.md`
- **Sources consulted:** `skills/develop-next/scripts/select-next.mjs`, `evals/develop-next/unit/select-next.test.mjs`, `skills/develop-next/references/roadmap-selection.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`, `skills/create-task/SKILL.md`, `skills/create-task/resources/task-template.md`, `docs/tasks/task-registry.md`, `CHANGELOG.md`
- **Executed:** `select-next.mjs --lint` (frontier: T67 selected, 72 passed over); `node --test evals/develop-next/unit/*.test.mjs` (121 pass, 0 fail); `sync-jira-task.js --check-card` (exit 0)
