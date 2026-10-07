---
id: task.198.plan
title: "Implementation Plan: Skill reference and discoverability docs"
type: plan
task-ref: task.198.skill-reference-and-discoverability-docs.md
---

# Implementation Plan: Skill reference and discoverability docs

> Requirements and success criteria: [task.198.skill-reference-and-discoverability-docs.md](task.198.skill-reference-and-discoverability-docs.md)

## Overview

27 findings, each with what the doc says, what the source says, the evidence and the fix, copied from the verified audit (`develop` @ `a0e135a6`). Phase 0 re-checks each one before it is edited.

## Findings by doc

### `docs/concepts/architecture.md`

- [ ] **OVERVIEW-13** (medium, stale) — line 96
  - **Doc says:** Dependency map: `FN --> ensure-epic-github-issue` / `ensure-epic-jira-issue`; line 111: 'finalise picks one of ensure-epic-{github,jira}-issue via the platform resolver'
  - **Source:** finalise never invokes ensure-epic-*. It has no `invokes:` key and its only `ensure-` mention is the bug sub-routines. The epic ensure sub-routines are called by create-story, create-epic, review-epic and review-story.
  - **Evidence:** skills/finalise/SKILL.md (no `ensure-epic` match; only :1915 ensure-bug-*); skills/create-story/SKILL.md:4 (`invokes: [ensure-epic-github-issue, ensure-epic-jira-issue, …]`); skills/create-epic/SKILL.md:332
  - **Fix:** Remove the FN→EGH/EGJ edges and the sentence at :111. Draw the ensure-epic edges from create-story (in its `invokes` list) and create-epic (body, :332). Optionally also from review-story and review-epic, which call them too.
- [ ] **OVERVIEW-22** (low, missing) — line 99
  - **Doc says:** Dependency map: create-story → documentation-standards-validator, mermaid-architect
  - **Source:** create-story now also invokes `wireframe` (renamed from `/wireloom`, shipped since v0.52) for UI stories, plus the ensure-epic-* and ensure-story-* sub-routines. The map shows none of them.
  - **Evidence:** skills/create-story/SKILL.md:4 (`invokes: [ensure-epic-github-issue, ensure-epic-jira-issue, ensure-story-github-issue, ensure-story-jira-issue, mermaid-architect, wireframe]`); CHANGELOG.md [Unreleased] '`/wireloom` is now `/wireframe`'
  - **Fix:** Add `CS --> WF[wireframe]` (UI stories) and the ensure-epic/ensure-story edges to the create-story node.

### `docs/concepts/overview.md`

- [ ] **OVERVIEW-21** (low, stale) — line 90
  - **Doc says:** Skill categories list `document-project` (Documentation and research) and `simplify` (Writing and editing) as library skills
  - **Source:** Neither skill exists in this library (there is no skills/document-project or skills/simplify). `simplify` is a host built-in, not a shipped skill.
  - **Evidence:** `ls skills/` (129 dirs) has no document-project or simplify; docs/reference/skill-catalog.md:3 ('all 129 skills')
  - **Fix:** Remove `document-project` (document-existing-project is already listed) and `simplify` from the category lists.
- [ ] **OVERVIEW-20** (medium, stale) — line 127
  - **Doc says:** Platform-aware skills are create-pr, create-task, finalise, review-story, review-task, qa-fix, ensure-epic-jira-issue, create-epic. Platform-agnostic: create-branch, commit-changes, create-story, qa-story, qa-gate. Line 114: resolve-platform.sh is 'sourced by 8 platform-aware skills'
  - **Source:** 28 SKILL.md files reference resolve-platform.sh, including create-story and qa-story, which the doc calls platform-agnostic. Also qa-task, review-pr, review-code, review-bug, review-epic, develop-next, all sync-github-* and all ensure-*.
  - **Evidence:** `grep -rl resolve-platform.sh skills/*/SKILL.md` → 28 files incl. skills/create-story/SKILL.md, skills/qa-story/SKILL.md, skills/review-pr/SKILL.md, skills/qa-task/SKILL.md
  - **Fix:** Drop the hard-coded count and lists. Say 'every skill that touches a tracker or PR sources resolve-platform.sh', remove create-story and qa-story from the agnostic list, or generate the list.

### `docs/operations/workflows.md`

- [ ] **OVERVIEW-18** (medium, missing) — line 65
  - **Doc says:** 'Roadmap-driven orchestration' presents develop-next and develop-batch as the two orchestrators one level up
  - **Source:** Shipped siblings are missing. `/qa-next` is the UAT loop (sibling of develop-next) and has gained `/qa-next <id>` and `--coverage` since v0.52. `loop-supervisor` runs the roadmap unattended with a fresh context per iteration, the documented alternative to `/loop` (which the section recommends). Neither is mentioned. README.md:66 already presents qa-next as develop-next's sibling.
  - **Evidence:** skills/qa-next/SKILL.md (description: 'Sibling of develop-next: that loop builds, this one verifies'); skills/loop-supervisor/SKILL.md (description: built-in /loop re-invokes the same conversation …); docs/runbooks/unattended-overnight-runs.md; CHANGELOG.md [Unreleased] '`/qa-next <id>`'
  - **Fix:** Add a short qa-next block (uat-status.mjs --next → walk checklist → record 🟡/❌/⏸, file bugs, never ✅). Add a note that for hours-long runs `loop-supervisor` replaces `/loop`, linking the Unattended Overnight Runs runbook.
- [ ] **OVERVIEW-17** (medium, stale) — line 72
  - **Doc says:** develop-next: `select-next.mjs (deterministic) → /develop-story | /develop-task`; line 67: 'The three pipelines above … Two orchestrators … choose the path for you'
  - **Source:** develop-next and develop-batch also dispatch `/develop-bug` rows. `/develop-bug` is one of the three runnable commands.
  - **Evidence:** skills/develop-next/SKILL.md:4 (`invokes: [develop-story, develop-task, develop-bug]`), :119 ('only `/develop-story`, `/develop-task` and `/develop-bug` are runnable'); skills/develop-batch SKILL.md description ('/develop-story, /develop-task or /develop-bug')
  - **Fix:** Change workflows.md:72 to `→ /develop-story | /develop-task | /develop-bug`. The develop-batch block (:76-79) names no pipeline commands, so there is nothing to change there; optionally add '(/develop-story | /develop-task | /develop-bug)' after 'pipelines run concurrently'. Also reword :66-67 'The three pipelines above' if develop-bug is not among them.

### `docs/reference/activation-phrases.md`

- [ ] **REFERENCE-16** (low, missing) — line 32
  - **Doc says:** review-pr phrases: 'Review this PR' / 'Does this PR match the task?' / 'Is the evidence there for this PR?'
  - **Source:** review-pr also triggers from a work item, for example 'review the PR for RAPP-702'. It accepts a Jira key, Jira URL or GitHub issue and finds the PR.
  - **Evidence:** skills/review-pr/SKILL.md description ('Accepts a Jira key, Jira URL or GitHub issue and finds its PR… review the PR for RAPP-702')
  - **Fix:** Add "Review the PR for RAPP-702" to the review-pr row.
- [ ] **REFERENCE-6** (medium, missing) — line 108
  - **Doc says:** session-handoff phrases cover only write mode and read mode
  - **Source:** The session-handoff description now triggers on 'hand off to a fresh session', 'context is filling up' and 'continue this in a new context' (continue mode). None of these appear here.
  - **Evidence:** skills/session-handoff/SKILL.md:3 description trigger list
  - **Fix:** Add a row: "Hand off to a fresh session" / "Context is filling up" / "Continue this in a new context" → `session-handoff` (continue mode).
- [ ] **REFERENCE-17** (low, missing) — line 123
  - **Doc says:** wireframe phrases cover mock-ups from a brief only
  - **Source:** wireframe also turns an existing HTML screen or hi-fi mockup into a wireframe (obs #245) and has a `wireframe.js status <file.html>` step.
  - **Evidence:** skills/wireframe/SKILL.md:3 description ('wants an existing HTML screen or hi-fi mockup turned into a wireframe'); :54-62
  - **Fix:** Add "Turn this HTML screen into a wireframe" → `wireframe`.

### `docs/reference/commands.md`

- [ ] **REFERENCE-19** (low, missing) — line 42
  - **Doc says:** `/create-task` — Author a standalone task (no other form listed)
  - **Source:** `/create-task --from-observation <id>[,<id>…]` seeds a task from observation-log entries and parks them on it. It shipped in v0.52.0.
  - **Evidence:** skills/create-task/SKILL.md:182 '`/create-task --from-observation 124,127` cuts a task from observation-log entries'
  - **Fix:** Add a row for `/create-task --from-observation <ids>`.
- [ ] **REFERENCE-18** (low, stale) — line 60
  - **Doc says:** `/review-code` and `/review-code --comment` / `--fix` are the only listed forms
  - **Source:** review-code also takes `--effort LEVEL` and a target of `<PR-number>`, `<base>...<head>` or `--staged`.
  - **Evidence:** skills/review-code/SKILL.md:30 'Invoke as /review-code [target] [--effort LEVEL] [--comment] [--fix]'; :34-35
  - **Fix:** Show `/review-code [PR|base...head|--staged]` and add `--effort LEVEL`.
- [ ] **REFERENCE-1** (medium, stale) — line 62
  - **Doc says:** `/review-pr [PR|branch]` and `/review-pr --comment` / `--no-code` / `--no-docs` are the only listed forms
  - **Source:** review-pr also takes `--effort low|medium|high|max` and `--inline` (posts each finding inline, implies --comment). Its target can also be a work item: a Jira key, a Jira /browse/ or board or /issues/ URL, `#N`, or a GitHub issue URL, which Step 1a resolves to the PR (task.176). The seed is confirmed.
  - **Evidence:** skills/review-pr/SKILL.md:36 `Invoke as /review-pr [target] [--effort LEVEL] [--comment] [--inline] [--no-code] [--no-docs]`; :40 target values; :41 --effort; :43 --inline
  - **Fix:** Change row 61 to `/review-pr [PR|branch|JIRA-KEY|Jira-URL|#issue|issue-URL]` and say that a work item resolves to its PR. Add `--inline` (implies --comment) and `--effort LEVEL` to row 62.
- [ ] **REFERENCE-5** (medium, missing) — line 143
  - **Doc says:** session-handoff rows cover only write mode and read mode
  - **Source:** session-handoff gained a third mode, Continue (task.156). It writes a continuation file beside the work item (`task.N.handoff.{k}.slug.md`, story equivalent, else `.agents/handoffs/`) and prints a paste-ready resume prompt. It also ships an opt-in context-pressure installer (task.157).
  - **Evidence:** skills/session-handoff/SKILL.md:3 (Three modes), :36 Modes table Continue row, :196 `## Continue`; CHANGELOG.md [Unreleased] 'session-handoff gains a continue mode'
  - **Fix:** Add a row for `/session-handoff` in continue mode, asked by intent ('hand off to a fresh session', 'context is filling up'). Say that it writes a co-located continuation file plus a resume prompt that re-verifies first.

### `docs/reference/invocation.md`

- [ ] **REFERENCE-25** (low, stale) — line 177
  - **Doc says:** create-pr "Pushes branch, detects target (develop/main), generates description from template, creates via `gh pr create`."
  - **Source:** create-pr prompts for the target branch and opens the PR with the GitHub CLI or the Bitbucket REST API, depending on the auto-detected platform.
  - **Evidence:** skills/create-pr/SKILL.md description ('Prompts for target branch … using the GitHub CLI (GitHub) or Bitbucket REST API (Bitbucket)')
  - **Fix:** Change to 'prompts for the target … creates via `gh pr create` (GitHub) or the Bitbucket REST API'.

### `docs/runbooks/document-existing-project.md`

- [ ] **RUNBOOKS-21** (low, stale) — line 7
  - **Doc says:** 'there is also a legacy `/document-project` slug; it is now a thin deprecation stub that points here.'
  - **Source:** `skills/document-project/` was deleted outright, not replaced by a stub. `/document-project` no longer exists.
  - **Evidence:** commit 6510d78e ('Delete legacy skills/document-project/SKILL.md'); no tracked `skills/document-project/` path
  - **Fix:** Change to: 'The former `/document-project` skill was removed; use `/document-existing-project`.' Or delete the note.

### `docs/runbooks/qa-flow.md`

- [ ] **RUNBOOKS-24** (low, missing) — line 136
  - **Doc says:** Phase 3b shows only `/review-pr --effort medium --comment` (the orchestrator's call on the current branch's PR)
  - **Source:** Since task.176, a standalone `/review-pr` also accepts a work item as target: a Jira key or URL, a GitHub issue URL or `#N`. It resolves the item to its PR, and `resolved_via` names the route.
  - **Evidence:** skills/review-pr/SKILL.md:36,40 (target: `<PR-number>`|`<PR-URL>`|`<branch>`|`<JIRA-KEY>`|`<Jira-URL>`|`#<issue>`|`<GitHub-issue-URL>`); CHANGELOG.md [Unreleased] '/review-pr starts from the work item'
  - **Fix:** Add a line for standalone use: `/review-pr [PR | branch | JIRA-KEY | Jira URL | #issue] [--effort …] [--comment]`, linking to the SKILL.md target table.

### `docs/runbooks/sprint-cycle.md`

- [ ] **RUNBOOKS-18** (medium, missing) — line 64
  - **Doc says:** Phase 5 Retrospective points only to `autoskill` and `remember-insight`; the planning, review and completion phases name no sprint-ceremony skill
  - **Source:** The library ships sprint-ceremony skills: `jira-sprint-manager` (start/close sprints, add/remove issues), `jira-sprint-review-prep` (Sprint Review agenda/DoD compliance), `jira-sprint-retrospective` (retro document from Jira + git), and `jira-standup-auditor`.
  - **Evidence:** skills/jira-sprint-retrospective/SKILL.md, skills/jira-sprint-review-prep/SKILL.md, skills/jira-sprint-manager/SKILL.md, skills/jira-standup-auditor/SKILL.md (all present)
  - **Fix:** Add the Jira-tracker options by phase: jira-sprint-manager in Phase 1 (planning) and Phase 4 (closing the sprint), jira-standup-auditor in Phase 2 (daily standups), jira-sprint-review-prep in Phase 3, and jira-sprint-retrospective in Phase 5.

### `docs/runbooks/story-development.md`

- [ ] **RUNBOOKS-9** (medium, stale) — line 132
  - **Doc says:** 'Epic GitHub/Jira issues are created automatically downstream by `develop-story` → `finalise`, via `ensure-epic-github-issue` or `ensure-epic-jira-issue`'; called-skills map (lines 277-280): 'Inside `finalise`, the platform resolver picks one of: ensure-epic-github-issue / ensure-epic-jira-issue'
  - **Source:** finalise never invokes an ensure-epic routine. The epic issue is ensured by `create-story` and `review-story` (both declare `ensure-epic-github-issue`/`ensure-epic-jira-issue` in `invokes:`).
  - **Evidence:** skills/create-story/SKILL.md:4 and skills/review-story/SKILL.md (invokes lists); skills/ensure-epic-github-issue/SKILL.md:3 ('called from create-story and review-story'); `grep ensure-epic skills/finalise/SKILL.md` → no match
  - **Fix:** B.3: 'Epic issues are ensured by `create-story` and `review-story` (via ensure-epic-*)'. Move the two ensure-epic bullets from 'Inside finalise' to the create-story/review-story rows of the upstream map. Same fix for docs/runbooks/jira-publish.md:124 ('ensure-epic-jira-issue — called by finalise').
- [ ] **RUNBOOKS-14** (medium, missing) — line 146
  - **Doc says:** create-story Calls: '`documentation-standards-validator`, optionally `mermaid-architect`'
  - **Source:** create-story also invokes `wireframe` (§5.4.6, for UI stories; added as wireloom and renamed to wireframe in [Unreleased]) and the ensure-epic/ensure-story issue routines. review-story also invokes `wireframe` and runs its `check` on embedded wireloom blocks.
  - **Evidence:** skills/create-story/SKILL.md:4 (invokes: […, mermaid-architect, wireframe]), :687 ('5.4.6 Check for UI/Wireframe Opportunity (conditional, via `wireframe`)'); CHANGELOG.md [Unreleased] '/wireloom is now /wireframe'
  - **Fix:** Add `wireframe` (UI stories) and `ensure-story-*`/`ensure-epic-*` to the create-story Calls row and to the upstream called-skills table (line 288).

### `README.md`

- [ ] **OVERVIEW-27** (low, inconsistent) — line 148
  - **Doc says:** Contributing step 4: 'Update docs/reference/skill-catalog.md'
  - **Source:** The catalog is generated and CI diffs it, so a hand edit is overwritten or fails the check. CONTRIBUTING.md:42 says to run `npm run generate-catalog`.
  - **Evidence:** docs/reference/skill-catalog.md:5-6 ('auto-generated … Run `npm run generate-catalog`'); CONTRIBUTING.md:42; .github/workflows/validate.yml:19
  - **Fix:** Change to 'Run `npm run generate-catalog` (regenerates docs/reference/skill-catalog.md and the README badge)'.

### `skills/develop-next/README.md`

- [ ] **SKILL-READMES-STANDARDS-17** (low, missing) — line 3
  - **Doc says:** /develop-next 'takes the next unblocked item on the consumer project's completion roadmap'
  - **Source:** Selection also derives a frontier from the task and bug registries; roadmap-complete means the roadmap and both registries are exhausted, and Step 4 annotates the task-registry row (registry-tick.js --annotate)
  - **Evidence:** skills/develop-next/SKILL.md:119 ('roadmap-complete now means the roadmap and both registries are exhausted'), :406 (item.source = task-registry), :422 (registry-tick.js --annotate); commit ef54b2b2
  - **Fix:** Add a sentence: when the roadmap has no runnable row, the selector falls back to docs/tasks/task-registry.md and docs/bugs/bug-registry.md, and a registry-sourced item is recorded by annotating its registry row.
- [ ] **SKILL-READMES-STANDARDS-18** (low, missing) — line 29
  - **Doc says:** Parallel batch: `select-next.mjs --batch` is 'a planning aid' that returns `git worktree add` commands; develop in parallel, merge serially
  - **Source:** /develop-batch automates that fan-out (worktrees, concurrent pipelines, serial rebase+merge, ticks)
  - **Evidence:** skills/develop-batch/SKILL.md (frontmatter description); skills/develop-batch/README.md:150-155
  - **Fix:** Point the bullet at /develop-batch (and its README) as the automated path, keeping select-next.mjs --batch as the read-only preview.

### `skills/qa-next/README.md`

- [ ] **SKILL-READMES-STANDARDS-19** (low, broken) — line 80
  - **Doc says:** '`uat-automate <id>` (a separate skill: branch -> spec ... -> PR) turns it into a regression test' (also L43 '/qa-next and uat-automate update it')
  - **Source:** No uat-automate skill ships in this repository; qa-next's own SKILL.md qualifies the hand-off 'until that skill exists in the consumer'
  - **Evidence:** ls skills/ (no uat-automate); skills/qa-next/SKILL.md:229
  - **Fix:** Say uat-automate is a consumer-side skill not shipped here, and give the fallback from SKILL.md:229 (the Automation candidate block is the spec brief; run --automated when the spec lands).

### `skills/review-story/README.md`

- [ ] **SKILL-READMES-STANDARDS-23** (medium, missing) — line 3
  - **Doc says:** README describes only the interactive review (Quick Start, process, output) with no other mode
  - **Source:** review-story has a second mode, Validate (`--validate` or 'is this story ready?'): a non-interactive GO/NO-GO gate with a 1-10 readiness score, plus a validate-and-apply variant used by develop-story
  - **Evidence:** skills/review-story/SKILL.md:3 (description), :36-60 (Validate Mode, /review-story --validate ...), :71 (validate output artifact), :148 (APPLY=true)
  - **Fix:** Add a 'Validate mode' section with the --validate invocations, the GO/NO-GO output and when develop-story uses validate-and-apply.
- [ ] **SKILL-READMES-STANDARDS-24** (low, stale) — line 75
  - **Doc says:** '8-step comprehensive analysis' ending at '8. Review Report'; question rounds after Steps 1-2/3-4/5-7
  - **Source:** SKILL.md runs Step 0 (mode/output), 0a, 1 (context + parallel pre-pass), 2-8, 6.5 Mermaid validation, 6.6 Wireframe verification (via wireframe, shipped since v0.52), 9 output, 9.5 offer fixes, 9.6 tracker sync, 10 status update, 11 tracker comment
  - **Evidence:** skills/review-story/SKILL.md:412-2450 step headings (Step 6.6: Wireframe Verification (via `wireframe`) at :1376)
  - **Fix:** Update the step list to the SKILL headings, including 6.6 wireframe verification and steps 9.5, 9.6, 10 and 11. Also replace the '3 batched rounds' section (L45-49) and the '3 question points' feature bullet with the single Unified Question Point (one batch of at most 4 questions after Step 8, skipped in validate mode).

### `skills/review-task/README.md`

- [ ] **SKILL-READMES-STANDARDS-22** (low, stale) — line 73
  - **Doc says:** '7-step comprehensive analysis' (1 Template ... 7 Readiness Scoring); question rounds 'After Step 1 / After Steps 2-3 / After Steps 4-5' (L45-47)
  - **Source:** SKILL.md runs 'Review Workflow (8 Sequential Steps)': Step 0 output format, 0a branch setup, 1 config, 1.5 parallel pre-pass, 2 template, 3 technical accuracy, 4 plan, 6 consistency, 6.5 mermaid, 7 risk, 8 output, 8.5 offer fixes, 9 status; QP1 follows Step 2, QP2 Step 4, QP3 Step 7
  - **Evidence:** skills/review-task/SKILL.md:309-1767 headings (Step 0 ... Step 8.5), :750, :1150, :1364 (QUESTION POINTs)
  - **Fix:** Rewrite the list from SKILL headings: 0 output format, 0a branch setup, 1 config/context (with the Phase 1.5 parallel pre-pass), 2 template, 3 technical accuracy, 4 plan completeness, 6 consistency, 6.5 Mermaid validation, 7 risk/rollback, 8 output (full report or action plan only), 8.5 offer fixes, 8.6 Jira body push, 9 status update, 10 tracker comment. Question points come after Steps 2, 4 and 7.
- [ ] **SKILL-READMES-STANDARDS-21** (medium, broken) — line 222
  - **Doc says:** Complements / See Also: `/qa-technical-task` - QA review for tasks (also L270)
  - **Source:** No such skill; task QA is /qa-task
  - **Evidence:** skills/qa-task/SKILL.md exists; no skills/qa-technical-task directory
  - **Fix:** Replace `/qa-technical-task` with `/qa-task` at skills/review-task/README.md L229 and L270.

## Key Patterns and References

- Edit `shared/resources/` sources, never `skills/*/references/` copies (none is in scope).
- Line numbers are from 2026-10-07; find each passage by its quoted text if the line moved.
- When a fix restates a rule, cite the source file rather than paraphrasing it in a second place.

## Testing Approach

- Per finding: re-read the cited source line after editing; grep the doc for the old wording.
- Per file: `prettier --check` and the CI link checker.
