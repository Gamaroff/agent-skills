# QA Report: Task 216 - security-probe: the cli: form honours a case's fixture.files (and env)

**Task**: [Link to task document](./task.216.probe-engine-cli-case-fixture-files.md)
**Gate File**: [task.216.gate.2.probe-engine-cli-case-fixture-files.yml](./task.216.gate.2.probe-engine-cli-case-fixture-files.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-216-QA1-1: docs recommend input `.` with no filename-sink caveat | ✅ FIXED | Both docs now state the caveat. Reproduced: under `--sink filename`, `.` is declined EISDIR and a directory input is declined EEXIST, as the new text says. |

---

## Executive Summary

Cycle 1's fix is verified. The refute pass read the whole branch diff again and found that the docs
overclaim the reach of a `cli:` case fixture. They say it serves a CLI that reads "a repository",
but text files cannot make a commit or a staged index, and `cli:` has no `--fixture-setup`. A
repository-reading CLI still refuses every input (reproduced). There is also one LOW hardening gap
in the interpreter-steering refusal.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (TASK-216-QA2-1 fixed)

---

## Testing Scope

### Review Methodology

Direct tools, plus one diff code-review subagent run as the cycle-2 **refute pass** over the whole
`origin/develop...HEAD` diff (generated bundled copies excluded). It was dispatched at 06:28:45Z; its
completion notice gave `duration_ms` 177153.

Re-review scope: the whole branch diff (cycle 2, refute). The prior gate was PASS, so the safety
re-probe did not apply (`qa-safety-clause1.sh` returned false).

Step 4b: `probe-boundary-rule.md` and `finalise-dod-security-prompt.md` changed, with 0 changed
fenced blocks.

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-dod-security-prompt.md:230`: the docs claim a `cli:` case
  fixture can serve "a repository". That is false for committed or staged state. Fix: scope the claim
  to data directories in all five places (TASK-216-QA2-1).
- **[low]** `shared/resources/security-probe.mjs:3158`: `CLI_INTERPRETER_ENV` omits `LD_PRELOAD`,
  `LD_LIBRARY_PATH`, `DYLD_INSERT_LIBRARIES` and `DYLD_LIBRARY_PATH`. Fix: add them, with a test
  (TASK-216-QA2-2).

Reproduction for TASK-216-QA2-1:
- A scratch Node CLI ran `git log --oneline -1` in its cwd.
- It was probed with `fixture.files` of `.git/HEAD`, `.git/config`, `.git/objects/.keep`,
  `.git/refs/heads/.keep` and `a.txt`.
- Result: 1 executed, `rejected`, no decline.
- The scratch entry was removed afterwards.

---

## Implementation Verification

| Step | Status | Notes |
| ---- | ------ | ----- |
| 1. `runCliCase` honours `fixture` | CONCERNS | TASK-216-QA2-2 (LOW) |
| 2. `OPTIONAL_CASE_FIELDS` comment | PASS | |
| 3. Docs | CONCERNS | TASK-216-QA2-1 (MEDIUM) |
| 4. Tests | PASS | 8 tests, mutation-proven in cycle 1; code unchanged since |

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| 1. `fixture.files` present in cwd, scored by exit | PASS | test "a case's fixture.files is written into its cwd…" |
| 2. A case without `fixture` is unchanged | PASS | 96/96 `cli` tests |
| 3. Malformed / escaping / steering / collision declined by name | PASS (LOW gap) | decline tests. The loader variables are not in the steering list (TASK-216-QA2-2) |

---

## Breaking Changes Validation

Unchanged from cycle 1: PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1. No bug report files: the MEDIUM is a documentation
scope fix that is tracked in the gate and fixed in the next 5b.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (record `task.216.qa.2.security.run.json`; `reproduced` 0, `escaped` 0)
- Boundary: `boundary: true`, the same 13 cases as cycle 1 ([cases](./task.216.qa.2.security.cases.json)).

### Performance — PASS
### Reliability — PASS
### Maintainability — PASS
CR-4 (prelude copied in three arms) and CR-5 (stale "Shared by" comments) are noted below.

---

## Code Review

**Correctness bugs (3):**
- [medium/medium] `shared/resources/finalise-dod-security-prompt.md:230`: the "a repository" overclaim. QA verified it by reproduction and entered it as TASK-216-QA2-1. It was not promoted by the code-review rule, because its confidence is not high.
- [medium/medium] `shared/resources/security-input-corpus.mjs:67`: enumeration risk. `runShellCase` (`shell:`, `shell-fn:`) and the in-process forms still ignore `c.fixture` silently. **Provenance: pre-existing.** `runShellCase` is unchanged by this branch and reads no `c.fixture` on `origin/develop`. The task scopes `cli:` only. Routed to `recommendations.future`.
- [low/low] `shared/resources/security-probe.mjs:3158`: the loader variables are missing from `CLI_INTERPRETER_ENV`. Entered as TASK-216-QA2-2.

**Cleanups (2):**
- `shared/resources/security-probe.mjs:2583`: the case-fixture prelude is copied in three arms. Routed to `recommendations.future` (it repeats cycle 1's CR-2).
- `shared/resources/security-probe.mjs:2726`: the `writeFixtureFiles` and `fixtureCaseEnv` "Shared by" comments omit `cli:`. Folded into the next fix.

No new mutation proofs this cycle: the engine code is unchanged since cycle 1, whose five proofs stand.

---

## Regression Testing

Fast gate on `458d79e3`: 6201 tests, 0 fail. `npm run validate` passes for `finalise`, `qa-story` and `qa-task`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One MEDIUM documentation overclaim, reproduced.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: qa-fix for TASK-216-QA2-1 and TASK-216-QA2-2 (plus CR-5), then re-review.
