---
name: qa-task
description: Comprehensive quality assurance review for technical tasks. Focuses on success criteria validation, implementation phase verification, and non-functional requirements assessment for infrastructure and refactoring work.
---

> **Status lifecycle**: see [`references/document-status-lifecycle.md`](references/document-status-lifecycle.md)
>
> **Placeholders**: `{project}` in NX commands is a template — substitute your project name. See [`docs/placeholders.md`](../../docs/placeholders.md).

# QA Task Review Skill

**Version**: 2.0
**Last Updated**: 2026-03-20
**Skill Type**: Quality Assurance

## Description

This skill guides QA engineers through comprehensive quality assurance reviews for technical tasks (refactoring, infrastructure improvements, technical debt reduction, architectural changes). It adapts the story QA workflow for technical work, focusing on success criteria, implementation phases, and non-functional requirements.

## Lite Mode (Pipeline Contract)

When invoked from the `/develop-task` orchestrator, the call may be prefixed with the lite-mode directive. See `references/develop-pipeline-lite-mode.md` for trigger conditions, pipeline behaviour, and directive format.

**Effect on this skill**:

- Skip parallel agents in the Adaptive Review Strategy decision — use the **Lite mode** rule (direct tools only) regardless of phase count or risk.
- **Step 3b (Diff Code Review) still runs** — as a single read-only Explore subagent. It is the one exception to "skip parallel agents": it is not part of the parallel-agent set, and lite mode runs exactly one light code-review pass.
- All other phases (success criteria, breaking changes, NFR, gate decision) run unchanged.
- Log the override in the QA report's Review Methodology section: `Adaptive strategy override: lite mode — direct tools only`.

If invoked outside the pipeline (no lite directive), the normal Adaptive Review Strategy applies.

## Pipeline Skill args (Pipeline Contract)

When invoked from the `/develop-task` orchestrator, the Skill `args` field may carry `key=value` tokens:

```
Skill(qa-task, args="traceability_matrix=<path> code_review_blocking=true")
```

- `traceability_matrix=<path>` — a pre-built traceability matrix (see Step 5 / traceability handling); absent → internal mapping.
- `code_review_blocking=true` — run-level override. Set `CODE_REVIEW_BLOCKING_ARG` from this token (default empty when absent). It feeds the canonical resolution in **Step 3b step 4** so high-confidence code-review bugs gate the build (and thus get fixed in the qa-fix loop) without needing per-task frontmatter. A task still opts **out** with `code_review_blocking: false` in its frontmatter (escape hatch). Absent for standalone runs → code review stays advisory unless the task opts in via frontmatter.

## When to Use This Skill

Activate this skill when:

- ✅ Developer marks technical task as "Ready for QA"
- ✅ All implementation phases completed
- ✅ Tests are passing
- ✅ Breaking changes documented with migration paths
- ✅ Technical task document exists at `docs/tasks/task.[id].[name]/task.[id].[name].md`

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
| Run diff code review            | Adversarially review the change-set diff for bugs + cleanups (Step 3b)        |
| Execute documented commands     | Extract and run the skill's fenced bash blocks under bash + zsh (Step 4b)    |
| Verify success criteria         | Check functional, performance, code quality criteria against actual results  |
| Validate breaking changes       | Verify migration paths documented and consumer code updated                  |
| Run NFR assessment              | Evaluate performance, reliability, security, maintainability                 |
| Run regression testing          | Test dependent areas for regressions                                         |
| Document issues                 | Create bug report files for all HIGH/MEDIUM severity issues found            |
| Write QA report                 | Create co-located `task.{id}.qa.N.*.md` report file                         |
| Write gate YAML                 | Create co-located `task.{id}.gate.N.*.yml` file                             |
| Update task file                | Add QA Results section, update status, link artifacts                        |
| Post PR comment                 | Post QA gate decision to PR via `gh pr comment` — best-effort, non-blocking |
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

   **A prior gate only speaks for the code and the document it was written against.** Before the skip
   branch can apply, establish that neither has moved since. Gather both freshness signals:

   ```bash
   GATE_DATE=$(grep -E '^updated:' "$LATEST_GATE" | head -1 | sed -E "s/updated:[[:space:]]*//; s/['\"]//g")
   DOC_DATE=$(grep -E '^updated:' "$TASK_FILE"  | head -1 | sed -E "s/updated:[[:space:]]*//; s/['\"]//g")
   DOC_STATUS=$(grep -E '^status:' "$TASK_FILE" | head -1 | awk '{print $2}')
   # Any commit touching source since the gate was written?
   CODE_MOVED=$(git log --since="$GATE_DATE" --name-only --format="" -- \
     apps packages 2>/dev/null | sort -u | head -1)
   ```

   **Skip re-review (exit with success message) ONLY when ALL of:**
   - Gate status is `PASS`
   - AND `top_issues` list is empty
   - AND `CODE_MOVED` is empty — no source commit since the gate
   - AND `DOC_DATE` is not newer than `GATE_DATE` — the task document has not been edited since
   - AND `DOC_STATUS` is not one of `in-progress` / `ready-for-development` / `planned` — a status
     that moved *backwards* from `accepted` means the work was reopened
   - Message: "Task already has clean PASS gate with no concerns, and neither the code nor the
     document has changed since. Re-review not needed."

   **Perform re-review when ANY of:**
   - Gate status is `CONCERNS`, `FAIL`, or `WAIVED`
   - OR `top_issues` has items (even if gate is PASS)
   - OR no gate file exists (first review)
   - OR **source changed since the gate** (`CODE_MOVED` non-empty)
   - OR **the document changed since the gate** (`DOC_DATE` > `GATE_DATE`)
   - OR **the document was reopened** (status moved backwards from `accepted`)
   - Message: "Performing QA re-review (previous gate: {status} with {count} issues; {reason})"

   > **Why the extra conditions.** The skip branch as originally written keys only on the *content*
   > of the last gate, never on whether that gate is still *about* the current state. A reopened task
   > carries its old `PASS` forward, so the one situation most in need of QA — work that was accepted
   > and then found wanting — is precisely the one that skips it. Observed live: task.52 was accepted
   > at PASS 92/100 with its Playwright lane red, reopened with a new criterion, and its stale PASS
   > gate would have short-circuited the re-review that then found **seven** further defects.
   >
   > **A green gate is a statement about a commit, not a property of the task.** When in doubt,
   > re-review — the cost is one QA cycle, and the cost of the alternative is shipping on evidence
   > that has expired.

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

- [ ] Task document exists at `docs/tasks/task.[id].[name]/task.[id].[name].md`
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
2. Review files changed — resolve the PR base first: `BASE="origin/$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo develop)"`, then `git diff "$BASE...HEAD" -- {files}`
3. Confirm changes match the plan
4. Look for potential issues

**Create Phase Completion Table:**

| Phase           | Status      | Test Result | Notes          |
| --------------- | ----------- | ----------- | -------------- |
| Phase 1: {Name} | PASS        | Verified    | {Notes}        |
| Phase 2: {Name} | PASS        | Verified    | {Notes}        |
| Phase 3: {Name} | CONCERNS    | Partial     | {Issues found} |

**Overall Phase Completion**: {X/Y phases passed}

### Step 3b: Diff Code Review

Adversarially review the change set's **diff** for **correctness bugs** (logic errors, null/async/race, API misuse, broken invariants) and **cleanups** (reuse of existing utilities, simplification, efficiency) — the lens the document-anchored checks above do not provide. Governed by the **Adaptive Review Strategy**: run a single light pass in lite/small/re-review; a full pass otherwise; skip entirely when the diff touches no reviewable code.

1. **Scope the diff** to this cycle's changes and write it to a patch file (keeps diff bytes out of main context). On a re-review (Phase 0 found a prior gate), scope to files changed since that gate's `updated:` date; otherwise review the whole branch diff:

   ```bash
   BASE_REF=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null)   # standalone tasks usually target develop
   BASE="origin/${BASE_REF:-develop}"
   DIFF_FILE=$(mktemp /tmp/qa-code-review-XXXXXX.diff)
   # Re-review only: derive the prior gate's date from its `updated:` field ($LATEST_GATE set in Phase 0).
   LAST_GATE_DATE=$(grep -E '^updated:' "$LATEST_GATE" 2>/dev/null | head -1 | sed -E "s/updated:[[:space:]]*//; s/['\"]//g")
   if [ -n "$LAST_GATE_DATE" ]; then                       # re-review (cycle ≥ 2) — scope to files changed since last gate
     FILES=$(git log --since="$LAST_GATE_DATE" --name-only --format="" | sort -u)
     [ -n "$FILES" ] && git diff "$BASE...HEAD" -- $FILES > "$DIFF_FILE"
   else
     git diff "$BASE...HEAD" > "$DIFF_FILE" 2>/dev/null || git diff "origin/develop...HEAD" > "$DIFF_FILE"
   fi
   ```

2. **Dispatch a read-only Explore subagent** with the prompt from `references/code-review-prompt.md` (the single source of truth — pass it verbatim), substituting `<DIFF_FILE>` and `<WORKING_DIR>` (repo root). It returns a `code_review:` YAML findings block. Never read the raw diff into main context. In lite/direct-tools mode use one subagent; for large/high-risk tasks the Adaptive Review Strategy may run it alongside the other parallel agents.

3. **Record — always (advisory):** put every finding (bugs + cleanups, with `file:line`) into the QA report `## Code Review` section (Step 11) and the PR comment (Step 13).

4. **Gate mapping — resolve blocking, then map:** apply the **canonical resolution** from the **Opt-in to blocking** section of `references/code-review-prompt.md`. It combines a run-level override (from Skill `args`) with the task frontmatter flag; an explicit per-doc `false` is the escape hatch:

   ```bash
   # CR_OVERRIDE=true when the develop-task pipeline passed code_review_blocking=true in Skill args
   # (empty for standalone qa-task runs).
   CR_OVERRIDE=$([ "$CODE_REVIEW_BLOCKING_ARG" = "true" ] && echo true || echo "")
   DOC_FLAG=$(grep -E '^code_review_blocking:[[:space:]]*(true|false)\b' "$TASK_FILE" \
                | head -1 | grep -Eo '(true|false)' || true)
   if [ "$DOC_FLAG" = "false" ]; then CR_BLOCKING=false
   elif [ "$CR_OVERRIDE" = "true" ] || [ "$DOC_FLAG" = "true" ]; then CR_BLOCKING=true
   else CR_BLOCKING=false; fi
   ```

   `$CODE_REVIEW_BLOCKING_ARG` comes from the `code_review_blocking=` token in Skill `args` (see **Pipeline Skill args**). When `CR_BLOCKING=true`, append each finding that is `category: bug` AND `confidence: high` to the gate `top_issues[]` as `{ id, severity, finding, suggested_action, suggested_owner: dev }` (Step 10's deterministic rules then decide). Otherwise — resolved advisory, or every cleanup or non-high-confidence finding — the gate is **unaffected**.

5. `rm -f "$DIFF_FILE"`.

This keeps the QA→qa-fix loop safe: only a high-confidence correctness bug triggers a fix cycle; cleanups and uncertain findings stay advisory. Under the develop-task pipeline (which sets the run-level override) this *is* the code-review-and-fix loop; standalone, behaviour is unchanged unless the task opts in via frontmatter.

### Step 3c: Mutation-Proof Spot Check

A green suite says the tests ran, not that they can fail. Before crediting a test
as coverage for a defect this cycle fixed, **revert the behaviour it names and
confirm that test goes red** — full procedure and the four shapes vacuity takes:
[`references/mutation-proving.md`](references/mutation-proving.md).

Scope it: not every assertion, but **every test guarding a fix made this cycle**,
plus any guard whose failure mode is silence. If the suite stays green with the
behaviour reverted, record the test as **not** covering that criterion — a
vacuous test is worse than a missing one, because it reports coverage that is
not there.

Record the result in the QA report's Code Review section as `mutation-proven:
yes/no` per fixed defect. Do **not** write "every invariant mutation-proven"
unless every one was actually reverted; if you proved four of five, say so.

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

### Step 4b: Execute the Documented Commands

Applies only when this work item's deliverable is **runnable prose** — the diff adds or modifies a
`SKILL.md` or a `shared/resources/*.md` prompt containing at least one fenced ```bash block. The full
rule, including why the safety boundary is an allow-list rather than a deny-list, is stated once in
`references/qa-runnable-prose-detection.md`. Read it before changing anything here.

When the rule does not fire, record `Step 4b: not applicable — no runnable prose in the change set` in
the QA report's Review Methodology and move on. The step is cheap where it does not apply.

When it does fire, run the engine over each changed in-scope file:

```bash
node references/qa-execute-snippets.mjs --file "$SKILL_FILE" --json
```

Bind any caller values the documented snippets expect with repeated `--bind NAME=VALUE`, and seed the
temp working directory from a real directory with `--copy <dir>` so the blocks see real data rather than
an empty tree. Execution always happens in that temp copy — never the live tree.

**Document results:**
- Blocks found, and the count classified `runnable` / `placeholder` / `mutating`
- **Every skipped block, with its line number and reason.** A silent skip recreates the exact failure
  this step exists to prevent
- Which shells actually ran; note `zsh-unavailable` when the host has no zsh
- Each finding, mapped onto the existing `code_review` finding shape — `category: bug`, with
  `severity` and `confidence` from the rule's table (`high` for an execution failure, `medium` for a
  shell disagreement)

An execution failure is eligible for gate `top_issues[]` under `code_review_blocking` exactly like any
other `category: bug` finding. No new report or gate schema.

> **A run where zero blocks executed is a finding, not a pass.** The engine raises
> `zero-blocks-executed` for you; do not suppress it. An over-broad classification that skips everything
> is the silent-skip shape this step was built to eliminate, and it would be easy to reintroduce here.
>
> `zsh` being absent is **not** that case — it never reduces the runnable count. Record it as
> information and continue.

**Lite mode**: the step still runs, but only over blocks in the changed file.

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

Evaluate each NFR and assign PASS / CONCERNS / FAIL using the thresholds in the **NFR Evaluation Criteria** section below.

- **Performance**: Run performance tests; compare with baseline; check for regressions; validate resource usage
- **Reliability**: Test error handling; validate rollback plan; check recovery mechanisms
- **Security**: Review for security issues; check dependencies; validate auth/authorization preserved
- **Maintainability**: Review code clarity; check documentation; assess technical debt impact

For each NFR, document findings and assign a status in the **NFR Assessment** section of the QA report. Gate impact: any NFR FAIL → Gate = FAIL; any NFR CONCERNS → Gate = CONCERNS (minimum).

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

> **Code-review findings (Step 3b):** by default these do NOT enter `top_issues` and do NOT affect the gate. Only when the task doc opts in via `code_review_blocking: true` in its frontmatter are `category: bug` + `confidence: high` findings appended to `top_issues[]` — at which point rules 1–2 above apply unchanged. Cleanups and non-high-confidence findings are always advisory.

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

## Code Review

{From Step 3b — advisory unless the doc opted in via `code_review_blocking: true`. Omit the section if the diff had no reviewable code.}

**Correctness bugs ({count}):**
{for each bug finding:}
- [{severity}/{confidence}] `{file_line}` — {finding} → {suggested_action}

**Cleanups ({count}):**
{for each cleanup finding (reuse / simplification / efficiency):}
- `{file_line}` — {finding} → {suggested_action}

{If any finding was promoted to a gate `top_issues` entry (opt-in blocking), note its id here.}

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

**Append the verdict row to `## Change Log`** — in the same edit as the QA Results section and the
status update, bumping frontmatter `updated`:

```markdown
| 2026-05-14 |  | QA gate CONCERNS (6/10) — 2 findings | qa-task |
```

One row per QA cycle. `Version` stays blank — only `/finalise` bumps it. Name the decision, the
score and the finding count; the detail lives in the QA report the row links to. A clean cycle
still writes a row — the verdict is the event, not the findings. If the task predates the Change
Log template and has no such section, create it after `## 11. Rollback Plan` with the four
canonical columns. Canonical format:
[document-change-log.md](references/document-change-log.md).

**Never write the gate `.yml` from here** — it belongs to `qa-gate` alone, and `qa-gate` never
touches the document. See [`docs/reference/anti-patterns.md`](../../docs/reference/anti-patterns.md).

### Step 13: Post PR Comment — Best-effort, non-blocking

**PR-comment authorship contract**:

| Skill | Owns |
|---|---|
| `qa-task` | Per-cycle gate decision (best-effort, non-blocking) |
| `qa-fix` | Per-cycle fix summary (best-effort, non-blocking) |
| `finalise` | Canonical summary — PR + final gate + QA cycle count + DoD path + accepted status (idempotent via marker) |

**This step is best-effort.** If the comment cannot be posted (network error, auth issue), log the failure and continue — do not halt. The final canonical summary is posted by `/finalise` at pipeline end.

Use the PR metadata stored in the Prerequisites step. Source the retry helper with `source references/resolve-platform.sh || exit 1` — guarded, because that file also validates the platform and access keys and returns non-zero on an unrecognised value — and wrap the comment in `tracker_call_with_retry` (3× exponential backoff — handles transient GitHub/Anthropic API failures). Run:

```bash
tracker_call_with_retry gh pr comment "$PR_URL" --body "## QA Review: {GATE_DECISION}

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
- **Code Review** (Step 3b): {B} bug(s), {C} cleanup(s) — {advisory, or '{N} promoted to gate (code_review_blocking)'}

### Code Review Findings

{Top correctness bugs + notable cleanups from Step 3b, each `file:line — finding`. 'None identified' if empty. Advisory unless the doc opted in via code_review_blocking.}

### Critical Issues

{List critical issues, or 'None identified'}

### Deployment Recommendation

**Status**: {APPROVED/CONDITIONAL/BLOCKED}
**Conditions**: {Any conditions, or 'None'}

### Next Steps

1. {Step 1}
2. {Step 2}

---
" || echo "⚠️ PR comment failed after 3 retries — non-blocking. Final canonical summary will be posted by /finalise."
```

### Step 13b: Comment on Tracker Issue (graceful — non-blocking)

Branch on the tracker resolved by `source references/resolve-platform.sh || exit 1` (which sets `TRACKER=github|jira`). Keep the `|| exit 1` — the resolver returns non-zero on an unrecognised `tracker:`, `vcs:` or `access:` value, and sourcing it bare would continue past the rejection with a default.

**GitHub path** (when `TRACKER=github`) — extract `github_issue` from the task document YAML frontmatter (read in Step 2). If present, post a summary comment to the linked Issue:

```bash
if [ -n "$GITHUB_ISSUE_QA" ]; then
  tracker_call_with_retry gh issue comment "$GITHUB_ISSUE_QA" \
    --body "QA ${GATE_DECISION} (${score}/100) — PR #${PR_NUMBER}: ${PR_URL}" \
    || echo "⚠️  Issue comment failed after 3 retries — continuing"
fi
```

If `github_issue` is absent from the frontmatter, skip silently. Failure does NOT halt the skill.

**Jira path** (when `TRACKER=jira`) — extract `jira_key` from the task document YAML frontmatter. If present and non-null, post the same summary to the linked Jira issue:

```bash
JIRA_KEY=$(grep -E '^jira_key:' "$TASK_FILE" | head -1 | sed -E 's/jira_key:[[:space:]]*//' | tr -d '"'"'"' ')
```

If `TRACKER=jira` and `JIRA_KEY` is non-empty and not `null`:

```bash
mkdir -p .claude/state
printf 'QA %s (%s/100) — PR #%s: %s\n' \
  "$GATE_DECISION" "$score" "$PR_NUMBER" "$PR_URL" > .claude/state/comment-body.md

node .agents/skills/qa-task/references/tracker-comment.js \
  --issue "$JIRA_KEY" --body-file .claude/state/comment-body.md \
  --stage qa-gate --json
```

> Engine source: `references/tracker-comment.js` (bundled into each skill as `references/tracker-comment.js`). Contract: `references/tracker-comment-contract.md`.


Read `reason` and act per [`references/tracker-comment-contract.md`](references/tracker-comment-contract.md) — only `no-credentials` may fall back to the Atlassian MCP tool.
3. On success: log `📨 QA summary posted to Jira issue ${JIRA_KEY}`.
4. On failure: log `⚠️ Jira comment failed for ${JIRA_KEY} — PR comment was posted successfully. Continuing.` (non-blocking — do not halt qa-task).

If `jira_key` is absent or null, skip silently. Failure does NOT halt the skill. Cross-reference: `qa-fix` and `finalise` post through the same `tracker-comment.js` call.

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
- [ ] PR comment posted via `tracker_call_with_retry gh pr comment "$PR_URL"` (Step 13 — BLOCKING): confirm exit code 0 after up to 3 attempts
- [ ] Tracker Issue comment posted (Step 13b — graceful): `tracker-comment.js` invoked and its `reason` read (skipped if `github_issue` / `jira_key` absent or null); non-blocking on persistent failure
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
docs/tasks/task.1.cache-lib-simplification/
├── task.1.cache-lib-simplification.md          # Main task document
├── task.1.qa.1.cache-lib-simplification.md     # QA report (co-located)
├── task.1.gate.1.cache-lib-simplification.yml  # Gate file (co-located)
├── task.1.bug.1.memory-leak.md                 # Bug report 1 (co-located)
└── task.1.bug.2.test-failure.md                # Bug report 2 (co-located)
```

**CRITICAL: Gate files MUST be co-located with the task file in the same directory.** Do not store them in a separate `docs/qa/gates/` path.

**Legacy Note**: Old pattern of storing gates in `docs/qa/gates/tasks/` is deprecated. All new gate files must be co-located.

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

- **Technical Task Skill**: `.agents/skills/create-task/SKILL.md`
- **QA Planning Skill**: `.agents/skills/qa-planning/SKILL.md`
- **QA Gate Skill**: `.agents/skills/qa-gate/SKILL.md`
- **Create Bug Report Skill**: `.agents/skills/create-bug-report/SKILL.md`
- **Fix QA Skill**: `.agents/skills/qa-fix/SKILL.md`

---

**Last Updated**: 2026-03-20
**Version**: 2.0
**Maintainer**: QA Team
