---
id: task.191
title: "Snippet engine runs pipeline blocks"
type: task
description: "qa-execute-snippets.mjs gains --slot to fill {template} slots, runs a block that calls or sources a bundled helper when the helper itself classifies as runnable, and reports changed blocks separately via --diff-base, so qa-task Step 4b and qa-story Phase 1.7 execute the blocks a change actually touches."
tags: [qa-task, qa-story, qa-execute-snippets, observation, runnable-prose]
category: refactoring
status: planned
priority: Medium
created: 2026-10-07
updated: 2026-10-07
assignee:
estimated_effort_hours: 16
github_issue: 590
---

# Technical Task: Snippet engine runs pipeline blocks

**Status:** Planned
**GitHub Issue**: [#590](https://github.com/Gamaroff/agent-skills/issues/590)

---

## 1. Overview

qa-task Step 4b and qa-story Phase 1.7 run `shared/resources/qa-execute-snippets.mjs` over a
change's documents so that runnable prose is executed rather than read. On pipeline step documents
the engine executes almost nothing. `{template}` slots cannot be filled (obs #186). A block that
calls a bundled helper with `bash …/references/x.sh` (obs #219) or `source …/references/x.sh`
(obs #278) is refused as an unrecognised command. And the report folds the changed blocks into the
file-level count, so a run where every changed block was refused reads like any other. This task
lets the engine fill slots, run helper calls whose helper is itself safe, and report changed blocks
on their own.

**Scope**: `shared/resources/qa-execute-snippets.mjs`, its test, the rule document
`shared/resources/qa-runnable-prose-detection.md`, qa-task Step 4b and qa-story Phase 1.7, bundled
copies, CHANGELOG.

**Key deliverables**:

1. `--slot NAME=VALUE` substitutes `{NAME}` / `<NAME>` text before classification. A slot left
   unfilled is reported by name.
2. `bash <path>.sh …`, `source <path>` and `. <path>` are runnable when the path is a literal regular
   file inside the temp copy and the helper's own text classifies as runnable. Functions a sourced
   runnable helper defines are recognised for the rest of the block.
3. `--diff-base <rev>` marks blocks that overlap changed lines. The summary counts changed blocks
   apart, and a new finding `changed-blocks-not-executed` fires when changed blocks exist and none ran.

---

## 2. Motivation

### Current Problems

1. **Template slots cannot be filled** (obs #186). `--bind NAME=VALUE` binds shell variables. It
   never substitutes `{name}` text. On task.147 (2026-09-25),
   `develop-pipeline-step-3-develop-loop.md` reported `zero-blocks-executed` even with
   `--bind task-directory=… --bind id=147`. The finding's own advice, "supply the missing values with
   --bind", cannot work for that shape.
2. **The mandated helper call is refused** (obs #219). On task.158 QA cycle 1 (2026-09-29) every
   changed block called `bash .agents/skills/<skill>/references/qa-cycle.sh …` and was classified
   `mutating` with `unrecognised-command: bash (fail-closed)`. That form is the repository's own way
   to call a helper from a block.
3. **Sourcing a helper is refused** (obs #278). On task.186 QA cycle 1 (2026-10-06) six new
   numbering blocks (`source …/references/<x>.sh || exit 1`, then a function call) were refused as
   `unrecognised-command: source, next_numbered`. A shared-helper migration changes exactly that
   class of block.
4. **Changed blocks are not reported apart.** In all three runs the file-level summary was
   `zero-blocks-executed` or `no-executable-blocks`, the same as for a file whose unchanged blocks
   are simply templated. The real evidence came from separate hand-written tests.

### Benefits

- Step 4b executes the blocks a pipeline change touches, instead of reporting a count that hides them.
- The allow-list stays the safety boundary: a helper runs only when its own text would.
- A run where the change was not executed says so in one finding.

---

## 3. Technical Background

### Current Architecture

Line numbers are from `develop` at `5f09b4da`, paired with the text they point at.

- **Classification** (`shared/resources/qa-execute-snippets.mjs`, `export function
  classifyBlock(code, bindings = {})`, `:1261`). The order is: deny patterns, `sed w`, `-o` writes,
  write redirection, then command words against `SAFE_COMMANDS` (`:396`). Any word not on the list →
  `mutating`, `unrecognised-command: … (fail-closed)` (`:1316`). Then `PLACEHOLDER_PATTERNS` (`:778`:
  `{name}` not preceded by `$`, and `<name>` in argument position) → `placeholder`, `template slot`
  (`:1323`). Then unbound variables → `placeholder`, `unbound-variable: …`. `bash`, `sh`, `source`
  and `.` are not in `SAFE_COMMANDS`. `COMMAND_RUNNERS` (`:444`) is a separate set (`awk`, `env`,
  `eval`, `xargs`, …) that is always refused.
- **Binding**: `--bind NAME=VALUE` (`main`, `:1899`) feeds `bindings`, which only satisfies the
  unbound-variable check and the environment the block runs with (`sandboxEnv`, `:1425`).
- **Execution** happens in a temp copy seeded by `--copy <dir>` / `--copy-as SRC:DEST` (`:1665`,
  `:1722`), with a before/after `snapshotTree` sentinel (`:1367`, `:1456`, `:1515`).
- **Zero-run findings** (`:1764`–`:1830`): `zero-blocks-executed` when `counts.placeholder > 0`, with
  the detail "supply the missing values with --bind to execute the placeholder blocks" (`:1804`);
  `no-executable-blocks` when every block was refused as `mutating`. Nothing distinguishes changed
  blocks from unchanged ones.
- **Callers**: qa-task `### Step 4b: Execute the Documented Commands` (`skills/qa-task/SKILL.md:831`,
  `node references/qa-execute-snippets.mjs --file "$SKILL_FILE" --json`, `:851`), and qa-story's
  equivalent (`skills/qa-story/SKILL.md:1228`). The rule they cite is
  `shared/resources/qa-runnable-prose-detection.md`.
- **Tests**: `shared/resources/tests/qa-execute-snippets.test.mjs`. Per project memory it is
  load-sensitive: re-run the file alone before believing a timing failure.

### Target Architecture

- **`--slot NAME=VALUE`** (repeatable). Before classification, each block's text has `{NAME}` and
  `<NAME>` replaced by `VALUE` (literal text, no shell expansion). Classification then runs on the
  substituted text, so a dangerous slot value is caught by the same rules as dangerous code. A block
  with a slot still unfilled stays `placeholder` with reason `template slot: {a}, <b>`, naming the
  slots. `zero-blocks-executed`'s detail names `--slot` when the placeholders are template slots and
  `--bind` when they are unbound variables.
- **Helper calls.** `classifyBlock` takes an optional `helperRoot` (the temp copy) and treats `bash`,
  `sh`, `source` and `.` as recognised only when all of these hold:
  1. The next word is a literal path with no `$`, glob or command substitution, after slot
     substitution.
  2. It resolves (realpath) to a regular `.sh` file inside `helperRoot`.
  3. That file's text, classified by the same function with the same root, is `runnable`, to a depth
     of 2.

  For `source` / `.`, the function names the helper defines (`^name() {` or `function name`) become
  recognised words for the rest of the block. Anything else stays `unrecognised-command`. A helper
  that writes (for example `advance-pipeline-lock.sh`) stays refused for its own reasons, which the
  reason string carries (`helper <path>: mutating: …`).
- **Helper syntax** (the author's decision, 2026-10-07). Today a real helper file cannot classify
  as runnable even when it only reads. Classified on `5f09b4da`, `qa-cycle.sh` is
  `unrecognised-command: shopt, <unparseable>` and `newest-numbered.sh` is `<unparseable>`. The
  causes are syntax, not writes: a function definition (`name() {` in command position), a `case`
  pattern line (`''|*[!0-9]*)`), an array append (`hits+=("$f")`), and `shopt -s nullglob`.
  `classifyBlock` learns these in **helper mode**: a definition is not an invocation, and its name
  becomes a recognised word for that text; a `case` pattern line is not a command; `name+=(…)` is an
  assignment; `shopt -s|-u <option>` and `local` are harmless builtins. Helper mode also skips the
  template-slot and unbound-variable checks, because a helper's `<dir>` comments and `$1` arguments
  are code and arguments, not slots. Writers stay refused: the same measurement over all 29
  `shared/resources/*.sh` helpers (excluding `*.test.sh`) shows most of them call `mktemp`, `mv` or
  `rm`. The command and its per-file output are in the plan.
- **`--diff-base <rev>`**. The engine reads `git diff -U0 <rev> -- <file>` for the file's changed
  line ranges, and marks each block `changed: true` when its line span overlaps one. The JSON
  summary gains `changed: { total, runnable, placeholder, mutating, executed }`. When
  `changed.total > 0` and `changed.executed === 0`, it emits the finding `changed-blocks-not-executed`
  listing each changed block's line and reason. It is reported in addition to the file-level
  finding, never instead of it. Without `--diff-base`, behaviour is unchanged.
- **Callers.** Step 4b and Phase 1.7 pass `--diff-base origin/<base>`, `--slot` for the
  work item's template values, and `--copy-as .agents:.agents` when the change set calls bundled
  helpers. They report the `changed` counts first.

### Important Clarifications

- `SAFE_COMMANDS` is not widened. The helper rule extends what counts as a known command only through
  the helper's own classification. `qa-runnable-prose-detection.md` states why the boundary is an
  allow-list; this task adds the helper rule there and nothing that relaxes it.
- `--bind` is unchanged: it still binds shell variables.

---

## 4. Scope

### In Scope

✅ `qa-execute-snippets.mjs`: `--slot`, helper-call recognition, `--diff-base` and the new finding.
✅ `qa-runnable-prose-detection.md`, qa-task Step 4b, qa-story Phase 1.7.
✅ `qa-execute-snippets.test.mjs` cases; bundled copies; CHANGELOG.

### Out of Scope

❌ Widening `SAFE_COMMANDS` or `COMMAND_RUNNERS`.
❌ Running helpers outside the temp copy, or helpers that are symlinks out of it.
❌ Rendering harness-time substitutions (`$1` etc.); that is guarded upstream
(`tests/fenced-bash-positional-params.test.js`).

---

## 5. Breaking Changes

None. New flags are opt-in. Without `--slot`, `--diff-base` or a helper inside the copy, every block
classifies as it does today. A block that was `mutating` for `unrecognised-command: bash` may now run
when its helper is runnable. That is the intended change, and it happens only inside the temp copy.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.191.plan.snippet-engine-runs-pipeline-blocks.md](task.191.plan.snippet-engine-runs-pipeline-blocks.md)

### Phase 1: `--slot` (obs #186)

**Risk**: Low. **Files**: `qa-execute-snippets.mjs`, its test.

- [ ] Parse `--slot NAME=VALUE` (repeatable, same validation shape as `--bind`).
- [ ] Substitute slots in block text before classification and execution.
- [ ] Reason `template slot: …` names the unfilled slots; the `zero-blocks-executed` detail names
  `--slot` or `--bind` by placeholder kind.

### Phase 2: Helper calls (obs #219, #278)

**Risk**: Medium (touches the safety boundary). **Files**: same. **Depends on**: Phase 1 (slot
substitution happens before the path is read).

- [ ] Helper mode in `classifyBlock`/`commandWords`: function definitions, `case` pattern lines,
  array appends, `shopt -s|-u`, `local`; no slot or unbound-variable check.
- [ ] `classifyBlock(code, bindings, { helperRoot, depth })`: recognise `bash`/`sh`/`source`/`.`
  only under the three conditions in § 3.
- [ ] Sourced helpers' function names become recognised words for the rest of that block.
- [ ] Reason strings carry the helper path and its own classification when refused.
- [ ] `runBlock` passes the temp copy as `helperRoot`.

### Phase 3: `--diff-base` and changed-block reporting (obs #219)

**Risk**: Low. **Files**: same.

- [ ] Changed line ranges from `git diff -U0 <rev> -- <file>` (run in the repo, not the copy).
- [ ] Per-block `changed`, the `changed` summary, and the `changed-blocks-not-executed` finding.
- [ ] Bad revision → exit 2, `bad-diff-base`, naming the revision.

### Phase 4: Callers, rule document, changelog

**Risk**: Low. **Files**: `qa-runnable-prose-detection.md`, `skills/qa-task/SKILL.md`,
`skills/qa-story/SKILL.md`, `CHANGELOG.md`. **Depends on**: Phases 1–3.

- [ ] Rule document: the helper rule and why it keeps the allow-list the boundary.
- [ ] Step 4b / Phase 1.7: pass `--diff-base`, `--slot`, `--copy-as .agents:.agents`; report
  `changed` first; keep the two blocks' parity (check `tests/qa-execution-step-parity*.test.*`).
- [ ] `npm run bundle`; CHANGELOG `[Unreleased]` › Changed citing obs #186, #219, #278.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-execute-snippets.mjs`
2. ✅ `shared/resources/qa-runnable-prose-detection.md`
3. ✅ `skills/qa-task/SKILL.md` — Step 4b
4. ✅ `skills/qa-story/SKILL.md` — Phase 1.7

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs`

### Files to Modify (Generated)

6. ✅ Bundled copies under `skills/*/references/`, regenerated by `npm run bundle`.

### Files to Modify (Documentation)

7. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Command**: `command node --test shared/resources/tests/qa-execute-snippets.test.mjs` (run alone;
  the file is load-sensitive).
- **Slots**: a block with `{task-directory}` and `--slot task-directory=docs/x` runs; without the
  slot it is `placeholder` with reason naming `{task-directory}`. A slot value carrying
  `; rm -rf x` makes the block `mutating` (substitution before classification).
- **Helpers**: in a temp copy holding `.agents/skills/s/references/read.sh` (only `cat`/`grep`), a
  block `bash .agents/skills/s/references/read.sh a` runs; a helper containing `mv` is refused with
  `helper …: mutating`. A block `source …/read.sh || exit 1; my_fn x` runs when `read.sh` defines
  `my_fn`. **Controls:** a `source "$X"` (variable path) stays refused; a path that symlinks outside
  the copy stays refused; a helper that sources a mutating helper (depth 2) stays refused.
- **Changed blocks**: in a temp git repo, a file with two blocks where the diff touches one →
  `changed.total: 1`; that block refused → `changed-blocks-not-executed` naming its line.

### Integration Tests

- Re-run the three incidents' shapes as fixtures: task.147's slot block, task.158's `bash …qa-cycle.sh`
  block, task.186's `source … next_numbered` block, each now executed.
- `npm test`, `npm run bundle:check`.

### Mutation proofs

- Drop the "helper text classifies runnable" condition → the `mv` helper control goes green when it
  must be red.
- Classify before substituting slots → the `rm -rf` slot case runs instead of being refused.

### Performance Tests

Not applicable: one extra classification per helper file, bounded by depth 2.

---

## 9. Success Criteria

### Functional

- [ ] A `{NAME}` block runs with `--slot NAME=…`, and without it is `placeholder` naming the slot —
  held by `qa-execute-snippets.test.mjs` (Phase 1).
- [ ] A slot value that adds a write makes the block `mutating` — held by the same test (Phase 1).
- [ ] `bash` / `source` of a runnable helper inside the copy runs, and sourced functions are
  recognised — held by the same test (Phase 2).
- [ ] A writing helper, a variable path, a path escaping the copy, and a depth-2 writing helper all
  stay refused — held by the same test (Phase 2).
- [ ] In helper mode the real `shared/resources/qa-cycle.sh` and `newest-numbered.sh` classify
  `runnable`, and the real `advance-pipeline-lock.sh` and `set-qa-phase.sh` classify `mutating` —
  held by the same test, reading the shipped files (Phase 2).
- [ ] With `--diff-base`, changed blocks are counted apart, and `changed-blocks-not-executed` fires
  when none of them ran — held by the same test (Phase 3).
- [ ] Step 4b and Phase 1.7 pass `--diff-base` and report `changed` first — held by the existing
  qa execution-step parity test, extended (Phase 4).

### Performance

- [ ] Not applicable: helper classification is bounded at depth 2; no test asserts timing.

### Code Quality

- [ ] `npm test`, `npm run bundle:check`, `prettier --check .` pass.
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/qa-task` and `skills/qa-story` pass.

### Migration

- [ ] CHANGELOG entry names `--slot`, the helper rule and `--diff-base`.

---

## 10. Risk Assessment

### High Risk Areas

None. All execution stays in the temp copy, and the snapshot sentinel still reports writes.

### Medium Risk Areas

1. **The helper rule widens what runs**
   - **Risk**: a helper that classifies runnable still does something unwanted (network, long run).
   - **Probability**: Low. **Impact**: Medium.
   - **Mitigation**: the helper is classified by the same allow-list, recursively; the temp copy and
     timeout still apply; the controls in § 8 pin the refusals.
2. **Parity between qa-task and qa-story Step 4b text**
   - **Mitigation**: edit both in one phase; the parity test.

### Low Risk Areas

1. **`git diff` from the wrong directory**: Phase 3 runs it in the repo, never the copy; a bad
   revision exits 2.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: Step 4b runs a block that writes outside the copy (sentinel fires); the qa execution
  tests red on `develop`.
- **Steps**: `git revert` the merge commit; `npm run bundle`; `npm test`.
- **Validation**: `qa-execute-snippets.test.mjs` green; Step 4b output matches pre-change shape.

### Partial Rollback (1-2 hours)

- Phase 2 (helper rule) reverts alone; Phases 1 and 3 are independent of it at runtime.

### Forward Fix (< 4 hours)

- A helper misclassified: tighten the path or function-name rule; the fixture gains the case.

### Rollback Triggers

- **Critical**: any block executed outside the temp copy.
- **Non-critical**: a runnable helper refused → forward fix.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #186, #219, #278 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: `--slot`

- [ ] Not started

### Phase 2: Helper calls

- [ ] Not started

### Phase 3: `--diff-base` and changed-block reporting

- [ ] Not started

### Phase 4: Callers, rule document, changelog

- [ ] Not started

---

## References

- Observation #186 — qa-execute-snippets --bind cannot fill {template} slots, so Step 4b never runs most pipeline blocks
- Observation #219 — qa-execute-snippets refuses the canonical 'bash .agents/skills/…/references/x.sh' helper call, so Step 4b executes no changed block that uses it
- Observation #278 — qa-execute-snippets cannot run blocks that source a bundled helper

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.191.qa.{n}.snippet-engine-runs-pipeline-blocks.md`,
  `task.191.gate.{n}.snippet-engine-runs-pipeline-blocks.yml`, bug reports as
  `task.191.bug.{N}.{name}.md`.
- This changes a safety boundary's input. QA's boundary rule applies to `classifyBlock`'s helper
  branch: probe it with blocks it must refuse as well as ones it must admit.

### Future Improvements

- A per-file `--slot` map read from the work item, so Step 4b binds slots without listing them.
