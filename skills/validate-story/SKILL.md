---
name: validate-story
description: Automated, non-interactive validation of a story document. Produces a GO/NO-GO verdict with a 1–10 implementation-readiness score and categorized findings. Read-only — never edits the story and never asks questions. Use as a pre-implementation gate or for batch validation. For interactive review that resolves ambiguities and applies fixes, use /review-story instead.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# Validate Story

## When to Use This Skill

Use this skill when:

- You need an **automated GO/NO-GO decision** with no user interaction
- You're running a **pre-implementation gate** (CI-style quality check)
- You're doing **batch validation** across multiple stories
- You want a **readiness score** for project tracking or reporting
- You need a **fast sanity check** (no clarifying dialogue)
- You want to verify that a story that was just edited is now ready

Natural language triggers:

- "Validate story 2.3"
- "Is story.310.5 ready to implement?"
- "Run the pre-implementation gate on #297"
- "Score this story's readiness"
- "Batch validate all stories in Epic 4"

## When to Use vs /review-story

**Use `/validate-story` (this skill) when**:

- ✅ You want an **automated verdict** (no questions asked)
- ✅ Story **appears complete** and you want a GO/NO-GO gate
- ✅ You're doing **batch validation** of multiple stories
- ✅ You need a **readiness score** for project tracking
- ✅ You want a **read-only** pass — no edits to the story document

**Use `/review-story` instead when**:

- 🔄 Story has **ambiguous requirements** that need clarification
- 🔄 You need to **resolve conflicts or gaps interactively**
- 🔄 You want **user input on technical decisions**
- 🔄 You want the agent to **apply fixes** to the story document
- 🔄 You're investigating why an implementation went off-track

**Key Difference**: `/validate-story` **validates** (read-only, automated verdict). `/review-story` **corrects** (interactive dialogue, applies fixes, updates status).

## Purpose

To perform a comprehensive, **automated** validation of an existing story document and report whether it is ready for implementation. This skill detects the same issues `/review-story` detects — template gaps, epic misalignment, hallucinations, incompleteness, inconsistencies, quality problems — but does so **without asking the user any questions and without modifying any files**.

**CRITICAL — Read-Only Contract**:

This skill MUST NOT:

- Call `AskUserQuestion` — it runs to completion without user input
- Call `Edit`, `Write`, or `NotebookEdit` against the story document
- Change the story's `Status:` field
- Apply any recommended fixes
- Rename the story file

This skill MAY:

- Read the story document, parent epic, architecture docs, and template
- Write a validation report to `[story-directory]/[story-name].validate.[date].md`
- Post a single non-blocking GitHub issue comment with the validation outcome

**Issue Severity Levels**:

- **Critical**: Blocks implementation (missing required sections, hallucinated libraries, unjustified scope reduction, ACs with no tasks)
- **Important**: Degrades implementation quality (vague file locations, missing source refs, incomplete testing spec)
- **Optional**: Nice-to-have polish (minor terminology, additional context)

**Verdict** (derived from severity counts and scoring):

- ✅ **GO** — Ready to implement. Score ≥ 8 and zero Critical issues
- ⚠️ **NO-GO (Revision)** — Score 5–7, or Important issues blocking confidence
- 🚨 **NO-GO (Rework)** — Score < 5, or any Critical issue present

## Required Inputs

```yaml
required:
  - story_file: |
      Path to story document, OR any of:
      - GitHub issue URL (direct):       https://github.com/{owner}/{repo}/issues/297
      - GitHub project board URL:        https://github.com/orgs/.../projects/...?...issue=...
      - Issue hash notation:             #297
      - Bare issue number:               297

optional:
  - focus_areas: Specific dimensions to emphasize (e.g., "testing", "API specs")
  - validation_depth: "quick" | "standard" | "thorough" (default: "standard")
```

## Input Resolution

Identical to `/review-story`. Resolve the input to a local file path before loading.

**Step 1 — Detect input type.** If the argument looks like a file path, skip to Step 4.

| Pattern | Matches |
|---------|---------|
| Contains `github.com` | GitHub URL (direct issue or project board) |
| Starts with `#` followed by digits | Hash notation |
| All digits | Bare issue number |

**Step 2 — Extract the issue number** from whichever pattern matched:

```bash
# Direct issue URL:   https://github.com/owner/repo/issues/297
ISSUE_NUM=$(echo "$INPUT" | grep -oE '(?<=/issues/)[0-9]+')

# Project board URL:  ...issue=owner%7Crepo%7C297  (last digits after %7C or |)
# Hash notation:      #297
# Bare number:        297
# Generic fallback — last group of digits in the input:
[ -z "$ISSUE_NUM" ] && ISSUE_NUM=$(echo "$INPUT" | grep -oE '[0-9]+' | tail -1)
```

**Step 3 — Resolve to local file path:**

```bash
ISSUE_BODY=$(gh issue view {N} --json body -q '.body')
DOC_URL=$(echo "$ISSUE_BODY" | grep -o 'https://github\.com/[^)]*\.md' | head -1)
LOCAL_PATH=$(echo "$DOC_URL" | sed 's|https://github\.com/[^/]*/[^/]*/blob/[^/]*/||')
```

- If `LOCAL_PATH` is non-empty and the file exists: use it as `story_file`, skip to Step 4.
- If no Document link found: fall back to `grep -rl "github_issue: {N}" docs/` and find `story.{epic}.{story}.*.md` in the result (excluding `.qa.`, `.gate.`, `.bug.`, `.implementation.`, `.review.`, `.validate.` files).
- If still not found: HALT — report: "No local document found for issue #{N}. Run `/create-story` first, or provide the file path directly."

**Step 4 — Continue with the resolved `story_file`.**

---

**Files to Load During Validation**:

1. Story document — always load in full (primary artifact)
2. Parent epic — load selectively: targeted section reads only (ACs and story list), not the full file
3. Architecture documents — discovered via Explore subagent; load at most 2–3 most relevant files
4. Story template — load for structure compliance check only; release after Step 2
5. Previous story — load only if the story explicitly references continuity; a 1-line summary suffices

**CRITICAL**: Use the Explore subagent to discover documents before loading them. Never load all architecture docs blindly — select based on story domain.

---

## Validation Workflow (9 Sequential Steps)

**NOTE**: Unlike `/review-story`, there are no Question Points in this workflow. Collect findings throughout and emit the full report in Step 9. Never call `AskUserQuestion`.

### Step 0: Initialize Task List

**Purpose**: Register every step as a tracked task to prevent silently skipping any dimension.

**Actions**:

1. Use `TaskCreate` to register the task list below. Mark each `in_progress` before starting and `completed` immediately after finishing.

| Task Subject | Description |
|---|---|
| Load config & context | Load skills-config.yaml, locate story + architecture docs |
| Template compliance | Verify story structure against template |
| Epic alignment | Check story fits within its parent epic |
| Technical accuracy | Anti-hallucination check of implementation details |
| Completeness & gap analysis | Identify missing ACs, tasks, NFRs |
| Consistency & conflicts | Detect internal contradictions |
| Quality & clarity | Score story readability and precision |
| Previous story context | Review predecessor story if applicable |
| Generate validation report | Write verdict + findings to file |
| Post GitHub issue comment | Notify linked issue (non-blocking) |

**Output**: Task list initialized.

---

### Step 1: Load Configuration and Context

**Purpose**: Establish project structure and locate all relevant documents.

**Actions**:

1. Load `skills-config.yaml` from project root. If missing, use fallback defaults (same as `/review-story`) and note in report.
2. Load the story document directly with the Read tool — primary artifact, stays in context throughout.
3. Discover supporting documents using the **Explore subagent**:
   - Parent epic file (pattern: `epic.{N}.*.md` in the epic directory)
   - Architecture documents relevant to this story's type
   - The previous story in sequence (pattern: `story.{epic}.{story-1}.*.md`)
   - The story template (`resources/story-tmpl.yaml` — reuse from `/review-story` if present)
4. Selectively load from the Explore results (same selection rules as `/review-story`).

**Output**: Compact context package — story in full, supporting docs selectively loaded.

---

### Step 2: Template Structure Compliance

**Purpose**: Verify the story follows the required template structure.

Apply the **same checks** as `/review-story` Step 2:

1. **Section presence**: Status, Story Statement, ACs, Tasks/Subtasks, Dev Notes, Testing, Manual Testing Steps (UI stories), Change Log, Dev Agent Record, QA Handoff Notes, QA Report, Bug Reports.
2. **File naming**: `story.[epic].[story].[descriptive-name].md` (dots for structural separators, hyphens within names).
3. **Placeholder detection**: Search for `{{...}}`, `_TBD_`, `[TODO]`, `[PLACEHOLDER]`, `???`.
4. **Section structure**: "As a / I want / So that" format, numbered ACs, checkbox tasks, table change log.
5. **GitHub issue linkage**: Frontmatter contains `github_issue:` with a numeric value. If missing, flag as **Important** — do NOT create the issue (that's review-story's job; just report the gap).

**Issues to Flag**:

- **Critical**: Missing required sections (Story, ACs, Tasks, Dev Notes)
- **Important**: Unfilled placeholders in core sections, missing/invalid GitHub issue linkage
- **Optional**: Missing optional sections or subsections

**Output**: Section compliance findings.

---

### Step 3: Epic Alignment Verification

Apply the **same checks** as `/review-story` Step 3: AC comparison, scope verification, dependency check, justification review.

**Issues to Flag**:

- **Critical**: Missing epic ACs, unjustified scope reduction
- **Important**: AC wording that alters meaning, missing dependencies
- **Optional**: Additional ACs without epic source reference

**Output**: Epic alignment findings.

---

### Step 4: Technical Accuracy and Anti-Hallucination

Apply the **same checks** as `/review-story` Step 4: source verification, technology inventory (cross-ref `tech-stack.md` and `package.json`), API spec accuracy, data model accuracy, configuration accuracy, reference validation.

**Common hallucination patterns to detect**:

- Vague source ("standard React patterns", "best practices")
- Libraries not in `package.json` or tech-stack docs
- Endpoints not in API specification
- Database fields not in schema definitions

**Issues to Flag**:

- **Critical**: Invented libraries/APIs, incorrect schemas or endpoints
- **Important**: Missing source references, unverified technical claims
- **Optional**: Vague references that could be more specific

**Output**: Technical accuracy findings with every hallucination logged (library name, location in story, reason flagged).

---

### Step 5: Completeness and Gap Analysis

Apply the **same checks** as `/review-story` Step 5: Dev Notes completeness, AC→task mapping, task completeness, testing coverage, manual testing steps (UI stories), file location specification, error handling, integration points, security considerations.

**Issues to Flag**:

- **Critical**: ACs with no tasks, missing essential Dev Notes categories, no testing guidance
- **Important**: Vague file locations, missing error handling, incomplete testing specs
- **Optional**: Additional helpful context could be added

**Output**: Gap analysis findings.

---

### Step 6: Consistency and Conflict Detection

Apply the **same checks** as `/review-story` Step 6: internal consistency, technical approach consistency, project structure alignment, configuration consistency, cross-story consistency, epic consistency.

**Issues to Flag**:

- **Critical**: Direct contradictions, breaking changes without justification
- **Important**: Inconsistent naming, misaligned approaches
- **Optional**: Minor terminology variations

**Output**: Consistency findings.

---

### Step 7: Quality and Clarity Assessment

Apply the **same checks** as `/review-story` Step 7: clarity scoring (1–10) across Story Statement, ACs, Tasks, Dev Notes, Testing; ambiguity detection; self-containment; developer perspective; AC quality; task quality; scope and complexity analysis.

**Split Indicators** (same as `/review-story`):

- 10+ tasks total
- Multiple distinct feature areas
- "Phase 1/2/3" structure
- Mixed concerns (backend + frontend + database)
- Parallel-safe sections

If any split indicator fires, flag as **Important** with "Recommend splitting" and document the suggested split structure in findings — but do NOT ask the user whether to split (that's `/review-story`'s job).

**Output**: Quality assessment with clarity scores and split recommendation (if applicable).

---

### Step 8: Previous Story Context (if applicable)

If a previous story exists in the same epic:

1. Read its Dev Agent Record
2. Check current story for continuity (file locations, technology choices, established patterns)
3. Flag pattern breaks without justification

**Issues to Flag**:

- **Critical**: Contradicts previous story decisions without justification
- **Important**: Ignores relevant lessons learned, breaks established patterns
- **Optional**: Could benefit from previous story context

**Output**: Previous-story continuity findings.

---

### Step 9: Generate Validation Report

**Purpose**: Produce the validation artifact.

**Actions**:

1. Compute the **Implementation Readiness Score** (1–10, weighted average of per-dimension scores).
2. Determine the **Verdict**:
   - ✅ **GO** if score ≥ 8 AND zero Critical issues
   - ⚠️ **NO-GO (Revision)** if score 5–7, OR Important issues present that materially block confidence
   - 🚨 **NO-GO (Rework)** if score < 5 OR any Critical issue present
3. Write the report to `[story-directory]/[story-name].validate.[date].md` (always — no "action plan only" option; validation always produces a durable artifact).
4. Print a concise summary to stdout so the caller (human or pipeline) can act without opening the file.

**Report Structure**:

```markdown
# Story Validation Report: Story [Epic].[Story] — [Title]

**Validated:** [ISO date]
**Validation Depth:** [Quick/Standard/Thorough]
**Story Status:** [Current status from story]
**Verdict:** ✅ GO / ⚠️ NO-GO (Revision) / 🚨 NO-GO (Rework)
**Implementation Readiness Score:** [1-10]/10

---

## Executive Summary

[2-3 sentences: what was validated, what the verdict is, single biggest blocker if any.]

**Critical Issues:** [count] 🚨
**Important Issues:** [count] ⚠️
**Optional Improvements:** [count] 💡

**Confidence Level for Successful Implementation:** [High/Medium/Low]

---

## Verdict Justification

[1-2 sentences explaining why this verdict was chosen. Cite the specific rules that fired (e.g. "Critical hallucination detected in Dev Notes → Rework" or "Score 8.5/10 and zero criticals → GO").]

---

## Scoring Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Template Compliance | [1-10]/10 | [1-line note] |
| Epic Alignment | [1-10]/10 | [1-line note] |
| Technical Accuracy | [1-10]/10 | [1-line note] |
| Completeness | [1-10]/10 | [1-line note] |
| Consistency | [1-10]/10 | [1-line note] |
| Quality & Clarity | [1-10]/10 | [1-line note] |
| Previous Story Continuity | [1-10]/10 or N/A | [1-line note] |

**Overall:** [weighted average]/10

---

## 1. Template Structure Compliance — [PASS / ISSUES FOUND]

### Critical
- [List critical template issues with exact location]

### Important
- [List important template issues]

### Optional
- [List optional improvements]

---

## 2. Epic Alignment — [ALIGNED / DEVIATIONS FOUND]

### Critical
- [Missing epic ACs, scope changes]

### Important
- [AC deviations, missing dependencies]

### Optional
- [Minor deviations]

---

## 3. Technical Accuracy — [ACCURATE / ISSUES FOUND]

**Hallucinations Detected:** [count]

### Critical (Hallucinations)
- **[Invented library/technology]** at [section:line]
  - Story claims: "[exact quote]"
  - Checked against: [tech-stack.md, package.json, architecture/*.md]
  - Evidence: [what the check revealed — "not present in any source doc"]

### Important
- **[Missing source reference]** at [section:line]
  - Claim: "[quote]"
  - Expected: `[Source: architecture/file.md#section]`

### Optional
- [Vague references]

---

## 4. Completeness & Gaps — [COMPLETE / GAPS FOUND]

### Critical
- [ACs with no tasks, missing Dev Notes categories, no testing guidance]

### Important
- [Vague file locations, missing error handling, incomplete testing]

### Optional
- [Nice-to-have context]

---

## 5. Consistency & Conflicts — [CONSISTENT / CONFLICTS FOUND]

### Critical
- [Direct contradictions]

### Important
- [Inconsistent naming, misaligned approaches]

### Optional
- [Terminology variations]

---

## 6. Quality & Clarity

**Clarity Scores:**

- Story Statement: [1-10]/10
- Acceptance Criteria: [1-10]/10
- Tasks/Subtasks: [1-10]/10
- Dev Notes: [1-10]/10
- Testing Guidance: [1-10]/10

**Overall Clarity:** [1-10]/10

### Critical
- [Ambiguous ACs, unmeasurable criteria that block implementation]

### Important
- [Vague guidance, oversized story — recommend split]

### Optional
- [Could be clearer]

### Split Recommendation (if applicable)
- Split indicators fired: [list]
- Suggested split structure: [brief breakdown]

---

## 7. Previous Story Context — [CONSISTENT / ISSUES FOUND / N/A]

### Critical
- [Contradicts previous story without justification]

### Important
- [Ignores lessons learned, breaks established patterns]

---

## 8. Summary of Findings

### Must Fix (Critical) — [count]
1. [Highest-priority issue, one line]
2. ...

### Should Fix (Important) — [count]
1. [Important issue]
2. ...

### Consider (Optional) — [count]
1. [Nice-to-have]
2. ...

---

## Next Steps

**If GO:**
- Story is ready for implementation. Run `/develop` to begin.
- No action required on this report.

**If NO-GO (Revision):**
- Run `/review-story` to resolve ambiguities interactively and apply fixes.
- Re-run `/validate-story` after fixes to confirm readiness.

**If NO-GO (Rework):**
- Story requires significant changes. Consider:
  - Running `/review-story` to walk through issues with the agent
  - Or `/create-story` to regenerate the story from scratch with correct context

---

## Validation Metadata

- **Validator:** `/validate-story` (automated, read-only)
- **Validation Date:** [ISO date]
- **Validation Depth:** [Quick/Standard/Thorough]
- **Story File:** [path]
- **Parent Epic:** [epic file path]
- **Architecture Docs Consulted:** [list]
- **Validation Duration:** [time]

---

*This report was generated without user interaction. No changes were made to the story document. To apply fixes, run `/review-story`.*
```

**Output**: Validation report saved. Print to stdout:

```
Verdict: <GO|NO-GO (Revision)|NO-GO (Rework)>
Score:   <N>/10
Issues:  <critical> critical · <important> important · <optional> optional
Report:  <path>
```

---

### Step 10: Post GitHub Issue Comment (graceful — non-blocking)

**Purpose**: Notify the linked GitHub issue that validation completed, with the verdict and issue counts.

**When to Execute**: Always — after Step 9 completes, regardless of verdict. If `github_issue` is absent from frontmatter, skip silently.

**Actions**:

1. Retrieve `github_issue` from the story document YAML frontmatter.
2. Post a comment with the validation summary:

```bash
GITHUB_ISSUE={github_issue from frontmatter}

gh issue comment "$GITHUB_ISSUE" --body "## Story Validation Complete

**Verdict**: ${VERDICT}
**Readiness Score**: ${SCORE}/10

| Severity | Count |
|----------|-------|
| Critical 🚨 | ${CRITICAL} |
| Important ⚠️ | ${IMPORTANT} |
| Optional 💡 | ${OPTIONAL} |

**Validation artifact**: \`${VALIDATE_FILE}\`

**Next step**:
- If GO → run \`/develop\` to begin implementation
- If NO-GO → run \`/review-story\` to resolve issues interactively

---
_Generated by /validate-story (read-only, automated)_" \
  || echo "⚠️  GitHub issue comment failed — continuing"
```

3. If `gh issue comment` exits 0, confirm to the caller: "✅ Validation summary posted to GitHub issue #${GITHUB_ISSUE}." If it fails, report the error but do NOT halt the skill — the validation report on disk is the source of truth.

**Output**: GitHub issue updated with validation outcome (if `github_issue` present).

---

## Validation Depth Modes

### Quick Validation (5–10 minutes)

- Critical-issue detection only
- Template compliance (section presence + placeholders)
- Epic alignment (AC coverage)
- Technical accuracy (obvious hallucinations only — unknown libraries)
- High-level completeness check (AC→task mapping)

**Use when**: Batch validation, CI-style gate, time-constrained.

### Standard Validation (15–30 minutes) — DEFAULT

- All steps (0–10) fully executed
- Full issue detection at all severity levels
- Complete report generation
- GitHub issue comment posted

**Use when**: Normal pre-implementation gate, quality check before handoff to `/develop`.

### Thorough Validation (30–60 minutes)

- All steps with deep analysis
- Every technical claim cross-referenced against source docs
- Detailed per-dimension scoring with justification
- Comparison with previous and sibling stories for pattern consistency

**Use when**: Critical story, high-risk implementation, quality audit, publishable-quality gate.

---

## Success Criteria

Validation is successfully completed when:

✅ All steps (0–10) systematically executed according to validation depth
✅ Issues categorized by severity (critical/important/optional) with precise locations
✅ Hallucinations identified and documented with evidence
✅ Scoring breakdown produced with per-dimension scores
✅ Clear verdict (GO / NO-GO Revision / NO-GO Rework) rendered with justification
✅ Validation report saved to `[story-dir]/[story-name].validate.[date].md`
✅ GitHub issue comment posted with verdict (graceful: skipped if `github_issue` absent)
✅ **Zero modifications** made to the story document, status, or any other project file (besides the validation report itself)

---

## Integration with Other Skills

**Called by**:

- `develop-story` pipeline — as a pre-implementation gate
- `scrum-master` — for batch story QA
- `po` — for product-owner readiness check
- CI workflows — for automated story validation
- Manual invocation by user

**Calls**:

- Explore subagent — for document discovery
- `gh` CLI — for GitHub issue comment (non-blocking)
- None else — standalone, side-effect-free within the repo

**Outputs used by**:

- `/develop` — reads verdict before starting implementation
- `/review-story` — operators chain `validate → review → validate` to reach GO
- Scrum masters, PMs — for project-readiness tracking

---

## Common Use Cases

### 1. Pre-Implementation Gate

"Is story 2.3 ready to develop?"

Process: Standard depth → verdict → if GO, proceed; if NO-GO, run `/review-story`.

### 2. Batch Validation

"Validate all stories in Epic 41"

Process: Iterate story files → run quick depth on each → aggregate verdicts into a per-epic readiness summary.

### 3. Post-Edit Confirmation

"I just edited story 3.2. Is it clean now?"

Process: Standard depth → verdict → confirm GO or show remaining blockers.

### 4. CI Quality Gate

"Block the PR if the story isn't ready"

Process: Quick depth in CI → exit non-zero on NO-GO → post comment to PR.

---

## Anti-Hallucination Protocol

Identical to `/review-story`:

### Detection Rules

1. **Source Traceability**: Every technical claim MUST have a verifiable source.
2. **Cross-Reference Validation**: Claims MUST match source document content.
3. **Invention Detection**: Flag any technology/pattern not in architecture docs or `package.json`.
4. **Vague Source Detection**: Flag generic sources without specific references.
5. **Assumption Verification**: Check explicit assumptions against reality.

### Reporting Format

```markdown
#### Critical (Hallucination)

- **[Category]**: [Specific invented detail]
  - **Location:** [exact section:line in story]
  - **Issue:** Story claims [X] but this is not documented in [source docs]
  - **Evidence:** [what source check revealed]
```

### Verification Process

For each technical claim:

1. Extract claim
2. Find source reference
3. Load source document
4. Verify claim matches source content
5. Flag if: no source, source missing, source doesn't contain claim, source contradicts claim

---

## Configuration Reference

Expected configuration in `skills-config.yaml` (same shape as `/review-story`):

```yaml
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: '*/epics/epic.{n}.*.md'

architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture

devStoryLocation: nested
devStoryNestedPattern: "docs/prd/**/epics/*/stories"
```

If `skills-config.yaml` is missing, the skill uses the same defaults as `/review-story`.

---

## Resources

This skill reuses:

- `../review-story/resources/story-template.yaml` — story template for structure validation (shared)
- `skills-config.yaml` — project configuration (optional, uses fallbacks)

No additional resources required — validation is check-only and does not need generation templates.

---

## Notes

- Validation reports are saved as `[story-name].validate.[date].md` (distinct from review reports which use `.review.` and from QA gates which use `.gate.` or `.qa.`).
- Story status is **never** updated by this skill — status transitions are `/review-story`'s responsibility.
- Fixes are **never** applied by this skill — running this skill is always safe and idempotent.
- The verdict is deterministic given the same inputs: same story + same architecture docs → same score and same verdict (within scoring-heuristic variance).
- To chain: run `/validate-story` → if NO-GO, run `/review-story` to fix → re-run `/validate-story` to confirm GO.
