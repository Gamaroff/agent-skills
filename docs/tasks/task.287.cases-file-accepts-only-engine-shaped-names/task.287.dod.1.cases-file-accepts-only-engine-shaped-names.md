# Definition of Done Verification

**Story/Task:** task.287 — cases_file accepts only engine-shaped names
**Verification Started:** 2026-11-23T13:12Z

---

## Verification Results

---

## Step 1: QA Report Review ✅

**QA Report:** `task.287.qa.1.cases-file-accepts-only-engine-shaped-names.md`
**Gate File:** `task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml`
**Gate Status:** ✅ PASS — 95/100, `top_issues: []`
**PR:** #933 (source: branch). **PR Review:** `task.287.pr-review.1.cases-file-accepts-only-engine-shaped-names.md` — APPROVE (GitHub records no review decision; the repo requires none).
**NFR (from QA):** Security PASS, Performance PASS, Reliability PASS, Maintainability PASS.
**Advisory from QA:** CR-1 (low) — the pattern also accepts the bare name `.security.cases.json` and zero-padded indices; in the gate's `recommendations.future`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (13 of 13)
**PR Status:** OPEN (PR #933)
**PR Review Decision:** none on GitHub; the co-located pr-review report is APPROVE
**Re-run scope:** full (no-prior-record) — 13 re-judged, 0 carried

| Criterion | Status | Evidence |
| --- | --- | --- |
| #1 engine-shaped names accepted | ✅ PASS | `shared/resources/security-probe-plan.mjs:175`; `security-probe-plan-cases-file.test.mjs:354` |
| #2 `x.json`, `x.security.cases.a.json` refused | ✅ PASS | `security-probe-plan.mjs:201`; test `:366`, `:403` |
| #3 reuse check names `cases-file-bad-name-shape` | ✅ PASS | test `:403` |
| #4 task 269 plans still reuse | ✅ PASS | corpus control, test `:431` |
| #5 task.304 plan not reusable | ✅ PASS | corpus control, test `:431` |
| #6 no new test over one second | ✅ PASS | QA report: slowest 568–853 ms over five runs, loadavg beside each |
| #7 bad shape never reaches `lstat` | ✅ PASS | test `:384` |
| #8 mutation proof recorded | ✅ PASS | QA report `:132` (4 of 5 red, accepted-shape test green) |
| #9 `CI=true npm run ci:fast` | ✅ PASS | CI reading 1: `test` SUCCESS |
| #10 `quick_validate.py skills/finalise` | ✅ PASS | CI reading 1: `validate` SUCCESS |
| #11 `npm run bundle -- --check` | ✅ PASS | CI reading 1: `validate` SUCCESS |
| #12 CHANGELOG cites task 287 | ✅ PASS | `CHANGELOG.md:19` |
| #13 prompt and SKILL.md state the shape | ✅ PASS | `finalise-dod-security-prompt.md:431`; `skills/finalise/SKILL.md:800` |

**CI-state criteria:** #9, #10, #11 → PASS (CI reading 1 below) — AC_OVERALL re-folded: PASS

### Advisory (not a gap)

- **#1:** CR-1 above; confinement and the regular-file check still apply, so nothing unsafe is admitted.
- **#2:** the plan-entry reason string is asserted for `x.json` only; both names go through the same decision point.

### Documentation

- **Skill wording updated:** ✅ PASS — `skills/finalise/SKILL.md:800`

**CI reading 1:** SUCCESS @ `4b72c73bd35f` over 6 checks (`test`, `validate`, `link-check`, `secret-scan`, `shellcheck`, `PR into main comes from an allowed branch`). Read after waiting for `test` to finish.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

- No hardcoded secrets: ✅ PASS (read of `resolveCasesFile`; a grep of the PR diff for `eval(`, `exec(`, `child_process`, `password`, `secret`, `TODO`, `FIXME` on added lines found nothing)
- No new unsafe patterns: ✅ PASS (same grep)
- Dependency risk: ⚠️ NOT_APPLICABLE (no `package.json` change in the diff)

### Probe Results

**Probe plan extracted from the agent's transcript** (3861 bytes, sha256 `39b24ca2…b92a`); no previous DoD run, so no plan reuse.
**Probe run by /finalise from the security agent's plan** — 1 control (`casesFileAccepted`), record `task.287.dod.1.security.run.json`.
**Candidates executed:** 8 — **reproduced:** 0 — escapes: 0 — refusals: 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held** — every candidate returned its expected verdict (7 hostile refused, 1 legitimate accepted).

### Recommendations for the owner

- **Spec challenge:** the shape check keys on the suffix only, so a hand-named `x.qa.1.security.cases.json` is accepted. The task's own wording at line 98 allows it. The owner may want to tighten it to `.dod.<N>.security.cases`. Not a security finding. It is the same observation as QA's CR-1 (`recommendations.future`).

**Agent summary:** boundary true; the plan used inline `spec_ref` cases, not the QA cases file, because that file's name carries `.qa.1.` where the engine writes `.dod.<N>.`.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE (GDPR, PCI-DSS, WCAG, HIPAA: internal tooling change, no data, payment, UI or health scope)

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated:** ✅ PASS — `CHANGELOG.md:19` cites task 287
- **Type-specific docs:** ✅ PASS — `skills/finalise/SKILL.md:799`, `finalise-dod-security-prompt.md:431-432`; generated copies in the diff
- **README / architecture docs:** ⚠️ NOT_APPLICABLE — no public API, config or CLI change

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (95/100)
- Acceptance Criteria: ✅ 13/13
- PR Review & Tests: ✅ APPROVE (pr-review report); CI green on the PR head
- Documentation: ✅ CHANGELOG, SKILL.md and prompt
- Security Review: ✅ boundary probed, 8 executed, 0 reproduced
- Compliance Review: ⚠️ NOT_APPLICABLE

**Outcome:** the task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-23T13:17Z
**Total Duration:** 5 minutes
**CI reading 1:** SUCCESS @ `4b72c73bd35f` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD section, frontmatter `status: accepted`, `pr_number: 933`, Success Criteria ticked, Change Log row
- ✅ Task registry row ticked and staged
- ✅ Sprint Review summary created
- Outward side-effects (PR canonical comment) fire after this file is committed and pushed; their outcomes are recorded on the PR and in the implementation report. The task has no tracker issue, so there is no tracker close or board move.

**Next Steps:**

- Ready for Sprint Review
- No further action required
