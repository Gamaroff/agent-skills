# Sprint Review Summary - The security probe engine loads a TypeScript entry

**Story/Task ID:** task.314
**Completed Date:** 2026-11-20
**Pull Request:** [#925](https://github.com/Gamaroff/agent-skills/pull/925)

---

## Summary

The security probe engine's module entry form (`path#export`) now loads `.ts`, `.mts`, `.cts` and `.tsx` boundaries through the target repository's own TypeScript compiler. A repository with no compiler gets a named decline, so `/finalise`'s zero-guard no longer fails on every TypeScript consumer.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A fixture library (parameter property, enum, value import, extensionless import, `paths` alias) loads and is scored.
- [x] Calibration: a refusing control holds and an accept-everything control reproduces.
- [x] Mutation proof: unregistering the hook turns the fixture test red with `entry-not-probeable`; removing `paths` handling reds only the alias case.
- [x] No resolvable `typescript`: declined by name, with the root searched.
- [x] The hook writes nothing, and nothing caller-supplied reaches the child.
- [x] Per-child cost recorded: +355 ms per child on head.
- [x] `bundle --check` clean and the hook ships in every skill that carries the engine.
- [x] `validate` passes for each changed skill, CI green on the PR head.
- [x] Docs and CHANGELOG name the TypeScript entry (task 314).

### Key Features Implemented

- **Loader hook**: `shared/resources/security-probe-ts-hook.mjs`, a synchronous `module.registerHooks` resolve/load hook using the repo's compiler (`transpileModule`, never type-checks, writes nothing).
- **Engine wiring**: `checkTypeScriptRuntime` declines by name (`typescript-unavailable`, `typescript-hook-unavailable`) before spawning; the child gets the hook only for TypeScript entries.
- **Root-bound compiler host**: every compiler filesystem read, including a tsconfig `extends` chain, is bounded to the repository root.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — TypeScript entry detection, runtime preflight, hook binding.
- `shared/resources/security-probe-ts-hook.mjs` — the loader hook (new).
- `shared/resources/tests/security-probe-typescript-entry.test.mjs` and fixtures — 30 tests.
- `shared/resources/probe-boundary-rule.md`, `skills/finalise/SKILL.md`, `CHANGELOG.md` — documentation.
- Bundled copies in `finalise`, `qa-story`, `qa-task`, `review-security`.

### Dependencies

- **New Dependencies Added:** devDependency `typescript` 5.9.3
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** 30 in the task's file; Node 22 container gate with `CI=true`: 8697 pass, 0 fail.
- **QA:** four gates (CONCERNS 90, CONCERNS 80, CONCERNS 90, PASS 95); each earlier finding is held by a committed test and a mutation proof.
- **PR review:** conformance lens CONCERNS, four document findings, all cleared.

---

## Security & Compliance

✅ **Security Review Completed**: 10 probed cases on `resolveEntry` containment, 0 reproduced, 0 escapes. The compiler, the tsconfig lookup and its `extends` chain are bounded to the repository root. Compliance: not applicable.

---

## Known Limitations and Future Work

- A missing or out-of-root tsconfig `extends` target is dropped silently (by design); a named warning is a follow-up.
- No tests for the npm-package `extends` form or a `paths` alias through the rooted host.
- A `cli:` entry for `.ts` is deferred.
