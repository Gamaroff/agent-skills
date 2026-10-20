# Sprint Review Summary - Pipeline entry docs: Phase 0, lite mode and invocation

**Story/Task ID:** task.197
**Completed Date:** 2026-10-20
**Completed By:** Lorien Gamaroff (pipeline: develop-next → develop-task)
**Pull Request:** [#702](https://github.com/Gamaroff/agent-skills/pull/702)

---

## Summary

The docs now describe starting a pipeline the way the skills actually behave. Phase 0 asks two questions unless flags answer them. Lite mode is auto-detected and changes QA depth only. The epic integration branch is opt-in. The entry points are `/develop-task` and `/develop-story`.

---

## What Was Delivered

### Success Criteria Met

- [x] SC-1: All 16 doc-drift findings (2026-10-07 audit) fixed; Phase 0 re-verified each one before editing
- [x] SC-2: No changed doc still states the old behaviour. QA widened the grep to all of `docs/` and fixed one more copy (`faq.md`)
- [x] SC-3: Every documented command was run once, or cited to its source where running it writes to a tracker
- [x] SC-4: Performance not applicable (docs only)
- [x] SC-5, SC-6, SC-7, SC-9: format check, local link check on every changed file, skill validation, and the two doc-reading tests all pass
- [x] SC-8: The audit report marks every task.197 finding resolved

### Key Changes

- **Lite mode**: no `--lite` flag. It is auto-detected, `--mode lite` can request it, and `--mode fast` is gated by `develop.skippable`. It trades QA depth, never the pre-develop mapping or the Step 7 side-effects.
- **Phase 0**: Q1/Q2 are asked only where `--base`, `--target`, `--defaults` or the lock leave them open. Q1 recommends `develop`, or the current `feature/*` branch.
- **Branches and invocation**: the epic integration branch is opt-in (`branch_model`). The parallel-story worktree commands use a scratch branch with an explicit base and delete it on cleanup.

---

## Technical Details

### Files Modified

- `docs/concepts/architecture.md`, `docs/concepts/development-pipeline.md`: branch-model wording
- `docs/reference/{anti-patterns,faq,glossary,troubleshooting}.md`: lite mode and Phase 0
- `docs/runbooks/{create-parallel-stories,first-week,story-development,task-development}.md`, `docs/runbooks/first-week/day-4-parallel.md`: invocation, worktrees, Q1/Q2
- `docs/standards/{story,task}-documents.md`: epic branch, `depends_on`
- `skills/develop-task/README.md`: epic-branch wording
- `.agents/plans/doc-drift-audit-2026-10-07.md`: 16 findings marked resolved
- `CHANGELOG.md`: Unreleased/Fixed entry

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** none added (docs only). The fast gate passed on every fix commit with 5955 pass, 0 fail, and the doc-reading tests passed 42/42.
- **QA:** 4 cycles. Gates 1–3 were CONCERNS (7 findings fixed); gate 4 was PASS 100/100.
- **PR conformance review (5c):** APPROVE, with 1 low advisory scope note.
- **Approval Status:** ✅ No reviews are required on this repo; the 5c review stands in.

---

## Security & Compliance

✅ **Security Review Completed**: documentation only, not a boundary; no secrets, unsafe patterns or dependency changes.
✅ **Compliance**: not applicable.

---

## Known Limitations and Future Work

- `skills/create-parallel-stories/SKILL.md` still prints worktree examples with no base and no branch cleanup. The runbook reconciles the two; aligning the skill is a follow-up.
- `shared/resources/tracker-card-summary.md` lists `depends-on` on Jira task cards, which the Jira sync does not write. The contract or the writer should be aligned.
