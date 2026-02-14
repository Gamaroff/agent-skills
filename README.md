# Claude Skills

Skills provide specialized guidance and domain knowledge to Claude Code. Skills are automatically activated based on context and can be explicitly invoked when needed.

## Available Skills

### Development Skills

Development skills implement the BMAD (Build, Measure, Adapt, Deploy) methodology adapted for Claude Code, providing story-driven development workflows with comprehensive quality gates.

#### develop

**Purpose**: Main story implementation workflow with BMAD methodology

**When to use**:

- Implementing user stories from `docs/stories/`
- Starting new feature development
- Working through task sequences with tests
- Preparing code for review

**Key Features**:

- **Story-Driven Development**: Stories contain all needed context
- **Authorized Updates**: Only specific story sections (Tasks, Dev Agent Record, File List, Change Log, Status)
- **Blocking Conditions**: HALT for unapproved deps, ambiguous requirements, repeated failures
- **Completion Process**: Tasks → Tests → Validations → execute-checklist → Ready for Review

**Workflow Order**:

```
1. Read task → Implement → Write tests → Execute validations
2. If ALL pass → Update task checkbox [x]
3. Update story File List
4. Repeat until complete
5. Run execute-checklist for story-dod-checklist
6. Set status 'Ready for Review'
```

**Related**: Works with `fix-qa` (QA feedback) and `validate-story` (pre-implementation validation)

---

#### fix-qa

**Purpose**: Systematically implement fixes based on QA feedback

**When to use**:

- QA has created gate file (PASS/CONCERNS/FAIL/WAIVED)
- QA assessments available (test design, traceability, risk, NFR)
- Need to close coverage gaps
- Addressing high-severity issues

**Activation**: "Fix QA for story 2.2" / "Implement QA feedback"

**Priority Order** (deterministic, risk-first):

1. High severity items (security/performance/reliability)
2. NFR FAIL statuses → then CONCERNS
3. Test design coverage_gaps (P0 scenarios first)
4. Trace uncovered requirements (AC-level gaps)
5. Risk must_fix recommendations
6. Medium/low severity issues

**Workflow**:

```
0. Load config & locate story
1. Collect QA findings (gate YAML + assessments)
2. Build deterministic fix plan
3. Apply code/test changes
4. Validate (lint + tests passing)
5. Update story file (authorized sections only)
6. DO NOT edit gate files (QA ownership)
```

**Authorized Story Updates**:

- Tasks/Subtasks checkboxes
- Dev Agent Record (model, debug log, completion notes, file list)
- Change Log
- Status (Ready for Done if PASS + gaps closed, else Ready for Review)

**Outputs**: Code fixes, tests, updated story sections

**Related**: Called by `develop`, works with QA gate files from `qa-gate` skill

---

#### validate-story

**Purpose**: Pre-implementation story validation with anti-hallucination focus

**When to use**:

- Before starting development
- Product managers/scrum masters need validation
- Ensuring story completeness and accuracy
- Getting implementation readiness assessment

**Activation**: "Validate story 2.2" / "Is this story ready for implementation?"

**10 Validation Steps**:

1. Template Completeness (all sections, no placeholders)
2. File Structure & Source Tree (paths, directories, sequence)
3. UI/Frontend Completeness (components, styling, interactions)
4. Acceptance Criteria Satisfaction (coverage, testability, edge cases)
5. Validation & Testing Instructions (test approach, scenarios)
6. Security Considerations (auth, data protection, vulnerabilities)
7. Tasks/Subtasks Sequence (order, dependencies, granularity)
8. **Anti-Hallucination Verification** (source traceability, no invented details)
9. Dev Agent Implementation Readiness (self-contained context)
10. Generate Validation Report (GO/NO-GO decision)

**Report Sections**:

- Template Compliance Issues
- Critical Issues (Must Fix - Story Blocked)
- Should-Fix Issues (Important Quality)
- Nice-to-Have Improvements (Optional)
- **Anti-Hallucination Findings** (unverifiable claims, invented libraries)
- Final Assessment (GO/NO-GO, 1-10 readiness score, confidence level)

**Example Output**:

```
Decision: NO-GO
Implementation Readiness Score: 4/10
Confidence Level: Low

Critical Issues (2):
- Missing API endpoint specification
- AC4 not covered by tasks

Anti-Hallucination Findings (1):
- Invented library "react-native-navigation-pro" not in tech stack
```

**Related**: Use before `develop`, complements `qa-planning`

---

### Development Workflow Integration

The development skills form an integrated story implementation workflow:

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

**Configuration**: All skills use `.bmad-core/core-config.yaml`:

```yaml
devStoryLocation: docs/stories
qa.qaLocation: docs/qa
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md
```

---

### Story Management Skills

Story management skills provide systematic workflows for story creation, validation, and change navigation. Converted from BMAD Core Scrum Master agent.

#### scrum-master

**Purpose**: Story creation coordinator and agile process guidance

**When to use**:

- Create next story in sequence
- Generate parallel stories for simultaneous development
- Validate story completeness
- Navigate project pivots and blockers
- Coordinate agile development workflows

**Activation**: "Create next story for epic 2" / "Validate story readiness" / "We hit a blocker"

**Key Capabilities**:

- **Story Creation**: Complete 10-step workflow with anti-hallucination safeguards
- **Parallel Stories**: Git worktree-based parallel development setup
- **Story Validation**: Comprehensive completeness checks
- **Change Navigation**: Structured pivot and blocker handling

**Calls these skills**:

- `create-story` - Primary story creation workflow
- `parallel-stories` - Parallel development setup
- `execute-checklist` - Story validation
- `correct-course` - Change management

**Related**: Works with `develop` (developers) and `validate-story` (PO validation)

---

#### create-story

**Purpose**: Primary workflow for creating next logical story with complete context

**When to use**:

- Create next sequential story in epic
- Prepare new story with developer context
- Extract requirements from PRD and architecture

**Activation**: "Create next story for epic 2" / "Draft story 3.4"

**7 Sequential Steps**: 0. Load core configuration (project structure)

1. Identify next story (epic analysis, numbering)
2. Gather story requirements and previous context
3. Gather architecture context (tech stack, structure, standards)
4. Verify project structure alignment
5. Populate story template with full context
6. Complete draft and validate with checklist

**Anti-Hallucination Protocol** (CRITICAL):

- NEVER invent technical details
- ALL technical details extracted from source documents
- MANDATORY source references: `[Source: architecture/file.md#section]`
- If not in docs → mark as "To be determined"

**Dev Notes Requirements**:

- Previous story insights
- Data models with sources
- API specifications with sources
- Component specs with sources
- File locations from project structure
- Testing requirements with sources
- Technical constraints with sources

**Output**: Comprehensive story file at `{devStoryLocation}/{epic}.{story}.story.md`

**Related**: Called by `scrum-master`, used by `develop`

---

#### parallel-stories

**Purpose**: Generate stories for parallel development with Git worktrees

**When to use**:

- Setup parallel development for multiple teams
- Maximize velocity with concurrent work
- Enable development without merge conflicts

**Activation**: "Create parallel stories for epic 3" / "Setup parallel development"

**Numbering Scheme**:

- Parallel: Story 1-1, 1-2, 1-3 (simultaneous)
- Sequential: Story 2, 3, 4 (ordered)

**Workflow**:

1. Epic analysis for parallel opportunities
2. Dependency mapping
3. Generate parallel story set (1-X numbering)
4. Git worktree setup commands
5. Populate enhanced story templates
6. Create coordination matrix

**Coordination Matrix**: Overview file showing:

- Parallel stories table with worktrees
- Sequential stories with dependencies
- Integration plan
- Conflict resolution strategy

**Example Structure**:

```
docs/stories/
├── epic-1-coordination.md
├── 1.1-1.login-ui.md (parallel)
├── 1.1-2.jwt-service.md (parallel)
├── 1.1-3.auth-middleware.md (parallel)
├── 1.2.integration-testing.md (sequential - requires 1-1,1-2,1-3)
└── 1.3.password-reset.md (sequential)

../worktrees/
├── story-1-1/ (Git worktree)
├── story-1-2/ (Git worktree)
└── story-1-3/ (Git worktree)
```

**Benefits**: 50-70% reduction in epic completion time with proper planning

**Related**: Called by `scrum-master`

---

#### execute-checklist

**Purpose**: Generic checklist validation engine (updated - now includes story validation)

**When to use**:

- Validate story completeness (story-draft-checklist)
- Verify developer completion (story-dod-checklist)
- Assess change impacts (change-checklist)
- Execute any quality gate with structured criteria

**Activation**: "Validate story 2.3 with story draft checklist" / "Run DoD checklist"

**Execution Modes**:

- **Interactive**: Section by section with discussion (thorough)
- **YOLO**: All at once with comprehensive report (recommended, efficient)

**Core Checklists**:

- `story-draft-checklist.md` - Story completeness before implementation
- `story-dod-checklist.md` - Developer Definition of Done
- `change-checklist.md` - Change navigation guidance

**Validation Markers**:

- ✅ PASS - Requirement clearly met
- ❌ FAIL - Requirement not met
- ⚠️ PARTIAL - Needs improvement
- N/A - Not applicable (with rationale)

**Report Structure**:

- Executive summary
- Overall results (pass/fail rates)
- Section breakdown with findings
- Critical issues list
- Improvement recommendations
- Detailed analysis available

**Related**: Called by `scrum-master`, `create-story`, `correct-course`, `develop`

---

#### correct-course

**Purpose**: Change management for pivots, blockers, and requirement changes

**When to use**:

- Project pivots due to new requirements
- Technical blockers preventing progress
- Failed stories requiring new approaches
- Discovered missing requirements
- Scope adjustments to MVP or epics

**Activation**: "We hit a blocker on story 2.1" / "Requirements changed" / "Need to reassess"

**Workflow**:

1. Initial setup & mode selection (Incremental vs YOLO)
2. Execute change-checklist analysis (Sections 1-4)
   - Understand trigger & context
   - Epic impact assessment
   - Artifact conflict analysis
   - Path forward evaluation
3. Draft proposed changes (exact edits for affected artifacts)
4. Generate Sprint Change Proposal document
5. Finalize & determine next steps (PO/SM implementation vs PM/Architect handoff)

**Sprint Change Proposal Includes**:

- Analysis summary (trigger, impact, rationale)
- Specific proposed edits (exact before/after for stories, epics, PRD, architecture)
- Impact assessment (scope, timeline)
- Next steps and handoff requirements

**Path Options Evaluated**:

- Direct Adjustment: Modify/add future stories
- Rollback: Revert completed work
- Re-scope MVP: Adjust scope or goals

**Output**: `docs/change-proposals/sprint-change-{date}-{issue}.md`

**Related**: Called by `scrum-master`, uses `execute-checklist`

---

#### edit-epic

**Purpose**: Edit epic documents with cascade analysis and validation

**When to use**:

- Modify epic goals, descriptions, or requirements
- Update epic status, priority, or dependencies
- Add/remove/update success criteria or story breakdowns
- Full section rewrites with validation

**Activation**: "/edit-epic docs/prd/.../epic.178.user-discovery-ui/" / "Edit epic 178 to change priority"

**Key Features**:

- **File Type Validation**: Rejects story files with appropriate message
- **Cascade Analysis**: Detects conflicts with child stories before applying changes
- **Comprehensive Validation**: YAML frontmatter, required sections, status values, naming conventions
- **Diff Preview**: Shows changes before applying with user approval required

**Input Handling**:

- Directory path (auto-discovers epic file)
- Direct epic file path
- Natural language with edit instructions

**Workflow**:

1. Resolve input and discover epic file
2. Validate file type (reject if story)
3. Pre-edit validation checks
4. Analyze cascade effects on child stories
5. Present conflict report (if any)
6. Show diff preview
7. Apply changes after approval

**Related**: Works with `create-epic`, `create-epics-from-shards`, `edit-story`

---

#### edit-story

**Purpose**: Edit story documents with comprehensive validation

**When to use**:

- Modify story statements or acceptance criteria
- Update story status, priority, tasks, or dependencies
- Add/remove implementation details
- Full section rewrites with validation

**Activation**: "/edit-story docs/prd/.../stories/story.323.2.emergency-recovery-unlock/" / "Edit story 323.2 to add new AC"

**Key Features**:

- **File Type Validation**: Rejects epic files with appropriate message
- **Comprehensive Validation**: YAML frontmatter, required sections, status values, naming conventions
- **Diff Preview**: Shows changes before applying with user approval required

**Input Handling**:

- Directory path (auto-discovers story file)
- Direct story file path
- Natural language with edit instructions

**Workflow**:

1. Resolve input and discover story file
2. Validate file type (reject if epic)
3. Pre-edit validation checks
4. Show diff preview
5. Apply changes after approval

**Related**: Works with `create-story`, `develop`, `qa-review`, `edit-epic`

---

### Story Management Workflow Integration

The story management skills form an integrated workflow:

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

**Parallel Development Variant**:

```
scrum-master → parallel-stories → Epic coordination matrix + Worktree setup
    ↓
Multiple developers work simultaneously in isolated worktrees
    ↓
Merge in any order (no conflicts with proper file boundaries)
    ↓
Sequential stories after parallel work merges
```

**Configuration**: Uses `.bmad-core/core-config.yaml`:

```yaml
devStoryLocation: docs/stories
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
```

---

### Quality Assurance Skills

The QA skills work together to provide comprehensive quality assurance throughout the development lifecycle.

#### qa-planning

**Purpose**: Upfront test planning and risk assessment before/during development

**When to use**:

- Before Development: Planning test strategy for upcoming stories
- During Sprint Planning: Assessing risks for proposed features
- Architecture Review: Identifying technical/security risks in designs
- Test Design: Creating comprehensive test scenarios with appropriate levels and priorities

**Key Features**:

- **Risk Profiling**: Probability × impact analysis (TECH, SEC, PERF, DATA, BUS, OPS risks)
- **Test Design**: Comprehensive test scenarios with level recommendations (unit/integration/e2e)
- **Priority Assignment**: P0/P1/P2/P3 classification for test scenarios
- **Risk Scoring**: 1-9 risk scores with mitigation strategies

**Outputs**:

- Risk profile report: `{qa.qaLocation}/assessments/{epic}.{story}-risk-{YYYYMMDD}.md`
- Test design document: `{qa.qaLocation}/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md`
- Gate YAML blocks for risk_summary and test_design

**Related**: Use with `qa-review` (review phase) and `qa-gate` (gate decisions)

---

#### qa-review

**Purpose**: Comprehensive quality review during/after implementation

**When to use**:

- Story Review: When developer marks story as "Review" or "Ready for QA"
- NFR Validation: Assessing security, performance, reliability, maintainability
- Requirements Traceability: Mapping acceptance criteria to test coverage
- Code Quality Assessment: Evaluating architecture, refactoring opportunities, technical debt

**Key Features**:

- **Story Review Process**: Adaptive test architecture review (depth scales with risk)
- **NFR Assessment**: Core four NFRs (security, performance, reliability, maintainability)
- **Requirements Traceability**: Given-When-Then mapping of requirements to tests
- **Active Refactoring**: Code improvements during review (when safe)
- **Comprehensive Analysis**: Architecture, test quality, testability, technical debt

**Outputs**:

- QA report file: `story.[epic].[story].qa.[descriptive-name].md` (co-located with story)
- NFR assessment: `{qa.qaLocation}/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md`
- Traceability matrix: `{qa.qaLocation}/assessments/{epic}.{story}-trace-{YYYYMMDD}.md`
- Quality gate file: `{qa.qaLocation}/gates/[prd-path]/story.[epic].[story].gate.[descriptive-name].yml`
- Gate YAML blocks for nfr_validation and trace

**File Authorization**:

- **CRITICAL**: Only QA report reference links allowed in story files
- Never add QA content directly to story files
- QA reports co-located with story files
- Gate files in mirrored PRD directory structure

**Related**: Use after `qa-planning` (risk/test inputs) and before `qa-gate` (gate formalization)

---

#### qa-gate

**Purpose**: Create or update quality gate decision files with clear PASS/CONCERNS/FAIL/WAIVED status

**When to use**:

- After Story Review: When qa-review skill has completed comprehensive assessment
- Creating Gate Files: Formalizing quality decisions in standardized YAML format
- Updating Gates: Revising gate status after bug fixes or improvements
- Gate Decisions: Determining status based on risk, NFR, and test findings

**Key Features**:

- **Deterministic Decisions**: Clear rules for PASS/CONCERNS/FAIL/WAIVED
- **Issue Classification**: Fixed severity scale (low/medium/high), standard prefixes (SEC-, PERF-, etc.)
- **Quality Scoring**: 0-100 score based on FAIL (-20) and CONCERNS (-10) deductions
- **Traceability**: Links to risk assessments, NFR validations, test coverage
- **Advisory Guidance**: Informs teams without blocking progress

**Gate Decision Criteria** (apply in order):

1. Risk thresholds: Score ≥9 → FAIL, ≥6 → CONCERNS
2. Test coverage gaps: P0 missing → CONCERNS, security P0 missing → FAIL
3. Issue severity: High → FAIL, Medium → CONCERNS
4. NFR statuses: Any FAIL → FAIL, any CONCERNS → CONCERNS, else → PASS
5. Waived: Only when waiver.active: true with reason/approver

**Outputs**:

- Gate file: `{qa.qaLocation}/gates/[prd-path]/story.[epic].[story].gate.[descriptive-name].yml`

**Gate Statuses**:

- **PASS**: All criteria met, no blocking issues
- **CONCERNS**: Non-blocking issues, can proceed with awareness
- **FAIL**: Critical issues, recommend return to InProgress
- **WAIVED**: Issues explicitly accepted with approval

**Related**: Use after `qa-review` to formalize decisions using data from `qa-planning` and `qa-review`

---

## QA Workflow Integration

The three QA skills form an integrated quality assurance workflow:

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

### Cross-Skill Data Flow

- **qa-planning → qa-review**: Risk profile and test design feed into review assessments
- **qa-review → qa-gate**: NFR validation, trace data, and issues feed into gate decisions
- **qa-planning → qa-gate**: Risk summary directly influences gate status (≥9 → FAIL, ≥6 → CONCERNS)

### File Organization

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

---

## Configuration

QA skills expect configuration in `bmad-core/core-config.yaml`:

```yaml
qa:
  qaLocation: 'docs/qa' # Base directory for QA files
devStoryLocation: 'docs/prd' # Story files location
```

---

## How Skills Work

### Automatic Activation

Claude Code automatically loads relevant skills based on:

- Current task context
- Files being worked on
- User's request
- Conversation context

### Explicit Invocation

Skills can be explicitly invoked using the Skill tool:

```
Use the qa-planning skill to assess risks for story 1.3
Use the qa-review skill to review this implementation
Use the qa-gate skill to create a quality gate decision
```

### Cross-References

Skills reference each other for integrated workflows:

- qa-planning references qa-review and qa-gate
- qa-review references qa-planning and qa-gate
- qa-gate references qa-planning and qa-review

---

## Key Principles

1. **Self-Contained**: All guidance contained in SKILL.md files
2. **Context-Aware**: Skills provide guidance adapted to current situation
3. **Flexible**: Recommendations, not rigid requirements
4. **Integrated**: Skills work together for comprehensive workflows
5. **Interactive**: Use AskUserQuestion when context is unclear
6. **Actionable**: Provide concrete outputs (files, YAML blocks, reports)
7. **Traceable**: Link assessments, reviews, and gate decisions
8. **Advisory**: Guide teams without blocking progress

---

## Skill Development

### Adding New Skills

1. Create directory: `.claude/skills/skill-name/`
2. Create SKILL.md with YAML frontmatter:
   ```yaml
   ---
   name: skill-name
   description: Brief description of when to use this skill
   ---
   ```
3. Add skill content using markdown
4. Update this README.md

### Skill File Structure

```markdown
---
name: skill-name
description: When and how to use this skill
---

# Skill Title

## When to Use This Skill

[Clear guidance on when to invoke this skill]

## Key Features

[What the skill provides]

## Process/Workflow

[Step-by-step guidance]

## Outputs

[What the skill produces]

## Integration with Other Skills

[Cross-references to related skills]

## Key Principles

[Core guidelines]
```

---

---

## Product Management Skills

The PM skills provide comprehensive product management workflows with natural language activation. Converted from BMAD Core system.

### Core Workflow Skills

#### pm-coordinator

**Purpose**: Navigation hub routing to specialized PM skills

**When to use**:

- User needs PM help but unclear which workflow
- Want overview of available PM tools

**Activation**: "What PM tools are available?" / "Help me with product management"

---

#### greenfield-prd

**Purpose**: Create comprehensive PRDs for new products from scratch

**When to use**:

- Starting completely new product
- Major feature without existing codebase constraints

**Activation**: "Create a PRD for a new task management app"

**Workflow**: Pre-flight → Interactive PRD creation (`create-doc` + `prd-template`) → `pm-checklist` validation → Handoff prompts

---

#### create-prd

**Purpose**: Create PRDs for significant enhancements to existing projects (4+ stories)

**When to use**:

- Large enhancement with architectural changes
- Substantial modifications requiring comprehensive planning

**Activation**: "Add payment processing to our existing app"

**Key features**: Project analysis, compatibility requirements, integration verification, technical debt awareness

**Decision tree**: 4+ stories → THIS | 1-3 stories → `create-epic` | Single session → `brownfield-story`

---

#### change-management

**Purpose**: Orchestrate structured response to significant project changes

**When to use**:

- Story fails or reveals major issue
- Technical dead-end discovered
- Pivot needed

**Activation**: "Story 3.2 failed because API doesn't exist"

**Workflow**: Setup → `change-checklist` analysis → Draft proposed changes → Sprint Change Proposal → Handoff decision

---

### Task Skills

#### create-doc

**Purpose**: YAML-driven document creation engine with mandatory user interaction

**When to use**: Creating documents from YAML templates (typically invoked by other skills)

**Key features**: Section-by-section processing, mandatory 1-9 elicitation format, detailed rationale, YOLO mode toggle

---

#### shard-prd

**Purpose**: Split large PRDs into smaller, manageable markdown files

**When to use**: PRD is large (>5 epics, >30 stories, >500 lines)

**Activation**: "Split my PRD into smaller files"

**Methods**: Automatic (markdown-tree-parser) or manual fallback

---

#### create-epics-from-shards

**Purpose**: Convert PRD shards into implementation epic files

**When to use**: After PRD sharding, need actionable development epics

**Activation**: "Create epics from the sharded PRD"

---

#### create-epic

**Purpose**: Create single epic for medium-sized brownfield enhancements (1-3 stories)

**When to use**: Medium enhancement, no significant architectural changes, follows existing patterns

**Activation**: "Add push notifications to existing app"

---

#### brownfield-story

**Purpose**: Create single user story for tiny brownfield changes (2-4 hours)

**When to use**: Single-session enhancement, straightforward integration, isolated change

**Activation**: "Add logout button to settings"

---

#### deep-research-prompt

**Purpose**: Generate comprehensive research prompts for various analysis types

**When to use**: Market validation needed, competitive intelligence, user research

**Activation**: "Generate market research prompt for mobile banking"

**9 Research Types**: Product Validation, Market Opportunity, User & Customer, Competitive Intelligence, Technology & Innovation, Industry & Ecosystem, Strategic Options, Risk & Feasibility, Custom Focus

---

#### execute-checklist

**Purpose**: Generic checklist validation engine

**When to use**: Validate document against any checklist from `.bmad-core/checklists/`

**Activation**: "Run architecture checklist on docs/architecture.md"

**Features**: Fuzzy checklist matching, interactive or YOLO mode, pass/fail rates

---

### Template & Validation Skills

#### prd-template

**Purpose**: Greenfield PRD template structure and guidance

**Used by**: `create-doc` and `greenfield-prd`

**Sections**: Goals, Requirements, UI Goals, Technical Assumptions, Epic List, Epic Details, Checklist Results, Next Steps

---

#### create-prd-template

**Purpose**: Brownfield PRD template for existing project enhancements

**Used by**: `create-doc` and `create-prd`

**Key differences**: Intro Project Analysis, Compatibility Requirements, Integration Verification, technical debt focus

---

#### pm-checklist

**Purpose**: Comprehensive PRD validation with 60+ checks across 9 categories

**When to use**: Validate PRD quality, check if ready for architect handoff

**Activation**: "Is my PRD ready for the architect?"

**9 Categories**: Problem Definition, MVP Scope, UX Requirements, Functional Requirements, Non-Functional Requirements, Epic & Story Structure, Technical Guidance, Cross-Functional Requirements, Clarity & Communication

---

#### change-checklist

**Purpose**: Change impact assessment framework with 6 sections

**Used by**: `correct-course` and `change-management`

**6 Sections**: Understand Trigger, Epic Impact, Artifact Conflict, Path Forward, Sprint Change Proposal, Final Review

---

#### correct-course

**Purpose**: Internal workflow skill for change management execution (invoked by `change-management`)

---

### PM Workflow Chains

**Greenfield Product Development**:

```
1. deep-research-prompt (optional)
2. greenfield-prd → uses: create-doc + prd-template → validates: pm-checklist
3. shard-prd (if large)
4. create-epics-from-shards
5. → Handoff to UX Expert and Architect
```

**Brownfield Enhancement**:

```
Large (4+ stories): create-prd → pm-checklist → Architect
Medium (1-3 stories): create-epic → Story Manager
Small (single session): brownfield-story → Direct implementation
```

**Change Management**:

```
1. change-management → uses: correct-course + change-checklist
2. → Sprint Change Proposal
3. → Direct implementation OR PM/Architect handoff
```

### PM Natural Activation Examples

| User Says                        | Activates                     | Because                             |
| -------------------------------- | ----------------------------- | ----------------------------------- |
| "Create PRD for new mobile app"  | `greenfield-prd`              | "new" + "PRD"                       |
| "Add feature to existing system" | `create-prd` or `create-epic` | "add" + "existing" (size-dependent) |
| "Story failed due to..."         | `change-management`           | "failed" + reason                   |
| "Validate my PRD"                | `pm-checklist`                | "validate" + "PRD"                  |

---

## Resources

- **Claude Code Documentation**: https://docs.claude.com/en/docs/claude-code
- **Skills Overview**: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- **Project Documentation**: See `CLAUDE.md` for Goji system guidelines
