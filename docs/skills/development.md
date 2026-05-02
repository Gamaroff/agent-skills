# Development Skills

Development skills implement the BMAD (Build, Measure, Adapt, Deploy) methodology adapted for Claude Code, providing story-driven development workflows with comprehensive quality gates.

For the full chain see [Workflows](../workflows.md#bmad-development-pipeline).

## `develop`

**Purpose:** Main story implementation workflow with BMAD methodology.

**When to use:**

- Implementing user stories from `docs/stories/`
- Starting new feature development
- Working through task sequences with tests
- Preparing code for review

**Key features:**

- **Story-Driven Development** — stories contain all needed context
- **Authorized Updates** — only specific story sections (Tasks, Dev Agent Record, File List, Change Log, Status)
- **Blocking Conditions** — HALT for unapproved deps, ambiguous requirements, repeated failures
- **Completion Process** — Tasks → Tests → Validations → execute-checklist → Ready for Review

**Workflow order:**

```
1. Read task → Implement → Write tests → Execute validations
2. If ALL pass → Update task checkbox [x]
3. Update story File List
4. Repeat until complete
5. Run execute-checklist for story-dod-checklist
6. Set status 'Ready for Review'
```

**Related:** Works with `fix-qa` (QA feedback) and `validate-story` (pre-implementation validation).

---

## `fix-qa`

**Purpose:** Systematically implement fixes based on QA feedback.

**When to use:**

- QA has created gate file (PASS/CONCERNS/FAIL/WAIVED)
- QA assessments available (test design, traceability, risk, NFR)
- Need to close coverage gaps
- Addressing high-severity issues

**Activation:** "Fix QA for story 2.2" / "Implement QA feedback"

**Priority order (deterministic, risk-first):**

1. High severity items (security/performance/reliability)
2. NFR FAIL statuses → then CONCERNS
3. Test design coverage_gaps (P0 scenarios first)
4. Trace uncovered requirements (AC-level gaps)
5. Risk must_fix recommendations
6. Medium/low severity issues

**Workflow:**

```
0. Load config & locate story
1. Collect QA findings (gate YAML + assessments)
2. Build deterministic fix plan
3. Apply code/test changes
4. Validate (lint + tests passing)
5. Update story file (authorized sections only)
6. DO NOT edit gate files (QA ownership)
```

**Authorized story updates:**

- Tasks/Subtasks checkboxes
- Dev Agent Record (model, debug log, completion notes, file list)
- Change Log
- Status (Ready for Done if PASS + gaps closed, else Ready for Review)

**Outputs:** code fixes, tests, updated story sections.

**Related:** Called by `develop`; works with QA gate files from `qa-gate`.

---

## `validate-story`

**Purpose:** Pre-implementation story validation with anti-hallucination focus.

**When to use:**

- Before starting development
- Product managers/scrum masters need validation
- Ensuring story completeness and accuracy
- Getting implementation readiness assessment

**Activation:** "Validate story 2.2" / "Is this story ready for implementation?"

**10 validation steps:**

1. Template Completeness (all sections, no placeholders)
2. File Structure & Source Tree (paths, directories, sequence)
3. UI/Frontend Completeness (components, styling, interactions)
4. Acceptance Criteria Satisfaction (coverage, testability, edge cases)
5. Validation & Testing Instructions (test approach, scenarios)
6. Security Considerations (auth, data protection, vulnerabilities)
7. Tasks/Subtasks Sequence (order, dependencies, granularity)
8. **Anti-Hallucination Verification** (source traceability, no invented details)
9. Dev Agent Implementation Readiness (self-contained context)
10. Generate Validation Report (GO/NO-GO decision)

**Report sections:**

- Template Compliance Issues
- Critical Issues (Must Fix - Story Blocked)
- Should-Fix Issues (Important Quality)
- Nice-to-Have Improvements (Optional)
- **Anti-Hallucination Findings** (unverifiable claims, invented libraries)
- Final Assessment (GO/NO-GO, 1-10 readiness score, confidence level)

**Example output:**

```
Decision: NO-GO
Implementation Readiness Score: 4/10
Confidence Level: Low

Critical Issues (2):
- Missing API endpoint specification
- AC4 not covered by tasks

Anti-Hallucination Findings (1):
- Invented library "react-native-navigation-pro" not in tech stack
```

**Related:** Use before `develop`; complements `qa-planning`.
