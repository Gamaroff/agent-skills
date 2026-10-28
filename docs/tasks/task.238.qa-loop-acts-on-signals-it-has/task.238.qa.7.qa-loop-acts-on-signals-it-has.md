# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.7.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.7.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 7 is the last granted cycle. It gates the cycle 6 fix `ad6fef33`, which deleted the fast
gate's `pre-existing` outcome at the third strike. The deletion holds. bug.13 and bug.14 are closed,
and every log shape the old comparison misread now reads `attributable`, with nothing run at the
base. The fast gate is green, and no caller still passes `--base`.

The unscoped safety re-probe found two MEDIUM defects in the §5c open-coverage check. The probe
engine reproduced both:

- **CR7-1 (bug.15):** `provenance: pre-existing` is matched in free text.
- **CR7-2 (bug.16):** two valid YAML shapes read `0` rather than `unreadable`.

Either way, a `CONCERNS` review with an open coverage finding can still exit to Step 7.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Bug | Status | Evidence |
|---|---|---|---|
| TASK-238-PRB6-1: tests generated at one position fold into one key | bug.13 | ✅ FIXED | The comparison is deleted. The bug.13 regression test read `pre-existing` under the `8c43db0c` script (QA re-ran that script on the fixture) and now reads attributable with the base untouched. Probe `log-same-key-twice` holds |
| TASK-238-CR6-1: a file load failure is compared without its cause | bug.14 | ✅ FIXED | The comparison is deleted. The bug.14 regression test, with a base file that fails to load, read `pre-existing` under `8c43db0c` and now reads attributable |
| TASK-238-CR6-6: `$PWD` against symlink-resolved TAP paths | — | ✅ FIXED | Moot. The code it named is deleted |

bug.13 and bug.14 are closed (Step 9b).

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551` — CR7-1: the
  open-coverage check matches `provenance: pre-existing` anywhere on any line of an entry, including
  another key's value. → Match it only in key position. bug.15
- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1552` — CR7-2: a bare `-` item
  and a flow sequence on the line after `findings:` are never opened as entries, so they read `0`.
  → Count every `category:` key under `findings:`. bug.16
- **[low]** `shared/resources/fast-gate-outcome.sh:46` — PRB7-1: a test that prints the wrapper's
  signal sentence at the start of a line makes a real red read not-measured. This is bounded: one
  extra run, and nothing is pushed.
- Advisory: CR7-3 (CI read compares per job), CR7-4 (background log removal keyed on any
  `GATE_EXIT=0` line, reproduced), CR7-5 and CR7-6 (cleanups). See Code Review.

Searched unscoped (prior gate: security FAIL). The reviewer read the whole `origin/develop...HEAD`
diff, 133 files: the shared sources and every skill document that calls them. It checked that each
bundled copy of `fast-gate-outcome.sh` and `qa-ci-read.sh` matches its source. QA enumerated the
classifier's new input surface again and probed it:

- **The log:** every former misread shape, plus the signal sentence printed by a test, indented,
  or without a SIG name.
- **The exit code:** not a number, signed, spaced, hex, command substitution, a separator, a
  newline.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#770, OPEN, head `ad6fef33`)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast`, targeted suites)
- [x] Regression Testing
- [x] Security Review (probe engine, 74 cases)
- [x] Code Review (Explore reviewer, unscoped, safety re-probe directive)
- [x] Mutation spot checks (scratch worktree)

### Review Methodology

Direct tools, plus one read-only Explore reviewer (Step 3b). The reviewer was dispatched at
06:42:25Z (`date -u`) and returned in 271 s, by `duration_ms`. All six anchors checked `ok`
(`finding-anchors.js`). Mutations ran in a scratch worktree, which has since been removed.

Re-review scope: unscoped (prior gate failed on security). Clause 1 of `qa-safety-clause1.sh` read
`true` on gate 6.

CI on ad6fef33f68f: pending

Step 4b ran `qa-execute-snippets.mjs` over the three runnable-prose files changed by `ad6fef33`:

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 4 changed blocks, all `mutating`
  (`changed-blocks-not-executed`).
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: 3 changed, all `mutating`.
  The note was `no-executable-blocks`: 8 blocks, all refused by design.
- `skills/develop-bug/SKILL.md`: no changed block.

The changed fast-gate-outcome call in both loop documents is executed by
`qa-loop-fast-gate-outcomes.test.mjs` § 3, against a real fixture repository. The gate-log blocks
are executed by § 1, under bash and zsh.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Fast-gate outcomes and gated cleanup | PASS | Verified | Two outcomes for a red since cycle 6; CR7-4 is advisory |
| Phase 2: PR Existence Check and CI read at Step 10 | PASS | Verified | CR7-3, CR7-6 advisory |
| Phase 3: Coverage findings to 5b | CONCERNS | Partial | CR7-1, CR7-2 |
| Phase 4: Guards, bundle and record | PASS | Verified | `bundle:check` 0 problems |

**Overall Phase Completion**: 4/4 implemented, 1 with findings

---

## Success Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| SC-1 gated cleanup | PASS | `qa-loop-fast-gate-outcomes.test.mjs` § 1, bash and zsh. CR7-4 is a residual shape, advisory |
| SC-2 two outcomes for a red (amended) | PASS | "5b step 0a names two outcomes for a red…" and the § 3 block runs. Mutation Q2 (exit 0 classified attributable) went red |
| SC-3 / SC-3a CI read, Bitbucket PR check | PASS | `qa-ci-read.test.mjs`, `qa-task.test.js`, `qa-story.test.js` (136/136 targeted) |
| SC-4 CONCERNS + open coverage → 5b | CONCERNS | `pr-review-loop-parity.test.mjs` holds the fixtures it has. CR7-1 and CR7-2 are shapes it misses |
| SC-4a / SC-4b | PASS | `pr-review-loop-parity.test.mjs` |
| SC-5 no CI wait | PASS | Unchanged since gate 6 |
| SC-6 nothing runs a second time (amended) | PASS | "SC-6: a green gate runs nothing a second time" and `assertBaseUntouched` in every red case |
| SC-7 `npm run ci:fast` | PASS | 6511 tests, 6497 pass, 0 fail, 14 skipped |

---

## Breaking Changes Validation

None. `fast-gate-outcome.sh` now refuses `--base`. Every caller is in this repository and was updated
in the same commit. The reviewer found no caller that still passes it.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Open-coverage check reads provenance in free text (CR7-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.238.bug.15.open-coverage-reads-provenance-in-free-text.md](./task.238.bug.15.open-coverage-reads-provenance-in-free-text.md)
- **Observation**: probe `oc-provenance-in-free-text` prints `OPEN_COVERAGE=0` for an open coverage finding
- **Impact**: a CONCERNS review with an open coverage finding exits to Step 7
- **Recommendation**: match `provenance:` only in key position
- **Priority**: P2

**Issue: Open-coverage check reads 0 for YAML shapes it did not read (CR7-2)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.238.bug.16.open-coverage-reads-zero-for-unread-yaml-shapes.md](./task.238.bug.16.open-coverage-reads-zero-for-unread-yaml-shapes.md)
- **Observation**: probes `oc-bare-dash-item` and `oc-flow-sequence-next-line` print `OPEN_COVERAGE=0`
- **Impact**: as CR7-1, for rarer shapes
- **Recommendation**: count every `category:` key under `findings:`, and say `unreadable` on a mismatch
- **Priority**: P2

### LOW Severity Issues (1)

- **PRB7-1**: a test printing the wrapper's signal sentence at line start makes a real red read
  not-measured. One extra gate run. A second not-measured counts as an attributable attempt.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
The classifier no longer creates a worktree or runs the suite a second time. It reads one log.

### Reliability — CONCERNS
CR7-4, reproduced by QA: the background-read block reads the last `GATE_EXIT=` line but removes the
log on any `GATE_EXIT=0` line. A red log whose own output holds an earlier `GATE_EXIT=0` is deleted.
The reviewer gave it medium confidence, so it stays advisory.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 74 (`task.238.qa.7.security.run.json` `totals.executed`); escaped: 0
- Five controls. `pr-argument` 8/8, `open-coverage-check` 24/24 and `exit-argument` 13/13 engage.
  `log-test-paths` is 24/25: every former `pre-existing` shape now reads attributable, and
  `log-signal-printed-by-a-test` reproduced (PRB7-1). `open-coverage-shapes` is 1/4: CR7-1 and
  CR7-2 reproduced, and the control holds. The `base-argument` control is retired, since `--base`
  is now a usage error, and `exit-argument` replaces it.

### Maintainability — PASS
The deletion removed about 190 lines of shell and 700 lines of tests. The remaining guards are
mutation-proven.

---

## Code Review

Code review is blocking for this run (`code_review_blocking=true`). The reviewer returned 4 bugs
and 2 cleanups. CR-1 and CR-2 (bug, high confidence) were promoted to the gate as TASK-238-CR7-1
and TASK-238-CR7-2.

**Correctness bugs (4):**
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551` — provenance matched
  anywhere on an entry's lines → match only in key position (CR7-1, bug.15)
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1552` — bare-dash item and
  next-line flow sequence read 0 → count every `category:` key (CR7-2, bug.16)
- [medium/medium] `shared/resources/qa-ci-read.sh:110` — the CI read marks a head failure
  pre-existing whenever the same-named base job is red, for any reason. That is coarser than the
  fast-gate comparison cycle 6 deleted → drop the base comparison, or keep base-red failures as
  top_issues (CR7-3, advisory)
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1220` — the removal keys on
  any `GATE_EXIT=0` line, the read on the last → key it on the value read (CR7-4, advisory;
  reproduced by QA in a scratch directory)

**Cleanups (2):**
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:224` — the not-measured
  restatement omits the wrapper's signal report (CR7-5)
- `shared/resources/qa-ci-read.sh:171` — a Bitbucket head pipeline beyond the 50 newest reads
  `NONE` (CR7-6)

Provenance (Step 3b 5b): all four bugs are in code this task added, and are in scope. None is
pre-existing.

Boundary: `boundary: true`. The boundaries are `fast-gate-outcome.sh` (shell-argv, two controls),
`qa-ci-read.sh` (shell-argv) and the §5c open-coverage fence (fence form, two controls).
`probes_executed: 74`, `escaped: 0`.

mutation-proven: `--base` silently accepted → "usage errors exit 2 rather than guessing an outcome" → covered
mutation-proven: exit 0 classified attributable → "SC-6: a green gate runs nothing a second time" → covered

qa-fix's three mutations on the same file (a base worktree re-added, a red printing
`pre-existing`, the signal report ignored) are recorded in the implementation report. QA did not
repeat them.

---

## Regression Testing

| Area | Result |
|---|---|
| `npm run ci:fast` | PASS: 6511 tests, 0 fail |
| Targeted suites (fast-gate outcomes, qa-ci-read, pr-review-loop-parity, qa-task, qa-story) | PASS: 136/136 |
| `develop-pipeline-on-stop.test.sh` | PASS: 52/52 |
| `validate` develop-bug, develop-task, develop-story, qa-task, qa-story | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/fast-gate-outcome.sh`, `shared/resources/qa-ci-read.sh`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `skills/develop-bug/SKILL.md`,
`evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`, and the full diff (via the reviewer).

### Test Commands Executed
```bash
npm run ci:fast
command node --test evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs shared/resources/tests/qa-ci-read.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs skills/qa-task/tests/qa-task.test.js skills/qa-story/tests/qa-story.test.js
bash shared/resources/develop-pipeline-on-stop.test.sh
npm run validate -- skills/{develop-bug,develop-task,develop-story,qa-task,qa-story}/
command node .agents/skills/qa-task/references/security-probe.mjs … (5 controls, record task.238.qa.7.security.run.json)
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file {3 changed docs} --diff-base {merge base} --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
```

### Coverage Report
Not measured. The repository records no coverage target for shell scripts. The coverage evidence is
the probe record and the mutation lines above.

---

## Recommendations

### Immediate Actions (Blocking)
1. bug.15 and bug.16 (MEDIUM), both in the §5c open-coverage check. Neither touches
   `fast-gate-outcome.sh`.

### Short-term Actions (Non-Blocking)
1. PRB7-1, CR7-3, CR7-4, CR7-5 and CR7-6 (see the gate's `recommendations.future`).
2. The structured fast-gate comparison recorded as Deferred Work on the task.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The struck mechanism is gone, and nothing it guarded regressed. Two MEDIUM defects
remain in the coverage routing this task added.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bug.15 and bug.16 fixed, or accepted as deferred work

---

**QA Report**: co-located at `task.238.qa.7.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.7.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: the QA loop decides between 5b (the last granted cycle is spent) and escalation.
