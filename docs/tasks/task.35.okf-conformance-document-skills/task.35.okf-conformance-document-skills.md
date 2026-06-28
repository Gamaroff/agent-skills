---
id: task.35
title: "Conform document skills, templates, and standards to the Open Knowledge Format (OKF) v0.1"
type: task
description: "Bring create-*/review-* skills, document templates, and docs/standards into recommended-field OKF v0.1 conformance (type, description, tags, mapped timestamp/resource), going-forward only."
tags: [okf, documentation, standards, frontmatter, skills, interoperability]
category: documentation
priority: Medium
status: ready-for-review
created: 2026-06-28
updated: 2026-06-28
assignee: TBD
estimated_effort_hours: 8
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
source_plan: task.35.plan.okf-conformance-document-skills.md
github_issue: 162
---

# [Task 35] Conform document skills, templates, and standards to the Open Knowledge Format (OKF) v0.1

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.35.review.1.okf-conformance-document-skills.md` implemented 2026-06-28
**GitHub Issue**: [#162](https://github.com/Gamaroff/agent-skills/issues/162)

---

## 1. Overview

Bring this repo's document-creation and review tooling into conformance with the **Open Knowledge Format (OKF) v0.1** — a vendor-neutral standard from Google Cloud that represents knowledge as a directory of markdown files with YAML frontmatter, portable across tools and readable by both humans and AI agents ([SPEC](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md), [blog](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)).

The repo is already substantially OKF-shaped (markdown + YAML frontmatter, a `type` field defined in most standards), but the **templates lag behind the standards** and several recommended OKF fields are absent. This task closes the gaps at the **recommended-field** level.

**Scope**: Skills (`create-*`/`review-*` + `documentation-standards-validator`), document templates, and `docs/standards/` — going forward only. No backfill of existing `docs/` documents.

**Key deliverables**:
1. Every document template emits a non-empty `type` in YAML frontmatter (OKF's one hard requirement).
2. `description` + optional `tags` added to epic/story/task schemas, templates, and emitting/validating skills.
3. A single OKF mapping reference doc (`shared/resources/open-knowledge-format.md`) documenting conformance, the `updated`≡`timestamp` and `github_url`/`jira_url`≡`resource` mappings, and intentional out-of-scope items.

**Expected outcome**: All newly created epics, stories, tasks, and PRDs are OKF v0.1 conformant, and the review tooling enforces it — without disrupting the repo's existing registry and Change-Log conventions.

---

## 2. Motivation

### Current Problems

1. **`type` is not reliably emitted.** `docs/standards/epic-documents.md` requires `type: epic`, but `docs/templates/epic-template.md` and real epics omit it — failing OKF's single hard requirement and the repo's own schema.
2. **The task template emits no YAML frontmatter at all.** `skills/create-task/resources/task-template.md` uses bold-line headers (`**Task ID**:`, `**Status**: 📋 Planned`) instead of a YAML block — structurally non-conformant.
3. **No `description` on epic/story/task.** Only PRD carries a frontmatter `description`; OKF recommends a one-sentence summary per concept (it is what consumers and agents index on).
4. **No `tags` anywhere.** OKF recommends `tags` for cross-cutting categorization; the repo has no equivalent.
5. **`timestamp` / `resource` unmapped.** The repo uses `created`/`updated` and `github_url`/`jira_url`, which cover OKF's `timestamp`/`resource` intent, but the equivalence is undocumented, so conformance is ambiguous.

### Benefits of Solution

1. **Portability & interoperability** — repo knowledge becomes consumable by any OKF-aware tool or agent without bespoke adapters.
2. **Dog-fooding** — the repo practices the documentation standard it teaches.
3. **Better agent retrieval** — a guaranteed `description` + `tags` improves how agents select and route documents.
4. **Self-consistency** — eliminates the template-vs-standard drift (notably epic `type` and the task template's missing frontmatter).
5. **Low blast radius** — recommended-field adoption avoids the invasive restructure (per-directory `index.md`/`log.md`, bundle-relative links) that would fight existing conventions.

---

## 3. Technical Background

### OKF v0.1 essentials (the target)

- **Required:** non-empty `type` in every non-reserved doc's YAML frontmatter.
- **Recommended:** `title`, `description` (one sentence), `resource` (URI of the asset), `tags` (YAML list), `timestamp` (ISO 8601 of last meaningful change).
- **Reserved / strict features (intentionally out of scope here):** `index.md` / `log.md` reserved filenames, bundle-relative `/...` cross-links, `okf_version` in a root `index.md`.

### Current vs Target frontmatter (per document type)

| Field | OKF role | Epic now | Story now | Task now | PRD now | Target (all) |
|---|---|---|---|---|---|---|
| `type` | **required** | missing in template/real | present | missing in template | present | **emitted by every template** |
| `title` | recommended | present | present | present | present | unchanged |
| `description` | recommended | absent | absent | absent | present | **added to epic/story/task** |
| `tags` | recommended | absent | absent | absent | absent | **added (optional) to all four** |
| `timestamp` | recommended | `updated` | `updated` | `updated` | — | keep `updated`, **document mapping** |
| `resource` | recommended | `github_url` / `jira_url` | `github_url` / `jira_url` | `github_issue` (number) / `jira_url` | — | **optional field + documented mapping (both forms)** |

### Important clarifications

- OKF is intentionally **permissive**: consumers must tolerate unknown types, unknown keys, missing optional fields, and broken links. Adoption here is additive — no existing field is removed or renamed.
- The repo's `created`/`updated` pair is richer than OKF's single `timestamp`; we keep it and define `updated` as OKF's `timestamp`. We do **not** add a duplicate `timestamp` field.
- `resource` is aimed at data assets (tables, metrics). For PM artifacts the natural value is the tracker URL. The mapping covers **both forms**: where a URL field exists (`github_url`/`jira_url` on epics/stories) it is the `resource`; where only a bare issue number exists (`github_issue` on tasks, e.g. this task's `github_issue: 162`) the `resource` is derived as `{repo_url}/issues/{github_issue}`. The optional explicit `resource` field is offered for cases that need an override, and both forms are documented in `open-knowledge-format.md`.

---

## 4. Scope

### In Scope

- ✅ `docs/templates/epic-template.md` — add `type: epic`, `description`, optional `tags` to the YAML block.
- ✅ `skills/create-task/resources/task-template.md` — convert bold-line header into a YAML frontmatter block (`type: task`, `description`, optional `tags`, plus existing fields).
- ✅ Story + PRD frontmatter (`type`, `description`, `tags`) — added/confirmed in the **emitting skill logic** (`create-story`/`create-prd`/`create-doc`) and/or the template `output` block. Note: in `story-template.yaml`, `prd-tmpl.yaml`, and `brownfield-prd-tmpl.yaml` the `type:` keys are the DSL **element-type** (`type: choice`, `type: bullet-list`), **not** OKF frontmatter — do not edit those.
- ✅ `docs/standards/{epic,story,task,prd}-documents.md` — add `description`/`tags`/`resource` schema rows; note `updated`≡`timestamp`; link the OKF doc.
- ✅ New `shared/resources/open-knowledge-format.md` mapping/conformance doc; link from `AGENTS.md` and each standard.
- ✅ `create-task`, `create-epic`, `create-story`, `create-prd`, `create-doc` — emit the new fields.
- ✅ `review-task`, `review-epic`, `review-story`, `review-prd`, `documentation-standards-validator` — validate the new fields.
- ✅ Re-bundle (`npm run bundle`) and regenerate catalog if SKILL.md descriptions change.

### Out of Scope

- ❌ Retrofitting existing `docs/` epics/stories/tasks/PRDs (migrate naturally when touched).
- ❌ Reserved `index.md`/`log.md` per directory; bundle-relative `/...` cross-links; per-bundle `okf_version` in a root `index.md` — the existing registries + inline Change-Log tables already serve these needs.
- ❌ Any runtime/source code outside the document tooling.
- ❌ Renaming or removing existing frontmatter fields.

---

## 5. Breaking Changes

**None — additive only.** All new fields (`description`, `tags`, `resource`) are recommended/optional and OKF requires consumers to tolerate their absence. Existing fields are unchanged.

The one behavioural change is in the **review tooling**: `type` becomes a **Critical** validation finding when missing (epic + `documentation-standards-validator` currently don't enforce it). This is a documentation-quality gate, not a code interface.

- **Before:** `review-epic` / `documentation-standards-validator` pass an epic with no `type`.
- **After:** missing `type` is reported as Critical; missing `description` as Important; malformed `tags`/`resource` as Optional.
- **Migration path:** existing docs are not retrofitted; the new gate applies to docs created/edited under the updated skills. When an old epic is next reviewed, the reviewer adds `type: epic` as a one-line fix.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.35.plan.okf-conformance-document-skills.md](task.35.plan.okf-conformance-document-skills.md)

### Phase 1: OKF mapping reference doc (Low risk)

**Files:** `shared/resources/open-knowledge-format.md` (new), `AGENTS.md`

- [x] Author `shared/resources/open-knowledge-format.md`: OKF v0.1 summary, conformance statement (`okf_version: "0.1"`), field-mapping table (`updated`→`timestamp`, `github_url`/`jira_url`→`resource`), and out-of-scope items with rationale.
- [x] Add an "Open Knowledge Format" subsection to `AGENTS.md` linking the new doc.

### Phase 2: Standards updates (Low risk)

**Files:** `docs/standards/{epic,story,task,prd}-documents.md`

- [x] **epic/story/task:** add `description`, `tags`, `resource` rows to the existing frontmatter schema table.
- [x] **prd:** `prd-documents.md` has **no frontmatter schema table** today (it documents body sections only). Author a new frontmatter schema table at parity with the other three standards — rows mirroring the real `prd.onboarding.md` frontmatter (`name`, `title`, `type`, `description`, `mode`, `status`, `version`, `created`, plus the new `tags`, `resource`) — then include the OKF rows.
- [x] Note the `updated`≡`timestamp` mapping and link `open-knowledge-format.md`.
- [x] Reconcile `epic-documents.md` (already lists `type: epic`) with the epic template fix in Phase 3.

### Phase 3: Template updates (Medium risk — structural)

**Files:** `docs/templates/epic-template.md`, `skills/create-task/resources/task-template.md`, `skills/create-story/resources/story-template.yaml`, PRD templates

- [x] `epic-template.md` — add `type: epic`, `description`, optional `tags` to the YAML block.
- [x] `task-template.md` — replace bold-line header with a YAML frontmatter block (`id`, `title`, `type: task`, `description`, optional `tags`, `category`, `status`, `priority`, `created`, `updated`, `assignee`).
- [x] Story + PRD frontmatter — add/confirm `type`, `description`, optional `tags` in the **emitting skill logic** (`create-story`/`create-prd`/`create-doc`) and/or the template `output` block. **Do not** edit the DSL `type:` element-type keys inside `story-template.yaml`/`prd-tmpl.yaml`/`brownfield-prd-tmpl.yaml` — those are section structure, not frontmatter. (This overlaps Phase 4; cross-reference rather than duplicate.)

### Phase 4: Emit in create-* skills (Medium risk)

**Files:** `skills/create-task`, `create-epic`, `create-story`, `create-prd`, `create-doc` (SKILL.md + resources)

- [x] Update generation instructions so emitted frontmatter includes `type`, `description`, optional `tags`.

### Phase 5: Validate in review-* skills (Medium risk)

**Files:** `skills/review-task`, `review-epic`, `review-story`, `review-prd`, `documentation-standards-validator`

- [x] Add checks: `type` present & non-empty (Critical), `description` present (Important), `tags`/`resource` well-formed if present (Optional).
- [x] Ensure `review-epic` + `documentation-standards-validator` enforce `type`.

### Phase 6: Bundle + catalog + validate (Low risk)

**Files:** generated `references/`, `docs/reference/skill-catalog.md`

- [x] Edit only `shared/resources/` sources, then run `npm run bundle`.
- [x] `npm run generate-catalog` if any SKILL.md `description` changed.
- [x] `python skills/create-skill/scripts/quick_validate.py skills/<name>` for each touched skill.

---

## 7. Files Summary

**Documentation / standards:**
1. ✅ `shared/resources/open-knowledge-format.md` — NEW OKF mapping + conformance doc
2. ✅ `AGENTS.md` — link the OKF doc
3. ✅ `docs/standards/epic-documents.md` — schema rows + mapping note
4. ✅ `docs/standards/story-documents.md` — schema rows + mapping note
5. ✅ `docs/standards/task-documents.md` — schema rows + mapping note
6. ✅ `docs/standards/prd-documents.md` — schema rows + mapping note

**Templates:**
7. ✅ `docs/templates/epic-template.md` — add `type`/`description`/`tags`
8. ✅ `skills/create-task/resources/task-template.md` — convert to YAML frontmatter
9. ✅ `skills/create-story/resources/story-template.yaml` — confirm/extend
10. ✅ PRD templates (`skills/prd-template/resources/prd-tmpl.yaml`, `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml`) — confirm/extend

**Skills (emit):**
11. ✅ `skills/create-task/SKILL.md`, `create-epic`, `create-story`, `create-prd`, `create-doc`

**Skills (validate):**
12. ✅ `skills/review-task/SKILL.md`, `review-epic`, `review-story`, `review-prd`, `documentation-standards-validator`

**Generated (rebuilt, not hand-edited):**
13. ✅ each skill's `references/open-knowledge-format.md` (via `npm run bundle`)
14. ✅ `docs/reference/skill-catalog.md` (via `npm run generate-catalog`, if descriptions change)

---

## 8. Testing Strategy

**Validation (primary):**
- Scope: created-doc conformance + reviewer enforcement.
- Actions: create a throwaway epic/story/task/PRD via each `create-*` skill in a scratch dir; assert frontmatter contains non-empty `type` and a `description`; run each `review-*` skill and confirm a missing `type` is reported Critical and missing `description` Important.
- Command: `python skills/create-skill/scripts/quick_validate.py skills/<name>` for every touched skill.

**Bundle integrity:**
- Run `npm run bundle`; confirm `open-knowledge-format.md` lands in each consuming skill's `references/` and path rewrites are applied; re-run to confirm idempotence (no diff).

**Catalog:**
- Run `npm run generate-catalog`; confirm no unexpected diff beyond intended description changes.

**Regression (existing docs):**
- Confirm existing `docs/` documents are untouched (no retrofit) and `review-*` does not hard-fail historical docs lacking the new fields beyond the intended Critical `type` finding.

**Eval suite:**
- Run the hermetic eval layers for any skill with fixtures touched (`npm run eval:*` as applicable).

---

## 9. Success Criteria

**FUNCTIONAL:**
- [x] Every document template (`epic`, `story`, `task`, `prd`) emits a non-empty `type` in YAML frontmatter.
- [x] `task-template.md` uses a YAML frontmatter block (no bold-line header metadata).
- [x] Epic/story/task templates emit a `description`; `tags`/`resource` documented as optional.
- [x] `review-epic` and `documentation-standards-validator` enforce `type` (Critical when missing).
- [x] No existing `docs/` document is modified by this task (going-forward only).

**QUALITY:**
- [x] `open-knowledge-format.md` exists in `shared/resources/`, is linked from `AGENTS.md` and all four standards, and states `okf_version: "0.1"` + the `timestamp`/`resource` mappings.
- [x] `npm run bundle` is idempotent (second run = no diff) and all referenced skills carry the bundled OKF doc.
- [x] `python skills/create-skill/scripts/quick_validate.py` passes for every touched skill.

**MIGRATION:**
- [x] CHANGELOG `[Unreleased]` notes the OKF conformance change.
- [x] The mapping doc explains how old docs migrate (add `type` on next review) and what is intentionally out of scope.

**SELF-CONSISTENCY (dog-food):**
- [x] This task document and its plan file are themselves OKF-conformant (both carry a non-empty `type`).

---

## 10. Risk Assessment

**MEDIUM RISK**

1. **Template-vs-standard drift reappears.** Editing templates without aligning standards (or vice-versa) re-introduces the very inconsistency this task fixes.
   - Probability: Medium · Impact: Medium
   - Mitigation: Phases 2 and 3 are co-dependent; the OKF doc is the single source of truth both reference. Phase 5 reviewers enforce the result.
2. **Bundle drift.** Editing bundled `references/` instead of `shared/resources/` sources causes `npm run bundle` to silently revert the fix (known repo failure mode).
   - Probability: Medium · Impact: Medium
   - Mitigation: Phase 6 mandates editing sources only; verify idempotent re-bundle.

**LOW RISK**

3. **Over-strict reviewers reject legacy docs.** Making `description`/`tags` Critical (instead of Important/Optional) would hard-fail historical documents.
   - Probability: Low · Impact: Medium
   - Mitigation: Only `type` is Critical; `description` is Important; `tags`/`resource` Optional. No retrofit required.
4. **OKF spec evolves past v0.1.** Field names could change.
   - Probability: Low · Impact: Low
   - Mitigation: Conformance is pinned to `okf_version: "0.1"` in the mapping doc; future bumps are a follow-up task.

---

## 11. Rollback Plan

**IMMEDIATE ROLLBACK (< 1 hour):**
- Triggers: `npm run bundle` non-idempotent or corrupts skill `references/`; `quick_validate.py` fails for a touched skill; reviewers begin hard-failing many legacy docs.
- Steps: `git revert` the task's commit(s); re-run `npm run bundle` + `npm run generate-catalog` to restore generated artifacts; confirm `git status` clean.
- Validation: existing `create-*`/`review-*` skills validate cleanly and produce documents as before.

**PARTIAL ROLLBACK (1–2 hours):**
- When to use: only the reviewer changes (Phase 5) cause friction.
- Steps: revert Phase 5 skill edits (keep templates/standards/OKF doc), re-bundle.

**FORWARD FIX:**
- When to use: minor field-naming or wording issues in the OKF doc or a single template.
- Approach: edit the `shared/resources/` source, re-bundle — no revert needed.

**ROLLBACK TRIGGERS:**
- Critical: broken bundle pipeline or skill validation failure.
- Non-critical: cosmetic wording, mapping-table tweaks → fix forward.

---

## QA Artifacts (created later)

- QA report: `task.35.qa.[number].okf-conformance-document-skills.md`
- Bug reports (if any): `task.35.bug.[N].[name].md`
- Quality gate: `task.35.gate.[number].okf-conformance-document-skills.yml`
