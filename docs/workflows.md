# Workflows

Integrated chains assembled from the skills in this library. The unit of work in most chains is a **story**.

## BMAD Development Pipeline

The core story implementation workflow:

```
validate-story → develop → qa-review → qa-fix (if needed) → finalise
```

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
qa-review → Gate file creation
    ↓
Fix Cycle (if needed):
fix-qa → Code/test changes → Ready for Review
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

## QA Workflow Integration

```
1. qa-planning (Before/During Development)
   ├── Risk Profiling
   │   └── Outputs: risk-{date}.md, risk_summary YAML
   └── Test Design
       └── Outputs: test-design-{date}.md, test_design YAML

2. qa-review (During/After Implementation)
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

- `qa-planning` → `qa-review`: risk profile and test design feed into review assessments
- `qa-review` → `qa-gate`: NFR validation, trace data, and issues feed into gate decisions
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

| User Says | Activates | Because |
|-----------|-----------|---------|
| "Create PRD for new mobile app" | `greenfield-prd` | "new" + "PRD" |
| "Add feature to existing system" | `create-prd` or `create-epic` | "add" + "existing" (size-dependent) |
| "Story failed due to..." | `change-management` | "failed" + reason |
| "Validate my PRD" | `pm-checklist` | "validate" + "PRD" |

## Common End-to-End Workflows

### Starting a New Feature (Gitflow)

```
1. "Create epic for [feature name]"   → create-epic
2. "Create next story"                → create-story
3. "Validate story"                   → execute-checklist
4. /create-branch @story-file         → create-branch (feature/story.X.X from develop)
5. [Implement feature]                → develop
6. /commit-changes                    → commit-changes
7. "Review story X.Y"                 → qa-review
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
5. [Implement]                        → develop
6. "Review implementation"            → qa-review
```

### Bug Fix Workflow

```
1. [QA finds issue during review]     → qa-review
2. "Create bug report"                → create-bug-report
3. [Developer fixes bug]
4. [QA retests]                       → qa-review
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
3. [Implement]                        → develop
4. "Run tests"                        → testing-setup-*

Review:
5. "Review story"                     → qa-review
6. "Check DoD"                        → execute-checklist (DoD checklist)

Completion:
7. "Commit work"                      → commit-changes
8. [Deploy]
```
