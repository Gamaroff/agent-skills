# Task Review Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Reviewed:** 2026-10-03
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-10-03

---

## Executive Summary

The task is accurate about the mechanism it fixes: the backward `advance-pipeline-lock.sh 5` on a
step-7 lock was executed and is a silent no-op (rc 0, lock unchanged), the resume contract has only
the two restore bullets it describes, and the Stop hook already names `/qa-task` for a step-5 /
`qa_phase: 5a` lock. Four gaps were found, all in the specification of the new writer: its
code-movement measure is narrower than the `qa-task` measure it claims to reuse, its QA budget is
stated two different ways, two Phase 3 guards have no success criterion, and the
refuse-before-restore ordering is implied rather than stated.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked (pipeline autonomous mode — develop-next; decisions below were taken on the recommended/safe default and are recorded as such)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-next` → `/develop-task` Step 2 (AUTONOMOUS RUN). No `AskUserQuestion` was issued;
each would-be question was resolved on the default below and is open to the owner's override.

- **Output format** — Comprehensive report (pipeline auto-answer).
- **Re-entry budget (I2)** — `qa_max_cycles = base + 2`, `base` reconstructed as `grant-qa-cycles.sh`
  does; an existing higher budget is kept, never lowered. `2` is the grant prompt's own recommended
  `k`, so the two re-entries grant the same default.
- **Code-movement measure (I1)** — the full `qa-task` Phase 0 measure, not the rev-list half: it fails
  toward re-review, which is the direction the task's own Risk section names as safe.
- **Step 8.5** — apply all critical + important fixes (pipeline auto-answer).

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References present; no placeholders.
- OKF: `type: task`, `description`, `tags` present.
- Tracker: `github_issue: 536` exists (OPEN); body link `[#536](…/issues/536)` matches. Board
  Priority self-healed to P2.
- Card preflight: 3 card blocks resolve, no findings (`Breaking Changes` +1 omitted).
- Change Log present (enforcement default `advisory`); sign-off not configured — not checked.
- Relative links: 1, resolves (`doc-links.js`).

## 2. Technical Accuracy

**Status:** ACCURATE (one divergence, I1)
**Hallucinations Detected:** 0

Pre-pass B: `alignment: aligned`, `axes_checked`: What this repo produces, Cross-skill resources, File
naming, Status lifecycle, Plan files, Validation before commit, Do not (`prepass-axes.js` source:
`architecture`). Pre-pass C: `not-implemented` — the script, its suite and `qa_reentry` do not exist.

Verified:

- `shared/resources/advance-pipeline-lock.sh:456-457` — `# Idempotent: already at or past the target step` / `if [ "$NEXT" -le "$CURRENT" ]`. **Executed** (check 11): a `{"current_step":7}` lock advanced to 5 → `rc=0`, lock unchanged.
- `--restore` sets `current_step = halt_step // current_step` (line 305) and strips the halt fields. Confirmed.
- `develop-pipeline-resume-contract.md` § "Restore the lock (both resume paths)" carries the `<!-- who-restores: statement -->` marker and exactly two bullets. Confirmed; `who-restores-single-statement.test.mjs` keys rule text on a restore verb + `loop-limit|not-converging` / `no re-entry grant` on one line, so a new bullet inside the marked section is safe provided no *other* site restates it.
- DoD gaps line: `**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED` (`skills/finalise/SKILL.md:2256`) — the plan's `^\*\*Final Status:\*\* ❌ GAPS` matches.
- `qa-cycle.sh <dir> --path gate`, `newest-numbered.sh` (`newest_numbered <dir> dod -name …`) exist as the plan uses them.
- Check 10 (outcome reachability): `develop-pipeline-on-stop.sh:205` — a step-5 lock whose `qa_phase` is `5a` (or absent) names `/qa-task`. The Stop-hook criterion is reachable with no hook change.
- Check 12 (released shape): no legacy-shape handling is defined — the lock only gains an optional field; not applicable.
- Check 14: no engine call sites enumerated — not applicable.

#### Important

- **I1 — `CODE_MOVED` is narrower than the measure it claims to be.** The task says "the same
  `CODE_MOVED` measure `qa-task` Phase 0 uses"; the plan computes only
  `git rev-list --count "$HEAD_OF_GATE"..HEAD -- . ":(exclude)$DOC_DIR"`. `skills/qa-task/SKILL.md:229-262`
  also counts uncommitted (`git diff --quiet HEAD`) and untracked (`git ls-files --others`) changes
  outside the directory, and treats a `head:` that is absent, not 40-hex, not a commit, or not an
  ancestor of `HEAD` as moved. An operator's fix that is not yet committed when they resume would be
  refused as `no-code-moved` and finalise would re-run over it — the defect this task exists to close.
  **Fix:** specify the full measure in Target Architecture and the plan.

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Important

- **I2 — QA budget stated two ways.** Target Architecture: "reconstructed from disk exactly as the
  grant does"; plan: `.qa_max_cycles = ($cycles + 5)`. The grant adds an operator-chosen `k`; this
  writer has no `k`. **Fix (autonomous default):** `qa_max_cycles = max(existing, base + 2)`, `base`
  = max(highest gate via `qa-cycle.sh`, `### QA Cycle` entries in the report) — the grant's
  reconstruction and its recommended `k`.
- **I4 — refuse-before-restore is implied, not stated.** `--restore` consumes the snapshot, so every
  refusal — including "snapshot for another document" — must run before it. The plan says "reuse
  advance-pipeline-lock.sh's canonicalised directory check" without naming how. **Fix:** check the
  candidate with `advance-pipeline-lock.sh --restore --which <doc-dir>` (the same selection the
  restore uses, as `grant-qa-cycles.sh` does) before any write, and state what happens when the
  lowering write fails after a restore: the restored step-7 lock is kept (it is the only copy left),
  exactly as the grant's `undo_restore` does.

#### Optional

- **O1 — "test glob".** `package.json` has no glob for shell suites: `test` is an explicit `&&` chain
  (`… && bash shared/resources/grant-qa-cycles.test.sh && …`). Say "append to the `test` chain".
- **O3 — bundling reach.** The script must land in both `develop-task/references/` and
  `develop-story/references/`. Inside `shared/resources/` a sibling is cited by bare filename; confirm
  the bundler reaches it (as it does `grant-qa-cycles.sh`) and that the script declares its own
  dependencies on `advance-pipeline-lock.sh`, `qa-cycle.sh` and `newest-numbered.sh` with
  `bundle-dependency:` lines.
- **O4 — `halt_step` is a string.** The HALT snippet writes it with `jq --arg`, so it is `"7"`; compare
  with `tonumber?` or as a string, never as a JSON number only.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important

- **I3 — two Phase 3 guards have no success criterion.** The parity test (contract ↔ script refusal
  reasons) and the Stop-hook test are Phase 3 deliverables but no criterion names them, so finalise
  has nothing to hold them to. **Fix:** add a criterion for each, naming its test.

#### Optional

- **O2 — half of one criterion is existing behaviour.** "…a document-only change is refused, and
  finalise re-runs at 7" — the second half is the unchanged `--restore` bullet. Say so, so the AC
  agent does not look for a new test.

Criterion classification (finalise Step 3 kinds): every functional and performance criterion names
its test; Code Quality and Migration criteria are command/documentation kinds. None is post-merge only.
Scope: 3 phases, ~8h — no split needed.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The one medium risk (a second writer lowering `current_step`) has a mitigation, a recorded field and
a parity guard; rollback is a revert with no data migration. I4's ordering rule strengthens the
mitigation.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 4 issues

1. I1 — full `qa-task` code-movement measure.
2. I2 — `qa_max_cycles = max(existing, base + 2)`.
3. I3 — success criteria for the parity and Stop-hook tests.
4. I4 — refusals via `--restore --which` before any write; a failed lowering keeps the restored lock.

### Consider (Optional) - 4 items

1. O1 — "test chain", not "test glob".
2. O2 — mark the "finalise re-runs at 7" half as existing behaviour.
3. O3 — `bundle-dependency:` lines; verify both bundles.
4. O4 — `halt_step` string comparison.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical findings; the four important ones are specification gaps in a single
new script, all fixed in the document by this review.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2, develop-next autonomous run)
- **Review Date:** 2026-10-03
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.170.qa-reentry-after-finalise-gaps/task.170.qa-reentry-after-finalise-gaps.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md (via pre-pass B)
