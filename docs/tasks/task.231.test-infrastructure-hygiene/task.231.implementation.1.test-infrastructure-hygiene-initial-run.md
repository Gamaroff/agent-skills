# Implementation Report: Test infrastructure hygiene

**Task**: `task.231.test-infrastructure-hygiene.md`
**Run Number**: 1
**Started**: 2026-10-26 05:37
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.231.qa.{N}.*.md`; `task.231.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.231.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

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
  - **markdown-link-check@3.15.0 does not detect a dead cross-file fragment** (fixture `other.md#nope` reads ✓); it does catch a same-file `#nope-here`. So the `doc-links.js` CI step is not redundant.
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
- Development completion comment posted to GitHub issue #741 (`develop-complete`, count=22): `posted`. Its segment count was stale (it said 10; measured 17: 16 `bash` + 1 `node`, with the command quoted in the trap). A new `df -i /tmp` triage trap was added.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3** — `test-runner-reach.test.js:112`: a first `sed` produced `scripts["test:suite"]` inside a double-quoted JS string. Caught on read-back before any run, and reworded to `` `test:suite` ``.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.231.test-infrastructure-hygiene
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
