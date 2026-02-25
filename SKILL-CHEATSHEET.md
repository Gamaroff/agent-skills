# Skills Cheatsheet

A comprehensive guide to available skills and how to use them effectively.

---

## 📚 Table of Contents

- [What Are Skills?](#what-are-skills)
- [How to Use Skills](#how-to-use-skills)
- [Skill Categories](#skill-categories)
- [Quick Reference](#quick-reference)
- [Common Workflows](#common-workflows)
- [Creating New Skills](#creating-new-skills)

---

## What Are Skills?

Skills are modular, self-contained packages that extend AI agent capabilities by providing specialized knowledge, workflows, and tools. Each skill consists of:

- **SKILL.md** (required) - Instructions with YAML frontmatter metadata
- **scripts/** (optional) - Executable code for deterministic tasks
- **references/** (optional) - Documentation loaded into context as needed
- **assets/** (optional) - Files used in output (templates, boilerplate)

### Progressive Disclosure Design

Skills use a three-level loading system:

1. **Metadata** (name + description) - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed (unlimited)

---

## How to Use Skills

### Natural Language Triggers

Simply describe what you want to do, and the appropriate skill will activate:

```
"Create the next story for epic 2"
"Commit all changes"
"Run the architecture checklist"
"Document this existing project"
"Create a bug report for this issue"
```

### Explicit Skill Invocation

Reference a skill directly when you know which one you need:

```
"Use the @architect skill to create backend architecture"
"Run @qa-review on story 3.2"
"Execute @commit-changes skill"
```

### Slash Command Style

Many skills support slash command style invocation with file or directory paths. This is particularly useful for development and QA workflows:

```
/develop @story-directory
/qa-review @story-directory
/fix-qa @story-directory
```

**File Discovery:**

When you provide a story directory path, these skills automatically discover relevant files:

- **Story file:** `story.{epic}.{story}.{name}.md`
- **QA reports:** `story.{epic}.{story}.qa.{number}.*.md`
- **Gate files:** `story.{epic}.{story}.gate.{number}.*.yml`
- **Bug reports:** `story.{epic}.{story}.bug.*.md`

**Examples:**

```bash
# Implement a feature from a story directory
/develop docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/

# Review implementation in a story directory
/qa-review docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/

# Apply fixes from QA findings in a story directory
/fix-qa docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/

# You can also provide specific files
/develop docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/story.178.8.swipe-actions-friend-requests.md

/qa-review docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/story.178.8.swipe-actions-friend-requests.md

/fix-qa docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/story.178.8.qa.1.initial-review.md
```

**Supported Skills:**

| Skill           | Accepts Directory | Accepts Story File | Accepts QA/Gate/Bug Files                               |
| --------------- | ----------------- | ------------------ | ------------------------------------------------------- |
| **develop**     | ✅                | ✅                 | ❌                                                      |
| **qa-review**   | ✅                | ✅                 | ❌                                                      |
| **fix-qa**      | ✅                | ✅                 | ✅ (QA, Gate, Bug)                                      |
| **Naming Note** |                   |                    | QA/Gate files are numbered (e.g., `.qa.1.`, `.gate.1.`) |

---

## Skill Categories

### 🏗️ Architecture & Design

| Skill                         | Description                                           | When to Use                                                        |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| **architect**                 | Holistic system architecture and technical leadership | System design, architecture docs, technology selection, API design |
| **create-architecture-doc**   | Create architecture documentation                     | New projects, documenting existing systems                         |
| **document-existing-project** | Generate brownfield documentation                     | Analyzing and documenting legacy codebases                         |
| **frontend-design**           | Frontend-specific design guidance                     | UI/UX architecture, component design                               |

**Common Commands:**

- `create-backend-architecture` - Backend/service architecture
- `create-brownfield-architecture` - Document existing project
- `create-front-end-architecture` - Frontend-specific architecture
- `create-full-stack-architecture` - Comprehensive full-stack docs

---

### 📋 Product Management & Planning

| Skill              | Description                     | When to Use                                   |
| ------------------ | ------------------------------- | --------------------------------------------- |
| **po**             | Product Owner persona           | Product decisions, requirements clarification |
| **pm-coordinator** | Project management coordination | Sprint planning, team coordination            |
| **scrum-master**   | Scrum master workflows          | Story creation, sprint management             |
| **analyst**        | Business analysis               | Requirements gathering, analysis              |

**PRD & Epic Creation:**

| Skill                        | Description                      | When to Use                       |
| ---------------------------- | -------------------------------- | --------------------------------- |
| **greenfield-prd**           | Create PRD for new projects      | Starting from scratch             |
| **create-prd**               | Create PRD for existing projects | Large enhancements (4+ stories)   |
| **create-epic**              | Create single epic               | Medium enhancements (1-3 stories) |
| **brownfield-story**         | Create single story              | Small, isolated changes           |
| **create-epics-from-shards** | Generate epics from PRD sections | Breaking down large PRDs          |
| **shard-prd**                | Break large PRD into sections    | Managing complex documentation    |

---

### 📝 Story & Task Management

| Skill                     | Description                       | When to Use                                |
| ------------------------- | --------------------------------- | ------------------------------------------ |
| **create-story**          | Create next sequential story      | "Create next story", "draft story 2.3"     |
| **edit-epic**             | Edit epic documents               | Modifying epic goals, status, requirements |
| **edit-story**            | Edit story documents              | Modifying story AC, tasks, status          |
| **validate-story**        | Validate story completeness       | Before implementation starts               |
| **create-task**           | Create technical task             | Infrastructure, refactoring, tech debt     |
| **parallel-stories**      | Manage parallel story development | Multiple stories in progress               |
| **epic-registry-manager** | Manage global epic numbering      | Ensuring unique epic numbers               |

**Story Creation Workflow:**

1. Loads core configuration
2. Identifies next story number
3. Gathers requirements from epic
4. Reviews previous story context
5. Extracts architecture context
6. Populates comprehensive story template
7. Validates with checklist

---

### 🔨 Development & Implementation

| Skill                      | Description               | When to Use                     |
| -------------------------- | ------------------------- | ------------------------------- |
| **develop**                | Implement features        | Story implementation            |
| **nestjs-patterns**        | NestJS best practices     | Backend development with NestJS |
| **nestjs-debug**           | Debug NestJS issues       | Troubleshooting NestJS apps     |
| **react-native-debug**     | Debug React Native issues | Mobile app troubleshooting      |
| **bsv-wallet-implementer** | BSV wallet implementation | Bitcoin SV wallet features      |

**Develop Story Usage:**

```bash
# Using story directory (auto-discovers story file)
/develop docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/

# Using specific story file
/develop docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/story.178.8.swipe-actions-friend-requests.md

# Natural language
"Implement story 178.8"
"Use @develop for story.178.8.swipe-actions-friend-requests.md"
```

---

### 🧪 Testing & Quality Assurance

| Skill              | Description                   | When to Use                    |
| ------------------ | ----------------------------- | ------------------------------ |
| **qa-planning**    | Upfront test planning         | Before implementation starts   |
| **qa-review**      | Comprehensive quality review  | During/after implementation    |
| **qa-gate**        | Create quality gate decisions | Deployment readiness           |
| **qa-create-task** | QA for technical tasks        | Testing infrastructure changes |
| **fix-qa**         | Apply QA-recommended fixes    | Addressing QA findings         |

**QA Review Usage:**

```bash
# Using story directory (auto-discovers story file)
/qa-review docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/

# Using specific story file
/qa-review docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/story.178.8.swipe-actions-friend-requests.md

# Natural language
"Review story 178.8"
"Run QA on story.178.8.swipe-actions-friend-requests"
```

**Apply QA Fixes Usage:**

```bash
# Using story directory (auto-discovers story, QA, gate, and bug files)
/fix-qa docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/

# Using specific QA report
/fix-qa docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/story.178.8.qa.1.initial-review.md

# Using specific gate file
/fix-qa docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/story.178.8.gate.1.initial-review.yml

# Using specific bug report
/fix-qa docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/story.178.8.bug.1.swipe-animation-lag.md

# Natural language
"Apply fixes from QA report for story 178.8"
"Fix bugs in story.178.8.swipe-actions-friend-requests"
```

**Testing Setup:**

| Skill                          | Description                  | When to Use            |
| ------------------------------ | ---------------------------- | ---------------------- |
| **testing-setup-nestjs**       | NestJS testing configuration | Backend test setup     |
| **testing-setup-react-native** | React Native testing setup   | Mobile test setup      |
| **testing-setup-shared**       | Shared testing utilities     | Cross-platform testing |

---

### ✅ Validation & Enforcement

| Skill                                 | Description                  | When to Use                            |
| ------------------------------------- | ---------------------------- | -------------------------------------- |
| **execute-checklist**                 | Generic checklist validation | Systematic validation against criteria |
| **execute-architect-checklist**       | Architecture validation      | Validating architecture docs           |
| **documentation-standards-validator** | Documentation compliance     | Ensuring doc standards                 |
| **api-endpoint-validator**            | API endpoint validation      | REST API compliance                    |
| **prisma-schema-validator**           | Prisma schema validation     | Database schema checks                 |
| **error-handling-enforcer**           | Error handling patterns      | Consistent error handling              |
| **offline-first-enforcer**            | Offline-first compliance     | Offline capability validation          |
| **platform-separation-validator**     | Platform separation rules    | Multi-platform architecture            |
| **response-envelope-enforcer**        | API response format          | Consistent API responses               |
| **security-implementation-reviewer**  | Security review              | Security best practices                |
| **test-co-location-enforcer**         | Test file organization       | Test placement validation              |
| **transaction-schema-validator**      | Transaction data validation  | Financial transaction schemas          |
| **websocket-real-time-validator**     | WebSocket implementation     | Real-time feature validation           |

---

### 🐛 Bug & Issue Management

| Skill                 | Description                       | When to Use                   |
| --------------------- | --------------------------------- | ----------------------------- |
| **create-issue**      | Create GitHub issues + local docs | PR reviews, ad-hoc work items |
| **create-bug-report** | Create bug reports                | Issues found during formal QA |
| **correct-course**    | Navigate project changes          | When pivots or changes occur  |
| **change-management** | Manage change impact              | Assessing change effects      |
| **change-checklist**  | Change impact checklist           | Systematic change evaluation  |

**Issue Workflow (PR Review → Fix):**

```bash
# 1. Create issue from PR review finding
/create-issue story.180.3.md "Fix debounce timing" --from-pr 123

# 2. Start work on the issue
/create-branch story.180.3.issue.1.debounce-timing.md

# 3. Implement, commit, and PR
/commit-changes && /create-pr  # Auto-closes GitHub issue
```

**Issue vs Bug:**

| Scenario               | Skill                | Reason                   |
| ---------------------- | -------------------- | ------------------------ |
| Found during PR review | `/create-issue`      | Informal, needs tracking |
| Found during formal QA | `/create-bug-report` | QA workflow, severity    |

---

### 📖 Documentation

| Skill                    | Description                    | When to Use                 |
| ------------------------ | ------------------------------ | --------------------------- |
| **create-doc**           | Create documentation           | General documentation needs |
| **create-frontend-spec** | Frontend specifications        | UI/UX documentation         |
| **document-project**     | Document existing project      | Brownfield documentation    |
| **shard-doc**            | Break large docs into sections | Managing large documents    |
| **agent-md-refactor**    | Refactor markdown docs         | Improving doc structure     |

---

### 🔄 Version Control & Deployment (Gitflow)

| Skill              | Description                       | When to Use                               |
| ------------------ | --------------------------------- | ----------------------------------------- |
| **create-branch**  | Create Gitflow-compliant branches | Starting feature, hotfix, or release work |
| **commit-changes** | Create quality git commits        | "Commit changes", "create commit message" |
| **create-pr**      | Create pull requests with gh CLI  | Submitting code for review                |
| **upgrading-expo** | Upgrade Expo SDK                  | React Native Expo upgrades                |

**Gitflow Branch Workflow:**

```bash
# Start feature work from story or task
/create-branch @story-file-or-directory

# Make changes and commit
/commit-changes

# Create pull request when ready
/create-pr
```

**Branch Types (Gitflow):**

| Branch Type | Created From | Merges Into        | Command Example                         |
| ----------- | ------------ | ------------------ | --------------------------------------- |
| **Feature** | `develop`    | `develop`          | `/create-branch story.180.3.feature.md` |
| **Hotfix**  | `main`       | `main` & `develop` | `/create-branch --hotfix v1.2.1`        |
| **Release** | `develop`    | `main` & `develop` | `/create-branch --release v1.3.0`       |

**Commit Work Process:**

1. Analyzes recent commits for style
2. Inspects working tree
3. Decides commit boundaries
4. Stages changes (supports patch staging)
5. Reviews staged changes
6. Writes Conventional Commit messages
7. Runs verification
8. Repeats for multiple commits

**Create PR Process:**

1. Pushes current branch to remote
2. Detects correct target branch (develop/main)
3. Generates PR description from template
4. Creates PR via GitHub CLI (`gh pr create`)
5. Returns PR URL

---

### 🔍 Research & Analysis

| Skill                      | Description                 | When to Use               |
| -------------------------- | --------------------------- | ------------------------- |
| **research-prompt**        | Create research prompts     | Technology research       |
| **deep-research-prompt**   | Deep research analysis      | Comprehensive research    |
| **create-research-prompt** | Generate research framework | Structured research needs |
| **brainstorming**          | Brainstorming sessions      | Ideation, problem-solving |

---

### 🎨 UI/UX & Design

| Skill                  | Description              | When to Use            |
| ---------------------- | ------------------------ | ---------------------- |
| **ux-expert**          | UX expertise             | User experience design |
| **generate-ui-prompt** | Generate UI prompts      | UI generation guidance |
| **frontend-design**    | Frontend design patterns | UI architecture        |

---

### 🛠️ Utilities & Tools

| Skill                     | Description                | When to Use                       |
| ------------------------- | -------------------------- | --------------------------------- |
| **create-skill**          | Create new skills          | Extending agent capabilities      |
| **autoskill**             | Automatic skill generation | Quick skill creation              |
| **command-development**   | Develop custom commands    | Creating new commands             |
| **performance-optimizer** | Performance optimization   | Speed and efficiency improvements |
| **caching**               | Caching strategies         | Performance via caching           |

---

## Quick Reference

### Most Commonly Used Skills

#### 1. **commit-changes** - Git Commits

```
"Commit all changes"
"Create commit message for these changes"
"Split work into multiple commits"
```

**Features:**

- Analyzes recent commit style
- Supports patch staging (`git add -p`)
- Creates detailed Conventional Commit messages
- Splits unrelated changes into logical commits

---

#### 2. **create-story** - Story Creation

```
"Create the next story for epic 2"
"Draft story 3.4"
"Prepare story 1.1"
```

**Process:**

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

- Loads inline configuration or explicit file references
- Identifies next story number
- Extracts epic requirements
- Reviews previous story insights
- Gathers architecture context
- Populates comprehensive template
- Validates with checklist

**Anti-Hallucination Protocol:**

- All technical details extracted from docs
- Source citations required (`[Source: ...]`)
- No invention of libraries/patterns
- Explicit unknowns stated

---

#### 3. **architect** - Architecture

```
"Create backend architecture"
"Document this existing system"
"Research database options"
```

**Outputs:**

- Comprehensive architecture docs
- Technology stack with versions
- Data models and schemas
- API specifications
- Component diagrams
- Source tree structure
- Deployment plans
- Security strategies
- Testing approach

---

#### 4. **qa-review** - Quality Review

```
"Review story 3.2"
"Run QA on this implementation"
"Validate acceptance criteria"
```

**Slash Command Usage:**

```bash
# Story directory (auto-discovers story file)
/qa-review docs/prd/.../stories/story.178.8.swipe-actions-friend-requests/

# Specific story file
/qa-review story.178.8.swipe-actions-friend-requests.md
```

**Review Process:**

1. Risk assessment (determines depth)
2. Requirements traceability
3. Code quality review
4. Test architecture assessment
5. NFR validation (security, performance, reliability, maintainability)
6. Active refactoring (when safe)
7. Standards compliance check

**Outputs:**

- QA report: `story.[epic].[story].qa.[number].[name].md`
- Quality gate: `story.[epic].[story].gate.[number].[name].yml`
- Bug reports (if issues found)

---

#### 5. **execute-checklist** - Validation

```
"Validate story with draft checklist"
"Run DoD checklist"
"Check architecture compliance"
```

**Available Checklists:**

- `story-draft-checklist.md` - Story completeness
- `story-dod-checklist.md` - Definition of Done
- `change-checklist.md` - Change navigation
- `architect-checklist.md` - Architecture validation

**Interactive Mode:**

- Section-by-section review
- User confirmation between sections
- Detailed collaboration

---

#### 6. **create-epic** - Quick Epic Creation

```
"Create epic for user notifications"
"Add payment integration epic"
```

**When to Use:**

- 1-3 stories
- Follows existing patterns
- Low risk
- Minimal architectural changes

**File Naming:**

- Check `/docs/development/epic-registry.md`
- Use globally unique epic numbers
- Format: `epic.[number].[descriptive-name].md`

---

## Common Workflows

### 🎯 Starting a New Feature (Gitflow)

```
1. "Create epic for [feature name]" → create-epic
2. "Create next story" → create-story
3. "Validate story" → execute-checklist
4. /create-branch @story-file → create-branch (creates feature/story.X.X branch from develop)
5. [Implement feature] → develop
6. /commit-changes → commit-changes
7. "Review story X.Y" → qa-review
8. /create-pr → create-pr (opens PR to develop)
```

---

### 🏗️ New Project Setup

```
1. "Create full-stack architecture" → architect
2. "Validate architecture" → execute-architect-checklist
3. "Create PRD for [project]" → greenfield-prd
4. "Create epics from PRD" → create-epics-from-shards
5. "Create first story" → create-story
```

---

### 📦 Brownfield Enhancement

```
1. "Document existing project" → document-existing-project
2. "Create brownfield PRD for [enhancement]" → create-prd
3. "Create epic for [feature]" → create-epic
4. "Create next story" → create-story
5. [Implement] → develop
6. "Review implementation" → qa-review
```

---

### 🐛 Bug Fix Workflow

```
1. [QA finds issue during review] → qa-review
2. "Create bug report" → create-bug-report
3. [Developer fixes bug]
4. [QA retests] → qa-review
5. "Commit fix" → commit-changes
```

---

### 🚨 Hotfix Workflow (Emergency Production Fix)

```
1. /create-branch --hotfix v1.2.1 → create-branch (creates hotfix/v1.2.1 from main)
2. [Implement critical fix]
3. /commit-changes → commit-changes
4. "Run tests" → testing-setup-*
5. /create-pr → create-pr (opens PR to main)
6. [After merge to main] Tag the release v1.2.1
7. [Create second PR to develop to propagate fix]
```

---

### 🔄 Sprint Cycle

```
Sprint Planning:
1. "Create next story" → create-story
2. "Validate story" → execute-checklist

Development:
3. [Implement] → develop
4. "Run tests" → testing-setup-*

Review:
5. "Review story" → qa-review
6. "Check DoD" → execute-checklist (DoD checklist)

Completion:
7. "Commit work" → commit-changes
8. [Deploy]
```

---

## Creating New Skills

Use the **create-skill** skill to create new skills:

```
"Create a new skill for [purpose]"
"Help me build a skill for [workflow]"
```

### Skill Creation Process

1. **Understanding** - Gather concrete examples
2. **Planning** - Identify reusable resources needed
3. **Initialize** - Run `scripts/init_skill.py <skill-name>`
4. **Edit** - Customize SKILL.md and resources
5. **Package** - Run `scripts/package_skill.py <path>`
6. **Iterate** - Test and improve

### Skill Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/          - Executable code
    ├── references/       - Documentation
    └── assets/           - Templates, files
```

### Best Practices

**SKILL.md:**

- Use imperative/infinitive form (verb-first)
- Be specific in name and description
- Include "When to Use This Skill" section
- Provide clear workflow steps
- Include examples

**Resources:**

- **scripts/** - For repeatedly rewritten code
- **references/** - For documentation to load as needed
- **assets/** - For files used in output

**Writing Style:**

- Objective, instructional language
- "To accomplish X, do Y" (not "You should do X")
- Clear, actionable steps
- Avoid duplication between SKILL.md and references

---

## Tips & Best Practices

### 💡 Skill Selection

- **Be specific** - "Create next story" is better than "help with story"
- **Use natural language** - Skills activate based on intent
- **Reference explicitly** - Use `@skill-name` when you know which one
- **Check descriptions** - Each skill's description shows when to use it

### 📋 Story & Epic Management

- **Always check epic registry** - Epic numbers are globally unique
- **Follow numbering** - Use dots for structure: `epic.163.feature-name`
- **Validate before implementing** - Run checklists early
- **Review previous stories** - Learn from past implementations

### 🔍 Quality & Validation

- **Run checklists interactively** - Section-by-section review catches more
- **Use appropriate checklist** - Draft vs DoD vs Change
- **Address critical issues first** - Prioritize HIGH severity
- **Co-locate QA files** - Keep reports with stories

### 💾 Version Control

- **Use patch staging** - `git add -p` for mixed changes
- **Split commits logically** - Feature vs refactor, backend vs frontend
- **Follow Conventional Commits** - Required format
- **Include detailed bodies** - Bullet points listing specific changes

### 🏗️ Architecture

- **Start holistic** - Consider all layers
- **Document rationale** - Explain technology choices
- **Validate systematically** - Run architect checklist
- **Design for change** - Progressive complexity

---

## Skill Dependencies

### Skills That Call Other Skills

- **scrum-master** → create-story, execute-checklist
- **create-story** → execute-checklist
- **architect** → create-architecture-doc, execute-architect-checklist
- **qa-review** → create-bug-report, qa-gate
- **correct-course** → change-checklist

### Skills That Use Resources

> **Note**: .bmad-core directory was intentionally removed. Resources are now loaded from the skills' resources/ directory.

- **execute-checklist** → `resources/` (moved from the removed .bmad-core/checklists/)
- **create-story** → Inline configuration or explicit file references
- **architect** → `resources/technical-preferences.md`

---

## File Naming Conventions

### Stories

```
story.[epic].[story].[descriptive-name].md
Example: story.2.3.user-authentication.md
```

### Epics

```
epic.[number].[descriptive-name].md
Example: epic.163.user-notifications.md
```

### QA Reports

```
story.[epic].[story].qa.[number].[descriptive-name].md
Example: story.2.3.qa.1.authentication-review.md
```

### Quality Gates

```
story.[epic].[story].gate.[number].[descriptive-name].yml
Example: story.2.3.gate.1.authentication-review.yml
```

### Bug Reports

```
bug.[epic].[story].[bug-number].[descriptive-name].md
Example: bug.2.3.1.login-timeout.md
```

### Technical Tasks

```
task.[number].[descriptive-name].md
Example: task.44.database-migration.md
```

---

## Configuration Files

### Core Configuration

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

**Location**: Inline configuration or explicit file references

**Key Settings:**

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

### Epic Registry

**Location:** `/docs/development/epic-registry.md`

**Purpose:**

- Track globally unique epic numbers
- Prevent number conflicts
- Maintain epic catalog

---

## Getting Help

### Skill Documentation

Each skill has comprehensive documentation in its `SKILL.md` file:

```
"Show me the architect skill documentation"
"What does the qa-review skill do?"
```

### Skill Discovery

```
"What skills are available for testing?"
"Which skill should I use for creating documentation?"
"List all QA-related skills"
```

### Troubleshooting

```
"Why didn't the skill activate?"
"How do I use the commit-work skill?"
"What's the difference between create-prd and create-epic?"
```

---

## Additional Resources

- **Skill Creator Guide:** `.agents/skills/skill-creator/SKILL.md`
- **Architecture Checklist:** `.agents/skills/architect/resources/architect-checklist.md`
- **Story Template:** `.agents/skills/create-story/resources/story-template.yaml`
- **Commit Examples:** `.agents/skills/commit-work/SKILL.md`

---

## Summary

Skills extend AI agent capabilities with specialized workflows and knowledge. They:

✅ Provide structured, repeatable processes
✅ Ensure consistency and quality
✅ Reduce cognitive load
✅ Enable specialized expertise
✅ Support progressive disclosure
✅ Integrate with project workflows

**Most Important Skills to Know:**

1. **commit-work** - Quality git commits
2. **create-story** - Sequential story creation
3. **edit-epic** - Epic document editing with cascade analysis
4. **edit-story** - Story document editing with validation
5. **architect** - System architecture
6. **qa-review** - Quality assurance
7. **execute-checklist** - Systematic validation
8. **create-epic** - Quick epic creation

**Remember:** Skills activate based on natural language intent. Just describe what you want to accomplish, and the appropriate skill will engage!

---

_Last Updated: 2026-01-23_
_Skills Directory: `.agents/skills/`_
_Total Skills: 76+_
