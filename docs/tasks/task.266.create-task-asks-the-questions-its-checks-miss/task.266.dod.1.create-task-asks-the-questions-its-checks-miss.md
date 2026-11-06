# Definition of Done Verification

**Story/Task:** task.266 — create-task asks the questions its checks miss
**Verification Started:** 2026-11-06T13:15Z

---

## Step 1: QA Report Review ✅

**QA Reports:** `task.266.qa.1`, `qa.2`, `qa.3` (newest: qa.3)
**Gate File:** `task.266.gate.3.create-task-asks-the-questions-its-checks-miss.yml`
**Gate Status:** ✅ PASS (97/100), head `aacfcc2305ce`, `top_issues: []`, no waiver
**PR Review:** `task.266.pr-review.2` — APPROVE, no findings (host requires no reviews, so `pr_review_decision` is null; this report satisfies the column)
**PR:** #851 (source: branch)
**Prior DoD blocks in body:** none.

**NFR (from gate):** Security PASS, Performance PASS (measured), Reliability PASS, Maintainability PASS.
**Future action from gate:** `tests/bundle-missing-source.test.js` runs 18.5 s against a 20 s budget when idle; consider a wider budget.

**Method note.** The four DoD checks were run inline by the pipeline agent, not by four Explore subagents. Subagents hung earlier in this run. Independent review did not run. The contract tests, `bundle --check` and `quick_validate` were re-run here, not read from the QA reports.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #851)
**PR Review Decision:** null (no reviews required); `task.266.pr-review.2` APPROVE
**Re-run scope:** full (no-prior-record) — 8 re-judged, 0 carried

### Acceptance Criteria

#### #1: Five items present in § 3.5 and firing on their motivating shape

**Status:** ✅ PASS

- Code evidence: `skills/create-task/SKILL.md:561-564`, `:569`
- Test evidence: behavioural, `task.266.qa.1` lines 56-79 (D1, D3, D5, D6, D8, D10 flagged by the new item or a clean discriminator)
- Note: one run per arm, drafts written by the implementer. Firing is shown, not statistically established.

#### #2: Each item leaves its control draft unflagged

**Status:** ✅ PASS

- Evidence: `task.266.qa.1` lines 56-79 (D2, D4, D7, D9, D11 unflagged after the change)

#### #3: `finalise-dod-ac-prompt.md` names run count and statistic

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-dod-ac-prompt.md:72`
- Test evidence: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (50/50 with the measured-criterion test, re-run here)

#### #4: `npm test` wall time within 10% of `develop`

**Status:** ✅ PASS

- Evidence: `task.266.qa.3` lines 40-63: median 733.2 s (head) vs 737.1 s (develop), -0.5%, five alternating runs, `uptime` beside each
- Note: measured on `aacfcc23`; every later commit changes task documents only. One develop run exited 1 on a load-sensitive test; kept and reported.

#### #5: Contract tests pass

**Status:** ✅ PASS

- Re-run now: `CI=true node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/review-task-measured-criterion.test.js` — 50 tests, 50 pass, 0 fail

#### #6: `bundle --check` reports 0 problems

**Status:** ✅ PASS

- Re-run now: `bundle freshness: 129 skill(s) checked, 0 problems`

#### #7: `quick_validate.py skills/create-task` passes

**Status:** ✅ PASS

- Re-run now: `✓ create-task`

#### #8: No new item restates a section list

**Status:** ✅ PASS

- Evidence: the diff touches neither `jira-sync.js` nor `CARD_SECTIONS_BY_KIND`; the one mention stays at `skills/create-task/SKILL.md:766`.

### Advisory (not a gap)

None.

### Documentation

- **CHANGELOG entry citing task 266**: ✅ PASS — `CHANGELOG.md:9`
- **Bundled copies match source**: ✅ PASS — `bundle --check` 0 problems

**Record criteria (preflight):** 3 record criteria (#1, #2, #4), all `ok`; the record is in `task.266.qa.1` and `qa.3`, both committed.

**Agent summary:** All 8 criteria PASS.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ⚠️ NOT_APPLICABLE

Prose-only change (a skill's review checklist and one clause in an agent prompt). No input boundary, no secrets, no network, no auth. Gate NFR security: PASS (reasoned).

### Probe Results

_Probe mode did not fire — the deliverable is not a boundary._ (`boundary: false`)

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — no personal data, payments, accessibility surface or regulated area.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- CHANGELOG: `(task 266)` cited under `[Unreleased]` — `CHANGELOG.md:9`; `changelog-cites.sh` check is run again at 6d.
- Consumer-doc sweep: recorded in the implementation report (Phase 3).

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

- QA gate: ✅ PASS (97/100)
- Acceptance criteria: ✅ 8/8
- PR review: ✅ APPROVE (`task.266.pr-review.2`)
- Docs: ✅ PASS
- Security: ⚠️ N/A (prose only)
- Compliance: ⚠️ N/A
- CI reading 1: SUCCESS @ `bb5be9016572` (acceptance decision; all six checks green)

**Recommendations for the owner:**

- The behavioural evidence is one run per arm. If an item later misfires, re-run its draft several times before changing the wording.
- `tests/bundle-missing-source.test.js` ran 20188 ms against a 20000 ms budget under load (gate 3 future action).

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-06T13:19Z
**Total Duration:** 4 minutes
**CI reading 1:** SUCCESS @ `bb5be9016572` (acceptance decision; all six checks green)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report

**Artifacts Generated:**

- ✅ Task document updated with a DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (PR canonical comment) fire after this file is committed and pushed; the task has no linked tracker issue, so there is no tracker comment, close or board move.

**Next Steps:**

- Ready for Sprint Review
- No further action required
