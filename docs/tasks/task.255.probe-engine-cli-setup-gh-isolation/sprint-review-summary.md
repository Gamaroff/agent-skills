# Sprint Review Summary - security-probe: a cli: fixture setup cannot reach the host gh

**Story/Task ID:** task.255
**Completed Date:** 2026-11-03
**Pull Request:** [#821](https://github.com/Gamaroff/agent-skills/pull/821)

---

## Summary

A `cli:` fixture setup now runs under the same trip-wire `gh` and gh-free PATH the shell arm already uses. A setup that reaches `gh` by a spelling the textual scan misses is stopped at run time and the case declines `needs-fake-gh`, instead of running the host binary.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A `cli:` setup that reaches `gh` by a scan-missed spelling declines `needs-fake-gh`; the host `gh` never runs
- [x] A git-only `cli:` setup still runs and the case is scored
- [x] The `cli:` entry's PATH is unchanged
- [x] `runCaseSetup` is still called by both arms
- [x] A `cli:` run with no `--fixture-setup` writes no `bin/gh` and spawns no extra process
- [x] `ghFreePath` is called once per case at most
- [x] The probe test file passes (290 tests) and `npm test` is green in CI
- [x] Each of the three guard mutations turns a test red
- [x] CHANGELOG, `probe-boundary-rule.md` and `bundle:check` are in order

### Key Features Implemented

- **Setup guard**: `cliSetupGuarded` writes the trip-wire `bin/gh` when a `cli:` run has a fixture setup, and the trip-wire marker is checked after the setup.
- **Setup-only environment**: the setup spawns with a copy of the environment whose PATH is the trip-wire first, then a gh-free remainder. The entry's own PATH is untouched.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - the guard (plus five bundled copies)
- `shared/resources/tests/security-probe.test.mjs` - five new tests (split-name, command substitution, git-only, entry PATH, trip-wire stepped around)
- `shared/resources/tests/fixtures/security-probe/` - one entry fixture and three setup fixtures
- `shared/resources/probe-boundary-rule.md` - states the run-time guard and its inherited limits (plus bundled copies)
- `CHANGELOG.md` - entry citing task 255

### Architecture/Design Decisions

Reuse the shell arm's existing trip-wire and `ghFreePath` rather than build a new sandbox. While `ghFreePath` is redundant as long as the trip-wire is first on PATH, it is kept and held by a test that steps around the trip-wire.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Unit Tests:** 290 pass in `shared/resources/tests/security-probe.test.mjs`
- **Mutation proof:** three guard mutations re-run by QA, each red, restored byte-identical
- **QA Gate:** PASS, 100/100, one cycle
- **PR Review (5c):** CONCERNS with no open coverage finding
- **CI:** all six checks green on the PR head

---

## Security & Compliance

- **Security:** the finalise probe run executed 1 case, reproduced 0 and saw 0 escapes. Two controls declined at the trip-wire as designed. The plan held legitimate-direction cases only, so the hostile-direction evidence is the mutation-proven tests.
- **Compliance:** not applicable (internal developer tooling).

---

## Documentation

- [x] `CHANGELOG.md` entry
- [x] `probe-boundary-rule.md` updated, bundled copies regenerated

---

## Demo Notes

### How to Verify

1. Run `command node --test shared/resources/tests/security-probe.test.mjs`.
2. Expect 290 pass, including the five task.255 tests.

---

## Impact & Value

### Technical Impact

The probe engine can no longer have its host `gh` run by a `cli:` fixture setup, closing the follow-up raised as task.254 advisory CR-1.

---

## Known Limitations & Future Work

### Current Limitations

- The guard inherits the shell arm's limits: an absolute path to `gh`, a PATH prepend inside the setup, and a backgrounded call.

### Suggested Follow-Up

- CR-1: share the setup-PATH build with `caseShellEnv`.
- CR-2: re-wrap one over-wide paragraph in `probe-boundary-rule.md`.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
