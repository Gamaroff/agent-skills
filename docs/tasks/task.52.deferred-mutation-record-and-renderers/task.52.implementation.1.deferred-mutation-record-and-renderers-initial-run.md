# Implementation Report: [Task 52] One deferred-mutation record, four renderings of it

**Task**: `task.52.deferred-mutation-record-and-renderers.md`
**Run Number**: 1
**Started**: 2026-08-18 13:15
**Status**: ✅ Completed

---

## Summary

Implement the deferred-mutation record schema, the append-only NDJSON journal, the single writer
(`defer-mutation.js`), the four renderers (`md`/`sh`/`json`/`summary`), the 20-kind roster schema doc,
artifact registration, the implementation-report template section, and the `ACCESS_TRACKER` gates on
`jira-stage.js` / `gh-stage.js` — all fixture-driven and hermetic.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                                      |
| PR target           | `develop`                                                                                                                                      |
| qa-planning gate    | skipped (auto)                                                                                                                                 |
| Task risk level     | medium                                                                                                                                         |
| Pipeline mode       | standard (risk_level medium — lite requires low/absent)                                                                                        |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker             | github (ACCESS_TRACKER=full, ACCESS_VCS=full)                                                                                                  |
| Tracker Issue       | #230 (GitHub)                                                                                                                                  |
| Board status        | Todo → In Progress ✅ (board "Agent Skills", verified)                                                                                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.52.*` exists in git                               | Pre-existing from earlier run; cut at develop tip, 0 divergent commits. Resume confirmed by user. | — |
| 2. review-task             | ✅ Done    | `task.52.review.1.deferred-mutation-record-and-renderers.md` exists    | Review cycle 1 scored 6/10 NEEDS REVISION; all 9 critical + important recommendations implemented in the task doc; post-fix 9/10 READY TO IMPLEMENT. Task status `ready-for-development`. | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 12 phases + 10 success criteria complete. 3 new modules, 1 schema doc, 2 test suites, 9 fixtures, 2 gated CLIs, 5 docs. 51 new tests; npm test 1338+379 green; validate:all 115 green; bundle clean. | `.summaries/step-3-surface-map.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR [#249](https://github.com/Gamaroff/agent-skills/pull/249) → `develop`. Issue #230 commented. Board `in-review`: `stage-disabled` (moment not declared for this board — a correct exit-0 outcome). Resumed after the API outage cleared. | — |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.52.qa.{N}.*.md`; `task.52.gate.{N}.*.yml`; PR comment posted | Cycle 1: gate **FAIL** 25/100 — 7 HIGH + 9 MEDIUM. 6 bug reports filed. PR + issue commented. **2 cycles.** Cycle 1: FAIL 25/100 (7 HIGH + 9 MEDIUM). qa-fix `5c6c2b5` fixed all HIGH + 6 MEDIUM. Cycle 2: **PASS 92/100** — every finding re-verified by re-running its own reproduction; found and fixed one defect in the cycle-1 fix (`f7baa92`). 2 MEDIUM deferred as out-of-scope interception work. | — |
| 7. finalise                | ✅ Done    | `task.52.dod.{N}.*.md`; task `status: accepted`                        | DoD 10/10. **The CI gate caught a red PR**: CI's `test` job runs `prettier --check` alongside `npm test`, and only the latter was being run locally — fixed in `8d1d385`, re-sampled to SUCCESS. Issue #230 closed, board Done, canonical PR comment posted, sprint review summary written. | — |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final commit of DoD summary, sprint review summary and this report. | — |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-08-18

- **Resume vs start fresh**: "Resume — skip Steps 1–2". Branch and review report both pre-existed from an earlier partial run; the task document already carries the review's critical + important fixes (Change Log v1.1).
- **Q1 — Feature branch base**: `develop` — standard Gitflow; branch already sits at develop's tip with no divergent commits, so no rebase is implied.
- **Q2 — PR target branch**: `develop` — matches the base; task PRs merge back into develop.
- **qa-planning gate**: skipped (auto — no prompt).
- **Pipeline mode**: standard — `risk_level: medium` disqualifies lite.
- **Tracker signal**: `gh-stage.js --stage work-started --add-to-board` → transitioned Todo → In Progress, verified. Pipeline-start comment posted to #230.
- **Plan file**: none found (`task.52.plan.*.md` absent) — proceeding without one.
- **Pre-develop surface map**: Explore subagent returned a map covering both stage CLIs (entry points, credential/network line numbers, `reason:` vocabularies), the `ACCESS_TRACKER` producer, shared-module CJS conventions, the test harness, `bundle_skill.py`'s follow regexes, the two registries and the template line numbers. No plan file exists, so the task's own Implementation Plan was the spec.
- **`ACCESS_TRACKER` resolution in node**: environment only, unset → `full`, unrecognised → refuse. Chosen over re-reading `skills-config.yaml` in node because `resolve-platform.sh` is the single resolver; a second path would fork the most-restrictive-wins logic task.60 hardened.
- **Reads are never gated**: `--probe-board`, `--check`, `--init-workflow`, `--print-plan` and `--dry-run` all still work under a restricted mode. Every non-`full` mode restricts writes, not reads.
- **Scope addition**: `resolve-platform.sh` + `tracker-access.test.sh` (Issues Log #5). Not in the task's file list; taken because the task made an existing warning false.
- **Platform**: TRACKER=github, VCS=github, ACCESS_TRACKER=full, ACCESS_VCS=full (resolved via `resolve-platform.sh`).

---

## Issues Log

| # | Issue | Resolution |
| - | ----- | ---------- |
| 1 | `npm run bundle` crashed with `FileNotFoundError: skills/develop-batch/references/tests/handover-render.test.mjs` | My module headers cited the test suite as `shared/resources/tests/…`. `bundle_skill.py` follows any `shared/resources/<path>` reference found in a bundled `.js`, so it tried to copy the test suite into every consuming skill and failed on the missing parent dir. No other shared module does this. Fixed by citing the tests relatively; a comment in both files records why. |
| 2 | `defer-mutation.js` reads its roster via `__dirname`, not `require` — nothing told the bundler the schema doc was a dependency | A bundled skill would have thrown "Cannot read the kind roster" on first use. Fixed by naming `shared/resources/tracker-access-record.md` in full in the header so the bundler follows it. Verified: all 9 skills that receive the module also receive the doc, and `loadRoster()` returns 20 from a bundled path. |
| 3 | `gh-stage.test.mjs` pinned gh-stage's exact sibling-require list; the new `defer-mutation.js` broke it | The tripwire is deliberate (gh-stage ships to GitHub-only consumers). Updated the expected list and **added** an assertion that `defer-mutation.js` itself stays dependency-free, so the GitHub-only property holds transitively. Also had to exclude self-references — a module's own name appears in its usage example. |
| 4 | Two mutations initially survived — the invariants were **not** proven | Neither was safe code; both were weak tests. (a) §9 asserted `--body-file` was present but never that the body was absent from the command line. (b) The jira no-network cases ran without `JIRA_*` credentials, so `getAuth()` short-circuited and no network call was reachable either way. Both tests strengthened, both mutations re-run and now red. Full ledger in the task doc. |
| 7 | ✅ **Resolved.** Step 7 found CI **red** on the PR while every local signal was green | CI's `test` job runs `npm run format:check` in addition to `npm test`; `prettier --check` was failing on all seven touched files. `npm test` is not the CI contract, and nothing local surfaces `format:check` unless run explicitly. Fixed in `8d1d385`; rollup re-sampled to SUCCESS before any acceptance decision. Worth carrying into tasks 53–57. |
| 6 | ✅ **Resolved.** Step 4 `gh pr create` failed — `error connecting to api.github.com` | Not a repo or auth problem: `git ls-remote` over SSH succeeds and confirms the branch at `bdef7c3`, while `curl https://api.github.com` and `https://github.com` both time out (rc=28). An external HTTPS-path outage. All six commits are pushed; the only outstanding action is opening the PR. Retried 18× across ~10 minutes, then halted per the pipeline's terminal-HALT protocol so the run could resume cleanly rather than spin. Connectivity returned; resumed from the halt snapshot and PR #249 opened. No work was lost — every commit was already pushed. |
| 5 | `resolve-platform.sh` warns `NOT YET ENFORCED — this run still writes to the tracker normally` | That became false the moment the stage CLIs started deferring. Out of the task's file list, but leaving a notice that misstates protection is worse than no notice. Changed to `PARTIALLY ENFORCED`, naming what still writes; `tracker-access.test.sh` §17 updated to assert the qualified wording. Logged as a deliberate scope addition. |

---

## QA Iteration History

| Cycle | Gate | Score | Findings | Outcome |
| ----- | ---- | ----- | -------- | ------- |
| 1 | FAIL | 25/100 | 7 HIGH, 9 MEDIUM, 2 LOW | qa-fix `5c6c2b5` — all HIGH + 6 MEDIUM fixed, each mutation-proven |
| 2 | **PASS** | **92/100** | 1 new (in the cycle-1 fix) | qa-fix `f7baa92` — fixed and mutation-proven; 2 MEDIUM deferred with rationale |

_Track each QA review/fix cycle._

### Cycle 1 — qa-task → gate FAIL (25/100)

**7 HIGH, 9 MEDIUM, 2 LOW.** Full detail: `task.52.qa.1.*.md` and `task.52.gate.1.*.yml`.

The access gates passed everything. All seven HIGH defects are in the record-identity and rendering
layers, and — the point worth carrying forward — **every one sits in code the suite covers**:

| Bug | Issue | Why the suite missed it |
| --- | ----- | ----------------------- |
| BUG-3 | Command execution from the committed script, during the dry run | No test executed a generated script with hostile record content |
| BUG-4 | Two comments to one issue collapse to one id; one is silently dropped | Identity tests never varied `stdin`/`intent` with argv held constant |
| BUG-5 | Double redaction turns `$GITHUB_TOKEN` into `«redacted»` | §6 asserted on `verify.cmd` (a plain string), never on `argv` after both passes |
| BUG-2 | 32+ char rule eats SHAs, base64, URLs, branch names | The hostile-body fixture had no 32-char unbroken run |
| BUG-6 | `git push -u origin` → `git push -u «redacted»` | No test used a non-secret `-u`/`-p` |
| BUG-1 | Checklist lists each `dependsOn` target twice | Dedup fixture had no `dependsOn`; nesting test checked indentation, not counts |

Two findings came from my own adversarial probes of the task's headline claims (BUG-1, BUG-2); the
Step 3b code review found the other five. Every code-review claim was re-verified by running the
code before acceptance — one did not reproduce as described and was re-tested until the real path
was found.

### Cycle 1 — qa-fix

All 7 HIGH and 6 of 9 MEDIUM fixed; each with a regression test, each mutation-proven (fix reverted,
test watched failing, fix restored). Commit `5c6c2b5`.

Two mutations initially survived, and both exposed weak assertions rather than safe code — the same
failure mode that let the seven defects through in the first place:

- BUG-3's `run_step` interpolation path had **no test at all**; only the `echo` path was covered. A
  third execution test was added for it.
- The tty test asserted on the intent string, but `run_step` echoes the *headline* and does not echo
  argv under `--apply` — it was passing for the wrong reason.

**Step 3.5 adversarial pass over the fixes.** One genuine consequence of combining two fixes:
BUG-4 put `intent` into the identity fingerprint while BUG-1 dedupes on id, so a non-deterministic
intent would now make a *resume* emit a second record and the checklist list the action twice. Both
gates emit deterministic intents today, but that is now load-bearing, so it is written into the
schema doc as a contract rather than left as an accident.

**Deferred with rationale**: BUG-7 (bundle + invoke `handover-render` at run end) and BUG-15 (read
the board before deferring) are interception work — this task's explicit Out of Scope, and the
subject of tasks 53–57. Recorded in the gate as future actions.

### Cycle 2 — qa-task re-review → gate PASS (92/100)

Every cycle-1 finding verified by re-running its own reproduction command against the fixed code.
All 7 HIGH and 6 of 9 MEDIUM closed.

**The re-review found one defect in the cycle-1 fix.** BUG-5's idempotency guard tested
`/^\$IDENT$/`, which matches `--token $GITHUB_TOKEN` but not
`Authorization: Bearer $JIRA_API_TOKEN` — so the render pass still re-masked a header the write pass
had correctly named. The cycle-1 regression test passed honestly; it exercised only the bare form.
Fixed in `f7baa92`, pinned by §16 BUG-5b end-to-end, mutation-proven.

This is the fix pass's characteristic failure and worth carrying into the next task in the sequence:
*a fix is new code, not the closure of a finding.*

**Two MEDIUM deferred, deliberately.** BUG-7 (bundle + invoke `handover-render` at run end) and
BUG-15 (board read before deferring) both change what *call sites* do — this task's explicit Out of
Scope, and the substance of tasks 53–57. Recorded in gate 2 as `future` actions naming the exact
files so the next task inherits them rather than rediscovering them.

### Pre-QA verification (Step 3)

| Check | Result |
| ----- | ------ |
| `npm test` — node | 1338 passed, 0 failed |
| `npm test` — `tracker-access.test.sh` | 379 passed, 0 failed |
| `npm run validate:all` | 115 passed, 0 failed |
| `npm run bundle` | clean; 66 regenerated files; no test suite leaked |
| Mutation ledger | 11 invariants, all watched failing (2 required strengthening the tests first) |

---

## Completion Summary

Task 52 landed the data contract for the restricted-tracker-access sequence: one deferred-mutation
record, four renderings of it, and the first two consumers of `ACCESS_TRACKER`. Nothing calls the new
modules yet — by design — so the value is that tasks 53–57 inherit a finished, mutation-proven
contract rather than negotiating with a schema already load-bearing in three places.

**Three things worth carrying forward:**

1. **The suite covered every defect it missed.** All seven cycle-1 HIGH findings sat in covered code;
   each fixture simply lacked the triggering shape. Assertions on *counts and byte-equality* caught
   what assertions on *presence and relative order* could not.
2. **A fix is new code.** Cycle 2 found a defect inside cycle 1's fix — the same bug one nesting
   level down, with the cycle-1 test passing honestly because it tested the shape the author had in
   mind rather than the shape the code accepted.
3. **`npm test` is not the CI contract.** The PR was red on `prettier --check`, which CI's `test` job
   runs and no local command surfaced. Found only because the DoD step reads the CI rollup rather
   than assuming it.

## Completion

**Finished**: 2026-08-18 18:05
**Final Status**: Completed
**Branch**: `feature/task.52.deferred-mutation-record-and-renderers`
**PR**: [#249](https://github.com/Gamaroff/agent-skills/pull/249)
**QA Iterations**: 2 (cycle 1 FAIL 25/100 → cycle 2 PASS 92/100)
**DoD Summary**: `task.52.dod.1.deferred-mutation-record-and-renderers.md` — ACCEPTED
