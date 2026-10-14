# Hierarchical document numbering: PRD → epic → story

## Context

You want PRDs numbered (`prd.1.home-page.md`), with the PRD number carried down the tree:
`epic.1.7.hero-widget.md`, `story.1.7.3.hero-animation.md`. Today none of this exists:

- PRDs are slug-only (`prd.{feature}.md`). There is no PRD registry, and nothing checks for a number.
  The "epic skill check" you remembered is `shared/resources/generate-prd-epic-index.mjs`. It writes
  an epic table *into* a PRD. It does not number the PRD.
- Epics are `epic.{E}.{name}`, and E comes from the global epic registry
  (`docs/development/epic-registry.md`). Stories are `story.{E}.{S}.{name}`.
- **There is no shared identifier parser.** About 10 code files and about 6 executable shell
  snippets in Markdown each carry their own regex. Many hard-code "story = 2 numbers, epic = 1".
  This is the real cost, and it is why "enforce in practice" needs one engine, not a prose rule.

**Decisions taken (your answers):**

1. **Epic numbers count within their PRD.** `epic.1.1`, `epic.1.2`, `epic.2.1`. The story number
   counts within its epic: `story.{P}.{E}.{S}`. The global epic registry
   (`docs/development/epic-registry.md`) is retired. E is allocated from the epics already under the
   PRD's directory, the same way story numbers are allocated today. **E alone is no longer unique**,
   so every lookup has to key on `(P, E)`.
2. **Every epic needs a PRD.** The `prd_source: brownfield-enhancement` sentinel is removed and
   `create-epic` halts when it finds no parent PRD.
3. **A migration script renames existing docs, and parsers then accept only the new shape.**

**Deliverable:** six `/create-task` docs, one per shippable unit, which you take on one at a time.
Each is summarised below. No skill is edited in this step.

## Target scheme

| Doc | Path | Frontmatter |
|---|---|---|
| PRD | `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md` | `prd_number: P` |
| PRD registry | `${PRD_ROOT}/prd-registry.md` (same shape as the epic/task registries: **Next Available PRD Number** plus a table) | — |
| Epic | `…/prd.{P}.{feature}/epics/epic.{P}.{E}.{name}/epic.{P}.{E}.{name}.md` | `prd_number`, `epic_number`, `prd_source` (now required) |
| Story | `…/epic.{P}.{E}.{name}/stories/story.{P}.{E}.{S}.{name}/…` | `prd_number`, `epic` = epic dir stem |
| Story artifacts | `story.{P}.{E}.{S}.qa.{n}.{name}.md` and the rest (the infix rule is unchanged) | — |
| Sub-story | `story.{P}.{E}.{S}{A}` (letter suffix kept). The parser defines it, so there is no clash with the 3-number id | — |
| Branches | `feature/story.{P}.{E}.{S}.{slug}`, `epic/{P}.{E}.{slug}` | — |
| Epic list | The PRD's generated `<!-- epics-index -->` block (from `generate-prd-epic-index.mjs`) is the per-PRD view. The global epic registry is retired; T2 converts it into a pointer to the PRD registry | — |

## Tasks

### T1 — Shared doc-id engine and PRD registry (foundation)

- New `shared/resources/doc-id.js`, pure, in the same style as `tracker-comment.js` / `card-preflight.js`:
  - `parse(stem)` → `{kind, prd, epic, story, sub, artifact, n, slug}`
  - `format(...)`
  - `matchesEpic(stem, P, E)`, which fixes the `epic.${N}.*` glob over-match and makes the PRD number mandatory in every epic lookup
  - `next epic --prd P`: the highest E under that PRD's `epics/` plus 1. `next story --epic <dir>` works the same way
  - the canonical regexes, to replace `WORK_ITEM_DOC_RE` in `finalise-fix-and-recheck.mjs:69`
- A CLI on the same engine: `next prd` (reads the registry), `check <path>` and `check --corpus`.
  - `check` verifies there is no duplicate `(P, E)` or `(P, E, S)`. Two branches can each create the next epic in the same PRD, just as stories can collide today, and this is the check that catches it. It also verifies the filename shape, that the directory name equals the stem, that frontmatter numbers match the filename, that the parent PRD/epic exists with the same numbers, and that a registry row exists.
  - Same `--json` `reason` and exit-code contract as the peer engines.
- Add a `prd` kind to `parseRegistry` (`skills/develop-next/scripts/select-next.mjs:1037`) rather than writing a second parser.
- Standards: new `docs/standards/prd-registry.md`, and update `file-naming.md`, `prd-documents.md`, `epic-documents.md` and `story-documents.md`.
- Tests: unit tests, plus mutation proof for each guard.

### T2 — Migration script and this repo's migration

- `shared/resources/migrate-doc-numbering.mjs`, which is dry-run by default:
  - assigns PRD numbers and writes the registry
  - `git mv`s the PRD, epic and story directories and files, artifacts included
  - rewrites frontmatter (`prd_number`, `epic`, `prd_source`) and relative links
  - renumbers epics per PRD in their current global order, and records old → new in a mapping report
  - retires the global epic registry by replacing it with a pointer to the PRD registry
  - reports PRD-less epics as blockers rather than guessing a parent
- Its `--check` mode is what `review-prd` calls.
- Run it on this repo: `docs/prd/onboarding/` → `docs/prd/onboarding/prd.1.onboarding/…`, with epics 1–4 and their stories. This also fixes the existing dir/stem mismatch that makes `generate-prd-epic-index.mjs` skip this PRD.
- Tracker titles (`[Story 1.1]`) are left alone. The migration renames files and does not touch Jira or GitHub.

### T3 — PRD skills

- `create-prd`: brownfield and greenfield both allocate the number through `doc-id.js next prd`, add a registry row and write `prd_number`, all in the same commit. They create the registry if it is missing, then run `check`, which blocks.
- `new-product-prd`, `shard-prd`, `prd-template` and `brownfield-prd-template`: drop the `docs/prd.md` default in favour of the numbered path.
- `review-prd`: new **Critical** checks, each with an offer to run the migration (`--check`, then apply):
  - the registry is missing
  - the PRD is unnumbered
  - the dir/stem/frontmatter disagree
  - an epic or story under the PRD is unnumbered or carries the wrong PRD number
- `review-prd`: fix the report-name drift (`prd.review.{N}` vs the standard's `prd.{name}.review.{n}`).

### T4 — Epic skills

- `create-epic` and `create-epics-from-shards`:
  - a parent PRD is required (halt if none)
  - read P from the PRD's `prd_number` and get E from `doc-id next epic --prd P`
  - name `epic.{P}.{E}`
  - regenerate the PRD's epics-index block (this step already exists)
- `epic-registry-manager`: retire it, or reduce it to a thin wrapper over `doc-id next epic`. **Recommended: retire it.** The PRD's epics-index is the list now.
- `review-epic`, `edit-epic`: switch to `(P, E)` lookups. `review-epic` currently runs `find epic.${INPUT}.*`, so it must accept `P.E` input.
- `generate-prd-epic-index.mjs`:
  - support the domain level
  - stop `parseInt`-ing the epic number
  - match `[Epic P.E]` titles
- `sync-jira-epic` and `jira-create-epic`: fix the summary regexes and `findChildStories`.
- `ensure-epic-github-issue`: update the milestone and title keys.
- `review-epic`: Critical finding for a number that does not match the parent PRD.

### T5 — Story and pipeline code (largest)

Each site below switches from its own regex to `doc-id.js`:

- `create-story`: its `SKILL.md` prose and `scripts/lib.js`. `nextStoryId` is wired in, so story numbers become deterministic.
- `story-template.yaml`, plus its `review-story` copy.
- `review-pipeline-step-0a-branch-setup.md` (the awk field split).
- `develop-pipeline-step-0-resolve-and-prepare.md` (the `grep | head -1` that returns P).
- `create-branch`.
- `session-handoff/scripts/continuation.mjs`.
- `qa-next/scripts/uat-status.mjs`.
- `sync-jira-story`.
- `ensure-story-github-issue`.
- `select-next.mjs`: roadmap `Epic N` headings become `Epic P.E`, including the `deps: Epic N` references.
- `create-story`: its "epic done → offer Epic {epicNum + 1}" step becomes "the next epic in the same PRD".
- `finalise-fix-and-recheck.mjs`, and `doc-links.test.mjs`, which imports the regex instead of copying it.

Eval and test fixtures are renamed: about 61 replay files under `epic.5.example` and 31 test files. Fixtures go through the migration script, so they do not become a second definition.

### T6 — Enforcement backstop and doc sweep

- A corpus test, in the style of `task-registry-drift.test.mjs`, runs `doc-id check --corpus` over `docs/prd/**`. It fails on any unnumbered, mismatched or unregistered doc.
- A test fails on a hand-rolled `story\.\(\\d+\)` / `epic\.\(\\d+\)` regex outside `doc-id.js`. This is the same chokepoint idea as `mutation-call-site-coverage.test.js`.
- Doc sweep: the 32 `SKILL.md` and 12 shared `.md` files with `story.{epic}.{story}` / `epic.{N}` placeholders, `AGENTS.md` § File Naming, the runbooks and the catalog. Then run `npm run bundle` and `generate-catalog`.

**Order:** T1 → T2 → T3 and T4 (these two are independent) → T5 → T6. Between T2 and T5 only accepted docs carry the new names, so no live pipeline run is broken.

## How "enforced in practice" holds

1. **The number is allocated by code.** `doc-id next prd|epic|story` replaces the "highest + 1"
   prose. Today that prose disagrees with the epic registry's own "Next Available" counter.
2. **Authoring blocks.** `create-*` runs `check` on what it just wrote. This is not advisory like
   card-preflight, because the skill picked the name itself, so a mismatch is the skill's own bug.
3. **Review blocks.** `review-prd`, `review-epic` and `review-story` raise Critical findings and
   offer the migration.
4. **CI blocks.** The corpus test and the no-hand-rolled-regex test. A prose rule with no
   chokepoint drifts, as the bare `gh issue comment` history showed.

## Verification

- `npm test` and `npm run eval:all` pass, and `npm run bundle:check` is clean. Before trusting a
  local green, move the gitignored `.agents/skills` symlink aside.
- Mutation-prove each guard: rename one onboarding story back to `story.1.1.…` and confirm the
  corpus test goes red. Strip `prd_number` from the PRD and confirm `review-prd` reports Critical.
- Run the migration dry-run twice on this repo. The second run must be a no-op.
- Smoke test in a scratch consumer: `/create-prd` → `/create-epic` → `/create-story`. Confirm it
  produces `prd.1.x`, `epic.1.N.y` and `story.1.N.1.z`, and that `/develop-story` resolves the branch.
