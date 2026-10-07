---
id: task.196.plan
title: "Implementation Plan: Pipeline docs: QA loop, resume and artifacts"
type: plan
task-ref: task.196.pipeline-docs-qa-loop-and-artifacts.md
---

# Implementation Plan: Pipeline docs: QA loop, resume and artifacts

> Requirements and success criteria: [task.196.pipeline-docs-qa-loop-and-artifacts.md](task.196.pipeline-docs-qa-loop-and-artifacts.md)

## Overview

31 findings, each with what the doc says, what the source says, the evidence and the fix, copied from the verified audit (`develop` @ `a0e135a6`). Phase 0 re-checks each one before it is edited.

## Findings by doc

### `docs/concepts/architecture.md`

- [ ] **OVERVIEW-15** (medium, stale) — line 138
  - **Doc says:** `alt gate CONCERNS / FAIL → qa-fix`; Step 5c runs on a 'clean gate only'; line 153: '`PASS`/`WAIVED` hands to Step 5c'
  - **Source:** The loop routes on the gate's queue, not its verdict token. A CONCERNS gate with no open `top_issues[]` entry goes straight to 5c. The Diminishing-returns (route 2) and Cosmetic-residue (route 2b) exits also hand to 5c with open entries. Only FAIL, or a gate with open entries, goes to qa-fix.
  - **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:346-350 ('CONCERNS with no open entry … proceed to 5c'), :351-356 (FAIL/open entries → convergence check → route classifier → 5b), :357-362 (route 2b)
  - **Fix:** Change the alt branch to 'gate has open top_issues[] (FAIL, or CONCERNS/PASS with open entries)'. Reword line 153 as: 'a gate with no open entry (PASS, CONCERNS or active WAIVED), or a route-2/2b exit, hands to Step 5c'.

### `docs/concepts/quickstart-story.md`

- [ ] **OVERVIEW-8** (medium, missing) — line 145
  - **Doc says:** 'You should have all 10 artifact types' from `ls` of the story directory, with row 10 = `dod.1` 'Definition-of-Done checklist + sprint review summary'
  - **Source:** There is no `story.{N}.1.pr-review.1.add-footer-link.md` row, though Step 5c writes one. The sprint review is a separate `sprint-review-summary.md`, not part of the DoD file. Rows 1-2 (PRD and epic) are not in the story directory the `ls` lists.
  - **Evidence:** skills/review-pr/SKILL.md:663 (`.pr-review.{n}.` kind); skills/finalise/SKILL.md:1287-1289 (`{story-directory}/sprint-review-summary.md`)
  - **Fix:** Add a `story.{N}.1.pr-review.1.add-footer-link.md` row (review-pr, Step 5c) and a separate `sprint-review-summary.md` row. Note that the PRD and epic live in parent directories.
- [ ] **OVERVIEW-23** (low, stale) — line 200
  - **Doc says:** '`/develop-story` pauses at QA planning — Expected — test plan generation'
  - **Source:** The pipeline always skips /qa-planning silently. There is no QA-planning pause or prompt.
  - **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:601 ('the pipeline always skips `/qa-planning`. Do not prompt for it'), :682
  - **Fix:** Delete the row.
- [ ] **OVERVIEW-25** (low, inconsistent) — line 210
  - **Doc says:** Lifecycle states: `draft → ready-for-development → in-progress → accepted`
  - **Source:** The canonical lifecycle also includes `planned` and `ready-for-review`. quickstart-task.md:160 and getting-started.md:431 state it in full.
  - **Evidence:** shared/resources/document-status-lifecycle.md (draft → planned → ready-for-development → in-progress → ready-for-review → accepted)
  - **Fix:** Change to `draft → ready-for-development → in-progress → ready-for-review → accepted` (story lifecycle; `planned` is task-only per document-status-lifecycle.md:58). Or give the full ladder with a note that `planned` applies to tasks only.

### `docs/concepts/quickstart-task.md`

- [ ] **OVERVIEW-7** (medium, missing) — line 108
  - **Doc says:** 'You should see' lists six files: spec, plan, implementation, qa, gate, dod
  - **Source:** A develop-task run also writes the Step 2 review report `task.{N}.review.{n}.{name}.md`, the Step 5c PR review report `task.{N}.pr-review.{n}.{name}.md` (the QA loop's exit gate) and `sprint-review-summary.md`. A user checking against this table would conclude Step 5c never ran.
  - **Evidence:** skills/review-pr/SKILL.md:663-666 (`.pr-review.{n}.` artifact); skills/finalise/SKILL.md:1289 (`sprint-review-summary.md`); docs/tasks/task.194.*/ (review.1, pr-review.1, sprint-review-summary.md present)
  - **Fix:** Add rows for `task.{N}.review.1.{name}.md` (review-task), `task.{N}.pr-review.1.{name}.md` (review-pr, Step 5c) and `sprint-review-summary.md` (finalise).

### `docs/operations/workflows.md`

- [ ] **OVERVIEW-16** (low, inconsistent) — line 111
  - **Doc says:** 'On a PASS/WAIVED gate the loop does not end — it hands to Step 5c'
  - **Source:** A CONCERNS gate with an empty or all-closed queue also hands to 5c (route 3), as do the Diminishing-returns and Cosmetic-residue exits. 'Fix Cycle (if needed)' reads as if CONCERNS always means qa-fix.
  - **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:346-350
  - **Fix:** Change to 'On a gate with no open findings (PASS, CONCERNS or an active WAIVED), or a route-2/2b exit, the loop hands to Step 5c'.

### `docs/reference/pipeline-artifacts.md`

- [ ] **REFERENCE-20** (low, stale) — line 73
  - **Doc says:** "## The nine documents, in plain terms"
  - **Source:** The table has ten rows: work item, plan, review report, PR review report, security review report, implementation report, QA report, gate file, DoD summary and tracker handover.
  - **Evidence:** docs/reference/pipeline-artifacts.md:77-86
  - **Fix:** Drop the count ('The documents, in plain terms') or change it to ten.
- [ ] **REFERENCE-21** (low, stale) — line 97
  - **Doc says:** `develop-pipeline.last-halt.json` — "Written on HALT; persists until you choose 'Start fresh' on the next run"
  - **Source:** Choosing Resume runs `advance-pipeline-lock.sh --restore <doc-dir>`, which rebuilds the lock from the snapshot and consumes it. Step 8 also deletes a sole legacy snapshot. An orphaned `.lock.pausing.<pid>` claim is the other restore candidate and isn't listed.
  - **Evidence:** shared/resources/develop-pipeline-pause.md:80 ('--restore … consumes the source'; 'Step 8 deletes such a snapshot')
  - **Fix:** Change the lifetime to 'Written on HALT/pause; consumed by --restore on Resume (or left behind on Start fresh)'. Add a `.lock.pausing.<pid>` row.

### `docs/reference/troubleshooting.md`

- [ ] **REFERENCE-11** (medium, missing) — line 192
  - **Doc says:** QA loop hits 5 cycles → "Stop the orchestrator. Read the QA report, address the underlying issue manually, then run /qa-story or /qa-task to re-gate."
  - **Source:** There is a documented resume path after a loop-limit or not-converging escalation. Resume rebuilds the cycle count from disk and offers a grant of extra cycles (`grant-qa-cycles.sh`, which writes `qa_max_cycles` / `extra_cycles_granted` on the lock), so the pipeline can continue rather than be driven by hand.
  - **Evidence:** shared/resources/develop-pipeline-resume-contract.md:521 '### Re-entry after a QA loop escalation'; shared/resources/develop-pipeline-step-5-6-qa-loop.md:16 (QA_MAX_CYCLES from lock `qa_max_cycles`, writer grant-qa-cycles.sh)
  - **Fix:** Add: re-invoke `/develop-*` and choose Resume. It reconstructs the cycle count and offers extra cycles (grant-qa-cycles.sh). Running qa-* standalone is then counted, not repeated.
- [ ] **REFERENCE-12** (medium, missing) — line 225
  - **Doc says:** 'Resume picked up the wrong step' says re-invoking resumes from the artifacts on disk and doesn't cover a finalise DoD-gaps halt
  - **Source:** New in task.170: after a `/finalise` DoD-gaps halt, a committed code fix past the newest gate's `head:` re-enters the QA loop at step 5 / qa_phase 5a through `reenter-qa-after-finalise.sh` instead of re-running finalise. It sets `qa_max_cycles = max(existing, base+2)`. A docs-only fix resumes at 7, and an uncommitted fix is refused as `uncommitted-fix`.
  - **Evidence:** shared/resources/develop-pipeline-resume-contract.md:606 '### Re-entry after a finalise DoD-gaps halt'; CHANGELOG.md [Unreleased] 'A code fix after a /finalise DoD-gaps halt is gated before acceptance (task.170)'
  - **Fix:** Add a section, 'Finalise halted with DoD gaps and I fixed code'. Commit the fix and re-invoke; the run re-enters QA at 5a. A document-only fix resumes at 7. Mention the `uncommitted-fix` refusal.

### `docs/runbooks/first-week/day-3-messy-path.md`

- [ ] **RUNBOOKS-19** (low, stale) — line 50
  - **Doc says:** Expected artifact: `story.{epic}.{story}.gate.1.*.yml` with `decision: FAIL` (and line 61 `decision: PASS`)
  - **Source:** Gate files record the verdict under the `gate:` key (`gate: PASS|CONCERNS|FAIL|WAIVED`). There is no `decision:` field, so grepping for it finds nothing.
  - **Evidence:** skills/qa-gate/SKILL.md:87 (`gate: PASS # PASS|CONCERNS|FAIL|WAIVED`); skills/qa-story/SKILL.md:274 (`grep '^gate:'`)
  - **Fix:** Change both expectations to `gate: FAIL` / `gate: PASS`. Also line 58: re-run `qa-story` rather than `qa-gate`, which is the manual-override skill.

### `docs/runbooks/story-development.md`

- [ ] **RUNBOOKS-12** (medium, stale) — line 89
  - **Doc says:** review-prd outputs `prd.review.{YYYY-MM-DD}.md`; review-epic (line 126) outputs `epic.{N}.review.{YYYY-MM-DD}.md`; line 164: validate mode and interactive mode 'Both update the story's `status`'
  - **Source:** Review reports are sequence-numbered: `prd.review.{N}.{name}.md` and `epic.{N}.review.{n}.{name}.md`. Standalone `review-story --validate` is read-only and never modifies the story; only the orchestrated validate-and-apply variant promotes status.
  - **Evidence:** skills/review-prd/SKILL.md:140 (`prd.review.{N}.{name}.md`); skills/review-epic/SKILL.md:532-536 (`epic.[N].review.[n].[name].md`); skills/review-story/SKILL.md:147 ('Standalone validate … never modifies the story document')
  - **Fix:** Use `prd.review.{N}.{name}.md` and `epic.{N}.review.{n}.{name}.md`; change line 164 to 'Interactive mode updates `status` once resolved; standalone `--validate` is read-only.'
- [ ] **RUNBOOKS-13** (low, stale) — line 232
  - **Doc says:** Step 2: 'Runs the interactive review (skipped if the story was reviewed recently and is still `ready-for-development`).'
  - **Source:** The pipeline runs review-story in non-interactive validate-and-apply mode. It skips when a review report exists and status is Ready for Development or In Progress; recency is not a criterion.
  - **Evidence:** skills/develop-story/SKILL.md:291 ('Always validate-and-apply … non-interactive, no questions asked'); shared/resources/develop-pipeline-step-2-review.md:30-38 (skip/run table)
  - **Fix:** 'Runs review-story in validate-and-apply mode (no questions). Skipped when a `story.{E}.{S}.review.*.md` report exists and status is Ready for Development or In Progress.' Same correction for task-development.md:111, where develop-task also skips a `Planned` task whose review report is current.
- [ ] **RUNBOOKS-15** (medium, missing) — line 253
  - **Doc says:** Resume semantics: 're-invoke /develop-story <same-path>. The skill … resumes at the first incomplete step.'
  - **Source:** New since v0.52.0 (task.170): when a run halted at Step 7 with DoD `❌ GAPS` and the fix was a committed code change, Phase 0b offers 'Re-enter QA at 5a' (Recommended), which re-enters the QA loop through `reenter-qa-after-finalise.sh`, not at Step 7. A document-only fix resumes at 7; an uncommitted fix is refused.
  - **Evidence:** skills/develop-story/SKILL.md:331 and skills/develop-task/SKILL.md:318 ('Re-entry after a finalise DoD-gaps halt fixed by a code change'); shared/resources/develop-pipeline-resume-contract.md:606
  - **Fix:** Add the re-entry sentence to Resume semantics in story-development.md (~line 253) and task-development.md (~line 132). After a Step 7 DoD-gaps halt fixed by a committed code change, pick 'Re-enter QA at 5a' (Recommended) so the new head is gated before acceptance. A document-only fix resumes at 7; an uncommitted fix is refused.

### `docs/runbooks/task-development.md`

- [ ] **RUNBOOKS-17** (low, stale) — line 74
  - **Doc says:** review-task output: 'Co-located review report `task.{N}.review.{name}.md`'
  - **Source:** The report carries a sequence number: `task.{n}.review.{N}.{descriptive-name}.md`.
  - **Evidence:** skills/review-task/SKILL.md:326, :1432 (`task.{n}.review.{N}.{descriptive-name}.md`); skills/develop-task/SKILL.md:345 (`task.{id}.review.{N}.{name}.md`)
  - **Fix:** Change to `task.{N}.review.{n}.{name}.md`.

### `docs/standards/task-documents.md`

- [ ] **SKILL-READMES-STANDARDS-29** (low, missing) — line 102
  - **Doc says:** Co-located artifacts table (and Directory layout L13-23) lists plan, review, PR review, implementation, QA, DoD, gate
  - **Source:** Pipelines also write sprint-review-summary.md (finalise 6a), continuation handoff task.{n}.handoff.{n}.{name}.md (session-handoff continue), tracker handover task.{n}.handover.{n}.{name}.{md,sh,json} and task bug reports; the layout tree also omits the pr-review file
  - **Evidence:** skills/finalise/SKILL.md:1289,1338 (sprint-review-summary.md committed at 6a); docs/standards/file-naming.md:54-56 (handoff/handover rows); CHANGELOG.md [Unreleased] task.156
  - **Fix:** Add rows for sprint-review-summary.md, handoff, handover and bug reports (or link file-naming.md for the full list), and add the pr-review line to the tree. Same gap in docs/standards/story-documents.md:21-27 and :102-110; file-naming.md has no sprint-review-summary row either.

### `skills/develop-batch/README.md`

- [ ] **SKILL-READMES-STANDARDS-16** (medium, stale) — line 122
  - **Doc says:** Per-item merge gate: 'QA gate file `PASS` + document `accepted`'
  - **Source:** Same as develop-next: accepted + gate not FAIL + no open top_issues[] entry
  - **Evidence:** skills/develop-batch/SKILL.md:382-401 (same table and waiver clause as develop-next Step 3)
  - **Fix:** Same wording change as the develop-next README.

### `skills/develop-next/README.md`

- [ ] **SKILL-READMES-STANDARDS-15** (medium, stale) — line 20
  - **Doc says:** Merge gate: 'QA gate file `PASS` + document `accepted` (finalise output)'
  - **Source:** The gate requires document accepted, gate not FAIL, and no open top_issues[] entry: CONCERNS with no open entry and WAIVED (waiver documented) both merge; a PASS-only reading HALTed task.105
  - **Evidence:** skills/develop-next/SKILL.md:137-158 (Verify green table: accepted+CONCERNS no open -> merge; accepted+WAIVED -> merge)
  - **Fix:** Replace the bullet with: 'document `accepted`, gate not `FAIL`, and no `open` entry in the gate's top_issues[] (CONCERNS/WAIVED with no open finding merge)'.

### `skills/develop-story/README.md`

- [ ] **SKILL-READMES-STANDARDS-6** (medium, stale) — line 121
  - **Doc says:** 'S5gate -- CONCERNS / FAIL --> S6 qa-fix' and L327 'else CONCERNS / FAIL / has top_issues'
  - **Source:** Queue-based routing with route 3 (CONCERNS, empty queue -> 5c), Convergence check, Diminishing-returns/Cosmetic-residue exits and Gate-the-last-fix half-cycle
  - **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:24-60, :310-372
  - **Fix:** Same redraw as the develop-task README diagrams.
- [ ] **SKILL-READMES-STANDARDS-4** (medium, stale) — line 291
  - **Doc says:** ls story.{epic}.{story}.gate.*.yml | sort -t. -k5 -n | tail -1; cycle = (count of "### QA Cycle" entries) + 1
  - **Source:** Gate and cycle are resolved by qa-cycle.sh; the budget is QA_MAX_CYCLES (lock qa_max_cycles, default 5)
  - **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:135-160 and :14-20
  - **Fix:** As proposed. Also fix artifact-table L468 'latest gate sorted by -t. -k5 -n' and 'alt cycle > 5' at L357.
- [ ] **SKILL-READMES-STANDARDS-8** (medium, stale) — line 460
  - **Doc says:** Review report `story.{epic}.{story}.review.{YYYY-MM-DD}.md`; Plan file 'created by /plan or manual' (L461)
  - **Source:** review-story writes story.{epic}.{story}.review.{n}.{story-name}.md; create-story writes the plan file
  - **Evidence:** skills/review-story/SKILL.md:421,431; skills/create-story/SKILL.md:607
  - **Fix:** Change to `story.{epic}.{story}.review.{n}.{name}.md` and attribute the plan file to /create-story.
- [ ] **SKILL-READMES-STANDARDS-10** (medium, stale) — line 467
  - **Doc says:** QA report, gate file and DoD summary 'committed in Step 8'
  - **Source:** Per-cycle QA commits and /finalise's publish boundary (6a commit+push, CI reading 2) carry these; Step 8 commits only the report
  - **Evidence:** shared/resources/develop-pipeline-step-7-finalise.md:133-176
  - **Fix:** Same edit as the develop-task README artifact table.
- [ ] **SKILL-READMES-STANDARDS-12** (medium, stale) — line 512
  - **Doc says:** Pause hook on Jira is silent (requires MCP); Diagram 5 (L394) issue comment is 'GitHub only'
  - **Source:** The hook posts via tracker-comment.js to either tracker when credentials exist
  - **Evidence:** shared/resources/develop-pipeline-on-precompact.sh:16,36-45,322-345
  - **Fix:** Same edit as the develop-task README.

### `skills/develop-task/README.md`

- [ ] **SKILL-READMES-STANDARDS-13** (low, stale) — line 25
  - **Doc says:** Hooks row lists only `PreCompact` -> `scripts/on-precompact.sh`
  - **Source:** The pipeline installs two hooks: PreCompact (graceful pause) and Stop (on-stop.sh, forced continuation via decision: block); install-hooks.sh registers both
  - **Evidence:** skills/develop-task/SKILL.md:13-19 (two hooks, install-hooks.sh); skills/develop-task/scripts/on-stop.sh; skills/develop-story/SKILL.md:176
  - **Fix:** Add 'Stop -> scripts/on-stop.sh (blocks a premature stop mid-pipeline)' and the install command to the Hooks row; same fix in skills/develop-story/README.md:27.
- [ ] **SKILL-READMES-STANDARDS-5** (medium, stale) — line 114
  - **Doc says:** Diagram 1: 'S5gate -- CONCERNS / FAIL --> S6 qa-fix'; Diagram 4 (L312): 'else CONCERNS / FAIL / has top_issues -> /qa-fix'
  - **Source:** The loop routes on the open top_issues[] queue, not the token: a CONCERNS gate with no open entry goes to 5c (route 3); FAIL/open-queue gates first run the Convergence check (escalates from cycle 3) and the route classifier (Diminishing-returns exit route 2, Cosmetic-residue exit route 2b), plus the Gate-the-last-fix half-cycle (route 2c) at budget; a malformed gate HALTs
  - **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:24-60 (five routes, four guards table) and :310-372 (Outcome branching arms); classifyLoopRoute() in shared/resources/qa-diminishing-returns.js
  - **Fix:** Redraw the S5gate fork and Diagram 4's alt block as: no open entry (PASS / active WAIVED / CONCERNS) -> 5c; open entry -> Convergence check -> route classifier -> 5b; add the escalate and half-cycle paths, citing the step-5-6 doc.
- [ ] **SKILL-READMES-STANDARDS-3** (medium, stale) — line 283
  - **Doc says:** find latest gate file: ls task.{id}.gate.*.yml | sort -t. -k4 -n | tail -1; cycle = (count of "### QA Cycle" entries) + 1 (also artifact table L449 'latest gate sorted by -t. -k4 -n')
  - **Source:** The latest gate and cycle number come from the qa-cycle.sh helper (highest-numbered cycle, zero-padding normalised, two files claiming one cycle refused); the loop limit is QA_MAX_CYCLES from the lock's qa_max_cycles, default 5
  - **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:135-160 (QA_CYCLE=$(bash .../qa-cycle.sh ...), task.158) and :14-20 (QA_MAX_CYCLES=$(jq -r '.qa_max_cycles // 5' ...))
  - **Fix:** Replace the two diagram notes and the artifact-table cell with 'QA_CYCLE / LATEST_GATE from references/qa-cycle.sh'; change 'loop cycle ≤ 5' to 'cycle ≤ QA_MAX_CYCLES (lock qa_max_cycles, default 5)'.
- [ ] **SKILL-READMES-STANDARDS-14** (medium, missing) — line 341
  - **Doc says:** Diagram 4 ends at 'cycle > 5 -> escalation -> HALT'; Diagram 1 ends Step 7 gaps at 'HALT: DoD gaps'; resume flow offers only resume-from-step
  - **Source:** Since v0.52 the HALT snapshot supports two QA re-entries: 'Resume at 5a with {k} more cycles' after a loop-limit/not-converging halt (grant-qa-cycles.sh writes extra_cycles_granted/qa_max_cycles) and 'Re-enter QA at 5a' after a finalise DoD-gaps halt fixed by code (reenter-qa-after-finalise.sh, task.170)
  - **Evidence:** skills/develop-task/SKILL.md (Error Recovery: 'Re-entry after a QA loop escalation' -> grant-qa-cycles.sh; 'Re-entry after a finalise DoD-gaps halt fixed by a code change' -> reenter-qa-after-finalise.sh); CHANGELOG.md [Unreleased] task.170 entry
  - **Fix:** As proposed, but do not date it 'since v0.52': the finalise DoD-gaps re-entry (task.170) is unreleased. Add both re-entries to Diagram 5 and to the 'cycle > 5' / 'HALT: DoD gaps' nodes, citing the SKILL Error Recovery sections, and replace the literal 5 with QA_MAX_CYCLES in both READMEs.
- [ ] **SKILL-READMES-STANDARDS-7** (medium, stale) — line 443
  - **Doc says:** Artifact Lifecycle Table: Review report path `task.{id}.review.{YYYY-MM-DD}.md`; Plan file 'upstream (created by /plan or manual)' (L444)
  - **Source:** review-task writes task.{n}.review.{N}.{descriptive-name}.md with N computed by next_numbered; the plan file is written by create-task
  - **Evidence:** skills/review-task/SKILL.md:1432-1436 (REVIEW_N=$(next_numbered ... review ...)); skills/develop-task/SKILL.md:345 'Review report: task.{id}.review.{N}.{name}.md'; skills/create-task/SKILL.md:372,709 (plan created alongside task)
  - **Fix:** Change the path to `task.{id}.review.{N}.{name}.md` and the plan row's 'Created by' to '/create-task (or relocated from an upstream plan)'.
- [ ] **SKILL-READMES-STANDARDS-9** (medium, stale) — line 448
  - **Doc says:** Artifact table: QA report, gate file and DoD summary are 'committed in Step 8'; Step 7 node shows only 'DoD + tracker close + board Done'
  - **Source:** QA report + gate are committed per cycle; /finalise 6a-6c commits and pushes the accepted document, DoD summary, sprint-review-summary.md and registry tick, asserts them on origin and takes a second CI reading before its PR comment/close. Step 8 commits only the implementation report and HALTs if anything else is dirty
  - **Evidence:** shared/resources/develop-pipeline-step-7-finalise.md:133-176 (publish boundary, CI reading 1/2, HALT on dirty paths); :521-536 Step 7 Completion Checklist
  - **Fix:** Set 'Terminal state' for QA report/gate to 'committed per QA cycle' and for DoD summary to 'committed + pushed by /finalise 6a'; add sprint-review-summary.md and registry rows; mention the two CI readings in the Step 7 node/description.
- [ ] **SKILL-READMES-STANDARDS-11** (medium, stale) — line 494
  - **Doc says:** Jira table, Pause hook: '**silent** — Jira posting requires authenticated MCP, unavailable from shell context'; Diagram 5 (L379) 'Hook->>GH: gh issue comment {tracker_issue} (GitHub only)'
  - **Source:** The PreCompact hook posts its issue comment through one tracker-comment.js call that resolves the tracker from the lock, so it reaches Jira when JIRA_URL/JIRA_API_TOKEN/JIRA_USER_EMAIL are in the hook's environment; both writes go through the access gate (deferred under restricted access.tracker)
  - **Evidence:** shared/resources/develop-pipeline-on-precompact.sh:16,36-45 (Jira via tracker-comment.js), :322-345 (issue comment, LOCK_TRACKER), :303-307 (ACCESS_TRACKER deferral)
  - **Fix:** Replace the Jira Pause-hook cell with 'tracker-comment.js --stage (best-effort; posts when JIRA_* credentials are in the hook env; deferred under restricted access.tracker)' and change the diagram arrow to 'tracker-comment.js (GitHub or Jira)'.

### `skills/review-task/README.md`

- [ ] **SKILL-READMES-STANDARDS-20** (medium, stale) — line 88
  - **Doc says:** Output: `[task-directory]/task.{n}.review.{descriptive-name}.md`
  - **Source:** Report is `task.{n}.review.{N}.{descriptive-name}.md`, N computed with next_numbered; Step 0 also offers 'Action plan only' (no file)
  - **Evidence:** skills/review-task/SKILL.md:1432-1436, :1674, :1678 (Option B: Action Plan Only)
  - **Fix:** Change to `task.{n}.review.{N}.{descriptive-name}.md` and mention the action-plan-only option.

## Key Patterns and References

- Edit `shared/resources/` sources, never `skills/*/references/` copies (none is in scope).
- Line numbers are from 2026-10-07; find each passage by its quoted text if the line moved.
- When a fix restates a rule, cite the source file rather than paraphrasing it in a second place.

## Testing Approach

- Per finding: re-read the cited source line after editing; grep the doc for the old wording.
- Per file: `prettier --check` and the CI link checker.
