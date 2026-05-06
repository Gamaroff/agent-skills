---
name: create-task
description: Create comprehensive technical task documentation for refactoring, infrastructure changes, and technical improvements. Interactive workflow with decision guidance for non-user-facing work.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

> **Status lifecycle**: see [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md)

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
- `qa-story` - For QA assessment after task implementation
- `qa-gate` - For formal quality gate decision on technical tasks
- `documentation-standards-validator` - Validates file naming conventions, YAML frontmatter, and structural standards after document creation
- `mermaid-architect` - Generates a decision flowchart, ER, or class diagram for the task when the data shape or branching logic warrants a visual

### When NOT to Use

**Do NOT use** for:

- ❌ User-facing features → Use `create-prd` or `create-story`
- ❌ Simple changes (< 3 steps) → Use `development-todos.md`
- ❌ Bug fixes → Use GitHub Issues
- ❌ Quick improvements → Add to `development-todos.md`

---

## ⚠️ CRITICAL EXECUTION RULES ⚠️

### Documentation-Only Scope — Do NOT Implement

This skill produces **task documentation and the co-located plan file only**. It MUST NOT perform, begin, or scaffold the implementation work that the task describes.

**Forbidden during this skill** (regardless of how compelling it seems):

- ❌ Editing, creating, or deleting any source file outside `docs/development/tasks/task.[ID].[name]/` (and the tracker-issue side effect in step 4.5)
- ❌ Running migrations, codegen, build, lint-fix, or refactor commands
- ❌ Creating branches, committing, or pushing code changes
- ❌ Installing/removing dependencies or modifying `package.json`
- ❌ Starting Phase 1 of the Implementation Plan "to get a head start"
- ❌ Auto-invoking `develop-task`, `develop-story`, or any implementation skill on completion

**Allowed writes** (the only filesystem changes this skill may make):

- ✅ The task directory `docs/development/tasks/task.[ID].[name]/`
- ✅ `task.[ID].[name].md` (task doc)
- ✅ `task.[ID].plan.[name].md` (plan doc)
- ✅ `docs/prd/sprint-status.yaml` status field update (step 5)
- ✅ Tracker issue creation via `gh` / Jira API (step 4.5)

**If the user asks to "create the task and start implementing"**: create the task documentation, then STOP and explicitly hand off — tell user to invoke `/develop-task` (or similar) as a separate step. Do not chain.

### This is an Interactive Document Creation Workflow

When this skill is activated:

1. **USER COLLABORATION IS MANDATORY** - Full interactive workflow required
2. **STEP-BY-STEP SECTION BUILDING** - Process each of 11 sections sequentially
3. **VALIDATION REQUIRED** - Verify completeness before generating final document
4. **FILE CREATION** - Create proper directory structure with correct naming
5. **NO IMPLEMENTATION** - Stop after document + tracker issue created (see "Documentation-Only Scope" above)

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
├── task.[ID].plan.[descriptive-name].md               # Implementation plan (created alongside task)
├── task.[ID].qa.[number].[descriptive-name].md        # QA report (created by QA)
├── task.[ID].bug.[N].[bug-name].md                    # Bug reports (created during QA)
└── task.[ID].gate.[number].[descriptive-name].yml     # Quality gate (co-located, created by QA)
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

### 1.5 Analyse Git History for Technical Context

Before building the document, run a git history scan to ground the technical content:

1. Run `git log --oneline -15` to get recent commits
2. Identify commits that touch the same files, modules, or layers as this task
3. For 2-3 most relevant commits, inspect the diff to extract:
   - Patterns already established in this area (naming, structure, abstractions)
   - Libraries or approaches recently adopted that this task should align with
   - Similar refactors or changes that succeeded or were reverted (and why)
   - Existing utilities, services, or helpers that could be reused
4. Use these insights to pre-populate or validate:
   - **Technical Background** — current architecture is accurate, not outdated
   - **Implementation Plan** — phases don't duplicate or conflict with recent changes
   - **Files Summary** — file paths exist and haven't been moved/deleted
   - **Risk Assessment** — recent reverts or fixes flag real-world risk areas

**Anti-Hallucination Rule**: Only use what is confirmed in the commit history. Do NOT infer patterns not present in the diffs.

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

### 2.5 Generate Plan File

After collecting all section content (especially the Implementation Plan in Section 6), generate a co-located implementation plan file.

**File**: `task.[ID].plan.[descriptive-name].md` — same directory as the task document.

**Purpose**: The plan file contains implementation-level detail that the task document deliberately omits: code snippets, exact file changes, function signatures, and line-by-line guidance. The task doc describes *what* to build; the plan describes *how*.

**Content structure**:

```markdown
---
id: task.[ID].plan
title: "Implementation Plan: [task title]"
type: plan
task-ref: task.[ID].[descriptive-name].md
---

# Implementation Plan: [task title]

> Requirements and success criteria: [task.[ID].[descriptive-name].md](task.[ID].[descriptive-name].md)

## Overview

[1-2 sentence summary of the implementation approach]

## Phase-by-Phase Implementation Guide

### Phase 1: [Phase Name]

**Files to modify:**
- `path/to/file.ts` — [what to change and why]

**Exact changes:**
[Code snippets, function signatures, line references, before/after examples]

### Phase 2: [Phase Name]
[Same structure repeated for each phase]

## Key Patterns and References

[Existing code patterns to follow, utilities to reuse, architectural constraints]

## Testing Approach

[Specific test scenarios, test file locations, mocking strategies]
```

**Content sourcing rules**:
- Extract implementation-level detail from the interactive workflow (code examples, function signatures, file paths discussed during section collection)
- Reference specific lines/functions in existing files discovered during git history analysis (Step 1.5)
- Include before/after code snippets for each phase where applicable
- Do NOT duplicate the task doc's Implementation Plan section verbatim — the plan adds *how*, not restates *what*

**Cross-reference in task doc**: After generating the plan file, add a cross-reference line at the top of the task doc's Implementation Plan section (Section 6):

```markdown
> Detailed implementation guide: [task.[ID].plan.[descriptive-name].md](task.[ID].plan.[descriptive-name].md)
```

### 2.5 Visual Diagram (conditional, via `mermaid-architect`)

After the Implementation Plan and Technical Background are populated, decide whether a Mermaid diagram materially clarifies the task. **Mandatory only if it enhances understanding** — do not pad the task doc with a diagram that just restates Section 3.

**Diagram type by task shape:**

- Task introduces or migrates a data shape → `erDiagram` (entities + relationships) or `classDiagram`
- Task contains non-trivial decision/branching logic → `flowchart` with decision nodes
- Task migrates an architecture from "current" to "target" → side-by-side `flowchart` subgraphs

**Process:**

1. Invoke `mermaid-architect` with: task file path, the section anchor (typically Technical Background or Implementation Plan), and the entity/decision keywords already named in the prose.
2. The skill returns a Mermaid block (with YAML metadata header) and a 2-sentence "Architectural assumptions" summary.
3. Paste the block into Section 3 (Technical Background) under a "Current vs Target Architecture" subheading, OR into Section 6 (Implementation Plan) under a "Decision Flow" subheading — whichever is more relevant.
4. Accept `no diagram justified — {reason}` without pushing back.

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
- ✅ File naming validated against documentation standards (dots not underscores, kebab-case descriptive names)

**If validation fails**:

- Identify missing sections
- Prompt user to complete them
- Offer guided completion flow

### 3.5 Adversarial Quality Review

**CRITICAL / BLOCKING**: This step is mandatory and must not be skipped. Do not proceed to Section 4 (Document Generation) until this review is complete. Perform an adversarial re-analysis of all collected content as if reviewing someone else's work. Goal: make implementation mistakes **impossible**.

#### 🚨 Critical (auto-fix before document generation)

- **Wheel reinvention**: Does the implementation plan direct the developer toward existing code, services, or utilities they should extend rather than re-implement? Search the codebase for related functionality.
- **Wrong libraries or versions**: Are all library/framework references consistent with `package.json`? No fabricated or outdated dependencies.
- **Incorrect file paths**: Do all files in the Files Summary actually exist (for modifications) or land in the correct directories (for new files)? Validate against the project's directory structure.
- **Incomplete migration paths**: Every breaking change must have a concrete migration path — not just "update callers". Flag vague migrations.
- **Inadequate rollback plan**: Are rollback triggers specific enough to act on? Are steps actionable in under 1 hour if needed?
- **Risk underestimation**: Does the Risk Assessment account for side effects surfaced by git history (recent reverts, related fixes)?

#### ⚡ Should Add (present to user for confirmation)

- **Missing performance baselines**: If the task claims performance improvements, does it document current baselines to measure against?
- **Uncovered test scenarios**: Does the Testing Strategy cover regression risks, not just happy paths?
- **Scope creep risk**: Are any implementation steps implicitly larger than stated?

#### ✨ Nice to Have (present to user for confirmation)

- **Clarity**: Are phase descriptions specific enough that a developer not involved in planning can execute them?
- **Checklist completeness**: Do all checkboxes in the Implementation Plan cover the full scope?

Fix all Critical items in the collected content before proceeding. Present Should Add and Nice to Have to the user.

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
   - Note quality gate will be co-located in the task directory
   - Provide next steps

4. **Display Success Message**
   - Show file path created
   - Show task ID assigned
   - Provide command to view file
   - Link to related QA skills

5. **Run Documentation Standards Validation**
   - Invoke `documentation-standards-validator` on the created file
   - Confirm: dots used as structural separators, hyphens within names, lowercase, `.md` extension
   - Fix any naming violations before presenting the file to the user

### 4.5 Create Tracker Issue

After the task document is fully written, create a corresponding issue in the remote tracker. Detect platform first using the canonical resolver (see `shared/resources/platform-detection.md`):

```bash
source shared/resources/resolve-platform.sh
# TRACKER = jira | github; VCS = github | bitbucket
```

---

#### Jira Path (when `TRACKER=jira`)

> **Note**: Tasks are NOT linked to epics — no `customfield_10014` is set.

Map priority to Jira values:

| Task priority | Jira priority |
|---------------|---------------|
| Critical / High | High |
| Medium | Medium |
| Low | Low |

```bash
JIRA_AUTH=$(echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64)

body_file=$(mktemp)
cat > "$body_file" <<'BODY'
## Overview

{First paragraph of the task's Overview section — 2-4 sentences}

## Key Deliverables

{Bulleted list from the task's Key Deliverables or Scope section}

## Success Criteria (summary)

- [ ] {Most important criterion 1}
- [ ] {Most important criterion 2}

## Metadata

| Field | Value |
|-------|-------|
| Priority | {priority} |
| Effort | {effort_estimate} |
| Category | {category} |
| Depends on | {depends_on or —} |

## Document

📁 `{task-file-relative-path}`
BODY

JIRA_RESPONSE=$(curl -s -X POST \
  "${JIRA_URL}/rest/api/2/issue" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic ${JIRA_AUTH}" \
  -d "$(jq -n \
    --arg summary "[Task {id}] {title}" \
    --arg description "$(cat "$body_file")" \
    --arg project "$JIRA_PROJECT_KEY" \
    --arg priority "{High|Medium|Low}" \
    '{
      "fields": {
        "project": {"key": $project},
        "summary": $summary,
        "description": $description,
        "issuetype": {"name": "Task"},
        "priority": {"name": $priority}
      }
    }'
  )")
rm -f "$body_file"

task_key=$(echo "$JIRA_RESPONSE" | jq -r '.key // empty')
task_url="${JIRA_URL}/browse/${task_key}"
```

**On success**: Add to task YAML frontmatter:
```yaml
jira_key: RB-15
jira_url: https://mediastreamag.atlassian.net/browse/RB-15
```

**On failure**: Set `jira_key: null`, log warning, continue. Never halt.

---

#### GitHub Path (when `TRACKER=github`)

Read `project.yml` (repo root) to get `github.project_board_name` for the `--project` flag:

```bash
# Build clickable document link
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
DOC_URL="https://github.com/$REPO/blob/develop/{task-file-relative-path}"

gh issue create \
  --title "[Task {id}] {title}" \
  --project "{project_board_name}" \
  --body "## Overview

{First paragraph of the task's Overview section — 2-4 sentences describing what the task does and why}

## Key Deliverables

{Bulleted list from the task's Key Deliverables or Scope section}

## Success Criteria (summary)

{2-5 most important success criteria, as a checkbox list}

## Metadata

| Field | Value |
|-------|-------|
| Priority | {priority} |
| Effort | {effort_estimate} |
| Category | {category} |
| Depends on | {depends_on or —} |

## Document

📄 [Task Document]($DOC_URL)
📁 \`{task-file-relative-path}\`" \
  --label "task" \
  --label "priority:{priority}" \
  --milestone "{milestone_title}"
```

**Milestone selection** — determine `{milestone_title}` in this order:

1. If the task document has a `milestone:` frontmatter field, use that value verbatim
2. If the task has an `epic:` frontmatter field (e.g. `epic: 23`), look up the milestone title from the epic registry (`docs/development/epic-registry.md`) — format: `"Epic {N} — {Epic Title}"`
3. Otherwise default to `"Technical Tasks (standalone)"`

If the chosen milestone doesn't exist yet, auto-create it first:

```bash
gh api repos/{owner}/{repo}/milestones -f title="{milestone_title}" -f state="open"
```

**On success**:
1. Parse the issue URL from the `gh` output (e.g. `https://github.com/org/repo/issues/42`)
2. Add the issue to the GitHub Project board:
   ```bash
   gh project item-add {project_board_number} --owner {owner} --url {issue_url}
   ```

2b. Set Priority field on the board item (mirrors the label already applied):
   ```bash
   # 2b. Set Priority field on the board item (mirrors the label already applied)
   case "{priority}" in
     Critical) P_PREFIX="P0" ;;
     High)     P_PREFIX="P1" ;;
     Medium)   P_PREFIX="P2" ;;
     Low)      P_PREFIX="P3" ;;
     *)        P_PREFIX="P2" ;;
   esac

   OWNER=$(gh repo view --json owner -q '.owner.login')
   REPO_NAME=$(gh repo view --json name -q '.name')
   PROJ_RESPONSE=$(gh api graphql -f query='
   {
     repository(owner: "'"$OWNER"'", name: "'"$REPO_NAME"'") {
       issue(number: {github_issue_number}) {
         projectItems(first: 10) {
           nodes {
             id
             project {
               id
               fields(first: 20) {
                 nodes {
                   ... on ProjectV2SingleSelectField {
                     id name options { id name }
                   }
                 }
               }
             }
           }
         }
       }
     }
   }')

   NEW_ITEM_ID=$(echo "$PROJ_RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].id // empty')
   PROJECT_ID=$(echo "$PROJ_RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.id // empty')
   PRIORITY_FIELD_ID=$(echo "$PROJ_RESPONSE" | jq -r '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Priority") | .id // empty')
   PRIORITY_OPTION_ID=$(echo "$PROJ_RESPONSE" | jq -r --arg p "$P_PREFIX" '.data.repository.issue.projectItems.nodes[0].project.fields.nodes[] | select(.name == "Priority") | .options[] | select(.name | startswith($p)) | .id // empty')

   if [ -n "$NEW_ITEM_ID" ] && [ -n "$PRIORITY_FIELD_ID" ] && [ -n "$PRIORITY_OPTION_ID" ]; then
     gh api graphql -f query='
     mutation {
       updateProjectV2ItemFieldValue(input: {
         projectId: "'"$PROJECT_ID"'"
         itemId: "'"$NEW_ITEM_ID"'"
         fieldId: "'"$PRIORITY_FIELD_ID"'"
         value: { singleSelectOptionId: "'"$PRIORITY_OPTION_ID"'" }
       }) { projectV2Item { id } }
     }' >/dev/null 2>&1 \
       && echo "✅ Priority set to ${P_PREFIX} on project board" \
       || echo "⚠️  Priority field set failed — label priority:{priority} still applied"
   fi
   ```

3. Add `github_issue: {N}` to the task's YAML frontmatter.

**On failure**: Set `github_issue: null`, log warning, continue. Never halt.

### 5. Post-Generation Steps — STOP HERE

This is the terminal step of the skill. After completing it, **end the session and return control to the user**. Do not begin implementation, do not auto-invoke `develop-task`, do not start Phase 1 work.

Actions:

1. Task document created at `docs/development/tasks/task.[ID].[name]/task.[ID].[name].md`
2. Plan file created at `docs/development/tasks/task.[ID].[name]/task.[ID].plan.[name].md`
3. If `docs/prd/sprint-status.yaml` exists, update it:
   - Load the full file, preserving all comments and structure
   - Find the entry matching this task's ID/key
   - Update its status to `ready-for-dev`
   - Save the file

Inform user (and stop):

- Document and plan paths
- Tracker issue URL (from step 4.5) if created
- **Next step is the user's call**: invoke `/develop-task` to implement, or hand off to another developer. This skill does not implement.
- When implementation is complete, QA artifacts will land at:
  - QA report: `task.[ID].qa.[number].[name].md`
  - Bug reports (if issues found): `task.[ID].bug.[N].[name].md`
  - Quality gate: `task.[ID].gate.[number].[name].yml` (co-located in task directory)

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
5. **Create quality gate** at `task.[ID].gate.[number].[name].yml` (co-located in task directory)
6. **Make gate decision**: PASS | CONCERNS | FAIL | WAIVED

### Bug Fix Cycle

If QA finds issues:

1. Developer fixes bugs, updates bug report status
2. QA retests and updates gate status
3. Iterate until PASS
4. Final QA report summarizes gate decision and deployment readiness

**Related QA Skills**:

- **qa-planning**: Risk assessment and test design (use during planning phase)
- **qa-story**: Comprehensive review for technical tasks (use when ready for QA)
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
