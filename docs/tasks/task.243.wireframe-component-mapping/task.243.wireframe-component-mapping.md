---
id: task.243
title: "Link Wireloom wireframe nodes to the project's UI components, and ask when unsure"
type: task
description: "An opt-in ui: config block, an engine that resolves wireframe nodes against a project map of confirmed links and seeds the catalogue and map, and hooks in create-story, create-task, the develop pipelines, review, QA and review-pr that ask about open nodes and remember the answers."
tags: [wireframe, components, skills-config, create-story, create-task, develop-pipeline]
category: feature
status: accepted
priority: Medium
created: 2026-10-29
updated: 2026-10-29
completed_date: 2026-10-29
assignee:
estimated_effort_hours: 16
github_issue: 784
pr_number: 785
---

# Technical Task: Link Wireloom wireframe nodes to the project's UI components, and ask when unsure

**Status:** Accepted
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
  - develop Phase 0 `0c-wire` and the 0d wireframe questions, with no tracked writes: 0d holds the answers in
    `.claude/state/wireframe-answers.json`, because the branch does not exist yet (bug.6);
  - Step 2 § Wireframe writes, the first point where the branch and the lock both exist: `ensure`,
    the table rows, and a `record` per confirmed answer, then the held file is deleted
    (bug.7–bug.12);
  - the Step 3 guard that sends a resume landing past Step 2 back to those writes, and the table
    hand-off (bug.13, bug.14);
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
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | `0c-wire` (no tracked writes), 0d questions held for Step 2, count |
| `shared/resources/develop-pipeline-step-2-review.md` | Wireframe writes (before the gate check) |
| `shared/resources/develop-pipeline-step-3-develop-loop.md` | held-answers guard, table hand-off |
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
- **TASK-243-CR7-1** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7). The
  no-jq test in `wireframe-mapping-hooks.test.mjs` should assert the jq-missing arm's own message,
  so that it proves the PATH stripping reached that branch.
- **TASK-243-CR8-1** (LOW) — carried to gate 8 `recommendations.future` (cycle 8). The two
  `existsSync` assertions in the `resolve` unset test cannot fail, because `resolve` has no write
  path. Drop them or mark them documentary. (CR8-2, the "read-only" wording for `0c-wire`, was
  fixed in this document at PR review 2.)
- **TASK-243-CR11-1** (LOW) — carried to gate 11 `recommendations.future` (cycle 11). `record`
  refuses an odd backtick in `--by` and `--date`, although `readMap` never reads the Confirmed cell,
  which is the last column by default. Check the two only when a column follows Confirmed, or keep
  the refusal as a margin and say so in the code and test comments.
- **TASK-243-CR11-2** (LOW) — carried to gate 11 `recommendations.future` (cycle 11). The comment
  at `wireframe-map.js:725` says `--by`/`--date` skip `unquote` because the Confirmed cell starts
  with the date. The real reason is that `readMap` does not read that cell.
- **TASK-243-CR12-2 to CR12-5** (LOW) — carried to gate 12 `recommendations.future`, still carried
  by gate 14. `readUiConfig` reads an unreadable config as a missing one (CR12-2); the candidate
  filter matches a component by substring, and a missing catalogue section disables it (CR12-3);
  `ensure` and `record` rewrite a CRLF map as LF (CR12-4); `record` re-finds the header `readMap`
  already found and calls all of `ensure` to create a missing map (CR12-5).
- **TASK-243-PARSELINE-1** (LOW) — carried to gate 13, still carried by gate 14. A Wireloom line
  holding U+2028 yields no node, because `parseLine`'s `.*$` cannot cross it.
- **TASK-243-CR13-3** (LOW) — carried to gate 13, still carried by gate 14. The procedure and
  `configuration.md` list only some of the characters `encodeValue` encodes; say every character
  outside the unreserved set plus `/ : # @ + =` is encoded, or say to copy the signature as
  `resolve` prints it.
- **TASK-243-CR14-1** (LOW) — carried to gate 14. `signatureKey` de-duplicates flags but `score`
  counts them with duplicates, so `input[a,a]` and `input[a]` share a key but not a score.
  De-duplicate once in `parsePattern`. **Fixed after acceptance (2026-10-29):** `parsePattern`
  de-duplicates flags. The test "match counts a repeated flag once when ranking rows" turns red when
  the fix is reverted.
- **TASK-243-CR14-2** (LOW) — carried to gate 14. No test shows that `record` keeps rows with the
  same signature and different labels apart (the mutation reds nothing). Add a must-differ label
  case to the record test. (DoD run 4's probe exercised the behaviour, 5 cases, all held: the gap is
  a per-PR test, not the code.) **Fixed after acceptance (2026-10-29):** the test "record keeps rows
  with the same signature and different labels apart" turns red when the label term is dropped.

## Progress Tracking

- [x] Phase 1: Engine and its tests
- [x] Phase 2: Procedure and configuration reference
- [x] Phase 3: Skill hooks and bundle
- [x] Phase 4: Hook-presence test
- [x] Phase 5: Verification
- [x] Review: `task.243.review.1.wireframe-component-mapping.md`
- [x] Review: `task.243.review.2.wireframe-component-mapping.md`
- [x] PR, QA loop, `review-pr` and finalise via `/develop-task`

## References

- Procedure: `shared/resources/wireframe-component-mapping.md`
- Engine: `shared/resources/wireframe-map.js`
- Configuration: `docs/reference/configuration.md` (the `ui:` block)
- Wireframe skill: `skills/wireframe/SKILL.md`
- Up-front answer resolution: `shared/resources/pipeline-answers.js`
- Review: [`task.243.review.1.wireframe-component-mapping.md`](task.243.review.1.wireframe-component-mapping.md)
- Tracker: [#784](https://github.com/Gamaroff/agent-skills/issues/784)

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-29
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.243.qa.14.wireframe-component-mapping.md](./task.243.qa.14.wireframe-component-mapping.md)
- **Gate File**: [task.243.gate.14.wireframe-component-mapping.yml](./task.243.gate.14.wireframe-component-mapping.yml)

### Test Coverage Summary
- **Tests Executed**: 21 (wireframe-map suite); 6844 in the fix's fast gate
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
The cycle 13 fix holds: `record` replaces the row whose signature means the same thing, so a
re-recorded answer takes effect in either spelling, and
[bug.16](./task.243.bug.16.record-adds-a-second-row-for-an-equivalent-signature.md) is closed. All
three fix arms are mutation-proven and the probe reproduces nothing. Two lows are advisory
(TASK-243-CR14-1, CR14-2).

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.243.qa.14.wireframe-component-mapping.md`
**Gate File**: `task.243.gate.14.wireframe-component-mapping.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

DoD run 4. Run 3's gap was U+2028/U+2029 in a signature or label. QA cycle 12 closed it and gate 12
verified the fix. Gates 13 and 14 closed the attribute-encoding and equivalent-signature defects
found after it.

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** 7/7 (SC-1 to SC-7). Each behaviour criterion cites code and a test that runs on every PR.
✅ **PR Review:** PR #785. The 5c conformance review is APPROVE (`task.243.pr-review.4.wireframe-component-mapping.md`), and the repository requires no formal review.
✅ **CI:** reading 1 SUCCESS @ `d24e061b` over 6 checks; reading 2 is taken on the acceptance commit.
✅ **Documentation:** a CHANGELOG `(task 243)` entry, the `ui:` keys in `docs/reference/configuration.md`, and the procedure bundled into all eight skills.
✅ **Security Review:** ✅ PASS. 13 controls and 136 probes executed, 0 reproduced, 0 escaped (`task.243.dod.4.security.run.json`).
✅ **Compliance Review:** NOT_APPLICABLE (internal skill tooling, no personal data, payments or UI).

The gate-14 low findings stay in Deferred Work above.

**Task marked as ACCEPTED on:** 2026-10-29

**Detailed Verification Log:** See `task.243.dod.4.wireframe-component-mapping.md` for complete verification evidence and timestamps (runs 1–3, each closed by a later QA cycle: `task.243.dod.1.wireframe-component-mapping.md`, `task.243.dod.2.wireframe-component-mapping.md`, `task.243.dod.3.wireframe-component-mapping.md`).
<!-- change-log-start -->
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
| 2026-10-29 |  | QA gate CONCERNS (90/100) — bug.13 verified and closed; 1 new medium finding (bug.14: the Step 3 guard is ungated while the Step 2 writes are gated), 2 low | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 6, 3 findings (bug.14 Ready for QA, CR6-2, CR6-3): the Step 3 guard shares Step 2's gate and key check | qa-fix |
| 2026-10-29 |  | QA gate PASS (100/100) — bug.14 verified and closed; all 14 bug reports closed; 1 low test-premise finding open (CR7-1) | qa-task |
| 2026-10-29 |  | PR review APPROVE (PR #785); PC-1 fixed: Scope and Files Summary name the Step 2 wireframe writes and the Step 3 guard | develop-task |
| 2026-10-29 |  | DoD incomplete — 1 gap identified (SC-1: resolve unset path untested) | finalise |
| 2026-10-29 |  | QA gate PASS (100/100) — re-entry after finalise DoD run 1; SC-1 test verified and mutation-proven; 0 bugs, 2 low cleanups (CR8-1, CR8-2) | qa-task |
| 2026-10-29 |  | DoD incomplete — 1 gap identified (security: parsePattern accepts a newline in a signature; 4 low probes) | finalise |
| 2026-10-29 |  | QA gate PASS (100/100) — re-entry after finalise DoD run 2; parsePattern newline fix verified, mutation-proven, probe 11/0/0; 2 low findings (CR9-1 promoted, CR9-2 advisory) | qa-task |
| 2026-10-29 |  | QA findings fixed — CR9-1 (a line break in any written record field) and CR9-2 (a backtick in the signature or label) are refused with a UsageError; mutation-proven; fix cycle 9 | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100) — cycle 10 of 10; cycle 9 fix verified and mutation-proven; 1 medium finding (CR10-1: an odd backtick in an unquoted record cell collapses the row), 1 low cleanup; probe 66/5/0 | qa-task |
| 2026-10-29 |  | QA findings fixed — CR10-1 and CR10-2: record refuses any value that would not read back from its map row (round-trip through the reader); mutation-proven; probe re-run 50/0/0; fix cycle 10 | qa-fix |
| 2026-10-29 |  | QA gate PASS (100/100) — cycle 11 of 12; cycle 10 fix verified and mutation-proven (CR10-1, CR10-2 fixed); 2 low advisory findings (CR11-1, CR11-2); probe 79/0/0 | qa-task |
| 2026-10-29 |  | DoD incomplete — 1 gap identified (security: U+2028/U+2029 accepted in a record signature or label; 9 low probes); fix-and-recheck refused (inside-files-summary) | finalise |
| 2026-10-29 |  | QA gate CONCERNS (90/100) — cycle 12 of 13; DoD run 3 fix verified and mutation-proven (U+2028/U+2029 closed); 1 medium finding (CR12-1: an attribute value with a comma or brace does not round-trip through its own signature, bug.15), 3 low advisory; probe 114/0/0 | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 12, 1 finding (bug.15 Ready for QA, CR12-1): attribute values are percent-encoded in a signature and decoded by parsePattern, so every node reads back to itself | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100) — 1 medium (TASK-243-CR13-1, bug.16), 1 low; bug.15 closed | qa-task |
| 2026-10-29 |  | QA findings fixed — cycle 13, 2 findings (bug.16 Ready for QA, CR13-1; CR13-2), after a 2-cycle grant | qa-fix |
| 2026-10-29 |  | QA gate PASS (100/100) — 0 blocking, 2 advisory lows (TASK-243-CR14-1, CR14-2); bug.16 closed | qa-task |
| 2026-10-29 | 1.3 | DoD passed — accepted (PR #785); DoD run 4, 7/7 criteria, probe 136/0/0 | finalise |
| 2026-10-29 |  | Deferred Work: CR14-1 and CR14-2 fixed after acceptance (flags de-duplicated in parsePattern; label must-differ test) | Lorien Gamaroff |
<!-- change-log-end -->

