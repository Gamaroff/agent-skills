---
id: task.311.plan
title: "Implementation Plan: Develop pipelines check the skill they loaded and the records criteria name"
type: plan
task-ref: task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md
---

# Implementation Plan: Develop pipelines check the skill they loaded and the records criteria name

> Requirements and success criteria: [task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md](task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md)

## Overview

Add one small engine and one rule for the sub-skill identity check, and pass the record-demanding criteria that `finalise-record-preflight.js` already finds to `qa-task` at the QA step.

## Phase-by-Phase Implementation Guide

### Phase 1: The identity check

**Files to modify:**
- `shared/resources/skill-resolution.js` (new) — `check --name <skill> --base-dir <path> --root <repo> [--json]`.
- `shared/resources/skill-resolution.md` (new) — the rule.
- `skills/develop-{task,story,bug}/SKILL.md` — extend the step-4 line.

**Exact changes:**

Measure first. Before writing the classifier, list what each of the pipeline's sub-skills resolves to on this machine, and record it in the QA report:

```bash
ls -la ~/.claude/skills/synced 2>/dev/null | head; ls -la .agents/skills .claude/skills 2>&1 | head -4
```

Classifier (sketch — the contract is the `reason` and exit code):

```js
function classify({ name, baseDir, root }) {
  let real;
  try { real = fs.realpathSync(baseDir); } catch { return { reason: "unreadable" }; }
  const homes = ["skills", ".agents/skills", ".claude/skills"].map((d) =>
    safeReal(path.join(root, d, name)));
  return homes.includes(real) ? { reason: "repo" } : { reason: "shadowed", baseDir: real };
}
```

`safeReal` returns `null` for a missing home. Exit 0 for `repo`, 1 for `shadowed` or `unreadable`, 2 for a usage error. Read `reason`, not the exit code alone.

The step-4 text gains a citation, not a restatement: after the Skill tool returns, run `check` with the `Base directory for this skill:` value; on `shadowed`, read `.agents/skills/<name>/SKILL.md` and follow it. Use `skill-resolution.md#after-every-load` so the orchestrators bundle the rule alone.

### Phase 2: The record hand-off

**Files to modify:**
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (around line 295–304, before the `Skill(qa-task …)` dispatch).
- `skills/qa-task/SKILL.md`.

**Exact changes:**

```bash
command node .agents/skills/develop-task/references/finalise-record-preflight.js check \
  --doc "$TASK_FILE" --json > "$TASK_DIR/.summaries/record-criteria.json"
```

Dispatch with `record_criteria={task-directory}/.summaries/record-criteria.json`. In `qa-task`, a step reads the file and, for each `listed` entry, writes the record into the report its `location` names, with the command and output. Never edit the criterion text; the evidence moves.

## Key Patterns and References

- `shared/resources/finalise-record-preflight.js` — reuse, do not reimplement; peer contract for `reason` and exit codes.
- `shared/resources/criteria-drift.js` — already refuses a reworded criterion at 5c; this task keeps that rule upstream.

## Testing Approach

`shared/resources/tests/skill-resolution.test.mjs`: one test per path shape (repository, synced, symlink into repository, missing). Create temp directories with a `t.after` removal (`scripts/test-tmpdir.mjs` rejects a leaking prefix). Mutation-prove each: make the classifier return `repo` for a non-repository path and name the test that goes red.
