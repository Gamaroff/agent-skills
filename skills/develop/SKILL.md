---
name: develop
description: Provides guidance for implementing features and technical tasks in the Goji system. Use when starting new feature work, implementing stories, executing technical tasks, or needing guidance on development patterns. Covers task planning, platform separation, testing, and documentation standards. Includes BMAD story-driven development workflow with quality gates and comprehensive validation.
---

# Develop

## When to Use This Skill

Use this skill when:

- Implementing user stories from `docs/stories/`
- Executing technical tasks from `docs/development/tasks/`
- Starting new feature development
- Need guidance on development workflow
- Working through task sequences with tests
- Preparing code for review

## Input Handling

**Flexible Invocation:**

You can invoke this skill with:

- **A specific story file**: `story.178.8.swipe-actions-friend-requests.md`
- **A story directory**: `stories/story.178.8.swipe-actions-friend-requests/`
- **A specific task file**: `task.1.cache-lib-simplification.md`
- **A task directory**: `tasks/task.1.cache-lib-simplification/`
- **An epic file**: `epic.178.friend-request-management.md` (triggers creation workflow)

**File Type Detection:**

1. **Epic File Detection** - Matches pattern: `epic.{number}.{name}.md`
   - If detected: Invoke epic handling workflow (see Epic File Handling section)

2. **Story File Detection** - Matches pattern: `story.{epic}.{story}.{name}.md`
   - Location: co-located within epic directories (`docs/prd/<domain>/epics/epic.{N}.*/stories/`) or as provided by the caller
   - Exclude files containing: `.qa.`, `.gate.`, or `.bug.`

3. **Task File Detection** - Matches pattern: `task.{id}.{name}.md`
   - Location: `docs/development/tasks/` or subdirectories
   - Exclude files containing: `.qa.`, `.gate.`, or `.bug.`

**Directory Discovery Logic:**

When given a directory path:

1. List all files in the directory
2. Detect file type using patterns above
3. If story file found, load it and proceed with story workflow
4. If task file found, load it and proceed with task workflow
5. If multiple files found, use the one matching the directory name
6. If no valid file found, HALT and ask user for the correct path

**Examples:**

```
Input: stories/story.178.8.swipe-actions-friend-requests/
Discovers: story.178.8.swipe-actions-friend-requests.md
Type: Story File → Use Story Workflow

Input: tasks/task.1.cache-lib-simplification/
Discovers: task.1.cache-lib-simplification.md
Type: Task File → Use Task Workflow

Input: epic.178.friend-request-management.md
Type: Epic File → Trigger Epic Handling Workflow
```

## Epic File Handling

**CRITICAL**: Epic files cannot be developed directly. Only stories and tasks can be implemented.

When an epic file is provided as input:

1. **Detect Epic File** - Match pattern: `epic.{number}.{name}.md`

2. **Warn User** - Display clear message:

   ```
   ⚠️  EPIC FILE DETECTED

   Epic files cannot be developed directly. You must create individual
   stories or tasks from this epic first.

   Epic: epic.{number}.{name}.md
   Location: {file_path}
   ```

3. **Offer Creation Options** - Use AskUserQuestion with these choices:

   **Question**: "What would you like to create from this epic?"

   **Options**:
   - **Create Story** - "Create a new story from this epic using /create-story skill"
     - Description: "Generate a comprehensive user story with acceptance criteria, dev notes, and tasks"

   - **Create Task** - "Create a new technical task from this epic using /create-task skill"
     - Description: "Generate a technical task document for refactoring, infrastructure, or technical improvements"

   - **Cancel** - "I'll specify a story or task file directly"
     - Description: "Exit and let me provide the correct story/task file path"

4. **Execute User Choice**:
   - **If "Create Story"**: Invoke `/create-story` skill
   - **If "Create Task"**: Invoke `/create-task` skill
   - **If "Cancel"**: HALT and prompt user for story/task file path

**Example Flow:**

```
User Input: /develop epic.178.friend-request-management.md

System Detection: Epic file detected (matches pattern epic.178.*)

System Warning:
⚠️  EPIC FILE DETECTED
Epic files cannot be developed directly. You must create individual
stories or tasks from this epic first.

Epic: epic.178.friend-request-management.md
Location: docs/prd/user-experience/friends/epic.178.friend-request-management.md

System Prompt: [Displays AskUserQuestion with 3 options]

User Selection: "Create Story"

System Action: Invokes /create-story skill
→ Proceeds to create story.178.1.{name}.md
→ Story ready for development via /develop
```

## Document Status Validation

**CRITICAL**: After detecting a valid story or task file, you MUST check the document status before beginning development.

### Status Check Procedure

1. **Read the Document Status Field**:
   - For stories: Check the `Status:` field in the story frontmatter
   - For tasks: Check the `Status:` field in the task metadata

2. **Validate Status** (allowed values):
   - ✅ **Ready for Development** - Proceed with implementation
   - ✅ **In Progress** - Resume implementation
   - ✅ **Ready for Review** - Skip to review process
   - ⚠️ **Draft** - HALT and validate readiness (see Draft Status Handling below)

### Draft Status Handling

**Pipeline bypass**: When `/develop` is invoked by the `develop-story` orchestrator, the `/review-story` skill has already run in Step 2 of the pipeline and validated the story. If called from develop-story, treat any Draft status as already validated — automatically select "Yes, ready to implement" and proceed without prompting the user. The develop-story skill will handle this autonomously.

**When Status is "Draft"**:

1. **Display Warning**:

   ```
   ⚠️  DRAFT DOCUMENT DETECTED

   This document has "draft" status and may not be ready for development.

   Document: [story/task file name]
   Status: Draft
   Location: [file path]
   ```

2. **Ask Clarifying Questions** - Use AskUserQuestion to validate readiness:

   **Question**: "Is this document ready for development?"

   **Options**:
   - **Yes, ready to implement** - "The requirements are clear and complete"
     - Description: "Begin implementation even though status is draft"

   - **No, needs review** - "Requirements need clarification or updates"
     - Description: "Use /review-story or /review-task to update document before development"

   - **Let me update it manually** - "I'll update the document myself"
     - Description: "Exit and let me manually edit the document first"

3. **Execute User Choice**:

   **If "Yes, ready to implement"**:
   - Update document status to "In Progress"
   - Proceed with normal development workflow
   - Continue to "Core Development Principles" section

   **If "No, needs review"**:
   - Determine document type (story vs task)
   - If story: Invoke `/review-story` skill with the story file path
   - If task: Invoke `/review-task` skill with the task file path
   - After review completes, ask user if ready to proceed with `/develop`

   **If "Let me update it manually"**:
   - HALT and display message:
     ```
     Development paused. Please update the document and run /develop again when ready.
     ```
   - Exit skill

### Example Flow

```
User Input: /develop story.178.8.swipe-actions-friend-requests.md

System Detection: Story file detected
System Status Check: Status field shows "draft"

System Warning:
⚠️  DRAFT DOCUMENT DETECTED
This document has "draft" status and may not be ready for development.

Document: story.178.8.swipe-actions-friend-requests.md
Status: draft
Location: docs/stories/story.178.8.swipe-actions-friend-requests/

System Prompt: [Displays AskUserQuestion with 3 options]

User Selection: "No, needs review"

System Action: Invokes /review-story skill
→ Interactive review identifies gaps and inconsistencies
→ Document updated to "ready for development" status
→ User can now run /develop to begin implementation
```

## Risk Level Check

**CRITICAL**: After document status validation passes and before implementation analysis, check the story frontmatter for a `risk_level` field.

### Risk Level Check Procedure

1. **Read `risk_level` from story frontmatter**:
   - `risk_level: high` → Gate applies (see below)
   - `risk_level: medium` / `risk_level: low` / field absent → silently continue to Implementation Alignment Analysis

2. **When `risk_level: high`**:

   Display warning:
   ```
   ⚠️  HIGH RISK STORY DETECTED

   This story is flagged as high risk (auth, payments, BSV signing, encryption, or external APIs).
   Running /qa-planning before development is strongly recommended to catch architecture or
   security issues before code is written — when they are cheapest to fix.

   Story: [story file name]
   Risk Level: high
   ```

   Ask user how to proceed using AskUserQuestion:

   **Question**: "This is a high-risk story. Would you like to run `/qa-planning` first?"

   **Options**:
   - **Run `/qa-planning` now** — "Recommended. Identify risks and design test strategy before writing code."
     - Description: "Generates risk matrix and test design document. Returns here when done."
   - **Skip, I've already planned** — "I've already assessed risks or this is a re-run."
     - Description: "Acknowledge the risk and proceed directly to implementation."
   - **Skip, low actual risk** — "The `risk_level: high` tag is overstated for this change."
     - Description: "Proceed without planning. Consider updating the story's risk_level."

3. **Execute User Choice**:

   **If "Run `/qa-planning` now"**:
   - Invoke `/qa-planning` skill with the current story context
   - After `/qa-planning` completes, return to this skill and continue to Implementation Alignment Analysis

   **If "Skip, I've already planned"** or **"Skip, low actual risk"**:
   - Log acknowledgement in Dev Agent Record under a "Risk Acknowledgement" note
   - Continue to Implementation Alignment Analysis

### Example Flow

```
User Input: /develop story.312.1.bsv-transaction-signing.md

System Detection: Story file detected
System Status Check: Status shows "Ready for Development"
System Risk Check: risk_level = high

System Warning:
⚠️  HIGH RISK STORY DETECTED
Story: story.312.1.bsv-transaction-signing.md
Risk Level: high

System Prompt: [Displays AskUserQuestion with 3 options]

User Selection: "Run /qa-planning now"

System Action: Invokes /qa-planning skill
→ Risk matrix generated, test design document created
→ Returns to /develop
→ Continues to Implementation Alignment Analysis
```

---

## Implementation Alignment Analysis

**CRITICAL**: After document status validation and risk level check pass, you MUST check if an implementation already exists and analyze alignment with the story/task document.

### Alignment Check Procedure

1. **Identify Target Files (using Explore subagent):**
   - Use the Agent tool with subagent_type="Explore" to discover files relevant to this story/task. Ask it to:
     - Find all files referenced in the story's Acceptance Criteria, Dev Notes, and Tasks sections
     - Find existing implementations in the same module/layer that may overlap
     - Return: file path + 1-line description per file (max 25 files)
   - Use the returned summary to decide what to read — do NOT load all discovered files into the main context
   - Only Read() the 3-5 files that most directly affect alignment assessment
   - After completing alignment assessment, write a 3-line summary of findings and release the discovered file list from active context before proceeding to implementation

2. **Analyze Existing Implementation** (if files exist):
   - Read the existing implementation code
   - Compare implementation details against the story/task requirements:
     - Does the code match the specified behavior?
     - Are the acceptance criteria already met?
     - Does the architecture align with the design notes?
     - Are there conflicting patterns or approaches?

3. **Determine Alignment Status**:
   - ✅ **Fully Aligned** - Implementation matches document requirements
   - ⚠️ **Partially Aligned** - Some aspects match, others don't
   - ❌ **Misaligned** - Implementation contradicts document requirements
   - 🆕 **No Implementation** - No existing code found (greenfield)

### Handling Misalignment

**When Status is "Partially Aligned" or "Misaligned"**:

1. **Document the Discrepancies**:
   - List specific differences between code and document
   - Identify which is more correct/appropriate
   - Consider business logic, user needs, and technical feasibility

2. **Ask User for Direction** - Use AskUserQuestion:

   **Question**: "Found existing implementation that differs from the story/task document. How should we proceed?"

   **Options**:
   - **Align code to document** - "Update implementation to match current requirements"
     - Description: "The document represents the source of truth; modify code to match specifications"

   - **Align document to code** - "Update document to reflect actual implementation"
     - Description: "The existing implementation is correct; update document to match reality"

   - **Hybrid approach** - "Partially update both for optimal solution"
     - Description: "Take best aspects from both; update code and document together"

   - **Let me decide manually** - "I'll review and provide specific direction"
     - Description: "Pause development while I analyze the discrepancies myself"

3. **Execute User Choice**:

   **If "Align code to document"**:
   - Treat existing code as legacy/incorrect implementation
   - Proceed with normal development workflow
   - Refactor/replace existing code to match document specifications
   - Update Dev Agent Record to note alignment changes made
   - Continue to "Core Development Principles" section

   **If "Align document to code"**:
   - Recognize existing implementation as source of truth
   - Update the story/task document to reflect actual implementation:
     - Modify requirements to match current behavior
     - Update acceptance criteria to reflect what exists
     - Adjust dev notes to describe actual architecture
   - Mark tasks as completed if implementation already satisfies them
   - Update Dev Agent Record to note documentation alignment
   - If all tasks already complete, proceed to completion process

   **If "Hybrid approach"**:
   - Collaborate with user to determine optimal path
   - Update both code and document sections as needed
   - Document the rationale for hybrid decisions
   - Proceed with modified implementation plan
   - Continue to "Core Development Principles" section

   **If "Let me decide manually"**:
   - HALT and display alignment analysis:

     ```
     Implementation alignment analysis paused.

     Discrepancies found:
     [List specific differences between code and document]

     Please review and provide specific direction for:
     - Which aspects of code should change
     - Which aspects of document should update
     - Any hybrid approaches to consider
     ```

   - Exit skill

### Example Flow

```
User Input: /develop story.310.5.socketio-real-time-delivery.md

System Detection: Story file detected
System Status Check: Status shows "Ready for Development"
System Implementation Check: Found existing WebSocket implementation

System Analysis:
- Story specifies Socket.IO for real-time delivery
- Existing code uses native WebSocket API
- Implementation patterns differ significantly

System Warning:
⚠️  IMPLEMENTATION ALIGNMENT ISSUE

Existing implementation found that differs from story requirements.

Story Requirements:
- Use Socket.IO library for real-time communication
- Implement Socket.IO event handlers
- Support automatic reconnection with exponential backoff

Current Implementation:
- Uses native WebSocket API (new WebSocket())
- Custom event handling with message parsing
- Manual reconnection logic

System Prompt: [Displays AskUserQuestion with 4 options]

User Selection: "Align code to document"

System Action:
→ Marks existing websocket-service.ts for refactoring
→ Proceeds with Socket.IO migration as specified in story
→ Updates Dev Agent Record with alignment decision
→ Continues with normal development workflow
```

### Alignment for Greenfield Implementation

**When Status is "No Implementation"** (greenfield):

- No alignment check needed
- Proceed directly to "Core Development Principles" section
- Begin implementation following story/task specifications

## Core Development Principles

### Story-Driven Development (BMAD Workflow)

**Key Rule**: Stories contain ALL information needed for implementation. Load only:

- The assigned story file
- Always-loaded files (coding standards, tech stack, source tree)
- Never load PRD/architecture/other docs unless explicitly directed in story notes

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

**Authorized Story Updates** (CRITICAL):
You may ONLY update these story file sections:

- Tasks / Subtasks Checkboxes
- Dev Agent Record (all subsections)
- Agent Model Used
- Debug Log References
- Completion Notes List
- File List (all added/modified/deleted files)
- Change Log
- Status

**DO NOT modify**: Story content, Acceptance Criteria, Dev Notes, Testing sections, or any other sections.

**Dev Agent Record Documentation Requirements**:

As you implement each task, continuously update these Dev Agent Record sections:

1. **Implementation Summary** - High-level overview of what was accomplished
2. **Start Date** - Date work began (YYYY-MM-DD format)
3. **Completion Date** - Date work finished (populated at completion)
4. **Agent Model Used** - Which Claude model performed the work
5. **Implementation Approach** - Detailed breakdown:
   - Architecture decisions and patterns used
   - Technical details (algorithms, data structures, workflows)
   - Integration points and dependencies
   - Key implementation challenges and solutions
6. **Testing Results** - Test coverage statistics and results
7. **File List** - All files created/modified/deleted (continuously updated)
8. **Change Log** - Chronological log of changes with dates
9. **Deferred Work** - Items planned but not completed (if applicable)
10. **Notes** - Additional context, decisions, or future considerations

**Why This Matters**: The Dev Agent Record serves as implementation documentation for QA, future developers, and audit purposes. It should tell the complete story of what was built and how.

### Goji System Architecture

The system uses:

- **NX monorepo** with npm workspaces
- **Platform separation** (client/server exports for security and bundle optimization)
- **Test-first development** with co-located test files
- **TodoWrite** for task management (3+ step tasks)
- **Comprehensive documentation** standards

## Available Workflows

### 1. Develop Story Workflow

**File Pattern**: `story.{epic}.{story}.{name}.md`
**Location**: `docs/stories/`

**Starting Development**:

**CRITICAL**: Before implementing tasks, you MUST complete the Document Status Validation (see above).

After status validation passes:

1. Update story status to 'In Progress' if currently 'Not Started' or 'Ready for Development'
2. Update Dev Agent Record with:
   - Start Date: [YYYY-MM-DD]
   - Agent Model Used: [e.g., Claude Sonnet 4.5]
3. Proceed to task implementation

**Order of Execution**:

```
1. Complete Document Status Validation (see Document Status Validation section above)
2. Complete Risk Level Check (see Risk Level Check section above) — gates on risk_level: high
3. Complete Implementation Alignment Analysis (see Implementation Alignment Analysis section above)
4. Set story status to 'In Progress' (if currently 'Not Started' or 'Ready for Development')
5. Before reading task: use Agent tool with subagent_type="Explore" to find files this task will touch (check task description + acceptance criteria). Get compact summary. Then Read() only the directly relevant files.
6. Read first or next task
7. Implement task and its subtasks
8. Write tests (co-located .spec.ts files)
9. Execute validations (linting + tests)
10. Only if ALL tests pass → update task checkbox with [x]
11. Document work in Dev Agent Record → Implementation Approach:
   - What you built (architecture decisions, patterns used)
   - Key technical details (algorithms, data flows)
   - Integration points and dependencies
12. Update story File List section (all new/modified/deleted files)
13. Update Change Log with date and summary of changes
14. Repeat until all tasks complete
```

**Testing Checkpoints** (Execute at these milestones):

After implementing each task:

- **Unit Tests**: Run affected unit tests to verify the specific functionality works
- **Integration Tests**: If the task touches multiple components, run integration tests
- **Check Command**: `npx nx test <project> --testPathPattern=<test-file-pattern>`
- **Expected Outcome**: All tests pass before marking task complete

After completing 2-3 related tasks:

- **Regression Check**: Run the full test suite for the affected project
- **Check Command**: `npx nx test <project>`
- **Expected Outcome**: No regressions introduced

Before marking story as "Ready for Review":

- **Full Validation Suite**: Run all tests across all affected projects
- **Check Command**: `npx nx test <project> --coverage`
- **Expected Outcome**: All tests pass with coverage targets met (80%+ overall, 95%+ for financial operations)
- **Lint Check**: `npx nx lint <project>`
- **Expected Outcome**: No linting errors

**Test Failure Handling**:

When tests fail during implementation:

1. **First Failure**: Read test output carefully, identify root cause, fix the issue
2. **Second Failure**: Re-examine approach, consider alternative solution
3. **Third Failure**: HALT and document the blocker:
   - What you attempted
   - Test failures encountered
   - Potential root causes identified
   - Ask user for guidance or clarification

**Important**: Do not mark a task as complete if its tests are failing. Tests must pass before checking off task checkboxes.

**Blocking Conditions** (HALT and ask user):

- Unapproved dependencies needed
- Ambiguous requirements after checking story
- 3 consecutive failures implementing or fixing something
- Missing configuration
- Failing regression tests

**Ready for Review Criteria**:

- ✅ Code matches requirements
- ✅ All validations pass
- ✅ Follows coding standards
- ✅ File List is complete

**Completion Process**:

```
1. All Tasks and Subtasks marked [x] with tests
2. Run full validation and regression suite (EXECUTE ALL TESTS)
3. Complete Dev Agent Record documentation:
   - Implementation Summary (high-level overview)
   - Implementation Approach (detailed breakdown of all tasks)
   - Testing Results (test coverage statistics: X/X tests passing)
   - Completion Date
   - Deferred Work (if any items were not completed)
4. Ensure File List is complete (all created/modified/deleted files)
5. Ensure Change Log has all dated entries
6. Verify Definition of Done using the `/finalise` skill — it performs the full DoD checklist and marks the story as Accepted if all criteria pass
7. Set story status to 'Ready for Review'
8. HALT
```

**Story Completion Checklist — tick off each before halting:**

- [ ] All task checkboxes marked `[x]` (none left unchecked)
- [ ] Full test suite run: zero failures, coverage target met (80%+ overall, 95%+ financial)
- [ ] Lint run: zero errors
- [ ] Dev Agent Record complete: Implementation Summary, Approach, Testing Results, Completion Date, Deferred Work
- [ ] File List complete and accurate (all created/modified/deleted files)
- [ ] Change Log has dated entries for all significant changes
- [ ] Story status set to `Ready for Review`

### 2. Develop Task Workflow

**File Pattern**: `task.{id}.{name}.md`
**Location**: `docs/development/tasks/`

**Starting Development**:

**CRITICAL**: Before implementing task phases, you MUST complete the Document Status Validation (see above).

After status validation passes:

1. Update task status to 'In Progress' if currently 'Planned' or 'Ready for Development'
2. Update task metadata with:
   - Start Date: [YYYY-MM-DD]
   - Agent Model Used: [e.g., Claude Sonnet 4.5]
3. Proceed to phase implementation

**Order of Execution**:

```
1. Complete Document Status Validation (see Document Status Validation section above)
2. Complete Implementation Alignment Analysis (see Implementation Alignment Analysis section above)
3. Set task status to 'In Progress' (if currently 'Planned' or 'Ready for Development')
4. Read first or next implementation phase
5. Implement phase changes (update checkboxes)
6. Write tests (co-located .spec.ts files)
7. Execute validations (linting + tests)
8. Only if ALL tests pass → update phase checkboxes with [x]
9. Document work in task metadata:
   - What you built (architecture decisions, patterns used)
   - Key technical details (algorithms, data flows)
   - Integration points and dependencies
10. Update task Files Summary section (all new/modified/deleted files)
11. Update task change log with date and summary of changes
12. Repeat until all phases complete
```

**Blocking Conditions** (HALT and ask user):

- Unapproved dependencies needed
- Breaking changes not documented
- 3 consecutive failures implementing or fixing something
- Missing configuration
- Performance regression detected
- Failing regression tests

**Ready for Review Criteria**:

- ✅ Code matches technical specifications
- ✅ All validations pass
- ✅ Follows coding standards
- ✅ All success criteria met
- ✅ Files Summary is complete
- ✅ No performance regressions

**Completion Process**:

```
1. All Implementation Plan phases marked [x] with tests
2. Run full validation and regression suite (EXECUTE ALL TESTS)
3. Complete task documentation:
   - Implementation summary (high-level overview)
   - Implementation approach (detailed breakdown of all phases)
   - Testing results (test coverage statistics: X/X tests passing)
   - Completion date
   - Deferred work (if any items were not completed)
4. Validate all Success Criteria (Functional, Performance, Quality, Migration)
5. Ensure Files Summary is complete (all created/modified/deleted files)
6. Ensure change log has all dated entries
7. Update CHANGELOG.md if applicable
8. Set task status to 'Ready for Review'
9. HALT
```

**Task Completion Checklist — tick off each before halting:**

- [ ] All implementation plan phase checkboxes marked `[x]` (none left unchecked)
- [ ] Full test suite run: zero failures, coverage targets met
- [ ] Lint run: zero errors
- [ ] All Success Criteria validated (Functional, Performance, Quality, Migration)
- [ ] Task documentation complete: Implementation Summary, Approach, Testing Results, Completion Date, Deferred Work
- [ ] Files Summary complete and accurate (all created/modified/deleted files)
- [ ] Change Log has dated entries for all significant changes
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Task status set to `Ready for Review`

**QA Handoff**:

When task is complete, inform user that QA can review using `qa-review` skill for:

- Technical task assessment
- Risk validation
- Breaking changes verification
- Performance benchmarking
- Quality gate creation

After QA review passes, use `finalise` skill to verify Definition of Done and mark as accepted.

### 3. Review QA Feedback

When QA provides feedback, use the `qa-fix` skill to systematically implement fixes.

### 4. Finalise Story/Task

After QA review passes and all fixes are complete, use the `finalise` skill to verify Definition of Done and mark as accepted.

### 5. Run Tests

Execute project linting and test suite:

```bash
npx nx test <project> --coverage
```

### 6. Explain (Training Mode)

Teach what and why you did in detail, as if training a junior engineer.

## Project Configuration

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

**Key Paths**:

- Stories: `docs/prd/<domain>/epics/epic.{N}.*/stories/` (co-located within epics)
- Tasks: `docs/development/tasks/`
- QA Artifacts: `docs/qa/`
- PRD: `docs/prd/` (sharded)
- Architecture: `docs/architecture/` (sharded)
- Debug Log: `.ai/debug-log.md`

**Always-Loaded Files** (coding standards):

- `docs/architecture/concepts/coding-standards.md`
- `docs/architecture/concepts/tech-stack.md`
- `docs/architecture/concepts/source-tree.md`

**Story Directory Structure:**

Each story has its own subdirectory containing all related files:

```
docs/prd/<domain>/epics/epic.{N}.<name>/stories/
└── story.{epic}.{story}.{story-name}/
    ├── story.{epic}.{story}.{story-name}.md           # Story file (source of truth)
    ├── story.{epic}.{story}.qa.{number}.{descriptive-name}.md  # QA report (created by QA)
    ├── story.{epic}.{story}.gate.{number}.{descriptive-name}.yml # Quality gate (created by QA)
    ├── story.{epic}.{story}.bug.1.{description}.md    # Bug report 1 (created by QA)
    ├── story.{epic}.{story}.bug.2.{description}.md    # Bug report 2 (created by QA)
    └── ...
```

**File Naming Convention:**

- All files in a story directory share the same base: `story.{epic}.{story}`
- File type is indicated by the segment after the story ID:
  - `.qa.{number}.` = QA report
  - `.gate.{number}.` = Quality gate file
  - `.bug.{number}.` = Bug report (sequential numbering)
- Descriptive name comes last before the file extension
- Example: `story.178.8.swipe-actions-friend-requests.md`

**Developer Responsibilities:**

- Read the story file from its subdirectory
- Update only authorized sections (Tasks, Dev Agent Record, File List, Change Log, Status)
- Never modify QA-created files (QA reports, gate files)
- Update bug report files when fixing bugs (Investigation, Fix Implementation sections)

**Task Directory Structure:**

Each task has its own subdirectory containing all related files:

```
tasks/
└── task.{id}.{task-name}/
    ├── task.{id}.{task-name}.md                          # Task file (source of truth)
    ├── task.{id}.qa.{number}.{descriptive-name}.md       # QA report (created by QA)
    ├── task.{id}.bug.1.{description}.md                  # Bug report 1 (created by QA)
    ├── task.{id}.bug.2.{description}.md                  # Bug report 2 (created by QA)
    └── ...
```

**Task File Naming Convention:**

- All files in a task directory share the same base: `task.{id}`
- File type is indicated by the segment after the task ID:
  - `.qa.{number}.` = QA report
  - `.bug.{number}.` = Bug report (sequential numbering)
- Quality gate files are stored separately in `docs/qa/gates/tasks/`
- Descriptive name comes last before the file extension
- Example: `task.1.cache-lib-simplification.md`

**Task Developer Responsibilities:**

- Read the task file from its subdirectory
- Update Implementation Plan checkboxes as phases complete
- Update Files Summary section with all new/modified/deleted files
- Update Success Criteria checkboxes when criteria are met
- Never modify QA-created files (QA reports)
- Update bug report files when fixing bugs (Investigation, Fix Implementation sections)

## Task Planning

**Use TodoWrite when**:

- Task has 3+ distinct steps
- Multiple files will be affected
- Implementation requires coordination across layers

**Skip TodoWrite when**:

- Single straightforward change
- Trivial updates (< 3 steps)
- Purely conversational tasks

Reference: See CLAUDE.md "Task Management" section for complete guidelines.

## Platform-Specific Architecture

**Key Decision**: Does this code need to run in both client (React Native/browser) and server (NestJS/Node.js)?

### Client/Server Separation Required When

- Different runtime dependencies (Node.js packages vs React Native packages)
- Security-critical operations (password hashing, JWT signing - server only)
- Different behavior by platform (file system, environment variables, device detection)

### Pattern Structure

```typescript
// Client export (React Native/Browser)
libs / my - lib / src / client.ts;

// Server export (Node.js/NestJS)
libs / my - lib / src / server.ts;

// Common utilities (both platforms)
libs / my - lib / src / index.ts;
```

**Security Rule**: Never attempt crypto operations (hashing, signing, encryption) in client code. Server handles all security-critical operations.

Reference: See CLAUDE.md "Platform-Specific Security Architecture" for complete patterns.

## Testing Approach

**Test-First Development**:

1. Read affected files to understand dependencies
2. Create test file co-located with source (`.spec.ts` suffix)
3. Implement feature
4. Run tests: `npx nx test <project> --coverage`
5. Verify tests pass before completing

**Co-location Pattern**:

```
libs/example-lib/src/lib/
├── user-service.ts
├── user-service.spec.ts        # ✅ Co-located with source
```

**Coverage Targets**:

- 80%+ overall
- 95%+ for financial operations

Reference: See CLAUDE.md "Testing & Quality Standards" for complete testing patterns.

## Documentation Standards

**When to Document**:

- User-facing features → Use PRD/Epic/Story templates in `docs/templates/`
- Technical improvements → Use Technical Task documents or development-todos.md
- Bug fixes → Use GitHub Issues

**File Naming**:

- Epics: `epic.[number].[name].md`
- Stories: `story.[epic].[story].[name].md`
- Use dots (.) for structural separators, hyphens (-) within descriptive names

Reference: See CLAUDE.md "Documentation Standards" and `docs/templates/README.md`

## Library Creation

**When to Create New Library**:

- Shared functionality across multiple apps
- Distinct business domain
- Reusable utilities

**Create Using NX Generator**:

```bash
npx nx generate @nx/react-native:library my-lib \
  --directory=libs/my-lib \
  --linter=eslint \
  --unitTestRunner=jest
```

**Post-Creation**:

- Configure client/server exports if needed
- Add to namespace: `@goji-system/my-lib`
- Create corresponding test files

Reference: See CLAUDE.md "Creating Libraries" for complete setup.

## Development Workflow Pattern

**Typical Flow** (adapt as needed):

1. **Plan** - Use TodoWrite for multi-step tasks
2. **Map then Read** - Use Agent tool with subagent_type="Explore" to identify affected files and dependencies. Get the compact summary (file paths + 1-line descriptions), then only Read() the 2-4 files most critical to the current task. Do not load the entire dependency graph into the main context.
3. **Implement** - Follow dependency order (utilities → services → components → screens)
4. **Test** - Write and verify co-located test files
5. **Verify** - Run coverage checks
6. **Document** - Update relevant documentation if needed

## Common Patterns

**Multi-Wallet Architecture**:

- Users have multiple single-currency wallets (BSV, MNEE USD)
- Each wallet holds one currency type only

**Authentication Flow**:

- Server: Full auth-lib (hashing, JWT generation)
- Client: auth-lib/client (token parsing only)

**Logging**:

- Always use `@goji-system/logging-lib` (not console)
- Client: lightweight console logger
- Server: Winston-based structured logging

**Group Types** (5 types only):

- `'private_chat'`, `'savings_circle'`, `'betting_pool'`, `'creator_community'`, `'poker_place'`

**Terminology**:

- Use "handle" not "username" for user identity (@handle)
- Use "client" not "mobile" for platform separation

## Example: Simple Feature Implementation

```typescript
// 1. Plan (if 3+ steps)
TodoWrite: ["Research existing code", "Implement feature", "Add tests"]

// 2. Read affected files
Read: libs/my-lib/src/services/my-service.ts

// 3. Implement with platform separation
// libs/my-lib/src/server.ts (server-only)
export class MyService {
  async secureOperation(data: string) {
    // Server-side crypto
  }
}

// libs/my-lib/src/client.ts (client-safe)
export class MyClientService {
  parseData(data: string) {
    // No crypto operations
  }
}

// 4. Add co-located tests
// libs/my-lib/src/server.spec.ts
describe('MyService', () => {
  it('should handle secure operations', () => {
    // Test implementation
  });
});

// 5. Verify
npx nx test my-lib --coverage
```

## Anti-Patterns to Avoid

- Never create `__tests__/` directories (use co-location)
- Never import server utilities in React Native
- Never hash passwords or sign JWTs client-side
- Never use `any` type for financial data
- Never install packages in app directories (use workspace root)
- Never create local `node_modules` in apps/goji-wallet/

## References

**Complete Documentation**:

- Development patterns: `CLAUDE.md`
- Story templates: `docs/templates/README.md`
- Logging guide: `docs/development/logging-infrastructure-guide.md`
- E2E testing: `apps/goji-api/test/integration/groups/README.md`

**Key Commands**:

- Start Metro: `npx nx start goji-wallet --reset-cache --clear`
- Start API: `npx nx run goji-api:serve`
- Run tests: `npx nx test <project> --coverage`
- Build library: `npx nx build @goji-system/library-name`

---

**Note**: This skill provides flexible guidance. Adapt patterns based on specific feature requirements and always reference CLAUDE.md for authoritative project standards.
