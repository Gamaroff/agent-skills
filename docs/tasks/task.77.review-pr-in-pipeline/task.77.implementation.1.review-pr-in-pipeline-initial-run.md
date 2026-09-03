# Implementation Report: Run the PR conformance review before a work item is finalised

**Task**: `task.77.review-pr-in-pipeline.md`
**Run Number**: 1
**Started**: 2026-09-03 00:00
**Status**: In Progress

---

## Summary

Wire `/review-pr`'s conformance lens into the shared Step 5–6 QA loop of `develop-task` and
`develop-story` as Step 5c, move the `ready-for-merge` stage behind it, and sweep every consumer
document, runbook and diagram that describes the pipeline shape.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Feature branch base | `develop`                                                                                                                       |
| PR target           | `develop`                                                                                                                       |
| qa-planning gate    | skipped (auto)                                                                                                                  |
| Task risk level     | medium                                                                                                                          |
| Pipeline mode       | standard                                                                                                                        |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no tracker issue linked)                                                                                                   |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.77.*` exists in git | Branch created at `9291efa`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.77.review.1.review-pr-in-pipeline.md`                            | READY TO IMPLEMENT, 9/10. 0 critical, 6 important, 8 optional — all important fixes applied to the task doc | Pre-pass B (arch alignment) + C (already-implemented) — summarised in the review report's Review Metadata |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 7 phases; 1 develop iteration; full `npm run ci` green (exit 0); 2 of 3 mutation proofs held, the third correctly did not | Pre-develop surface map (9 target areas) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #309](https://github.com/Gamaroff/agent-skills/pull/309) → `develop`; commit `b3945e4` (86 files). Issue comment skipped — no tracker issue linked | — |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.77.qa.{N}.*.md`; `task.77.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.77.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-03

- Invoked by `/develop-next` (roadmap item **T77**, PHASE 5 — Current frontier, source `roadmap`, no deps).
- **AUTONOMOUS RUN (develop-next)** — Phase 0d questions auto-answered with the recommended option, no prompt issued.
  - Q1 Feature branch base: **`develop`** — auto-answered (recommended; current branch is `develop`)
  - Q2 PR target branch: **`develop`** — auto-answered (recommended)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0b: no previous run detected (no `feature/task.77.*` branch, no open PR, no prior implementation report) → started fresh.
- Phase 0a-parallel: resolver not dispatched (explicit path supplied). Lite-mode and always-load inputs read inline from the task frontmatter and `skills-config.yaml` — no lite-mode CLI exists in this repo, so the contract's booleans were read directly.
- Pipeline mode: **standard**. Computed from `risk_ok = risk_level("medium") ∈ {low, absent}` → **false**; the AND short-circuits regardless of `phase_count` (7 implementation phases) and `single_module` (false — touches `shared/resources/`, `skills/`, `evals/`, `docs/`).
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`, all verified present on disk.
- Tracker: `TRACKER=github` (no `JIRA_URL`), `TRACKER_ISSUE` empty — task frontmatter carries no `github_issue:`. All tracker signals and board moves are skipped for this run.

### Step 1 — create-branch — 2026-09-03

- Branch `feature/task.77.review-pr-in-pipeline` cut from `develop` at `9291efa` and pushed with upstream tracking.
- Implementation report stashed before branch creation, restored after (clean `git stash pop`).
- Signal Work Started: **skipped** — no `TRACKER_ISSUE` linked, so there is no issue to comment on and no board item to move.

### Step 2 — review-task — 2026-09-03

- Gate check: status `Ready for Development` with **no** review report present → review-task **ran** (per the skip/run table, a status set without a completed review re-runs the review).
- `review-task` output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- Step 0a branch setup auto-skipped — already on `feature/task.77.*`.
- Phase 1.5 pre-pass: both Explore agents dispatched in parallel and both returned.
  - Agent C (codebase already-implemented scan) → `implementation_status: not-started`; supplied the contradiction-site map.
  - Agent B (architecture alignment) → `alignment: aligned`, `missing_paths: []`; every path task 77 names exists.
- **Outcome: READY TO IMPLEMENT, 9/10.** 0 critical, 6 important, 8 optional.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. All 6 important fixes applied, plus 6 of the 8 optional ones that correct an instruction the implementer follows.
- Step 9: **skipped** — status was already `Ready for Development`, so there was no promotion to make. Change Log row written regardless (v1.1) and frontmatter `updated` bumped to 2026-09-03 in the same edit.
- Step 8.6 (Jira body push): skipped — `TRACKER=github`.
- Step 10 (tracker comment): skipped silently — no `github_issue` in frontmatter.
- **Tracker sync offer declined** (deviation from the skill's `(Recommended)` option, logged deliberately): tasks 70, 73, 75 and 76 all carry no `github_issue`, so linkage is not this repo's convention; creating an issue would be an unrequested outward-facing side effect. Gap stays flagged in the review report as I-5.
- **A draft review finding was refuted by pre-pass B and withdrawn**: an earlier pass reported that no assertion in `review-pr.test.js` quotes the "do not call" sentence. One does, at `review-pr.test.js:546` — the draft was a false negative from a grep pattern that did not account for the backslash-escaped asterisks in the test source. Task 77's Phase 5 item is correct as written.
- Post-fix validation: tracker-card preflight `ok: true, findings: 0`; `prettier --check` clean on both documents.

### Step 3 — develop — 2026-09-03

- Pre-develop surface map: 1 Explore subagent, 9 target areas (the QA-loop step file's heading outline and verbatim outcome-branching block, the banner/lite-mode/defaults/resume-contract/detector house styles, `review-pr`'s relationship section, both `STEP_KEYWORDS`, and the closest sibling parity test to clone).
- Plan file: none co-located (`task.77.plan.*.md` absent) — proceeded without one.
- No `/develop` internal gates fired: status was already `Ready for Development`, `risk_level` is `medium` (not high), and no alignment mismatch arose (pre-pass C returned `not-started`).

**Phases implemented**

| Phase | What landed |
| --- | --- |
| 1 | PASS/WAIVED arms repointed to 5c; `### 5c. PR Conformance Review (shared)` inserted between 5b and Loop Escalation; `ready-for-merge` **moved** out of 5a's outcome branching into 5c; `**PR Review**` row added to the QA Cycle template with the same write-every-cycle rule as `**HIGH findings**`; Loop Escalation text extended. |
| 2 | `review-pr` added to the lock's noop arm + header comment; shell test gained loop-member coverage. |
| 3 | Resume contract (both rows, conditional on a clean gate), both Step-0 progress templates, lite mode, autonomous defaults, remaining-work banner, resume-detector exemption note. |
| 4 | `review-pr` SKILL.md relationship section rewritten and its line-33 caveat re-scoped; both orchestrator SKILL.md Step 5–6 sections and Related Skills lists. |
| 5 | Both `pipeline-shape` EXPECTED_STEPS + both stale titles; both `STEP_KEYWORDS["5-6"]`; new `evals/shared/tests/pr-review-loop-parity.test.mjs` (11 tests at first write; 15 after two QA cycles); `review-pr.test.js` inverted assertion. |
| 6 | 3 diagrams, 7 runbooks, reference/concept/standards docs, CHANGELOG. |
| 7 | `npm run bundle`, `npm run generate-catalog`. |

**Mutation proofs** (per `shared/resources/mutation-proving.md`, and task.76's three diagnoses)

| Proof | Result |
| --- | --- |
| Revert the PASS→5c repoint | **Held** — `pr-review-loop-parity` 10 pass / 1 fail |
| Restore `ready-for-merge` to 5a's outcome branching | **Held** — the ordering assertion fails by name |
| Remove `review-pr` from the lock noop arm | **Did not hold, as predicted** — 14/14 still pass. Diagnosis: **redundant source**, not a vacuous test. `advance-pipeline-lock.sh:100`'s `*)` catch-all already `exit 0`s on any unknown skill, so the explicit arm is documentation and testability, not behaviour. Recorded in the task's §8 and in the new test's comments rather than papered over with a literal-string assertion. |

- Every added shell snippet and the lock script were executed under **both** bash and zsh (Risk 1): 14/14 in each, and `--skill review-pr` returns `rc=0` with `current_step` unchanged under zsh.
- Loop audit performed inline rather than by subagent: the exit condition is a status change, and the post-conditions were concrete and already in hand — 0 unticked checkboxes across §6/§8/§9 and Progress Tracking, and `npm run ci` exit 0. Dispatching an agent to re-derive facts produced in this same turn would have added cost without adding evidence.
- Diagrams validated with a real Mermaid parser (`valid: true`, `flowchart`), confirming the chained-arrow form `S5cv -- APPROVE / CONCERNS --> S5cm[...] --> S7` parses and all three new node ids render. The house theme block is documentation-only, so no `classDef` was needed.

**A bundle leak found and fixed.** Referencing the QA-loop step file **by path** from
`develop-pipeline-autonomous-defaults.md` made `bundle_skill.py` follow the reference and copy
`develop-pipeline-step-5-6-qa-loop.md` — plus its transitive refs (`code-review-prompt.md`,
`qa-execute-snippets.mjs`, `qa-re-review-scope.md`, `qa-runnable-prose-detection.md`,
`qa-traceability-mapper-prompt.md`) — into `skills/develop-bug/references/`. Confirmed against a
clean `origin/develop` worktree that the baseline bundles clean, so this was introduced by that
reference, not pre-existing. The row now describes the routing without a path. `develop-bug`'s own
`SKILL.md` and `develop-bug-step-5-6-verify-loop.md` are byte-unchanged.

**The same leak recurred a second time, in `skills/review-pr/`,** and was caught by the pre-commit
scan rather than by any test. The rewritten *Relationship to the develop pipelines* section linked
the QA-loop step file by path, pulling five files into `skills/review-pr/references/`
(`develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-remaining-work-banner.md`,
`qa-execute-snippets.mjs`, `qa-runnable-prose-detection.md`, `qa-traceability-mapper-prompt.md`) —
none of which `review-pr` needs in order to run. Fixed the same way. Worth noting for anyone
extending this work: **`bundle_skill.py` rewrites the link in the source file in place**
(`shared/resources/X` → `references/X`), so a second attempt to fix it by matching the original
`shared/resources/…` string silently fails to match. Match the rewritten form.

The generalisable rule, now stated in both places: **do not reference the Steps 5–6 QA-loop step
file by path from any file bundled into a skill that does not run that loop.** Prose naming the
section is enough; the bundler does not follow prose.

**§9 regression criterion corrected.** "`develop-bug` is byte-unchanged" was unachievable given the
task's own Phase 3 — `develop-bug` bundles five of the shared files Phase 3 edits. Restated as
behavioural isolation, with the reasoning recorded in the task document.

**Phase 6 — files consciously ruled out** (the task requires these be named):

| Ruled out | Why |
| --- | --- |
| `docs/prd/onboarding/**` (23 files) | Historical run artifacts — implementation reports, QA/gate/DoD/review files and sprint-review summaries of past runs. Records of what happened, not descriptions of current behaviour. |
| `docs/tasks/**`, `docs/bugs/**` | Same: prior task/bug documents and their artifacts. |
| `docs/reference/develop-story-pipeline-audit.2026-08-20.md` | A dated audit — a snapshot of the pipeline as it was, deliberately not updated. |
| `docs/development/project-completion-roadmap.md` | The roadmap row and Change Log entry describe the task as *filed*; Step 4 of `develop-next` ticks it. |
| `docs/runbooks/bug-fix.md`, `skills/develop-bug/README.md` | `develop-bug` is explicitly out of scope — separate verify loop, no 5c. |
| `docs/reference/configuration.md`, `tracker-workflow.md`, `troubleshooting.md`, `anti-patterns.md` | Mention `qa-*` skills but restate no pipeline chain; `ready-for-merge` semantics are unchanged (same stage, same off-by-default, only its firing point moved). |
| `docs/concepts/architecture.md`, `docs/contributing/evals/reference.md`, `docs/runbooks/first-week.md`, `docs/runbooks/sprint-cycle.md`, `docs/standards/bug-documents.md` | Checked line by line: no pipeline-shape restatement that 5c invalidates. |
| `docs/runbooks/restricted-access.md` | The task's premise ("the review's PR comment is a VCS mutation and defers like any other") does not hold: `resolve-platform.sh:469` accepts only `access.vcs: full` and hard-errors otherwise. The comment *does* defer, but on the **tracker** axis via `tracker_call_with_retry` — documented in `docs/concepts/restricted-access.md` instead, where the deferral model lives. |

**Files added to Phase 6 beyond the task's enumeration** (review finding I-1):
`docs/standards/story-documents.md:106` and `docs/standards/task-documents.md:108` — both attributed
the PR review report to `review-pr` **(standalone)**. Neither re-derivation grep reached them, so the
second grep was widened to `docs/standards/` and a word-boundary `review-pr` grep added.

---

## Issues Log

- **Bundle leak, twice.** Referencing the QA-loop step file **by path** from a shared resource makes
  `bundle_skill.py` follow it and copy that file plus its transitive dependencies into every skill
  bundling the referrer. It hit `develop-bug` (via `develop-pipeline-autonomous-defaults.md`) and
  then `review-pr` (via its own SKILL.md). Verified against a clean `origin/develop` worktree that
  the baseline bundles clean, so both were introduced here. Fixed by naming the section in prose.
  Note the second attempt at the fix initially failed to match, because the bundler had already
  rewritten the link in the source file (`shared/resources/X` → `references/X`).
- **`zero-blocks-executed` on the QA-loop file (Step 4b).** All 16 fenced blocks classify as
  `mutating` and none executes. **Pre-existing** — the `origin/develop` baseline of the same file
  returns the identical finding for its 15 blocks. Recorded, not suppressed; worth its own task.
- **A review script hit the bash/zsh split it was checking for.** The first link-check written for
  QA cycle 1 reported six false `DANGLING` results because zsh does not word-split unquoted
  parameters. Re-run under bash, every link resolved. Logged because it is precisely the defect class
  task 66 shipped and task 67 exists to catch — encountered inside the review of the task citing both.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-03

**Gate Result**: FAIL
**Issues Found**: 7 — 3 HIGH, 2 MEDIUM, 2 LOW
**HIGH findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Action**: Running qa-fix (cycle 1 of 5)

The three HIGH findings each made the new 5c path unrunnable in a different way: Loop Setup still
said a clean PASS exits the loop (so 5c might never be entered); the shared counter was incremented
by both 5c and 5b step 7; and the `REQUEST CHANGES` route had no way to deliver its findings to
`/qa-fix`, so it dead-ended in the no-code-change HALT. All 7 issues plus 6 advisory cleanups fixed;
commit `9842551`.

### QA Cycle 2 — 2026-09-03 (refute pass)

**Gate Result**: FAIL
**Issues Found**: 11 — 3 HIGH, 5 MEDIUM, 3 LOW
**HIGH findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Action**: Running qa-fix (cycle 2 of 5)

Cycle 2 is a **refute pass** by contract, and it earned that design. **Two of its three HIGH findings
were introduced by cycle 1's own fixes**, and the pattern behind them is worth recording:

> **Cycle 1 fixed the sentence each finding quoted, rather than the contract that sentence belonged
> to.** TASK77-002 corrected the increment rule in the QA-loop file and left it standing in
> `develop-pipeline-autonomous-defaults.md` — the table an *unattended* run actually consults for
> that fork — and the new test named "the cycle counter is incremented in exactly one place" greps
> only the QA-loop file, so it stayed green while the contradiction stood. TASK77-004 moved a commit
> point without re-checking the one-push-per-cycle invariant it lives under. TASK77-005 documented a
> re-entry using a cycle model TASK77-002 had just changed.

The largest untouched hole was the **5c error path**: cycle 1 made 5c the loop's sole exit and
hardened its happy-path routing without asking what happens when `/review-pr` itself HALTs — and the
`PASS`→5c path skips 5b's mid-loop PR-state poll, so a PR closed underneath the run is discovered
*by* 5c. The likeliest improvisation was falling through to Step 7, silently finalising with no
review at all.

Cycle 2 also found that two of cycle 1's "hardened" test assertions had become **vacuous** (they pass
against the pre-change file), and that three "End-to-end dogfood" boxes in the task document were
ticked with no artifact on disk to support them — the conformance failure this very task exists to
catch, in its own paperwork.

---

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.77.review-pr-in-pipeline`
**PR**: [#309](https://github.com/Gamaroff/agent-skills/pull/309)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
