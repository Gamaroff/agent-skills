---
id: task.125
title: "[Task 125] develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so"
type: task
description: "Two develop-bug defects on the same theme — the bug pipeline borrows story/task machinery that does not fit and reports its own failures poorly. Step 7 tells the pipeline to run /finalise against the bug file, whose AC agent, Change Log row, status: accepted, sprint review and registry tick either do not apply or are forbidden for a bug; bug.13 and bug.14 each hand-wrote the same bug-shaped DoD from the template as the 'fallback'. And ensure-bug-github-issue passes priority/severity labels verbatim (High, Major) to a repo whose labels are lowercase with no severity:* at all, so gh rejects the whole create and tracker-issue.js drops the stderr line naming the label; on an unattended run the bug proceeds with no issue. Ship finalise --bug, and make the issue create tolerant and its failure legible. Observations #65, #69."
tags: [develop-bug, finalise, ensure-bug-github-issue, tracker-issue]
category: refactoring
status: planned
priority: Medium
risk_level: low
created: 2026-09-17
updated: 2026-09-17
assignee:
estimated_effort_hours: 8
github_issue: 425
---

# Technical Task: develop-bug's only DoD path is documented as a fallback, and its issue create fails on a label case mismatch

**Status:** Planned
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

**Scope**: `skills/finalise` (a `--bug` mode), `develop-bug-step-7-close-bug.md`,
`skills/ensure-bug-github-issue`, `shared/resources/tracker-issue.js`.

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

### Benefits

1. One DoD path for bugs, run by the same skill the other pipelines use, producing the same file
   shape bug.13/14 converged on — no hand derivation, no "fallback" wording.
2. The CI-rollup gate and the canonical PR comment apply to bugs exactly as to tasks; the parts
   that do not apply are skipped by the mode, not by the operator's judgement.
3. A label that does not exist skips the label, never the issue; the failure line that names a
   real problem reaches the log.
4. Two observations close.

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
`shared/resources/develop-bug-step-7-close-bug.md`, `evals/shared/tests/` (a finalise mode test)

**Changes**:
- [ ] Mode detection: `--bug` flag, or a document whose path matches the bug filename pattern → hint.
- [ ] Skip list stated once; each skipped step logs `skipped — bug mode`.
- [ ] Bug DoD template lifted from bug.13/14's DoD files; CI readings 1+2 and the PR canonical comment retained.
- [ ] Status History row via `status-history.js` (the bug counterpart of `change-log.js`).
- [ ] Step 7 Part A rewritten; the fallback paragraph deleted.

**Dependencies**: none.

### Phase 2: Tolerant issue create with legible failure (#65)

**Risk Level**: Low

**Files**: `skills/ensure-bug-github-issue/SKILL.md`, `shared/resources/tracker-issue.js`, its test

**Changes**:
- [ ] Normalise label values to the repo convention (reuse the sibling ensure-* mapping).
- [ ] `gh label list --json name` once; drop absent labels with a warning; never fail the create on a label.
- [ ] Severity into the body Metadata table.
- [ ] `tracker-issue.js`: failure message carries the first non-empty stderr line; test with a fake `gh` that fails on a label.

**Dependencies**: none.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/finalise/SKILL.md` — `--bug` mode
2. ✅ `shared/resources/develop-bug-step-7-close-bug.md` — Part A
3. ✅ `skills/ensure-bug-github-issue/SKILL.md` — Step B5
4. ✅ `shared/resources/tracker-issue.js` — failure message

### Files to Create

5. ✅ `skills/finalise/assets/bug-dod-template.md`

### Files to Modify (Tests)

6. ✅ `shared/resources/tests/tracker-issue.test.mjs` (or the existing tracker-issue test) — stderr surfacing, label skip
7. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs` (new) — skip list asserted against the SKILL.md

### Files to Modify (Documentation)

8. ✅ `docs/runbooks/` bug runbook (task.112's hotfix runbook and the bug flow) — the DoD step
9. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] `tracker-issue.js` failure includes stderr; label normalisation maps `High`→`high`, `Major` dropped when absent.
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
- [ ] Next `/develop-bug` run: no hand-written DoD; the issue is created with normalised labels.

## 9. Success Criteria

### Functional
- [ ] `/finalise --bug` produces the DoD file, the CI readings and the PR comment; writes no Change Log row.
- [ ] Step 7 has no fallback paragraph.
- [ ] A label absent from the repo never fails an issue create; the warning names it.
- [ ] Any `tracker-issue.js` failure message carries gh's own first line.

### Performance
- [ ] One extra `gh label list` per bug create.

### Code Quality
- [ ] Skip list stated once; mutation proof: remove a skip → the mode test goes red.

### Migration
- [ ] Observations #65, #69 close naming the PR; bug.13/14's hand-written DoDs left as-is.

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

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #65, #69) | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: finalise --bug
- [ ] Phase 2: tolerant issue create
- [ ] QA: `task.125.qa.[N].develop-bug-finalise-mode-and-issue-create.md`
- [ ] Gate: `task.125.gate.[N].develop-bug-finalise-mode-and-issue-create.yml`

## References

- Observations #65, #69; bug.13 and bug.14's hand-written DoD files (the template source)
- `shared/resources/document-change-log.md` §Exclusions; `shared/resources/status-history.js`
- `skills/ensure-task-github-issue/SKILL.md` — the sibling label handling to reuse

## Notes

Bugs found during QA land at `task.125.bug.[N].[name].md` in this directory.
