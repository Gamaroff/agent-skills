# QA Report: Task 164 - Close task.163's deferred follow-ups

**Task**: [Link to task document](./task.164.task-163-deferred-follow-ups.md)
**Gate File**: [task.164.gate.1.task-163-deferred-follow-ups.yml](./task.164.gate.1.task-163-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Testing Completed**: 2026-09-28
**Gate Status**: CONCERNS

---

## Executive Summary

All five follow-ups are implemented, and each new or changed guard goes red under its named mutation (6/6, re-run independently for this review). The independent diff review found one real defect in the deliverable. The banner doc's derivation rule now contradicts itself about HALT blocks: the re-prompt clause says it is the one exception and that every other firing point follows `current_step`, and the new HALT rule directly after it overrides that at lock 8. Three LOW findings ride along.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (QA-164-1 resolved)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (none to an interface; one printed-output change stated)
- [x] Code on feature branch with open PR (#508, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools: 4 phases in a single area (`shared/resources/`), low risk. The one exception is the Step 3b diff review, which a read-only Explore subagent ran independently over the whole branch diff (`origin/develop...HEAD`, 12 files, 907 diff lines). This is the first review (no prior gate), so no re-review scope applies.

Step 4b: not applicable, because the change set has no runnable prose. The one changed `shared/resources/*.md` (the banner doc) has no fenced bash block. The engine confirmed it: 0 runnable, 0 placeholder, 0 mutating, no findings.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The banner doc defers and names the halting step | CONCERNS | Verified | Both changes are present. The HALT rule contradicts the carve-out sentence before it (QA-164-1). The HALT example is story/task-specific (QA-164-2) |
| Phase 2: The tests compare what they claim to compare | CONCERNS | Verified | The banner test, HALT pin and non-comment floor are all present and all mutation-proven. The no-restatement check covers the exception span only (QA-164-3) |
| Phase 3: Scenario 4b's arms are reachable from a committed test | CONCERNS | Verified | The seam, `SKIP` line and three cases are present and green. A spawnSync timeout would report as a bare `null` status (QA-164-4) |
| Phase 4: Proof and gates | PASS | Verified | Mutations 6/6 red. `ci:fast`, `lint:shell` and `bundle:check` are green (from the develop record, and re-run below where cheap) |

**Overall Phase Completion**: 4/4 implemented; 3 carry open findings.

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Exception carries neither hook fragment; test red if one returns | red on restatement | M1 red ("restates the hook (\"Step 7 unverified\")") | PASS |
| Exception says to resolve into `- Step N:` lines; pinned | red on drop | M2 red | PASS |
| `--complete` floor fails below 2 non-comment lines | red | M3 red; the old all-lines floor would still have counted 4 | PASS |
| HALT rule names the halting step, with the Step 7-tail at lock 8 case; pinned | red on revert | M4 red. The wording contradicts the carve-out (QA-164-1) | CONCERNS |
| Missing command → exit 1 + named setup line; asserted | red | M5 red | PASS |
| Builtin → exit 0 + `SKIP` line; red if linked | red | M6 red | PASS |

**Performance:** the new test runs the lock test file three times (13–16s each, measured). No production path changes. PASS.

**Code Quality:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `ci:fast` with `.agents/skills` aside | 0 fail | 4337 pass, 0 fail, 1 skipped (develop record) | PASS |
| `lint:shell` / `bundle:check` | pass | rc 0 / rc 0 (develop record) | PASS |
| `npm run validate` on changed skills | pass | develop-bug, develop-story, develop-task: rc 0 (this review) | PASS |
| Mutations under bash, `cmp` restore | as stated | 6/6 red, all restores `ok`, tree unchanged (this review) | PASS |

**Migration:** the CHANGELOG `[Unreleased]` › Fixed entry cites (task 164). PASS.

---

## Breaking Changes Validation

### Breaking Change: HALT position line on a Step 7-tail HALT at lock 8
Documented: Yes (task §5)
Migration Path Provided: N/A — printed output, not a parsed contract
Migration Tested: N/A
Consumer Code Updated: N/A
Notes: `halt_step` in the halt snapshot is untouched (verified: the diff does not touch the resume contract or any HALT `jq` block).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: The banner doc's derivation rule contradicts itself about HALT blocks (QA-164-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: none filed. The finding is carried in the gate's `top_issues[]` and goes straight to this pipeline's `/qa-fix` step
- **Observation**: `develop-pipeline-remaining-work-banner.md:82-94`. The clause opens "**One exception: a Stop-hook re-prompt.**" and ends "Every other firing point, including the ordinary Step 7 → 8 transition, follows this rule". The next sentence, "**A HALT names the step that halted.** … not at `current_step`", is a second exception. The pre-change text carved "a Step 8 HALT" into "follows this rule". Removing that phrase without carving HALTs out left the two sentences in conflict.
- **Impact**: an orchestrator reading the rule in order can take either reading at a Step 7-tail HALT, and that HALT is the case the task exists to fix.
- **Recommendation**: exclude HALT blocks from the carve-out explicitly (or list both exceptions together), and pin the new wording in the banner test.
- **Priority**: P2

### LOW Severity Issues (3)

- **QA-164-2**: the HALT example `Step 7/8 — FINALISE ❌ halted` is the story/task name. develop-bug calls Step 7 "FINALISE & CLOSE" (`develop-pipeline-on-stop.sh:183`; this doc's own variant line 123: "finalise & close bug"), and the pin hard-codes the story/task string.
- **QA-164-3**: the no-restatement check reads only `exception[2]`. A hook fragment placed in the HALT sentence or elsewhere in the doc passes. Today neither fragment appears anywhere in the doc (`grep -c` = 0), so this is a test-strength gap, not a live defect.
- **QA-164-4**: `runLockTests` uses `spawnSync`, which blocks the event loop, so `node:test`'s `{ timeout }` cannot fire. On a spawnSync timeout the helper returns `status: null` and discards `r.signal` / `r.error`, and the failure reads as `null !== 0`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
No production code changes. The test suite gains about 45s: three runs of the lock test file at 13–16s each (CR-5, routed to `recommendations.future`).

### Reliability — PASS
`develop-pipeline-on-stop.sh` is unchanged (diff confirms). The HALT rule is scoped to printed output, and `halt_step` is not touched.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The change set adds no function that accepts or rejects untrusted input. Candidate considered: scenario 4b's `case "$p"` over `command -v` output. It classifies, but it lacks the boundary signal: its "refusal" is a test `fail`, not a guard in front of an action, and its input is a test-only environment variable read by the test file alone.

### Maintainability — CONCERNS
The rule a reader executes states two conflicting things about HALT blocks (QA-164-1).

---

## Code Review

Step 3b: an independent Explore reviewer read the whole branch diff. It was advisory except for high-confidence bugs (`code_review_blocking=true`). **No finding met that bar**, so nothing was promoted mechanically. QA independently verified CR-1 to CR-4 against the files and raised them as QA findings (QA-164-1 to QA-164-4). Provenance: all four are introduced by this branch. CR-1 is caused by the removal of "and a Step 8 HALT" in this diff, so none is pre-existing.

**Correctness bugs (2):**
- [medium/medium] `shared/resources/develop-pipeline-remaining-work-banner.md:87` — the re-prompt clause says "One exception" and "every other firing point follows this rule", while the new HALT rule is a second exception → carve HALTs out, and pin it (→ QA-164-1)
- [low/medium] `shared/resources/develop-pipeline-remaining-work-banner.md:93` — the HALT example uses the story/task step name, but develop-bug's is "FINALISE & CLOSE" → generalise the example or mark it story/task (→ QA-164-2)

**Cleanups (3):**
- `shared/resources/tests/step-8-completion-checklist.test.mjs:807` — the no-restatement check covers only the exception span → check the whole doc (→ QA-164-3)
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs:30` — the node:test timeout cannot fire over `spawnSync`, and a timeout reads as `null` → surface `signal`/`error` (→ QA-164-4)
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs:22` — three full runs of the lock test file add about 45s to `npm test` → early-exit seam or split 4b (→ `recommendations.future`)

**Mutation-proof spot check (this review, re-run independently, `cp` snapshots, `cmp` restore, tree unchanged afterwards):**

- mutation-proven: task.163 lock-8 restatement restored → banner test → covered
- mutation-proven: `- Step N:` instruction dropped → banner test → covered
- mutation-proven: ALREADY_DONE stops naming `--complete` → population floor → covered
- mutation-proven: HALT rule reverted to `current_step` → HALT pin → covered
- mutation-proven: 4b empty arm made a skip → 4b missing-command test → covered
- mutation-proven: 4b links a builtin → 4b builtin test → covered

Platform variance: not applicable. No environment-derived value reaches a validating consumer in this diff. The 4b fixture uses `mktemp -d` only as scratch.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `advance-pipeline-lock.test.sh`, no override | 95/0 (develop record; the unset-seam case re-asserts both no-jq PASS lines) |
| `step-8-completion-checklist.test.mjs` | 91/91 |
| Bundled banner copies (develop-bug/story/task) | identical to source, `bundle:check` rc 0 |
| Stop hook | unchanged |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/develop-pipeline-remaining-work-banner.md`
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `shared/resources/advance-pipeline-lock.test.sh`
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`
- `shared/resources/develop-pipeline-on-stop.sh` (read-only reference)
- `CHANGELOG.md`

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-remaining-work-banner.md --json
npm run validate -- skills/develop-bug/     # rc 0
npm run validate -- skills/develop-story/   # rc 0
npm run validate -- skills/develop-task/    # rc 0
bash <scratchpad>/mutations.sh              # M1–M6, each 1 fail, restores ok
```

### Coverage Report
Not applicable. The change is prose and test code; coverage is shown by mutation instead (6/6 covered).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-164-1: carve HALT blocks out of the derivation rule's "every other firing point" sentence, and pin it.

### Short-term Actions (Non-Blocking)
1. QA-164-2, QA-164-3, QA-164-4 (LOW): fold them into the same fix cycle; each is a few lines.
2. CR-5: reduce the 4b meta-test's cost (future).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one MEDIUM finding in the deliverable's own rule text. No HIGH findings; NFRs are PASS except Maintainability (CONCERNS).
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-164-1 resolved

---

**QA Report**: co-located at `task.164.qa.1.task-163-deferred-follow-ups.md`
**Gate File**: co-located at `task.164.gate.1.task-163-deferred-follow-ups.yml`
**Next Steps**: `/qa-fix` for QA-164-1 to QA-164-4, then a QA cycle 2 refute pass.
