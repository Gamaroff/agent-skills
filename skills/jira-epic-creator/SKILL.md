---
name: jira-epic-creator
description: Create Jira epics from epic markdown documents. Use when user wants to sync local epic documentation to Jira, create Jira tickets from epic files, or publish epics to Jira project management.
---

# Jira Epic Creator

## When to Use This Skill

Activate when user needs to:

- Create a Jira epic from a local epic markdown file
- Sync epic documentation to Jira project management
- Publish epics defined in `docs/prds/*/epics/*.md` to Jira
- Generate Jira tickets from structured epic documents

**Natural triggers:**

- "Create this epic in Jira"
- "Sync epic to Jira"
- "Publish epic.1.aml-risk-dashboard to Jira"
- "Use the script to create epic on Jira"

## Prerequisites

**Required Files:**

- Epic markdown file following the standard epic format (YAML frontmatter with title, priority, etc.)
- The script `.scripts/jira-create-epic.js` in the project root

**Required Environment Variables:**

The following Jira environment variables must be available (will prompt if missing):

- `JIRA_URL` - Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
- `JIRA_API_TOKEN` - Jira API token for authentication
- `JIRA_USER_EMAIL` - Email associated with Jira account
- `JIRA_PROJECT_KEY` - Project key where epic will be created

## Usage

### Creating a Jira Epic from Epic File

1. **Verify environment variables** are set
2. **Execute the script** with the epic file path:

```bash
node .scripts/jira-create-epic.js --file docs/prds/[domain]/[feature]/epics/epic.[N].[name].md
```

### Environment Variable Check

Before running, verify Jira environment variables:

```bash
echo "JIRA_URL: $JIRA_URL"
echo "JIRA_PROJECT_KEY: $JIRA_PROJECT_KEY"
echo "JIRA_USER_EMAIL: $JIRA_USER_EMAIL"
```

**If variables are not set**, prompt the user for each missing variable:

- "What is your Jira URL?" (default: `https://yourcompany.atlassian.net`)
- "What is your Jira project key?"
- "What is your Jira user email?"
- "What is your Jira API token?"

Then export them before running the script:

```bash
export JIRA_URL="[value]"
export JIRA_PROJECT_KEY="[value]"
export JIRA_USER_EMAIL="[value]"
export JIRA_API_TOKEN="[value]"
```

### Epic File Format

The epic file must follow the standard format with YAML frontmatter:

```yaml
---
title: "Epic N: Epic Name"
prd_source: "source-document.md"
epic_type: "feature_enhancement"
priority: "high"
estimated_sprints: 2
dependencies: []
status: "NOT_STARTED"
---
```

The script extracts:

- **Summary** from `title` frontmatter or first heading
- **Description** from Epic Goal and Epic Description sections
- **Priority** from `priority` frontmatter (automatically capitalized for Jira: "high" → "High")
- **Stories table** from Stories Breakdown section

**After successful creation, the script automatically updates the epic file with:**

```yaml
jira_key: "RB-9"
jira_url: "https://yourcompany.atlassian.net/browse/RB-9"
```

These are added to the YAML frontmatter to maintain the link between local documentation and Jira.

### Command Options

The script supports these flags:

- `--file, -f` - Path to epic markdown file (required when using file input)
- `--summary, -s` - Epic summary/title (overrides file)
- `--description, -d` - Epic description (overrides file)
- `--priority, -p` - Priority level (overrides file)
- `--labels, -l` - Comma-separated labels
- `--dry-run` - Preview what would be created without creating

### Dry Run Mode

To preview before creating:

```bash
node .scripts/jira-create-epic.js --file docs/prds/.../epic.N.name.md --dry-run
```

## Workflow

1. **Parse epic file** - Extract frontmatter and description sections
2. **Check environment** - Verify JIRA\_\* variables, prompt if missing
3. **Validate file exists** - Confirm epic file path is correct
4. **Run script** - Execute `.scripts/jira-create-epic.js` with file path
5. **Report result** - Display created epic key and URL
6. **Update epic file** - Add `jira_key` and `jira_url` to frontmatter

## Success Indicators

- Epic created in Jira with extracted summary and description
- Epic key displayed (e.g., `PROJ-123`)
- Jira URL provided for direct access
- Stories breakdown included in description
- Epic file updated with `jira_key` and `jira_url` frontmatter entries

## Error Handling

**Missing environment variables:** Prompt user for values and export before retry

**File not found:** Verify path and check for typos

**Authentication failed:** Verify API token and email are correct

**Project not found:** Confirm JIRA_PROJECT_KEY matches existing Jira project

## Notes

- The script uses Jira REST API v2
- Epic issue type is auto-detected from project metadata
- Description is formatted with markdown-compatible Jira markup
- API token can be generated at: https://id.atlassian.com/manage-profile/security/api-tokens
