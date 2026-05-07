# Conventions

File naming and configuration conventions used across skills.

## File Naming

### Stories

```
story.{epic}.{story}.{descriptive-name}.md
Example: story.2.3.user-authentication.md
```

### Epics

```
epic.{number}.{descriptive-name}.md
Example: epic.163.feature-notifications.md
```

### QA Reports

```
story.{epic}.{story}.qa.{number}.{descriptive-name}.md
Example: story.2.3.qa.1.authentication-review.md
```

### Quality Gates

```
story.{epic}.{story}.gate.{number}.{descriptive-name}.yml
Example: story.2.3.gate.1.authentication-review.yml
```

### Bug Reports

```
bug.{epic}.{story}.{bug-number}.{descriptive-name}.md
Example: bug.2.3.1.login-timeout.md
```

### Technical Tasks

```
task.{number}.{descriptive-name}.md
Example: task.44.database-migration.md
```

## Configuration

Projects using these skills place a `skills-config.yaml` at the project root. All available settings:

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
```

### Common Settings

```yaml
devStoryLocation: docs/stories
devDebugLog: .ai/debug-log.md

prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epic-{n}*.md"

architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4
```

### QA-Specific

```yaml
qa:
  qaLocation: "docs/qa" # Base directory for QA files
devStoryLocation: "docs/prd" # Story files location
```

## Epic Registry

**Location:** `/docs/development/epic-registry.md`

Purpose:

- Track globally unique epic numbers
- Prevent number conflicts
- Maintain epic catalog

Always check the registry before creating an epic — epic numbers are globally unique across the project.
