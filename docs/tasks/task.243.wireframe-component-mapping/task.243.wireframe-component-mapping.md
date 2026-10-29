---
id: task.243
title: "Link Wireloom wireframe nodes to the project's UI components, and ask when unsure"
type: task
description: "An opt-in ui: config block, an engine that resolves wireframe nodes against a project map of confirmed links and seeds the catalogue and map, and hooks in create-story, create-task, the develop pipelines, review, QA and review-pr that ask about open nodes and remember the answers."
tags: [wireframe, components, skills-config, create-story, create-task, develop-pipeline]
category: feature
status: ready-for-review
priority: Medium
created: 2026-10-29
updated: 2026-10-29
assignee:
estimated_effort_hours: 16
github_issue: 784
---

# Technical Task: Link Wireloom wireframe nodes to the project's UI components, and ask when unsure

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.243.review.2.wireframe-component-mapping.md` implemented 2026-10-29
**GitHub Issue**: [#784](https://github.com/Gamaroff/agent-skills/issues/784)

---

## 1. Overview

Stories and tasks carry Wireloom wireframes, and the develop pipelines build the screen from them.
Nothing tells the agent which of the project's components draws each wireframe node, so it chooses
from the primitive, and gets the variant, the icon or the component wrong. This task adds an opt-in,
project-configured capability:

- the authoring skills resolve each node to a component while the author is present;
- the develop pipelines ask only about nodes still open, or, unattended, assume and flag them;
- review, QA and `review-pr` check the result;
- confirmed links go into a project-owned map, so the next work item finds them resolved.

## 2. Motivation

A consumer reported the failure directly. Its stories drew their own wireframes and picked
components from the Wireloom primitive:

- a notification bell came out as a warning glyph;
- tab icons were invented;
- an accent call to action was built as the primary variant.

Wireloom is lossy by design. Colour is not a role, 53 design icons collapse to 9 glyphs, and
background art, photos and later slides are dropped. So a fixed primitive-to-component table cannot
work. The links depend on context, and only a person can confirm the uncertain ones.

The consumer also asked for two properties:

- the agent asks the developer about uncertain links, rather than guessing silently;
- the catalogue and the map are created by the skills, so developers need not know they exist.

## 3. Technical Background

- `wireframe` already renders and checks Wireloom blocks, and makes a wireframe document from a
  design source with `source_sha256` and _Conversion notes_.
- `create-story` 5.4.6 draws a wireframe from the acceptance criteria. `create-task` has no wireframe
  step. The develop pipelines never read a wireframe for components.
- Phase 0d asks every up-front question in one `AskUserQuestion` call. `pipeline-answers.js` resolves
  answers in the order flag → policy → recommendation → ask, and `--defaults` takes the Recommended
  option.
- `yaml-subset.js` reads `skills-config.yaml` without dependencies.

## 4. Scope

**In scope:**

- `ui:` config keys: `componentCatalogue`, `componentImport`, `componentBarrel`, `catalogueSection`,
  `componentExclude`, `wireframeMap`. All are optional, and the feature is off without
  `wireframeMap`.
- `shared/resources/wireframe-map.js`, with three commands:
  - `ensure` seeds a missing catalogue from the barrel and a missing map, adds rows for new exports,
    and never overwrites;
  - `resolve` lists every node with a path id, line and signature, matches it against the map (most
    specific row wins), and returns the resolved and open nodes;
  - `record` writes a confirmed link.
- `shared/resources/wireframe-component-mapping.md`: the one procedure the hooks cite.
- Hooks in these skills:
  - `create-story` 5.4.6, plus a new `create-task` 2.6 that mirrors it: embed the source's own
    wireframe when one exists, then resolve and ask;
  - develop Phase 0 `0c-wire` and the 0d wireframe questions;
  - the Step 3 hand-off of the table;
  - an autonomous-defaults row;
  - a `### Wireframe mapping assumptions` subsection of the report's Decisions Log;
  - `review-story` 6.6 and `review-task` 6.6;
  - `qa-story`, `qa-task`, and the `review-pr` conformance lens.
- Tests: the engine, the hook presence, and the configuration docs.

**Out of scope:**

- Any consumer's catalogue, map or design vocabulary: those are consumer data.
- Restoring a design-system-specific conversion profile in `wireframe`.

## 5. Breaking Changes

None. Without a `ui:` block every hook is skipped and every engine command answers `unset`. The 0d
question count is unchanged unless the feature is on and a node is open.

## 6. Implementation Plan

The plan was carried out in the same commit that created this document. The phases below record
what each one touched.

### Phase 1: Engine and its tests (Risk: Medium) — done

- `shared/resources/wireframe-map.js`: `ensure`, `resolve`, `record`.
- `shared/resources/tests/wireframe-map.test.mjs`, calibrated by disabling the flag check (the
  resolve test went red).
- Depends on: nothing.

### Phase 2: Procedure and configuration reference (Risk: Low) — done

- `shared/resources/wireframe-component-mapping.md`: the one procedure every hook cites.
- `docs/reference/configuration.md`: the `ui:` block, its keys and its section.
- Depends on: Phase 1 (the procedure names the engine's commands and `reason` values).

### Phase 3: Skill hooks, then `npm run bundle` (Risk: Medium) — done

- The eight `SKILL.md` hooks, the Step 0 / Step 3 / autonomous-defaults step docs, and the
  `review-pr` conformance prompt.
- `npm run bundle`, which writes the `skills/*/references/` copies and `skill-dependencies.json`.
- Depends on: Phase 2. The medium risk is the 0d question count, which follow-up calls cover (see
  Risk Assessment).

### Phase 4: Hook-presence test (Risk: Low) — done

- `evals/shared/tests/wireframe-mapping-hooks.test.mjs`, calibrated by removing one bundled engine
  copy (red, naming the skill).
- Depends on: Phase 3.

### Phase 5: Verification (Risk: Low) — done

- `npm run ci:fast`, `bundle:check`, `validate:all`, the generic-content guard.
- Depends on: Phases 1–4.

## 7. Files Summary

| File | Change |
| --- | --- |
| `shared/resources/wireframe-map.js` | new engine |
| `shared/resources/wireframe-component-mapping.md` | new procedure |
| `shared/resources/tests/wireframe-map.test.mjs` | new |
| `evals/shared/tests/wireframe-mapping-hooks.test.mjs` | new |
| `docs/reference/configuration.md` | `ui:` schema, keys, section |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | `0c-wire`, 0d questions, count |
| `shared/resources/develop-pipeline-step-3-develop-loop.md` | table hand-off |
| `shared/resources/develop-pipeline-autonomous-defaults.md` | unattended row |
| `shared/resources/pr-conformance-prompt.md` | coverage and trail checks |
| `skills/{create-story,create-task,develop-story,develop-task,review-story,review-task,qa-story,qa-task}/SKILL.md` | hooks |
| `skills/*/references/` | bundled copies |
| `shared/resources/skill-dependencies.json` | regenerated by `npm run bundle` |
| `CHANGELOG.md` | entry |
| `docs/tasks/task-registry.md` | row 243 (written by `create-task`) |

`shared/resources/implementation-report-template.md` is **deliberately unchanged**. The unattended
assumptions go under a `### Wireframe mapping assumptions` subsection of the report's Decisions Log,
not a report section of their own, because report-lint holds report sections to the template.
`wireframe-mapping-hooks.test.mjs` asserts that the template does not carry the heading.

## 8. Testing Strategy

- **Engine:** seeding from a barrel (types, hooks, constants and excluded names dropped), an additive
  update under its own heading, a catalogue without the section left alone, most-specific matching,
  a flag or label that does not match, `record` add then replace, and CLI exit codes. Calibrated by
  disabling the flag check: the resolve test went red.
- **Hooks:** each skill names its hook, gates on `ui.wireframeMap`, and carries the engine, the
  procedure and the parser. Calibrated by removing one bundled engine copy: red, naming the skill.
- **Real-world dry run:** against a scratch copy of a consumer with 99 components and an existing
  catalogue, `ensure` found exactly 99 exports, left the catalogue byte-identical and created the
  map. `resolve` listed the story's 37 nodes as open.

## 9. Success Criteria

- [x] SC-1: with no `ui:` block, `ensure` and `resolve` answer `unset` and write nothing
  (`wireframe-map.test.mjs`).
- [x] SC-2: `ensure` seeds a missing catalogue and map, and a second run reports `unchanged`
  (`wireframe-map.test.mjs`).
- [x] SC-3: an existing catalogue gains rows only for missing exports, and never loses a row
  (`wireframe-map.test.mjs`).
- [x] SC-4: `resolve` applies the most specific matching row and lists every other node as open
  (`wireframe-map.test.mjs`).
- [x] SC-5: `record` adds a link, and replaces one with the same signature and label
  (`wireframe-map.test.mjs`).
- [x] SC-6: all eight skills carry their hook and the bundled engine, procedure and parser
  (`wireframe-mapping-hooks.test.mjs`).
- [x] SC-7 (documentation criterion): the procedure says an unattended assumption is not recorded in
  the map; the autonomous-defaults row, the conformance prompt and both QA skills name the
  `### Wireframe mapping assumptions` subsection; and the report template does not carry it
  (`wireframe-mapping-hooks.test.mjs`). An agent following the procedure is not tested per PR.

## 10. Risk Assessment

| Risk | Mitigation |
| --- | --- |
| The 0d call grows past four questions | Follow-up calls straight after, still before Step 1 |
| A narrow map row resolves a node wrongly | The most specific row wins; rows are editable; QA checks conformance |
| `ensure` damages a hand-written catalogue | Additive only, under its own heading; an unparseable file is left alone |

## 11. Rollback Plan

Revert the commit. Consumers lose only the hooks; a `ui:` block becomes inert, and the map and
catalogue files stay as they are.

## Deferred Work

- **Consumer confirmation (post-release; formerly SC-8).** A consumer re-vendored at this release
  runs `create-story` on a screen with a design wireframe, is asked about the open nodes, and finds
  the answers in the story and the map. It needs a release that exists only after merge, and
  finalise runs before merge, so it is not a success criterion here. It is checked by hand after
  the next release.

## Progress Tracking

- [x] Phase 1: Engine and its tests
- [x] Phase 2: Procedure and configuration reference
- [x] Phase 3: Skill hooks and bundle
- [x] Phase 4: Hook-presence test
- [x] Phase 5: Verification
- [x] Review: `task.243.review.1.wireframe-component-mapping.md`
- [x] Review: `task.243.review.2.wireframe-component-mapping.md`
- [ ] PR, QA loop, `review-pr` and finalise via `/develop-task`

## References

- Procedure: `shared/resources/wireframe-component-mapping.md`
- Engine: `shared/resources/wireframe-map.js`
- Configuration: `docs/reference/configuration.md` (the `ui:` block)
- Wireframe skill: `skills/wireframe/SKILL.md`
- Up-front answer resolution: `shared/resources/pipeline-answers.js`
- Review: [`task.243.review.1.wireframe-component-mapping.md`](task.243.review.1.wireframe-component-mapping.md)
- Tracker: [#784](https://github.com/Gamaroff/agent-skills/issues/784)

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-29
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.243.qa.5.wireframe-component-mapping.md](./task.243.qa.5.wireframe-component-mapping.md)
- **Gate File**: [task.243.gate.5.wireframe-component-mapping.yml](./task.243.gate.5.wireframe-component-mapping.yml)

### Test Coverage Summary
- **Tests Executed**: 34 (wireframe suites); 6836 in the cycle 4 fast gate
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
The cycle 4 fixes hold, and `task.243.bug.10`–`12` are closed. One medium gap remains: a resume
that the detector sends past Step 2 skips the wireframe writes (bug.13). One low finding remains: a
held file with no document key is deleted rather than halted on. This is the fifth gate, so the QA
loop budget is spent.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-29 | 1.0 | Task created and implemented: engine, procedure, config, hooks in eight skills plus review-pr's conformance lens, tests | Lorien Gamaroff |
| 2026-10-29 | 1.1 | Review (7/10, needs revision → fixed): linked #784; rebased on develop; SC-8 moved to Deferred Work; Files Summary corrected; plan restated as completed phases; Progress Tracking and References added | review-task |
| 2026-10-29 | 1.2 | Review 2 passed (9/10) — review 1's fixes verified; SC-1–SC-7 name their test files; SC-7 stated as a documentation criterion; registry row added to Files Summary | review-task |
| 2026-10-29 |  | Status → ready-for-review — implemented outside the pipeline (`17dd614a`, 22 source files, 2 new suites); fast gate re-run by `/develop-task` Step 3 | develop-task |
| 2026-10-29 |  | QA gate CONCERNS (50/100) — 6 findings (5 medium, 1 low) | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 1, 6 findings (bug.1–5 Ready for QA, CR-7), each with a mutation-proven test | qa-fix |
| 2026-10-29 |  | QA gate FAIL (80/100) — cycle 1 fixes verified (bug.1–5 closed); 1 new high finding, Phase 0 writes block Step 1 (bug.6) | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 2, 1 finding (bug.6 Ready for QA): Phase 0 read-only, wireframe writes moved to Step 3 | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (70/100) — bug.6 verified and closed; 3 new medium findings on when the held answers are written (bug.7–9) | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 3, 3 findings (bug.7–9 Ready for QA): wireframe writes at Step 1, gated on a document-keyed answers file | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (70/100) — bug.7–9 verified and closed; 3 new medium findings in the Step 1 placement (bug.10–12), 2 low | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 4, 5 findings (bug.10–12 Ready for QA, CR4-4, CR4-5): wireframe writes at the start of Step 2, behind the 0c-wire gate, with a jq key check that halts on an unreadable file | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100) — bug.10–12 verified and closed; 1 new medium finding (bug.13: a resume past Step 2 skips the wireframe writes), 1 low | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 5 (granted), 2 findings (bug.13 Ready for QA, CR5-2): Step 3 stops on this document's held answers; a missing document key halts | qa-fix |
<!-- change-log-end -->
