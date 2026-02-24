---
name: qa-fix
description: Implement fixes based on QA feedback. Use when QA has provided a gate file or assessments and you need to systematically address issues, close coverage gaps, and update the story file. Follows deterministic prioritization for risk-first fix implementation.
---

# QA Fix

## When to Use This Skill

Use this skill when:

- QA has created a gate file (PASS/CONCERNS/FAIL/WAIVED)
- QA assessments are available (test design, traceability, risk profile, NFR)
- Need to systematically implement fixes based on QA feedback
- Closing coverage gaps and addressing high-severity issues
- Preparing story for re-review after fixes

**Prerequisites**: Active PR exists for current branch. Workflow will halt if no PR found.

## Purpose

Systematically consume QA outputs and apply code/test changes:

- Read QA gate YAML and assessment markdowns
- Create deterministic, prioritized fix plan
- Apply code and test changes
- Update only authorized story file sections
- Signal readiness for QA re-review

## Required Inputs

```yaml
required:
  - story_id: '{epic}.{story}' # e.g., "2.2"
  - qa_root: from skills-config.yaml key qa.qaLocation (default: docs/qa)
  - story_location: nested (stories stored within epic directories)

optional:
  - story_title: derived from story H1 if missing
  - story_slug: derived from title if missing
```

## Input Handling

**Flexible Invocation:**

You can invoke this skill with either:

- **A specific file**: `story.178.8.swipe-actions-friend-requests.md`, `story.178.8.qa.1.initial-review.md`, or `story.178.8.gate.1.initial-review.yml`
- **A story directory**: `stories/story.178.8.swipe-actions-friend-requests/`

**File Discovery Logic:**

When given a directory path, discover all relevant QA artifacts:

1. **Story File**:
   - Pattern: `story.{epic}.{story}.{name}.md`
   - Exclude files containing: `.qa.`, `.gate.`, or `.bug.`
   - Use the one matching the directory name if multiple found

2. **QA Report** (most recent if multiple):
   - Pattern: `story.{epic}.{story}.qa.{number}.*.md`
   - Logic: Identify files with numeric version.
   - Sort: Use highest number (latest). If unnumbered, use modification time.

3. **Gate File** (most recent if multiple):
   - Pattern: `story.{epic}.{story}.gate.{number}.*.yml`
   - Logic: Identify files with numeric version.
   - Sort: Use highest number (latest). If unnumbered, use modification time.

4. **Bug Reports** (all matching):
   - Pattern: `story.{epic}.{story}.bug.*.md`
   - Load all bug reports found
   - Filter by status: only process "New" or "Reopened"

**Example:**

```
Input: stories/story.178.8.swipe-actions-friend-requests/
Discovers:
  - Story: story.178.8.swipe-actions-friend-requests.md
  - QA Report: story.178.8.qa.1.initial-review.md
  - Gate: story.178.8.gate.1.initial-review.yml
  - Bugs: story.178.8.bug.1.android-jank.md, story.178.8.bug.2.ios-haptics.md
```

## QA Artifact Locations

### For Stories (User-Facing Features)

**Story Directory Structure:**

Each story has its own subdirectory containing all related files:

```
stories/
└── story.{epic}.{story}.{story-name}/
    ├── story.{epic}.{story}.{story-name}.md           # Story file
    ├── story.{epic}.{story}.qa.{number}.{descriptive-name}.md  # QA report
    ├── story.{epic}.{story}.gate.{number}.{descriptive-name}.yml # Gate file
    ├── story.{epic}.{story}.bug.1.{description}.md    # Bug report 1
    ├── story.{epic}.{story}.bug.2.{description}.md    # Bug report 2
    └── ...
```

**File Naming Convention:**

- All files share the same base: `story.{epic}.{story}`
- File type indicated by segment after story ID: `.qa.{number}.`, `.gate.{number}.`, `.bug.{number}.`
- Bug reports include sequential number: `.bug.1.`, `.bug.2.`, etc.
- Descriptive name comes last before file extension

**Gate File** (most recent by modified time):

- `{qa_root}/gates/{epic}.{story}-*.yml`

**Assessment Files**:

- Test Design: `{qa_root}/assessments/{epic}.{story}-test-design-*.md`
- Traceability: `{qa_root}/assessments/{epic}.{story}-trace-*.md`
- Risk Profile: `{qa_root}/assessments/{epic}.{story}-risk-*.md`
- NFR Assessment: `{qa_root}/assessments/{epic}.{story}-nfr-*.md`

**Bug Report Files** (co-located in story subdirectory):

- Pattern: `story.{epic}.{story}.bug.*.md` in story's own subdirectory
- Sequential numbering: `story.{epic}.{story}.bug.1.*.md`, `story.{epic}.{story}.bug.2.*.md`, etc.
- Status tracking: New | In Progress | Ready for QA | Reopened | Closed
- Example: `stories/story.178.8.swipe-actions/story.178.8.bug.1.android-jank.md`

### For Technical Tasks (Non-User-Facing Work)

**Task Document** (in task subdirectory):

- Pattern: `docs/development/tasks/task.{id}.{name}/task.{id}.{name}.md`

**QA Report** (co-located in task subdirectory):

- Pattern: `docs/development/tasks/task.{id}.{name}/task.{id}.qa.{number}.{name}.md`

**Quality Gate** (separate gates directory):

- Pattern: `docs/qa/gates/tasks/task.{id}.{name}.gate.{number}.yml`

**Bug Report Files** (co-located in task subdirectory):

- Pattern: `task.{id}.bug.{number}.{name}.md` in task subdirectory
- Location: `docs/development/tasks/task.{id}.{name}/task.{id}.bug.{number}.{name}.md`
- Sequential numbering: `task.{id}.bug.1.*.md`, `task.{id}.bug.2.*.md`, etc.
- Status tracking: New | In Progress | Ready for QA | Reopened | Closed

## Prerequisites

### PR Existence Check

**CRITICAL**: The qa-fix skill requires an active pull request for the current branch.

**How PR Selection Works:**

- The skill uses `gh pr view` to find the PR associated with your **current Git branch**
- GitHub CLI matches the PR where `headRefName` equals your current branch name
- If multiple PRs exist from the same branch, the most recent one is selected
- This ensures you're applying fixes to the PR for the branch you're currently working on

Before starting fixes:

1. **Check for PR existence:**

   ```bash
   # Get current branch
   CURRENT_BRANCH=$(git branch --show-current)

   # Find PR for current branch
   PR_JSON=$(gh pr view --json url,state,title,number 2>&1)
   EXIT_CODE=$?

   if [ $EXIT_CODE -ne 0 ]; then
     echo "⚠️ No pull request found for branch: $CURRENT_BRANCH"
     echo ""
     echo "Fix QA requires a pull request to post results."
     echo ""
     echo "Options:"
     echo "1. Create a PR: gh pr create"
     echo "2. Use /create-pr skill"
     echo "3. Push changes: git push -u origin $CURRENT_BRANCH"
     echo ""
     echo "Once PR is created, re-run /qa-fix"
     exit 1
   fi
   ```

2. **Parse and validate PR information:**

   ```bash
   PR_URL=$(echo "$PR_JSON" | jq -r '.url')
   PR_STATE=$(echo "$PR_JSON" | jq -r '.state')
   PR_NUMBER=$(echo "$PR_JSON" | jq -r '.number')
   PR_TITLE=$(echo "$PR_JSON" | jq -r '.title')
   ```

3. **Handle PR state:**
   - **OPEN**: ✅ Proceed with fixes
   - **MERGED**: ⚠️ Warn user but continue (comment will be posted to merged PR)
   - **CLOSED**: ⚠️ Warn user but continue (comment will be posted to closed PR)
   - **No PR**: ❌ Halt and provide guidance

4. **Display PR status:**

   ```bash
   if [ "$PR_STATE" = "MERGED" ]; then
     echo "⚠️ Warning: PR #$PR_NUMBER is already MERGED"
     echo "   Title: $PR_TITLE"
     echo "   Comment will still be posted, but PR is merged."
     echo ""
   elif [ "$PR_STATE" = "CLOSED" ]; then
     echo "⚠️ Warning: PR #$PR_NUMBER is CLOSED"
     echo "   Title: $PR_TITLE"
     echo "   Comment will still be posted, but PR is closed."
     echo ""
   elif [ "$PR_STATE" = "OPEN" ]; then
     echo "✅ Found PR #$PR_NUMBER: $PR_TITLE"
     echo "   State: $PR_STATE"
     echo "   URL: $PR_URL"
   fi
   ```

5. **Store PR metadata:**
   Store PR_URL, PR_STATE, PR_NUMBER, PR_TITLE for use in completion checklist

---

## Workflow (6 Steps)

### Step 0: Load Config & Locate Story

**Configuration File**: `skills-config.yaml` (in project root)

1. Attempt to load `skills-config.yaml` from project root
2. If file does not exist, **notify user**:

   > "`skills-config.yaml` not found. Create this file to customize paths, or continue with default settings."

3. Resolve paths (with defaults if file missing):
   - `qa_root`: `qa.qaLocation` (default: `docs/qa`)
   - Story location: `nested` means stories are stored within epic directories at `{epicPath}/stories/`
4. Locate story file: `{epicPath}/stories/{epic}.{story}.*.md`
5. HALT if story not found → ask for correct story id/path

**Default Configuration Values** (used if `skills-config.yaml` not found):

```yaml
qa:
  qaLocation: docs/qa

# Stories stored within epic directories
devStoryLocation: nested
```

### Step 1: Collect QA Findings

**Note**: PR metadata (PR_URL, PR_NUMBER, PR_STATE, PR_TITLE) is already validated and available from Prerequisites section.

Parse latest gate YAML for:

- Gate status (PASS|CONCERNS|FAIL|WAIVED)
- `top_issues[]` with id, severity, finding, suggested_action
- `nfr_validation.*.status` and notes
- Trace coverage summary and gaps
- `test_design.coverage_gaps[]`
- `risk_summary.recommendations.must_fix[]`

Read assessment markdowns and extract:

- Explicit gaps and recommendations
- Uncovered requirements
- Missing test scenarios

**Parse Bug Reports** (if any exist):

Locate all bug report files: `story.{epic}.{story}.bug.*.md` in story directory

For each bug report, extract:

- Bug ID and descriptive name
- Current status (New, In Progress, Ready for QA, Reopened, Closed)
- Priority and Severity
- Bug description and expected vs actual behavior
- Acceptance criteria violation
- Existing fix iterations (if any)
- Reproduction steps

**Bug Status Filtering**:

- Only process bugs with status: **New** or **Reopened**
- Skip bugs with status: Closed, Ready for QA (QA is testing)
- Bug fixes take precedence in fix plan based on severity

### Step 2: Build Deterministic Fix Plan

**Priority Order** (highest first):

1. **Blocker/Critical severity bug reports** → Fix immediately, blocks deployment
2. **High severity** bug reports → Fix in current cycle
3. **High severity** items in `top_issues` (security/performance/reliability/maintainability)
4. **NFR FAIL statuses** → must fix all FAIL items
5. **Medium severity** bug reports → Address after critical items
6. **NFR CONCERNS** → minimize or document
7. **Test Design coverage_gaps** → prioritize P0 scenarios
8. **Trace uncovered requirements** → AC-level gaps
9. **Risk must_fix recommendations**
10. **Low severity** bug reports and issues → Fix when time permits

**Step 2a: Identify Ambiguities and Multiple Options**

**CRITICAL**: Before proceeding with implementation, analyze QA findings for ambiguity or multiple options:

**Ambiguity Indicators**:

- QA provides multiple suggested actions without clear priority
- Conflicting recommendations from different QA sections (e.g., test design vs NFR assessment)
- Vague or open-ended "suggested_action" fields
- Multiple valid implementation approaches mentioned
- Unclear scope of fixes (e.g., "improve error handling" without specifics)
- Optional vs mandatory fixes not clearly distinguished

**Examples of Ambiguous QA Findings**:

```yaml
# Example 1: Multiple options without priority
top_issues:
  - id: perf-1
    suggested_action: "Consider implementing caching OR optimizing database queries OR using CDN"

# Example 2: Vague recommendation
top_issues:
  - id: sec-1
    suggested_action: "Improve input validation"

# Example 3: Multiple conflicting recommendations
nfr_validation:
  performance:
    notes: "Response times acceptable but could be faster with Redis caching"
  maintainability:
    notes: "Adding Redis introduces complexity; consider simpler solution first"
```

**When Ambiguity Is Detected**:

1. **Pause implementation** - Do not proceed with changes
2. **Use AskUserQuestion** to clarify:
   - Which option to pursue
   - Priority of competing recommendations
   - Scope and acceptance criteria for vague recommendations
   - Which fixes are mandatory vs optional
   - Which approach to take when multiple valid options exist

**Question Examples**:

```markdown
**Ambiguity Found**: QA suggests three options for performance improvement (caching, query optimization, CDN). Which approach should I prioritize?

Options:

- Option A: Implement Redis caching (faster, adds dependency)
- Option B: Optimize database queries (minimal changes, moderate improvement)
- Option C: Use CDN for static assets (infrastructure change required)

**Ambiguity Found**: QA states "improve input validation" without specifics. What level of validation is required?

Options:

- Option A: Add basic type checking and required field validation
- Option B: Implement comprehensive schema validation with custom rules
- Option C: Add validation + sanitization + rate limiting

**Ambiguity Found**: Test design recommends P0 coverage gaps, but NFR assessment suggests maintainability concerns with test complexity. How should I balance coverage vs maintainability?

Options:

- Option A: Add comprehensive test coverage as recommended (increases test complexity)
- Option B: Add targeted tests for critical paths only (maintains simplicity)
- Option C: Add coverage with test helpers/fixtures to manage complexity
```

**Only Proceed After Clarity**:

- Wait for user responses to clarifying questions
- Update fix plan based on user decisions
- Document chosen approach in story Change Log

**Guidance**:

- Add tests closing coverage gaps before or with code changes
- Keep changes minimal and targeted
- Follow project architecture and coding standards
- When in doubt about scope or approach, ask rather than assume

### Step 3: Apply Changes

- Implement code fixes per plan
- Add missing tests (unit first; integration where required by AC)
- Follow project patterns:
  - Goji: Keep imports centralized (platform separation, NX monorepo)
  - Follow DI boundaries and existing patterns
- Maintain test co-location (.spec.ts files next to source)

### Step 4: Validate

```bash
# For Goji system:
npx nx lint <project>
npx nx test <project> --coverage

# For Deno projects:
deno lint
deno test -A
```

Iterate until:

- Zero lint errors
- All tests pass
- Coverage targets met

### Step 5: Update Story File and Bug Reports (Authorized Sections ONLY)

**CRITICAL - Story File Authorization**: Dev agent may ONLY update these sections:

- ✅ Tasks / Subtasks Checkboxes (mark fix tasks as done)
- ✅ Dev Agent Record:
  - Agent Model Used (if changed)
  - Debug Log References (commands/results like lint/test output)
  - Completion Notes List (what changed, why, how)
  - File List (all added/modified/deleted files)
- ✅ Change Log (new dated entry describing applied fixes)
- ✅ Status (see Status Rule below)
- ✅ Bug Reports section (update bug statuses when fixes applied)

**CRITICAL - Bug Report File Authorization**: Dev agent may update these sections in bug reports:

- ✅ Bug Status (New → In Progress → Ready for QA)
- ✅ Developer Fix Cycle section:
  - Investigation subsection (root cause analysis)
  - Fix Implementation subsection (fix description, files modified, testing)
  - Add new iterations if bug was Reopened
- ✅ Status History table (add new status transitions)

**Bug Report Update Workflow**:

1. **Starting Investigation** (New/Reopened → In Progress):
   - Change bug status to "In Progress"
   - Add investigation notes to Developer Fix Cycle section
   - Document root cause analysis
   - Add status history entry

2. **Implementing Fix** (In Progress → Ready for QA):
   - Document fix description
   - List all files modified
   - Describe testing performed
   - Change bug status to "Ready for QA"
   - Add status history entry

3. **Iteration Handling** (if bug was Reopened):
   - Add new "Iteration N" section in Developer Fix Cycle
   - Document what was re-investigated
   - Describe revised fix approach
   - Change status to "Ready for QA" when complete

**Story Status Rule**:

- Gate was PASS + all gaps closed + all bugs closed → `Status: Ready for Done`
- Bug fixes applied + ready for QA verification → `Status: Ready for Review`
- Otherwise → `Status: Ready for Review` (notify QA to re-run review)

### Step 6: Do NOT Edit Gate Files

- Dev does not modify gate YAML files
- If fixes address issues, request QA to re-run `review-story` to update the gate
- Gate ownership remains with QA

## Blocking Conditions

**HALT and ask user if**:

- Missing story file for provided `story_id`
- No QA artifacts found (neither gate nor assessments)
  - Request QA to generate at least a gate file OR
  - Proceed only with clear developer-provided fix list
- **QA findings contain ambiguities or multiple options** (Step 2a)
  - Use AskUserQuestion to clarify approach before implementing
  - Do not proceed with fixes until user provides clear direction
  - Document chosen approach in Change Log

## Completion Checklist

Before marking complete:

- ✅ **Ambiguities resolved**: All unclear or multi-option QA findings clarified with user
- ✅ **User decisions documented**: Chosen approaches recorded in Change Log
- ✅ Lint: 0 problems
- ✅ Tests: all pass
- ✅ All blocker/critical bug reports addressed
- ✅ All high severity bug reports addressed
- ✅ All high severity `top_issues` addressed
- ✅ NFR FAIL → resolved
- ✅ NFR CONCERNS → minimized or documented with rationale
- ✅ Coverage gaps → closed or documented with rationale
- ✅ Bug reports updated with Developer Fix Cycle details
- ✅ Bug statuses changed to "Ready for QA"
- ✅ Story file updated (authorized sections only)
- ✅ Story Bug Reports section updated with current statuses
- ✅ File List complete and accurate
- ✅ Change Log entry added
- ✅ Status set correctly per Status Rule
- ✅ **Post Fix Summary to PR**:
  - Use the PR URL from Prerequisites check (already validated)
  - Post fix summary with before/after comparison

    ```bash
    # PR metadata already validated in Prerequisites section
    # Use stored PR_URL, PR_NUMBER, PR_STATE, PR_TITLE variables

    gh pr comment "$PR_URL" --body "## 🛠️ QA Fixes Applied

    **Status**: ✅ Fixes Complete - Ready for Re-Review 🔄
    **Date**: [date]
    **PR**: #$PR_NUMBER - $PR_TITLE
    **PR State**: $PR_STATE

    ---

    ### 🐛 Issues Addressed

    **Critical/High Severity**:
    - [Issue 1]: [Brief description] - Status: ✅ Fixed
    - [Issue 2]: [Brief description] - Status: ✅ Fixed

    **Medium Severity**:
    - [Issue 3]: [Brief description] - Status: ✅ Fixed

    **Coverage Gaps Closed**:
    - [Gap 1]: Added test coverage for [scenario]
    - [Gap 2]: Added test coverage for [scenario]

    ### 📁 Files Modified

    **Implementation**:
    - [file1.ts] - [Brief description of change]
    - [file2.service.ts] - [Brief description of change]

    **Tests**:
    - [file1.spec.ts] - Added tests for [scenario]
    - [file2.spec.ts] - Enhanced coverage for [scenario]

    ### ✅ Verification

    **Test Results**:
    ```

    [Test output showing all tests passing]

    ```

    **Coverage**: [X%] (target: [Y%])

    ### 🎯 Bug Report Updates

    - [Bug 1]: Status changed to \"Ready for QA\"
    - [Bug 2]: Status changed to \"Ready for QA\"

    ### 📝 Next Steps

    1. QA to verify all fixes
    2. QA to update gate file with verification results
    3. Close bugs if fixes verified

    ---

    **Artifacts Updated**:
    - Story File: [path/to/story.md]
    - Bug Reports: [path/to/bugs/]
    - QA Gate: [path/to/gate.yml] (QA to update)

    ### 🚀 Action Required

    - [ ] Ready for QA Verification

    ---

    🤖 Generated by QA Fix Skill"
    ```

---

## Bug Report Workflow Support

### Locating Bug Reports

**Pattern**: `story.{epic}.{story}.bug.*.md` in the same directory as the story file

**Glob Pattern**: `story.{epic}.{story}.bug.*.md`

**Examples**:

- `story.8.5.3.bug.1.cache-cleanup-memory-leak.md`
- `story.8.5.3.bug.2.offline-mode-regression.md`

### Reading Bug Reports

For each bug report file, extract:

1. **Bug Metadata** (header section):
   - Bug ID
   - Related Story link
   - Current Status (New, In Progress, Ready for QA, Reopened, Closed)
   - Priority (Critical, High, Medium, Low)
   - Severity (Blocker, Major, Minor, Trivial)
   - Assigned developer
   - QA engineer

2. **Bug Description**:
   - Summary
   - Expected vs Actual behavior
   - Impact on users/system

3. **Reproduction Steps**:
   - Environment details
   - Step-by-step reproduction
   - Frequency and reproducibility

4. **Evidence**:
   - Screenshots/videos
   - Logs and stack traces
   - Related files

5. **Acceptance Criteria Violation**:
   - Which AC failed
   - How it failed

6. **Developer Fix Cycle** (existing iterations):
   - Previous investigation notes
   - Previous fixes attempted
   - QA verification results

### Bug Status Lifecycle

**Status Flow**:

```
New → In Progress → Ready for QA → Closed
                                 ↓
                             Reopened → In Progress → Ready for QA → Closed
```

**Status Definitions**:

- **New**: Bug just created by QA, not yet investigated
- **In Progress**: Developer investigating or implementing fix
- **Ready for QA**: Fix complete, awaiting QA verification
- **Reopened**: QA verified fix still failing, needs re-investigation
- **Closed**: QA verified fix working, bug resolved

### Updating Bug Reports

#### Starting Investigation (New/Reopened → In Progress)

**Update Bug Header**:

```markdown
**Status**: 🔄 In Progress
```

**Add to Developer Fix Cycle** (create new iteration if Reopened):

```markdown
### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2025-01-30
**Developer**: [Your Name]

**Investigation Notes**:

- Reviewed reproduction steps
- Identified root cause in [file.ts:line]
- Cause: [Explanation of what's wrong]

**Root Cause Analysis**:
[Detailed explanation of why the bug occurs]

**Proposed Fix**:
[Brief description of planned fix]
```

**Update Status History**:

```markdown
| Date       | Status      | Changed By | Notes                 |
| ---------- | ----------- | ---------- | --------------------- |
| 2025-01-30 | In Progress | [Dev Name] | Investigation started |
```

#### Implementing Fix (In Progress → Ready for QA)

**Update Bug Header**:

```markdown
**Status**: ✅ Ready for QA
```

**Complete Fix Implementation Section**:

```markdown
#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2025-01-30

**Root Cause**: [Summary from investigation]

**Fix Description**:

- Modified [component/service] to [what was changed]
- Added validation for [edge case]
- Updated error handling to [improvement]

**Files Modified**:

- `libs/cache-lib/src/services/cleanup.service.ts` - Fixed memory leak
- `libs/cache-lib/src/services/cleanup.service.spec.ts` - Added test coverage

**Testing**:

- Added unit test: `should properly clean up cache references`
- Verified no memory growth over 1000 iterations
- Tested edge cases: empty cache, concurrent cleanup

**Verification Steps for QA**:

1. [Step 1 to verify fix]
2. [Step 2 to verify fix]
```

**Update Status History**:

```markdown
| 2025-01-30 | Ready for QA | [Dev Name] | Fix implemented |
```

#### Handling Reopened Bugs

If QA reopens a bug, add a new iteration:

```markdown
### Iteration 2

#### Re-Investigation (Reopened → In Progress)

**Date**: 2025-02-01
**Developer**: [Your Name]

**QA Reopening Reason** (from previous QA Verification):
[Copy QA's notes on why fix failed]

**Re-Investigation Notes**:

- Reviewed QA's findings
- Identified additional edge case: [case]
- Previous fix didn't handle [scenario]

**Revised Approach**:
[How the new fix differs from previous attempt]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2025-02-01

[Same structure as first iteration]
```

### Updating Story Bug Reports Section

After fixing bugs, update the story file's Bug Reports section:

```markdown
## Bug Reports

### In QA Verification

- [Bug 8.5.3.1: Cache cleanup memory leak](story.8.5.3.bug.1.cache-cleanup-memory-leak.md) - ✅ Ready for QA - Priority: High (Fixed 2025-01-30)
- [Bug 8.5.3.2: Offline mode regression](story.8.5.3.bug.2.offline-mode-regression.md) - ✅ Ready for QA - Priority: Medium (Fixed 2025-01-30)

### Closed Bugs

[Bugs will be moved here by QA after verification]

### Open Bugs

[Bugs not yet addressed remain here]
```

### Bug Fix Best Practices

**Investigation Phase**:

- Read reproduction steps carefully
- Reproduce the bug locally
- Use debugging tools to identify root cause
- Document findings clearly for future reference

**Fix Implementation Phase**:

- Keep changes minimal and targeted
- Add test coverage for the bug scenario
- Test edge cases related to the fix
- Verify existing tests still pass

**Documentation Phase**:

- Describe WHY the bug occurred, not just WHAT was changed
- Provide clear verification steps for QA
- List all modified files
- Update status history table

**Common Pitfalls**:

- Don't rush investigation - understand root cause first
- Don't fix symptoms without addressing root cause
- Don't forget to add test coverage
- Don't leave bug status stale after implementing fix

### Integration with QA Workflow

**Developer→QA Handoff**:

1. Developer fixes bug
2. Developer updates bug status to "Ready for QA"
3. Developer updates story Bug Reports section
4. QA receives notification (via story status change)
5. QA verifies fix

**QA Verification Outcomes**:

- **Fixed** → QA changes bug status to "Closed", moves to Closed Bugs section
- **Still Failing** → QA changes bug status to "Reopened", adds verification notes

---

## Example: Story 2.2

**Gate shows**:

- `coverage_gaps`: Back action behavior untested (AC2)
- `coverage_gaps`: Centralized dependencies enforcement untested (AC4)

**Fix Plan**:

1. Add test ensuring Toolkit Menu "Back" action returns to Main Menu
2. Add static test verifying imports for service/view go through deps.ts
3. Re-run lint/tests
4. Update story File List and Change Log

**Result**: All tests pass, gaps closed, status → Ready for Review

## Key Principles

- **Deterministic prioritization**: Risk-first, severity-based
- **Minimal changes**: Targeted fixes only
- **Tests validate behavior**: Close gaps with comprehensive tests
- **Strict authorization**: Only update allowed story sections
- **QA ownership**: Gate files remain with QA; Dev signals readiness via Status

## Post-Fix QA Artifact Updates

After all bugs have been fixed and are "Ready for QA", request QA to update artifacts:

**Command**:

```
You: "Update QA report and gate with bug resolutions for {task_id}"
```

**What Gets Updated** (NOT new versions created):

1. **Latest QA Report** (`docs/development/tasks/task.{id}.{name}/task.{id}.qa.{number}.{name}.md`):
   - Adds "Bug Resolution Summary" section at end
   - Lists each bug fixed with verification results
   - Updates gate status and deployment recommendation
   - Adds new timestamp

2. **Latest Quality Gate** (`docs/qa/gates/tasks/task.{id}.{name}.gate.{number}.yml`):
   - Updates `gate` field (CONCERNS → PASS)
   - Updates `status_reason` with fix summary
   - Updates `updated` timestamp
   - Adds `status: closed` and `fixed_date` to issues
   - Updates `quality_score`
   - Adds `bug_resolution` section

**IMPORTANT**:

- QA may choose to create a new versioned file (e.g. `qa.2`) if significant changes or re-testing occurred.
- If updating in place, ensure the latest file (highest number) is the one updated.
- Bug reports track iteration history
- QA report shows final state after all fixes

**Full QA Re-run** (for complex fixes with new functionality):

```
You: "Re-run QA on task.{id} after bug fixes"
```

This executes full QA process and updates original QA artifacts.

## Related Skills

- **develop**: Main development workflow
- **execute-checklist**: Run Definition of Done validation
- **validate-story**: Pre-implementation story validation
- **qa-create-task**: Full QA review process for technical tasks

## Resources

See `resources/` directory for:

- `qa-fix-workflow-detailed.md` - Extended workflow documentation
- `qa-gate-template.yaml` - Example gate file structure
- `core-config-reference.yaml` - Project configuration reference
