---
title: Source tree (agent-skills)
status: draft
---

# Source tree

> Where things live in **this** repository. Loaded into every pipeline run so agents know where to put new code, where to find conventions, and what is off-limits.

## Top-level layout

```
.
├── skills/                  # The library — one directory per skill
│   └── <skill-name>/
│       ├── SKILL.md         # Required: YAML frontmatter + prose instructions
│       ├── scripts/         # Optional: executable scripts (Python, JS, bash)
│       ├── references/      # Optional: docs loaded on demand (bundled from shared/resources/)
│       ├── resources/       # Optional: templates, YAML configs, checklists
│       ├── assets/          # Optional: boilerplate used in skill output
│       ├── tests/           # Optional: node --test unit tests for skill libs
│       └── <name>.zip       # Build artefact (gitignored — never commit)
│
├── shared/
│   └── resources/           # Single source of truth for cross-skill docs and scripts
│
├── evals/                   # Four-layer eval suite
│   ├── shared/              # Eval runner (runner.mjs, drivers, harness helpers)
│   ├── <skill>/protocol/    # Protocol-level tests
│   ├── <skill>/scenarios/   # Fixture scenarios (hermetic by default)
│   ├── <skill>/step-isolation/  # Per-step isolation runs
│   └── <skill>/smoke/       # End-to-end smoke runs
│
├── docs/
│   ├── architecture/        # ← this directory: meta-arch for the repo itself
│   ├── standards/           # Document schemas (epic, story, task, PRD) and cross-cutting rules
│   ├── reference/           # skills-config.yaml schema, skill catalog, glossary, troubleshooting
│   ├── runbooks/            # Step-by-step procedures for pipeline flows
│   ├── operations/          # workflows.md — high-level pipeline map
│   ├── concepts/            # Overview docs for users adopting the library
│   ├── contributing/        # Contributor guide, evals strategy
│   ├── examples/            # Copy-paste starter assets (e.g. docs/examples/architecture/)
│   ├── prd/                 # PRDs that drive this repo's own development (dogfood)
│   ├── tasks/               # Standalone technical tasks (task-registry.md owns numbering)
│   ├── epic-registry.md     # Global epic numbering — single source of truth
│   └── README.md
│
├── tests/                   # Cross-cutting tests that don't belong to a single skill
├── examples/                # Worked examples of skill output (not skills themselves)
├── .agents/                 # In-repo agent state (plans/, etc.)
│   └── plans/               # Implementation plans for in-flight work
│
├── package.json             # npm scripts: test, eval:*, bundle, package, generate-catalog
├── skills-config.yaml       # This repo's own consumer-side config (dogfood)
├── project.yml              # GitHub project-board wiring
├── AGENTS.md                # Top-level instructions for any AI agent
├── CLAUDE.md                # @AGENTS.md (Claude-specific entry point)
├── README.md                # Install + quick tour
└── CHANGELOG.md
```

## Where to put what

- **New skill** → `skills/<skill-name>/SKILL.md`. Bootstrap with `python3 skills/create-skill/scripts/init_skill.py <name> --path skills/`. Then `npm run generate-catalog`.
- **Shared doc referenced by ≥2 skills** → `shared/resources/<name>.md`. Reference it from skills using the explicit path `shared/resources/<name>.md`. Run `npm run bundle` to materialise into each skill's `references/`.
- **Skill-specific reference doc** → `skills/<skill>/references/<topic>.md`. Loaded on demand by the skill body.
- **Skill template or YAML config** → `skills/<skill>/resources/`. Includes architecture/PRD templates, checklists, etc.
- **Eval scenario** → `evals/<skill>/scenarios/<NN>-<slug>/`. Use the runner (`node evals/shared/runner.mjs <path>`). Hermetic fixtures only — live driver modes are opt-in.
- **Cross-cutting test** → `tests/<topic>.test.js`. For tests that span multiple skills.
- **New runbook** → `docs/runbooks/<name>.md`. For an end-to-end procedure made of skill invocations.
- **Standard or schema rule** → `docs/standards/<topic>.md`. For rules every consumer must follow.
- **New PRD/epic/story/task** → `docs/prd/`, `docs/tasks/`. Always update the relevant registry atomically.
- **Implementation plan** → co-locate with the work (in the story or task directory) or `.agents/plans/` for general plans. Never `~/.claude/plans/` or `/tmp/`.

## Boundaries

- **`shared/resources/` is the only place cross-skill content lives.** Bundlers copy it into each skill. Never read across skills directly at runtime.
- **`skills/<x>/references/` files inside in-tree skills are auto-generated** from `shared/resources/`. Edit the source, then run `npm run bundle`. Editing the bundled copy is lost on the next bundle.
- **Tests next to source:** per-skill tests live in `skills/<x>/tests/`, not under a top-level `tests/__skill-name__/` directory. Cross-cutting only lives in top-level `tests/`.
- **Build artefacts are gitignored:** `skills/*/*.zip`, `node_modules/`. Regenerate; don't commit.

## Do not touch without a reason

- `package-lock.json` — only changes when `package.json` dependencies change.
- `shared/resources/resolve-platform.sh` — used by many skills; small change has wide blast radius. Run `npm run test:platform` after.
- Bundled `skills/*/references/` files when the corresponding `shared/resources/` source has not changed — running the bundler is the safe path.

## See also

- [Coding standards](./coding-standards.md) — conventions when authoring inside this tree
- [Tech stack](./tech-stack.md) — runtimes and tooling that operate on this tree
- [`docs/standards/file-naming.md`](../../standards/file-naming.md) — canonical filename patterns
