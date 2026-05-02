# Product Management Skills

Comprehensive product management workflows with natural language activation. Converted from BMAD Core system.

For the integrated chains see [Workflows](../workflows.md#pm-workflow-chains).

## Core Workflow Skills

### `pm-coordinator`

**Purpose:** Navigation hub routing to specialized PM skills.

**When to use:**

- User needs PM help but unclear which workflow
- Want overview of available PM tools

**Activation:** "What PM tools are available?" / "Help me with product management"

---

### `greenfield-prd`

**Purpose:** Create comprehensive PRDs for new products from scratch.

**When to use:**

- Starting completely new product
- Major feature without existing codebase constraints

**Activation:** "Create a PRD for a new task management app"

**Workflow:** Pre-flight → Interactive PRD creation (`create-doc` + `prd-template`) → `pm-checklist` validation → Handoff prompts.

---

### `create-prd`

**Purpose:** Create PRDs for significant enhancements to existing projects (4+ stories).

**When to use:**

- Large enhancement with architectural changes
- Substantial modifications requiring comprehensive planning

**Activation:** "Add payment processing to our existing app"

**Key features:** project analysis, compatibility requirements, integration verification, technical debt awareness.

**Decision tree:** 4+ stories → THIS | 1-3 stories → `create-epic` | Single session → `brownfield-story`.

---

### `change-management`

**Purpose:** Orchestrate structured response to significant project changes.

**When to use:**

- Story fails or reveals major issue
- Technical dead-end discovered
- Pivot needed

**Activation:** "Story 3.2 failed because API doesn't exist"

**Workflow:** Setup → `change-checklist` analysis → Draft proposed changes → Sprint Change Proposal → Handoff decision.

---

## Task Skills

### `create-doc`

**Purpose:** YAML-driven document creation engine with mandatory user interaction.

**When to use:** Creating documents from YAML templates (typically invoked by other skills).

**Key features:** section-by-section processing, mandatory 1-9 elicitation format, detailed rationale, YOLO mode toggle.

---

### `shard-prd`

**Purpose:** Split large PRDs into smaller, manageable markdown files.

**When to use:** PRD is large (>5 epics, >30 stories, >500 lines).

**Activation:** "Split my PRD into smaller files"

**Methods:** automatic (markdown-tree-parser) or manual fallback.

---

### `create-epics-from-shards`

**Purpose:** Convert PRD shards into implementation epic files.

**When to use:** After PRD sharding, need actionable development epics.

**Activation:** "Create epics from the sharded PRD"

---

### `create-epic`

**Purpose:** Create single epic for medium-sized brownfield enhancements (1-3 stories).

**When to use:** medium enhancement, no significant architectural changes, follows existing patterns.

**Activation:** "Add push notifications to existing app"

---

### `brownfield-story`

**Purpose:** Create single user story for tiny brownfield changes (2-4 hours).

**When to use:** single-session enhancement, straightforward integration, isolated change.

**Activation:** "Add logout button to settings"

---

### `deep-research-prompt`

**Purpose:** Generate comprehensive research prompts for various analysis types.

**When to use:** market validation needed, competitive intelligence, user research.

**Activation:** "Generate market research prompt for mobile banking"

**9 research types:** Product Validation, Market Opportunity, User & Customer, Competitive Intelligence, Technology & Innovation, Industry & Ecosystem, Strategic Options, Risk & Feasibility, Custom Focus.

---

### `execute-checklist`

**Purpose:** Generic checklist validation engine.

**When to use:** Validate document against any checklist from the skills' `resources/` directory.

> The `.bmad-core` directory was intentionally removed. Checklists are now loaded from the skills' `resources/` directory.

**Activation:** "Run architecture checklist on docs/architecture.md"

**Features:** fuzzy checklist matching, interactive or YOLO mode, pass/fail rates.

---

## Template & Validation Skills

### `prd-template`

**Purpose:** Greenfield PRD template structure and guidance.

**Used by:** `create-doc` and `greenfield-prd`.

**Sections:** Goals, Requirements, UI Goals, Technical Assumptions, Epic List, Epic Details, Checklist Results, Next Steps.

---

### `create-prd-template`

**Purpose:** Brownfield PRD template for existing project enhancements.

**Used by:** `create-doc` and `create-prd`.

**Key differences:** Intro Project Analysis, Compatibility Requirements, Integration Verification, technical debt focus.

---

### `pm-checklist`

**Purpose:** Comprehensive PRD validation with 60+ checks across 9 categories.

**When to use:** validate PRD quality, check if ready for architect handoff.

**Activation:** "Is my PRD ready for the architect?"

**9 categories:** Problem Definition, MVP Scope, UX Requirements, Functional Requirements, Non-Functional Requirements, Epic & Story Structure, Technical Guidance, Cross-Functional Requirements, Clarity & Communication.

---

### `change-checklist`

**Purpose:** Change impact assessment framework with 6 sections.

**Used by:** `correct-course` and `change-management`.

**6 sections:** Understand Trigger, Epic Impact, Artifact Conflict, Path Forward, Sprint Change Proposal, Final Review.

---

### `correct-course`

**Purpose:** Internal workflow skill for change management execution (invoked by `change-management`).

See [Story Management → correct-course](./story-management.md#correct-course) for the detailed workflow.
