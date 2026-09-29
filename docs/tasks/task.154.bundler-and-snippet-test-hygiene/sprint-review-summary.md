# Sprint Review Summary - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Story/Task ID:** task.154
**Epic:** — (standalone task)
**Completed Date:** 2026-09-29
**Completed By:** Claude (autonomous `/develop-next` → `/develop-task` run)
**Pull Request:** [#513](https://github.com/Gamaroff/agent-skills/pull/513)

## Summary

Two local blind spots in the repository's own tooling are closed. The bundler printed a
`shared/resources/<name> not found` warning on every bundle and pre-commit run, with no file named.
It now names the citing file and line, and the cause is removed. Snippet tests that reach
`.agents/skills/…` passed locally only through a gitignored symlink CI does not have. The
consumer-shaped test root is now one helper, and a clean-checkout runner lets the release gate run
the suite the way CI does.

## What Was Delivered

### Acceptance Criteria Met

- ✅ `npm run bundle` prints no `not found` line; the live `--check` is asserted to carry none, over a non-vacuous scan count
- ✅ A missing citation prints one line naming `file:line`, once per `(name, origin)`
- ✅ `makeConsumerRoot()` is the one consumer-root builder; two test files migrated
- ✅ `npm run test:clean-checkout` fails where only the gitignored symlink made a test pass
- ✅ `scripts/release.sh` gates on it, with the runner's test hook cleared (fixture-tested)
- ✅ Each new test file fails its run at 10 s or more
- ✅ The create-skill rule, traps.md and the release runbook describe it
- ⏳ Observations #149 and #151 → `actioned`: due at merge

### Key Features Implemented

- `scripts/test-clean-checkout.sh`: a `git clone --local --shared` of HEAD in a `mktemp -d` directory of its own, which is the only thing it deletes
- `scripts/lib/clean-checkout-base.mjs`: the base decision, one export for the runner and the security probe
- `evals/shared/lib/consumer-root.mjs`: `makeConsumerRoot(repoRoot, prefix)`

## Technical Details

### Files Modified/Created

- `skills/create-skill/scripts/bundle_skill.py`: origin-carrying discovery, the attributed warning, the `N skill(s) checked, U unresolved` line, and a one-pass line-aware collector (`--check` 5.8 s → 4.6 s)
- `scripts/{test-clean-checkout.sh, lib/clean-checkout-base.mjs, release.sh}`, `package.json`, `.gitignore`
- `evals/shared/lib/consumer-root.mjs`; migrated `finalise-bug-mode.test.mjs` and `optional-file-lookups.test.mjs`
- Tests: `tests/bundle-missing-source.test.js`, `tests/test-clean-checkout.test.js`, `evals/shared/tests/consumer-root.test.mjs`
- Docs: `shared/resources/observation-log-contract.md` (and its bundled copy), `skills/create-skill/SKILL.md`, `docs/contributing/traps.md`, `docs/runbooks/release-and-install.md`, `CHANGELOG.md`

### Architecture/Design Decisions

- Ownership by construction: each runner invocation owns a `mktemp` directory. Three QA cycles of lock and marker findings on a named location ended when the location stopped being shared (qa-fix Step 2.6).
- The base decision is an importable export, so the probe engine can execute it, not only tests.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- 3 new test files and 22 tests, plus migrations of two existing files. Every guard was mutation-proved: 6 in the plan, M-A..M-H after DoD 1.
- `npm run test:clean-checkout` on `78ab4858`: 4424 tests, 0 fail. CI is 5/5 green.

### Code Review

- 5 QA cycles (FAIL 70 → CONCERNS 80 ×3 → PASS 100); 8 bugs filed and closed.
- 5c `/review-pr`: APPROVE.
- DoD run 1 found 3 gaps (an unprobeable boundary, an untested release gate, an unasserted time budget). They were closed in `78ab4858`, and DoD run 2 accepted.

## Security & Compliance

### Security Review

`resolveBase` was probed through its export with a task-specific cases file: 17 executed (13
hostile, 4 legitimate), 0 reproduced, 0 overblocked. With the ephemeral check bypassed, the same
probe reproduces 5 cases.

### Compliance Review

Not applicable. This is internal tooling.

## Documentation

### Updated Documentation

- CHANGELOG `[Unreleased]`: one Changed and one Fixed entry
- create-skill "Testing such a block", traps.md, and the release runbook pre-flight

### Documentation Links

- Task: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
- DoD: [task.154.dod.2.bundler-and-snippet-test-hygiene.md](./task.154.dod.2.bundler-and-snippet-test-hygiene.md) (run 1: [task.154.dod.1.bundler-and-snippet-test-hygiene.md](./task.154.dod.1.bundler-and-snippet-test-hygiene.md))

## Demo Notes

### How to Verify

```bash
command node --test tests/bundle-missing-source.test.js tests/test-clean-checkout.test.js \
  evals/shared/tests/consumer-root.test.mjs
npm run test:clean-checkout
```

### Screenshots/Visuals

Not applicable.

## Impact & Value

### User Impact

Maintainers get a warning they can act on, and a local release gate that fails where CI would.

### Technical Impact

The class of test that passes only through a developer's symlink is now caught before a release,
not after a push.

## Known Limitations & Future Work

### Current Limitations

- `observation-log.js` does not list `/private/var/tmp`; the runner checks both spellings itself.
- The probe cases carry absolute paths on the machine that wrote them.
- `fast-gate-precondition.test.mjs` fails under an inherited `npm_config_loglevel=silent` (pre-existing; found here).

### Suggested Follow-Up Stories

- Add `/private/var/tmp` to the engine's ephemeral patterns
- Make `fast-gate-precondition.test.mjs` independent of npm's log level
- review-pr CR-1 (the clone's `origin/*` refs point at local branches) and the gate-5 advisory cleanups

## Metrics _(if applicable)_

- QA cycles: 5. DoD runs: 2.

**Status:** ✅ **ACCEPTED**
