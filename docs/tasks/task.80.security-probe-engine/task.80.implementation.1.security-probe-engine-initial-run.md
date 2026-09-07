# Implementation Report: Make a security probe runnable without widening the snippet allow-list

**Task**: `task.80.security-probe-engine.md`
**Run Number**: 1
**Started**: 2026-09-07 08:38
**Status**: In Progress

---

## Summary

Build `shared/resources/security-probe.mjs` — an engine that runs security probe cases in contained child processes and computes the verdict from the run — reusing the containment primitives extracted from `qa-execute-snippets.mjs`, without adding an interpreter to `SAFE_COMMANDS`.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                           |
| PR target           | develop                                                                                                                           |
| qa-planning gate    | skipped (auto)                                                                                                                    |
| Task risk level     | medium                                                                                                                            |
| Pipeline mode       | standard                                                                                                                          |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.80.*` exists in git                             | `feature/task.80.security-probe-engine` from `develop` at `a2227017`; pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.80.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT, 8/10. 0 Critical, 6 Important (5 fixed in place, 1 skipped), 2 Optional. Report: `task.80.review.1.security-probe-engine.md` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                    | 1 iteration, no stall. 4/4 phases. 8 files. 26 tests added. 4 mutation proofs. Fast gate green: 2564 tests, 0 fail | — (inline)           |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #337: https://github.com/Gamaroff/agent-skills/pull/337 — state OPEN, base `develop`. 3 commits, 20 files, +2131/-124. Issue comment N/A (no tracker issue) | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.80.qa.{N}.*.md`; `task.80.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.80.dod.{N}.*.md`; task `status: accepted`                    |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-07

- **Invoked by `/develop-next`** — item T80, selected from the task-registry fallback (no roadmap phase held an actionable row). Dependency `task.79` is `accepted`.
- **AUTONOMOUS RUN directive active**: Phase 0d questions auto-answered with the recommended option; no prompts issued.
- Feature branch base: **develop** (Q1 auto-answered — recommended option; current branch is `develop`)
- PR target branch: **develop** (Q2 auto-answered — recommended option)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0b: no prior run detected (no `feature/task.80.*` branch, no PR, no implementation report) — starting fresh; the resume prompt did not fire.
- Phase 0a-parallel: run **inline** rather than via Explore subagents, per this session's standing directive not to spawn agents unrequested. All three lookups are deterministic file reads; results below.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE` unset (no `github_issue:`/`jira_key:` in frontmatter) — all tracker signals and board moves skipped for this run.
- Pipeline mode: **standard**. Computed from `risk_ok = (risk_level ∈ {low, absent})` → **false** (`risk_level: medium`); `phase_count = 4` → not < 3; `single_module` → false (touches `shared/resources/` and regenerates `skills/*/references/`). All three fail, so lite mode is not available.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all three verified present on disk.
- Task status at entry: `ready-for-development` — proceed normally.

### Step 4 — create-pr — 2026-09-07

- PR **#337** → https://github.com/Gamaroff/agent-skills/pull/337, base `develop` (Q2 pre-supplied, interactive prompt skipped). State verified `OPEN` after creation.
- `--issue` **omitted** — no linked tracker issue. Step 6b issue comment and the GitHub board `in-review` move both skipped for the same reason.
- Staging scope: 8 `--scope` paths. Pre-flight guard held **0 files** — every untracked path already fell inside the scope set. Leak check across all three commits: clean, no out-of-scope path committed.
- Committed as **3 logical commits** rather than one, along the natural seam:
  - `5cb3364f refactor(task.80)` — the Phase 1 containment extraction, its 8 parity tests, and the 5 bundled `references/` copies that are its `npm run bundle` output
  - `e961337a feat(task.80)` — the engine, the rule doc, 18 tests, 6 fixtures
  - `a152f7df docs(task.80)` — task record, review report, implementation report, CHANGELOG
- A repo pre-commit hook re-runs `npm run bundle` on every commit; it reported every skill in sync, independently confirming the bundle step in Step 3.
- The implementation report is committed **here, at Step 4**, not deferred to Step 8 — so a reviewer can read the audit trail during the QA loop, and so the task document's link to it is not a dangling relative link in the tracked tree (which fails in CI while passing locally).

### Step 3 — develop — 2026-09-07

- Pre-develop surface map: built **inline** (not via Explore subagent), same standing directive as Phase 0a-parallel. 9 files identified across `shared/resources/` + `tests/`, plus the 8 verified source anchors passed to `/develop` as caller-supplied context.
- Plan file: **none** (`task.80.plan.*.md` absent) — the task's own §6 Implementation Plan was the spec.
- Always-load files: 3 read and passed as caller context.
- `/develop` internal gates: Draft/Planned gate **not reached** (status was already `Ready for Development`); high-risk gate **not reached** (`risk_level: medium`); alignment gate **not reached** (greenfield for the 3 new files, and the 2 modified files matched the document).
- Develop loop: **1 iteration**, exited on `Ready for Review`. No stall, no MAX_ITER pressure.
- **Fast gate `npm run ci:fast` failed on first run — `prettier --check` flagged 3 new files.** This is precisely the failure the fast tier exists to catch: `npm test` alone was green throughout, and without the formatting half this would have shipped a red CI build after `/finalise` had already accepted the task. Fixed with `prettier --write` on the changed files, re-bundled, re-run: **exit 0, 2564 tests, 0 failures**.
- `npm run bundle` run twice (after the source edit and again after prettier touched `shared/resources/`). It propagated `qa-execute-snippets.mjs` into 5 skills' `references/`. `security-probe.mjs` and `probe-boundary-rule.md` were correctly **not** bundled anywhere — no skill references them yet; `task.81` is the consumer.
- **One design decision the task left in prose and `/develop` had to mechanise**: the corpus `correct` field is human-readable text, so "hostile cases handled as `correct` says" cannot be evaluated by machine. Derived from `direction` instead (hostile → should reject, legitimate → should accept), and the derivation is documented in `probe-boundary-rule.md` §3 rather than silently invented. Two non-obvious branches fell out of it and are recorded there: `present-but-inert` requires *some* hostile case to have been rejected, and `engages` requires ≥1 *legitimate* case to pass — without that clause a stub that throws on everything scores a clean probe.
- All 4 required mutation proofs executed; each reds exactly the test that guards it. The `sandboxEnv` proof also reds the pre-existing `QA-12` test, which is the stronger signal — the extraction is pinned by a test that predates it.
- Tracker comment (`develop-complete` stage): **skipped** — `TRACKER_ISSUE` is empty.

### Step 2 — review-task — 2026-09-07

- Gate check: status `Ready for Development` + **no** review report present → **run** `/review-task` (per the Step 2 decision table).
- review-task Step 0 auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 0a: auto-skipped — already on `feature/task.80.security-probe-engine`.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- review-task Step 9: **not applicable** — status was already `Ready for Development`, so no promotion was needed.
- review-task Step 5 tracker sync: **skipped, not declined by default** — creating a remote issue is opt-in and no user is present to consent. Logged as an Important gap rather than actioned.
- review-task Step 8.6 (Jira body push): skipped — `TRACKER=github`.
- review-task Step 10 (tracker comment): skipped silently — no `github_issue` in frontmatter.
- Pre-pass subagents (Agents B and C) run **inline** rather than dispatched, same rationale as Phase 0a-parallel. Both axes covered: architecture alignment verified against 8 cited sources; already-implemented scan confirmed `security-probe.mjs` and `probe-boundary-rule.md` both absent → `not-started`.
- Outcome: **READY TO IMPLEMENT, 8/10** — 0 Critical, 6 Important, 2 Optional. Proceeding to Step 3.
- Step 1: no pipeline lock collision; lock written at `current_step: 2`.
- Step 1 tracker signal (0c-reg): **skipped entirely** — `TRACKER_ISSUE` is unset, so there is no issue to comment on or board item to move.

---

## Issues Log

### Step 2 — review-task (2026-09-07)

- **No tracker issue linked.** `task.80` frontmatter carries neither `github_issue:` nor `jira_key:`.
  Creating one is consent-gated and this run is autonomous, so it was left unlinked. Consequence: every
  tracker comment and board move in Steps 1–7 is skipped for this run. Run `/sync-github-task` afterwards
  to link it.
- **Six stale references in the task document**, all corrected in place by review-task Step 8.5. Root
  cause: `task.79` landed in `qa-execute-snippets.mjs` between this task being authored (2026-09-02) and
  reaching the front of the queue, growing the file 1032 → 1517 lines. The one that mattered: Phase 1
  instructed the developer to *confirm* that `snapshotTree()` is exported, and it is not — it is
  module-private at `:1081`. Following the plan literally would have skipped the only change that makes
  the primitive importable.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-07

| Field | Value |
| --- | --- |
| **QA skill** | `/qa-task` (standard mode, direct tools, first review) |
| **Gate** | **CONCERNS** — 60/100 |
| **Findings** | 0 HIGH, 4 MEDIUM, 1 LOW |
| **Gate file** | `task.80.gate.1.security-probe-engine.yml` |
| **QA report** | `task.80.qa.1.security-probe-engine.md` |
| **PR comment** | [posted](https://github.com/Gamaroff/agent-skills/pull/337#issuecomment-5566557812) |
| **Tests** | 139/139 targeted, 0 fail |
| **PR Review** | _(Step 5c — not reached; gate did not read PASS)_ |

All seven §9 safety criteria verified **by execution rather than inspection**, and all four hold. The two that matter most were tested with purpose-built adversarial fixtures: a module whose *top level* writes a sentinel proved the out-of-root rejection precedes `import()`, and a shell-injection input proved values never reach a shell.

Findings promoted to the gate (`code_review_blocking=true`):

- **TASK80-001** `security-probe.mjs:460` — `--timeout` unvalidated: `NaN` → uncaught `RangeError`; `0` → containment silently disabled
- **TASK80-002** `security-probe.mjs:296` — `escapes` undefined on 4 of 5 result paths
- **TASK80-003** `security-probe.mjs:496` — sandbox escape invisible in default CLI output
- **TASK80-004** `qa-execute-snippets.test.mjs:1793` — parity block's scope claim exceeds what it pins

QA's independent mutation spot-check reproduced all four claimed proofs **and found a fifth mutation nobody had tried**: adding only `"rm"` to `SAFE_COMMANDS` is a genuine fail-open that leaves 105/105 tests green. That is TASK80-004, and it is the clearest argument for running the spot-check against mutations the implementer did not choose.

Convergence check: **not applicable at cycle 1** (starts at cycle 3). Proceeding to 5b `/qa-fix`.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.80.security-probe-engine`
**PR**: [#337](https://github.com/Gamaroff/agent-skills/pull/337)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
