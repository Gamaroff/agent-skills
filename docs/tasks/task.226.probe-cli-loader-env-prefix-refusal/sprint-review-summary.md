# Sprint Review Summary - security-probe: refuse every LD_* and DYLD_* variable on cli: case fixtures

**Story/Task ID:** task.226
**Completed Date:** 2026-10-22
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#729](https://github.com/Gamaroff/agent-skills/pull/729)

---

## Summary

A `cli:` probe case's `fixture.env` used to refuse four dynamic-loader variables by exact name, so `LD_AUDIT`, `DYLD_FRAMEWORK_PATH` and every other loader variable passed through, even though the docs said all of them were refused. The engine now refuses any key starting with `LD_` or `DYLD_`, by name and before anything spawns. The code now does what the docs already promised.

## What Was Delivered

### Acceptance Criteria Met

- ✅ `LD_AUDIT` and `DYLD_FRAMEWORK_PATH` declined by name, nothing executed, on Node and Python
- ✅ `MY_LD_FLAG` (prefix not at the start) still runs and is scored
- ✅ `HOME`, `PATH`, `NODE_OPTIONS` and `LD_PRELOAD` still declined with their existing messages
- ✅ `fence:` and `shell-argv:` behaviour unchanged
- ✅ Test written first (red before the fix) and mutation-proved
- ✅ `ci:fast`, `bundle:check` and `validate` green
- ✅ CHANGELOG cites task 226; §5, the DoD security prompt and both CHANGELOG entries state one rule

### Key Features Implemented

- `CLI_LOADER_ENV_PREFIXES` (`LD_`, `DYLD_`) beside `CLI_INTERPRETER_ENV` (now `PATH`, `NODE_OPTIONS`)
- One predicate, `steersInterpreter(k)`, used by `runCliCase` in place of the exact-name check

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` (and its 4 bundled copies)
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md` (and its 2 bundled copies)
- `CHANGELOG.md`

### Architecture/Design Decisions

- Case-sensitive `startsWith`, so `ld_audit`, `Ld_AUDIT`, `LDFLAGS` and `MY_LD_FLAG` are not refused. The loaders only read the upper-case names.
- The decline message is unchanged and still names the key.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- `security-probe.test.mjs`: 217/217. Two new decline rows and one control row, each on Node and Python.
- `ci:fast`: 6201 tests, 0 failures.

### Code Review

- QA cycle 1: gate PASS 100/100, diff reviewer found nothing, three mutants all covered
- Step 5c `/review-pr`: APPROVE, 0 findings

## Security & Compliance

### Security Review

The boundary was probed twice:

- **QA:** 16 executed, 0 escaped.
- **DoD:** 22 executed, 0 reproduced, 0 escaped (record `task.226.dod.1.security.run.json`). All 9 loader canaries were declined, including `LD_BIND_NOW`, the bare `LD_` and a loader key in second position. All 5 near-miss controls ran and were accepted.

Under the old exact-name list, `LD_AUDIT` reached `ld.so`.

### Compliance Review

Not applicable. This is internal developer tooling.

## Documentation

### Updated Documentation

- `probe-boundary-rule.md` §5: the prefix rule
- `CHANGELOG.md`: a new `### Fixed` entry, plus the task 216 entry corrected

### Documentation Links

- [Task document](./task.226.probe-cli-loader-env-prefix-refusal.md)
- [DoD summary](./task.226.dod.1.probe-cli-loader-env-prefix-refusal.md)
- [QA report](./task.226.qa.1.probe-cli-loader-env-prefix-refusal.md)

## Demo Notes

### How to Verify

```bash
command node --test --test-name-pattern="declined by name" shared/resources/tests/security-probe.test.mjs
```

## Impact & Value

### User Impact

A probe plan can no longer hijack the interpreter through a loader variable the old list did not name. A plan that sets one now fails loudly by name instead of being mis-scored.

### Technical Impact

The code and its three describing documents now state one rule.

## Known Limitations & Future Work

### Current Limitations

None known.

### Suggested Follow-Up Stories

None.
