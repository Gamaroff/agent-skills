# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Docs (onboarding & rationale):** `docs/concepts/getting-started.md` (install → first command), `docs/concepts/architecture.md` (system view + dependency map + design principles), `docs/reference/glossary.md`, `docs/reference/faq.md` (design rationale), `docs/reference/anti-patterns.md`, `docs/reference/commands.md` (every `/foo` consolidated), `docs/reference/activation-phrases.md`, `docs/contributing/doc-style.md`, `docs/contributing/releases.md`.
- **CI:** `.github/workflows/docs-link-check.yml` + `.github/markdown-link-check.json` — markdown link checker on every PR touching docs.
- **`configuration.md`:** worked-example `skills-config.yaml` blocks (typical project, greenfield, task-only).
- **`generate_catalog.py`:** scope-notes preface explaining foundational vs workflow-specific vs stack-specific vs specialised categories.
- **Docs:** `docs/runbooks/` — 12 step-by-step walkthroughs (story-development, task-development, qa-flow, bug-fix, hotfix, sprint-cycle, pm-workflows, jira-publish, new-project-setup, parallel-stories, change-management, document-existing-project) with per-runbook prereqs, Mermaid pipeline diagrams, called-skills maps, and verification commands.
- **Docs:** `docs/standards/` — split document schemas into `prd-documents.md`, `epic-documents.md`, `story-documents.md`, `task-documents.md`; new `file-naming.md`, `status-lifecycle.md`, `epic-registry.md`, `task-registry.md`, `plan-file-locations.md`.
- **Docs:** `docs/reference/` — added `configuration.md` (consolidated `skills-config.yaml` keys + placeholders) and `troubleshooting.md` (common pipeline failures + recovery).
- **Docs:** subdirectory indexes (`README.md`) for `concepts/`, `reference/`, `standards/`, `contributing/`, `operations/`.
- **`skill-catalog.md`:** featured starting-points preface emitted by `generate_catalog.py`.
- **`develop-pipeline`**: Phase 0 parallel fan-out (task.25) — three Explore subagents (resolver + tracker-state-poller + lite-mode/board-detector) dispatched in a single parallel tool-call block; results aggregated before Step 1. Adds tracker state poller and lite-mode detector as new Phase 0 signals; `0c` and `0c-load` updated to consume `LITEMODE_RESULT` directly.
- **`develop-pipeline`**: stale-context detector Explore subagent dispatched as Phase 0a on resume — reads lock + `.summaries/step-*.json` + artifact mtimes; returns `recommended_step`, `deltas_since_pause`, and `blocking_issues`. Narrows Phase 0b artifact verification scope. Wired into both `develop-story` and `develop-task` resume flows.
- **`develop-pipeline`**: `devLoadAlwaysFiles` resolution (Phase 0c-load) — reads `skills-config.yaml` `devLoadAlwaysFiles` key and passes those files as labelled context to `/develop` on the first iteration.
- **`develop-pipeline`**: Explore audit subagent replaces inline loop reads for pre-develop codebase mapping.
- **`develop-pipeline`**: test-failure triage Explore subagent for structured diagnosis on failing test suites.
- **`develop-story`**: epic-branch-first branching enforced — story branches always created from their parent epic branch (`feature/epic.{n}.{name}`), never directly from `develop`.
- **`create-pr`**: diff-aware PR body generation via Explore subagent — richer, context-aware PR descriptions from actual diff content.
- **`review-story`**: Phase 1.5 pre-pass with 3 parallel Explore subagents for deeper pre-review codebase analysis.
- Subagent summaries persisted as `.summaries/` JSON artifacts by the pipeline orchestrator.
- Shared tracker state poller Explore subagent available for create-pr/finalise flows.
- `docs/`: PRD/story and task document reference guides (`prd-story-reference.md`, `task-reference.md`).
- `GOVERNANCE.md`, `CITATION.md`, and Copilot agent instructions (`copilot-instructions.md`).

### Changed
- **Docs reorganisation:** `docs/` restructured into audience-driven subdirectories — `concepts/`, `runbooks/`, `reference/`, `standards/`, `contributing/`, `operations/`. Flat docs moved with `git mv` (history preserved): `overview.md` → `concepts/`; `usage.md` → `reference/invocation.md`; `skill-catalog.md` → `reference/`; `creating-skills.md` → `contributing/authoring-skills.md`; `packaging.md`, `evals.md` → `contributing/`; `workflows.md` → `operations/`; `prd.md` → `standards/story-documents.md` (split, see Added); `task.md` → `standards/task-documents.md`; `conventions.md` → `standards/file-naming.md` (split, see Added). `placeholders.md` folded into `reference/configuration.md`. `evals.md` split into `contributing/evals/{README,recipes,reference,secrets}.md`.
- **`AGENTS.md`:** trimmed duplicated content — file-naming table, status lifecycle, configuration snippet, plan-file-locations, task-registry rules, development pipeline, and evals descriptions now link to canonical homes under `docs/standards/`, `docs/reference/`, `docs/operations/`, and `docs/contributing/`.
- **`README.md`:** skill-categories list replaced with link to generated `docs/reference/skill-catalog.md` + a short curated featured-starting-points list.
- **`generate_catalog.py`:** output path `docs/skill-catalog.md` → `docs/reference/skill-catalog.md`.
- **Agent-agnostic repo guidance**: `CLAUDE.md` content migrated to `AGENTS.md`; `CLAUDE.md` is now a thin redirect shim and is gitignored. All "Claude Code"-specific language in `AGENTS.md` replaced with neutral agent terminology.
- **`qa-gate`**: gate files co-located with their story/task documents instead of central `docs/qa/gates/` — gate path is now `<story-dir>/story.{e}.{s}.gate.{n}.{name}.yml`.
- PRD/epic/story doc paths canonicalized across skills for consistent path resolution.
- `.agents/plans/` is now version-controlled; `.agents/state/` is gitignored as a runtime-artifact directory.
- Pipeline Step 7 (finalise) hardened: DO-NOT-inline rule added, completion checklist documented; lite mode confirmed to still execute all finalise side-effects (post DoD to PR, comment issue, update board).
- CI workflows disabled to stay within GitHub Free tier action-minute limits.

### Fixed
- **`create-skill`**: validator now handles both quoted and plain (block-scalar) multi-line `description` fields in `SKILL.md` frontmatter.

### Removed
- `skills/offline-first-enforcer/references/offline-capabilities-prd.md` — 1900-line product-specific PRD; skill is now self-contained with generic offline-first patterns.
- Stale `api-endpoint-validator.zip` build artifact at repo root.

### Changed
- **Decoupled skills from private monorepo.** Replaced `@{org}/<lib>` import examples with `@your-org/<lib>` across `platform-separation-validator`, `testing-setup-shared|nestjs|react-native`, `test-co-location-enforcer`, `documentation-standards-validator`, `epic-registry-manager`, `react-native-debug`, `nestjs-debug`, `develop`, `create-task`.
- **Loosened "NX monorepo" hard requirements** in `develop`, `qa-fix`, `nestjs-debug`, `testing-setup-shared`, `testing-setup-nestjs` so skills apply to any workspace setup.
- **Genericized leftover product references**: `my-wallet:start:device` → generic dev-command example; "this platform" / "financial coverage 95%" → neutral wording.
- `CODE_OF_CONDUCT.md` and `SECURITY.md` now list a contact email directly instead of pointing to a GitHub profile.

### Added
- `docs/placeholders.md` — legend for `{project}`, `{api-service}`, `{db-service}`, `{cache-service}`, `@your-org/...` template tokens used across skills, with substitution guidance.
- Placeholder notes in `docker`, `deploy-remote`, `nestjs-debug`, `qa-task` linking to `docs/placeholders.md`.
- `CHANGELOG.md`.
- `examples/README.md` pointing at `docs/development/tasks/` as a worked record of the develop/QA pipeline.

### Notes
- This pass is the OSS-readiness sweep: domain-specific business entities (financial wallets, mobile-money market analysis, etc.) and references to non-existent private libraries were removed or genericized so that every skill stands on its own when installed into an arbitrary project.

## Earlier history

See `git log` for the pre-OSS-prep history. Notable inflection points:

- `46bd6ca` — Mermaid diagrams added for `develop-story` and `develop-task`.
- `3f97fd3` — Skill catalog generator, CI packaging smoke test, npm scripts.
- `c2d8e4b` — Public-facing documentation overhaul for OSS release.
- `241abe1` — Skill content normalization and initial OSS anonymization pass.
