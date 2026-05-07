# Overview

Skills are modular, self-contained packages that extend Claude Code with specialized workflows, domain knowledge, and tooling. Install them into any project and Claude activates the right skill automatically based on context — or you invoke one explicitly.

## What is a Skill?

A skill is a directory (`skills/{skill-name}/`) distributed as a `.zip`. When installed into a project under `.agents/skills/`, Claude loads skill metadata at startup and pulls in the full instructions only when the skill is needed.

```
skills/skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── scripts/          # Executable scripts for deterministic tasks
├── references/       # Documentation loaded into context on demand
└── assets/           # Templates and boilerplate used in output
```

The `SKILL.md` frontmatter is minimal but critical:

```yaml
---
name: skill-name
description: Concise description of when/why to use this skill (~100 words)
---
```

The `description` is what Claude reads to decide whether to activate the skill. Make it specific and trigger-oriented, not generic.

## Progressive Disclosure

Skills use a three-tier loading system to keep context lean:

| Tier                 | What loads                           | When                       |
| -------------------- | ------------------------------------ | -------------------------- |
| **1 — Metadata**     | `name` + `description` only          | Always, at startup         |
| **2 — Instructions** | Full `SKILL.md` body                 | When skill is triggered    |
| **3 — Resources**    | Files in `references/` and `assets/` | On demand during execution |

This means 124+ skills can coexist without blowing the context window. Only the skills relevant to the current task consume full context.

## How Skills Activate

**Automatic** — Claude matches your intent against skill descriptions:

```
"Create the next story for epic 2"       → create-story
"Commit all changes"                     → commit-changes
"Run the architecture checklist"         → execute-architect-checklist
```

**Explicit** — Reference a skill by name:

```
"Use the @architect skill to review this design"
"Run @qa-story on story 3.2"
```

**Slash command** — For development and QA workflows:

```
/develop @story-directory
/qa-story @story-directory
/qa-fix @story-directory
```

## Skill Categories

**Development workflow** — end-to-end implementation pipeline:
`develop`, `develop-story`, `develop-task`, `qa-story`, `qa-fix`, `qa-gate`, `finalise`

**Git / version control:**
`commit-changes`, `create-branch`, `create-pr`

**Story and epic lifecycle:**
`create-story`, `review-story`, `edit-story`, `validate-story`, `create-epic`, `review-epic`, `edit-epic`

**Product management:**
`greenfield-prd`, `create-prd`, `scrum-master`, `po`, `create-task`, `change-management`

**Architecture:**
`architect`, `create-architecture-doc`, `execute-architect-checklist`, `mermaid-architect`

**Quality and enforcement:**
`api-endpoint-validator`, `code-smell-validator`, `error-handling-enforcer`, `platform-separation-validator`, `response-envelope-enforcer`, `offline-first-enforcer`, `test-co-location-enforcer`, `navigation-pattern-validator`

**Documentation and research:**
`create-doc`, `document-project`, `document-existing-project`, `deep-research-prompt`, `analyst`, `brainstorming`

**Writing and editing:**
`critique`, `polish`, `simplify`, `bolder`, `distill`, `normalize`, `extract`

## The Development Pipeline

The core workflow for implementing stories:

```
validate-story → develop → qa-story → qa-fix (if needed) → finalise
```

`develop-story` and `develop-task` automate this full pipeline end-to-end, including branch creation, PR, QA cycles (up to 5), and finalisation. QA gate files (`PASS / CONCERNS / FAIL / WAIVED`) are owned exclusively by QA skills — dev skills never touch them.

## Shared Resources

`shared/resources/` is the single source of truth for cross-skill documentation and scripts. Skills reference these with the explicit path `shared/resources/<filename>`. At package time, `package_skill.py` auto-bundles referenced files into `references/` inside the zip and rewrites paths — installed skills are fully self-contained.

Key shared resources:

| File                           | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `platform-detection.md`        | Canonical spec for tracker/VCS resolution       |
| `resolve-platform.sh`          | Shell helper sourced by 8 platform-aware skills |
| `document-status-lifecycle.md` | Status states and transition rules              |
| `develop-pipeline-*.md`        | Step-by-step develop pipeline specs             |

## Platform Detection

Skills that interact with issue trackers or VCS resolve the platform in this order:

1. `skills-config.yaml` — explicit `tracker: jira|github` and `vcs: bitbucket|github`
2. Env vars — `JIRA_URL` set → Jira; otherwise GitHub
3. Git remote — `bitbucket.org` in origin → Bitbucket; `github.com` → GitHub
4. Default — GitHub for both

Platform-aware skills: `create-pr`, `create-task`, `finalise`, `review-story`, `review-task`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`

Platform-agnostic skills: `create-branch`, `commit-changes`, `create-story`, `qa-story`, `qa-gate`

## Packaging and Distribution

```bash
# Initialize a new skill
python skills/create-skill/scripts/init_skill.py <skill-name> --path skills/

# Package into a distributable zip
python skills/create-skill/scripts/package_skill.py skills/<skill-name>

# Validate a skill
python skills/create-skill/scripts/quick_validate.py skills/<skill-name>
```

Zips are build artifacts — gitignored (`skills/*/*.zip`). Regenerate with `package_skill.py` when installing or distributing. Never commit zips.

See [Packaging](./packaging.md) and [Creating Skills](./creating-skills.md) for full details.

## Configuration

Projects place a `skills-config.yaml` at their root to tune skill behaviour:

```yaml
qa:
  qaLocation: docs/qa
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
devStoryLocation: nested # stories nested inside epic directories
devDebugLog: .ai/debug-log.md
tracker: jira # explicit platform override
vcs: bitbucket
```

## Further Reading

- [Usage](./usage.md) — invocation patterns and file discovery
- [Skill Catalog](./skill-catalog.md) — full index of all 124+ skills
- [Conventions](./conventions.md) — file naming, status lifecycle, epic registry
- [Workflows](./workflows.md) — sprint cycle, hotfix, parallel dev, change management
- [Packaging](./packaging.md) — distribution, validation, shared resources
- [Creating Skills](./creating-skills.md) — authoring guide and best practices
