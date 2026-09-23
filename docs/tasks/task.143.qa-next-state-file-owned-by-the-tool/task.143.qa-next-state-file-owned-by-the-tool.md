---
id: task.143
title: "[Task 143] qa-next: uat-status.mjs owns the run state file, so its contract is held by tests instead of prose"
type: task
description: "Move /qa-next's run state file (.claude/state/qa-next.state.json) from a JSON shape described across SKILL.md Steps 0–6 into uat-status.mjs subcommands with one field schema in code, so every field's writer and reader is tested — and close the three LOW deferrals task.141 left in the same area."
tags: [qa-next, uat-status, state-file, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-09-23
updated: 2026-09-23
assignee:
estimated_effort_hours: 6
github_issue: 469
---

# Technical Task: qa-next — `uat-status.mjs` owns the run state file

**Status:** Planned

**GitHub Issue**: [#469](https://github.com/Gamaroff/agent-skills/issues/469)

---

## 1. Overview

`/qa-next`'s run state file — `.claude/state/qa-next.state.json`, the single-flight lock and resume
record — is today a JSON object whose shape, writers, readers and lifetime are described in prose
across SKILL.md Steps 0–6 (19 mentions), and `uat-status.mjs` never reads or writes it. This task gives
the file an owner: `uat-status.mjs` gains `--state-*` subcommands and one exported field schema, the
skill calls commands instead of describing JSON, and unit tests hold every field's writer and reader.

**Scope**: the state-file subcommands and schema in `skills/qa-next/scripts/uat-status.mjs`; SKILL.md
Steps 0–6 rewritten to call them; the three LOW deferrals from task.141 that sit in the same code; tests.

**Key deliverables**:

1. `--state-init`, `--state-get`, `--state-set`, `--state-clear` in `uat-status.mjs`, with one exported
   `STATE_FIELDS` schema (field → writer, readers, mutability).
2. SKILL.md Steps 0–6 express every state-file interaction as one of those commands — no JSON shape
   in prose.
3. The `--env` guard checks the name it builds, and the Step 4.4 pass bullet defers to the flag table.

**Expected outcome**: a defect in who writes or reads a state field becomes a red unit test, not a
QA-cycle finding.

---

## 2. Motivation

### Current Problems

1. **A contract that exists only as sentences produced one defect per QA cycle.** task.141's cycles
   10–12 each found exactly one MEDIUM in the state-file prose, each in the previous cycle's fix:
   BUG-21 (the payload's `bug` did not round-trip through `--bug`), BUG-22 (Step 6 read `priorRuns`
   after deleting the file), BUG-23 (the "every later step reads `bug` from the state file" rule was
   over-broad — the pre-run bug is not this run's bug). The loop escalated twice on this area and the
   operator closed it on the evidence (obs #167).
2. **Nothing mechanical holds the fields.** `priorRuns`, `bug` and `filedBug` each have one writer
   step and one to three reader steps, stated in different paragraphs; `uat-status.mjs` never touches
   the file, so no test can see a reader drift from its writer.
3. **A pre-task.141 state file has no `priorRuns`** (task.141 gate 12, CR12-3). Resumed under the
   new Step 6 it reads as empty and reports a re-run as a first run; the prose says nothing about it.
4. **A two-digit `--env` label passes the run-sequence guard** (task.141 PR review 2, CR-1).
   `runPathFor` refuses an env ending `-NN`, but `--env 10` builds `2026-09-22-10.md`, which `seqKey`
   reads as run 10 of env `2026-09-22`, mis-ordering `priorRuns`, `--findings` and the previous-run
   link. The same guard does not refuse a `/` or `..` in the label (DoD security observation).
5. **Step 4.4's `pass` bullet omits `--clear-note`** (task.141 PR review 2, CR-2), which the flag
   table directly below requires on every non-✅ row.

### Benefits of a tool-owned state file

- **Every field's writer and reader is a test**, not a paragraph — the class that cost task.141 three
  cycles is closed rather than patched.
- **SKILL.md shrinks and stops restating a schema** — each step names one command.
- **Legacy and malformed state files get a defined answer** (derive, or refuse by name) instead of
  whatever each step's prose implied.
- **The run-file ordering can no longer be corrupted by an env label**, and the label can no longer
  steer the printed path out of `runs/<id>/`.

---

## 3. Technical Background

### Current Architecture

- **State file**: `.claude/state/qa-next.state.json`, shape shown only as an example object in
  SKILL.md § "State file" (*`{ "item": "D.2", "function": …, "priorRuns": […], "bug": …,
  "filedBug": null, "runFile": …, "phase": "selected|resolved|executed|recorded|committed", … }`*).
- **Writers**: Step 1 (selection: `item`, `function`, `surface`, `stories`, `uatSpecs`, `targeted`,
  `priorRuns`, `bug`), Step 3 (`runFile`, `phase: resolved/executed`), Step 4 (`filedBug`,
  `phase: recorded`), Step 5 (`phase: committed`), Step 6 (deletes the file, last).
- **Readers**: Step 0 preflight (single-flight: *"State file present → if it names a different item
  … HALT `run-in-progress`"*), the resume map (*"Resume on re-run: `phase: committed` → Step 6; …"*),
  Step 4 (`bug` for the reuse decision; `priorRuns` for the Run row), Step 5 (`priorRuns` for the
  re-run commit subject), Step 6 (`priorRuns`, `filedBug`).
- **`uat-status.mjs`** (`skills/qa-next/scripts/uat-status.mjs`): `describeRow` builds the `--item` /
  `--next` payload (including `priorRuns` from `priorRuns(opts, id)` and `bug` from `bugLinkPaths` +
  `repoPathOf`); `main` dispatches on `--init`, `--coverage`, `--check`, `--next`, `--item`,
  `--run-path`, `--set`, `--items`, `--automated`, `--accept`, `--findings`. No state-file code.
- **`runPathFor(existing, date, env)`**: refuses `/-\d{2}$/.test(env)`; builds `${date}-${env}`;
  `seqKey` (the one sort key) parses a trailing `-NN` as the run sequence.

### Target Architecture

- **`STATE_FIELDS`** (exported, frozen): one entry per field — `item`, `function`, `surface`,
  `stories`, `uatSpecs`, `targeted`, `priorRuns`, `bug`, `filedBug`, `runFile`, `phase`, `startedAt`
  — each with its writer (`init` or a named `--state-set` field), whether it is mutable after init,
  and its readers (SKILL.md step numbers, for the record the test checks).
- **`--state-init (--item <id> | --next) [--json]`**: resolves the row exactly as `--item` / `--next`
  do (same `describeRow`), writes the state file with every init field, `phase: selected`,
  `filedBug: null`, `runFile: null`, and prints the payload — the one call replaces "resolve, then
  write the state file". Refuses with exit **5** `run-in-progress` when a state file names a different
  item; with the same item it is a resume and prints the existing state unchanged.
- **`--state-get [--json]`**: prints the state; exit **6** when none. A legacy file lacking
  `priorRuns` is answered with `priorRuns` **derived** — the row's current `priorRuns` minus the state
  file's own `runFile` — and `derived: ["priorRuns"]` in the output, never a silent empty list.
- **`--state-set <field> <value>`**: only the mutable fields (`phase`, `runFile`, `filedBug`, `lane`);
  `phase` moves forward only through `selected → resolved → executed → recorded → committed`; an
  init-only field (`priorRuns`, `bug`, …) is refused by name — the pre-run values cannot be
  overwritten after the run changes the row.
- **`--state-clear`**: deletes the file (Step 6, last); idempotent.
- **`runPathFor`** refuses an env that is empty, two digits, ends `-NN`, or contains `/`, `\` or `..`
  — tested against the built name, not only the label.

### Important Clarifications

- **This is not a new store.** Same path, same lifetime (created at selection, deleted last in
  Step 6), same role as the single-flight lock. What changes is who writes it.
- **The alternative considered — one schema table in SKILL.md plus a test over prose names — was
  rejected** (operator decision, 2026-09-23): a test over prose checks that a field is *named*, not
  that the step *reads it at the right time*, which is exactly what BUG-22 and BUG-23 got wrong.
- **Existing reconciliation code to reuse, not duplicate**: `describeRow` (payload), `priorRuns`
  (history), `repoPathOf` (the one registry→repo conversion). `--state-init` calls `describeRow`; it
  does not rebuild the payload.

---

## 4. Scope

### In Scope

✅ `--state-init`, `--state-get`, `--state-set`, `--state-clear` and exported `STATE_FIELDS` in
`skills/qa-next/scripts/uat-status.mjs`
✅ Legacy state file (no `priorRuns`): derived on read, marked `derived`
✅ SKILL.md Steps 0–6, § "State file", the resume map and the stop-condition table rewritten to name
commands; the example JSON object removed
✅ `runPathFor` env guard on the built name, plus path-separator refusal (task.141 PR review 2 CR-1,
DoD security observation)
✅ SKILL.md Step 4.4 pass bullet defers to the per-verdict flag table (PR review 2 CR-2)
✅ README § owner commands lists the state subcommands; CHANGELOG entry

### Out of Scope

❌ The probe engine's CLI entry form — task.144 (a shared-resource change every skill's DoD depends
on; independently shippable)
❌ task.141's other routed-to-future items (non-default `registryPath` / `--registry`, `cmdSet`'s
`startsWith` guess, a directory passing the bug-link check, run-link / `Filed as` fragment handling,
bug.16) — each is its own follow-up
❌ Changing where evidence goes (`.claude/state/qa-next/<id>/…`) — unrelated to the lock

---

## 5. Breaking Changes

### Breaking Change 1: the skill writes the state file through the tool

**What changed**: SKILL.md no longer tells the agent to write JSON; Step 1 calls
`--state-init`, later steps call `--state-set`, Step 6 calls `--state-clear`.

```text
Before (SKILL.md Step 1): "write the state file (phase: selected, targeted set accordingly,
                           priorRuns and bug copied from the payload)"
After:                     uat-status.mjs --state-init --item <id> --json   # or --next
```

**Impact**: consumers who run `/qa-next` get the new protocol when they install the new skill; the
file's path and shape are unchanged, so an in-flight run started by the old skill resumes.
**Migration**: none for new runs. An in-flight state file from the old skill is read by
`--state-get`; if it lacks `priorRuns` the value is derived (see Target Architecture).

### Breaking Change 2: some `--env` labels are refused

**What changed**: `--run-path … --env <label>` refuses a label that is two digits (`10`), ends `-NN`
(already refused), or contains `/`, `\` or `..`.

**Impact**: an owner or config using a purely numeric env label.
**Migration**: use a label with a letter (`env-10`, `ci10`). The refusal message names the rule; the
CHANGELOG entry carries a **Migration** line.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.143.plan.qa-next-state-file-owned-by-the-tool.md](task.143.plan.qa-next-state-file-owned-by-the-tool.md)

### Phase 1: State schema and subcommands in `uat-status.mjs`

**Risk**: Medium · **Files**: `skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs`

- [ ] Export frozen `STATE_FIELDS` (field → writer, mutable, readers)
- [ ] `--state-init (--item <id> | --next)`: `describeRow`, write file, print payload; exit 5 `run-in-progress` on a different item; same item → print existing state
- [ ] `--state-get`: exit 6 when absent; legacy `priorRuns` derived (row `priorRuns` minus `runFile`), `derived` marker
- [ ] `--state-set <field> <value>`: mutable fields only; `phase` forward-only; init-only fields refused by name
- [ ] `--state-clear`: idempotent delete
- [ ] `--state <path>` override (default `.claude/state/qa-next.state.json` under `--root`); add every new flag to `OPTIONS`
- [ ] Tests for each command, each refusal, the legacy derivation, and a schema-coverage test (every `STATE_FIELDS` field has a writer that a test exercises)

**Dependencies**: none

### Phase 2: SKILL.md speaks commands, not JSON

**Risk**: Medium (executed prose — a sentence is a call site) · **Files**: `skills/qa-next/SKILL.md`, `skills/qa-next/README.md`

- [ ] § "State file": replace the example object with a pointer to `STATE_FIELDS` and the four commands
- [ ] Step 0 preflight and the resume map read `--state-get`; `run-in-progress` maps to exit 5
- [ ] Step 1 calls `--state-init`; Steps 3–5 call `--state-set`; Step 6 prints from `--state-get` then `--state-clear` last
- [ ] Every remaining "state file" sentence names a command (grep: no JSON field is described as written or read in prose without its command)
- [ ] README owner-commands block lists the state subcommands

**Dependencies**: Phase 1

### Phase 3: The LOW deferrals

**Risk**: Low · **Files**: `skills/qa-next/scripts/uat-status.mjs`, `skills/qa-next/SKILL.md`, tests

- [ ] `runPathFor` refuses empty, two-digit, `-NN`-ending, and `/` `\` `..`-containing env labels; tests on the built name
- [ ] SKILL.md Step 4.4 `pass` bullet defers to the per-verdict flag table (`--clear-note` on non-✅ rows)

**Dependencies**: none (can run in parallel with Phases 1–2)

### Phase 4: Docs, CHANGELOG, validation

**Risk**: Low · **Files**: `CHANGELOG.md`, `docs/reference/commands.md` (if it lists uat-status flags)

- [ ] CHANGELOG `[Unreleased]` entry citing `(task 143)`, with a **Migration** line for the env refusal
- [ ] `npm run validate -- skills/qa-next/`, `check:generated`, `bundle --check`, Prettier

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-next/scripts/uat-status.mjs` — `STATE_FIELDS`, four `--state-*` commands, `--state` path option, env guard
2. ✅ `skills/qa-next/SKILL.md` — Steps 0–6, § State file, resume map, stop conditions, Step 4.4 pass bullet

### Files to Modify (Tests)

3. ✅ `evals/qa-next/unit/uat-status.test.mjs` — state commands, refusals, legacy derivation, schema coverage, env guard

### Files to Modify (Documentation)

4. ✅ `skills/qa-next/README.md` — owner commands
5. ✅ `CHANGELOG.md` — `[Unreleased]`, `(task 143)`, Migration line
6. ✅ `docs/reference/commands.md` — only if it enumerates `uat-status.mjs` flags

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: every `--state-*` command's success path and each refusal (exit 5 different item, exit 6
  absent, init-only field set, backward `phase`, unknown field); the legacy derivation; the env guard.
- **Schema coverage**: a test enumerates `STATE_FIELDS` and asserts each field is written by a test
  that exercises its writer — the population is derived from the export, not restated.
- **Round trip**: `--state-init --item D.2` then `--run-path`, write the run file, then `--state-get`
  still returns the **pre-run** `priorRuns` (the BUG-22 shape) and the pre-run `bug` (the BUG-23 shape).
- **Command**: `command node --test evals/qa-next/unit/uat-status.test.mjs`; every new test
  mutation-proved.

### Integration Tests

- A scripted walk of Steps 1 → 6 through the commands on a fixture registry: `--state-init`,
  `--run-path`, `--state-set runFile …`, `--set … fail --bug`, `--state-set filedBug …`,
  `--state-set phase committed`, `--state-get`, `--state-clear` — `--check` green throughout.

### Consumer Tests

- SKILL.md executed-prose check (`qa-execute-snippets.mjs` Step 4b) on the rewritten steps.

---

## 9. Success Criteria

### Functional

- [ ] `--state-init --item <id>` and `--state-init --next` write the state file and print the same payload `--item` / `--next` print
- [ ] A second `--state-init` naming a different item exits 5 and writes nothing; the same item prints the existing state unchanged
- [ ] After a run file is written, `--state-get` returns the pre-run `priorRuns` and `bug`
- [ ] `--state-set` refuses init-only fields and backward `phase` moves by name
- [ ] A legacy state file without `priorRuns` is answered with a derived value and a `derived` marker
- [ ] `--env 10`, `--env a/b`, `--env ..` are refused before anything is written

### Performance

- [ ] No command gains a network call; the tool stays offline
- [ ] qa-next suite wall-clock stays within the same order of magnitude

### Code Quality

- [ ] Every new test mutation-proved (revert the behaviour, the named test goes red)
- [ ] `npm test` green with the gitignored `.claude/skills` symlink moved aside
- [ ] `check:generated`, `bundle --check`, `npm run validate -- skills/qa-next/` and Prettier clean

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 143)` and carries a **Migration** line for the env refusal
- [ ] SKILL.md describes no state-file field as written or read without naming the command that does it

---

## 10. Risk Assessment

### High Risk Areas

1. **Executed prose regresses while being rewritten**
   - Risk: Steps 0–6 are a call graph; replacing prose with commands can orphan a reader (the BUG-22 shape).
   - Probability: Medium · Impact: High
   - Mitigation: the integration walk above; the grep criterion in § 9 Migration; the qa loop's refute pass.
   - Rollback: revert Phase 2 alone — Phase 1's commands are additive and unused without it.

### Medium Risk Areas

1. **In-flight runs across the upgrade** — mitigated by the legacy derivation and unchanged path/shape.
2. **Forward-only `phase`** could strand a run that legitimately re-enters a step — the resume map is
   forward-only today; if a backward move is needed, `--state-clear` and re-init is the stated recovery.

### Low Risk Areas

1. **Env refusal** breaks a purely numeric label — documented with a Migration line.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `/qa-next` cannot complete a run on a fixture registry; `--check` red after a run.
- **Steps**: revert the PR; the state file's path and shape are unchanged, so no data migration.
- **Validation**: `command node --test evals/qa-next/unit/uat-status.test.mjs` green on the reverted tree.

### Partial Rollback (1–2 hours)

- Revert Phase 2 (SKILL.md) only — Phase 1's subcommands are additive and unused without it.

### Forward Fix

- A single mis-wired step: fix the step's command and add the missing integration-walk assertion.

### Rollback Triggers

- **Critical**: a run completes with the wrong `priorRuns`/`bug` in its Run row or commit subject.
- **Non-critical**: wording or README gaps — fix forward.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-23 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

- [ ] Phase 1: State schema and subcommands
- [ ] Phase 2: SKILL.md speaks commands
- [ ] Phase 3: LOW deferrals
- [ ] Phase 4: Docs, CHANGELOG, validation

---

## References

- task.141 — [`task.141.qa-next-targeted-item.md`](../task.141.qa-next-targeted-item/task.141.qa-next-targeted-item.md) (PR #468): BUG-21/22/23, gate 12 CR12-3, PR review 2 CR-1/CR-2, DoD security observation
- [`task.141.pr-review.2.qa-next-targeted-item.md`](../task.141.qa-next-targeted-item/task.141.pr-review.2.qa-next-targeted-item.md)
- Observation #167 — a skill-internal record described only in prose yields one defect per QA cycle
- task.144 — the probe engine's CLI entry form (independent; lets this task's DoD execute probes)

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.143.qa.{N}.qa-next-state-file-owned-by-the-tool.md`,
  `task.143.gate.{N}.qa-next-state-file-owned-by-the-tool.yml`, bug reports `task.143.bug.{N}.{name}.md`.
- Run `uat-status.mjs` only from its real repo path with a real, non-empty `--root` (bug.16; an empty
  `--root` value makes the next flag the root).
