# Task Review Report: Task 275 - Gates say what they know

**Reviewed:** 2026-11-15
**reviewed_blob:** 6fa675fedaa71fc6432131498990085105b943fe
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development at the end of this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped and its motivation is true: the PASS lead says "no problems" beside open lows, and `recommendations.future` carries unverified remedies. The plan, however, was written against three assumptions that the code does not hold: that `top_issues` length is the number of open points, that two call sites feed the lead, and that two skills write the gate schema. All were corrected in the document in this review.

**Critical Issues:** 0 🚨
**Important Issues:** 7 ⚠️ (all fixed in the document)
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions (pipeline mode: Q&A is autonomous; each decision below is recorded as a decision, not asked)
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

**Independence note:** the two Phase 1.5 pre-pass Explore subagents were not dispatched; both passes (architecture alignment, codebase already-implemented) were done in-line by the orchestrator, so the independent-review benefit was not obtained. Architecture axes source: `architecture` (`prepass-axes.js`). The task is not already implemented: `git grep -n open_count` finds nothing.

---

## User Decisions & Clarifications

Decisions made without a user present (pipeline mode), each recorded in the document:

- **D1 No-slot PASS rendering.** The document left it to the plan. Decision: keep the bare "found no problems" sentence for a count of 0 or absent, because § 9 requires gates and call sites without the slot to render as before; a new feed guard makes every shipped site supply the count, so the bare sentence reaches a reader only on a measured zero.
- **D2 `develop-bug`'s `qa-cycle` site.** It has no gate file. Decision: feed the cycle's `Declined` non-blocking count, which its own report entry already records.
- **D3 `remedy: verified` evidence.** Decision: a `verified_by:` field names the command or test; `verified` without it reads as `unverified`.

---

## 1. Template Structure Compliance

**Status:** PASS. All numbered sections present, OKF `type`/`description`/`tags` present, no placeholders. `--check-card`: 3 card blocks resolve, no problems. `doc-links.js`: 1 relative link resolves. Change Log present.

#### Optional
- No `risk_level` frontmatter (absent reads as low risk for the lite-mode rule; the task has three phases, so the run is `standard` regardless).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (all fixed). Architecture alignment (in-line pre-pass B): aligned; the changed surface is a pure engine, two skill documents and a docs table.

#### Important

- **I-1 The count is the wrong quantity (check 11, ran it).** The document counts `top_issues` length and the plan suggests `grep -c '^  - id:'`. On task 213's gate 2, the motivating example, both entries read `status: closed`, and that grep returns 2 (`grep -c '^  - id:' docs/tasks/task.213.*/task.213.gate.2.*.yml` → 2; no entry is open). The repository already defines "open": an entry whose `status:` is absent or `open` (`develop-next` Step 3). **Fixed:** the count is open entries of the `top_issues:` block, from one executable helper (a prose fix in two SKILL files is a fix no test executes).
- **I-2 The call-site population was not measured (check 14).** The document says "the call sites" without listing them. The collectors (`call-sites.js --engine tracker-comment.js` and `--engine stakeholder-summary-cli.js`) find five sites that render the two stages: `qa-task/SKILL.md:1997` and `:2100`, `qa-story/SKILL.md:2541` and `:2640`, and `develop-bug-step-5-6-verify-loop.md:95`. Two of them are the **PR-comment lead** through `stakeholder-summary-cli.js`, which the plan's grep (`--slot` lists in the two SKILL files) would have found only by accident, and the `develop-bug` site is in neither skill. **Fixed:** listed in § 3, § 6 and § 7.
- **I-3 `open_count` must be classified (check 25).** `stakeholder-summary.test.mjs` fails on a slot a template reads that is not in `BOOLEAN_SLOTS` / `NUMERIC_SLOTS` / `TEXT_SLOTS`; the plan never says so. A zero is read as absent by the numeric coercion, which D1 relies on. **Fixed:** named in § 3 and § 7.
- **I-4 A removed-literal sweep was missing (check 15).** The PASS wording is restated in `shared/resources/stakeholder-summary.md:149`, `:156`, `:170` (`git grep -n "found no problems"`), and pinned by `stakeholder-summary.test.mjs:171`–`:191` and `:386`. The bare sentence is kept, so the tests stay green, but the catalogue document must describe the new rendering. **Fixed:** added to § 7.
- **I-5 A third writer of the gate schema (check 20).** `skills/qa-gate/SKILL.md:207`/`:213` and `:542`/`:546` document the same `recommendations:` block (`git grep -n "recommendations:" -- 'skills/*/SKILL.md'`). The document named two skills. `qa-planning`'s `recommendations:` are test-design suggestions, not gate remedies, and are out of scope. **Fixed:** § 3, § 6, § 7 and the success criterion.
- **I-6 Nothing makes a site feed the count (check 4).** The coverage test fails on a site that feeds a slot a stage does not read; it does not fail on a site that omits one. Without a guard, a new `qa-gate` site that omits `open_count` ships the unearned reassurance silently, which is the defect this task exists to close. **Fixed:** a feed guard with a non-vacuity case is added to § 6 and § 8.
- **I-7 The `qa-cycle` template has no feed at its only site (check 10).** `qa-cycle` is posted only by `develop-bug` (task 121 removed the `step-5-6` site), which has no gate file. A template that reads a slot nothing feeds is dead. **Fixed** by D2.

#### Optional
- **O-1** The "three greps" in the third functional criterion were unnamed; named in § 9.
- **O-2** `task.266` (which also edits `create-task` § 3.5) is accepted and merged (`docs/tasks/task-registry.md`), so the stated ordering dependency is satisfied; the document now says so.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Phases have files, changes and dependencies; the plan file's count-source line was corrected.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes. The unit tests carry controls: CONCERNS and FAIL with a count render unchanged, a count of 0 renders bare, and a mutation proof removes the count branch. The criteria name where their evidence lives (the QA report). The performance criterion states a bound, a command and the load record.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Risk is low: the slot and field are optional, rollback is a revert plus re-bundle.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 7 issues

All seven applied to the document (I-1 to I-7).

### Consider (Optional) - 2 items

O-1 and O-2 applied.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 7/10 (before fixes; 9/10 after)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue; the seven important findings concerned what is counted, where, and what guards it, and each is now stated in the document with the command that produced it.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline mode)
- **Review Date:** 2026-11-15
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.275.gates-say-what-they-know/task.275.gates-say-what-they-know.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `coding-standards.md` (via `prepass-axes.js`)
- **Commands run:** `call-sites.js` (two engines), `git grep` for the literal, the writers and the pinned tests, `--check-card`, `doc-links.js`, `grep -c '^  - id:'` on the task 213 gate.
