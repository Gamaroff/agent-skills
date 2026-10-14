---
id: task.205.plan
title: "Implementation Plan: PRD-scoped epic numbering"
type: plan
task-ref: task.205.prd-scoped-epic-numbering.md
---

# Implementation Plan: PRD-scoped epic numbering

> Requirements and success criteria: [task.205.prd-scoped-epic-numbering.md](task.205.prd-scoped-epic-numbering.md)

## Overview

Every epic id site calls task.202's `doc-id.js` instead of carrying its own regex. Two small helpers are
added to that engine so the title-prefix logic exists once. The GitHub path gains an in-place milestone
rename so existing boards do not split. The registry and its skill are deleted last, behind a guard test.

Throughout: `command node`, never bare `node` (nvm shell function). Edit `shared/resources/`, then
`npm run bundle`. Never edit a `skills/*/references/` copy.

## Phase-by-Phase Implementation Guide

### Phase 0: Preconditions

```bash
git log --oneline develop -- shared/resources/doc-id.js | head -1   # must exist (task.202)
command node shared/resources/doc-id.js check --corpus --json       # must be reason "ok" (task.203 migrated this repo)
```

If either fails, HALT: this task does not build the engine or migrate documents.

Re-run the population greps and diff them against the task's §3 table:

```bash
git grep -n "brownfield-enhancement" -- ':!skills/*/references/*' ':!docs/tasks/*' ':!docs/bugs/*' ':!CHANGELOG.md'
git grep -n "epic-registry" -- 'skills/*/SKILL.md' 'shared/resources/*' 'scripts/*' 'tests/*' 'skills/create-skill/scripts/*'
git grep -n -E "\\\\\[Epic\\\\s\+\(\\\\d\+\)|epic\.\{N\}|Epic \\$\{EPIC_N\}" -- skills shared/resources ':!skills/*/references/*'
```

### Phase 1: Shared id helpers and the index generator

**`shared/resources/doc-id.js`**: add beside task.202's API (match its export style):

```js
// Drop a leading "[Epic 3] ", "[Epic 1.3] ", "Epic 3: " or "Epic 1.3: " (case-insensitive).
// Legacy one-number ids are accepted on input so an old title converges on the next sync.
function stripIdPrefix(kind, title) {
  const word = { epic: "Epic", story: "Story" }[kind];
  const id = String.raw`\d+(?:\.\d+)*`;
  return String(title)
    .replace(new RegExp(String.raw`^\s*\[${word}\s+${id}\]\s*`, "i"), "")
    .replace(new RegExp(String.raw`^\s*${word}\s+${id}\s*:\s*`, "i"), "")
    .trim();
}
// "1.3" for an epic, "1.3.2" for a story: the numeric segments of a parsed id, dot-joined.
function idLabel(p) { return [p.prd, p.epic, p.story].filter((n) => n != null).join("."); }
```

**`shared/resources/generate-prd-epic-index.mjs`** — the body of `main()` (`:194-266`):

- Replace `for (const prdDir of listDirs(PRDS_DIR))` with a discovery that yields every directory at depth 1 or 2 whose basename parses as kind `prd`:
  ```js
  const prdDirs = [];
  for (const d1 of listDirs(PRDS_DIR)) {
    if (docId.parse(basename(d1))?.kind === "prd") { prdDirs.push(d1); continue; }
    for (const d2 of listDirs(d1)) if (docId.parse(basename(d2))?.kind === "prd") prdDirs.push(d2);
  }
  ```
  The generator is ESM and `doc-id.js` is task.202's module. Import it the way task.202 exports it, and keep the
  `./doc-id.js` relative path, which the bundler rewrites. **The generator also ships to consumers' `scripts/`**
  (`setup-consumer.sh:1570-1580`). Vendor `doc-id.js` beside it in the same block, or the vendored copy
  fails to import. Add that `cp` line in Phase 6's `setup-consumer.sh` edit and a test that the vendored pair runs.
- Per epic: `const id = docId.parse(d)`. Skip (and push to `skipped`) when `id?.kind !== "epic"`,
  when `id.prd` ≠ the PRD's number, or when frontmatter `prd_number`/`epic_number` ≠ `id.prd`/`id.epic`.
- `number: id.epic`, `label: docId.idLabel(id)`. Sort `(a, b) => a.number - b.number`. `buildBlock` prints `e.label`.
- `cleanTitle`: `docId.stripIdPrefix("epic", raw).replace(/\|/g, "\\|")`.
- Keep the `() => block` replacement function (`:228-233`) and the `process.exitCode` idiom untouched.

### Phase 2: Jira epic paths

`skills/sync-jira-epic/scripts/sync-jira-epic.js`:

```js
const docId = require("../references/doc-id.js");
function normaliseEpicSummary(summary, { prd, epic } = {}) {
  const bare = docId.stripIdPrefix("epic", summary);
  return prd != null && epic != null ? `[Epic ${prd}.${epic}] ${bare}` : bare;
}
// :834
summary = normaliseEpicSummary(summary, { prd: frontmatter.prd_number, epic: frontmatter.epic_number });
```

When either number is missing, the summary comes out **bare** rather than with a guessed id, and
`review-epic` is the gate for that. Export `normaliseEpicSummary` unchanged by name (the tests import it via `lib`).

`findChildStories` (`:305-326`): derive the epic's `(P, E)` from `docId.parse(basename(dirname(filePath)))`,
then `.map(s => ({...s, id: docId.parse(s.dir)}))`, `.filter(s => s.id?.kind === "story" && s.id.prd === P && s.id.epic === E)`,
sort by `s.id.story`, label `labelForChildStory(s.card, docId.idLabel(s.id))`.
`labelForChildStory`'s strip regex (`:340`) becomes `docId.stripIdPrefix("story", title)`.

`skills/jira-epic-creator/scripts/jira-create-epic.js:380-392`: delete the copy and require the same helper.
**One definition**: put `normaliseEpicSummary` itself into `doc-id.js` as `epicSummary(summary, {prd, epic})`
and have both scripts call it. Two scripts with a three-line wrapper each is the drift this task removes.
Update `:726`.

Both `SKILL.md` files gain a bare `references/doc-id.js` mention (a dependency, so it bundles). Run
`npm run bundle:skill skills/sync-jira-epic` and `skills/jira-epic-creator`.

### Phase 3: Epic authoring skills and the template

`skills/create-epic/SKILL.md`:

- `:4`: `invokes: [mermaid-architect]`.
- `:47`: drop the registry allowed-write.
- **Epic Numbering** (`:68-72`) and **File Naming Convention** (`:74-98`) rewritten:
  ```bash
  P=$(command node references/doc-id.js parse "$(basename "$(dirname "$PRD_SOURCE_PATH")")" --json | jq -r .prd)
  E=$(command node references/doc-id.js next epic --prd "$P" --prd-root "$PRD_ROOT" --json | jq -r .next)
  ```
  Use the CLI's actual flag and field names from task.202. These are the plan's names. Examples become
  `epic.1.1.feature-notifications`, `epic.1.2.payment-integration`. Delete the decimal line (`:90`).
- **Discover Parent PRD** (`:101-111`): step 1 becomes the canonical `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md`,
  step 2 is the glob `prd.*.md` at depth ≤ 2 under the domain, and step 3 **halts**:
  > ❌ No parent PRD found under `${PRD_ROOT}/{domain}/`. Every epic is numbered within a PRD (`epic.{P}.{E}`). Run `/create-prd` first, then re-run `/create-epic`.
- `:145`, `:174`: drop the "omit when sentinel" sentences; the Source PRD line is always present.
- Epic Structure frontmatter: add `prd_number: P` above `epic_number: E`; `prd_source` comment "repo-relative path to the parent PRD (required)"; H1 `# [Epic P.E] …`; Stories Overview first row `P.E.1`.
- Post-Creation Validation: add, before the validator bullet list,
  ```bash
  command node references/doc-id.js check "$EPIC_FILE" --json   # reason must be "ok"; anything else: HALT and print it
  ```
- `:385-388`: "After the epic file is written" (no registry clause); delete the skip sentence.
- Related Skills: drop `epic-registry-manager`.

`skills/create-epics-from-shards/SKILL.md`: Step 1 adds "read `P` from the PRD directory stem
(`prd.{P}.{feature}`); halt if it does not parse". Step 3 frontmatter adds `prd_number`. `epic_number`
comment: "E within this PRD, from Step 4". `dependencies: ["epic.P.1", "epic.P.2"]`. Step 4 is
rewritten: one `next epic` call gives `E0`; epics get `E0…E0+n-1`; layout
`epics/epic.P.E.name/epic.P.E.name.md`. The flat-file tree example is replaced. Step 6 drops "and the
epic-registry update is committed". Step 7 adds the `doc-id check` per epic.

`docs/templates/epic-template.md`: replace the banner (`:1-13`) with
"Numbered within its parent PRD: `epic.{P}.{E}`. `create-epic` allocates `E` via `doc-id.js`; never pick one by hand."
At `:28`: `prd_source: "{{PRD_SOURCE_PATH}}" # repo-relative path to the parent PRD (required)`, plus `prd_number`.
At `:51`: drop the omit comment. At `:673`: replace the registry reference link with the PRD registry
standard (task.202's `docs/standards/prd-registry.md`). Then
`cp docs/templates/epic-template.md skills/documentation-standards-validator/references/epic-template.md`.
The `epic-registry-manager` copy is deleted in Phase 6. Until then, copy it too, so the byte-lock test stays green per phase.

### Phase 4: Review and edit skills

`skills/review-epic/SKILL.md` Step 1 input table and resolver (`:66-95`):

```bash
case "$INPUT" in
  */*|*.md) DOC_FILE="$INPUT" ;;
  [0-9]*.[0-9]*)   # P.E
    DOC_FILE=$(command node references/doc-id.js resolve epic "$INPUT" --prd-root "$PRD_ROOT" --json | jq -r .path) ;;
  [0-9]*) echo "❌ Epic ids are P.E (e.g. 1.3) — a bare number is ambiguous across PRDs"; exit 1 ;;
  *) …name search unchanged… ;;
esac
```

If task.202 ships no `resolve` command, use `find "$PRD_ROOT" -type f -name "epic.${INPUT}.*.md"` filtered
with `doc-id.matchesEpic`. Do **not** reintroduce a raw glob without the filter.

- `:174`: search pattern `${PRD_ROOT}/**/epics/epic.{P}.{E}.*/epic.{P}.{E}.*.md`.
- `:179`: replace the registry load with "the parent PRD (`prd_source`) and its epics-index block".
- Step 3 (`:288-305`) → **Epic Corpus Conflict Detection**: actions 1 and 4 become "enumerate every epic
  file under `${PRD_ROOT}` (`doc-id check --corpus --json` lists them with ids)". The duplicate, overlap and
  dependency checks are kept. "Missing registry entry" and "Stale registry entry" are deleted, and
  "Dependency mismatch" reads "references an `epic.P.E` that does not exist".
- `:224`: title regex `^\s*Epic\s+\d+(\.\d+)?\s*:`; canonical form `[Epic P.E] Name`.
- `:226-227`: delete both "unless the value is the standalone sentinel" clauses.
- New Critical bullet: "**Numbering** (Critical): `doc-id check <epic file>` must return `ok`. Print its
  `reason` verbatim (directory/stem mismatch, frontmatter disagrees with the filename, `prd_number` ≠ the
  parent PRD's, duplicate `(P, E)`)."
- `:844`: drop the registry row from the references table.

`skills/edit-epic/SKILL.md`: `:44` and `:568-571` delete the `epic-registry-manager` entries. `:62`, `:80`,
`:178` pattern `epic.{P}.{E}.{name}.md`. `:404` drops the registry reminder. `:642` becomes "Epic numbers
count within their PRD. Renumber with `doc-id next epic --prd P`. Moving an epic to another PRD changes
`P` for it and every story: use `migrate-doc-numbering.mjs` (task.203), never a hand rename."

`skills/pm-coordinator/SKILL.md:148-152`: replace the four bullets with "Epics are numbered within their
PRD (`epic.{P}.{E}`), so the PRD's 'Epic 2' is the file `epic.{P}.2`. `create-epic` allocates the number."

### Phase 5: GitHub epic paths and task milestone lookup

`shared/resources/tracker-issue.js`: parse `--rename-from <t>` (reject it on any kind but `milestone`, exit 2).
In the milestone arm, list the milestones (the existing lookup), then:

| `--title` exists | `--rename-from` exists | Action | `reason` |
| --- | --- | --- | --- |
| yes | — | none | `already` |
| no | yes | `PATCH repos/{repo}/milestones/{n}` `title=<new>` | `ok` |
| no | no | create (today's path) | `ok` |

The deferred-mutation record carries both titles. Add the flag to the usage text (`:175`) and to
`shared/resources/tracker-issue-cli.md`.

`skills/ensure-epic-github-issue/SKILL.md`: step 3 (`:32`) becomes
`EPIC_ID=$(command node references/doc-id.js parse "$(basename "$EPIC_FILE_PATH" .md)" --json | jq -r '"\(.prd).\(.epic)"')`.
Step 4 strips both id forms. `:53` `MILESTONE_TITLE="Epic ${EPIC_ID} — ${EPIC_TITLE}"`, `:132` title
`[Epic ${EPIC_ID}]`, and `:31`, `:65` drop the sentinel. The `PRD_LINE` is unconditional when
`prd_source` is set.

`skills/sync-github-epic/SKILL.md` `:80-99`: same id and title changes. The update path (`:150-195`) reads
the issue's current `milestone.title` from the `gh issue view` it already makes, and calls:

```bash
node references/tracker-issue.js --kind milestone --title "${MILESTONE_TITLE}" \
  ${CURRENT_MILESTONE:+--rename-from "${CURRENT_MILESTONE}"} --quiet
```

The milestone is then *attached*, not changed.

`skills/ensure-task-github-issue/SKILL.md:55` step 2:
> Else if `epic` is set (`P.E`, or an epic directory stem) → resolve it with `doc-id.js` to the epic file, read its `title`, and use `"Epic {P}.{E} — {title}"`. If it does not resolve, fall through to step 3.

`sync-github-task/SKILL.md:14`, `:79`, `:250`, `review-task/SKILL.md:698` and `create-task/SKILL.md:666`
replace "epic-registry lookup" with "epic lookup (see `ensure-task-github-issue` Step T3)".

### Phase 6: Retire the registry and the skill; close-out

```bash
git rm -r skills/epic-registry-manager
```

- `tests/skill-doc-coverage.test.js:96`, `tests/skill-protocol.test.js:331`, `:489`: remove the entry. The
  byte-lock test keeps one copy, so update its comment (`:478-482`).
- `skills/create-skill/scripts/generate_catalog.py:64`: remove it from the list.
- `command node scripts/generate-skill-dependencies.mjs`, then `npm run generate-catalog`.
- `scripts/setup-consumer.sh:705-710`: delete the registry `touch` block and update `:12`. In the vendor
  block (`:1570-1580`), also copy `doc-id.js` beside the generator (see Phase 1).
- `docs/standards/epic-registry.md` → a short "Retired 2026-10" page: why it was retired, and where to look instead (the PRD registry and the epics-index).
- New `tests/epic-numbering-retirement.test.js` (task §8 "Guard test"):
  ```js
  const LITERALS = ["brownfield-enhancement", "epic-registry.md"];
  const ALLOW = new Map([ // file → owning task; each must still contain a literal, or the test fails
    ["skills/create-prd/SKILL.md", "task.204"],
    ["skills/review-prd/SKILL.md", "task.204"],
    ["shared/resources/open-knowledge-format.md", "task.207"],
  ]);
  // scan skills/*/SKILL.md, shared/resources/*.{md,js,mjs,sh}, scripts/*.sh; assert scanned >= 100
  ```
- CHANGELOG under `## [Unreleased]`: the six breaking changes plus the consumer steps (delete
  `.agents/skills/epic-registry-manager/`, `setup-consumer.sh --update`, regenerate the epic index once).

## Key Patterns and References

- **Engine + CLI + `--json` `reason`**: follow `tracker-comment.js` / `card-preflight.js`. `doc-id.js` is task.202's.
- **Generated copies**: `npm run bundle`. `bundle:check` reports an `UNREACHED` copy once
  `epic-registry-manager` is gone. That is expected for its deleted directory only.
- **The vendored-generator header** (`generate-prd-epic-index.mjs:5-14`) explains why consumer copies are
  overwritten. Keep it.
- **Patch files with split/join and assert the split count**, never `String.replace` with a replacement string (`$'` hazard).
- `tracker-issue.js` exit codes: 0 success family, 1 guard, 2 usage.

## Testing Approach

| Criterion | Test |
| --- | --- |
| Generator domain level, `P.E`, numeric sort, mismatch skip | `shared/resources/tests/generate-prd-epic-index.test.mjs` (new cases beside the 12 existing) |
| One normaliser, both scripts | `skills/sync-jira-epic/tests/sync-jira-epic.test.js:763+` updated; a new `skills/jira-epic-creator/tests/epic-summary.test.js` asserts both scripts resolve to the same function |
| `findChildStories` | `sync-jira-epic.test.js`: a fixture tree with `story.1.3.2`, `story.1.3.10`, stray `story.1.4.1` |
| `--rename-from` | `shared/resources/tests/tracker-issue.test.mjs`, with a fake `gh` per the existing fixtures |
| Vendored generator runs | a `setup-consumer` test, or a test that copies the generator plus `doc-id.js` into a temp `scripts/` and runs `--check` |
| No registry reader, no sentinel | `tests/epic-numbering-retirement.test.js` |
| Skill instructions | `tests/skill-protocol.test.js`: `create-epic` contains the halt message and the `doc-id.js check` call, and not `brownfield-enhancement` |

Mutation proof: revert each production change once and see its test go red. Record the four
reverts in the implementation report.
