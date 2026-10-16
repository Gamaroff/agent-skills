# QA Report: Task 189 - Read-only agents never write (cycle 3)

**Task**: [Link to task document](./task.189.read-only-agents-never-write.md)
**Gate File**: [task.189.gate.3.read-only-agents-never-write.yml](./task.189.gate.3.read-only-agents-never-write.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| CR2-1 probe severities merged by case id | ✅ FIXED | run-unique `key`; test with two controls sharing ids (D1 red); bug.4 closed |
| CR2-2 corrected-plan re-run drops probes | ✅ FIXED | whole-plan rule in Step 3b.1, pinned by the contract test (D5 red) |
| CR2-3 null record reads as 0 | ✅ FIXED | `record-unreadable` (D2 red) |
| CR2-4 unbounded engine run / `--timeout` | ✅ FIXED (per entry) | owned `--timeout` (D3 red), per-run bound (D4 red); the whole-plan bound is QA3-1 below |
| CR2-5 `totals.executed` wording | ✅ FIXED | prompt reworded |

---

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md` Step 3b.1 item 2 — the plan runs as one foreground call that the host stops at 120–600 s, while each entry may take up to 20 minutes; a killed call leaves `probe-plan-result.json` empty with no stated meaning. **QA3-1, promoted by QA** from reviewer CR-1 (medium/medium) — [task.189.bug.5.step-3b1-foreground-run-outlives-tool-call.md](./task.189.bug.5.step-3b1-foreground-run-outlives-tool-call.md)
- **[low]** `shared/resources/security-probe-plan.mjs` — inline `cases` with a repeated id give two probes one key (CR3-2)
- **[low]** `shared/resources/finalise-dod-security-prompt.md:189`, `:357` — owned-argument lists omit `--emit-block`; nothing checks them against `OWNED_FLAGS` (CR3-3)
- **[low, future]** `shared/resources/security-probe-plan.mjs:272` — SIGKILL on timeout skips the engine's sandbox cleanup (CR3-4; the engine has no SIGTERM handler — engine scope)

---

## Executive Summary

Scoped re-review of commit `815f45b8` (head `815f45b8b68e`). Every cycle-2 finding is fixed and mutation-proven. The new boundary flags hold under the engine. One reliability medium remains on how Step 3b.1 is run, plus two cheap lows.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head cb79ae69e3e5; 16 files) — default. `SAFETY_REPROBE=false` (clause 1 false; clauses 2–3 judged not to hold — no safety-axis FAIL). One Explore reviewer, 89 s (completion notice). Run directly from the loaded `/qa-task` instructions (the skill text was already in this session's context; not re-invoked).

---

## Success Criteria Verification

Unchanged — all PASS. `npm run ci:fast` 5804/0 at `815f45b8`.

---

## NFR Assessment

### Security — PASS
- **Evidence**: measured
- **Probes executed**: 28 (record `task.189.qa.3.security.run.json`)
- `planArgvAllowed` 20 cases (cycle-2 set + `--timeout` separate and `--timeout=`): engages. Matrix block 8 cases: engages.

### Reliability — CONCERNS
QA3-1.

### Performance — PASS / Maintainability — PASS

---

## Code Review

**Correctness bugs (4):** CR-1 [medium/medium] → promoted as QA3-1; CR-2 [low/medium] → CR3-2; CR-3 [low/medium] → CR3-3; CR-4 [low/medium] → future (CR3-4). Anchors checked with `finding-anchors.js`: 4/4 `ok`.

Cycle-2 fix proofs (5b, committed tests): D1 key → read-only-agent-writes → covered; D2 null record → covered; D3 `--timeout` owned → covered; D4 overall bound → covered; D5 whole-plan → finalise-dod-prompt-contract → covered. 5 of 5.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: `/qa-fix` cycle 3
