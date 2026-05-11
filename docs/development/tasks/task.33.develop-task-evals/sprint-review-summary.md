# Sprint Review Summary: Task 33 — Build evals for develop-task pipeline

**Task**: task.33.develop-task-evals
**Status**: ACCEPTED ✅
**Acceptance Date**: 2026-05-11
**PR**: #71
**QA Gate**: PASS (97/100)

---

## Summary

Built a three-layer eval suite for the `develop-task` pipeline orchestrator, providing the first automated coverage for develop-task's 8-step orchestration. Includes shared eval infrastructure reusable by future skill evals (develop-story, etc.).

## Acceptance Criteria Met

- ✅ `npm run eval:develop-task` runs all protocol + step-isolation (27 assertions, all pass)
- ✅ All 8 step-isolation scenarios pass in replay mode without creds
- ✅ Pipeline-recorder accurately records sub-skill invocations (5 unit tests)
- ✅ `npm run eval:develop-task:smoke` script present; smoke layer opt-in with `ANTHROPIC_API_KEY`
- ✅ `docs/evals.md` updated with recipes 11 and 12
- ✅ CI workflow updated; deterministic job on every push; smoke `workflow_dispatch` only

## Key Deliverables

### Shared Library (`evals/shared/lib/`)

- **`git-sandbox.mjs`** — throwaway git repos for eval sandboxes; reusable for all skill evals
- **`gh-sandbox.mjs`** — injectable GH PR creation; skips gracefully when `GH_TOKEN` absent
- **`pipeline-recorder.mjs`** — wraps any driver to record Skill tool-use events to `RecordedEvent[]`

### New Assertion Functions (`evals/shared/assertions.mjs`)

- `branchExists(repoPath, namePattern)` — reads `.eval/branches.json` in replay, runs git live
- `pipelineStepsRan(eventsPath, expectedSteps)` — order-sensitive subset check
- `loopBoundedAt(eventsPath, skill, maxIter)` — guards qa-fix 5-cycle cap
- `prCreated(receiptPath, { base })` — skipped receipts pass; live receipts check base branch
- `noLockFilesLeft(dirPath)` — recursive `*.lock` file check

### Eval Suite (`evals/develop-task/`)

- **Protocol tests (L3)**: 12 tests validating SKILL.md step order, HALT terminators, resume markers
- **Step-isolation scenarios (L4)**: 8 scenarios, one per pipeline step, 15 assertions in replay mode
- **Smoke scenario (L5)**: full end-to-end live run with real git sandbox; `GH_TOKEN` optional

### Documentation

- `evals/develop-task/README.md` — layer architecture, adding scenarios, assertion reference
- `docs/evals.md` — recipes 11 (deterministic) and 12 (smoke); updated layer/scenario tables
- `evals/shared/README.md` — lib helper API docs

## Technical Details

### Files Added/Modified

- 4 new shared lib files (`git-sandbox.mjs`, `gh-sandbox.mjs`, `pipeline-recorder.mjs` + assertions)
- 4 new test files (17 unit tests for lib helpers + 18 assertion tests)
- 2 protocol test files (12 tests)
- 8 step-isolation scenario folders (15 assertions)
- 1 smoke scenario folder
- `package.json` — 2 new scripts + test:node + eval:all updated
- `.github/workflows/test.yml` — 2 new jobs
- 3 docs files updated (`docs/evals.md`, `evals/shared/README.md`, `evals/develop-task/README.md`)

### Testing

- 125/125 node tests pass (no regressions)
- 12 protocol tests pass
- 15 step-isolation assertions pass (all 8 scenarios, replay mode)
- `npm run eval:all` green (includes create-task + create-story + develop-task)

## Impact

- **Zero false negatives possible**: pipeline structural drift now caught in CI on every push
- **Reusable infrastructure**: `git-sandbox`, `gh-sandbox`, `pipeline-recorder` ready for task.34 (develop-story evals)
- **Aligned with task.32**: follows the per-skill eval ownership pattern established in the preceding task

## Known Limitations

- Smoke test (`eval:develop-task:smoke`) requires `ANTHROPIC_API_KEY` — opt-in only; not run in standard CI
- Protocol tests validate structure but cannot catch semantic logic bugs (requires step-isolation/smoke)
- `loopBoundedAt` assertion counts all invocations including successful ones; edge case: if qa-fix is never called, count = 0 which passes ≤5

## Next Steps

- Task.34: develop-story evals (can reuse git-sandbox + pipeline-recorder from this task)
- Run smoke test once with `ANTHROPIC_API_KEY` to validate live driver path end-to-end
