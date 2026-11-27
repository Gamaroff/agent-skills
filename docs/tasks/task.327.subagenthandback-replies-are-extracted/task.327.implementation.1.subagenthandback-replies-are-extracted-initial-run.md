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
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.327.qa.{N}.*.md`; `task.327.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 4 gates (CONCERNS → FAIL → PASS 92 → PASS 100), 2 fix cycles + 1 DoD re-entry; review-pr CONCERNS (no coverage finding) | —                    | 2026-11-27T00:52Z |
| 7. finalise                | ✅ Done    | `task.327.dod.{N}.*.md`; task `status: accepted`                       | dod.1 GAPS (#6, #10), then QA re-entry; dod.2 ✅ ACCEPTED, 14/14; acceptance commit `0fec95fba` | —                    | 2026-11-27T01:08Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-11-27T01:10Z |

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

### Step 7 — finalise (DoD run 2) — 2026-11-27

- Preconditions ok; record criteria ok (#9 confirmed in qa.1:76–78); re-run at head not-configured.
- Re-run scope: scoped (prior-record dod.1 at `fdcf01da1672`). 9 re-judged, 5 carried.
- Four DoD agents ran in parallel. AC YAML extracted with `reply: handback`, sha256 `c79de9a4c07f…`, and the record reads `verified: true`. Security: the plan was reused from dod.1 (`reusable`) and re-run, 23 executed, 0 reproduced, 0 escaped. Compliance NOT_APPLICABLE; docs PASS.
- CI reading 1: SUCCESS @ `24ce5725c001` over 6 checks; grading #12 against it gave PASS, so AC_OVERALL re-folded to PASS. CI reading 2: SUCCESS (tree-equivalent to 1d914ac8e4a3) @ `0fec95fbab5e`.
- The DoD 1 gaps section was retitled "historical, superseded" (closes PC-2). Registry row ticked (staged). The pr-review.2 report rode the acceptance commit ("5c review carried").
- 6d: cites (task 327). Canonical PR comment posted. Tracker: done comment posted, issue #952 CLOSED, board `already`. The Document link already pointed at develop.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 7 — finalise DoD gaps (HALT).** `task.327.dod.1` reads ❌ GAPS IDENTIFIED: AC 12/14, with security (23 probed, 0 reproduced), docs, the PR review and CI reading 1 (SUCCESS @ `fdcf01da1672`) all green. Fix-and-recheck was closed: both findings are medium.
  - **#6** (medium): no stale-`--out` test for `transcript-ambiguous`, `empty-block` or `entity-escaped`. The code is correct (`clearOut` runs before every branch). Fixing it is a code change, so it re-enters QA at 5a.
  - **#10** (medium, needs an owner decision): tests `:351`, `:427` and `:436` guard rules that already held before the change, so they could never be red before it. qa.1:67 recorded 7 of 10 and the QA loop graded the criterion PASS anyway, through three gates. The criterion's wording is not edited to fit the evidence.
- Probe plan and AC YAML were both extracted from the agents' transcripts with `reply: handback`. That is this task's own feature, used for real for the first time.

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
- Fast gate: ci:fast on the LAN test server → 8921 pass, 0 fail. Commit `17b74641b` (fix, gate 1, QA report 1, this report); push-policy qa-cycle → push.

### QA Cycle 2 — 2026-11-26
**Gate Result**: FAIL
**Issues Found**: 2: T327-QA-4 a hand-back from an earlier turn is extracted after a new prompt (high, reproduced, new to the branch); T327-QA-5 an lstat error reads as nothing there (low, reproduced). All four cycle-1 findings verified fixed.
**HIGH findings**: 1
**MEDIUM findings**: 0
**Traceability**: skipped (not re-run — cycle 2)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)

- changes-requested → stage-disabled. Findings inline from gate 2 (ingester not dispatched).
- Narrowing residue: shared/resources/agent-reply-block.js (trigger: repeat subject, from `repeat-subject.mjs`). Move: patch, because the findings are distinct defects in different mechanisms: cycle 1's were the `--out` removal, and this cycle's high is reply selection across a turn boundary.
- T327-QA-4: new `isPrompt()`. A `user` line that is not only `tool_result` blocks opens a new turn and drops the hand-back; the hand-back's own `tool_result` keeps it. Test "task 327 QA-4 …": string and block-array prompts give unreadable, a new hand-back gives the new block, and the control is extracted.
- T327-QA-5: `clearOut` treats only ENOENT as nothing there; any other lstat error is a named `usage` refusal. Test "task 327 QA-5 …".
- CR-3 (advisory cleanup) applied: the module header now says usage answers leave `--out` in place and a symlink `--out` is removed, not followed.
- Mutations: (j) never clear → QA-4 red; (k) every user line clears → 4 tests red (hand-back-only, same-message tie, hand-back-after-text, QA-4); (l) every lstat error absent → QA-5 red. Each reverted.
- Probe: phrase "SubagentHandback" + "final turn" across SKILL.md and shared resources: `skills/finalise/SKILL.md` names the reply field and does not state the turn rule (unaffected); CHANGELOG bullet updated. Population 1 code site.
- Fast gate: ci:fast on the LAN test server → 8923 pass, 0 fail. Commit `53bcb574e` (fix, gate 2, QA report 2, this report); push-policy qa-cycle → push.

### QA Cycle 3 — 2026-11-26
**Gate Result**: PASS
**Issues Found**: 0 gating. 3 advisory cleanups (CR-1 mixed prompt-line test, CR-2 non-array user content, CR-3 JSDoc placement), recorded under gate 3 `recommendations.future`. Real host transcript re-extracted: sha256 unchanged.
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (not re-run — cycle 3)
**PR Review**: APPROVE — task.327.pr-review.1 (conformance lens only, `--no-code`); PC-1 low (no `pr_number:`) fixed by doc carry: `pr_number: 959` added to the task frontmatter
**Loop exit**: route 1 — gate PASS, no open finding
**Action**: Proceeding to 5c → Step 7
- Push note: push-policy deferred the gate 3 commit (docs only), but it was pushed before 5c so the PR head the review read carries gate 3. Deviation logged.

### QA Cycle 4 — 2026-11-27
**Re-entry**: from Step 7 after DoD 1 gaps (`reenter-qa-after-finalise.sh`, reason `dod-gaps-code-fix`, gate_head 53bcb574e). The owner approved the fix route.
**Fix**: commit 1d914ac8e. #6: the stale `--out` test seeds all six non-extracted reasons. #10: the criterion was amended ("approved by the owner, 2026-11-27") to accept red under a named mutation for guards of pre-existing rules.
**Gate Result**: PASS (100/100)
**Issues Found**: 0 gating. CR-1 (low/medium: the coverage check trusts `REASONS`; measured, no present defect) and CR-2 (cleanup) are advisory, under gate 4 `recommendations.future`.
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (not re-run — cycle 4, test-only change)
**Evidence**: mutations b, c, c2, m re-run by QA, each red on the named test. Probe plan at head: 23 executed, 0 reproduced, 0 escaped. ci:fast 8926 tests, 8923 pass, 0 fail.
**PR Review**: CONCERNS — task.327.pr-review.2 (conformance lens only, `--no-code`). PC-1 medium trail (this entry missing) is fixed by this entry. PC-2 low: the DoD gaps section is superseded at acceptance. No coverage finding.
**Loop exit**: route 2 — CONCERNS with no open coverage finding
**Action**: Proceeding to 5c → Step 7
- Push note: push-policy deferred the gate 4 commit (docs only); it was pushed before 5c so the review read gate 4. Deviation logged.

---

## Completion

**Finished**: 2026-11-27T01:10Z
**Final Status**: Completed
**Branch**: feature/task.327.subagenthandback-replies-are-extracted
**PR**: https://github.com/Gamaroff/agent-skills/pull/959
**QA Iterations**: 4
**DoD Summary**: task.327.dod.2.subagenthandback-replies-are-extracted.md — ✅ ACCEPTED (dod.1 GAPS, superseded)
**Tracker debt**: none

**Completion Summary**: Implemented `SubagentHandback` reply extraction in `agent-reply-block.js`. It adds a `reply` field and a newest-reply rule. A failed extract now clears `--out` first, and an `--out` that names the transcript, or a directory, is refused. The work took 4 QA gates (CONCERNS → FAIL → PASS 92 → PASS 100) and 2 fix cycles. DoD 1 found two gaps and sent the work back to QA once: the #6 stale-`--out` cases were added, and the owner approved an amendment to #10 that accepts mutation evidence for guards of pre-existing rules. DoD run 2 used the feature live: its AC YAML was extracted from a real hand-back (`verified: true`).
