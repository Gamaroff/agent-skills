# Session Handoff — 2026-09-15

Read this first if you are picking up work in `agent-skills`. It records where things stand, what to
pick up, the standing decisions, and the drift that is tolerated. The **traps** — the durable half — live
in [`docs/contributing/traps.md`](../docs/contributing/traps.md); read them before touching anything.

**Every figure below was measured in the session that wrote this file, on 2026-09-15, and carries
the command that produced it.** Do not trust the date — re-measure:
`command node .agents/skills/session-handoff/scripts/handoff-verify.mjs` reports every line below as
`confirmed`, `stale` (with the new value) or `unverifiable` (with why). This file is the first one
written by that skill's write mode (task.110); the 2026-09-10 file it replaces is kept, annotated, as
`skills/session-handoff/tests/fixtures/handoff-2026-09-10.txt` — its whole value is that its figures
are known to have moved.

**State at handoff:** branch `feature/task.110.session-handoff-skill` off `develop` @ `f15f5376` ·
tag **v0.48.0** is 27 commits behind `origin/develop` · **0 open PRs** (this task's opens at Step 4) ·
**1 open issue** (#407, this task).

<!-- Half-life: hours to days. The FIRST backticked span in Command is what the verifier runs
     (read-only whitelist; prose here is reported `unverifiable: no command`). The **bold** spans in
     Result are what it compares — tokens that appear verbatim in the output; **exit 0** is compared
     against the exit code. -->

| Check | Command | Result |
| --- | --- | --- |
| Hermetic suite | `command npm test` | **exit 0** — 513 bash assertions + 3,288 node tests, **0 failures**, 1 skipped (takes ~10 min; read mode reports it `unverifiable: timeout` at the default 60 s — run it yourself) |
| Fast gate (format + suite) | `command npm run ci:fast` | **exit 0** |
| Formatting | `command npx prettier --check .` | **exit 0** |
| Bundle freshness | `command npm run bundle -- --check` | **128** skills checked, **0 problems** |
| Roadmap lint | `command node skills/develop-next/scripts/select-next.mjs --lint` | **0 errors, 0 warnings** |
| Frontier | `command node skills/develop-next/scripts/select-next.mjs` | **selected** — T110 at write time (this task; the next registry row once it merges — the id is deliberately not a bold figure) |
| Skill validation | `python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff` | **exit 0** — one skill; the loop over `skills/*/` measured 128/128 pass |
| Catalog / deps | `jq length shared/resources/skill-dependencies.json` | **128** skills in the graph (71 edges by 22 declarers); catalog 128 rows. The 09-15 draft of this row ran the *generator*, which writes — read mode refused it, which is the point |
| Orphaned tests | `grep -c skills/session-handoff/tests package.json` | **1** — the new glob is listed; the loop over every `*.test.{js,mjs,sh}` counted 136/136 invoked (excluding bundled `references/tests/` copies) |
| ShellCheck | `shellcheck --version` | **version** 0.11.0 present; clean over the 58 CI-linted sources at write time (this row only proves the binary) |
| Replay evals | `command npm run eval:all` | **exit 0** — runs in seconds in replay mode; not the reason the fast gate is fast |
| Branch tip (develop) | `git rev-parse --short origin/develop` | **f15f5376** |
| Next task number | `grep -m1 "Next Available Task Number" docs/tasks/task-registry.md` | **120** |
| Next bug number | `grep -m1 "Next Available Bug Number" docs/bugs/bug-registry.md` | **16** |

---

## 1. What to pick up

<!-- Half-life: days. Re-verified at write time; nothing carried from the 2026-09-12 file. -->

**Task.110 is in flight on this branch** — `/develop-next` dispatched it 2026-09-15 as the first
registry-fallback item; B13–B15, T108, T109 and T113–T116 merged between 09-12 and 09-14. After
T110 merges, `select-next` falls through the task registry in priority order; the remaining `planned`
rows are the ones below. <!-- cmd: grep -cw planned docs/tasks/task-registry.md; expect: 9 -->

| Id | Title | Note |
| --- | --- | --- |
| T111 | `npm run ci` runs every CI lane; two coverage gaps | local/CI parity |
| T112 | `hotfix.md` rewrite against `/develop-bug`'s hotfix model | task.107's excluded sibling |
| T117 | card preflight `heading-only` (15/106 task docs publish a bare label) | obs review |
| T118 | `probes_executed` emitted by the engine, not typed | obs #10; #10 and #17 are parked on it |
| T119 | create-skill authoring guards | obs review: 4 observations |

`/develop-next` picks the next one; there is no run-state file to clear once T110's Step 5 deletes
its own. `--batch` still returns an empty batch on purpose — registry rows carry no `touches:`
annotation, so use `/develop-next`, not `/develop-batch`, until a phase is authored.

**The 2026-09-12 staged skill edits are still not installed.** Every staged file under
`~/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills/skill-updates/` differs from
live (checked 2026-09-15 with `diff -rq`; superset classification not done). That is the user's step
— see its `PENDING.md` for the one-block install.

---

## 2. Standing decisions

<!-- Half-life: long. Re-read 2026-09-15; unchanged unless marked. -->

**The release cadence is a human call — ask before tagging.** v0.48.0 is the current tag; write the
CHANGELOG entry **at acceptance**, not at release — the v0.46.0 prep found five merged tasks with no
entry, and it was the one checklist box with no mechanism. Task.110 wrote its entry at Step 3.

**Roadmap rows are for phase-row items only — settled 2026-09-12.** Registry-selected items are
recorded by the registry row + the document's frontmatter, both written by `/finalise`; a roadmap
Change Log row records why a *phase row* was ticked or waived and nothing else. **Do not backfill.**

**Phase 5 is archived; no phase is open.** The registries are the whole frontier, which is the
roadmap's designed terminal state. Author a phase only to express sequencing the registries cannot.

**The handoff is measured, never carried — and the traps live elsewhere.** New 2026-09-15: write
mode is `skills/session-handoff/assets/handoff.template.md`, read mode is the verifier, and §5 of
this file is a pointer by construction. A figure you did not re-measure is written as prose so read
mode reports it `stale` rather than confirming it by accident.

**The observation backlog was last reviewed 2026-09-12** (`last-review-date.txt`). Parked entries
unpark when their task merges, and only the review re-checks them. <!-- cmd: cat /Users/gamaroff/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills/skill-observations/last-review-date.txt; expect: 2026-09-12 -->

---

## 3. Carried follow-ups — RE-MEASURED 2026-09-15

### 3a. `change-log.js` content loss — **closed (B13, merged 2026-09-12)**

The engine has been touched since 09-12. <!-- cmd: git log -1 --format=%ci -- shared/resources/change-log.js; expect: /2026-09-1[2-9]/ -->
The 2026-09-10 handoff's claim that it had been "touched since 09-07" was false at the time (last
touch was 2026-08-17) — the regression fixture for the verifier is built on exactly that line.

### 3b. Live Jira verification (task.45) — still unrunnable here

`JIRA_URL` unset; this repo is GitHub-tracked. <!-- cmd: git remote get-url origin; expect: /github\.com/ -->
The four-step check is unchanged at
`docs/tasks/task.45.change-log-pipeline-and-sync/task.45.plan.change-log-pipeline-and-sync.md`
(§Phase 5). Gate 2: staging APPROVED, production CONDITIONAL. Carry it openly — read mode reports
it `unverifiable` here, which is the correct verdict.

### 3c. Missing `run()`-level tests — **closed (task.109, 2026-09-14)**

`skills/sync-jira-story/tests/end-to-end.test.js` covers the skipped-but-transitioned write gate. <!-- cmd: grep -c no-transition skills/sync-jira-story/tests/end-to-end.test.js; expect: /^[1-9]/ -->

### 3d. Deferred / human-gated roadmap rows — unchanged

`T41-fixtures`, `T38-fixtures` still need credentials or a scratch Projects v2 board.

---

## 4. Tolerated drift — known, recurring, not blocking

**The task-registry Status column vs the document.** Guarded since T103
(`evals/shared/tests/task-registry-drift.test.mjs`) on the `accepted` predicate only; a row stale in
another column is unguarded, and `select-next` rejects on the **document** status regardless.

**`develop-pipeline-lite-mode.md` names a "production lite-mode CLI" that does not exist.** Phase 0
reads the three inputs from the document instead (task.110's implementation report, Phase 0). Noted,
not filed — the mechanical rule is the same either way.

**The bundler scans `tests/` for `shared/resources/` mentions.** A fixture that quotes a real
document (as the historical handoff does) makes `npm run bundle -- --check` demand six references
that are not references. Task.110 sidestepped it with a `.txt` fixture and a path assembled from
parts; a `tests/` exclusion in `bundle_skill.py` would be the real fix. Noted, not filed.

**`invokes:` declarers: the generator says 22, `grep -l '^invokes:' skills/*/SKILL.md` says 23.** One
SKILL.md declares an empty list. Harmless; the tree-wide "declares and resolves to no edges" guard is
what matters and it is green.

**`.github/workflows/shellcheck.yml` hard-codes file counts** (58 sources today). Dated, so
compliant; re-derive when next touched.

---

## 5. Traps

Live in [`docs/contributing/traps.md`](../docs/contributing/traps.md) — durable, dated, re-verified.
They are not restated here: the state above is true for hours and the traps for months, and keeping
them together let the half that decayed discredit the half that did not. **Add a trap there when it
has cost a session twice.** One candidate from this session, not yet added because it has cost one
session once: the bundler's `tests/` scan (§4).

---

## 6. Where the artifacts are

<!-- Half-life: medium. Paths, not descriptions. -->

```
docs/development/project-completion-roadmap.md   live roadmap — no phase open; Deferred + Housekeeping only
docs/development/roadmap-history.md              archived Phases 1-5
docs/tasks/task-registry.md                      task numbering — next available: 120
docs/bugs/bug-registry.md                        general-bug numbering — next available: 16
docs/tasks/task.110.session-handoff-skill/       this task: document, plan, review, implementation report
skills/session-handoff/                          the skill: SKILL.md, scripts/handoff-verify.mjs, assets/handoff.template.md, tests/
docs/contributing/traps.md                       the durable traps
docs/contributing/releases.md                    the release procedure and its checklist
.claude/state/develop-next.state.json            develop-next run state — exists only while a run is in flight
```

Pipeline conventions: `AGENTS.md`. Anti-patterns (consumer-facing): `docs/reference/anti-patterns.md`.
Design rationale: `docs/reference/faq.md`. Observation log: resolved by
`shared/resources/resolve-observation-workspace.sh`, never from the cwd — **51 files on disk**,
highest id **90**, **25 open** (ids 65+, written by sessions since the 09-12 review — the next `/observe-work --review` has work) and 27 parked. <!-- cmd: command node skills/observe-work/references/observation-log.js queue --workspace /Users/gamaroff/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills --json; expect: /"total": 52/ -->
Staged skill edits: `~/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills/skill-updates/PENDING.md`.
