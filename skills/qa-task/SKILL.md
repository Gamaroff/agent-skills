---
name: qa-task
description: Comprehensive quality assurance review for technical tasks. Focuses on success criteria validation, implementation phase verification, and non-functional requirements assessment for infrastructure and refactoring work.
---

# QA Task Review Skill

**Version**: 2.0
**Last Updated**: 2026-03-20
**Skill Type**: Quality Assurance

## Description

This skill guides QA engineers through comprehensive quality assurance reviews for technical tasks (refactoring, infrastructure improvements, technical debt reduction, architectural changes). It adapts the story QA workflow for technical work, focusing on success criteria, implementation phases, and non-functional requirements.

## When to Use This Skill

Activate this skill when:

- ✅ Developer marks technical task as "Ready for QA"
- ✅ All implementation phases completed
- ✅ Tests are passing
- ✅ Breaking changes documented with migration paths
- ✅ Technical task document exists at `docs/development/tasks/task.[id].[name]/task.[id].[name].md`

**Keywords**: `qa task`, `qa-task`, `technical review`, `qa refactoring`, `qa infrastructure`

---

## QA Process Overview

### Workflow Stages

1. **Prerequisites Verification** - Ensure task is ready for QA; check for existing artifacts (re-review logic)
2. **Implementation Review** - Verify all phases completed correctly
3. **Testing Validation** - Run and validate test suite
4. **Success Criteria Assessment** - Check functional, performance, code quality criteria
5. **Breaking Changes Validation** - Verify migration paths documented
6. **NFR Assessment** - Evaluate non-functional requirements
7. **Issue Documentation** - Create bug reports for any issues found
8. **Quality Gate Decision** - PASS/CONCERNS/FAIL/WAIVED

### Key Differences from Story QA

| Aspect           | Story QA            | Technical Task QA                                                 |
| ---------------- | ------------------- | ----------------------------------------------------------------- |
| **Focus**        | Acceptance Criteria | Success Criteria (Functional, Performance, Quality)               |
| **Traceability** | ACs → Tests         | Implementation Phases → Tests                                     |
| **User Impact**  | End-user features   | Developer experience, system quality                              |
| **Migration**    | Not applicable      | Breaking changes require migration paths                          |
| **NFRs**         | Feature-specific    | System-wide (Performance, Reliability, Security, Maintainability) |

---

## Prerequisites

### Task List Initialization

**CRITICAL**: Before starting the review, use `TaskCreate` to register every phase as a tracked task. Mark each `in_progress` before starting and `completed` immediately after finishing. This prevents silently skipping steps.

| Task Subject                    | Description                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------- |
| PR existence check              | Validate PR exists for current branch; store PR metadata                     |
| Check for existing QA artifacts | Detect re-review vs fresh review; read prior gate/report                     |
| Read task document              | Read task file, extract success criteria, phases, breaking changes           |
| Run test suite                  | Execute tests, lint, build; capture coverage output                          |
| Verify implementation phases    | Check each phase checkbox; confirm changes match plan via git diff           |
| Verify success criteria         | Check functional, performance, code quality criteria against actual results  |
| Validate breaking changes       | Verify migration paths documented and consumer code updated                  |
| Run NFR assessment              | Evaluate performance, reliability, security, maintainability                 |
| Run regression testing          | Test dependent areas for regressions                                         |
| Document issues                 | Create bug report files for all HIGH/MEDIUM severity issues found            |
| Write QA report                 | Create co-located `task.{id}.qa.N.*.md` report file                         |
| Write gate YAML                 | Create co-located `task.{id}.gate.N.*.yml` file                             |
| Update task file                | Add QA Results section, update status, link artifacts                        |
| Post PR comment                 | Post QA summary to PR via `gh pr comment` — CRITICAL / BLOCKING             |
| Communicate to user             | Output final summary with gate decision and next steps                       |

---

### PR Existence Check

**CRITICAL**: The qa-task skill requires an active pull request for the current branch. Store PR metadata now — it is needed for the PR comment in Step 14.

```bash
# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Find PR for current branch
PR_JSON=$(gh pr view --json url,state,title,number 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "No pull request found for branch: $CURRENT_BRANCH"
  echo "QA Review requires a pull request to post results."
  echo "Create a PR first, then re-run /qa-task"
  exit 1
fi

PR_URL=$(echo "$PR_JSON" | jq -r '.url')
PR_STATE=$(echo "$PR_JSON" | jq -r '.state')
PR_NUMBER=$(echo "$PR_JSON" | jq -r '.number')
PR_TITLE=$(echo "$PR_JSON" | jq -r '.title')
```

**Handle PR state:**
- **OPEN**: Proceed with review
- **MERGED**: Warn user but continue — comment will be posted to merged PR
- **CLOSED**: Warn user but continue
- **No PR**: HALT and provide guidance

**Store PR_URL, PR_STATE, PR_NUMBER, PR_TITLE** for use in the PR comment step.

---

### Phase 0: Re-Review Logic

**CRITICAL**: Before starting a new review, check if QA artifacts already exist for this task.

1. **Search for existing gate files in the task directory:**

   ```bash
   TASK_DIR=$(dirname "$TASK_FILE")
   LATEST_GATE=$(ls -t "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | head -1)
   ```

2. **If gate file exists, read and analyze:**

   ```bash
   if [ -n "$LATEST_GATE" ]; then
     GATE_STATUS=$(grep '^gate:' "$LATEST_GATE" | awk '{print $2}')
     HAS_ISSUES=$(grep -c '^  - issue:' "$LATEST_GATE" 2>/dev/null || echo 0)
     echo "Found existing QA review: $LATEST_GATE"
     echo "Gate Status: $GATE_STATUS — Issues: $HAS_ISSUES"
   fi
   ```

3. **Decide whether to re-review:**

   **Skip re-review (exit with success message) when:**
   - Gate status is `PASS`
   - AND `top_issues` list is empty
   - Message: "Task already has clean PASS gate with no concerns. Re-review not needed."

   **Perform re-review when ANY of:**
   - Gate status is `CONCERNS`, `FAIL`, or `WAIVED`
   - OR `top_issues` has items (even if gate is PASS)
   - OR no gate file exists (first review)
   - Message: "Performing QA re-review (previous gate: {status} with {count} issues)"

4. **For re-reviews, determine next QA artifact number:**

   ```bash
   LATEST_QA_NUM=$(ls "$TASK_DIR"/task.*.qa.*.md 2>/dev/null | \
                   sed -E 's/.*\.qa\.([0-9]+)\..*/\1/' | \
                   sort -n | tail -1)
   NEXT_QA_NUM=$((${LATEST_QA_NUM:-0} + 1))
   ```

5. **For re-reviews: scope to what changed since last gate.**

   Get the date of the previous gate's `updated:` field and run:

   ```bash
   git log --since="{gate_date}" --name-only --format="" | sort -u
   ```

   Focus re-review on files changed since the last gate. Include a **Re-Review Context** section at the top of the new QA report listing each previous issue and its current status (FIXED / PARTIAL / NOT FIXED).

---

### Adaptive Review Strategy

Before running checks, evaluate the task to choose the review approach:

| Condition | Approach |
|---|---|
| Lite mode (set by `develop-task` orchestrator) | Direct tools only — skip parallel agents |
| Small task (<3 phases, single module, Low risk) | Direct tools — fast, sufficient coverage |
| Re-review (fixing previous issues) | Direct tools — focused scope on specific concerns |
| Large task (>5 phases, multiple modules) | Parallel agents — comprehensive |
| High-risk task (auth, payments, security touched) | Parallel agents — focused on risk areas |
| Default | Direct tools first; spawn agents if gaps found |

Log the chosen approach in the QA report's "Review Methodology" section.

---

## QA Review Process

### Step 1: Prerequisites Check

Verify all prerequisites met:

- [ ] Task document exists at `docs/development/tasks/task.[id].[name]/task.[id].[name].md`
- [ ] Status is "Completed" or "Ready for QA"
- [ ] All implementation phases have checkboxes marked complete
- [ ] Developer has marked success criteria as complete
- [ ] Tests are passing according to task document
- [ ] Breaking changes are documented (if applicable)
- [ ] Code is on the feature branch with an open PR

**If prerequisites NOT met**: Return task to developer with specific items needed. Do not proceed.

### Step 2: Read Task Document

Thoroughly read the task document to understand:
- Motivation and benefits
- Technical background (current state → target state)
- Breaking changes
- Implementation phases
- Success criteria (functional, performance, code quality)
- Testing strategy
- Risk assessment

### Step 3: Verify Implementation Phases

For each phase in the implementation plan:
1. Verify checkboxes are marked complete
2. Review files changed (`git diff origin/develop...HEAD -- {files}`)
3. Confirm changes match the plan
4. Look for potential issues

**Create Phase Completion Table:**

| Phase           | Status      | Test Result | Notes          |
| --------------- | ----------- | ----------- | -------------- |
| Phase 1: {Name} | PASS        | Verified    | {Notes}        |
| Phase 2: {Name} | PASS        | Verified    | {Notes}        |
| Phase 3: {Name} | CONCERNS    | Partial     | {Issues found} |

**Overall Phase Completion**: {X/Y phases passed}

### Step 4: Run Tests

Execute all tests mentioned in the testing strategy:

```bash
# Run tests with coverage
npm exec nx test {project} -- --coverage

# Run build
npm exec nx build {project}

# Run linting
npm exec nx lint {project}

# Run integration tests if applicable
npm exec nx test {project} -- --testPathPattern=integration
```

**Document results:**
- Test pass rate (X/Y tests)
- Coverage percentages (Statements / Branches / Functions / Lines)
- Any test failures
- Build success/failure
- Lint errors

### Step 5: Verify Success Criteria

For each success criterion, compare target vs actual:

**Functional Criteria:**

| Criterion                   | Target | Actual | Status   | Notes |
| --------------------------- | ------ | ------ | -------- | ----- |
| All tests passing           | 100%   | 100%   | PASS     |       |
| No regressions              | 0      | 0      | PASS     |       |
| Breaking changes documented | Yes    | Yes    | PASS     |       |

**Performance Criteria:**

| Criterion         | Target        | Actual | Status | Notes |
| ----------------- | ------------- | ------ | ------ | ----- |
| Write performance | +20-30%       | +25%   | PASS   |       |
| Memory usage      | No leaks      | Clean  | PASS   |       |

**Code Quality Criteria:**

| Criterion              | Target   | Actual   | Status | Notes |
| ---------------------- | -------- | -------- | ------ | ----- |
| Test coverage          | 80%+     | 82%      | PASS   |       |
| Linting                | 0 errors | 0 errors | PASS   |       |
| TypeScript compilation | 0 errors | 0 errors | PASS   |       |
| Documentation          | Updated  | Complete | PASS   |       |

### Step 6: Validate Breaking Changes

For each breaking change documented in the task:

1. Verify it's documented with a migration path
2. Confirm migration path is complete and actionable
3. Verify consumer code is updated (if applicable)
4. Test migration if possible

**If migration path is missing or incomplete**: Create HIGH severity bug report and mark validation as FAIL.

**Breaking Change Assessment Template:**

```
### Breaking Change: {Title}
Documented: Yes / No
Migration Path Provided: Yes / No
Migration Tested: Yes / No
Consumer Code Updated: Yes / No / N/A
Notes: {Validation notes}
```

**Overall Breaking Changes Assessment:** PASS / CONCERNS / FAIL

### Step 7: Assess Non-Functional Requirements

Evaluate each NFR (see NFR Evaluation Criteria section for thresholds):

- **Performance**: Run performance tests; compare with baseline; check for regressions; validate resource usage
- **Reliability**: Test error handling; validate rollback plan; check recovery mechanisms
- **Security**: Review for security issues; check dependencies; validate auth/authorization preserved
- **Maintainability**: Review code clarity; check documentation; assess technical debt impact

### Step 8: Regression Testing

Identify and test areas affected by changes:
- Components that depend on changed code
- APIs that were modified
- Related functionality

Run existing tests and check for unexpected behaviour in adjacent areas.

### Step 9: Document Issues

For each HIGH or MEDIUM severity issue found:
1. Create bug report: `task.{id}.bug.{number}.{descriptive-name}.md` (co-located in task directory)
2. Assign severity (HIGH/MEDIUM/LOW)
3. Link bug report in QA report

**LOW severity issues**: Document in QA report only — no separate bug file needed.

**Bug Report Structure:**

```markdown
# Bug Report: Task {ID} - {Bug Title}

**Task**: [Link](./task.{id}.{name}.md)
**Bug ID**: TASK-{id}-BUG-{number}
**Severity**: HIGH/MEDIUM/LOW
**Priority**: P0/P1/P2/P3
**Status**: New
**Found By**: QA Engineer
**Date Found**: {Date}

## Description
{Clear description of the issue}

## Steps to Reproduce
{If applicable}

## Expected Behavior
{What should happen}

## Actual Behavior
{What actually happens}

## Impact
{Impact on system/deployment}

## Recommendation
{How to fix}
```

### Step 10: Create Quality Gate File

Create gate file co-located with the task document:

**Location**: `{task-directory}/task.{id}.gate.{number}.{descriptive-name}.yml`

**Gate YAML Schema:**

```yaml
schema: 1
task: 'task.{id}.{name}'
task_title: '{task title}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: '1-2 sentence explanation of gate decision'
reviewer: 'QA Engineer'
updated: '{ISO-8601 timestamp}'

top_issues: [] # Empty if no issues; list issues for CONCERNS/FAIL

waiver:
  active: false # Set true only for WAIVED, with reason and approver

quality_score: 95 # 100 - (20 × FAILs) - (10 × CONCERNS), bounded 0–100

evidence:
  tests_reviewed: { count }
  phases_verified: { X/Y }
  trace:
    phases_covered: [1, 2, 3]
    phases_with_issues: []

nfr_validation:
  security:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  performance:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  reliability:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  maintainability:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'

recommendations:
  immediate: # Blocking issues — must fix before merge
    - action: '{Description}'
      refs: ['{file.ts}']
  future: # Non-blocking — address later
    - action: '{Description}'
      refs: ['{file.ts}']

deployment_readiness:
  staging: APPROVED|CONDITIONAL|BLOCKED
  production: APPROVED|CONDITIONAL|BLOCKED
  conditions: [] # List conditions if CONDITIONAL
```

**Deterministic gate decision rules (apply in order):**

1. If any `top_issues.severity == high` → Gate = FAIL (unless waived)
2. Else if any `severity == medium` → Gate = CONCERNS
3. If any NFR status is FAIL → Gate = FAIL
4. Else if any NFR status is CONCERNS → Gate = CONCERNS
5. Else → Gate = PASS

**WAIVED** only when `waiver.active: true` with documented reason and approver.

### Step 11: Write QA Report

Create QA report co-located with the task document:

**Location**: `{task-directory}/task.{id}.qa.{number}.{descriptive-name}.md`

**QA Report Structure:**

```markdown
# QA Report: Task {ID} - {Title}

**Task**: [Link to task document](./task.{id}.{name}.md)
**Gate File**: [task.{id}.gate.{number}.{name}.yml](./task.{id}.gate.{number}.{name}.yml)
**QA Engineer**: QA Engineer
**Review Date**: {Date}
**Testing Completed**: {Date}
**Gate Status**: PASS/CONCERNS/FAIL

---

## Executive Summary

{2-3 sentence summary of testing scope and overall assessment}

**Overall Assessment**: {PASS/CONCERNS/FAIL}
**Deployment Recommendation**: {APPROVED/BLOCKED/CONDITIONAL}

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (if applicable)
- [x] Code on feature branch with open PR

### Testing Approach

- [ ] Manual Testing
- [ ] Automated Testing (unit, integration, e2e)
- [ ] Performance Testing
- [ ] Regression Testing
- [ ] Security Review
- [ ] Code Review

### Review Methodology

{Direct tools / parallel agents / hybrid — rationale}

---

## Implementation Verification

{Phase Completion Table — see Step 3}

---

## Success Criteria Verification

{Functional / Performance / Code Quality tables — see Step 5}

---

## Breaking Changes Validation

{Per-change validation — see Step 6}

---

## Issues Found

### HIGH Severity Issues ({X})

**Issue: {Title}**
- **Severity**: HIGH
- **Category**: Functional/Performance/Security/Quality
- **Bug Report**: [task.{id}.bug.{N}.{name}.md](./task.{id}.bug.{N}.{name}.md)
- **Observation**: {What was observed}
- **Impact**: {Impact on system/deployment}
- **Recommendation**: {How to fix}
- **Priority**: P0/P1

### MEDIUM Severity Issues ({X})
{Same structure as HIGH}

### LOW Severity Issues ({X})
{Description only — no separate bug file}

**Total Issues**: HIGH: X, MEDIUM: Y, LOW: Z

---

## NFR Assessment

### Performance — PASS/CONCERNS/FAIL
{Criteria evaluated, findings, recommendations}

### Reliability — PASS/CONCERNS/FAIL
{Criteria evaluated, findings, recommendations}

### Security — PASS/CONCERNS/FAIL
{Criteria evaluated, findings, recommendations}

### Maintainability — PASS/CONCERNS/FAIL
{Criteria evaluated, findings, recommendations}

---

## Regression Testing

{Test areas checked; PASS/CONCERNS/FAIL per area}

---

## Test Artifacts

### Files Reviewed
{List of key files reviewed}

### Test Commands Executed
```bash
{Commands used}
```

### Coverage Report
Statements: X% | Branches: Y% | Functions: Z% | Lines: W%

---

## Recommendations

### Immediate Actions (Blocking)
1. {Issue and priority}

### Short-term Actions (Non-Blocking)
1. {Improvement}

---

## Final Assessment

**Gate Status**: PASS / CONCERNS / FAIL / WAIVED
**Rationale**: {Explanation}
**Quality Score**: {score}/100

**Deployment Recommendation**: APPROVED / CONDITIONAL / BLOCKED
**Conditions** (if conditional): {List}

---

**QA Report**: co-located at `task.{id}.qa.{number}.{name}.md`
**Gate File**: co-located at `task.{id}.gate.{number}.{name}.yml`
**Next Steps**: {fixes / deployment / follow-up}
```

### Step 12: Update Task File

Add a QA Results section to the task document:

```markdown
## QA Testing Results

**QA Status**: PASS / CONCERNS / FAIL
**QA Engineer**: QA Engineer
**Testing Date**: {Date}
**Quality Score**: {score}/100
**Gate Decision**: PASS/CONCERNS/FAIL/WAIVED

### QA Report
- **Full Report**: [task.{id}.qa.{N}.{name}.md](./task.{id}.qa.{N}.{name}.md)
- **Gate File**: [task.{id}.gate.{N}.{name}.yml](./task.{id}.gate.{N}.{name}.yml)

### Test Coverage Summary
- **Tests Executed**: {count}
- **Phases Verified**: {X/Y}
- **Critical Issues**: {count}
- **NFR Status**: Security: {STATUS}, Performance: {STATUS}, Reliability: {STATUS}, Maintainability: {STATUS}

### Key Findings
{Brief summary, or "No critical issues identified"}
```

**Update task status based on gate decision:**
- PASS or CONCERNS → Status: "Completed" (with notes about concerns if applicable)
- FAIL → Status: "In Progress" (requires fixes before re-review)
- WAIVED → Status: "Completed" (with waiver notes)

### Step 13: Post PR Comment — CRITICAL / BLOCKING

**This step is mandatory. The review is NOT complete until the PR comment is confirmed posted. Do not skip, defer, or treat as optional.**

Use the PR metadata stored in the Prerequisites step. Run:

```bash
gh pr comment "$PR_URL" --body "## QA Review: {GATE_DECISION}

**Gate Decision**: {PASS/CONCERNS/FAIL}
**Quality Score**: {score}/100
**Reviewer**: QA Engineer
**Date**: {date}
**PR**: #{PR_NUMBER} - {PR_TITLE}

---

### QA Artifacts

- **QA Report**: task.{id}.qa.{N}.{name}.md
- **Gate File**: task.{id}.gate.{N}.{name}.yml

### Summary

- **Tests Executed**: {count}
- **Phases Verified**: {X/Y}
- **NFR Status**: Security: {STATUS}, Performance: {STATUS}, Reliability: {STATUS}, Maintainability: {STATUS}
- **Issues Found**: HIGH: {X}, MEDIUM: {Y}, LOW: {Z}

### Critical Issues

{List critical issues, or 'None identified'}

### Deployment Recommendation

**Status**: {APPROVED/CONDITIONAL/BLOCKED}
**Conditions**: {Any conditions, or 'None'}

### Next Steps

1. {Step 1}
2. {Step 2}

---
Generated by qa-task skill"
```

**Verify the comment was posted**: Confirm `gh pr comment` exited with code 0. If it fails, report the error to the user and retry or provide the comment body for manual posting. **Do NOT proceed to Step 14 until the comment is confirmed posted.**

### Step 14: Communicate to User — CRITICAL / BLOCKING

**Always output a completion summary. Do not end the skill silently.** Required output:
- Gate decision and quality score
- Top issues summary (or "No issues found")
- Explicit next steps for the developer
- Paths to QA report and gate file

---

## Review Completion Checklist

**Tick off each item before marking the review done:**

- [ ] All prerequisite checks passed (PR exists, task ready for QA)
- [ ] Re-review logic executed (Phase 0 — skip or re-review decided)
- [ ] Task document read; success criteria extracted
- [ ] Tests executed and results documented
- [ ] All implementation phases verified
- [ ] Success criteria checked (functional, performance, code quality)
- [ ] Breaking changes validated (or marked N/A)
- [ ] NFRs assessed (Performance, Reliability, Security, Maintainability)
- [ ] Regression testing completed
- [ ] Bug report files created for all HIGH/MEDIUM issues (if any)
- [ ] QA report file created and saved (co-located with task)
- [ ] Gate YAML file created and saved (co-located with task)
- [ ] Task file `## QA Testing Results` section updated with gate status and artifact links
- [ ] Task status updated per gate decision
- [ ] PR comment posted via `gh pr comment "$PR_URL"` (Step 13 — BLOCKING): confirm exit code 0
- [ ] User notified with gate decision, issues summary, and next steps (Step 14 — BLOCKING)

---

## Re-Review After Bug Fixes

When bug fixes are applied after a CONCERNS or FAIL gate, determine the appropriate review scope:

**Full re-review when:**
- Complex fixes with new functionality added
- Multiple iteration cycles (>2 fix attempts)
- Performance testing additions
- Stakeholder audit requirement

**Quick verification when:**
- Trivial fixes (<30 minutes, e.g. 1-line deletion, assertion update)
- Lint corrections (no logic changes)
- Simple test updates (updating assertions only)

**What gets updated after fixes:**

1. **Bug Reports** (updated during fix by developer): status New → In Progress → Ready for QA → Closed
2. **QA Report** (append a "Bug Resolution Summary" section after all bugs fixed):
   - List each bug fixed with verification result
   - Update gate status and deployment recommendation
3. **Gate YAML** (update in place — do not create a new file unless significant re-testing occurred):
   - Update `gate` field (e.g. CONCERNS → PASS)
   - Update `status_reason`
   - Update `updated` timestamp
   - Add `status: closed` and `fixed_date` to each resolved issue in `top_issues`
   - Update `quality_score`
   - Add `bug_resolution` section
4. **Task Document**: Update success criteria checkboxes if now met

**Example gate update after fixes:**

```yaml
gate: PASS  # Was: CONCERNS
status_reason: 'Bugs #1 and #2 fixed. Tests passing, lint clean.'
updated: '2026-03-20T14:30:00Z'

top_issues:
  - issue: 'Test expects removed tier'
    severity: medium
    bug_ref: 'task.1.bug.1.test-failure.md'
    status: closed
    fixed_date: '2026-03-20'
    suggested_owner: dev

quality_score: 90  # Was: 70

bug_resolution:
  bugs_fixed: 2
  bugs_remaining: 0
  fix_date: '2026-03-20'
  total_iterations: 1
  verification_method: 'Automated tests + lint'
```

---

## Issue Severity Guidelines

### HIGH Severity

- Blocks deployment or causes system instability
- Breaking changes without migration path
- Critical tests failing
- Security vulnerabilities
- Data loss risk
- Performance regressions > 20%

### MEDIUM Severity

- Should be fixed before deployment but not blocking
- Impacts developer experience
- Non-critical test failures
- Performance concerns
- Code quality issues

### LOW Severity

- Nice to fix but not urgent
- Cosmetic issues
- Minor documentation gaps
- Code style inconsistencies

---

## NFR Evaluation Criteria

### Performance

| Assessment | Conditions |
|---|---|
| PASS | Meets or exceeds targets; no regressions in critical paths; resource usage acceptable |
| CONCERNS | Minor regressions (<10%); resource usage higher than expected; performance not fully tested |
| FAIL | Significant degradation (>20%); memory leaks; unacceptable resource consumption |

### Reliability

| Assessment | Conditions |
|---|---|
| PASS | Comprehensive error handling; graceful degradation; rollback plan validated |
| CONCERNS | Some error cases unhandled; rollback plan not fully tested |
| FAIL | Poor error handling; no rollback plan; system instability |

### Security

| Assessment | Conditions |
|---|---|
| PASS | No new vulnerabilities; security best practices followed; dependencies up to date |
| CONCERNS | Minor security concerns; some dependency vulnerabilities; security not fully tested |
| FAIL | Critical vulnerabilities; sensitive data exposed; authentication/authorization broken |

### Maintainability

| Assessment | Conditions |
|---|---|
| PASS | Code is clear and well-documented; tests comprehensive; technical debt reduced |
| CONCERNS | Some documentation gaps; test coverage below target; increased complexity |
| FAIL | Code unclear or unmaintainable; no tests; significant technical debt added |

---

## File Naming and Location

```
# Task Subdirectory — all QA artifacts co-located with task file
docs/development/tasks/task.1.cache-lib-simplification/
├── task.1.cache-lib-simplification.md          # Main task document
├── task.1.qa.1.cache-lib-simplification.md     # QA report (co-located)
├── task.1.gate.1.cache-lib-simplification.yml  # Gate file (co-located)
├── task.1.bug.1.memory-leak.md                 # Bug report 1 (co-located)
└── task.1.bug.2.test-failure.md                # Bug report 2 (co-located)
```

**Note**: The legacy pattern of storing gate files in `docs/qa/gates/tasks/` is deprecated. All gate files must be co-located with the task file.

---

## Common Patterns

### Pattern 1: All Tests Passing, No Issues

**Gate Decision**: PASS — document successful completion; post PR comment with APPROVED recommendation.

### Pattern 2: Minor Issues Found

**Gate Decision**: CONCERNS — list conditions; set deployment as CONDITIONAL; communicate non-blocking issues.

### Pattern 3: Critical Issues Found

**Gate Decision**: FAIL — list blocking issues clearly; set deployment as BLOCKED; work with developer on fix plan.

### Pattern 4: Issues Acknowledged by Team

**Gate Decision**: WAIVED — document rationale, reason, and approver; set `waiver.active: true` in gate YAML.

---

## Integration with Development Workflow

### Developer → QA Handoff

**Developer Actions:**
1. Complete all implementation phases and mark checkboxes
2. Ensure tests passing
3. Update task status to "Ready for QA"
4. Ensure PR exists

**QA Actions:**
1. Run this skill
2. Post results to PR (Step 13)
3. Return to developer if FAIL; proceed to finalise if PASS/CONCERNS

### QA → Developer Handoff (Issues Found)

**QA Actions:**
1. Create bug reports for all HIGH/MEDIUM issues
2. Link bugs in QA report
3. Mark gate as FAIL or CONCERNS
4. Post PR comment (Step 13)

**Developer Actions:**
1. Review bug reports
2. Fix issues
3. Re-run qa-task (Phase 0 auto-detects re-review need)

---

## Additional Resources

- **Technical Task Skill**: `.claude/skills/create-task/SKILL.md`
- **QA Planning Skill**: `.claude/skills/qa-planning/SKILL.md`
- **QA Gate Skill**: `.claude/skills/qa-gate/SKILL.md`
- **Create Bug Report Skill**: `.claude/skills/create-bug-report/SKILL.md`
- **Fix QA Skill**: `.claude/skills/qa-fix/SKILL.md`

---

**Last Updated**: 2026-03-20
**Version**: 2.0
**Maintainer**: Goji QA Team
