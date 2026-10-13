---
id: task.206.plan
title: "Implementation Plan: Hierarchical story ids in the pipeline"
type: plan
task-ref: task.206.hierarchical-story-ids-in-pipeline.md
---

# Implementation Plan: Hierarchical story ids in the pipeline

> Requirements and success criteria: [task.206.hierarchical-story-ids-in-pipeline.md](task.206.hierarchical-story-ids-in-pipeline.md)

## Overview

Replace each local story and epic regex, and each positional shell split, with a call into
task.202's `shared/resources/doc-id.js`. Then rename the fixtures through task.203's migration
script and update the tests. The rule throughout: **a site that needs an id imports or invokes
doc-id. It never restates the grammar.**

The function names below are those the plan gives task.202 (`parse`, `format`,
`matchesEpic(stem, P, E)`, `next story --epic <dir>`). Before Phase 1, confirm them against the
merged `doc-id.js` (*plan is intent, code is evidence*). Where a name differs, use the shipped one.

## Phase-by-Phase Implementation Guide

### Phase 1: Shared code consumers

**`shared/resources/finalise-fix-and-recheck.mjs`**

- `WORK_ITEM_DOC_RE` (line ~69): build it from doc-id's exported kind regexes instead of the
  literal alternation.
- The stem match inside `isCoLocatedArtifact` (line ~122): replace it with
  `parse(basename).stem`, compared with a trailing `.`. That way `story.1.2.3.` never admits
  `story.1.2.30.` or `story.1.2.4.`. Keep the null-byte and LF/CR guards and the `..` guard as they
  are.

```js
// before
.match(/^(task\.\d+|story\.\d+\.\d+|epic\.\d+|bug\.\d+)\./);
// after
const id = docId.parse(path.basename(documentPath));
if (!id) return false;            // unparseable document → nothing is co-located
const prefix = `${id.stem}.`;     // e.g. "story.1.2.3."
```

**`shared/resources/tests/doc-links.test.mjs:331`**

- Delete `WORK_ITEM_RE` and import the exported regex or predicate.

**`shared/resources/bug-doc.js`**

- Replace `RE_STORY_BUG` with doc-id's story-id source plus `\.bug\.(\d+)\.(.+)\.md$`.
- Update the line ~49 comment: `story.8.5.3.bug.2` now reads P=8, E=5, S=3, and `story.1.2.3A.bug.1`
  is a sub-story.

**`skills/create-story/scripts/lib.js`**

- `validateStoryFilename` / `validatePlanFilename`: delegate to `parse`, and return
  `{ prd, epic, story, sub, name }`.
- `scanExistingStoryIds(entries, prd, epic)`: filter entries by
  `parse(e)?.prd === prd && parse(e)?.epic === epic`, with no constructed regex.
- `nextStoryId` and `assertUniqueStoryId` take `(prd, epic)`. The HALT message is
  `story.${prd}.${epic}.${story} already exists`.
- Keep the leading-zero refusal, enforced by doc-id's grammar.

### Phase 2: Selectors and handoff

**`skills/session-handoff/scripts/continuation.mjs`**

- `STORY_BRANCH`: `^feature\/(story\.<doc-id story id>)\.([a-z0-9][a-z0-9-]*)$`. Take the id
  source from doc-id, and pull out `prd`, `epic`, `story` and `sub` with `parse`.
- In the handoff path builder, use `prefix = id.stem` (for example `story.1.2.3`), so the file is
  `${prefix}.handoff.${k}.${slug}.md`. `nextIndex` already escapes the prefix and requires
  `\.handoff\.`, so `story.1.2.3` cannot read `story.1.2.30.handoff.*`. Add a test for exactly that.
- `findStoryDir(root, id)`: compare `parse(name)?.stem === id.stem` instead of the `want` prefix.

**`skills/qa-next/scripts/uat-status.mjs`**

- `STORY_FILE`: use `parse(basename)`, requiring `kind === "story"` and no artifact infix.
- `id = \`${prd}.${epic}.${story}${sub ?? ""}\``.
- `cfg.epicSurface[\`${prd}.${epic}\`]`.
- Sort by `(prd, epic, story)`.
- A `story.*.md` file that `parse` rejects is pushed to a `warnings` list and printed. It is not
  skipped silently.
- Template-writing message (line ~391): document `epicSurface` keys as `"P.E"`.

**`skills/develop-next/scripts/select-next.mjs`**

- Heading match: `/\bEpic\s+(\d+\.\d+)\b/i`, where the `P.E` source comes from doc-id. Key
  `epicSections` and `flows` by the `"P.E"` string.
- Legacy heading detection: `/\bEpic\s+(\d+)\b(?!\.\d)/`. Push a model **error**:
  `roadmap heading "Epic N" predates hierarchical numbering — run migrate-doc-numbering`.
- `deps: Epic P.E`: the dep token parser already yields `\d+(?:\.\d+)*`. Check that `epicActionable`
  looks up `"1.2"`. A 2-segment dep id is unambiguous because story ids now have 3 segments. Add a
  test with a task `12`, an epic `1.2` and a story `1.2.1` in one roadmap.

### Phase 3: Executable snippets and story-pipeline prose

**`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`**

Replace the Explore-subagent instruction ("extract `{epic_number}` and `{story_number}`") with a
`doc-id parse` call. Replace the Epic resolution block with:

```bash
STORY_ID_JSON=$(command node .agents/skills/develop-story/references/doc-id.js parse "$(basename "$STORY_FILE")" --json) || exit 1
PRD_NUM=$(printf '%s' "$STORY_ID_JSON" | command node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).prd))')
# …EPIC_NUM, STORY_NUM likewise; EPIC_REF from frontmatter as today
EPIC_FILE_LIST=$(command node .agents/skills/develop-story/references/doc-id.js find-epic --prd "$PRD_NUM" --epic "$EPIC_NUM" --root docs --json)
# 0 matches → HALT "epic.${PRD_NUM}.${EPIC_NUM}.* not found"; ≥2 → HALT listing them
```

Notes on this block:

- Use whatever lookup subcommand task.202 ships. If it ships none, use `matchesEpic` over a `git
  ls-files docs` listing. Either way, **no `head -1`**.
- Cross-check that the story's `epic:` stem parses to the same `(P, E)`. A mismatch is a HALT.
- Integration-branch table: change the default to `epic/{p}.{n}.{slug}`. A `branchPattern` without
  `{p}` is a HALT that names the key.
- Path: in-repo step docs reference the bundled copy, `references/doc-id.js`. The bundler rewrites
  `shared/resources/doc-id.js` in skill sources, so cite it the way the surrounding step-doc
  snippets cite their engines. Check this against an existing call in the same file.

**`shared/resources/review-pipeline-step-0a-branch-setup.md`** (review-story stanzas only;
task.205 owns review-epic)

- § 0a.2: replace the `awk -F.` fields with `doc-id parse` into `PRD_NUM`, `EPIC_NUM`, `STORY_NUM`
  and `STORY_STEM`.
- § 0a.3: `feature/${STORY_STEM}.*)`. Match on the full stem plus `.`, so epic-level globbing is
  impossible.
- Q-prompt text: `feature/${STORY_STEM}.*`.

**Skill prose**

- `skills/create-story/SKILL.md`:
  - every `story.{epicNum}.{storyNum}` becomes `story.{prdNum}.{epicNum}.{storyNum}`
  - `epic: epic.{prdNum}.{epicNum}.{epic-name}`
  - the "Epic {epicNum} Complete … Begin Epic {epicNum + 1}" step becomes "the next epic in PRD
    {prdNum}", which is read from the PRD's epics-index block (task.205), not from arithmetic
  - story number from `doc-id next story --epic <dir>`
- `skills/create-story/resources/story-template.yaml` and `skills/review-story/resources/story-template.yaml`:
  - `filename: "{{epic_directory}}/stories/story.{{prd_num}}.{{epic_num}}.{{story_num}}.{{story_title_short}}/…"`
  - `title: "[Story {{prd_num}}.{{epic_num}}.{{story_num}}] …"`
- `skills/review-story/SKILL.md`: the 0a summary and the tracker-dedup label
  `story-${PRD_NUM}.${EPIC_NUM}.${STORY_NUM}`.
- `skills/create-branch/SKILL.md`: the pattern table becomes `feature/story.<p>.<e>.<s>.<name>`. The
  sub-story section explains that `story.309.2.3A` now reads as PRD 309 / epic 2 / story 3 / sub A.
  Replace that example with `story.1.2.3A`.
- `skills/ensure-story-github-issue/SKILL.md` and `skills/sync-github-story/SKILL.md`:
  - `STORY_P`, `STORY_E` and `STORY_S` come from `doc-id parse`
  - title `[Story ${STORY_P}.${STORY_E}.${STORY_S}]`
  - milestone `Epic ${STORY_P}.${STORY_E} — …`
  - the epic lookup goes up three directories as today, but asserts that the epic's `(P, E)` matches
- `docs/reference/configuration.md`: the `branchPattern` row, the `{p}` placeholder and the refusal.

### Phase 4: Fixtures, tests, bundle

1. Resolve the fixture-parent decision first (task Notes 1). With stubs, add
   `prd.1.feature/prd.1.feature.md` and `epics/epic.1.5.example/epic.1.5.example.md`, at the paths
   the migration script expects, to each replay tree before running it.
2. `command node shared/resources/migrate-doc-numbering.mjs --root <replay>/docs --apply` for each
   tree from `git ls-files evals | grep -E '/replay/docs/' | cut -d/ -f1-5 | sort -u`. Save each log
   for the implementation report.
3. `git grep -lE 'story\.5\.1|epic\.5\.' -- 'evals/**'`, then update each `scenario.json` /
   README path, and re-run the command to zero.
4. Tests: re-run the Files Summary test-population command and update each hit. Add a case per
   "already tolerant" site (`select-next` `ID_RE`, `storyBranchModel`, `sync-jira-story`
   `normaliseStorySummary("[Story 1.2.3] x")`, `reenter-qa-after-finalise.sh` with
   `story.1.2.3.dod.1.x.md`, `pipeline-answers.js` `epic/1.2.x`).
5. `npm run bundle`, then `npm test`, `npm run eval:all`, `npm run bundle:check`,
   `npm run lint:shell`.

## Key Patterns and References

- **One definition, imported:** the `WORK_ITEM_ARTIFACT_RE` export in `finalise-fix-and-recheck.mjs`
  (task.152) is the precedent for exporting a regex and importing it in tests.
- **Executable snippets are tested by running them:** see
  `evals/shared/tests/orchestrator-directive-branch-literal.test.mjs` and the task.201 approach of
  calling a pure resolver from the fenced block.
- **`command node`**, never bare `node`, and `./node_modules/.bin/<tool>` instead of `npx`.
- **Edit `shared/resources/*` sources.** A fix applied only to `skills/*/references/*` is reverted
  by `npm run bundle`.
- **Mutation-prove every guard:** revert the site's change and name the test that goes red.

## Testing Approach

| Site | Test file | Key cases |
|---|---|---|
| `isCoLocatedArtifact` | `shared/resources/tests/finalise-fix-and-recheck.test.mjs` | `story.1.2.3` vs `story.1.2.30.*`, `story.1.2.4.*`, `story.1.2.3A.*` |
| `RE_STORY_BUG` | `evals/shared/tests/finalise-bug-mode.test.mjs` / bug-doc tests | `story.1.2.3A.bug.1.x.md` |
| create-story lib | `skills/create-story/tests/create-story.test.js` | `nextStoryId` with neighbours in epic `2.2`; `assertUniqueStoryId` HALT |
| continuation | `skills/session-handoff/tests/continuation.test.js` | branch `feature/story.1.2.3.x`; no resolution to `story.1.2.30` |
| uat-status | `evals/qa-next/unit/uat-status.test.mjs` | id `1.2.3`; `epicSurface["1.2"]`; unparseable file warned |
| select-next | `evals/develop-next/unit/select-next.test.mjs` | `## Epic 1.2`; `deps: Epic 1.2`; legacy `## Epic 2` error; task 12 / epic 1.2 / story 1.2.1 coexist |
| Step 0 epic resolution | new `evals/shared/tests/step-0-epic-resolution.test.mjs` (in the `evals/shared/tests/*.test.mjs` glob) | two PRDs each holding `epic.*.2.*`; ambiguous → HALT; zero → HALT |
| Step 0a review-story | same file or `evals/develop-story/protocol/*` | `story.1.2.3.x` → `P=1 E=2 S=3`; auto-skip glob does not match `feature/story.1.2.4.*` |
