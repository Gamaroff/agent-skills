# Definition of Done Verification

**Story/Task:** task.331.ac-merge-refuses-another-documents-result
**Verification Started:** 2026-11-27T16:30Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.331.qa.3.ac-merge-refuses-another-documents-result.md`
**Gate File Found:** `task.331.gate.3.ac-merge-refuses-another-documents-result.yml`
**PR Review:** `task.331.pr-review.1.ac-merge-refuses-another-documents-result.md` — CONCERNS (PC-1, doc-only, fixed in the 5c carry)

**Gate Status:** ✅ PASS
**Quality Score:** 95/100

**NFR Validation (from QA):**

- Security: ✅ PASS (boundary: internal)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** 5 advisories (stem-key the scope and extract files; split `scope-document-mismatch`; CHANGELOG resume detail; make `--doc` required; earlier advisories)

**PR:** #962 (source: branch)
**Record criteria:** ok — #5 confirmed in `task.331.qa.1…md:146-147` (both § 8 mutations, each with the test it turned red)
**Re-run at head:** not-configured

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #962)
**PR Review Decision:** null (no review required); satisfied by `task.331.pr-review.1.ac-merge-refuses-another-documents-result.md`, verdict CONCERNS
**Re-run scope:** full (no-prior-record) — 8 re-judged, 0 carried
**AC YAML:** extracted from the agent's transcript (reply: handback), 9776 bytes, sha256 `b38d8bdf16c7…`; record `task.331.dod.1.ac.json`, `verified: true`

### Acceptance Criteria

#### #1: Every row of the § 8 table holds in a test

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-rerun-scope.js:1242`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:2328` (rows at :2328, :2339, :2347, :2353)

#### #2: Step 3c merge and Step 6 action 2a blocks read the stem-keyed paths

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:1063`
- Test evidence: `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:273`, `shared/resources/tests/finalise-deferred-ci.test.mjs:453`

#### #3: SKILL.md names every AC result and merged path with `${STEM}`

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:1024`, `:1058`, `:1063`, `:1677`; the calibrated grep reads 0
- Test evidence: documentation criterion

#### #4: Performance — not applicable

**Status:** ✅ PASS

- Code evidence: `task.331…md:333`; § 8 Performance Tests reads "Not applicable"

#### #5: Every § 8 mutation recorded with the test it turned red

**Status:** ✅ PASS

- Evidence: `task.331.qa.1…md:146`, `:147`

#### #6: `npm run test:remote` and `npm run bundle:check` pass

**Status:** ✅ PASS (graded at Step 6 from CI reading 1)

- Evidence: CI reading 1 SUCCESS @ `63a3d161e` (test, validate incl. bundle check); QA 3 fast gate 8963/0

#### #7: Step 3c `result-document-mismatch` arm HALTs and names the remedy

**Status:** ❌ FAIL (severity low)

- Code evidence: `skills/finalise/SKILL.md:1074`
- Test evidence: not found — FAIL
- Note: the arm is present and correct, but no test runs it. The eval Step 3c test drives only the `scope-document-mismatch` arm.

#### #8: CHANGELOG `[Unreleased]` names both changes of § 5

**Status:** ✅ PASS

- Evidence: `CHANGELOG.md:20-33`

**CI-state criteria:** #6 → PASS (CI reading 1: SUCCESS @ 63a3d161e) — AC_OVERALL re-folded: PARTIAL

### Advisory (not a gap)

None.

### Documentation

- **finalise skill prose describes the new refusals and stem-keyed state paths**: ✅ PASS — `skills/finalise/SKILL.md:1035`

**Agent summary:** 7 PASS, 1 FAIL (low): #7's HALT arm is present and correct but no test runs it.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:734`

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:751` — path.resolve and realpathSync only, fails closed

### boundary: internal reason valid against the disqualified-entries table

**Status:** ✅ PASS
- Evidence: `task.331.gate.3…yml:32`

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — package.json not in the diff

### Probe Results

⚠️ **Internal artefact — not probeable by the engine**: `shared/resources/finalise-rerun-scope.js#sameDocument` is a module-private comparator reached through the merge CLI. Its inputs are the AC agent's `story_file`, the scope JSON Step 3a wrote, and the `--doc` path Step 3c substitutes. No corpus sink has legitimate cases that are documents it accepts. This is a recorded decision, not the zero-guard.

### Recommendations for the owner

These are not security findings and do not count against the verdict above.

- **Spec challenge:** an AC result with no `story_file` — allowed by `task.331…md:111`. It merges without the document check, so its only remaining guard is the optional `--sha256`.
- **Spec challenge:** `merge` without `--doc` — allowed by `task.331…md:121`. A caller that leaves it out skips the scope check (gate 3 CR-4: make `--doc` required).

**Agent summary:** PASS. No secrets, unsafe calls, security TODOs or new dependencies; the internal boundary entry holds.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** an internal CLI engine, tests and skill prose; no personal, payment, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:20`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/finalise/SKILL.md:1024`; frontmatter unchanged, no catalog regeneration needed

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

**Agent summary:** all docs checks pass.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 95/100)
- Acceptance Criteria: ⚠️ 7/8 (#7 untested)
- PR Review & Tests: ✅ pr-review.1 CONCERNS (no review required by the host); tests in CI
- CI reading 1: SUCCESS @ `63a3d161e1c4` over 6 checks
- Documentation: ✅ PASS
- Security Review: ✅ PASS
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. AC #7 (§ 9 Migration, low): the Step 3c `result-document-mismatch` arm is present but no test runs it.

**Fix-and-recheck (Step 8a) not taken:** the finding came from reading, not execution, and no engine path re-grades one AC verdict in the merged result and the record. The fix is a code change, so it goes back through QA.

**Outcome:** The task does NOT meet the Definition of Done. Close the gap before acceptance.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-27T16:39Z
**Total Duration:** 9 minutes

**Blocking Issues Summary:**

1. AC #7: Step 3c `result-document-mismatch` HALT arm untested.

**Estimated Effort to Close Gaps:** Small (one test)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted (Step 8.5)

**Next Steps:**

- Add the eval test for the arm and mutation-prove it (delete the arm → red)
- A gap closed by changing code re-enters QA before this verification re-runs
- Re-run verification after the fix (DoD run 2, scoped to #7)
