# QA Report: Task 221 - Migration engine: dot-directory references and displaced-block edits

**Task**: [task.221.migration-engine-dot-directory-and-displaced-edit.md](./task.221.migration-engine-dot-directory-and-displaced-edit.md)
**Gate File**: [task.221.gate.1.migration-engine-dot-directory-and-displaced-edit.yml](./task.221.gate.1.migration-engine-dot-directory-and-displaced-edit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Executive Summary

The review covered both engine fixes, their tests, the bundled copy and the CHANGELOG entry. Both
fixes do what the success criteria say, and each is held by a committed test that goes red when the
fix is reverted. The diff reviewer found one low-severity issue, and it was already on develop.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#714)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools. This is a small task: 3 phases, one module, low risk. Step 3b ran as one read-only
Explore subagent over the whole `origin/develop...HEAD` diff (dispatched 04:37:09Z; returned in
53,512 ms per its completion notice). First review, so no re-review scope applies.

Step 4b: not applicable. The change set has no runnable prose: no `SKILL.md` or
`shared/resources/*.md` file changed.

Traceability mapper: skipped. Success Criteria is a checklist, not a table.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: dot-directory references | PASS | Verified | `forms` branch tests `/^\.\.?\//` (`migrate-doc-numbering.mjs:1145`) |
| Phase 2: displaced-block edits | PASS | Verified | `editFrontmatter` returns early on `unclosed`/`displaced` (`:902`) |
| Phase 3: bundle, CHANGELOG, CI | PASS | Verified | bundled copy matches; `CHANGELOG.md` Fixed entry present |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| `cat .docs/prd.md` gives one hit | 1 hit | 1 hit | PASS | test `task.221 CR-1` |
| `cat ${ROOT}/.docs/prd.md` gives one hit | 1 hit | 1 hit | PASS | test `task.221 CR-1` |
| `cat docs/prd.md` gives `[]` | `[]` | `[]` | PASS | test `task.221 CR-1` (must-not row) |
| `editFrontmatter` leaves displaced/unclosed input unchanged | byte-equal | byte-equal | PASS | test `task.221 CR-2` |
| Existing rows pass | 68/68 | 68/68 | PASS | suite 70/70 |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Linearity row passes | pass | pass | PASS | existing outsideReferences linearity row |
| No new pass over the input | none | none | PASS | read: `:902` is an early return; `:1145` swaps a predicate in a branch that already runs once per token |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Each fix mutation-proven | 2/2 | 2/2 | PASS | Code Review section below |
| `bundle:check` | 0 problems | 0 problems | PASS | develop step run (implementation report) |
| `npm run ci` | pass | pass locally | PASS | develop step run; PR CI `test` job still pending |
| `validate` for changed skill | pass | pass | PASS | `npm run validate -- skills/review-prd/` exit 0 |

---

## Breaking Changes Validation

None. The task names one behaviour widening: a dot-directory mention now raises `stale-reference`.
The fix instructions that blocker already prints cover it. No consumer code changes.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- `linkPass` keeps a `./` prefix only when the new path does not start with `.`, so a
  `./.docs/x.md` link is rewritten as `.docs/x.md`. The target still resolves. Pre-existing
  (see Code Review).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS

No new pass over the input. The linearity row passes unchanged.

### Reliability — PASS

A displaced or unclosed document is now returned unchanged. Before the fix, the edit was written above
the real block.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates named: `outsideReferences` is a scanner that returns hits. It does
  not accept or reject its input; the `stale-reference` blocker its hits feed is unchanged. The
  change only widens detection, so a migration is now refused on more inputs, never fewer.
  `editFrontmatter` is a writer and returns no verdict. `parseNameValue`, the engine boundary
  task.211 probed, is not in this diff.

### Maintainability — PASS

Two one-line fixes. Each has a comment that names its finding and a test that holds it.

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out). Anchor check: `ok`.

**Correctness bugs (1):**

- [low/medium] `shared/resources/migrate-doc-numbering.mjs:1019`: `linkPass` reads a dot-directory
  name as a relative prefix, so a `./.docs/prd.md` link loses its `./` on rewrite (target still
  resolves) → switch the test to `/^\.\.?(\/|$)/` or record why it stays. **Pre-existing**: the
  same line is on `origin/develop` (`:1016`). 0 links of that shape point at a migrated target in
  the repository (the 2 `](./.` hits are dotfile links in `AGENTS.md` and `CONTRIBUTING.md`).
  Not high confidence, so not promoted. Routed to `recommendations.future`.

**Cleanups (0).**

boundary: false · probes_executed: 0 · escaped: 0

mutation-proven: `forms` predicate reverted to `rest.startsWith(".")` → `task.221 CR-1: outsideReferences compares a dot-directory path at the root` → covered
mutation-proven: guard reverted to `state === "unclosed"` only → `task.221 CR-2: editFrontmatter leaves a displaced or unclosed block alone` → covered

Both proofs ran on the committed engine, restored from a `cp` snapshot. Baseline was 70/70 between
mutations, and `git status` was unchanged afterwards.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204/211) | PASS (68/68) |
| Full `ci:fast` | PASS (develop step, 6105 tests, 0 fail) |
| PR CI | link-check, shellcheck, validate pass; test pending |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/migrate-doc-numbering.mjs`
- `shared/resources/tests/migrate-doc-numbering.test.mjs`
- `skills/review-prd/references/migrate-doc-numbering.mjs`
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs
npm run validate -- skills/review-prd/
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings> --rev HEAD --json
```

### Coverage Report

Not measured (the repository's test runner records no coverage).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. `linkPass` `./` prefix on a dot-directory target. Fix only if a consumer reports it.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is met and held by a committed test. The only finding is low severity
and pre-existing.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.221.qa.1.migration-engine-dot-directory-and-displaced-edit.md`
**Gate File**: co-located at `task.221.gate.1.migration-engine-dot-directory-and-displaced-edit.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
