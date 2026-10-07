# QA Report: Task 158 - QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment (cycle 3)

**Task**: [task.158](./task.158.cycle-file-and-containment-definitions.md)
**Gate File**: [task.158.gate.3.cycle-file-and-containment-definitions.yml](./task.158.gate.3.cycle-file-and-containment-definitions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Gate Status**: PASS

---

## Re-Review Context

Previous gate: [gate.2](./task.158.gate.2.cycle-file-and-containment-definitions.yml), CONCERNS 90.

| Previous finding | Status | Evidence |
| --- | --- | --- |
| QA2-CR-1 resume reads unnumbered gates as a fresh start | FIXED | The four-state eval test passes under bash and zsh: missing → HALT, unnumbered → HALT, empty → 0, `gate.02` → 2. The grant reports "carry no cycle number". Mutations M14 and M15 go red. |
| QA2-CR-2 develop-next merge-gate prose lookup | DEFERRED (advisory) | Recorded in the task's Known Issues. The CHANGELOG claim is scoped to the QA skills and step docs. |
| QA2-CR-3 `[ -d ]` HALT untested | FIXED | The same eval test covers the missing-directory case. |
| QA2-CR-4 shell-guard line numbers | FIXED | A population-wide test with a continuation floor. Mutation M13 goes red. |

---

## Executive Summary

The cycle-2 findings are fixed and hold under execution in both shells. The scoped cycle-3 review
returned six findings, all at medium confidence, so none is promoted under `code_review_blocking`.
The one medium finding (QA3-CR-1) is pre-existing at the sites this branch did not change. It
reproduces identically on `develop`, and it is routed to future work with its structural fix named.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Re-review scope: since 2026-09-29T13:57:56Z (the default). That is 6 files and 585 lines, from
`CHANGELOG.md`, the eval, the resume contract, `grant-qa-cycles.sh` and its test, and
`tests/qa-cycle.test.js`. The reviewer was dispatched at 14:08Z and returned at 14:11Z.
`SAFETY_REPROBE=false` (security PASS/measured). Step 4b: the changed blocks run through the
eval, as in cycles 1–2.

---

## New Findings This Cycle

- **[medium/medium, advisory]** `shared/resources/develop-pipeline-resume-contract.md:442` —
  QA3-CR-1. rc 1 has two meanings at every `qa-cycle.sh` caller, and only two callers now split them.

  Provenance, executed: develop's qa-task Phase 0 block, run over a directory holding
  `task.9.gate.x.yml`, gives `PRIOR=[] LATEST=[]`, which is a first review. That is identical to
  this branch.

  The step-5-6 lookup reads the latest gate only after QA has written a numbered one, and a
  numbered gate outranks unnumbered ones, so the state is unreachable there. The finding is
  pre-existing and routed to `recommendations.future`, where it names the structural fix: a distinct
  exit code from the helper.
- **[low]** QA3-CR-2 — two methods for one question. The exit code above resolves it.
- **[low]** QA3-CR-3 — if `mktemp` fails in the grant, "could not look" reads as "no gate".
- **[low]** QA3-CR-4 — `GATE_SELECTION`'s lookahead exemption is line-wide.
- **[low]** QA3-CR-5 — the block floor is shared by SKILLS and STEP_DOCS.
- **[low]** QA3-CR-6 — the THIS_GATE eval rows derive `QA_CYCLE` in `pre`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | unchanged |
| Phase 2 | PASS | QA2-CR-1 fixed at both sites that must distinguish the states |
| Phase 3 | PASS | unchanged |
| Phase 4 | PASS | `bundle:check` is clean. The CHANGELOG claim is scoped. |

## Success Criteria Verification

SC1–SC9 and SC11–SC13 PASS. SC10 (`npm run ci`) runs at the merge gate. SC3 is extended: an empty
directory reconstructs 0, `gate.02` reconstructs 2, and unnumbered gates halt.

## Breaking Changes Validation

None.

---

## Issues Found

**HIGH: 0 · MEDIUM: 0 gating (1 advisory, pre-existing) · LOW: 5**

---

## NFR Assessment

### Performance — PASS

### Reliability — PASS

QA2-CR-1 is fixed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 22 (`path` sink, 11 + 11). Records:
  - [`task.158.qa.3.security.entryAccepted.run.json`](./task.158.qa.3.security.entryAccepted.run.json)
  - [`task.158.qa.3.security.cjsWithin.run.json`](./task.158.qa.3.security.cjsWithin.run.json)
- The outcomes are identical to cycles 1–2, and every mismatch is attributed in the cycle 1 report.

### Maintainability — PASS

---

## Code Review

Blocking resolved `true`. The reviewer read 6 files (585-line patch) and returned 6 findings: 1 medium
bug at medium confidence, 5 low cleanups. None was promoted, because none is high confidence. The
medium is pre-existing by provenance (see New Findings).

**Mutation spot checks (this cycle):**

```markdown
mutation-proven: resume unnumbered-gate HALT disabled → optional-file-lookups "four answers" red (bash, zsh) → covered
mutation-proven: grant-qa-cycles.sh drops the helper's reason → grant-qa-cycles.test.sh "unnumbered gates" red → covered
mutation-proven: shellHelperLines line numbering drifted → tests/qa-cycle.test.js QA2-CR-4 red → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| read-back, doc-links, security-probe, qa-cycle, optional-file-lookups | PASS (294/294) |
| `grant-qa-cycles.test.sh` | PASS (46/46) |
| `ci:fast` at the cycle-2 fix commit | PASS — 4513 tests, 0 fail |
| `quick_validate` qa-task, qa-story; shellcheck `qa-cycle.sh`, `grant-qa-cycles.sh` | PASS |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED
**Next Steps**: Step 5c `/review-pr` (the loop's exit gate).
