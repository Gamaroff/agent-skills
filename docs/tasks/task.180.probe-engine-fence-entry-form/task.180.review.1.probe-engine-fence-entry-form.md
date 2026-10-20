# Task Review Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Reviewed:** 2026-10-12
**reviewed_blob:** 203c2895430d92d84349f21196169b0ecc8a0989
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-10-12

---

## Executive Summary

A well-anchored task: every `file:line` citation resolves, the routing population carries its
search and re-measures to the same six files, and the plan reuses the engine's existing verdict,
environment and record machinery. One claim is falsified by execution: the slot value does not
cross "as files and argv", it is spliced into the script's source, so a `$(…)` input runs. Two
gaps would stop the plan as written: the 13 task.167 cases it re-runs exist in no file in this
checkout, and a heading scan that does not skip fenced content reads bash comments as headings.

**Critical Issues:** 1 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous `/develop-task` run, invoked by `/develop-next` — recommended defaults applied)
**Implementation Readiness:** 8/10 (after the Step 8.5 fixes; 6/10 as submitted)
**Recommendation:** READY TO IMPLEMENT (after the Step 8.5 fixes; NEEDS REVISION as submitted)

---

## User Decisions & Clarifications

Run inside the `/develop-task` pipeline. No question point was raised: each finding below has one
evident fix, applied in Step 8.5 per the pipeline's auto-answer ("Yes, apply all critical +
important fixes").

Pre-pass (Phase 1.5) ran as two Explore subagents:

- **PREPASS_B** — `alignment: drift`, axes checked: What this repo produces, SKILL.md authoring,
  Cross-skill resources, Status lifecycle, Plan files, Validation before commit, Do not
  (`prepass-axes.js` source: `architecture`). Two low findings, both carried as O1 below.
- **PREPASS_C** — `implementation_status: not-implemented`, no findings. The task enumerates no
  call sites of the five engines, so no population diff applies.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking and References are present. `type: task`
and `description` are set. `github_issue: 560` resolves (OPEN) with a matching body link. Card
preflight: 3 card blocks resolve (`sync-jira-task.js --check-card`). `doc-links.js`: 4 relative
links resolve. Sign-off is not enabled in `skills-config.yaml`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (one falsified invariant)

Every line anchor was read: `security-probe.mjs` `:191`, `:371`, `:481`–`:485`, `:738`, `:757`,
`:817`, `:1041`, `:1353`, `:1381`, `:1474`, `:1491`, `:1538`, `:1784`, `:1808`, `:2030`, `:2207`,
`:2396`, `:2481`; `qa-execute-snippets.mjs` `:59`, `:1343`, `:1425`; `security-input-corpus.mjs`
`:43`, `:67`; `probe-boundary-signals.mjs:58`; `probe-boundary-rule.md:221`. All name what the task
says they name. `runProbeSpec` exists (`security-probe.mjs:873`). `sandboxEnv` keeps `PATH`
(`qa-execute-snippets.mjs:1427`), so `npm` reaches the child.

### Critical (falsified invariant — check 11)

- **C1. The slot value crosses as script source, not as data.** § 3 "Important Clarifications"
  says "values cross as files and argv". The plan's own substitution
  (`block.replaceAll(slot, () => c.input)`) splices the input into the block's text, and the
  target block assigns it inside double quotes (`FAST_GATE_COMMAND="<fastGateCommand>"`), so
  command substitution in the input runs. Executed:

  ```
  $ node -e '…replaceAll("<fastGateCommand>", () => "npm run x$(touch PWNED)")…' && bash fence.sh; ls
  [npm run x]
  fence.sh  PWNED
  ```

  The `$&`-safe replacer protects the replacement *string*; it does nothing about the *shell*.
  This is the right semantics — it is exactly what the document's reader does with the placeholder,
  so `fence:` probes the block as shipped — but the task must say so, and the claim it makes instead
  sets up a reviewer to treat task.167's `npm run x$(touch PWNED)` case as proof of non-execution.
  Under `fence:` that case still scores `rejected` (`x` is not a defined script), and it now creates
  `PWNED` inside the case work directory. **Fix:** restate the clarification; state that the slot is
  textual substitution into the script, that side effects land in the per-case work directory, and
  that the escape detector still fails a write outside it; add a test that a `$(…)` input's write
  stays inside the work directory.

### Important

- **I1. The 13 task.167 cases exist in no file in this checkout.** The plan rewrites them from
  `.claude/state/t167-probe-cases.json`, which is gitignored and absent here (`ls .claude/state/t167*`
  → no such file). The committed record `task.167.dod.1.security.run.json` carries only totals, no
  cases. The cases are described in prose at
  `task.167.dod.1.fast-gate-precondition-npm-loglevel.md:123`–`:128`: 7 hostile, 6 legitimate, and the
  names of the 4 silent-environment legitimate cases. **Fix:** reconstruct the fixture from those
  lines and say so; the proof test then asserts the same counts (13 executed, 0 reproduced, 4
  over-blocked without the flag).
- **I2. A heading scan over raw lines reads bash comments as headings (check 11).** The plan matches
  `^#{1,6}\s+<heading>\s*$` and ends the section at "the next heading of the same or a higher level".
  `extractBlocks` reports blocks, not headings, so the heading scan is new code, and a line scan
  that ignores fences finds 10 heading-shaped comment lines inside fences in the step-3 doc alone
  (`awk` over fence state → `10`). Each `# comment` is a level-1 "heading": it ends the section
  early, and a comment whose text equals the heading is a false ambiguity. **Fix:** compute headings
  only from lines outside fences, tracking fence state the way `extractBlocks` does, and add an
  extraction test with a heading-shaped comment inside a block.

### Optional

- **O2. `extractBlocks` returns `bash` blocks only, with no language field.** The plan's "first
  block whose language is `bash` (or `sh`)" cannot see an `sh` block. **Fix:** say `bash` only, and
  that an `sh` block under the heading is the "no bash block" decline.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are concrete, each names its files and its tests, and the mutation table names the test
that must go red for each revert. The `--fake-gh` decision is deferred to Phase 2 with an
instruction to record it, which is acceptable.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after C1 and I1)

Every behaviour criterion names a planned test. The Performance criterion is held by
`tests/test-harness-concurrency.test.js`. The post-merge observation update is in Notes, not in
Success Criteria. The routing search re-runs to the six files § 7 lists, plus the separately named
`probe-boundary-signals.mjs`. No test pins the literal "four entry forms" (`git grep` over test
files → none). The new tests land in `shared/resources/tests/security-probe.test.mjs`, which the
runner already reaches.

### Optional

- **O1. Catalog and comment hygiene (PREPASS_B).** Three `SKILL.md` bodies change; their
  descriptions do not, so `npm run generate-catalog` should produce no diff — add it to the Code
  Quality checks to show that. Keep `shared/resources/` literals out of `.mjs` comments (a sibling is
  cited by bare filename).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The medium risk "executing doc text" is identified and mitigated by the existing containment,
sandbox and escape detector. C1 sharpens it: the input is also executed text, which the fix states.
Rollback is a revert plus `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. C1 — restate the slot semantics as textual substitution into the script; add the in-work-dir
   test for a `$(…)` input.

### Should Fix (Important) - 2 issues

1. I1 — reconstruct the 13 cases from task.167's DoD, not from a gitignored file.
2. I2 — compute headings outside fences; add the heading-shaped-comment test.

### Consider (Optional) - 2 items

1. O1 — `generate-catalog` no-diff check; bare-filename citations in comments.
2. O2 — `bash` blocks only.

---

## Implementation Readiness Assessment

**Score:** 8/10 (after fixes)

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — after the Step 8.5 fixes.

**Justification:** The design is sound and anchored; the falsified claim and the two gaps are
corrections to the document, not to the approach, and each is fixed in place.

---

## Next Steps

Task is ready for implementation. Developer should follow the plan phase by phase, starting with the
red tests (including the C1 and I2 tests), and reconstruct the task.167 fixture before Phase 3.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` Step 2)
- **Review Date:** 2026-10-12
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.180.probe-engine-fence-entry-form/task.180.probe-engine-fence-entry-form.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (via PREPASS_B)
