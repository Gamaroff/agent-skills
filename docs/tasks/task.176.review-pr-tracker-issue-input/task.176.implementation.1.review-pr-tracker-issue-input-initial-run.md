# Implementation Report: /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Task**: `task.176.review-pr-tracker-issue-input.md`
**Run Number**: 1
**Started**: 2026-10-02 17:45
**Status**: In Progress

---

## Summary

Teach `/review-pr` to start from a Jira key/URL or GitHub issue and resolve it to its PR, with a pure parser, per-kind host check, and the corrected shared §0a key → doc lookup.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | feature/task.176.review-pr-tracker-issue-input (existing branch, at develop tip) |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #553 (GitHub)                                                              |
| Board status        | In Progress ✅ (from Todo, verified)                                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | Existing branch reused at `e8ed79a9`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | Skipped — already reviewed (review.1) | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + map); 2 iterations of the fast gate — iter 1: 3 real failures fixed; iter 2: 5079 pass, 0 fail. Audit 18/18 | `.summaries/step-3-test-triage-1.json`, `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-02

- Feature branch base: feature/task.176.review-pr-tracker-issue-input — user chose the recommended option; the branch already exists at develop's tip (e8ed79a9).
- PR target branch: develop — user chose the recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Questions asked (2, matches the required count): Q1 branch base → existing feature branch; Q2 PR target → develop.
- Phase 0b: branch `feature/task.176.*` exists but no PR and no implementation report — no prior pipeline run to resume. Treated as a fresh start; not asked.
- Phase 0 run inline (no Explore fan-out): file path given as task id, resolved directly. Tracker: `TRACKER=github` (`JIRA_URL` unset), `TRACKER_ISSUE=553`.
- Lite-mode inputs derived inline: risk_level=low (risk_ok), phase_count=4 (Phases 0–3; not < 3), single_module=false (review-pr + shared step-0 doc and its bundled copies) → PIPELINE_MODE=standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`.
- Task status at start: `ready-for-development`. A prior session already ran `/review-task` (review.1, 7/10 NEEDS REVISION, 9 important fixes applied, status promoted) but left the task doc, plan and review report uncommitted. Step 2 will check that review report's currency.
- Branch: `feature/task.176.review-pr-tracker-issue-input` reused (already at develop tip); pushed `-u`. Report stashed/restored around `/create-branch`.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned Todo → In Progress (verified). Priority already P2 (set at review), so the unset-only default was not needed.
- review-task skipped — task status is `Ready for Development` and review report exists at `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.review.1.review-pr-tracker-issue-input.md`. Skip notice posted to #553 (stage review).

### Step 3 — Develop

- Pre-develop surface map: 20 files identified in skills/review-pr, shared/resources (step-0 §0a), shared/resources/tests (bash/zsh idiom), 4 bundled step-0 copies. Explore subagent ran (~81 s).
- Plan file found: docs/tasks/task.176.review-pr-tracker-issue-input/task.176.plan.review-pr-tracker-issue-input.md — included as implementation context.
- Step 3 inline — /develop not invoked: plan file + surface map both recorded; the plan names every rung, the parser contract and the four findings.
- Always-load files read: coding-standards.md (shellcheck required after .sh edits; cite shared resources by path).
- Parser: `skills/review-pr/scripts/parse-target.sh` — pure, no env reads (`JIRA_URL` is judged by the skill, not the parser); known hosts (github.com, bitbucket.org, *.atlassian.net) decide first, unknown hosts fall back to disjoint shape arms so GHE / Bitbucket Server / self-hosted Jira PR URLs keep parsing as before.
- Rung 3 filter anchored on the branch's last segment (`== STEM` or ends `/STEM`), stricter than the plan's "contains" — a stem that prefixes a longer slug must not match. GitHub `--limit 1000`, not the plan's 100, so an older work item's PR does not drop off a short page.
- Closing references (`closedByPullRequestsReferences`) go through the selection rules; title/description key matches are always confirmed, even a single one.
- §0a: one shared "Key → document lookup" block; the four call sites link it; several matches HALT instead of `head -1`. Also fixed §0a's GitHub-issue URL extraction (`grep -oE '(?<=/issues/)…'` — PCRE lookbehind, never matched under -E). Small, same block, logged in CHANGELOG.
- review-pr Step 2 keeps its bare (dependency) link to the step-0 doc and adds a fragment citation — converting the bare link to a citation would shrink review-pr's closure and is out of scope.
- Description gains a card trigger (148 words, ≤150). `generate-catalog` produced no diff.
- Fast gate iter 1 (`npm run ci:fast`): 5076 pass, 3 fail — all real, all in SKILL.md: untracked `scripts/parse-target.sh` (bundled-links), bare `$1` in fenced bash (positional-params guard), new `${JIRA_URL:-}` read with no writer (unbound-default guard). Fixed: script staged, `${1}`, plain `$JIRA_URL`. Iter 2: 5079 pass, 0 fail.
- Loop audit: `ready-for-review`, 18/18 Implementation Plan checkboxes. Development completion comment posted to github issue 553.
- Mutation checks (all red, then restored green): board-URL arm, host-first ordering, §0a anchor, `.request.` exclusion, the host-check sed delimiter.

---

## Issues Log

- Step 3: the first draft of the host check used `|` as the sed delimiter **and** as the www/api alternation. sed failed to parse, both sides normalised to "", the pair compared equal and the HALT never fired — fail-open. Caught by running the Step 0b block under bash and zsh; fixed with `#` delimiters and an empty-side guard; held by a mutation.
- Step 3: `ci:fast` ran past the 600 s Bash timeout and was moved to the background.

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.176.review-pr-tracker-issue-input
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
