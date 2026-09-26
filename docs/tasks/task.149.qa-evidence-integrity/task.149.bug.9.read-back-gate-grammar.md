# Bug Report: Task 149 - qa-read-back.js does not find a gate qa-cycle.sh counted, and does not halt when it cannot

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-9
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 5)
**Date Found**: 2026-09-26

## Description

`qa-cycle.sh` yields the cycle from gate names it accepts, such as `x.gate.4.yml` and
`x.gate.04.name.yml` (the reviewer verified both yield 4). The script's own lookup regex,
`\.gate\.4\.[^/]*\.yml$`, matches neither. With the cycle known and the gate not found, the script
records **no problem**: there is no `!gate` branch. The gate is then neither staged nor halted on, although
BUG-5's fix record says an absent cycle gate halts (cycle-5 review CR-2).

## Recommendation

Halt when the cycle's gate is not found. Match gate and report names with the same grammar
`qa-cycle.sh` uses (optional name segment, leading zeros), or take the gate path from the helper
itself. Test both spellings.

## Developer Fix Cycle

### Iteration 1

- `artifact()` matches `.gate.<digits>.` and `.qa.<digits>.` anywhere in the name and compares the
  number. That is `qa-cycle.sh`'s grammar, leading zeros included.
- The script halts on "no gate for cycle N" when the lookup finds nothing. It is defensive now that the
  grammars agree.
- Tests: `task.9.gate.1.yml` and `task.9.gate.01.x.yml` are both found, staged and read clean. The
  old grammar turns both red.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 5 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 5 |
