# QA Report: Task 131 - A markdown-structure sink and an internal-artefact decision for the security probe

**Task**: [Link to task document](./task.131.markdown-structure-sink-internal-validator-class.md)
**Gate File**: [task.131.gate.1.markdown-structure-sink-internal-validator-class.yml](./task.131.gate.1.markdown-structure-sink-internal-validator-class.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

All three phases are implemented. The deliverable works: `lintReport` probed by execution through the new `markdown-structure` sink **engages**, with 15 of 15 cases scored correctly and nothing reproduced or over-blocked. The fast gate is green: 4,593 tests, 0 failures. Two medium defects stand between this and acceptance. The new prompt example that shows how to probe a two-argument validator does not run as written. The "internal without a reason is a FAIL" rule is rendered in finalise but not enforced in the decision that accepts the work.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-131-BUG-1 and TASK-131-BUG-2

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (11/11 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (three-valued `boundary`)
- [x] Code on feature branch with open PR (#526)

### Testing Approach

- [x] Automated Testing (unit, contract)
- [x] Performance Testing (SC probe timing)
- [x] Regression Testing (`npm run ci:fast`)
- [x] Security Review (boundary probe executed, `--record`)
- [x] Code Review (Step 3b, independent Explore reviewer)

### Review Methodology

Direct tools, plus one independent read-only code-review subagent (Step 3b). This is the first review, so the reviewer saw the whole branch diff: 22 source files and 1,920 lines, with bundled `skills/*/references/` copies excluded since they are generated. Adaptive strategy: 3 phases, multiple modules, low risk, so the default strategy applied (direct tools first).

Step 4b ran over the five changed runnable-prose files (see Code Review).

---

## New Findings This Cycle

First review. All findings below are new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the sink | PASS | Verified | 9 hostile / 6 legitimate. Each hostile case trips the code(s) it is named for, pinned by an engine test. `.md` regenerated and the parity test is green. |
| Phase 2: `--args-json` + runner rule | PASS | Verified | `bad-args` on the library and CLI paths; `args` recorded; own-`ok === false` pinned both ways plus inherited `ok`. |
| Phase 3: `internal` | CONCERNS | Partial | Defined and rendered, but an `internal` with no reason is not enforced at acceptance (QA-1). The prompt example has unbound variables (CR-1). |

**Overall Phase Completion**: 2/3 PASS, 1 CONCERNS

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `corpusFor("markdown-structure")` both directions; each hostile trips its code(s) | yes | 9/6; isolation test green | PASS | |
| Probe of `lintReport` executes every case; green accepted, corrupt refused | engages | engages 15/15; real fixtures engage 6/6 | PASS | record: `task.131.qa.1.security.run.json` |
| `internal` renders a skip with reason; without a reason it is a FAIL | FAIL enforced | rendered ❌ only; acceptance reads self-reported `SEC_OVERALL` | CONCERNS | QA-1 / TASK-131-BUG-2 |

**Performance Criteria:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Probe run for the sink | < 10 s | 1.6 s | PASS |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Mutation proof for the engine path | red on revert | runner rule → red; CRLF fix → red (re-run at HEAD this cycle) | PASS | |
| Schema test non-vacuous | yes | floor 9/6 | PASS | |
| `bundle:check` | 0 problems | 0 problems | PASS | |
| Enumeration test | non-vacuous | half vacuous on finalise SKILL.md ("internally") | CONCERNS | CR-4 (low) |

---

## Breaking Changes Validation

### Breaking Change: `boundary` is a three-valued field
Documented: Yes
Migration Path Provided: Yes (an unknown value falls into the existing "not answered" branch)
Migration Tested: Yes (contract test on the render branches)
Consumer Code Updated: Yes: prompt, finalise Step 3d, qa-task and qa-story Step 3b, `probe-boundary-rule.md`. `review-security` is not a consumer: no `boundary` field (pre-pass and surface map both confirm).
Notes: the enumeration test's key coverage is incomplete (CR-4).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: The `--args-json` probe example reads two unbound variables**
- **Severity**: MEDIUM
- **Category**: Quality (executed prose)
- **Bug Report**: [task.131.bug.1.prompt-probe-example-unbound-variables.md](./task.131.bug.1.prompt-probe-example-unbound-variables.md)
- **Observation**: `finalise-dod-security-prompt.md` Step 4 block uses `$LINT_JS` and `$ARGS_JSON` with no writer in the block.
- **Impact**: run as written, it exits 2 `bad-args`.
- **Recommendation**: bind them in the block, or use `<placeholder>` forms.
- **Priority**: P2

**Issue: `internal` without a reason renders FAIL but cannot fail the DoD**
- **Severity**: MEDIUM
- **Category**: Functional (success criterion)
- **Bug Report**: [task.131.bug.2.internal-without-reason-not-enforced.md](./task.131.bug.2.internal-without-reason-not-enforced.md)
- **Observation**: finalise Step 6 accepts on the agent-reported `SEC_OVERALL` (`SKILL.md:507`, `:727`), and the prompt names no check for this case.
- **Impact**: the safeguard that stops `internal` from dodging the zero-guard is not enforced.
- **Recommendation**: name the FAIL check in the prompt and force `SEC_OVERALL = FAIL` in Step 3c. Pin both.
- **Priority**: P2

### LOW Severity Issues (1)

- **CR-4**: the enumeration test in `finalise-dod-prompt-contract.test.mjs` asserts `includes("internal")`, which finalise `SKILL.md` already satisfied on `develop` via "internally". Its keys also miss the qa-task/qa-story wording.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
The SC probe run takes 1.6 s against a 10 s target. The runner change adds one own-property check per call.

### Reliability — PASS
`--args-json` is validated before any case runs: exit 2 on the CLI, a `bad-args` decline in the library. The rule reads only an own `ok === false` on a plain object.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 15
- The boundary rule fired: the Success Criteria say corrupt reports are *refused*. `security-probe.mjs --sink markdown-structure --entry shared/resources/report-lint.js#lintReport --args-json <loadTemplate()> --record task.131.qa.1.security.run.json` → `engages`, 15 executed (9 hostile rejected, 6 legitimate accepted), 0 reproduced, 0 overblocked, 0 declined. The runner's new rejection rule is the scoring change under test, and it is proven both ways by the engine tests.

### Maintainability — PASS
The generated doc was regenerated (parity green). Bundle is in sync. `npm run validate` passes for finalise, qa-task and qa-story. An anti-pattern entry records why.

---

## Code Review

Independent Explore reviewer, whole branch diff. `code_review_blocking=true` (pipeline override).

boundary: true — `report-lint.js#lintReport` (SC signal "refused"), probed as above. `probes_executed: 15`, copied from the run record's `totals.executed`.

**Correctness bugs (4):**
- [medium/high] `shared/resources/finalise-dod-security-prompt.md:167`: `$LINT_JS`/`$ARGS_JSON` unbound in the block → **promoted to gate as TASK-131-CR-1**.
- [medium/medium] `skills/finalise/SKILL.md:584`: `internal` without a reason renders FAIL but Step 6 reads the self-reported `SEC_OVERALL` → verified by QA against `SKILL.md:507/727` and raised as the success-criteria finding **TASK-131-QA-1**.
- [medium/medium] `shared/resources/change-log.js:126`: enumeration risk. The same CRLF fence defect exists in `jira-sync.js:1207` and `doc-links.js:74-75`. **Provenance: pre-existing.** Both patterns are identical on `origin/develop`, so the diff did not introduce them. Routed to `recommendations.future` with a follow-up, not `top_issues`.
- [low/high] `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:651`: vacuous half of the enumeration test → **promoted as TASK-131-CR-4**.

**Cleanups (2):**
- `shared/resources/tests/security-probe.test.mjs:2790`: `probe-args-*` temp dir never removed → remove it in `finally`.
- `shared/resources/security-probe.mjs:1036`: the `extraArgs` empty-array default is stated twice → keep one.

**Step 3c — mutation proofs (re-run at HEAD this cycle; cp/restore; tree restored, baseline green):**

mutation-proven: runner `ok === false` rule removed → "lintReport through the markdown-structure sink engages" → covered
mutation-proven: `fencedRanges` CRLF strip reverted → report-lint "B — CRLF" → covered

Development-time proofs are recorded in the implementation report: own-property check loosened to `in` → 1 red; `internal` branch renamed → 1 red; `internal` removed from the prompt → the enumeration test red. That last one does not contradict CR-4: the mutation hit the prompt, the non-vacuous member.

**Step 4b — documented commands:**

| File | Blocks | runnable / placeholder / mutating | Result |
| --- | --- | --- | --- |
| `shared/resources/finalise-dod-security-prompt.md` | 1 | 0 / 0 / 1 | `no-executable-blocks`: the `node … security-probe.mjs` block is refused as mutating by design. Its new `--args-json` form was executed directly (Security above), which is also where CR-1 surfaced. |
| `shared/resources/probe-boundary-rule.md` | 1 | 0 / 0 / 1 | `no-executable-blocks` |
| `skills/finalise/SKILL.md` | 35 | 0 / 2 / 33 | `zero-blocks-executed` (medium). **Pre-existing**: the diff adds no fenced bash block to this file. |
| `skills/qa-task/SKILL.md` | 18 | 0 / 3 / 15 | `zero-blocks-executed`: pre-existing, as above |
| `skills/qa-story/SKILL.md` | 17 | 0 / 4 / 13 | `zero-blocks-executed`: pre-existing, as above |

Shells: bash + zsh available. The diff changes no line inside an existing fence in the three SKILL.md files: `git diff … | grep -c '^+```'` returns 0, and the edits are prose and render-template lines.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` (format + hermetic suite) | PASS: 4,593 tests, 0 fail. The tree was identical in code at commit; later deltas are docs only. |
| security-probe + corpus + probe-* suites | PASS: 145/145 |
| change-log + report-lint suites | PASS: 93/93 before the CRLF test; the CRLF tests are green |
| finalise-dod-prompt-contract, probes-executed-population, qa-gate-preconditions-parity | PASS |
| Existing sinks' engine tests under the new runner rule | PASS: no existing fixture returns an `ok` object |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/security-input-corpus.test.mjs shared/resources/tests/probe-*.test.mjs
node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs evals/shared/tests/probes-executed-population.test.mjs evals/shared/tests/qa-gate-preconditions-parity.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure --entry 'shared/resources/report-lint.js#lintReport' --args-json "$ARGS" --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.131.markdown-structure-sink-internal-validator-class/task.131.qa.1.security.run.json --json
npm run validate -- skills/finalise/   # and qa-task, qa-story
npm run bundle:check
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed runnable-prose file> --json
```

### Coverage Report
Not measured. The repository has no coverage tooling for these modules. Coverage is argued instead by mutation proofs (Step 3c).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-131-BUG-1: bind the probe example's variables.
2. TASK-131-BUG-2: name the FAIL check and force `SEC_OVERALL` in finalise Step 3c.
3. CR-4 (low): make the enumeration test assert a compound literal and include the qa-task/qa-story sites.

### Short-term Actions (Non-Blocking)
1. File a follow-up for CRLF fence detection in `jira-sync.js` and `doc-links.js`. Pre-existing (CR-3).
2. CR-5 / CR-6 cleanups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings. There are two MEDIUM findings in the deliverable's own documentation and enforcement (gate rule 2).
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-131-BUG-1 and TASK-131-BUG-2 fixed.

---

**QA Report**: co-located at `task.131.qa.1.markdown-structure-sink-internal-validator-class.md`
**Gate File**: co-located at `task.131.gate.1.markdown-structure-sink-internal-validator-class.yml`
**Next Steps**: `/qa-fix` on gate 1.
