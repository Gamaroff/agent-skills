# Architecture documentation example

This directory is a **copy-paste starter** for the `docs/architecture/` tree that skills in this repo expect to find in a consumer project.

It is *not* real architecture for the agent-skills repo itself — for that, see [`docs/architecture/`](../../architecture/).

## How to use

1. Read [`docs/standards/architecture-docs.md`](../../standards/architecture-docs.md) for the contract.
2. Copy this directory into the root of your project:
   ```bash
   cp -R path/to/agent-skills/docs/examples/architecture/ ./docs/architecture/
   rm docs/architecture/README.md   # this file is starter-kit-only
   ```
3. Fill in each file with content specific to your project.
4. Add the matching block to your project's `skills-config.yaml`:
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

## Files

- `index.md` — entry point listing every shard
- `concepts/coding-standards.md` — naming, formatting, lint rules
- `concepts/tech-stack.md` — runtime, frameworks, major libraries
- `concepts/source-tree.md` — where things live in the repo

## Prefer to auto-generate?

For an existing codebase, run `/document-existing-project` instead of hand-filling these stubs — it analyses the actual code and produces the same layout.
