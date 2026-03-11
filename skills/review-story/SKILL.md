---
name: review-story
description: Deep interactive story review that asks clarifying questions to resolve ambiguities, conflicts, and missing information. Use when story has unclear requirements or you need user input to guide recommendations.
---

# Review Story

## When to Use This Skill

Use this skill when:

- Story has **ambiguous requirements** that need clarification
- You need to **resolve conflicts or gaps interactively**
- You want **user input on technical decisions**
- Checking story accuracy against architecture documentation
- Finding inconsistencies in technical specifications
- Conducting deep peer reviews with user collaboration
- Investigating why a story implementation went off-track
- Improving story quality through interactive refinement

Natural language triggers:

- "Review story 2.3"
- "Check the story document for issues"
- "What's wrong with this story?"
- "Review the quality of story.310.5.md"
- "Find problems in the notification story"

## When to Use vs /validate-story

**Use `/review-story` (this skill) when**:

- 🔄 Story has **ambiguous requirements** that need clarification
- 🔄 You need to **resolve conflicts or gaps interactively**
- 🔄 You want **user input on technical decisions**
- 🔄 You're investigating why a story implementation went off-track
- 🔄 Story needs **deep analysis with clarifying questions**
- 🔄 You want to collaboratively refine the story with user input

**Use `/validate-story` instead when**:

- ✅ You need **automated validation** without user interaction
- ✅ Story appears complete and you want GO/NO-GO decision
- ✅ You're doing **batch validation** of multiple stories
- ✅ You want a **fast pre-implementation gate** (systematic check)
- ✅ You need a readiness score for project tracking

**Key Difference**: `/review-story` is **interactive** (asks clarifying questions to resolve ambiguities), while `/validate-story` is **automated** (no questions asked).

## Purpose

To conduct a comprehensive, **interactive** review of an existing story document, identifying:

- **Inaccuracies**: Incorrect technical details, misaligned with architecture
- **Gaps**: Missing information, incomplete sections, undefined requirements
- **Inconsistencies**: Conflicting information within the story or with related documents
- **Quality Issues**: Vague descriptions, unclear guidance, poor structure
- **Hallucinations**: Invented technical details not supported by source documents

**CRITICAL - Interactive Review Approach**:

Instead of making assumptions or creative decisions, this skill **asks clarifying questions** when encountering:

- Ambiguities or multiple valid interpretations
- Missing information that could be filled different ways
- Conflicts between story and architecture/epic
- Unclear intent or requirements
- Technical decisions that need user input
- Trade-offs between different approaches

The review produces **user-validated recommendations** through:

1. **Issue Detection** - Identify problems with specific locations
2. **Clarifying Questions** - Ask user to resolve ambiguities (using AskUserQuestion)
3. **User Decisions** - Capture user's intent and choices
4. **Aligned Recommendations** - Provide fixes based on user's vision

**Issue Severity Levels** (determined after user clarification):

- **Critical**: Must fix (blocks implementation or causes major issues)
- **Important**: Should fix (impacts quality or maintainability)
- **Optional**: Nice to have (improves clarity or completeness)

## Required Inputs

```yaml
required:
  - story_file: Path to story document to review

optional:
  - focus_areas: Specific areas to focus on (e.g., "testing", "API specs")
  - review_depth: "quick" | "standard" | "thorough" (default: "standard")
```

**Files to Load During Review**:

1. Story document — always load in full (primary artifact, stays in context throughout)
2. Parent epic — load selectively: targeted section reads only (ACs and story list), not the full file
3. Architecture documents — discovered via Explore subagent; load at most 2-3 most relevant files
4. Story template — load for structure compliance check only; release after Step 2
5. Previous stories — load only if story explicitly references continuity; a 1-line summary is usually sufficient

**CRITICAL**: Use the Explore subagent to discover documents before loading them. Never load all architecture docs blindly — always select based on story domain.

---

## Interactive Questioning Strategy

**CRITICAL**: This skill MUST ask clarifying questions instead of making assumptions or creative decisions.

### When to Ask Questions

Ask clarifying questions when encountering:

1. **Ambiguities**:
   - Multiple valid interpretations of requirements
   - Unclear or vague acceptance criteria
   - Undefined technical approaches
   - Ambiguous scope boundaries

2. **Conflicts**:
   - Story contradicts epic requirements
   - Technical specs conflict with architecture
   - Different sections of story contradict each other
   - Breaking changes to established patterns

3. **Gaps**:
   - Missing essential information
   - Incomplete technical specifications
   - Undefined error handling or edge cases
   - Unspecified integration points

4. **Technical Decisions**:
   - Choice between multiple valid approaches
   - Technology selection not in architecture docs
   - Pattern deviations without justification
   - Performance vs simplicity trade-offs

5. **Hallucinations**:
   - Technical claims not in architecture docs
   - Invented libraries or frameworks
   - API endpoints not in specs
   - Unverified technical details

### How to Ask Questions

Use `AskUserQuestion` tool with:

**Question Format**:

```yaml
question: '[Specific question about the issue]'
header: '[Short label, max 12 chars]'
options:
  - label: '[Option 1]'
    description: '[What this means and implications]'
  - label: '[Option 2]'
    description: '[What this means and implications]'
  - label: '[Option 3 if applicable]'
    description: '[What this means and implications]'
```

**Question Quality Guidelines**:

- **Specific**: Reference exact location in story
- **Contextual**: Explain what was found and why it's an issue
- **Actionable**: Options lead to clear fixes
- **Informed**: Present trade-offs and implications
- **Neutral**: Don't bias toward one option

### Question Examples

#### Example 1: Ambiguous Requirement

```yaml
question: "Story AC #2 says 'provide fast response times' but doesn't specify a measurable threshold. What is the acceptable response time?"
header: 'Response Time'
options:
  - label: '< 100ms (p95)'
    description: 'Very fast, requires caching and optimization. Standard for real-time features.'
  - label: '< 500ms (p95)'
    description: 'Fast enough for most user interactions. Easier to achieve.'
  - label: '< 2 seconds (p95)'
    description: 'Acceptable for non-critical operations. Minimal optimization needed.'
  - label: 'Not performance-critical'
    description: 'Remove specific timing requirement, rely on general performance standards.'
```

#### Example 2: Technical Conflict

```yaml
question: "Story Dev Notes mention using 'WebSocket' but architecture docs specify Socket.IO for real-time communication. Which should be used?"
header: 'Real-time Tech'
options:
  - label: 'Socket.IO (Recommended)'
    description: 'Matches architecture standard. Auto-fallback, rooms, namespaces. Already in use for chat.'
  - label: 'Native WebSocket'
    description: 'Lower-level, more control. Requires custom reconnection logic. Deviates from standard.'
  - label: 'Update architecture docs'
    description: 'Keep WebSocket in story, update architecture to allow native WebSocket for specific use cases.'
```

#### Example 3: Missing Information

```yaml
question: "Task 3 mentions 'implement error handling' but doesn't specify what errors to handle. What error scenarios should be covered?"
header: 'Error Cases'
multiSelect: true
options:
  - label: 'Network errors'
    description: 'Connection failures, timeouts, DNS errors'
  - label: 'Authentication errors'
    description: 'Invalid tokens, expired sessions, unauthorized access'
  - label: 'Validation errors'
    description: 'Invalid input, malformed data, constraint violations'
  - label: 'Server errors'
    description: '500 errors, database failures, external service failures'
```

#### Example 4: Scope Clarification

```yaml
question: "Story includes tasks for 'comprehensive testing' but epic only requires unit tests. Should integration/e2e tests be included?"
header: 'Test Scope'
options:
  - label: 'Unit tests only'
    description: 'Match epic requirement. Faster, simpler. Align with original scope.'
  - label: 'Unit + Integration'
    description: 'More thorough. Tests API interactions. Adds time but better quality.'
  - label: 'Full test suite'
    description: 'Unit + Integration + E2E. Maximum coverage. Significant time investment.'
  - label: 'Update epic'
    description: 'Comprehensive testing is the right approach. Update epic to match story scope.'
```

#### Example 5: Hallucination Resolution

```yaml
question: "Story mentions using 'react-query-plus' library which is not in tech-stack.md or package.json. How should data fetching be handled?"
header: 'Data Fetching'
options:
  - label: 'Use documented library'
    description: 'Replace with existing solution from architecture docs (specify which one)'
  - label: 'Add new library'
    description: 'react-query-plus is correct choice. Update tech stack docs and install it.'
  - label: 'Clarify intent'
    description: 'Story author meant something else. What was the intended approach?'
```

### Batching Questions

**IMPORTANT**: When multiple issues found in same category, batch related questions:

**Good** (batched):

```yaml
questions:
  - question: 'Three ACs have ambiguous criteria. Should all be made measurable?'
    # ... options
  - question: 'Two tasks mention undefined file paths. Use standard locations?'
    # ... options
```

**Bad** (one at a time):

- Asking 10 separate questions sequentially
- Making user answer questions one-by-one
- Interrupting review flow repeatedly

**Batching Strategy**:

1. Complete full review analysis first
2. Group related issues by category
3. Create 1-4 high-impact questions (max)
4. Ask all questions in single AskUserQuestion call
5. Use multiSelect where appropriate
6. Continue review with user's decisions

### After Questions Answered

1. **Incorporate User Decisions**: Use answers to inform recommendations
2. **Document Rationale**: Include user's reasoning in review report
3. **Prioritize Issues**: Severity based on user's priorities
4. **Aligned Recommendations**: Fixes reflect user's vision, not AI assumptions

---

## Review Workflow (9 Sequential Steps)

**NOTE**: Throughout all steps, collect issues and questions. Ask questions in batches at the end of each major phase (after Step 3, after Step 6) rather than interrupting continuously.

### Step 0: Determine Output Format

**Purpose**: Ask user whether they want a comprehensive review report file or just an actionable plan

**Actions**:

1. Use `AskUserQuestion` to ask about desired output format:

```yaml
question: 'Would you like a comprehensive review report saved to a file, or just an actionable plan for immediate fixes?'
header: 'Output Format'
options:
  - label: 'Comprehensive report'
    description: 'Generate detailed review report saved to [story-name].review.[date].md with all findings, user decisions, and recommendations documented.'
  - label: 'Action plan only'
    description: 'Provide prioritized list of issues and fixes to action immediately without saving a report file.'
```

2. Store user's choice for use in Step 9 (final output generation)

**Pipeline note**: When invoked by the `develop-story` orchestrator, this question will be answered autonomously ("Comprehensive report" is always selected). If running inside the develop-story pipeline, skip the AskUserQuestion and proceed directly with "Comprehensive report" as the format selection. Only ask interactively when invoked standalone.

**Output**: User's output format preference captured

---

### Step 1: Load Configuration and Context

**Purpose**: Establish project structure and locate all relevant documents

**Actions**:

1. Load `skills-config.yaml` from project root
   - If missing, use fallback defaults and notify user
   - Extract: `devStoryLocation` (default: `nested`), `prd.*`, `architecture.*`

**Default Configuration Values** (used if `skills-config.yaml` not found):

```yaml
markdownExploder: true
qa:
  qaLocation: docs/qa
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: '*/epics/epic.{n}.*.md'
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
# Stories stored within epic directories
devStoryLocation: nested
devStoryNestedPattern: "docs/prd/**/epics/*/stories"
devDebugLog: .ai/debug-log.md
slashPrefix: BMad
```

2. Load the story document directly using the Read tool — this is the primary artifact and must be in main context.
   - Locate at `{epicPath}/stories/{epic}.{story}.*.md`
   - Parse all sections: frontmatter, ACs, Tasks, Dev Notes, Dev Agent Record

3. **Discover supporting documents using Explore subagent:**

   Use the Agent tool with subagent_type="Explore" to find:
   - The parent epic file (pattern: `epic.{N}.*.md` in the epic directory)
   - Architecture documents relevant to this story's type (backend/frontend/full-stack/auth/payments)
   - The previous story in sequence (pattern: `story.{epic}.{story-1}.*.md`)
   - The story template (`resources/story-tmpl.yaml`)

   Ask the Explore subagent to return: **file paths + 1-line description only** (no file contents).

4. **Selectively load from the Explore results:**
   - Load the parent epic: read ONLY the "Stories" / "Acceptance Criteria" section (not the full file) — use offset/limit to target the relevant section
   - Load architecture docs: read at most **2-3 most relevant files** based on story type. For a backend story, prefer `coding-standards.md` and the relevant service architecture doc. Do NOT load all architecture docs.
   - Load story template: read for structure compliance reference
   - Previous story: only load if the story explicitly references continuity with it

**Output**: Compact context package — story in full, supporting docs selectively loaded

---

### Step 2: Template Structure Compliance Review

**Purpose**: Verify story follows required template structure

**Questions to Answer**:

- Are all required sections present?
- Are there unfilled placeholders (e.g., `{{role}}`, `_TBD_`, `[TODO]`)?
- Does structure match template requirements?
- Are all agent-editable sections included?
- Are QA integration sections present?

**Validation Checks**:

1. **Section Presence**:
   - Status
   - Story Statement
   - Acceptance Criteria
   - Tasks / Subtasks
   - Dev Notes
   - Testing (subsection of Dev Notes)
   - Manual Testing Steps (subsection of Dev Notes) — required for UI/navigation stories
   - Change Log
   - Dev Agent Record
   - QA Handoff Notes
   - QA Report
   - Bug Reports

2. **File Naming Convention**:
   - MUST follow: `story.[epic].[story].[descriptive-name].md`
   - Use DOTS (.) for structural separators
   - Use hyphens (-) within descriptive names
   - Examples:
     - ✅ `story.2.1.auto-hide.md`
     - ❌ `story-2-1-auto-hide.md`
     - ❌ `2.1-auto-hide.md`

3. **Placeholder Detection**:
   - Search for: `{{...}}`, `_TBD_`, `[TODO]`, `[PLACEHOLDER]`, `???`
   - Each unfilled placeholder is a gap

4. **Section Structure**:
   - Story Statement must use "As a / I want / So that" format
   - Acceptance Criteria must be numbered list
   - Tasks must use checkbox format with subtasks
   - Change Log must be table format

**Issues to Flag**:

- **Critical**: Missing required sections (Story, ACs, Tasks, Dev Notes)
- **Important**: Unfilled placeholders in core sections
- **Optional**: Missing optional sections or subsections

**Output**: Section compliance report with specific issues listed

---

### Step 3: Epic Alignment Verification

**Purpose**: Ensure story accurately implements epic requirements

**Questions to Answer**:

- Do Acceptance Criteria match epic requirements?
- Are there AC deviations without justification?
- Does story scope align with epic story definition?
- Are epic dependencies properly reflected?
- Are there requirements in epic not covered in story?

**Validation Checks**:

1. **AC Comparison**:
   - Compare story ACs with epic story requirements
   - Flag additions not in epic
   - Flag omissions from epic
   - Flag wording changes that alter meaning

2. **Scope Verification**:
   - Story should implement one epic story item
   - Should not expand beyond epic scope without notes
   - Should not reduce scope without justification

3. **Dependency Check**:
   - Epic dependencies should be documented in story
   - Cross-story dependencies should be noted

4. **Justification Review**:
   - If deviations exist, check for Dev Notes explaining why
   - Deviations without justification are issues

**Issues to Flag**:

- **Critical**: Missing epic ACs, unjustified scope reduction
- **Important**: AC wording changes meaning, missing dependencies
- **Optional**: Additional ACs without epic source reference

**Output**: Epic alignment report with deviations noted

**Questions to Collect** (for batch asking):

- When AC deviations found: Intentional change or mistake?
- When scope differs: Update story or update epic?
- When dependencies missing: Which dependencies are required?

---

### QUESTION POINT 1: Epic & Structure Clarifications

**CRITICAL**: Before continuing to technical review, ask batched questions about:

1. Template compliance issues (unfilled placeholders, missing sections)
2. File naming violations
3. Epic alignment conflicts
4. Scope clarifications

**Action**: Use `AskUserQuestion` with 1-4 questions (max) covering high-priority issues from Steps 2-3.

**Example Questions**:

```yaml
questions:
  - question: 'Story filename uses underscores (story_2_3.md) instead of required dots (story.2.3.md). Rename the file?'
    header: 'File Naming'
    options:
      - label: 'Yes, rename'
        description: 'Follow documentation standards with dots for structural separators'
      - label: 'Keep current'
        description: 'Underscore format is intentional for this project'

  - question: 'Story has 5 ACs but epic only specifies 3. Are the extra 2 ACs intentional additions?'
    header: 'AC Count'
    multiSelect: true
    options:
      - label: 'AC 4 is needed'
        description: 'Necessary addition not in epic. Update epic to include it.'
      - label: 'AC 5 is needed'
        description: 'Necessary addition not in epic. Update epic to include it.'
      - label: 'Remove extras'
        description: 'Story should match epic exactly. Remove AC 4 and 5.'
```

**After Questions**: Continue review with user's decisions incorporated.

### Context Hygiene After Phase 1

After receiving user answers to QUESTION POINT 1, consolidate findings before proceeding to technical review:

1. Write a **Phase 1 Summary** (5-10 bullet points) covering: template compliance result, epic alignment result, user decisions from Q1
2. Release the parent epic and architecture documents from active consideration — they are no longer needed for Steps 4–6
3. Retain in context: the story document, Phase 1 Summary, and user decisions only

This prevents the first-phase document load from polluting the technical review phases.

---

### Step 4: Technical Accuracy and Anti-Hallucination Review

**Purpose**: Verify all technical claims are accurate and sourced

**Questions to Answer**:

- Is every technical detail traceable to source documents?
- Are there invented technologies, libraries, or patterns?
- Do technical specs match architecture documentation?
- Are all references correct and accessible?
- Are version numbers and configurations accurate?

**Validation Checks**:

1. **Source Verification**:
   - Every technical claim should have `[Source: ...]` reference
   - Verify source documents exist and contain the claim
   - Check for vague sources ("according to standards", "best practices")

2. **Technology Inventory**:
   - Extract all mentioned libraries, frameworks, tools
   - Cross-reference with architecture/tech-stack.md
   - Flag anything not documented in architecture

3. **API Specification Accuracy**:
   - Verify endpoint paths match REST API spec
   - Check request/response formats against architecture
   - Validate HTTP methods and authentication requirements

4. **Data Model Accuracy**:
   - Verify schema definitions against data-models.md
   - Check field names, types, validations
   - Validate relationships and constraints

5. **Configuration Accuracy**:
   - Check environment variables exist
   - Verify file paths match project structure
   - Validate naming conventions

6. **Reference Validation**:
   - Test all `[Source: ...]` references point to real sections
   - Check internal story links work
   - Verify external document references exist

**Common Hallucination Patterns to Detect**:

- ❌ "Uses the standard React patterns" (vague, no source)
- ❌ "Authentication uses OAuth2" (if not in architecture)
- ❌ "Testing requires 80% coverage" (if not specified)
- ❌ "API uses Redis for caching" (no source reference)
- ❌ Libraries not in package.json or tech stack docs
- ❌ Endpoints not in API specification
- ❌ Database fields not in schema definitions

**Issues to Flag**:

- **Critical**: Invented libraries/APIs, incorrect schema/endpoints
- **Important**: Missing source references, unverified technical claims
- **Optional**: Vague references, could be more specific

**Output**: Technical accuracy report with hallucinations identified

---

### Step 5: Completeness and Gap Analysis

**Purpose**: Identify missing information needed for implementation

**Questions to Answer**:

- Is Dev Notes section complete enough to implement without external docs?
- Are all ACs covered by tasks?
- Are file locations specified for new code?
- Are testing requirements clear?
- Are error handling and edge cases addressed?
- Are integration points defined?
- Are security considerations documented?

**Validation Checks**:

1. **Dev Notes Completeness**:
   - Should cover all technical areas needed:
     - Data models/schemas (if applicable)
     - API endpoints (if applicable)
     - Component specifications (if UI)
     - File locations (always)
     - Testing requirements (always)
     - Technical constraints (if applicable)
   - Each area should have specific, actionable details

2. **AC to Task Mapping**:
   - Every AC should be referenced by at least one task
   - Tasks should indicate which ACs they satisfy: `(AC: 1, 3)`
   - Check for orphaned ACs with no corresponding tasks

3. **Task Completeness**:
   - Tasks should be specific and actionable
   - File paths should be concrete, not vague
   - Subtasks should break down implementation steps
   - Each task should be measurably completable

4. **Testing Coverage**:
   - Testing section should specify:
     - Test file locations
     - Testing frameworks/tools
     - Key test scenarios
     - Coverage requirements
   - Should not just say "write tests"

4a. **Manual Testing Steps** (UI/navigation stories only):
   - Must be present when story touches screens, modals, navigation, or user-visible interactions
   - Must include: Prerequisites, Navigation Path, Verification Steps (one per AC), Edge Cases
   - Navigation Path must name actual screens/buttons (not vague descriptions)
   - Every AC must map to at least one verification step
   - Acceptable placeholder: "To be confirmed during implementation" — but only for unknown screen names, not for the entire section
   - Flag as **Important** if section is absent on a UI story
   - Flag as **Optional** if present but navigation path uses vague language

5. **File Location Specification**:
   - New files should have specific paths
   - Paths should align with project structure docs
   - No vague locations ("in the services folder")

6. **Error Handling**:
   - Check for error scenarios in ACs or tasks
   - Should address failure cases, not just happy path
   - Should specify error messages/handling approach

7. **Integration Points**:
   - APIs consumed should be specified
   - Data sources should be identified
   - External dependencies should be listed
   - Integration testing should be planned

8. **Security Considerations**:
   - If story involves auth, data, or APIs:
     - Authentication requirements should be clear
     - Authorization checks should be specified
     - Input validation should be addressed
     - Sensitive data handling should be defined

**Issues to Flag**:

- **Critical**: ACs with no tasks, missing essential Dev Notes categories, no testing guidance
- **Important**: Vague file locations, missing error handling, incomplete testing specs
- **Optional**: Could add more detail, nice-to-have context

**Output**: Gap analysis report with missing information categorized

**Questions to Collect** (for batch asking):

- When critical gaps found: What should go in missing sections?
- When technical approach unclear: Which approach to use?
- When multiple valid options: User's preference?
- When testing scope undefined: What level of testing?

---

### QUESTION POINT 2: Technical & Completeness Clarifications

**CRITICAL**: Before continuing to consistency review, ask batched questions about:

1. Hallucinated technologies or approaches
2. Missing technical specifications
3. Incomplete Dev Notes sections
4. Unclear testing requirements
5. File location ambiguities

**Action**: Use `AskUserQuestion` with 1-4 questions (max) covering technical and completeness issues from Steps 3-4.

**Example Questions**:

```yaml
questions:
  - question: "Story mentions 'react-native-super-cache' library not in tech stack. What caching solution should be used?"
    header: 'Caching Lib'
    options:
      - label: 'Use documented lib'
        description: 'Replace with existing caching solution from architecture docs'
      - label: 'Add new library'
        description: 'Install react-native-super-cache and update tech stack docs'
      - label: 'Clarify approach'
        description: 'Describe the intended caching approach without assuming library'

  - question: 'Dev Notes missing database schema details. Should this story include schema changes?'
    header: 'Schema Work'
    options:
      - label: 'Yes, add schema'
        description: 'Story needs schema updates. Specify which models/fields.'
      - label: 'No schema work'
        description: 'Story only works with existing schema. No changes needed.'
      - label: 'Separate story'
        description: 'Schema changes should be separate story (dependency).'

  - question: "Testing section says 'comprehensive tests' but doesn't specify type. Which tests are needed?"
    header: 'Test Types'
    multiSelect: true
    options:
      - label: 'Unit tests'
        description: 'Test individual functions and components in isolation'
      - label: 'Integration tests'
        description: 'Test API interactions and service integration'
      - label: 'E2E tests'
        description: 'Test complete user flows end-to-end'
```

**After Questions**: Continue review with technical decisions clarified.

### Context Hygiene After Phase 2

After receiving user answers to QUESTION POINT 2, consolidate:
1. Write a **Phase 2 Summary**: technical accuracy issues found, user decisions, resolved hallucinations
2. Release any additional architecture docs loaded during Steps 4–6 from active consideration
3. Retain: story document, Phase 1 Summary, Phase 2 Summary, user decisions

Proceed to Phase 3 (recommendations and output) with a clean context containing only summaries + story.

---

### Step 6: Consistency and Conflict Detection

**Purpose**: Find contradictions within story or with related documents

**Questions to Answer**:

- Do sections of the story contradict each other?
- Do ACs and tasks align in scope and detail?
- Does story conflict with project structure standards?
- Are there conflicting technical approaches mentioned?
- Do configurations and code specs agree?

**Validation Checks**:

1. **Internal Consistency**:
   - ACs should align with Story Statement
   - Tasks should implement what ACs require
   - Dev Notes should support task execution
   - File paths should be consistent across mentions

2. **Technical Approach Consistency**:
   - Should not mention multiple solutions to same problem without decision
   - Technology choices should be consistent
   - Patterns should align (don't mix state management approaches)

3. **Project Structure Alignment**:
   - File locations should match unified-project-structure.md
   - Naming conventions should follow coding-standards.md
   - Module organization should match architecture patterns

4. **Configuration Consistency**:
   - Environment variables should be consistently named
   - Port numbers, endpoints should match across references
   - Database schema should match field names everywhere

5. **Cross-Story Consistency**:
   - If previous story exists, check for:
     - Contradicting decisions or approaches
     - Breaking changes to established patterns
     - Incompatible technical choices
   - Deviations should be justified

6. **Epic Consistency**:
   - Story should not contradict epic technical requirements
   - Should use same terminology and concepts
   - Should follow epic's architectural guidance

**Common Inconsistencies to Detect**:

- Tasks mention files in one location, Dev Notes specify different location
- ACs require feature X, tasks don't implement it
- Dev Notes say "use REST API", tasks reference GraphQL
- File paths use different naming conventions
- Previous story established pattern A, this story uses pattern B without explanation

**Issues to Flag**:

- **Critical**: Direct contradictions, breaking changes without justification
- **Important**: Inconsistent naming, misaligned approaches
- **Optional**: Minor terminology variations, could be more consistent

**Output**: Consistency report with conflicts identified

---

### Step 7: Quality and Clarity Assessment

**Purpose**: Evaluate story quality for developer usability

**Questions to Answer**:

- Can a developer understand what to build?
- Are instructions clear and unambiguous?
- Is technical guidance actionable?
- Are acceptance criteria measurable?
- Is the story self-contained enough?

**Validation Checks**:

1. **Clarity Scoring (1-10 scale)**:
   - **Story Statement**: Clear role, action, benefit?
   - **Acceptance Criteria**: Specific, measurable, testable?
   - **Tasks**: Actionable, clear sequence, proper granularity?
   - **Dev Notes**: Specific technical details vs vague guidance?
   - **Testing**: Clear test plan vs "add tests"?

2. **Ambiguity Detection**:
   - Vague terms: "appropriate", "as needed", "proper", "good"
   - Unmeasurable ACs: "fast", "user-friendly", "robust"
   - Unclear scope: "enhance", "improve", "optimize" without specifics
   - Multiple interpretations: "update authentication" (what part? how?)

3. **Self-Containment Assessment**:
   - Can story be implemented with minimal external document reading?
   - Are domain terms explained or obvious?
   - Are assumptions stated explicitly?
   - Is context provided for references?

4. **Developer Perspective**:
   - Would a competent developer know where to start?
   - Are there likely to be blocking questions?
   - Is the scope clear and bounded?
   - Are there obvious gotchas or warnings needed?

5. **AC Quality**:
   - Are they testable (can verify pass/fail)?
   - Are they specific (not vague goals)?
   - Are they measurable (quantifiable where possible)?
   - Are they independent (not overlapping)?

6. **Task Quality**:
   - Proper granularity (not too broad, not too detailed)?
   - Logical sequence (dependency order)?
   - Clear ownership (who/what does this)?
   - Completeness (nothing assumed that's not obvious)?

7. **Scope and Complexity Analysis**:
   - Count total tasks/subtasks (>10 tasks may indicate oversized story)
   - Estimate implementation time (>1 sprint suggests splitting)
   - Check for distinct feature areas that could be independent sub-stories
   - Identify tasks that could be parallelized as separate stories
   - Look for natural breakpoints (e.g., "Phase 1", "Phase 2" in tasks)
   - Assess if story mixes multiple concerns (backend + frontend + database)

   **Split Indicators**:
   - ✋ **10+ tasks total** - Story may be too large
   - ✋ **Multiple distinct features** - Each could be its own story
   - ✋ **"Phase 1/2/3" structure** - Phases could be sub-stories
   - ✋ **Mixed concerns** - Backend, frontend, database work could split
   - ✋ **Parallel-safe sections** - Independent work could be sub-stories

   **When to Recommend Splitting**:
   - Story would take >1 sprint to complete
   - Clear natural boundaries exist between tasks
   - Multiple developers could work in parallel on different sections
   - Story combines independent features that don't need to ship together

**Quality Issues to Flag**:

- **Critical**: Ambiguous ACs, unclear scope, missing context
- **Important**: Vague guidance, unmeasurable criteria, poor task granularity, **oversized story (recommend splitting)**
- **Optional**: Could be clearer, additional helpful detail

**Split Recommendation Issues**:

- **Recommend Splitting**: Story has 10+ tasks, multiple distinct features, clear natural boundaries, or estimated >1 sprint
  - Document specific split suggestions (which tasks go into which sub-story)
  - Identify parallel-safe sections
  - Suggest sub-story breakdown structure

**Output**: Quality assessment report with clarity scores, issues, and split recommendations (if applicable)

---

### Step 8: Previous Story Context Review (if applicable)

**Purpose**: Learn from previous implementation and ensure continuity

**Actions**:

1. If previous story exists (e.g., reviewing 2.3, so 2.2 exists):
   - Read Dev Agent Record sections
   - Extract implementation insights:
     - Patterns that worked well
     - Technical decisions made
     - Challenges encountered
     - Lessons learned
     - Deviations from original plan

2. Check if current story:
   - Incorporates relevant learnings
   - Avoids repeating mistakes
   - Maintains established patterns
   - References previous decisions where relevant

3. Verify continuity:
   - File locations consistent with previous story
   - Technology choices align
   - Patterns continue (or deviations justified)
   - No conflicting approaches

**Issues to Flag**:

- **Critical**: Contradicts previous story decisions without justification
- **Important**: Ignores relevant lessons learned, breaks established patterns
- **Optional**: Could benefit from previous story context

**Output**: Previous story context assessment

**Questions to Collect** (for batch asking):

- When clarity issues found: What was intended meaning?
- When conflicting approaches: Which to follow?
- When pattern breaks: Justified change or mistake?

---

### QUESTION POINT 3: Quality & Clarity Clarifications (Final)

**CRITICAL**: Before generating final report, ask batched questions about:

1. Ambiguous requirements or ACs
2. Conflicting information requiring resolution
3. Quality/clarity issues needing user input
4. Pattern deviations requiring justification
5. **Story split recommendations** (if story appears oversized)

**Action**: Use `AskUserQuestion` with 1-4 questions (max) covering remaining issues from Steps 5-7.

**IMPORTANT**: If scope analysis (Step 7.7) indicates story should be split, ALWAYS ask user whether to split.

**Example Questions**:

```yaml
questions:
  - question: "AC #3 says 'fast response time' which is unmeasurable. What specific performance threshold is required?"
    header: 'Performance'
    options:
      - label: '< 100ms (p95)'
        description: 'Very fast, requires caching/optimization'
      - label: '< 500ms (p95)'
        description: 'Fast enough for most interactions'
      - label: '< 2s (p95)'
        description: 'Acceptable for non-critical operations'
      - label: 'Remove threshold'
        description: 'No specific requirement, general standards apply'

  - question: "Tasks reference both '/api/v1/users' and '/api/users' endpoints. Which version is correct?"
    header: 'API Version'
    options:
      - label: 'Use v1 (/api/v1/users)'
        description: 'Versioned endpoints as per architecture standard'
      - label: 'Use unversioned (/api/users)'
        description: 'Unversioned for this specific case'
      - label: 'Consistency error'
        description: 'Should all be same. Correct tasks to use consistent version.'

  - question: 'Story uses different error handling pattern than previous story 2.2. Is this intentional?'
    header: 'Error Pattern'
    options:
      - label: 'Follow 2.2 pattern'
        description: 'Maintain consistency with established approach'
      - label: 'New pattern correct'
        description: 'This story requires different approach (explain why in Dev Notes)'

  - question: 'Story has 15 tasks across 3 distinct feature areas (database, API, frontend). This appears too large for one story. Should it be split into sub-stories?'
    header: 'Split Story'
    options:
      - label: 'Keep as one story'
        description: 'All tasks are tightly coupled and must ship together. Scope is acceptable.'
      - label: 'Split into sub-stories'
        description: 'Create sub-stories for parallel development. Provide suggested split structure in recommendations.'
      - label: 'Reduce scope'
        description: 'Some tasks should be moved to future stories. Identify which tasks to defer.'
```

**After Questions**: Generate final report incorporating all user decisions and clarifications.

---

### Step 9: Generate Output

**Purpose**: Provide actionable recommendations for story improvement in user's preferred format

**CRITICAL**: Use the output format preference captured in Step 0 to determine whether to generate:

- **Comprehensive Report**: Full review report saved to file
- **Action Plan Only**: Prioritized list of fixes for immediate action

---

### Option A: Comprehensive Report (if user chose "Comprehensive report")

**Actions**:

1. Generate complete review report following the structure below
2. Save to file: `[story-directory]/[story-name].review.[date].md`
3. Display summary to user with file location

**Report Structure**:

```markdown
# Story Review Report: Story [Epic].[Story] - [Title]

**Reviewed:** [Date]
**Review Depth:** [Quick/Standard/Thorough]
**Story Status:** [Current status from story]
**Overall Assessment:** [EXCELLENT / GOOD / NEEDS IMPROVEMENT / MAJOR ISSUES]

---

## Executive Summary

[2-3 sentences summarizing the review findings]

**Critical Issues:** [count] 🚨
**Important Issues:** [count] ⚠️
**Optional Improvements:** [count] 💡

**User Clarifications:** [count] questions asked and answered
**Implementation Readiness:** [1-10 score]
**Recommendation:** [READY TO IMPLEMENT / NEEDS REVISION / REQUIRES REWORK]

---

## User Decisions & Clarifications

**IMPORTANT**: This section documents the clarifying questions asked during review and user's decisions. All recommendations below incorporate these decisions.

### Question Point 1: Epic & Structure

**Q1: [Question asked]**

- **User Decision**: [Answer selected]
- **Impact**: [How this affects recommendations]

**Q2: [Question asked]**

- **User Decision**: [Answer selected]
- **Impact**: [How this affects recommendations]

### Question Point 2: Technical & Completeness

**Q3: [Question asked]**

- **User Decision**: [Answer selected]
- **Impact**: [How this affects recommendations]

**Q4: [Question asked]**

- **User Decision**: [Answer selected]
- **Impact**: [How this affects recommendations]

### Question Point 3: Quality & Clarity

**Q5: [Question asked]**

- **User Decision**: [Answer selected]
- **Impact**: [How this affects recommendations]

---

## 1. Template Structure Compliance

**Status:** [PASS / ISSUES FOUND]

### Issues

#### Critical

- [List critical template issues]

#### Important

- [List important template issues]

#### Optional

- [List optional template improvements]

### Recommendations (Based on User Decisions)

**IMPORTANT**: These recommendations incorporate user clarifications from Question Points above.

1. **[Action based on user decision]** - _Per user decision on Q[num]_
2. **[Action aligned with user's vision]** - _Per user decision on Q[num]_

---

## 2. Epic Alignment

**Status:** [ALIGNED / DEVIATIONS FOUND]

### Issues

#### Critical

- [Missing epic requirements]
- [Unjustified scope changes]

#### Important

- [AC deviations]
- [Missing dependencies]

#### Optional

- [Minor inconsistencies]

### Recommendations (Based on User Decisions)

**IMPORTANT**: These recommendations incorporate user clarifications about epic alignment.

1. **[Action based on user's choice about scope]** - _Per user decision on Q[num]_
2. **[Action aligned with user's intent]** - _Per user decision on Q[num]_

---

## 3. Technical Accuracy

**Status:** [ACCURATE / ISSUES FOUND]
**Hallucinations Detected:** [count]

### Issues

#### Critical (Hallucinations)

- **[Invented library/technology]**: Story mentions "[name]" but this is not in tech stack or architecture docs
  - **Location:** [Section where mentioned]
  - **Recommendation:** Remove or replace with documented alternative

- **[Incorrect API specification]**: Endpoint "[path]" does not match API spec
  - **Source:** Story claims [X], but docs say [Y]
  - **Recommendation:** Correct to match [source doc#section]

#### Important

- **[Missing source reference]**: Technical claim without source
  - **Location:** [Where in story]
  - **Recommendation:** Add [Source: architecture/file.md#section]

#### Optional

- [Vague references that could be more specific]

### Recommendations

1. [Action to fix hallucination]
2. [Action to add missing sources]
3. [Action to verify technical claims]

---

## 4. Completeness & Gaps

**Status:** [COMPLETE / GAPS FOUND]

### Issues

#### Critical

- **[Missing Dev Notes section]**: No guidance on [area]
  - **Impact:** Developer won't know [what]
  - **Recommendation:** Add section covering [specific details]

- **[ACs without tasks]**: AC [number] not covered by any task
  - **Impact:** Requirement won't be implemented
  - **Recommendation:** Add task to implement [specific AC]

#### Important

- **[Vague file location]**: Tasks mention "services folder" without specific path
  - **Recommendation:** Specify exact path: `apps/goji-api/src/modules/[module]/services/[file].ts`

- **[Missing testing detail]**: Testing section just says "write tests"
  - **Recommendation:** Specify test file locations, frameworks, key scenarios

#### Optional

- [Additional helpful context could be added]

### Recommendations

1. [Action to fill critical gap]
2. [Action to improve completeness]

---

## 5. Consistency & Conflicts

**Status:** [CONSISTENT / CONFLICTS FOUND]

### Issues

#### Critical

- **[Direct contradiction]**: ACs require [X] but tasks implement [Y]
  - **Location:** AC [num] vs Task [num]
  - **Recommendation:** Align tasks with AC requirement

#### Important

- **[Inconsistent naming]**: File paths use different naming conventions
  - **Examples:** [list examples]
  - **Recommendation:** Use consistent kebab-case throughout

- **[Breaks previous pattern]**: Story [prev] established [pattern], this story uses [different pattern]
  - **Recommendation:** Either follow previous pattern or add Dev Notes explaining why change is necessary

#### Optional

- [Minor terminology variations]

### Recommendations

1. [Action to resolve conflict]
2. [Action to ensure consistency]

---

## 6. Quality & Clarity

**Clarity Scores:**

- Story Statement: [1-10]/10
- Acceptance Criteria: [1-10]/10
- Tasks/Subtasks: [1-10]/10
- Dev Notes: [1-10]/10
- Testing Guidance: [1-10]/10

**Overall Clarity:** [1-10]/10

### Issues

#### Critical

- **[Ambiguous AC]**: AC [num] "[text]" is not measurable
  - **Problem:** Can't determine when it's done
  - **Recommendation:** Rephrase as: "[specific, measurable criterion]"

#### Important

- **[Vague task]**: Task "[text]" is not actionable
  - **Problem:** Developer won't know what to do
  - **Recommendation:** Break down into specific subtasks: [examples]

#### Optional

- [Could be clearer but not blocking]

### Recommendations

1. [Action to improve clarity]
2. [Action to make ACs measurable]
3. [Action to make tasks actionable]

---

## 7. Previous Story Context (if applicable)

**Status:** [CONSISTENT / ISSUES FOUND / N/A]

### Issues

- [Ignored lessons learned from previous story]
- [Contradicts previous technical decisions]
- [Missing continuity with established patterns]

### Recommendations

1. [Action to incorporate previous learnings]
2. [Action to maintain continuity]

---

## 8. Summary of Recommendations

### Must Fix (Critical) - [count] issues

1. [Highest priority fix with specific action]
2. [Second highest priority fix]
3. [etc.]

### Should Fix (Important) - [count] issues

1. [Important improvement with specific action]
2. [Second important improvement]
3. [etc.]

### Consider (Optional) - [count] items

1. [Nice-to-have improvement]
2. [Additional enhancement]
3. [etc.]

---

## Implementation Readiness Assessment

**Score:** [1-10]/10

**Scoring Breakdown:**

- Template Compliance: [score]/10
- Epic Alignment: [score]/10
- Technical Accuracy: [score]/10
- Completeness: [score]/10
- Consistency: [score]/10
- Quality & Clarity: [score]/10

**Confidence Level for Successful Implementation:** [High/Medium/Low]

**Recommendation:**

- ✅ **READY TO IMPLEMENT**: [If score >= 8 and no critical issues]
- ⚠️ **NEEDS REVISION**: [If score 5-7 or important issues exist]
- 🚨 **REQUIRES REWORK**: [If score < 5 or critical issues exist]

**Justification:** [1-2 sentences explaining the recommendation]

---

## Next Steps

[If READY]: Story is ready for implementation. Developer should:

1. Read Dev Notes thoroughly before starting
2. Follow task sequence as specified
3. Reference architecture docs for additional context as needed

[If NEEDS REVISION]: Address the following before implementation:

1. [Priority 1 revision]
2. [Priority 2 revision]
3. [Priority 3 revision]

[If REQUIRES REWORK]: Story requires significant rework:

1. [Major rework item 1]
2. [Major rework item 2]
3. Consider using `/create-story` to regenerate with proper context

---

## Review Metadata

- **Reviewer:** [Agent/Person]
- **Review Date:** [ISO date]
- **Review Depth:** [Quick/Standard/Thorough]
- **Story File:** [path]
- **Parent Epic:** [epic file path]
- **Architecture Docs Consulted:** [list]
- **Review Duration:** [time]
```

**Output**: Save review report to `[story-directory]/[story-name].review.[date].md`

---

### Option B: Action Plan Only (if user chose "Action plan only")

**Actions**:

1. Generate concise, prioritized action plan (DO NOT save to file)
2. Display directly to user for immediate action
3. Focus on critical/important issues only

**Action Plan Format**:

```markdown
# Story Review: [Story Title] - Action Plan

**Review Date:** [Date]
**Implementation Readiness:** [score]/10
**Status:** [READY / NEEDS REVISION / REQUIRES REWORK]

---

## Critical Issues (Must Fix) - [count]

1. **[Issue Title]**
   - **Problem:** [What's wrong]
   - **Location:** [Where in story]
   - **Fix:** [Specific action to take]
   - **User Decision:** [From clarifying questions if applicable]

2. **[Next critical issue]**
   - **Problem:** [What's wrong]
   - **Location:** [Where in story]
   - **Fix:** [Specific action to take]

[... all critical issues ...]

---

## Important Issues (Should Fix) - [count]

1. **[Issue Title]**
   - **Problem:** [What's wrong]
   - **Fix:** [Specific action to take]

2. **[Next important issue]**
   - **Problem:** [What's wrong]
   - **Fix:** [Specific action to take]

[... all important issues ...]

---

## Optional Improvements - [count]

1. [Brief improvement suggestion]
2. [Brief improvement suggestion]
3. [Brief improvement suggestion]

---

## Immediate Next Steps

**If READY TO IMPLEMENT:**

1. [Action 1]
2. [Action 2]
3. Begin implementation with `/develop` skill

**If NEEDS REVISION:**

1. [Priority 1 fix]
2. [Priority 2 fix]
3. [Priority 3 fix]
4. Run `/review-story` again after fixes

**If REQUIRES REWORK:**

1. [Major rework item 1]
2. [Major rework item 2]
3. Consider using `/create-story` to regenerate with proper context

---

**User Clarifications Applied:** [count] questions asked and answered
**Review Depth:** [Quick/Standard/Thorough]
**Review Time:** ~[minutes]

**Note:** This is an action plan only. No comprehensive report file was saved. To generate a full report with detailed documentation, run `/review-story` again and select "Comprehensive report".
```

**Output**: Display action plan to user (no file saved)

---

### Step 9.5: Offer to Implement Fixes

**Purpose**: Give the user the option to have the agent apply the recommended fixes to the story document immediately.

**When to Execute**: Always — after generating the report or action plan (Step 9), before the status update (Step 10).

**Actions**:

1. Use `AskUserQuestion` to ask:

```yaml
question: 'Would you like me to implement the recommended fixes to the story document now?'
header: 'Apply Fixes'
options:
  - label: 'Yes, apply all critical + important fixes'
    description: 'I will edit the story document to address all critical and important issues identified in the review.'
  - label: 'Yes, critical fixes only'
    description: 'I will apply only the must-fix (critical) changes to unblock implementation.'
  - label: 'No, I will fix manually'
    description: 'Skip automatic fixes. I will update the story document myself.'
```

2. **If "Yes, apply all critical + important fixes"** or **"Yes, critical fixes only"**:
   - Work through each issue in priority order (critical first, then important if selected)
   - For each fix: use the Edit tool to apply the change to the story document
   - After each fix, briefly state what was changed: `✅ Fixed: [issue title]`
   - If a fix requires information the agent doesn't have (e.g., user must decide the value), skip it and note: `⏭ Skipped: [issue title] — requires your input`
   - After all fixes applied, summarise:
     ```
     Fixes applied: [N]
     Skipped (needs your input): [M]
     ```
   - **Mark recommendations as implemented** — update both documents:

     **In the review report** (if a co-located report file was generated in Step 9):
     - Add the following line immediately after the readiness/score line in the report's opening summary block:
       `> **Implementation Status**: ✅ All recommendations implemented — YYYY-MM-DD`
       (or: `> **Implementation Status**: ✅ Critical/Important recommendations implemented — YYYY-MM-DD` if partial)
     - In the Recommended Actions / Issues list, prefix each applied item with `✅ ` and each skipped item with `⏭️ skipped — [reason]`

     **In the story file**:
     - Add the following line immediately after the `**Status**:` line at the top of the story:
       `**Review**: ✅ All review recommendations from \`[report-filename]\` implemented YYYY-MM-DD`
       (or: `**Review**: ✅ Critical/Important recommendations implemented YYYY-MM-DD — see review report for details` if partial)

3. **If "No, I will fix manually"**:
   - Acknowledge and proceed to Step 10
   - Remind user: "The full issue list is in the report above. Run `/review-story` again after making changes."

**Output**: Story document with fixes applied and implementation status noted on both report and story file (if user chose to apply), or unchanged (if user declined).

---

### Step 10: Update Document Status (if applicable)

**Purpose**: Update the story document status based on the review outcome

**CRITICAL**: This step ensures the story status reflects its readiness for development immediately after review.

**When to Execute This Step**:

- After generating comprehensive report OR action plan
- Only if current status indicates document is not yet ready (e.g., "Draft", "Not Started")

**Actions**:

1. **Check Review Outcome**:
   - If recommendation is **READY TO IMPLEMENT** (score >= 8, no critical issues) → Offer immediate status update
   - If recommendation is **NEEDS REVISION** or **REQUIRES REWORK** → Skip status update, inform user to fix and re-review

2. **If READY TO IMPLEMENT — Ask User About Status Update**:

   Use `AskUserQuestion` to confirm:

   ```yaml
   question: "Review result is READY TO IMPLEMENT with readiness score [X]/10. Update story status to 'Ready for Development'?"
   header: 'Update Status'
   options:
     - label: 'Yes, update status'
       description: "Update status to 'Ready for Development'. Story can be handed off to /develop."
     - label: 'Keep current status'
       description: "Leave status as '[current status]'. I'll update manually when ready."
   ```

3. **If NEEDS REVISION or REQUIRES REWORK**:
   - Do NOT offer status update
   - Inform user: "Story status remains '[current status]'. Address the critical/important issues above, then run `/review-story` again."

4. **Update Status Based on User Response** (READY TO IMPLEMENT path only):

   **If "Yes, update status"**:
   - Update story document `Status:` field to "Ready for Development"
   - Add entry to Change Log table:
     ```markdown
     | [date] | [version] | Review passed - ready for development | Review-Story |
     ```
   - Confirm update to user: "✅ Story status updated to 'Ready for Development'. You can now run `/develop` to begin implementation."

   **If "Keep current status"**:
   - Keep status unchanged
   - Inform user: "Story status unchanged at '[current status]'. Run `/develop` when ready."

5. **Status Update Implementation**:

   When updating status, use Edit tool:

   ```yaml
   file_path: [story-file-path]
   old_string: 'Status:** Draft'
   new_string: 'Status:** Ready for Development'
   ```

**Status Transition Rules**:

- `Draft` → `Ready for Development` (only when READY TO IMPLEMENT and user confirms)
- `Not Started` → `Ready for Development` (only when READY TO IMPLEMENT and user confirms)
- Any status → No change if NEEDS REVISION, REQUIRES REWORK, or user declines

**Output**: Story document with updated status field (if applicable)

**Example Flow**:

```
Review Complete: Score 9/10, no critical issues → READY TO IMPLEMENT
↓
Step 10: "Update story status to 'Ready for Development'?"
↓
User Selects: "Yes, update status"
↓
Status Updated: "Draft" → "Ready for Development"
Change Log Updated: Review entry added
↓
User Can Now: Run `/develop` to begin implementation
```

---

## Review Depth Modes

### Quick Review (15-30 minutes)

- Focus on critical issues only
- Template compliance
- Epic alignment
- Technical accuracy (major hallucinations only)
- High-level completeness check

**Use when**: Quick sanity check needed, time-constrained

### Standard Review (30-60 minutes) - DEFAULT

- All steps fully executed
- Comprehensive issue detection
- Actionable recommendations
- Full report generation

**Use when**: Normal pre-implementation review, quality gate

### Thorough Review (60-90+ minutes)

- All steps with deep analysis
- Cross-reference verification (actually check all sources)
- Detailed quality scoring
- Comprehensive recommendations with examples
- Comparison with similar stories for consistency

**Use when**: Critical story, high risk, mentoring junior developers, quality audit

---

## Success Criteria

Review is successfully completed when:

✅ All steps (0-10) systematically executed according to review depth
✅ Issues categorized by severity (critical/important/optional)
✅ Hallucinations identified and documented
✅ Gaps and inconsistencies flagged with specific locations
✅ Actionable recommendations provided for each issue
✅ Implementation readiness score calculated
✅ Clear GO/NO-GO recommendation made
✅ Comprehensive review report generated and saved (if applicable)
✅ Document status updated to reflect readiness (if fixes completed)

---

## Integration with Other Skills

**Called by**:

- `scrum-master` - For story quality assurance
- `po` - For product owner review
- Manual invocation by user

**Calls**:

- None (standalone review skill)

**Outputs used by**:

- Scrum masters to improve story quality
- Developers to understand story issues before starting
- Product owners to validate story accuracy
- QA to understand testing completeness

---

## Common Use Cases

### 1. Pre-Implementation Review

"Before starting work on story 2.3, review it for issues"

**Process**:

1. Standard review depth
2. Focus on implementation readiness
3. Flag blockers for developer

### 2. Quality Audit

"Review all stories in Epic 3 for quality"

**Process**:

1. Thorough review depth
2. Look for pattern violations
3. Ensure consistency across stories

### 3. Post-Mortem Analysis

"Story 4.2 implementation went off-track. Review the story to see why"

**Process**:

1. Thorough review depth
2. Focus on gaps and ambiguities
3. Compare original story to Dev Agent Record
4. Identify what was missing or unclear

### 4. Epic Migration Review

"Epic was updated. Review story 1.5 to ensure it still aligns"

**Process**:

1. Standard review depth
2. Focus on epic alignment
3. Check for new requirements or removed ones

### 5. Architecture Validation

"New architecture docs published. Review story 3.2 for accuracy"

**Process**:

1. Standard review depth
2. Focus on technical accuracy
3. Verify all sources still valid
4. Check for new patterns or standards

---

## Anti-Hallucination Protocol

This skill implements rigorous safeguards to DETECT hallucinations:

### Detection Rules

1. **Source Traceability**: Every technical claim MUST have verifiable source
2. **Cross-Reference Validation**: Claims MUST match source document content
3. **Invention Detection**: Flag any technology/pattern not in architecture docs
4. **Vague Source Detection**: Flag generic sources without specific references
5. **Assumption Verification**: Check explicit assumptions against reality

### Reporting Hallucinations

When hallucination detected:

```markdown
#### Critical (Hallucination)

- **[Category]**: [Specific invented detail]
  - **Location:** [Exact location in story]
  - **Issue:** Story claims [X] but this is not documented in [source docs]
  - **Evidence:** [What source check revealed]
  - **Recommendation:** [Specific fix - remove, replace, verify, or source]
```

### Verification Process

For each technical claim in story:

1. Extract claim
2. Find source reference
3. Load source document
4. Verify claim matches source content
5. Flag if:
   - No source reference exists
   - Source document doesn't exist
   - Source doesn't contain the claim
   - Source contradicts the claim

---

## Configuration Reference

Expected configuration in `skills-config.yaml`:

```yaml
# Project structure
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: '*/epics/epic.{n}.*.md'

architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture

# Stories stored within epic directories: {prdShardedLocation}/{category}/{component}/epics/{epic}/stories/
devStoryLocation: nested
devStoryNestedPattern: "docs/prd/**/epics/*/stories"
```

**Note**: If `skills-config.yaml` is missing, the skill will use sensible defaults based on the Goji project organization.

---

## Resources

This skill uses:

- `resources/story-tmpl.yaml` - Story template for structure validation
- `skills-config.yaml` - Project configuration (optional, uses fallbacks)

---

## Notes

- Review reports are saved separately as `[story-name].review.[date].md`
- Story status is updated in-place only when review outcome is READY TO IMPLEMENT and user confirms
- Can be used at any stage: draft, in progress, completed
- Supersedes `/validate-story` — provides everything validate-story does plus interactive clarification, epic alignment, consistency checks, and story split recommendations
- Designed to find problems, not just validate compliance

```

```
