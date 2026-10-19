---
id: task.215
title: "[Task 215] security-probe: run a Python CLI under the cli: entry form"
type: task
description: "Let shared/resources/security-probe.mjs probe a Python script through the existing cli: form (by file extension), so a Python boundary reaches the DoD probe instead of failing the zero-candidates guard."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-19
updated: 2026-10-19
estimated_effort_hours: 6
github_issue: 689
---

# Technical Task: security-probe — a Python CLI under `cli:`

**Status:** In Progress

**Review**: ✅ All review recommendations from `task.215.review.1.probe-engine-python-cli-entry-form.md` implemented 2026-10-19

**GitHub Issue**: [#689](https://github.com/Gamaroff/agent-skills/issues/689)

---

## 1. Overview

The probe engine runs a Node CLI (`cli:<path>.mjs|.js`), a shell script (`shell:`, `shell-fn:`, `shell-argv:`), a fenced
block (`fence:`) or a JS export (`path#export`). It has no way to run a **Python** script. A repository whose
boundaries are Python (omarchy-leak-radar: `scripts/threatradar.py`, `scripts/leakguard.py`) therefore gets
`entry-not-probeable`, `probes_executed: 0`, and the zero-candidates guard fails at `/finalise`. The only ways out today
are a recorded human override or this task.

## 2. Motivation

- omarchy-leak-radar story 3.1.1 (`threat-radar merge-back`) is halted at `/finalise` Step 7 on exactly this
  (`dod.1.security.run.json`: `cli:scripts/threatradar.py`, verdict `unverifiable`, reason `entry-not-probeable`,
  `executed: 0`; PR #63).
- PRD 3 adds more Python boundaries to the same repo: the leak guard's protected-file shield, the indirect prompt
  injection scanner and the file-mutation circuit breaker. Each will hit the same wall, and they are boundaries in the
  strict sense (`leakguard.py` must refuse a write).

## 3. Technical Background

- `CLI_EXTENSIONS = [".mjs", ".js"]` (`shared/resources/security-probe.mjs:705`) and the check at `:1252-1261` decline any
  other extension; the `cli:` child is always `process.execPath` (`runCliCase`, `:2286-2288`).
- `runCliCase` tells a crash from a refusal only by `NODE_FATAL_FOOTER` (`:2199`), the `Node.js vX.Y.Z` line Node prints
  on an uncaught error. Python prints no such footer, and a Python crash exits **1**, the same status as a refusal.
  Measured: an uncaught exception exits 1 after a `Traceback (most recent call last):` block; a `SyntaxError` exits 1
  after a `File "…", line N` block with **no** Traceback header; `sys.exit(1)` exits 1 with empty stderr.
- The child's environment is `caseEnv()`: `sandboxEnv()` (`qa-execute-snippets.mjs:2038`) carries only `PATH`, `HOME`,
  `LANG`, `TERM`, `TMPDIR` and `PWD`, and `caseEnv` points `HOME` and `TMPDIR` at directories inside the sandbox root. No
  `PYTHON*` or `XDG_*` variable is passed at all. A write to `$HOME` lands in the sandbox root and is recorded as an escape.
- `watchedSpawn` records any change to the script's own directory as an escape (`:1950-1954`). Python writes
  `__pycache__/` there when a script imports a sibling module, unless it runs with `-B`.
- `python3` is the consumer's interpreter, resolved from `PATH` when a `.py` entry is probed. It is not a dependency of
  this repository. The CI test lane (`test.yml`, `ubuntu-latest`) ships `python3`.
- The `cli:` form's contract is already general: the case's input is one element of an `--argv` template, the exit
  status is the verdict, a crash is `errored`, and each guarded flag is its own control (`--name`).
- Precedent: tasks 144 (`cli:`), 180 (`fence:`) and 181 (`shell-argv:`) each added one entry form with its own
  decline reasons, tests, docs and bundled copies.

## 4. Scope

**In.** Make `cli:` accept a `.py` entry and run it under `python3`, with the same argv template, slots, verdict rules,
containment, timeout and environment hygiene as the Node arm. Record the interpreter in the run record (as `shells` is
recorded for the shell forms). Decline by name, once, when `python3` is not on `PATH`.

**Design choice (confirmed in review 1).** Extend `cli:` by extension rather than add a `py-cli:` prefix: the `cli:`
contract does not depend on the runtime, and a second prefix would duplicate every decline reason and doc paragraph.

**Out.** Importing a Python function (a `py:path#function` form); a Python test runner; any other language; the release
and consumer proof (see Deferred Work).

## 5. Breaking Changes

None. `.py` entries were declined before; every existing form and decline reason is unchanged.

## 6. Implementation Plan

1. `security-probe.mjs`: replace `CLI_EXTENSIONS` with an extension → interpreter map (`.mjs` / `.js` → `process.execPath`,
   `.py` → `python3`). Resolve `python3` once per run, by `python3 --version` on the engine's `PATH`; when it does not
   run, decline `entry-not-probeable` once, with a detail naming `python3`. Spawn
   `python3 -E -s -B <entry> …argv` through the same `watchedSpawn` / `caseEnv` path as the Node arm:
   - `-E` ignores any `PYTHON*` variable (a second line of defence: `caseEnv` passes none);
   - `-s` drops user site-packages;
   - `-B` writes no bytecode. Without it, a script that imports a sibling writes `__pycache__/` into its own directory,
     which `watchedSpawn` records as an escape on every case;
   - **not `-I`**: it drops the script's directory from `sys.path`. Measured: a sibling import exits 0 under `-E -s -B`
     and fails `ModuleNotFoundError` under `-I -B`.

   **Crash branch for a `.py` entry.** A non-zero exit whose stderr's last non-empty line is a Python exception line
   (`^[A-Za-z_][\w.]*(Error|Exception|Interrupt|Exit)\b`) **and** stderr holds at least one `  File "…", line N` frame is
   `errored`, never `rejected`. This covers the uncaught-exception shape and the `SyntaxError` shape (which has no
   Traceback header). The Node arm keeps `NODE_FATAL_FOOTER` unchanged.
2. Sandbox: no change to containment is expected. `caseEnv` already gives the child a sandbox `HOME` and `TMPDIR` and
   passes no `XDG_*` or `PYTHON*` variable. Hold it with a test: a fixture CLI that writes under `$HOME` leaves the real
   home untouched and appears in the result's `escapes`.
3. Result and run record: a top-level `interpreter` field, `{ name: "python3", version: "<python3 --version output>" }` for
   a `.py` entry and `null` for every other form, beside `shells` (`:1758`).
4. Docs. Every site that routes "a Node CLI" to `cli:` gains "or a Python CLI (`.py`, run under `python3`)". The site list
   is the output of `git grep -n "Node CLI" -- 'shared/resources/*.md' 'skills/*/SKILL.md'`, re-run before editing:
   `probe-boundary-rule.md` (§5 at 347, and 533, 547), `finalise-dod-security-prompt.md` (48, 277),
   `security-review-prompt.md` (101, 111, 172, 268), `skills/qa-task/SKILL.md:679`, `skills/qa-story/SKILL.md:1169` and
   `skills/review-security/SKILL.md:156`. Also the engine's header comment (`security-probe.mjs:151`, `:166`, `:692`,
   `:704`) and the `runCliCase` doc comment. Inside `shared/resources/`, cite a sibling by bare filename.
5. Bundle (`npm run bundle`) into finalise, qa-story, qa-task and review-security; CHANGELOG `[Unreleased]`.

## 7. Files Summary

`shared/resources/security-probe.mjs`; its bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`;
`shared/resources/probe-boundary-rule.md`, `shared/resources/finalise-dod-security-prompt.md` and
`shared/resources/security-review-prompt.md` (and their bundled copies); `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`,
`skills/review-security/SKILL.md`; engine tests in `shared/resources/tests/security-probe.test.mjs` (already reached by the
`npm test` glob `'shared/resources/tests/*.test.mjs'`); `CHANGELOG.md`.

**Added** (test fixtures, `shared/resources/tests/fixtures/security-probe/`): `cli-refuser.py`, `cli-exit-one.py`,
`cli-refuser-error-text.py`, `cli-crasher.py`, `cli-syntax-error.py`, `cli-imports-sibling.py`, `cli_sibling_helper.py`,
`cli-writes-home.py`, `cli-flags.py`.

## 8. Testing Strategy

All in `shared/resources/tests/security-probe.test.mjs`, test-first. A fixture Python CLI (`argv[1]` path: exits 0 for a
safe path, 1 for a refused one), written to a temp directory by the test. Cases:

- it runs under `python3` and the verdict comes from the exit status (`executed > 0`);
- **crash shapes are `errored`**: an uncaught exception, and a `SyntaxError` script. **Control case:** a plain
  `sys.exit(1)` refusal with empty stderr stays `rejected`, and a refusal that prints a one-line message to stderr stays
  `rejected`;
- a fixture that imports a sibling module runs, and records no escape (holds `-B` and not-`-I`);
- a missing interpreter is declined once, by name: run the engine CLI as a child (`process.execPath`, absolute) with `PATH`
  set to an empty temp directory, and assert one `entry-not-probeable` naming `python3`;
- a `.py` entry with `--argv` missing is `bad-argv`;
- a fixture that writes under `$HOME` leaves the real home untouched and is listed in `escapes`;
- the result and the run record carry `interpreter` for `.py`, and `null` for a `.mjs` entry;
- mutation: revert the extension map and the `.py` test goes red; drop the crash branch and the crash tests go red.

Keep the existing `.mjs` / `.js` tests unchanged and green.

## 9. Success Criteria

1. `security-probe.mjs --entry cli:<fixture>.py --argv '[...,"{input}"]' --sink path` returns `executed > 0` with the expected
   verdicts. Test: the fixture suite above, per PR.
2. A `.py` entry no longer returns `entry-not-probeable` for the extension; every other decline reason is unchanged.
3. The result and run record carry `interpreter` (`python3` and its version) for a `.py` entry, `null` otherwise. Test:
   record assertion.
4. A Python crash (uncaught exception or `SyntaxError`) is `errored`, never `rejected`, while a plain `sys.exit(1)` refusal
   stays `rejected`. Test: the crash-shape cases and their control.

## 10. Risk Assessment

Low blast radius: the change is additive and isolated behind an extension that was previously declined. Two risks:

- **A crash read as a refusal** (the silent one). A Python crash exits 1, like a refusal, so without the crash branch a
  script that crashes on every input reads as a control that refuses every hostile input. Oracle: the crash-shape tests
  with a plain refusal as the control case (Success Criterion 4).
- **The sandbox**: a Python child that writes to `$HOME`. `caseEnv` already redirects it; held by the `$HOME` test.

## 11. Rollback Plan

Revert the engine change and re-bundle; `.py` entries return to `entry-not-probeable`.

## Deferred Work

Both items need a merged, tagged release, and `/finalise` runs before merge, so neither is a success criterion here.

- **Release and re-vendor.** Release a tag and re-vendor into consumers (`setup-consumer.sh --update`).
- **Consumer proof** (omarchy-leak-radar, after re-vendoring): the `probe_command` from its `dod.1.security.run.json`
  (`--entry 'cli:scripts/threatradar.py' --argv '["merge-back","--schema","3","{input}"]'`) executes candidates. Open
  point: the `path` sink's cases must fit a `merge-back` target (a case may need `--cases-file`, and the `cli:` form has no
  `--fixture-setup`). Settle it against the consumer; if the form needs a missing piece, that is a follow-up task.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-19
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [task.215.qa.7.probe-engine-python-cli-entry-form.md](./task.215.qa.7.probe-engine-python-cli-entry-form.md)
- **Gate File**: [task.215.gate.7.probe-engine-python-cli-entry-form.yml](./task.215.gate.7.probe-engine-python-cli-entry-form.yml)

### Test Coverage Summary

- **Tests Executed**: 23
- **Phases Verified**: 2/2
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

- Cycle 6 fixes verified (TASK-215-QA6-1 to QA6-3; bug 10 closed). Probe: 8 executed, 0 reproduced; a `.py` exit 120 is `errored`, no crash shape scored `rejected`.
- TASK-215-QA7-1 to QA7-3 (LOW): the thread-crash test's direct spawn depends on the cwd; the exit-120 detail carries no stderr; the CHANGELOG wording is narrower than the rule doc.

### Bug Reports

- [TASK-215-BUG-1: Python crash read as refusal](./task.215.bug.1.python-crash-read-as-refusal.md) — ✅ Closed — Priority: High (verified QA cycle 2)
- [TASK-215-BUG-2: crash outside the default excepthook](./task.215.bug.2.crash-outside-default-excepthook.md) — ✅ Closed — Priority: High (verified QA cycle 3)
- [TASK-215-BUG-3: limit note understates the class](./task.215.bug.3.limit-note-understates-class.md) — ✅ Closed — Priority: Medium (verified QA cycle 3)
- [TASK-215-BUG-4: unprintable exception loses the crash marker](./task.215.bug.4.unprintable-exception-loses-marker.md) — ✅ Closed — Priority: High (verified QA cycle 4)
- [TASK-215-BUG-5: forked child writes the crash marker](./task.215.bug.5.forked-child-writes-marker.md) — ✅ Closed — Priority: Medium (verified QA cycle 4)
- [TASK-215-BUG-6: forked daemon holds the crash fd](./task.215.bug.6.forked-daemon-holds-crash-fd.md) — ✅ Closed — Priority: Medium (verified QA cycle 4)
- [TASK-215-BUG-7: a closed fd 3 loses the crash marker](./task.215.bug.7.closed-fd3-loses-crash-marker.md) — ✅ Closed — Priority: High (verified QA cycle 5)
- [TASK-215-BUG-8: the interpreter probe runs under a different environment](./task.215.bug.8.interpreter-probe-env-differs.md) — ✅ Closed — Priority: Medium (verified QA cycle 5)
- [TASK-215-BUG-9: a crash outside the main frame is scored as the answer](./task.215.bug.9.crash-outside-main-frame-scored-answer.md) — ✅ Closed — Priority: Medium (verified QA cycle 6)
- [TASK-215-BUG-10: a crash at shutdown flush is scored as a refusal](./task.215.bug.10.shutdown-flush-crash-scored-refusal.md) — ✅ Closed — Priority: Medium (verified QA cycle 7)

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-19 | 1.0     | Initial draft, written from omarchy-leak-radar (story 3.1.1 halted at /finalise on this gap) | create-task |
| 2026-10-19 | 1.1     | Review passed (9/10) — added the Python crash branch, decided `-E -s -B`, recorded the doc-site search, moved tests to `shared/resources/tests/`, moved release and consumer proof to Deferred Work | review-task |
| 2026-10-19 |         | Status → ready-for-development | review-task |
| 2026-10-19 |  | Implemented — 20 files (5 sources, 3 SKILL.md, 9 fixtures, CHANGELOG, tests; plus bundled copies), 11 tests | develop |
| 2026-10-19 |  | QA gate FAIL (70/100) — 2 findings; Status → In Progress | qa-task |
| 2026-10-19 |  | QA findings fixed — cycle 1, 2 findings (TASK-215-QA1-1, CR-2); Status → Ready for Review | qa-fix |
| 2026-10-19 |  | QA gate FAIL (60/100) — 2 findings; Status → In Progress | qa-task |
| 2026-10-19 |  | QA findings fixed — cycle 2, 2 findings (TASK-215-QA2-1, QA2-2); Status → Ready for Review | qa-fix |
| 2026-10-19 |  | QA gate FAIL (50/100) — 4 findings; Status → In Progress | qa-task |
| 2026-10-19 |  | QA findings fixed — cycle 3, 4 findings (TASK-215-QA3-1 to QA3-4); Status → Ready for Review | qa-fix |
| 2026-10-19 |  | QA gate FAIL (50/100) — 2 findings; Status → In Progress | qa-task |
| 2026-10-19 |  | QA findings fixed — cycle 4, 3 findings (TASK-215-QA4-1, QA4-2, CR-3); Status → Ready for Review | qa-fix |
| 2026-10-19 |  | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-10-19 |  | QA findings fixed — cycle 5, 1 finding (TASK-215-QA5-1); Status → Ready for Review | qa-fix |
| 2026-10-19 |  | QA gate CONCERNS (85) — 3 findings | qa-task |
| 2026-10-19 |  | QA findings fixed — cycle 6, 3 findings (TASK-215-QA6-1 to QA6-3); Status → Ready for Review | qa-fix |
| 2026-10-19 |  | QA gate PASS (95) — 3 findings | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Implementation Plan steps 1-3: extension map, sandbox, run record (tests first) — 11 tests, 9 fixtures; 9 mutations each red
- [x] Implementation Plan steps 4-5: docs, bundle, CHANGELOG — every site of the recorded `Node CLI` search updated; `npm run bundle` clean

---

## References

- omarchy-leak-radar story 3.1.1 (`threat-radar merge-back`), PR #63 in that repository: halted at `/finalise` Step 7 on `entry-not-probeable`.
- [task.144](../task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md), the `cli:` form this extends.
- [task.180](../task.180.probe-engine-fence-entry-form/task.180.probe-engine-fence-entry-form.md) and [task.181](../task.181.probe-engine-shell-argv-entry-form/task.181.probe-engine-shell-argv-entry-form.md), the other entry forms added the same way.

---

## Notes

### Implementation Summary (2026-10-19)

- `security-probe.mjs`: `CLI_EXTENSIONS` became `CLI_INTERPRETERS` (`.mjs` / `.js` → node, `.py` → python3);
  `probePython()` resolves `python3 --version` once per process; a `.py` entry spawns
  `python3 -E -s -B <entry> ...argv` (`PYTHON_FLAGS`) through the unchanged `watchedSpawn` / `caseEnv` path.
- Crash branch: exported `isPythonCrash(stderr)`. **Deviation from the plan's regex, recorded:** the plan named
  `(Error|Exception|Interrupt|Exit)` class suffixes; the engine accepts any (dotted) class name as the last line,
  because a custom `class Refused(Exception)` raised uncaught prints `__main__.Refused: …`, and missing it would score a
  crash as a refusal. To keep refusals refusals it requires all three: a `File "…", line N` frame, a final
  exception line, and a `Traceback (most recent call last):` header or a `SyntaxError`-family class.
  *Superseded by QA fix cycle 1 below: the final-exception-line clause is gone.*
- `interpreter` (`{ name, version }`, else `null`) is on every result path (`base`, the all-errored and needs-fake-gh
  returns, the success return), in `toRecordEntry`, and printed as `interpreter:` in `--emit-block` when set.
- Testing: 11 new tests in `security-probe.test.mjs` (`cli entry (python): …`); `npm run ci:fast` green (5917 tests,
  0 failures). Mutations, each turning its test red: drop `.py` from the map; drop the crash branch; drop `-B`; use
  `-I`; drop `interpreter` from the result; from the record entry; drop the traceback-header clause; drop the frame
  clause; drop the missing-python3 decline.
- Deferred work: see Deferred Work (release, re-vendor, consumer proof).

### QA Fix — cycle 1 (2026-10-19)

- TASK-215-QA1-1: `isPythonCrash` no longer reads the last stderr line. A crash is a `File "…", line N` frame under a
  `Traceback` header (an ExceptionGroup's `+ Exception Group Traceback` and `|`-prefixed frames included), or a frame
  and a SyntaxError-family line, whatever follows. `runCliCase` asks only on exit 1, the status every uncaught
  exception exits with, so an "Exception ignored" traceback beside a refusal exiting 3 stays an answer. The decline
  detail names the exception via `pythonExceptionLine` (first exception-shaped line after the last frame).
- The unit case "a traceback followed by a refusal line is false" is reversed to `true`: the probe cannot tell a
  caught-and-printed traceback from an uncaught one, and `errored` is the safe direction.
- Stated limit, not fixed: `sys.tracebacklimit = 0` prints no frame, so that crash is indistinguishable from a
  refusal printing the same line; recorded in `probe-boundary-rule.md`.
- TASK-215-CR-2: the flags test asserts `interpreter.name === "python3"` and the executed count before its loop.
- Tests: 2 fixtures (`cli-crasher-multiline.py`, `cli-refuser-unraisable.py`), 1 new test, 3 extended; 12 python tests.
  Mutations, each red: restore the last-line rule; drop the exit-1 gate; frame or header regex without the
  ExceptionGroup form; frame matched at column 0; drop the compile-error clause; drop the header clause; detail from
  the last line; drop `.py` from the map (now also reds the flags test — the CR-2 floor). `npm run ci:fast` green
  (5918 tests, 0 failures). QA's probe cases re-run: 12 executed, every case as expected.

### QA Fix — cycle 2 (2026-10-19)

- TASK-215-QA2-1: the crash is no longer read only off stderr. A `.py` entry runs through
  `PYTHON_BOOTSTRAP` (`python3 -E -s -B -c …`), which runs the script as `python3 <entry>` would and
  catches an uncaught exception before any excepthook runs, naming it on fd 3. A replaced
  `sys.excepthook` (rich, Typer), `sys.stderr` redirected or `None`, and `sys.tracebacklimit = 0`
  are now `errored`. The stderr traceback reader stays as a second signal on exit 1.
- Narrowing residue: crash detection in `security-probe.mjs` (repeat subject — cycle 1 fixed the
  same mechanism). Move: consolidate — the deny-list of stderr shapes became one channel the
  script does not write, rather than more shapes.
- TASK-215-QA2-2: the limitation note is gone; the crash bullet is rewritten around the bootstrap.
- CR-3 (advisory): not taken — `recommendations.future`.
- Tests: 4 fixtures, 2 new tests, 1 extended; 14 python tests. 7 mutations each red (listed in the
  bug report). `npm run ci:fast` 5920 tests, 0 failures.

### QA Fix — cycle 3 (2026-10-19)

Run after the QA loop's not-converging escalation, on a granted re-entry (2 extra cycles).

- Struck mechanism (third strike on `security-probe.mjs`, cycles 1–3): crash detection that depends
  on rendering the exception as text. Move: **replace** — the bootstrap's first act on an uncaught
  exception is to write a constant token on fd 3; the `Class: message` line follows best-effort as
  the detail only, and the engine reads the fd's presence, never its text. TASK-215-QA3-1: an
  exception whose `str()` or class name raises is now `errored` (TASK-215-BUG-4).
- Other findings in the file, fixed as usual: QA3-2/QA3-3 — the marker is written only by the
  process that started the bootstrap, and `os.register_at_fork` closes fd 3 in forked children, so
  a child's crash cannot override the answer and a daemon cannot hold the case to the timeout
  (BUG-5, BUG-6). QA3-4 — the body runs in a fresh `__main__` module through `exec`, not
  `runpy.run_path`, so `__main__` stays the script's after it returns; dropping `runpy` also closes
  CR-5 (a `runpy.py` in the cwd can no longer shadow the bootstrap's import).
- Tests: 5 fixtures, 4 new tests; 18 python tests. 6 mutations each red: no token; the `str()`
  failure not caught; the reader taking the token line as the detail; no pid check; no
  `register_at_fork`; `runpy` restoring `__main__`.

### QA Fix — cycle 4 (2026-10-19)

Run after the second not-converging escalation, on a second granted re-entry (2 extra cycles); the
maintainer chose the positive channel over scoping SC4.

- Struck mechanism (third strike on `security-probe.mjs`, cycles 2–4): crash detection through a
  **negative** signal — a token written only on a crash, its absence read as an answer, so every
  way to lose the write was a false `rejected`. Move: **replace** — the bootstrap writes an exit
  record on every exit it controls (`answer <nonce>` on return or `SystemExit`, `crash <nonce>`
  on anything else), only while fd 3 is still the pipe it started with; a case with no record is
  `errored`. TASK-215-QA4-1: a script that closes fd 3 (or opens its own file there) is now
  declined, and nothing is written into its file (BUG-7).
- Other findings in the file, fixed as usual: QA4-2 — an interpreter that answers `--version` but
  cannot start a case writes no record, so every case is `errored` and the entry is declined once
  (BUG-8); `probePython` itself is unchanged and its comment says why. CR-3 — the record is read
  once per case.
- Stated limit, fail-safe: a script that leaves by `os._exit` or `exec` also leaves no record and
  is declined (`probe-boundary-rule.md`).
- Tests: 2 fixtures, 2 new tests; 20 python tests. Both new tests red on the cycle-3 engine. 8
  mutations each red: no fd-identity check; nonce ignored (crash, answer); missing record read as
  an answer; no record on `SystemExit`; no record on return; no `register_at_fork`; no crash record.

### QA Fix — cycle 5 (2026-10-19)

- TASK-215-QA5-1 (BUG-9): an exception outside the body's frame (a joined worker thread, an atexit
  handler) exits 0 under `python3` and is scored `accepted`. Stated as a limit in
  `probe-boundary-rule.md`, the engine's bootstrap comment and CHANGELOG, and pinned by a test
  (`cli-thread-crash.py`). Not fixed by wrapping `threading.excepthook`: that would score a worker
  that logs and recovers as `errored`, which `python3 <entry>` does not do.
- Gate 5 advisory (crash-record precedence untested): new test with `cli-forged-answer-crash.py`,
  a script that writes `answer <nonce>` itself and then crashes — every hostile case `errored`.
- Tests: 2 fixtures, 2 new tests; 22 python tests. Mutations each red: answer record outranks the
  crash record (the forged-answer test); a traceback read on any exit status (the thread test and 3
  others).

### QA Fix — cycle 6 (2026-10-19)

- TASK-215-QA6-1 (BUG-10): a `.py` exit 120 (CPython's failed flush at shutdown, after the answer
  record) is now `errored`, not the script's refusal (`PYTHON_FINALIZE_STATUS`). New fixture
  `cli-shutdown-flush-crash.py` and test; drop the branch and that test is red.
- TASK-215-QA6-2: the worker-thread sentence in `probe-boundary-rule.md` now says an exit 1 after
  the thread's traceback is read as a crash (`errored`), and names exit 120.
- TASK-215-QA6-3: the thread-crash test looks up every hostile case in `cases` and `declined`, and
  spawns the fixture to show the thread raised; a fixture that never raises turns it red.
- Tests: 1 fixture, 1 new test, 1 tightened; 23 python tests. Two mutations, both red.

- QA artifacts land beside this file: `task.215.qa.{N}.*.md`, `task.215.bug.{N}.*.md`, `task.215.gate.{N}.*.yml`.
