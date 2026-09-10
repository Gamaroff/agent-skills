# Implementation Report: Every tracker comment opens with a plain-language summary — the engine primitive

**Task**: `task.104.tracker-comment-plain-language-lead.md`
**Run Number**: 1
**Started**: 2026-09-10 11:25
**Status**: In Progress

---

## Summary

Build the plain-language lead as an engine primitive: a per-stage catalogue of non-technical lead paragraphs, rendered by `tracker-comment.js` and prepended above every posted body, with a guard that refuses to post a comment for which no lead can be produced.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto-answered — develop-next autonomous run)                    |
| PR target           | `develop` (auto-answered — develop-next autonomous run)                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | #376 added to board "Agent Skills", Priority = P2 ✅ (Estimate field absent on this board — logged, non-blocking) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.104.*` exists in git                              | `feature/task.104.tracker-comment-plain-language-lead` created from `develop` at `18839d09`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.104.review.1.tracker-comment-plain-language-lead.md`              | READY TO IMPLEMENT, 9/10, 0 critical / 2 important / 3 optional — all fixed. Issue #376 created + linked. Status promoted to Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 4 phases implemented. `ci:fast` 3106 pass / 0 fail; `eval:all` green. 3 mutation proofs recorded | `ab561e9` surface map (in-context) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.104.qa.{N}.*.md`; `task.104.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.104.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-10

- Invoked by `/develop-next` (autonomous run). Item T104 selected via the **task-registry fallback** — no roadmap phase held an actionable row.
- Feature branch base: `develop` — auto-answered with the recommended option (develop-next AUTONOMOUS RUN directive; no prompt issued).
- PR target branch: `develop` — auto-answered with the recommended option (same directive).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0b: no previous run detected (no `feature/task.104.*` branch, no PR, no implementation report) → started fresh; the resume prompt did not arise.
- Phase 0a-parallel: run **in-line rather than via Explore subagents**. Agent 1 (resolver) was not applicable — the path was supplied by the selector. Agents 2 and 3 reduce to a frontmatter read plus a `skills-config.yaml` read, both executed directly here; the deterministic reads are the authority either way, and this project has a recorded history of Explore subagents hanging.
- `PIPELINE_MODE = standard`, computed from the three inputs: `risk_level: medium` → `risk_ok = false` (set membership against {low, absent}); `phase_count = 4` (Phases 1–4 in §6) → not < 3; `single_module = false` (touches `shared/resources/` and multiple skills). All three fail, so the AND is false.
- Always-load files: 3 files resolved from `skills-config.yaml:devLoadAlwaysFiles`; all three verified present on disk.
- Tracker: `TRACKER=github` (no `JIRA_URL`). `TRACKER_ISSUE` empty — the task document carries no `github_issue:` yet.

### Step 3 — 2026-09-10

- Fast-gate precondition: `develop.fastGateCommand` is unset in `skills-config.yaml`, so the default `npm run ci:fast` applies; it resolves (`package.json` defines `ci:fast`). No HALT.
- Pre-develop surface map: one Explore subagent, 20-file budget, five targeted questions. Its highest-value answer was on bundling (below). Plan file found and used: `task.104.plan.tracker-comment-plain-language-lead.md`.
- **Bundling, the task's named LOW risk, was the one unknown worth a subagent.** `bundle_skill.py` has no manifest — `discover_needed()` walks JS siblings with `JS_SIBLING_RE = require\(["']\./(...)\.js["']\)`. So `require("./stakeholder-summary.js")` written in exactly that literal form is sufficient and no SKILL.md edit is needed; a `path.join` or a variable would silently not bundle. Verified after bundling: the module landed in all 13 skills carrying `tracker-comment.js`.
- **Design decision — the lead is composed above the access gate, not inside the GitHub arm.** The deferred-mutation record snapshots `body` into `command.stdin` and replays it through `gh issue comment --body-file -`, bypassing this engine entirely. A lead composed downstream would be missing from precisely the comments a human posts by hand. This is what the task's §5.3 anticipates, and it makes one composition point serve GitHub, Jira and the deferred record alike.
- **The Jira arm was built and tested first**, per the task's HIGH risk. Result: prefixing the lead as markdown before `textToAdfNodes` yields the lead as its own ADF **paragraph node** above the body — the required structure, achieved without touching the converter. Asserted on the node tree, never on a serialised string.
- **Accepted asymmetry, recorded rather than discovered later:** `textToAdfNodes` emits no `rule` node, so the `---` separator renders on GitHub and silently vanishes on Jira. Teaching the converter to emit rules would change every Jira description this repo has ever rendered — far beyond a comment lead — and the paragraph/heading boundary already separates the two visually. Documented in the contract.
- **`leadKind` was hoisted above the `emit` closure that reads it.** No call site was in the temporal dead zone, but a future early-exit that emitted would have thrown a `ReferenceError` instead of emitting. Cheap trap to remove.
- **Two self-inflicted regressions, both caught by the suite rather than by inspection:**
  1. A blanket argv migration added `--stage done` to the test named *"no --stage → unmarked comment"*, silently contradicting its own premise. It kept failing, which is why it was found; a narrower edit would have been safer. Replaced with two tests: the guard (exit 2 **and** zero transport calls) and the surviving property via `--summary-file`.
  2. Naming `shared/resources/tests/stakeholder-summary.test.mjs` in the standard made the bundler ship the unit test into all 13 skill distributions, creating a `references/tests/` directory in each — weight no consumer can run. Reworded to name the test without a bundler-matching path; directories removed and re-bundled.
- **A third regression was caught by CI, not by me:** `evals/shared/tests/transition-protocol-parity.test.mjs` scans shipped markdown with `/--stage\s+([a-z][a-z-]*)/` and flagged the standard's frontmatter phrase "the --stage the caller already passes" as a stage literal named `the`, in the source and all 13 bundled copies. Reworded to "the stage value the caller already passes".
- Mutation proofs (all three required by §8, each turning a **named** test red, tree restored green after each):

  | Mutation | Test that went red |
  | :--- | :--- |
  | Delete `done` from `LEAD_TEMPLATES` | `done has a lead that renders with no slots` |
  | Guard falls through instead of `return { exitCode: 2 }` | `no --stage and no --summary-file → exit 2, and NOTHING is posted` |
  | Compose `body` before `marker` in `finalBody` | `the lead sits below the marker and above the caller's body` **and** `no marker match → posts, with the marker prepended as the first line` |

- Gates: `npm run ci:fast` → 3106 pass, 0 fail. `npm run eval:all` → exit 0, every replay scenario green.

### Step 2 — 2026-09-10

- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- Step 0a branch setup auto-skipped: already on `feature/task.104.*`.
- Gate check: status was `Planned` with **no** review report on disk → run the review (the `Planned` + current-report skip did not apply; there was nothing to be fresh).
- Tracker sync auto-answered **Sync to GitHub**. Dedup search returned zero matches, so issue **#376** was created (labels `task`, `priority:medium`; milestone `Technical Tasks (standalone)`), board-added with Priority P2, and `github_issue: 376` written back to frontmatter with a body cross-reference link.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. Two important and three optional fixes applied; none required user input, so nothing was skipped.
- Step 9 auto-answered: **Yes, fixes complete** — `planned → ready-for-development` in frontmatter and body, `updated` bumped in the same edit, two Change Log rows written (1.1 verdict row + blank-version status row).
- Step 10: review comment posted to #376, `reason: posted`.
- **Verification method used**: every structural claim in the task was checked against the file it cites rather than accepted. Zero hallucinations found; the two defects were citation drift and one unsourced count.

### Step 1 — 2026-09-10

- Base branch `develop` used without prompting, per the autonomous directive (create-branch Step 3 suppressed).
- Implementation report stashed before branch creation and restored after; `git stash pop` clean.
- **Signal Work Started skipped**: `TRACKER_ISSUE` is empty, and 0c-reg says to skip the whole section when no issue is linked. Step 2 `/review-task` invokes `ensure-task-github-issue`, which is where the issue gets created; the signal is re-evaluated then.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.104.tracker-comment-plain-language-lead`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
