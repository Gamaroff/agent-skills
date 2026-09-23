---
id: task.144
title: "[Task 144] security-probe: a cli: entry form, so a multi-flag Node CLI's boundary can be executed instead of declared unverifiable"
type: task
description: "Add a `cli:<path>` entry form to shared/resources/security-probe.mjs that runs a Node CLI inside the engine's sandbox with an argv template carrying the case's input, scoring exit status as the verdict — so a boundary delivered as a multi-flag CLI (task.141's uat-status.mjs) is probed at QA and finalise instead of recorded as `probes_executed: 0`."
tags: [security-probe, review-security, finalise, qa-task, follow-up]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-23
updated: 2026-09-23
assignee:
estimated_effort_hours: 8
github_issue: 470
---

# Technical Task: security-probe — a `cli:` entry form

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.144.review.1.probe-engine-cli-entry-form.md` implemented 2026-09-23

**GitHub Issue**: [#470](https://github.com/Gamaroff/agent-skills/issues/470)

---

## 1. Overview

The probe engine (`shared/resources/security-probe.mjs`) reaches a boundary through three entry forms —
a JS export called with **one** argument, `shell:<path>` (a bash script with one positional), and
`shell-fn:<path>#<function>` (a sourced bash library). A boundary delivered as a **multi-flag Node
CLI** matches none of them, so the DoD security agent declines it and records a low-severity
`probe mode executed no candidates` FAIL. task.141's finalise hit exactly that: `uat-status.mjs`'s
`--env` guard, bug-link predicate and `--clear-note` refusal were all unverifiable, and acceptance
needed an operator override. This task adds a `cli:<path>` form that runs the CLI in the engine's
sandbox with an argv **template** whose `{input}` slot carries the case, and scores the exit status.

**Scope**: the entry form, its argv-template contract, its decline rules, tests, and the three documents
that name the entry forms (`probe-boundary-rule.md`, the two security prompts, and the qa-task / qa-story Step 3b paragraph).

**Key deliverables**:

1. `--entry cli:<path> --argv '<JSON array>'` in `security-probe.mjs`, reusing the case loop,
   `computeVerdict` and the record writer unchanged.
2. A first real consumer run recorded in the tests: `uat-status.mjs --run-path <id> --env {input}`
   against the `path` sink.
3. `probe-boundary-rule.md` §5, both security prompts and the qa-task / qa-story Step 3b paragraph
   list `cli:` beside `shell:` and `shell-fn:`, so a multi-flag CLI is no longer a declined sink.

---

## 2. Motivation

### Current Problems

1. **A multi-flag CLI boundary is unverifiable by construction.** The JS runner calls `fn(spec.input)`;
   `uat-status.mjs`'s decisions live in `runPathFor(existing, date, env)` (3 args),
   `checkRegistry({sections}, stories, cfg, exists)` (4 args) and non-exported predicates. task.141's
   DoD security agent recorded `boundary: true`, `probes_executed: 0` — and the operator accepted over it.
2. **The declined path pushes reviewers to by-hand probes** (`probe-boundary-rule.md` §5.1), which are
   the self-report the engine exists to remove, and which need a sandbox the reviewer must build.
3. **The workaround is per-deliverable**: task.139 made `isWorkItemDocument` probeable by exporting a
   one-argument function. That works once per predicate and changes the product's API to suit the
   probe; a CLI's real entry — its argv — is what users and agents actually call.

### Benefits of a `cli:` form

- **The boundary is probed through the interface that is actually used**, with the engine's sandbox
  (`sandboxEnv()`, sentinel directory, timeout) rather than a reviewer's shell.
- **`probes_executed` becomes a real count** for CLI deliverables, so the gate's
  `nfr_validation.security.evidence` can read `measured`.
- **No product API changes** to make a control reachable.

---

## 3. Technical Background

### Current Architecture

- `resolveEntry(entry, repoRoot)` distinguishes `shell-fn:` (`SHELL_FN_PREFIX`), `shell:`
  (`SHELL_PREFIX`) and `path#export`, with a containment check against `--repo-root`.
- **JS form**: a sandboxed child imports the module and calls the export with one argument; throw or
  `null`/`undefined`/`false` → `rejected`, anything else → `accepted`; a harness failure → `errored`
  (`OUTCOMES`).
- **Shell forms**: a `MATERIALISED_SINKS` case is written to a fixture directory and the script runs
  against it under each available shell via `runShellCase`, comparing `expected` with
  `compareExpected`; each (case, shell) run is one executed probe.
- **`probe-boundary-rule.md` §2** refuses putting `node` on `SAFE_COMMANDS` — that allow-list gates
  untrusted fenced prose. This task does **not** touch it: the `cli:` form runs inside the engine, the
  same way the JS form already runs a Node child.
- **§5.1** names "a multi-argument CLI" among the declined sinks.

### Target Architecture

- **`CLI_PREFIX = "cli:"`**, resolved and containment-checked like the others.
- **`--argv '<JSON array of strings>'`** (required with `cli:`, refused otherwise): each element is
  literal except the slots `{input}` (the case's input, as **one** argv element, never split or
  shell-parsed) and `{fixture}` (a fresh per-case fixture directory; materialised for a sink in
  `MATERIALISED_SINKS`, otherwise empty). Exactly one `{input}` is required; an unknown `{slot}` is
  refused.
- **Run**: `process.execPath <script> ...argv` via `spawnSync` with an argv array (no shell), stdin
  empty (`input: ""`, as the shell arm), the engine's timeout, cwd set to the case's fixture
  directory. **The fixture directory and the env are the shell arm's, not new ones**: the fixture is
  `mkdtempSync(join(workDir, "fixture-"))` inside the sandbox root (so the escape sentinel still
  sees a write beside it), and the env is `sandboxEnv({ cwd: fixtureDir })` with `HOME` and `TMPDIR`
  pointed inside the sandbox root and `LC_ALL=C` — a Node CLI can write to `os.homedir()` or
  `os.tmpdir()` exactly as a shell script can. The script's own directory is snapshotted around the
  run and a change is reported as an escape, as `runShellCase` does. Both the fixture and the env
  construction are factored into helpers the two arms share (review.1, I2).
- **Scoring**: a case **without** `expected` is scored by exit status — exit 0 → `accepted`,
  non-zero → `rejected`. A case **with** `expected` is validated with `expectedProblem` (a malformed
  one is declined, never scored) and compared with `compareExpected`; the match is then mapped
  through `direction` exactly as the shell arm maps it (hostile + match → `rejected`, hostile +
  mismatch → `accepted`, legitimate the other way round). Spawn failure / timeout / signal →
  `errored` in both cases. One executed probe per case — no shell multiplicity.
- **Refusals and declines** — two different things, and the form keeps them apart the way every
  other form does:
  - **`--argv` shape errors are argument errors**: `--argv` without `cli:`, `cli:` without `--argv`,
    non-JSON, a non-array, a non-string element, zero or two `{input}`, an unknown `{slot}`, a slot
    embedded in a larger element. `main` exits **2** with `bad-argv: <detail>` on stderr **before**
    anything runs, so no record is written. `runProbeSpec` (the library boundary `task.81` calls)
    applies the same validator and returns a named decline `bad-argv`, for a caller that bypasses
    the CLI.
  - **Entry problems stay declines** (`unverifiable`, exit 1), unchanged from the other forms: a path
    outside `--repo-root` is `outside-repo-root`; a script that is not a readable regular `.mjs` /
    `.js` file is `entry-not-probeable`.
- **Record**: each entry gains an `argv` key — the **template**, never the substituted input — or
  `null` for every other form. The record has **no `kind` field today** (`toRecordEntry` writes
  `sink`, `entry`, `name`, `call_site`, verdict/counts, `shells`, `fake_gh`, `ran_at`); the form is
  already named by the `entry` string's prefix, so no `kind` is added. The control key that names an
  entry file and dedupes the fold is `{sink, entry}` today, which would let two `cli:` probes of the
  same script with different templates (`--env {input}` vs `--clear-note {input}`) overwrite each
  other; for a `cli:` entry the key also carries the **argv skeleton** — its flags and bare
  positionals in order, with only the values of flags dropped — and for every other form it is
  byte-identical to today's so existing entry-file names do not move (review.1, I1). Two earlier
  keys each failed one way: the whole template kept per-run operands (a scratch `--cases-file`, a
  mkdtemp `--root`), so a re-run of one control recorded a second one (QA cycle 2, QA-1); the flag
  before `{input}` alone merged different controls that share an input flag (QA cycle 3, CR-1).

### Important Clarifications

- **Why not export one-argument adapters from each CLI** (the task.139 precedent)? It works per
  predicate and costs an API change each time; the argv is the interface agents and owners actually
  use, and one engine form covers every Node CLI in the repository.
- **Exit status as the verdict is a contract the CLI must honour**: a CLI that exits 0 while refusing
  is scored `accepted`. The form's documentation says so, and the consumer test uses a CLI
  (`uat-status.mjs`, whose refusals go through `die(msg, code)`) that honours it.
- **stdin-reading CLIs are out of scope and are not detected.** stdin is empty, so such a CLI reads
  EOF and is scored on whatever it then does; `probe-boundary-rule.md` §5 states that a CLI taking
  its input on stdin is not a `cli:` target. Detecting one reliably is its own problem.

---

## 4. Scope

### In Scope

✅ `cli:` entry form, `--argv` template with `{input}` / `{fixture}` slots, scoring, declines —
`shared/resources/security-probe.mjs`
✅ Tests in `shared/resources/tests/security-probe.test.mjs`, including a real run against
`skills/qa-next/scripts/uat-status.mjs --run-path … --env {input}`
✅ `shared/resources/probe-boundary-rule.md` (§5 entry forms; §5.1 no longer lists "a multi-argument
CLI" as declined), `finalise-dod-security-prompt.md`, `security-review-prompt.md`, and the Step 3b
boundary-rule paragraph in `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`
✅ `npm run bundle` for every skill that bundles these files; CHANGELOG

### Out of Scope

❌ Any change to `SAFE_COMMANDS` / `qa-execute-snippets.mjs` (refused by §2)
❌ stdin-reading or networked CLIs
❌ The qa-next state-file work — task.143 (independent)
❌ Retro-probing task.141 — its DoD is recorded; a future run of `uat-status.mjs`'s guards uses this form

---

## 5. Breaking Changes

None — API stable. `cli:` and `--argv` are additive; every existing entry form, flag and exit code
is unchanged. Record entries gain one key, `argv` (the template for a `cli:` run, `null` otherwise);
no existing record field changes meaning, and the control key — hence every existing entry-file name
— is unchanged for the JS, `shell:` and `shell-fn:` forms.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.144.plan.probe-engine-cli-entry-form.md](task.144.plan.probe-engine-cli-entry-form.md)

### Phase 1: Entry resolution and the argv template

**Risk**: Medium · **Files**: `shared/resources/security-probe.mjs`, its test

- [x] `CLI_PREFIX`; `resolveEntry` returns `kind: "cli"` with the same containment check
- [x] `--argv` parsing and validation: JSON array of strings, exactly one `{input}`, only known slots, no slot inside a larger element; refused without `cli:` and required with it — one validator, used by `main` (exit 2, `bad-argv`, no record) and by `runProbeSpec` (decline `bad-argv`)
- [x] Tests for each refusal (exit 2, named, no record written) and the `runProbeSpec` decline

**Dependencies**: none

### Phase 2: The run and the scoring

**Risk**: Medium · **Files**: `shared/resources/security-probe.mjs`, its test

- [x] Factor the per-case materialisation **and** the per-case env (sandbox `HOME`/`TMPDIR`, `LC_ALL=C`) out of `runShellCase` into helpers both arms call (no second copy)
- [x] `runCliCase`: per-case fixture dir inside `workDir` (materialised when the sink is in `MATERIALISED_SINKS`), argv substituted, `spawnSync(process.execPath, [script, ...argv])`, stdin empty, shared env, timeout; sandbox sentinel and script-dir snapshot around the run
- [x] Outcome: without `expected`, exit 0 accepted / non-zero rejected; with `expected`, `expectedProblem` then `compareExpected` mapped through `direction` as the shell arm; spawn/timeout/signal errored
- [x] Record entries carry `argv` (template, or `null`); the control key includes the argv skeleton for `cli:` entries only; totals unchanged in shape
- [x] Tests: a fixture CLI that refuses correctly (`engages`), one whose guard lets one hostile case through (`present-but-inert`), one that accepts everything (`absent`), one that crashes (`errored` → `unverifiable`)

**Dependencies**: Phase 1

### Phase 3: First real consumer

**Risk**: Low · **Files**: `shared/resources/tests/security-probe.test.mjs`

- [x] Probe `skills/qa-next/scripts/uat-status.mjs` with argv `["--root","<prepared registry root>","--run-path","D.1","--env","{input}"]` over the `path` sink, cases from `--cases-file`, against a fixture registry; assert `executed > 0` and record the verdict the engine computes. `--root` is the prepared registry, not `{fixture}` — the registry must exist before the run, and `path` is not a materialised sink. (task.143 has not landed: today `runPathFor` refuses only a `-NN` suffix, so a hostile `x-02` is rejected while `../x` and `a/b` are accepted — the expected current verdict is `present-but-inert`. Measure it, do not assume it; task.143 updates the assertion when it lands.)

**Dependencies**: Phase 2

### Phase 4: Documents and bundling

**Risk**: Low · **Files**: `shared/resources/probe-boundary-rule.md`, `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/security-review-prompt.md`, `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` (Step 3b boundary paragraph), `CHANGELOG.md`, bundled `references/` copies

- [x] §5 lists `cli:` with its argv-template rule and exit-status contract; §5.1 drops "a multi-argument CLI" from the declined list
- [x] Both security prompts gain a `cli:` invocation beside the `shell:` / `shell-fn:` ones; the qa-task and qa-story Step 3b paragraphs name it
- [x] `npm run bundle`; `bundle --check` clean
- [x] CHANGELOG `[Unreleased]` citing `(task 144)`

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` — `CLI_PREFIX`, `--argv`, `runCliCase`, resolution, record `kind`

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/security-probe.test.mjs` — refusals, fixture CLIs, the `uat-status.mjs` consumer run

### Files to Modify (Documentation)

3. ✅ `shared/resources/probe-boundary-rule.md` — §5, §5.1
4. ✅ `shared/resources/finalise-dod-security-prompt.md` — a `cli:` invocation beside `shell:` / `shell-fn:`
5. ✅ `shared/resources/security-review-prompt.md` — the same, and its routing rule ("a non-JS entry point is routed to …")
6. ✅ `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Step 3b boundary-rule paragraph
7. ✅ `CHANGELOG.md`
8. ✅ Bundled `skills/*/references/` copies — regenerated by `npm run bundle`, never hand-edited

### Files to Add (Tests)

9. ✅ `shared/resources/tests/fixtures/security-probe/cli-{refuser,inert,accept-all,crasher,echo,writes-home,hangs}.mjs` — seven fixture CLIs: engages, present-but-inert, absent, crash, argv/env echo, a HOME write, a hang

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Refusals** (exit 2, `bad-argv`, no record): `--argv` without `cli:`; `cli:` without `--argv`;
  zero or two `{input}`; an unknown slot; a slot inside a larger element; a non-array or non-string
  element. **Declines** (exit 1, named): a path outside `--repo-root`; a non-`.mjs`/`.js` script.
- **Record**: `argv` holds the template, not the input; two different controls (different flags, dispatch or subcommand) against one script produce
  two entries, a re-run of one flag with a different path operand replaces its entry; a JS /
  `shell:` / `shell-fn:` entry's file name is unchanged.
- **Scoring with `expected`**: a case carrying `expected` is compared, not exit-scored.
- **Scoring**: three fixture CLIs under `shared/resources/tests/fixtures/` — correct refuser,
  inert (rejects some hostile input, lets one through), accept-all, crasher — yield `engages`,
  `present-but-inert`, `absent`, `unverifiable` respectively. (An accept-all CLI rejects nothing, so
  `computeVerdict` scores it `absent`; `present-but-inert` needs a control that demonstrably rejects
  *something* — develop, 2026-09-23.)
- **Argv integrity**: a case input containing spaces, quotes, `$(…)` and a leading `-` reaches the CLI
  as one element, byte-identical (the CLI echoes `process.argv` to a sentinel file).
- **Sandbox**: the child's env carries only `sandboxEnv()` keys; nothing is written outside the fixture.

### Integration Tests

- The `uat-status.mjs` consumer run (Phase 3), `probes_executed > 0` in the record.

### Contract Tests

- Existing JS, `shell:` and `shell-fn:` tests pass unchanged; `bundle --check` clean.

---

## 9. Success Criteria

### Functional

- [x] `--entry cli:<path> --argv '[…{input}…]'` runs every corpus case for the sink and writes a record with `probes_executed` equal to the case count
- [x] A correct refuser scores `engages`, an inert guard `present-but-inert`, an accept-all `absent`, a crasher `unverifiable`
- [x] Every malformed `--argv` / `cli:` combination exits 2 with `bad-argv` and writes no record; an entry outside `--repo-root` or not a `.mjs`/`.js` regular file is a named decline (`outside-repo-root` / `entry-not-probeable`), as for every other form
- [x] Two different `cli:` controls on one script (a different guarded flag, dispatch flag or subcommand) land in two record entries, not one; a re-run of one control with a different path operand replaces its own entry
- [x] A case input reaches the CLI as exactly one argv element, byte-identical

### Performance

- [x] A corpus run against `uat-status.mjs` completes within the engine's existing per-case timeout budget
- [x] No new network access; the child runs under `sandboxEnv()`

### Code Quality

- [x] Every new test mutation-proved
- [x] `qa-execute-snippets.test.mjs` "no interpreter is on the snippet allow-list" still green (§2 untouched)
- [x] `npm test`, `bundle --check`, `check:generated`, Prettier clean

### Migration

- [x] `probe-boundary-rule.md` §5.1 no longer lists a multi-argument CLI as declined, and §5 states the exit-status contract
- [x] CHANGELOG `[Unreleased]` cites `(task 144)`

---

## 10. Risk Assessment

### High Risk Areas

1. **A general-purpose interpreter launched from the engine**
   - Risk: the form becomes a way to run arbitrary Node from probe input.
   - Probability: Low · Impact: High
   - Mitigation: the script path is containment-checked and fixed by `--entry`; case input only ever
     fills one argv element; no shell; `sandboxEnv()`; §2's refusal (snippet allow-list) is untouched
     and its test stays green.
   - Rollback: remove the `cli:` arm — additive, nothing depends on it.

### Medium Risk Areas

1. **Exit status is a weak verdict for a CLI that exits 0 on refusal** — documented as the form's
   contract; `expected` (stdout/stderr/paths) is available for CLIs that need it.
2. **Bundled copies drift** — `npm run bundle` plus `bundle --check` in CI.

### Low Risk Areas

1. Record readers meeting `kind: "cli"` — additive value in an existing field.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: any existing probe test red; `qa-execute-snippets` allow-list test red.
- **Steps**: revert the PR; re-run `npm run bundle`.
- **Validation**: `command node --test shared/resources/tests/security-probe.test.mjs` green.

### Partial Rollback

- Keep Phases 1–3, revert Phase 4's prose if a consumer skill misreads the new form.

### Forward Fix

- A scoring edge case (a CLI that exits 0 on refusal): add `expected` to the case rather than changing the form.

### Rollback Triggers

- **Critical**: the form can be driven to execute anything other than the `--entry` script.
- **Non-critical**: documentation wording — fix forward.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-23 | 1.0     | Initial draft | create-task |
| 2026-09-23 | 1.1     | Review passed (8/10) — 1 critical + 6 important fixed: record has no `kind` field (adds `argv`), cli: control key carries the template, fixture/env reuse the shell arm sandbox, stdin out of scope, `expected` scoring defined, exit-2 vs decline split | review-task |
| 2026-09-23 |         | Status → ready-for-development | review-task |
| 2026-09-23 |  | Implemented — 15 files (plus bundled copies), 15 tests, 14 mutations proved; accept-all verdict corrected to absent | develop |
| 2026-09-23 |  | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-09-23 |  | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-09-23 |  | QA gate CONCERNS (90/100) — 1 finding | qa-task |

---
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: Entry resolution and the argv template
- [x] Phase 2: The run and the scoring
- [x] Phase 3: First real consumer
- [x] Phase 4: Documents and bundling

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-23
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.144.qa.3.probe-engine-cli-entry-form.md](./task.144.qa.3.probe-engine-cli-entry-form.md)
- **Gate File**: [task.144.gate.3.probe-engine-cli-entry-form.yml](./task.144.gate.3.probe-engine-cli-entry-form.yml)
- **Previous**: [qa.2](./task.144.qa.2.probe-engine-cli-entry-form.md) · [gate.2](./task.144.gate.2.probe-engine-cli-entry-form.yml) · [qa.1](./task.144.qa.1.probe-engine-cli-entry-form.md) · [gate.1](./task.144.gate.1.probe-engine-cli-entry-form.yml)

### Test Coverage Summary

- **Tests Executed**: 3963 (fast gate) — cycle 2 fix tests mutation-proved
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

- CR-1 (medium): keying a `cli:` control on its guarded flag alone merges distinct controls that share it (`--set … --note {input}` / `--accept … --note {input}`).

---

## References

- task.141 DoD — [`task.141.dod.1.qa-next-targeted-item.md`](../task.141.qa-next-targeted-item/task.141.dod.1.qa-next-targeted-item.md), Step 3 (`probes_executed: 0`, operator override)
- task.128 (the `shell:` form), task.136 (the `shell-fn:` form), task.139 (the one-argument-export precedent)
- [`probe-boundary-rule.md`](../../../shared/resources/probe-boundary-rule.md) §2, §5, §5.1
- task.143 — qa-next state file (independent)

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, never the bundled `references/` copies — `npm run bundle` would revert them.
- QA artifacts land in this directory: `task.144.qa.{N}.probe-engine-cli-entry-form.md`, `task.144.gate.{N}.probe-engine-cli-entry-form.yml`.
