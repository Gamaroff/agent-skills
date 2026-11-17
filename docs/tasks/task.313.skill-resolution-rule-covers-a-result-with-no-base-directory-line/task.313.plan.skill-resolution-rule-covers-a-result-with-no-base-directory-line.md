---
id: task.313.plan
title: "Implementation Plan: The skill-resolution rule covers a Skill result with no Base directory line"
type: plan
task-ref: task.313.skill-resolution-rule-covers-a-result-with-no-base-directory-line.md
---

# Implementation Plan: The skill-resolution rule covers a Skill result with no Base directory line

> Requirements and success criteria: [task.313.skill-resolution-rule-covers-a-result-with-no-base-directory-line.md](task.313.skill-resolution-rule-covers-a-result-with-no-base-directory-line.md)

## Overview

Add one paragraph to the rule document, regenerate the bundled copies, and add a CHANGELOG line. The engine does not change.

## Phase-by-Phase Implementation Guide

### Phase 1: Add the case and re-bundle

**Files to modify:**
- `shared/resources/skill-resolution.md` — add the paragraph directly after the table, before "A Skill call that returns "Unknown skill"".
- `CHANGELOG.md` — one line under `## [Unreleased]`, `### Added` or `### Changed`, citing (task 313).

**Exact changes:**

After the table in `shared/resources/skill-resolution.md`, add:

```markdown
**No `Base directory` line.** If the Skill result carries no `Base directory for this skill:` line, there is no identity to check, and an empty `--base-dir` only returns `usage`. Do not run the check. Treat the load as `unreadable`: log "skill `{skill-name}` loaded with no Base directory line — identity unchecked" in the Issues Log and proceed with the loaded copy.
```

Edit with the Edit tool, then run `npm run bundle` (it rewrites the three copies under `skills/develop-*/references/`). Do not edit the copies by hand: the bundler reverts hand edits.

## Key Patterns and References

- The `unreadable` row of the same table is the precedent: identity unknown, log and proceed.
- Inside `shared/resources/`, cite a sibling by bare filename, never the `shared/resources/<file>` literal (CLAUDE.md, Shared Resources). The new paragraph names no other file.

## Testing Approach

- `npm run bundle:check` → 0 problems.
- `./node_modules/.bin/prettier --check shared/resources/skill-resolution.md CHANGELOG.md`.
- `CI=true npm run test:remote` on the LAN server (fast gate). The link corpus test reads the rule document.
- Mutation proof does not apply: the change is prose and the engine is untouched.
