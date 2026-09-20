# Bug Report: Task 128 - a side effect the target writes to `$HOME`, `$TMPDIR` or its own directory is invisible to `absent` and the sentinel

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md) · **Bug ID**: TASK-128-BUG-12 · **Severity**: MEDIUM · **Priority**: P2 · **Status**: ✅ Ready for QA · **Found By**: QA (cycle-3 review CR-2; BUG-5's class beyond the no-`cd` shape) · **Date Found**: 2026-09-20

## Description
The shell child inherits the real `HOME` and `TMPDIR` (`sandboxEnv` copies them) and runs a script that lives in the real repo tree; the sentinel watches `sandboxRoot` only. A substitution side effect written to `$HOME`, `$TMPDIR`, or the script's own directory (`cd "$(dirname "$0")"` is a common idiom) lands where nothing looks, and the case scores `rejected`. Also (CR-6) `sandboxEnv({ cwd: workDir })` sets `PWD=workDir` while cwd is now `fixtureDir`.

## Recommendation
Give the child fresh `HOME` and `TMPDIR` under `sandboxRoot` (outside `workDir`, so the sentinel sees writes there), snapshot the script's own directory before/after each run and record a change as an escape, and pass `sandboxEnv({ cwd: fixtureDir })`.

## Developer Fix Cycle — Iteration 1
**Fix**: `runProbeSpec` creates `home/` and `tmp/` under `sandboxRoot` (outside `work/`) and the shell child gets `HOME`/`TMPDIR` pointing at them, so a write there is an escape the sentinel reports; the script's own directory is snapshotted non-recursively (`listDirStamps`) before and after each run and any change is recorded as an escape naming the path and shell; `sandboxEnv({ cwd: fixtureDir })` so `PWD` agrees with cwd (CR-6). Fixture `writes-home-tmp-self.sh` proves all three are reported and that the reader's real `$HOME` was not written.
**Mutation proof**: real HOME/TMPDIR + no script-dir snapshot → test red.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | Ready for QA | qa-fix | sandboxed HOME/TMPDIR, script-dir snapshot, PWD |
