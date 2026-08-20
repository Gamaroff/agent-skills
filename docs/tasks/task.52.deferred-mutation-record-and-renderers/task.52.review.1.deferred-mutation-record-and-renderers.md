# Task Review Report: Task 52 — One deferred-mutation record, four renderings of it

**Reviewed:** 2026-08-18
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** NEEDS IMPROVEMENT

> **Implementation Status**: ✅ All 9 critical + important recommendations implemented — 2026-08-18. Post-fix readiness: **9/10 — READY TO IMPLEMENT**. The 5 optional items remain open by choice.

---

## Executive Summary

The organising idea is strong and the document argues it well — one record, rendered many ways, proven
against fixtures before anything depends on it. Every factual claim about the repository checked out:
the `.claude/state/` home, the artifact grammar in `file-naming.md`, the two implementation-report
templates and their `Issues Log`, `jira-stage.js --print-plan` being credential-free. The tracker-card
preflight passes clean.

What lets it down is that the *shippable* half of the scope never reaches the plan. Gating
`jira-stage.js` and `gh-stage.js` is named in Scope as the thing that makes this unit useful on its
own, and then appears in no implementation step, no Files Summary row, no test case and no success
criterion — while the Risk Assessment simultaneously claims nothing touches an existing execution
path, which those two CLIs emphatically do. Alongside that, three of the document's own headline
invariants rest on terms it never defines: which "four" the renderers are, what the 20 kinds are, and
what the committed artifacts are called.

**Critical Issues:** 2 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 7 questions asked and answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1 — Scope, consistency and definitions

**Q1: Stage-CLI gating is in Scope but absent from the plan, tests, criteria and risk profile.**
- **User Decision**: Keep in scope; add the missing plan steps, Files Summary rows, test case and
  success criterion, and correct the Risk Assessment to acknowledge an existing execution path
  (raise risk to Medium).
- **Impact**: Plan grows two steps; Files Summary gains two rows; Risk Assessment and Rollback Plan
  both need rewriting; `risk_level` frontmatter changes.

**Q2: Two different sets of "four" used interchangeably.**
- **User Decision**: Output formats are the renderers — markdown checklist, shell script, JSON
  sidecar, inline summary. Access mode selects which renderers run; it is not itself a renderer.
- **Impact**: Plan step 2 must expose a fourth output (the inline summary) alongside `md|sh|json`.
  The `20 × 4` test matrix becomes well defined. Motivation keeps the four access modes but must
  stop calling them renderers.

**Q3: The "20 kinds" catalogue is nowhere in the repo.**
- **User Decision**: This task defines it, in `tracker-access-record.md`, with the per-system
  breakdown so the count is checkable.
- **Impact**: Plan step 3 grows an explicit deliverable; the totality test gains a real source to
  enumerate from.

**Q4: `.tracker-actions/` gitignore step contradicts the "commit all three artifacts" decision.**
- **User Decision**: Stale — a leftover from the superseded decision. Delete it from step 8; keep
  only the fixture-negation half of that step.
- **Impact**: Step 8 shrinks to the `.gitignore` fixture concern alone.

### Question Point 2 — Structure and sizing

**Q5: Four template sections absent.**
- **User Decision**: Add all four — Change Log, Breaking Changes, Progress Tracking, Technical
  Background.
- **Impact**: Brings the document to the 11-section contract and matches accepted siblings 51 and 60.

**Q6: Committed artifacts have no filename pattern.**
- **User Decision**: One kind, three extensions —
  `task.{n}.handover.{n}.{name}.{md,sh,json}` and `story.{e}.{s}.handover.{n}.{name}.{md,sh,json}`,
  co-located in the work-item directory.
- **Impact**: Plan step 5 gains a concrete pattern for both the story and task tables in
  `file-naming.md`; the corresponding success criterion becomes verifiable.

**Q7: Effort estimate.**
- **User Decision**: Raise `estimated_effort_hours` from 8 to 14.
- **Impact**: Frontmatter edit; reflects the rubric plus the newly-explicit stage-CLI gating.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Critical

_None._

### Important

- **Missing `## Change Log`.** `change-log.enabled` defaults to `true` and is not disabled in
  `skills-config.yaml`. Every other work item in the repo carries one, including both accepted
  siblings. Without it this review has nowhere to record its verdict. _(Advisory enforcement — a
  score deduction, not a block.)_
- **Missing `## Breaking Changes` (§5).** Part of the mandatory 11-section contract that
  `countMandatorySections` asserts. Task 51 has it; task 60 has it.
- **Missing `## Progress Tracking`.** The phase checkbox list the develop pipeline ticks. Both
  siblings carry one.
- **Missing `## Technical Background` (§3).** Partially covered by Motivation and "The record", but
  neither states the current-vs-target framing the template asks for.

### Optional

- **Sections are unnumbered.** Task 60 numbers §1–§11; task 51 does not. House style is mixed, so
  this is cosmetic — but numbering makes the 11-section contract visible at a glance.
- **`dependencies:` absent from frontmatter** while the body names task.51 and task.60 as
  prerequisites. The task-registry row lists only `task.51`.

### Passing checks

| Check | Result |
| --- | --- |
| Filename convention `task.{n}.{name}.md` | ✅ |
| OKF frontmatter — `type`, `description`, `tags`, `updated` | ✅ all present and well-formed |
| `github_issue: 230` — issue exists, OPEN, title matches | ✅ |
| Body cross-reference `[#230](…/issues/230)` matches frontmatter | ✅ |
| Tracker-card preflight (`--check-card`) | ✅ `ok: true`, no findings |
| Stakeholder Sign-off | not checked — `sign-off` absent from `skills-config.yaml` |

**Card preflight detail** (informational, not defects): the Summary block omits 1 sentence and
Success Criteria omits 4 items, both announced with `+N more`. Breaking Changes reports
`absent-optional` — the card builder tolerates it, but the section contract does not.

---

## 2. Technical Accuracy

**Status:** MOSTLY ACCURATE
**Hallucinations Detected:** 0

Every substantive claim was checked against the working tree. This document is unusually well
sourced — the findings below are staleness, not invention.

### Verified accurate

| Claim | Verification |
| --- | --- |
| `.claude/state/` holds the pipeline lock and two orchestrator state files, and is gitignored | `develop-pipeline.lock`, `develop-next.state.json`, `develop-batch.state.json`; `.gitignore:19` = `.claude/` |
| `file-naming.md` grammar has `implementation`, `qa`, `gate`, `dod` | Story table lines 32–38, task table lines 44–50 |
| `docs/reference/pipeline-artifacts.md` exists and takes a row per artifact | Table at lines 41–52 |
| Two implementation-report templates, each with `## Issues Log` | `develop-pipeline-step-0-resolve-and-prepare.md:653` and `:735` |
| `jira-stage.js --print-plan` is credential-free and network-free | `jira-stage.js:39`, `:345` — "no credentials, no network, exit 0" |
| `gh-stage.js` already emits structured `reason:` outcomes | `no-credentials`, `stage-disabled`, `not-on-board`, `already`, `would-regress`, … |
| `/commit-changes --scope {work-item-dir}` needs no Step 8 change | Confirmed against the artifact registry |
| Prerequisites are met | task.51 `accepted`, task.60 `accepted` |

### Important

- **The CommonJS rationale is stale.** The Decisions table justifies CommonJS "because
  `bundle_skill.py`'s sibling-follow regex recognises `require`". It recognises both:
  `JS_SIBLING_RE` (line 48) matches `require("./foo.js")` **and** `JS_ESM_SIBLING_RE` (line 51)
  matches ESM `import`. Every existing test in `shared/resources/tests/` is `.mjs`. The *conclusion*
  may still be right — dual CLI + `require` use is a real reason — but the stated *reason* is not.

### Optional

- **`shared/resources/tests/fixtures/` is marked "new" in Files Summary.** It already exists and
  holds 10+ `gh-*.json` fixtures.
- **`package.json` is listed as changed for "the hand-maintained test glob list".** The glob already
  includes `'shared/resources/tests/*.test.mjs'`, so a new `.test.mjs` file needs no package.json
  edit. Only a `.sh`-style test would.
- **The `file-naming.md:33-50` citation is loose.** Lines 33–50 straddle the story table (32–38) and
  the task table (44–50). The claim holds; the line range is imprecise.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Critical

- 🚨 **The stage-CLI gating has no implementation step.** Scope commits to "gating the two stage CLIs
  (`jira-stage.js`, `gh-stage.js`) with a `reason: "deferred"` outcome" and calls it "what makes this
  shippable on its own". Steps 1–9 never touch either file; Files Summary lists neither; Testing
  Strategy has no case for the deferred outcome; Success Criteria has no criterion for it. A
  developer who follows the plan exactly ships the task without the thing the document says justifies
  shipping it. _Per Q1: keep in scope and add all four._

### Important

- ⚠️ **The 20 kinds have no source.** "All 20 kinds render in all four outputs, enumerated from the
  schema" is the headline invariant, and the totality test is explicitly designed to enumerate from
  the schema rather than a hand-written list. But the document never lists the 20, and no catalogue
  exists in `shared/resources/` or in tasks 51/53–57 — task 53 mentions "6 of 9 Jira mutation kinds
  plus the 2 sprint kinds", which is a fragment, not a roster. The developer must either invent the
  list or arrive at a different count. _Per Q3: enumerate them in `tracker-access-record.md`._
- ⚠️ **The committed artifacts have no names.** Scope covers "the committed artifacts' names and
  locations" and the `handover` decision registers the kind, but no filename pattern appears
  anywhere, and `file-naming.md` needs a row in *both* the story and task tables. The success
  criterion "`handover` registered in file-naming and pipeline-artifacts" cannot be checked without
  one. _Per Q6: `{work-item}.handover.{n}.{name}.{md,sh,json}`._
- ⚠️ **Step 2 exposes three formats where the document promises four.**
  `--format md|sh|json` omits the inline summary that the frontmatter description names as the fourth
  renderer. _Per Q2: add it._

### Optional

- 💡 **`produces` is defined but never exercised.** The record sketch carries
  `"produces": null  // symbol the human's action yields, if any`, but no plan step, test case or
  success criterion covers what a renderer does with it. Task 56's title suggests value-returning
  mutations land there — if so, say it in Out of scope.
- 💡 **`verify` is defined but never exercised.** Same shape: `verify: {cmd, expect}` sits on the
  record, and read-only verification is explicitly deferred to task 57 — but the totality test's
  "no placeholder left unsubstituted" assertion will meet this field with nothing to substitute.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Critical

- 🚨 **Committed vs gitignored, in the same document.** The Decisions table argues at length that all
  three artifacts must be committed — "gitignoring it would make reconcile a local-machine-only
  tool", "a gitignored script cannot be reviewed in the PR". Implementation Plan step 8 then says to
  add "the `.tracker-actions/` sidecar directory" to `.gitignore`. `.tracker-actions/` appears
  nowhere else in the document; nothing says what lands there or how it relates to the three
  artifacts. _Per Q4: stale leftover — delete it._

### Important

- ⚠️ **Two incompatible definitions of "four".** Title and Motivation: `manual` / `command` /
  `read-only` / `approve` — access modes. Frontmatter description: markdown checklist / shell script
  / JSON sidecar / inline summary — output formats. Step 4 says "The four renderers" without saying
  which. "Every kind × every renderer" therefore has two readings, and the two produce different test
  matrices. _Per Q2: output formats are the renderers._

### Optional

- 💡 **The fixture-gitignore mitigation is broader than the actual risk.** `git check-ignore` confirms
  a plain `.jsonl` under `shared/resources/tests/fixtures/` is **not** ignored today. The only path
  that *is* ignored is one containing `.claude/` — e.g. a fixture mirroring
  `.claude/state/tracker-actions.jsonl`. More usefully, `.gitignore` carries a documented constraint
  the plan does not mention: the negation block **must stay at the end of the file**, and directory
  negations must precede file negations. A negation added anywhere else silently fails — which is
  precisely the trap this risk row exists to avoid.
- 💡 **Testing Strategy is otherwise excellent.** The credential test, the shell-injection round-trip
  case (`$(rm -rf /)`, heredoc terminator, CRLF, `--body-file` over `--body "$(cat …)"`), and the
  six-row mutation table are the strongest part of the document. No changes recommended beyond adding
  a deferred-outcome case per Q1.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

### Important

- ⚠️ **"Nothing on an existing execution path" is false as scoped.** Risk Assessment reads
  "**Low** — new files plus one template section. Nothing on an existing execution path", and
  `risk_level: low` in frontmatter. But `jira-stage.js` and `gh-stage.js` — which Scope commits to
  gating — are invoked from `develop-pipeline-step-0`, `-step-4-create-pr`, `-step-5-6-qa-loop`,
  `-step-7-finalise`, `develop-pipeline-lite-mode`, `jira-transition-protocol`, and seven SKILL.md
  files (`develop-story`, `develop-task`, `develop-bug`, `develop-next`, `develop-batch`,
  `finalise`, `scaffold-tracker-workflow`). A wrong gate stops every pipeline moving cards.
  _Per Q1: raise to Medium and name the blast radius._
- ⚠️ **Rollback Plan inherits the same error.** "`git revert <sha>` then `npm run bundle`. Nothing
  calls these modules yet." True of the three new modules; false of the two gated CLIs, which are on
  live paths and whose revert must restore their pre-gate behaviour.

### Optional

- 💡 **A fourth risk row is worth adding**: the gate misfires for a `full`-access consumer and blocks
  a mutation that should have run. Mitigation: the gate is keyed on `ACCESS_TRACKER != full`, and
  task 51's resolver — now hardened by task 60 — is what makes that comparison trustworthy.

---

## 6. Diagrams

No Mermaid diagrams present. **Not a defect.** The prose carries the structure clearly, and the
record sketch does the work a class diagram would. If one were added, the highest-value candidate is
a flowchart of `journal → dedup → topo-sort → group → four renderers`, since that is the one place
where ordering and grouping interact. Optional.

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues

1. **Add the stage-CLI gating to the plan.** Two Implementation Plan steps (`jira-stage.js`,
   `gh-stage.js`), two Files Summary rows, a `reason: "deferred"` test case, and a success criterion.
   _Per Q1._
2. **Delete the `.tracker-actions/` gitignore line from step 8.** It contradicts the Decisions
   table's committed-artifacts argument and names a directory the document never defines. _Per Q4._

### Should Fix (Important) — 7 issues

1. **Correct the Risk Assessment and Rollback Plan** to acknowledge the two live execution paths;
   raise `risk_level` to `medium`. _Per Q1._
2. **Enumerate the 20 kinds** in `tracker-access-record.md`, with the per-system breakdown, as an
   explicit deliverable of plan step 3. _Per Q3._
3. **Fix the "four" ambiguity** — output formats are the renderers; add the inline summary to step 2
   alongside `md|sh|json`; stop calling the access modes renderers. _Per Q2._
4. **Specify the artifact filename pattern** — `{work-item}.handover.{n}.{name}.{md,sh,json}` for
   both the story and task tables in `file-naming.md`. _Per Q6._
5. **Add the four missing sections** — Change Log, Breaking Changes, Progress Tracking, Technical
   Background. _Per Q5._
6. **Correct the CommonJS rationale.** `bundle_skill.py` follows ESM `import` too; give the real
   reason (dual CLI + `require` consumption) or drop the justification.
7. **Raise `estimated_effort_hours` to 14.** _Per Q7._

### Consider (Optional) — 5 items

1. Correct Files Summary: `shared/resources/tests/fixtures/` is not new, and `package.json` needs no
   change for a `.test.mjs` file.
2. Note the `.gitignore` end-of-file negation constraint in step 8 — the trap the risk row names.
3. Say where `produces` and `verify` are exercised, or defer them explicitly in Out of scope.
4. Add `dependencies: [task.51, task.60]` to frontmatter; the registry row lists only task.51.
5. Number the sections §1–§11, matching task 60.

---

## Implementation Readiness Assessment

**Score:** 6/10

**Scoring Breakdown:**

- Template Compliance: 6/10 — four sections absent; everything else (naming, OKF, tracker linkage, card preflight) clean
- Technical Accuracy: 8/10 — zero hallucinations; three stale claims
- Implementation Clarity: 5/10 — in-scope work missing from the plan; three undefined terms the criteria depend on
- Consistency: 5/10 — committed-vs-gitignored, and two incompatible "fours"
- Risk Management: 5/10 — risk and rollback statements both contradicted by the stated scope

**Confidence Level for Successful Implementation:** Medium

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** The design is sound and unusually well evidenced — no invented APIs, no wrong
paths, and a testing strategy stronger than most. The gap is between what Scope promises and what the
plan instructs: the half of the work that makes this unit shippable on its own is described in prose
and absent from every actionable section, and three headline success criteria reference terms the
document never defines. All seven decisions needed to close that gap were taken during this review.

---

## Next Steps

1. Apply the two Critical fixes and the seven Important fixes above.
2. Re-check that Success Criteria and Testing Strategy each cover the stage-CLI gating.
3. Promote to `ready-for-development` and run `/develop-task` — prerequisites task.51 and task.60 are
   both `accepted`, so nothing blocks the start.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-08-18
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md`
- **Sources Consulted:** `docs/standards/file-naming.md`, `docs/reference/pipeline-artifacts.md`,
  `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `shared/resources/jira-stage.js`,
  `shared/resources/gh-stage.js`, `shared/resources/resolve-platform.sh`,
  `skills/create-skill/scripts/bundle_skill.py`, `package.json`, `.gitignore`,
  `docs/tasks/task-registry.md`, task.51 and task.60 documents
- **Pre-pass:** run inline (architecture alignment + codebase implementation-status scan)
