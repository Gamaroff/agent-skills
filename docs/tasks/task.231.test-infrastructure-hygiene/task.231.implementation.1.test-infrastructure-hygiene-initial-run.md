# Implementation Report: Test infrastructure hygiene

**Task**: `task.231.test-infrastructure-hygiene.md`
**Run Number**: 1
**Started**: 2026-10-26 05:37
**Status**: Completed

---

## Summary

Contain and ratchet test temp-dir leaks, make the observation-log resolver tests worktree-safe, add `#anchor` checking to `doc-links.js`, and accept block-owned waits in the dispatch-wait parity test (observations #83, #39, #80, #62).

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
| Board status        | work-started → transitioned ✅ (issue #741)                                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.231.*` exists in git                              | Branch created at `d44cd59f` | —                    | 2026-10-26T05:38Z |
| 2. review-task             | ✅ Done    | `task.231.review.{N}.{name}.md` exists (or skip logged)                | `task.231.review.1.test-infrastructure-hygiene.md` — READY TO IMPLEMENT 8/10; 3 Important fixed | —                    | 2026-10-26T05:40Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 22/22; npm test 0 fail, ratchet ok; 5 mutation proofs held | —                    | 2026-10-26T06:21Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #752: https://github.com/Gamaroff/agent-skills/pull/752 | —                    | 2026-10-26T06:22Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.231.qa.{N}.*.md`; `task.231.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 5 QA cycles; gate 5 PASS 95/100; 5c review-pr ✅ APPROVE (`task.231.pr-review.1.test-infrastructure-hygiene.md`) | —                    | 2026-10-26T08:22Z |
| 7. finalise                | ✅ Done    | `task.231.dod.{N}.*.md`; task `status: accepted`                       | `task.231.dod.1.test-infrastructure-hygiene.md` — ACCEPTED; acceptance commit `987f7dcb`; issue #741 closed | —                    | 2026-10-26T08:26Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-26T08:31Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-26

- Invoked by `/develop-next` (AUTONOMOUS RUN) with `--defaults`; selected from the task-registry fallback (no actionable roadmap row).
- Feature branch base: develop — source: recommended (`--defaults`, `pipeline-answers.js`)
- PR target branch: develop — source: recommended (`--defaults`, `pipeline-answers.js`)
- Mode: standard — source: detector (risk_level absent, phase_count 6, single_module false → standard)
- Skips: none; refused: none; questions asked: 0 (all resolved by `--defaults`)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel agents dispatched): document path given directly; lite-mode inputs derived from the document; always-load files from `skills-config.yaml` `devLoadAlwaysFiles` (3 files, all present).
- Task status at start: `planned` — Step 2 (`/review-task`) validates and promotes it.
- Tracker: GitHub, issue #741.
- Branch: `feature/task.231.test-infrastructure-hygiene` from `develop` @ `d44cd59f`, pushed. Report stashed before branch creation and restored after.
- Tracker comment work-started: posted. GitHub board: work-started → transitioned. Priority-default block not run (issue already carries Priority Medium from create-task).

### Step 2 — review-task — 2026-10-26

- Gate: status `Planned`, no review report → ran `/review-task` (output format auto-answered: Comprehensive report).
- Pre-pass: Agent B `aligned` (axes from `prepass-axes.js`, source `architecture`; 4 low findings); Agent C `not-implemented`. Both returned in under 15 s.
- Question points: none raised (autonomous run; each finding had one code-supported fix).
- Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete → `Planned` → `Ready for Development`.
- Review report: `docs/tasks/task.231.test-infrastructure-hygiene/task.231.review.1.test-infrastructure-hygiene.md` (`reviewed_blob` written).
- Fixes: I1 two tests read `scripts.test` (`shell-suite-guard`, `test-runner-reach`) → move to `test:suite`; I2 same-file `#x` dropped by `NOT_RELATIVE_RE` before `checkFile` → separate extraction pass; I3 traps.md:86 and tech-stack.md:56 doc sweep.
- Tracker key unchanged (#741) — no work-started re-fire. Review outcome comment skipped — `/review-task` reported `posted`.

### Step 3 — develop (iteration 1) — 2026-10-26

- Route: inline implementation (iteration 1; plan file and surface map recorded). Fast gate `ci:fast` resolves.
- **Phase 0 measurement** (`.claude/state/t231-phase0.sh`, branch base `d44cd59f`, `TMPDIR=<fresh ~/.cache dir> npm test`, run twice):

  | Run | rc | secs | top-level entries | paths | prefixes | escaped to /tmp |
  | --- | -- | ---- | ----------------- | ----- | -------- | --------------- |
  | 1 | 1 | 150 | 608 | 10,184 | 104 | 3 |
  | 2 | 1 | 206 | 608 | 10,183 | 104 | 3 |

  - The `{ prefix: count }` maps were identical except one name, `eval-repeat-hang-<6>`: `evals/shared/runner.mjs:87` names its dir `eval-${scenarioName}-` after a scenario whose own name carries `repeat.test.mjs:317`'s `repeat-hang-` suffix. Decision: key the ratchet on **counts**, and strip that inner six-character `mkdtemp`-shaped suffix in `prefixOf` (unit-tested, with `carry-5c-remote` as the real-word control).
  - Both runs' rc 1 was one test, `skills/session-handoff/tests/handoff-verify.test.js:1843` ("obs #1: resolveObservationWorkspace … refusal"). It assumes `os.tmpdir()` is ephemeral, and the measurement's `~/.cache` TMPDIR is not. That is an artefact of the measurement, not a base failure: the wrapper's per-run dir sits under the system tmpdir (`/tmp`), as review O2 predicted. Confirmed by the full wrapper run below.
  - **Escapes traced** (`comm -13` of `/tmp` listings around each run): `pipeline-hold-*` ×2 per run comes from `shared/resources/tests/step-4-leak-check.test.mjs` running Step 4's guard block, which does `mktemp -d /tmp/pipeline-hold-XXXXXX`, a fixed `/tmp` that no TMPDIR reaches. `review-pr-comment.*.md` ×1 comes from `skills/review-pr/tests/review-pr.test.js` Step 8 sandbox, whose `env` omits TMPDIR, so `mktemp -t` fell back to `/tmp`. Both are fixed in the tests: the hold dir is read back from `step4-hold-dir.txt` and removed after the file's tests, and the sandbox passes `TMPDIR: dir`. The shipped blocks are unchanged.
  - **`markdown-link-check@3.15.0` does not detect a dead cross-file fragment** (fixture `other.md#nope` reads ✓); it does catch a same-file `#nope-here`. So the `doc-links.js` CI step is not redundant.
  - `/tmp` before the work: 13% inodes (129,799 / 1,048,576), 5,520 entries (`df -i /tmp`, `ls /tmp | wc -l`).
- **Anchor corpus**: 3,795 tracked `.md` files; 381 fragments checked; **0 dead**. A first pass reported 2, both `skills/develop-next/SKILL.md` → `#find-the-items-merged-pr`. That heading sits inside a list item (`    #### …`), which GitHub renders and anchors, so a 0–3-space ATX rule was a false positive. Decision: accept any indent and blockquoted headings. Over-reading can only let a dead fragment pass; under-reading fails a live one. `KNOWN_ANCHORS` and `KNOWN_ARTIFACT_ANCHORS` are seeded empty from that measurement.
- **Anchor walk scope** — decision: repo-wide, not `docs/` only. Only 6 of the 381 fragments are under `docs/`, so a docs-only walk would hold a non-vacuity floor of six. Floor set at 300.
- **Performance**: a repo-wide `checkDocument` walk took 9.2 s, and 8.7 s of it predates this task: `dirSet(tracked)` rebuilt per call. Memoised per tracked-set object (`WeakMap`), so a fresh `trackedSet()` is a fresh key. The walk now takes 2.7 s.
- **CI step**: `doc-links.js --file` per changed file, full check (the task's wording). Run over the workflow's whole file set (2,926 files), 6 fail, and each is already pinned (`KNOWN`, `KNOWN_ARTIFACT_*`) or is the `docs/examples/architecture/index.md` skeleton that markdown-link-check already flags. The only newly red case is an edit to one of the two pinned open-fence artifacts, which is a defect worth fixing in that edit. `shared/resources/doc-links.js` was added to the workflow's PR paths.
- **Seed run** (wrapper, empty ratchet `{}`): 6,361 tests, 1 fail. 442 entries under 97 prefixes, none from the four fixed helpers. The failure was `qa-read-back.test.mjs:520`: its fixture linked `qa.2.x.md#findings` to a stub with no such heading. That is the new check working on a real consumer. `qa-read-back.js` reads `state` to choose its remedy, so it gained a `no-anchor` remedy, the fixture gained the heading, and a new case holds the halt. `qa-read-back` is the only consumer of `broken[].state` (`git grep checkDocument`). `migrate-doc-numbering.mjs` uses only `extractRelativeLinks`, which is unchanged.
  - One `pipeline-hold-*` still escaped: from `step-8-completion-checklist.test.mjs`, which also runs Step 4's guard (two tests). It is fixed the same way, and calibrated: with the cleanup disabled the file leaks 1, with it 0.
  - The ratchet was written from this run's report (97 prefixes, 442 entries).
- **Decision — `healed` is a notice, not a failure.** CI installs zsh (`test.yml:46`) and this machine has none, so every shell-matrix suite runs a zsh variant on CI only. 14 tests skipped here. A prefix absent from one run is therefore not proof of a fix, and failing on it would make every machine without CI's toolset red. `new` and `over` stay fatal (SC-2 unchanged). The Section 8 healed bullet was rewritten and dated. **Carried to the PR**: CI's zsh variants may leak more of some prefixes than the local seed. Read CI's `tmp-leak:` report and raise those counts to the per-prefix maximum (the over-count case).
- **Worktree run (SC-4)**: `observation-log.test.mjs` in a linked worktree (`.worktrees/t231-obs-check`, detached HEAD plus the changed test file). Base: 4 fail. After the `SCRATCH_ROOT` fix: 1 fail. That remaining failure was "the project-identity default encodes separators as hyphens": the test derived the expected project from `--show-toplevel` (the worktree), but the resolver correctly names the main checkout. Both now use one `mainCheckout()` (the parent of `--git-common-dir`). Result: **56/56 pass in the worktree**, and 56/56 in the main checkout. Worktree removed.
- **Mutation proofs** (`scratchpad/mutate.py`: split/join with a single-match assert, restored from memory, then re-run green):

  | # | Mutation | Mutant | Restored |
  | - | -------- | ------ | -------- |
  | 1 | Wrapper's finally-removal deleted | RED, 7 fail (every "directory is gone" case) | GREEN 13/13 |
  | 2 | Ratchet presence-only (`over` never fires) | RED, 2 fail (over-count, `compareRatchet`) | GREEN 13/13 |
  | 3 | `doc-links.js` fragment branch removed | RED, 2 fail (`#nope` case, tracked-text case) | GREEN 30/30 |
  | 4 | `isWaitMarked` window-only | RED, 1 fail (block-owned case) | GREEN 8/8 |
  | 5 | `mainCheckout` returns `here` | RED (worktree case, project-identity case) | GREEN 56/56 |

  Mutant 1 left 10 `/tmp/agent-skills-test-*` dirs, as a mutant with no removal should. They were removed by name.
- **Verification run** (wrapper, seeded ratchet): **rc 0. 6,362 tests, 6,348 pass, 0 fail, 14 skipped, 247 s.** `tmp-leak: 442 top-level entries under 97 prefixes left by the suite (directory removed)` / `tmp-leak: ratchet ok`. Leftovers 442 ≤ Phase 0's 608 − 160 (the four fixed prefixes) = 448 (SC-3). One `/tmp` entry appeared during the run, `dotsync-test-*`. It is not referenced anywhere in this repository (`git grep dotsync` finds only task.228's prose about the downstream `omarchy-dotsync` repo), so it came from another process. `/tmp` afterwards: 13% inodes.
- `format:check`, `bundle:check` (128 skills, 0 problems) and `lint:shell` (101 scripts, clean) all pass.
- `traps.md`: the suite-list trap now names `test:suite`.
- Step 3 inline — /develop not invoked: the plan file named every mechanism's shape and the surface map located every hunk, so `/develop` would only re-read them. The Task Completion Checklist was satisfied inline: boxes ticked, status set, one `develop` Change Log row, tests run.
- Loop audit iter 1 (Explore): `{"status":"ready-for-review","completed":22,"total":22}`. Loop exited after 1 iteration.
- Development completion comment posted to GitHub issue #741 (`develop-complete`, count=22): `posted`.

### Step 4 — create-pr — 2026-10-26

- SCOPE_PATHS: 26 dirs and files from the scope-derivation block, plus `scripts/test-tmpdir.mjs` added by hand. `scripts/` had no tracked change, so the guard would otherwise have held the new wrapper out of the commit (the block's documented "pass its directory as an extra `--scope`" case).
- Pre-flight guard: nothing held. Report and review link-checked (`doc-links.js`: ok).
- Base pre-supplied: develop. Committed as four logical commits (`1d396d41` wrapper and leak fixes, `38f3bec6` anchors, `34572036` parity and worktree, `ef826cee` docs), with the scope honoured by explicit paths. The leak check over all four commits found no LEAK lines. Pushed.
- PR body written from the run's own evidence (the summariser subagent was not dispatched: every figure is already in this report).
- PR created: https://github.com/Gamaroff/agent-skills/pull/752 (state OPEN). Issue #741 `in-review` comment: `posted`. Board in-review: `stage-disabled`. Lock `pr_url` and develop-next `prNumber` are recorded. Its segment count was stale (it said 10; measured 17: 16 `bash` + 1 `node`, with the command quoted in the trap). A new `df -i /tmp` triage trap was added.

---

- QA Cycle 1 — changes-requested: disabled (`gh-stage.js` reason `stage-disabled`).
- QA Cycle 1 — qa-fix ingested gate.1 inline rather than through the findings-ingester subagent: the same session wrote the gate, so its findings were already in context, and `pr-review-current.js` returned `none`. Independence loss: none beyond the gate's own.
- QA Cycle 1 — fix plan: CR-1 (medium) and QA-1 (low) fixed; CR-3 cleanup taken because it is one line; CR-2 (advisory, confidence medium) left in `recommendations.future`, since an engine-only PR without a doc change is rare and the repo-wide corpus test already exercises the engine in `npm test`.
- QA Cycle 1 — CR-1 fix: `symlinkSet()` (index mode 120000, from one `git ls-files -s -z` per tracked set, WeakMap-memoised and read lazily). `anchorsFor` follows a tracked symlink's blob to its in-repository target, at most 8 links deep. An absolute or repository-escaping target answers null, the same as an unreadable one. Test: a tracked symlink, a chain of two, and a dead fragment through the symlink (both directions). Mutation proof: symlink branch disabled → the new test goes red → covered.
- QA Cycle 1 — QA-1 fix: `groupByPrefix` counts in a Map and returns `Object.fromEntries`, so `__proto__`, `constructor` and `toString` are ordinary own keys. Mutation proof: old plain-object counter → the new test goes red → covered.
- QA Cycle 1 — fast gate (`ci:fast` = `format:check` + `npm test`; no `develop.fastGateCommand` key): `format:check` clean, `bundle:check` clean, `npm test` rc 0 with 6,364 tests, 0 failures and 14 skipped. `tmp-leak: 442 … ratchet ok`.
- QA Cycle 2 — qa-task ran from the skill text already loaded in this session, not a fresh Skill invocation. The refute reviewer was a separate read-only Explore subagent, so independence for the code review is kept.
- QA Cycle 2 — route classifier: `continue (not-a-pass-gate)`. Gate 1's medium was in `doc-links.js`, gate 2's is in `test-tmpdir.mjs`, so the findings are not narrowing in one place; no residue offer.
- QA Cycle 2 — fix plan: CR2-1 (medium) and CR2-2 (low, gated) fixed. CR2-3 (advisory) folded in because it is a three-line guard. CR2-4 (quadratic matchers), CR2-5 (Step 12b prose) and CR2-6 (Bitbucket slugs, confidence low) are left in `recommendations.future`.
- QA Cycle 2 — CR2-1 fix: the suite is spawned `detached` (its own process group). Signals go to the group (`signalGroup`), and once the leader exits `reapGroup` ends what is left (SIGTERM, 2 s grace, SIGKILL) before the directory is read and removed. Tests: a waiting leader whose grandchild must be signalled, and a leader that exits and leaves a background process. Mutation proofs: `detached:false`, direct-child-only forwarding, and no reap each turn a test red → covered.
- QA Cycle 2 — CR2-2 fix: `eval-` names strip their inner six-character segment whatever its case (`EVAL_INNER_RE`, keyed on the producer `evals/shared/runner.mjs`). Every committed ratchet key is asserted to be a fixed point of `prefixOf`. Mutation proof: rule off → the `prefixOf` test goes red → covered.
- QA Cycle 2 — CR2-3 fix: the retry `rmSync` is guarded, and `removeDir` reports failure through its return value. Test: a victim under a read-only parent. Mutation proof: guard removed → red → covered.
- QA Cycle 3 — scoped re-review of the two files changed since gate 2's head. The route classifier said `continue (not-a-pass-gate; route 2 declined: product-defect-signal)`. CR3-1 is a regression the CR2-1 fix introduced (`detached` → new session).
- QA Cycle 3 — fix plan: CR3-1 (medium) fixed; CR3-2, CR3-3 and CR3-4 folded in because each is a few lines.
- QA Cycle 3 — CR3-1 fix: `FORWARDED_SIGNALS` = INT, TERM, HUP, QUIT, all forwarded to the suite's group. On SIGTSTP the wrapper SIGSTOPs the group and then itself; on SIGCONT it continues the group. The group is orphaned in its new session, so a SIGTSTP sent to it would be discarded. Tests: a parametrised SIGTERM/SIGHUP test and a Ctrl-Z test that reads `/proc` states. SIGQUIT is checked by probe only, because its re-raise core-dumps the wrapper. Mutation proofs: SIGHUP dropped, no suspend and no resume each turn a test red → covered.
- QA Cycle 3 — CR3-3 fix: `signalGroup` reads only ESRCH as gone. Test: a group led by another user's process (EPERM premise asserted). Mutation proof: catch returns false → red → covered.
- QA Cycle 3 — CR3-4: a group that survives the reap is reported on stderr. Not tested: making a process survive SIGKILL needs an uninterruptible sleep.
- QA Cycle 3 — CR3-2: the test safety net also kills the suite's own group, read from a pid file the fake suite writes.
- QA Cycle 4 — the route classifier said `continue (not-a-pass-gate; route 2 declined: product-defect-signal)`. Gate 4 records maintainability CONCERNS for the inert safety net, and any non-pass NFR declines route 2. I kept that assessment rather than re-scoring the gate to reach an exit.
- QA Cycle 4 — CR4-1 fix: `spawnWrapper` captures the suite pid while the test runs (`child.suitePid()`, which the tests call when they read it, plus a 20 ms poll as a backstop), so the hook no longer depends on a file the scratch cleanup has already deleted. My first version relied on the poll alone; it lost a race with a subtest's end and failed in the full file, which is why the synchronous read was added. Test: a subtest that leaves its suite running, with the parent asserting the suite is gone after the subtest's hooks. Mutation proofs: the cycle-3 read-in-hook code, and a wrapper-group-only kill, each turn it red → covered.
- QA Cycle 4 — CR4-2: the reap report now says the group "could not be ended (it survived SIGKILL or refused the signal)", and the `signalGroup` docstring states what EPERM changes.
- QA Cycle 2 — test hygiene: the signal tests spawn the wrapper in its own group and kill that group afterwards, so a regression fails the test instead of hanging the file. The first mutation run hung on `detached:false` until this was added.
- Step 5c — `/review-pr --no-code`: ✅ APPROVE with 2 low conformance findings. PC-1 (SC-6 unticked) was doc-only, so it was fixed and carried to 6a. PC-2 (`pr_number` missing) was recorded at 5c and closed by `/finalise`'s `pr_number: 752` write.
- Step 7 — `/finalise`: DoD ACCEPTED (AC, docs and security PASS; compliance NOT_APPLICABLE). Step 3b.1 re-probed the `compareRatchet` boundary: 8 executed, 0 reproduced, 0 escaped (`task.231.dod.1.security.run.json`). Registry row ticked.
- Step 7 — CI reading 1: SUCCESS @ `d423566fdb27` (6 checks; the test lane finished before the decision). CI reading 2: SUCCESS (tree-equivalent to `190375ffb4ba`) @ `987f7dcb62ca`, across 6 checks after 30 s. The acceptance commit is docs-only, and the docs-only rule resolved its pending test lane.
- Step 7 — side-effects: PR canonical comment posted; issue #741 commented (`done`) and closed (state CLOSED confirmed); Document link already durable; board `done` → `already`.

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 4/5 (pre-QA)** — PR #752's first CI run: `link-check` red on `mailto:markdown-link-check@3.15.0`. GFM autolinks a bare `name@version` as an email address. Fixed with a code span (`977e550d`), and a scan of every changed `.md` (code spans and fences stripped) found no other bare `@`-addresses.
- **Step 4/5 (pre-QA)** — CI `test` (run 40279465736): 6,851 tests, 0 fail, and `tmp-leak` was the only red. Nine prefixes were over (`carry-5c-gh` 16>8, `carry-5c-remote` 24>12, `finalise-6d` 10>5, `next-numbered` 30>15, `qa-code-review` 4>2, `review-pr-0a` 12>6, `review-pr-kindword` 2>1, `review-pr-nodocs` 2>1, `review-pr-prnum` 6>3): exactly ×2, the zsh variant the local run skips. This was the case carried from Step 3. Counts were raised to the per-prefix maximum (495 entries in all), in commit `test(infra): raise nine ratchet counts…`.
- **Step 3** — `test-runner-reach.test.js:112`: a first `sed` produced `scripts["test:suite"]` inside a double-quoted JS string. Caught on read-back before any run, and reworded to `` `test:suite` ``.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-26
**Gate Result**: CONCERNS
**Issues Found**: 2. TASK-231-CR-1 (medium): the anchor check reads a tracked symlink's index blob, so fragment links to a symlinked `.md` are false `[no-anchor]`. TASK-231-QA-1 (low): `groupByPrefix` drops a `__proto__` prefix. Advisory: CR-2 (an engine-only PR runs an empty anchor step), CR-3 (cleanup).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1: `anchorsFor` follows tracked symlinks (`symlinkSet`), with a test. QA-1: `groupByPrefix` counts in a Map, with a test. CR-3: `blocksOf` hoisted. Fast gate green (`npm test` 6,364 tests / 0 fail, ratchet ok). PR state after the push: OPEN @ `e1a76d6b` (read with `gh pr view`).
**Commit**: `e1a76d6b`

### QA Cycle 2 — 2026-10-26
**Gate Result**: CONCERNS
**Issues Found**: 2 gated. TASK-231-CR2-1 (medium): SIGTERM reaches only the wrapper's direct child, so grandchildren outlive their TMPDIR. TASK-231-CR2-2 (low): an all-lowercase inner suffix splits the `eval-repeat-hang` prefix. Plus 4 advisory: unguarded retry `rmSync`, quadratic heading matchers, Step 12b prose omits `no-anchor`, Bitbucket slugs. Cycle-1 fixes verified and mutation-proven.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: CR2-1: process-group spawn, signalling and reaping, with two tests. CR2-2: producer-keyed `eval-` inner-suffix rule, with a ratchet fixed-point test. CR2-3: guarded retry `rmSync`, with a test. All five mutation proofs covered. Fast gate green (`npm test` 6,368 tests / 0 fail, ratchet ok, bundle clean).
**Commit**: `1bd49777`

### QA Cycle 3 — 2026-10-26
**Gate Result**: CONCERNS
**Issues Found**: 1 gated. TASK-231-CR3-1 (medium): the new session cut the suite off from SIGHUP and SIGQUIT, so those signals orphan it and its directory. Plus 2 advisory (CR3-2 test safety net, CR3-3 EPERM) and 1 cleanup (CR3-4). Cycle-2 fixes verified and mutation-proven; CI green @ `1bd49777`.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: CR3-1: HUP and QUIT forwarded, plus SIGTSTP/SIGCONT job control for the group; CR3-2 to CR3-4 folded in. Four mutation proofs covered.
**Commit**: `d6e33392`

### QA Cycle 4 — 2026-10-26
**Gate Result**: CONCERNS
**Issues Found**: 1 gated. TASK-231-CR4-1 (medium, test-only): the CR3-2 safety net read a pid file that the scratch cleanup had already deleted (`node:test` after hooks run FIFO). Plus 1 cleanup (CR4-2, reap report wording). Cycle-3 fixes verified and mutation-proven; CI green @ `d6e33392`.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: CR4-1: the suite pid is captured in memory (`child.suitePid()` plus a poll), with a subtest-based test; CR4-2 wording. Two mutation proofs covered.
**Commit**: `190375ff`

### QA Cycle 5 — 2026-10-26
**Gate Result**: PASS
**Issues Found**: 0 gated. 2 low advisory: CR5-1, `alive(null)` reads as dead; CR5-2, a zombie reads as alive under a non-reaping PID 1. Both are carried in `recommendations.future`. Cycle-4 fix verified and mutation-proven; CI green @ `190375ff`.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: ✅ APPROVE — task.231.pr-review.1.test-infrastructure-hygiene.md (conformance lens only, `--no-code`; 2 low findings)
**Loop exit**: PASS gate → 5c APPROVE → Step 7
**Action**: Proceeding to 5c
**Carried to 6a**: docs/tasks/task.231.test-infrastructure-hygiene/task.231.pr-review.1.test-infrastructure-hygiene.md docs/tasks/task.231.test-infrastructure-hygiene/task.231.test-infrastructure-hygiene.md (PC-1 fixed: SC-6 ticked with run 40291489233)
**Not fixed at 5c**: PC-2 `pr_number` (ref is not a docs path; recorded)

---

## Completion

**Finished**: 2026-10-26T08:31Z
**Final Status**: Completed
**Branch**: feature/task.231.test-infrastructure-hygiene
**PR**: https://github.com/Gamaroff/agent-skills/pull/752
**QA Iterations**: 5
**DoD Summary**: `task.231.dod.1.test-infrastructure-hygiene.md`
**Tracker debt**: none

**Completion Summary**: Implemented per-run TMPDIR containment for `npm test`: a wrapper that signals and reaps the suite's process group, plus a leak ratchet that names new or over-count temp prefixes. Also implemented `#fragment` anchor checking in `doc-links.js` (wired into the docs link-check workflow), a worktree-safe scratch root for the observation-log tests, and a parity-test rule that accepts a block that marks its own wait. QA took 5 cycles: gates 1–4 were CONCERNS, each with a mutation-proven fix (symlinked anchors, prototype-key prefixes, process-group signalling, SIGHUP/SIGQUIT and job control, an inert test safety net), and gate 5 passed at 95/100. The Step 5c review approved. `/finalise` accepted with the security boundary re-probed. Notable decision: gate 4's maintainability CONCERNS was kept rather than re-scored to force a loop exit.
