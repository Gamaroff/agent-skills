# Sprint Review Summary - The finalise 6c poll block guards its inputs

**Story/Task ID:** task.310
**Completed Date:** 2026-11-15
**Pull Request:** [#910](https://github.com/Gamaroff/agent-skills/pull/910)

---

## Summary

The first `/finalise` step 6c poll block now halts by name when `CI_HEAD_2` or `PR_NUMBER` is not bound, instead of running its comparison, head writer and poll launch on empty values.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The shipped guard line, run with `CI_HEAD_2` unbound, exits non-zero and names `CI_HEAD_2`.
- [x] Run with `PR_NUMBER` unbound, it exits non-zero and names `PR_NUMBER`.
- [x] Run with both bound, it exits 0.
- [x] The guard precedes `rm -f` in the block; deleting the guard turns the test red.
- [x] The later-turn reader is unchanged and its tests stay green.
- [x] `bundle:check`, `validate` and the fast gate are clean; `CHANGELOG.md` cites `(task 310)`.

### Key Features Implemented

- **Guard line**: one `${VAR:?HALT: …}` line at the top of the block, with a comment naming the inputs and where they are bound (`skills/finalise/SKILL.md`).
- **Behaviour test**: runs the shipped guard line under `bash -c` with each input unbound and both bound (`evals/shared/tests/finalise-publish-boundary.test.mjs`).
- **Order assertion**: the guard must come before the `rm -f`, the head writer and the poll launch.

---

## Testing & QA

- QA gate: PASS, 95/100 (one cycle). PR review: APPROVE.
- Changed test file: 49 pass, 0 fail. Fast gate: 8475 pass, 0 fail.
- Mutation proof: weakening the guard (`:?` to `:-`) turned two tests red.

## Security & Compliance

Not applicable: the change checks that two shell variables are bound. No data, credential or network surface.

## Known Limitations and Future Work

- Other `PR_NUMBER` reads in `skills/finalise/SKILL.md` (about lines 1338, 1360 and near 2668) are unguarded. Guard them the same way if a fresh-shell run of those blocks is plausible.
- `gh pr view ""` was measured only on a branch without an open PR.
