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
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.80.qa.{N}.*.md`; `task.80.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles. Gates: CONCERNS 60 → CONCERNS 80 → **PASS 100**. 6 findings raised, 6 closed, 0 HIGH throughout. Step 5c: **CONCERNS** (2 doc-currency findings, both fixed before proceeding) | —                    |
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

### QA Cycle 3 — 2026-09-07

| Field | Value |
| --- | --- |
| **QA skill** | `/qa-task` (standard, narrowed — `REFUTE_PASS=false`, cycle 2 already ran the unscoped refute) |
| **Gate** | ✅ **PASS** — 100/100 |
| **HIGH findings** | 0 |
| **Findings** | **None new**; both cycle-2 findings verified fixed |
| **Gate file** | `task.80.gate.3.security-probe-engine.yml` |
| **QA report** | `task.80.qa.3.security-probe-engine.md` |
| **PR comment** | [posted](https://github.com/Gamaroff/agent-skills/pull/337#issuecomment-5567536657) |
| **Tests** | 276/276 targeted; full `ci:fast` 2570/0 |
| **PR Review** | ⚠️ **CONCERNS** — exits the loop, does not block ([report](./task.80.pr-review.1.security-probe-engine.md), [comment](https://github.com/Gamaroff/agent-skills/pull/337#issuecomment-5567628319)) |

#### Step 5c — PR conformance review (the loop's exit gate)

`/review-pr --effort medium --comment`. Verdict **⚠️ CONCERNS**: 0 code findings, 3 conformance
findings, **none a correctness defect**. Per the 5c verdict table CONCERNS records the findings and
exits the loop to Step 7 without blocking.

Its conformance lens — the one with no counterpart elsewhere in the pipeline — earned its place. It
found two currency defects that three QA cycles had no reason to look for, because QA reviews the
code and the gate, not the artifacts a human reads to *understand* the merge:

- **PC-1 (medium)** — the PR description was written at Step 4 and never updated, so it had **zero**
  mentions of the two largest post-Step-4 changes (the `spawn-budget` move and the bundler fix). A
  reviewer reading it then opening a 3445-line diff would meet a file move and 44 lines of packaging
  tooling unannounced.
- **PC-2 (medium)** — the task's "Files Actually Landed" table recorded the develop-time state while
  its heading claimed to describe what shipped. Eight files omitted; every count stale (593 not 430
  lines, 22 not 18 tests, 7 not 6 fixtures, 98 not 97).
- **PC-3 (low)** — scope drift on the bundler fix; the review agreed it belongs here rather than in a
  follow-up, and asked only that it be named.

**Both medium findings were fixed before proceeding**, rather than carried into the merge: the PR
description now names both changes, and the Files table is refreshed. CONCERNS said not to block, not
to ignore — and merging documentation already known to be wrong is the cheaper mistake to avoid.

The review also independently re-checked the two trail claims it was invited to be sceptical of, and
both held: the deliberate PARTIAL grade in cycle 2, and cycle 3's note that the convergence check
would have tripped (HIGH counts verified `0, 0, 0`). It softened exactly one claim — "inputs never
reach a shell" is a property of the engine's construction on the tested paths rather than a proof over
all inputs — which the rule doc already states as a limit.

`ready-for-merge` stage: **skipped** — `TRACKER_ISSUE` is empty.

Both cycle-2 fixes verified, and **both halves of each** — the half that could have been faked as
easily as fixed. Nine bad `timeoutMs` values handled without a crash, *and* `timeoutMs: 1` still
bites (`executed 0, declined 1`), so the fallback is not swallowing every input. The module move
left no stale reference in code, no markdown link a checker would follow, and nothing in any bundled
`references/` copy; `npm run bundle` reports 0 files bundled.

Both fixes mutation-proved independently by faithful reversion.

**Convergence check: skipped** — the rule explicitly exempts a gate that hands to 5c. Worth recording
that it would otherwise have tripped: `HIGH_N` was 0 at all three gates, so `0 >= 0 >= 0` satisfies
the not-converging condition. The guard measures HIGH counts, and a run that is genuinely converging
on MEDIUMs (4 → 2 → 0) reads as flat to it. Not acted on and not a defect in this run — noted because
a run that ends cycle 3 on CONCERNS with no HIGH findings would escalate for the wrong reason.

### QA Cycle 2 — 2026-09-07 (refute pass)

| Field | Value |
| --- | --- |
| **QA skill** | `/qa-task` (standard, **`REFUTE_PASS=true`** — whole branch diff re-read to refute) |
| **Gate** | **CONCERNS** — 80/100 (up from 60) |
| **HIGH findings** | 0 |
| **Findings** | 0 HIGH, 2 MEDIUM (new), 1 LOW |
| **Gate file** | `task.80.gate.2.security-probe-engine.yml` |
| **QA report** | `task.80.qa.2.security-probe-engine.md` |
| **PR comment** | [posted](https://github.com/Gamaroff/agent-skills/pull/337#issuecomment-5567225783) |
| **Tests** | 153/153 targeted; full `ci:fast` 2568/0 |
| **PR Review** | _(Step 5c — not reached; gate did not read PASS)_ |

**All four gate-1 findings verified fixed and mutation-proved.** Each was re-executed independently
rather than accepted from the fix summary, and each was proved by reverting it and confirming exactly
the guarding test goes red.

Two new MEDIUM findings, both **latent** and both aimed at the declared consumer (`task.81`). They
share one shape worth naming: *a fix that satisfies the finding as written while leaving the mechanism
reachable by the route the consumer actually takes.*

- **TASK80-005** — the `--timeout` fix was CLI-only. `runProbeSpec({timeoutMs: NaN})` still throws the
  same uncaught `RangeError`; `timeoutMs: 0` still reaches `spawnSync` as "no timeout". `task.81` calls
  the API, not the CLI.
- **TASK80-006** — `import … from "./tests/spawn-budget.mjs"` will crash `npm run bundle`. The bundler
  captures the nested sibling as a transitive dep, then writes `references/tests/spawn-budget.mjs`
  while only `references/` is created — reproduced deterministically as `FileNotFoundError`. It does
  not fire today only because no skill references this module yet.

Gate-1's TASK80-001 is graded **PARTIAL, not FIXED**, deliberately: `:460` is fixed, but the finding's
impact statement is still reachable through the API. Grading the wording rather than the mechanism is
how a loop closes findings while the defect stays.

One methodological note. The exit-after-write mutation initially appeared **not** to red — the guard is
proximity-based (`LOOKBACK_CHARS = 1200`) and the first reversion put the exit outside its window. A
faithful reversion reds it at `security-probe.mjs:L100`. Reporting the first attempt as "not proven"
would have been wrong; so would reporting a green suite as proof.

**Convergence check**: not applicable — it needs three readings and there are two. Both are
`HIGH_N = 0`. Proceeding to 5b.

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
| **HIGH findings** | 0 |
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
