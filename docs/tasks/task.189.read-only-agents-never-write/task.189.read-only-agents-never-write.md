---
id: task.189
title: "Read-only agents never write"
type: task
description: "No pipeline prompt asks a read-only Explore subagent to write: the QA traceability mapper returns its matrix and the orchestrator writes it; the finalise DoD security agent returns a probe plan and the orchestrator runs the engine with --record; the DoD docs agent runs no generator; and a guard test keeps every Explore-dispatched prompt free of write instructions."
tags: [develop-task, develop-story, finalise, observation, subagents, explore]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-07
updated: 2026-10-16
assignee:
estimated_effort_hours: 16
github_issue: 588
---

# Technical Task: Read-only agents never write

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.189.review.1.read-only-agents-never-write.md` implemented 2026-10-16
**GitHub Issue**: [#588](https://github.com/Gamaroff/agent-skills/issues/588)

---

## 1. Overview

Two pipeline steps dispatch an Explore subagent, which is read-only, and then tell it to write a
file. The QA traceability mapper is told to "Write the matrix file"; the finalise DoD security
agent is told to run `security-probe.mjs … --record <file>`. Both refuse, and each run completes only
because the orchestrator notices and does the write itself. Seven recurrences are logged (obs #191,
#218). This task makes the dispatching step the only writer: the mapper returns its matrix, the
security agent returns a probe plan, the orchestrator writes and runs, and a guard test stops any
Explore-dispatched prompt from asking for a write again.

**Scope**: the mapper prompt and its two dispatch sites in the Steps 5–6 QA-loop doc; the finalise
DoD security prompt and finalise Steps 3–5; the finalise DoD docs prompt; one new guard test; a
CHANGELOG entry.

**Key deliverables**:

1. The mapper returns the matrix between markers; the step doc writes
   `.summaries/qa-traceability-matrix.md` from the reply, and its fallback never discards a returned
   matrix.
2. The security agent returns `probe_plan[]`; finalise runs each entry with `--record` and fills
   `probes_executed` / `probes[]` from the records. This **replaces** the obs #10 fallback, which runs
   the agent's `probe_command` only when the record is absent: the run becomes unconditional.
3. `tests/explore-prompts-no-write.test.js`: no prompt dispatched to an Explore subagent instructs a
   write.

---

## 2. Motivation

### Current Problems

1. **The mapper is told to write and cannot** (obs #191). The Steps 5–6 doc dispatches it as
   `Agent(subagent_type="Explore", …)` with "Write the matrix file and return a one-line
   confirmation". Recurred on task.148, task.159, task.160 (twice), task.151, task.176 and task.170.
   Each time the mapper returned the matrix inline and the orchestrator wrote it by hand.
2. **The fallback would discard completed work** (obs #191). "If the subagent fails or the matrix
   file is absent: log warning in Issues Log and proceed without the matrix" drops a matrix that the
   mapper did produce, inline.
3. **The DoD security agent is told to write a run record** (obs #218). Its probe mode runs
   `security-probe.mjs … --record <STORY_DIR>/<stem>.dod.security.run.json`. On task.158 it could not,
   returned `probe mode executed no candidates` (FAIL), and the orchestrator ran the engine instead.
   That FAIL reads as a finding about the work when it is a finding about the dispatch.
4. **"Read-only" is an instruction, not a property** (obs #218). On task.170 the read-only DoD docs
   agent ran `npm run generate-catalog`, a writer, to check whether the catalog was stale. It changed
   nothing that time.

### Benefits

- No run depends on the orchestrator noticing a refused write.
- No false `probe mode executed no candidates` FAIL caused by the dispatch type.
- The probe count comes from the engine's record, written by the step that can write it.
- One test keeps the property for every Explore-dispatched prompt, including new ones.

---

## 3. Technical Background

### Current Architecture

Line numbers are from `develop` at `47da7406`, paired with the text they point at.

- **Mapper dispatch, story** (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:192`,
  `Agent(subagent_type="Explore", prompt="Run the QA traceability mapper …`), whose prompt ends
  "Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation."
  The next steps: "1. Confirm `{story-directory}/.summaries/qa-traceability-matrix.md` was written."
  and the fallback "If the subagent fails or the matrix file is absent: log warning in Issues Log and
  proceed without the matrix".
- **Mapper dispatch, task** (`:248`), same shape with `{task-file}` / `{task-directory}`.
- **Mapper prompt** (`shared/resources/qa-traceability-mapper-prompt.md`): `:46` "Pass the following
  prompt to an Explore subagent"; `:54` "Write the matrix file and return a one-line confirmation";
  `### Step 6 — Ensure output directory exists and write matrix` (`:143`) runs `mkdir -p` and writes
  the table; `### Step 7 — Return confirmation` (`:151`) returns "Matrix written to …". Step 5
  writes `.summaries/step-5-traceability-mapper.json` from the orchestrator side (`:65`).
- **Finalise DoD dispatch** (`skills/finalise/SKILL.md:441`, `### Steps 3–5: Parallel DoD Checks (4
  Explore Subagents)`; `:470`, `#### Step 3b: Dispatch 4 Explore Subagents in Parallel`): agent 2 is
  `references/finalise-dod-security-prompt.md`.
- **Security prompt probe mode** (`shared/resources/finalise-dod-security-prompt.md`): step 3
  "**3. Execute them.** Run the probe engine … with `--record`", and five command blocks carrying
  `--record <STORY_DIR>/<stem>.dod.security.run.json` (`:181`, `:191`, `:200`, `:215`, `:231`). The
  agent's YAML carries `boundary:`, `probes_executed:` ("the record's `totals.executed`, copied,
  never composed", `:244`) and `probes:`. finalise renders them at `:610` and applies the zero-guard
  at `:618`.
- **The obs #10 fallback, landed after this task was cut** (re-measured on `develop` at `b996b1de`).
  The security prompt now also returns `probe_command:` and `probe_cases:` ("Return the command
  whether or not you ran it.", `finalise-dod-security-prompt.md:184`), and its Step 4.2
  (`:167–177`) tells the agent to write a cases file to
  `<STORY_DIR>/<stem>.dod.<DOD_N>.security.cases.json`, or both files to `$TMPDIR`. finalise has a
  block "**When the record is still absent, `/finalise` runs the probe itself (obs #10)**"
  (`skills/finalise/SKILL.md:513–537`), run "Before Step 3c": it writes `probe_cases`, forces the
  `--record` path into the work-item directory, runs `probe_command`, sets `probes_executed` from
  `totals.executed`, rebuilds `probes[]` with no `severity`, and lets a zero from its own run take
  the zero-guard. Record and cases paths carry `<DOD_N>` (obs #302) and live beside each other in the
  work-item directory, never a temp file (obs #299). The finalise and prompt line numbers quoted
  above from `47da7406` have drifted (finalise `:441` → `:446`, `:470` → `:487`; the prompt now has
  seven `--record` blocks); Phase 2 re-measures them with `git grep -n -- '--record'`.
- **The engine's record** (`shared/resources/security-probe.mjs`): `runProbeSpec` returns `{sink,
  entry, verdict, reason, executed, passed, reproduced, overblocked, declined, cases}` (`:871`); the
  record's `totals.executed` is what `probes_executed` copies.
- **Docs agent** (`shared/resources/finalise-dod-docs-prompt.md:55`): "If a skill was modified, is the
  skill catalog regenerated (check for `npm run generate-catalog` in the task or PR)?" `package.json`
  `generate-catalog` has no check mode (`python3 skills/create-skill/scripts/generate_catalog.py`).
- **The Explore population** (`git grep -nE 'subagent_type[=:] *"?Explore' -- 'shared/resources/*.md'
  'skills/*/SKILL.md'`, 24 hits on `47da7406`). The test re-measures it; the figure is not restated
  here as a contract.

### Target Architecture

- **Mapper returns, step writes.** The prompt's Step 6 builds the table and Step 7 returns it between
  `<!-- matrix-start -->` / `<!-- matrix-end -->` markers with an `N ACs mapped` line; no `mkdir`, no
  write. Both dispatch sites say "return the matrix"; the step doc then extracts the marked block and
  writes `{dir}/.summaries/qa-traceability-matrix.md` (a fenced block an agent runs). The fallback
  becomes: "no marked block in the reply → warn and proceed without the matrix". A reply with a
  matrix is never discarded.
- **Security agent plans, orchestrator runs.** The prompt's probe mode stops at choosing the entry,
  sink and cases. It returns `boundary:` and a `probe_plan:` list. Each entry is the engine's argv
  without `--record` (`--sink`, `--entry`, optional `--argv`, `--cases-file`), as a JSON object; a
  corpus that does not fit is returned inline as the entry's `cases:`, never written by the agent.
  After the four agents return, a new finalise **Step 3b.1 — Run the security probe plan** (between
  Step 3b and the existing Step 3c, which keeps its name) runs each plan entry with `--repo-root
  "$(git rev-parse --show-toplevel)"` and `--record` under the work-item directory: every entry
  records into the one `<stem>.dod.<DOD_N>.security.run.json` (the engine folds each control into it
  and keeps `totals.executed` across them — *decided at develop, 2026-10-16*, replacing review 1's
  per-entry record files, which the engine's own record design makes unnecessary). Cases go to
  `<stem>.dod.<DOD_N>.security.cases.json` for a one-entry plan and `…security.cases.<i>.json` for
  entry `i` of several. The runner is `shared/resources/security-probe-plan.mjs` (bundled into
  finalise), so the argument array is built in JavaScript, never through a shell expansion.
  The argument list is built from the JSON entry into an array, never through an unquoted expansion:
  `fence:<doc>#<heading text>` and an `--argv` template carry spaces inside one argument. Step 3b.1
  **replaces** the obs #10 block and carries its rules: the record path is forced into the work-item
  directory, the count is the record's `totals.executed`, a rebuilt probe carries no `severity`, and
  a zero from finalise's own run still takes the zero-guard. It sets `probes_executed` to the sum of
  the records' `totals.executed` and `probes[]` to their reproduced cases. The existing render (`:610`) and
  zero-guard (`:618`) read those fields unchanged. A plan entry the engine refuses (exit 2) is
  recorded as an engine refusal with its `reason`, never as executed. The agent no longer emits
  `probes_executed`, `probe_command` or `probe_cases`.
- **Docs agent runs no generator.** `:55` becomes: judge from the PR diff — a `SKILL.md` frontmatter
  change with no `docs/reference/skill-catalog.md` change in the same diff is the gap. Never run
  `npm run generate-catalog` or any writer to find out.
- **Guard test** `tests/explore-prompts-no-write.test.js`. Population: every `shared/resources/*.md`
  prompt file that a dispatch line with `subagent_type="Explore"` names, plus every prompt file
  whose own text says it is dispatched to an Explore subagent, plus (C) the quoted `prompt="…"` body of
  every inline `Agent(subagent_type="Explore", prompt="…")` dispatch in those files (the two mapper
  sites carry their dispatch text inline, not in a prompt file). Assertion: none contains a write
  instruction. That means "write the … file", "write it to", "write both …", `--record`, `mkdir`, or
  a shell redirect into a path (`> {`, `> <`, `> "`, `> $`, and the `>>` forms), outside a region the
  prompt marks as run by the caller with `<!-- caller-runs -->` … `<!-- /caller-runs -->`. The
  `code-review-prompt.md` § "Scoping (caller responsibility …)" section (`git diff … > <DIFF_FILE>`,
  `:213–218`) is caller-run by its own heading, so it gains the marker; the marker, not a gap in the
  redirect pattern, is what passes it. Non-vacuity floor: the population includes the mapper, the
  four finalise DoD prompts, both review pre-pass prompt files, and both inline mapper dispatches.

### Important Clarifications

- This changes no subagent type. Explore stays the dispatch type for all four DoD agents and the
  mapper; the contract moves to match it.
- `review-security` runs `security-review-prompt.md` inline, not as an Explore dispatch, so its
  `--record` (`security-review-prompt.md:151`) is in scope of no change here.

---

## 4. Scope

### In Scope

✅ `shared/resources/qa-traceability-mapper-prompt.md` and both mapper sites in
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`.
✅ `shared/resources/finalise-dod-security-prompt.md` probe mode, and `skills/finalise/SKILL.md`
Steps 3b–3c.
✅ `shared/resources/finalise-dod-docs-prompt.md` catalog check.
✅ `tests/explore-prompts-no-write.test.js` (new); CHANGELOG.

### Out of Scope

❌ Changing any subagent type.
❌ `review-security`'s inline probe run.
❌ A `--check` mode for `generate_catalog.py` (would let the docs agent verify by running; a
separate change).

---

## 5. Breaking Changes

### Breaking Change 1: the security agent's YAML no longer carries `probes_executed`

- **Before**: agent 2 runs the engine and reports `probes_executed` and `probes[]`.
- **After**: agent 2 reports `boundary` and `probe_plan[]` (no `probes_executed`, `probe_command` or
  `probe_cases`); finalise Step 3b.1 fills `probes_executed` and `probes[]` from the engine records
  before rendering.
- **Affected**: finalise's render and zero-guard (unchanged, they read the filled fields) and any
  consumer that dispatches `finalise-dod-security-prompt.md` itself. A repo grep on `47da7406`
  finds finalise as the only dispatcher. qa-task Step 3b and qa-story Phase 1.6 cite the prompt's
  Step 1b (the boundary rule) by name, so Step 1b keeps its heading and content.
- **Migration**: none for consumers of `/finalise`. A custom dispatcher of the prompt must run
  Step 3b.1's block after the agent returns.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.189.plan.read-only-agents-never-write.md](task.189.plan.read-only-agents-never-write.md)

### Phase 1: Mapper returns, the step writes (obs #191)

**Risk**: Low. **Files**: `shared/resources/qa-traceability-mapper-prompt.md`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`.

- [x] Prompt Steps 6–7: build and return the matrix between markers; drop the write and `mkdir`.
- [x] Both dispatch sites: "return the matrix" in the dispatch text; a fenced block extracts the
  marked block and writes the file.
- [x] Fallback: warn only when the reply has no marked block.
- [x] The wait marker at both sites clears "once its reply is read" (was "confirmation").
- [x] `npm run bundle`.

### Phase 2: Security agent plans, finalise runs (obs #218)

**Risk**: Medium (the zero-guard's input changes source). **Files**:
`shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`. **Depends on**: none.

- [x] Prompt probe mode: return `probe_plan[]` (engine argv without `--record`, as a JSON object;
  cases inline as `cases:`); remove the `--record` command blocks, the instruction to emit
  `probes_executed`, `probe_command` and `probe_cases`, and Step 4.2's cases-file write
  instructions ("write it to …", "write both the cases file and the record to `$TMPDIR`").
- [x] Output schema: `probe_plan` documented; `probes_executed` / `probes[]` documented as filled by
  finalise.
- [x] finalise Step 3b.1 (replacing the obs #10 "`/finalise` runs the probe itself" block, before
  Step 3c): write each entry's inline cases beside its record, run each entry with `--repo-root` and
  `--record` (paths per § 3, `<DOD_N>`-numbered, in the work-item directory; argv built as an array
  from the JSON entry), sum `totals.executed`, collect reproduced cases with no `severity`, record
  engine refusals with their `reason`; a zero still takes the zero-guard.
- [x] Tests pinning the removed literals (`git grep -nE 'probe_command|probe_cases' -- evals/ tests/
  shared/resources/tests/ 'skills/*/tests/'`): rewrite
  `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` "the probe run falls to /finalise when
  the agent cannot execute it (obs #10)" to the new contract (prompt returns `probe_plan:`; Step 3b.1
  runs it unconditionally; the four carried rules stay asserted), and keep
  `evals/shared/tests/probes-executed-population.test.mjs` green — every `probes_executed` site keeps
  `totals.executed` / `--record` / `*.run.json` within its ±5-line window.
- [x] The render and zero-guard stay as they are; confirm they read the filled fields.
- [x] Step 1b (the boundary rule, cited by qa-task Step 3b and qa-story Phase 1.6) keeps its
  heading and wording; only step 3 onward changes.

### Phase 3: Docs agent runs no generator (obs #218)

**Risk**: Low. **Files**: `shared/resources/finalise-dod-docs-prompt.md`.

- [x] Replace the catalog question with the diff-based rule and a "never run a writer" line.

### Phase 4: Guard test and changelog

**Risk**: Low. **Files**: `tests/explore-prompts-no-write.test.js` (new), `CHANGELOG.md`.
**Depends on**: Phases 1–3.

- [x] Population from the dispatch grep, self-declared Explore prompts and inline dispatch bodies;
  floor as § 3.
- [x] `<!-- caller-runs -->` marker around `code-review-prompt.md` § Scoping.
- [x] Assertion: no write instruction outside a caller-run block; failure names file and line.
- [x] Mutation proof: restore "Write the matrix file" in a copy of the mapper prompt → red.
- [x] CHANGELOG `[Unreleased]` › Fixed entry citing obs #191 and #218.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-traceability-mapper-prompt.md`
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
3. ✅ `shared/resources/finalise-dod-security-prompt.md`
4. ✅ `shared/resources/finalise-dod-docs-prompt.md`
5. ✅ `skills/finalise/SKILL.md` — new Step 3b.1 replacing the obs #10 fallback block.
6. ✅ `shared/resources/code-review-prompt.md` — caller-runs marker around § Scoping.
7. ✅ `shared/resources/security-probe-plan.mjs` — new; the Step 3b.1 runner (argv array, cases
   files, one record, refusals, `probes_executed` from `totals.executed`). Added at develop: the
   argument array and the id → input lookup for `probes[]` (the engine's `cases[]` carries no
   `input`) do not fit a fenced shell block.

### Files to Modify (Tests)

8. ✅ `tests/explore-prompts-no-write.test.js` — new; reached by `'tests/*.test.js'`.
9. ✅ `shared/resources/tests/read-only-agent-writes.test.mjs` — new; lifts and runs the matrix write
   block and the Step 3b.1 block; reached by `'shared/resources/tests/*.test.mjs'`.
10. ✅ `evals/shared/tests/probes-executed-population.test.mjs` — the invocation walk floor 4 → 3 (the
   prompt's seven engine invocations are now plan examples).
11. ✅ `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` — the obs #10 test rewritten to the
   `probe_plan` contract.

### Files to Modify (Generated)

12. ✅ Bundled copies under `skills/*/references/` of files 1–4, 6 and 7, regenerated by `npm run bundle`.

### Files to Modify (Documentation)

13. ✅ `CHANGELOG.md` — `[Unreleased]` › Fixed.

Also changed: `skills/finalise/SKILL.md` Step 3b's table passes `<DIFF_FILE>` to the docs agent,
which the diff-based catalog rule reads (platform-neutral, already produced in Step 3a).

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Command**: `command node --test tests/explore-prompts-no-write.test.js`
- **Population definition** (the test re-measures it): prompt files named on a line matching
  `subagent_type[=:] *"?Explore` in `shared/resources/*.md` and `skills/*/SKILL.md`, plus
  `shared/resources/*prompt*.md` files whose text says "Explore subagent". Bundled copies are
  excluded.
- **Control case**: the test also runs its matcher on a prompt fixture with a write inside a block
  marked caller-run (must pass) and on one with a bare "Write the report file" sentence (must fail).
  This shows the matcher neither over- nor under-fires.

### Integration Tests

- The mapper's extract-and-write block is lifted from the step doc and run against a fixture reply
  with markers (file written, byte-equal to the marked block) and without (no file, warning printed).
- finalise Step 3b.1's block is lifted and run against a fixture plan with one probeable entry (a tiny
  exported predicate in a temp repo): `probes_executed` equals the record's `totals.executed` (> 0),
  and against an entry the engine refuses: refusal recorded, not counted; and against an entry whose
  argument carries a space (a `fence:` heading): passed as one argument.
- `npm test`, `npm run bundle:check`.

### Mutation proofs

- Restore the mapper's write instruction → the guard test goes red.
- Make Step 3b.1 count a refused entry as executed → its fixture case goes red.

### Performance Tests

Not applicable: no change to how often the engine or the agents run.

---

## 9. Success Criteria

### Functional

- [ ] The mapper prompt contains no write instruction, and both dispatch sites say to return the
  matrix — held by `tests/explore-prompts-no-write.test.js` (Phase 4).
- [ ] The lifted extract-and-write block writes the marked matrix byte-for-byte and warns without
  writing when no markers are present — held by its fixture test (Phase 1).
- [ ] The DoD security prompt contains no `--record` and no cases-file write, and returns
  `probe_plan[]` — held by the guard test (Phase 4) and the rewritten obs #10 contract test (Phase 2).
- [ ] The lifted Step 3b.1 block sets `probes_executed` from the records' `totals.executed`, and
  records an engine refusal without counting it — held by its fixture test (Phase 2).
- [ ] The DoD docs prompt instructs no generator run — held by the guard test (Phase 4).

### Performance

- [x] Not applicable: no runtime path changes in frequency.

### Code Quality

- [x] `npm test`, `npm run bundle:check`, `prettier --check .` pass.
- [x] `python skills/create-skill/scripts/quick_validate.py skills/finalise` passes.

### Migration

- [x] CHANGELOG entry states that the security agent's YAML no longer carries `probes_executed`,
  `probe_command` or `probe_cases`, and that finalise fills the count.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The zero-guard's input moves from the agent to finalise**
   - **Risk**: Step 3b.1 leaves `probes_executed` unset on a path (no plan entries, engine crash), and
     the render reads "not reported".
   - **Probability**: Medium. **Impact**: a false FAIL or a missing count.
   - **Mitigation**: Step 3b.1 always writes `probes_executed` when `boundary: true` (0 with a reason
     when nothing ran); the zero-guard already treats 0 and absent alike; fixture cases for empty
     plan and engine refusal.
2. **The guard matcher over-fires on legitimate text** (a prompt quoting a write it forbids)
   - **Mitigation**: the caller-run block marker; the control case in § 8.

### Low Risk Areas

1. **Mapper reply size**: a large matrix returned inline costs context once. It is already returned
   inline in practice on every recurrence logged.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: finalise reports `probes_executed` wrongly or FAILs every boundary run; the mapper
  matrix stops being written.
- **Steps**: `git revert` the merge commit; `npm run bundle`; `npm test`.
- **Validation**: guard test removed with the revert; a finalise run on a fixture task renders as
  before.

### Partial Rollback (1-2 hours)

- Phases 1, 2 and 3 revert independently; the guard test's population drops the reverted prompt.

### Forward Fix (< 4 hours)

- A Step 3b.1 counting bug: fix the block; the fixture gains the case.

### Rollback Triggers

- **Critical**: a security boundary reported as probed when nothing executed.
- **Non-critical**: the guard flags a legitimate sentence → add the caller-run marker.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-16
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.189.qa.3.read-only-agents-never-write.md](./task.189.qa.3.read-only-agents-never-write.md)
- **Gate File**: [task.189.gate.3.read-only-agents-never-write.yml](./task.189.gate.3.read-only-agents-never-write.yml)

### Test Coverage Summary
- **Tests Executed**: 64
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Cycle-2 fixes verified (bug.4 closed). One medium: Step 3b.1 runs the probe plan as one foreground call the host can kill mid-run (QA3-1). Two lows on duplicate inline case ids and the prompt's owned-flag lists.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #191, #218 | create-task |
| 2026-10-16 | 1.1 | Review (9/10 after fixes) — Phase 2 now replaces the obs #10 fallback (Step 3b.1, not a second Step 3c), keeps `<DOD_N>` record/cases paths, builds argv as an array; guard population adds inline dispatches, `> <` redirects and a caller-runs marker; two contract tests listed | review-task |
| 2026-10-16 |  | Status → ready-for-development | review-task |
| 2026-10-16 |  | Implemented — 13 source files (+ bundled copies), 1 new runner, 2 new test files (19 tests), 2 contract tests updated; 7 mutation proofs | develop |
| 2026-10-16 |  | QA gate CONCERNS (70/100) — 3 medium, 1 low finding | qa-task |
| 2026-10-16 |  | QA findings fixed — cycle 1, 4 gate findings (CR-1, CR-2, QA-1, QA-2) + 2 advisory (CR-3, CR-4/5) | qa-fix |
| 2026-10-16 |  | QA gate CONCERNS (90/100) — 1 medium finding; cycle-1 bugs 1-3 closed | qa-task |
| 2026-10-16 |  | QA findings fixed — cycle 2, 1 gate finding (CR2-1) + 4 advisory (CR2-2..CR2-5) | qa-fix |
| 2026-10-16 |  | QA gate CONCERNS (90/100) — 1 medium, 2 low findings; bug.4 closed | qa-task |
| 2026-10-16 |  | QA findings fixed — cycle 3, 3 gate findings (QA3-1, CR3-2, CR3-3) | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Mapper returns, the step writes

- [x] Complete

### Phase 2: Security agent plans, finalise runs

- [x] Complete

### Phase 3: Docs agent runs no generator

- [x] Complete

### Phase 4: Guard test and changelog

- [x] Complete

---

## References

- Observation #191 — QA traceability mapper is dispatched as a read-only Explore agent but told to write the matrix file
- Observation #218 — Pipeline prompts ask read-only Explore subagents to write files (traceability matrix, DoD probe records)

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.189.qa.{n}.read-only-agents-never-write.md`,
  `task.189.gate.{n}.read-only-agents-never-write.yml`, bug reports as `task.189.bug.{N}.{name}.md`.
- Design decision (2026-10-07, the user): the security agent plans and finalise runs, rather than
  re-typing agent 2 as general-purpose or moving the engine to stdout.

### Future Improvements

- `generate_catalog.py --check`, so the docs agent can verify by running a read-only command.

## Implementation Summary

**Completion Date:** 2026-10-16

**Approach.** Every write moved to the step that dispatches the agent.

- **Mapper.** `qa-traceability-mapper-prompt.md` Steps 6–7 build the matrix and return it between
  `<!-- matrix-start -->` / `<!-- matrix-end -->`; its orchestrator-side text is marked
  `<!-- caller-runs -->`. Both dispatch sites in `develop-pipeline-step-5-6-qa-loop.md` ask for the
  matrix back; the orchestrator saves the reply to `.claude/state/mapper-reply.md` and the block
  **Write the matrix from the mapper's reply** writes the marked text byte for byte (exactly one of
  each marker, start before end, non-empty — otherwise a warning and no file).
- **Security agent.** `finalise-dod-security-prompt.md` probe mode is "Plan the run — `/finalise`
  executes it": the agent returns `probe_plan[]` (engine arguments as an array, inline `cases`) and
  writes nothing; its seven engine invocations became plan examples. finalise **Step 3b.1** replaces
  the obs #10 conditional fallback: it always runs the plan through the new
  `shared/resources/security-probe-plan.mjs` into the one `<stem>.dod.<DOD_N>.security.run.json`
  record, fills `probes_executed` from `totals.executed` and `probes[]` from the engine's
  `reproduced[]` / `overblocked[]` (inputs looked up by id in the cases or corpus), records refusals
  without counting them, applies the zero-guard, and re-dispatches the agent once to grade reproduced
  probes so Step 8a's low-severity path still opens.
- **Docs agent.** Judges catalog staleness from `<DIFF_FILE>` (frontmatter change with no catalog
  change); never runs the generator.
- **Guard.** `tests/explore-prompts-no-write.test.js` derives its population (dispatch lines,
  self-declared prompts, inline dispatch bodies — 16 files and 2 inline bodies on this tree, measured by the test's own `population()`) and
  fails on five write shapes outside `caller-runs` regions.

**Testing Results.**
- `command node --test tests/explore-prompts-no-write.test.js`: 6/6 (non-vacuity floor, the property,
  both dispatch sites, two control cases, an in-test mutation).
- `command node --test shared/resources/tests/read-only-agent-writes.test.mjs`: 7/7 (matrix byte-for-byte
  incl. a pipe and non-ASCII; five malformed replies write nothing; Step 3b.1 count = record totals across
  two controls; engine refusal and owned-flag refusal not counted; a spaced argument stays one argument;
  inline cases written beside the record and used; empty plan → 0).
- `npm run ci:fast`: 5797 pass, 0 fail (iter 2; iter 1 found the runner's entry guard missing
  `realpathSync` — fixed). `npm run bundle:check`: 0 problems. `quick_validate.py skills/finalise`: ✓.
- Mutation proofs, each red then restored: M1 mapper prompt write restored (guard fail 2); M2 inline
  dispatch write restored (fail 2); M3 caller-runs marker removed (fail 1); M4 docs agent told to run the
  generator (fail 1); M5 runner counts an exit-2 entry (fail 1); M6 runner composes the count (fail 3);
  M7 matrix block discards a returned matrix (fail 1).

## Deferred Work

- **None from this task's scope.** Out-of-scope items stand as written in § 4 (subagent types,
  `review-security`'s inline probe, `generate_catalog.py --check`).
