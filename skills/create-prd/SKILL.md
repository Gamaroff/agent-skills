---
name: create-prd
description: Create PRDs for enhancements to existing projects. Use when adding significant features to existing codebases that require comprehensive planning (4+ stories, architectural changes).
---

# Brownfield PRD Creation

## When to Use This Skill

Activate this skill when the user needs to:

- Add **significant enhancements** to existing codebase (4+ stories, architectural changes)
- Integrate new **major features** into established systems
- Perform **substantial modifications** requiring comprehensive planning
- Add features that require **deep understanding** of existing architecture

**Natural activation triggers:**

- "Add [major feature] to existing app"
- "Enhance [existing system] with..."
- "Integrate [new capability] into our..."
- "Modify [existing product] to support..."

**Decision Tree:**

- **Large enhancement** (4+ stories, architectural changes) → Use THIS skill
- **Medium enhancement** (1-3 stories, follows existing patterns) → Use `create-epic`
- **Small change** (single session, isolated) → Use `brownfield-story`

**Do NOT use for:**

- Greenfield projects (use `greenfield-prd`)
- Small enhancements (use `create-epic` or `brownfield-story`)
- Bug fixes (use GitHub issues)

## Critical: Scope Assessment Required

**BEFORE proceeding, assess enhancement complexity:**

1. **Can this be completed in 1-2 focused development sessions?**
   - YES → Recommend `brownfield-story` instead
   - NO → Continue with this skill

2. **Does this require architectural changes or 4+ stories?**
   - NO → Recommend `create-epic` instead
   - YES → Continue with this skill

3. **Is comprehensive planning required?**
   - NO → Recommend simpler approach
   - YES → Continue with this skill

**Communicate assessment:**

```
"Based on the complexity you've described, this appears to be a
[large/medium/small] enhancement. For this scope, I recommend using
[create-prd/create-epic/brownfield-story] because [rationale]."
```

## ⚠️ Documentation-Only Scope — Do NOT Implement

This skill produces **the PRD document and its associated planning artifacts only** (epic files via subsequent skills, tracker issues, handoff prompts). It MUST NOT begin implementing any feature the PRD describes, nor scaffold any source code.

**Forbidden during this skill** (regardless of how compelling it seems):

- ❌ Editing, creating, or deleting any source file outside `docs/prd/` (and the tracker-issue side effect)
- ❌ Running migrations, codegen, build, lint-fix, or refactor commands
- ❌ Creating branches, committing, or pushing code changes
- ❌ Installing/removing dependencies or modifying `package.json`
- ❌ Auto-invoking `create-epic`, `create-story`, `develop-story`, or any implementation skill on completion
- ❌ Starting "phase 1" of any epic or story to "get a head start"

**Allowed writes** (the only filesystem changes this skill may make):

- ✅ The PRD file `docs/prd/[domain]/[feature]/prd.[name].md` (and its directory)
- ✅ Tracker issue creation if the workflow includes it (GitHub/Jira issue for the PRD/initiative)
- ✅ Handoff prompt files (Architect/UX Expert) emitted as part of Step 4

**If the user asks to "create the PRD and start the first epic"**: complete the PRD (including Step 4 handoff prompts), then STOP and explicitly hand off — tell user to invoke `/create-epic` or `/create-epics-from-shards` as a separate step. Do not chain.

## Prerequisites

Before starting, ensure you have:

1. **Existing Project Analysis** (CRITICAL):
   - Check if `document-project` was already run
   - If YES → Use existing analysis
   - If NO → Strongly recommend running `document-project` first
   - Benefits: Tech stack documentation, architecture overview, technical debt assessment, API docs

2. **Project Context** (ESSENTIAL):
   - IDE with project already loaded (preferred), OR
   - User-provided project information
   - Existing documentation in `docs/` folder

3. **Deep Understanding Requirement**:
   - MUST thoroughly analyze existing project structure, patterns, constraints
   - Every recommendation MUST be grounded in actual project analysis (not assumptions)
   - Confirm understanding with user before ANY suggestions

## Workflow Overview

```
1. Pre-Flight Check & Analysis
   ├─ Continuation detection (resume incomplete PRD if found)
   ├─ Active input document discovery (briefs, research, context)
   ├─ Check for document-project output
   ├─ Assess scope complexity
   ├─ Analyze existing project structure
   └─ Confirm understanding with user

2. Interactive Brownfield PRD Creation
   ├─ Activate create-doc with brownfield-prd-template
   ├─ Process sections with emphasis on:
   │  ├─ Integration with existing system
   │  ├─ Compatibility requirements
   │  ├─ Risk assessment (technical debt, integration risks)
   │  └─ Incremental, low-risk story sequencing
   └─ Save to docs/prds/prd.[kebab-name]/prd.[kebab-name].md

3. Quality Validation
   ├─ Run pm-checklist
   ├─ Run 4 targeted checks (measurability, leakage, traceability, SMART)
   ├─ Validate integration approach
   └─ Ensure backward compatibility

4. Next Steps
   ├─ Generate handoff prompts
   └─ Provide integration guidance
```

## Detailed Execution Steps

### Step 1: Pre-Flight Check & Analysis

**1a. Continuation Detection (check FIRST):**

Before anything else, scan for an existing in-progress PRD for this feature:

- Check `docs/prd/` and subdirectories for any PRD file related to the enhancement being discussed
- If found, read it and check its `stepsCompleted` frontmatter field (or infer completion from section headings)
- If a PRD is found, determine whether it is incomplete or complete, then report to the user:

**If incomplete:**
```
"I found an existing PRD at [path] that appears to cover [topic].
It looks like [sections X, Y were completed / it was started but not finished].

Options:
[R] Resume — Continue from where it left off
[S] Start fresh — Create a new PRD (existing file will be overwritten)
[V] View — Show me the existing PRD first

What would you like to do?"
```

**If complete (all sections present):**
```
"I found a completed PRD at [path] covering [topic].

Options:
[E] Extend — Add a new epic area to this PRD
[R] Revise — Edit or update an existing section
[S] Start fresh — Create a new PRD
[V] View — Show me the existing PRD first

What would you like to do?"
```

Wait for user selection before proceeding.

**1b. Active Input Document Discovery:**

Scan the project for existing reference documents before asking the user for anything:

- `*brief*.md` — Product or feature briefs
- `*research*.md` — Research or analysis documents
- `docs/prd/**` — Prior PRD artefacts
- `docs/project-context.md` — Project context (loaded automatically)
- `docs/architecture/**` — Architecture documentation

Report findings:

```
"I found the following reference documents:
- Product briefs: [list or 'none found']
- Research docs: [list or 'none found']
- Project context: [list or 'none found']
- Architecture docs: [list or 'none found']

I'll use these to inform the PRD. Are there any other documents
you'd like me to include before we begin?"
```

Load all confirmed documents before proceeding.

**1c. Check for document-project Output:**

```
"Have you run document-project on this codebase? It provides:
- Complete tech stack documentation
- Architecture overview
- API documentation
- Technical debt assessment
- Coding standards

If not available, I STRONGLY recommend running it first for better
enhancement planning."
```

**1e. Analyze Existing Project:**

**If document-project available:**

- Extract from "High Level Architecture" section
- Review "Technical Summary"
- Note "Technical Debt and Known Issues"
- Reference "Workarounds and Gotchas"

**Otherwise:**

- Explore project structure (directories, key files)
- Identify tech stack (languages, frameworks, database)
- Understand architecture patterns
- Note integration points
- Identify technical debt

**1c. Confirm Understanding (CRITICAL):**

For every assumption made about existing project:

```
"Based on my analysis, I understand that [assumption].
Is this correct?"
```

**Examples:**

- "I see you're using NestJS with PostgreSQL and Prisma"
- "Your authentication uses JWT with Passport.js"
- "The codebase follows a modular monolith architecture"

**Do NOT proceed until user validates understanding.**

### Step 2: Interactive Brownfield PRD Creation

**Activate create-doc with brownfield-prd-template:**

```
Use create-doc skill with:
- Template: brownfield-prd-template (resources/brownfield-prd-tmpl.yaml)
- Output: docs/prds/prd.[kebab-name]/prd.[kebab-name].md
- Mode: Interactive (mandatory for brownfield)
```

**Section-by-Section Process:**

#### Section 1: Intro Project Analysis and Context

**Purpose:** Establish existing project understanding

**Subsections:**

**1a. Existing Project Overview:**

- Analysis Source (document-project output | IDE analysis | user-provided)
- Current Project State (what it does, primary purpose)

**1b. Available Documentation Analysis:**

- If document-project run → Reference existing docs
- Otherwise → Check for: Tech stack, architecture, API docs, UI guidelines, technical debt

**1c. Enhancement Scope Definition:**

- Enhancement Type (New Feature | Major Modification | Integration | Performance | UI/UX Overhaul | Stack Upgrade | Bug Fix)
- Enhancement Description (2-3 sentences)
- Impact Assessment (Minimal | Moderate | Significant | Major)

**1d. Goals and Background Context:**

- Goals (bullet list of desired outcomes)
- Background (why needed, what problem solved, how fits with existing project)
- Change Log (version tracking)

**No mandatory elicitation** (but confirm understanding)

#### Section 2: Requirements (MANDATORY ELICITATION)

**Emphasis on:**

- **Integration with existing system**
- **Backward compatibility**
- **Technical debt awareness**

**Subsections:**

**Functional Requirements (FR):**

- What enhancement must do
- How it integrates with existing functionality
- Example: "FR1: The existing Todo List will integrate with the new AI duplicate detection service without breaking current functionality."

**Non-Functional Requirements (NFR):**

- Performance constraints from existing system
- Example: "NFR1: Enhancement must maintain existing performance characteristics and not exceed current memory usage by more than 20%."

**Compatibility Requirements (CR) - CRITICAL FOR BROWNFIELD:**

- CR1: Existing API compatibility
- CR2: Database schema compatibility
- CR3: UI/UX consistency
- CR4: Integration compatibility

**Process:**

1. Draft requirements based on validated project understanding
2. Present with detailed rationale
3. Confirm: "These requirements are based on my understanding of your existing system. Please review carefully and confirm they align with your project's reality."
4. **STOP - Present 1-9 elicitation options**
5. Wait for user response
6. Iterate based on feedback

**❌ Do NOT proceed if:**
- Any FR uses vague language without measurable criteria (e.g., "fast", "easy", "intuitive") — replace with specific, testable statements
- Any FR prescribes implementation technology (e.g., "use React component X") instead of capability
- NFRs lack specific metrics (e.g., "< 200ms response time" not "fast response")
- Compatibility Requirements (CR) section is absent or incomplete

#### Section 3: UI Enhancement Goals (conditional, no mandatory elicitation)

**Condition:** Only if enhancement includes UI changes

**Focus:**

- Integration with existing UI patterns
- Design system consistency
- Modified/new screens only (not complete redesign)
- UI consistency requirements

#### Section 4: Technical Constraints and Integration Requirements

**Replaces separate architecture documentation for brownfield**

**Subsections:**

**Existing Technology Stack:**

- Extract from document-project if available
- Include version numbers and constraints
- Languages, frameworks, database, infrastructure, external dependencies

**Integration Approach:**

- Database integration strategy
- API integration strategy
- Frontend integration strategy
- Testing integration strategy

**Code Organization and Standards:**

- How new code fits existing patterns
- File structure approach
- Naming conventions
- Coding standards
- Documentation standards

**Deployment and Operations:**

- Build process integration
- Deployment strategy
- Monitoring and logging
- Configuration management

**Risk Assessment and Mitigation:**

- Reference technical debt from document-project
- Include "Workarounds and Gotchas"
- Technical risks
- Integration risks
- Deployment risks
- Mitigation strategies

#### Section 5: Epic and Story Structure (MANDATORY ELICITATION)

**Principle:** PRDs are living documents. Assess complexity honestly — multiple epics improve parallelism, reduce coupling, and make delivery more manageable. Do not default to a single epic.

**Step 1 — Complexity Assessment:**

Score the PRD against these 6 signals. Each signal present = 1 point:

| Signal | Description |
|--------|-------------|
| **Domain breadth** | PRD spans 2+ distinct functional areas (e.g. auth + notifications + data sync) |
| **Parallelism opportunity** | Areas can be worked simultaneously by independent streams |
| **Story volume** | Likely 8+ stories total (target 3–6 stories per epic) |
| **Dependency isolation** | Areas have minimal cross-dependencies and can ship independently |
| **Risk isolation** | One area is high-risk and should be isolated to contain impact |
| **Timeline variance** | Different areas have different urgency or delivery milestones |

**Scoring:**
- **0–2 signals** → Single epic is appropriate; document rationale
- **3+ signals** → Propose multiple epics, one per functional area

**Step 2 — For multiple epics:**

1. Propose a named epic breakdown mapping each epic to a PRD functional area
2. Show which stories belong to each epic
3. Identify cross-epic dependencies (if any) and sequencing constraints
4. Present as: *"I recommend [N] epics because [signal list]. Here is the proposed breakdown: [epic list with rationale]."*

**Step 3 — For single epic (must justify):**

If 0–2 signals, document explicitly: *"This PRD scores [N]/6 on the complexity rubric. A single epic is appropriate because [reason]."*

**Step 4 — Elicitation:**

5. **STOP — Present 1-9 elicitation options**
6. Wait for user response before proceeding

**Epic Approach Documentation:**

- Epic breakdown with named epics and their scope
- Complexity signal score and rationale
- Cross-epic dependency map (if multiple epics)

**PRD Extensibility:**

PRDs grow over time — it is expected and normal to add new epics as scope evolves. When working with an existing PRD:

- Check if the user's intent is to **extend** an existing PRD (add a new epic area) rather than create from scratch
- If extending: append the new epic to the existing PRD's Epic and Story Structure section; do not re-create the whole PRD
- The continuation detection step (1a) must offer an **Extend** option for completed PRDs:

```
"This PRD appears complete. Would you like to:
[R] Resume — Continue an incomplete section
[E] Extend — Add a new epic area to this PRD
[S] Start fresh — Create a new PRD"
```

**IMPORTANT - Epic Numbering:**
When epic files are created from this PRD, they will be assigned **globally unique** epic numbers from the system registry (`/docs/development/epic-registry.md`). In the PRD, refer to epics as "Epic 1", "Epic 2", etc. (relative numbers), but the actual epic files will use system-wide unique numbers like `epic.163.md`, `epic.164.md`, etc. This ensures no duplicate epic numbers across the entire project.

#### Section 6: Epic Details (MANDATORY per epic)

**CRITICAL STORY SEQUENCING FOR BROWNFIELD:**

**Rules:**

- Stories MUST ensure existing functionality remains intact
- Each story MUST include verification that existing features still work
- Stories sequenced to minimize risk to existing system
- Include rollback considerations for each story
- Focus on incremental integration (not big-bang changes)
- Size for AI agent execution in existing codebase context

**Confirmation Required:**
"This story sequence is designed to minimize risk to your existing system.
Does this order make sense given your project's architecture and constraints?"

**Story Structure:**

**User Story:**

```
As a [user type],
I want [action],
So that [benefit].
```

**Acceptance Criteria:**

- Define both new functionality AND existing system integrity
- Testable, comprehensive
- Include integration verification

**Integration Verification (IV) - UNIQUE TO BROWNFIELD:**

- IV1: Existing functionality verification
- IV2: Integration point verification
- IV3: Performance impact verification

**Process:**

1. Draft complete epic with all stories
2. Present with rationale (risk minimization approach)
3. **STOP - Present 1-9 elicitation options**
4. Wait for user response
5. Refine based on feedback

**❌ Do NOT proceed if:**
- Any story lacks Integration Verification (IV) criteria
- Story sequence has a step that modifies existing behaviour before verifying current behaviour still works
- Acceptance criteria are not independently testable (no shared pass/fail conditions across stories)
- No rollback consideration is documented for any story that modifies shared infrastructure (DB schema, APIs, auth)

### Step 2.5: Visual Architecture Diagram (conditional, via `mermaid-architect`)

**When to invoke:** if the PRD describes a new system topology, multi-actor flow, or non-trivial integration that would be clearer as a picture than as prose.

**Rule:** a Mermaid diagram is **mandatory only if it enhances understanding** of the spec. Do not pad the PRD with diagrams. If the prose already conveys the structure clearly, skip this step and note "no diagram justified" in the rationale.

**Process:**

1. Invoke `mermaid-architect` with: PRD path, the section being diagrammed (typically "Technical Constraints and Integration Requirements" or a new System Topology subsection), and a list of known integrations / external systems.
2. The skill will run its Discovery & Inquiry Protocol and may halt to ask clarifying questions about error states, actor ambiguity, or missing triggers — answer these inside this step before continuing.
3. The skill returns a Mermaid block (with YAML metadata header) plus a 2-sentence "Architectural assumptions" summary. Paste both into the PRD section.
4. For PRDs, the diagram type is normally **C4 Context / System Topology** (`flowchart` with subgraphs by C4 layer). Do not silently substitute another type.

**Diagram is justified when** any of these are true: 4+ external systems are involved, the PRD introduces a new service boundary, the integration approach has >2 alternatives worth contrasting, or a sibling PRD already uses a topology diagram and consistency matters.

### Step 3: Quality Validation

**Same as greenfield:**

1. Offer to output full PRD
2. Run `pm-checklist` validation
3. Address blockers
4. Insert results into Checklist Results section

**Additional brownfield validation:**

- Verify compatibility requirements comprehensive
- Ensure integration approach sound
- Validate risk assessment includes technical debt
- Confirm story sequencing minimizes existing system risk

**Targeted requirement quality checks (run after pm-checklist):**

Run each check sequentially and report findings before proceeding:

**Check 1 — Measurability:**
Scan every FR for vague adjectives: "easy", "fast", "simple", "intuitive", "user-friendly", "seamless", "quick", "efficient" (without accompanying metrics). Flag each occurrence. Scan every NFR for missing numeric criteria (must have a specific metric, e.g. "< 2s" not "fast"). Report: `[PASS] All requirements measurable` or `[FAIL] Found N vague requirements: [list]`

**Check 2 — Implementation Leakage:**
Scan FRs and NFRs for technology names that prescribe implementation rather than capability: framework names (React, Redux, Prisma), library names, data structure names (JSON, array), cloud provider names (AWS, S3). Exception: names that ARE the capability (e.g. "BSV blockchain", "WebSocket"). Report: `[PASS] No implementation leakage` or `[FAIL] Found leakage in: [list]`

**Check 3 — Traceability:**
For each FR, verify it can be traced to at least one stated Goal in Section 1d. An FR with no goal justification is a scope risk. Report: `[PASS] All FRs traceable to goals` or `[WARN] N FRs lack clear goal traceability: [list]`

**Check 4 — NFR SMART Criteria:**
Each NFR must be: Specific (named metric), Measurable (number or threshold), Achievable (grounded in existing system context), Relevant (explains who it affects), Time-bound or Condition-bound (when it applies). Flag NFRs missing two or more of these. Report: `[PASS] NFRs are SMART` or `[FAIL] N NFRs are not SMART: [list]`

Report total: `Quality checks: X/4 passed`. Address any FAILs before proceeding to next steps.

### Step 4: Next Steps — CRITICAL / BLOCKING

**Always execute this step.** Do not end the skill after Step 3 validation. The handoff prompts are a required output — the PRD is not complete until they are generated.

**Generate handoff prompts:**

- UX Expert Prompt (if UI changes)
- Architect Prompt (emphasizing integration with existing architecture)

**Brownfield-specific guidance:**

- Integration testing strategy
- Rollback procedures
- Monitoring for existing functionality
- Gradual rollout approach

## Key Principles

### Deep Understanding Required

- **Analyze, don't assume** - Ground all recommendations in actual project analysis
- **Confirm understanding** - Validate every assumption with user
- **Respect existing patterns** - Integrate, don't disrupt

### Compatibility First

- **Backward compatibility mandatory** - Existing functionality must not break
- **Integration verification explicit** - Test existing features after each story
- **Risk minimization** - Sequence stories for lowest risk

### Incremental Integration

- **No big-bang changes** - Gradual integration reduces risk
- **Rollback considerations** - Plan for reverting if issues arise
- **Existing system integrity** - Each story validates current functionality

### Technical Debt Awareness

- **Acknowledge existing debt** - Don't ignore known issues
- **Mitigation strategies** - Plan for working around constraints
- **Debt increase minimization** - Don't make debt worse

## Integration with Other Skills

**This skill orchestrates:**

- `create-doc` - Document creation engine
- `brownfield-prd-template` - Brownfield PRD structure
- `pm-checklist` - Quality validation
- `mermaid-architect` - System Topology / C4 Context diagram when the PRD benefits from a visual

**This skill may recommend:**

- `document-project` - If existing project analysis missing
- `shard-prd` - If PRD becomes large
- `create-epics-from-shards` - After sharding

**May use in analysis:**

- Existing architecture docs
- Technical debt documentation
- API documentation

## Success Criteria

A successful brownfield PRD produces:

1. **Deep Project Understanding**
   - Existing architecture analyzed
   - Tech stack documented
   - Technical debt assessed
   - Integration points identified

2. **Comprehensive Requirements**
   - Functional requirements (with integration awareness)
   - Non-functional requirements (existing system constraints)
   - **Compatibility requirements** (backward compatibility ensured)

3. **Risk-Aware Planning**
   - Technical debt incorporated into risk assessment
   - Integration risks identified
   - Mitigation strategies defined
   - Rollback procedures planned

4. **Appropriate Epic Structure**
   - 6-signal complexity assessment completed and documented
   - Multiple epics proposed when 3+ signals present
   - Each epic maps to a distinct functional area
   - PRDs with 3+ domain areas or 8+ stories justify single-epic choice explicitly
   - PRD extensibility acknowledged — future epics can be added without full rewrite

5. **Incremental Story Sequencing**
   - Stories minimize risk to existing system
   - Integration verification explicit
   - Gradual rollout approach
   - Existing functionality protected

7. **Quality Validated**
   - Passed pm-checklist
   - Passed 4 targeted checks (measurability, leakage, traceability, SMART NFRs)
   - Compatibility requirements validated
   - Integration approach sound

8. **Clear Handoffs**
   - Architect prompt (integration-focused)
   - UX Expert prompt (if applicable)
   - Integration testing guidance

## Example Activation

**Natural Language Trigger:**

```
User: "Add biometric authentication to our existing mobile banking app"

→ create-prd activates
→ Checks for document-project output
→ Analyzes existing authentication system
→ Confirms understanding with user
→ Uses create-doc + brownfield-prd-template
→ Emphasizes compatibility requirements
→ Sequences stories for minimal risk
→ Validates with pm-checklist
→ Returns complete brownfield PRD
```

## Common Pitfalls to Avoid

❌ **Assuming project structure** - Must analyze, not guess
❌ **Ignoring technical debt** - Known issues impact enhancement planning
❌ **Big-bang integration** - Incremental approach reduces risk
❌ **Skipping compatibility requirements** - Backward compatibility critical
❌ **Not validating understanding** - Confirm assumptions before proceeding
❌ **Recommending full PRD for small changes** - Use create-epic or brownfield-story for simpler enhancements
❌ **Starting fresh without checking for existing PRD** - Always check for incomplete in-progress work first
❌ **Ignoring existing reference documents** - Scan for briefs, research, context docs before asking the user
❌ **Vague requirements** - "Fast", "easy", "intuitive" are not requirements; replace with measurable criteria
❌ **Implementation leakage** - FRs describe capability, not implementation; no technology names in requirements
❌ **Defaulting to a single epic** - Always run the complexity assessment; complex PRDs warrant multiple epics for parallelism and delivery manageability
❌ **Forcing all epics upfront** - PRDs are living documents; epics can be added as scope evolves — don't block progress waiting for a complete epic list

✅ **Check for existing PRD before starting (offer Extend for completed PRDs)**
✅ **Scan and load all discoverable reference documents first**
✅ **Analyze existing project thoroughly**
✅ **Confirm understanding at every step**
✅ **Run the 6-signal complexity assessment before proposing epic structure**
✅ **Propose multiple epics when 3+ complexity signals are present**
✅ **Emphasize compatibility and integration**
✅ **Sequence stories for risk minimization**
✅ **Validate quality with pm-checklist AND the 4 targeted checks**

## Notes

- Brownfield PRDs require more upfront analysis than greenfield
- Always recommend `document-project` if not already run
- Compatibility Requirements section is unique to brownfield
- Integration Verification in stories is brownfield-specific
- Story sequencing for risk minimization is critical
- Technical debt must be incorporated into planning
