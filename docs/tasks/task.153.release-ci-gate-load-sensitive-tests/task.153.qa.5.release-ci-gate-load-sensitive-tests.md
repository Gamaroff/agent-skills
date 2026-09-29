# QA Report: Task 153 — cycle 5 (refute pass over the post-acceptance fixes)

**Task**: [task.153.release-ci-gate-load-sensitive-tests.md](./task.153.release-ci-gate-load-sensitive-tests.md)
**Gate File**: [task.153.gate.5.release-ci-gate-load-sensitive-tests.yml](./task.153.gate.5.release-ci-gate-load-sensitive-tests.yml)
**Previous**: [task.153.qa.4.release-ci-gate-load-sensitive-tests.md](./task.153.qa.4.release-ci-gate-load-sensitive-tests.md)
**Review Date**: 2026-09-29
**Gate Status**: PASS — no open entry

Re-review scope: `6e4c097f..dcda808f`, the two post-acceptance fix commits (5 files, 274 lines). The review ran with a refute directive aimed at the verdict parse.

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| QA3-1 CR-6 fixture vs schedule | FIXED | `cr6Lifetimes` unit case (retries 0..6); M10 still red |
| CR4-1 bare `green` parsed as green | FIXED | TAB required, single line, green only on exit 0; 5 new gate cases; 3 mutations red |
| CR4-2 fallback detail ambiguous | FIXED | each refusal names its reason |
| CR4-3 `--tsv` undocumented | FIXED | module header |

## New Findings This Cycle

- **[low/low]** `scripts/release.sh:177` — CR5-1: `$(...)` drops NUL bytes, so `gr\0een<TAB>x` would read as green. It is unreachable, because the module writes only its fixed reason strings. Advisory.
- **[low]** CR5-2: a comment overstates the multi-line guard. Trailing blank lines are stripped, and the verdict stays correct.
- **[low]** CR5-3: no test pins the `--tsv` detail flattening.

## NFR Assessment

Security PASS (measured, 26 probes; the shell parse is held by the gate harness). Performance PASS. Reliability PASS. Maintainability PASS.

## Code Review

mutation-proven: a line with no TAB treated as a verdict → gate "unrecognisable" case → covered
mutation-proven: green accepted on any exit → gate "green but exits non-zero" case → covered
mutation-proven: multi-line output accepted → gate "unrecognisable" case → covered
mutation-proven: module ignores `--tsv` → release-ci-gate (7 red) → covered

All four were re-run against the committed tree. `git status` was unchanged afterwards.

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment**: APPROVED
