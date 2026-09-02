# QA Report: Task 62 - Run each loop iteration in a fresh Claude process

**Task**: [task.62.loop-supervisor-runner.md](./task.62.loop-supervisor-runner.md)
**Gate File**: [task.62.gate.1.loop-supervisor-runner.yml](./task.62.gate.1.loop-supervisor-runner.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-28
**Testing Completed**: 2026-08-28
**Gate Status**: CONCERNS

---

## Executive Summary

The implementation is a faithful build of the plan and its correctness surface is genuinely well covered — 101 unit tests, every row of the outcome table, both named traps tested on both sides of their boundary, and a mutation probe run against four separate post-conditions before any green was trusted. The `dry-run` and cheap end-to-end acceptance criteria both pass against real execution, not fixtures.

One real defect was found by diff review: **a `loopSupervisor:` config block silently overrides an explicit CLI flag whose value happens to equal the built-in default.** For `--base` that is consequential — it is the ref the progress oracle watches — and the README promises the opposite behaviour.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after the config-precedence fix

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 8 implementation phases completed and ticked
- [x] Tests passing
- [x] Breaking changes documented (none — purely additive)
- [x] Code on feature branch with open PR (#276, OPEN)

### Testing Approach

- [x] Automated testing (101 unit tests)
- [x] Mutation proving (4 mutants)
- [x] Regression testing (full repo suite, with a clean-`develop` control run)
- [x] Security review
- [x] Code review (diff)

### Review Methodology

**Direct tools.** Adaptive Review Strategy: 5 implementation phases and a single new module — below the ">5 phases, multiple modules" threshold for parallel agents, and the task is not in a high-risk category (no auth, payments or crypto). Diff code review run as a single pass over `git diff origin/develop...HEAD`.

---

## Implementation Verification

| Phase                                     | Status | Test Result | Notes                                                                                |
| ----------------------------------------- | ------ | ----------- | ------------------------------------------------------------------------------------ |
| 1. `classify.js`, full outcome table      | PASS   | Verified    | 39 tests. Both traps on both sides of their boundary, plus the equality edge          |
| 2. `adapters.js` + probe, empty-stdout first | PASS | Verified    | 29 tests. Oracles exercised against real throwaway git repos, not mocks               |
| 3. Spawn, tee, rendered log, heartbeat    | PASS   | Verified    | Proven by the cheap e2e — two log pairs written, stream-json parsed, envelope captured |
| 4. Loop, stop policy, signals, PID lock   | PASS   | Verified    | Budget stop fired exactly at `--max-iterations 2`; PID lock and `current.json` both removed on exit |
| 5. `dry-run`, docs, gates                 | PASS   | Verified    | Plan + exact argv printed, nothing spawned                                            |

**Overall Phase Completion**: 5/5 phases passed.

Spot-check against the plan rather than against the checkboxes: `git diff origin/develop...HEAD --stat` shows 18 files / 3495 insertions, and every file in the task's Files Summary is present. No file was added that the plan did not call for.

---

## Success Criteria Verification

| #   | Criterion                                                | Target      | Actual                                                             | Status  |
| --- | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------ | ------- |
| 1   | `dry-run` prints plan + exact argv, spawns nothing        | Yes         | Verified live; resolved absolute `node`/`claude`; probed `selected T62` | PASS    |
| 2   | Every outcome row unit-tested, incl. both traps           | All rows    | 39 tests; 6 outcomes + both traps + equality boundary               | PASS    |
| 3   | Non-realpath probe classifies error, loop stops loudly    | Yes         | 4 tests, incl. "no route turns empty stdout into stop"              | PASS    |
| 4   | Cheap e2e: 2 ledger lines, 2 resumable transcripts        | 2 / 2       | 2 / 2, both transcripts on disk; `current.json` removed             | PASS    |
| 5   | One real `/develop-next` iteration                        | —           | Deferred to a post-merge operator step (reworded during review)     | DEFERRED |
| 6   | Mutation probe flips the verdict                          | All 3       | 4 mutants run, all flipped, all restored green                      | PASS    |
| 7   | `npm test`, `format:check`, `quick_validate`, `bundle`, `generate-catalog` | All green | See below                                       | CONCERNS |
| 8   | SKILL.md states the `/loop` differentiator explicitly     | Yes         | Description names "fresh Claude process and a fresh context"; body opens with a 5-row comparison | PASS |

### Code Quality Criteria

| Criterion             | Target       | Actual                                    | Status |
| --------------------- | ------------ | ----------------------------------------- | ------ |
| This task's unit tests | All passing  | 101/101                                   | PASS   |
| Prettier              | Clean        | `format:check` clean across the repo      | PASS   |
| Skill validation      | Clean        | `quick_validate.py` ✓ loop-supervisor      | PASS   |
| Bundle idempotent     | In sync      | `loop-supervisor: in sync` on re-run      | PASS   |
| Catalog fresh         | Regenerated  | 118 skills, no diff on re-run             | PASS   |
| Full `npm test`       | Green        | Fails — **but fails on clean `develop` too** | CONCERNS |

**On criterion 7.** The full suite is not clean on this branch, and a control run on a clean `develop` worktree establishes it is not clean there either: `§8b move-sprint-issues.sh` (30s timeout) and `driver claude-sdk — availability reflects SDK install + API key`. The failing set varies run to run and is entirely 20–30s timeouts inside `shared/resources/tests/jira-interception.test.mjs`, which passes **48/48 in isolation** and which this branch does not touch. Baseline `develop`: 1684 tests / 2 fail. This branch: 1785 tests, i.e. exactly +101, all of them new here and all passing. **Pre-existing and load-sensitive — not attributable to this task**, and correctly reported as such in the task document rather than papered over. Not a gate issue for task.62; worth a separate bug if the flake matters.

---

## Breaking Changes Validation

The task declares **none**, and that holds up. The change adds a new skill directory, one optional config block, one test-glob entry and two doc rows. Nothing existing changes behaviour: `/loop /develop-next` is untouched, and `loopSupervisor:` is absent-by-default with every key optional. Verified no existing file's semantics were modified — the only edits to tracked files are additive (config block appended, doc rows inserted, glob extended).

**Overall Breaking Changes Assessment:** PASS (N/A — none introduced)

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: a config block silently overrides an explicit CLI flag whose value equals the default**

- **Severity**: MEDIUM
- **Category**: Functional (correctness)
- **Location**: `skills/loop-supervisor/scripts/run-loop.mjs` — the config-merge block
- **Observation**: config is applied with sentinel comparisons against the defaults:
  ```js
  if (ls.baseBranch && opts.base === DEFAULTS.base) opts.base = ls.baseBranch;
  if (ls.cooldownSeconds != null && opts.cooldown === DEFAULTS.cooldown) { … }
  ```
  An explicitly-passed `--base develop` parses to exactly `DEFAULTS.base`, so it is indistinguishable from "not supplied". Verified directly: `parseArgs(['dry-run','--cooldown','10','--base','develop'])` yields values identical to the unset case, so a config carrying `baseBranch: main` / `cooldownSeconds: 300` would win over both explicit flags.
- **Impact**: `--base` is the ref the **progress oracle** watches. Pointed at the wrong branch, `tickCommitOracle` never fires, so every successful iteration classifies `idle` instead of `progress` — and `--max-idle` (default 2) then ends a perfectly healthy loop after two iterations while reporting no progress. That is a silent wrong-answer failure in the same family the whole design exists to prevent, which is why it is not being logged as cosmetic.
- **Contradicts the docs**: `README.md` states "Every CLI flag overrides its config key", and `docs/reference/configuration.md` repeats it. The code does not do this.
- **Recommendation**: track which options were explicitly supplied (a `Set` of seen flags in `parseArgs`) and apply config only to options absent from that set. Add unit tests pinning "explicit flag equal to the default still wins over config".
- **Priority**: P2

### LOW Severity Issues (1)

**Issue: `retry-once` appears in a JSDoc type but is not implemented**

- `skills/loop-supervisor/references/classify.js:229` documents `@param {"stop"|"continue"|"retry-once"} [policy.onError]`, but `parseArgs` rejects `retry-once` (`--on-error must be stop or continue`) and `shouldStop` has no branch for it — it would fall through to the stop branch. The plan of record lists `retry-once` as a design option; the implementation deliberately shipped two values. Drop it from the type, or implement it. Documentation-only; no runtime path reaches it.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

The central efficiency claim is real and structural: the probe runs before the spawn, so an empty frontier costs a `select-next.mjs` invocation rather than a model invocation, and the probe is skipped entirely when a run-state file exists. Budget ceilings are checked **before** each spawn rather than after, which is the difference between a ceiling and a post-hoc report. The heartbeat is a 5s `develop-pipeline.lock` read — negligible. Measured per-iteration cost in the cheap e2e fell from $0.089 to $0.010 between two identical prompts, consistent with the prompt-cache behaviour the README describes rather than overclaims.

### Reliability — CONCERNS

Signal handling is correct and specific: the first `SIGINT` finishes the current iteration rather than interrupting a merge, and a PID lock enforces single-flight so two supervisors cannot collide on `develop-pipeline.lock`. Both were exercised in the e2e (lock and `current.json` removed on clean exit). The classifier fails safe in every unknown direction — an unprovable halt file is treated as stale, an unknown outcome stops the loop, empty probe output is an error.

Marked CONCERNS solely for the MEDIUM issue above: a misconfigured base ref degrades the progress oracle silently, and silent degradation is precisely the failure mode this component exists to detect. Not a crash, which is what makes it worth blocking on.

### Security — PASS

`assets/supervisor-settings.json` pins `acceptEdits` rather than `--dangerously-skip-permissions`, keeping an approval boundary on an unattended run, and explicitly denies `git push --force` and `rm -rf /`. Adapter config overrides are restricted to path strings with no mechanism to name a module for `require()` — the code-execution surface a "custom adapter in config" feature would otherwise open is closed by construction, and the reasoning is written down at the point of the decision. No credentials are read, written or logged. The rendered log records tool-call **names without inputs**, which also limits what a log can leak.

### Maintainability — PASS

The separation is the strongest thing about the change: `classify.js` performs no I/O and `interpretProbe` takes a captured result rather than running one, so the two pieces carrying the correctness live behind pure function boundaries and are tested without subprocesses. Comments explain *why* at each non-obvious decision (the precedence choice, the fail-stale direction, tool-names-not-inputs) rather than restating the code. House style matches `schedule.mjs`. The mutation probe means the test suite has demonstrated it can fail.

---

## Code Review

Diff reviewed: `git diff origin/develop...HEAD` — 18 files, 3495 insertions.

**Correctness bugs (1):**

- [medium/high] `skills/loop-supervisor/scripts/run-loop.mjs` (config-merge block) — config overrides an explicit CLI flag when the flag's value equals the built-in default, because presence is inferred by comparing against the default rather than tracked. Worst case for `--base`, which drives the progress oracle. → Track explicitly-supplied flags in `parseArgs` and apply config only to unset options. **Promoted to gate `top_issues` (LS-1)** under `code_review_blocking=true`.

**Cleanups (1):**

- `skills/loop-supervisor/references/classify.js:229` — JSDoc `onError` type advertises `retry-once`, which `parseArgs` rejects and `shouldStop` does not implement. → Drop from the type or implement the branch.

**Checked and found clean** (recording these so a re-review need not redo them): no dead code (`spawnSyncCapture` and `DEFAULTS.heartbeatMs` are both reachable — the earlier duplicate `spawnIteration` helper was removed during development); `transcriptPathFor`'s slug rule verified against a real on-disk transcript directory; the `generic` adapter's `null` `stateFile` is guarded at both use sites; `interpretProbe` cannot return `stop` for empty stdout by any route; the ESM/CJS boundary loads through both `require()` and `import()`.

**Mutation-proven** (Step 3c): the four mutants run during development each flipped the verdict — halt-freshness ignoring the timestamp (6 tests red), leftover lock → `error` (2 red), error/halt precedence removed (5 red), empty stdout → `stop` (3 red) — with the suite green again after every restore. `mutation-proven: yes` for the outcome table and the empty-stdout guard. **Not** claimed for the config-precedence path, which has no test yet — that is the point of LS-1.

---

## Regression Testing

| Area                                | Result | Notes                                                                             |
| ----------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Existing skills (`npm run bundle`)  | PASS   | All skills report "in sync"; no other skill's `references/` changed                |
| Skill catalog                       | PASS   | Regenerates identically; 118 skills                                               |
| `select-next.mjs`                   | PASS   | Not modified. Still returns `selected T62` under `develop-next`'s own invocation   |
| Repo-wide suite                     | CONCERNS | +101 tests, all passing; residual failures reproduce on clean `develop` (see above) |
| Prettier across the repo            | PASS   | Clean                                                                             |

No dependent code exists yet — the skill is new and nothing imports it. `package.json` gained a glob entry only.

---

## Test Artifacts

### Test Commands Executed

```bash
node --test 'evals/loop-supervisor/unit/*.test.mjs'        # 101/101
npm run format:check                                        # clean
python3 skills/create-skill/scripts/quick_validate.py skills/loop-supervisor
npm run bundle && npm run generate-catalog                  # both idempotent
node skills/loop-supervisor/scripts/run-loop.mjs dry-run    # ok=True, probe=selected
npm test                                                    # + control run on a clean develop worktree
```

### Coverage

No coverage instrumentation is configured in this repo (`node --test` without `--experimental-test-coverage`). Coverage assessed structurally instead: every exported function in `classify.js` and `adapters.js` has direct tests, and the mutation probe demonstrates the assertions bind to behaviour rather than merely executing it.

---

## Recommendations

### Immediate Actions (Blocking)

1. **LS-1** — fix config/flag precedence so an explicitly-supplied flag always wins, including when its value equals the default. Add tests. (P2)

### Short-term Actions (Non-Blocking)

1. Remove `retry-once` from the `onError` JSDoc type in `classify.js`, or implement the branch.
2. Consider filing a separate bug for the flaky 20–30s timeouts in `shared/resources/tests/jira-interception.test.mjs` — pre-existing, out of scope here.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high-severity issues and no failing criteria attributable to this task. One medium-severity correctness bug (LS-1) where the documented flag-over-config precedence is not what the code does, with a silent-degradation failure mode on the oracle's base ref. Everything else verified against real execution, including a mutation probe run before any green was trusted.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Fix LS-1 and re-review.

---

**Next Steps**: `/qa-fix` for LS-1, then QA cycle 2.
