---
id: task.107
title: "[Task 107] The bug-fix runbook documents a pipeline that has been superseded twice"
type: task
description: "docs/runbooks/bug-fix.md still describes the pre-develop-bug loop: create-bug-report by hand, fix, re-run qa-story, commit. It never mentions /develop-bug, /review-bug, general-bug mode, the bug registry, or any tracker sync — including the sync-jira-bug / sync-github-bug / ensure-bug-*-issue skills added in v0.46.0. A reader following it works entirely off-tracker and never learns the bug pipeline exists."
tags: [documentation, runbooks, develop-bug, bug-documents]
category: documentation
status: accepted
priority: Medium
risk_level: low
created: 2026-09-10
updated: 2026-09-11
completed_date: 2026-09-11
pr_number: 387
assignee:
estimated_effort_hours: 3
github_issue: 386
---

# Technical Task: rewrite the bug-fix runbook against the pipeline that exists

**GitHub Issue**: [#386](https://github.com/Gamaroff/agent-skills/issues/386)

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.107.review.1.bug-runbook-rewrite.md` implemented 2026-09-11

---

## 1. Overview

`docs/runbooks/bug-fix.md` (68 lines) is the entry point a reader reaches from six places:
`docs/README.md:25`, `docs/runbooks/README.md:31`, `docs/runbooks/hotfix.md:62`,
`docs/runbooks/change-management.md:9` and `:27`, and `docs/operations/workflows.md:137`. It documents a
four-step manual loop that predates the bug pipeline entirely.

> Corrected by review 1. An earlier draft of this paragraph also named the "Use a different runbook if"
> callouts in `story-development.md` and `task-development.md`. **Neither links here** — both callouts
> list exactly four destinations (the sibling anchor runbook, `hotfix.md`, `create-parallel-stories.md`,
> `which-path.md`), and `which-path.md` offers no bug route at all, which is itself part of this task's
> scope. The correct list above is a weaker claim from the anchor runbooks and a stronger one from
> `docs/README.md` and `workflows.md`; write the page for those arrivals.

Rewrite it against what ships, in the shape of the two runbooks it sits beside
(`story-development.md`, `task-development.md`).

## 2. Motivation

The runbook was accurate when it was written and has been overtaken twice without being revisited.

**First**, by `/develop-bug` and `/review-bug`. The runbook's "Steps" block is
`qa-story → create-bug-report → [developer fixes] → qa-story → commit-changes`. The pipeline that
exists is `create-branch → review-bug → investigate & fix → create-pr → verify loop → finalise →
commit-changes`, crash-safe, with a fix-readiness gate that halts on a duplicate or under-specified
bug. A reader following the runbook does the orchestrator's job by hand and never learns it is there.

**Second**, by tracker sync. v0.46.0 added `sync-jira-bug`, `sync-github-bug`,
`ensure-bug-jira-issue` and `ensure-bug-github-issue`; a bug now gets a real tracker card, linked as a
sibling of its parent story or task, with Status History rows written on creation and transition. The
runbook mentions no tracker at all — `grep -c 'tracker\|jira\|github_issue' docs/runbooks/bug-fix.md`
returns 0.

**Third, and smaller**, the naming section lists two of the three bug modes. General
(cross-cutting) bugs live in `docs/bugs/` with a global registry and are absent from the page, so a
reader with a bug that belongs to no story or task finds no route at all.

The cost is not that the documented loop fails — it works, and produces an untracked fix. It is that
the page is where a reader goes *first*, and it terminates before the capability starts.

## 3. Technical Background

Sources of truth to write against, none of which the runbook currently cites:

| Concern | Canonical |
| :--- | :--- |
| The bug pipeline | `skills/develop-bug/SKILL.md` |
| The fix-readiness gate | `skills/review-bug/SKILL.md` (`--validate` mode) |
| The three bug modes and their numbering | `docs/standards/bug-documents.md` |
| General-bug numbering | `docs/standards/bug-registry.md` |
| Tracker sync | `skills/sync-{jira,github}-bug/SKILL.md`, `shared/resources/status-history.js` |
| Bug reports carry Status History, never a Change Log | `shared/resources/document-change-log.md` |

Note the last row: bug reports are the one document type barred from the `## Change Log`, and a
rewrite is exactly where that rule gets broken by copying the story runbook's shape.

## 4. Scope

**In scope**

- Rewrite `docs/runbooks/bug-fix.md` against the shipped pipeline, matching the **section shape** of
  `task-development.md` (Before you start → pipeline diagram → steps → artifacts → pitfalls → see also)
- **Hold the page to the satellite length budget: ≤ 200 lines.** `docs/runbooks/README.md:58-61` splits
  the runbooks into two tiers — anchor runbooks (story-development, task-development, qa-flow) at
  ~200–300 lines, and satellites, `bug-fix.md` named explicitly among them, at ~80–150 lines, with
  "if a satellite outgrows ~200 lines, consider promoting it or splitting out a satellite of its own."
  `task-development.md` is an **anchor**, so borrow its shape, not its length: lean on it and on
  `story-development.md` for shared pipeline context rather than restating them
- All three bug modes, including the `docs/bugs/` + registry route
- The tracker-sync step, on both `TRACKER` arms
- Keep the hotfix boundary intact — the "is this the right runbook?" callout is correct and stays
- Update `docs/concepts/which-path.md`, which routes a bug fix to `/create-story` and offers no bug path

**Out of scope**

- Any change to the bug skills themselves
- The `docs/runbooks/hotfix.md` rewrite (separate page, separate question)
- Backfilling tracker cards for existing bug reports

## 5. Breaking Changes

None. Documentation only.

## 6. Implementation Plan

1. Read the four bug skills and `docs/standards/bug-documents.md`; write the step list from the
   skills, not from the current page.
2. Rewrite `bug-fix.md`. Verify every command in it by running it, or mark it explicitly as
   illustrative — the page currently contains no runnable command, which is why nothing caught the drift.
3. Add the bug branch to `which-path.md`'s flowchart, prose fallback and quick-reference table.
4. Re-run the docs link check locally against the tracked tree, not the working tree.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `docs/runbooks/bug-fix.md` | rewritten |
| `docs/concepts/which-path.md` | bug branch added to three places |
| `docs/runbooks/README.md` | one-line description re-checked against the new page |
| `CHANGELOG.md` | `[Unreleased] → Changed` entries for both rewritten pages (added during implementation — this repo's CHANGELOG carries doc-only entries) |

## 8. Testing Strategy

Documentation, so the checks are the repo's existing doc gates rather than new tests:

- `Docs link check` workflow green (the page gains links to four skills and three standards)
- `npm run format:check`
- Every skill and standard named in the page resolves — verify against the **tracked** tree, not the
  working tree, which misses `#anchors` and gitignored targets

## 9. Success Criteria

1. `bug-fix.md` names `/develop-bug` and `/review-bug` and gives the pipeline's actual step order
2. All three bug modes appear, each with its filename pattern and its numbering rule
3. The tracker-sync step appears, on both arms, and names which skill does it
4. No `## Change Log` is introduced into any bug-report guidance on the page
5. `which-path.md` routes a reported bug to the bug path rather than to `/create-story`
6. The hotfix boundary callout survives unchanged
7. Every internal link resolves against the tracked tree
8. The rewritten `bug-fix.md` is **≤ 200 lines**, keeping it inside the satellite tier that
   `docs/runbooks/README.md:58-61` places it in

## 10. Risk Assessment

**Low.** Documentation only, no skill or script touched. The one real risk is the rewrite importing
the story runbook's Change Log convention into a document type that forbids it — Success Criterion 4
exists for that specific mistake.

## 11. Rollback Plan

`git revert` the commit. No state, no migration.

---

## QA Testing Results

**QA Status**: PASS (cycle 2) — cycle 1 was FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-11
**Quality Score**: 95/100 (cycle 2); 70/100 (cycle 1)
**Gate Decision**: PASS

### QA Report

- **Cycle 2 (final)**: [task.107.qa.2.bug-runbook-rewrite.md](./task.107.qa.2.bug-runbook-rewrite.md) · [task.107.gate.2.bug-runbook-rewrite.yml](./task.107.gate.2.bug-runbook-rewrite.yml)
- **Cycle 1**: [task.107.qa.1.bug-runbook-rewrite.md](./task.107.qa.1.bug-runbook-rewrite.md) · [task.107.gate.1.bug-runbook-rewrite.yml](./task.107.gate.1.bug-runbook-rewrite.yml)

### Test Coverage Summary

- **Tests Executed**: 3156 (3155 pass, 0 fail, 1 skipped)
- **Phases Verified**: 4/4 — gate 2 records `phases_with_issues: []` (cycle 1 had flagged phase 2)
- **Critical Issues**: 0 open — cycle 1 found 1 HIGH / 1 MEDIUM / 2 LOW, cycle 2 found 1 LOW; all 5 resolved
- **NFR Status**: Security: PASS (`reasoned`), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Fix Cycles 1–2 — all five findings resolved (2026-09-11)

| Finding | Resolution |
| :--- | :--- |
| TASK-107-001 (high) | The delegation sentence is split by arm. The Jira sub-routine delegates (`invokes: [sync-jira-bug]`); the GitHub one creates the issue itself and never references `sync-github-bug`. Open/closed reconciliation is attributed to the full sync skills, with the note that Step 1 never runs them on the GitHub arm. **SC3 now met.** |
| TASK-107-002 (medium) | Verification block corrected — scoped to `REPORT="$BUG/$(basename "$BUG").md"` and the pattern changed to `^\*\*Status\*\*:`. **Re-run verbatim: prints `status: closed` + `**Status**: ✅ Closed`, then `1`, then `0`** — exactly what the comments claim. |
| TASK-107-003 (low) | The artifacts-directory claim now says the own-directory shape is the **general**-bug case, and that story/task bug artifacts sit in the parent's directory. |
| TASK-107-004 (low) | Trimmed 200 → 198 lines by linking rather than restating `develop-bug` content (Phase 0 block, delegation paragraph, pitfalls). The cycle-2 correction to TASK-107-005 returned it to **200**, which is the shipped figure and still inside Success Criterion 8. |
| TASK-107-005 (low, found in cycle 2) | The page asserted a companion-artifact filename shape for story/task bugs that no standard specifies and the corpus has **zero** instances of (0 of 62). Replaced with what is established, plus an explicit statement that the shape is not established by example. |

### Key Findings

**All eight success criteria met** after two QA cycles and a PR conformance review.

Cycle 1 (gate FAIL, 70/100) found the page claiming both tracker arms delegate to a sync skill when
only Jira does — Success Criterion 3 failing — and found the page's own verification block not
producing the results its comments claimed, on the one block the task required to be verified by
running it. Both fixed. Cycle 2's refute pass (gate PASS, 95/100) found one more of the same class:
an artifact-naming shape asserted from inference, with zero instances in a 62-file corpus. Fixed
in-cycle.

Step 5c (`/review-pr`) then returned **REQUEST CHANGES** on five findings, **all in the paper trail
and none in the deliverable** — chief among them a structural corruption of this document, where an
unanchored string replace spliced this section into the middle of §3. See
[`task.107.pr-review.1.bug-runbook-rewrite.md`](./task.107.pr-review.1.bug-runbook-rewrite.md).

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**Governing Gate:** `task.107.gate.2.bug-runbook-rewrite.yml` — ✅ PASS, 95/100, 0 open issues
**QA Cycles:** 2 (cycle 1 FAIL 70/100 → qa-fix → cycle 2 PASS 95/100)
**PR Conformance Review (Step 5c):** `task.107.pr-review.1.bug-runbook-rewrite.md` — REQUEST CHANGES → all 5 fixed → ✅ **APPROVE**
**CI:** ✅ `SUCCESS` on head `2cabae0188fd` (= local `HEAD`) — `test`, `link-check`, `shellcheck`, branch-policy

All Definition of Done criteria verified:

✅ **Success Criteria:** 8/8, each with a citation in the diff
✅ **Documentation:** all 4 files declared in §7 updated; CHANGELOG entry at `CHANGELOG.md:23`
✅ **Links:** 38 added links resolved against the tracked tree, 0 dead; CI `link-check` green
✅ **Security:** PASS — documentation only, no executable surface, no credentials, not a boundary
✅ **Compliance:** NOT_APPLICABLE — no GDPR / PII / payment / accessibility surface
✅ **Maintainability:** PASS — upgraded from CONCERNS once the restatement surface was reduced

⚠️ **No formal GitHub review exists on PR #387**, and that is structural: `/review-pr` is advisory by
design and never submits one. Acceptance rests on the QA gate, the 5c APPROVE and green CI — recorded
rather than rounded up.

**Detailed Verification Log:** See [`task.107.dod.1.bug-runbook-rewrite.md`](./task.107.dod.1.bug-runbook-rewrite.md)
for complete evidence, including the process-honesty notes on subagent reliability during this run.

**Task marked as ACCEPTED on:** 2026-09-11

---


## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2026-09-10 | 1.0     | Filed during v0.46.0 release doc sweep   | Claude |
| 2026-09-11 | 1.1     | Review passed (8/10) — corrected §1's inbound-link claim, bound the rewrite to the ≤200-line satellite budget (§4 + criterion 8), linked tracker issue #386, added Progress Tracking | review-task |
| 2026-09-11 |         | Implemented — bug-fix.md rewritten (68 → 200 lines), which-path.md bug branch added in 3 places, README description re-checked, CHANGELOG entry; 4 files, fast gate 3155/3155, 52 links checked | develop |
| 2026-09-11 |         | QA gate FAIL (70/100) — 4 findings: wrong skill named on the GitHub tracker arm (SC3), verification block does not run as documented, 2 low | qa-task |
| 2026-09-11 |         | QA findings fixed — all 4 resolved, 1 iteration; verification block re-run verbatim and now matches its comments | qa-fix |
| 2026-09-11 |         | QA gate PASS (95/100) — cycle-2 refute pass re-verified all 4 fixes against source; 1 new low finding corrected in-cycle; 8/8 success criteria | qa-task |
| 2026-09-11 |         | PR conformance review (Step 5c) REQUEST CHANGES — 5 findings, all in the paper trail; the QA section had been spliced into §3 by an unanchored replace. All 5 fixed | qa-fix |
| 2026-09-11 |         | PR conformance review re-run APPROVE — all 5 prior findings independently re-verified fixed; 4 further low trail findings (PC-6…PC-9) raised and fixed | qa-fix |
| 2026-09-11 | 1.2     | DoD verified — accepted (PR #387), CI green on head 2cabae01, QA gate PASS 95/100, 5c APPROVE | finalise |

## Progress Tracking

- [x] Step 1 — read the four bug skills and `docs/standards/bug-documents.md`; derive the step list from
      the skills, not from the current page
- [x] Step 2 — rewrite `docs/runbooks/bug-fix.md`; run every command it contains, or mark it illustrative
- [x] Step 3 — add the bug branch to `which-path.md`'s flowchart, prose fallback and quick-reference table
- [x] Step 4 — re-run the docs link check against the tracked tree
- [x] `docs/runbooks/README.md` one-line description re-checked against the new page

---

## References

- `docs/runbooks/bug-fix.md` — the page under rewrite
- `skills/develop-bug/SKILL.md`, `skills/review-bug/SKILL.md`
- `docs/standards/bug-documents.md`, `docs/standards/bug-registry.md`
- Filed from the v0.46.0 release documentation sweep, alongside the CHANGELOG and install-runbook gaps
  fixed in that release
