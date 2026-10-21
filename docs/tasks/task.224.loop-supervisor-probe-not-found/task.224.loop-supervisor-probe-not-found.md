---
id: task.224
title: "loop-supervisor: say when the probe script is not found"
type: task
description: "When no select-next.mjs exists under any searched path, or a configured probeScript is missing, the loop-supervisor probe reports which path it looked for instead of the misleading empty-output error, and the adapter table derives its default probe path from the candidate constant."
tags: [loop-supervisor, adapters, probe]
category: infrastructure
status: ready-for-review
priority: Medium
estimated_effort_hours: 8
created: 2026-10-21
updated: 2026-10-21
github_issue: 723
---

# Technical Task: loop-supervisor: say when the probe script is not found

**Status:** Ready for Review
**GitHub Issue**: [#723](https://github.com/Gamaroff/agent-skills/issues/723)
**Review**: ✅ All review recommendations from `task.224.review.1.loop-supervisor-probe-not-found.md` implemented 2026-10-21

---

## 1. Overview

When the probe script does not exist, the loop-supervisor probe reports "probe produced no output (exit 1)" with a hint about symlinks. That hint is wrong for this case. This task makes a missing probe script its own error, naming the path that was looked for and, for the default search, all three candidates. It also removes the repeated default-path literal from the adapter table.

**Scope**: `skills/loop-supervisor/references/adapters.js` and the one `runProbe` in `skills/loop-supervisor/scripts/run-loop.mjs`. This is a follow-up to task.214, from its QA report `task.214.qa.1.loop-supervisor-probe-script-resolution.md` (`recommendations.future`, CR-1 and CR-2).

**Key deliverables**: a not-found check that runs before the probe is spawned; the searched candidates recorded on the resolved adapter; the table default derived from `SELECT_NEXT`.

---

## 2. Motivation

### Current Problems

1. **A missing selector gets the wrong diagnosis (CR-1).** `firstExisting` returns the last candidate both when it exists and when nothing exists (`skills/loop-supervisor/references/adapters.js:238`, `return candidates[candidates.length - 1];`). The probe then runs `node skills/develop-next/scripts/select-next.mjs`, node writes "Cannot find module" to stderr, and `interpretProbe` (`adapters.js:63`) sees empty stdout. Run against an empty temp project on 2026-10-21, the result is `{"status":"error","reason":"probe produced no output (exit 1). select-next.mjs exits 0 silently when argv[1] does not realpath to the module — check the probe path is the real file, not a symlink into a different tree. …"}`. The operator is sent to look for a symlink problem that does not exist.
2. **A typo in a configured override fails the same way.** A `loopSupervisor.adapters.<name>.probeScript` that names a missing file reaches the same spawn and the same message.
3. **The default path is written three times (CR-2).** `"skills/develop-next/scripts/select-next.mjs"` appears at `adapters.js:256` and `:275` (the `develop-next` and `develop-batch` table entries), and again as the last entry of `PROBE_SCRIPT_CANDIDATES` (`"skills/" + SELECT_NEXT`, `adapters.js:216-221`). If one changes, the others do not.

### Benefits

1. A consumer with no selector installed is told which paths were searched and how to fix it (install the skills, or set the override).
2. An override typo names the configured path.
3. One definition of the default path.

---

## 3. Technical Background

### Current Architecture

- `const SELECT_NEXT = "develop-next/scripts/select-next.mjs";` (`adapters.js:216`) and `PROBE_SCRIPT_CANDIDATES` (`.agents/skills/`, `.claude/skills/`, `skills/` + `SELECT_NEXT`).
- `firstExisting(cwd, candidates, exists = fs.existsSync)` (`adapters.js:234`): the first candidate for which `exists(path.join(cwd, c))` holds, else the last candidate. It is exported and tested directly.
- `resolveAdapter(name, config, { cwd })`: for a `defaultProbe` entry, sets `merged.probeScript = firstExisting(cwd, PROBE_SCRIPT_CANDIDATES)` (`adapters.js:337`), then applies config overrides, so a configured `probeScript` replaces the searched value.
- `runProbe(adapter, opts, cwd, nodeBin)` (`run-loop.mjs:1037`): builds `adapter.probeArgs(...)`, spawns node with it (`run-loop.mjs:1042`), and passes the result to `interpretProbe`. Both `dry-run` (`run-loop.mjs:1125`) and the run loop (`run-loop.mjs:1361`) call it.
- `interpretProbe`'s empty-stdout branch (`adapters.js:79-87`) is right for its real case: `select-next.mjs` exiting 0 silently when `argv[1]` does not realpath to the module. That case and its message stay unchanged. `evals/loop-supervisor/unit/classify.test.mjs:330` uses the message as a fixture.

### Target Architecture

- A new exported `findExisting(cwd, candidates, exists)` returns the first existing candidate, or `null`. `firstExisting` becomes `findExisting(...) ?? candidates[candidates.length - 1]`, so its signature, return value and existing tests are unchanged.
- `resolveAdapter` uses `findExisting`. On a miss it sets `probeScript` to the default as today and also sets `probeSearched` to a copy of `PROBE_SCRIPT_CANDIDATES`. On a hit it sets `probeSearched: null`. A configured `probeScript` override resets `probeSearched` to `null`, because an override was never searched. Resolution still makes at most three `exists` calls.
- A new exported, pure `probeMissing(adapter, cwd, exists = fs.existsSync)` returns `null` when the adapter has no `probeScript` or the file exists under `cwd`. Otherwise it returns `{ status: "error", reason }`, and the reason begins `probe script not found: <probeScript>`. When `probeSearched` is set, the reason lists every searched path and names both fixes. Otherwise it names the configured override key.
- `runProbe` calls `probeMissing` after the no-probe check and before `spawnSyncCapture`, and returns its result when it is not `null`. A missing script is then never spawned.
- A new `const DEFAULT_PROBE_SCRIPT = "skills/" + SELECT_NEXT;` supplies the last candidate and both table entries (CR-2).

### Existing mechanisms this task sits beside

`interpretProbe` already turns spawn failures and timeouts into `status: "error"` (`adapters.js:66-75`). `probeMissing` sits **before** it, not inside it: `interpretProbe` sees only the spawn result, and by then the path is gone. The new check reuses the `{ status: "error", reason }` shape, so every reader of a probe result (dry-run JSON, the run loop's halt path) needs no change.

---

## 4. Scope

### In Scope

✅ `findExisting`, `probeMissing`, `DEFAULT_PROBE_SCRIPT` and the `probeSearched` field in `adapters.js`.
✅ The `probeMissing` call in `runProbe`.
✅ Unit tests in `evals/loop-supervisor/unit/adapters.test.mjs`, and one spawned dry-run test in `evals/loop-supervisor/unit/run-loop.test.mjs`.
✅ The README paragraph (`skills/loop-supervisor/README.md:172`) and the `loopSupervisor.adapters.<name>` row (`docs/reference/configuration.md:301`) gain one clause each about the not-found error. CHANGELOG `[Unreleased]` entry.

### Out of Scope

❌ `interpretProbe`'s empty-stdout message and its real symlink case.
❌ Checking `stateFile`, `lockFile` or `haltFile` existence; they are created on demand.
❌ The `generic` adapter, which has no probe.

---

## 5. Breaking Changes

None - API stable. Every existing export keeps its signature and return value. One observable output changes: when the probe script is missing, the probe's `reason` text is the new not-found message, not "probe produced no output". `status` is still `error`. This deliberately replaces task.214's criterion "the probe error is the one produced today" for the none-present case. The only other match for the old text is the fixture at `evals/loop-supervisor/unit/classify.test.mjs:330`, which tests the empty-stdout case this task leaves alone.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.224.plan.loop-supervisor-probe-not-found.md](task.224.plan.loop-supervisor-probe-not-found.md)

### Phase 1: The not-found check and the single default

**Risk:** Low. **Dependencies:** task.214 (merged).

- [x] Add `DEFAULT_PROBE_SCRIPT` and use it for the last candidate and both table entries (CR-2).
- [x] Add `findExisting` (first existing candidate, else `null`), and redefine `firstExisting` on top of it.
- [x] In `resolveAdapter`, set `probeSearched` to a copy of the candidates on a miss and `null` on a hit, and reset it to `null` when a `probeScript` override is applied.
- [x] Add `probeMissing(adapter, cwd, exists)`. It returns `null` for no `probeScript` or an existing file. For a missing file it returns `{ status: "error", reason }`: the reason starts `probe script not found: <probeScript>` and lists every `probeSearched` path when set, else names `loopSupervisor.adapters.<name>.probeScript`.
- [x] Export `findExisting`, `probeMissing` and `DEFAULT_PROBE_SCRIPT`.

### Phase 2: Wire-up, tests, docs

**Risk:** Low. **Dependencies:** Phase 1.

- [x] In `runProbe`, return `probeMissing(adapter, cwd)` when it is not `null`, before spawning.
- [x] Unit tests for `findExisting`, `probeSearched`, `probeMissing` and the CR-2 equality (§ 8). Rename the test at `adapters.test.mjs:301` ("…so the probe fails as it always did"): the resolved path is still the default, but the probe no longer fails as it did.
- [x] One spawned dry-run test with `--adapter develop-next` in an empty project (§ 8).
- [x] README and configuration clauses, CHANGELOG entry. Run the loop-supervisor suites and `npm run validate -- skills/loop-supervisor/`.

---

## 7. Files Summary

The default-path literal population is measured by `git grep -n 'skills/develop-next/scripts/select-next.mjs' -- skills/loop-supervisor evals/loop-supervisor` from the repository root. On 2026-10-21 it found the two table entries (`adapters.js:256`, `:275`), a header comment (`adapters.js:35`, which cites a line in `select-next.mjs` and stays), and test expectations in `adapters.test.mjs`. The tests assert the behaviour, not that count.

### Files to Modify (Core Implementation)

1. `skills/loop-supervisor/references/adapters.js`
2. `skills/loop-supervisor/scripts/run-loop.mjs` (`runProbe` only)

### Files to Modify (Tests)

3. `evals/loop-supervisor/unit/adapters.test.mjs`
4. `evals/loop-supervisor/unit/run-loop.test.mjs`

### Files to Modify (Documentation)

5. `skills/loop-supervisor/README.md`
6. `docs/reference/configuration.md`
7. `CHANGELOG.md`

---

## 8. Testing Strategy

### Unit Tests

- **Scope:**
  - `findExisting` returns `null` for an empty temp directory and the first existing candidate otherwise.
  - `resolveAdapter` in an empty temp `cwd` gives `probeSearched` equal to `PROBE_SCRIPT_CANDIDATES`. With one candidate present it gives `null`. With a `probeScript` override it gives `null` even when nothing exists.
  - `probeMissing` covers the four cases: no `probeScript` (generic adapter), an existing file, a missing searched default, and a missing override.
  - For both adapters, `ADAPTERS[name].probeScript === PROBE_SCRIPT_CANDIDATES[PROBE_SCRIPT_CANDIDATES.length - 1]` (CR-2).
  - `probeMissing` with a counting injected `exists` makes exactly one call for an adapter with a `probeScript`, and none for the `generic` adapter (holds the Performance criterion).
- **Command:** `command node --test evals/loop-supervisor/unit/adapters.test.mjs evals/loop-supervisor/unit/run-loop.test.mjs`.
- **Every test passes a temp `cwd`.** The gitignored `.agents/skills` symlink makes a repository-root resolve differ between a laptop and CI (task.214 § 3).
- **Mutation-prove:**
  - Make `probeMissing` always return `null`: the not-found unit tests and the dry-run test go red.
  - Drop the override reset of `probeSearched`: the override test goes red.
  - Remove the `runProbe` call: the dry-run test goes red.

### Integration Tests

- A spawned `dry-run --adapter develop-next` in an empty temp project, extending the `dryRun` helper (`run-loop.test.mjs:739`) to take an adapter. It asserts that the printed JSON has `ok: false`, that the probe `status` is `error`, and that the `reason` starts `probe script not found:` and contains each of the three candidates. That last part distinguishes the new branch from the spawn branch, whose reason is "probe produced no output".
- Its control: the same dry-run with a stub `.agents/skills/develop-next/scripts/select-next.mjs` installed reports `ok: true` and the stub's selection, so `runProbe` still spawns an existing script (QA cycle 1, QA-1).

### Control case

The task's own example is the searched default with nothing installed. The controls are:

- A configured override naming a missing file, which the task text barely mentions. Its reason must name the override key and must not list the three candidates.
- A project where the `.claude/skills/` candidate exists, for which `probeMissing` must return `null`.

---

## 9. Success Criteria

### Functional

- [x] In an empty project, `resolveAdapter("develop-next", {}, { cwd })` returns `probeScript` `skills/develop-next/scripts/select-next.mjs` and `probeSearched` equal to the three candidates in order (Phase 1, `resolveAdapter` miss branch).
- [x] For that adapter and `cwd`, `probeMissing` returns `status: "error"`, with a `reason` that starts `probe script not found: skills/develop-next/scripts/select-next.mjs` and contains `.agents/skills/develop-next/scripts/select-next.mjs` and `.claude/skills/develop-next/scripts/select-next.mjs` (Phase 1, `probeMissing` searched branch).
- [x] With an override `probeScript: "tools/missing.mjs"`, `probeMissing` returns `status: "error"`, with a `reason` that starts `probe script not found: tools/missing.mjs`, names `loopSupervisor.adapters.develop-next.probeScript`, and does not list `.agents/skills/` (Phase 1, override branch).
- [x] When the resolved probe script exists, `probeMissing` returns `null` and the probe runs as before; the existing probe tests pass unchanged (held by the spawned present-script dry-run test, `run-loop.test.mjs`, added in QA cycle 1).
- [x] A spawned `dry-run --adapter develop-next` in an empty project prints a probe `reason` starting `probe script not found:` (Phase 2, `runProbe` wire-up).
- [x] `interpretProbe`'s empty-stdout message is unchanged (`classify.test.mjs:330` passes).

### Performance

- [x] Adapter resolution still makes at most three `exists` calls (the existing call-count test, `adapters.test.mjs:350`, passes unchanged). `probeMissing` adds one `exists` call per probe, before a spawn it replaces or precedes (held by the counting-`exists` unit test in § 8).

### Code Quality

- [x] Both table entries' `probeScript` equal the last candidate, held by a unit test (CR-2).
- [x] `command node --test 'evals/loop-supervisor/unit/*.test.mjs'` passes locally with the `.agents/skills` symlink moved aside, and in CI.
- [x] `npm run validate -- skills/loop-supervisor/` passes.

### Migration

- [x] The README paragraph and the configuration row each say that a missing probe script is reported with the paths searched.
- [x] CHANGELOG `[Unreleased]` cites task 224.

---

## 10. Risk Assessment

### High Risk Areas

None identified. The change adds a check before a spawn that would fail anyway.

### Medium Risk Areas

1. **A relative override resolved against the wrong directory.**
   - Risk: `probeMissing` checks a path the spawn would resolve differently, and reports a file as missing when it is not.
   - Probability: Low. Impact: Medium (a working loop would stop).
   - Mitigation: both use the same `cwd`. `runProbe` passes it to `spawnSyncCapture`, and `probeMissing` checks `path.resolve(cwd, probeScript)`, which keeps an absolute override absolute (`path.join` would not). A unit test covers an absolute override that exists.

### Low Risk Areas

1. **A selector removed mid-run.** `probeMissing` runs on every probe, so the next iteration reports it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A dry-run in this repository reports `probe script not found` while `skills/develop-next/scripts/select-next.mjs` exists.

**Steps**:
1. `git revert` the merge commit.
2. Run `command node --test 'evals/loop-supervisor/unit/*.test.mjs'`.

**Verification**: `node skills/loop-supervisor/scripts/run-loop.mjs dry-run --adapter develop-next` reports a `selected`, `stop` or `halt` probe.

### Partial Rollback (1-2 hours)

**When to Use**: the not-found check is wrong for one layout and right for the others.

**Steps**:
1. Remove the `probeMissing` call from `runProbe`; keep CR-2 and the exports.

### Forward Fix (< 4 hours)

**When to Use**: unclear wording in the reason.

**Approach**: change the message and its test.

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A probe that ran before this change now stops with `probe script not found`.

**Non-Critical (Forward Fix)**:
- Message wording.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-21
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.224.qa.1.loop-supervisor-probe-not-found.md](./task.224.qa.1.loop-supervisor-probe-not-found.md)
- **Gate File**: [task.224.gate.1.loop-supervisor-probe-not-found.yml](./task.224.gate.1.loop-supervisor-probe-not-found.yml)

### Test Coverage Summary
- **Tests Executed**: 245
- **Phases Verified**: 2/2
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
QA-1 (MEDIUM): no committed test spawns the probe with the script present, so "the probe runs as before" is unguarded. Three advisory code-review findings (CR-1 to CR-3) are recorded in the report.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-10-21 | 1.0 | Initial draft — follow-up to task.214 QA CR-1 and CR-2 | create-task |
| 2026-10-21 | 1.1 | Review (9/10): linked issue #723; added a counting-`exists` unit test so the one-call Performance criterion has a test; the dry-run test also asserts `ok: false` | review-task |
| 2026-10-21 |  | Status → ready-for-development | review-task |
| 2026-10-21 |  | Implemented — 7 files, 14 new tests (13 adapters, 1 dry-run) | develop |
| 2026-10-21 |  | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-21 |  | QA findings fixed — cycle 1, 1 finding (QA-1: present-script dry-run test) | qa-fix |
<!-- change-log-end -->

---

## Implementation Summary

**Completion Date:** 2026-10-21

### Approach

`adapters.js` adds `DEFAULT_PROBE_SCRIPT` (`"skills/" + SELECT_NEXT`), which is now the last of `PROBE_SCRIPT_CANDIDATES` and the `probeScript` of both the `develop-next` and `develop-batch` table entries (CR-2). `findExisting` returns the first existing candidate or `null`; `firstExisting` is `findExisting(...) ?? last`, so its signature and results are unchanged. `resolveAdapter` uses `findExisting`: on a miss it keeps the default and sets `probeSearched` to a copy of the candidates, on a hit it sets `null`, and a configured `probeScript` resets it to `null`. The new `probeMissing(adapter, cwd, exists)` checks `path.resolve(cwd, probeScript)` and returns `{ status: "error", reason }` starting `probe script not found: <path>` — listing every searched path and both fixes, or naming the `loopSupervisor.adapters.<name>.probeScript` key for an override. `runProbe` in `run-loop.mjs` returns it before spawning. `interpretProbe` is unchanged.

### Testing Results

- `command node --test evals/loop-supervisor/unit/adapters.test.mjs`: 56/56 pass, 13 of them new (CR-2 equality ×2, `probeSearched` miss/hit/override/fresh-copy, `findExisting`, `probeMissing` × generic / existing / searched miss ×2 / override miss / absolute override / one `exists` call). The `:301` test is renamed and now also asserts `probeSearched`.
- `evals/loop-supervisor/unit/run-loop.test.mjs`: new spawned `dry-run --adapter develop-next` test in an empty project — `ok: false`, probe `error`, reason starts `probe script not found:`, names all three candidates, and lacks the old "probe produced no output" text. QA cycle 1 added its control: with a stub probe script installed, the probe reports `selected` and the stub's item. `dryRun` takes `{ adapter, setup }` options; existing callers unchanged.
- `command node --test 'evals/loop-supervisor/unit/*.test.mjs'` with the gitignored `.agents/skills` symlink moved aside: 245 tests, 244 pass, 0 fail (1 skipped).
- **Mutation-proven** (file backed up, mutated, restored, `git diff --stat` checked):
  - `probeMissing` always returns `null`: 5 tests fail (the four not-found unit tests and the dry-run test).
  - Dropping the override reset of `probeSearched`: 2 tests fail.
  - Removing the `probeMissing` call from `runProbe`: the dry-run test fails.
  - QA cycle 1 (QA-1): `runProbe` returning `probeMissing`'s value unconditionally fails the new present-script dry-run test, and only that test.
- **Manual dry-run in this repository:** probe `selected` T224. **In an empty temp directory:** `probe script not found: skills/develop-next/scripts/select-next.mjs (searched .agents/skills/…, .claude/skills/…, skills/…). Install the skills under .agents/skills/, or set loopSupervisor.adapters.develop-next.probeScript.`
- `npm run validate -- skills/loop-supervisor/`: passes. Fast gate (`npm run ci:fast`): recorded in the implementation report.

### Deferred Work

None.

---

## Progress Tracking

- [x] Phase 1: The not-found check and the single default
- [x] Phase 2: Wire-up, tests, docs

## References

- [task.214](../task.214.loop-supervisor-probe-script-resolution/task.214.loop-supervisor-probe-script-resolution.md): the candidate search this task follows up.
- [task.214 QA report](../task.214.loop-supervisor-probe-script-resolution/task.214.qa.1.loop-supervisor-probe-script-resolution.md): CR-1 and CR-2.

## Notes

QA artifacts land beside this file: `task.224.qa.[N].*.md`, `task.224.bug.[N].*.md`, `task.224.gate.[N].*.yml`.
