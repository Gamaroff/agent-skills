# Smoke Scenario: develop-next select-and-dispatch

End-to-end smoke for the `develop-next` orchestrator against a sandbox repo whose roadmap has exactly one eligible item (task 42.1) followed by a `manual` stop row.

## What it tests

| Check | How |
|-------|-----|
| The eligible item was selected and its pipeline dispatched | `pipelineStepsRan` sees a `develop-task` Skill event |
| The roadmap row was ticked after the merge | `fileMatches` on `- [x] **42.1**` |
| Run-state file cleaned up in Step 5 | `fileAbsent` on `.claude/state/develop-next.state.json` |
| No pipeline locks left behind | `noLockFilesLeft` |
| The run stops at 42.9 (`manual`) instead of continuing | implicit — 42.9 stays unticked (covered by step-isolation 02 in replay) |

## Running locally

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval:develop-next:smoke
```

The selection layer itself is fully covered hermetically by `evals/develop-next/unit/` — this smoke exists to exercise the orchestration glue (dispatch directive, state file lifecycle, tick) with a real agent.

## Failure investigation

Run with `KEEP_SANDBOX=1` — on failure the sandbox tmpdir is not deleted; inspect the roadmap, `.claude/state/`, and `.eval/pipeline-events.json` there.
