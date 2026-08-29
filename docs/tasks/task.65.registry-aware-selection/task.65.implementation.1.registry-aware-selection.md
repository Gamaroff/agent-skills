# Implementation Report: Derive the selection frontier from the registries

**Task**: `task.65.registry-aware-selection.md`
**Run Number**: 1
**Started**: 2026-08-29
**Status**: In Progress

---

## Summary

Add a registry-backed fallback frontier to `select-next.mjs` so an outstanding bug or task filed in
`docs/bugs/bug-registry.md` / `docs/tasks/task-registry.md` cannot be invisible to `/develop-next`.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                               |
| PR target           | develop                                                                                                                               |
| qa-planning gate    | skipped (auto)                                                                                                                        |
| Task risk level     | medium                                                                                                                                |
| Pipeline mode       | standard                                                                                                                              |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #280 (GitHub)                                                                                                                         |
| Board status        | In Progress ✅ (Todo → In Progress, verified)                                                                                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.65.*` exists in git                               | `feature/task.65.registry-aware-selection` off `develop` | — |
| 2. review-task             | ✅ Done    | `task.65.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT (9/10); 9/9 recommendations applied; status → `ready-for-development` | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 7/7 phases; 8 files; 72 → 99 unit tests; 10 mutations each reddening the tests that name them; suite 1923 pass / 0 fail | — |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #281](https://github.com/Gamaroff/agent-skills/pull/281) → `develop`; 3 commits; issue #280 commented (`posted`) | — |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.65.qa.{N}.*.md`; `task.65.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ✅ Done    | `task.65.dod.{N}.*.md`; task `status: accepted`                        | DoD PASSED; CI SUCCESS on the accepted head; issue #280 closed (verified); board Done (`already`); **2 doc gaps found and corrected** | — |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-08-29

- Invoked by `/develop-next` in **autonomous mode** — all Phase 0d questions auto-answered with the
  recommended option, no prompts issued.
- Feature branch base: **develop** — auto-answer (Q1 recommended; current branch is `develop`).
- PR target branch: **develop** — auto-answer (Q2 recommended; standard Gitflow for a standalone task).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 fan-out: run inline rather than via subagents (session policy restricts Agent dispatch);
  resolver was unnecessary (path supplied by the selector), tracker poller unnecessary (no linked
  issue), lite-mode inputs read directly from the task document.
- Pipeline mode: **standard** — `risk_level: medium` (risk_ok=false) and phase_count=5 (≥3), so two of
  the three lite conditions fail.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`, all present on disk.
- Tracker: GitHub, but the task document carries no `github_issue:` — all tracker operations skipped.
- Task status is `draft` — per Phase 0c this proceeds; Step 2 (`/review-task`) promotes it.

---

### Pipeline Resume — 2026-08-29

- Run 1 stopped between Step 2 and Step 3 without updating the Pipeline Progress table and without
  writing a lock file (no commits, no PR on the branch).
- Re-invoked as `/develop-task 65`. Phase 0b resume detected; user chose **Resume from Step 3**.
- Artifact verification: branch `feature/task.65.registry-aware-selection` exists ✅;
  `task.65.review.1.registry-aware-selection.md` exists with outcome READY TO IMPLEMENT ✅;
  task status `ready-for-development` ✅. Steps 1–2 marked ✅ Done.
- Lock file written at `current_step: 3`.
- **Tracker signal fired late**: run 1 recorded "no issue linked", but `/review-task` linked
  `github_issue: 280` afterwards. The deferred 0c-reg signal was executed on resume —
  `work-started` comment posted (`reason: posted`), board moved Todo → In Progress (verified).

### Step 3 — Develop (pre-flight) — 2026-08-29

- Pre-develop surface map (inline, not via Agent — session policy restricts Agent dispatch):
  **10 files** across `skills/develop-next/` and `evals/develop-next/`.
  - `skills/develop-next/scripts/select-next.mjs` (885 L) — `parseRoadmap` · `selectNext` (its terminal
    `roadmap-complete` return is the single insertion point) · `lintModel` · `pickItem` · `selectBatch`
    · `parseArgs`/`main`.
  - `skills/develop-next/references/roadmap-selection.md` (92 L) — the spec that must not drift.
  - `skills/develop-next/SKILL.md` — Step 1 note.
  - `.agents/skills/develop-next/scripts/select-next.mjs` — bundled copy, regenerated by `npm run bundle`.
  - `evals/develop-next/unit/select-next.test.mjs` + `unit/fixtures/01..11-*.md` — existing unit suite.
  - `evals/develop-next/protocol/skill-shape.test.mjs` — asserts the closed stop-reason set; must stay
    green unchanged (task adds no stop reason).
  - `docs/bugs/bug-registry.md` (37 L), `docs/tasks/task-registry.md` (121 L) — the two registries.
  - `docs/development/project-completion-roadmap.md`, `docs/development/roadmap-history.md` — Phase 6.
- `package.json` already globs `evals/develop-next/unit/*.test.mjs`, so new tests in that dir run under
  `npm test` without a glob edit.
- Plan file discovery: **no** `task.65.plan.*.md` — proceeding without one (optional).
- Always-load files read and passed to `/develop`: 3 architecture concept docs.

### Step 3 — Develop (complete) — 2026-08-29

- All 7 Implementation Plan phases complete. `selectNext(model, opts)` gained one optional **lazy**
  `loadRegistries` loader, invoked at exactly one line — the terminal `roadmap-complete` return.
  Injection rather than an inline filesystem read is what lets the SC9 guard assert the strong form:
  *the loader was never called*, not merely *no registry item was selected*.
- New exports: `parseRegistry`, `parseFrontmatterStatus`, `registryFrontier`,
  `BUG_ELIGIBLE_STATUSES`, `TASK_ELIGIBLE_STATUSES`. `item.source` on every selection.
- Tests 72 → 99 in `evals/develop-next/unit/select-next.test.mjs`. The SC9 stop-precedence tests were
  written **before** the fallback code, per review-task's ordering.
- **10 mutations, each reddening exactly the tests that name it** — recorded in the task document's
  Implementation Record. Notably M1b (fallback consulted before the phase loop) reddened all four SC9
  tests plus SC1, which is the guard against the fallback becoming a way to scan past a human gate.
- `evals/develop-next/protocol/skill-shape.test.mjs` stayed green **unchanged** at 19 passing — no
  stop reason was added, as the task required.
- Full suite: **1924 tests, 1923 pass, 1 skipped (pre-existing), 0 fail**, 41.7 s.
  `npm run format:check` clean; `npm run bundle` idempotent (no drift).
- SC11 verified live: with roadmap `PHASE 4` archived, `select-next.mjs` returns
  `status: selected, source: "task-registry", id: "T65"` where it previously returned
  `roadmap-complete`.

**Three deviations from the plan, all recorded in the task document:**

1. **No registry fixture file.** The drift guard reads the *document*, so a registry fixture would be
   only half a fixture — it would need a parallel tree of documents to supply the frontmatter the
   check consults. Inline builders keep a row and its document status beside the assertion about them.
2. **Phase 6 corrected six registry rows, not three.** The plan named 62–64; the same check found 56,
   57 (`planned`) and 58 (`ready-for-review`) equally stale against `accepted` documents. Safety is
   unaffected either way — all six were already excluded by the document check rather than by the row
   being right, which is itself the point of SC5.
3. **`PHASE 4` archived with `T65` unticked.** The plan said "once T65 is ticked", but T65 is this
   task and is in flight; ticking its own row would attest to a merge that has not happened. Archived
   unticked with the reason recorded in `roadmap-history.md`.

### Step 4 — Create PR — 2026-08-29

- **3 commits**, split by separable concern rather than one bulk commit:
  - `ef54b2b` `feat(develop-next)` — selector, spec, SKILL.md, 27 new tests.
  - `b88fe5f` `docs(roadmap)` — Phase 6: PHASE 4 retired, 6 registry rows corrected.
  - `8922749` `docs(task.65)` — task document, review report, implementation report, CHANGELOG.
- The **review report was committed here, not withheld**: a tracked document links to it, and an
  untracked link target resolves locally while CI (which checks out only tracked files) goes red.
- Pushed and verified: local `HEAD` == `origin/feature/task.65.registry-aware-selection`.
- PR **#281** → `develop`. Issue #280 commented with the PR link (`reason: posted`).
- Board move to `in-review`: `reason: stage-disabled` — this project has not opted that moment in.
  Correct outcome, CLI exits 0, no action needed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Run 1 stalled silently between Steps 2 and 3.** No lock file existed, so neither the PreCompact nor
  the Stop hook could fire. Resolved on resume by reconstructing state from on-disk artifacts and
  writing the lock. No work lost — the review report and task-document edits were intact but uncommitted.

---

## QA Iteration History

### Cycle 1 — 2026-08-29 — Gate: **FAIL** (60/100)

- Artifacts: `task.65.qa.1.*.md`, `task.65.gate.1.*.yml`, `task.65.bug.1.ready-for-review-selected-but-undispatchable.md`
- Suite re-run independently: 1924 tests, 1923 pass, 1 pre-existing skip, 0 fail. Format clean,
  bundle idempotent, protocol test 19 pass unchanged.
- **1 HIGH (blocking), 2 MEDIUM, 1 LOW.**
  - **H1** — `TASK_ELIGIBLE_STATUSES` admits `ready-for-review`; `develop-task` Phase 0c HALTs on it.
    The frontier nominates work the dispatcher is guaranteed to refuse, in the normal state of any
    task between development and merge. Unattended loop stops and cannot self-recover. Reproduces
    live: the selector picks T65, whose own document is `ready-for-review`. A **specification**
    defect (§ Scope, SC5) the implementation faithfully carried out — and Step 2's review missed it
    the same way, both having reasoned from `document-status-lifecycle.md` without checking the
    dispatcher's accepted set.
  - **M2** — a registry row with a non-numeric `#` cell is silently invisible (contradicts SC6).
  - **M3** — column positions assumed with no header validation (silently breaks SC4 ordering).
  - **L4** — `parseRegistry` takes the first `.md` href, not the first *work-item* href.
- **QA ran 6 mutations of its own** rather than trusting the Implementation Record's ten; all 6
  reddened. The decisive probe (loader called eagerly, result discarded) reddened all four
  stop-precedence tests — proving those assertions are about the *call*, not the outcome.
- Cross-version parity vs `origin/develop`: roadmap selection and `selectBatch` output byte-identical.
- Task status → `in-progress` per the FAIL gate.

---

### Cycle 2 — 2026-08-29 — Gate: **CONCERNS** (80/100)

- Re-review after fix cycle 1. Artifacts: `task.65.qa.2.*.md`, `task.65.gate.2.*.yml`.
- **All 4 cycle-1 findings FIXED**, each re-proved by QA independently. Bug 1 **closed**.
- H1's fix exceeded the finding: rather than correcting a value it made the floor ⊆ dispatcher rule
  *executable*, parsing both dispatchers' own status tables. QA proved non-vacuity two ways.
- **1 new MEDIUM (N1), introduced by the M2 fix** — `cols` is never reset when a table ends, so a
  second table in a registry document is parsed as registry data and pollutes `--lint`. Cannot cause
  a wrong selection. **Held by no test** (suite green 113/113 both ways). QA verified a one-line
  remedy against 6 scenarios, both real registries and the unit suite.
- **1 LOW (L5)** — SC11's wording is now unsatisfiable by construction; it was only satisfiable before
  because of the H1 defect. Mechanism proved reachable by a controlled check.
- Suite 1938 / 1937 pass / 1 pre-existing skip / 0 fail. Format clean, bundle idempotent, protocol 19
  unchanged. SC1 and SC10 re-verified byte-identical to `origin/develop` after the parser rewrite;
  all four stop reasons still return with the loader called 0×.

### Cycle 2 fix + Cycle 3 — 2026-08-29 — Gate: **PASS** (90/100)

- **qa-fix cycle 2**: N1 (one line — `cols` reset scoped to one table) + L5 (SC11 reworded to assert
  reachability). Tests 113 → 121 (§17, 8 new).
  - One of the new tests had to be **rewritten mid-cycle**: as first written the fenced-block test
    used a conventionally ordered table, so dropping the mapping at the fence fell back to the
    documented positions and produced an identical answer — it could not fail. Swapped-column fixture
    makes the fallback observable.
- **qa-task cycle 3** (verification): **PASS**, 12/12 success criteria.
  - N1 mutation-proved **both** directions (under-reset → 4 red; over-reset on the fence → 1 red).
  - QA additionally verified the *claim about the test*: reverting the fence fixture to its original
    form and re-running the over-reset mutation gave **0 red**, confirming the original was vacuous
    and the rewrite fixed it.
  - 12 probe scenarios (6 original + 6 for over-eagerness) — **no defect**.
  - 2 residual limitations recorded (LR-1 blank-line-split table, LR-2 back-to-back tables), both on
    malformed markdown, neither warranting a fix.
- Suite 1946 / 1945 pass / 1 pre-existing skip / 0 fail. Format clean, bundle idempotent, protocol 19
  unchanged across all three cycles.

**Gate progression: FAIL 60 → CONCERNS 80 → PASS 90.**

---

## Completion

**Finished**: 2026-08-29
**Final Status**: Completed
**Branch**: `feature/task.65.registry-aware-selection`
**PR**: [#281](https://github.com/Gamaroff/agent-skills/pull/281) → `develop`
**QA Iterations**: 3 (FAIL 60 → CONCERNS 80 → PASS 90)
**DoD Summary**: [task.65.dod.1.registry-aware-selection.md](./task.65.dod.1.registry-aware-selection.md)
**Tracker debt**: none — issue #280 commented at every stage and closed (verified `CLOSED`); board reached Done; no deferred mutations.

### Step 7 — Finalise — 2026-08-29

- DoD **PASSED**. CI verified rather than assumed: `SUCCESS` on the exact accepted head (local HEAD ==
  PR head, 4/4 jobs).
- **Two documentation gaps found at the gate**, neither a code defect and neither catchable by CI:
  - `CHANGELOG.md` described the **pre-fix** eligibility floor (`ready-for-development` "or later"),
    wrong exactly where it matters after H1 — `ready-for-review` *is* "later" and is now excluded.
  - `task-registry.md` row 65 still read `ready-for-development`.
  Both corrected in this step and recorded as found-here rather than presented as always-right.
- SC11's cycle-2 rewording assessed explicitly and judged a **legitimate correction**: its original
  form was satisfiable only because of defect H1, so keeping it would have meant either failing a
  correct feature or leaving a defect in to keep a sentence true.
- Carried forward, not dropped: Performance NFR **CONCERNS** (`--lint` per-row document read), and
  LR-1/LR-2 (two residual limitations on already-malformed markdown).
- Suite re-run after the finalise doc edits: 1946 / 1945 pass / 1 pre-existing skip / 0 fail; format
  clean; 40 relative links in the task directory, 0 broken.
