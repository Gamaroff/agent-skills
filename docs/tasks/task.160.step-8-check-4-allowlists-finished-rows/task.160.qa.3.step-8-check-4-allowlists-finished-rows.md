# QA Report: Task 160 - Step 8 check 4 allowlists finished rows instead of denying two unfinished ones (cycle 3)

**Task**: [task.160.step-8-check-4-allowlists-finished-rows.md](./task.160.step-8-check-4-allowlists-finished-rows.md)
**Gate File**: [task.160.gate.3.step-8-check-4-allowlists-finished-rows.yml](./task.160.gate.3.step-8-check-4-allowlists-finished-rows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: FAIL

---

## Executive Summary

The core deliverable, check 4's allowlist, stays correct and measured. Cycle 2's fix for the resume signal does not hold. It verified a ✅ Step 8 against git, but the PreCompact hook commits and pushes the report itself, so a pause inside Step 8 leaves exactly the git state the check accepts as finished. The HIGH count went `0, 0, 1`, which trips the Convergence check. Each fix to the Step 8 ordering has exposed another reader of the Step 8 row. The remaining question is a design decision, not another patch.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 1, medium): four Step 8 restatements prescribed a post-push update | FIXED | `e299eae7`; guard tests hold |
| CR2-1 (cycle 2, medium): a ✅ Step 8 row read as done after a HALT or pause inside Step 8 | **PARTIAL** | `b30a5ef6`: resume now verifies against git, but git cannot tell a paused Step 8 from a finished one (CR3-1) |
| CR2-2 (cycle 2, low): action-2 exact-match | FIXED | `b30a5ef6`; action 2 uses check 4's predicate; guard test holds |

---

## Testing Scope

### Review Methodology

Direct tools, plus one independent read-only reviewer (Explore, about 3.5 minutes).

Re-review scope: since 2026-09-27T11:22:43Z (default; `SAFETY_REPROBE=false` because the prior gate's security axis was PASS/measured). 18 files and a 897-line diff: `b30a5ef6`, excluding `docs/tasks`.

**Scoping correction.** The prior gates' `updated:` values had been composed by hand and lay in the future (12:00:00Z and 14:00:00Z, against a clock of 11:31:57Z). A `--since` on that value would have produced an empty review. Both were corrected from the files' measured mtimes before scoping, and this gate's value is from `date -u` (observation #182, recurrence).

Step 4b ran over the three orchestrator `SKILL.md` files (seeded with `--copy-as`) and over `develop-pipeline-resume-contract.md`, under bash and zsh. All had 0 findings.

---

## New Findings This Cycle

- **[high]** `shared/resources/develop-pipeline-resume-contract.md` (Phase 0b, Step 8) — **CR3-1.** `develop-pipeline-on-precompact.sh` § "Best-effort commit + push" runs `git add "$REPORT"`, `git commit` and `git push origin HEAD`. A pause after Step 8 sets its row ✅ therefore leaves a clean tree, HEAD equal to the remote and the PR head equal to HEAD. `verify-push-state` exits 0, and resume skips a Step 8 whose cleanup (step4 records, test logs, halt snapshot, lock removal) and Completion Checklist never ran. **Provenance: new to this branch** (cycle-2 fix). Verified by reading the hook.
- **[medium]** `shared/resources/tests/step-8-completion-checklist.test.mjs` (resume cases) — **CR3-2.** The stub's `headRefOid` returns `git rev-parse @{u}`, which repeats the remote check. The "pause before commit" fixture is a state the hook never leaves. Dropping `--pr` or `--scope` keeps every case green. Verified by reading the stub.
- Advisory, carried in `recommendations.future`: CR-3 (a checklist failure is fix-and-recheck, not a HALT), CR-4 (Phase 0b has no action for a ❌ row), CR-5 (a gh failure is treated as "re-run Step 8"), CR-6 (check 5 never binds `PR_NUMBER`, so the doc's "PR head" claim is false), CR-7 (the scope argument is unreachable after the Phase 0b working-tree probe).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Tests first | PASS | 78/78 |
| Phase 2: Allowlist check 4 | PASS | Probe engages 21/21 |
| Phase 3: Step 8 edits nothing after its commit | **FAIL** | The reordering removes the only resume signal; two fixes have not replaced it (CR3-1) |
| Phase 4: Proof and gates | PASS | Gates and CI green; the resume tests are vacuous (CR3-2) |

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
A pause inside Step 8 now resumes past an unfinished Step 8, leaving the lock and cleanup behind (CR3-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (from `task.160.qa.3.security.run.json` `totals.executed`)
- Engages; 12 hostile rows refused, 9 legitimate rows admitted, bash and zsh agree.

### Maintainability — PASS
The Step 8 restatements agree and are test-held.

---

## Code Review

**Correctness bugs (6):** CR3-1 [high/high, **gated**], CR3-2 [medium/high, **gated**], CR-3 [medium/medium], CR-4 [medium/medium], CR-5 [low/high], CR-6 [low/medium]. See New Findings above.
**Cleanups (1):** CR-7.

**Mutation proofs (cycle-2 fix, made during `/qa-fix`):** resume contract reverted → 6 red, covered. `❌ Failed` rule dropped → 1 red, covered. Action-2 exact match restored → 1 red, covered. Resume command made a no-op → 2 red, but the resume cases are **wrong-test-red** in substance: CR3-2 shows they pass without `--pr` or `--scope`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Checklist suite (bash + zsh) | PASS, 78/78 |
| CI on `b30a5ef6` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
gh pr checks 499
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry '.claude/state/t160-probe-wrapper.mjs#check4Admits' --cases-file .claude/state/t160-probe-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.160.step-8-check-4-allowlists-finished-rows/task.160.qa.3.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-resume-contract.md --json
```

Standards-named validation (`npm run validate` for the three develop skills) passed in `/qa-fix` and in CI.

### Coverage Report
Not applicable.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a HIGH resume defect introduced by the previous cycle's fix. The HIGH sequence `0, 0, 1` trips the develop-task Convergence check.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.160.qa.3.step-8-check-4-allowlists-finished-rows.md`
**Gate File**: co-located at `task.160.gate.3.step-8-check-4-allowlists-finished-rows.yml`
**Next Steps**: escalated to a person. See the implementation report's escalation entry.
