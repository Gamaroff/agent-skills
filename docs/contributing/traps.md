# Traps — things that cost time in this repository

> **Audience:** contributors and agents working *on* this repo (not consumers of the skills — their
> list is [`docs/reference/anti-patterns.md`](../reference/anti-patterns.md)).

Each entry below was learned the expensive way and re-verified at least once. They were kept in
[`.agents/handoff.md`](../../.agents/handoff.md) §5 until 2026-09-12; that file's *state* half decays
in days and discredited the *traps* half that does not, so the traps now live here and the handoff
points at this page. **Add a trap here when it has cost a session twice**, and move it to
`anti-patterns.md` only if it turns out to bite consumers too.

Every claim below carries the date or command it was measured with. Re-measure before relying on a
figure; the *shape* of each trap stays true far longer than its numbers.

### `node`, `npm` and `npx` are all shell functions — prefix every one with `command`

All three resolve to shell functions from the Claude shell snapshot
(`~/.claude/shell-snapshots/snapshot-zsh-*.sh`), and each injects **101 lines of nvm help** into the
output stream. Measured 2026-09-10: the banner appears in the captured output of `npm test`,
`npm run eval:all`, `npm run bundle` and `npx prettier --write` alike; `command npx prettier --write`
emits none.

Exit codes and human-readable output survive it — that is why this goes unnoticed — but **any
captured JSON is corrupted**, which is exactly how `select-next.mjs` output gets mangled. **Use
`command node`, `command npm`, `command npx`.** (`/usr/local/bin/node` also works but is less
portable.)

An earlier handoff said "`npm` is fine". It is not; it was never checked.

### `.agents/skills` is a symlink to `../skills`

Not just one file — **the whole directory**. `.agents/skills/foo/…` and `skills/foo/…` are the same
file on disk; editing either edits both. Only the `skills/` path is git-tracked.

### Never edit `skills/*/references/` — it is generated

`shared/resources/` is the single source of truth. `.git/hooks/pre-commit` runs `npm run bundle`
whenever `shared/resources/` or any `SKILL.md` is staged and **re-stages the result** — so a fix
applied only to a bundled copy is silently reverted. Edit the source, then bundle. A second
`npm run bundle` must be a clean no-op (it is, as of 2026-09-10).

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
a 2026-09-10 session returned `MERGEABLE CLEAN` with an empty `statusCheckRollup`** — CLEAN only because no
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
