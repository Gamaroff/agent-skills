---
type: review-report
status: complete
bug: 'bug.12.review-syncs-relink-without-no-transition'
mode: 'validate-and-apply'
reviewed: '2026-09-06'
description: 'review-bug fix-readiness gate for bug.12 — READY TO FIX at 9/10, with a corrected Recommendation item 2 and a completed scope enumeration.'
---

# Bug Review — bug.12.review-syncs-relink-without-no-transition

## Executive Summary

| | |
|---|---|
| **Recommendation** | ✅ **READY TO FIX** |
| **Fix-readiness** | **9/10** |
| **Issues** | Critical 0 · Important 1 · Optional 2 |
| **Duplicate** | none |
| **Reproduces** | likely |
| **Mode** | general |

Score breakdown — Completeness 9, Reproducibility 9, Classification 10, Linkage 10.

The report is unusually well-evidenced: it names three call sites by file:line, names the flag that
fixes them, and reasons explicitly about why its own priority is below its parent bug's. Both pre-pass
scans came back clean. One Important correction was applied (below) because a fixer following the
Recommendation literally would have protected a call site that does not exist.

## Pre-pass Results

**Duplicate scan — `duplicate: none`.** `bug.11` explicitly deferred this work: its own report records
that CR-1 "is **not** fixed here … Filed as `bug.12` … so it is carried rather than dropped"
(`bug.11…md:267-271`). Registry rows 11 and 12 carry distinct Areas. The remaining ten bugs touch
unrelated areas. Same defect *class* at previously-unfixed sites is the intended remainder, not a re-file.

**Already-fixed / stale scan — `reproduces: likely`.** All three sites still lack the flag on current
`develop`.

| file:line | Step | `--no-transition`? | Intent |
|---|---|---|---|
| `skills/review-story/SKILL.md:2060` | 9.6 Sync Body Changes | **NO** | body-only → **defect** |
| `skills/review-task/SKILL.md:1482` | 8.6 Push Body Changes | **NO** | body-only → **defect** |
| `skills/review-epic/SKILL.md:767` | 11.5 Push Body Changes | **NO** | body-only → **defect** |
| `skills/review-story/SKILL.md:2142` | 10 Update Document Status | NO (correct) | deliberate status push |
| `skills/finalise/SKILL.md:1216` | 7 block 3 | YES | fixed by bug.11 |

The flag is real and central: `shared/resources/jira-sync.js:4194` returns
`{ transitioned: false, reason: "transition-suppressed" }` **before** `loadStatusMap` runs and before
any HTTP — it suppresses the whole status-resolution path, not merely the PUT. All three CLIs parse
`--no-transition` and forward it.

## Findings

### Important (1) — applied

**I-1 · Recommendation item 2 protected a call site that does not exist.** The report asked the fixer
not to add the flag to "`review-story` Step 10 / `review-task` Step 9". `review-story` Step 10 is real
(`SKILL.md:2142`). **`review-task` Step 9 is not a status push** — it edits the local `Status:` field
and Change Log and invokes no tracker sync; `review-task` has exactly one `sync-jira-task.js`
invocation, the Step 8.6 body sync. `review-epic` likewise has no deliberate push.

This is not merely a wording slip. It raises the scope question a fixer would hit immediately: *if
Step 8.6 gains `--no-transition`, what pushes `review-task`'s status?* Resolved during this review:
**Step 8.6 runs before Step 9**, so the status it pushes today is the *pre-promotion* value. It is not
functioning as the status push even accidentally — it pushes a stale one. Adding the flag removes a
wrong write rather than a needed one, and the `tracker-workflow.yaml` ladder remains the authority on
card position, which is the premise `bug.11` established.

Applied: item 2 rewritten with the correction quoted inline, plus the note that Step 9.6 and Step 10
currently share a command line and must be edited apart.

### Optional (2) — not applied

- **O-1** No labelled `**Impact**:` field under Bug Description; the information is present in
  `## Scope & Impact` (the mode-correct heading for a general bug). Structural nit only.
- **O-2** No labelled `**Related Files**` under Evidence; the file:line bullets cover it.

### Also applied

- Evidence line reference for `review-task` corrected 1481 → 1482.
- **Scope completeness recorded**: `syncDocumentStatus` exists only on the Jira path — no
  `sync-github-*` script calls it. The three sites are the *complete* enumeration, not a sample. Worth
  stating explicitly, since the failure mode that produced this bug was an incomplete enumeration.
- Status History row recording the review. Severity/priority unchanged (`Major`/`Medium` is correct
  and the report argues for it).

## Dimension Detail

**Template & frontmatter** — all required sections present; `type: bug` present; `status`/`severity`/
`priority` all in-vocabulary; identity consistent across filename, directory stem and body `Bug ID`.

**Reproducibility** — numbered, self-contained steps against a named environment, with explicit
Expected/Actual, Frequency and Reproducible fields. The pre-pass independently confirmed the premise
at exact line numbers.

**Classification** — `Major`/`Medium` justified in-report: a silently-undone *intermediate* status,
reachable from both standard pipelines, wrong rather than corrupting.

**Linkage** — general mode; `docs/bugs/bug-registry.md:41` row exists with status `new`, consistent
with frontmatter.

## Next Steps

Proceed to `develop-bug` Step 3. The fix is three one-flag edits plus a parity guard; the bug's own
Recommendation item 3 (a test asserting every shipped `sync-jira-*` invocation either carries the flag
or sits in a deliberate-push allowlist) is the right shape and should be treated as in scope — it is
what makes the *next* silent addition impossible, which is the failure mode that produced this bug.
