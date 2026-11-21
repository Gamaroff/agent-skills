# Definition of Done Verification

**Story/Task:** task.286 — qa-fix Step 4 guard looks beneath gitlinks
**Verification Started:** 2026-11-20T22:05Z
**Run:** 3 (run 2 found one gap, `task.286.dod.2.*`; this run supersedes it)

---

## Step 1: QA Report Review ✅

**QA Report:** `task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.md`
**Gate File:** `task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml` — ✅ PASS, 95/100, `top_issues: []`
**PR review:** `task.286.pr-review.1.qa-fix-step4-guard-looks-beneath-gitlinks.md` — APPROVE (PC-1: `pr_number` missing, written by this run)
**PR:** #927 (source: branch)
**Future work from QA (advisory, not gating):** nested gitlink not looked into (pre-existing); non-ASCII gitlink path refused for the wrong reason (new, safe side).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #927). The host requires no review (`reviewDecision` empty); the 5c pr-review report is APPROVE and is the evidence for the "PR approved" column.
**Re-run scope:** scoped (prior record `task.286.dod.2.ac.json`) — 2 re-judged (#5, #7), 6 carried

| Criterion | Status | Evidence |
| --- | --- | --- |
| #1 gitlink with an untracked file refused (bash, zsh) | ✅ PASS (carried) | `skills/qa-fix/SKILL.md:938`; `tests/qa-fix-step4-guard.test.js:633` |
| #2 clean checked-out gitlink admitted | ✅ PASS (carried) | `skills/qa-fix/SKILL.md:941`; `tests/qa-fix-step4-guard.test.js:506` |
| #3 CR-3 route decided and held | ✅ PASS (carried) | `skills/qa-fix/SKILL.md:894`; `tests/qa-fix-step4-guard.test.js:766` |
| #4 inside test works when `TOP` is `/` | ✅ PASS (carried) | `skills/qa-fix/SKILL.md:927`; `tests/qa-fix-step4-guard.test.js:924` |
| #5 "No performance criterion; the block runs once per fix cycle." | ✅ PASS (not applicable) | approved by Lorien Gamaroff 2026-11-21; `criteria-drift.js` reports `reworded`, `approved: true` |
| #6 each new clause has a mutant (process criterion) | ✅ PASS (carried) | QA report lines 145–149 |
| #7 `validate` and `ci:fast` pass | ✅ PASS (graded from CI reading 1) | CI reading 1: SUCCESS @ `353ec3fceb09` (all six checks) |
| #8 CHANGELOG `[Unreleased]` cites (task 286) | ✅ PASS (carried) | `CHANGELOG.md:9` |

**CI-state criteria:** #7 → PASS (CI reading 1: SUCCESS @ `353ec3fceb09`) — AC_OVERALL re-folded: PASS.

**How #5 was decided.** Run 2 failed it: no bound, nothing to test, checkbox unticked. The owner told the session to tick it as not applicable. That edit reworded the criterion, so the text now reads "approved by Lorien Gamaroff 2026-11-21", which is what `criteria-drift.js` reads as approval. The AC agent then graded it by that recorded approval, not by the tick.

**Advisories (not gaps):** non-ASCII gitlink path (`skills/qa-fix/SKILL.md:940`) is over-refused with the wrong reason; recorded in the gate's `recommendations.future`.

### Documentation

- Skill prose for the gitlink look, trailing-slash strip and CR-3 decision: ✅ — `skills/qa-fix/SKILL.md:890`

---

## Step 3: Security Review

**Overall Security Status:** ✅ PASS (boundary held)

The change since run 2 is the task document only; the guard is unchanged.

### Probe Results

**Candidates executed:** 36 — **reproduced:** 0. ✅ **The boundary held** — every candidate returned its expected verdict.
**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held; a write to an absolute path outside the sandbox is not observed. A clean count describes what the runner could see, not what a target does with a value it accepted.

- Probe run by /finalise from the security agent's plan — 1 control, record `task.286.dod.3.security.run.json`. Plan extracted from the agent's transcript; the committed cases file `task.286.dod.1.security.cases.json` was reused.
- Criteria signal: `boundary: true` (`fail-closed`, `is refused`).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — skill file, test and changelog only; no data, UI, payment or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS — CHANGELOG entry at `CHANGELOG.md:9`; skill prose in `skills/qa-fix/SKILL.md`; body-only change, so the skill catalog is unaffected; README not affected.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Gate: ✅ PASS (95/100)
- Acceptance Criteria: ✅ 8/8
- PR Review: ✅ APPROVE (5c)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (36 executed, 0 reproduced)
- Compliance Review: NOT_APPLICABLE
- CI reading 1: SUCCESS @ `353ec3fceb09`

**Outcome:** Task meets all Definition of Done criteria.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-20T22:14Z
**Total Duration:** 9 minutes
**CI reading 1:** SUCCESS @ `353ec3fceb09` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD verification section, `status: accepted`, `pr_number: 927`
- ✅ Sprint Review summary created
- ✅ AC record `task.286.dod.3.ac.json`, security record `task.286.dod.3.security.run.json`
- Outward side-effects (PR canonical comment) fire after this file is committed and pushed; their outcomes are recorded on the PR comment and in the implementation report.

**Next Steps:**

- Task is ready for merge. No tracker issue is linked.
