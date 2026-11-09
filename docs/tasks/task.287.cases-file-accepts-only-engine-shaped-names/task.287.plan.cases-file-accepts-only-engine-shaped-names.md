---
id: task.287.plan
title: "Implementation Plan: cases_file accepts only engine-shaped names"
type: plan
task-ref: task.287.cases-file-accepts-only-engine-shaped-names.md
---

# Implementation Plan: cases_file accepts only engine-shaped names

> Requirements and success criteria: [task.287.cases-file-accepts-only-engine-shaped-names.md](task.287.cases-file-accepts-only-engine-shaped-names.md)

## Overview

Edit `shared/resources/` and `skills/finalise/SKILL.md` only, with the Edit tool. Never a bundled copy; `npm run bundle` regenerates those.

## Phase 1: The check

`shared/resources/security-probe-plan.mjs`, in `resolveCasesFile`:

```js
// The names the engine writes: <casesBase>.json, or <casesBase>.<i>.json for entry i of several.
const CASES_FILE_NAME = /\.security\.cases(\.[0-9]+)?\.json$/;
```

Place the check after the `path.isAbsolute(name)` and `rel` confinement checks and before `lstatSync`:

```js
if (!CASES_FILE_NAME.test(path.basename(joined))) return { ok: false, why: "bad-name-shape" };
```

Order matters: an escaping name must keep answering `outside-work-dir`, not `bad-name-shape`. Test that order.

## Phase 2: Tests

`shared/resources/tests/security-probe-plan-cases-file.test.mjs` uses `ok.json`, `mixed.json`, `only.json`, `esc.json`, `obj.json` as plan-entry names (around lines 95-195). Rename each fixture file and its `cases_file` to an engine-shaped name (`ok.dod.0.security.cases.json`). Keep the `missing.json` and `link.json` cases but give them engine-shaped names too, or the new check answers first and they stop testing what they test.

Add: both accepted shapes; a plain `x.json`; `x.security.cases.json.bak`; `x.security.cases.a.json`; a dotted stem `task.9.dod.2.security.cases.json`; and the order test (an escaping engine-shaped name still answers `outside-work-dir`).

## Phase 3: Wording, bundle, changelog

- `shared/resources/finalise-dod-security-prompt.md` near line 428, and `skills/finalise/SKILL.md` near line 741: add "named like the engine's files: `…security.cases.json` or `…security.cases.<n>.json`".
- `npm run bundle`, then `npm run bundle -- --check`.
- `CHANGELOG.md`: one entry under `[Unreleased]` citing (task 287).

## Mutation proof

Delete the check; confirm the refusal tests go red and the accepted-shape tests stay green. Restore byte-identical and record the fail count in the QA report.
