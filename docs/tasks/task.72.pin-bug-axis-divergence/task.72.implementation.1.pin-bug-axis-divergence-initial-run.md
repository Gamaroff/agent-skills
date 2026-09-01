# Implementation Report: Pin the bug-axis divergence exactly instead of asserting it loosely

**Task**: `task.72.pin-bug-axis-divergence.md`
**Run Number**: 1
**Started**: 2026-09-01 21:35
**Status**: Complete

---

## Summary

Replace the loose subset assertion in test `16/H1` with one that pins the bug-axis eligibility gap exactly (`{in-progress, ready-for-qa}`), and record why the bug axis keeps a divergence the task axis was made to close.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                         |
| PR target           | `develop`                                                                                                                         |
| qa-planning gate    | skipped (auto)                                                                                                                    |
| Task risk level     | low                                                                                                                               |
| Pipeline mode       | standard                                                                                                                          |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #287 (GitHub)                                                                                                                     |
| Board status        | In Progress ✅ (Todo → In Progress, verified; Priority already `P2 Medium`, not overwritten)                                       |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.72.*` exists in git                               | `feature/task.72.pin-bug-axis-divergence` created from `develop` at `76fa87f`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.72.review.{N}.{name}.md` exists (or skip logged)                 | `task.72.review.1.pin-bug-axis-divergence.md` — READY TO IMPLEMENT, 9/10, 0 critical / 1 important / 1 optional; both fixes applied; `planned → ready-for-development` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 3 phases complete; 4 mutations proved red and reverted; `npm run ci:fast` exit 0 (2141 tests, 0 fail, Prettier clean); committed `49c910a` | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #296](https://github.com/Gamaroff/agent-skills/pull/296) → `develop`; issue #287 commented (`posted`); board `in-review` → `stage-disabled` (correct, exit 0) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.72.qa.{N}.*.md`; `task.72.gate.{N}.*.yml`; PR comment posted     | 2 cycles. C1: CONCERNS 90/100 (TASK72-001) → qa-fix → C2 refute pass: **PASS 100/100**. 7 probes | —                    |
| 7. finalise                | ✅ Done    | `task.72.dod.{N}.*.md`; task `status: accepted`                        | DoD 9/9 PASS; `status: accepted`; CI polled PENDING→SUCCESS on the accepted head; issue #287 closed; board `already` Done | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final artifacts committed and pushed to PR #296 | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Step 2 — review-task — 2026-09-01

- **Output format auto-answered: "Comprehensive report"** — required for the pipeline audit trail.
- **Step 0a branch setup auto-skipped** — already on `feature/task.72.pin-bug-axis-divergence`.
- **Phase 1.5 pre-pass run inline rather than via Explore subagents** (Agent dispatch prohibited in this session). Both axes were covered directly: architecture alignment by reading the three always-load concept docs and `skills-config.yaml`; already-implemented status by reading the three target files. Verification was stronger than a summary would have been — all ten of §3's technical claims were checked verbatim against source.
- **Verdict: READY TO IMPLEMENT, 9/10** — 0 critical, 1 important, 1 optional.
- **Step 8.5 auto-answered: "Yes, apply all critical + important fixes"** — both findings applied.
  - *Important*: §8 mutation 3 named the anti-vacuity guard but could not reach it — the guard reads only the parsed dispatcher table (`STEP0_BUG`), never `BUG_ELIGIBLE_STATUSES`. Split into two mutations; §8 now lists four, and the new fourth corrupts the dispatcher table so the guard is actually exercised.
  - *Optional*: dispatcher line anchor `:58-64` → `:57-63`.
- **Step 8.6 skipped** — `TRACKER=github`, not Jira.
- **Step 9 auto-answered: "Yes, fixes complete"** — `planned → ready-for-development` in frontmatter and both body `**Status:**` lines; two Change Log rows written (verdict `1.1`, transition blank-version) with `updated: 2026-09-01` in the same edit.
- **Step 10**: review outcome posted to issue #287 — `reason: posted`.

### Step 3 — develop — 2026-09-01

- **Bundling hazard checked before editing.** `skills/develop-next/references/roadmap-selection.md` sits in a `references/` directory, which is where `npm run bundle` overwrites files from `shared/resources/`. Verified it is **skill-owned**, not bundled: no `shared/resources/roadmap-selection.md` exists, the file carries no `AUTO-GENERATED — DO NOT EDIT` marker, and it is the only copy in the tree. Editing it directly is therefore safe and will not be reverted by the next bundle.
- **`STEP0_BUG` path verified** as `skills/develop-bug/references/...` (git-tracked), not `.agents/skills/...` (a gitignored symlink) — the plan flags that a test reading through the symlink passes locally and fails in CI.
- **Phase 1 applied** — the `for (const status of BUG_ELIGIBLE_STATUSES)` subset loop is replaced by `assert.deepStrictEqual(gap, ["in-progress", "ready-for-qa"], …)` on the sorted set difference; the failure message names the parsed set, the floor, the current gap, and what each direction means. Test renamed to `16/H1: the bug-axis gap is exactly {in-progress, ready-for-qa}`.
- **Anti-vacuity guard preserved verbatim** and moved *inside* the test body above the new assertion, with a comment recording why it is not redundant: an empty parse fails `deepStrictEqual` anyway, but a parse returning the *wrong* rows can still yield a two-element gap, and only the guard catches that.
- **Phase 2 applied** — the rationale comment now leads with the resume-affordance distinction, quoting both dispatchers verbatim; `roadmap-selection.md`'s bug row reads **pinned exactly** and its prose paragraph was rewritten to give the semantic reason before the risk one; both `select-next.mjs` comment blocks updated. The one surviving "weaker `⊆`" mention (`:69`) is a historical statement about what the rule *originally* was, and now continues "…so neither axis is `⊆` any more" — correct as written, so it stays.
- **Plan file aligned to the corrected task document** — its Testing Approach repeated the pre-review mutation-3 mislabelling; it now lists four mutations with the same split and carries the explanation of why only the fourth reaches the guard.

- **Pre-develop surface map: 4 files** (recorded directly rather than via an Explore subagent — Agent dispatch is prohibited in this session, and all four files were already read verbatim during Step 2's verification, which is a stronger source than a summary):
  - `evals/develop-next/unit/select-next.test.mjs` — bug half of `16/H1` at `:1951-1963`, its rationale comment at `:1940-1950`, the task-axis `deepStrictEqual` at `:1917-1937` (the shape to imitate), `proceedStatuses()` and `STEP0_BUG` at `:1848`.
  - `skills/develop-next/scripts/select-next.mjs` — `BUG_ELIGIBLE_STATUSES` at `:114`; the two "weaker `⊆`" comment blocks at `:69` and `:108`.
  - `skills/develop-next/references/roadmap-selection.md` — eligibility table bug row at `:78`; the "bug axis keeps `⊆`" paragraph at `:87`.
  - `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` — read-only input; status-guard table at `:57-63`.
- **Plan file found**: `task.72.plan.pin-bug-axis-divergence.md` — included as implementation context. It carries literal before/after code for every edit.
- **Plan/document divergence noted**: the plan's Testing Approach repeats the mutation-3 mislabelling the Step 2 review corrected in the task document ("guard survives: delete `new` from `BUG_ELIGIBLE_STATUSES`"). Per the alignment rule the **document is the source of truth**, so the plan is being brought into line with the corrected §8 — four mutations, with the guard proved by corrupting the dispatcher table.
- **Always-load files**: 3 read and passed as context (coding-standards, tech-stack, source-tree).
- **Fast gate**: `develop.fastGateCommand` absent → default `npm run ci:fast` (`format:check && test`).
- **Planned/Draft gate**: auto-answered Yes — `/review-task` validated in Step 2.

### Pipeline Startup — 2026-09-01

- **Invoked by `/develop-next`** (autonomous run) — item **T72**, selected from `docs/development/project-completion-roadmap.md` (Phase 5, line 87, `deps: none`, `source: roadmap`).
- **Feature branch base: `develop`** — auto-answered (AUTONOMOUS RUN directive: take the recommended option; current branch was `develop`).
- **PR target branch: `develop`** — auto-answered (AUTONOMOUS RUN directive: recommended option).
- **qa-planning gate**: skipped (auto — no prompt).
- **Phase 0a resolver not dispatched** — the task file path was supplied inline by the selector (`item.commandArg`), so resolution was already complete.
- **Agents 2–3 replaced by direct CLI/Bash reads** — the harness for this session prohibits `Agent` dispatch unless the user requests it; the same inputs (frontmatter, phase count, module scope, `skills-config.yaml`, GitHub issue state) were read directly, which is deterministic and equivalent.
- **PIPELINE_MODE = standard** — computed from `risk_ok = true` (`risk_level: low`), `phase_count = 3` (**not** `< 3` — §6 defines Phases 1–3), `single_module = true`. The phase-count condition fails, so lite mode does not apply.
- **Always-load files resolved: 3 files** — from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- **Task status `planned`** — per the Phase 0c status table, proceed; Step 2 (`/review-task`) validates and promotes to `Ready for Development`.
- **Step 1 tracker signal**: comment `reason: posted`; board `work-started` → landed `In Progress` (from `Todo`), verified.
- **Dependency check**: task.72 declares `depends_on: task.71`; task.71 frontmatter is `status: accepted`, so the dependency is satisfied.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 2 — duplicate tracker comment avoided (non-blocking).** `review-task` Step 10 posts the review outcome under stage `review-task`; the orchestrator's Step 2 doc also specifies a comment under stage `review`. The two carry different idempotency markers, so both would post and the issue would carry near-identical comments. The `review-task` comment is strictly more detailed (it names both fixes and the status transition), so the orchestrator's duplicate was skipped. Logged rather than silently dropped.

---

### Mutation proofs — Step 3, all four executed and reverted

| # | Mutation | Expected | Assertion that actually fired | Result |
|---|---|---|---|---|
| 1 | Add `in-progress` to `BUG_ELIGIBLE_STATUSES` (gap shrinks to `{ready-for-qa}`) | red | gap assertion — *"the bug-axis gap is no longer exactly…"* | ✅ RED |
| 2 | Add a fifth proceed-row (`awaiting-triage`) to `develop-bug`'s status table (gap grows) | red | gap assertion | ✅ RED |
| 3 | Delete `new` from `BUG_ELIGIBLE_STATUSES` (gap grows to 3) | red **via the gap assertion** | gap assertion — *"the bug-axis gap is no longer exactly…"* | ✅ RED |
| 4 | Rename the `new` row in `develop-bug-step-0-resolve-bug.md` so the parse returns wrong rows | red **via the guard** | anti-vacuity guard — *"parsed proceed-set looks wrong: brand-new, reopened, in-progress, ready-for-qa"* | ✅ RED |

**Mutations 3 and 4 empirically confirm the Step 2 review finding.** The pre-review §8 collapsed both into one mutation and claimed it proved the anti-vacuity guard. Run separately, mutation 3 fires the *gap assertion* and never touches the guard — exactly as predicted, because the guard reads only the parsed dispatcher table and never `BUG_ELIGIBLE_STATUSES`. Only mutation 4, which corrupts the parse, reaches it. Had the mutations not been split, the guard would have been recorded as proven while remaining entirely unexercised — the failure mode §10 Risk 2 names as this repo's recurring one.

Mutation 2 is the headline proof: it is the drift the old `⊆` was structurally blind to (a wider `proceed` set still contains `{new, reopened}`), and it is the reason the task exists.

After every mutation the file was restored; `git diff` confirms `develop-bug-step-0-resolve-bug.md` is untouched and `BUG_ELIGIBLE_STATUSES` is byte-identical to `HEAD` (§9 functional criterion 1).

---

## QA Iteration History

### Cycle 1 — qa-task — 2026-09-01

- **Gate: CONCERNS, 90/100.** 0 HIGH, 1 MEDIUM, 0 LOW. Artifacts: `task.72.qa.1.pin-bug-axis-divergence.md`, `task.72.gate.1.pin-bug-axis-divergence.yml`.
- **Review strategy**: direct tools (3 phases, single module, low risk, test-and-comment-only diff). First review → whole-branch diff.
- **All functional and structural success criteria verified**, including `BUG_ELIGIBLE_STATUSES` byte-identity against `origin/develop`.
- **Five mutation/vacuity probes.** Four red (three via the gap assertion, one via the anti-vacuity guard), plus a QA-added fifth that correctly stays **green**: widening both sides by the same status leaves the gap unchanged. That fifth probe is the one establishing *scope* rather than sensitivity — it confirms the assertion pins the difference rather than either set.
- **The review's mutation split was empirically vindicated.** Probe 3 (delete `new` from the floor) fired the *gap assertion* and never touched the guard, exactly as the Step 2 review predicted. Collapsed with probe 4 as originally written, the guard would have been recorded as proven while never being driven red.
- **Stale-reference sweep** found no live document still describing the bug axis as `⊆`; the two hits (`task.65` docs, `CHANGELOG.md:387`) are historical records, correctly untouched.
- **Step 4b not applicable** — no `SKILL.md` or `shared/resources/*.md` in the change set; verified rather than assumed.
- **Finding TASK72-001 (MEDIUM)**: the task-72 sentences were inserted mid-paragraph in `select-next.mjs`, stranding the pre-existing `Pinned by …` clause on the wrong antecedent — it describes the task axis but now trails a bug-axis sentence. Introduced by this change, in the comment block the task exists to make accurate. → Step 6.
- PR comment and issue comment both posted.

---

## Completion

**Finished**: 2026-09-01
**Final Status**: Completed
**Branch**: `feature/task.72.pin-bug-axis-divergence`
**PR**: [#296](https://github.com/Gamaroff/agent-skills/pull/296)
**QA Iterations**: 2 (cycle 1 CONCERNS 90/100 → qa-fix → cycle 2 PASS 100/100)
**DoD Summary**: [task.72.dod.1.pin-bug-axis-divergence.md](./task.72.dod.1.pin-bug-axis-divergence.md)
**Tracker debt**: none — every tracker action completed (comment posted, issue closed and verified, board already Done)

### Cycle 1 — qa-fix — 2026-09-01

- **TASK72-001 fixed** (`cabc135`). The task-72 sentences were moved out of the middle of the task-axis paragraph into their own paragraph that names `develop-bug`'s table explicitly. Verified by `diff` against `origin/develop`: lines 69–74 are **byte-identical** to their pre-change form.
- Not mutation-proved, deliberately — a comment-only change has no behaviour to revert. The assertions it describes were unchanged by this commit.
- `npm run ci:fast` exit 0 — 2141 tests, 0 failures, Prettier clean. PR comment posted.

### Cycle 2 — qa-task (refute pass) — 2026-09-01

- **Gate: PASS, 100/100.** Artifacts: `task.72.qa.2.*.md`, `task.72.gate.2.*.yml`. TASK72-001 verified closed by byte-diff.
- **Ran as a full refute pass over the whole branch diff**, per the cycle-2 rule — reviewing to find what is false, starting with cycle 1's own fix.
- **No code defect found. One real evidence gap found and closed.** Cycle 1 credited the anti-vacuity guard as mutation-proven by the *rename* mutation. That mutation yields a **three**-element gap, which `deepStrictEqual` rejects on its own — the guard fired only because it sits above the assertion, so the mutation was double-covered and proved nothing specific to the guard.
- **The discriminating mutation is to *delete* the row**: `proceed` becomes `{reopened, in-progress, ready-for-qa}`, the gap stays at exactly `{in-progress, ready-for-qa}`, `deepStrictEqual` **passes**, and only the guard fires. **Control run**: with the row deleted *and* the guard removed, the test goes **green** — the proof that the guard is load-bearing rather than redundant.
- **The guard's claim was true all along; the proof was not.** So no code fix was warranted — instead §8 gained the mutation (five now), and the guard's comment names the discriminating case and its control run inline, warning that a rename mutation is caught by both assertions. A future reader can now verify the claim instead of trusting it.
- **This is the vacuous-coverage failure §10 Risk 2 names, caught one level up** — not a test that cannot fail, but a *proof* that could not discriminate.
- Seven probes now stand behind the two assertions. PR and issue comments posted.

### Step 7 — finalise — 2026-09-01

- **DoD: 9/9 PASS → ACCEPTED.** `task.72.dod.1.pin-bug-axis-divergence.md` written; `status: accepted` in frontmatter and both body positions; `completed_date` and `pr_number: 296` added; Change Log row at **Version 1.2** (finalise is the only pipeline writer that bumps Version).
- **CI was checked, not assumed — and this mattered.** The first rollup sample returned **PENDING**: the `test` job was `IN_PROGRESS` with `conclusion: ""`, exactly the shape that a naive `.conclusion // .state` would report as green. The gate refused to round it up and the run was polled to completion; all four jobs then reported SUCCESS. The green head (`aa9e3fa`) is **identical** to the accepted head, so this is not a green on an ancestor commit.
- **DoD checks run directly rather than via four Explore subagents** (Agent dispatch prohibited this session). All four domains covered: success-criteria traceability against the diff, security (no secrets, no new dependencies, no runtime surface), compliance (N/A — substituted the repo conventions that *do* apply), and docs/changelog.
- **Bundle-drift check passed.** `npm run bundle` was re-run and produced no changes, confirming `roadmap-selection.md` is skill-owned rather than a bundled copy that the next bundle would silently revert.
- **Residual recorded, not waived**: the PR carries no human review (`reviewDecision` empty). Recorded as *unverified by human review* following task.71's precedent rather than reported as approved.
- **Side-effects all completed**: canonical PR comment posted (idempotent marker), issue #287 commented (`posted`) and **closed** (verified `CLOSED`), board `done` → `already`. Sprint Review summary written.