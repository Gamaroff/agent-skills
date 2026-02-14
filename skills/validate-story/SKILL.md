---
name: validate-story
description: Quick automated pre-implementation validation. Produces GO/NO-GO decision and readiness score WITHOUT user interaction. Use when you need a fast validation gate before starting development.
---

# Validate Story

## When to Use This Skill

Use this skill when:

- You need a quick automated validation (no user input required)
- Story appears complete and you want GO/NO-GO decision
- You're doing batch validation of multiple stories
- You want a fast pre-implementation gate
- Product managers/scrum masters need quick validation feedback
- Getting implementation readiness assessment (1-10 scale)

## When to Use vs /review-story

**Use `/validate-story` (this skill) when**:
- ✅ You need **automated validation** without user interaction
- ✅ Story appears complete and you want GO/NO-GO decision
- ✅ You're doing **batch validation** of multiple stories
- ✅ You want a **fast pre-implementation gate** (systematic check)
- ✅ You need a readiness score for project tracking

**Use `/review-story` instead when**:
- 🔄 Story has **ambiguous requirements** that need clarification
- 🔄 You need to **resolve conflicts or gaps interactively**
- 🔄 You want **user input on technical decisions**
- 🔄 You're investigating why a story implementation went off-track
- 🔄 Story needs **deep analysis with clarifying questions**

**Key Difference**: `/validate-story` is **automated** (no questions asked), while `/review-story` is **interactive** (asks clarifying questions to resolve ambiguities).

## Purpose

Comprehensive story validation to prevent:

- Missing essential information
- Hallucinated technical details
- Incomplete acceptance criteria
- Unclear implementation guidance
- Architecture inconsistencies

Produces actionable validation report with:

- Template compliance check
- Critical/should-fix/nice-to-have issues
- Anti-hallucination findings
- Implementation readiness score
- GO/NO-GO decision with confidence level

## Required Inputs

```yaml
required:
  - story_file: Path to story draft or user-provided
  - core_config: resources/core-config.yaml

derived_from_config:
  - devStoryLocation: Where to find stories
  - prd.*: PRD configuration (sharded/monolithic)
  - architecture.*: Architecture configuration
```

**Files to Load**:

1. Story file (the draft to validate)
2. Parent epic (contains requirements)
3. Architecture documents (based on config)
4. Story template (`resources/story-tmpl.yaml`)

## Validation Workflow (10 Sequential Steps)

### Step 0: Load Core Configuration and Inputs

1. Load `resources/core-config.yaml`
   - If missing → HALT: "core-config.yaml not found. This file is required for story validation."
2. Extract: `devStoryLocation`, `prd.*`, `architecture.*`
3. Identify and load:
   - Story file to validate
   - Parent epic from PRD
   - Architecture documents
   - Story template (`resources/story-tmpl.yaml`) for section verification

### Step 1: Template Completeness Validation

**Questions to Answer**:

- Are all template sections present?
- Are there unfilled placeholders (e.g., `{{EpicNum}}`, `{{role}}`, `_TBD_`)?
- Does structure comply with template?
- Are all agent sections included?
- Are QA integration sections present?

**Check**:

- Load story template from `resources/story-tmpl.yaml`
- Extract all section headings
- Compare story sections against template
- Flag missing sections or unfilled variables

**Critical QA Integration Sections** (MUST be present):

- ✅ **QA Handoff Notes** section (for developer-to-QA handoff)
  - Should include subsections: Summary of Changes, Testing Instructions, Areas Requiring Special Attention, Known Limitations, QA Prerequisites Checklist
- ✅ **QA Report** section (empty initially, for future linking)
- ✅ **Bug Reports** section (empty initially, for tracking bug links)
  - Should include subsections: Open Bugs, In QA Verification, Closed Bugs

**File Naming Convention Validation**:

- Story filename MUST follow format: `story.[epic].[story].[descriptive-name].md`
- Use DOTS (.) for structural separators, hyphens (-) within descriptive names
- Examples:
  - ✅ Valid: `story.2.1.auto-hide.md`
  - ❌ Invalid: `story-2-1-auto-hide.md`
- Flag if naming convention not followed

### Step 2: File Structure and Source Tree Validation

**Questions to Answer**:

- Are file paths clearly specified?
- Is relevant project structure included in Dev Notes?
- Are directories/components properly located?
- Do tasks specify file creation sequence logically?
- Are paths consistent with architecture docs?

**Check**:

- File path clarity in tasks
- Source tree relevance
- Directory structure alignment
- File creation order
- Path accuracy vs architecture

### Step 3: UI/Frontend Completeness Validation (if applicable)

**Questions to Answer**:

- Are UI components sufficiently detailed?
- Is styling/design guidance clear?
- Are user interaction flows specified?
- Are responsive/accessibility considerations addressed?
- Are frontend-backend integration points clear?

**Check**:

- Component specifications
- Design guidance
- UX patterns and behaviors
- Accessibility requirements
- Integration clarity

### Step 4: Acceptance Criteria Satisfaction Assessment

**Questions to Answer**:

- Will all ACs be satisfied by listed tasks?
- Are ACs measurable and verifiable?
- Are edge cases and error conditions covered?
- Is "done" clearly defined for each AC?
- Are tasks mapped to specific ACs?

**Check**:

- AC coverage completeness
- AC testability
- Missing scenarios
- Success definition
- Task-AC mapping

### Step 5: Validation and Testing Instructions Review

**Questions to Answer**:

- Are testing methods clearly specified?
- Are key test cases identified?
- Are validation steps for ACs clear?
- Are required testing tools specified?
- Are test data needs identified?

**Check**:

- Test approach clarity
- Test scenario completeness
- Validation step specificity
- Testing tools/frameworks
- Test data requirements

### Step 6: Security Considerations Assessment (if applicable)

**Questions to Answer**:

- Are security requirements identified and addressed?
- Are authentication/authorization specified?
- Are sensitive data handling requirements clear?
- Are common vulnerabilities addressed?
- Are compliance needs addressed?

**Check**:

- Security requirements
- Access controls
- Data protection
- Vulnerability prevention
- Regulatory compliance

### Step 7: Tasks/Subtasks Sequence Validation

**Questions to Answer**:

- Do tasks follow proper implementation sequence?
- Are task dependencies clear and correct?
- Are tasks appropriately sized and actionable?
- Do tasks cover all requirements and ACs?
- Are there blocking issues?

**Check**:

- Logical order
- Dependencies
- Granularity
- Completeness
- Blocking conditions

### Step 8: Anti-Hallucination Verification

**CRITICAL - Questions to Answer**:

- Is every technical claim traceable to source documents?
- Does Dev Notes content match architecture specs?
- Are there invented details not supported by sources?
- Are all references correct and accessible?
- Do claims cross-reference with epic and architecture?

**Check**:

- Source verification for all technical claims
- Architecture alignment
- Flag invented details (libraries, patterns, standards)
- Reference accuracy
- Fact-checking against sources

### Step 9: Dev Agent Implementation Readiness

**Questions to Answer**:

- Can story be implemented without reading external docs?
- Are implementation steps unambiguous?
- Are all required technical details in Dev Notes?
- What critical information gaps exist?
- Are all tasks actionable by a development agent?

**Check**:

- Self-contained context
- Clear instructions
- Complete technical context
- Missing information identification
- Task actionability

### Step 10: Generate Validation Report

**Purpose**: Provide comprehensive validation findings and recommendations

Provide structured report with following sections:

#### 1. Template Compliance Issues

- Missing sections from template
- Unfilled placeholders
- Structural formatting problems

#### 2. Critical Issues (Must Fix - Story Blocked)

- Missing essential implementation information
- Inaccurate/unverifiable technical claims
- Incomplete AC coverage
- Missing required sections

#### 3. Should-Fix Issues (Important Quality)

- Unclear implementation guidance
- Missing security considerations
- Task sequencing problems
- Incomplete testing instructions

#### 4. Nice-to-Have Improvements (Optional)

- Additional helpful context
- Efficiency improvements
- Documentation enhancements

#### 5. Anti-Hallucination Findings

- Unverifiable technical claims
- Missing source references
- Architecture inconsistencies
- Invented libraries/patterns/standards

#### 6. Final Assessment

- **Decision**: GO or NO-GO
- **Implementation Readiness Score**: 1-10 scale
  - 1-3: Not ready (critical issues)
  - 4-6: Needs work (multiple should-fix)
  - 7-8: Good (minor improvements)
  - 9-10: Excellent (ready to implement)
- **Confidence Level**: High/Medium/Low for successful implementation

## Blocking Conditions

**HALT if**:

- `resources/core-config.yaml` not found
- Story file not accessible
- Parent epic not found
- Story template (`resources/story-tmpl.yaml`) missing

## Success Criteria

Validation complete when:

- ✅ All 11 steps systematically executed
- ✅ Comprehensive report generated
- ✅ All issues categorized (critical/should-fix/nice-to-have)
- ✅ Anti-hallucination findings documented
- ✅ Clear GO/NO-GO decision provided
- ✅ Implementation readiness score calculated
- ✅ Story status updated (if GO decision and user approved)

## Example Output

```markdown
## Validation Report: Story 2.2 - Navigation Enhancement

### Template Compliance ✅

- All required sections present
- No unfilled placeholders

### Critical Issues ❌ (2 found)

1. **Missing API endpoint specification**: Tasks reference `/api/menu/navigate`
   but no endpoint definition in Dev Notes (NOT in architecture docs)
2. **AC4 not covered**: No task addresses "centralized dependency management"

### Should-Fix Issues ⚠️ (3 found)

1. **Unclear test approach**: Testing section mentions "comprehensive tests"
   but doesn't specify unit vs integration
2. **Missing error handling**: No guidance on handling navigation failures
3. **Task dependency unclear**: Task 3 depends on Task 2 but not explicitly stated

### Anti-Hallucination Findings 🚨 (1 found)

1. **Invented library**: Dev Notes reference "react-native-navigation-pro"
   which doesn't exist in architecture/tech-stack docs

### Final Assessment

- **Decision**: NO-GO
- **Implementation Readiness Score**: 4/10
- **Confidence Level**: Low
- **Recommendation**: Fix critical issues and anti-hallucination finding before implementation
```

---

## Step 11: Update Document Status (if GO decision)

**Purpose**: Update story status after successful validation to enable development

**CRITICAL**: This step ensures that once a story has been validated successfully, its status reflects readiness for development.

**When to Execute This Step**:

- After generating validation report
- Only if decision is **GO** and implementation readiness score is >= 7
- Only if current status indicates document is not yet ready (e.g., "Draft", "Not Started")

**Actions**:

1. **Check Validation Decision**:
   - If decision is NO-GO → Skip this step
   - If decision is GO and score >= 7 → Proceed

2. **Check Current Document Status**:
   - Read the `Status:` field from story document
   - If status is already "Ready for Development" or "In Progress" → Skip this step
   - If status is "Draft", "Not Started", or similar → Proceed

3. **Ask User About Status Update**:

   Use `AskUserQuestion` to confirm status update:

   ```yaml
   question: "Validation result is GO with readiness score [X]/10. Update story status to 'Ready for Development'?"
   header: "Update Status"
   options:
     - label: "Yes, ready to implement"
       description: "Update status to 'Ready for Development'. Story can be handed off to /develop."
     - label: "Keep current status"
       description: "Leave status as '[current status]'. I'll update manually when ready."
   ```

4. **Update Status Based on User Response**:

   **If "Yes, ready to implement"**:
   - Update story document `Status:` field to "Ready for Development"
   - Add entry to Change Log table:
     ```markdown
     | [date] | [version] | Validation passed - ready for development | Validate-Story |
     ```
   - Confirm update to user:
     > "✅ Story status updated to 'Ready for Development'. You can now run `/develop` to begin implementation."

   **If "Keep current status"**:
   - Keep status unchanged
   - Inform user:
     > "Story status unchanged at '[current status]'. Run `/develop` when ready to begin implementation."

5. **Status Update Implementation**:

   When updating status, use Edit tool:

   ```yaml
   file_path: [story-file-path]
   old_string: "**Status:** Draft"
   new_string: "**Status:** Ready for Development"
   ```

**Status Transition Rules**:

- `Draft` → `Ready for Development` (after GO validation)
- `Not Started` → `Ready for Development` (after GO validation)
- Any status → No change if NO-GO or user declines update

**Output**: Story document with updated status field (if applicable)

**Example Flow**:

```
Validation Complete: GO decision, score 8/10
↓
Step 11 Executes: "Update status to 'Ready for Development'?"
↓
User Selects: "Yes, ready to implement"
↓
Status Updated: "Draft" → "Ready for Development"
↓
Change Log Updated: Validation entry added
↓
User Can Now: Run `/develop` to begin implementation
```

---

## Related Skills

- **develop**: Main story implementation workflow
- **review-story**: Interactive story review with clarifying questions
- **execute-checklist**: Run specific validation checklists
- **fix-qa**: Post-implementation QA feedback

## Resources

This skill uses these resource files:

- `resources/story-tmpl.yaml` - Story template for structure validation
- `resources/core-config.yaml` - Project configuration (dev story location, PRD/architecture paths)
