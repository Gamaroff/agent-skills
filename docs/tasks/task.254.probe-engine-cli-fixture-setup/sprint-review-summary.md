# Sprint Review Summary - security-probe: a cli: entry can run a fixture setup

**Story/Task ID:** task.254
**Completed Date:** 2026-11-03
**Pull Request:** [#818](https://github.com/Gamaroff/agent-skills/pull/818)

---

## Summary

The Node and Python `cli:` form of the security probe now takes `--fixture-setup`, so a CLI that reads git state can be probed instead of declined. The "cannot materialise" decline now names the sink that caused it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `cli:` runs a committed setup in each case directory before the CLI (Node and Python).
- [x] A setup that fails, times out or writes outside its case directory makes the run `errored`, never `rejected`.
- [x] `--fixture-setup` is still refused for `shell:`, `shell-fn:` and `fence:`.
- [x] The T252 probe plan, re-run with a git-init setup, executes its probes.
- [x] A `cli:` run without a setup spawns no extra process, and one helper serves both arms; both are held by tests.
- [x] CHANGELOG and the prompt and boundary-rule docs are updated.

### Key Features Implemented

- **Shared setup helper**: `runCaseSetup` is called by both the `shell-argv:` and `cli:` arms.
- **Clearer decline**: the path-input decline names the sink that writes the input as a file name.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - the helper, the `cli:` call site, the wording
- `shared/resources/tests/security-probe.test.mjs` - acceptance, failure, escape, refusal, wording, one-helper and spawn-count tests
- `shared/resources/probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md` - docs; bundled copies regenerated
- `CHANGELOG.md` - entry citing task 254

---

## Testing & QA

QA ran two cycles: CONCERNS (90) on a missing spawn-count test, then PASS (95) after it was added and mutation-proven. 285 engine tests pass; CI is green.

## Security & Compliance

Security PASS. The `--fixture-setup` path check cannot be probed by the engine; a human override is recorded in the DoD file. Compliance is not applicable.

## Known Limitations and Future Work

- A `cli:` setup runs with the host PATH, and the `gh` scan is textual.
- The NUL branch of the fixture materialiser gives path advice on the `filename` sink.
