---
name: create-epic
description: Create single epic for medium-sized brownfield enhancements (1-3 stories). Use when enhancement follows existing patterns, has minimal architectural changes, and manageable integration complexity.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
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

## ⚠️ Documentation-Only Scope — Do NOT Implement

This skill produces **the epic document and registry update only**. It MUST NOT begin implementing the stories the epic describes, nor scaffold any source code.

**Forbidden during this skill** (regardless of how compelling it seems):

- ❌ Editing, creating, or deleting any source file outside the epic's directory (and the registry/sprint-status side effects below)
- ❌ Creating story files (that is `create-story`'s job, invoked separately)
- ❌ Running migrations, codegen, build, lint-fix, or refactor commands
- ❌ Creating branches, committing, or pushing code changes
- ❌ Installing/removing dependencies or modifying `package.json`
- ❌ Auto-invoking `create-story`, `develop-story`, or any implementation skill on completion

**Allowed writes** (the only filesystem changes this skill may make):

- ✅ The epic file `docs/prds/[domain]/epics/epic.[N].[name]/epic.[N].[name].md`
- ✅ `/docs/development/epic-registry.md` (number reservation per the global numbering rule)
- ✅ Tracker issue creation if the workflow includes it (GitHub/Jira issue for the epic itself)

**If the user asks to "create the epic and start the first story"**: create the epic doc, then STOP and explicitly hand off — tell user to invoke `/create-story` as a separate step. Do not chain.

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

**Location**: `docs/prds/[domain]/epics/epic.[number].[descriptive-name]/` (Directory name must exactly match file name)

**Naming Rules**:

- Use DOTS (.) for structural separators
- Use hyphens (-) within descriptive names
- ✅ Correct: `epic.163.auto-hide`
- ❌ Wrong: `epic-163-auto-hide` or `epic.1.auto-hide` (number already used)

## Epic Structure

```markdown
---
epic_number: N
title: "[Enhancement Name]"
domain: "[Domain]"
status: "📋 Planned"
priority: "Critical | High | Medium | Low"
estimated_stories: N
created: YYYY-MM-DD
target_completion: YYYY-MM-DD
prd_source: "[source-document].md or brownfield-enhancement"
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

**Epic Story Guidelines:**

- **User-Value First:** Organize by user value, not technical layers.
- **No Forward Dependencies:** Stories must NOT depend on future stories within the epic. Each must be independently completable.
- **Incremental Technical Setup:** Create database entities or infrastructure ONLY in the story that first needs them.

### Stories Overview

| Story | Status         | Priority | Description                     |
| ----- | -------------- | -------- | ------------------------------- |
| [N].1 | ❌ Not Started | High     | {{Title and brief description}} |
| [N].2 | ❌ Not Started | Medium   | {{Title and brief description}} |
| [N].3 | ❌ Not Started | Low      | {{Title and brief description}} |

### Story [N].1: {{story_title}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

_(Repeat structure for Stories [N].2 and [N].3)_

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

## Visual Diagram (conditional, via `mermaid-architect`)

After drafting the Stories Breakdown, decide whether a Mermaid Value Stream diagram would clarify the epic. **Mandatory only if it enhances understanding** — do not pad the epic with a diagram that just restates the table.

**Justified when:** the epic has 3 stories with non-trivial sequencing constraints, cross-story dependencies, or risk-isolated parallel tracks.

**Process:**

1. Invoke `mermaid-architect` with: epic file path, the list of stories (with IDs and titles), and any sequencing constraints surfaced in Stories Breakdown.
2. The skill returns a `flowchart` (Value Stream type) showing story order, dependencies, and any parallel branches — plus a 2-sentence "Architectural assumptions" summary.
3. Paste the Mermaid block (with YAML metadata header) into a new "Story Flow" subsection placed between "Stories Breakdown" and "Compatibility Requirements".
4. Accept `no diagram justified — {reason}` without pushing back; not every epic needs one.

## Post-Creation Validation

After generating the epic file, invoke `documentation-standards-validator` to confirm:

- Filename uses dots as separators (`epic.NUMBER.descriptive-name.md`)
- All required YAML frontmatter fields are present (epic_number, title, domain, status, priority, estimated_stories, created, target_completion)
- Status indicator uses the standard icon (✅ 🔄 ⚠️ ❌ 📋)
- File placed in correct location (`docs/prds/[domain]/epics/epic.NUMBER.descriptive-name/`)

## Key Principles

1. **Scope constraint** - Maximum 3 stories
2. **User-Value First** - Stories must enable users to accomplish something meaningful, not just technical milestones
3. **No Forward Dependencies** - Stories must NOT depend on future stories; they must be independently completable in sequence
4. **Incremental Technical Setup** - Database creations or structural changes should only happen within the story that actually needs them
5. **Pattern adherence** - Follows existing architecture
6. **Risk minimization** - Low risk to existing system
7. **Integration awareness** - Clear integration approach
8. **Rollback feasibility** - Changes can be reversed

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

## Related Skills

- `documentation-standards-validator` - Validates epic file naming, YAML frontmatter fields, and status indicator usage after creation
- `epic-registry-manager` - Manages global epic numbering and registry updates
- `create-story` - Creates individual stories within the epic
- `mermaid-architect` - Generates Value Stream flowchart of the epic's stories when sequencing or parallelism warrants a diagram
