# QA Report: Task 191 - Snippet engine runs pipeline blocks

**Task**: [Link to task document](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Gate File**: [task.191.gate.4.snippet-engine-runs-pipeline-blocks.yml](./task.191.gate.4.snippet-engine-runs-pipeline-blocks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 4 checked qa-fix cycle 3 (`3644878b`). That cycle ran under the third-strike rule and replaced the function-propagation mechanism: a function's reach is now the union of every definition of its name. CR3-1 is fixed and verified. The unscoped safety re-probe found no new defect, and 102 probes ran with 0 getting through. Reliability stays CONCERNS on two carried advisories.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Bug | Status | Evidence |
|---|---|---|---|
| CR3-1: a redefined sourced function kept the earlier reach | [bug 10](./task.191.bug.10.redefined-sourced-function-keeps-the-earlier-reach.md) | ✅ FIXED | `T191 CR3-1`; probe cases `helper.c4.redef-*` (6) refused; 3 mutations red |
| CR2-7: timeout orphans a grandchild (advisory) | — | ❌ NOT FIXED | Advisory, carried to future |
| CR2-8: empty-fence span (advisory) | — | ❌ NOT FIXED | Advisory, carried to future |

---

## New Findings This Cycle

- **[low]** `shared/resources/qa-execute-snippets.mjs:1655` — CR4-1: `classifyInternal`'s JSDoc is orphaned. The cycle-3 `addBody` insertion separated it from its function → move it back onto `classifyInternal` (cleanup, advisory)
- **[low]** `shared/resources/qa-execute-snippets.mjs:1844` — CR4-2: the caller recomputes the helper path that `resolveHelperCall` already found → return the path and its operand index (cleanup, advisory)

No correctness bug. Searched unscoped (prior gate: security FAIL): the full `origin/develop...HEAD` diff, 7 source files. Re-enumerated the helper rule's inputs: runner words, sourced and child calls, function definitions and redefinitions across helpers, forwarded and positional arguments, start-up variables, PATH, `cd`, and `--bind` keys. Then ran each shape against the current engine through the security probe, including 6 new redefinition and indirect-forwarding shapes (`g` → `f` → `sed`, with `f` redefined after `g` was sourced).

---

## Testing Scope

### Review Methodology

Direct tools, plus one read-only Explore code reviewer under the safety re-probe directive. It was dispatched at 2026-10-19T06:26:45Z and took 192559 ms (from the completion notice). The reviewer says it probed by reading only, without running fixtures. The executed probing in this cycle is the security-probe run below, so the reviewer's empty bug list is a reading, not a measurement.

Re-review scope: unscoped (prior gate failed on security) — full `origin/develop...HEAD` diff, 7 source files (bundled copies excluded as byte-identical generated files).

Step 4b: ran with `--diff-base $(git merge-base origin/develop HEAD) --copy-as skills:.agents/skills` over the three changed in-scope files. `skills/qa-task/SKILL.md` has 22 blocks, 1 changed, 0 executed. `skills/qa-story/SKILL.md` has 21 blocks, 1 changed, 0 executed. In both, the changed block is the engine call itself, refused by design (`unrecognised-command: node`), which gives `changed-blocks-not-executed` (medium, advisory, unchanged since cycle 2). `shared/resources/qa-runnable-prose-detection.md` has 0 changed blocks. zsh is unavailable on this host.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: `--slot` | PASS | Verified | Unchanged |
| Phase 2: Helper calls | PASS | Verified | CR3-1 closed by replacing the mechanism |
| Phase 3: `--diff-base` | PASS | Verified | 35/35 revision refusals |
| Phase 4: Callers, doc, changelog | PASS | Verified | §2aa states the union rule |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| `--slot` fills template slots | PASS | T191 slot tests |
| A helper call runs only when the helper's own text is runnable, and the boundary is not widened | PASS | T191 helper tests, including CR3-1; probe run 0 reproduced |
| The real `qa-cycle.sh` / `newest-numbered.sh` classify runnable; writers refused | PASS | `T191 helpers: the shipped helper population` |
| `--diff-base` counts changed blocks apart | PASS | T191 diff-base tests; Step 4b output |
| Step 4b / Phase 1.7 pass `--diff-base` | PASS | `qa-execution-step-parity.test.mjs` |
| No regressions | PASS | `npm run ci:fast` 5878/0. The real skill docs (qa-task, qa-story, finalise, review-epic, develop-task) classify the same before and after the cycle-3 fix |

---

## Breaking Changes Validation

None (opt-in flags). PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

`changed-blocks-not-executed` (Step 4b, advisory) is by design: the changed block is the engine call.

### LOW Severity Issues (2)

CR4-1 and CR4-2, both cleanups (see New Findings).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (plus 2 carried reliability advisories)

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 102 (from the run record `task.191.qa.4.security.run.json` `totals.executed`)
- Controls: `isRunnableBlock` over the shell-exec corpus plus the cycle 1-3 helper cases and 6 cycle-4 redefinition shapes (67/67 engage), and the `--diff-base` revision refusal (35/35). 0 reproduced.

### Performance — PASS

Depth is bounded at 2, and each name's body list is deduplicated.

### Reliability — CONCERNS

CR2-7 and CR2-8 are carried as advisory.

### Maintainability — PASS

The third strike was met with a replacement, not a fourth patch. Two low cleanups remain.

---

## Code Review

Gate mapping: `code_review_blocking=true` (pipeline). No `category: bug` finding, so nothing is promoted.

**Correctness bugs (0).**

**Cleanups (2):**
- `shared/resources/qa-execute-snippets.mjs:1655` — CR4-1: an orphaned JSDoc → move it onto `classifyInternal`
- `shared/resources/qa-execute-snippets.mjs:1844` — CR4-2: the helper path is recomputed in the caller → have `resolveHelperCall` return it

Anchor check: `ok` for both. boundary: true. probes_executed: 102.

**Mutation spot check (after the reviewer returned; the tree was restored from a `cp` snapshot):**
- mutation-proven: `addBody` replaces instead of appending → `T191 CR3-1` → covered
- mutation-proven: `reach` reads only the last body → `T191 CR3-1` → covered
- mutation-proven: the caller merge overwrites with `forwardsTo.set` → `T191 CR3-1` → covered

---

## Regression Testing

- `npm run ci:fast`: 5878 tests, 0 fail (at `3644878b`; the tree outside the task directory is unchanged since).
- `npm run validate` for `skills/qa-task/` and `skills/qa-story/`: pass.
- bundle:check: 0 problems.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run -s validate -- skills/qa-task/
npm run -s validate -- skills/qa-story/
command node shared/resources/qa-execute-snippets.mjs --file <file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
command node shared/resources/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --args-json '[{}, {"helperRoot": "<fixture root>"}]' --cases-file <corpus + helper cases> --record task.191.qa.4.security.run.json --json
command node shared/resources/security-probe.mjs --sink shell-exec --entry 'cli:shared/resources/qa-execute-snippets.mjs' --argv '["--file","<fixture>","--no-zsh","--diff-base","{input}"]' --cases-file <revision cases> --record task.191.qa.4.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR4-1, CR4-2, CR2-7, CR2-8, observation #67, observation #68, the `--no-textconv` test.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No blocking finding. Security is measured clean. Reliability carries two advisories.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR2-7 / CR2-8 accepted as advisory or fixed in a follow-up.

---

**Next Steps**: the develop loop's exit gate, Step 5c (`/review-pr`).
