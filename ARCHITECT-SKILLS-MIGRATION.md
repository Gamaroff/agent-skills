# BMAD Architect to Claude Skills Migration Guide

## Overview

The BMAD architect agent has been successfully converted into a modular Claude Skills system. This document explains what changed, how to use the new skills, and the benefits of this approach.

## What Was Created

### Main Architect Skill

**Location**: `.claude/skills/architect/`

The main architect skill provides the persona and interface for all architecture work. Think of it as "Winston the Architect" - your pragmatic, holistic technical leader.

**Resources**:
- `architect-checklist.md` - Comprehensive validation framework
- `technical-preferences.md` - Your technical preferences

### Task Skills (4 Skills)

#### 1. Create Architecture Document (`create-architecture-doc`)

**Location**: `.claude/skills/create-architecture-doc/`

Interactive YAML-driven architecture document creation with mandatory user elicitation.

**Resources**:
- 4 architecture templates (backend, brownfield, frontend, full-stack)
- Elicitation methods guide

**Use Cases**:
- Creating new backend/service architecture
- Documenting existing (brownfield) systems
- Designing frontend-specific architectures
- Creating full-stack system architecture

#### 2. Document Existing Project (`document-existing-project`)

**Location**: `.claude/skills/document-existing-project/`

Comprehensive brownfield documentation for existing codebases.

**Use Cases**:
- Documenting legacy systems
- Onboarding to existing projects
- Capturing technical debt and constraints
- Preparing for system enhancements

#### 3. Execute Architect Checklist (`execute-architect-checklist`)

**Location**: `.claude/skills/execute-architect-checklist/`

Systematic architecture validation against 200+ quality criteria.

**Resources**:
- Complete architect checklist with 10 major sections

**Use Cases**:
- Validating architecture before development
- Architecture quality reviews
- Identifying gaps and risks

#### 4. Create Research Prompt (`create-research-prompt`)

**Location**: `.claude/skills/create-research-prompt/`

Generate structured research prompts for technical analysis.

**Use Cases**:
- Technology selection research
- Product validation
- Competitive analysis
- Market research

## Migration Comparison

### BMAD Agent Commands → Claude Skills

| BMAD Command | Claude Skills Approach |
|-------------|------------------------|
| `/bmad architect` | Invoke `architect` skill |
| `*help` | Automatic when architect skill loaded |
| `*create-backend-architecture` | "Create backend architecture" or invoke `create-architecture-doc` skill |
| `*create-brownfield-architecture` | "Document existing project" or invoke `document-existing-project` skill |
| `*create-front-end-architecture` | "Create frontend architecture" or invoke `create-architecture-doc` skill |
| `*create-full-stack-architecture` | "Create full-stack architecture" or invoke `create-architecture-doc` skill |
| `*document-project` | Invoke `document-existing-project` skill |
| `*execute-checklist` | Invoke `execute-architect-checklist` skill |
| `*research {topic}` | "Research {topic}" or invoke `create-research-prompt` skill |
| `*doc-out` | Request complete document output |
| `*exit` | Close skill or conversation |

## How to Use the New Skills

### Method 1: Natural Language (Recommended)

Claude will automatically invoke the appropriate skill based on your request:

```
User: "I need to create architecture for my new REST API"
Claude: [Invokes architect skill, then create-architecture-doc skill]

User: "Document our existing Node.js application"
Claude: [Invokes document-existing-project skill]

User: "Validate my architecture document"
Claude: [Invokes execute-architect-checklist skill]
```

### Method 2: Direct Skill Invocation

You can also directly invoke skills:

```
User: "Use the architect skill"
User: "Invoke create-architecture-doc skill"
User: "Run the execute-architect-checklist skill"
```

### Method 3: Through Main Architect Skill

Invoke the main architect skill and use its command structure:

```
User: "Use the architect skill"
Claude: "I'm Winston, your architect. How can I help?"

User: "create-backend-architecture"
Claude: [Invokes create-architecture-doc skill with backend template]
```

## Key Benefits

### 1. Modularity
- Each skill is independent and reusable
- Can use individual skills without loading entire agent
- Clear separation of concerns

### 2. Claude-Native Integration
- Follows Claude Skills documentation patterns
- Automatic progressive loading (only loads what's needed)
- Better performance and context management

### 3. Maintainability
- Easier to update individual skills
- Clear responsibility boundaries
- Resource management through skills framework

### 4. Scalability
- Easy to add new architecture templates
- Simple to extend with new validation criteria
- Can create specialized architecture skills

### 5. Resource Efficiency
- Progressive loading (metadata → instructions → resources)
- Only loads templates when needed
- Minimal context usage until skill is invoked

## Workflow Examples

### Example 1: Create New Backend Architecture

```
User: "I need to design architecture for a microservices-based e-commerce platform"

Claude:
1. Invokes architect skill (loads persona)
2. Invokes create-architecture-doc skill
3. Lists available templates
4. User selects backend architecture template
5. Walks through interactive template sections
6. Uses elicitation for key decisions
7. Generates comprehensive architecture.md
8. Optionally validates with checklist
```

### Example 2: Document Legacy System

```
User: "Document our existing PHP monolith"

Claude:
1. Invokes document-existing-project skill
2. Asks about PRD or enhancement plans
3. Analyzes codebase structure
4. Documents actual state (including technical debt)
5. Captures constraints and workarounds
6. Generates brownfield-architecture.md
```

### Example 3: Technology Research

```
User: "Help me research database options for our new project"

Claude:
1. Invokes create-research-prompt skill
2. Identifies as Technology Assessment research
3. Asks about scale, data model, constraints
4. Generates comprehensive research prompt
5. Provides framework for evaluation
6. User can use prompt with research tools or AI assistants
```

## What Stayed the Same

✅ Same comprehensive validation framework (200+ checklist items)
✅ Same architecture templates (4 templates)
✅ Same elicitation methodology
✅ Same interactive workflow approach
✅ Same pragmatic architecture philosophy
✅ Same persona (Winston the Architect)
✅ Same quality standards

## What Improved

✨ Better skill organization and modularity
✨ Clearer separation between persona and tasks
✨ More flexible invocation methods
✨ Resource management through Claude Skills framework
✨ Better context efficiency (progressive loading)
✨ Easier to extend and maintain
✨ More natural language interaction

## File Structure

```
.claude/skills/
├── architect/
│   ├── SKILL.md                                    # Main persona skill
│   └── resources/
│       ├── architect-checklist.md                  # Validation framework
│       └── technical-preferences.md                # Technical preferences
│
├── create-architecture-doc/
│   ├── SKILL.md                                    # Interactive doc creation
│   └── resources/
│       ├── elicitation-methods.md                  # Elicitation techniques
│       └── templates/
│           ├── architecture-tmpl.yaml              # Backend template
│           ├── brownfield-architecture-tmpl.yaml   # Brownfield template
│           ├── front-end-architecture-tmpl.yaml    # Frontend template
│           └── fullstack-architecture-tmpl.yaml    # Full-stack template
│
├── document-existing-project/
│   └── SKILL.md                                    # Brownfield documentation
│
├── execute-architect-checklist/
│   ├── SKILL.md                                    # Validation skill
│   └── resources/
│       └── architect-checklist.md                  # Complete checklist
│
└── create-research-prompt/
    └── SKILL.md                                    # Research prompt creation
```

## Backward Compatibility

### During Transition

- Original BMAD files remain in `.bmad-core/`
- You can continue using BMAD agents if needed
- Claude Skills system runs independently
- No breaking changes to existing workflows

### Recommended Approach

1. **Test the new skills** - Try them out on non-critical projects
2. **Compare results** - Validate that skills produce same quality
3. **Gradual migration** - Switch to skills when comfortable
4. **Keep both** - You can run both systems during transition

## Frequently Asked Questions

### Q: Do I need to change how I work?

**A:** No! You can use natural language as before. Claude will invoke the appropriate skills automatically.

### Q: Are the skills as comprehensive as the BMAD agent?

**A:** Yes! They contain all the same content, templates, and validation criteria. Just organized differently.

### Q: Can I use individual skills without the main architect skill?

**A:** Yes! Each task skill is self-contained and can be invoked directly.

### Q: What about other BMAD agents (PM, QA, Dev, etc.)?

**A:** The same conversion approach can be applied to all BMAD agents. Start with architect as a template.

### Q: How do skills handle resources?

**A:** Resources are stored in each skill's `resources/` directory and loaded only when needed by that skill.

### Q: Can I customize the skills?

**A:** Yes! Each SKILL.md file can be edited to adjust behavior, add commands, or modify workflows.

### Q: What happens to my existing architecture documents?

**A:** Nothing! Existing docs are unchanged. New skills will create documents in the same format.

### Q: Is there a performance improvement?

**A:** Yes! Progressive loading means only relevant content is loaded when needed, reducing context usage.

## Getting Started

### Quick Start

1. **Try the main architect skill**:
   ```
   User: "Use the architect skill"
   ```

2. **Create a simple architecture**:
   ```
   User: "Create backend architecture for a todo list API"
   ```

3. **Validate an existing architecture**:
   ```
   User: "Validate my architecture document at docs/architecture.md"
   ```

### Next Steps

- Explore each task skill individually
- Try creating different architecture types
- Use the checklist to validate your architectures
- Generate research prompts for technology decisions
- Document an existing project

## Support

If you encounter issues or have questions:

1. Check this migration guide
2. Review individual SKILL.md files for detailed instructions
3. Compare with original BMAD behavior if needed
4. Report issues or suggestions for improvement

## Summary

The BMAD architect agent has been successfully converted to Claude Skills with:
- ✅ 5 modular, reusable skills
- ✅ Same comprehensive content and quality
- ✅ Better organization and maintainability
- ✅ More flexible usage patterns
- ✅ Claude-native integration
- ✅ Resource efficiency improvements

**Ready to use!** Simply invoke skills naturally through conversation or direct invocation.

---

**Created**: October 30, 2024
**Version**: 1.0
**Status**: Ready for use
