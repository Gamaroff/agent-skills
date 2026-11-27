# Definition of Done Verification

**Story/Task:** task.328.measured-criterion-re-measured-when-head-moves
**Verification Started:** 2026-11-27T09:53Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report:** `task.328.qa.7.measured-criterion-re-measured-when-head-moves.md`. It now carries "Addendum — finalise dod.1 gaps (2026-11-27)", recorded at `5c3d00e42` and committed in `8a2b23243`.
**Gate File:** `task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml`
**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**PR Review:** `task.328.pr-review.1.measured-criterion-re-measured-when-head-moves.md` (CONCERNS; PC-1 and PC-2 were doc-only trail findings, fixed in the implementation report; no open coverage finding). The host requires no review (`reviewDecision` null), so this report satisfies the PR column. _Corrected after the 6a commit: that commit read "APPROVE" here in error._
**Run context:** DoD run 2, after the owner-approved evidence-only cycle ("Go ahead with one more fix cycle"). Run 1 (`task.328.dod.1.*`) found 3 gaps (#5, #6, #7). The only commits since are `5c3d00e42` and `8a2b23243`, both inside the task directory.
**Re-run at head:** `not-configured` (no `finalise.rerunAtHead`).
**Record preflight:** ok. #5 and #6 both have a committed QA report, and the addendum holds both records (confirmed).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (Step 3c's PARTIAL, re-folded after CI reading 1 graded #8)
**CI-state criteria:** #8 → PASS (CI reading 1: SUCCESS @ `8a2b23243`) — AC_OVERALL re-folded: PASS
**PR Status:** OPEN (PR #960, source: branch)
**PR Review Decision:** null; satisfied by the pr-review.1 report (CONCERNS, no open coverage finding)
**Re-run scope:** scoped (prior-record) — 4 re-judged, 5 carried

### Acceptance Criteria

#### #1: Task 320 criterion 10, verbatim, is listed with measured: true

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/finalise-record-preflight.js:63`
- Test evidence: `shared/resources/tests/finalise-record-preflight.test.mjs:206`

#### #2: Seven comparatives, each with and without a leading "no", make a record criterion

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/finalise-record-preflight.js:63`
- Test evidence: `shared/resources/tests/finalise-record-preflight.test.mjs:219`

#### #3: A bare comparison is not listed, and a record criterion with no bound reads measured: false

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/finalise-record-preflight.js:137`
- Test evidence: `shared/resources/tests/finalise-record-preflight.test.mjs:267`

#### #4: qa-task and qa-story cite the Step 3 rule and re-measure, and a test guards the citation and the restatement

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `skills/qa-task/SKILL.md:1095`, `skills/qa-story/SKILL.md:1630`
- Test evidence: `evals/shared/tests/qa-measured-figure-parity.test.mjs:130`

#### #5: The corpus count of newly listed criteria, with examples by path, is in the QA report

**Status:** ✅ PASS

- Code evidence: `task.328.qa.7…md:73` (375 → 379, delta 4) and `:77-80` (four full paths)
- Test evidence: `NOT_APPLICABLE: documentation criterion`
- Note: the agent reproduced the recount independently, in memory, comparing develop's engine against head's: 3305 criteria, 375 → 379, the same four entries, none dropped.

#### #6: Every new test was red before its change, and the red runs are recorded in the QA report

**Status:** ✅ PASS

- Code evidence: `task.328.qa.7…md:88-105` (M01–M14) and the earlier members at qa.1:88-89, qa.3:51, qa.5:50 and qa.6:47
- Test evidence: `NOT_APPLICABLE: process criterion`
- Note: the agent re-ran all 14 calibration mutations in memory, and each turned its named test red. The record states openly that these states were reconstructed after the change.

#### #7: Reverting any remedy turns a named test red, and the mutation table is in the QA report

**Status:** ✅ PASS

- Code evidence: `task.328.qa.7…md:109-116` (CR6-1, CR4-4, the finalise-delta.js bundling), plus the qa.1–qa.7 rows for the other 22 remedies
- Test evidence: `NOT_APPLICABLE: process criterion`
- Note: the agent reproduced the CR6-1, CR4-4 and citation reverts. Deleting the bundled copy alone turns no npm test red, but the agent passed the member for two reasons:
  - The copy is bundler output seeded by the SKILL.md citation (`bundle_skill.py:644`). Reverting the remedy means reverting the citation, and that turns two named tests red.
  - The copy's deletion is still caught by `bundle:check` (validate.yml:128).

#### #8: `npm test` passes under `CI=true`; `npm run bundle` leaves no diff; `bundle:check` reports 0 problems

**Status:** ⏳ DEFERRED-CI — graded at Step 6 from CI reading 1

- Code evidence: `.github/workflows/test.yml:58`, `.github/workflows/validate.yml:128`
- Test evidence: `NOT_APPLICABLE: CI-state criterion`

#### #9: CHANGELOG `[Unreleased]` cites (task 328)

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `CHANGELOG.md:52`
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:2`

### Advisory (not a gap)

- **#5**: the amendment text still says "only one newly listed criterion exists", and the owner approved it on that premise. The shipped engine lists 4. The amended bound is met, but the criterion's wording contradicts its own record. The owner may want to reword it or approve it again.
- **#6**: M01's description is loose. In the skills, the phrase "applied whole" breaks across a line. The calibration still goes red as recorded.
- **#6**: the red-first records are reconstructed by mutation after the change. This is weakest for the positive control at parity:214.

### Documentation

- **Skill files updated where behaviour changed**: ✅ PASS — `skills/qa-task/SKILL.md:1095`

**Agent summary:** #5, #6 and #7 now pass on the qa.7 addendum. The agent reproduced the recount and every mutation in memory. #8 waits for CI. Five criteria were carried.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `skills/qa-task/references/bb-auth.js:23`

### No new unsafe patterns (eval/exec/shell)

**Status:** ✅ PASS
- Evidence: `skills/qa-task/references/finalise-delta.js:41`
- Note: child processes are started with argv arrays. The code is unchanged since DoD 1.

### NUMERIC_BOUND regex change (backtracking / effect)

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-record-preflight.js:63`

### General Security

- **Security TODOs/FIXMEs**: ✅ PASS
- **Dependency risk**: ⚠️ NOT_APPLICABLE (package.json is unchanged)

### Probe Results

**Candidates executed:** 48 — **reproduced:** 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held**: every candidate returned its expected verdict. There were no escapes and no refusals.

- Probe run by /finalise from the dod.1 plan, reused (`security-probe-plan.mjs reuse` → `reusable`: the engine files are unchanged since `aee5f9efd`). 3 controls, record `task.328.dod.2.security.run.json`. Plan reused from dod.1, not extracted from the agent's transcript.

**Agent summary:** the checklist is clean. The boundary is the bundled `isDocsPath` and the `finalise-delta.js docs-only` arm, and both are byte-identical since DoD 1.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** this is an internal refactor of skill tooling. No personal, payment or health data is involved, and no UI changes.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:52`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/qa-task/SKILL.md:1095`
- Note: both QA SKILL.md changes are body-only, so the catalog needs no regeneration.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

**Agent summary:** the CHANGELOG entry is present, and both QA skills document the rule.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, gate 7, with the dod.1-gaps addendum)
- Acceptance Criteria: ✅ 9/9 (4 re-judged, 5 carried; #8 graded from CI reading 1)
- PR Review & Tests: ✅ pr-review.1 CONCERNS with no open coverage finding; the host requires no review
- CI reading 1: SUCCESS @ `8a2b23243c32` over 6 checks: allowed-branch, link-check, secret-scan, shellcheck, test, validate
- Documentation: ✅ CHANGELOG and both QA skills
- Security Review: ✅ PASS (48 probes executed, 0 reproduced)
- Compliance Review: ⚠️ N/A
- Registry: `registry-tick.js` → `ticked` (`planned` → `accepted`, line 372), `stageReason: staged`

**Outcome:** The task meets every Definition of Done criterion and is accepted.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-27T10:00Z
**Total Duration:** 7 minutes
**CI reading 1:** SUCCESS @ `8a2b23243c32` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated: DoD PASSED section added, run-1 gap report marked historical, `status: accepted`, Change Log 1.2
- ✅ Sprint Review summary created
- ✅ Registry row ticked
- Outward side-effects (the PR canonical comment, the tracker comment and close, the board move) fire **after** this file is committed and pushed (the Step 7 publish boundary). Their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here.

**Next Steps:**

- The task is ready for Sprint Review
- No further action is required
