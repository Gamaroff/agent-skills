# QA Report: Task 279 - develop-next reads the world before it stops

**Task**: [Link to task document](./task.279.develop-next-reads-the-world-before-it-stops.md)
**Gate File**: [task.279.gate.1.develop-next-reads-the-world-before-it-stops.yml](./task.279.gate.1.develop-next-reads-the-world-before-it-stops.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-17
**Testing Completed**: 2026-11-17
**Gate Status**: CONCERNS

---

## Executive Summary

Reviewed PR 918 (commit `013d77e7e`): the `halt-evidence.mjs` engine and its Step 0.1a call, the Step 3 gate-worktree rule, and the observe-work Session Start line in four orchestrators. Seven of the eight success criteria are verified from evidence. The eighth, a work-item hygiene check, found no `[Unreleased]` entry citing task 279 in `CHANGELOG.md`; `/finalise` 6d HALTs on that, so it goes to the fix loop as one medium finding. The diff review found one low, advisory cleanup.

**Overall Assessment**: CONCERNS (one medium, mechanical, fixable in one edit)
**Deployment Recommendation**: APPROVED once the CHANGELOG entry lands

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`CI=true npm test`: 8570 passed, 0 failed, five times on the LAN server)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR 918

### Testing Approach

- [x] Automated Testing (19 new tests: 13 in `halt-evidence.test.mjs`, 6 in `observe-work-start-line.test.mjs`)
- [x] Performance Testing (five alternating `npm test` pairs on the LAN server)
- [x] Code Review (Step 3b)
- [x] Mutation proving (Step 3c), two proofs
- [x] Gate-worktree control (beside the checkout against `/tmp`)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review. Standard pipeline mode.

Diff review: code review. The diff covered the 11 files of commit `013d77e7e`.

Step 4b: the changed `develop-next` fenced block calls `gh` and `curl`, so the engine refused it as side-effecting. Its decision logic is executed by `halt-evidence.test.mjs` instead. Advisory.

Platform variance: the unit tests write fixtures under `os.tmpdir()`, which is `/tmp` on this Linux host and in CI; no other value applies. Not run under a second value.

CI on 013d77e7ec30: green (`CI_SUMMARY=CI on 013d77e7ec30: green`).

Reviewer timing: (not measured).

Re-review scope: not applicable (first review).

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Step 0.1a evidence read | PASS | Verified | `halt-evidence.mjs`, 13 tests with controls, Step 0.1a block in `develop-next/SKILL.md` |
| Phase 2: Gate-worktree rule | PASS | Verified | Step 3 "Where the gate runs" blockquote; control below |
| Phase 3: Session Start line | PASS | Verified | Four orchestrators, one test file, non-vacuity fixture |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | A halt with both pieces of evidence routes; with either missing it stops | PASS | Record 1 below |
| 2 | A gate worktree beside the checkout passes both refusing tests | PASS | Record 2 below |
| 3 | The Session Start line is in four orchestrators, held by one test | PASS | Record 3 below |
| 4 | `npm test` wall time within 10% of `develop`, median of five | PASS | Record 4 below: -0.3% |
| 5 | The 0.1a check has a mutation proof | PASS | Record 5 below |
| 6 | `bundle --check` 0 problems; `CI=true npm test` passes | PASS | `bundle freshness: 129 skill(s) checked, 0 problems`; 10 of 10 container runs 0 failed |
| 7 | `quick_validate.py` passes for the changed skills | PASS | Passed for `develop-next`, `develop-task`, `develop-story`, `develop-bug` |
| 8 | A `halted: true` run with no merged PR still stops; the 0.1a pin passes unchanged | PASS | Record 6 below |

Hygiene check outside the criteria: `changelog-cites.sh task.279` printed `missing (task 279)` (exit 1). See Issues Found.

---

## Findings (records named by criteria)

### Record 1 (criterion 1): both pieces of evidence route, either missing stops

Command: `node --test --test-reporter=spec evals/develop-next/unit/halt-evidence.test.mjs` (13 tests, 0 failed).

- Routes: `halted, document accepted, PR MERGED: resolved out of band`.
- Controls that stop: `control: PR OPEN keeps the halt`; `control: document in-progress keeps the halt even with the PR MERGED`; `a failed PR query keeps the halt`; `a halt with no prNumber recorded has no evidence`; `an unreadable document keeps the halt`.
- Bug arm: `a bug resolves on closed, never on accepted`.

Executed through the CLI by hand as well, against the accepted task 311 document and a halted state file (no `--apply`; `git status` unchanged afterwards):

| `--pr-state` | Exit | `reason` |
| --- | --- | --- |
| `MERGED` | 0 | `resolved-out-of-band` |
| `merged` | 1 | `pr-unknown` |
| ` MERGED` (leading space) | 1 | `pr-unknown` |
| `MERGED` plus newline | 1 | `pr-unknown` |
| `MERGED;id` | 1 | `pr-unknown` |
| empty | 1 | `pr-unknown` |
| `OPEN` | 1 | `pr-not-merged` |
| `CLOSED` | 1 | `pr-not-merged` |
| `unknown` | 1 | `pr-unknown` |

The one accepting row is the control: the same call that exits 0 for `MERGED` exits 1 for every variant, so the table can fail when it should.

### Record 2 (criterion 2): the gate worktree beside the checkout

Commands, using the rule's own create, link and remove sequence at `013d77e7e`, with `CI=true`:

```bash
node --test tests/test-clean-checkout.test.js skills/create-task/tests/from-observation.test.js
```

| Worktree | Exit |
| --- | --- |
| `../.qg-t279`, a sibling of the checkout | 0 |
| `/tmp/qg-t279-ctl` (control) | 1 |

Both worktrees were removed (`git worktree list` shows only the checkout). The same two tests exit 1 under `/tmp`, so the beside-the-checkout green is not a test that passes anywhere.

### Record 3 (criterion 3): the Session Start line, four orchestrators, one test

Command: `node --test --test-reporter=spec evals/shared/tests/observe-work-start-line.test.mjs` (6 tests, 0 failed): one per `develop-next`, `develop-task`, `develop-story`, `develop-bug`, plus `the check fails on a Phase 0 without the line` (non-vacuity) and `develop-batch is not asked to carry the line`. The file is reached by the `evals/shared/tests/*.test.mjs` glob in `package.json`, and the 11-file commit runs it inside the 8570.

### Record 4 (criterion 4): `CI=true npm test` wall time, develop against the PR head

Method: the whole loop ran on the LAN server, not the laptop. `docker run` of the `test:remote` image (`agent-skills-test:1faa1e88a8b6`, `CI=true`, `--cpu-shares 128`, `timeout 40m npm test`), five alternating pairs, develop (`05b9b25f1`) then the PR head (`013d77e7e`) in each pair. The time is the container run only, with no sync. `uptime` was read on the server beside each run. Script: `.claude/state/t279-perf-server.sh`.

| Pair | develop (s) | PR head (s) | Load before develop | Load before PR |
| --- | --- | --- | --- | --- |
| 1 | 744 | 731 | 1.20, 2.65, 6.83 | 0.24, 1.62, 4.30 |
| 2 | 734 | 733 | 0.19, 1.16, 2.86 | 0.14, 0.96, 2.12 |
| 3 | 734 | 733 | 0.86, 1.16, 1.87 | 0.23, 1.03, 1.69 |
| 4 | 731 | 732 | 0.48, 1.11, 1.63 | 0.49, 1.23, 1.72 |
| 5 | 732 | 731 | 0.62, 1.19, 1.70 | 0.55, 1.11, 1.62 |

Median develop **734 s**, median PR head **732 s**: **-0.3%** against a +10% limit. All ten runs exited 0; develop passed 8551 tests and the PR head 8570 (19 new), 0 failed in every run. The server was quiet (the 1-minute load stayed under 1.3), so no run is an outlier.

Two limits. The server's `date` read about two hours behind the file times its own logs carry, so the wall times were cross-checked against the logs: dev-to-dev file spacing is 24.4 minutes (two runs of about 732 s) and the suite's own `duration_ms` is 611 s, which agree with the table. An earlier attempt drove the same measurement from the laptop through `test:remote`; its memory pressure killed it after five runs and the sync was inside each time, so those numbers are discarded and not used here.

### Record 5 (criterion 5): the 0.1a mutation proof

Mutation: in `skills/develop-next/scripts/halt-evidence.mjs`, `if (pr !== "MERGED")` became `if (false && pr !== "MERGED")`, then `node --test --test-reporter=spec evals/develop-next/unit/halt-evidence.test.mjs` (exit 1, 11 pass, 2 fail). Red tests: **control: PR OPEN keeps the halt** and **CLI: a halt the evidence does not contradict exits 1 and writes nothing**. Restored from a snapshot (`cmp` clean), the file's 13 tests green again.

mutation-proven: drop the merged check (`if (false && pr !== "MERGED")`) → control: PR OPEN keeps the halt; CLI: a halt the evidence does not contradict exits 1 and writes nothing → covered

mutation-proven: delete the develop-bug Session Start line → skills/develop-bug/SKILL.md: Step 0 / Phase 0 runs the observe-work Session Start Protocol once, if installed (exit 1, 5 pass, 1 fail); restored from a snapshot (`cmp` clean), 6 tests green again → covered

`git status` showed no change in `skills/` after either restore.

### Record 6 (criterion 8): migration, a halt without a merged PR still stops

`halt-evidence.test.mjs`: `control: PR OPEN keeps the halt` and `a halt with no prNumber recorded has no evidence` pass. `evals/develop-next/protocol/skill-shape.test.mjs` (34 tests, 0 failed) passes with no change to the file (`git diff develop...HEAD` over it is empty), including `Step 0.1: halt check, then reconciliation, then routing (obs #180, #286)`.

---

## Breaking Changes Validation

None. A recorded HALT still stops unless both pieces of evidence agree; the new Session Start line is conditional on the skill being installed.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (1)

- **T279-001** `CHANGELOG.md`: no `[Unreleased]` entry cites (task 279). `changelog-cites.sh task.279` printed `missing (task 279)`. `/finalise` 6d HALTs on this, so it is fixed here. Suggested action: add an entry under `### Added` citing (task 279) and observations #138 and #157. Owner: dev.

### LOW Severity Issues (1)

- Advisory, from the diff review (CR-1): `--json` is parsed in `halt-evidence.mjs` but nothing reads it. Recorded under `recommendations.future` in the gate.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Median 732 s against 734 s on develop (-0.3%); limit +10%.

### Reliability — PASS
A failed PR query, an unreadable document or a missing `prNumber` keeps the halt; the write is a tmp-file rename.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- Boundary decision: `boundary: false`, with `boundary_signals: []` (the criteria classifier matched nothing). Candidate considered: `halt-evidence.mjs#decide`, the one predicate the diff adds. It lacks the usual boundary signal: its inputs are a run-state file the pipeline itself writes and a PR-state token the orchestrator reads from `gh`, compared with exact equality against a closed set, so every other value falls to `unknown` and the halt stands. The nine-row CLI table in Record 1 executed that comparison by hand, but by-hand runs do not count toward `probes_executed`. If `/finalise` classes `decide` a boundary, it is probed there.

### Maintainability — PASS
One engine, one block in one step doc, one test per orchestrator line; `bundle --check` clean.

---

## Code Review

Code review (Step 3b); advisory, no promotion to the gate.

**Correctness bugs (0):** none.

**Cleanups (1):**

- [low/low] `skills/develop-next/scripts/halt-evidence.mjs:91` ⚠️ unverified anchor (the reviewer named line 92; the `--json` branch is at line 91) — `--json` is accepted by the argument parser but never read, since output is always JSON → drop the flag or document it as accepted for symmetry with the other engines.

Boundary: `boundary: false` (see Security).

---

## Regression Testing

`CI=true npm test` in the container: 8570 passed, 0 failed, ten of ten runs. `bundle --check`: 0 problems. `format:check`: clean. The existing 0.1a pin passes unchanged. PASS.

---

## Test Artifacts

### Files Reviewed

`skills/develop-next/scripts/halt-evidence.mjs`, `skills/develop-{next,task,story,bug}/SKILL.md`, `evals/develop-next/unit/halt-evidence.test.mjs`, `evals/shared/tests/observe-work-start-line.test.mjs`.

### Test Commands Executed

```bash
node --test --test-reporter=spec evals/develop-next/unit/halt-evidence.test.mjs evals/shared/tests/observe-work-start-line.test.mjs evals/develop-next/protocol/skill-shape.test.mjs
CI=true node --test tests/test-clean-checkout.test.js skills/create-task/tests/from-observation.test.js
npm run bundle -- --check
npm run format:check
python3 skills/create-skill/scripts/quick_validate.py skills/<skill>
bash .agents/skills/qa-task/references/changelog-cites.sh task.279
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 918
```

### Coverage Report

Not measured: the change set is prose, one script and its tests; the 13 tests exercise each `reason` the engine returns and each CLI exit code.

---

## Recommendations

### Immediate Actions (Blocking)

1. Add the `CHANGELOG.md` `[Unreleased]` entry citing (task 279) (T279-001).

### Short-term Actions (Non-Blocking)

1. `halt-evidence.mjs`: drop or document the unread `--json` flag.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: every success criterion is verified from evidence and both mutation proofs went red on named tests; one medium finding (the missing CHANGELOG citation) goes to the fix loop.
**Quality Score**: 90/100

**Deployment Recommendation**: APPROVED once the CHANGELOG entry lands

---

**QA Report**: co-located at `task.279.qa.1.develop-next-reads-the-world-before-it-stops.md`
**Gate File**: co-located at `task.279.gate.1.develop-next-reads-the-world-before-it-stops.yml`
**Next Steps**: qa-fix cycle 1 (CHANGELOG entry), then QA cycle 2.
