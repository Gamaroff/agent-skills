# QA Report: Task 235 - select-next honours an external precondition

**Task**: [Link to task document](./task.235.select-next-external-precondition.md)
**Gate File**: [task.235.gate.1.select-next-external-precondition.yml](./task.235.gate.1.select-next-external-precondition.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: PASS

---

## Executive Summary

First review of PR #761 at head `92e9a4a3`. All four phases are delivered, the unit suite (185) and
the full `npm run ci` are green, the wall-time bound holds at 102.7%, and the new hold classifier
`externalBlockOf` engages under an executed probe. One promoted low-severity code-review bug remains
open (CR-1): a quoted condition containing ` #` is truncated by the comment-stripping rule.

**Overall Assessment**: PASS (one open LOW entry)
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#761, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [x] Performance Testing (unit-suite wall time)
- [x] Regression Testing
- [x] Security Review (executed probe)
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore code reviewer for Step 3b (small task, 4 phases, one
module). The reviewer returned in 56.8s (the completion notice's `duration_ms`). Pipeline run:
develop-task Step 5a cycle 1, standard mode, `code_review_blocking=true` (run-level override).
Traceability mapper not dispatched: Success Criteria is a checkbox list, not a table.

Step 4b ran over `skills/create-task/SKILL.md`, the one changed in-scope file: 0 changed blocks,
5 blocks in the file, all refused as mutating (`no-executable-blocks`, information). The other
changed Markdown (`skills/develop-next/references/roadmap-selection.md`, docs) is outside the
runnable-prose rule.

---

## Implementation Verification

| Phase                                   | Status | Test Result | Notes                                                                  |
| --------------------------------------- | ------ | ----------- | ---------------------------------------------------------------------- |
| Phase 1: Failing tests first            | PASS   | Verified    | Nine `235:` tests in `select-next.test.mjs`                            |
| Phase 2: Read and honour the field      | PASS   | Verified    | `externalBlockOf`, `makeRegistryLoader`, frontier check, rationale     |
| Phase 3: Control and edge cases         | PASS   | Verified    | Placeholders, YAML nulls, floor ordering, bug rows, all-held, parity   |
| Phase 4: Docs, rule and migration       | PASS   | Verified    | `roadmap-selection.md`, standards row, both rule sites, task.174 field |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Each criterion classified as finalise will, and verified from evidence rather than its checkbox.

| Criterion                                                        | Evidence                                                                                          | Status |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Held `planned` task not selected; next eligible row is            | test `235: a planned task with blocked_on_external is not selected…`; mutation below reds it       | PASS   |
| `passedOver` entry has `eligible: false`, `externalBlock`, reason | same test asserts all three                                                                        | PASS   |
| Placeholders and YAML nulls do not hold                          | `235:` placeholder test; probe cases ext-h1–h7, h11 read null                                       | PASS   |
| Accepted/cancelled rows report the floor, not the hold           | `235:` floor test                                                                                  | PASS   |
| Hold reported ahead of dependencies; bug rows held too           | two `235:` tests                                                                                   | PASS   |
| All rows held → `roadmap-complete` names each held path           | `235:` all-held test                                                                               | PASS   |
| Rationale names a held row ranked above the selection            | `235:` rationale test                                                                              | PASS   |
| Each document read once                                          | `235:` loader read-count test                                                                      | PASS   |
| Parity without `readExternalBlock`                               | `235:` parity test                                                                                 | PASS   |
| Tree evidence: T174 held                                         | `select-next.mjs --lint`: T174 in `registryFrontier.passedOver`, `eligible: false`, `externalBlock` set | PASS   |
| Unit-suite wall time ≤ 110% of develop                           | measured below: 102.7%                                                                             | PASS   |
| `npm run bundle:check` clean, `npm run ci` green (symlinks aside) | implementation report Step 3: 6,415 tests, 0 fail, exit 0; pre-commit bundle check in sync          | PASS   |

**Performance:**

| Criterion       | Target | Actual                                                    | Status |
| --------------- | ------ | --------------------------------------------------------- | ------ |
| Unit wall time  | ≤110%  | develop 0.857s, head 0.880s (median of 3, load 0.33–0.39) | PASS   |

**Code Quality:**

| Criterion                         | Target   | Actual        | Status |
| --------------------------------- | -------- | ------------- | ------ |
| `npm run validate` (changed skills) | 0 errors | develop-next ✓, create-task ✓ | PASS   |
| Documentation                     | Updated  | Complete      | PASS   |

---

## Breaking Changes Validation

None. `registryFrontier`'s new `readExternalBlock` input defaults to `() => null`, held by the
parity test. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

**TASK-235-CR-1 — a quoted condition containing ` #` is truncated.** `externalBlockOf` reads the
value through `frontmatterScalar`, which strips from any whitespace-then-`#` before stripping
quotes. Reproduced: `externalBlockOf('---\nblocked_on_external: "tinker-city PR #982 merged"\n---\n')`
returns `"tinker-city PR"`. The row is still held (the safe direction), but the reason and
rationale name the wrong precondition. Provenance: `frontmatterScalar` is pre-existing, but this
task defines a free-text field whose natural spelling carries `#NNN`, so the finding is in scope.
Promoted under `code_review_blocking` (bug, high confidence).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS

Wall time 102.7% of develop. One cached read per document.

### Reliability — PASS

Parity with no loader holds; the hold fails toward "held" when the value is malformed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 16
- `boundary: true`: `externalBlockOf` is a classifier whose non-null prevents selection. Probed with
  `security-probe.mjs --entry 'skills/develop-next/scripts/select-next.mjs#externalBlockOf'
  --sink markdown-structure --cases-file <16 cases>`: 12 hostile inputs (placeholders, YAML nulls,
  empty and empty-quoted values, a body-only key, a suffixed lookalike key, no frontmatter, an empty
  document) all read null; 4 legitimate conditions (plain, the task.174 spelling, CRLF, quoted with a
  colon) all held. Verdict `engages`, reproduced 0, escaped 0. Record:
  `task.235.qa.1.security.run.json`.

### Maintainability — PASS

Rule sites, standards row and reference doc updated together.

---

## Code Review

Reviewed 12 files (full branch diff). Anchors checked with `finding-anchors.js`: both `ok`.

**Correctness bugs (1):**

- [low/high] `skills/develop-next/scripts/select-next.mjs:1022` — a quoted condition containing ` #`
  is truncated by `frontmatterScalar`'s comment rule → strip a balanced quote pair before the comment
  rule for this key; add a test. Promoted to gate `TASK-235-CR-1`.

**Cleanups (1):**

- `skills/develop-next/scripts/select-next.mjs:938` — the dependency-blocked count matches the reason
  text → count on a structured marker. Advisory; recorded in `recommendations.future`.

mutation-proven: frontier `readExternalBlock` call disabled (`null &&`) in a scratch worktree of HEAD → five `235:` tests red (180/185) → covered

---

## Regression Testing

The 176 pre-existing `select-next.test.mjs` tests pass unchanged; full `npm run ci` green. PASS.

---

## Test Artifacts

### Files Reviewed

`skills/develop-next/scripts/select-next.mjs`, `evals/develop-next/unit/select-next.test.mjs`,
`skills/develop-next/references/roadmap-selection.md`, `skills/create-task/SKILL.md`,
`docs/standards/task-documents.md`, `docs/tasks/task-registry.md`, task.174 frontmatter.

### Test Commands Executed

```bash
command node --test evals/develop-next/unit/select-next.test.mjs          # 185 pass
# wall time, base worktree at origin/develop vs PR head, 3 interleaved runs, bash `time`
npm run -s validate -- skills/develop-next/ ; npm run -s validate -- skills/create-task/
command node .agents/skills/qa-task/references/security-probe.mjs --sink markdown-structure \
  --cases-file t235-probe-cases.json --entry 'skills/develop-next/scripts/select-next.mjs#externalBlockOf' \
  --record docs/tasks/task.235.select-next-external-precondition/task.235.qa.1.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-task/SKILL.md \
  --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

### Coverage Report

Not measured (no coverage tooling for these Node test files).

---

## Recommendations

### Immediate Actions (Blocking)

None blocking. TASK-235-CR-1 is open at LOW and enters the fix loop.

### Short-term Actions (Non-Blocking)

1. CR-2: structured marker for dependency-blocked rows.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH or MEDIUM findings; all NFRs PASS; one open LOW.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.235.qa.1.select-next-external-precondition.md`
**Gate File**: co-located at `task.235.gate.1.select-next-external-precondition.yml`
**Next Steps**: fix TASK-235-CR-1 (qa-fix), then re-review.
