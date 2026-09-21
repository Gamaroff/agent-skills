# Implementation Report: A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Task**: `task.136.shell-fn-probe-entry-form.md`
**Run Number**: 1
**Started**: 2026-09-21 19:35
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.136.qa.{N}.*.md`; `task.136.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.136.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

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

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.136.shell-fn-probe-entry-form`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
