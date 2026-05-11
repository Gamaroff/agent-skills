---
name: create-issue
description: 'Create issues and corresponding local work item documents. This skill should be used when identifying bugs, improvements, or work items during PR reviews or development. Creates an issue via the GitHub CLI (GitHub), Bitbucket REST API (Bitbucket), or Jira REST API (Jira). Platform is auto-detected: Jira takes priority when JIRA_URL is set, otherwise detected from the git remote URL.'
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# Create Issue

This skill creates tracked work items by:

1. Creating an **issue in the remote tracker** (Jira, GitHub, or Bitbucket) for visibility and tracking
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

### Step 2.5: Detect Platform

Before creating an issue in the remote tracker, detect the issue tracking platform. **Jira takes priority** — if `JIRA_URL` is set, always use Jira regardless of the git remote.

```bash
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

# Jira takes priority — checked before git remote detection
if [ -n "$JIRA_URL" ]; then
  PLATFORM="jira"
  # Use JIRA_PROJECT_KEY from env, or fall back to CLAUDE.md-declared value
  JIRA_PROJECT="${JIRA_PROJECT_KEY:-}"
  if [ -z "$JIRA_PROJECT" ]; then
    echo "Error: JIRA_PROJECT_KEY must be set" && exit 1
  fi
  if [ -z "$JIRA_USER_EMAIL" ] || [ -z "$JIRA_API_TOKEN" ]; then
    echo "Error: JIRA_USER_EMAIL and JIRA_API_TOKEN must be set" && exit 1
  fi

elif echo "$REMOTE_URL" | grep -qi "github\.com"; then
  PLATFORM="github"
  REPO_SLUG=$(echo "$REMOTE_URL" \
    | sed -E 's|.*github\.com[:/]([^/]+/[^/]+?)(\.git)?$|\1|')

elif echo "$REMOTE_URL" | grep -qi "bitbucket\.org"; then
  PLATFORM="bitbucket"
  BB_PATH=$(echo "$REMOTE_URL" \
    | sed -E 's|.*bitbucket\.org[:/]([^/]+/[^/]+?)(\.git)?$|\1|')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"

  # Verify credentials
  if [ -z "$BITBUCKET_USERNAME" ] || [ -z "$BITBUCKET_APP_PASSWORD" ]; then
    echo "Error: BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD must be set" && exit 1
  fi
else
  PLATFORM="unknown"
fi
```

> [!NOTE]
> **Bitbucket Issues** must be enabled on the repository (Settings → Features → Issues). For projects that use Jira as the issue tracker (even with Bitbucket as the code host), set `JIRA_URL` and Jira will be used automatically.

### Step 3: Create Issue in Remote Tracker

**ALWAYS use a tempfile for the body** — never inline it. This avoids heredoc wrapping issues with long URLs.

1. Render the body to a tempfile:

```bash
body_file=$(mktemp)
cat > "$body_file" <<'EOF'
## Context

Related to: story.180.3.quick-re-search

## Description

{User-provided description}

## Source

- **From PR**: #{pr_number} (if applicable)
- **Story/Task**: story.180.3.quick-re-search
- **Local Doc**: `docs/prd/<domain>/<feature>/epics/epic.180.<name>/stories/story.180.3.quick-re-search/story.180.3.issue.1.debounce-timing.md`

## Acceptance Criteria

- [ ] {Derived from description}
EOF
```

2. **Pre-flight validation — MANDATORY.** Abort if any template token survived substitution:

```bash
if grep -Eq '(_PLACEHOLDER|\{[a-z_]+\})' "$body_file"; then
  echo "ERROR: unsubstituted tokens in issue body:" >&2
  grep -nE '(_PLACEHOLDER|\{[a-z_]+\})' "$body_file" >&2
  exit 1
fi
```

3. Create the issue — branch on `PLATFORM`:

**Jira:**

Map type and priority to Jira values:

| Input type  | Jira `issuetype` |
| ----------- | ---------------- |
| bug         | Bug              |
| enhancement | Story            |
| task        | Task             |

| Input priority | Jira `priority` |
| -------------- | --------------- |
| high           | High            |
| medium         | Medium          |
| low            | Low             |

```bash
JIRA_AUTH=$(echo -n "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" | base64)

JIRA_RESPONSE=$(curl -s -X POST \
  "${JIRA_URL}/rest/api/2/issue" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic ${JIRA_AUTH}" \
  -d "$(jq -n \
    --arg summary "$TITLE" \
    --arg description "$(cat "$body_file")" \
    --arg project "$JIRA_PROJECT" \
    --arg issuetype "$JIRA_ISSUETYPE" \
    --arg priority "$JIRA_PRIORITY" \
    '{
      "fields": {
        "project": {"key": $project},
        "summary": $summary,
        "description": $description,
        "issuetype": {"name": $issuetype},
        "priority": {"name": $priority}
      }
    }'
  )")

issue_key=$(echo "$JIRA_RESPONSE" | jq -r '.key // empty')
issue_url="${JIRA_URL}/browse/${issue_key}"

if [ -z "$issue_key" ]; then
  echo "ERROR: Jira issue creation failed:" >&2
  echo "$JIRA_RESPONSE" | jq '.errors // .' >&2
  exit 1
fi
```

---

**GitHub:**
```bash
issue_url=$(gh issue create \
  --title "[Story 180.3] Debounce timing needs adjustment" \
  --body-file "$body_file" \
  --label "enhancement" \
  --label "story.180")
issue_number="${issue_url##*/}"
issue_url="$issue_url"
```

Post-create verification:
```bash
created_body=$(gh issue view "$issue_number" --json body --jq '.body')
if echo "$created_body" | grep -Eq '(_PLACEHOLDER|\{[a-z_]+\})'; then
  echo "ERROR: created issue #$issue_number has unsubstituted tokens:" >&2
  echo "$created_body" | grep -nE '(_PLACEHOLDER|\{[a-z_]+\})' >&2
  echo "Fix with: gh issue edit $issue_number --body-file <corrected-file>" >&2
  exit 1
fi
```

---

**Bitbucket:**

Map type and priority to Bitbucket values:

| Input type  | Bitbucket `kind` |
| ----------- | ---------------- |
| bug         | bug              |
| enhancement | enhancement      |
| task        | task             |

| Input priority | Bitbucket `priority` |
| -------------- | -------------------- |
| high           | major                |
| medium         | minor                |
| low            | trivial              |

```bash
ISSUE_RESPONSE=$(curl -s -X POST \
  "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/issues" \
  -H "Content-Type: application/json" \
  -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
  -d "$(jq -n \
    --arg title "[Story 180.3] Debounce timing needs adjustment" \
    --arg content "$(cat "$body_file")" \
    --arg kind "enhancement" \
    --arg priority "minor" \
    '{
      "title": $title,
      "content": {"raw": $content},
      "kind": $kind,
      "priority": $priority
    }'
  )")

issue_number=$(echo "$ISSUE_RESPONSE" | jq -r '.id // empty')
issue_url=$(echo "$ISSUE_RESPONSE"   | jq -r '.links.html.href // empty')

if [ -z "$issue_number" ]; then
  echo "ERROR: Bitbucket issue creation failed:" >&2
  echo "$ISSUE_RESPONSE" | jq '.error // .' >&2
  exit 1
fi
```

---

```bash
rm -f "$body_file"
```

**Capture `issue_number` and `issue_url`** — used in Steps 4–6.

### Step 4: Create Local Issue Document

Create the issue file in the source directory. Use the appropriate tracker reference based on `PLATFORM`:

```markdown
# Issue: {Title}

**Issue ID**: story.{epic}.{story}.issue.{n}
**Tracker Issue**: {PROJ-123 (https://yourorg.atlassian.net/browse/PROJ-123) | #45 (https://github.com/...) | #45 (https://bitbucket.org/...)}
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

| ID      | Title                                                       | Status  | Priority | Tracker                   |
| ------- | ----------------------------------------------------------- | ------- | -------- | ------------------------- |
| issue.1 | [Debounce timing](./story.180.3.issue.1.debounce-timing.md) | 🆕 Open | Medium   | [PROJ-45](https://...) |
```

**For Tasks** - Add or update `### Issues` section:

```markdown
### Issues

- [task.4.issue.1.missing-nx-config.md](./task.4.issue.1.missing-nx-config.md) - 🆕 Open - [#45](https://...)
```

### Step 6: Output Summary

For **Jira**:
```
✅ Issue Created!

   Jira Issue: PROJ-45
   URL: https://yourorg.atlassian.net/browse/PROJ-45

   Local Document: story.180.3.issue.1.debounce-timing.md
   Location: docs/prd/.../stories/story.180.3.quick-re-search/

Next Steps:
   1. Start work: /create-branch story.180.3.issue.1.debounce-timing.md
   2. Implement the fix
   3. Commit: /commit-changes
   4. Create PR: /create-pr
```

For **GitHub**:
```
✅ Issue Created!

   GitHub Issue: #45
   URL: https://github.com/org/repo/issues/45
   ...
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

### Not Authenticated

**Jira:**
```
Error: Jira credentials not set or invalid.

Set the following environment variables:
  export JIRA_URL=https://yourorg.atlassian.net
  export JIRA_PROJECT_KEY=RB
  export JIRA_USER_EMAIL=your-email@example.com
  export JIRA_API_TOKEN=your-api-token

API tokens can be created at:
  https://id.atlassian.com/manage-profile/security/api-tokens

Then retry /create-issue
```

**GitHub:**
```
Error: GitHub CLI is not authenticated.

To authenticate, run:
  gh auth login

Then retry /create-issue
```

**Bitbucket:**
```
Error: Bitbucket credentials not set or invalid.

Set the following environment variables:
  export BITBUCKET_USERNAME=your-username
  export BITBUCKET_APP_PASSWORD=your-app-password

App passwords can be created at:
  https://bitbucket.org/account/settings/app-passwords/

Then retry /create-issue
```

### Bitbucket Issues Disabled

```
Error: Issues are disabled on this Bitbucket repository.

Enable Issues at: Repository Settings → Features → Issues

Alternatively, use an external tracker (Jira, Linear) and
record the issue URL manually in the local issue document.
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
- [Bitbucket REST API — Issues](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-issue-tracker/) - Bitbucket issue creation
- [Bitbucket App Passwords](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/) - Authentication for Bitbucket API
