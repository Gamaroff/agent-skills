# Task Review Report: Task 304 - QA snippet classifier refuses git literal execution

**Reviewed:** 2026-11-11
**reviewed_blob:** 754cc291f4856b48de438a9e54bd39f476306c2e
**Review Depth:** Standard
**Task Status:** planned (promoted to ready-for-development by this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is well scoped, its premises are measured, and every engine identifier and line anchor it cites resolved against the tree. Two gaps were found and fixed in place: the plan left the `GIT_*=` rule as an open decision while the task document claimed it was refused wholesale, and an existing test pins the old behaviour without being named.

**Critical Issues:** 0
**Important Issues:** 2 (both fixed)
**Optional Improvements:** 1

**User Clarifications:** 0 (pipeline run, autonomous)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass subagents were not dispatched (autonomous run); the architecture and codebase checks were done inline, so independent review did not run.

---

## Findings

### Important (fixed)

1. **`GIT_*=` rule contradicted itself.** Task Risk 2 says `GIT_*=` is "refused wholesale, not by name"; the plan's Phase 1 left the same choice open (closed list vs prefix-only). A prefix-only rule also leaves `GIT_PAGER=./hook.sh` on one line followed by `git log` on the next open. Fixed: decided as "any assignment to a `GIT_` name, any position"; task Target Architecture and Phase 2 updated; plan Phase 1 records the decision, the bare-assignment row and the `GIT_DIFF_EXCLUDES` verdict to confirm.
2. **Removed-behaviour sweep missed a pinning test (check 15).** `git grep -nE 'git -c ' -- '*.test.*'` finds `shared/resources/tests/qa-execute-snippets.test.mjs:1561`, asserting `git -c user.name=x log` is `runnable`, in test `BUG-6: resolving git's subcommand past global flags keeps safe ones safe`. Fixed: Phase 2 now flips it. `qa-scope-from-head.test.mjs:304` quotes a `git -c` line as text only and needs no change.

### Optional

- Line numbers in Section 3 are decay-prone; the document already says to find them by identifier.

### Checks that passed

- Identifiers exist: `SAFE_GIT_SUBCOMMANDS` (531), `GIT_FLAGS_WITH_OPERAND` (2521), `gitSubcommand` (2536), `tok === "git"` (2688), `NON_EVALUATING_COMMANDS` (3348), `allowListViolation` (3383), `git:` word check (4011), differential `residual`/`BARE_SETS`.
- `doc-links.js`: 3 relative links resolve. Card preflight: 3 card blocks resolve.
- Success criteria are held: each names a test, a measured bound with its command, or the QA report as the record location.
- Bundled copies: 7 tracked (`git ls-files 'skills/*/references/qa-execute-snippets.mjs'`).

## Implementation Readiness Assessment

**Score:** 8/10 (template 9, technical accuracy 8, clarity 8, consistency 8, risk 8)

**Recommendation:** READY TO IMPLEMENT

## Review Metadata

- **Reviewer:** review-task (pipeline run)
- **Task File:** docs/tasks/task.304.qa-snippet-classifier-git-literal-execution/task.304.qa-snippet-classifier-git-literal-execution.md
