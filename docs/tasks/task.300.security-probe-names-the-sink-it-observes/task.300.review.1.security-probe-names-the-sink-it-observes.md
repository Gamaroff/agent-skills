# Task Review Report: Task 300 - security-probe names the sink it observes

**Reviewed:** 2026-11-13
**reviewed_blob:** ba095c9652a6b8419668dc019959d3fbc157a462
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 5 recommendations implemented — 2026-11-13

---

## Executive Summary

The task's re-scoped premise is sound and was re-verified against the source: the runner counts an accepted hostile case as reproduced, and the out-of-sandbox write limit lives only in source comments and `probe-boundary-rule.md` §5, not on the DoD Probe Results line. The plan had five gaps, all fixed in the document: no deciding input for "unobservable", a name collision with the existing `sink` term, an unnamed source and reader set, unnamed pinned tests, and no temp-dir removal.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions (pipeline run, autonomous defaults; none needed)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Independence note: the two pre-pass Explore subagents (architecture alignment, codebase scan) were **not dispatched**; both passes were done inline against the repository by the reviewing session, so this review has no independent second reader.

---

## User Decisions & Clarifications

None. Pipeline mode auto-answered output format (comprehensive report) and Step 8.5 (apply critical + important fixes).

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log and References present. OKF `type: task` and `description` present. No sign-off section is required (`sign-off.enabled` unset). Change Log was current. No tracker issue linked (`github_issue` absent): tracker sync was not run in pipeline mode.

- **[Optional]** `estimated_effort_hours: 4` is low for a change touching four bundled copies, the DoD block and two pinned test files. Not recomputed against the rubric; confirm at develop.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — 0 hallucinations

Verified: `computeVerdict` counts `outcome === "accepted"` on a hostile case as reproduced (`shared/resources/security-probe.mjs:1485-1500`); the out-of-sandbox write limit is stated at `:270-271` and in `probe-boundary-rule.md` §5 (`:659-660`); `skills/finalise/SKILL.md:1103` `### Probe Results` does not carry it.

- **[Important] I-1 (check 10, outcome reachability).** The success criterion said an entry "whose sink the runner cannot observe" yields "sink not observable". No function and no input decides that: the runner does not know what a target does with an accepted value. The inputs it has are the entry form and the case verdicts. **Fixed:** Phase 1 now names the deciding input and recommends a fixed run-level `observation_limits` list keyed by entry form; the criteria are reworded to the entry form.
- **[Important] I-2 (naming).** `sink` already means the corpus input class (`--sink`, `SINKS`, `c.sink` in `security-probe.mjs`). A second meaning for one word in one file invites misreads. **Fixed:** the new field is `observation_limits`; the task forbids calling it `sink`.
- **[Important] I-3 (checks 15, 20, 25, population).** The task said "the probe runner (and its source under `shared/resources/` if that is where it lives)". Measured: the source is `shared/resources/security-probe.mjs`, with four bundled copies (`ls skills/*/references/security-probe.mjs` → finalise, qa-story, qa-task, review-security). The Probe Results block is pinned by `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (the `### Probe Results` heading, the `**Candidates executed:**` text, `{if}`/`{endif}` balance, verdict-token occurrence counts: lines 661-990). The record is read by `security-probe-plan.mjs` via `readRecord()`, `security-probe-plan-cases-file.test.mjs`, `read-only-agent-writes.test.mjs` and `probes-executed-population.test.mjs`. **Fixed:** all named in Phases 2-3 and Files Summary. The limit text is to live once (an exported constant) and be cited by the rule doc and the DoD line, not restated.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- **[Important] I-4 (check 4, criterion names its test).** "Readers of the record tolerate the new field" named no test. **Fixed:** Phase 4 adds a read-back test (record with and without the field gives the same `probes_executed` through `readRecord()` and the plan CLI), and the criterion names it.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- **[Important] I-5 (check 28, temp dirs).** The new fixture test will create temp directories; `scripts/test-tmpdir.mjs` rejects a new leaking prefix. **Fixed:** Phase 4 requires removal in a `finally` / `t.after`.
- Test reach (check 18): `shared/resources/tests/security-probe.test.mjs` is reached by the `shared/resources/tests/*.test.mjs` glob in `package.json`'s `test:suite`. No runner edit needed.
- Checks 14 (call-site population), 15 (removed literals: nothing is removed, the line is extended), 16 (replaced region), 17, 19, 21-24, 26, 27, 29, 30: not applicable.
- Control case (obs #176): the Phase 4 test has both a form that carries a limit and one that carries none.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. Medium risk (a new field nobody needs) has Phase 1 as its mitigation; rollback is a revert plus `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 5 (all applied)

1. Name the deciding input; use a run-level `observation_limits` list keyed by entry form (I-1).
2. Do not name the field `sink` (I-2).
3. Name the source, four bundled copies, readers and the pinned DoD block test; keep the limit text defined once (I-3).
4. Name the read-back test for the tolerance criterion (I-4).
5. Remove temp dirs in the new test (I-5).

### Consider (Optional) - 1

1. Re-check `estimated_effort_hours` (4h) at develop.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** no critical issues; the five Important findings are fixed in the document and the premise was re-verified against the source.

---

## Review Metadata

- **Reviewer:** review-task (pipeline run, inline)
- **Review Date:** 2026-11-13
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.300.security-probe-names-the-sink-it-observes/task.300.security-probe-names-the-sink-it-observes.md
- **Architecture Docs Consulted:** none read in full; source and tests grepped directly
