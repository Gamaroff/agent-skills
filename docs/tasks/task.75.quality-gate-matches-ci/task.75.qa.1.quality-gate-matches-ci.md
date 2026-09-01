# QA Report: Task 75 — Make the pipeline quality gate run what CI runs

**Task**: [task.75.quality-gate-matches-ci.md](./task.75.quality-gate-matches-ci.md)
**Gate File**: [task.75.gate.1.quality-gate-matches-ci.yml](./task.75.gate.1.quality-gate-matches-ci.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**PR**: [#291](https://github.com/Gamaroff/agent-skills/pull/291) (OPEN)
**Gate Status**: CONCERNS

---

## Executive Summary

The task does what it set out to do and does it carefully: all four phases are implemented, every success criterion verifies mechanically, the full `npm run ci` gate is green at 2092 pass / 0 fail, and the new contract test has been mutation-proved seven times rather than asserted once. The implementer also widened the doc sweep from the two sites the task named to the six that actually restate the default — `develop-batch` reads the same config key, and leaving its table stale would have had two sibling orchestrators documenting different defaults for one key.

One MEDIUM finding, in the change set: the fast-gate block added to the qa-fix cycle is numbered `0a.` but placed *before* step `0.`, so it both reads backwards and runs a full format+test gate before the check that decides whether anything changed at all.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — resolve TASK-75-001 before merge

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 4 implementation phases completed and ticked
- [x] Tests passing (`npm run ci` exit 0)
- [x] Breaking changes documented with the override path
- [x] Code on feature branch `feature/task.75.quality-gate-matches-ci` with open PR #291

### Review Methodology

**Direct tools.** 4 phases, a single concern (gate alignment), `risk_level: low`, no parallel agents warranted. Step 3b run as a single adversarial pass over the whole branch diff (first review).

---

## Implementation Verification

| Phase                             | Status   | Test Result | Notes                                                                                    |
| --------------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------- |
| Phase 1: One definition of green  | PASS     | Verified    | `ci` and `ci:fast` present and correctly composed                                        |
| Phase 2: Tier the gates           | CONCERNS | Verified    | Correct in substance; **TASK-75-001** — block ordering in the qa-fix cycle                |
| Phase 3: Workflow calls the tiers | PASS     | Verified    | **No edit required** — workflow already called the three scripts. Verified, not assumed. |
| Phase 4: Parity test              | PASS     | Verified    | 8 tests, mutation-proved 7×                                                              |

**Overall Phase Completion**: 4/4 implemented, 1 with a concern.

Phase 3 deserves a note: the review predicted it would need no change, and it did not. The implementer verified rather than manufacturing an edit to justify the phase — the right call, and the parity test is what now holds the arrangement in place.

---

## Success Criteria Verification

### Functional

| Criterion                                   | Target        | Actual                                      | Status |
| ------------------------------------------- | ------------- | ------------------------------------------- | ------ |
| `npm run ci` runs formatting, tests, evals  | all three     | `ci:fast && eval:all` → all three           | PASS   |
| `npm run ci:fast` runs formatting + tests   | two only      | `format:check && test`                      | PASS   |
| Develop loop + qa-fix cycle run `ci:fast`   | both          | `<fastGateCommand>` in both step docs (2×2) | PASS   |
| `develop-next` merge gate runs full `ci`    | yes           | SKILL.md table + Step 3 prose               | PASS   |
| `qualityGateCommand` defaults to `npm run ci` | yes         | both orchestrators + config reference       | PASS   |

### Regression

| Criterion                              | Target   | Actual                                        | Status |
| -------------------------------------- | -------- | --------------------------------------------- | ------ |
| CI reports three separately named steps | 3       | Formatting / Hermetic / End-to-end all present | PASS   |
| Explicit `qualityGateCommand` still wins | yes     | Documented; default applies only when unset    | PASS   |
| No check added or removed              | 0 delta  | same 3 npm scripts (+ `npm ci` installer)      | PASS   |

### Safety

| Criterion                                     | Target | Actual                       | Status |
| --------------------------------------------- | ------ | ---------------------------- | ------ |
| Parity test fails when workflow/composite diverge | yes | mutation-proved, 7/7 red     | PASS   |
| CHANGELOG records the default change           | yes    | under **Changed**, not Added | PASS   |

---

## Breaking Changes Validation

### Breaking Change: `qualityGateCommand` default `npm test` → `npm run ci`

- **Documented**: Yes — task §5, CHANGELOG under **Changed**, config reference row
- **Migration Path Provided**: Yes — set `qualityGateCommand:` explicitly in `skills-config.yaml`
- **Migration Tested**: Yes — an explicit value takes precedence; the default applies only when the key is unset
- **Consumer Code Updated**: N/A — additive default change

**Overall Breaking Changes Assessment**: PASS. The change is intentional, named as observable, and reversible in one line.

---

## Issues Found

### HIGH Severity Issues (0 in scope)

None in this change set.

> **One HIGH finding was discovered during this review but is OUT OF SCOPE — see Code Review below.** It is a pre-existing defect in `qa-execute-snippets.mjs`, untouched by task 75, and correctly does not gate this task.

### MEDIUM Severity Issues (1)

**Issue: Fast-gate block is mis-ordered and mis-numbered in the qa-fix cycle**

- **Severity**: MEDIUM
- **Category**: Quality / correctness of instruction
- **Location**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:506`
- **Observation**: The new block is labelled `0a.` but sits at line 506, ahead of step `0.` at line 533. `0a` conventionally means "follows 0", so the label contradicts the position.
- **Impact**: Two costs. The label misleads a reader about sequence. More concretely, step `0.` is the no-change check that HALTs when qa-fix edited nothing — so as written, the cycle pays a full format+test gate *before* discovering there is nothing to test. On a no-change cycle that is pure waste, on the path that is already a HALT.
- **Recommendation**: Move the block after step `0.` and renumber so the sequence reads `0 → 0a → 1`, or fold it into step 1 ahead of the commit. The invariant that matters — the gate runs before `/commit-changes` — is preserved either way.
- **Priority**: P2

### LOW Severity Issues (1)

**`workflowScripts()` silently drops unknown scripts.** `evals/shared/tests/ci-gate-parity.test.mjs:112` filters on `name in scripts`, so a CI step invoking a script absent from `package.json` is ignored rather than flagged. Impact is genuinely low — such a step fails CI on its own — but the parity test could assert it.

**Total Issues**: HIGH: 0 (in scope), MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

The merge gate gets slower, by design: `eval:all` moves into it. That is the task's named trade, argued in its Risk Assessment and recorded in the CHANGELOG. What makes it acceptable is the tiering — and the tiering is *enforced*, not merely intended: the parity test asserts `ci:fast` is a strict subset of `ci`, so the slow tier cannot silently leak into the per-iteration loop. Formatting moves the other way, into the loop, at a cost of seconds.

### Reliability — PASS

Rollback is a one-line default revert leaving CI untouched. The parity test fails closed in both directions and was proved red under seven distinct mutations, including the two the task named and five more the implementer added.

### Security — PASS

No security surface touched: no new dependencies, no credential handling, no network calls. Scanned the staged diff for secrets, tokens and debug logging — clean.

### Maintainability — PASS

A clear net improvement. Six independently-drifting restatements of one default are now held together by a contract test. Making the fast gate a config key rather than a literal is the load-bearing decision: these step docs ship verbatim into consumer repos, and a hardcoded `npm run ci:fast` would have instructed every downstream project to run a command it does not have.

---

## Code Review

**Correctness bugs (1 in scope, 1 out of scope):**

- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:506` — fast-gate block numbered `0a.` but positioned before step `0.` → reorder after the no-change check. **Promoted to gate `top_issues` as TASK-75-001.**
- [high/high] `shared/resources/qa-execute-snippets.mjs:997` — **OUT OF SCOPE, not promoted.** See below.

**Cleanups (1):**

- `evals/shared/tests/ci-gate-parity.test.mjs:112` — `workflowScripts()` drops scripts not in `package.json` rather than flagging them.

### Out-of-scope HIGH finding — the snippet engine no-ops through its own documented path

Found while running Step 4b, and worth recording precisely because of what it is.

`qa-execute-snippets.mjs` guards its CLI entrypoint with:

```js
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
```

`.agents/skills` and `.claude/skills` are both symlinks to `../skills` in this repo (and consumer installs do the same). So when the engine is invoked through the path **its own documentation prescribes** — `node .agents/skills/qa-task/references/qa-execute-snippets.mjs` — `process.argv[1]` arrives symlinked while `import.meta.url` is already realpath-resolved. The comparison is false, `main()` never runs, and the process exits **0 with zero output**.

Reproduced:

| Invocation | Exit | Real stdout |
| --- | --- | --- |
| `.agents/skills/…` (documented) | **0** | none |
| `skills/…` (realpath) | **1** | 1132 B JSON incl. `zero-blocks-executed` |

This is the exact defect class Step 4b exists to eliminate — a gate that silently does nothing and reports success — reproduced inside the remedy. And it is a *known* defect in this repo: `skills/develop-next/scripts/select-next.mjs:1486` already carries the fix, with a comment describing this precise failure ("consumer projects symlink `.claude/skills` → `.agents/skills`, so argv[1] arrives symlinked while import.meta.url is already real … main() never runs: exit 0, no output"). The engine was written later with the naive comparison.

**Not promoted to `top_issues`** — task 75 does not touch this file, and a gate must judge the change set in front of it. Recommended as a general bug report (`/create-bug-report`); the fix is to copy `select-next.mjs`'s `isInvokedDirectly()`.

### Step 4b — Execute the Documented Commands

Fires: the diff modifies five files carrying fenced bash blocks. Run against the realpath to work around the defect above.

| File | Blocks | runnable | placeholder | mutating | Finding |
| --- | --- | --- | --- | --- | --- |
| `develop-pipeline-step-5-6-qa-loop.md` | 15 | 0 | 0 | 15 | `zero-blocks-executed` |
| `develop-pipeline-step-3-develop-loop.md` | 5 | 0 | 2 | 3 | `zero-blocks-executed` |
| `develop-next/SKILL.md` | 8 | 0 | 0 | 8 | `zero-blocks-executed` |
| `develop-batch/SKILL.md` | 10 | 0 | 0 | 10 | `zero-blocks-executed` |
| `develop/SKILL.md` | 5 | 1 | 0 | 4 | none — passed |

`zsh` available; **no bash/zsh disagreements found**. Every skip is recorded with its reason — overwhelmingly `unrecognised-command: node / awk / git (fail-closed)`, which is the allow-list behaving as designed on orchestrator prose rather than a defect in this change. The newly added block (`FIX_LOG` capture) classifies `mutating` and is correctly skipped: it writes a file.

Treated as **informational, not a gate finding** — the all-mutating classification is a pre-existing property of these documents, not something task 75 introduced.

### Step 3c — Mutation-Proof Spot Check

The implementer's seven mutation proofs were re-read against the gate criteria and are sound: each reverts a distinct behaviour the test claims to hold, each went red, and the baseline was confirmed green on both sides.

`mutation-proven: yes` — for all four Phase-4 invariants (workflow↔composite parity in both directions, tiering subset, documented defaults, config-key-not-literal).

One process note worth carrying forward: the M6/M7 restores used `git checkout <file>`, which reverted the task's own uncommitted edits along with the mutation. The implementer caught it via a red re-baseline and re-applied both. The proofs are unaffected — each went red before the restore — but `cp` to a backup (as M1–M3 used) is the correct undo when mutating on top of uncommitted work. Recorded in the implementation report.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite + evals (`npm run ci`) | PASS — 2092 pass / 0 fail, exit 0 |
| `evals/develop-next/protocol/skill-shape.test.mjs` | PASS — asserts config **keys**, not default **values**; unaffected by the default change |
| `evals/develop-batch/protocol/skill-shape.test.mjs` | PASS — same |
| Bundle sync (`npm run bundle`) | PASS — all skills in sync; shared edits propagated to `references/` |
| `access-config-parity` | PASS — see note |

**Note on a transient failure.** An earlier full run failed `access-config-parity` alongside six `spawnSync … ETIMEDOUT` warnings. It passed in isolation with zero timeouts, and the clean run on an idle machine is green. Resource contention from concurrent test runs, not a regression — nothing in this change touches access-config resolution. Verified rather than assumed.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci                                                    # 2092 pass / 0 fail, exit 0
node --test evals/shared/tests/ci-gate-parity.test.mjs        # 8/8
node --test shared/resources/tests/access-config-parity.test.mjs  # isolation re-run, exit 0
node skills/qa-task/references/qa-execute-snippets.mjs --file <each> --json
npm run bundle                                                # all in sync
```

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-75-001** — reorder/renumber the fast-gate block so it follows the no-change check.

### Short-term Actions (Non-Blocking)

1. File a general bug for the `qa-execute-snippets.mjs` symlink entrypoint no-op; fix is to copy `select-next.mjs`'s `isInvokedDirectly()`.
2. Consider giving `develop-bug`'s per-cycle fix loop the same fast gate — its develop loop already has it.
3. Have the parity test flag, rather than drop, a workflow step naming an unknown script.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One MEDIUM finding in the change set (block ordering). No HIGH findings in scope, all four NFRs PASS, every success criterion verified, full gate green and the new contract test genuinely mutation-proved. The concern is small and mechanical; the underlying work is sound and unusually well evidenced.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL — resolve TASK-75-001, then merge.

---

**Next Steps**: `/qa-fix` addresses TASK-75-001, then re-review.
