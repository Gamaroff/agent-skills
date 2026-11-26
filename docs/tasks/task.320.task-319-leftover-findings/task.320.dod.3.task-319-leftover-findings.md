# Definition of Done Verification

**Story/Task:** task-319-leftover-findings
**Verification Started:** 2026-11-26T07:19Z

---

## Verification Results

_DoD results are in the four consolidated sections below (Steps 2, 3, 4 and 4b)._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.320.qa.7.task-319-leftover-findings.md`
**Gate File Found:** `task.320.gate.7.task-319-leftover-findings.yml`

**Gate Status:** ⚠️ CONCERNS. `top_issues` is empty. Security is CONCERNS on the residual T320-CR-601/602/603, which the owner deferred to task.326 (`deferrals.json`).
**Quality Score:** 90/100
**PR Review (5c):** `task.320.pr-review.3.task-319-leftover-findings.md` reads ✅ APPROVE. It raised 2 low trail findings: PC-1 was carried, and PC-2 is in the implementation report, which Step 8 commits.

**Prior runs:** `task.320.dod.1` and `task.320.dod.2` both found GAPS (3). Their body sections are marked historical and superseded, and this run judges afresh.

**NFR Validation (from QA):**

- Security: ⚠️ CONCERNS (deferred residual only; 194 executed, 0 escaped)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** close the residual in task.326, plus 4 doc nits (CR-1 to CR-5)

**PR:** #949 (source: branch)

---

## Step 2: Core Acceptance Criteria & PR Review

**Re-run scope:** scoped (prior-record, `task.320.dod.2.ac.json`): 6 re-judged (#1 and #10 reported gaps; #11 to #14 evidence changed), 11 carried.
**Re-run at head:** not-configured.
**Record:** `task.320.dod.3.ac.json` at head `dbdb8f1395eda27564306099004706554592c309`.
**Extraction:** hand-copied (unverified). `finalise-rerun-scope.js extract` answered `transcript-unreadable` (observation #185), so the YAML was taken from the agent's SubagentHandback text.

### Acceptance Criteria

**Result:** ⚠️ 16 of 17 PASS. #10 FAILS (low).

| # | Status | Evidence |
| --- | --- | --- |
| 1 | ✅ PASS | `finalise-rerun-at-head.js:1004`, test `:1246`. The appended amendment moving T320-CR-601 to task.326 is approved, so it does not fail the criterion (`criteria-drift.js`: appended, approved) |
| 2 | ✅ PASS | `finalise-rerun-at-head.js:1033`, test `:1354` |
| 3 | ✅ PASS | `finalise-rerun-at-head.js:754`, test `:1382` |
| 4 | ✅ PASS | `push-held.sh:161`, `push-policy.test.mjs:1429` |
| 5 | ✅ PASS | `push-held.sh:101`, `push-policy.test.mjs:1322` |
| 6 | ✅ PASS | `tick-pr.sh:120`, `tick-pr.test.mjs:647` |
| 7 | ✅ PASS | `tick-pr.sh:102`, `skills/develop-next/SKILL.md:659`, `configuration.md:320` |
| 8 | ✅ PASS | `ci-tree-equivalence.js:400`, the three suites' escaped-key cases |
| 9 | ✅ PASS | `ci-tree-equivalence.js:622`, `push-policy.test.mjs:214` |
| 10 | ❌ FAIL (low) | The five timed runs (`task.320.qa.6`:95-113) were taken at `7cae65a14`. `finalise-delta.js docs-only --base 7cae65a14 --head HEAD` answers `code-changed`: `skills-config.yaml` changed in `7f22f93d2`. The figures meet the bound (slowest median 26.0 s, max 27.1 s), but they must be re-measured at a head that is tree-equivalent to the acceptance head |
| 11 | ✅ PASS | QA reports 1, 4, 5 and 6 red-before rows (lines moved only) |
| 12 | ✅ PASS | QA reports 1 to 6 mutation tables (lines moved only) |
| 13 | ✅ PASS | QA report 7:146-148 at `7f22f93d2`, which is tree-equivalent to the head |
| 14 | ✅ PASS | QA report 7:147 |
| 15 | ✅ PASS | `CHANGELOG.md:16` |
| 16 | ✅ PASS | `configuration.md:312` |
| 17 | ✅ PASS | `task.319`:483-489 |

### Advisory (not a gap)

- #1: `criteria-drift.js` extracts the approver as "Lorien Gamaroff (2026-11-26)", not the bare configured name. It still reads approved. QA 7 CR-5 names the fix.
- #10: the command block in QA report 6:118-122 uses `$out` and `$n` without setting them and does not show the five-run loop (QA 7 CR-1). The re-measurement should record the full loop.

### Documentation

✅ PASS. The configuration reference and the develop-next SKILL.md were updated where behaviour changed.

**PR review and tests:** ✅ 5c PR review 3 APPROVE. No host review is required (`reviewDecision` null).

---

## Step 3: Security Review

**Result:** ✅ PASS. Every reproduced probe is deferred by the owner, and none escaped.

### No hardcoded secrets introduced

✅ PASS. The one new config value since run 2 is an owner name (`finalise.deferralApprover`), not a credential (`skills-config.yaml:75-79`).

### No new unsafe patterns (eval / exec / shell.run)

✅ PASS. The `exec(` hits are `RegExp.prototype.exec` and an injectable `execFileSync` with argv arrays and no shell.

### General Security

- Security TODOs and FIXMEs: ✅ none.
- Dependency risk: NOT_APPLICABLE, because `package.json` is unchanged.

### Probe Results

**Boundary:** true. Signals: `refused`, `refuses`.
**Plan:** reused from `task.320.dod.2.security.plan.json` (`security-probe-plan.mjs reuse`: `reusable`, no probed engine changed). 22 controls.
**Record:** `task.320.dod.3.security.run.json`. Cases: `task.320.dod.3.security.cases.{1..22}.json`.
**Totals:** probes_executed 194, reproduced 8 (6 case ids), escaped 0, refused 0.
**Observation limits:** what a target does with an accepted value (a remote shell, a spawned process) is not observed. An accepted hostile case counts as reproduced, and a refused one as held.

Each reproduced case has a `spec_ref` that matches its line, so all of them are real findings. All six case ids match `deferrals.json` (item 5a, approver from `finalise.deferralApprover`), so they move to `deferred_probes[]`, and `probes[]` is empty:

| Case | Controls | Deferral | Source |
| --- | --- | --- | --- |
| hostile-explicit-key-with-a-comment | 19, 20 | deferred (owner Lorien Gamaroff, 2026-11-26, task.326) | record deferrals[0] |
| hostile-alias-key | 19, 20 | deferred (owner Lorien Gamaroff, 2026-11-26, task.326) | record deferrals[1] |
| hostile-opener-inside-a-details-block | 21 | deferred (owner Lorien Gamaroff, 2026-11-26, task.326) | record deferrals[2] |
| hostile-opener-inside-a-div-block | 21 | deferred (owner Lorien Gamaroff, 2026-11-26, task.326) | record deferrals[3] |
| legit-indented-closed-comment-with-a-fence-marker | 21 | deferred (owner Lorien Gamaroff, 2026-11-26, task.326) | record deferrals[4] |
| legit-closed-comment-in-a-list-item | 21 | deferred (owner Lorien Gamaroff, 2026-11-26, task.326) | record deferrals[5] |

---

## Step 4: Compliance Review

⚠️ NOT_APPLICABLE. GDPR, PCI-DSS, WCAG and HIPAA do not apply. This is internal CI, push and config tooling, with no PII, payment, UI or health data.

---

## Step 4b: Docs & Changelog

### CHANGELOG.md updated

✅ PASS. `CHANGELOG.md:16` and `:27` cite (task 320).

### API/type-specific docs updated

✅ PASS. `docs/reference/configuration.md:312`, `:320` and `:466`, plus the finalise and develop-next SKILL.md bodies. No frontmatter changed, so the catalog does not need regenerating.

### README / architecture docs updated

NOT_APPLICABLE. No new public API or command was added.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Gate: CONCERNS (90/100), `top_issues` empty
- Acceptance Criteria: ⚠️ 16/17 (#10 fails, low)
- PR Review & Tests: ✅ 5c review APPROVE (no host review required)
- CI reading 1: SUCCESS @ `dbdb8f1395eda27564306099004706554592c309` over 6 checks
- Documentation: ✅ PASS
- Security Review: ✅ PASS. 194 executed, 0 escaped, and all 8 reproductions are deferred to task.326
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. **AC #10 (low):** the per-test timings were measured at `7cae65a14`, which is not tree-equivalent to the head (`skills-config.yaml` changed in `7f22f93d2`). To close it, re-measure: five sequential runs of the four suites at the current head, recording `uptime` and the full command loop, in a committed QA report. This is a document-only change, so verification re-runs directly.

**Step 8a:** not applicable. The finding is stale evidence, not a result this run produced by execution.

**Outcome:** The task does NOT meet the Definition of Done on one low gap. Everything else passes, and the residual is formally deferred to task.326.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-26T07:25Z
**Total Duration:** 6 minutes
**CI reading 1:** SUCCESS @ `dbdb8f1395eda27564306099004706554592c309` (the decision reading)

**Blocking Issues Summary:**

1. AC #10: re-measure the per-test timings at a head tree-equivalent to the acceptance head

**Estimated Effort to Close Gaps:** Small. One timing run of about 10 minutes plus a QA report edit, document-only.

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Re-measure #10 at the current head and record it in QA report 7
- A document-only fix re-runs this verification directly
