# Sprint Review Summary - finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Story/Task ID:** task.152
**Epic:** — (standalone task)
**Completed Date:** 2026-09-26
**Completed By:** Claude (autonomous `/develop-next` → `/develop-task` run)
**Pull Request:** [#495](https://github.com/Gamaroff/agent-skills/pull/495)

## Summary

`/finalise` had two scope edges that real runs had reached past. Bug mode now covers Step 8, the
gaps path. Before, a `--bug` run that found gaps doubled a heading, wrote a Change Log row that bug
reports forbid, and then could not post its PR comment. The link guards now also check the
pipeline artifacts written beside a work item, the same set CI already checks. Before, a dead link
in a QA report halted a whole `/finalise` run on a red build that step 8a could not admit.

## What Was Delivered

### Acceptance Criteria Met

- ✅ 22-row bug-mode skip table: five new Step 8 rows and markers, held two-way by the parity test
- ✅ One `## Verification Complete` fill helper, called from 7.1 (`accepted`) and 8.1 (`gaps`); it also owns the bug-mode gap count
- ✅ In bug mode, 8.5 builds its PR comment from the DoD file's Step 5
- ✅ `status-history.js`: `--json` reason contract, usage errors exit 2, Title Case lifecycle statuses
- ✅ The fix-and-recheck evaluator admits co-located `.md` artifacts through `isCoLocatedArtifact` (49–144 probes, engages)
- ✅ An artifact corpus guard (1,000+ files, its own ratchet) and writer-site link checks in qa-task, qa-story and review-pr
- ⏳ Observations #148/#155 → `actioned`: due at merge

### Key Features Implemented

- `shared/resources/fill-verification-complete.sh` (new): verbs `accepted | gaps | count`; refusals go to stderr
- `isCoLocatedArtifact` and the exported `WORK_ITEM_ARTIFACT_RE` / `UNPREFIXED_ARTIFACTS`: one definition of the artifact set, shared with the corpus guard
- A stage-then-check `doc-links.js --file` block at the three report writers

## Technical Details

### Files Modified/Created

- `skills/finalise/SKILL.md`: skip table, 7.1, Step 8 (8.1, 8.3, 8.4, 8.5), the 8a clause and the CI-table row
- `shared/resources/{fill-verification-complete.sh, status-history.js, finalise-fix-and-recheck.mjs, finalise-fix-and-recheck-preconditions.json}`
- `skills/{qa-task, qa-story, review-pr}/SKILL.md`: writer-site checks. This also fixed a pre-existing stray fence in qa-story's template.
- Tests: `finalise-bug-mode.test.mjs`, `status-history-cli.test.mjs` (new), `finalise-fix-and-recheck.test.mjs`, `doc-links.test.mjs`
- `CHANGELOG.md`, and the bundled `references/` copies

### Architecture/Design Decisions

- Consolidate rather than patch: the gap count and the artifact set each have one owner. This came from QA cycles 2 and 3 (qa-fix Step 2.6).
- The artifact ratchet is separate from the document guard (`KNOWN_ARTIFACT_*`): 11 links and 2 fences are pinned, and the list only tightens.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

- About 30 new tests, executed in bash and zsh from a consumer-shaped root. Every fix was mutation-proved: M1–M21, F1–F5, G1–G4, H1–H4, and the finalise Step 8a guard.
- `npm run ci:fast` (with the `.agents/skills` symlink moved aside): 4,272 tests, 0 fail. CI is green on the acceptance head.

### Code Review

- 4 QA cycles (FAIL 50 → CONCERNS 80 → CONCERNS 90 → PASS 100). The loop exited by the cosmetic-residue route.
- 5c `/review-pr`: CONCERNS (advisory). The conformance findings were fixed in the task document.

## Security & Compliance

### Security Review

The probe engine was run on `isCoLocatedArtifact`, the fill helper and the `status-history.js` CLI:
9 controls, 144 cases, all engage. `isCoLocatedArtifact` admitted a path containing a raw LF/CR. That
was fixed during `/finalise` under the fix-and-recheck rule (`a42541d5`) and recorded as a
deviation in the DoD file.

### Compliance Review

Not applicable. This is internal tooling.

## Documentation

### Updated Documentation

- CHANGELOG `[Unreleased]`: three Added, two Changed (breaking) and one Fixed entry
- The four SKILL.md files above

### Documentation Links

- Task: [task.152.finalise-gaps-path-and-artifact-links.md](./task.152.finalise-gaps-path-and-artifact-links.md)
- DoD: [task.152.dod.1.finalise-gaps-path-and-artifact-links.md](./task.152.dod.1.finalise-gaps-path-and-artifact-links.md)

## Demo Notes

### How to Verify

```bash
command node --test evals/shared/tests/finalise-bug-mode.test.mjs \
  shared/resources/tests/{status-history-cli,finalise-fix-and-recheck,doc-links}.test.mjs
```

### Screenshots/Visuals

Not applicable.

## Impact & Value

### User Impact

A `/finalise --bug` run that finds gaps now leaves one verdict in the right place. A quoted finding
that renders as a dead link is caught by the skill that wrote it, not by CI after the run.

### Technical Impact

The last pipeline engine without the shared `--json` reason contract now has it. The "artifact"
set is defined once.

## Known Limitations & Future Work

### Current Limitations

- The artifact corpus guard does not walk `docs/bugs` (task § 4). This was raised at QA cycles 3 and 4.
- Writer-site checks cover three writers. Other writers of the artifact set remain unchecked (PR review CR-1, obs #198).

### Suggested Follow-Up Stories

- Walk `docs/bugs` artifacts in the corpus guard
- Derive the writer-site population from the artifact set
- One engine-path convention across finalise
- A re-run guard on 8.3

## Metrics _(if applicable)_

- QA cycles: 4. Fix cycles: 3 in the QA loop, plus 1 under finalise 8a.

**Status:** ✅ **ACCEPTED**
