# Definition of Done Verification

**Story/Task:** task.209.setup-consumer-agent-links
**Verification Started:** 2026-10-14T17:01:33Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.209.qa.7.setup-consumer-agent-links.md`
**Gate File Found:** `task.209.gate.7.setup-consumer-agent-links.yml`
**Gate Status:** ✅ PASS · **Quality Score:** 100/100
**QA cycles:** 7 (two past the 5-cycle budget, owner informed)
**PR:** #660 (source: branch) — the acceptance PR on `chore/task.208-209-pipeline-catchup`. The implementation merged earlier as #659 without the pipeline; this branch carries the retroactive PR review, QA, fixes and acceptance.
**PR review report:** `task.209.pr-review.1.setup-consumer-agent-links.md` (verdict CONCERNS, cycle-1 findings since fixed)
**Immediate Actions from QA:** None · **Future Actions from QA:** advisory items in the gate's `recommendations.future`

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #660) · **PR Review Decision:** none required — review report `task.209.pr-review.1.setup-consumer-agent-links.md`

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC1 Ticked agents get exactly their links, gitignored | ✅ PASS | `setup-consumer.sh:2100`; tests `:556`, `:145`, `:168` |
| SC2 Nothing existing replaced or deleted | ✅ PASS | `setup-consumer.sh:1971`; tests `:181`, `:205`, `:304` |
| SC3 Works without a terminal via --link-agents | ✅ PASS | `setup-consumer.sh:2049`; tests `:387`, `:145`, `:244`, `:265` |
| SC4 --links-only covers a new clone | ✅ PASS | `setup-consumer.sh:2262` |
| SC5 Tests pass and each guard is mutation-proved | ❌ FAIL | No committed mutation record for wrap-around and pre-tick; the no-terminal guard's mutation was absorbed (no test red); CI `test` pending |
| SC6 Owner's real-terminal check (Linux; macOS deferred to task.210) | ✅ PASS | gate 7 `evidence.owner_check`; pinned by the narrow-terminal pty test `:489` |

---

## Step 3: Security Review

**Overall Security Status:** ❌ FAIL · boundary: true · **Probes executed:** 9 (`task.209.dod.1.security.run.json`, run by /finalise — the security agent could not execute it)

- `agent-ids.typo-after-newline` — input `claude<newline>claud` expected **rejected**, got **accepted**: `IFS=',' read` reads one line, so ids after a newline are never checked and the run exits 0 (`setup-consumer.sh:2022`, `:2052`). Medium.
- All other hostile ids rejected; legitimate ids accepted. No secrets, no eval, no dependency change.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — developer tooling; the terminal list is keyboard-only and skippable with `--link-agents`.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS — CHANGELOG `[Unreleased]` Added entry; getting-started §1a, step 8b and usage.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** PENDING @ `8fc5c24b` (PR #660 `test` job running)

**Outcome:**

- [ ] Security: an id after a newline in `--link-agents` is never checked (exit 0)
- [ ] SC5: record the wrap-around and pre-tick mutation proofs, and make the no-terminal guard observable (clean stderr) so its mutation goes red
- [ ] SC5: PR #660 CI green on the fix head

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-10-14T17:05:26Z

**Next Steps:** fix the gaps, re-run QA on the change, re-run `/finalise` (dod.2).
