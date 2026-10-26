# QA Report: Task 169 - Close the four advisory findings on the reference-doc pinning test

**Task**: [Link to task document](./task.169.pinning-test-advisory-fixes.md)
**Gate File**: [task.169.gate.1.pinning-test-advisory-fixes.yml](./task.169.gate.1.pinning-test-advisory-fixes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: PASS

---

## Executive Summary

This was a first review of a test-only change to `tests/reference-doc-skill-pinning.test.js`, plus
its `CHANGELOG.md` entry. All four advisory findings from task.142 are closed. Each fix is held by a
committed test, and QA re-proved each one with its own mutation run. The diff review raised two
low-severity points. Neither is high-confidence, so neither gates. Both are recorded as follow-ups.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3, every checkbox ticked)
- [x] Tests passing
- [x] Breaking changes documented (none — test-only)
- [x] Code on feature branch with open PR (#758, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit — `node:test`)
- [ ] Performance Testing (the existing cost tests stand in)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools. This is a small task: 3 phases, one test file, Low risk. The Step 3b diff review ran
as one read-only Explore subagent over `origin/develop...HEAD -- tests CHANGELOG.md`. The task
documents in the branch diff hold no reviewable code. Timing: dispatched 17:26:08Z (`date -u`);
the completion notice gave `duration_ms` 189757 (about 3.2 minutes). Mutation proofs ran after the
reviewer was dispatched, in a scratch worktree (`git worktree add --detach`), never in the tree it
was reading. The worktree was then removed.

Step 4b: not applicable. The change set holds no `SKILL.md` and no `shared/resources/*.md`.

Standards-named validation: `npm run validate -- skills/<changed-skill>/` was not run, because no
skill changed. `npm run ci:fast` (format:check + `npm test`) ran with `.agents/skills` and
`.claude/skills` moved aside.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Boundary flag match and empty-vs-missing | PASS | Verified | `documentsFlag` at both `resolveCorpus` call sites; `body === null` → missing, `!body.trim()` → empty, on both pages |
| Phase 2: Activation flags checked | PASS | Verified | standalone `--flag` span attaches to the prior skill span; `undocumentedActivationFlags` / `activationFlagChecks`; live floor ≥ 2 |
| Phase 3: One corpus resolution per run | PASS | Verified | memoised `getCorpus()`; `withSpies` hoisted to module scope |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A row flag that a skill documents only as a longer flag fails the flag test | "a flag is documented only as a whole token" plus "every flag check fails when each SKILL.md documents only longer flags"; mutations (helper → `includes`; call sites → `includes`) both covered | PASS |
| Every activation-table flag is checked against its skill | "every flag a mention gives its skill is documented by that skill" (floor ≥ 2); mutation (activation loop emptied) covered | PASS |
| An empty `SKILL.md` reports "is empty", a missing one "does not exist", on both pages | "an empty SKILL.md is reported as empty, not missing, on both pages"; mutations (`!body` on each side) covered | PASS |
| The corpus is resolved once per run | "the corpus is resolved once per run"; mutation (memo removed) covered | PASS |
| The existing cost tests stay green | "the guard's cost" suite green | PASS |
| `node:test` + `node:assert` only; Prettier clean; `npm test` green with skills symlinks aside | file imports; `npm run ci:fast` (see Test Commands) | PASS |
| Each fix mutation-proven | 8/8 QA mutations covered (below) | PASS |
| `CHANGELOG.md` `[Unreleased]` records the change | entry under `### Fixed` | PASS |
| No consumer-facing change | diff touches `tests/`, `CHANGELOG.md` and the task directory only | PASS |

---

## Breaking Changes Validation

None. This is a test-only change. The guard is stricter, and the live corpus passes it.

**Overall Breaking Changes Assessment:** PASS (N/A)

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

Both come from the diff review and are advisory. Details are under Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (advisory, not in `top_issues[]`)

---

## NFR Assessment

### Performance — PASS

The existing cost tests are green: no spawn, no network, one `SKILL.md` read per skill. The memo
also halves page reads.

### Reliability — PASS

Every new check has a non-vacuity floor: activation flag checks ≥ 2 (3 measured), and the call-site
fixture asserts that all flag checks fail.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates considered: `documentsFlag`, `extractActivationSkills` (the
  standalone-flag attachment) and `resolveCorpus`'s empty/missing split. Each classifies spans or
  bodies of tracked repository documents so a test can assert on them. None gates an action on
  external input, so the "a `false` prevents an action" signal is absent. This follows the task.142
  precedent for the same file.

### Maintainability — PASS

Each rule has a comment that names the task. Fixture tests are independent of the live corpus.
`withSpies` is now at module scope.

---

## Code Review

Advisory under the resolved `CR_BLOCKING=true`: neither finding is `confidence: high`, so neither is
promoted to `top_issues[]`. Both anchors were checked by `finding-anchors.js` (`ok`).

**Correctness bugs (2):**

- [low/medium] `tests/reference-doc-skill-pinning.test.js:148` — a non-skill span (for example a
  `/develop-story` command or a script name) is skipped without resetting `last`. A standalone
  `--flag` after it is therefore checked against the earlier skill. No live row triggers this.
  The task's own rule ("the nearest skill span before it") is what the code does, so this is a
  question of design, not a regression. → Reset `last` on a non-skill span and add a fixture.
  Routed to `recommendations.future`.
- [low/low] `tests/reference-doc-skill-pinning.test.js:145` — a standalone flag span attaches only
  its head token, so a span holding two flags would drop the second. No live span holds two flags
  (searched `docs/reference/activation-phrases.md`: 0). → Attach every `--` token in the span.
  Routed to `recommendations.future`.

**Cleanups (0)**

**Mutation proofs (QA, scratch worktree, committed tests):**

- mutation-proven: `documentsFlag` → `body.includes(flag)` → "a flag is documented only as a whole token" and "every flag check fails when each SKILL.md documents only longer flags" → covered
- mutation-proven: both `resolveCorpus` call sites → `body.includes(flag)`, helper kept → "every flag check fails when each SKILL.md documents only longer flags" → covered
- mutation-proven: standalone-flag attachment removed → "a flag in a span of its own attaches to the skill before it" → covered
- mutation-proven: commands side `body === null` → `!body` → "an empty SKILL.md is reported as empty, not missing, on both pages" → covered
- mutation-proven: activation side `body === null` → `!body` → "an empty SKILL.md is reported as empty, not missing, on both pages" → covered
- mutation-proven: memo removed → "the corpus is resolved once per run" → covered
- mutation-proven: activation flag loop emptied → "every flag a mention gives its skill is documented by that skill" → covered
- mutation-proven: repeated-skill dedupe off → "a skill named twice in a cell is one mention, and keeps its flags" → covered

8 of 8. The baseline was green before and after, and the snapshot was restored with `cp` (`cmp` clean).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `tests/reference-doc-skill-pinning.test.js` | 29/29 pass |
| Full fast gate (`npm run ci:fast`, symlinks aside) | see Test Commands Executed |

---

## Test Artifacts

### Files Reviewed

- `tests/reference-doc-skill-pinning.test.js`
- `CHANGELOG.md`
- `docs/reference/commands.md`, `docs/reference/activation-phrases.md` (the corpus, read only)

### Test Commands Executed

```bash
command node --test tests/reference-doc-skill-pinning.test.js   # 29 pass, 0 fail
npm run ci:fast   # .agents/skills and .claude/skills moved aside — rc 0; 6,406 tests, 6,392 pass, 0 fail
```

### Coverage Report

Not measured. `node:test` coverage is not configured for this suite. Coverage is argued by the
mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1: reset `last` on a non-skill span so a flag after a command or script is never charged to an earlier skill.
2. CR-2: attach every `--` token of a standalone flag span.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All four fixes are in, and each is held by a committed test that QA mutation-proved. The two diff-review points are low-severity, are not triggered by any live row, and are recorded as follow-ups.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.169.qa.1.pinning-test-advisory-fixes.md`
**Gate File**: co-located at `task.169.gate.1.pinning-test-advisory-fixes.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise`.
