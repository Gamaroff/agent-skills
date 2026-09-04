# Implementation Report: Lint for prose-matching assertions that claim a relationship but test only co-occurrence

**Task**: `task.89.relationship-assertion-lint.md`
**Run Number**: 1
**Started**: 2026-09-04 11:20
**Status**: In Progress

---

## Summary

Build a lint that flags test assertions claiming a relationship (X routes to Y, X fires at Y) while
only establishing co-occurrence, validated against the six historical instances from task 77.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.89.*` exists in git                               | `feature/task.89.relationship-assertion-lint` created from `develop` at `bf3fd5b`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.89.review.{N}.{name}.md` exists (or skip logged)                 | `task.89.review.1.relationship-assertion-lint.md` — 9/10 READY TO IMPLEMENT; 2 Critical + 4 Important found, 6 fixes applied, 2 skipped; `draft → ready-for-development` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, no stall. 4-rule lint + analyser + 8 fixtures + FP record. `npm run ci` exit 0 (ci:fast 2311/2310/0/1 skipped; eval:all exit 0). 6 mutation proofs. | — |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.89.qa.{N}.*.md`; `task.89.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.89.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-04

- Invoked by `/develop-next` (roadmap item **T89**, PHASE 5, source `roadmap`, no deps) under the
  AUTONOMOUS RUN directive: all Phase 0d questions auto-answered with the recommended option.
- Feature branch base: **develop** — auto-answered (recommended default; current branch is `develop`).
- PR target branch: **develop** — auto-answered (recommended default; standard Gitflow task branch).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0a-parallel: resolver not dispatched (explicit file path supplied); tracker poller not
  dispatched (no `github_issue`/`jira_key` in frontmatter → `TRACKER=github`, `TRACKER_ISSUE=""`);
  lite-mode inputs read inline from the task document rather than via subagent.
- Pipeline mode: **standard** — computed from `risk_level=low` (risk_ok ✅), `phase_count=0` (<3 ✅),
  `single_module=false` ❌. The change spans a new lint module, a reconstructed fixture corpus, and
  `package.json` CI wiring; per the lite-mode contract an arguable module boundary answers false.
- Always-load files resolved: 3 files — `docs/architecture/concepts/coding-standards.md`,
  `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md`
  (from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present).
- Branch created: `feature/task.89.relationship-assertion-lint` from `develop` at `bf3fd5b`; report stashed pre-branch and restored after.
- Signal Work Started: skipped — no linked tracker issue (`TRACKER_ISSUE` empty).
- Step 2 `/review-task` output format: **Comprehensive report** — auto-answered (pipeline audit trail).
- Step 2 `/review-task` Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline
  proceeds autonomously and needs the task corrected before Step 3.
- Step 2 `/review-task` Step 9 auto-answered: **Yes, fixes complete** — outcome was READY TO IMPLEMENT
  (9/10), so `draft → ready-for-development`.
- Step 2 clarifying questions (4) auto-answered from repository evidence rather than deferred; each
  answer and its basis is recorded in the review report's "User Decisions & Clarifications" section.
- Step 2 pre-pass subagents not dispatched — both axes covered inline (architecture via the three
  always-load concept docs; codebase via a repo-wide search confirming no existing lint of this class).
- Step 3 pre-develop surface map: reused from the Step 2 review rather than re-dispatching an
  Explore subagent — the review had just surveyed the same surface (`package.json`, the two
  comparable repo-wide lints in `tests/`, `pr-review-loop-parity.test.mjs`, task 77's gates 10/11,
  and the guard family's 12-commit history). No plan file exists.
- Step 3 rule set: **four rules, not three.** Instance 4 is an omission (4 of 5 values enumerated),
  not a pattern shape, so rules A–C cannot reach it and success criterion 1 would have been
  unmeetable as filed. Rule D (under-enumeration) was added and the task document updated to say so
  rather than folding it in silently.
- Step 3 lint location: `tests/relationship-assertion-lint.test.js` + `tests/lib/…lint.js`. The
  `tests/*.test.js` glob already in `npm test` picks it up with **no `package.json` change** — the
  hand-maintained-glob failure mode that once left 232 skill tests unrun is avoided by placement.
- Task status at entry: `draft` — proceeding per the develop-task status table; Step 2
  (`/review-task`) promotes it.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 2 — review-task findings (all resolved in-review)

- **[Critical C1]** Task carried 2 of 11 mandatory template sections — no Implementation Plan, Testing
  Strategy, Risk Assessment or Rollback Plan. **Resolved**: all nine missing sections authored.
- **[Critical C2]** Success criterion 1 read "from the commits named in §2" while §2 named no commits —
  the criterion was unverifiable as written. **Resolved**: gate-finding + closing-commit columns added
  to the §2 table (CY8-5/`87e5bf9`, CY9-3/`8293765`, CY10-1/`ef3a0c1`, CY11-1/`18dd5b5`,
  CY11-2/`18dd5b5`, #6/`18dd5b5`).
- **[Important I1]** No file paths or CI wiring. **Resolved**: `tests/relationship-assertion-lint.test.js`,
  picked up by the existing `tests/*.test.js` glob with no `package.json` change.
- **[Important I2]** `shared/resources/tests/` (26 files, in `npm test`) missing from the lint's target
  globs. **Resolved**: added to scope.
- **[Important I4]** False-positive criterion had no denominator, threshold or reporting location.
  **Resolved**: 1742 candidate assertions / 81 files, reported in a fixtures README, every flag triaged.
- **[Important I5]** No tracker issue linked. **Not resolved — deliberate**: tracker sync is opt-in and
  never performed unprompted; no user present in an autonomous run. Consistent with siblings T77/T90.
  Run `/sync-github-task` later if wanted.

Anti-hallucination result was clean: all nine technical claims in the task verified against the tree,
0 hallucinations.

---

## Phase 3 — false-positive measurement (the gating phase)

Measured over **2188 assertion call sites in 89 test files**. The task's filed estimate of
~1742/81 was a `grep -c` figure that undercounts multi-line call sites; the structural scanner's
number is the accurate one and the task document was corrected.

| Stage | Findings | Rate |
| --- | --- | --- |
| First implementation (shape only) | 61 | 2.8% |
| After narrowing (shape **and** claim) | 11 | 0.50% |
| After fixing the 6 true positives | 4 | 0.18% |
| Suppressed with a written reason | 4 | — |
| **Unsuppressed on a clean tree** | **0** | **0%** |

**The lint found 6 live instances of its own bug class on its first run**, three of them in
`pr-review-loop-parity.test.mjs` — residual copies of the very assertions task 77 spent eleven
gates fixing, left standing beside their own fixes. All six were fixed, not suppressed.

Two analyser bugs were found by the measurement rather than by review: `identifierRuns` required a
leading letter so `5b` was not counted and **instance 3 was invisible to rule A**; and `owns?`
matched the possessive "its own provenance header". Full record:
`tests/fixtures/relationship-assertion/README.md`.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.89.relationship-assertion-lint`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
