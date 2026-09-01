# Implementation Report: Pin the bug-axis divergence exactly instead of asserting it loosely

**Task**: `task.72.pin-bug-axis-divergence.md`
**Run Number**: 1
**Started**: 2026-09-01 21:35
**Status**: In Progress

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
| 3. develop                 | ⏳ Pending | Task status == `Ready for Review`                                      |       | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.72.qa.{N}.*.md`; `task.72.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.72.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

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

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: `feature/task.72.pin-bug-axis-divergence`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
