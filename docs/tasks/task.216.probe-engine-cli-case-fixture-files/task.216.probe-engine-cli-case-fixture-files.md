---
id: task.216
title: "[Task 216] security-probe: the cli: form honours a case's fixture.files (and env)"
type: task
description: "Let a cli: probe case carry fixture.files and fixture.env, written into the case directory before the run exactly as the fence: and shell-argv: arms write them, so a CLI that reads a populated directory (a data dir, a repository) can have a legitimate case that is accepted."
tags: [security-probe, finalise, qa-task, qa-story, review-security, observation]
category: infrastructure
status: draft
priority: Medium
created: 2026-10-19
updated: 2026-10-19
estimated_effort_hours: 4
github_issue: 696
---

# Technical Task: security-probe — `cli:` cases carry `fixture.files`

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
- `writeFixtureFiles(caseDir, files)` (around line 2689) is shared by the `fence:` and `shell-argv:` arms. It refuses a path that leaves the case directory, and the engine's pre-checks (around lines 1663 and 1694, and 3153) already validate `fixture.files` for those arms.
- `OPTIONAL_CASE_FIELDS` documents `fixture` as read "only by the `fence:` and `shell-argv:` entry forms", which is the sentence to change.
- Precedent: tasks 180 (`fence:`) and 181 (`shell-argv:`) each added `fixture`, with its own decline reasons, tests and docs.

## 4. Scope

**In.** The `cli:` arm (Node and Python) writes a case's `fixture.files` into its case directory, and merges `fixture.env`, before the child starts, exactly as the `shell-argv:` arm does: same path containment, same refusal of `HOME`, `TMPDIR` and `LC_ALL` in `env`, same `errored` (never a verdict) when a file cannot be written. Reuse `writeFixtureFiles`; do not write a second implementation. Because the child's cwd is the case directory, `{input}` can name `.` or a relative path inside it.

**Decision to confirm in review.** Per-case `fixture.files` (recommended: a case states what it needs, no extra script, and the field is already defined) rather than `--fixture-setup` on `cli:`. If a CLI needs a directory too large to inline, `--fixture-setup` can be a later task.

**Out.** `--fixture-setup` for `cli:`; fixture support in the `js` export form; changing the `path` sink's corpus.

## 5. Breaking Changes

None. A `cli:` case with no `fixture` behaves exactly as before. A `cli:` case that carries `fixture` today has it ignored; after this it is honoured, which can change a verdict that was already unreliable.

## 6. Implementation Plan

1. `security-probe.mjs`: in `runCliCase`, after `materialiseFixture` and before the spawn, apply the case's `fixture` as the shell-argv arm does (`files` through `writeFixtureFiles`, `env` merged into the case env, the reserved names refused). Run the same `fixture` validation the other arms run at plan time, so a malformed one is declined by name, not at spawn.
2. Update the usage header and the `OPTIONAL_CASE_FIELDS` comment (`fixture` is read by `cli:` as well), and the `cli:` section of the header comment.
3. Docs: `probe-boundary-rule.md` (§5, the `cli:` form), `finalise-dod-security-prompt.md` (Step 4's entry-form list and its note that a populated directory needs `fixture`), and `docs/reference/` where the forms are listed.
4. Bundle (`npm run bundle`) into finalise, qa-story, qa-task and review-security; CHANGELOG `[Unreleased]`.
5. Release and re-vendor into consumers.

## 7. Files Summary

`shared/resources/security-probe.mjs`; its bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/`; `shared/resources/probe-boundary-rule.md`; `shared/resources/finalise-dod-security-prompt.md` (and copies); engine tests under `evals/shared/tests/`; `CHANGELOG.md`.

## 8. Testing Strategy

A fixture CLI (Node, and a Python one) that exits 0 only when `./items.json` exists in its cwd and contains a marker, 1 otherwise. Cases: a legitimate case with `fixture.files` is accepted (verdict from the exit status); the same case without `fixture` is rejected (proves the file is what made it pass); a `fixture.files` path that escapes the case directory is declined by name; `fixture.env` reaches the child, and `HOME` in it is refused; an `expected` case still compares as before; a mutation (drop the new write) makes the first test red. Existing `cli:` tests for `.mjs`, `.js` and `.py` stay unchanged and green.

## 9. Success Criteria

1. A `cli:` case with `fixture.files` runs with those files present in its cwd and is scored from the exit status. Test: the fixture-CLI suite above, per PR.
2. A `cli:` case without `fixture` is unchanged. Test: the existing `cli:` suites.
3. A malformed `fixture` on a `cli:` case is declined by name, never run. Test: the escaping-path case.
4. Consumer proof (omarchy-leak-radar, after re-vendoring): `threat-radar merge-back --schema 3 {input}` probed with a cases file that carries a populated v3 data dir (`fixture.files: {"items.json": …}`) as its legitimate case reaches a verdict other than `rejects-every-input`, and that closes the story 3.1.1 follow-up.

## 10. Risk Assessment

Low. The change is additive and reuses the helper two other arms already run. The one real risk is the sandbox: a fixture path that leaves the case directory, which `writeFixtureFiles` already refuses, and the test above pins it for this arm.

## 11. Rollback Plan

Revert the `runCliCase` change and re-bundle; a `cli:` case's `fixture` is ignored again, as it is today.
