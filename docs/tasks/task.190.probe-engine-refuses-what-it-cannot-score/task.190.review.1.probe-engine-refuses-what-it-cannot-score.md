# Task Review Report: Task 190 - Probe engine refuses what it cannot score

**Reviewed:** 2026-10-18
**reviewed_blob:** 1e2781cef394081e4dd3dde05739ea9e7188008e
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 important recommendations implemented — 2026-10-18

---

## Executive Summary

The task is well scoped and its three changes are small and independent. The draft was written
against `b1807611`, and tasks 180 and 181 have since landed on the same engine. Its anchors had
drifted, its entry-exists check named three of six entry forms, and it missed one existing test its
Phase 2 inverts. All of it was fixable from the code, and is fixed.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous run, `develop-next` → `develop-task --defaults`)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run: no questions were asked. Each point below had one answer the code settles
or the document already implies. It is recorded here as a reviewer decision, not a user one.

- **D1 — Scope of the entry-exists check.** All six entry forms, in `main` only, with or without
  `--record`. The task title and Overview say the engine refuses a missing entry. Every
  `resolveEntry` result carries `entryPath`. Keeping `runProbeSpec` unchanged leaves the library
  tests (24 `entry-not-probeable` assertions in `security-probe.test.mjs`, all via `runProbeSpec`)
  valid.
- **D2 — `--json` shape for the two new refusals.** `{ "reason", "detail" }` on stdout, plus the
  stderr line. This follows the task's own Target Architecture ("prints `{ reason: "bad-cases", … }`").
  It is extended to `entry-not-found` for consistency.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References present. OKF `type: task`
  and `description` present.
- `github_issue: 589` is OPEN. The body link `[#589](…/issues/589)` matches.
- Card preflight: 3 card blocks resolve (Summary +4 more, Success Criteria +3 more, Breaking
  Changes +1 more). This is information, not a defect.
- `doc-links.js`: 1 relative link resolves.
- Sign-off is not enabled. The Change Log is present, and the review row was added (1.1).

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Every named symbol exists: `SINKS` (`security-input-corpus.mjs:29`), `DIRECTIONS` (`:40`),
`defaultRepoRoot`, `resolveEntry`, `runProbeSpec`, `toRecordEntry`, `preflightRecord`, `recordRun`,
`main`. The corpus invariant was **run, not read** (check 11), over `SINKS × corpusFor` with
`validateCases`' two checks: `{ sinks: 7, n: 102, bad: 0 }`.

#### Important

- **I1 — Removed-literal sweep (check 15).** `skills/review-security/tests/review-security.test.js:711`
  copies the engine into a nested dir and asserts that the copy run **without** `--repo-root` reads
  `unverifiable` / `entry-not-probeable` (`:760-768`). Phase 2 makes that run resolve to the git top
  level (`engages`). The task named no test to update. **Fixed**: added to Scope, Phase 2 and Files
  Summary, with the negative kept via an explicit wrong `--repo-root` → exit 2 `entry-not-found`.
- **I2 — Entry forms.** The plan's existence check named the JS, `cli:` and `shell-fn:` forms.
  `resolveEntry` (`:462`) now has six (`shell:`, `shell-argv:` from task.181 and `fence:` from
  task.180 as well). **Fixed**: Target Architecture covers all six, Breaking Change 2 is added (CLI
  exit 1 → 2 for a missing entry), and the tests run one missing-entry case per form.

#### Optional

- **O1 — Drifted anchors.** Every line number moved (e.g. `defaultRepoRoot :343 → :430`, `main
  :2396 → :3593`, `toRecordEntry :2030 → :3204`). **Fixed**: re-anchored to `f0448911`. The
  test-count figure now carries its command (`grep -c 'test(' …` → 179).
- **O2 — Bundling literal.** Comments in the engine must cite siblings by bare filename (pre-pass B
  finding). **Fixed**: added to Important Clarifications.

Pre-pass B (`prepass-axes.js` source: `architecture`): **aligned**. Axes checked: What this repo
produces, File naming, Cross-skill resources, Validation before commit, Plan files, Registries, Do
not. Pre-pass C: **not-implemented**. None of `validateCases`, `bad-cases`, `entry-not-found` or
`declined_cases` exists.

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important

- **I3 — Phase 2 test copy.** The plan copies `security-probe.mjs` and `security-input-corpus.mjs`
  only. The engine also imports `qa-execute-snippets.mjs`, `spawn-budget.mjs` and
  `probe-boundary-signals.mjs`, so a two-file copy fails to import. **Fixed**: the copy walks
  imports transitively, as `review-security.test.js:719` already does.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **I4 — `--json` shape unstated for `entry-not-found`.** Only `bad-cases` had one, and no existing
  exit-2 arm prints JSON. **Fixed** (D2), with a success criterion that holds it.

#### Optional

- **O3 — Mutation proof for Phase 3.** Three proofs were listed, none for `declined_cases`.
  **Fixed**: added.

Committed cases files: `git ls-files '*.json' | xargs grep -l '"direction"'` lists 47 files. Every
case has a `direction` in `DIRECTIONS` and no out-of-set `sink`, so Breaking Change 1 affects no
committed file. Every success criterion names the test that holds it. None needs a merge to be met.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The default-root change is rated Medium, with the explicit flag and the git-failure fallback as
mitigations. The task-180/181 overlap risk was restated now that both have landed. Rollback is a
revert plus `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues — all applied

1. List and update `review-security.test.js:711` (I1).
2. Entry-exists check over all six forms; Breaking Change 2 (I2).
3. Transitive import copy in the Phase 2 test (I3).
4. State the `--json` shape for both refusals (I4).

### Consider (Optional) - 3 items — all applied

1. Re-anchor to `f0448911` (O1). 2. Bare-filename sibling citations (O2). 3. Phase 3 mutation proof (O3).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The review found no critical issues. The four important ones came from the
engine changing under the draft, and each was fixed from the code.

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, autonomous via develop-next)
- **Review Date:** 2026-10-18
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.190.probe-engine-refuses-what-it-cannot-score/task.190.probe-engine-refuses-what-it-cannot-score.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (pre-pass B)
- **Pre-pass:** B aligned, C not-implemented (both Explore subagents returned)
