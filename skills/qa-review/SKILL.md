---
name: qa-review
description: Use for comprehensive quality review during/after implementation. Performs adaptive test architecture review with conditional parallel agents based on story complexity. Uses direct tools for well-documented stories, spawns agents for complex/high-risk scenarios. Includes NFR validation (security, performance, reliability, maintainability) and requirements traceability mapping. Automatically performs re-review when previous gate has concerns or issues.
---

# QA Review

Comprehensive quality assurance review combining adaptive automated checks, test architecture assessment, non-functional requirements validation, and requirements traceability. Use this skill when reviewing implemented stories to ensure quality standards are met.

**Adaptive Review Strategy**: Intelligently chooses between direct tools (fast) and parallel agents (thorough) based on story size, complexity, and documentation quality. Completes review in single pass without waiting for user input.

**Re-Review Capability**: Automatically detects existing QA artifacts and performs re-review when previous gate has CONCERNS/FAIL or lists top_issues. Only skips re-review if gate is clean PASS with no issues.

## When to Use This Skill

- **Story Review**: When developer marks story as "Review" or "Ready for QA"
- **Re-Review**: When developer has addressed QA concerns and requests re-review (skill auto-detects)
- **NFR Validation**: Assessing security, performance, reliability, maintainability
- **Requirements Traceability**: Mapping acceptance criteria to test coverage
- **Code Quality Assessment**: Evaluating architecture, refactoring opportunities, technical debt

**Prerequisites**: Active PR exists for current branch. Review will halt if no PR found.

**Related Skills**:

- Before review, use `qa-planning` skill for upfront risk and test design
- After review, use `qa-gate` skill to create quality gate decisions

---

## Input Handling

**Flexible Invocation:**

You can invoke this skill with either:

- **A specific story file**: `story.178.8.swipe-actions-friend-requests.md`
- **A story directory**: `stories/story.178.8.swipe-actions-friend-requests/`

**Important**: Requires active PR for current branch. Review will halt if no PR found. See Prerequisites section.

**File Discovery Logic:**

When given a directory path:

1. List all files in the directory
2. Find the story file by pattern: `story.{epic}.{story}.{name}.md`
3. Exclude files containing: `.qa.`, `.gate.`, or `.bug.`
4. If multiple story files found, use the one matching the directory name
5. If no story file found, HALT and ask user for the correct path

**QA Artifacts Creation:**

When creating QA reports and gate files, they will be placed in the same directory as the story file with the appropriate naming:

- QA Report: `story.{epic}.{story}.qa.{number}.{descriptive-name}.md`
- Gate File: `story.{epic}.{story}.gate.{number}.{descriptive-name}.yml`
- Bug Reports: `story.{epic}.{story}.bug.{number}.{description}.md`

**Example:**

```
Input: stories/story.178.8.swipe-actions-friend-requests/
Discovers: story.178.8.swipe-actions-friend-requests.md
Creates: story.178.8.qa.1.initial-review.md
Creates: story.178.8.gate.1.initial-review.yml
```

---

## Prerequisites

### Task List Initialization

**CRITICAL**: Before starting the review, use `TaskCreate` to register every phase as a tracked task. Mark each `in_progress` before starting and `completed` immediately after finishing. This prevents silently skipping steps.

| Task Subject                    | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| PR existence check              | Validate PR exists for current branch; store PR metadata         |
| Check for existing QA artifacts | Detect re-review vs fresh review; read prior gate/report         |
| Locate and read story/task      | Read story/task file, extract ACs, identify implementation files |
| Run test architecture review    | Assess test coverage, co-location, co-coverage                   |
| Run NFR validation              | Evaluate security, performance, reliability, maintainability     |
| Run requirements traceability   | Map ACs to test evidence; identify gaps                          |
| Write QA report                 | Create co-located `.qa.N.*.md` report file                       |
| Write gate YAML                 | Create co-located `.gate.N.*.yml` file                           |
| Update story/task file          | Add QA Results section, update status, link artifacts            |
| Create bug reports              | Create `.bug.N.*.md` files for HIGH/MEDIUM issues (if any)       |
| Post PR comment                 | Post QA summary to PR via `gh pr comment`                        |
| Communicate to user             | Output final summary with gate decision and next steps           |

---

### PR Existence Check

**CRITICAL**: The qa-review skill requires an active pull request for the current branch.

**How PR Selection Works:**

- The skill uses `gh pr view` to find the PR associated with your **current Git branch**
- GitHub CLI matches the PR where `headRefName` equals your current branch name
- If multiple PRs exist from the same branch, the most recent one is selected
- This ensures you're reviewing the PR for the branch you're currently working on

Before starting the review:

1. **Check for PR existence:**

   ```bash
   # Get current branch
   CURRENT_BRANCH=$(git branch --show-current)

   # Find PR for current branch
   PR_JSON=$(gh pr view --json url,state,title,number 2>&1)
   EXIT_CODE=$?

   if [ $EXIT_CODE -ne 0 ]; then
     echo "⚠️ No pull request found for branch: $CURRENT_BRANCH"
     echo ""
     echo "QA Review requires a pull request to post results."
     echo ""
     echo "Options:"
     echo "1. Create a PR: gh pr create"
     echo "2. Use /create-pr skill"
     echo "3. Push changes: git push -u origin $CURRENT_BRANCH"
     echo ""
     echo "Once PR is created, re-run /qa-review"
     exit 1
   fi
   ```

2. **Parse and validate PR information:**

   ```bash
   PR_URL=$(echo "$PR_JSON" | jq -r '.url')
   PR_STATE=$(echo "$PR_JSON" | jq -r '.state')
   PR_NUMBER=$(echo "$PR_JSON" | jq -r '.number')
   PR_TITLE=$(echo "$PR_JSON" | jq -r '.title')
   ```

3. **Handle PR state:**
   - **OPEN**: ✅ Proceed with review
   - **MERGED**: ⚠️ Warn user but continue (comment will be posted to merged PR)
   - **CLOSED**: ⚠️ Warn user but continue (comment will be posted to closed PR)
   - **No PR**: ❌ Halt and provide guidance

4. **Display PR status:**

   ```bash
   if [ "$PR_STATE" = "MERGED" ]; then
     echo "⚠️ Warning: PR #$PR_NUMBER is already MERGED"
     echo "   Title: $PR_TITLE"
     echo "   Comment will still be posted, but PR is merged."
     echo ""
   elif [ "$PR_STATE" = "CLOSED" ]; then
     echo "⚠️ Warning: PR #$PR_NUMBER is CLOSED"
     echo "   Title: $PR_TITLE"
     echo "   Comment will still be posted, but PR is closed."
     echo ""
   elif [ "$PR_STATE" = "OPEN" ]; then
     echo "✅ Found PR #$PR_NUMBER: $PR_TITLE"
     echo "   State: $PR_STATE"
     echo "   URL: $PR_URL"
   fi
   ```

5. **Store PR metadata:**
   Store PR_URL, PR_STATE, PR_NUMBER, PR_TITLE for use in "Review Completion" section

---

## QA Re-Review Logic

**CRITICAL**: Before starting a new review, check if QA artifacts already exist for this story.

### Re-Review Decision Process

After finding the story file and validating PR exists:

1. **Check for existing QA artifacts:**

   ```bash
   # Find existing gate files in story directory
   STORY_DIR=$(dirname "$STORY_FILE")
   LATEST_GATE=$(ls -t "$STORY_DIR"/story.*.gate.*.yml 2>/dev/null | head -1)
   ```

2. **If gate file exists, read and analyze:**

   ```bash
   if [ -n "$LATEST_GATE" ]; then
     GATE_STATUS=$(grep '^gate:' "$LATEST_GATE" | awk '{print $2}')
     HAS_ISSUES=$(grep -c '^  - issue:' "$LATEST_GATE")

     echo "📋 Found existing QA review: $LATEST_GATE"
     echo "   Gate Status: $GATE_STATUS"
     echo "   Issues Found: $HAS_ISSUES"
   fi
   ```

3. **Decide whether to re-review:**

   **Skip re-review (exit with success message) when:**
   - Gate status is `PASS`
   - AND `top_issues` list is empty (no issues found)
   - Message: "✅ Story already has clean PASS gate with no concerns. Re-review not needed."

   **Perform re-review when ANY of these conditions:**
   - Gate status is `CONCERNS` or `FAIL` or `WAIVED`
   - OR `top_issues` list has items (even if gate is PASS)
   - OR no gate file exists (first review)
   - Message: "🔄 Performing QA re-review (previous gate: $GATE_STATUS with $HAS_ISSUES issues)"

4. **For re-reviews, determine next QA artifact number:**

   ```bash
   # Find highest existing QA number
   LATEST_QA_NUM=$(ls "$STORY_DIR"/story.*.qa.*.md 2>/dev/null | \
                   sed -E 's/.*\.qa\.([0-9]+)\..*/\1/' | \
                   sort -n | tail -1)

   if [ -n "$LATEST_QA_NUM" ]; then
     NEXT_QA_NUM=$((LATEST_QA_NUM + 1))
   else
     NEXT_QA_NUM=1
   fi

   echo "📝 Creating QA report #$NEXT_QA_NUM"
   ```

5. **Re-review focus areas:**
   - Reference the previous QA report and gate file
   - Focus specifically on whether previous concerns were addressed
   - Check if new issues were introduced
   - Verify fixes don't break existing functionality
   - Update gate decision based on current state

### Re-Review Report Structure

When performing a re-review (QA #2, #3, etc.), include this section at the top of the QA report:

```markdown
## Re-Review Context

**Previous QA Review**: [story.{epic}.{story}.qa.{prev_num}.{name}.md]
**Previous Gate**: {PASS/CONCERNS/FAIL} (Quality Score: {score}/100)
**Previous Issues**: {count} ({high} HIGH, {medium} MEDIUM, {low} LOW)

### Issues from Previous Review

1. **Issue 1**: {title} - Status: ✅ FIXED / ⚠️ PARTIAL / ❌ NOT FIXED
   - Previous concern: {description}
   - Current status: {verification notes}

2. **Issue 2**: {title} - Status: ✅ FIXED / ⚠️ PARTIAL / ❌ NOT FIXED
   - Previous concern: {description}
   - Current status: {verification notes}

### Re-Review Scope

This review focuses on:

- Verifying all previous concerns were addressed
- Checking for regression or new issues introduced by fixes
- Re-assessing NFR compliance after changes
- Validating test coverage for bug fixes
```

### Example Re-Review Scenarios

**Scenario 1: Clean PASS → Skip**

```yaml
# Previous gate file
gate: PASS
top_issues: [] # Empty
```

Action: Display message and skip re-review.

**Scenario 2: PASS with concerns → Re-review**

```yaml
# Previous gate file
gate: PASS
top_issues:
  - issue: 'Task 2 checkboxes not marked'
    severity: medium
```

Action: Perform re-review to check if checkboxes are now marked.

**Scenario 3: CONCERNS/FAIL → Re-review**

```yaml
# Previous gate file
gate: CONCERNS
top_issues:
  - issue: 'Integration tests missing'
    severity: medium
  - issue: 'No retry logic'
    severity: medium
```

Action: Perform re-review to verify if issues were addressed.

---

## Story Review Process

Perform a comprehensive test architecture review with quality assessment. This adaptive, risk-aware review creates both a QA report and a detailed gate file.

**Prerequisites**: See Prerequisites section above for PR validation requirements.

### Story Status Prerequisites

- Story status is "Draft", "Review", or "Ready for QA"
- Developer has completed all tasks and updated the File List
- All automated tests are passing

**IMPORTANT — Draft Status Transition**: If the story status is "Draft" at the time the review is invoked, update it to "In Review" in the frontmatter **before** proceeding with any other review phases. Log: "📝 Story status updated: Draft → In Review"

### Review Workflow

#### Phase 0: Check for Existing QA Artifacts (Re-Review Logic)

**CRITICAL**: Before starting the review, check if QA artifacts already exist.

1. **Search for existing gate files:**
   - Look for `story.{epic}.{story}.gate.*.yml` files in story directory
   - If found, read the latest gate file (most recent by timestamp)

2. **Analyze latest gate file:**
   - Check `gate` field: PASS, CONCERNS, FAIL, or WAIVED
   - Check `top_issues` array for any listed issues
   - Check `quality_score` for overall assessment

3. **Decide: Re-review or Skip:**

   **Skip re-review when:**
   - Gate status is `PASS`
   - AND `top_issues` list is empty (no issues)
   - Display: "✅ Story already has clean PASS gate with no concerns. Re-review not needed."
   - Exit gracefully

   **Perform re-review when:**
   - Gate status is `CONCERNS`, `FAIL`, or `WAIVED`
   - OR `top_issues` has items (even if gate is PASS)
   - OR no gate file exists (first review)
   - Display: "🔄 Performing QA re-review (previous gate: {status} with {count} issues)"
   - Increment QA artifact numbers (qa.1 → qa.2)
   - Focus on verifying previous concerns were addressed

4. **Reference previous QA report:**
   - Read previous QA report to understand what was checked
   - List each previous issue and verify if it was fixed
   - Include "Re-Review Context" section in new QA report

**See "QA Re-Review Logic" section above for detailed implementation.**

#### Phase 0.5: Check for QA Planning Artifacts

Before running independent NFR and risk analysis, check the story directory for pre-existing qa-planning files:

1. **Glob for risk assessments**: `story.{epic}.{story}.risk.*.md` in the story directory
   - If found: load as baseline risk profile
   - Validate whether implementation mitigated the pre-identified risks rather than re-deriving them from scratch
   - Log: "Found qa-planning risk assessment — using as baseline"

2. **Glob for test design documents**: `story.{epic}.{story}.test-design.*.md` in the story directory
   - If found: use the pre-defined test scenarios as the traceability baseline
   - Flag which P0/P1 scenarios are covered vs missing in the implementation
   - Log: "Found qa-planning test design — using as traceability baseline"

3. **Reference throughout review**: When planning artifacts are found, reference them explicitly in the NFR and traceability sections of the QA report rather than performing fully independent analysis.

4. **Not found**: If no planning artifacts exist, proceed with independent analysis as normal (no behaviour change).

#### Phase 1: Risk Assessment (Determines Review Depth)

**Auto-escalate to deep review when:**

- Auth/payment/security files touched
- No tests added to story
- Diff > 500 lines
- Previous gate was FAIL/CONCERNS (re-review scenario)
- Story has > 5 acceptance criteria

**Interactive Elicitation** (when context needed):

Use AskUserQuestion to clarify:

- Which files/components are most critical?
- Are there specific security/performance concerns?
- What's the expected test coverage level?
- Are there any known technical debt areas?

#### Phase 1.5: Adaptive Quality Checks

**CRITICAL**: Choose review approach based on story characteristics. This ensures efficiency while maintaining thoroughness.

**Adaptive Strategy Decision Tree:**

Evaluate story characteristics and select appropriate review method:

```
DECISION LOGIC:

1. IF story has documented test coverage (>500 tests documented):
   → Use DIRECT TOOLS (fast, leverages existing documentation)

2. ELSE IF story is small (<5 files created/modified):
   → Use DIRECT TOOLS (overhead not justified)

3. ELSE IF re-review scenario (fixing previous issues):
   → Use DIRECT TOOLS (focused scope on specific concerns)

4. ELSE IF high-risk areas touched (auth/payment/security):
   → Use FOCUSED AGENTS (2-3 agents, not all 4)
   → Spawn only: Test Coverage + TypeScript Compliance + relevant domain agent

5. ELSE IF story is large (>10 files) AND first-time review:
   → Use PARALLEL AGENTS (all 4 agents for comprehensive check)

6. DEFAULT (medium complexity, first-time review):
   → Use HYBRID: Direct tools first, spawn agents if gaps found
```

**Review Method A: Direct Tools (Fast)**

When using direct tools approach:

1. **Test Coverage Check**: Use Glob to find test files, Read to verify test count
2. **TypeScript Compliance**: Use Grep to search for `any` types, `@ts-ignore`, type assertions
3. **Accessibility Review**: Read React Native components directly, check for accessibility props
4. **Definition of Done**: Read story file, verify against DoD checklist

**Review Method B: Parallel Agent Execution (Thorough)**

Use the Task tool to spawn multiple agents in parallel. Send a SINGLE message with MULTIPLE Task tool calls to execute these checks concurrently:

1. **Test Coverage Analysis Agent**
   - Agent Type: `general-purpose`
   - Task: "Analyze test coverage for all files modified in the current PR. For each changed file, determine if corresponding test files exist (.spec.ts, .test.ts). Run coverage reports using `npx nx test <project> --coverage` for affected projects. Identify uncovered lines, functions, and branches. Generate a detailed report with coverage percentages per file and missing test cases."
   - Output: Test coverage report with file-by-file analysis

2. **TypeScript Strict Mode Compliance Agent**
   - Agent Type: `general-purpose`
   - Task: "Check TypeScript strict mode compliance for all files in the current PR. First verify tsconfig.json has strict: true. Then scan all modified .ts/.tsx files for violations: `any` types, `@ts-ignore` comments, non-null assertions (!), unsafe type assertions (as), missing return types on functions, and implicit any parameters. Generate a compliance report with violations categorized by severity (CRITICAL/HIGH/MEDIUM/LOW)."
   - Output: TypeScript strict mode compliance report

3. **Accessibility Requirements Agent**
   - Agent Type: `general-purpose`
   - Task: "Review all React/React Native components modified in the current PR for accessibility compliance. Check for: missing alt text on images/icons, missing ARIA labels on interactive elements, missing accessibility labels/hints (React Native), keyboard navigation support, color contrast issues, semantic HTML/component usage, focus management, and screen reader compatibility. Reference WCAG 2.1 AA standards. Generate an accessibility audit report with violations categorized by WCAG level (A/AA/AAA)."
   - Output: Accessibility audit report

4. **Definition of Done Criteria Agent**
   - Agent Type: `general-purpose`
   - Task: "Verify Definition of Done criteria for the current story/task. Check: all acceptance criteria implemented (reference story file), unit tests written and passing, integration tests passing, documentation updated (README, inline comments), code follows project standards, no console.log/debug statements, performance benchmarks met, security review completed (no hardcoded secrets, proper auth), and deployment checklist items complete. Generate a DoD compliance report with pass/fail for each criterion."
   - Output: Definition of Done compliance report

**Implementation Pattern:**

```typescript
// Launch all agents in parallel with a SINGLE message containing multiple Task calls
// Example pseudo-code:

// Task Call 1: Test Coverage Analysis
Task({
  subagent_type: 'general-purpose',
  description: 'Analyze test coverage',
  prompt: '[Full coverage analysis task description]'
});

// Task Call 2: TypeScript Strict Mode
Task({
  subagent_type: 'general-purpose',
  description: 'Check TypeScript compliance',
  prompt: '[Full TypeScript compliance task description]'
});

// Task Call 3: Accessibility Requirements
Task({
  subagent_type: 'general-purpose',
  description: 'Audit accessibility',
  prompt: '[Full accessibility audit task description]'
});

// Task Call 4: Definition of Done
Task({
  subagent_type: 'general-purpose',
  description: 'Verify Definition of Done',
  prompt: '[Full DoD verification task description]'
});

// All 4 agents run concurrently
// Wait for completion, then aggregate results
```

**Result Aggregation:**

After all parallel agents complete:

1. **Collect Agent Outputs:**
   - Read each agent's completion message or output
   - Extract key findings from each report
   - Identify severity levels (CRITICAL/HIGH/MEDIUM/LOW)
   - Document any agent failures or incomplete checks

2. **Synthesize Unified Report:**
   - Merge all findings into the main QA report
   - Cross-reference issues across agents (e.g., untested code with TypeScript violations)
   - Prioritize issues by combined impact and risk
   - Create consolidated recommendations with clear ownership
   - Eliminate duplicate findings

3. **Update Gate Criteria:**
   - Feed agent findings into gate decision logic
   - Coverage gaps → test architecture assessment
   - TypeScript violations → code quality/maintainability NFR
   - Accessibility issues → NFR compliance (usability/accessibility)
   - DoD failures → acceptance criteria validation

**Quality Score Impact:**

Each parallel check contributes to the overall quality assessment:

- **Test Coverage**:
  - < 70% coverage for changed files → CONCERNS
  - < 50% coverage for changed files → FAIL
  - Critical paths (auth, payments, security) with < 80% → FAIL
  - Financial operations with < 95% coverage → FAIL
  - Any changed file with 0% coverage → FAIL

- **Test Quality**:
  - Tests only check return values without business logic assertions → CONCERNS
  - No error scenario tests for critical paths → FAIL
  - No edge case tests (empty arrays, null values, boundaries) → CONCERNS
  - Tests depend on execution order (not isolated) → CONCERNS
  - Flaky tests (inconsistent pass/fail) → CONCERNS
  - Test execution time > 30s for unit tests → CONCERNS

- **Test Architecture**:
  - No integration tests for multi-component features → CONCERNS
  - Unit tests hitting real databases/APIs instead of mocks → FAIL
  - Over-mocking in integration tests (mocking what should be tested) → CONCERNS
  - No E2E tests for critical user journeys → CONCERNS (FAIL if auth/payment flows)
  - Tests use hardcoded production credentials → FAIL (security violation)

- **TypeScript Strict Mode**:
  - 1-5 violations → CONCERNS
  - > 5 violations → FAIL
  - Any `any` types in security/payment code → FAIL

- **Accessibility**:
  - Any WCAG 2.1 Level A violations → FAIL
  - Any WCAG 2.1 Level AA violations → CONCERNS
  - Missing accessibility labels on React Native components → CONCERNS

- **Definition of Done**:
  - Any incomplete P0 criteria (ACs, critical tests) → FAIL
  - Incomplete P1 criteria (docs, minor tests) → CONCERNS
  - All criteria met → PASS contribution

**Example Unified Finding:**

```markdown
### Issue: Untested Authentication Logic with Type Safety Violations

**Severity**: HIGH
**Sources**: Test Coverage Agent + TypeScript Compliance Agent
**Category**: Code Quality + Test Architecture

**Findings**:

- **Test Coverage Agent**: `auth-service.ts` has 0% coverage (0/45 lines tested, no test file found)
- **TypeScript Agent**: `auth-service.ts` contains 3 `any` types and 2 `@ts-ignore` comments in authentication methods

**Impact**:

- Critical authentication logic is completely untested
- Type safety violations mask potential runtime errors
- Combined risk: HIGH probability of production security failures
- Violates security testing requirements in Definition of Done

**Recommendation**:

1. Create `auth-service.spec.ts` with comprehensive unit tests (target: 90% coverage for security code)
2. Replace `any` types with proper `UserCredentials` and `AuthToken` interfaces
3. Remove `@ts-ignore` comments and fix underlying type issues (likely bcrypt type issues)
4. Add integration tests for complete auth flow
5. Estimated effort: 6-8 hours

**Gate Impact**: FAIL (untested critical security path + type safety violations in auth code)
**Suggested Owner**: dev
```

**Test Review Checklist** (For Manual Review):

When reviewing test files discovered by the Test Coverage Agent, check:

1. **Test File Discovery**:
   - [ ] Every changed `.ts`/`.tsx` file has corresponding `.spec.ts` file
   - [ ] Test files are co-located with source (same directory)
   - [ ] No orphaned test files (tests without corresponding source)

2. **Test Coverage Completeness**:
   - [ ] All public methods/functions have tests
   - [ ] All acceptance criteria have corresponding test cases
   - [ ] Edge cases are tested (null, undefined, empty, max values)
   - [ ] Error scenarios are tested (invalid input, exceptions)
   - [ ] Happy path and sad path both covered

3. **Test Quality**:
   - [ ] Tests have descriptive names (describe what they test, not how)
   - [ ] Each test has clear arrange-act-assert structure
   - [ ] Tests make meaningful assertions (not just "truthy" checks)
   - [ ] No commented-out tests or skipped tests (`xit`, `describe.skip`)
   - [ ] Tests are independent (can run in any order)

4. **Test Architecture**:
   - [ ] Unit tests use mocks for external dependencies
   - [ ] Integration tests test actual component interactions
   - [ ] No unit tests hitting real databases/APIs
   - [ ] Test data is created/cleaned up properly
   - [ ] No hardcoded IDs or production credentials in tests

5. **Test Maintainability**:
   - [ ] Test utilities/helpers are reusable
   - [ ] No excessive code duplication in tests
   - [ ] Test data factories used for complex objects
   - [ ] Clear test setup and teardown

6. **Critical Path Validation**:
   - [ ] Authentication flows have comprehensive tests
   - [ ] Payment/financial operations have 95%+ coverage
   - [ ] Security-critical code paths fully tested
   - [ ] Error handling in critical paths is tested

**Blocking Conditions:**

If any parallel agent fails to complete or reports critical errors:

- Document the agent failure in QA report with error details
- Continue with manual review for that specific category
- Mark corresponding quality assessment as CONCERNS with note: "Automated check failed"
- Include in gate file notes: "Agent [X] failed - manual review performed"
- Do not block overall QA review; proceed with available data

**Benefits of Parallel Execution:**

- **Speed**: 4x faster than sequential checks (all run concurrently)
- **Thoroughness**: Dedicated agents for each quality dimension
- **Consistency**: Automated checks reduce human error and bias
- **Traceability**: Clear agent outputs feed into unified report
- **Scalability**: Easy to add new quality checks as additional agents

#### Phase 2: Comprehensive Analysis

**A. Requirements Traceability**

- Map each acceptance criteria to its validating tests (document mapping with Given-When-Then, not test code)
- Identify coverage gaps
- Verify all requirements have corresponding test cases
- Reference test-design output if available from qa-planning skill
- **Leverage findings from Test Coverage Agent (Phase 1.5)** for coverage analysis

**B. Code Quality Review**

- Architecture and design patterns
- Refactoring opportunities (and perform them when safe)
- Code duplication or inefficiencies
- Performance optimizations
- Security vulnerabilities
- Best practices adherence
- **Leverage findings from TypeScript Compliance Agent (Phase 1.5)** for type safety review
- **Leverage findings from Accessibility Agent (Phase 1.5)** for component quality

**C. Test Architecture Assessment**

Perform comprehensive test quality evaluation:

**Test Coverage Analysis**:

- **Quantitative Coverage**: Lines, functions, branches, statements (from Test Coverage Agent)
- **Qualitative Coverage**: Are critical paths tested? Edge cases covered?
- **Coverage Gaps**: Which files/functions lack tests? Why?
- **Integration Test Coverage Agent findings (Phase 1.5)** into coverage assessment

**Test Level Appropriateness**:

- **Unit Tests**: Business logic, utilities, pure functions tested in isolation?
- **Integration Tests**: Component interactions, API endpoints, database operations?
- **E2E Tests**: Critical user journeys covered?
- **Test Pyramid Balance**: Appropriate ratio of unit:integration:e2e tests?

**Test Quality Metrics**:

- **Assertion Quality**: Do tests make meaningful assertions? Or just smoke tests?
- **Test Independence**: Can tests run in isolation without dependencies?
- **Test Clarity**: Are test names descriptive? Is intent clear?
- **Test Maintainability**: Are tests DRY? Reusable test utilities?
- **Test Reliability**: Do tests pass consistently? Or flaky?

**Test Data Strategy**:

- **Test Data Management**: How is test data created/cleaned up?
- **Fixtures**: Are fixtures well-organized and reusable?
- **Data Factories**: Are data builders/factories used for complex objects?
- **Test Isolation**: Does each test create/clean its own data?

**Mock/Stub Strategy**:

- **Mock Appropriateness**: Are mocks used for external dependencies only?
- **Mock Quality**: Do mocks accurately represent real behavior?
- **Over-mocking**: Are integration tests mocking too much?
- **Under-mocking**: Are unit tests hitting real databases/APIs?

**Edge Case and Error Coverage**:

- **Happy Path**: Basic functionality tested?
- **Edge Cases**: Boundary conditions (empty arrays, null values, max limits)?
- **Error Scenarios**: Invalid input, network failures, timeouts?
- **Security Edge Cases**: SQL injection attempts, XSS payloads, auth bypasses?

**Test Execution Characteristics**:

- **Execution Time**: Are tests fast enough? (Unit: <1s, Integration: <10s)
- **Test Reliability**: Pass rate? Any flaky tests?
- **Parallelization**: Can tests run in parallel?
- **CI/CD Integration**: Do tests run in continuous integration?

**Cross-Reference with Other Agents**:

- **Integrate Test Coverage Agent findings (Phase 1.5)** for quantitative metrics
- **Cross-reference with Definition of Done Agent (Phase 1.5)** for testing completeness
- **Validate against TypeScript Compliance Agent (Phase 1.5)** for test code quality

**D. Non-Functional Requirements (NFRs)**

See NFR Assessment section below for detailed process.

- **Incorporate TypeScript Compliance findings** into maintainability NFR
- **Incorporate Accessibility findings** into usability/accessibility NFR
- **Incorporate Test Coverage findings** into reliability/maintainability NFRs

**E. Testability Evaluation**

- **Controllability**: Can we control the inputs?
- **Observability**: Can we observe the outputs?
- **Debuggability**: Can we debug failures easily?

**F. Technical Debt Identification**

- Accumulated shortcuts
- Missing tests
- Outdated dependencies
- Architecture violations

#### Phase 3: Active Refactoring

- Refactor code where safe and appropriate
- Run tests to ensure changes don't break functionality
- Document all changes in QA report with clear WHY and HOW
- Do NOT alter story content beyond QA Report section
- Do NOT alter the story File List section
- Story status IS updated at review start (Draft → In Review) and at review completion per gate decision (see "Update Story Status" in Review Completion section)

#### Phase 4: Standards Compliance Check

- Verify adherence to `docs/coding-standards.md`
- Check compliance with `docs/unified-project-structure.md`
- Validate testing approach against `docs/testing-strategy.md`
- Ensure all guidelines mentioned in the story are followed
- **Review TypeScript Compliance Agent findings (Phase 1.5)** against project TypeScript standards
- **Review Accessibility Agent findings (Phase 1.5)** against project accessibility standards
- **Cross-check Definition of Done Agent (Phase 1.5)** for standards compliance

#### Phase 5: Acceptance Criteria Validation

- Verify each AC is fully implemented
- Check for any missing functionality
- Validate edge cases are handled
- **Validate against Definition of Done Agent findings (Phase 1.5)** for AC implementation status
- **Cross-reference Test Coverage Agent (Phase 1.5)** to ensure all ACs have test coverage

#### Phase 6: Documentation and Comments

- Verify code is self-documenting where possible
- Add comments for complex logic if missing
- Ensure any API changes are documented

### Story Review Outputs

#### Output 1: QA Report File

**CRITICAL FILE AUTHORIZATION RULES:**

You are **AUTHORIZED** to update the following sections in story/task files:

- `## QA Testing Results` section (gate decision, quality score, test coverage summary, key findings, links to QA artifacts)
- `## QA Completion Summary` section (final QA status, test results summary, deployment readiness, final notes)
- Story/Task `status` field in frontmatter (based on gate decision)

**DO NOT modify**: Story content, Acceptance Criteria, Dev Notes, Developer sections, or any other sections.

**QA Documentation Rule:**

1. Always update `## QA Testing Results` section with gate decision and summary
2. If testing is complete, update `## QA Completion Summary` section
3. Update story/task status based on gate decision
4. Include links to detailed QA report and gate files for full details

**QA Report Location and Naming:**

- **Stories**: `story.[epic].[story].qa.[number].[descriptive-name].md`
- **Tasks**: `task.[number].qa.[number].[descriptive-name].md`
- **MUST co-locate with the story/task file in the same directory**

**Story Directory Structure:**

Each story has its own subdirectory containing all related files:

```
stories/
└── story.{epic}.{story}.{story-name}/
    ├── story.{epic}.{story}.{story-name}.md           # Story file
    ├── story.{epic}.{story}.qa.{number}.{descriptive-name}.md  # QA report
    ├── story.{epic}.{story}.gate.{number}.{descriptive-name}.yml # Gate file
    ├── story.{epic}.{story}.bug.1.{description}.md    # Bug report 1
    ├── story.{epic}.{story}.bug.2.{description}.md    # Bug report 2
    └── ...
```

**Naming Convention:**

- All files in a story directory share the same base: `story.{epic}.{story}`
- File type is indicated by the segment after the story ID: `.qa.`, `.gate.`, `.bug.{number}.`
- QA reports and Gates include a sequential number: `.qa.1.`, `.gate.1.`, etc.
- Bug reports include a sequential number: `.bug.1.`, `.bug.2.`, etc.
- Descriptive name comes last before the file extension

**Examples:**

- Story directory: `docs/prd/core-platform/contact-system/add-contact-via-handle/epics/epic.178.user-discovery-ui/stories/story.178.8.swipe-actions-friend-requests/`
- Story file: `story.178.8.swipe-actions-friend-requests.md`
- QA report: `story.178.8.qa.1.swipe-actions-friend-requests.md`
- Gate file: `story.178.8.gate.1.swipe-actions-friend-requests.yml`
- Bug report: `story.178.8.bug.1.android-swipe-jank.md`

**QA Report Structure:**

````markdown
# QA Report: Story [epic].[story] - [Story Title]

**Epic**: [Epic Name]
**Story**: [epic].[story] - [Story Title]
**QA Engineer**: QA Engineer
**Testing Completed**: [Date]
**Status**: PASS/CONCERNS/FAIL

---

## Executive Summary

[Brief summary of testing scope and overall assessment]

## Testing Scope

### Prerequisites Verified ✅

- [x] Code is implemented and functional
- [x] Basic test suite exists and passes
- [x] Dependencies are available
- [x] [Other prerequisites]

### Testing Approach

- [ ] Manual Testing
- [ ] Automated Testing
- [ ] Performance Testing
- [ ] Security Review

## Test Results Summary

### Acceptance Criteria Status

| AC  | Status  | Test Result | Notes                     |
| --- | ------- | ----------- | ------------------------- |
| AC1 | ✅ PASS | Verified    | [Brief verification note] |
| AC2 | ✅ PASS | Verified    | [Brief verification note] |

## Issues Found

### HIGH Severity Issues (X)

#### Issue 1: [Issue Title]

**Severity**: HIGH
**Category**: [Security/Performance/Reliability/etc.]
**Observation**: [Detailed description]

**Impact**: [How this affects users/system/business]

**Risk Assessment**:

- **Likelihood**: [HIGH/MEDIUM/LOW]
- **Consequence**: [HIGH/MEDIUM/LOW]
- **Business Impact**: [Description]

**Recommendation**: [Suggested fix]

**Required Actions Before Re-Review**:

1. [Specific step]
2. [Specific step]

**Retest Strategy**: [How to verify the fix]

**Gate Recommendation**: [PASS/CONCERNS/FAIL]

## Performance Results

### [Performance Category] ✅

- **[Metric]**: [Value] ([Target])
- **[Metric]**: [Value] ([Target])

## Security Assessment

### Findings ✅

- [Security finding or "No security concerns identified"]

## NFR Compliance Assessment

### Performance ✅

- Status: PASS/CONCERNS/FAIL
- Notes: [Findings]

### Reliability ✅

- Status: PASS/CONCERNS/FAIL
- Notes: [Findings]

### Security ✅

- Status: PASS/CONCERNS/FAIL
- Notes: [Findings]

### Maintainability ✅

- Status: PASS/CONCERNS/FAIL
- Notes: [Findings]

## Recommendations

### Immediate Actions (Current Sprint)

1. [Action]
2. [Action]

### Short-term Actions (Next Sprint)

1. [Action]
2. [Action]

## Test Artifacts

### Files Reviewed

- [File path]
- [File path]

### Test Commands Executed

```bash
[Command executed]
```
````

### Coverage Report

- **Lines**: X% covered
- **Functions**: X% covered
- **Branches**: X% covered

## Final Assessment

### Gate Status: [STATUS]

**Rationale**: [Explanation]

### Deployment Recommendation: [APPROVED/BLOCKED]

**Conditions**: [If any]

### Next Steps

1. [Step]
2. [Step]

---

**QA Report Reference**: `story.[epic].[story].qa.[number].[descriptive-name].md` (co-located)
**Gate File**: `story.[epic].[story].gate.[number].[descriptive-name].yml` (co-located)

````

#### Output 2: Quality Gate File

**CRITICAL: Gate files MUST be co-located with story/task files (Updated 2025-12-09)**

**Gate File Location and Naming:**
- **Stories**: `story.[epic].[story].gate.[number].[descriptive-name].yml`
- **Tasks**: `task.[number].gate.[number].[descriptive-name].yml`
- **MUST co-locate with the story/task file in the same directory**
- Examples:
  - Story: `docs/prd/core-platform/group-system/story.1.1.5.gate.1.groups-cache-service-implementation.yml`
  - Task: `docs/development/tasks/task.44.transactions-wallet-backend-integration/task.44.gate.1.transactions-wallet-backend-integration.yml`

**Legacy Note**: Old pattern of storing gates in `docs/qa/gates/[prd-path]/` is deprecated. All new gate files must be co-located.

**Gate File Structure:**

```yaml
schema: 1
story: '{epic}.{story}'
story_title: '{story title}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: '1-2 sentence explanation of gate decision'
reviewer: 'QA Engineer'
updated: '{ISO-8601 timestamp}'

top_issues: [] # Empty if no issues
waiver: { active: false } # Set active: true only if WAIVED

# Extended fields (optional but recommended):
quality_score: 0-100 # 100 - (20*FAILs) - (10*CONCERNS) or use technical-preferences.md weights
expires: '{ISO-8601 timestamp}' # Typically 2 weeks from review

evidence:
  tests_reviewed: { count }
  risks_identified: { count }
  trace:
    ac_covered: [1, 2, 3] # AC numbers with test coverage
    ac_gaps: [4] # AC numbers lacking coverage

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
  immediate: # Must fix before production
    - action: 'Add rate limiting'
      refs: ['api/auth/login.ts']
  future: # Can be addressed later
    - action: 'Consider caching'
      refs: ['services/data.ts']
````

### Gate Decision Criteria

**Deterministic rule (apply in order):**

If risk_summary exists, apply its thresholds first (≥9 → FAIL, ≥6 → CONCERNS), then NFR statuses, then top_issues severity.

1. **Risk thresholds (if risk_summary present from qa-planning):**
   - If any risk score ≥ 9 → Gate = FAIL (unless waived)
   - Else if any score ≥ 6 → Gate = CONCERNS

2. **Test coverage gaps (if trace available):**
   - If any P0 test from test-design is missing → Gate = CONCERNS
   - If security/data-loss P0 test missing → Gate = FAIL

3. **Issue severity:**
   - If any `top_issues.severity == high` → Gate = FAIL (unless waived)
   - Else if any `severity == medium` → Gate = CONCERNS

4. **NFR statuses:**
   - If any NFR status is FAIL → Gate = FAIL
   - Else if any NFR status is CONCERNS → Gate = CONCERNS
   - Else → Gate = PASS

- **WAIVED** only when waiver.active: true with reason/approver

**Detailed criteria:**

- **PASS**: All critical requirements met, no blocking issues
- **CONCERNS**: Non-critical issues found, team should review
- **FAIL**: Critical issues that should be addressed
- **WAIVED**: Issues acknowledged but explicitly waived by team

### Quality Score Calculation

```text
quality_score = 100 - (20 × number of FAILs) - (10 × number of CONCERNS)
Bounded between 0 and 100
```

If `technical-preferences.md` defines custom weights, use those instead.

### Suggested Owner Convention

For each issue in `top_issues`, include a `suggested_owner`:

- `dev`: Code changes needed
- `sm`: Requirements clarification needed
- `po`: Business decision needed

### Review Completion

After review:

1. Create QA report file: `story.[epic].[story].qa.[number].[descriptive-name].md` (co-located with story file)
2. Create quality gate file: `{qa.qaLocation}/gates/[prd-path]/story.[epic].[story].gate.[number].[descriptive-name].yml`
3. **Update Story/Task File with QA Results**:

   **For Stories - Update these sections:**

   a. **QA Testing Results** section:

   ```markdown
   ## QA Testing Results

   **QA Status**: ✅ PASS / ⚠️ CONCERNS / ❌ FAIL
   **QA Engineer**: QA Engineer
   **Testing Date**: [Date]
   **Quality Score**: [score]/100
   **Gate Decision**: [PASS/CONCERNS/FAIL/WAIVED]

   ### QA Report

   - **Full Report**: [story.[epic].[story].qa.[number].[descriptive-name].md](./story.[epic].[story].qa.[number].[descriptive-name].md)
   - **Gate File**: [story.[epic].[story].gate.[number].[descriptive-name].yml](./story.[epic].[story].gate.[number].[descriptive-name].yml)

   ### Test Coverage Summary

   - **Acceptance Criteria Tested**: [X/Y]
   - **Tests Executed**: [Count]
   - **Critical Issues**: [Count]
   - **NFR Status**: Security: [STATUS], Performance: [STATUS], Reliability: [STATUS], Maintainability: [STATUS]

   ### Key Findings

   [Brief summary of critical issues or concerns, or "No critical issues identified"]
   ```

   b. **QA Completion Summary** section (if testing is complete):

   ```markdown
   ## QA Completion Summary

   **Final QA Status**: ✅ Passed / ⚠️ Passed with Concerns / ❌ Failed
   **QA Engineer**: QA Engineer
   **Final Testing Date**: [Date]

   ### Test Results Summary

   - **All Acceptance Criteria Met**: Yes / No
   - **Bug Reports Created**: [Number]
   - **Bug Reports Closed**: [Number]
   - **Regression Tests**: Passed / Failed
   - **Performance**: Acceptable / Issues Found
   - **Ready for Deployment**: Yes / No / Conditional

   ### Final Notes

   [Summary of recommendations, deployment conditions, or follow-up items]
   ```

   c. **Update Story Status** based on gate decision:
   - PASS → Status: "Ready for Done"
   - CONCERNS → Status: "Ready for Done" (with notes about concerns)
   - FAIL → Status: "Reopened" (requires fixes)
   - WAIVED → Status: "Ready for Done" (with waiver notes)

   **For Tasks - Update similar sections** in task file with QA assessment results

4. Recommend next action based on gate decision
5. If files were modified during refactoring, list them in QA report and ask Dev to update File List
6. **Post QA Summary to PR**:
   - Use the PR URL from Prerequisites check (already validated)
   - Post comprehensive summary with artifact links

     ```bash
     # PR metadata already validated in Prerequisites section
     # Use stored PR_URL, PR_NUMBER, PR_STATE, PR_TITLE variables

     gh pr comment "$PR_URL" --body "## 🧪 QA Review: [GATE_DECISION]

     **Gate Decision**: ✅/⚠️/❌ [PASS/CONCERNS/FAIL]
     **Quality Score**: [score]/100
     **Reviewer**: QA Engineer
     **Date**: [date]
     **PR**: #$PR_NUMBER - $PR_TITLE
     **PR State**: $PR_STATE

     ---

     ### 📋 QA Artifacts

     - **QA Report**: [story.[epic].[story].qa.[number].[descriptive-name].md](path/to/report.md)
     - **Gate File**: [story.[epic].[story].gate.[number].[descriptive-name].yml](path/to/gate.yml)

     ### ✅ Summary

     - **Tests Executed**: [Count]
     - **AC Coverage**: [X/Y covered]
     - **NFR Status**: Security: [PASS/CONCERNS/FAIL], Performance: [PASS/CONCERNS/FAIL], Reliability: [PASS/CONCERNS/FAIL], Maintainability: [PASS/CONCERNS/FAIL]
     - **Critical Issues**: [count]
     - **Coverage Gaps**: [count]

     ### 🎯 Critical Issues

     [List critical issues if any, or "None identified"]

     ### 🚀 Deployment Recommendation

     **Status**: ✅/⚠️/❌ [APPROVED/APPROVED WITH CONCERNS/BLOCKED]

     **Conditions**: [Any conditions for deployment]

     ### 📝 Next Steps

     1. [Step 1]
     2. [Step 2]

     ---

     🤖 Generated by QA Review Skill"
     ```

7. Always provide constructive feedback and actionable recommendations

**Review Completion Checklist — tick off each before marking the review done:**

- [ ] QA report file created and saved (co-located with story/task)
- [ ] Gate YAML file created and saved (co-located with story/task)
- [ ] Story/task `## QA Testing Results` section updated with gate status, quality score, and links to artifacts
- [ ] Story/task status updated (`Ready for Done` / `Reopened` / etc.) per gate decision
- [ ] Bug report files created for all HIGH and MEDIUM severity issues (if any)
- [ ] Story Bug Reports section updated with current bug statuses (if any)
- [ ] PR comment posted via `gh pr comment "$PR_URL"` with QA summary
- [ ] Next steps communicated clearly to user

**File Creation Locations (Updated 2025-12-09):**

- **QA Report**: Same directory as story/task file (co-located)
- **Gate File**: Same directory as story/task file (co-located)
- **Story/Task Reference**: Add `## QA Report` section with link to QA report file

**Co-location Benefits**:

- Single source of truth - all related documentation in one place
- Easier discovery - no need to search multiple directories
- Better context - story/task, implementation, QA report, and gate all together
- Version control - changes tracked together in git history

---

## Bug Report Creation (Unhappy Path)

When issues are found during story review, create bug reports following the documented workflow.

### QA Testing Outcome Paths

**Happy Path (No Issues Found)**:

1. QA tests all acceptance criteria
2. All ACs pass, no bugs found
3. QA adds completion notes to story file's QA Handoff Notes section
4. Update story status to "Done"
5. **NO bug report files created** (only QA report with PASS status)

**Unhappy Path (Issues Found)**:

1. QA creates QA report: `story.[epic].[story].qa.[number].[descriptive-name].md`
2. QA creates bug report files for each HIGH/MEDIUM severity issue
3. QA updates story status to "Reopened"
4. Iterative fix cycle begins (detailed below)

### When to Create Bug Reports

**Create Individual Bug Reports For:**

- Each distinct **HIGH severity** issue found
- Each distinct **MEDIUM severity** issue found
- Issues that require developer investigation and fixes

**Document in QA Report Only (No Separate Bug File):**

- **LOW severity** issues (minor cosmetic issues, typos)
- Suggestions for future improvements
- General recommendations

### Bug Report Creation Workflow

#### Step 1: Determine Bug Reports Needed

Review all issues found and categorize by severity:

- **HIGH** → Always create bug report
- **MEDIUM** → Always create bug report
- **LOW** → Document in QA report only

#### Step 2: Sequential Bug Numbering

Use sequential numbering within each story:

**Format**: `story.[epic].[story].bug.[bug-number].[descriptive-name].md`

**Examples**:

- First bug: `story.8.5.3.bug.1.cache-cleanup-memory-leak.md`
- Second bug: `story.8.5.3.bug.2.offline-mode-regression.md`
- Third bug: `story.8.5.3.bug.3.performance-degradation.md`

**Numbering Rules**:

- Start at 1 for each story
- Increment sequentially (1, 2, 3, ...)
- Never reuse numbers even if bugs are closed

#### Step 3: Create Bug Report Files

**Template Location**: `docs/templates/bug-report-template.md`

**File Location**: Co-locate with story file (same directory)

**Required Bug Report Sections**:

```markdown
**Bug ID**: story.[epic].[story].bug.[bug-number].[description]
**Related Story**: [Story [Epic]-[N]: [Story Name]](./story.[epic].[story].[name].md)
**Status**: 🆕 New
**Priority**: Critical | High | Medium | Low
**Severity**: Blocker | Major | Minor | Trivial
**Created**: YYYY-MM-DD
**Assigned To**: [Developer Name]
**QA Engineer**: [QA Engineer Name]

## Bug Description

**Summary**: [1-2 sentence description]

**Expected Behavior**: [What should happen]

**Actual Behavior**: [What actually happens]

**Impact**: [How this affects users/system/business]

## Reproduction Steps

**Environment**: [OS, browser, device, etc.]

**Steps to Reproduce**:

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Frequency**: Always | Sometimes | Rarely
**Reproducible**: Yes | No | Intermittent

## Evidence

**Screenshots/Videos**: [Link or embed]

**Logs and Stack Traces**:
```

[Paste relevant logs]

```

**Related Files**: [List files involved]

## Acceptance Criteria Violation

**AC Reference**: AC[N] - [AC description]

**How AC Failed**: [Specific explanation]

## Developer Fix Cycle

[Leave empty - Developer will fill in during fix process]

### Iteration 1

#### Investigation (New → In Progress)
**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)
**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:
- [file1.ts]
- [file2.ts]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)
**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

### Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| [Date] | New | [QA Name] | Bug created |
| [Date] | In Progress | [Dev Name] | Investigation started |
```

#### Step 4: Update Story File

**Add Bug Report Links in Story File**:

If `## Bug Reports` section doesn't exist, add it. Then link all bug reports:

```markdown
## Bug Reports

### Open Bugs

- [Bug 8.5.3.1: Cache cleanup memory leak](story.8.5.3.bug.1.cache-cleanup-memory-leak.md) - 🆕 New - Priority: High
- [Bug 8.5.3.2: Offline mode regression](story.8.5.3.bug.2.offline-mode-regression.md) - 🆕 New - Priority: Medium

### Closed Bugs

[Will be moved here when bugs are closed]
```

#### Step 5: Update Story Status

**Status Transition**: "Ready for QA" → "Reopened"

**Update Story Metadata**:

```markdown
**Status**: ⚠️ Reopened
**Last Updated**: YYYY-MM-DD
```

### Bug Fix Iteration Cycle

After bug reports are created, the iterative fix cycle begins:

**Developer Fix Process**:

1. **Investigation** (New → In Progress)
   - Developer reads bug report
   - Investigates root cause
   - Documents findings in bug report's "Developer Fix Cycle" section

2. **Fix Implementation** (In Progress → Ready for QA)
   - Developer implements fix
   - Adds fix description, modified files, testing notes
   - Changes bug status to "Ready for QA"

3. **QA Verification** (Ready for QA → Closed/Reopened)
   - QA retests the specific bug
   - If fixed → Status: "Closed"
   - If still failing → Status: "Reopened", add new iteration section

4. **Iteration** (if Reopened)
   - Start new "Iteration 2" section in bug report
   - Repeat investigation → fix → verification cycle
   - Continue until bug is closed

5. **Final Story Re-test**
   - Once all bugs closed, QA performs full story re-test
   - If all ACs pass → Move story to "Done"
   - If new issues found → Create new bug reports, continue cycle

### Bug Report Best Practices

**Clear Descriptions**:

- Be specific about what's broken
- Include exact steps to reproduce
- Provide evidence (screenshots, logs)
- Reference which AC failed

**Severity Classification**:

- **Blocker**: Prevents testing, blocks deployment
- **Major**: Core functionality broken, workaround exists
- **Minor**: Cosmetic issue, low impact
- **Trivial**: Typo, formatting issue

**Priority Assignment**:

- **Critical**: Must fix before deployment
- **High**: Fix in current sprint
- **Medium**: Fix in next sprint
- **Low**: Fix when time permits

**Status Tracking**:

- Always update status history table
- Document all status transitions
- Include who made the change and when

### Integration with Gate Files

Bug reports influence gate decisions:

**Gate Status Impact**:

- **Any HIGH severity bugs** → Gate = FAIL
- **Multiple MEDIUM severity bugs** → Gate = CONCERNS
- **Only LOW severity issues** → Gate = PASS (with notes)

**Gate File Reference**:

Include bug count in gate file:

```yaml
top_issues:
  - issue: 'Cache cleanup memory leak'
    severity: high
    bug_ref: 'story.8.5.3.bug.1.cache-cleanup-memory-leak.md'
    suggested_owner: dev
```

### Blocking Conditions

Stop the review and request clarification if:

- Story file is incomplete or missing critical sections
- File List is empty or clearly incomplete
- No tests exist when they were required
- Code changes don't align with story requirements
- Critical architectural issues that require discussion

---

## NFR Assessment

Quick NFR validation focused on the core four: security, performance, reliability, maintainability.

### Purpose

Assess non-functional requirements for a story and generate:

1. YAML block for the gate file's `nfr_validation` section
2. Brief markdown assessment saved to `{qa.qaLocation}/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md`

### Fail-safe for Missing Inputs

If story_path or story file can't be found:

- Still create assessment file with note: "Source story not found"
- Set all selected NFRs to CONCERNS with notes: "Target unknown / evidence missing"
- Continue with assessment to provide value

### NFR Assessment Process

#### Step 1: Elicit Scope

**Interactive Elicitation** (when scope is unclear):

Use AskUserQuestion to ask which NFRs to assess:

- Security (default)
- Performance (default)
- Reliability (default)
- Maintainability (default)
- Usability
- Compatibility
- Portability
- Functional Suitability

**Non-interactive mode**: Default to core four (security, performance, reliability, maintainability)

#### Step 2: Check for Thresholds

Look for NFR requirements in:

- Story acceptance criteria
- `docs/architecture/*.md` files
- `docs/technical-preferences.md`

**Interactive Elicitation** (when thresholds missing):

Use AskUserQuestion for missing thresholds:

- What's your target response time? (e.g., 200ms for API calls)
- Required auth method? (e.g., JWT with refresh tokens)
- Test coverage target? (e.g., 80%)
- Security requirements? (e.g., rate limiting, encryption)

**Unknown targets policy**: If a target is missing and not provided, mark status as CONCERNS with notes: "Target unknown"

#### Step 3: Quick Assessment

For each selected NFR, check:

- Is there evidence it's implemented?
- Can we validate it?
- Are there obvious gaps?

### NFR Assessment Criteria

#### Security

**PASS if:**

- Authentication implemented
- Authorization enforced
- Input validation present
- No hardcoded secrets

**CONCERNS if:**

- Missing rate limiting
- Weak encryption
- Incomplete authorization

**FAIL if:**

- No authentication
- Hardcoded credentials
- SQL injection vulnerabilities

#### Performance

**PASS if:**

- Meets response time targets
- No obvious bottlenecks
- Reasonable resource usage

**CONCERNS if:**

- Close to limits
- Missing indexes
- No caching strategy

**FAIL if:**

- Exceeds response time limits
- Memory leaks
- Unoptimized queries

#### Reliability

**PASS if:**

- Error handling present
- Graceful degradation
- Retry logic where needed

**CONCERNS if:**

- Some error cases unhandled
- No circuit breakers
- Missing health checks

**FAIL if:**

- No error handling
- Crashes on errors
- No recovery mechanisms

#### Maintainability

**PASS if:**

- Test coverage meets target
- Code well-structured
- Documentation present

**CONCERNS if:**

- Test coverage below target
- Some code duplication
- Missing documentation

**FAIL if:**

- No tests
- Highly coupled code
- No documentation

### NFR Assessment Outputs

#### Output 1: Gate YAML Block

Generate ONLY for NFRs actually assessed (no placeholders):

```yaml
# Gate YAML (copy/paste):
nfr_validation:
  _assessed: [security, performance, reliability, maintainability]
  security:
    status: CONCERNS
    notes: 'No rate limiting on auth endpoints'
  performance:
    status: PASS
    notes: 'Response times < 200ms verified'
  reliability:
    status: PASS
    notes: 'Error handling and retries implemented'
  maintainability:
    status: CONCERNS
    notes: 'Test coverage at 65%, target is 80%'
```

#### Deterministic Status Rules

- **FAIL**: Any selected NFR has critical gap or target clearly not met
- **CONCERNS**: No FAILs, but any NFR is unknown/partial/missing evidence
- **PASS**: All selected NFRs meet targets with evidence

#### Quality Score Calculation

```
quality_score = 100
- 20 for each FAIL attribute
- 10 for each CONCERNS attribute
Floor at 0, ceiling at 100
```

If `technical-preferences.md` defines custom weights, use those instead.

#### Output 2: Brief Assessment Report

**ALWAYS save to:** `{qa.qaLocation}/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md`

```markdown
# NFR Assessment: {epic}.{story}

Date: {date}
Reviewer: QA Engineer

<!-- Note: Source story not found (if applicable) -->

## Summary

- Security: CONCERNS - Missing rate limiting
- Performance: PASS - Meets <200ms requirement
- Reliability: PASS - Proper error handling
- Maintainability: CONCERNS - Test coverage below target

## Critical Issues

1. **No rate limiting** (Security)
   - Risk: Brute force attacks possible
   - Fix: Add rate limiting middleware to auth endpoints

2. **Test coverage 65%** (Maintainability)
   - Risk: Untested code paths
   - Fix: Add tests for uncovered branches

## Quick Wins

- Add rate limiting: ~2 hours
- Increase test coverage: ~4 hours
- Add performance monitoring: ~1 hour
```

#### Output 3: Story Hook Line

**Print this line for integration into QA report:**

```
NFR assessment: {qa.qaLocation}/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md
```

#### Output 4: Gate Integration Line

**Always print at the end:**

```
Gate NFR block ready → paste into {qa.qaLocation}/gates/{epic}.{story}-{slug}.yml under nfr_validation
```

### NFR Quick Reference

**What to Check:**

```yaml
security:
  - Authentication mechanism
  - Authorization checks
  - Input validation
  - Secret management
  - Rate limiting

performance:
  - Response times
  - Database queries
  - Caching usage
  - Resource consumption

reliability:
  - Error handling
  - Retry logic
  - Circuit breakers
  - Health checks
  - Logging

maintainability:
  - Test coverage
  - Code structure
  - Documentation
  - Dependencies
```

---

## Requirements Traceability

Map story requirements to test cases using Given-When-Then patterns for comprehensive traceability.

### Purpose

Create a requirements traceability matrix that ensures every acceptance criterion has corresponding test coverage. This helps identify gaps in testing and ensures all requirements are validated.

**IMPORTANT**: Given-When-Then is used here for documenting the mapping between requirements and tests, NOT for writing the actual test code. Tests should follow your project's testing standards (no BDD syntax in test code).

### Traceability Process

#### Step 1: Extract Requirements

Identify all testable requirements from:

- Acceptance Criteria (primary source)
- User story statement
- Tasks/subtasks with specific behaviors
- Non-functional requirements mentioned
- Edge cases documented

#### Step 2: Map to Test Cases

For each requirement, document which tests validate it. Use Given-When-Then to describe what the test validates (not how it's written):

```yaml
requirement: 'AC1: User can login with valid credentials'
test_mappings:
  - test_file: 'auth/login.test.ts'
    test_case: 'should successfully login with valid email and password'
    # Given-When-Then describes WHAT the test validates, not HOW it's coded
    given: 'A registered user with valid credentials'
    when: 'They submit the login form'
    then: 'They are redirected to dashboard and session is created'
    coverage: full

  - test_file: 'e2e/auth-flow.test.ts'
    test_case: 'complete login flow'
    given: 'User on login page'
    when: 'Entering valid credentials and submitting'
    then: 'Dashboard loads with user data'
    coverage: integration
```

#### Step 3: Coverage Analysis

Evaluate coverage for each requirement:

**Coverage Levels:**

- `full`: Requirement completely tested
- `partial`: Some aspects tested, gaps exist
- `none`: No test coverage found
- `integration`: Covered in integration/e2e tests only
- `unit`: Covered in unit tests only

#### Step 4: Gap Identification

Document any gaps found:

```yaml
coverage_gaps:
  - requirement: 'AC3: Password reset email sent within 60 seconds'
    gap: 'No test for email delivery timing'
    severity: medium
    suggested_test:
      type: integration
      description: 'Test email service SLA compliance'

  - requirement: 'AC5: Support 1000 concurrent users'
    gap: 'No load testing implemented'
    severity: high
    suggested_test:
      type: performance
      description: 'Load test with 1000 concurrent connections'
```

### Traceability Outputs

#### Output 1: Gate YAML Block

**Generate for pasting into gate file under `trace`:**

```yaml
trace:
  totals:
    requirements: 5
    full: 3
    partial: 1
    none: 1
  planning_ref: '{qa.qaLocation}/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md'
  uncovered:
    - ac: 'AC3'
      reason: 'No test found for password reset timing'
  notes: 'See {qa.qaLocation}/assessments/{epic}.{story}-trace-{YYYYMMDD}.md'
```

#### Output 2: Traceability Report

**Save to:** `{qa.qaLocation}/assessments/{epic}.{story}-trace-{YYYYMMDD}.md`

```markdown
# Requirements Traceability Matrix

## Story: {epic}.{story} - {title}

### Coverage Summary

- Total Requirements: 5
- Fully Covered: 3 (60%)
- Partially Covered: 1 (20%)
- Not Covered: 1 (20%)

### Requirement Mappings

#### AC1: User can login with valid credentials

**Coverage: FULL**

Given-When-Then Mappings:

- **Unit Test**: `auth.service.test.ts::validateCredentials`
  - Given: Valid user credentials
  - When: Validation method called
  - Then: Returns true with user object

- **Integration Test**: `auth.integration.test.ts::loginFlow`
  - Given: User with valid account
  - When: Login API called
  - Then: JWT token returned and session created

#### AC2: Invalid credentials return error

**Coverage: PARTIAL**

[Continue for all ACs...]

### Critical Gaps

1. **Performance Requirements**
   - Gap: No load testing for concurrent users
   - Risk: High - Could fail under production load
   - Action: Implement load tests using k6 or similar

2. **Security Requirements**
   - Gap: Rate limiting not tested
   - Risk: Medium - Potential DoS vulnerability
   - Action: Add rate limit tests to integration suite

### Test Design Recommendations

Based on gaps identified, recommend:

1. Additional test scenarios needed
2. Test types to implement (unit/integration/e2e/performance)
3. Test data requirements
4. Mock/stub strategies

### Risk Assessment

- **High Risk**: Requirements with no coverage
- **Medium Risk**: Requirements with only partial coverage
- **Low Risk**: Requirements with full unit + integration coverage
```

#### Output 3: Story Hook Line

**Print this line for integration:**

```text
Trace matrix: {qa.qaLocation}/assessments/{epic}.{story}-trace-{YYYYMMDD}.md
```

### Traceability Best Practices

#### Given-When-Then for Mapping (Not Test Code)

Use Given-When-Then to document what each test validates:

**Given**: The initial context the test sets up

- What state/data the test prepares
- User context being simulated
- System preconditions

**When**: The action the test performs

- What the test executes
- API calls or user actions tested
- Events triggered

**Then**: What the test asserts

- Expected outcomes verified
- State changes checked
- Values validated

**Note**: This is for documentation only. Actual test code follows your project's standards (e.g., describe/it blocks, no BDD syntax).

#### Coverage Priority

Prioritize coverage based on:

1. Critical business flows
2. Security-related requirements
3. Data integrity requirements
4. User-facing features
5. Performance SLAs

#### Test Granularity

Map at appropriate levels:

- Unit tests for business logic
- Integration tests for component interaction
- E2E tests for user journeys
- Performance tests for NFRs

### Traceability Quality Indicators

Good traceability shows:

- Every AC has at least one test
- Critical paths have multiple test levels
- Edge cases are explicitly covered
- NFRs have appropriate test types
- Clear Given-When-Then for each test

### Red Flags

Watch for:

- ACs with no test coverage
- Tests that don't map to requirements
- Vague test descriptions
- Missing edge case coverage
- NFRs without specific tests

### Integration with Gates

This traceability feeds into quality gates:

- Critical gaps → FAIL
- Minor gaps → CONCERNS
- Missing P0 tests from test-design → CONCERNS
- Full coverage → PASS contribution

---

## Integration with QA Workflow

### Workflow Sequence

1. **Planning** (qa-planning skill)
   - Risk profiling
   - Test design

2. **Review** (this skill)
   - Story review process
   - NFR assessment
   - Requirements traceability
   - Code refactoring

3. **Gate Decision** (qa-gate skill)
   - Formalize PASS/CONCERNS/FAIL/WAIVED
   - Create gate file with all assessment data

### Cross-Skill References

**From this skill to qa-planning**:

- "Reference risk profile from qa-planning skill"
- "Use test design matrix from qa-planning skill"
- "Validate risk mitigations identified in qa-planning"

**From this skill to qa-gate**:

- "See qa-gate skill for formalizing quality gate decisions"
- "Use qa-gate skill to create gate files from assessment data"

---

## Configuration and File Locations

### Expected Configuration

> **Note**: .bmad-core directory was intentionally removed. Configuration is now handled inline within each skill or through explicit file references.

All file locations should be defined in skill resources or explicit file references:

```yaml
qa:
  qaLocation: 'docs/qa' # Base directory for QA files
devStoryLocation: 'docs/prd' # Story files location
```

### File Naming Conventions (Updated 2025-12-09)

**QA Reports**:

- Stories: `story.[epic].[story].qa.[descriptive-name].md` (co-located with story)
- Tasks: `task.[number].qa.[descriptive-name].md` (co-located with task)

**Gate Files**:

- Stories: `story.[epic].[story].gate.[descriptive-name].yml` (co-located with story)
- Tasks: `task.[number].gate.[descriptive-name].yml` (co-located with task)

**NFR Assessments**: `{qa.qaLocation}/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md` (legacy, deprecated)
**Trace Reports**: `{qa.qaLocation}/assessments/{epic}.{story}-trace-{YYYYMMDD}.md` (legacy, deprecated)

**Note**: NFR and Trace assessments should now be included within the main QA report (co-located), not as separate files.

### Directory Structure (Updated 2025-12-09)

**NEW STRUCTURE** (Co-located):

```
docs/
├── prd/
│   └── [domain]/
│       └── [feature]/
│           ├── story.1.1.epic-name.md
│           ├── story.1.1.qa.epic-name.md    # Co-located QA report
│           └── story.1.1.gate.epic-name.yml # Co-located gate file
└── development/
    └── tasks/
        └── task.44.name/
            ├── task.44.name.md
            ├── task.44.qa.name.md          # Co-located QA report
            └── task.44.gate.name.yml       # Co-located gate file
```

**LEGACY STRUCTURE** (Deprecated):

```
docs/
└── qa/
    ├── assessments/       # Deprecated - use co-located QA reports
    │   ├── 1.1-nfr-20250130.md
    │   └── 1.1-trace-20250130.md
    └── gates/             # Deprecated - use co-located gate files
        └── [mirrored PRD structure]/
            └── story.1.1.gate.epic-name.yml
```

---

## Key Principles

1. **Adaptive Review Strategy**: Choose review method based on story characteristics - direct tools for small/well-documented stories, parallel agents for complex/high-risk scenarios. Ensures efficiency without sacrificing thoroughness.
2. **Single Pass Completion**: Complete ALL quality checks in one pass without waiting for user input between checks. Aligns with project's "single pass" directive while maintaining comprehensive assessment.
3. **Comprehensive Review**: Test architecture, code quality, NFRs, traceability in one process, leveraging automated findings (whether from direct tools or agents)
4. **Risk-Aware**: Depth of review scales with risk signals - more thorough for auth/payment/security, lighter for well-tested features
5. **Actionable Feedback**: Concrete recommendations with clear ownership, synthesized from all quality checks
6. **Refactor When Safe**: Improve code quality during review (with tests)
7. **Document Results in Story/Task File**: Update QA Testing Results and QA Completion Summary sections with gate decision, quality score, key findings, and deployment readiness
8. **Given-When-Then for Mapping**: Document test coverage, not test code
9. **Interactive When Needed**: Use AskUserQuestion for unclear scope or thresholds
10. **Integrated Outputs**: All assessments (direct tools + agents when used) feed into unified gate decision
11. **Update Status Based on Gate**: Set story/task status according to gate decision (PASS/CONCERNS → Ready for Done, FAIL → Reopened)
12. **Re-Review When Concerns Exist**: ALWAYS check for existing gate files. Only skip re-review if gate is PASS with NO top_issues. Re-review when gate has CONCERNS/FAIL or any top_issues listed, to verify fixes were implemented.
