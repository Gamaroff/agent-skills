# Sprint Review Summary - QA Testing Results section: one write engine, one placement, refused when duplicated

**Task:** `task.155.qa-results-section-engine`
**Status:** ✅ ACCEPTED
**Accepted:** 2026-10-01
**PR:** [#537](https://github.com/Gamaroff/agent-skills/pull/537)
**Issue:** [#486](https://github.com/Gamaroff/agent-skills/issues/486)

---

## Summary

`qa-task` and `qa-story` Step 12 told every QA cycle to replace the work item's `## QA Testing Results` section whole, and named no tool, so each run hand-wrote the edit. Hand-written replacements stacked four copies on task.145 and left three in task.65. The section now has one writer, `shared/resources/qa-results.js`, which replaces, relocates or creates the section and refuses, rather than guesses, whenever a write could stack or delete.

## What Was Delivered

### Acceptance Criteria Met

- ✅ `upsertQaResults` returns `replaced`, `relocated`, `created`, or refuses with `multiple`, `bad-section`, `unbounded` or `unplaceable` and writes nothing
- ✅ A fenced or inline-code heading is never found or replaced
- ✅ Both QA skills' Step 12 write through the engine; the executed call leaves exactly one section
- ✅ The corpus guard passes after the task.65 repair and fails, naming the file, on a re-stack
- ✅ Tests under two seconds, no network, no second fence scanner, every assertion mutation-proved
- ⏭️ Observation #178 → `actioned` at merge (by design)

### Key Features Implemented

- **One writer, one place:** a new section lands directly before the change-log block (else before the doc-type anchor, else at the end).
- **Refuse, never guess:** stacked copies, unclosed fences and any write whose removed text carries a change-log marker, an H1/H2 or a Change Log heading are refused, as is any write that does not read back as one section.
- **Carry what others own:** `### Bug Reports` (`create-bug-report`) and `### Deferred Work` (the pipeline's loop exit) blocks inside the section are carried whole through every replace.
- **task.65 repaired**, and a corpus guard, cross-checked by an independent line scan, fails CI if any tracked document stacks sections.

## Technical Details

### Files Modified/Created

- `shared/resources/qa-results.js` (new engine) + bundled copies in `skills/qa-task/references/` and `skills/qa-story/references/`
- `shared/resources/tests/qa-results.test.mjs`, `tests/qa-results-corpus.test.js`, `tests/qa-results-step12-wiring.test.js`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` (Step 12)
- `docs/tasks/task.65…/task.65.registry-aware-selection.md` (repair), `CHANGELOG.md`

### Architecture/Design Decisions

- Sits beside `change-log.js` and reuses its fence, inline-code and frontmatter guards and its `RE_HEADING`, rather than defining a second scanner or grammar.
- A fence-blind structural guard on the text a write would remove, adopted in QA cycle 5 after two symptom checks proved insufficient. It trades a few false refusals (a fenced `# comment`) for never deleting structure.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- 68 engine, wiring and corpus tests; each guard mutation-proved, with the results in the implementation report.
- Corpus experiments in QA: ~1,990 tracked documents × 4 writes and fault injection at over 12,000 positions, with 0 lines lost outside the section.

### Code Review

- 10 QA cycles (budget 5 plus operator grants of 2, 1, 1 and 1) and 5 independent PR conformance reviews. HIGH findings have been 0 since cycle 5; the final gate is CONCERNS 90 with no open entry.

## Security & Compliance

### Security Review

PASS. The engine is pure with no I/O, and Step 12 passes paths as argv to a single-quoted `node -e`. The boundary is recorded as internal (pipeline-written inputs only).

### Compliance Review

Not applicable (internal tooling).

## Documentation

### Updated Documentation

- CHANGELOG `[Unreleased]` (task 155); Step 12 in both QA skills.

### Documentation Links

- Task: `task.155.qa-results-section-engine.md` · DoD: `task.155.dod.1.qa-results-section-engine.md` · Implementation report: `task.155.implementation.1.qa-results-section-engine-initial-run.md`

## Demo Notes

### How to Verify

```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
```

### Screenshots/Visuals

None; this is a CLI/engine change.

## Impact & Value

### User Impact

QA cycles can no longer stack or silently delete the QA section, bug links or the Change Log. A document that is already corrupt stops the cycle with a named reason instead of getting worse.

### Technical Impact

It removes a class of hand-edit corruption from every QA run in this repository and in consumer repositories.

## Known Limitations & Future Work

### Current Limitations

The task's `## Deferred Work` lists them. Among them is one accepted deletion path (REL-030: a bold `**Deferred Work**` label inside the section is not carried; 0 instances), accepted by an explicit operator decision.

### Suggested Follow-Up Stories

- One follow-up task: pin the loop exit's Deferred Work record to its own `## Deferred Work` H2 outside the QA section, and fold in the recorded engine residuals (REL-024/025/027/028, REL-007/008, setext, CRLF, CR-4/CR-5, create-bug-report's H2/H3 check).

## Metrics _(if applicable)_

- QA cycles: 10 · PR reviews: 5 · Tests: 68 · HIGH findings: 1 (cycle 5), fixed
