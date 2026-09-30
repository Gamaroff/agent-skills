# QA Report: Task 140 - Harden the shell-fn: sentinels and the fake-gh coverage

**Task**: [Link to task document](./task.140.shell-fn-sentinel-hardening.md)
**Gate File**: [task.140.gate.5.shell-fn-sentinel-hardening.yml](./task.140.gate.5.shell-fn-sentinel-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: PASS

---

## Executive Summary

Cycle 5 re-review of the cycle 4 fix (`3233686e`). BUG-7 is fixed: rule §5 states the three further trip-wire limits, and a row pins the PATH-prepend shape. The scoped review found two LOW precision points in the same text and one test cleanup. There is no HIGH or MEDIUM, and every NFR passes.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue (gate 4) | Status |
| --- | --- |
| CR-1 / BUG-7 (medium): §5 names one trip-wire limit | FIXED — three limits stated, PATH prepend pinned |

---

## New Findings This Cycle

- **[low]** `shared/resources/probe-boundary-rule.md:275` — the neighbouring sentences still say the host `gh` "never runs"; the same wording is in CHANGELOG.md:104 and security-probe.mjs:1671 → add the stub-first/in-spawn condition
- **[low]** `shared/resources/probe-boundary-rule.md:282` — the limits text says each shape is scored, but a literal `gh` is still declined before anything spawns → say the limits apply to spellings the text check misses
- **[cleanup]** `shared/resources/tests/security-probe.test.mjs:2240` — the pin row could go red for the wrong reason; `outside` leaks if the helper throws

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#527)

### Review Methodology

Direct tools, plus one read-only Explore reviewer (127 s, returned). Re-review scope: since gate 4 (default) — the prior security axis read `CONCERNS measured`, so the safety re-probe did not fire. The diff was `ab079810..HEAD` over the four files cycle 4 changed.

Step 4b: `probe-boundary-rule.md` carries one fenced bash block. The engine refused it as `mutating` (write redirection) and recorded `no-executable-blocks` as information. Nothing was runnable.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: red rows | PASS | Verified | |
| Phase 2: body and gates | PASS | Verified | |
| Phase 3: lint lanes | PASS | Verified | |
| Phase 4: rule, bundle, CHANGELOG | PASS | Verified | Two LOW precision points |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

Every criterion holds at `3233686e`. The rule's limit statement is now complete apart from the two LOW precision points above.

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

CR-1 and CR-2 above, both documentation precision in rule §5, with no bug file (LOW).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
`TMPDIR=/tmp` shell rows 56/56.

### Reliability — PASS

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 69 (run record `task.140.qa.5.security.run.json`, `totals.executed`)
- `resolveEntry` wrapper 21 (with a real symlink present): `present-but-inert`, reproducing only the pre-existing encoded-traversal. Green path: `engages` 20. `shell:qa-cycle.sh`: `engages` 28.
- The containment bypasses are pre-existing (gate 4 provenance), and §5 now states them as limits.

### Maintainability — PASS

---

## Code Review

Reviewer: read-only Explore over `ab079810..HEAD` (4 files).

**Correctness bugs (2):**
- [low/high] `shared/resources/probe-boundary-rule.md:275` — "never runs" wording contradicts the new limits → condition it
- [low/high] `shared/resources/probe-boundary-rule.md:282` — "is scored" is true only for spellings the text check misses → say so

**Cleanups (1):**
- `shared/resources/tests/security-probe.test.mjs:2240` — assert `namesGh()` is false for the fixture and that the verdict is scored; move the `outside` mkdtemp into `try`

Both bugs entered `top_issues[]` as LOW (under `code_review_blocking`, `category: bug` + `confidence: high`).

mutation-proven: none this cycle — the cycle 4 change is prose plus a row that pins a limit, not a behaviour fix → not-run (nothing to revert; the reviewer's CR-3 names how the pin row could be tightened)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` | PASS 115/115 |
| `TMPDIR=/tmp` shell rows | PASS 56/56 |
| task.136 green path | engages, 20 |
| `shell:qa-cycle.sh` | engages, 28 |
| `npm run ci:fast` at `3233686e` (qa-fix cycle 4) | 4610 pass, 0 fail |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs   # 115/115
TMPDIR=/tmp command node --test --test-name-pattern='task\.140|symlink|fake-gh|shell-fn|shell entry' shared/resources/tests/security-probe.test.mjs   # 56/56
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/probe-boundary-rule.md --json   # no-executable-blocks
# probes: same three commands as cycle 4, --record docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.qa.5.security.run.json → 69 executed
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. The two LOW precision points and the pin-row cleanup.
2. Follow-up task: close the `gh` containment bypasses.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no HIGH or MEDIUM, and every NFR passes. The two LOWs are wording in a rule that is otherwise now correct.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.140.qa.5.shell-fn-sentinel-hardening.md`
**Gate File**: co-located at `task.140.gate.5.shell-fn-sentinel-hardening.yml`
**Next Steps**: loop routing (orchestrator), then 5c PR review
