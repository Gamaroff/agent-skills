---
name: qa-task
description: Comprehensive quality assurance review for technical tasks. Focuses on success criteria validation, implementation phase verification, and non-functional requirements assessment for infrastructure and refactoring work.
---

> **Status lifecycle**: see [`references/document-status-lifecycle.md`](references/document-status-lifecycle.md)
>
> **Placeholders**: `{project}` in NX commands is a template — substitute your project name. See [`docs/reference/configuration.md`](../../docs/reference/configuration.md).

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
- `code_review_blocking=true` — run-level override. Set `CODE_REVIEW_BLOCKING_ARG` from this token (default empty when absent). It feeds the canonical resolution in **Step 3b step 6 (Gate mapping)** so high-confidence code-review bugs gate the build (and thus get fixed in the qa-fix loop) without needing per-task frontmatter. A task still opts **out** with `code_review_blocking: false` in its frontmatter (escape hatch). Absent for standalone runs → code review stays advisory unless the task opts in via frontmatter.

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
| Post PR comment                 | Post QA gate decision to PR — `gh pr comment` on GitHub, REST on Bitbucket; best-effort, non-blocking |
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

PR_URL=$(printf '%s' "$PR_JSON" | jq -r '.url')
PR_STATE=$(printf '%s' "$PR_JSON" | jq -r '.state')
PR_NUMBER=$(printf '%s' "$PR_JSON" | jq -r '.number')
PR_TITLE=$(printf '%s' "$PR_JSON" | jq -r '.title')
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
   # The current gate is the HIGHEST-numbered one, and the number has ONE definition — the bundled
   # qa-cycle.sh (task.121). It refuses (rc 1, empty) when no numbered gate exists, which is the
   # first-review case. The FILE comes from the same helper's --path mode (task.158): the
   # name-glob lookup it replaced missed a zero-padded gate.02, and took the first of two
   # files silently. A cycle that no ONE regular file carries is refused, never read as "no gate".
   PRIOR_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" 2>/dev/null); rc=$?
   [ "$rc" -le 1 ] || { echo "⚠️  qa-cycle.sh not runnable (rc=$rc) — check the path" >&2; exit 1; }
   LATEST_GATE=""
   if [ -n "$PRIOR_CYCLE" ]; then
     LATEST_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate); rc=$?
     [ "$rc" -eq 0 ] || { echo "⚠️  qa-cycle.sh --path gate refused cycle $PRIOR_CYCLE (rc=$rc) — resolve the gate files named above, then re-run" >&2; exit 1; }
   fi
   ```

2. **If gate file exists, read and analyze:**

   ```bash
   # Bound in THIS shell: the step-1 block that resolved it is another shell, and an unbound read
   # here silently takes the no-gate branch (task.135 QA cycle 2 probe).
   # Validate the input before deriving from it: unbound, dirname "" is ".", no gate is found, and
   # every signal below silently reads "no prior gate" (task.135 QA cycle 3, CR3-1).
   [ -f "$TASK_FILE" ] || { echo "HALT: TASK_FILE ('$TASK_FILE') is not a file — bind this skill's work-item path in this shell"; exit 1; }
   TASK_DIR=$(dirname "$TASK_FILE")
   # The two-call pattern step 1 uses (task.168, 5c CR-1). qa-cycle.sh exits 1 for "no gate file",
   # for "gate files with no cycle number" and, under --path, for "two files claim one cycle"; only
   # the first is a first review. Its own reason tells them apart, so it is read rather than dropped:
   # the one refusal that means "first review" is let through, every other refusal is a HALT that
   # prints the helper's line (QA cycle 1, CR-3). The selection itself stays the helper's — no glob
   # here duplicates it (task.158).
   if [ -z "${LATEST_GATE:-}" ]; then
     GATE_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" 2>&1); rc=$?
     [ "$rc" -le 1 ] || { echo "HALT: qa-cycle.sh not runnable (rc=$rc) — check the bundled path"; exit 1; }
     if [ "$rc" -eq 0 ]; then
       LATEST_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate); rc=$?
       [ "$rc" -eq 0 ] || { echo "HALT: qa-cycle.sh refused cycle $GATE_CYCLE (see its line above) — resolve the gate files, then re-run"; exit 1; }
     else
       case "$GATE_CYCLE" in
         *"no gate file in"*) : ;;   # a first review — nothing to bind
         *) printf '%s\n' "$GATE_CYCLE"; echo "HALT: qa-cycle.sh could not derive the QA cycle (see its line above) — resolve the gate files, then re-run"; exit 1 ;;
       esac
     fi
   fi
   if [ -n "$LATEST_GATE" ]; then
     GATE_STATUS=$(grep '^gate:' "$LATEST_GATE" | awk '{print $(2)}')
     HAS_ISSUES=$(grep -c '^  - issue:' "$LATEST_GATE" 2>/dev/null || echo 0)
     echo "Found existing QA review: $LATEST_GATE"
     echo "Gate Status: $GATE_STATUS — Issues: $HAS_ISSUES"
   fi
   ```

3. **Decide whether to re-review:**

   **A prior gate only speaks for the code and the document it was written against.** Before the skip
   branch can apply, establish that neither has moved since. Gather both freshness signals:

   ```bash
   # $TASK_FILE is this skill's input. $LATEST_GATE and $TASK_DIR are computed, and the step 1 block
   # that computed them is another shell — bind both here (task.135 QA cycle 2, CR2-3). qa-cycle.sh
   # refuses with no numbered gate: then GATE_HEAD is empty and both signals below read 1.
   # Validate the input before deriving from it: unbound, dirname "" is ".", no gate is found, and
   # every signal below silently reads "no prior gate" (task.135 QA cycle 3, CR3-1).
   [ -f "$TASK_FILE" ] || { echo "HALT: TASK_FILE ('$TASK_FILE') is not a file — bind this skill's work-item path in this shell"; exit 1; }
   TASK_DIR=$(dirname "$TASK_FILE")
   [ -n "${LATEST_GATE:-}" ] || LATEST_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate)
   # ":(exclude)$TASK_DIR" below must exclude the task's directory, not the tree: a task file at the
   # repository root would make it ":(exclude)." and CODE_MOVED always 0 (task.135 QA cycle 3, CR3-2).
   [ -n "$(git -C "$TASK_DIR" rev-parse --show-prefix 2>/dev/null)" ] || { echo "HALT: the task directory ('$TASK_DIR') is the repository root — the trigger cannot tell the task's own files from the code"; exit 1; }
   # The commit the gate judged (its `head:`), never its typed `updated:` — a timestamp in the
   # future made `git log --since` hide every later commit from this check (task.135).
   GATE_HEAD=$(grep -E '^head:' "$LATEST_GATE" 2>/dev/null | head -1 | sed -E "s/^head:[[:space:]]*//; s/[[:space:]]+#.*$//; s/['\"]//g; s/[[:space:]]*$//")
   DOC_STATUS=$(grep -E '^status:' "$TASK_FILE" | head -1 | awk '{print $(2)}')
   # A head the trigger cannot vouch for fails toward re-review, never toward "nothing moved": a
   # hand-typed `head: HEAD` counted 0 commits on every run, and an off-branch head counted only what
   # it happened not to share, so a PASS gate skipped review whatever landed after it (task.168
   # CR4-1). Step 3b HALTs on the same heads; here the safe answer is to re-review.
   if [ -n "$GATE_HEAD" ] && ! { printf '%s' "$GATE_HEAD" | grep -qE '^[0-9a-f]{40}$' \
        && git cat-file -e "${GATE_HEAD}^{commit}" 2>/dev/null \
        && git merge-base --is-ancestor "$GATE_HEAD" HEAD 2>/dev/null; }; then
     echo "trigger: gate head '$GATE_HEAD' is not a 40-hex commit on this branch — re-reviewing"
     CODE_MOVED=1; DOC_MOVED=1
   elif [ -n "$GATE_HEAD" ]; then
     # Commits since the commit the gate judged, on EVERY path except this task's own directory —
     # the gate, the QA report, the task document and the implementation report live there and move
     # on every cycle. A fixed list of source directories missed scripts/, tests/ and a consumer's
     # src/ (task.135 CR-3); excluding all of docs/ hid a documentation deliverable (CR2-4).
     # `|| echo 1` fails toward re-review when git cannot answer (a head this checkout lacks).
     CODE_MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- . ":(exclude)$TASK_DIR" 2>/dev/null || echo 1)
     # Uncommitted and untracked changes outside the task directory are movement too: the gate
     # never read them (CR2-5). An untracked file counts here even though Step 3b only WARNS on one
     # (a held file the develop pipeline restored is the normal state of a healthy branch): the
     # trigger cannot tell a restored file from a new fix file, so it fails toward re-review and the
     # cost is one cycle (task.168 QA cycle 2, CR-3).
     git diff --quiet HEAD -- . ":(exclude)$TASK_DIR" 2>/dev/null || CODE_MOVED=$((CODE_MOVED + 1))
     [ -z "$(git ls-files --others --exclude-standard -- . ":(exclude)$TASK_DIR" 2>/dev/null)" ] || CODE_MOVED=$((CODE_MOVED + 1))
     # The document is compared from the commit that last wrote the GATE, not from the head: a QA
     # cycle edits the task document itself (QA Results, Change Log) after the head it records, and
     # those edits land beside the gate. Measured from the head, every gate would read "document
     # moved" and the skip branch below could never fire. This relies on the QA loop committing
     # the document edits WITH the gate; a split commit reads as "moved" and costs one re-review.
     # The comparison is commit-to-WORKING-TREE, so an uncommitted edit to the document counts
     # (task.135 CR-4).
     GATE_COMMIT=$(git log -1 --format=%H -- "$LATEST_GATE" 2>/dev/null)
     if [ -n "$GATE_COMMIT" ]; then
       git diff --quiet "$GATE_COMMIT" -- "$TASK_FILE" 2>/dev/null && DOC_MOVED=0 || DOC_MOVED=1
     else
       DOC_MOVED=1                   # gate not committed yet — nothing to measure from
     fi
   else
     CODE_MOVED=1; DOC_MOVED=1       # a gate with no head (schema 1) cannot vouch for the present tree
   fi
   ```

   **Skip re-review (exit with success message) ONLY when ALL of:**
   - Gate status is `PASS`
   - AND `top_issues` list is empty
   - AND `CODE_MOVED` is `0` — nothing outside the task's own directory changed since the commit the gate judged: no commit, no uncommitted edit, no untracked file
   - AND `DOC_MOVED` is `0` — the task document has not been edited since the gate was committed
   - AND `DOC_STATUS` is not one of `in-progress` / `ready-for-development` / `planned` — a status
     that moved *backwards* from `accepted` means the work was reopened
   - Message: "Task already has clean PASS gate with no concerns, and neither the code nor the
     document has changed since. Re-review not needed."

   **Perform re-review when ANY of:**
   - Gate status is `CONCERNS`, `FAIL`, or `WAIVED`
   - OR `top_issues` has items (even if gate is PASS)
   - OR no gate file exists (first review)
   - OR **anything outside the task's directory changed since the gate's head** — committed, uncommitted or untracked (`CODE_MOVED` > 0)
   - OR **the document changed since the gate was committed** (`DOC_MOVED` = 1)
   - OR **the gate carries no `head:`** (schema 1) — both of the above read `1`
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
   LATEST_QA_NUM=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.qa.*.md" 2>/dev/null | \
                   sed -E 's/.*\.qa\.([0-9]+)\..*/\1/' | \
                   sort -n | tail -1)
   NEXT_QA_NUM=$((${LATEST_QA_NUM:-0} + 1))
   ```

5. **For re-reviews: resolve the scope.**

   The scope decision — default narrowing, the safety carve-out that overrides it, and what each
   changes — is stated once in [`references/qa-re-review-scope.md`](references/qa-re-review-scope.md).
   Read it and apply it; do not restate the trigger here.

   Evaluate `SAFETY_REPROBE` from the prior gate **now**, before Step 3b needs it:

   ```bash
   # Bound in THIS shell: the step-1 block that resolved it is another shell, and an unbound read
   # here reads as "no gate" and leaves SAFETY_REPROBE=false — the carve-out could never fire (task.135 QA cycle 2 probe).
   # Validate the input before deriving from it: unbound, dirname "" is ".", no gate is found, and
   # every signal below silently reads "no prior gate" (task.135 QA cycle 3, CR3-1).
   [ -f "$TASK_FILE" ] || { echo "HALT: TASK_FILE ('$TASK_FILE') is not a file — bind this skill's work-item path in this shell"; exit 1; }
   TASK_DIR=$(dirname "$TASK_FILE")
   # The two-call pattern step 1 uses (task.168, 5c CR-1). qa-cycle.sh exits 1 for "no gate file",
   # for "gate files with no cycle number" and, under --path, for "two files claim one cycle"; only
   # the first is a first review. Its own reason tells them apart, so it is read rather than dropped:
   # the one refusal that means "first review" is let through, every other refusal is a HALT that
   # prints the helper's line (QA cycle 1, CR-3). The selection itself stays the helper's — no glob
   # here duplicates it (task.158).
   if [ -z "${LATEST_GATE:-}" ]; then
     GATE_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" 2>&1); rc=$?
     [ "$rc" -le 1 ] || { echo "HALT: qa-cycle.sh not runnable (rc=$rc) — check the bundled path"; exit 1; }
     if [ "$rc" -eq 0 ]; then
       LATEST_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate); rc=$?
       [ "$rc" -eq 0 ] || { echo "HALT: qa-cycle.sh refused cycle $GATE_CYCLE (see its line above) — resolve the gate files, then re-run"; exit 1; }
     else
       case "$GATE_CYCLE" in
         *"no gate file in"*) : ;;   # a first review — nothing to bind
         *) printf '%s\n' "$GATE_CYCLE"; echo "HALT: qa-cycle.sh could not derive the QA cycle (see its line above) — resolve the gate files, then re-run"; exit 1 ;;
       esac
     fi
   fi
   # $LATEST_GATE is the prior gate file. Trigger clause 1, per the shared rule — whose one
   # definition is the bundled qa-safety-clause1.sh (task.168 CR3-4). It prints true or false; an
   # empty or unreadable gate is false (the status half fails CLOSED), a security block with no
   # evidence: key is true (the evidence half fails OPEN). Step 3b recomputes it from its own shell.
   SAFETY_REPROBE=false
   if [ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
     SAFETY_REPROBE=$(bash .agents/skills/qa-task/references/qa-safety-clause1.sh "$LATEST_GATE") || exit 1
   fi
   echo "SAFETY_REPROBE=$SAFETY_REPROBE (clause 1; clauses 2–3 by judgement below)"
   ```

   Clause 1 is mechanical and shown above. Clauses 2 and 3 are judgement calls made against the
   gate's `top_issues[]` and the task's own Success Criteria — read the shared rule and set
   `SAFETY_REPROBE=true` if either holds.

   Default scoping (when `SAFETY_REPROBE` is false) narrows to files changed since the commit the
   last gate judged — its `head:`:

   ```bash
   git diff --name-only "{gate_head}"..HEAD
   ```

   A gate with no `head:` (schema 1) runs unscoped and says so; Step 3b holds the whole rule.

   Include a **Re-Review Context** section at the top of the new QA report listing each previous
   issue and its current status (FIXED / PARTIAL / NOT FIXED), and a **New Findings This Cycle**
   section — required even when empty, per the shared rule.

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
- [ ] Status is `ready-for-review` (the develop pipeline hands work here at that status) or `in-progress` (a re-review after a FAIL)
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

Adversarially review the change set's **diff** for **correctness bugs** (logic errors, null/async/race, API misuse, broken invariants) and **cleanups** (reuse of existing utilities, simplification, efficiency) — the lens the document-anchored checks above do not provide. Governed by the **Adaptive Review Strategy**: run a single light pass in lite/small/re-review; a full pass otherwise; skip entirely when the diff touches no reviewable code. **One exception, and it overrides the strategy: cycle 2 is always a full refute pass** (step 1 below). A re-review that gets shallower each cycle is how a loop runs five times and learns nothing after the first.

1. **Scope the diff** to this cycle's changes and write it to a patch file (keeps diff bytes out of main context). First review → the whole branch diff. **Cycle 2 (exactly one prior gate) → the whole branch diff again, reviewed to refute** (see the refute directive under step 2). Cycle 3+ → files changed since the commit the last gate judged — its `head:`, never its `updated:` (task.135):

   ```bash
   BASE_REF=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null)   # standalone tasks usually target develop
   BASE="origin/${BASE_REF:-develop}"
   # X's LAST: BSD mktemp (macOS) randomises only a trailing run of X's. With a suffix after them it
   # creates the literal name once and fails on every later run, leaving DIFF_FILE empty (obs #181).
   # GNU reads a trailing suffix as implied --suffix, so Linux CI never saw it.
   DIFF_FILE=$(mktemp "${TMPDIR:-/tmp}/qa-code-review.XXXXXX")
   # How many gates already exist? 0 = first review, 1 = cycle 2, 2+ = cycle 3 and later.
   # $TASK_DIR is an input bound by the agent in this shell; unbound, find reads nothing, PRIOR_GATES is
   # 0 and every cycle silently takes the first-review branch (task.135 QA cycle 3, CR3-3).
   [ -d "$TASK_DIR" ] || { echo "HALT: TASK_DIR ('$TASK_DIR') is not a directory — bind the work item's directory in this shell"; exit 1; }
   PRIOR_GATES=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.*.yml" 2>/dev/null | wc -l | tr -d ' ')   # "0" with no gate — an `ls` glob left this EMPTY under zsh and the -ge below errored (obs #145)
   # The latest gate, bound in THIS shell — Phase 0 binds $LATEST_GATE in its own block, which is
   # another shell, so reading it here unbound made every cycle 3+ run unscoped (task.135 CR-2).
   # Empty on a first review (qa-cycle.sh refuses with no numbered gate); the block below HALTs
   # when two or more gates exist and none could be bound. stderr is kept: qa-cycle.sh names why
   # it refused (two files claiming one cycle), which the HALT below cannot know (CR2-8).
   [ -n "${LATEST_GATE:-}" ] || LATEST_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate)
   # The work item's own directory, which the shared block's uncommitted-fix HALT excludes: the
   # implementation report's updates sit uncommitted there until Step 8 (task.168 CR3-7; QA cycle 2, CR-4).
   WORK_ITEM_DIR="$TASK_DIR"
   # Clause 1 is mechanical: recompute it from the gate bound above rather than trust the value bound
   # for it (task.168 CR3-4). A computed true overrides a bound false; a bound true (clauses 2–3,
   # judgement) still stands, and an unbound value still HALTs below unless this sets it.
   # A script that cannot run is a HALT, not a quiet "false": that would trust the bound value again.
   if [ -n "${LATEST_GATE:-}" ]; then
     CLAUSE_1=$(bash .agents/skills/qa-task/references/qa-safety-clause1.sh "$LATEST_GATE") \
       || { echo "HALT: qa-safety-clause1.sh did not run — check the bundled path"; exit 1; }
     [ "$CLAUSE_1" = true ] && SAFETY_REPROBE=true
   fi
   # The commit the prior gate judged, read from its `head:` field ($LATEST_GATE set in Phase 0) —
   # never from its `updated:`. A typed timestamp in the future made `git log --since` match nothing,
   # one in the past widened the scope, and neither shows in the output (task.135). A schema-1 gate
   # has no head, and reads as empty here. $LATEST_GATE is bound by the caller's own preamble in THIS
   # shell — Phase 0 binds it too, but in another shell (task.135 QA cycle 1, CR-2).
   LAST_GATE_HEAD=$(grep -E '^head:' "$LATEST_GATE" 2>/dev/null | head -1 | sed -E "s/^head:[[:space:]]*//; s/[[:space:]]+#.*$//; s/['\"]//g; s/[[:space:]]*$//")
   # $SAFETY_REPROBE was resolved in Phase 0 step 5 from the prior gate. It is a DISJUNCT on this
   # guard, not a second block in front of it — two places assigning $DIFF_FILE is how one of them
   # silently stops mattering.
   # It is an INPUT to this block, bound by the agent in THIS shell — Phase 0's block is another shell,
   # and clauses 2–3 are judgement calls no block can recompute. Unset, the guard below would read it as
   # "not true" and narrow after a security FAIL, the exact case the carve-out exists for (task.135
   # QA cycle 2, CR2-1). So cycle 3+ refuses to run without it.
   [ "$PRIOR_GATES" -lt 2 ] || case "${SAFETY_REPROBE:-}" in
     true|false) ;;
     *) echo "HALT: SAFETY_REPROBE is '${SAFETY_REPROBE:-}' — bind it in this shell to the true|false Phase 0 step 5 resolved (clause 1 from the gate, clauses 2–3 by judgement)"; exit 1 ;;
   esac
   # Every re-review arm reads committed history — the scoped arm's file list from <head>..HEAD, and
   # every arm's patch from BASE...HEAD — while Phase 0's trigger counts an uncommitted change as
   # movement. A fix still in the working tree would trigger this re-review and then be reviewed as
   # absent, on cycle 2, on the safety re-probe and on a schema-1 gate as much as on the scoped arm
   # (task.168 CR3-7; QA cycle 1, CR-2). $WORK_ITEM_DIR is bound by the caller's preamble and is
   # excluded because the pipeline's own bookkeeping sits uncommitted there when this block runs: the
   # implementation report's updates, deferred to Step 8 (QA cycle 2, CR-4). Unbound, or the
   # repository root, the exclusion below would exclude nothing or everything — refuse both.
   if [ "$PRIOR_GATES" -ge 1 ]; then
     [ -n "${WORK_ITEM_DIR:-}" ] && [ -n "$(git -C "$WORK_ITEM_DIR" rev-parse --show-prefix 2>/dev/null)" ] \
       || { echo "HALT: WORK_ITEM_DIR ('${WORK_ITEM_DIR:-}') is not a work-item directory below the repository root — bind it in this shell"; exit 1; }
     # TRACKED changes HALT. Untracked files only warn: the develop pipeline's Step 4 holds out-of-scope
     # untracked files aside for the PR commit and restores them into the tree for the whole QA loop,
     # so an untracked file outside the work item is the normal state of a healthy branch, not a fix
     # left uncommitted (QA cycle 1, CR-1). .claude/state is the pipeline's own scratch — excluded from
     # both lists: a consumer that tracks .claude/ has the lock rewritten by set-qa-phase.sh just before
     # this block runs, and that is not a fix (QA cycle 2, CR-2).
     DIRTY=$(git status --porcelain --untracked-files=no -- . ":(exclude)$WORK_ITEM_DIR" ":(exclude).claude/state")
     [ -z "$DIRTY" ] || { echo "HALT: uncommitted changes outside the work item — commit the fix before re-review (the scope reads committed history):"; printf '%s\n' "$DIRTY"; exit 1; }
     UNTRACKED=$(git ls-files --others --exclude-standard -- . ":(exclude)$WORK_ITEM_DIR" ":(exclude).claude/state")
     [ -z "$UNTRACKED" ] || { echo "warning: untracked files outside the work item are not in this review — commit any that belong to the fix:"; printf '%s\n' "$UNTRACKED" | sed 's/^/  /'; }
   fi
   if [ "$PRIOR_GATES" -ge 2 ] && [ "$SAFETY_REPROBE" != "true" ]; then   # cycle 3+ — scope to files changed since the last gate's head
     REFUTE_PASS=false
     if [ ! -f "$LATEST_GATE" ] || [ ! -r "$LATEST_GATE" ]; then
       # Two or more gates exist, so an empty or unreadable $LATEST_GATE is a binding failure, not a
       # schema-1 gate. Saying "schema 1" here would record a false cause on every cycle 3+.
       echo "HALT: $PRIOR_GATES gates exist but LATEST_GATE ('$LATEST_GATE') is not a readable file — bind it with qa-cycle.sh --path gate in this shell"; exit 1
     elif [ -z "$LAST_GATE_HEAD" ]; then
       # No head (a schema-1 gate): scoping needs the commit the gate judged, and a timestamp is not
       # one. Run unscoped and say so — never fall back to `--since`.
       echo "Re-review scope: unscoped — prior gate carries no head: (schema 1)"
       git diff "$BASE...HEAD" > "$DIFF_FILE" 2>/dev/null || git diff "origin/develop...HEAD" > "$DIFF_FILE"
     else
       git cat-file -e "${LAST_GATE_HEAD}^{commit}" 2>/dev/null \
         || { echo "HALT: gate $PRIOR_GATES names head $LAST_GATE_HEAD, which this checkout does not have — fetch it, or run this cycle unscoped deliberately"; exit 1; }
       git merge-base --is-ancestor "$LAST_GATE_HEAD" HEAD \
         || { echo "HALT: the head of gate $PRIOR_GATES ($LAST_GATE_HEAD) is not an ancestor of HEAD — the branch was rewritten; re-record the gate's head: or run this cycle unscoped deliberately"; exit 1; }
       # An ARRAY, read line by line, and expanded as "${FILES[@]}". A scalar $FILES expanded bare
       # word-splits under bash and does NOT under zsh: there the whole newline-joined list is one
       # pathspec that matches nothing, git diff writes an empty patch, and the reviewer reviews
       # nothing while reporting clean (obs #76, #110 — task.110 cycle 3). The array form splits
       # the same way in both shells. NUL-delimited, not line-delimited: without -z git C-quotes a
       # non-ASCII, quote or backslash path ("sk\303\251.sh"), and the quoted name then matches
       # nothing as a pathspec — the file silently leaves the scope (task.135 QA cycle 3, CR3-6).
       FILES=()
       while IFS= read -r -d '' f; do [ -n "$f" ] && FILES+=("$f"); done \
         < <(git -c core.quotePath=false diff --name-only -z "$LAST_GATE_HEAD"..HEAD)
       if [ "${#FILES[@]}" -eq 0 ]; then
         echo "HALT: nothing changed since the head of gate $PRIOR_GATES (${LAST_GATE_HEAD:0:12}) — there is no fix to review; check the cycle order"; exit 1
       fi
       # --literal-pathspecs: FILES are file names, not pathspecs. Without it a name beginning with
       # `:` is pathspec magic (`:README.md` matches README.md, `:!x` excludes x) and the file silently
       # leaves the scope (task.168 CR4-2) — the pathspec half of what -z fixed for quoting above.
       git --literal-pathspecs diff "$BASE...HEAD" -- "${FILES[@]}" > "$DIFF_FILE"
       # Non-vacuity: files changed but the scoped patch is empty ⇒ the scoping is wrong, not the
       # code clean. Refuse to dispatch on nothing.
       if [ ! -s "$DIFF_FILE" ]; then
         echo "HALT: ${#FILES[@]} files changed since ${LAST_GATE_HEAD:0:12} but the scoped diff is empty — the pathspec matched nothing, or every one of those files is back to its base content; check before reviewing nothing"; exit 1
       fi
       echo "Re-review scope: files changed since gate $PRIOR_GATES (head ${LAST_GATE_HEAD:0:12}; ${#FILES[@]} files) — default"
     fi
   else                                                             # first review, cycle 2, or safety re-probe — whole branch diff
     [ "$PRIOR_GATES" = "1" ] && REFUTE_PASS=true || REFUTE_PASS=false
     git diff "$BASE...HEAD" > "$DIFF_FILE" 2>/dev/null || git diff "origin/develop...HEAD" > "$DIFF_FILE"
   fi
   ```

   `$TASK_DIR` is the task directory resolved in Phase 0. The narrowing is a cost control, and on
   cycle 2 it costs more than it saves: the files changed since the last gate are exactly cycle 1's
   own fixes, so a narrowed cycle-2 review reads only the repairs and never re-reads the original
   change with what cycle 1 learned. On one observed task, four narrowed re-reviews walked past a
   defect that had been present in the *original* commit and surfaced only at cycle 5.

2. **Dispatch a read-only Explore subagent** with the prompt from `references/code-review-prompt.md` (the single source of truth — pass it verbatim), substituting `<DIFF_FILE>` and `<WORKING_DIR>` (repo root). It returns a `code_review:` YAML findings block. Never read the raw diff into main context. In lite/direct-tools mode use one subagent; for large/high-risk tasks the Adaptive Review Strategy may run it alongside the other parallel agents.

   **Mark the wait on the pipeline lock** beside this dispatch — `bash .agents/skills/qa-task/references/set-waiting-on.sh "5a qa-task code review"` — and clear it (`… set-waiting-on.sh --clear`) as the first action after the `code_review:` block is read (source: `references/set-waiting-on.sh`; task.124 QA cycle 1, CR-3). Inside a `/develop-*` pipeline this skill runs as Step 5a, and a turn yielded while the reviewer runs is a wait the Stop hook would otherwise re-prompt as a stall; standalone there is no lock and both calls are silent no-ops.

   **Cycle 2 only (`REFUTE_PASS=true`) — refute, do not review.** Append this directive to the
   subagent prompt. It is the one pass in the loop performed by an agent that did not write the
   code and is not asked to agree with it:

   ```
   REFUTE PASS. This change set was written by the same pipeline that is now reviewing it, and
   cycle 1's fixes are the least-reviewed code in it. Your job is not to confirm the change works —
   it is to find the claim in it that is FALSE. Start with the fixes from the previous QA cycle:
   a fix is new code, not the closure of a finding.

   For every change that touches emission, subscription, caching or any lifecycle, probe these four
   transitions explicitly — they are the states the original findings never mentioned, and the
   steady-state suite structurally cannot see them:
     • Bulk teardown     — on unmount/disconnect/cleanup, does it emit, persist or announce
                           something it should not?
     • In-flight         — if input arrives WHILE the operation runs, is it applied, queued, or
                           silently dropped?
     • Error path        — when it fails, is state left recoverable, or stranded so retry is
                           impossible?
     • Reconnect         — after a drop and re-establish, does it converge, or resume from stale
                           state?

   Identity rules — for every change to a dedupe, cache or record key, a normaliser or an equality
   predicate, whether or not it touches a lifecycle: find one pair that must be the same and one
   that must differ. A key changed to fix one direction has usually broken the other.

   Resource bounds — for every change that runs a configured command, compiles a caller-supplied
   pattern, or loops over input it does not bound: a timeout must kill the whole process tree, not
   only the `sh -c` it spawned; a matcher must stay linear on a repeated pattern (time it at growing
   N); and the command must not run against a working tree it did not expect. No later cycle
   re-reads code it did not change, so these bounds are probed here or not at all.

   Review the COMBINATION, not only each change: at least one real lifecycle defect of the shape
   above was caused by two earlier fixes that were each correct alone.
   ```

   This costs more than a narrowed cycle-2 pass and is expected to pay for itself, because the
   develop-task pipeline's convergence check ends the loop shortly after cycle 3 when it is not
   converging. The trade is **two deep cycles instead of five shallow ones**.

   **Safety re-probe (`SAFETY_REPROBE=true`) — search the surface, do not re-read the fixes.**
   Resolved in Phase 0 step 5 from the prior gate, per
   [`references/qa-re-review-scope.md`](references/qa-re-review-scope.md). It is
   **independent of `REFUTE_PASS`** — where both apply, append both directives, refute first.
   Append verbatim:

   ```
   SAFETY RE-PROBE. The previous gate failed on a safety axis. Do NOT scope your attention to the
   fixes: they are handled separately by the Re-Review Context table, and re-confirming them is not
   your job. Search the surface again as if for the first time — enumerate the boundary's inputs
   yourself and test them, rather than re-testing the inputs the previous cycle happened to name. A
   fix cycle changes the behaviour of code its own diff never touched, so a defect of the same class
   as the ones just closed is the expected finding, not a surprising one.
   ```

   Why both, rather than one flag: refuting the fixes and re-probing the surface have different
   targets. Collapsing them would make cycle 3+ lose the refute, or cycle 2 lose the re-probe.

   **Check every anchor before the findings go anywhere** (task.194). A reviewer's `file_line` is a
   claim, not a fact: on PR #594 the shared reviewer reported every finding at a patch-file line
   number, and the number was rendered as if it were real. Right after the `code_review:` block is
   read, write it to a JSON file and run the shared checker, from the repository root:

   ```bash
   # The parsed code_review: block as JSON — {"code_review":{…}}. Items 5 and 6 read this same file.
   FINDINGS_JSON=$(mktemp "${TMPDIR:-/tmp}/qa-findings.XXXXXX")
   # A quoted heredoc: line_text quotes source, and source carries ' and $.
   cat > "$FINDINGS_JSON" <<'JSON'
{findings-json}
JSON
   # --rev HEAD: the diff under review is $BASE...HEAD, so uncommitted edits are not what was reviewed.
   command node .agents/skills/qa-task/references/finding-anchors.js \
     --findings-file "$FINDINGS_JSON" --root "$(git rev-parse --show-toplevel)" \
     --rev HEAD --annotate "$FINDINGS_JSON" --json
   # exit 1 = malformed anchors exist. NOT a halt: every finding now carries anchor_check — mark, continue.
   # exit 2 = the call is wrong: usage (the findings file), bad-root (--root is not a directory), or bad-rev
   #   (--rev names no commit here — fetch it).
   #   Fix the call; never treat unchecked anchors as verified.
   ```

   Every finding now carries `anchor_check`. `ok`, `unchecked-text` and `no-line` are clean;
   `no-such-file`, `out-of-range` and `text-mismatch` mean the reviewer named a line that is not the
   one it meant. **A malformed anchor is never dropped**: it renders in `## Code Review` with
   `⚠️ unverified anchor` (item 5), and item 6 never maps it to `top_issues[]` with a location it
   does not have. The checker reports and never repairs — guessing the intended line would hide the
   reviewer defect this exists to show.

3. **Apply the boundary rule — execute, do not only read.** When the reviewer has returned, apply
   `references/probe-boundary-rule.md`: decide whether the change set delivers a **boundary** — a
   function whose purpose is to accept or reject (a classifier, validator, parser, sanitiser, or
   any predicate whose `false` prevents an action). The signals and the
   explicit negative case are stated once, in Step 1b of `references/finalise-dod-security-prompt.md`;
   do not restate them here. **Runnable prose is in scope:** a fenced bash block in a `SKILL.md` or a
   `shared/resources/*.md` that clears, refuses or HALTs on repository state is a boundary under that
   Step 1b's repo-state signal, exactly as a script would be. When no engine form reaches it, record
   `boundary: true` and the zero-guard finding naming the remedy (an extracted script, or task.181's
   `shell-argv:`), never `boundary: false`. QA recorded `false` on task.173's 5c classify block for
   seven cycles, and `/finalise` then raised the same boundary as a DoD gap (obs #298). When the rule fires, the probe engine is the harness — **run it**:
   `node references/security-probe.mjs --sink <sink> --entry '<path>#<export>' --repo-root "$(git rev-parse --show-toplevel)" --record <work-item-dir>/<stem>.qa.<N>.security.run.json --json`
   — or, for a **shell-script** boundary (one positional argument; a script whose header says it
   refuses / never guesses / fails closed is one by its own words), the shell entry form with the
   same flags: `--entry 'shell:<path>' --sink filename`. "It is bash, not JS" is a reason to use
   that form, never a reason to record `boundary: false` (task.121: five gates at
   `probes_executed: 0` against `qa-cycle.sh`). A **sourced library** (a header that says *source
   it*, or functions with no top-level call; the signal is stated once in
   `references/probe-boundary-rule.md` §5) takes the shell-fn form instead:
   `--entry 'shell-fn:<path>#<function>' --sink filename --cases-file <cases.json>`, plus
   `--fake-gh <dir>` when the function's body names `gh` — running `shell:` against a library is
   the task.125 result: sourced, never called, `absent` behind a full count. A **Node CLI** whose
   decision sits behind its flags (task.141: `uat-status.mjs --env`) takes the cli form:
   `--entry 'cli:<path>' --argv '["--flag","{input}"]' --cases-file <cases.json>` — the
   template's one `"{input}"` element is each case, exit status is the verdict, a crash is
   `errored`, and each guarded flag is its own control, named with `--name`; "it takes several flags" is never a reason
   to record `boundary: false`.
   A predicate the engine cannot import because it is **not exported** — a module-private `const` —
   takes the same answer: export it (one word) and probe it. "It is not exported" is never a reason to
   record `boundary: false`; the engine's `entry-not-probeable` detail names the remedy. On task.139
   QA recorded `boundary: false` for five cycles over `isWorkItemDocument`; finalise exported it and
   found a null-byte hole (obs #156).
   It takes the candidates from `references/security-input-corpus.mjs` (`corpusFor(<sink>)`)
   itself, imports the entry point in a sandboxed child — or materialises each case as a fixture
   directory and runs the script against it under bash and zsh — and scores each candidate.
   Report each case in its JSON `cases[]` whose `outcome` differs from what its `direction` requires
   on the existing `code_review` finding shape (`category: bug`, `file_line` = the entry point,
   `finding` naming the input verbatim). Record the total executed as **`probes_executed: N`**
   beside the block, **copied from the run record's `totals.executed`** (the file `--record`
   wrote — equal to `executed` in the engine's JSON), never counted by hand; the gate's
   `nfr_validation.security.evidence` may read `measured` only when that total is positive. An empty
   findings list with `probes_executed: 0` is a review that read the boundary and did not test it,
   which is the defect this item closes. So when `boundary: true` and the run record's
   `totals.executed` is 0, that is a QA finding, not a `reasoned` pass: name the remedy in it — make
   the entry reachable (an export, an entry form that fits), or record that the DoD will need an
   override — because finalise's zero-guard fails the same record. By-hand probes never count toward
   `probes_executed` (obs #212, #231). `boundary: false` is the common case and a legitimate skip — record it in the QA
   report's `## Code Review` section rather than leaving `probes_executed` absent. The record names
   each predicate-shaped function the diff adds and the signal it lacks — a `boundary: false` with no
   candidates named is not a decision (obs #156). The field is three-valued — `true | false | internal`:
   `boundary: internal` is for a validator whose only input is an artefact this pipeline writes and
   that no corpus sink models, recorded with its `internal_reason` in the same section; it is not
   available once a sink fits (`markdown-structure` fits the implementation report, so
   `report-lint.js#lintReport` is probed with `--args-json`, never `internal`). The rule:
   `references/probe-boundary-rule.md` § "`boundary: internal` is a decision, not a verdict". A boundary that is
   read at QA and executed only at the Step 7 DoD probe lands its defect after the gate that should
   have covered it: a 14-star glob compiled to `[^/]*` × 14 passed five green cycles and was found at
   finalise (obs #20).

4. **Platform variance — run the other value.** For every fixture path or environment-derived value
   the diff passes to a **validating** consumer (a function that refuses some inputs — a containment
   check, a path-prefix test, a deny-list), a green run on this machine is evidence about this
   machine. When the value is derived from the environment (`os.tmpdir()`, `$HOME`, `$TMPDIR`, a
   resolved symlink) and the consumer validates it, **run the affected tests once under the other
   value** and record the command and its exit code in the QA report. The reproduction for the common
   case is one line:

   ```bash
   TMPDIR=/tmp node --test 'skills/<skill>/tests/*.test.js'
   ```

   On macOS `os.tmpdir()` resolves under `/var/folders/…`; on Linux CI it is `/tmp`, which
   `resolve-observation-workspace.sh` refuses as ephemeral — a suite that passed here and failed there
   was reasoned "real and correct" from the wrong platform (obs #17). Inherit the environment fact
   from the environment (the `zshAvailable()` precedent in `references/qa-execute-snippets.mjs`), never
   assume the reviewing host is the CI host. The same rule is a mandatory check in
   `references/code-review-prompt.md`, so the reviewer reports the candidate and this step runs it.

5. **Record — always (advisory):** put every finding (bugs + cleanups, with `file:line`) into the QA report `## Code Review` section (Step 11) and the PR comment (Step 13). A finding with a malformed `anchor_check` is recorded too, with `⚠️ unverified anchor ({anchor_check})` after its `file:line`.

5b. **Provenance — is a reproduced finding new to this change?** For every `category: bug` finding
   this step reproduced, run the same input against the PR **base** before it can enter the gate:
   `git show "origin/${BASE}:${file}"` into a scratch copy and execute the reproduction there, and
   where a fixture corpus exists, scan it for the shape. **Check scope before classifying.** When the
   task names this defect class as in scope (its Overview, Motivation or Success Criteria list the
   shape, or it names the residual id), identical output on base means the task is unfinished, not
   that the finding is someone else's: keep it in `top_issues[]`, or route it to the task's
   `## Deferred Work` with the criterion amended (obs #267). Out of scope, **identical output on base
   and zero corpus hits ⇒ `pre-existing`**: record both measurements beside the finding, keep its severity and
   confidence exactly as returned, do **not** enter it in `top_issues[]`, and route it to the gate's
   `recommendations.future` with a named follow-up. This is not a downgrade — nothing about the
   finding changes except its attribution, and both measurements are in the report for the next
   reader. Task.110's cycle 6 had to invent this check to stop re-fixing a defect the branch never
   introduced (obs #116).

5c. **Verification is execution against the committed state — a QA step never leaves a fix in the
   working tree.** A probe or a mutation reverts to what is committed before the next check runs;
   a fix is 5b's (`/qa-fix`), and a gate written over an already-fixed tree records a finding that
   no longer exists while the commit that will be reviewed still carries it. On task.111 the QA
   step applied three fixes it had just verified and then wrote the gate (obs #106). The
   `cp`-snapshot-and-restore rule in `references/mutation-proving.md` is the mechanism; `git status
   --porcelain` must be as it was when this step began, before Step 10 writes the gate.

6. **Gate mapping — resolve blocking, then map:** apply the **canonical resolution** from the **Opt-in to blocking** section of `references/code-review-prompt.md`. It combines a run-level override (from Skill `args`) with the task frontmatter flag; an explicit per-doc `false` is the escape hatch:

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

   `$CODE_REVIEW_BLOCKING_ARG` comes from the `code_review_blocking=` token in Skill `args` (see **Pipeline Skill args**). When `CR_BLOCKING=true`, append each finding that is `category: bug` AND `confidence: high` to the gate `top_issues[]` as `{ id, severity, file, finding, suggested_action, suggested_owner: dev }` — `file` is the path from the finding's own `file:line`, which every code-review finding already carries (Step 10's deterministic rules then decide). **A finding whose `anchor_check` is `no-such-file`, `out-of-range` or `text-mismatch` still maps when it qualifies** — a high-confidence bug is still a bug — but its `finding` gains `(location unverified: {file_line})`, and its `file` is `null` when the verdict is `no-such-file`, so `/qa-fix` is never sent to a line as though it were verified. Otherwise — resolved advisory, or every cleanup or non-high-confidence finding — the gate is **unaffected**.

   **Re-rating a promoted finding.** QA may lower a promoted finding's severity only with a measured
   plausibility check: a corpus count, and whether any writer or template in the repository can
   produce the shape. Record the reviewer's original severity beside the new one, in the gate finding
   and in the QA report. Confidence is never changed. Without the measurement, the returned severity
   stands (obs #236).

7. `rm -f "$DIFF_FILE"`.

**Post-condition — the findings block is in hand.** This step ends when the dispatched reviewer's `code_review:` block is in hand and recorded. A dispatched review that has not returned is **outstanding**, and the pass is not complete: the gate step refuses to write a gate and the PR-comment step refuses to publish one while a review is outstanding. Waiting is bounded by the wall-clock budget in `references/develop-pipeline-autonomous-defaults.md` §Subagents; a reviewer past its budget is recorded as `killed at N minutes` (never `stalled`) and the pass is performed inline per that table, with the independence loss recorded. A reviewer that is **unavailable** (no subagent dispatch in this session) or **failed** (returned nothing usable) is handled by the same table — and **output-file size is not a liveness signal**: a small or stale output file says nothing about whether the reviewer is working. The reason this is written down: task.106's gate 1 (`PASS` 95) was written and posted while its diff review was still running; the review returned a high and a medium minutes later (obs #56).


This keeps the QA→qa-fix loop safe: only a high-confidence correctness bug triggers a fix cycle; cleanups and uncertain findings stay advisory. Under the develop-task pipeline (which sets the run-level override) this *is* the code-review-and-fix loop; standalone, behaviour is unchanged unless the task opts in via frontmatter.

### Step 3c: Mutation-Proof Spot Check

A green suite says the tests ran, not that they can fail. Before crediting a test
as coverage for a defect this cycle fixed, **revert the behaviour it names and
confirm that test goes red** — full procedure, the outcomes table, and the shapes
vacuity takes: [`references/mutation-proving.md`](references/mutation-proving.md).

**Mutate only a tree no other agent is reading.** A mutation makes the tree lie while it is applied.
Run the proofs after the Step 3b diff reviewer has returned, or in a scratch worktree
(`git worktree add --detach "$SCRATCH" HEAD`), never in the working tree a dispatched reviewer is
still reading (obs #266).

**A green suite is also evidence about the platform it ran on, and only that platform.** When the change set passes an environment-derived value (`os.tmpdir()`, `$TMPDIR`, `$HOME`) to a consumer that validates it, the platform-variance check in the diff-review step applies here too: run the affected tests once under the other value (`TMPDIR=/tmp node --test …`) before crediting them as coverage. A suite that is green on macOS and red on Linux CI is not a flake; it is the fixture path failing a containment check it never met locally (obs #17).

Run it as the procedure says, not from memory — the steps below exist because a
QA cycle skipped them and wrote a false finding: **snapshot the file with `cp` and
restore from the snapshot** (never `git checkout --`, which restores committed
state and deletes the uncommitted fix with the mutant); **name the test you expect
to go red before running**; **assert the mutation applied** (a before/after count,
never a silent `|| true` on the edit); **baseline green between mutations**.

Scope it: not every assertion, but **every test guarding a fix made this cycle**,
plus any guard whose failure mode is silence.

Read each result against the outcomes table, not as red/green. A mutation that
reds nothing is a measurement of the tests, and the table's rows tell dead code
from a load-bearing branch no fixture reaches — the same reading, opposite
responses. A mutation that reds a *different* test than predicted is a finding
about the predicted test. A mutation that reds only because of today's corpus, or
only in an ad-hoc assertion that was never committed, is not coverage.

Record one line per proof in the QA report's Code Review section, carrying the
test that went red and the **outcome token** from the table —
`covered` · `wrong-test-red` · `mutation-void` · `no-red-dead` · `no-red-untested`
· `absorbed` · `not-run` · `data-dependent` · `dev-only`:

```markdown
mutation-proven: <what you reverted> → <test that went red> → <outcome>
```

**Only `covered` means covered**, and it means a *committed* test went red. A
criterion whose only evidence is a development-time mutation is `dev-only` — a
different claim from covered, and it must be written differently. A proof that
reached `covered` only after a fixture was added says so. Do **not** write "every
invariant mutation-proven" unless every one was actually reverted; if you proved
four of five, say four of five.

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
- Each standards-named validation command run below, with its result

**Run the validation commands your coding standards name, not only the test runner.** The coding
standards file is loaded on every pipeline run (`devLoadAlwaysFiles`). For each command it lists
under validation (in this repository, `docs/architecture/concepts/coding-standards.md` § *Validation
before commit*) that the test run above does not already execute, run it over the change set and
list it under *Test Commands Executed*. Here that is `npm run validate -- skills/<changed-skill>/`
for each changed skill — the one `npm test` does not cover. A non-zero result is a `category: bug`
finding at `high` confidence, the shape Step 4b failures already take. A named command you did not
run is recorded as **not run, with the reason**; a project whose standards name none records "no
standards-named validation commands". (obs #163: every local gate green, CI's `validate` job red on
an angle bracket in a `description`.)

### Step 4b: Execute the Documented Commands

Applies only when this work item's deliverable is **runnable prose** — the diff adds or modifies a
`SKILL.md` or a `shared/resources/*.md` prompt containing at least one fenced ```bash block. The full
rule, including why the safety boundary is an allow-list rather than a deny-list, is stated once in
`references/qa-runnable-prose-detection.md`. Read it before changing anything here.

When the rule does not fire, record `Step 4b: not applicable — no runnable prose in the change set` in
the QA report's Review Methodology and move on. The step is cheap where it does not apply.

**What a green Step 4b does not prove.** The engine executes each block **from disk**. The harness
renders an invoked `SKILL.md` before the agent sees it — a dollar-digit positional token inside a
fenced block is substituted with an invocation argument — so the block an agent runs can differ from
the block this step ran, and this step cannot see that. Delivery-time corruption of that class is
prevented upstream by `tests/fenced-bash-positional-params.test.js`, not detected here; do not read
a clean Step 4b as covering what the harness delivers. (create-skill § *Runnable prose*.)

When it does fire, run the engine over each changed in-scope file:

```bash
node references/qa-execute-snippets.mjs --file "$SKILL_FILE" --json
```

Bind any caller values the documented snippets expect with repeated `--bind NAME=VALUE`, and seed the
temp working directory from a real directory with `--copy <dir>` so the blocks see real data rather than
an empty tree. Execution always happens in that temp copy — never the live tree.

`--copy <dir>` places the directory's **contents** at the temp root. When a block addresses a path —
`find docs/tasks …` in the `sync-github-*` discovery blocks — seed it at that path instead with
`--copy-as docs:docs` (`SRC:DEST`, repeatable; `DEST` must be relative, stay inside the temp copy and
not exist yet — it seeds a fresh path and never merges).
A block that fails only because it was seeded at the wrong path is a harness finding, not a prose
finding (obs #143).

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

> **A run where zero blocks executed is never a pass — but it is two states, and the engine tells them
> apart for you.** Report whichever it emits; do not suppress either, and do not convert one into the
> other to quiet the report.
>
> - **`zero-blocks-executed`** (finding, `medium`) — fired when `placeholder > 0`. The run was
>   under-configured; `--bind` / `--copy` is the fix and the detail says so.
> - **`no-executable-blocks`** (information, in `notes[]`, exit `0`) — fired when `placeholder === 0`
>   and every block was refused as `mutating`. This file documents `gh` / `curl` / `rm` / write
>   redirections because that is what the skill *does*, and those are deny-listed by design. **No
>   configuration will ever make them runnable**, so there is nothing to act on. Record it and continue.
>
> An over-broad classification that skips everything is the silent-skip shape this step was built to
> eliminate, and it would be easy to reintroduce here — which is why the second case is still
> **recorded**, with a per-reason refusal breakdown, rather than dropped. Equally, reporting it as a
> finding is how the check became noise on six of ten skills surveyed: an ignored check is a check that
> does not exist (`bug.7`).
>
> `zsh` being absent is **not** either case — it never reduces the runnable count. Record it as
> information and continue.

**Lite mode**: the step still runs, but only over blocks in the changed file.

### Step 5: Verify Success Criteria

For each success criterion, compare target vs actual:

**Classify each success criterion the way finalise will, then verify it from evidence, never from its
checkbox.** Finalise's AC agent (`finalise-dod-ac-prompt.md` Step 3, in the `finalise` skill) sorts
every criterion into a behaviour criterion, which needs a committed test that runs per PR, or one of
the test-free kinds Step 3 lists; that step owns the list. A criterion a named test holds cites the
test. A criterion no test holds is verified by reading the code it describes: cite the `file:line`
that makes it true, not the developer's checkbox or the implementation report's say-so, or mark it
**unverified** (a measured criterion cites its committed measurement and command, as Step 3 asks).
Performance and structural criteria ("defined once", "one pass", "offline") are the usual case,
because no test carries them (obs #210). A behaviour criterion whose only evidence is a hand run,
with no committed per-PR test, is a **MEDIUM** finding in `top_issues[]`, so it enters the fix loop
rather than halting at finalise (obs #224).

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
- **Security**: Review for security issues; check dependencies; validate auth/authorization preserved.
  Record **how** the verdict was reached in `nfr_validation.security.evidence` — `measured` only
  when hostile candidates were actually executed (and then `probes_executed` must be > 0),
  otherwise `reasoned`. A verdict reached by reading is `reasoned`, which is accurate rather than a
  failing grade. Values, the placement constraint and the fail-open rule for a missing key:
  [`references/qa-gate-security-evidence.md`](references/qa-gate-security-evidence.md).
  `/review-security` emits a liftable block carrying the same key names — consuming it is optional;
  this skill owns the field
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

> **Precondition — no dispatched review is outstanding.** Do not write a gate while a code review dispatched in this cycle has not returned its `code_review:` block. The gate is a verdict on all the evidence, and a review still running is evidence not yet in hand — a `PASS` written now can be contradicted minutes later by the reviewer it did not wait for (task.106, obs #56). If the diff-review step reports the review as outstanding, wait against its wall-clock budget or resolve it per `references/develop-pipeline-autonomous-defaults.md` §Subagents **before** this step; never write around it. **That is the only wait.** A pending, cancelled or unavailable CI run on the PR is **not** a precondition of this step: CI is gated once, on the final commit, at `/finalise`, and no QA cycle waits on CI before then. If the latest CI state is to hand, record it as `evidence.ci` (informational — for example `pending @ {sha}`); never hold the gate for it.

> **`top_issues[]` holds THIS cycle's findings only.** Do not copy a previous cycle's entries
> forward, even annotated `status: closed`, and even though carrying the history reads as helpful.
> The develop pipeline's **third-strike rule** reads the `file:` of every HIGH entry across the last
> three gates and deliberately ignores `status: closed`, so a copied-forward HIGH makes one finding
> look like a file struck twice — and a third cycle then refuses to let `/qa-fix` patch a file that
> was never the problem. The history belongs in `bug_resolution`, in the QA report's Re-Review
> Context table, and in the bug reports.

Create gate file co-located with the task document:

**Location**: `{task-directory}/task.{id}.gate.{number}.{descriptive-name}.yml`

**Bind the head and the clock before writing the YAML** — both are read, never typed (task.135):

```bash
GATE_HEAD=$(git rev-parse HEAD)                  # the commit this review judged — the next cycle scopes from it
GATE_UPDATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)      # UTC, from the clock
```

This skill makes no commit between the review and this write, so `HEAD` here is the tree the review read.
Substitute both values into the YAML. A gate whose `updated:` was typed rather than read from the
clock is the defect task.135 removed: on task.130 four gates carried local time with a `Z` suffix,
up to three hours in the future, and the next cycle's `git log --since` scope matched nothing.
`head:` is the commit **reviewed**, not the commit the gate is committed in — the gate lands in a
later commit. The repository's gate-head freshness test fails a `schema: 2` gate whose
`head:` is not a full SHA, whose `updated:` is not a `date -u` timestamp, or whose `updated:`
precedes the head's author time when the head resolves. Existence and ancestry are checked by the
Step 3b scope block at the next cycle and by the 5c conformance lens, while the branch is intact.

**Gate YAML Schema:**

```yaml
schema: 2
task: 'task.{id}.{name}'
task_title: '{task title}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: '1-2 sentence explanation of gate decision'
reviewer: 'QA Engineer'
head: '{GATE_HEAD}'        # 40-hex — git rev-parse HEAD when the review was performed
updated: '{GATE_UPDATED}'  # date -u +%Y-%m-%dT%H:%M:%SZ at write time — never typed

top_issues: [] # Empty if no issues; otherwise a list of entries shaped:
  # - id: '{PREFIX-###}'
  #   severity: low|medium|high
  #   file: '{repo-relative path the finding is IN}'   # REQUIRED — see note below
  #   finding: '{what is wrong}'
  #   suggested_action: '{the fix}'
  #   suggested_owner: dev|sm|po
  #   status: open|closed         # set closed when a later cycle resolves it
  #   fixed_date: '{YYYY-MM-DD}'  # with status: closed

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
    # `evidence:` goes BELOW `status:`, never between `security:` and `status:` —
    # the re-review probe reads the first `status:` after `security:` and fails
    # closed and silently if a key reaches that slot first. Values and the
    # probes_executed rule: references/qa-gate-security-evidence.md
    evidence: measured|reasoned|unverified
    probes_executed: 0 # REQUIRED when evidence: measured; `measured` with 0 is a schema error
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

> **`file:` is required on every `top_issues[]` entry**, and it must be a repo-relative path that
> appears in the change set — not a description, not a module name, not `unknown`. The develop-task
> pipeline's **third-strike rule** reads it to detect a file that HIGH findings keep circling across
> cycles, and the rule works only because `file:` is checkable against the diff. A finding that
> genuinely spans several files names the one a fix would edit first. If a finding truly has no
> file (a missing artifact, a process gap), write the path it *should* exist at.

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

````markdown
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

**A reviewer time written here is measured, not recalled** — dispatch and return from `date -u`, a
duration from the completion notice's `duration_ms`, or `(not measured)`. The rule:
[`references/develop-pipeline-autonomous-defaults.md`](references/develop-pipeline-autonomous-defaults.md#subagents--unavailable-failed-slow) §Subagents (obs #230).

**Re-reviews only — record the scope decision as one line**, per
[`references/qa-re-review-scope.md`](references/qa-re-review-scope.md):

```
Re-review scope: unscoped (prior gate failed on security)
Re-review scope: files changed since gate {N} (head {12-hex}; {k} files) — default
Re-review scope: unscoped — prior gate carries no head: (schema 1)
```

Naming the scope is what makes a quiet cycle auditable. Without it, "we found nothing" and "we did
not look" are the same sentence.

---

## New Findings This Cycle

_Re-reviews only. **Required even when empty** — `None` is an answer; an absent section is
indistinguishable from a cycle that never asked the question. The Re-Review Context table above
answers "were the previous findings fixed?"; this section answers "what else is there?"._

[for each new finding not present in the previous review:]

- **[{severity}]** `{file}:{line}` — {finding} → {suggested_action}

On an **unscoped** re-review reporting zero new findings, state what was searched — a bare `None` is
a defect in the report, not a clean result:

```markdown
None. Searched unscoped (prior gate: security FAIL): full `origin/develop...HEAD` diff, {N} files.
Re-enumerated {the boundary's inputs, named} and tested each against the current implementation.
```

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

- **Status**: PASS/CONCERNS/FAIL
- **Evidence**: measured/reasoned/unverified — **how** the verdict was reached. `measured` only when
  hostile candidates were actually executed, and then **Probes executed** must be > 0; a verdict
  reached by reading is `reasoned`, which is accurate rather than a failing grade. Values and the
  placement constraint: [`references/qa-gate-security-evidence.md`](references/qa-gate-security-evidence.md)
- **Probes executed**: {count — required when Evidence is `measured`}
- {Criteria evaluated, findings, recommendations}

### Maintainability — PASS/CONCERNS/FAIL
{Criteria evaluated, findings, recommendations}

---

## Code Review

{From Step 3b — advisory unless the doc opted in via `code_review_blocking: true`. Omit the section if the diff had no reviewable code.}

**Correctness bugs ({count}):**
{for each bug finding:}
- [{severity}/{confidence}] `{file_line}`{ ⚠️ unverified anchor ({anchor_check}) — only when malformed} — {finding} → {suggested_action}

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
````

**Check the report's links before leaving this step.** CI's `docs-link-check` reads every changed
`docs/**/*.md` — a QA report as much as the document beside it — and a quoted finding that contains a
bracket-paren shape renders as a live link (task.139 run 2 went red on two QA reports; task.152,
obs #155). The engine resolves against the git index, so a sibling this run wrote reads as dead
until it is staged — stage first:

```bash
git add "{task-directory}/task.{id}.qa.{number}.{name}.md" "{task-directory}/task.{id}.gate.{number}.{name}.yml"
node .agents/skills/qa-task/references/doc-links.js --file "{task-directory}/task.{id}.qa.{number}.{name}.md"
```

Exit 1 → fix the quotation (put it in a fence, or break the `[..](..)` shape so it no longer reads
as a link) and re-run until it exits 0. Exit 2 is a usage error: fix the call. `git add` only
stages — the pipeline commits these files next anyway, and staging is reversible.

### Step 12: Update Task File

**Replace the whole `## QA Testing Results` section from the gate just written — never patch it
line by line.** On a re-review the section already exists; editing the fields that changed leaves
the ones that did not look current. On task.110 the `NFR Status` line stayed at cycle 1's values
through four cycles while the gate's `nfr_validation.*.status` moved (obs #92). Render the section
from `$THIS_GATE` in full, then check it mechanically: every NFR status in the rendered section
equals the gate's `nfr_validation.<axis>.status`, or the step halts before writing.

Add (or replace) the QA Results section in the task document:

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

**Write the section through the engine — one call, never a hand edit.** Save the rendered section
to `.claude/state/qa-results-section.md`, then:

```bash
# QA Testing Results writer (task 155) — replaces, relocates or creates the one section.
[ -f "$TASK_FILE" ] || { echo "HALT: TASK_FILE ('$TASK_FILE') is not a file — bind this skill's work-item path in this shell"; exit 1; }
command node -e '
  const fs = require("fs");
  const QR = require("./.agents/skills/qa-task/references/qa-results.js");
  const [file, sectionFile, docType] = process.argv.slice(1);
  const r = QR.upsertQaResults(fs.readFileSync(file, "utf8"),
                               fs.readFileSync(sectionFile, "utf8"), { docType });
  if (!["replaced", "relocated", "created"].includes(r.reason)) {
    console.error(`HALT qa-results: ${r.reason}${r.detail ? ` (${r.detail})` : ""} — ${file} not written.` +
      (r.reason === "multiple" ? " Keep the copy whose Gate File link names the highest gate, delete the others by hand, re-run." :
       r.reason === "unbounded" ? " The existing section cannot be bounded: it opens a fence that never closes, or the text a replace would remove holds a change-log marker, an H1/H2 (setext included), a Change Log heading (a fenced `# comment` counts) or, under a change log, a dated log row. The detail names the line. Fix that section by hand, re-run." :
       r.reason === "bad-section" ? " The rendered section was refused; the detail names the rule. Fix the render (one section, no own Bug Reports or Deferred Work block, no trailing HTML comment), re-run." :
       r.reason === "unplaceable" ? " The write would not read back as exactly one section (an unclosed fence near the insertion point?). Fix by hand, re-run." : ""));
    process.exit(1);
  }
  fs.writeFileSync(file, r.content);
  fs.unlinkSync(sectionFile); // consumed: a stale copy must not feed the next cycle
  console.log(`qa-results: ${r.reason}`);
' "$TASK_FILE" .claude/state/qa-results-section.md task
```

The engine is `references/qa-results.js`. It places a new section immediately before the
change-log block (else before `## Progress Tracking`, else at the end), moves one it finds
**inside** the change-log block out of it (`relocated`), and **refuses** a document that already
carries more than one (`multiple`) — it never guesses which copy is current. It also refuses a
section it cannot bound (`unbounded`: an unclosed fence, or removed text that carries a change-log
marker, an H1/H2 or a Change Log heading — scanned ignoring fences, so a fenced `# comment` counts) and a write that would not read back as one
section (`unplaceable`). On any refusal the step halts; a hand edit is not a fallback. A `### Bug Reports`
list (`create-bug-report`) or `### Deferred Work` block (the pipeline's loop exit) already inside the
section is carried through the replace; the rendered section must not include either — a render
that does is refused as `bad-section`. Write the section **before** the Change Log row below,
so the change-log write sees a relocated section already outside its block. A hand-rolled
`slice(indexOf(…), indexOf("## Change Log"))` stacked four copies on task.145 (obs #178).

**Update task status based on gate decision** — the same rule `qa-story` states, and the only
vocabulary the lifecycle admits:

- PASS, CONCERNS or WAIVED → Status stays `ready-for-review` (with the gate's notes in the QA
  Results section). The task is handed **back** toward `finalise`, which is the only writer of
  `accepted`, and only after the DoD check.
- FAIL → Status: `in-progress` (requires fixes before re-review)

> ⚠️ **Never write `Completed`, `Ready for Done` or `Reopened`.** None is in the canonical set in
> [`document-status-lifecycle.md`](references/document-status-lifecycle.md) — `draft`, `planned`,
> `ready-for-development`, `in-progress`, `ready-for-review`, `accepted`, `cancelled` — and a
> consumer repo that lints its status vocabulary goes red on any of them. This table read
> `"Completed"` until 2026-09-22; inside the develop pipeline every orchestrator had to notice the
> conflict with `qa-fix`'s Status Rule and leave the status alone (obs #153, task.136).
> `skills/qa-task/tests/status-vocabulary.test.js` fails on a return of the old wording.

**Append the verdict row to `## Change Log`** — in the same edit as the QA Results section and the
status update, bumping frontmatter `updated`:

```markdown
| 2026-05-14 |  | QA gate CONCERNS (6/10) — 2 findings | qa-task |
```

One row per QA cycle. `Version` stays blank — only `/finalise` bumps it. Set `updated:` with
`change-log.js`'s `bumpUpdated(content, <row date>)`, never by hand — Step 12b reads it back.
Name the decision, the score and the finding count; the detail lives in the QA report the row links to. A clean cycle
still writes a row — the verdict is the event, not the findings. If the task predates the Change
Log template and has no such section, create it after `## 11. Rollback Plan` with the four
canonical columns. Canonical format:
[document-change-log.md](references/document-change-log.md).

**Never write the gate `.yml` from here** — it belongs to `qa-gate` alone, and `qa-gate` never
touches the document. See [`docs/reference/anti-patterns.md`](../../docs/reference/anti-patterns.md).

### Step 12b: Read the claims back

Step 12 wrote two claims into the task document — links to the report and gate, and a Change Log
row paired with `updated:` — and nothing read them back. **Run this after the edit, before
Step 13**: a check that runs before the claim is written cannot check it.

```bash
# From the repository root. {task-file} is the task document this QA run just edited — substitute it; the script
# refuses an unsubstituted placeholder (exit 2), so a block run as delivered
# cannot pass by reading nothing.
command node .agents/skills/qa-task/references/qa-read-back.js --doc "{task-file}"
```

`qa-read-back.js` is the read-back, defined once for both QA skills and tested directly
(`references/tests/qa-read-back.test.mjs`). It **decides**: exit 0 is clean, exit 1 is a
Step 12b HALT with each problem and its remedy printed, and exit 2 is "could not look" (bad
arguments, an unreadable document, a sibling engine that did not load). Exit 2 is never a pass. It
checks four things:

1. **The claims exist.** This cycle's gate and QA report are in the work item's directory, the
   document links **those two files** — not an earlier cycle's (task.158) — and it has a Change Log
   row. An absent one halts, named.
2. **What this run wrote is staged.** The link check reads the index, so the script stages the
   document, gate and report, plus every linked target that is **`untracked`** and a regular file
   under the work item's own directory. A `git add` that fails halts. An untracked target elsewhere
   is left alone and reported, so unrelated work never rides into the QA commit.
3. **Every link resolves against the index.** It uses `doc-links.js`, where **`missing`** means
   never written, or a case-mismatched name that only a case-insensitive disk found. **`ignored`**
   means gitignored, so it can never be committed. **`outside-repo`** and **`unverifiable`** also
   halt.
4. **`updated:` accounts for the newest row** (`change-log.js` `checkUpdatedCoherence`). When it
   does not, apply `bumpUpdated(content, <that row's date>)` and re-run.

**Do not post the PR comment (Step 13) over exit 1 or 2.** Posting over it reproduces task.141: a PR comment linked
a report that did not exist, found only by CI's `link-check`, and a row was dated after `updated:`,
found only by CI's `work-item-artifact-naming` §5. The read-back was a fenced block in both skills
for three QA cycles, and each cycle found a new gap in it (task.149 BUG-2, -3, -5, -6, -7). One
script replaced the two copies. (obs #164)

### Step 13: Post PR Comment — Best-effort, non-blocking

> **Precondition — no dispatched review is outstanding.** Do not publish a gate the gate step could not have written: if a code review dispatched in this cycle is still running, the gate does not exist yet and there is nothing to post. A gate published before its review returns is read as final by everyone downstream — the PR, the tracker card, the finalise DoD — and is not retracted when the review lands (task.106, obs #56).

**PR-comment authorship contract**:

| Skill | Owns |
|---|---|
| `qa-task` | Per-cycle gate decision (best-effort, non-blocking) |
| `qa-fix` | Per-cycle fix summary (best-effort, non-blocking) |
| `finalise` | Canonical summary — PR + final gate + QA cycle count + DoD path + accepted status (idempotent via marker) |

**This step is best-effort.** If the comment cannot be posted (network error, auth issue), log the failure and continue — do not halt. The final canonical summary is posted by `/finalise` at pipeline end.

Use the PR metadata stored in the Prerequisites step.

**Resolve the platform first.** Source the resolver with `source references/resolve-platform.sh || exit 1` — guarded, because that file also validates the platform and access keys and returns non-zero on an unrecognised value. It sets `VCS` (which this step branches on) and provides `tracker_call_with_retry` (3× exponential backoff — handles transient GitHub/Anthropic API failures). On Bitbucket, derive the REST coordinates and resolve the credential — the same Step 0.5 preamble `create-pr` uses:

```bash
source references/resolve-platform.sh || exit 1
# VCS = github | bitbucket; TRACKER = jira | github

if [ "$VCS" = "bitbucket" ]; then
  # Two sed passes, not one lazy-quantified capture — `[^/]+?` is a GNU
  # extension that BSD sed rejects.
  BB_PATH=$(git remote get-url origin | sed -E 's|.*bitbucket\.org[:/]||; s|\.git$||')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"
  # Sets BB_CURL_AUTH (curl args) and BB_AUTH_SCHEME; non-zero when neither an
  # access token (Bearer) nor username + API token (Basic) is set.
  source references/bitbucket-auth.sh || exit 1
fi
```

**Write the body to a file, then post it.** Always `--body-file`, never an inline `--body`: the body below carries backticks, `$(…)` and newlines, and an inline string invites the shell to evaluate them before `gh` ever sees them. The file is also what the Bitbucket arm reads.

```bash
# Step 12b's rule, re-checked here: every block runs as its own shell, and a run that
# batches 12b and 13 drops the prose between them (obs #226).
command node .agents/skills/qa-task/references/qa-read-back.js --doc "{task-file}" >/dev/null || { echo "HALT: read-back not clean — not posting"; exit 1; }
mkdir -p .claude/state
BODY_FILE=.claude/state/qa-comment-body.md
cat > "$BODY_FILE" <<'EOF'
## QA Review: {GATE_DECISION}

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
EOF

# The plain-language lead, obtained ONCE and folded into $BODY_FILE — ABOVE the
# arm split below, so the GitHub and Bitbucket arms post the same bytes and
# cannot drift. `qa-gate-{N}` is the same stage the tracker comment for this
# moment uses; a pull-request comment about a moment that also exists on the
# tracker reuses that stage rather than inventing a second vocabulary.
#
# GATE_DECISION is bound HERE, deliberately. The heredoc above is quoted
# (`<<'EOF'`), so its [GATE_DECISION] placeholder is filled in textually when
# the body is written — it never becomes a shell variable. Set this to the same
# verdict you wrote into the body: PASS, CONCERNS, FAIL or WAIVED.
GATE_DECISION="{PASS|CONCERNS|FAIL|WAIVED — the same verdict written into the body above}"

# The verdict is MAPPED, never passed through: `CONCERNS` tells an outside reader
# nothing about whether to worry. Pass the raw token and let the catalogue map
# it — an unknown verdict renders "the results are recorded below" rather than
# defaulting to reassurance.
# The QA cycle number lives in the gate filename this run just wrote — the
# highest-numbered `*.gate.{N}.*.yml` in the directory. It is the STAGE SUFFIX
# (`qa-gate-3`), which is what keys the tracker comment's idempotency marker:
# bare `qa-gate` was suppressed by cycle 1's marker on every later cycle
# (task.121). ONE definition — the bundled `qa-cycle.sh` — called in EVERY block
# that needs the cycle: each fenced block runs as its own shell, so a value
# derived in this block does not exist in Step 13b's (TASK-121-BUG-2). The helper
# refuses rather than guesses: no numbered gate → empty stdout, one ⚠️ line on
# stderr, exit 1. A guessed `1` would key every cycle to cycle 1's marker, the
# very suppression this suffix exists to end. The lead below renders the same
# sentence with or without the suffix; passing it keeps this call textually
# identical to the tracker call so one guard covers both — and when the cycle
# is unknown the pull-request comment still posts, without the lead, because it
# carries no marker and losing it would hide the ⚠️ from the reviewer.
# Every path in this block resolves from the REPOSITORY ROOT — `.claude/state/…`
# above, and `.agents/skills/qa-task/references/…` for the helper and the lead
# CLI here — one cwd per block, the same cwd in every block (TASK-121-BUG-4,
# BUG-6). What a block inherits from earlier blocks is the INPUTS an agent
# re-binds when it runs the block ($TASK_DIR, $GATE_DECISION, $BODY_FILE,
# $PR_URL); a COMPUTED value like the cycle never is.
QA_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR"); rc=$?
# rc 1 = the helper REFUSED (no numbered gate) → empty, the skip branch below.
# Anything else (127 not found, 126 not runnable) is a broken invocation, and
# it must not wear a refusal's clothes — that is how BUG-4 hid for a cycle.
[ "$rc" -le 1 ] || { echo "⚠️  qa-cycle.sh not runnable (rc=$rc) — check the path" >&2; exit 1; }
if [ -n "$QA_CYCLE" ]; then
  LEAD=$(node .agents/skills/qa-task/references/stakeholder-summary-cli.js --stage "qa-gate-${QA_CYCLE}" \
    --slot verdict="$GATE_DECISION") || exit 1
  printf '%s\n\n---\n\n%s\n' "$LEAD" "$(cat "$BODY_FILE")" > "${BODY_FILE}.tmp" \
    && mv "${BODY_FILE}.tmp" "$BODY_FILE"
else
  echo "⚠️  QA cycle unknown (see qa-cycle.sh above) — posting the PR comment without its lead"
fi

if [ "$VCS" = "github" ]; then
  tracker_call_with_retry gh pr comment "$PR_URL" --body-file "$BODY_FILE"
  COMMENT_RC=$?
elif [ "$VCS" = "bitbucket" ]; then
  BB_COMMENT_PAYLOAD=$(jq -n --arg raw "$(cat "$BODY_FILE")" '{content: {raw: $raw}}')
  curl -sf -X POST \
    "${BB_CURL_AUTH[@]}" \
    -H "Content-Type: application/json" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
    -d "$BB_COMMENT_PAYLOAD" >/dev/null
  COMMENT_RC=$?
fi

if [ "$COMMENT_RC" -ne 0 ]; then
  echo "⚠️ PR comment failed — non-blocking. Final canonical summary will be posted by /finalise."
fi
```

**The two arms are not symmetric on retry, deliberately.** `tracker_call_with_retry` wraps `gh`
only, so the GitHub arm retries 3× with exponential backoff and the **Bitbucket arm is single-shot**
— the same asymmetry `qa-fix` ships and states. A Bitbucket failure logs and continues. This is
acceptable here for the same reason the whole step is best-effort: the QA report and gate file are
committed to git and are the durable record; this comment is convenience. A
`bitbucket_call_with_retry` helper would close the gap across every Bitbucket call site in the repo
and is worth its own task — do not smuggle one in here.

**This comment is per-cycle and deliberately not idempotent.** Each QA cycle posts its own decision,
so the PR carries the history. Do **not** import `finalise`'s marker/update logic: `finalise` owns
the single canonical summary at pipeline end, and this step owns the running commentary. Only the
Bitbucket *transport* is borrowed from it.

### Step 13b: Comment on Tracker Issue (graceful — non-blocking)

Branch on the tracker resolved by `source references/resolve-platform.sh || exit 1` (which sets `TRACKER=github|jira`). Keep the `|| exit 1` — the resolver returns non-zero on an unrecognised `tracker:`, `vcs:` or `access:` value, and sourcing it bare would continue past the rejection with a default.

**One call, both trackers.** `tracker-comment.js` resolves `TRACKER` itself, so the issue identifier
is the only thing that differs between the two arms. Resolve it, then make the single call:

```bash
if [ "$TRACKER" = "jira" ]; then
  QA_ISSUE=$(grep -E '^jira_key:' "$TASK_FILE" | head -1 | sed -E 's/jira_key:[[:space:]]*//' | tr -d '"'"'"' ')
  [ "$QA_ISSUE" = "null" ] && QA_ISSUE=""
else
  QA_ISSUE="$GITHUB_ISSUE_QA"
fi
```

If `QA_ISSUE` is empty, skip this step silently — the task has no linked tracker issue.

```bash
if [ -n "$QA_ISSUE" ]; then
  mkdir -p .claude/state
  printf 'QA %s (%s/100) — PR #%s: %s\n' \
    "$GATE_DECISION" "$score" "$PR_NUMBER" "$PR_URL" > .claude/state/comment-body.md

  # The cycle — the stage suffix — is derived HERE, in this block, by the same
  # helper Step 13 called. This block runs as its own shell, so Step 13's
  # $QA_CYCLE does not exist here (TASK-121-BUG-2). No fallback: a comment keyed
  # to a guessed cycle is the suppression this suffix exists to end, so an
  # unknown cycle skips the post and says so.
  #
  # Addressed from the REPOSITORY ROOT — `.agents/skills/qa-task/references/…` —
  # like the engine call below and like every block in this skill: one cwd,
  # the repository root, everywhere (TASK-121-BUG-4, BUG-6). What this
  # block inherits from earlier blocks is the INPUTS an agent re-binds when it
  # runs a block ($TASK_DIR, $QA_ISSUE, $GATE_DECISION, $score, $PR_NUMBER,
  # $PR_URL); a COMPUTED value like the cycle is never carried over.
  QA_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR"); rc=$?
  # rc 1 = the helper REFUSED (no numbered gate) → empty, the skip branch below.
  # Anything else (127 not found, 126 not runnable) is a broken invocation, and
  # it must not wear a refusal's clothes — that is how BUG-4 hid for a cycle.
  [ "$rc" -le 1 ] || { echo "⚠️  qa-cycle.sh not runnable (rc=$rc) — check the path" >&2; exit 1; }

  # blocking_count — the high-severity entries in the gate this run just wrote:
  # the gate that CARRIES the cycle number above, so the count and the suffix
  # cannot name different rounds. Re-resolve rather than reusing LATEST_GATE
  # from Step 2: that one names the PREVIOUS run's gate (read to decide whether
  # to re-review), and this run has written a newer one since.
  # The file from the same helper (task.158): the name-glob lookup it replaced missed a
  # zero-padded gate.02 and read BLOCKING_COUNT 0 on a gate with a HIGH entry. A cycle no ONE
  # file carries (two claim it) stops here — an empty THIS_GATE would post "nothing blocking".
  THIS_GATE=""
  if [ -n "$QA_CYCLE" ]; then
    THIS_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate); rc=$?
    [ "$rc" -eq 0 ] || { echo "⚠️  qa-cycle.sh --path gate refused cycle $QA_CYCLE (rc=$rc) — resolve the gate files named above" >&2; exit 1; }
  fi
  # `|| true`, NOT `|| echo 0`. `grep -c` PRINTS "0" and EXITS 1 when it matches
  # nothing, so `|| echo 0` appends a second zero and the variable becomes the
  # two-line string "0\n0" — which the engine's numeric coercion then reads as
  # NaN and drops. The slot would vanish on exactly the clean gates where saying
  # "no blocking issues" matters most, and nothing would report it.
  BLOCKING_COUNT=$(grep -c '^ *severity: high' "$THIS_GATE" 2>/dev/null || true)
  BLOCKING_COUNT=${BLOCKING_COUNT:-0}

  if [ -n "$QA_CYCLE" ]; then
    node .agents/skills/qa-task/references/tracker-comment.js \
      --issue "$QA_ISSUE" --body-file .claude/state/comment-body.md \
      --stage "qa-gate-${QA_CYCLE}" \
      --slot verdict="$GATE_DECISION" \
      --slot blocking_count="$BLOCKING_COUNT" \
      --json \
      || echo "⚠️  Tracker issue comment failed — continuing"
  else
    echo "⚠️  Tracker issue comment skipped — QA cycle unknown (see qa-cycle.sh above)"
  fi
fi
```

> **This replaced a bare `gh issue comment` on the GitHub arm** — unmarked, so a resumed QA cycle
> posted a second copy, `gh`-only, so a Jira consumer never saw it, and after task.104 it would have
> been one of the last tracker comments in the pipeline with no plain-language lead. Collapsing the
> arms is what makes the same QA outcome read the same way on either tracker.
>
> **It also gave up the `tracker_call_with_retry` 3× backoff.** The engine owns the `ACCESS_TRACKER`
> deferral gate but has no retry of its own, and re-wrapping it would double-defer — so the retry is
> genuinely given up, and `|| echo … continuing` stands in its place, matching `review-task`.
>
> **`qa-gate` reads `verdict` and `blocking_count` — not `pr`.** `pr` is a real slot name on
> `in-review` and `done`, which is what makes it look right here; this template never reads it and the
> engine validates no slot names, so it would be silently dropped. The PR stays in the body.
>
> **`verdict` takes the raw gate token deliberately** — it is the one slot the engine *maps* rather
> than prints. The score stays out of the lead: a number on an unexplained scale is what the standard
> forbids.

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
- [ ] Every artifact the document links to resolves — Step 12b ran after the edit: no `missing` link, no `stale-updated`
- [ ] Gate YAML file created and saved (co-located with task)
- [ ] Task file `## QA Testing Results` section updated with gate status and artifact links
- [ ] Task status correct per gate decision — `ready-for-review` on PASS/CONCERNS/WAIVED, `in-progress` on FAIL. Never `Completed`, never `Ready for Done`, never `accepted` (that is `finalise`'s)
- [ ] PR comment posted via the `$VCS` arm (Step 13 — BLOCKING): on GitHub, `tracker_call_with_retry gh pr comment "$PR_URL" --body-file` — confirm exit code 0 after up to 3 attempts; on Bitbucket, the single-shot REST POST to `…/pullrequests/${PR_NUMBER}/comments` — confirm exit code 0 (no retry)
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
   - Re-bind `head:` and `updated:` exactly as in Step 10 — the gate now vouches for the commit the fixes were verified on
   - Add `status: closed` and `fixed_date` to each resolved issue in `top_issues`
   - Update `quality_score`
   - Add `bug_resolution` section
4. **Task Document**: Update success criteria checkboxes if now met

**Example gate update after fixes:**

```yaml
gate: PASS  # Was: CONCERNS
status_reason: 'Bugs #1 and #2 fixed. Tests passing, lint clean.'
head: '9c41d0e2b7a85f3e6d1c0b9a8f7e6d5c4b3a2f1e'  # re-bound: the commit the fixes were verified on
updated: '2026-03-20T14:30:00Z'

top_issues:
  - issue: 'Test expects removed tier'
    severity: medium
    file: 'libs/billing/src/tier.spec.ts'
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
