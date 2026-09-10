# Implementation Report: run the card preflight where the defect is created

**Task**: `task.102.authoring-time-card-preflight.md`
**Run Number**: 1
**Started**: 2026-09-10 08:05
**Status**: In Progress

---

## Summary

Move the three tracker-card section specs into one shared definition and call the offline
`checkCardSections` preflight at the end of `create-task`, `create-story` and `create-epic`, so the
defect is caught where it is introduced rather than one step later in `review-*` or a push–CI round
trip.

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
| Board status        | In Progress ✅ — issue #372 created in Step 2, boarded, Priority P2         |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.102.*` exists in git                              | `feature/task.102.authoring-time-card-preflight` created at `927ffe35`, pushed with tracking. Tracker signal skipped — no linked issue. | —                    |
| 2. review-task             | ✅ Done    | `task.102.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT, 8/10. 0 Critical, 4 Important (all applied), 2 Optional. Report: `task.102.review.1.authoring-time-card-preflight.md`. Status Draft → Ready for Development. | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 4 phases. 11 new tests, 4 mutations proved red. `npm run ci:fast` green (3047 tests, 0 fail). 1 develop iteration; 2 fast-gate runs (first red on prettier only). | —                    |
| 4. create-pr               | 🔄 In progress | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.102.qa.{N}.*.md`; `task.102.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.102.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-10

- **Invoked by `/develop-next`** (autonomous run, item T102, source `task-registry` — no roadmap
  phase held an actionable row). Every Phase 0d question auto-answered with its recommended option
  per the develop-next directive; no prompt was issued.
- Feature branch base: **develop** — auto-derived recommended option (Q1). Current branch is
  `develop`; task is standalone, not part of an epic integration branch.
- PR target branch: **develop** — auto-derived recommended option (Q2). Standard Gitflow for a
  standalone task.
- qa-planning gate: skipped (auto — no prompt).
- **Phase 0a-parallel subagents were not dispatched.** The session carries an explicit standing
  instruction not to use the Agent tool unless the user requests it. All three agents' outputs were
  derived inline instead: the file path was supplied directly by the selector (Agent 1 unnecessary),
  the tracker poller is moot (no `jira_key`/`github_issue` in frontmatter — `TRACKER=github`,
  `TRACKER_ISSUE` empty), and the lite-mode inputs were read from the document.
- **Pipeline mode: standard** — computed from `risk_level: low` (risk_ok = true) AND
  `phase_count = 4` (§ 6 Implementation Plan has four phases; **not** < 3) AND `single_module =
  false` (scope spans `shared/resources/` plus six skills). Two of three conditions fail, so `lite`
  is not available and standard is correct.
- Task status is `draft` — per the Phase 0c develop-task status table, this proceeds; Step 2
  (`/review-task`) validates and promotes it.

### Step 2 — review-task — 2026-09-10

- **review-task output format**: Comprehensive report — required for pipeline audit trail (auto).
- **Tracker sync**: auto-answered "Sync to GitHub" (recommended). Dedup search for
  `in:title "[Task 102]"` returned zero matches; issue **#372** created, milestone
  `Technical Tasks (standalone)`, labels `task` + `priority:medium`, added to board `Agent Skills`
  (#1), board Priority set to **P2**. `github_issue: 372` written to frontmatter + body link.
  Board **Estimate** field does not exist on that project — estimate skipped (board config gap).
- **review-task Step 8.5 auto-answered**: "Yes, apply all critical + important fixes" — pipeline
  proceeds autonomously. 4 applied, 0 skipped.
- **review-task Step 9 auto-answered**: "Yes, fixes complete" — status promoted
  `draft → ready-for-development` in frontmatter and body, `updated: 2026-09-10`, two Change Log
  rows written (0.2 verdict row + blank-version status row).
- **Phase 1.5 pre-pass subagents not dispatched** — same standing no-Agent instruction as Phase 0.
  Both axes covered inline by enumerating every `CARD_SECTIONS` definition and every `check-card`
  call site in the tree; that scan is what produced findings 2–4.
- **Review outcome: READY TO IMPLEMENT (8/10)**. The four Important findings, all verified against
  the tree rather than inferred:
  1. `create-epic` does **not** bundle `references/jira-sync.js` — § 3's "no new install surface"
     claim held for only two of the three skills.
  2. § 4's `create-bug-report` exclusion rested on a false premise — bug reports are not barred from
     tracker cards; `sync-jira-bug.js:53` defines `BUG_CARD_SECTIONS` and `:476` supports
     `--check-card`. The barred rule concerns the Change Log.
  3. There are **four** section specs, not three. Success Criterion 4 ("exactly one place") is
     unsatisfiable without enumeration while `BUG_CARD_SECTIONS` stays behind — the § 7 trap inside
     the assertion written to prevent it. Scope widened to four.
  4. Bug reports have **no** preflight at any layer (authoring 0, `review-bug` 0, CI corpus absent).
     Recorded as a deferred follow-up rather than absorbed into scope.
- Review comment posted to issue #372 — `reason: posted`.

### Step 3 — develop — 2026-09-10

**Phase 1 — one definition.** All four specs (`TASK_`, `STORY_`, `EPIC_`, `BUG_CARD_SECTIONS`) moved
into `shared/resources/jira-sync.js`, immediately above `buildCardSections`, plus a new
`CARD_SECTIONS_BY_KIND` map so a caller looks a spec up by kind rather than importing four names.
Each `sync-jira-*` script now reads `const X_CARD_SECTIONS = lib.X_CARD_SECTIONS;` and re-exports it,
so every existing caller and test is untouched.

**Phase 2 — the authoring call.** Added `shared/resources/card-preflight.js`: a thin, **tracker-
neutral** CLI over `checkCardSections`, which defines no sections of its own. Called from
`create-task` § 4.6, `create-story` § 6.2a and `create-epic` § Card Preflight. Advisory by default —
exit 0 even with findings; `--strict` exists for a batch linter and no `create-*` skill passes it.
The contract lives once in `shared/resources/authoring-card-preflight.md`.

**Phase 4 — bundle.** `npm run bundle` pulled `card-preflight.js`, `jira-sync.js` and
`authoring-card-preflight.md` into all three `create-*` skills' `references/`, and rewrote the
`shared/resources/…` path in each SKILL.md to `references/…`. **`create-epic` received
`jira-sync.js` for the first time** — exactly the new install-surface entry the Step 2 review
predicted after finding § 3's claim was false for that skill.

#### The § 8 decision — Success Criterion 8

**The three lists are "what a document must contain", not "Jira card sections". Tracker-agnostic.**

Two pieces of evidence decide it, and neither is a matter of taste:

1. The corpus preflight in `shared/resources/tests/jira-sync-card-summary.test.mjs` applies these
   lists to every task, story and epic document in **this** repository, which syncs to **GitHub**.
   A rule enforced against GitHub documents is not a property of Jira.
2. Under platform-aware skill exclusion (task.83) or install profiles (task.84), a GitHub-only
   consumer may not have `sync-jira-*` installed at all. An authoring-time check that reached the
   spec through a Jira-only skill would simply not run for them — which is the same as not existing.

**What the placement now follows from that, and what it does not.** The public authoring surface is
`card-preflight.js`: a tracker-neutral name, no Jira dependency of its own, and the thing every
`create-*` skill calls. The spec **definitions** stay in `jira-sync.js`, beside `checkCardSections`,
which is their only consumer — splitting a definition from the function that consumes it, purely for
a naming reason, would trade a real coupling for a cosmetic one, and the bundler pulls `jira-sync.js`
in behind `card-preflight.js` either way.

**The residual tension is named rather than claimed resolved.** The identifiers were already
tracker-neutral (`TASK_CARD_SECTIONS`, not `JIRA_TASK_SECTIONS`) and the new map continues that. The
*file* is still Jira-named. That is a defensible stopping point — the module is the shared document
library that four sync skills and six others already bundle, not a Jira client — but it is a stopping
point, not an answer, and a future task that renames the module should move these with it. What was
in tension before, and is not now, is the **reachability**: nothing tracker-specific gates access to
the specs any more.

**Testing.** New suite `shared/resources/tests/card-preflight.test.mjs` — 11 assertions:

- **A (anti-vacuity, the point of the task):** a fixture reproducing `task.99`'s exact shape — an
  Overview plus a bespoke `## 7. The rule to add` in place of `## Success Criteria` — must produce a
  `critical` finding naming the heading to add. Also asserts the CLI is advisory (exit 0) and that
  `--strict` is the only route to a non-zero exit.
- **B (one definition, with a non-vacuity floor):** exactly **4** `const *_CARD_SECTIONS = [`
  definitions exist in **source**, all in `shared/resources/jira-sync.js`, one per kind. The floor
  fails on 0 as loudly as on 2, so a drifted pattern cannot masquerade as a clean tree. A companion
  test asserts every generated `references/jira-sync.js` is byte-identical to the source modulo the
  one AUTO-GENERATED banner line — because one authored definition is only one *effective*
  definition while the copies match it, and a forgotten `npm run bundle` is precisely a second,
  older spec.
- **C (SC7 — no sync skill installed):** copies only `card-preflight.js` and the libraries it
  requires into a temp dir and runs it there. If the preflight ever reaches into a `sync-jira-*`
  skill, this goes red.
- **D:** all three `create-*` skills invoke it, and none restates the spec.

**Mutation proof — every assertion family was reverted and confirmed red:**

| Mutation | Result |
| :--- | :--- |
| Remove the preflight call from `create-task/SKILL.md` | 1 fail |
| Re-declare `BUG_CARD_SECTIONS` locally in `sync-jira-bug` | 2 fail |
| Make `checkCardSections` always return `ok` (an inert check) | 5 fail |
| Append a line to one bundled `references/jira-sync.js` (stale bundle) | 1 fail |
| *(restored)* | **11 pass** |

**Gate.** `npm run ci:fast` — first run red on `prettier --check` only (the two new files); after
`prettier --write` and a re-bundle, green: **3047 tests, 0 failures**. No test glob change was needed
— `shared/resources/tests/*.test.mjs` is already in `package.json`'s `test` script.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **No production lite-mode CLI exists in this repo.** Phase 0c states the lite-mode inputs are
  resolved by "the production lite-mode CLI" run by 0a-parallel Agent 3, and warns "Do NOT re-parse
  the document's headings yourself". A search found only
  `shared/resources/develop-pipeline-lite-mode.md` — the contract, no executable. The three booleans
  were therefore read from the document directly, which is the only path available. Logged rather
  than silently absorbed: the reference names a component that is not present.

### Two things that went wrong in Step 3, recorded rather than smoothed over

**1. A comment moved into a bundled file changed the bundle graph — 16k lines of it.**

The bundler's shared-reference matcher (`SHARED_REF_RE` in `create-skill/scripts/bundle_skill.py`)
scans for the literal string `shared/resources/<path>` **anywhere in a file, comments included**, and
copies every hit into the bundling skill's `references/`. The four spec comments I moved each carried
`see shared/resources/tracker-card-summary.md`, and one carried the corpus test's path. Harmless
where they were — `sync-jira-*/scripts/` is not itself bundled — but `jira-sync.js` is bundled into
**21** skills, so the first `npm run bundle` after the move added a 646-line test file and a 172-line
doc to twenty skills that do not use either: **+16,000 lines of generated churn** across the diff.

This is the "bundling churn" risk the task's own § 12 table named, arriving through a route the table
did not anticipate — not an import cycle, a *comment*.

Fixed by naming siblings without the prefix (`see tracker-card-summary.md`), which the matcher does
not follow, and by leaving a comment in `jira-sync.js` explaining why — otherwise the next editor
restores the "correct" full paths and silently re-adds the churn. Diff after the fix: **46 files,
12,678 insertions**, essentially all of it `create-epic`'s first copy of `jira-sync.js` and its
transitive deps, which is the cost the review already priced.

**2. `git checkout -- skills/` silently reverted Phases 1 and 2.**

Cleaning up the bad bundle, I ran `git checkout -- skills/` followed by `git clean -fdq skills/` to
drop the wrongly-generated files. Both commands did exactly what they say, and between them they
also reverted the four `sync-jira-*` re-export edits and all three `create-*` SKILL.md edits — the
entire content of Phases 1 and 2 — because those live under `skills/` too. Nothing failed; `git
status` afterwards simply showed less work than had been done.

Caught by re-reading `git status` rather than by any check, which is the uncomfortable part. Both
phases were re-applied from the same scripted edits and re-verified: 11/11 tests, then the full fast
gate. The lesson worth carrying is narrow and mechanical — **a path-scoped `git checkout`/`git clean`
inside a pipeline step does not distinguish "files this step generated wrongly" from "files this step
authored correctly"**, and in a repo where generated and authored files share a directory tree, that
distinction is the whole game.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.102.authoring-time-card-preflight`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
