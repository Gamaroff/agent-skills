# Task Review Report: Task 249 - /finalise grades every kind of criterion fairly

**Reviewed:** 2026-11-01
**reviewed_blob:** 8cc7fc6fba6d47c89fd2df9771872907107f8be0
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 Important recommendations implemented — 2026-11-01

---

## Executive Summary

The task is well-scoped, cites the observations it closes, and names its readers, tests and mutation
proofs. Four Important gaps were found: the Step 6 resolution never re-folds `AC_OVERALL`, the
security-probe design misnames the fields a case's verdict lives in and does not say which cases need a
`spec_ref`, the Code Quality criterion asks for a step this repository forbids, and the Step 6 snippet
test names no file. All four are fixed in the task document.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — `/develop-task` Step 2)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-task` Step 2 under `/develop-next`'s AUTONOMOUS RUN directive. No question was
asked: output format auto-answered "Comprehensive report"; Step 8.5 auto-answered "Yes, apply all
critical + important fixes"; Step 9 auto-answered "Yes, fixes complete". Every finding below had one
answer the code settles, so none needed an operator's choice.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Progress Tracking and References present.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- No placeholders. Sign-off not enabled. Change Log present (one `Initial draft` row; current for `planned`).
- Tracker: `github_issue: 802` exists (open); body link `[#802](…/issues/802)` matches.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — 3 card blocks resolve (Summary 6 omitted,
  Success Criteria 3 omitted, Breaking Changes 4 omitted → `+N more` links).
- Doc links (`doc-links.js`): 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment): `aligned`, axes_checked: What this repo produces, Cross-skill
resources, File naming, Validation before commit, Do not (+ libraries, contracts, security);
`prepass-axes.js` source `architecture`. Three low findings, none actionable beyond the anchor drift below.
Pre-pass C (codebase): `not-implemented` — no `DEFERRED-CI`, `spec_ref`, `spec_challenges`, process
kind or record-location check exists in code or prompts.

### Important

- **I-2 — the probe case's verdict fields are misnamed, and which cases need `spec_ref` is unstated**
  (check 21, obs #296).
  - **Location:** §2 "Probe cases can be stricter", §3 Target Architecture, Phase 3.
  - **Evidence:** a probe case's verdict is `direction` (`hostile` | `legitimate`, machine-read) with
    `correct` (prose) and an optional machine `expected` — `shared/resources/security-input-corpus.mjs:39-57`,
    `shared/resources/security-probe.mjs:1425-1464`. Corpus cases take their verdict from the shared
    corpus (`corpusFor(sink)`, `finalise-dod-security-prompt.md` Step 4.2), not from the agent; only the
    inline `cases:` the agent writes when the corpus does not fit carry the agent's own verdict — which
    is obs #81's case (task.200, `direction: hostile, correct: Reject`). `probes[]` is built by
    `/finalise` Step 3b.1 from the run record, whose `reproduced[]` holds case **ids**
    (`security-probe.mjs:2221`), so `spec_ref` reaches Step 3b.1 only through the cases file.
  - **Recommendation:** require `spec_ref` on every agent-authored inline case (corpus cases are exempt
    — their verdict is the corpus's); name `direction`/`correct` as the verdict a `spec_ref` justifies;
    have Step 3b.1 read `spec_ref` from `<stem>.dod.<N>.security.cases.json` by case id. An inline case
    without `spec_ref` is a plan-shape error reported in the DoD.

### Optional

- **O-1 — four line anchors drifted** (check 2): `skills/finalise/SKILL.md:1240` → CI reading 1 is at
  `:1244`; `:562` → Step 3b.1 heading is at `:566`; `finalise-rerun-scope.js:466` → `computeOverall` is
  at `:467`; `review-task/SKILL.md:1075` → check 21 is at `:1076`. Claims true, coordinates moved.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I-1 — Step 6 rewrites the record but never re-folds `AC_OVERALL`** (check 10, outcome reachability).
  - **Location:** Phase 1, Success Criterion 2, plan "Phase 1".
  - **Evidence:** `AC_OVERALL` is read once, at Step 3c, from the merged record
    (`skills/finalise/SKILL.md:759`), and Step 6 uses it as-is (`:1243`). `computeOverall`
    (`finalise-rerun-scope.js:467-476`) returns `PARTIAL` (some PASS) or `FAIL` (no PASS) for any set
    holding a non-PASS entry, so a `DEFERRED-CI` criterion leaves `AC_OVERALL` non-PASS at Step 3c. If
    Step 6 only rewrites the criterion's entry, a SUCCESS reading turns the criterion PASS while
    `AC_OVERALL` stays `PARTIAL`/`FAIL` — the acceptance decision still rejects the work, the outcome
    the task exists to remove. `recordEntry` also coerces every non-PASS status to `FAIL`
    (`finalise-rerun-scope.js:482`), so `DEFERRED-CI` must survive that writer.
  - **Recommendation:** the Step 6 subcommand resolves each `DEFERRED-CI` entry **and returns the
    re-folded section verdict** (`computeOverall` over the resolved entries); Step 6 rebinds
    `AC_OVERALL` from it before the decision table. Add a test: one `DEFERRED-CI` + one PASS, SUCCESS
    rollup → overall `PASS`.

- **I-4 — the Step 6 executed-snippet test names no file** (check 18).
  - **Location:** §7 item 8, §8.
  - **Evidence:** "in the existing executed-block suite" names no file; the runner reaches
    `shared/resources/tests/*.test.mjs` and `evals/shared/tests/*.test.mjs` (`package.json`
    `test:suite`), so a named file in either is reached.
  - **Recommendation:** name it — `shared/resources/tests/finalise-deferred-ci.test.mjs`, extracting
    the Step 6 resolution fence from `skills/finalise/SKILL.md` and running it against SUCCESS, FAILURE
    and PENDING rollups.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I-3 — the Code Quality criterion asks to move `.agents/skills` aside.**
  - **Location:** §9 Code Quality, plan Verification.
  - **Evidence:** moving the gitignored `.agents/skills` symlink aside unloads every project skill
    mid-session; this repository's clean-checkout check is `npm run test:clean-checkout`
    (`scripts/test-clean-checkout.sh`), which exists for exactly this.
  - **Recommendation:** "`npm run ci` passes, and `npm run test:clean-checkout` passes".

### Optional

- **O-2 — a removed literal with no recorded search** (check 15). The AC prompt's "Three kinds … only
  these three" (`finalise-dod-ac-prompt.md:59`) and "typically the implementation report or a QA report"
  (`:67`) are rewritten. Searched: `git grep -n "Three kinds\|only these three\|implementation report or
  a QA report" -- '*.test.*' 'evals/**'` → no test pins either. Record the search in the plan.
- **O-3 — the docs-only CI arm.** CI reading 1 can read `SUCCESS (tree-equivalent to {sha})`
  (`skills/finalise/SKILL.md:1244`). State that it resolves `DEFERRED-CI` to PASS, with the
  tree-equivalent sha in the note.

Success criteria classify cleanly: 1–2 are behaviour criteria with named tests; 3–5 are documentation
criteria; Code Quality and Migration are documentation/CI. None can only be met after merge.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks name the unresolved-entry failure and agent over-use of the new kinds, each with a mitigation;
rollback is per-phase with Phase 1 as one unit. No guard exemption is added — the CI-state kind is a
deferral, not a pass, and `computeOverall` keeps it non-PASS.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues

1. I-1 — Step 6 returns the re-folded section verdict and rebinds `AC_OVERALL`; `recordEntry` keeps `DEFERRED-CI`.
2. I-2 — `spec_ref` on agent-authored inline cases; verdict fields `direction`/`correct`; Step 3b.1 reads it from the cases file by id.
3. I-3 — replace "moved aside" with `npm run test:clean-checkout`.
4. I-4 — name `shared/resources/tests/finalise-deferred-ci.test.mjs`.

### Consider (Optional) - 3 items

1. O-1 — refresh four line anchors.
2. O-2 — record the removed-literal search.
3. O-3 — the tree-equivalent SUCCESS resolves `DEFERRED-CI` to PASS.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue; the four Important gaps each had one answer the code settles and
are applied to the task document.

---

## Next Steps

Task is ready for implementation. Developer should follow the phases in order (Phase 1 first), check off
progress tracking, run the named tests after each phase, and record the mutation proofs.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous — `/develop-task` Step 2)
- **Review Date:** 2026-11-01
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.249.finalise-grades-every-criterion-kind/task.249.finalise-grades-every-criterion-kind.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (pre-pass B)
- **Review Duration:** ~25 minutes
