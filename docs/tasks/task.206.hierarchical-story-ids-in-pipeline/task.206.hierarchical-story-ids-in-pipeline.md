---
id: task.206
title: "Hierarchical story ids in the pipeline"
type: task
description: "Move every story-side reader and writer of story and epic identifiers (create-story, the Step 0 and 0a shell snippets, create-branch, session-handoff, qa-next, the tracker story syncs, select-next and the finalise artifact regex) off its own regex and onto the task.202 doc-id engine, so the pipeline runs end to end on story.{P}.{E}.{S} documents and feature/story.{P}.{E}.{S} / epic/{P}.{E} branches."
tags: [doc-id, numbering, create-story, develop-story, create-branch, session-handoff, qa-next, develop-next, migration]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-13
updated: 2026-10-16
assignee:
estimated_effort_hours: 16
github_issue: 649
completed_date: 2026-10-16
pr_number: 677
---

# Technical Task: Hierarchical story ids in the pipeline

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.206.review.1.hierarchical-story-ids-in-pipeline.md` implemented 2026-10-16

**GitHub Issue**: [#649](https://github.com/Gamaroff/agent-skills/issues/649)

---

## 1. Overview

This task is the story-and-pipeline unit of the hierarchical numbering plan
([`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md),
item T5). Under that plan a PRD is `prd.{P}.{feature}`, an epic is `epic.{P}.{E}.{name}` with E
counted **within its PRD**, and a story is `story.{P}.{E}.{S}.{name}`. Because E restarts at 1 in
every PRD, **E alone no longer identifies an epic**. Every lookup has to key on `(P, E)`.

Today the story side of the pipeline reads ids with about a dozen hand-written regexes and shell
snippets. Each one assumes "story = 2 numbers, epic = 1". This task moves each of them onto the
`doc-id.js` engine that task.202 ships, so that one definition decides what an id is.

**Scope:** every code and executable-snippet site that a `/create-story` → `/develop-story` run,
the session handoff, the roadmap selector or the UAT selector passes through, plus the eval and test
fixtures that pin the old shape. The fixtures are renamed **through the task.203 migration
script**, not by hand.

**Key deliverables:**

- Each listed site parses and builds ids through `doc-id.js`, with no local regex left.
- `feature/story.{P}.{E}.{S}.{slug}` and `epic/{P}.{E}.{slug}` branches, including the
  sub-story letter suffix (`story.1.2.3A`).
- Renamed fixtures and tests, with a green `npm test` and `npm run eval:all`.

**Expected outcome:** a story created after task.203 has migrated this repository runs the whole
pipeline: review, branch, develop, QA, finalise, handoff, roadmap selection and UAT selection.
No step reads `P` where it meant `E`.

---

## 2. Motivation

### Current problems

1. **Positional parsing reads the wrong number.** `review-pipeline-step-0a-branch-setup.md` takes
   the epic as `awk -F. '{print $2}'` and the story as `$3` (§ 0a.2 review-story). On
   `story.1.2.3.x` those fields are P and E. The auto-skip glob
   `feature/story.${EPIC_NUM}.${STORY_NUM}.*` then matches every story of epic 2 in PRD 1.
2. **"First number" extraction returns P.** `develop-pipeline-step-0-resolve-and-prepare.md` runs
   `EPIC_NUM=$(echo "$EPIC_REF" | grep -oE '[0-9]+' | head -1)`, then
   `find docs/ -name "epic.${EPIC_NUM}.*.md" | head -1`. With per-PRD epics that `find` returns an
   arbitrary epic from an arbitrary PRD. It does not halt, so the wrong epic's `branch_model` drives
   branching.
3. **Two-number regexes silently skip or mis-stem.**
   - `uat-status.mjs` `STORY_FILE` matches nothing on a three-number name, so the UAT queue reads
     as empty. That is the reassuring answer nobody questions.
   - `finalise-fix-and-recheck.mjs:122` stems `story.1.2.3.x.md` as `story.1.2`. Step 8a would then
     admit every sibling story's artifacts as "co-located".
4. **Prefix matches over-match.**
   - `create-story/scripts/lib.js` `scanExistingStoryIds` builds `^story\.${epicNum}\.(\d+)`.
   - `continuation.mjs` `findStoryDir` searches for `story.${e}.${s}.`.

   Once ids grow a segment, each of these matches a neighbour's files.
5. **No single definition.** `doc-links.test.mjs:331` re-declares `WORK_ITEM_RE` instead of
   importing it. That is the enumeration drift class in `docs/reference/anti-patterns.md`.

### Benefits

- One parser decides what a story, an epic and a sub-story are. A new site can import it, and
  task.207's guard can then forbid any site that does not.
- Epic lookups key on `(P, E)` by construction, which closes the arbitrary-epic hazard described in
  problem 2.
- The UAT selector and Step 8a fail loudly on an unparseable name instead of skipping it.
- `nextStoryId` in `create-story/scripts/lib.js` is finally wired into the skill, so story numbers
  are allocated by code (plan § "How enforced in practice holds", point 1).

---

## 3. Technical Background

### Dependencies

- **task.202** ships `shared/resources/doc-id.js`. Measured against its `module.exports` and CLI
  usage on 2026-10-16: `parse(name)` returns `{ok, kind, prd, epic, story, sub, artifact, seq, slug,
  id, reason}` (failure is `{ok:false, reason}`, never `null`; the stem is `id`, e.g.
  `story.1.2.3A`); `matchesEpic(name, P, E)`; `format`; and the CLI `parse <name>`,
  `next story --epic-dir <dir>`, `check`, `epic-meta`. It exports **no regex** and has **no epic
  lookup subcommand**: a site that needs a regex derives its decision from `parse`, and epic
  resolution is `matchesEpic` over a file listing. This task consumes that API and adds nothing to it. If a site needs a function task.202 did not ship, that is a task.202
  defect: fix it there, not here.
- **task.203** ships `migrate-doc-numbering.mjs` and migrates this repository's `docs/prd/` tree.
  This task runs the same script over the eval fixture trees.
- **task.205** moves the epic side (`create-epic`, `review-epic`, `generate-prd-epic-index.mjs`,
  `sync-jira-epic` including `findChildStories`, `jira-create-epic`, `ensure-epic-github-issue`).
  It also edits the review-epic stanza of `review-pipeline-step-0a-branch-setup.md`, so it must land
  first and this task rebases onto it.

### Current state: code sites

Each site below was found with the Files Summary commands, run 2026-10-13. Generated
`skills/*/references/*` copies are excluded: the source in `shared/resources/` is edited and
`npm run bundle` regenerates the copies.

| Site | Identifier | Today's assumption |
|---|---|---|
| `shared/resources/finalise-fix-and-recheck.mjs:69` | `WORK_ITEM_DOC_RE` | `story\.\d+\.\d+`, `epic\.\d+`. This still matches a 3-number doc, because the trailing `\.[^/]+` absorbs the rest |
| `shared/resources/finalise-fix-and-recheck.mjs:122` | stem match in `isCoLocatedArtifact` | `^(…story\.\d+\.\d+|epic\.\d+…)\.` stems `story.1.2.3.x` as `story.1.2` |
| `shared/resources/tests/doc-links.test.mjs:331` | `WORK_ITEM_RE` | a restated copy of the above |
| `skills/create-story/scripts/lib.js:24` | `STORY_FILENAME_RE` | named groups `epic` and `story` only |
| `skills/create-story/scripts/lib.js:57` | plan-file regex | same |
| `skills/create-story/scripts/lib.js:85` | `scanExistingStoryIds` | `^story\.${epicNum}\.(\d+)` |
| `skills/create-story/scripts/lib.js:39` | leading-zero check | `^story\.0`, `^story\.\d+\.0` |
| `skills/session-handoff/scripts/continuation.mjs:71` | `STORY_BRANCH` | `^feature\/story\.(\d+)\.(\d+)\.slug$` |
| `skills/session-handoff/scripts/continuation.mjs:178-185` | handoff path build | `story.${e}.${st}.handoff.{k}` |
| `skills/session-handoff/scripts/continuation.mjs:288` | `findStoryDir` | `want = story.${e}.${s}.` |
| `skills/qa-next/scripts/uat-status.mjs:166` | `STORY_FILE` | `\/story\.(\d+)\.(\d+)\.[a-z0-9-]+\.md$` |
| `skills/qa-next/scripts/uat-status.mjs:185-206` | `id`, `epic`, `epicSurface[String(m[1])]`, sort | id `E.S`; surface keyed on E alone |
| `skills/develop-next/scripts/select-next.mjs:435` | roadmap heading match | `\bEpic\s+(\d+)\b`; `epicSections` keyed on that number (`:398`, `:438`, `:548`, `:609`) |
| `skills/develop-next/scripts/select-next.mjs:650`, `:662` | `depSatisfied` → `epicActionable` | `deps: Epic 8` |
| `shared/resources/bug-doc.js:51` | `RE_STORY_BUG` | `[\d.]+?`. It already accepts any segment count, but not a sub-story letter (`3A`) |

**Already shape-tolerant (unchanged; a test case each proves it):**

- `select-next.mjs:287` `ID_RE_SRC` (`[TB]?\d+(?:\.\d+)*[a-z]?…`) and `:373` `isWorkItemHref`.
- `select-next.mjs` `storyBranchModel`, which resolves by `epic_source` / the `epic:` directory stem.
- `sync-jira-story.js:198` (related-doc lookup) and `:253` / `:807` (`[\d.]+` in
  `normaliseStorySummary`).
- `shared/resources/reenter-qa-after-finalise.sh`, which reads the stem from DoD file names.
- `shared/resources/pipeline-answers.js:248` (`startsWith("epic/")`).
- `card-preflight.js`, which reads only the leading kind word.

### Current state: executable snippets in Markdown

| Site | Snippet | Failure under `story.{P}.{E}.{S}` |
|---|---|---|
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (Explore subagent prose) | "find `story.{epic}.{story}.*.md` … extract `{epic_number}` and `{story_number}`" | names two numbers |
| same file, Epic resolution | `EPIC_NUM=… grep -oE '[0-9]+' \| head -1`, `EPIC_SLUG=… sed 's/epic\.[0-9]*\.//'`, `find docs/ -name "epic.${EPIC_NUM}.*.md" … \| head -1` | returns P; the slug keeps `E.`; the find over-matches across PRDs |
| same file, integration branch table | `branchPattern` default `epic/{n}.{slug}` | E alone is ambiguous |
| `shared/resources/review-pipeline-step-0a-branch-setup.md` § 0a.2 review-story | `awk -F. '{print $2}'` / `'{print $3}'` | reads P and E |
| same file, § 0a.3 review-story | `feature/story.${EPIC_NUM}.${STORY_NUM}.*)` | matches a whole epic |
| same file, Q-prompt text | "`feature/story.${EPIC_NUM}.${STORY_NUM}.*`" | same |
| `skills/ensure-story-github-issue/SKILL.md` | `STORY_E`, `STORY_S` from `story.{E}.{S}.`; dedup `[Story ${STORY_E}.${STORY_S}]`; milestone `Epic ${STORY_E} — …` | two numbers; the milestone collides across PRDs |
| `skills/sync-github-story/SKILL.md` | `STORY_E`, `STORY_S`; title `[Story ${STORY_E}.${STORY_S}]` | same |
| `skills/review-story/SKILL.md` (0a summary, tracker dedup) | `EPIC_NUM`, `STORY_NUM`; label `story-${EPIC_NUM}.${STORY_NUM}` | same |
| `skills/create-story/SKILL.md` | `story.{epicNum}.{storyNum}` paths; `epic: epic.{epicNum}.{epic-name}`; "Begin Epic {epicNum + 1}" | two numbers; "the next epic" is now per PRD |
| `skills/create-story/resources/story-template.yaml` and `skills/review-story/resources/story-template.yaml` | `filename` / `title` `story.{{epic_num}}.{{story_num}}` | two numbers |
| `skills/create-branch/SKILL.md` | `feature/story.<e>.<s>`, sub-story example `story.309.2.3A` | the example already has three numbers plus a suffix. Under the new grammar it reads P=309, E=2, S=3, sub=A, which is what the doc-id grammar defines |
| `shared/resources/read-config.sh:599` comment, `docs/reference/configuration.md` (`branching.epicIntegration.branchPattern`) | `epic/{n}.{slug}` | needs a `{p}` placeholder |
| `skills/create-branch/SKILL.md` § Configuration (`branching.epicIntegration.branchPattern`, lines 387–405) | `epic/{n}.{slug}` default; the only place the pattern is applied | needs `{p}`, and is where a `{p}`-less pattern is refused — `git grep branchPattern -- '*.js' '*.mjs' '*.sh'` finds no code reader |
| `skills/develop-next/assets/project-completion-roadmap.template.md:49`, `skills/develop-next/references/roadmap-selection.md:31` | `## <Area or Epic N — name>`; "bare epic refs (`Epic 8`)" | teaches the legacy heading the selector will refuse |

### Target

- Every row above calls `doc-id.js`, either directly or through a `command node …/doc-id.js parse`
  call in a snippet. **No snippet splits a stem on `.` positionally.**
- Epic file resolution keys on `(P, E)`, and two or more matches is a HALT, not `head -1`.
- **Sub-story:** `story.{P}.{E}.{S}{A}`, where the letter suffix sits on the S segment. `bug-doc.js`
  accepts it in `RE_STORY_BUG` by importing doc-id's story grammar.
- Branches are `feature/story.{P}.{E}.{S}[A].{slug}` and `epic/{P}.{E}.{slug}`.
  - `branchPattern` gains `{p}`, and the default becomes `epic/{p}.{n}.{slug}`.
  - A configured pattern without `{p}` is refused with a message naming the key, because E alone
    is not unique.
- Roadmap: `select-next.mjs` reads `Epic P.E` headings and `deps: Epic P.E`. A legacy `Epic N`
  heading is a model **error** naming the migration, never a silently mis-keyed epic.
- `uat-status.mjs`: ids are `P.E.S`, `epicSurface` is keyed on `"P.E"`, and the sort is `(P, E, S)`.
  A `*.md` under the stories root that `doc-id` cannot parse is reported, not skipped.

### Clarifications

- **Tracker titles of already-migrated items are not touched** (plan T2). New stories get
  `[Story P.E.S]`. `ensure-story-github-issue` dedups by title only when `github_issue` is absent,
  and migrated stories carry it, so no duplicate is created. A test pins that.
- `generate-prd-epic-index.mjs`, `sync-jira-epic.js` (`findChildStories`, `normaliseEpicSummary`),
  `jira-create-epic.js` and `review-epic` belong to task.205. They are not in scope here.

---

## 4. Scope

### In scope

- ✅ Every code site and executable snippet in § 3's two tables, except the "already tolerant"
  rows, which get a pinning test.
- ✅ The prose in the story-pipeline skills that tells an agent how to build or parse an id:
  `create-story`, `review-story`, `create-branch`, `ensure-story-github-issue`, `sync-github-story`,
  and the Step 0 / 0a step docs.
- ✅ The `branchPattern` `{p}` placeholder (config reference and Step 0 table).
- ✅ Renaming eval and test fixtures through `migrate-doc-numbering.mjs` (task.203), and updating
  the scenario JSON that names their paths.
- ✅ Wiring `nextStoryId` into `create-story`, so the story number is allocated by
  `doc-id next story --epic-dir`.

### Out of scope

- ❌ Epic-side skills and scripts. That is task.205.
- ❌ The repository-wide placeholder sweep of the remaining `SKILL.md` and shared `.md` prose
  (qa-story, qa-fix, develop and others), and the guard against hand-rolled regexes. That is
  task.207. This task fixes only the sites that **execute** or **name** an id for a run.
- ❌ Renaming existing tracker issues.
- ❌ `create-parallel-stories`. Its `{epic}.1-{n}` scheme is a separate convention, recorded as a
  task.207 sweep item.
- ❌ `.agents/scripts/backfill-story-issues.sh`. It is a one-off maintenance script for this
  repository and is noted for task.207.

---

## 5. Breaking Changes

1. **Story and branch names.** `story.{E}.{S}` → `story.{P}.{E}.{S}`, and
   `feature/story.{E}.{S}.slug` → `feature/story.{P}.{E}.{S}.slug`.
   - **Who is affected:** consumer projects with stories, and any in-flight branch.
   - **Migration:** run `migrate-doc-numbering.mjs` (task.203) on the consumer tree **before**
     upgrading the skills. In-flight story branches are finished on the old skills or renamed with
     `git branch -m`. The release note states the order.
2. **`branchPattern` default.** `epic/{n}.{slug}` → `epic/{p}.{n}.{slug}`, and a configured pattern
   without `{p}` is refused.
   - **Migration:** add `{p}` to the pattern in `skills-config.yaml`. Existing `integration_branch:`
     values in epic frontmatter are used verbatim and are not affected.
3. **`qa-next` `epicSurface` keys.** `"5"` → `"1.5"`.
   - **Migration:** rename the keys in the consumer's surfaces file. An unrecognised bare-number key
     is reported by `uat-status.mjs`, not ignored.
4. **Roadmap headings.** `## Epic 8` → `## Epic 1.8`, and `deps: Epic 8` → `deps: Epic 1.8`.
   - **Migration:** task.203's script rewrites them (see Risk 2). A leftover legacy heading is a
     selector error naming the migration.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.206.plan.hierarchical-story-ids-in-pipeline.md](task.206.plan.hierarchical-story-ids-in-pipeline.md)

Phases 1–4 can each land as a commit with green tests. The task ships as one PR, because a
consumer on a half-moved pipeline breaks (§ 10, Risk 1).

### Phase 1: Shared code consumers (Risk: Medium)

- [x] `finalise-fix-and-recheck.mjs`: replace `WORK_ITEM_DOC_RE` and the `:122` stem match with doc-id; export the result.
- [x] `doc-links.test.mjs:331`: import the regex instead of restating it.
- [x] `bug-doc.js`: `RE_STORY_BUG` accepts the sub-story suffix via doc-id's story grammar.
- [x] `create-story/scripts/lib.js`: filename and plan validators, `scanExistingStoryIds`, `nextStoryId` and `assertUniqueStoryId` all key on `(P, E)` through doc-id.

### Phase 2: Selectors and handoff (Risk: Medium)

- [x] `continuation.mjs`: `STORY_BRANCH`, handoff path and `findStoryDir` through doc-id.
- [x] `uat-status.mjs`: `STORY_FILE`, id, `epicSurface` key and sort; report unparseable files.
- [x] `select-next.mjs`: `Epic P.E` headings, `epicSections` keyed `"P.E"`, `deps: Epic P.E`; legacy `Epic N` is a model error. Update the roadmap template, `roadmap-selection.md`, and every `develop-next` fixture that carries a legacy heading (Files Summary item 17a).

### Phase 3: Executable snippets and story-pipeline prose (Risk: High)

- [x] `develop-pipeline-step-0-resolve-and-prepare.md`: id extraction and epic resolution through `doc-id parse`; HALT on 0 or 2+ epic matches; `branchPattern` `{p}`.
- [x] `review-pipeline-step-0a-branch-setup.md` review-story stanzas (0a.2, 0a.3, Q-prompt).
- [x] `create-story/SKILL.md`: paths, `epic:` stem, "next epic in the same PRD", `doc-id next story --epic-dir`; both `story-template.yaml` copies.
- [x] `review-story/SKILL.md`, `create-branch/SKILL.md`, `ensure-story-github-issue/SKILL.md`, `sync-github-story/SKILL.md`: ids, titles, labels, milestone keyed `Epic P.E`.
- [x] `docs/reference/configuration.md` and the `read-config.sh` comment: `branchPattern` `{p}`.

### Phase 4: Fixtures, tests, bundle (Risk: Medium)

- [x] Run `migrate-doc-numbering.mjs` over each `evals/**/replay/docs` tree. Update the `scenario.json` paths and READMEs it names.
- [x] Update the measured test population (Files Summary) to the new shape, with a case per "already tolerant" site.
- [x] `npm run bundle`, `npm run generate-catalog`, `npm test`, `npm run eval:all`, `npm run bundle:check`.

---

## 7. Files Summary

**Population commands** (run 2026-10-13; re-run before editing, and let the tests hold the count):

```bash
# code sites (sources only)
git grep -nE 'story\\\.|epic\\\.|story\.\$\{|epic\.\$\{|feature/story|epic/\$\{' \
  -- '*.js' '*.mjs' '*.cjs' '*.sh' '*.py' ':!skills/*/references/*' | grep -vE '/tests?/|\.test\.'
git grep -nE '\[Epic\\s\+|Epic\\s\+\(' -- '*.js' '*.mjs' ':!skills/*/references/*'
# executable snippets in Markdown
git grep -nE "awk -F\.|grep -oE '\[0-9\]\+'|epic\.\\\$\{|story\.\\\$\{|STORY_E|EPIC_NUM|sed 's/epic|feature/epic\." \
  -- 'shared/resources/*.md' 'skills/*/SKILL.md' 'skills/*/resources/*' ':!skills/*/references/*'
# tests pinning the old shape
git grep -lE 'story\.[0-9]+\.[0-9]+|epic\.[0-9]+\.|feature/story\.[0-9]' \
  -- '*.test.js' '*.test.mjs' '*.test.sh' ':!skills/*/references/*'
# fixture files whose path carries an id
git ls-files evals | grep -E '/(story\.[0-9]+\.[0-9]+|epic\.[0-9]+)\.'
git grep -lE 'story\.5\.1|epic\.5\.' -- 'evals/**'
```

On 2026-10-13 these returned:

| Population | Count |
|---|---|
| Test files | 32 |
| Fixture paths | 45, across 9 `evals/develop-story/step-isolation/*` scenarios and 2 `evals/create-story` scenarios (`01-happy`, `03-sign-off-enabled`) — re-measured 2026-10-16 |
| Eval files naming `story.5.1` / `epic.5.` | 32 |

Of the 32 test files, those owned by task.205 are excluded: `generate-prd-epic-index.test.mjs`
and the `sync-jira-epic` tests.

### Core implementation

1. `shared/resources/finalise-fix-and-recheck.mjs`: `WORK_ITEM_DOC_RE`, the stem match.
2. `shared/resources/bug-doc.js`: `RE_STORY_BUG`.
3. `skills/create-story/scripts/lib.js`: validators and allocator.
4. `skills/session-handoff/scripts/continuation.mjs`: `STORY_BRANCH`, `findStoryDir`, handoff path.
5. `skills/qa-next/scripts/uat-status.mjs`: `STORY_FILE`, ids, surfaces.
6. `skills/develop-next/scripts/select-next.mjs`: Epic heading, `epicSections`, `deps: Epic`.
7. `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`: id extraction, epic resolution, `branchPattern`.
8. `shared/resources/review-pipeline-step-0a-branch-setup.md`: review-story stanzas only.
9. `skills/create-story/SKILL.md`, `skills/create-story/resources/story-template.yaml`, `skills/review-story/resources/story-template.yaml`.
10. `skills/review-story/SKILL.md`, `skills/create-branch/SKILL.md`, `skills/ensure-story-github-issue/SKILL.md`, `skills/sync-github-story/SKILL.md`.

### Tests

11. `shared/resources/tests/finalise-fix-and-recheck.test.mjs`, `doc-links.test.mjs`, `qa-read-back.test.mjs`, `qa-scope-from-head.test.mjs`, `report-lint.test.mjs`, `next-numbered.test.mjs`, `registry-tick.test.mjs`.
12. `shared/resources/reenter-qa-after-finalise.test.sh`.
13. `skills/create-story/tests/create-story.test.js`, `skills/session-handoff/tests/continuation.test.js`, `skills/review-pr/tests/review-pr.test.js`, `skills/create-task/tests/create-task.test.js`.
14. `skills/sync-jira-story/tests/*`, `skills/sync-jira-bug/tests/*`, `skills/sync-jira-task/tests/sync-jira-task.test.js`.
15. `evals/develop-next/unit/select-next.test.mjs`, `evals/qa-next/unit/uat-status.test.mjs`, `evals/shared/tests/{develop-story-assertions,finalise-bug-mode,optional-file-lookups}.test.mjs`.
16. `tests/{key-lookup-single-statement,qa-cycle,qa-results-step12-wiring,skill-protocol}.test.js`.

### Fixtures

17. `evals/develop-story/step-isolation/*/replay/docs/prd/domain/feature/epics/epic.5.example/**` and `evals/create-story/scenarios/03-sign-off-enabled/replay/docs/**`. Renamed by the migration script, after a `prd.1.*` / `epic.1.5.*` stub is added to each tree (Notes, decision 1).
    - `evals/create-story/scenarios/01-happy/replay/docs/stories/story.178.8.example-feature.md` has no PRD or epic directory at all, so the migration script cannot rename it. Rename it by hand and record why in the implementation report.
17a. `develop-next` fixtures carrying a legacy `Epic N` heading or `deps: Epic N` (`git grep -lE '\bEpic\s+[0-9]+\b' -- 'evals/develop-next/**'`, 2026-10-16): `evals/develop-next/unit/fixtures/{01-first-item,02-deps-and-markers,03-flow-chain,04-blocked-annotation,06-forward-deps,09-planning-gap,10-real-world,11-task-ids}.md` and `evals/develop-next/step-isolation/02-human-gated-stop/replay/docs/development/project-completion-roadmap.md`. Rewritten to `Epic P.E` by hand (they are roadmaps, not PRD trees), plus `skills/develop-next/assets/project-completion-roadmap.template.md` and `skills/develop-next/references/roadmap-selection.md`.
18. `evals/develop-story/**/scenario.json`, `evals/develop-story/README.md`, `evals/develop-story/smoke/01-end-to-end-dry/README.md`.

### Documentation

19. `docs/reference/configuration.md` (`branchPattern`), `shared/resources/read-config.sh` comment.
20. CHANGELOG `[Unreleased]`: the breaking changes and the migration order.

### Also touched during implementation (2026-10-16)

22. New test: `evals/shared/tests/step-0-epic-resolution.test.mjs`.
23. Tests whose pinned literal moved: `evals/develop-story/protocol/develop-branch-flow-rules.test.mjs`
    (`epic/{p}.{n}.{slug}`), `evals/shared/tests/optional-file-lookups.test.mjs` (Step 0's
    `{story-stem}.implementation` find), `tests/unbound-default-reads.test.js` (two declared inputs),
    `shared/resources/tests/doc-id.test.mjs` (the allocator contrast), `skills/sync-jira-bug/tests/*`.
24. `skills/session-handoff/SKILL.md` (handoff path prose), `skills/qa-next/assets/uat-surfaces.template.json`
    (`epicSurface` key `"1.1"`), `shared/resources/doc-id.js` (a comment only — nextStoryId now delegates).
25. `evals/create-story/scenarios/02-missing-core-config/{scenario.json,replay/.eval/halt.log}` (the path
    it names).

### Generated (do not hand-edit)

21. `skills/*/references/*`. Regenerate them with `npm run bundle`.

---

## 8. Testing Strategy

### Unit tests

- **Scope:** each Phase 1–2 site, run against `story.{P}.{E}.{S}` and `story.{P}.{E}.{S}A` inputs.
- **Neighbour cases:** epic 1.2 next to epic 2.2, and story 1.2.3 next to story 1.2.30. These cover
  the prefix over-match.
- **Negative cases:** a legacy `story.5.1.x` name and a legacy `Epic 8` heading must produce the
  stated error, not a mis-keyed result.
- **Command:** `npm test`.
- **Mutation proof:** revert each site to its old regex and confirm a named case goes red.

### Integration tests

- `npm run eval:all` over the renamed develop-story and create-story replay trees. These exercise
  Step 0, 0a and finalise on the new names.
- A snippet test runs the Step 0 epic-resolution block against a fixture with two PRDs that both
  hold an `epic.*.2.*`. It must resolve the right one, and HALT on an ambiguous `(P, E)`.

### Performance tests

None. Id parsing is not on a hot path, so no baseline is needed.

### Consumer tests

- A post-merge smoke test in a scratch consumer (plan § Verification):
  `/create-prd` → `/create-epic` → `/create-story` → `/develop-story` to Step 4. The branch must be
  `feature/story.1.N.1.*`.
- Before trusting a local green, move the gitignored `.agents/skills` symlink aside.

---

## 9. Success Criteria

### Functional

- [x] `review-pipeline-step-0a-branch-setup.md` (review-story) and `develop-pipeline-step-0-resolve-and-prepare.md` extract `(P, E, S)` via `doc-id parse`. A snippet test feeds `story.1.2.3.x.md` and asserts `P=1 E=2 S=3`.
- [x] Step 0 epic resolution HALTs on zero matches and on two or more matches for `(P, E)`. It never takes `head -1`.
- [x] `uat-status.mjs` lists `story.1.2.3.x.md` with id `1.2.3`, and reports (does not skip) an unparseable story filename.
- [x] `isCoLocatedArtifact` does not admit `story.1.2.4.*` artifacts as co-located with `story.1.2.3`.
- [x] `continuation.mjs` writes `story.1.2.3.handoff.{k}.{slug}.md` from branch `feature/story.1.2.3.{slug}`. It does not resolve `story.1.2.30`.
- [x] `select-next.mjs` keys `## Epic 1.2` and `deps: Epic 1.2`, and reports a legacy `## Epic 2` as an error.
- [x] `bug-doc.js` resolves `story.1.2.3A.bug.1.x.md` to parent `story.1.2.3A`.
- [x] `create-story` allocates S through `doc-id next story --epic-dir`. `assertUniqueStoryId` HALTs on an existing `(P, E, S)`.

### Performance

- [x] `npm test` wall time is within 10% of the pre-change run on the same machine. Measured with `uptime; time npm test` on the base commit (baseline, before Phase 1) and on the PR head, both recorded with their load averages in the implementation report.
- [x] `eval:all` scenario count is unchanged: no scenario is dropped while its fixtures are renamed. Measured as the number of scenario directories `eval:all`'s own `package.json` globs match (`ls -d <each glob> | wc -l`), on the base commit and on the PR head.

### Code quality

- [x] No code site in § 3's code-site table declares a story or epic id regex; each derives its decision from `doc-id.js`. Measured with the Files Summary `git grep`, **excluding** the "already tolerant" sites listed in § 3 (`sync-jira-story.js:198`/`:253`/`:807`, `select-next.mjs` `ID_RE_SRC` and `isWorkItemHref`), which keep their own shape-tolerant patterns. The repository-wide guard is task.207.
- [x] `npm test`, `npm run eval:all`, `npm run bundle:check`, `npm run lint:shell` and `npm run validate:all` pass.
- [x] Every Phase 1–2 site has a mutation-proved test.

### Migration

- [x] The eval and create-story fixtures were renamed by `migrate-doc-numbering.mjs`, and its log is cited in the implementation report.
- [x] CHANGELOG `[Unreleased]` states all four breaking changes and the "migrate first, then upgrade" order.
- [x] `docs/reference/configuration.md` documents `{p}` and the refusal of a `{p}`-less pattern.

---

## 10. Risk Assessment

### High risk

1. **Partial landing breaks consumers.**
   - **Risk:** if some sites move and others do not, a run reads P at one step and E at the next.
   - **Probability:** Medium. **Impact:** Critical, because the wrong epic's `branch_model` picks the base branch.
   - **Mitigation:** one PR. Phase commits stay green, but nothing is released between them.
   - **Rollback:** revert the PR.
2. **Fixture trees have no parent PRD or epic document.** The develop-story replay trees hold only
   `epics/epic.5.example/stories/…` (for example `02-review-story/replay/docs/prd/domain/feature/…`),
   and task.203's script reports PRD-less epics as blockers.
   - **Probability:** High. **Impact:** High, because Phase 4 cannot run.
   - **Mitigation:** this task adds a minimal `prd.1.*` / `epic.1.5.*` stub to each tree first
     (resolved — see Notes, decision 1).
   - **Rollback:** not applicable.

### Medium risk

3. **Shell snippets calling Node.**
   - **Risk:** `command node …/doc-id.js parse` inside a step doc must survive the nvm shell-function hazard.
   - **Mitigation:** use `command node`, and add a snippet test that executes the fenced block.
4. **Roadmap headings in consumer repos.**
   - **Risk:** a missed `Epic N` heading makes the selector error out.
   - **Mitigation:** the error names the migration. task.203 rewrites the headings.
5. **Tracker dedup on migrated items.**
   - **Mitigation:** dedup runs only when `github_issue` / `jira_key` is absent, and a test pins this.

### Low risk

6. **Generated copies are stale until `npm run bundle` runs.** Mitigation: `bundle:check` in CI.
7. **The task.205 rebase on `review-pipeline-step-0a-branch-setup.md`.** Mitigation: land task.205
   first. The stanzas are disjoint.

---

## 11. Rollback Plan

### Immediate rollback (< 1 hour)

- **Triggers:**
  - a develop-story run in this repo or a consumer resolves the wrong epic or branch
  - `eval:all` goes red on `develop` after merge
- **Steps:**
  1. `git revert -m 1 <merge>`.
  2. `npm run bundle`.
  3. Push to `develop`.
- **Validation:** `npm test` and `eval:all` are green, and the old fixture names are restored.

### Partial rollback (1–2 hours)

- **When to use:** a single selector (`uat-status` or `select-next`) misbehaves while the core
  pipeline is fine.
- **Steps:** revert that file's commit plus its test commit, and re-bundle.

### Forward fix

- **When to use:** a prose site was missed and no executable snippet is wrong.
- **Approach:** fix it in a follow-up commit, since task.207's sweep catches the class.

### Rollback triggers

- **Critical:**
  - wrong epic or branch resolution
  - a story artifact admitted to another story's DoD
- **Non-critical:**
  - a stale example id in prose
  - a message naming the old shape

---

## Implementation Record

**Completion Date:** 2026-10-16 (develop-task Step 3, run 1 — inline; see the implementation report)

### Implementation Summary

Every site in § 3 now reads a story or epic id through `shared/resources/doc-id.js` (`parse`,
`matchesEpic`, `nextNumber`, the `parse` / `next story --epic-dir` / `epic-meta` CLI). No § 3 code
site declares an id grammar of its own; an epic is resolved by **(P, E)**, and two-plus or zero
matches is a HALT.

| Site | Now |
|---|---|
| `finalise-fix-and-recheck.mjs` | `parseWorkItemName` (exported) + `isWorkItemDocument` read doc-id; `isCoLocatedArtifact` keys on `parse(…).id`; `WORK_ITEM_ARTIFACT_RE` is built from `doc-id.ARTIFACTS` |
| `doc-links.test.mjs` | imports `isWorkItemDocument` / `parseWorkItemName`; `WORK_ITEM_RE` deleted |
| `bug-doc.js` | a story bug is `parse` → `kind story, artifact bug`; sub-story `3A` resolves; `RE_STORY_BUG` deleted (it had no consumer) |
| `create-story/scripts/lib.js` | validators delegate to `parse`; `scanExistingStoryIds` / `nextStoryId` / `assertUniqueStoryId` take `(P, E)` through `matchesEpic` and `nextNumber` |
| `continuation.mjs` | `storyOfBranch` (exported) parses `feature/story.P.E.S.slug`; handoff prefix and `findStory` key on the doc-id id |
| `uat-status.mjs` | `scanStories` (exported) reads `P.E.S` ids, `epicSurface["P.E"]`, `(P, E, S, sub)` sort, and reports an unparseable `story.*.md`; `surfaceKeyWarnings` reports old-shape surface keys |
| `select-next.mjs` | `epicRef` (exported): `Epic P.E` headings and `deps: Epic P.E` keyed `"P.E"`; a bare `Epic N` is a model error (ignored inside a never-candidate section) |
| Step 0 / Step 0a / create-branch 2b.4 / create-story 1.1 / ensure-story S1 / sync-github-story 3 | executable fenced blocks over the doc-id CLI, each run by `evals/shared/tests/step-0-epic-resolution.test.mjs` |

### Approach

Phases 1–3 were implemented in place from the plan (corrected by review.1); Phase 4 renamed the nine
develop-story replay trees through `migrate-doc-numbering.mjs` after giving each a PRD and an epic stub
(Notes, decision 1), and hand-renamed the two flat `create-story` fixtures. Every Phase 1–2 site and
every new executable block is mutation-proved (implementation report, Decisions Log).

### Deviations from the plan

1. **`uat-status.mjs` `storyIds` (line 281) was a fourth two-number pattern** the § 3 table missed:
   `\b\d+\.\d+\b` split a `Stories` cell's `1.2.3` into `1.2`. It now collects whole dotted tokens, and
   `--check` reports any that is not a real story.
2. **`nextStoryId` now allocates highest + 1, not the lowest gap.** "Wire it in" meant one allocator:
   it delegates to `doc-id.nextNumber`, so `create-story` (`doc-id next story --epic-dir`) and the
   library cannot disagree. `doc-id.test.mjs`'s contrast test now asserts the agreement.
3. **The migration numbers the stub epic `1.1`, not `1.5`.** Epics are numbered within their PRD, so
   `story.5.1.example` became `story.1.1.1.example` under `prd.1.feature/epics/epic.1.1.example/`.
4. **Both `create-story` fixtures are flat `docs/stories/` files** with no PRD or epic tree (`01-happy`
   and `03-sign-off-enabled`, plus the path `02-missing-core-config` names); all three were renamed by
   hand to `story.1.178.{8,9}`.
5. **`bug-doc.js` corroboration** now reads a sub-story letter in a `related:` claim, so a correct
   `story 1.2.3A` claim is not reported as a mismatch.

### Testing Results

- `npm run ci:fast` (format + `npm test`): 5752 tests, 0 failures (iteration 3). `npm run eval:all`:
  exit 0. `bundle:check`, `lint:shell`, `validate:all` (128 passed) and `check:generated`: exit 0.
- `npm test` wall time, `uptime; time npm test` back to back on one machine: base `4378323e` (clean
  worktree) 115.7 s at load 5.52; this change 117.2 s at load 4.74 — **+1.3%**, within 10%. The base
  run had 3 failures that are artefacts of running in a detached worktree (`observation-log`,
  `from-observation`, `test-clean-checkout`), not of this change. Measured on the working tree before
  the commit; re-measure on the PR head if a reviewer needs the head figure.
- `eval:all` scenario count, from its own `package.json` globs: base 44, head 44 — unchanged.
- New: `evals/shared/tests/step-0-epic-resolution.test.mjs` (Step 0, 0a, create-branch 2b.4,
  create-story 1.1, ensure-story S1, sync-github-story 3 — executed under bash, and zsh where present).
- New cases in the finalise, doc-id, create-story, continuation, uat-status, select-next and
  sync-jira-bug suites, one per site.

### Deferred Work

- **`review-pipeline-step-0a-branch-setup.md` review-epic stanza (task.205's) is still positional**:
  `awk -F. '{print $2}'` reads P as `EPIC_NUM`, so its auto-skip `feature/epic.${EPIC_NUM}.*` matches every
  epic branch of PRD P. Out of scope here (§ 3 assigns it to task.205); recorded for task.207's sweep.
- **Story-bug name readers (QA cycle 1, CR-6).** `create-bug-report` (the writer) and
  `docs/standards/bug-documents.md` now name `story.{P}.{E}.{S}.bug`; six readers still restate the
  old shape in prose — `develop-bug/SKILL.md`, `develop-bug/references/develop-bug-step-0-resolve-bug.md`,
  `develop/SKILL.md`, `qa-fix/SKILL.md`, `qa-story/SKILL.md`, `review-bug/SKILL.md` (population:
  `git grep -l -F 'story.{epic}.{story}.bug'` over skills and shared resources, generated copies
  excluded) — task.207's placeholder sweep. `bug-doc.js`, the one code reader, is fixed.
- **Cross-block reads in neighbouring blocks (QA cycle 2).** The task, bug and epic 0a.3 variants
  read `TASK_ID` / `BUG_PREFIX` / `EPIC_NUM` and `CURRENT_BRANCH` from 0a.1 / 0a.2 (unchanged since
  before this task; only the review-story stanza is in scope). The ensure-story create block and the
  sync-github-story Step 5b block still read `STORY_TITLE`, `DOC_URL`, `STORY_RELATIVE_PATH`,
  `NEW_BODY` and `ISSUE_NUM` without binding them — pre-existing on the base (no block anywhere sets
  `STORY_TITLE`; QA cycle 2 CR2-2 / CR2-3). A follow-up should make those blocks self-binding.
- The remaining `story.{epic}.{story}` placeholders in `develop-story/SKILL.md`, the Step 1 lock
  template, `qa-story`, `qa-fix`, `develop` and other prose are task.207's sweep, as § 4 states.
- Post-merge consumer smoke test (§ 8, Consumer tests): `/create-prd` → `/create-epic` → `/create-story`
  → `/develop-story` to Step 4 in a scratch consumer — needs a live run, not a per-PR test.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-16
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.206.qa.3.hierarchical-story-ids-in-pipeline.md](./task.206.qa.3.hierarchical-story-ids-in-pipeline.md)
- **Gate File**: [task.206.gate.3.hierarchical-story-ids-in-pipeline.yml](./task.206.gate.3.hierarchical-story-ids-in-pipeline.yml)

### Test Coverage Summary
- **Tests Executed**: 5756
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 2's fixes are verified: bug.5 is closed, and test gaps QA2-1 and QA2-2 are closed, each proven by mutation. There is no high-confidence finding. Three low bugs (CR-1 to CR-3) and two cleanups are advisory and routed to follow-up.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.206.qa.3.hierarchical-story-ids-in-pipeline.md`
**Gate File**: `task.206.gate.3.hierarchical-story-ids-in-pipeline.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100 (3 QA cycles; bug.1–5 closed)

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** 16/16 met. AC9 (npm test wall time) measured +1.7% on the PR head against base; AC10 scenario count 44 → 44; AC11 regex sweep clean, with the repository-wide guard assigned to task.207
✅ **Tests & PR Review:** PR #677; CI green over 5 checks at `acf2e2e1`; Step 5c review `task.206.pr-review.1` (CONCERNS, PC-1 fixed, PC-2/PC-3 low)
✅ **Documentation:** CHANGELOG [Unreleased] entry with the four breaking changes; `docs/reference/configuration.md` documents `{p}`
✅ **Security Review:** PASS — 20 boundary probes executed, 0 reproduced
⚠️ **Compliance Review:** Not applicable (internal id-parsing refactor)

**Detailed Verification Log:** See `task.206.dod.1.hierarchical-story-ids-in-pipeline.md` for complete verification evidence and timestamps.

**Task marked as ACCEPTED on:** 2026-10-16

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-13 | 1.0 | Initial draft — T5 of the hierarchical numbering plan | create-task |
| 2026-10-16 | 1.1 | Review passed (8/10) — shipped doc-id API named; regex criterion scoped; develop-next fixtures, create-story 01-happy and create-branch config added; measured-criterion commands; author decisions resolved | review-task |
| 2026-10-16 |  | Status → ready-for-development | review-task |
| 2026-10-16 |  | Implemented — 141 non-generated files (11 code sites, 9 executable blocks, 9 migrated + 3 hand-renamed fixture trees), 1 new suite + 15 updated test files; ci:fast 5752/0 | develop |
| 2026-10-16 |  | QA gate CONCERNS (60/100) — 4 medium + 1 low gated findings, 7 advisory | qa-task |
| 2026-10-16 |  | QA findings fixed — 5 gated (CR-1, CR-2/3, CR-4, CR-5, CR-8) + 5 advisory (CR-6 writers, CR-7, CR-9, CR-10, CR-11/12), 1 iteration | qa-fix |
| 2026-10-16 |  | QA gate FAIL (80/100) — 1 high (0a.3 CURRENT_BRANCH), 2 low test gaps; bugs 1–4 closed | qa-task |
| 2026-10-16 |  | QA findings fixed — CR2-1 (0a.3 binds CURRENT_BRANCH), QA2-1/QA2-2 test gaps, advisory CR2-4..7, 1 iteration | qa-fix |
| 2026-10-16 |  | QA gate PASS (100/100) — 0 gated; bug.5 closed; 3 low + 2 cleanups advisory | qa-task |
| 2026-10-16 | 1.2 | DoD passed — accepted (PR #677) | finalise |
<!-- change-log-end -->

## Progress Tracking

### Phase 1: Shared code consumers
- [x] Complete

### Phase 2: Selectors and handoff
- [x] Complete

### Phase 3: Executable snippets and story-pipeline prose
- [x] Complete

### Phase 4: Fixtures, tests, bundle
- [x] Complete

---

## References

- [Hierarchical numbering plan](../../../.agents/plans/hierarchical-doc-numbering.md)
- task.202 (doc-id engine), task.203 (migration), task.205 (epic skills), task.207 (guard and sweep)
- `docs/standards/file-naming.md`, `docs/standards/story-documents.md`

## Notes

**Depends on:** task.202, task.203, task.205.

**Author decisions (resolved 2026-10-16, review.1 — the recommended options, taken by the autonomous pipeline):**

1. **Fixture parents → stubs.** This task adds PRD and epic stub documents to each replay tree;
   task.203's script is not changed. Stubs keep the fixtures realistic and the script strict.
2. **`branchPattern` without `{p}` → refused**, with a message naming the key. Not warn-and-prepend.

QA artifacts will land in this directory:

- `task.206.qa.{n}.hierarchical-story-ids-in-pipeline.md`
- `task.206.gate.{n}.hierarchical-story-ids-in-pipeline.yml`
- bugs as `task.206.bug.{n}.{name}.md`
