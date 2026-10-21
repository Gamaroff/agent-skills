---
id: task.214
title: "loop-supervisor: find select-next.mjs wherever the skills are installed"
type: task
description: "Replace the hardcoded probeScript default in the develop-next and develop-batch adapters with a search across .agents/skills, .claude/skills and skills, so a repo that vendors the skills works without an override."
tags: [loop-supervisor, adapters, probe]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-18
updated: 2026-10-21
estimated_effort_hours: 2
github_issue: 721
---

# Technical Task: loop-supervisor: find select-next.mjs wherever the skills are installed

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.214.review.1.loop-supervisor-probe-script-resolution.md` implemented 2026-10-21
**GitHub Issue**: [#721](https://github.com/Gamaroff/agent-skills/issues/721)

---

## 1. Overview

The `develop-next` and `develop-batch` adapters default `probeScript` to `skills/develop-next/scripts/select-next.mjs`, a path that exists only in this repository. A consumer repo installs the skills under `.agents/skills/`, so the default points at nothing and the first probe fails until the operator writes a `loopSupervisor.adapters.<name>.probeScript` override. This task makes the default resolve to whichever candidate exists.

**Scope**: the default only, in `references/adapters.js`, and how `main` passes the working directory to it. A configured override still wins and is used verbatim.

**Key deliverables**: a candidate list (`.agents/skills/…`, `.claude/skills/…`, `skills/…`), a resolver that picks the first that exists relative to the working directory, and tests for each position and for none.

---

## 2. Motivation

### Current Problems

1. **The default is wrong outside this repository.** `probeScript: "skills/develop-next/scripts/select-next.mjs"` appears twice in `skills/loop-supervisor/references/adapters.js` (the `develop-next` and `develop-batch` entries).
2. **The failure is an indirect one.** The probe runs `node <path>` and the path does not exist, so the operator sees a probe error, not "your skills are installed somewhere else".
3. **The override is the only escape**, and it is documented only in `docs/reference/configuration.md` under `loopSupervisor.adapters.<name>`.

### Benefits

1. `dry-run` works on first use in a consumer repo.
2. No new config for the common layouts.
3. An explicit override still wins, so nothing a consumer already configured changes.

---

## 3. Technical Background

### Current Architecture

- `ADAPTERS["develop-next"].probeScript` and `ADAPTERS["develop-batch"].probeScript`, both the literal above (`skills/loop-supervisor/references/adapters.js`).
- `probeArgs(ctx)` builds `[this.probeScript, …]`; `ctx` carries only `roadmapPath`.
- `resolveAdapter(name, config)` copies the table entry and applies the `stateFile`, `lockFile`, `haltFile`, `probeScript` and `command` overrides. Its one call site is `adapter = resolveAdapter(opts.adapter, config);` in `run-loop.mjs` `main`, which has `cwd` in scope. `evals/loop-supervisor/unit/adapters.test.mjs` calls it with one or two arguments.
- `runProbe` spawns `node` with `adapter.probeArgs(...)` and `cwd` as the working directory, so a relative path is resolved against the project root.

### Verified in this repository (2026-10-18)

`ls .agents/skills/develop-next/scripts/select-next.mjs skills/develop-next/scripts/select-next.mjs` finds both. `.agents/skills` is a symlink to `../skills`, and `.claude/skills` is a symlink to `../.agents/skills`. The candidate search must therefore tolerate two candidates resolving to the same file. `select-next.mjs` realpaths both `argv[1]` and its own path (`adapters.js` header), so invoking it through a symlinked candidate still runs its CLI.

**Both symlinks are gitignored, so CI has neither** (`git check-ignore -v .agents/skills .claude/skills`, re-checked 2026-10-21 by the review). From the repository root, a resolve with no `cwd` returns `.agents/skills/…` on a developer machine and `skills/…` in CI. A test that resolves against the real working directory would therefore pass in one place and fail in the other. Every new or changed test passes a temp-directory `cwd`.

### Target Architecture

`adapters.js` exports `PROBE_SCRIPT_CANDIDATES` for `select-next.mjs` and `firstExisting(cwd, candidates, exists = fs.existsSync)`. `resolveAdapter(name, config, { cwd })` replaces a default `probeScript` with the first candidate for which `exists(path.join(cwd, candidate))` holds. When none exists it keeps the `skills/…` default, so the failure message is today's and not a new one. An override from config is never searched. The `exists` parameter lets a test count the calls (§ 9 Performance).

`.claude/skills/…` is a **read-only** search candidate, for consumers whose installer put the skills there. Nothing in this task writes to that path. The repository's agent-agnostic path rule (`.agents/skills/`) is about where skills are installed and documented, and `.agents/skills/` stays first in the order.

---

## 4. Scope

### In Scope

✅ The two `probeScript` defaults and the resolver.
✅ `resolveAdapter` taking an optional `cwd`, defaulting to `process.cwd()` so existing two-argument callers behave as before.
✅ Tests for each candidate position, none found, and an override that must not be searched.
✅ One sentence in `docs/reference/configuration.md` and `skills/loop-supervisor/README.md` saying where the default looks.

### Out of Scope

❌ Searching for `state`, `lock` or `halt` files; they are in `.claude/state/` in every layout.
❌ Any engine or model change (task.213).
❌ Searching outside the project root (`~/.agents/skills/`).

---

## 5. Breaking Changes

None - API stable. `resolveAdapter(name, config)` keeps working; the new third argument is optional. A repository that has the `skills/…` path resolves to it exactly as before unless a `.agents/skills/…` copy also exists, in which case that copy is used, and the two are the same file in this repository.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.214.plan.loop-supervisor-probe-script-resolution.md](task.214.plan.loop-supervisor-probe-script-resolution.md)

### Phase 1: The resolver

**Risk:** Low. **Dependencies:** none.

- [x] Add `PROBE_SCRIPT_CANDIDATES` and a `firstExisting(cwd, candidates)` helper to `adapters.js`.
- [x] Mark the two adapters' `probeScript` as "resolved by default" (keep the literal as the fallback) so a config override can be told from a default.
- [x] Extend `resolveAdapter(name, config, { cwd })`.

### Phase 2: Wire-up, tests, docs

**Risk:** Low. **Dependencies:** Phase 1.

- [x] Pass `{ cwd }` from `main`.
- [x] Tests in `evals/loop-supervisor/unit/adapters.test.mjs` using a temp directory per case.
- [x] Update the existing test "resolveAdapter applies declarative config overrides without mutating the table" (`adapters.test.mjs:239`). Its `probeArgs({}).includes("skills/develop-next/scripts/select-next.mjs")` assertion (`:252-254`) would resolve against the repository root, and § 3 shows that is `.agents/skills/…` locally and `skills/…` in CI. Pass it a temp `cwd` that holds only the `skills/…` candidate. The `ADAPTERS["develop-next"].probeArgs` test (`:195-201`) reads the table directly and keeps passing, because the table literal is kept as the fallback. Literal search: `git grep -n 'skills/develop-next/scripts/select-next.mjs' -- evals/ skills/loop-supervisor/` (3 test hits, both in this file).
- [x] Two documentation sentences; run the loop-supervisor suite and `npm run validate -- skills/loop-supervisor/`.

---

## 7. Files Summary

The population of `probeScript` mentions is measured by `grep -rn 'probeScript' skills/loop-supervisor evals/loop-supervisor docs/reference/configuration.md` from the repository root; the tests assert behaviour, not that count.

### Files to Modify (Core Implementation)

1. `skills/loop-supervisor/references/adapters.js`
2. `skills/loop-supervisor/scripts/run-loop.mjs` (the one `resolveAdapter` call in `main`)

### Files to Modify (Tests)

3. `evals/loop-supervisor/unit/adapters.test.mjs`

### Files to Modify (Documentation)

4. `docs/reference/configuration.md`, `skills/loop-supervisor/README.md`

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `resolveAdapter` against temp directories containing exactly one candidate each, then none, then two.
- **Command:** `command node --test evals/loop-supervisor/unit/adapters.test.mjs`.
- **Mutation-prove:** reorder the candidates and confirm the "two present" test goes red; make the resolver search an override and confirm the override test goes red; make `firstExisting` keep checking after a hit and confirm the call-count test goes red.
- **Call count:** a test passes a counting stub as `exists` and asserts it is called at most three times, and only once when the first candidate exists.
- **No repository-root resolve:** no new or changed test calls `resolveAdapter` without a temp `cwd` and then asserts on `probeScript` (§ 3).

### Integration Tests

- `dry-run --adapter develop-next` in this repository resolves a path and reports a `probe` result; in a temp project with only `.agents/skills/develop-next/scripts/select-next.mjs` it resolves that path. These are manual checks: record their output in the implementation report. The unit tests above hold the success criteria.

### Control case

The task's own example is `.agents/skills/…`. The control is a layout the task never mentions (the script under `.claude/skills/` only), plus a configured override that points at a path no candidate list contains and must come back unchanged.

---

## 9. Success Criteria

### Functional

- [x] With only `.agents/skills/develop-next/scripts/select-next.mjs` present, the resolved adapter's `probeScript` is that path.
- [x] With only the `.claude/skills/…` or only the `skills/…` copy present, each is selected.
- [x] With none present, `probeScript` is the `skills/…` default and the probe error is the one produced today.
- [x] A `loopSupervisor.adapters.<name>.probeScript` override is returned verbatim.

### Performance

- [x] At most three `exists` calls per adapter resolution, held by the call-count unit test (§ 8).
- Wall-clock timing is not applicable. The only work added is the bounded `exists` calls, and the test above pins them.

### Code Quality

- [x] `command node --test 'evals/loop-supervisor/unit/*.test.mjs'` passes, both locally and in CI. No assertion depends on the gitignored `.agents/skills` symlink (§ 3).
- [x] `npm run validate -- skills/loop-supervisor/` passes.

### Migration

- [x] The two documentation sentences state the search order and that an override wins.

---

## 10. Risk Assessment

### High Risk Areas

None identified: the change affects a default that is wrong outside this repository, and inside it both paths are the same file.

### Medium Risk Areas

1. **Two candidates exist and differ.**
   - Risk: a stale vendored copy shadows the repo's own.
   - Probability: Low. Impact: Medium.
   - Mitigation: the order is documented, and an override is the escape. The order follows the installed-copy-first convention the pipelines already use.

### Low Risk Areas

1. **The probe cwd.** `runProbe` passes `cwd` and the candidates are checked against the same `cwd`, so they cannot disagree.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `dry-run` in this repository selects a probe path that does not realpath to `skills/develop-next/scripts/select-next.mjs`. Selecting `.agents/skills/…` is expected: it is the same file through the symlink.

**Steps**:
1. `git revert` the merge commit.
2. Run `command node --test evals/loop-supervisor/unit/adapters.test.mjs`.

**Verification**: `dry-run --adapter develop-next` reports the `skills/…` probe path.

### Partial Rollback (1-2 hours)

**When to Use**: the resolver is right for two layouts and wrong for a third.

**Steps**:
1. Remove the offending candidate; keep the rest.

### Forward Fix (< 4 hours)

**When to Use**: a missed layout.

**Approach**: add the candidate and a test case.

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A change in the selected probe for a layout that worked before.

**Non-Critical (Forward Fix)**:
- A layout the candidate list misses; an unclear doc sentence.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-21
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.214.qa.1.loop-supervisor-probe-script-resolution.md](./task.214.qa.1.loop-supervisor-probe-script-resolution.md)
- **Gate File**: [task.214.gate.1.loop-supervisor-probe-script-resolution.yml](./task.214.gate.1.loop-supervisor-probe-script-resolution.yml)

### Test Coverage Summary
- **Tests Executed**: 231 (loop-supervisor suites; adapters 43/43)
- **Phases Verified**: 2/2
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Two advisory code-review findings came back, both routed to future work:
- CR-1: a distinct "selector not found" error.
- CR-2: derive the fallback literal from the constant.

Three of four mutations went red; the fourth is an equivalent mutant.

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-10-18 | 1.0 | Initial draft | create-task |
| 2026-10-21 | 1.1 | Review (8/10, after fixes): the existing override test would resolve to `.agents/skills/…` locally and `skills/…` in CI, so it now gets a temp `cwd`; added a call-count test and an injectable `exists`; dropped the wall-clock criterion; reworded the rollback trigger; linked issue #721 | review-task |
| 2026-10-21 |  | Status → ready-for-development | review-task |
| 2026-10-21 |  | Implemented — 5 files, 14 new tests (29 → 43 in the adapters suite) | develop |
| 2026-10-21 |  | QA gate PASS (100/100) — 0 gating findings, 2 advisory | qa-task |
<!-- change-log-end -->

---

## Implementation Summary

**Completion Date:** 2026-10-21

### Approach

`adapters.js` adds `PROBE_SCRIPT_CANDIDATES` (`.agents/skills/`, `.claude/skills/`, `skills/`, each followed by `develop-next/scripts/select-next.mjs`) and `firstExisting(cwd, candidates, exists = fs.existsSync)`. It returns the first candidate that exists, or the last one. The `develop-next` and `develop-batch` entries carry `defaultProbe: true`. `resolveAdapter(name, config, { cwd = process.cwd() } = {})` runs the search on its copy before the override loop, so a configured `probeScript` still replaces the result verbatim and the shared table keeps its literal. `run-loop.mjs` `main` passes `{ cwd }`, the same directory `runProbe` spawns in.

### Testing Results

- `command node --test evals/loop-supervisor/unit/adapters.test.mjs`: 43/43 pass, 14 of them new.
- The new tests cover:
  - each candidate alone, for both adapters
  - none present
  - two present
  - an override set while all three exist
  - `generic` unaffected
  - the table literal unchanged
  - the candidate order
  - the `exists` call count: 3 with no hit, 1 when the first candidate exists
- The existing override test now uses a temp `cwd`.
- **Mutation-proven** (scratch script; the file is restored and checked with `git diff --stat` after each mutation):
  - Reordering the candidates fails 5 tests.
  - Moving the search after the override loop fails the override test.
  - Letting `firstExisting` keep looping fails the call-count test.
  - Removing the search fails 5 tests.
- **Manual dry-run in this repository:** the probe returns `selected` T214.
- **Manual dry-run in a temp project holding only `.agents/skills`** (a symlink to this repo's `skills/`):
  - Before (develop's `adapters.js`): `probe: error — probe produced no output (exit 1)`.
  - After: `probe: halt — roadmap could not be parsed`, which is the real selector answering in a project with no roadmap.
- The fast gate (`npm run ci:fast`) ran with the gitignored `.agents/skills` symlink moved aside, to match CI. Result: recorded in the implementation report.

### Deferred Work

None.

## Progress Tracking

- [x] Phase 1: The resolver
- [x] Phase 2: Wire-up, tests, docs

## References

- Handoff that prompted this task: pasted into the session on 2026-10-18 (no durable copy).
- [task.62](../task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md): the runner and its adapters.

## Notes

QA artifacts land beside this file: `task.214.qa.[N].*.md`, `task.214.bug.[N].*.md`, `task.214.gate.[N].*.yml`.
