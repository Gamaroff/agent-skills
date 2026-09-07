---
type: review-report
status: complete
task: 'task.97.develop-task-review-gate-already-reviewed'
mode: 'validate-and-apply'
reviewer: 'review-task'
created: 2026-09-07
updated: 2026-09-07
reviewed: '2026-09-07'
description: 'review-task review of task.97 — 7/10 pre-fix, NEEDS REVISION; three Critical findings (Phase 1 branch falsified by measurement, freshness rule unimplementable as specified, testing strategy contradicts scope) all applied in Step 8.5, promoting the card to READY TO IMPLEMENT.'
tags: [review, develop-task, pipeline, review-gate]
---

# Task Review Report: Task 97 — /develop-task Step 2 has no recovery path when review-task Step 9 does not promote

**Reviewed:** 2026-09-07
**Review Depth:** Thorough
**Task Status:** Planned (at review time)
**Overall Assessment:** GOOD — well-evidenced diagnosis, three specification defects in the plan

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-09-07

---

## Executive Summary

This card's *diagnosis* is unusually good: it rejects a confident consumer report, cites the files that
falsify it, and every one of its line references (`develop-pipeline-step-2-review.md:44`, `:133`,
`develop-task/SKILL.md:247–249`) verifies exact against HEAD. The defects are in the *plan*, not the
analysis — and all three Critical ones are the same species: the plan commits to a mechanism without
having measured the ground it stands on.

Phase 1 asks a binary question ("is the HALT reachable at all?") whose answer is neither of its two
branches. The freshness rule names one of the two timestamps it needs. And the Testing Strategy demands
executable assertions against a change the Scope confines to two markdown files.

**Critical Issues:** 3 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — pipeline-autonomous run; every finding was resolvable from
measurement against the repository, so no ambiguity required operator input.
**Implementation Readiness:** 7/10 (pre-fix) → 9/10 (post-fix)
**Recommendation:** NEEDS REVISION (pre-fix) → **READY TO IMPLEMENT** (post-fix, all Critical + Important applied)

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline (Step 2/8), dispatched by `/develop-next`. Per the
autonomous-run directive, Step 0 output format, Step 8.5 (apply fixes) and Step 9 (promote status) were
auto-answered rather than prompted. **No clarifying questions were raised**, and that is a finding in
itself rather than an omission: each of the eight issues below was settled by measurement against this
repository, not by preference. Where a genuine scope judgement was required — Critical 3, whether to widen
§4/§7 or narrow §8/§9 — the decision, its rationale and its authority are recorded explicitly in that
finding rather than being made silently.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present (`## 1. Overview` … `## 11. Rollback Plan`), plus Change Log,
Progress Tracking, References and Notes. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere. Filename
`task.97.develop-task-review-gate-already-reviewed.md` matches `task.{n}.{kebab-name}.md`.

- **OKF conformance**: `type: task` present and non-empty (the one hard requirement), `description`
  present, `tags` a well-formed list, `updated` present. Pass.
- **Tracker linkage**: `github_issue: 348` present; issue exists and is OPEN; body cross-reference
  `**GitHub Issue**: [#348](https://github.com/Gamaroff/agent-skills/issues/348)` matches frontmatter.
  Board Priority was unset and was defaulted to `P2 – Medium` during Step 1.
- **Card preflight**: `sync-jira-task.js --check-card` → `ok: true`, zero findings. All three card blocks
  resolve (Summary 534 chars, Success Criteria 405, Breaking Changes 122), with `+2`, `+4`, `+2` omitted
  respectively — informational, not defects.
- **Stakeholder Sign-off**: `sign-off` is absent from `skills-config.yaml`, so this check is skipped
  entirely and nothing is flagged. (Its *enforcement* setting is nevertheless load-bearing for this
  task's subject matter — see Critical 1.)
- **Change Log**: present with two rows (1.0, 1.1); `status` has not advanced past `planned`, so the
  currency heuristic does not fire. Pass.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ACCURATE — with one unimplementable mechanism
**Hallucinations Detected:** 0

Every technical claim the card makes about the current state was verified and holds:

| Card's claim | Verification |
| --- | --- |
| `develop-pipeline-step-2-review.md:44` is the `Planned` → run row | ✅ exact at HEAD |
| `:133` is the `Planned` (unchanged) → HALT row | ✅ exact at HEAD |
| `develop-task/SKILL.md:247–249` are the Step 8.5 / Step 9 default rows | ✅ exact at HEAD |
| `/review-task` **does** promote `planned → ready-for-development` | ✅ `review-task/SKILL.md` Step 9 |
| `ready-for-development` is set by `review-story` **and** `review-task` | ✅ `document-status-lifecycle.md:59` |
| The consumer's "two contradictory tables" diagnosis is false | ✅ confirmed — the tables are consistent |
| The change is unimplemented | ✅ confirmed upstream **and** in both bundled copies |

The rebuttal of the consumer report is sound and well-sourced. The defect is elsewhere.

### Issues

#### 🚨 Critical 2 — The freshness rule names only one of the two timestamps it needs

**Location:** §6 Phase 2, lines 170–176.

Phase 2 defines a "current review report" as one that "is not older than the task document's last content
change", and mandates deriving freshness from frontmatter `updated:`, "**never** filesystem mtime".

The task document has `updated:`. **The review report does not.** Measured across all 49 task review
reports tracked in this repository:

| Property of `task.{id}.review.*.md` | Count |
| --- | --- |
| Carries any YAML frontmatter block at all | **7 / 49** |
| Carries a frontmatter `updated:` field | **6 / 49** |
| Carries **no** frontmatter date field of any kind | **42 / 49** |
| Carries a body `**Reviewed:** YYYY-MM-DD` line | **49 / 49** |
| Carries a body `- **Review Date:** YYYY-MM-DD` line | **49 / 49** |

So the rule as written is half-specified: it names the task's timestamp and leaves the report's undefined
by any non-mtime source, for 86% of the corpus it exists to serve. Nor can this be waved off as an
adoption boundary — the canonical report filename (`task.{n}.review.{N}.{name}.md`) deliberately dropped
the date that older reports carried in the filename, so there is no filename fallback either.

Left unresolved, the rule has two failure modes and both are bad: "no timestamp → stale" means the skip
never fires for the corpus it was written for and the task delivers nothing; "no timestamp → fresh" is the
over-permissive read that develops against an unreviewed card, which §10 itself names as the worse failure.

**Fix applied:** Phase 2 now specifies the report-side timestamp explicitly — body `**Reviewed:**`, falling
back to `- **Review Date:**` — both of which are present in 49/49 reports and, being file *content*, are
clone-stable in exactly the way the phase demands. Behaviour when neither parses is defined as **stale**,
which is the safe direction §10 already argues for.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### 🚨 Critical 1 — Phase 1's two branches are both falsified by measurement

**Location:** §6 Phase 1, lines 152–166; §8.1; §9 criterion 1.

Phase 1 poses a binary: *establish whether the post-review HALT is reachable at all*, and *if it is
unreachable, narrow this card to the skip table alone*. Measurement returns a third answer that neither
branch handles — the HALT is **conditionally reachable**, through the pipeline, under non-default
configuration:

1. **The sign-off gate.** `review-task/SKILL.md:1517–1523`: when `sign-off.enabled: true` **and**
   `sign-off.enforcement: blocking`, an unsigned required row means "do **not** promote the status —
   regardless of the review outcome, **and including the pipeline auto-answer path**". The text then
   states outright: "`develop-task` will HALT at Step 2 until then." This path runs a full review, writes
   a comprehensive report, applies fixes, auto-answers Step 9 "Yes, fixes complete" — and still returns
   `Planned` to the post-review table. **This is the card's thesis, confirmed verbatim in the source**, and
   re-running the review is a provable no-op because the gate re-fires identically.
2. **The change-log blocking gate.** `review-task/SKILL.md:524`: under `change-log.enforcement: blocking`,
   a missing or stale log is Critical → NO-GO → "do **not** promote the task out of `planned`".
3. **Not** a path: NEEDS REVISION / REQUIRES REWORK halts *inside* `/review-task` Step 9
   (`SKILL.md:1503`), short-circuiting ahead of the post-review table.
4. **Not** a path: "a review that produced no report" —
   `develop-pipeline-step-2-review.md:110` says a missing report is logged "but do not halt".

Under this repository's stock defaults (sign-off absent, change-log advisory) with a READY outcome, Step 9
promotes and the HALT is never entered — which is precisely why it has never been observed here, and why
the consumer *predicted* rather than *hit* it.

This matters for the plan, not just the record. The "narrow the card" branch must **not** be taken: the
post-review table is live code for any consumer running blocking enforcement. And §8.1's "reproduce the
halt before changing anything" is not a matter of driving an ordinary task through Step 2 — it requires
*constructing* a blocking-enforcement config first, which §8 does not say.

**Fix applied:** Phase 1 rewritten to record the conditional-reachability result and its two named
mechanisms, with the "narrow the card" branch removed as falsified. §8.1 now specifies the config the
reproduction requires.

#### ⚠️ Important 5 — §7 Files Summary omits two affected files

**Location:** §7, lines 201–211.

- `shared/resources/develop-pipeline-step-2-review.md:152` — the Handling Findings bullet independently
  restates the rule as "**Blocking issues** (… or status still `Planned` after review)". §7 names "both
  tables, the halt message, plus the reasoning note" but not this prose, which would directly contradict
  the new table if left alone. Same file, but a fourth edit site the plan does not point at.
- `evals/develop-task/step-isolation/02-review-task/scenario.json:4` — its `description` encodes the
  current semantics ("Step 2: review-task skipped when task is ready-for-development and review report
  exists"). Appears in neither §7 nor §8.

**Fix applied:** both added to §7.

#### ⚠️ Important 7 — Phase 4 is written as a verification; measurement shows it is an edit

**Location:** §6 Phase 4, line 195; §7 row 2.

Phase 4 says "**confirm** the Step 8.5 / Step 9 rows still read correctly … and that no row implies
promotion is the *only* route past Step 2". They do imply exactly that. `develop-task/SKILL.md:248` reads
"pipeline needs `Ready for Development` before Step 3" — an unconditional statement that the new skip path
falsifies. It is also silent about the sign-off and change-log gates, which withhold promotion *on a READY
TO IMPLEMENT outcome* — the one case row 248 claims is safe.

**Fix applied:** Phase 4 restated as an edit with the specific row named, and §7's "Verify / modify"
changed to "Modify".

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### 🚨 Critical 3 — The Testing Strategy contradicts the Scope, and there is no test net to extend

**Location:** §8 (all five items) vs §4, §7 and §10.

§8 demands executable evidence: falsify the current behaviour first; assert both skip directions; assert
the genuine HALT survives; assert freshness "**in a clone where every mtime is the checkout time**"; and
assert "on the halt text naming the failed precondition". §9 repeats the clone requirement as a success
criterion.

§4 scopes the work to tables, a freshness definition, a message and a note. §7 lists two real files, both
markdown. §10 calls it "a documentation resource with no runtime". **Nothing in that scope can execute in
a fresh clone or assert on a message.**

And there is nothing to extend. Measured across the whole repository, no test asserts a row of either
table, the `Planned` status, the HALT, its message, or report freshness. What exists is:

| Test | What it actually asserts |
| --- | --- |
| `evals/develop-task/protocol/step-contract.test.mjs:38` | `STEP_KEYWORDS[2] = ["review","skip"]` appear *somewhere* in the file |
| `evals/develop-task/protocol/pipeline-shape.test.mjs:61` | `SKILL.md` references the filename |
| `evals/develop-task/step-isolation/02-review-task/scenario.json` | `fileExists` on a pre-seeded replay fixture |

The keyword test would pass with **both tables deleted entirely**, because "review" and "skip" occur
throughout the surrounding prose. The scenario's single assertion cannot distinguish a skip from a run.
This is the "assert the source text, not the behaviour" shape this repository has repeatedly found and
repeatedly paid for; §8's five cases are not extensions of a net, they are the whole net.

**Decision taken, and on whose authority.** Two resolutions exist — widen §4/§7 to include an executable
freshness/gate helper plus its test file, or narrow §8/§9 to what prose review can carry. This review
widened, and the choice was not a preference:

- §10 already argues the governing principle — a wrong skip (developing against an unreviewed card) is
  worse than a needless halt — and a rule enforced only by prose has no mechanism to be wrong *loudly*.
- §8.4's fresh-clone requirement is unsatisfiable by any prose artifact, so narrowing would mean deleting
  a stated requirement rather than meeting it.
- §4's out-of-scope list bars `/develop-story`'s tables, `/review-task` Step 9 and the status lifecycle. It
  does **not** bar adding an implementation file, so widening breaks no stated boundary.

This is the single judgement call in this review that was not settled purely by measurement, and it
increases the card's true effort. It is flagged here rather than buried in the diff.

**Fix applied:** §4 In-scope, §7 Files Summary and §8 reconciled around a small executable helper
(`shared/resources/review-report-freshness.js`) plus its test file; §10's "no runtime" characterisation
corrected; §9's clone criterion now points at something that can satisfy it.

#### ⚠️ Important 4 — "Never mtime" contradicts sibling prior art that is neither cited nor reconciled

**Location:** §6 Phase 2, line 174.

Phase 2's reasoning against mtime (it does not survive a fresh clone, which is what CI and
`/develop-batch` worktrees run in) is correct and worth keeping. But this pipeline family **already has a
freshness convention, and it is mtime-based**, for the structurally identical comparison —
`develop-pipeline-resume-contract.md:95–110`:

```bash
_mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1"; }
plan=$(ls {task-directory}/task.{id}.plan.*.md 2>/dev/null | head -1)
[ -n "$plan" ] && [ "$(_mtime "$plan")" -ge "$(_mtime {task-file})" ]
```

Same shape: is this artifact at least as fresh as the task file? `pipeline-resume-detector-prompt.md:50`
and `:133–148` do likewise. Adopting a contradictory rule two documents away, without naming it, leaves
the pipeline holding two incompatible conventions and the next reader with no way to tell which governs.

By the card's own argument the existing rule is defective — but fixing it is out of scope here, and that
is a legitimate answer. What is not legitimate is silence.

**Fix applied:** Phase 2 now names the resume-contract rule, states that Step 2 deliberately diverges and
why, and records that the resume-contract rule is left as-is for a separate card.

#### ⚠️ Important 8 — Phase 1's finding puts a `review-task` defect in scope by §4's own conditional

**Location:** §4 out-of-scope clause; §6 Phase 1.

§4 places "`/review-task`'s Step 9 behaviour" out of scope "**unless Phase 1 finds it is the actual
fault**". Phase 1 now finds it is part of the fault surface, and measurement exposes a concrete asymmetry:
the sign-off gate is written as a numbered gate *inside* Step 9 (`review-task/SKILL.md:1a`), whereas the
change-log blocking gate's identical "do not promote" instruction lives **only** in check 4b's severity
table at `:524` and is never restated in Step 9. An agent executing Step 9 linearly may honour the first
and miss the second — the two gates that produce this card's HALT are documented with unequal force.

**Fix applied:** recorded in §6 Phase 1 and §12 References as a finding, with the follow-up explicitly
*not* taken here (it is a `review-task` change, and this card's §5 promises no behaviour change there).

#### ⚠️ Important 6 — §9 criterion 1 may be unsatisfiable from this repository

**Location:** §9, first criterion.

"Phase 1 records, with evidence, why Step 9 did not promote in the reported incident." The incident is in
`rebirth-wallet` — a different repository, not available here. The candidate causes can be narrowed by
reasoning about *this* repo's skills (and Phase 1 now does exactly that), but the specific answer for that
specific run cannot be evidenced from here. A success criterion that cannot be met turns a completable
card into one that must be waived.

**Fix applied:** criterion reframed to what is establishable here, with an explicit requirement to record
what could **not** be determined and why — which is the more useful artifact anyway, and matches the
card's own stated purpose of stopping the next reader repeating a confident wrong diagnosis.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

§10 is better than most: it names over-correction as the primary risk, correctly ranks a wrong skip above
a needless halt, names "fixing the wrong thing" as the second risk with Phase 1 as its mitigation, and
names the inaction risk (the workaround becoming convention). §11 Rollback is proportionate — revert,
re-bundle, re-release — and is accurate now that nothing depends on the new behaviour.

### Issues

#### 💡 Optional 9 — "No runtime" understates the change

`develop-pipeline-step-2-review.md` is prose that *embeds shell the orchestrator executes* (the gate-check
`ls` at line 25). Calling the resource one "with no runtime" was already loose, and becomes wrong once
Critical 3's helper is in scope. Corrected in §10 as part of that fix; risk level stays **Low**, which
remains the right call.

#### 💡 Optional 10 — "exactly as `in-progress` + a report already does" is not exact

§3 Target state says `planned` + a current report should skip "exactly as `in-progress` + a report already
does". It does not: the `in-progress` and `ready-for-development` rows skip on report **existence alone**,
with no freshness test at all. The new `planned` rule is strictly stricter than its stated model.

Worth stating plainly because it raises a consistency question the card should answer deliberately rather
than by omission — if a stale report is not evidence of review for a `planned` task, it is not evidence
for an `in-progress` one either. Extending freshness to those rows is defensible; so is leaving them, on
the grounds that reaching `in-progress` required passing this gate already. Either is fine; silence is not.

**Fix applied:** §3 wording corrected, and the question answered explicitly (freshness applies to the
`planned` row only, with the reason recorded).

---

## Summary of Recommendations

### Must Fix (Critical) — 3 issues

1. **Rewrite Phase 1** around the measured answer: the HALT is *conditionally* reachable via the sign-off
   and change-log blocking gates, not reachable-by-default and not unreachable. Remove the falsified
   "narrow the card" branch.
2. **Specify the report-side timestamp** in Phase 2 — body `**Reviewed:**`, falling back to
   `- **Review Date:**` (49/49 coverage), with unparseable → stale.
3. **Reconcile §8 with §4/§7/§10** by widening scope to a small executable helper plus its test file, so
   the five stated test cases become satisfiable.

### Should Fix (Important) — 5 issues

4. Name and reconcile the mtime prior art in `develop-pipeline-resume-contract.md:95–110`.
5. Add the two omitted edit sites to §7 (`:152` prose; the eval scenario).
6. Reframe §9 criterion 1 to what this repository can evidence.
7. Restate Phase 4 as an edit to `develop-task/SKILL.md:248`, not a verification.
8. Record the change-log-gate documentation asymmetry surfaced by Phase 1, without acting on it here.

### Consider (Optional) — 2 items

9. Correct the "no runtime" characterisation in §10.
10. Correct "exactly as `in-progress` … does" in §3 and answer the freshness-consistency question.

---

## Implementation Readiness Assessment

**Score:** 7/10 (pre-fix) → **9/10** (post-fix)

**Scoring Breakdown (pre-fix):**

- Template Compliance: 10/10 — every section, no placeholders, card preflight clean, OKF conformant
- Technical Accuracy: 7/10 — all citations exact and the consumer rebuttal sound; one unimplementable mechanism
- Implementation Clarity: 6/10 — Phase 1's branches falsified, Phase 4 mis-typed, two edit sites missing
- Consistency: 5/10 — §8 directly contradicts §4/§7/§10, with no test net to extend
- Risk Management: 8/10 — genuinely good risk analysis; "no runtime" understated

**Confidence Level for Successful Implementation:** High (post-fix)

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** All three Critical findings were specification gaps in the plan, every one resolvable
from measurement against this repository, and all were applied in Step 8.5 — no finding required
information only the operator holds. The card's analysis was already sound; it now has a plan that matches
it. The one judgement call (Critical 3's scope widening) is recorded in full above rather than applied
silently, so it can be reversed by an operator who disagrees.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work Phase 1 first and **record its findings** — it is a research phase whose output is a written
   record, not a code change, and it now has a concrete answer to confirm rather than an open question.
2. Implement Phase 2's freshness helper with its tests before touching either table, so Phase 3's rows
   have something real to reference.
3. Take Phase 3's two table edits together with the `:152` prose bullet — three sites, one behaviour.
4. Run `npm run bundle` after every `shared/resources/` edit; CI enforces bundle freshness and the two
   bundled copies must not be hand-edited.
5. Mutation-prove each test: revert the behaviour and confirm the test goes red. Given that the existing
   keyword test survives deleting both tables, a green suite is not evidence on this task.

---

## Review Metadata

- **Reviewer:** review-task (Claude), invoked by `/develop-task` Step 2/8 under `/develop-next`
- **Review Date:** 2026-09-07
- **Review Depth:** Thorough
- **Task File:** `docs/tasks/task.97.develop-task-review-gate-already-reviewed/task.97.develop-task-review-gate-already-reviewed.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md`, `source-tree.md`
- **Other Sources Consulted:** `shared/resources/develop-pipeline-step-2-review.md`, `develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-resume-contract.md`, `document-status-lifecycle.md`, `skills/review-task/SKILL.md`, `skills/develop-task/SKILL.md`, `evals/develop-task/protocol/*`, `evals/develop-task/step-isolation/02-review-task/`
- **Pre-pass agents:** 2 (architecture alignment → `drift`; codebase already-implemented → `not-implemented`)
- **Corpus measurement:** 49 tracked `task.{id}.review.*.md` files surveyed for frontmatter and body date fields
