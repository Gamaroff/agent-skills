# Copilot / AI Agent Instructions

This repo is a library of **Claude Code skills**. AI agents writing code here must follow these rules.

## Repo layout

- Each skill lives in `skills/{skill-name}/` and must contain a `SKILL.md` with YAML frontmatter (`name`, `description`).
- Cross-skill shared docs/scripts live in `shared/resources/`. Reference them by explicit path `shared/resources/<file>` — the packager auto-bundles them into zips.
- Build artifacts (`*.zip`) are gitignored. Never commit them.
- Stories/epics/tasks live in `docs/` of consuming projects, not here.

## Naming

- Skill directories: kebab-case (`create-story`, not `CreateStory`).
- Path references: agent-agnostic — always `.agents/skills/`, never `.claude/skills/`.
- Document filenames follow patterns in `CLAUDE.md` (e.g. `epic.{n}.{name}.md`, `story.{epic}.{story}.{name}.md`).

## When adding or editing a skill

1. Run `python skills/create-skill/scripts/quick_validate.py skills/<skill-name>` before opening a PR.
2. Run `npm run generate-catalog` if a skill is added or renamed.
3. Keep `SKILL.md` `description` field tight — it is what triggers auto-activation.
4. Do not hardcode user paths, emails, or API keys.

## Code style

- Python: stdlib-first, no new deps without justification. 3.11+.
- Shell: bash, `set -euo pipefail`, POSIX-portable where reasonable.
- No comments explaining *what* — only *why* when non-obvious.
- No backwards-compat shims for code that was never released.

## Commits & PRs

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- PRs require passing `Validate Skills` workflow.
- PR template at `.github/pull_request_template.md` — fill it.

## Security

- Never commit secrets. Push protection is enabled.
- Vulnerability disclosure via `SECURITY.md`, not issues.

## Things to avoid

- Symlinks for shared resources (use the packager).
- Modifying QA gate files from dev skills (QA-owned).
- Adding emoji to source files unless requested.
