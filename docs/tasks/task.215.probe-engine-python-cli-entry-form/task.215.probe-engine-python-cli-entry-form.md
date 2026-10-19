---
id: task.215
title: "[Task 215] security-probe: run a Python CLI under the cli: entry form"
type: task
description: "Let shared/resources/security-probe.mjs probe a Python script through the existing cli: form (by file extension), so a Python boundary reaches the DoD probe instead of failing the zero-candidates guard."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-19
updated: 2026-10-19
estimated_effort_hours: 6
github_issue: 689
---

# Technical Task: security-probe — a Python CLI under `cli:`

**Status:** Planned

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
  other extension; the child is always `process.execPath` (`:1617`).
- The `cli:` form's contract is already general: the case's input is one element of an `--argv` template, the exit
  status is the verdict, a crash is `errored`, and each guarded flag is its own control (`--name`).
- Precedent: tasks 144 (`cli:`), 180 (`fence:`) and 181 (`shell-argv:`) each added one entry form with its own
  decline reasons, tests, docs and bundled copies.

## 4. Scope

**In.** Make `cli:` accept a `.py` entry and run it under `python3`, with the same argv template, slots, verdict rules,
containment, timeout and environment hygiene as the Node arm. Record the interpreter in the run record (as `shells` is
recorded for the shell forms). Decline by name, once, when `python3` is not on `PATH`.

**Design choice to confirm in review.** Extend `cli:` by extension (recommended: one contract, no new prefix) rather
than add a `py-cli:` prefix.

**Out.** Importing a Python function (a `py:path#function` form); a Python test runner; any other language.

## 5. Breaking Changes

None. `.py` entries were declined before; every existing form and decline reason is unchanged.

## 6. Implementation Plan

1. `security-probe.mjs`: replace `CLI_EXTENSIONS` with an extension → interpreter map; resolve `python3` once per run;
   decline `entry-not-probeable` with a detail naming the missing interpreter. Spawn it with a clean environment:
   no inherited `PYTHON*` variables, no user site-packages (`-s`), no bytecode writes (`-B`). Do not use `-I` blindly:
   it drops the script's directory from `sys.path`, which breaks scripts that import a sibling module — decide and test.
2. Sandbox: the Python child must not reach the real home or data dir. Confirm the `cli:` arm's `HOME` / `XDG_*`
   redirection covers it, and add a test with a fixture CLI that writes under `$HOME`.
3. Run record: add the interpreter name and version to the control entry.
4. Docs: `probe-boundary-rule.md` §5 and `finalise-dod-security-prompt.md` Step 4 (entry-form list: "a Python CLI takes the
   cli: form"), the engine's header comment, `docs/reference/` if the forms are listed there.
5. Bundle (`npm run bundle`) into finalise, qa-story, qa-task and review-security; CHANGELOG `[Unreleased]`.
6. Release a tag and re-vendor into consumers (`setup-consumer.sh --update`).

## 7. Files Summary

`shared/resources/security-probe.mjs`; its bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`;
`shared/resources/probe-boundary-rule.md`; `shared/resources/finalise-dod-security-prompt.md` (and copies); engine tests under
`evals/shared/tests/`; `CHANGELOG.md`.

## 8. Testing Strategy

A fixture Python CLI (`argv[1]` path: exits 0 for a safe path, 1 for a refused one). Cases: runs under `python3`; verdict from
exit status; a crash is `errored`; a missing interpreter is declined once by name; a `.py` entry with `--argv` missing is
`bad-argv`; the child cannot write outside its sandbox; the run record names the interpreter; a mutation (revert the
extension map) makes the `.py` test red. Keep the existing `.mjs` / `.js` tests unchanged and green.

## 9. Success Criteria

1. `security-probe.mjs --entry cli:<fixture>.py --argv '[...,"{input}"]' --sink path` returns `executed > 0` with the expected
   verdicts. Test: the fixture suite above, per PR.
2. A `.py` entry no longer returns `entry-not-probeable` for the extension; every other decline reason is unchanged.
3. The run record carries the interpreter. Test: record assertion.
4. Consumer proof (omarchy-leak-radar, after re-vendoring): the `probe_command` from its `dod.1.security.run.json`
   (`--entry 'cli:scripts/threatradar.py' --argv '["merge-back","--schema","3","{input}"]'`) executes candidates. Open
   point: the `path` sink's cases must fit a `merge-back` target (a case may need `--cases-file`, and the `cli:` form has no
   `--fixture-setup`); settle this against the consumer, and add the missing piece to this task if the form needs it.

## 10. Risk Assessment

Low. The change is additive and isolated behind an extension that was previously declined. The one real risk is the
sandbox: a Python child that writes to `$HOME`. Covered by the test in the plan.

## 11. Rollback Plan

Revert the engine change and re-bundle; `.py` entries return to `entry-not-probeable`.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                                  | Author      |
| ---------- | ------- | -------------------------------------------------------------------------------------------- | ----------- |
| 2026-10-19 | 1.0     | Initial draft, written from omarchy-leak-radar (story 3.1.1 halted at /finalise on this gap) | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Implementation Plan steps 1-3: extension map, sandbox, run record (tests first)
- [ ] Implementation Plan steps 4-5: docs, bundle, CHANGELOG
- [ ] Implementation Plan step 6: release, re-vendor and consumer proof

---

## References

- omarchy-leak-radar story 3.1.1 (`threat-radar merge-back`), PR #63 in that repository: halted at `/finalise` Step 7 on `entry-not-probeable`.
- [task.144](../task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md), the `cli:` form this extends.
- [task.180](../task.180.probe-engine-fence-entry-form/task.180.probe-engine-fence-entry-form.md) and [task.181](../task.181.probe-engine-shell-argv-entry-form/task.181.probe-engine-shell-argv-entry-form.md), the other entry forms added the same way.

---

## Notes

- QA artifacts land beside this file: `task.215.qa.{N}.*.md`, `task.215.bug.{N}.*.md`, `task.215.gate.{N}.*.yml`.
