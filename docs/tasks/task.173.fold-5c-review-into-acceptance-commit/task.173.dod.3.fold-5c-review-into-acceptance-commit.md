# Definition of Done Verification

**Story/Task:** task.173.fold-5c-review-into-acceptance-commit
**Verification Started:** 2026-10-08T17:09:48Z

Run 3. Run 1 found three gaps, resolved by operator decision (`d073291c`). Run 2 found one: AC8's
re-scope under-counted its exceptions. It was corrected within that decision (`23dd41df`). Both
runs' gap reports in the task body are marked historical and superseded, and every criterion is
verified afresh here.

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

**Step 5c PR review:** `task.173.pr-review.1.fold-5c-review-into-acceptance-commit.md`, verdict ⚠️ CONCERNS. Both findings are closed (PC-1, PC-2).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (11/11)
**PR Status:** OPEN (PR #613)
**PR Review Decision:** null (single-maintainer repo). The Step 5c report `task.173.pr-review.1.fold-5c-review-into-acceptance-commit.md` returned CONCERNS, which satisfies this column.

### Acceptance Criteria

- **AC1–AC7, AC9:** ✅ PASS. Each has a code citation and a per-PR test: `acceptance-commit-carries-5c.test.mjs:212`, `:614`, `:686`; `develop-pipeline-on-precompact.test.sh:581`; `:173`; `:212`; `:212`; `.github/workflows/test.yml:54`.
- **AC8:** ✅ PASS. The corrected text matches the record. All 24 QA fixes (CR-1…5, CR2-1…6, CR3-1…7, CR4-1…4, CR5-1, CR6-1) appear in exactly one list: proved; not proved by recorded outcome (`no-red-untested` ×3, `absorbed` ×1); or prose-only (×5).
- **AC10, AC11:** ✅ PASS (documentation criteria). `CHANGELOG.md:8`; `develop-pipeline-step-5-6-qa-loop.md:1414`.

**Agent summary:** 11/11 PASS.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL

- **No hardcoded secrets:** ✅ PASS. `skills/develop-story/references/bb-auth.js:24-35` reads environment variables only.
- **No new unsafe patterns:** ✅ PASS. Child processes use argv. The one `sh -c` is the unchanged task.172 `checkCommand`.
- **5c doc-only classifier (`isDocsPath`) holds under probe:** ❌ FAIL (medium). Evidence: `shared/resources/ci-tree-equivalence.js:130`, consumed at `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1474`.
  - `isDocsPath` accepts a path containing a NUL byte.
  - Under zsh, the classify block's second test (`:1509`) passes that path to `git`, which sees it cut at the NUL.
  - So the ref `src/a.js\0.md` prints `doc-only` for a tracked code file. Under bash, `read` drops the NUL and the path is recorded.
  - Reproduced by the orchestrator on 2026-10-08 (`isDocsPath("src/a.js\0.md", ["**/*.md","docs/**"])` → `true`; classify loop: zsh `CLEARED`, bash `record`).
  - Contained: the stage block's `grep -qxF` against the eligible list (`:1547`) still refuses a plain-path carry.
  - Provenance: `isDocsPath` is unchanged task.172 code, but this task adds the 5c consumer that hands it a ref from a report.
- **Probe mode — the 5c git-state refusal arms:** ⚠️ covered by the recorded human override (the operator, 2026-10-08). No engine form reaches fenced Markdown. The evidence is the 38-case per-PR suite.
- **TLS, PII in logs, dependency risk:** ⚠️ NOT_APPLICABLE.

### Probe Results

**Candidates executed:** 59 (`totals.executed`, `task.173.dod.security.run.json`). **Reproduced:** 3.

- `src/a.js\0.md`: expected **rejected**, got **accepted** (medium)
- `docs/safe.txt\0.js`: expected **rejected**, got **accepted** (low; cannot escape `docs/`), under both pattern sets

Run 2 executed 66 cases with 0 reproduced. Its cases file was not persisted, and this run's cases differ (the corpus path cases mapped under `docs/`, plus the predicate's own documented refusals).

**Agent summary:** No secrets, no unsafe patterns, no dependency change. `isDocsPath` accepts embedded-NUL paths, and under zsh the 5c classifier then clears a tracked code file.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS. `CHANGELOG.md:9` and `:18` both cite task.173. The step docs and finalise docs are updated, with the bundles regenerated.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (100/100, gate 7)
- Acceptance Criteria: ✅ 11/11
- PR Review & CI: ✅ 5c review CONCERNS. CI reading 1: SUCCESS @ `23dd41dfd00ab2ef99aee7924dd4c40aa236e043` over 5 checks
- Documentation: ✅ PASS
- Security Review: ❌ FAIL (embedded-NUL path accepted, medium)
- Compliance Review: ⚠️ NOT_APPLICABLE

Fix-and-recheck (Step 8a) does not apply. The finding's severity is medium, which fails the evaluator's `severity-low` precondition.

**Blocking Issues:**

- [ ] Security: the 5c classifier must not clear a ref containing a NUL or other control character. Make `isDocsPath` refuse it at the source, or have the classify block record such a ref. Add a test under zsh. This is a code fix, so the run re-enters QA at 5a.

**Outcome:** The task does NOT meet the Definition of Done.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-08T17:14:01Z
**CI reading 1:** SUCCESS @ `23dd41dfd00ab2ef99aee7924dd4c40aa236e043` over 5 checks

**Blocking Issues Summary:**

1. Security: an embedded-NUL ref is cleared as doc-only under zsh (medium)

**Estimated Effort to Close Gaps:** Small (a predicate guard and a test). It needs a QA re-entry.

**Next Steps:**

- Fix, commit, and resume. The resume re-enters QA at 5a because code changed
