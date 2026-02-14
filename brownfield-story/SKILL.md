---
name: brownfield-story
description: Create single user story for tiny brownfield changes (one focused development session). Use for minimal additions or bug fixes with straightforward integration and clear boundaries.
---

# Brownfield Story Creation

## When to Use This Skill

Activate when user needs:

- **Single-session** enhancement (2-4 hours max)
- No new architecture or significant design
- Follows existing patterns exactly
- Straightforward integration, minimal risk
- Isolated change with clear boundaries

**Natural triggers:**

- "Add [small feature] to existing app"
- "Quick fix for [issue]"
- "Single story for [change]"

**Decision Tree:**

- **Single session, isolated** → Use THIS skill
- **2-3 stories, some design** → Use `create-epic`
- **4+ stories, architectural changes** → Use `create-prd`

## Prerequisites

**Minimal context:**

- Relevant existing functionality identified
- Technology stack for this area noted
- Integration point(s) clearly understood
- Existing patterns for similar work identified

**Change scope:**

- Specific change clearly defined
- Impact boundaries identified
- Success criteria established

## File Naming Convention

**Format**: `story.[epic].[story].[descriptive-name].md`

**Examples**:

- `story.1.1.user-notifications.md`
- `story.2.3.payment-integration.md`
- `story.1.5.1.settings-enhancement.md`

**Location**: `docs/prd/[domain]/[feature]/stories/`

**Naming Rules**:

- Use DOTS (.) for structural separators
- Use hyphens (-) within descriptive names
- ✅ Correct: `story.2.1.auto-hide`
- ❌ Wrong: `story-2-1-auto-hide`

## Story Structure

```markdown
# {{Specific Enhancement}} - Brownfield Addition

## User Story

As a {{user type}},
I want {{specific action/capability}},
So that {{clear benefit/value}}.

## Story Context

**Existing System Integration:**

- Integrates with: {{existing component/system}}
- Technology: {{relevant tech stack}}
- Follows pattern: {{existing pattern to follow}}
- Touch points: {{specific integration points}}

## Acceptance Criteria

**Functional Requirements:**

1. {{Primary functional requirement}}
2. {{Secondary functional requirement (if any)}}
3. {{Integration requirement}}

**Integration Requirements:** 4. Existing {{relevant functionality}} continues work unchanged 5. New functionality follows existing {{pattern}} pattern 6. Integration with {{system/component}} maintains current behavior

**Quality Requirements:** 7. Change covered by appropriate tests 8. Documentation updated if needed 9. No regression in existing functionality verified

## Technical Notes

- **Integration Approach:** {{how connects to existing}}
- **Existing Pattern Reference:** {{link or description}}
- **Key Constraints:** {{important limitations}}

## Definition of Done

- [ ] Functional requirements met
- [ ] Integration requirements verified
- [ ] Existing functionality regression tested
- [ ] Code follows existing patterns and standards
- [ ] Tests pass (existing and new)
- [ ] Documentation updated if applicable

## Risk and Compatibility

**Minimal Risk Assessment:**

- **Primary Risk:** {{main risk to existing}}
- **Mitigation:** {{simple approach}}
- **Rollback:** {{how to undo}}

**Compatibility Verification:**

- [ ] No breaking changes to existing APIs
- [ ] Database changes (if any) additive only
- [ ] UI changes follow existing design patterns
- [ ] Performance impact negligible

## QA Handoff Notes

**Completed**: [Date]
**Developer**: [Name]
**Branch**: [branch-name]
**PR**: [PR link]

### Summary of Changes

[Developer adds summary when marking Ready for QA]

### Testing Instructions for QA

[Developer adds step-by-step testing instructions]

### Areas Requiring Special Attention

[Developer highlights edge cases, integration points, etc.]

### Known Limitations

[Developer documents any constraints or workarounds]

### QA Prerequisites Checklist

- [ ] All acceptance criteria implemented
- [ ] Unit tests written and passing
- [ ] Integration tests passing (if applicable)
- [ ] Code review completed and approved
- [ ] PR merged to develop branch
- [ ] No console.log statements or debugging code
- [ ] Documentation updated (README, inline comments)
- [ ] CI/CD pipeline passing

## QA Report

[Link to QA report will be added here when QA testing is complete]

## Bug Reports

### Open Bugs

[No open bugs]

### In QA Verification

[No bugs in verification]

### Closed Bugs

[No closed bugs]
```

## Key Principles

1. **Single session** - Completable in 2-4 hours
2. **Pattern conformity** - Follows existing patterns exactly
3. **Minimal risk** - Very low risk to existing system
4. **Simple integration** - Straightforward integration approach
5. **Easy rollback** - Simple reversal if needed

## Success Criteria

- Enhancement clearly defined for single session
- Integration approach straightforward and low-risk
- Existing system patterns identified and will be followed
- Rollback plan simple and feasible
- Acceptance criteria include existing functionality verification

## Notes

- For VERY SMALL brownfield changes only
- If complexity grows → escalate to create-epic
- Always prioritize existing system integrity
- Stories should take no more than 4 hours focused development
- When in doubt about integration → use create-epic
