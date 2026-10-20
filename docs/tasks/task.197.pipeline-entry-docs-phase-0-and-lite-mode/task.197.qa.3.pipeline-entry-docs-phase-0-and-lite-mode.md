# QA Report: Task 197 - Pipeline entry docs: Phase 0, lite mode and invocation

**Task**: [Link to task document](./task.197.pipeline-entry-docs-phase-0-and-lite-mode.md)
**Gate File**: [task.197.gate.3.pipeline-entry-docs-phase-0-and-lite-mode.yml](./task.197.gate.3.pipeline-entry-docs-phase-0-and-lite-mode.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| QA2-CR-1 — faq.md lite-mode wording | ✅ FIXED | The answer now says lite mode trades QA depth and that mapping still runs; the reviewer raised nothing on it |
| CR-2 (advisory) — scratch-branch cleanup | ✅ FIXED | `git branch -D` follows `git worktree remove` in both runbooks |
| CR-3 (advisory) — `Depends on` scope | ✅ FIXED | Row now names the registry fallback |

## Executive Summary

Cycle 2's fixes hold. The scoped review found that the create-parallel-stories runbook now disagrees with
the commands the skill it names prints, with no sentence reconciling the two. The skill cannot change
here, so the runbook must say how the two relate.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix QA3-CR-1.

## Review Methodology

Re-review scope: files changed since gate 2 (head 5155be5d2780; 4 files) — default

Direct tools, plus one read-only Explore reviewer over the scoped 4-file patch. Dispatched 04:10:28Z;
completion notice `duration_ms` 86153. Step 4b: not applicable.

## New Findings This Cycle

- **[medium]** `docs/runbooks/create-parallel-stories.md:48` — step 1 says the skill produces the setup
  commands, but steps 2 and the cleanup bullet show a different shape than it prints → reconcile in the
  runbook (QA3-CR-1, promoted).
- **[low, advisory]** `docs/standards/task-documents.md:66` — "shown on the tracker card" holds only on
  GitHub → say the GitHub issue card (CR-2).

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC-1 / SC-2 | RUNBOOKS-6's fix leaves the runbook inconsistent with the skill it cites | CONCERNS |
| SC-5 | `npm run ci:fast` on the 5155be5d tree: 5955 pass, 0 fail | PASS |
| SC-6 | link check on cycle 2's 4 docs: 0 dead | PASS |
| SC-4, SC-7, SC-8, SC-9 | unchanged | PASS |

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1 (advisory)

Provenance: the step-1 → step-2 contradiction is new in this branch (the RUNBOOKS-6 fix). The skill's
emitted commands are pre-existing and out of scope, so they are routed to `recommendations.future`.

## NFR Assessment

- **Performance**: PASS (N/A)
- **Reliability**: PASS
- **Security**: PASS — Evidence: reasoned; Probes executed: 0; `boundary: false`
- **Maintainability**: PASS

## Code Review

`code_review_blocking=true`. Anchors: `ok` ×2.

**Correctness bugs (2):**
- [medium/high] `docs/runbooks/create-parallel-stories.md:48` — runbook vs skill setup commands. **Promoted: QA3-CR-1.**
- [low/medium] `docs/standards/task-documents.md:66` — tracker-card claim is GitHub-only. Advisory.

```text
mutation-proven: (none) → not-run (documentation only)
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: `/qa-fix` cycle 3.
