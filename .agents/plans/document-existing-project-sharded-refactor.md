# Plan: Refactor `document-existing-project` to Produce Sharded `docs/architecture/` Output

## Context

The skill `skills/document-existing-project/SKILL.md` currently writes a single monolithic file at `docs/brownfield-architecture.md`. The repo's pipeline (`develop`, `develop-story`, `develop-task`, `create-story`, `review-story`, `qa-*`, `finalise`) does not consume that path — it consumes the **sharded** layout defined in `docs/standards/architecture-docs.md`:

```
docs/architecture/
├── index.md
└── concepts/
    ├── coding-standards.md      # always loaded via devLoadAlwaysFiles
    ├── tech-stack.md            # always loaded
    └── source-tree.md           # always loaded
```

Today every brownfield run needs a follow-up `/shard-doc` invocation plus manual carving of the `concepts/` files, which makes the producer skill effectively useless for the pipeline it's supposed to feed. This refactor closes the gap: `document-existing-project` will write directly into `docs/architecture/` in the same shape consumer skills expect.

User decisions captured up front (drive plan content):

1. **Sister skill** `skills/document-project/` is deprecated to a thin stub that defers to `document-existing-project`.
2. **Strict sharded only.** No monolith fallback. `skills-config.yaml` may set `architectureShardedLocation`, but `architectureSharded` is treated as effectively `true`.
3. **Per-file existing-target prompt.** For each target shard that already exists on disk, show a diff vs the new content and ask: overwrite / merge / skip.
4. **Cross-link sweep** happens in the same plan — checklists and runbooks updated to point at `docs/architecture/index.md`.

## Approach

### 1. Replace the monolithic template with a sharded generation contract

Edit `skills/document-existing-project/SKILL.md`:

- **Lines 138–325 (Document Structure / template)** — replace the single `markdown` block with **eight per-shard mini-templates**, each clearly tagged with its destination path. Each mini-template uses the same brownfield/REALITY tone already in the skill.
- **Lines 327–345 (Document Delivery)** — replace IDE/Web-UI monolith instructions with a step-by-step writer protocol:
  1. Read `skills-config.yaml`; resolve `{arch}` = `architecture.architectureShardedLocation` (default `docs/architecture`).
  2. Verify required path exists or create it (`{arch}/`, `{arch}/concepts/`).
  3. For each shard the analysis produced, compute target path. If file already exists, **show a unified diff between the proposed new content and the existing file**, then ask `[overwrite / merge / skip]`. On `merge`, present a merged candidate with sections clearly attributed and re-prompt to confirm before writing.
  4. After all shards written, regenerate `{arch}/index.md` to list every shard present in the directory.
  5. Print a summary to the user: written, skipped, merged.
- **Success Criteria section (starting line 358)** — rewrite. New criteria:
  - `{arch}/index.md` exists and links every shard.
  - `{arch}/concepts/coding-standards.md`, `{arch}/concepts/tech-stack.md`, `{arch}/concepts/source-tree.md` all exist (required for `devLoadAlwaysFiles`).
  - Each shard reflects reality, captures tech debt where relevant, references actual files instead of duplicating them.
  - No `docs/brownfield-architecture.md` written. (Hard rule — skill must not produce a monolith.)

### 2. Add an explicit Coding Standards elicitation step

Today's template has no coding-standards section — analysis lives in lines 128–134 ("Map the Reality" / "ACTUAL patterns used") but nothing writes it out. Add a new sub-step under section 2 ("Deep Codebase Analysis") that explicitly produces the content for `concepts/coding-standards.md`: language idioms, naming, formatting/lint config, file organisation, do-not-do list. Elicit if unclear from code.

### 3. Define the sharded layout shipped by the skill

| Target file (under `{arch}/`) | Required? | Sources from current template |
|---|---|---|
| `index.md` | ✅ required | New — generated from shard discovery (see §1, step 4) |
| `concepts/coding-standards.md` | ✅ required (always-loaded) | New (see §2); derived from "Code Patterns" exploration |
| `concepts/tech-stack.md` | ✅ required (always-loaded) | "High Level Architecture" → "Actual Tech Stack" table + "Repository Structure Reality Check" (lines 177–196) |
| `concepts/source-tree.md` | ✅ required (always-loaded) | "Source Tree and Module Organization" (lines 198–218) |
| `quick-reference.md` | optional | "Quick Reference — Key Files and Entry Points" (lines 162–175) |
| `data-models.md` | optional | "Data Models and APIs" (lines 220–232) |
| `technical-debt.md` | optional | "Technical Debt and Known Issues" + "Workarounds and Gotchas" (lines 234–246) |
| `integrations.md` | optional | "Integration Points and External Dependencies" (lines 248–262) |
| `deployment.md` | optional | "Development and Deployment" (lines 264–276) |
| `testing.md` | optional | "Testing Reality" (lines 278–291) |
| `impact-analysis.md` | conditional (PRD only) | "If Enhancement PRD Provided — Impact Analysis" (lines 293–310) |
| `appendix.md` | optional | "Appendix — Useful Commands and Scripts" (lines 312–325) |

`index.md` must follow the format already established at `docs/examples/architecture/index.md`: required shards section, optional shards section, See also.

### 4. Deprecate `skills/document-project/` to a thin stub

The sister skill duplicates `document-existing-project` and would otherwise diverge. Replace `skills/document-project/SKILL.md` body with a short stub:

- Keep `name: document-project` frontmatter so the activation graph still resolves the legacy slug.
- Body: one paragraph stating "This skill is deprecated. Use `document-existing-project` instead — same brownfield analysis, sharded output under `docs/architecture/`."
- Link to `skills/document-existing-project/SKILL.md` and `docs/standards/architecture-docs.md`.
- No workflow content. Future call should immediately hand off.

Delete the bundled `document-project.zip` — gitignored anyway; not regenerated for a deprecated skill.

### 5. Cross-link sweep

Update the four files that still point at `brownfield-architecture.md`:

- `skills/po/resources/po-master-checklist.md:16,35` — change `brownfield-architecture.md` → `docs/architecture/index.md`.
- `skills/execute-checklist/resources/po-master-checklist.md:16,35` — same change. (Verify these two files are not bundled copies — if they are, edit the source under `shared/resources/` instead and run `npm run bundle`.)
- `docs/runbooks/document-existing-project.md` — Step 3 currently says "Commit the doc to docs/architecture/ → location per skills-config.yaml". Update to describe the sharded tree the skill produces, with an inline tree snippet.
- `docs/reference/troubleshooting.md`, `docs/reference/faq.md` — quick scan for stray mentions; update if present.

### 6. Regenerate skill catalog

Run `npm run generate-catalog` so `docs/reference/skill-catalog.md` reflects the new descriptions for both `document-existing-project` (slightly updated to mention sharded output) and the deprecated `document-project`.

## Critical Files

**To edit:**
- `skills/document-existing-project/SKILL.md` — primary refactor target.
- `skills/document-project/SKILL.md` — replace with deprecation stub.
- `skills/po/resources/po-master-checklist.md` — cross-link update.
- `skills/execute-checklist/resources/po-master-checklist.md` — cross-link update.
- `docs/runbooks/document-existing-project.md` — describe sharded output in Step 3.
- `docs/reference/troubleshooting.md`, `docs/reference/faq.md` — if they reference the monolith.
- `docs/reference/skill-catalog.md` — regenerated by script, not hand-edited.

**To delete:**
- `skills/document-project/document-project.zip` — gitignored build artefact for a deprecated skill.

**To reference (read-only, anchor the contract):**
- `docs/standards/architecture-docs.md` — the spec the refactor must satisfy.
- `docs/examples/architecture/index.md` and `docs/examples/architecture/concepts/*.md` — the layout shape the skill must produce.
- `docs/architecture/` (this repo's own sharded docs) — concrete example of the target shape.

## Reuse

- **Config resolution pattern:** match how `create-story`, `review-story`, `create-parallel-stories` resolve `architecture.architectureShardedLocation` (default `docs/architecture`). Same default, same lookup order — no new pattern.
- **Diff-and-prompt UX:** `skills/edit-story/` and `skills/edit-epic/` already implement "show diff, prompt before write" for existing-file edits. The refactor should mirror that flow in prose (the skill is markdown-only — no shared script to import — but the instruction shape and prompt wording should match for consistency).
- **Index-file shape:** copy the structure of `docs/examples/architecture/index.md` verbatim.
- **Status frontmatter:** every new shard gets `---\ntitle: ...\nstatus: draft\n---` per `shared/resources/document-status-lifecycle.md`.
- **`/shard-doc`:** not invoked. The point of this refactor is **direct sharded generation**, not post-hoc splitting. `/shard-doc` remains available for users who already have a monolithic `docs/architecture.md` from older runs.

## Verification

1. **Skill structural validation** — run `npm run validate -- skills/document-existing-project/` and `npm run validate -- skills/document-project/`. Frontmatter must still parse.
2. **Catalog regen** — `npm run generate-catalog` succeeds and the catalog entry for `document-existing-project` reflects sharded output; `document-project` is marked deprecated.
3. **No monolith path leaks** — `grep -rn "brownfield-architecture\.md\|docs/architecture\.md" skills/ docs/ AGENTS.md` returns only intentional references (e.g. `/shard-doc` documentation, migration notes). No skill should still tell users to write `docs/brownfield-architecture.md`.
4. **Dogfood re-run smoke test** — delete `docs/architecture/concepts/coding-standards.md` temporarily, invoke `/document-existing-project` against this repo with explicit scope "regenerate concepts/coding-standards.md only", confirm: (a) the skill writes only the missing file, (b) the per-file prompt fires for any pre-existing shards, (c) `index.md` is updated to list shards present, (d) no monolith file is created. Restore the file after.
5. **Pipeline consumer wiring** — after refactor, run `/review-story --validate` (or any consumer that calls `devLoadAlwaysFiles`) against a story in this repo. The three required `concepts/*.md` files must load without error, proving the refactored output is pipeline-compatible.
6. **Cross-link audit** — `grep -rn "brownfield-architecture\.md" docs/ skills/` returns zero hits outside of deprecation-history notes or commit messages.
