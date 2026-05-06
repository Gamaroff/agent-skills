---
id: task.10
title: "Consolidate PR-comment fan-out under finalise"
type: task
category: refactoring
priority: Medium
status: ✅ Completed
created: 2026-05-06
assignee: TBD
effort: 0.5 day
depends_on: —
github_issue: 17
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #4)
---

# Task 10 — Consolidate PR-comment fan-out under finalise

**Review**: ✅ All review recommendations from `task.10.pr-comment-consolidation.review.2026-05-06.md` implemented 2026-05-06

## 1. Overview

Three skills (`qa-task`, `qa-fix`, `finalise`) each post their own PR comment as a "BLOCKING" step. For N QA cycles a `/develop-task` run produces up to 2N+1 PR comments (qa-task per cycle + qa-fix per cycle + finalise summary). There is no designated owner of a final summary and no de-dup contract — comments accrete noise rather than narrative.

(`create-pr` Step 6b posts an *issue* comment, not a PR comment, and is already non-blocking — out of scope.)

**Scope**: demote intermediate PR comments to non-blocking, designate `finalise` as the canonical summary author with marker-based idempotency, and cross-reference the artifacts.

**Key deliverables**:

- `qa-task`, `qa-fix` PR-comment steps relabelled "best-effort, non-blocking"
- `finalise` posts a single canonical summary comment listing PR + QA cycle count + DoD path, idempotent via HTML-comment marker
- All three skills carry a comment-authorship table inside their PR-comment step

**Expected outcome**: PR comment chain compresses from up to 2N+1 to N+1 (N intermediate non-blocking + 1 canonical), and the canonical summary edits in place on re-run.

## 2. Motivation

**Current Problems**:

- Each skill claims its comment is BLOCKING; verifying ≥4 comments per run wastes loop iterations
- Comments duplicate context (PR URL, gate decision) — readers can't tell which is canonical
- No designated owner of "the summary"; reviewers have to scroll through cycle history

**Benefits**:

- Cleaner PR review experience
- Faster pipeline (fewer required network calls in the success path)
- Clear authorship contract for future skills

## 3. Technical Background

Current PR-comment posting steps:

| Skill | Step | Currently |
|---|---|---|
| `qa-task` | Step 13 | BLOCKING — gate decision posted |
| `qa-fix` | Step 7 | BLOCKING — fix summary posted |
| `finalise` | Step 7 | Posts acceptance comment after tracker issue update |

Target authorship:

| Skill | After change |
|---|---|
| `qa-task` | Best-effort gate decision comment — non-blocking |
| `qa-fix` | Best-effort fix-applied comment — non-blocking |
| `finalise` | **Canonical summary**: PR + final gate + QA cycle count + DoD path + accepted status. Idempotent via marker. |

(`create-pr` Step 6b is unchanged — it posts an issue comment via `gh issue comment` and is already labelled "graceful — non-blocking".)

## 4. Scope

**In Scope**:

- ✅ Wording changes in `qa-task` and `qa-fix` to mark PR-comment posting non-blocking
- ✅ `finalise` summary template extended to include QA cycle count (greped from implementation report) and idempotent via marker
- ✅ Comment-authorship table embedded in PR-comment step of `qa-task`, `qa-fix`, `finalise`

**Out of Scope**:

- ❌ Removing comments entirely — keep them for traceability, just not blocking
- ❌ Changing tracker-issue comments (those serve a different audience)
- ❌ Suppressing comments based on lite-mode (separate decision)

## 5. Breaking Changes

None functional. A pipeline run with N QA cycles now produces ~N+1 PR comments instead of up to 2N+1, but each skill still emits its own comment when it succeeds (just non-blocking on intermediate ones).

## 6. Implementation Plan

### Phase 1 — Demote intermediate comments (Risk: Low)

Files:

- `skills/qa-task/SKILL.md` — Step 13
- `skills/qa-fix/SKILL.md` — Step 7

Changes:

- [x] Replace "CRITICAL / BLOCKING: Verify comment was posted" → "Best-effort, non-blocking: log failure but do not halt"
- [x] Wrap each `gh pr comment` / Bitbucket REST call with a `|| echo "⚠️ PR comment failed — non-blocking"` style guard
- [x] Add a one-line note in each step: "Final canonical summary is posted by `/finalise` at pipeline end"

### Phase 2 — Extend finalise summary with idempotency (Risk: Medium)

Files:

- `skills/finalise/SKILL.md`

Changes:

- [x] Update Step 7 PR comment template to include: PR URL, final gate decision, QA cycle count, DoD summary path, accepted status, links to QA reports.
- [x] Prepend body with HTML-comment marker: `<!-- finalise-canonical-summary -->`.
- [x] Read QA cycle count by grepping the implementation report:
      ```bash
      CYCLES=$(grep -c '^### QA Cycle' "$IMPLEMENTATION_REPORT" 2>/dev/null || echo 0)
      ```
      Resolve `$IMPLEMENTATION_REPORT` from the path passed by `develop-task` / `develop-story`. If unset or grep fails → omit the cycle-count line from the summary (do not halt).
- [x] Implement marker-based idempotency:
      ```bash
      EXISTING=$(gh pr view "$PR_URL" --json comments \
        -q '.comments[] | select(.body | startswith("<!-- finalise-canonical-summary -->")) | .url' \
        | head -1)
      if [ -n "$EXISTING" ]; then
        # edit existing canonical comment via its URL/ID — do not rely on --edit-last ordering
        # (GitHub: gh api -X PATCH /repos/{owner}/{repo}/issues/comments/{id}; Bitbucket: REST PATCH)
      else
        gh pr comment "$PR_URL" --body "$BODY"
      fi
      ```
      Bitbucket: equivalent search via `GET /repositories/.../pullrequests/{id}/comments` filtering on the marker, then `PUT` to update or `POST` to create.

### Phase 3 — Comment authorship contract (Risk: Low)

Files:

- `skills/qa-task/SKILL.md` (Step 13)
- `skills/qa-fix/SKILL.md` (Step 7)
- `skills/finalise/SKILL.md` (Step 7)

Changes:

- [x] Embed an identical authorship table inside each PR-comment step:

  ```markdown
  **PR-comment authorship contract**:

  | Skill | Owns |
  |---|---|
  | `qa-task` | Per-cycle gate decision (best-effort, non-blocking) |
  | `qa-fix` | Per-cycle fix summary (best-effort, non-blocking) |
  | `finalise` | Canonical summary — PR + final gate + QA cycle count + DoD path + accepted status (idempotent via marker) |
  ```

## 7. Files Summary

**Modified**:

- `skills/qa-task/SKILL.md`
- `skills/qa-fix/SKILL.md`
- `skills/finalise/SKILL.md`

## 8. Testing Strategy

- **Manual**: run `/develop-task` against a sandbox task with 1–2 QA cycles. Verify PR has: 1 open comment, optional intermediate comments per cycle, 1 final summary comment from finalise.
- **Failure mode**: temporarily revoke `gh pr comment` permission; verify pipeline completes (intermediate comments are non-blocking).
- **Idempotency**: re-run `/finalise` against the same PR. Assert exactly one comment whose body starts with `<!-- finalise-canonical-summary -->` exists; assert the second run edited the existing comment (same comment ID/URL) rather than creating a new one.

## 9. Success Criteria

**Functional**:

- [x] Pipeline does not halt when intermediate PR comment fails
- [x] `finalise` posts a single canonical summary comment with all cross-references
- [x] Re-running `finalise` edits the existing canonical comment (matched by marker) instead of duplicating
- [x] Authorship table present in all 3 affected skills (`qa-task`, `qa-fix`, `finalise`)

**Code Quality**:

- [x] Each affected skill documents the new comment ownership rule

## 10. Risk Assessment

**Medium Risk** — Audit-trail loss if all comments fail silently:

- Mitigation: implementation report (in git) is the durable audit trail; PR comments are convenience.

**Low Risk** — Idempotency of finalise summary on resume:

- Mitigation: marker-based detection (`<!-- finalise-canonical-summary -->`) + edit by comment URL/ID. Re-runs update in place.

**Low Risk** — Wrong-comment edit:

- Mitigation: target edits via the comment URL/ID returned from the marker search; do NOT rely on `--edit-last` ordering, which would clobber a stray most-recent comment. Search-then-edit only.

## 11. Rollback Plan

**Immediate (< 30 min)**: revert the wording changes; comments return to blocking. No state change to roll back.

**Triggers**: a real project relies on intermediate comments as the authoritative source (unlikely — implementation report is canonical).

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-06
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.10.qa.1.pr-comment-consolidation.md](./task.10.qa.1.pr-comment-consolidation.md)
- **Gate File**: [task.10.gate.1.pr-comment-consolidation.yml](./task.10.gate.1.pr-comment-consolidation.yml)

### Test Coverage Summary
- **Tests Executed**: N/A (instruction-document changes)
- **Phases Verified**: 3/3 (1 CONCERNS)
- **Critical Issues**: 0 HIGH, 2 MEDIUM
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
2 MEDIUM issues in finalise idempotency: (1) `grep '^decision:'` should be `grep '^gate:'` — gate field mismatch causes FINAL_GATE to always be "N/A"; (2) `.databaseId` not available in `gh pr view --json comments` — must extract numeric ID from `.url` instead. Both are 1-line fixes.

---

## Dev Agent Record

**Implementation Summary**: Demoted qa-task and qa-fix PR comments to non-blocking, designated finalise as canonical PR-comment author with marker-based idempotency, and embedded authorship contract tables in all three skills.

**Start Date**: 2026-05-06
**Completion Date**: 2026-05-06

**Implementation Approach**:

- Phase 1: `skills/qa-task/SKILL.md` Step 13 — renamed heading to "Best-effort, non-blocking", added authorship table, added `|| echo "⚠️..."` guard, removed blocking halt on failure. Also updated the overview table at L90.
- Phase 1: `skills/qa-fix/SKILL.md` Step 7 — renamed heading to "Best-effort, non-blocking", added authorship table, replaced `exit 1` on failure with `⚠️` echo, removed "Do NOT mark complete until confirmed" requirement.
- Phase 2: `skills/finalise/SKILL.md` Step 7 "Add PR Comment" — replaced simple comment template with full canonical summary: marker `<!-- finalise-canonical-summary -->`, QA cycle count grep from `$IMPLEMENTATION_REPORT`, idempotent search-then-edit (GitHub: `gh api -X PATCH /repos/.../issues/comments/{id}`; Bitbucket: `PUT .../pullrequests/{id}/comments/{id}`), all failure paths non-blocking.
- Phase 3: Authorship contract table embedded in PR-comment step of all three skills (identical 3-row table).

**Testing Results**: No automated tests (SKILL.md instruction files — manual validation only per §8 Testing Strategy).

**Files Modified**:
- `skills/qa-task/SKILL.md`
- `skills/qa-fix/SKILL.md`
- `skills/finalise/SKILL.md`
- `docs/development/tasks/task.10.pr-comment-consolidation/task.10.pr-comment-consolidation.md` (status + checkboxes)

**Change Log**:
- 2026-05-06: All three phases implemented. Task marked Ready for Review.
- 2026-05-06: qa-fix cycle 1 — fixed 2 MEDIUM issues in skills/finalise/SKILL.md: (1) grep '^decision:' → grep '^gate:'; (2) .databaseId → URL-extracted numeric ID via grep -oE '[0-9]+$'.
