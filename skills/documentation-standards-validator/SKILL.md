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

## Runnable lint/census (run this first)

This skill is a guidance checklist, but a **runnable** lint/census script now backs the mechanical checks. Run it to detect the defect classes below on demand (it is not a hard git-hook/CI gate — it surfaces failures for the agent to fix):

```bash
node docs/tasks/task.12.documentation-conventions-normalization-validator/scripts/lint-docs.mjs
```

It emits 7 findings against [`docs/development/documentation-conventions.md`](../../../docs/development/documentation-conventions.md): (1) status vocabulary, (2) frontmatter key completeness, (3) Change Log header, (4) FR-tag presence (warn), (5) registry⇔PRD Epic-List parity, (6) epic `estimated_stories` vs active story dirs, (7) stray `PROGRESS*.md` under epics. Exit non-zero on any error-level finding. Fixture tests: `node …/scripts/lint-docs.test.mjs`. Each check is independently toggleable (`--skip=4,7`).

When creating or reviewing a story/epic/task, run the linter on the corpus and fix any error it reports before finishing.

## File Naming Standards

### Use DOTS Not Underscores

**Rule**: Use dots to separate components, hyphens only within descriptive names.

\`\`\`
✅ CORRECT
epic.163.module-security.md
story.163.1.encryption-service.md
task.38.authservice-di-failure.md

❌ INCORRECT
epic_163_account_security.md // Underscores
epic-163-module-security.md // Hyphens instead of dots
Epic.163.AccountSecurity.md // Capitalization
\`\`\`

### Epic Filename Format

**Pattern**: \`epic.NUMBER.descriptive-name.md\`

\`\`\`
epic.163.module-security.md
epic.164.transaction-batching.md
epic.165.chat-encryption.md
\`\`\`

### Story Filename and Directory Format

**Pattern**: `epic.NUMBER.descriptive-name/stories/story.EPIC.STORY.descriptive-name/story.EPIC.STORY.descriptive-name.md`

**Rule**: Each story MUST be placed in its own self-named subdirectory within the epic's `stories` folder.

### Story Plan Filename Format

**Pattern**: `story.EPIC.STORY.plan.descriptive-name.md`

**Rule**: The plan file (if present) must be co-located in the story's subdirectory.

```
📁 epic.163.module-security/
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
title: Account Security Enhancement
type: epic
description: One-sentence summary of the epic
domain: Account
status: 🔄 In Progress
priority: High
estimated_stories: 8
created: 2025-12-31
target_completion: 2026-01-15

---

\`\`\`

**Required Fields**: epic_number, title, type, domain, status, priority, estimated_stories, created, target_completion (`description` recommended; `tags`/`resource` optional — see [OKF](#open-knowledge-format-okf-conformance))

### Story Frontmatter

> **Canonical schema:** see [`docs/development/documentation-conventions.md`](../../../docs/development/documentation-conventions.md) §4 + Appendix B. Story `status` is **kebab-case** (not emoji — emoji status is epics only), effort is `estimated_effort_hours`, and both `created` and `updated` are required.

## \`\`\`yaml

epic: epic.163.module-security
epic_number: 163
story_number: 1
title: Implement Mnemonic Encryption Service
type: story
description: One-sentence summary of the story
tags: [security, backend]
status: ready-for-development
priority: High
story_type: backend
risk_level: high
assignee: TBD
estimated_effort_hours: 5
created: 2025-12-31
updated: 2026-01-05
github_issue: 1234

---

\`\`\`

**Required Fields** (canon §4): epic, epic_number, story_number, title, type, description, tags, status (kebab-case: `draft`/`planned`/`ready-for-development`/`in-progress`/`ready-for-review`/`accepted`/`superseded`/`cancelled`), priority, story_type (`full-stack`/`backend`/`frontend`/`infra`/`engine`), risk_level, assignee, estimated_effort_hours, created, updated, github_issue (`tags`/`resource` per [OKF](#open-knowledge-format-okf-conformance))

## Open Knowledge Format (OKF) conformance

All document frontmatter targets [OKF v0.1](references/open-knowledge-format.md). Apply these severities when validating any epic, story, task, or PRD:

- **`type` present and non-empty → Critical.** OKF's one hard requirement; flag a missing or empty `type` as a Critical finding (this is the gate that `documentation-standards-validator` must now enforce).
- **`description` present (one-sentence summary) → Important.** Flag a missing `description` as Important.
- **`tags` is a YAML list (when present); `resource` is a valid URI (when present) → Optional.** Flag only when malformed. Absence is not a finding (`updated` ≡ OKF `timestamp`; tracker URL ≡ OKF `resource`).

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
- [ ] Correct pattern for plan files (story.E.S.plan.name.md) if present

### YAML Frontmatter

- [ ] All required fields present
- [ ] Correct field names (epic_number not epicNumber)
- [ ] `type` present and non-empty (OKF — Critical when missing)
- [ ] `description` present (OKF — Important when missing)
- [ ] `tags` (if present) is a list; `resource` (if present) is a URI (OKF — Optional)
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
