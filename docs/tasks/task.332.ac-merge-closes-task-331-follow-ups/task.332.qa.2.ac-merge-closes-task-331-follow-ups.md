# QA Report: Task 332 - The AC merge closes task 331's follow-ups (cycle 2)

**Task**: [Link to task document](./task.332.ac-merge-closes-task-331-follow-ups.md)
**Gate File**: [task.332.gate.2.ac-merge-closes-task-331-follow-ups.yml](./task.332.gate.2.ac-merge-closes-task-331-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review of head `ce71df6aa`, the qa-fix cycle 1 commit. Gate 1's three MEDIUM findings are fixed and
held by tests. The cycle-2 refute pass found one new defect, which QA reproduced: the hand-copy remedy
that both Step 3c document arms offer cannot clear the HALT once an extract has succeeded.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T332-QA-1 — CHANGELOG citation split over two lines | ✅ FIXED | `changelog-cites.sh task.332` → `cites (task 332)`, rc 0 |
| T332-CR-1 — mismatch arm uncleareable when the agent wrote a wrong `story_file` | ✅ FIXED | remedy names re-running the AC agent with the exact path; blocks test basename case passes |
| T332-CR-2 — unnamed arm uncleareable when the agent's answer names no `story_file` | ✅ FIXED | remedy names re-running the AC agent; mutation of it turns 2 tests red |

Re-review scope: unscoped — cycle 2 refute pass over the whole `origin/develop...HEAD` diff (19 files).

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:1063` — after a successful extract the stem-keyed extract
  record still supplies `--sha256`, so a corrected hand copy is refused as `result-hash-mismatch`
  and falls to the generic arm with no remedy → remove the extract record as part of the hand-copy
  remedy, give `result-hash-mismatch` its own arm, add a blocks-test case (T332-CR2-1).
- **[low, advisory]** `shared/resources/finalise-dod-ac-prompt.md:153` — the prompt over-claims what
  `/finalise` refuses (CR-2, routed to `recommendations.future`).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#964)

### Review Methodology

Direct tools plus one read-only Explore reviewer (the cycle-2 refute pass, whole branch diff).
Diff review: code review. Reviewer duration 92855 ms (completion
notice `duration_ms`); dispatch time not measured.

CI on ce71df6aaac6: pending

Step 4b: `skills/finalise/SKILL.md` has 52 bash blocks; 3 changed, all `mutating` (they write
`.claude/state/` files by design), 0 executed; over the file 2 placeholder, 50 mutating. The engine
reported `zero-blocks-executed` and `changed-blocks-not-executed`, as in cycle 1. The committed
`evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` runs the three changed blocks under bash
and zsh instead: 18/18 pass. Shells: bash, zsh.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: merge requires `--doc` and a named `story_file` | PASS | Verified | unchanged since gate 1 |
| Phase 2: stem-keyed scope/extract files | PASS | Verified | unchanged since gate 1 |
| Phase 3: split refusals and Step 3c arms | CONCERNS | Partial | T332-CR2-1 |
| Phase 4: docs and CHANGELOG | PASS | Verified | T332-QA-1 fixed |

**Overall Phase Completion**: 4/4 delivered, 1 with an open finding.

---

## Success Criteria Verification

Criteria unchanged since review (`criteria-drift.js`: clean, base review-commit). Each criterion
holds as recorded at gate 1. Cycle 1's edits strengthened the Step 3c remedies; T332-CR2-1 is a gap
in a remedy path, not a criterion regression.

| Check | Result |
| --- | --- |
| Full `ci:fast` on the LAN server at this tree | 8978 tests, 8975 pass, 0 fail, 3 skipped |
| `npm run validate -- skills/finalise/` | ✓ finalise, rc 0 |
| `changelog-cites.sh task.332` | `cites (task 332)`, rc 0 |
| `probe-boundary-signals.mjs` | `[]` |

---

## Breaking Changes Validation

Unchanged from gate 1: `merge --doc` required and a named `story_file` required are documented in
the CHANGELOG with their migration. PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: hand-copy remedy cannot clear a document HALT after a successful extract (T332-CR2-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: reproduced (see Code Review). The remedy text offers a hand copy; the block then
  re-reads the stale extract hash and refuses the copy.
- **Impact**: an operator following the HALT's own remedy hits a second HALT with no remedy.
- **Recommendation**: as in the gate.

### LOW Severity Issues (1)

CR-2: prompt wording over-claims (advisory).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
T332-CR2-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 — `boundary: internal`, reason unchanged from gate 1 (inputs are pipeline
  artefacts no corpus sink models; cycle 1 changed only remedy text).

### Maintainability — PASS
Remedies held by committed tests.

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `skills/finalise/SKILL.md:1063` — stale extract record re-supplies `--sha256`; a
  corrected hand copy is refused as `result-hash-mismatch` → remove the record with the hand copy,
  add a `result-hash-mismatch` arm, add a test. Promoted as **T332-CR2-1** (reproduced by QA, 5d).

Reproduction (scratch repository, the shipped Step 3c block run under bash):

```text
CONTROL (extracted wrong answer): 1 HALT: --result names task.9.demo.md, which does not exist: … re-run th…
HAND COPY (corrected): 1 HALT: merge answered result-hash-mismatch
```

The control is the arm working as designed; the hand copy, with `story_file` corrected per the
remedy, is refused. Provenance: the `result-document-mismatch` arm on `origin/develop` already offered
a hand copy beside the same `--sha256` read, but this task adds the `result-document-unnamed` arm with
the same remedy and its cycle 1 fix was to make these HALTs clearable, so the defect class is in scope
and the finding stays in `top_issues[]`.

**Cleanups (1):**
- `shared/resources/finalise-dod-ac-prompt.md:153` — "refuses … any other way" is broader than
  `sameDocument`, which accepts any spelling resolving to the same file → reword.

Anchors: `finding-anchors.js` ok for both.

mutation-proven: removed the unnamed arm's "re-run the AC agent" remedy → `[bash]`/`[zsh] Step 3c HALTs on a result that names no document in its own arm, naming the remedy, and records nothing (task 332)` went red → covered

Restored from a `cp` snapshot; `cmp` clean; baseline 18/18.

---

## Regression Testing

Full `ci:fast` on the LAN server: 0 failures. The first run on this tree hit its 60-minute limit
under load with 6 failures in files the change does not touch; the re-run on a quiet host passed.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true TEST_REMOTE_TIMEOUT_MIN=90 npm run test:remote
npm run validate -- skills/finalise/
node --test --test-reporter=tap evals/shared/tests/finalise-rerun-scope-blocks.test.mjs
bash .agents/skills/qa-task/references/changelog-cites.sh task.332
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one reproduced MEDIUM reliability finding in a HALT remedy path.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — T332-CR2-1 fixed.

**Next Steps**: qa-fix cycle 2.
