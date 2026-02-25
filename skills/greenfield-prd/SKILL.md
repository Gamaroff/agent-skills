---
name: greenfield-prd
description: Create Product Requirements Documents for new products from scratch. Use when starting a new product or major feature without existing codebase constraints. Orchestrates create-doc, prd-template, and pm-checklist.
---

# Greenfield PRD Creation

## When to Use This Skill

Activate this skill when the user needs to:

- Create a PRD for a **completely new product** (no existing codebase)
- Define requirements for a **major greenfield feature** built from scratch
- Document a **new product line or platform**
- Start a **fresh project** without legacy constraints

**Natural activation triggers:**

- "Create a PRD for a new..."
- "I need product requirements for..."
- "Draft PRD for greenfield..."
- "Starting a new product called..."

**Do NOT use for:**

- Enhancements to existing products (use `create-prd`, `create-epic`, or `brownfield-story`)
- Quick feature additions (use `brownfield-story`)
- Changes to existing PRDs (use `change-management`)

## Prerequisites

Before starting, recommend having:

1. **Project Brief** (strongly recommended) - Provides foundation:
   - Problem statement
   - Target users and personas
   - Success metrics and KPIs
   - MVP scope definition
   - Constraints and assumptions

2. **Market Research** (if available) - Optional but valuable:
   - Competitive analysis
   - User research findings
   - Market context

3. **Business Goals** (essential) - Clear articulation:
   - Why building this product
   - What success looks like
   - Timeline expectations

**If Project Brief missing:** The `prd-template` will guide gathering this information during Goals section, but it's more efficient to create brief first.

## Workflow Overview

This skill orchestrates a multi-stage workflow:

```
1. Pre-Flight Check
   ├─ Check for Project Brief
   ├─ Recommend deep-research-prompt if validation needed
   └─ Confirm user ready to proceed

2. Interactive PRD Creation
   ├─ Activate create-doc skill with prd-template
   ├─ Process each section interactively
   ├─ Mandatory elicitation stops at:
   │  ├─ Requirements (functional + non-functional)
   │  ├─ UI Design Goals
   │  ├─ Technical Assumptions
   │  ├─ Epic List
   │  └─ Epic Details (per epic)
   └─ Save incrementally to docs/prd.md

3. Quality Validation
   ├─ Offer to output full PRD
   ├─ Run pm-checklist validation
   ├─ Address any blockers
   └─ Insert checklist results into PRD

4. Next Steps Preparation
   ├─ Generate UX Expert Prompt
   ├─ Generate Architect Prompt
   └─ Provide handoff guidance
```

## Detailed Execution Steps

### Step 1: Pre-Flight Check

**Actions:**

1. Ask if Project Brief exists
2. If NO:
   - **Strongly recommend** creating Project Brief first
   - Explain benefits (essential foundation, clearer scope, better PRD)
   - If user insists on PRD without brief, proceed but note this in PRD
3. If brief exists:
   - Request brief location/content
   - Review brief to understand context
4. Ask if market validation needed:
   - If uncertain about market fit → recommend `deep-research-prompt`
   - If confident → proceed to PRD creation

**Example Dialog:**

```
"Do you have a Project Brief for this product? It provides essential
foundation (problem statement, target users, success metrics, MVP scope,
constraints). Creating a brief first will make the PRD process much smoother.

If no brief exists, I can still create the PRD, but we'll need to gather
that foundational information as we go."
```

### Step 2: Interactive PRD Creation

**Activate create-doc with prd-template:**

```
Use create-doc skill with:
- Template: prd-template (resources/prd-tmpl.yaml)
- Output: docs/prd.md
- Mode: Interactive (default)
```

**Section-by-Section Process:**

#### Section 1: Goals and Background Context

- **Goals:** Bullet list of desired outcomes
- **Background:** 1-2 paragraphs on what this solves and why
- **Change Log:** Version tracking table
- **Source:** Project Brief if available, otherwise elicit from user
- **No mandatory elicitation** (but can ask clarifying questions)

#### Section 2: Requirements (MANDATORY ELICITATION)

- **Functional Requirements (FR):** What the product must do
- **Non-Functional Requirements (NFR):** How the product must perform
- **Process:**
  1. Draft comprehensive requirements based on goals
  2. Present with detailed rationale (trade-offs, assumptions)
  3. **STOP - Present 1-9 elicitation options**
  4. Wait for user response
  5. Iterate based on feedback
- **Focus:** WHAT not HOW, testable, MVP-scoped

#### Section 3: UI Design Goals (MANDATORY ELICITATION, conditional)

- **Condition:** Only if PRD has UX/UI requirements
- **Subsections:**
  - Overall UX Vision
  - Key Interaction Paradigms
  - Core Screens and Views (conceptual)
  - Accessibility (None|WCAG AA|WCAG AAA)
  - Branding
  - Target Platforms
- **Process:**
  1. Pre-fill all subsections with educated guesses
  2. Present complete section
  3. Clearly indicate assumptions
  4. **STOP - Present 1-9 elicitation options**
  5. Wait for user response
- **Focus:** Product vision, not detailed UI spec

#### Section 4: Technical Assumptions (MANDATORY ELICITATION)

- **Subsections:**
  - Repository Structure (Monorepo|Polyrepo)
  - Service Architecture (Monolith|Microservices|Serverless)
  - Testing Requirements (Unit|Integration|Full Pyramid)
  - Additional Technical Assumptions
- **Process:**
  1. Note: .bmad-core directory was intentionally removed. Check for an attached technical-preferences file to pre-populate
  2. Ask about languages, frameworks, libraries, deployment
  3. Present with rationale
  4. **STOP - Present 1-9 elicitation options**
  5. Wait for user response
- **Focus:** Constraints for Architect, document ALL choices with rationale

#### Section 5: Epic List (MANDATORY ELICITATION)

- **Purpose:** High-level epic overview for approval
- **Process:**
  1. Draft epic list (titles + 1-sentence goals)
  2. Ensure logical sequencing:
     - Epic 1 = Foundation + initial functionality
     - Subsequent epics build incrementally
     - Cross-cutting concerns flow through epics
  3. Present with rationale
  4. **STOP - Present 1-9 elicitation options**
  5. Wait for user response
  6. Refine based on feedback
- **Key Rule:** Epics deliver deployable, testable value

**IMPORTANT - Epic Numbering:**
When epics are later converted to epic files (via `create-epics-from-shards` or manual creation), they will be assigned **globally unique** epic numbers from the system registry (`/docs/development/epic-registry.md`). In the PRD, refer to epics as "Epic 1", "Epic 2", etc., but understand these are _relative numbers_ within the PRD. The actual epic files will use system-wide unique numbers like `epic.163.md`, `epic.164.md`, etc.

#### Section 6: Epic Details (MANDATORY ELICITATION per epic, REPEATABLE)

- **Purpose:** Detailed epic specifications with stories
- **Process (per epic):**
  1. Draft epic goal (2-3 sentences)
  2. Draft all stories for this epic:
     - User story format (As a...I want...So that...)
     - Acceptance criteria (testable, comprehensive)
     - Logical sequencing within epic
     - AI-agent-sized (2-4 hours)
  3. Present complete epic with rationale
  4. **STOP - Present 1-9 elicitation options**
  5. Wait for user response
  6. Refine stories/acceptance criteria
  7. Repeat for next epic
- **Focus:** Vertical slices, clear value, testable acceptance criteria

### Step 3: Quality Validation

**Before final handoff:**

1. **Offer to output full PRD:**

   ```
   "The PRD is now complete. Would you like me to output the full
   document for your review before I run the quality validation?"
   ```

2. **Run pm-checklist:**
   - Activate `pm-checklist` skill
   - Validate all 9 categories
   - Generate comprehensive report
   - Insert results into PRD Section 7: Checklist Results Report

3. **Address blockers:**
   - If validation finds BLOCKERS:
     - Present issues clearly
     - Recommend specific fixes
     - Iterate on PRD sections as needed
     - Re-run validation if major changes
   - If validation PASSES:
     - Confirm ready for next phase

### Step 4: Next Steps Preparation

**Generate handoff prompts:**

#### UX Expert Prompt (Section 8.1)

```
Short, action-oriented prompt to initiate UX design phase:

"Using the PRD at docs/prd.md, create a comprehensive UX design
that addresses the UI Design Goals and supports all user stories.
Focus on [key interaction paradigms] and ensure [accessibility level]."
```

#### Architect Prompt (Section 8.2)

```
Short, action-oriented prompt to initiate architecture design phase:

"Using the PRD at docs/prd.md, create a technical architecture
that implements the functional requirements within the technical
assumptions defined. Address [key technical risks] and design for
[scalability/performance requirements]."
```

**Final output:**

```
"✅ Greenfield PRD complete at docs/prd.md

Summary:
- X functional requirements, Y non-functional requirements
- Z epics with AA total stories
- Validated with pm-checklist: [READY FOR ARCHITECT | NEEDS REFINEMENT]

Next Steps:
1. Hand off to UX Expert using prompt in PRD Section 8.1
2. Hand off to Architect using prompt in PRD Section 8.2
3. [If applicable] Use shard-prd if PRD is large, then create-epics-from-shards"
```

## Key Principles

### MVP-First Philosophy

- **Challenge every feature** - Is this truly essential for MVP?
- **Ruthless prioritization** - Nice-to-haves belong in phase 2
- **Minimum viable scope** - What's the smallest version that validates hypothesis?

### Logical Sequencing

- **Epic 1 is special** - Must establish foundation + deliver initial value
- **Build incrementally** - Each epic adds to previous
- **Cross-cutting concerns** - Integrated throughout (logging from day 1, not final epic)

### AI-Agent-Sized Stories

- **2-4 hour sessions** - Stories completable by AI agent without context overflow
- **Vertical slices** - Complete functionality, not horizontal layers
- **Clear value** - Each story delivers something testable and valuable

### Collaborative Creation

- **Mandatory elicitation stops** - Not optional efficiency shortcuts
- **Detailed rationale** - User must understand trade-offs
- **Iterative refinement** - Stories improve through user feedback

## Integration with Other Skills

**This skill orchestrates:**

- `create-doc` - Document creation engine
- `prd-template` - Greenfield PRD structure
- `pm-checklist` - Quality validation

**This skill may recommend:**

- `deep-research-prompt` - If market validation needed
- `shard-prd` - If PRD becomes large (>5 epics, >30 stories)
- `create-epics-from-shards` - After sharding to generate epic files

**Hands off to:**

- UX Expert (via UX Expert Prompt)
- Architect (via Architect Prompt)

## Success Criteria

A successful greenfield PRD produces:

1. **Clear Product Vision**
   - Goals articulated clearly
   - Background provides context
   - Problem-solution fit validated

2. **Comprehensive Requirements**
   - Functional requirements complete (WHAT not HOW)
   - Non-functional requirements specified
   - All requirements testable and MVP-scoped

3. **UX Guidance**
   - High-level UX vision documented
   - Core screens identified
   - Accessibility and platform requirements specified

4. **Technical Constraints**
   - Technology stack decisions documented with rationale
   - Architecture style specified
   - Testing requirements defined

5. **Logical Epic Structure**
   - Epics sequenced logically (foundation first)
   - Each epic delivers deployable value
   - Cross-cutting concerns integrated

6. **AI-Agent-Sized Stories**
   - Stories completable in 2-4 hours
   - Vertical slices with clear value
   - Comprehensive acceptance criteria

7. **Quality Validated**
   - Passed pm-checklist (READY FOR ARCHITECT)
   - Blockers addressed
   - Documentation complete

8. **Clear Handoffs**
   - UX Expert Prompt prepared
   - Architect Prompt prepared
   - Next steps explicit

## Example Activation

**Natural Language Trigger:**

```
User: "I need to create a PRD for a new task management app for developers"

→ greenfield-prd activates
→ Checks for Project Brief
→ Uses create-doc + prd-template
→ Processes sections interactively with elicitation stops
→ Validates with pm-checklist
→ Generates handoff prompts
→ Returns complete PRD at docs/prd.md
```

## Common Pitfalls to Avoid

❌ **Skipping Project Brief** - Makes PRD creation harder, less efficient
❌ **Bypassing elicitation stops** - Violates collaborative workflow mandate
❌ **Scope creep** - Including too many features for true MVP
❌ **Epic 1 as infrastructure only** - Must deliver initial functionality too
❌ **Stories too large** - AI agents need 2-4 hour focused sessions
❌ **Not validating quality** - Always run pm-checklist before handoff
❌ **Vague acceptance criteria** - Must be testable and comprehensive

✅ **Follow the workflow** - Pre-flight → Create → Validate → Handoff
✅ **Collaborate actively** - Use elicitation stops effectively
✅ **Challenge scope** - Ruthlessly prioritize for MVP
✅ **Size appropriately** - Stories must be AI-agent-completable

## Notes

- Greenfield PRDs typically take 1-3 hours to create interactively
- Elicitation stops are not optional - they ensure quality and alignment
- If PRD grows large (>5 epics), recommend using `shard-prd` after completion
- The pm-checklist validation is critical - don't skip it
- UX and Architect prompts enable smooth phase transitions
