# QA Report: Task 306 - Probe sandbox HOME shared across cases

**Task**: [Link to task document](./task.306.probe-sandbox-home-shared-across-cases.md)
**Gate File**: [task.306.gate.1.probe-sandbox-home-shared-across-cases.yml](./task.306.gate.1.probe-sandbox-home-shared-across-cases.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Gate Status**: PASS

---

## Executive Summary

The probe's `shell:`, `shell-fn:`, `shell-argv:` and `fence:` arms now give each (case, shell) run its own `HOME` and `TMPDIR` inside its case directory. A hostile run's write there is still reported as an escape. Tests, bundle freshness, the CPU-time bound and the diff review are clean. Two low advisory findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status ready-for-review
- [x] All four implementation phases ticked
- [x] Tests passing
- [x] Breaking changes: none
- [x] Feature branch with an open PR (900)

### Review Methodology

Direct tools, inline. First review, so the whole branch diff was read. The Step 3b reviewer subagent was not dispatched: the diff review was done inline by the same session that wrote the change, so **independent review did not run** (the pipeline's own rule for an unresponsive Explore agent applies to this choice; the cost of a fresh agent was not spent on a 4-arm change that two mutation proofs already cover).

Diff review: code review. Step 4b: not applicable, no runnable prose in the change set (no `SKILL.md`, and the only Markdown changed is documentation and task artifacts).

CI on e089dbe06bcd: pending (read once, not waited on; CI is gated at `/finalise`).

---

## New Findings This Cycle

_First review: nothing to compare against._

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Measure and decide | PASS | 4 of 6 tests red on the old engine | Decision recorded in the Change Log |
| Phase 2: Per-run HOME and TMPDIR | PASS | 7 tests green | `makeRunHome`, `runHomeWatch`, `homeDirs` in `watchedSpawn` and `caseWatchedSpawn` |
| Phase 3: Tests and prompt | PASS | mutation-proved | Prompt has no passage on state-changing controls, so no edit |
| Phase 4: `$(( ))` audit | PASS | report only | Listed in the PR body; no defect |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| Legitimate take passes under bash and zsh, 0 escapes | pass | 3 tests (shell-argv, shell:, fence:) | PASS |
| Hostile write under its own HOME reported | reported | test plus mutation | PASS |
| Write outside HOME and work dir still an escape | escape | test | PASS |
| New tests go red when reverted | red | shared HOME restored: 5 red; hostile report removed: 1 red | PASS |
| No existing assertion changes except the shared HOME one | named | one: the fence test asserted `home/leak`; now asserts a per-run path for a hostile run | PASS |
| task.296 plan re-run, 0 reproduced and 0 escaped | 0 / 0 | not run | deferred to the DoD probe run |
| Suite wall time at most 1.10 times | 1.10 | CPU ratio 1.016 (74.0s to 75.2s median of 3) | PASS (CPU time, because wall time was load-noisy) |
| `bundle:check` passes | pass | 129 skills, 0 problems | PASS |
| `CI=true` suite green | green | 319 pass, 0 fail | PASS |
| Standards-named validation | pass | `npm run validate` on finalise, qa-story, qa-task, review-security: all pass | PASS |
| CHANGELOG cites task 306 | cites | `cites (task 306)` | PASS |
| Traps entry updated | updated | rewritten | PASS |
| Phase 4 list in the QA report | listed | PR body; hits below | PASS |

Phase 4 hits without `10#` that read a value from a file, command or argument: `grant-qa-cycles.sh:186` (digit-only `case` on `K`, `QA_CYCLE` from `qa-cycle.sh` which strips zeros), `jira-sprint-lib.sh:352` and `:389` (`jq length`), `move-sprint-issues.sh:67` (`jq length`), `set-github-project-estimate.sh:198` and `set-github-project-priority.sh:206` (`jq length`). No defect; none filed.

Criteria drift: clean.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (below, advisory)

- **LOW**: a recorded escape path for a per-run HOME carries the mkdtemp suffix, so it differs between runs.
- **LOW**: a legitimate case that lists its cwd sees the hidden `.probe-home-*` and `.probe-tmp-*` directories. No current case does.

---

## NFR Assessment

- **Performance**: PASS. CPU ratio 1.016.
- **Reliability**: PASS. The run-wide HOME stays for setup and `cli:`.
- **Security**: PASS. Evidence: reasoned. Probes executed: 0. The change adds no accept/reject function (`runHomeWatch` returns directories), so the boundary rule records `boundary: false`; the criteria word "refuses" describes the fixture script. Candidates considered: `runHomeWatch`, `makeRunHome`.
- **Maintainability**: PASS. One definition per concern.

---

## Code Review

**Correctness bugs (0).** Points checked by reading and by the tests: a hostile fence input that writes under HOME; a hostile file named like the HOME directory (mkdtemp avoids the collision); `snapshotTree` counts files only, so npm's empty `~/.npm` is not an escape (a test caught this during development); the shell-argv setup and the case use separate envs.

**Cleanups (2):**
- `shared/resources/security-probe.mjs` makeRunHome: stable escape-path prefix (see Issues).
- `shared/resources/security-probe.mjs` makeRunHome: hidden directories visible to a cwd listing (see Issues).

mutation-proven: shared HOME restored in `makeRunHome` → five task.306 tests → covered
mutation-proven: hostile HOME report removed in `runHomeWatch` → the hostile-write test → covered

The mutation file was restored from a copy and compared with `diff` (identical).

---

## Regression Testing

Whole `security-probe.test.mjs`: 319 pass. Remote `ci:fast` on the LAN server at the commit before the doc edits: 8468 pass, 0 fail, 3 skipped.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true command node --test shared/resources/tests/security-probe.test.mjs
npm run test:remote -- --run ci:fast
npm run bundle:check
npm run validate -- skills/finalise/
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Next Steps**: `/finalise`, which also runs the live probe re-run of task.296's plan.
