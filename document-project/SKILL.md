---
name: document-project
description: Generate comprehensive brownfield architecture documentation for existing projects optimized for AI development agents
---

# Brownfield Project Documentation

## When to Use This Skill

Use this skill when you need to:
- **Document existing codebases** for AI-assisted development
- **Create brownfield architecture documentation** that reflects actual state
- **Prepare legacy projects** for enhancement or modernization
- **Enable AI agents** to understand project context and patterns
- **Capture technical debt** and workarounds honestly
- **Focus documentation** on areas relevant to planned enhancements

## Purpose

This skill generates comprehensive documentation for existing projects that reflects the ACTUAL state of the codebase (not aspirational), including technical debt, workarounds, inconsistent patterns, and integration constraints. It creates structured reference materials enabling AI agents to contribute effectively to brownfield projects.

## Core Principles

### Document REALITY, Not Aspirations
- **Actual patterns used**, not theoretical best practices
- **Technical debt and workarounds** documented honestly
- **Inconsistencies** between different parts noted
- **Legacy constraints** that can't be changed
- **Performance bottlenecks** and known issues

### PRD-Aware Documentation
- **If PRD exists**: Focus on areas relevant to enhancement only
- **If no PRD**: Offer to create one first or document comprehensively
- **Targeted approach**: Keep docs lean by excluding unrelated code

### AI Agent Optimization
- **Clear entry points** and navigation aids
- **Reference actual files** rather than duplicating content
- **Document gotchas** and tribal knowledge
- **Provide practical guidance** for real work

## Workflow

### Step 1: Initial Project Analysis

**CRITICAL: Check for PRD or requirements document first**

**IF PRD EXISTS:**
- Review PRD to understand planned enhancement/feature
- Identify which modules, services, or areas will be affected
- Focus documentation ONLY on these relevant areas
- Skip unrelated parts to keep docs lean
- Proceed to deep analysis of relevant areas

**IF NO PRD EXISTS:**

Ask the user:

"I notice you haven't provided a PRD or requirements document. To create more focused and useful documentation, I recommend one of these options:

1. **Create a PRD first** - Would you like me to help create a brownfield PRD before documenting? This helps focus documentation on relevant areas.

2. **Provide existing requirements** - Do you have a requirements document, epic, or feature description you can share?

3. **Describe the focus** - Can you briefly describe what enhancement or feature you're planning? For example:
   - 'Adding payment processing to the user service'
   - 'Refactoring the authentication module'
   - 'Integrating with a new third-party API'

4. **Document everything** - Or should I proceed with comprehensive documentation of the entire codebase? (Note: This may create excessive documentation for large projects)

Please let me know your preference, or I can proceed with full documentation if you prefer."

**Based on response:**
- Options 1-3: Use that context to focus documentation
- Option 4 or decline: Proceed with comprehensive analysis

**Initial Discovery:**

1. **Project Structure Discovery** - Examine root directory, main folders, overall organization
2. **Technology Stack Identification** - Check package.json, requirements.txt, etc. for languages, frameworks, dependencies
3. **Build System Analysis** - Find build scripts, CI/CD configurations, development commands
4. **Existing Documentation Review** - Check README files, docs folders, existing documentation
5. **Code Pattern Analysis** - Sample key files to understand coding patterns, naming conventions, architecture

**Elicitation Questions:**
- What is the primary purpose of this project?
- Any particularly complex or important areas for agents to understand?
- What types of tasks should AI agents perform? (bug fixes, features, refactoring, testing)
- Existing documentation standards or preferred formats?
- Target technical level? (junior, senior, mixed team)
- Specific feature or enhancement planned? (helps focus documentation)

### Step 2: Deep Codebase Analysis

**CRITICAL: Conduct extensive analysis before generating documentation**

**Explore Key Areas:**
- Entry points (main files, index files, app initializers)
- Configuration files and environment setup
- Package dependencies and versions
- Build and deployment configurations
- Test suites and coverage

**Ask Clarifying Questions:**
- "I see you're using [technology X]. Any custom patterns or conventions to document?"
- "What are the most critical/complex parts that developers struggle with?"
- "Any undocumented 'tribal knowledge' areas to capture?"
- "What technical debt or known issues should be documented?"
- "Which parts change most frequently?"

**Map the Reality:**
- Identify ACTUAL patterns used (not theoretical)
- Find where key business logic lives
- Locate integration points and external dependencies
- Document workarounds and technical debt
- Note areas that differ from standard patterns

**IF PRD PROVIDED:**
- Also analyze what would need to change for the enhancement
- Identify affected files and modules
- Note integration considerations

### Step 3: Generate Brownfield Architecture Document

**CRITICAL: This is NOT an aspirational architecture document**

Document what EXISTS, including:
- Technical debt and workarounds
- Inconsistent patterns between different parts
- Legacy code that can't be changed
- Integration constraints
- Performance bottlenecks

**Document Structure:**

```markdown
# [Project Name] Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the [Project Name] codebase,
including technical debt, workarounds, and real-world patterns. It serves
as a reference for AI agents working on enhancements.

### Document Scope

[If PRD provided: "Focused on areas relevant to: {enhancement description}"]
[If no PRD: "Comprehensive documentation of entire system"]

### Change Log

| Date   | Version | Description                 | Author    |
| ------ | ------- | --------------------------- | --------- |
| [Date] | 1.0     | Initial brownfield analysis | [Analyst] |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `src/index.js` (or actual entry point)
- **Configuration**: `config/app.config.js`, `.env.example`
- **Core Business Logic**: `src/services/`, `src/domain/`
- **API Definitions**: `src/routes/` or link to OpenAPI spec
- **Database Models**: `src/models/` or link to schema files
- **Key Algorithms**: [List specific files with complex logic]

### If PRD Provided - Enhancement Impact Areas

[Highlight which files/modules will be affected by the planned enhancement]

## High Level Architecture

### Technical Summary

### Actual Tech Stack (from package.json/requirements.txt)

| Category  | Technology | Version | Notes                      |
| --------- | ---------- | ------- | -------------------------- |
| Runtime   | Node.js    | 16.x    | [Any constraints]          |
| Framework | Express    | 4.18.2  | [Custom middleware?]       |
| Database  | PostgreSQL | 13      | [Connection pooling setup] |

### Repository Structure Reality Check

- Type: [Monorepo/Polyrepo/Hybrid]
- Package Manager: [npm/yarn/pnpm]
- Notable: [Any unusual structure decisions]

## Source Tree and Module Organization

### Project Structure (Actual)

[Actual directory tree with HONEST annotations about technical debt]

### Key Modules and Their Purpose

[List with actual file paths and honest descriptions]

## Data Models and APIs

### Data Models

Reference actual model files rather than duplicating:
- **User Model**: See `src/models/User.js`
- **Order Model**: See `src/models/Order.js`

### API Specifications

- **OpenAPI Spec**: Link to actual spec file
- **Postman Collection**: Link if available
- **Manual Endpoints**: List undocumented endpoints discovered

## Technical Debt and Known Issues

### Critical Technical Debt

[Honest list of significant technical debt with file paths]

### Workarounds and Gotchas

[Document "tribal knowledge" that developers need to know]

## Integration Points and External Dependencies

### External Services

[Table of external integrations with key files]

### Internal Integration Points

[How different parts of the system communicate]

## Development and Deployment

### Local Development Setup

1. Actual steps that work (not ideal steps)
2. Known issues with setup
3. Required environment variables

### Build and Deployment Process

[Real commands and processes used]

## Testing Reality

### Current Test Coverage

[Actual coverage numbers and test types]

### Running Tests

[Real commands that work]

## If Enhancement PRD Provided - Impact Analysis

### Files That Will Need Modification

[Specific files affected by planned enhancement]

### New Files/Modules Needed

[New code that will be created]

### Integration Considerations

[How enhancement integrates with existing code]

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

[Real commands developers use]

### Debugging and Troubleshooting

[Practical debugging guidance]
```

### Step 4: Document Delivery

**In Web UI (Gemini, ChatGPT, Claude):**
- Present entire document in one response (or multiple if too long)
- Tell user to copy and save as `docs/brownfield-architecture.md`
- Mention it can be sharded later in IDE if needed

**In IDE Environment:**
- Create document as `docs/brownfield-architecture.md`
- Inform user this single document contains all architectural information
- Can be sharded later using other skills if desired

**Document should enable future agents to understand:**
- Actual state of the system (not idealized)
- Where to find key files and logic
- What technical debt exists
- What constraints must be respected
- If PRD provided: What needs to change for the enhancement

### Step 5: Quality Assurance

**Before finalizing document:**

1. **Accuracy Check** - Verify all technical details match actual codebase
2. **Completeness Review** - Ensure all major system components documented
3. **Focus Validation** - If user provided scope, verify relevant areas emphasized
4. **Clarity Assessment** - Check explanations are clear for AI agents
5. **Navigation** - Ensure document has clear section structure for easy reference

Can use elicitation after major sections to refine based on user feedback.

## Integration with Other Skills

**Called by:**
- `analyst` - For brownfield project documentation
- `pm` - Before creating brownfield PRDs
- Any team member needing to understand existing codebase

**Calls:**
- None (standalone documentation skill)

**Outputs used by:**
- `pm` - Context for brownfield PRD creation
- `architect` - Understanding existing architecture before designing enhancements
- `dev` - Reference for implementing features in brownfield projects

## Best Practices

### Honesty First
- **Document reality** - No aspirational statements
- **Include technical debt** - Future developers need to know
- **Note workarounds** - Explain why things are done certain ways
- **Acknowledge inconsistencies** - Don't hide mixed patterns

### Focus Appropriately
- **PRD-driven focus** - If PRD exists, focus on relevant areas
- **Avoid over-documentation** - Don't document everything if only small area needed
- **Reference vs duplicate** - Link to model files rather than copying
- **Practical guidance** - What developers actually need to know

### AI Agent Optimization
- **Clear structure** - Easy navigation
- **File paths** - Always include actual paths
- **Entry points** - Show where to start exploring
- **Gotchas** - Document surprises upfront

## Success Criteria

A successful brownfield documentation includes:

1. **Single comprehensive document** - All architecture info in one place
2. **Reflects REALITY** - Technical debt, workarounds, constraints documented
3. **File references** - Actual paths to key files and modules
4. **Minimal duplication** - References source files rather than copying
5. **If PRD provided** - Clear impact analysis showing what needs to change
6. **AI agent ready** - Enables navigation and understanding of actual codebase
7. **Constraints documented** - Technical gotchas clearly explained

## Common Scenarios

### Scenario 1: Enhancement with PRD
1. User provides PRD for new feature
2. Skill focuses documentation on affected modules
3. Creates lean, targeted brownfield architecture doc
4. Includes impact analysis showing changes needed
5. Developers can quickly understand enhancement context

### Scenario 2: Legacy Modernization
1. User wants to document entire legacy system
2. Skill asks clarifying questions about focus
3. Conducts comprehensive codebase analysis
4. Documents actual patterns, technical debt, constraints
5. Creates honest brownfield architecture reference

### Scenario 3: Pre-PRD Documentation
1. User doesn't have PRD yet
2. Skill recommends creating brownfield PRD first
3. Helps create PRD to define enhancement scope
4. Then generates focused documentation
5. More efficient than documenting entire codebase

## Notes

- **One document approach** - Single comprehensive brownfield architecture document
- **Reality over aspiration** - Document what EXISTS
- **Reference over duplication** - Link to actual files when possible
- **Technical debt transparency** - Document workarounds and gotchas honestly
- **PRD-aware** - Uses PRD to focus documentation when available
- **Practical focus** - Enables AI agents to do real work on real codebases
