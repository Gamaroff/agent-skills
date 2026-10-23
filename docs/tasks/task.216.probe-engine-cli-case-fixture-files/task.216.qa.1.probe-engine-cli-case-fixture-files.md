# QA Report: Task 216 - security-probe: the cli: form honours a case's fixture.files (and env)

**Task**: [Link to task document](./task.216.probe-engine-cli-case-fixture-files.md)
**Gate File**: [task.216.gate.1.probe-engine-cli-case-fixture-files.yml](./task.216.gate.1.probe-engine-cli-case-fixture-files.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: PASS (one open LOW)

---

## Executive Summary

The `cli:` arm of the probe engine now writes a case's `fixture.files` into its case directory, merges
`fixture.env`, and declines every refusal by name before anything spawns. The behaviour was measured
three ways: the committed tests, five mutation proofs, and an engine run on the Node and Python
fixture CLIs. One LOW finding: the new docs recommend input `.` without saying that it fails under the
`filename` sink.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation steps completed (§6 has four numbered steps, no checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (§5, and the PR body)
- [x] Code on feature branch with open PR (#726)

### Testing Approach

- [x] Automated Testing (unit)
- [x] Regression Testing
- [x] Security Review (engine probe)
- [x] Code Review (Step 3b)

### Review Methodology

Direct tools, plus one diff code-review subagent. The task is small (four steps, one module) and low
risk. Reviewer dispatched 06:14:46Z, returned 06:16:54Z (`duration_ms` 74406). The patch excluded
the generated `skills/*/references/` copies, which are byte copies of the reviewed sources
(`npm run bundle:check` holds them).

Step 4b: two prose files changed (`probe-boundary-rule.md`, `finalise-dod-security-prompt.md`);
0 changed fenced blocks. The one block in `probe-boundary-rule.md` is refused as `mutating`, which is
`no-executable-blocks`: a note, not a finding.

---

## Implementation Verification

| Step | Status | Test Result | Notes |
| ---- | ------ | ----------- | ----- |
| 1. `runCliCase` honours `fixture` | PASS | Verified | `fixtureProblem`, `CLI_INTERPRETER_ENV`, collision, `writeFixtureFiles`, `fixtureCaseEnv` |
| 2. `OPTIONAL_CASE_FIELDS` comment | PASS | Verified | names `cli:` |
| 3. Docs | PASS (LOW) | Verified | TASK-216-QA1-1: input `.` caveat missing |
| 4. Tests | PASS | Verified | 8 new tests, Node and Python |

**Overall Phase Completion**: 4/4 passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --------- | ------ | ------ | ------ | -------- |
| 1. A `cli:` case with `fixture.files` runs with them in its cwd, scored by exit | accepted | accepted (Node, Python) | PASS | test "a case's fixture.files is written into its cwd…", per PR |
| 2. A `cli:` case without `fixture` is unchanged | unchanged | 96/96 `cli` tests pass | PASS | existing `cli entry` suites |
| 3. Malformed fixture, escaping path, `HOME`/`PATH`/`NODE_OPTIONS`, `expected.absent` collision declined by name | declined | declined | PASS | tests "fixture.env reaches…" and "a malformed fixture, a path…", per PR |

Code quality: `npm run ci:fast` 6201 tests, 0 fail (develop step, same content). `npm run validate`
passes for `finalise`, `qa-story`, `qa-task` and `review-security`.

---

## Breaking Changes Validation

### Breaking Change: a `cli:` case that carried `fixture` now has it honoured
Documented: Yes (§5, CHANGELOG, PR body)
Migration Path Provided: Yes. A case that relied on `fixture` being ignored drops it. A case that sets `PATH` or `NODE_OPTIONS` is now declined by name.
Migration Tested: Yes (the decline tests)
Consumer Code Updated: N/A (consumers re-vendor after release; Deferred Work)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

**TASK-216-QA1-1.** The new guidance in `finalise-dod-security-prompt.md` (Step 4, the `cli:` note)
and in `probe-boundary-rule.md` §5 tells the author to give the legitimate case input `.`, with no
caveat. Under `--sink filename` (the only materialised sink), `materialiseFixture` writes the input
as a file, so the case is declined `cannot materialise ".": EISDIR` rather than accepted. Reproduced
with the engine. The failure is safe and the decline names its cause, but the guidance is wrong for
one sink. Fix: say the caveat in both docs.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
One extra file write per case that carries `files`. A case without `fixture` is unchanged.

### Reliability — PASS
Every refusal returns before the spawn. A write failure is a named decline, never a crash.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (6 per language; record `task.216.qa.1.security.run.json`, `totals.executed` 12, `reproduced` 0, `escaped` 0)
- Boundary: `boundary: true`. `runCliCase`'s fixture validation refuses escaping paths, interpreter-steering env, sandbox-owned env and an `expected.absent` collision. It was probed with the `cli:` form on `cli-needs-data.mjs` and `cli-needs-data.py` using a 13-case file ([cases](./task.216.qa.1.security.cases.json)):
  - 3 legitimate cases accepted (files, nested files, env).
  - 3 hostile cases rejected (no files, wrong content, `..`).
  - 7 hostile fixtures declined by name: `../escaped.json`, `/tmp/task216-escaped.json`, `PATH`, `NODE_OPTIONS`, `HOME`, collision, and `fixture: 3`.
  - Neither escape target exists after the run.

### Maintainability — PASS
Reuses `fixtureProblem`, `writeFixtureFiles` and `fixtureCaseEnv`. The collision block is now in three
arms (CR-2, advisory, routed to `recommendations.future`).

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `shared/resources/finalise-dod-security-prompt.md:232`: the guidance gives the legitimate `cli:` case input `"."` with no caveat. Under `--sink filename` the case is declined `cannot materialise` (EISDIR). `probe-boundary-rule.md` has the same gap. Fix: state that `.` works only with a sink that is not materialised. Reproduced. Entered by QA as TASK-216-QA1-1 (LOW, a documentation gap). The code-review promotion rule did not fire, because the finding is not high-confidence.

**Cleanups (1):**
- `shared/resources/security-probe.mjs:2600`: a third copy of the `expected.absent` × fixture-files collision block; the other two are in `runShellArgvCase` and `runFenceCase`. Fix: extract one helper. Advisory; routed to `recommendations.future`.

Anchor check: both `ok`.

**Mutation proofs** (on the committed code, `cp` snapshot, restored byte-identical):

```
mutation-proven: drop writeFixtureFiles(fixtureDir, files) → "fixture.files is written…" + "malformed fixture…" + "fixture case carrying expected…" (6, Node + Python) → covered
mutation-proven: fixtureCaseEnv → caseEnv → "fixture.env reaches the child…" (2) → covered
mutation-proven: CLI_INTERPRETER_ENV emptied → "fixture.env reaches the child…" (2) → covered
mutation-proven: drop the fixture-files collision clause → "a malformed fixture, a path…" (2) → covered
mutation-proven: fixtureProblem bypassed → "a malformed fixture…" + "fixture.env reaches…" (4) → covered
```

Five of five.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| All `cli` tests in `security-probe.test.mjs` | 96/96 PASS |
| Full suite (`npm run ci:fast`) | 6201 tests, 0 fail |
| Platform variance: new tests under `TMPDIR=/tmp` and under a scratch `TMPDIR` | 8/8 each |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/security-input-corpus.mjs`,
`shared/resources/probe-boundary-rule.md`, `shared/resources/finalise-dod-security-prompt.md`,
`shared/resources/tests/security-probe.test.mjs`, `shared/resources/tests/fixtures/security-probe/cli-needs-data.{mjs,py}`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test --test-name-pattern="cli" shared/resources/tests/security-probe.test.mjs        # 96 pass
TMPDIR=/tmp command node --test --test-name-pattern="fixture.files is written|fixture.env reaches|malformed fixture, a path|fixture case carrying" shared/resources/tests/security-probe.test.mjs   # 8 pass
npm run validate -- skills/<each of finalise, qa-story, qa-task, review-security>/                  # all 0
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.216.probe-engine-cli-case-fixture-files/task.216.qa.1.security.cases.json \
  --sink markdown-structure --entry 'cli:shared/resources/tests/fixtures/security-probe/cli-needs-data.<mjs|py>' --argv '["merge-back","{input}"]' \
  --name 'cli-needs-data.<mjs|py> merge-back' --repo-root "$(git rev-parse --show-toplevel)" \
  --record docs/tasks/task.216.probe-engine-cli-case-fixture-files/task.216.qa.1.security.run.json --json   # 6 executed each
```

### Coverage Report
Not measured (the repository has no coverage tooling for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. TASK-216-QA1-1: add the filename-sink caveat to both docs.
2. CR-2: extract the collision check into one helper.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every success criterion has a per-PR test. The tests are mutation-proven, and the
boundary was probed with 0 reproduced and 0 escaped. The one open item is a LOW documentation caveat.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.216.qa.1.probe-engine-cli-case-fixture-files.md`
**Gate File**: co-located at `task.216.gate.1.probe-engine-cli-case-fixture-files.yml`
**Next Steps**: qa-fix for TASK-216-QA1-1, then re-review.
