---
id: task.10
title: "Consolidate PR-comment fan-out under finalise"
type: task
category: refactoring
priority: Medium
status: 📋 Planned
created: 2026-05-06
assignee: TBD
effort: 0.5 day
depends_on: —
github_issue: 17
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #4)
---

# Task 10 — Consolidate PR-comment fan-out under finalise

## 1. Overview

Four skills (`create-pr`, `qa-task`, `qa-fix`, `finalise`) each post their own PR comment as a "BLOCKING" step. In a `/develop-task` run with 3 QA cycles that's ≥6 PR comments. There is no designated owner of a final summary and no de-dup contract — comments accrete noise rather than narrative.

**Scope**: demote intermediate comments to non-blocking, designate `finalise` as the canonical summary author, and cross-reference the artifacts.

**Key deliverables**:

- `create-pr`, `qa-task`, `qa-fix` PR-comment steps relabelled "best-effort, non-blocking"
- `finalise` posts a single canonical summary comment listing PR + QA cycles + DoD path
- All four skills cross-reference each other so it's clear which step owns which comment

**Expected outcome**: PR comment chain becomes readable — opened, then a single closing summary — instead of a noisy 4–6-comment fan-out.

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

Current comment-posting steps:

| Skill | Step | Currently |
|---|---|---|
| `create-pr` | Step 6b | BLOCKING — verify comment posted |
| `qa-task` | Step 13 | BLOCKING — gate decision posted |
| `qa-fix` | Step 7 | BLOCKING — fix summary posted |
| `finalise` | Step 7 | Posts acceptance comment after tracker issue update |

Target authorship:

| Skill | After change |
|---|---|
| `create-pr` | Best-effort initial comment (PR opened, links to docs) — non-blocking |
| `qa-task` | Best-effort gate decision comment — non-blocking |
| `qa-fix` | Best-effort fix-applied comment — non-blocking |
| `finalise` | **Canonical summary**: PR + final gate + QA cycle count + DoD path + accepted status |

## 4. Scope

**In Scope**:

- ✅ Wording changes in 3 skills to mark comment posting non-blocking
- ✅ `finalise` summary template extended to include QA cycle history (read from implementation report)
- ✅ Cross-references between the 4 skills

**Out of Scope**:

- ❌ Removing comments entirely — keep them for traceability, just not blocking
- ❌ Changing tracker-issue comments (those serve a different audience)
- ❌ Suppressing comments based on lite-mode (separate decision)

## 5. Breaking Changes

None functional. A pipeline run now produces ~2 PR comments instead of ~4–6 in the best case, but each skill still emits its own comment when it succeeds.

## 6. Implementation Plan

### Phase 1 — Demote intermediate comments (Risk: Low)

Files:

- `skills/create-pr/SKILL.md` — Step 6b
- `skills/qa-task/SKILL.md` — Step 13
- `skills/qa-fix/SKILL.md` — Step 7

Changes:

- [ ] Replace "CRITICAL / BLOCKING: Verify comment was posted" → "Best-effort, non-blocking: log failure but do not halt"
- [ ] Wrap each `gh pr comment` call with a `|| echo "PR comment failed — non-blocking"` style guard
- [ ] Add a one-line note: "Final canonical summary is posted by `/finalise` at pipeline end"

### Phase 2 — Extend finalise summary (Risk: Medium)

Files:

- `skills/finalise/SKILL.md`

Changes:

- [ ] Update Step 7 PR comment template to include: PR URL, final gate decision, QA cycle count, DoD summary path, accepted status, links to QA reports
- [ ] Read QA cycle count from the implementation report (`### QA Cycle` grep) when called from `develop-task` / `develop-story`
- [ ] Keep the comment idempotent (re-runs of finalise update rather than duplicate the comment if possible — best effort)

### Phase 3 — Cross-references (Risk: Low)

Files:

- All 4 skills above

Changes:

- [ ] Add a "Comment Authorship" subsection to each skill's PR-comment section explaining who owns what

## 7. Files Summary

**Modified**:

- `skills/create-pr/SKILL.md`
- `skills/qa-task/SKILL.md`
- `skills/qa-fix/SKILL.md`
- `skills/finalise/SKILL.md`

## 8. Testing Strategy

- **Manual**: run `/develop-task` against a sandbox task with 1–2 QA cycles. Verify PR has: 1 open comment, optional intermediate comments per cycle, 1 final summary comment from finalise.
- **Failure mode**: temporarily revoke `gh pr comment` permission; verify pipeline completes (intermediate comments are non-blocking).

## 9. Success Criteria

**Functional**:

- [ ] Pipeline does not halt when intermediate PR comment fails
- [ ] `finalise` posts a single canonical summary comment with all cross-references
- [ ] Authorship table present in all 4 skills

**Code Quality**:

- [ ] Each affected skill documents the new comment ownership rule

## 10. Risk Assessment

**Medium Risk** — Audit-trail loss if all comments fail silently:

- Mitigation: implementation report (in git) is the durable audit trail; PR comments are convenience.

**Low Risk** — Idempotency of finalise summary on resume:

- Mitigation: best-effort idempotency; document that re-running finalise may duplicate the summary.

## 11. Rollback Plan

**Immediate (< 30 min)**: revert the wording changes; comments return to blocking. No state change to roll back.

**Triggers**: a real project relies on intermediate comments as the authoritative source (unlikely — implementation report is canonical).
