# Bug Report: Task 128 - a missing or unrunnable `shell:` script is scored `absent` (executed = cases × shells) instead of declined

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (from diff code review CR-1, verified by execution)
**Date Found**: 2026-09-20

## Description
`runShellCase` never checks that `entryPath` exists or that bash could open it. A `shell:` path that resolves inside the repo root but is missing (or unreadable) makes every run exit 127 with stderr; every case then mismatches `expected`, hostile cases are scored `accepted` and legitimate ones `rejected`, and the verdict is **`absent` with `executed: 28`** — "could not look" and "the control is absent" resolve to one gating output, and the count says 28 probes ran. The JS form declines the same condition as `entry-not-probeable` (executed 0).

## Steps to Reproduce
```bash
node shared/resources/security-probe.mjs --sink filename --entry shell:shared/resources/does-not-exist.sh --json \
  | jq '{verdict, reason, executed}'     # absent / no-hostile-case-was-rejected / 28
```

## Expected Behavior
`unverifiable` / `entry-not-probeable`, executed 0, one declined entry naming the path — as the JS form reports for an unimportable entry.

## Actual Behavior
`absent`, executed 28, no declined entries.

## Impact
A typo in an entry path reads as a high-severity control failure with a full probe count behind it; the record then carries `probes_executed: 28` for probes that opened nothing.

## Recommendation
Before the per-shell loop, decline (outcome `errored`) when `entryPath` is not a readable regular file; additionally treat child exit 126/127 as `errored` rather than a compared run, so the all-errored path collapses to `entry-not-probeable`. Test with a missing path and a directory path.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)
**Date**: 2026-09-20 · **Root cause**: `runShellCase` compared every run against `expected` without first establishing the script could be run; a 127 launch mismatched everything and `computeVerdict` read the mismatches as a control that accepts every hostile name.

#### Fix Implementation (In Progress → Ready for QA)
**Fix**: before the per-shell loop, `statSync(entryPath).isFile()` + `accessSync(R_OK)`, else decline every shell (`outcome: errored`, detail `script is not a readable regular file: …`); inside the loop, a child exit of 126/127 is `errored` (`bash could not run the script (exit N)`) rather than compared. Both collapse through the existing all-errored path to `entry-not-probeable`, executed 0 — the JS form's answer for an unimportable entry.
**Files**: `shared/resources/security-probe.mjs`; tests `shell entry: a missing or non-file script is DECLINED, never scored absent (BUG-2)` and `shell entry: a 126/127 exit is errored, not compared (BUG-2)` in `security-probe.test.mjs`.
**Mutation proof**: stat check removed → first test red; 126/127 branch disabled → second test red.
**Verify**: `--entry shell:shared/resources/does-not-exist.sh` → `unverifiable / entry-not-probeable / executed 0`; a directory path → same.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | In Progress | qa-fix | Investigation |
| 2026-09-20 | Ready for QA | qa-fix | readable-regular-file check + 126/127 errored |
