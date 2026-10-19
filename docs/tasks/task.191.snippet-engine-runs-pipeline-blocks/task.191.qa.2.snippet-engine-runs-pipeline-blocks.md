# QA Report: Task 191 - Snippet engine runs pipeline blocks

**Task**: [Link to task document](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Gate File**: [task.191.gate.2.snippet-engine-runs-pipeline-blocks.yml](./task.191.gate.2.snippet-engine-runs-pipeline-blocks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Executive Summary

QA cycle 2 is a full-branch refute pass and safety re-probe after cycle 1's fixes (commit `88194488`). Four of cycle 1's six findings are fixed and verified. The other two were fixed only for the exact spelling cycle 1 named, and a respelling passes. The refute pass reproduced five HIGH fail-opens, all in the helper rule's classification of shell text.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Gate 1 issue | Bug | Status | Evidence |
|---|---|---|---|
| QA-1 BASH_ENV start-up file | BUG-1 | ⚠️ PARTIAL | Named shapes refused (test `T191 QA-1 …`); respelled names pass (CR2-3). Reopened |
| CR-1 sourced-function arguments | BUG-2 | ⚠️ PARTIAL | `newest_numbered docs dod -delete` refused; `newest_\numbered …` passes (CR2-1). Reopened |
| CR-2 two-dot --diff-base | BUG-3 | ✅ FIXED | Both callers pass `$(git merge-base "$BASE" HEAD)`; parity test asserts it; mutation red |
| CR-3 conditional names trusted | BUG-4 | ✅ FIXED | `shadowsCommand`; `mv` refused in all three orders. Residual PATH case advisory (CR2-6) |
| CR-4 git diff config | BUG-5 | ✅ FIXED | `--no-color --no-ext-diff --no-textconv`; colour test, no-hunk and mode-only tests |
| QA-2 classifier not probeable | BUG-6 | ✅ FIXED | `isRunnableBlock` probed: 43/43 engages |

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1645` — CR2-1: `reach()` matches the literal function name in prose, but the scan unquotes it first, so a respelled name passes → check the unquoted invocation stream ([bug 2](./task.191.bug.2.sourced-function-arguments-never-scanned.md), reopened)
- **[high]** `shared/resources/qa-execute-snippets.mjs:1450` — CR2-2: a helper script's own arguments (and `set --`) are never checked → apply the forwarded-argument check to helper calls ([bug 7](./task.191.bug.7.helper-script-arguments-never-scanned.md))
- **[high]** `shared/resources/qa-execute-snippets.mjs:1356` — CR2-3: the start-up-variable refusal matches literal spellings only → refuse `export`/`declare`/non-literal assignment in a block with a helper call ([bug 1](./task.191.bug.1.helper-call-runs-the-file-bash-env-names.md), reopened)
- **[high]** `shared/resources/qa-execute-snippets.mjs:1427` — CR2-4: the case-arm rewrite hides a line that closes a multi-line `$(` → rewrite only at real arm-pattern positions ([bug 8](./task.191.bug.8.case-arm-rewrite-hides-a-continued-command.md))
- **[high]** `shared/resources/qa-execute-snippets.mjs:1471` — CR2-5: helpers are classified without the functions sourced before them → pass accumulated defines; refuse `export -f` ([bug 9](./task.191.bug.9.helpers-classified-without-the-functions-sourced-before-them.md))

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore code reviewer (refute + safety re-probe directives). The reviewer was dispatched at 2026-10-19T05:23:19Z and took 452834 ms (from the completion notice). It read a source-only patch: the byte-identical bundled copies under `skills/*/references/` were left out.

Re-review scope: unscoped (prior gate failed on security) — cycle 2 refute pass over the full `origin/develop...HEAD` diff, 7 source files.

Traceability mapper: not dispatched (as in cycle 1); internal mapping.

Step 4b: ran with `--diff-base $(git merge-base origin/develop HEAD) --copy-as skills:.agents/skills` (symlinked layout) over the three changed in-scope files. In `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`, changed: 1 block each, 0 executed, refused `mutating` (`unrecognised-command: node`). That block is the engine call itself, refused by design (it runs `gh` and `node`), and it gives `changed-blocks-not-executed` (medium, advisory). `shared/resources/qa-runnable-prose-detection.md` had 0 changed blocks. zsh unavailable on this host.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: `--slot` | PASS | Verified | Unchanged since gate 1 |
| Phase 2: Helper calls | FAIL | 5 fail-opens | CR2-1..CR2-5 |
| Phase 3: `--diff-base` | PASS | Verified | Gate-1 CR-4/6/8 closed; CR2-8 low |
| Phase 4: Callers, doc, changelog | PASS | Verified | Merge base in both callers |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| `--slot` fills template slots | PASS | T191 slot tests |
| A helper call runs only when the helper's own text is runnable, and the boundary is not widened beyond that | **FAIL** | CR2-1..CR2-5 |
| `--diff-base` counts changed blocks apart; `changed-blocks-not-executed` | PASS | T191 diff-base tests; Step 4b output |
| Step 4b / Phase 1.7 pass `--diff-base` and report `changed` first | PASS | `qa-execution-step-parity.test.mjs` (12/12) |
| No regressions | PASS | `npm run ci:fast` 5871/0 |

---

## Breaking Changes Validation

None (opt-in flags). PASS.

---

## Issues Found

**Total Issues**: HIGH: 5, MEDIUM: 2 (advisory, medium confidence), LOW: 1

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 78 (from the run record `task.191.qa.2.security.run.json` `totals.executed`)
- Controls: `isRunnableBlock` over the shell-exec corpus plus 12 helper-rule cases (43/43 engages); `--diff-base` revision refusal (35/35). 0 reproduced. The five HIGH fail-opens are outside the corpus and were found by the refute pass.

### Performance — PASS

Helper depth bounded at 2; `shadowsCommand` is cached per name.

### Reliability — CONCERNS

CR2-7: the runBlock timeout kills only the outer shell. CR2-8: an empty fence's span runs one line long.

### Maintainability — CONCERNS

Second consecutive gate with HIGH findings in `qa-execute-snippets.mjs`'s helper rule. Each fix closed the spelling the finding named. The structural move is in the gate recommendations.

---

## Code Review

Gate mapping: `code_review_blocking=true` (pipeline). CR2-1..CR2-5 are promoted to `top_issues[]`.

**Correctness bugs (8):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1645` — CR2-1, as above
- [high/high] `shared/resources/qa-execute-snippets.mjs:1450` — CR2-2, as above
- [high/high] `shared/resources/qa-execute-snippets.mjs:1356` — CR2-3, as above. The anchor checker's `text-mismatch` came from my JSON escaping of `\\b`; the file's line matches the reviewer's text
- [high/high] `shared/resources/qa-execute-snippets.mjs:1427` — CR2-4, as above
- [high/high] `shared/resources/qa-execute-snippets.mjs:1471` — CR2-5, as above
- [medium/medium] `shared/resources/qa-execute-snippets.mjs:1669` — CR2-6: `shadowsCommand` reads the host PATH; a block that assigns PATH can resolve an untrusted name to a file in the copy → distrust defined names when PATH is assigned
- [medium/medium] `shared/resources/qa-execute-snippets.mjs:1598` — CR2-7: a helper grandchild outlives the timeout (partly pre-existing: `while :; do :; done &` is runnable on develop) → process group, kill the group
- [low/medium] `shared/resources/qa-execute-snippets.mjs:2101` — CR2-8: an empty fence's span runs one line past its close → store the closing-fence line

Reproduction: every shape above was classified with `classifyBlock(code, {}, {helperRoot})` against fixture helpers in a scratch directory, and all are `runnable`. Provenance: develop refuses every helper call, so CR2-1..CR2-6 are new to this change.

**Mutation spot check (scratch worktree, not the reviewed tree):**
- mutation-proven: drop the `--bind` start-up arm → `T191 QA-1: a helper call is refused …` → covered
- mutation-proven: drop the sourced-helper `setsStartup` propagation → `T191 QA-1: a helper call is refused …` → covered
- mutation-proven: drop `--no-textconv` → no test → no-red-untested
- mutation-proven: drop the helper's own `forwardsTo` seeding → no test → absorbed (the fallback to the helper's command set reaches the same value)

---

## Regression Testing

`npm run ci:fast`: 5871 tests, 5857 pass, 0 fail (14 skipped). `npm run validate` for `skills/qa-task/` and `skills/qa-story/`: pass. bundle:check: 0 problems (at the fix commit).

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run -s validate -- skills/qa-task/
npm run -s validate -- skills/qa-story/
command node shared/resources/qa-execute-snippets.mjs --file <file> --diff-base <merge-base> --copy-as skills:.agents/skills --no-zsh --json
command node shared/resources/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --args-json '[{}, {"helperRoot": "<repo>"}]' --cases-file <corpus+helper cases> --record task.191.qa.2.security.run.json --json
command node shared/resources/security-probe.mjs --sink shell-exec --entry 'cli:shared/resources/qa-execute-snippets.mjs' --argv '["--file","<fixture>","--no-zsh","--diff-base","{input}"]' --cases-file <revision cases> --record task.191.qa.2.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR2-1..CR2-5. Weigh the allow-list move named in the gate before a third patch to the same mechanism.

### Short-term Actions (Non-Blocking)
1. CR2-6, CR2-7, CR2-8; a textconv test; the pre-existing security-probe JS-entry record key.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Five reproduced HIGH fail-opens on the widened safety boundary.
**Quality Score**: 0/100

**Deployment Recommendation**: BLOCKED

---

**Next Steps**: qa-fix cycle 2 (CR2-1..CR2-5), then QA cycle 3.
