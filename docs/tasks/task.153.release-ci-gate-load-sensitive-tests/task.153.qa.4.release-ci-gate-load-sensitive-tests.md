# QA Report: Task 153 — cycle 4 (post-acceptance fix for QA3-1)

**Task**: [task.153.release-ci-gate-load-sensitive-tests.md](./task.153.release-ci-gate-load-sensitive-tests.md)
**Gate File**: [task.153.gate.4.release-ci-gate-load-sensitive-tests.yml](./task.153.gate.4.release-ci-gate-load-sensitive-tests.yml)
**Previous**: [task.153.qa.3.release-ci-gate-load-sensitive-tests.md](./task.153.qa.3.release-ci-gate-load-sensitive-tests.md)
**Review Date**: 2026-09-29
**Gate Status**: CONCERNS

## Why this cycle exists

The task was accepted with QA3-1 open. `/develop-next`'s merge gate refuses any open entry (observation #215), so QA3-1 was fixed after acceptance in commit `940390b8`, and this cycle re-gates that fix. While running the fast gate, the fix also found that task 153's own `release.sh` step 1b had pushed `tests/test-clean-checkout.test.js` over its 10 s budget in the full suite: `LOAD-SENSITIVE … 10037 ms` and `10192 ms`, but 8.1 s when run alone. Each run spawned `node` three times. The same commit cut that to one spawn with a new `--tsv` output.

Re-review scope: the single commit `6e4c097f..940390b8` (5 files, 235 lines).

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA3-1 CR-6 fixture vs schedule | FIXED | `cr6Lifetimes` unit case for retries 0..6, red on the old fixed 20 s / 120 s; M10 still red |

## New Findings This Cycle

- **[medium]** `scripts/release.sh:176` — CR4-1: a verdict line that is exactly `green` with no TAB parses as `green`, and `|| true` throws away the exit status that would contradict it. Reproduced with `bash -c 'CI_LINE=$(printf "green\n"); echo ${CI_LINE%%$'\t'*}'`, which prints `green`. → require a single line that contains a TAB, and accept `green` only when the module exited 0.
- Advisory: CR4-2 (a fallback detail that reads the same for two different states); CR4-3 (the module header does not document `--tsv`).

## NFR Assessment

- **Security**: CONCERNS. Evidence: measured, 26 probes executed (record `task.153.qa.4.security.run.json`). Both CLI controls engage with `--tsv`. The fail-open is in the shell parse, which the probe engine cannot reach. The gate test harness reproduces it instead.
- **Performance**: PASS. **Reliability**: CONCERNS (CR4-1). **Maintainability**: PASS.

## Code Review

mutation-proven: cr6Lifetimes → fixed 20 s / 120 s → cr6Lifetimes unit case → covered
mutation-proven: killGroup kills only the leader (M10), new lifetimes → CR-6 "the grandchild outlived the timeout" → covered
mutation-proven: release.sh accepts any reason → "unrecognisable" gate case → covered
mutation-proven: module ignores --tsv → release-ci-gate (7 red) → covered

## Final Assessment

**Gate Status**: CONCERNS (rule 2: one MEDIUM) · **Quality Score**: 90/100 · **Next**: fix CR4-1, re-gate.
