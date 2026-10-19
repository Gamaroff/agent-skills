# QA Report: Task 191 - Snippet engine runs pipeline blocks

**Task**: [Link to task document](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Gate File**: [task.191.gate.3.snippet-engine-runs-pipeline-blocks.yml](./task.191.gate.3.snippet-engine-runs-pipeline-blocks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Executive Summary

QA cycle 3 checked qa-fix cycle 2 (`665ae9c7`). All five gate-2 findings are fixed and verified, and so is CR2-6. The unscoped safety re-probe found one new HIGH fail-open. It sits in the cycle-2 inherited-function seeding: when a later sourced helper redefines a function, its arguments are judged by the earlier definition's commands.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Bug | Status | Evidence |
|---|---|---|---|
| CR2-1 respelled function name bypassed the forwarding check | [bug 2](./task.191.bug.2.sourced-function-arguments-never-scanned.md) | ✅ FIXED | `T191 CR2-1`; probe cases `helper.c3.respelled-fn-*`, `quoted-arg`, `partial-quoted-arg` refused |
| CR2-2 helper-script arguments and `set --` unscanned | [bug 7](./task.191.bug.7.helper-script-arguments-never-scanned.md) | ✅ FIXED | `T191 CR2-2`; `helper.c3.script-arg*`, `set-*positional` refused |
| CR2-3 respelled `BASH_ENV` | [bug 1](./task.191.bug.1.helper-call-runs-the-file-bash-env-names.md) | ✅ FIXED | `T191 CR2-3` (incl. executed); `helper.c3.bash-env-*` refused |
| CR2-4 case-arm rewrite hid a continued command | [bug 8](./task.191.bug.8.case-arm-rewrite-hides-a-continued-command.md) | ✅ FIXED | `T191 CR2-4`; `helper.c3.case-arm-tail` refused |
| CR2-5 helpers classified without earlier-sourced functions | [bug 9](./task.191.bug.9.helpers-classified-without-the-functions-sourced-before-them.md) | ✅ FIXED | `T191 CR2-5`; `helper.c3.inherited-fn`, `export-f` refused. The fix itself carries CR3-1 |
| CR2-6 PATH change (advisory) | — | ✅ FIXED | `T191 CR2-6`; `helper.c3.path-change` refused |
| CR2-7 timeout orphans a grandchild (advisory) | — | ❌ NOT FIXED | Advisory, recorded under future |
| CR2-8 empty-fence span (advisory) | — | ❌ NOT FIXED | Advisory, recorded under future |

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1680` — CR3-1: a later sourced helper's redefinition of a function keeps the earlier helper's forwarding reach, so `source ./h1.sh; source ./h2.sh; f 'w victim' h1.sh` (h1 `echo`, h2 `sed`) classifies `runnable` → a helper's own definition wins over an inherited one ([bug 10](./task.191.bug.10.redefined-sourced-function-keeps-the-earlier-reach.md))

---

## Testing Scope

### Review Methodology

Direct tools, plus one read-only Explore code reviewer under the safety re-probe directive. It was dispatched at 2026-10-19T06:03:03Z and took 471741 ms (from the completion notice). It read a source-only patch: the bundled copies under `skills/*/references/` are byte-identical generated copies.

Re-review scope: unscoped (prior gate failed on security) — full `origin/develop...HEAD` diff, 7 source files.

Step 4b: ran with `--diff-base $(git merge-base origin/develop HEAD) --copy-as skills:.agents/skills` over the three changed in-scope files. `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` each have 1 changed block, 0 executed. That block is the engine call itself, refused by design (`unrecognised-command: node`), so it gives `changed-blocks-not-executed` (medium, advisory). `shared/resources/qa-runnable-prose-detection.md` has 0 changed blocks. zsh is unavailable on this host.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: `--slot` | PASS | Verified | Unchanged |
| Phase 2: Helper calls | FAIL | 1 fail-open | CR3-1 |
| Phase 3: `--diff-base` | PASS | Verified | Unchanged since gate 2 |
| Phase 4: Callers, doc, changelog | PASS | Verified | §2aa updated for cycle 2 |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| `--slot` fills template slots | PASS | T191 slot tests |
| A helper call runs only when the helper's own text is runnable, and the boundary is not widened | **FAIL** | CR3-1 |
| The real `qa-cycle.sh` / `newest-numbered.sh` classify runnable; writers refused | PASS | `T191 helpers: the shipped helper population` |
| `--diff-base` counts changed blocks apart | PASS | T191 diff-base tests; Step 4b output |
| Step 4b / Phase 1.7 pass `--diff-base` | PASS | `qa-execution-step-parity.test.mjs` |
| No regressions | PASS | `npm run ci:fast` 5877/0. The real skill docs (qa-task, qa-story, finalise, review-epic, develop-task) classify the same as before the cycle-2 fix |

---

## Breaking Changes Validation

None (opt-in flags). PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: A redefined sourced function keeps the earlier reach (CR3-1)**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.191.bug.10.redefined-sourced-function-keeps-the-earlier-reach.md](./task.191.bug.10.redefined-sourced-function-keeps-the-earlier-reach.md)
- **Observation**: `classifyInternal`'s `inherited` loop runs after `prepareHelperText` has named the helper's own functions, and `forwardsTo.set` overwrites the entry, so the helper's own commands are never consulted
- **Impact**: A `sed w` / `sed -i` write is classified runnable
- **Recommendation**: The helper's own definition wins, or use the union of both reaches
- **Priority**: P1

**Total Issues**: HIGH: 1, MEDIUM: 0 (2 advisory carried), LOW: 0

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 96 (from the run record `task.191.qa.3.security.run.json` `totals.executed`)
- Controls: `isRunnableBlock` over the shell-exec corpus plus the cycle-1 helper cases and 18 cycle-2 shapes (61/61 engage), and the `--diff-base` revision refusal (35/35). 0 reproduced. CR3-1 is outside the corpus.

### Performance — PASS

Depth is bounded at 2. Forwarded arguments are classified twice per reached command.

### Reliability — CONCERNS

CR2-7 and CR2-8 are carried as advisory.

### Maintainability — CONCERNS

This is the third consecutive gate with a HIGH finding in the helper rule (2 → 5 → 1). The cycle-2 allow-list moves held under an unscoped re-probe. The one new defect is in the cycle-2 seeding itself.

---

## Code Review

Gate mapping: `code_review_blocking=true` (pipeline). CR3-1 is promoted to `top_issues[]`.

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1680` — CR3-1: an inherited forwarding entry overwrites the helper's own definition → the helper's own definition wins (or use the union)

**Cleanups (0).**

Anchor check: `ok`. Provenance: develop refuses every helper call, so the defect is new to this change and in scope (Phase 2). Reproduced with `classifyBlock` against a two-helper fixture. Without the `h1.sh` source, the same call is refused.

boundary: true. probes_executed: 96.

**Mutation spot check (after the reviewer returned; the tree was restored from a `cp` snapshot):**
- mutation-proven: forward the scan's collapsed args instead of the raw ones → `T191 CR2-1` → covered
- mutation-proven: pass no `inherited` → `T191 CR2-5` → covered
- mutation-proven: rewrite an arm at every `case` line → `T191 CR2-4` → covered
- mutation-proven: `PATH_WORD` never matches → `T191 CR2-6` → covered

---

## Regression Testing

- `npm run ci:fast`: 5877 tests, 5863 pass, 0 fail.
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
command node shared/resources/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --args-json '[{}, {"helperRoot": "<fixture root>"}]' --cases-file <corpus + helper cases> --record task.191.qa.3.security.run.json --json
command node shared/resources/security-probe.mjs --sink shell-exec --entry 'cli:shared/resources/qa-execute-snippets.mjs' --argv '["--file","<fixture>","--no-zsh","--diff-base","{input}"]' --cases-file <revision cases> --record task.191.qa.3.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR3-1 (bug 10).

### Short-term Actions (Non-Blocking)
1. Observation #67 (pre-existing base-scan shapes), CR2-7, CR2-8, observation #68, the `--no-textconv` test.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One reproduced HIGH fail-open on the widened safety boundary.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED

---

**Next Steps**: qa-fix cycle 3 (CR3-1). This is the third consecutive gate with HIGH findings on the same file, so the develop loop's third-strike rule applies.
