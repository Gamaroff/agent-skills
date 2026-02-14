---
name: document-existing-project
description: Generate comprehensive brownfield architecture documentation for existing codebases optimized for AI development. Analyzes actual code patterns, technical debt, and constraints. Use when documenting legacy systems or existing projects for enhancement or onboarding.
---

# Document an Existing Project

## Purpose

Generate comprehensive documentation for existing projects optimized for AI development agents. This skill creates structured reference materials that enable AI agents to understand project context, conventions, and patterns for effective contribution to any codebase.

**Key Focus**: Document what EXISTS, not what should exist - including technical debt, workarounds, and real-world constraints.

## When to Use This Skill

Use this skill when:
- Documenting existing/legacy codebases
- Preparing for enhancements to existing systems
- Onboarding AI agents to brownfield projects
- Capturing "tribal knowledge" that only exists in developers' heads
- Creating architecture documentation for inherited projects
- Preparing for system refactoring or modernization
- Need comprehensive codebase understanding before making changes

## Critical Philosophy

**REALITY OVER IDEALS**

This skill creates BROWNFIELD documentation that:
- ✅ Documents actual state (not aspirational)
- ✅ Captures technical debt and workarounds
- ✅ Maps real patterns (even if inconsistent)
- ✅ Identifies constraints and gotchas
- ✅ Shows what exists (including legacy code)
- ❌ Does NOT prescribe what should be
- ❌ Does NOT hide problems or debt
- ❌ Does NOT document theoretical best practices

## Workflow Process

### 1. Initial Project Analysis

**CRITICAL:** First, check if a PRD or requirements document exists in context.

#### If PRD EXISTS:
- Review the PRD to understand what enhancement/feature is planned
- Identify which modules, services, or areas will be affected
- **Focus documentation ONLY on these relevant areas**
- Skip unrelated parts of the codebase to keep docs lean
- Document with enhancement context in mind

#### If NO PRD EXISTS:

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

Based on their response:
- If they choose option 1-3: Use that context to focus documentation
- If they choose option 4 or decline: Proceed with comprehensive analysis

### 2. Deep Codebase Analysis

**CRITICAL:** Before generating documentation, conduct extensive analysis of the existing codebase.

#### Explore Key Areas

1. **Entry Points**
   - Main files (main.js, index.js, app.js, server.js)
   - Application initializers
   - Bootstrap/startup code

2. **Configuration**
   - Configuration files (config/, .env.example)
   - Environment setup requirements
   - Build and deployment configurations

3. **Dependencies**
   - Package files (package.json, requirements.txt, Cargo.toml, pom.xml, etc.)
   - Identify languages, frameworks, libraries
   - Note specific versions

4. **Structure**
   - Directory organization
   - Module/service boundaries
   - Code organization patterns

5. **Existing Documentation**
   - README files
   - docs/ folders
   - Inline documentation
   - API specs

6. **Code Patterns**
   - Sample key files to understand coding patterns
   - Naming conventions
   - Architectural approaches
   - Identify inconsistencies between different parts

#### Ask Clarifying Questions

Before documenting, elicit critical information:

- **Purpose**: What is the primary purpose of this project?
- **Complexity**: Are there any specific areas of the codebase that are particularly complex or important for agents to understand?
- **Tasks**: What types of tasks do you expect AI agents to perform? (bug fixes, features, refactoring, testing)
- **Standards**: Are there any existing documentation standards or formats you prefer?
- **Audience**: What level of technical detail should the documentation target? (junior developers, senior developers, mixed team)
- **Focus**: Is there a specific feature or enhancement you're planning? (This helps focus documentation)
- **Pain Points**: What are the most problematic or confusing parts of the system?
- **Constraints**: What can't be changed? (legacy integrations, deployed code, etc.)

#### Map the Reality

Critical to capture:
- **ACTUAL patterns used** (not theoretical best practices)
- **Where key business logic lives** (not where it "should" be)
- **Integration points** and external dependencies
- **Workarounds** and technical debt
- **Areas that differ from standard patterns**
- **Code that can't be changed** (deployed, legacy, tightly coupled)

**IF PRD PROVIDED:** Also analyze what would need to change for the enhancement.

### 3. Core Documentation Generation

Generate a comprehensive BROWNFIELD architecture document that reflects the ACTUAL state of the codebase.

#### Document Structure

```markdown
# [Project Name] Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the [Project Name] codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on enhancements.

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

[Brief overview of the system architecture as it actually exists]

### Actual Tech Stack

| Category  | Technology | Version | Notes                      |
| --------- | ---------- | ------- | -------------------------- |
| Runtime   | Node.js    | 16.x    | [Any constraints]          |
| Framework | Express    | 4.18.2  | [Custom middleware?]       |
| Database  | PostgreSQL | 13      | [Connection pooling setup] |
[etc...]

### Repository Structure Reality Check

- **Type**: [Monorepo/Polyrepo/Hybrid]
- **Package Manager**: [npm/yarn/pnpm]
- **Notable**: [Any unusual structure decisions]

## Source Tree and Module Organization

### Project Structure (Actual)

```text
project-root/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic (NOTE: inconsistent patterns between modules)
│   ├── models/          # Database models
│   ├── utils/           # Mixed bag - needs refactoring
│   └── legacy/          # DO NOT MODIFY - old system still in use
├── tests/               # Jest tests (60% coverage)
├── scripts/             # Build and deployment scripts
└── config/              # Environment configs
```

### Key Modules and Their Purpose

[List major modules with actual file paths and responsibilities]

## Data Models and APIs

### Data Models

Instead of duplicating, reference actual model files:
- **User Model**: See `src/models/User.js`
- **Order Model**: See `src/models/Order.js`
- **Related Types**: TypeScript definitions in `src/types/`

### API Specifications

- **OpenAPI Spec**: `docs/api/openapi.yaml` (if exists)
- **Postman Collection**: `docs/api/postman-collection.json`
- **Manual Endpoints**: [List any undocumented endpoints discovered]

## Technical Debt and Known Issues

### Critical Technical Debt

1. **[Component Name]**: [Description of debt, why it exists, impact]
2. **[Another Component]**: [Specific technical debt details]
[etc...]

### Workarounds and Gotchas

- **[Workaround 1]**: [Description and why it's necessary]
- **[Gotcha 1]**: [What developers need to know]
[etc...]

## Integration Points and External Dependencies

### External Services

| Service  | Purpose  | Integration Type | Key Files                      |
| -------- | -------- | ---------------- | ------------------------------ |
| Stripe   | Payments | REST API         | `src/integrations/stripe/`     |
| SendGrid | Emails   | SDK              | `src/services/emailService.js` |
[etc...]

### Internal Integration Points

- **Frontend Communication**: [How frontend communicates with backend]
- **Background Jobs**: [Queue/worker setup]
[etc...]

## Development and Deployment

### Local Development Setup

1. [Actual steps that work (not ideal steps)]
2. [Known issues with setup]
3. [Required environment variables]

### Build and Deployment Process

- **Build Command**: [Actual build command]
- **Deployment**: [How deployments actually work]
- **Environments**: [Dev, Staging, Prod details]

## Testing Reality

### Current Test Coverage

- **Unit Tests**: [Actual coverage percentage]
- **Integration Tests**: [State of integration tests]
- **E2E Tests**: [E2E test status]
- **Manual Testing**: [Manual QA process]

### Running Tests

```bash
[Actual test commands]
```

## If Enhancement PRD Provided - Impact Analysis

### Files That Will Need Modification

Based on the enhancement requirements, these files will be affected:
- `path/to/file.js` - [What needs to change]
[etc...]

### New Files/Modules Needed

- `path/to/new/file.js` - [Purpose]
[etc...]

### Integration Considerations

- [How enhancement integrates with existing code]
- [Constraints to be aware of]
[etc...]

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
[List of common dev commands]
```

### Debugging and Troubleshooting

- **Logs**: [Where logs are]
- **Debug Mode**: [How to enable debugging]
- **Common Issues**: [Link to troubleshooting]
```

### 4. Document Delivery

#### In Web UI (Gemini, ChatGPT, Claude)
- Present the entire document in one response (or multiple if too long)
- Tell user to copy and save as `docs/brownfield-architecture.md` or `docs/project-architecture.md`
- Mention it can be sharded later in IDE if needed

#### In IDE Environment
- Create the document as `docs/brownfield-architecture.md`
- Inform user this single document contains all architectural information
- Can be sharded later using related skills if desired

The document should be comprehensive enough that future agents can understand:
- The actual state of the system (not idealized)
- Where to find key files and logic
- What technical debt exists
- What constraints must be respected
- If PRD provided: What needs to change for the enhancement

### 5. Quality Assurance

**CRITICAL:** Before finalizing the document:

1. **Accuracy Check**: Verify all technical details match the actual codebase
2. **Completeness Review**: Ensure all major system components are documented
3. **Focus Validation**: If user provided scope, verify relevant areas are emphasized
4. **Clarity Assessment**: Check that explanations are clear for AI agents
5. **Navigation**: Ensure document has clear section structure for easy reference

Apply advanced elicitation techniques after major sections to refine based on user feedback.

## Success Criteria

✅ Single comprehensive brownfield architecture document created
✅ Document reflects REALITY including technical debt and workarounds
✅ Key files and modules are referenced with actual paths
✅ Models/APIs reference source files rather than duplicating content
✅ If PRD provided: Clear impact analysis showing what needs to change
✅ Document enables AI agents to navigate and understand the actual codebase
✅ Technical constraints and "gotchas" are clearly documented
✅ Honest assessment of current state (not aspirational)

## Examples

### Example 1: Document E-Commerce Platform

```
User: "Document our legacy Node.js e-commerce platform"

Skill:
1. Asks if there's a PRD or planned enhancement
2. User says: "We want to add cryptocurrency payments"
3. Analyzes codebase focusing on payment-related modules
4. Documents actual payment flow (including legacy Stripe integration)
5. Identifies where crypto integration needs to happen
6. Notes technical debt in payment service
7. Provides focused brownfield documentation
```

### Example 2: Comprehensive Documentation

```
User: "Document our Python Flask API"

Skill:
1. Asks about focus - user wants full documentation
2. Analyzes entire codebase systematically
3. Discovers inconsistent patterns between modules
4. Documents actual structure (not ideal)
5. Identifies key files and entry points
6. Notes technical debt and workarounds
7. Creates comprehensive brownfield architecture doc
```

## Notes

- This skill creates ONE document that captures the TRUE state of the system
- References actual files rather than duplicating content when possible
- Documents technical debt, workarounds, and constraints honestly
- For brownfield projects with PRD: Provides clear enhancement impact analysis
- The goal is PRACTICAL documentation for AI agents doing real work
- Avoid aspirational language - focus on reality
- Be honest about problems and technical debt
- Highlight areas that can't be changed vs. areas that need improvement

## Resources

This skill may reference:
- Brownfield architecture template (via `create-architecture-doc` skill if needed)
- Project analysis tools and techniques
- Documentation standards from main architect skill

---

**Remember**: The best brownfield documentation is honest, practical, and focused on enabling real work - not creating an idealized view of the system.
