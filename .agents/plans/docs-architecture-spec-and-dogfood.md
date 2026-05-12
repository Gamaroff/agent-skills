# Plan: Canonical `docs/architecture/` Spec, Example, and Dogfood

## Context

Many skills in this repo (`create-story`, `review-story`, `review-task`, `develop-story`, `develop-task`, `finalise`, brownfield `create-prd`) read from a consumer repo's `docs/architecture/` directory — specifically expecting `concepts/coding-standards.md`, `concepts/tech-stack.md`, `concepts/source-tree.md` (always-loaded), plus an `index.md` entry point when sharded. The contract is implicit: scattered across runbooks (`new-project-setup.md`, `document-existing-project.md`), `docs/reference/configuration.md`, and producer skills (`create-architecture-doc`, `document-existing-project`), but never written down as a single normative spec. There is no example tree consumers can copy. And this repo itself — which dogfoods its own skills to build itself — has no `docs/architecture/`, so producer/consumer skills can't be validated against a real instance here.

This plan delivers three layers: (1) a canonical spec at `docs/standards/architecture-docs.md` defining the required tree, shard rules, and version field; (2) a copy-paste example under `docs/examples/architecture/` for consumer repos; (3) a real `docs/architecture/` for agent-skills itself, generated via `/document-existing-project` in sharded form, exercising the same code path consumer repos will hit.

## Approach

### Layer 1 — Canonical Spec

Create `docs/standards/architecture-docs.md`. Sections:

- **Purpose** — why skills need this directory.
- **Required files** — `concepts/coding-standards.md`, `concepts/tech-stack.md`, `concepts/source-tree.md` (always-loaded via `devLoadAlwaysFiles`).
- **Layouts** — sharded (`index.md` + level-2 sections as separate files) vs flat. When to use each.
- **`architectureVersion`** — current = `v4`. What v4 implies (sharded support, `index.md` requirement when sharded).
- **`skills-config.yaml` wiring** — `architecture.architectureSharded`, `architectureShardedLocation`, `architectureVersion`, `devLoadAlwaysFiles`.
- **Producer skills** — point to `/create-architecture-doc` (greenfield) and `/document-existing-project` (brownfield).
- **Consumer skills** — list which skills read what (table).
- **Status lifecycle** — architecture docs follow [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md).

Add a row to the top-level `docs/standards/` index if one exists; link from `AGENTS.md` near the existing "File Naming" / "Status Lifecycle" entries.

### Layer 2 — Example Tree

Create `docs/examples/architecture/` containing a minimal sharded skeleton:

```
docs/examples/architecture/
├── README.md           # "This is a copy-paste example. See docs/standards/architecture-docs.md."
├── index.md
└── concepts/
    ├── coding-standards.md
    ├── tech-stack.md
    └── source-tree.md
```

Each file: 10–30 lines with placeholder-style content showing the expected shape (headings, what to fill in), not real architecture content.

### Layer 3 — Dogfood

Generate this repo's own `docs/architecture/` using `/document-existing-project` in **sharded** mode. Concrete steps (executed during implementation, not this plan):

1. Ensure `skills-config.yaml` (already untracked at repo root per git status) has:
   ```yaml
   architecture:
     architectureSharded: true
     architectureShardedLocation: docs/architecture
     architectureVersion: v4
   devLoadAlwaysFiles:
     - docs/architecture/concepts/coding-standards.md
     - docs/architecture/concepts/tech-stack.md
     - docs/architecture/concepts/source-tree.md
   ```
2. Run `/document-existing-project` → produces sharded output at `docs/architecture/`.
3. Hand-edit `concepts/coding-standards.md`, `concepts/tech-stack.md`, `concepts/source-tree.md` to reflect the actual repo (Node 20+, Python skill scripts, npm scripts for bundling/catalog, skills directory layout).
4. Verify `index.md` lists all shards.
5. Commit.

Treat any rough edges from `/document-existing-project` as feedback on that skill — file via `/create-issue` rather than papering over.

## Critical Files

**To create:**
- `docs/standards/architecture-docs.md` — canonical spec.
- `docs/examples/architecture/README.md` + tree (5 files).
- `docs/architecture/index.md` + `concepts/{coding-standards,tech-stack,source-tree}.md` + other shards as `/document-existing-project` produces.
- `skills-config.yaml` (if not finalised in current untracked state).

**To edit:**
- `AGENTS.md` — add link to new standards doc near existing standards entries.
- `docs/runbooks/new-project-setup.md` — cross-link to the new spec and example.
- `docs/runbooks/document-existing-project.md` — cross-link to the new spec.
- `docs/reference/configuration.md` — cross-link to spec from the `architecture.*` schema rows.

**To reference (don't modify):**
- `shared/resources/document-status-lifecycle.md` — link from spec.
- Producer skills `skills/create-architecture-doc/SKILL.md`, `skills/document-existing-project/SKILL.md` — verify their output matches the new spec; if drift, file issues, don't silently edit.

## Reuse

- Status lifecycle vocabulary: reuse `shared/resources/document-status-lifecycle.md` rather than redefine.
- File naming rules: reuse `docs/standards/file-naming.md` patterns; the spec only adds the architecture-doc-specific tree.
- Configuration schema lives in `docs/reference/configuration.md` — spec **links** there, doesn't duplicate.

## Verification

1. **Spec is reachable** — `AGENTS.md` links to it; `grep -r "docs/standards/architecture-docs.md"` finds the cross-links in runbooks/reference.
2. **Example tree validates** — every required file from the spec present under `docs/examples/architecture/`.
3. **Dogfood works end-to-end:**
   - `npm run generate-catalog` still passes.
   - Run one consumer skill that loads architecture context against this repo — e.g. open a story and run `/review-story --validate` on it; confirm it finds and reads the three always-load files without errors.
   - Run `/develop-task` on a trivial task (e.g. a typo fix) to confirm `devLoadAlwaysFiles` resolves.
4. **No broken refs** — `grep -r "docs/architecture" skills/` references all resolve under the new tree where applicable to this repo.
5. **Producer parity** — files produced by `/document-existing-project` match the layout the spec mandates; any mismatch → issue, not silent fix.
