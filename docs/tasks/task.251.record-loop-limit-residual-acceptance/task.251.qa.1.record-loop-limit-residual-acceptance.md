# QA Report: Task 251 - Record a loop-limit residual acceptance in one writer

**Task**: [Link to task document](./task.251.record-loop-limit-residual-acceptance.md)
**Gate File**: [task.251.gate.1.record-loop-limit-residual-acceptance.yml](./task.251.gate.1.record-loop-limit-residual-acceptance.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-03
**Testing Completed**: 2026-11-03
**Gate Status**: CONCERNS

---

## Executive Summary

The writer, its wiring and its tests are in place and green. The independent code review plus QA
reproduction found three medium issues, all in `accept-qa-residual.js`. None blocks the main path
(task.250's shape is accepted and merges); each is a narrow input or contract gap.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`ready-for-review`)
- [x] All four phases ticked
- [x] Tests passing (`ci:fast`: 7147 tests, 0 failed)
- [x] Breaking changes: none
- [x] Feature branch with open PR (#815)

### Testing Approach

- [x] Automated Testing (engine 16, lock script 10, merge rule 3, parity 9, two replay evals)
- [x] Security Review (probe engine run, hand probes)
- [x] Regression Testing (`eval:all`, `validate:all`, `check:generated`, `bundle:check`, `lint:shell`, `lint:secrets`)
- [x] Code Review (Step 3b)

### Review Methodology

Direct tools plus one independent read-only Explore reviewer over the change set (2932-line patch,
docs and generated copies excluded). Dispatched with the shared prompt; returned 3 findings in about
25 s (completion notice `duration_ms` 24799). Pipeline run: `code_review_blocking=true`.

Step 4b: runnable prose changed in 3 files (`develop-task/SKILL.md`, `develop-story/SKILL.md`,
`develop-pipeline-resume-contract.md`). The one changed block in each is `mutating` (it writes the
gate and the lock), so it is not executed by design; its behaviour is covered by
`accept-qa-residual.test.sh`. `changed-blocks-not-executed`: 3 files, 1 block each. One
`execution-failure` at `develop-pipeline-resume-contract.md:492`: not a changed block, and the same
failure reproduces on `origin/develop` (pre-existing, recorded under `recommendations.future`).

CI on 4b8e8d22b25f: pending (CI_SUMMARY). Nothing in the gate.

---

## New Findings This Cycle

First review; every finding below is new.

- **[medium]** `shared/resources/accept-qa-residual.js:143` — a `{` anywhere on an entry's first line takes the flow branch → T251-QA-1
- **[medium]** `shared/resources/accept-qa-residual.js:439` — `--approved-by` not newline-folded → T251-CR-2
- **[medium]** `shared/resources/accept-qa-residual.js` (plan functions) — no `ok` field, probe cannot score refusals → T251-QA-2

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The writer | PASS | Verified | Engine, refusals, idempotence, states 3 and 6; 16 tests |
| Phase 2: Lock re-entry | PASS | Verified | Restore, qa_phase 5c only, other document's snapshot refused; 10 tests |
| Phase 3: Wire the option and prove the readers | PASS | Verified | Both SKILL.md, HALT messages, resume contract 3b, evals 18 and 13 |
| Phase 4: Bundle, sweep, release notes | PASS | Verified | `bundle:check` clean; sweep greps clean; CHANGELOG entry |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Criteria were verified from evidence (a named test or a cited line), not from checkboxes.

| Criterion | Evidence | Status |
| --- | --- | --- |
| task.250-shaped fixture: accepted, gate WAIVED, both entries waived, head unchanged, Action rewritten | `accept-qa-residual.test.mjs` "task.250 shape" | PASS |
| Refuses with exit 1 and writes nothing: FAIL, unreadable, not-converging, never escalated, no entry, no gate; empty approver exits 2 | same file, six `refuses:` cases plus CLI test | PASS |
| Second run `already`; Stop between the writes is finished | "second run returns already", "Stop between the gate write and the report write" | PASS |
| States 3 and 6 | "state 3", "state 6" tests | PASS |
| Lock: `qa_phase: 5c`, other fields unchanged; restore; other document refused | `accept-qa-residual.test.sh` (10 passes) | PASS |
| HALT messages and both Phase 0b blocks name the accept path; no `Accept the current gate status` outside docs/tasks and generated copies | `git grep` (Phase 4 sweep), both SKILL.md `:342` and `:355` | PASS |
| develop-next merge rule reads the written gate as mergeable; control HALTs | `accept-qa-residual-merge-rule.test.mjs` | PASS |
| Lens does not raise the trail finding on a processed report; control still raises it | not run this cycle | UNVERIFIED (5c is the lens; recorded for QA cycle 2 / 5c) |
| Writer under 1 s | 0.047 s measured in the implementation report; not re-measured with `uptime` on this head | PASS (measurement noted) |
| `npm run ci` wall time within +5% of baseline | not measured | UNVERIFIED |
| Each of the three mutations turns a named test red | done at develop time, recorded in the implementation report; not repeated this cycle (no fix to prove) | `dev-only` |

Two criteria are unverified (the lens trail rule and the `npm run ci` wall-time comparison). Neither is
a gate finding on its own; both are named so the next reader does not assume they were checked.

---

## Breaking Changes Validation

None. The change adds a writer and an option; no existing interface changes.

---

## Issues Found

### MEDIUM Severity Issues (3)

**Issue: T251-QA-1 — block-style entry with a brace is waived wrongly, and the writer reports accepted**
- **Category**: Functional
- **Bug Report**: [task.251.bug.1.block-entry-with-brace-waived-wrongly.md](./task.251.bug.1.block-entry-with-brace-waived-wrongly.md)
- **Observation**: Reproduced. `- id: "X {y}"` becomes `"X {y, status: waived }"`, `status: open` stays, result `accepted`.
- **Impact**: the accepted gate still holds an open finding; the id is corrupted.
- **Recommendation**: flow branch only when the text after the dash starts with `{`; control test.
- **Priority**: P2

**Issue: T251-CR-2 — `--approved-by` is not newline-folded**
- **Category**: Security / robustness
- **Bug Report**: [task.251.bug.2.approver-newline-forges-report-lines.md](./task.251.bug.2.approver-newline-forges-report-lines.md)
- **Observation**: Reproduced. An injected `## Completion` heading appears inside the Decisions Log.
- **Recommendation**: fold CR and LF once in option normalisation; hostile-approver test.
- **Priority**: P2

**Issue: T251-QA-2 — plan functions carry no `ok` field**
- **Category**: Quality
- **Bug Report**: [task.251.bug.3.plan-results-carry-no-ok-field.md](./task.251.bug.3.plan-results-carry-no-ok-field.md)
- **Observation**: probe engine, 15 executed, 9 reproduced, 0 escaped, verdict `absent`.
- **Recommendation**: add `ok` to every plan result.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1 (CR-3, report only)

---

## NFR Assessment

### Performance — PASS
Writer ran in 0.047 s on the task.250 gate and report.

### Reliability — PASS
Atomic temp-and-rename writes, idempotent per artefact, refusals write nothing (byte-identical checks).
T251-QA-1 is the one path that reports success wrongly.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 15 (run record `task.251.qa.1.record-loop-limit-residual-acceptance.security.run.json`; `escaped: 0`)
- `boundary: true`. Criteria signal: `["refused","refuses"]`. Candidates: `planGateEdit` and
  `planReportEdit` (state refusals on pipeline-written artefacts) and the approver/reason strings they
  write. The engine verdict `absent` is a contract mismatch (T251-QA-2), not a measurement of the
  guards; the guards themselves are held by the committed refusal tests. Seven hostile `--reason` /
  `--approved-by` strings (quote, newline, colon, NUL, `$(…)`, dashes, CRLF) were also run by hand;
  by-hand probes are not counted. They found T251-CR-2 (approver newline) only.

### Maintainability — PASS
Reuses `readGateToken`, `readTopIssues`, `isOpen`; one restore path; bundled copies in sync.

---

## Code Review

**Correctness bugs (3):**
- [medium/medium] `shared/resources/accept-qa-residual.js:143` — a `{` on the first line of any entry takes the flow branch → flow branch only when the dash is followed by `{`. QA reproduced it; gate id T251-QA-1 (QA-owned, because the read-back shares the reader's misparse).
- [medium/high] `shared/resources/accept-qa-residual.js:439` — `--approved-by` written raw → fold CR/LF. Gate id T251-CR-2.
- [low/low] `shared/resources/accept-qa-residual.js:454` — `insertAt` computed before the Loop exit row can be spliced above it. Not gated (low/low). The code comment states the layout assumption (the Decisions Log precedes QA Iteration History); the reachable case needs a QA Cycle entry before the Decisions Log.

**Cleanups (0).**

Provenance: all three are in a file added by this change, so there is no base to compare against.

Anchor check: the three `file_line` values resolved to the lines named (143 and 439 by reading; 454 by reading).

mutation-proven: no fix was made this cycle, so there is nothing to prove. Develop-time proofs (FAIL refusal removed → 1 red; `waived` stamp skipped → 11 red; report write skipped → 5 red) are `dev-only` here; they were not repeated this cycle.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `npm test` | PASS (7147 tests, 0 failed) |
| `eval:all` | PASS |
| `validate:all`, `check:generated`, `bundle:check`, `lint:shell`, `lint:secrets` | PASS |
| `CI=true npm test` | FAIL locally on `tests/ci-tool-skips.test.js` only: `zsh` is not installed on this host. Hosted CI installs it. Not caused by this change. |

---

## Test Artifacts

### Files Reviewed
`shared/resources/accept-qa-residual.js`, `accept-qa-residual.sh`, `qa-diminishing-returns.js` (export), the two SKILL.md blocks, the resume contract, the step-5-6 doc, the parity test, the new tests and fixtures.

### Test Commands Executed
```bash
npm run ci:fast
CI=true npm run ci            # fails only on the missing local zsh
npm run eval:all && npm run validate:all && npm run check:generated && npm run bundle:check && npm run lint:shell && npm run lint:secrets
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure --entry 'shared/resources/accept-qa-residual.js#planReportEdit' --args-json '[…]' --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed file> --diff-base <merge-base> --json
```

### Coverage Report
Not measured (no coverage tool is configured for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T251-QA-1, T251-CR-2, T251-QA-2 in `accept-qa-residual.js`, each with a committed test.

### Short-term Actions (Non-Blocking)
1. CR-3: compute the Decisions Log insertion point after the entry edit.
2. The `develop-pipeline-resume-contract.md:492` block fails under Step 4b on the base branch too.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Main path works and is well tested; three medium gaps in input handling and the probe contract.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the three findings fixed and re-verified.

---

**QA Report**: co-located at `task.251.qa.1.record-loop-limit-residual-acceptance.md`
**Gate File**: co-located at `task.251.gate.1.record-loop-limit-residual-acceptance.yml`
**Next Steps**: `/qa-fix` on the gate's three issues, then re-review.
