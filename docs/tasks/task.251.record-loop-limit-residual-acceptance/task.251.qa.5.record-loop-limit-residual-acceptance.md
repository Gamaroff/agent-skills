# QA Report: Task 251 - Record a loop-limit residual acceptance in one writer

**Task**: [Link to task document](./task.251.record-loop-limit-residual-acceptance.md)
**Gate File**: [task.251.gate.5.record-loop-limit-residual-acceptance.yml](./task.251.gate.5.record-loop-limit-residual-acceptance.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4's status-key fix holds. The reviewer ran 14 flow-entry shapes and found no input where the writer reports success over an entry that still reads open. One low residual remains: an empty status value is edited to `status:waived`, which a strict YAML parser reads as a single key. This is the last gate the budget allows, so the residual goes to Loop Escalation unfixed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`ready-for-review`)
- [x] All four phases ticked
- [x] Tests passing (`ci:fast` on the cycle 4 fix commit: exit 0, 0 failures)
- [x] Feature branch with open PR (#815)

### Testing Approach

- [x] Automated Testing (engine suite 31/31)
- [x] Security Review (probe engine, committed gate cases file)
- [x] Code Review (Step 3b)

### Review Methodology

Re-review, cycle 5. Re-review scope: files changed since gate 4 (head 70abf7ad39f4; 2 code files plus 2 bundled copies, 72-line patch) — default. One independent read-only Explore reviewer executed 14 flow-entry shapes and returned 1 finding (completion notice `duration_ms` 39633). QA reproduced it. Pipeline run: `code_review_blocking=true`.

Step 4b: not applicable. The cycle 4 fix commit changed no SKILL.md or shared prose.

CI on 2bd177d6bd2d: not read at gate time; `ci:fast` run locally on the working tree before the commit was green.

Loop route: cycle 5 is `QA_MAX_CYCLES`; the gate reads CONCERNS with one open entry, which routes to 5b, so the budget test sends it to Loop Escalation.

---

## Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T251-CR4-1 quoted status key | ✅ FIXED | a quoted key with no plain one is refused with nothing written; a quoted and a plain key are both waived |
| T251-CR4-2 duplicated status | ✅ FIXED | every top-level copy is waived |

Bug 6 is closed.

## New Findings This Cycle

- **[low]** `shared/resources/accept-qa-residual.js:206` — an empty status value is edited to `status:waived` → T251-CR5-1

Searched: files changed since gate 4.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The writer | CONCERNS | Verified | T251-CR5-1 |
| Phase 2: Lock re-entry | PASS | Verified | unchanged |
| Phase 3: Wire the option and prove the readers | PASS | Verified | unchanged |
| Phase 4: Bundle, sweep, release notes | PASS | Verified | bundled copies in sync |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Unchanged from cycles 1 to 4. `criteria-drift.js` clean. The two carried unverified criteria (5c lens trail rule; `npm run ci` wall time) stay named in the cycle 1 report.

---

## Issues Found

### LOW Severity Issues (1)

**Issue: T251-CR5-1 — empty status value**
- **Category**: Functional
- **Bug Report**: [task.251.bug.7.flow-empty-status-value-edited-to-invalid-key.md](./task.251.bug.7.flow-empty-status-value-edited-to-invalid-key.md)
- **Observation**: `- {id: X, status:}` becomes `- {id: X, status:waived}`; edit, ok true. The control with a value is edited correctly. The pipeline's own reader reads the entry as waived; a strict parser does not.
- **Recommendation**: emit `: waived` or refuse.
- **Priority**: P3

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (two advisories carried)

---

## NFR Assessment

### Performance — PASS
One linear scan per open entry.

### Reliability — CONCERNS
T251-CR5-1 reports success on an entry a strict parser reads with no status.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 7 (run record `task.251.qa.5.record-loop-limit-residual-acceptance.security.run.json`; `escaped: 0`)
- `boundary: true`. Criteria signal: `["refused","refuses"]`. The probe engine ran `planGateEdit` with the committed gate cases file: verdict `present-but-inert`, 1 hostile gate accepted (the empty status value), which is T251-CR5-1.

### Maintainability — PASS
The extent and the status-key match are each defined once.

---

## Code Review

**Correctness bugs (1):**
- [low/medium] `shared/resources/accept-qa-residual.js:206` — empty status value → T251-CR5-1

**Cleanups (0).**

Provenance: the file is added by this change; no base to compare against.
Anchor check: line 206 read; the candidate was reproduced by running `planGateEdit`.

mutation-proven: cycle 4's repeated-key waive disabled → its committed test went red → covered; the quoted-key match dropped → both quoted-key tests red → covered (performed by the fixer). No fix this cycle.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` on the cycle 4 fix | PASS (exit 0) |
| Engine suite | PASS (31/31) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/accept-qa-residual.js` (`waiveEntry`, `planGateEditRaw`), its test file.

### Test Commands Executed
```bash
command node --test shared/resources/tests/accept-qa-residual.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure --entry 'shared/resources/accept-qa-residual.js#planGateEdit' --args-json '[…]' --cases-file <cases.json> --record <run.json> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Emit `: waived` or refuse for an empty-value flow status (T251-CR5-1) — or accept it as a residual.

### Short-term Actions (Non-Blocking)
1. Timeout on the `qa-cycle.sh` spawn; audit text after a re-run.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One reproduced low defect in a flow-style shape the pipeline never writes; the loop budget is spent.
**Quality Score**: 92/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T251-CR5-1 fixed, or accepted by the owner as a residual.

---

**QA Report**: co-located at `task.251.qa.5.record-loop-limit-residual-acceptance.md`
**Gate File**: co-located at `task.251.gate.5.record-loop-limit-residual-acceptance.yml`
**Next Steps**: Loop Escalation (loop limit): the owner fixes the residual, accepts it, or grants more cycles.

---

## Evidence addendum — 2026-11-03 (added at `/finalise` DoD run 1; closes the criteria carried as UNVERIFIED in QA reports 1 and 2)

Measured on the PR head `2c4d3011`. This adds evidence only; gate 5 and the verdict above are unchanged.

### Lens trail rule C (AC "The lens does not raise the trail finding on a processed report")

A dry run of `pr-conformance-prompt.md` trail rule C over two copies of this task's directory.

| Fixture | Last `### QA Cycle` Action | Gate 5 | Result |
| --- | --- | --- | --- |
| Processed (the real directory after `accept-qa-residual`) | `Proceeding to 5c (PR conformance review)` | `WAIVED`, `waiver.active: true`, entry `waived` | `trail_rule_C_finding: not-raised` |
| Control (same copy, left unprocessed) | `Escalating — loop limit reached` | `CONCERNS`, `waiver.active: false`, entry `open` | `trail_rule_C_finding: raised` |

### Writer timing (AC "under 1 s on the task.250 gate and report")

The task.250 gate 5 and implementation report, reverted to their pre-acceptance shape (gate `CONCERNS`, two entries `open`, no waiver, last Action `Escalating — loop limit reached`), run against a scratch lock.

```
uptime  → 09:43:58 up 8 days, 19:45, load average: 3.98, 4.40, 4.00
time    → real 0m0.057s  user 0m0.036s  sys 0m0.021s   (reason=accepted, both entries waived)
uptime  → 09:43:58 up 8 days, 19:45, load average: 3.98, 4.40, 4.00
```

### `npm run ci` wall time (AC "within 5% of the develop baseline")

Both commits in a detached worktree beside the repository, `node_modules` linked, two runs each, all exit 0, the machine otherwise quiet. `uptime` was taken before each run.

| Commit | Run 1 | Run 2 | Mean | Load before run 1 / run 2 |
| --- | --- | --- | --- | --- |
| `develop` `17f43480` | 196 s | 196 s | 196 s | 4.03 / 7.20 |
| PR head `2c4d3011` | 198 s | 199 s | 198.5 s | 6.19 / 7.65 |

Rise: +2.5 s, **+1.3%**, inside the 5% bound. A first PR-head pair taken in the main checkout read 220 s and 229 s, but that checkout is not like the develop one (a different tree, plus a concurrent agent run), so it is not the comparison.

### Doc sweep (AC "every restatement of option 2 updated or cites the HALT; greps recorded")

```
git grep -n "Accept the current gate status" -- . ':(exclude)docs/tasks' ':(glob,exclude)skills/*/references/**'
→ 0 hits (7 hits in all, every one under docs/tasks)

git grep -n "option 2" -- docs shared skills ':!docs/tasks'
→ shared/resources/accept-qa-residual.{js,sh}, develop-pipeline-resume-contract.md:691,
  develop-pipeline-step-5-6-qa-loop.md:346, :412, :2155, :2160, skills/develop-{story,task}/SKILL.md:355/342,
  and the bundled references/ copies of those. Every hit states the accept path (task.251) or cites the HALT.
  docs/bugs/bug.2.* hits use "option 2" for an unrelated choice.
```
