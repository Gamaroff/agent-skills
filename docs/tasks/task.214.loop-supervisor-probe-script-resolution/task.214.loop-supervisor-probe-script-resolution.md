---
id: task.214
title: "loop-supervisor: find select-next.mjs wherever the skills are installed"
type: task
description: "Replace the hardcoded probeScript default in the develop-next and develop-batch adapters with a search across .agents/skills, .claude/skills and skills, so a repo that vendors the skills works without an override."
tags: [loop-supervisor, adapters, probe]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-18
updated: 2026-10-18
estimated_effort_hours: 2
---

# Technical Task: loop-supervisor: find select-next.mjs wherever the skills are installed

**Status:** Planned

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

`ls .agents/skills/develop-next/scripts/select-next.mjs skills/develop-next/scripts/select-next.mjs` finds both, because `.claude/skills` is a symlink to `../.agents/skills`. The candidate search must therefore tolerate two candidates resolving to the same file.

### Target Architecture

`adapters.js` exports `PROBE_SCRIPT_CANDIDATES` for `select-next.mjs`, and `resolveAdapter(name, config, { cwd })` replaces a default `probeScript` with the first candidate for which `fs.existsSync(path.join(cwd, candidate))` holds. When none exists it keeps the `skills/…` default, so the failure message is today's and not a new one. An override from config is never searched.

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

- [ ] Add `PROBE_SCRIPT_CANDIDATES` and a `firstExisting(cwd, candidates)` helper to `adapters.js`.
- [ ] Mark the two adapters' `probeScript` as "resolved by default" (keep the literal as the fallback) so a config override can be told from a default.
- [ ] Extend `resolveAdapter(name, config, { cwd })`.

### Phase 2: Wire-up, tests, docs

**Risk:** Low. **Dependencies:** Phase 1.

- [ ] Pass `{ cwd }` from `main`.
- [ ] Tests in `evals/loop-supervisor/unit/adapters.test.mjs` using a temp directory per case.
- [ ] Two documentation sentences; run the loop-supervisor suite and `npm run validate -- skills/loop-supervisor/`.

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
- **Mutation-prove:** reorder the candidates and confirm the "two present" test goes red; make the resolver search an override and confirm the override test goes red.

### Integration Tests

- `dry-run --adapter develop-next` in this repository resolves a path and reports a `probe` result; in a temp project with only `.agents/skills/develop-next/scripts/select-next.mjs` it resolves that path.

### Control case

The task's own example is `.agents/skills/…`. The control is a layout the task never mentions (the script under `.claude/skills/` only), plus a configured override that points at a path no candidate list contains and must come back unchanged.

---

## 9. Success Criteria

### Functional

- [ ] With only `.agents/skills/develop-next/scripts/select-next.mjs` present, the resolved adapter's `probeScript` is that path.
- [ ] With only the `.claude/skills/…` or only the `skills/…` copy present, each is selected.
- [ ] With none present, `probeScript` is the `skills/…` default and the probe error is the one produced today.
- [ ] A `loopSupervisor.adapters.<name>.probeScript` override is returned verbatim.

### Performance

- [ ] At most three `existsSync` calls per adapter resolution, once per run.
- [ ] `dry-run` timing is unchanged within noise.

### Code Quality

- [ ] `command node --test 'evals/loop-supervisor/unit/*.test.mjs'` passes.
- [ ] `npm run validate -- skills/loop-supervisor/` passes.

### Migration

- [ ] The two documentation sentences state the search order and that an override wins.

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
- `dry-run` in this repository selects a different probe than before.

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

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-10-18 | 1.0 | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: The resolver
- [ ] Phase 2: Wire-up, tests, docs

## References

- Handoff that prompted this task: pasted into the session on 2026-10-18 (no durable copy).
- [task.62](../task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md): the runner and its adapters.

## Notes

QA artifacts land beside this file: `task.214.qa.[N].*.md`, `task.214.bug.[N].*.md`, `task.214.gate.[N].*.yml`.
