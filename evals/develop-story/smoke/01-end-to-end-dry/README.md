# Smoke Test: develop-story end-to-end dry run

Full happy-path pipeline run for `story.5.1.example` against a git-sandbox.

## What it tests

- Epic branch (`feature/epic.5.example`) created from `develop`
- Story branch (`feature/story.5.1.example`) created from epic branch
- All 8 pipeline sub-skills execute in order
- PR targets epic branch, NOT `develop` (regression guard for `prTargetsEpicBranch`)
- Pipeline lock removed at completion

## Requirements

- `GH_TOKEN` set for gh-sandbox PR creation (optional; skips step 4 assertion if absent)
- Git sandbox initialized by runner

## Running

```bash
npm run eval:develop-story:smoke
```

## Pass/Fail

Pass: all assertions green, `noLockFilesLeft` confirms clean exit.
Fail: if `prTargetsEpicBranch` fails — PR was created targeting `develop` instead of `feature/epic.5.example`.
