---
id: task.112
title: "[Task 112] The hotfix runbook predates /develop-bug's hotfix model and never mentions it"
type: task
description: "docs/runbooks/hotfix.md documents a seven-step manual loop (create-branch --hotfix → implement → tests → commit → PR to main → tag → back-merge) and mentions no pipeline, no bug report, no review-bug gate, no tracker, no review-pr — grep for develop-bug / review-bug / tracker / review-pr returns 0 each. /develop-bug owns the 'production hotfix off main' branch model (Phase 0d Q1) and already handles the PR-to-main and the back-merge note. Same class as task.107, which rewrote bug-fix.md; this is the sibling page it deliberately left out. Two small doc drifts ride along."
tags: [documentation, runbooks, develop-bug, hotfix]
category: documentation
status: accepted
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-17
completed_date: 2026-09-17
pr_number: 414
assignee:
estimated_effort_hours: 3
github_issue: 413
---

# Technical Task: The hotfix runbook predates /develop-bug's hotfix model and never mentions it

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.112.review.1.hotfix-runbook-rewrite.md` implemented 2026-09-16
**GitHub Issue**: [#413](https://github.com/Gamaroff/agent-skills/issues/413)

---

## 1. Overview

`docs/runbooks/hotfix.md` (62 lines) is the page a reader reaches for a production defect. It
documents a seven-step **manual** loop. The pipeline that exists — `/develop-bug` with Phase 0d Q1 =
*production hotfix* — cuts the branch from `main`, runs `review-bug` as a fix-readiness gate, PRs to
`main`, and records the mandatory back-merge to `develop` in the implementation report's Issues Log.
The runbook mentions none of it: `grep -c 'develop-bug\|review-bug\|tracker\|review-pr'
docs/runbooks/hotfix.md` → 0, 0, 0, 0.

task.107 rewrote `bug-fix.md` for exactly this class and named `hotfix.md` out of scope ("separate
page, separate question"). This is that page.

**Scope**: rewrite `hotfix.md` against `/develop-bug`'s hotfix model in the satellite shape task.107
established; plus two small drifts found in the same sweep — `docs/operations/workflows.md` does not
mention the plain-language lead the pipeline now writes on every tracker and PR comment (tasks
104–106), and `docs/reference/faq.md:25` says "Step 5c" with no link to what 5c is.

## 2. Motivation

### Current Problems

1. **The documented loop bypasses the bug pipeline entirely.** No bug report is filed, so there is no
   `review-bug` gate (duplicate / already-fixed / under-specified), no tracker card, no Status
   History, no fix record. A hotfix is the case where the record matters most — it is the change
   most likely to be audited later.
2. **The back-merge is a pitfall bullet, not a mechanism.** `/develop-bug` records the `main →
   develop` propagation as an explicit Issues-Log item; the runbook makes it step 7 of a list the
   reader is doing by hand under pressure.
3. **The page terminates before the capability starts** — the same finding task.107 made for
   `bug-fix.md`, and the reason it linked `hotfix.md` as a sibling rather than fixing it.
4. **Two smaller drifts.** The lead behaviour is user-visible (every comment the pipeline posts now
   opens with two to four plain-language sentences) and appears in no consumer doc;
   `faq.md`'s "Step 5c" is a bare token to a reader arriving from search.

### Benefits

1. A hotfix gets the same record, gate and tracker card as any bug, with the branch model the only
   difference — which is what `/develop-bug` was built to make true.
2. The two bug runbooks (`bug-fix.md`, `hotfix.md`) share one shape and one vocabulary.
3. The lead behaviour is documented where consumers read, not only in AGENTS.md.

## 3. Technical Background

Sources to write against:

| Concern | Canonical |
| :--- | :--- |
| The hotfix branch model | `skills/develop-bug/SKILL.md` Phase 0d Q1; `references/develop-bug-step-0-resolve-bug.md`; `--base main` at create-pr; the back-merge Issues-Log note |
| Branch naming | `skills/create-branch/SKILL.md` (`--hotfix v{X.Y.Z}`) |
| The fix-readiness gate | `skills/review-bug/SKILL.md` (`--validate`) |
| Filing the bug | `skills/create-bug-report/SKILL.md`; `docs/standards/bug-documents.md` |
| Tracker sync | `skills/sync-{jira,github}-bug/SKILL.md` |
| Shape and length | `docs/runbooks/bug-fix.md` (post-task.107) and `docs/runbooks/README.md:58-61` (satellite: ~80–150 lines, ≤ 200) |
| The lead | AGENTS.md §Stakeholder Summaries; `shared/resources/stakeholder-summary.md` |

Note what stays: the "when to use this runbook" boundary, the *no force-push to main* pitfall, the
tag step (which `/develop-bug` does not do — tagging is a human call, per `docs/contributing/releases.md`).

## 4. Scope

### In Scope

✅ Rewrite `docs/runbooks/hotfix.md`: file the bug → `/develop-bug` with Q1 = hotfix → tag (human) → back-merge; both tracker arms; the Mermaid diagram updated
✅ `docs/operations/workflows.md`: one short **"What the pipelines post"** paragraph on the plain-language lead, added under `## Cross-cutting references` (the page never describes comments today, so there is no existing anchor — this is the section that already links shared resources), pointing at `shared/resources/stakeholder-summary.md`
✅ `docs/reference/faq.md:25`: link "Step 5c" to its definition (`develop-story`/`develop-task` Step 5c, review-pr)
✅ `docs/runbooks/README.md` one-line description re-checked

### Out of Scope

❌ Any skill change · ❌ `bug-fix.md` (done in task.107) · ❌ automating the tag

## 5. Breaking Changes

None. Documentation only.

## 6. Implementation Plan

1. Read `develop-bug` Step 0 / Phase 0d and the create-pr `--base` handling; write the step list from
   the skill, not from the current page.
2. Rewrite `hotfix.md` in `bug-fix.md`'s section shape; keep it inside the satellite budget.
   Verify every command by running it or mark it illustrative.
3. `workflows.md` lead paragraph under `## Cross-cutting references`; `faq.md` link.
4. Local link check against the **tracked** tree; `npm run format:check`.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `docs/runbooks/hotfix.md` | rewritten — 141 lines, 62 → 141; task.107 satellite shape (qa-fix 1: Q1 wording) |
| `docs/operations/workflows.md` | +1 paragraph — `### What the pipelines post` under Cross-cutting references (qa-fix 1: scoped to tracker + summary-level PR comments; engine attribution; `---` GitHub-only) |
| `docs/reference/faq.md` | +1 link — "Step 5c" → `qa-flow.md#phase-3b--pr-conformance-review-review-pr-step-5c` |
| `docs/runbooks/README.md` | hotfix row description updated to name `/develop-bug`'s hotfix model |
| `CHANGELOG.md` | `[Unreleased] → Changed` |

## 8. Testing Strategy

Documentation: `Docs link check` workflow green; `npm run format:check`; every skill/standard named
resolves against `git ls-files`; fence parity on the edited page.

## 9. Success Criteria

1. `hotfix.md` names `/develop-bug` and the Phase 0d hotfix answer, and gives the pipeline's actual step order for a hotfix
2. The bug is filed before the branch is cut, and the page says which mode (story / task / general)
3. The back-merge to `develop` appears as a pipeline-recorded step, not only a pitfall
4. The tag step survives as an explicit human action
5. "Force-pushing main is never authorised" survives unchanged
6. Both tracker arms named; every link resolves; page ≤ 150 lines
7. `workflows.md` describes the plain-language lead; `faq.md` "Step 5c" links to its definition

## 10. Risk Assessment

**Low.** Documentation only. The one judgement is where the tag sits relative to the back-merge —
follow `releases.md`, which owns tagging.

## 11. Rollback Plan

`git revert`. No state.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 repo sweep | create-task |
| 2026-09-16 | 1.1     | Review passed (9/10) — GitHub issue #413 linked; `workflows.md` rider anchored to Cross-cutting references; References paths aligned to `skills/` | review-task |
| 2026-09-16 |         | Status → ready-for-development                | review-task |
| 2026-09-16 |         | Implemented — 5 files, 0 tests (docs only; ci:fast + link check green) | develop |
| 2026-09-16 |         | QA gate CONCERNS (90/100) — 4 LOW accuracy findings (workflows.md lead paragraph overstates the spec ×3; hotfix.md says Q1 is skipped) | qa-task |
| 2026-09-16 |         | QA gate PASS (100/100), cycle 2 refute pass — cycle-1 findings verified fixed; 1 LOW (stale "140 lines" figure in CHANGELOG + Progress Tracking; file is 141) | qa-task |
| 2026-09-17 |         | QA gate PASS (100/100), cycle 3 scoped — gate-2 fix verified; no findings | qa-task |
| 2026-09-17 |         | QA findings fixed — gate PASS (100/100), 2 iterations (4 spec-accuracy sentences; one stale line count) | qa-fix |
| 2026-09-17 | 1.2     | DoD passed — accepted (PR #414)               | finalise |

---

## Progress Tracking

### Phase 1: hotfix.md
- [x] Rewritten against `/develop-bug`'s hotfix model; both tracker arms; ≤ 150 lines (141)
### Phase 2: two small drifts
- [x] `docs/operations/workflows.md` names the plain-language lead on tracker + PR comments
- [x] `docs/reference/faq.md` "Step 5c" links to its definition

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-17 (cycle 3)
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.112.qa.3.hotfix-runbook-rewrite.md](./task.112.qa.3.hotfix-runbook-rewrite.md) (earlier: [qa.2](./task.112.qa.2.hotfix-runbook-rewrite.md), [qa.1](./task.112.qa.1.hotfix-runbook-rewrite.md))
- **Gate File**: [task.112.gate.3.hotfix-runbook-rewrite.yml](./task.112.gate.3.hotfix-runbook-rewrite.yml) (earlier: [gate.2](./task.112.gate.2.hotfix-runbook-rewrite.yml), [gate.1](./task.112.gate.1.hotfix-runbook-rewrite.yml))

### Test Coverage Summary
- **Tests Executed**: 3341 (`ci:fast`) + 6 (changelog drift) + 70-link check
- **Phases Verified**: 2/2
- **Critical Issues**: 0
- **NFR Status**: Security: PASS (reasoned), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 1: four LOW accuracy defects in the new prose against the spec it links to — all fixed in qa-fix cycle 1 and verified by the cycle-2 refute pass. Cycle 2: one LOW, high-confidence stale figure ("140 lines" in CHANGELOG + Progress Tracking; the file is 141) — fixed in qa-fix cycle 2. Cycle 3: verified, no findings.

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Reports**: `task.112.qa.1.hotfix-runbook-rewrite.md` → `qa.2` → `qa.3`
**Gate File**: `task.112.gate.3.hotfix-runbook-rewrite.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR Conformance Review (Step 5c)**: ✅ APPROVE — `task.112.pr-review.1.hotfix-runbook-rewrite.md`

All Definition of Done criteria have been verified:

✅ **Success Criteria:** All 7 met — each traced to a line of the PR diff (`hotfix.md:18,34,87,101,123,90`; `workflows.md:164`; `faq.md:25`)
✅ **Tests / Gates:** per-PR lanes green on `8ca961c1` — test, shellcheck, link-check, branch policy; `ci:fast` green on every commit; `changelog-entry-drift` 6/6
✅ **PR Review:** PR #414, 5 commits, 14 files; 3 QA cycles (CONCERNS 90 → PASS 100 → PASS 100), 5c APPROVE
✅ **Documentation:** `hotfix.md` rewritten (141 lines), `workflows.md` lead paragraph, `faq.md` Step 5c link, README row, CHANGELOG `(task 112)`
✅ **Security Review:** ✅ PASS — not a boundary; no secrets, no unsafe patterns; force-push prohibition retained (`hotfix.md:123`)
✅ **Compliance Review:** ⚠️ N/A — documentation only

**Deployment Readiness:**

- Staging: ✅ APPROVED
- Production: ✅ APPROVED

**Task marked as ACCEPTED on:** 2026-09-17

**Detailed Verification Log:** See `task.112.dod.1.hotfix-runbook-rewrite.md` for complete verification evidence and timestamps.

---

## References

- **Plan**: [`task.112.plan.hotfix-runbook-rewrite.md`](task.112.plan.hotfix-runbook-rewrite.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Predecessor**: task.107 (bug-fix runbook rewrite) — same class, same shape
- **Related Skill**: `skills/develop-bug/` (Phase 0d Q1 hotfix branch model), `skills/create-branch/`
- **Length budget**: `docs/runbooks/README.md:58-61` (satellite tier)

---

**Status:** Accepted

**Next Steps**:
1. `/develop-task docs/tasks/task.112.hotfix-runbook-rewrite/task.112.hotfix-runbook-rewrite.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
