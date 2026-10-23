# QA Report: Task 213 - loop-supervisor: an engine registry (claude, agy) and a --model flag (cycle 2)

**Task**: [Link to task document](./task.213.loop-supervisor-engine-registry-and-model-flag.md)
**Gate File**: [task.213.gate.2.loop-supervisor-engine-registry-and-model-flag.yml](./task.213.gate.2.loop-supervisor-engine-registry-and-model-flag.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Re-Review Context

Previous gate: [gate 1](./task.213.gate.1.loop-supervisor-engine-registry-and-model-flag.yml), CONCERNS 90/100, at head `a31d73ce`.

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-213-BUG-1: three `claude -p` lines lack the default qualifier on the line | MEDIUM | ✅ FIXED | The criterion search, filtered to lines carrying neither `by default` nor `agy`, gives 3 at `a31d73ce` and 0 at `f982c944`. Bug report closed. |
| CR-2 (cycle 1): `dryRun` helper `spawnSync` had no timeout | LOW (advisory) | ✅ FIXED | `run-loop.test.mjs` now passes `timeout: spawnBudget("LOOP_SUPERVISOR_DRY_RUN").timeoutMs` |
| Stale comment `run-loop.mjs:1093` | LOW (advisory) | ✅ FIXED | It now reads `resolveBinary(engine.binary)` |
| CR-1 (cycle 1): agy `init` conversation id fallback | MEDIUM (advisory) | ❌ NOT FIXED (deferred) | Still advisory; re-raised as cycle-2 CR-2 |

---

## Executive Summary

Cycle 2 re-reviewed PR #716 at `f982c944`. The review was a refute pass over the whole branch diff, done by an agent that did not write the code. The cycle-1 bug is fixed. The refute pass found two more claims about the agy engine that are false. Both are documentation, both low severity, both high confidence, so both are promoted to the gate as LOW entries. Every NFR passes and nothing is medium or high.

**Overall Assessment**: PASS (2 open LOW entries)
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#716, OPEN at `f982c944`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing
- [ ] Performance Testing (no runtime change since gate 1)
- [x] Regression Testing
- [x] Security Review (probe re-run, measured)
- [x] Code Review (Step 3b refute pass)

### Review Methodology

Direct tools plus one read-only Explore reviewer. This is a re-review.

- **Re-review scope**: unscoped. This is cycle 2, so Step 3b ran the refute pass over the whole `origin/develop...HEAD` diff (2,809 lines). `SAFETY_REPROBE=false`: clause 1 is false, and clauses 2 and 3 do not hold because gate 1 had no safety finding.
- **Reviewer timing**: dispatched 07:18:02Z; the completion notice reports `duration_ms` 148839 (149 s).
- **Step 4b**: re-ran on both changed `SKILL.md` files. Changed fenced blocks: 0. File level: 2 and 16 blocks, all `mutating`, note `no-executable-blocks`. No findings.
- **Uncommitted changes outside the work item**: none. One untracked leftover, `tests/fixtures/shell-fn/.t140-gh-more-nFpYmQ/`, is unrelated to this change and was not in the review.

---

## New Findings This Cycle

- **[low/high]** `skills/loop-supervisor/SKILL.md:3` — CR-4: the description says the agy path runs with a pinned session id. agy is `pinnedSession: false`. → Limit the claim to claude. Promoted as TASK-213-QA2-CR4.
- **[low/high]** `skills/develop-next/SKILL.md:679` — CR-5: "every line of which is reopenable with `claude --resume <sessionId>`" is false for agy rows. → Name `agy --conversation <id>` and the null case. Promoted as TASK-213-QA2-CR5.
- **[medium/medium]** `skills/loop-supervisor/scripts/run-loop.mjs:370` — CR-1: config `loopSupervisor.model` and `loopSupervisor.effort` reach whichever engine `--engine` selects. Advisory.
- **[medium/medium]** `skills/loop-supervisor/references/engines.js:151` — CR-2: there is no agy `init`-line conversation-id fallback. This repeats cycle-1 CR-1. Advisory.
- **[medium/low]** `skills/loop-supervisor/references/engines.js:129` — CR-3: it is not measured whether agy resolves `/develop-next` in print mode. Advisory.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Verify `agy` | PASS | Verified | Unchanged since gate 1. CR-3 notes one fact Phase 0 did not measure (advisory) |
| Phase 1: Registry, `claude` only | PASS | Verified | Unchanged |
| Phase 2: Flags, config, refusals | PASS | Verified | Unchanged. CR-1 is advisory |
| Phase 3: `agy` entry | PASS | Verified | Unchanged |
| Phase 4: Tests + doc sweep | CONCERNS | Partial | BUG-1 fixed. Two agy claims remain (CR-4, CR-5, LOW) |

**Overall Phase Completion**: 4/5 PASS, 1 with LOW entries

---

## Success Criteria Verification

Unchanged from [QA report 1](./task.213.qa.1.loop-supervisor-engine-registry-and-model-flag.md) except the rows below. No runtime code changed in `f982c944`, so every behaviour criterion keeps its committed test and its cycle-1 mutation proof.

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Every `claude -p` line names it as the default | all matched lines | all matched lines | PASS | The search returns 9 lines, and each carries `by default` or names `agy` |
| Full `npm test` passes | 0 fail | 0 fail | PASS | `npm run ci:fast` exit 0 on the tree committed as `f982c944`: 6,122 pass, 14 skipped |
| `npm run validate -- skills/loop-supervisor/` | pass | ✓ | PASS | Re-run after the fix, together with `skills/develop-next/` |

---

## Breaking Changes Validation

Unchanged from QA report 1: both breaking changes are documented, with migration paths. **Overall:** PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None in the gate. The three medium-severity reviewer findings are not high-confidence, so they stay advisory.

### LOW Severity Issues (2)

- TASK-213-QA2-CR4: the skill description's pinned-session claim covers agy.
- TASK-213-QA2-CR5: the develop-next resume sentence covers agy rows.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
No runtime change since gate 1, so its −3% measurement stands.

### Reliability — PASS
The fail-closed parser and the pre-spawn refusals are unchanged. CR-1 and CR-2 are advisory follow-ups.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (`task.213.qa.2.security.run.json`, `totals.executed`); escaped: 0
- `boundary: true`. `resolveEngine` was re-probed with the cycle-1 cases (`task.213.qa.1.resolve-engine-cases.json`). Verdict `engages`.

### Maintainability — PASS
The cycle-1 cleanups landed. Two LOW doc claims are open.

---

## Code Review

`code_review_blocking=true`. Two findings are `bug` with `confidence: high` (CR-4, CR-5), and both are promoted as LOW `top_issues`. The rest are advisory.

**Correctness bugs (5):**
- [medium/medium] `skills/loop-supervisor/scripts/run-loop.mjs:370` — Config model and effort apply to whichever engine is selected, so a claude id can reach agy. → Ignore them when `--engine` differs from `loopSupervisor.engine`, or key them by engine.
- [medium/medium] `skills/loop-supervisor/references/engines.js:151` — The agy session id comes only from the result line. → Add an `init`-line capture hook.
- [medium/low] `skills/loop-supervisor/references/engines.js:129` — agy handling of `/develop-next` in print mode is unmeasured. → Measure it, and refuse slash-command adapters on agy if it does not resolve them.
- [low/high] `skills/loop-supervisor/SKILL.md:3` — The pinned-session claim covers agy. → Limit it to claude. *(TASK-213-QA2-CR4)*
- [low/high] `skills/develop-next/SKILL.md:679` — The `claude --resume` claim covers agy rows. → Name the agy reopen path. *(TASK-213-QA2-CR5)*

**Cleanups (0).**

**Anchors**: `finding-anchors.js --rev HEAD`, reason `ok`. CR-4 is `unchecked-text` because its line is the long frontmatter description, which is clean; the others are `ok`.

**Provenance (5b)**:
- CR-5: the sentence is identical on base. But the task's Migration criterion and doc sweep cover claims that agy makes false, so it is in scope and stays in the gate.
- CR-4: the agy clause was added by this diff.

**Boundary record**: `boundary: true`. `task.213.qa.2.security.run.json`: `probes_executed: 12`, `escaped: 0`, control `resolveEngine` at `skills/loop-supervisor/scripts/run-loop.mjs:1103`, verdict `engages`.

**Mutation proofs (this cycle's fixes)**:
- mutation-proven: the `by default` qualifiers → none; no committed test reads these lines, and the evidence is the criterion search, calibrated at 3 → 0 → `not-run`
- mutation-proven: the `dryRun` spawn timeout → none; it bounds a hang, and only a staged hang could turn a test red → `not-run`
- mutation-proven: comment refresh → n/a; it changes no behaviour → `not-run`

The ten runtime proofs from cycle 1 (10/10 `covered`) still hold, because `engines.js` and the logic in `run-loop.mjs` are unchanged.

**Platform variance**: not applicable. No environment-derived value reaches a validating consumer.

---

## Regression Testing

| Area | Result |
| --- | --- |
| loop-supervisor unit suites | PASS — 216 pass, 0 fail, after the fix |
| Whole repository (`ci:fast`) | PASS — exit 0 |
| `test-harness-concurrency`, `bundled-links` | PASS — 25/25 |

---

## Test Artifacts

### Files Reviewed
The full branch diff (33 files), with emphasis on cycle-1 fix `f982c944`.

### Test Commands Executed
```bash
git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks
command node --test evals/loop-supervisor/unit/*.test.mjs
command node --test tests/test-harness-concurrency.test.js tests/bundled-links.test.js
npm run ci:fast
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/loop-supervisor/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/develop-next/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'skills/loop-supervisor/references/engines.js#resolveEngine' --cases-file docs/tasks/task.213.loop-supervisor-engine-registry-and-model-flag/task.213.qa.1.resolve-engine-cases.json --record docs/tasks/task.213.loop-supervisor-engine-registry-and-model-flag/task.213.qa.2.security.run.json --name resolveEngine --json
```

### Coverage Report
No coverage tooling for these `node --test` suites, so coverage was not measured.

---

## Recommendations

### Immediate Actions (Blocking)
None blocking. The two LOW entries are open in the gate queue:
1. CR-4: limit the pinned-session claim to claude.
2. CR-5: name the agy reopen path in the develop-next sentence.

### Short-term Actions (Non-Blocking)
1. CR-1: per-engine config model and effort.
2. CR-2: agy `init`-line conversation id.
3. CR-3: measure agy slash-command handling.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No high or medium entry, and every NFR passes. The two open LOW entries are documentation claims about agy.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.213.qa.2.loop-supervisor-engine-registry-and-model-flag.md`
**Gate File**: co-located at `task.213.gate.2.loop-supervisor-engine-registry-and-model-flag.yml`
**Next Steps**: The QA loop routes this gate by its queue.
