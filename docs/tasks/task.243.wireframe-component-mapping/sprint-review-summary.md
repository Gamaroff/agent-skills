# Sprint Review Summary - Link Wireloom wireframe nodes to the project's UI components, and ask when unsure

**Story/Task ID:** task.243
**Completed Date:** 2026-10-29
**Completed By:** Lorien Gamaroff (via `/develop-task`)
**Pull Request:** [#785](https://github.com/Gamaroff/agent-skills/pull/785)

---

## Summary

Skills can now link each node of a Wireloom wireframe to the project's own UI component. The authoring
and develop skills ask the developer about any link they are unsure of, and remember the answer in a
project-owned map, so the next story or task finds it already resolved. The feature is opt-in through
a `ui:` block in `skills-config.yaml` and inert without one.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1: with no `ui:` block, `ensure` and `resolve` answer `unset` and write nothing
- [x] SC-2: `ensure` seeds a missing catalogue and map; a second run reports `unchanged`
- [x] SC-3: an existing catalogue gains rows only for missing exports, never losing one
- [x] SC-4: `resolve` applies the most specific matching row and lists every other node as open
- [x] SC-5: `record` adds a link, and replaces one with the same signature and label, in any equivalent spelling
- [x] SC-6: all eight skills carry their hook and the bundled engine, procedure and parser
- [x] SC-7: the procedure keeps unattended assumptions out of the map, and the report records them under `### Wireframe mapping assumptions`

### Key Features Implemented

- **`ui:` configuration**: `componentCatalogue`, `componentImport`, `componentBarrel`, `catalogueSection`,
  `componentExclude`, `wireframeMap`. All are optional, and the feature is off without `wireframeMap`.
- **`wireframe-map.js` engine**:
  - `ensure` seeds the catalogue and map, additively;
  - `resolve` matches each node to the most specific confirmed row;
  - `record` writes a confirmed link, refusing any value that would not read back intact.
- **Skill hooks**:
  - `create-story` and `create-task` resolve the nodes and ask while the author is present.
  - The develop pipelines ask at Phase 0 and write the answers at Step 2. Run unattended, they assume
    and flag instead.
  - `review-*`, `qa-*` and the `review-pr` conformance lens check the result.

---

## Technical Details

### Files Modified/Created

- `shared/resources/wireframe-map.js`: new engine (CLI and module)
- `shared/resources/wireframe-component-mapping.md`: the one procedure every hook cites
- `shared/resources/tests/wireframe-map.test.mjs`: engine tests (21)
- `evals/shared/tests/wireframe-mapping-hooks.test.mjs`: hook-presence and documentation tests (13)
- `shared/resources/develop-pipeline-step-{0,2,3}-*.md`, `develop-pipeline-autonomous-defaults.md`, `pr-conformance-prompt.md`: pipeline hooks
- `skills/{create-story,create-task,develop-story,develop-task,review-story,review-task,qa-story,qa-task}/SKILL.md`: hooks, with bundled `references/` copies
- `docs/reference/configuration.md`: the `ui:` block
- `CHANGELOG.md`: the `(task 243)` entry

### Architecture/Design Decisions

- **Questions are asked at Phase 0, but nothing is written until Step 2.** The branch does not exist at Phase 0, so the answers are held in `.claude/state/wireframe-answers.json`, keyed by document. They are written at Step 2, the first point where both the branch and the lock exist. A Step 3 guard sends a resume that skipped those writes back to them.
- **A map row is matched on meaning, not on spelling.** `signatureKey` compares parent, primitive, sorted unique flags and sorted decoded attributes. Attribute values are percent-encoded, so every node reads back to itself.
- **An unattended assumption is never recorded in the map.** It is logged in the implementation report's Decisions Log, because an assumption is not a confirmation.

### Dependencies

- **New Dependencies Added:** none (the engine uses `fs`, `path` and the in-repo `yaml-subset.js`)
- **Breaking Changes:** none. Without a `ui:` block every hook is skipped.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 21 tests in `shared/resources/tests/wireframe-map.test.mjs`
- **Integration Tests:** 13 hook and documentation tests in `evals/shared/tests/wireframe-mapping-hooks.test.mjs`
- **Test Coverage:** every success criterion cites a test that runs on every PR. Each QA fix was mutation-proven.

### Code Review

- **Reviewers:** QA gates 1–14 (adversarial code reviewer each cycle) and the `/review-pr` conformance review
- **Approval Status:** ✅ Gate 14 PASS (100/100). PR review 4 is APPROVE.
- **Review Comments Addressed:** all blocking findings fixed across 13 fix cycles (bug.1–bug.16 closed). The remaining lows are listed under Deferred Work.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Input validation: `parsePattern` and every `record` flag are checked before any read or write
- [x] Probed by execution. DoD run 4 ran 13 controls and 136 cases: 0 reproduced, 0 escaped.
- [x] No sensitive data exposure (no secrets, no `eval`/`exec`)
- [x] No new dependencies

### Compliance Review

✅ **Compliance Requirements Met**

- [x] Not applicable: this is internal skill tooling with no personal data, payments, PHI or rendered UI.

---

## Documentation

### Updated Documentation

- [x] Configuration reference: the `ui:` block, its keys and its section
- [x] Shared procedure, bundled into all eight skills
- [x] SKILL.md hooks
- [x] CHANGELOG entry

### Documentation Links

- `shared/resources/wireframe-component-mapping.md`
- `docs/reference/configuration.md` (UI — wireframes and components)

---

## Demo Notes

### How to Verify

1. In a project, add `ui: { wireframeMap: docs/wireframe-map.md, componentBarrel: <barrel path> }` to `skills-config.yaml`.
2. Run `node .agents/skills/create-story/references/wireframe-map.js ensure --json`. The catalogue and map are created.
3. Run `create-story` on a screen that has a wireframe. You are asked about each open node, and confirmed answers land in `docs/wireframe-map.md`.
4. Run `resolve` on the same wireframe. The answered nodes now resolve.

### Screenshots/Visuals

Not applicable (CLI and skill workflow).

---

## Impact & Value

### User Impact

Developers stop getting the wrong component, variant or icon from a wireframe. The agent asks once,
and the answer is reused on every later work item.

### Technical Impact

The procedure has one engine and one definition, cited by eight skills and checked by tests. The
feature is opt-in and has no effect on projects without a `ui:` block.

---

## Known Limitations & Future Work

### Current Limitations

- Low-severity follow-ups are listed in the task's Deferred Work:
  - CR7-1, CR8-1, CR11-1/2 and CR12-2..5;
  - CR13-3, CR14-1 and CR14-2;
  - PARSELINE-1.
- Consumer confirmation (formerly SC-8) needs a release. It is checked by hand after the next one.

### Suggested Follow-Up Stories

- De-duplicate flags once in `parsePattern` (CR14-1), and add a must-differ label case to the record test (CR14-2)
- Preserve CRLF line endings in the map, and narrow the candidate filter's substring match (CR12-3, CR12-4)

---

## Metrics _(if applicable)_

- **Time to Complete:** 1 day (2026-10-29), 14 QA cycles
- **Lines of Code Changed:** +2,521 / −8, excluding the generated `skills/*/references/` copies and the pipeline artifacts under `docs/tasks/`

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
