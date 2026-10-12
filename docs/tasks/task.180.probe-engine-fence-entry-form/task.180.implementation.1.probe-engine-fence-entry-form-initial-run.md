# Implementation Report: [Task 180] security-probe: a fence: entry form for a fenced bash block in a step doc

**Task**: `task.180.probe-engine-fence-entry-form.md`
**Run Number**: 1
**Started**: 2026-10-12 15:12
**Status**: Escalated

---

## Summary

Add the `fence:<doc>#<heading>` entry form (with `--slot` and an optional per-case `fixture`) to `security-probe.mjs`, route every entry-form list to it, and prove it on task.167's 13 cases — dispatched autonomously by `/develop-next` (task-registry fallback).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #560 (GitHub)                                                              |
| Board status        | In Progress ✅ (already)                                                   |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.180.*` exists in git                             | Branch created at `9865b20a` | —                    | 2026-10-12T13:12Z |
| 2. review-task             | ✅ Done    | `task.180.review.{N}.{name}.md` exists (or skip logged)               | review.1 — 8/10 after fixes, READY; Planned → Ready for Development | — | 2026-10-12T13:16Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + map); 2 iterations of the fast gate — iter 1: 2 lint failures in new prose, fixed; iter 2: 5377 pass, 0 fail | — | 2026-10-12T13:46Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #637: https://github.com/Gamaroff/agent-skills/pull/637 | — | 2026-10-12T13:48Z |
| 5–6. qa-task / qa-fix loop | ⚠️ Needs Attention — QA loop not converging (HIGH 1, 1, 1, 1, 1, 1; gate 6 FAIL; budget spent) | `task.180.qa.{N}.*.md`; `task.180.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.180.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-12

- Invoked by `/develop-next` (task-registry fallback, T180) with `--defaults` — autonomous run.
- Phase 0 run inline (no 0a-parallel subagents): the file path was given directly; tracker issue #560 read from frontmatter; lite-mode inputs derived from the document by hand.
- Pipeline mode: standard — risk_level absent (risk_ok), phase_count 3 (not < 3), single_module false (engine + 6 routing docs across skills). Source: detector.
- Feature branch base: develop — source: recommended (auto-answered by `--defaults`)
- PR target branch: develop — source: recommended (auto-answered by `--defaults`)
- AskUserQuestion: 0 questions asked (`pipeline-answers.js` questions[] empty; refused[] empty; errors[] empty).
- Effective: runReview true, qaDepth full, reviewPrEffort medium.
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: Planned — Step 2 (`/review-task`) validates and promotes.
- Branch: `feature/task.180.probe-engine-fence-entry-form` from `develop` @ `9865b20a`, pushed with tracking. Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment → posted; GitHub board: work-started → already (In Progress); Priority already P2 Medium — no write.
- Review: `/review-task` run (Planned, no report). Output format auto-answered "Comprehensive report"; Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete" — pipeline proceeds autonomously.
- Review report: docs/tasks/task.180.probe-engine-fence-entry-form/task.180.review.1.probe-engine-fence-entry-form.md — 1 Critical (C1: slot value is spliced into script source, a `$(…)` input runs — executed), 2 Important (I1: task.167's 13 cases absent from this checkout, reconstruct from its DoD; I2: heading scan must skip fenced content), 2 Optional. All applied to the task and plan; `reviewed_blob` stamped.
- Pre-pass: two Explore subagents — B drift (2 low), C not-implemented.
- Planned promoted to Ready for Development by review-task.
- Tracker key unchanged at Step 2 (#560) — no work-started re-fire.
- Review outcome comment skipped — review-task reported posted (stage review-task).

### Step 3 — Develop

- Pre-develop surface map: 13 files identified in shared/resources (engine, corpus, signals, 3 routing docs, 2 test files, fixture) and skills/{qa-task,qa-story,review-security} — mapped **inline**, not by an Explore subagent: the task names every file with line anchors, and review Step 2 read every anchor (independence loss recorded).
- Plan file found: docs/tasks/task.180.probe-engine-fence-entry-form/task.180.plan.probe-engine-fence-entry-form.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: plan file names every hunk and the surface map was recorded; the Task Completion Checklist post-conditions are discharged below.
- Fast-gate precondition: `npm run ci:fast` resolves (`develop.fastGateCommand` unset → suggested value) — ok.
- `--fake-gh` decision (plan Phase 2 item 5): **fence: accepts `--fake-gh`** — the block runs under a shell and consults PATH, so it gets the shell family's trip-wire `gh` when no fixture is given and a run that reaches `gh` is declined `needs-fake-gh`. The pre-spawn `namesGh` text detector is **not** applied to fence: — it would read the whole Markdown doc; the run-time trip-wire is the guarantee. The `--fake-gh` refusal message now lists `fence:` among the shell forms.
- Fixture env: `HOME`, `TMPDIR` and `LC_ALL` in `fixture.env` are **declined** (`fixtureProblem`), and the sandbox values are also applied last — the task said "never replaces"; a decline names the mistake instead of silently overriding it.
- Each shell gets a **fresh case directory**, so one shell's side effect (task.167's `PWNED`) cannot leak into the next shell's run.
- The script runs as `<shell> <script>` (rc files off), not `bash <script>` under each shell as the `shell:` arm does: a step doc's block is pasted into the reader's own shell, so the zsh run is the block under zsh.
- npm writes its debug log, update-notifier stamp and Node compile cache to HOME/TMPDIR, which the engine correctly reports as escapes. The task.167 fixture turns them off per case (`npm_config_logs_max=0`, `npm_config_update_notifier=false`, `NODE_DISABLE_COMPILE_CACHE=1`) — a case-design fact, not an engine change.
- Added a routing parity test (`every site that routes a non-JS entry names the fence: form too`) by extracting the cli: test's population into a shared `routingBlocks()` helper — it holds the Migration criterion mechanically. Mutation: qa-task/SKILL.md reverted to HEAD → red naming that block; restored.
- "A launch failure scores errored" (Phase 1) is covered by the **timeout** arm (`sleep 5`, `timeoutMs: 300` → errored, folded to `entry-not-probeable`): the engine writes the script itself, so bash failing to *open* it is not a state a test can reach; `isLaunchFailure` keeps its own unit tests.
- Proof: 13 reconstructed task.167 cases against the shipped block → `engages`, executed 13 (bash; no zsh on this host), reproduced 0, escapes 0; the copy without `--loglevel=notice` over-blocks exactly `defined-env-silent`, `defined-npmrc-silent`, `defined-env-and-npmrc-silent`, `defined-compound-silent` — the four task.167's DoD names.
- Mutation proofs (task § 8 + review I2), each run with the named test and the source restored by `cp`:
  - M1 extraction ignores the heading (`() => true`) → `extraction takes the block under THIS heading` red: `AssertionError: the block under the second heading ran — + [] - [ 'f.ok@bash' ]`
  - M2 replacer becomes a replacement string → `the slot replacement is a function` red: `outcome "rejected", detail: stdout "a<slot>b" ≠ "a$&b"`
  - M3 `fixture.files` path check removed → `fixture env and files reach the block` red: `assert.ok(escape.cases.every((c) => c.outcome === "errored"))` falsy
  - M4 headings read inside fences → `a heading-shaped # comment inside a fence` red: `heading "Gate" is ambiguous — it appears at lines 4 and 8`
- Code quality: `lint:shell` clean (89 scripts); `quick_validate.py` ✓ for qa-task, qa-story, review-security, finalise (`npm run validate` takes one directory, so run per skill); `generate-catalog` leaves the catalog unchanged; `bundle:check` 0 problems (129 skills).
- Routing population re-measured (`git grep -ln 'cli:<path\|cli:path\|`cli:`' -- 'shared/resources/*.md' 'skills/*/SKILL.md'` → 6 files, plus `probe-boundary-signals.mjs`): every one names `fence:`.
- `probe-boundary-rule.md` §1 gains the stated exception (fence: puts input into block source) and §5 becomes five forms, with the "prose, not a script" rule.
- Loop audit run inline as a deterministic count (status, `[x]`/total in § 6, `git log -1`) — no Explore dispatch: {"status":"Ready for Review","completed":15,"total":15}. Exit loop after iteration 1.
- Change Log: one develop row written by the inline path (`/develop` did not run).
- Development completion comment posted to github issue 560.

### Step 4 — Create PR

- SCOPE_PATHS: docs/tasks/task.180.probe-engine-fence-entry-form, CHANGELOG.md, shared/resources, shared/resources/tests, skills/finalise/references, skills/qa-story/references, skills/qa-story, skills/qa-task/references, skills/qa-task, skills/review-security/references, skills/review-security. Pre-flight guard held nothing (every untracked path in scope). Report and review links checked (0 relative links each).
- Base branch pre-supplied: develop — /create-pr prompt skipped. Committed via /commit-changes in two commits: `f802999e` feat(security-probe) and `a318b134` docs(task.180); the pre-commit hook re-bundled with every skill in sync. Leak check OK.
- PR body composed from this implementation record rather than the diff-summariser subagent — the change was authored in this run, and the record is the more precise source.
- PR created: https://github.com/Gamaroff/agent-skills/pull/637 (state OPEN). Issue #560: in-review comment posted. GitHub board: in-review → stage-disabled.
- Lock pr_url written; develop-next run state prNumber = 637.

### Steps 5–6 — QA loop

- Traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE=false (Success Criteria are checklists, derived inline). QA-start board re-assert: in-review → stage-disabled.
- QA Cycle 1 — gate FAIL 70/100 (1 HIGH reproduced by QA, 1 MEDIUM, 1 LOW). Security: 26 engine probes, 0 reproduced, recorded in `task.180.qa.1.security.run.json`.
- QA Cycle 1 — changes-requested: stage-disabled. Narrowing offer: false (below-cycle-floor).
- qa-fix cycle 1: Step 1a findings ingester run inline — the gate was written in this session and no PR-review report exists (`pr-review-current` none); no independence lost on facts, only on reading.
- QA Cycle 2 — refute pass + safety re-probe (clause 2 by judgement); reviewer 306.7 s. Gate FAIL 60. changes-requested: stage-disabled. Narrowing offer: false (HIGH not 0).
- Pre-strike shape named at cycle 2: both HIGHs sit in runFenceCase's outcome scoring (a mechanism this branch created). Move taken early: **replace** the branch chain with one ordered scorer, rather than a third patch.
- Post-fix PR state check done inline (`gh pr view` → OPEN @ bdbedcdf) rather than through the poller subagent.
- QA Cycle 3 — safety re-probe (reviewer 252.5 s); gate FAIL 70. Convergence check (awk count over gates 1–3): HIGH 1, 1, 1 → trips at cycle 3. 5b not run.
- QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk (gates 1–3 on disk, 3 `### QA Cycle` entries). `qa_max_cycles` = 5.
- Re-entry phase corrected 5a → 5b by hand (`set-qa-phase.sh 5b`): `grant-qa-cycles.sh` compares `halt_reason` to exactly `not-converging`. This snapshot's reason has detail appended, so the script printed `reenter_at=5a`. Gate 3's fix never ran, so the resume contract's re-entry point is 5b. Logged as observation #17.
- QA Cycle 3 (resumed at 5b) — changes-requested: stage-disabled. Narrowing offer: false (high-findings-remain).
- Third strike: `shared/resources/security-probe.mjs` carries a HIGH in gates 1, 2 and 3. Struck mechanism, read from TASK-180-001/-009 (and the gate-2 widening TASK-180-005): **classifying a non-zero fence exit as errored by pattern-matching shell stderr** (`isShellParseFailure` → `shellDiagnostic`, read by `scoreFenceRun`). Passed to `/qa-fix` as delete / replace / waive only.
- qa-fix cycle 3: findings read inline. No ingester subagent: the gate has 3 findings, and `pr-review-current` → none. Gate 3's `recommendations.immediate` asked for a human decision on the verdict model. User chose **replace**: `<shell> -n` parse check plus a required `expected` on hostile `fence:` cases (AskUserQuestion, 2026-10-12).
- qa-fix cycle 3 premise check: `bash -n` (GNU bash 5.3.15) executed nothing (`touch` not run). It exit 2 on `X="a"b"` and exit 0 on `${x:?boom}`. zsh is not installed on this host, so `zsh -f -n` is **unverified** locally.
- qa-fix cycle 3: fast gate `ci:fast` with the `.agents/skills` symlink moved aside: 5402 tests, 5388 pass, 0 fail. `bundle:check` 0 problems. Five mutations each went red: decline removed, stderr rule re-added, parse check removed, raw collision compare, work-dir watch removed.
- QA loop re-entry (cycle 4 escalation): 1 extra cycle granted (user's choice); 0 cycle(s) run outside the loop back-filled from disk (gates 1–4 on disk, 4 `### QA Cycle` entries). `qa_max_cycles` = 5 (unchanged — the script never lowers it).
- Re-entry phase corrected 5a → 5b by hand again (`set-qa-phase.sh 5b`): same cause as at cycle 3 (observation #17 — `halt_reason` carries appended detail). Gate 4's fix never ran, so 5b fixes gate 4 and the granted cycle is QA cycle 5.
- QA Cycle 4 (resumed at 5b) — changes-requested: stage-disabled. Narrowing offer: false (high-findings-remain).
- Fourth strike on `shared/resources/security-probe.mjs` (gates 2, 3, 4). Struck mechanism: inferring a guard's refusal from a fence run's exit status. User's instruction for this cycle: **apply the gate's one-rule tightening** of the cycle-3 replace model — a hostile `fence:` case's `expected` must carry a non-empty stdout or stderr, else declined (TASK-180-012) — and fix TASK-180-013 and -014 in the same pass. Recorded as a refinement of the user-chosen model, not a fifth mechanism.
- qa-fix cycle 4: findings read inline (3 findings; `pr-review-current` → none). Post-fix PR state check inline (`gh pr view` → OPEN @ f21c0552). Counter 4 < `qa_max_cycles` 5 → QA cycle 5, the granted cycle. Traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE=false.
- QA Cycle 5 — safety re-probe (clause 2: gate 4 HIGH on a boundary), reviewer 273.2 s; gate FAIL 70. CR-1 kept at the reviewer's HIGH although measured plausibility is 0 shipped docs: the author of the fixes does not re-rate the finding that decides the last cycle. Convergence check (gates 3–5): HIGH 1, 1, 1 → trips; budget also spent (cycle 5 of 5). 5b not run.
- QA loop re-entry (cycle 5 escalation): 1 extra cycle granted (user: "go ahead"); 0 cycles back-filled (gates 1–5, 5 entries). `qa_max_cycles` = 6. Re-entry corrected 5a → 5b by hand (observation #17 again).
- QA Cycle 5 (resumed at 5b) — changes-requested: stage-disabled. Third strike fires on `security-probe.mjs` (gates 3–5); the struck mechanism is refusal scoring (gates 3–4). TASK-180-015/-016 are sandbox containment, a different mechanism, so they are fixed as usual (obs #98 rule).
- qa-fix cycle 5: findings read inline (2 open; `pr-review-current` → none). Post-fix PR state inline (`gh pr view` → OPEN @ 243bc237). Counter 5 < `qa_max_cycles` 6 → QA cycle 6.
- QA Cycle 6 — safety re-probe (clause 2), reviewer 290.3 s; gate FAIL 70. Convergence check (gates 4–6): HIGH 1, 1, 1 → trips; budget spent (cycle 6 of 6). 5b not run.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._
- **QA cycle 3 gate heredoc was unquoted**: backticks in the finding text ran as command substitutions (only "command not found" — no side effects) and truncated one finding; repaired from the reviewer's text before commit.
- **QA loop not converging (cycle 3)** — escalated; see QA Iteration History § QA Loop Not Converging.
- **QA loop not converging (cycle 6)** — escalated after a second 1-cycle grant; see QA Iteration History § QA Loop Not Converging (cycle 6).
- **QA loop not converging (cycle 5)** — escalated after the 1-cycle grant; see QA Iteration History § QA Loop Not Converging (cycle 5).
- **qa-fix cycle 4 fast gate attempt 1 red**: `bundle --check` found a stale bundled `probe-boundary-rule.md` (edited after `npm run bundle`). Rebundled; attempt 2 green.

- **Fast gate iter 1 — 2 failures (triaged real by an Explore subagent):** (1) `probes-executed-population` lint — the new `fence:` paragraph in `probe-boundary-rule.md` named a `probes_executed` count with no run record nearby; reworded to "probed zero times by the engine". (2) `bundle-comment-origin` lint — the new `routingBlocks()` JSDoc carried a comment-only `shared/resources/<file>.md` reference; reworded. A first draft of that JSDoc also wrote `skills/*/SKILL.md`, whose `*/` closed the comment (prettier caught it). Iter 2: 5377 pass, 0 fail.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-12
**Gate Result**: FAIL
**Issues Found**: 3 — TASK-180-001 (HIGH, reproduced: a substitution that breaks the block's shell syntax is scored as a refusal, so an accept-all block scores engages), TASK-180-002 (MEDIUM: fence: control key ignores slot and name; slot not recorded), TASK-180-003 (LOW: empty --slot passes main()). Advisory cleanups CR-4, CR-5.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: TASK-180-001 — isShellParseFailure scores an unparseable substituted block errored (stderr-first detail, CR-4); TASK-180-002 — record carries slot, fence: control keyed on --name else slot; TASK-180-003 — empty --slot exits 2; CR-5 length asserts. Each fix mutation-proven (F1–F4 red). Exit-rule clause restated at 5 fence: sites + CHANGELOG + task doc (Probe population 5, move: patch). Fast gate attempt 1 green (5380/0).
**Commit**: `bdbedcdf`

### QA Cycle 2 — 2026-10-12
**Gate Result**: FAIL
**Issues Found**: 5 — TASK-180-004 (HIGH: expected.absent can name a file the case's own fixture writes → every hostile case accepted), TASK-180-005 (MEDIUM: shell diagnostics other than a parse error read as a refusal), TASK-180-006 (MEDIUM: parse-failure branch masks a reproduced side effect), TASK-180-007 (LOW: declined run loses slot), TASK-180-008 (LOW: CRLF). CR-5 pre-existing → future; CR-7 → future.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: structural move — runFenceCase's scoring replaced by one ordered scoreFenceRun (absent-first, shellDiagnostic widened to every shell error about the script); TASK-180-004 collision decline; -007 slot on decline; -008 CRLF; CR-7 signal wording. Mutations G1–G5 red. Fast gate attempt 1 green (5385/0). Doc population (phrase 'unparseable'): 5 fence sites + CHANGELOG + task doc updated, 9 unrelated hits unaffected.
**Commit**: `fcbbe9d9`

### QA Cycle 3 — 2026-10-12
**Gate Result**: FAIL
**Issues Found**: 3 — TASK-180-009 (HIGH: cycle 2's widened shellDiagnostic treats non-fatal errors after a guard as "the guard never answered" → false engages on the unquoted word-split shape), TASK-180-010 (MEDIUM: collision decline compares raw paths), TASK-180-011 (LOW: writes beside the case dir under the work dir are not observed).
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging
**Re-entry**: 2 extra cycles granted (`qa_max_cycles` 5), re-entered at 5b on gate 3
**Fixes Applied**: third strike, move **replace** (user's choice). The stderr classifier (`shellDiagnostic`) is deleted. `parseCheck` (`<shell> -n`) decides errored. A hostile `fence:` case with no `expected` is declined. Also -010 (normalised, case-folded collision) and -011 (work-dir writes are escapes). 5 mutations red. `ci:fast` 5402 tests, 5388 pass, 0 fail. Doc population 7: 6 updated, 1 unaffected. PR comment and issue comment (`qa-fix-3`) posted.
**Commit**: `1a31af72`

### QA Loop Not Converging — 2026-10-12

The pipeline stopped after 3 qa-task/qa-fix cycles: the HIGH finding
count failed to strictly decrease across two consecutive cycles, so the
loop was no longer converging. The remaining findings are NOT accepted —
they are handed over below.

**Final gate status**: FAIL (gate 3, 70/100)
**HIGH findings per cycle**: 1, 1, 1 — flat from cycle 1 onward
**Remaining issues** (from final gate file):
- TASK-180-009 — high — `shared/resources/security-probe.mjs` — shellDiagnostic counts non-fatal shell errors that occur after a guard let a hostile input through as "the guard never answered", so a guard that word-splits an unquoted input scores engages.
- TASK-180-010 — medium — `shared/resources/security-probe.mjs` — the expected.absent / fixture.files collision decline compares raw strings (`./pwned`, `b/../pwned`, case-only on case-insensitive filesystems).
- TASK-180-011 — low — `shared/resources/probe-boundary-rule.md` — writes beside the case dir under the work dir are not observed, though the docs call them escapes.

**What was attempted per cycle**:
- Cycle 1: parse failures of the substituted block scored errored; fence: control keyed on --name else slot; empty --slot exits 2 (`bdbedcdf`).
- Cycle 2: structural move — runFenceCase's scoring replaced by one ordered scoreFenceRun; shellDiagnostic widened to every shell error about the script; collision decline; slot on decline; CRLF (`fcbbe9d9`).
- Cycle 3: not fixed — the convergence check tripped.

**Likely root cause**: every HIGH sits in one design decision — inferring a guard's refusal from the exit status of a block whose slot is source-substituted. Each fix narrowed or widened the "could not look" class, and each move created the opposite error: cycle 1 left other fatal diagnostics as refusals, cycle 2's widening swallowed non-fatal errors after the guard. Exit status cannot tell "the guard refused" from "the input broke the block" without the case saying what a refusal looks like. The file the fixes kept circling is `shared/resources/security-probe.mjs`, mechanism `scoreFenceRun`/`shellDiagnostic`.

**Recommended next steps**:
1. Decide the fence: verdict model: (a) require `expected` on hostile fence: cases (the guard's own refusal output), declining a hostile case without one — the robust option; or (b) narrow `errored` to diagnostics that stop the shell before any line runs (syntax error, unexpected EOF, `${x:?}`/unbound) and let a mismatched `expected` outrank any diagnostic.
2. Then re-run /develop-task (Phase 0b offers "Resume at 5a with {k} more cycles"); fix TASK-180-010/011 in the same pass.
3. The task.167 proof (13 cases, engages, the 4-case over-block discrimination) holds at every cycle and is unaffected by either option.


### QA Cycle 4 — 2026-10-12
**Gate Result**: FAIL
**Issues Found**: 3. TASK-180-012 (HIGH): the required hostile `expected` accepts `{exit: 1}` alone, so `${x:?}` or an injected exit passes for a refusal and an accept-all block reads engages. TASK-180-013 (MEDIUM): the work-dir watch misses deletions (the gh trip-wire) and empty directories. TASK-180-014 (LOW): Success Criterion 1 is stale. CR-3 (no GIT_CEILING_DIRECTORIES) is pre-existing and goes to future.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging
**Re-entry**: 1 extra cycle granted (`qa_max_cycles` 5), re-entered at 5b on gate 4
**Fixes Applied**: fourth strike, move **replace (refinement, user-chosen)**: a hostile `fence:` case whose `expected` has no non-blank stdout or stderr is declined by name, never scored (TASK-180-012). Work-dir watch lists directories and compares both ways (TASK-180-013). SC1 cites `scoreFenceRun` (TASK-180-014). 3 mutations red. `ci:fast` attempt 1 red (stale bundled `probe-boundary-rule.md`, edited after the bundle), attempt 2 green: 5404 tests, 5390 pass, 0 fail. Doc population 5 + CHANGELOG + task doc, all updated. PR comment and issue comment (`qa-fix-4`) posted.
**Commit**: `f21c0552`

### QA Loop Not Converging (cycle 4) — 2026-10-12

The pipeline stopped after 4 qa-task/qa-fix cycles, the 4th run on a 2-cycle grant. The HIGH finding
count failed to strictly decrease across two consecutive cycles, so the loop was no longer
converging. The remaining findings are NOT accepted. They are handed over below. One granted cycle
is unused.

**Final gate status**: FAIL (70/100), gate 4
**HIGH findings per cycle**: 1, 1, 1, 1 (flat from cycle 1 onward)
**Remaining issues** (from gate 4):
- TASK-180-012, high, `shared/resources/security-probe.mjs`: an exit-only `expected` on a hostile fence: case passes for a refusal (bug 6).
- TASK-180-013, medium, `shared/resources/security-probe.mjs`: the work-dir watch misses deletions and empty directories (bug 7).
- TASK-180-014, low, the task doc: Success Criterion 1 restates the old exit-status rule.

**What was attempted per cycle**:
- Cycle 1: parse failures scored errored; control key; empty --slot (`bdbedcdf`).
- Cycle 2: one ordered scoreFenceRun; widened shellDiagnostic; collision decline; slot on decline; CRLF (`fcbbe9d9`).
- Cycle 3, after the grant: third-strike replace, chosen by the user. The stderr classifier was deleted, a `<shell> -n` parse check added, and `expected` made required on hostile cases. Collision normalised; work-dir watch added (`1a31af72`).
- Cycle 4: not fixed. The convergence check tripped.

**Likely root cause**: each cycle's HIGH is a different hole, but all of them are the same question: what tells a guard that refused apart from a block that did not answer? Cycle 3 moved that judgement to the case author through `expected`. The engine accepts any `expected`, though, including one (`{exit: 1}`) that cannot make the distinction either. The fix the gate names is a one-rule tightening (a hostile `expected` must carry non-empty stdout or stderr). That is a refinement of the user-chosen model, not a fifth mechanism. It does make a silent guard (exit 1, no output) unprobeable by design.

**Recommended next steps**:
1. Apply TASK-180-012 as the gate states: decline a hostile fence: case whose `expected` has no non-empty stdout or stderr. Update ADMIT_CASES and the Admit fixture block to print a refusal. Then use the 1 remaining granted cycle (re-run /develop-task; Phase 0b offers "Resume at 5a with {k} more cycles").
2. Fix TASK-180-013 in the same pass: compare the snapshots both ways and include directories.
3. Reword Success Criterion 1 to cite `scoreFenceRun` (TASK-180-014). CR-3 (GIT_CEILING_DIRECTORIES) is a separate follow-up for every shell-family form.


### QA Cycle 5 — 2026-10-12
**Gate Result**: FAIL
**Issues Found**: 3. TASK-180-015 (HIGH): `fence:` skips the pre-spawn `gh` text check, so a block that resolves `gh` to a path runs the host binary and is scored. TASK-180-016 (MEDIUM): a substituted `$(…)` that writes to an absolute path outside the sandbox is unseen. CR-3 (LOW, advisory): a short slot rewrites guard code. The cycle-4 fixes hold: TASK-180-012, -013 and -014 fixed; bugs 6 and 7 closed; 4 QA mutations covered.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging
**Re-entry**: 1 extra cycle granted (`qa_max_cycles` 6), re-entered at 5b on gate 5
**Fixes Applied**: TASK-180-015: `fence:` runs the `gh` text check (`namesGh` with a `text` argument) over the extracted block and every case input, and declines `needs-fake-gh` before any spawn. TASK-180-016: the outside-write limit is stated in the engine header, probe-boundary-rule.md §5, the task doc and CHANGELOG, and pinned by a test. 2 mutations red. `ci:fast` attempt 1 green: 5404+2 = 5406 tests, 5392 pass, 0 fail. PR comment and issue comment (`qa-fix-5`) posted.
**Commit**: `243bc237`

### QA Loop Not Converging (cycle 5) — 2026-10-12

The pipeline stopped after 5 qa-task/qa-fix cycles: the HIGH finding count failed to strictly
decrease across two consecutive cycles, so the loop was no longer converging. The remaining findings
are NOT accepted — they are handed over below. The QA budget (`qa_max_cycles` 5) is also spent.

**Final gate status**: FAIL (70/100), gate 5
**HIGH findings per cycle**: 1, 1, 1, 1, 1 (flat from cycle 1 onward)
**Remaining issues** (from gate 5):
- TASK-180-015, high, `shared/resources/security-probe.mjs`: `fence:` skips the `namesGh` pre-spawn check; a path-resolved `gh` (`type -ap gh`) runs the host binary and the run is scored (bug 8). Measured plausibility: 0 shipped docs resolve `gh` to a path. Severity kept as the reviewer returned it.
- TASK-180-016, medium, `shared/resources/security-probe.mjs`: an injected `$(…)` that writes outside the sandbox is unseen, contrary to probe-boundary-rule.md §5 (bug 9).

**What was attempted per cycle**:
- Cycle 1: parse failures scored errored; control key; empty --slot (`bdbedcdf`).
- Cycle 2: one ordered scoreFenceRun; widened shellDiagnostic; collision decline; slot on decline; CRLF (`fcbbe9d9`).
- Cycle 3: third-strike replace, chosen by the user: `<shell> -n` parse check, required hostile `expected`, normalised collision, work-dir watch (`1a31af72`).
- Cycle 4: the user's one-rule tightening: a hostile `expected` must state a non-empty stdout or stderr; the watch compares both ways with directories; SC1 cites `scoreFenceRun` (`f21c0552`).
- Cycle 5: not fixed. The convergence check tripped and the budget is spent.

**Likely root cause**: the scoring mechanism has stopped producing findings. Cycles 1–4 circled how a refusal is scored, and that question closed at cycle 4: the cycle-4 fixes hold. Cycle 5's HIGH is a different mechanism in the same file: sandbox containment of what a source-substituted block can reach (the host `gh`, an absolute path). `fence:` runs its input as script source, which no other entry form does. So each safety re-probe of the whole surface finds the next containment gap the shell forms never had to close. The HIGH count stays flat because each cycle's re-probe finds a new gap, not because fixes are failing.

**Recommended next steps**:
1. Fix TASK-180-015 as the gate states: run `GH_COMMAND_WORD` / `GH_VARIABLE` over the extracted block text when `fakeGhDir` is null, and add a `type -ap gh` regression test. It is a small, contained change.
2. Fix TASK-180-016 by stating the limit: an absolute-path write outside the sandbox is not observed under `fence:`. Put it in the engine header and probe-boundary-rule.md §5, in place of "a write anywhere else is an escape".
3. Then grant one more cycle (re-run /develop-task; Phase 0b offers "Resume at 5a with {k} more cycles"). Or, if the containment limits are judged acceptable, waive TASK-180-015 with its measured plausibility (0 shipped docs) and proceed to /finalise.

### QA Cycle 6 — 2026-10-12
**Gate Result**: FAIL
**Issues Found**: 2. TASK-180-017 (HIGH): the `gh` text check misses what a case fixture runs; a `BASH_ENV` fixture resolves the host `gh`. TASK-180-018 (MEDIUM): a kill after a side effect scores `errored` before `expected.absent` is checked. The cycle-5 fixes hold: TASK-180-015 and -016 fixed; bugs 8 and 9 closed; 2 QA mutations covered.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

### QA Loop Not Converging (cycle 6) — 2026-10-12

The pipeline stopped after 6 qa-task/qa-fix cycles: the HIGH finding count failed to strictly
decrease across two consecutive cycles. The remaining findings are NOT accepted — they are handed
over below. The QA budget (`qa_max_cycles` 6) is also spent.

**Final gate status**: FAIL (70/100), gate 6
**HIGH findings per cycle**: 1, 1, 1, 1, 1, 1 (flat from cycle 1 onward)
**Remaining issues** (from gate 6):
- TASK-180-017, high, `shared/resources/security-probe.mjs`: the `gh` text check misses fixture content and fixture-relative sources; the host `gh` is reachable (bug 10).
- TASK-180-018, medium, `shared/resources/security-probe.mjs`: a killed or timed-out run scores `errored` before `expected.absent` is checked (bug 11).

**What was attempted per cycle**:
- Cycles 1–4: refusal scoring, closed at cycle 4 (`bdbedcdf`, `fcbbe9d9`, `1a31af72`, `f21c0552`).
- Cycle 5: `gh` text check over the block and inputs; outside-write limit stated (`243bc237`).
- Cycle 6: not fixed. The convergence check tripped and the budget is spent.

**Likely root cause**: cycles 5 and 6 found the same class twice: a text check that enumerates what will run. Cycle 5 added the block and the inputs; cycle 6 found the fixture, and the next would find a sourced file outside the case or an `eval` of an env value. The enumeration cannot be completed, because under `fence:` everything a case carries can run. That is a third strike in substance on the containment mechanism. Per the third-strike rule, the next move is to replace it, not patch it again.

**Recommended next steps**:
1. Replace the text-check enumeration for `fence:` with one structural guard: build each case's `PATH` from the host `PATH` minus every directory that holds a `gh` executable, keeping the trip-wire first. `type -ap gh` and `command -v gh` then find only the stub, whatever the block, input or fixture says. An absolute path stays the stated limit. Keep or drop the text check as a fast path.
2. Fix TASK-180-018 in the same pass: check `expected.absent` before step 1 of `scoreFenceRun`.
3. Then grant one more cycle (re-run /develop-task), or waive with the measured plausibility (0 shipped docs resolve `gh` to a path) and proceed to /finalise.

---

## Completion

**Finished**: {populated at end}
**Final Status**: Escalated — QA loop not converging at cycle 6 (after grants of 2, 1 and 1 cycles; budget spent)
**Branch**: feature/task.180.probe-engine-fence-entry-form
**PR**: https://github.com/Gamaroff/agent-skills/pull/637
**QA Iterations**: 6 (5 fix cycles)
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
