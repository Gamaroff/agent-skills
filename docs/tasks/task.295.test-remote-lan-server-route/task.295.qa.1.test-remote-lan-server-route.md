# QA Report: Task 295 - Run the test suite on the LAN server (test:remote)

**Task**: [Link to task document](./task.295.test-remote-lan-server-route.md)
**Gate File**: [task.295.gate.1.test-remote-lan-server-route.yml](./task.295.gate.1.test-remote-lan-server-route.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Gate Status**: CONCERNS

---

## Executive Summary

`npm run test:remote` does what the task asks: it syncs the tree, runs `ci:fast` in a CI-parity container at a low CPU weight, and exits with the remote status. Two medium findings keep the gate at CONCERNS: an option given without a value hangs the runner, and the CHANGELOG has no entry for the task.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

First review, whole branch diff (`origin/develop...HEAD`, 13 files). Direct tools; the diff review was done inline, not by a dispatched subagent, so the independent-reviewer pass did not run. Diff review: code review. Step 4b: not applicable, no runnable prose in the change set (the docs carry no executable fenced blocks the engine can run; the scripts are run directly). Mutation proofs: not repeated; the developer's three proofs are recorded in the implementation report and the guard test passes (7/7).

CI on 5fd76f122c0b: pending

---

## New Findings This Cycle

- **[medium]** `scripts/remote-test/run.sh:48-55`: `--host` or `--timeout-min` as the last argument loops forever (T295-QA-1).
- **[medium]** `CHANGELOG.md`: no entry citing (task 295) (T295-QA-2).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Decisions | PASS | Verdicts recorded in task Notes |
| 1 Runner | PASS | Option parsing, exit status, unreachable path; see T295-QA-1 |
| 2 Container and sync | PASS | trixie image, hash-gated `npm ci`, `--delete` sync |
| 3 Guard test | PASS | 7/7 offline tests pass |
| 4 Docs | PASS | Contributor doc, README link, AGENTS.md section |
| 5 Acceptance | PASS | Evidence below |

**Overall Phase Completion**: 6/6

---

## Success Criteria Verification

### Acceptance runs

Server-only criteria are held by the runs the developer recorded in the implementation report (Step 3), restated here:

| Check | Command | Result |
| --- | --- | --- |
| Green run from a clean clone | `npm run test:remote` at b34efbb3 | exit 0, 8353 tests, 0 fail, 7m37s |
| A red run is red | run 1 (prettier flagged the new test file) | exit 1, failure in output |
| Bad `--run` | `npm run test:remote -- --run 'x;y'` | exit 2, no ssh |
| Unreachable server | `TEST_REMOTE_HOST=nobody@192.0.2.1` | exit 1, names `TEST_LOCAL=1`, no local run |
| zsh and awk variants | run 6 output | 92 `PASS [zsh]` lines, no skip notice |
| Low CPU weight | `docker inspect` on the live container | `CpuShares=128`, `User=1000:1000` |
| Load | `uptime` laptop before and after | 2.94 then 1.35 |

I re-ran here: the offline guard (`node --test tests/test-remote-runner.test.js`: 7 pass), `shellcheck scripts/remote-test/*.sh` (clean), `npm run lint:shell` (clean), prettier on the new test and doc (clean). I did not re-run the 7-minute server run; the evidence above is the developer's, cited from the implementation report.

Criteria drift: clean. CHANGELOG citation: missing (T295-QA-2).

---

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (2)

**T295-QA-1: missing option value hangs `run.sh`**
- Repro: `timeout 5 bash scripts/remote-test/run.sh --host` exits 124; the same for `--timeout-min`, and with `TEST_LOCAL=1`.
- Control: `--run` and `--reap` with no value exit 2 (they validate before `shift 2`).
- Fix: validate the value before shifting, and add a guard test.

**T295-QA-2: no CHANGELOG entry**
- `changelog-cites.sh` reports `missing (task 295)`; `/finalise` 6d HALTs on it. CHANGELOG.md has another session's uncommitted edits: stage only this task's hunk.

### LOW Severity Issues (2)

- `docs/contributing/testing-remote.md` step 4 omits shellcheck, rsync and the trixie base.
- `--reap` uses the top-level directory mtime, which a nested-only sync does not refresh.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance: PASS
`--cpu-shares 128` confirmed on the live container.

### Reliability: CONCERNS
The hang in T295-QA-1.

### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The `--run` validation is a boundary (criteria signal: `never`). `security-probe.mjs` (shell-argv, sink `filename`) ran 28 cases but that corpus expects a cycle-number output, so it scored every refusal as accepted and measures nothing about this entry; it is not credited. By hand, metacharacter, substitution, newline and leading-dash names exit 2 before any ssh, and the committed guard test covers metacharacters.

### Maintainability: PASS
shellcheck clean; guard test; docs present.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `scripts/remote-test/run.sh:48` - `--host` and `--timeout-min` with no value loop forever; reproduced by QA (T295-QA-1).

**Cleanups (2):**
- `scripts/remote-test/run.sh:103` - `--reap` keys on directory mtime, which may not refresh on a nested-only sync.
- `docs/contributing/testing-remote.md:34` - image contents list is incomplete.

---

## Regression Testing

No existing script's behaviour changed (the diff adds files and one `package.json` line).

---

## Test Artifacts

```bash
node --test tests/test-remote-runner.test.js
shellcheck scripts/remote-test/*.sh
npm run lint:shell
timeout 5 bash scripts/remote-test/run.sh --host   # exit 124 (defect)
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL (fix T295-QA-1 and T295-QA-2)
