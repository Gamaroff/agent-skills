# Story Management Skills

Systematic workflows for story creation, validation, and change navigation. Converted from BMAD Core Scrum Master agent.

For the integrated chain see [Workflows](../workflows.md#story-management-workflow-integration).

## `scrum-master`

**Purpose:** Story creation coordinator and agile process guidance.

**When to use:**

- Create next story in sequence
- Generate parallel stories for simultaneous development
- Validate story completeness
- Navigate project pivots and blockers
- Coordinate agile development workflows

**Activation:** "Create next story for epic 2" / "Validate story readiness" / "We hit a blocker"

**Capabilities:**

- **Story Creation** — complete 10-step workflow with anti-hallucination safeguards
- **Parallel Stories** — git worktree-based parallel development setup
- **Story Validation** — comprehensive completeness checks
- **Change Navigation** — structured pivot and blocker handling

**Calls these skills:**

- `create-story` — primary story creation workflow
- `parallel-stories` — parallel development setup
- `execute-checklist` — story validation
- `correct-course` — change management

**Related:** Works with `develop` (developers) and `validate-story` (PO validation).

---

## `create-story`

**Purpose:** Primary workflow for creating next logical story with complete context.

**When to use:**

- Create next sequential story in epic
- Prepare new story with developer context
- Extract requirements from PRD and architecture

**Activation:** "Create next story for epic 2" / "Draft story 3.4"

**7 sequential steps:**

0. Load core configuration (project structure)
1. Identify next story (epic analysis, numbering)
2. Gather story requirements and previous context
3. Gather architecture context (tech stack, structure, standards)
4. Verify project structure alignment
5. Populate story template with full context
6. Complete draft and validate with checklist

**Anti-Hallucination Protocol (CRITICAL):**

- NEVER invent technical details
- ALL technical details extracted from source documents
- MANDATORY source references: `[Source: architecture/file.md#section]`
- If not in docs → mark as "To be determined"

**Dev Notes requirements:**

- Previous story insights
- Data models with sources
- API specifications with sources
- Component specs with sources
- File locations from project structure
- Testing requirements with sources
- Technical constraints with sources

**Output:** comprehensive story file at `{devStoryLocation}/{epic}.{story}.story.md`.

**Related:** Called by `scrum-master`; used by `develop`.

---

## `parallel-stories`

**Purpose:** Generate stories for parallel development with Git worktrees.

**When to use:**

- Setup parallel development for multiple teams
- Maximize velocity with concurrent work
- Enable development without merge conflicts

**Activation:** "Create parallel stories for epic 3" / "Setup parallel development"

**Numbering scheme:**

- Parallel: Story 1-1, 1-2, 1-3 (simultaneous)
- Sequential: Story 2, 3, 4 (ordered)

**Workflow:**

1. Epic analysis for parallel opportunities
2. Dependency mapping
3. Generate parallel story set (1-X numbering)
4. Git worktree setup commands
5. Populate enhanced story templates
6. Create coordination matrix

**Coordination matrix** (overview file) includes:

- Parallel stories table with worktrees
- Sequential stories with dependencies
- Integration plan
- Conflict resolution strategy

**Example structure:**

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

**Benefits:** 50-70% reduction in epic completion time with proper planning.

**Related:** Called by `scrum-master`.

---

## `execute-checklist`

**Purpose:** Generic checklist validation engine (now includes story validation).

**When to use:**

- Validate story completeness (story-draft-checklist)
- Verify developer completion (story-dod-checklist)
- Assess change impacts (change-checklist)
- Execute any quality gate with structured criteria

**Activation:** "Validate story 2.3 with story draft checklist" / "Run DoD checklist"

**Execution modes:**

- **Interactive** — section by section with discussion (thorough)
- **YOLO** — all at once with comprehensive report (recommended, efficient)

**Core checklists:**

- `story-draft-checklist.md` — Story completeness before implementation
- `story-dod-checklist.md` — Developer Definition of Done
- `change-checklist.md` — Change navigation guidance

**Validation markers:**

- ✅ PASS — Requirement clearly met
- ❌ FAIL — Requirement not met
- ⚠️ PARTIAL — Needs improvement
- N/A — Not applicable (with rationale)

**Report structure:**

- Executive summary
- Overall results (pass/fail rates)
- Section breakdown with findings
- Critical issues list
- Improvement recommendations
- Detailed analysis available

**Related:** Called by `scrum-master`, `create-story`, `correct-course`, `develop`.

---

## `correct-course`

**Purpose:** Change management for pivots, blockers, and requirement changes.

**When to use:**

- Project pivots due to new requirements
- Technical blockers preventing progress
- Failed stories requiring new approaches
- Discovered missing requirements
- Scope adjustments to MVP or epics

**Activation:** "We hit a blocker on story 2.1" / "Requirements changed" / "Need to reassess"

**Workflow:**

1. Initial setup & mode selection (Incremental vs YOLO)
2. Execute change-checklist analysis (Sections 1-4)
   - Understand trigger & context
   - Epic impact assessment
   - Artifact conflict analysis
   - Path forward evaluation
3. Draft proposed changes (exact edits for affected artifacts)
4. Generate Sprint Change Proposal document
5. Finalize & determine next steps (PO/SM implementation vs PM/Architect handoff)

**Sprint Change Proposal includes:**

- Analysis summary (trigger, impact, rationale)
- Specific proposed edits (exact before/after for stories, epics, PRD, architecture)
- Impact assessment (scope, timeline)
- Next steps and handoff requirements

**Path options evaluated:**

- Direct Adjustment — modify/add future stories
- Rollback — revert completed work
- Re-scope MVP — adjust scope or goals

**Output:** `docs/change-proposals/sprint-change-{date}-{issue}.md`.

**Related:** Called by `scrum-master`; uses `execute-checklist`.

---

## `edit-epic`

**Purpose:** Edit epic documents with cascade analysis and validation.

**When to use:**

- Modify epic goals, descriptions, or requirements
- Update epic status, priority, or dependencies
- Add/remove/update success criteria or story breakdowns
- Full section rewrites with validation

**Activation:** "/edit-epic docs/prd/.../epic.178.user-discovery-ui/" / "Edit epic 178 to change priority"

**Key features:**

- **File Type Validation** — rejects story files with appropriate message
- **Cascade Analysis** — detects conflicts with child stories before applying changes
- **Comprehensive Validation** — YAML frontmatter, required sections, status values, naming conventions
- **Diff Preview** — shows changes before applying with user approval required

**Input handling:**

- Directory path (auto-discovers epic file)
- Direct epic file path
- Natural language with edit instructions

**Workflow:**

1. Resolve input and discover epic file
2. Validate file type (reject if story)
3. Pre-edit validation checks
4. Analyze cascade effects on child stories
5. Present conflict report (if any)
6. Show diff preview
7. Apply changes after approval

**Related:** Works with `create-epic`, `create-epics-from-shards`, `edit-story`.

---

## `edit-story`

**Purpose:** Edit story documents with comprehensive validation.

**When to use:**

- Modify story statements or acceptance criteria
- Update story status, priority, tasks, or dependencies
- Add/remove implementation details
- Full section rewrites with validation

**Activation:** "/edit-story docs/prd/.../stories/story.323.2.emergency-recovery-unlock/" / "Edit story 323.2 to add new AC"

**Key features:**

- **File Type Validation** — rejects epic files with appropriate message
- **Comprehensive Validation** — YAML frontmatter, required sections, status values, naming conventions
- **Diff Preview** — shows changes before applying with user approval required

**Input handling:**

- Directory path (auto-discovers story file)
- Direct story file path
- Natural language with edit instructions

**Workflow:**

1. Resolve input and discover story file
2. Validate file type (reject if epic)
3. Pre-edit validation checks
4. Show diff preview
5. Apply changes after approval

**Related:** Works with `create-story`, `develop`, `qa-review`, `edit-epic`.
