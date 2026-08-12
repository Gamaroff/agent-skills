# Task Review Report: Task 40 — Wire `gh-stage.js` into the pipeline step files

**Reviewed:** 2026-08-12
**Review Depth:** Standard
**Task Status:** Planned (at review time)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-08-12

---

## Executive Summary

Task 40 is a well-structured, unusually thorough refactoring task: the phase ordering is deliberately sequenced by blast radius, the three behavioural changes are each justified, and the risk assessment names the real failure modes (bundle drift, Step 0's three tangled concerns). The substance of the plan is sound and needs no rework.

What it does **not** survive is the passage of time. The task was authored 2026-08-03 and cites exact line numbers throughout; task.39 landed `gh-stage.js` on 2026-08-12 and the surrounding files have moved. One citation — the `skills/finalise/SKILL.md` block — is wrong by roughly 90 lines and points at a **Jira** candidates list rather than the GitHub board block it means. A developer following the cited range literally would edit the wrong code.

**Critical Issues:** 2 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (see Auto-Answers below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the applied fixes)

---

## Auto-Answers (Autonomous Pipeline Run)

This review ran inside the `/develop-task` pipeline (Step 2/8), itself dispatched by `/develop-next` for roadmap item **T40**. No questions were put to the user; the pipeline's pre-decided answers were applied:

| Gate | Auto-answer | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Required for the pipeline audit trail |
| Step 0a — branch setup | Auto-skipped | Already on `feature/task.40.github-pipeline-step-wiring` (0a.3) |
| Step 8.5 — apply fixes | Yes, all critical + important | Pipeline needs the task corrected before Step 3 runs `/develop` |
| Step 9 — status update | Yes, fixes complete | Promote `planned` → `ready-for-development` |

Question Points 1–3 were resolved from evidence on disk rather than from the user, since every open question in this review is a verifiable fact (does this line say what the task claims it says?) rather than a matter of intent.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan), plus Progress Tracking, References, and Notes.

- **File naming**: ✅ `task.40.github-pipeline-step-wiring.md` — dots as structural separators, hyphens within the name.
- **OKF frontmatter**: ✅ `type: task` present and non-empty; `description` present; `tags` a proper YAML list; `updated` present.
- **Metadata**: ✅ `status: planned`, `priority: High`, `estimated_effort_hours: 16`, `github_issue: 188`.
- **Placeholders**: ✅ none found (`[TBD]`, `[TODO]`, `???`).
- **Tracker linkage**: ✅ `github_issue: 188` resolves — issue is OPEN, labels `task` + `priority:high`; body cross-reference link `[#188](…/issues/188)` matches frontmatter.
- **Stakeholder Sign-off**: not checked — `sign-off.enabled` is absent from `skills-config.yaml`, so the section is correctly not expected.

### Tracker Card Preflight

`sync-jira-task.js --check-card` exits 0 — all three card blocks resolve:

| Block | Result |
|---|---|
| Summary | ✅ 303 chars, 2 sentences omitted → `+N more` link |
| Success Criteria | ✅ 324 chars, 8 criteria omitted → `+N more` link |
| Breaking Changes | ✅ 68 chars, 9 omitted → `+N more` link |

Informational, not a defect: a board reader sees 5 of 13 success criteria and 1 of 10 breaking-change lines. The `+N more` links carry the rest.

**Effort estimate**: `estimated_effort_hours: 16` against 5 phases, 13 success criteria and two High-risk phases is consistent with the rubric. No divergence flag.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — every cited file, flag and CLI reason exists. The defects are **staleness**, not invention.

### Verified correct

The `gh-stage.js` CLI surface the task assumes was checked against `shared/resources/gh-stage.js` as shipped:

| Assumed | Verified |
|---|---|
| `--stage`, `--json`, `--dry-run` | ✅ present |
| `--add-to-board`, `--allow-regress`, `--strict` | ✅ present |
| `--probe-board`, `--write-ladder`, `--board`, `--field` | ✅ present |
| reasons `not-on-board`, `would-regress`, `already`, `stage-disabled` | ✅ all emitted |
| stage names `work-started`, `in-review`, `in-qa`, `ready-for-merge`, `done`, `blocked` | ✅ all known to `tracker-workflow.js` |
| Exit codes: every documented skip exits 0 | ✅ confirmed in the header contract |

Also verified: `evals/shared/tests/transition-protocol-parity.test.mjs` exists and already scans `--stage` literals (`test("every --stage literal in shipped markdown names a real stage")`), so Phase 5's "extend the `--stage` literal scan" has a real host. `shared/resources/set-github-project-priority.sh` exists, so the Phase 3 delegation option is real. `gh-stage.js` contains **zero** occurrences of `Priority`, confirming the task's clarification that the Priority mutation is a separate concern.

### Critical

- **[C1] `skills/finalise/SKILL.md` line citations are wrong by ~90 lines, and point at the wrong tracker.**
  - **Task claims:** block at `1023-1093`, case-sensitive `name == "Done"` at `:1061`.
  - **Actually on disk:** the GitHub board block runs `1114-1190`; the case-sensitive `name == "Done"` is at **`:1152`**. Line `1026` is `candidates = ["Done", "Closed", "Resolved", …]` — a **Jira** transition-protocol fallback list, not the GitHub block.
  - **Impact:** a developer opening the cited range edits Jira prose while believing they are fixing the GitHub case-sensitivity bug. Both the "five sites" table (§3) and the References section carry the bad numbers.
  - **Fix applied:** corrected to `1114-1190` and `:1152` in both places.

- **[C2] The Target Architecture path does not resolve for `skills/finalise/SKILL.md`.**
  - **Task specifies:** `node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js` — the brace list omits `finalise`.
  - **Why it matters:** Phase 4 requires `skills/finalise/SKILL.md` to invoke the CLI, but `finalise` is a standalone skill with its own `references/` bundle. Verified: `skills/finalise/references/` contains `jira-stage.js` **only transitively** — `jira-transition-protocol.md` and `tracker-workflow.js` reference it; `finalise/SKILL.md` itself never names `jira-stage.js`. So `gh-stage.js` lands in `skills/finalise/references/` **only if** finalise's own text references `shared/resources/gh-stage.js`. Writing the brace path verbatim into `finalise/SKILL.md` ships a path that does not exist in a standalone finalise install.
  - **Fix applied:** Phase 4 now states that `finalise/SKILL.md` must use `.agents/skills/finalise/references/gh-stage.js`, and that the bundler picks the file up because the skill now references it directly.

### Important

- **[I1] Step 0 block bounds are stale.** Task says `364-504`; the `### GitHub path (when TRACKER=github):` section actually begins at **`362`** and runs to **`513`** (next heading `## 0c-load` at `515`). The post-condition block to delete is cited `493-500`; it is actually **`492-503`**. The false-pass line itself — `[ "$BOARD_STATUS" = "Todo" ]` — **is** at `:497` as claimed. ✅ Fixed.

- **[I2] Step 4 block bounds are slightly off.** Task says `178-238`. The site actually spans **`174-239`**: the `> **MUST execute** …` note at `174` opens it and the `Log in Decisions Log:` line at `239` closes it. Both precise citations inside it are correct — dead `BOARD_NUM` at **`:182`** ✅ and the hand-edit instruction at **`:237`** ✅. Fixed to `174-239`.

- **[I3] Step 5-6 block bounds are off by four lines.** Task says `43-106`; the `### Re-assert board status at QA start …` heading is at **`39`**, and the block ends at `105` with the closing `) || echo …`, with `106` blank. Corrected to `39-106`. The hand-rolled short-circuit the task wants dropped is confirmed at `:76-77` (`CURRENT_STATUS` … `= "in review"`).

- **[I4] Phase 3 implies JavaScript work that task.39 already delivered.** Phase 3 says "Move `item-add` + `sleep 3` + retry-after-5s into `gh-stage.js`'s `ensureOnBoard` (task.39)", which reads as work to do here — but §4 Scope lists only markdown files, and `ensureOnBoard` already exists at `shared/resources/gh-stage.js:498` with exactly that dance ported verbatim (`sleepMs(3000)` at `:525`, `sleepMs(5000)` at `:528`). Phase 3 is markdown-only. ✅ Fixed to say so.

### Verified correct (no change needed)

- `shared/resources/develop-pipeline-lite-mode.md:32` — ✅ **correct as cited**. Line 32 is item 5, naming `updateProjectV2ItemFieldValue`.
- `shared/resources/develop-pipeline-step-7-finalise.md:165` — ✅ **correct as cited**. Line 165 is the prose "Then move the project board item to Done using the same GraphQL pattern … but with `ascii_downcase == "done"`".
- `/finalise`'s `not-on-board` escalation exists at `skills/finalise/SKILL.md:1154` ("**If no project items are found (issue not on any board):**") — the thing Phase 4 must preserve is real and locatable.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Every phase carries a purpose, an explicit risk level, a named file list, checkboxed concrete changes, and a stated dependency. The blast-radius ordering (Step 4 → Step 5-6 → Step 0 → Step 7 → guards) is justified in prose *and* in the Notes section, with the masking rationale spelled out — Steps 4 and 5-6 perform the same move, so a failure in either is hidden by the other, which is precisely why they go first. That is unusually careful sequencing.

### Important

- **[I5] The bundle blast radius is larger than the phase file lists suggest.** The phases name only `shared/resources/*`, but each edited step file is bundled into several skills. Verified counts of `develop-pipeline-step-*` files per skill: `develop-story` 8, `develop-task` 8, `develop-bug` 6, `qa-story` 3, `qa-task` 3, `finalise` 0. Notably **`develop-bug` bundles step-4 and step-7** (so it inherits two of the five rewrites) but has its own `develop-bug-step-5-6-verify-loop.md` — which corroborates the task's own Known Issue that develop-bug never signals `in-qa`. ✅ A note recording the real bundle fan-out was added to §7.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Scope and the phase list agree on the same five sites.
- §7 Files Summary matches the files named across Phases 1–5.
- Testing Strategy covers all five sites (unit grep guard + positive assertions, protocol evals, contract tests for the no-`tracker-workflow.yaml` default, plus a real consumer run).
- Success Criteria are measurable and map back to the stated benefits.
- The guard design explicitly requires pairing absence-assertions with positive assertions, citing the v0.33 precedent where an absence-only guard passed vacuously — good institutional memory, and it directly addresses the highest-value failure mode for a deletion-heavy task.

**Test harness check**: the Phase 5 guard belongs in `evals/shared/tests/transition-protocol-parity.test.mjs`, which is already matched by the `evals/shared/tests/*.test.mjs` glob in `package.json`. No new glob entry is needed. (If the guard were instead placed in a *new* directory, it would run nowhere — this repo lists per-skill test globs by hand.)

**Scope/complexity**: 5 phases, 16h estimate, one coherent concern. No split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Both High-risk areas are the right ones. "Step 0 carries three concerns, and untangling them breaks one" is the genuine hazard, and its mitigation — go third, keep Priority inline if delegation proves invasive, port the item-add dance verbatim — is actionable and now partly moot since task.39 already ported it. "Bundle drift ships a broken install" is a repeat offender in this repo and the proposed CI addition (`npm run bundle && git diff --exit-code -- 'skills/*/references/*'`) is the correct structural fix rather than a reminder.

Rollback is credible: each site is a self-contained fenced block, so per-phase `git revert` genuinely works, and the triggers distinguish critical (wrong column, killed step, missing bundled file) from non-critical (log wording).

### Optional

- **[O1] No rollback note for the behavioural change itself.** If `would-regress` proves disruptive to a team mid-sprint, the remedy is `--allow-regress` at the call site rather than a revert. The Rollback Plan covers code reverts but never mentions this softer lever. Left as-is — the Migration path line under Breaking Change 1 already names `--allow-regress`, so this is redundancy rather than a gap.

---

## Summary of Recommendations

### Must Fix (Critical) — 2

1. **[C1]** Correct the `skills/finalise/SKILL.md` citations: `1023-1093` → `1114-1190`, `:1061` → `:1152`. ✅ Applied
2. **[C2]** Specify `.agents/skills/finalise/references/gh-stage.js` for the finalise call site; the `{develop-story|develop-task|develop-bug}` brace does not cover it. ✅ Applied

### Should Fix (Important) — 4

3. **[I1]** Step 0 bounds `364-504` → `362-513`; post-condition `493-500` → `492-503`. ✅ Applied
4. **[I2]** Step 4 bounds `178-238` → `174-239`. ✅ Applied
5. **[I3]** Step 5-6 bounds `43-106` → `39-106`. ✅ Applied
6. **[I4]** Phase 3: state that `ensureOnBoard` already exists (task.39, `gh-stage.js:498`) and Phase 3 is markdown-only. ✅ Applied
7. **[I5]** Record the real bundle fan-out in §7. ✅ Applied

### Consider (Optional) — 1

8. **[O1]** Rollback lever for the regress guard — no change made; already covered by the Migration path line.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 6/10 → 9/10 after fixes
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The plan's substance — phase ordering, behavioural-change analysis, risk identification, and the paired-guard test design — is sound and needs no rework. Every defect found was a stale line-number citation or an under-specified path, all of which have been corrected against the files as they actually exist today. Zero hallucinations: every file, flag, CLI reason and stage name the task assumes was verified present on disk.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the phases in the stated order — 4 → 5-6 → 0 → 7 → guards. The ordering is load-bearing, not cosmetic.
2. Edit **only** `shared/resources/`; run `npm run bundle` in the same commit.
3. Re-verify each line citation before editing — this review corrected them against today's files, but Phase 1's own edits shift the line numbers for Phases 2–5.
4. Run `npm test` after each phase; the grep guard must fail before the last site is converted and pass after.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous pipeline mode)
- **Review Date:** 2026-08-12
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.40.github-pipeline-step-wiring/task.40.github-pipeline-step-wiring.md`
- **Pipeline Context:** `/develop-next` → `/develop-task` Step 2/8 (roadmap item T40)
- **Sources Consulted:** `shared/resources/gh-stage.js`, `shared/resources/tracker-workflow.js`, all five cited call sites, `evals/shared/tests/transition-protocol-parity.test.mjs`, `package.json` test globs, `skills-config.yaml`, `skills/*/references/` bundle contents
