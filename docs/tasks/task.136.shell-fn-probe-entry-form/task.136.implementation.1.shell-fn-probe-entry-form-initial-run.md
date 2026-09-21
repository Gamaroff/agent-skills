# Implementation Report: A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Task**: `task.136.shell-fn-probe-entry-form.md`
**Run Number**: 1
**Started**: 2026-09-21 19:35
**Status**: Completed

---

## Summary

Give `security-probe.mjs` a `shell-fn:<path>#<function>` entry form (source a library, call the function with the case as argv under bash and zsh) and a `--fake-gh <dir>` affordance, so a sourced-shell-function boundary such as `gh-labels.sh#gh_labels_filter` can be executed offline and the finalise security gate counts real executions instead of ending in a human override (obs #138).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (work-started: Todo → In Progress, verified)                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.136.*` exists in git                              | Branch created at `c11d1f49`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.136.review.{N}.{name}.md` exists (or skip logged)                | `task.136.review.1.shell-fn-probe-entry-form.md`; READY TO IMPLEMENT 9/10; Planned → Ready for Development | pre-pass B/C inline (see Decisions) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 4/4 phases; ci:fast 3878/3879 pass, 0 fail; security-probe 57/57; shellcheck clean; 5 mutants killed | — (surface map + loop audit inline) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #462: https://github.com/Gamaroff/agent-skills/pull/462 (base develop, head `031a3e66`) | — (PR body composed inline) |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.136.qa.{N}.*.md`; `task.136.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: gate 1 CONCERNS (bug 1) → fix; gate 2 CONCERNS (bug 2) → fix; gate 3 CONCERNS no open finding → 5c review-pr **CONCERNS**; PR comments per cycle | — (reviewers dispatched per cycle; summaries in the QA reports) |
| 7. finalise                | ✅ Done    | `task.136.dod.{N}.*.md`; task `status: accepted`                       | ACCEPTED; `task.136.dod.1.shell-fn-probe-entry-form.md`; acceptance commit `c0ac4184`; CI 1 SUCCESS @ 56b5ec1d, CI 2 SUCCESS @ c0ac4184; issue #448 closed; board Done | — (4 DoD agents; YAML folded into the DoD summary) |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | implementation report committed (hash in the Step 8 log below) and pushed; lock removed | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-21

- Dispatched by `/develop-next` (AUTONOMOUS RUN directive; item T136, source `task-registry`, registry line 179; local `develop` was 3 commits ahead of origin — pushed before branching so the PR diff stays clean).
- Phase 0 run inline (no Explore subagents dispatched): file path supplied directly, so no resolver; tracker polled with `gh issue view 448` (OPEN, board status Todo, labels `task`, `priority:high`); lite-mode inputs derived from the document — `risk_level: medium`, `phase_count: 4`, `single_module: false` → `risk_ok = false` → **PIPELINE_MODE = standard**.
- Task status `Planned` — noted; Step 2 `/review-task` validates and promotes.
- Tracker: GitHub, issue #448.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from `skills-config.yaml` `devLoadAlwaysFiles`; all present).
- Phase 0d (2 questions, auto-answered per the develop-next directive — no prompt issued):
  - Q1 Feature branch base: `develop` — recommended option (current branch `develop`)
  - Q2 PR target branch: `develop` — recommended option
- qa-planning gate: skipped (auto — no prompt)

### Step 1 — create-branch

- Branch `feature/task.136.shell-fn-probe-entry-form` created from `develop` (`c11d1f49`), pushed with tracking. Implementation report stashed before branch creation, restored after.
- Pipeline lock written (`current_step: 2`).
- Tracker: work-started comment posted on #448 (`posted`); GitHub board: work-started → In Progress (from Todo, verified).

### Step 2 — review-task

- Gate: status `Planned`, no review report → ran `/review-task`. review-task output: Comprehensive report — required for pipeline audit trail. Review report: `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.review.1.shell-fn-probe-entry-form.md`.
- Pre-pass dispatched (2 Explore subagents, parallel, ~25 s each): Agent B `alignment: aligned`; Agent C `implementation_status: not-implemented`. review-task Step 0a branch setup auto-skipped (already on `feature/task.136.*`).
- Findings: 1 Critical (the documented finalise command ran the stock `filename` corpus whose `expected.stdout` is `"12\n"` — `gh_labels_filter` could only score `absent`, the task.125 result reproduced; fixed by a committed label-shaped `tests/fixtures/shell-fn/gh-labels.cases.json` read via the engine's existing `--cases-file`), 2 Important (fake `gh` must honour `-q` — one name per line — since that is what `gh-labels.sh` calls; Risk 1 wrongly claimed `--noprofile --norc` is how the `shell:` arm spawns — its isolation is the sandbox `HOME`, no-rc flags become a Phase 2 deliverable), 3 Optional (pin test is `probe-boundary-signals.test.mjs`, not `transition-protocol-parity`; Phase 1 files + Files Summary name every fixture).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. All 6 applied (optionals were one-line edits). Change Log rows 1.1 (verdict) and blank-version (status) written.
- review-task Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously. Planned promoted to Ready for Development by review-task.
- Tracker: review-task comment posted on #448 (`posted`, outcome "ready to build", blocking absent).
- Tracker key re-read: `github_issue: 448` unchanged from Step 1 — no re-fire.

### Step 3 — develop

- Pre-develop surface map: 9 files identified in security-probe / gh-labels / QA prompts — performed **inline** during Step 2 rather than by a fresh Explore dispatch (independence loss recorded; the review already read every file the plan names, and pre-pass C had scanned the symbols): `shared/resources/security-probe.mjs` (resolveEntry :238, SHELL_PREFIX :308, probeShells :320, runProbeSpec :449, shell-arm dispatch :562, runShellCase ~:820–1000, CLI flags incl. `--cases-file` :1361), `shared/resources/security-input-corpus.mjs` (MATERIALISED_SINKS.filename, FILENAME cases `expected: {stdout:"12\n",…}`), `shared/resources/qa-execute-snippets.mjs` (sandboxEnv :1417), `shared/resources/tests/security-probe.test.mjs` (1095 lines, `shell:` block to mirror), `shared/resources/gh-labels.sh` (`gh_labels_filter`, `gh label list … -q '.[].name'`), `shared/resources/probe-boundary-rule.md` (§5 entry-forms paragraph :170), `shared/resources/finalise-dod-security-prompt.md` (:47, :153, :167), `skills/qa-task/SKILL.md` :479 / `skills/qa-story/SKILL.md` :987 (Step 3b), `shared/resources/tests/probe-boundary-signals.test.mjs` (entry-form pins :145–214).
- Plan file found: `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.plan.shell-fn-probe-entry-form.md` — included as implementation context for /develop. Plan-vs-code check: plan's `r.totals.executed` / `c.mismatches` are record-side names; `runProbeSpec` returns top-level `executed` and per-case `detail` — code wins. Plan's fake `gh` already answers the `-q` (one-per-line) form, consistent with review fix I1.
- Fast gate: `develop.fastGateCommand` unset → fallback `npm run ci:fast` (`format:check && test`), which `npm run` lists — precondition passes.
- Always-load files (3) read and passed to /develop.
- Planned/Draft gate: not reached — status was `Ready for Development` after Step 2. Risk level `medium` → no qa-planning gate. Alignment: greenfield (pre-pass C `not-implemented`; no existing `shell-fn`/`fakeGh` symbols) — no alignment prompt.
- **Develop iteration 1 (the only one).** Phase 1: `tests/fixtures/fake-gh/gh` (mode 755; answers `label list` one-per-line under `-q`, JSON otherwise, `issue create` → log + URL, else exit 2; refuses without `FAKE_GH=1`), `tests/fixtures/shell-fn/echo-unfiltered.sh`, `tests/fixtures/shell-fn/gh-labels.cases.json` (10 cases, 7 hostile / 3 legitimate); 12 rows appended to `security-probe.test.mjs` — 10 red before Phase 2, 47 pre-existing rows green, the 2 engine-independent rows (the `shell:`-against-a-library task.125 shape; the fake `gh` standalone) green. **`syntax-error.sh` is written at test time** into a temp dir under `tests/fixtures/shell-fn/`, not tracked: a tracked `.sh` with a syntax error fails the ShellCheck lane (`git ls-files '*.sh'`), so the Files Summary was amended to say so.
- Phase 2: `security-probe.mjs` — `SHELL_FN_PREFIX`, `SHELL_FN_NAME` (`/^[A-Za-z_][A-Za-z0-9_]*$/`), `resolveEntry` third branch (`kind: "shell-fn"`, `fnName`), `runProbeSpec({ fakeGh })` with pre-spawn validation (`bad-fake-gh`: not a string, outside repo root, no dir, no executable `gh`) and `fakeGh` on every return path (key-set test), `runShellCase` argv branch `[...noRcFlags(shell), "-c", SHELL_FN_BODY, "probe", entryPath, fnName, c.input]` with `PATH` prepend + `FAKE_GH=1`, reserved exits 97 (source failed) / 98 (function not defined after `typeset -f`) → `errored` → the existing all-errored fold to one `entry-not-probeable` decline; `toRecordEntry` gains `fake_gh`; CLI `--fake-gh`. Plan-vs-code: the plan's exit 2 for `bad-fake-gh` was not followed — `bad-entry` is a decline (exit 1) in `runProbeSpec`, and the API caller (`task.81`-style) needs the same shape, so `bad-fake-gh` is a decline too.
- **Mutation proofs** (snapshot → mutate → targeted rows → restore, `cmp` clean): M1 task.125 shape (`bash "$1" "$2"` with the library and input) → green row red, live verdict `unverifiable (rejects-every-input)` executed 20 passed 14 — *not* `absent` as the task predicted: with a label-shaped cases file, empty stdout matches every hostile case and mismatches every legitimate one, and the engine's `rejects-every-input` is the right name for "prints nothing"; M2 drop the `PATH` prepend → red, live verdict `present-but-inert` reproduced 10 **ESCAPED 1** (the real `gh` ran from the sandbox cwd, failed the read, the function passed candidates through lowercased; the sentinel caught `gh` touching the sandbox HOME); M3 drop the exit-97 branch → source-failure row red; M4 drop the exit-98 branch → not-defined row red; M5 skip `--fake-gh` validation → bad-fake-gh row red. Task bullet updated to record the actual verdicts.
- **Evidence run** (`command node shared/resources/security-probe.mjs --sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --json`, repo root): `verdict: engages`, `reason: hostile-rejected-legitimate-accepted`, `shells: [bash, zsh]`, `executed: 20`, `passed: 20`, `reproduced: []`, `overblocked: []`, declined 0, escapes 0, `fakeGh: <repo>/tests/fixtures/fake-gh`, exit 0. Without `--fake-gh`: exit 1 in 1.6 s (no hang), `present-but-inert`, first mismatch `stdout "$(touch pwned).label\n" ≠ ""`, 1 escape — this is the evidence task.125's DoD § Step 5 lacked.
- Phase 3: `probe-boundary-rule.md` §5 gains the `shell-fn:` paragraph (header signal: *source it* / functions with no top-level call; cases-file rule; `--fake-gh`; exits 97/98) — stated once; `finalise-dod-security-prompt.md` (signal bullet, Step 4 command block, the "nor is it a sourced function" sentence), `qa-task` / `qa-story` Step 3b cite it. **The extended pin in `probe-boundary-signals.test.mjs` (a site naming `shell:` must name `shell-fn:` and `--fake-gh`) found a fourth site the task did not list — `shared/resources/security-review-prompt.md`** — updated and added to the Files Summary. Pin mutation-proved (reverting one site → red).
- Phase 4: CHANGELOG [Unreleased] entry; `npm run bundle` (10 bundled copies: security-probe.mjs ×4, finalise-dod-security-prompt.md ×3, probe-boundary-rule.md ×2, security-review-prompt.md ×1); `bundle:check` 0 problems (the `shared/resources/<name> not found` warning pre-exists on `develop`, verified by stash); `npm run lint:shell` clean (74 sources); Prettier applied to the two `.mjs` files.
- **Fast gate** `npm run ci:fast`: first run red on 2 pre-existing-or-adjacent failures, triaged inline from the two assertion messages (no Explore dispatch — 2 named tests): (a) `mutation-call-site-coverage`-style guard "every site reads the engine's artefact" — my Step 3b insertion pushed `probes_executed: 0` beyond ±5 lines of the `--record` mention; fixed by re-ordering the sentence; (b) `tests/bundled-links.test.js` — `skills/qa-next/assets/run.template.md:41` `../../bugs/…` broken link, **pre-existing on `develop`** (commit `1938d975`; `gh run list` shows the Test workflow red at `c11d1f49`, develop's head) — fixed with a one-cell placeholder change and recorded in the Files Summary as incidental, because every PR off `develop` inherits the red. Second run: 3878/3879 pass, 0 fail, TEST_EXIT=0; log deleted.
- Change Log row appended through `change-log.js` — via `shared/resources/change-log.js`, because `.agents/skills/develop/references/change-log.js` does not exist (obs #152 logged). Status `in-progress → ready-for-review` (both fields).
- Loop audit performed inline (independence loss recorded): 4/4 phases `[x]`, 8/8 success criteria `[x]`, status `Ready for Review` → loop exit after iteration 1. No commit yet on the branch — Step 4 `/create-pr` commits.
- Tracker: develop-complete comment posted on #448 (`posted`, count=4).

### Step 4 — create-pr

- SCOPE_PATHS: `docs/tasks/task.136.shell-fn-probe-entry-form`, `CHANGELOG.md`, `shared/resources`, `skills`, `tests/fixtures`. No out-of-scope untracked files — nothing held.
- `/create-pr --base develop --issue 448 --scope …` → `/commit-changes --scope …` made **two** commits: `ce45625e` fix(qa-next) — the incidental pre-existing template link (kept separate so it is reviewable on its own); `031a3e66` feat(security-probe) — the task (25 files, +2004/−186, the fake `gh` at mode 100755). Implementation report committed here, per the step-4 rule. Leak check: OK (both commits inside scope).
- PR created: https://github.com/Gamaroff/agent-skills/pull/462 — `feat(task.136): shell-fn: probe entry form and --fake-gh for sourced-library boundaries`, base `develop`, `Closes #448`. PR body composed by the orchestrator from the diff it had already read (no summariser subagent dispatched).
- Post-PR state check: PR #462 state = OPEN, head `031a3e66` = branch HEAD. errors = 0 (checked with `gh pr view`; no poller subagent dispatched).
- Tracker: in-review comment posted on #448 (`posted`, pr=URL). GitHub board: in-review → `stage-disabled` (no `pipeline.in-review` in this repo's ladder — card stays In Progress; correct outcome).
- Lock: `current_step: 5`, `pr_url` written.

### Steps 5–6 — QA loop

- Loop setup: `QA_MAX_CYCLES` = 5 (no `qa_max_cycles` in lock). GitHub board: QA-start re-assert → `stage-disabled`. Traceability mapper skipped: `HAS_SUCCESS_CRITERIA_TABLE=false` (Success Criteria is a checklist, not a table).
- **Cycle 1 / 5a** `/qa-task … code_review_blocking=true` (standard mode). Step 3b reviewer dispatched (Explore, ~5 min, 116k tokens; wait marked and cleared) — 4 findings, each re-verified by QA by execution before entering the report. Security probe run and recorded (`task.136.qa.1.security.run.json`, 41 executed, measured). Step 3c QA mutants: 3 covered, 1 absorbed. Step 4b fired on 5 prose files: 3 `no-executable-blocks`, 2 `zero-blocks-executed` on pipeline-bound placeholders in qa-task/qa-story SKILL.md — this diff touched no fenced block there → information, not gated. Gate: **CONCERNS 90/100**, one open MEDIUM in `top_issues[]`; PR comment posted (`#issuecomment-5766876298`, lead `qa-gate-1`); tracker comment `posted` (`qa-gate-1`). Task status left `ready-for-review` (the canonical lifecycle has no `Completed`; `/finalise` writes `accepted`).
- Outcome branching: `CONCERNS` with an open entry → Convergence check n/a (cycle < 3), route classifier: no exit (cycle < 3; cosmetic-residue is PASS-only) → **5b**.
- **Cycle 1 / 5b** `/qa-fix gate=…gate.1…` — QA Cycle 1 — changes-requested: `stage-disabled`. Findings consolidated inline (no ingester subagent: the orchestrator authored the gate this session). Decision: fix the MEDIUM **and** the three `future` advisories + the pre-spawn pin in the same cycle — each is a small, in-scope edit to files already in the Files Summary, and leaving them for a later cycle risks a cycle-3 finding on the same engine. Third strike: n/a (cycle 1). Post-fix PR state: OPEN, head `f2561282` (checked with `gh pr view`; no poller subagent). Implementation report churn excluded from the fix commit (`git reset HEAD -- …implementation…`). Cycle counter → 2.
- **Cycle 2 / 5a** `/qa-task … code_review_blocking=true` — re-review: prior gate CONCERNS with 1 issue → full refute pass (`PRIOR_GATES=1`); `SAFETY_REPROBE=false` (`OK measured`). Reviewer dispatched (Explore, ~5.5 min, 117k tokens; wait marked/cleared) — 5 findings, each re-verified by execution (BODY reproductions under bash and zsh). Bug 1 verified FIXED by execution → Closed. Probes re-run on `f2561282` (`qa.2.security.run.json`, 41, measured). ci:fast 3883/3884. 3 QA mutants covered. Gate **CONCERNS 90/100**, one open MEDIUM; PR + tracker comments posted (`qa-gate-2`).
- Outcome branching: `CONCERNS` with an open entry → Convergence check n/a (cycle 2), classifier no exit → **5b**.
- **Cycle 2 / 5b** `/qa-fix gate=…gate.2…` — changes-requested: `stage-disabled`. Findings inline. The CR-2 `needs-fake-gh` decline changes what the "without `--fake-gh`" path returns (a named decline, no hang, cause named) — the Success Criterion's intent (no hang, mismatch named) holds; noted in the task's Notes for QA cycle 3 to re-read. PR state after push: OPEN. Report churn excluded. Cycle counter → 3.
- **Cycle 3 / 5a** — scoped re-review (13 files since gate 2; `SAFETY_REPROBE=false`). Reviewer dispatched (Explore, ~4.5 min, 99k tokens) — 3 findings at medium confidence, each verified true by QA by execution (own-trap library rc 1 under both shells; detector misses `gh;`/`gh>`/`(gh)`/`"$GH"`; the `shell-fn`-only gate at :699). Bug 2 verified FIXED → Closed. Probes re-run on `a99f881f` (`qa.3.security.run.json`, 41). ci:fast 3887/3888. 3 QA mutants covered. Gate **CONCERNS 90/100, empty queue** (reliability CONCERNS on the three limits); PR + tracker comments posted (`qa-gate-3`).
- Outcome branching: route 3 (`CONCERNS`, no open entry) → **5c**. Path-1 commit `56b5ec1d` (gate 3 + report 3 + bug 2 closure + task doc), pushed once — cycle 3's push is spent; both artefacts asserted on `origin/feature/task.136.shell-fn-probe-entry-form`. `qa_phase: 5c`.
- **5c** `/review-pr --effort medium --comment` — both lenses dispatched in parallel (code ~5.4 min / 114k tokens; conformance ~1.5 min / 89k; waits marked/cleared). Verdict **CONCERNS** (no high+high). Acted on the cheap consistency findings before Step 7: PC-1 unticked + deferred to `/develop-next` post-merge (the record's own `parked_until`); PC-2 criterion reworded to the delivered `needs-fake-gh` contract; PC-3 QA/Gate tracking rows ticked; CR-2 re-wrapped (bundle 0 problems, guards 512/512). CR-1 and CR-3 join the follow-up list with QA cycle 3's three advisories. PR review comment posted (marker `agent-skills-pr-review`). `ready-for-merge` → `stage-disabled`. Loop exited → Step 7.

### Step 7 — finalise

- Task completed. `/finalise` run in full: 4 DoD agents dispatched in one message (AC ~1.5 min, security ~1.5 min incl. re-executing both probes into `task.136.dod.1.security.run.json` — 41 executed, measured; compliance N/A; docs PASS). AC agent returned PARTIAL on SC5 alone (the extensionless fixture `gh` is outside both ShellCheck lanes, which select `*.sh`) — resolved by recorded execution (`shellcheck --severity=warning` and `--severity=style` on the fixture, ShellCheck 0.11.0, exit 0 both) with the **lane gap sent to the follow-up** (outside the Files Summary; Step 8a would refuse `inside-files-summary`). SC7 (obs #138 `actioned`) NOT_APPLICABLE for this run — deferred to post-merge per the record's `parked_until`.
- Decision: **ACCEPTED** — QA gate CONCERNS with an empty queue judged non-blocking (documented advisories with concrete fixes); CI reading 1 SUCCESS @ `56b5ec1d0225` over 5 checks.
- Local writes: DoD summary (`## Verification Complete`, one status line), frontmatter `status: accepted` / `completed_date` / `pr_number: 462`, Change Log v1.2 `DoD passed — accepted (PR #462)`, registry tick → `ticked` (line 179), DoD section in the body, `sprint-review-summary.md`.
- Publish boundary: acceptance commit `c0ac4184` (`docs(task.136): accept — DoD, sprint review; registry ticked`, also carrying the 5c report, PC/CR fixes and the DoD run record), pushed; 6b assertions OK (document, DoD, sprint review tracked and on origin; `status: accepted` on origin); PR head = acceptance head; **CI reading 2: SUCCESS @ `c0ac4184aba1` over 5 checks after 90 s** (verified via `gh run list --commit`: all five workflows ran for this head; Test 1m46s); 6d CHANGELOG cites task 136 ✅.
- Side-effects after the boundary: canonical PR comment posted (marker `finalise-canonical-summary`, QA Cycles 3); issue #448 — Document link already on `develop`; `done` comment `posted`; closed (`CLOSED` verified); GitHub board: done → `already` (card already in Done).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-21
**Gate Result**: CONCERNS (90/100)
**Issues Found**: 1 MEDIUM — TASK-136-BUG-1 / CR-1: `--fake-gh` validated and recorded (`fake_gh`) for a JS-form entry the JS runner never puts on `PATH` (reproduced); 3 LOW advisory (CR-2 sentinel-exit collision, CR-3 slash-bearing labels not materialisable, CR-4 unbound `FAKE_GH_LOG`); pre-existing `resolveEntry` symlink limit → future
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (cycle 1: Convergence check and Diminishing-returns exit apply from cycle 3; Cosmetic-residue exit is PASS-only)
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: TASK-136-BUG-1 — `--fake-gh` on a `kind: "js"` entry declined with `bad-fake-gh` (option (a) from the bug report; `fakeGh`/`fake_gh` stay null); plus the three `future` advisories in the same cycle — CR-2: function runs in a subshell, its own 97/98 re-mapped to 99 and scored (the new row found that `exit 97` inside the function ended the harness shell before any remap could run); CR-3: no per-case fixture file for `shell-fn:` cases (slash-bearing labels probeable; record `fixture` no longer claims the file); CR-4: `FAKE_GH_LOG` + `issue create` exercised; pre-spawn decline for a missing library pinned. 5 rows added (62/62); 4 mutants killed (F1–F4, each reddening its own row). `probe-boundary-rule.md` §5 updated. Bug 1 → Ready for QA. Fast gate: 3883/3884, 0 fail; shellcheck clean; bundle:check 0.
**Commit**: `f2561282` (pushed — cycle 1's one push)

### QA Cycle 2 — 2026-09-21
**Gate Result**: CONCERNS (90/100)
**Issues Found**: bug 1 + cycle-1 advisories verified FIXED (closed); 1 new MEDIUM — TASK-136-BUG-2 / CR-1+CR-3 of the refute pass: a top-level `exit` in a sourced library ends the harness shell before the exit-97 sentinel (scored `absent`, full count — the task.125 shape) and `set -e` makes the cycle-1 remap inert (reproduced bash+zsh; corrected body verified by QA); 3 LOW advisory (CR-2 `needs-fake-gh` decline, CR-4 `collides` half, CR-5 fixture header)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (cycle 2: Convergence check and Diminishing-returns exit apply from cycle 3; Cosmetic-residue exit is PASS-only)
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: TASK-136-BUG-2 — EXIT trap around the `source` (top-level `exit` → sentinel 97) and errexit snapshot/restore around the subshell (`set -e` no longer skips `rc=$?`; still in force inside the function); CR-2 — `needs-fake-gh` decline when a shell-fn library's text names `gh` and no `--fake-gh` was given (`GH_COMMAND_WORD`); CR-4 — `collides` input-half only when `fnName === null`; CR-5 — fixture header. 4 rows (66/66); 4 mutants killed (G1–G4). Rule §5 + finalise prompt updated. Bug 2 → Ready for QA. Fast gate 3887/3888, 0 fail; shellcheck clean; bundle:check 0.
**Commit**: `a99f881f` (pushed — cycle 2's one push)

### QA Cycle 3 — 2026-09-21
**Gate Result**: CONCERNS (90/100) — no open finding
**Issues Found**: bug 2 + cycle-2 advisories verified FIXED (closed); 3 advisories at medium confidence (c3-CR-1 library-installed EXIT trap displaces the source guard; c3-CR-2 `needs-fake-gh` covers `shell-fn:` only; c3-CR-3 `GH_COMMAND_WORD` terminators / transitive `source`) — verified true by QA, not promoted (mapping requires high confidence), recorded as `future` with concrete fixes; reliability CONCERNS
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.136.pr-review.1.shell-fn-probe-entry-form.md`: PC-1 medium/high (obs #138 criterion ticked while the record is parked — unticked, deferred to post-merge), PC-2/PC-3 low (criterion wording; tracking rows — fixed), PC-4 low (incidental qa-next template fix — accepted as documented), CR-1 low/medium (`source … ||` ignores errexit for the library's top-level commands — follow-up), CR-2 low (finalise-prompt line re-wrapped), CR-3 low (dead `!isShellFn &&` — follow-up)
**Loop exit**: n/a — this exit not taken (route 3: `CONCERNS` with an empty queue reaches 5c directly; Convergence check and Diminishing-returns exit not consulted)
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-09-21 21:08 UTC
**Final Status**: Completed
**Branch**: `feature/task.136.shell-fn-probe-entry-form`
**PR**: https://github.com/Gamaroff/agent-skills/pull/462
**QA Iterations**: 3 (gate 1 CONCERNS → fix; gate 2 CONCERNS → fix; gate 3 CONCERNS with no open finding → 5c review-pr CONCERNS → Step 7)
**DoD Summary**: `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.dod.1.shell-fn-probe-entry-form.md`
**Tracker debt**: none

### Completion Summary

Implemented the `shell-fn:<path>#<function>` entry form and the `--fake-gh <dir>` affordance for `security-probe.mjs`: a sourced library is now executed — sourced under an EXIT trap, its function called in a subshell with the library's errexit restored, the case input as argv, rc files off — under bash and zsh, with reserved exits 97/98 folding into one named `entry-not-probeable` decline and the function's own 97/98 re-mapped to 99 and scored; a `gh`-consulting function is answered by a fixture `gh` on `PATH` (armed by `FAKE_GH=1`, validated before anything spawns, recorded as `fake_gh`), and a `gh`-naming library run without the fixture is a named `needs-fake-gh` decline rather than a scored passthrough. The finalise security gate now counts real executions for `gh-labels.sh#gh_labels_filter` — `engages`, 20/20 under both shells, 0 escapes — the boundary class that forced a human override on task.125 (obs #138). 16 test rows, every new branch mutation-proven (22 mutants across develop, qa-fix and QA); the rule's header signal stated once with four citing sites under an extended, mutation-proved pin. Three QA cycles: cycle 1 found `--fake-gh` recorded on a JS entry the runner ignored (fixed: declined); cycle 2's refute pass found a top-level `exit` in the library ending the harness before the sentinel and `set -e` skipping the remap (fixed: EXIT trap + errexit snapshot); cycle 3 recorded three medium-confidence limits for a follow-up. Notable decisions: the label-shaped cases file as the one `expected` definition (review C1 — the stock corpus expects `"12\n"`); the fixture answers `-q` one-per-line (review I1); `syntax-error.sh` written at test time to keep the ShellCheck lane green; the incidental one-cell fix to the qa-next run template that had `develop` red at `c11d1f49`, committed separately; obs #138's `actioned` deferred to the post-merge step per its own `parked_until`.
