---
id: task.269.plan
title: "Implementation Plan: finalise never hand-copies agent output"
type: plan
task-ref: task.269.finalise-never-hand-copies-agent-output.md
---

# Implementation Plan: finalise never hand-copies agent output

> Requirements and success criteria: [task.269.finalise-never-hand-copies-agent-output.md](task.269.finalise-never-hand-copies-agent-output.md)

## Overview

Edit `shared/resources/` and `skills/finalise/` sources only, using the Edit tool. Never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

Read how the Agent tool returns a subagent's output (an output file path or only in-context text). Record the answer at the top of this plan. If only in-context text exists, the extractor is a prompt-shape change plus a hash the orchestrator computes over the block it was handed; say so, and keep the fenced-block design.

### Phase 2: Probe plan route

- `security-probe.mjs`: where entries are read (`grep -n "cases" skills/finalise/references/security-probe.mjs | head`), accept `cases_file:` as an alternative to `cases`; resolve it under the work-item directory only; refuse a path outside it; copy bytes with `fs.copyFileSync`, never through a string.
- Reuse path: compare `sha256` of the prior plan to its committed cases files and `git diff --quiet <prior-head> HEAD -- <engine paths>`; on a match say "plan reused from dod.{N-1}" in the DoD.
- Entity refusal at the write step: refuse a plan whose case `input`s or fixtures contain `&lt;`, `&gt;`, `&amp;` or `&quot;` when the plan contains no literal `<`.
- Update the prompt `shared/resources/finalise-dod-security-prompt.md` so the agent names a file instead of copying cases when the cases already exist.

### Phase 3: AC YAML route

- `finalise-dod-ac-prompt.md`: end the answer with a fenced block with a fixed info string.
- `finalise-rerun-scope.js`: add `extract` (read the reply, write the block, print `bytes` and `sha256`) and make `merge` record both and refuse when the file's hash differs.
- `SKILL.md:809`: replace the hand-copy sentence with the extract call.

### Phase 4

New tests next to `shared/resources/tests/finalise-rerun-scope.test.mjs` and the security-probe suite. Mutation-prove each refusal with the Edit tool and `git diff --stat` to confirm the restore. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `skills/finalise/SKILL.md:619` and `:809`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node tests with fixtures; the seven control characters are the property under test.
