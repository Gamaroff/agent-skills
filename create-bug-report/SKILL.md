---
name: create-bug-report
description: Create bug report files for issues found during QA testing. Use when QA identifies bugs during story testing. Implements sequential numbering, uses bug report template, and co-locates with story files.
---

# Create Bug Report

## When to Use This Skill

Use this skill when:

- QA testing identifies bugs during story implementation review
- Issues are found that require developer investigation and fixes
- Creating individual bug reports for HIGH or MEDIUM severity issues
- Need to track bug fix iterations separately from QA reports

**Do NOT use for**:

- LOW severity issues (document in QA report only)
- General recommendations or suggestions
- Issues that are immediately fixed during QA review

## Bug Report Type Decision

**CRITICAL**: Determine bug report type before proceeding

### Story Bug Reports

- **Pattern**: `bug.{epic}.{story}.{number}.{name}.md`
- **Location**: Co-located with story file in story directory
- **Used For**: Bugs found during user-facing feature testing
- **Example**: `bug.8.5.3.1.cache-cleanup-memory-leak.md`

### Technical Task Bug Reports

- **Pattern**: `task.{id}.bug.{number}.{name}.md`
- **Location**: Co-located in task subdirectory `docs/development/tasks/task.{id}.{name}/`
- **Used For**: Bugs found during technical task QA (refactoring, infrastructure, technical debt)
- **Example**: `docs/development/tasks/task.1.cache-lib-simplification/task.1.bug.1.memory-leak.md`

**Decision Rule**:

- If bug found during **story testing** → Use Story Bug Report workflow (Step 1-7 below)
- If bug found during **technical task QA** → Use Technical Task Bug Report workflow (see "Technical Task Bug Report Workflow" section)

---

## Purpose

Create structured, trackable bug reports that:

- Use standardized bug report template
- Follow sequential numbering within each story/task
- Co-locate with story/task files for easy access
- Track iterative fix cycles
- Link bidirectionally with story/task files
- Integrate with QA workflow (Happy Path vs Unhappy Path)

## Required Inputs

```yaml
required:
  - story_id: '{epic}.{story}' # e.g., "8.5.3"
  - bug_description: Brief description of the bug
  - severity: 'Blocker | Major | Minor | Trivial'
  - priority: 'Critical | High | Medium | Low'
  - expected_behavior: What should happen
  - actual_behavior: What actually happens
  - reproduction_steps: List of steps to reproduce

optional:
  - screenshots: Links or paths to screenshots
  - logs: Relevant log output
  - ac_violation: Which AC failed
  - environment: OS, browser, device details
```

## Bug Report Creation Workflow

### Step 1: Locate Story File

**Find Story File**:

- Pattern: `story.{epic}.{story}.*.md`
- Example: `story.8.5.3.cache-first-cleanup-testing.md`

**Extract Story Information**:

- Story title
- Epic reference
- Story location (directory path)

**HALT if story not found**: "Story {epic}.{story} not found. Please provide correct story ID."

---

### Step 2: Determine Next Bug Number

**Sequential Numbering Logic**:

1. Search for existing bug reports in story directory
   - Pattern: `bug.{epic}.{story}.*.md`
   - Example: `bug.8.5.3.1.*.md`, `bug.8.5.3.2.*.md`

2. Find highest bug number
   - If `bug.8.5.3.2.*.md` exists → next number is 3
   - If no bugs exist → next number is 1

3. Assign bug number to new report

**Numbering Rules**:

- Start at 1 for each story
- Increment sequentially (1, 2, 3, ...)
- Never reuse numbers even if bugs are closed
- Numbers are specific to the story

---

### Step 3: Generate Bug Report Filename

**Format**: `bug.{epic}.{story}.{bug-number}.{descriptive-name}.md`

**Descriptive Name**:

- Use 2-4 words from bug description
- Lowercase with hyphens
- No special characters

**Examples**:

- `bug.8.5.3.1.cache-cleanup-memory-leak.md`
- `bug.8.5.3.2.offline-mode-regression.md`
- `bug.2.1.1.validation-error-handling.md`

---

### Step 4: Create Bug Report File

**Template Location**: `docs/templates/bug-report-template.md`

**File Location**: Same directory as story file (co-location)

**Initial Bug Report Content**:

```markdown
**Bug ID**: bug.{epic}.{story}.{bug-number}.{description}
**Related Story**: [Story {Epic}-{N}: {Story Title}](./story.{epic}.{story}.{name}.md)
**Status**: 🆕 New
**Priority**: {Critical | High | Medium | Low}
**Severity**: {Blocker | Major | Minor | Trivial}
**Created**: {YYYY-MM-DD}
**Assigned To**: {Developer Name}
**QA Engineer**: {QA Engineer Name}

---

## Bug Description

**Summary**: {1-2 sentence description}

**Expected Behavior**: {What should happen}

**Actual Behavior**: {What actually happens}

**Impact**: {How this affects users/system/business}

---

## Reproduction Steps

**Environment**: {OS, browser, device, etc.}

**Steps to Reproduce**:

1. {Step 1}
2. {Step 2}
3. {Step 3}

**Frequency**: {Always | Sometimes | Rarely}
**Reproducible**: {Yes | No | Intermittent}

---

## Evidence

**Screenshots/Videos**: {Link or embed}

**Logs and Stack Traces**:
```

{Paste relevant logs}

```

**Related Files**: {List files involved}

---

## Acceptance Criteria Violation

**AC Reference**: AC{N} - {AC description}

**How AC Failed**: {Specific explanation}

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)
**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)
**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:
- [file1.ts]
- [file2.ts]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)
**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| {created_date} | New | {QA Name} | Bug created |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
```

---

### Step 5: Update Story File Bug Reports Section

**Locate Bug Reports Section**:

If `## Bug Reports` section doesn't exist in story file, add it after the "QA Report" section.

**Add Bug Link to Story**:

```markdown
## Bug Reports

### Open Bugs

- [Bug {epic}.{story}.{n}: {Description}](bug.{epic}.{story}.{n}.{name}.md) - 🆕 New - Priority: {Priority}

### In QA Verification

[No bugs in verification]

### Closed Bugs

[No closed bugs]
```

**Update Existing Section**:

If bugs already exist, add new bug to appropriate subsection based on status.

---

### Step 6: Link in QA Report (if applicable)

If QA report exists (`story.{epic}.{story}.qa.*.md`), reference the bug report:

```markdown
## Issues Found

### HIGH Severity Issues (1)

#### Issue 1: {Bug Description}

**Bug Report**: [Bug {epic}.{story}.{n}](bug.{epic}.{story}.{n}.{name}.md)

{Issue details from QA report}
```

---

### Step 7: Update Story Status (if first bug)

If this is the first bug for the story:

**Status Transition**: "Ready for QA" → "Reopened"

Update story metadata:

```markdown
**Status**: ⚠️ Reopened
**Last Updated**: {YYYY-MM-DD}
```

---

## Bug Severity Guidelines

Use these guidelines to classify severity:

**Blocker**:

- Prevents testing or deployment
- Complete feature failure
- System crashes
- Data loss or corruption
- Security vulnerability

**Major**:

- Core functionality broken
- Workaround exists but difficult
- Affects multiple users
- Performance degradation
- Integration failure

**Minor**:

- Cosmetic issues
- Low impact on users
- Easy workaround available
- Edge case failures
- Non-critical UI issues

**Trivial**:

- Typos
- Formatting issues
- Minor cosmetic problems
- Suggestions for improvement

---

## Bug Priority Guidelines

Use these guidelines to assign priority:

**Critical**:

- Must fix before deployment
- Blocker severity usually
- Affects production readiness
- Security issues

**High**:

- Fix in current sprint/cycle
- Major severity usually
- Important functionality affected
- User experience significantly impacted

**Medium**:

- Fix in next sprint
- Minor severity usually
- Moderate user impact
- Can be worked around

**Low**:

- Fix when time permits
- Trivial severity usually
- Minimal user impact
- Nice-to-have fixes

---

## Technical Task Bug Report Workflow

**Use this workflow when creating bug reports for technical tasks** (refactoring, infrastructure, technical debt).

### Step 1: Locate Task Document

**Find Task Document**:

- Pattern: `docs/development/tasks/task.{id}.{name}/task.{id}.{name}.md`
- Example: `docs/development/tasks/task.1.cache-lib-simplification/task.1.cache-lib-simplification.md`

**Extract Task Information**:

- Task ID
- Task title
- Task subdirectory path

**HALT if task not found**: "Task {id} not found. Please provide correct task ID."

---

### Step 2: Determine Next Bug Number

**Sequential Numbering Logic**:

1. Search for existing bug reports in task subdirectory
   - Pattern: `task.{id}.bug.*.md`
   - Location: `docs/development/tasks/task.{id}.{name}/`
   - Example: `task.1.bug.1.*.md`, `task.1.bug.2.*.md`

2. Find highest bug number
   - If `task.1.bug.2.*.md` exists → next number is 3
   - If no bugs exist → next number is 1

3. Assign bug number to new report

**Numbering Rules**:

- Start at 1 for each task
- Increment sequentially (1, 2, 3, ...)
- Never reuse numbers even if bugs are closed
- Numbers are specific to the task

---

### Step 3: Generate Bug Report Filename

**Format**: `task.{id}.bug.{number}.{descriptive-name}.md`

**Descriptive Name**:

- Use 2-4 words from bug description
- Lowercase with hyphens
- No special characters

**Examples**:

- `task.1.bug.1.test-expects-l3-tier.md`
- `task.1.bug.2.lint-ts-ignore-violations.md`
- `task.2.bug.1.performance-regression.md`

---

### Step 4: Create Bug Report File

**Template Location**: Use same bug report template as story bugs

**File Location**: Task subdirectory (co-located with task document)

- Full path: `docs/development/tasks/task.{id}.{name}/task.{id}.bug.{number}.{name}.md`

**Initial Bug Report Content**:

```markdown
**Bug ID**: task.{id}.bug.{number}.{description}
**Related Task**: [Technical Task {ID}: {Task Title}](./task.{id}.{name}.md)
**Status**: 🆕 New
**Priority**: {Critical | High | Medium | Low}
**Severity**: {Blocker | Major | Minor | Trivial}
**Created**: {YYYY-MM-DD}
**Assigned To**: {Developer Name}
**QA Engineer**: {QA Engineer Name}

---

## Bug Description

**Summary**: {1-2 sentence description}

**Expected Behavior**: {What should happen based on success criteria}

**Actual Behavior**: {What actually happens}

**Impact**: {How this affects deployment/system/quality}

---

## Reproduction Steps

**Environment**: {Node version, dependencies, test environment, etc.}

**Steps to Reproduce**:

1. {Step 1}
2. {Step 2}
3. {Step 3}

**Frequency**: {Always | Sometimes | Rarely}
**Reproducible**: {Yes | No | Intermittent}

---

## Evidence

**Test Output**: {Command output showing failure}

**Logs and Stack Traces**:
```

{Paste relevant logs}

```

**Related Files**: {List files involved}

---

## Success Criteria Violation

**Success Criterion**: {Which criterion from task document failed}

**How Criterion Failed**: {Specific explanation}

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)
**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)
**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:
- [file1.ts]
- [file2.ts]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)
**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| {created_date} | New | {QA Name} | Bug created |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
```

---

### Step 5: Update Task File Bug Reports Section

**Locate Bug Reports Section**:

If `## Bug Reports` section doesn't exist in task file, add it in the QA & Quality Assurance section.

**Add Bug Link to Task**:

```markdown
### Bug Reports

[Bug reports will be added here if issues found]

- [task.{id}.bug.{n}.{description}.md](./task.{id}.bug.{n}.{description}.md) - 🆕 New - Priority: {Priority} - {Date}
```

**Update Existing Section**:

If bugs already exist, add new bug to the list.

---

### Step 6: Link in QA Report

If QA report exists (`task.{id}.qa.{name}.md`), reference the bug report in the "Issues Found" section:

```markdown
## Issues Found

### HIGH Severity Issues (1)

**Issue 1: {Bug Description}**

- **Severity**: HIGH
- **Category**: {Functional/Performance/Security/Quality}
- **Bug Report**: [task.{id}.bug.{n}.{description}.md](./task.{id}.bug.{n}.{description}.md)
- **Observation**: {What was observed}
- **Impact**: {Impact on system/deployment}
- **Recommendation**: {How to fix}
- **Priority**: P0/P1
```

---

### Step 7: Update Task Status (if blocking bug)

If bug is Critical/High severity and blocks deployment:

**Status Transition**: Track in task document's status field

**Note**: Technical tasks don't use "Reopened" status like stories. Blocking bugs should be noted in the task's progress tracking or success criteria sections.

---

## Integration with QA Workflow

### QA Testing Outcome Paths

**Happy Path (No Bugs)**:

1. QA tests story
2. All ACs pass
3. No bug reports created
4. Story moves to "Done"

**Unhappy Path (Bugs Found)**:

1. QA tests story and finds issues
2. **Use this skill** to create bug reports for HIGH/MEDIUM severity
3. Document LOW severity in QA report only
4. QA creates QA report linking to bug reports
5. Story status changes to "Reopened"
6. Iterative fix cycle begins

### Developer Fix Cycle

After bug reports are created:

1. **Developer Investigation** (New → In Progress)
   - Developer reads bug report
   - Investigates root cause
   - Documents findings in bug report

2. **Developer Fix** (In Progress → Ready for QA)
   - Implements fix
   - Updates bug report with fix details
   - Changes bug status to "Ready for QA"

3. **QA Verification** (Ready for QA → Closed/Reopened)
   - QA retests the bug
   - If fixed → Closes bug
   - If still failing → Reopens bug, starts new iteration

4. **Iteration** (if Reopened)
   - Add new "Iteration 2" section
   - Repeat cycle until closed

5. **Story Re-test**
   - Once all bugs closed
   - QA performs full story re-test
   - If pass → Story to "Done"

---

## Bug Report Best Practices

**Clear Descriptions**:

- Be specific about what's broken
- Use concrete examples
- Avoid vague language
- Include exact error messages

**Complete Reproduction Steps**:

- Numbered, sequential steps
- Include all preconditions
- Specify exact data/inputs used
- Note environment details

**Evidence Quality**:

- Annotated screenshots (highlight issues)
- Relevant log excerpts only
- Stack traces with context
- Video for complex workflows

**AC Violation Clarity**:

- Quote the specific AC
- Explain exactly how it failed
- Reference test case if applicable
- Note expected vs actual outcome

---

## Completion Checklist

Before finalizing bug report creation:

- ✅ Bug number is sequentially assigned
- ✅ Filename follows naming convention
- ✅ Bug report file created with all required sections
- ✅ Initial status set to "New"
- ✅ All required fields populated
- ✅ Reproduction steps are complete and clear
- ✅ Evidence attached (screenshots, logs)
- ✅ AC violation documented
- ✅ Story file Bug Reports section updated
- ✅ Bug linked in story file
- ✅ Story status updated to "Reopened" (if first bug)
- ✅ QA report references bug (if QA report exists)

---

## Example: Creating Bug Report

**Scenario**: QA finds cache cleanup memory leak in Story 8.5.3

**Input**:

```yaml
story_id: '8.5.3'
bug_description: 'Cache cleanup causes memory leak'
severity: 'Major'
priority: 'High'
expected_behavior: 'Cache cleanup should free all memory references'
actual_behavior: 'Memory usage grows after each cleanup cycle'
reproduction_steps:
  - 'Run cache cleanup 100 times'
  - 'Monitor memory usage'
  - 'Observe memory growth over iterations'
```

**Workflow**:

1. **Locate Story**: `story.8.5.3.cache-first-cleanup-testing.md`
2. **Determine Bug Number**: No existing bugs → assign number 1
3. **Generate Filename**: `bug.8.5.3.1.cache-cleanup-memory-leak.md`
4. **Create Bug Report**: Use template, populate all fields
5. **Update Story**: Add to Bug Reports section:

   ```markdown
   ### Open Bugs

   - [Bug 8.5.3.1: Cache cleanup memory leak](bug.8.5.3.1.cache-cleanup-memory-leak.md) - 🆕 New - Priority: High
   ```

6. **Update Story Status**: "Ready for QA" → "Reopened"

**Result**:

- Bug report file created and populated
- Story file updated with bug link
- Story status changed to Reopened
- QA workflow continues with iterative fix cycle

---

## Related Skills

- **qa-review**: Comprehensive story review that creates bug reports
- **fix-qa**: Developer workflow for fixing bugs
- **develop**: Main development workflow

---

## Key Principles

1. **Type Decision**: Determine if bug is for story or technical task first
2. **Sequential Numbering**: Always increment from highest existing number (per story/task)
3. **Co-location**:
   - Story bugs → Same directory as story file
   - Task bugs → Task subdirectory (`docs/development/tasks/task.{id}.{name}/`)
4. **Template-Based**: Use bug report template for consistency (same template for both types)
5. **Bidirectional Links**: Link bug in story/task, link story/task in bug
6. **Initial Status**: Always start with "New" status
7. **Severity-Driven**: HIGH/MEDIUM → Create bug report, LOW → QA report only
8. **Naming Convention**:
   - Story bugs: `bug.{epic}.{story}.{n}.{name}.md`
   - Task bugs: `task.{id}.bug.{n}.{name}.md`

---

## Notes

**General**:

- Bug reports are only created for HIGH and MEDIUM severity issues
- LOW severity issues are documented in QA report only, not separate bug files
- Bug numbering is per-story or per-task, not global
- Once a bug number is assigned, it's never reused
- Bug reports track iterative fix cycles in the same file
- Bug status flow: New → In Progress → Ready for QA → Closed (or Reopened)

**Story Bugs**:

- Pattern: `bug.{epic}.{story}.{number}.{name}.md`
- Location: Co-located with story file in story directory
- Numbering resets for each story (story 8.5.3 has bug.8.5.3.1, bug.8.5.3.2, etc.)

**Technical Task Bugs**:

- Pattern: `task.{id}.bug.{number}.{name}.md`
- Location: Co-located in task subdirectory (`docs/development/tasks/task.{id}.{name}/`)
- Numbering resets for each task (task 1 has task.1.bug.1, task.1.bug.2, etc.)
- Quality gates stored separately in `docs/qa/gates/tasks/` directory
