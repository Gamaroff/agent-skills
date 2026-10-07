# Sprint Review Summary - Fast-gate precondition: no false HALT under npm loglevel=silent

**Story/Task ID:** task.167
**Completed Date:** 2026-10-03
**Completed By:** Claude (develop-next → develop-task pipeline)
**Pull Request:** [#559](https://github.com/Gamaroff/agent-skills/pull/559)

---

## Summary

Before the first develop iteration, the develop loop checks that the configured fast gate names a script the project defines. It read that from the listing `npm run` prints. npm treats the listing as log output, so a project whose `.npmrc` sets `loglevel=silent`, or any run started through `npm run -s`, was halted for a script it does define. The listing now passes `--loglevel=notice`, which overrides both sources.

## What Was Delivered

### Acceptance Criteria Met

- [x] Silent env, script defined: not halted (bash and zsh)
- [x] Silent env, script missing: still halted, naming `develop.fastGateCommand`
- [x] Silent project `.npmrc`, script defined: not halted
- [x] Existing precondition cases still pass; no new timeout literal
- [x] Removed-flag mutation observed red and quoted
- [x] `ci:fast`, `bundle:check`, `lint:shell` and `validate:all` clean; CHANGELOG cites task 167

### Key Features Implemented

- `npm run --loglevel=notice` in the shared precondition block, regenerated into `develop-task`, `develop-story` and `develop-bug`
- Three silent-environment cases per shell in `evals/shared/tests/fast-gate-precondition.test.mjs`
- `tests/executable-instructions.test.js` reads past npm flags after `npm run` (`npmRunScript`), so a flag is not mistaken for a script name

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-step-3-develop-loop.md`, plus 3 bundled copies
- `evals/shared/tests/fast-gate-precondition.test.mjs`
- `tests/executable-instructions.test.js`
- `CHANGELOG.md`

### Architecture/Design Decisions

- A command-line flag rather than `npm pkg get`: a command-line `--loglevel` overrides both the env var and `.npmrc`, and the change stays one token.
- The repository's npm-script population test was fixed in the instrument (skip flags), not by rewording the prose. This is the same reasoning as its existing fd-redirect exclusion.

### Dependencies

None.

## Testing & Quality Assurance

### Test Coverage

- 18/18 precondition cases (bash and zsh), and 18/18 again under an inherited `npm_config_loglevel=silent`
- `ci:fast`: 5201 pass, 0 fail
- Both behaviour changes mutation-proven against committed tests

### Code Review

- QA gate 1: PASS 100/100. Step 5c `/review-pr`: APPROVE (one low cleanup, carried as future work)

## Security & Compliance

### Security Review

PASS. The precondition is a boundary, and the probe engine executed 13 candidates through a wrapper that runs the shipped block, with 0 reproduced (verdict `engages`).

### Compliance Review

Not applicable (developer tooling).

## Documentation

### Updated Documentation

- CHANGELOG `[Unreleased]` › Fixed
- The precondition block's comment now says why the flag is there

### Documentation Links

- Task: [task.167.fast-gate-precondition-npm-loglevel.md](./task.167.fast-gate-precondition-npm-loglevel.md)
- DoD: [task.167.dod.1.fast-gate-precondition-npm-loglevel.md](./task.167.dod.1.fast-gate-precondition-npm-loglevel.md)

## Demo Notes

### How to Verify

```bash
npm_config_loglevel=silent command node --test evals/shared/tests/fast-gate-precondition.test.mjs
```

## Impact & Value

### User Impact

Consumers with a silent npm log level are no longer halted before their first develop iteration.

### Technical Impact

The precondition's verdict no longer depends on how the suite or the pipeline was started.

## Known Limitations & Future Work

### Current Limitations

- The `.npmrc` test case is vacuous under a runner that already sets `npm_config_loglevel` (gate 1, CR-1).
- `npmRunScript` does not skip the value of a space-separated value-taking flag (gate 1, CR-2).

### Suggested Follow-Up Stories

- A small test-hygiene task for CR-1 and CR-2. Set observation #213 to `actioned` once the PR merges.

---

**Status:** ✅ **ACCEPTED**
