# Sprint Review Summary - Pause commits restart CI and block the docs-only shortcut

**Story/Task ID:** task.303
**Completed Date:** 2026-11-12
**Pull Request:** [#889](https://github.com/Gamaroff/agent-skills/pull/889)

---

## Summary

A pipeline pause commit at step 8 no longer pushes, so it stops cancelling the previous head's CI run. Step 8's own commit pushes it.

## What Was Delivered

- [x] The PreCompact hook holds the pause-commit push at step 8 (`PUSH_HOLD_REASON=step8`).
- [x] Other steps still push (control scenario 17g).
- [x] The tree-equivalence engine is untouched; no extra API calls per poll.
- [x] CHANGELOG entry, docs and bundled copies updated.

## Technical Details

- `shared/resources/develop-pipeline-on-precompact.sh` — the step-8 hold and signal note
- `shared/resources/develop-pipeline-on-precompact.test.sh` — scenarios 17f and 17g
- `shared/resources/tests/step-8-completion-checklist.test.mjs` — fixture asserts the held push
- `shared/resources/develop-pipeline-hooks.md`, `develop-pipeline-pause.md`, `CHANGELOG.md`

**Root cause:** a superseded run's `ci-ok` aggregator exits 1 on a cancelled job, so the run reads FAILURE and blocks the docs-only shortcut. Option (b) removes the cause.

## Testing & Quality Assurance

- Hook suite: 38 passed, 0 failed. Full `ci:fast`: 8404 pass, 0 fail. Mutation-proved.
- QA gate PASS (95/100). PR review APPROVE. CI green on `c9992146c64d`.

## Known Limitations and Future Work

- The template `ci-ok` aggregator still exits 1 on a cancelled job (`if: !cancelled()` would fix it); a separate task.
- Independent review did not run for the QA diff review, the PR review or the DoD checks.
