# Implementation Report: observe-work — config schema, skill boundaries and the meta-skill family

**Task**: `task.95.observe-work-docs-boundaries.md`
**Run Number**: 1
**Started**: 2026-09-09 07:58
**Status**: ✅ Complete — Accepted

---

## Summary

Close the documentation gaps left open by tasks 93 and 94: document the `observations:` config block, add reciprocal boundary notes to `autoskill` / `remember-insight` / `double-check`, and ship a seeded `skill-families.md` template so `observe-work`'s sibling check has a registry from day one.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Feature branch base | `develop`                                                                                                                |
| PR target           | `develop`                                                                                                                |
| qa-planning gate    | skipped (auto)                                                                                                           |
| Task risk level     | not set (`risk_level` absent)                                                                                            |
| Pipeline mode       | standard                                                                                                                 |
| Always-load files   | 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` |
| Tracker             | GitHub (`JIRA_URL` unset)                                                                                                |
| Tracker Issue       | [#341](https://github.com/Gamaroff/agent-skills/issues/341)                                                              |
| Board status        | In Progress ✅ (Todo → In Progress, verified) · Priority `P1 High` (pre-set, not overwritten)                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                                                                                                                     | Notes                                                                 | Subagent summary ref |
| -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.95.*` exists in git                                                                                                                                | Pre-existing from partial run; verified at `399799b7`, pushed to origin with upstream set | —                    |
| 2. review-task             | ✅ Done    | `task.95.review.{N}.{name}.md` exists (or skip logged)                                                                                                                  | **Skipped** — gate satisfied by `review.1` (see Decisions Log)        | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                                                                                                                       | 4 phases, 10 files, 10 tests added (all mutation-proven); 1 iteration | —                    |
| 4. create-pr               | ⏳ Pending | PR URL targets `develop`; issue comment posted                                                                                                                          |                                                                       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.95.qa.{N}.*.md`; `task.95.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted        |                                                                       | —                    |
| 7. finalise                | ⏳ Pending | `task.95.dod.{N}.*.md`; task `status: accepted`                                                                                                                         |                                                                       | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                                                                                                                      | final report + DoD + sprint review committed | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- **Resume vs fresh**: previous partial run detected (branch + `review.1` committed as `399799b7`, no implementation report, no PR, no lock). User answered **"Resume on existing branch"** — reuse the branch and the actioned review 1; start real work at Step 3.
- **Q1 — Feature branch base**: `develop` (recommended; the existing branch is one commit ahead of `develop`).
- **Q2 — PR target branch**: `develop` (recommended; repo's Gitflow target).
- **qa-planning gate**: skipped (auto — no prompt), per Phase 0d.
- **Phase 0 fan-out**: no Explore subagents dispatched. Project instruction `AGENTS.md` / session guidance forbids calling the Agent tool unless the user requested it, so resolution, tracker read and lite-mode inputs were gathered inline via Bash. All three produced complete results; nothing was defaulted on failure.
- **Pipeline mode = `standard`**, computed from the three booleans: `risk_ok = true` (`risk_level` absent ∈ {low, absent}); `phase_count = 8` → **not** `< 3` → false; `single_module = false` (scope spans `docs/reference/`, three `skills/*/SKILL.md`, a new `skills/observe-work/assets/` template and `README.md`). Lite mode requires all three; two are false.
- **Always-load files resolved**: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all three verified present on disk.
- **Tracker resolved**: `TRACKER=github` (`JIRA_URL` unset), `TRACKER_ISSUE=341` from frontmatter `github_issue:`.
- **Status handling**: task status is `ready-for-development` → proceed normally (Phase 0c table).

### Step 1 — create-branch — 2026-09-09

- Lock collision check: no `.claude/state/develop-pipeline.lock` present → proceeded.
- `/create-branch` **not invoked**: per the resume decision the branch already existed and was checked out with a clean tree. Step 1's required artifact ("branch exists in git") was verified directly rather than re-created, per the resume contract.
- Branch pushed to `origin` and upstream set (it was local-only).
- Pipeline lock written with `current_step: 2`.
- Tracker `work-started` comment: `reason: posted`.
- GitHub board `work-started`: `Todo → In Progress`, `verified: true`, observed `In Progress` on board "Agent Skills".
- Board Priority: already `P1 High` — the P2 default was correctly skipped rather than overwriting a human's choice.

### Step 2 — review-task — 2026-09-09

- **Gate decision: SKIP.** Pre-review status is `ready-for-development` and `task.95.review.1.observe-work-docs-boundaries.md` exists → the develop-task decision table's `Ready for Development` + `Yes` row skips.
- No freshness computation was run, and that is correct: the freshness rule governs the `Planned` row only. `Ready for Development` skips on report *presence*, because reaching that status required passing this gate and the status is itself the assertion that a review completed.
- Review 1 verdict: `NEEDS REVISION` as authored → `READY TO IMPLEMENT` with fixes. The task body records all 4 Critical + 5 Important fixes implemented 2026-09-09 (commit `399799b7`), so the outcome is not a blocking finding.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 1** — the pre-existing branch had no upstream and did not exist on `origin`. Pushed with `git push -u` before writing the lock, so the branch named in the `work-started` comment actually resolves. Non-blocking; no other effect.
- **Step 4 (pre-existing, not introduced here)** — the pre-commit bundler prints `⚠️  shared/resources/<name> not found` while bundling `observe-work`. Confirmed pre-existing: it reproduces at the parent commit `399799b7` in a detached worktree, before any of this task's changes. Benign — the bundler still reports `observe-work: in sync` and exits 0. The literal `<name>` appears in none of `observe-work`'s own files, so the placeholder is reaching the bundler by some other path. Out of scope for task 95; recorded rather than chased.
- **Housekeeping (pre-existing)** — `git stash list` holds `stash@{0}: On develop: develop-task: implementation report pre-branch`, left by an earlier aborted pipeline run. Not touched: dropping another run's stash is not this pipeline's call.

---

## Completion Summary

_Filled in at Step 8._

### Step 3 — develop (pre-develop) — 2026-09-09

- **Pre-develop surface map: 9 files across 4 modules** — built **inline (Bash/grep), not via an Explore subagent**. Session-level instruction forbids calling the Agent tool unless the user requested it; the task's own `## 7. Files Summary` and the co-located plan file already enumerate the surface exactly, so the map was verified rather than discovered. Deviation from the step-3 reference is deliberate and recorded here.
  - `docs/reference/configuration.md` — `## Full schema` (L27), `## Key reference` (L149), `## Environment variables` (L837); `loopSupervisor` block is the style exemplar; `## Tracker workflow` (L283) is the prose-section exemplar.
  - `skills/autoskill/SKILL.md` (142 L) — `## Constraints` L136 is the tail; `## When to activate` L10 is where a reader looks for scope.
  - `skills/remember-insight/SKILL.md` (101 L) — `## What NOT to save` L91.
  - `skills/double-check/SKILL.md` (358 L) — `## When to Use This Skill` L37, `## Known Limits` L317.
  - `skills/observe-work/SKILL.md` (15.9 KB) — Session Start Protocol step 1 takes the one-line pointer; `assets/` does **not** yet exist.
  - `skills/observe-work/tests/observe-work.test.js` (20.9 KB) — existing suite; `observe-work-hook.test.js` is its sibling.
  - `README.md` — badge L5 and prose L7 both read `115`.
  - `CHANGELOG.md`, `skills/observe-work/assets/skill-families.template.md` (to create).
- **Plan file found**: `task.95.plan.observe-work-docs-boundaries.md` — included as implementation context.
- **Always-load files**: 3 read and used as context.
- **Pre-develop fact-checks run against the tree** (rather than trusting the plan's claims):
  - `resolve-observation-workspace.sh` reads `observations.workspace` only (L145); precedence config → `$OBS_WORKSPACE` → project-identity default (L27–28, L142–152); ephemeral refusal covers `.claude/worktrees/`, `/tmp`, `/private/tmp`, `/var/tmp` and linked git worktrees (L103–131); anchor is the **main** worktree via `--git-common-dir` (L73–82). ✅ matches the plan.
  - `OBS_STALE_DAYS` default is **14** (`observe-work-session-start.sh:111`). ✅
  - `observations.enabled` / `observations.review_interval_days` have **no reader** anywhere in the tree — the only hits are task 95's own documents. ✅ confirms the "do not document" instruction.
  - `parseFamilies()` (`shared/resources/observation-log.js:907`) requires `≥4` cells, skips separator and `Family` header rows, splits `Members` on `,` or `/`, `Shared`/`Member-specific` on `;`, and returns `{name, members, shared, memberSpecific}` — no coherence field. ✅
  - `families --audit` resolves `skills/<member>/SKILL.md`, tests `body.includes(rule)` per shared rule, suppresses via a **two-way** substring test against `memberSpecific`, and reports `reason: "already"` when `gaps` is empty. Noted: zero gaps ⇒ `already`, not `ok`.
  - Live skill count is **126** (`ls -d skills/*/ | wc -l`). ✅ matches the plan.

### Step 3 — develop (result) — 2026-09-09

**Outcome: complete in one iteration.** No stall, no test-failure triage cycle, no blocking condition.

Phases, each verified rather than asserted:

1. **Config schema** — `observations:` block (one key) in the Full schema, a Key reference row, `OBS_STALE_DAYS` in a new `### observe-work` Environment-variables subsection, and a `## Observation workspace` prose section covering the resolver order, the ephemeral refusal, the cwd rule and the user-scope rule. Verified by driving the resolver in a scratch project: config beat env, env was used when config was absent, and a `/tmp` anchor was refused with a non-zero return rather than defaulted.
2. **Boundary notes** — `autoskill`, `remember-insight`, `double-check`, each with the family's shared sentence verbatim. `npm run generate-catalog` produced **no diff**, which is the proof no `description:` moved.
3. **Family template** — `skills/observe-work/assets/skill-families.template.md`, a four-column table seeded with the meta-skills family plus a deliberately three-column guidance table the parser skips. `families --audit` against this repo returns **zero gaps**. A pointer was added to Session Start step 1, conditioned on an *empty* registry (never a missing one — `init` always creates the file).
4. **README and changelog** — badge and prose 115 → **126** (the live `ls -d skills/*/ | wc -l`, not 115 plus this task's additions), `observe-work` added to the featured Meta list, and one `CHANGELOG.md` entry covering tasks 93–95 as one capability.

**Scope beyond the letter of the plan, and why.** The shared sentence went into **four** members, not the three Phase 2 names: Phase 3's zero-gap audit covers every member the family lists, `observe-work` included, so omitting it would have made the seeded family fail its own audit on first run — the exact failure Phase 3 exists to prevent. And §8's Contract Tests ask for the precedence and the `OBS_STALE_DAYS` default to be *asserted by driving* rather than read; ad-hoc probes in a session log are not assertions, so five contract tests were committed.

**Tests added: 10** — 4 family-template, 4 resolver contract, 2 `OBS_STALE_DAYS`. Every one mutation-proven: paraphrasing the shared sentence in one member, widening the guidance table to four columns, letting Member-specific swallow the shared rule, disabling the config tier, disabling the env tier, turning the ephemeral refusal into a warning, and documenting a reader-less key each turn a named test red, and the suite returns green on restore.

**One test was vacuous when first written.** The `resolveIn` helper returned a single value, collapsing "the resolver refused" and "the resolver exported an empty string" into one signal — so the ephemeral-refusal assertion passed against a warn-and-continue mutant. Only the mutation pass exposed it; the helper now returns `{ refused, workspace }` and the refusal test reads the status. This is `docs/reference/anti-patterns.md`'s "Never let one signal report two states", reproduced inside the test written to enforce a refusal. Logged as **observation #16**.

**Gates**: `npm run format` clean · `npm run ci:fast` **2901 pass / 0 fail** (2902 total, 1 skipped) · `generate-catalog` no diff · `npm run bundle` idempotent on the second run · `quick_validate.py` passes on all four affected skills · bundled resolver confirmed byte-identical to its source apart from the generated banner (mutation residue check).

**Deferred**: nothing. `/finalise` correctly **not** invoked — pipeline bypass applies, Step 7 owns it.

### Step 4 — create-pr — 2026-09-09

- **SCOPE_PATHS (8)**: `docs/tasks/task.95.observe-work-docs-boundaries`, `docs/reference/configuration.md`, `skills/autoskill`, `skills/double-check`, `skills/observe-work`, `skills/remember-insight`, `README.md`, `CHANGELOG.md`. Both root-level files were passed explicitly — the reference's `dirname` derivation yields `.` for them, which it skips, so a scope built only from that loop would have dropped the README and CHANGELOG edits from the commit.
- **Pre-flight guard**: no untracked path fell outside the scope set, so nothing was held. Post-commit leak check clean — all 12 staged paths in scope, nothing left unstaged.
- **Commit** `d955f01f`, single logical commit. The four phases are one capability and Phase 3's audit depends on Phase 2's sentence, so splitting them would have produced a commit that fails its own tests.
- **Implementation report committed here**, per the Step 4 rule — this is its first commit, not a deferred update.
- **PR #360** → `develop`, `Closes #341` in the body.
- **Issue comment**: `reason: posted` via `tracker-comment.js --stage in-review` (marker-aware, so a resume will not duplicate it).
- Lock updated with `pr_url`, advanced to step 5.

### Step 5 — qa-task (QA cycle 1) — 2026-09-09

- **Gate: CONCERNS (90/100)** — `task.95.gate.1.observe-work-docs-boundaries.yml`. Deterministic rule 2: one MEDIUM `top_issues` entry, no HIGH, no NFR below PASS.
- Phases verified **4/4**, each against the tree rather than the document. Suite green: 2901 pass / 0 fail / 1 pre-existing skip. `format:check` clean.
- **Step 3b** run **inline, not via an Explore subagent** — same session-level constraint recorded at Step 3. Whole-branch diff, first review (`PRIOR_GATES=0`, no refute or safety-re-probe scoping). 0 correctness bugs, 2 advisory cleanups. `code_review_blocking` unset → `CR_BLOCKING=false`, nothing promoted to the gate.
- **Step 4b** fired (four `SKILL.md` modified; `observe-work` carries bash blocks) and returned `no-executable-blocks` — 5 blocks, all correctly refused as `mutating`, **0 placeholder**. Per the rule this is information, not a finding. The diff adds no new bash block to any `SKILL.md`.
- **Step 3c** — QA independently re-ran one of the seven development-time mutations (paraphrasing the shared sentence in `remember-insight`) and confirmed the zero-gap audit goes red and recovers. The dev record was verified, not accepted.
- **Finding (MEDIUM, `task.95.bug.1`)**: the new `## Observation workspace` section never states the default workspace path, and the schema block's `~/.agents/skill-observations` example points at a different tree from the real default (`~/.claude/projects/<abs-path with / → ->`). Established by driving the resolver, not by reading it.
- **Two LOW advisories**: in-body `require()` calls in the new tests; `saysStale()` matching the whole context string. Neither gates.
- Checks run that produced **no** finding, recorded so a later cycle need not redo them: the template **does** ship in the packaged skill (verified empirically — `package_skill.py` never names `assets/`, so reading it would have given the wrong answer); the root-level zip it emits is covered by `.gitignore`'s `*.zip`; the shared sentence survives `npm run format` because `.prettierrc` leaves `proseWrap` at `preserve`.
- PR comment posted (#360), issue #341 commented.

### Step 6 — qa-fix (QA cycle 1) — 2026-09-09

- **Fixed TASK-95-BUG-1 (MEDIUM)** in `docs/reference/configuration.md`: the Key reference `Default` column now carries the path shape `~/.claude/projects/<project-path with / → ->` with a worked example; the prose resolver item 3 gains the same plus the encoded-not-nested point; the schema block header states the default and labels `~/.agents/skill-observations` an example override. Root cause was a documentation defect, not a code one — the resolver's behaviour is correct and task 93 owns it.
- **Both LOW advisories taken** in the same pass: `require()` calls lifted to module scope in `observe-work.test.js`; `saysStale()` anchored to the review-state clause in `observe-work-hook.test.js`.
- **Constraint honoured**: no new `observations.*` key name was added. The contract test asserts every documented key has a reader, so a new name would have failed it — and the test's scan is confined to the schema block and key-reference table, so the added prose naming `.claude/` and `.agents/` is not misread as a key.
- **Mutation-proven**: changing the hook's applied default 14 → 7 turns exactly one test red and nothing else. A first attempt mangled the variable rather than the value; it went red for the wrong reason and was redone, because a mutation that proves the wrong thing is not proof.
- Bug report → **Ready for QA** with Investigation / Fix Implementation / Status History.
- Commit `cb1ef7f5`, pushed. **Implementation report excluded** from this commit per the Steps 5–6 rule (it is already tracked; Step 8 commits its final state). Verified: 0 implementation-report paths staged.
- Gates: `format` clean · `ci:fast` **2901 pass / 0 fail** · `generate-catalog` no diff. PR comment posted.
- No third strike (cycle 1). No ambiguity in the findings, so no clarification was needed.

### Step 5 — qa-task (QA cycle 2, refute pass) — 2026-09-09

- **Gate: PASS (100/100)** — `task.95.gate.2.*.yml`, `top_issues: []`. Deterministic rule 5.
- Scope: **unscoped refute pass** (`PRIOR_GATES=1` → `REFUTE_PASS=true`), the whole branch diff re-read to disprove. `SAFETY_REPROBE=false` — gate 1's security was PASS and the finding was documentation, not a safety boundary.
- All three cycle-1 findings verified FIXED, each against the regression its own fix invites: no unused import survived the require-lift, and the tightened `saysStale()` regex was mutation-proved non-vacuous.
- **One new LOW** — the newly-documented path formula is silent about linked git worktrees, where the resolver anchors to the **main** worktree. Established empirically: a detached worktree at `/tmp/wt-refute` resolved to the main checkout's identity. Stays LOW because the rule is already stated 33 lines further down in the same document; carried as a `future` recommendation. It matters here specifically because `/develop-batch` runs every parallel story in a linked worktree.
- Cycle 1's entry deliberately **not** carried forward into gate 2. The third-strike rule keys on the `file:` of HIGH entries across the last three gates and ignores `status: closed`, so a copied-forward entry would make one finding look like a file struck twice.
- `task.95.bug.1` → **Closed**. Commit `ca79177c`.

### Step 5c — review-pr (QA loop exit gate) — 2026-09-09

- **Verdict: ✅ APPROVE** — `task.95.pr-review.1.observe-work-docs-boundaries.md`. Deterministic table: no HIGH, no MEDIUM, three LOW.
- Work item resolved via **branch stem**. 19 files, +2242/−136; **no** files excluded as auto-generated (the change touches no bundled `references/` copy — worth stating, because on this repo a skill change usually carries thousands of generated lines and their absence is a property of this PR, not of the filter).
- **Coverage 9/9** — every success criterion has evidence in the diff, and the seven functional ones are enforced by executable assertions rather than inspection.
- Trail complete and honest. CI at review time: `validate`, `link-check`, `shellcheck`, `branch-policy` all ✅; `test` in progress, with the local equivalent green.
- Both lenses run **inline rather than via parallel Explore subagents**, same session constraint as Steps 3 and 5.
- **Three LOW findings, all actioned immediately** rather than deferred (commit `b1a454ec`): PC-1 reconciled §4's Out-of-Scope bullet with what shipped; CR-1 dropped a dead parameter; CR-2 closed a residual one-signal-two-states in `resolveIn` — the *status* half of the same defect the helper had already fixed for the *value*. The CR-2 guard is mutation-proven: silencing the RC probe makes it fire with its own message.
- APPROVE exits the loop to Step 7. **2 of 5 QA cycles used.**

### Step 7 — finalise — 2026-09-09

**Outcome: ACCEPTED.** But the CI gate fired first, and that is the most important thing that happened in this pipeline run.

- First pass read `CI_ROLLUP=PENDING` and **waited rather than assuming**. The rollup then resolved to **FAILURE** — on a head whose local suite was green (2901 pass / 0 fail) through three separate runs, one QA cycle, an independent QA re-verification and a `/review-pr` pass.
- **Both failures were this task's own family-template tests.** They built the engine workspace with `fs.mkdtempSync(path.join(os.tmpdir(), …))`. `os.tmpdir()` is `/var/folders/…` on macOS and literally `/tmp` on Linux, and `observation-log.js` **refuses an ephemeral workspace** (`reason: "ephemeral-workspace"`, exit 1). Identical code, opposite outcomes, decided by where the OS puts temporary files.
- **The lesson was already written down one file away.** `observe-work-hook.test.js` opens with *"Fixtures live under os.homedir(), NOT os.tmpdir()… That cost real time during cycle 4's review before the fixtures were moved."* New tests were written in the same directory without applying it. A lesson recorded in a file header protects only the file it heads.
- **QA had examined this exact construct and blessed it.** Cycle 1's report stated *"the JS engine … has no such refusal. The asymmetry is real and correct."* That was reasoned from one platform and asserted as a property of the engine; `/review-pr` read the same code and did not challenge it. The report was **corrected in place**, with the false paragraph left standing under a correction, because the record of a false pass is more useful than a clean report.
- **Fixed and proven, not pushed and hoped**: `TMPDIR=/tmp node --test 'skills/observe-work/tests/*.test.js'` reproduces the CI failure locally and passes on the fix. Verified in both directions. Commit `2c6dfc13`; CI then green on all five checks.
- Logged as **observation #17**.
- DoD: 9/9 success criteria, security PASS, compliance N/A, docs PASS, CI SUCCESS. No section needed manual review; no open bugs.
- Tracker: issue #341 commented and **closed** (verified `CLOSED`); board `done` → `reason: already` (the close had already moved it); Document link already durable, nothing to re-point.
- Artifacts: `task.95.dod.1.*.md`, `sprint-review-summary.md`, canonical PR comment.

### Step 8 — commit-changes — 2026-09-09

Final state of the implementation report, the DoD summary and the sprint review summary committed and pushed. Pipeline lock removed.

---

## Completion Summary

**Finished**: 2026-09-09 11:35 · **Final Status**: ✅ Accepted · **QA Iterations**: 2

Task 95 shipped in **7 commits** on `feature/task.95.observe-work-docs-boundaries`, merged via [PR #360](https://github.com/Gamaroff/agent-skills/pull/360) into `develop`.

**Delivered**: the `observations.workspace` config schema with its resolver order and refusal semantics; `OBS_STALE_DAYS` documented as the environment variable it is; reciprocal boundary notes making four meta-skills legible as a set; a seeded `skill-families.md` template so the sibling check has a real family on day one; the README count corrected after an eleven-skill drift; and one CHANGELOG entry covering tasks 93–95 as a single capability.

**Deliberately not delivered**: `observations.enabled` and `observations.review_interval_days`. Neither has a reader, and a test now fails if a reader-less key is documented.

**Tests**: 10 added, every one mutation-proven. Repo suite 2902 tests, 0 failures, CI green.

**The run's real lesson**, in three parts, each a case where a check caught what a green result hid:

1. A test was **vacuous when first written** — `resolveIn()` collapsed "refused" and "returned empty" into one signal, so the refusal assertion passed against a warn-and-continue mutant. The mutation pass exposed it (observation #16).
2. A mutation **went red for the wrong reason** and was redone precisely. A red test is not self-validating.
3. **CI caught what six local gates did not** — a platform-variable fixture path. A green suite is evidence about the platform it ran on, not about the code (observation #17).

**Carried, non-blocking**: the documented path formula is silent about linked git worktrees (`/develop-batch` runs every parallel story in one); the precedence order now sits in three places with only the consumer-facing copy bound to assertions.
