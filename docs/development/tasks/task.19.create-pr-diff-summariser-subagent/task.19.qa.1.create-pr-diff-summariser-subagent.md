# QA Report: Task 19 — Create-PR diff summariser subagent

**Task**: [task.19.create-pr-diff-summariser-subagent.md](./task.19.create-pr-diff-summariser-subagent.md)
**Gate File**: [task.19.gate.1.create-pr-diff-summariser-subagent.yml](./task.19.gate.1.create-pr-diff-summariser-subagent.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-05-09
**Testing Completed**: 2026-05-09
**Gate Status**: PASS

---

## Executive Summary

Reviewed the diff-aware PR body feature for `/create-pr`. All 4 implementation phases are complete and verified against the git diff. The feature was validated live on this PR itself (572-line diff) producing a well-formed 4-section body. No blocking issues found.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4)
- [x] No test suite applies (skill file modification — markdown instructions)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR #55

### Testing Approach

Direct tools only — small task (<3 effective modules: SKILL.md + prompt file), low risk, first review.

### Review Methodology

Adaptive strategy: direct tools (small task, single module, low risk). Reviewed git diff against `main`, verified SKILL.md wiring, prompt file structure, gitignore change, and live PR body output.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| Phase 1: Capture diff to file | PASS | `mkdir -p .agents/state`; timestamp patch; `rm -f` cleanup on both platforms |
| Phase 2: Authoring prompt | PASS | `pr-body-summariser-prompt.md` — 4 sections, ≤80 lines rule, fallback contract |
| Phase 3: Wire | PASS | GitHub and Bitbucket both consume `$PR_BODY`; `EXCLUDE_PATHS` forwarded to `git diff` |
| Phase 4: Validation | PASS | Live test: 572-line diff → concise 4-section body (PR #55) |

**Overall Phase Completion**: 4/4 phases PASS

---

## Success Criteria Verification

### Functional

| Criterion | Target | Status | Notes |
|---|---|---|---|
| Diff never read into main context | Patch → subagent only | PASS | `$DIFF_FILE` never read by main; path passed to Explore subagent |
| PR body uses fixed 4-section template | 4 sections | PASS | Summary/Changes/Test plan/Concerns enforced in prompt |
| `--exclude` semantics preserved | EXCLUDE_PATHS forwarded | PASS | `eval git diff` loop mirrors commit-changes pathspec |

### Performance

| Criterion | Target | Status | Notes |
|---|---|---|---|
| Diff bytes never enter main context | 0 bytes | PASS | Only `$DIFF_FILE` path passed to subagent |
| Subagent output ≤80 lines | ≤80 | PASS | Enforced in prompt rules; tested live |

### Quality

| Criterion | Target | Status | Notes |
|---|---|---|---|
| PR bodies pass team review style | Team review | ASSESSED | Live output on PR #55 shows correct grouping and structure; social criterion |
| Backwards-compatible | No migration | PASS | Body schema unchanged; no API breaks |

---

## Breaking Changes Validation

**None declared.** Body content shape is compatible with existing `gh pr create --body` usage. Bitbucket path previously used a broken heredoc placeholder `{PR_BODY content}` — this fix is an improvement, not a breaking change.

**Overall Breaking Changes Assessment**: PASS (N/A — no breaking changes)

---

## Issues Found

### LOW Severity Issues (1)

**Issue: Orphaned patch file on `gh pr create` failure**
- **Severity**: LOW
- **Category**: Reliability
- **Observation**: `rm -f "$DIFF_FILE"` is placed after `gh pr create` in the success path. If `gh pr create` exits non-zero (network error, auth failure), the cleanup line may not execute.
- **Impact**: Orphaned `.agents/state/pr-diff-*.patch` file. Gitignored — no git state impact. File is small; harmless.
- **Recommendation**: Future: wrap both paths in a `trap "rm -f '$DIFF_FILE'" EXIT` at diff-capture time. No action required for this task.
- **Priority**: P3

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Security — PASS
No user-facing inputs in new code path. `EXCLUDE_PATHS` sourced from orchestrator flags (trusted). `eval git diff` pattern is consistent with existing `commit-changes` skill.

### Performance — PASS
Diff bytes never enter main context — primary goal of this task. Bounded output (≤80 lines) enforced in prompt. Large-diff fallback (>5000 lines → file-count summary) prevents unbounded subagent output.

### Reliability — PASS
Explicit fallback to commit-subject body when subagent returns empty/errors. PR creation never fails due to subagent unavailability. `rm -f` cleanup is idempotent. One LOW concern (orphaned patch on failure) — non-blocking.

### Maintainability — PASS
Prompt co-located in `shared/resources/` following the `test-failure-triage-prompt.md` pattern. Separation of prompt template from wiring code is clean. Rollback plan documented in task. Gitignore change (`.agents/` → `.agents/state/`) is intentional and tracked.

---

## Regression Testing

| Area | Status | Notes |
|---|---|---|
| GitHub PR creation path | PASS | Live test: PR #55 created successfully with diff-generated body |
| `--base` flag pre-supply | PASS | Verified: base branch skip works correctly |
| `--issue` flag | PASS | `Closes #37` injected in PR body |
| `--exclude` flag | PASS | Implementation report excluded from diff and from commit |
| Bitbucket heredoc fix | PASS | `printf '%s'` replaces broken heredoc — correct pattern for variable with newlines |

---

## Test Artifacts

### Files Reviewed
- `skills/create-pr/SKILL.md` — diff capture block, Explore dispatch, cleanup on both platforms
- `shared/resources/pr-body-summariser-prompt.md` — prompt template and output contract
- `.gitignore` — `.agents/` → `.agents/state/` change

### Test Commands Executed
```bash
git diff main...HEAD --name-only
git diff main...HEAD -- skills/create-pr/SKILL.md
git diff main...HEAD -- shared/resources/pr-body-summariser-prompt.md
git diff main...HEAD -- .gitignore
grep -n "DIFF_FILE\|rm -f" skills/create-pr/SKILL.md
gh pr view --json url,state,title,number
```

### Coverage Report
Not applicable — skill file modification, no executable code.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Consider adding `trap "rm -f '$DIFF_FILE'" EXIT` at diff-capture time to handle failure-path cleanup (LOW / P3).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All 4 implementation phases verified. Both functional and performance success criteria met. No HIGH or MEDIUM issues found. Live test on PR #55 confirms correct end-to-end behaviour. One LOW cleanup concern noted — non-blocking.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED
**Conditions**: None
