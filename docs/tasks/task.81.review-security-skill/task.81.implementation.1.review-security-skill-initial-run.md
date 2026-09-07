# Implementation Report: Ship `/review-security` — prove a control engages, not that it is present

**Task**: `task.81.review-security-skill.md`
**Run Number**: 1
**Started**: 2026-09-07 18:42
**Status**: In Progress

---

## Summary

Ship the `review-security` skill — its prompt, output contract, falsifiability fixtures and CI-run test suite — so that a security control's status is established by executing it (`engages` / `present-but-inert` / `absent` / `unverifiable`) rather than by grepping for its presence.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous run)                             |
| PR target           | `develop` (auto — develop-next autonomous run)                             |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.81.*` exists in git                               | `feature/task.81.review-security-skill` created from `develop` at `5a9fb362`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.81.review.{N}.{name}.md` exists (or skip logged)                 | `task.81.review.1.review-security-skill.md` — 2 Critical, 5 Important, 2 Optional; all critical+important applied; 6/10 → 9/10, READY TO IMPLEMENT | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 4 phases; 9 files created, 8 modified; 25 new tests; 4/4 mutation proofs held; `npm run ci:fast` green (2726 pass, 0 fail) | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.81.qa.{N}.*.md`; `task.81.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.81.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-07

- Invoked by `/develop-next` (roadmap loop orchestrator) — item **T81**, source `task-registry`. Deps task.79 and task.80 both `accepted`.
- **Phase 0a-parallel — no subagents dispatched.** The file path was supplied directly by the caller (resolver unnecessary); no `jira_key`/`github_issue` in frontmatter, so the tracker poller had no issue key to poll; and the lite-mode inputs are read directly off the frontmatter and the document's own phase headings (see next entry). Logged per the 0a-parallel failure-handling contract: no agent failed, none was needed.
- **Pipeline mode: `standard`** — computed from the three booleans, all three of which independently force `standard`: `risk_ok = false` (`risk_level: medium` ∉ {low, absent}), `phase_count = 4` (not < 3), `single_module = false` (scope spans `skills/`, `shared/resources/`, `docs/reference/`, and `package.json`).
- Always-load files resolved: 3 files — `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`, all verified present on disk.
- Tracker: `github` (no `JIRA_URL` set); `TRACKER_ISSUE` empty — task frontmatter carries neither `jira_key` nor `github_issue`, so 0c-reg (Signal Work Started) and all later tracker signals are skipped.
- Feature branch base: `develop` — auto-answered with the recommended option per the develop-next AUTONOMOUS RUN directive (Q1); no prompt issued.
- PR target branch: `develop` — auto-answered with the recommended option per the develop-next AUTONOMOUS RUN directive (Q2); no prompt issued.
- qa-planning gate: skipped (auto — no prompt)
- Step 1: branch `feature/task.81.review-security-skill` created from `develop` (Q1 answer) at `5a9fb362` and pushed. Implementation report stashed before branch creation and restored after (`git stash pop` clean).
- Step 1 tracker signal (0c-reg): **skipped** — `TRACKER_ISSUE` is empty (task frontmatter carries no `jira_key`/`github_issue`), so there is no issue to comment on or board item to move. No fallback register needed per the 0c-reg contract.
- Phase 0b: no prior run detected (no `feature/task.81.*` branch, no PR, no prior implementation report) — starting fresh, so the resume prompt did not arise.

### Step 2 — review-task — 2026-09-07

- Gate check: status was `Ready for Development` with **no** review report present → the decision table says run `/review-task` ("status set without completing a review").
- review-task output format: **Comprehensive report** — auto-answered; required for the pipeline audit trail.
- Review report: `docs/tasks/task.81.review-security-skill/task.81.review.1.review-security-skill.md`
- Phase 1.5 pre-pass: run **inline rather than via Explore subagents** — this session's operating guidance bars dispatching the Agent tool unless the user asks for it. Both axes were still covered: architecture alignment (no drift — the task's targets all exist and match repo conventions) and already-implemented scan (`skills/review-security` and `shared/resources/security-review-prompt.md` both absent; nothing implemented).
- Outcome: **READY TO IMPLEMENT**, 9/10 after fixes (6/10 as originally written). 2 Critical, 5 Important, 2 Optional.
- The two Critical findings were integration defects against the shipped `task.80` engine, found by reading it rather than by inspection of the task alone: the specified fixture entry points took two arguments where `security-probe.mjs:120` calls `fn(input)` with one, and they were specified to take a full URL where `corpusFor('url-authority')` supplies authority components. Left uncorrected, both inert fixtures would have scored `unverifiable` and Phase 3's central assertion would have failed.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. All 7 applied, 0 skipped.
- review-task Step 9: **skipped** — status was already `Ready for Development`, so there was no promotion to make. Change Log row written (v1.1) and `updated:` bumped to 2026-09-07 in the same edit.
- review-task Step 8.6 (Jira body sync): skipped — `TRACKER=github`.
- review-task Step 10 (tracker comment): skipped — `TRACKER_ISSUE` empty.
- **Tracker sync not performed (I4).** The task has no `github_issue`. `/review-task` offers to create one interactively and its own contract forbids creating a remote issue unprompted; with no user present this run took the documented "Skip — leave unlinked" branch rather than creating an issue autonomously. Run `/sync-github-task` to link it later. Non-blocking; the review continued.
- Post-edit verification: `prettier --check` clean on all three artifacts, and the tracker-card preflight still exits 0 with `ok: true` after the edits.

### Step 3 — develop — 2026-09-07

- Plan file discovery: **no** `task.81.plan.*.md` in the task directory — proceeding without one (plan files are optional).
- Always-load files read into context: `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (3/3 present, 255 lines total).
- **Pre-develop surface map: 19 files identified** across `shared/resources/` (engine + corpus + probe fixtures), `skills/review-pr` and `skills/review-code` (gate-less review-skill precedent + CommonJS contract-test precedent), `skills/create-skill/scripts/` (scaffold, catalog, validate), and the four `docs/reference/` sweep targets. Built **inline rather than by an Explore subagent** — same session constraint recorded at Step 2.
- Decisive discovery for implementation: `task.80` already shipped seven probe fixtures at `shared/resources/tests/fixtures/security-probe/*.mjs`. They establish the exact fixture contract this task must follow — `export function validateHost(input)`, one argument, an authority component, `false` to reject and the value to accept — and `inert-control.mjs` demonstrates the `present-but-inert` band in practice (rejects `[\s@]`, lets `/` through). This is independent confirmation of review findings C1, C2, I1 and I2, arrived at from a different direction than the review itself.
- Key constraints carried into `/develop`: fixtures are ESM `.mjs` (the engine `import()`s them) while the contract test is CommonJS `.test.js` per `package.json` `"type": "commonjs"`, so it reaches the engine via `await import(...)` — the pattern `tests/test-harness-concurrency.test.js:566` already uses.

#### Step 3 implementation record

- **Internal gates.** Draft/Planned gate: not reached — status was already `Ready for Development`. High-risk gate: not reached — `risk_level: medium`. Alignment: **greenfield**, so the mismatch gate did not arise (`skills/review-security` and `shared/resources/security-review-prompt.md` were both absent). No gate needed an auto-answer.
- **Phase 1** — `shared/resources/security-review-prompt.md` (184 lines) and `skills/review-security/SKILL.md` (161 lines). Scaffolded with `init_skill.py`; its example `scripts/`, `assets/` and `references/` were deleted rather than carried. The prompt references the corpus doc's method ordering and deliberately does not restate it — asserted by a test that fails if any corpus case id appears in the prompt.
- **Phase 2** — four fixtures plus a probe spec per pair. All four landed in their required verdict bands on the first run, with no fixture tuning: engaged variants `engages` (12 executed, 0 reproduced, 1 over-block — the percent-encoded-secret legitimate case, which a host validator correctly declines and which does not move the verdict); inert variants `present-but-inert` (12 executed, 7 reproduced, 2 hostile rejected).
- **Phase 3** — `skills/review-security/tests/review-security.test.js`, **25 tests, all passing**. Deliberately majority-behavioural: the verdict assertions run the real engine over the real corpus and assert what `computeVerdict` returned, so no agent is in the loop. The prose contracts (SKILL.md sections, description shape) are the minority and are labelled as the weaker kind in the file's own header comment.
- **Phase 4** — `CATEGORIES`, the hand-written catalog Review line, `commands.md` (2 rows), `activation-phrases.md` (1 row), `pipeline-artifacts.md` (a standalone row in the documents table; its heading was renumbered "eight" → "nine", verified as referenced nowhere else), and a `CHANGELOG.md` `[Unreleased]` entry.

##### Mutation proofs

Every assertion this task turns on was proven to fail when the behaviour is removed, per `shared/resources/mutation-proving.md`:

| # | Mutation | Result | Restored |
| --- | --- | --- | --- |
| 1 | Removed the `present-but-inert` branch from `computeVerdict` | **2 red** — exactly the two inert verdict tests (23 pass / 2 fail) | ✅ clean `git diff` |
| 2 | Renamed the grep-decoy tokens in `redis-tls/inert.mjs` (`tls`→`secure`, `rejectUnauthorized`→`strictCerts`) | **1 red** — the decoy assertion (24/1) | ✅ |
| 3 | Made the zero-case branch return `engages` | **1 red** — the vacuity test (24/1) | ✅ |
| 4 | Removed the new glob from `package.json` | **proved** — a full `npm test` ran 2701 tests and **not one test name from this suite appeared** in the gate log | ✅ |

Proof 1 is the one that matters most: it is the difference between a suite that asserts the engine's verdict and one that would pass whatever the engine said.

##### What mutation proof 4 turned up — two things worth recording

**First, the naive signal was wrong.** Grepping the gate log for the string `review-security` returned **8 hits even with the glob removed** — so "the string appears, therefore the suite ran" would have reported a pass for a suite that never executed. All eight came from the *freshness-diff output* of other tests enumerating the skills tree. The signal that actually discriminates is a **test name** from this suite (`engine-computed`, `grep-decoy tokens`); that count was **0**, which is the proof. This is the same failure shape the task exists to close, met while proving the task: a token that is present without the thing it is taken to stand for.

**Second, the run surfaced a Phase 4 step the task document does not list.** Without the glob the suite failed 3/2701, and all three were registration-freshness checks tripped by adding a new skill:

- `shared/resources/tests/skill-dependencies-drift.test.mjs` — "committed skill-dependencies.json matches a fresh generation" and "every skill in the tree has a key in the graph"
- the catalog freshness test — "generated catalog is in sync with SKILL.md frontmatter"

The task's Phase 4 lists `npm run generate-catalog` and `npm run bundle` but **not `npm run generate-skill-deps`**, which is what the first two require. Run, and the file committed. Recorded here rather than silently fixed, because the omission is in the task's plan and the next skill-adding task will hit it too.

##### Fast gate — green, and it carries the registration proof

`npm run ci:fast` (`prettier --check` + `npm test`) exited **0**: **2726 tests, 2725 pass, 0 fail, 1 skipped**.

The number is itself the evidence the task asked for. The same command with the glob removed ran **2701**; with it, **2726** — a delta of exactly **25**, this suite's size. That is "confirmed running from the gate log", established by a count the log reports rather than by reading the glob back out of `package.json`.

One formatting fix was needed along the way: `prettier --write` on `review-security.test.js`. Caught locally by the fast gate, which is the whole reason formatting sits in the develop loop rather than at the merge gate.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Phase 0c (non-blocking, documentation defect in this repo).** `develop-pipeline-lite-mode.md` and step-0 §0c both state that `PIPELINE_MODE` is computed by "the production lite-mode CLI", but no such script exists in the tree (`find . -name '*lite*'` returns only `.md` files across the bundled skill copies). The mode was therefore computed inline from the frontmatter, which the same section explicitly permits as "a mechanical boolean AND of pre-computed values". All three inputs point the same way here, so the outcome is not in doubt; the missing CLI is recorded as a repo defect to file separately rather than something this run works around.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.81.review-security-skill`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
