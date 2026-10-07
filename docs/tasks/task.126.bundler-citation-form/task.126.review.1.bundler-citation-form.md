# Task Review Report: Task 126 - Bundler citation form, per-skill closure count, pre-commit refusal

**Reviewed:** 2026-09-29
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development (after fixes)
**Overall Assessment:** NEEDS IMPROVEMENT as written → GOOD after fixes

> **Implementation Status**: ✅ All 9 critical + important recommendations implemented — 2026-09-29

---

## Executive Summary

The task's goal holds, and it is still open on `develop` `f7ca1985`. The bundler has no edge kinds;
`.githooks/pre-commit` only warns about untracked copies; the three pointer sites still bundle 37,
45 and 46 files. But the mechanism was written against the bundler as it stood on 2026-09-17.
Measured against the code as it is now, it would not work: the citation form would not be detected
in the spelling skill files actually carry, `validate:all` would fail on it, the dropped copies
would turn CI red as `UNREACHED`, and the hook refusal would use a pathspec that matches nothing.
Every finding was fixable from evidence gathered in the review, and all were applied.

**Critical Issues:** 4 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked. This was an autonomous run dispatched by `/develop-task`
from `/develop-next`; every decision below was taken from measured evidence, not from preference.
**Implementation Readiness:** 4/10 as written → 8/10 after fixes
**Recommendation:** REQUIRES REWORK as written → ✅ **READY TO IMPLEMENT** after fixes

---

## User Decisions & Clarifications

None asked. The develop-task pipeline auto-answers review-task's gates:
- output format: Comprehensive report;
- Step 8.5: apply all critical + important fixes;
- Step 9: promote if ready.

No finding needed a choice between valid options. Each has one fix that the code dictates.

---

## Pre-pass

Agents B and C ran **in-line**, not as Explore subagents: the scope is one Python module, one
hook and three prose sites, all read in full during the review. That was a loss of independence,
recorded here.

- **B — architecture alignment: `aligned`.** Axes checked: the tech stack (Python 3 bundler, bash
  git hook, `node --test` suites), the one-source rule for `shared/resources/` (AGENTS.md § Shared
  Resources) and the test-wiring rule (`npm test` globs). No drift.
- **C — already implemented: `none`.**
  - `bundle_skill.py` has no cite/dep kind (`grep -n 'cite\|kind'` finds only unrelated "cited at"
    messages);
  - `.githooks/pre-commit` refuses only on unstaged `shared/resources/` source, not on untracked
    copies;
  - observations #83 and #114 are `parked` until this task merges.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References are present. `type: task`
  and `description` are in the frontmatter, and `github_issue: 426` resolves (OPEN) with a matching
  body link.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve; Success Criteria has 1
  omitted → `+N more`.
- `doc-links.js`: 1 relative link resolves (task and plan).
- Change Log is current once this review's row lands. `change-log.enforcement` is the default
  `advisory`; sign-off is not enabled.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — 4 Critical, 3 Important

#### Critical

- **C1 — The citation form is detected in a spelling skill files never carry.**
  - **Location:** §3 Target Architecture; Phase 1; Plan Phase 1.
  - **Evidence:** the bundler rewrites `shared/resources/X` to `references/X` in place in every
    skill file. So the three pointer sites read `references/develop-pipeline-autonomous-defaults.md`
    and are seeded through `REFS_REF_RE` (`bundle_skill.py:58`) into `pending_quiet`, not through
    `SHARED_REF_RE`. The same rewrite turns `<!-- cite: shared/resources/X -->` into
    `<!-- cite: references/X -->` in skill files and bundled copies.
  - **Impact:** a cite detected only on `shared/resources/X#…` makes Phase 3's conversion a no-op.
  - **Fix applied:** cite detection on both spellings, in the seed as well as the walk; comment form
    accepts both prefixes.
- **C2 — `validate:all` fails on the citation form, and the task does not touch the file that fails
  it.**
  - **Evidence:** `quick_validate.collect_shared_refs` (`quick_validate.py:42`) and
    `SHARED_REF_LINE_RE` (`bundle_skill.py:149`) use the name class `[^\s`'")\]*]+`, which admits
    `#`. So `shared/resources/X.md#a` names the file `X.md#a`. `validate_skill` (l.161) then returns
    `referenced but file does not exist`, and the bundler warns "missing source".
  - **Fix applied:** one parser (name + kind, fragment stripped) in `quick_validate.py`, which both
    `bundle_skill.py` and `package_skill.py` already import from. `quick_validate.py` is added to
    Files Summary. The §1d parity test in `bundle-missing-source.test.js` is kept green.
- **C3 — "Removed by the bundle run" is false; CI would go red.**
  - **Location:** §7 Files to Delete.
  - **Evidence:** the bundler never deletes a copy; its only `unlink` is for symlinks
    (`bundle_skill.py:802`). task.122 keeps and refreshes every source-backed copy on disk, and
    `--check` reports each unreached one as `UNREACHED` (l.1074), which fails `bundle:check`.
  - **Fix applied:** `git rm` of exactly the set `--check` reports `UNREACHED`, cross-checked against
    the measured sets; "no `UNREACHED`" added as a success criterion.
- **C4 — The planned hook refusal is inert.**
  - **Location:** Plan Phase 2 snippet.
  - **Evidence:** it lists `git ls-files --others -- 'skills/*/references/'`. The hook's own comment
    (`.githooks/pre-commit`, above `REFS_PATHSPEC`) records that this pathspec matches nothing
    without a trailing `*`. The snippet also ignored the hook's existing `PRE`/`POST` sets: the copies
    a run creates are already staged (`NEW`), and the untracked case left over is the pre-existing
    `LEFT` set.
  - **Fix applied:** refuse on untracked ∩ `LEFT`, using `REFS_PATHSPEC='skills/*/references/*'`.

#### Important

- **I1 — Plan anchors and data shapes are stale.**
  - `SHARED_REF_RE` is at l.35, not l.11.
  - `collect_shared_refs` lives in `quick_validate.py`, not `bundle_skill.py`.
  - `discover_needed` has two queues (`pending` of `(name, origin)` and `pending_quiet`), not one
    list.
  - **Fix applied:** plan rewritten with anchors re-verified against `f7ca1985`.
- **I2 — Success criterion "pointer sites bundle ≤ 3 files each" was unreachable as written.**
  - **Evidence:** measured 2026-09-29, the three skills bundle 21, 27 and 29 files with the hub as a
    leaf.
  - **Fix applied:** the criterion now reads "contributes exactly one file (the hub)", with the
    closure definition and baseline (37→21, 45→27, 46→29) recorded in §3.
- **I3 — The hook test named a pattern that runs nowhere.** No `tests/*.test.sh` exists. Shell tests
  are hand-listed in `package.json`'s `test` script, so a new one is silently unrun.
  - **Fix applied:** a node test, `tests/pre-commit-hook.test.js`, which the `tests/*.test.js` glob
    picks up.
- **I4 — The Medium risk argued from a premise that measures false.**
  - **Evidence:** "an existing fragment link was load-bearing as a dependency" does not hold. No
    bundled source carries a `shared/resources/X#…` reference (all 10 hits are in `docs/tasks/` and
    test fixtures), no skill file carries `references/X.md#…`, and today such a reference is read as
    a missing file.
  - **Fix applied:** the real risk is a cite dropping a file a skill reads at runtime. It is now
    stated with its mitigation, and non-`.md` cites are defined as dependencies so a script is never
    copied without its siblings.
- **I5 — The pointer anchor `#subagents` names no heading.** The hub's heading is
  `## Subagents — unavailable, failed, slow`, slug `subagents--unavailable-failed-slow`.
  - **Fix applied:** the real slug is in the Phase 3 conversion.

#### Optional

- **O1 — Reporting cost.**
  - **Issue:** the plan computed `+K vs committed` with a `git ls-files` per skill. That is about 125
    subprocesses on `--all`, against a "no measurable change to bundle time" criterion.
  - **Fix applied:** one call per run, passed down. It is also a status-line *suffix*, so the
    existing `in sync` / `N bundled, M reconciled` wording is kept.

**Outcome reachability (check 10):** the success criterion "a fragment reference bundles exactly one
file" is not reachable from today's `discover_needed`, which has no kind. Phase 1 names the branch
that makes it reachable: a `cite` is added to `needed` and not read. That passes.

**Invariant check (check 11):** the claim that no dropped file is one the skill reads was run, not
reasoned. The closure was simulated with the hub's text not followed, then each dropped name was
grepped in each skill outside `references/`. None matched. `qa-cycle.sh`,
`stakeholder-summary-cli.js` (qa-fix) and `advance-pipeline-lock.sh` (review-story) are named by the
skills, but they are seeded directly and were not in the dropped sets.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes. Three phases, each with files, concrete changes and dependencies.
Effort: frontmatter `estimated_effort_hours: 8` is within 2× of the rubric (3 phases, 7 criteria,
medium risk). No finding.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes. The Files Summary now matches the phases, with `quick_validate.py`,
`.githooks/pre-commit` and both new tests added. The Testing Strategy covers each phase, including
`validate:all` and `UNREACHED`. The scope is right for one task: three tightly coupled phases, about
8h.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE after fixes. The rollback is `git revert` + `npm run bundle`. A revert of
Phase 3 re-adds the `git rm`'d copies, and the bundle run refreshes them because they are reached
again.

---

## Summary of Recommendations

### Must Fix (Critical) — 4, all applied
1. Detect cite on the `references/` spelling and in the `REFS_REF_RE` seed; comment form with both prefixes.
2. One parser with the fragment stripped, in `quick_validate.py`; add it to Files Summary.
3. `git rm` the copies the conversion stops reaching; add "no `UNREACHED`" as a criterion.
4. Hook refusal on untracked ∩ `LEFT`, with the working pathspec.

### Should Fix (Important) — 5, all applied
1. Re-anchor the plan to current code.
2. Replace the unreachable "≤ 3 files" criterion with the measured one.
3. Hook test in node, not an unwired `.test.sh`.
4. Restate the Medium risk from measured evidence; make non-`.md` cites dependencies.
5. Use the real heading slug.

### Consider (Optional) — 1, applied
1. One `git ls-files` per run; append to the existing status line.

---

## Implementation Readiness Assessment

**Score:** 8/10 after fixes (4/10 as written)

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (4/10 as written)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium–High. The mechanism is now specified
against the code that exists. The remaining uncertainty is the dedupe of a bare path inside a cite
comment, which the plan names.

**Recommendation:** ✅ **READY TO IMPLEMENT** (after the fixes applied in this review)

**Justification:** every Critical finding was a mismatch between the task and today's code with one
evidence-dictated fix, and all were applied. None needed information only a human has.

---

## Next Steps

1. Phase 1 — parser + edge kinds + tests (mutation-proved).
2. Phase 2 — hook refusal + node test.
3. Phase 3 — docs, the three conversions, `git rm` of `UNREACHED` copies, `bundle:check` clean.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, via develop-task Step 2)
- **Review Date:** 2026-09-29
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.126.bundler-citation-form/task.126.bundler-citation-form.md`
- **Code consulted:** `skills/create-skill/scripts/{bundle_skill,quick_validate,package_skill}.py`, `.githooks/pre-commit`, `package.json`, `shared/resources/develop-pipeline-autonomous-defaults.md`, `skills/create-skill/SKILL.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (always-load)
