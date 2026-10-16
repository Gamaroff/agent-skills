# QA Report: Task 189 - Read-only agents never write (cycle 6)

**Task**: [Link to task document](./task.189.read-only-agents-never-write.md)
**Gate File**: [task.189.gate.6.read-only-agents-never-write.yml](./task.189.gate.6.read-only-agents-never-write.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-17
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| ---------------- | ------ | -------- |
| CR5-1 BUDGET abort before stale result removed | ✅ FIXED | `rm -f` moved first; `:?` replaced by a warning branch (`67ea055e`). Mutation: re-adding the `:?` abort → CR5-1 test red → covered |
| CR5-3 killed-runner test reaches budget path by accident | ⚠️ PARTIAL | stand-in exports the bound and a wait stub is written, but the wait log is not asserted (CR6-3) |
| CR5-4 "item 2" ambiguous | ✅ FIXED | "Step 3b.1 item 2"; contract test updated |

bug.5 closed (Status History row added). Cycle 6 is a granted cycle (1 extra, budget 6).

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/tests/read-only-agent-writes.test.mjs:689` — the `2>/dev/null` added to the BUDGET one-liner (`skills/finalise/SKILL.md:552`) discards the only stderr an import-run-as-CLI would print, so the "no unknown argument" guard can no longer fail. **CR6-1, promoted** — [task.189.bug.6.argv-guard-blinded-by-stderr-redirect.md](./task.189.bug.6.argv-guard-blinded-by-stderr-redirect.md)
- **[medium/medium]** `skills/finalise/SKILL.md:556` — a runner that loads without a numeric `ENGINE_TIMEOUT_MS` (BUDGET `NaN`) is reported as "did not load" and then runs unmarked (CR6-2, advisory)
- **[cleanup]** `shared/resources/tests/read-only-agent-writes.test.mjs:552` — killed-runner test does not assert the wait log (CR6-3)
- **[cleanup]** `shared/resources/tests/read-only-agent-writes.test.mjs:747` — CR5-1 test accepts exit 0 and does not assert the wait log is only `--clear` (CR6-4)
- **[cleanup]** `skills/finalise/SKILL.md:555` — case pattern accepts `0`/leading zeros that `set-waiting-on.sh` rejects (CR6-5)

---

## Executive Summary

Scoped re-review of `67ea055e` (gate head `ad004b2c11fe`). Cycle 5's fix holds and is mutation-proven; boundaries engage (28 executed, 0 reproduced). One medium, in test machinery: the fix's stderr redirect blinded a cycle-4 assertion. The behaviour that assertion guarded is still held by other assertions (measured below).

**Overall Assessment**: CONCERNS · **Deployment**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools plus one Explore code reviewer (dispatched 22:36:57Z, `duration_ms` 130761). Anchors: 4 `ok`, 1 `unchecked-text`. Run from the loaded `/qa-task` instructions.

Re-review scope: files changed since gate 5 (head 74f9e5bc3987; 11 files) — default. `SAFETY_REPROBE=false` (clause 1 false; prior gate's security PASS, measured).

Step 4b: `skills/finalise/SKILL.md` — 39 blocks (0 runnable, 2 placeholder, 37 mutating), bash only (`zsh-unavailable`): `zero-blocks-executed` (medium, advisory), as in cycle 1. The edited Step 3b.1 block is executed directly by `read-only-agent-writes.test.mjs`.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: mapper returns its matrix | PASS | unchanged since cycle 2 |
| Phase 2: finalise runs the probe plan | CONCERNS | CR6-1 (test), CR6-2 (advisory) |
| Phase 3: guard test | PASS | unchanged |
| Phase 4: docs + contract tests | PASS | CR5-4 wording fixed |

**Overall Phase Completion**: 4/4 implemented; 1 with a medium finding.

---

## Success Criteria Verification

Unchanged from cycle 5 except Phase 2's Step 3b.1 block, now held by the CR5-1 regression test (covered). Targeted suites 56/56; `ci:fast` 5811 pass / 1 fail — the fail was `tests/bundle-missing-source.test.js` over its timing budget (53 s vs 20 s, `LOAD-SENSITIVE`) while this cycle's probes and mutations ran beside it; re-run alone 7/7 in 3 s. `npm run validate -- skills/finalise/` ✓.

---

## Breaking Changes Validation

N/A — none introduced this cycle.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: argv-order stderr guard is vacuous (CR6-1)**
- **Severity**: MEDIUM · **Category**: Quality (test machinery)
- **Bug Report**: [task.189.bug.6.argv-guard-blinded-by-stderr-redirect.md](./task.189.bug.6.argv-guard-blinded-by-stderr-redirect.md)
- **Observation**: the assertion reads `r.stderr`; the import it targets now writes to `/dev/null`.
- **Impact**: the guard cannot go red. Measured: swapping the argv order reds the budget assertion in the same test; an entry guard that always runs `main` reds the whole file. Neither red comes from line 689.
- **Recommendation**: assert something the redirect cannot hide.

### LOW Severity Issues (3)

CR6-3, CR6-4, CR6-5 — see New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1 (+1 advisory medium/medium), LOW: 3

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 28 (`task.189.qa.6.security.run.json`: matrix block 8, `planArgvAllowed` 20; 0 reproduced)

### Reliability — PASS
CR5-1 fixed. CR6-2 advisory: the shipped runner exports `ENGINE_TIMEOUT_MS`.

### Performance — PASS
Unchanged.

### Maintainability — CONCERNS
CR6-1.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `shared/resources/tests/read-only-agent-writes.test.mjs:689` — stderr guard blinded by `2>/dev/null` → assert something the redirect cannot hide (**promoted: CR6-1**)
- [medium/medium] `skills/finalise/SKILL.md:556` — NaN budget reported as "did not load", run goes unmarked → distinguish the cases

**Cleanups (3):**
- `shared/resources/tests/read-only-agent-writes.test.mjs:552` ⚠️ unverified anchor (unchecked-text) — assert the wait log in the killed-runner test
- `shared/resources/tests/read-only-agent-writes.test.mjs:747` — match a non-zero exit; assert wait log `["--clear"]`
- `skills/finalise/SKILL.md:555` — align the pattern with `set-waiting-on.sh` (`''|*[!0-9]*|0*`)

boundary: true — `planArgvAllowed` and the step-5 matrix block, both engage; probes_executed: 28 (copied from the record's `totals.executed`).

mutation-proven: re-add the `${BUDGET:?}` abort before the case → `a runner that fails to load still removes the stale result…(CR5-1)` → covered
mutation-proven: swap the import's argv order → `the block marks its own wait…(CR4-1, CR4-2)` → covered
mutation-proven: runner entry guard always true → whole file red (the test imports the runner) → wrong-test-red (line 689 is not what reds)

---

## Regression Testing

`ci:fast` (5811/1, the 1 load-sensitive and green alone). Probe engine controls unchanged and engaging.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/read-only-agent-writes.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
npm run ci:fast
command node --test tests/bundle-missing-source.test.js
npm run validate -- skills/finalise/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --json
node shared/resources/security-probe.mjs --entry 'fence:…#Write the matrix from the mapper'"'"'s reply' --slot '{doc-directory}' --sink filename --cases-file task.189.qa.1.security.cases.json --record task.189.qa.6.security.run.json --json
node shared/resources/security-probe.mjs --entry 'shared/resources/security-probe-plan.mjs#planArgvAllowed' --cases-file task.189.qa.3.security.cases.json --record task.189.qa.6.security.run.json --json
```

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment Recommendation**: CONDITIONAL (CR6-1)
**Next Steps**: the residue is test machinery only — the loop's route classifier decides between the diminishing-returns exit to 5c and `/qa-fix`.
