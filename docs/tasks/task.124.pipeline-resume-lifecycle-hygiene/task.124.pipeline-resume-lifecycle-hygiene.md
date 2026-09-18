---
id: task.124
title: "[Task 124] Resume trusts what it finds on disk: a dirty-tree probe, a summary-gap rule that fires on every healthy resume, a halt snapshot that outlives its run, a Stop hook that cannot tell waiting from stalling, a HALT rm that zsh aborts, a report nobody reads back, and an in-session resume that has no lock to advance"
type: task
description: "Six defects in the develop pipelines' resume and halt lifecycle, all observed on tasks 109–117. Phase 0b inherits a dirty tree instead of classifying it (an overlay reverted every bundled task.116 copy unseen); the resume detector flags a missing step-3 summary as blocking on every resume that never dispatched one; a completed run leaves the earlier halt snapshot on disk and the next run is offered a resume for merged work; the Stop hook re-prompts a step that is legitimately waiting on a background task; the HALT snippet's `rm` pairs the lock with a glob that zsh's nomatch aborts, leaving the lock in place; and the HALT commit shipped a doubled, mid-line-spliced implementation report because no boundary reads the report back. One task: each is a small mechanism in the resume contract, the detector prompt, the hooks, or a new report-lint.js. A seventh (task.121): after a PreCompact pause the hook removes the lock by design, and a session that continues in place — rather than re-invoking the skill — has no step that puts it back; advance-pipeline-lock.sh is a silent exit-0 no-op without a lock, so the Stop hook and every advance were inert until the run rebuilt the lock from the snapshot by hand. Observations #85, #86, #88, #89, #111, #115, #123."
tags: [develop-task, develop-story, develop-bug, resume, hooks, pipeline, precompact]
category: refactoring
status: planned
priority: High
risk_level: medium
created: 2026-09-17
updated: 2026-09-18
assignee:
estimated_effort_hours: 9
github_issue: 424
---

# Technical Task: Resume trusts what it finds on disk

**Status:** Planned
**GitHub Issue**: [#424](https://github.com/Gamaroff/agent-skills/issues/424)

---

## 1. Overview

The develop pipelines are crash-safe by design: a lock, per-step summaries, a halt snapshot, and a
resume detector that reads them back. Six observations from the last week show the same shape at
six points — the resume path *trusts* a recorded or found state that it could have *checked*. This
task adds the checks: a working-tree probe on resume, an evidence-conditioned summary-gap rule,
snapshot cleanup owned by the completion path, a `waiting_on` field the Stop hook honours, a HALT
snippet that cannot leave the lock behind, and a report linter run at every boundary that commits
the report — and, from the 2026-09-18 review, a `--restore` mode on the lock advancer so an
in-session continuation after a PreCompact pause has a lock to advance.

**Scope**: `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`,
`develop-pipeline-on-stop.sh`, `develop-pipeline-hooks.md`, the HALT snippets in the step docs,
the Step 8 completion path, `advance-pipeline-lock.sh`, and a new pure `report-lint.js` beside `change-log.js`.

## 2. Motivation

### Current Problems

1. **Resume inherits a dirty tree.** Resuming task.116, 44 modified and 57 deleted files under
   `skills/*/references/` were byte-identical to `origin/develop` — a consumer-install overlay dropped
   onto the branch — and silently reverted every bundled task-116 copy. `bundle --check` would have
   re-created them and hidden the event (#85).
2. **The detector's summary-gap rule fires on every healthy resume.** Step 3 writes a summary only
   when it dispatches a triage subagent; a green single-iteration Step 3 writes none by design. The
   rule exempts `[1, 2, 4, 8]` and treats every other step as always summary-producing (#86).
3. **A completed run leaves its halt snapshot.** Task.116 halted at cycle 5, resumed, finalised and
   merged — with the cycle-5 snapshot still on disk. Phase 0b would offer "Resume from step 5" to
   the next invocation for a merged task (#88).
4. **The Stop hook cannot tell waiting from stalling.** On task.109 it fired four times during Step 5,
   each time re-prompting `/qa-task` for a step in flight waiting on its reviewer or `ci:fast` (#89).
5. **The HALT `rm` pairs the lock with a glob.** Under zsh `nomatch`, `rm -f lock test-output-*.log`
   aborts before removing anything when the glob matches nothing; the lock stays and the next turn
   resumes a halted run (#111).
6. **Nobody reads the report back.** The task.117 HALT commit shipped an implementation report with
   the Step 4 and 5–6 Decisions Log absent, a fragment spliced mid-line after `## Completion`, and a
   stale full copy appended — 366 lines for 210 intended — as the escalation artefact a human was
   asked to read (#115).
7. **An in-session resume has no lock to advance.** The PreCompact hook removes the lock and writes
   the snapshot, and the documented resume path assumes a *new* `/develop-task` invocation. On
   task.121 the session continued in place after compaction; the instruction "re-assert the lock
   with `advance-pipeline-lock.sh 7`" was a silent exit-0 no-op (`[ -f "$LOCK" ] || exit 0`), so
   the Stop hook, `--skill finalise` and `--complete` were all inert until the run rebuilt the lock
   from the snapshot by hand — a write nothing sanctions (#123).

### Benefits

1. A dirty tree on resume is classified (overlay / bundle-only / unknown) and acted on, never inherited.
2. Resume is not blocked by a summary that was never supposed to exist.
3. A snapshot cannot outlive the run it belongs to; the next invocation starts clean.
4. A step waiting on a background task ends its turn without a re-prompt.
5. A HALT always removes the lock, in both shells.
6. A structurally invalid report is caught at the boundary that would commit it.
7. A continuation after a pause, in-session or by re-invocation, restores the lock through one documented command that HALTs loudly when there is nothing to restore.

## 3. Technical Background

### Current Architecture

```
Phase 0a/0b  detector reads lock + .summaries/step-*.json + last-halt.json; returns blocking_issues
             summary-gap rule: step ∉ [1,2,4,8] AND no summary → blocking
             tree state: not probed
Step 8       removes the lock on success; last-halt.json untouched
Stop hook    lock mid-step → re-prompt "invoke /<skill>"
HALT snippet rm -f .claude/state/develop-pipeline.lock .claude/state/test-output-*.log   (one argv)
Report       written by append at each transition; never read back
advance-lock <n> with no lock → exit 0, silent (an in-session resume after a pause advances nothing)
```

### Target Architecture

```
Phase 0b     git status --porcelain non-empty → classify:
               (a) every change byte-identical to merge-base or origin/<base>  → overlay: discard, record
               (b) only skills/*/references/                                     → npm run bundle -- --check; reconcile
               (c) anything else                                                 → HALT naming the files
             summary-gap rule: raise only when the report's `Subagent summary ref` for that step names a missing path
Step 8       on success: delete last-halt.json when it names this work item (writer owns cleanup);
             detector: refuse a snapshot whose document reads status: accepted or whose PR is merged, and delete it
Lock         waiting_on: {agent|task, since} — set at dispatch, cleared on result
Stop hook    waiting_on set → allow the stop with "waiting on {x} since {t}"; else re-prompt as today
HALT snippet rm -f lock; find .claude/state -name 'test-output-*.log' -delete   (two commands)
report-lint.js  pure: exactly one `# Implementation Report`, each `## ` section once in template order,
                no `### QA Cycle N` repeated; run before every commit of the report and at HALT
advance-lock --restore   no lock + snapshot (last-halt.json, else newest .pausing.* — by document, then age)
                         → rebuild the lock at halt_step, strip the pause fields, consume the snapshot
                         lock present → no-op exit 0; neither → exit 1 naming both paths
                         <n> with no lock → exit 1 (was silent exit 0), pointing at --restore
```

### Important Clarifications

- **Classification (a) is the overlay case and it is safe to discard**: the bytes are already on the
  base branch. (b) reconciles through the bundler because the sources are the truth. (c) is the
  only HALT, because resume cannot tell in-progress work from damage.
- **The snapshot cleanup has two writers on purpose** — the completion path deletes, and the detector
  refuses a stale one — because either alone leaves a window (a run that completes outside the
  pipeline; a snapshot from a crashed cleanup).
- **`waiting_on` is written by the step, not inferred by the hook.** The hook has only the lock; a
  field the dispatching step sets and clears is the one thing it can read.
- **`--restore` consumes the snapshot it reads from**, so a restored run cannot be re-offered later (the other half of #88); the completion-path deletion stays for runs that never restored.
- **`report-lint.js` is pure and CLI-thin**, like `change-log.js` and `registry-tick.js`: the
  pipelines, the PreCompact hook and a test share one reader.

## 4. Scope

### In Scope

✅ Resume contract: dirty-tree classification; snapshot refusal; re-entry pointer to task.123.
✅ Detector prompt: evidence-conditioned summary-gap rule.
✅ Step 8 / completion path: snapshot deletion.
✅ Lock schema + Stop hook: `waiting_on`; `develop-pipeline-hooks.md` documents the pattern and
   retires foreground `sleep` advice.
✅ HALT snippets in step docs and the resume contract's halt text: two-command form.
✅ `shared/resources/report-lint.js` + test; called from the Step Transition Protocol, HALT, and
   the PreCompact hook.
✅ `advance-pipeline-lock.sh --restore`; the pause reference and the orchestrators' Phase 0 name it as the in-session continuation step; the compaction-summary instruction points at it.
✅ `npm run bundle`.

### Out of Scope

❌ Re-entry after a QA loop escalation — task.123.
❌ Making the PreCompact hook idempotent — task.120 (merged).
❌ Repairing a corrupt report automatically; the linter refuses, a human repairs.

## 5. Breaking Changes

None. A lock without `waiting_on` reads as not waiting; a report that fails the linter was already
unreadable. `advance-pipeline-lock.sh <n>` with no lock changes from silent exit 0 to exit 1 — a
caller that relied on the silence was advancing nothing.

## 6. Implementation Plan

> Detailed implementation guide: [task.124.plan.pipeline-resume-lifecycle-hygiene.md](task.124.plan.pipeline-resume-lifecycle-hygiene.md)

### Phase 1: Snapshot and tree on resume (#85, #86, #88)

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-resume-contract.md`,
`shared/resources/pipeline-resume-detector-prompt.md`, `shared/resources/develop-pipeline-step-8-commit.md`

**Changes**:
- [ ] Phase 0b dirty-tree probe with the three classifications and their actions.
- [ ] Summary-gap rule conditioned on the report's `Subagent summary ref` column.
- [ ] Step 8 success path deletes a matching `last-halt.json`; detector refuses and deletes a stale one.
- [ ] Replay fixtures: overlay resume; healthy resume with no step-3 summary; stale snapshot after merge.

**Dependencies**: none.

### Phase 2: Waiting vs stalling, and the HALT rm (#89, #111)

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-hooks.md`,
the lock schema in the resume contract, every step doc that dispatches (5, 5c, 7) and every HALT snippet

**Changes**:
- [ ] `waiting_on` in the lock; dispatch sites set it, result reads clear it.
- [ ] Stop hook allows the stop when set; hook test covers set / cleared / stale (> wall-clock budget → re-prompt).
- [ ] HALT snippets: `rm -f "$LOCK"` then `find … -delete`; `lint:shell` / shellcheck over the fenced snippets via `qa-execute-snippets` in both shells.

**Dependencies**: none.

### Phase 3: report-lint.js (#115)

**Risk Level**: Low

**Files**: `shared/resources/report-lint.js`, `shared/resources/tests/report-lint.test.mjs`,
`develop-pipeline-remaining-work-banner.md` or the Step Transition Protocol doc, the HALT path,
`develop-pipeline-on-precompact.sh`

**Changes**:
- [ ] Pure `lintReport(text) → { ok, problems[] }`: one H1; each template `## ` once, in order; no repeated `### QA Cycle N`; no text after the final section's last line that duplicates an earlier heading.
- [ ] CLI: `report-lint.js --file <report> --json`, exit 1 on problems.
- [ ] Call sites: before the report commit at every Step Transition, at HALT, in the PreCompact hook — refuse the commit and name the problem.
- [ ] Test: the task.117 corrupt report (`329b4a65`) as a fixture → the three problems named; a clean report → ok.

**Dependencies**: none.

### Phase 4: Lock restore for an in-session continuation (#123)

**Risk Level**: Low

**Files**: `shared/resources/advance-pipeline-lock.sh`, `develop-pipeline-pause.md`, `develop-pipeline-resume-contract.md`,
the orchestrators' Phase 0 (`develop-task` / `develop-story` / `develop-bug` SKILL.md), `evals/shared/tests/` hook/lock tests

**Changes**:
- [ ] `--restore`: rebuild from `last-halt.json` or the newest `.pausing.*` claim (choose by document, then age — the detector's rule); strip `paused_at` / `pause_reason` / `halt_step`; keep `current_step`; delete the source.
- [ ] `<n>` with no lock → exit 1 with a message naming `--restore`; `--complete` stays exempt.
- [ ] Pause reference + Phase 0: "continuing in the same session after a pause → `--restore` first"; the PreCompact hook's summary instruction says the same.
- [ ] Tests: no lock + snapshot → lock at halt_step, snapshot gone; lock present → no-op; neither → exit 1; `<n>` with no lock → exit 1.

**Dependencies**: none (shares files with Phase 1's snapshot cleanup; land Phase 1 first).

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-resume-contract.md`
2. ✅ `shared/resources/pipeline-resume-detector-prompt.md`
3. ✅ `shared/resources/develop-pipeline-step-8-commit.md`
4. ✅ `shared/resources/develop-pipeline-on-stop.sh`, `develop-pipeline-hooks.md`, `develop-pipeline-on-precompact.sh`
5. ✅ `shared/resources/advance-pipeline-lock.sh`, `develop-pipeline-pause.md`, the three orchestrators' Phase 0
6. ✅ Step docs with dispatch sites and HALT snippets (`develop-pipeline-step-5-6-qa-loop.md`, `-step-7-finalise.md`, `develop-bug-step-5-6-verify-loop.md`)

### Files to Create

7. ✅ `shared/resources/report-lint.js`

### Files to Modify (Tests)

8. ✅ `shared/resources/tests/report-lint.test.mjs` (new), the hooks test, replay fixtures under `evals/develop-task/step-isolation/`

### Files to Modify (Documentation)

9. ✅ `docs/reference/anti-patterns.md` — "never put the lock and a glob in one `rm` argv"; `docs/contributing/traps.md` — zsh nomatch
10. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [ ] `report-lint.js`: corrupt fixture → three named problems; clean → ok; a report with a fenced example containing `# Implementation Report` → ok (fence-aware, reuse `change-log.js`'s `fencedRanges`).
- [ ] Stop hook: `waiting_on` set → exit 0 with the waiting line; cleared → re-prompt; older than budget → re-prompt.
- [ ] `advance-pipeline-lock.sh --restore`: the four cases above; `<n>` with no lock exits 1.

**Command**: `npm test`

### Integration Tests
- [ ] Replay fixtures for the three Phase 1 cases.
- [ ] HALT snippet under `qa-execute-snippets` in bash and zsh with an empty glob: lock removed in both.

### Contract Tests
- [ ] Lock schema in the resume contract and the hook agree on `waiting_on` (one test reads both).

### Performance Tests
Not applicable.

### Consumer Tests
- [ ] Next pipeline run that halts and resumes: no stale snapshot after merge; no re-prompt while a reviewer is running.

## 9. Success Criteria

### Functional
- [ ] A dirty tree on resume is classified and recorded; an overlay never reaches `git add`.
- [ ] A healthy resume with no step-3 summary is not blocked.
- [ ] No `last-halt.json` survives a completed run for the same work item.
- [ ] The Stop hook does not re-prompt a step with `waiting_on` set.
- [ ] A HALT removes the lock in bash and zsh with an empty glob.
- [ ] A structurally invalid report cannot be committed by the pipeline.
- [ ] An in-session continuation after a PreCompact pause restores the lock with one documented command; advancing with no lock is an error, not silence.

### Performance
- [ ] The tree probe adds one `git status --porcelain` and, for (a), one `git diff --stat` against the base.

### Code Quality
- [ ] `report-lint.js` is pure with a thin CLI; one reader for all call sites.
- [ ] Every mechanism has a mutation proof recorded.

### Migration
- [ ] Observations #85, #86, #88, #89, #111, #115, #123 close naming the PR.

## 10. Risk Assessment

### High Risk
None.

### Medium Risk
1. **Classification (a) discards real work that happens to match the base.** Probability low (a
   change identical to base is by definition not a change); mitigation: record every discarded path
   in the implementation report's Decisions Log.
2. **The linter's section order is stricter than real reports.** Mitigation: derive the expected
   order from the report template file, not a hand list; the corrupt-fixture test plus five real
   accepted reports as green fixtures.

### Low Risk
1. `waiting_on` left set by a step that crashed — the hook's budget check re-prompts after the wall-clock budget.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
- **Triggers**: the linter refuses a valid report in a live run; the hook stops re-prompting a genuine stall.
- **Steps**: `git revert`; `npm run bundle`; commit. Delete any `waiting_on` field from a live lock by hand.
- **Validation**: hooks test and replay suite green on the reverted tree.

### Partial Rollback (1–2 hours)
- Phases are independent; revert the one that misbehaves.

### Forward Fix
- Linter false positive: add the shape as a green fixture and adjust.

### Rollback Triggers
- **Critical**: a HALT that leaves the lock; a resume that discards non-overlay work.
- **Non-critical**: message wording, anti-pattern text.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #85, #86, #88, #89, #111, #115) | create-task |
| 2026-09-18 | 1.1 | Phase 4 added — `advance-pipeline-lock.sh --restore` for an in-session continuation after a PreCompact pause (obs #123, task.121); effort 8h → 9h | observe-work |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: snapshot and tree on resume
- [ ] Phase 2: waiting_on + HALT rm
- [ ] Phase 3: report-lint.js
- [ ] Phase 4: lock restore
- [ ] QA: `task.124.qa.[N].pipeline-resume-lifecycle-hygiene.md`
- [ ] Gate: `task.124.gate.[N].pipeline-resume-lifecycle-hygiene.yml`

## References

- Observations #85, #86, #88, #89, #111, #115, #123; #101 (task.120, merged — the PreCompact double-append)
- `shared/resources/develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-hooks.md`
- task.117's HALT commit `329b4a65` — the corrupt-report fixture
- task.123 — re-entry after a QA loop escalation (sibling; independent)

## Notes

Bugs found during QA land at `task.124.bug.[N].[name].md` in this directory.
