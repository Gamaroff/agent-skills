# Session Handoff — 2026-09-07

Read this first if you are picking up work in `agent-skills`. It records where things stand, what to
pick up, the one standing decision, and the traps that cost time. Every figure below was measured in
the session that wrote this file, not carried forward from the previous handoff.

**State at handoff:** branch `develop` @ `0de616b0` · working tree clean · **zero open PRs** · **zero
open issues**.

| Check | Command | Result |
| --- | --- | --- |
| Hermetic suite | `npm test` | **exit 0** — 505 bash assertions + 2,538 node tests, **0 failures**, 1 skipped |
| Replay evals | `npm run eval:all` | **exit 0** — 25 scenarios, all assertions passed |
| Bundle idempotency | `npm run bundle` | clean no-op — 0 files changed |
| Formatting | `npx prettier --check .` | clean |
| Roadmap lint | `select-next.mjs --lint` | **0 errors, 0 warnings** |

---

## 1. What to pick up — T80

The frontier is **not** empty. `select-next.mjs` returns:

```
selected  T80  →  /develop-task
docs/tasks/task.80.security-probe-engine/task.80.security-probe-engine.md
ready-for-development · High · risk_level: medium · est. 6h · depends_on: task.79 (merged)
```

*Make a security probe runnable without widening the snippet allow-list.* task.73's probe mode is
prose — it tells the agent to hand-write a script, run it, and then trusts the `probes_executed`
count the agent types. T80 builds the engine that runs the probe and computes the verdict, without
putting an interpreter on the snippet allow-list (which would make that boundary fail open).

`/develop-next` will dispatch this. There is no run-state file, so it starts clean rather than
resuming.

**Note how it was selected.** Phase 5 of the roadmap is fully ticked, so no phase held an actionable
row and selection **fell through to the task-registry fallback**. That is the designed terminal
behaviour of a closed phase, not a fault.

---

## 2. The standing decision — when to cut v0.46.0

The previous handoff's "is this the moment for 1.0?" question was answered by practice: **eight tags
shipped since**, all `0.x` minors.

| Fact | Value |
| --- | --- |
| Last tag | **v0.45.0**, cut 2026-09-02, on `main` @ `0d09860f` |
| `develop` ahead of `v0.45.0` / `main` | **177 commits** |
| `## [Unreleased]` in `CHANGELOG.md` | **399 lines** |
| Release trigger | push a `v*.*.*` tag, or `workflow_dispatch` (`.github/workflows/release.yml`) |

So the release machinery works and the cadence is established — roughly a tag every few days through
mid-August, then a 5-day gap since v0.45.0 while 177 commits accumulated. **The timing is still a
human call. Ask before tagging.**

One piece of advice from the previous handoff still applies: **separate mechanical churn from
behavioural change in the release notes.** A large fraction of any diff this size is full-file
rewrites produced by `npm run bundle`, not behaviour. Issue #179 (now closed) was a complaint about
exactly that shape shipping unannounced.

---

## 3. Carried follow-ups — status re-verified this session

The previous handoff listed four. Here is where each actually stands, checked rather than assumed.

### 3a. `shared/resources/change-log.js` — one defect fixed, one still open

**(1) Content loss on the hand-written-heading path — STILL OPEN (MEDIUM).** Confirmed by running the
engine, not by reading it. On the `hasMarkers: false` path — which is what **every not-yet-migrated
document takes on its first write** — a probe document with prose and a nested `###` under
`## Change Log` came back:

```
hasMarkers: false
LOST   AUTHORING NOTE prose
LOST   ### Nested Subsection  (heading and body)
KEPT   existing table rows
KEPT   the following ## section and its body
```

Rows survive; **everything else under the heading does not.** Note the source comment near
`findChangeLog` describes a fix for a *related* case (an H3 log ending at the next `###` or `##`) —
that fix is real but does not cover this one, where the log is H2 and the nested H3 falls inside its
span. Do not read that comment as closing this.

**(2) `collapseOtherLegacyBlocks` skipping the chosen block's pair — FIXED.** The previous handoff
called the guard a contradiction of the loop below it. It is now correct and documented as
deliberate: the function is called on the text *either side* of the chosen block, so that block is
never a removal candidate, and the inner `for (;;)` does handle several blocks of one pair. **Drop
this item.**

### 3b. Live Jira verification (task.45) — still unrunnable here

`JIRA_URL` is **unset** and this repo is GitHub-tracked. The four-step check lives in
`docs/tasks/task.45.change-log-pipeline-and-sync/task.45.plan.change-log-pipeline-and-sync.md`. It
was carried openly through review, both QA cycles, the gate and the DoD rather than quietly ticked —
keep it that way. Gate 2: **staging APPROVED, production CONDITIONAL.** Run it before relying on the
sync narrowing in a Jira-tracked consumer.

### 3c. Missing `run()`-level tests — still open

`sync-jira-story`'s write gate on the **skipped-but-transitioned** path (body unchanged, status
moved, must still write) and `sync-jira-epic`'s fast-path transition. The suites are large — 88 and
72 tests — but they target helpers (`guardConcurrentEdit`, `makeHttp`, `findRelatedDocs`,
`findChildStories`). No test names either path.

### 3d. Deferred / human-gated roadmap rows — unchanged

`T41-fixtures` and `T38-fixtures` still sit under `## Deferred / human-gated`, invisible to selection
by design. Both need credentials or a scratch Projects v2 board this repo does not hold.

---

## 4. Two kinds of bookkeeping drift — known, tolerated, recurring

Neither blocks anything. Both will mislead you if you trust the wrong file.

**The task-registry status column goes stale; the document is the authority.** 16 of 103 evaluated
rows disagree with their document's own frontmatter — 9 `ready-for-development`→`accepted`, 5
`planned`→`accepted`, 2 `draft`→`accepted`. Every one is stale in the harmless direction, and
`select-next` rejects on the **document** status, so selection is correct regardless. `--lint`
reports 0 warnings for these; do not read that as agreement between the two.

**Accepted items keep not getting a Phase 5 roadmap row.** B7, B11, B12 and T79 are all accepted with
**no row at all**. This is the third recurrence — `bcf183b4` fixed it for B6/B9, PR #328 for B8/B10,
and it has already returned. Nothing enforces the convention: a fix's own commit has no reason to
touch the roadmap, and by merge time the pipeline is done with it. A *missing* row is harmless
(selection reads the registries directly); an **unticked** row for an accepted item is what stalls
the loop, and that is what `## Housekeeping` warns about. Different failure, don't conflate them.

---

## 5. Traps — read before touching anything

### `node`, `npm` and `npx` are all shell functions — prefix every one with `command`

All three resolve to shell functions from the Claude shell snapshot
(`~/.claude/shell-snapshots/snapshot-zsh-*.sh`), and each injects **101 lines of nvm help** into the
output stream. Measured this session: the banner appears in the captured output of `npm test`,
`npm run eval:all`, `npm run bundle` and `npx prettier --write` alike; `command npx prettier --write`
emits none.

Exit codes and human-readable output survive it — that is why this goes unnoticed — but **any
captured JSON is corrupted**, which is exactly how `select-next.mjs` output gets mangled. **Use
`command node`, `command npm`, `command npx`.** (`/usr/local/bin/node` also works but is less
portable.)

The previous handoff said "`npm` is fine". It is not; it was never checked.

### `.agents/skills` is a symlink to `../skills`

Not just one file — **the whole directory**. `.agents/skills/foo/…` and `skills/foo/…` are the same
file on disk; editing either edits both. Only the `skills/` path is git-tracked.

### Never edit `skills/*/references/` — it is generated

`shared/resources/` is the single source of truth. `.git/hooks/pre-commit` runs `npm run bundle`
whenever `shared/resources/` or any `SKILL.md` is staged and **re-stages the result** — so a fix
applied only to a bundled copy is silently reverted. Edit the source, then bundle. A second
`npm run bundle` must be a clean no-op (it is, as of this handoff).

### CI check counts differ per PR — legitimately

Two of the five workflows are `paths:`-filtered:

| Workflow | Filter |
| --- | --- |
| `docs-link-check.yml` | `docs/**/*.md`, `README.md`, `AGENTS.md`, `CONTRIBUTING.md` |
| `validate.yml` | `skills/**`, `shared/resources/**`, `scripts/generate-skill-dependencies.mjs`, … |
| `test.yml`, `shellcheck.yml`, `branch-policy.yml` | unfiltered |

A docs-only PR shows 4 checks; a skills PR shows 5. **A skipped check and a check that failed to
start look identical in `gh pr checks`** — confirm via the rollup. Note `docs-link-check` does *not*
fire on `skills/**/*.md` or `shared/resources/**/*.md`.

### `gh pr view --json mergeable` lies twice, in different ways

`UNKNOWN` means GitHub has not computed it yet — not a conflict. Re-query, or use
`git merge-tree --write-tree` for a definitive local answer. Worse: **immediately after a force-push
this session returned `MERGEABLE CLEAN` with an empty `statusCheckRollup`** — CLEAN only because no
check had registered yet. Twenty seconds later it was `UNSTABLE` with four checks `IN_PROGRESS`.
**Poll until the rollup is non-empty *and* every check has a conclusion.**

### `npm test`'s suite list is hand-maintained

The `test` script is 10 `&&`-joined segments — nine explicit `bash …` invocations plus one
`node --test` call with an explicit list of per-skill globs. **A new `skills/*/tests/` directory runs
nowhere until someone adds its glob.** This has already silently orphaned 232 tests once.

### The `.gitignore` negation block must stay at the END of the file

The last three lines re-include `evals/**/replay/`. Those fixtures deliberately contain paths matched
by earlier rules (`*.log`, `.claude/`). A gitignore negation only overrides rules that appear
**before** it, and the directory negations must precede the file negation so git descends into
otherwise-ignored fixture dirs. Move that block and CI fails on a fresh clone while local passes.

### Do not use a next-heading lookahead to replace a markdown section

A regex like `/## Section\n[\s\S]*?(?=\n## )/` matches its terminating lookahead against a `##`
heading **inside a fenced code sample**, stops early, and leaves the tail of the old section behind —
including an unbalanced fence that makes the rest of the file render as code. It also fires on a
prose *mention* of a heading name. The Change Log engine guards this (`fencedRanges` /
`insideProtected`); one-off edit scripts do not. **Locate both boundaries, assert both, cut by
explicit line range**, then verify fence parity: `$(grep -c '^```' "$f") % 2` must be `0`.

### Two tests to distrust differently

- `qa-execute-snippets` is **load-flaky** — it asserts on multi-second timings and fails under
  parallel load. Re-run that file alone before believing a failure.
- The **stdout-drain premise test is not flaky any more** (fixed 2026-09-04; the payload is now sized
  from the pipe buffer). A failure there is real. Do not re-run it away.

---

## 6. Where the artifacts are

```
docs/development/project-completion-roadmap.md   live roadmap — Phase 5 closed, deferred rows only
docs/development/roadmap-history.md              archived Phases 1–4
docs/tasks/task-registry.md                      task numbering — next available: 93
docs/bugs/bug-registry.md                        general-bug numbering — next available: 13
docs/tasks/task.80.security-probe-engine/        the next item
shared/resources/change-log.js                   3a(1)'s defect lives here
shared/resources/document-change-log.md          canonical Change Log spec
```

Pipeline conventions: `AGENTS.md`. Anti-patterns: `docs/reference/anti-patterns.md`. Design
rationale: `docs/reference/faq.md`.
