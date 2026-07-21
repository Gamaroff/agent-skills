# Smoke Test: develop-story end-to-end dry run

Full happy-path pipeline run for `story.5.1.example` against a git-sandbox.

## What it tests

- Story branch (`feature/story.5.1.example`) created from `develop`
- All pipeline sub-skills execute in order
- PR targets `develop` (regression guard for `prTargetsBranch`)
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
Fail: if `prTargetsBranch` fails — PR was created targeting a branch other than `develop`.
