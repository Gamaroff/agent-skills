---
name: documentation-standards-validator
description: Validate documentation follows naming conventions with DOTS not underscores, YAML frontmatter requirements, and structural standards. Use when creating PRDs, epics, or stories, validating documentation structure, reviewing doc PRs, or auditing documentation consistency. Enforces epic.163.name.md format and status indicators.
---

# Documentation Standards Validator

Validate documentation files follow naming conventions, YAML frontmatter requirements, and structural standards.

## When to Use This Skill

Activate this skill when:

1. **Creating PRDs** - Validate structure and naming
2. **Creating epics** - Check filename format and YAML
3. **Creating stories** - Verify story numbering and format
4. **Reviewing documentation** - Audit against standards
5. **Migrating documentation** - Rename to proper format
6. **Auditing docs** - Find naming violations

## File Naming Standards

### Use DOTS Not Underscores

**Rule**: Use dots to separate components, hyphens only within descriptive names.

\`\`\`
✅ CORRECT
epic.163.wallet-security.md
story.163.1.encryption-service.md
task.38.authservice-di-failure.md

❌ INCORRECT
epic_163_wallet_security.md // Underscores
epic-163-wallet-security.md // Hyphens instead of dots
Epic.163.WalletSecurity.md // Capitalization
\`\`\`

### Epic Filename Format

**Pattern**: \`epic.NUMBER.descriptive-name.md\`

\`\`\`
epic.163.wallet-security.md
epic.164.transaction-batching.md
epic.165.chat-encryption.md
\`\`\`

### Story Filename and Directory Format

**Pattern**: `epic.NUMBER.descriptive-name/stories/story.EPIC.STORY.descriptive-name/story.EPIC.STORY.descriptive-name.md`

**Rule**: Each story MUST be placed in its own self-named subdirectory within the epic's `stories` folder.

```
📁 epic.163.wallet-security/
  📁 stories/
    📁 story.163.1.encryption-service/
      📄 story.163.1.encryption-service.md
    📁 story.163.2.biometric-auth/
      📄 story.163.2.biometric-auth.md
```

## YAML Frontmatter Requirements

### Epic Frontmatter

## \`\`\`yaml

epic_number: 163
title: Wallet Security Enhancement
domain: Wallet
status: 🔄 In Progress
priority: High
estimated_stories: 8
created: 2025-12-31
target_completion: 2026-01-15

---

\`\`\`

**Required Fields**: epic_number, title, domain, status, priority, estimated_stories, created, target_completion

### Story Frontmatter

## \`\`\`yaml

epic_number: 163
story_number: 1
title: Implement Mnemonic Encryption Service
status: ✅ Complete
priority: High
estimated_effort: 5
created: 2025-12-31
completed: 2026-01-05

---

\`\`\`

**Required Fields**: epic_number, story_number, title, status, priority, estimated_effort, created

## Status Indicators

### Standard Status Icons

\`\`\`
✅ Complete - Fully implemented and merged
🔄 In Progress - Active development
⚠️ Blocked - Waiting on dependencies
❌ Cancelled - No longer pursuing
📋 Planned - Not yet started
\`\`\`

### Usage in Documentation

\`\`\`markdown

## Implementation Status

- ✅ Mnemonic encryption service
- ✅ Biometric authentication
- 🔄 Secure storage integration
- 📋 PIN change flow
  \`\`\`

## Validation Checklist

### File Naming and Location

- [ ] Uses dots not underscores
- [ ] Lowercase descriptive names
- [ ] Hyphens only within names
- [ ] Correct pattern (epic.N.name.md or story.E.S.name.md)
- [ ] .md extension
- [ ] Stories are placed in self-named subdirectories (e.g., `story.1.1.name/story.1.1.name.md`)

### YAML Frontmatter

- [ ] All required fields present
- [ ] Correct field names (epic_number not epicNumber)
- [ ] Valid status indicator
- [ ] ISO dates (YYYY-MM-DD)
- [ ] Proper YAML syntax

### Structure

- [ ] Proper heading hierarchy (# → ## → ###)
- [ ] Status indicators used correctly
- [ ] Cross-references valid
- [ ] Code blocks formatted

## Resources

### Reference Documentation

- **prd-structure-guide.md** - PRD organization and structure standards
- **epic-template.md** - Epic template with YAML frontmatter
- **story-template.md** - Story template with YAML frontmatter

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-31
