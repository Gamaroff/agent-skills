# develop-story Evals

Four-layer eval suite for the `develop-story` pipeline skill.

## Layers

| Layer                 | What it covers                                                                                      | Command                             |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **L3 Protocol**       | SKILL.md shape, sub-skills in order, flat develop-branch-flow rules in step files, HALT terminators | `npm run eval:develop-story`        |
| **L4 Step-isolation** | Replay-mode fixtures for each pipeline step; branch + PR-base assertions                            | `npm run eval:develop-story`        |
| **L5 Smoke**          | Full pipeline end-to-end with git-sandbox + optional gh-sandbox                                     | `npm run eval:develop-story:smoke`  |
| **L5 Resume**         | Pipeline killed mid qa-fix loop, resumed; `resumeRehydrated` assertion                              | `npm run eval:develop-story:resume` |

## Key story-specific assertions

| Assertion                                    | File                          | What it checks                                         |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `prTargetsBranch(receiptPath, expectedBase)` | `evals/shared/assertions.mjs` | PR base equals `expectedBase` (default `develop`)      |
| `resumeRehydrated(eventsPath, opts)`         | `evals/shared/assertions.mjs` | resume-detector event fired + step iteration count met |

Higher-level live wrappers in `evals/develop-story/assertions.mjs`:

- `prTargetsBranchFromReceipt(receipt, expectedBase)` — takes receipt object directly
- `resumeRehydratedFromEvents(events, opts)` — takes RecordedEvent[] array directly

## Protocol tests

```
evals/develop-story/protocol/
  pipeline-shape.test.mjs         # SKILL.md: sub-skills in order, step file refs, compression recovery, hands-free
  develop-branch-flow-rules.test.mjs # step-1 creates story branch from develop (no epic branch); step-4 PR base defaults to develop
  step-contract.test.mjs          # all step files exist with required keywords; SKILL.md step banners
  stall-and-cleanup-protocol.test.mjs # stall/finalise regressions; hook install contract; #2e static ${CLAUDE_PROJECT_DIR} guards
  install-hooks-behavior.test.mjs # runs the real installer: migration replaces legacy entry, cwd-independent command resolves from a subdir
```

## Step-isolation scenarios

Each scenario exercises a single pipeline step in replay mode (no model calls, no creds).

| Dir                       | Step                         | Key assertion                            |
| ------------------------- | ---------------------------- | ---------------------------------------- |
| `01-create-story-branch/` | Step 1 — create story branch | `branchExists(^feature/story.5.1)`       |
| `02-review-story/`        | Step 2 — review story        | review report exists                     |
| `03-develop-loop/`        | Step 3 — develop             | story status = ready-for-review          |
| `04-create-pr/`           | Step 4 — create PR           | **`prTargetsBranch`** (regression guard) |
| `05-qa-story/`            | Step 5 — qa-story            | gate file PASS                           |
| `06-qa-fix/`              | Step 6 — qa-fix loop         | `loopBoundedAt(5)`                       |
| `07-finalise/`            | Step 7 — finalise            | DoD file + story accepted                |
| `08-commit-changes/`      | Step 8 — commit              | `noLockFilesLeft`                        |

Story fixture: `story.5.1.example` at `docs/prd/domain/feature/epics/epic.5.example/stories/story.5.1.example/`.
Story branch `feature/story.5.1.example` is cut from `develop` and PRs back to `develop`.

## Resume scenario

The `02-resume-mid-loop` smoke test requires:

1. `EVAL_MODE=1` — makes qa-fix emit `.task-state/qa-fix-iter-{N}.marker` files (production no-op when unset)
2. A driver that supports `runInterruptible(ctx, stage)` — sends SIGINT when the marker file appears
3. `ANTHROPIC_API_KEY` for both stages

On kill, the pipeline is interrupted mid qa-fix cycle. Stage 2 resumes via the pipeline lock file. `resumeRehydrated` asserts:

- A `resume-detector` event was emitted in stage 2
- The `qa-fix` step reached at least iter 2 (proving resume restored loop state)

**Passing**: `resumeRehydrated` green, `noLockFilesLeft` green after stage 2.  
**Failing**: If `resumeRehydrated` fails with `"no resume detection"` — resume-detector sub-skill did not fire on re-entry.

## Adding a scenario

1. `mkdir evals/develop-story/step-isolation/<name>`
2. Write `scenario.json`, `env.json`, `answers.jsonl`, `replay/` fixtures
3. Run `node evals/shared/runner.mjs evals/develop-story/step-isolation/<name>` to verify locally

Protocol test additions: add a `*.test.mjs` to `evals/develop-story/protocol/` — picked up automatically by `npm run eval:develop-story`.
