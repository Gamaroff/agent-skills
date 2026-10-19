# Sprint Review Summary - Task 196: Pipeline docs: QA loop, resume and artifacts

**Task:** [task.196](./task.196.pipeline-docs-qa-loop-and-artifacts.md)
**Status:** Accepted
**Accepted:** 2026-10-19
**Pull Request:** [#701](https://github.com/Gamaroff/agent-skills/pull/701)
**Tracker:** [#599](https://github.com/Gamaroff/agent-skills/issues/599)

---

## Summary

The develop-pipeline docs now match how the QA loop routes, how a halted run resumes, and which artifacts a run writes. This closes 31 medium and low findings from the 2026-10-07 doc-drift audit across 15 docs.

---

## What Was Delivered

### Acceptance Criteria Met

- ✅ SC-1: every finding was fixed, except RUNBOOKS-12 part 1, which was already fixed on develop and closed with that reason
- ✅ SC-2: no changed doc states the old behaviour (per-finding grep in the DoD file)
- ✅ SC-3: the added `install-hooks.sh --dry-run` command was run; commands that write the lock are cited by source
- — SC-4: N/A (documentation only)
- ✅ SC-5 to SC-7: `doc-links.js` passes on 15/15 docs; CI link-check and validate are green
- ✅ SC-8: the audit report marks all 31 findings resolved

### Key Features Implemented

- QA-loop routing as the code runs it. A gate with no open findings hands to Step 5c. Routes 2, 2b and 2c are covered, and `QA_MAX_CYCLES` replaces the literal 5.
- Resume paths: a not-converging grant re-enters at 5b, and a finalise DoD-gaps halt can re-enter QA at 5a after a committed code fix. The no-code-moved case is covered too.
- Artifact names and commit timing: numbered review reports, `pr-review`, `sprint-review-summary.md`. QA reports, gates and the DoD are committed when they are written, not at Step 8.
- Merge gate and hooks: develop-next / develop-batch merge-gate wording, and the `Stop` hook beside `PreCompact`.

---

## Technical Details

### Files Modified/Created

15 docs: `docs/concepts/{architecture,quickstart-story,quickstart-task}.md`, `docs/operations/workflows.md`, `docs/reference/{pipeline-artifacts,troubleshooting}.md`, `docs/runbooks/{story-development,task-development}.md`, `docs/runbooks/first-week/day-3-messy-path.md`, `docs/standards/task-documents.md`, and `skills/{develop-batch,develop-next,develop-story,develop-task,review-task}/README.md`. The PR also updates `.agents/plans/doc-drift-audit-2026-10-07.md`.

### Architecture/Design Decisions

The scope was held to the 15 listed docs (review decision D1). The `story-documents.md` / `file-naming.md` gap is a follow-up.

### Dependencies

None.

---

## Testing & Quality Assurance

### Test Coverage

Documentation only. `npm run ci` is green, the doc-reading tests pass 181/181, and the Mermaid validator accepts the changed diagrams.

### Code Review

There were 4 QA cycles: CONCERNS 90 three times, then PASS 100. HIGH was 0 throughout; MEDIUM went 3, 2, 1, 0. Step 5c `/review-pr` returned APPROVE with no conformance findings.

---

## Security & Compliance

### Security Review

PASS. No script, predicate or prompt changed, and there is no boundary.

### Compliance Review

N/A.

---

## Documentation

### Updated Documentation

The 15 docs listed above.

### Documentation Links

- DoD: [task.196.dod.1](./task.196.dod.1.pipeline-docs-qa-loop-and-artifacts.md)
- Final QA: [task.196.qa.4](./task.196.qa.4.pipeline-docs-qa-loop-and-artifacts.md)

---

## Demo Notes

### How to Verify

Read `skills/develop-task/README.md` Diagram 1 against `develop-pipeline-step-5-6-qa-loop.md`. Also read `docs/reference/troubleshooting.md`'s "Finalise halted with DoD gaps and I fixed code".

---

## Impact & Value

### User Impact

Operators following the runbooks and READMEs now get the real QA-loop exits and resume paths. They no longer act on stale ones.

### Technical Impact

None at runtime.

---

## Known Limitations & Future Work

### Current Limitations

These are carried in the gate 4 `recommendations.future` and the task's Deferred Work:

- CR4-1: day-3 lines 41 and 77 overstate what qa-story runs for an AC.
- The resume contract and `reenter-qa-after-finalise.sh` advise "commit and re-run" after no-code-moved, but the run has already restored at Step 7.
- The route 2c wording in `qa-flow.md:91` and the step doc :55 is incomplete.
- The `story-documents.md` / `file-naming.md` artifact-table gap.

### Suggested Follow-Up Stories

A follow-up task for the source-level resume-contract inconsistency and the out-of-scope docs above.
