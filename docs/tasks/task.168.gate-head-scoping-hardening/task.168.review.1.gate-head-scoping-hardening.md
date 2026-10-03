# Task Review Report: Task 168 - Harden task.135's gate-head scoping

**Reviewed:** 2026-10-03
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-03

---

## Executive Summary

The task is accurate and specific: every cited mechanism exists where it says, the two-call `qa-cycle.sh` distinction it relies on is real, and the `field()` discrepancy it describes reproduces. One Important gap: the new dirty-tree HALT would fire on every cycle-3+ re-review in a consumer repository that does not ignore `.claude/state/`, because the develop pipeline itself writes untracked files there. Four line anchors drifted and two decisions were left open; all are fixed in the task document.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 3 questions — auto-answered with the recommended option (autonomous pipeline run via `/develop-next`)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-task` Step 2, dispatched by `/develop-next` (autonomous). Each question below was answered with its recommended option and is recorded here as the review's own decision.

### Question Point 1: Structure & Scope

No questions — template compliance clean (all 11 sections, OKF frontmatter, Change Log present and current for `planned`, card preflight clean, issue #533 open and linked in the body).

### Question Point 2: Technical & Implementation

**Q1: The dirty-tree HALT reads `git status --porcelain` outside `$WORK_ITEM_DIR`. In a consumer repo, `.claude/state/` (the pipeline lock, comment bodies, test logs) is untracked and not ignored — `setup-consumer.sh` adds only `.secrets/` and `.env` to `.gitignore`. How should the check treat it?**
- **Decision**: Exclude `.claude/state` from the check as well, and add a fixture with an untracked `.claude/state/` file that must not HALT. *(Recommended — the alternative, tracked-only, would miss a fix committed as a brand-new untracked file.)*
- **Impact**: Phase 3 and the Target Architecture gain the second exclusion; a fourth fixture is added.

**Q2: `qa-task` Phase 0 step 3 carries a third `qa-cycle.sh --path gate` rebind (`skills/qa-task/SKILL.md:199`), not named in the task. Convert it too?**
- **Decision**: Leave it, and say so. *(Recommended.)* It already keeps stderr, and a refusal there leaves `GATE_HEAD` empty, which sets `CODE_MOVED=1` — the failure already points toward re-review, which is the direction this task wants everywhere.
- **Impact**: Stated as an exclusion in § 3 Important Clarifications.

**Q3: Bundling closure for `qa-safety-clause1.sh` — accept the eight copies, or restrict it to the two QA skills?**
- **Decision**: Accept the copies. *(Recommended.)* `qa-cycle.sh`, which the same shared rule names, is already bundled into seven skills; restricting the new script would need a placeholder path that `extractProbe()` cannot execute.
- **Impact**: The plan's open "decide deliberately" becomes a recorded decision; `npm run bundle` closure deltas are checked, not chosen.

### Question Point 3: Completeness & Safety

No further questions.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; no placeholders.
- OKF: `type: task`, `description`, `tags` present.
- Change Log present; newest row consistent with `status: planned` (check 4b, advisory).
- Sign-off not enabled in `skills-config.yaml` — not checked.
- Tracker: `github_issue: 533` → issue OPEN; body link `[#533](…/issues/533)` matches; board Priority self-healed to P2.
- Card preflight: 3 blocks resolve (`Breaking Changes` has `+1 more`).
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE (anchors drifted)
**Hallucinations Detected:** 0

Pre-pass B (`prepass-axes.js` source: `architecture`): `drift`, axes checked — What this repo produces, SKILL.md authoring, File naming, Cross-skill resources, Validation before commit, Do not. Its one medium finding (new `.sh` without a ShellCheck step) is recorded below as O4: `scripts/lint-shell.sh` lints every tracked `*.sh`, so the new script is covered once tracked, but the Testing Strategy should name the lane. Its low findings (zsh testing, `.test.mjs` naming, the script's exit contract) are existing repository practice — `qa-scope-from-head.test.mjs` already runs fences under `zsh -f` and lives in `shared/resources/tests/` — and are not findings.

Pre-pass C: `not-implemented` — no part of the deliverable exists yet.

**Verified:**
- Trigger at `skills/qa-task/SKILL.md:213` counts `rev-list "$GATE_HEAD"..HEAD` with no format, existence or ancestry check — as stated.
- `qa-cycle.sh` (`shared/resources/qa-cycle.sh`): `<dir>` alone exits 0 with the highest cycle even when two files claim it; only `--path gate` refuses (rc 1, "N gate files claim cycle K"). The two-call distinction the plan relies on is real, so "two files, one cycle → step 5 HALTs" is reachable (check 10).
- `field()` invariant (check 11), executed: `head: 'abc'  ` → current `field()` gives `abc'`; the shell sed gives `abc`; the planned order (trim → unquote → trim) gives `abc`. With a trailing `# c` both already agree.
- Clause-1 block: `qa-re-review-scope.md:107` (`SAFETY_REPROBE=false`), `qa-task/SKILL.md:302` — as cited. `extractProbe()` at `qa-re-review-scope-parity.test.mjs:341`; transit-constraint tests at `:396`, `:411`, `:1106`.
- Same-class inventory (check 6): stated in § 3 — extends `|| echo 1`, sits beside `cat-file`/`merge-base`, replaces the three probe copies.

**Optional — drifted anchors (O1):** the claims are true; the coordinates moved.
- `qa-task/SKILL.md:498` → `:501` (the scoped `git diff`)
- `qa-story/SKILL.md:968` → `:975` (the scoped `git diff`)
- `qa-story/SKILL.md:506` → `:510` (clause-1 `SAFETY_REPROBE=false`)
- `qa-story/SKILL.md:495` → `:499` (step 5 rebind)

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases, each with files, concrete changes and tests; the plan file carries code for every change. One open decision (bundling closure) — resolved by Q3. Effort: frontmatter 4h vs rubric ~8h (author already noted it in § Notes) — Optional, no change.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (1 Important)

### Important

- **I1 — The dirty-tree HALT fires on the pipeline's own state files in a consumer repo.** `git status --porcelain -- . ":(exclude)$WORK_ITEM_DIR"` lists untracked files. The develop pipeline writes `.claude/state/develop-pipeline.lock`, `comment-body.md` and test logs before every QA cycle; this repository ignores `.claude/`, but `scripts/setup-consumer.sh` adds only `.secrets/` and `.env` to a consumer's `.gitignore`. In such a repo every cycle-3+ re-review would HALT on a healthy branch — the exact rollback trigger § 11 names. **Fix**: exclude `.claude/state` too, and add the fixture (Q1).

### Success criteria classification (check 4)

All six functional criteria are behaviour criteria, and each has a planned per-PR test in its phase. Performance is an explicit "Not applicable". Code Quality and Migration are documentation/evidence criteria. None depends on a post-merge event.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The medium risk (moving the awk probe) is mitigated by a byte-for-byte move with the transit-constraint and replay tests moved in the same phase. Rollback is per phase, with a named partial rollback for the dirty-tree HALT.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 1

1. Exclude `.claude/state` from the dirty-tree HALT; add an untracked-state fixture that must not HALT (Q1).

### Consider (Optional) - 5

1. **O1** Correct the four drifted line anchors.
2. **O2** State the `qa-task` step 3 rebind (`:199`) as a deliberate exclusion (Q2).
3. **O3** Record the bundling-closure decision: accept the copies (Q3).
4. **O4** Name `npm run lint:shell` (ShellCheck) in the Testing Strategy for the new script.
5. **O5** Effort 4h vs rubric ~8h — already acknowledged by the author; no change.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the one Important gap has a one-line fix that is applied to the task document in this review.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous — develop-task Step 2)
- **Review Date:** 2026-10-03
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.168.gate-head-scoping-hardening/task.168.gate-head-scoping-hardening.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (via pre-pass B)
- **Pre-pass:** B `drift` (low/medium only, none blocking), C `not-implemented`
