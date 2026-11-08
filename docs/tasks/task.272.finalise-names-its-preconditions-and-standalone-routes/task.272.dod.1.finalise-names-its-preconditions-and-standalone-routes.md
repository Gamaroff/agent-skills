# Definition of Done Verification

**Story/Task:** task.272 finalise names its preconditions and standalone routes
**Verification Started:** 2026-11-08T21:04Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.272.qa.1.*` (FAIL 60), `task.272.qa.2.*` (PASS 95)
**Gate File Found:** `task.272.gate.2.*.yml` — PASS, 95/100, `top_issues: []`, no waiver
**PR:** #860 (source: branch) — OPEN, review decision empty (`null`); PR review `task.272.pr-review.1.*` (conformance lens, two doc-only findings, fixed in the 5c carry)
**Record criteria preflight:** ok — 3 record criteria, all with a committed place (the QA report)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ❌ FAIL (7 of 8 criteria PASS; #5 FAIL, low)
**PR Status:** OPEN (PR #860)
**PR Review Decision:** null (host requires no review); the newest `pr-review` report is the evidence
**Re-run scope:** full (no-prior-record)

- #1 PASS — `shared/resources/finalise-preconditions.js:405`; test `evals/shared/tests/finalise-preconditions.test.mjs:329` (executed Step 0b, task 208/209 shape).
- #2 PASS — `skills/finalise/SKILL.md` 6a post-merge route; `shared/resources/tests/finalise-post-merge-bug-route.test.mjs:148`; 7.7 fallback `finalise-bug-mode.test.mjs:546`.
- #3 PASS — all-inputs-present control `finalise-preconditions.test.mjs:345`; 536 targeted finalise tests, 8101 full-suite pass.
- #4 PASS — median develop 162616 ms vs branch 161957 ms (-0.4%), five alternating pairs, load recorded; measured on 8f93238c, `finalise-delta.js docs-only` says `tree-equivalent` to head.
- #5 **FAIL (low)** — `task.272.qa.2` line 76 lumps "resolver linked-issue rung, five engine rules" into one line: the five rules are not named and no test is named for each. Gap: list each engine rule with its reverted line and the red test.
- #6 PASS, #7 PASS (committed QA record: 8101 pass / 0 fail; bundle `--check` 0 problems), #8 PASS (`finalise-bug-mode.test.mjs:164,180,200`).

**Amendment rule:** `criteria-drift.js` clean.
**Advisory:** no separate single-file run of `finalise-bug-mode.test.mjs` is recorded; the full suite covers it.

### Documentation

- finalise `SKILL.md` and bundled copies: PASS.

---

## Step 3: Security Review

**Overall Security Status:** ❌ FAIL (probe plan, boundary true)

- No secrets, no unsafe patterns, no dependency change: PASS (spot check by the agent).

### Probe Results

Run by `/finalise` from the security agent's plan — 2 controls, record `task.272.dod.1.security.run.json`.
**Candidates executed:** 21 — **reproduced:** 2

- `hostile-active-in-comment` (`gate: WAIVED`, `active: false # was active: true`) — expected **rejected**, got **accepted**.
- `hostile-approver-in-sibling-comment` (`active: true`, `reason: x # approved_by: me`) — expected **rejected**, got **accepted**.

Cause: `waiverOf` (`shared/resources/finalise-preconditions.js`) tests `active:` and `approved_by:` against the whole waiver block, comments included, so text after a `#` counts. Severity graded **low** inline (the security agent was not re-dispatched to grade): the preflight informs and never waives, and Step 6 applies its own gate checks, so a wrongly accepted waiver costs an earlier warning, not an acceptance. It is still a fail-open in a guard the task delivers.

The agent expected the first case to hold; the run showed it does not. All other 19 candidates held (no gate, inactive, empty, null and TBD approvers, approver outside the block, no waiver block, resolver cases).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE (no GDPR, PCI-DSS, WCAG or HIPAA surface)

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS — `CHANGELOG.md:9` cites (task 272); `SKILL.md` and bundled references updated; frontmatter unchanged, no catalog change.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

Two sections are FAIL (acceptance criteria and security), so the fix-and-recheck path (Step 8a) does not apply.

**Outcome:**

- [ ] AC #5: record each of the five engine rules' mutation proof by name in the QA report
- [ ] Security: `waiverOf` reads `active:` and `approved_by:` inside YAML comments — strip the comment tail before matching, with a test per case
