---
name: create-prd
description: Create PRDs for enhancements to existing projects. Use when adding significant features to existing codebases that require comprehensive planning (4+ stories, architectural changes).
---

# Brownfield PRD Creation

## When to Use This Skill

Activate this skill when the user needs to:

- Add **significant enhancements** to existing codebase (4+ stories, architectural changes)
- Integrate new **major features** into established systems
- Perform **substantial modifications** requiring comprehensive planning
- Add features that require **deep understanding** of existing architecture

**Natural activation triggers:**

- "Add [major feature] to existing app"
- "Enhance [existing system] with..."
- "Integrate [new capability] into our..."
- "Modify [existing product] to support..."

**Decision Tree:**

- **Large enhancement** (4+ stories, architectural changes) → Use THIS skill
- **Medium enhancement** (1-3 stories, follows existing patterns) → Use `create-epic`
- **Small change** (single session, isolated) → Use `brownfield-story`

**Do NOT use for:**

- Greenfield projects (use `greenfield-prd`)
- Small enhancements (use `create-epic` or `brownfield-story`)
- Bug fixes (use GitHub issues)

## Critical: Scope Assessment Required

**BEFORE proceeding, assess enhancement complexity:**

1. **Can this be completed in 1-2 focused development sessions?**
   - YES → Recommend `brownfield-story` instead
   - NO → Continue with this skill

2. **Does this require architectural changes or 4+ stories?**
   - NO → Recommend `create-epic` instead
   - YES → Continue with this skill

3. **Is comprehensive planning required?**
   - NO → Recommend simpler approach
   - YES → Continue with this skill

**Communicate assessment:**

```
"Based on the complexity you've described, this appears to be a
[large/medium/small] enhancement. For this scope, I recommend using
[create-prd/create-epic/brownfield-story] because [rationale]."
```

## Prerequisites

Before starting, ensure you have:

1. **Existing Project Analysis** (CRITICAL):
   - Check if `document-project` was already run
   - If YES → Use existing analysis
   - If NO → Strongly recommend running `document-project` first
   - Benefits: Tech stack documentation, architecture overview, technical debt assessment, API docs

2. **Project Context** (ESSENTIAL):
   - IDE with project already loaded (preferred), OR
   - User-provided project information
   - Existing documentation in `docs/` folder

3. **Deep Understanding Requirement**:
   - MUST thoroughly analyze existing project structure, patterns, constraints
   - Every recommendation MUST be grounded in actual project analysis (not assumptions)
   - Confirm understanding with user before ANY suggestions

## Workflow Overview

```
1. Pre-Flight Check & Analysis
   ├─ Check for document-project output
   ├─ Assess scope complexity
   ├─ Analyze existing project structure
   └─ Confirm understanding with user

2. Interactive Brownfield PRD Creation
   ├─ Activate create-doc with brownfield-prd-template
   ├─ Process sections with emphasis on:
   │  ├─ Integration with existing system
   │  ├─ Compatibility requirements
   │  ├─ Risk assessment (technical debt, integration risks)
   │  └─ Incremental, low-risk story sequencing
   └─ Save to docs/prd.md

3. Quality Validation
   ├─ Run pm-checklist
   ├─ Validate integration approach
   └─ Ensure backward compatibility

4. Next Steps
   ├─ Generate handoff prompts
   └─ Provide integration guidance
```

## Detailed Execution Steps

### Step 1: Pre-Flight Check & Analysis

**1a. Check for document-project Output:**

```
"Have you run document-project on this codebase? It provides:
- Complete tech stack documentation
- Architecture overview
- API documentation
- Technical debt assessment
- Coding standards

If not available, I STRONGLY recommend running it first for better
enhancement planning."
```

**1b. Analyze Existing Project:**

**If document-project available:**

- Extract from "High Level Architecture" section
- Review "Technical Summary"
- Note "Technical Debt and Known Issues"
- Reference "Workarounds and Gotchas"

**Otherwise:**

- Explore project structure (directories, key files)
- Identify tech stack (languages, frameworks, database)
- Understand architecture patterns
- Note integration points
- Identify technical debt

**1c. Confirm Understanding (CRITICAL):**

For every assumption made about existing project:

```
"Based on my analysis, I understand that [assumption].
Is this correct?"
```

**Examples:**

- "I see you're using NestJS with PostgreSQL and Prisma"
- "Your authentication uses JWT with Passport.js"
- "The codebase follows a modular monolith architecture"

**Do NOT proceed until user validates understanding.**

### Step 2: Interactive Brownfield PRD Creation

**Activate create-doc with brownfield-prd-template:**

```
Use create-doc skill with:
- Template: brownfield-prd-template (resources/brownfield-prd-tmpl.yaml)
- Output: docs/prd.md
- Mode: Interactive (mandatory for brownfield)
```

**Section-by-Section Process:**

#### Section 1: Intro Project Analysis and Context

**Purpose:** Establish existing project understanding

**Subsections:**

**1a. Existing Project Overview:**

- Analysis Source (document-project output | IDE analysis | user-provided)
- Current Project State (what it does, primary purpose)

**1b. Available Documentation Analysis:**

- If document-project run → Reference existing docs
- Otherwise → Check for: Tech stack, architecture, API docs, UI guidelines, technical debt

**1c. Enhancement Scope Definition:**

- Enhancement Type (New Feature | Major Modification | Integration | Performance | UI/UX Overhaul | Stack Upgrade | Bug Fix)
- Enhancement Description (2-3 sentences)
- Impact Assessment (Minimal | Moderate | Significant | Major)

**1d. Goals and Background Context:**

- Goals (bullet list of desired outcomes)
- Background (why needed, what problem solved, how fits with existing project)
- Change Log (version tracking)

**No mandatory elicitation** (but confirm understanding)

#### Section 2: Requirements (MANDATORY ELICITATION)

**Emphasis on:**

- **Integration with existing system**
- **Backward compatibility**
- **Technical debt awareness**

**Subsections:**

**Functional Requirements (FR):**

- What enhancement must do
- How it integrates with existing functionality
- Example: "FR1: The existing Todo List will integrate with the new AI duplicate detection service without breaking current functionality."

**Non-Functional Requirements (NFR):**

- Performance constraints from existing system
- Example: "NFR1: Enhancement must maintain existing performance characteristics and not exceed current memory usage by more than 20%."

**Compatibility Requirements (CR) - CRITICAL FOR BROWNFIELD:**

- CR1: Existing API compatibility
- CR2: Database schema compatibility
- CR3: UI/UX consistency
- CR4: Integration compatibility

**Process:**

1. Draft requirements based on validated project understanding
2. Present with detailed rationale
3. Confirm: "These requirements are based on my understanding of your existing system. Please review carefully and confirm they align with your project's reality."
4. **STOP - Present 1-9 elicitation options**
5. Wait for user response
6. Iterate based on feedback

#### Section 3: UI Enhancement Goals (conditional, no mandatory elicitation)

**Condition:** Only if enhancement includes UI changes

**Focus:**

- Integration with existing UI patterns
- Design system consistency
- Modified/new screens only (not complete redesign)
- UI consistency requirements

#### Section 4: Technical Constraints and Integration Requirements

**Replaces separate architecture documentation for brownfield**

**Subsections:**

**Existing Technology Stack:**

- Extract from document-project if available
- Include version numbers and constraints
- Languages, frameworks, database, infrastructure, external dependencies

**Integration Approach:**

- Database integration strategy
- API integration strategy
- Frontend integration strategy
- Testing integration strategy

**Code Organization and Standards:**

- How new code fits existing patterns
- File structure approach
- Naming conventions
- Coding standards
- Documentation standards

**Deployment and Operations:**

- Build process integration
- Deployment strategy
- Monitoring and logging
- Configuration management

**Risk Assessment and Mitigation:**

- Reference technical debt from document-project
- Include "Workarounds and Gotchas"
- Technical risks
- Integration risks
- Deployment risks
- Mitigation strategies

#### Section 5: Epic and Story Structure (MANDATORY ELICITATION)

**Brownfield Principle:** Favor single comprehensive epic unless multiple unrelated enhancements

**Process:**

1. Assess epic structure need
2. Present rationale: "Based on my analysis of your existing project, I believe this enhancement should be structured as [single epic/multiple epics] because [rationale based on actual project analysis]. Does this align with your understanding of the work required?"
3. **STOP - Present 1-9 elicitation options**
4. Wait for user response

**Epic Approach Documentation:**

- Single epic (typical for brownfield)
- Multiple epics (only if clearly multiple unrelated enhancements)
- Rationale based on project analysis

**IMPORTANT - Epic Numbering:**
When epic files are created from this PRD, they will be assigned **globally unique** epic numbers from the system registry (`/docs/development/epic-registry.md`). In the PRD, refer to epics as "Epic 1", "Epic 2", etc. (relative numbers), but the actual epic files will use system-wide unique numbers like `epic.163.md`, `epic.164.md`, etc. This ensures no duplicate epic numbers across the entire project.

#### Section 6: Epic Details (MANDATORY per epic)

**CRITICAL STORY SEQUENCING FOR BROWNFIELD:**

**Rules:**

- Stories MUST ensure existing functionality remains intact
- Each story MUST include verification that existing features still work
- Stories sequenced to minimize risk to existing system
- Include rollback considerations for each story
- Focus on incremental integration (not big-bang changes)
- Size for AI agent execution in existing codebase context

**Confirmation Required:**
"This story sequence is designed to minimize risk to your existing system.
Does this order make sense given your project's architecture and constraints?"

**Story Structure:**

**User Story:**

```
As a [user type],
I want [action],
So that [benefit].
```

**Acceptance Criteria:**

- Define both new functionality AND existing system integrity
- Testable, comprehensive
- Include integration verification

**Integration Verification (IV) - UNIQUE TO BROWNFIELD:**

- IV1: Existing functionality verification
- IV2: Integration point verification
- IV3: Performance impact verification

**Process:**

1. Draft complete epic with all stories
2. Present with rationale (risk minimization approach)
3. **STOP - Present 1-9 elicitation options**
4. Wait for user response
5. Refine based on feedback

### Step 3: Quality Validation

**Same as greenfield:**

1. Offer to output full PRD
2. Run `pm-checklist` validation
3. Address blockers
4. Insert results into Checklist Results section

**Additional brownfield validation:**

- Verify compatibility requirements comprehensive
- Ensure integration approach sound
- Validate risk assessment includes technical debt
- Confirm story sequencing minimizes existing system risk

### Step 4: Next Steps

**Generate handoff prompts:**

- UX Expert Prompt (if UI changes)
- Architect Prompt (emphasizing integration with existing architecture)

**Brownfield-specific guidance:**

- Integration testing strategy
- Rollback procedures
- Monitoring for existing functionality
- Gradual rollout approach

## Key Principles

### Deep Understanding Required

- **Analyze, don't assume** - Ground all recommendations in actual project analysis
- **Confirm understanding** - Validate every assumption with user
- **Respect existing patterns** - Integrate, don't disrupt

### Compatibility First

- **Backward compatibility mandatory** - Existing functionality must not break
- **Integration verification explicit** - Test existing features after each story
- **Risk minimization** - Sequence stories for lowest risk

### Incremental Integration

- **No big-bang changes** - Gradual integration reduces risk
- **Rollback considerations** - Plan for reverting if issues arise
- **Existing system integrity** - Each story validates current functionality

### Technical Debt Awareness

- **Acknowledge existing debt** - Don't ignore known issues
- **Mitigation strategies** - Plan for working around constraints
- **Debt increase minimization** - Don't make debt worse

## Integration with Other Skills

**This skill orchestrates:**

- `create-doc` - Document creation engine
- `brownfield-prd-template` - Brownfield PRD structure
- `pm-checklist` - Quality validation

**This skill may recommend:**

- `document-project` - If existing project analysis missing
- `shard-prd` - If PRD becomes large
- `create-epics-from-shards` - After sharding

**May use in analysis:**

- Existing architecture docs
- Technical debt documentation
- API documentation

## Success Criteria

A successful brownfield PRD produces:

1. **Deep Project Understanding**
   - Existing architecture analyzed
   - Tech stack documented
   - Technical debt assessed
   - Integration points identified

2. **Comprehensive Requirements**
   - Functional requirements (with integration awareness)
   - Non-functional requirements (existing system constraints)
   - **Compatibility requirements** (backward compatibility ensured)

3. **Risk-Aware Planning**
   - Technical debt incorporated into risk assessment
   - Integration risks identified
   - Mitigation strategies defined
   - Rollback procedures planned

4. **Incremental Story Sequencing**
   - Stories minimize risk to existing system
   - Integration verification explicit
   - Gradual rollout approach
   - Existing functionality protected

5. **Quality Validated**
   - Passed pm-checklist
   - Compatibility requirements validated
   - Integration approach sound

6. **Clear Handoffs**
   - Architect prompt (integration-focused)
   - UX Expert prompt (if applicable)
   - Integration testing guidance

## Example Activation

**Natural Language Trigger:**

```
User: "Add biometric authentication to our existing mobile banking app"

→ create-prd activates
→ Checks for document-project output
→ Analyzes existing authentication system
→ Confirms understanding with user
→ Uses create-doc + brownfield-prd-template
→ Emphasizes compatibility requirements
→ Sequences stories for minimal risk
→ Validates with pm-checklist
→ Returns complete brownfield PRD
```

## Common Pitfalls to Avoid

❌ **Assuming project structure** - Must analyze, not guess
❌ **Ignoring technical debt** - Known issues impact enhancement planning
❌ **Big-bang integration** - Incremental approach reduces risk
❌ **Skipping compatibility requirements** - Backward compatibility critical
❌ **Not validating understanding** - Confirm assumptions before proceeding
❌ **Recommending full PRD for small changes** - Use create-epic or brownfield-story for simpler enhancements

✅ **Analyze existing project thoroughly**
✅ **Confirm understanding at every step**
✅ **Emphasize compatibility and integration**
✅ **Sequence stories for risk minimization**
✅ **Validate quality with pm-checklist**

## Notes

- Brownfield PRDs require more upfront analysis than greenfield
- Always recommend `document-project` if not already run
- Compatibility Requirements section is unique to brownfield
- Integration Verification in stories is brownfield-specific
- Story sequencing for risk minimization is critical
- Technical debt must be incorporated into planning
