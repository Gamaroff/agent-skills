# Task Review Report: Task 108 - The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Reviewed:** 2026-09-12
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-09-12

---

## Executive Summary

The task is well-motivated and its premise verified: pre-pass C confirms nothing of the deliverable exists (no checker, no re-relativisation in either bundler script, no link lane over `skills/**`), and an independent baseline scan reproduced the breakage (735 broken relative links in 212 `references/` files over a narrower glob than the task's 864/229). Four Important defects were found and fixed in the document: the design rule only decided `docs/` targets and left the 320 unbundled-sibling links (≈45% of the breakage) to re-relativise into `../../../shared/resources/X` — valid in-repo, a 404 in every consumer; the claim that `package_skill.py` "shares the pass" is false (it duplicates three regexes at lines 108–135); the checker spec needed line-based fence tracking (a whole-text regex flips parity on inline ```` ``` ```` mentions — the reviewer's own baseline produced 10 false positives that way) and a pattern-based placeholder rule; and the guard was pointed at the wrong CI lane (`validate.yml` / `validate:all` are the Python lanes; `tests/*.test.js` already runs under `npm test` → `ci`).

**Critical Issues:** 0 🚨
**Important Issues:** 5 ⚠️ (all resolved)
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — pipeline run (`develop-task` via `develop-next`); every question auto-answered with the recommended option and logged below
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Pipeline-autonomous run. No `AskUserQuestion` calls were made; the decisions below are the auto-answers the pipeline records in place of them.

### Question Point 1: Structure & Scope

**Q1: This task has no linked GitHub issue. Create and link one now?**
- **Auto-answer**: Sync to GitHub (Recommended)
- **Impact**: Issue [#395](https://github.com/Gamaroff/agent-skills/issues/395) created, added to the *Agent Skills* board with Priority P1, `github_issue: 395` written to frontmatter, body link inserted. Estimate field not present on the board (warning, non-blocking).

### Question Point 2: Technical & Implementation

**Q2: The Target Architecture decides only `docs/` targets. What should the bundler do with a `shared/resources/` sibling link whose target the skill does not bundle (320 of the measured links)?**
- **Auto-answer (reviewer recommendation)**: one rule — a resolved target *inside the destination skill directory* is emitted relative; *anything else* becomes the upstream URL.
- **Impact**: Target Architecture, Risk Assessment and the plan's Phase 2 rewritten. The `docs/`-only rule would have left ~45% of the breakage as in-repo-only paths.

**Q3: `package_skill.py` does not share a pass with `bundle_skill.py`. Import or duplicate?**
- **Auto-answer (reviewer recommendation)**: import (`from bundle_skill import …`) — the two scripts already carry two copies of the `shared/resources/` regexes; a third pass in each would be the enumeration anti-pattern.
- **Impact**: Overview, Benefits §3, Current Architecture and plan Phase 2 corrected.

### Question Point 3: Completeness & Safety

**Q4: Where should the checker run?**
- **Auto-answer (reviewer recommendation)**: under `npm test` via the existing `tests/*.test.js` glob — no edit to `validate.yml` or `validate:all`.
- **Impact**: Scope, Phase 4, Files Summary, Success Criterion 4 and Progress Tracking updated. Rationale recorded: `validate.yml`/`validate:all` are the Python quick-validate and bundle lanes; a node test there duplicates a lane and, per the `shellcheck.yml` header, a step added to a workflow without a matching `npm run ci` script goes red locally-green.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Change Log present with one row; Progress Tracking and References present.
- Filename `task.108.bundler-rewrites-relative-links.md` conforms.
- OKF: `type: task`, `description`, `tags` list, `updated` all present.
- No placeholders (`[TBD]`, `[TODO]`, `???`) found.
- `sign-off` and `change-log` enforcement not configured in `skills-config.yaml` → sign-off skipped; change-log advisory, present and current (`1.0 Initial draft` at `planned`).
- Tracker card preflight (`sync-jira-task.js --check-card`): `ok: true` — Summary (prose, 1 omitted), Success Criteria (list, 1 omitted), Breaking Changes (prose) all resolve.

### Issues

#### Important
- **Missing tracker issue linkage** — no `github_issue:` in frontmatter. **Resolved**: #395 created and written back (Q1).

### Recommendations (Based on User Decisions)

1. **Link the GitHub issue** — done, _per Q1_.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (resolved)
**Hallucinations Detected:** 0

Verified against the repository:

| Claim | Verdict |
| :--- | :--- |
| `bundle_skill.py` has `SH_SIBLING_RE`, `assert_sourced_siblings_landed()`, `shared/resources/`→`references/` rewrite over `.md`/`.js` | ✅ `bundle_skill.py:28-153` |
| `package_skill.py` "shares the pass" | ❌ It re-declares `SHARED_REF_RE`/`JS_SHARED_RE`/`SH_SHARED_RE` inline (`package_skill.py:108-135`) — **fixed** |
| Pre-commit hook runs the bundler and re-stages | ✅ `.git/hooks/pre-commit` (untracked, local) |
| `validate.yml` runs `bundle_skill.py --check` + no-diff | ✅ |
| `docs-link-check.yml` path-filtered to `docs/**`, README, AGENTS, CONTRIBUTING | ✅ `docs-link-check.yml:13-26` |
| Audit note at `develop-story-pipeline-audit.2026-08-20.md:179-182` | ✅ Theme F, lines 175+ |
| `docs/contributing/packaging.md` exists | ✅ |
| 864 broken / 229 files | ≈ plausible — reviewer's narrower scan (`skills/*/references/*.md` + `SKILL.md` + `shared/resources/*.md`): 735 / 212; the checker's own Phase-1 number is the record |
| `tests/*.test.js` in the `npm test` glob | ✅ `package.json` `test` — so `ci:fast`, `ci`, `test.yml` all pick a new file up |

PREPASS_B (architecture alignment): `aligned`; two low notes — `blob/develop` pin vs tagged-release tarballs (accepted in Risk Assessment; one constant), and References citing `.agents/skills/create-skill/` where the canonical source is `skills/create-skill/` (**fixed**).

### Issues

#### Important
- **`package_skill.py` "shares the pass"** — false; see table. **Resolved** (Q3): Overview, Benefits, Current Architecture and plan corrected to "import the pass from `bundle_skill.py`".

#### Optional
- References cited `.agents/skills/create-skill/`; canonical is `skills/create-skill/`. **Fixed.**

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved)

### Issues

#### Important
- **Undecided rule for unbundled siblings** — Target Architecture only decided `docs/` targets. Reviewer's classification of the breakage in `references/` copies: 347 `../../docs/…`, 320 bare siblings not bundled into the skill (`open-knowledge-format.md` ×64, `change-log.js` ×48, `sign-off.md` ×38 …), 58 other (`../../AGENTS.md` ×10, `../../tests/fixtures/…` ×6, template placeholders). `os.path.relpath` on a sibling yields `../../../shared/resources/X` — resolvable in this repo, not in a consumer. **Resolved** (Q2): one rule, in-bundle → relative, else upstream URL.
- **Checker spec: fence handling and placeholders** — "skips fenced code" was under-specified. A whole-text regex flips parity on inline triple-backtick mentions (`qa-task/SKILL.md:515`); the reviewer's first scan produced 10 false positives in `qa-task/SKILL.md` and `shard-prd/SKILL.md` this way. The placeholder list (`url`, `path`, `…`) misses the templated shapes (`./task.{id}.{name}.md`, `../../prd.[name].md`). **Resolved**: line-based fence tracking and a pattern rule (`{…}`/`[…]` in any segment) written into Important Clarifications; realistic-looking example links (`./bug.8.5.3.1.…`, `./schema-catalog.md`) are to be fenced at the source rather than special-cased.
- **Guard wired to the wrong lane** — Phase 4 / SC4 named `validate.yml` and `npm run validate:all`. **Resolved** (Q4).

#### Optional
- `estimated_effort_hours: 6` — rubric (6 success criteria, 5 plan steps, medium risk) lands in the same band; no divergence flagged.

### Recommendations (Based on User Decisions)

1. **Apply the single in-bundle/else-upstream rule in both scripts, via one imported function** — _per Q2, Q3_.
2. **Build the checker with a line-based fence parser and a pattern placeholder rule** — _per Q2 clarifications_.
3. **Let `npm test` carry the checker; touch no workflow** — _per Q4_.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Overview ↔ Implementation Plan ↔ Files Summary ↔ Success Criteria now agree on: one pass in `bundle_skill.py`, imported by `package_skill.py`; checker under `npm test`; docs updates.
- Testing Strategy covers unit (fixture tree), integration (idempotent bundle; checker → 0), mutation (revert pass → red; delete floor → fails on empty walk), and the full suite. Adequate.
- Success criteria are measurable (counts, no-diff, red/green, file references).
- Scope: 5 plan steps, 3 progress phases, one module (`create-skill/scripts` + one test) — not oversized.
- No Mermaid diagrams present; none warranted — the rule is a two-branch conditional stated in one sentence.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Risk correctly Medium: one wrong rule rewrites 229 files. Mitigation (checker first, then rewrite) is the right order and is Phase 1.
- Rollback (`git revert` + re-bundle) is complete and returns to the shipped state; no consumer migration.
- The `blob/develop` pin is recorded as a deliberate constant; PREPASS_B's note that tarball distribution is tagged is acknowledged in the Risk Assessment wording (one-line change to a tag later).

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 5 issues — all applied

1. Link a GitHub issue — #395.
2. Decide the unbundled-sibling rule — single in-bundle/else-upstream rule.
3. Correct "shares the pass" — `package_skill.py` imports the pass.
4. Specify line-based fence tracking and a pattern placeholder rule for the checker.
5. Move the guard to `npm test`; drop the `validate.yml` / `validate:all` wiring.

### Consider (Optional) - 3 items

1. References path `.agents/skills/…` → `skills/…` — applied.
2. `blob/develop` pin — accepted, recorded; make it one constant.
3. Example links with realistic targets — fence them at the source as found.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10 (tracker linkage was missing; now linked)
- Technical Accuracy: 9/10 (one false sharing claim, corrected)
- Implementation Clarity: 9/10 (design rule and checker spec now unambiguous)
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Premise verified by measurement and pre-pass; the one genuine design gap (unbundled siblings) is now decided with a single rule, and the checker spec names the two false-positive classes the reviewer hit while reproducing the baseline.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Phase 1 first — commit the checker with its floor and record the baseline before touching the bundler.
2. Implement the one rule in `bundle_skill.py`; `package_skill.py` imports it. Bundle twice; second run no-diff.
3. Mutation-prove (revert the pass → the checker, not another test, goes red) and record it.
4. Update the audit note, packaging doc, CHANGELOG `[Unreleased]`; label the 229-file churn as mechanical in the PR.

---

## Review Metadata

- **Reviewer:** Claude (review-task, pipeline mode via develop-task ← develop-next)
- **Review Date:** 2026-09-12
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.108.bundler-rewrites-relative-links/task.108.bundler-rewrites-relative-links.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` (via pre-pass B)
- **Pre-pass:** B `aligned` (2 low); C `not-implemented` (5 findings)
- **Baseline scan (reviewer, independent of the deliverable):** 626 files, 1,610 links, 735 broken in 212 files; shape 347 docs / 320 unbundled siblings / 58 other; 10 false positives attributable to regex fence parsing
