# Definition of Done Verification

**Story/Task:** task.292 — One bash tokenizer for the QA snippet classifier
**Verification Started:** 2026-11-10T07:16Z

---

## Step 1: QA Report Review

**QA reports:** `task.292.qa.1`–`qa.4`; **gate:** `task.292.gate.4…yml`
**Gate Status:** CONCERNS, 90/100. `top_issues` holds one closed entry (T292-QA4-1, criterion 10 approved); three pre-existing findings (T292-CR-1..3) sit in `recommendations.future`.
**PR review:** `task.292.pr-review.1…md`, verdict CONCERNS.
**PR:** #869 (source: branch)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (#5 and #6 fail, low; #11 graded PASS from CI reading 1)
**Re-run scope:** scoped (prior-record) — 10 re-judged, 3 carried. AC record: `task.292.dod.2.ac.json`.
**PR Status:** OPEN (PR #869). **Review decision:** none required; satisfied by `pr-review.1` (CONCERNS).
**CI reading 1:** SUCCESS @ `e0cdb5dc61fe` (6 of 6 checks green)

| Criterion | Status | Reason |
| --- | --- | --- |
| #1 CR/FF/VT/NBSP/U+2028 before `#` | ✅ PASS | engine :1507, :3096; tests :4828-4838 (5 of 5 members have rows) |
| #2 task.290 gap rows and controls | ✅ PASS | tests :4542, :4563 |
| #3 `classifyBlock` never throws | ✅ PASS | test :4590 |
| #4 differential ≥200000 | ✅ PASS (carried) | QA 3 :137 |
| #5 docs scan timing | ❌ FAIL (low) | QA 4 :35-46 gives a 5-run median of 384 ms against 543 ms, with load, but taken on `9a3b04e9`; the delta to HEAD changes a test file, so `finalise-delta.js` answers `code-changed`. Re-measure on HEAD |
| #6 slice under 10 s | ❌ FAIL (low) | QA 4 :50, median 3368 ms, same reason: taken on `9a3b04e9`. Re-measure on HEAD |
| #7 scans read `tokenize`; consumers counted | ✅ PASS | test :4684 counts 4 consumers; mutation proof QA 4 :25 |
| #8 `\s` allowlist test | ✅ PASS | test :4628 |
| #9 recursive scan fails a test | ✅ PASS | test :5025; mutation proof QA 4 :16 |
| #10 every change mutation-proven | ✅ PASS | QA 4 :14-24, QA 3 :117, QA 1 :145-146; wording approved by Lorien Gamaroff |
| #11 lint and prettier | ✅ PASS | CI reading 1 SUCCESS @ `e0cdb5dc61fe` |
| #12 CHANGELOG, `bundle:check` | ✅ PASS (carried) | `CHANGELOG.md:9` |
| #13 0 newly runnable | ✅ PASS (carried) | QA 3 :128; QA 4 :46 |

**Advisory (not a gap):** the approver on #10 parses as `Lorien Gamaroff)` (trailing parenthesis); cosmetic. #4: QA 1's seed-101 run has no recorded command.

---

## Step 3: Security Review

**Overall Security Status:** ✅ PASS
**Boundary:** true (sink `shell-exec`, entry `qa-execute-snippets.mjs#isRunnableBlock`). No hardcoded secrets, no new unsafe patterns, no new runtime dependency.
- Probe run by /finalise from the security agent's plan — 1 control, record `task.292.dod.2.security.run.json`. Plan extracted from the agent's transcript (144 bytes, sha256 `ea05538f56cebdd7`).
- **Candidates executed:** 31 — **reproduced:** 0 — **escaped:** 0
- ✅ **The boundary held** — every candidate returned its expected verdict.
- **Not deferred, not covered by this corpus:** T292-CR-1..3 (indirect evaluation). Identical on `develop`, listed in gate 4 `recommendations.future`; no `deferrals.json` exists, so none is rendered as deferred.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. Internal QA tooling; no PII, payment, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS
- CHANGELOG: `CHANGELOG.md:9` cites `(task 292)`.
- Type-specific docs: `shared/resources/qa-runnable-prose-detection.md` and its generated copies updated; no `SKILL.md` frontmatter changed.
- README and architecture docs: not applicable.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — GAPS IDENTIFIED

**Summary:**

- QA Gate: CONCERNS 90/100 (not blocking)
- Acceptance criteria: 11 of 13 pass, 2 fail (both low, both measurements)
- Security: PASS (31 executed, 0 reproduced, 0 escaped)
- Compliance: not applicable
- Docs: PASS
- CI reading 1: SUCCESS @ `e0cdb5dc61fe`

Fix-and-recheck (Step 8a) does not apply: two criteria fail, and neither is a finding this run produced by executing code.

**Outcome:**

- [ ] #5: Re-measure the docs scan against `develop` on HEAD (median of five, `uptime` beside each run) and record it in a QA report.
- [ ] #6: Re-measure the fixed-seed slice on HEAD (median of five, `uptime` beside each run) and record it in a QA report.

Both are measurements recorded in documents. The engine is byte-identical across the whole delta, so a documents-only commit follows, and `/finalise` re-runs with scope `scoped`.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-11-10T07:18Z
**Total Duration:** 2 minutes

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted (see the PR)

**Next Steps:**

- Re-measure #5 and #6 on HEAD and record them in a QA report
- Re-run `/finalise`
