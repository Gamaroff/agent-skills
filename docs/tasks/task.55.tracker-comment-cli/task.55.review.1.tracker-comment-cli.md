# Task Review Report: Task 55 - Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose

**Reviewed:** 2026-08-19
**Review Depth:** Standard
**Task Status:** planned (at review time)
**Overall Assessment:** GOOD (premise) / NEEDS IMPROVEMENT (specification)

> **Implementation Status**: ✅ All 10 critical + important recommendations implemented — 2026-08-19

---

## Executive Summary

The task's central premise is sound and verified: `jira-sync.js` genuinely has no comment endpoint, every Jira comment in this repository really is an MCP call made by an agent following prose, and the infrastructure this task depends on (tasks 51/52/53) is merged and in place. The reasoning for building the function rather than governing the choice with a prose rule is well-argued and consistent with precedent already set by `jira-stage.js`.

The problems are all in the specification, not the idea. Two of them change scope: the ADF renderer the task proposes to "reuse" cannot render code fences or italics, so two of the task's own deliverables are new renderer work; and a both-tracker CLI collides with an explicit module boundary that exists to stop `jira-sync.js` being bundled into GitHub-only skills. A third gap — the CLI contract itself — matters disproportionately because 23 mechanical rewrites consume it.

**Critical Issues:** 3 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (pipeline mode — autonomous; all findings resolvable from source evidence)
**Implementation Readiness:** 6/10 before fixes → 9/10 after fixes
**Recommendation:** REQUIRES REWORK (pre-fix) → **READY TO IMPLEMENT** (post-fix)

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline in autonomous mode. No `AskUserQuestion` prompts were issued: every finding was resolvable from source evidence in the repository, and the pipeline default auto-answers Step 8.5 with "apply all critical + important fixes".

One finding (C3, module boundary) required a design decision rather than a correction. It was resolved by following the rationale already written into `gh-stage.js:34-38` rather than inventing a new position — see the Decisions row added to the task document.

---

## Pre-pass Summaries

| Agent | Key | Verdict |
|---|---|---|
| B — architecture alignment | `alignment` | **drift** — 4 medium, 2 low findings |
| C — codebase already-implemented scan | `implementation_status` | **not-started** — 2 criteria `partial` (infrastructure present, no enforcement) |

Agent C confirmed the branch `feature/task.55.tracker-comment-cli` has zero commits and an empty diff against `develop`; nothing in the task is already built.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

Filename `task.55.tracker-comment-cli.md` ✅ correct (dots as structural separators, hyphens within the descriptive name). OKF frontmatter conformant: `type: task` present, `description` present, `tags` a YAML list, `updated` present, `github_issue: 233` resolves to a live open issue whose body cross-reference link matches frontmatter. No unfilled placeholders. Tracker-card preflight returns `ok: true` with zero findings (`Summary` 75 chars prose, `Success Criteria` 398 chars list with 3 omitted, `Breaking Changes` absent-optional).

`sign-off` is not enabled in `skills-config.yaml`, so that check was skipped entirely.

### Issues

#### Important
- **Missing `## Technical Background`** (template section 3). The Motivation section carries much of the current-state argument, but there is no current-vs-target statement naming the functions a developer must work with. All four sibling tasks (51–54) carry this section.
- **Missing `## Change Log`.** `change-log.enabled` defaults to `true`. This is not the adoption boundary: tasks 51, 52, 53 and 54 — same author, same sequence, all authored after the spec — each carry one.
- **Missing `## Progress Tracking`** (template). The develop step ticks phases here.

#### Optional
- `## Breaking Changes` is absent. Card preflight grades it `absent-optional`, and the task states PR comments are out of scope — but folding `skills/review-task/SKILL.md:1652` from REST v2 plain-text to v3 ADF *is* a behaviour change worth naming.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (a false reuse claim, not an invented dependency)

No invented libraries, frameworks or dependencies. Everything proposed is plain Node ≥22 CommonJS with zero runtime deps, matching `tech-stack.md`. File paths and the test location follow repo conventions, and `shared/resources/tests/*.test.mjs` is already in the `npm test` glob at `package.json:24`, so the new suite will not be orphaned.

### Issues

#### Critical
- **C1 — The ADF renderer cannot render two of the task's own deliverables.** The task says it will "reuse the existing markdown→ADF renderer", and the Risk Assessment mitigates renderer divergence with "the existing ADF renderer is reused rather than rewritten". Both claims are wrong in a way that changes scope:
  - `adf` (`shared/resources/jira-sync.js:649-674`) has **no `codeBlock` builder**, and `blockToAdf` (`:809-843`) has **no fence branch** — it handles bullet lists, ordered lists, then a paragraph of hard breaks. The Testing Strategy row "Markdown → ADF … round-trips headings, tables, **code fences** and links" therefore asserts behaviour that does not exist. (`makeFenceTracker()` at `:1094` is a section-extraction helper, not a renderer.)
  - `adf` has **no `em`/italic mark helper**. The Decisions table's "small italic footer" for the Jira marker requires adding `marks: [{ type: "em" }]`.
  - **Impact:** two renderer extensions are in scope that the document counts as free, and the 12h estimate does not reflect them.

#### Important
- **I2 — Two citations point at the wrong lines.**
  - The task says the refusal is "around `:3073`". Line 3073 is unrelated (`terminal: !!base.terminal` inside a pipeline-moment check). The refusal is at **`jira-sync.js:3374`** — and it sits inside `buildTransitionUpdate()` (`:3377`), meaning it declines a `comment` field on a *transition payload*, not a comment endpoint. The substantive claim survives (there is no comment path anywhere in the file) but the framing overstates what that comment says.
  - The task cites `resolve-platform.sh:64-68` for the MCP-retry gap. Lines 64-68 are CDPATH/self-directory resolution. The actual note is at **`:518-521`**.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Seven phases, each with a clear deliverable; below the >8-phase oversizing threshold. Effort estimate of 12h recomputes to the 8–16h band under the rubric (8 success criteria, 7 plan tasks, high risk, >5 files, no integration keyword) — within tolerance, no finding.

### Issues

#### Critical
- **C2 — The CLI contract is under-specified, and 23 rewrites consume it.** This is the task's highest-leverage artifact; getting it wrong means redoing every call site.
  - **Flag name diverges from both peers.** Plan step 2 specifies `--moment <name>`. `jira-stage.js:78-82` and `gh-stage.js:634` both take `--stage`, and no `--moment` flag exists anywhere in `shared/resources/*.js`. The task's own Decisions table claims "same `--json`, same vocabulary" as those peers.
  - **No exit codes given.** Both peers document them explicitly (`jira-stage.js:20-27`, `gh-stage.js:25-30`): `0` for every outcome the pipeline should shrug at, `1` only under `--strict`, `2` for a usage error including a missing `--issue`.
  - **`no-issue` as an exit-0 reason contradicts that rule** — the peers exit `2` when `--issue` is absent.
  - **`unverifiable` cannot be emitted by the declared vocabulary.** The Decisions table and Testing Strategy both require an ambiguous marker match to resolve to `unverifiable`, "never `satisfied`". But the declared vocabulary is `posted | no-credentials | deferred | already | no-issue`, and neither token exists in any shipped `.js`. `satisfied` is a **boolean field** on the deferred-mutation record (`tracker-access-record.md:75,114`), not a reason; `unverifiable` is **task 57's** verification vocabulary (`task.57.readonly-verification-and-reconcile.md:54,73,76`), and task 57 is `status: planned`. As written, a developer must invent whether `unverifiable` is a new reason, a new record field, or a third state of a boolean.

- **C3 — A both-tracker CLI collides with an explicit module boundary, and the task does not decide it.** `gh-stage.js:34-38` states the rule verbatim: *"This module depends on tracker-workflow.js and NOTHING else in shared/. In particular it must never require jira-sync.js: that file is ~4,100 lines of Jira machinery, and a GitHub-only consumer bundling it would pay for a tracker they do not use."* `tracker-comment.js` is both-tracker by design, so a top-level `require("./jira-sync.js")` makes `bundle_skill.py` copy `jira-sync.js` (4,822 lines) plus its transitive siblings (`change-log.js`, `defer-mutation.js`) into the `references/` of **each of the ~10 consuming skills**. The task has no Decisions row for this.

#### Important
- **I1 — The Files Summary omits three files that the parity guard will trip on.** The step-doc count (12) and skill count are right, but unlisted are `shared/resources/develop-pipeline-lite-mode.md` (1 occurrence, at `:31`, a normative "the orchestrator MUST still … `addCommentToJiraIssue`" instruction) and `skills/develop-story/README.md` + `skills/develop-task/README.md` (4 each). Either they are rewritten, or they join `jira-transition-protocol.md` on the allowlist — but the guard cannot pass while they are unaccounted for. Note also that the "eight canonical files" figure counts `skills/review-task/SKILL.md`, which has **zero** MCP calls; its site is the `curl` at `:1652`.
- **I6 — An identity-marker convention already exists and is not referenced.** `skills/finalise/SKILL.md:937,962,992` defines `<!-- finalise-canonical-summary -->`, prepended as the body's first line and matched with `startswith` (not `contains`), search-then-edit by comment id rather than `--edit-last`. Task 55 should inherit the `<!-- {producer}-{purpose} -->` naming shape rather than invent one. Critically, that convention resolves multiple matches with `| head -1` — **precisely the "pick the first of two matches" behaviour task 55 forbids** — which makes it the concrete anti-pattern the ambiguity rule is reacting to, and worth naming as such.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Testing Strategy is unusually strong: nine cases plus an explicit mutation-prove line for five of them. Rollback is thin but adequate and honest (revert restores today's behaviour, so a `full`-access consumer is unaffected either way).

### Issues

#### Important
- Internal vocabulary inconsistency between Implementation Plan step 2 (`posted | no-credentials | deferred | already | no-issue`) and the Testing Strategy / Decisions ambiguity rows (`unverifiable`, `satisfied`) — folded into **C2** above.
- Scope says "replacing the ~20 prose sites"; the verified count outside bundled `references/` is **23** in the canonical scope (14 in `shared/resources/*.md`, 10 in `skills/*/SKILL.md`, of which `jira-transition-protocol.md:97` is the intended allowlist entry), plus 8 in the two pipeline READMEs.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

The four-row risk table is well-targeted, and "a rewritten site posts nothing and nobody notices" correctly identifies the sharpest hazard — comments are non-blocking by policy, so a silent failure looks like success.

### Issues

#### Important
- **I7 — Bundle drift is not in the risk table.** This task edits `shared/resources/*.md` sources that are bundled into ~10 skills' `references/`. An edit applied to a bundled copy is silently reverted by the next `npm run bundle`. With 23 sites across both `shared/resources/` and `skills/`, and the bundler rewriting paths in place, this is a high-probability failure mode for this task specifically. Plan step 7 says "npm run bundle" but the risk is not named.
- The renderer-scope risk from **C1** is unmitigated because the document believes the renderer is free.

#### Optional
- **O2 — Fingerprint precision.** `tracker-access-record.md:126-135` documents a real past bug: two comments to the same issue with identical argv but different bodies collapsed to one `id`. That is **already fixed** — `fingerprint` now includes `command.stdin`. The task should state explicitly that the comment body travels via `command.stdin` (as the roster's own worked example does, `:47-90`), so the existing fingerprint distinguishes them. This also satisfies the task's own "passed by file, never interpolated into a shell string" requirement, since `command.argv` is an array and `stdin` carries the body.

---

## 6. Diagram Review

No Mermaid diagrams present.

#### Optional
- **O1** — The control flow has two non-trivial branch points that prose describes serially: the `reason` branch each of the 23 call sites must implement, and the marker-match cardinality rule (0 → post, 1 → `already`, 2+ → `unverifiable`). A small `flowchart` would let a developer verify all paths are handled at a glance. Not flagged as a gap — the prose is clear — but it is the one place a diagram would earn its place.

---

## Summary of Recommendations

### Must Fix (Critical) — 3 issues

1. **C1** — Correct the reuse claim; add `codeBlock` + fence-branch and an `em` mark to the ADF renderer as explicit in-scope work, in the plan, Files Summary and Risk table.
2. **C2** — Pin the CLI contract: `--stage` not `--moment`; explicit exit codes matching the peers; `no-issue` reclassified; `unverifiable` added to the reason vocabulary with its relationship to task 57 and to the record's `satisfied` boolean stated.
3. **C3** — Decide the module boundary and record it in the Decisions table.

### Should Fix (Important) — 7 issues

1. **I1** — Add `develop-pipeline-lite-mode.md` and both pipeline READMEs to the Files Summary; state the parity guard's allowlist explicitly.
2. **I2** — Fix both line citations and reword the `:3374` framing.
3. **I3** — Add `## Technical Background`.
4. **I4** — Add `## Change Log`.
5. **I5** — Add `## Progress Tracking`.
6. **I6** — Reference the existing `<!-- finalise-canonical-summary -->` convention; inherit its shape; name its `| head -1` as the anti-pattern.
7. **I7** — Add bundle drift to the risk table.

### Consider (Optional) — 3 items

1. **O1** — A `flowchart` for the reason branch and marker cardinality.
2. **O2** — State that the body travels via `command.stdin`.
3. **O3** — `## Breaking Changes` noting the REST v2 → v3 ADF change at the `curl` site.

---

## Implementation Readiness Assessment

**Score:** 6/10 (before fixes)

**Scoring Breakdown:**

- Template Compliance: 6/10 — three required sections missing; everything else clean, card preflight passes
- Technical Accuracy: 5/10 — no invented dependencies, but one false reuse claim that changes scope and two misdirected citations
- Implementation Clarity: 5/10 — the contract that 23 rewrites consume is under-specified in four separate ways
- Consistency: 6/10 — reason vocabulary contradicts itself across three sections; site count understated
- Risk Management: 7/10 — sharp risk table, but misses bundle drift and is actively wrong about renderer reuse

**Confidence Level for Successful Implementation:** Medium (pre-fix) → High (post-fix)

**Recommendation (pre-fix):** 🚨 **REQUIRES REWORK** — three critical issues.

**Recommendation (post-fix):** ✅ **READY TO IMPLEMENT** — 9/10.

**Justification:** Every critical finding was a specification gap resolvable from evidence already in the repository, not a question needing the author's intent. The premise, the sequencing against tasks 51–53, and the testing strategy were sound throughout; what was missing was the precision the 23 downstream rewrites depend on.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Extend the ADF renderer first (`codeBlock` builder, `blockToAdf` fence branch, `em` mark) — it is a prerequisite for both the fence round-trip test and the Jira footer marker.
2. Build `addComment()` as a transcription of `putIssueAtomic` (`jira-sync.js:4542-4592`) against `POST /rest/api/3/issue/{key}/comment`, with `defer.kind = "jira.comment.add"`.
3. Build `tracker-comment.js` against the pinned contract, with the Jira branch's `require` kept lazy.
4. Rewrite the 23 sites, then run `npm run bundle` — editing `shared/resources/` sources only, never the bundled `references/` copies.
5. Extend the parity guard last, so it proves the rewrite rather than being written around.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, inside `/develop-task` pipeline)
- **Review Date:** 2026-08-19
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.55.tracker-comment-cli/task.55.tracker-comment-cli.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`, `AGENTS.md`
- **Source Files Verified:** `shared/resources/{jira-sync.js,gh-stage.js,jira-stage.js,defer-mutation.js,handover-render.js,resolve-platform.sh,tracker-access-record.md,develop-pipeline-lite-mode.md,jira-transition-protocol.md}`, `skills/finalise/SKILL.md`, `skills/review-task/SKILL.md`, `evals/shared/tests/transition-protocol-parity.test.mjs`, `package.json`, `skills/create-skill/scripts/bundle_skill.py`
- **Pre-pass Agents:** 2 (architecture alignment; codebase already-implemented scan)
