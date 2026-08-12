# Implementation Report: Two new pipeline moments, workflow-file scaffolding, and the develop-bug gap

**Task**: `task.41.pipeline-moments-and-scaffolding.md`
**Run Number**: 1
**Started**: 2026-08-12 18:15
**Status**: ✅ Completed

---

## Summary

Capstone of the tracker-workflow series: wire the `changes-requested` and `pr-merged` moments, scaffold `tracker-workflow.yaml` on install without ever overwriting, add `--init-workflow` and a CI `--check` to both stage CLIs, and close the `develop-bug` QA-stage parity gap.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                         |
| PR target           | `develop`                                                                                                                         |
| qa-planning gate    | skipped (auto)                                                                                                                    |
| Task risk level     | not set (frontmatter has no `risk_level:`)                                                                                        |
| Pipeline mode       | standard                                                                                                                          |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #189 (GitHub)                                                                                                                     |
| Board status        | In Progress ✅ (was Todo, verified)                                                                                               |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.41.*` exists in git                               | `feature/task.41.pipeline-moments-and-scaffolding` created from `develop` at `30cbbb6`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.41.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT, 9.1/10 (7.4 pre-fix). 2 Critical + 5 Important + 3 Optional found, 9 fixes applied. Status `Planned → Ready for Development` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 5 phases implemented. 1099 unit tests pass (24 new), `eval:all` exit 0. Bundles regenerated. | Surface map reused from Step 2 verification (see Decisions Log) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #208: https://github.com/Gamaroff/agent-skills/pull/208 — state OPEN, MERGEABLE. 3 commits. | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.41.qa.{N}.*.md`; `task.41.gate.{N}.*.yml`; PR comment posted     | 2 cycles. Gate 1 FAIL (60/100, 1 HIGH + 2 MED + 1 LOW) → qa-fix → Gate 2 PASS (96/100), all bugs closed | — |
| 7. finalise                | ✅ Done    | `task.41.dod.{N}.*.md`; task `status: accepted`                        | DoD PASSED. CI SUCCESS verified against the final commit. Issue #189 closed, board `already` Done. | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final report commit; branch pushed. Pipeline complete. | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Pipeline Startup — 2026-08-12

- **Invoked by `/develop-next`** (roadmap item **T41**, PHASE 1 — tracker workflow). Autonomous run directive in force: Phase 0d questions auto-answered with the recommended option; all HALT conditions remain HALTs.
- Feature branch base: `develop` — auto-answered (recommended option; current branch is `develop`, task is standalone).
- PR target branch: `develop` — auto-answered (recommended option; standard Gitflow for a standalone task).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 fan-out: performed inline rather than via subagents (file path supplied and verified; lite-mode inputs and always-load list read directly). No resolver ambiguity to resolve.
- Pipeline mode: **standard** — computed from `risk_ok=true` (risk_level absent), `phase_count=5` (NOT < 3), `single_module=false` (touches `shared/resources/`, `skills/`, `scripts/`, `docs/`, `evals/`). The phase-count and module conditions both fail, so lite mode does not apply.
- Tracker: GitHub (`JIRA_URL` unset), issue **#189**.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all verified present on disk.

### Step 1 — create-branch — 2026-08-12

- Implementation report stashed before branch creation, restored cleanly after (`git stash pop`, no conflict).
- Branch `feature/task.41.pipeline-moments-and-scaffolding` created from `develop` at `30cbbb6` and pushed with upstream tracking.
- GitHub board: work-started → **transitioned** (`Todo` → `In Progress`, verified as observed `In Progress` on board "Agent Skills", rule `option="In Progress"`).
- Pipeline-start comment posted to issue #189.
- Board Priority already `P2 Medium` — left untouched (the default only fires when unset).

### Step 2 — review-task — 2026-08-12

- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: **Yes, fixes complete** — outcome was READY TO IMPLEMENT, so the task was promoted `Planned → Ready for Development`.
- Review report: `docs/tasks/task.41.pipeline-moments-and-scaffolding/task.41.review.1.pipeline-moments-and-scaffolding.md`
- Outcome: **READY TO IMPLEMENT**, readiness 9.1/10 (7.4/10 pre-fix). 2 Critical, 5 Important, 3 Optional.
- **Two Critical findings materially change the implementation scope** — carry these into Step 3:
  1. `assets/tracker-workflow.default.yaml` does not exist and is unreachable from a consumer install. The real annotated template is `docs/examples/tracker-workflow.default.yaml`; `setup-consumer.sh` must emit the file via an inline heredoc (it sources no external template, and runs in the consumer repo). Do **not** create an `assets/` copy.
  2. `docs/reference/configuration.md` already documents `project.yml` (L586-608). Phase 5 is now "delete the stale *It has never been documented here* clause at L589", **not** "write the section".
- Important findings folded into the task doc: 3 corrected line citations; `--init-workflow` scoped as an extension of the existing `gh-stage.js --write-ladder`; `probeWorkflow()` located in `jira-sync.js:3522` not `jira-stage.js`; stale `tracker-workflow.js:125-127` comment added to Phase 1; `develop-bug` diagnosis reworded (file exists, signals nothing).
- Verified correct, no change needed: `DEFAULT_PIPELINE` and `DEFAULT_RUNG_FOR_MOMENT` both omit the two new moments, so the "neither fires by default" guarantee holds. Tracker-card preflight exits 0.
- Review outcome comment posted to GitHub issue #189.

### Step 3 — develop — 2026-08-12

- **Pre-develop surface map: reused, not re-derived.** Step 2's review already performed 17 file-existence checks, 6 line-number verifications, a CLI flag inventory on both stage CLIs, and reads of `DEFAULT_PIPELINE` / `DEFAULT_RUNG_FOR_MOMENT` / `MOMENTS` / `DEFAULT_STAGE_MAP`. Dispatching a fresh Explore to re-confirm scope would have re-read the same ~15 files less precisely. Surface map (13 files): `shared/resources/{tracker-workflow,jira-sync,gh-stage,jira-stage}.js`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-{next,batch}/SKILL.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `scripts/setup-consumer.sh`, `docs/examples/tracker-workflow.default.yaml`, `docs/reference/{tracker-workflow,configuration}.md`, `skills/develop-{story,task}/README.md`.
- Plan file found: `task.41.plan.pipeline-moments-and-scaffolding.md` — used as implementation context. Its stale references (same three line numbers + the `assets/` path) were corrected in place rather than followed.

**Discovery not in the task doc — an extra file was required.** `gh-stage.js` validates `--stage` against `tw.MOMENTS` (all 8) and so already accepted both new moments, but `jira-stage.js` validates against `lib.STAGE_NAMES`, which is `Object.keys(DEFAULT_STAGE_MAP)` in **`shared/resources/jira-sync.js`** — a file §7 does not list. Without entries there, `jira-stage.js --stage changes-requested` exits 2 "unknown stage" and the Jira half of Phase 1 cannot work at all. Added `CHANGES_REQUESTED_CANDIDATES` / `PR_MERGED_CANDIDATES` plus two `DEFAULT_STAGE_MAP` entries (`rank: null, defaultEnabled: false`).

Two design decisions worth recording, both made to preserve the compatibility contract:

1. **Both new moments are unranked (`rank: null`), like `blocked`.** For `changes-requested` this is load-bearing rather than stylistic: it is re-entered once per fix cycle, and a rank would make the second and later entries backward moves that the monotonicity guard rejects — silently capping the signal at one cycle, which is the exact failure the moment exists to prevent. For `pr-merged`, "after done" is not a rung the built-in six-rung ladder has, and adding a 7th rung would change `DEFAULT_LADDER` for every unconfigured consumer (a snapshot test derives its expectations from those constants precisely to make that fail loudly).
2. **`--init-workflow` extends `gh-stage.js --write-ladder` rather than replacing it.** Bare `--write-ladder` still writes a statuses-only ladder byte-identically; `--init-workflow` adds `--force` and the full `pipeline:` block, reusing the same probe result so the file can never disagree with `--probe-board`. Replacing would have been cleaner but is a breaking CLI change, and §5 promises none.

**Phase-by-phase:**

- **Phase 1 (`changes-requested`)** — `jira-sync.js` candidates + stage map; `develop-pipeline-step-5-6-qa-loop.md` §5b fires it per cycle, both trackers, with the per-cycle-vs-once distinction stated explicitly beside the opposite rule it sits next to; corrected the stale "three moments absent" comment in `tracker-workflow.js` (five are).
- **Phase 2 (`pr-merged`)** — `develop-next` Step 3 sub-item 3 (post-merge, pre-tick) and `develop-batch` step 4 **inside** the per-item serial merge loop, keyed on `ITEM_TRACKER_ISSUE`. Both carry the `done` vs `pr-merged` ordering note.
- **Phase 3 (scaffolding + `--init-workflow`)** — `write_tracker_workflow()` in `setup-consumer.sh`, placed after `install_skills` because the live-probe path needs a CLI that step puts on disk; inline heredoc, never overwrites, loud warning on template fallback. `--init-workflow [--force]` on both CLIs; the Jira side converts an existing `jira.workflowRecord` (rungs by rank, `enabled: false` → omission, `reason:` → YAML comment).
- **Phase 4 (`--check [--offline]`)** — schema half runs before any network concern so `--offline` genuinely issues zero calls (asserted, not assumed); board half reuses the probe's own resolution rather than duplicating board plumbing. The inverted exit code is commented at both call sites, both module shims re-raise under `--check`, and tests assert all of it.
- **Phase 5 (parity + docs)** — `develop-bug` verify loop now signals `in-qa` / `changes-requested` / `ready-for-merge`; both READMEs' tracker tables rewritten to moment vocabulary with the self-policing checklist row added; `configuration.md`'s false clause deleted; `tracker-workflow.md` moments table and new CLI sections; CHANGELOG.

**Verification:** live end-to-end against this repo's real board — `--init-workflow` generated a file matching the actual 3 columns (Todo → In Progress → Done), which then passed both `--check --offline` and `--check`; renaming a column made `--check` exit 1 while `--offline` still exited 0, which is precisely why the board half exists. Re-run without `--force` left the file byte-identical.

**Tests:** 1099 pass / 0 fail (24 added — 11 gh-stage, 8 jira-stage, 5 setup-consumer, plus 3 parity). `npm run eval:all` exit 0. `npm run bundle` re-run; confirmed it did **not** revert the skill-native `develop-bug` edit.

**Doc-sync trap hit and handled:** `docs/reference/tracker-workflow.md` embeds the example template byte-for-byte under `## The shipped template`, asserted by a test. Editing `docs/examples/tracker-workflow.default.yaml` alone broke it; the block was re-synced programmatically rather than by hand.

### Step 4 — create-pr — 2026-08-12

- Staging scope: `docs/tasks/task.41.*`, `shared/resources`, `skills`, `scripts`, `docs`, `evals`, `CHANGELOG.md`. 71 files staged, zero leaked outside scope.
- Implementation report **excluded** from these commits — Step 8 owns the sole report commit.
- Secret/debug scan clean. The `console.log` hits in the diff are the pre-existing `makeOutput` logger inside *bundled* CLI copies (2 already on `develop`); none added to any source file.
- Split into 3 Conventional Commits, all referencing #189. Source and regenerated bundles were kept in the **same** commit deliberately — `npm run bundle` regenerates atomically, so splitting them would produce an intermediate commit whose bundles disagree with their sources.
  - `5595ae9` feat(task.41) — wire both moments (engine, call sites, develop-bug parity, bundles)
  - `1349c4a` test(task.41) — 24 new assertions
  - `b6f9c1a` docs(task.41) — READMEs, reference docs, CHANGELOG, task-doc review fixes
- A pre-commit hook re-ran `npm run bundle` on each commit and reported every skill in sync.
- PR **#208** → `develop`: https://github.com/Gamaroff/agent-skills/pull/208
- Post-PR state check: PR #208 state = `OPEN`, mergeable = `MERGEABLE`. 0 errors.
- GitHub board: in-review → **stage-disabled**. Correct for this board — the repo's own `tracker-workflow.yaml` has three columns and deliberately omits `in-review`, `in-qa` and `ready-for-merge` because no column exists for them. Exits 0; the pipeline continues.
- PR-opened comment posted to issue #189; lock `pr_url` recorded.
- **Path correction made during this step:** the bundler placed `gh-stage.js` / `jira-stage.js` copies into `skills/develop-{next,batch}/references/`. My initial SKILL.md edits pointed at `develop-task`'s copy, which is fragile — a consumer can install `develop-next` without `develop-task`. Both now reference their own skill-local copies, matching the convention `finalise` already follows and its parity assertion.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

### QA Cycle 1 — 2026-08-12
**Gate Result**: FAIL (60/100)
**Issues Found**: 1 HIGH (TASK-41-BUG-1 — the scaffolder inferred "file written" from an exit code this CLI family deliberately returns as 0 on write-nothing skips, so an unauthenticated `gh` left the consumer with no `tracker-workflow.yaml` while the wizard reported success), 2 MEDIUM (BUG-2 generic ladder mislabelled board-derived with the CLI's warning swallowed by `>/dev/null 2>&1`; BUG-3 the probe branch had zero test coverage, which is why the other two shipped green), 1 LOW (no trailing newline)
**Action**: Running qa-fix (cycle 1 of 5)

**How they were found**: not by reading the diff — by executing it. Four adversarial probes against throwaway consumer repos, including a PATH stub that makes `gh` unauthenticated. The defects are semantic (what an exit code *means* to a caller), so no amount of re-reading the source would have surfaced them.

**Board**: `changes-requested` fired here for the first time — the moment this task adds — returning `stage-disabled` exit 0 on this repo's 3-column board. Phase 1 validated end-to-end against a live board by the pipeline that implements it.

### QA Cycle 2 — 2026-08-12
**Gate Result**: PASS (96/100)
**Issues Found**: none outstanding; all 3 bugs verified and closed
**Action**: Proceeding to finalise

**Verification went beyond "the new test passes."** The exit-code inference was reintroduced in a throwaway copy of the wizard and the stub scenario re-run: no file written — the precondition the new regression test asserts against. The test genuinely fails on reintroduction. Worth disproving here because the assertion ("a file exists") could otherwise pass for the wrong reason, e.g. a mis-installed stub meaning the branch was never entered at all.

`ready-for-merge` signalled on the passing gate: `stage-disabled`, exit 0.

### Step 7 — finalise — 2026-08-12

- **CI is a hard DoD gate and it was checked, not assumed.** `CI_ROLLUP = SUCCESS` — `link-check`, `test` and `validate` all `COMPLETED/SUCCESS`. Critically, the rollup was verified against the **exact final commit**: local HEAD and PR head both `b0105d03`. This mattered here because the last push was the qa-fix commit, so a green rollup on an ancestor would have been evidence about the pre-fix code.
- PR review decision is empty — no required reviewers on this repo. Recorded plainly rather than reported as APPROVED; the pipeline's own `/review-task` (9.1/10) and two QA cycles are the review of record.
- No prior acceptance block in the document body (run 1) — nothing to supersede.
- Security PASS: no secrets in the diff; the numeric `--issue` validation still guards every GraphQL path including the two new ones; `--check` provably read-only; `jq '.fromRecord // empty'` degrades to the conservative branch on malformed input.
- Compliance NOT_APPLICABLE — developer tooling, no personal data, payments or UI surface. Recorded explicitly rather than skipped.
- Docs PASS: CHANGELOG +40, `tracker-workflow.md` +132/−31, shipped template +32 (byte-sync with the reference doc re-established programmatically), both READMEs +70/−38, `configuration.md` clause removed. Bundles report 0 files needing re-bundle and 0 uncommitted drift.
- Task set to `status: accepted`, `completed_date` and `pr_number: 208` added, DoD PASSED section written.
- DoD summary: `task.41.dod.1.pipeline-moments-and-scaffolding.md`. Sprint Review summary written.
- Canonical DoD summary posted to PR #208; issue #189 **closed and verified**; board `done` stage returned `already` (from `Done`) — success, no mutation needed.

---

## Completion

**Finished**: 2026-08-12
**Final Status**: ✅ Completed
**Branch**: `feature/task.41.pipeline-moments-and-scaffolding`
**PR**: [#208](https://github.com/Gamaroff/agent-skills/pull/208)
**QA Iterations**: 2 (gate 1 FAIL 60/100 → gate 2 PASS 96/100)
**DoD Summary**: [task.41.dod.1.pipeline-moments-and-scaffolding.md](./task.41.dod.1.pipeline-moments-and-scaffolding.md)

---

## Completion Summary

Five phases, 5 QA-verified success-criteria groups, 2 QA cycles, 3 bugs found and closed.

**What shipped**: all eight tracker moments now have a call site (`changes-requested` per QA fix cycle, `pr-merged` from the merging orchestrators); `tracker-workflow.yaml` is scaffolded on install and never overwritten; `--init-workflow [--force]` and `--check [--offline]` on both stage CLIs; `develop-bug` signals the same loop moments as its siblings; two stale READMEs corrected and given a self-policing guard.

**Three things this run got right that are worth repeating:**

1. **The review paid for itself before a line was written.** `/review-task` caught that one scope item was already complete on `develop` and another named a path that does not exist and is unreachable from a consumer install. Following the task doc literally would have produced a duplicate `configuration.md` section and a second competing template.

2. **The QA cycle found a real HIGH defect in my own work** — and found it by *executing* the code against throwaway consumer repos, not by reading the diff. The defect was semantic (what an exit code means to a caller), so re-reading would never have surfaced it. It was the same class of silent failure the task exists to eliminate, reproduced inside the fix for it.

3. **The regression test was proven, not assumed.** Reintroducing the defect in a scratch copy confirmed the new test genuinely fails. Worth doing because the assertion ("a file exists") could otherwise have passed for the wrong reason.

**One scope correction discovered during implementation**: `shared/resources/jira-sync.js` was required and not listed in §7 — `jira-stage.js` validates `--stage` against `STAGE_NAMES`, so without `DEFAULT_STAGE_MAP` entries the Jira half of Phase 1 could not work at all.

**Final state**: 1104 tests pass / 0 fail · `eval:all` exit 0 · CI green on the final commit · gate PASS 96/100 · task `accepted` · issue #189 closed · PR #208 open and mergeable.
