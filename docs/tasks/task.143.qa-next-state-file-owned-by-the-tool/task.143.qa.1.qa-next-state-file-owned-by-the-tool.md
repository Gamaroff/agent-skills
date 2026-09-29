# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.1.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.1.qa-next-state-file-owned-by-the-tool.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Testing Completed**: 2026-09-24
**Gate Status**: CONCERNS

---

## Executive Summary

The change set delivers what the plan says: four `--state-*` commands, one exported `STATE_FIELDS` schema, a shared payload resolver, SKILL.md rewritten to name commands, and a hardened `--env` guard judged on the built name. The suite is green and 21 mutants over the new behaviour are all covered. The independent diff review found two MEDIUM defects in the resume path, and QA verified both. First, `--state-init` returns exit 0 with two different output shapes. Second, the legacy `priorRuns` derivation counts the run's own file whenever `runFile` is null, which is every real v0.51.0 state file.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (TASK-143-BUG-1 and TASK-143-BUG-2 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`status: ready-for-review`)
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (the `--env` refusal, with a Migration line)
- [x] Code on the feature branch with an open PR (#475, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit + CLI end-to-end in `evals/qa-next/unit/uat-status.test.mjs`)
- [x] Performance Testing (suite wall-clock)
- [x] Regression Testing
- [x] Security Review (executed `cli:` probe)
- [x] Code Review (Step 3b, independent Explore subagent)

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review. The task has 4 phases in one module and medium risk, so the Default row applies. First review, so the whole branch diff was reviewed (`origin/develop...HEAD`, 1720 lines, 11 files). `code_review_blocking=true` came from the pipeline. The reviewer returned in about 90 seconds.

Step 4b ran `qa-execute-snippets.mjs` on `skills/qa-next/SKILL.md`: 9 blocks, all refused as mutating (write-redirection ×6: the `<id>` placeholders parse as redirections; unparseable ×2; `node` not allow-listed ×1). The engine reports this as the `no-executable-blocks` note, which is information, not a finding. Both bash and zsh were available. The command sequence those blocks describe is exercised end to end by the committed test *"a run through the state commands keeps the PRE-run priorRuns and bug"*.

---

## New Findings This Cycle

First review — every finding below is new.

---

## Implementation Verification

| Phase                                          | Status   | Test Result | Notes |
| ---------------------------------------------- | -------- | ----------- | ----- |
| Phase 1: State schema and subcommands          | CONCERNS | Verified    | TASK-143-BUG-1, TASK-143-BUG-2 |
| Phase 2: SKILL.md speaks commands, not JSON    | PASS     | Verified    | Every state-file sentence names a command; Step 1's claim about the resume shape is part of BUG-1 |
| Phase 3: The LOW deferrals                     | PASS     | Verified    | Built-name env guard; Step 4.4 `pass` bullet names `--clear-note` |
| Phase 4: Docs, CHANGELOG, validation           | PASS     | Verified    | CHANGELOG Added + Fixed with Migration; README; validate/bundle/generated clean |

**Overall Phase Completion**: 3/4 phases passed clean; 1 with concerns.

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `--state-init --item/--next` write and print the `--item`/`--next` payload | byte-identical | byte-identical (test) | PASS | only on a fresh selection; see BUG-1 for the resume output |
| Different `--item` exits 5, writes nothing; same item / `--next` prints existing state | as stated | as stated | PASS | the behaviour is as specified; BUG-1 is that the specification leaves the two exit-0 shapes indistinguishable |
| After a run file is written, `--state-get` returns the pre-run `priorRuns` and `bug` | pre-run | pre-run (BUG-22/23 round trip test) | PASS | |
| `--state-set` refuses init-only fields and backward `phase` by name | refused | refused, exit 2 | PASS | |
| Legacy state file answered with derived values + `derived` marker | derived | derived | CONCERNS | wrong when `runFile` is null (BUG-2) |
| `--env 10`, `a/b`, `..` refused before anything is written | refused | refused, no dir created | PASS | |

**Performance:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No network call | none | none | PASS |
| qa-next suite wall-clock | same order | 33.1s / 55 tests (was 23.7s / 44) | PASS |

**Code Quality:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Every new test mutation-proved | all | 18 at develop + 3 QA spot checks, all covered | PASS |
| `npm test` green with symlinks moved aside | green | 3980/3980 | PASS |
| `check:generated`, `bundle --check`, `validate`, Prettier | clean | clean | PASS |

**Migration:**

| Criterion | Status |
| --- | --- |
| CHANGELOG `[Unreleased]` cites `(task 143)` with a Migration line | PASS |
| SKILL.md describes no state field as written or read without its command | PASS |

---

## Breaking Changes Validation

### Breaking Change 1: the skill writes the state file through the tool

Documented: Yes · Migration Path Provided: Yes (the legacy derivation) · Migration Tested: Yes (v0.51.0-shape test) · Consumer Code Updated: N/A.
Notes: the migration path is incomplete for the real v0.51.0 file, whose `runFile` is null (BUG-2).

### Breaking Change 2: some `--env` labels are refused

Documented: Yes · Migration Path Provided: Yes (`ci10`) · Migration Tested: Yes (`runPathFor` accepts `ci10`, `env10`, `7`, `100`, and each sorts as its day's first run) · Consumer Code Updated: N/A.

**Overall Breaking Changes Assessment:** CONCERNS (BC1 via BUG-2)

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: `--state-init` resume output is indistinguishable from a fresh selection**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.143.bug.1.state-init-resume-output-indistinguishable.md](./task.143.bug.1.state-init-resume-output-indistinguishable.md)
- **Observation**: both a fresh selection and a resume exit 0, but they print different shapes. `--state-init --next` never exits 5.
- **Impact**: the race SKILL.md Step 1 names continues with a payload that has no `items` or `checklists`.
- **Recommendation**: give the resume branch its own exit code (or refuse whenever a state file exists), and document Step 1's response.
- **Priority**: P2

**Issue: Legacy `priorRuns` derivation counts the run's own file when `runFile` is null**
- **Severity**: MEDIUM · **Category**: Functional (migration)
- **Bug Report**: [task.143.bug.2.legacy-priorruns-counts-own-run-file.md](./task.143.bug.2.legacy-priorruns-counts-own-run-file.md)
- **Observation**: `git show v0.51.0:skills/qa-next/SKILL.md` never instructs writing `runFile`. The committed test injects one, so it cannot see the real shape.
- **Impact**: the first run after an upgrade is numbered and committed as a re-run.
- **Recommendation**: at `recorded` or later with `runFile` null, also exclude the row's `Last run` target. Add a `runFile: null` test.
- **Priority**: P2

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0 (plus one pre-existing security finding and one advisory cleanup, below)

---

## NFR Assessment

### Performance — PASS

No network calls. The suite's wall-clock is up in proportion to its test count.

### Reliability — CONCERNS

The resume path has the two MEDIUM defects above. The lock is created check-then-rename, so two concurrent `--state-init` calls can both win (advisory CR-3, low).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 19 (from the run record's `totals.executed`, `task.143.qa.1.security.run.json`)
- The boundary is `uat-status.mjs --run-path D.1 --env {input}`, probed with the `cli:` form and a domain case set of 13 hostile and 6 legitimate labels. All 10 path, sequence, two-digit and empty cases were rejected, and all 6 legitimate labels were accepted. `lan\nx`, `lan\rx` and `lan\tx` were **accepted**, so the printed run path spans two lines.
- **Provenance (Step 5b):** `origin/develop`'s `uat-status.mjs` prints byte-identical output for the newline and tab cases, so they are **pre-existing** and routed to `recommendations.future` as a follow-up task. Their severity is unchanged; only the attribution is. The CHANGELOG's claim that the probe now reads `engages` holds for the task.144 case set it names, not for control characters. That wording should say so (see Recommendations).

### Maintainability — PASS

One schema export, one resolver shared by three commands, one bug-path helper shared by the payload and the derivation. SKILL.md shrank to commands.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `skills/qa-next/scripts/uat-status.mjs:1302` — `--state-init` exits 0 for both a fresh selection and a resume, with different shapes, and `--next` never exits 5 → promoted to gate as **TASK-143-BUG-1** (`code_review_blocking`)
- [medium/medium] `skills/qa-next/scripts/uat-status.mjs:1253` — legacy `priorRuns` counts the run's own file when `runFile` is null → verified by QA against `v0.51.0` and entered as **TASK-143-BUG-2**
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:1290` — lock creation is not exclusive; two concurrent inits can both write → advisory, `recommendations.future`

**Cleanups (0).**

`boundary: true` — the `--env` guard, probed as above; `probes_executed: 19`.

mutation-proven: temp-then-rename removed (state never written) → "a run through the state commands keeps the PRE-run priorRuns and bug" → covered
mutation-proven: `bug: out.bug` → `null` at init → same test → covered
mutation-proven: `--state-get` prints the raw state instead of `stateView` → "a v0.51.0-shape state file …" → covered
(plus the 18 develop-time proofs recorded in the task's Implementation Notes, each against a committed test → covered)

Platform variance: `TMPDIR=/tmp command node --test evals/qa-next/unit/uat-status.test.mjs` → 55/55, exit 0.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shared/resources/tests/security-probe.test.mjs` (task.144 consumer test changed here) | 87/87 PASS |
| `evals/qa-next/unit/uat-status.test.mjs` (pre-existing 44 tests unchanged) | 55/55 PASS |
| Full `npm test` (Step 3) | 3980/3980 PASS |

---

## Test Artifacts

### Files Reviewed
`skills/qa-next/scripts/uat-status.mjs`, `skills/qa-next/SKILL.md`, `skills/qa-next/README.md`, `evals/qa-next/unit/uat-status.test.mjs`, `shared/resources/tests/security-probe.test.mjs`, `CHANGELOG.md`, `v0.51.0:skills/qa-next/SKILL.md`.

### Test Commands Executed
```bash
command node --test evals/qa-next/unit/uat-status.test.mjs
TMPDIR=/tmp command node --test evals/qa-next/unit/uat-status.test.mjs
command node --test shared/resources/tests/security-probe.test.mjs
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-next/SKILL.md --json
command node skills/qa-task/references/security-probe.mjs --sink path --entry cli:skills/qa-next/scripts/uat-status.mjs --argv '["--root","<fixture>","--run-path","D.1","--env","{input}"]' --cases-file <env-cases.json> --record task.143.qa.1.security.run.json --name "uat-status --env" --json
```

### Coverage Report
There is no line-coverage tool for `node --test` in this repository. Coverage is evidenced by the mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-143-BUG-1: make the resume answer of `--state-init` distinguishable, and define Step 1's response to it.
2. TASK-143-BUG-2: exclude the run's own file from the derived `priorRuns` when `runFile` is null.

### Short-term Actions (Non-Blocking)
1. Follow-up task: refuse control characters in `--env` labels. This is pre-existing and reproduced by the probe.
2. Exclusive lock create (`wx`) with a per-process temp name (CR-3).
3. Qualify the CHANGELOG sentence "now reads `engages`" to the task.144 case set, or close the control-character gap in the follow-up.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Every phase landed and is tested, but two verified MEDIUM defects sit in the migration and resume path, which is the path this task exists to make trustworthy.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-143-BUG-1 and TASK-143-BUG-2 fixed.

---

**QA Report**: co-located at `task.143.qa.1.qa-next-state-file-owned-by-the-tool.md`
**Gate File**: co-located at `task.143.gate.1.qa-next-state-file-owned-by-the-tool.yml`
**Next Steps**: `/qa-fix` (cycle 1), then re-review.
