# Definition of Done Verification

**Story/Task:** task.327.subagenthandback-replies-are-extracted
**Verification Started:** 2026-11-26T21:20Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.327.qa.1` / `qa.2` / `qa.3` (`.subagenthandback-replies-are-extracted.md`)
**Gate File (latest):** `task.327.gate.3.subagenthandback-replies-are-extracted.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 92/100
**History:** gate 1 CONCERNS (80) → gate 2 FAIL (70) → gate 3 PASS (92); 2 fix cycles; 6 findings fixed, 0 open.
**NFR Validation (gate 3):** Security PASS · Performance PASS · Reliability PASS · Maintainability PASS
**Immediate Actions from QA:** none
**Future Actions from QA:** 3 advisory cleanups (CR-1 mixed prompt-line test, CR-2 non-array user content, CR-3 JSDoc placement)
**PR Review:** `task.327.pr-review.1.subagenthandback-replies-are-extracted.md` — ✅ APPROVE (PC-1 low, fixed: `pr_number: 959`)
**Record criteria:** ok — #9 (real hand-back transcript) recorded in `task.327.qa.1…md` (sha256 `77072d33…a970c9`), confirmed present.
**Re-run at head:** not-configured (no `finalise.rerunAtHead` list).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #959, source: branch)
**PR Review Decision:** null (no review required on this host) — satisfied by `task.327.pr-review.1.subagenthandback-replies-are-extracted.md`, verdict ✅ APPROVE
**Re-run scope:** full (no-prior-record) — 14 re-judged, 0 carried
**AC YAML:** extracted from the agent's transcript, not hand-copied — `reply: handback`, 15087 bytes, sha256 `0378f1d0…c8c83`, record `verified: true`. This is the first real use of task 327's own feature.

### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| #1 | Hand-back-only transcript: extracted, `reply: handback`, byte-exact with CONTROLS | ✅ PASS | `agent-reply-block.js:175`; test `agent-reply-block.test.mjs:284` |
| #2 | Text control: extracted, `reply: text`, bytes unchanged | ✅ PASS | `:188`; tests `:303`, `:93` |
| #3 | Later of text reply and hand-back wins, both orders | ✅ PASS | `:182`; tests `:314`, `:326`, `:340` |
| #4 | A block only in an earlier turn is not read, for hand-backs too | ✅ PASS | `:158`, `isPrompt :133`; tests `:351`, `:362` |
| #5 | Other tool names never read; empty or non-string message is unreadable | ✅ PASS | `:175`; tests `:427`, `:436` |
| #6 | After any non-extracted answer, no file remains at `--out`, even a stale one | ❌ FAIL (medium) | Code right (`clearOut :280` runs before every branch). No stale-`--out` test for `transcript-ambiguous`, `empty-block` or `entity-escaped`; the `:453` test covers not-found, unreadable and no-block only |
| #7 | `--out` naming the transcript: exit 2, transcript unchanged | ✅ PASS | `:401`, `:277`; tests `:488`, `:519`; criteria-drift: added, approved (review-task) |
| #8 | `finalise-rerun-scope extract` on a hand-back; `merge` records verified | ✅ PASS | `finalise-rerun-scope.js:1217`; test `finalise-rerun-scope.test.mjs:2035` |
| #9 | One real host hand-back transcript extracted; recorded in the QA report | ✅ PASS | `task.327.qa.1…md:76-78`; repeated in qa.3 |
| #10 | Every new test red before its change; red runs in the QA report | ❌ FAIL (medium) | qa.1:67 itself records 7 of 10. Tests `:351`, `:427`, `:436` guard rules that already held, so they could never be red before the change (mutations b, c, c2 hold them instead). The committed QA report has only a count for the initial red runs |
| #11 | Reverting any one remedy turns a named test red; mutation table in QA report | ✅ PASS | qa.1:156-162 (a–f), qa.2 (g–i), qa.3 (j–l) |
| #12 | `npm test` passes under CI=true; `npm run bundle` leaves no diff | ✅ PASS | DEFERRED-CI at Step 3b, graded at Step 6 from CI reading 1: SUCCESS @ `fdcf01da` (test, validate green) |
| #13 | finalise SKILL.md says a failed extract leaves no `--out`, both paragraphs | ✅ PASS | `skills/finalise/SKILL.md:733`, `:1031` |
| #14 | CHANGELOG `[Unreleased]` cites (task 327) | ✅ PASS | `CHANGELOG.md:59` |

**CI-state criteria:** #12 → PASS (CI reading 1: SUCCESS @ `fdcf01da1672`) — AC_OVERALL re-folded: PARTIAL

### Advisory (not a gap)

None.

### Documentation

- **Skill file updated where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:733`, `:1031`; module header; bundled copy regenerated

**Agent summary:** 12 of 14 PASS (including #12 after CI). #6 and #10 FAIL, both medium.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

- **No hardcoded secrets introduced**: ✅ PASS — diff grep, none
- **No new unsafe patterns (eval/exec/shell)**: ✅ PASS — the only `exec` is `RegExp.prototype.exec`; `fs.rmSync` runs only after the identity guard and the directory and lstat refusals
- **Security TODOs/FIXMEs**: ✅ PASS
- **Dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` change

### Probe Results

**Boundary:** true. Signal `never` (criterion line 244). Gate 3's `internal` reason was weighed and does not bind: the transcript is written by the host harness, and the code deletes a caller-supplied `--out`, which the `path` sink models.
**Candidates executed:** 23 — **reproduced:** 0 — escapes: 0 — refusals: 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held.** Every candidate returned its expected verdict.

- The probe was run by /finalise from the security agent's plan: 3 controls (the `--out` identity guard on the `--transcript` route, the same guard on the `--agent-id` route, and reply selection). Record: `task.327.dod.1.security.run.json`. The plan was extracted from the agent's transcript (`reply: handback`, 20943 bytes, sha256 `d0a577a2…1eaac`).
- Unprobed: a symlink or hard link at `--out`. The fixture files are text. These paths are covered by the suite's QA-1 test only.

**Agent summary:** No secrets, no unsafe exec, no dependency change; boundary probed and held.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

GDPR, PCI-DSS, WCAG and HIPAA are all NOT_APPLICABLE. This is internal skill tooling that reads local agent transcripts, with no personal, payment, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:59` cites (task 327)
- **API/type-specific docs updated**: ✅ PASS — `skills/finalise/SKILL.md:730`, `:1026`; module header
- **README / architecture docs updated**: ⚠️ NOT_APPLICABLE — no public surface changed

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (gate 3, 92/100)
- PR Review: ✅ APPROVE (pr-review.1)
- CI reading 1: SUCCESS @ `fdcf01da16724a11529fe90781620c368020eda1` (6 checks)
- Acceptance Criteria: ⚠️ 12/14 (#6, #10 FAIL — medium)
- Security: ✅ PASS (23 probed, 0 reproduced)
- Compliance: ⚠️ NOT_APPLICABLE
- Docs: ✅ PASS

**Blocking Issues:**

1. #6: no stale-`--out` test for `transcript-ambiguous`, `empty-block` or `entity-escaped`. The code is right but untested for those three reasons.
2. #10: three new tests (`:351`, `:427`, `:436`) guard rules that already held before the change, so they could never be red before it. The criterion as written cannot be met for them. The owner decides whether to amend #10 (for example, to accept mutation-red evidence for guards of pre-existing rules) or to accept it as is.

**Fix-and-recheck:** not applicable. Both findings are medium, and there are two of them (`severity-low` and `no-other-finding-open` both fail).

**Outcome:** The task does NOT meet the Definition of Done. #10 needs an owner decision on the criterion. #6 needs three test cases, which is a code change and re-enters QA.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-26T21:28Z
**Total Duration:** 8 minutes
**CI reading 1:** SUCCESS @ `fdcf01da16724a11529fe90781620c368020eda1`

**Blocking Issues Summary:**

1. #6 — stale-`--out` coverage missing for 3 of 6 non-extracted reasons (medium)
2. #10 — 3 new tests guard pre-existing rules and were never red before their change; the committed record holds only a count (medium; criterion-owner decision)

**Estimated Effort to Close Gaps:** Small (about 30 minutes of tests, plus one QA cycle, once #10 is decided)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Decide #10: amend the criterion, or accept as is
- Add the three stale-`--out` cases for #6. This is a code change, so it re-enters QA before this verification re-runs.
- Re-run `/finalise` after that QA cycle
