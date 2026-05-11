---
id: task.34.plan
title: "Implementation Plan: Build evals for develop-story pipeline"
type: plan
task-ref: task.34.develop-story-evals.md
---

# Implementation Plan: develop-story evals

> Requirements and success criteria: [task.34.develop-story-evals.md](task.34.develop-story-evals.md)

## Overview

Mirror task.33's structure for develop-story while adding story-specific assertions (epic branch rules, PR base targeting, resume rehydration). Reuses task.33's shared infra wholesale. The riskiest part is Phase 5's resume-mid-loop scenario, which requires a deterministic kill signal — design that mechanism carefully.

## Phase-by-Phase Implementation Guide

### Phase 1 — Story-specific assertions

**File: `evals/develop-story/assertions.mjs`**

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export function prTargetsEpicBranch(receipt, epicNum) {
  if (!receipt || receipt.skipped) return { ok: false, reason: receipt?.reason ?? 'no receipt' };
  const expected = new RegExp(`^feature/epic\\.${epicNum}\\.`);
  const actual = receipt.pr?.baseRefName;
  if (actual === 'develop') {
    return { ok: false, reason: `PR targets develop, expected epic branch matching ${expected}` };
  }
  return { ok: expected.test(actual), actual, expected: expected.toString() };
}

export async function epicBranchExists(sandbox, epicNum) {
  const branches = await sandbox.branchList();
  const re = new RegExp(`^feature/epic\\.${epicNum}\\.`);
  return { ok: branches.some(b => re.test(b)), branches };
}

export async function epicBranchBasedOn(sandbox, epicNum, expectedBase = 'develop') {
  const branches = await sandbox.branchList();
  const epicBranch = branches.find(b => new RegExp(`^feature/epic\\.${epicNum}\\.`).test(b));
  if (!epicBranch) return { ok: false, reason: 'epic branch not found' };
  const { stdout } = await sandbox.run('git', ['merge-base', epicBranch, expectedBase]);
  return { ok: stdout.trim().length > 0, mergeBase: stdout.trim() };
}

export function resumeRehydrated(events, { expectedStep, expectedIter }) {
  const resumeMarker = events.find(e => e.skill === 'resume-detector' || /resume/i.test(e.skill));
  if (!resumeMarker) return { ok: false, reason: 'no resume detection event' };
  const stepEvents = events.filter(e => e.skill === expectedStep);
  if (stepEvents.length < expectedIter) {
    return { ok: false, reason: `expected ${expectedStep} to reach iter ${expectedIter}, got ${stepEvents.length}` };
  }
  return { ok: true, iters: stepEvents.length };
}
```

**Tests: `evals/shared/tests/develop-story-assertions.test.mjs`** — happy + sabotage for each fn:
- `prTargetsEpicBranch`: PR base = develop → fails; PR base = `feature/epic.5.foo` → passes
- `epicBranchExists`: empty branch list → false; branch present → true
- `resumeRehydrated`: no resume event → false; resume + iters reach expected → true

### Phase 2 — Protocol checks

**File: `evals/develop-story/protocol/pipeline-shape.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SKILL_PATH = 'skills/develop-story/SKILL.md';
const EXPECTED_PHASES = [
  'Phase 0',
  'Phase 0d',  // epic branch creation
  'create-story-branch',
  'review-story',
  'develop-loop',
  'create-pr',
  'qa-story',
  'qa-fix',
  'finalise',
  'commit-changes',
];

test('SKILL.md lists all 9 phases including Phase 0d in order', async () => {
  const content = await readFile(SKILL_PATH, 'utf8');
  let lastIdx = -1;
  for (const phase of EXPECTED_PHASES) {
    const idx = content.indexOf(phase, lastIdx + 1);
    assert.ok(idx > lastIdx, `phase "${phase}" missing or out of order`);
    lastIdx = idx;
  }
});
```

**File: `evals/develop-story/protocol/epic-branch-rules.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Phase 0d documents base=develop and only-if-missing', async () => {
  const content = await readFile('skills/develop-story/SKILL.md', 'utf8');
  const phase0d = content.match(/Phase 0d[\s\S]+?(?=\n## |\n### Phase )/);
  assert.ok(phase0d, 'Phase 0d block not found');
  assert.match(phase0d[0], /base[: ]+develop/i, 'Phase 0d must specify base=develop');
  assert.match(phase0d[0], /only.if.missing|already.exists|skip/i, 'Phase 0d must specify only-if-missing semantics');
  assert.match(phase0d[0], /feature\/epic\.\{n\}\.\{name\}|feature\/epic\.\d+/, 'Phase 0d must specify naming pattern');
});

test('PR creation step targets epic branch not develop', async () => {
  const content = await readFile('skills/develop-story/SKILL.md', 'utf8');
  const prSection = content.match(/create.pr|create-pr[\s\S]+?(?=\n## |\n### )/i);
  assert.ok(prSection, 'PR creation section not found');
  assert.match(prSection[0], /--base.*epic|epic.branch|epic_branch/i, 'PR creation must target epic branch');
  assert.doesNotMatch(prSection[0], /--base develop\b/, 'PR creation must NOT hardcode --base develop');
});
```

### Phase 3 — Step-isolation 00-04

**`00-create-epic-branch/scenario.json` (variant 1: clean repo):**

```json
{
  "name": "develop-story-step-00-create-epic-branch-fresh",
  "skill": "create-branch",
  "description": "Phase 0d: epic branch created from develop on first story",
  "prompt": "Create the epic branch for epic.5",
  "fixtures": {
    "git": {
      "branch": "develop",
      "fixtureFiles": {
        "docs/development/epics/epic.5.example/epic.5.example.md": "..."
      }
    }
  },
  "assertions": [
    { "fn": "epicBranchExists", "args": ["$SANDBOX_GIT", 5] },
    { "fn": "epicBranchBasedOn", "args": ["$SANDBOX_GIT", 5, "develop"] }
  ]
}
```

**`00-create-epic-branch/scenario-already-exists.json` (variant 2):**

Same but the fixture pre-creates `feature/epic.5.example` branch. Assertions check no error, no duplicate branch.

**`01-create-story-branch/scenario.json`:**

```json
{
  "fixtures": { "git": { "branch": "feature/epic.5.example", ... } },
  "assertions": [
    { "fn": "branchExists", "args": ["$SANDBOX_GIT", "^feature/story\\.5\\.1"] },
    { "fn": "epicBranchBasedOn", "args": ["$SANDBOX_GIT", 5, "develop"] }
  ]
}
```

**`04-create-pr/scenario.json`** — the most important assertion:

```json
{
  "assertions": [
    { "fn": "prTargetsEpicBranch", "args": ["$GH_RECEIPT", 5] }
  ]
}
```

When `GH_TOKEN` unset, `gh-sandbox` returns a dry-run receipt with the intended `--base` arg captured. `prTargetsEpicBranch` reads that. Verify task.33's gh-sandbox supports this; if not, extend it (see Phase 5 risks).

### Phase 4 — Step-isolation 05-08

Standard step-isolation pattern from task.33 — one folder each, replay fixtures, assertions targeting the step's expected outputs.

`06-qa-fix` includes `loopBoundedAt(events, 'qa-fix', 5)` from task.33 assertions.

### Phase 5 — Smoke scenarios

**`01-end-to-end-dry/scenario.json`:**

```json
{
  "name": "develop-story-smoke-end-to-end-dry",
  "skill": "develop-story",
  "fixtures": { "git": { "branch": "develop", "fixtureFiles": { /* full story fixture */ } } },
  "assertions": [
    { "fn": "pipelineStepsRan", "args": ["$EVENTS", ["create-branch","review-story","develop-loop","create-pr","qa-story","finalise","commit-changes"]] },
    { "fn": "epicBranchExists", "args": ["$SANDBOX_GIT", 5] },
    { "fn": "branchExists", "args": ["$SANDBOX_GIT", "^feature/story\\.5\\.1"] },
    { "fn": "prTargetsEpicBranch", "args": ["$GH_RECEIPT", 5], "skipIfSkipped": "$GH_RECEIPT" }
  ],
  "keepSandboxOnFailure": true
}
```

**`02-resume-mid-loop/scenario.json` — design notes:**

The kill signal is the riskiest design choice. Options:

1. **Artefact-based kill (recommended):** runner watches the sandbox; when `task-state/qa-fix-iter-2-complete.marker` appears, send SIGINT to the driver process. Deterministic, no wallclock dependency.
2. **Event-based kill:** `pipeline-recorder.events` is observable; when `events` contains `{skill: 'qa-fix', status: 'completed'}` × 2, kill. Requires task.33's recorder to support an observer callback (extension).
3. **Answer-queue exhaustion:** scenario.json's `answers.jsonl` only contains enough answers to reach mid-qa-fix; driver halts on missing answer. Simplest but conflates intent (test of resume vs test of halt).

Choose option 1 first; fall back to option 2 if marker-based isn't reliable.

```json
{
  "name": "develop-story-smoke-resume-mid-loop",
  "skill": "develop-story",
  "stages": [
    {
      "phase": "initial-run",
      "killOn": { "type": "marker", "path": "$SANDBOX_GIT/.task-state/qa-fix-iter-2.marker" }
    },
    {
      "phase": "resume",
      "command": "/develop-story --resume $SANDBOX_GIT/docs/.../story.5.1.example.md"
    }
  ],
  "assertions": [
    { "fn": "resumeRehydrated", "args": ["$EVENTS_COMBINED", { "expectedStep": "qa-fix", "expectedIter": 3 }] },
    { "fn": "pipelineStepsRan", "args": ["$EVENTS_COMBINED", ["finalise","commit-changes"]] }
  ],
  "keepSandboxOnFailure": true
}
```

Runner extension: support `stages[]` for multi-invocation scenarios. Likely a small change to `evals/shared/runner.mjs`.

### Phase 6 — Scripts + CI + docs

**`package.json`:**

```json
"eval:develop-story": "node evals/shared/runner.mjs --assertions evals/develop-story/assertions.mjs evals/develop-story/step-isolation/* && node --test evals/develop-story/protocol/*.test.mjs",
"eval:develop-story:smoke": "node evals/shared/runner.mjs --assertions evals/develop-story/assertions.mjs evals/develop-story/smoke/*",
"eval:all": "npm run eval:create-task && npm run eval:create-story && npm run eval:develop-task && npm run eval:develop-story"
```

**`.github/workflows/test.yml`** — extend deterministic + smoke jobs added in task.33.

**`docs/evals.md`** — add recipes 13/14:

```markdown
### 13. "I want to test the develop-story pipeline structure"

`npm run eval:develop-story` — protocol + step-isolation, no creds needed. Catches PR-base regressions and epic-branch contract drift.

### 14. "I want to verify resume-mid-loop works"

`npm run eval:develop-story:smoke` — runs the resume scenario. Requires `ANTHROPIC_API_KEY`. The scenario kills the driver mid-qa-fix and re-invokes; passes only if state is restored, not duplicated.
```

**`evals/develop-story/README.md`** — document layers, especially the resume scenario's kill mechanism so future contributors understand the marker-based design.

## Key Patterns and References

- **PR base regression** is the single most likely real-world break for develop-story. `prTargetsEpicBranch` is the most valuable assertion in this task.
- **Resume scenario** is executable spec — its passing/failing should match the resume contract in `develop-pipeline-resume-contract.md`.
- **Mirror with task.33:** keep file structure parallel so `diff -r evals/develop-task evals/develop-story` is a useful cross-check tool.

## Testing Approach

- **Per-phase verification:** `npm run test:node` after Phase 1; `npm run eval:develop-story` (which runs protocol + step-isolation) after Phase 4.
- **Sabotage workflow** (manual, before merge):
  1. In `skills/develop-story/SKILL.md`, change PR creation step to `--base develop`
  2. Run `npm run eval:develop-story`
  3. Confirm `epic-branch-rules.test.mjs` fails loudly
  4. Revert
- **Resume scenario validation:** run smoke scenario locally at least 3 times to verify determinism before merge.
