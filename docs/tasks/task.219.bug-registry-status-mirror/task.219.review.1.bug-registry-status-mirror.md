# Task Review Report: Task 219 - General-bug registry status: one writer at every transition

**Reviewed:** 2026-10-20
**reviewed_blob:** 06c8163c18c8806c227f98761fd3c80bea8aca75
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development after fixes)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 critical + important recommendations implemented — 2026-10-20

---

## Executive Summary

The task is well-scoped and its engine claims hold: every `registry-tick.js` and `select-next.mjs` anchor
was read and resolves, `parseRegistry` was run on this repository's registry and on an emoji fixture,
and the drift test is reached by `npm test`. The gaps were in the call-site and test populations: the
plan did not list the five `develop-bug.test.js` assertions that pin the prose it replaces, its site
list missed two develop-bug lines and all four qa-fix lines, and the "one label map" could not be
imported by the drift test because `registry-tick.js` exports nothing.

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — run inside the `/develop-task` pipeline (autonomous); each
decision below took the recommended option and is recorded as such
**Implementation Readiness:** 7/10 before fixes, 9/10 after
**Recommendation:** READY TO IMPLEMENT (after the Step 8.5 fixes below)

---

## User Decisions & Clarifications

Autonomous pipeline run — no `AskUserQuestion` calls. Decisions taken on the recommended option:

**D1: Where does the bug-status label map live so the drift test can read the same one?**
- **Decision**: export it from `registry-tick.js` (`module.exports`), with the CLI entry gated by
  `require.main === module` — the CJS guard already used by `doc-links.js`, `change-log.js`,
  `card-preflight.js`, `bug-doc.js` and `doc-id.js`. (Bug 16's symlink no-op was the ESM
  `resolve(argv[1]) === fileURLToPath(import.meta.url)` guard, not this one.)
- **Impact**: one definition of the five labels, imported by the drift test and the integration test.

**D2: Does the CLI also refresh "Last Updated"?**
- **Decision**: no. The CLI writes the Status cell only. Step 7's "refresh Last Updated" stays a hand
  edit (this repository's registry carries it as a header line, not a column).
- **Impact**: keeps the CLI one-cell; success criterion "no step edits the Status cell by hand" is unchanged.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present; OKF `type: task`, `description`, `tags` present.
- Card preflight: 3 card blocks resolve (`sync-jira-task.js --check-card`, exit 0). `+N more`: Summary 5, Success Criteria 8, Breaking Changes 6 — information only.
- Change Log present (advisory, default); sign-off not configured — check skipped.
- `github_issue: 706` exists; body link `[#706](…/issues/706)` matches.
- `doc-links.js`: 3 relative links resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

Verified by reading or running:

- `registry-tick.js:158` `locateSelector`, `:247` `isBugStem`, `:403` `split(/(\r?\n)/)`, `:474` `setCell` — all resolve.
- `select-next.mjs:234` `BUG_LIFECYCLE_STATUSES`, `:1243` `parseRegistry` — resolve.
- `finalise/SKILL.md:1362` bug-mode `not-a-task` paragraph — resolves.
- Check 11 (run, not read): `parseRegistry` on `docs/bugs/bug-registry.md` → 19 rows, 0 malformed, statuses `['closed']`. On an emoji fixture → `registryStatus` `"🔍 ready for qa"`, `"✅ closed"` (lowercased, emoji kept). So the normaliser must compare case-insensitively.
- Check 18: `evals/shared/tests/*.test.mjs` is in `package.json` `test` — the new drift test is reached.
- Check 14: no engine from the collector's list is enumerated — not applicable.
- Architecture pre-pass (Agent B): `aligned`; axes checked: What this repo produces, Cross-skill resources, File naming, Status lifecycle, Registries, Validation before commit, Do not (`prepass-axes.js` source: `architecture`). Three low findings (registry docs omit bug-registry vocabulary; lifecycle cited from bug-documents.md; test location) — informational.
- Codebase pre-pass (Agent C): `not-implemented`.

### Important

- **I1 — Removed-literal test sweep (check 15).** Replacing the prose mirror with the CLI call removes literals that `skills/develop-bug/tests/develop-bug.test.js` pins: `:96` (`/bug-registry\.md/` in Step 7), `:107` and `:108` (`status: in-progress[^\n]*bug-registry\.md`, `status: ready-for-qa[^\n]*bug-registry\.md`), `:116` (`status: reopened[^\n]*bug-registry\.md`), `:124` (`mirrored into the \`docs/bugs/bug-registry.md\` row`). The plan listed none. Found with `git grep -n "bug-registry" -- skills/develop-bug skills/qa-fix`.
- **I2 — Site list carries its grep, and the grep disagrees (check 20).** §2/§7 named four develop-bug sites and "no qa-fix line". The status-writing sites are: develop-bug step-3 `:16` (in-progress), `:99` (ready-for-qa), `:110` (the pre-Step-4 row check), step-5-6 `:174` (reopened), step-7 `:83` (closed), SKILL.md `:234`/`:254` (summaries). qa-fix has no `bug-registry` hit because it never mirrors — its status writes are found by `grep -n "Ready for QA)\|→ In Progress)" skills/qa-fix/SKILL.md`: `:852`, `:858`, `:1321`, `:1360`.
- **I3 — One label map, but the drift test cannot import it.** `registry-tick.js` is a CJS CLI ending in `main().catch(...)` with no `module.exports`; "the five-entry label map lives in this one file" and "the drift test normalises both forms" need a second definition unless the file exports it (D1).

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I4 — Step 7 "refresh Last Updated" unaddressed.** `develop-bug-step-7-close-bug.md:83` also tells the agent to refresh Last Updated; the plan replaces "each hand edit of the row" without saying whether this one moves into the CLI (D2).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I5 — qa-fix criterion has no test that holds it.** "Every change is mutation-proven: revert it and a named test goes red" — but the qa-fix call sites are prose and no planned test reads qa-fix/SKILL.md for the call. Add an assertion in a runner-reached file (`skills/develop-bug/tests/` or `tests/`).

### Optional

- **O1 — Anchor drift.** `registry-tick.test.mjs:345` is the comment above the argument-surface test; the test itself is at `:350`.
- **O2 — "Emoji label" undefined for detection.** State that a cell counts as emoji vocabulary when it matches one of the five labels case-insensitively.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks, mitigations and rollback are proportionate. The `require.main === module` guard (D1) is a new
risk surface the plan now names: the existing CLI tests (spawned through the real path) and a
symlinked-invocation case cover it.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues

1. List the five `develop-bug.test.js` assertions as tests to rewrite to assert the CLI call (I1).
2. Replace the site list with the measured one and record both greps (I2).
3. Export the label map and normaliser from `registry-tick.js` behind a `require.main === module` guard; the drift test imports them (I3, D1).
4. State that Last Updated stays a hand edit outside the CLI (I4, D2).
5. Add a qa-fix call-site assertion to a runner-reached test (I5).

### Consider (Optional) - 2 items

1. Correct `:345` → `:350` (O1).
2. Define the emoji-vocabulary match (O2).

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes; 7/10 before)

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; all five important findings were applied to the task document in Step 8.5.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; re-run the two §7 greps before Phase 2.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2, autonomous)
- **Review Date:** 2026-10-20
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.219.bug-registry-status-mirror/task.219.bug-registry-status-mirror.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass Agent B)
- **Pre-pass:** Agent B dispatched (aligned), Agent C dispatched (not-implemented)
