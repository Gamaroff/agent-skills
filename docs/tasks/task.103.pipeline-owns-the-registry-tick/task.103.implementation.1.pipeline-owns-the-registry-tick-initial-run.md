# Implementation Report: Nothing updates the task-registry row after a task is accepted

**Task**: `task.103.pipeline-owns-the-registry-tick.md`
**Run Number**: 1
**Started**: 2026-09-10 09:25
**Status**: Complete

---

## Summary

Give the task-registry status tick an owner: land a mutation-proven drift check first, measure the sibling registries, then decide and implement (or deliberately decline) the automated write.

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
| Board status        | In Progress ✅ (issue #374 created in Step 2; work-started signal deferred from Step 1 and run then) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.103.*` exists in git                              | `feature/task.103.pipeline-owns-the-registry-tick` created at `1e2f4787`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.103.review.{N}.{name}.md` exists (or skip logged)                | `task.103.review.1.pipeline-owns-the-registry-tick.md` — READY TO IMPLEMENT, 9/10, 0 critical / 4 important / 1 optional, all fixed in place. Status Draft → Ready for Development | — (pre-pass run inline) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 5 phases. Added the drift check (3 tests) + `registry-tick.js` (11 tests); wired into `finalise`; standard rewritten. 8 mutations run, each red the correct test. Fast gate caught prettier on the two new files — fixed, re-bundled. | — (inline) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #375: https://github.com/Gamaroff/agent-skills/pull/375 — 4 commits, base `develop`, `Closes #374`. State OPEN, head `018648a60b43` matches local HEAD. | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.103.qa.{N}.*.md`; `task.103.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ✅ Done    | `task.103.dod.{N}.*.md`; task `status: accepted`                       | DoD 9/9. CI first sampled PENDING — acceptance withheld until green on the final head. Security `measured`: 9 probes, 0 reproduced. Registry row ticked by the task's own mechanism (`reason: ticked`). | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final report state committed and pushed | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-10

- Invoked from `/develop-next` (item T103, `source: task-registry` — no roadmap phase held an actionable row).
- **AUTONOMOUS RUN directive in force**: Phase 0d questions auto-answered with the recommended option; no prompt issued.
  - Q1 Feature branch base: **develop** — auto-derived recommended option (current branch is `develop`).
  - Q2 PR target branch: **develop** — auto-derived recommended option.
- qa-planning gate: skipped (auto — no prompt).
- Phase 0a-parallel: subagents **not** dispatched. Resolver unnecessary (an explicit, existing file path was supplied); tracker poller and lite-mode detector performed inline instead — both are single-file reads, and this session's operating instructions restrict subagent use. Inputs read directly from the task document.
- Pipeline mode: **standard** — computed from `risk_ok = ("medium" ∈ {low, absent}) = false`, `phase_count = 5` (§ 6 Phases 1–5, not < 3), `single_module = false` (scope spans `shared/resources/`, `skills/`, `docs/standards/` and a test suite). All three booleans fail; `standard` on any one.
- Always-load files resolved: 3 files — `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present).
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=` (empty) — task document carries no `github_issue:`. Tracker signalling skipped at Phase 0; Step 2 (`/review-task`) may create the issue via `ensure-task-github-issue`.
- Task status at entry: `draft` — permitted for `develop-task`; Step 2 promotes it. Noted, not halted.
- **Step 2 review-task auto-answers** (pipeline mode, per `develop-pipeline-autonomous-defaults.md` and review-task's own pipeline notes):
  - Step 0 output format: **Comprehensive report**.
  - Step 0a branch setup: auto-skipped — already on `feature/task.103.*`.
  - Step 2 check 5 tracker sync: **Sync to GitHub** — *not covered by the defaults table*. Decided from the corpus rather than invented: 5 of the last 6 tasks (97, 98, 100, 101, 102) carry `github_issue`, and the pipeline's own tracker signalling is inert without one. Dedup search (`gh issue list --search 'in:title "[Task 103]"' --state all`) returned zero matches before creating. Issue **#374** created, added to board "Agent Skills", Priority P2. Estimate field not present on that board — warned and continued.
  - Step 8.5 apply fixes: **Yes, apply all critical + important**.
  - Step 9 status update: **Yes, fixes complete** → `draft` → `ready-for-development`.
- **Phase 1.5 pre-pass subagents not dispatched.** review-task specifies two parallel Explore agents (B: architecture alignment, C: codebase already-implemented). Both axes were established inline instead, for two reasons: this session's operating instructions restrict subagent use, and both questions reduce to bounded greps over a known tree. Substitute evidence is recorded in the review report §2 — `alignment: no-drift` from the test-glob and step-file checks; `implementation_status: not-implemented` from `grep -rl task-registry` over `evals/`, `shared/resources/tests/` and `scripts/`, which found only a selector-parsing test, a status-vocabulary corpus test, and the consumer installer. Recorded as a deviation so a reader does not read "pre-pass complete" into a step that ran differently.
- Step 1: implementation report stashed before branch creation, restored cleanly after.
- Step 1 "Signal Work Started": skipped — `TRACKER_ISSUE` empty (no `github_issue:` on the task document), so per the 0c-reg contract the entire section is skipped with no fallback register.

---

### Step 4 — Create PR — 2026-09-10

- `SCOPE_PATHS`: `docs/tasks/task.103.pipeline-owns-the-registry-tick`, `docs/standards/task-registry.md`,
  `docs/development/epic-registry.md`, `skills/finalise`, `shared/resources`, `evals/shared/tests`,
  `CHANGELOG.md`. Derived from the working tree rather than `git diff develop...HEAD`, which was empty
  — the branch had no commits yet at this point. Pre-flight guard held nothing: every untracked file
  fell inside a scope path. Leak check after commit: clean.
- Four logical commits rather than one: the check, the writer, the standard + data fixes, the task
  documents. The check is committed **before** the writer deliberately — it is the half that is worth
  landing even if the ownership decision had gone the other way, and the history should say so.
- The implementation report is committed **here**, at Step 4, not withheld to Step 8 — a reviewer needs
  the audit trail during QA, and the task document links to it, which would otherwise be a dangling
  relative link that resolves locally and fails in CI.
- A pre-commit hook re-ran `npm run bundle`. It emitted `⚠️  shared/resources/<name> not found`;
  **verified pre-existing on `develop`** via a detached worktree probe (2 occurrences there), so it is
  not something this branch introduced.
- Post-PR verification: PR #375 state `OPEN`, head `018648a60b43` equals local `HEAD`.
- GitHub board `in-review`: `stage-disabled` — not mapped in this project's `pipeline:` block. Correct
  outcome, exits 0, nothing to do.

### Step 3 — Develop — 2026-09-10

- Fast-gate precondition (run once, before iteration 1): `develop.fastGateCommand` is unset in
  `skills-config.yaml`, so the suggested fallback `npm run ci:fast` applies. Extracted
  `GATE_SCRIPT=ci:fast` and confirmed `npm run` lists it. ✅ resolves — no HALT.
- Plan file discovery: none. No `task.103.plan.*.md` exists beside the task; proceeding without one
  (plan files are optional).
- **Pre-develop surface map: 11 files** — established inline rather than by an Explore subagent, same
  reason and same deviation record as the Phase 1.5 pre-pass above.

  | File | Why it matters |
  | :--- | :--- |
  | `docs/tasks/task-registry.md` | The registry under test. 96 data rows; columns `# \| Title \| Status \| Category \| Priority \| Created \| Issue \| Depends on`; the "Quick commands" block is **fenced** and must not be parsed as data. |
  | `skills/develop-next/scripts/select-next.mjs` | **The reuse target.** Already exports `parseRegistry(text, kind, registryPath)` (fence-aware, header-mapped, returns `{rows, malformed, warnings}` with `registryStatus` + resolved `path`), `parseFrontmatterStatus(text)`, and `TASK_LIFECYCLE_STATUSES`. The drift check imports these — it must not restate the vocabulary or re-implement the table parser. |
  | `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` | The nearest sibling and the convention to mirror: `node:test`, `REPO_ROOT` via `fileURLToPath`, dynamic `import(pathToFileURL(SELECT_NEXT))`, and an explicit "imported, never restated" comment. Already parses this exact registry — but compares row status against the *lifecycle vocabulary*, not against the document. That is the gap. |
  | `package.json` | `test` script enumerates globs by hand; `evals/shared/tests/*.test.mjs` is present, which is why the new suite goes there. |
  | `docs/standards/task-registry.md` | Phase 5 target (48 lines). |
  | `docs/bugs/bug-registry.md`, `docs/development/epic-registry.md` | Phase 2 measurement targets. `parseRegistry(…, "bug", …)` handles the first; the epic registry has no `parseRegistry` kind. |
  | `skills/finalise/SKILL.md` | Candidate § 3 owner — 1783 lines, zero registry references today. |
  | `shared/resources/develop-pipeline-step-7-finalise.md` | Where a `finalise`-owner change would actually be authored (bundled → `references/`). |
  | `skills/develop-next/SKILL.md` | Candidate § 3 owner — Step 4 is the post-merge tick moment. |
  | `shared/resources/yaml-subset.js` | CommonJS `parseYamlSubset`; available if richer frontmatter is needed than `parseFrontmatterStatus` gives. |

### Registry-tick ownership decision (task § 3, Phase 3) — 2026-09-10

**Chosen: `finalise` owns the write.** The Phase 1 check is retained as the backstop, not replaced.

**Why, in the order the reasons actually carry weight:**

1. **One event, one writer.** `finalise` already writes the document's `status: accepted` and
   `completed_date`. Folding the row write into the same step means the row and the document cannot
   disagree *by construction*. A check is strictly weaker: it can only report a disagreement that
   already exists.
2. **The "runs before merge" objection in the task's own table does not survive contact with the
   two columns.** It reads: *"it runs before merge, so `accepted` precedes the merge PR the row wants
   to cite."* That conflates the **Status** column with the **notes/Issue** column. The Status column
   mirrors the document's status — which is *also* set pre-merge — so a pre-merge tick keeps them
   consistent rather than breaking them. The PR citation lives in a prose column that no check and no
   consumer reads. Separating the two dissolves the objection instead of trading it away.
3. **The post-merge owner would make the new check fire on a legitimate workflow.** Its stated
   weakness — "a manually-run `finalise` would not tick" — is worse than it sounds once the check
   exists: anyone finalising outside `/develop-next` accepts a task, the row stays behind, and CI goes
   red on correct work. That buys enforcement by manufacturing false failures.
4. **"A check, not a write" was the option most likely to be right, and implementation is what ruled
   it out.** The task explicitly warned not to skip past it, so it was taken seriously. What settles
   it: once the check exists, *every* task acceptance reds CI until someone hand-edits the row in the
   same PR. That is not the status quo made visible — it is a new mandatory manual step on every task,
   forever, at the exact moment the pipeline is otherwise hands-free. The check turns out to be the
   thing that makes automation necessary rather than optional.

**Rejected, explicitly:** post-merge ownership in `develop-task`/`develop-next` (reason 3); check-only
(reason 4).

**What was built to make § 8's tests possible.** The write is a CLI —
`shared/resources/registry-tick.js` — not a paragraph in `finalise/SKILL.md`. § 8 demands proof of two
behaviours: that lite mode still ticks, and that a story run does not attempt a task-registry write.
Both are claims about what the code does. Implemented as prose, the only available test is a grep of
that prose, which proves the sentence exists and not that the behaviour holds — the failure this
repo has already recorded (0 of 27 defects caught on task.84). As a CLI, both are ordinary tests that
run the thing and inspect the bytes.

The lite-mode test is worth naming because it asserts an *absence*: the CLI has no mode input, so the
test pins its entire argument surface (`--dry-run --file --help --json --registry`). A future
`--skip-in-lite` cannot be added without that test failing and the question being answered
deliberately. Lite mode has skipped Step 7 side-effects in this pipeline before; that is why the task
asked.

### Sibling registry measurement (task § 3 Scope, Phase 2) — 2026-09-10

Same comparison, run as a one-off probe rather than a committed test — the task's § 4 keeps both
registries out of scope *pending evidence*, and a check is a scope decision, not a measurement.

| Registry | Rows | Documents unreadable | Terminal-status drift | Terminal value compared |
| :--- | ---: | ---: | ---: | :--- |
| `docs/tasks/task-registry.md` | 105 | 0 | **0** | `accepted` |
| `docs/bugs/bug-registry.md` | 12 | 0 | **0** | `closed` |
| `docs/development/epic-registry.md` | 4 | 0 | **1** (epic 3) | `accepted` |

**Bug registry: clean.** No evidence, so scope stays as § 4 says — nothing built, nothing changed.

**Epic registry: one stale row of four.** Epic 3's row read `📋 Planned` while its document read
`✅ Accepted` and all three of its stories read `accepted`. **Corrected in this PR.** Leaving a row
known to be wrong is worse than the drift this task was written about, and the registry's own notes
set that precedent (rows 56–58 / 62–64, swept 2026-08-29 for the same reason).

**No epic drift *check* was built, and that is a deliberate stop rather than an omission.** Building
one needs a decision this task has no mandate to make: epic documents carry
`status: "✅ Accepted"` — an emoji-decorated Title Case string — while
`shared/resources/document-status-lifecycle.md` specifies `lowercase-kebab-case` for frontmatter. Any
epic check must either normalise that or fix it, and fixing it touches every epic document and the
`review-epic` / `sync-*-epic` path. **Filed as a deferred follow-up** below.

**My first epic measurement was wrong in both directions**, and the correction is recorded because it
is the same class of defect this task exists to prevent. The probe compared
`parseFrontmatterStatus(...) === "accepted"` without stripping the emoji, so it reported epics 1, 2
and 4 as DRIFT (they agree) and epic 3 as *agree* (it was the only real drift) — a confidently
formatted table, entirely inverted. It was caught only by reading the raw `status:` lines rather than
trusting the summary. An instrument that returns a clean answer has not thereby been shown to work.

### Deferred follow-ups (not in this task's scope)

1. **Epic frontmatter status violates the documented lifecycle.** All four epic documents carry
   `status: "✅ Accepted"`; the lifecycle spec says `lowercase-kebab-case`. Until that is settled,
   an epic drift check cannot be written without embedding a second normalisation rule. Worth a task.
2. **The epic registry has no `parseRegistry` kind.** `select-next.mjs` knows `task` and `bug`; the
   epic table has a different column set (`Epic # | Tracker key | Domain / feature | Folder | Title |
   Status | Created`) and links a *folder*, not a document. A check would need parser support, which
   is the same "import, never restate" argument as everywhere else.
3. **The registry's notes/`Issue` column is still hand-written.** `registry-tick.js` writes only the
   Status cell. Citing the merge PR in the row remains manual and is the one part of the original
   "post-merge owner" argument that survives — a post-merge step could fill it. Nothing reads it, so
   it is not urgent.

### Steps 5–6 — QA cycle 1 — 2026-09-10

**qa-task gate 1: FAIL, 80/100** — 1 HIGH, 1 MEDIUM, 2 LOW. Artifacts:
`task.103.qa.1.*.md`, `task.103.gate.1.*.yml`.

The HIGH is worth recording in full, because it is the task's own thesis turned back on it. The drift
check iterated registry **rows**, so a task document with no row at all was invisible to it — while
`finalise/SKILL.md:932`, its DoD line, and the rewritten standard all told a reader that CI would
catch exactly that case. A backstop trusted for a case it does not cover is worse than no backstop,
and it is the same shape as the defect this task was filed about: a standard naming an owner that
owned nothing.

**And it was not hypothetical.** The document-driven test found **task 97** on its first run:
`status: accepted`, merged under PR #350 on 2026-09-08, and absent from `docs/tasks/task-registry.md`
since creation — never written, not merely stale. 106 task directories, 105 rows. Every check in this
repository, including the one written earlier in this very task, had been structurally incapable of
seeing it. The row was added in the fix cycle.

**qa-fix cycle 1 — all four findings resolved:**

| Finding | Fix |
| :--- | :--- |
| TASK-103-001 (high) | Fourth test: walks `docs/tasks/task.{N}.*/`, resolves each directory's primary document, fails on any with no registry row. Own floor (`MIN_DOCS = 90`, separate from `MIN_ROWS` because the two walks fail independently). Plus the missing row for task 97. |
| TASK-103-002 (medium) | The tick now preserves the cell's **exact width**, not merely some padding; the test compares cell and row lengths instead of matching `accepted +`. Both boundaries (no padding, cell too narrow) asserted rather than left to a comment. |
| TASK-103-003 (low) | Removed the no-op `replace(/^(\s*)\|/, "$1\|")`. |
| TASK-103-004 (low) | Rewrote the guard comment to describe the code's actual asymmetry: the filename stem is required, `type` may only contradict it, an absent `type` passes. |

**Mutation proofs for the fixes** (Step 3.5 — a fix is new code, not the closure of a finding):

| Mutation | Expected red | Result |
| :--- | :--- | :--- |
| Remove row 97 again | document-driven test | ✅ correct test |
| Gut the directory walk to match nothing | `MIN_DOCS` floor | ✅ correct test **and correct assertion** — message read "examined only 0 task directories", not the orphan assertion |
| Revert width preservation | width test | ✅ correct test |
| Tighten the guard to reject an absent `type` | *(nothing)* | ❌ **survived** — see below |
| Revert EOL preservation | line-endings test | ✅ correct test |

**Two mutants survived and both were closed rather than explained away.**

1. Tightening the guard to `docType !== "task"` reddened nothing. The rule I had just written into the
   comment was checked nowhere — which is precisely the overstatement class TASK-103-002 and -004 were
   about, reintroduced by their own fix. Added `a task document with no type frontmatter is still
   ticked`; the mutation now reds it.
2. The adversarial pass over the fixes (Step 3.5, "bulk teardown / in-flight / error path / reconnect"
   applied to a file rewrite) found that `split(/\r?\n/).join("\n")` silently normalises a **CRLF**
   registry to LF — every line changes, turning a one-cell tick into a whole-file diff. That is the
   same harm width preservation exists to prevent, in the other dimension, and invisible in a rendered
   diff. Probed on a real CRLF fixture: 5 CRLF before, 0 after. Fixed by detecting the file's own EOL,
   tested, and mutation-proven.

Test count: 14 → **18** (4 drift-check, 14 registry-tick).

### Steps 5–6 — QA cycle 2 (refute pass) — 2026-09-10

**Gate 2: PASS, 95/100, zero open findings.** Cycle 1's four findings all verified closed by
mutation.

The refute pass — unscoped, the whole branch diff, read to falsify rather than confirm — found
**three further issues, every one inside cycle 1's own fixes.** That is the expected yield of a
refute pass, not a surprising one: a fix is the least-reviewed code in a change set.

| Finding | Severity | Resolution |
| :--- | :--- | :--- |
| TASK-103-005 — `develop-batch`'s write-disjointness no longer holds for task batches | low | Documented in the standard. Not a code fix: fixing it means reversing the § 3 decision, and the cost is one table-row conflict |
| TASK-103-006 — the new document walk had **its own silent skip** | medium | Unparseable directories now collected and asserted empty, with the naming standard named |
| TASK-103-007 — the EOL heuristic got **mixed-ending** files backwards | low | Heuristic **removed**: the split keeps its separators, so only the target line is ever rewritten |

**TASK-103-006 is the one worth remembering.** The fix for "the check is blind to what it does not
iterate" reintroduced exactly that, one level down: a `continue` past any directory not matching
`^task\.(\d+)\.`. Probed by creating `docs/tasks/task-oddname-no-number/` holding an accepted
document — suite stayed 4/0 green. The lesson is not that a `continue` is wrong; it is that a
`continue` in a checker is a silent exemption and must be collected, the way `parseRegistry` already
collects `malformed[]` rather than dropping rows.

**TASK-103-007's resolution is better than its fix.** Cycle 1 answered "which line ending does this
file use?" with a guess. Cycle 2 removed the question: `split(/(\r?\n)/)` keeps the separators, so
every byte outside the one cell survives by construction rather than by rule. Two tests pin it,
including a mixed-ending file asserted byte-for-byte.

**I corrected my own severity rating on TASK-103-005 mid-cycle**, and recorded it in the QA report
rather than quietly filing the lower number: I first rated it medium assuming every batch would
conflict, then established that git merges edits to distant lines cleanly and only *adjacent* row
numbers collide. The rating followed the evidence.

**Two mutants survived across the whole loop, and neither was explained away:**

1. Tightening the story guard to reject an absent `type` reddened nothing — the rule TASK-103-004's
   fix had just written into a comment was checked nowhere. Same overstatement class the fix was
   addressing, reintroduced by the fix. Test added; the mutation now reds it.
2. The CRLF normalisation, found by applying Step 3.5's transition probes to a file rewrite.

Test count across the loop: 14 → 18 → **19**.

### Step 5c — PR conformance review — 2026-09-10

**Verdict: 🚨 REQUEST CHANGES.** Report: `task.103.pr-review.1.pipeline-owns-the-registry-tick.md`.
Code lens: zero findings. Conformance lens: three, one blocking.

**PC-1 (coverage, high/high) — criterion 4 had no committed test, and its accidental protection
expired inside this run.**

Success criterion 4 says `cancelled` and in-flight tasks must not trip the check; § 8 names it as a
required test; both QA reports recorded it as verified. It was verified — by three ad-hoc mutations
during development, **none of which was committed**. What remained in the tree was two comments.

The conformance lens established, by probe, that the criterion was protected only by *incidental
corpus state*: replacing the `accepted` predicate with full-string equality currently reds the suite,
but only because task 103's own row (`draft`) disagreed with its own document (`ready-for-review`).
Simulating the post-Step-7 state — document `accepted`, row ticked — leaves the corpus at
`{accepted/accepted: 102, cancelled/cancelled: 1, planned/planned: 3}`, entirely self-consistent on
full strings, and the same mutation then passes **4/4**.

So **Step 7 of this very run would have silently removed the only thing protecting criterion 4.**
That is the third instance in one task of the same shape — a guarantee that does not hold. The first
was the standard naming an owner that owned nothing; the second was the check being blind to absence;
this is the third.

**The first fix for it was itself vacuous, and that is worth recording.** I wrote a synthetic-fixture
test that computed the predicate *inline* — asserting the rule while leaving the implementation free
to drift away from it. A mutation to the production comparison would have reddened the corpus test
and left the new test green. Caught by asking what the mutation would actually red, before running
it. Resolved by extracting `disagreesOnAcceptance()` and routing **both** tests through it, so the
fixture exercises the implementation rather than restating it.

Mutation proof, run with the corpus deliberately placed in its post-Step-7 state so the coincidence
could not do the work: full-string comparison reds `cancelled and in-flight rows do not trip the
agreement check`, and only that test.

**PC-2 (scope, low)** — the diff edits `docs/development/epic-registry.md`, which § 3 lists as out of
scope. No action: § 3's own measure-first clause admits it, the measurement is recorded, and the
correction is verified against all three of epic 3's stories. Flagged for the record.

**PC-3 (trail, low)** — § 7 Files Summary omitted `CHANGELOG.md`. Added.

### Steps 5–6 — QA cycle 3 + Step 5c re-run — 2026-09-10

**Gate 3: PASS 96/100, zero findings.** Scoped re-review (`since gate 2`; `SAFETY_REPROBE` false from
gate 2's `OK reasoned` security axis). Three files changed, one of them source.

**Step 5c re-run: ✅ APPROVE.** Report: `task.103.pr-review.2.*.md`. Both lenses clean. All nine
success criteria now have evidence **in the tree** — 20 committed tests — rather than in a report.

**Loop totals:** 3 QA cycles + 2 PR conformance reviews. 13 mutations, each checked against which
test *and*, where a test held two assertions, which assertion. Two survivors, both closed with new
tests.

| Cycle | Gate | Score | What it found |
| :--- | :--- | ---: | :--- |
| 1 | FAIL | 80 | Check blind to absence — and fixing it found task 97 |
| 2 | PASS | 95 | Three issues *inside* cycle 1's own fixes |
| 5c.1 | REQUEST CHANGES | — | Criterion 4's coverage was incidental corpus state, expiring at Step 7 |
| 3 | PASS | 96 | Nothing new |
| 5c.2 | APPROVE | — | Nothing |

**Worth recording, because it is the run's own lesson.** Three of this task's defects were the same
shape — *a guarantee asserted in prose with nothing behind it*. The standard named an owner that
owned nothing (the task's premise). The check was cited for a case it could not see (cycle 1). A
criterion was ticked on evidence about to expire (5c). Each was caught by a **different** lens, and
none by the one that introduced it — which is the argument for having more than one, and is exactly
the failure mode this task was filed about.

### Step 7 — Finalise — 2026-09-10

**ACCEPTED.** DoD 9/9, CI green, security `measured`.

- **The CI gate fired, and withholding was the right call.** The rollup's first sample read `PENDING`
  with the `test` job `IN_PROGRESS`. Acceptance was withheld and the rollup polled to completion
  rather than assumed — which is precisely the failure mode that gate documents (a pending rollup
  rounded up to green). Final: `SUCCESS` on `2a3024dcdab5`, equal to local `HEAD`.
- **Security moved from `reasoned` to `measured`.** `registry-tick.js` is a boundary — it decides
  task-vs-not-task and accepted-vs-not from document content it does not control, then writes a file
  on that decision. Nine adversarial candidates were **executed**: `type: story` under a task-shaped
  filename, `type: bug` likewise, a `type: task` document with a non-conforming filename, Title-Case
  and quoted and comment-trailing status values, an uppercase `type`, no frontmatter at all, and a
  `../` path. **None reproduced.** Gate 3's `reasoned` was accurate for QA, which executed none.
- **One probe was scored a mismatch and re-run, because the expectation was wrong rather than the
  code.** `status: planned  # was accepted` returns `not-accepted` — correct, but the input does not
  *discriminate*: a failure to strip the comment gives the same verdict. Replaced with
  `status: accepted  # done`, which does discriminate. Recorded because a probe that cannot fail is
  the same defect as a test that cannot fail, one layer out.
- **The mechanism's first live use was on its own row.** `registry-tick.js` returned `reason: ticked`
  (`draft` → `accepted`, line 145), and the drift check re-run immediately afterwards stayed green.
  The writer and the backstop agreeing about the same file in the same run is the property the § 3
  decision was chosen for.
- **The Issue cell was filled by hand**, as the standard says it must be: `registry-tick.js` writes
  only the Status column. This is deferred follow-up 3 in its concrete form.
- Issue #374: Document link re-pointed to `develop` **before** closing (the feature branch dies at
  merge), commented, closed, verified `CLOSED`. Board `done`: `already` — the close had advanced it.

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 1 tracker signal deferred, not skipped.** Phase 0c found no `github_issue:` on the task, so
  Step 1's "Signal Work Started" had nothing to address and was skipped per contract. Step 2's
  review-task check 5 then created issue **#374**, at which point the signal became possible; it was
  run immediately after (work-started comment posted, board `Todo → In Progress`, verified). The lock's
  `tracker_issue` was backfilled to `374` in the same turn. Recorded because the pipeline contract says
  the signal runs "exactly once per pipeline", and this run's single execution happened at Step 2
  rather than Step 1.
- **The fast gate caught a formatting failure the test suite would have let through.** `npm run ci:fast`
  exited 1 on `prettier --check` for `shared/resources/registry-tick.js` and
  `shared/resources/tests/registry-tick.test.mjs` while every functional test was green. This is
  precisely the task-67 failure the gate's formatting half was added for — a branch that passes
  `npm test` locally and goes red in CI. Fixed with `prettier --write`, then `npm run bundle` re-run
  so the generated `skills/finalise/references/registry-tick.js` matched its reformatted source.
- **My first Phase 2 epic measurement was inverted, and a formatted table made it look authoritative.**
  Detailed under "Sibling registry measurement" above. Recorded here too because the lesson is the
  operative one for this task: a clean-looking result is a claim about the instrument, not a finding.
- **`estimated_effort_hours: 4` sits exactly on the rubric's divergence threshold.** Recomputed rubric
  is 8h; `|4−8|/8 = 0.50`, which does not exceed the `> 0.5` trigger, so no finding was raised. Left
  as authored. Worth revisiting after the § 3 decision — the true cost depends on whether a write is
  implemented.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion Summary

Task 103 gave the task-registry tick an owner and, more importantly, made its absence loud.

**What shipped:** a drift check that fails CI when a task document and its registry row disagree
about acceptance *or when a document has no row at all*; `registry-tick.js`, called from `/finalise`
at the moment it already writes `status: accepted`; the standard rewritten to name the real owner;
and two live data defects corrected along the way.

**The § 3 decision** — `finalise` owns the write — was settled by implementation rather than by
argument: once the check exists, every task acceptance reds CI until someone hand-edits the row, so
the check is what makes automation necessary rather than optional. Post-merge ownership was rejected
because it would red CI on anyone finalising outside `/develop-next`.

**Two live defects found in passing**, neither of which this task set out to find:

- **task 97** — accepted, merged under PR #350, and absent from the registry since creation. 106 task
  directories against 105 rows. Every check in the repository, including the one written earlier in
  this same task, was structurally incapable of seeing it.
- **epic 3** — its registry row read `Planned` while the document and all three of its stories read
  `accepted`. Found by the Phase 2 sibling measurement the task's scope section demanded before any
  widening.

**The run's own lesson.** Three of this task's defects were the same shape — *a guarantee asserted in
prose with nothing behind it*. The standard named an owner that owned nothing; the drift check was
cited for a case it could not see; a success criterion was ticked on evidence due to expire at
Step 7. **Each was found by a different lens** — `review-task`, QA cycle 1, Step 5c — **and none by
the one that introduced it.** That is the argument for having more than one lens, and it is the same
failure mode the task was filed about.

Two further self-corrections are recorded rather than smoothed over: the first fix for the Step 5c
finding was itself vacuous (it asserted the rule while leaving the implementation free to drift), and
one security probe was scored a mismatch when the expectation, not the code, was wrong.

**Numbers:** 3 QA cycles, 2 PR conformance reviews, 13 mutations (2 survivors, both closed with new
tests), 9 security probes with 0 reproduced, 20 committed tests, CI green on the final head.

## Completion

**Finished**: 2026-09-10 11:00
**Final Status**: Completed
**Branch**: `feature/task.103.pipeline-owns-the-registry-tick`
**PR**: #375 — https://github.com/Gamaroff/agent-skills/pull/375
**QA Iterations**: 3 (FAIL 80 → PASS 95 → [5c REQUEST CHANGES] → PASS 96 → 5c APPROVE)
**DoD Summary**: `task.103.dod.1.pipeline-owns-the-registry-tick.md` — ACCEPTED
**Tracker debt**: none — `access.tracker` is `full`; every tracker action was performed, not deferred
