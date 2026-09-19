---
id: task.124
title: "[Task 124] Resume trusts what it finds on disk: a dirty-tree probe, a summary-gap rule that fires on every healthy resume, a halt snapshot that outlives its run, a Stop hook that cannot tell waiting from stalling, a HALT rm that zsh aborts, a report nobody reads back, and an in-session resume that has no lock to advance"
type: task
description: "Six defects in the develop pipelines' resume and halt lifecycle, all observed on tasks 109–117. Phase 0b inherits a dirty tree instead of classifying it (an overlay reverted every bundled task.116 copy unseen); the resume detector flags a missing step-3 summary as blocking on every resume that never dispatched one; a completed run leaves the earlier halt snapshot on disk and the next run is offered a resume for merged work; the Stop hook re-prompts a step that is legitimately waiting on a background task; the HALT snippet's `rm` pairs the lock with a glob that zsh's nomatch aborts, leaving the lock in place; and the HALT commit shipped a doubled, mid-line-spliced implementation report because no boundary reads the report back. One task: each is a small mechanism in the resume contract, the detector prompt, the hooks, or a new report-lint.js. A seventh (task.121): after a PreCompact pause the hook removes the lock by design, and a session that continues in place — rather than re-invoking the skill — has no step that puts it back; advance-pipeline-lock.sh is a silent exit-0 no-op without a lock, so the Stop hook and every advance were inert until the run rebuilt the lock from the snapshot by hand. Observations #85, #86, #88, #89, #111, #115, #123."
tags: [develop-task, develop-story, develop-bug, resume, hooks, pipeline, precompact]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-17
updated: 2026-09-19
assignee:
estimated_effort_hours: 9
github_issue: 424
---

# Technical Task: Resume trusts what it finds on disk

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.124.review.1.pipeline-resume-lifecycle-hygiene.md` implemented 2026-09-19
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
`develop-pipeline-on-stop.sh`, `develop-pipeline-hooks.md`, the HALT snippets in the three
orchestrator `SKILL.md` files, the Step 8 completion path, `advance-pipeline-lock.sh` (and
`grant-qa-cycles.sh`, which delegates its restore to it), a new `set-waiting-on.sh` beside
`set-qa-phase.sh`, a new `implementation-report-template.md` extracted from the step-0 doc, and a
new pure `report-lint.js` beside `change-log.js`.

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
Phase 0b     git status --porcelain non-empty → classify EVERY entry, then act on the classified paths only:
               (a) every entry byte-identical to origin/<base> (a `??` entry only if base HAS the path
                   and the content matches)                                      → overlay: discard those paths, record
               (b) only skills/*/references/                                     → npm run bundle -- --check; reconcile
               (c) anything else, or any entry the probe cannot classify         → HALT naming the files
             summary-gap rule: raise only when the report's `Subagent summary ref` for that step names a missing path
Step 8       on success: delete last-halt.json when its task_or_story_directory is this run's (writer owns cleanup);
             detector: refuse a snapshot whose document reads status: accepted or whose PR is merged, and delete it
Lock         waiting_on: {kind: agent|task, label, since, budget_minutes} — written ONLY by set-waiting-on.sh
             (sibling of set-qa-phase.sh): `set-waiting-on.sh "<label>"` at dispatch, `--clear` on result
Stop hook    waiting_on set and younger than budget_minutes → allow the stop with "waiting on {label} since {since}";
             set and older → re-prompt (a crashed step); absent → re-prompt as today
HALT snippet rm -f lock; find .claude/state -name 'test-output-*.log' -delete   (two commands)
report-lint.js  pure: exactly one `# Implementation Report`, each REQUIRED `## ` section once in template order,
                optional sections (Tracker Actions Required) at most once, no `### QA Cycle N` repeated;
                expected sections read from implementation-report-template.md (extracted from step-0, one definition);
                run after every report Edit (Step Transition action 2), before the HALT commit,
                in the PreCompact hook between its append and `git add`, and at Step 8
advance-lock --restore   no lock + snapshot (last-halt.json, else newest .pausing.* — by document, then age)
                         → rebuild the lock at halt_step, strip the pause fields, consume the snapshot
                         lock present → no-op exit 0; neither → exit 1 naming both paths
                         grant-qa-cycles.sh calls --restore instead of its own inline restore (one implementation)
                         <n> with no lock → exit 1 (was silent exit 0), pointing at --restore
                         --skill and --complete with no lock → exit 0 unchanged (standalone sub-skill runs; clearable lock)
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
- **Same-class mechanisms this task must name, not duplicate** (review 2026-09-19, obs #103):
  - `shared/resources/grant-qa-cycles.sh:142-175` (task.123) already restores the lock from
    `last-halt.json` for the QA re-entry grant — refusing another document's snapshot by
    `task_or_story_directory`, stripping `halted_at/halt_reason/halt_step/paused_at/pause_reason`,
    and deliberately **not** consuming the snapshot. `--restore` **replaces** that inline restore:
    grant calls `advance-pipeline-lock.sh --restore` and keeps only its budget logic, so there is
    one document-match check and one consumption policy. Grant's restore test cases move with it.
  - `shared/resources/set-qa-phase.sh` (task.123) is "the ONLY writer of `qa_phase`" — the pattern
    for a non-step lock field. `set-waiting-on.sh` **sits beside** it as the only writer of
    `waiting_on`; the field is not added to `advance-pipeline-lock.sh`, which stays monotonic.
  - `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` already asserts lock field spellings
    across lock, snapshot, writer scripts and docs. `waiting_on` **extends** it; no new contract test.
- **The report template is defined once.** Today both templates (story and task) are fenced blocks
  inside `develop-pipeline-step-0-resolve-and-prepare.md` (§0e) and `## Tracker Actions Required`
  is documented as *omitted when the journal is empty*. This task extracts them to
  `shared/resources/implementation-report-template.md` with an optional-section marker; step-0
  references the file, and `report-lint.js` reads it — so "each section once" cannot refuse a valid
  report for a section the template itself says to omit.
- **`report-lint.js` is pure and CLI-thin**, like `change-log.js` and `registry-tick.js`: the
  pipelines, the PreCompact hook and a test share one reader. The `--json` output carries a
  `reason` field (`ok` | `problems` | `usage`) like its siblings.

## 4. Scope

### In Scope

✅ Resume contract: dirty-tree classification; snapshot refusal; re-entry pointer to task.123.
✅ Detector prompt: evidence-conditioned summary-gap rule.
✅ Step 8 / completion path: snapshot deletion.
✅ Lock schema + Stop hook: `waiting_on`, written by a new `shared/resources/set-waiting-on.sh`
   (sibling of `set-qa-phase.sh`); `develop-pipeline-hooks.md` documents the pattern and
   retires foreground `sleep` advice.
✅ HALT snippets — the three one-argv `rm` sites are `skills/develop-task/SKILL.md`,
   `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md` (none in `shared/resources/`;
   `grep -rn 'test-output-\*'` is the completeness check) — and the resume contract's halt text:
   two-command form.
✅ `shared/resources/implementation-report-template.md` extracted from step-0 §0e (story + task
   variants, optional-section marker); step-0 references it.
✅ `shared/resources/report-lint.js` + test; called after every report Edit (Step Transition
   action 2), before the HALT commit, in the PreCompact hook, and at Step 8.
✅ `advance-pipeline-lock.sh --restore`; `grant-qa-cycles.sh` delegates its restore to it; the pause
   reference and the orchestrators' Phase 0 name `--restore` as the in-session continuation step;
   the compaction-summary instruction points at it.
✅ `npm run bundle`.

### Out of Scope

❌ Re-entry after a QA loop escalation — task.123.
❌ Making the PreCompact hook idempotent — task.120 (merged).
❌ Repairing a corrupt report automatically; the linter refuses, a human repairs.

## 5. Breaking Changes

None. A lock without `waiting_on` reads as not waiting; a report that fails the linter was already
unreadable. `advance-pipeline-lock.sh <n>` with no lock changes from silent exit 0 to exit 1 — a
numeric advance is only ever issued by an orchestrator that believes a pipeline is running, so the
silence hid a bug. **`--skill <name>` and `--complete` keep exit 0 without a lock**: `--skill` is the
self-advance every sub-skill issues as its last action, including the nine that legitimately run
outside any pipeline (a standalone `/review-task` is one), and `--complete` must stay able to clear
a corrupt or absent lock. `grant-qa-cycles.sh`'s behaviour is unchanged from the caller's side; only
its restore moves behind `--restore`.

## 6. Implementation Plan

> Detailed implementation guide: [task.124.plan.pipeline-resume-lifecycle-hygiene.md](task.124.plan.pipeline-resume-lifecycle-hygiene.md)

### Phase 1: Snapshot and tree on resume (#85, #86, #88)

**Risk Level**: Medium

**Files**: `shared/resources/develop-pipeline-resume-contract.md`,
`shared/resources/pipeline-resume-detector-prompt.md`, `shared/resources/develop-pipeline-step-8-commit.md`

**Changes**:
- [x] Phase 0b dirty-tree probe with the three classifications and their actions. **Classify every
      `git status --porcelain` entry before acting, and act only on the classified paths**:
      `git checkout HEAD -- <paths>` for tracked overlay entries (index and worktree — the bare
      index-restoring form leaves a staged overlay in place, QA cycle 1 CR-4), `git clean -f --
      <paths>` for untracked ones — never `git checkout -- .` or a directory-wide `git clean` — and
      a porcelain re-read of the discarded paths before the success line. A `??` entry is
      identical-to-base only when `git cat-file -e "$BASE_REF:$p"` succeeds **and** the content
      matches (`git diff <commit> -- <path>` never reports an untracked path, so the tracked-file
      test alone passes every untracked file). Any entry the probe cannot classify → (c) HALT.
- [x] Summary-gap rule conditioned on the report's `Subagent summary ref` column.
- [x] Step 8 success path deletes `last-halt.json` when its `task_or_story_directory` (canonicalised,
      as `grant-qa-cycles.sh:161` compares it) is this run's; detector refuses and deletes a stale one.
- [x] Replay fixtures: overlay resume (including an untracked file base does not have → HALT);
      healthy resume with no step-3 summary; stale snapshot after merge.

**Dependencies**: none.

### Phase 2: Waiting vs stalling, and the HALT rm (#89, #111)

**Risk Level**: Low

**Files**: `shared/resources/set-waiting-on.sh` (new) + `set-waiting-on.test.sh` (new — list it in
`package.json` `test` by hand; the shell tests are named individually, not globbed),
`shared/resources/develop-pipeline-on-stop.sh`, `shared/resources/develop-pipeline-hooks.md`,
the lock schema in the resume contract, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`,
every dispatch site, and the three HALT snippets.

**Dispatch sites** — enumerated by grep (`subagent_type=`, `dispatch an Explore subagent`,
`run_in_background`, `gh pr checks --watch`) over `shared/resources/develop-pipeline-step-*.md`,
`skills/develop-*/SKILL.md`, `skills/develop-bug/references/*.md` and the sub-skills the loop invokes
(`qa-task`, `review-pr`, `finalise`), not by hand. At review time (2026-09-19) that is — `kind: agent`:
Step 3 ×3 (`develop-pipeline-step-3-develop-loop.md:20` codebase map, `:113`/`:130` loop audit,
`:228` triage), Step 5 ×2 (`develop-pipeline-step-5-6-qa-loop.md:187`, `:243` traceability mapper),
5c (`skills/review-pr/SKILL.md:265`, two lenses), Step 7 (`skills/finalise/SKILL.md:337`, four
parallel Explore agents); `kind: task`: Step 7's CI poll (`skills/finalise/SKILL.md:1226`,
`gh pr checks --watch` as a background job). The plan's "qa-task 3b reviewer" and the develop-bug
verify loop have no dispatch of their own. **Phase 0a's resume detector is exempt** — no lock exists
while it runs. Re-run the grep before implementing; list the result in the implementation report.

**Changes**:
- [x] `waiting_on: {kind, label, since, budget_minutes}` in the lock schema. **One writer**:
      `set-waiting-on.sh "<label>"` at dispatch (reads `subagents.wallClockMinutes` once and stores
      it as `budget_minutes`, so the hook needs no config read; `--budget-minutes N` for a wait whose
      own bound the caller knows, e.g. the finalise CI poll — QA cycle 1, CR-2), `set-waiting-on.sh
      --clear` when the result is read. Mirrors `set-qa-phase.sh`: never touches `current_step`; exit 0 no-op
      without a lock. Add `waiting_on` to `qa-loop-lock-fields-parity.test.mjs`.
- [x] Stop hook allows the stop when set and `since` + `budget_minutes` is in the future; hook test
      covers set / cleared / stale (older than budget → re-prompt, a crashed step).
- [x] HALT snippets at `skills/develop-task/SKILL.md:279`, `skills/develop-story/SKILL.md:292`,
      `skills/develop-bug/SKILL.md:288` (line numbers as of 2026-09-19; the grep is the check):
      `rm -f "$LOCK"` then `find … -delete`. Also the glob-only `rm` at
      `develop-pipeline-step-8-commit.md:77` while in the area. Test: extract each fenced snippet
      with `shared/resources/qa-execute-snippets.mjs` and run it in **bash and zsh** with an empty
      glob — lock removed in both. (`lint:shell` lints `.sh` sources only and never sees a fence.)

**Dispatch sites at implementation (2026-09-19, grep re-run)** — `kind: agent`: `develop-pipeline-step-3-develop-loop.md` ×4 (codebase map; story and task loop audits; test triage), `develop-pipeline-resume-contract.md` ×1 (initial loop audit), `develop-pipeline-step-5-6-qa-loop.md` ×2 (story and task traceability mappers), `skills/review-pr/SKILL.md` ×1 (two lenses, one dispatch), `skills/finalise/SKILL.md` ×1 (four DoD agents, one dispatch); `kind: task`: `skills/finalise/SKILL.md` CI poll (reading 2). `qa-story/SKILL.md:566` dispatches inside `/qa-story` itself and marks no wait — it is not in the loop's dispatch list and runs standalone as often as not. Every site is pinned by `qa-loop-lock-fields-parity.test.mjs` (a dispatch line without `set-waiting-on.sh` within 12 lines is red).

**Dependencies**: none.

### Phase 3: report-lint.js (#115)

**Risk Level**: Low

**Files**: `shared/resources/implementation-report-template.md` (new — extracted from
`develop-pipeline-step-0-resolve-and-prepare.md` §0e, which then references it),
`shared/resources/report-lint.js` (new), `shared/resources/tests/report-lint.test.mjs` (new),
the Step Transition Protocol in the three orchestrator `SKILL.md` files (action 2), the HALT rule
("Commit the report before any halt") in the same three files, `develop-pipeline-on-precompact.sh`,
`develop-pipeline-step-8-commit.md`

**Changes**:
- [x] Extract the story and task report templates into `implementation-report-template.md`, one
      file, two variants, with a marker on `## Tracker Actions Required` that names it **optional**
      (the template already says "omit this section entirely when the journal is empty"). Step-0 §0e
      points at the file instead of inlining. This is the one definition of "what sections a report
      has"; the linter does not restate it.
- [x] Pure `lintReport(text, template) → { ok, problems[] }`: one H1; each required template `## `
      exactly once, optional ones at most once, all in template order; no repeated `### QA Cycle N`;
      no second `**Task**:`/`**Story**:` header block; no text after the final section that repeats
      an earlier heading. Fence-aware via `change-log.js`'s exported `fencedRanges`. Codes:
      `multiple-h1`, `section-missing`, `section-duplicated`, `section-out-of-order`,
      `qa-cycle-duplicated`, `header-block-duplicated`, `trailing-duplicate-body`.
- [x] CLI: `report-lint.js --file <report> --json`, `reason: ok | problems | usage`, exit 1 on problems.
- [x] Call sites (four, all named): **(1)** Step Transition Protocol action 2 — lint right after the
      report Edit, HALT on failure with nothing committed (the protocol edits; it does not commit);
      **(2)** the HALT rule — lint before "commit the report before any halt"; **(3)**
      `develop-pipeline-on-precompact.sh` between its append (`:189`) and `git add` (`:192`); **(4)**
      Step 8 before the terminal commit. Each: `command node …/report-lint.js --file "$REPORT" --json || { echo "HALT: report failed lint"; exit 1; }`.
- [x] Test: the task.117 corrupt report (`329b4a65`, 366 lines) as a fixture. It has **one** H1 —
      the duplicate begins at its `**Task**:` header block (line 218) and repeats seven `## `
      sections (226–358) — so the assertion names the codes: `section-duplicated` ×7,
      `section-out-of-order`, `header-block-duplicated`; `multiple-h1` does **not** fire, and
      `section-missing` does **not** fire for the omitted `Tracker Actions Required`. Green fixtures:
      the five most recent accepted reports (a report with a fenced example containing
      `# Implementation Report` among them).

**Dependencies**: none.

### Phase 4: Lock restore for an in-session continuation (#123)

**Risk Level**: Low

**Files**: `shared/resources/advance-pipeline-lock.sh` + `advance-pipeline-lock.test.sh`,
`shared/resources/grant-qa-cycles.sh` + `grant-qa-cycles.test.sh`, `develop-pipeline-pause.md`,
`develop-pipeline-resume-contract.md`, the orchestrators' Phase 0 (`develop-task` / `develop-story` /
`develop-bug` SKILL.md), `evals/shared/tests/` hook/lock tests

**Same-class inventory**: `grant-qa-cycles.sh:142-175` already restores the lock from `last-halt.json`
(task.123) — document match by `task_or_story_directory`, halt/pause fields stripped, snapshot **not**
consumed. `--restore` **replaces** it: grant calls `advance-pipeline-lock.sh --restore` and keeps
only its budget logic. One restore, one document-match check, one consumption policy.

**Changes**:
- [x] `--restore`: rebuild from `last-halt.json` or the newest `.pausing.*` claim (choose by
      document, then age — the detector's rule); refuse a snapshot for another document (grant's
      check, moved here); strip `halted_at` / `halt_reason` / `halt_step` / `paused_at` /
      `pause_reason`; keep `current_step`; delete the source. Rewrite the header's Behaviour block —
      it currently documents "No lock file → exit 0, silent noop" as the contract.
- [x] `grant-qa-cycles.sh` step 3 ("Restore the lock from the halt snapshot") becomes a call to
      `--restore`; its refusal-leaves-nothing-behind rule (task.123 CR-1) is preserved by calling
      `--restore` only after the budget check passes. Its restore test cases move to
      `advance-pipeline-lock.test.sh`; its own tests keep the budget cases.
- [x] `<n>` with no lock → exit 1 with a message naming `--restore`. **`--skill` and `--complete`
      stay exit 0** (standalone sub-skill runs; clearable lock) — state it in the header and test it.
- [x] Pause reference + Phase 0: "continuing in the same session after a pause → `--restore` first";
      the PreCompact hook's summary instruction says the same.
- [x] Tests: no lock + snapshot → lock at halt_step, snapshot gone; lock present → no-op; neither →
      exit 1; snapshot for another document → exit 1, nothing written; `<n>` with no lock → exit 1;
      `--skill` and `--complete` with no lock → exit 0; grant after a HALT still restores (via
      `--restore`) and records the grant.

**Dependencies**: none (shares files with Phase 1's snapshot cleanup; land Phase 1 first).

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-resume-contract.md`
2. ✅ `shared/resources/pipeline-resume-detector-prompt.md`
3. ✅ `shared/resources/develop-pipeline-step-8-commit.md`
4. ✅ `shared/resources/develop-pipeline-on-stop.sh`, `develop-pipeline-hooks.md`, `develop-pipeline-on-precompact.sh`
5. ✅ `shared/resources/advance-pipeline-lock.sh`, `shared/resources/grant-qa-cycles.sh`, `develop-pipeline-pause.md`, the three orchestrators' Phase 0
6. ✅ Dispatch sites (Phase 2 list): `develop-pipeline-step-3-develop-loop.md`, `develop-pipeline-step-5-6-qa-loop.md`, `skills/review-pr/SKILL.md`, `skills/finalise/SKILL.md`
6a. ✅ HALT snippets + Step Transition Protocol + HALT rule: `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`
6b. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0e — references the extracted template

### Files to Create

7. ✅ `shared/resources/report-lint.js`
7a. ✅ `shared/resources/implementation-report-template.md`
7b. ✅ `shared/resources/set-waiting-on.sh`

### Files to Modify (Tests)

8. ✅ `shared/resources/tests/report-lint.test.mjs` (new) + `shared/resources/tests/fixtures/report-lint/`, `shared/resources/set-waiting-on.test.sh` (new — add to `package.json` `test`), `advance-pipeline-lock.test.sh`, `grant-qa-cycles.test.sh`, `develop-pipeline-on-stop.test.sh`, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, replay fixtures under `evals/develop-task/step-isolation/`

### Files to Modify (Documentation)

9. ✅ `docs/reference/anti-patterns.md` — "never put the lock and a glob in one `rm` argv"; `docs/contributing/traps.md` — zsh nomatch
10. ✅ `skills/*/references/` — regenerated

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests
- [x] `report-lint.js`: corrupt fixture → `section-duplicated` ×7, `section-out-of-order`, `header-block-duplicated`, and neither `multiple-h1` nor `section-missing`; five accepted reports → ok; a report with a fenced example containing `# Implementation Report` → ok (fence-aware, reuse `change-log.js`'s `fencedRanges`); a report omitting `Tracker Actions Required` → ok.
- [x] `set-waiting-on.sh`: set writes the four fields; `--clear` removes them; no lock → exit 0 no-op; never changes `current_step`.
- [x] Stop hook: `waiting_on` set → exit 0 with the waiting line; cleared → re-prompt; older than `budget_minutes` → re-prompt.
- [x] `advance-pipeline-lock.sh --restore`: the cases in Phase 4; `<n>` with no lock exits 1; `--skill`/`--complete` with no lock exit 0; `grant-qa-cycles.sh` after a HALT restores via `--restore`.

**Command**: `npm test` (new `*.test.sh` files must be added to the `test` script by hand — it lists shell tests individually)

### Integration Tests
- [x] Replay fixtures for the Phase 1 cases (overlay discarded; untracked non-base file → HALT; healthy resume with no step-3 summary; stale snapshot after merge).
- [x] The three HALT snippets extracted with `qa-execute-snippets.mjs`, run in bash and zsh with an empty glob: lock removed in both.

### Contract Tests
- [x] `qa-loop-lock-fields-parity.test.mjs` extended with `waiting_on` — lock schema (resume contract), `set-waiting-on.sh`, the Stop hook and `develop-pipeline-hooks.md` agree on the spelling.
- [x] `report-lint.js` and step-0 §0e read the same `implementation-report-template.md` (one definition; a test asserts step-0 no longer inlines a template).

### Performance Tests
Not applicable.

### Consumer Tests
- [x] Next pipeline run that halts and resumes: no stale snapshot after merge; no re-prompt while a reviewer is running.

## 9. Success Criteria

### Functional
- [x] A dirty tree on resume is classified and recorded; an overlay never reaches `git add`.
- [x] A healthy resume with no step-3 summary is not blocked.
- [x] No `last-halt.json` survives a completed run for the same work item.
- [x] The Stop hook does not re-prompt a step with `waiting_on` set.
- [x] A HALT removes the lock in bash and zsh with an empty glob.
- [x] A structurally invalid report cannot be committed by the pipeline.
- [x] An in-session continuation after a PreCompact pause restores the lock with one documented command; advancing with no lock is an error, not silence.

### Performance
- [x] The tree probe adds one `git status --porcelain` and, for (a), one `git diff --stat` against the base.

### Code Quality
- [x] `report-lint.js` is pure with a thin CLI; one reader for all call sites.
- [x] Every mechanism has a mutation proof recorded.

### Migration
- [x] Observations #85, #86, #88, #89, #111, #115, #123 close naming the PR.

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
- **Critical**: a HALT that leaves the lock; a resume that discards non-overlay work; `grant-qa-cycles.sh` refusing a grant it accepted before (its restore now runs through `--restore`, so a `--restore` regression also breaks QA re-entry).
- **Non-critical**: message wording, anti-pattern text.

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-19
**Quality Score**: 70/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.124.qa.2.pipeline-resume-lifecycle-hygiene.md](./task.124.qa.2.pipeline-resume-lifecycle-hygiene.md)
- **Gate File**: [task.124.gate.2.pipeline-resume-lifecycle-hygiene.yml](./task.124.gate.2.pipeline-resume-lifecycle-hygiene.yml)

### Test Coverage Summary
- **Tests Executed**: 3512 (fast gate) + 16 replay scenarios + GNU-coreutils container suites
- **Phases Verified**: 4/4
- **Critical Issues**: 2 (HIGH) + 2 MEDIUM
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
- Cycle-1 CR-1..CR-4 verified FIXED by reproduction.
- CR-1 (HIGH, cycle 2): the stale-snapshot rule deletes a live post-acceptance snapshot ([bug 5](./task.124.bug.5.stale-snapshot-rule-fires-on-accepted.md)).
- CR-2 (HIGH): the re-invocation resume path never restores the lock ([bug 6](./task.124.bug.6.reinvocation-resume-never-restores-lock.md)).
- CR-3/CR-4 (MEDIUM): stale `waiting_on` through a restore ([bug 7](./task.124.bug.7.restore-carries-stale-waiting-on.md)); porcelain parsing of renames/quoted paths ([bug 8](./task.124.bug.8.probe-mishandles-renames-and-quoted-paths.md)).

## Bug Reports

### In QA Verification

- [Bug 124.1: `--restore` picks the wrong candidate on GNU coreutils](./task.124.bug.1.restore-mtime-gnu-stat.md) - ✅ Closed - Severity: HIGH (Fixed 2026-09-19)
- [Bug 124.2: finalise CI-poll wait budget shorter than the poll](./task.124.bug.2.ci-poll-wait-outlives-budget.md) - ✅ Closed - Severity: MEDIUM (Fixed 2026-09-19)
- [Bug 124.3: dispatch population hand-listed; QA-skill dispatches unmarked](./task.124.bug.3.dispatch-population-hand-listed.md) - ✅ Closed - Severity: MEDIUM (Fixed 2026-09-19)
- [Bug 124.4: staged overlay entry survives the probe](./task.124.bug.4.staged-overlay-not-discarded.md) - ✅ Closed - Severity: MEDIUM (Fixed 2026-09-19)

- [Bug 124.5: stale-snapshot rule fires on `status: accepted`](./task.124.bug.5.stale-snapshot-rule-fires-on-accepted.md) - ✅ Ready for QA - Severity: HIGH (Fixed 2026-09-19)
- [Bug 124.6: re-invocation resume never restores the lock](./task.124.bug.6.reinvocation-resume-never-restores-lock.md) - ✅ Ready for QA - Severity: HIGH (Fixed 2026-09-19)
- [Bug 124.7: `--restore` carries a stale `waiting_on`](./task.124.bug.7.restore-carries-stale-waiting-on.md) - ✅ Ready for QA - Severity: MEDIUM (Fixed 2026-09-19)
- [Bug 124.8: probe mis-parses renames and quoted paths](./task.124.bug.8.probe-mishandles-renames-and-quoted-paths.md) - ✅ Ready for QA - Severity: MEDIUM (Fixed 2026-09-19)

### Closed Bugs

- Bugs 124.1–124.4 — verified FIXED in QA cycle 2 (2026-09-19)

## Change Log
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-17 | 1.0 | Initial draft — observation review 2026-09-17 (obs #85, #86, #88, #89, #111, #115) | create-task |
| 2026-09-18 | 1.1 | Phase 4 added — `advance-pipeline-lock.sh --restore` for an in-session continuation after a PreCompact pause (obs #123, task.121); effort 8h → 9h | observe-work |
| 2026-09-19 | 1.2 | Review 1 (7/10, NEEDS REVISION → fixes applied): `--restore` replaces `grant-qa-cycles.sh`'s inline restore; `set-waiting-on.sh` is the one `waiting_on` writer; report template extracted to `implementation-report-template.md` with `Tracker Actions Required` optional; lint runs after every report Edit and at each commit site; overlay discard path-scoped with a `??` check; `--skill`/`--complete` keep exit 0; dispatch sites and HALT `rm` locations corrected from grep | review-task |
| 2026-09-19 |  | Status → ready-for-development | review-task |
| 2026-09-19 |  | Implemented — 4 phases; 3 new engines (report-lint.js, set-waiting-on.sh, advance-pipeline-lock.sh --restore) + implementation-report-template.md; 7 shell/JS suites extended (+81 assertions), 4 replay fixtures; docs swept | develop |
| 2026-09-19 |  | QA gate FAIL (70/100) — 1 HIGH (CR-1 GNU stat), 3 MEDIUM (CR-2..CR-4), 3 LOW; 4 bug reports | qa-task |
| 2026-09-19 |  | QA gate 2 FAIL (70/100) — cycle-1 findings verified fixed; refute pass: 2 HIGH (CR-1 accepted≠finished, CR-2 re-invocation never restores), 2 MEDIUM; bugs 5–8 | qa-task |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: snapshot and tree on resume
- [x] Phase 2: waiting_on + HALT rm
- [x] Phase 3: report-lint.js
- [x] Phase 4: lock restore
- [ ] QA: `task.124.qa.[N].pipeline-resume-lifecycle-hygiene.md`
- [ ] Gate: `task.124.gate.[N].pipeline-resume-lifecycle-hygiene.yml`

## References

- Observations #85, #86, #88, #89, #111, #115, #123; #101 (task.120, merged — the PreCompact double-append)
- `shared/resources/develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-hooks.md`
- task.117's HALT commit `329b4a65` — the corrupt-report fixture
- task.123 — re-entry after a QA loop escalation (sibling; independent)

## Notes

Bugs found during QA land at `task.124.bug.[N].[name].md` in this directory.
