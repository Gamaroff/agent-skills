# QA Report: Task 197 - Pipeline entry docs: Phase 0, lite mode and invocation

**Task**: [Link to task document](./task.197.pipeline-entry-docs-phase-0-and-lite-mode.md)
**Gate File**: [task.197.gate.2.pipeline-entry-docs-phase-0-and-lite-mode.yml](./task.197.gate.2.pipeline-entry-docs-phase-0-and-lite-mode.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| QA1-CR-1 — `--mode fast` described as forcing lite (4 sites) | ✅ FIXED | All four sites now name the `develop.skippable` condition; the refute pass re-read them against `lite-mode.md` §Speed Modes and `pipeline-answers.js` and raised nothing |
| QA1-CR-2 — task-development Q1 omits the `feature/*` case | ✅ FIXED | Line 94 now matches step-0 §0d |
| CR-4 (advisory) — worktree base `origin/develop` | ✅ FIXED | create-parallel-stories now says `origin/<Q1 base>` |

## Executive Summary

Cycle 1's fixes hold. The cycle 2 refute pass, over the whole branch diff, found one more site of the
lite-mode defect this task fixes: `faq.md:33` still says lite mode skips re-reading the codebase. It
is pre-existing, but it is in the task's own defect class, so the task is unfinished there.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix QA2-CR-1.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status `ready-for-review`
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (N/A)
- [x] Open PR (#702)

### Review Methodology

Re-review scope: whole branch diff — cycle 2 refute pass (`origin/develop...HEAD`, 14 files)

Direct tools, plus one read-only Explore reviewer with the refute directive. Dispatched 04:02:11Z;
completion notice `duration_ms` 200946. Step 4b: not applicable — no `SKILL.md` or
`shared/resources/*.md` in the change set.

---

## New Findings This Cycle

- **[medium]** `docs/reference/faq.md:33` — says lite mode skips "re-reading the codebase,
  regenerating context", the claim fixed at five other sites → rewrite in the QA-depth wording
  (QA2-CR-1, promoted).
- **[low, advisory]** `docs/runbooks/create-parallel-stories.md:66` — cleanup removes the worktree
  but not its scratch branch, so re-running the setup for the same story fails → add
  `git branch -D` (CR-2).
- **[low, cleanup]** `docs/standards/task-documents.md:66` — the registry `Depends on` column gates
  only the registry fallback frontier, not every selection → qualify (CR-3).

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 0–1 | PASS | |
| Phase 2: Reference | CONCERNS | faq.md lite-mode wording (QA2-CR-1) |
| Phase 3–4 | PASS | |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC-1 / SC-2 | The 16 findings are fixed; SC-2's grep covered changed docs only, and missed `faq.md:33` | CONCERNS |
| SC-4 | Docs only | PASS |
| SC-5 | `npm run ci:fast` on `39dae0c8`'s tree: 5955 pass, 0 fail | PASS |
| SC-6 | link check on the 5 docs cycle 1 edited: 0 dead (cycle 1 covered the rest) | PASS |
| SC-7, SC-8, SC-9 | unchanged since cycle 1 | PASS |

## Breaking Changes Validation

N/A.

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 (advisory)

Provenance for QA2-CR-1: `git show origin/develop:docs/reference/faq.md` line 33 is identical
(pre-existing). It is kept in `top_issues[]` and not routed to `recommendations.future`, because the
task's Overview names lite-mode wording as its defect class.

## NFR Assessment

- **Performance**: PASS (N/A)
- **Reliability**: PASS
- **Security**: PASS — Evidence: reasoned; Probes executed: 0; `boundary: false` (no predicate, script or runnable prose)
- **Maintainability**: PASS

## Code Review

`code_review_blocking=true`. Anchors: `ok` ×3.

**Correctness bugs (2):**
- [medium/high] `docs/reference/faq.md:33` — stale lite-mode claim. **Promoted: QA2-CR-1.**
- [low/medium] `docs/runbooks/create-parallel-stories.md:66` — scratch branch not cleaned up. Advisory.

**Cleanups (1):**
- `docs/standards/task-documents.md:66` — `Depends on` gating is the fallback frontier's. Advisory.

```text
mutation-proven: (none) → not-run (documentation only; no test guards these fixes)
```

## Regression Testing

The fast gate is green on the cycle 1 fix tree. Doc-reading tests: 42/42 (cycle 1; the files they read
were not touched by cycle 1's fixes, except story- and task-development, re-covered by the fast gate run).

## Test Artifacts

```bash
npm run ci:fast        # on the 39dae0c8 tree: 5955 pass / 0 fail
git show origin/develop:docs/reference/faq.md | sed -n 33p   # provenance
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — QA2-CR-1 fixed.
**Next Steps**: `/qa-fix` cycle 2.
