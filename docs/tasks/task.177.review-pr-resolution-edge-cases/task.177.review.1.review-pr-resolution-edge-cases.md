---
type: review
description: "review-task review 1 of task.177 — /review-pr resolution edge cases."
task: task.177.review-pr-resolution-edge-cases
created: 2026-10-03
---

# Task Review Report: Task 177 - /review-pr resolution edge cases

**Reviewed:** 2026-10-03
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ The critical and important recommendations (C1, I1–I3) and optional O1–O2 are implemented in the task and plan as of 2026-10-03. O4 is left for the implementer.

---

## Executive Summary

The four defects are real, correctly located and correctly scoped. Every line anchor except one
resolves. Two things the plan proposes were falsified by running them: the `.env` sed does not run on
macOS sed, and the "branch misread as a URL" example in the task is not misread. Two success criteria
promise executed tests of things the plan leaves as prose, so no test could run them.

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 2 questions asked and answered
**Implementation Readiness:** 7/10 before fixes, 9/10 after
**Recommendation:** NEEDS REVISION, which the fixes in this review resolve

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

No questions. The template is complete, all 11 sections are present, the card preflight passes, and the
Change Log is current for `planned`.

### Question Point 2: Technical & Implementation

**Q1: Step 2 rung 2 is a table cell, so the planned DoD-fixture test has no runnable block. How should
the work-item filter be applied?**

- **User Decision**: Reuse the §0a lookup. Rung 2 becomes §0a Key → document lookup with
  `KEY_FIELD=pr_number`.
- **Impact**: The rule is cited rather than restated, and the test can already run it through
  `lookupBlock()`. Behaviour change: two work items that share one `pr_number` now HALT as ambiguous
  instead of the resolver taking one of them.

**Q2: The docs-less guard is planned as prose. How should it be held?**

- **User Decision**: A fenced guard block.
- **Impact**: A small bash block checks for `docs/` at the repository root. If it is missing, the block
  binds `DOC_FILE=""` and skips the lookup. Otherwise it runs §0a. The test extracts the block and runs
  it in a repository with no `docs/`, so reverting the block turns the test red.

### Question Point 3: Completeness & Safety

No questions. Pre-pass C found nothing already implemented. The risk and rollback sections fit the
change.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking, References and Notes are present. There are no
  placeholders.
- The OKF frontmatter is complete (`type: task`, `description`, `tags`).
- Sign-off is not enabled in `skills-config.yaml`, so it was not checked.
- The Change Log is present and current: its single `Initial draft` row is consistent with `planned`.
- Tracker: `github_issue: 555` and the body link `[#555]` match.
- Card preflight: `--check-card` exits 0 and 3 blocks resolve. Information only: the Summary omits 2
  sentences, Success Criteria omits 3 criteria and Breaking Changes omits 2. Each omission gets a
  `+N more` link.
- Relative links: `doc-links.js` passes on the task and on the plan.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND. 1 falsified invariant, 1 falsified example claim.

**Pre-pass B** (`prepass-axes.js` source: `architecture`): `drift`, all three findings low.
`axes_checked`: What this repo produces; SKILL.md authoring; File naming; Status lifecycle; Cross-skill
resources; Platform branching; Plan files; Registries; Validation before commit; Do not. Its findings
were zsh not being listed in tech-stack, Step 0b parsing `.env` alongside the resolver, and no
`generate-catalog` step. None is a finding here:

- task.176 already runs the zsh tests (`review-pr.test.js:26-29`).
- The task's Technical Background states why Step 0b parses `.env` alongside the resolver.
- The catalog changes only if a skill's `description` changes.

**Line anchors.** `develop-pipeline-step-0-resolve-and-prepare.md:118`, `parse-target.sh:232`,
`SKILL.md:397`, `SKILL.md:135` and `bug.3.dod.1…md:5` each resolve to the thing they name.

### Critical

- **C1 — The plan's `.env` sed fails under BSD sed (macOS).** `t;` inside one `-e` script makes BSD sed
  read the rest of the line as a label name.
  - **Location:** Plan § Phase 2, `.env (Step 0b)`.
  - **Evidence:** `printf '%s\n' '"https://acme.atlassian.net" # prod' | /usr/bin/sed -E "s/^[[:space:]]+//; s/^\"([^\"]*)\".*\$/\1/; t; …"`
    → `sed: 2: …: undefined label '; s/^'([^']*)'.*$/\1/; t; …'`, with empty output for all 8 inputs.
    The plan hedges ("verify… if they differ, use two steps"), but the block as written would ship
    broken on the platform the test suite runs on locally.
  - **Fix:** Use separate `-e` expressions, where a bare `t` branches to the end of the script.
    Verified under BSD sed on 8 inputs:
    `sed -E -e 's/^[[:space:]]+//' -e "s/^\"([^\"]*)\".*\$/\1/" -e t -e "s/^'([^']*)'.*\$/\1/" -e t -e 's/[[:space:]]+#.*$//' -e 's/[[:space:]]+$//'`.
    Results: `"…" # prod` → url, `'…' # prod` → url, `… # prod` → url, `"…"` → url, padded `"…"` → url,
    `…#frag` → kept (no space before `#`), `"https://a.net#x" # c` → `https://a.net#x`.

### Important

- **I1 — The "Important Clarifications" example is wrong.** The task says `v1.2/pull/3` "would now
  parse as a URL". Run under both bash and zsh, the planned case arm leaves `v1.2/pull/3` and
  `release/v1.2/pull/3` as branches. Every marker pattern needs `host/x/…`, two segments after the
  dotted head. What the arm does misread is a dotted first segment followed by two or more segments
  and a marker, such as `v1.2/x/pull/3`.
  - **Fix:** Correct the example to `v1.2/x/pull/3`. Keep `v1.2/pull/3` and `release/v1.2/pull/3` as
    branch test cases.

### Optional

- **O1 — The `parse-target.sh:227-233` anchor covers only the `if`/`elif` chain.** The `*://*` arm it
  names is at `parse-target.sh:178`, inside the `case "$TARGET" in` at line 173.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND. These are resolved by the user's decisions.

### Important

- **I2 — No runnable block holds the docs-less guard.** Success criterion 2 promises an "executed
  Step 1a test". Step 1a rung 1 is a table cell, and the plan's guard is a prose blockquote. The rungs
  3–4 block already accepts `DOC_FILE=""` today, so a test of that block passes whether or not the
  guard exists. **Fix (Q2):** Add one fenced guard block to Step 1a. It checks
  `[ -d "$(git rev-parse --show-toplevel)/docs" ]`. If `docs/` is missing, it sets `DOC_FILE=""`.
  Otherwise it runs §0a and sets `DOC_FILE=$LOCAL_PATH`. Step 2 rung 4 cites the same block. A
  `lookupBlock()`-style test helper extracts it.
- **I3 — No runnable block holds the rung 2 filter.** Success criterion 4's fixture test has nothing to
  execute. Today rung 2 is only checked by a regex (`review-pr.test.js:211`). **Fix (Q1):** Make rung 2
  the §0a lookup with `KEY_FIELD=pr_number KEY_VALUE=$PR_NUMBER`. Ran on the live tree:
  `pr_number 290` → `DOC_STATUS=none` (the bare grep returns the bug.3 DoD). `pr_number 554` →
  `found` (task.176's own document). Add the ambiguous-match HALT to Breaking Changes, because it is new
  behaviour for rung 2. Rung 2 also reads `docs/`, so the docs-less guard must run before it.

### Optional

- **O2 — Step 2 rungs 1–3 also read `docs/`.** The plan says a docs-less Step 2 "continues at rung 5".
  Rungs 1–3 then run `find docs` / `grep docs/` against a missing directory. The result is harmless
  stderr noise, but it is cleaner if the guard covers rungs 1–4.
- **O3 — Effort.** 8h is plausible for four small fixes, each with bash and zsh tests and a mutation
  check.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (I2 and I3 above are the success-criteria side of the same gaps).

- Success-criteria classification: SC1 and SC3 are behaviour criteria with named tests. SC2 and SC4
  are behaviour criteria whose tests could not run until I2 and I3 are fixed. Performance ("no extra
  network call") is held by the existing gating pin. Nothing depends on the PR being merged.
- §0a still halts when called directly: the existing test `review-pr.test.js:1679-1688` (CR2-6) holds
  that and stays green.

### Optional

- **O4 — Step 2's "Exclusion filter" paragraph restates the kind list, and its copy lacks
  `*sprint-review-summary.md`.** The task says that paragraph "cites" §0a. It cites it and also
  restates the list. Once rung 2 reuses §0a, consider replacing the restated list with the citation
  alone.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. After I1, the medium risk (a branch misread as a URL) is described accurately.
Rollback covers each phase.

---

## Summary of Recommendations

### Must Fix (Critical) - 1

1. C1: replace the plan's `.env` sed with the verified multi-`-e` form.

### Should Fix (Important) - 3

1. I1: correct the misread example to `v1.2/x/pull/3`. Keep `v1.2/pull/3` as a branch case.
2. I2: add the fenced docs-less guard block and test it by extraction (per Q2).
3. I3: make rung 2 the §0a lookup with `KEY_FIELD=pr_number`, and record the ambiguous HALT (per Q1).

### Consider (Optional) - 4

1. O1: re-anchor the `*://*` arm to `parse-target.sh:178`.
2. O2: have the guard skip Step 2 rungs 1–4, not only rung 4.
3. O3: none (effort is fine).
4. O4: replace the restated kind list in Step 2 with the §0a citation.

---

## Implementation Readiness Assessment

**Score:** 7/10 before fixes, 9/10 after

- Template Compliance: 10/10
- Technical Accuracy: 6/10 (one falsified invariant, one false example)
- Implementation Clarity: 7/10 (two success criteria had no runnable target)
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High once the fixes are applied

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-10-03
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.177.review-pr-resolution-edge-cases/task.177.review-pr-resolution-edge-cases.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (Pre-pass B)
- **Pre-pass:** B `drift` (all low), C `not-implemented`
