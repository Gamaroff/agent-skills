# Task Review Report: Task 169 - Close the four advisory findings on the reference-doc pinning test

**Reviewed:** 2026-10-26
**reviewed_blob:** fe3b2282b54a5d4faec13febcc0bff654efb362c
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-10-26

---

## Executive Summary

A small, well-scoped test-only task. Every technical claim was re-measured on `develop` at `81ea2550`
and holds: the boundary regex fails no live flag, all three activation flags are documented, and no
`SKILL.md` is empty. Two gaps would have let a success criterion pass with its fix half-reverted —
both are fixed in the document now.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous `develop-task` run; no ambiguity needed a human)
**Implementation Readiness:** 8/10 before fixes, 9/10 after
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The review ran inside `/develop-task` Step 2 (invoked by `/develop-next`, `--defaults`).
Every finding below had one obvious fix that changes no scope, so no question point was reached.

Pre-pass agents B and C were **not dispatched**; both passes were performed inline (independence loss
recorded here). Architecture axes from `prepass-axes.js` (`source: architecture`): Runtimes, Languages,
Package management, Distribution, Test and eval harness, Infrastructure and CI, Skill-bundled assets.
Alignment: **aligned** — `node:test` + `node:assert` in a `tests/*.test.js` file the runner already
reaches. Implementation status: **not-implemented** — no `documentsFlag`, `getCorpus` or
`emptySkills` exists in the file.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present; no placeholders.
- OKF: `type: task`, `description`, `tags` (list) present.
- Change Log present and current (status `planned`, newest row the initial draft).
- Sign-off: not enabled in `skills-config.yaml` — not checked.
- Tracker: `github_issue: 535` exists (OPEN); body link `[#535](…/issues/535)` matches. Board
  Priority self-healed to P3.
- Card preflight: 3 card blocks resolve (exit 0). Doc links: 1 relative link resolves (task and plan).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every function, `describe` title and variable the task names exists in
`tests/reference-doc-skill-pinning.test.js` as described. Activation line anchors 29, 30 and 105 of
`docs/reference/activation-phrases.md` hold the three flags named.

Invariants run (check 11), on `81ea2550`, with the plan's `documentsFlag`:

- `documentsFlag("use --read-only here","--read")` → `false`; `("pass --read.","--read")` → `true`;
  `("--apply=x","--apply")` → `true`.
- Live command-row flags: boundary match fails **0**; `includes` fails 0.
- Activation flags: `review-story --validate`, `review-bug --validate`, `observe-work --review` all
  documented under the boundary match.
- Empty `SKILL.md` files: 0.

### Optional

- **The command-row flag count has drifted, and its command is not recorded** (check 7). The task
  says 19 checks; the test's own comment says 20; re-measured now it is **24**. No criterion depends
  on the number (the floor is `>= 16`), so this is Optional — the task now records the definition
  (the `commands.md` rows the extractor yields, deduped per row, against skills that resolve) instead
  of a figure that decays.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (one snippet gap, now fixed)

### Optional

- **The Phase 2 loop snippet drops the skill-span dedupe it tells you to keep.** The prose says
  "keep order-preserving dedupe of *skill* spans", but the snippet iterates `spans` with no dedupe,
  so a cell naming a skill twice would push two mentions. Fixed: the task now states the dedupe as a
  change of its own.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (both fixed)

### Important

- **The empty-vs-missing fixture checks only the commands side** (check 4, behaviour criterion
  names its test). The plan says to split the activation side "the same", but `missingNamed` still
  uses `!lookup(n.skill)`, and the fixture asserts only that `develop-next` is absent from
  `missingCommands`. `develop-next` is also named on `activation-phrases.md:43`, so a half-done fix
  would report it as "does not exist" there and the fixture would stay green. Fixed: the activation
  side is split explicitly (`body === null` → `missingNamed`, blank → `emptySkills`), and the fixture
  asserts `develop-next` is in neither `missingCommands` nor `missingNamed`.
- **The prefix fixture does not exercise the call site** (check 4). It tests `documentsFlag` alone,
  so reverting `resolveCorpus` to `body.includes(flag)` while keeping the helper leaves it green — and
  the success criterion is about the flag *test*, not the helper. Fixed: a call-site fixture runs
  `resolveCorpus` with a lookup that lengthens every `--flag` in each `SKILL.md` (`--x` → `--x-z`), so
  every command-row and activation flag check must fail (`undocumentedFlags.length === flagChecks`,
  `undocumentedActivationFlags.length === activationFlagChecks`); under `includes` none would. The
  mutation table now names both reverts.

Other checks: check 15 (no literal removed — the "does not exist" message is kept), 16, 17, 19 not
applicable; check 18 — `tests/*.test.js` is in `test:suite`; check 20 — the four sites carry grep
anchors.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low-risk, single test file, revert-only rollback. No guard is widened (check 7.1): the change makes
the guard stricter.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues

1. Split the activation side's empty-vs-missing and assert both sides in the fixture. ✅
2. Add a `resolveCorpus`-level prefix fixture so the call site, not only the helper, is held. ✅

### Consider (Optional) - 2 items

1. Replace the drifted flag-check figure with its definition. ✅
2. State the skill-span dedupe as an explicit change. ✅

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes; 8/10 as submitted)

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; both important gaps were in how criteria are held, not in what
the task does, and both are fixed in the document.

---

## Next Steps

Follow the plan phase by phase; run `command node --test tests/reference-doc-skill-pinning.test.js`
after each; record the mutation proofs (now five) in the implementation notes.

---

## Review Metadata

- **Reviewer:** review-task (Claude, inside `/develop-task` Step 2)
- **Review Date:** 2026-10-26
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.169.pinning-test-advisory-fixes/task.169.pinning-test-advisory-fixes.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, coding-standards.md (via `prepass-axes.js`)
