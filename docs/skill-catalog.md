# Skill Catalog

Categorized index of skills in this library. For detailed per-skill guides see [skills/](./skills/).

## Architecture & Design

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `architect` | Holistic system architecture and technical leadership | System design, architecture docs, technology selection, API design |
| `create-architecture-doc` | Create architecture documentation | New projects, documenting existing systems |
| `document-existing-project` | Generate brownfield documentation | Analyzing and documenting legacy codebases |
| `frontend-design` | Frontend-specific design guidance | UI/UX architecture, component design |

Common commands:

- `create-backend-architecture` — Backend/service architecture
- `create-brownfield-architecture` — Document existing project
- `create-front-end-architecture` — Frontend-specific architecture
- `create-full-stack-architecture` — Comprehensive full-stack docs

## Product Management & Planning

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `po` | Product Owner persona | Product decisions, requirements clarification |
| `pm-coordinator` | Project management coordination | Sprint planning, team coordination |
| `scrum-master` | Scrum master workflows | Story creation, sprint management |
| `analyst` | Business analysis | Requirements gathering, analysis |

PRD & Epic creation:

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `greenfield-prd` | Create PRD for new projects | Starting from scratch |
| `create-prd` | Create PRD for existing projects | Large enhancements (4+ stories) |
| `create-epic` | Create single epic | Medium enhancements (1-3 stories) |
| `brownfield-story` | Create single story | Small, isolated changes |
| `create-epics-from-shards` | Generate epics from PRD sections | Breaking down large PRDs |
| `shard-prd` | Break large PRD into sections | Managing complex documentation |

See [Product Management Skills](./skills/product-management.md) for detail.

## Story & Task Management

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `create-story` | Create next sequential story | "Create next story", "draft story 2.3" |
| `edit-epic` | Edit epic documents | Modifying epic goals, status, requirements |
| `edit-story` | Edit story documents | Modifying story AC, tasks, status |
| `validate-story` | Validate story completeness | Before implementation starts |
| `create-task` | Create technical task | Infrastructure, refactoring, tech debt |
| `parallel-stories` | Manage parallel story development | Multiple stories in progress |
| `epic-registry-manager` | Manage global epic numbering | Ensuring unique epic numbers |

Story creation workflow loads core configuration, identifies next story number, gathers requirements from epic, reviews previous story context, extracts architecture context, populates template, validates with checklist.

See [Story Management](./skills/story-management.md) for detail.

## Development & Implementation

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `develop` | Implement features | Story implementation |
| `nestjs-patterns` | NestJS best practices | Backend development with NestJS |
| `nestjs-debug` | Debug NestJS issues | Troubleshooting NestJS apps |
| `react-native-debug` | Debug React Native issues | Mobile app troubleshooting |
| `bsv-wallet-implementer` | BSV wallet implementation | Bitcoin SV wallet features |

Develop usage:
```bash
# Story directory (auto-discovers story file)
/develop docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/

# Specific story file
/develop docs/prd/.../story.178.8.swipe-actions-friend-requests.md

# Natural language
"Implement story 178.8"
"Use @develop for story.178.8.swipe-actions-friend-requests.md"
```

See [Development Skills](./skills/development.md) for detail.

## Testing & Quality Assurance

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `qa-planning` | Upfront test planning | Before implementation starts |
| `qa-review` | Comprehensive quality review | During/after implementation |
| `qa-gate` | Create quality gate decisions | Deployment readiness |
| `qa-create-task` | QA for technical tasks | Testing infrastructure changes |
| `fix-qa` | Apply QA-recommended fixes | Addressing QA findings |

Testing setup:

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `testing-setup-nestjs` | NestJS testing configuration | Backend test setup |
| `testing-setup-react-native` | React Native testing setup | Mobile test setup |
| `testing-setup-shared` | Shared testing utilities | Cross-platform testing |

Apply QA fixes:
```bash
/fix-qa docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/
/fix-qa docs/prd/.../story.178.8.qa.1.initial-review.md
/fix-qa docs/prd/.../story.178.8.gate.1.initial-review.yml
/fix-qa docs/prd/.../story.178.8.bug.1.swipe-animation-lag.md

# Natural language
"Apply fixes from QA report for story 178.8"
"Fix bugs in story.178.8.swipe-actions-friend-requests"
```

See [Quality Assurance Skills](./skills/quality-assurance.md) for detail.

## Validation & Enforcement

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `execute-checklist` | Generic checklist validation | Systematic validation against criteria |
| `execute-architect-checklist` | Architecture validation | Validating architecture docs |
| `documentation-standards-validator` | Documentation compliance | Ensuring doc standards |
| `api-endpoint-validator` | API endpoint validation | REST API compliance |
| `prisma-schema-validator` | Prisma schema validation | Database schema checks |
| `error-handling-enforcer` | Error handling patterns | Consistent error handling |
| `offline-first-enforcer` | Offline-first compliance | Offline capability validation |
| `platform-separation-validator` | Platform separation rules | Multi-platform architecture |
| `response-envelope-enforcer` | API response format | Consistent API responses |
| `security-implementation-reviewer` | Security review | Security best practices |
| `test-co-location-enforcer` | Test file organization | Test placement validation |
| `transaction-schema-validator` | Transaction data validation | Financial transaction schemas |
| `websocket-real-time-validator` | WebSocket implementation | Real-time feature validation |

## Bug & Issue Management

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `create-issue` | Create GitHub issues + local docs | PR reviews, ad-hoc work items |
| `create-bug-report` | Create bug reports | Issues found during formal QA |
| `correct-course` | Navigate project changes | When pivots or changes occur |
| `change-management` | Manage change impact | Assessing change effects |
| `change-checklist` | Change impact checklist | Systematic change evaluation |

Issue workflow (PR review → fix):
```bash
# 1. Create issue from PR review finding
/create-issue story.180.3.md "Fix debounce timing" --from-pr 123

# 2. Start work on the issue
/create-branch story.180.3.issue.1.debounce-timing.md

# 3. Implement, commit, PR (auto-closes GitHub issue)
/commit-changes && /create-pr
```

Issue vs bug:

| Scenario | Skill | Reason |
|----------|-------|--------|
| Found during PR review | `/create-issue` | Informal, needs tracking |
| Found during formal QA | `/create-bug-report` | QA workflow, severity |

## Documentation

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `create-doc` | Create documentation | General documentation needs |
| `create-frontend-spec` | Frontend specifications | UI/UX documentation |
| `document-project` | Document existing project | Brownfield documentation |
| `shard-doc` | Break large docs into sections | Managing large documents |
| `agent-md-refactor` | Refactor markdown docs | Improving doc structure |

## Version Control & Deployment (Gitflow)

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `create-branch` | Create Gitflow-compliant branches | Starting feature, hotfix, release work |
| `commit-changes` | Create quality git commits | "Commit changes", "create commit message" |
| `create-pr` | Create pull requests with gh CLI | Submitting code for review |
| `upgrading-expo` | Upgrade Expo SDK | React Native Expo upgrades |

Branch types:

| Branch Type | Created From | Merges Into | Command |
|-------------|--------------|-------------|---------|
| Feature | `develop` | `develop` | `/create-branch story.180.3.feature.md` |
| Hotfix | `main` | `main` & `develop` | `/create-branch --hotfix v1.2.1` |
| Release | `develop` | `main` & `develop` | `/create-branch --release v1.3.0` |

Commit work process: analyzes recent commits for style → inspects working tree → decides commit boundaries → stages changes (supports patch staging) → reviews staged changes → writes Conventional Commit messages → runs verification → repeats for multiple commits.

Create PR process: pushes current branch to remote → detects target branch (develop/main) → generates PR description from template → creates via `gh pr create` → returns PR URL.

## Research & Analysis

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `research-prompt` | Create research prompts | Technology research |
| `deep-research-prompt` | Deep research analysis | Comprehensive research |
| `create-research-prompt` | Generate research framework | Structured research needs |
| `brainstorming` | Brainstorming sessions | Ideation, problem-solving |

## UI/UX & Design

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `ux-expert` | UX expertise | User experience design |
| `generate-ui-prompt` | Generate UI prompts | UI generation guidance |
| `frontend-design` | Frontend design patterns | UI architecture |

## Utilities & Tools

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `create-skill` | Create new skills | Extending agent capabilities |
| `autoskill` | Automatic skill generation | Quick skill creation |
| `command-development` | Develop custom commands | Creating new commands |
| `performance-optimizer` | Performance optimization | Speed and efficiency improvements |
| `caching` | Caching strategies | Performance via caching |

## Skill Dependencies

Skills that call other skills:

- `scrum-master` → `create-story`, `execute-checklist`
- `create-story` → `execute-checklist`
- `architect` → `create-architecture-doc`, `execute-architect-checklist`
- `qa-review` → `create-bug-report`, `qa-gate`
- `correct-course` → `change-checklist`

Skills that use resources (loaded from each skill's `resources/` directory; the legacy `.bmad-core` directory was removed):

- `execute-checklist` → `resources/`
- `create-story` → inline configuration or explicit file references
- `architect` → `resources/technical-preferences.md`

## Most Important Skills to Know

1. `commit-changes` — quality git commits
2. `create-story` — sequential story creation
3. `edit-epic` — epic editing with cascade analysis
4. `edit-story` — story editing with validation
5. `architect` — system architecture
6. `qa-review` — quality assurance
7. `execute-checklist` — systematic validation
8. `create-epic` — quick epic creation
