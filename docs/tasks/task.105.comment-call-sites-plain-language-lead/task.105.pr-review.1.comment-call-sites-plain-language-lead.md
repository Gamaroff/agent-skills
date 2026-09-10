# PR Review Report: PR #379 — feat(task.105): feed the plain-language lead at every call site, and close the bypass

**Reviewed:** 2026-09-10
**PR:** [#379](https://github.com/Gamaroff/agent-skills/pull/379) — `feature/task.105.comment-call-sites-plain-language-lead` → `develop` (OPEN)
**Work item:** [`task.105.comment-call-sites-plain-language-lead.md`](./task.105.comment-call-sites-plain-language-lead.md) — resolved via `branch stem`
**Tracker:** [#378](https://github.com/Gamaroff/agent-skills/issues/378) — OPEN
**Verdict:** ⚠️ **CONCERNS**

**Scope of diff reviewed:** `origin/develop...origin/feature/task.105.*`, 26 files / 3332 lines, with
`skills/*/references/*` excluded as `npm run bundle` output (47 generated copies, byte-identical to
their `shared/resources/` sources).

> **Both lenses were run in-line by the agent that wrote the change, and that is this review's main
> limitation.** The code lens ran at QA Step 3b and the conformance lens here; **both subagents hung
> and were killed** (~6 and ~8 minutes, no return) — the third and fourth such hang in this session.
> Every conclusion below was reached by *executing* or *mechanically checking* something rather than by
> re-reading, which is the best available substitute for independence, and it did find real defects.
> It is still a substitute. This is the second of the two reasons the QA gate reads CONCERNS.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.105.implementation.1.*.md` — Pipeline Progress 1–5 ✅ |
| Review report | ✅ | `task.105.review.1.*.md` — READY TO IMPLEMENT, 8/10, 1 Critical + 6 Important applied |
| QA reports | 1 | `task.105.qa.1.*.md` |
| Gate | CONCERNS | `task.105.gate.1.*.yml` (90/100), `top_issues: []` |
| DoD | ❌ | Not yet written — Step 7 has not run. Correct at this point in the pipeline |
| Sprint review | ❌ | Same — Step 7 artifact |
| Open bugs | 0 | No `*.bug.*.md` |
| Handover | ❌ | None — `access.tracker` is `full`, nothing deferred |
| Plan | ✅ | `task.105.plan.*.md` — corrected at review (three factual errors) |

---

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence in diff | Status |
|---|---|---|
| Every call site passes a slot, bound, name the stage reads | `shared/resources/tests/comment-slot-coverage.test.mjs` assertions 1–3; 24 sites walked, non-vacuity floor ≥20 | ✅ met |
| Zero bare `gh issue comment` outside the allowlist | `tests/mutation-call-site-coverage.test.js` §1; independent 920-file walk → 4 survivors, all intended | ✅ met |
| All seven converted sites post a marker, idempotent on re-run | **Executed**: re-run against an issue carrying the `done` marker → `posted: false, reason: "already"` | ✅ met |
| `review-story`'s two arms produce the same text | One call, one body (`skills/review-story/SKILL.md`) | ✅ met |
| Comment-then-close ordering asserted | Guard B assertion 5; mutation-proved by swapping the order | ✅ met |
| No extra round-trip except the two closes | Structural — slots are argv on existing calls | ✅ met |
| No `references/` hand-edited; bundle idempotent | Content-hash comparison across two consecutive `npm run bundle` runs | ✅ met |
| `qa-fix`'s two bodies share one variable | `$FIX_SUMMARY` → `$PR_COMMENT_BODY` / `$TRACKER_COMMENT_BODY` | ✅ met |
| Every converted site reads `reason`, none posts over `unverifiable` | Contract pointer + `\|\| echo … continuing` at each site | ✅ met |
| Contract's migration paragraph rewritten, not deleted | `tracker-comment-contract.md` — rewritten *and* explains why the guard exists | ✅ met |
| Consumer docs swept | `AGENTS.md` corrected; roadmap hits are historical | ✅ met |

---

## Conformance Findings

**[PC-1] consistency · medium · confidence: high — `task.105…md` §9 criterion 1**
§9 read "All **22** call sites" while the change delivers **24** — `step-7-finalise.md`'s GitHub arm
turns each of two bare `gh` pairs into a `tracker-comment.js` site, where §3's inventory counted each
pair once. A criterion pinned to a number has to be edited by whoever is proving it.
→ **Fixed in this review**: rewritten to "**Every** call site …", with Guard B's population walk as the
arbiter and the 22→24 delta explained inline.

**[PC-2] consistency · medium · confidence: high — `task.105…md` §9 criterion 3**
§9 read "the **five** converted sites" while §3's table and §5.1 both say **seven**. Five is §6 Phase
3's local count — three plain `gh issue comment` plus two `gh issue close --comment` — which excludes
the two converted in Phase 2. A reader could not tell which number the criterion meant.
→ **Fixed in this review**: "**All seven** converted sites", with the arithmetic explained.

**[PC-3] trail · low · confidence: high — `task.105.implementation.1.*.md`**
The hung QA code-review subagent was disclosed in the QA report, the gate's `status_reason` and the
Change Log row, but **not** in the implementation report's Issues Log — the one artifact a reader
consults for "what went wrong during the run".
→ **Fixed in this review**: added to the Issues Log under a Step 5 heading.

**[PC-4] consistency · low · confidence: high — `task.105…md` §7**
§7 claimed 18 modified sources; the diff has **20 modified + 1 added**. `AGENTS.md`,
`shared/resources/tests/review-report-freshness.test.mjs` and the new
`shared/resources/tests/comment-slot-coverage.test.mjs` were absent.
→ **Fixed in this review**: §7 rewritten with the real set, grouped by purpose, and the debatable file
named explicitly.

**[PC-5] scope · low · confidence: high — `shared/resources/tests/review-report-freshness.test.mjs`**
This file is neither a call site nor a doc sweep, so it sits outside §4's stated In Scope. It was
modified to **narrow** a pre-existing guard that pinned every line of every `#### develop-story`
section against `origin/develop`.

**Verdict on the narrowing: legitimate, and the alternative was worse.** The guard was written to hold
one earlier task's promise that its *decision tables* were unchanged, but it pinned the entire
`develop-story` half of the file — so it blocked this task's *correct* change (adding slots is required
at both arms, because the lead is a property of the moment, not of the tracker). The three ways out
were: contort the change to avoid the section, delete the guard, or narrow it to the promise actually
made. The third is the only one that keeps the protection, and it was mutation-proved. Recorded as a
scope finding rather than waved through, because "a guard blocked me so I edited the guard" is a shape
that deserves a reviewer's eye every time.

---

## Code Review Findings

Run in-line at QA Step 3b after the subagent hung. Full detail in
[`task.105.qa.1.*.md`](./task.105.qa.1.comment-call-sites-plain-language-lead.md) § Code Review.

**[CR-1] bug · medium · confidence: high — `tests/mutation-call-site-coverage.test.js`**
Guard A still missed connective-chained invocations (`true && gh issue comment …`) after its first
repair. Found by probing with eight shell forms, not by reading.
→ **Fixed in-cycle**; all eight forms now caught, with a false-positive check confirming prose is
still ignored.

**[CR-2] bug · low · confidence: high — `shared/resources/tests/comment-slot-coverage.test.mjs`**
Guard B derived slot names by regex-scanning template source for `s.NAME`, which a destructured
template would defeat — causing it to reject *correct* call sites.
→ **Fixed in-cycle**: a sixth assertion cross-checks the scan against rendering; mutation-proved.

**Cleanups (3, advisory, not actioned):** duplicated story/task variants in `step-7-finalise.md`
(follows the file's existing convention); near-identical Step 13b blocks in `qa-story`/`qa-task` (no
mechanism exists for sharing a fragment between two `SKILL.md` files); `renderLead`-based derivation is
arguably a better primary implementation for `slotsReadBy` than the regex.

---

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md:438"
    finding: "Success criterion 1 was pinned to '22 call sites' while the change delivers 24."
    suggested_action: "Make the criterion count-independent and let Guard B's population walk be the arbiter."
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md:452"
    finding: "Success criterion 3 said 'the five converted sites' while §3 and §5.1 both say seven."
    suggested_action: "State seven, and explain that five is Phase 3's local count."
  - id: PC-3
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.105.comment-call-sites-plain-language-lead/task.105.implementation.1.comment-call-sites-plain-language-lead.md"
    finding: "The hung QA code-review subagent was not disclosed in the implementation report's Issues Log."
    suggested_action: "Add it, so the artifact a reader consults for run problems carries it."
  - id: PC-4
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md:340"
    finding: "§7 Files Summary claimed 18 modified sources; the diff has 20 modified and 1 added."
    suggested_action: "Rewrite §7 with the real set and name the out-of-scope-looking file explicitly."
  - id: PC-5
    category: scope
    severity: low
    confidence: high
    ref: "shared/resources/tests/review-report-freshness.test.mjs"
    finding: "A pre-existing guard was narrowed; the file sits outside §4's stated In Scope."
    suggested_action: "No change — the narrowing is legitimate and mutation-proved; recorded for a reviewer's eye."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "tests/mutation-call-site-coverage.test.js:180"
    finding: "Guard A missed connective-chained invocations (`cmd && gh issue comment ...`) after its first repair."
    suggested_action: "Keep only the text after the last shell connective before testing the prefix."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/tests/comment-slot-coverage.test.mjs:47"
    finding: "slotsReadBy regex-scans template source, so a destructured template would make Guard B reject correct call sites."
    suggested_action: "Cross-check the scan against rendering and fail when they disagree."
truncated_count: 0
```

---

## Recommended Actions

1. **None blocking.** All seven findings are fixed or deliberately accepted; PC-1 through PC-4 were
   fixed during this review, CR-1 and CR-2 during the QA cycle, and PC-5 is a recorded judgement.
2. Carry the QA gate's two CONCERNS into Step 7 rather than dropping them: the traded-away retry
   (Reliability) and the absent independent review.
3. Future work, already in the gate's `recommendations.future`: a retry that does not also defer;
   moving the `outcome` mapping into `stakeholder-summary.js`; observation #49's card-preflight gap.

---

## Verdict

⚠️ **CONCERNS** — per the deterministic table: no finding is `high` severity, and two are `medium`
(PC-1, PC-2, CR-1), which is the middle row exactly. Advisory: this review writes no gate, submits no
formal GitHub review, and edited no code — the four document fixes it made are work-item corrections,
which is what a conformance lens is for.

**This does not block Step 7.** `CONCERNS` from 5c records findings without routing back to `/qa-fix`.
