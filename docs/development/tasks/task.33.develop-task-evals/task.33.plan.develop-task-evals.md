---
id: task.33.plan
title: "Implementation Plan: Build evals for develop-task pipeline"
type: plan
task-ref: task.33.develop-task-evals.md
---

# Implementation Plan: develop-task evals

> Requirements and success criteria: [task.33.develop-task-evals.md](task.33.develop-task-evals.md)

## Overview

Build three layers of coverage (protocol, step-isolation, smoke) for the develop-task pipeline. Phase 1-2 introduce reusable shared infrastructure (`git-sandbox`, `gh-sandbox`, `pipeline-recorder`). Phase 3-4 add skill-specific assertions and protocol checks. Phase 5-6 author scenarios and wire scripts/CI/docs.

## Phase-by-Phase Implementation Guide

### Phase 1 — git-sandbox + pipeline-recorder

**File: `evals/shared/lib/git-sandbox.mjs`**

```js
// Public API:
//   createSandbox({ fixtureFiles, initialCommit, branch }) -> Promise<Sandbox>
//   Sandbox: { path, run, commit, branchList, cleanup }

import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function createSandbox({ fixtureFiles = {}, initialCommit = true, branch = 'develop' } = {}) {
  const path = await mkdtemp(join(tmpdir(), 'agent-skills-eval-'));
  const run = async (cmd, args = []) => {
    const { stdout, stderr } = await exec(cmd, args, { cwd: path });
    return { stdout, stderr };
  };
  await run('git', ['init', '-b', branch]);
  await run('git', ['config', 'user.email', 'eval@local']);
  await run('git', ['config', 'user.name', 'eval']);
  for (const [rel, content] of Object.entries(fixtureFiles)) {
    const full = join(path, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  if (initialCommit && Object.keys(fixtureFiles).length) {
    await run('git', ['add', '.']);
    await run('git', ['commit', '-m', 'initial fixture']);
  }
  return {
    path,
    run,
    commit: (msg) => run('git', ['commit', '--allow-empty', '-m', msg]),
    branchList: async () => (await run('git', ['branch', '--list'])).stdout.split('\n').map(s => s.replace(/^[* ]+/, '').trim()).filter(Boolean),
    cleanup: () => rm(path, { recursive: true, force: true }),
  };
}
```

**File: `evals/shared/lib/pipeline-recorder.mjs`**

```js
// Public API:
//   wrapDriver(driver) -> { driver: WrappedDriver, events: RecordedEvent[] }
//   RecordedEvent: { skill: string, args: object, status: 'started'|'completed'|'halted', timestamp: number }

export function wrapDriver(driver) {
  const events = [];
  return {
    events,
    driver: {
      ...driver,
      async run(prompt, options) {
        const onToolUse = options?.onToolUse;
        const wrappedOptions = {
          ...options,
          onToolUse: (event) => {
            if (event.tool === 'Skill') {
              events.push({
                skill: event.input?.skill,
                args: event.input?.args,
                status: 'started',
                timestamp: Date.now(),
              });
            }
            return onToolUse?.(event);
          },
        };
        return driver.run(prompt, wrappedOptions);
      },
    },
  };
}
```

**Tests: `evals/shared/tests/git-sandbox.test.mjs`** — assert init, fixture write, commit creates HEAD, branchList includes default branch, cleanup removes dir.

**Tests: `evals/shared/tests/pipeline-recorder.test.mjs`** — wrap a stub driver, send fake `Skill` tool-use events, assert events array shape + ordering.

### Phase 2 — gh-sandbox

**File: `evals/shared/lib/gh-sandbox.mjs`**

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function createGhSandbox({ repo, branch, base, title, body }) {
  if (!process.env.GH_TOKEN) {
    return { skipped: true, reason: 'GH_TOKEN not set', cleanup: async () => {} };
  }
  if (!repo) {
    return { skipped: true, reason: 'repo not provided', cleanup: async () => {} };
  }
  const env = { ...process.env, GH_TOKEN: process.env.GH_TOKEN };
  await exec('gh', ['pr', 'create', '--repo', repo, '--base', base, '--head', branch, '--title', title, '--body', body], { env });
  const { stdout } = await exec('gh', ['pr', 'view', '--repo', repo, '--head', branch, '--json', 'number,url,baseRefName'], { env });
  const pr = JSON.parse(stdout);
  return {
    skipped: false,
    pr,
    cleanup: async () => {
      try {
        await exec('gh', ['pr', 'close', '--repo', repo, String(pr.number), '--delete-branch'], { env });
      } catch (e) {
        console.error(`gh-sandbox cleanup warning: ${e.message}`);
      }
    },
  };
}
```

**Tests:** unset `GH_TOKEN` path returns skipped; happy path mocks `execFile` via injectable command runner (refactor to take an `exec` parameter for testability).

### Phase 3 — Skill-specific assertions

**File: `evals/develop-task/assertions.mjs`**

```js
export async function branchExists(sandbox, namePattern) {
  const branches = await sandbox.branchList();
  const re = namePattern instanceof RegExp ? namePattern : new RegExp(namePattern);
  return branches.some(b => re.test(b));
}

export function prCreated(receipt, { base, titlePattern }) {
  if (!receipt || receipt.skipped) return { ok: false, reason: receipt?.reason ?? 'no receipt' };
  const baseOk = receipt.pr.baseRefName === base;
  const titleOk = !titlePattern || new RegExp(titlePattern).test(receipt.pr.title ?? '');
  return { ok: baseOk && titleOk, base: receipt.pr.baseRefName, title: receipt.pr.title };
}

export function pipelineStepsRan(events, expectedSteps) {
  const actual = events.filter(e => e.status === 'started').map(e => e.skill);
  let i = 0;
  for (const expected of expectedSteps) {
    const found = actual.indexOf(expected, i);
    if (found === -1) return { ok: false, missing: expected, actual };
    i = found + 1;
  }
  return { ok: true };
}

export function loopBoundedAt(events, skill, maxIter) {
  const count = events.filter(e => e.skill === skill && e.status === 'started').length;
  return { ok: count <= maxIter, count };
}

export async function noLockFilesLeft(sandboxPath) {
  const { stdout } = await new Promise((res) => {
    require('node:child_process').execFile('find', [sandboxPath, '-name', '*.lock'], (_, stdout) => res({ stdout: stdout ?? '' }));
  });
  return { ok: stdout.trim() === '', files: stdout.trim().split('\n').filter(Boolean) };
}
```

**Registration:** the runner currently uses a switch statement on assertion `fn` names. Add a per-skill registration mechanism — `evals/shared/runner.mjs` accepts `--assertions <path>` flag pointing at the skill's `assertions.mjs`, merges its exports into the registry. Avoids cross-skill pollution in `shared/assertions.mjs`.

**Tests: `evals/shared/tests/develop-task-assertions.test.mjs`** — happy + sabotage cases for each fn.

### Phase 4 — Protocol checks

**File: `evals/develop-task/protocol/pipeline-shape.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SKILL_PATH = 'skills/develop-task/SKILL.md';
const EXPECTED_STEPS = [
  'create-branch',
  'review-task',
  'develop-loop',
  'create-pr',
  'qa-task',
  'qa-fix',
  'finalise',
  'commit-changes',
];

test('SKILL.md lists all 8 steps in order', async () => {
  const content = await readFile(SKILL_PATH, 'utf8');
  let lastIdx = -1;
  for (const step of EXPECTED_STEPS) {
    const idx = content.indexOf(step, lastIdx + 1);
    assert.ok(idx > lastIdx, `step "${step}" missing or out of order`);
    lastIdx = idx;
  }
});

test('every pipeline step file has a HALT terminator', async () => {
  const stepFiles = await import('node:fs/promises').then(fs => fs.readdir('shared/resources'));
  const pipelineSteps = stepFiles.filter(f => /^develop-pipeline-step-.*\.md$/.test(f));
  for (const file of pipelineSteps) {
    const content = await readFile(`shared/resources/${file}`, 'utf8');
    assert.match(content, /HALT|STOP/, `${file} missing HALT/STOP terminator`);
  }
});
```

**File: `evals/develop-task/protocol/step-contract.test.mjs`** — parse `develop-pipeline-resume-contract.md`; for each step, verify SKILL.md references the same input/output artefacts.

### Phase 5 — Step-isolation scenarios

**Template `scenario.json`** (per step):

```json
{
  "name": "develop-task-step-01-create-branch",
  "skill": "create-branch",
  "description": "create-branch invoked by develop-task with task.42 context",
  "prompt": "Create a feature branch for task.42.",
  "fixtures": {
    "git": {
      "fixtureFiles": {
        "docs/development/tasks/task.42.example/task.42.example.md": "..."
      },
      "branch": "develop"
    }
  },
  "assertions": [
    { "fn": "branchExists", "args": ["$SANDBOX_GIT", "^feature/task\\.42"] },
    { "fn": "answerQueueDrained" }
  ]
}
```

Runner extension: `scenario.fixtures.git` triggers `createSandbox()` before driver runs; sandbox path exposed as `$SANDBOX_GIT` in assertions.

**Each step gets one folder.** For `06-qa-fix`, add a second variant with assertions including `loopBoundedAt(events, 'qa-fix', 5)`.

### Phase 6 — Smoke + scripts + CI + docs

**File: `evals/develop-task/smoke/01-end-to-end-dry/scenario.json`**

```json
{
  "name": "develop-task-smoke-end-to-end-dry",
  "skill": "develop-task",
  "description": "Full pipeline against a sandbox repo. GH PR creation gated on GH_TOKEN.",
  "prompt": "Run /develop-task on $SANDBOX_GIT/docs/development/tasks/task.42.example/task.42.example.md",
  "fixtures": { "git": { "branch": "develop", "fixtureFiles": { /* full task fixture */ } } },
  "assertions": [
    { "fn": "pipelineStepsRan", "args": ["$EVENTS", ["create-branch","review-task","develop-loop","create-pr","qa-task","finalise","commit-changes"]] },
    { "fn": "branchExists", "args": ["$SANDBOX_GIT", "^feature/task\\.42"] },
    { "fn": "prCreated", "args": ["$GH_RECEIPT", { "base": "develop", "titlePattern": "task\\.42" }], "skipIfSkipped": "$GH_RECEIPT" },
    { "fn": "noLockFilesLeft", "args": ["$SANDBOX_GIT"] }
  ],
  "keepSandboxOnFailure": true
}
```

**`package.json` additions:**

```json
"eval:develop-task": "node evals/shared/runner.mjs --assertions evals/develop-task/assertions.mjs evals/develop-task/step-isolation/* && node --test evals/develop-task/protocol/*.test.mjs",
"eval:develop-task:smoke": "node evals/shared/runner.mjs --assertions evals/develop-task/assertions.mjs evals/develop-task/smoke/01-end-to-end-dry",
"eval:all": "npm run eval:create-task && npm run eval:create-story && npm run eval:develop-task"
```

**`.github/workflows/test.yml` additions:**

```yaml
  develop-task-evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run eval:develop-task

  develop-task-smoke:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run eval:develop-task:smoke
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.EVAL_GH_TOKEN }}
          GH_REPO: ${{ secrets.EVAL_GH_REPO }}
```

**`docs/evals.md`** — add recipes:

```markdown
### 11. "I want to test the develop-task pipeline structure"

`npm run eval:develop-task` — protocol + step-isolation, no creds needed.

### 12. "I want to run the develop-task pipeline end-to-end"

`npm run eval:develop-task:smoke` — needs ANTHROPIC_API_KEY. Optional: GH_TOKEN + GH_REPO for real PR creation.
```

## Key Patterns and References

- **Sandbox prefix:** `agent-skills-eval-` for easy `rm -rf /tmp/agent-skills-eval-*`.
- **Cleanup discipline:** every `createSandbox` / `createGhSandbox` cleanup runs in `finally` even on assertion failure.
- **Driver wrapping:** `wrapDriver` is order-preserving by construction (events pushed synchronously per tool-use callback).
- **Skill-local assertions:** `--assertions` flag pattern keeps `evals/shared/assertions.mjs` lean.
- **Replay fixtures for step-isolation:** each scenario's `replay/` folder contains the artefacts the wrapped Skill would have produced; the replay driver materializes them in the sandbox without any model call.

## Testing Approach

- **Per-phase verification:** `npm run test:node` after each phase (Phase 1: shared lib tests added, suite still green; Phase 2: gh-sandbox tests; etc).
- **Sabotage workflow** (manual, before merge):
  1. Reorder steps in `skills/develop-task/SKILL.md`
  2. Run `npm run eval:develop-task`
  3. Confirm `pipeline-shape.test.mjs` fails loudly
  4. Revert
- **Smoke run before merge:** at least one local `npm run eval:develop-task:smoke` with `ANTHROPIC_API_KEY` set, both with and without `GH_TOKEN`, to verify both paths.
