---
name: finalise
description: Verify story/task completion against comprehensive Definition of Done criteria (acceptance criteria, tests, code reviews, documentation, security review, compliance check), then update status to 'accepted' and generate Sprint Review artifacts, or list gaps if incomplete. Use when finalising stories or tasks for Sprint Review.
---

# Finalise Story/Task

## Overview

Mark a story or task as complete by verifying it against a comprehensive Definition of Done (DoD) checklist. This skill automates the verification of acceptance criteria, unit tests, code reviews, documentation updates, security reviews, and compliance checks.

**CRITICAL - Incremental Verification Approach:** This skill writes verification results incrementally as each DoD item is checked. A co-located running summary file (`story.{epic}.{story}.dod.{num}.{story-name}.md`) is created at the start and updated after EACH verification step. This ensures:
- Real-time visibility into verification progress
- Complete audit trail of what was checked and when
- No loss of work if verification is interrupted
- Transparency for stakeholders who can monitor the running summary file

**Relationship to implementation report**: The DoD running summary (`story.{epic}.{story}.dod.{num}.{story-name}.md`) is a QA/verification artifact — it records the DoD check results. The implementation report (`story.{epic}.{story}.implementation.{N}.md`), created by the `develop-story` orchestrator, records the full pipeline audit trail. They are complementary, not redundant:
- Implementation report: pipeline-level log (branch, PR, QA iterations, decisions)
- DoD running summary: verification-level log (acceptance criteria pass/fail, security check, compliance check)

Both are co-located in the story directory. When invoked from `develop-story`, the DoD summary is the canonical record of finalise results; the implementation report references it.

Based on the verification results, it either marks the story/task as "Accepted" with generated artifacts, or lists specific gaps that need to be addressed.

## When to Use This Skill

This skill should be used when:

- A developer believes a story or task is complete and ready for Sprint Review
- Quality assurance needs to verify DoD compliance before accepting work
- Product Owner wants to validate that all acceptance criteria have been met
- A story/task document needs to transition from `code_review` or `testing` status to `accepted`
- Sprint Review preparation requires a summary of completed work

**Trigger Phrases:**

- "Mark [story/task] as complete"
- "Verify DoD for story.XXX.Y"
- "Is story.XXX.Y ready for acceptance?"
- "Check if task.ZZZ meets Definition of Done"
- "Prepare story.XXX.Y for Sprint Review"

## Workflow

Follow this systematic workflow to verify and mark a story/task as complete. **CRITICAL**: After checking EACH Definition of Done item, immediately write the result to the running summary file. Do NOT wait until all checks are complete.

### Step 0: Initialize Task List and Create Running Summary File

Before starting any verification, create a task list to track every sub-step to completion, then create the running summary file.

**CRITICAL — Task List Initialization:**

Use `TaskCreate` to register every sub-step you will execute. This prevents skipping steps. Create one task per action item below, then mark each `in_progress` before starting it and `completed` immediately after finishing it.

**Tasks to create at the start (use TaskCreate for each):**

| Task Subject | Description |
|---|---|
| Read story document | Locate and parse the story/task markdown file |
| Review QA reports | Find and read QA report and gate files in story directory |
| Verify acceptance criteria | Check all AC checkboxes and PR approval status |
| Security review | Run story-type-specific security checklist |
| Compliance review | Run applicable compliance checklist (GDPR, WCAG, etc.) |
| Make acceptance decision | Evaluate all checks and decide ACCEPT or GAPS |
| Update story document | Add DoD section (accepted or gap report) to story file |
| Update frontmatter | Change status, updated, completed_date fields (accepted path only) |
| Generate Sprint Review summary | Create sprint-review-summary.md from template (accepted path only) |
| Post PR comment | Post acceptance or gap comment to GitHub PR |
| Update running summary | Finalize story.{epic}.{story}.dod.{num}.{name}.md with outcome |
| Communicate to user | Output final result block to user |

Create all tasks upfront, then work through them in order. Do NOT skip any task.

---

Before starting any verification, also create a co-located running summary file to track results incrementally.

**Actions:**

1. **Determine story/task directory:**
   - Extract directory path from the story/task file path provided
   - Example: `docs/prd/.../story.311.1.transaction-confirmation-system/`

2. **Create running summary file:**
   - File name format (stories): `story.{epic}.{story}.dod.{num}.{story-name}.md` — `{num}` starts at 1, increment if re-running finalise
   - File name format (tasks): `task.{id}.dod.{num}.{task-name}.md`
   - Full path: `{story-directory}/story.{epic}.{story}.dod.{num}.{story-name}.md`
   - Initialize with header and timestamp

3. **Write initial content:**

   ```markdown
   # Definition of Done Verification

   **Story/Task:** {story-name}
   **Verification Started:** {current-date-time}
   **Status:** IN PROGRESS

   ---

   ## Verification Results

   _Results will be written incrementally as each check completes..._

   ---
   ```

4. **Use Write tool to create the file**

**Example:**

If verifying `docs/prd/.../story.311.1.transaction-confirmation-system/story.311.1.transaction-confirmation-system.md`, create:

`docs/prd/.../story.311.1.transaction-confirmation-system/story.311.1.dod.1.transaction-confirmation-system.md`

### Step 1: Locate and Read the Story/Task Document

Accept the story/task document path in one of these formats:

**Full path to markdown file:**

```
docs/prd/user-experience/notifications/epics/epic.311.financial-services-integration/stories/story.311.1.transaction-confirmation-system/story.311.1.transaction-confirmation-system.md
```

**Directory path (skill will find the .md file):**

```
docs/prd/user-experience/notifications/epics/epic.311.financial-services-integration/stories/story.311.1.transaction-confirmation-system/
```

**Task path examples:**

```
docs/development/tasks/task.90.swagger-cli-plugin-enablement/task.90.swagger-cli-plugin-enablement.md
docs/development/tasks/task.90.swagger-cli-plugin-enablement/
```

**Actions:**

1. If given a directory path, use Glob to find the `.md` file: `{directory}/*.md`
2. Read the story/task document using the Read tool
3. Parse YAML frontmatter to extract current status and metadata
4. Extract acceptance criteria, PR references, and documentation notes from the body

### Step 2: Check for and Review QA Reports

Before proceeding with manual DoD verification, check if QA reports and gate files exist in the story/task directory. These provide comprehensive quality assessments that inform the finalisation decision.

**Actions:**

1. **Search for QA Reports and Gate Files:**
   - Use Glob to find QA report files: `{story-directory}/*.qa.*.md`
   - Use Glob to find gate files: `{story-directory}/*.gate.*.yml`
   - If multiple reports exist, review the most recent one (highest number in filename)

2. **Read and Analyze QA Reports (if found):**
   - Read the QA report markdown file
   - Extract key information:
     - **Gate Status**: PASS/FAIL/CONCERNS/WAIVED
     - **Acceptance Criteria Coverage**: Which ACs are complete, ready, or have gaps
     - **Test Execution Status**: Unit/integration/load/performance test status
     - **NFR Validation**: Security, performance, reliability, maintainability assessments
     - **Quality Score**: Overall quality rating
     - **Issues Found**: Critical, major, or minor issues identified
     - **Recommendations**: Immediate actions, future improvements
     - **Deployment Readiness**: Staging/production approval status

3. **Read and Analyze Gate Files (if found):**
   - Read the gate YAML file
   - Parse key fields:
     - `gate`: PASS/FAIL/CONCERNS/WAIVED
     - `status_reason`: Why the gate passed or failed
     - `top_issues[]`: Blocking issues list
     - `waiver.active`: Whether issues were waived
     - `quality_score`: Numeric quality assessment
     - `evidence.trace.ac_covered[]`: Which ACs are covered
     - `evidence.trace.ac_gaps[]`: Which ACs have gaps
     - `evidence.trace.ac_implementation_status[]`: Detailed AC status
     - `nfr_validation`: Security, performance, reliability, maintainability status
     - `recommendations.immediate[]`: Blocking issues requiring fixes
     - `recommendations.future[]`: Non-blocking improvements
     - `deployment_readiness`: Staging/production conditions
     - `test_execution_status`: Test suite creation and execution status

4. **Use QA Information to Inform DoD Decision:**
   - **If gate status is PASS:**
     - Verify that all acceptance criteria are marked as covered
     - Check that NFR validations all show PASS status
     - Confirm no immediate recommendations exist
     - Verify test execution status is acceptable (tests created and passing)
     - Use QA report findings to supplement manual verification

   - **If gate status is FAIL:**
     - Review `top_issues[]` and `recommendations.immediate[]`
     - These are blocking issues that MUST be addressed before acceptance
     - Include these gaps in the final gap report (Step 7)
     - DO NOT mark story as accepted

   - **If gate status is CONCERNS:**
     - Review concerns listed in `status_reason` and recommendations
     - Determine if concerns are blocking or can be addressed post-acceptance
     - Use judgment to decide if story can be accepted with conditions

   - **If gate status is WAIVED:**
     - Check `waiver.active` and understand why issues were waived
     - Verify waiver is appropriate and documented
     - Consider waived issues in acceptance decision

5. **Document QA Report Findings:**
   - If QA reports exist, reference them in the final DoD verification section
   - Include gate status, quality score, and key findings
   - Link to QA report and gate files in the acceptance documentation

**Example QA Report Discovery:**

```markdown
### QA Reports Found ✅

**QA Report**: `story.309.2.2C.qa.1.initial-review.md`
**Gate File**: `story.309.2.2C.gate.1.initial-review.yml`

**Gate Status**: PASS ✅
**Quality Score**: 90/100 (EXCELLENT)
**Status Reason**: Excellent implementation with production-ready health monitoring, comprehensive test suites, and thorough documentation.

**Acceptance Criteria Coverage**:

- AC1: ✅ COMPLETE - Provider registration implemented
- AC2: ✅ COMPLETE - Health monitoring implemented
- AC3: ⚠️ READY - Integration tests created, pending environment setup
- AC4: ⚠️ READY - Performance tests created, baseline pending execution
- AC5: ⚠️ READY - Load tests created, pending environment setup

**NFR Validation**:

- Security: ✅ PASS
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Deployment Readiness**:

- Staging: ✅ APPROVED
- Production: ⚠️ CONDITIONAL (pending staging validation)

**Immediate Actions**: None (no blocking issues)
**Future Actions**: 6 recommendations for post-deployment improvements
```

**If No QA Reports Found:**

- Proceed with manual DoD verification (Steps 3-5)
- Note in running summary that no QA reports were available
- Manual verification becomes primary source of acceptance decision

6. **Write QA Report Findings to Running Summary:**
   - Use Edit tool to append QA findings to the running summary file
   - If QA reports found, write gate status, quality score, AC coverage, NFR status
   - If no QA reports found, write "No QA reports found - proceeding with manual verification"

   **Example append (QA reports found):**

   ```markdown
   ## Step 1: QA Report Review ✅

   **QA Report Found:** `story.309.2.2C.qa.1.initial-review.md`
   **Gate File Found:** `story.309.2.2C.gate.1.initial-review.yml`

   **Gate Status:** ✅ PASS
   **Quality Score:** 90/100 (EXCELLENT)

   **Acceptance Criteria Coverage (from QA):**
   - AC1: ✅ COMPLETE
   - AC2: ✅ COMPLETE
   - AC3: ⚠️ READY (tests created, pending execution)

   **NFR Validation (from QA):**
   - Security: ✅ PASS
   - Performance: ✅ PASS
   - Reliability: ✅ PASS
   - Maintainability: ✅ PASS

   **Immediate Actions from QA:** None (no blocking issues)
   **Future Actions from QA:** 6 post-deployment recommendations

   ---
   ```

   **Example append (no QA reports):**

   ```markdown
   ## Step 1: QA Report Review ⚠️

   **QA Reports:** No QA reports or gate files found in story directory.
   **Manual Verification:** Proceeding with manual DoD verification for all criteria.

   ---
   ```

### Step 3: Verify Core Acceptance Criteria

Reference the **Definition of Done checklist** (`references/definition-of-done-checklist.md`) for detailed verification patterns.

**Note:** If QA reports were found in Step 2, use them to supplement this verification. Cross-reference manual findings with QA report results.

**Actions:**

1. **Check Acceptance Criteria Completion:**
   - Look for markdown checkboxes: `- [x]` (complete) vs `- [ ]` (incomplete)
   - Verify all acceptance criteria checkboxes are marked as complete
   - If any checkbox is unchecked, note it as a gap

2. **Verify Unit Tests and Code Review:**
   - Extract PR number from frontmatter (`pr_number: 123`) or body (`PR #123`, `https://github.com/org/repo/pull/123`)
   - Use `gh pr view <number>` to check:
     - PR exists and is accessible
     - PR has been approved by at least one reviewer
     - Tests are mentioned in PR description or story document
   - If PR is not found, not approved, or tests are missing, note as a gap

3. **Check Documentation Updates:**
   - Verify documentation references in the story/task document
   - Check if PR description mentions documentation updates
   - For different story types, verify appropriate documentation:
     - **API stories**: Swagger/OpenAPI specs updated
     - **UI stories**: User guide or screenshots provided
     - **Data stories**: Schema documentation updated
     - **Config stories**: Configuration guide updated
   - If documentation is missing for the story type, note as a gap

4. **Write Acceptance Criteria Results to Running Summary (AFTER EACH CHECK):**
   - After checking EACH acceptance criterion, immediately append the result to the running summary
   - After checking PR status, immediately append to running summary
   - After checking documentation, immediately append to running summary
   - Do NOT wait until all checks are complete

   **Example incremental appends:**

   After checking AC1:
   ```markdown
   ## Step 2: Core Acceptance Criteria

   ### AC1: User can submit the form successfully
   **Status:** ✅ COMPLETE
   **Evidence:** PR #789 includes implementation in `src/forms/submit-handler.ts:45-78`
   ```

   After checking AC2:
   ```markdown
   ### AC2: Validation errors are displayed correctly
   **Status:** ✅ COMPLETE
   **Evidence:** Implementation in `src/forms/validation.tsx:120-145`, test coverage in `validation.spec.tsx:67-89`
   ```

   After checking AC3:
   ```markdown
   ### AC3: Success message appears after submission
   **Status:** ❌ GAP IDENTIFIED
   **Evidence:** No implementation found in PR #789 or story directory
   **Action Required:** Implement success message feature
   ```

   After checking PR:
   ```markdown
   ### PR Review & Tests
   **PR Number:** #789
   **PR Status:** ✅ APPROVED (2 reviewers)
   **Tests Found:** ✅ Yes - `src/forms/submit-handler.spec.ts` (12 test cases)
   **Test Coverage:** 94% statement coverage

   ---
   ```

   After checking documentation:
   ```markdown
   ### Documentation
   **API Documentation:** ✅ Swagger spec updated in PR #789
   **User Guide:** ✅ Screenshots added to `docs/user-guide/forms.md`
   **Architecture Docs:** ⚠️ NOT APPLICABLE for this story type

   ---
   ```

### Step 4: Conduct Security Review

Reference `references/definition-of-done-checklist.md` Section "Security Review Checklist" for story-type-specific checks.

**Note:** If QA reports were found in Step 2, review the `nfr_validation.security` section to see if security was already assessed. Use QA findings to inform this review.

**Actions:**

1. **Identify Story Type:** Determine if the story is API/Backend, UI/Frontend, Data/Database, Authentication/Authorization, or Infrastructure/DevOps

2. **Apply Story-Type-Specific Security Checklist:**
   - **API/Backend:**
     - Authentication & authorization checks
     - Input validation (SQL injection, command injection, path traversal, XSS prevention)
     - Data protection (encryption, no sensitive data in logs)
     - Error handling (no stack traces to clients)
     - Dependency vulnerabilities (`npm audit`)

   - **UI/Frontend:**
     - XSS prevention (input sanitization, CSP headers)
     - Token storage security (httpOnly cookies, not localStorage)
     - No sensitive data in client code
     - Protected routes require authentication

   - **Data/Database:**
     - Database credentials secured
     - Row-level security if applicable
     - Foreign key and unique constraints
     - Migration safety (reversible, no data loss)
     - PII encryption

   - **Authentication/Authorization:**
     - Password hashing (bcrypt/argon2)
     - Token security (JWT secrets, expiration)
     - MFA implementation if applicable
     - Session management (expiration, logout invalidation)

   - **Infrastructure/DevOps:**
     - No secrets in version control
     - Production environment isolated
     - Security events logged (no PII in logs)
     - TLS/SSL certificates valid

3. **General Security Questions:**
   - Has the code been scanned for vulnerabilities?
   - Are there security-related TODOs or FIXMEs?
   - Does the implementation follow OWASP Top 10 guidelines?

4. **Write Security Check Results to Running Summary (AFTER EACH CHECK):**
   - After checking EACH security item, immediately append the result to the running summary
   - Do NOT wait until all security checks are complete
   - For each check category (auth, input validation, data protection, etc.), write results immediately

   **Example incremental appends:**

   After checking authentication & authorization:
   ```markdown
   ## Step 3: Security Review

   **Story Type:** API/Backend

   ### Authentication & Authorization
   **Status:** ✅ PASS
   **Evidence:**
   - JWT middleware enforced in `src/auth/jwt-guard.ts:23-45`
   - Role-based access control in `src/auth/rbac.decorator.ts:12-34`
   - All endpoints require authentication except `/health`
   ```

   After checking input validation:
   ```markdown
   ### Input Validation
   **Status:** ❌ GAP IDENTIFIED
   **Issues Found:**
   - Email field lacks validation (XSS risk) in `src/forms/submit-handler.ts:67`
   - No SQL injection protection in `src/database/query-builder.ts:89`
   **Action Required:**
   - Add email sanitization using validator library
   - Use parameterized queries for all database operations
   ```

   After checking data protection:
   ```markdown
   ### Data Protection
   **Status:** ✅ PASS
   **Evidence:**
   - Passwords hashed with bcrypt (12 rounds) in `src/auth/password.service.ts:45`
   - Sensitive data encrypted at rest using AES-256
   - No PII in application logs (verified in `src/logging/logger.ts:23`)
   ```

   After checking error handling:
   ```markdown
   ### Error Handling
   **Status:** ⚠️ CONCERNS
   **Issues Found:**
   - Stack traces exposed in development mode only (acceptable)
   - Generic error messages in production (good)
   **Recommendation:** Document error codes in API documentation

   ---
   ```

### Step 5: Conduct Compliance Review

Reference `references/definition-of-done-checklist.md` Section "Compliance Review Checklist".

**Note:** If QA reports were found in Step 2, review the `nfr_validation` section for compliance-related assessments. Use QA findings to inform this review.

**Actions:**

1. **Determine Applicable Compliance Requirements:**
   - **Data Privacy (GDPR, CCPA):** If story involves collecting, processing, or storing personal data
   - **Financial/Transaction (PCI-DSS, SOX):** If story involves financial transactions or payment data
   - **Accessibility (WCAG, ADA):** If story involves UI/UX changes
   - **Industry-Specific:** Healthcare (HIPAA), Financial Services (SOX, FINRA), Government (FedRAMP)

2. **Verify Compliance for Applicable Requirements:**

   **Data Privacy:**
   - Data minimization (only necessary data collected)
   - User consent obtained where required
   - Right to access, delete, rectify, and data portability implemented
   - Data retention policy defined
   - Third-party data sharing documented and consented

   **Financial/Transaction:**
   - PCI-DSS compliance for payment card data
   - No card data storage unless PCI-DSS certified
   - Tokenization via payment processor
   - Audit trail for all transactions
   - Transaction reconciliation capability

   **Accessibility:**
   - Keyboard navigation for all interactive elements
   - Screen reader support (ARIA labels and roles)
   - WCAG AA color contrast (4.5:1 for normal text)
   - Visible focus indicators
   - Alternative text for images

3. **Write Compliance Check Results to Running Summary (AFTER EACH CHECK):**
   - After checking EACH compliance requirement, immediately append the result to the running summary
   - Do NOT wait until all compliance checks are complete
   - For each compliance category (GDPR, PCI-DSS, WCAG, etc.), write results immediately

   **Example incremental appends:**

   After checking GDPR compliance:
   ```markdown
   ## Step 4: Compliance Review

   **Applicable Requirements:** Data Privacy (GDPR), Accessibility (WCAG)

   ### Data Privacy (GDPR)
   **Status:** ❌ GAP IDENTIFIED
   **Issues Found:**
   - No user consent flow implemented for data collection
   - Data retention policy not documented
   - Right to delete not implemented
   **Action Required:**
   - Implement cookie consent banner
   - Document data retention in privacy policy
   - Add account deletion API endpoint
   ```

   After checking accessibility compliance:
   ```markdown
   ### Accessibility (WCAG AA)
   **Status:** ⚠️ CONCERNS
   **Issues Found:**
   - Color contrast ratio is 3.8:1 (needs 4.5:1) for button text
   - Missing ARIA labels on 3 interactive elements
   **Passes:**
   - ✅ Keyboard navigation works for all forms
   - ✅ Screen reader support verified with VoiceOver
   - ✅ Focus indicators visible on all interactive elements
   **Action Required:**
   - Increase button text color contrast to meet WCAG AA
   - Add ARIA labels to search input, filter dropdown, sort button
   ```

   After checking financial compliance:
   ```markdown
   ### Financial/Transaction (PCI-DSS)
   **Status:** ⚠️ NOT APPLICABLE
   **Reason:** Story does not involve payment card data or financial transactions
   **Evidence:** Feature is limited to user profile management

   ---
   ```

### Step 6: Make Acceptance Decision

Use the **Decision Matrix** from `references/definition-of-done-checklist.md` to determine if the story/task should be marked as "Accepted" or remain "In Progress".

**Decision Logic:**

| All Acceptance Criteria Met? | Tests & PR Approved? | Docs Updated? | Security Passed? | Compliance Passed? | QA Gate Status? | **Decision**                     |
| ---------------------------- | -------------------- | ------------- | ---------------- | ------------------ | --------------- | -------------------------------- |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ✅ Yes           | ✅ Yes             | ✅ PASS or N/A  | **ACCEPTED** ✅                  |
| ❌ No                        | -                    | -             | -                | -                  | -               | **IN PROGRESS** (list gaps)      |
| ✅ Yes                       | ❌ No                | -             | -                | -                  | -               | **IN PROGRESS** (list gaps)      |
| ✅ Yes                       | ✅ Yes               | ❌ No         | -                | -                  | -               | **IN PROGRESS** (list gaps)      |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ❌ No            | -                  | -               | **IN PROGRESS** (list gaps)      |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ✅ Yes           | ❌ No              | -               | **IN PROGRESS** (list gaps)      |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ✅ Yes           | ✅ Yes             | ❌ FAIL         | **IN PROGRESS** (QA gate failed) |

**QA Gate Integration:**

- **If QA gate status is PASS**: Proceed with acceptance if all other criteria are met
- **If QA gate status is FAIL**: Do NOT accept the story, even if manual checks pass. Review `top_issues[]` and `recommendations.immediate[]` for blocking issues.
- **If QA gate status is CONCERNS**: Use judgment - review concerns and determine if they are blocking or can be addressed post-acceptance
- **If QA gate status is WAIVED**: Check that waiver is properly documented and justified, then proceed based on other criteria
- **If no QA gate exists**: Rely solely on manual DoD verification (Steps 3-5)

**Actions:**

1. **Read the running summary file** to review all verification results
2. **Count passes, fails, and concerns** from the incremental verification results
3. **Write the acceptance decision to the running summary:**

   **Example decision append (all criteria met):**

   ```markdown
   ## Step 5: Acceptance Decision

   **Decision:** ✅ ACCEPTED

   **Summary:**
   - QA Report: ✅ PASS (Quality Score: 90/100)
   - Acceptance Criteria: ✅ 5/5 complete
   - PR Review & Tests: ✅ Approved by 2 reviewers, 14 unit tests
   - Documentation: ✅ API docs and user guide updated
   - Security Review: ✅ All checks passed
   - Compliance Review: ✅ GDPR and WCAG AA compliant

   **Outcome:** Story meets all Definition of Done criteria and is ready for acceptance.

   ---
   ```

   **Example decision append (gaps identified):**

   ```markdown
   ## Step 5: Acceptance Decision

   **Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

   **Summary:**
   - QA Report: ❌ FAIL (Quality Score: 45/100)
   - Acceptance Criteria: ⚠️ 4/5 complete (AC3 missing)
   - PR Review & Tests: ❌ No PR linked
   - Documentation: ⚠️ API docs missing
   - Security Review: ❌ 2 critical issues (input validation, password strength)
   - Compliance Review: ❌ GDPR consent flow missing

   **Blocking Issues:**
   1. QA Gate: FAIL status (3 blocking security issues from QA)
   2. AC3: Success message not implemented
   3. No PR number in story document
   4. Security: Input validation missing for email field (XSS risk)
   5. Security: Password strength requirements not enforced
   6. Compliance: GDPR consent flow not implemented

   **Outcome:** Story does NOT meet Definition of Done. Gaps must be addressed before acceptance.

   ---
   ```

4. **Proceed based on decision:**
   - If **ALL criteria are met** (including QA gate if present), proceed to Step 7 (Mark as Accepted)
   - If **ANY criteria are missing** or **QA gate is FAIL**, proceed to Step 8 (Report Gaps)

### Step 7: Mark as Accepted and Generate Artifacts

If all DoD criteria are met, finalize the running summary, update the story/task document, and generate Sprint Review artifacts.

**Actions:**

1. **Finalize Running Summary File:**
   - Add final completion section to the running summary
   - Update status from "IN PROGRESS" to "COMPLETED - ACCEPTED"
   - Add timestamp

   **Example final append:**

   ```markdown
   ## Verification Complete

   **Final Status:** ✅ ACCEPTED
   **Completion Time:** {current-date-time}
   **Total Duration:** {duration}

   **Artifacts Generated:**
   - ✅ Story document updated with DoD verification section
   - ✅ Sprint Review summary created
   - ✅ PR comment posted (if applicable)

   **Next Steps:**
   - Story is ready for Sprint Review
   - No further action required
   ```

2. **Update Frontmatter:**
   - Change `status` to `accepted`
   - Update `updated` field to current date (YYYY-MM-DD)
   - Add `completed_date` field with current date
   - Ensure `pr_number` is present in frontmatter (add if only in body)

   **Example:**

   ```yaml
   ---
   status: accepted
   updated: 2025-02-01
   completed_date: 2025-02-01
   pr_number: 789
   ---
   ```

3. **Add DoD Verification Section to Document Body:**
   - Add a "## Definition of Done - PASSED ✅" section to the document
   - Summarize all verified criteria
   - **If QA reports exist**, include QA findings and reference the QA report
   - Include review date and reviewer

   **Example (with QA report):**

   ```markdown
   ## Definition of Done - PASSED ✅

   **Status:** ACCEPTED

   ### QA Report Summary

   **QA Report**: `story.309.2.2C.qa.1.initial-review.md`
   **Gate File**: `story.309.2.2C.gate.1.initial-review.yml`
   **Gate Status**: ✅ PASS
   **Quality Score**: 90/100 (EXCELLENT)

   All Definition of Done criteria have been verified:

   ✅ **Acceptance Criteria:** All 5 criteria met (AC1-2 complete, AC3-5 ready with tests created)
   ✅ **Unit Tests:** 14 unit tests + 27 test groups (integration/load/performance) - 2,245 lines of test code
   ✅ **PR Review:** PR #43 with 8 commits, 21 files changed (+4,738/-227 lines)
   ✅ **Documentation:** 1,400+ lines of deployment guides, DI patterns, troubleshooting
   ✅ **Security Review:** ✅ PASS - No hardcoded credentials, proper validation, graceful degradation
   ✅ **Performance:** ✅ PASS - Concurrent health checks, Redis caching, performance targets documented
   ✅ **Reliability:** ✅ PASS - Comprehensive error handling, automatic failover
   ✅ **Maintainability:** ✅ PASS - Excellent test coverage (2.8:1 ratio), extensive documentation

   **Deployment Readiness:**

   - Staging: ✅ APPROVED (ready for deployment)
   - Production: ⚠️ CONDITIONAL (pending staging validation)

   **Story marked as ACCEPTED on:** 2025-02-01
   **Reviewed by:** Claude Code (finalise skill)
   **QA Engineer:** QA Engineer (Claude Sonnet 4.5)
   ```

   **Example (without QA report):**

   ```markdown
   ## Definition of Done - PASSED ✅

   **Status:** ACCEPTED

   All Definition of Done criteria have been verified:

   ✅ **Acceptance Criteria:** All 5 criteria met
   ✅ **Unit Tests:** PR #789 approved by 2 reviewers, tests in `src/auth/auth.spec.ts`
   ✅ **Documentation:** API docs updated in `docs/api/auth.md`, Swagger spec updated
   ✅ **Security Review:** Password hashing, JWT security, input validation verified
   ✅ **Compliance Review:** GDPR consent flow implemented, WCAG AA accessibility met

   **Story marked as ACCEPTED on:** 2025-02-01
   **Reviewed by:** Claude Code (finalise skill)
   ```

4. **Reference Running Summary in DoD Section:**
   - Add a reference to the detailed running summary file
   - Example: "**Detailed Verification Log:** See `story.311.1.dod.1.transaction-confirmation-system.md` for complete verification evidence and timestamps."

5. **Generate Sprint Review Summary:**
   - Use the template from `assets/sprint-review-summary-template.md`
   - Fill in all sections with information from the story/task document and PR
   - Save summary as: `{story-directory}/sprint-review-summary.md`

6. **Add GitHub PR Comment:**
   - Use `gh pr comment <pr-number>` to add a summary comment
   - Include acceptance confirmation and link to Sprint Review summary

   **Example PR Comment:**

   ```markdown
   ## ✅ Story Accepted - Ready for Sprint Review

   **Story:** story.311.1.transaction-confirmation-system
   **Status:** ACCEPTED
   **Acceptance Date:** 2025-02-01

   All Definition of Done criteria have been verified:

   - ✅ All acceptance criteria met
   - ✅ Tests written and PR approved
   - ✅ Documentation updated
   - ✅ Security review passed
   - ✅ Compliance review passed

   **Sprint Review Summary:** See `sprint-review-summary.md` in story directory

   **Reviewed by:** Claude Code (finalise skill)
   ```

7. **Communicate to User:**
   - Display a success message with summary of completion
   - Show path to updated story document
   - Show path to Sprint Review summary
   - Confirm PR comment was posted

**Step 7 Completion Checklist — tick off each before moving on:**

- [ ] Running summary file finalized (status = COMPLETED - ACCEPTED)
- [ ] Story frontmatter updated: `status: accepted`, `updated`, `completed_date`, `pr_number`
- [ ] DoD PASSED section added to story document body
- [ ] Running summary referenced in DoD section
- [ ] Sprint Review summary file created at `{story-directory}/sprint-review-summary.md`
- [ ] GitHub PR comment posted via `gh pr comment <number>`
- [ ] User notified with success message, artifact paths, and PR comment link

### Step 8: Report Gaps (In Progress)

If any DoD criteria are not met, finalize the running summary with gaps, keep the story/task in "In Progress", and report specific gaps.

**Actions:**

1. **Finalize Running Summary File with Gaps:**
   - Add final completion section to the running summary
   - Update status from "IN PROGRESS" to "COMPLETED - GAPS IDENTIFIED"
   - Summarize blocking issues and estimated effort
   - Add timestamp

   **Example final append for gaps:**

   ```markdown
   ## Verification Complete

   **Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

   **Completion Time:** {current-date-time}
   **Total Duration:** {duration}

   **Blocking Issues Summary:**
   1. QA Gate: FAIL status (3 blocking security issues from QA)
   2. AC3: Success message not implemented
   3. No PR number in story document
   4. Security: Input validation missing for email field (XSS risk)
   5. Security: Password strength requirements not enforced
   6. Compliance: GDPR consent flow not implemented

   **Estimated Effort to Close Gaps:** Large (6-8 hours)

   **Artifacts Generated:**
   - ✅ Gap report added to story document
   - ✅ PR comment posted (if applicable)

   **Next Steps:**
   - Address blocking issues listed above
   - Re-run verification after fixes are implemented
   ```

2. **Do NOT Update Story Status:**
   - Keep the current status (e.g., `in_progress`, `code_review`, `testing`)
   - Do NOT mark as `accepted`

3. **Add Gap Report to Document Body:**
   - Add a "## Definition of Done - Gaps Identified" section
   - List all specific gaps by category
   - **If QA reports exist**, include QA gate findings and top issues
   - Provide actionable next steps
   - Estimate effort to close gaps (Small/Medium/Large)

   **Example Gap Report with QA Gate (use format from `references/definition-of-done-checklist.md`):**

   ```markdown
   ## Definition of Done - Gaps Identified

   **Status:** IN PROGRESS

   ### QA Gate Status

   **QA Report**: `story.311.2.qa.1.initial-review.md`
   **Gate File**: `story.311.2.gate.1.initial-review.yml`
   **Gate Status**: ❌ FAIL
   **Quality Score**: 45/100 (NEEDS IMPROVEMENT)

   **Top Issues from QA:**

   1. ⚠️ Security: Input validation missing for email field (XSS risk) - **BLOCKING**
   2. ⚠️ Security: Password strength requirements not enforced - **BLOCKING**
   3. ⚠️ Tests: No unit tests found for authentication service - **BLOCKING**

   ### Missing Criteria:

   1. **Acceptance Criteria:**
      - [ ] Success message appears after submission (not yet implemented)

   2. **Unit Tests:**
      - ⚠️ No PR number found in document. Please link the PR.
      - ⚠️ No unit tests found (flagged by QA as blocking)

   3. **Documentation:**
      - ⚠️ API endpoint documentation not updated in Swagger spec

   4. **Security Review:**
      - ⚠️ Input validation missing for email field (XSS risk) - **QA BLOCKING**
      - ⚠️ Password strength requirements not enforced - **QA BLOCKING**

   5. **Compliance Review:**
      - ⚠️ GDPR: No user consent flow implemented for data collection

   ### Next Steps:

   - [ ] **BLOCKING**: Implement input validation for email field
   - [ ] **BLOCKING**: Add password strength validation
   - [ ] **BLOCKING**: Add unit tests for authentication service
   - [ ] Complete success message feature
   - [ ] Add PR link to story document
   - [ ] Update Swagger API documentation
   - [ ] Add user consent flow for GDPR compliance

   **Estimated Effort:** Large (6-8 hours) - includes 3 blocking security issues

   **Gap Report Generated:** 2025-02-01
   **Reviewed by:** Claude Code (finalise skill)
   **QA Gate Reference**: See `story.311.2.gate.1.initial-review.yml` for full details

   **Detailed Verification Log:** See `story.311.2.dod.1.transaction-event-history.md` for complete verification evidence and timestamps.
   ```

4. **Add GitHub PR Comment (if PR exists):**
   - Use `gh pr comment <pr-number>` to notify about gaps
   - Request changes to address gaps

   **Example PR Comment:**

   ```markdown
   ## ⚠️ Definition of Done - Gaps Identified

   This story/task cannot be marked as Accepted due to the following gaps:

   **Acceptance Criteria:**

   - [ ] Success message appears after submission

   **Documentation:**

   - API endpoint documentation not updated in Swagger spec

   **Security:**

   - Input validation missing for email field (XSS risk)
   - Password strength requirements not enforced

   **Compliance:**

   - GDPR: No user consent flow implemented

   Please address these gaps before requesting acceptance.

   **Full gap report:** See story document for complete details and next steps.
   ```

5. **Communicate to User:**
   - Display a clear message that the story is NOT ready for acceptance
   - List all gaps in a readable format
   - Suggest next steps to close the gaps
   - Estimate effort required

**Step 8 Completion Checklist — tick off each before moving on:**

- [ ] Running summary file finalized (status = COMPLETED - GAPS IDENTIFIED)
- [ ] Story status NOT changed (kept at current status, not set to accepted)
- [ ] Gap report section added to story document body
- [ ] GitHub PR comment posted via `gh pr comment <number>` (skip only if no PR exists)
- [ ] User notified with clear NOT ACCEPTED message, gap list, and next steps

## Usage Examples

### Example 1: Story Fully Meets DoD

**User Request:**

```
Mark story.311.1.transaction-confirmation-system as complete
```

**Skill Actions:**

1. Read story document from `docs/prd/.../story.311.1.transaction-confirmation-system.md`
2. Check for QA reports - found `story.311.1.qa.1.initial-review.md` ✅
3. Review QA gate file - `story.311.1.gate.1.initial-review.yml` shows PASS ✅
4. Verify all acceptance criteria are checked (cross-reference with QA report) ✅
5. Find PR #789, verify it's approved ✅
6. Check documentation is updated ✅
7. Run security checklist for API story type (QA already assessed) ✅
8. Run compliance checklist (GDPR, accessibility - QA already assessed) ✅
9. Update story status to `accepted`
10. Generate Sprint Review summary (including QA findings)
11. Post acceptance comment to PR #789 (including QA gate status)

**Output:**

```
✅ Story Accepted - Ready for Sprint Review

**Story:** story.311.1.transaction-confirmation-system
**Status:** ACCEPTED
**Acceptance Date:** 2025-02-01

**QA Gate Status:** ✅ PASS (Quality Score: 92/100)

All Definition of Done criteria verified:
- ✅ All 5 acceptance criteria met (verified by QA report)
- ✅ PR #789 approved by 2 reviewers
- ✅ Tests in src/notifications/transaction-confirmation.spec.ts
- ✅ Documentation updated
- ✅ Security review passed (API authentication, input validation - QA verified)
- ✅ Performance review passed (QA verified)
- ✅ Reliability review passed (QA verified)
- ✅ Maintainability review passed (QA verified)

**QA Reports:**
- QA Report: docs/prd/.../story.311.1.../story.311.1.qa.1.initial-review.md
- Gate File: docs/prd/.../story.311.1.../story.311.1.gate.1.initial-review.yml

**Artifacts Generated:**
- Updated: docs/prd/.../story.311.1.../story.311.1...md
- Created: docs/prd/.../story.311.1.../sprint-review-summary.md
- PR Comment: https://github.com/org/repo/pull/789#comment-xyz
```

### Example 2: Story Has Gaps

**User Request:**

```
Check if task.90.swagger-cli-plugin-enablement is ready for acceptance
```

**Skill Actions:**

1. Read task document from `docs/development/tasks/task.90.../task.90...md`
2. Check for QA reports - none found
3. Verify acceptance criteria - 1 checkbox unchecked ❌
4. Find PR reference - no PR number found ❌
5. Check documentation - not mentioned ❌
6. Run security checklist - input validation missing ❌
7. Run compliance checklist - N/A for this task type ✅
8. Generate gap report and add to task document
9. Do NOT change status (remains `in_progress`)

**Output:**

```
⚠️ Task NOT Ready for Acceptance - Gaps Identified

**Task:** task.90.swagger-cli-plugin-enablement
**Current Status:** in_progress

**Gaps Identified:**

1. Acceptance Criteria:
   - [ ] CLI plugin generates Swagger spec correctly (not yet implemented)

2. Unit Tests & PR:
   - No PR number found in document

3. Documentation:
   - Plugin usage documentation not mentioned

4. Security:
   - Input validation missing for API endpoint parameters

**Next Steps:**
- Complete Swagger spec generation feature
- Create and link PR in task document
- Add plugin usage guide to docs/
- Implement input validation for API parameters

**Estimated Effort:** Medium (3-5 hours)

**Gap report added to:** docs/development/tasks/task.90.../task.90...md
```

### Example 3: Directory Path Provided

**User Request:**

```
Verify DoD for docs/prd/user-experience/notifications/epics/epic.311.financial-services-integration/stories/story.311.2.email-notifications/
```

**Skill Actions:**

1. Use Glob to find `.md` file in directory: `docs/prd/.../story.311.2.email-notifications/*.md`
2. Found: `story.311.2.email-notifications.md`
3. Check for QA reports: `docs/prd/.../story.311.2.email-notifications/*.qa.*.md`
4. Check for gate files: `docs/prd/.../story.311.2.email-notifications/*.gate.*.yml`
5. Proceed with DoD verification workflow (Steps 3-8)...

## Resources

### references/

**`references/definition-of-done-checklist.md`**
Comprehensive DoD checklist with:

- Core acceptance criteria verification patterns
- Story-type-specific security checklists (API, UI, Data, Auth, Infrastructure)
- Compliance checklists (GDPR, PCI-DSS, WCAG, HIPAA, etc.)
- Decision matrix for acceptance
- Gap reporting formats
- Accepted status formats

Load this file to understand detailed verification criteria for each DoD category.

**`references/story-status-schema.md`**
Story/task status schema and frontmatter structure:

- Valid status values and workflow
- Frontmatter structure for stories and tasks
- Required fields for `accepted` status
- Frontmatter update rules
- PR number format patterns

Load this file to understand how to properly update story/task frontmatter.

### assets/

**`assets/sprint-review-summary-template.md`**
Template for generating Sprint Review summary documents. Contains sections for:

- Summary and acceptance criteria met
- Key features implemented
- Technical details and files modified
- Testing & QA information
- Security & compliance verification
- Documentation updates
- Demo notes and impact assessment
- Known limitations and future work

Use this template to generate the Sprint Review summary artifact when marking a story as accepted.

## Notes

- **Always verify ALL DoD criteria** before marking as accepted - no shortcuts
- **Be specific in gap reports** - provide actionable feedback, not generic statements
- **Security and compliance are mandatory** - never skip these reviews
- **Generate artifacts consistently** - use the templates provided
- **Communicate clearly** - users should understand exactly what's missing or what was accepted

# Finalise Story Verification

## Steps (complete ALL before stopping):

1. Read the story file and extract ALL Definition of Done criteria
2. For EACH criterion, search the codebase for evidence (use Grep, Glob, Read)
3. If a search returns empty, try 2 alternative search patterns before marking ⚠️
4. Output a full checklist: ✅ Met | ❌ Not Met | ⚠️ Inconclusive
5. Summarize with a PASS/FAIL verdict and list any blocking items

NEVER end without producing the full checklist output.
