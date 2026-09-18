# Task Review Report: Task 122 - Twelve skills carry bundled copies no discovery rule reaches

**Reviewed:** 2026-09-18
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

The task's measured population is correct — re-run on 2026-09-18 with the same two bundler functions
(`discover_needed` + `source_backed_on_disk`), it is still **15 copies across 12 skills**, member for
member. Its **categorisation** of that population is not: tracing each copy back to its invocation shows
3 real dependencies (not 8), 12 dead copies (not 5), and 0 prose-kept copies (not 2). Phase 2's discovery
rule was designed around an invocation spelling (`.agents/skills/{literal-skill}/references/X`) that
none of the 15 copies actually uses — the three real ones use the bare `{skill}` placeholder, which the
rule as specified does not match and which, if treated as a wildcard, would vendor `change-log.js` into
24 skills. The UNREACHED class (Phase 1) and the deletion mechanism (Phase 3) are sound; the numbers,
the Phase 2 design and one Out-of-Scope line need to change before development.

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 2 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-09-18 (task document and plan file rewritten per Q1/Q2; the two drifted anchors also corrected). Post-fix readiness: 9/10, READY TO IMPLEMENT.

---

## Decisions Log

Branch setup:
  - Started on: develop
  - Now on:     feature/task.122.bundle-check-unreached-copies
  - Base:       develop
  - Epic branch: N/A
  - Auto-skip:  false

Pre-pass (Phase 1.5): Agent B `alignment: aligned`; Agent C `implementation_status: not-implemented`
(no `UNREACHED`, no `INVOKE_REF_RE`, no test; all seven listed deletions still on disk).

---

## User Decisions & Clarifications

### Question Point 1–2 (combined): Structure, Technical & Implementation

**Q1: How should `verify-push-state.sh` become discovered, given the `{skill}` placeholder?**
- **User Decision**: Alternation reword + rule — change `develop-pipeline-step-8-commit.md:108` to
  `.agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh` (the
  spelling the step-0/2/3/4 docs already use), so the proposed `INVOKE_REF_RE` alternation branch
  discovers it, scoped. Amend the Out-of-Scope line that forbids respelling.
- **Impact**: Phase 2 keeps its regex but gains one shared-doc edit and an explicit "bare `{skill}` is
  never followed" rule; the rule is exercised by 3 live copies rather than 0.

**Q2: Apply the re-categorisation (12 deletions, 15 → 12 → 0)?**
- **User Decision**: Yes — 12 deletions.
- **Impact**: Problems 1–3, Target Architecture, Phases 2–3, Files to Delete, Integration Tests and
  Success Criteria are rewritten to the measured figures. The grep-before-delete mitigation stays as
  the safety net.

### Question Point 3: Completeness & Safety

No question needed — Steps 6–7 found nothing requiring user input (see §4, §5).

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory sections present and numbered; Change Log, Progress Tracking, References present.
Filename `task.122.bundle-check-unreached-copies.md` conforms. Frontmatter: `type: task`,
`description`, `tags` (list), `updated` all present. No placeholders. `github_issue: 422` → issue is
OPEN, body link `[#422](…/issues/422)` matches. Card preflight: 3 blocks resolve (Summary 600 chars
+1 more; Success Criteria 446 chars +2 more; Breaking Changes 159 chars). Change Log current for
`status: planned`. `sign-off` not configured — not checked.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (a mechanism claimed to exist in the tree that does not)

### Issues

#### Critical

- **Phase 2's discovery rule targets an invocation spelling none of the 15 copies uses.**
  - **Location:** §2 Problem 1, §3 Target Architecture, §6 Phase 2, §9 Functional criterion 2.
  - **Issue:** The task states the eight real dependencies are "invoked from bundled shared text as
    `.agents/skills/{skill}/references/X`" and scopes `INVOKE_REF_RE` to "matches whose skill group
    equals the skill being bundled, or is a `{a|b|c}` alternation containing it".
  - **Evidence:** `grep -rnoE '\.agents/skills/[^/ ]+/references/[A-Za-z0-9._-]+' shared/resources/`
    filtered to the eight names returns exactly one line:
    `develop-pipeline-step-8-commit.md:108: bash .agents/skills/{skill}/references/verify-push-state.sh`.
    That is a bare `{skill}` **placeholder** — the brace branch of the proposed regex yields
    `names == ['skill']`, so `skill_path.name in names` is false for every skill and the rule discovers
    **zero** of the copies it exists for. Treating a bare `{skill}` as "the bundling skill" is not a
    safe fallback either: `document-change-log.md:184` writes
    `require("./.agents/skills/{skill}/references/change-log.js")` and is bundled into 41 skills, 24
    of which do not carry `change-log.js` — a wildcard would vendor it into all 24 (measured), which is
    the 38-file over-match class §3 warns about. The other five "real dependencies" are never invoked
    at all (see Important below).
  - **Recommendation** (_per Q1_): respell step-8-commit.md:108 as
    `.agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh`, keep
    `INVOKE_REF_RE` following literal names and `{a|b|c}` alternations only, and state in §3 that a bare
    `{placeholder}` group is deliberately not followed, with the 24-skill measurement as the reason.
    Amend §4 Out of Scope accordingly.

#### Important

- **Five of the "eight real dependencies" are dead, not invoked.**
  - **Location:** §2 Problem 1; §7 (absent from Files to Delete).
  - **Evidence:** `qa-task/references/{develop-pipeline-step-0-resolve-and-prepare.md,
    develop-pipeline-step-1-create-branch.md, resolve-paths.sh}` and the two step docs in `qa-story`
    are mentioned inside those skills only as bare filenames in comments
    (`read-config.sh:710,727,787`, `resolve-platform.sh:588`, `gh-stage.js:521`) — never invoked,
    never cited from `SKILL.md`. (`qa-story/SKILL.md:2906` cites `references/resolve-paths.sh`, which is
    why qa-story's copy of *that* file is discovered and qa-task's is not.)
  - **Recommendation** (_per Q2_): move the five to Files to Delete; real-dependency count 8 → 3.

- **The two "prose" copies are not kept alive by `REFS_REF_RE`; they are plain dead copies.**
  - **Location:** §2 Problem 3; §7 items 11–12; plan Phase 3.
  - **Evidence:** `REFS_REF_RE.finditer(create-task/SKILL.md)` returns no `set-github-project-priority`
    match — the mention at `create-task/SKILL.md:580` is a bare backticked filename, and
    `create-story/SKILL.md` has zero mentions. If the regex matched, the copy would be in `needed` and
    could not appear in the task's own unreached list. No reword is needed.
  - **Recommendation** (_per Q2_): delete both outright; drop the "reword the parenthetical" clause.

- **§4 Out of Scope contradicts the fix chosen for Q1.**
  - **Location:** §4 "❌ Rewriting the `.agents/skills/{skill}/…` invocations into some other spelling."
  - **Recommendation** (_per Q1_): narrow to "rewriting the `.agents/skills/…/references/X` invocations
    into a non-`.agents/skills` spelling"; the alternation respell stays in scope.

#### Optional

- **Line anchors drifted** (obs #22): plan says "beside `REFS_REF_RE` (l.30)" — it is at
  `bundle_skill.py:54`; plan says prose at `create-task/SKILL.md:577` — it is line 580. All other
  anchors (400, 488, 760, 762, 867, 885–892, 1060, 1094, 1116–1121; test 13–40, 218–265, 351) resolve.
- **State the bare-placeholder exclusion explicitly.** `{skill}` also appears in
  `tracker-comment-contract.md` and `pr-inline-comment-contract.md`; those are already discovered by
  other rules, but the next author of a step doc needs to know the placeholder form is invisible to
  discovery and the alternation form is not.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after the count corrections above)

Each phase names files, concrete checkbox changes, risk level and dependencies. The plan file gives
the exact `REMEDIES` entry, the `check_skill` insertion point and rationale, the regex, the
`pending_quiet` choice with its reason, and the fixture shape. `check_all` (l.1100–1101) already
prints non-`REGENERABLE` classes generically, so the plan's "nothing to add unless it hard-codes the
taxonomy" is confirmed. `package_skill.py` imports only `rewrite_text, rewrite_md_links,
expected_bytes` from `bundle_skill` and uses `collect_shared_refs` over `rglob('*.md'|'*.js'|'*.sh')`
**including `references/`**, so it reaches these copies by walking the already-bundled tree — the
"confirm it picks up the new rule or add it" checkbox stands and the answer is "it does not need the
rule for the zip; do not add a second definition".

### Issues

#### Optional
- **`estimated_effort_hours: 4` vs rubric ≈ 12h** (7 success criteria, 10 plan checkboxes, 12 files,
  `has_integration` tripped by the "Integration Tests" heading). The rubric overstates here — the
  work is one regex, one class, one fixture and twelve `git rm` — 4h is plausible; confirm or nudge to 6.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (all numeric; resolved by the Q2 rewrite)

- Overview / Problems / Target Architecture / Phase 2 verification / Integration Tests / Success
  Criteria all carry the 8-real / 7-delete / 15→7→0 figures that the measurement contradicts. After
  the rewrite: 3 real / 12 delete / 15→12→0.
- Files Summary ↔ phases: consistent once the five qa-* copies join Files to Delete.
- Testing: unit, contract (measurement-based `REGENERABLE` proof), integration and consumer tests all
  map to the changes. The `tests/*.test.js` glob in `package.json` already runs
  `bundle-check-mode.test.js` — no orphaned suite (cf. memory: npm test glob orphans).
- CI trigger (obs #102): `validate.yml` runs `bundle_skill.py --check` on `skills/**` and
  `shared/resources/**` — every file this task touches is in the trigger list.
- Same-class inventory (obs #103): §3 Current Architecture names every existing discovery rule
  (`shared/resources/X`, `REFS_REF_RE`, JS/shell sibling imports) and says the new one sits beside
  them, scoped by skill name — adequate.
- Scope: 3 phases, one PR, one developer. Not oversized.
- Mermaid: none; the ASCII current/target block conveys the structure. No diagram recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The one Medium risk (over-matching regex) is real and the task's own mitigation — scope to skill name,
test the negative case, diff `git status` for unexpected new copies — is exactly what caught the
`{skill}` wildcard hazard during this review. Rollback is a single `git revert` + re-bundle;
"Partial Rollback" correctly warns that keeping Phase 1 alone leaves CI red. Low risk "CI red before
Phase 3 lands — ship in one PR" is right; with the class returning exit 1 from `check_all`, any missed
copy is named on the PR.

### Issues

None.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. Redesign Phase 2 around the spelling that exists: respell `step-8-commit.md:108` to the
   `{develop-story|develop-task|develop-bug}` alternation, keep `INVOKE_REF_RE` to literal + alternation,
   and document that a bare `{placeholder}` is never followed (24-skill measurement). — _Q1_

### Should Fix (Important) - 3 issues

1. Move the five qa-task/qa-story copies to Files to Delete; 8 real → 3. — _Q2_
2. Delete `set-github-project-priority.sh` ×2 outright; drop the reword clause. — _Q2_
3. Narrow the Out-of-Scope line that forbids respelling. — _Q1_

### Consider (Optional) - 3 items

1. Correct the two drifted anchors (l.30 → l.54; :577 → :580).
2. Name the bare-placeholder exclusion in §3 Important Clarifications.
3. Confirm `estimated_effort_hours` (4h stands; rubric says 12h, driven by a keyword false positive).

---

## Implementation Readiness Assessment

**Score:** 7/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 5/10
- Implementation Clarity: 8/10
- Consistency: 6/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High (once the Phase 2 design is corrected —
the remaining work is mechanical and the class itself is well specified)

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** The mechanism (UNREACHED class, non-regenerable, one scoped regex, tree deletions)
is right and fully specified; the document's population *categorisation* was never traced to
invocations, so Phase 2 as written would ship a rule that discovers nothing and a deletion list five
files short. Both are fixed by rewriting numbers and one shared-doc line, per the two user decisions.

---

## Next Steps

Address before implementation:

1. Apply the Q1 redesign to §2 Problem 1, §3 (both blocks), §4 Out of Scope, §6 Phase 2, §9.
2. Apply the Q2 re-categorisation to §2 Problems 1–3, §6 Phase 3, §7 Files to Delete (12), §8
   Integration Tests (15 → 12 → 0), §10 Partial Rollback wording.
3. Fix the two anchors in the plan file.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-09-18
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.122.bundle-check-unreached-copies/task.122.bundle-check-unreached-copies.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, source-tree.md (via pre-pass B)
- **Measurements run:** `discover_needed` + `source_backed_on_disk` over every skill (15/12 confirmed);
  invocation grep over `shared/resources/` for all 15 names; `REFS_REF_RE` against create-task/create-story
  SKILL.md; wildcard-vendoring prediction for every `{skill}` placeholder site (24 new `change-log.js` copies)
- **Observation written:** #124 (create-task: categorisation of a measured population ships without per-member evidence)
