---
name: epic-registry-manager
description: Manage global epic numbering and registry updates. Use when creating new epics to assign next available epic number, validate epic.NUMBER.name.md filename format, update epic-registry.md with new entries, and ensure YAML frontmatter compliance. Prevents epic number conflicts and maintains central epic tracking.
---

# Epic Registry Manager

Manage globally unique epic numbers and maintain the central epic registry for consistent epic tracking across the Goji project.

## When to Use This Skill

Activate this skill when:

1. **Creating a new epic** - Assign next available epic number
2. **Validating epic filenames** - Check epic.NUMBER.name.md format
3. **Updating epic registry** - Add new epic to central registry
4. **Checking epic conflicts** - Verify epic number not already used
5. **Auditing epic numbering** - Review all epic assignments
6. **Renaming epics** - Update epic number and registry entry

## Epic Numbering System

### Globally Unique Epic Numbers

**Rule**: Epic numbers are globally unique across ALL domains and features.

\`\`\`
docs/prd/{domain}/{feature}/epics/
├── epic.163.wallet-security/
│   ├── epic.163.wallet-security.md     ← Epic #163
│   └── stories/
├── epic.164.transaction-batching/
│   ├── epic.164.transaction-batching.md ← Epic #164 (next sequential)
│   └── stories/
└── epic.165.chat-encryption/
    ├── epic.165.chat-encryption.md      ← Epic #165 (different domain, still sequential)
    └── stories/
\`\`\`

**NOT** scoped by domain or feature.

### Epic Registry File

**Location**: \`/docs/development/epic-registry.md\`

## Workflow: Create New Epic

### Step 1: Check Next Available Number

Read epic registry and find highest epic number. Next epic number = highest + 1.

### Step 2: Determine Domain and Feature

Prompt user for:
- **Domain** (e.g., "user-experience", "payment-infrastructure", "core-platform")
- **Feature** (e.g., "traditional-auth", "wallet", "group-system")

Validate that \`docs/prd/{domain}/{feature}/epics/\` directory exists.

### Step 3: Validate Directory and File Names

**Directory Pattern**: \`epic.NUMBER.descriptive-name/\`
**Epic File Pattern**: \`epic.NUMBER.descriptive-name.md\`

**Rules**:
- Use DOTS not underscores
- Lowercase descriptive name
- Hyphens separate words in name
- .md extension for file
- Directory and filename must match (except .md extension)

### Step 4: Create Epic Directory Structure

Create nested subdirectory structure:

\`\`\`bash
mkdir -p docs/prd/{domain}/{feature}/epics/epic.{NUMBER}.{name}/stories/
touch docs/prd/{domain}/{feature}/epics/epic.{NUMBER}.{name}/epic.{NUMBER}.{name}.md
\`\`\`

**Example**:
\`\`\`bash
mkdir -p docs/prd/payment-infrastructure/wallet/epics/epic.323.secure-backup/stories/
touch docs/prd/payment-infrastructure/wallet/epics/epic.323.secure-backup/epic.323.secure-backup.md
\`\`\`

### Step 5: Create Epic File with YAML Frontmatter

Required YAML fields: epic_number, title, domain, status, priority, estimated_stories, created, target_completion.

Use template from \`/docs/templates/epic-template.md\`.

### Step 6: Update Epic Registry

Add entry to \`/docs/development/epic-registry.md\` sorted by epic number.

**Registry Entry Format**:
\`\`\`
| 323 | - | payment-infrastructure/wallet | epic.323.secure-backup | Epic 323: Secure Backup | NOT_STARTED | YYYY-MM-DD |
\`\`\`

## Resources

### Reference Documentation

- **epic-registry.md** - Central registry of all epic numbers and status
- **epic-template.md** - Template for new epic files with required YAML frontmatter

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-31
