---
id: task.180
title: "[Task 180] security-probe: a fence: entry form for a fenced bash block in a step doc"
type: task
description: "Add a `fence:<doc>#<heading>` entry form to shared/resources/security-probe.mjs that extracts the first bash block under a heading on every run, substitutes the case's input into a named placeholder, applies an optional per-case env and fixture files, and scores exit status as the verdict. A boundary shipped as a fenced block in a step doc is then probed by the engine instead of through a hand-written wrapper."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-03
updated: 2026-10-03
assignee:
estimated_effort_hours: 8
github_issue: 560
---

# Technical Task: security-probe — a `fence:` entry form

**Status:** Planned

**GitHub Issue**: [#560](https://github.com/Gamaroff/agent-skills/issues/560)

---

## 1. Overview

This repository ships many of its boundaries as fenced bash blocks inside Markdown step docs: preconditions, refusals and guards that live in `shared/resources/*.md`. The probe engine reaches four entry forms (`path#export`, `shell:`, `shell-fn:`, `cli:`), and none of them reaches a fenced block. So every `/finalise` on such a change trips the security agent's zero-guard (`boundary: true`, `probes_executed: 0`), and the orchestrator hand-writes a one-off wrapper under `.claude/state/`. This task adds a fifth form, `fence:<doc>#<heading>`, so the engine runs the shipped block itself.

**Key deliverables:** the `fence:` entry form and its `--slot` flag in `security-probe.mjs` (and its bundled copies); an optional per-case `fixture` field (env and files); the routing sentence in every document that lists the entry forms; tests, including task.167's 13 cases re-run through the new form.

---

## 2. Motivation

### Current Problems

- **Every fenced-block boundary fails the zero-guard at finalise.** The security agent is read-only, records `probes_executed: 0`, and returns a low-severity FAIL that the orchestrator must resolve by hand. It happened on task.159 (step-8 check 4) and on task.167 (the fast-gate precondition, 2026-10-03).
- **The by-hand harness is rebuilt every time.** `t159-probe-wrapper.mjs#check4Admits` and `t167-probe-wrapper.mjs#preconditionAdmits` each re-derive fence extraction, placeholder substitution, fixture setup, `HOME` isolation and the verdict mapping (both recorded in their DoDs and run records).
- **The record names an entry nobody can re-run.** Both wrappers live under the gitignored `.claude/state/`, so `task.159.dod.1.security.run.json` and `task.167.dod.1.security.run.json` name an entry path that does not exist in any other checkout.

### Benefits of the Fix

- The security agent's Step 1b routes a fenced-block boundary to an engine form, so the zero-guard stops firing on a boundary the engine can reach.
- A committed record names an entry (`fence:shared/resources/…md#…`) that resolves in every checkout, against the shipped text.
- One extraction rule is used for fenced blocks, reusing `qa-execute-snippets.mjs`'s fence parser rather than adding a third.

---

## 3. Technical Background

### Current Architecture

- `resolveEntry` (`shared/resources/security-probe.mjs:371`) recognises `cli:` (`CLI_PREFIX`, `:485`), `shell-fn:` (`SHELL_FN_PREFIX`, `:483`) and `shell:` (`SHELL_PREFIX`, `:481`), and otherwise parses `path#exportName`. It returns `{ ok, kind: "cli" | "shell-fn" | "shell" | "js", entryPath, … }` after the realpath containment check.
- Shell cases run through `runShellCase` (`:1538`), which needs a sink in `MATERIALISED_SINKS` and compares a case's `expected`. CLI cases run through `runCliCase` (`:1784`), where **exit status is the verdict** and `isLaunchFailure` (`:1353`) turns a crash into `errored`.
- `computeVerdict` (`:817`) and the record writer (`recordRun`, `:2207`; `toRecordEntry`, `:2030`) are form-independent.
- A case is `CASE_FIELDS` (`id, sink, input, why, correct, direction`) plus `OPTIONAL_CASE_FIELDS` = `["expected"]` (`shared/resources/security-input-corpus.mjs:43`, `:67`). `input` must be a string (`security-probe.mjs:1808`).
- Per-case environments come from `caseEnv` (`:1474`), shared by the shell and `cli:` arms; per-case children run through `watchedSpawn` (`:1491`), which carries the escape sentinels.
- Fenced blocks are already parsed by `extractBlocks(markdown)` (`shared/resources/qa-execute-snippets.mjs:59`), which returns `{ line, code, … }` per block. `sandboxEnv` (`:1425`) and `zshAvailable` (`:1343`) live in the same module.
- `evals/shared/tests/fast-gate-precondition.test.mjs` carries its own `bashBlockUnder(doc, heading)`. That is a second extractor; it is left as is (see Out of Scope).

**Existing mechanisms of this kind** (§ 3.5): the engine has four entry forms and one case-runner per family. `fence:` **extends** the shell family. It materialises the block as a script in the sandbox and runs it with the CLI arm's exit-status verdict, reusing `probeShells` (`:738`), `caseEnv`, `watchedSpawn`, `isLaunchFailure`, `compareExpected` (`:757`, when a case carries `expected`) and the record writer. No second verdict path is added.

### Target Architecture

```
--entry 'fence:<doc.md>#<heading>' --slot <placeholder> [--cases-file <json>]
```

- `resolveEntry` accepts `fence:path#heading`. The path must be a `.md` file inside the repo root (same containment as the other forms), and the heading must be non-empty. It returns `{ ok: true, kind: "fence", entryPath, heading }`.
- **Extraction on every run.** The engine reads the doc, finds the first line whose text equals the heading, and takes the first `bash` block from `extractBlocks` whose `line` falls after it and before the next heading of the same or a higher level. A missing heading or a missing block is a named `entry-not-probeable` decline, never an `absent` verdict.
- **Input.** `--slot <placeholder>` names the literal token in the block (for example `<fastGateCommand>`). Each case's `input` replaces every occurrence through a replacer function, never a replacement string (`$&` safety). If the token is absent from the block, the run is declined (a slot that substitutes nothing tests nothing).
- **Per-case fixture.** A new optional case field `fixture: { env?: {k: v}, files?: {relpath: content} }`, added to `OPTIONAL_CASE_FIELDS`. Files are written into the case's work directory; a path that is absolute or escapes it is a declined case. `env` merges over `caseEnv` (`security-probe.mjs:1474`: `sandboxEnv()` plus a sandbox `HOME`, `TMPDIR` and `LC_ALL=C`), and never replaces `HOME` or `TMPDIR`.
- **Verdict.** The block runs as a script under each shell `probeShells()` returns, with cwd set to the fixture. Exit 0 is `accepted`, any other exit is `rejected`, and a launch failure or timeout is `errored`. A case that carries `expected` is compared exactly as the shell arm does.
- **Record.** The entry kind is `fence`. The record names `fence:<doc>#<heading>`, which resolves in every checkout.

### Important Clarifications

- **Why `--slot` and not a JSON `input`?** `input` stays a string, so corpus sinks still work unchanged, and the per-case env and files travel in the new `fixture` field. This was the shape task.167's 13 cases needed.
- **Not a snippet runner.** `qa-execute-snippets` runs untrusted prose behind an allow-list. Here the caller names one block by heading, the **engine** chooses the command (`bash <script>`), and values cross as files and argv. `node` stays off `SAFE_COMMANDS` (`probe-boundary-rule.md` §2).

---

## 4. Scope

### In Scope

✅ The `fence:` entry form, the `--slot` flag and the optional `fixture` case field in `shared/resources/security-probe.mjs` and `security-input-corpus.mjs`, then `npm run bundle`
✅ Engine tests in `shared/resources/tests/security-probe.test.mjs`
✅ The routing sentence in each document that lists the entry forms (population in § 7)
✅ Re-running task.167's cases through `fence:` against the real step-3 doc, as a committed test
✅ A CHANGELOG `[Unreleased]` › Added entry

### Out of Scope

❌ `shell-argv:` for multi-flag shell scripts (observation #189). It is a sibling form with a different input shape and gets its own task.
❌ Making one-string shell scripts sourceable (observation #257), which is a `probe-boundary-rule` change.
❌ Rewriting finalise's zero-guard gap list (observation #232).
❌ Replacing `fast-gate-precondition.test.mjs`'s own `bashBlockUnder` with the engine form.

---

## 5. Breaking Changes

None. The four existing entry forms, the case schema's required fields and the record format are unchanged. `fixture` is an optional field, and corpus cases do not carry it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.180.plan.probe-engine-fence-entry-form.md](task.180.plan.probe-engine-fence-entry-form.md)

### Phase 1: Tests first (red)

**Risk**: Low
**Files**: `shared/resources/tests/security-probe.test.mjs`

- [ ] `resolveEntry`: `fence:doc.md#Heading` resolves to `kind: "fence"`; `fence:doc.md` (no heading), `fence:x.js#H` (not Markdown) and a path outside the root are refused as `bad-entry` / `outside-repo-root`
- [ ] Extraction: a missing heading and a heading with no bash block under it each decline as `entry-not-probeable`, naming which
- [ ] Verdict: an admitting block scores accepted and a refusing one rejected; a block that `exit 3`s with no `expected` scores rejected; a launch failure scores errored
- [ ] Slot: `--slot` names a token absent from the block → declined; an input containing `$&` is substituted literally
- [ ] Fixture: `env` reaches the block; `files` are written into the case directory; a file path that escapes it is declined
- [ ] Fresh read: editing the block between two runs changes the verdict (the engine never caches the text)

### Phase 2: The entry form

**Risk**: Medium
**Files**: `shared/resources/security-probe.mjs`, `shared/resources/security-input-corpus.mjs`

- [ ] `FENCE_PREFIX = "fence:"` and the `resolveEntry` branch
- [ ] `extractFencedBlock(doc, heading)`, reusing `extractBlocks` from `qa-execute-snippets.mjs`
- [ ] `runFenceCase`: substitute the slot, write the script and fixture into the case work directory, run under `probeShells()`, score exit status, reuse `isLaunchFailure` and `compareExpected`
- [ ] `--slot` in `main()`, required with `fence:` and refused with every other form; `fixture` added to `OPTIONAL_CASE_FIELDS` and validated
- [ ] `npm run bundle`; `bundle:check` reports 0 problems

### Phase 3: Routing and proof

**Risk**: Low
**Files**: the § 7 population, `shared/resources/tests/security-probe.test.mjs`, `CHANGELOG.md`

- [ ] Each document that lists the entry forms names `fence:` (five forms), and the security prompt's Step 1b signal routes a fenced-block boundary to it
- [ ] A committed test runs task.167's 13 cases through `fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration` with `--slot '<fastGateCommand>'`: verdict `engages`, executed 13 × the shells present, reproduced 0
- [ ] CHANGELOG `[Unreleased]` › Added entry citing (task 180) and observation #261

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. `shared/resources/security-probe.mjs` — the `fence:` form, `--slot`, `runFenceCase`
2. `shared/resources/security-input-corpus.mjs` — `fixture` in `OPTIONAL_CASE_FIELDS`

### Files to Modify (Routing — the documents that list the entry forms)

Measured with `git grep -ln 'cli:<path\|cli:path\|`cli:`' -- 'shared/resources/*.md' 'skills/*/SKILL.md'` on 2026-10-03:

3. `shared/resources/probe-boundary-rule.md` — §5 "four entry forms" becomes five
4. `shared/resources/finalise-dod-security-prompt.md` — the Step 1b signal and the Step 4 invocation
5. `shared/resources/security-review-prompt.md`
6. `skills/qa-task/SKILL.md`
7. `skills/qa-story/SKILL.md`
8. `skills/review-security/SKILL.md`
9. `shared/resources/probe-boundary-signals.mjs` — the Step 1b signal text (`:58`) routes a bash boundary to `shell:` only; it gains the fenced-block route (not matched by the grep above, which keys on `cli:`)

### Files Regenerated

10. Every bundled `references/` copy of the files above, by `npm run bundle`, never hand-edited

### Files to Modify (Tests)

11. `shared/resources/tests/security-probe.test.mjs`
12. `shared/resources/tests/probe-boundary-signals.test.mjs`, only if its assertions pin the signal text

### Files to Modify (Documentation)

13. `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `resolveEntry`, `extractFencedBlock`, `runFenceCase`, the `--slot` / `fixture` validation, and `main()` flag handling.
- **Command**: `command node --test shared/resources/tests/security-probe.test.mjs`
- **Shells**: bash, plus zsh where `zshAvailable()` (the existing pattern).

### Integration Tests

- The task.167 cases through `fence:` against the real step-3 doc (Phase 3). The test also asserts discrimination: against a copy of the block with `--loglevel=notice` removed (written into a temp doc, so the shipped file is never mutated), the same cases over-block the 4 silent-environment legitimate cases.

### Mutation proof

| Revert | Test that must go red |
| --- | --- |
| Extraction ignores the heading (takes the doc's first bash block) | the extraction test for a doc with two headings |
| The slot replacer becomes a replacement string | the `$&` substitution test |
| `fixture.files` path check removed | the escaping-path decline test |

### Performance Tests

Not applicable. Each case is one spawn per shell under the shared `spawnBudget`; no new timeout literal (`tests/test-harness-concurrency.test.js` guards this).

### Consumer Tests

`npm run ci` stays green; the bundled copies are byte-identical to their sources (`bundle:check`).

---

## 9. Success Criteria

### Functional

- [ ] `fence:<doc>#<heading>` with `--slot` probes a fenced bash block and scores exit 0 as accepted and non-zero as rejected (Phase 2; tests in Phase 1)
- [ ] A missing heading or a missing bash block under it is a named `entry-not-probeable` decline, not a verdict
- [ ] The optional `fixture` field delivers `env` and `files` to the case, and a file path outside the case directory is declined
- [ ] task.167's 13 cases through `fence:` against the shipped step-3 doc give verdict `engages` with 0 reproduced, and the copy without the flag over-blocks the 4 silent-environment cases
- [ ] The four existing entry forms' tests still pass unchanged

### Performance

- [ ] No new `timeout: <number>` literal; spawns use the shared `spawnBudget` (`tests/test-harness-concurrency.test.js`)

### Code Quality

- [ ] Each mutation in § 8 is observed red, and the red output is quoted in the implementation report
- [ ] `npm run ci:fast`, `bundle:check` (0 problems), `lint:shell` and `npm run validate -- skills/{qa-task,qa-story,review-security,finalise}/` are clean

### Migration

- [ ] Every document in the § 7 routing population names `fence:`, re-measured with the same `git grep` command
- [ ] CHANGELOG `[Unreleased]` cites (task 180)

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **Executing doc text widens what the engine runs**
   - **Risk**: a `fence:` entry could be pointed at any fenced block in the repo.
   - **Probability**: Low. The caller names one block explicitly; this is the same trust class as `shell:` naming one script.
   - **Impact**: Medium. A block with side effects would run in the sandbox.
   - **Mitigation**: the realpath containment check, `sandboxEnv`, the per-case work directory and the escape detector all apply unchanged. `probe-boundary-rule.md` §2 is restated for the new form.

2. **Heading matching is ambiguous**
   - **Risk**: two identical headings in one doc.
   - **Probability**: Low.
   - **Mitigation**: refuse an ambiguous heading as `entry-not-probeable`, naming both line numbers.

### Low Risk Areas

1. **Routing population drifts**: a later document lists the entry forms without `fence:`. Mitigation: § 7 records the command, and `probe-boundary-signals` already centralises the routing text.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: an existing entry form's tests regress, or `bundle:check` fails on main.

**Steps**:
1. Revert the merge commit.
2. `npm run bundle` and `npm run bundle:check`.

**Validation**: `command node --test shared/resources/tests/security-probe.test.mjs` passes as before.

### Partial Rollback (1–2 hours)

**When to Use**: the engine form is sound, but a routing sentence misleads an agent.
**Steps**: revert the routing edits only; keep the form.

### Forward Fix (< 4 hours)

**When to Use**: a heading-matching or slot edge case.
**Approach**: add the case to the Phase 1 tests and fix in place.

### Rollback Triggers

**Critical (Immediate Rollback)**: a regression in `path#export`, `shell:`, `shell-fn:` or `cli:`.

**Non-Critical (Forward Fix)**: a `fence:` edge case that declines when it should run.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                | Author      |
| ---------- | ------- | ------------------------------------------ | ----------- |
| 2026-10-03 | 1.0     | Initial draft — cut from observation #261  | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Tests first (red)
- [ ] `resolveEntry`, extraction, verdict, slot, fixture and fresh-read cases

### Phase 2: The entry form
- [ ] `fence:`, `--slot`, `fixture`, `runFenceCase`
- [ ] Bundle regenerated; `bundle:check` clean

### Phase 3: Routing and proof
- [ ] Routing population updated
- [ ] task.167 cases through `fence:`
- [ ] CHANGELOG entry

---

## References

- Observation #261 — security-probe has no entry form for a fenced bash block in a step doc
- [task.144](../task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md), the `cli:` form (exit-status verdict)
- [task.136](../task.136.shell-fn-probe-entry-form/task.136.shell-fn-probe-entry-form.md), the `shell-fn:` form
- [task.167](../task.167.fast-gate-precondition-npm-loglevel/task.167.fast-gate-precondition-npm-loglevel.md), whose hand-written wrapper this replaces

---

## Notes

- Post-merge action (not a success criterion): set observation #261 to `actioned` once the PR merges.
- Related open observations kept out of scope: #189 (`shell-argv:`), #257, #232.
- QA report: `task.180.qa.{N}.probe-engine-fence-entry-form.md`; bug reports: `task.180.bug.{N}.{name}.md`; quality gate: `task.180.gate.{N}.probe-engine-fence-entry-form.yml`, all co-located in this directory.
