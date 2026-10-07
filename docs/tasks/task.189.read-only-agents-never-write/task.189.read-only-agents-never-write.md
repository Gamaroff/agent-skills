---
id: task.189
title: "Read-only agents never write"
type: task
description: "No pipeline prompt asks a read-only Explore subagent to write: the QA traceability mapper returns its matrix and the orchestrator writes it; the finalise DoD security agent returns a probe plan and the orchestrator runs the engine with --record; the DoD docs agent runs no generator; and a guard test keeps every Explore-dispatched prompt free of write instructions."
tags: [develop-task, develop-story, finalise, observation, subagents, explore]
category: refactoring
status: planned
priority: Medium
created: 2026-10-07
updated: 2026-10-07
assignee:
estimated_effort_hours: 16
github_issue: 588
---

# Technical Task: Read-only agents never write

**Status:** Planned
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
   `probes_executed` / `probes[]` from the records.
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
  without `--record` (`--sink`, `--entry`, optional `--argv`, `--cases-file`). After the four agents
  return, a new finalise **Step 3c** runs each plan entry with `--repo-root "$(git rev-parse
  --show-toplevel)"` and `--record <STORY_DIR>/<stem>.dod.security.run.json` (one record per entry,
  numbered when there are several). It sets `probes_executed` to the sum of the records'
  `totals.executed` and `probes[]` to their reproduced cases. The existing render (`:610`) and
  zero-guard (`:618`) read those fields unchanged. A plan entry the engine refuses (exit 2) is
  recorded as an engine refusal with its `reason`, never as executed. The agent no longer emits
  `probes_executed`.
- **Docs agent runs no generator.** `:55` becomes: judge from the PR diff — a `SKILL.md` frontmatter
  change with no `docs/reference/skill-catalog.md` change in the same diff is the gap. Never run
  `npm run generate-catalog` or any writer to find out.
- **Guard test** `tests/explore-prompts-no-write.test.js`. Population: every `shared/resources/*.md`
  prompt file that a dispatch line with `subagent_type="Explore"` names, plus every prompt file
  whose own text says it is dispatched to an Explore subagent. Assertion: none contains a write
  instruction. That means "write the … file", `--record`, `mkdir`, or a shell redirect into a path
  (`> {`, `>> {`), outside a block the prompt marks as run by the caller. Non-vacuity floor: the
  population includes the mapper, the four finalise DoD prompts and both review pre-pass prompt files.

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
- **After**: agent 2 reports `boundary` and `probe_plan[]`; finalise Step 3c fills
  `probes_executed` and `probes[]` from the engine records before rendering.
- **Affected**: finalise's render and zero-guard (unchanged, they read the filled fields) and any
  consumer that dispatches `finalise-dod-security-prompt.md` itself. A repo grep on `47da7406`
  finds finalise as the only dispatcher. qa-task Step 3b and qa-story Phase 1.6 cite the prompt's
  Step 1b (the boundary rule) by name, so Step 1b keeps its heading and content.
- **Migration**: none for consumers of `/finalise`. A custom dispatcher of the prompt must run
  Step 3c's block after the agent returns.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.189.plan.read-only-agents-never-write.md](task.189.plan.read-only-agents-never-write.md)

### Phase 1: Mapper returns, the step writes (obs #191)

**Risk**: Low. **Files**: `shared/resources/qa-traceability-mapper-prompt.md`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`.

- [ ] Prompt Steps 6–7: build and return the matrix between markers; drop the write and `mkdir`.
- [ ] Both dispatch sites: "return the matrix" in the dispatch text; a fenced block extracts the
  marked block and writes the file.
- [ ] Fallback: warn only when the reply has no marked block.
- [ ] `npm run bundle`.

### Phase 2: Security agent plans, finalise runs (obs #218)

**Risk**: Medium (the zero-guard's input changes source). **Files**:
`shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`. **Depends on**: none.

- [ ] Prompt probe mode: return `probe_plan[]` (engine argv without `--record`); remove the
  `--record` command blocks and the instruction to emit `probes_executed`.
- [ ] Output schema: `probe_plan` documented; `probes_executed` / `probes[]` documented as filled by
  finalise.
- [ ] finalise Step 3c: run each plan entry with `--repo-root` and `--record`, sum
  `totals.executed`, collect reproduced cases, record engine refusals with their `reason`.
- [ ] The render and zero-guard stay as they are; confirm they read the filled fields.
- [ ] Step 1b (the boundary rule, cited by qa-task Step 3b and qa-story Phase 1.6) keeps its
  heading and wording; only step 3 onward changes.

### Phase 3: Docs agent runs no generator (obs #218)

**Risk**: Low. **Files**: `shared/resources/finalise-dod-docs-prompt.md`.

- [ ] Replace the catalog question with the diff-based rule and a "never run a writer" line.

### Phase 4: Guard test and changelog

**Risk**: Low. **Files**: `tests/explore-prompts-no-write.test.js` (new), `CHANGELOG.md`.
**Depends on**: Phases 1–3.

- [ ] Population from the dispatch grep plus self-declared Explore prompts; floor as § 3.
- [ ] Assertion: no write instruction outside a caller-run block; failure names file and line.
- [ ] Mutation proof: restore "Write the matrix file" in a copy of the mapper prompt → red.
- [ ] CHANGELOG `[Unreleased]` › Fixed entry citing obs #191 and #218.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-traceability-mapper-prompt.md`
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
3. ✅ `shared/resources/finalise-dod-security-prompt.md`
4. ✅ `shared/resources/finalise-dod-docs-prompt.md`
5. ✅ `skills/finalise/SKILL.md` — Step 3b note, new Step 3c.

### Files to Modify (Tests)

6. ✅ `tests/explore-prompts-no-write.test.js` — new; reached by `'tests/*.test.js'`.

### Files to Modify (Generated)

7. ✅ Bundled copies under `skills/*/references/` of files 1–4, regenerated by `npm run bundle`.

### Files to Modify (Documentation)

8. ✅ `CHANGELOG.md` — `[Unreleased]` › Fixed.

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
- finalise Step 3c's block is lifted and run against a fixture plan with one probeable entry (a tiny
  exported predicate in a temp repo): `probes_executed` equals the record's `totals.executed` (> 0),
  and against an entry the engine refuses: refusal recorded, not counted.
- `npm test`, `npm run bundle:check`.

### Mutation proofs

- Restore the mapper's write instruction → the guard test goes red.
- Make Step 3c count a refused entry as executed → its fixture case goes red.

### Performance Tests

Not applicable: no change to how often the engine or the agents run.

---

## 9. Success Criteria

### Functional

- [ ] The mapper prompt contains no write instruction, and both dispatch sites say to return the
  matrix — held by `tests/explore-prompts-no-write.test.js` (Phase 4).
- [ ] The lifted extract-and-write block writes the marked matrix byte-for-byte and warns without
  writing when no markers are present — held by its fixture test (Phase 1).
- [ ] The DoD security prompt contains no `--record` and returns `probe_plan[]` — held by the guard
  test (Phase 4).
- [ ] The lifted Step 3c block sets `probes_executed` from the records' `totals.executed`, and
  records an engine refusal without counting it — held by its fixture test (Phase 2).
- [ ] The DoD docs prompt instructs no generator run — held by the guard test (Phase 4).

### Performance

- [ ] Not applicable: no runtime path changes in frequency.

### Code Quality

- [ ] `npm test`, `npm run bundle:check`, `prettier --check .` pass.
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/finalise` passes.

### Migration

- [ ] CHANGELOG entry states that the security agent's YAML no longer carries `probes_executed` and
  that finalise fills it.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The zero-guard's input moves from the agent to finalise**
   - **Risk**: Step 3c leaves `probes_executed` unset on a path (no plan entries, engine crash), and
     the render reads "not reported".
   - **Probability**: Medium. **Impact**: a false FAIL or a missing count.
   - **Mitigation**: Step 3c always writes `probes_executed` when `boundary: true` (0 with a reason
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

- A Step 3c counting bug: fix the block; the fixture gains the case.

### Rollback Triggers

- **Critical**: a security boundary reported as probed when nothing executed.
- **Non-critical**: the guard flags a legitimate sentence → add the caller-run marker.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #191, #218 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Mapper returns, the step writes

- [ ] Not started

### Phase 2: Security agent plans, finalise runs

- [ ] Not started

### Phase 3: Docs agent runs no generator

- [ ] Not started

### Phase 4: Guard test and changelog

- [ ] Not started

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
