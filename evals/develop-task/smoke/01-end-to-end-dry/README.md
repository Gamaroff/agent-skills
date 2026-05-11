# Smoke Scenario: develop-task end-to-end dry run

Full pipeline smoke test for the `develop-task` skill. Exercises all 8 steps against a sandboxed git repo.

## What it tests

| Check | How |
|-------|-----|
| All 8 steps ran in order | `pipelineStepsRan` assertion on `.eval/pipeline-events.json` |
| Feature branch created | `branchExists` assertion |
| Lock file cleaned up | `noLockFilesLeft` assertion |
| PR created on correct base | `prCreated` assertion (skipped if no `GH_TOKEN`) |

## Running locally

```bash
# Minimum — dry run without GH PR creation:
ANTHROPIC_API_KEY=sk-ant-... npm run eval:develop-task:smoke

# Full — with real GH PR (created + cleaned up):
ANTHROPIC_API_KEY=sk-ant-... GH_TOKEN=ghp_... GH_REPO=your-handle/eval-sandbox npm run eval:develop-task:smoke
```

When `GH_TOKEN` is absent, the `prCreated` assertion is a no-op (skipped, not failed). The pipeline still exercises git ops and all 7 other steps.

## Failure investigation

The scenario uses `KEEP_SANDBOX=1` — on failure the sandbox tmpdir is **not** deleted. The runner prints the path to stderr. Navigate there and run `git log --oneline` to inspect what the pipeline actually produced.

```bash
cd /tmp/eval-develop-task-smoke-<id>
git log --oneline
ls docs/tasks/
```

Clean up manually when done:

```bash
rm -rf /tmp/agent-skills-eval-*
```

## Passing criteria

- Exit 0
- All 4 assertions pass (or 3 if `GH_TOKEN` absent)
- Sandbox tmpdir cleaned up (unless `KEEP_SANDBOX=1`)
- CI: runs as `workflow_dispatch` only (requires `ANTHROPIC_API_KEY` secret)
