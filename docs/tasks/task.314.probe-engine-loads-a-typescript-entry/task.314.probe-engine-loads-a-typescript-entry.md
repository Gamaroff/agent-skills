---
id: task.314
title: "The security probe engine loads a TypeScript entry"
type: task
description: "Teach the security probe engine's module entry form to load .ts, .mts, .cts and .tsx boundaries through the target repository's own TypeScript compiler, so /finalise's zero-guard stops failing on every TypeScript consumer."
tags: [security-probe, finalise, typescript, entry-forms]
category: infrastructure
status: accepted
priority: High
pr_number: 925
created: 2026-11-20
updated: 2026-11-20
completed_date: 2026-11-20
assignee:
estimated_effort_hours: 16
---

# Technical Task: The security probe engine loads a TypeScript entry

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.314.review.1.probe-engine-loads-a-typescript-entry.md` implemented 2026-11-20

---

## 1. Overview

When a boundary (a validator, predicate or allow/deny list) is written in TypeScript,
`shared/resources/security-probe.mjs` cannot import it, so it declines every entry as
`entry-not-probeable`. `probes_executed` is then always 0, and `/finalise`'s zero-guard (the
`probe mode executed no candidates` check in `skills/finalise/SKILL.md`, step 3b.1 item 6) fails every
run. Nothing inside the consumer's work item can clear it: today the only way through is a
hand-written owner override.

**Scope**: add TypeScript loading to the existing **module entry form** (`path#export`), using the
**target repository's own** `typescript` package through a bundled, fixed loader hook; add a named
decline for a repository with no compiler; update the three documents that list the entry forms.

Source: a handoff written from a consumer repository on 2026-11-20, measured on Node 26.8.1 and
TypeScript 5.9.3 at agent-skills `91f1a9fc3`. Its figures are quoted below as the handoff's own and
marked unverified where this task has not re-run them.

---

## 2. Motivation

### Current Problems

1. **Every TypeScript boundary is declined.** The module entry form imports the file as is
   (`security-probe.mjs:400`, `mod = await import(pathToFileURL(spec.entryPath).href);`, in the
   `RUNNER` child). Node's native type stripping is strip-only, so a real TypeScript library fails in
   three independent ways (table in section 3).
2. **The failure is structural, not per work item.** It hits any consumer whose boundary code is
   TypeScript (most Node, NestJS and React Native monorepos). It fails in QA (`qa-story` and `qa-task`
   record it as a low, owner-held finding) and again at `/finalise`. One consumer has needed a manual
   override twice; a second work item halted at `/finalise` on 2026-11-20 for this reason.
3. **The zero-guard hides real findings.** When the prototype hook was applied to a real consumer
   library whose five entries had all been declined, every entry loaded and answered its cases, and one
   hostile case the plan expected to be refused was **accepted**. The guard's failure was masking a real
   escape (the handoff's measurement, unverified here).
4. **The override route is routine.** A route meant for rare, human-judged exceptions is the normal
   path for a whole language.

### Benefits of Loading TypeScript

1. **The zero-guard means what it says again.** A TypeScript boundary is probed and scored, so a
   clean run reports that the boundary held, and a reproduced case is a real finding.
2. **No new dependency in agent-skills or in a consumer.** The hook uses the compiler the consumer
   already has; the engine gains one bundled file.
3. **The project's own resolution rules apply.** `tsconfig` `paths`, `index.ts` and extensionless
   imports resolve the way the project resolves them, not by a second loader's rules.
4. **The override route becomes rare.** It is kept for what it was designed for.

---

## 3. Technical Background

### Current Architecture

- **Entry form.** `path#export` imports a JS module and calls one export (`probe-boundary-rule.md`,
  "The engine reaches six entry forms"). The import is `security-probe.mjs:400`, inside `const RUNNER`
  (`security-probe.mjs:376`), a fixed template string run as `node --input-type=module -e RUNNER`
  (spawn at `security-probe.mjs:2234`).
- **Child environment.** `sandboxEnv({ cwd: workDir })` (imported at `security-probe.mjs:326`, defined
  at `qa-execute-snippets.mjs:4518`, signature `sandboxEnv({ cwd, bindings = {} })`) builds the child's
  environment. Its `bindings` argument is the existing way to hand the child a value.
- **Containment.** `resolveEntry(entry, repoRoot)` (`security-probe.mjs:599`) refuses an entry outside
  `--repo-root` (`reason: "outside-repo-root"`, lines 716 and 723). `--repo-root` is documented at
  `security-probe.mjs:76`.
- **`cli:` interpreters.** `CLI_INTERPRETERS` (`security-probe.mjs:759`) maps `.mjs` and `.js` to
  `node` and `.py` to `python3`. There is no TypeScript entry.
- **Plan runner.** `security-probe-plan.mjs` runs each plan entry; `ENGINE_TIMEOUT_MS = 20 * 60 * 1000`
  (`security-probe-plan.mjs:100`) bounds one engine run.
- **Where a decline lands.** The `entry-not-probeable` doc comments are at `security-probe.mjs:148`,
  `162`, `185`, `205`; the `/finalise` zero-guard text is the `probe mode executed no candidates` check
  (`skills/finalise/SKILL.md:912` and again at `:1137`, cited by the heading, since the line drifts).
- **Bundling.** `security-probe.mjs` is bundled into 4 skills and `security-probe-plan.mjs` into 1
  (`ls skills/*/references/security-probe.mjs | wc -l` is 4, `ls skills/*/references/security-probe-plan.mjs | wc -l`
  is 1, measured 2026-11-20 on `850985da3`).

### The three failures (reproduced by the handoff's author on a generic fixture; unverified here)

| # | Cause | Node's error (verbatim from the handoff) |
| - | ----- | ---------------------------------------- |
| 1 | Non-erasable syntax: a parameter property `constructor(readonly x: string) {}`, an `enum` or a `namespace` | `TypeScript parameter property is not supported in strip-only mode` |
| 2 | A value `import` in a `.ts` file whose nearest `package.json` says `"type": "commonjs"` | `Cannot use import statement outside a module` |
| 3 | Resolution: extensionless relative imports (`'../envelope'`), and value imports through a `tsconfig` `paths` alias | `Cannot find package '@scope/shared-types' imported from …` (once 1 and 2 are fixed) |

A type-only import (`import type …`) is erased and never reaches #2 or #3, which is why one file can
fail on #1 while its sibling fails on #2. The handoff states Node 26 has dropped transform mode
(`--experimental-transform-types` is a "bad option", `module.stripTypeScriptTypes` accepts only
`mode: 'strip'`); the local `node --version` here is v26.13.0, the handoff's 26.8.1, and CI runs Node 22
(`.github/workflows/test.yml` `node-version: '22'`, `scripts/remote-test/Dockerfile` `FROM node:22-trixie`,
`package.json` `"engines": {"node": ">=22"}`). **The hook API is not the same on every Node this
repository supports** (Critical item below).

### Target Architecture

When the entry path ends in `.ts`, `.mts`, `.cts` or `.tsx`, the engine starts the `RUNNER` child with a
**fixed** extra argument, `--import <bundled-hook>.mjs`, where the hook sits beside the engine and is
passed by absolute path. The hook resolves `typescript` from `--repo-root` (the repository's own
compiler) and registers two hooks:

- `resolve`: `ts.resolveModuleName(spec, parent, <tsconfig options>, ts.sys)`, with the nearest
  `tsconfig.json` (`ts.findConfigFile` + `parseJsonConfigFileContent`). It returns the TypeScript file
  for extensionless imports, `index.ts` and `paths` aliases, and leaves `isExternalLibraryImport`
  results and `node:` built-ins to Node.
- `load`: `ts.transpileModule` with `module: ESNext`, returned as `format: "module"`. It never
  type-checks and skips `.d.ts` files.

The handoff's prototype is about 40 lines on Node 26's synchronous `registerHooks`; it is reproduced in
the plan file as a starting point, not as a verified implementation.

A repository with no resolvable `typescript` is declined with its own reason (name chosen in Phase 1;
`typescript-unavailable` is the handoff's suggestion), carrying the root that was searched, so the
operator learns the fix is `npm install` and not an override.

### Important Clarifications

- The `RUNNER` string stays fixed. The hook is a bundled file passed by path; nothing the plan's author
  or a case supplies goes into it. The repo root is the only input and goes through the containment
  check `--entry` already gets.
- Type-checking is out of scope: `transpileModule` reports syntax errors only.
- Earlier entry forms followed the same shape (one engine, a new way to reach a boundary): `shell:`
  (task 128), `shell-fn:` (136), `cli:` (144), `fence:` (180), `shell-argv:` (181), `cli:` for `.py`
  (215), and "decline what cannot be scored, by name" (190). That history is from the handoff; the task
  numbers were not re-checked against the registry.

### Verification this task must do before it builds on a claim (3.5)

| Claim | Where it comes from | Status |
| ----- | ------------------- | ------ |
| Per-child cost of loading the compiler is about 1.4 s (1418, 1439, 1562 ms; bare `node -e 0` about 110 ms) | handoff, 3 runs | **unverified here**; Phase 0 re-measures with the section 9 statistic |
| `transpileModule` writes nothing to disk, so the watched-spawn escape check stays quiet | handoff design point 4 | **unverified**; Phase 3 proves it with a test, not by reasoning |
| `module.registerHooks` (synchronous) is available | handoff, on Node 26 | present on the local v26.13.0 (`typeof require('node:module').registerHooks` is `function`); **unverified on the Node 22 CI image**, where the version it arrived in matters (Phase 0) |
| The prototype loads five real consumer entries and surfaces one real escape | handoff | **unverified here**; no consumer code is in this repository |
| A `tsconfig` `paths` alias value import resolves through `ts.resolveModuleName` | handoff | held by acceptance criterion 1 |

**Population note (a rule specified from one example).** The extension test `.ts|.mts|.cts|.tsx` and the
three failure shapes come from one consumer library (five entries) plus a hand-built fixture. The
population a consumer can present is wider: NodeNext-style `import './x.js'` that resolves to `x.ts`,
decorators, `"type": "module"` packages, and `.tsx`. Phase 1 builds the fixture family from the three
shapes **and** those four, and records the command that measured it; a shape the family does not
contain is not covered by the green.

---

## 4. Scope

### In Scope

✅ The module entry form (`path#export`) for `.ts`, `.mts`, `.cts` and `.tsx`.
✅ A bundled loader hook file, shipped with every skill that ships `security-probe.mjs`.
✅ A named decline when no compiler is resolvable from the repo root.
✅ Tests: a fixture family, calibration controls, mutation proof, escape and interpolation checks.
✅ Documentation: the engine header, `probe-boundary-rule.md`, and the `/finalise` zero-guard text.

### Out of Scope

❌ Type-checking. The hook never reports type errors.
❌ Decorator metadata beyond what `transpileModule` emits.
❌ Adding `esbuild`, `tsx` or `ts-node` to agent-skills or to a consumer (they add a runtime dependency,
   and a second loader's resolution rules instead of the project's own `tsconfig`).
❌ Probing built `.js` output instead of the source (it probes generated code, not what the criteria cite).
❌ **Decision for the author in Phase 1:** whether the `cli:` form gets a `.ts` interpreter in this task
   or a follow-up. Default here: a follow-up, so this task ships one entry form.

---

## 5. Breaking Changes

None - API stable. A module entry that ends in `.ts` was always declined; it now loads. A repository
that relied on the manual override for a TypeScript boundary keeps working (the override is unchanged).
One behavioural change is intended: a plan that was previously declined and then overridden may now
report a reproduced case. That is the engine telling the truth, not a break, but the task's QA report
should say so.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.314.plan.probe-engine-loads-a-typescript-entry.md](task.314.plan.probe-engine-loads-a-typescript-entry.md)

### Phase 0: Settle the facts the design rests on

**Risk**: Medium (a wrong premise here costs every later phase).

- [x] Find the Node version `module.registerHooks` arrived in, and run `typeof` on the **Node 22 CI
  image** (`docker run node:22-trixie node -e ...`). If the lowest Node this repository supports lacks
  it, choose the async `module.register()` path or raise `"engines"`, and record the choice.
- [x] Re-measure the per-child cost with the section 9 statistic (median of at least five runs, load
  recorded), with and without the hook. Record both in the QA report.
- [x] Decide **transpile once in the parent** (into the out-of-tree scratch dir from task.250, then
  import the `.mjs` output) against **one hook per child**. Record the decision and the number that
  drove it.
- [x] Decide how the tests obtain a compiler (Phase 1 decision below) before any test is written.

### Phase 1: The hook and the fixture family

**Risk**: High (new code on the probe path).

- [x] Add the hook file beside the engine in `shared/resources/` (name chosen here; cite siblings by bare
  filename inside `shared/resources/`).
- [x] Build the fixture family: the three shapes (parameter property / enum / namespace; value import
  under `"type": "commonjs"`; extensionless and `paths` alias imports) plus NodeNext `.js`-to-`.ts`
  imports, a decorator, a `"type": "module"` package and a `.tsx` entry, and one fixture with no
  `tsconfig.json` (the hook then defaults `moduleResolution` to `Bundler`; review 1, O1).
- [x] Decide how tests get `typescript`: a pinned `devDependencies` entry (recommended: a test that skips
  when the compiler is absent is vacuous, and `scripts/ci-tool-skips` style guards fail it under
  `CI=true`) or a vendored fixture. A devDependency does not reach a consumer's vendored copy.

### Phase 2: Wire the module entry form

**Risk**: High.

- [x] In the child spawn (`security-probe.mjs:2234`), add `--import <absolute hook path>` only when the
  entry extension is one of the four; leave the `RUNNER` string untouched.
- [x] (As built: the engine passes the compiler path it resolved, not the root.) Pass the repo root to the child through `sandboxEnv`'s `bindings`, after `resolveEntry`'s
  containment check, never from a case or plan field.
- [x] Add the named decline for a missing compiler, with the searched root in its detail. **The engine
  checks in the parent, before it spawns**: `createRequire(<root>/)` then `resolve("typescript")`, and
  `typeof registerHooks` on the running Node. A hook that threw inside the child would kill `node`
  before `RUNNER` could report anything, so the child never meets either failure. A Node without
  `registerHooks` is declined by name too, carrying `process.version` (review 1, I1).

### Phase 3: Prove it

**Risk**: Medium.

- [x] Fixture test, calibration and mutation proof per sections 8 and 9.
- [x] Escape test: the hook writes nothing inside the repo or sandbox; the watched-spawn check stays green.
- [x] Interpolation test: no caller-supplied string reaches the child's argv or the hook source.

### Phase 4: Bundle and document

**Risk**: Low.

- [x] `npm run bundle`, `npm run bundle:check`; the hook ships with the 4 skills that ship
  `security-probe.mjs` (finalise, qa-story, qa-task, review-security; finalise also ships the plan
  runner). Confirm `tests/bundled-links.test.js` and `tests/test-runner-reach.test.js` stay green; the
  new suite is reached by the `shared/resources/tests/*.test.mjs` glob in `package.json` (review 1, I3).
- [x] Update the engine header's entry-form list, the six-entry-forms paragraph in
  `probe-boundary-rule.md`, and the `/finalise` zero-guard text so a TypeScript entry is a reachable one.
  Tests pin these documents, so run them after the edit: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`
  (5 pins on `executed no candidates`), `evals/shared/tests/probes-executed-population.test.mjs`,
  `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` and `tests/shared-script-literals.test.js`
  (found by `git grep -ln "probe-boundary-rule" -- '*.test.*'`). No test asserts that a `.ts` entry is
  declined (`git grep '\.ts#'` over tests and evals: 0 hits), so none breaks on the behaviour change (review 1, I2).
- [x] `CHANGELOG.md` `[Unreleased]` entry citing (task 314).
- [x] `npm run validate -- skills/<skill>/` for every changed skill.

---

## 7. Files Summary

Population commands (re-run, do not trust the numbers): `ls skills/*/references/security-probe.mjs`,
`git grep -l "security-probe" -- 'skills/*/SKILL.md'` (today `qa-story`, `qa-task`, `review-security`),
`git grep -n "entry-not-probeable" -- shared/resources`.

### Files to Modify (Core Implementation)

1. `shared/resources/security-probe.mjs` - spawn arguments (around `:2234`), extension test, env binding,
   named decline, header entry-form list.
2. New: the loader hook file in `shared/resources/` - the hook, about 40 lines.

### Files to Modify (Tests)

3. `shared/resources/tests/security-probe.test.mjs` - or a new sibling suite for the TypeScript entry.
4. New fixture directory for the family (location settled in Phase 1).

### Files to Modify (Dependencies)

5. `package.json` and the lockfile - only if Phase 1 chooses a `typescript` devDependency.

### Files to Modify (Documentation)

6. `shared/resources/probe-boundary-rule.md` - entry forms and the declines table.
7. `skills/finalise/SKILL.md` - the zero-guard text, step 3b.1 item 6.
8. `CHANGELOG.md`.
9. The bundled copies under `skills/*/references/` (generated; edit the `shared/resources` source only).

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Scope: the module entry form for each fixture-family shape; the extension test; the named decline.
- Command: `node --test shared/resources/tests/<suite>`; the full gate is `CI=true npm run test:remote`.

### Calibration (a probe must catch a known escape before its green counts)

- A refusing control on the fixture scores **held**; an accept-everything control on the same fixture
  scores **reproduced**. Both run in the same suite.
- A control the change's text never mentions: an escape shape the hook does not name, plus one correct
  instance the probe must leave alone.

### Mutation proof (record in the QA report per `references/mutation-proving.md`)

- Unregister the hook: the fixture test goes red with `entry-not-probeable`.
- Remove the `paths` handling: **only** the alias case goes red. Read which tests went red; a red in a
  different test is a finding, not a proof.

### Second layer with its own test

- The containment check on the repo root sits behind `resolveEntry`'s. A test that passes a repo root
  outside containment while the entry is inside it defeats the first layer, so the second stands alone.

### Escape and interpolation

- Run the hook-bearing child under the engine's existing escape detection; assert no write inside the
  repo or the sandbox beyond the engine's own scratch. Assert the child's argv and the hook source hold
  no case input.

### Performance Tests

- Per-child cost with and without the hook, median of at least five runs (section 9).

### Consumer Tests

- One real TypeScript consumer library, run by hand through `/finalise` after merge, recorded in the QA
  report. The repository holds no consumer code, so this is a manual step.

---

## 9. Success Criteria

### Functional

- [x] A fixture library holding each of: a parameter property, an `enum`, a value import under
  `"type": "commonjs"`, an extensionless import, a `paths` alias value import loads through the module
  entry form, and each export is scored `rejected` or `accepted`, never declined.
- [x] Calibration holds: a refusing control scores held and an accept-everything control on the same
  fixture scores reproduced.
- [x] Mutation proof holds: unregistering the hook turns the fixture test red with `entry-not-probeable`;
  removing the `paths` handling turns only the alias case red. The QA report names the test that went red.
- [x] With no `typescript` resolvable from the repo root, the entry is declined with the named reason and
  the searched root, never a raw import error.
- [x] The hook writes nothing inside the repo, the escape check is green, and nothing caller-supplied is
  interpolated into the child (a test for each, per section 8).

### Performance

- [x] The per-child cost with the hook, against a bare `.mjs` entry, is recorded in the QA report's
  Findings section: the median of at least five runs of each, `uptime` recorded beside every run, a
  load ceiling named for a valid run, and outliers reported rather than dropped. The decision from
  Phase 0 (transpile once or one hook per child) cites it. `ENGINE_TIMEOUT_MS` is not exceeded by a
  plan of 59 cases at the measured cost.

### Code Quality

- [x] `npm run bundle -- --check` reports 0 problems, and the hook file ships in every skill that ships
  `security-probe.mjs`.
- [x] `npm run validate -- skills/<skill>/` passes for each changed skill.
- [x] `CI=true npm run test:remote` is green on the PR head. (CI reading 1: SUCCESS @ `d0daf814a`, all six checks; the Node 22 container gate was green at `4d2d5939c`, 8697 pass, 0 fail.)

### Migration

- [x] The engine header, `probe-boundary-rule.md` and the `/finalise` zero-guard text name the
  TypeScript entry, and none still says a TypeScript boundary is not probeable.
- [x] `CHANGELOG.md` has an `[Unreleased]` entry citing (task 314).
- [x] The QA report says which previously overridden plans now report a reproduced case, if any are known.

---

## 10. Risk Assessment

### High Risk Areas

1. **Hook API differs across the supported Node range.**
   - Risk: `registerHooks` may be missing on the lowest Node 22 this repository supports.
   - Probability: Medium. Impact: High (the feature would work locally and fail in CI).
   - Mitigation: Phase 0 runs `typeof` on the CI image first. Choose the async `register()` path or raise
     `engines` on that evidence.
   - Rollback: revert the spawn change; the engine returns to declining TypeScript.
2. **New code on a security probe path.**
   - Risk: a hook that executes the target's compiler runs target-influenced code (the module under
     probe already runs with full Node privileges; the engine has no OS sandbox).
   - Probability: Low. Impact: High.
   - Mitigation: the hook is bundled and fixed; the repo root is containment-checked; the compiler is the
     repo's own. The `probe-boundary-rule.md` statement that there is no OS-level sandbox is unchanged and
     must not be weakened.

### Medium Risk Areas

1. **Per-case cost.** One compiler load per child; about 85 s extra on a 59-case plan by the handoff's
   figure (unverified). Mitigation: Phase 0 measures; transpile once in the parent if it matters.
2. **A fixture family that misses a real shape.** Mitigation: the population note in section 3, and the
   manual consumer run.

### Low Risk Areas

1. **Documentation drift.** Three documents list the entry forms; a test or a grep over the three keeps
   them in step.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- Triggers: the CI gate goes red on a Node 22 job; a hook failure declines a JS entry that used to load.
- Steps: revert the PR (a single squash commit); the engine returns to declining TypeScript entries.
- Validation: `CI=true npm run test:remote` green on the revert.

### Partial Rollback (1-2 hours)

- When: the hook works but costs too much per child. Revert only the spawn wiring and keep the fixtures
  and docs, gating the feature off by extension until the transpile-once variant lands.

### Forward Fix (< 4 hours)

- When: a shape the fixture family missed. Add it to the family and extend the hook.

### Rollback Triggers

- Critical: a Node 22 job fails; a JS or `.py` entry regresses.
- Non-critical: a rare TypeScript shape declines; fix forward.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-20
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.314.qa.4.probe-engine-loads-a-typescript-entry.md](./task.314.qa.4.probe-engine-loads-a-typescript-entry.md)
- **Gate File**: [task.314.gate.4.probe-engine-loads-a-typescript-entry.yml](./task.314.gate.4.probe-engine-loads-a-typescript-entry.yml)

### Test Coverage Summary
- **Tests Executed**: 30
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
The cycle 3 fix holds. No open findings; three low-severity advisories are recorded in the gate for follow-up.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA Report**: `task.314.qa.4.probe-engine-loads-a-typescript-entry.md`
**Gate File**: `task.314.gate.4.probe-engine-loads-a-typescript-entry.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 95/100

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** 12 of 12 met, each with a committed test or QA record
✅ **PR Review:** PR #925; `task.314.pr-review.1.*.md` CONCERNS, four document findings cleared
✅ **CI:** all six checks SUCCESS on `d0daf814a`
✅ **Documentation:** entry-form and decline-reason docs, CHANGELOG entry citing (task 314)
✅ **Security Review:** 10 candidates probed on `resolveEntry` containment, 0 reproduced, 0 escapes
⚠️ **Compliance Review:** not applicable (internal tooling)

**Detailed Verification Log:** See `task.314.dod.1.probe-engine-loads-a-typescript-entry.md` for the evidence and timestamps.

**Task marked as ACCEPTED on:** 2026-11-20
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-20 | 1.0     | Initial draft | create-task |
| 2026-11-20 | 1.1     | Review passed (8/10) — parent-side compiler and hook-API check, tests that pin the probe documents named, bundling and runner reach confirmed, tsconfig-less fixture added | review-task |
| 2026-11-20 |         | Status → ready-for-development | review-task |
| 2026-11-20 |         | Implemented: hook, engine wiring, fixture family and suite, docs, bundle; status → ready-for-review | develop-task |
| 2026-11-20 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-20 |         | QA findings fixed — compiler bounded to the repo root (T314-CR-1), 1 iteration | qa-fix |
| 2026-11-20 |  | QA gate CONCERNS (80/100) — 3 findings | qa-task |
| 2026-11-20 |         | QA findings fixed — ES2022 default target, tsconfig lookup bounded to the repo root, root-of-/ bound (T314-CR2-1 to -3), 2 iterations | qa-fix |
| 2026-11-20 |  | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-20 |         | QA findings fixed — every compiler filesystem read goes through one root-bound host, so a tsconfig `extends` above the repo root is not inherited (T314-CR3-1), 1 iteration | qa-fix |
| 2026-11-20 |  | QA gate PASS (95/100) — 0 findings | qa-task |
| 2026-11-20 |         | PR review (5c) doc findings cleared — pr_number added, two criteria ticked with their QA evidence | review-pr |
| 2026-11-20 | 1.2 | DoD verified, 12 of 12 criteria — accepted (PR #925) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Settle the facts the design rests on
- [x] Done 2026-11-20

### Phase 1: The hook and the fixture family
- [x] Done 2026-11-20

### Phase 2: Wire the module entry form
- [x] Done 2026-11-20

### Phase 3: Prove it
- [x] Done 2026-11-20

### Phase 4: Bundle and document
- [x] Done 2026-11-20

---

## References

- Handoff: a consumer-repository note written 2026-11-20 (kept outside this repository; its content is
  restated above, with each figure marked unverified where it was not re-run).
- `shared/resources/security-probe.mjs`, `shared/resources/security-probe-plan.mjs`,
  `shared/resources/probe-boundary-rule.md`, `skills/finalise/SKILL.md` (step 3b.1).
- Plan: [task.314.plan.probe-engine-loads-a-typescript-entry.md](task.314.plan.probe-engine-loads-a-typescript-entry.md)

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, never the bundled `references/` copies, or `npm run bundle` reverts
  the fix.
- A timing figure has one home, the QA report; never the implementation report.

### Implementation Summary (2026-11-20)

**Approach.** One hook per child (the transpile-once alternative was not needed): the hook costs about
0.3 s per child over a bare `node -e 0` (seven runs each, load average about 3, timings go to the QA
report), so a 59-case plan adds about 18 s against `ENGINE_TIMEOUT_MS` of 20 minutes.

**Differences from the plan, and why.**

- The parent finds `typescript` (from the **entry's directory** up to the repo root, never above it:
  QA cycle 1, T314-CR-1) and the engine binds that
  absolute path into the child as `PROBE_TS_COMPILER`, with the repo root as `PROBE_TS_ROOT` so the hook's tsconfig lookup stops there
  (QA cycle 2, T314-CR2-2); the hook compiles to ES2022 when the config sets no `target` (T314-CR2-1). A throw
  inside an `--import` hook kills `node` before `RUNNER` can report anything (review 1, I1), so both
  prerequisites are checked in the parent and declined by name: `typescript-unavailable`
  (carries the entry directory and the repo root) and `typescript-hook-unavailable` (Node before
  22.15.0; Node 22.23.5 on the CI image has `registerHooks`, measured on the LAN server).
- Containment is therefore one layer, `resolveEntry`'s, plus an engine-owned binding; there is no second
  root check to stand alone. The test that replaces it asserts an ambient `PROBE_TS_COMPILER` never
  reaches the child.
- Every TypeScript source loads as a module, `.cts` included (the compiler is given a `.mts` name for
  it). Loading it as CommonJS passed on Node 26 and failed on the Node 22 CI image, where a CommonJS
  `require` of a sibling did not go through the resolve hook (found by the first `test:remote` run).
- The hook is named in the engine by a `// bundle-dependency:` line, because the child loads it by
  path and no import statement names it; without it the bundler copied nothing.
- `typescript@5.9.3` is a new devDependency (`package.json` and the lockfile change).

**Testing results.** `shared/resources/tests/security-probe-typescript-entry.test.mjs` (21 tests) and
the four tests that pin the probe documents pass, with `security-probe.test.mjs` (398 in the combined
run). Mutation (a), `--import` removed from the spawn: 13 of 21 red, every fixture load declined
`entry-not-probeable`. Mutation (b), `paths` handling removed from the hook: exactly one test red,
`loads and scores alias.ts`. Both reverted.

**Deferred work.** A `cli:` entry for `.ts`; a test that holds the three entry-form lists together
(review 1, O3).

**Completion Date:** 2026-11-20

### Known Issues

- None at creation.

### Future Improvements

- A `cli:` entry for `.ts` (the `CLI_INTERPRETERS` map, `security-probe.mjs:759`) if Phase 1 defers it.
