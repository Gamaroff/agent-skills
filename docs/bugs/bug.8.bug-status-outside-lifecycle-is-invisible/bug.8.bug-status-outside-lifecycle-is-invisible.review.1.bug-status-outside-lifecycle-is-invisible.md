---
type: review-report
status: complete
bug: 'bug.8.bug-status-outside-lifecycle-is-invisible'
mode: 'validate-and-apply'
reviewed: '2026-09-06'
description: 'Fix-readiness review of bug.8 (a bug status outside the lifecycle is invisible to selection) — READY TO FIX at 9/10, one Important evidence correction applied.'
---

# Review Report — bug.8.bug-status-outside-lifecycle-is-invisible

## Executive Summary

```
Bug: bug.8.bug-status-outside-lifecycle-is-invisible (general)
Fix-readiness: 9/10 — ✅ READY TO FIX
Critical: 0  Important: 1  Optional: 1
Duplicate: none   Reproduces: likely
Top blockers: none
```

**Score breakdown:** Completeness 10/10 · Reproducibility 9/10 · Classification 10/10 · Linkage 10/10 → 9.75 → **9/10** (the Reproducibility deduction is the corrected evidence claim, applied below).

## Pre-pass Results

**Duplicate scan — `none`.** All ten sibling general bugs plus every `docs/bugs/bug-registry.md` row were
read. The nearest neighbour is `bug.9` (registry frontier ignores `Depends on`, closed) — same file,
same function, but a different defect: bug.9 is about a gate that was never consulted, bug.8 is about a
gate that is consulted correctly and reports its refusal ambiguously. `bug.7` shares the abstract shape
("one signal standing for two states") and bug.8 already cites it; that is a cross-reference, not a
duplicate.

**Already-fixed / stale scan — `reproduces: likely`.** Both halves of the defect are live on HEAD
`9e54f93f`:

| Claim | Verified at | Still true? |
|---|---|---|
| `BUG_ELIGIBLE_STATUSES = {new, reopened}` | `skills/develop-next/scripts/select-next.mjs:127` | ✅ yes |
| Nothing validates a bug document's `status` against the lifecycle | `grep -rl "ready-for-qa" evals/ shared/ skills/*/tests/` returns only `select-next.test.mjs`, `develop-bug.test.js`, `review-bug.test.js` — all consumers, none a corpus validator | ✅ yes |
| An unrecognised status is indistinguishable from a terminal one | `command node skills/develop-next/scripts/select-next.mjs --lint` → 101 `passedOver` rows; 8 closed bugs and ~90 accepted tasks all carry the identical `outside the … eligibility floor` sentence, no `warnings[]` entry | ✅ yes |
| `review-bug`'s status check sits downstream of selection | `develop-bug` SKILL.md Step 2 runs only on an already-selected bug | ✅ yes |

The two *instances* the report cites are gone (`bug.6` is now `closed`, `bug.7` is now `new`) — the report
says so itself and correctly notes the defect that let them through is not. Confirmed: it is not.

## Findings

### Important

**[I1] The "not mentioned in `skipped[]`" claim understated what the code already does — APPLIED.**
Reproduction step 3 read "The bug is not selected and is not mentioned in `skipped[]`", which invites a
fixer to add a record. The record exists: `registryFrontier.passedOver[]` carries the row with
`reason: "document status open — outside the bug eligibility floor (new, reopened)"`, and that has been
true since the frontier shipped (`ef54b2b2`). The literal claim is accurate — it is in `passedOver`, not
`skipped[]` — but the framing pointed at the wrong fix.

The real defect is **indistinguishability, not absence**, which strengthens rather than weakens the bug:
the ambiguous reason is emitted for every terminal row too, so a typo hides in a crowd of ~98 identically
worded entries. Applied to Reproduction Steps §3 and to Suggested Fix §2, with the measurement that
supports it. `## Status History` row added.

### Optional

**[O1] Suggested Fix §3 (derive the enum rather than restating it) has more precedent than the report
cites.** `select-next.mjs:100–126` already carries a 27-line comment justifying the divergence between
`BUG_ELIGIBLE_STATUSES` and `develop-bug`'s proceed set, and `task.71` deliberately scoped the bug axis
out. A fixer choosing §3 should read that comment first — the eligibility floor and the lifecycle are
intentionally *not* the same set, so "derive one from the other" means deriving the **lifecycle
membership test** from the standard, not collapsing the two sets. Left as-is; this is fixer guidance, not
a report defect.

## Dimension Detail

**Template & frontmatter (Step 2) — clean.** All required body sections present, general-bug variant
correct (`## Scope & Impact`). Frontmatter carries every required field per
`docs/standards/bug-documents.md:54–63`: `type: bug`, `status: new` (in lifecycle), `severity: Major`,
`priority: High`, `created`, `related`, `description`. `updated`/`tags` are not required for bugs.
Identity consistent: filename stem ↔ directory stem ↔ body `Bug ID: bug.8` ↔ registry row 8.

**Reproducibility (Step 3) — strong.** Steps are numbered, self-contained, and step 2 is a runnable
one-liner that prints the eligibility floor. Environment named (`agent-skills` on `develop`, any Node,
no credentials). Expected vs Actual both explicit. `Frequency: Always`, `Reproducible: Yes`. Evidence
carries four file:line anchors, all of which resolved. One deduction for [I1].

**Severity / priority (Step 4) — correct, no change.** Major/High is right and the report defends it on
consequence rather than rate ("2 of 7 … that is the honest number"), which is the correct reasoning: a
Major bug can sit indefinitely in a registry that reports it as filed. Severity stays `Major`, priority
stays `High`.

**Mode & linkage (Step 5) — correct.** General bug; `related: 'none — cross-cutting (no single owner)'`
matches the standard's prescribed string. Registry row 8 exists, links the right path, and its `new`
status agrees with the document's.

## Fixes Applied

- ✅ **[I1]** Reproduction Steps §3 — replaced the `skipped[]` claim with the measured
  `registryFrontier.passedOver[]` behaviour and named the real gap (indistinguishability).
- ✅ **[I1]** Suggested Fix §2 — restated the candidate as "emit a `warnings[]` entry / distinct
  `reason` when the status is not a lifecycle member" rather than "surface it in `skipped[]`".
- ✅ Appended a `## Status History` row recording this review and the evidence correction.

No lifecycle `status` change (review-bug never transitions a bug — it stays `new`). No codebase edits.

## Next Steps

Proceed to `develop-bug` Step 3. The report's own Suggested Fix ordering is sound: **(1) a corpus
validator** asserting `status ∈ lifecycle` over `docs/bugs/*/bug.*.md` (and ideally the registry row) is
the cheap check that would have caught both real instances and runs in CI; **(2) a distinguishable
selector signal** closes the "silence" half. Heed the report's own `Do not` — widening
`BUG_ELIGIBLE_STATUSES` to admit `open` is explicitly out of bounds, and `select-next.mjs:100–126`
explains why the floor and the lifecycle are deliberately different sets.
