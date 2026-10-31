---
id: task.225
title: "loop-supervisor: find a replacement probe script after a stale hit"
type: task
description: "When the probe script Node resolved earlier in the process is deleted and a different resolution appears (a directory's index.js in place of a .js file, or the reverse), the probe finds the replacement instead of reporting it missing until restart."
tags: [loop-supervisor, adapters, probe]
category: infrastructure
status: ready-for-review
priority: Low
estimated_effort_hours: 2
created: 2026-10-22
updated: 2026-10-31
github_issue: 725
---

# Technical Task: loop-supervisor: find a replacement probe script after a stale hit

**Status:** Ready for Review
**GitHub Issue**: [#725](https://github.com/Gamaroff/agent-skills/issues/725)

---

## 1. Overview

`resolvesAsMain` decides whether `node <probeScript>` would find a module to run. It asks `require.resolve`, which caches each hit for the life of the process, and then checks that the resolved file still exists (task.224 QA-3). When that file has been deleted and a *different* file now resolves for the same script, for example `tools/select/index.js` replacing `tools/select.js`, the check still reports the script missing. It keeps doing so until the loop restarts. This task makes a stale hit trigger one fresh resolution, so the replacement is found.

**Scope**: `resolvesAsMain` in `skills/loop-supervisor/references/adapters.js` and its tests. This is a follow-up to task.224, from its QA gate 4 `recommendations.future` (CR-1). CR-2 to CR-5 from that gate are out of scope.

**Key deliverables**: a fresh-process fallback in `resolvesAsMain`, taken only on a stale hit; one-process replace tests in `evals/loop-supervisor/unit/adapters.test.mjs`; a CHANGELOG entry.

---

## 2. Motivation

### Current Problems

1. **A replacement script reads as missing (CR-1).** `resolvesAsMain` returns `fs.existsSync(resolved)` (`skills/loop-supervisor/references/adapters.js:385`, `return fs.existsSync(resolved);`), where `resolved` comes from `require.resolve(file)` (`adapters.js:381`). Reproduced on 2026-10-22 with Node v26.8.2, in one process:
   - `tools/select.js` exists and `require.resolve(".../tools/select")` returns it. The file is deleted and `tools/select/index.js` is created. `require.resolve` still returns `tools/select.js`, which does not exist. `node tools/select`, run in a fresh process, runs `tools/select/index.js`.
   - The reverse swap is the same: a cached `tools/select/index.js` hit stays stale after the directory is removed and `tools/select.js` is written.
2. **The gate's suggested fix does not work.** Gate 4 suggests "drop the cache entry and resolve once more". On Node v26.8.2, deleting every key of `Module._pathCache`, resolving a non-normalised spelling (`<cwd>/tools/./select`), or calling `Module._findPath` directly with a fresh key all still return the deleted `tools/select.js`. The staleness sits below the documented cache, so no in-process re-resolve can be relied on.

A miss is not cached. After a `MODULE_NOT_FOUND`, a file that appears later resolves on the next call (reproduced the same day). Only a stale *hit* needs the fallback.

### Benefits

1. A loop whose probe script is reinstalled in a different shape keeps running, with no restart needed.
2. `resolvesAsMain` matches its own doc comment ("True when `node <file>` would find a module to run") in the one case where it does not today.

---

## 3. Technical Background

### Current Architecture

- `resolvesAsMain(file)` (`adapters.js:378`): `require.resolve(file)`. On a throw it returns `false`; otherwise it returns `fs.existsSync(resolved)`. It is not exported.
- `probeMissing(adapter, cwd, exists = resolvesAsMain)` (`adapters.js:402`): its only caller. It makes one `exists` call per probe (task.224 SC7, test at `evals/loop-supervisor/unit/adapters.test.mjs:597`).
- Existing tests: the five "probeMissing agrees with node on: …" cases (`adapters.test.mjs:534`) and the QA-3 pair "probeMissing sees a deletion between probes in one process" (`adapters.test.mjs:571`). The QA-3 pair deletes and then restores the *same* file, which resolves correctly today.

### Target Architecture

- `resolvesAsMain(file, freshResolve = resolveInFreshNode)`:
  - `require.resolve(file)` throws: return `false`, as today. A miss is not cached, so no fallback is needed.
  - The resolved file exists: return `true`, as today, with no spawn.
  - The resolved file is gone (a stale hit): return `freshResolve(file) !== null`.
- `resolveInFreshNode(file)` runs `execFileSync(process.execPath, ["-e", "process.stdout.write(require.resolve(process.argv[1]))", file])` with no shell and a timeout. `file` is passed as an argument, never spliced into the code. It returns the printed path, or `null` on any failure. A fresh process has an empty resolution cache, so its answer is exactly what `node <file>` would resolve. It took 31 ms in the repro.
- Export `resolvesAsMain`, so a test can inject a counting `freshResolve`.

Once a hit has gone stale, it stays stale in this process, so every later probe of that script pays the one spawn. Probes run once per loop iteration, which is minutes apart, so this cost is accepted.

### Existing mechanisms this task sits beside

`resolvesAsMain` is the only resolution check in `adapters.js`; `findExisting` / `firstExisting` (`adapters.js:236`, `:251`) use plain `exists` on fixed candidate paths and are unaffected. This task extends `resolvesAsMain`; it adds no second check.

---

## 4. Scope

### In Scope

✅ The stale-hit fallback in `resolvesAsMain`, `resolveInFreshNode`, and exporting `resolvesAsMain`.
✅ Unit tests in `evals/loop-supervisor/unit/adapters.test.mjs`.
✅ A CHANGELOG `[Unreleased]` entry citing task 225.

### Out of Scope

❌ CR-2 (where a vanished default-search hit says the path came from), CR-3 (only `MODULE_NOT_FOUND` as missing), CR-4/CR-5 (`firstExisting`, more agreement rows). They stay in task.224's gate 4 `recommendations.future`.
❌ The README and `docs/reference/configuration.md`: both already describe "present" as what Node would run, and this task makes that true in one more case.
❌ Resolving with `runProbe`'s `nodeBin` rather than `process.execPath`. The in-process check already uses the running Node, and this task keeps that.

---

## 5. Breaking Changes

None - API stable. `resolvesAsMain` gains an optional second parameter and becomes exported. `probeMissing` is unchanged. The only observable change is that a replacement script reads as present.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.225.plan.loop-supervisor-probe-stale-hit-replacement.md](task.225.plan.loop-supervisor-probe-stale-hit-replacement.md)

### Phase 1: The fallback

**Risk:** Low. **Dependencies:** task.224 (merged).

- [x] Add `resolveInFreshNode(file)` (no shell, timeout, `null` on failure).
- [x] Give `resolvesAsMain` the `freshResolve` parameter, and call it only when the resolved file is gone.
- [x] Update `resolvesAsMain`'s doc comment: why a stale hit goes to a fresh process, and why `Module._pathCache` cannot be used.
- [x] Export `resolvesAsMain`.

### Phase 2: Tests and changelog

**Risk:** Low. **Dependencies:** Phase 1.

- [x] One-process replace tests, both directions (§ 8).
- [x] A stale hit with nothing replacing it still reads as missing.
- [x] Counting-`freshResolve` tests: no call on a live hit or a miss, one call on a stale hit.
- [x] Mutation-prove: replace the fallback with `return false` and confirm both replace tests go red. Restore it, then check `git diff --stat`.
- [x] CHANGELOG entry. Run the loop-supervisor suite with the `.agents/skills` symlink moved aside, and `npm run validate -- skills/loop-supervisor/`.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/loop-supervisor/references/adapters.js`: `resolveInFreshNode`, the `resolvesAsMain` fallback, and the export.

### Files to Modify (Tests)

2. ✅ `evals/loop-supervisor/unit/adapters.test.mjs`: the replace, still-missing and spawn-count tests.

### Files to Modify (Documentation)

3. ✅ `CHANGELOG.md`: `[Unreleased]` → Fixed, citing task 225.

---

## 8. Testing Strategy

### Unit Tests

- **Replace, file → directory**: in one process, with `probeScript: "tools/select"`, `tools/select.js` exists and `probeMissing` returns `null`. Delete it and create `tools/select/index.js`; `probeMissing` returns `null`. Today it returns the not-found error (reproduced).
- **Replace, directory → file**: the reverse swap, also `null`.
- **Stale with no replacement**: after the stale hit, remove the replacement too; the reason starts `probe script not found: tools/select`.
- **Spawn count**: call `resolvesAsMain(file, counter)` directly. A live hit makes 0 calls, a miss makes 0, and a stale hit makes 1.
- Each test uses its own `mkdtempSync` directory, so no test can see another's cached resolution.
- Command: `command node --test 'evals/loop-supervisor/unit/*.test.mjs'`, with the gitignored `.agents/skills` symlink moved aside.

### Integration Tests

None needed. `runProbe` calls `probeMissing` unchanged, and task.224's spawned dry-run tests cover that wiring.

### Control case

The existing QA-3 pair (same file deleted and restored) and the five agreement cases must still pass unchanged. The control must show the fallback only adds a "present" answer where a fresh `node` agrees.

---

## 9. Success Criteria

### Functional

- [x] SC1: in one process, after `tools/select.js` resolves and is replaced by `tools/select/index.js`, `probeMissing` returns `null` (Phase 1 adds the branch that returns it).
- [x] SC2: the reverse swap (`tools/select/index.js` → `tools/select.js`) also returns `null`.
- [x] SC3: a stale hit with no replacement still returns a reason starting `probe script not found:`.
- [x] SC4: the five agreement tests and the QA-3 pair pass unchanged.

### Performance

- [x] SC5: `freshResolve` runs only on a stale hit, with 0 calls on a live hit or a miss (spawn-count test). `probeMissing` still makes one `exists` call per probe (`adapters.test.mjs:597` passes unchanged).

### Code Quality

- [x] SC6: mutation-proven. With the fallback replaced by `return false`, the SC1 and SC2 tests fail.
- [ ] SC7: the loop-supervisor unit suite passes locally, with the symlink moved aside, and in CI. `npm run validate -- skills/loop-supervisor/` passes.

### Migration

- [x] SC8: CHANGELOG `[Unreleased]` cites task 225.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

1. **The spawn hangs or the Node binary is unusable.**
   - Probability: Low. Impact: one probe is delayed.
   - Mitigation: a timeout on `execFileSync`, with any failure read as `null`. The result is then the not-found error the probe gives today.
2. **A stale hit pays a spawn on every later probe.**
   - Probability: certain once stale. Impact: about 30 ms per iteration.
   - Mitigation: accepted. Iterations are minutes apart.
3. **Security.** The spawn uses no shell, and `file` is an argument, not code. The input is operator-authored config that the probe already runs verbatim, so no trust boundary moves.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: loop-supervisor tests fail on develop, or a probe hangs.
- **Steps**: `git revert` the merge commit. This restores task.224's behaviour, where a replacement reads as missing until restart.
- **Validation**: the loop-supervisor unit suite passes.

### Partial Rollback (1-2 hours)

Not applicable. There is a single phase of code.

### Forward Fix (< 4 hours)

For a timeout or a message problem, fix it forward in `resolveInFreshNode`.

### Rollback Triggers

- **Critical**: a red loop-supervisor suite on develop, or a probe that never returns.
- **Non-critical**: wording. Fix it forward.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-22 | 1.0 | Initial draft — follow-up to task.224 QA gate 4 CR-1 | create-task |
| 2026-10-31 | 1.1 | Review passed (9/10) — no changes required; stale-hit and fresh-resolve claims re-run on Node v26.8.2 | review-task |
| 2026-10-31 |  | Status → ready-for-development | review-task |
| 2026-10-31 |  | Implemented — 3 files, 3 tests | develop |
<!-- change-log-end -->

---

## Implementation Summary

**Completion Date:** 2026-10-31

`resolvesAsMain` now resolves a stale `require.resolve` hit again in a fresh `node` process, so a probe script replaced in another shape is found without a restart. A live hit and a miss behave as before and spawn nothing.

### Approach

`adapters.js` adds `resolveInFreshNode(file)`: `execFileSync(process.execPath, ["-e", "process.stdout.write(require.resolve(process.argv[1]))", file])`, no shell, stdin and stderr ignored, a 10 s timeout, and `null` on any failure or empty output. `resolvesAsMain(file, freshResolve = resolveInFreshNode)` keeps its two existing exits (a throw → `false`; the resolved file exists → `true`) and adds a third: when the resolved file is gone, it returns `freshResolve(file) !== null`. The doc comment says why a stale hit goes to a fresh process and why `Module._pathCache` cannot be used. `resolvesAsMain` is exported so a test can inject `freshResolve`. `probeMissing` is unchanged.

### Testing Results

- `command node --test 'evals/loop-supervisor/unit/*.test.mjs'` with the gitignored `.agents/skills` symlink moved aside: 256 tests, 255 pass, 0 fail, 1 skipped. Three tests are new: "probeMissing finds a replacement after a stale hit: file → directory" and "…: directory → file" (SC1, SC2, and SC3 as each test's last step), and "resolvesAsMain spawns a fresh resolve only on a stale hit" (SC5: 0 calls on a miss and a live hit, exactly one on a stale hit). The five agreement tests, the QA-3 pair and the one-`exists`-call test pass unchanged (SC4).
- **Mutation-proven (SC6):** with `return freshResolve(file) !== null;` replaced by `return false;`, both swap tests and the spawn-count test fail (63 pass / 3 fail in `adapters.test.mjs`). The file was restored from a backup and `git diff --stat` checked.
- `npm run validate -- skills/loop-supervisor/`: passes. Prettier: the three changed source files pass. Fast gate (`npm run ci:fast`) and CI: recorded in the implementation report.

### Deferred Work

None. The review's optional hardening (check that the fresh result exists, against a `NODE_OPTIONS` hook that prints to stdout) was not taken: the plan keeps `!== null`, and the environment is the operator's.

---

## Progress Tracking

- [x] Phase 1: The fallback
- [x] Phase 2: Tests and changelog

## References

- [task.224](../task.224.loop-supervisor-probe-not-found/task.224.loop-supervisor-probe-not-found.md): the not-found check this task follows up.
- [task.224 QA gate 4](../task.224.loop-supervisor-probe-not-found/task.224.gate.4.loop-supervisor-probe-not-found.yml): `recommendations.future`, CR-1.

## Notes

QA artifacts land beside this file: `task.225.qa.[N].*.md`, `task.225.bug.[N].*.md`, `task.225.gate.[N].*.yml`.
