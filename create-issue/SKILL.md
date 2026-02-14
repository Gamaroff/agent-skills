---
name: create-issue
description: Create GitHub issues and corresponding local work item documents. This skill should be used when identifying bugs, improvements, or work items during PR reviews or development. Creates a GitHub issue via the gh CLI and a co-located issue document following the project naming conventions.
---

# Create Issue

This skill creates tracked work items by:

1. Creating a **GitHub Issue** for visibility and tracking
2. Creating a **local issue document** co-located with the source story/task
3. Linking them bidirectionally for traceability

## When to Use This Skill

Use this skill when:

- Finding a bug or improvement during a PR review
- Identifying work that needs to be done related to a story or task
- Need to track a work item in GitHub AND have local documentation
- Want to create a branch from a documented issue

**Do NOT use for**:

- Major new features (use `create-story` or `create-epic`)
- Bugs found during formal QA testing (use `create-bug-report`)
- Simple todos that don't need tracking (use inline comments)

## Input Requirements

```yaml
required:
  - source: Story file, task file, or directory path
  - title: Brief, descriptive issue title
  - description: What needs to be done and why

optional:
  - type: bug | enhancement | task (default: enhancement)
  - priority: high | medium | low (default: medium)
  - labels: Additional GitHub labels
  - from_pr: PR number/URL if issue originated from PR review
```

## Naming Conventions

Issue documents follow the same pattern as bug reports, using `issue` instead of `bug`:

### Story Issues

```
story.{epic}.{story}.issue.{n}.{descriptive-name}.md
```

**Examples**:

- `story.179.5.issue.1.privacy-settings-mobile-ui.md`
- `story.180.3.issue.2.search-debounce-timing.md`

**Location**: Co-located in the story directory:

```
docs/prd/.../stories/story.180.3.quick-re-search/
├── story.180.3.quick-re-search.md
├── story.180.3.issue.1.debounce-timing.md    ← New issue
└── story.180.3.bug.1.search-crash.md         ← Existing bug (from QA)
```

### Task Issues

```
task.{id}.issue.{n}.{descriptive-name}.md
```

**Examples**:

- `task.4.issue.1.missing-nx-config.md`
- `task.4.issue.2.lint-rule-violations.md`

**Location**: Co-located in the task directory:

```
docs/development/tasks/task.4.nx-monorepo-structure-audit/
├── task.4.nx-monorepo-structure-audit.md
├── task.4.issue.1.missing-nx-config.md       ← New issue
└── task.4.bug.1.build-failure.md             ← Existing bug (from QA)
```

## Workflow

### Step 1: Identify Source Context

Parse the input to determine:

1. **Source type**: Story or Task
2. **Source ID**: `{epic}.{story}` or `{task-id}`
3. **Source directory**: Where to create the issue file

**Input Examples**:

```bash
# Story directory
/create-issue docs/prd/.../stories/story.180.3.quick-re-search/

# Story file
/create-issue story.180.3.quick-re-search.md "Title" "Description"

# Task directory
/create-issue docs/development/tasks/task.4.nx-monorepo-structure-audit/

# Task file
/create-issue task.4.nx-monorepo-structure-audit.md "Title" "Description"
```

### Step 2: Determine Next Issue Number

Search the source directory for existing issue files:

```bash
# For stories
ls story.{epic}.{story}.issue.*.md

# For tasks
ls task.{id}.issue.*.md
```

**Numbering Rules**:

- Start at 1 for each story/task
- Increment sequentially (1, 2, 3, ...)
- Never reuse numbers even if issues are closed
- Issue numbers are independent of bug numbers

### Step 3: Create GitHub Issue

Use the GitHub CLI to create the issue:

```bash
gh issue create \
  --title "[Story 180.3] Debounce timing needs adjustment" \
  --body "## Context

Related to: story.180.3.quick-re-search

## Description

{User-provided description}

## Source

- **From PR**: #{pr_number} (if applicable)
- **Story/Task**: story.180.3.quick-re-search
- **Local Doc**: story.180.3.issue.1.debounce-timing.md

## Acceptance Criteria

- [ ] {Derived from description}
" \
  --label "enhancement" \
  --label "story.180"
```

**Capture the issue number** from the output (e.g., `#45`).

### Step 4: Create Local Issue Document

Create the issue file in the source directory:

```markdown
# Issue: {Title}

**Issue ID**: story.{epic}.{story}.issue.{n}
**GitHub Issue**: #{github_issue_number} (https://github.com/org/repo/issues/{n})
**Related Story**: [Story {epic}.{story}: {title}](./story.{epic}.{story}.{name}.md)
**Status**: 🆕 Open
**Type**: {bug | enhancement | task}
**Priority**: {high | medium | low}
**Created**: {YYYY-MM-DD}
**From PR**: #{pr_number} (if applicable)

---

## Description

{User-provided description}

---

## Context

{Why this issue was identified, what triggered it}

---

## Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}

---

## Resolution

### Branch

Once work begins:

- **Branch**: `feature/story.{epic}.{story}.issue.{n}.{name}` or `fix/...`
- **Created**: {date}
- **PR**: #{pr_number}

### Implementation Notes

{To be filled during implementation}

### Verification

- [ ] Issue resolved
- [ ] PR merged
- [ ] GitHub issue closed

---

## Status History

| Date           | Status | Changed By | Notes                              |
| -------------- | ------ | ---------- | ---------------------------------- |
| {created_date} | Open   | {Author}   | Issue created from PR #{pr_number} |
```

### Step 5: Update Source Document

Add a link to the issue in the source story/task's issues section.

**For Stories** - Add or update `## Issues` section:

```markdown
## Issues

| ID      | Title                                                       | Status  | Priority | GitHub             |
| ------- | ----------------------------------------------------------- | ------- | -------- | ------------------ |
| issue.1 | [Debounce timing](./story.180.3.issue.1.debounce-timing.md) | 🆕 Open | Medium   | [#45](https://...) |
```

**For Tasks** - Add or update `### Issues` section:

```markdown
### Issues

- [task.4.issue.1.missing-nx-config.md](./task.4.issue.1.missing-nx-config.md) - 🆕 Open - [#45](https://...)
```

### Step 6: Output Summary

```
✅ Issue Created!

   GitHub Issue: #45
   URL: https://github.com/goji-wallet/goji-system/issues/45

   Local Document: story.180.3.issue.1.debounce-timing.md
   Location: docs/prd/.../stories/story.180.3.quick-re-search/

Next Steps:
   1. Start work: /create-branch story.180.3.issue.1.debounce-timing.md
   2. Implement the fix
   3. Commit: /commit-changes
   4. Create PR: /create-pr (will auto-close #45)
```

## Issue vs Bug: When to Use Which

| Scenario                   | Use This             | Reason                               |
| -------------------------- | -------------------- | ------------------------------------ |
| Found during **PR review** | `/create-issue`      | Informal discovery, needs tracking   |
| Found during **formal QA** | `/create-bug-report` | QA workflow, severity classification |
| **Enhancement** request    | `/create-issue`      | Not a defect, new capability         |
| **Tech debt** identified   | `/create-issue`      | Improvement, not broken              |
| **Blocker/Major** defect   | `/create-bug-report` | Formal QA process required           |

## Integration with Git Workflow

The issue document integrates seamlessly with the Gitflow skills:

```bash
# 1. Create the issue (this skill)
/create-issue story.180.3.md "Add loading spinner" "User reported slow feedback"

# 2. Start work on the issue
/create-branch story.180.3.issue.1.loading-spinner.md

# 3. Implement, then commit
/commit-changes

# 4. Create PR (closes GitHub issue automatically)
/create-pr
```

**PR Template Integration**:

When `/create-pr` is used on an issue branch, it should include:

```markdown
## Related Issues

Closes #45
```

This auto-closes the GitHub issue when the PR is merged.

## Labels Strategy

Apply GitHub labels based on context:

| Type        | Labels                                             |
| ----------- | -------------------------------------------------- |
| Story Issue | `story.{epic}`, `{type}`                           |
| Task Issue  | `technical`, `{type}`                              |
| From PR     | `from-pr-review`                                   |
| Priority    | `priority:high`, `priority:medium`, `priority:low` |

## Error Handling

### Source Not Found

```
Error: Could not find story or task at the specified path.

Please provide a valid story or task file/directory:
  - Story: docs/prd/.../stories/story.X.X.name/
  - Task: docs/development/tasks/task.X.name/
```

### gh CLI Not Authenticated

```
Error: GitHub CLI is not authenticated.

To authenticate, run:
  gh auth login

Then retry /create-issue
```

### Issue Already Exists

If an issue with similar title exists:

```
Warning: Similar GitHub issue may already exist:
  #42: "Add loading spinner to search" (open)

Options:
  1. Link to existing issue #42
  2. Create new issue anyway
  3. Cancel
```

## Examples

### From PR Review

```
Input:
/create-issue story.180.3.quick-re-search.md \
  --title "Search debounce should be 300ms not 500ms" \
  --type enhancement \
  --from-pr 123

Output:
✅ Issue Created!

   GitHub Issue: #47
   Local Document: story.180.3.issue.1.search-debounce-timing.md

Next Steps:
   /create-branch story.180.3.issue.1.search-debounce-timing.md
```

### Tech Debt Discovery

```
Input:
/create-issue task.4.nx-monorepo-structure-audit.md \
  --title "Missing ESLint config for new library" \
  --type task \
  --priority high

Output:
✅ Issue Created!

   GitHub Issue: #48
   Local Document: task.4.issue.1.missing-eslint-config.md
```

## Related Skills

- `/create-branch` - Create a branch from the issue document
- `/create-pr` - Create a PR that closes the GitHub issue
- `/commit-changes` - Commit changes with proper messages
- `/create-bug-report` - For formal QA-discovered bugs

## References

- [Git Strategy](file:///docs/development/git-strategy.md) - Gitflow branching model
- [GitHub CLI Documentation](https://cli.github.com/manual/gh_issue_create) - `gh issue create` options
