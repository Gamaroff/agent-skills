# Task Review Report: Task 231 - Test infrastructure hygiene

**Reviewed:** 2026-10-26
**reviewed_blob:** c0bd28d192b80e875ab8142fb42bd7450e681bc2
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 critical + important recommendations implemented — 2026-10-26

---

## Executive Summary

The task is well-sourced. Its line anchors resolve, its counts carry the commands that produced them, and every behaviour criterion names the test that holds it. The review found three Important gaps: the plan misses two tests and one doc that read the `test` script it rewires, and its same-file `#x` plan names a code path those links never reach. All three are fixed in the task document. It is ready to implement.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked. This run is autonomous (`/develop-next` → `/develop-task --defaults`). No finding needed a judgement call, so each was resolved from the code.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No question points were raised. Each finding below has one fix that the code supports, so no answer from the user would change it. The pipeline auto-answers Step 8.5 ("apply all critical + important fixes") and Step 9 ("fixes complete").

---

## Pre-pass Summaries

- **PREPASS_B (architecture alignment):** `aligned`, with `prepass-axes.js` source `architecture`. Axes checked: What this repo produces, File naming, Status lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit, Do not. It returned 4 low findings, folded into O3 below.
- **PREPASS_C (codebase scan):** `not-implemented`. No `scripts/test-tmpdir.mjs`, `tests/tmp-leak-ratchet.json`, `isWaitMarked`, `anchorsOf` or `githubSlug` exists in the tree (confirmed inline by `ls` and `grep`).

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, plus Progress Tracking, References and Notes. There are no placeholders.
- OKF: `type: task`, `description` and `tags` are present.
- Tracker: `github_issue: 741` exists, and the body link `[#741](…/issues/741)` matches.
- Card preflight: 3 card blocks resolve, exit 0. It reports "+N more" counts: Summary 3, Success Criteria 7, Breaking Changes 5.
- Sign-off: not configured (`sign-off` is absent from `skills-config.yaml`), so it is not checked.
- Change Log: present. It becomes current with this review's rows (Step 8.5 and Step 9).
- `doc-links.js --file` on the task: 1 relative link, it resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (3 Important)
**Hallucinations Detected:** 0

**Anchors verified** (`sed -n`): `observation-log.test.mjs:66`, `:69-72`, `:1785`; `resolve-observation-workspace.sh:131`; `doc-links.js:66`, `:352`; `doc-links.test.mjs:327`, `:359`, `:399`, `:442`; `qa-loop-lock-fields-parity.test.mjs:326`; `.gitignore:71`; `skills/finalise/SKILL.md:526`, `:558`, `:1636`; `skills/review-pr/SKILL.md:867`. Each holds what the document says.

**Invariant run (check 11):** the plan's `githubSlug` was executed on headings whose GitHub anchors are known in this repo. `"A — B"` gives `a--b`. `"Key → document lookup"` gives `key--document-lookup`, the anchor `develop-pipeline-step-0-resolve-and-prepare.md` already links to. `"Step 0.1 reconciliation"` gives `step-01-reconciliation`. `` "`set-waiting-on.sh` rule" `` gives `set-waiting-onsh-rule`. The invariant holds.

### Important

- **I1 — Two tests read `package.json` `scripts.test` and break when it becomes the wrapper (checks 15 and 18).**
  `tests/shell-suite-guard.test.js:37` binds `scripts.test`, and `:80` asserts `npmTest.includes(\`bash ${suite}\`)` for every tracked `*.test.sh`. `tests/test-runner-reach.test.js:23` binds `scripts.test`, and `:77-108` asserts that every test directory's glob is in it. After `"test": "node scripts/test-tmpdir.mjs -- npm run test:suite"`, neither string holds a suite. Both tests go red, or pass vacuously if they are "fixed" by reading the wrapper. The search was `git grep -nE 'scripts\.test\b' -- '*.js' '*.mjs'`. The plan lists neither file.
  **Fix (applied):** both tests read `scripts["test:suite"]`. Both are added to Phase 1 and to the Files Summary.

- **I2 — Same-file `#x` links never reach `checkFile` (check 10).**
  The plan says same-file `#x` "currently hits `continue` at `noFragment === ""`" (`doc-links.js:353`). It does not. `NOT_RELATIVE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i` (`doc-links.js:84`) drops every `#`-prefixed target in `extractRelativeLinks`, before `checkFile` sees it. The planned branch would never fire, and the "same-file `#x` is checked" unit case would fail.
  **Fix (applied):** Phase 3 now extracts same-file fragments separately and leaves `NOT_RELATIVE_RE` alone. Its meaning ("not a relative link") is shared with `extractRelativeLinks`' other callers, such as `resolvedAll`, which answers "does this document link X?" for `qa-read-back`.

- **I3 — The traps doc describes the `test` script's shape (doc sweep).**
  `docs/contributing/traps.md:86` says "The `test` script is 10 `&&`-joined segments … with an explicit list of per-skill globs". After the change that is `test:suite`. A contributor following the trap would add a glob to the wrapper line.
  **Fix (applied):** the Phase 1 and Files Summary entries for `traps.md` now cover this paragraph as well as the `df -i` line.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Every phase has a risk level, named files, concrete changes and dependencies. The plan file gives each mechanism's shape. The four leaking helpers are found by a recorded `git grep`, not by recall. `estimated_effort_hours: 16` is plausible for 7 success criteria and 5 phases.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Every behaviour criterion names its test (SC-1, SC-2 and SC-3's ratchet half: `tests/test-tmpdir.test.js`; SC-4: the worktree case; SC-5: `doc-links.test.mjs`; SC-7: the parity unit cases).
- SC-6's evidence is a CI run on the PR, which exists before merge. The workflow's `paths` include `docs/**/*.md`, and this PR changes them, so the job runs.
- Each mechanism has a mutation proof. The wrapper's exit-code risk has its own case and proof (§10).
- No criterion can only be met after merge.
- The new suite `tests/test-tmpdir.test.js` falls inside the `'tests/*.test.js'` glob (check 18).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The one Critical-impact risk (the wrapper swallowing a red suite) has a test, a mutation proof and a one-line rollback. Phase rollbacks are independent because the phases touch disjoint files.

---

## Optional

- **O1** — §3's "Real block-owned waits today are `:558` … and `:1636`" is a hand list with no search beside it. It is background only: the parity test's population is directory-derived, so nothing depends on the list (check 20 does not bite).
- **O2** — The wrapper's per-run directory sits under the system tmpdir (`/tmp` on Linux). Tests that classify `os.tmpdir()` as ephemeral (the observation-log suite's deliberate exception at `:1785`) keep their premise. A macOS `$TMPDIR` is also ephemeral-classified. No change is needed. Confirm it in Phase 5's full run.
- **O3** — From PREPASS_B: `docs/architecture/concepts/tech-stack.md:56` describes `docs-link-check.yml` as "link-checks changed markdown". Once the `doc-links.js` step lands, it also checks anchors. That is a one-clause update in Phase 3.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. Point `shell-suite-guard.test.js` and `test-runner-reach.test.js` at `scripts["test:suite"]` (I1).
2. Extract same-file `#x` targets separately in `doc-links.js`, and do not route them through `NOT_RELATIVE_RE` (I2).
3. Update `traps.md:86` for the `test` / `test:suite` split (I3).

### Consider (Optional) - 3 items

1. O1: no change needed.
2. O2: confirm in Phase 5.
3. O3: a one-clause `tech-stack.md` update in Phase 3.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (I2 is an unreachable branch; I1 is unlisted test readers)
- Implementation Clarity: 9/10
- Consistency: 8/10 (I3 doc sweep)
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues. The three Important gaps each had one code-supported fix, and all three are now in the task document.

---

## Next Steps

The task is ready for implementation. The developer should:

1. Follow the plan phase by phase. Phase 0 measures before Phases 1 and 3 seed their ratchets.
2. Check off the Progress Tracking boxes.
3. Run tests after each phase, and record each mutation proof red-then-green.
4. Use the rollback plan if the wrapper misbehaves.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2, autonomous)
- **Review Date:** 2026-10-26
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.231.test-infrastructure-hygiene/task.231.test-infrastructure-hygiene.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `coding-standards.md`, `source-tree.md` (via PREPASS_B and grep)
- **Pre-pass:** Agent B dispatched 05:38Z, returned (13.8 s); Agent C dispatched 05:38Z, returned (8.4 s)
