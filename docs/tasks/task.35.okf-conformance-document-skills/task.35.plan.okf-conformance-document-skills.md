---
id: task.35.plan
title: "Implementation Plan: OKF v0.1 conformance for document skills"
type: plan
task-ref: task.35.okf-conformance-document-skills.md
---

# Implementation Plan: OKF v0.1 conformance for document skills

> Requirements and success criteria: [task.35.okf-conformance-document-skills.md](task.35.okf-conformance-document-skills.md)

## Overview

Additive frontmatter conformance to OKF v0.1 at the recommended-field level. Single source of truth is a new `shared/resources/open-knowledge-format.md`; templates, standards, and skills are aligned to it; review tooling enforces `type`. No existing `docs/` document is retrofitted.

## Phase-by-Phase Implementation Guide

### Phase 1: OKF mapping reference doc

**Files to create/modify:**
- `shared/resources/open-knowledge-format.md` (new) — edit the **source** here, never a bundled `references/` copy.
- `AGENTS.md` — add a subsection linking it.

**Doc contents (skeleton):**

```markdown
# Open Knowledge Format (OKF) conformance

This repo's document tooling targets **OKF v0.1** (`okf_version: "0.1"`).
Spec: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md

## What OKF requires / recommends
- Required: non-empty `type` in every non-reserved doc's YAML frontmatter.
- Recommended: `title`, `description`, `resource`, `tags`, `timestamp`.

## How repo fields map to OKF
| OKF field   | Repo field(s)                | Notes |
|-------------|------------------------------|-------|
| type        | type                         | epic/story/task/prd literal |
| title       | title                        | — |
| description | description                  | one-sentence summary |
| tags        | tags                         | optional YAML list |
| timestamp   | updated (fallback created)   | `updated` IS OKF's timestamp |
| resource    | resource, `github_url`/`jira_url`, or derived from `github_issue` | tracker URL for PM artifacts; tasks have a bare `github_issue` number → derive `{repo_url}/issues/{github_issue}` |

## Intentionally out of scope
- Reserved index.md / log.md per directory — registries + inline Change-Log tables serve this.
- Bundle-relative `/...` cross-links — repo uses relative + frontmatter refs.
- okf_version in a root index.md — declared here instead.
```

**AGENTS.md** — add near the "Status Lifecycle" / "File Naming" cluster:

```markdown
## Open Knowledge Format

Document frontmatter targets OKF v0.1. Canonical mapping + conformance:
[`shared/resources/open-knowledge-format.md`](./shared/resources/open-knowledge-format.md).
TL;DR: every doc carries a non-empty `type`; `description`/`tags` recommended;
`updated`≡OKF `timestamp`, tracker URL ≡ OKF `resource`.
```

### Phase 2: Standards updates

**Files:** `docs/standards/{epic,story,task,prd}-documents.md`

For **epic/story/task** (each already has a frontmatter schema table), add rows:

```markdown
| `description` | string  | Recommended | One-sentence summary (OKF `description`) |
| `tags`        | list    | Optional    | Short strings for cross-cutting categorization (OKF `tags`) |
| `resource`    | string  | Optional    | Canonical URI; PM artifacts may use `github_url`/`jira_url`, or (tasks) derive from `github_issue` (OKF `resource`) |
```

For **prd** — `prd-documents.md` has **no frontmatter schema table** (it documents body sections only). Author a new table at parity with the other three, mirroring the real `prd.onboarding.md` frontmatter, then include the OKF rows:

```markdown
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | `prd.{feature}` |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `prd` |
| `description` | string | Recommended | One-sentence summary (OKF `description`) |
| `mode` | literal | Yes | `greenfield` \| `brownfield` |
| `status` | enum | Yes | Status lifecycle value |
| `version` | string | Recommended | SemVer of the PRD |
| `created` | date | Yes | ISO 8601 |
| `tags` | list | Optional | OKF `tags` |
| `resource` | string | Optional | Canonical URI (OKF `resource`) |
```

Add a note under each table: "`updated` (ISO 8601) is this repo's OKF `timestamp`. See [`open-knowledge-format.md`](../../shared/resources/open-knowledge-format.md)." `epic-documents.md` already lists `type: epic` — keep it and ensure the template (Phase 3) matches.

### Phase 3: Template updates

**`docs/templates/epic-template.md`** — current YAML block lacks `type`. Change:

```yaml
# before
epic_number: N
title: "[Epic Name]"
domain: "[Domain]"
status: "📋 Planned"
# after
epic_number: N
title: "[Epic Name]"
type: epic
description: "[One-sentence summary of the epic]"
tags: []
domain: "[Domain]"
status: "📋 Planned"
```

**`skills/create-task/resources/task-template.md`** — replace the bold-line header
(`**Task ID**: TASK-[ID]` … `**Completed**:`) with a YAML frontmatter block:

```yaml
---
id: task.[ID]
title: "[TASK_TITLE]"
type: task
description: "[One-sentence summary]"
tags: []
category: refactoring  # refactoring | infrastructure | documentation | testing | other
status: draft
priority: Medium       # Critical | High | Medium | Low
created: YYYY-MM-DD
updated: YYYY-MM-DD
assignee: TBD
---
```

Keep the existing `## 1. Overview …` body below. Add a `**Status:** Draft` body line for the kebab↔Title-Case sync convention.

**Story & PRD frontmatter** — the emitted `type`/`description`/`tags` for stories and PRDs are produced by the **skill logic** (`create-story`, `create-prd`, `create-doc`) and the template `output` block, **not** by the `.yaml` template bodies. In `story-template.yaml`, `prd-tmpl.yaml`, and `brownfield-prd-tmpl.yaml`, the `type:` keys are the DSL **element-type** (`type: choice`, `type: bullet-list`) — do **not** edit those. Real PRDs already carry `type: prd` + `description` (see `docs/prd/onboarding/prd.onboarding.md`), confirming the emission path is the skill, not the template DSL. Make the `type`/`description`/optional `tags` additions in Phase 4 (create-* skills); use this phase only to confirm the `output` block doesn't need changes. Stories: confirm `create-story` emits `type: story` + `description`; add `tags` if absent.

### Phase 4: Emit in create-* skills

For `create-task`, `create-epic`, `create-story`, `create-prd`, `create-doc`: find the section in each SKILL.md that documents the generated frontmatter (e.g. create-task Section 4 "Document Generation") and update it so the listed/emitted fields include `type`, `description`, and optional `tags`. Where a skill says "Add status: 📋 Planned", extend to also set `type`/`description`.

### Phase 5: Validate in review-* skills

For `review-task`, `review-epic`, `review-story`, `review-prd`, `documentation-standards-validator`: locate the frontmatter-validation checklist and add:

- `type` present & non-empty → **Critical** (currently absent in review-epic + documentation-standards-validator).
- `description` present → **Important**.
- `tags` is a list / `resource` is a URI when present → **Optional**.

Mirror the existing severity-tier phrasing each skill already uses (Critical / Important / Optional or Critical / Major / Minor).

### Phase 6: Bundle + catalog + validate

```bash
npm run bundle                       # propagate shared/resources/open-knowledge-format.md into references/
npm run bundle                       # run again — expect NO diff (idempotence check)
npm run generate-catalog             # only if any SKILL.md description changed
python skills/create-skill/scripts/quick_validate.py skills/create-task   # repeat per touched skill
```

## Key Patterns and References

- **Bundle drift guard:** never edit bundled `references/` copies — `npm run bundle` reverts them from `shared/resources/`. (Repo-known failure mode.)
- **Status sync convention:** frontmatter `status:` is lowercase-kebab; body `**Status:**` is Title Case — update both together (`shared/resources/document-status-lifecycle.md`).
- **Additive only:** do not rename/remove `created`, `updated`, `github_url`, `jira_url`, `epic_number`, `id`. OKF requires consumers to tolerate extra keys.
- **Existing `type` users to mirror:** `docs/standards/{story,task,prd}-documents.md` already define `type`; copy their table phrasing for the epic standard + new rows.

## Testing Approach

- Scratch-create one doc of each type via the updated `create-*` skills; assert `type` non-empty + `description` present.
- Run each `review-*` skill against (a) a conformant doc and (b) a doc with `type` removed; confirm the second is flagged Critical.
- `npm run bundle` twice → second run is a no-op diff.
- `quick_validate.py` green for every touched skill.
- Confirm `git status` shows no changes under existing `docs/prd/**` or `docs/tasks/task.{1..34}` (no retrofit).
