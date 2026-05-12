---
title: Coding standards
status: draft
---

# Coding standards

> Conventions the agent must obey when writing code in this project. Always loaded into the pipeline context.

## Languages and idioms

<!-- Per language: version, style guide, idiomatic patterns. Example:
- **TypeScript:** strict mode on. Prefer `type` over `interface` except for class contracts. No `any` — use `unknown` then narrow.
- **Python:** 3.12+. Format with `ruff format`. Type-annotate public functions.
-->

## Naming

<!-- Filenames, directory names, exported symbols, env vars. Example:
- Filenames: `kebab-case.ts`. Test files: `*.spec.ts` co-located.
- React components: `PascalCase`. Hooks: `useFooBar`.
- Env vars: `SCREAMING_SNAKE_CASE`.
-->

## Formatting and linting

<!-- Tools and config. Example:
- Prettier + ESLint enforced in CI. Run `pnpm lint` before commit.
- No format-on-save disagreements: `.editorconfig` is authoritative.
-->

## Organisation

<!-- File structure rules. Example:
- Tests co-located with source (`foo.ts` + `foo.spec.ts`).
- No `__tests__/` directories.
- Public API exported from `index.ts` of each module.
-->

## Do not

<!-- Anti-patterns specific to this project. Example:
- Do not use the deprecated `legacy-auth` package.
- Do not call `process.env` outside `src/config/`.
-->
