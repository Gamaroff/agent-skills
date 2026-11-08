# Definition of Done Verification

**Story/Task:** task.271 finalise accepts what the record already shows
**Verification Started:** 2026-11-08T17:55Z

---

## Verification Results

## Step 1: QA Report and Gate

Newest gate: `task.271.gate.17` PASS (90/100), report `task.271.qa.17`. The 5c `/review-pr` report `task.271.pr-review.1` is CONCERNS with no coverage finding; both findings were fixed in `71301805`. The qa.17 addendum written by this run holds the named tests per arm, the mutation proofs per arm, the wall-time measurement and the fixture-vanish commands tried.

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (after CI-state criteria were graded)
**PR Status:** OPEN (PR #859). The host requires no review, so the "PR approved" column is met by the 5c report `task.271.pr-review.1` (verdict CONCERNS, cited by path).
**Re-run scope:** full (no prior record). AC record: `task.271.dod.1.ac.json`.

| Criterion | Status | Evidence |
| --- | --- | --- |
| #1 each arm accepts its match and refuses its control | ✅ PASS | `finalise-delta.test.mjs:92,105,275,310`; `finalise-deferral-match.test.mjs:79,104,125,136` |
| #2 every accepted case writes its basis | ✅ PASS | Arms 1 and 2 assert base, head and changed in the output (added in this run, mutation-proved: 2 red); Arm 3 asserts the rendered DoD line |
| #3 no record, behaviour unchanged | ✅ PASS | no-match and code-changed controls; existing contract test unmoved |
| #4 wall time within 10% | ✅ PASS | median of five alternating runs on `a35d236e`: develop 161262 ms, branch 161273 ms, +0.0%; `6be1064c` is tree-equivalent to it (qa.17 addendum). An earlier sample on `71301805` read +2.4% |
| #5 mutation proof per arm | ✅ PASS | qa.17 addendum |
| #6 bundle check and `npm test` pass | ✅ PASS | CI reading 1: SUCCESS at `6be1064c` (6 of 6 checks) |
| #7 `finalise-dod-prompt-contract` passes | ✅ PASS | same CI reading |
| #8 fixture-vanish cause | ✅ PASS | recorded as not proven, commands tried named (qa.17 addendum) |

**CI-state criteria:** #6 → PASS, #7 → PASS (CI reading 1: SUCCESS @ `6be1064c`) — AC_OVERALL re-folded: PASS

The first AC pass failed #2, #4, #5 and #8. This run closed them (new assertions, the qa.17 addendum, a wall-time measure on head) and the same agent re-judged: nothing was waved through.

Advisories carried: the wording of the two-attempt CI re-run line is prose that no test pins; the mutation records give red counts but not every red test name.

## Step 3: Security Review

**Overall:** ✅ PASS. No secrets, no eval or shell (git runs through `execFileSync` with an argument array behind `--literal-pathspecs`), no TODOs, no dependency change. `boundary: true`.

**Probe plan:** 41 probes in 5 controls (3 against `finalise-delta.js`, 2 against `finalise-deferral-match.js`); **0 reproduced, 0 escapes**. Record: `task.271.dod.1.security.run.json`. No `deferrals.json` exists for this task, so no reproduced probe could have been deferred. The plan did not cover an empty `--approver` value (the engine may drop an empty argv element); that gap is recorded here and is covered by the unit tests.

## Step 4: Compliance Review

**Overall:** NOT_APPLICABLE. Internal developer tooling: no personal data, payments, UI or health data.

## Step 4b: Docs & Changelog

**Overall:** ✅ PASS. `CHANGELOG.md` (task 271, names `deferrals.json` and `JSON.parse`), `docs/reference/configuration.md` (`finalise.deferralApprover` now names `deferrals.json`; the first pass found it did not, fixed in this run), and `skills/finalise/SKILL.md` item 5a agree. No README or catalogue change is needed.

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (90/100), gate 17
- Acceptance Criteria: ✅ 8/8
- PR Review & Tests: ✅ 5c report CONCERNS (both findings fixed); CI green at `6be1064c`
- Documentation: ✅ PASS
- Security Review: ✅ PASS (41 probes, 0 reproduced)
- Compliance Review: ✅ NOT_APPLICABLE

**Outcome:** Task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-08T19:05Z
**Total Duration:** 70 minutes
**CI reading 1:** SUCCESS @ `6be1064c82f5ce6d2cbae6909991bd14655fbffd` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close/transition, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); this task has no tracker issue, so there is no tracker step

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
