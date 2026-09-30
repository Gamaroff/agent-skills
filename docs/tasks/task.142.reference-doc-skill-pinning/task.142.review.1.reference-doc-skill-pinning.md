# Task Review Report: Task 142 - Pin the hand-written reference docs to the skills they describe

**Reviewed:** 2026-09-30
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT (before fixes) → GOOD (after Step 8.5 fixes)

> **Implementation Status**: ✅ All 6 critical + important recommendations implemented — 2026-09-30

---

## Executive Summary

The task is well scoped and its motivation, limits and rollback are unusually well written. But the
plan's code would not have run: it is written as an ES module for a `"type": "commonjs"` package, and
its "last `/token` wins" resolver, run against today's `commands.md`, resolves line 143 to a path
segment (`handoff-verify`) rather than a skill. Both are plan-code defects, fixed in the document.
Running the corrected rule also surfaced one real reference-doc defect for Phase 3 to fix.

**Critical Issues:** 2 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — autonomous run (`/develop-next` → `/develop-task` Step 2); every decision below was taken on the evidence and is recorded as such
**Implementation Readiness:** 7/10 before fixes, 9/10 after
**Recommendation:** READY TO IMPLEMENT (after the Step 8.5 fixes applied below)

---

## User Decisions & Clarifications

No `AskUserQuestion` was issued: the review ran inside an autonomous pipeline. Each question point was
resolved on measured evidence, and the resolution is stated so a human can overturn it.

### Question Point 1: Structure & Scope

- **Scope**: unchanged. One new test file plus the reference-doc fixes its first run surfaces.
- **The `/session-handoff --read` row** (a real defect the test will find): in scope, per § 4 "Any
  reference-doc fix the assertions surface on first run". Fix the **row**, not the skill — the skill's
  read mode is a mode, not a flag, and `SKILL.md` never advertises `--read`.

### Question Point 2: Technical & Implementation

- **Module format**: CommonJS, matching every neighbour in `tests/` and `package.json`
  `"type": "commonjs"`.
- **Resolution rule**: word-start `/name` tokens in the first cell, last wins; the cell is split on
  **unescaped** pipes. Measured below.

### Question Point 3: Completeness & Safety

- **Relationship to `tests/skill-doc-coverage.test.js`**: sits beside it — it asserts the opposite
  direction (skill → page), this asserts page → skill. Named in the document now.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter carries `type`, `description`, `tags`; no placeholders.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve; `+N more` counts are
  informational (Summary +4, Success Criteria +12, Breaking Changes +2).
- `doc-links.js`: every relative link in the task and the plan resolves.
- Change Log present (`1.0 Initial draft`), current for `planned`. Sign-off not enabled.
- GitHub issue #467 exists (OPEN); body link `[#467](…/issues/467)` matches frontmatter.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (the defects are wrong rules, not invented artefacts)

Pre-pass B (architecture alignment, `prepass-axes.js` source `architecture`): **aligned**, axes checked
— What this repo produces, File naming, Cross-skill resources, Validation before commit, Do not. Two
low notes, folded into Optional O3 below.

### Critical

- **C1 — Falsified invariant: "the last `/token` in the cell wins" (check 11).** The plan's resolver
  is `cell.matchAll(/\/([a-z0-9-]+)/g)` → last match. Run against `commands.md` at `80f460bc`, row 143
  — `` `/session-handoff --read` (`command node .agents/skills/session-handoff/scripts/handoff-verify.mjs …`) ``
  — resolves to **`handoff-verify`**, the last path segment, and the test is red on arrival for the
  wrong reason. Evidence: a prototype of the plan's rule returned `bad: [ '143:handoff-verify' ]`.
  - **Fix applied**: only a `/name` token at a word start (start of cell, whitespace, backtick or `(`)
    is a command — `/(?:^|[\s`(])\/([a-z0-9][a-z0-9-]*)/g`. `/loop /develop-next` still resolves to
    `develop-next`; path segments never match.
- **C2 — The plan's code cannot load.** It uses `import … from "node:test"` and `import.meta.url` in a
  `tests/*.test.js` file, and `package.json` declares `"type": "commonjs"` — every neighbour
  (`bundled-links.test.js`, `skill-doc-coverage.test.js`) is `"use strict"` + `require`. As written the
  file throws at load, which `node --test` reports as a failed file, not as a test failure.
  - **Fix applied**: plan code rewritten in CommonJS with `path.join(__dirname, "..")`.

### Important

- **I1 — Cell splitting breaks on escaped pipes.** `line.split("|")[1]` truncates
  `` `/review-pr [PR\|branch]` `` (line 60) and `` `/tracker-reconcile [<dir> \| <handover.json> \| --all] [--apply] [--json]` ``
  (line 116), dropping line 116's three flags from the flag assertion. **Fix applied**: split on
  `/(?<!\\)\|/`.
- **I2 — Same-class mechanism inventory missing (check 6).** `tests/skill-doc-coverage.test.js`
  already reads both reference pages and asserts the **reverse** direction (every skill is named in
  both pages, with two adoption lists); `tests/restricted-access-docs.test.js` reads both for task.57
  labels. The document named neither. **Fix applied**: named in § 3, with "sits beside" justified —
  opposite direction, no overlap in assertion.
- **I3 — Phase 3's "measured in advance: 0 flag failures" is stale.** With the corrected rule, row 143
  advertises `--read`, and `skills/session-handoff/SKILL.md` never mentions it (`grep -c -- --read` →
  0; read mode is invoked by intent, and its script by `handoff-verify.mjs`). That is exactly the
  defect class the task exists to catch. **Fix applied**: Phase 3 now names it as the one known real
  finding, with the fix (rewrite the row as read mode).
- **I4 — The flag floor depended on a rule that has changed (check 7).** The plan counted flags over
  a cell truncated at escaped pipes. Re-measured over the corrected cell: **20** flag assertions.
  **Fix applied**: the floor is stated with its definition and re-measure command; set from the
  as-built count at implementation (≥ 16 recommended).

### Optional

- **O1 — Counts have drifted since 2026-09-22.** Measured at `80f460bc` with the corrected rule: 80
  command rows, 76 slash rows naming 63 distinct skills, 4 non-skill rows (`run-loop.mjs …`), 20 flag
  assertions; activation table 73 backticked spans, 67 skill mentions over 62 distinct skills, 2
  standalone flag spans, 4 other non-skill spans. Floors of ≥ 70 / ≥ 58 still hold. Updated in § 3.
- **O2 — The activation extractor skips non-skill spans silently.** `` `/develop-story` `` and
  `` `/develop-task` `` (line 32), `` `/security-review` `` (line 33, a Claude Code built-in, not a
  skill) and `` `handoff-verify.mjs` `` (line 108) are rejected by the head-token regex. Correct, but
  the header comment should say so. Noted in Known Issues.
- **O3 — Symlink note.** Both `.claude/skills → ../skills` and `.agents/skills → ../skills` exist and
  are gitignored; the plan named only the first. Pre-pass B also noted `tech-stack.md` does not
  describe the root `tests/` suite (not this task's to fix).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

Three phases, each with files, changes and dependencies; mutation table present; effort 4h matches
the rubric band for 3 phases / low risk.

Pre-pass C (codebase scan): **not-implemented** — `tests/reference-doc-skill-pinning.test.js`,
`extractCommandRows`, `extractActivationSkills` and `NON_SKILL_ROWS` do not exist; the
`tests/*.test.js` glob is confirmed in `package.json`.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

Success criteria map to the three groups; mutation proofs cover each; the out-of-scope list is
explicit. The mutation row "resolve the first `/token` instead of the last" still discriminates under
the corrected rule (`/loop /develop-next` → `loop`, no `skills/loop/`).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The medium risk — a green run read as "the docs are correct" — is correctly the headline, and its
mitigation (the header comment) is a deliverable. Rollback is `git rm` of one file.

---

## Summary of Recommendations

### Must Fix (Critical) - 2 issues — ✅ applied

1. Word-start `/name` resolution (C1).
2. CommonJS module format (C2).

### Should Fix (Important) - 4 issues — ✅ applied

1. Split cells on unescaped pipes (I1).
2. Name `skill-doc-coverage.test.js` and `restricted-access-docs.test.js` (I2).
3. Record the `/session-handoff --read` finding for Phase 3 (I3).
4. Re-derive the flag floor from the corrected rule (I4).

### Consider (Optional) - 3 items — ✅ applied (O1, O2, O3)

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes; 7/10 before)

- Template Compliance: 10/10
- Technical Accuracy: 9/10 (6/10 before)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — both critical defects were in the plan's code, not in
the task's intent, and are corrected in the document with the measurement that justifies them.

---

## Next Steps

Task is ready for implementation. Developer should implement the corrected extractors, re-measure the
floors against the tree as built, fix the `/session-handoff --read` row, and mutation-prove each group.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous — develop-task Step 2)
- **Review Date:** 2026-09-30
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.142.reference-doc-skill-pinning/task.142.reference-doc-skill-pinning.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (via pre-pass B)
- **Evidence tree:** `develop` at `80f460bc`
