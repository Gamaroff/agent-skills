# QA Report: Task 10 — Consolidate PR-comment fan-out under finalise

**Task**: [task.10.pr-comment-consolidation.md](./task.10.pr-comment-consolidation.md)
**Gate File**: [task.10.gate.1.pr-comment-consolidation.yml](./task.10.gate.1.pr-comment-consolidation.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-05-06
**Testing Completed**: 2026-05-06
**Gate Status**: PASS (updated after qa-fix cycle 1)

---

## Executive Summary

Task 10 modifies three SKILL.md instruction files to demote qa-task and qa-fix PR comments to non-blocking and designate finalise as the canonical PR-comment author with marker-based idempotency. All three phases are fully implemented and the structural intent is correct. Two MEDIUM issues were found: the finalise gate-field grep uses the wrong key (`decision:` instead of `gate:`), and the idempotency comment lookup uses `.databaseId` which is absent from `gh pr view --json comments` output (must extract from `.url` instead). Both cause silent failures, not pipeline halts.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix 2 MEDIUM issues before merge

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3 checkboxes marked)
- [x] Tests passing (N/A — instruction-document changes; no test suite)
- [x] Breaking changes documented (None — §5 Breaking Changes confirms no functional breaking changes)
- [x] Code on feature branch `feature/task.10.pr-comment-consolidation` with open PR #24

### Testing Approach

Direct tools — 3 phases, single module (3 SKILL.md files), Low risk.

### Review Methodology

Adaptive strategy: Direct tools only — task < 3 risk factors (small phase count, single module, no high-risk category). No parallel agents spawned.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| Phase 1: Demote intermediate comments (qa-task, qa-fix) | PASS | Both skills correctly updated; overview table also fixed |
| Phase 2: Extend finalise summary with idempotency | CONCERNS | Marker and structure correct; 2 bugs in grep/field names |
| Phase 3: Comment authorship contract | PASS | Identical 3-row table present in all 3 skills |

**Overall Phase Completion**: 2/3 phases PASS, 1 CONCERNS (2 MEDIUM bugs in Phase 2)

### Phase Detail

**Phase 1 — qa-task/SKILL.md**:
- Overview table L90: updated from "CRITICAL / BLOCKING" to "best-effort, non-blocking" ✅
- Step 13 heading: "Post PR Comment — Best-effort, non-blocking" ✅
- Old mandatory text removed ✅
- Authorship contract table added ✅
- `|| echo "⚠️ PR comment failed — non-blocking..."` guard added ✅

**Phase 1 — qa-fix/SKILL.md**:
- Step 7 heading: "Post Fix Summary to PR — Best-effort, non-blocking" ✅
- CRITICAL/BLOCKING text replaced ✅
- Authorship contract table added ✅
- `exit 1` replaced with `⚠️ echo` ✅
- "Do NOT mark complete" requirement removed ✅

**Phase 2 — finalise/SKILL.md**:
- Step 6 renamed "Add Canonical PR Comment (idempotent via marker)" ✅
- Authorship contract table present ✅
- Step 6a: QA cycle count from `grep -c '^### QA Cycle'` with fallback ✅
- Step 6b: Marker `<!-- finalise-canonical-summary -->` prepended ✅
- Step 6b: Body includes PR URL, final gate, cycle count, DoD path, accepted status ✅
- **BUG**: Step 6b uses `grep '^decision:'` — gate YAML field is `gate:` ❌
- Step 6c: search-then-edit idempotency structure correct ✅
- **BUG**: `.databaseId` not available in `gh pr view --json comments` — must extract from `.url` ❌
- Both GitHub and Bitbucket paths implemented ✅
- All failure paths non-blocking ✅

**Phase 3 — Authorship table**:
- qa-task Step 13: identical 3-row table ✅
- qa-fix Step 7: identical 3-row table ✅
- finalise Step 7: identical 3-row table ✅

---

## Success Criteria Verification

**Functional**:

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Pipeline does not halt when intermediate PR comment fails | Non-blocking | `|| echo "⚠️"` guard + `⚠️` echo (no `exit 1`) | PASS |
| `finalise` posts canonical summary with all cross-references | PR URL + gate + cycles + DoD | Present in template; gate field broken | CONCERNS |
| Re-running `finalise` edits existing comment | Marker search-then-edit | Search correct; `.databaseId` broken → creates new | CONCERNS |
| Authorship table in all 3 skills | 3 skills | qa-task ✅, qa-fix ✅, finalise ✅ | PASS |

**Code Quality**:

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Each affected skill documents new ownership rule | Yes | Authorship table in all 3 | PASS |

---

## Breaking Changes Validation

No breaking changes per §5 of task document. PR comment count changes from ≤2N+1 to N+1 per N QA cycles — this is an intentional improvement, not a breaking change. Assessment: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue 1: Wrong gate field name in finalise Step 6b**
- **Severity**: MEDIUM
- **Category**: Functional correctness
- **File**: `skills/finalise/SKILL.md` — Step 6b
- **Observation**: `grep '^decision:'` used to extract gate decision from gate YAML. Verified gate file field is `gate:` (confirmed against `docs/tasks/task.9.*/task.9.gate.1.platform-detection-resolver-migration.yml` which has `gate: PASS`). The `decision:` key does not exist in the gate YAML schema.
- **Impact**: `FINAL_GATE` will always be empty → falls back to "N/A" in the canonical summary comment. The "Final Gate" cross-reference in the canonical summary is always wrong.
- **Recommendation**: Change `grep '^decision:'` to `grep '^gate:'`
- **Priority**: P1

**Issue 2: `.databaseId` not available in `gh pr view --json comments`**
- **Severity**: MEDIUM
- **Category**: Functional correctness (idempotency)
- **File**: `skills/finalise/SKILL.md` — Step 6c (GitHub path)
- **Observation**: `gh pr view "$PR_URL" --json comments -q '.comments[] | select(...) | .databaseId'` will always return empty string. Verified empirically: `gh pr view 24 --json comments -q '.comments[0] | keys'` returns `["author","authorAssociation","body","createdAt","id","includesCreatedEdit","isMinimized","minimizedReason","reactionGroups","url","viewerDidAuthor"]` — no `databaseId` field. The numeric comment ID must be extracted from `.url` via `grep -oE 'issuecomment-[0-9]+' | grep -oE '[0-9]+'`. Verified: comment URL `https://github.com/.../pull/24#issuecomment-4386029643` → ID `4386029643`, which works with `gh api -X PATCH /repos/{owner}/{repo}/issues/comments/4386029643`.
- **Impact**: `EXISTING_COMMENT_ID` always empty → idempotency check silently fails → finalise always creates a new comment instead of editing the existing one. The idempotency guarantee is broken.
- **Recommendation**: Replace `.databaseId` with `.url | gsub(".*issuecomment-"; "")` or use `grep -oE` in the shell pipeline to extract the numeric ID from the URL.
- **Priority**: P1

### LOW Severity Issues (0)

None.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
Instruction-document changes only. No runtime overhead. No performance testing applicable.

### Reliability — CONCERNS
Issue 2 means the idempotency guarantee is silently broken — finalise will post a new comment on every re-run instead of editing the existing one. While non-blocking (pipeline continues), it accumulates canonical summary comments on the PR over multiple runs, partially defeating the purpose of the consolidation.

### Security — PASS
No auth changes, no secret exposure, no new external calls beyond what was already present.

### Maintainability — PASS
Authorship contract table is clear and identical across all three skills. The idempotency protocol is well-structured in Steps 6a/6b/6c. Issue 2 is a field-name mistake, not a structural problem.

---

## Regression Testing

| Area | Status | Notes |
|---|---|---|
| qa-task Step 13b (GitHub Issue comment) | PASS | Unchanged; graceful non-blocking |
| qa-fix Steps 8+ (Jira tracker comment) | PASS | Unchanged; non-blocking |
| finalise Steps 1–5 (DoD verification) | PASS | Unchanged |
| finalise Step 7 (tracker + board update) | PASS | Unchanged |
| Overall pipeline flow | PASS | No halt paths added or removed |

---

## Test Artifacts

### Files Reviewed
- `skills/qa-task/SKILL.md` (diff against origin/main)
- `skills/qa-fix/SKILL.md` (diff against origin/main)
- `skills/finalise/SKILL.md` (diff against origin/main)
- `docs/tasks/task.9.*/task.9.gate.1.*.yml` (reference for gate field name)
- Live `gh pr view 24 --json comments` (to verify available fields)

### Test Commands Executed
```bash
git diff origin/main..HEAD --stat
git diff origin/main..HEAD -- skills/qa-task/SKILL.md
git diff origin/main..HEAD -- skills/qa-fix/SKILL.md
git diff origin/main..HEAD -- skills/finalise/SKILL.md
grep -n "^gate:\|^decision:" docs/tasks/task.9.*/*.gate.*.yml
gh pr view 24 --json comments -q '.comments[0] | keys'
```

### Coverage Report
N/A — instruction-document changes; no test suite applicable.

---

## Recommendations

### Immediate Actions (Blocking — fix before merge)

1. **Fix gate field grep** (`skills/finalise/SKILL.md` Step 6b): change `grep '^decision:'` → `grep '^gate:'`
2. **Fix databaseId → URL extraction** (`skills/finalise/SKILL.md` Step 6c): replace `.databaseId` with numeric ID extracted from `.url` (e.g. `| jq -r '.url' | grep -oE '[0-9]+$'`)

### Short-term Actions (Non-Blocking)

None.

---

## Final Assessment

**Gate Status**: PASS (updated after qa-fix cycle 1)
**Rationale**: 2 MEDIUM issues in Phase 2 (finalise idempotency). Both are wrong field/key names that cause silent failures rather than halts. The structural intent is correct and the non-blocking error paths are well-designed. Fixes are minimal (2 one-line changes).
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Apply 2 fixes listed in Immediate Actions before merge.

---

**QA Report**: `task.10.qa.1.pr-comment-consolidation.md`
**Gate File**: `task.10.gate.1.pr-comment-consolidation.yml`
**Next Steps**: Developer applies 2 MEDIUM fixes; QA verifies; gate updates to PASS.
