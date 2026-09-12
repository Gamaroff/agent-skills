---
id: task.111.plan
title: "Implementation Plan: local parity with CI"
type: plan
task-ref: task.111.local-ci-parity.md
---

# Implementation Plan: local parity with CI

> Requirements and success criteria: [task.111.local-ci-parity.md](task.111.local-ci-parity.md)

## Overview

Four small changes with one theme: what CI checks, a contributor can check first.

## Phase-by-Phase Implementation Guide

### Phase 1: `lint:shell` and `ci`

```json
"lint:shell": "if command -v shellcheck >/dev/null; then git ls-files '*.sh' | grep -v '^skills/[^/]*/references/' | xargs shellcheck --severity=warning; else echo 'shellcheck not installed — lane skipped (CI runs it)'; fi",
"ci": "npm run ci:fast && npm run eval:all && npm run validate:all && npm run bundle:check && npm run lint:shell"
```

Keep the file list expression identical to `shellcheck.yml`'s (copy it; add a comment in the
workflow naming the script as its twin).

### Phase 2: wrapper test

Read `evals/develop-story/protocol/install-hooks-behavior.test.mjs`. Lift its assertions into a
`for (const skill of fs.readdirSync("skills").filter(s => s.startsWith("develop-") && fs.existsSync(`skills/${s}/scripts/on-stop.sh`)))`
loop, or add a sibling test file per pipeline if the existing one is too story-specific. Assert a
floor: at least three pipelines found.

### Phase 3: description cap

In `quick_validate.py`, after the frontmatter parse: `if len(description) > 1024: fail(f"description is {n} chars (max 1024)")`.
Trim `develop-story`'s by ≥ 3 chars without losing a trigger phrase.

### Phase 4: docs

`releases.md` checklist: one line above the five workflow boxes — "`npm run ci` runs all five locally."

## Key Patterns and References

- `.github/workflows/shellcheck.yml` (file list, severity, the ≥200/empty guard)
- `docs/contributing/traps.md` — "npm test's suite list is hand-maintained": if the wrapper test is a
  new file, add its glob.

## Testing Approach

Run each mutation in §8 and record the failing test name in the implementation report.
