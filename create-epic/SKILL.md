---
name: create-epic
description: Create single epic for medium-sized brownfield enhancements (1-3 stories). Use when enhancement follows existing patterns, has minimal architectural changes, and manageable integration complexity.
---

# Brownfield Epic Creation

## When to Use This Skill

Activate when user needs:

- **Medium-sized** brownfield enhancement (1-3 stories)
- No significant architectural changes
- Follows existing project patterns
- Minimal integration complexity
- Low risk to existing system

**Natural triggers:**

- "Add [medium feature] to existing app"
- "Create epic for [enhancement]"
- "Need 2-3 stories for [feature]"

**Decision Tree:**

- **1-3 stories, follows patterns, low risk** → Use THIS skill
- **4+ stories, architectural changes** → Use `create-prd`
- **Single session, isolated** → Use `brownfield-story`

## Prerequisites

**Project context required:**

- Project purpose and current functionality
- Existing technology stack
- Current architecture patterns
- Integration points

**Enhancement clarity:**

- Enhancement clearly defined and scoped
- Impact on existing functionality assessed
- Integration points identified
- Success criteria established

**Epic Numbering (CRITICAL):**

- Check `/docs/development/epic-registry.md` for next available epic number
- Epic numbers are globally unique across entire system
- Reserve your number before creating epic file

## File Naming Convention

**Format**: `epic.[number].[descriptive-name].md`

**CRITICAL - Global Epic Numbering**:

1. Check `/docs/development/epic-registry.md` for next available number
2. Add your epic to registry table
3. Increment "Next Available Epic Number" counter
4. Use that number in your epic filename
5. Commit registry + epic file together

**Examples** (using globally unique numbers):

- `epic.163.user-notifications.md` (next available from registry)
- `epic.164.payment-integration.md` (incremented)
- `epic.163.5.settings-enhancement.md` (use decimals for intermediate epics)

**Location**: `docs/prd/[domain]/[feature]/epics/`

**Naming Rules**:

- Use DOTS (.) for structural separators
- Use hyphens (-) within descriptive names
- ✅ Correct: `epic.163.auto-hide`
- ❌ Wrong: `epic-163-auto-hide` or `epic.1.auto-hide` (number already used)

## Epic Structure

```markdown
---
title: 'Epic [N]: [Enhancement Name]'
prd_source: '[source-document].md or brownfield-enhancement'
epic_type: 'feature_enhancement'
priority: 'critical | high | medium | low'
estimated_sprints: 1-2
dependencies: []
status: 'NOT_STARTED | IN_PROGRESS | PARTIALLY_COMPLETE | COMPLETE'
completion_percentage: 0
team: ['developer-1']
---

# Epic [N]: {{Enhancement Name}} - Brownfield Enhancement

## Epic Goal

{{1-2 sentences: what accomplishes, why adds value}}

## Epic Description

**Existing System Context:**

- Current relevant functionality: {{brief description}}
- Technology stack: {{relevant technologies}}
- Integration points: {{where connects to existing}}

**Enhancement Details:**

- What's being added/changed: {{clear description}}
- How it integrates: {{integration approach}}
- Success criteria: {{measurable outcomes}}

## Stories Breakdown

| Story | Status         | Priority | Description                     |
| ----- | -------------- | -------- | ------------------------------- |
| [N].1 | ❌ Not Started | High     | {{Title and brief description}} |
| [N].2 | ❌ Not Started | Medium   | {{Title and brief description}} |
| [N].3 | ❌ Not Started | Low      | {{Title and brief description}} |

**Status Indicators**:

- ❌ Not Started
- 🔄 In Progress
- ⚠️ Blocked
- ✅ Complete

## Compatibility Requirements

- [ ] Existing APIs remain unchanged
- [ ] Database schema changes backward compatible
- [ ] UI changes follow existing patterns
- [ ] Performance impact minimal

## Risk Mitigation

- **Primary Risk:** {{main risk to existing}}
- **Mitigation:** {{how addressed}}
- **Rollback Plan:** {{how to undo}}

## Definition of Done

- [ ] All stories completed with acceptance criteria
- [ ] Existing functionality verified through testing
- [ ] Integration points working correctly
- [ ] Documentation updated appropriately
- [ ] No regression in existing features

## Completion Tracking

**Epic Progress**: [0%] (Update as stories complete)

**Timeline**:

- **Started**: [Date]
- **Target**: [Date]
- **Completed**: [Date]

**Story Completion**:

- Story [N].1: ❌ Not Started
- Story [N].2: ❌ Not Started
- Story [N].3: ❌ Not Started

**Update Progress**: Calculate as (completed stories / total stories) × 100
```

## Key Principles

1. **Scope constraint** - Maximum 3 stories
2. **Pattern adherence** - Follows existing architecture
3. **Risk minimization** - Low risk to existing system
4. **Integration awareness** - Clear integration approach
5. **Rollback feasibility** - Changes can be reversed

## Success Criteria

- Enhancement scope clearly defined and appropriately sized (1-3 stories)
- Integration respects existing architecture
- Risk to existing functionality minimized
- Stories logically sequenced for safe implementation
- Compatibility requirements specified
- Rollback plan feasible and documented

## Notes

- Specifically for SMALL brownfield enhancements
- If scope grows beyond 3 stories → use create-prd
- Always prioritize existing system integrity
- When in doubt about complexity → escalate to create-prd
