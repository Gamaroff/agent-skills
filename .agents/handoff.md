# Session Handoff — 2026-09-12

Read this first if you are picking up work in `agent-skills`. It records where things stand, what to
pick up, the standing decisions, and the drift that is tolerated. The **traps** — the durable half —
now live in [`docs/contributing/traps.md`](../docs/contributing/traps.md); read them before touching
anything.

**Every figure below was measured in the session that wrote this file, on 2026-09-12, and carries
the command that produced it.** Re-run the command; do not trust the date. The previous handoff
(2026-09-10) went stale within a day — it named T107 as next and "frontier not empty"; T107 merged
the next morning. That is the expected half-life of this section, not a lapse. task.110 (below) is
the mechanism that will re-measure it on read.

**State at handoff:** branch `develop` @ `6ce3280e` + this session's branch `docs/post-sweep-tie-ups`
· tag **v0.46.0** (2026-09-10) is 8 commits behind `develop` · **zero open PRs** · **zero open issues**.

| Check | Command | Result |
| --- | --- | --- |
| Hermetic suite | `command npm test` | **exit 0** — 505 bash assertions + 3,155 node tests, **0 failures**, 1 skipped |
| Bundle freshness | `command npm run bundle -- --check` | 126 skills checked, **0 problems** |
| Formatting | `command npx prettier --check .` | clean |
| Roadmap lint | `command node skills/develop-next/scripts/select-next.mjs --lint` | **0 errors, 0 warnings** |
| Frontier | `command node skills/develop-next/scripts/select-next.mjs` | **`selected B13`** (was `roadmap-complete` at session start) |
| Skill validation | `quick_validate.py` over `skills/*/` | 126/126 pass |
| Catalog / deps | inspect `docs/reference/skill-catalog.md`, `shared/resources/skill-dependencies.json` | 126 rows; 22 `invokes:` declarers, 0 mismatches |
| Orphaned tests | every `*.test.{js,mjs,sh}` vs `package.json` globs | **0 orphaned** (128/128 invoked) |
| ShellCheck | `shellcheck --severity=warning` over the 58 CI-linted sources | clean |
| Replay evals | `command npm run eval:all` | **not re-run this session** — last green 2026-09-10 |

---

## 1. What to pick up — the frontier is live again

At session start `select-next.mjs` returned **`roadmap-complete`**: no actionable row in any phase or
registry. This session filed **3 general bugs and 5 tasks** from a repo sweep, so the loop now has
work. Selection order (bugs at `new` outrank tasks; then priority):

| Id | Title | Why it is first |
| --- | --- | --- |
| **B13** | `change-log.js` drops prose and nested `###` on the un-migrated path | Confirmed by execution; silent content loss on every legacy doc's first write; carried since 09-07 as 3a(1) |
| **B14** | PreCompact hook posts bare `gh issue comment` / `gh pr comment` | Bypasses the comment contract **and** the `access.tracker` gate; the coverage test scans Markdown only |
| **B15** | `observation-log doctor` activation check is cwd-relative | Silent false-negative at the documented invocation; obs #14 |
| T108 | Bundler copies depth-relative links verbatim — 864 broken links in 229 bundled files | Known since 08-20; the freshness check certifies the breakage |
| T109 | `sync-jira-story` transition-only write gate has no `run()` test | The half of 3c task.96 did not close |
| T110 | `session-handoff` skill — write + re-measure | From the 09-08 staged proposal; this file is its first customer |
| T111 | `npm run ci` runs every CI lane; two coverage gaps | Local/CI parity |
| T112 | `hotfix.md` rewrite against `/develop-bug`'s hotfix model | task.107's deliberately-excluded sibling |

`/develop-next` will dispatch B13. There is no run-state file. **None of the eight has a GitHub
issue yet** — `create-*` tracker sync is opt-in and was not taken; `develop-bug` Step 2 /
`develop-task` Step 2 create the issue on pickup via `ensure-*-github-issue`.

`--batch` returns an empty batch on purpose: registry rows carry no `touches:` annotation, so
write-disjointness cannot be established and they never enter a parallel batch
(`roadmap-selection.md` §143). Use `/develop-next`, not `/develop-batch`, until a phase is authored.

---

## 2. Standing decisions

**The release cadence is a human call — ask before tagging.** Nine `0.x` minors since the "is this
1.0?" question was raised; v0.46.0 shipped 2026-09-10. `[Unreleased]` currently carries three merges
(#384, #385, #387) plus this session's entries. Write the CHANGELOG entry **at acceptance**, not at
release — the v0.46.0 prep found five merged tasks with no entry, and it was the one checklist box
with no mechanism.

**Roadmap rows are for phase-row items only — settled 2026-09-12.** Eight accepted tasks (T99–T105,
T107) had no roadmap Change Log row; this was the fifth recurrence of the class. Decision: not a
defect. Registry-selected items are recorded by the registry row + the document's frontmatter, both
written by `/finalise`; a roadmap Change Log row records why a *phase row* was ticked or waived and
nothing else. Stated in the roadmap's `## Housekeeping`. **Do not backfill.**

**Phase 5 is archived; no phase is open.** The registries are the whole frontier, which is the
roadmap's designed terminal state. Author a phase only to express sequencing the registries cannot.

**The 50-entry observation backlog is a separate session** (`/observe-work --review`). All 50 were
logged 09-08 → 09-11 and none actioned; the last review was 09-08. Clusters visible from the titles:
develop-next Step 4 registry tick (#13, #30, #31, #34, #35, #46 — #46 says the remedy is stale,
task.103 closed it from `finalise`), mutation-proving guidance (#32, #37, #41, #45, #47, #50, #55 →
one reference doc), finalise (#40, #48, #57, #59), card preflight (#43, #49 — 15/106 task docs),
QA vacuity (#19, #26, #29). Two un-installed items from the 09-08 staging also belong there:
`code-review-prompt.md` categories C/D (obs #3/#4) and the review-security guarantees note
(obs #5/#10). Three other staged items were superseded by later tasks; the `session-handoff`
proposal became T110. This session added obs **#63** (guard scope vs scanned scope) and **#64**
(bundler link depth).

---

## 3. Carried follow-ups — RE-MEASURED 2026-09-12

### 3a. `shared/resources/change-log.js` — content loss → **filed as B13**

Re-run by execution, not by reading. `hasMarkers:false` + H2 log + nested `###`: prose and the
nested block are lost, rows survive. The 2026-09-10 handoff said the engine had been "touched since"
09-07 — **false**: `git log -1 --format=%ci -- shared/resources/change-log.js` → 2026-08-17. No
test names the case. Full evidence and a verified repro recipe are in the bug.

### 3b. Live Jira verification (task.45) — still unrunnable here

`JIRA_URL` unset; this repo is GitHub-tracked. The four-step check is unchanged at
`docs/tasks/task.45.change-log-pipeline-and-sync/task.45.plan.change-log-pipeline-and-sync.md`
(§Phase 5, ≈209). Gate 2: staging APPROVED, production CONDITIONAL. Carry it openly.

### 3c. Missing `run()`-level tests — **half closed, half filed as T109**

task.96 (PR #343, 2026-09-07 — the same day the previous measurement was taken, which is why it was
missed) added `end-to-end.test.js` to both syncs. **Epic fast-path transition: covered**
(`skills/sync-jira-epic/tests/end-to-end.test.js:290`). **Story skipped-but-transitioned write gate:
still uncovered** — `grep -c no-transition` → story e2e 0. A probe shows the gate is correct
(`transitioned: true`, file changed, `Status → In Progress` row); only the test is missing.

### 3d. Deferred / human-gated roadmap rows — unchanged

`T41-fixtures`, `T38-fixtures` still need credentials or a scratch Projects v2 board.

---

## 4. Tolerated drift — known, recurring, not blocking

**The task-registry Status column vs the document.** Guarded since T103
(`evals/shared/tests/task-registry-drift.test.mjs`, green) on the `accepted` predicate only; a row
stale in another column is unguarded, and `select-next` rejects on the **document** status regardless.

**Roadmap rows for registry-selected items** — no longer drift; see §2.

**Consumer docs restate pipeline behaviour independently.** The 2026-09-12 sweep found no runbook
or `workflows.md` mention of the plain-language lead (user-visible since T104–106) and a bare
"Step 5c" in `faq.md:25`; both are in T112's scope. `docs-link-check.yml` does **not** run on
`skills/**` or `shared/resources/**` — the 864 broken bundled links (T108) are invisible to it.

**`.github/workflows/shellcheck.yml:63-68` hard-codes file counts** (247/266/58/55/56) after the
Unreleased entry that claimed tree-derived counts. They are dated, so compliant; re-derive when next
touched.

**Seven skills ship executable `scripts/` with no tests** (code-smell-validator, create-skill's
`generate_catalog/init_skill/package_skill/skill_frontmatter.py`, develop-task wrappers → T111,
jira-sprint-manager, jira-standup-auditor, mermaid-architect, use-railway). Mostly consumer-side
tooling; noted, not filed.

---

## 5. Traps

Moved to [`docs/contributing/traps.md`](../docs/contributing/traps.md) on 2026-09-12 — nine entries,
verbatim, with their measurement dates. They were true for months while the state above was true
for hours, and keeping them here let the half that decayed discredit the half that did not. **Add a
trap there when it has cost a session twice.**

---

## 6. Where the artifacts are

```
docs/development/project-completion-roadmap.md   live roadmap — no phase open; Deferred + Housekeeping only
docs/development/roadmap-history.md              archived Phases 1-5
docs/tasks/task-registry.md                      task numbering — next available: 113
docs/bugs/bug-registry.md                        general-bug numbering — next available: 16
docs/bugs/bug.13.* / bug.14.* / bug.15.*         the three bugs filed this session
docs/tasks/task.108.* … task.112.*               the five tasks filed this session
docs/contributing/traps.md                       the durable traps
docs/contributing/releases.md                    the release procedure and its checklist
shared/resources/change-log.js                   B13's defect lives here (untouched since 2026-08-17)
```

Pipeline conventions: `AGENTS.md`. Anti-patterns (consumer-facing): `docs/reference/anti-patterns.md`.
Design rationale: `docs/reference/faq.md`. Observation log: resolved by
`shared/resources/resolve-observation-workspace.sh`, never from the cwd — **52 files on disk**,
highest id **64**, 52 open (ids are monotonic; resolved entries are swept to `archive/`).
