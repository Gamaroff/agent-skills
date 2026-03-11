---
name: review-epic
description: "Deep interactive epic review that checks template compliance, detects
  scope overlap with existing epics, validates against architecture docs, and scans
  the codebase for already-implemented features. Produces a co-located review report
  or inline action plan. Use before writing stories to catch structural, duplication,
  and conflict problems early."
---

# Review Epic

## When to Use This Skill

Use this skill when:

- An epic has just been created and needs pre-story validation
- You want to catch scope overlap with other epics **before** writing stories
- You need to verify the epic conforms to the template structure
- You want to check for already-implemented features in the codebase
- You suspect conflicts with architecture documentation
- You need to check existing stories drift from the epic's stated deliverables

Natural language triggers:

- "Review epic 180"
- "Check this epic for conflicts"
- "Is this epic well-formed?"
- "Review the epic before we write stories"
- "Validate epic 276 against architecture"
- "Check epic for registry overlap"
- "Pre-story review on this epic"

## Purpose

To conduct a comprehensive, **interactive** pre-story review of an epic document, detecting:

- **Template gaps**: Missing or incomplete sections vs. `docs/templates/epic-template.md`
- **Registry conflicts**: Scope overlap or duplicate deliverables with other epics
- **Architecture violations**: Contradictions with `.claude/*.md` docs and routing/naming conventions
- **Codebase duplication**: Features the epic plans to build that already exist
- **Story drift**: Existing stories that diverge from the epic's stated deliverables

**CRITICAL - Anti-Hallucination Rules**:

- Every conflict citation MUST reference an actual file path and section
- Never invent architecture violations — cite the specific doc and line
- When Glob/Grep finds nothing, explicitly state "No existing implementation found"
- Registry overlap MUST quote the conflicting epic's actual title and number

---

## Required Inputs

```yaml
required:
  - epic: Path to epic file, epic number (e.g. "180"), or natural language name

optional:
  - output_mode: "report" | "inline"  # if omitted, ask user in Step 0
  - focus_areas: Specific areas to concentrate on (e.g., "registry conflicts only")
```

---

## 10-Step Workflow

### Step 0 — Determine Output Mode

**Purpose**: Choose between async review report or immediate action plan.

Use `AskUserQuestion`:

```yaml
question: 'How would you like the review output delivered?'
header: 'Output Mode'
options:
  - label: 'Co-located report'
    description: 'Save a review-report.md alongside the epic file for async review and future reference.'
  - label: 'Inline action plan'
    description: 'Present prioritised recommendations immediately as numbered steps to action now.'
```

Store choice as `output_mode` for Step 9.

---

### Step 1 — Load Epic & Reference Documents

**Purpose**: Establish all context needed for the review.

**Actions** (run in parallel where possible):

1. **Locate epic file**
   - Accept: absolute path, epic number (e.g. `180`), or descriptive name
   - Search pattern: `docs/prd/**/epics/epic.[N].*/epic.[N].*.md`
   - If ambiguous, list candidates and ask user to confirm

2. **Load core references**
   - `docs/templates/epic-template.md` — template compliance baseline
   - `docs/development/epic-registry.md` — registry conflict detection
   - `docs/development/epic-creation-checklist.md` — creation rules

3. **Load architecture docs** (all in parallel)
   - `.claude/backend-patterns.md`
   - `.claude/database-redis.md`
   - `.claude/testing.md`
   - `docs/architecture/routing-and-file-structure.md`
   - `docs/development/naming-conventions.md`
   - `.claude/notifications.md` (if epic touches notifications)

4. **Scan for existing stories**
   - Glob: `docs/prd/**/epics/epic.[N].*/stories/*.md`
   - Read each story found

**Output**: Full context package ready for analysis.

---

### Step 2 — Template Structure Compliance Review

**Purpose**: Verify the epic contains every required section from the template.

Score each section: ✅ Complete | ⚠️ Partial | ❌ Missing

**Required sections to check**:

| Section | Checks |
|---------|--------|
| YAML Frontmatter | `title`, `prd_source`, `epic_type`, `priority`, `estimated_sprints`, `dependencies`, `status`, `completion_percentage` all present and valid values |
| Epic Goal | Single clear statement (1-2 sentences), measurable, outcome-focused |
| Background & Context | PRD source linked, system integration listed, prerequisites with status |
| Epic Description | Primary deliverables list, Out of Scope explicitly stated, Success Criteria with ≥3 measurable items |
| Stories Breakdown | ≥1 story defined, user story format ("As a / I want / So that"), ACs present |
| Technical Architecture | Components, DB changes, API changes sections present |
| Dependencies | Blocks and Blocked-by with epic references, parallel opportunities |
| Risks & Mitigation | ≥1 risk with probability, impact, mitigation, and owner |
| Testing Strategy | Unit, integration, and manual testing sections present |
| Definition of Done | Story Completion, Code Quality, Testing, Integration, Documentation, Deployment, Acceptance categories |
| Estimated Timeline | Planning, Development, Testing phases with totals |

**Also check**:
- No unfilled placeholders: `[N]`, `[Epic Name]`, `[Description]`, `YYYY-MM-DD`, `[Team]`
- YAML `dependencies` list matches `blocked_by` field (if present)
- Epic number in filename matches `title` field
- File naming: `epic.[N].[kebab-name]/epic.[N].[kebab-name].md` (DOTS.md convention)

**Collect all issues** — do NOT ask questions yet. Proceed to Step 3.

---

### Step 3 — Epic Registry Conflict Detection

**Purpose**: Detect scope overlap, duplication, and dependency errors against the registry.

**Actions**:

1. Read full `docs/development/epic-registry.md`
2. Extract this epic's domain, title, and primary deliverables
3. For every other epic in the registry:
   - Compare titles for near-duplicates (semantic overlap, not just exact string match)
   - Compare deliverables: flag if same feature/service/endpoint appears in both
   - Check dependency references: every epic listed in `dependencies` or `blocked_by` must exist in the registry
4. Verify this epic's registry entry exists and matches the file content (title, status, domain)
5. Verify epic number uniqueness (no two epics share the same number)

**Flag categories**:
- **Exact duplicate**: Same deliverable described identically
- **Partial overlap**: Overlapping feature domain (e.g., both epics create a "ContactService")
- **Dependency mismatch**: References an epic number that doesn't exist in registry
- **Missing registry entry**: This epic has no entry in the registry
- **Stale registry entry**: Registry entry contradicts the epic file (status, title mismatch)

**Collect all issues** — do NOT ask questions yet. Proceed to Step 4.

---

### Step 4 — Architecture & Codebase Conflict Detection

**Purpose**: Catch planned features that violate architecture rules or already exist in the codebase.

**Actions**:

1. **API endpoint validation** — for each new endpoint the epic plans:
   - Check against `.claude/backend-patterns.md` versioning rules
   - Grep codebase for existing route: `apps/goji-api/src/**/*.controller.ts`
   - Validate naming: `@Controller({ path: '...', version: '...' })` pattern

2. **Service/module duplication check** — for each service/module planned:
   - Glob: `apps/goji-api/src/**/*[service-name]*.ts`
   - Grep: `export class [ServiceName]Service`
   - If found: note file path and what it already implements

3. **Frontend component duplication check** — for each UI component planned:
   - Glob: `apps/goji-wallet/**/*[component-name]*`
   - If found: note file path

4. **BSV constraint check** — if epic touches wallet/payments:
   - Verify no references to: SegWit, P2WPKH, P2WSH, P2TR, Bech32, Cashaddr, RBF
   - Verify: only Legacy addresses (P2PKH, P2SH), Base58 encoding, OP_RETURN

5. **Platform separation check** — if epic touches shared libs:
   - Verify client/server separation is planned for `logging-lib`, `auth-lib`, `shared-utils`
   - No Node.js deps (bcrypt, winston, jsonwebtoken) referenced for client builds

6. **Naming convention check** against `docs/development/naming-conventions.md`:
   - Route names: kebab-case
   - Components: PascalCase
   - "handle" not "username" for user identity

7. **Routing/structure check** against `docs/architecture/routing-and-file-structure.md`:
   - Expo Router file conventions
   - Feature-first directory layout

**For each codebase search**:
- State result explicitly: either file path found, or "No existing implementation found for [X]"

**Collect all issues** — do NOT ask questions yet. Proceed to Step 5.

---

### Step 5 — Existing Story Drift Analysis

**Purpose**: If stories already exist under this epic, check they align with the epic's deliverables.

**Skip this step** if no stories found in Step 1.

**Actions**:

1. For each existing story, check:
   - Does the story implement a deliverable stated in the epic?
   - Does the story's scope stay within the epic's "What We're Building" section?
   - Do the story's ACs align with the epic's Success Criteria?
   - Are there story features that appear in the epic's "Out of Scope" section?

2. Build a **Story Coverage Matrix**:

| Epic Deliverable | Covered By Story | Gap? |
|-----------------|-----------------|------|
| [Deliverable 1] | story.N.1.name | ✅ |
| [Deliverable 2] | — | ❌ No story |
| [Out of Scope item] | story.N.3.name | ⚠️ Scope creep |

**Collect all issues** — proceed to QUESTION POINT 1.

---

### QUESTION POINT 1 — Structure & Epic Context (batched, max 4 questions)

**Trigger**: After completing Steps 2–5 analysis.

**Ask questions about**:
- Critical missing sections from Step 2 (if multiple, batch into one multi-select)
- Ambiguous scope boundaries that need clarification before registry/arch analysis
- "Out of Scope" items that may be intentional vs. accidental gaps
- Dependencies referencing non-existent epic numbers (confirm correct number)

**Format**: Use `AskUserQuestion` with max 4 questions in one call. Use `multiSelect: true` for "which sections are missing by design?" type questions.

**After answers**: Update issue severity based on user's clarifications. Proceed to QUESTION POINT 2.

---

### QUESTION POINT 2 — Technical & Conflict Clarifications (batched, max 4 questions)

**Trigger**: After compiling all findings from Steps 3, 4, 5.

**Ask questions about**:
- Registry overlaps: intentional fork or oversight? (provide the conflicting epic title and number)
- Codebase duplication: extend existing implementation vs. create separate feature?
- Architecture violations: confirm intended deviation or needs updating?
- Dependency chain issues: is the blocked-by order correct?

**Example questions**:

```yaml
question: "Epic 180 plans to create a ContactService, but Epic 169 already implements ContactValidationService in libs/contact-lib. Should Epic 180 extend that service or create a separate one?"
header: 'ContactService'
options:
  - label: 'Extend Epic 169 service'
    description: 'Add new methods to the existing ContactValidationService. Avoids duplication.'
  - label: 'Create separate service'
    description: 'New ContactService with distinct responsibility. Requires clear boundary definition.'
  - label: 'Merge epics'
    description: 'Epic 180 scope belongs in Epic 169. Fold deliverables there instead.'
```

**After answers**: Proceed to Step 6.

---

### Step 6 — Consistency & Internal Conflict Check

**Purpose**: Cross-reference within the epic for internal contradictions.

**Checks**:

1. **Stories vs. ACs**: Do the stories cover all acceptance criteria in "Success Criteria"? Flag uncovered criteria.
2. **YAML `dependencies` vs. `blocked_by`**: Must match exactly.
3. **Timeline vs. `estimated_sprints`**: Does the Development Phase sprint count equal YAML `estimated_sprints`?
4. **Out of Scope vs. Stories**: Do any existing stories implement items listed as out of scope?
5. **Deliverables vs. Stories**: Every primary deliverable should map to ≥1 story (or be flagged as unmapped).
6. **Risk coverage**: Are all high-risk stories in the Stories Breakdown also mentioned in Risks & Mitigation?

---

### Step 7 — Quality & Clarity Assessment

**Purpose**: Score the epic on 6 dimensions.

Score each dimension 1–5:

| Dimension | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|-----------|----------|--------------|---------------|
| **Template Compliance** | Multiple missing sections | Most sections present | All sections complete, no placeholders |
| **Registry Integrity** | Not in registry or wrong number | In registry but stale | Registry entry accurate and current |
| **Architecture Alignment** | Multiple violations | Minor deviations | Fully compliant with all arch docs |
| **Scope Clarity** | Vague deliverables, no out-of-scope | Deliverables listed, out-of-scope sparse | Crystal clear deliverables and explicit exclusions |
| **Dependency Accuracy** | Invalid epic references | All exist but direction wrong | All valid, bidirectional, and documented |
| **Story Coverage** | Deliverables unmapped | Partial mapping | All deliverables mapped to stories |

**Overall score**: Average of 6 dimensions. Interpret as:
- 4.5–5.0: Excellent — proceed to story writing
- 3.5–4.4: Good — minor fixes recommended
- 2.5–3.4: Fair — significant gaps, fix before stories
- 1.0–2.4: Poor — major rework needed

**Epic Split Detection** — flag if ANY of:
- More than 8 stories defined
- `estimated_sprints` > 4
- Deliverables span more than 2 distinct feature domains (e.g., payments + notifications + UI)

If flagged: recommend splitting into sub-epics and suggest how to divide the scope.

---

### QUESTION POINT 3 — Quality & Final Clarifications (batched, max 4 questions)

**Trigger**: After Step 7 scoring.

**Ask questions about**:
- Epic split recommendation (confirm if scope is intended to be large or should be divided)
- Priority/timeline concerns discovered during review
- Any remaining ambiguities before generating output
- Whether to update the YAML `status` and add `last_reviewed` field now

---

### Step 8 — Conflict Recommendations

**Purpose**: For every issue found, produce a specific, actionable recommendation.

**Recommendation format**:

```
**Issue**: [Clear description of the problem]
**Location**: [File path + section/line]
**Severity**: Critical | Major | Minor
**Recommendation**: [Specific action to take]
**Reference**: [Exact doc/file that defines the correct approach]
```

**By issue type**:

| Issue Type | Recommendation Approach |
|-----------|------------------------|
| Registry overlap | Suggest merge, scope reduction, or explicit differentiation with different wording |
| Codebase duplication | Reference the existing file path, suggest extend vs. create new with justification |
| Architecture violation | Cite the specific `.claude/*.md` doc and section, provide the compliant alternative |
| Template gap | Quote the exact template section header and provide example content |
| Internal contradiction | Show both conflicting statements, propose resolution |
| Epic split needed | Suggest two or more sub-epic scope boundaries with story assignments |

---

### Step 9 — Generate Output

**Option A — Co-located Report**:

Save to: `docs/prd/[domain]/[feature]/epics/epic.[N].[name]/epic.[N].[name]-review-report.md`

**Report structure**:

```markdown
# Epic Review Report: Epic [N] — [Epic Name]

**Review Date**: YYYY-MM-DD
**Reviewer**: Claude (review-epic skill)
**Output Mode**: Report
**Epic File**: [relative path to epic file]

---

## Executive Summary

**Overall Score**: [X.X / 5.0] — [Excellent | Good | Fair | Poor]
**Critical Issues**: [N]
**Major Issues**: [N]
**Minor Issues**: [N]
**Total Recommendations**: [N]
**Story Writing Readiness**: ✅ Ready | ⚠️ Fix First | ❌ Major Rework Needed

---

## Score Card

| Dimension | Score | Notes |
|-----------|-------|-------|
| Template Compliance | [X/5] | [brief note] |
| Registry Integrity | [X/5] | [brief note] |
| Architecture Alignment | [X/5] | [brief note] |
| Scope Clarity | [X/5] | [brief note] |
| Dependency Accuracy | [X/5] | [brief note] |
| Story Coverage | [X/5] | [brief note] |
| **Overall** | **[X/5]** | |

---

## Critical Issues (Must Fix Before Story Work)

[List each critical issue with file + section reference and recommendation]

---

## Major Issues (High Priority Fixes)

[List each major issue]

---

## Minor Issues / Suggestions

[List each minor issue]

---

## Conflict Analysis

### Registry Conflicts
[Per-conflict findings: quote conflicting epic title, number, and specific deliverable overlap]

### Codebase Duplication
[Per-duplicate: file path found, what it implements, recommended action]

### Architecture Violations
[Per-violation: doc cited, section, what the epic proposes vs. what's required]

---

## Architecture Audit

| Doc | Status | Notes |
|-----|--------|-------|
| `.claude/backend-patterns.md` | ✅/⚠️/❌ | [finding] |
| `.claude/database-redis.md` | ✅/⚠️/❌ | [finding] |
| `.claude/testing.md` | ✅/⚠️/❌ | [finding] |
| `docs/architecture/routing-and-file-structure.md` | ✅/⚠️/❌ | [finding] |
| `docs/development/naming-conventions.md` | ✅/⚠️/❌ | [finding] |

---

## Story Coverage Matrix

| Epic Deliverable | Story | Status |
|-----------------|-------|--------|
| [Deliverable 1] | story.[N].1.[name] | ✅ Covered |
| [Deliverable 2] | — | ❌ No story yet |

---

## Recommended Actions (Prioritised)

1. [Action 1 — Critical]
2. [Action 2 — Critical]
3. [Action 3 — Major]
...

---

## User Decisions Captured

[Record answers from all 3 question points]

---

## Epic Split Recommendation

[If applicable: proposed sub-epic split with scope boundaries]
```

**Option B — Inline Action Plan**:

Present immediately in conversation as:

```
## Epic [N] Review: Inline Action Plan

**Score**: [X.X/5.0] | **Ready for stories**: ✅/⚠️/❌

### Fix Template (do these first)
1. [Specific fix with section reference]
2. ...

### Resolve Registry Conflicts
1. [Specific fix — quote conflicting epic]
2. ...

### Address Architecture Violations
1. [Specific fix — cite doc and section]
2. ...

### Update Existing Stories
1. [Specific fix — story file and AC reference]
2. ...

### Epic Split Recommendation
[If applicable]
```

---

### Step 10 — Post-Review Status Update

**Purpose**: Offer to update the epic file with review metadata.

Ask (inline, no AskUserQuestion needed for this binary choice):

> "Would you like me to add `last_reviewed: YYYY-MM-DD` to the epic's YAML frontmatter and update the `status` field if it's stale?"

If yes:
- Add/update `last_reviewed` field in YAML with today's date
- Update `status` if user confirmed a change during the review
- Do NOT change any other content

---

### Step 11 — Apply Findings to Epic

**Purpose**: Offer to apply the findings from the report/plan directly to the epic file.

Use `AskUserQuestion`:

```yaml
question: 'Would you like the findings from the review to be applied to the epic file now?'
header: 'Apply Fixes'
options:
  - label: 'Yes — apply all fixes'
    description: 'Apply every Critical and Major fix from the report/plan directly to the epic file now.'
  - label: 'Yes — apply critical only'
    description: 'Apply only Critical fixes now. Leave Major and Minor for a later pass.'
  - label: 'No — I will apply them manually'
    description: 'Leave the epic file unchanged. Use the report/plan as a reference to apply fixes yourself.'
```

**If "Yes — apply all fixes" or "Yes — apply critical only"**:

1. Work through each applicable recommendation from Step 8 in order of severity (Critical first, then Major)
2. For each fix, use the Edit tool to apply the change directly to the epic file
3. Do NOT rewrite sections that were not flagged — only touch what the recommendation covers
4. After all edits, read back the changed sections to verify correctness
5. Report which fixes were applied and which (if any) were skipped with reason
6. **Mark recommendations as implemented** — update both documents:

   **In the review report** (`epic.[N].[name]-review-report.md`):
   - Add the following line immediately after the Story Writing Readiness line in the Executive Summary:
     `> **Implementation Status**: ✅ All [N] recommendations implemented — YYYY-MM-DD`
     (or: `> **Implementation Status**: ✅ Critical/Major recommendations implemented — YYYY-MM-DD` if partial)
   - In the Recommended Actions list, prefix each applied recommendation with `✅ ` and each skipped one with `⏭️ skipped —` followed by the reason

   **In the epic file** (`epic.[N].[name].md`):
   - Add the following line immediately after the `**Last Updated**` status line:
     `**Review**: ✅ All review recommendations from \`epic.[N].[name]-review-report.md\` implemented YYYY-MM-DD`
     (or: `**Review**: ✅ Critical/Major recommendations implemented YYYY-MM-DD — see review report for details`)
   - Update the `last_reviewed` YAML frontmatter field to today's date if not already done in Step 10

**If "No — I will apply them manually"**:

- Confirm the report/plan file path for reference and close the skill

---

## Key Anti-Hallucination Rules

1. **Every conflict citation** must reference an actual file path and section header
2. **Never invent architecture violations** — if you're not sure, say "could not verify against [doc]"
3. **Codebase search results**: When Glob/Grep finds nothing, state explicitly: "No existing implementation found for [X]"
4. **Registry overlap**: Must quote the conflicting epic's actual title and number from the registry file
5. **Recommendations** must be specific actions, not vague suggestions like "improve this section"
6. **Score justifications**: Every score must reference specific issues or confirm specific compliance

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `docs/templates/epic-template.md` | Template compliance baseline |
| `docs/development/epic-registry.md` | Registry conflict detection |
| `docs/development/epic-creation-checklist.md` | Creation rules (numbers, naming) |
| `.claude/backend-patterns.md` | Architecture source — NestJS, API, DI |
| `.claude/database-redis.md` | Architecture source — DB, Redis, safety rules |
| `.claude/testing.md` | Architecture source — test standards, co-location |
| `docs/architecture/routing-and-file-structure.md` | Routing and file structure |
| `docs/development/naming-conventions.md` | Naming rules (PascalCase, kebab-case, handle) |
| `.agents/skills/review-story/SKILL.md` | Reference for question batching patterns |
