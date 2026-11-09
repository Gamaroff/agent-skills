# Definition of Done Verification

**Story/Task:** task.268 qa-fix finds the whole defect the first time
**Verification Started:** 2026-11-07T00:21Z

---

## Step 1: QA Report Review ⚠️

**QA reports:** 5 (`task.268.qa.1` to `qa.5`). **Gate:** `task.268.gate.5` — CONCERNS (80). Open at gate 5: T268-QA-10 and T268-QA-11 (medium, deferred; see the task's Deferred Work). **PR review:** `task.268.pr-review.1` — CONCERNS, no open coverage finding.

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ❌ FAIL
**PR Status:** OPEN (PR #854, source: branch). **PR Review Decision:** none required by the host; the co-located PR review report reads CONCERNS.
**Re-run scope:** full (no-prior-record)

| Criterion | Status | Evidence / gap |
| --- | --- | --- |
| #1 Eight rules present, list in QA report | ❌ FAIL (low) | All eight rules are in `skills/qa-fix/SKILL.md` (obs #16, #18, #20, #27, #42, #56, #63, #113). No QA report lists the eight rules with their observations. |
| #2 Each rule fires on fixture, silent on control, per rule | ❌ FAIL (low) | QA 1 records one aggregate row, "16/16". No per-rule record, and none re-recorded after the cycle 2 to 5 edits. |
| #3 Step 7 post refused when trigger (b) holds and block absent | ❌ FAIL (medium) | Step 7 as shipped warns and posts (`the check never halts the cycle`). The criterion says refused. No fixture run of the check is recorded. |
| #4 Suite wall time within 10% of develop | ❌ FAIL (low) | QA 1 records median 192 s base vs 247 s head (about +29%), taken under rising load and at an earlier commit. The added cost per file is small, but the bound was not met by the cited measurement. |
| #5 Named node --test files pass | ✅ PASS | Re-run at head: 53 pass, 0 fail. |
| #6 `bundle --check` | ✅ PASS | 129 skills checked, 0 problems. |
| #7 `quick_validate.py skills/qa-fix` | ✅ PASS | passes. |
| #8 No "four moves" prose | ✅ PASS | `git grep` empty. |

CI-state criteria: none.

---

## Step 3: Security Review

**Overall:** ✅ PASS. Boundary: true (a refusal guard in the Step 4 fence).

### Probe Results

**Candidates executed:** 18 — **reproduced:** 0. ✅ **The boundary held.** Run by `/finalise` from the security agent's plan, 1 control, record `task.268.dod.1.security.run.json`. 0 escapes, 0 refusals.

### Recommendations for the owner

- **Spec challenge:** a command substitution in a changed path expands in the double-quoted slot assignment (T268-QA-10, deferred).
- **Spec challenge:** a path in a nested repository or behind a symlinked directory reads clean (T268-QA-11, deferred).

## Step 4: Compliance Review

**Overall:** ⚠️ NOT_APPLICABLE (internal skill prose and a unit test).

## Step 4b: Docs & Changelog

**Overall:** ✅ PASS. `CHANGELOG.md:9` cites task 268 under `[Unreleased]`.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — GAPS IDENTIFIED

Security, compliance and docs pass. Four acceptance criteria are red. Fix-and-recheck was refused: more than one criterion fails and #3 is medium. CI was not read for a decision, as the matrix stops at the AC column.

**Outcome:**

- [ ] #3 Step 7: decide between making the owed-block check refuse (as the criterion says) or amending the criterion to "warn and post" with the reason, then record a fixture run of the check in a QA report.
- [ ] #1 Add the eight-rule list with observations to a QA report.
- [ ] #2 Record a fixture and control result per rule against the final `SKILL.md`.
- [ ] #4 Re-measure the suite time (median of five alternating runs, `uptime` beside each) on a quiet machine, or amend the criterion.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-11-07T00:35Z
**Total Duration:** 14 minutes
**Estimated Effort to Close Gaps:** Small to Medium (records and one design decision)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- Outward side-effects (PR comment, tracker, board) were not fired: no acceptance occurred.

**Next Steps:**

- Close the four gaps above, then re-run `/finalise`.
