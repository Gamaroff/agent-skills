# PR Review Report: PR #412 — feat(task.111): npm run ci runs every CI lane, and two coverage gaps the sweep found (#411)

**Reviewed:** 2026-09-16
**PR:** [#412](https://github.com/Gamaroff/agent-skills/pull/412) — `feature/task.111.local-ci-parity` → `develop` (OPEN)
**Work item:** [`task.111.local-ci-parity.md`](./task.111.local-ci-parity.md) — resolved via `branch-stem`
**Tracker:** [#411](https://github.com/Gamaroff/agent-skills/issues/411) — OPEN
**Verdict:** ⚠️ CONCERNS

Effort: `medium`. Diff scope: `origin/develop...origin/feature/task.111.local-ci-parity` excluding `*/references/*` (auto-generated bundle copies) and `package-lock.json` — 34 files, +2989/−134. Both lenses ran (code + conformance), read-only.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.111.implementation.1.local-ci-parity-initial-run.md` |
| Review report | ✅ | `task.111.review.1.local-ci-parity.md` (READY TO IMPLEMENT 8/10) |
| QA reports | 9 | `task.111.qa.1…9.local-ci-parity.md` |
| Gate | PASS | `task.111.gate.9.local-ci-parity.yml` (100/100, `top_issues: []`, cycle entry `Proceeding to 5c`) |
| DoD | ❌ | not yet — expected; Step 7 `/finalise` has not run |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none (none expected) |

Nine cycles: the 5-cycle budget was lifted by the user for this run (Decisions Log). QA report count matches gate count.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1 `npm run ci` runs all seven lanes and exits 0 on `develop` | `package.json` `ci` composite; `ci-gate-parity.test.mjs` asserts the lane set matches the three green-defining jobs. Exit 0 as one command not observed in the trail (PC-1) — each lane green individually; the one full run tripped a pre-existing `handoff-verify` flake | ⚠️ partial |
| SC-2 wrapper test covers story/task/bug wrappers, population from the tree | `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` | ✅ met |
| SC-3 `quick_validate.py` fails on description > 1,024; every skill passes after trim | `skills/create-skill/scripts/quick_validate.py`, `tests/skill-frontmatter.test.js`; `skills/develop-story/SKILL.md` trimmed | ✅ met |
| SC-4 missing `shellcheck` reported, not silently passed | `scripts/lint-shell.sh` loud-skip branch | ✅ met |
| SC-5 releases checklist names `npm run ci` and the lanes it does not mirror | `docs/contributing/releases.md`, `CONTRIBUTING.md` | ✅ met |
| SC-6 parity test reads all three jobs, fails on an unclassified step | `evals/shared/tests/ci-gate-parity.test.mjs` (PyYAML reader, job-blind mutant red per gate 9) | ✅ met |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: medium — SC-1 (task.111.local-ci-parity.md:212) vs implementation report :69
  SC-1 requires `npm run ci` to exit 0, but the only end-to-end run recorded stopped at `npm test` on a
  pre-existing session-handoff flake; the composite has been proven lane-by-lane, never observed exiting 0 as one command.
  → Run `npm run ci` once end-to-end where handoff-verify passes and record exit 0 + wall time, or amend SC-1 to
    state the lane-by-lane proof explicitly. (The develop-next merge gate runs `npm run ci` before merge — that run is the evidence.)

[PC-2] trail · medium · confidence: high — task.111.implementation.1.local-ci-parity-initial-run.md:39 and :229
  The Pipeline Progress row for Steps 5–6 still reads "Needs Attention … 5 cycles … loop limit reached, 5c not run"
  and Completion reads "QA Iterations: 5 (limit)", contradicting the report's own `### QA Cycle 9` entry and gate 9.
  → Update the Step 5–6 row to 9 cycles / gate 9 PASS / 5c verdict, and Completion's QA Iterations to 9.

[PC-3] scope · low · confidence: high — .github/workflows/shellcheck.yml vs task.111.local-ci-parity.md:190
  Files Summary promises a "one-line twin comment only" in shellcheck.yml; the diff also rewrites four header
  lines and adds an eight-line LOCAL TWIN block (comment-only, no behaviour change).
  → Amend the Files Summary row to "header comment updated (no behaviour change)", or trim to the single line.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — package.json:51
  `check:generated` regenerates tracked files as a side effect and then `git diff --exit-code`s README.md, so
  `npm run ci` on a tree with an unrelated uncommitted README/catalog edit goes red with a "generated drift"
  verdict CI (clean checkout) would never give.
  → Snapshot dirty state first and refuse with "commit or stash first", or diff the regenerated output in a temp copy.

[CR-2] bug · low · confidence: medium — evals/shared/tests/ci-gate-parity.test.mjs:81
  LANE_TWINS declares `validate:all` the twin of validate.yml's "Validate all skills", but CI validates every
  `skills/*/` directory while `validate:all` skips directories without SKILL.md — green locally, red in CI for that input.
  → Align the two loops in the same commit so the twin predicts CI.

[CR-3] cleanup · low · confidence: high — package.json:24
  The `ci` composite runs the four cheap new lanes after `eval:all`, so a shellcheck warning or stale catalog
  is only reported after the slow replay evals finish.
  → Reorder: ci:fast && validate:all && check:generated && bundle:check && lint:shell && eval:all (parity test compares sets).

[CR-4] cleanup · low · confidence: high — evals/shared/tests/ci-gate-parity.test.mjs:291
  `jobStepsFromText` is a one-line alias for `stepsOfJob(parseWorkflow(text), job)`, yet the two-job test inlines
  that expression three times. (Also gate 9 recommendations.future.)
  → Use `jobStepsFromText` in the two-job test.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "SC-1 (task.111.local-ci-parity.md:212) vs task.111.implementation.1.local-ci-parity-initial-run.md:69"
    finding: "SC-1 requires npm run ci to exit 0, but the composite has only been proven lane-by-lane and never observed exiting 0 as one command in the trail."
    suggested_action: "Run npm run ci end-to-end where handoff-verify passes and record exit 0 and wall time, or amend SC-1 to state the lane-by-lane proof."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "task.111.implementation.1.local-ci-parity-initial-run.md:39"
    finding: "The Pipeline Progress Steps 5–6 row and Completion QA Iterations still describe a 5-cycle loop-limit halt, contradicting the QA Cycle 9 entry and gate 9."
    suggested_action: "Update the Steps 5–6 row to 9 cycles, gate 9 PASS, 5c verdict, and Completion QA Iterations to 9."
  - id: PC-3
    category: scope
    severity: low
    confidence: high
    ref: ".github/workflows/shellcheck.yml"
    finding: "Files Summary promises a one-line twin comment in shellcheck.yml but the diff rewrites the header and adds an eight-line comment block (no behaviour change)."
    suggested_action: "Amend the Files Summary row to say header comment updated, or trim the edit to the single twin line."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "package.json:51"
    finding: "check:generated mutates tracked files then diffs the whole README.md, so an unrelated uncommitted README or catalog edit makes npm run ci fail with a generated-drift verdict CI would not give."
    suggested_action: "Refuse on a dirty snapshot of the three paths with a clear message, or diff regenerated output in a temp copy instead of mutating the working tree."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "evals/shared/tests/ci-gate-parity.test.mjs:81"
    finding: "validate:all skips skills/* directories without SKILL.md while the CI Validate all skills step validates every directory, so the declared twin can be green locally and red in CI."
    suggested_action: "Align the two loops so the twin predicts CI."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "package.json:24"
    finding: "The ci composite runs the four cheap lanes after eval:all so cheap failures are reported last."
    suggested_action: "Reorder the composite to run the cheap lanes before eval:all."
  - id: CR-4
    category: cleanup
    severity: low
    confidence: high
    ref: "evals/shared/tests/ci-gate-parity.test.mjs:291"
    finding: "jobStepsFromText exists but the two-job test inlines stepsOfJob(parseWorkflow(text), job) three times."
    suggested_action: "Use jobStepsFromText in the two-job test."
truncated_count: 0
```

## Recommended Actions

1. Fix the implementation report's Pipeline Progress row and Completion block (PC-2) — done by the orchestrator when recording this verdict.
2. Treat the `npm run ci` run at the develop-next merge gate as the SC-1 end-to-end evidence and record its exit code and wall time in the implementation report (PC-1).
3. Carry CR-1, CR-2, CR-3 and PC-3 forward as follow-ups (observation log / a small follow-up task); none blocks merge.
