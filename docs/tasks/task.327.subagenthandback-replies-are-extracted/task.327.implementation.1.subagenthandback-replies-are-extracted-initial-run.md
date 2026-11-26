# Implementation Report: SubagentHandback replies are extracted, not hand-copied

**Task**: `task.327.subagenthandback-replies-are-extracted.md`
**Run Number**: 1
**Started**: 2026-11-26 20:12
**Status**: In Progress
**Report format**: 2

---

## Summary

Teach the shared agent-reply reader to take a `SubagentHandback` message as the reply, and clear `--out` before an extract runs.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (work-started transitioned)                                  |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.327.*` exists in git                              | Branch created at `3f344ccfa` | —                    | 2026-11-26T20:10Z |
| 2. review-task             | ✅ Done    | `task.327.review.{N}.{name}.md` exists (or skip logged)                | review.1 — 9/10 READY; Planned → Ready for Development | —                    | 2026-11-26T20:12Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 4/4 phases; ci:fast 8919/0 | —                    | 2026-11-26T20:32Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #959: https://github.com/Gamaroff/agent-skills/pull/959 | —                    | 2026-11-26T20:34Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.327.qa.{N}.*.md`; `task.327.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.327.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-26

- Invoked by `/develop-next` (roadmap item T327) with `--defaults`; Phase 0d asked nothing (`questions[]` empty).
- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- Mode: standard — source: detector (Phase 0 run inline, Agent 3 not dispatched: risk_level=low, phase_count=4, single_module=true → phase_count ≥ 3 → standard)
- Skips: none; refused: none; errors: none
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: Planned — Step 2 (`/review-task`) validates and promotes.
- Tracker: github, issue #952.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Phase 0b: no previous run (no branch, PR or implementation report).
- Branch: `feature/task.327.subagenthandback-replies-are-extracted` from develop, pushed. Report stashed before branch creation and restored after.
- review-task output: Comprehensive report — required for pipeline audit trail. Review run inline; pre-pass Agents B and C not dispatched (independence loss recorded in the report).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Review report: docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.review.1.subagenthandback-replies-are-extracted.md (reviewed_blob written). Important fix applied: `--out` = `--transcript` refusal.
- Review outcome comment skipped — review-task reported posted (stage review-task-1). Tracker key unchanged at Step 2 (#952).
- Tracker comment work-started: posted.
- Plan file found: docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.plan.subagenthandback-replies-are-extracted.md — included as implementation context for /develop
- Pre-develop surface map: 6 files identified in shared/resources + skills/finalise (performed inline — no Explore subagent dispatched; independence loss): `shared/resources/agent-reply-block.js` (the reader), its test `shared/resources/tests/agent-reply-block.test.mjs`, `shared/resources/finalise-rerun-scope.js` (delegates at `extract`), `shared/resources/tests/finalise-rerun-scope.test.mjs`, `skills/finalise/SKILL.md` (two fallback paragraphs), `skills/finalise/references/agent-reply-block.js` (bundled copy), `CHANGELOG.md`.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already in context.
- Red runs (before the change): 7 of 10 new `agent-reply-block` cases failed (hand-back only, control `reply` field, both orders, same-message tie, stale `--out`, `--out` = `--transcript`); 3 held already (earlier-turn no-block, other tool name, empty message) and are held by mutations (b), (c), (c2).
- Mutation table (each reverted after): (a) drop hand-back branch → 3 module cases + the CLI hand-back/merge case red; (b) hand-back wins regardless of order → "text after hand-back" and "earlier hand-back then text" red; (c) any tool name → "another name is never read" red; (c2) accept empty message → "empty or not a string" red; (d) drop `rmSync` → module stale-`--out` case + CLI stale-`--out` case red; (e) drop the usage refusal → "`--out` names the `--transcript`" red; (f) drop the in-`extract` same-file guard → same test red (direct-call assertion added for it).
- Real transcript: `command node shared/resources/agent-reply-block.js extract --transcript ~/.claude/projects/<project>/<session>/subagents/agent-a7b3a36606dac7dad.jsonl --block finalise-ac-yaml --out <scratch>/ac.yaml --json` → `extracted`, 17900 bytes, sha256 `77072d335c5e3efee8b7192872d87b047c51a7fe5398afd668f0f8f602a970c9`, `reply: handback`; byte-identical (`cmp`) to the `jq | awk` hand copy.
- Formatting: prettier reformatted the three edited JS files; `npm run bundle` then `bundle:check` clean (129 skills, 0 problems).
- Fast gate iter 1: `npm run test:remote` (ci:fast on the LAN test server) → TEST_EXIT=0, 8919 pass, 0 fail; tmp-leak ratchet ok. CHANGELOG placement: 987 bullets below the first release heading at base and head (new entry is in `[Unreleased]`).
- Loop audit run inline (no Explore subagent): status Ready for Review, 4/4 phases ticked. Development completion comment posted to github issue 952.
- Hook note: a PostToolUse hook flagged "a dozen edits between the same two test runs"; those were the deliberate mutate/revert cycles above, not a stuck fix. GitHub board: work-started → transitioned. Priority-default block not run (issue already prioritised by create-task).

---

### Step 4 — create-pr

- Scope: work-item dir, CHANGELOG.md, shared/resources, shared/resources/tests, skills/finalise/references, skills/finalise. No out-of-scope untracked files held; leak check clean on both commits.
- Report links: doc-links 0 relative links, ok.
- Commits: `930e65c9a` (review 1), `c1976c873` (implementation); pushed.
- PR created: https://github.com/Gamaroff/agent-skills/pull/959 (base develop, Closes #952). PR body written by hand; summariser subagent not dispatched.
- Tracker in-review comment: posted. GitHub board: in-review → stage-disabled. Post-PR state check (inline `gh pr view`, poller not dispatched): OPEN, errors = 0.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-26
**Gate Result**: CONCERNS
**Issues Found**: 4: T327-QA-1 symlinked transcript passes the same-file guard and is deleted (medium, reproduced); T327-CI-1 link-check red on a mailto false link in this report (medium); T327-QA-2 criterion 7 added without a recorded approver (medium); T327-QA-3 directory --out crashes extract (low)
**HIGH findings**: 0
**MEDIUM findings**: 3
**Traceability**: skipped (mapper not dispatched — criteria mapped inline by qa-task)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)

- Findings ingested inline from gate 1, which this session wrote; the ingester subagent was not dispatched (independence loss). changes-requested → stage-disabled.
- T327-QA-1: new `sameFile()` compares resolved path, then dev+ino when both exist. Both guards use it. `extract` now finds the transcript (agent-id discovery included) before removing `--out`, and refuses with exit 2 when `--out` is any file it could read. Test: "task 327 QA-1 … symlink, hard link or the agent-id route" (6 routes + control).
- T327-QA-3: new `clearOut()` refuses a directory `--out` and an unremovable one with a named `usage` answer, exit 2. Test: "task 327 QA-3: a directory --out …".
- T327-QA-2: criterion 7 now carries "added in review 1 (Important fix), approved by review-task". Wording otherwise unchanged. criteria-drift reports it `approved: true`. The approver is the pipeline's review step, not a person: under develop-next the review fix was auto-accepted.
- T327-CI-1: the report's fast-gate line names "the LAN test server", not user@address. The report is committed with this cycle's fix (deviation from Step 8 deferral), so the `link-check` lane re-runs on a fixed tree.
- Mutations: (g) identity by spelling only → QA-1 test red; (h) agent-id route not checked → QA-1 test red; (i) no directory refusal → QA-3 test red. Each reverted.
- Probe: `git grep` for the refusal message and "names the `--transcript`" across SKILL.md, references and shared resources → only `shared/resources/agent-reply-block.js` (updated). CHANGELOG bullet updated. Population 1.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.327.subagenthandback-replies-are-extracted
**PR**: https://github.com/Gamaroff/agent-skills/pull/959
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
