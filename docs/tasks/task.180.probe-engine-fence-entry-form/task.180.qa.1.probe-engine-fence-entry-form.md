# QA Report: Task 180 - security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: [task.180.probe-engine-fence-entry-form.md](./task.180.probe-engine-fence-entry-form.md)
**Gate File**: [task.180.gate.1.probe-engine-fence-entry-form.yml](./task.180.gate.1.probe-engine-fence-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: FAIL

---

## Executive Summary

The `fence:` entry form is implemented as planned across all three phases. Every success criterion
is held by a named test, the touched suites pass (194/194), and the engine executed 26 probes against
two controls with 0 reproduced. The gate fails on one reproduced HIGH: a hostile input that breaks the
block's shell syntax once substituted is scored as a refusal, so a block with no guard at all can
score `engages`. One MEDIUM: a `fence:` control's record key ignores its slot and name.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (15/15 boxes)
- [x] Tests passing (`ci:fast` 5377/0 at the develop step; touched suites 194/194 at `a318b134`)
- [x] Breaking changes documented (none — additive form and optional field)
- [x] Code on feature branch with open PR (#637)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (engine probes, recorded)
- [x] Code Review (Step 3b)

### Review Methodology

Direct tools, plus one Step 3b code-review subagent (Explore), first review — whole branch diff
(`origin/develop...HEAD`, generated `skills/*/references/` copies and the task's own docs excluded):
10 files, 33 hunks. Reviewer measured duration 129.5 s (`duration_ms` 129545 from its completion
notice). Traceability mapper not dispatched: the task's Success Criteria are checklists, not a table.
Step 4b ran (runnable prose changed). `code_review_blocking=true` from the pipeline.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 14 `fence entry` tests; four dev mutations recorded red in the implementation report |
| Phase 2: The entry form | CONCERNS | Verified | Form, `--slot`, `fixture`, bundle all present; TASK-180-001/002/003 are in this phase |
| Phase 3: Routing and proof | PASS | Verified | 6 routing docs + `probe-boundary-signals.mjs` name `fence:`; parity test; t167 proof; CHANGELOG |

**Overall Phase Completion**: 3/3 implemented; 1 with open findings.

---

## Success Criteria Verification

| Criterion | Kind | Evidence | Status |
| --- | --- | --- | --- |
| fence: + `--slot` scores exit 0 accepted, non-zero rejected | behaviour | `fence entry: exit status is the verdict…`, `…extraction takes the block under THIS heading…` | PASS as written — and the rule itself is TASK-180-001's cause |
| Missing heading / missing block is a named `entry-not-probeable` decline | behaviour | `…a heading with no bash block…`, `…extraction takes the block…` | PASS |
| `fixture` delivers env and files; an escaping path is declined | behaviour | `…fixture env and files reach the block…` | PASS |
| task.167's 13 cases → engages, 0 reproduced; flagless copy over-blocks the 4 | behaviour | `…task.167's 13 cases against the shipped…`, `…without --loglevel=notice…` | PASS |
| Four existing forms' tests pass unchanged | behaviour | full `security-probe.test.mjs` 194-test run green | PASS |
| No new timeout literal | behaviour | `tests/test-harness-concurrency.test.js` green | PASS |
| Each § 8 mutation observed red, quoted | documentation | implementation report § Step 3 (M1–M4 quoted) | PASS |
| ci:fast, bundle:check, lint:shell, validate clean | measured | implementation report: 5377/0, 0 problems, clean, ✓×4 | PASS |
| Every routing doc names `fence:` | behaviour | `every site that routes a non-JS entry names the fence: form too` | PASS |
| CHANGELOG cites (task 180) | documentation | `CHANGELOG.md` [Unreleased] › Added | PASS |

---

## Breaking Changes Validation

None declared, none found: the four existing forms, required case fields and record format are
unchanged; `fixture` is optional and no corpus case carries it. **Overall: PASS**

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a shell syntax error caused by the substitution is scored as a refusal (TASK-180-001)**
- **Severity**: HIGH
- **Category**: Security (verdict correctness)
- **Bug Report**: [task.180.bug.1.shell-syntax-error-scored-as-refusal.md](./task.180.bug.1.shell-syntax-error-scored-as-refusal.md)
- **Observation**: an accept-all block (`X="<slot>"; exit 0`) with hostile input `a"b` and legitimate `ok` → verdict `engages`, the hostile case `rejected` with exit 2.
- **Impact**: a false `engages` — the engine's worst outcome.
- **Recommendation**: score a shell parse failure `errored`; regression test + mutation proof.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: a fence: control's record key ignores its slot and name (TASK-180-002)**
- **Severity**: MEDIUM
- **Category**: Reliability (record integrity)
- **Bug Report**: [task.180.bug.2.fence-control-key-ignores-slot.md](./task.180.bug.2.fence-control-key-ignores-slot.md)
- **Observation**: `controlKey` returns `sink + entry` for every non-`cli:` entry; `toRecordEntry` drops `slot`.
- **Impact**: a second probe of one block silently replaces the first; `probes_executed` undercounts.
- **Recommendation**: record `slot`; key on `--name`, else `sink + entry + slot`.
- **Priority**: P2

### LOW Severity Issues (1)

- **TASK-180-003** — `main()` accepts `--slot ''`, which then writes an `unverifiable` record entry instead of exiting 2 (CR-3).

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
No new timeout literal; one spawn per case per shell under `spawnBudget`. The two t167 tests take
about 6 s each (13 npm spawns).

### Reliability — PASS
Every unreachable state is a named decline; per-shell case directories isolate side effects.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 26 — copied from `task.180.qa.1.security.run.json` `totals.executed`
- Boundary: **true**. Controls probed, both `engages`, 0 reproduced:
  - `shared/resources/security-probe.mjs#resolveEntry` — the `fence:` branch (13 cases: `..`, absolute, normalised escape, `node_modules`, not `.md`, no / blank heading, empty path, NUL; legitimate: the shipped block, a heading carrying `#`, a not-yet-existing contained path, a root file named `.md`). Cases: `task.180.qa.1.security.cases.json`. One case (`fence:.md#H`) was first mis-classed hostile and reproduced; a root file named `.md` is a contained Markdown path, so the case was corrected to legitimate and re-run — the control was right.
  - `fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — …` with `--slot '<fastGateCommand>'` — task.167's 13 cases through the CLI.
- `fixtureProblem` answers a reason string to refuse and `null` to accept, the inverse of the JS runner's convention, so it is not engine-probeable as an export; its refusals are held by tests and QA mutation Q2.
- CONCERNS for TASK-180-001.

### Maintainability — PASS
The form reuses the existing extraction, environment, spawn, comparison and record machinery; no
second verdict path.

---

## Code Review

Step 3b: 10 files / 33 hunks reviewed. `code_review_blocking=true`; no finding was `bug` + `high`
confidence, so none was promoted automatically. TASK-180-001 and -002 enter `top_issues[]` on QA's
own reproduction / verification; CR-1's severity is re-rated medium → high on that reproduction
(confidence unchanged at reviewer level; QA's reproduction is recorded above).

**Correctness bugs (3):**
- [medium/medium] `shared/resources/security-probe.mjs:2316` — a non-zero exit from a shell parse error is scored `rejected` → classify it `errored` (**TASK-180-001**, re-rated high)
- [medium/medium] `shared/resources/security-probe.mjs:1474` — `slot` never reaches the record, and the fence: key ignores slot and name (**TASK-180-002**)
- [low/medium] `shared/resources/security-probe.mjs:2932` — empty `--slot` passes `main()` and writes a record entry (**TASK-180-003**)

**Cleanups (2):**
- `shared/resources/security-probe.mjs:2320` — the rejection detail quotes stdout; quote stderr first, as `runCliCase` does
- `shared/resources/tests/security-probe.test.mjs:3737` — `every()` over a possibly empty `cases` passes vacuously; assert the length first

All five anchors checked by `finding-anchors.js` at `HEAD`: `ok`.

Provenance: all three bugs are in code this branch adds (new `fence:` arm); none exists on `origin/develop`.

**Mutation spot-check** (scratch worktree, source restored):
- mutation-proven: `main()` missing-`--slot` check removed → `fence entry: --slot missing … exits 2 with bad-slot` → covered
- mutation-proven: `SANDBOX_OWNED_ENV` refusal removed → `fence entry: fixture env and files reach the block…` → covered
- mutation-proven: slot-presence decline removed → `fence entry: --slot is required … must appear in the block` → covered
- mutation-proven: `.md` extension check removed → `fence entry: resolveEntry returns kind fence…` → covered

Four of four covered. The developer's M1–M4 are recorded in the implementation report.

**Step 4b:** 6 changed runnable-prose files. `skills/qa-task/SKILL.md` 21 blocks (1 runnable, 3
placeholder, 17 mutating), `skills/qa-story/SKILL.md` 20 (1/4/15); the four shared/resources and
review-security files 1 block each, all refused as mutating (`no-executable-blocks`, information).
0 findings. Shells: bash only (`zsh-unavailable` on this host). The new `fence:` invocation in
`finalise-dod-security-prompt.md` was executed by hand in its documented form (the second control
above).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Existing `path#export`, `shell:`, `shell-fn:`, `cli:` tests | PASS (security-probe.test.mjs, 194 total across touched suites) |
| Corpus schema (`security-input-corpus.test.mjs`) with the new optional field | PASS |
| Routing parity (cli: and fence:) | PASS |
| Probe-count and comment-origin lints | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `security-input-corpus.mjs`, `probe-boundary-signals.mjs`,
`probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md`, the three
`SKILL.md`s, both test files, `tests/fixtures/fence-probe/t167-cases.json`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs shared/resources/tests/security-input-corpus.test.mjs tests/bundle-comment-origin.test.js evals/shared/tests/probes-executed-population.test.mjs tests/test-harness-concurrency.test.js
command node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#resolveEntry' --cases-file task.180.qa.1.security.cases.json --name 'resolveEntry fence: branch' --record task.180.qa.1.security.run.json --json
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration' --slot '<fastGateCommand>' --cases-file shared/resources/tests/fixtures/fence-probe/t167-cases.json --name 'fast-gate precondition via fence:' --record task.180.qa.1.security.run.json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed runnable-prose file> --json
```

Standards-named validation: `npm run validate -- skills/<skill>/` for qa-task, qa-story,
review-security, finalise — ✓ each (recorded at Step 3, unchanged since).

### Coverage Report
Not measured — the repository's `node --test` runner reports no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-180-001 — score a shell parse failure `errored`; regression test (accept-all block must not score `engages`).
2. TASK-180-002 — record `slot`; key fence: controls on name or slot.

### Short-term Actions (Non-Blocking)
1. TASK-180-003 — exit 2 on an empty `--slot`.
2. CR-4, CR-5 cleanups.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced HIGH — the engine can report `engages` for an absent guard.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.180.qa.1.probe-engine-fence-entry-form.md`
**Gate File**: co-located at `task.180.gate.1.probe-engine-fence-entry-form.yml`
**Next Steps**: `/qa-fix` for TASK-180-001/002/003, then QA cycle 2 (refute pass).
