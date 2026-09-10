# Session Handoff — 2026-09-10

Read this first if you are picking up work in `agent-skills`. It records where things stand, what to
pick up, the standing decisions, and the traps that cost time.

**Figures below are measured or explicitly marked as carried.** Sections 1, 2, 4 and 6 were measured
in the session that wrote this file. Section 3 is **carried forward unverified** and says so per item
— re-measure before acting on any of it. Section 5 (traps) is durable and was not re-derived.

**State at handoff:** branch `develop`, at the commit tagged **v0.46.0** · **zero open PRs** · **zero
open issues**. `develop` was 407 commits ahead of `v0.45.0` (2026-09-02) when this release was cut.

| Check | Command | Result |
| --- | --- | --- |
| Hermetic suite | `command npm test` | **exit 0** — 505 bash assertions + 3,155 node tests, **0 failures**, 1 skipped |
| Replay evals | `command npm run eval:all` | **exit 0** — 51 replay scenarios, all assertions passed |
| Bundle freshness | `command npm run bundle -- --check` | 126 skills checked, **0 problems** |
| Skill catalog | `command npm run generate-catalog` | regenerates to no diff — 126 skills |
| Dependency graph | `command npm run generate-skill-deps` | regenerates to no diff — 126 skills, **71 edges** by 22 skills |
| Formatting | `command npx prettier --check .` | clean |
| Roadmap lint | `select-next.mjs --lint` | **0 errors, 0 warnings** |

---

## 1. What to pick up — T107

The frontier is **not** empty. `select-next.mjs` returns:

```
selected  T107  →  /develop-task
docs/tasks/task.107.bug-runbook-rewrite/task.107.bug-runbook-rewrite.md
ready-for-development · Medium · risk_level: low · est. 3h · depends_on: —
```

*Rewrite `docs/runbooks/bug-fix.md` against the pipeline that exists.* The page documents a
four-step manual loop that predates `/develop-bug` and `/review-bug` entirely, mentions no tracker
sync at all (`grep -c 'tracker\|jira\|github_issue'` returns 0, and v0.46.0 added four bug-sync
skills), and lists two of the three bug modes. It is the page a reader reaches first, and it
terminates before the capability starts. Filed during the v0.46.0 release doc sweep.

`/develop-next` will dispatch this. There is no run-state file, so it starts clean rather than
resuming.

**Note how it was selected.** Phase 5 of the roadmap is fully ticked, so no phase held an actionable
row and selection **fell through to the task-registry fallback**. That is the designed terminal
behaviour of a closed phase, not a fault — and it is how every task since T99 has been selected.

---

## 2. The standing decision — the release cadence, and what the last one found

**v0.46.0 is the tag being cut from this state.** `develop` was 407 commits ahead of `v0.45.0`
(2026-09-02) with a 1,260-line `## [Unreleased]`. Nine tags have shipped since the "is this 1.0?"
question was first raised, all `0.x` minors; the cadence is established and **the timing is still a
human call — ask before tagging.**

Two things the v0.46.0 prep found that will recur:

**The CHANGELOG box on the release checklist is the one item with no mechanism, and it drifted.**
Five merged tasks had no `[Unreleased]` entry — T70, T102, T104, T105, T106 — four of them the four
most recent merges. Everything *generated* in this repo is machine-checked (catalog diff, `bundle
--check`, task-registry drift test, roadmap linter) and all of it was clean; the hand-checked item is
the one that failed. `docs/contributing/releases.md` now carries the one-liner that measures it
rather than recalls it. **Write the entry at acceptance, not at release** — at acceptance the author
knows what changed; at release time someone reconstructs it from commit subjects.

**Separate mechanical churn from behavioural change in the release notes.** A large fraction of any
diff this size is full-file rewrites produced by `npm run bundle`, not behaviour. Issue #179 (closed)
was a complaint about exactly that shape shipping unannounced.

---

## 3. Carried follow-ups — CARRIED, NOT RE-MEASURED THIS SESSION

**Read this heading literally.** The previous handoff verified these on 2026-09-07 and this session
did not re-run any of them — it was a release-prep session, not a follow-up sweep. Every item below
is therefore a *claim as of 2026-09-07*, three days and 30 merges old. **Re-measure before acting.**
The engine in 3a and the suites in 3c have both been touched since.

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

Neither blocks anything. Both will mislead you if you trust the wrong file. **Both re-measured
2026-09-10.**

**The task-registry Status column goes stale; the document is the authority.** This one now has a
guard: `evals/shared/tests/task-registry-drift.test.mjs` (T103) fails when a task document reads
`accepted` and its row does not, or the reverse — and `/finalise` writes the row via
`shared/resources/registry-tick.js` at the moment it sets `status: accepted`, so the two cannot
disagree by construction on anything finalised since. The test is **green** as of this handoff. Only
the `accepted` predicate is compared, so a task legitimately mid-flight does not trip it; a row that
is stale in some *other* column is still unguarded, and `select-next` still rejects on the
**document** status regardless.

**Accepted items get a roadmap row late or never.** Measured across T99–T106: **only T106 has a
roadmap Change Log row.** T99, T100, T101, T102, T103, T104 and T105 have none. This is the fourth
recurrence of the class — `bcf183b4` fixed it for B6/B9, PR #328 for B8/B10, and B7/B11/B12 were
caught and added since. Nothing enforces it: a fix's own commit has no reason to touch the roadmap,
and by merge time the pipeline is done with the item.

**Do not conflate the two failures.** A *missing* row is harmless — Phase 5 is closed, selection
reads the registries directly, and every task since T99 was selected through the registry fallback
with no phase row in existence. An **unticked phase row for an accepted item** is what stalls the
loop, and that is what `## Housekeeping` warns about. There are currently four unticked rows in the
roadmap and all four are deliberate: two `*-fixtures` rows under `## Deferred / human-gated`, and
two housekeeping reminders.

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

### `invokes:` in SKILL.md frontmatter must be ONE line, and a wrong shape is silent

The skill call graph (`shared/resources/skill-dependencies.json`, consumed by the installer to
expand a profile to its closure) is generated from an `invokes:` key in each SKILL.md's frontmatter.
**Only `invokes: [a, b]` on a single line is read.** Both other spellings now throw —

```yaml
invokes:            # ← YAML block form: rejected
  - create-branch
invokes:            # ← wrapped flow form: rejected (this one shipped)
  [create-branch]
```

— but before v0.46.0 the wrapped form parsed to **zero edges with no error**, and that failure is
invisible to every check: the generator and the committed JSON agree on the empty list, so both drift
guards stay green. `develop-bug` carried nine declared callees as zero edges for a cycle, and a
`profile: pipeline` install shipped `/develop-bug` without `ensure-bug-{jira,github}-issue`.
The consumer finds out hours later, at the step whose skill is missing.

The tree-wide property is now asserted directly (*no SKILL.md declares `invokes:` and resolves to no
edges*), which is what covers the shape nobody has thought of yet. Prettier does **not** reflow a long
inline list, so nothing in the toolchain pushes you into the wrapped form — verified.

### Two tests to distrust differently

- `qa-execute-snippets` is **load-flaky** — it asserts on multi-second timings and fails under
  parallel load. Re-run that file alone before believing a failure.
- The **stdout-drain premise test is not flaky any more** (fixed 2026-09-04; the payload is now sized
  from the pipe buffer). A failure there is real. Do not re-run it away.

---

## 6. Where the artifacts are

```
docs/development/project-completion-roadmap.md   live roadmap — Phase 5 closed, deferred rows only
docs/development/roadmap-history.md              archived Phases 1-4
docs/tasks/task-registry.md                      task numbering — next available: 108
docs/bugs/bug-registry.md                        general-bug numbering — next available: 13
docs/tasks/task.107.bug-runbook-rewrite/         the next item
docs/contributing/releases.md                    the release procedure and its checklist
shared/resources/change-log.js                   3a(1)'s defect lives here (unverified since 09-07)
shared/resources/document-change-log.md          canonical Change Log spec
```

Pipeline conventions: `AGENTS.md`. Anti-patterns: `docs/reference/anti-patterns.md`. Design
rationale: `docs/reference/faq.md`. Observation log: resolved by
`shared/resources/resolve-observation-workspace.sh`, never from the cwd — **48 files on disk**,
highest id **59** (ids are monotonic; resolved entries are swept to `archive/`). Ids 58 and 59 were
written during the v0.46.0 prep.
