# QA Report: Task 182 - reenter-qa refusal diagnostics and the qa_reentry reader population

**Task**: [Link to task document](./task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)
**Gate File**: [task.182.gate.2.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml](./task.182.gate.2.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate 1](./task.182.gate.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml), CONCERNS 90, head `b7d7661e`. Fix commit `4eb35d36`.

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-182-001 (hooks doc: both re-entry scripts set `qa_phase` 5a) | ⚠️ PARTIAL | Fixed in the hooks doc and both SKILL.md; the pause reference's lock schema (`develop-pipeline-pause.md:113`) still states it → TASK-182-003. Bug report task.182.bug.1 reopened. |
| TASK-182-002 (vacuous detector sub-field check) | ✅ FIXED | The check reads the `concern` template; stripping it → parity red |
| CR-3 cycle 1 (SKILL.md never-step-7 example) | ✅ FIXED | Both SKILL.md name `git-unreadable`; dropping it → refusal-parity red |
| CR-4 cycle 1 (git error text not asserted) | ✅ FIXED | Restoring `2>/dev/null` → "git status fails — git's error" red |

---

## Executive Summary

QA cycle 2, a full-branch refute pass at `4eb35d36`. Cycle 1's fixes hold and are mutation-proven. The refute pass found that the `qa_phase` writer claim cycle 1 corrected is still false at a fourth site, the pause reference's lock schema, which no parity assertion covers. Four lower-confidence findings and two cleanups refine the same rules.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#642)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (shell-argv probe)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools, plus one read-only Explore code reviewer with the cycle-2 REFUTE PASS directive. Reviewer: 213.6 s (`duration_ms` 213595 from the completion notice).

Re-review scope: unscoped — cycle 2 refute pass over the whole `origin/develop...HEAD` diff (387-line patch; bundled copies and `docs/tasks/` excluded). `SAFETY_REPROBE=false` (clause 1 from gate 1).

Step 4b: both `skills/develop-{task,story}/SKILL.md` changed this cycle — 10 blocks each. One `execution-failure` per file (`cat .agents/skills/<skill>/SKILL.md: No such file`, lines 65 and 68) on an empty temp copy; 0 findings when re-run with `--copy-as skills/<skill>:.agents/skills/<skill>` — a seeding gap, not a prose defect. The diff touches lines 328 and 336 only.

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/develop-pipeline-pause.md:113` — the lock-schema `qa_phase` row still says both re-entry writers set `5a` → state the rule once, here, and cite it. **TASK-182-003.**
- **[medium/medium]** `shared/resources/develop-pipeline-resume-contract.md:702` — the `no-gate` route ("the next bullet") is step 7; with the relay, an operator who resolves an ambiguous gate after a code fix is sent to `/finalise` over an unreviewed head → route an ambiguity back to "run the script again". Advisory.
- **[low/medium]** `shared/resources/develop-pipeline-resume-contract.md:207` — the halt-7 bullet names only `uncommitted-fix` as never reaching step 7 → add `git-unreadable`. Advisory.
- **[low/medium]** `shared/resources/develop-pipeline-hooks.md:86` — "grant writes `5b` after a not-converging halt" is false with a live lock: `grant-qa-cycles.sh:178-183` reads `halt_reason` only from a snapshot it restores → 5b only on a not-converging restore. Advisory; verified by reading.
- **[low/medium]** `shared/resources/reenter-qa-after-finalise.sh:186` — a cwd outside `<doc-dir>`'s repository also reaches `git-unreadable` (`git status` exits 128 on an absolute exclude pathspec outside the repository — reproduced) → refuse it as a usage error first. Advisory.
- Cleanup — `skills/develop-task/SKILL.md:328` (and develop-story, step-5-6 doc): the option "Resume at 5a with {k} more cycles" contradicts the 5b re-entry → relabel.
- Cleanup — `CHANGELOG.md:128`: "six readers" — the test classes them as two readers and four describers.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | Suite 59/59 |
| Phase 2: The script | PASS | Verified | CR-5 advisory |
| Phase 3: The reader population | CONCERNS | Verified | TASK-182-003 |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Three `no-gate` causes relay their reason | PASS | `expect_gate_cause` ×3 |
| `git-unreadable` before any write | PASS | stub case + git-error assertion |
| Contract list = script reasons | PASS | `reenter-qa-refusals-parity.test.mjs` |
| Hooks doc and detector name `qa_reentry`; hooks doc names both `qa_max_cycles` writers | PASS | parity test (the `qa_phase` claim is TASK-182-003) |
| Gate-read additions only `mktemp`/`sort`/`rm` | PASS | `reenter-qa-after-finalise.sh:169-172` |
| ShellCheck, Prettier, `npm test`, `bundle:check` | PASS | `ci:fast` 5424/0 at `4eb35d36` content; ShellCheck clean |
| Standards-named validation | PASS | `npm run validate` 6/6 skills |
| CHANGELOG cites task 182 | PASS | CR-7 wording advisory |

---

## Breaking Changes Validation

None. **PASS (N/A).**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the pause reference still says both re-entry writers set `qa_phase` to `5a`**
- **Severity**: MEDIUM
- **Bug Report**: [task.182.bug.1.hooks-doc-qa-phase-writer-claim.md](./task.182.bug.1.hooks-doc-qa-phase-writer-claim.md) (reopened)
- **Observation**: `develop-pipeline-pause.md:113`.
- **Impact**: The lock schema is the reference the resume detector and operators read; it states the wrong phase for a not-converging restore.
- **Recommendation**: One statement of the rule in the lock schema; the other sites cite it; a parity test over every describer.

### LOW Severity Issues

CR-3, CR-4, CR-5 (advisory, above).

**Total Issues**: HIGH: 0, MEDIUM: 1 (+1 advisory medium-confidence), LOW: 3

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 — `task.182.qa.2.security.run.json`, 0 reproduced, 0 escapes.
### Maintainability — CONCERNS
TASK-182-003.

---

## Code Review

Anchors: `finding-anchors.js --rev HEAD` — all 7 resolve. `code_review_blocking=true`. **boundary: true**, `probes_executed: 8`.

**Correctness bugs (5):** CR-1 [medium/high] **promoted: TASK-182-003**; CR-2 [medium/medium], CR-3, CR-4, CR-5 [low/medium] advisory (listed under New Findings).

**Cleanups (2):** CR-6, CR-7.

**Mutation proofs** (cycle 1 fixes; cp snapshot, restored):

- mutation-proven: `2>/dev/null` restored on the git status read → "git status fails — git's error" red → covered
- mutation-proven: hooks sentence reverted to "both set it to `5a`" → parity red → covered
- mutation-proven: detector concern stripped to "qa_reentry: re-entered" → parity red → covered
- mutation-proven: `git-unreadable` dropped from develop-task SKILL.md → refusal-parity red → covered
- mutation-proven: develop-story SKILL.md grant sentence reverted → parity red → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Re-entry suite | PASS (59/59) |
| Parity tests | PASS (12/12) |
| `ci:fast` | PASS (5424/0) |

---

## Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
command node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs evals/shared/tests/reenter-qa-refusals-parity.test.mjs
npm run validate -- skills/<s>/   # six changed skills
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh' … --record <work-item>/task.182.qa.2.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/<skill>/SKILL.md --copy-as skills/<skill>:.agents/skills/<skill> --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — TASK-182-003 closed.

**Next Steps**: `/qa-fix` cycle 2. Both cycles so far have found a describer of the same rule that the previous pass missed; consolidate the rule into one statement with citations rather than patching another site.
