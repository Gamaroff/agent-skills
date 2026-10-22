# Sprint Review Summary - security-probe: the cli: form honours a case's fixture.files (and env)

**Story/Task ID:** task.216
**Completed Date:** 2026-10-22
**Completed By:** develop-task pipeline (develop-next run)
**Pull Request:** [#726](https://github.com/Gamaroff/agent-skills/pull/726)

---

## Summary

The security-probe engine's `cli:` form now writes a case's `fixture.files` into the CLI's working directory, and merges `fixture.env` into its environment, before the run. A CLI that refuses on what it finds in a data directory can now have a legitimate case that is accepted. Before, every such probe ended at `rejects-every-input`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A `cli:` case with `fixture.files` runs with those files in its cwd, and the verdict comes from the exit status (Node and Python).
- [x] A `cli:` case without `fixture` behaves exactly as before.
- [x] A malformed `fixture` is declined by name and never run: a path that leaves the case directory, a sandbox-owned or interpreter-steering env key, or an `expected.absent` name the files create.

### Key Features Implemented

- **Case fixture on `cli:`**: `runCliCase` validates the fixture (`fixtureProblem`), writes files (`writeFixtureFiles`) and spawns under `fixtureCaseEnv`. These are the same helpers the `shell-argv:` arm already used.
- **Interpreter-steering refusal**: `PATH`, `NODE_OPTIONS` and the loader variables `LD_PRELOAD`, `LD_LIBRARY_PATH`, `DYLD_INSERT_LIBRARIES` and `DYLD_LIBRARY_PATH` are declined by name (`CLI_INTERPRETER_ENV`).
- **Collision decline**: an `expected.absent` name whose first path segment a fixture file creates is declined, not run.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - `runCliCase` honours `c.fixture`; adds `CLI_INTERPRETER_ENV`; header comments updated
- `shared/resources/security-input-corpus.mjs` - `OPTIONAL_CASE_FIELDS` comment: `fixture` is read by `cli:` too
- `shared/resources/tests/security-probe.test.mjs` - 8 new tests (4 rows × Node and Python)
- `shared/resources/tests/fixtures/security-probe/cli-needs-data.mjs`, `cli-needs-data.py` - fixture CLIs
- `shared/resources/probe-boundary-rule.md` §5, `shared/resources/finalise-dod-security-prompt.md` - guidance
- Bundled copies in `finalise`, `qa-story`, `qa-task` and `review-security`; `CHANGELOG.md`

### Architecture/Design Decisions

No new helper: the `cli:` arm reuses the three helpers `shell-argv:` already runs, so the two arms cannot drift on what a fixture may name. Repository state (a commit, a staged index) is deliberately out of reach on `cli:`, because fixture files are text and `--fixture-setup` stays `shell-argv:`'s. The docs say so.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. A case that carried `fixture` used to have it silently ignored; it is now honoured.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 8 new tests in `shared/resources/tests/security-probe.test.mjs`, mutation-proven (6 mutants, each red).
- **Full suite:** 6201 tests, 0 fail. CI is green (test, validate, link-check, shellcheck).

### Code Review

- **Reviewers:** QA code review in each of the 3 cycles (cycle 2 was a full-diff refute pass), plus the Step 5c PR conformance review
- **Approval Status:** ✅ APPROVE (Step 5c); QA gate PASS 95/100
- **Review Comments Addressed:** all except TASK-216-QA3-1 (LOW), which is carried to Deferred Work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Input validation: a malformed fixture is declined before any spawn
- [x] Containment: fixture paths that leave the case directory are refused
- [x] Measured: 26 probes executed, 0 reproduced, 0 escaped
- [x] No new dependencies

### Compliance Review

Not applicable. This is a developer tool with no user data, UI, payments or health data.

---

## Documentation

### Updated Documentation

- [x] `shared/resources/probe-boundary-rule.md` §5: the `cli:` case-fixture paragraph
- [x] `shared/resources/finalise-dod-security-prompt.md`: the populated-data-directory note
- [x] `CHANGELOG.md` [Unreleased] entry

---

## Demo Notes

### How to Verify

1. `command node --test --test-name-pattern="cli entry" shared/resources/tests/security-probe.test.mjs`
2. Probe `cli-needs-data.mjs` with a case carrying `fixture: { files: { "items.json": "[\"MARKER\"]" } }` and input `.`.
3. Expected: the case is accepted; without the fixture it is rejected.

---

## Known Limitations and Future Work

- TASK-216-QA3-1 (LOW): the refusal list matches four exact loader names, so `LD_AUDIT` and other `DYLD_*` names are not refused, although the docs say `LD_*`/`DYLD_*`.
- Release and re-vendor into consumers, and the omarchy-leak-radar consumer proof (§9 Deferred Work).
