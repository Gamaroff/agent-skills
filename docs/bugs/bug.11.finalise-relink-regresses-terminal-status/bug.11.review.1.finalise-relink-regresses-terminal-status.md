---
type: review-report
status: complete
bug: 'bug.11.finalise-relink-regresses-terminal-status'
mode: 'validate-and-apply'
reviewer: 'review-bug'
created: '2026-09-06'
updated: '2026-09-06'
description: 'Fix-readiness review of bug.11 (finalise Document-link re-point regresses a card out of its terminal status). Verdict READY TO FIX, 9/10.'
---

# Bug Review — bug.11.finalise-relink-regresses-terminal-status

**Reviewed:** 2026-09-06T15:37:37Z
**Mode:** validate-and-apply (invoked by `/develop-bug` Step 2, autonomous)

## Executive Summary

| | |
|---|---|
| **Fix-readiness** | **9/10** |
| **Recommendation** | ✅ **READY TO FIX** |
| **Critical** | 3 (all auto-applied) |
| **Important** | 5 (all auto-applied) |
| **Optional** | 0 |
| **Duplicate** | none |
| **Reproduces** | likely |

Score breakdown — Completeness 9, Reproducibility 9, Classification 10, Linkage 10.

## Pre-pass Results

**Duplicate scan — `none`.** All 11 sibling bugs in `docs/bugs/` plus every `bug-registry.md`
row were compared. The nearest neighbour is bug.1 (`ready-for-development` cannot match a Jira
column of that name), which also concerns Jira status matching but is a *candidate-string
generation* defect on the way **in**; bug.11 is a *second resolver firing after a terminal
transition* on the way **out**. Different mechanism, different code path, not a duplicate.

**Already-fixed / stale scan — `likely` (defect still present).** Run inline rather than via an
Explore subagent: both checks are exactly-specifiable greps, so an inline run is faster and its
evidence is reproducible from this report.

- `grep -rn -- '--no-transition' skills/ shared/ evals/` returns **one** hit:
  `skills/finalise/SKILL.md:1129` — prose *describing* the durable fix. **No implementation.**
- `syncDocumentStatus` is still called unconditionally at four sites:
  `sync-jira-story.js:1149`, `sync-jira-task.js:947`, `sync-jira-epic.js:940` and `:1379`.

**On the partially-shipped recommendation.** PR #326 (merged 2026-09-06) shipped Recommendation
item **1 only** — the `finalise/SKILL.md` Step 7 documentation fix, which stops the step from
*asserting* the sync no-ops and requires a post-re-link verification. Item **2** — the
`--no-transition` flag that removes the second resolver from the path entirely — is untouched.
A partially-shipped recommendation is **not STALE**: the documented mitigation is a correction
after the fact, and the bug's own text names it as such ("the first cheap and shipped with this
bug, the second the durable fix").

## Findings

### Critical (3) — all auto-applied

| # | Finding | Resolution |
|---|---------|------------|
| C1 | `## Developer Fix Cycle` section absent — the section `develop-bug` Step 3 writes Investigation and Fix Implementation into. | ✅ Added as a stub. |
| C2 | `## Status History` table absent — a general bug's only history surface (bugs are excluded from the canonical Change Log). | ✅ Added, seeded with the filing row and this review's row. |
| C3 | `## Resolution Summary` section absent — the section Step 7's bug-close routine fills. | ✅ Added as a stub. |

### Important (5) — all auto-applied

| # | Finding | Resolution |
|---|---------|------------|
| I1 | `## Evidence` absent. For a Major bug this is what makes Step-3 root-cause localisation tractable. | ✅ Added — RAPP-715 observation, the transitions-API mechanism confirmation, the four call sites, and the grep proving the flag is unimplemented. |
| I2 | `**Environment**` not stated. | ✅ Added (Jira Cloud team-managed, `rebirth-wallet`, RAPP-715, 2026-09-05). |
| I3 | `**Frequency**` / `**Reproducible**` fields absent. | ✅ Added — Always / Yes. Deterministic given the `statusMap` and a workflow offering a non-terminal transition whose name is in the `accepted` list. |
| I4 | Heading `## Steps to Reproduce` is a non-canonical variant of the template's `## Reproduction Steps`. | ✅ Renamed. |
| I5 | Heading `## Impact` is not the general-bug violation heading `## Scope & Impact`. | ✅ Renamed. |

### Not findings — checked and correct

- **Frontmatter.** `type: bug` present (OKF's one hard requirement). `status: new` is in the
  general-bug lifecycle; `severity: Major`, `priority: High` are both in-vocabulary.
  `created`, `related`, `description` all present and well-formed. `updated:` was absent and
  has been added alongside the edits above.
- **Expected vs Actual.** Both already explicit and specific in Bug Description — no gap.
- **Severity / priority correctness — Major / High confirmed, unchanged.** A silent regression of a
  terminal status that strands the resolution is data-integrity-adjacent, not cosmetic, so Major is
  right; it is not Blocker because nothing is prevented from shipping and the code still lands.
  High priority is right because the configuration it hits is *the one this pipeline's own guidance
  recommends*, so the affected population is the population that took the advice.
- **Identity consistency.** Filename stem, directory stem, body `**Bug ID**: bug.11` and
  `MODE_KIND=general` all agree.
- **Linkage.** `docs/bugs/bug-registry.md` row 11 exists and reads `new`, consistent with
  frontmatter.
- **Tracker.** No `github_issue`/`jira_key` — Step 7's tracker comment skipped silently, as
  expected for a general bug.

## Next Steps

Proceed to `/develop-bug` Step 3. The fix to implement is Recommendation item 2:

> A `--no-transition` flag on `sync-jira-{story,task,epic}`, passed by finalise's re-link, so the
> re-link cannot carry a status decision at all.

**Explicitly out of scope** (the bug says so, and the reasoning should not be re-litigated):
reversing the Step 7 block order back to sync-first. That re-opens what task 40 closed.
