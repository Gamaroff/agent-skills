# Definition of Done Verification

**Story/Task:** task.276 — Halts and re-entries leave and read true state
**Verification Started:** 2026-11-16T06:19Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Reports:** `task.276.qa.1`, `qa.2`, `qa.3`
**Gate:** `task.276.gate.3.halts-and-re-entries-leave-and-read-true-state.yml` — PASS, 92/100, head `fb9b6bce4`
**PR:** #913 (source: branch). Review decision empty (no review required); the co-located `task.276.pr-review.1` report (verdict CONCERNS, 0 open coverage findings) satisfies the PR-review column.
**Re-run scope:** full (no-prior-record) — 8 criteria judged, none carried.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (3 PASS, 1 DEFERRED-CI, 4 FAIL)
**PR Status:** OPEN (PR #913)

### Acceptance Criteria

#### #1: After each HALT path the lock is absent and the snapshot present

**Status:** ✅ PASS

- Code evidence: `shared/resources/advance-pipeline-lock.sh:323`
- Test evidence: `shared/resources/advance-pipeline-lock.test.sh:1100`; `tests/halt-fence.test.js:71`

#### #2: `--restore` refuses a gaps snapshot and the re-entry script succeeds from it, shown by a test that runs the two in order and recorded in the QA report

**Status:** ❌ FAIL (low)

- Code evidence: `shared/resources/advance-pipeline-lock.sh:501`
- Test evidence: refusal pinned at `advance-pipeline-lock.test.sh:1066`; re-entry success pinned separately at `reenter-qa-after-finalise.test.sh:189`. No single test runs the two in order, and no QA report names one.
- Note: both behaviours work; the gap is the missing ordered test and its record.

#### #3: The budget base equals the number of distinct QA cycles

**Status:** ✅ PASS

- Code evidence: `shared/resources/qa-report-cycles.sh:14`
- Test evidence: `shared/resources/qa-report-cycles.test.sh:50`

#### #4: `CI=true npm test` wall time within 10% of `develop`, median of five alternating runs

**Status:** ✅ PASS

- Evidence: `task.276.qa.3` wall-time table — develop 747 s, branch 753 s (+0.8%), all ten runs rc 0. Measured on `fb9b6bce4`, tree-equivalent to the head (the delta is task documents only).

#### #5: Each change has a mutation proof in the QA report

**Status:** ❌ FAIL (medium)

- Proven in a QA report: restore guard, live step-7 lock branch, 5b complete test, distinct count, grant base read, foreign-lock and `LC_ALL=C` fixes, relative-lock guard (`qa.1:123-127`, `qa.2`, `qa.3:140`).
- No named revert and red test in any QA report: `--halt`, `--newest-dod`, the HALT fences (`tests/halt-fence.test.js`), the step-8 checklist test change. `qa.1:130` says only that `--halt` "was also mutation-proven" earlier, which the implementation report (uncommitted at this point) does not detail either.
- The `canon()` strip was recorded `no-red-dead` (`qa.3:141`).

#### #6: `bundle --check` reports 0 problems; `CI=true npm test` passes

**Status:** ⏳ DEFERRED-CI — graded from CI reading 1. Bundle half recorded clean at `qa.1:136` and `qa.3:54`.

#### #7: `shellcheck` is clean on the changed scripts

**Status:** ❌ FAIL (low)

- `qa.3:149`: shellcheck is not installed on the QA host and was not run in cycle 3. The cycle 2 and 3 edits to `resume-prompt-check.sh` were never linted locally. CI's `shellcheck` check on the head is green, which may close this at the CI reading.

#### #8: Every caller of `--restore` is listed with its `git grep`, each correct under the guard

**Status:** ❌ FAIL (low)

- The executable callers are correct under the guard, but the cited line numbers are stale (re-entry `:276` is now `:291`, grant `:216` is now `:225`, the `--which` calls moved) and three message sites that tell an operator to run a plain `--restore` are not listed: `set-qa-phase.sh:62`, `set-waiting-on.sh:103`, `develop-pipeline-on-precompact.sh`.

### Advisory (not a gap)

- T276-QA-6 and T276-QA-7 (low) stay open in the gate's `recommendations.future`; they touch the advisory resume check only.

### Documentation

- **CHANGELOG**: ✅ PASS — `CHANGELOG.md:9` cites (task 276).
- **Behaviour docs**: ❌ FAIL (low) — `shared/resources/pipeline-resume-detector-prompt.md:121` still tells the detector to count cycles with `grep -c '^### QA Cycle'`, the doubled count this task replaced (obs #135). `develop-pipeline-pause.md:84` does not mention the new `--restore` refusal, `--allow-dod-gaps` or `--halt`. `develop-pipeline-hooks.md:115` still describes the HALT path as "snapshot, then rm lock".

---

## Step 3: Security Review

**Story Type:** infrastructure
**Overall Security Status:** ✅ PASS

- No hardcoded secrets; no unsafe patterns in the `--halt` write (`jq --arg`, mktemp + mv, snapshot before lock removal).
- The restore guard recognises a DoD-gaps halt by state (`halt_step` 7 plus the newest DoD reading GAPS), not by a token (`advance-pipeline-lock.sh:501`).

### Probe Results

**Candidates executed:** 44 — **reproduced:** 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held** — every candidate returned its expected verdict.

- Probe run by /finalise from the security agent's plan — 5 controls, record `task.276.dod.1.security.run.json`. Plan extracted from the agent's transcript (9081 bytes, sha256 `dd9b1c4d…`).
- The security agent set `boundary: true`, differing from QA gate 3's `internal`; the probes ran and held either way.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — internal pipeline tooling; no personal data, payments, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ❌ FAIL (low) — see the Documentation list under Step 2.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — GAPS IDENTIFIED

**Summary:**

- QA Gate: ✅ PASS (92/100)
- Acceptance Criteria: ⚠️ 3 of 8 PASS, 4 FAIL, 1 deferred to CI
- Docs: ❌ one stale behaviour-doc line
- Security: ✅ PASS (44 probes, 0 reproduced)
- Compliance: not applicable
- CI reading 1: the head's `test` job was still `IN_PROGRESS` when the decision was taken; five other checks green

Fix-and-recheck (Step 8a) does not apply: two sections are FAIL.

**Outcome:**

- [ ] Add a test that runs `--restore` (refused on a gaps snapshot) and then `reenter-qa-after-finalise.sh` (succeeds) in order, and record it in the QA report (criterion 2)
- [ ] Record a named mutation proof (revert, red test, outcome token) for `--halt`, `--newest-dod`, the HALT fences and the step-8 checklist test change in a QA report (criterion 5)
- [ ] Run `command npm run lint:shell` on the changed scripts (CI-parity container) and record the result (criterion 7)
- [ ] Correct the `--restore` caller list's line numbers and list or reword `set-qa-phase.sh`, `set-waiting-on.sh` and `develop-pipeline-on-precompact.sh` (criterion 8)
- [ ] Update `pipeline-resume-detector-prompt.md:121` to count cycles with `qa-report-cycles.sh`, and refresh `develop-pipeline-pause.md:84` and `develop-pipeline-hooks.md:115` (docs)

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-16T06:22Z
**Total Duration:** 3 minutes

**CI reading 1:** not taken as a verdict — the head test job was still IN_PROGRESS; five other checks SUCCESS

**Artifacts Generated:**

- Gap report added to the task document
- Security probe record, plan and cases files beside this file

**Next Steps:** address the five gaps in Step 5; a gap closed by changing code re-enters QA before this verification re-runs; a document-only fix re-runs it directly
