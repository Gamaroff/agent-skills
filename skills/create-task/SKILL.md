---
name: create-task
description: Create comprehensive technical task documentation for refactoring, infrastructure changes, and technical improvements. Interactive workflow with decision guidance for non-user-facing work.
---

# Create Task

## When to Use This Skill

### Decision Tree

Use this decision tree to determine the right documentation type:

```
Is this user-facing?
├─ YES → Use PRD/Epic/Story structure
└─ NO → Is it a technical improvement?
    ├─ YES → Is it complex (3+ major steps)?
    │   ├─ YES → Use this skill (/create-task)
    │   └─ NO → Add to development-todos.md
    └─ NO → Is it a bug fix? → Use GitHub Issue
```

### When to Use

Activate this skill when:

- Creating comprehensive technical task documentation for refactoring, infrastructure changes, or technical improvements
- Task requires 3+ implementation phases with complex success criteria
- Task involves breaking changes that need migration paths
- Task requires QA review with formal gate decision process
- Need to document performance baselines, risk assessment, or rollback procedures

**Use cases**:

- ✅ Architecture refactoring (e.g., simplifying cache layers)
- ✅ Infrastructure improvements (e.g., migration to new database)
- ✅ Technical debt reduction (e.g., removing deprecated code)
- ✅ Performance optimization work
- ✅ Security improvements (e.g., upgrading auth system)
- ✅ Developer tooling improvements
- ✅ Build system changes
- ✅ Dependency upgrades with breaking changes

**Related Skills**:

- `scrum-master` - For orchestrating technical task creation in project planning
- `qa-review` - For QA assessment after task implementation
- `qa-gate` - For formal quality gate decision on technical tasks

### When NOT to Use

**Do NOT use** for:

- ❌ User-facing features → Use `create-prd` or `create-story`
- ❌ Simple changes (< 3 steps) → Use `development-todos.md`
- ❌ Bug fixes → Use GitHub Issues
- ❌ Quick improvements → Add to `development-todos.md`

---

## ⚠️ CRITICAL EXECUTION RULES ⚠️

### This is an Interactive Document Creation Workflow

When this skill is activated:

1. **USER COLLABORATION IS MANDATORY** - Full interactive workflow required
2. **STEP-BY-STEP SECTION BUILDING** - Process each of 11 sections sequentially
3. **VALIDATION REQUIRED** - Verify completeness before generating final document
4. **FILE CREATION** - Create proper directory structure with correct naming

### Mandatory Sections (11)

1. **Overview** - Task title, scope, brief description
2. **Motivation** - Current problems and proposed benefits
3. **Technical Background** - Current and target architecture
4. **Scope** - What's in/out of scope
5. **Breaking Changes** - What changes, migration paths required
6. **Implementation Plan** - Multi-phase approach with detailed changes
7. **Files Summary** - Complete file listing organized by category
8. **Testing Strategy** - Unit, integration, performance testing approach
9. **Success Criteria** - Functional, Performance, Quality, Migration criteria
10. **Risk Assessment** - High/Medium/Low risk areas with mitigations
11. **Rollback Plan** - Immediate, partial, forward fix strategies with triggers

### File Naming Convention

**CRITICAL**: Follow exact naming pattern:

```
docs/development/tasks/task.[ID].[descriptive-name]/
├── task.[ID].[descriptive-name].md                    # Main task
├── task.[ID].qa.[number].[descriptive-name].md        # QA report (created by QA)
├── task.[ID].bug.[N].[bug-name].md                    # Bug reports (created during QA)
└── [No quality gate file - created separately at docs/qa/gates/tasks/]
```

**Naming Rules**:

- Use dots (`.`) for structural separators: `task.[ID].[name]`
- Use hyphens (`-`) within descriptive names: `cache-lib-simplification`
- Sequential ID numbering starting from 1
- Kebab-case for all descriptive sections

**Examples**:

- ✅ `task.1.cache-lib-simplification.md`
- ✅ `task.2.nestjs-dynamic-module-pattern.md`
- ❌ `task_1_cache_lib_simplification.md` (wrong separators)
- ❌ `task.1.cacheLibSimplification.md` (wrong case)

---

## Workflow Processing

### 1. Initial Information Gathering

Prompt user for:

- **Task Title**: [Clear, specific title]
- **Task Category**: refactoring | infrastructure | documentation | testing | other
- **Priority**: Critical | High | Medium | Low
- **Assignee**: [Developer or team name]
- **Estimated Effort**: [Hours or days estimate]

From this, auto-generate:

- **Task ID**: Scan existing `docs/development/tasks/` for highest task.[N], increment to task.[N+1]
- **Directory Path**: `docs/development/tasks/task.[ID].[kebab-case-name]/`
- **File Path**: `task.[ID].[kebab-case-name].md`

### 2. Process Each Section

For each of 11 mandatory sections:

**a. Gather Content**

- Present section prompt/guidance
- Ask clarifying questions if needed
- Request code examples where applicable

**b. Validate Content Quality**

- Ensure sufficient detail (min 2-3 sentences per subsection)
- Verify breaking changes have migration paths
- Confirm implementation plan has checkboxes

**c. Save Progressively**

- Build document incrementally
- Allow user to review/edit before moving to next section
- Provide option to skip forward to specific section

**d. Special Handling for Complex Sections**

**Breaking Changes Section**:

```
For each breaking change:
1. Change description
2. Before code example
3. After code example
4. Impact on consumers
5. Migration path required

Ask: "Are there any breaking changes?"
If yes: Prompt for EACH change individually
```

**Implementation Plan Section**:

```
For each phase:
1. Phase name
2. Risk level (Low/Medium/High)
3. File list
4. Changes (with [ ] checkboxes)
5. Dependencies on other phases

Ask: "How many implementation phases?"
Then iterate through each phase
```

**Success Criteria Section**:

```
Validate criteria in 4 categories:
1. Functional (tests passing, regressions, breaking changes)
2. Performance (benchmarks, baselines)
3. Code Quality (coverage, lint, compilation)
4. Migration (docs, consumer updates)

MUST have at least 2-3 criteria per category
```

**Risk Assessment Section**:

```
Categorize risks as:
- HIGH (blocking, breaking, performance)
- MEDIUM (workaround possible, testing)
- LOW (informational, documentation)

For each risk:
- Risk description
- Probability assessment
- Impact assessment
- Mitigation strategy
- Rollback plan if needed
```

### 3. Validation Before File Creation

**Checklist before generating document**:

- ✅ Task title provided and unique
- ✅ All 11 mandatory sections have content
- ✅ Implementation plan has at least 2-3 phases
- ✅ Success criteria specified for all 4 categories
- ✅ Breaking changes include migration paths
- ✅ Risk assessment covers High/Medium/Low
- ✅ Rollback plan includes triggers and steps
- ✅ All file paths use correct naming convention
- ✅ No duplicate task IDs
- ✅ Directory structure valid

**If validation fails**:

- Identify missing sections
- Prompt user to complete them
- Offer guided completion flow

### 4. Document Generation

Once validated:

1. **Create Directory**

   ```bash
   mkdir -p docs/development/tasks/task.[ID].[name]/
   ```

2. **Generate Markdown File**
   - Populate with all user-provided content
   - Format with proper markdown structure
   - Add status: `📋 Planned`
   - Set creation date to today
   - Initialize empty progress tracking checkboxes

3. **Create Placeholder Notes**
   - Document where QA report will be created
   - Document where bug reports will be created
   - Note quality gate will be in `docs/qa/gates/tasks/`
   - Provide next steps

4. **Display Success Message**
   - Show file path created
   - Show task ID assigned
   - Provide command to view file
   - Link to related QA skills

### 5. Post-Generation Steps

Inform user:

1. Task document created at `docs/development/tasks/task.[ID].[name]/task.[ID].[name].md`
2. Next steps: Implementation
3. When complete: Hand off to QA with `qa-review` skill
4. QA will create:
   - QA report at `task.[ID].qa.[number].[name].md`
   - Bug reports (if issues found) at `task.[ID].bug.[N].[name].md`
   - Quality gate at `docs/qa/gates/tasks/task.[ID].gate.[number].[name].yml`

---

## Section-by-Section Prompts

### Section 1: Overview

```
Provide:
1. One-sentence task description
2. Scope (what's included)
3. Key deliverables (2-3 items)
4. Expected outcome
```

### Section 2: Motivation

```
Current Problems (list 3-5):
- Problem 1: [specific issue]
- Problem 2: [specific issue]

Benefits of Solution (list 4-6 with metrics if possible):
- Benefit 1: [specific improvement] (20-30% faster)
- Benefit 2: [specific improvement]
```

### Section 3: Technical Background

```
Current Architecture:
- [Code block or description]
- Component 1
- Component 2

Target Architecture:
- [Code block or description]
- Component 1 (modified how?)
- Component 2 (modified how?)

Clarifications:
- [Any confusing technical points]
```

### Section 4: Scope

```
In Scope:
✅ [What's included]
✅ [Specific systems/files]

Out of Scope:
❌ [What's explicitly excluded]
❌ [Why not included]
```

### Section 5: Breaking Changes

```
For EACH breaking change:
1. Change Title
2. What changed (Before → After)
3. Code example before
4. Code example after
5. Who/what is affected
6. Migration path for consumers

If NO breaking changes: "None - API stable"
```

### Section 6: Implementation Plan

```
Number of phases: [N]

For EACH phase:
1. Phase Name: [Title]
2. Risk: [Low | Medium | High]
3. Files to modify:
   - file1.ts
   - file2.ts
4. Specific changes (use [ ] checkboxes):
   - [ ] Change 1
   - [ ] Change 2
5. Dependencies: [Other phases or pre-requisites]
```

### Section 7: Files Summary

```
Categorize all files:

Core Implementation:
1. ✅ path/to/file1.ts - [purpose]
2. ✅ path/to/file2.ts - [purpose]

Tests:
14. ✅ path/to/test1.spec.ts

Dependencies:
28. ✅ package.json

Documentation:
30. ✅ CHANGELOG.md

Deleted:
31. ❌ path/to/deprecated.ts
```

### Section 8: Testing Strategy

```
Unit Tests:
- Scope: [what's tested]
- Actions: [specific test tasks]
- Command: npx nx test [project]
- Target: [coverage %]

Integration Tests:
- Scope: [end-to-end flows]
- Actions: [specific flows to test]

Performance Tests:
- Metrics to measure: [list]
- Baseline needed: [yes/no]
- Benchmarks: [tools/approach]

Consumer Tests:
- Scope: [dependent code]
- Risk areas: [specific code]
```

### Section 9: Success Criteria

```
FUNCTIONAL (Example):
- [ ] All [project] tests pass
- [ ] No regressions detected
- [ ] All breaking changes documented
- [ ] Migration paths verified

PERFORMANCE (Example):
- [ ] [Metric] improved [X]%
- [ ] [Metric] maintained or improved
- [ ] No memory leaks

CODE QUALITY:
- [ ] Test coverage maintained 80%+
- [ ] All linting passes
- [ ] No TypeScript errors

MIGRATION:
- [ ] CHANGELOG.md updated
- [ ] Migration guide provided
- [ ] Consumer code tested
```

### Section 10: Risk Assessment

```
HIGH RISK (List risks blocking deployment):
1. Risk Title
   - Risk: [description]
   - Probability: High
   - Impact: Critical
   - Mitigation: [strategy]
   - Rollback: [plan]

MEDIUM RISK (List risks requiring monitoring):
[Same structure]

LOW RISK (List risks requiring awareness):
[Same structure]
```

### Section 11: Rollback Plan

```
IMMEDIATE ROLLBACK (< 1 hour):
- Triggers: [conditions requiring rollback]
- Steps: [numbered steps]
- Validation: [how to verify rollback successful]

PARTIAL ROLLBACK (1-2 hours):
- When to use: [specific scenarios]
- Steps: [which phases to revert]

FORWARD FIX:
- When to use: [non-critical issues]
- Approach: [fix forward vs revert]

ROLLBACK TRIGGERS:
- Critical: [blocking issues]
- Non-critical: [issues to fix forward]
```

---

## Integration with QA Workflow

### Developer Workflow

1. **Create** technical task document using this skill
2. **Implement** according to implementation plan
3. **Mark sections complete** as phases finish
4. **Hand off** to QA when implementation done

### QA Workflow (External to this Skill)

1. **Review** task document and implementation
2. **Create QA report** at `task.[ID].qa.[number].[name].md`
3. **Test** all success criteria
4. **Create bug reports** if issues found: `task.[ID].bug.[N].[name].md`
5. **Create quality gate** at `docs/qa/gates/tasks/task.[ID].gate.[number].[name].yml`
6. **Make gate decision**: PASS | CONCERNS | FAIL | WAIVED

### Bug Fix Cycle

If QA finds issues:

1. Developer fixes bugs, updates bug report status
2. QA retests and updates gate status
3. Iterate until PASS
4. Final QA report summarizes gate decision and deployment readiness

**Related QA Skills**:

- **qa-planning**: Risk assessment and test design (use during planning phase)
- **qa-review**: Comprehensive review for technical tasks (use when ready for QA)
- **qa-gate**: Create quality gate decision files (use after review)
- **create-bug-report**: Document issues found during QA
- **qa-fix**: Apply fixes for issues found

---

## Common Patterns & Examples

### Technical Debt Refactoring Task

```
Task Title: Cache-lib Architecture Simplification
Category: refactoring
Current: 3-tier cache (L1/L2/L3)
Target: 2-tier cache (L1/L2, remove redundant tier)
Primary Benefit: 20-30% faster write performance
Breaking Changes: CacheStats interface changed
Phases: 9 phases (types → core refactor → exports → tests → deps → consumer → docs → cleanup)
```

### Infrastructure Upgrade Task

```
Task Title: NestJS Dynamic Module Pattern Implementation
Category: infrastructure
Problem: ConfigService timing issues during bootstrap
Solution: Implement forRootAsync() pattern
Breaking Changes: Module initialization order changed
Primary Benefit: Guaranteed initialization ordering
Phases: 5 phases (configs → services → integration → testing)
```

---

## Key Principles

1. **User Collaboration is Mandatory** - Every section requires user input and validation
2. **Transparency in Structure** - Clear 11-section format ensures completeness
3. **Breaking Changes Emphasis** - Migration paths required, not optional
4. **Risk-Aware Documentation** - Risk assessment integrated, not afterthought
5. **QA Integration** - Document prepared for QA handoff workflow
6. **Naming Convention Compliance** - Follows established project patterns

---

## Resources

See `resources/` directory for:

- `sections-guide.md` - Detailed guidance for each section
- `task-template.md` - Empty template for quick reference

---

## Success Criteria for This Skill

A successful create-task execution produces:

1. ✅ **Complete Task Document** - All 11 sections populated
2. ✅ **User-Validated Content** - Every section reviewed with user
3. ✅ **Proper Naming** - Follows convention (dots/hyphens pattern)
4. ✅ **Correct Directory Structure** - `docs/development/tasks/task.[ID].[name]/`
5. ✅ **Markdown Formatting** - Proper headers, code blocks, lists
6. ✅ **Checklist Ready** - Progress tracking with [ ] boxes
7. ✅ **QA-Ready** - Notes where QA artifacts will be created
8. ✅ **File Created** - Actually written to filesystem
