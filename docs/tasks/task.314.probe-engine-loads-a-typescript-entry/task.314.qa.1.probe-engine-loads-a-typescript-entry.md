# QA Report: Task 314 - The security probe engine loads a TypeScript entry

**Task**: [Link to task document](./task.314.probe-engine-loads-a-typescript-entry.md)
**Gate File**: [task.314.gate.1.probe-engine-loads-a-typescript-entry.yml](./task.314.gate.1.probe-engine-loads-a-typescript-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: CONCERNS

---

## Executive Summary

The module entry form now loads `.ts`, `.mts`, `.cts` and `.tsx` boundaries through a bundled hook and the target repository's compiler. The suite, the calibration and both mutation proofs hold. One medium finding was reproduced by QA: the compiler is resolved by walking up past the repo root, so a `typescript` in a parent directory is accepted where the task says a repository with no compiler of its own is declined.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (T314-CR-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#925, against develop)

### Review Methodology

Direct tools plus one read-only Explore reviewer for the diff. The reviewer was given the code-review prompt by path (lines 25-136 of the bundled `code-review-prompt.md`), not pasted. It returned in 54 s (`duration_ms` 54393).

Re-review scope: not applicable (first review, no prior gate).

Diff review: code review (the change set holds code).

Step 4b: not applicable. The one changed `SKILL.md` hunk (finalise step 3b.1) is a prose sentence, not a fenced bash block.

CI on 548784c73fc5: pending (read once, never waited on).

Adaptive strategy: the task has 5 phases and touches a security probe, which would allow parallel agents; one reviewer was enough because the change is one engine plus one hook.

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: settle the facts | PASS | Verified | Node 22.23.5 on the CI image has `registerHooks`; one hook per child |
| Phase 1: hook and fixture family | PASS | Verified | hook plus 13 fixture files in two fixture directories |
| Phase 2: wire the entry form | CONCERNS | Verified | compiler provenance not bounded to the repo root (T314-CR-1) |
| Phase 3: prove it | PASS | 21/21 | calibration and two mutation proofs, re-run by QA below |
| Phase 4: bundle and document | PASS | Verified | four skills carry the hook; `npm run bundle` run by the developer |

**Overall Phase Completion**: 4/5 clean, 1 with a finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Fixture library loads, scored never declined | `security-probe-typescript-entry.test.mjs` seven shape tests plus the no-tsconfig test, all green; the test names the shape each file holds | PASS |
| Calibration: refusing control held, accept-everything reproduced | test `calibration: a refusing control scores held ...`; the hostile ids `h.backslash`, `h.hash`, `h.slash` are reproduced | PASS |
| Mutation proof holds | re-run by QA, see below | PASS |
| No `typescript` resolvable: named decline with the searched root | test `a repository with no typescript is declined by name ...`. Not true when a compiler exists only above the root: T314-CR-1 | PASS, with T314-CR-1 |
| Hook writes nothing; escape check green; nothing caller-supplied interpolated | tests `the hook writes nothing`, the two argv and binding tests, `calibration: an escaping write ... is still reported` | PASS |
| Per-child cost recorded | see Findings | PASS |
| `bundle --check` 0 problems, hook ships in every skill that ships the engine | four `references/security-probe-ts-hook.mjs` copies in the commit, one per skill that carries `security-probe.mjs` | PASS |
| `validate` passes per changed skill | run by the developer for all four (task 314 Step 3 record) | PASS |
| `CI=true npm run test:remote` green on the PR head | green on the same code before the commit (8688 pass, 0 fail, Node 22 container). CI on the PR head is still pending | PASS, CI pending |
| Header, rule and zero-guard text name the TypeScript entry | `probe-boundary-rule.md`, engine header and `finalise/SKILL.md` changed in the commit | PASS |
| CHANGELOG entry citing (task 314) | `changelog-cites.sh task.314` prints `cites (task 314)` | PASS |
| Previously overridden plans that now report a reproduced case | None known: a search of `docs/` for `entry-not-probeable` finds only shell and bug records, no TypeScript plan | PASS |

criteria-drift: clean (base: review-commit).

---

## Findings

**Per-child cost (task criterion).** Seven interleaved runs of each, a bare module child against the same child with `--import` of the hook. Raw runs, nothing dropped:

| Run | load1 | bare | hook |
| --- | --- | --- | --- |
| 1 | 3.47 | 106 ms | 559 ms |
| 2 | 3.47 | 58 ms | 417 ms |
| 3 | 3.47 | 42 ms | 312 ms |
| 4 | 3.47 | 40 ms | 290 ms |
| 5 | 3.35 | 41 ms | 294 ms |
| 6 | 3.35 | 60 ms | 430 ms |
| 7 | 3.35 | 41 ms | 405 ms |

Median bare 42 ms, median hook 405 ms: the hook adds **363 ms per child**. Valid-run ceiling: load1 at most 4. Run 1 is the cold-cache outlier and is kept. The table is the script's own output, copied unedited. At one child per case, 59 cases add about 21 s against `ENGINE_TIMEOUT_MS` of 20 minutes (`security-probe-plan.mjs:100`), about 1.8 percent. The one-hook-per-child decision stands. The developer's own figures (about 100 ms against about 396 ms) agree on the hook side; the bare side was noisier then.

## Issues Found

### MEDIUM Severity Issues (1)

**T314-CR-1: the compiler is not bounded to the repo root**
- **Severity**: MEDIUM
- **Category**: Security / Functional
- **Observation**: `createRequire(entryPath).resolve("typescript")` (`security-probe.mjs:826`) walks up from the entry directory with no stop at the repo root, and also consults the parent process's `NODE_PATH` and global folders.
- **Reproduction**: a scratch tree with `typescript` linked at `parent/node_modules/typescript` and the repo root at `parent/repo`, no compiler of its own. `runProbeSpec` returned `verdict: engages, executed: 2`, where the task says it is declined `typescript-unavailable`.
- **Control**: the same tree with `typescript` also at `parent/repo/node_modules/typescript` engages as it should. The reproduction is new code, so the provenance check against the base does not apply (the base declines every TypeScript entry).
- **Reviewer confidence**: medium, recorded unchanged. It enters the gate as QA's own finding (origin: code-review, reproduced by QA).
- **Recommendation**: realpath the resolved compiler and decline `typescript-unavailable` unless it lies inside the realpath of the repo root; add a test with the compiler only in a parent directory.
- **Bug report file**: not created. The finding is carried as a `top_issues[]` entry in the gate, which is what `/qa-fix` reads; recorded in the implementation report's Issues Log.

### LOW Severity Issues (0)

**Total Issues**: HIGH 0, MEDIUM 1, LOW 0

---

## NFR Assessment

### Performance — PASS
363 ms per child, about 21 s for 59 cases (see Findings).

### Reliability — PASS
Both prerequisites are checked in the parent and declined by name. The `.cts` failure on Node 22 was found by the first remote run and fixed; the Node 22 gate is green.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0 (see the boundary decision under Code Review)
- Compiler provenance is not bounded to the repo root (T314-CR-1). The escape check is green (`escaped: 0`), and nothing the case or ambient environment supplies reaches argv or the compiler binding (tests 18 and 19).

### Maintainability — PASS
One hook, one extension test in the engine; generated copies match their sources.

---

## Code Review

**Boundary decision.** `boundary: false`. Candidates named: `checkTypeScriptRuntime` (an environment preflight: its inputs are the repo root, an entry path that `resolveEntry` has already contained, and the Node API object; it carries no hostile-input signal), `TS_ENTRY_EXTENSION` (a routing test, covered by the extension-table test), and the hook's resolve and load functions (a loader; it accepts nothing for a caller). Containment stays with `resolveEntry`, which the diff does not touch. The criteria signal reads `["never"]`; the reason is in the gate's `boundary_reason`.

probes_executed: 0
escaped: 0

**Correctness bugs (1):**
- [medium/medium] `shared/resources/security-probe.mjs:826` — the compiler is resolved by walking up with no stop at the repo root → decline unless the realpath of the compiler is inside the realpath of the repo root. Anchor check: ok. Promoted to the gate as T314-CR-1 (reproduced by QA, 5d).

**Cleanups (1):**
- `shared/resources/security-probe-ts-hook.mjs:47` — `ts.findConfigFile` walks the filesystem on every resolve and load → memoise the config path per directory. Advisory.

mutation-proven: `--import` removed from the spawn argv → 13 tests red, among them `loads and scores guard.ts` and the argv test `a TypeScript child is started with the fixed hook ...` → covered
mutation-proven: `paths` removed from the parsed compiler options in the hook → exactly one test red, `loads and scores alias.ts` → covered
Both mutations were applied by editing the line, reverted by editing it back, and the files compared byte-identical to `cp` snapshots before the gate was written. `git status --porcelain` shows only the implementation report as modified.

---

## Regression Testing

The 21-test suite passes unmutated (`# pass 21`, `# fail 0`) after both reverts. The Node 22 container gate (8688 pass, 0 fail) was run by the developer on the same code. QA did not re-run the full suite.

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/security-probe-ts-hook.mjs`, `shared/resources/probe-boundary-rule.md`, `skills/finalise/SKILL.md`, the new test and its fixtures, `package.json`.

### Test Commands Executed
```bash
command node --test --test-reporter=tap shared/resources/tests/security-probe-typescript-entry.test.mjs
# timing: 7 interleaved runs of `node --input-type=module -e 0`, bare and with
#   PROBE_TS_COMPILER=<typescript> node --import shared/resources/security-probe-ts-hook.mjs ...,
#   load average read from /proc/loadavg before each pair
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 925
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Bound the compiler to the repo root (T314-CR-1) and add the parent-directory test.

### Short-term Actions (Non-Blocking)
1. Memoise `findConfigFile` per directory.
2. A test that holds the three entry-form lists together.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding reproduced by QA; everything else is evidenced.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T314-CR-1 fixed

---

**QA Report**: co-located at `task.314.qa.1.probe-engine-loads-a-typescript-entry.md`
**Gate File**: co-located at `task.314.gate.1.probe-engine-loads-a-typescript-entry.yml`
**Next Steps**: `/qa-fix` for T314-CR-1, then re-review.
