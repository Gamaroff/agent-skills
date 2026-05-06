# Task Review Report: Task 9 — Migrate leaf skills to skills-config.yaml platform-detection resolver

**Reviewed:** 2026-05-06
**Review Depth:** Standard
**Task Status:** 📋 Planned
**Overall Assessment:** GOOD (with revisions)

> **Implementation Status**: ✅ All 6 critical + important recommendations implemented — 2026-05-06

---

## Executive Summary

Task scope and motivation are sound; the migration solves a documented gap (config keys read by zero skills). Two contradictions with the canonical spec must be resolved before implementation: the proposed `yq` reader conflicts with the python reader in `shared/resources/platform-detection.md`, and the affected-skill list (8) does not match CLAUDE.md / canonical doc (7). User clarifications have realigned both. Helper testing and one Jira-only no-op behaviour also need formalising.

**Critical Issues:** 2 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1: Technical & Scope

**Q1: Config reader — yq vs python?**
- **User Decision**: Python (match canonical)
- **Impact**: Phase 1 helper snippet must use `python -c "import yaml..."` not `yq`. Removes new tool dep. Aligns with `shared/resources/platform-detection.md`.

**Q2: Affected skill list — 8 vs 7?**
- **User Decision**: Keep 8; update CLAUDE.md + canonical
- **Impact**: Phase 4 expands to also patch `CLAUDE.md` L88 and `shared/resources/platform-detection.md` "Skills using implicit detection today" list to include `review-task`.

**Q3: ensure-epic-jira-issue under tracker=github?**
- **User Decision**: No-op gracefully
- **Impact**: Add explicit no-op behaviour to Phase 3 changes; add corresponding Success Criterion.

**Q4: Helper testing?**
- **User Decision**: Add bats/shell tests
- **Impact**: Phase 1 grows: new file `shared/resources/resolve-platform.test.sh` covering 3 project shapes + missing-tool fallbacks.

---

## 1. Template Structure Compliance

**Status:** PASS (minor)

### Issues

#### Important
- Frontmatter uses `assignee: TBD` placeholder. Acceptable but flag for fill-in at start.
- `depends_on: —` (em dash) — standardise to `depends_on: []` or `none`.

#### Optional
- No co-located implementation report scaffold; created lazily by `/develop-task` so OK.

---

## 2. Technical Accuracy & Anti-Hallucination

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (substantive)

### Issues

#### Critical
- **Reader-tool mismatch (`yq` vs `python`)**
  - **Location:** §3 Technical Background (line 72-75), Phase 1 (line 110-112)
  - **Issue:** Task proposes `yq` but the canonical spec at `shared/resources/platform-detection.md:7-15` uses python+pyyaml. CLAUDE.md says canonical resolver lives in that file.
  - **Recommendation (per Q1):** Rewrite target snippet to mirror canonical:
    ```bash
    read_config_key() { python -c "
    import yaml
    try:
        with open('skills-config.yaml') as f:
            print(yaml.safe_load(f).get('$1', 'auto'))
    except Exception:
        print('auto')
    " 2>/dev/null
    }
    TRACKER=$(read_config_key tracker)
    [ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)
    VCS=$(read_config_key vcs)
    [ "$VCS" = "auto" ] && VCS=$(git remote get-url origin 2>/dev/null | grep -qi bitbucket.org && echo bitbucket || echo github)
    ```

#### Important
- **CLAUDE.md line reference wrong**
  - **Location:** §1 Overview ("lines 56–69")
  - **Actual:** Detection caveat is at L87–88. L56–69 are Configuration sample yaml. Update or drop the line ref.
- **Affected-skill list inconsistency**
  - **Location:** §3 Technical Background (line 56), §6 Phase 3
  - **Issue:** Task lists 8 skills (adds `review-task`); CLAUDE.md L88 + canonical doc list 7. Verified: `review-task` Step 10 does branch on `JIRA_URL` → migration is correct.
  - **Recommendation (per Q2):** Keep 8. Add Phase 4 changes:
    - [ ] Update CLAUDE.md L88 to include `review-task`
    - [ ] Update `shared/resources/platform-detection.md` "Skills using implicit detection today" list to include `review-task`
- **`qa-task` audit handling vague**
  - **Location:** §3 Technical Background ("verify during audit")
  - **Recommendation:** Either (a) move to Out of Scope explicitly, or (b) add a one-line audit step in Phase 1 that greps qa-task for `JIRA_URL` and confirms exclusion.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important
- **No explicit Jira-only-skill behaviour change**
  - **Location:** Phase 3 (`ensure-epic-jira-issue`)
  - **Issue:** Migrating to TRACKER var — but skill is Jira-only. What happens if TRACKER=github after override?
  - **Recommendation (per Q3):** Add Phase 3 sub-bullet:
    - [ ] When `TRACKER!=jira`, `ensure-epic-jira-issue` exits 0 with `ℹ️  Skipped: tracker is not jira` (no-op gracefully)
  - Add to §9 Success Criteria: "Jira-only skills no-op gracefully under tracker=github."
- **Helper test gap**
  - **Location:** Phase 1 ("unit-style smoke test in skill comments")
  - **Recommendation (per Q4):** Add to Phase 1:
    - [ ] Create `shared/resources/resolve-platform.test.sh` (or `.bats`) covering: GH+GH, GH+Jira, BB+Jira, missing python, malformed yaml. Wire into project test entry point if one exists; otherwise document `bash resolve-platform.test.sh` invocation.

#### Optional
- Phase 2/3 "Smoke-test each skill against [3 project shapes]" — no fixture or scripted verification. Could add a per-shape sample `skills-config.yaml` under `shared/resources/fixtures/`.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important
- **Files Summary missing CLAUDE.md companions**
  - **Location:** §7 Files Summary (after Q2 update)
  - **Recommendation:** Confirm `shared/resources/platform-detection.md` is in Modified list (it is) AND that Phase 4 changes both CLAUDE.md sections (Configuration paragraph + Detection bullet at L88).

#### Optional
- No Mermaid for resolver decision flow. Could add `flowchart` to §3 to clarify the 4-tier order. Skip if prose suffices.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

### Issues

#### Optional
- Rollback says "helper file can stay (unused)" — fine, but if helper is sourced via path-rewritten reference inside packaged zips, an old packaged zip may still call the helper after revert. Note: regenerate zips post-revert. Add to §11.

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues

1. Replace `yq` snippet with python+pyyaml reader matching `shared/resources/platform-detection.md:7-15` (per Q1). Update both §3 Technical Background and Phase 1.
2. Confirm 8-skill list and add Phase 4 patches to CLAUDE.md L88 + canonical doc's "implicit detection today" list to include `review-task` (per Q2).

### Should Fix (Important) — 4 issues

1. Fix CLAUDE.md line ref in §1 Overview (L87–88, not L56–69).
2. Add explicit no-op behaviour for `ensure-epic-jira-issue` under `tracker!=jira` to Phase 3 + §9 Success Criteria (per Q3).
3. Add `resolve-platform.test.sh` to Phase 1 covering 3 shapes + missing python + malformed yaml (per Q4).
4. Resolve `qa-task` audit ambiguity — move Out of Scope or add a one-line grep audit in Phase 1.

### Consider (Optional) — 2 items

1. Add Mermaid `flowchart` to §3 showing 4-tier resolver order.
2. Note in §11 Rollback: regenerate skill zips after revert to drop helper references.

---

## Implementation Readiness Assessment

**Score:** 7/10

**Scoring Breakdown:**
- Template Compliance: 9/10
- Technical Accuracy: 5/10 (yq vs python contradiction)
- Implementation Clarity: 7/10
- Consistency: 7/10 (skill list mismatch, vague qa-task)
- Risk Management: 8/10

**Confidence Level:** Medium

**Recommendation:** ⚠️ NEEDS REVISION — apply the 2 critical + 4 important fixes; then ready for `/develop`.

**Justification:** Scope is right and clearly motivated, but the proposed implementation contradicts the canonical spec on the reader tool. With the python switch and skill-list reconciliation, the task is ready.

---

## Next Steps

1. Apply critical fixes (yq→python, skill-list expansion + Phase 4 doc patches)
2. Apply important fixes (line ref, Jira-only no-op, helper tests, qa-task disposition)
3. Re-run `/review-task` or proceed to `/develop`

---

## Review Metadata

- **Reviewer:** Claude (review-task skill)
- **Review Date:** 2026-05-06
- **Review Depth:** Standard
- **Task File:** docs/development/tasks/task.9.platform-detection-resolver-migration/task.9.platform-detection-resolver-migration.md
- **Architecture Docs Consulted:** `shared/resources/platform-detection.md`, `CLAUDE.md`, `skills/create-skill/scripts/package_skill.py`, `skills/review-task/SKILL.md` (Step 10)
