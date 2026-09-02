---
name: finalise
description: Verify story/task completion against comprehensive Definition of Done criteria (acceptance criteria, tests, code reviews, documentation, security review, compliance check), then update status to 'accepted' and generate Sprint Review artifacts, or list gaps if incomplete. Use when finalising stories or tasks for Sprint Review.
---

> **Status lifecycle**: see [`references/document-status-lifecycle.md`](references/document-status-lifecycle.md)

# Finalise Story/Task

## Overview

Mark a story or task as complete by verifying it against a comprehensive Definition of Done (DoD) checklist. This skill automates the verification of acceptance criteria, unit tests, code reviews, documentation updates, security reviews, and compliance checks.

**Parallel DoD Verification Approach:** This skill dispatches four read-only Explore subagents in a single parallel message to perform DoD checks (AC traceability, security, compliance, docs/changelog). Each agent returns a structured YAML result. Main context writes the DoD running summary in **one consolidated pass per section** after aggregation — not per individual check. This gives:

- ~3–4× wall-clock speedup vs serial verification
- ≥80% reduction in DoD-summary file writes (≤6 writes vs ~25 baseline)
- Partial-failure isolation: one failed agent marks that section for manual review; others continue
- Complete audit trail: each section write contains full evidence citations from the agent YAML

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

Follow this systematic workflow to verify and mark a story/task as complete. Steps 3–5 dispatch four parallel Explore subagents; the running summary is written in four consolidated appends after all agents return (Step 3d). Do NOT write incrementally.

### Step 0: Initialize Task List and Create Running Summary File

Before starting any verification, create a task list to track every sub-step to completion, then create the running summary file.

**CRITICAL — Task List Initialization:**

Use `TaskCreate` to register every sub-step you will execute. This prevents skipping steps. Create one task per action item below, then mark each `in_progress` before starting it and `completed` immediately after finishing it.

**Tasks to create at the start (use TaskCreate for each):**

| Task Subject                    | Description                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Read story document             | Locate and parse the story/task markdown file                                                     |
| Review QA reports               | Find and read QA report and gate files in story directory                                         |
| Dispatch parallel DoD checks    | Fan out 4 Explore subagents simultaneously: AC traceability, security, compliance, docs/changelog |
| Aggregate DoD results           | Parse 4 YAML responses; flag agent failures as NEEDS_MANUAL_REVIEW                                |
| Write consolidated DoD sections | One append per section (AC, security, compliance, docs) to running summary                        |
| Make acceptance decision        | Evaluate all checks and decide ACCEPT or GAPS                                                     |
| Update story document           | Add DoD section (accepted or gap report) to story file                                            |
| Update frontmatter              | Change status, updated, completed_date fields (accepted path only)                                |
| Generate Sprint Review summary  | Create sprint-review-summary.md from template (accepted path only)                                |
| Post PR comment                 | Post acceptance or gap comment to GitHub PR                                                       |
| Update running summary          | Finalize story.{epic}.{story}.dod.{num}.{name}.md with outcome                                    |
| Communicate to user             | Output final result block to user                                                                 |

Create all tasks upfront, then work through them in order. Do NOT skip any task.

---

Before starting any verification, also create a co-located running summary file to track results incrementally.

**Actions:**

1. **Determine story/task directory:**
   - Extract directory path from the story/task file path provided
   - Example: `${PRD_ROOT}/.../story.311.1.example-system/`

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

   _DoD results will be appended here in 4 consolidated sections after parallel agent completion._

   ---
   ```

4. **Use Write tool to create the file**

**Example:**

If verifying `${PRD_ROOT}/.../story.311.1.example-system/story.311.1.example-system.md`, create:

`${PRD_ROOT}/.../story.311.1.example-system/story.311.1.dod.1.example-system.md`

### Step 1: Locate and Read the Story/Task Document

Accept the story/task document path in one of these formats:

**Full path to markdown file:**

```
${PRD_ROOT}/ui-domain/module-name/epics/epic.311.example-integration/stories/story.311.1.example-system/story.311.1.example-system.md
```

**Directory path (skill will find the .md file):**

```
${PRD_ROOT}/ui-domain/module-name/epics/epic.311.example-integration/stories/story.311.1.example-system/
```

**Task path examples:**

```
docs/tasks/task.90.swagger-cli-plugin-enablement/task.90.swagger-cli-plugin-enablement.md
docs/tasks/task.90.swagger-cli-plugin-enablement/
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

2. **Ignore prior-run acceptance blocks in the document body — they are history, not evidence.**

   A story/task that was accepted once and later reopened still carries its previous
   `## Definition of Done - PASSED ✅` / `**Status:** ACCEPTED` section verbatim in the body. This
   skill reads those sections, so unless they are explicitly discounted, the previous run's verdict
   is silently re-used as though it were this run's.

   ```bash
   # How many acceptance blocks does the body already contain?
   PRIOR_DOD=$(grep -cE '^## Definition of Done.*(PASSED|✅)' "$DOC_FILE" 2>/dev/null || echo 0)
   ```

   If `PRIOR_DOD` is greater than zero **and** the document's current `status:` is not `accepted`
   (i.e. it was reopened), then:
   - Treat **every** existing DoD/ACCEPTED block as **superseded**. Verify each criterion afresh
     against the code — do not inherit a single ✅ from it.
   - Confirm the block is visibly marked as historical (e.g. retitled `— run N (historical,
superseded)`). If it is not, that is itself a finding: an unmarked stale PASS banner is a trap
     for the next reader and for the next `/finalise` run.
   - Scope this run's verdict to a **new** `dod.{N}` file. Never edit a previous run's DoD summary.

   > Observed live: task.52 was accepted (DoD 7/7), reopened the same day with an eighth criterion,
   > and its run-1 `PASSED ✅ / ACCEPTED` banner was still sitting in the body. Criteria counts differ
   > between runs, so inheriting the old block would have declared 7/7 complete against a bar that
   > now had 8 items — and the eighth was the entire reason for the reopen.

3. **Read and Analyze QA Reports (if found):**
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

4. **Read and Analyze Gate Files (if found):**
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

5. **Use QA Information to Inform DoD Decision:**
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

6. **Document QA Report Findings:**
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

### Steps 3–5: Parallel DoD Checks (4 Explore Subagents)

**Overview**: Dispatch four read-only Explore subagents in a **single parallel message** (4 simultaneous Agent tool calls). Each agent performs one DoD domain check and returns a structured YAML result. Main context writes the DoD running summary in **one consolidated append per section** after aggregation.

**QA report integration**: If QA reports were found in Step 2, include their findings as supplementary context when building the prompts below (paste relevant QA YAML sections). The subagents use QA findings to inform citations.

---

#### Step 3a: Prepare Shared Context

Collect these values before dispatching:

```bash
# PR number
PR_NUMBER=$(grep '^pr_number:' {story-file} | awk '{print $2}' | grep -oE '[0-9]+' | head -1)
[ -z "$PR_NUMBER" ] && PR_NUMBER=$(grep -oE 'PR #([0-9]+)|pull/([0-9]+)' {story-file} | grep -oE '[0-9]+' | head -1)

# Story type
STORY_TYPE=$(grep '^type:' {story-file} | awk '{print $2}' | tr -d '"')
[ -z "$STORY_TYPE" ] && STORY_TYPE="task"

# Git diff for AC agent (best-effort — empty diff is handled gracefully by the agent)
DIFF_FILE=".claude/state/pr-diff-$(date +%s).diff"
[ -n "$PR_NUMBER" ] && gh pr diff "$PR_NUMBER" > "$DIFF_FILE" 2>/dev/null \
  || git diff HEAD~1 HEAD > "$DIFF_FILE" 2>/dev/null || touch "$DIFF_FILE"
```

#### Step 3b: Dispatch 4 Explore Subagents in Parallel

**CRITICAL**: Send all 4 Agent tool calls in a **single message**. Do not send them sequentially.

Read each prompt file to get the template, substitute the placeholder values, then dispatch:

| Agent                | Prompt file                                    | Key substitutions                                            |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| 1. AC traceability   | `references/finalise-dod-ac-prompt.md`         | `<STORY_FILE>`, `<PR_NUMBER>`, `<STORY_TYPE>`, `<DIFF_FILE>` |
| 2. Security review   | `references/finalise-dod-security-prompt.md`   | `<STORY_FILE>`, `<STORY_TYPE>`                               |
| 3. Compliance review | `references/finalise-dod-compliance-prompt.md` | `<STORY_FILE>`                                               |
| 4. Docs & changelog  | `references/finalise-dod-docs-prompt.md`       | `<STORY_FILE>`, `<PR_NUMBER>`, `<STORY_TYPE>`                |

Each agent returns YAML. Capture: `AC_RESULT`, `SECURITY_RESULT`, `COMPLIANCE_RESULT`, `DOCS_RESULT`.

> **`SECURITY_RESULT` carries a `boundary:` flag and, when it is true, `probes_executed:` and `probes[]`.**
> `boundary: true` means the security agent's Step 1b identified a **boundary deliverable** — a predicate,
> validator, classifier or allow/deny-list — and it then generated candidate inputs, **executed** them
> against the shipped code, and reported only those that reproduced. `boundary: false` means the rule did
> not fire, which is the common and expected case.
>
> **Read `probes` together with `probes_executed`, never alone.** No reproduced probe with a high
> `probes_executed` is the *good* outcome — the boundary was probed and held. No reproduced probe with
> `probes_executed: 0` **or absent** is a **finding**, not a pass: the agent emits a `probe mode
> executed no candidates` FAIL in `checks`, rendered like any other failed check. Branching on list
> emptiness alone would report the best outcome and the worst one identically.
>
> **Three absences are three different things, and none of them is `false`.** A missing `boundary`
> means the agent did not answer the question — render it as unverified, never as "not a boundary". A
> missing `probes_executed` under `boundary: true` counts as zero, because a count that was never
> reported is not evidence that work happened. And the held-case branch keys on *no probe having
> reproduced*, not on the list being empty — an entry carrying `reproduced: false` must not be able to
> suppress the verdict line by making the list non-empty. See `references/finalise-dod-security-prompt.md`.

#### Step 3c: Aggregate Results

After all 4 agents complete, parse each YAML result. Handle agent failures:

- **Agent returns valid YAML**: extract `overall` field → `AC_OVERALL`, `SEC_OVERALL`, `COMP_OVERALL`, `DOCS_OVERALL`
- **Agent errors or returns unparseable output**: set that section's overall to `NEEDS_MANUAL_REVIEW`; mark section for manual verification in the DoD running summary; continue with remaining sections

**Never abort due to a single agent failure.** One failed section = manual review for that section only.

#### Step 3d: Write Consolidated DoD Running Summary Sections

Append sections to the running summary file. **One append per section** — not per individual check. Use the Edit tool four times (one per section).

**Append 1 — AC & PR section** (from `AC_RESULT`):

```markdown
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** {AC_OVERALL — ✅ PASS | ❌ FAIL | ⚠️ PARTIAL | 🔍 NEEDS_MANUAL_REVIEW}
**PR Status:** {ac_result.pr_status} (PR #{PR_NUMBER})
**PR Review Decision:** {ac_result.pr_review_decision}

### Acceptance Criteria

{for each ac in ac_result.acs:}

#### {ac.ac_id}: {ac.description}

**Status:** {✅ PASS | ❌ FAIL}

- Code evidence: `{ac.code_citation or "not found — FAIL"}`
- Test evidence: `{ac.test_citation or "not found — FAIL"}`
  {ac.note ? "- Note: " + ac.note : ""}
  {endfor}

### Documentation

{for each item in ac_result.docs:}

- **{item.item}**: {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}{item.citation ? " — `" + item.citation + "`" : ""}{item.note ? " — " + item.note : ""}
  {endfor}

**Agent summary:** {ac_result.summary}

---
```

**Append 2 — Security section** (from `SECURITY_RESULT`):

```markdown
## Step 3: Security Review

**Story Type:** {security_result.story_type}
**Overall Security Status:** {SEC_OVERALL — ✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE | 🔍 NEEDS_MANUAL_REVIEW}

{for each check in security_result.checks:}

### {check.check}

**Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}
{check.citation ? "- Evidence: `" + check.citation + "`" : "- No citation found"}
{check.note ? "- Note: " + check.note : ""}
{endfor}

### General Security

{for each check in security_result.general:}

- **{check.check}**: {✅ PASS | ❌ FAIL}{check.citation ? " — `" + check.citation + "`" : ""}{check.note ? " — " + check.note : ""}
  {endfor}

### Probe Results

{if security_result.boundary is absent or not a boolean:}
⚠️ **The security agent reported no boundary decision.** This is not the same as "not a boundary" —
the question was not answered, so probe mode is **unverified**. Treat it as a finding and re-run the
agent; do not read it as a skip.
{else if security_result.boundary == false:}
_Probe mode did not fire — the deliverable is not a boundary._
{else:}
**Candidates executed:** {security_result.probes_executed, or "not reported" if absent} — **reproduced:** {count of security_result.probes where reproduced == true}

{if any probe in security_result.probes has reproduced == true:}
{for each probe in security_result.probes where probe.reproduced:}
- `{probe.input}` — expected **{probe.expected}**, got **{probe.actual}**
{endfor}
{endif}

{if security_result.probes_executed is absent or == 0:}
❌ **Probe mode executed no candidates.** A boundary was identified but nothing was run — this is a
finding, not a pass. See the `probe mode executed no candidates` check above. An **absent**
`probes_executed` counts as zero here: a count that was never reported is not evidence that work
happened.
{else if no probe in security_result.probes has reproduced == true:}
✅ **The boundary held** — every candidate returned its expected verdict.
{endif}
{endif}

<!--
  The ✅/❌ pair is an if/else-if, so at most one verdict line is ever emitted. Written as two
  independent `{if}` blocks, the state `probes_executed: 0` with nothing reproduced rendered BOTH
  "executed no candidates" and "the boundary held" — asserting that every candidate passed when none
  had run.

  The findings list is separate and unconditional, so it renders whenever anything reproduced. That
  means the ❌ callout can legitimately sit ABOVE a findings list, in the contradictory-input case
  where an agent reports reproduced probes and a zero count; the callout is the warning about the
  count, not a claim that the list is empty. The ✅ line, by contrast, is suppressed whenever
  anything reproduced — it can only appear when the count is non-zero and nothing was found.
-->

**Agent summary:** {security_result.summary}

---
```

**Append 3 — Compliance section** (from `COMPLIANCE_RESULT`):

```markdown
## Step 4: Compliance Review

**Overall Compliance Status:** {COMP_OVERALL — ✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE | 🔍 NEEDS_MANUAL_REVIEW}
**Applicable areas:** {list areas where value is true from compliance_result.applicable_areas, or "None — NOT_APPLICABLE"}

{for each check in compliance_result.checks:}

### {check.area}: {check.check}

**Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}
{check.citation ? "- Evidence: `" + check.citation + "`" : "- No citation found"}
{check.note ? "- Note: " + check.note : ""}
{endfor}

**Agent summary:** {compliance_result.summary}

---
```

**Append 4 — Docs section** (from `DOCS_RESULT`):

```markdown
## Step 4b: Docs & Changelog

**Overall Docs Status:** {DOCS_OVERALL — ✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE | 🔍 NEEDS_MANUAL_REVIEW}

{for each item in docs_result.checks:}

### {item.item}

**Status:** {✅ PASS | ❌ FAIL | ⚠️ NOT_APPLICABLE}
{item.citation ? "- Evidence: `" + item.citation + "`" : "- No citation found"}
{item.note ? "- Note: " + item.note : ""}
{endfor}

**Agent summary:** {docs_result.summary}

---
```

#### Step 3e: Clean Up and Proceed

```bash
rm -f "$DIFF_FILE"
```

After all 4 appends are complete, proceed directly to Step 6 (Make Acceptance Decision). The decision logic uses `AC_OVERALL`, `SEC_OVERALL`, `COMP_OVERALL`, and `DOCS_OVERALL`.

**Idempotent re-run**: If the running summary already contains any of the `## Step 2:`, `## Step 3:`, `## Step 4:`, or `## Step 4b:` section headers (from a previous run), **skip** the corresponding append and reuse the existing content. This prevents duplicate sections on re-run.

### Step 6: Make Acceptance Decision

Use the **Decision Matrix** from `references/definition-of-done-checklist.md` to determine if the story/task should be marked as "Accepted" or remain "In Progress".

**Decision Logic:**

| All Acceptance Criteria Met? | Tests & PR Approved? | Docs Updated? | Security Passed? | Compliance Passed? | QA Gate Status? | **Decision**                                                                                                                                  |
| ---------------------------- | -------------------- | ------------- | ---------------- | ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ✅ Yes           | ✅ Yes             | ✅ PASS or N/A  | **ACCEPTED** ✅ — _only if `CI_ROLLUP` is `SUCCESS`; see "CI status is a DoD gate" below_                                                     |
| -                            | -                    | -             | -                | -                  | -               | **IN PROGRESS** if `CI_ROLLUP` is `FAILURE` or `PENDING` (resolve `CANCELLED`/`NONE` by re-sampling first — they are undecided, not verdicts) |
| ❌ No                        | -                    | -             | -                | -                  | -               | **IN PROGRESS** (list gaps)                                                                                                                   |
| ✅ Yes                       | ❌ No                | -             | -                | -                  | -               | **IN PROGRESS** (list gaps)                                                                                                                   |
| ✅ Yes                       | ✅ Yes               | ❌ No         | -                | -                  | -               | **IN PROGRESS** (list gaps)                                                                                                                   |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ❌ No            | -                  | -               | **IN PROGRESS** (list gaps)                                                                                                                   |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ✅ Yes           | ❌ No              | -               | **IN PROGRESS** (list gaps)                                                                                                                   |
| ✅ Yes                       | ✅ Yes               | ✅ Yes        | ✅ Yes           | ✅ Yes             | ❌ FAIL         | **IN PROGRESS** (QA gate failed)                                                                                                              |

**QA Gate Integration:**

- **If QA gate status is PASS**: Proceed with acceptance if all other criteria are met
- **If QA gate status is FAIL**: Do NOT accept the story, even if manual checks pass. Review `top_issues[]` and `recommendations.immediate[]` for blocking issues.
- **If QA gate status is CONCERNS**: Use judgment - review concerns and determine if they are blocking or can be addressed post-acceptance
- **If QA gate status is WAIVED**: Check that waiver is properly documented and justified, then proceed based on other criteria
- **If no QA gate exists**: Rely solely on DoD verification from Steps 3–5 parallel checks
- **If any section has `NEEDS_MANUAL_REVIEW`**: Do NOT accept — treat as a gap and list it in the blocking issues

**Mapping parallel check results to the decision matrix:**

| Decision matrix column       | Source variable                                     |
| ---------------------------- | --------------------------------------------------- |
| All Acceptance Criteria Met? | `AC_OVERALL` (PASS/PARTIAL/FAIL)                    |
| Tests & PR Approved?         | `ac_result.pr_review_decision` (APPROVED)           |
| **CI green?**                | **`CI_ROLLUP` (see below) — a hard blocker**        |
| Docs Updated?                | `DOCS_OVERALL` (PASS/NOT_APPLICABLE counts as pass) |
| Security Passed?             | `SEC_OVERALL` (PASS/NOT_APPLICABLE counts as pass)  |
| Compliance Passed?           | `COMP_OVERALL` (PASS/NOT_APPLICABLE counts as pass) |

### CI status is a DoD gate — check it, do not assume it

**A PR being _approved_ is not the same as a PR being _green_.** Review approval is a human
judgement about the diff; the check rollup is a machine result about the code. This skill used to
read the first and never the second, which meant it could — and did — mark work `accepted` while its
CI was still running, on a job that then failed. Acceptance had to be withdrawn by hand afterwards.

Read the rollup before deciding:

**Branch on the platform first.** `$PLATFORM`/`$VCS` is already resolved by
`references/resolve-platform.sh`. The rollup query below is **GitHub-only** — `gh pr view` against a
Bitbucket remote fails, which resolves to `UNKNOWN`, which this gate treats as `PENDING`. Read
literally on a Bitbucket repo that means **`/finalise` can never accept anything**, which is not the
intent: the gate exists to stop a _pending_ build being rounded up to green, not to make acceptance
unreachable on half the platforms this skill supports. Use the Bitbucket branch below instead.

#### GitHub (`PLATFORM=github`)

```bash
# Prefer the rollup (covers checks AND commit statuses); fall back to `gh pr checks`.
#
# The rollup mixes two node types with DIFFERENT field sets, and normalising them is
# the whole difficulty:
#   • CheckRun (GitHub Actions job) — `.status` (QUEUED|IN_PROGRESS|COMPLETED) + `.conclusion`
#   • StatusContext (commit status)  — `.state` only, no `.status`/`.conclusion`
#
# DO NOT write `.conclusion // .state`. While a CheckRun is running GitHub returns
# `conclusion: ""` — an EMPTY STRING, not null — and jq's `//` only falls through on
# `null`/`false`. So `""` is taken as a real value, matches none of the PENDING tokens,
# and drops to `else "SUCCESS"`: a still-running job is reported as green. That is the
# exact bug this block previously had, verified live against a queued `portal-e2e`.
#
# The reliable discriminator is `.status`: a CheckRun is only decided at COMPLETED.
#
# CANCELLED is deliberately NOT bucketed with FAILURE. On a repo whose workflow sets
# `concurrency: cancel-in-progress: true`, every push cancels the previous run, so a
# rollup sampled in that window legitimately contains CANCELLED entries that say nothing
# about the code. Treating them as FAILURE blocks acceptance on healthy work — the mirror
# of the bug this gate exists to prevent, and just as wrong. CANCELLED means UNDECIDED:
# resample.
CI_ROLLUP=$(gh pr view "$PR_NUMBER" --json statusCheckRollup \
  -q '[ .statusCheckRollup[]
        | (.status // "") as $st
        | (if   $st == ""          then (.state // "")        # StatusContext
           elif $st == "COMPLETED" then (.conclusion // "")   # finished CheckRun
           else "PENDING" end)                                 # QUEUED/IN_PROGRESS/WAITING
        | if . == "" then "PENDING" else . end ]               # empty ⇒ undecided, never green
      | if length == 0 then "NONE"
        elif any(. == "FAILURE" or . == "TIMED_OUT" or . == "ERROR"
                 or . == "STARTUP_FAILURE" or . == "ACTION_REQUIRED") then "FAILURE"
        elif any(. == "PENDING" or . == "EXPECTED" or . == "QUEUED"
                 or . == "IN_PROGRESS" or . == "WAITING") then "PENDING"
        elif any(. == "CANCELLED") then "CANCELLED"
        else "SUCCESS" end' 2>/dev/null || echo "UNKNOWN")
```

#### Bitbucket (`PLATFORM=bitbucket`)

Bitbucket has no rollup. Read the pipeline for the PR's head commit, and **check the HTTP status
before reading the body** — that is the whole difficulty here, for the reason below.

```bash
BB_API="https://api.bitbucket.org/2.0"
HEAD_SHA=$(git rev-parse HEAD)
# Capture body AND status separately. `curl -s` alone cannot tell 403 from 200-with-no-results.
#
# bitbucket-auth.sh picks Bearer or Basic by variable name and fails non-zero
# when neither is set. Skip the call entirely in that case: an unauthenticated
# request would come back 404 and read as "no pipelines" — the same trap the
# 403 branch below exists for.
if source references/bitbucket-auth.sh; then
  BB_CODE=$(curl -s -o /tmp/bb-pipelines.json -w '%{http_code}' "${BB_CURL_AUTH[@]}" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pipelines/?sort=-created_on&pagelen=20")
else
  BB_CODE="000"   # no credential — falls into the UNKNOWN branch below, never "NONE"
fi

if [ "$BB_CODE" = "403" ]; then
  # NOT "no CI". The token lacks read:pipeline:bitbucket. Every other call can
  # succeed on the same credential, so nothing else looks wrong.
  CI_ROLLUP="UNKNOWN"
elif [ "$BB_CODE" != "200" ]; then
  CI_ROLLUP="UNKNOWN"
else
  CI_ROLLUP=$(python3 -c '
import json,sys
sha=sys.argv[1]
runs=[p for p in json.load(open("/tmp/bb-pipelines.json")).get("values",[])
      if (p.get("target") or {}).get("commit",{}).get("hash","").startswith(sha[:12])]
if not runs: print("NONE"); raise SystemExit
st=[(r.get("state") or {}) for r in runs]
names={s.get("name") for s in st}
res={((s.get("result") or {}).get("name") or "") for s in st}
if "IN_PROGRESS" in names or "PENDING" in names: print("PENDING")
elif "FAILED" in res or "ERROR" in res:          print("FAILURE")
elif "STOPPED" in res:                            print("CANCELLED")
elif "SUCCESSFUL" in res:                         print("SUCCESS")
else:                                             print("PENDING")
' "$HEAD_SHA")
fi
```

The same `NONE`/`CANCELLED`/`UNKNOWN` re-sampling loop below applies unchanged.

> **A 403 here is the trap, and it has caught two stories.** Bitbucket answers `403` on
> `/pipelines/` when the token lacks `read:pipeline:bitbucket`, and the commit-status endpoint
> returns an **empty list** rather than an error. Meanwhile the repository root and the
> pull-request endpoints keep answering `200` on the same credential, so the token looks entirely
> healthy. The result is indistinguishable from a repository that simply has no CI configured.
>
> Observed live (rebirth-wallet, stories 3.2 and 3.3, 2026-08-05 and 2026-08-08) — diagnosed
> independently both times, because nothing in the output says "scope". **Never infer CI presence
> from an empty list; infer it from the status code.** On `UNKNOWN`, record the reason in the DoD
> summary — "unverified: token lacks `read:pipeline:bitbucket`" is actionable, "no CI found" sends
> the next reader hunting for a missing pipeline that exists.
>
> Where CI runs a command that can also be run locally, a maintainer may accept on that evidence —
> but it must be recorded as **unverified**, never rounded up to `SUCCESS`, and the residual gap
> named. That judgement belongs to a human, not to this gate.

`SKIPPED` and `NEUTRAL` conclusions intentionally fall into the `SUCCESS` bucket — a skipped job
(e.g. a `paths:`-filtered `smoke`) is not a failure and never becomes one.

**Resolve undecided states before deciding — do not conclude from a single sample.** `NONE` and
`CANCELLED` are both transient on an active PR: a push that supersedes a run leaves the rollup
momentarily empty, then briefly cancelled, before the replacement run registers. Re-sample:

```bash
# Re-sample undecided states rather than concluding from one reading.
for attempt in 1 2 3 4 5; do
  case "$CI_ROLLUP" in
    NONE|CANCELLED|UNKNOWN) sleep 20; CI_ROLLUP=$( ...rerun the query above... ) ;;
    *) break ;;
  esac
done
```

| `CI_ROLLUP` | Decision                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUCCESS`   | Proceed — CI column passes                                                                                                                                                                                                                                                                              |
| `FAILURE`   | **Do NOT accept.** Gap: "CI is red on {failing job(s)} — acceptance requires a green run on a commit containing the final code."                                                                                                                                                                        |
| `PENDING`   | **Do NOT accept.** Gap: "CI has not finished. Re-run `/finalise` once it completes." **Waiting is the correct action; assuming is not.**                                                                                                                                                                |
| `CANCELLED` | **Undecided, not failed.** Almost always `cancel-in-progress` superseding a run. Re-sample; if it persists after the retries, check whether a newer commit has its own run and resolve against **that** head. Never record it as a red verdict.                                                         |
| `NONE`      | **Undecided.** Re-sample first — an empty rollup is the normal state for the seconds between a push and its run registering. Only if it persists does it mean no checks are configured, and then record it explicitly in the DoD summary as _unverified by CI_ rather than treating absence as success. |
| `UNKNOWN`   | Query failed. Treat as `PENDING` — never as success.                                                                                                                                                                                                                                                    |

> **Observed live (tinker-city PR #539).** `/finalise` sampled the rollup once, read `NONE` on a
> head whose run was mid-cancellation, and recorded "final head unverified by CI" in the DoD
> summary. The head was in fact fully green minutes later. The note had to be corrected by hand.
> A single sample of an actively-moving PR is a snapshot of a race, not a verdict.

> **The failure mode this exists to stop** is a _pending_ rollup being read as "nothing wrong yet"
> and rounded up to acceptance. `PENDING` and `FAILURE` are both non-acceptance; only `SUCCESS`
> passes. If the rollup is green but the newest commit is docs-only on top of untested code, say so
> in the DoD summary — a green on an ancestor commit is evidence about that commit, not this one.

> **Verify the query, not just the table.** The first version of this gate had the table above
> exactly right and still accepted on pending CI, because the _query_ silently never produced
> `PENDING` (see the empty-string note above). If you change this jq, test it against a rollup with
> a running check — `{"status":"IN_PROGRESS","conclusion":""}` must yield `PENDING`. A gate whose
> logic is correct but whose input is mis-parsed is worse than no gate, because it reports success.
>
> Do not substitute `gh pr checks` output parsing for this: it prints `pending` for a job that is
> merely _queued behind another job on a serial runner_, which is indistinguishable in its output
> from one that is running. The rollup's `.status` is the field that actually distinguishes states.

**Actions:**

1. **Use the aggregated results** from Step 3c (`AC_OVERALL`, `SEC_OVERALL`, `COMP_OVERALL`, `DOCS_OVERALL`) — do not re-read the running summary file for this step
2. **Resolve `CI_ROLLUP`** using the command above, and record the raw per-job conclusions in the DoD running summary so the decision is auditable
3. **Determine pass/fail** for each decision matrix column using the mapping above
4. **Write the acceptance decision to the running summary:**

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

5. **Proceed based on decision:**
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
   - ✅ Tracker issue closed/transitioned (GitHub: issue #{github_issue} closed | Jira: transitioned to Done) (or ⚠️ failed — manual action required)
   - ✅ GitHub project board moved to Done (GitHub only — or ⚠️ not found / mutation failed — see PR comment)

   **Next Steps:**

   - Story is ready for Sprint Review
   - No further action required
   ```

> **Note:** When generating the actual DoD summary file, substitute `#{github_issue}` with the real issue number and replace each `✅`/`⚠️` with the actual outcome — do not hardcode `✅`.

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

3. **Append the acceptance row to `## Change Log`** — in the **same edit** as the frontmatter
   change above. Acceptance is the single most important event in a document's life; splitting the
   status write from the log write is how one lands without the other.

   ```markdown
   | 2026-05-15 | 1.2 | DoD passed — accepted (PR #204) | finalise |
   ```

   **`/finalise` is the only pipeline writer that bumps `Version`** — bump the **minor**. Every
   other pipeline row (`develop`, `qa-story`/`qa-task`, `qa-fix`, the tracker syncs) leaves the
   cell blank, so `Version` tracks document revisions rather than counting pipeline steps.
   Canonical format: [document-change-log.md](references/document-change-log.md).

   Two constraints on the Description:

   - **Keep the literal `Definition of Done ... PASSED` out of it.** The prior-run idempotence
     guard greps `^## Definition of Done.*(PASSED|✅)`; a row echoing that phrasing at line start
     would be miscounted as a completed run.
   - **Expect a second row from the sync, and do not treat it as a duplicate.** Step 7 re-runs
     `sync-jira-{story,task}`, which under the narrowed rules writes a row only when it transitions
     the status — which at acceptance it does. The accepted document ends with
     `DoD passed — accepted (PR #204)` from `finalise` and `Status → done` from the sync: the local
     acceptance decision, and the tracker reaching its terminal column.

   If the document predates the Change Log template and has no such section, create it — for a
   task, after `## 11. Rollback Plan`.

4. **Add DoD Verification Section to Document Body:**
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
   ```

5. **Reference Running Summary in DoD Section:**
   - Add a reference to the detailed running summary file
   - Example: "**Detailed Verification Log:** See `story.311.1.dod.1.example-system.md` for complete verification evidence and timestamps."

6. **Generate Sprint Review Summary:**
   - Use the template from `assets/sprint-review-summary-template.md`
   - Fill in all sections with information from the story/task document and PR
   - Save summary as: `{story-directory}/sprint-review-summary.md`

7. **Add Canonical PR Comment (idempotent via marker):**

   **PR-comment authorship contract**:

   | Skill      | Owns                                                                                                      |
   | ---------- | --------------------------------------------------------------------------------------------------------- |
   | `qa-task`  | Per-cycle gate decision (best-effort, non-blocking)                                                       |
   | `qa-fix`   | Per-cycle fix summary (best-effort, non-blocking)                                                         |
   | `finalise` | Canonical summary — PR + final gate + QA cycle count + DoD path + accepted status (idempotent via marker) |

   `finalise` is the designated author of the canonical PR summary. It edits in place on re-run.

   **Step 6a — Resolve QA cycle count:**

   ```bash
   # Locate the implementation report (passed by develop-task/develop-story as IMPLEMENTATION_REPORT env var,
   # or search the document directory for task.{id}.implementation.*.md / story.{epic}.{story}.implementation.*.md)
   if [ -n "$IMPLEMENTATION_REPORT" ] && [ -f "$IMPLEMENTATION_REPORT" ]; then
     CYCLES=$(grep -c '^### QA Cycle' "$IMPLEMENTATION_REPORT" 2>/dev/null || echo 0)
   else
     CYCLES=0
   fi
   # If grep returns 0 (no headings found), CYCLES=0 → omit the cycle-count line from the body
   ```

   **Step 6b — Build comment body:**

   ```bash
   MARKER="<!-- finalise-canonical-summary -->"
   DOD_PATH=$(ls {document-directory}/*.dod.*.md 2>/dev/null | sort | tail -1)
   FINAL_GATE=$(ls {document-directory}/*.gate.*.yml 2>/dev/null | sort | tail -1 \
     | xargs -I{} grep '^gate:' {} 2>/dev/null | awk '{print $2}' || echo "N/A")

   BODY="$MARKER
   ## ✅ Accepted — Canonical Pipeline Summary

   **PR**: ${PR_URL}
   **Final Gate**: ${FINAL_GATE}
   **Accepted**: $(date +%Y-%m-%d)
   **DoD Summary**: \`${DOD_PATH}\`
   $([ "$CYCLES" -gt 0 ] && echo "**QA Cycles**: ${CYCLES}" || true)

   All Definition of Done criteria verified. Story/task accepted."
   ```

   **Step 6c — Idempotent post (search-then-edit):**

   _GitHub:_

   ```bash
   # Search for existing canonical comment by marker; extract numeric ID from URL
   # (.databaseId is not available — gh pr view returns .url like ...#issuecomment-12345)
   EXISTING_COMMENT_ID=$(gh pr view "$PR_URL" --json comments \
     -q '.comments[] | select(.body | startswith("<!-- finalise-canonical-summary -->")) | .url' \
     2>/dev/null | head -1 | grep -oE '[0-9]+$')

   if [ -n "$EXISTING_COMMENT_ID" ]; then
     # Edit existing comment by ID — do NOT use --edit-last (ordering unreliable)
     OWNER=$(gh repo view --json owner -q '.owner.login')
     REPO_NAME=$(gh repo view --json name -q '.name')
     gh api -X PATCH "/repos/${OWNER}/${REPO_NAME}/issues/comments/${EXISTING_COMMENT_ID}" \
       -f body="$BODY" >/dev/null \
       && echo "✅ Canonical summary comment updated (ID: $EXISTING_COMMENT_ID)" \
       || echo "⚠️ PR comment edit failed — attempting new comment"
   else
     gh pr comment "$PR_URL" --body "$BODY" \
       && echo "✅ Canonical summary comment posted" \
       || echo "⚠️ PR comment failed — non-blocking"
   fi
   ```

   _Bitbucket:_

   ```bash
   # Bearer or Basic, chosen by variable name. Non-blocking like the rest of
   # this step: without a credential the comment cannot be posted, and a 404
   # from an unauthenticated call would otherwise look like a missing PR.
   source references/bitbucket-auth.sh || echo "⚠️ No Bitbucket credential — PR comment skipped"

   # Search for existing canonical comment by marker
   EXISTING_COMMENT_ID=$(curl -sf \
     "${BB_CURL_AUTH[@]}" \
     "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
     | jq -r '.values[] | select(.content.raw | startswith("<!-- finalise-canonical-summary -->")) | .id' \
     | head -1)

   BB_COMMENT_PAYLOAD=$(jq -n --arg raw "$BODY" '{content: {raw: $raw}}')
   if [ -n "$EXISTING_COMMENT_ID" ]; then
     curl -sf -X PUT \
       "${BB_CURL_AUTH[@]}" \
       -H "Content-Type: application/json" \
       "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments/${EXISTING_COMMENT_ID}" \
       -d "$BB_COMMENT_PAYLOAD" >/dev/null \
       && echo "✅ Canonical summary comment updated" \
       || echo "⚠️ PR comment edit failed — attempting new comment"
   else
     curl -sf -X POST \
       "${BB_CURL_AUTH[@]}" \
       -H "Content-Type: application/json" \
       "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
       -d "$BB_COMMENT_PAYLOAD" >/dev/null \
       && echo "✅ Canonical summary comment posted" \
       || echo "⚠️ PR comment failed — non-blocking"
   fi
   ```

   **Failure handling**: All `⚠️` paths are non-blocking. The implementation report in git is the durable audit trail.

8. **Move Tracker Issue to Done:**

   **Detect tracker platform** — resolver already sourced above (`TRACKER` is set):
   - When `TRACKER=jira` → **Jira path**
   - When `TRACKER=github` → **GitHub path**

   **Re-point the Document link to a durable branch (do this first, before closing/transitioning):**

   The tracker issue embeds a link to the source document on a git branch. During development that link points at the **feature branch**, which is **deleted after merge** — so a closed issue would link to a dead branch. At acceptance the work is about to merge into the long-lived integration branch, so re-point the link there now. (The doc lands on that branch only when the PR merges; if the PR is abandoned, re-sync later.)

   Resolve the durable branch once (git-only, works for both platforms) — prefer `develop` when it exists on the remote, else the repo's default branch:

   ```bash
   DOC_PATH="{path to the story/task document being finalised}"
   if git ls-remote --exit-code --heads origin develop >/dev/null 2>&1; then
     DURABLE_BRANCH=develop
   else
     DURABLE_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
     DURABLE_BRANCH="${DURABLE_BRANCH:-main}"
   fi
   # Repo-relative path of the document (robust whether DOC_PATH is absolute or relative):
   DOC_REL=$(git ls-files --full-name -- "$DOC_PATH")
   ```

   **Jira path** (when `TRACKER=jira`):

   Extract `jira_key` from story/task frontmatter. If absent or null, skip this step silently.

   Use the Atlassian MCP tools. Derive `cloudId` from `JIRA_URL` by extracting the hostname (e.g. `yourorg.atlassian.net`). If a tool call fails with a cloud resolution error, call `getAccessibleAtlassianResources` and use the `id` from the matching entry.

   > **Order matters — the transition runs first, the re-link second.** Both `jira-stage.js` (via the
   > transition protocol) and the `sync-jira-*` re-link below can drive the status to Done, but they
   > resolve it from **different config sources**: the transition uses the `tracker-workflow.yaml`
   > ladder, the sync uses its own `loadStatusMap`. Running the ladder first makes it the single
   > resolver — the sync's own transition then finds the issue already in Done and no-ops, while its
   > real job (re-pointing the Document link at the durable branch) still happens. Do not reverse
   > these two blocks.

   1. **Transition to Done** — follow `references/jira-transition-protocol.md` exactly, with
      `candidates = ["Done", "Closed", "Resolved", "Complete", "Completed"]` and `terminal = true`.
      That protocol owns the matching order, the required-field handling (a workflow whose Done
      transition requires a `resolution` is common — it must be sent in the same call), and the
      MUST-NOT clauses against guessing a fallback transition. Do not re-implement it here.
      - **Retry once** if the transition call fails with a transport-level error.
      - If it still fails: post a PR comment (Bitbucket REST API) warning that the Jira issue was
        not moved to Done, and log in running summary.
      - If the protocol reports a skip (no matching transition, or a required field it cannot
        fill): log that reason in the running summary (non-blocking).

   2. **Post completion comment** — build the body from the variables already computed for the PR comment (`FINAL_GATE`, `DOD_PATH`, `CYCLES`) and the per-category `overall_status` values from each DoD agent YAML result, then post it through the CLI. Format:

        ```
        ## ✅ Story/Task Accepted — Definition of Done Verified

        **PR**: {PR_URL}
        **QA Gate**: {FINAL_GATE}
        **Accepted**: {YYYY-MM-DD}
        **DoD Summary**: `{DOD_PATH}`
        **QA Cycles**: {CYCLES}    ← omit this line entirely if CYCLES=0

        ### DoD Results
        | Category | Result |
        |---|---|
        | Acceptance Criteria | {ac_overall_status} |
        | PR Review | {pr_status} |
        | Security | {security_overall_status} |
        | Compliance | {compliance_overall_status} |
        | Documentation | {docs_overall_status} |

        All Definition of Done criteria verified. Story/task accepted and transitioning to Done.
        ```

        Use ✅ PASS, ❌ FAIL, ⚠️ CONCERNS, or — N/A for each status cell. `{pr_status}` is APPROVED or NOT_APPROVED from the AC agent result.

        ```bash
        mkdir -p .claude/state
        # Terminator at COLUMN 0 — an indented terminator does not close an
        # unquoted heredoc; bash swallows everything after it into the body,
        # so the call below would never run. Body lines are unindented for
        # the same reason: leading spaces are written verbatim.
        cat > .claude/state/comment-body.md <<EOF
{the body rendered above}
EOF

        node .agents/skills/finalise/references/tracker-comment.js \
          --issue {jira_key} --body-file .claude/state/comment-body.md \
          --stage done --json
        ```

> Engine source: `references/tracker-comment.js` (bundled into each skill as `references/tracker-comment.js`). Contract: `references/tracker-comment-contract.md`.


        Read `reason` and act per [`references/tracker-comment-contract.md`](references/tracker-comment-contract.md) — only `no-credentials` may fall back to the Atlassian MCP tool. On failure: log warning and continue (non-blocking).

   Log outcome in running summary: "Jira issue {jira_key} transitioned to Done ✅" or the warning detail.

   3. **Re-point the Jira Document link** — the description is ADF (can't be patched in place), so re-run the sync with the durable branch pinned. This is best-effort and additive. It also drives the status transition from frontmatter (`accepted` → Done), but because step 1 has already run, that transition resolves to a no-op and the ladder remains the single resolver:

   ```bash
   WORKITEM=story   # set to "task" when finalising a task
   if [ -n "$JIRA_URL" ] && [ -n "$JIRA_API_TOKEN" ]; then
     # sync-jira-{story|task} (same script the create/sync flow uses)
     node .agents/skills/sync-jira-${WORKITEM}/scripts/sync-jira-${WORKITEM}.js \
       -f "$DOC_PATH" --doc-branch "$DURABLE_BRANCH" --quiet \
       && echo "✅ Jira Document link re-pointed to ${DURABLE_BRANCH}" \
       || echo "⚠️ sync-jira re-link failed — the transition in step 1 already ran; re-sync from develop after merge"
   else
     echo "ℹ️ JIRA_* env not set — skipping Document-link refresh; re-sync from develop after merge to pin a durable link"
   fi
   ```

   `${WORKITEM}` is `story` or `task` depending on the document being finalised.

   **GitHub path** (when `TRACKER=github`):

   - Extract `github_issue` number from story/task frontmatter
   - Get the repository owner (org) via: `gh repo view --json owner --jq '.owner.login'`
   - Get the repository name via: `gh repo view --json name --jq '.name'`
   - **Re-point the `## Document` link to `$DURABLE_BRANCH`** — surgically swap just the branch segment of the link (anchored on the doc's repo-relative path, so nothing else in the body changes):

   ```bash
   CUR_BODY=$(gh issue view {github_issue} --json body -q '.body')
   # Escape regex metacharacters in the path, then rewrite blob/<any-branch>/<path> → blob/$DURABLE_BRANCH/<path>.
   # The branch segment uses [^) ]+ (not [^/]+) so multi-segment branch names like feature/story.5.1.foo match.
   DOC_REL_RE=$(printf '%s' "$DOC_REL" | sed 's/[.[\*^$/]/\\&/g')
   NEW_BODY=$(printf '%s' "$CUR_BODY" | sed -E "s#blob/[^) ]+/(${DOC_REL_RE})#blob/${DURABLE_BRANCH}/\1#g")
   if [ "$NEW_BODY" != "$CUR_BODY" ]; then
     mkdir -p .claude/state
     printf '%s' "$NEW_BODY" > .claude/state/issue-body.md
     node references/tracker-issue.js --kind edit --issue {github_issue} \
       --body-file .claude/state/issue-body.md \
       && echo "✅ Document link re-pointed to ${DURABLE_BRANCH}" \
       || echo "⚠️ Document-link re-point failed — non-blocking; re-sync from develop after merge"
   fi
   ```

   - Close the issue and verify closure:

   ```bash
   # Post completion comment — always --body-file, never an inline --body.
   #
   # The heredoc terminator sits at COLUMN 0 even though this block is indented
   # inside a numbered list. Bash does not accept an indented terminator for an
   # unquoted heredoc: it warns "here-document delimited by end-of-file" and
   # swallows everything after it INTO THE BODY, so the close below would never
   # run and the issue would be neither commented nor closed — silently.
   mkdir -p .claude/state
   cat > .claude/state/comment-body.md <<EOF
Story/task development complete — PR: {PR_URL}. Status: accepted. All DoD criteria verified.
EOF
   node references/tracker-comment.js --issue {github_issue} \
     --body-file .claude/state/comment-body.md --stage done --json

   # Close the issue
   node references/tracker-issue.js --kind close --issue {github_issue} --reason completed
   ```

   > The close no longer carries `--comment`. The completion comment is posted by
   > `tracker-comment.js` immediately above, which is the marked, idempotent path —
   > a `--comment` on the close is an *unmarked* second comment that the marker
   > cannot see, so it recurs on every resume.

   After closing, verify the issue is actually closed:

   ```bash
   ISSUE_STATE=$(gh issue view {github_issue} --json state -q '.state')
   if [ "$ISSUE_STATE" = "CLOSED" ]; then
     echo "✅ GitHub Issue #{github_issue} confirmed closed"
   else
     echo "⚠️ GitHub Issue #{github_issue} still open — state: $ISSUE_STATE"
   fi
   ```

   On any `gh issue close` failure: retry once. If still failing, log the error in the Decisions Log and Issues Log, and post a PR comment: "⚠️ Issue #{github_issue} could not be closed automatically — please close manually."

   Log outcome in running summary: "GitHub Issue #{github_issue} — close: {CLOSED ✅ / OPEN ⚠️ (manual action required)}."

   - **Signal the `done` stage** — run the deterministic CLI rather than a hand-rolled board mutation:

   ```bash
   node .agents/skills/finalise/references/gh-stage.js \
     --issue <github_issue> --stage done --json
   ```

   Engine source: `references/gh-stage.js` (bundled into this skill as `references/gh-stage.js`). Note the path is `finalise`-local — the `{develop-story|develop-task|develop-bug}` brace form used by the pipeline step files does not cover this skill.

   The column this lands in comes from `pipeline.done` in the consumer's `tracker-workflow.yaml`, and the option is matched case-insensitively — a board whose column is `done` or `DONE` resolves exactly as `Done` does. Run `gh-stage.js --probe-board` to see a board's real options.

   - **Branch on `reason` in the JSON:**

     | `reason` | Meaning | Action |
     | --- | --- | --- |
     | `transitioned` | Card moved to the resolved column | Record success in the running summary |
     | `already` | Card was already there | Record success — no mutation was needed |
     | `stage-disabled` | Consumer omitted `done:` from `pipeline:` | **Success, not a warning** — a human moves this card by design |
     | `would-regress` | A human advanced the card past Done | Record as informational — the board is ahead of the pipeline |
     | `no-option` | Board has no column matching the `done` moment | Record a warning in the running summary |
     | `no-options` | The Status field exists but has no options at all | Record a warning — the board is misconfigured |
     | `no-status-field` | The board has no Status field | Record a warning — nothing to move |
     | `ambiguous-board` | The issue is on more than one board and no board was selected | Record a warning naming the candidate boards. **Not an error** — a multi-board setup is ordinary. Fix by setting `github.projectBoard` in `skills-config.yaml` or `project_board_number` in `project.yml` |
     | `board-unreadable` | The board read failed (API/permissions) | Record a warning with the CLI's message |
     | `no-repo-context` | `gh repo view` could not resolve the repository | Record a warning — usually a detached checkout or missing `gh` auth |
     | `no-credentials` | `gh` is not authenticated | Record a warning — the card was not moved |
     | `deferred` | `access.tracker` is not `full`, so the CLI declined the move and recorded it instead | **Not an error — a recorded outcome.** The run is operating under a declared restriction; the move was never going to happen and the deferral is the system working. Record it in the running summary naming the record id from the JSON's `record` field, then **escalate via the `not-on-board` path below**, pointing at the handover checklist rather than the board |
     | `not-on-board` | Issue is on no project board | **Escalate — see below** |
     | `mutation-failed` | The CLI already retried and still failed | Escalate — see below |
     | _any other value_ | A reason added to the CLI since this table was written | Log it verbatim in the running summary and treat as a non-blocking warning. Never treat an unrecognised reason as success |

     The CLI exits 0 for every row above, so never treat a zero exit as proof the card moved; read `reason`. Reasons produced only by `--probe-board`, `--write-ladder`, `--dry-run` or `--add-to-board` (`probe`, `write-failed`, `exists`, `dry-run`) cannot occur here — this call passes none of those flags.

   - **If `reason` is `not-on-board`:**
     - Do NOT silently skip. Post a PR comment warning that the board was not updated, using the active `$PLATFORM` branch (GitHub: `gh pr comment <pr-number>` / Bitbucket: REST POST as in Step 6):
       ```
       ⚠️ Project Board Not Updated

       This story/task was accepted but GitHub issue #<github_issue> was not found on any project board — the board status was **not** moved to Done automatically.

       **Action required:** manually move the card to Done on the project board, or add the issue to the board first.

       ```
     - Record this as a warning (not a blocker) in the running summary.

   - **If `reason` is `deferred`:** reuse the escalation above with the wording below. It is the same shape — the board did not move and a human must move it — but the *cause* is a policy the operator themselves declared, so the message must not read as a malfunction:
       ```
       ⏸️ Project Board Move Deferred

       This story/task was accepted. `access.tracker` is set to **<access>**, so the board move to **Done** was recorded rather than performed — recorded as `<record>`.

       **Action required:** run the handover checklist committed beside the implementation report (`*.handover.*.sh` to apply, `*.handover.*.md` to do it by hand). Moving the card to Done on the project board is one of its entries.

       ```
       Take `<access>` and `<record>` from the CLI's JSON. **Never post this without the record id** — a deferral the operator cannot locate in the journal is indistinguishable from a silent skip, which is the failure the whole deferred-mutation mechanism exists to remove.
     - Record it in the running summary as a deferral, **not** as a failure. The Definition of Done is unaffected: a card that a declared restriction stopped the pipeline moving is not an incomplete task.

   - **If `reason` is `mutation-failed`:** post a PR comment using the active `$PLATFORM` branch (GitHub: `gh pr comment <pr-number>` / Bitbucket: REST POST as in Step 6):
       ```
       ⚠️ Project Board Update Failed

       This story/task was accepted but the attempt to move GitHub issue #<github_issue> to **Done** on the project board failed.

       **Error details:** `<paste the CLI's JSON output>`

       **Action required:** manually move the card to Done on the project board.

       ```
     - Record the failure (and the error detail) in the running summary. The CLI has already retried internally — do not re-run it.

8. **Communicate to User:**
   - Display a success message with summary of completion
   - Show path to updated story document
   - Show path to Sprint Review summary
   - Confirm PR comment was posted
   - Confirm tracker issue closed/transitioned to Done (GitHub: issue closed + state verified; Jira: transitioned via MCP) — or note failure with manual action required
   - Confirm project board item was moved to Done (GitHub only — or note if not found on any board)

**Step 7 Completion Checklist — tick off each before moving on:**

- [ ] Running summary file finalized (status = COMPLETED - ACCEPTED)
- [ ] Story frontmatter updated: `status: accepted`, `updated`, `completed_date`, `pr_number`
- [ ] DoD PASSED section added to story document body
- [ ] Running summary referenced in DoD section
- [ ] Sprint Review summary file created at `{story-directory}/sprint-review-summary.md`
- [ ] PR comment posted (GitHub: `gh pr comment`, Bitbucket: REST API)
- [ ] Tracker issue closed: Jira issue transitioned via MCP (`transitionJiraIssue`) **OR** GitHub issue closed via `gh issue close` + closure confirmed with `gh issue view --json state` **OR** warning comment posted (if close failed after retry)
- [ ] Tracker board updated: Jira — N/A (handled by transition above) **OR** GitHub project board item moved to Done via GraphQL mutation **OR** warning comment posted (if mutation failed after retry)
- [ ] Running summary records issue close outcome AND board update outcome (success, failure, not-found — with detail)
- [ ] User notified with success message, artifact paths, PR comment link, and board update status

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

3. **Append the gaps row to `## Change Log`** — and bump frontmatter `updated`:

   ```markdown
   | 2026-05-15 |  | DoD incomplete — 3 gaps identified | finalise |
   ```

   **`Version` stays blank here.** The status is deliberately unchanged on this path, so there is
   no revision to bump — the minor bump belongs only to the acceptance row in Step 7. A gaps row
   records that finalise ran and what it found, which is exactly the history a reader needs when
   the next run does accept. Canonical format:
   [document-change-log.md](references/document-change-log.md).

4. **Add Gap Report to Document Body:**
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
   **QA Gate Reference**: See `story.311.2.gate.1.initial-review.yml` for full details

   **Detailed Verification Log:** See `story.311.2.dod.1.transaction-event-history.md` for complete verification evidence and timestamps.
   ```

5. **Add PR Comment (if PR exists):**
   - Use the active `$PLATFORM` branch to notify about gaps (GitHub: `gh pr comment <pr-number>` / Bitbucket: REST POST as in Step 6)
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

6. **Communicate to User:**
   - Display a clear message that the story is NOT ready for acceptance
   - List all gaps in a readable format
   - Suggest next steps to close the gaps
   - Estimate effort required

**Step 8 Completion Checklist — tick off each before moving on:**

- [ ] Running summary file finalized (status = COMPLETED - GAPS IDENTIFIED)
- [ ] Story status NOT changed (kept at current status, not set to accepted)
- [ ] Gap report section added to story document body
- [ ] PR comment posted on the active platform (GitHub: `gh pr comment` / Bitbucket: REST POST) (skip only if no PR exists)
- [ ] User notified with clear NOT ACCEPTED message, gap list, and next steps

## Usage Examples

### Example 1: Story Fully Meets DoD

**User Request:**

```
Mark story.311.1.example-system as complete
```

**Skill Actions:**

1. Read story document from `${PRD_ROOT}/.../story.311.1.example-system.md`
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

**Story:** story.311.1.example-system
**Status:** ACCEPTED
**Acceptance Date:** 2025-02-01

**QA Gate Status:** ✅ PASS (Quality Score: 92/100)

All Definition of Done criteria verified:
- ✅ All 5 acceptance criteria met (verified by QA report)
- ✅ PR #789 approved by 2 reviewers
- ✅ Tests in src/notifications/example-action.spec.ts
- ✅ Documentation updated
- ✅ Security review passed (API authentication, input validation - QA verified)
- ✅ Performance review passed (QA verified)
- ✅ Reliability review passed (QA verified)
- ✅ Maintainability review passed (QA verified)

**QA Reports:**
- QA Report: ${PRD_ROOT}/.../story.311.1.../story.311.1.qa.1.initial-review.md
- Gate File: ${PRD_ROOT}/.../story.311.1.../story.311.1.gate.1.initial-review.yml

**Artifacts Generated:**
- Updated: ${PRD_ROOT}/.../story.311.1.../story.311.1...md
- Created: ${PRD_ROOT}/.../story.311.1.../sprint-review-summary.md
- PR Comment: https://github.com/org/repo/pull/789#comment-xyz
```

### Example 2: Story Has Gaps

**User Request:**

```
Check if task.90.swagger-cli-plugin-enablement is ready for acceptance
```

**Skill Actions:**

1. Read task document from `docs/tasks/task.90.../task.90...md`
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

**Gap report added to:** docs/tasks/task.90.../task.90...md
```

### Example 3: Directory Path Provided

**User Request:**

```
Verify DoD for ${PRD_ROOT}/ui-domain/module-name/epics/epic.311.example-integration/stories/story.311.2.example-notifications/
```

**Skill Actions:**

1. Use Glob to find `.md` file in directory: `${PRD_ROOT}/.../story.311.2.example-notifications/*.md`
2. Found: `story.311.2.example-notifications.md`
3. Check for QA reports: `${PRD_ROOT}/.../story.311.2.example-notifications/*.qa.*.md`
4. Check for gate files: `${PRD_ROOT}/.../story.311.2.example-notifications/*.gate.*.yml`
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

---

## Pipeline Lock Cooperation (when invoked by `/develop-story` or `/develop-task`)

When this skill is invoked as a step in a develop pipeline, advance the pipeline lock as the **last action** before returning, so the orchestrator's next turn does not depend on model discipline:

```bash
if [ -f .claude/state/develop-pipeline.lock ]; then
  bash .agents/skills/finalise/references/advance-pipeline-lock.sh --skill finalise 2>/dev/null || true
fi
```

Idempotent in every degraded path: noops when the lock is missing (skill invoked standalone), already advanced past this step, or the helper script is not installed. Full rationale and cooperation order with the `Stop` hook: see [`references/pipeline-lock-cooperation.md`](references/pipeline-lock-cooperation.md).
