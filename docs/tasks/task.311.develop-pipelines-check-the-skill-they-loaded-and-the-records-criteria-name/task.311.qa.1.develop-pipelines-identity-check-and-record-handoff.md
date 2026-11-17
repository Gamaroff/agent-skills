# QA Report: Task 311 - Develop pipelines check the skill they loaded and the records criteria name

**Task**: [Link to task document](./task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md)
**Gate File**: [task.311.gate.1.develop-pipelines-identity-check-and-record-handoff.yml](./task.311.gate.1.develop-pipelines-identity-check-and-record-handoff.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-17
**Testing Completed**: 2026-11-17
**Gate Status**: PASS

---

## Executive Summary

Reviewed PR 916 (commit `6dfde99e9`): the skill-identity engine and rule, the three orchestrator citations, the record-criteria hand-off and the `qa-task` args. All nine success criteria are verified, the three mutation proofs went red on named committed tests, and the diff review found one low-confidence documentation gap, recorded as advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (fast gate: 8554 tests, 0 failed, on the LAN server)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR 916

### Testing Approach

- [x] Automated Testing (18 new tests, plus the fast gate)
- [x] Performance Testing (identity-check timing)
- [x] Security Review (boundary probe)
- [x] Code Review (Step 3b)
- [x] Mutation proving (Step 3c)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review. Standard pipeline mode.

Diff review: code review. The diff excluded generated `references/` copies and `docs/`, and covered 13 files.

Step 4b: the engine refused the two changed fenced blocks as `mutating` (`changed-blocks-not-executed`; `skill-resolution.md` also notes `no-executable-blocks`). Both blocks are executed by committed tests instead: `record-criteria-dispatch.test.mjs` runs the QA-loop block in a real git fixture, and `skill-resolution-reach.test.mjs` extracts the rule's command and runs it against real directories. Advisory.

CI on 6dfde99e9e47: pending (the `test` job was still running; `link-check`, `secret-scan`, `shellcheck`, `validate` and the branch-policy check had passed).

Reviewer timing: dispatched 12:02:19Z, 27 s by the completion notice's `duration_ms`.

Re-review scope: not applicable (first review).

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The identity check | PASS | Verified | Engine, rule, three orchestrator citations, 14 tests |
| Phase 2: The record hand-off | PASS | Verified | Step doc block, both task dispatch forms, `qa-task` args, 4 tests |
| Phase 3: Bundle, docs and gate | PASS | Verified | Bundled copies in sync, CHANGELOG entry, fast gate green |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `check` classifies a synced base dir as shadowed and a repo path as repo, mutation-proved per case | PASS | `skill-resolution.test.mjs` (10 tests); mutation record below |
| 2 | Three orchestrators cite the rule; a test runs the cited command from each | PASS | `skill-resolution-reach.test.mjs` (4 tests); mutation record below |
| 3 | Dispatch passes `record_criteria`; a test compares the listing with the engine | PASS | `record-criteria-dispatch.test.mjs` runs the fenced block in a git fixture |
| 4 | `qa-task` lists `record_criteria` and instructs writing each record | PASS | Record 1 below |
| 5 | Identity check at most 1 s per load, median of five | PASS | Record 2 below: 117 ms |
| 6 | `bundle:check`, `format:check`, `lint:shell`, `ci:fast` under `CI=true` | PASS | `bundle:check` 0 problems; fast gate 8554 tests, 0 failed (LAN server, `.claude/state/t311-remote5.log`) |
| 7 | `quick_validate.py` passes for the four skills | PASS | Ran for `develop-task`, `develop-story`, `develop-bug`, `qa-task`: all pass; `npm run validate` also passes for all four |
| 8 | CHANGELOG entry citing task 311 | PASS | `changelog-cites.sh`: `cites (task 311)` |
| 9 | Bundled copies regenerated and `UNREACHED`-free | PASS | `bundle:check`: 129 skills, 0 problems; the reach test asserts the copies match the source |

---

## Findings (records named by criteria)

### Phase 1 measurement: the base directory each sub-skill reports

Measured on 2026-11-17 from the `Base directory for this skill:` line each Skill call returned in this run, then passed through the engine:

| Sub-skill | Base directory reported | `check` result |
| --- | --- | --- |
| create-branch | `/home/gamaroff/Development/agent-skills/.claude/skills/create-branch` | repo (exit 0) |
| review-task | `/home/gamaroff/Development/agent-skills/.claude/skills/review-task` | repo (exit 0) |
| create-pr | `/home/gamaroff/Development/agent-skills/.claude/skills/create-pr` | repo (exit 0) |
| commit-changes | `/home/gamaroff/Development/agent-skills/.claude/skills/commit-changes` | repo (exit 0) |
| qa-task | `/home/gamaroff/Development/agent-skills/.claude/skills/qa-task` | repo (exit 0) |

All five loaded the repository's copy. Control: a fake `synced/qa-task` directory reads `shadowed`, exit 1.

### Record 1 (criterion 4): the dispatch-argument test and its mutation

Command: reverted the token in one task dispatch form, in `shared/resources/develop-pipeline-step-5-6-qa-loop.md` line 329 (`Skill(qa-task, args="code_review_blocking=true record_criteria=…")` became `args="code_review_blocking=true"`), then ran `node --test shared/resources/tests/record-criteria-dispatch.test.mjs`.

Output: failing test: **both task-variant dispatches carry record_criteria and no story dispatch does**. The file was restored from a `cp` snapshot (`cmp` clean) and the three-file baseline was green again.

mutation-proven: drop `record_criteria` from one task dispatch form → both task-variant dispatches carry record_criteria and no story dispatch does → covered

`skills/qa-task/SKILL.md` carries the token in its Pipeline Skill args example and a bullet that says to write each listed record into the report its `location` names, with the command and its output, never to edit a criterion's wording, and to name the test that went red for a mutation proof.

### Record 2 (criterion 5): identity-check timing

Command: `command node .agents/skills/develop-task/references/skill-resolution.js check --name qa-task --base-dir …/.claude/skills/qa-task --root <repo> --json`, five runs, `uptime` before each.

| Run | Wall time | Load average (1, 5, 15 min) |
| --- | --- | --- |
| 1 | 114 ms | 2.91, 3.39, 3.11 |
| 2 | 106 ms | 2.91, 3.39, 3.11 |
| 3 | 119 ms | 2.91, 3.39, 3.11 |
| 4 | 126 ms | 2.91, 3.39, 3.11 |
| 5 | 117 ms | 2.91, 3.39, 3.11 |

Median **117 ms** against the 1000 ms limit. No outlier: the range is 106 to 126 ms and the load did not change between runs. The time is mostly Node start-up.

### Mutation proofs for criteria 1 and 2

mutation-proven: engine accepts any path (`if (true || homes.includes(real))`) → a synced user-level path classifies as shadowed; the repository's copy of another skill does not vouch for this name; CLI: the exit code and the JSON reason agree for repo, shadowed and unreadable → covered

mutation-proven: develop-bug citation target changed (`#after-every-load` to `#after-load`) → develop-bug: cites the rule, bundles the engine, and the cited command runs → covered

Each file was restored from a snapshot and checked with `cmp`; `git status` showed no change in `shared/` or `skills/` afterwards.

---

## Breaking Changes Validation

None. The new `record_criteria` token is optional and the check adds one command per sub-skill load.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (1)

- Advisory, from the diff review (CR-1): the rule document does not say what to do when the Skill result has no `Base directory` line. The empty `--base-dir` then returns `usage` (exit 2), which the table reads as a call error. Recorded under `recommendations.future` in the gate.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
Median 117 ms against a 1 s limit.

### Reliability — PASS
A failing preflight omits the token instead of blocking; an unresolvable base directory reads `unreadable`, never `repo`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8
- `skill-resolution.js` `classify` is an accept/reject boundary: it decides whether loaded skill text is followed. Probed through the cli form (`--sink path`, authored cases file, exit status as verdict). 3 legitimate cases accepted (skills home, harness home, a `..` round trip), 5 hostile rejected (sibling-prefix name, a `..` escape, the synced copy, another skill's home, a missing path). The NUL-byte case errored because argv cannot carry NUL; run in process, `classify` returns `unreadable`, never `repo`. 0 reproduced, 0 escaped. Run record: `task.311.qa.1.develop-pipelines-identity-check-and-record-handoff.security.run.json`.
- The criteria carry no boundary signal (`boundary_signals: []`).

### Maintainability — PASS
One engine and one rule, cited from three orchestrators; a test asserts the bundled copies match the source.

---

## Code Review

Code review (Step 3b); advisory, no promotion to the gate.

**Correctness bugs (1):**

- [low/low] `shared/resources/skill-resolution.md:29` ⚠️ unverified anchor (out-of-range: the reviewer named line 277, a patch-file line; the row is at line 29) — a missing `Base directory` line reads `usage` with no instruction → add a sentence treating an absent line like `unreadable`.

**Cleanups (0):** none.

Boundary: `boundary: true` for `classify` (see Security). `probes_executed: 8`, `escaped: 0`.

---

## Regression Testing

The fast gate ran 8554 tests, 0 failed, on the LAN server at 5th run. The three orchestrators' other step-4 behaviour is unchanged (the diff adds one paragraph to each). The two story dispatch forms of `qa-story` are unchanged, and a test asserts they carry no `record_criteria`. PASS.

---

## Test Artifacts

### Files Reviewed

`shared/resources/skill-resolution.js`, `skill-resolution.md`, `develop-pipeline-step-5-6-qa-loop.md`, three new test files, `skills/{develop-task,develop-story,develop-bug,qa-task}/SKILL.md`, `CHANGELOG.md`.

### Test Commands Executed

```bash
node --test shared/resources/tests/skill-resolution.test.mjs
node --test shared/resources/tests/skill-resolution-reach.test.mjs
node --test shared/resources/tests/record-criteria-dispatch.test.mjs
python3 skills/create-skill/scripts/quick_validate.py skills/<skill>
npm run validate -- skills/<skill>/
node references/security-probe.mjs --sink path --entry cli:shared/resources/skill-resolution.js ...
node references/qa-execute-snippets.mjs --file <changed file> --diff-base <merge-base> --json
```

### Coverage Report

Not measured: the change set is prose, one CommonJS script and its tests; the 18 new tests exercise each branch of `classify` and each CLI exit code.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. `skill-resolution.md`: add a row for an absent `Base directory` line.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: every criterion verified from evidence; three committed tests go red under mutation; one low advisory finding.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.311.qa.1.develop-pipelines-identity-check-and-record-handoff.md`
**Gate File**: co-located at `task.311.gate.1.develop-pipelines-identity-check-and-record-handoff.yml`
**Next Steps**: Step 5c PR conformance review, then finalise.
