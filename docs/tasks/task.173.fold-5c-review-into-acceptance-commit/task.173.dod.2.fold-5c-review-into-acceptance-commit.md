# Definition of Done Verification

**Story/Task:** task.173.fold-5c-review-into-acceptance-commit
**Verification Started:** 2026-10-08T17:04:06Z

Run 2. Run 1 (`task.173.dod.1.fold-5c-review-into-acceptance-commit.md`) found three gaps. The operator
resolved all three on 2026-10-08 (`d073291c`), as document-only changes. Run 1's gap report in the
task body is marked historical and superseded, and every criterion is verified afresh here.

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.173.qa.7.fold-5c-review-into-acceptance-commit.md` (7 QA cycles)
**Gate File Found:** `task.173.gate.7.fold-5c-review-into-acceptance-commit.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100

**NFR Validation (from QA):** Security ✅ PASS (reasoned), Performance ✅ PASS, Reliability ✅ PASS, Maintainability ✅ PASS

**Immediate Actions from QA:** None.
**Future Actions from QA:** 2 advisory items (CR7-1, CR6-2).

**Step 5c PR review:** `task.173.pr-review.1.fold-5c-review-into-acceptance-commit.md`, verdict ⚠️ CONCERNS. Both findings are now closed: PC-1 (both bug reports closed) and PC-2 (`pr_number: 613`).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (10/11 PASS)
**PR Status:** OPEN (PR #613)
**PR Review Decision:** null (single-maintainer repo). The Step 5c report `task.173.pr-review.1.fold-5c-review-into-acceptance-commit.md` returned CONCERNS, which satisfies this column.

### Acceptance Criteria

- **AC1–AC7, AC9:** ✅ PASS. Each has a code citation and a per-PR test, with the same evidence as run 1. AC1: `acceptance-commit-carries-5c.test.mjs:212`. AC2: `:614`. AC3: `:686`. AC4: `develop-pipeline-on-precompact.test.sh:581`. AC5: `:173`. AC6: `:235`. AC7: `:224`. AC9: `.github/workflows/test.yml:51`.
- **AC10, AC11:** ✅ PASS (documentation criteria). `CHANGELOG.md:8`; `develop-pipeline-step-5-6-qa-loop.md:1414`.
- **AC8** (as re-scoped: each added behaviour and each QA fix mutation-proved, with two named `no-red-untested` exceptions): ❌ FAIL. The added-behaviour half holds: the 8 initial proofs cover every §8 behaviour. The QA-fix half does not, because the exception list is incomplete.
  - `task.173.qa.3:70` records a **third** `no-red-untested`: CR2-2's doc-links "exit other than 0/1" HALT branch.
  - The implementation report records the CR3-1 work-item binding mutation as **`absorbed`**, with no follow-up proof.
  - Five prose-only fixes have neither a proof nor a named exception: CR-5, CR2-3, CR3-3, CR3-4 and CR4-1.
  - The two exceptions the criterion does name are accurate.

**Agent summary:** 10 of 11 criteria pass. AC8's re-scope (written at the operator's direction on 2026-10-08) under-counts the exceptions in the record.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS (measured on the classifier's predicate). The git-state arms rest on the recorded human override.

- **No hardcoded secrets:** ✅ PASS. The bundled `bb-auth.js` reads environment variables only.
- **No new unsafe patterns:** ✅ PASS. Every added `exec` is `execFileSync` with argv. The one `sh -c` (`ci-tree-equivalence.js`, `checkCommand`) is an unchanged task.172 copy.
- **No secrets in version control:** ✅ PASS. `develop-pipeline-on-precompact.sh:216` is a path-limited commit.
- **5c doc-only classifier holds under probe:** ✅ PASS. `isDocsPath` (the classify block's doc-only verdict, `develop-pipeline-step-5-6-qa-loop.md:1474`) was probed in both bundled copies, with the repo patterns and the defaults. 66 cases executed, 0 reproduced, 0 overblocked.
- **TLS, PII in logs, dependency risk:** ⚠️ NOT_APPLICABLE.

### Probe Results

**Candidates executed:** 66 (`totals.executed`, `task.173.dod.security.run.json`). **Reproduced:** 0.

✅ **The boundary held.** Every candidate returned its expected verdict.

**Override recorded, not hidden (task.133 / task.125 precedent):**

- **What the engine did not reach.** The classify and stage blocks' git-state refusal arms (untracked or dirty path, the not-cleared HALT, the HEAD-moved HALT) and the resume-contract set-aside probe. They are fenced bash inside Markdown, their input is repository state, and no engine form executes them (`shell-argv:` belongs to task.181).
- **Who decided.** The operator, on 2026-10-08 ("Go ahead", on the recommendation to sign off citing the suite). It is recorded in the task body's run-1 gap section and the implementation report's Decisions Log.
- **Evidence.** `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`, 38 cases under bash and zsh, run per PR. It executes those arms against scratch repositories. This is evidence for the override, not a probe count.

**Agent summary:** No secrets, no new unsafe patterns, no dependency changes. The exported predicate behind the boundary held under 66 executed probes.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. GDPR, PCI-DSS, WCAG and HIPAA do not apply. This is an internal refactor of pipeline commit scoping.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS. `CHANGELOG.md:9` and `:18` both cite task.173. The step, hook and finalise docs and the regenerated bundles are updated. README and architecture: NOT_APPLICABLE. The catalog needs no regeneration.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (100/100, gate 7)
- Acceptance Criteria: ⚠️ 10/11 (AC8)
- PR Review & CI: ✅ 5c review CONCERNS (no reviewer required). CI reading 1: SUCCESS @ `d073291c120209e2caabbe046f4e7ac3105bce92` over 5 checks (the head's own run)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (66 probes executed, plus the recorded override for the git-state arms)
- Compliance Review: ⚠️ NOT_APPLICABLE

Fix-and-recheck (Step 8a) does not apply. The AC8 finding is a mismatch between the criterion text and the record, not a defect reproduced by execution, so the step's mutation-proved precondition cannot be met.

**Blocking Issues:**

- [ ] AC8: correct the re-scoped criterion's exception list to match the record. Add CR2-2's HALT branch (`no-red-untested`, qa.3:70) and CR3-1's binding (`absorbed`). Either name the five prose-only fixes (CR-5, CR2-3, CR3-3, CR3-4, CR4-1) as having no guarding test, or limit the criterion to fixes that have one.

**Outcome:** The task does NOT meet the Definition of Done. One document-only gap remains.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-08T17:08:24Z
**CI reading 1:** SUCCESS @ `d073291c120209e2caabbe046f4e7ac3105bce92` over 5 checks

**Blocking Issues Summary:**

1. AC8: the re-scoped criterion's exception list is incomplete

**Estimated Effort to Close Gaps:** Small (a criterion edit, document-only)

**Next Steps:**

- Correct AC8's exception list. A document-only fix resumes at Step 7 and re-runs this verification
