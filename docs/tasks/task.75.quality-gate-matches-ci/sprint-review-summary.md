# Sprint Review Summary — Task 75

**Task:** Make the pipeline quality gate run what CI runs
**Status:** ✅ Accepted · 2026-09-01
**PR:** [#291](https://github.com/Gamaroff/agent-skills/pull/291)

---

## Summary

CI ran three commands; the pipeline's quality gate ran one. A branch could pass every local gate the
pipeline had and still go red — and on task 67 it did, with `prettier --check` failing *after*
`/finalise` had already accepted the task. This gives both sides one definition of green, tiers it so
the fast loop stays fast, and holds the alignment with a contract test.

## What shipped

- **`npm run ci`** (`ci:fast && eval:all`) and **`npm run ci:fast`** (`format:check && test`) — one
  definition of green, called by both CI and the pipeline
- **`develop.fastGateCommand`** (new key, default `npm run ci:fast`) — what the develop loop and each
  qa-fix cycle run. A config key rather than a literal, because these step docs ship verbatim into
  consumer repos with no `ci:fast` script of their own
- **`developNext.qualityGateCommand`** default moved `npm test` → `npm run ci` — the merge gate now
  matches CI exactly
- **`evals/shared/tests/ci-gate-parity.test.mjs`** — 10 tests asserting workflow↔composite set
  equality in *both* directions, the tiering invariant, both orchestrators' documented defaults, and
  the step docs naming the config key

## Testing & QA

| | |
| --- | --- |
| Final gate | ✅ PASS, 100/100 |
| QA cycles | 3 (CONCERNS 90 → CONCERNS 80 → PASS 100) |
| Findings | 5 raised, 5 closed |
| Mutation proofs | 10 |
| Full suite | 2094 pass / 0 fail |
| CI | ✅ 4/4 jobs green |

## Impact

A local green now predicts a CI green, which is the property the gate was always supposed to have.
One place to change: a new CI step is picked up by the pipeline automatically, and the parity test
fails if it is not.

**Observable behaviour change:** a consumer that has not set `qualityGateCommand` inherits a slower,
stricter gate. Intended — the old default was quietly weaker than the CI it predicted — and reversible
in one line. Recorded in `CHANGELOG.md` under **Changed**.

## Demo notes

The change was tested by being used. `npm run ci` went red on its first run, on `prettier --check`
against this task's own new test file — the exact task-67 shape, now caught before push instead of in
CI afterwards.

## Known limitations / follow-up

1. **`qa-execute-snippets.mjs` silently no-ops** through the symlinked path its own docs prescribe
   (exit 0, zero output). `select-next.mjs` already carries the fix. Warrants a bug report.
2. **`access-config-parity` is flaky under load** (2 of 3 full runs) and this task puts it on the
   mandatory merge path.
3. **`develop-bug`'s per-cycle fix loop has no fast gate** — its develop loop does.
