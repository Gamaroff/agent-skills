# QA Report: Task 147 - develop pipeline: five steps that fail or overreach on correct input

**Task**: [Link to task document](./task.147.develop-pipeline-step-mechanics.md)
**Gate File**: [task.147.gate.5.develop-pipeline-step-mechanics.yml](./task.147.gate.5.develop-pipeline-step-mechanics.yml)
**Review Date**: 2026-09-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate-4 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (bug.13): `.//docs` scope | FIXED | Case 27; the mutation goes red |
| CR-2 (cleanup): the hold-dir record in the cleanup test | FIXED | The test seeds the record and asserts its removal |

---

## Review Methodology

An independent Explore reviewer checked the diff of the 10 files changed since gate 4 (1584 lines) and ran the normalisation block, under a 5-second alarm, against 45 spellings of a scope, from the repo root and from a subdirectory. Every loop terminates. Re-review scope: since 2026-09-25T10:32:55Z. `TMPDIR=/tmp`: 27/27 shell cases and 28/28 Step 8 tests. The route classifier returned `continue`.

---

## New Findings This Cycle

- **[medium]** `shared/resources/verify-push-state.sh`: the scope gate uses the wrong predicate (CR-3). One replacement closes the reproduced members CR-1 (glob and `:/`) and CR-2 (case-folded on macOS), and the reasoned member CR-4 (symlinked component). These are filed as [bug.14](./task.147.bug.14.scope-gate-wrong-predicate.md).
- **[low]** `verify-push-state.sh`: the help range is fixed, so the bundled copies drop their last help line (CR-6, verified).
- **[low]** `verify-push-state.sh`: the refusal message is wrong for an absolute path through an unresolvable symlink (CR-5).

**Pattern.** The normaliser has been patched one spelling at a time in cycles 2, 3 and 4. Those findings were MEDIUM, so the third-strike detector (which counts HIGH only) did not fire, but the shape it describes has been reached. The fix for this cycle replaces the gate rather than adding a sixth spelling.

---

## NFR Assessment

- Security: PASS (reasoned; 0 probes)
- Performance: PASS
- Reliability: CONCERNS
- Maintainability: CONCERNS

---

## Final Assessment

**Gate Status**: CONCERNS. **Quality Score**: 60/100. **Next Steps**: `/qa-fix` cycle 5, the last in the budget. The loop then reaches its limit, and the gate-the-last-fix half-cycle is evaluated by the engine.
