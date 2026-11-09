# QA Report: Task 269 - finalise never hand-copies agent output

**Task**: [task document](./task.269.finalise-never-hand-copies-agent-output.md)
**Gate File**: [task.269.gate.3.finalise-never-hand-copies-agent-output.yml](./task.269.gate.3.finalise-never-hand-copies-agent-output.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 re-reviewed the files changed since gate 2's head (`be88b282`): `CHANGELOG.md`, the finalise reuse block, one test file and the task documents. The cycle-2 MEDIUM and both advisory notes are fixed. No new finding.

**Overall Assessment**: PASS (100/100)
**Deployment Recommendation**: APPROVED

### Review Methodology

Direct tools only. The scoped diff is about 60 lines, so it was read inline and no reviewer subagent was dispatched; the independence of the review is lost for this cycle. Re-review scope: files changed since gate 2 (head `be88b282`; 8 files) — default, since the prior gate's security axis passed.
CI on a9845bc0847b: pending.

## Re-Review Context

| Finding | Status | Evidence |
| --- | --- | --- |
| T269-QA-6 (medium) no CHANGELOG entry | ✅ FIXED | `changelog-cites.sh task.269` answers `cites (task 269)` |
| CR-1 reuse block halts on a first run | ✅ FIXED | `DOD_N` is judged first; a test runs the block with `DOD_N` 1 and no prior head |
| CR-2 one `--engine-path` placeholder | ✅ FIXED | The block comment says to repeat the flag once per engine file |

## New Findings This Cycle

None. Searched: the scoped diff of `CHANGELOG.md`, `skills/finalise/SKILL.md` (the reuse block, lines 644-660) and `shared/resources/tests/security-probe-plan-cases-file.test.mjs`. Checked the new case order (`''`, a `{`, then a non-digit), the placeholder check inside the else branch, and the test's `delete partial[...]` so that both `{prior head}` and `{engine path}` stay unsubstituted. A `DOD_N` with a leading zero would fail `$((DOD_N-1))` as an octal, but Step 0 produces plain integers, so nothing reaches it.

## Success Criteria Verification

Unchanged since cycle 2 and all met. `criteria-drift`: clean.

## NFR Assessment

Security PASS (measured, 8 probes from the cycle-2 run record; `security-probe-plan.mjs` unchanged since). Performance PASS. Reliability PASS. Maintainability PASS.

## Code Review

No findings. No boundary code changed in this scope.

mutation-proven: reuse block checks all placeholders before the `DOD_N` skip → reuse block: an unsubstituted placeholder or a non-numeric DOD_N halts before anything runs (security-probe-plan-cases-file.test.mjs) → covered

Restored from a snapshot and compared byte for byte; `git status` shows no code change.

## Test Artifacts

### Test Commands Executed

```bash
CI=true npm run ci:fast        # 7999 pass, 0 fail (run on the fix commit)
npm run bundle:check           # 129 skills, 0 problems
bash changelog-cites.sh task.269   # cites (task 269)
```

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.

## Addendum — records the DoD run 1 asked for (criteria 6 and 7)

Added by `/finalise` after its AC agent found two record criteria short: criterion 6 had one load figure and an earlier head, and criterion 7 covered 6 of the refusals. The gate above is unchanged. Everything here was measured at code head `bd986dc0`; the one code-side change is a new assertion in `security-probe-plan-cases-file.test.mjs` (see M1a).

### Criterion 6 — timing, five runs on the two new test files

`TMPDIR=/tmp CI=true command node --test --test-reporter=spec shared/resources/tests/security-probe-plan-cases-file.test.mjs shared/resources/tests/agent-reply-block.test.mjs`; 16 tests, 16 pass, every run. The slowest case in every run was `casesFileAccepted: the probe engine executes hostile and legitimate names against it`.

| Run | `/proc/loadavg` (1, 5, 15 min) | Slowest case |
| --- | --- | --- |
| 1 | 2.22 3.82 3.99 | 374.7 ms |
| 2 | 2.22 3.82 3.99 | 384.9 ms |
| 3 | 2.22 3.82 3.99 | 381.4 ms |
| 4 | 2.22 3.82 3.99 | 357.7 ms |
| 5 | 2.20 3.79 3.98 | 410.7 ms |

Maximum 410.7 ms, under the one-second bound.

### Criterion 7 — mutation proof for each refusal the first QA reports did not cover

Each mutant removes one guard in the source, runs `security-probe-plan-cases-file.test.mjs`, `agent-reply-block.test.mjs` and `read-only-agent-writes.test.mjs` (41 tests), then restores the file from a snapshot (checked byte for byte). Baseline: 41 pass, 0 fail.

| Id | Refusal | Mutant | Result |
| --- | --- | --- | --- |
| M1a | `plan-entry-cases-file-outside-work-dir` (absolute name) | `path.isAbsolute(name)` guard removed | First run **green** (41 pass): the later containment check also refuses an absolute path outside the directory, so the guard only matters for an absolute path *inside* it, which no test covered. Added that assertion to `resolveCasesFile: a directory, an absolute name and a NUL are refused`; with it the same mutant is **red** (1 fail), restored green. |
| M1b | `plan-entry-cases-file-outside-work-dir` (climbing name) | lexical `..` check removed | green alone (the real-path check at the end also refuses an existing target); both containment checks removed: **red** (2 fail: the refusal test and the engine test) |
| M2 | `plan-entry-cases-not-an-array` | file-case guard removed | green alone (a second guard refuses a non-array); both guards removed: **red** (1 fail) |
| M3 | `plan-entry-cases-file-missing` | missing file reported as `unreadable` | **red** (1 fail) |
| M4 | `plan-entry-cases-file-not-json` | the `JSON.parse` replaced by an empty array | **red** (3 fail) |
| M5 | `plan-entry-cases-file-hash-mismatch` | hash comparison removed | **red** (1 fail) |
| M6 | `plan-entry-cases-and-cases-file` | the `cases` + `cases_file` check removed | **red** (1 fail) |
| M7 | `plan-entry-html-entity` (argv) | `htmlEntityIn` made to find nothing | **red** (2 fail) |
| E1 | extract `no-block` | refusal removed (falls to `empty-block`) | **red** (2 fail) |
| E2 | extract `empty-block` | refusal removed | **red** (1 fail) |
| E3 | extract `transcript-ambiguous` | refusal removed (first hit taken) | **red** (1 fail) |
| E4 | extract `transcript-not-found` | refusal removed | **red** (1 fail) |
| E5 | extract `transcript-unreadable` | refusal removed | **red** (1 fail) |

Together with the six proofs above (symlink, cases entity, extract entity-escaped, merge `result-hash-mismatch`, reuse engine-changed, `casesFileAccepted`), every refusal this task added now has a recorded revert-and-red proof.
