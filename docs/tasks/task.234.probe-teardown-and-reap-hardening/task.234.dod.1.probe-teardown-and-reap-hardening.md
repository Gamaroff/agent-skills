# Definition of Done Verification

**Story/Task:** task.234.probe-teardown-and-reap-hardening
**Verification Started:** 2026-10-31T13:25Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.234.qa.7.probe-teardown-and-reap-hardening.md`
**Gate File Found:** `task.234.gate.7.probe-teardown-and-reap-hardening.yml`
**PR:** #800 (source: branch)

**Gate Status:** ✅ PASS
**Quality Score:** 95/100

**Success Criteria Coverage (from QA):** A, B, D, the killed-probe case, the leash and wall time all PASS (QA 7, § Success Criteria Verification).

**NFR Validation (from QA):** Security PASS (`boundary: false`), Performance PASS, Reliability PASS, Maintainability PASS.

**Immediate Actions from QA:** None. `top_issues` is empty; TASK-234-QA-1 to QA-12 are closed.
**Future Actions from QA:** 5, in `recommendations.future`.
**Step 5c:** `task.234.pr-review.1.probe-teardown-and-reap-hardening.md`, verdict CONCERNS. Its two doc-only findings (PC-1, PC-2) were fixed and ride the acceptance commit; `OPEN_COVERAGE=0`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #800)
**PR Review Decision:** null (no required reviewers). Satisfied by `task.234.pr-review.1.probe-teardown-and-reap-hardening.md`: CONCERNS, with no open coverage finding.
**Re-run scope:** full (no-prior-record) — 9 re-judged, 0 carried

### Acceptance Criteria

| # | Criterion | Status | Code evidence | Test evidence |
|---|---|---|---|---|
| #1 | PATH_MAX-deep mode-000 leaf no longer crashes; sandbox removed | ✅ PASS | `shared/resources/security-probe.mjs:970` | `shared/resources/tests/security-probe.test.mjs:7521` |
| #2 | Teardown never changes a mode outside the sandbox | ✅ PASS | `shared/resources/security-probe.mjs:992` | `security-probe.test.mjs:7552`, `:7849` |
| #3 | A late background write is killed before absent/removed are read | ✅ PASS | `shared/resources/security-probe.mjs:2456`, `:2085` | `security-probe.test.mjs:7595`, `:7631` |
| #4 | A, C, D red on develop and green after; B red under mutation | ✅ PASS | implementation report :80–85 | `security-probe.test.mjs:7489` |
| #5 | Wall time grows by no more than the D waits (about 0.6 s per site) | ❌ FAIL | implementation report :274 | measured criterion |
| #6 | Each fix is mutation-proved | ✅ PASS | implementation report :81 | `security-probe.test.mjs:7521` |
| #7 | `npm run ci`, `bundle:check`, lint-shell pass | ✅ PASS | QA 7 :60 | `.github/workflows/test.yml:58` |
| #8 | `probe-boundary-rule.md` states the reap and its `setsid` limit | ✅ PASS | `shared/resources/probe-boundary-rule.md:223` | documentation |
| #9 | CHANGELOG `[Unreleased]` records the change | ✅ PASS | `CHANGELOG.md:71` | documentation |

- #5 note: the last measurement, taken after the leash (QA fix 2), is +1.7 to +3.2 s beyond the D waits at load 3.3–4.4. The bound is about 1.2 s, so it is missed. The agent added the criterion's "accepted as the cost" note during the QA loop, and no one approved it.

### Advisory (not a gap)

- **#6**: the QA-cycle fix TASK-234-QA-5 (`reapGroup` EPERM) has no mutation proof; it rests on reasoning alone.

**Agent summary:** 8/9 PASS; #5 fails on the measured wall-time bound.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL

- **No hardcoded secrets introduced**: ✅ PASS — `shared/resources/security-probe.mjs:1076`
- **No new unsafe patterns**: ✅ PASS — `shared/resources/security-probe.mjs:1008`. Spawns use argv form, and the leash script is fixed; the case reaches it only as `"$@"`.
- **probe mode executed no candidates**: ❌ FAIL (medium) — `shared/resources/security-probe.mjs:994`. The boundary rule fired on two counts: the word "never" in criterion #2, and the `forceRemoveTree` root check, which refuses on filesystem state that a case controls. No engine form can reach that check safely. The module form cannot stage a swapped root, and corpus paths would go to `chmod -R` / `rm -rf`. So the plan is empty.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE

### Probe Results

**Candidates executed:** 0 — **reproduced:** 0

❌ **Probe mode executed no candidates.** The engine declined the entry because no form reaches it. Only two things clear this: (1) make the entry reachable and re-probe, or (2) record a human override. The evidence for an override is the mutation-proved unit test at `shared/resources/tests/security-probe.test.mjs:7849` (QA-4) and the race limit stated in `probe-boundary-rule.md:252-256`. The QA gates had recorded `boundary: false`; this DoD run disagrees.

**Agent summary:** the checklist is clean; the zero-guard FAIL needs a recorded override.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. The change is internal probe tooling and handles no personal, payment, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:71`
- **API/type-specific docs updated**: ✅ PASS — `shared/resources/probe-boundary-rule.md:223`; bundled copies regenerated
- **README / architecture docs**: ⚠️ NOT_APPLICABLE

---

### Owner decisions (2026-10-31)

The two FAILs above were put to the owner. Both were settled by recorded decision, not by a change to the code:

1. **#5 wall time:** the amendment is **approved by Lorien Gamaroff**. The leash's cost (+1.7 to +3.2 s, about 7–10%) is accepted. The approval is recorded in the criterion itself, so #5 → ✅ PASS (amended, owner-approved).
2. **Security, zero probes executed:** the **human override is approved by Lorien Gamaroff**. The evidence is the mutation-proved QA-4 unit test (`shared/resources/tests/security-probe.test.mjs:7849`) and the race limit stated in `probe-boundary-rule.md:252-256`. This is an override, not a closure: the guard was never probed by the engine. Making `forceRemoveTree`'s root guard reachable by an engine form remains future work. Security → ✅ PASS (by recorded override).

The gate files are not edited. Gate 7 is QA's record and stays as written (`boundary: false`); this DoD is where the disagreement and the override are recorded.

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED. Both FAILs were settled by the owner decisions above.

**Summary:**

- QA Report: ✅ PASS (95/100, gate 7)
- Acceptance Criteria: ⚠️ 8/9 (#5 wall-time bound missed)
- PR Review & Tests: ✅ 5c review CONCERNS, no open coverage finding
- Documentation: ✅ PASS
- Security Review: ❌ FAIL (probe zero-guard; needs a recorded override)
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: SUCCESS @ `ce15a175` (6/6 checks)

Step 8a (fix-and-recheck) did not apply: two sections were FAIL, and neither gap is a code defect.

**Outcome:** The task meets the Definition of Done, with the two owner decisions recorded above.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-31T13:40Z
**CI reading 1:** SUCCESS @ `ce15a175e5ca` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed. It is recorded on the PR canonical summary comment and in the implementation report.

**Artifacts Generated:**

- ✅ Task document: `status: accepted`, DoD section, Change Log 1.2, registry row ticked (staged)
- ✅ Sprint Review summary created
- ✅ CHANGELOG task 234 entry extended for the leash hardening (QA-7 to QA-12)
- The PR canonical comment, the tracker close and the board move run after this file is pushed. Their outcomes are recorded on the PR comment and in the implementation report.

**Next Steps:**

- Merge PR #800 (develop-next Step 3)
