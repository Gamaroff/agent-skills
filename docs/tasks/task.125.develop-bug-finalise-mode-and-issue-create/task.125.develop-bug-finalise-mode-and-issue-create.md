---
id: task.125
title: "[Task 125] develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from"
type: task
description: "Three develop-bug defects on the same theme — the bug pipeline borrows story/task machinery that does not fit and reports its own failures poorly. Step 7 tells the pipeline to run /finalise against the bug file, whose AC agent, Change Log row, status: accepted, sprint review and registry tick either do not apply or are forbidden for a bug; bug.13 and bug.14 each hand-wrote the same bug-shaped DoD from the template as the 'fallback'. And ensure-bug-github-issue passes priority/severity labels verbatim (High, Major) to a repo whose labels are lowercase with no severity:* at all, so gh rejects the whole create and tracker-issue.js drops the stderr line naming the label; on an unattended run the bug proceeds with no issue. Ship finalise --bug, and make the issue create tolerant and its failure legible. Observations #65, #69. The third (task.121, 2026-09-18): the verify loop invokes /qa-fix for a general bug, qa-fix now derives its cycle from the highest-numbered gate file with references/qa-cycle.sh — which refuses rather than guesses — and a general bug's directory carries no gate, so the helper refuses and the bug issue gets no fix-cycle comment at all; the loop already knows its cycle and should pass it. Observation #122."
tags: [develop-bug, finalise, ensure-bug-github-issue, tracker-issue, qa-fix, qa-cycle]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-17
updated: 2026-09-21
assignee:
estimated_effort_hours: 9
github_issue: 425
---

# Technical Task: develop-bug's only DoD path is documented as a fallback, and its issue create fails on a label case mismatch

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.125.review.1.develop-bug-finalise-mode-and-issue-create.md` implemented 2026-09-21
**GitHub Issue**: [#425](https://github.com/Gamaroff/agent-skills/issues/425)

---

## 1. Overview

`develop-bug` was adapted from `develop-task`, and two seams still show. Step 7 invokes `/finalise`
against a bug file, but finalise's machinery is story/task-shaped — the AC agent has no ACs to read,
the Change Log row is forbidden for bugs, `status: accepted` is not a bug status, the sprint-review
summary and registry tick have no bug analogue — so every real run takes the "inline DoD fallback"
and hand-writes the same file. Separately, `ensure-bug-github-issue` builds labels from frontmatter
values verbatim, and one case mismatch fails the whole create while the engine swallows the one
stderr line that would have explained it. This task gives the bug pipeline a first-class DoD path
(`finalise --bug`) and a tolerant, legible issue create.

**Scope**: `skills/finalise` (a `--bug` mode), `skills/develop-bug/references/develop-bug-step-7-close-bug.md`,
`skills/ensure-bug-github-issue`, `shared/resources/tracker-issue.js`, `skills/qa-fix` +
`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`.

## 2. Motivation

### Current Problems

1. **The common path is documented as the fallback.** Step 7: "invoke `/finalise` … if `/finalise`
   cannot process the bug document type in your install, fall back to the inline DoD checklist".
   It cannot, by construction: finalise runs an AC agent (bugs have none), appends a Change Log row
   (bug reports are barred from carrying one — `document-change-log.md` §Exclusions), sets
   `status: accepted` (bugs go `closed`), writes a sprint-review summary and ticks the task registry
   (`registry-tick.js` returns `not-a-task`). bug.13 and bug.14 both took the fallback and derived
   the same DoD shape independently (#69).
2. **A label case mismatch fails the whole create.** Step B5 passes `--label "priority:${PRIORITY}"`
   and `--label "severity:${SEVERITY}"` with frontmatter values verbatim (`High`, `Major`); this
   repo's labels are lowercase and carry no `severity:*`. `gh issue create` rejected the create;
   `tracker-issue.js` reported "create a GitHub issue failed" with the command line and dropped gh's
   stderr, which named the label. The sub-routine's contract makes an empty `BUG_ISSUE_NUM`
   non-blocking, so unattended the bug proceeds with no issue (#65).
3. **The verify loop's `/qa-fix` has no cycle source.** task.121 made qa-fix's tracker comment
   cycle-scoped (`--stage qa-fix-${FIX_CYCLE}`), with `FIX_CYCLE` read from the highest-numbered
   `*.gate.{N}.*.yml` by `references/qa-cycle.sh`, which **refuses** when no gate is numbered — by
   design, since a guessed `1` reproduces the once-per-issue bug wearing a suffix. develop-bug's
   verify loop writes `qa-cycle-{N}` comments itself and never produces a gate, so on every
   develop-bug run the helper refuses, the block prints its ⚠️ and skips the post, and the bug issue
   carries no fix-cycle comment — a regression from before task.121, when the bare stage posted once.
   Found by task.121's Step 5c review (CR-1, behaviour half) and deferred here (#122).

### Benefits

1. One DoD path for bugs, run by the same skill the other pipelines use, producing the same file
   shape bug.13/14 converged on — no hand derivation, no "fallback" wording.
2. The CI-rollup gate and the canonical PR comment apply to bugs exactly as to tasks; the parts
   that do not apply are skipped by the mode, not by the operator's judgement.
3. A label that does not exist skips the label, never the issue; the failure line that names a
   real problem reaches the log.
4. A bug loop that already knows its cycle states it; the helper's refusal is kept for the gate-driven path, where guessing is the defect.
5. Three observations close.

## 3. Technical Background

### Current Architecture

```
develop-bug Step 7 Part A → /finalise <bug-file>       (story/task DoD: AC agent, CL row, accepted, sprint review, registry tick)
                           └ "fallback": inline checklist, hand-written bug.N.dod.1.*.md
ensure-bug-github-issue B5 → tracker-issue.js --kind create --label priority:${PRIORITY} --label severity:${SEVERITY}
tracker-issue.js           → on gh failure: "create a GitHub issue failed: <argv>"   (stderr dropped)
```

### Target Architecture

```
/finalise --bug <bug-file>
  runs:   CI rollup gate (readings 1+2), fix-evidence DoD (fix present; regression test fails-without /
          passes-with; guard scope; bundled copies in sync; suite + lint; security; compliance; docs),
          canonical PR comment, tracker comment (stage: done), Status History row (status-history.js)
  skips:  AC agent, Change Log row, status: accepted (writes closed via the bug-close routine), sprint
          review, registry-tick (returns not-a-task anyway)
  writes: {bug-prefix}.dod.{N}.{name}.md from a bug-shaped template asset
develop-bug Step 7 Part A → /finalise --bug; no fallback paragraph
ensure-bug-github-issue B5 → labels normalised to the repo's convention (lowercase); each label checked
          against `gh label list` and skipped with a warning when absent; the create never carries a
          label that would fail it; severity travels in the body's Metadata table
tracker-issue.js           → on failure: "create a GitHub issue failed: <first stderr line>" + argv
develop-bug verify loop    → Skill(qa-fix, args="fix_cycle=N") with the loop's own cycle
qa-fix Step 7 blocks       → FIX_CYCLE := explicit fix_cycle arg if present, else qa-cycle.sh; refuse only when neither
```

### Important Clarifications

- **Mode, not a new skill.** `finalise` already branches story/task in several places; `--bug` is a
  third document kind with an explicit skip list. Stating the skips once in the skill is what makes
  "does this apply to a bug?" a lookup instead of a judgement.
- **The bug DoD template is the shape bug.13/14 converged on** — read both DoD files and lift the
  common sections; do not design a new one.
- **Label normalisation is the sibling paths' existing behaviour** — check `ensure-task-github-issue`
  / `ensure-story-github-issue` and reuse their mapping rather than inventing a third.
- **Skipping a label is non-blocking; failing the create is not the alternative.** The issue exists
  to carry the bug; a label is metadata.

## 4. Scope

### In Scope

✅ `finalise --bug`: the mode, its skip list, the bug DoD template asset, the Status History row.
✅ `develop-bug-step-7-close-bug.md`: Part A invokes the mode; the fallback paragraph is removed.
✅ `ensure-bug-github-issue` B5: label normalisation + existence check; severity in the body.
✅ `tracker-issue.js`: surface gh's first stderr line in the failure message (all kinds, not only create).
✅ Tests: finalise mode skip-list test; label tolerance test with a fake `gh`; stderr surfacing test.
✅ `qa-fix` accepts `fix_cycle=N` in its Skill args and prefers it; develop-bug's verify loop passes its cycle; `tests/qa-cycle.test.js` gains the empty-gate-directory consumer case.

### Out of Scope

❌ A Jira analogue of the label tolerance (`ensure-bug-jira-issue` sets priority as a field, not a label).
❌ Changing the bug lifecycle statuses.

## 5. Breaking Changes

None. `/finalise <bug-file>` without `--bug` continues to do what it does today (and should print a
hint naming the mode).

## 6. Implementation Plan

> Detailed implementation guide: [task.125.plan.develop-bug-finalise-mode-and-issue-create.md](task.125.plan.develop-bug-finalise-mode-and-issue-create.md)

### Phase 1: `finalise --bug` (#69)

**Risk Level**: Medium

**Files**: `skills/finalise/SKILL.md`, `skills/finalise/assets/bug-dod-template.md` (new),
`skills/develop-bug/references/develop-bug-step-7-close-bug.md` (canonical — not bundled from `shared/`),
`evals/shared/tests/` (a finalise mode test)

**Changes**:
- [x] Mode detection: `--bug` flag, or a document whose path matches the bug filename pattern → hint.
- [x] Skip list stated once; each skipped step logs `skipped — bug mode`.
- [x] Bug DoD template lifted from bug.13/14's DoD files; CI readings 1+2 and the PR canonical comment retained.
- [x] Status History row via `status-history.js` (the bug counterpart of `change-log.js`).
- [x] Step 7 Part A rewritten; the fallback paragraph deleted.

**Dependencies**: none.

### Phase 2: Tolerant issue create with legible failure (#65)

**Risk Level**: Low

**Files**: `skills/ensure-bug-github-issue/SKILL.md`, `shared/resources/tracker-issue.js`, its test

**Changes**:
- [x] Normalise label values to the repo convention (reuse the sibling ensure-* mapping).
- [x] `gh label list --json name` once; drop absent labels with a warning; never fail the create on a label.
- [x] Severity retained in the body Metadata table (already rendered by Step B5's body — `| Severity | ${SEVERITY} |`); with the `severity:*` label gone, the table becomes its only carrier.
- [x] `tracker-issue.js`: failure message carries the first non-empty stderr line; test with a fake `gh` that fails on a label. The drop is `GIT_EXEC_OPTS.stdio = ["ignore","pipe","ignore"]` shared by every `gh()` call, and the catch in `run()` formats `e.message` only — pipe stderr and read `e.stderr` in that one catch, so every kind is covered by one edit.

**Dependencies**: none.

### Phase 3: A cycle source for the bug verify loop (#122)

**Risk Level**: Low

**Files**: `skills/qa-fix/SKILL.md` (Pipeline Skill args + the two blocks that derive `FIX_CYCLE`),
`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `tests/qa-cycle.test.js`

**Changes**:
- [x] `qa-fix` Pipeline Skill args: `fix_cycle=<N>` (positive integer) → `FIX_CYCLE_ARG`; each deriving block uses it when set, else calls the helper; refuses (warn, skip the post) only when both are absent.
- [x] develop-bug verify loop: `Skill(qa-fix, args="fix_cycle=${CYCLE}")` with the cycle it already posts as `qa-cycle-{N}`.
- [x] Guard: `tests/qa-cycle.test.js` "every block that uses the cycle" test still passes (the arg is read in the same block); new case: an empty gate directory + `fix_cycle=2` → the block reaches the tracker call with `qa-fix-2`; empty directory + no arg → refuses as today.
- [x] Mutation: revert the fallback order (helper first) → the gate + arg case red (the arg must win); drop the arg → the empty-dir case red.

**Dependencies**: none.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/finalise/SKILL.md` — `--bug` mode; 6b `DOD_PATH`/`FINAL_GATE` and Step 2 globs keyed on the bug stem (QA cycle 2 — a co-located bug must not publish its parent's artefacts); 6b re-binds `DOC_KIND` and derives the verify-loop verdict in-block, HALTing when none (QA cycle 3)
2. ✅ `skills/develop-bug/references/develop-bug-step-7-close-bug.md` — Part A
3. ✅ `skills/ensure-bug-github-issue/SKILL.md` — Step B5
4. ✅ `shared/resources/tracker-issue.js` — failure message (both spawn paths: `gh()` and the `--body-file` `withStdin` closure — QA cycle 1); `shared/resources/registry-tick.js` — a `.bug.<N>.` stem is `not-a-task` (QA cycle 1)
5. ✅ `skills/qa-fix/SKILL.md` — `fix_cycle` arg; `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` — passes it

### Files to Create

6. ✅ `skills/finalise/assets/bug-dod-template.md`
6a. ✅ `shared/resources/finalise-dod-fix-evidence-prompt.md` — the agent that takes the AC agent's slot in bug mode (bundled into `skills/finalise/references/`)
6b. ✅ `shared/resources/gh-labels.sh` (new, QA cycle 1) — `gh_labels_filter`, the one definition of which labels may reach a gh mutation; sourced by all nine GitHub label sites (`ensure-bug/story/task/epic-github-issue`, `sync-github-bug/story/task/epic`, `create-issue` — fixed labels included, QA cycle 2) and bundled into each; the four sync edits derive `--remove-label` against the filtered label (QA cycle 2)

### Files to Modify (Tests)

7. ✅ `shared/resources/tests/tracker-issue.test.mjs` — §9 stderr surfacing (in-process ×3 + end-to-end with a fake `gh` on PATH)
8. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs` (new) — skip table ↔ prose markers, both directions; template shape; Step 7 fallback gone
9. ✅ `tests/qa-cycle.test.js` — `[fix_cycle]` cases: empty dir + arg, empty dir + no arg, gate + arg (arg wins), gate + no arg
9a. ✅ `tests/ensure-bug-label-tolerance.test.js` (new) — executes the B5 block with a fake `gh` / `node`: the block sources the shared helper, collects its lines, expands `"${LABEL_ARGS[@]}"` into the create; newline value wired (QA cycle 1)
9b. ✅ `tests/gh-labels.test.js` (new, QA cycle 1) — `gh_labels_filter` under bash + zsh with a fake `gh` (limit flag required, newline refused, failed read passes through lowercased, zero-label repo drops all, hostile shapes inert) + population guard over every `skills/*/SKILL.md` label site + bundled-copy check
9c. ✅ `shared/resources/tests/registry-tick.test.mjs` (QA cycle 1) — header-block task bug and accepted task bug answer `not-a-task`

### Files to Modify (Documentation)

10. ✅ `docs/runbooks/bug-fix.md`, `docs/runbooks/hotfix.md` — the DoD step names `finalise --bug`; `skills/develop-bug/SKILL.md` Step 7 summary + Related Skills; `CHANGELOG.md`
11. ✅ `skills/*/references/` — regenerated (`tracker-issue.js` ×20; finalise gains `bug-doc.js`, `status-history.js`, `finalise-dod-fix-evidence-prompt.md`)

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] `tracker-issue.js` failure includes stderr; label normalisation maps `High`→`high`, `Major` dropped when absent.
- [ ] `qa-fix` block with `fix_cycle=2` and no gate → `qa-fix-2`; with neither → refuses; with both → the arg wins.
- [ ] finalise mode test: every step in the skip list is marked `bug: skip` in the SKILL.md and no bug-forbidden writer (Change Log) is reachable in bug mode.

**Command**: `npm test`

### Integration Tests
- [ ] `/finalise --bug` on bug.14's file in a scratch clone produces a DoD file matching the template's sections.
- [ ] Fake `gh` with lowercase labels only: the create succeeds with `priority:high` and a warning for severity.

### Contract Tests
- [ ] `document-change-log.md` §Exclusions still lists bug reports, and finalise's bug mode test reads that exclusion rather than restating it.

### Performance Tests
Not applicable.

### Consumer Tests
- [ ] Next `/develop-bug` run: no hand-written DoD; the issue is created with normalised labels; the bug issue carries one `qa-fix-N` marker per verify cycle.

## 9. Success Criteria

### Functional
- [x] `/finalise --bug` produces the DoD file, the CI readings and the PR comment; writes no Change Log row.
- [x] Step 7 has no fallback paragraph.
- [x] A label absent from the repo never fails an issue create; the warning names it.
- [x] Any `tracker-issue.js` failure message carries gh's own first line.
- [x] develop-bug's verify loop posts a `qa-fix-{N}` comment per cycle with no gate file present.

### Performance
- [x] One extra `gh label list` per bug create.

### Code Quality
- [x] Skip list stated once; mutation proof: remove a skip → the mode test goes red.

### Migration
- [ ] Observations #65, #69, #122 close naming the PR; bug.13/14's hand-written DoDs left as-is.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **The bug mode drifts from the story/task path as finalise changes.** Mitigation: the mode is a
   skip list over the same steps, tested against the SKILL.md's own step headings.

### Low Risk
1. Label normalisation hides a genuinely misspelt priority — the warning names the dropped label.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: finalise bug mode writes a forbidden section; an issue create regresses.
- **Steps**: `git revert`; `npm run bundle`; commit.
- **Validation**: `npm test` green; `/finalise` on a task unchanged.

### Partial Rollback (1–2 hours)
- The two phases are independent; revert one.

### Forward Fix
- Template section wording; label mapping additions.

### Rollback Triggers
- **Critical**: a Change Log row written to a bug report.
- **Non-critical**: warning text.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-21
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.125.qa.11.develop-bug-finalise-mode-and-issue-create.md](./task.125.qa.11.develop-bug-finalise-mode-and-issue-create.md)
- **Gate File**: [task.125.gate.11.develop-bug-finalise-mode-and-issue-create.yml](./task.125.gate.11.develop-bug-finalise-mode-and-issue-create.yml)

### Test Coverage Summary
- **Tests Executed**: 119 targeted on the head `3cd57768` (fast gate 3741 at the cycle-10 fix); the reviewer probed the verdict pipeline with 21 shapes under bash + zsh
- **Phases Verified**: 3/3
- **Critical Issues**: 0 HIGH; 0 MEDIUM; 0 LOW in gate (2 low-confidence cleanups in future); cycle-10 BUG-24 + CR-3/4 verified FIXED — all 24 bug reports Ready for QA with fixes re-verified
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 11 (narrowed; third grant). No correctness finding. Eleven cycles closed 24 bug reports (3 HIGH, 21 MEDIUM) and the LOWs in the finalise bug path, the label tolerance and the `fix_cycle` guard; the two residuals (a reworded placeholder `PASS or FAIL`; an unreadable report's diagnostic) are low-confidence cleanups in the gate's future list.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #65, #69) | create-task |
| 2026-09-18 | 1.1 | Phase 3 added — an explicit `fix_cycle` for qa-fix so develop-bug's verify loop posts per cycle with no gate file (obs #122, task.121 5c CR-1); effort 8h → 9h | observe-work |
| 2026-09-21 | 1.2 | Review passed (9/10) — develop-bug step-doc paths corrected to `skills/develop-bug/references/`, Phase 2 severity item marked already-present, tracker-issue.js fix anchored | review-task |
| 2026-09-21 |  | Status → ready-for-development | review-task |
| 2026-09-21 |  | Implemented — 3 phases; 11 source files + 20 bundled copies; 4 test files (+19 tests), 9 mutations proved | develop |
| 2026-09-21 |  | QA gate FAIL (20/100) — 1 HIGH, 6 MEDIUM, 3 LOW; 7 bug reports filed | qa-task |
| 2026-09-21 |  | QA findings fixed — gates 1–10 answered: 24 bugs (3 HIGH, 21 MEDIUM) + 23 LOW, 10 iterations; shared gh-labels.sh helper across 9 sites, finalise bug-mode blocks self-binding (STEM, kind, flag as substituted inputs; placeholders refused) and branching in-block, one definition of {bug-prefix} + {bug-file-stem}, both artefact shapes read newest-first, +87 tests | qa-fix |
| 2026-09-21 |  | QA gate 2 FAIL (50/100) — cycle-1 fixes verified; refute pass found 1 HIGH (7.7 globs the parent's DoD/gate), 3 MEDIUM, 4 LOW; 4 bug reports filed | qa-task |
| 2026-09-21 |  | QA gate 3 CONCERNS (90/100) — cycle-2 fixes verified; 0 HIGH, 1 MEDIUM (6b inputs unbound in-block), 2 LOW; 1 bug report filed | qa-task |
| 2026-09-21 |  | QA gate 4 FAIL (70/100) — cycle-3 fixes verified; 1 HIGH (6b report glob keys on the short bug id; the full-stem shape HALTs), 0 MEDIUM, 2 LOW; 1 bug report filed | qa-task |
| 2026-09-21 |  | QA gate 5 CONCERNS (60/100) — cycle-4 fixes verified; 0 HIGH, 4 MEDIUM (finalise bug path: stale-report ordering, STEM from another block, 7.6a/7.6b bug variant in prose, no both-shapes population check), 3 LOW; 4 bug reports filed | qa-task |
| 2026-09-21 |  | QA gate 6 CONCERNS (80/100) — cycle-5 fixes verified; 0 HIGH, 1 MEDIUM ({bug-prefix} defined twice: full stem in develop-bug Step 0, short id everywhere else), 2 LOW; 1 bug report filed | qa-task |
| 2026-09-21 |  | QA gate 7 CONCERNS (80/100) — cycle-6 fixes verified; 0 HIGH, 2 MEDIUM (cycle-count find leaks a co-located bug's report into the parent; kind block unguarded against verbatim placeholders), 2 LOW; 2 bug reports filed | qa-task |
| 2026-09-21 |  | QA gate 8 CONCERNS (80/100) — cycle-7 fixes verified; 0 HIGH, 2 MEDIUM (gate/DoD lookups sort lexically; CYCLES crosses a block boundary), 2 LOW; 2 bug reports filed | qa-task |
| 2026-09-21 |  | QA gate 9 CONCERNS (90/100) — cycle-8 fixes verified; 0 HIGH, 1 MEDIUM (a template-placeholder verdict reads as PASS), 1 LOW; 1 bug report filed | qa-task |
| 2026-09-21 |  | QA gate 10 CONCERNS (90/100) — cycle-9 fixes verified; 0 HIGH, 1 MEDIUM (the verdict guard over- and under-reaches), 2 LOW; 1 bug report filed | qa-task |
| 2026-09-21 |  | QA gate 11 PASS (100/100) — cycle-10 fixes verified; 0 findings; 2 low-confidence cleanups recorded for follow-up | qa-task |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: finalise --bug
- [x] Phase 2: tolerant issue create
- [x] Phase 3: bug verify-loop cycle source
- [ ] QA: `task.125.qa.[N].develop-bug-finalise-mode-and-issue-create.md`
- [ ] Gate: `task.125.gate.[N].develop-bug-finalise-mode-and-issue-create.yml`

## References

- Observations #65, #69, #122; task.121 `task.121.pr-review.1` CR-1; bug.13 and bug.14's hand-written DoD files (the template source)
- `shared/resources/document-change-log.md` §Exclusions; `shared/resources/status-history.js`
- `skills/ensure-task-github-issue/SKILL.md` — the sibling label handling to reuse

## Notes

Bugs found during QA land at `task.125.bug.[N].[name].md` in this directory.
