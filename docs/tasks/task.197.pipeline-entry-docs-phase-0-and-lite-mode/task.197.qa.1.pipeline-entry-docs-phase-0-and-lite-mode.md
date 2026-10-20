# QA Report: Task 197 - Pipeline entry docs: Phase 0, lite mode and invocation

**Task**: [Link to task document](./task.197.pipeline-entry-docs-phase-0-and-lite-mode.md)
**Gate File**: [task.197.gate.1.pipeline-entry-docs-phase-0-and-lite-mode.yml](./task.197.gate.1.pipeline-entry-docs-phase-0-and-lite-mode.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Executive Summary

All 16 audited findings are fixed across 13 docs, and every changed link and anchor resolves. The
independent diff review found that the new lite-mode wording overstates `--mode fast` at four sites:
it says fast "forces" the shortening, but fast is refused unless `develop.skippable` allows it. It
also found one Q1 recommendation that disagrees with step-0 §0d.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL. Fix QA1-CR-1 and QA1-CR-2.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (N/A, docs only)
- [x] Code on feature branch with open PR (#702)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (fast gate, doc-reading tests)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (boundary rule)
- [x] Code Review (diff claim review)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for Step 3b. The change set is documentation only,
so the reviewer was told to treat each changed sentence as the code and to verify it against the
canonical skill sources. The reviewer was dispatched at 03:51:54Z and its completion notice reported
`duration_ms` 150483 (about 2.5 minutes).

- Step 4b: not applicable. No runnable prose (`SKILL.md` or `shared/resources/*.md`) is in the change set.
- Adaptive strategy: default (5 phases, docs only). The traceability mapper was skipped because the
  success criteria are a checklist, not a table.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 0: Re-verify findings | PASS | Verified | Recorded in the implementation report |
| Phase 1: Overview / concepts | PASS | Verified | |
| Phase 2: Reference | CONCERNS | Partial | glossary `--mode fast` wording (QA1-CR-1) |
| Phase 3: Runbooks / standards | CONCERNS | Partial | runbooks `--mode fast` wording (QA1-CR-1); task-development Q1 (QA1-CR-2) |
| Phase 4: Audit marks, verification | PASS | Verified | 16 Resolved lines |

**Overall Phase Completion**: 3/5 phases passed cleanly; 2 carry the findings below.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC-1 / SC-2: each finding fixed and matches the skill | Read each site against its source. Four sites overstate `--mode fast`, and one Q1 line is incomplete | CONCERNS |
| SC-4: no skill behaviour change | `git diff --name-only` shows docs, the README, the audit plan and the CHANGELOG only | PASS |
| SC-5: tests | `npm run ci:fast`: 5955 pass, 0 fail, 14 skipped (5969 tests). Doc-reading tests 42/42 | PASS |
| SC-6: link check on every changed doc | `markdown-link-check@3` with the CI config on 15 files: 0 dead | PASS |
| SC-7: validate | `npm run validate -- skills/develop-task/`: ✓ | PASS |
| SC-8: audit report marked | 16 `Resolved:` lines in `.agents/plans/doc-drift-audit-2026-10-07.md` | PASS |
| SC-9: tests reading edited docs | `tests/restricted-access-docs.test.js` and `evals/shared/tests/pr-review-loop-parity.test.mjs`: 42/42 | PASS |

---

## Breaking Changes Validation

N/A. Documentation only.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: `--mode fast` described as forcing lite (QA1-CR-1)**
- **Severity**: MEDIUM
- **Category**: Quality (documentation accuracy)
- **Observation**: `docs/reference/glossary.md:29`, `docs/runbooks/story-development.md:249` and
  `docs/runbooks/task-development.md:128` say `--mode fast` "forces" the shortening.
  `docs/concepts/quickstart-story.md:130` says `--mode` "can request or force" it.
  `develop-pipeline-lite-mode.md` (the `fast` row of §Speed Modes) and `pipeline-answers.js` refuse
  `--mode fast` unless `develop.skippable` lists both `qa-depth` and `review-pr-depth`, or
  `develop.defaultMode` is `fast`. The allow-list is empty by default.
- **Impact**: a reader passes `--mode fast` and is refused with no warning from the docs. This is the
  mirror-image drift the task review (I-1) warned about.
- **Recommendation**: name the `develop.skippable` condition at all four sites, and cite §Speed Modes
  rather than restating it.
- **Bug report**: none. The finding is tracked in the gate; the change is one sentence per site.

### LOW Severity Issues (1)

- **QA1-CR-2**: `docs/runbooks/task-development.md:94` gives Q1 as "recommended `develop`". §0d
  recommends `feature/{current}` when the run is invoked from a `feature/*` branch, and
  `skills/develop-task/README.md:51` already says so.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance: PASS
N/A, docs only.

### Reliability: PASS
The worktree command was verified to run, and the old form reproduces `fatal: invalid reference`.

### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The diff adds no predicate, script or runnable `SKILL.md` / shared prose. The
  only changed fences are `git worktree add` examples in runbooks, which refuse nothing.

### Maintainability: PASS
Fixes cite canonical sections. The two inaccuracies are tracked as gate findings.

---

## Code Review

Advisory, except where promoted. `code_review_blocking=true` (pipeline override). Reviewed 14 changed
Markdown files, 17 hunks. All anchors were checked with `finding-anchors.js`: `ok` ×4.

**Correctness bugs (4):**
- [medium/high] `docs/reference/glossary.md:29`: "`--mode fast` forces it" is false by default. The
  same wording is at `story-development.md:249` and `task-development.md:128`. Name the
  `develop.skippable` condition. **Promoted: QA1-CR-1.**
- [low/high] `docs/runbooks/task-development.md:94`: the Q1 recommendation omits the `feature/*` case
  in §0d. **Promoted: QA1-CR-2.**
- [low/medium] `docs/runbooks/create-parallel-stories.md:50`: enumeration risk. The
  `create-parallel-stories` SKILL.md generator (lines 249–255, 294, 374, 452, 769) still emits
  `-b feature/story-1-1-1` with no base. Out of scope (skill behaviour); routed to
  `recommendations.future`.
- [low/medium] `docs/runbooks/create-parallel-stories.md:58`: "from `origin/develop`" should be
  "from `origin/<Q1 base>`" (the epic integration branch when the epic opted in). Advisory; noted in
  `recommendations.future`.

**Cleanups (0).**

Provenance: QA1-CR-1, CR-2 and CR-4 are new in this diff. The base wording at those sites did not say
any of these things. CR-3's generator lines are pre-existing and unchanged by this diff.

Mutation proofs: not run. No test guards a fix made this cycle (docs only, no tests changed).

```text
mutation-proven: (none) → not-run (no test added or changed; documentation criteria verified by reading)
```

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full suite (`npm run ci:fast`) | PASS, 0 fail |
| Tests that read edited docs (2 files) | PASS, 42/42 |
| Changed links and anchors | PASS, 0 dead; 4/4 cross-file anchors resolve (reviewer and earlier slug check) |

---

## Test Artifacts

### Files Reviewed
The 13 edited docs, `skills/develop-task/README.md`, `CHANGELOG.md` and
`.agents/plans/doc-drift-audit-2026-10-07.md`, read against `shared/resources/develop-pipeline-lite-mode.md`,
`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` and `shared/resources/pipeline-answers.js`.

### Test Commands Executed
```bash
npm run ci:fast                                   # EXIT=0; 5955 pass / 0 fail / 14 skipped
npm run validate -- skills/develop-task/          # ✓ develop-task
command node --test tests/restricted-access-docs.test.js evals/shared/tests/pr-review-loop-parity.test.mjs   # 42/42
command npx --yes markdown-link-check@3 --quiet --config .github/markdown-link-check.json <file>   # ×15, 0 dead
```

### Coverage Report
N/A (documentation).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA1-CR-1: correct the `--mode fast` wording at four sites (P2).
2. QA1-CR-2: complete the Q1 recommendation in task-development (P3).

### Short-term Actions (Non-Blocking)
1. Align the `create-parallel-stories` SKILL.md worktree commands with the scratch-branch form (follow-up task).
2. Make create-parallel-stories runbook line 58 say "from `origin/<Q1 base>`".

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: There is one medium documentation-accuracy finding. It is new in this diff and
repeated at four sites.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA1-CR-1 and QA1-CR-2 fixed.

---

**QA Report**: co-located at `task.197.qa.1.pipeline-entry-docs-phase-0-and-lite-mode.md`
**Gate File**: co-located at `task.197.gate.1.pipeline-entry-docs-phase-0-and-lite-mode.yml`
**Next Steps**: run `/qa-fix` (Step 5b), then re-review.
