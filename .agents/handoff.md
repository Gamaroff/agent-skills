# Session Handoff — 2026-10-10

Read this first if you are picking up work in `agent-skills`. It records where things stand, what to
pick up, the standing decisions, and the drift that is tolerated. The **traps** — the durable half — live
in [`docs/contributing/traps.md`](../docs/contributing/traps.md); read them before touching anything.

**Every figure below was measured in the session that wrote this file, on 2026-10-10, and carries
the command that produced it.** Do not trust the date — re-measure:
`command node skills/session-handoff/scripts/handoff-verify.mjs` reports every line below as
`confirmed`, `stale` (with the new value) or `unverifiable` (with why). This replaces the 2026-09-15
file, which was written on a different machine; nothing below is carried from it.

**State at handoff:** `develop` @ `1c1f2ee7` (this file's own commit moves it) · tag **v0.55.0**
(2026-10-07) is 66 commits behind `origin/develop` · **1** open PR · **23** open issues.

<!-- Half-life: hours to days. The FIRST backticked span in Command is what the verifier runs
     (read-only whitelist; prose here is reported `unverifiable: no command`). The **bold** spans in
     Result are what it compares — tokens that appear verbatim in the output; **exit 0** is compared
     against the exit code. -->

| Check | Command | Result |
| --- | --- | --- |
| Hermetic suite | `command npm test` | **exit 0** — 5,192 node tests pass, 0 fail, 14 skipped, plus 801 bash assertions (takes several minutes; read mode reports it `unverifiable: timeout` at the default 60 s — run it yourself) |
| Fast gate (format + suite) | `command npm run ci:fast` | **exit 0** |
| Formatting | `command npx prettier --check .` | **exit 0** |
| Bundle freshness | `command npm run bundle -- --check` | **129** skills checked, **0 problems** |
| Roadmap lint | `command node skills/develop-next/scripts/select-next.mjs --lint` | **exit 0** — no errors, no warnings |
| Frontier | `command node skills/develop-next/scripts/select-next.mjs` | **selected** **T201** (Phase 9's second row) |
| Skill validation | `python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff` | **exit 0** — one skill |
| Catalog / deps | `jq length shared/resources/skill-dependencies.json` | **129** skills in the graph |
| Orphaned tests | `grep -c skills/session-handoff/tests package.json` | **1** — the glob is listed |
| ShellCheck | `shellcheck --version` | **0.11.0** present (this row only proves the binary; `npm run lint:shell` is clean over 87 sources) |
| Replay evals | `command npm run eval:all` | **exit 0** |
| Branch tip (develop) | `git rev-parse --short origin/develop` | **1c1f2ee7** at write time — merging this file moves it |
| Latest tag | `git describe --tags --abbrev=0 origin/develop` | **v0.55.0** |
| Open PRs | `gh pr list --state open --json number --jq length` | **1** — #594, a `review-pr` smoke fixture marked DO NOT MERGE |
| Open issues | `gh issue list --state open --json number --jq length` | **23** |
| Next task number | `grep -m1 "Next Available Task Number" docs/tasks/task-registry.md` | **202** |
| Next bug number | `grep -m1 "Next Available Bug Number" docs/bugs/bug-registry.md` | **19** |

---

## 1. What to pick up

<!-- Half-life: days. Re-verified at write time; nothing carried from the 2026-09-15 file. -->

**T201 is next** — Phase 9's second row, unblocked by B18 (PR #625, merged today). It replaces the
orchestrators' prose directive with a `--defaults` flag and adds speed modes. `/develop-next` selects
it. After T201, Phase 9 is complete, and the registry fallback takes the `planned` task rows in
priority order. <!-- cmd: grep -cw planned docs/tasks/task-registry.md; expect: 25 -->

**On a fresh checkout, run `npm install` once.** Since PR #628 its `prepare` step creates the
gitignored `.agents/skills` and `.claude/skills` links, which every `.agents/skills/…` command in the
skills' own prose needs. It is skipped when `CI` is set, on purpose.

---

## 2. Standing decisions

<!-- Half-life: long. Re-read 2026-10-10. -->

**The release cadence is a human call — ask before tagging.** v0.55.0 is the current tag. Write the
CHANGELOG entry **at acceptance**, not at release. Every PR merged today carries one under
`[Unreleased]`.

**Roadmap rows are for phase-row items only.** Registry-selected items are recorded by the registry
row and the document's frontmatter. A roadmap Change Log row records why a *phase row* was ticked or
waived, and nothing else.

**Phase 9 is an override, opened 2026-10-09:** B18, then T201. B18 is ticked. Close and archive the
phase when T201 merges.

**An observation fix is a branch plus a PR that a human merges** (2026-10-10). Observations #1–#4 were
fixed that way (PRs #626, #627 and #629), each merged only on the operator's explicit go-ahead. An
observation fix never auto-merges, even inside an autonomous run.

**`/develop-next` merges a bug item on its own evidence** (PR #626): `status: closed`, a DoD reading
`✅ ACCEPTED` and a last verify verdict of `PASS`, per the bug rows in `develop-next` Step 3.

**The handoff is measured, never carried, and the traps live elsewhere.** A probe that needs the
observation log writes `{observation-workspace}` (PR #629), never one machine's absolute path.

---

## 3. Carried follow-ups — RE-MEASURED 2026-10-10

### 3a. Live Jira verification (task.45) — still unrunnable here

This repo is GitHub-tracked. <!-- cmd: git remote get-url origin; expect: /github\.com/ -->
The four-step check is unchanged at
`docs/tasks/task.45.change-log-pipeline-and-sync/task.45.plan.change-log-pipeline-and-sync.md`
(§Phase 5). Read mode reports it as only the remote, which is the honest measure.

### 3b. Deferred / human-gated roadmap rows — unchanged

`T41-fixtures` and `T38-fixtures` still need credentials or a scratch Projects v2 board. <!-- cmd: grep -c T41-fixtures docs/development/project-completion-roadmap.md; expect: /^[1-9]/ -->

### 3c. This machine's `git` and `gh` setup — two gaps, both the operator's call

`git push` over HTTPS has no credential helper in this checkout, so every push today ran with a
one-off `-c credential.helper='!gh auth git-credential'`. `gh auth setup-git` fixes it permanently.
The `gh` token also lacks the `project` scope, so every board move (`gh-stage.js`) reads
`board-unreadable`. `gh auth refresh -s project` fixes that. Neither is measured here: `gh auth` is
not on the read-mode whitelist.

---

## 4. Tolerated drift — known, recurring, not blocking

**The observation log is per machine.** This machine's workspace holds observations #1–#4, all
resolved, and has never been reviewed. <!-- cmd: cat {observation-workspace}/skill-observations/last-review-date.txt; expect: never -->
The log from the previous machine (highest id 90 on 2026-09-15) is not here. So skill prose citing
`obs #NNN` above 4 refers to that log, and this machine's ids restarted at 1 — `#1`–`#4` cited in
today's commits mean this log. Merging the logs is the operator's call. <!-- cmd: command node skills/observe-work/references/observation-log.js queue --workspace {observation-workspace} --json; expect: /"total": 4/ -->
The previous file's staged skill edits (`skill-updates/`) also stayed on that machine.

**The task-registry Status column vs the document.** Guarded on the `accepted` predicate only
(`evals/shared/tests/task-registry-drift.test.mjs`). A row stale in another column is unguarded, and
`select-next` rejects on the **document** status regardless.

Dropped since the 2026-09-15 file, as no longer measured true: the "production lite-mode CLI" note
(`develop-pipeline-lite-mode.md` no longer names one), the hard-coded counts in `shellcheck.yml`, and
the `invokes:` declarer count, which was not re-measured.

---

## 5. Traps

Live in [`docs/contributing/traps.md`](../docs/contributing/traps.md) — durable, dated, re-verified.
They are not restated here: the state above is true for hours and the traps for months, and keeping
them together let the half that decayed discredit the half that did not. **Add a trap there when it
has cost a session twice.** One was added today: the bundler reads a skill's `tests/`, so a quoted path
there becomes a dependency. It cost task.110 and PR #629.

---

## 6. Where the artifacts are

<!-- Half-life: medium. Paths, not descriptions. -->

```
docs/development/project-completion-roadmap.md   live roadmap — Phase 9 open (B18 ticked, T201 next)
docs/development/roadmap-history.md              archived phases
docs/tasks/task-registry.md                      task numbering — next available: 202
docs/bugs/bug-registry.md                        general-bug numbering — next available: 19
docs/bugs/bug.18.autonomous-runs-hardcode-base-branch/   bug.18: report, review, implementation report, DoD
docs/tasks/task.201.pipeline-upfront-answers-and-speed-modes/   T201: document and plan
skills/session-handoff/                          this format: SKILL.md, scripts/handoff-verify.mjs, assets/
docs/contributing/traps.md                       the durable traps
docs/contributing/releases.md                    the release procedure and its checklist
.claude/state/develop-next.state.json            develop-next run state — exists only while a run is in flight
```

Pipeline conventions: `AGENTS.md`. Anti-patterns (consumer-facing): `docs/reference/anti-patterns.md`.
Design rationale: `docs/reference/faq.md`. Observation log: resolved by
`shared/resources/resolve-observation-workspace.sh`, never from the cwd.
