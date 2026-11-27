# Definition of Done Verification

**Story/Task:** task.328.measured-criterion-re-measured-when-head-moves
**Verification Started:** 2026-11-27T08:40Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.328.qa.7.measured-criterion-re-measured-when-head-moves.md`
**Gate File Found:** `task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Gate head:** `5fbd512647537f1ee271d7c1b95a1c97383be351`

**Success Criteria Coverage (from QA):** 1–9 PASS (criterion 5 amended, owner-approved).

**NFR Validation (from QA):** Security PASS (reasoned, `boundary: false`) · Performance PASS · Reliability PASS · Maintainability PASS.

**Immediate Actions from QA:** None
**Future Actions from QA:** 4 (reason-list guard paraphrase; obs #193; obs #195; CI flake `tests/test-remote-runner.test.js:1047`)

**PR:** #960 (source: branch)
**PR Review:** `task.328.pr-review.1.measured-criterion-re-measured-when-head-moves.md` — CONCERNS, 0 open coverage findings (host requires no reviews; `reviewDecision` null)

**Record criteria:** `ok` — #5 and #6 records confirmed present in `task.328.qa.1…md` (§ Record — criterion 5, § Record — criterion 6).
**Re-run at head:** `not-configured`.
**AC YAML:** extracted from the agent's transcript (sha256 `1478198b6ed4…`, reply `handback`); record `task.328.dod.1.ac.json`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #960)
**PR Review Decision:** null — satisfied by `task.328.pr-review.1…md` (CONCERNS)
**Re-run scope:** full (no-prior-record) — 9 re-judged, 0 carried

### Acceptance Criteria

#### #1: Task 320 criterion 10, verbatim, listed with `measured: true`

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-record-preflight.js:63`
- Test evidence: `shared/resources/tests/finalise-record-preflight.test.mjs:206`

#### #2: Seven comparatives, with and without "no", make a record criterion

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-record-preflight.js:63`
- Test evidence: `shared/resources/tests/finalise-record-preflight.test.mjs:219` (all 7 members, both forms)

#### #3: A comparison with no number is not listed; a no-bound record reads `measured: false`

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-record-preflight.js:137`
- Test evidence: `shared/resources/tests/finalise-record-preflight.test.mjs:267`

#### #4: qa-task and qa-story cite Step 3, "unverified with re-measure"; a test guards citation and restatement

**Status:** ✅ PASS

- Code evidence: `skills/qa-task/SKILL.md:1095`, `skills/qa-story/SKILL.md:1630`
- Test evidence: `evals/shared/tests/qa-measured-figure-parity.test.mjs:130`, `:151`

#### #5: Corpus count of newly listed criteria, with every newly listed example by path, in the QA report

**Status:** ❌ FAIL (low)

- Code evidence: `task.328.qa.1…md:78`
- Note: the recorded count (375 → 376, one example, given as a glob) was taken on the cycle-1 regex. NUMERIC_BOUND was widened in cycles 3–5. At head the engine newly lists **4**: task.320 #10, task.59 #6 ("under ~15s"), task.76 #10 ("no more than ~55 lines"), task.94 #11 ("over ~300 lines") — re-checked by `/finalise` with the head engine on each document. The amendment the owner approved rested on "only one newly listed criterion exists"; that premise no longer holds, though the amended wording ("up to five") can still be met by updating the record.

#### #6: Every new test red before its change; red runs recorded in the QA report

**Status:** ❌ FAIL (medium)

- Code evidence: `task.328.qa.1…md:86`
- Note: engine tests and the skill-level parity tests have red-first records (qa.1, qa.3, qa.5, qa.6). 13 calibration tests in `qa-measured-figure-parity.test.mjs` (:214–:318) have none; qa.1:89 records that 4 of them "pass by design". Counter-reading (for the owner): the calibrations test the checker in the same file, so "every new test" arguably should not cover them. Narrowing it is a criterion change.

#### #7: Reverting any one remedy turns a named test red; mutation table in the QA report

**Status:** ❌ FAIL (medium)

- Code evidence: `task.328.qa.1…md:156`
- Note: 22 of 25 remedies have a mutation record. Unmapped: the finalise-delta.js bundling into qa-task/qa-story (Phase 2), CR4-4 (locate by lead — qa.5:18 says only "the calibration is live"), CR6-1 ("unverified on purpose" — qa.7:16, no mutation-proven line).

#### #8: `npm test` passes under `CI=true`; bundle leaves no diff; `bundle:check` 0

**Status:** ⏳ DEFERRED-CI — graded at Step 6 from CI reading 1

- Note: the PR head's `test` job failed on `not ok 8561 - lockctl take is atomic` (`tests/test-remote-runner.test.js`, outside the diff); `validate` (bundle check, bundle diff) passed.

#### #9: CHANGELOG `[Unreleased]` cites (task 328)

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:52`

### Advisory (not a gap)

- **#8**: the head's test red is the known lockctl concurrency flake (gate.7 future recommendation), unrelated to the diff.
- **#5**: the owner approved #5's amendment on a one-example premise; there are four.

### Documentation

- **QA skill files and preflight header updated**: ✅ PASS — `skills/qa-task/SKILL.md:1095`

**Agent summary:** #1–#4 and #9 PASS. #8 DEFERRED-CI. #5 FAIL low (stale corpus count). #6 FAIL medium (13 calibration tests with no red-first record). #7 FAIL medium (3 remedies with no mutation record).

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `skills/qa-task/references/bb-auth.js:23`
- Note: reads credentials from env only; no literals in added lines.

### No new unsafe patterns (eval/exec/shell)

**Status:** ✅ PASS
- Evidence: `skills/qa-task/references/finalise-delta.js:41`
- Note: child processes via `execFileSync`/`spawn` with argv arrays; no `shell: true`.

### NUMERIC_BOUND regex change (backtracking / effect)

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-record-preflight.js:63`
- Note: bounded optional groups; advisory listing only, exits 0.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none in the diff
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` unchanged

### Probe Results

**Boundary:** `true` — differs from gate.7's `boundary: false`. The PR adds bundled copies of `ci-tree-equivalence.js` (`isDocsPath`, a disqualified-from-internal entry) and `finalise-delta.js` to qa-task and qa-story, and the new SKILL.md prose has QA run `finalise-delta.js docs-only` to decide whether a figure counts. The criteria classifier returned `boundary: false, matched: []`; the rule fired on the diff.

**Candidates executed:** 48 — **reproduced:** 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held** — every candidate returned its expected verdict. 0 escapes, 0 refusals.

- Probe run by /finalise from the security agent's plan — 3 control(s), record `docs/tasks/task.328.measured-criterion-re-measured-when-head-moves/task.328.dod.1.security.run.json`
- Plan extracted from the agent's transcript (2045 bytes, sha256 `5d5b525816b9…`, reply `handback`); reusable plan `task.328.dod.1.security.plan.json`.

**Agent summary:** checklist clean; boundary true on the bundled isDocsPath and finalise-delta docs-only arm; the probes held.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** internal developer-tooling refactor; no personal data, payments, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:52`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/qa-task/SKILL.md:1092`
- Note: SKILL.md hunks are body-only; no catalog regeneration needed.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- Note: no public API, config or CLI change.

**Agent summary:** CHANGELOG cites (task 328); skill files and engine copies updated.

---
**CI-state criteria:** #8 → PASS (CI reading 1: SUCCESS after one re-run @ aee5f9efdd3a) — AC_OVERALL re-folded: PARTIAL

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI re-run:** attempt 1 FAILURE on test (Hermetic test suite), tests/test-remote-runner.test.js (`lockctl take is atomic`), @ aee5f9efdd3a; delta 5fbd51264753..aee5f9efdd3a is docs-only (`rerun-eligible`: eligible); attempt 2 SUCCESS @ aee5f9efdd3a
**CI reading 1:** SUCCESS after one re-run (see the CI re-run line) @ `aee5f9efdd3a49ed85709f24508ed3b7993f6c3f` over 6 checks

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, gate.7)
- Acceptance Criteria: ⚠️ 6/9 met (#5, #6, #7 not met)
- PR Review & Tests: ✅ pr-review.1 CONCERNS, 0 open coverage; CI green after one re-run
- Documentation: ✅ PASS
- Security Review: ✅ PASS (boundary held, 48 executed, 0 reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. #5 (low): corpus count is stale — the shipped engine newly lists 4 criteria, the QA report records 1 (and as a glob, not a path).
2. #6 (medium): 13 calibration tests in `qa-measured-figure-parity.test.mjs` have no red-first record.
3. #7 (medium): 3 remedies have no mutation record (finalise-delta.js bundling, CR4-4, CR6-1).

**Fix-and-recheck (8a):** not applicable — two medium findings in the AC section.

**Outcome:** Task does NOT meet Definition of Done. Gaps must be addressed before acceptance.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-27T08:59Z
**Total Duration:** 19 minutes

**Blocking Issues Summary:**

1. #5: corpus count of newly listed criteria stale (4 at head, 1 recorded); the owner-approved amendment premise ("one example") no longer holds
2. #6: no red-first record for 13 calibration tests
3. #7: no mutation record for the finalise-delta.js bundling, CR4-4 and CR6-1

**Estimated Effort to Close Gaps:** Small–Medium (evidence only: recount, red-first runs, three reverts; no code change expected)

**Artifacts Generated:**

- ✅ Gap report added to task document
- ✅ PR comment posted

**Next Steps:**

- Owner decides: one more evidence-only fix cycle, or reword #6 (and/or #7); acknowledge #5's premise
- A gap closed by changing code re-enters QA before this verification re-runs; a document-only fix re-runs it directly
- Re-run verification after fixes are implemented
