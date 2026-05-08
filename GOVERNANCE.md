# Governance

## Roles

- **Maintainer**: merges PRs, cuts releases, owns roadmap. Currently: [@Gamaroff](https://github.com/Gamaroff).
- **Contributor**: anyone who opens issues or PRs.

## Decision making

- Routine changes (bug fixes, new skills, doc edits): maintainer approval on PR is sufficient.
- Breaking changes (skill API, frontmatter schema, shared resource layout): require an issue with design proposal and 7-day comment window before merge.
- Disputes: maintainer has final call. Document rationale in the PR or issue.

## Becoming a maintainer

Sustained, high-quality contributions over 3+ months — typically 5+ merged PRs across multiple skills, plus helpful review activity. Existing maintainers nominate; current maintainers approve by lazy consensus (72h, no objections).

## Releases

- Versioning follows [SemVer](https://semver.org/) at the repo level.
- Individual skills are versioned independently via their `SKILL.md` frontmatter.
- Changes recorded in `CHANGELOG.md` using [Keep a Changelog](https://keepachangelog.com/) format.

## Code of conduct

All participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Violations: email gamaroff@gmail.com.
