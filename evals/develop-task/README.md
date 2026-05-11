# evals/develop-task — Eval Suite for the develop-task Skill

Three-layer eval suite for the `develop-task` pipeline orchestrator.

## Structure

```
evals/develop-task/
├── assertions.mjs          # Higher-level wrappers over evals/shared/assertions.mjs
├── protocol/               # L3: pure file-parsing tests (no model, no git)
│   ├── pipeline-shape.test.mjs   # 8 steps in order, step file refs, hands-free guarantee
│   └── step-contract.test.mjs    # Step files have required keywords; resume contract exists
├── step-isolation/         # L4: one scenario per pipeline step (replay mode)
│   ├── 01-create-branch/
│   ├── 02-review-task/
│   ├── 03-develop/
│   ├── 04-create-pr/
│   ├── 05-qa-task/
│   ├── 06-qa-fix-loop/
│   ├── 07-finalise/
│   └── 08-commit-changes/
└── smoke/                  # L5: full pipeline live run (requires ANTHROPIC_API_KEY)
    └── 01-end-to-end-dry/
```

## Running

```bash
# All develop-task evals (protocol + step-isolation, no creds):
npm run eval:develop-task

# Smoke test (needs ANTHROPIC_API_KEY):
ANTHROPIC_API_KEY=sk-ant-... npm run eval:develop-task:smoke

# Smoke test with real GH PR:
ANTHROPIC_API_KEY=sk-ant-... GH_TOKEN=ghp_... GH_REPO=your-handle/eval-sandbox npm run eval:develop-task:smoke

# Single step-isolation scenario:
node evals/shared/runner.mjs evals/develop-task/step-isolation/01-create-branch

# Single protocol test file:
node --test evals/develop-task/protocol/pipeline-shape.test.mjs
```

## Layers

### L3 Protocol (`protocol/`)

Pure static analysis of SKILL.md and step resource files. No model calls, no git ops.

| Test file | What it checks |
|---|---|
| `pipeline-shape.test.mjs` | SKILL.md exists; 8 steps defined in order; step file refs resolve; context compression recovery section present; pipeline lock referenced; hands-free guarantee; step files 1–7 have a HALT terminator |
| `step-contract.test.mjs` | Step files exist and have required keywords; SKILL.md references step banners 1–8; autonomous-defaults table referenced; resume contract file exists with per-step content |

### L4 Step-isolation (`step-isolation/`)

One replay scenario per pipeline step. Each scenario copies fixture artefacts into a tmpdir sandbox and runs structural assertions. Deterministic — no model calls.

| Scenario | Asserts |
|---|---|
| `01-create-branch` | Feature branch exists (`branchExists`), pipeline lock written |
| `02-review-task` | Review report file present |
| `03-develop` | Task status advanced to `ready-for-review` |
| `04-create-pr` | PR created with correct base (`prCreated`) |
| `05-qa-task` | QA report + gate file present, gate status `PASS` or `CONCERNS` |
| `06-qa-fix-loop` | qa-fix invoked ≤5 times (`loopBoundedAt`) |
| `07-finalise` | DoD file present, task status `accepted` |
| `08-commit-changes` | No lock files remaining (`noLockFilesLeft`), implementation report present |

Each scenario dir contains:

- `scenario.json` — name, skill, description, prompt, assertions
- `answers.jsonl` — `{ matches, answer }` pairs for interactive prompts
- `env.json` — env vars injected for the run
- `replay/` — fixture tree (files the agent would have produced)

### L5 Smoke (`smoke/`)

Full end-to-end pipeline run against a real sandboxed git repo, using a live model.

- `01-end-to-end-dry` — exercises all 8 steps, verifies branch/PR/lock/events
- `GH_TOKEN` absent → `prCreated` assertion skipped (not failed)
- `KEEP_SANDBOX=1` baked in — sandbox preserved on failure for inspection

See [`smoke/01-end-to-end-dry/README.md`](smoke/01-end-to-end-dry/README.md) for failure investigation and cleanup instructions.

## Adding a scenario

1. Create `step-isolation/<name>/` with `scenario.json`, `answers.jsonl`, `env.json`, `replay/`
2. Use assertion fns from `evals/shared/assertions.mjs` — `pipelineStepsRan`, `branchExists`, `prCreated`, `loopBoundedAt`, `noLockFilesLeft` are already wired into the runner
3. Populate `replay/` with the minimal fixture files needed for assertions to pass
4. Run `node evals/shared/runner.mjs evals/develop-task/step-isolation/<name>` to verify

## Assertion reference

New assertion fns added for this skill (registered in `evals/shared/runner.mjs`):

| fn | Args | What it checks |
|---|---|---|
| `branchExists` | `repoPath, namePattern` | Branch matching regex exists (reads `.eval/branches.json` in replay; runs `git branch` live) |
| `pipelineStepsRan` | `eventsPath, expectedSteps[]` | All expected step names appear in order in `.eval/pipeline-events.json` |
| `loopBoundedAt` | `eventsPath, skill, maxIter` | Skill invoked ≤ `maxIter` times in events file |
| `prCreated` | `receiptPath, { base }` | Receipt exists; skipped receipts pass; live receipt has correct `baseRefName` |
| `noLockFilesLeft` | `dirPath` | No `*.lock` files anywhere under `dirPath` |
