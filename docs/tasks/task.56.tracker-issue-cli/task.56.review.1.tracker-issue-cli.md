# Task Review Report: Task 56 — One CLI for the GitHub issue lifecycle, and honest handling of the mutations that return a value

**Reviewed:** 2026-08-19
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD (design) / NEEDS IMPROVEMENT (specification)

> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-08-19

---

## Executive Summary

The design is sound and the foundations it names genuinely exist: `produces` / `dependsOn` are live end-to-end in `defer-mutation.js` and `handover-render.js`, `tracker_write` is in place, and the three sibling CLIs establish the contract this one is asked to match. The two-run convergence decision and the refusal to fabricate a placeholder key are correct and well argued.

The **specification**, however, is under-built against the repo's actual state. Three load-bearing facts were not accounted for: `blocking: true` is a schema field that does not exist; `milestone create` is not a kind in a roster that a writer mechanically enforces and a test counts; and the `PARTIALLY ENFORCED` notice this task must update is pinned by an assertion that will go red — contradicting the task's own "existing suites green unchanged" criterion. The Files Summary omits five load-bearing files, and the call-site count is understated by 40%.

All eight critical and important findings were document-level and have been fixed in place.

**Critical Issues:** 3 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — `develop-task` Step 2)
**Implementation Readiness:** 8.5/10 (6/10 before fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `develop-task` pipeline, which is autonomous. No clarifying questions were put to the user; every finding was resolvable from the repository itself, and the two pre-pass Explore agents returned exact file paths and line numbers for each. Per the pipeline's autonomous-defaults table:

- Output format: **Comprehensive report** (auto-selected).
- Step 8.5: **Yes, apply all critical + important fixes** (auto-answered).
- Step 9: **Yes, fixes complete** (auto-answered — outcome is READY TO IMPLEMENT).

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

Present: Overview, Motivation, Decisions, Scope, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan, References. No placeholders. File naming correct. Frontmatter OKF-conformant (`type: task`, `description`, `tags`, `updated` all present). Tracker linkage verified: `github_issue: 234` exists and is OPEN; body cross-reference link matches.

Tracker-card preflight (`sync-jira-task.js --check-card`) exits **0** — Summary resolves (115 chars), Success Criteria resolves (376 chars, `+4 more`), Breaking Changes absent-optional. No card finding.

### Issues

#### Optional
- **Missing `## Technical Background`** — all five sibling tasks (51–55) carry it, and it is where the current-vs-target shape of the `$( )`-capture problem belongs.
- **Missing `## Progress Tracking`** — present in 51, 52, 53, 54.
- **Missing `## Change Log`** — present in all five siblings. `change-log.enabled` is unset in `skills-config.yaml`, which defaults to `true`; enforcement defaults to `advisory`, so this deducts from the score without blocking.

### Recommendations

1. ✅ Added `## Technical Background`, `## Progress Tracking`, and `## Change Log`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (a named field that does not exist)

### Issues

#### Critical

- **`blocking: true` is not a field in the record schema.** The Decisions table makes it a contract — *"`blocking: true` earns a banner, not a silent note"* — and the Success Criteria gate on it. The literal `blocking` appears nowhere in `shared/resources/tracker-access-record.md`'s field table (lines 99–118), nowhere in `defer-mutation.js`, and nowhere in `handover-render.js`.
  - **Impact:** Plan item 3 is unimplementable as written. Introducing the field is a three-file change — the schema doc (which is the writer's parsed source of truth, not documentation), the writer, and both renderers — and none of those files were in the Files Summary.
  - **Evidence:** `shared/resources/tracker-access-record.md:99-118`; `shared/resources/handover-render.js` (no match); `shared/resources/defer-mutation.js` (no match).
  - **Fix applied:** ✅ Named the field as new in the plan, added the three files to the Files Summary, and pointed the banner at the existing `## ⚠️ UNRECORDED` section (`handover-render.js:439-447`) as the shape to copy rather than inventing one.

- **`milestone create` is not a kind, and the roster is mechanically enforced.** `defer-mutation.js` parses the roster out of `tracker-access-record.md` and **refuses a record whose `kind` is absent** (`:172`), asserting `roster.size === EXPECTED_KIND_COUNT` where `EXPECTED_KIND_COUNT = 22` (`:64`). Milestone appears only as a parenthetical on `github.issue.edit` — *"(title, body, milestone, labels)"* (`tracker-access-record.md:259`). A `milestone` subcommand as specified would throw at the writer.
  - **Impact:** Four real call sites (`ensure-{story,epic,task}-github-issue`, `sync-github-epic`) create milestones via `gh api .../milestones -f title=`. Today they would land on `github.unknown-mutation`; the task names a subcommand for them but no kind for the record.
  - **Evidence:** `shared/resources/defer-mutation.js:60,64,172-176`; `shared/resources/tracker-access-record.md:255-275`.
  - **Fix applied:** ✅ Made the decision explicit — add a 23rd kind `github.milestone.create` (consequence `state-drift`, `produces: github.milestoneNumber`), and stated the three-part cost: a roster row, a bumped `EXPECTED_KIND_COUNT`, and a renderer arm (the totality test has no default case).

- **"Existing suites green unchanged" is contradicted by the task's own scope.** `shared/resources/tests/jira-interception.test.mjs` §10 asserts the literal string `gh issue create` is present in `resolve-platform.sh`'s `PARTIALLY ENFORCED` notice, as the name of a path that is **not** gated (`:930-954`). Gating it — which is the whole point of this task — makes that assertion false.
  - **Impact:** A success criterion instructs the implementer to leave green a test that correct implementation must turn red. Left unresolved, an implementer either weakens the change to satisfy the criterion or edits the test without understanding it was deliberate.
  - **Evidence:** `shared/resources/tests/jira-interception.test.mjs:930-954`; `shared/resources/resolve-platform.sh:494`, whose own comment reads *"Keep this notice accurate as each one lands"*.
  - **Fix applied:** ✅ Narrowed the criterion to "`full` mode byte-identical" and added an explicit expected-red row naming the test, the notice, and the two doc sites that assert the same gap (`platform-detection.md:197-201`).

### Accurate — verified, no finding

- CommonJS, exit-0-with-`reason`, `--json` — matches all three siblings (`tracker-comment.js:26-42`, `jira-stage.js:21-27`, `gh-stage.js:26-31`).
- `produces` / `dependsOn` are **implemented**, not merely specified: written by `defer-mutation.js` (`:1065,1080-1081`), topologically sorted and nested by `handover-render.js` (`:157,192,515`), rendered as `Yields \`…\`` (`:479`) and `# after:` / `# yields:` (`:741-743`).
- The fetch-then-mutate sub-issue pair is exactly as described (`skills/ensure-story-github-issue/SKILL.md:163-175`) — the composite-record decision is correct.
- `tests/*.test.js` is already in the `npm test` glob, so the new guard will not be orphaned.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important

- **Files Summary omits five load-bearing files.** Each is required by a plan item that is already in scope:

  | File | Why it must change |
  | ---- | ------------------ |
  | `shared/resources/tracker-access-record.md` | the `blocking` field; the milestone kind; the count |
  | `shared/resources/defer-mutation.js` | writes `blocking`; `EXPECTED_KIND_COUNT` 22 → 23 |
  | `shared/resources/handover-render.js` | the banner; a renderer arm for the new kind |
  | `shared/resources/resolve-platform.sh` | the `PARTIALLY ENFORCED` notice at `:494` |
  | `shared/resources/platform-detection.md` | documents the gap as open at `:197-201` |

  Also omitted: `shared/resources/tests/jira-interception.test.mjs` (the pinned assertion), `skills/finalise/SKILL.md` (4 bare sites — and the Motivation names "the finalise step doc" while the Files Summary does not), and a unit suite for the new CLI.
  - **Fix applied:** ✅ All added to the Files Summary with the reason for each.

- **The new CLI's own unit suite is unowned.** Every sibling has one under `shared/resources/tests/` (`gh-stage.test.mjs`, `tracker-comment.test.mjs`, `handover-render.test.mjs`, `stage-access-gate.test.mjs`), already globbed by `npm test`. The Files Summary lists only the repo-wide guard.
  - **Fix applied:** ✅ Added `shared/resources/tests/tracker-issue.test.mjs`.

- **Call-site count understated: 28 bare in-scope sites, not ~20.** Verified inventory: `gh issue create` ×4, `gh issue edit` ×4, `gh issue close` ×3, `gh issue reopen` ×3, `gh issue comment` ×3, milestone create ×4, sub-issue link ×1, `gh project item-add` ×5, `gh api graphql` field-set ×1. Bundled `skills/*/references/` copies excluded (they are `npm run bundle` output of the same sources).
  - **Fix applied:** ✅ Corrected to 28 with the per-verb breakdown inlined, so the guard's allowlist starts from a real number.

- **"Subcommands" diverges from all three siblings.** No CLI in `shared/resources/` uses a positional verb; all are flat flag parsers, and `gh-stage.js` expresses its second mode as `--probe-board` rather than a subcommand. `tracker-comment.js:14-16` names *"a step doc author who has read one of these CLIs has read all three"* as a design property this would be the first to break.
  - **Fix applied:** ✅ Changed to `--kind create|edit|close|reopen|milestone|sub-issue-link`, matching the sibling flat-flag style, with the rationale recorded in the Decisions table.

#### Optional

- The access-gate **placement** rule is not stated. All three siblings put `dm.resolveAccessTracker(...)` between local work and the first network call and compare `!== "full"` (never truthiness) — that placement is what makes "a gated run demonstrably makes no network call" true.
  - **Fix applied:** ✅ Stated in plan item 1.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important

- **Six bare board sites sit inside the counted total but outside the stated verb list.** The Scope names create / edit / close / reopen / milestone / sub-issue link; it does not name `gh project item-add` (5 bare sites) or the bare `gh api graphql` Priority default (`develop-pipeline-step-0-resolve-and-prepare.md:467`). The Overview claims this task *"Completes coverage of the 20 in-scope tracker mutation kinds"*, and task 57 is verification-and-reconcile, not more interception — so anything left bare here is left bare permanently.
  - **Compounding:** plan item 6's repo-wide guard would fire on all six on day one, forcing them into the allowlist — which the Risk Assessment's own row warns against (*"allowlist becomes a dumping ground"*). The kind `github.board.item-add` already exists in the roster, so covering them is cheap.
  - **Fix applied:** ✅ Brought both into scope as a seventh plan item, with the six sites named.

- **The repo-wide guard needs its scoping rule stated, or it is unshippable.** ~30 bundled copies of `tracker-access-record.md` contain the literal `gh issue create` in the roster's *Underlying call* column, and every `skills/*/references/` file is bundle output of a `shared/resources/` source. A naive grep produces 20+ false positives on its first run.
  - **Precedent exists:** `tests/executable-instructions.test.js` already solves exactly this — it greps bundled prose against an allowlist and states the classification-is-the-point rationale verbatim. `tests/restricted-access-docs.test.js` is a second example.
  - **Fix applied:** ✅ Plan item 6 now names both precedents and states the scoping rule (canonical prose = `skills/*/SKILL.md` + `shared/resources/*.md`; exclude `references/` and the roster table).

### Verified consistent

Testing Strategy covers every Success Criterion; the mutation-prove line names a concrete red for each invariant; the Rollback Plan covers the change; effort (12h) is within tolerance of the rubric's 16h snap (25% divergence, threshold 50%).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Four risks identified, each with a mitigation grounded in machinery that exists. The duplicate-issue risk correctly identifies the `synced-from-*` label search as the reason no placeholder may be written — this is the strongest reasoning in the document and needs no change.

#### Optional

- `handover-render.js:17` says *"Every one of the 21 kinds"* while `EXPECTED_KIND_COUNT` is 22 — pre-existing drift. If this task takes the roster to 23, that header should be corrected in the same commit or it drifts further.
  - **Fix applied:** ✅ Noted in the plan as a same-commit cleanup.

---

## Summary of Recommendations

### Must Fix (Critical) — 3 issues

1. ✅ `blocking` named as a **new** schema field; the three files that must define it added to Files Summary; banner pointed at the existing `## ⚠️ UNRECORDED` shape.
2. ✅ Milestone resolved — add a 23rd kind `github.milestone.create`, with the roster row + `EXPECTED_KIND_COUNT` bump + renderer arm named as its cost.
3. ✅ "Existing suites green unchanged" narrowed to `full`-mode byte-identity, with an explicit expected-red row naming `jira-interception.test.mjs` §10 and the two doc sites asserting the same gap.

### Should Fix (Important) — 5 issues

4. ✅ Five load-bearing files + the pinned test + `skills/finalise/SKILL.md` added to Files Summary.
5. ✅ `shared/resources/tests/tracker-issue.test.mjs` added — the CLI's own unit suite.
6. ✅ Count corrected to 28 with a per-verb breakdown.
7. ✅ `--kind` flag replaces subcommands, matching all three siblings.
8. ✅ Board sites brought in scope; guard scoping rule stated with its two precedents.

### Consider (Optional) — 3 items

9. ✅ `## Technical Background`, `## Progress Tracking`, `## Change Log` added.
10. ✅ Access-gate placement rule stated.
11. ✅ `handover-render.js:17` "21 kinds" drift flagged as a same-commit cleanup.

---

## Implementation Readiness Assessment

**Score:** 8.5/10 (6/10 before fixes)

**Scoring Breakdown:**

- Template Compliance: 8/10 — three sibling-standard sections were absent; card preflight clean
- Technical Accuracy: 9/10 — one non-existent field named as contract, now corrected; everything else verified true
- Implementation Clarity: 8/10 — plan is directionally right; file inventory was 40% short
- Consistency: 9/10 — one self-contradicting success criterion, now resolved
- Risk Management: 9/10 — strongest section; reasoning is grounded in real machinery

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every finding was a gap between the document and the repository's actual state, not a flaw in the design — and all eight critical and important findings were document-level and have been fixed in place with exact file paths and line numbers. The plan now names every file it must touch, resolves the milestone-kind question, and tells the implementer which test is expected to go red and why.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Start with the roster + schema changes (`tracker-access-record.md`, `defer-mutation.js`) — the CLI cannot write a record until the kind exists.
2. Build `tracker-issue.js` against the `tracker-comment.js` contract, with the access gate placed before the first network call.
3. Wrap the 28 sites; expect `jira-interception.test.mjs` §10 to go red and update the notice it pins.
4. Land the guard last, so its allowlist is written against a corpus that is already clean.
5. `npm run bundle` before commit — the `shared/resources/` edits propagate into ~30 skill `references/` directories.

---

## Review Metadata

- **Reviewer:** review-task (autonomous — `develop-task` pipeline Step 2)
- **Review Date:** 2026-08-19
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.56.tracker-issue-cli/task.56.tracker-issue-cli.md`
- **Pre-pass agents:** 2 dispatched (architecture alignment → `drift`; codebase scan → `not-started`), both returned
- **Sources consulted:** `shared/resources/{tracker-access-record.md,defer-mutation.js,handover-render.js,resolve-platform.sh,platform-detection.md,tracker-comment.js}`, `shared/resources/tests/jira-interception.test.mjs`, `docs/architecture/concepts/coding-standards.md`, `package.json`, tasks 51–55
