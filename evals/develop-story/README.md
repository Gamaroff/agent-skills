# develop-story Evals

Four-layer eval suite for the `develop-story` pipeline skill.

## Layers

| Layer | What it covers | Command |
|-------|---------------|---------|
| **L3 Protocol** | SKILL.md shape, 9 sub-skills in order, epic-branch rules in step files, HALT terminators | `npm run eval:develop-story` |
| **L4 Step-isolation** | Replay-mode fixtures for each pipeline step; epic-branch + PR-base assertions | `npm run eval:develop-story` |
| **L5 Smoke** | Full pipeline end-to-end with git-sandbox + optional gh-sandbox | `npm run eval:develop-story:smoke` |
| **L5 Resume** | Pipeline killed mid qa-fix loop, resumed; `resumeRehydrated` assertion | `npm run eval:develop-story:resume` |

## Key story-specific assertions

| Assertion | File | What it checks |
|-----------|------|----------------|
| `prTargetsEpicBranch(receiptPath, epicNum)` | `evals/shared/assertions.mjs` | PR base is `feature/epic.{n}.*` — fails if `develop` |
| `epicBranchExists(repoPath, epicNum)` | `evals/shared/assertions.mjs` | `feature/epic.{n}.*` branch in branches.json |
| `resumeRehydrated(eventsPath, opts)` | `evals/shared/assertions.mjs` | resume-detector event fired + step iteration count met |

Higher-level live wrappers in `evals/develop-story/assertions.mjs`:
- `epicBranchExistsInRepo(sandbox, epicNum)` — async git-sandbox version
- `epicBranchBasedOn(sandbox, epicNum, expectedBase)` — merge-base ancestor check
- `prTargetsEpicBranchFromReceipt(receipt, epicNum)` — takes receipt object directly
- `resumeRehydratedFromEvents(events, opts)` — takes RecordedEvent[] array directly

## Protocol tests

```
evals/develop-story/protocol/
  pipeline-shape.test.mjs         # SKILL.md: 9 sub-skills in order, step file refs, compression recovery, hands-free
  epic-branch-rules.test.mjs      # step-1 only-if-missing, base=develop, naming pattern; step-4 EPIC_BRANCH not hardcoded
  step-contract.test.mjs          # all step files exist with required keywords; SKILL.md step banners 1-8
  stall-and-cleanup-protocol.test.mjs # stall/finalise regressions; hook install contract; #2e static ${CLAUDE_PROJECT_DIR} guards
  install-hooks-behavior.test.mjs # runs the real installer: migration replaces legacy entry, cwd-independent command resolves from a subdir
```

## Step-isolation scenarios

Each scenario exercises a single pipeline step in replay mode (no model calls, no creds).

| Dir | Step | Key assertion |
|-----|------|---------------|
| `00-create-epic-branch-fresh/` | Step 1a — create epic branch (fresh) | `epicBranchExists($SANDBOX, 5)` |
| `00-create-epic-branch-exists/` | Step 1a — epic branch already exists | `epicBranchExists` (no-op, no error) |
| `01-create-story-branch/` | Step 1b — create story branch from epic | `branchExists(^feature/story.5.1)` |
| `02-review-story/` | Step 2 — review story | review report exists |
| `03-develop-loop/` | Step 3 — develop | story status = ready-for-review |
| `04-create-pr/` | Step 4 — create PR | **`prTargetsEpicBranch`** (regression guard) |
| `05-qa-story/` | Step 5 — qa-story | gate file PASS |
| `06-qa-fix/` | Step 6 — qa-fix loop | `loopBoundedAt(5)` |
| `07-finalise/` | Step 7 — finalise | DoD file + story accepted |
| `08-commit-changes/` | Step 8 — commit | `noLockFilesLeft` |

Story fixture: `story.5.1.example` at `docs/prd/domain/feature/epics/epic.5.example/stories/story.5.1.example/`.
Epic: `epic.5.example`. Branch: `feature/epic.5.example`.

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
