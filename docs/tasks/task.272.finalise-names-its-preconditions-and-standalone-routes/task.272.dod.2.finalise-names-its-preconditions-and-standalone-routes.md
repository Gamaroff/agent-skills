# Definition of Done Verification

**Story/Task:** task.272 finalise names its preconditions and standalone routes
**Verification Started:** 2026-11-08T21:12Z
**Run:** 2 (run 1 found two gaps, closed in QA cycle 3)

---

## Verification Results

## Step 2: Core Acceptance Criteria

**Overall AC Status:** ❌ FAIL (6 of 8 PASS; #4 and #5 FAIL, both low)
**PR:** #860 OPEN, review decision empty. **Re-run scope:** full.

- #1, #2, #3, #6, #7, #8 PASS (citations in the agent record; `criteria-drift.js` clean).
- #4 FAIL (low) — the −0.4% figure was taken at `8f93238c`; `finalise-delta.js docs-only` returns `code-changed` for the head. Needs a re-measure on the head.
- #5 FAIL (low) — six engine rules now proven by name; the resolver `linked-issue` rung, the bug-verdict "only ✅ Fixed" filter and the missing-gate / missing-pr-review detections had no named mutation.
- Advisories: the "pass unchanged" wording overstates (one fixture line in `finalise-bug-mode.test.mjs` gained `BASIS`); Progress Tracking still shows Phase 1 "Answer recorded" unchecked.

## Step 3: Security Review

**Overall Security Status:** ❌ FAIL (probe plan, boundary true)

Run by `/finalise` from the agent's plan: run 1's two control files plus 33 new cases on the comment stripping. **Executed:** 54 — **reproduced:** 8, all one cause: the cycle 3 `uncomment` regex left any comment tail that holds a quote character whole, so `active: false # it's off, not active: true` and `approved_by: # it's me` still read as a waiver. Severity low (the preflight informs, never waives), but a fail-open in a delivered guard.

## Step 4: Compliance Review

**Overall:** ⚠️ NOT_APPLICABLE.

## Step 4b: Docs & Changelog

**Overall:** ✅ PASS — `CHANGELOG.md:9`, `SKILL.md` Step 0b and the bug-mode row.

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

Two sections FAIL (AC, security), so fix-and-recheck (Step 8a) does not apply.

**Outcome:**

- [x] #4: wall time re-measured on the head `c96fdd5c`: develop 161213 ms, branch 161999 ms, +0.5% (qa.3)
- [x] #5: mutation proofs for the resolver rung, bug-verdict filter, missing gate and missing pr-review recorded by name (qa.3)
- [x] Security: `uncomment` now tracks quotes and CRLF; probe plan re-run 54 executed, 0 reproduced; seven hostile and four control cases added, red against the cycle 3 regex and against no fix
- [x] Found while measuring: `gate.3` wrote `evidence: executed`, which the gate-corpus test rejects; fixed to `measured`

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-11-08T22:20Z

**Blocking Issues Summary:** AC #4 (stale measurement), AC #5 (four unmapped rules), security (8 of 54 probes).

**Closed in the same session, before this file was committed:** commits `c96fdd5c` (parser) and `0acf1795` (QA record, gate fix). Full `CI=true npm test` on `0acf1795`: 8102 pass, 0 fail. The gap-only writes of Step 8 (Change Log gaps row, body gap section, gaps PR comment) were not made because the gaps were closed at once. `/finalise` re-runs as DoD run 3.

**Deviations:** the probe severity was graded inline; the final timing runs exited 1 on the branch side because of the gate defect, so they are wall times of a failing run (the suite runs to the end either way).
