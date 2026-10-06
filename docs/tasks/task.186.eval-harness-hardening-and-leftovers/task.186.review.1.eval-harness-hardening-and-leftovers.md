# Task Review Report: Task 186 - Eval harness hardening and task.185 leftovers

**Reviewed:** 2026-10-06
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 Important recommendations implemented — 2026-10-06

---

## Executive Summary

The task is well-sourced: every cited path and line anchor resolves, and the central A1 claim was
executed and holds. Four Important findings concern success criteria that either cannot go red on
today's code or name the wrong exit code or population, plus one design trap in A2 (importing a
constant from `runner.mjs` runs its `main()`). All four were fixed in the task document.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (develop-next T186); each
decision below took the reviewer's recommended option and is recorded as such.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No `AskUserQuestion` call was made: `/develop-task` Step 2 runs this review autonomously. Each
question the review would have asked is listed with the recommended answer it took.

**Q1 (QP2): Which exit code should `repeat.mjs` use for an unknown assertion `fn`?**
- **Decision (recommended)**: 2 (usage), from the pre-run validation loop, before any run starts.
- **Impact**: success criterion 2 changes from "exit 3" to "exit 2". The runner alone still refuses
  before the driver with a non-verdict status.

**Q2 (QP3): The numbering probe found a sixth site (`skills/finalise/SKILL.md:162`). In or out?**
- **Decision (recommended)**: in scope — same defect, same phrase, found by the task's own probe.
- **Impact**: Phase 4 call sites, Files Summary and the success criterion name six sites.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking and References are present. OKF `type`,
`description` and `tags` are set. `github_issue: 575` exists (OPEN) and the body link matches.
Card preflight: 3 card blocks resolve. `doc-links.js`: 1 relative link resolves. Sign-off is not
enabled; the Change Log is current for `planned`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (0 hallucinations)

Architecture pre-pass (Agent B) and codebase pre-pass (Agent C) were **not dispatched**; both
passes were done inline by the reviewer, so this review had no independent second reader. Axes
checked inline: exit-code contract, fake-gh read/write classification, gh HTTP method, report
numbering.

Verified:

- Every anchor resolves: `runner.mjs:182` (unknown-fn arm), `:236` (`main`), `:413`, `:416`;
  `repeat.mjs:44–46`, `:129–131`; `claude-cli.mjs:94`, `:100`; `fake-gh.mjs:82`, `:101–102`,
  `:220`, `:237`, `:298`, `:321`, `:345`; `pr-inline-comment.js:455–462`.
- **A1 invariant, executed (check 11)**: `async function main(){ await new Promise(()=>{}); process.exit(0) } main().catch(…)`
  exits **0** on Node v26.4.0; with `process.exitCode = 74` set first it exits **74**. The claim and
  the fix both hold.
- `pr-inline-comment.js` builds four `gh api` argvs. Only the listing (`:456`) carries `-f`; the
  three writes use `--method` + `--input -`. A rule "every argv with `-f`/`-F` carries `-X GET`"
  therefore forbids no write.
- `EVAL_*_EXIT` population: `CHANGELOG.md`, `evals/shared/README.md`, `repeat.mjs`, `runner.mjs`,
  `tests/runner-setup.test.mjs`. No external caller.

### Important

- **I1 — Success criterion "`gh --version pr comment 901` is refused" is already true (check 10).**
  Probe on `develop`: `--version pr comment 901` → exit 1, `refused: true`, because the write check
  runs before the version check (`fake-gh.mjs:284–296`). A test of it cannot be red before the fix.
  The real gap, from the same probe: `gh version issue close 5` → **exit 0** (a write answered as a
  version) and `gh --version pr view 901` → exit 0 answered as a version.
  **Fix applied**: the criterion now names `gh version issue close 5` (refused) and
  `gh --version pr view 901` (not answered as a version).
- **I2 — Criterion 2 named exit 3; A2's pre-run refusal is a usage error, and A2's constant cannot
  live in `runner.mjs` (check 10).** `repeat.mjs` checks every scenario before running any, and that
  loop exits through `usage()` (2), as A4 does. Separately, `runner.mjs:416` calls `main()`
  unconditionally, so `repeat.mjs` importing a constant from it would start a run.
  **Fix applied**: criterion 2 reads exit 2 before any run; Target Architecture and Phase 1 state
  that the known-name set lives in a module both import (e.g. `evals/shared/assertions.mjs`), and
  the dispatcher reads the same set.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (with fixes)

### Important

- **I3 — Phase 4 population is six sites, not five (check 14 analogue: the task's own probe).**
  `git grep -n -i -e 'starts at 1' -e 'increments on re-' -- 'skills/*/SKILL.md' 'shared/resources/*.md'`
  returns `skills/finalise/SKILL.md:162` (`dod.{num}` "starts at 1, increment if re-running") as well
  as the four named sites. A wider probe (`increment|highest .*\+ ?1|count existing`) adds no
  further count-style site: `create-bug-report`, `review-prd` and the implementation report already
  use highest + 1; `code-smell-validator` numbers by date, not a co-located series; `qa-story:494`
  ("Increment QA artifact numbers (qa.1 → qa.2)") numbers from the prior QA cycle inside the QA loop.
  **Fix applied**: `finalise` added to Phase 4 and Files Summary; the three non-count sites are
  listed as stated exclusions.
- **I4 — "each of the five report kinds" miscounts.** `qa-planning` numbers two series
  (`risk.{num}`, `test-design.{num}`). The kinds are `pr-review`, `risk`, `test-design`, `review`
  (review-bug, review-epic, review-task) and `dod`.
  **Fix applied**: the criterion names each call site's kind(s).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Criteria classify cleanly: behaviour criteria are held by the tests in Files Summary 8–10, the
README/CHANGELOG criteria are documentation criteria, and the code-quality rows are commands. No
criterion depends on the merge.

### Optional

- **O1 — A1's suggested code labels a hung hook "driver error".** Setting
  `process.exitCode = optInExit("EVAL_DRIVER_ERROR_EXIT", 1)` makes `repeat.mjs` print
  `driver error` for a setup hook that never settled. A plain `1` (or a dedicated code) reads as
  `not judged`, which is what happened. The plan already allows "a dedicated not-judged code".
- **O2 — A5 as a skip.** Under `eval:all` (no opt-in), a skip exits 0, so a CI host that loses `jq`
  would report jq-dependent scenarios as skipped, not failed. That is the existing skip contract;
  the skip line should name `jq` so it is visible.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Per-phase commits and independent phases make rollback a single revert plus `npm run bundle`. The
exit-code risk is bounded: no external `EVAL_*_EXIT` caller exists.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues — all applied

1. Replace the already-true fake-gh criterion with the two forms that pass today (I1).
2. Criterion 2 → exit 2 before any run; the known-name set in a shared module (I2).
3. Add `finalise` to Phase 4; state the exclusions (I3).
4. Name report kinds per call site (I4).

### Consider (Optional) - 2 items

1. Use a not-judged code for A1, not the driver-error code (O1).
2. Name `jq` in the A5 skip line (O2).

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

**Justification:** No critical issues; the four Important findings were criteria and scope
corrections, all applied to the task document in this review.

---

## Next Steps

Task is ready for implementation. Follow the phases in order, one commit each, with a red test and
a mutation proof per fix.

---

## Review Metadata

- **Reviewer:** Claude (review-task, invoked by develop-task Step 2)
- **Review Date:** 2026-10-06
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.186.eval-harness-hardening-and-leftovers/task.186.eval-harness-hardening-and-leftovers.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load set); evals/shared/README.md § Repeat runner
- **Pre-pass:** Agents B and C not dispatched — inline review, no independent reader
