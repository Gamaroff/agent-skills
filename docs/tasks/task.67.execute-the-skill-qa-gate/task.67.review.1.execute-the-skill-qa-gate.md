# Task Review Report: Task 67 — Make QA execute a prose skill, not only read it

**Reviewed:** 2026-08-31
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-08-31

---

## Executive Summary

Task 67 is a well-motivated, evidence-backed task: it names a real defect that passed two QA cycles and a DoD gate (the task-66 multi-glob `ls` that returns 0 files under zsh and 7 under bash), and proposes a proportionate fix. Structure, scope, risk analysis and rollback are all sound — 11/11 mandatory sections, no placeholders, every reference resolves, card preflight clean.

The findings are all about **how the plan meets this repository**, not about whether the idea is right. One would have produced a red build; three would have sent the implementer to a file or a heading that does not exist.

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run; ambiguities resolved against repository evidence and recorded as documented assumptions below
**Implementation Readiness:** 8/10
**Recommendation:** ✅ READY TO IMPLEMENT

---

## Documented Assumptions (in lieu of clarifying questions)

This review ran inside `/develop-task` under an autonomous directive, so ambiguities were resolved from repository evidence rather than by asking. Each is recorded so it can be overridden:

| # | Ambiguity | Resolution | Evidence |
|---|---|---|---|
| A1 | Phase 5 names `evals/qa-task/` **or** `shared/resources/tests/` | Pinned to `shared/resources/tests/` | `evals/qa-task/` does not exist; §7 already named the `shared/resources/tests/` path |
| A2 | "State the rule where both QA skills can reference it once" — which file? | New `shared/resources/qa-runnable-prose-detection.md` | The proposed host file is bundled into `develop-*` only, not into either QA skill |
| A3 | Task has no `github_issue:` | **Not** synced — no remote issue created | Creating a public issue is an outward-facing side effect; an autonomous run should not do it unprompted. Siblings are mixed (60/61/65 linked; 62/63/64 not) |
| A4 | `.mjs` vs `.js` for the new shared script | Left as `.mjs` | Mixed convention; all sibling test files are `.test.mjs`, and `tech-stack.md` sanctions `.mjs` ESM |

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 mandatory numbered sections present (Overview → Rollback Plan), plus Change Log, Progress Tracking, References, Notes.
- Filename `task.67.execute-the-skill-qa-gate.md` follows dots-for-structure / hyphens-within-name.
- OKF frontmatter: `type: task` ✅, `description` ✅, `tags` ✅, `updated` ✅. No placeholders (`[TBD]`/`[TODO]`/`???`) anywhere.
- Sign-off: **not checked** — `sign-off.enabled` is absent from `skills-config.yaml`.
- Change Log: present, four canonical columns, current with `status: ready-for-development` (a `review-task` row records the promotion). ✅
- Tracker card preflight (`sync-jira-task.js --check-card`): **exit 0** — Summary, Success Criteria and Breaking Changes all resolve, with `+N more` links for 2/5/2 omitted items respectively.

### Issues

#### Important
- **Tracker linkage absent** — no `github_issue:` in frontmatter. Sync deliberately not performed (assumption A3). Run `/sync-github-task` if a board card is wanted.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Every file path, tool and reference in the task resolves. No invented libraries: the plan names `node --test`, Node ≥22, bash and zsh — all in-stack, no new dependencies. The task correctly edits `shared/resources/` sources and never the `AUTO-GENERATED` bundled copies.

### Issues

#### Critical
- **🚨 C1 — No `npm run bundle` step; regenerated files not listed.** The task adds one new `shared/resources/` file and edits another, both referenced from skills, so the bundled `skills/*/references/*` copies change. `.github/workflows/validate.yml:58` runs a **Bundle freshness check** that re-runs `bundle_skill.py --all` and fails when `git diff --quiet -- 'skills/*/references/*'` is dirty.
  - **Impact:** the PR goes red at CI, after the work looks finished.
  - **Fix applied:** added the bundle checkbox to Phase 4, a "Files Regenerated" group to §7, a Repository-integration success criterion, and a Progress-Tracking line. The CI workflow is now cited in References.

#### Important
- **⚠️ I1 — The detection rule's proposed home is not readable by the skills that execute it.** Phase 1 placed the rule in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`. That file is bundled into `skills/develop-story/references/` and `skills/develop-task/references/` — and **into neither QA skill**. "State it once so both QA skills can reference it" therefore did not hold as written.
  - **Fix applied:** rule moved to a new QA-owned `shared/resources/qa-runnable-prose-detection.md`, referenced by both QA skills, cross-linked from the orchestrator doc. A note explains why.

- **⚠️ I2 — "Add Step 4b" has no insertion point in `qa-story`.** `qa-task` is step-numbered (`Step 3b` L294 → `Step 4: Run Tests` L354 → `Step 5: Verify Success Criteria` L379), so Step 4b lands cleanly. `qa-story`'s Review Workflow is **phase**-numbered (`Phase 0 … Phase 1.6: Diff Code Review … Phase 6`) and has no Step 4 and no test-suite step at all.
  - **Fix applied:** per-skill placement pinned — `qa-task` gets `### Step 4b` after Step 4; `qa-story` gets the same content as `#### Phase 1.7` after Phase 1.6.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

Five phases, each with risk level, files, checkboxed changes and explicit dependencies. Changes are specific (named files, named deny-list entries) rather than vague. Effort `estimated_effort_hours: 8` is within rubric tolerance for 12 success criteria and ~20 plan items at medium risk — no divergence finding.

### Issues

#### Important
- **⚠️ I4 — Phase 5's file location was an either/or**, and one arm (`evals/qa-task/`) does not exist. Standing it up would additionally need a `package.json` `eval:*` script and runner wiring — out of scope.
  - **Fix applied:** pinned to `shared/resources/tests/qa-execute-snippets.test.mjs`, with the reasoning inline.

#### Optional
- **💡 O1 — §7 item 6 (`package.json` — test glob) was redundant.** `npm test` already includes `'shared/resources/tests/*.test.mjs'`, which collects the new suite with no edit.
  - **Fix applied:** replaced with an "Explicitly NOT modified" note that states the real constraint — the file *must* live at `shared/resources/tests/*.test.mjs` or it runs nowhere, silently. (This is the repo's known "npm test globs orphan new suites" trap, inverted: here the glob saves you, provided you land in it.)

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Scope, Implementation Plan and Files Summary agree on what is being built.
- Testing Strategy covers extraction, classification (including fail-closed), disagreement reporting and timeout, plus the task-66 regression fixture and **two mutation proofs** — removing the zsh arm must make the disagreement finding disappear; removing the fail-closed default must let a novel mutating command through. Both prove the load-bearing parts, which is exactly what this repo's `mutation-proving.md` asks for.
- Success criteria are measurable and map to the stated benefits.
- Scope is well-bounded: 5 phases, one new script, two skill edits — not oversized, no split recommended.
- The self-referential safeguard ("a run where **zero** blocks executed is itself a finding") correctly anticipates the silent-skip failure mode this task exists to prevent.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (after fixes)

The High-risk area (executing something that mutates) is correctly identified with a fail-closed deny-list, temp-copy execution and a credential-free environment. Both Medium risks — false-positive noise and over-broad `placeholder` classification — are named with concrete mitigations. Rollback is realistic: revert two SKILL.md sections, leave the script unused.

### Issues

#### Important
- **⚠️ I3 — No guard on `zsh` being installed.** CI runs `ubuntu-latest`, where zsh is not guaranteed. Combined with the (correct) "zero blocks executed is a finding" rule, a host without zsh could turn a missing interpreter into a hard QA failure — a false negative dressed as a defect.
  - **Fix applied:** Phase 3 now requires a `command -v zsh` guard that runs the bash arm alone, records `zsh-unavailable` as information, and explicitly does not trip the zero-executed finding. A matching Safety criterion was added. The repo already has this exact precedent at `shared/resources/tracker-access.test.sh` §12.

#### Optional
- **💡 O3 — Prior art was uncited.** `tracker-access.test.sh` §12 already does guarded bash-vs-zsh parity, and `platform-detection.md` already documents the zsh-portability rules as read-only review guidance — which is precisely the enforcement gap Step 4b closes.
  - **Fix applied:** both added to References, along with the CI workflow this task must satisfy.

---

## Summary of Recommendations

### Must Fix (Critical) — 1
1. ✅ **Fixed** — Add the `npm run bundle` step and list the regenerated `skills/*/references/*` copies; otherwise `validate.yml`'s Bundle freshness check fails the PR.

### Should Fix (Important) — 3
1. ✅ **Fixed** — Move the detection rule to a QA-owned shared resource both QA skills actually reference.
2. ✅ **Fixed** — Pin per-skill placement: `qa-task` `Step 4b`; `qa-story` `Phase 1.7` (it is phase-numbered).
3. ✅ **Fixed** — Guard the zsh arm on `command -v zsh`; a zsh-less host must not trip the zero-executed finding.

### Consider (Optional) — 3
1. ✅ **Fixed** — Drop the redundant `package.json` edit; state the real constraint instead.
2. ✅ **Fixed** — Cite the dual-shell prior art and the CI gate in References.
3. ⏭ **No change** — `.mjs` vs `.js` convention is genuinely mixed in `shared/resources/`; `.mjs` is defensible and all sibling tests are `.test.mjs`.

**Fixes applied: 7 / Skipped (needs your input): 0**

---

## Implementation Readiness Assessment

**Score:** 8/10

| Dimension | Score | Note |
|---|---|---|
| Template Compliance | 10/10 | 11/11 sections, card preflight clean, Change Log current |
| Technical Accuracy | 7/10 | Two wrong-target findings (bundle, rule placement) — both corrected |
| Implementation Clarity | 8/10 | Specific throughout; the two ambiguous file targets are now pinned |
| Consistency | 9/10 | Sections agree; mutation proofs cover the load-bearing parts |
| Risk Management | 8/10 | Strong on the mutation risk; the environmental (zsh-absent) risk was missing and is now covered |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — score ≥ 8 and no critical issues outstanding (the one critical finding was corrected in this pass).

**Justification:** The task's reasoning and evidence were already sound; every finding was about where the plan lands in *this* repository, and all seven are now applied to the document. Nothing outstanding requires human input before `/develop` runs.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work Phases 1 → 5 in order; dependencies are explicit and linear.
2. Treat the deny-list's fail-closed default and the zsh guard as the two places a mutation proof must bite.
3. Run `npm run bundle` before opening the PR and commit the regenerated references.
4. Confirm `npm test` collects `shared/resources/tests/qa-execute-snippets.test.mjs` — no `package.json` edit is needed, but a file outside that glob runs nowhere.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, via `/develop-task` Step 2, dispatched by `/develop-next`)
- **Review Date:** 2026-08-31
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md`
- **Pre-pass agents:** architecture alignment → `drift` (7 findings); codebase scan → `not-started` (10 findings, incl. reusable prior art)
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Other evidence:** `.github/workflows/validate.yml`, `package.json`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `shared/resources/tracker-access.test.sh`
