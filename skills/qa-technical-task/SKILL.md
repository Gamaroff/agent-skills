---
name: qa-technical-task
description: Comprehensive quality assurance review for technical tasks. Focuses on success criteria validation, implementation phase verification, and non-functional requirements assessment for infrastructure and refactoring work.
---

# QA Technical Task Review Skill

**Version**: 1.0
**Last Updated**: 2025-10-31
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

**Keywords**: `qa technical task`, `technical review`, `qa refactoring`, `qa infrastructure`

---

## QA Process Overview

### Workflow Stages

1. **Prerequisites Verification** - Ensure task is ready for QA
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

## Prerequisites Verification

### Before Starting QA Review

**Check the following**:

- [ ] Task document exists at `docs/development/tasks/task.[id].[name]/task.[id].[name].md`
- [ ] Status is "Completed" or "Ready for QA"
- [ ] All implementation phases have checkboxes marked complete
- [ ] Developer has marked success criteria as complete
- [ ] Tests are passing according to task document
- [ ] Breaking changes are documented (if applicable)
- [ ] Code is merged to appropriate branch

**If Prerequisites NOT Met**:

- Do not proceed with QA review
- Return task to developer with specific prerequisites needed
- Update task status to "In Progress" or "Blocked"

---

## QA Report Template for Technical Tasks

### File Naming Convention

**QA Report**: `task.[id].qa.[number].[descriptive-name].md` (co-located in task subdirectory)
**Quality Gate**: `docs/qa/gates/tasks/task.[id].gate.[number].[descriptive-name].yml` (separate gates directory)
**Bug Reports**: `task.[id].bug.[number].[descriptive-name].md` (co-located in task subdirectory)

**Example**:

```
# Task Subdirectory Structure
docs/development/tasks/task.1.cache-lib-simplification/
├── task.1.cache-lib-simplification.md          # Main task document
├── task.1.qa.1.cache-lib-simplification.md     # QA report (co-located)
├── task.1.bug.1.memory-leak.md                 # Bug report (co-located)
└── task.1.bug.2.test-failure.md                # Additional bugs (co-located)

# Quality Gate (separate directory)
docs/qa/gates/tasks/task.1.gate.1.cache-lib-simplification.yml
```

### QA Report Structure

```markdown
# QA Report: Technical Task {TASK-ID} - {Title}

**Task**: [Link to task document](./task.{id}.{name}.md)
**Gate File**: ../../../../qa/gates/tasks/task.{id}.gate.{number}.{descriptive-name}.yml
**QA Engineer**: QA Engineer
**Review Date**: {Date}
**Testing Completed**: {Date}
**Gate Status**: ✅/⚠️/❌ **PASS/CONCERNS/FAIL**

---

## Executive Summary

{2-3 sentence summary of testing scope and overall assessment}

**Overall Assessment**: {PASS/CONCERNS/FAIL}
**Deployment Recommendation**: {APPROVED/BLOCKED/CONDITIONAL}

---

## Testing Scope

### Prerequisites Verified ✅

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing according to task document
- [x] Breaking changes documented (if applicable)
- [x] Code merged to appropriate branch

### Testing Approach

- [ ] Manual Testing
- [ ] Automated Testing (unit, integration, e2e)
- [ ] Performance Testing
- [ ] Regression Testing
- [ ] Security Review
- [ ] Code Review

### Review Methodology

{Describe how the review was conducted}

---

## Implementation Verification

### Phase Completion Status

| Phase           | Status      | Test Result | Notes          |
| --------------- | ----------- | ----------- | -------------- |
| Phase 1: {Name} | ✅ PASS     | Verified    | {Notes}        |
| Phase 2: {Name} | ✅ PASS     | Verified    | {Notes}        |
| Phase 3: {Name} | ⚠️ CONCERNS | Partial     | {Issues found} |

**Overall Phase Completion**: {X/Y phases passed}

---

## Success Criteria Verification

### Functional Criteria

| Criterion                   | Target | Actual | Status      | Notes                    |
| --------------------------- | ------ | ------ | ----------- | ------------------------ |
| All tests passing           | 100%   | 98%    | ⚠️ CONCERNS | 2 tests failing          |
| No regressions              | 0      | 0      | ✅ PASS     | No regressions detected  |
| Breaking changes documented | Yes    | Yes    | ✅ PASS     | Complete migration guide |

**Functional Assessment**: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL

### Performance Criteria

| Criterion         | Target        | Actual | Status  | Notes             |
| ----------------- | ------------- | ------ | ------- | ----------------- |
| Write performance | +20-30%       | +25%   | ✅ PASS | Target met        |
| Read performance  | No regression | +5%    | ✅ PASS | Improved          |
| Memory usage      | No leaks      | Clean  | ✅ PASS | No leaks detected |

**Performance Assessment**: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL

### Code Quality Criteria

| Criterion              | Target   | Actual   | Status  | Notes               |
| ---------------------- | -------- | -------- | ------- | ------------------- |
| Test coverage          | 80%+     | 82%      | ✅ PASS | Coverage maintained |
| Linting                | 0 errors | 0 errors | ✅ PASS | Clean               |
| TypeScript compilation | 0 errors | 0 errors | ✅ PASS | Builds successfully |
| Documentation          | Updated  | Complete | ✅ PASS | CHANGELOG added     |

**Code Quality Assessment**: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL

---

## Breaking Changes Validation

{For each breaking change documented in task}

### Breaking Change 1: {Title}

**Documented**: ✅ Yes / ❌ No
**Migration Path Provided**: ✅ Yes / ❌ No
**Migration Tested**: ✅ Yes / ❌ No
**Consumer Code Updated**: ✅ Yes / ❌ No / N/A

**Notes**: {Validation notes}

**Overall Breaking Changes Assessment**: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL

---

## Issues Found

### HIGH Severity Issues ({X})

**Issue 1: {Title}**

- **Severity**: HIGH
- **Category**: {Functional/Performance/Security/Quality}
- **Bug Report**: [task.{id}.bug.{number}.{description}.md](./task.{id}.bug.{number}.{description}.md)
- **Observation**: {What was observed}
- **Impact**: {Impact on system/users}
- **Recommendation**: {How to fix}
- **Priority**: P0/P1

### MEDIUM Severity Issues ({X})

{Same structure as HIGH}

### LOW Severity Issues ({X})

{Same structure as HIGH}

**Total Issues**: {HIGH: X, MEDIUM: Y, LOW: Z}

---

## NFR Assessment

### Performance ✅/⚠️/❌

**Status**: PASS / CONCERNS / FAIL

**Criteria Evaluated**:

- [ ] Response time targets met
- [ ] Throughput requirements met
- [ ] Resource utilization acceptable
- [ ] No performance regressions
- [ ] Load/stress testing completed (if applicable)

**Findings**:
{Detailed performance findings}

**Recommendations**:
{Performance improvement recommendations if needed}

---

### Reliability ✅/⚠️/❌

**Status**: PASS / CONCERNS / FAIL

**Criteria Evaluated**:

- [ ] Error handling comprehensive
- [ ] Failure modes tested
- [ ] Recovery mechanisms validated
- [ ] Graceful degradation verified
- [ ] Rollback plan validated

**Findings**:
{Detailed reliability findings}

**Recommendations**:
{Reliability improvement recommendations if needed}

---

### Security ✅/⚠️/❌

**Status**: PASS / CONCERNS / FAIL

**Criteria Evaluated**:

- [ ] No new security vulnerabilities introduced
- [ ] Dependency vulnerabilities addressed
- [ ] Sensitive data handling appropriate
- [ ] Authentication/authorization preserved
- [ ] Security best practices followed

**Findings**:
{Detailed security findings}

**Recommendations**:
{Security improvement recommendations if needed}

---

### Maintainability ✅/⚠️/❌

**Status**: PASS / CONCERNS / FAIL

**Criteria Evaluated**:

- [ ] Code clarity and readability
- [ ] Documentation completeness
- [ ] Test coverage adequate
- [ ] Complexity manageable
- [ ] Technical debt reduced (not increased)

**Findings**:
{Detailed maintainability findings}

**Recommendations**:
{Maintainability improvement recommendations if needed}

---

## Regression Testing

### Regression Test Results

**Scope**: {Areas tested for regressions}

| Test Area | Status      | Notes          |
| --------- | ----------- | -------------- |
| {Area 1}  | ✅ PASS     | No regressions |
| {Area 2}  | ⚠️ CONCERNS | {Issues found} |

**Overall Regression Assessment**: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL

---

## Test Artifacts

### Files Reviewed
```

{List of key files reviewed during QA}

````

### Test Commands Executed

```bash
{Commands used for testing}
npx nx test cache-lib --coverage
npx nx build cache-lib
npx nx lint cache-lib
````

### Coverage Report

**Coverage Summary**:

```
Statements: X%
Branches: Y%
Functions: Z%
Lines: W%
```

**Coverage Assessment**: ✅ Meets target / ⚠️ Below target

---

## Recommendations

### Immediate Actions (Blocking Issues)

{List of critical issues that must be fixed before deployment}

1. **Fix {Issue}**: {Description and priority}
2. **Address {Issue}**: {Description and priority}

### Short-term Actions (Non-Blocking)

{List of improvements that should be addressed soon but don't block deployment}

1. **Improve {Area}**: {Description}
2. **Enhance {Feature}**: {Description}

### Long-term Improvements

{Nice-to-have improvements for future work}

1. **Consider {Improvement}**: {Description}

---

## Final Assessment

### Gate Status: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL / 🚫 WAIVED

**Rationale**: {Detailed explanation of gate decision}

**Blocking Issues**: {List of issues that must be resolved}

- {Issue 1}
- {Issue 2}

**Non-Blocking Issues**: {List of issues that should be addressed but don't block deployment}

- {Issue 1}
- {Issue 2}

---

### Deployment Recommendation: ✅ APPROVED / ❌ BLOCKED / ⚠️ CONDITIONAL

**Conditions** (if conditional):

- {Condition 1}
- {Condition 2}

**Deployment Readiness**: {Assessment of deployment readiness}

---

### Dev Agent Record

{If bugs were found and fixed using fix-qa skill}

**Bugs Fixed**:

- [task.{id}.bug.{number}.{description}.md](./task.{id}.bug.{number}.{description}.md) - {Status}

**Agent Transcript**: {Link to agent transcript if applicable}

---

**QA Report Reference**: `docs/development/tasks/task.{id}.{descriptive-name}/task.{id}.qa.{number}.{descriptive-name}.md`
**Gate File**: `docs/qa/gates/tasks/task.{id}.gate.{number}.{descriptive-name}.yml`
**Next Steps**: {What happens next - fixes, deployment, follow-up}

````

---

## QA Review Process

### Step 1: Prerequisites Check

**Action**: Verify all prerequisites met (see Prerequisites Verification section)

**If NOT Ready**:
1. Return to developer with specific missing items
2. Do not proceed with QA
3. Update task status

### Step 2: Read Task Document

**Action**: Thoroughly read the task document to understand:
- Motivation and benefits
- Technical background (current state → target state)
- Breaking changes
- Implementation phases
- Success criteria
- Testing strategy
- Risk assessment

**Questions to Ask**:
- Is the scope clear?
- Are breaking changes well-documented?
- Are success criteria measurable?
- Is the testing strategy comprehensive?

### Step 3: Verify Implementation Phases

**Action**: Go through each phase in the implementation plan

**For Each Phase**:
1. Verify checkboxes are marked complete
2. Review files changed (use git diff if needed)
3. Confirm changes match plan
4. Look for potential issues

**Create Phase Completion Table**:
- List each phase
- Mark status (PASS/CONCERNS/FAIL)
- Add notes for any concerns

### Step 4: Run Tests

**Action**: Execute all tests mentioned in testing strategy

**Commands**:
```bash
# Run tests
npx nx test {library} --coverage

# Run build
npx nx build {library}

# Run linting
npx nx lint {library}

# Run integration tests if applicable
npx nx test {app} --testPathPattern=integration
````

**Document Results**:

- Test pass rate
- Coverage percentages
- Any test failures
- Build success/failure
- Lint errors

### Step 5: Verify Success Criteria

**Action**: Check each success criterion against actual results

**For Each Criterion**:

1. Compare target vs actual
2. Mark as PASS/CONCERNS/FAIL
3. Add notes explaining status

**Create Success Criteria Tables**:

- Functional criteria
- Performance criteria
- Code quality criteria

### Step 6: Validate Breaking Changes

**Action**: For each breaking change:

1. Verify it's documented in task document
2. Check migration path is provided
3. Confirm migration path is complete
4. Verify consumer code updated (if applicable)
5. Test migration if possible

**If Migration Path Missing or Incomplete**:

- Create HIGH severity bug report
- Mark breaking change validation as FAIL

### Step 7: Assess Non-Functional Requirements

**Action**: Evaluate each NFR:

**Performance**:

- Run performance tests
- Compare with baseline
- Check for regressions
- Validate resource usage

**Reliability**:

- Test error handling
- Validate rollback plan
- Check recovery mechanisms

**Security**:

- Review for security issues
- Check dependencies for vulnerabilities
- Validate authentication/authorization

**Maintainability**:

- Review code clarity
- Check documentation
- Assess technical debt impact

**For Each NFR**:

- Mark status (PASS/CONCERNS/FAIL)
- Document findings
- Provide recommendations

### Step 8: Regression Testing

**Action**: Test areas that might be affected by changes

**Identify Regression Areas**:

- Components that depend on changed code
- APIs that were modified
- Related functionality

**Test for Regressions**:

- Run existing tests
- Manual testing of affected areas
- Check for unexpected behavior

### Step 9: Document Issues

**Action**: For each issue found:

1. Create bug report using create-bug-report skill
2. Name: `task.{id}.bug.{number}.{descriptive-name}.md`
3. Assign severity (HIGH/MEDIUM/LOW)
4. Link bug report in QA report

**Bug Report Structure**:

```markdown
# Bug Report: Technical Task {TASK-ID} - {Bug Title}

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

**Action**: Use qa-gate skill to create gate decision file

**Location**: `docs/qa/gates/tasks/task.{id}.gate.{number}.{descriptive-name}.yml`

**Gate Decision Options**:

- **PASS**: All criteria met, approved for deployment
- **CONCERNS**: Minor issues found, deployment approved with conditions
- **FAIL**: Critical issues found, deployment blocked
- **WAIVED**: Issues acknowledged but deployment approved (requires justification)

### Step 11: Write QA Report

**Action**: Create comprehensive QA report using template above

**Key Sections**:

1. Executive Summary
2. Testing Scope
3. Implementation Verification
4. Success Criteria Verification
5. Breaking Changes Validation
6. Issues Found
7. NFR Assessment
8. Recommendations
9. Final Assessment

**Report Location**: `docs/development/tasks/task.{id}.{descriptive-name}/task.{id}.qa.[number].{descriptive-name}.md`

### Step 12: Communicate Results

**Action**: Inform stakeholders of QA results

**If PASS**:

- Notify team task is approved
- Provide deployment recommendation
- Share any non-blocking improvements

**If CONCERNS**:

- List conditions for deployment
- Communicate non-blocking issues
- Provide timeline for fixes

**If FAIL**:

- List blocking issues clearly
- Communicate deployment is blocked
- Work with developer on fix plan

### Step 13: Re-running QA After Bug Fixes (Optional)

**When to Re-run QA**:

- Complex fixes with new functionality added
- Multiple iteration cycles (>2 attempts to fix)
- Performance testing additions (Bug requires new benchmarks)
- Stakeholder audit requirement (needs fresh independent review)

**When Quick Verification is Sufficient**:

- Trivial fixes (<30 minutes, like 1-line deletions or find/replace)
- Lint corrections (no logic changes)
- Simple test updates (updating assertions only)
- Automated tests verify correctness

**Quick Verification Process** (for trivial fixes):

```bash
# 1. Bugs get fixed (via fix-qa skill or manual)
# 2. Tests run automatically during fix
# 3. Bug reports updated automatically with fix details
# 4. After all bugs fixed, update QA artifacts:
# You: "Update QA report and gate with bug resolutions"
```

**Full QA Re-run Process** (for complex fixes):

```bash
# After complex fixes applied
# You: "Re-run QA on task.{id} after bug fixes"
#
# What happens:
# - Full 12-step QA process executes
# - UPDATES original task.{id}.qa.*.md (adds Bug Resolution Summary)
# - UPDATES original task.{id}.gate.*.yml (updates gate status, adds bug_resolution)
# - Bug reports retain iteration history
```

**IMPORTANT**:

- QA may choose to create a new versioned file (e.g. `qa.2`) if significant changes or re-testing occurred.
- If updating in place, ensure the latest file (highest number) is the one updated.

**What Gets Updated**:

1. **Bug Reports** (automatic during fix):
   - Add "Developer Fix Cycle" section with fix details
   - Update status: New → In Progress → Ready for QA → Closed
   - Track multiple iterations if bug reopened

2. **QA Report** (after all bugs fixed):
   - Add "Bug Resolution Summary" section at end
   - List each bug fixed with verification results
   - Update gate status and deployment recommendation
   - Add new timestamp

3. **Quality Gate File** (after all bugs fixed):
   - Update `gate` field (CONCERNS → PASS)
   - Update `status_reason` with fix summary
   - Update `updated` timestamp
   - Add `status: closed` and `fixed_date` to each issue in `top_issues`
   - Update `quality_score` based on remaining issues
   - Add `bug_resolution` section with fix metadata

4. **Task Document** (optional):
   - Update success criteria checkboxes if now met
   - Mark status as complete if all criteria met

**Example QA Report Update** (appended to original):

```markdown
---

## Bug Resolution Summary

**Date**: 2025-10-31

### Bugs Fixed

**Bug #1: Test expects L3 tier**

- Status: ✅ Closed
- Fix: Removed line 257 from cache-manager.spec.ts
- Verification: All 136 tests passing (was 134/136)

**Bug #2: Lint @ts-ignore violations**

- Status: ✅ Closed
- Fix: Replaced 44 @ts-ignore with @ts-expect-error
- Verification: 0 lint errors (was 44 errors)

### Updated Assessment

**Previous Gate Status**: ⚠️ CONCERNS
**Updated Gate Status**: ✅ PASS

**Success Criteria - Updated**:
Functional:

- [x] All cache-lib tests pass ✅ (Fixed Bug #1)

Code Quality:

- [x] All linting passes ✅ (Fixed Bug #2)

**Remaining Issues**:

- Bug #3 (Performance testing) - Non-blocking, recommended for production

### Final Deployment Recommendation: ✅ APPROVED

**Conditions Met**:

- [x] Bug #1 Fixed (test failure resolved)
- [x] Bug #2 Fixed (lint errors resolved)
- [ ] Bug #3 Pending (non-blocking)

**Updated Risk Level**: LOW
**Deployment**: APPROVED for merge to develop branch
```

**Example Quality Gate Update**:

```yaml
# Update in place (do not create v2 file)
gate: PASS # Was: CONCERNS
status_reason: 'Bugs #1 and #2 fixed. Tests passing, lint clean. Approved for deployment.'
updated: '2025-10-31T14:30:00Z' # New timestamp

top_issues:
  - issue: 'Test expects removed L3 tier'
    severity: high
    bug_ref: 'task.1.bug.1.test-expects-l3-tier.md'
    status: closed # Added field
    fixed_date: '2025-10-31' # Added field
    suggested_owner: dev

quality_score: 80 # Was: 60 (100 - 10*1 medium + 10*1 remaining)

bug_resolution: # New section
  bugs_fixed: 2
  bugs_remaining: 1
  fix_date: '2025-10-31'
  total_iterations: 1
  verification_method: 'Automated tests + lint'
```

**Benefits of Single-Document Approach**:

- Single source of truth (one QA report per task)
- Simplified navigation (no version confusion)
- Clear history (bug reports track iterations, QA report shows final state)
- Git history preserves all changes for audit trail

**Viewing Original QA State**:

```bash
# Use git to see QA report before bug fixes
git log -p docs/development/tasks/task.{id}.qa.*.md

# Or use git diff
git diff HEAD~1 docs/development/tasks/task.{id}.qa.*.md
```

---

## Issue Severity Guidelines

### HIGH Severity

**Criteria**:

- Blocks deployment
- Causes system instability
- Breaking changes without migration path
- Critical tests failing
- Security vulnerabilities
- Data loss risk
- Performance regressions > 20%

**Examples**:

- Missing migration path for breaking change
- Core functionality broken
- Test coverage dropped below 70%
- Memory leaks detected

### MEDIUM Severity

**Criteria**:

- Should be fixed before deployment but not blocking
- Impacts developer experience
- Non-critical test failures
- Performance concerns
- Code quality issues

**Examples**:

- Some tests skipped
- Documentation incomplete
- Minor performance regression
- Code complexity concerns

### LOW Severity

**Criteria**:

- Nice to fix but not urgent
- Cosmetic issues
- Minor documentation gaps
- Code style inconsistencies

**Examples**:

- Typos in comments
- Missing inline documentation
- Console warnings
- Minor lint issues

---

## NFR Evaluation Criteria

### Performance

**Good Performance**:

- ✅ Meets or exceeds performance targets
- ✅ No regressions in critical paths
- ✅ Resource usage acceptable
- ✅ Load tested if applicable

**Concerns**:

- ⚠️ Minor performance regressions (< 10%)
- ⚠️ Resource usage higher than expected
- ⚠️ Performance not tested thoroughly

**Fails**:

- ❌ Significant performance degradation (> 20%)
- ❌ Memory leaks
- ❌ Unacceptable resource consumption

### Reliability

**Good Reliability**:

- ✅ Comprehensive error handling
- ✅ Graceful degradation
- ✅ Rollback plan validated
- ✅ Recovery mechanisms tested

**Concerns**:

- ⚠️ Some error cases not handled
- ⚠️ Rollback plan not fully tested
- ⚠️ Limited failure mode testing

**Fails**:

- ❌ Poor error handling
- ❌ No rollback plan
- ❌ System instability

### Security

**Good Security**:

- ✅ No new vulnerabilities
- ✅ Security best practices followed
- ✅ Sensitive data handled properly
- ✅ Dependencies up to date

**Concerns**:

- ⚠️ Minor security concerns
- ⚠️ Some dependencies with vulnerabilities
- ⚠️ Security not fully tested

**Fails**:

- ❌ Critical security vulnerabilities
- ❌ Sensitive data exposed
- ❌ Authentication/authorization broken

### Maintainability

**Good Maintainability**:

- ✅ Code is clear and well-documented
- ✅ Tests are comprehensive
- ✅ Technical debt reduced
- ✅ Complexity manageable

**Concerns**:

- ⚠️ Some documentation gaps
- ⚠️ Test coverage below target
- ⚠️ Increased complexity

**Fails**:

- ❌ Code is unclear or unmaintainable
- ❌ No tests
- ❌ Significant technical debt added

---

## Common Patterns

### Pattern 1: All Tests Passing, No Issues

**Gate Decision**: PASS
**Deployment**: APPROVED
**Report Focus**: Verify all criteria met, document successful completion

### Pattern 2: Minor Issues Found

**Gate Decision**: CONCERNS
**Deployment**: CONDITIONAL
**Report Focus**: Document issues, set conditions for deployment, track fixes

### Pattern 3: Critical Issues Found

**Gate Decision**: FAIL
**Deployment**: BLOCKED
**Report Focus**: Clearly list blocking issues, work with dev on fix plan

### Pattern 4: Issues Acknowledged by Team

**Gate Decision**: WAIVED
**Deployment**: APPROVED
**Report Focus**: Document rationale for waiver, track issues for future work

---

## Integration with Development Workflow

### Developer → QA Handoff

**Developer Actions**:

1. Complete all implementation phases
2. Mark all checkboxes in task document
3. Ensure tests passing
4. Update task status to "Ready for QA"
5. Notify QA team

**QA Actions**:

1. Verify prerequisites
2. Begin QA review process
3. Create QA report
4. Create quality gate
5. Communicate results

### QA → Developer Handoff (If Issues Found)

**QA Actions**:

1. Create bug reports for all issues
2. Link bugs in QA report
3. Mark gate as FAIL or CONCERNS
4. Return task to developer

**Developer Actions**:

1. Review bug reports
2. Fix issues
3. Update task document
4. Re-test
5. Return to QA for re-review

---

## Quick Reference

### QA Review Checklist

- [ ] Prerequisites verified
- [ ] Task document read thoroughly
- [ ] All phases reviewed
- [ ] Tests executed and results documented
- [ ] Success criteria checked
- [ ] Breaking changes validated
- [ ] NFRs assessed (Performance, Reliability, Security, Maintainability)
- [ ] Regression testing completed
- [ ] Issues documented with bug reports
- [ ] QA report written
- [ ] Quality gate created
- [ ] Results communicated to team

### File Naming Quick Reference

```
# Task Subdirectory Structure
docs/development/tasks/task.1.cache-lib-simplification/
├── task.1.cache-lib-simplification.md          # Main task document
├── task.1.qa.cache-lib-simplification.md       # QA report (co-located)
├── task.1.bug.1.memory-leak.md                 # Bug report 1 (co-located)
└── task.1.bug.2.test-failure.md                # Bug report 2 (co-located)

# Quality Gate (separate directory)
docs/qa/gates/tasks/task.1.cache-lib-simplification.gate.yml
```

---

## Additional Resources

- **Technical Task Skill**: `.claude/skills/create-task/SKILL.md`
- **QA Planning Skill**: `.claude/skills/qa-planning/SKILL.md`
- **QA Gate Skill**: `.claude/skills/qa-gate/SKILL.md`
- **Create Bug Report Skill**: `.claude/skills/create-bug-report/SKILL.md`
- **Fix QA Skill**: `.agents/skills/fix-qa/SKILL.md`

---

**Last Updated**: 2025-10-31
**Version**: 1.0
**Maintainer**: Goji QA Team
