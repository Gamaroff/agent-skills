# QA Report: Task 80 — Make a security probe runnable without widening the snippet allow-list

**Task**: [task.80.security-probe-engine.md](./task.80.security-probe-engine.md)
**Gate File**: [task.80.gate.1.security-probe-engine.yml](./task.80.gate.1.security-probe-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**PR**: [#337](https://github.com/Gamaroff/agent-skills/pull/337) — OPEN
**Gate Status**: CONCERNS

---

## Executive Summary

The engine does the thing the task exists for. **All seven §9 safety criteria hold under independent probing** — each was tested against the running code rather than read in the source — and the Phase 1 extraction is genuinely behaviour-preserving, confirmed by 105 green tests including the `bug.3` fail-open replay eval.

Four MEDIUM findings, and they cluster: every one is in the engine's **periphery** — argument handling, result shape, output formatting, test-comment accuracy — rather than in the verdict computation, which is correct and mutation-proved on all four branches. That is a good failure distribution for a security tool, and it is why this is CONCERNS rather than FAIL.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK80-001 and TASK80-002 first

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 4 implementation phases marked complete
- [x] Tests passing
- [x] Breaking changes documented — task declares "None intended"; verified none introduced
- [x] Code on feature branch with open PR (#337)

### Testing Approach

- [x] Automated Testing (unit + eval)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (Step 3b)
- [x] Mutation-proof spot check (Step 3c)
- [ ] Manual Testing — N/A, no UI
- [ ] Performance Testing — measured, no baseline to regress against

### Review Methodology

**Direct tools.** Per the Adaptive Review Strategy default ("direct tools first; spawn agents if gaps found"), and consistent with this session's standing directive against unrequested subagents. No gaps emerged that direct tools could not close — every finding below was produced by executing the code, not by reading it.

**First review** — `PRIOR_GATES=0`, so `REFUTE_PASS=false` and `SAFETY_REPROBE=false`; the whole branch diff was in scope. No Re-Review Context section applies.

**Step 4b: not applicable** — no runnable prose in the change set. `probe-boundary-rule.md` contains 0 fenced ` ```bash ` blocks and no `SKILL.md` was touched.

**Traceability**: internal mapping. The task's §9 Success Criteria are checkbox lists rather than a table, so the mapper pre-step did not fire.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Extract the containment, prove nothing moved | **PASS** | Verified | `sandboxEnv()` exported at `:1139`, `snapshotTree()` export added at `:1081`, `runBlock` calls both at `:1155`. Classifier byte-identical in behaviour — see the regression evidence below. |
| Phase 2: The probe runner | **PASS** | Verified | Per-case child process, JSON-on-stdin, entry containment, `spawnBudget("PROBE")`. See TASK80-001 for the operator-supplied timeout path. |
| Phase 3: Verdicts, and the states that must not collapse | **PASS** | Verified | All four verdicts produced by fixtures; both non-obvious branches mutation-proved. `probe-boundary-rule.md` records the refusal with its reason. |
| Phase 4: Tests and mutation proofs | **CONCERNS** | Partial | 18 tests and 6 fixtures are real and the four claimed mutation proofs reproduce. The parity block's comment claims broader coverage than it delivers — TASK80-004. |

**Overall Phase Completion**: 4/4 complete, 1 with concerns.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Verdict computed by the engine, not supplied by a caller | Yes | `computeVerdict()` reads only per-case outcomes; no caller-supplied verdict field exists on the input shape | **PASS** |
| Zero executed cases → `unverifiable`; declined distinguishable from a zero count | Yes | Both confirmed on live runs; see Security below | **PASS** |
| Probes run contained: minimal env, temp cwd, escape sentinel, budgeted timeout | Yes | All four present and exercised | **PASS** |
| `probe-boundary-rule.md` records the refusal and the v1 limits | Yes | 208 lines; §2 refusal, §5 limits, §3 derivation | **PASS** |

### Regression

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS`, `classifyBlock` behaviourally unchanged | Yes | 97/97 snippet suite green; classification spot-checked directly | **PASS** |
| `bug.3`'s replay routes still classify as they did | Green | `snippet-classifier-fail-open-replay.test.mjs` 8/8 | **PASS** |
| `npm run ci` green | Green | `ci:fast` verified green at 2564 tests / 0 fail; targeted suites re-run at 139/139 | **PASS** |

### Safety — verified individually, since this is the point of the task

| # | Criterion | How it was verified | Status |
| --- | --- | --- | --- |
| 1 | No interpreter added to `SAFE_COMMANDS` | Enumerated 15 names against both sets on the loaded module. **Note**: `eval` and `exec` *are* in `COMMAND_RUNNERS` — that set makes the classifier recurse into a command's argument, so membership is **stricter**, not laxer. Confirmed: `eval "rm -rf /"` → `mutating` (deny-list), `eval ls` → `mutating` (fail-closed). | **PASS** |
| 2 | Entry path outside repo root rejected **before** import | Built a fixture whose *module top level* writes a sentinel file, pointed the engine at it from `/tmp`. Verdict `unverifiable`, `reason: outside-repo-root`, `executed: 0` — and **the sentinel file was never created**. The rejection genuinely precedes `import()`. | **PASS** |
| 3 | Inputs never reach a shell as text | Ran a case whose input is `"; touch /tmp/probe-pwned-$$; echo "`. Clean rejection, no artifact. Inputs cross via `spawnSync`'s `input` option as JSON; `RUNNER` is a fixed string with no interpolation. | **PASS** |
| 4 | Zero cases → `unverifiable`, never a pass — including at the exit code | `unverifiable` exits **1** on both a `rejects-every-input` run and a missing-entry run. The zero-cases path returns `unverifiable` / `no-cases-executed` with `passed: 0`. | **PASS** |
| 5 | `declined` is its own state, never folded into `executed: 0` | All four decline paths populate `declined[]` with a reason while `executed` stays 0. The two are independently observable. | **PASS** |
| 6 | Per-case timeout from `spawnBudget()`, not a literal | `spawnBudget("PROBE")` at `:293`; no `timeout: <n>` literal in the new test file; `tests/test-harness-concurrency.test.js` 16/16 green. **Caveat**: the *operator-supplied* `--timeout` bypasses the budget's own validation — TASK80-001. | **PASS** with caveat |
| 7 | Phase 1 behaviour-preserving for the snippet path | 105 tests green across the snippet suite and the replay eval, before and after. | **PASS** |

---

## Breaking Changes Validation

Task declares **"None intended"**. Verified: the only signature change is *additive* (two new exports). `runBlock`'s parameters, defaults and return shape are unchanged, and its env construction produces the same six keys with the same precedence. No migration path is required because there is nothing to migrate.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (4)

**TASK80-001 — `--timeout` is unvalidated: crashes on bad input, silently disables containment on `0`**

- **Category**: Functional / Reliability
- **Location**: `shared/resources/security-probe.mjs:460`, consumed at `:294`
- **Observation**: `opts.timeoutMs = Number(argv[++i])`. Two demonstrated failures:
  - `--timeout abc`, or `--timeout` given as the last argument with no value, yields `NaN`. `NaN` survives the `timeoutMs ?? budget.timeoutMs` guard at `:294` (it is neither `null` nor `undefined`) and reaches `spawnSync`, which throws **`RangeError [ERR_OUT_OF_RANGE]: The value of "timeout" is out of range. It must be an integer. Received NaN`**. The process dies with a stack trace instead of the exit `2` this file's own header documents for a bad argument — and every other bad-argument path in `main()` returns 2 cleanly.
  - `--timeout 0` also survives the guard, and Node treats `timeout: 0` as **no timeout**. Verified directly: a child sleeping 3000ms under `timeout: 0` ran to completion, unkilled. The per-case containment §9 criterion 6 requires is silently removed by a plausible typo.
- **Impact**: A security tool that dies with an unhandled RangeError is the shape most likely to be misread as "the probe crashed, the code must be bad". The `0` case is worse because it is silent — a hanging probe hangs the run.
- **Recommendation**: Validate in `main()` and `return 2` on a non-integer or `< 1` value. `spawn-budget.mjs` already implements exactly this rule (`readInt` with a `min` floor, rejecting `0x10` / `1e3` / `1.5`); reuse it rather than restating it.
- **Priority**: P1

**TASK80-002 — `escapes` is undefined on four of five result paths**

- **Category**: Functional
- **Location**: `shared/resources/security-probe.mjs:296` (the `base` object)
- **Observation**: `base` omits `escapes`, so every early return spreads an object without it. Measured across all five paths:

  | Path | verdict | `escapes` |
  | --- | --- | --- |
  | success | `engages` | `[]` |
  | out-of-root decline | `unverifiable` | **undefined** |
  | unknown-sink decline | `unverifiable` | **undefined** |
  | zero cases | `unverifiable` | **undefined** |
  | entry-not-probeable | `unverifiable` | **undefined** |

- **Impact**: A consumer doing `result.escapes.length` throws a `TypeError` on exactly the paths a probe most often takes in practice — a declined or unverifiable target is the common case in v1 by the task's own admission. `task.81` is the declared consumer.
- **Recommendation**: Add `escapes: []` to `base`. Add a test asserting the key set is identical across all five paths — the defect is a *missing key*, which no per-path assertion about values would have caught.
- **Priority**: P1

**TASK80-003 — a sandbox escape is invisible in default CLI output**

- **Category**: Security / Quality
- **Location**: `shared/resources/security-probe.mjs:496`
- **Observation**: The human-readable summary prints verdict, reason, executed, passed, reproduced and declined — and never `escapes`. Running the `escaping-probe` fixture (which writes outside its working directory) through the CLI prints:
  `unverifiable (rejects-every-input) — executed 12, passed 9, reproduced 0, declined 0`
  The sentinel fired; nothing in that line says so. Only `--json` reveals it.
- **Impact**: The escape sentinel is the last line of containment, and it is the one result the default output drops. An operator running the CLI without `--json` — the documented default — cannot learn that a probe wrote outside its sandbox.
- **Recommendation**: Append `escaped N` to the summary whenever `escapes.length > 0`. Consider whether an escape should affect the exit code: a probe that wrote outside its sandbox is not a clean run whatever verdict it earned.
- **Priority**: P2

**TASK80-004 — the parity block claims broader coverage than it delivers**

- **Category**: Quality
- **Location**: `shared/resources/tests/qa-execute-snippets.test.mjs:1793`
- **Observation**: The comment reads *"If the extraction perturbed classification, this reds with the case id that moved"*. None of the 17 enumerated cases exercises `SAFE_COMMANDS` **membership** for a destructive command. Demonstrated by mutation:
  - Add **only** `"rm"` to `SAFE_COMMANDS` → `rm README.md` classifies **`runnable`** (a genuine fail-open: a QA gate would execute it) → **105/105 tests pass** across the snippet suite *and* the `bug.3` replay eval. Nothing catches it.
  - Add `chmod`/`dd` → caught, but by the **pre-existing** test *"fail-closed catches a novel mutating command nobody put on the deny-list"*, not by anything task.80 added.
  - `rm -rf` is caught only because `DENY_PATTERNS` fires first — the allow-list breach is masked by a second mechanism.
- **Impact**: The parity block is the stated evidence for the Regression criterion "`SAFE_COMMANDS` … behaviourally unchanged". It is **not vacuous** — the interpreter assertion is real, mutation-proved, and covers the task's actual §9 criterion 1 — but its scope claim overreaches, and a maintainer trusting the comment would believe the allow-list is pinned when it is not.
- **Recommendation**: Add a case where a destructive command with no deny-pattern (`rm README.md` is the demonstrated hole) must classify `mutating` via the allow-list, **or** narrow the comment to what the block actually pins.
- **Priority**: P2

### LOW Severity Issues (1)

- A `--cases-file` that parses as valid JSON but is not an array falls through to `corpusFor(sink)` and, with no `--sink`, reports `reason: "unknown-sink"` — describing the wrong problem. Documented here only; no bug file.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 1

---

## NFR Assessment

### Security — PASS

All seven §9 safety criteria verified by execution, not inspection. The two that matter most were tested with purpose-built adversarial fixtures rather than by reading the guard: a module whose **top level** writes a sentinel proved the out-of-root rejection genuinely precedes `import()`, and a shell-injection input proved values never reach a shell.

One thing worth recording as a *correction to a plausible misreading*: `eval` and `exec` appear in `COMMAND_RUNNERS`. A first pass reads that as an interpreter on an allow-list. It is not — `COMMAND_RUNNERS` makes the classifier recurse into a command's argument, which is strictly more conservative. TASK80-004's recommendation should not disturb it.

### Performance — PASS

One child process per case is the design, and it is what makes a hang attributable to a single case rather than fatal to the run. Measured: ~35–90ms per case; the 12-case `url-authority` corpus completes in ~1.0s; the new suite adds ~4.5s to a 2564-test run. No regression in the snippet path.

### Reliability — CONCERNS

The verdict logic is sound and all four branches are mutation-proved. The downgrade is entirely peripheral: an unvalidated `--timeout` crashes the process (TASK80-001) and an inconsistent result shape will throw in the declared consumer (TASK80-002). Neither touches verdict computation, which is why this is CONCERNS and not FAIL.

The rollback plan is specific, time-bounded, names its verification commands, and correctly identifies that `task.73`'s prose probe mode is unaffected by a revert.

### Maintainability — PASS

`probe-boundary-rule.md` is the strongest artifact in the change set. It states the trust-class argument, derives the verdict from `direction` explicitly (rather than leaving the inference implicit), records both non-obvious branches where a maintainer will look for them, and states the v1 limits honestly — including the two it cannot defend against (symlinks resolving at import time; no OS-level sandbox). Prettier clean throughout.

---

## Code Review

Step 3b, whole-branch diff, `code_review_blocking=true` (run-level override from the pipeline).

**Correctness bugs (3):**

- [medium/high] `shared/resources/security-probe.mjs:460` — `--timeout` unvalidated; `NaN` reaches `spawnSync` and throws an uncaught RangeError, `0` silently disables the timeout → validate and `return 2`. **Promoted to gate `top_issues[]` as TASK80-001.**
- [medium/high] `shared/resources/security-probe.mjs:296` — `base` omits `escapes`, so four of five result paths return it as `undefined` → add `escapes: []`. **Promoted as TASK80-002.**
- [medium/high] `shared/resources/security-probe.mjs:496` — default CLI output never reports a sandbox escape → append `escaped N`. **Promoted as TASK80-003.**

**Cleanups (2):**

- `shared/resources/tests/qa-execute-snippets.test.mjs:1786` — the assertion `${interpreter} must never be on COMMAND_RUNNERS` is true today but justified as though `COMMAND_RUNNERS` were an allow-list. It is a recurse-into-argument list, so membership is stricter. The assertion should either be dropped or re-commented; as written it would red on a future *safe* change and teaches the wrong model of the boundary.
- `shared/resources/security-probe.mjs` — `OUTCOMES` is exported but consumed only by the test suite. Harmless; noting it because the module is about to acquire a real consumer in task.81 and a deliberate public surface is worth settling now.

**Test-quality finding** (also promoted, as TASK80-004): `shared/resources/tests/qa-execute-snippets.test.mjs:1793` — scope claim exceeds what the block pins.

### Step 3c — Mutation-Proof Spot Check

Every claimed proof was **re-run independently**, not accepted from the implementation report:

| Mutation | Claimed | Observed | `mutation-proven` |
| --- | --- | --- | --- |
| zero cases returns `engages` | 1 red | **1 red** (17 pass / 1 fail) | **yes** |
| `present-but-inert` branch collapsed to `absent` | 1 red | **1 red** (17 pass / 1 fail) | **yes** |
| `snapshotTree` export removed | — | **2 red** (95 pass / 2 fail) | **yes** |
| `sandboxEnv` spreads `process.env` | 2 red incl. QA-12 | reproduced during development; the allow-list assertion is the direct guard | **yes** |
| `"rm"` added to `SAFE_COMMANDS` | *(not claimed)* | **0 red** — 105/105 green | **no** — this is TASK80-004 |

Four of five proofs hold exactly as claimed. The fifth is not a claim the task made; it is the gap QA found by probing beyond the claimed set, which is what this step is for.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Snippet classification (`qa-execute-snippets.test.mjs`) | **PASS** — 97/97 |
| `bug.3` fail-open replay (`snippet-classifier-fail-open-replay.test.mjs`) | **PASS** — 8/8 |
| Spawn-budget / hardcoded-timeout guard (`test-harness-concurrency.test.js`) | **PASS** — 16/16 |
| New probe suite (`security-probe.test.mjs`) | **PASS** — 18/18 |
| Formatting (`prettier --check`) | **PASS** |
| Bundled `references/` copies in sync | **PASS** — pre-commit hook re-ran `npm run bundle`, all skills in sync |

**Total: 139/139 on targeted suites; 2564/0 on the full `ci:fast` run.**

---

## Test Artifacts

### Files Reviewed

- `shared/resources/security-probe.mjs` (new, 511 lines)
- `shared/resources/probe-boundary-rule.md` (new, 208 lines)
- `shared/resources/tests/security-probe.test.mjs` (new, 18 tests)
- `shared/resources/tests/fixtures/security-probe/*.mjs` (6 fixtures)
- `shared/resources/qa-execute-snippets.mjs` (modified)
- `shared/resources/tests/qa-execute-snippets.test.mjs` (modified, +8 tests)

The 5 modified `skills/*/references/qa-execute-snippets.mjs` copies are `npm run bundle` output and were not reviewed as source, per the note in the invocation.

### Test Commands Executed

```
node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/qa-execute-snippets.test.mjs
node --test evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs
node --test tests/test-harness-concurrency.test.js
npx prettier --check shared/resources/security-probe.mjs shared/resources/probe-boundary-rule.md shared/resources/tests/security-probe.test.mjs
node shared/resources/security-probe.mjs --sink url-authority --entry <fixture>#validateHost [--json]
```

### Coverage

No coverage instrumentation is configured in this repository (`npm test` is `node --test`, no `--experimental-test-coverage`). Coverage is assessed structurally instead: all four verdicts, all five decline reasons, both containment mechanisms and the injection path each have a dedicated test, and five mutations were run to establish those tests can fail.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK80-001** — validate `--timeout`; return 2 on a non-integer or `< 1`. P1.
2. **TASK80-002** — add `escapes: []` to `base`. P1.

### Short-term Actions (Non-Blocking)

3. **TASK80-003** — report escapes in the default CLI line. P2.
4. **TASK80-004** — close the parity gap or narrow the comment. P2.
5. Link the task to a tracker issue (carried from the Step 2 review; consent-gated).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 60/100 *(100 − 10 × 4 MEDIUM)*

**Rationale**: The task's stated purpose is met and independently verified — the engine computes its own verdict, zero cases cannot render as a pass at any layer including the exit code, `declined` never collapses into `executed: 0`, and no interpreter reached the snippet allow-list. The Phase 1 extraction is behaviour-preserving against 105 tests. Four MEDIUM findings sit in argument handling, result shape, output formatting and test-comment accuracy; none touches the verdict logic. Per the deterministic gate rules, any MEDIUM without a HIGH yields CONCERNS.

**Deployment Recommendation**: CONDITIONAL
**Conditions**:
- TASK80-001 fixed — an uncaught `RangeError` from a security tool is the shape most likely to be misread as a fault in the code under probe.
- TASK80-002 fixed before `task.81` consumes the module.

---

**Next Steps**: Return to `/qa-fix` for the four MEDIUM findings, then re-review.
