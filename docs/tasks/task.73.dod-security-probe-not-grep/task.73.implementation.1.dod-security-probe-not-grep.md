# Implementation Report: Make the DoD security check execute candidate inputs, not grep for them

**Task**: `task.73.dod-security-probe-not-grep.md`
**Run Number**: 1
**Started**: 2026-09-02 00:00
**Status**: In Progress

---

## Summary

Give the `/finalise` DoD security agent a gated **probe mode**: when a work item's deliverable is a
boundary, the agent generates candidate inputs, executes them against the shipped code, and reports
only what reproduced — instead of grepping for the boundary's existence.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                             |
| PR target           | `develop`                                                                                                                             |
| qa-planning gate    | skipped (auto)                                                                                                                        |
| Task risk level     | medium                                                                                                                                |
| Pipeline mode       | standard                                                                                                                              |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                                                                                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                | Notes | Subagent summary ref |
| -------------------------- | ---------- | ----------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.73.*` exists in git                          | `feature/task.73.dod-security-probe-not-grep` created from `develop` at `4cb3906`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.73.review.{N}.{name}.md` exists (or skip logged)            | READY TO IMPLEMENT, 9/10. 0 Critical / 3 Important / 2 Optional. Report: `task.73.review.1.dod-security-probe-not-grep.md` | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                 | 4 files; 16 contract tests + 7 mutation proofs; `ci:fast` 2157 pass / 0 fail; replay found 12 real routes → bug.6 | — |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                      | PR #297: https://github.com/Gamaroff/agent-skills/pull/297 — 4 logical commits. Issue comment skipped (no linked issue) | — |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.73.qa.{N}.*.md`; `task.73.gate.{N}.*.yml`; PR comment posted | 4 cycles. gate.1 FAIL(70) → gate.2 FAIL(80) → **gate.3 PASS(95)**. 21 findings all closed; 23 mutation proofs | — |
| 7. finalise                | ✅ Done    | `task.73.dod.{N}.*.md`; task `status: accepted`                   | DoD PASSED. CI SUCCESS on `9b2f47d`. CHANGELOG gap found + closed. Tracker N/A (no linked issue) | — |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Pipeline Startup — 2026-09-02

- **Invoked by `/develop-next`** (autonomous run). Item **T73** selected from
  `docs/development/project-completion-roadmap.md` (PHASE 5 — Current frontier, line 88), source
  `roadmap`, no deps, no skipped rows.
- Feature branch base: `develop` — auto-answered with the recommended option per the develop-next
  autonomous directive (no prompt shown).
- PR target branch: `develop` — auto-answered with the recommended option per the develop-next
  autonomous directive (no prompt shown).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0a-parallel: dispatched Agent 2 (tracker poller) and Agent 3 (lite-mode + always-load
  detector). Agent 1 (resolver) not dispatched — the task file path was supplied directly. Neither
  dispatched agent failed.
- `PIPELINE_MODE = standard`, computed from the three booleans Agent 3 reported:
  `risk_level="medium"` → `risk_ok = false` (not in {low, absent}); `phase_count = 4` → not `< 3`;
  `single_module = false`. All three fail, so lite mode does not apply.
- Tracker: `TRACKER=github`, `VCS=github`. The task frontmatter carries no `github_issue:` and no
  `jira_key:` — `TRACKER_ISSUE` is empty, so all tracker signals (pipeline-start comment, board
  moves, PR-opened comment, issue close) are skipped for this run.
- Task status at entry: `ready-for-development` → proceed normally per the Phase 0c status table.

### Step 7 — finalise — 2026-09-02

- Four DoD agents dispatched in parallel. Compliance NOT_APPLICABLE; Security PASS; AC 9/9 PASS;
  Docs FAIL on one item.
- **CI was checked, not assumed.** First sample returned `PENDING` (`test` IN_PROGRESS with
  `conclusion: ""` — the empty-string case that would otherwise read as green). Polled to completion:
  `SUCCESS` on head `9b2f47d`, matching local HEAD exactly.
- **A real gap was found and closed**: the CHANGELOG entry was missing, flagged independently by the
  AC and docs agents against the repo's own rule and the precedent of tasks 67 and 68. Written during
  this step and re-verified — recorded as *found and closed*, not waived.
- **The deliverable was exercised on its own change set.** The security agent returned
  `boundary: false` with its reasoning (prose + tests, no accept/reject function added), which is the
  new contract working: the decision is recorded rather than inferred from an empty list. The render
  takes the `boundary == false` arm, so `probes_executed: 0` correctly does not trigger the
  zero-executed finding.
- Assumption recorded: PR #297 has no human review decision. Satisfied by the QA gate, the green CI
  rollup and the mutation proofs under the repo's ratified auto-merge policy; no approval is claimed.
- Tracker issue close and board move: **N/A** — no `github_issue`/`jira_key` on this task.

### Step 4 — create-pr — 2026-09-02

- Base `develop` pre-supplied from Phase 0d — no prompt shown. Platform GitHub.
- Staging scope: `docs/tasks/task.73.dod-security-probe-not-grep`, `docs/bugs`, `shared/resources`,
  `skills/finalise`, `evals/shared/tests`. No untracked path fell outside scope, so the pre-flight
  hold moved nothing and no leak check was needed.
- `--issue` omitted — no tracker issue linked. Step 6b issue comment skipped silently.
- Four logical commits: the prompt + render + bundle; the contract test; bug.6 + registry; the task
  doc, review report and implementation report. The report is committed here per Step 4's rule, so a
  reviewer can read the audit trail during QA.
- PR **#297** → https://github.com/Gamaroff/agent-skills/pull/297

### Step 3 — develop — 2026-09-02

- Pre-develop surface map: 6 files identified across `shared/resources/`, `skills/finalise/` and
  `evals/shared/tests/` (Explore subagent). No plan file exists for this task — proceeded without one.
- Fast gate resolved to `npm run ci:fast` (= `format:check && test`); no `developNext`/`develop` block
  in `skills-config.yaml`, so defaults applied.
- **Phases 1–3** applied to `shared/resources/finalise-dod-security-prompt.md` (88 → 171 lines):
  the read-only clause redefined as *does not mutate*, not *does not run*, with the three explicit
  prohibitions; a new `### Step 1b` boundary-detection rule with its signals and an explicit negative
  case; a new `### Step 4` probe mode with the five candidate axes, the execute-don't-reason
  instruction, the reproduced-only rule and the accept-direction requirement; `probes[]` added to the
  returned YAML; and the zero-candidates guard stated as a rule beside the citation rule.
- **Phase 3 (render)** applied to `skills/finalise/SKILL.md`: a `### Probe Results` sub-block inside the
  Security append, between General Security and the agent summary, matching the file's existing
  `{for …}` / ternary pseudo-template idiom; plus a note beside the `SECURITY_RESULT` capture line.
- **Phase 4**: new `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` — 16 tests. The
  `evals/shared/tests/*.test.mjs` glob is already in `package.json`, so no test-script change was
  needed and the file is picked up by `npm test`.
- `npm run bundle` run and the regenerated `skills/finalise/references/finalise-dod-security-prompt.md`
  committed. Verified idempotent, and identical to the source apart from the autogen banner.
- **Mutation proving** (7 mutations, each reverted after): removing "Do not reason abstractly", the
  zero-probes guard, the read-only redefinition, the accept-direction, or the negative case each turns
  the suite red; renaming the SKILL.md `### Probe Results` heading fails 2 tests; and reverting the
  source heading without re-bundling fails the staleness assertion. Restored state green, 16/16.
- Fast gate: **2157 tests, 0 fail**.

### Step 2 — review-task — 2026-09-02

- Gate: status `Ready for Development` **and no review report present** → review-task ran (status had
  been set without a completed review).
- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds
  autonomously.
- review-task Step 9: **skipped** — status was already `Ready for Development`, so no promotion was needed.
- review-task Steps 8.6 and 10: **skipped** — `TRACKER=github` (no Jira sync) and no linked issue to comment on.
- Pre-pass Agent B (architecture alignment) → `drift`, 3 findings, all resolved in the report as benign or
  already-addressed. Pre-pass Agent C (codebase scan) → `not-implemented`, 0 findings — no scope to trim.
- Outcome: **READY TO IMPLEMENT, 9/10**. 0 Critical, 3 Important, 2 Optional.
- Fixes applied to the task document: Change Log `1.1` verdict row + `updated` bump; Replay Verification
  relabelled an agent-run step with a concrete `git show` procedure, and both Regression success criteria
  annotated so QA does not score them as failed automated checks.
- Step 1: implementation report stashed before branch creation, restored after (`git stash pop`
  clean). Tracker "Signal Work Started" (0c-reg) skipped — `TRACKER_ISSUE` is empty.

---

## Issues Log

- **Task has no linked tracker issue** (`github_issue:` absent). `review-task` Step 2 check 5 flags this
  as an Important gap and offers to create one. No autonomous default covers creating a remote issue, and
  the skill states one must never be created unprompted — so the review took the explicit
  "Skip — leave unlinked" branch. The gap stays flagged; run `/sync-github-task` to link it later. All
  tracker operations remain skipped for this run.

---

## QA Iteration History

### Cycle 1 — 2026-09-02

**qa-task → gate FAIL (70/100).** 10 findings: 4 HIGH, 3 MEDIUM, 3 LOW.
Artifacts: `task.73.qa.1.*.md`, `task.73.gate.1.*.yml`.

- Step 3b full adversarial pass returned 12 findings (9 bugs, 3 cleanups); 10 promoted under
  `code_review_blocking=true`. Rule 1 (any high) → FAIL.
- Step 4b fired on `skills/finalise/SKILL.md` (18 blocks, 0 runnable, zero executed). Recorded, not
  suppressed — but **not attributable to this change set**: the diff adds zero bash blocks and all 17
  mutating classifications are correct refusals of genuinely side-effecting commands.
- The two substantive findings:
  1. `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` was **untracked** — written after
     the four commits, so one of two deliverable test files was absent from PR #297 entirely.
  2. **`probes: []` conflated three outcomes** — not-a-boundary, probed-and-held, and probed-nothing.
     The render branched on emptiness, so the good case printed "probe mode did not fire"; the guard
     condemned the good case; and the candidate count actually counted reproduced failures, leaving the
     zero-executed guard unverifiable from its own artifact. This is the task's own defect class, one
     level up again.

**qa-fix → all 10 fixed** in `46f3f93`. The shape is now `boundary: true|false` +
`probes_executed: <int>` + a filtered `probes[]`, with a render branch per outcome and the guard keyed
on the execution count. Six new mutation proofs, all red.

> One mutation (M8) first reported green. It had **not landed** — the literal `\n` in the match string
> did not correspond to the file's actual wrap, so the edit was a no-op. Re-run against both guard
> sites it goes red. Recorded because a mutation that silently fails to apply is indistinguishable
> from a passing proof, which is precisely the failure mode this task exists to address.

---

## Completion

**Finished**: 2026-09-02
**Final Status**: Completed
**Branch**: `feature/task.73.dod-security-probe-not-grep`
**PR**: [#297](https://github.com/Gamaroff/agent-skills/pull/297)
**QA Iterations**: 4
**DoD Summary**: `task.73.dod.1.dod-security-probe-not-grep.md`
**Tracker debt**: none — no tracker issue was ever linked to this task, so no mutation was wanted or deferred
