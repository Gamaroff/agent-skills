# QA Report: Task 236 - create-task 1.1 omits the required taskId argument to seedFromObservations

**Task**: [Link to task document](./task.236.create-task-seed-step-call.md)
**Gate File**: [task.236.gate.2.create-task-seed-step-call.yml](./task.236.gate.2.create-task-seed-step-call.yml)
**Previous Report**: [task.236.qa.1.create-task-seed-step-call.md](./task.236.qa.1.create-task-seed-step-call.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: CONCERNS

---

## Re-Review Context

Cycle 2: a refute pass over the whole branch diff (`origin/develop...68048996`).

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| QA-1: the new test fails from a linked worktree | ✅ FIXED | Scratch base is `scratchBase()` under the main checkout, with the ephemeral guard. The new worktree test is mutation-proven (tree-local base → test 4 red). The whole file plus `from-observation.test.js`, run from a linked worktree, passed 20/20 at 5b. |
| QA-2: TASK_ID not validated | ✅ FIXED (node layer) | `not a task number: <value>`, and `--` before the arguments. Mutation-proven (guard removed → tests 3 and 5 red). The bash layer in front of it is the new finding QA2-1. |
| QA-3: seed block unreachable by `fence:` | ✅ FIXED | `#### Steps 3 to 6: seed, ask, cite and park`. Shipped-file probe: 13 executed, 0 reproduced, 0 escaped. |
| CR-3 (cycle 1, low): `matches 0 files` is ambiguous | ⚠️ NOT FIXED (advisory) | Carried as CR-3 below. |

---

## New Findings This Cycle

- **[medium]** `skills/create-task/SKILL.md:217` — QA2-1 (CR-1): both assignments are double-quoted, so bash expands the substituted text before the node guard reads it; command substitution is silently accepted and a double quote runs a command (reproduced) → validate or single-quote the raw input before any shell reads it, with a committed test.
- **[low]** `skills/create-task/tests/seed-block-probe.js:122` — CR-2: the probe cases write both assignment lines themselves, so the probe cannot see QA2-1.
- **[low]** `skills/create-task/tests/seed-step-block.test.js:236` — CR-4: a killed run leaves a pid-named worktree behind.
- **[cleanup]** `skills/create-task/tests/seed-block-probe.js:51` — CR-5: the scratch derivation restates `shared/resources/tests/observation-log.test.mjs:72-94`.

---

## Executive Summary

Cycle 1's three findings are fixed, and each fix has a committed test that a mutation turns red. The refute pass found one medium. The seed block puts the agent-substituted task number and ids inside bash double quotes. Bash therefore expands `$(...)`, backticks and `$VAR`, and a double quote ends the string, all before the node guard sees the text. The probe cannot see this, because each case writes the assignment lines itself.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#763, OPEN, head `68048996`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [x] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools plus one Explore diff reviewer, as for a re-review. The cycle-2 override applies: a full refute pass over the whole branch diff (1698-line patch, 12 files).

- Reviewer dispatched 06:33:54Z and returned at 275,635 ms (`duration_ms`).
- Mutation proofs ran after the reviewer returned.
- Step 4b ran: see Code Review.

Re-review scope: unscoped — cycle 2 refute pass over `origin/develop...HEAD` (SAFETY_REPROBE false)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: test that runs the block | PASS | Verified | 5 tests in `seed-step-block.test.js` |
| Phase 2: block in SKILL.md | CONCERNS | Partial | QA2-1: the substitution step |
| Phase 3: proofs, bundle, validate, CI | PASS | Verified | ci:fast 6421 / 0 fail at 5b |

**Overall Phase Completion**: 3/3 phases complete, 1 with a finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --------- | ------ | ------ | ------ | -------- |
| One bash block calls `seedFromObservations` with `{ taskId }` | 1 | 1 | PASS | Test 1 asserts exactly one (`seedBlock()`); `SKILL.md:232` |
| Two open entries → one seed, both ids, `multiple-entries`, park names the task | Yes | Yes | PASS | Test 1 |
| Mismatched frontmatter id → non-zero | Yes | Yes | PASS | Test 2 |
| § 1.1 says the task id is read before the seed | Yes | Yes | PASS | `SKILL.md:209-210` |
| New test < 5 s on PR head | < 5 s | 2.930 s at load 1.93 | PASS | `uptime; time command node --test skills/create-task/tests/seed-step-block.test.js` |
| `from-observation.test.js` untouched | empty diff | empty | PASS | `git diff --quiet HEAD -- …` (no change vs develop) |
| `node:test` + `node:assert` only; Prettier clean | Yes | Yes | PASS | Prettier `--check` clean |
| Each Phase 3 mutation turns a named test red | Yes | Yes | PASS | Mutation lines below |
| validate; bundle:check | clean | rc 0; 0 problems | PASS | validate rc 0 this cycle; bundle:check at 5b |
| CHANGELOG `[Unreleased]` | Yes | Yes | PASS | `CHANGELOG.md:9` |
| No other skill restates the call | only § 1.1 | only § 1.1 | PASS | `grep -rn seedFromObservations skills shared --include=*.md` (non-generated) |

---

## Breaking Changes Validation

None. The block's output shape is unchanged. The new refusals reject only inputs that were already wrong.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: substituted inputs are expanded by bash before the guard reads them (QA2-1)**
- **Severity**: MEDIUM
- **Category**: Security / Functional
- **Observation**: the shipped block was run with the ids substituted the way an agent substitutes them. Results:
  - `1,$(echo 2)`: exit 0, seeded `[1,2]`.
  - `` 1,`echo 2` ``: exit 0, seeded `[1,2]`.
  - `1"; touch <marker>; "`: exit 0, seeded `[1]`, and the marker file was written.
  - `$HOME`: refused as `not an observation id: /home/gamaroff`, which names the expansion rather than the input.
- **Provenance**: new to this change. `origin/develop`'s SKILL.md has no `OBS_IDS=` (0 hits).
- **Impact**: the block's claim that it refuses a non-digit input "naming the input" is false. An id list carrying shell syntax can seed and park entries other than the ones typed.
- **Recommendation**: see the gate's `suggested_action`.
- **Priority**: P2

Not filed as a bug report: it is promoted to the gate (`code_review_blocking`), and `/qa-fix` takes it from there.

### LOW Severity Issues (3)

CR-2, CR-3, CR-4: see Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
2.930 s at load 1.93 (bound < 5 s). Of that, 2.1 s is the probe test.

### Reliability — PASS
The suite passes from a linked worktree. CR-4 (low): a run killed between `git worktree add` and the `finally` leaves a worktree behind.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 13 (record `task.236.qa.2.security.run.json`; `totals.executed` 13, `reproduced` 0, `escaped` 0)
- `boundary: true`. The block refuses on repository state, and the `fence:` form reaches it through `skills/create-task/tests/seed-block-probe.js`.
- QA2-1 is outside what the probe exercises (CR-2). It was reproduced by hand, and a hand run does not count toward `probes_executed`.

### Maintainability — PASS
CR-5 is a cleanup.

---

## Code Review

Advisory except for promoted findings (`code_review_blocking=true` from the pipeline). All 5 anchors `ok` (`finding-anchors.js`, rev `68048996`).

**Correctness bugs (4):**
- [medium/high] `skills/create-task/SKILL.md:217` — the ids are substituted inside bash double quotes, so `$(...)`, backticks, `$VAR` and `"` are expanded or break out before node sees them → validate or single-quote the raw input first. **Promoted: QA2-1.**
- [low/medium] `skills/create-task/tests/seed-block-probe.js:122` — every probe case writes both assignment lines itself, so no case exercises the substitution step → add cases through the block's own assignment form, or state the gap in the header.
- [low/high] `skills/create-task/SKILL.md:228` — `matches 0 files` covers both a missing file and an unparseable one → consult `scan.unparseable`.
- [low/medium] `skills/create-task/tests/seed-step-block.test.js:236` — a pid-named worktree survives a killed run → `mkdtempSync`, and prune before the add.

**Cleanups (1):**
- `skills/create-task/tests/seed-block-probe.js:51` — `mainCheckout`/`scratchBase` and the guard restate `shared/resources/tests/observation-log.test.mjs:72-94` → one shared helper, or cross-reference comments.

**Probe boundary:** `boundary: true`; `probes_executed: 13`; `escaped: 0`.

**Step 4b:** `qa-execute-snippets.mjs --file skills/create-task/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills`:
- Changed blocks: 1, refused as `mutating`, 0 executed. Finding `changed-blocks-not-executed` (advisory).
- File: 6 blocks, all `mutating`.
- Shells: bash only (`zsh-unavailable`).
- The changed block is executed from disk by `seed-step-block.test.js` and by the fence probe.

**Platform variance:** the scratch base comes from git, not `os.tmpdir()`. The probe's case directories are made by the engine. Cross-host check: the suite passed from a linked worktree (20/20 at 5b).

**Mutation proofs (this cycle, after the reviewer returned; each restored from a `cp` snapshot):**
- mutation-proven: removed the `not a task number` guard → tests 3 and 5 red → covered
- mutation-proven: scratch base built under the running tree → test 4 red → covered
- Earlier proofs at 5b (`--` dropped → test 5; heading dropped → test 5) were not re-run this cycle.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| create-task suite (`skills/create-task/tests/*.test.js`) | 49/49 PASS |
| `from-observation.test.js` | unchanged, passes |
| Full suite (`npm run ci:fast`, symlinks aside, at 5b on the same tree) | 6421 tests, 6407 pass, 0 fail, 14 skipped |

---

## Test Artifacts

### Files Reviewed
- `skills/create-task/SKILL.md` § 1.1
- `skills/create-task/tests/seed-step-block.test.js`
- `skills/create-task/tests/seed-block-probe.js`
- `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test 'skills/create-task/tests/*.test.js'
npm run validate -- skills/create-task/
uptime; time command node --test skills/create-task/tests/seed-step-block.test.js
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-task/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
# fence probe via buildSeedProbe(), plus --record docs/tasks/task.236.create-task-seed-step-call/task.236.qa.2.security.run.json
# CR-1 reproduction: the shipped block with hostile ids substituted, run from the repo root against a scratch workspace
```

### Coverage Report
Not measured (no coverage tooling for these node:test suites).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA2-1: the substitution step (P2).

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3, CR-4, CR-5.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium, promoted from the refute pass and reproduced. No high findings.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA2-1 fixed and re-gated.

---

**QA Report**: co-located at `task.236.qa.2.create-task-seed-step-call.md`
**Gate File**: co-located at `task.236.gate.2.create-task-seed-step-call.yml`
**Next Steps**: `/qa-fix` for QA2-1, then QA cycle 3.
