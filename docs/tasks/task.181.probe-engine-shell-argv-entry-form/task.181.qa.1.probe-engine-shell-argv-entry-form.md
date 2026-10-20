# QA Report: Task 181 - security-probe: a shell-argv: entry form

**Task**: [task.181.probe-engine-shell-argv-entry-form.md](./task.181.probe-engine-shell-argv-entry-form.md)
**Gate File**: [task.181.gate.1.probe-engine-shell-argv-entry-form.yml](./task.181.gate.1.probe-engine-shell-argv-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #641 (head `76cd351c`). The `shell-argv:` form does what the task promises: one-element argv delivery, bash as the interpreter, setup failures `errored`, and the proof run against `reenter-qa-after-finalise.sh` engages with every case past its usage line. One MEDIUM defect: a case fixture can reach the host `gh`, because `shell-argv:` honours `fixture` without the two `gh` hardenings `fence:` applies to it — reproduced, contradicting the task's parity claim.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (TASK-181-001 closed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (36 boxes ticked)
- [x] Tests passing (`ci:fast` 5415/0 at develop)
- [x] Breaking changes documented (none; refusal text change named)
- [x] Code on feature branch with open PR (#641, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine, 19 probes)
- [x] Code Review (independent Explore reviewer)

### Review Methodology

Direct tools plus one independent Explore code reviewer (first review — whole branch diff, source files only; bundled `skills/*/references/` copies excluded as byte-identical per `bundle:check`, and task docs excluded). Reviewer dispatched 21:09:32Z, returned 21:12:13Z (`duration_ms` 120512). Traceability mapper not dispatched: the task's Success Criteria are checklists, not a table.

Step 4b ran over the six changed docs: `qa-task` and `qa-story` SKILL.md — 1 runnable, 3–4 placeholder, 16–18 mutating, no findings; the four shared/skill docs with one bash block each — `no-executable-blocks` (all refused as mutating: write-redirection or `node` fail-closed). zsh absent on this host.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first (red) | PASS | Verified | 13 `shell-argv entry` tests; red on the missing export before Phase 2 |
| Phase 2: The entry form | CONCERNS | Verified | Every § 3 dispatch row decided; fixture `gh` hardening missing (TASK-181-001) |
| Phase 3: Routing and proof | PASS | Verified | Routing population test holds all six docs; proof fixtures committed |

**Overall Phase Completion**: 3/3 implemented; 1 with an open finding

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| `resolveEntry('shell-argv:…')` kind + containment | test "resolveEntry returns kind shell-argv…"; probe control 1 (11 cases engage) | PASS |
| `--argv` required / refused elsewhere | tests "every malformed flag combination…", "runProbeSpec declines bad-argv…" | PASS |
| `{input}` one element, bash interprets, every shell | tests "{input} reaches the script as ONE element…", "every shell is the caller…" (structural, zsh absent) | PASS |
| Failing setup `errored` | test "a failing setup is errored…"; mutation M2 red at develop | PASS |
| Case `fixture` honoured as `fence:` | test "--fixture-setup runs … after the case fixture is written" — files/env honoured; **`gh` hardening not** (TASK-181-001) | CONCERNS |
| `gh` handling, `--args-json` exit 2 | tests "a script or setup naming gh…", flag-combination test | PASS (entry/setup); fixture path open |
| Proof run executed > 0, none at usage line | test "the proof run — reenter-qa…" (exit 0 or 1 only); run here: 8 executed, engages | PASS |
| No existing test changes except pinned-text | diff: three `bad-argv` assertions + one review-security limits assertion | PASS |
| `npm test`, ShellCheck, Prettier, `bundle:check` | `ci:fast` 5415/0; `lint:shell` clean; `bundle:check` 0 problems | PASS |
| Routing population names `shell-argv:` | test "every site that routes a non-JS entry names the shell-argv: form too" | PASS |
| CHANGELOG names the form | `CHANGELOG.md` `[Unreleased]` | PASS |

Validation commands named by the coding standards: `npm run validate -- skills/{qa-task,qa-story,review-security,finalise}/` — all ✓.

---

## Breaking Changes Validation

### Breaking Change: `bad-argv` refusal text

Documented: Yes · Migration Path Provided: N/A (message only) · Consumer Code Updated: Yes (four pinned assertions) · Notes: no behaviour changes for any existing form.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A shell-argv: case fixture reaches the host gh (TASK-181-001)**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.181.bug.1.fixture-reaches-host-gh.md](./task.181.bug.1.fixture-reaches-host-gh.md)
- **Observation**: a fixture with `BASH_ENV=./helper.sh` and a helper that runs `$(type -ap gh)` by path ran the host `gh`; result `verdict: absent`, `reproduced: ["cr1@bash"]`, detail `ghran.txt was created`. `fence:` declines the same fixture `needs-fake-gh` (its fixture-string `namesGh` check, `security-probe.mjs:1342`, and `ghFreePath`).
- **Impact**: network and host credentials reachable from a probe run; the task's parity claim is false for this path.
- **Recommendation**: apply both hardenings to `shell-argv:`; test with this fixture, mutation-proven.
- **Priority**: P2

### LOW Severity Issues (3)

- CR-2 — `security-probe.mjs:1151`: the `bad-args` decline message omits `shell-argv:`.
- CR-3 — `probe-boundary-rule.md:394`: the `bad-argv` list says "`cli:` without `--argv`", not both forms.
- Two unnamed `shell-argv:` controls with the same argv but different `--fixture-setup` share one `controlKey`, and `emitBlock` does not print `fixture_setup`; naming the control avoids it.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
`ci:fast` 5415 pass, 0 fail; no existing suite's scope changed.

### Reliability — PASS
Setup failure, timeout and launch failure are `errored`; every proof case reaches the script's own checks.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 19 (record `task.181.qa.1.security.run.json`, `totals.executed`)
- `boundary: true` — the diff adds a refuse-by-default branch to `resolveEntry` and the `--fixture-setup` containment check. Control 1, `shared/resources/security-probe.mjs#resolveEntry` with sink `path` and 11 `shell-argv:` cases (escapes, root, `node_modules`, NUL, hash, blank; two legitimate scripts): engages. Control 2, `reenter-qa-after-finalise.sh` through the new form with the committed setup and 8 cases: engages. 0 reproduced, 0 escapes. The `--fixture-setup` containment is reachable only through `runProbeSpec`; its outside/missing refusals are held by tests. TASK-181-001 open.

### Maintainability — PASS
Form-dispatch table recorded in the task; fixture writer shared between arms; LOW cleanups above.

---

## Code Review

Reviewer: independent Explore subagent, whole branch diff (17 source files). All three anchors verified (`finding-anchors.js`: every `path:line` resolves).

**Correctness bugs (1):**
- [medium/medium] `shared/resources/security-probe.mjs:2373` — `shell-argv:` honours fixture env/files without `fence:`'s fixture-string `namesGh` check and `ghFreePath` → apply both. **Reproduced by QA and entered as TASK-181-001 (MEDIUM)**; the reviewer's severity is kept, its confidence is the reviewer's (medium) and the reproduction is the evidence.

**Cleanups (2):**
- `shared/resources/security-probe.mjs:1151` — the `bad-args` message omits `shell-argv:` → name it.
- `shared/resources/probe-boundary-rule.md:394` — "`cli:` without `--argv`" → name both forms.

Provenance: CR-1 is new to this change (the arm did not exist on base).

Mutation spot check: no fix was made this cycle. The six develop-time mutations (split `{input}`, setup → `rejected`, timeout → `rejected`, shell interprets, `--args-json` hole, setup `gh` unread) each turned a committed test red at develop — `covered`, recorded in the implementation report, not re-run here.

---

## Regression Testing

`ci:fast` covers every existing `shell:`, `shell-fn:`, `cli:` and `fence:` test unchanged; `probe-boundary-signals.test.mjs` (14/14) and `review-security.test.js` (55/55) green.

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/tests/probe-boundary-signals.test.mjs`, `shared/resources/tests/fixtures/shell-argv/*`, the six routing docs, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#resolveEntry' --cases-file docs/tasks/task.181.probe-engine-shell-argv-entry-form/task.181.qa.1.security.cases.json --repo-root "$(git rev-parse --show-toplevel)" --name 'resolveEntry shell-argv: branch' --record docs/tasks/task.181.probe-engine-shell-argv-entry-form/task.181.qa.1.security.run.json
command node shared/resources/security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh' --argv '["{input}","docs/tasks/task.42.example/report.md"]' --fixture-setup shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh --cases-file shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json --repo-root "$(git rev-parse --show-toplevel)" --name 'reenter-qa doc-dir via shell-argv:' --record docs/tasks/task.181.probe-engine-shell-argv-entry-form/task.181.qa.1.security.run.json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed doc> --json
npm run validate -- skills/<qa-task|qa-story|review-security|finalise>/
npm run lint:shell
```

### Coverage Report
Not measured (node:test, no coverage instrumentation in this repository).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-181-001 — fixture-string `gh` check and `ghFreePath` for `shell-argv:`.

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3 message/doc wording.
2. Name `shell-argv:` controls that differ only in their setup.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One MEDIUM security finding, reproduced; everything else verified.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-181-001 closed

---

**QA Report**: co-located at `task.181.qa.1.probe-engine-shell-argv-entry-form.md`
**Gate File**: co-located at `task.181.gate.1.probe-engine-shell-argv-entry-form.yml`
**Next Steps**: qa-fix cycle 1 (5b) for TASK-181-001, then re-review.
