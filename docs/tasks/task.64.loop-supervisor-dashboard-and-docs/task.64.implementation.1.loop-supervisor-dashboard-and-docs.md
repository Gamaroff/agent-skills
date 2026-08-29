# Implementation Report: [Task 64] Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable

**Task**: `task.64.loop-supervisor-dashboard-and-docs.md`
**Run Number**: 1
**Started**: 2026-08-29 00:00
**Status**: Completed

---

## Summary

Add the optional `--dashboard` / `--dashboard-token` push to `run-loop.mjs` with a warn-and-continue failure policy, document the payload contract, and write the unattended-overnight-runs runbook plus the develop-next cross-references.

---

## Pipeline Configuration

| Setting             | Value                                                      |
| ------------------- | ---------------------------------------------------------- |
| Feature branch base | develop                                                    |
| PR target           | develop                                                    |
| qa-planning gate    | skipped (auto)                                             |
| Task risk level     | low                                                        |
| Pipeline mode       | standard                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.64.*` exists in git                               | Branch created at `8aa2b65`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.64.review.1.*.md` exists (or skip logged)                        | READY TO IMPLEMENT, 9/10; 0 critical, 2 important (both fixed), 2 optional; status Draft → Ready for Development | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, no stall. All 5 phases + 6 progress boxes complete. npm test 1856/1856, format:check clean, 93 links verified | — |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #278](https://github.com/Gamaroff/agent-skills/pull/278); 3 commits; issue comment skipped (no linked issue) | — |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.64.qa.{1,2,3}.*.md`; `task.64.gate.{1,2,3}.*.yml`; PR comments posted | **Gate 3 PASS 100/100** after 3 cycles. C1 CONCERNS 50 (11 findings) → C2 CONCERNS 90 (QA-12) → C3 PASS. 12/12 closed, 8/8 criteria full | `.summaries/…` (gitignored; matrix inlined in the QA report) |
| 7. finalise                | ✅ Done    | `task.64.dod.1.*.md`; task `status: accepted`                          | DoD PASSED. CI_ROLLUP sampled PENDING then waited → SUCCESS on `f823527` (= local HEAD). Sprint review summary + canonical PR comment. Tracker close/board N/A (no linked issue) | — |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | 8 commits on the branch; working tree clean; pipeline lock removed | — |

---

## Decisions Log

### Pipeline Startup — 2026-08-29

- Invoked by `/develop-next` (roadmap item **T64**, PHASE 3). AUTONOMOUS RUN directive applied: Phase 0d questions auto-answered with the recommended option, no prompt.
- Feature branch base: **develop** — auto-answered (recommended default; current branch is `develop`).
- PR target branch: **develop** — auto-answered (recommended default).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 agents: resolver not dispatched (explicit path supplied); tracker poller not dispatched (no `github_issue` in frontmatter); lite-mode inputs read directly from the task document.
- `PIPELINE_MODE = standard` — computed from `risk_ok = true` (`risk_level: low`), `phase_count = 5` (**not** `< 3`), `single_module = false` (touches loop-supervisor, develop-next, skills-config and docs).
- Task status is `Draft` — proceeding; Step 2 (`/review-task`) validates and promotes it.
- Step 1: branch `feature/task.64.loop-supervisor-dashboard-and-docs` created from `develop` at `8aa2b65` and pushed. Implementation report stashed before branch creation, restored after. Tracker signal skipped (no linked issue).
- Tracker: `TRACKER=github`, `TRACKER_ISSUE` empty — all tracker signalling skipped for this run.

### Step 2 — review-task — 2026-08-29

- review-task output format: **Comprehensive report** — auto-answered; pipeline requires a co-located review report.
- review-task Step 0a branch setup: auto-skipped — already on `feature/task.64.*`.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: **Yes, fixes complete** — task promoted `Draft → Ready for Development`.
- Review report: `docs/tasks/task.64.loop-supervisor-dashboard-and-docs/task.64.review.1.loop-supervisor-dashboard-and-docs.md`
- Outcome: **READY TO IMPLEMENT**, readiness 9/10 — 0 critical, 2 important, 2 optional. Zero hallucinations: every technical claim verified against `run-loop.mjs`.
- Fixes applied (2): (1) `schemaVersion` added to the payload spec — the Risk Assessment already promised a payload "versioned with `schemaVersion`" and Success Criterion 1 gated on matching the contract, but the payload carried no version field; `SCHEMA_VERSION` already exists at `run-loop.mjs:76`. (2) Files Summary now names `docs/runbooks/README.md` (an unindexed runbook is unreachable) and the deletion of the two standing "No dashboard push" bullets in `README.md:281` / `SKILL.md:154`, which the additive-only descriptions would have left contradicting the new docs.
- Tracker-linkage gap downgraded Important → Optional on evidence: sibling tasks 62 and 63 both reached `accepted` with no tracker key. No remote issue created — unprompted outward-facing side effect, unauthorised by any autonomous default.
- review-task Step 8.6 skipped (TRACKER=github); Step 10 skipped (no linked issue).

### Step 3 — develop — 2026-08-29

- Pre-develop surface map: 11 files identified across `skills/loop-supervisor/`, `skills/develop-next/`, `docs/runbooks/`, `docs/reference/`, `evals/loop-supervisor/unit/` and `package.json` — gathered by direct inspection during Step 2's technical-accuracy pass rather than by a second Explore dispatch, since that pass had already read every file the implementation touches.
- Plan file: none (`task.64.plan.*.md` absent) — proceeded without, as specified.
- Always-load files: 3 read (`coding-standards.md`, `tech-stack.md`, `source-tree.md`).
- Draft/Planned gate: not reached — review-task had already promoted the task in Step 2.
- **Design decision, beyond the letter of the task:** the dashboard **token is deliberately not a `skills-config.yaml` key.** The task's Scope says "`loopSupervisor:` dashboard defaults in `skills-config.yaml`", and `dashboardUrl` is one — but that file is committed, so a token read from it would be a credential in git history, outliving the run that authorised it. That is the same failure the task's own Risk Assessment row ("Token logged in a transcript or ledger line", Impact: High) exists to prevent. The token comes from `--dashboard-token` or `$LOOP_SUPERVISOR_DASHBOARD_TOKEN`; the env var is documented as preferred because a token on a command line is visible in `ps`. Both the absence of the key and the reason are written into the README, the config table and a test.
- **Second decision:** `totals` counts **all six** classifier outcomes (`progressed`, `halted`, `idle`, `incomplete`, `errored`, `done`), not the three the task's payload example names. Three would not sum to `iterations` — a night with two `error`s would render as a night with two fewer iterations. A test asserts the histogram sums.
- **Third decision:** `current.phase` is passed through from `current.json` verbatim (`spawning` | `running`). The task's example shows `"in-pipeline"`, which the runner never writes; publishing an invented vocabulary would be a contract a consumer could not rely on. The README documents the two values that actually ship.
- Final frame ordering: pushed **after** `cleanup()`, so `current` reads back `null` and the frame carries `active: false` — a dashboard rendering the last frame verbatim shows a finished run rather than an iteration frozen mid-flight.
### Step 4 — create-pr — 2026-08-29

- Base pre-supplied `develop` (Q2) — create-pr Step 1 prompt skipped.
- SCOPE_PATHS: `docs/tasks/task.64.loop-supervisor-dashboard-and-docs`, `skills/loop-supervisor`, `skills/develop-next`, `evals/loop-supervisor`, `docs/runbooks`, `docs/reference`, `skills-config.yaml`. Pre-flight guard held nothing — every untracked path was in scope.
- Three logical commits: `47e75f4` feat (code + tests + config), `caa81b5` docs (contract + runbook + cross-references), `979992d` docs(task.64) (work-item artifacts). Implementation report committed here, as Step 4 specifies.
- Leak check: OK — no out-of-scope path in any commit.
- `--issue` omitted (TRACKER_ISSUE empty); Step 6b issue comment skipped silently.
- PR: https://github.com/Gamaroff/agent-skills/pull/278

- Gates: `npm run bundle` (no drift — no bundled `references/` file was touched), `npm test` **1856/1856 pass, exit 0**, `npm run format:check` clean, 93 relative links verified.

---

## Issues Log

- **`node` is an nvm shell function on this machine, not a binary.** `command -v node` returns the bare word `node` and any bare `node …` invocation printed nvm's entire help text instead of running. Worked around by invoking `/usr/local/bin/node` directly and by prefixing `PATH=/usr/local/bin:$PATH` for `npm` scripts. Not a defect in this task — and notably the exact hazard `run-loop.mjs` `resolveBinary()` was written to defend against (GOTCHA 4), independently confirmed here.
- **One flagged link is a false positive.** `skills/develop-next/SKILL.md:238` contains `[PR #N](url)` inside a backtick code span — a pre-existing template placeholder for the roadmap accepted-row convention, not a link. Verified present at `HEAD` before this branch. 93 relative links checked across the 9 changed files; 0 real breakages.

---

## QA Iteration History

### Cycle 1 — qa-task — 2026-08-29 — Gate CONCERNS (50/100)

Strategy: direct tools + two independent read-only subagents (traceability mapper over the 8 success criteria; adversarial diff code review in blocking mode). **Every subagent finding was re-verified against source before acceptance** — `pushFrame`'s ledger call, the `spawn` options object and the double-SIGINT handler were each read line by line, and the `collectDocs()` scope claim was read directly out of the test file.

Suite 1856/1856; CI 4/4 green on `c3532e9`.

**Mutation proving (Step 3c)** — three mutations applied and reverted:

| Invariant | Mutation | Killed | Proven |
|---|---|---|---|
| Warn-and-continue | `throw e` in outer catch | 3 tests | ✅ |
| Non-2xx detection | `if (false)` for `!res.ok` | 1 test | ✅ |
| Token header sent | header assignment deleted | 1 test | ✅ |
| **Token absent from frame** | header assignment deleted | **0** | ❌ vacuous |

**5 MEDIUM (gating):** QA-1 frame publishes the whole append-only ledger, not this run's rows — breaks the payload contract this change authored; QA-2 token-absence test is vacuous; QA-3 SC2 proved at `pushDashboard`, not at the run level the criterion names; QA-4 `executable-instructions` does not scan `docs/runbooks/**` or `skills/*/README.md`, so the Risk Assessment names a mitigation that does not fire; QA-5 token inherited by every spawned child, which writes logs to disk.

**6 LOW:** double-SIGINT leaves `active:true`; `pushFrame` unguarded; env fallback infers presence rather than tracking it; `repoUrl` unredacted; live-network test in the default glob; unserialisable test survives removal of its guard.

**qa-fix cycle 1 — all 11 closed.** `pushRunFrame()` extracted (closes QA-1 ledger scoping, QA-3 run-level proof, QA-7 guarding in one export); vacuous token test replaced with one driving the real push path; `executable-instructions` widened to `docs/runbooks/**` + `skills/*/README.md` and mutation-proved on both; token stripped from the spawned child's env; six LOW fixes. Suite 1867 (1866 pass, 1 gated skip).

**Two defects introduced by this run and caught before CI:**

1. The double-SIGINT fix introduced a **third**-SIGINT re-entrancy bug — found by the Step 3.5 adversarial pass over the fixes, not by QA. Guarded.
2. The QA report linked `.summaries/qa-traceability-matrix.md`, which `.gitignore:25` excludes — resolves locally, 404s in CI. Found by checking the **tracked** tree in a detached worktree. Matrix inlined instead.

**Honest note:** QA-1, QA-2 and QA-3 are all defects in work done earlier in this same run.

### Cycle 2 — qa-task re-review — 2026-08-29 — Gate CONCERNS (90/100)

Scope: files changed since gate 1 (`1dbf394`, `c717386`). **Every cycle-1 fix was re-verified by
mutation** — revert the behaviour, re-run the suite, restore — rather than by reading the diff. That
choice is the whole value of this cycle: five fixes killed tests and were proved; one did not.

| Invariant | Mutation | Killed | Proved |
|---|---|---|---|
| QA-1 frame publishes only this run's rows | drop the `runId` filter | 1 | ✅ |
| QA-2 token never reaches the request body | copy it into the frame | 2 | ✅ |
| QA-3 / QA-7 `pushRunFrame` never rejects | rethrow from its catch | 2 | ✅ |
| QA-4 gate scans runbooks + skill READMEs | phantom command in each | 2 | ✅ |
| QA-9 HTTPS userinfo stripped | return the URL unredacted | 2 | ✅ |
| **QA-5 token stripped from child env** | **do not strip** | **0** | ❌ |

**QA-12 (new, MEDIUM).** The child-env strip was correct in code and held by nothing — it sat inline
in `main()`, unreachable from any test, so a refactor of the `spawn` options would remove a credential
boundary in silence. Recorded as gating rather than waved through: it is the identical shape to cycle
1's QA-2, and the lesson of one cycle does not get to be relearned in the next.

10 closed, 1 partial, 0 regressions. All 8 success criteria reached **full** (from 5 full / 3 partial).

### Cycle 3 — qa-task final re-review — 2026-08-29 — Gate PASS (100/100)

QA-12 closed and mutation-confirmed: removing the child-env strip now kills **2** tests (it killed 0
at cycle 2), and an over-stripping mutant returning an empty environment also kills 2 — the boundary
is held in both directions. A single "the token is gone" assertion would have passed against a
`childEnvFor` that returned `{}`, breaking every spawned iteration while looking correct.

12/12 findings closed · 8/8 success criteria full · all four NFRs PASS · CI 4/4 green on `a568539` ·
10 invariants mutation-proved across cycles 2–3, all 10 proved. No regressions, no new findings.

### Cycle 2 — qa-fix — 2026-08-29

`childEnvFor(env)` extracted — pure, exported, and documented with the reason it is not inline. Three
tests hold it: the token is gone; **everything else survives** (over-stripping would break `PATH`, the
API key and `TERM` for a real Claude child); and the source object is not mutated, because the
supervisor still needs its own token.

Mutation re-run: removing the strip now kills **2** (was 0), and over-stripping the whole environment
also kills **2** — the boundary is held in both directions, which a single assertion would not have
caught. Suite 1870 (1869 pass, 1 gated skip, 0 fail). QA-4 is the one that would have shipped silently — a runbook full of `node .agents/skills/.../run-loop.mjs` invocations recorded as gated by a test that never opens the file.

---

## Completion

**Finished**: 2026-08-29
**Final Status**: Completed
**Branch**: `feature/task.64.loop-supervisor-dashboard-and-docs`
**PR**: [#278](https://github.com/Gamaroff/agent-skills/pull/278)
**QA Iterations**: 3 (gate 1 CONCERNS 50 → gate 2 CONCERNS 90 → gate 3 PASS 100)
**DoD Summary**: `task.64.dod.1.loop-supervisor-dashboard-and-docs.md`
**Tracker debt**: none — this task carries no `github_issue`, consistent with tasks 62 and 63 and this repo's convention for technical tasks. No mutation was deferred, refused or failed.
