# Bug Report: Task 241 - The 6d test helper leaks a temp directory per call, tripping CI's tmp-leak ratchet

**Task**: [Link](./task.241.finalise-changelog-checks-opt-in.md)
**Bug ID**: TASK-241-BUG-4
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2, CI read on `f530a532`)
**Date Found**: 2026-10-28

## Description

CI's `test` job fails on the PR head `f530a532`, and the same job is green on develop (run
40664077358). Every test passes: the node runner reports `# tests 7086 / # fail 0`. The failure comes
from `scripts/test-tmpdir.mjs`'s leak ratchet:

```
tmp-leak: prefix "finalise-6d" over its ratchet (20 > 10)
```

`runSixD()` in `evals/shared/tests/finalise-publish-boundary.test.mjs:573` creates a
`finalise-6d-*` directory with `mkdtempSync` and never removes it. Develop has 5 call sites, run
under bash and zsh, which is the ratchet's 10. This branch adds the not-opted-in, control and
unrecognised-value cases, so CI's two shells exceed the limit.

Locally the job is green because this host has no zsh. Only the bash arm runs, and the count stays
within the ratchet. That is the platform-variance case the ratchet's own header describes.

## Steps to Reproduce

```bash
gh run view 40673829397 --log-failed | grep tmp-leak
```

## Expected Behavior

The 6d tests leave nothing in TMPDIR, and CI's `test` job is green on the PR head.

## Actual Behavior

The `test` job fails with `Process completed with exit code 1` after a fully green test run.

## Impact

The PR cannot merge: CI must be green at `/finalise`.

## Recommendation

Remove the temp directory in `runSixD` (try/finally `rmSync(dir, {recursive: true, force: true})`).
Then delete the now-healed `finalise-6d` entry from `tests/tmp-leak-ratchet.json`, as the ratchet's
"healed" notice asks, so the fix is held. Do not raise the ratchet's count.

## Developer Fix Cycle

### Iteration 1 (2026-10-28, qa-fix cycle 2)

**Fix:** The 6d test helper (now `runInConsumer`, shared by `runSixD` and the new Step 3b case)
creates its temp dir inside `try`, and the `finally` block removes it on every path. The healed
`finalise-6d` entry was deleted from `tests/tmp-leak-ratchet.json`, not raised, so a future leak
under this prefix fails as `new prefix`.

**Mutation proof:** with the `rmSync` removed, `node scripts/test-tmpdir.mjs -- node --test
evals/shared/tests/finalise-publish-boundary.test.mjs` exits 1 with `tmp-leak: new prefix
"finalise-6d" (14 entries)` and 0 failing tests. Restored, it exits 0 with `ratchet ok`.

**Status:** Ready for QA. CI on the pushed head is the verification: the bash and zsh arms both run
there.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-28 | New | qa-task | Found in QA cycle 2 (`task.241.qa.2.finalise-changelog-checks-opt-in.md`) |
| 2026-10-28 | Ready for QA | qa-fix | Temp dir removed in `finally`; ratchet entry deleted; mutation-proven |
