---
name: create-story
description: Primary workflow for creating the next logical story in a development sequence. Implements a rigorous 10-step process to identify, extract, and document story requirements with complete technical context and anti-hallucination safeguards.
---

# Create Story Workflow

## When to Use This Skill

Use this skill when you need to:

- **Create the next sequential story** in an epic ("create next story", "draft story 2.3")
- **Prepare a new story** with complete developer context ("setup new story for epic 1")
- **Extract story requirements** from PRD and architecture docs systematically

Natural language triggers:

- "Create the next story for epic 2"
- "Draft story 3.4"
- "Prepare the next story in sequence"
- "Setup story 1.1"

## Purpose

To identify the next logical story based on project progress and epic definitions, and then to prepare a comprehensive, self-contained, and actionable story file. This skill ensures the story is enriched with all necessary technical context, requirements, and acceptance criteria, making it ready for efficient implementation by a Developer Agent with minimal need for additional research.

## CRITICAL: Sequential Execution Required

**MANDATORY**: This workflow has 7 sequential steps that MUST be followed in order. Do NOT skip steps or proceed until the current step is complete.

Each step builds on the previous one. Skipping steps will result in incomplete or inaccurate stories.

---

## Step 0: Load Core Configuration and Check Workflow

**Purpose**: Establish project structure and file locations

**Actions**:

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

1. Load configuration from skill resources or explicit file references
2. If configuration does not exist, **HALT** and inform user:

   > "core-config.yaml not found. This file is required for story creation. You can either:
   >
   > 1. Copy it from project templates and configure it for your project
   > 2. Create the configuration manually based on the reference structure
   >    Please add and configure core-config.yaml before proceeding."

3. Extract key configurations:
   - `devStoryLocation` - Where to save story files
   - `prd.*` - PRD structure and location settings
   - `architecture.*` - Architecture document settings
   - `workflow.*` - Workflow preferences

**Fallback Defaults** (if config file doesn't exist but user approves proceeding):

```yaml
devStoryLocation: co-located  # Stories are saved inside the epic's own stories/ subdirectory
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: '*/epic-{n}*.md'
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4
```

> **CRITICAL — Story File Location**: Stories are **always** saved inside the `stories/` subdirectory of the epic directory that was provided as input (or identified in Step 1). The path is:
> `{epic-directory}/stories/story.{epicNum}.{storyNum}.{story-title-short}/story.{epicNum}.{storyNum}.{story-title-short}.md`
>
> Example: If the epic is at `docs/prd/core-platform/my-feature/epics/epic.336.my-epic/epic.336.my-epic.md`, stories go to:
> `docs/prd/core-platform/my-feature/epics/epic.336.my-epic/stories/story.336.1.my-story/story.336.1.my-story.md`
>
> Do **NOT** use a global `docs/stories/` directory.

---

## Step 1: Identify Next Story for Preparation

**Purpose**: Determine which story to create based on project progress

### 1.1 Locate Epic Files and Review Existing Stories

1. Based on `prdSharded` from config, locate epic files:
   - **Sharded**: Use `prdShardedLocation` + `epicFilePattern`
   - **Monolithic**: Parse sections from main PRD file

2. Look for existing story files inside the epic's `stories/` subdirectory (i.e. `{epic-directory}/stories/`). Load the highest-numbered `story.{epicNum}.{storyNum}.*` file found there.

3. **If highest story exists**:
   - Verify status is `Done`
   - If NOT Done, alert user:

     > "ALERT: Found incomplete story!
     > File: {lastEpicNum}.{lastStoryNum}.story.md
     > Status: [current status]
     > You should fix this story first, but would you like to accept risk & override to create the next story in draft?"

   - If proceeding, select next sequential story in the current epic
   - If epic is complete, prompt user:

     > "Epic {epicNum} Complete: All stories in Epic {epicNum} have been completed.
     > Would you like to:
     >
     > 1. Begin Epic {epicNum + 1} with story 1
     > 2. Select a specific story to work on
     > 3. Cancel story creation"

   - **CRITICAL**: NEVER automatically skip to another epic. User MUST explicitly instruct which story to create.

4. **If no story files exist**: The next story is ALWAYS `1.1` (first story of first epic)

5. Announce the identified story to the user:
   > "Identified next story for preparation: {epicNum}.{storyNum} - {Story Title}"

---

## Step 2: Gather Story Requirements and Previous Story Context

**Purpose**: Extract story-specific requirements and learn from previous implementation

### 2.1 Extract Story Requirements

1. Read the identified epic file (from `prdShardedLocation` or PRD sections)
2. Extract for this specific story:
   - Story title and description
   - Acceptance criteria (numbered list)
   - Dependencies on other stories
   - Special requirements or constraints

### 2.2 Review Previous Story Context (if exists)

If a previous story exists (e.g., creating 2.3, so 2.2 exists):

1. Read previous story's **Dev Agent Record** sections:
   - Completion Notes and Debug Log References
   - Implementation deviations and technical decisions
   - Challenges encountered and lessons learned

2. Extract relevant insights that inform the current story's preparation:
   - Patterns that worked well
   - Technical decisions that affect this story
   - Warnings or gotchas discovered
   - File locations established

**Anti-Hallucination Rule**: Only extract insights that are explicitly documented. Do NOT assume or infer information not written in the previous story.

### 2.3 Analyse Git History

1. Run `git log --oneline -15` to get recent commits
2. Identify commits relevant to the current epic/story area:
   - Files created or modified in adjacent or related work
   - Library dependencies recently added or changed
   - Code patterns and conventions established
   - Reverts or fixes that signal known pitfalls
3. For 2-3 most relevant commits, inspect the diff to extract:
   - File locations and naming patterns established
   - Libraries already in use that satisfy this story's needs (avoids reinvention)
   - Testing approaches used in recent stories
   - Any patterns introduced that this story must follow for consistency
4. Document actionable insights in the Dev Notes section under **Git History Insights**

**Anti-Hallucination Rule**: Only extract insights from actual commit history. Do NOT infer beyond what the commits and diffs show.

---

## Step 3: Gather Architecture Context

**Purpose**: Load relevant technical specifications and standards

### 3.1 Determine Architecture Reading Strategy

- **If `architectureVersion: >= v4` and `architectureSharded: true`**:
  - Read `{architectureShardedLocation}/index.md` first
  - Follow structured reading order based on story type (see 3.2)

- **Else** (monolithic architecture):
  - Use `architectureFile` and read relevant sections

### 3.2 Read Architecture Documents Based on Story Type

**For ALL Stories (MANDATORY):**

- `tech-stack.md` - Technologies, frameworks, versions
- `unified-project-structure.md` - File locations and naming
- `coding-standards.md` - Code quality requirements
- `testing-strategy.md` - Testing approach and standards

**For Backend/API Stories, additionally:**

- `data-models.md` - Schema definitions
- `database-schema.md` - Database structure
- `backend-architecture.md` - Server-side patterns
- `rest-api-spec.md` - API endpoints and contracts
- `external-apis.md` - Third-party integrations

**For Frontend/UI Stories, additionally:**

- `frontend-architecture.md` - Client-side patterns
- `components.md` - UI component specifications
- `core-workflows.md` - User flows and navigation
- `data-models.md` - Client-side data structures

**For Full-Stack Stories:**

- Read BOTH Backend and Frontend sections above

### 3.3 Extract Story-Specific Technical Details

**CRITICAL ANTI-HALLUCINATION RULE**: Extract ONLY information directly relevant to implementing the current story. Do NOT invent new libraries, patterns, or standards not in the source documents.

Extract and document:

1. **Specific data models, schemas, or structures** the story will use
2. **API endpoints** the story must implement or consume
3. **Component specifications** for UI elements in the story
4. **File paths and naming conventions** for new code
5. **Testing requirements** specific to the story's features
6. **Security or performance considerations** affecting the story

**MANDATORY**: ALWAYS cite source documents using this format:

```
[Source: architecture/{filename}.md#{section}]
```

**Example**:

```markdown
- User authentication uses JWT tokens stored in HTTP-only cookies
  [Source: architecture/backend-architecture.md#authentication]
- Password hashing uses bcrypt with salt rounds of 12
  [Source: architecture/coding-standards.md#security-practices]
```

**If information is NOT found in architecture docs**:

- Explicitly state: "No specific guidance found in architecture docs"
- DO NOT guess or make assumptions
- Mark as "To be determined during implementation"

---

## Step 4: Verify Project Structure Alignment

**Purpose**: Ensure story requirements align with established project structure

### 4.1 Cross-Reference with Project Structure

1. Review `docs/architecture/unified-project-structure.md` (or equivalent)
2. Verify that story requirements align with:
   - Defined file paths and directories
   - Component location conventions
   - Module naming standards
   - Package organization

### 4.2 Document Conflicts or Deviations

If discrepancies are found between story requirements and project structure:

1. Note the conflict explicitly
2. Document in "Project Structure Notes" within the story draft
3. Recommend resolution (follow structure OR update structure)

**Example Conflict**:

```markdown
**Project Structure Note**: Epic specifies placing new auth components
in `src/components/auth/`, but Project Structure Guide defines
`src/features/authentication/components/` as the standard location.
Recommend following Project Structure Guide for consistency.
```

---

## Step 5: Populate Story Template with Full Context

**Purpose**: Create comprehensive, self-contained story document

### 5.1 Create Story File and Directory

1. Determine story path name: `story.{epicNum}.{storyNum}.{story-title-short}`
2. Derive the output root from the epic file path provided (or identified in Step 1): `{epic-directory}/stories/`
3. Create directory: `{epic-directory}/stories/{story-path-name}/`
4. Create file inside directory: `{epic-directory}/stories/{story-path-name}/{story-path-name}.md`
5. Use Story Template from `resources/story-template.yaml` as structure

> **CRITICAL**: Never write to a global `docs/stories/` directory. Stories always live inside their own epic's `stories/` subdirectory.

### 5.2 Fill Basic Story Information

Populate these sections:

**Status**: `Draft`

**Story Statement** (from epic):

```markdown
**As a** {role},
**I want** {action},
**so that** {benefit}
```

**Acceptance Criteria** (copy from epic):

1. First acceptance criterion
2. Second acceptance criterion
3. etc.

### 5.3 Populate Dev Notes Section (CRITICAL)

**CRITICAL ANTI-HALLUCINATION REQUIREMENT**: This section MUST contain ONLY information extracted from architecture documents. NEVER invent or assume technical details.

Organize Dev Notes by these categories:

#### Previous Story Insights

- Key learnings from previous story (if applicable)
- Technical decisions that carry forward
- Patterns established in previous work

#### Data Models

- Specific schemas, validation rules, relationships
- **MANDATORY**: Include source references for each item
- Example: `User model includes email, passwordHash, createdAt fields [Source: architecture/data-models.md#user-schema]`

#### API Specifications

- Endpoint details (method, path, auth requirements)
- Request/response formats
- Error handling standards
- **MANDATORY**: Include source references

#### Component Specifications (for UI stories)

- UI component details, props, state management
- Styling approach and theme usage
- **MANDATORY**: Include source references

#### File Locations

- Exact paths where new code should be created based on project structure
- Naming conventions to follow
- **Source**: `[Source: architecture/unified-project-structure.md#section]`

#### Testing Requirements

- Specific test cases or strategies from testing-strategy.md
- Coverage requirements
- Test file locations
- **MANDATORY**: Include source references

#### Manual Testing Steps

Generate a concrete, step-by-step walkthrough for verifying this story in the running app. This is distinct from automated test design — it is a human-readable smoke test guide.

**Sources to consult** (in priority order):
1. `docs/architecture/routing-and-file-structure.md` — for navigation paths and screen names
2. `docs/architecture/concepts/core-workflows.md` — for user flows
3. The story's own acceptance criteria — one verification step per AC
4. Integration notes in the story (what parent component or screen triggers this feature)

**Structure to generate**:
```markdown
**Prerequisites**:
- App running (`npm run goji-wallet:start:device`)
- [Auth state, seeded data, or feature flags required]

**Navigation Path**:
1. [Home/starting screen] → [tap X] → [intermediate screen] → [target screen]

**Verification Steps**:
- **AC1**: [Exact action] → expect [exact result]
- **AC2**: [Exact action] → expect [exact result]
- ...

**Edge Cases / Key Risks**:
- [Known tricky interaction, previously broken flow, or non-obvious behaviour to verify]
```

**Rules**:
- Use actual screen/button names from routing docs; if unknown, write "To be confirmed during implementation"
- Map every AC to at least one verification step
- The `dev-agent` may refine this section after implementation; the SM skeleton is sufficient to guide development
- Do NOT invent navigation paths — only extract from source documents

#### Technical Constraints

- Version requirements
- Performance considerations (response times, memory limits)
- Security rules (authentication, authorization, input validation)
- **MANDATORY**: Include source references

**If information for a category is not found**: Explicitly state:

> "No specific guidance found in architecture docs for [category]"

### 5.4 Generate Tasks / Subtasks Section

Create detailed, sequential list of technical tasks based on:

1. Epic Requirements
2. Story Acceptance Criteria
3. Reviewed Architecture Information

**Task Format**:

```markdown
- [ ] Task 1: {Description} (AC: 1, 3)
  - [ ] Subtask 1.1: {Specific action}
  - [ ] Subtask 1.2: {Specific action}
- [ ] Task 2: {Description} (AC: 2)
  - [ ] Subtask 2.1: {Specific action}
```

**Requirements**:

- Each task must reference relevant architecture documentation
- Link tasks to ACs where applicable: `(AC: 1, 3)`
- Include unit testing as explicit subtasks based on Testing Strategy
- Tasks should be sequential and logical

**Example**:

```markdown
- [ ] Task 1: Implement User model with validation (AC: 1)
  - [ ] Create User schema with required fields [Source: architecture/data-models.md#user-schema]
  - [ ] Add email validation using validator.js
  - [ ] Implement password hashing with bcrypt [Source: architecture/coding-standards.md#security]
  - [ ] Write unit tests for User model validation
- [ ] Task 2: Create user registration endpoint (AC: 2)
  - [ ] Implement POST /api/users/register endpoint [Source: architecture/rest-api-spec.md#user-endpoints]
  - [ ] Add input validation middleware
  - [ ] Connect to User model
  - [ ] Write integration tests for registration flow
```

### 5.5 Add Testing Guidance

In the **Testing** subsection of Dev Notes:

1. List relevant testing standards from Testing Strategy
2. Specify test file locations
3. Note testing frameworks and patterns to use
4. Include any specific testing requirements for this story

---

## Step 6: Story Draft Completion and Review

**Purpose**: Validate story completeness before developer handoff

### 6.1 Internal Review

Review all sections for:

1. **Completeness**: All required sections populated
2. **Accuracy**: Information matches source documents
3. **Traceability**: All technical details have source references
4. **Alignment**: Tasks align with both epic requirements and architecture constraints

### 6.2 Update Status and Save

1. Confirm status is set to `Draft`
2. Add entry to Change Log table:
   ```markdown
   | 2025-10-30 | 1.0 | Initial draft created by Scrum Master | SM Agent |
   ```
3. Save the story file to the self-named subdirectory inside the epic's `stories/` folder: `{epic-directory}/stories/story.{epicNum}.{storyNum}.{story-title}/story.{epicNum}.{storyNum}.{story-title}.md`
4. If `docs/prd/sprint-status.yaml` exists, update it:
   - Load the full file, preserving all comments and structure
   - Find the entry matching this story's key
   - Update its status from `backlog` → `ready-for-dev`
   - Save the file

### 6.3 Execute Adversarial Quality Review

**MANDATORY**: Perform a full adversarial re-analysis of the completed story, treating it as if reviewing someone else's work. The goal is to make developer mistakes **impossible**.

**Disaster Prevention Checklist** — for each category, identify gaps and fix them before presenting the story:

#### 🚨 Critical (Must Fix)

- **Wheel reinvention**: Does the story direct the developer toward existing code they should extend, rather than re-implement? Check the codebase for related components, services, hooks, or utilities.
- **Wrong libraries**: Are all library references version-specific and consistent with what the project actually uses (check `package.json`)? No guessed or fabricated dependencies.
- **Wrong file locations**: Do all file paths in Dev Notes match the project's actual directory structure as confirmed in Step 4?
- **Regression risk**: Does the story identify existing functionality that could break? Are tests for adjacent features called out?
- **UX violations**: If this story touches UI, are UX requirements from the epic explicitly referenced with file citations?
- **Missing manual testing steps**: If this story touches UI or navigation, does the Manual Testing Steps section have a concrete walkthrough? Vague or empty steps must be filled or explicitly marked "To be confirmed during implementation".
- **Vague implementations**: Can every task be executed without ambiguity? Flag any task that requires guessing.

#### ⚡ Should Add

- **Previous story continuity**: Are patterns, file locations, and decisions from the previous story carried forward correctly?
- **Missing acceptance criteria coverage**: Does every AC map to at least one task?
- **Security or performance requirements**: If relevant, are they stated explicitly (not implied)?

#### ✨ Nice to Have

- **Token efficiency**: Is the story concise? Remove verbose explanations that don't add implementation value.
- **Scannable structure**: Are critical constraints visible at a glance, not buried in prose?

After completing the review, list all findings grouped by category. Fix all Critical items directly in the story file. Present Should Add and Nice to Have items to the user for confirmation before applying.

If the BMAD adversarial checklist is available at `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`, use it in addition to the above.

### 6.4 Provide Summary to User

Generate a comprehensive summary including:

```markdown
## Story Creation Complete

**Story Created**: `{epic-directory}/stories/story.{epicNum}.{storyNum}.{story-title}/story.{epicNum}.{storyNum}.{story-title}.md`
**Status**: Draft
**Epic**: {epicNum} - {Epic Title}
**Story Number**: {storyNum}

### Key Technical Components Included

- Data Models: [list extracted models with sources]
- API Endpoints: [list endpoints with sources]
- Components: [list UI components with sources]
- Testing Requirements: [summarize testing approach]

### Source References

Total references included: {count}
Architecture documents consulted: [list files read]

### Deviations or Conflicts

[List any noted conflicts between epic and architecture, or state "None"]

### Checklist Results

[Include validation report from story-draft-checklist]

### Next Steps

For Complex Stories:

1. Carefully review the story draft
2. Optionally have Product Owner run `validate-story` skill for comprehensive validation
3. Update status to "Approved" when ready
4. Hand off to Developer for implementation

For Simple Stories:

- Story is ready for developer handoff
- Ensure developer reads Dev Notes section thoroughly before starting
```

---

## Integration with Other Skills

**Called by**:

- `scrum-master` - Main coordinator skill

**Calls**:

- `execute-checklist` - For story validation

**Outputs used by**:

- `develop` - Developers implement stories created by this skill
- `validate-story` - Product owners validate story completeness

---

## Anti-Hallucination Protocol Summary

This skill implements rigorous safeguards against AI hallucination:

### MANDATORY Rules

1. **Source Extraction Only**: All technical details MUST be extracted from existing documents
2. **Source Citations Required**: Every technical claim MUST include `[Source: ...]` reference
3. **No Invention**: NEVER invent libraries, patterns, frameworks, or standards not in source docs
4. **Explicit Unknowns**: If information doesn't exist, state "No specific guidance found" rather than guessing
5. **Verification**: Cross-reference claims against actual project files before inclusion

### Violation Examples (NEVER Do This)

❌ "The API uses Redis for caching" (without source reference)
❌ "Follow the standard React patterns" (vague, no source)
❌ "Authentication uses OAuth2" (if not in architecture docs)
❌ "Testing requires 80% coverage" (if not specified in testing-strategy.md)

### Correct Examples

✅ "The API uses Redis for session storage [Source: architecture/backend-architecture.md#caching-strategy]"
✅ "Follow React Hooks patterns defined in the project [Source: architecture/frontend-architecture.md#state-management]"
✅ "Authentication: No specific guidance found in architecture docs. To be determined during implementation."
✅ "Testing requires 80% coverage for financial operations [Source: architecture/testing-strategy.md#coverage-requirements]"

---

## Configuration Reference

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

Expected configuration structure:

```yaml
# Project structure
# Stories are saved inside each epic's own stories/ subdirectory — NOT in a global docs/stories/ folder.
# Path pattern: {epic-directory}/stories/story.{N}.{M}.{title}/story.{N}.{M}.{title}.md
devStoryLocation: co-located-in-epic
devDebugLog: .ai/debug-log.md

# PRD configuration
prd:
  prdFile: docs/prd.md
  prdVersion: v4
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: '*/epic-{n}*.md'

# Architecture configuration
architecture:
  architectureFile: docs/architecture.md
  architectureVersion: v4
  architectureSharded: true
  architectureShardedLocation: docs/architecture

# Always-load files for developers
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md
```

---

## Common Pitfalls to Avoid

1. ❌ **Skipping configuration loading** - Always start with Step 0
2. ❌ **Inventing technical details** - Only extract from source docs
3. ❌ **Missing source references** - Every technical claim needs citation
4. ❌ **Incomplete Dev Notes** - Developer must not need to read architecture docs
5. ❌ **Skipping validation** - Always run story-draft-checklist
6. ❌ **Auto-advancing epics** - Never create next epic's story without user approval
7. ❌ **Vague task descriptions** - Tasks must be specific and actionable
8. ❌ **Ignoring previous story insights** - Always review previous implementation notes

---

## Success Criteria

A story is successfully created when:

✅ Configuration loaded and validated
✅ Next story number correctly identified
✅ All relevant architecture docs read and extracted
✅ Dev Notes contain complete technical context with source references
✅ Tasks are detailed, sequential, and linked to acceptance criteria
✅ Story passes story-draft-checklist validation
✅ File saved to correct location
✅ Summary provided to user with next steps

---

## Resources

This skill uses the following resource files:

- `resources/story-template.yaml` - Story document structure and sections
- `resources/story-draft-checklist.md` - Validation criteria (via execute-checklist skill)

---

## Notes

- This is a **sequential workflow** - steps must be followed in order
- Average story creation time: 5-10 minutes (depending on architecture complexity)
- Stories are saved as Markdown files with YAML-like section structure
- The skill is designed for AI-driven development where complete context prevents mistakes
- Fresh context windows between agent roles (SM → Dev → QA) prevent contamination
