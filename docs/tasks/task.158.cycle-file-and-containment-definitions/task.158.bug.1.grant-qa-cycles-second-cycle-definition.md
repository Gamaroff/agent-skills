# Bug Report: Task 158 - grant-qa-cycles.sh keeps a second definition of the QA cycle

**Task**: [task.158](./task.158.cycle-file-and-containment-definitions.md)
**Bug ID**: TASK-158-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 1, code review CR-1)
**Date Found**: 2026-09-29

## Description

task.158 makes `qa-cycle.sh` "the only definition" of the current QA cycle for the QA skills and the
develop-pipeline step docs, and moves the resume contract's cycle reconstruction onto it. The same
re-entry procedure then calls `shared/resources/grant-qa-cycles.sh`, which reconstructs the cycle
with its own loop (`sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'`, lines 108–115). That loop does not strip
leading zeros and does not skip non-regular files. So the new header's claim is false, and the two
halves of one procedure can disagree.

## Steps to Reproduce

```bash
mkdir -p /tmp/cr1/doc && touch /tmp/cr1/doc/task.9.gate.08.x.yml && printf '### QA Cycle 1\n' > /tmp/cr1/report.md
printf '{"skill":"develop-task","task_or_story_directory":"/tmp/cr1/doc","current_step":5}\n' > /tmp/cr1/lock.json
bash shared/resources/qa-cycle.sh /tmp/cr1/doc          # → 8
PIPELINE_LOCK=/tmp/cr1/lock.json PIPELINE_HALT_SNAPSHOT=/tmp/cr1/snap.json \
  bash shared/resources/grant-qa-cycles.sh /tmp/cr1/doc 2 /tmp/cr1/report.md
```

## Expected Behavior

`grant-qa-cycles.sh` reads cycle 8 through `qa-cycle.sh`, and writes `qa_max_cycles: 10`.

## Actual Behavior

```
grant-qa-cycles.sh: line 146: 08: value too great for base (error token is "08")
grant-qa-cycles.sh: line 157: NEW_MAX: unbound variable
```

It exits 1, and no grant is recorded.

## Provenance

`grant-qa-cycles.sh` is unchanged by this branch (`git diff origin/develop -- shared/resources/grant-qa-cycles.sh` is
empty), so the crash itself reproduces on `develop`. It is attributed to task.158 because this
branch's own claims are false while it stands. Those claims are the `qa-cycle.sh` header ("the ONLY
definition … the resume contract's cycle reconstruction") and the CHANGELOG ("every current-cycle
gate lookup"). The guard also does not scan scripts, so nothing would catch a third copy.

## Impact

A loop-limit re-entry on a work item with a zero-padded gate cannot record its grant. The lock keeps
its old budget, and the operator gets a shell arithmetic error rather than a named refusal.

## Recommendation

`grant-qa-cycles.sh` takes its base cycle from the sibling `qa-cycle.sh` (rc 1 → its existing "nothing to
grant against" refusal; other rc → not runnable). Add a test with a zero-padded gate. Widen the
`tests/qa-cycle.test.js` population to the shell helpers under `shared/resources/` that read a gate
number, so a third definition fails the guard.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-29

The root cause is confirmed at `grant-qa-cycles.sh` lines 108–115. The script has its own loop over
`*.gate.*.yml` with `sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'`. That keeps leading zeros, so `08`
reaches `$((QA_CYCLE + K))` as an invalid octal literal, and nothing checks that a match is a
regular file. The same crash reproduces on `develop` (the script is unchanged by this branch).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-29

**Fix Description**

- `grant-qa-cycles.sh` gets its base cycle from the sibling `qa-cycle.sh`, declared as a
  `bundle-dependency` so every skill that bundles the grant script bundles the helper as well.
- rc 1 from the helper keeps the existing "nothing to grant against" refusal. Any other rc is "not
  runnable". A missing sibling is a named refusal and writes nothing.
- `tests/qa-cycle.test.js` has a new shell-helper guard. It scans every shipped `.sh` under
  `shared/resources/`, `scripts/` and `skills/*/scripts/`, and fails on a gate loop, derivation
  or selection anywhere except `qa-cycle.sh`. Its non-vacuity fixtures are the lines the grant
  script shipped.

**Files Modified**

- `shared/resources/grant-qa-cycles.sh`
- `shared/resources/grant-qa-cycles.test.sh` (3 cases)
- `tests/qa-cycle.test.js` (2 tests)
- `shared/resources/qa-cycle.sh` (header)
- bundled copies

**Testing**

- `grant-qa-cycles.test.sh`: 45/45 pass.
- `gate.08` now gives `qa_max_cycles: 10`, and a mix of `gate.02`, `gate.9` and `gate.010`
  agrees with `qa-cycle.sh`.
- Mutations: reverting the script to `develop` turns 2 grant tests red (M11) and turns the shell
  guard red (M12).

**Verification Steps for QA**

1. Re-run the reproduction above. It should exit 0 and write `qa_max_cycles: 10`.
2. `bash shared/resources/grant-qa-cycles.test.sh` and `node --test tests/qa-cycle.test.js`.

## Status History

| Date       | Status       | Changed By | Notes                                      |
| ---------- | ------------ | ---------- | ------------------------------------------ |
| 2026-09-29 | New          | qa-task    | QA cycle 1, code review CR-1               |
| 2026-09-29 | In Progress  | qa-fix     | Investigation started                      |
| 2026-09-29 | Ready for QA | qa-fix     | grant-qa-cycles.sh asks qa-cycle.sh        |
| 2026-09-29 | Closed       | qa-task    | QA cycle 2: reproduction exits 0, qa_max_cycles 10 |
