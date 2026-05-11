# Skill Invocation

> **Audience:** developers using these skills in a downstream project.

Three ways to invoke a skill: natural language, explicit reference, or slash command.

> For end-to-end walkthroughs that chain these invocations together, see the [Runbooks](../runbooks/README.md).

## Natural Language Triggers

Describe what you want — the matching skill activates:

```
"Create the next story for epic 2"
"Commit all changes"
"Run the architecture checklist"
"Document this existing project"
"Create a bug report for this issue"
```

## Explicit Skill Invocation

Reference a skill directly when you know which one you need:

```
"Use the @architect skill to create backend architecture"
"Run @qa-story on story 3.2"
"Execute @commit-changes skill"
```

## Slash Command Style

Many skills accept a story directory or specific file. Particularly useful for development and QA workflows:

```bash
/develop @story-directory
/qa-story @story-directory
/qa-fix @story-directory
```

### File Discovery

Given a story directory, these skills auto-discover:

- **Story file:** `story.{epic}.{story}.{name}.md`
- **QA reports:** `story.{epic}.{story}.qa.{number}.*.md`
- **Gate files:** `story.{epic}.{story}.gate.{number}.*.yml`
- **Bug reports:** `story.{epic}.{story}.bug.{n}.{name}.md`

### Examples

```bash
# Implement from a story directory
/develop docs/prd/domain-name/module-name/example-area/epics/epic.178.feature-ui/stories/story.178.8.example-feature/

# Review implementation
/qa-story docs/prd/.../stories/story.178.8.example-feature/

# Apply QA findings
/qa-fix docs/prd/.../stories/story.178.8.example-feature/

# Specific files also work
/develop docs/prd/.../story.178.8.example-feature.md
/qa-story docs/prd/.../story.178.8.example-feature.md
/qa-fix docs/prd/.../story.178.8.qa.1.initial-review.md
```

### Supported Skills

| Skill | Accepts Directory | Accepts Story File | Accepts QA/Gate/Bug Files |
|-------|------------------|-------------------|--------------------------|
| `develop` | Yes | Yes | No |
| `qa-story` | Yes | Yes | No |
| `qa-fix` | Yes | Yes | Yes (QA, Gate, Bug) |

QA/Gate files are numbered (e.g., `.qa.1.`, `.gate.1.`).

## Orchestrated Pipelines

Prefer the orchestrators — they run the full lifecycle automatically.

### `develop-story` — Automated Story Lifecycle

```bash
/develop-story docs/prd/.../story.178.8.example-feature.md
"Develop and QA this story end to end"
```

Calls: `create-branch → review-story → develop → create-pr → qa-story → qa-fix (up to 5 cycles) → finalise → commit-changes`

### `develop-task` — Automated Task Lifecycle

```bash
/develop-task docs/tasks/task.44.db-migration.md
"Develop and QA this task end to end"
```

Calls: `create-branch → review-task → develop → create-pr → qa-task → qa-fix (up to 5 cycles) → finalise → commit-changes`

For the full pipeline breakdown and workflow chains see [Workflows](../operations/workflows.md).

## Most Commonly Used Skills

### `commit-changes` — Git Commits

```
"Commit all changes"
"Create commit message for these changes"
"Split work into multiple commits"
```

Features: analyzes recent commit style, supports patch staging (`git add -p`), creates Conventional Commit messages, splits unrelated changes into logical commits.

### `create-story` — Story Creation

```
"Create the next story for epic 2"
"Draft story 3.4"
"Prepare story 1.1"
```

Process: loads inline configuration, identifies next story number, extracts epic requirements, reviews previous story insights, gathers architecture context, populates template, validates with checklist.

Anti-hallucination: all technical details extracted from docs, source citations required (`[Source: ...]`), no invented libraries/patterns, explicit unknowns stated.

### `architect` — Architecture

```
"Create backend architecture"
"Document this existing system"
"Research database options"
```

Outputs: architecture docs, technology stack with versions, data models, API specs, component diagrams, source tree, deployment plans, security/testing strategies.

### `qa-story` — Quality Review

```
"Review story 3.2"
"Run QA on this implementation"
"Validate acceptance criteria"
```

Slash form:
```bash
/qa-story docs/prd/.../stories/story.178.8.example-feature/
/qa-story story.178.8.example-feature.md
```

Process: risk assessment → requirements traceability → code quality review → test architecture → NFR validation → active refactoring (when safe) → standards compliance.

Outputs:
- `story.[epic].[story].qa.[number].[name].md`
- `story.[epic].[story].gate.[number].[name].yml`
- Bug reports if issues found

### `create-branch` — Branch Creation

```
"Create branch for story 178.8"
/create-branch story.178.8.example-feature.md
/create-branch --hotfix v1.2.1
/create-branch --release v1.3.0
```

Follows Gitflow: feature branches from `develop`, hotfixes from `main`.

### `create-pr` — Pull Requests

```
"Create a PR for this branch"
/create-pr
```

Pushes branch, detects target (`develop`/`main`), generates description from template, creates via `gh pr create`.

### `finalise` — Sprint Completion

```
"Finalise story 178.8"
"Mark this story as accepted"
```

Validates Definition of Done, updates status to `accepted`, generates Sprint Review artifacts. Reports gaps if DoD criteria unmet.

### `execute-checklist` — Validation

```
"Validate story with draft checklist"
"Run DoD checklist"
"Check architecture compliance"
```

Available: `story-draft-checklist.md`, `story-dod-checklist.md`, `change-checklist.md`, `architect-checklist.md`.

Modes: interactive (section-by-section, user confirms) or YOLO (one pass, comprehensive report).

### `create-epic` — Quick Epic Creation

```
"Create epic for user notifications"
"Add payment integration epic"
```

Use when: 1-3 stories, follows existing patterns, low risk, minimal architectural changes.

File naming: `epic.[number].[descriptive-name].md`. Check `/docs/epic-registry.md` for unique numbers.

## Configuration

Projects place `skills-config.yaml` at the project root. Key settings:

```yaml
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
devStoryLocation: nested   # stories nested inside epic directories
devDebugLog: .ai/debug-log.md
```

Platform detection (tracker and VCS) resolves from `skills-config.yaml` → env vars (`JIRA_URL`) → git remote → defaults to GitHub.

## Tips

### Skill Selection

- **Be specific** — "Create next story" beats "help with story"
- **Use natural language** — Skills activate based on intent
- **Reference explicitly** — Use `@skill-name` when you know which one
- **Prefer orchestrators** — `develop-story` and `develop-task` manage the full lifecycle

### Story & Epic Management

- Always check epic registry — epic numbers are globally unique
- Follow numbering: `epic.163.feature-name`
- Validate before implementing — run checklists early
- Review previous stories — learn from past implementations

### Quality & Validation

- Run checklists interactively for thorough review
- Use the appropriate checklist (Draft vs DoD vs Change)
- Address critical issues first (HIGH severity)
- Co-locate QA files with stories

### Version Control

- Use patch staging (`git add -p`) for mixed changes
- Split commits logically (feature vs refactor, backend vs frontend)
- Follow Conventional Commits
- Include detailed bullet bodies

### Architecture

- Start holistic — consider all layers
- Document rationale — explain technology choices
- Validate systematically — run architect checklist
- Design for change — progressive complexity

## Discovery & Help

```
"What skills are available for testing?"
"Which skill should I use for creating documentation?"
"List all QA-related skills"
"Show me the architect skill documentation"
"What does the qa-story skill do?"
```
