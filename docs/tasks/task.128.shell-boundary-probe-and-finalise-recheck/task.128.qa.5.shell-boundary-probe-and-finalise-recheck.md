# QA Report: Task 128 - A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt (cycle 5)

**Task**: [Link to task document](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Gate File**: [task.128.gate.5.shell-boundary-probe-and-finalise-recheck.yml](./task.128.gate.5.shell-boundary-probe-and-finalise-recheck.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-09-20 · **Gate Status**: CONCERNS

## Executive Summary

Cycle 4's four fixes hold — each verified by execution on `76b7151f`. The scoped review (the two engine files changed since gate 4, 193 diff lines) found no HIGH and no MEDIUM for the first time in the loop; the last open MEDIUM (BUG-13) is closed. Two LOW advisories are carried to `future` rather than opened: a case-variant of an engine-created fixture name slips the string collision check on case-folding filesystems (real, reproduced, but reachable only by an authored case naming a case-variant of an engine-internal filename that no corpus case does, and the failure is a false `absent` — loud, not silent — bounded to one wasted QA cycle), and the CR-3 test fixture orphans a `sleep` for 30 s. The first is exactly the shape the finalise fix-and-recheck path this task delivers was built for. The gate has no open entry and hands to 5c.

**Overall Assessment**: CONCERNS (no open entry) · **Deployment Recommendation**: READY

## Re-Review Context

**Re-review scope: since 2026-09-20T19:49Z — gate 4; SAFETY_REPROBE=true by clause 3 (the task's own Success Criteria are the security control), so the engine-recorded probe was re-run.** 2 source files, 193 diff lines.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| BUG-13 `absent: [".."]` scores a vacuous defect | **FIXED** | `expectedProblem({exit:0, absent:["."]})` and `[".."]` → the separator/`.`/`..` message; a cases-file with `.."`, a control name and the case's own input → all six (case, shell) runs `case-errored … which the fixture itself creates`, `executed 2` (the legitimate case only), verdict `unverifiable`, never `absent` |
| CR-2 case-sensitive launch-failure message | **FIXED** | `isLaunchFailure` → `true` for both `is a directory` and `Is a directory`; `false` for `<path>: line 3: foo: command not found`; reviewer confirmed real `/bin/bash` 3.2.57 and bash 5.3 strings, and that `"$0"` / `exec "$0"` runtime failures (`line N:` segment) still do not match |
| CR-3 all-errored decline drops escapes/shells | **FIXED** | two cases + 200 ms timeout → decline carries `shells: ["bash","zsh"]`, 4 escapes, `toRecordEntry` → `escaped 4`; named test green |
| CR-4 BUG-12 test leaves `PWNED-tmp` behind | **FIXED** | try/finally; `existsSync($HOME/PWNED-home)` and `existsSync(tmpdir()/PWNED-tmp)` both false after the run; `ls $TMPDIR | grep -c PWNED` → 0 |
| CR-5 (cycle 4) id-suffix helper | carried | advisory, unchanged |

## New Findings This Cycle

- **[low, future]** `security-probe.mjs:879` — CR-1: the collision check compares strings (`fixture.controls.includes(p) || p === c.input`); on case-insensitive APFS `absent: ["!.GATE.3.CONTROL.YML"]` passes `expectedProblem` and the check, the control exists, and the fixed `qa-cycle.sh` scores `absent`. Reproduced: `--cases-file` with that name → `executed 2`, `declined 0`. Adopted as a hardening recommendation with the reviewer's fix (an `existsSync` on each absent name after the fixture is written, before `spawnSync`), not opened: the input is an authored case naming a case-variant of an engine-internal filename, the corpus contains none, and the failure direction is a false alarm on an engaging control rather than a missed defect. Eligible for finalise Step 8a fix-and-recheck.
- **[low, future]** `security-probe.test.mjs:799` — CR-2: the CR-3 fixture body `sleep 30` survives spawnSync's SIGTERM as an orphan (one per shell) for 30 s; `exec sleep 30` would make the sleeper the killed pid. Test hygiene.

## Review Methodology

Lite mode — direct tools only (`Adaptive strategy override: lite mode — direct tools only`). Step 3b: one read-only Explore reviewer over the scoped patch with a refute directive on each cycle-4 fix (24 tool uses; every claimed fix executed against real bash 3.2 and 5.3). SAFETY RE-PROBE: engine-recorded run on `76b7151f` (`task.128.qa.5.security.run.json`, 39 executed). Suite: isolated-worktree `ci:fast` on this exact tree 3579/3580 (the one failure is `observation-log.test.mjs` refusing a `/private/tmp` worktree by design; re-run in the main tree 53/53); `bundle:check` 0 problems; the four bundled `references/security-probe.mjs` copies differ from the source only by the AUTO-GENERATED header.

## NFR Assessment

**Performance** PASS · **Reliability** PASS (CR-3 verified) · **Security** PASS, measured 39 (symlink-escape pre-existing, unchanged) · **Maintainability** PASS (CR-2 of this cycle advisory).

## Code Review

Reviewer verdict: 2 findings (0 high, 1 medium, 1 low); the medium was re-rated low by QA on reachability and failure direction (see New Findings) and carried to `future`. `holds:` BUG-13, CR-2, CR-3, CR-4, bundled copies, 67/67 across the two engine suites.

## Final Assessment

**Gate**: CONCERNS, quality 95/100, `top_issues: []`. HIGH 2 → 1 → 0 → 0 → 0; MEDIUM 2 → 3 → 4 → 1 → 0. Thirteen bugs opened across five cycles, thirteen closed by execution. No open entry — the run proceeds to Step 5c (PR conformance review).
