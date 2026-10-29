---
id: task.243
title: "Link Wireloom wireframe nodes to the project's UI components, and ask when unsure"
type: task
description: "An opt-in ui: config block, an engine that resolves wireframe nodes against a project map of confirmed links and seeds the catalogue and map, and hooks in create-story, create-task, the develop pipelines, review, QA and review-pr that ask about open nodes and remember the answers."
tags: [wireframe, components, skills-config, create-story, create-task, develop-pipeline]
category: feature
status: in-progress
priority: Medium
created: 2026-10-29
updated: 2026-10-29
assignee:
estimated_effort_hours: 16
---

# Technical Task: Link Wireloom wireframe nodes to the project's UI components, and ask when unsure

**Status:** In Progress

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

1. Engine and its tests, calibrated by breaking the matcher.
2. Procedure document and configuration reference.
3. Skill hooks, then `npm run bundle`.
4. Hook-presence test, calibrated by removing a bundled copy.
5. `npm run ci:fast`, `bundle:check`, `validate:all`, the generic-content guard.

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
| `shared/resources/implementation-report-template.md` | assumptions section |
| `shared/resources/pr-conformance-prompt.md` | coverage and trail checks |
| `skills/{create-story,create-task,develop-story,develop-task,review-story,review-task,qa-story,qa-task}/SKILL.md` | hooks |
| `skills/*/references/` | bundled copies |

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

- [x] SC-1: with no `ui:` block, `ensure` and `resolve` answer `unset` and write nothing (test).
- [x] SC-2: `ensure` seeds a missing catalogue and map, and a second run reports `unchanged` (test).
- [x] SC-3: an existing catalogue gains rows only for missing exports, and never loses a row (test).
- [x] SC-4: `resolve` applies the most specific matching row and lists every other node as open (test).
- [x] SC-5: `record` adds a link, and replaces one with the same signature and label (test).
- [x] SC-6: all eight skills carry their hook and the bundled engine, procedure and parser (test).
- [x] SC-7: an unattended assumption is logged and listed for QA, never written to the map (test of
  the procedure, template and conformance prompt).
- [ ] SC-8: a consumer re-vendored at this release runs `create-story` on a screen with a design
  wireframe, is asked about the open nodes, and finds the answers in the story and the map.

## 10. Risk Assessment

| Risk | Mitigation |
| --- | --- |
| The 0d call grows past four questions | Follow-up calls straight after, still before Step 1 |
| A narrow map row resolves a node wrongly | The most specific row wins; rows are editable; QA checks conformance |
| `ensure` damages a hand-written catalogue | Additive only, under its own heading; an unparseable file is left alone |

## 11. Rollback Plan

Revert the commit. Consumers lose only the hooks; a `ui:` block becomes inert, and the map and
catalogue files stay as they are.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-29 | 1.0 | Task created and implemented: engine, procedure, config, hooks in eight skills plus review-pr's conformance lens, tests | Lorien Gamaroff |
<!-- change-log-end -->
