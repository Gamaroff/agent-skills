---
id: task.216
title: "[Task 216] security-probe: the cli: form honours a case's fixture.files (and env)"
type: task
description: "Let a cli: probe case carry fixture.files and fixture.env, written into the case directory before the run exactly as the fence: and shell-argv: arms write them, so a CLI that reads a populated directory (a data dir, a repository) can have a legitimate case that is accepted."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-19
updated: 2026-10-22
estimated_effort_hours: 4
github_issue: 696
---

# Technical Task: security-probe — `cli:` cases carry `fixture.files`

**Status**: Ready for Review
**Review**: ✅ All review recommendations from `task.216.review.1.probe-engine-cli-case-fixture-files.md` implemented 2026-10-22
**GitHub Issue**: [#696](https://github.com/Gamaroff/agent-skills/issues/696)

## 1. Overview

`cli:` runs a Node or Python script with an `--argv` template and scores the exit status. A case may not carry `fixture` (`files`, `env`): the `cli:` arm builds its case directory from the sink's controls only (`materialiseFixture(workDir, fixture?.controls ?? [], input, …)` in `runCliCase`), and writes nothing else. `fence:` and `shell-argv:` write a case's `fixture.files` and `fixture.env` through `writeFixtureFiles` before the run. So a CLI that refuses on what it finds in a directory — a data dir, a repository — cannot have a legitimate case that is accepted, and a probe of it can never leave `rejects-every-input`.

## 2. Motivation

Found by omarchy-leak-radar, the first consumer of task 215 (the Python `cli:` form, released in v0.58.0).

- Story 3.1.1 there added `threat-radar merge-back DIR`, which refuses a `DIR` with no `items.json`. Re-probed on v0.58.0 (`--entry cli:scripts/threatradar.py --argv '["merge-back","--schema","3","{input}"]'`) it executes: 10 cases, no escapes. The verdict is still `unverifiable`, reason `rejects-every-input`, because every input, the legitimate ones too, ends in `exit 1: no items.json in <path>`. Three legitimate cases read as overblocked.
- A cases file with `{"input": ".", "fixture": {"files": {"items.json": "…"}}}` is run with an empty cwd and refused the same way, with no decline and no warning: `fixture` is ignored on this arm. That is also a silent contract gap, since the same field is honoured one arm over.
- The same story's successor, 3.1.2, probed `list --type` and `list --category` through the same form and got `engages` over 35 probes. Those controls refuse before they read any data, so they needed no fixture. The gap shows only on a control that reads the directory, which is the common shape for a CLI over a data store.
- Story 3.1.1 was accepted on a recorded human override because of this: its boundary stays unprobed (omarchy-leak-radar `story.3.1.1.dod.2.schema-v4-storage-engine.md`, Step 3).

## 3. Technical Background

- `runCliCase` (`shared/resources/security-probe.mjs`, around line 2531) builds `fixtureDir` with `materialiseFixture(workDir, fixture?.controls ?? [], c.input, { writeInput: fixture !== null })` and runs the child with `cwd: fixtureDir`; a `{fixture}` element in the template is that directory.
- `writeFixtureFiles(caseDir, files)` (around line 2694) is shared by the `fence:` and `shell-argv:` arms. It refuses a path that leaves the case directory (throws; the caller turns it into an `errored` run).
- `fixtureProblem(fixture)` (around line 3120) validates a case's `fixture` shape — only `env` and `files`, string values, no NUL, `env` keys are variable names, and `HOME`/`TMPDIR`/`LC_ALL` refused. It runs **per case**, at the top of `runShellArgvCase` and `runFenceCase`, and declines that case as `errored` with its reason. (The checks around lines 1663 and 1694 are the separate `needs-fake-gh` text checks of those two forms; `cli:` has no `gh` isolation and needs none here — `--fake-gh` is refused on `cli:`.)
- `runShellArgvCase` also declines an `expected.absent` name that the case's own `fixture.files` create (task.128 BUG-13, around lines 2895–2908): a correct run would mismatch on every run. `runCliCase` checks only the sink's controls and the input.
- `runCliCase` spawns `python3` **by name**; `spawnSync` resolves it on the child env's `PATH`, so a `fixture.env.PATH` would select the binary. Python's `-E` already ignores `PYTHON*`; Node has no such flag, so `NODE_OPTIONS` (`--require`) would load code before the entry.
- `OPTIONAL_CASE_FIELDS` lives in `shared/resources/security-input-corpus.mjs` (line 76); the comment above it (lines 67–74) documents `fixture` as read "only by the `fence:` … and `shell-argv:` … entry forms", which is the sentence to change.
- Precedent: tasks 180 (`fence:`) and 181 (`shell-argv:`) each added `fixture`, with its own decline reasons, tests and docs.

## 4. Scope

**In.** The `cli:` arm (Node and Python) writes a case's `fixture.files` into its case directory, and merges `fixture.env`, before the child starts, exactly as the `shell-argv:` arm does: same path containment, same refusal of `HOME`, `TMPDIR` and `LC_ALL` in `env`, same `errored` (never a verdict) when a file cannot be written, same decline of an `expected.absent` name the fixture files create. Reuse `writeFixtureFiles`, `fixtureProblem` and `fixtureCaseEnv`; do not write a second implementation. Because the child's cwd is the case directory, `{input}` can name `.` or a relative path inside it (when the sink is not materialised — the `filename` sink writes the input as a file).

One addition the other arms do not need: the `cli:` arm also refuses `PATH` and `NODE_OPTIONS` in `fixture.env`, declined by name. Both steer the interpreter the arm spawns rather than the CLI under probe (`PATH` selects the `python3` binary; `NODE_OPTIONS` loads code before the entry), and the verdict depends on that interpreter's own crash signals. Fail closed; documented as a limit of the form. (Review Q2.)

**Decision (confirmed in review, Q1).** Per-case `fixture.files` rather than `--fixture-setup` on `cli:`: a case states what it needs, no extra script, and the field is already defined. If a CLI needs a directory too large to inline, `--fixture-setup` can be a later task.

**Out.** `--fixture-setup` for `cli:`; fixture support in the `js` export form; changing the `path` sink's corpus.

## 5. Breaking Changes

None. A `cli:` case with no `fixture` behaves exactly as before. A `cli:` case that carries `fixture` today has it ignored; after this it is honoured, which can change a verdict that was already unreliable.

## 6. Implementation Plan

1. `shared/resources/security-probe.mjs`, `runCliCase`:
   - At the top, with the other case checks: `fixtureProblem(c.fixture)` → decline the case by its reason; then refuse `PATH` / `NODE_OPTIONS` in `c.fixture.env` (decline: "`fixture.env` may not set PATH on the cli: form — it selects the interpreter"); then decline an `expected.absent` name whose first path segment a `fixture.files` key creates, as `runShellArgvCase` does. The local name `fixture` there is the **sink** fixture (`MATERIALISED_SINKS`); the case's is `c.fixture` — keep them apart.
   - After `materialiseFixture`, inside the same `try`: `writeFixtureFiles(fixtureDir, Object.entries(c.fixture?.files ?? {}))`, so a path that leaves the case directory declines the case (`fixture: …`).
   - Spawn with `fixtureCaseEnv(c.fixture, { fixtureDir, sandboxHome, sandboxTmp })` in place of `caseEnv(...)`.
2. Update the `cli:` section of the header comment in `security-probe.mjs`, and the comment above `OPTIONAL_CASE_FIELDS` in `shared/resources/security-input-corpus.mjs` (`fixture` is read by `cli:` as well, with the `PATH`/`NODE_OPTIONS` refusal).
3. Docs: `probe-boundary-rule.md` (§5, the `cli:` form), `finalise-dod-security-prompt.md` (Step 4's entry-form list and its note that a populated directory needs `fixture`), and `docs/reference/` where the forms are listed (`git grep -n "cli:" -- docs/reference` — no hit at implementation time, so no edit there).
4. Bundle (`npm run bundle`) into finalise, qa-story, qa-task and review-security; CHANGELOG `[Unreleased]`.

## 7. Files Summary

`shared/resources/security-probe.mjs` and `shared/resources/security-input-corpus.mjs`, and their bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`; `shared/resources/probe-boundary-rule.md`; `shared/resources/finalise-dod-security-prompt.md` (and copies); engine tests in `shared/resources/tests/security-probe.test.mjs` with new fixture CLIs `shared/resources/tests/fixtures/security-probe/cli-needs-data.mjs` and `cli-needs-data.py` (both reached by `npm test`'s `'shared/resources/tests/*.test.mjs'`); `CHANGELOG.md`.

## 8. Testing Strategy

A fixture CLI (Node `cli-needs-data.mjs`, and Python `cli-needs-data.py`, under `shared/resources/tests/fixtures/security-probe/`) that exits 0 only when `./items.json` exists in its cwd and contains a marker, 1 otherwise; it also exits 0 when an env var the case sets carries the marker, so env delivery is observable. Tests in `shared/resources/tests/security-probe.test.mjs`, each for Node and Python: a legitimate case with `fixture.files` is accepted (verdict from the exit status); the same case without `fixture` is rejected (proves the file is what made it pass); a `fixture.files` path that escapes the case directory is declined by name; `fixture.env` reaches the child, and `HOME` in it is refused; `PATH` and `NODE_OPTIONS` in it are refused by name; an `expected.absent` name the fixture files create is declined; an `expected` case still compares as before. Mutation proof: drop the `writeFixtureFiles` call and the first test goes red; drop the env merge and the env test goes red. Existing `cli:` tests for `.mjs`, `.js` and `.py` stay unchanged and green.

## 9. Success Criteria

1. A `cli:` case with `fixture.files` runs with those files present in its cwd and is scored from the exit status. Test: the fixture-CLI suite above, per PR.
2. A `cli:` case without `fixture` is unchanged. Test: the existing `cli:` suites.
3. A malformed `fixture` on a `cli:` case — an escaping path, a sandbox-owned or interpreter-steering env key (`HOME`, `PATH`, `NODE_OPTIONS`), an `expected.absent` name its files create — is declined by name, never run. Test: the decline cases above.

**Deferred Work** (cannot be met before merge, so not a success criterion of this PR): release, re-vendor into consumers, and the consumer proof in omarchy-leak-radar — `threat-radar merge-back --schema 3 {input}` probed with a cases file whose legitimate case carries a populated v3 data dir (`fixture.files: {"items.json": …}`) reaches a verdict other than `rejects-every-input`, closing the story 3.1.1 follow-up.

## 10. Risk Assessment

Low. The change is additive and reuses the helpers two other arms already run. The real risks are the sandbox — a fixture path that leaves the case directory, which `writeFixtureFiles` already refuses, pinned by the test above for this arm — and a case env that steers the interpreter the verdict depends on, which the `PATH`/`NODE_OPTIONS` refusal closes (fail-closed: it only narrows what runs).

## 11. Rollback Plan

Revert the `runCliCase` change and re-bundle; a `cli:` case's `fixture` is ignored again, as it is today.

## Implementation Record

**Started**: 2026-10-22 · **Completed**: 2026-10-22 · implemented by `/develop` inside `/develop-task` (run 1).

**Summary.** `runCliCase` now honours a case's `fixture`: it validates it with `fixtureProblem`, refuses `PATH` and `NODE_OPTIONS` in its `env` (`CLI_INTERPRETER_ENV`), declines an `expected.absent` name the fixture files create, writes `files` with `writeFixtureFiles` after `materialiseFixture`, and spawns under `fixtureCaseEnv` instead of `caseEnv`. No new helper; the three it uses are the ones the `shell-argv:` arm already runs.

**Approach.** The local `fixture` in `runCliCase` stays the **sink's** (`MATERIALISED_SINKS`); the case's is always `c.fixture`. The `expected.absent` collision check moved out of the `hasExpected` block so it can read the fixture files, matching `runShellArgvCase`'s first-segment rule. Every refusal returns before anything spawns.

**Testing.** Eight new tests in `shared/resources/tests/security-probe.test.mjs` (four rows × Node and Python, fixture CLIs `cli-needs-data.mjs` / `cli-needs-data.py`): files accepted / absent rejected / nested path; env delivered, `HOME` / `PATH` / `NODE_OPTIONS` declined; malformed fixture, escaping path, `expected.absent` collision declined; `expected` still compared. Mutation-proved: removing the file write, the env merge, the interpreter-env refusal, the collision clause or the `fixtureProblem` call each turns its tests red. Existing `cli:` tests unchanged.

**Deferred Work.** Release, re-vendor, and the omarchy-leak-radar consumer proof (§9).

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-22
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.216.qa.1.probe-engine-cli-case-fixture-files.md](./task.216.qa.1.probe-engine-cli-case-fixture-files.md)
- **Gate File**: [task.216.gate.1.probe-engine-cli-case-fixture-files.yml](./task.216.gate.1.probe-engine-cli-case-fixture-files.yml)

### Test Coverage Summary
- **Tests Executed**: 96 (`cli` tests; full suite 6201, 0 fail)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues. One LOW (TASK-216-QA1-1): the new docs recommend input `.` for a legitimate `cli:` case without saying it is declined under the `filename` sink.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-19 | 1.0     | Initial draft                                                                                                | create-task |
| 2026-10-22 | 1.1     | Review passed (8/10) — corrected file/line references, added expected.absent and PATH/NODE_OPTIONS handling, moved release and consumer proof to Deferred Work | review-task |
| 2026-10-22 |         | Status → ready-for-development                                                                               | review-task |
| 2026-10-22 |  | Implemented — 9 source files (+16 bundled copies), 8 tests | develop |
| 2026-10-22 |  | QA gate PASS (100/100) — 1 LOW finding | qa-task |
| 2026-10-22 |  | QA findings fixed — TASK-216-QA1-1 (filename-sink caveat in two docs), 1 iteration | qa-fix |
<!-- change-log-end -->

