---
name: develop-pipeline-autonomous-defaults
description: Canonical autonomous decision defaults shared by develop-story and develop-task. Lists every decision taken without user prompting. Skill-specific rows (Register handling for story; Step 9 answer and completion status for task) live in each SKILL.md as a "Skill-specific defaults" addendum.
---

# Develop Pipeline — Autonomous Decision Defaults

Every default applied must be recorded in the Decisions Log.

The rows below apply to both `develop-story` and `develop-task`. Where the two skills differ in terminology only (story ↔ task, `Draft` ↔ `Planned`, `review-story` ↔ `review-task`), both forms are shown. Skill-specific rows that apply to only one orchestrator are listed in each SKILL.md's own **Skill-specific defaults** section beneath the reference line.

| Situation | Default |
|-----------|---------|
| Feature branch base | User-selected in Upfront Setup (Q1) |
| PR target branch | User-selected in Upfront Setup (Q2) |
| High-risk gate (story / task) | User-selected in Upfront Setup (Q3) |
| Story status is `Draft` / Task status is `Planned` | Step 2 runs the review skill (`/review-story` or `/review-task`) to validate and promote autonomously. Do NOT ask the user. |
| Status `Ready for Development` or `In Progress` AND review report exists | Step 2 skips the review skill — document already reviewed |
| Status `Ready for Development` or `In Progress` AND no review report | Step 2 runs the review skill — status set without completing a review |
| Review skill output format | Always select "Comprehensive report" — pipeline requires a co-located review report file |
| Draft/Planned status gate (develop) | Proceed — review skill already validated the document in Step 2 |
| Alignment mismatch (develop) | Align code to document — document is source of truth |
| Commit style | Conventional Commits |
| Commit granularity | Multiple logical commits |
| Implementation report in create-pr commit | EXCLUDE — unstage before create-pr commits; Step 8 commits it |
| Pre-develop codebase mapping | Always run Explore subagent; pass summary to `/develop`, do not re-read files |
| qa-fix with no file changes | HALT — do not increment cycle; log as unfixable and surface to user |
| Resume state validation (story) | Cross-check branch + PR existence before jumping to next step |
| Resume state validation (task) | Per-step artifact verification before skipping any ✅ step |
| Pipeline mode for simple stories | `lite` if `risk_level` low/absent + <3 Tasks + single module; otherwise `standard` |
| Pipeline mode for simple tasks | `lite` if `risk_level` low/absent + <3 phases + single module; otherwise `standard` |
| qa-story / qa-task invocation in lite mode | Prepend "Use direct tools only — skip parallel agents" to the invocation context |
| Final commit push (Step 8) | Always push after Step 8 commit so PR reflects completed report |

If a situation arises that is not covered by this table or the skill-specific table, and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.
