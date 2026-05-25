# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [v0.2.0] - 2026-05-25

### Added
- **`review-story` Step 1 parallel fan-out:** collapses Step 1 + Phase 1.5 into a single 4-subagent dispatch (discovery + epic/architecture/codebase pre-pass) to cut latency.
- **`review-story` Tracker Dedup Fallback Search Addendum:** structural label search (`story-{epic}.{story}`) when primary title-prefix match returns zero — wired into both Jira (`searchJiraIssuesUsingJql` by label) and GitHub (`gh issue list --search label:`) dedup paths.
- **`review-story` Missing Diagram Proactive Draft Rule:** generates a sample mermaid snippet inline when a diagram is absent but recommended.
- **`review-story` Critical Scoring Engine Floor Gate:** caps Implementation Readiness Score at 5/10 when Technical Accuracy or Completeness < 6, forcing NO-GO regardless of other dimensions.
- **`review-story` Step 9.5 Atomic Rollback Protocol:** snapshots the story before the auto-fix Edit batch and reverts all edits if any individual edit fails.
- **`review-{epic,story,task}` Jira body push (Step 11.5 / 9.6 / 8.6):** after Step *.5 fixes, pushes body edits to Jira via the bundled sync script, refreshing `jira_last_body_hash` and appending a Change Log. Skipped when TRACKER=github, in validate mode, or no body edits.

### Fixed
- **`ensure-{epic,story,task}-jira-issue` + `jira-epic-creator` script paths:** replaced nonexistent `.scripts/jira-sync*.js` references with the bundled `.agents/skills/sync-jira-{epic,story,task}/scripts/...` paths, with explicit notes warning agents not to look for `.scripts/` in the consumer repo root.

### Changed
- **`review-story` QUESTION POINT 1/2:** demoted from h3 headings to bold to prevent TOC noise.

## [v0.1.1] - 2026-05-18

### Added
- **`scripts/release.sh --retry [<tag>]`:** recovery flag for orphan tags — when CI fails between tag push and `gh release create`, re-runs the release pipeline by deleting and re-pushing the tag at the latest `main` HEAD. Skips bump/CHANGELOG/commit; refuses if a GitHub Release is already published for that tag.
- **`workflow_dispatch` trigger on `.github/workflows/release.yml`:** re-run a failed release from the GitHub UI or `gh workflow run release.yml -f tag=<tag>` without touching the tag — checks out the tag's commit and passes it to `gh release create` via a job-level `RELEASE_TAG` env var.
- **`docs/contributing/releases.md`:** new "Recovering from a failed release" section documenting when to use `workflow_dispatch` vs `--retry`.

### Fixed
- **CI Node version:** `.github/workflows/release.yml` now uses Node 22 so `node --test` expands the quoted glob patterns in `npm test`. Node 20 treated them as literal paths and aborted the release before the GitHub Release was published.
- **`scripts/setup-consumer.sh` silent exits:** `_read_config_path` and `env_get` appended `|| true` so a non-matching `grep` doesn't kill the wizard under `set -euo pipefail`. The wizard previously died after the skills-config skip prompt with no error message.

### Changed
- **`scripts/setup-consumer.sh` end-of-wizard summary:** per-step status table with `ok` / `skipped` / `warn` / `fail` badges, coloured `✓` / `⚠` / `✗` banner, and an actionable Warnings block (e.g. "Skills pinned to main — set `SKILLS_VERSION=<tag>` once a release exists"). An `EXIT` trap ensures the summary prints even when a sub-step aborts mid-run.

## [v0.1.0] - 2026-05-15

### Added
- **Release automation:** `.github/workflows/release.yml` triggers on `v*.*.*` tag push — runs `npm test`, fails if the skill catalog is out of date, validates all skills via `quick_validate.py`, then creates a GitHub release with auto-generated notes (source tarball attached automatically).
- **`scripts/release.sh`:** end-to-end semver release script (`--major|--minor|--patch`, `--dry-run`). Confirms a clean `main` branch in sync with `origin/main` (with direction-aware push/pull hints), runs pre-release checks (`npm test`, `validate:all`, `generate-catalog`), bumps version from the latest git tag, moves `[Unreleased]` → `[vX.Y.Z]` in CHANGELOG, commits, tags, and pushes. Verifies `[Unreleased]` has non-empty content before tagging. Portable across BSD/GNU sed (uses awk for the multi-line CHANGELOG insert).
- **CI catalog-stale guard:** `validate.yml` regenerates the skill catalog on every PR and `develop`/`main` push and fails if it differs from the committed file — drift is caught at PR time rather than at release time.
- **`scripts/setup-consumer.sh --update`:** flag that skips the full wizard and re-downloads only the latest skills release into `.agents/skills/`. For day-to-day skill upgrades after the initial wizard run. Clearly distinguished in docs from the first-install path (full wizard, no flag).
- **`scripts/setup-consumer.sh` docs scaffold (step 7):** creates `${PRD_DIR}/`, `${ARCH_DIR}/index.md`, and three required always-loaded stubs (`concepts/coding-standards.md`, `concepts/tech-stack.md`, `concepts/source-tree.md`). Honours user-customised paths from `skills-config.yaml` (parser strips quotes and trailing comments). Idempotent; warns when stubs need filling in.
- **`SKILLS_VERSION` env var:** consumers can pin `setup-consumer.sh` installs to a specific release tag (e.g. `SKILLS_VERSION=v1.0.0`). Download failures (e.g. invalid tag → 404) surface as explicit errors that point at `gh release list` and the releases API.
- **`README.md`:** "Start here" callout block (lines 15–19) — links to decision tree (`docs/concepts/which-path.md`), task quickstart, and story quickstart; visible within the first viewport at 1080p.
- **Docs (onboarding & rationale):** `docs/concepts/getting-started.md` (install → first command), `docs/concepts/architecture.md` (system view + dependency map + design principles), `docs/reference/glossary.md`, `docs/reference/faq.md` (design rationale), `docs/reference/anti-patterns.md`, `docs/reference/commands.md` (every `/foo` consolidated), `docs/reference/activation-phrases.md`, `docs/contributing/doc-style.md`, `docs/contributing/releases.md`.
- **CI:** `.github/workflows/docs-link-check.yml` + `.github/markdown-link-check.json` — markdown link checker on every PR touching docs.
- **`configuration.md`:** worked-example `skills-config.yaml` blocks (typical project, greenfield, task-only).
- **`generate_catalog.py`:** scope-notes preface explaining foundational vs workflow-specific vs stack-specific vs specialised categories.
- **Docs:** `docs/runbooks/` — 12 step-by-step walkthroughs (story-development, task-development, qa-flow, bug-fix, hotfix, sprint-cycle, pm-workflows, jira-publish, new-project-setup, create-parallel-stories, change-management, document-existing-project) with per-runbook prereqs, Mermaid pipeline diagrams, called-skills maps, and verification commands.
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
- **Skill install model:** replaced `npx skills add` (third-party Vercel Labs `skills` npm package, unrelated to this repo) with direct tarball download from this repo's GitHub releases. `setup-consumer.sh` resolves the latest release tag via the GitHub API and downloads from `archive/refs/tags/<tag>.tar.gz`. Manual installs and CI use the same URL pattern.
- **`docs/contributing/releases.md`, `docs/concepts/getting-started.md`:** rewritten to describe the tag-driven release flow (push `v*.*.*` → workflow creates release → consumers pull pinned tarball). New release workflow split into three sections in `releases.md`: "Branch flow" (`develop` → `main` promotion with direct-fast-forward and PR-based variants, plus a Merge-type aesthetics table), "Cutting a release" (`release.sh` invocation and what `release.yml` does), and "Sync develop with main after release" (universal sync step that applies after any branch-flow variant). Removed `npx skills add` install commands across `README.md`, `AGENTS.md`, `docs/concepts/quickstart-{task,story}.md`, `docs/runbooks/first-week/day-1-tasks.md`, `docs/reference/troubleshooting.md`, `docs/contributing/{packaging,authoring-skills}.md`, `docs/architecture/concepts/tech-stack.md`, `shared/resources/develop-pipeline-hooks.md`, `skills/develop-{story,task}/scripts/install-hooks.sh`, and example PRD/epic templates.
- **`setup-consumer.sh` pipeline hooks:** registers `PreCompact`, `Stop`, and `PostToolUse` hooks inline via `jq` instead of delegating to a separate `install-hooks.sh` invocation. Registration no longer depends on `install-hooks.sh` living inside an installed skill, so the wizard can register hooks at any point regardless of skills install order.
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
- `examples/README.md` pointing at `docs/tasks/` as a worked record of the develop/QA pipeline.

### Notes
- This pass is the OSS-readiness sweep: domain-specific business entities (financial wallets, mobile-money market analysis, etc.) and references to non-existent private libraries were removed or genericized so that every skill stands on its own when installed into an arbitrary project.

## Earlier history

See `git log` for the pre-OSS-prep history. Notable inflection points:

- `46bd6ca` — Mermaid diagrams added for `develop-story` and `develop-task`.
- `3f97fd3` — Skill catalog generator, CI packaging smoke test, npm scripts.
- `c2d8e4b` — Public-facing documentation overhaul for OSS release.
- `241abe1` — Skill content normalization and initial OSS anonymization pass.
