# Bug Report: Task 83 - The parity test helper's environment scrub omits `SKILLS_CONFIG_FILE`

**Task**: [Link](./task.83.platform-aware-skill-exclusion.md)
**Bug ID**: TASK-83-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 2 refute pass)
**Date Found**: 2026-09-04

## Description

`runtimeTracker()`, added in QA cycle 1 to make the install/run-time parity assertion possible, builds
its child environment by copying `process.env` and deleting `JIRA_URL` and `TRACKER`. It does not
delete **`SKILLS_CONFIG_FILE`**, which `resolve-platform.sh` honours as an explicit override of *which
config file to read* (`resolve-platform.sh:187-200`).

The consequence is that an ambient `SKILLS_CONFIG_FILE` points the runtime resolver at a different
file from the one the test just wrote, while `_resolve_install_tracker` — which reads
`./skills-config.yaml` literally — still reads the fixture. The two resolvers then disagree because
they were handed **different inputs**, and all ten parity cases fail against code that is correct.

This is a defect in cycle 1's fix, not in the original change. It is also a defect the codebase had
already anticipated: `callFn()`, the helper `runtimeTracker()` was modelled on, scrubs its list for
precisely this reason and says so —

> JIRA_URL is unset by default so an ambient one in the developer's shell cannot silently flip a
> resolver assertion.

The list was copied and not extended.

## Steps to Reproduce

```bash
fixture=$(mktemp -d); printf 'tracker: jira\n'   > "$fixture/skills-config.yaml"
decoy=$(mktemp -d);   printf 'tracker: github\n' > "$decoy/skills-config.yaml"

cd "$fixture"
SKILLS_CONFIG_FILE="$decoy/skills-config.yaml" \
  bash -c 'source /path/to/shared/resources/resolve-platform.sh >/dev/null 2>&1; echo "runtime=$TRACKER"'
# → runtime=github     (read the decoy)

SETUP_CONSUMER_NO_MAIN=1 SKILLS_CONFIG_FILE="$decoy/skills-config.yaml" \
  bash -c 'source /path/to/scripts/setup-consumer.sh; echo "install=$(_resolve_install_tracker)"'
# → install=jira       (read the fixture)
```

## Expected Behavior

Test helpers hand both resolvers the same input, so a parity failure means the resolvers disagree —
never that the harness fed them different files.

## Actual Behavior

With `SKILLS_CONFIG_FILE` exported, the parity block fails against correct code. In the mirror case
(an ambient config that happens to agree with the expectation) it passes without having tested the
fixture at all, which is worse.

## Impact

Bounded — it touches no shipped behaviour; `scripts/setup-consumer.sh` is unaffected. But the affected
tests are the ones guarding the HIGH finding from cycle 1, and the failure mode is a red suite that
cannot be reproduced by running the same command in a different shell. That is the shape of defect
this repo has been bitten by before (see the tracked-tree link-check note in `AGENTS.md`), and it
survives every local gate.

## Recommendation

Scrub the variable — and stop maintaining the list in more than one place.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-04
**Developer**: qa-fix

Enumerating what either resolver actually reads from the environment turned up **three** copies of the
scrub list, not two: `callFn()`, `runtimeTracker()` and `runInstall()`. Only `runtimeTracker()` was
exposed today — `_resolve_install_tracker` reads `./skills-config.yaml` literally, so
`SKILLS_CONFIG_FILE` cannot reach the other two — but three copies of a list whose failure mode is
"copied and not extended" is the actual defect. Patching the one that happened to be caught would
leave the same hole open for the next helper.

The enumeration also found a second variable worth scrubbing: `AGENT_SKILLS_ACCESS_*`
(`resolve-platform.sh:145`). An invalid ambient value makes the resolver `return 1`, leaving `TRACKER`
unset or stale — the same class of hole, reached by a different route.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-04

**Fix Description**:

- Replaced all three copies with one `hermeticEnv()` helper, documented with *why each variable is on
  the list* so the next person extending it knows what qualifies.
- Added `SKILLS_CONFIG_FILE` and `AGENT_SKILLS_ACCESS_TRACKER` / `AGENT_SKILLS_ACCESS_VCS`.
- `runtimeTracker()` now captures the resolver's **exit status** and asserts 0. This was the gate's
  `future` item, taken now because it is what makes this bug's failure legible: without it, a resolver
  that *refuses* a config is reported as "the two resolvers disagree", which sends the reader to the
  wrong file.
- New test: an ambient `SKILLS_CONFIG_FILE` pointed at the **opposite** tracker cannot redirect the
  fixture. Opposite on purpose — a decoy that agreed with the expectation would let a broken scrub
  pass by coincidence.

**Files Modified**:

- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`

**Testing**: `npm run ci:fast` → exit 0, 2356 tests, 0 failures, prettier clean.

**Mutation proofs**:

| # | Mutation                                                    | Result                                                                     |
| - | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| M7 | Remove `SKILLS_CONFIG_FILE` from the scrub list             | `an ambient SKILLS_CONFIG_FILE cannot redirect a fixture` red              |
| M8 | Point `RESOLVER` at a script that `return 1`s               | the new exit-status assertion fires with its intended message rather than reporting a bogus disagreement |

**Verification Steps for QA**:

1. Run the repro above and confirm both resolvers now report `jira`.
2. `node --test --test-name-pattern='ambient SKILLS_CONFIG_FILE' …` → passes.
3. Re-apply M7 and confirm it goes red.

## Status History

| Date       | Status       | Changed By | Notes                                                        |
| ---------- | ------------ | ---------- | ------------------------------------------------------------ |
| 2026-09-04 | New          | qa-task    | Found by the cycle 2 refute pass, in cycle 1's own fix        |
| 2026-09-04 | In Progress  | qa-fix     | Enumeration found three copies of the list, not two          |
| 2026-09-04 | Ready for QA | qa-fix     | Consolidated to `hermeticEnv()`; mutation-proven (M7, M8)     |
