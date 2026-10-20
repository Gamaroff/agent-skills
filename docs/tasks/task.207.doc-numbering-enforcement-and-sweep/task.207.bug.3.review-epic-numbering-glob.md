---
type: bug
status: closed
severity: Major
priority: Medium
created: 2026-10-16
related: task.207
description: "review-epic report numbering glob still uses the flat epic number"
---

# Bug Report: Task 207 - review-epic report numbering glob still uses the flat epic number

**Task**: [task.207](./task.207.doc-numbering-enforcement-and-sweep.md)
**Bug ID**: TASK-207-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (QA cycle 1, finding CR-3)
**Date Found**: 2026-10-16
**Location**: `skills/review-epic/SKILL.md:571`

## Description

The sweep rewrote the example above it to `epic.1.1.review.1.*`, but the executable glob `epic.{epic-number}.review.*.md` (and the save template `epic.[N].review.[n]` at line 561) still name one number. Substituting E gives `epic.1.review.*`, which never matches an `epic.P.E.review.*` report, so `REVIEW_N` is always 1 and an existing `review.1` is overwritten. The §7 population grep did not match `epic.{epic-number}` or `epic.[N]`; other residues remain (`jira-epic-creator/SKILL.md:48`, `review-epic/SKILL.md:143/216/768`, `skills/develop-story/README.md`, `skills/review-story/README.md`).

## Steps to Reproduce

1. Run Step 9's block for epic `epic.1.3.x` in a directory holding `epic.1.3.review.1.x.md`.

## Expected Behavior

`REVIEW_N=2`.

## Actual Behavior

`REVIEW_N=1` — the existing report would be overwritten.

## Impact

The fix or guard this task delivers does not hold on the path named above.

## Recommendation

Rewrite the glob and template to `epic.{P}.{E}`; sweep the other `epic.[N]` / `{epic-number}` / README residues; add a population test that fails on a residual old-scheme placeholder in `skills/**/*.md` and `shared/resources/*.md`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: The §7 grep matched only remembered brace spellings; bracket and other forms (`epic.[N]`, `epic.{epic-number}`, `story.[epic].[story]`, `story.[N].[M]`) and READMEs/templates/hand-authored references were outside it.

**Fix Description**: Rewrote the glob and template to `epic.{P}.{E}` / `epic.[P].[E]`; swept every residue (15 files incl. `prd-structure-guide.md`, whose decimal 'intermediate epic' row is removed, `.github/copilot-instructions.md`, `develop-bug-step-7-close-bug.md`). New §5 in the chokepoint test fails on any old-scheme placeholder in canonical prose (frozen `examples/` snapshots and records exempt, with reasons). `next-numbered.test.mjs` review-epic site updated.

**Files Modified**: skills/review-epic/SKILL.md and 14 other prose files, tests/doc-id-chokepoint.test.js, shared/resources/tests/next-numbered.test.mjs

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: restore `epic.{epic-number}` → §5 red.

### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2026-10-16

**QA Reopening Reason**: §5 was a deny-list of remembered spellings and missed `<epic>`, `<N>`, `{N}.{M}`, `{epicNum}`, `[N+1]`, `[n-1]` and more.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: Structural move (consolidate — allow-list, Step 2.6, obs #276): §5 now requires the FIRST placeholder after `story.` / `epic.` / `epic/` to name the PRD (`P`, `prd`, `prdNum`, …) and refuses everything else. It surfaced 30 more lines in 15 files; all rewritten (qa-findings-ingester-prompt, develop, qa-gate, shard-doc, sync-github-*, sync-jira-*, README, epic templates, prd-structure-guide — decimal-epic block removed, day-4 runbook), with the PRD directory added to the sync/shard paths. `create-parallel-stories` is exempt by name as deferred work.

**Files Modified**: tests/doc-id-chokepoint.test.js and 15 prose files (+ bundled copies)

**Testing**: `command node --test tests/doc-id-chokepoint.test.js` 12/12. Mutation: allow-list accepts any head → §5 control red; restore `story.<epic>.<story>` in the ingester prompt → §5 red.

### Iteration 3

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: §5's key covered filename heads only; uppercase and title spellings (`EPIC-[N]`, `Epic {N}`, `[Epic [N+1]]`, `Story [epic].[story]`, `{{epic_number}}`) were outside it.

**Fix Description**: §5 adds a title-head check: after `EPIC-`, `Epic `, `[Epic `, `Story `, `[Story `, a single-level number name (`N`, `N±k`, `E`, `epic`, `epicNum`, `epic_number`) is refused; non-id placeholders (`Story [prev]`, `epic <path>`) are not judged. It surfaced 32 lines in 16 files, all rewritten (epic/story/task templates, prd-structure-guide roadmap names, create-epic and sync-github-epic milestone, create-prd, create-bug-report, prd-template, qa-story, review-epic, review-story). Header comment rewritten for the allow-list (CR-8); dead lookbehinds dropped (CR-7). Dropped-level check (CR3-4) deferred — it would refuse legitimate truncations such as `story.{P}.{E}.*`.

**Files Modified**: tests/doc-id-chokepoint.test.js and 16 prose files

**Testing**: `tests/doc-id-chokepoint.test.js` 12/12. Mutation: restore `Epic {N} — {title}` in sync-github-epic → §5 red.

### Iteration 4

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: §5's population stopped at `*.md`; the PRD YAML templates, `skills-config.yaml` and two `core-config-reference.yaml` comments render titles and paths too. And cycle 3's title-form rewrite of prd-template Section 6 and create-prd's PRD Change Log row was itself wrong: inside a PRD, epic and story numbers are relative by documented design (create-prd § Epic Numbering; both PRD templates' EPIC NUMBERING notes).

**Fix Description**: §5's population is `*.md`, `*.yaml`, `*.yml`. Rewritten: `skills-config.yaml` layout comment, both `core-config-reference.yaml` comments, `qa-gate-template.yaml` location and story format. Reverted the cycle-3 PRD-internal rewrites; new `RELATIVE_TITLES` exempts the title check (filename heads still checked) in prd-template SKILL.md, prd-tmpl.yaml and create-prd SKILL.md, each with its reason and a stale-entry test — which immediately dropped the brownfield template (literal `[Epic 1]` only). CR4-4 (story-template parent link) and CR4-5 (qa-story example id) fixed.

**Files Modified**: tests/doc-id-chokepoint.test.js, skills-config.yaml, skills/{develop,qa-fix}/resources/core-config-reference.yaml, skills/qa-fix/resources/qa-gate-template.yaml, skills/prd-template/SKILL.md, skills/create-prd/SKILL.md, skills/documentation-standards-validator/references/story-template.md, skills/qa-story/SKILL.md

**Testing**: `tests/doc-id-chokepoint.test.js` 13/13. The new stale-entry test fired on its first run (brownfield entry) — evidence it reads the files.

### Iteration 5

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: The guard checked placeholder names, not the directory above them: `{domain}/{feature}/epics/` paths named correct epic and story ids under a flat layout, and the two-level id check matched braces only.

**Fix Description**: 13 files rewritten to `{domain}/prd.{P}.{feature}/epics/` (and the bracket and angle spellings), plus create-issue's flat `epic.180.<name>`; qa-story's `[epic].[story]` id. §5 gains `FLAT_LAYOUT` (a `{feature}/epics/` not preceded by `prd.{P}.`) and widens `BARE_TWO_LEVEL` to bracket and angle forms. `RELATIVE_TITLES` is anchored to exact lines (CR5-3), and its stale test now requires each anchor to exist and be a relative title head. The ingester contract test binds only a line's head names (CR5-5), with a must-fail fixture. A dated audit plan touched by the bulk rewrite was restored unedited.

**Files Modified**: 13 prose files, tests/doc-id-chokepoint.test.js, tests/ingester-prompt-placeholders.test.js

**Testing**: 17/17. Mutations: restore a flat layout path, the bracket id, or a flat title outside an anchor → §5 red; boundNames reading the whole line → its fixture red.

### Iteration 6

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: Every earlier pass enumerated by spelling and never listed the population first. The guard matched placeholders only, never a literal id or a concrete folder name, and only within one line, so it could not see a tree diagram. My own enumeration grep repeated the gap: it excluded `/` before an id, and the widened check then found four more links.

**Fix Description**: Listed the population first (`git grep '/epics/'` minus `prd.*` parents; literal `epic.N.x` / `story.N.N.x`; tree `epics/` nodes), then fixed every hit: 15 prose files (plus 7 bundled copies), including a rewritten real-world example tree in `prd-structure-guide.md` and a `troubleshooting.md` glob that was one level short and matched nothing (it now matches the 4 epic files in this repository). §5 gains `flatParent` (a literal parent of `epics/` must be `prd.*`), `FLAT_LITERAL` (`NEGATIVE_EXAMPLE` lines and `LITERAL_DATA` corpus rows spared, each with a reason) and `flatTreeEpics` (nearest directory ancestor of a tree `epics/` node). `FLAT_LAYOUT`'s lookbehind accepts hyphenated and digit P (CR6-8).

**Files Modified**: tests/doc-id-chokepoint.test.js and 15 prose files (prd-structure-guide.md, finalise, qa-story, develop, edit-epic, qa-gate, ensure-*-jira-issue, create-issue, review-story README, story-status-schema, roadmap-selection, subagent-summary-artifact, invocation, troubleshooting)

**Testing**: 18/18. Mutations: a concrete flat parent, a flat tree node, a literal flat id and a literal glob parent each turn §5 red.

### Iteration 7

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-16

**Root Cause**: `FLAT_LITERAL` required a lowercase name start, so a flat literal before `...`, `{name}` or `<name>` passed: `story.311.1...` beside rewritten filenames, `story.178.1.{name}.md`, and `epic.1.<name>` holding `story.1.1.5`.

**Fix Description**: Each site now carries its example's full id (finalise ×4, develop, qa-gate ×2, qa-story). `FLAT_NAME` accepts a lowercase letter, two letters, `...`, or a name-like placeholder, and spares a lone capital (`epic.1.E`) and level placeholders (`[E]`, `{S}`). The guide's story-layout redraw (CR7-5) and ASCII trees (CR7-8) are in the task's Deferred Work.

**Files Modified**: tests/doc-id-chokepoint.test.js, skills/finalise/SKILL.md, skills/develop/SKILL.md, skills/qa-gate/SKILL.md, skills/qa-story/SKILL.md

**Testing**: 18/18. Mutations: each of the three sites reverted, and `FLAT_NAME` narrowed back to `[a-z]`, turn §5 red.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-16 | New | qa-task | Raised by task.207.qa.1 |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 1 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 1 |
| 2026-10-16 | Reopened | qa-task | Not fixed — same mechanism survives (task.207.qa.2 CR-1) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 2 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 2 |
| 2026-10-16 | Reopened | qa-task | Not fixed — §5 misses uppercase and title spellings (task.207.qa.3 CR-2) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 3 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 3 |
| 2026-10-16 | Reopened | qa-task | Not fixed — YAML templates and config comments outside §5's *.md population (task.207.qa.4 CR-1) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 4 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 4 |
| 2026-10-16 | Reopened | qa-task | Partial — {domain}/{feature}/epics layout and [epic].[story] bracket form remain (task.207.qa.5 CR-1, CR-2) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 5 started |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 5 |
| 2026-10-16 | Reopened | qa-task | Partial — tree diagrams and concrete example paths keep a flat feature directory (task.207.qa.6) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 6 started (user-approved) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 6 |
| 2026-10-16 | Closed | qa-task | Verified by task.207.qa.7 — layout population and tree diagrams swept; remaining items tracked as CR7-* |
| 2026-10-16 | Reopened | qa-task | Correction: closed in error — CR7-1..3 are residues of this same class (task.207.qa.7) |
| 2026-10-16 | In Progress | qa-fix | Fix cycle 7 started (user-approved) |
| 2026-10-16 | Ready for QA | qa-fix | Fixed in QA fix cycle 7 |
| 2026-10-16 | Closed | qa-task | Verified by task.207.qa.8.doc-numbering-enforcement-and-sweep.md |
