# Workflows

Integrated chains assembled from the skills in this library. The unit of work in most chains is a **story** or **task**.

## Development Pipeline

### Story pipeline

```
validate-story → develop → qa-story → qa-fix (if needed) → finalise
```

Or use the automated orchestrator (preferred):

```
develop-story [story-file-path]
```

`develop-story` calls: `create-branch → review-story → develop → create-pr → qa-story → qa-fix (up to 5 cycles) → finalise → commit-changes`

See [`skills/develop-story/diagrams/develop-story.md`](../skills/develop-story/diagrams/develop-story.md) for a detailed sequence diagram and data-flow reference.

### Task pipeline

```
create-task → review-task → develop → qa-task → qa-fix (if needed) → finalise
```

Or use the automated orchestrator (preferred):

```
develop-task [task-file-path]
```

`develop-task` calls: `create-branch → review-task → develop → create-pr → qa-task → qa-fix (up to 5 cycles) → finalise → commit-changes`

See [`skills/develop-task/diagrams/develop-task.md`](../skills/develop-task/diagrams/develop-task.md) for a detailed sequence diagram and data-flow reference.

QA gate files (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) are owned by QA skills — dev skills must never modify gate files.

## Development Workflow Integration

```
Pre-Implementation:
validate-story → GO/NO-GO decision + readiness score
    ↓
Implementation:
develop → Task execution + tests + DoD checklist
    ↓
Post-Implementation QA:
qa-story → Gate file creation
    ↓
Fix Cycle (if needed):
qa-fix → Code/test changes → Ready for Review
    ↓
Done or Repeat Fix Cycle
```

Configuration (inline or via explicit file references):

```yaml
devStoryLocation: docs/stories
qa.qaLocation: docs/qa
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md
```

## Story Management Workflow Integration

```
Story Creation:
scrum-master → create-story → 10-step workflow → Story file with complete context
    ↓
Validation:
review-story → Interactive clarification + recommendations
    ↓ (or)
scrum-master → execute-checklist (story-draft-checklist) → READY/NEEDS REVISION
    ↓
Implementation:
develop → Uses story with complete context
    ↓
Change Management (if needed):
scrum-master → correct-course → Sprint Change Proposal
```

Parallel development variant:

```
scrum-master → parallel-stories → Epic coordination matrix + Worktree setup
    ↓
Multiple developers work simultaneously in isolated worktrees
    ↓
Merge in any order (no conflicts with proper file boundaries)
    ↓
Sequential stories after parallel work merges
```

## Task Management Workflow

Tasks cover non-story work: refactoring, infra changes, technical improvements.

```
Create:
create-task → Interactive task document with phases + success criteria
    ↓
Review:
review-task → Clarifying questions, gap/inconsistency identification
    ↓
Implement:
develop-task → Full automated lifecycle (branch → implement → QA → PR → finalise)
```

## Epic Workflow

```
1. epic-registry-manager → Assign unique epic number, validate filename, update registry
2. create-epic → Epic document with stories breakdown table
3. review-epic → Validate epic quality and completeness
4. create-story → Derive stories from epic
```

## QA Workflow Integration

```
1. qa-planning (Before/During Development)
   ├── Risk Profiling
   │   └── Outputs: risk-{date}.md, risk_summary YAML
   └── Test Design
       └── Outputs: test-design-{date}.md, test_design YAML

2. qa-story (During/After Implementation)
   ├── Story Review Process
   │   └── Outputs: story.{epic}.{story}.qa.{name}.md
   ├── NFR Assessment
   │   └── Outputs: nfr-{date}.md, nfr_validation YAML
   └── Requirements Traceability
       └── Outputs: trace-{date}.md, trace YAML

3. qa-gate (Quality Checkpoint)
   └── Gate Decision
       └── Outputs: story.{epic}.{story}.gate.{name}.yml
```

Cross-skill data flow:

- `qa-planning` → `qa-story`: risk profile and test design feed into review assessments
- `qa-story` → `qa-gate`: NFR validation, trace data, and issues feed into gate decisions
- `qa-planning` → `qa-gate`: risk summary directly influences gate status (≥9 → FAIL, ≥6 → CONCERNS)

QA file organization:

```
docs/
├── prd/
│   └── [domain]/
│       └── [feature]/
│           ├── story.1.1.md
│           └── story.1.1.qa.name.md  # QA report (co-located)
└── qa/
    ├── assessments/
    │   ├── 1.1-risk-20250130.md
    │   ├── 1.1-test-design-20250130.md
    │   ├── 1.1-nfr-20250130.md
    │   └── 1.1-trace-20250130.md
    └── gates/
        └── [mirrored-prd-structure]/
            └── story.1.1.gate.name.yml
```

## Jira Sync Workflows

Sync local markdown artifacts to Jira. All sync skills are idempotent: create on first run, update on subsequent runs.

```
Epic → Jira:
sync-jira-epic [epic-file-path]
  └── Creates/updates Jira epic, writes jira_key + jira_url to frontmatter

Story → Jira:
sync-jira-story [story-file-path]
  └── Creates/updates Jira story, links to parent epic, adds to backlog

Task → Jira:
sync-jira-task [task-file-path]
  └── Creates/updates standalone Jira task (not linked to epic)
```

Full Jira publish workflow:

```
1. sync-jira-epic   → Epic exists in Jira with jira_key in frontmatter
2. sync-jira-story  → Story linked to Jira epic, status driven from frontmatter
3. [During dev]     → Status transitions driven automatically by frontmatter status
```

`jira-epic-creator` is an alternative to `sync-jira-epic` for bulk epic creation from PRD documents.

## PM Workflow Chains

Greenfield product development:

```
1. deep-research-prompt (optional)
2. greenfield-prd → uses: create-doc + prd-template → validates: pm-checklist
3. shard-prd (if large)
4. create-epics-from-shards
5. → Handoff to UX Expert and Architect
```

Brownfield enhancement:

```
Large (4+ stories):    create-prd → pm-checklist → Architect
Medium (1-3 stories):  create-epic → Story Manager
Small (single session): brownfield-story → Direct implementation
```

Change management:

```
1. change-management → uses: correct-course + change-checklist
2. → Sprint Change Proposal
3. → Direct implementation OR PM/Architect handoff
```

PM natural activation examples:

| User Says                        | Activates                     | Because                             |
| -------------------------------- | ----------------------------- | ----------------------------------- |
| "Create PRD for new mobile app"  | `greenfield-prd`              | "new" + "PRD"                       |
| "Add feature to existing system" | `create-prd` or `create-epic` | "add" + "existing" (size-dependent) |
| "Story failed due to..."         | `change-management`           | "failed" + reason                   |
| "Validate my PRD"                | `pm-checklist`                | "validate" + "PRD"                  |

## Common End-to-End Workflows

### Starting a New Feature (Gitflow — Automated)

```
1. "Create epic for [feature name]"        → create-epic (+ epic-registry-manager)
2. "Create next story"                     → create-story
3. "Develop and QA this story end to end"  → develop-story (full orchestrated lifecycle)
```

### Starting a New Feature (Gitflow — Manual)

```
1. "Create epic for [feature name]"   → create-epic
2. "Create next story"                → create-story
3. "Validate story"                   → execute-checklist
4. /create-branch @story-file         → create-branch (feature/story.X.X from develop)
5. [Implement feature]                → develop
6. /commit-changes                    → commit-changes
7. "Review story X.Y"                 → qa-story
8. /create-pr                         → create-pr (PR to develop)
```

### New Project Setup

```
1. "Create full-stack architecture"   → architect
2. "Validate architecture"            → execute-architect-checklist
3. "Create PRD for [project]"         → greenfield-prd
4. "Create epics from PRD"            → create-epics-from-shards
5. "Create first story"               → create-story
```

### Brownfield Enhancement

```
1. "Document existing project"        → document-existing-project
2. "Create brownfield PRD for [X]"    → create-prd
3. "Create epic for [feature]"        → create-epic
4. "Create next story"                → create-story
5. [Implement]                        → develop-story
6. "Review implementation"            → qa-story
```

### Technical Task Workflow

```
1. "Create task for [refactor/infra]" → create-task
2. "Review this task"                 → review-task
3. "Develop and QA this task"         → develop-task (full orchestrated lifecycle)
4. "Sync task to Jira"               → sync-jira-task
```

### Bug Fix Workflow

```
1. [QA finds issue during review]     → qa-story
2. "Create bug report"                → create-bug-report
3. [Developer fixes bug]
4. [QA retests]                       → qa-story
5. "Commit fix"                       → commit-changes
```

### Hotfix Workflow (Emergency Production Fix)

```
1. /create-branch --hotfix v1.2.1     → create-branch (hotfix/v1.2.1 from main)
2. [Implement critical fix]
3. /commit-changes                    → commit-changes
4. "Run tests"                        → testing-setup-*
5. /create-pr                         → create-pr (PR to main)
6. [After merge to main] Tag release v1.2.1
7. [Create second PR to develop to propagate fix]
```

### Sprint Cycle

```
Sprint Planning:
1. "Create next story"                → create-story
2. "Validate story"                   → execute-checklist

Development:
3. [Implement]                        → develop-story
4. "Run tests"                        → testing-setup-*

Review:
5. "Review story"                     → qa-story
6. "Check DoD"                        → execute-checklist (DoD checklist)

Completion:
7. "Commit work"                      → commit-changes
8. [Deploy]
```

### Jira Sync Workflow

```
1. "Sync epic to Jira"               → sync-jira-epic
2. "Sync story to Jira"              → sync-jira-story
3. [Status changes in frontmatter]   → re-run sync to drive Jira transitions
```
