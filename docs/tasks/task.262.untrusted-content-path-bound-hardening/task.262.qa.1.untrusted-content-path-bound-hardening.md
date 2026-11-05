# QA Report: Task 262 - Untrusted-content path bound hardening

**Task**: [Link to task document](./task.262.untrusted-content-path-bound-hardening.md)
**Gate File**: [task.262.gate.1.untrusted-content-path-bound-hardening.yml](./task.262.gate.1.untrusted-content-path-bound-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-05
**Gate Status**: PASS

---

## Executive Summary

All four advisory gaps from task 261 are closed and held by committed tests. The probe plan re-ran clean. Two code-review findings were examined; one is advisory, one is refuted.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

First review. Direct tools plus one read-only Explore code reviewer over the diff. Step 4b: the bound block is runnable prose; it was executed through the probe engine (fence form) rather than the snippet runner.

CI on 9d93048cd21c: pending (not waited on; gated at /finalise).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1. CRLF-safe fence regex | PASS | `[^\n]*` plus trim; CRLF/LF control pair |
| 2. Named-guard hostile table | PASS | each row asserts its own guard's message |
| 3. One extraction path | PASS | `boundBlockFor` |
| 4. PRD_ROOT, symlinks, missing parent | PASS | scratch-repo behaviour tests |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

Verified from the tests and the block text, not the checkboxes. All functional criteria hold. The one unticked line ("probe plan re-run, recorded in the DoD") is `/finalise`'s step; the re-run is recorded here (60 executed, 0 escaped). criteria-drift: clean. CHANGELOG cites task 262.

---

## Breaking Changes Validation

None. The default `docs/tasks/...` path is accepted before and after.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0 (gate-level). Two advisory code-review items below.

---

## NFR Assessment

### Performance — PASS
35 tests in about 2.0 s.

### Reliability — PASS
`tests/bundle-missing-source.test.js` exceeds its budget only under full-suite load and passes alone; not caused by this change.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 60
- Escaped: 0. Verdict `engages` at all three sites.

### Maintainability — PASS
Single extraction helper; equality test across the three copies; `bundle:check` clean.

---

## Code Review

boundary: true (the Bound the derived path fence).

**Correctness bugs (2):**
- [medium/medium] `skills/review-task/SKILL.md:171` — an unresolvable parent gives an empty `REAL_DIR`, so the real-path check is skipped. Advisory: measured, a dangling symlinked directory and a 000-mode directory both fail the read itself, so nothing escapes. Not mapped to the gate (not high confidence).
- [low/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:143` — reviewer claimed the bundled copies were stale. Refuted: all nine files carrying the heading hold the new block, and `bundle:check` is clean.

**Cleanups (0).**

mutation-proven: drop the `[ -L "$LOCAL_PATH" ]` guard in review-task → "the path bound is the same block at every site" and "a file symlink inside docs/ is a HALT" went red → covered

Develop-time proofs (recorded in the implementation report) cover the other guards; they are `dev-only` in this cycle's terms.

---

## Regression Testing

`tests/untrusted-content-rule.test.js` and `tests/unbound-default-reads.test.js`: 35 pass. Under `TMPDIR=/tmp`: 33 pass. `npm run bundle:check`: clean.

---

## Test Artifacts

```bash
CI=true node --test tests/untrusted-content-rule.test.js tests/unbound-default-reads.test.js
TMPDIR=/tmp CI=true node --test tests/untrusted-content-rule.test.js
npm run bundle:check
python skills/create-skill/scripts/quick_validate.py skills/review-task
python skills/create-skill/scripts/quick_validate.py skills/review-story
node .agents/skills/qa-task/references/security-probe.mjs --entry 'fence:...' (3 sites)
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Next Steps**: proceed to review-pr (5c), then finalise.
